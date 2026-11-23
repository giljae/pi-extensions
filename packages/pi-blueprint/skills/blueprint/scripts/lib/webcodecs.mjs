// MP4 without ffmpeg: encode frames to H.264, and an audio track to AAC, with WebCodecs in
// Playwright's Chromium, then lay out the file with mp4.mjs. Tested on macOS. Playwright's Linux
// Chromium has no H.264 encoder, so Linux needs ffmpeg; Windows Chromium has one (not tested here).
//
//   const enc = await openEncoder(pw, workDir, fps);  // throws if this Chromium cannot encode H.264
//   for (...) await enc.add(pngBuffer);                // frames in order, all the same size
//   writeFileSync('out.mp4', await enc.finish(audioPath | null, seconds));
//   await enc.close();
//
// Uses Playwright's full Chromium (`npx playwright install chromium`); its headless shell has no
// H.264 encoder. BLUEPRINT_CHROMIUM points it at another Chromium instead.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { writeMP4 } from './mp4.mjs';
import { CHROMIUM_FIX } from './chromium.mjs';

const TIMESCALE = 90000, RATE = 48000;
// Runs in the page: base64 <-> bytes, and a reply with the chunks encoded so far.
const PAGE = `<!doctype html><meta charset="utf-8"><script>
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const bytesOf = d => d instanceof ArrayBuffer ? new Uint8Array(d) : new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
const drain = () => { const out = E.chunks.map(c => ({ ts: c.ts, key: c.key, data: b64(c.data) })); E.chunks = []; return out; };
</script>`;

// H.264 levels: [level_idc, max macroblocks per frame, max macroblocks per second].
const LEVELS = [[0x1f, 3600, 108000], [0x20, 5120, 216000], [0x28, 8192, 245760], [0x2a, 8704, 522240], [0x32, 22080, 589824], [0x33, 36864, 983040], [0x34, 36864, 2073600], [0x3c, 139264, 4177920], [0x3d, 139264, 8355840], [0x3e, 139264, 16711680]];

// `audio`: the export has an --audio track, so check for an AAC encoder up front too.
export async function openEncoder(pw, work, fps, { audio = false } = {}) {
  const exe = process.env.BLUEPRINT_CHROMIUM;
  let browser;
  try { browser = await pw.chromium.launch(exe ? { executablePath: exe } : { channel: 'chromium' }); }
  catch (e) {
    const why = String(e.message || e).split('\n')[0].replace(/^browserType\.launch:\s*/, '');
    throw new Error(exe
      ? `Could not start Chromium at BLUEPRINT_CHROMIUM=${exe}: ${why}`
      : `MP4 without ffmpeg needs a full Chromium (Playwright's headless shell has no H.264), or ffmpeg.\n${CHROMIUM_FIX}\n${why}`);
  }
  const close = () => browser.close().catch(() => {});
  try {
    const page = await browser.newPage();
    writeFileSync(join(work, 'encoder.html'), PAGE);
    await page.goto(pathToFileURL(join(work, 'encoder.html')).href);  // WebCodecs needs a secure context; file:// is one
    const ok = await page.evaluate(() => typeof VideoEncoder === 'function' && VideoEncoder.isConfigSupported({ codec: 'avc1.42001f', width: 640, height: 480, bitrate: 2e6, framerate: 30 }).then(r => r.supported, () => false));
    if (!ok) throw new Error(process.platform === 'linux' && !exe
      ? 'MP4 on Linux needs ffmpeg (apt install ffmpeg, dnf install ffmpeg-free), or a distro Chromium with H.264 (Fedora\'s has it) set as BLUEPRINT_CHROMIUM: Playwright\'s Chromium has no H.264 encoder there. GIF and PNG work without either.'
      : `This Chromium (${browser.version()}) has no H.264 encoder. Install ffmpeg, or use Playwright's full Chromium (npx playwright install chromium${exe ? ' and unset BLUEPRINT_CHROMIUM' : ''}).`);
    const aac = !audio || await page.evaluate(() => typeof AudioEncoder === 'function' && AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }).then(r => r.supported, () => false));
    if (!aac) throw new Error(`This Chromium (${browser.version()}) has no AAC encoder, so it cannot add --audio. Install ffmpeg, or drop --audio.`);

    let n = 0, size = null;
    const samples = [];
    const take = list => {
      for (const c of list) {
        const prev = samples[samples.length - 1];
        if (prev && c.ts <= prev.ts) throw new Error('the H.264 encoder reordered frames, which this MP4 writer cannot store; install ffmpeg');
        samples.push({ ts: c.ts, key: c.key, data: Buffer.from(c.data, 'base64') });
      }
    };
    const ts = i => Math.round(i * TIMESCALE / fps);

    return {
      async add(png) {
        if (!size) {
          // The size comes from the first frame, rounded down to even numbers for H.264.
          const W = png.readUInt32BE(16) & ~1, H = png.readUInt32BE(20) & ~1;
          const mbs = Math.ceil(W / 16) * Math.ceil(H / 16);
          const level = (LEVELS.find(([, fs, rate]) => mbs <= fs && mbs * fps <= rate) || LEVELS[LEVELS.length - 1])[0];
          const bitrate = Math.round(Math.min(50e6, Math.max(2e6, W * H * fps * 0.15)));
          const err = await page.evaluate(async ({ W, H, fps, level, bitrate }) => {
            for (const profile of ['64', '4d', '42']) {  // High, then Main, then Baseline
              const cfg = { codec: `avc1.${profile}00${level.toString(16).padStart(2, '0')}`, width: W, height: H, bitrate, framerate: fps, latencyMode: 'quality', avc: { format: 'avc' } };
              if (!(await VideoEncoder.isConfigSupported(cfg)).supported) continue;
              window.E = { chunks: [], desc: null, err: null, canvas: new OffscreenCanvas(W, H) };
              E.ctx = E.canvas.getContext('2d');
              E.enc = new VideoEncoder({
                output: (chunk, meta) => {
                  if (meta?.decoderConfig?.description) E.desc = b64(bytesOf(meta.decoderConfig.description));
                  const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data);
                  E.chunks.push({ ts: chunk.timestamp, key: chunk.type === 'key', data });
                },
                error: e => { E.err = String(e); },
              });
              E.enc.configure(cfg);
              return null;
            }
            return `no H.264 profile supports ${W}x${H} at ${fps} fps here; lower --width or --scale, or install ffmpeg`;
          }, { W, H, fps, level, bitrate });
          if (err) throw new Error(err);
          size = { W, H };
        }
        const i = n++;
        take(await page.evaluate(async ({ png, t, d, key }) => {
          const bmp = await createImageBitmap(new Blob([unb64(png)], { type: 'image/png' }));
          E.ctx.drawImage(bmp, 0, 0); bmp.close();
          // Timestamps are in microseconds; the file keeps its own 90 kHz clock.
          const frame = new VideoFrame(E.canvas, { timestamp: t, duration: d });
          E.enc.encode(frame, { keyFrame: key }); frame.close();
          while (E.enc.encodeQueueSize > 6 && !E.err) await new Promise(r => E.enc.addEventListener('dequeue', r, { once: true }));
          if (E.err) throw new Error(E.err);
          return drain();
        }, { png: png.toString('base64'), t: ts(i) * 1e6 / TIMESCALE, d: (ts(i + 1) - ts(i)) * 1e6 / TIMESCALE, key: i % Math.max(1, Math.round(fps * 2)) === 0 }));
      },

      async finish(audioPath, seconds) {
        if (!size) throw new Error('no frames to encode');
        const { desc, list } = await page.evaluate(async () => {
          await E.enc.flush();
          if (E.err) throw new Error(E.err);
          return { desc: E.desc, list: drain() };
        });
        take(list);
        if (samples.length !== n) throw new Error(`the H.264 encoder returned ${samples.length} of ${n} frames`);
        const video = {
          width: size.W, height: size.H, timescale: TIMESCALE, description: desc ? Buffer.from(desc, 'base64') : null,
          samples: samples.map((s, i) => ({ data: s.data, key: s.key, dur: ts(i + 1) - ts(i) })),
        };
        const audio = audioPath ? await encodeAudio(page, work, audioPath, seconds) : null;
        return writeMP4({ video, audio });
      },
      close,
    };
  } catch (e) { await close(); throw e; }
}

// The video sets the length: the track is decoded, resampled to 48 kHz stereo, padded with
// silence or cut to `seconds`, and encoded to AAC.
// Chromium on macOS encodes AAC with AudioToolbox, whose output starts with 2112 samples of
// priming (Apple's documented encoder delay; measured here as 44.0 ms). Chromium cannot decode AAC
// to measure it elsewhere, so other systems get no trim.
const PRIMING = process.platform === 'darwin' ? 2112 : 0;

async function encodeAudio(page, work, path, seconds) {
  const run = file => page.evaluate(async ({ bytes, seconds, RATE, PRIMING }) => {
    const len = Math.max(1, Math.round(seconds * RATE));
    const ctx = new OfflineAudioContext(2, len, RATE);
    let buf;
    try { buf = await ctx.decodeAudioData(unb64(bytes).buffer); } catch { return { undecodable: true }; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.start();
    const pcm = await ctx.startRendering();
    const cfg = { codec: 'mp4a.40.2', sampleRate: RATE, numberOfChannels: 2, bitrate: 192000 };
    if (!(await AudioEncoder.isConfigSupported(cfg)).supported) return { error: 'this Chromium has no AAC encoder; install ffmpeg to add audio' };
    const out = [], A = { desc: null, err: null };
    const enc = new AudioEncoder({
      output: (chunk, meta) => {
        if (meta?.decoderConfig?.description) A.desc = b64(bytesOf(meta.decoderConfig.description));
        const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data);
        out.push({ ts: chunk.timestamp, data: b64(data) });
      },
      error: e => { A.err = String(e); },
    });
    enc.configure(cfg);
    const L = pcm.getChannelData(0), R = pcm.getChannelData(1);
    for (let at = 0; at < len; at += RATE) {
      const n = Math.min(RATE, len - at), planes = new Float32Array(n * 2);
      planes.set(L.subarray(at, at + n), 0); planes.set(R.subarray(at, at + n), n);
      const data = new AudioData({ format: 'f32-planar', sampleRate: RATE, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(at * 1e6 / RATE), data: planes });
      enc.encode(data); data.close();
    }
    await enc.flush();
    if (A.err) return { error: A.err };
    // Drop whole frames that start after the video ends (counting the priming).
    return { desc: A.desc, chunks: out.filter(c => c.ts < (seconds + PRIMING / RATE) * 1e6) };
  }, { bytes: readFileSync(file).toString('base64'), seconds, RATE, PRIMING });

  let r = await run(path);
  if (r.undecodable && process.platform === 'darwin') {
    // Chromium cannot read every format (ALAC, some M4A); macOS's afconvert can turn it into WAV.
    const wav = join(work, 'audio.wav');
    spawnSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16', path, wav], { stdio: 'ignore' });
    if (existsSync(wav)) r = await run(wav);
  }
  if (r.undecodable) throw new Error(`could not read the audio in ${path}; try an MP3, WAV or AAC file, or install ffmpeg`);
  if (r.error) throw new Error(r.error);
  return {
    sampleRate: RATE, channels: 2, bitrate: 192000, delay: PRIMING, description: r.desc ? Buffer.from(r.desc, 'base64') : null,
    samples: r.chunks.map(c => ({ data: Buffer.from(c.data, 'base64'), dur: 1024 })),  // one AAC frame is 1024 samples
  };
}
