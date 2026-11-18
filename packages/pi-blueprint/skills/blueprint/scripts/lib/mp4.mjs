// A small MP4 (ISO BMFF) writer: one H.264 track and an optional AAC track. No dependencies.
// The samples come already encoded (WebCodecs in export.mjs); this only lays out the file,
// with the index (moov) before the data so the video starts playing before it has downloaded.
//
//   writeMP4({
//     video: { width, height, timescale, samples: [{ data, dur, key }] },  // data: Annex B or AVC (with description)
//     audio: { sampleRate, channels, bitrate, description /* AudioSpecificConfig */, samples: [{ data, dur }], delay },  // optional
//   }) -> Buffer
// `dur` is in the track's timescale (the video's own, the audio's sample rate). `delay` is the AAC
// encoder's priming in samples; an edit list skips it so the sound starts with the picture.
// Chromium builds without proprietary codecs (Playwright's) hand out H.264 in Annex B form (start
// codes, SPS/PPS in band) with no avcC; MP4 wants length-prefixed NAL units and an avcC, which
// players such as QuickTime and Safari require, so toAVC() converts.

const be32 = n => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; };
const be16 = n => { const b = Buffer.alloc(2); b.writeUInt16BE(n & 0xffff); return b; };
const zeros = n => Buffer.alloc(n);
function box(type, ...parts) {
  const body = Buffer.concat(parts.flat(Infinity));
  const head = Buffer.alloc(8); head.writeUInt32BE(8 + body.length); head.write(type, 4, 'latin1');
  return Buffer.concat([head, body]);
}
const full = (type, version, flags, ...parts) => box(type, Buffer.from([version, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255]), ...parts);
const MATRIX = [0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000].map(be32);
// MPEG-4 descriptor (inside esds): tag, length, body.
function desc(tag, ...parts) {
  const body = Buffer.concat(parts.flat(Infinity));
  if (body.length > 127) throw new Error('mp4: descriptor too long');
  return Buffer.concat([Buffer.from([tag, body.length]), body]);
}
// Split Annex B bytes (00 00 01 / 00 00 00 01 start codes) into NAL units.
function nalUnits(buf) {
  const starts = [];
  for (let i = 0; i + 2 < buf.length; i++) if (buf[i] === 0 && buf[i + 1] === 0 && buf[i + 2] === 1) { starts.push(i + 3); i += 2; }
  return starts.map((s, k) => {
    let e = k + 1 < starts.length ? starts[k + 1] - 3 : buf.length;
    while (e > s && buf[e - 1] === 0) e--;  // the zero of a 4-byte start code, or trailing zeros
    return buf.subarray(s, e);
  });
}
const isAnnexB = b => b.length > 3 && b[0] === 0 && b[1] === 0 && (b[2] === 1 || (b[2] === 0 && b[3] === 1));

// Annex B samples -> length-prefixed samples plus an avcC built from the first SPS and PPS.
// Samples already in AVC form pass through with the encoder's own description.
export function toAVC(samples, description) {
  if (!samples.length || !isAnnexB(samples[0].data)) return { samples, description };
  let sps = null, pps = null;
  const out = samples.map(s => {
    const keep = [];
    for (const n of nalUnits(s.data)) {
      const type = n[0] & 31;
      if (type === 7) { sps ??= Buffer.from(n); continue; }   // parameter sets go in the avcC
      if (type === 8) { pps ??= Buffer.from(n); continue; }
      if (type === 9) continue;                               // access unit delimiter
      keep.push(be32(n.length), n);
    }
    return { ...s, data: Buffer.concat(keep) };
  });
  if (!sps || !pps) throw new Error('mp4: the H.264 stream has no SPS/PPS');
  const high = [100, 110, 122, 144].includes(sps[1]);
  const avcC = Buffer.concat([
    Buffer.from([1, sps[1], sps[2], sps[3], 0xff, 0xe1]), be16(sps.length), sps, Buffer.from([1]), be16(pps.length), pps,
    // High profiles add chroma format and bit depths: frames come from a canvas, so 4:2:0 and 8-bit.
    high ? Buffer.from([0xfc | 1, 0xf8, 0xf8, 0]) : [],
  ].flat());
  return { samples: out, description: avcC };
}

// Run-length entries: [[count, value], ...]
function runs(values) {
  const out = [];
  for (const v of values) { const last = out[out.length - 1]; if (last && last[1] === v) last[0]++; else out.push([1, v]); }
  return out;
}

// Group a track's samples into chunks of about a second, so video and audio interleave in the file.
function chunked(track, timescale) {
  const chunks = []; let cur = null, t = 0;
  track.samples.forEach((s, i) => {
    if (!cur || t >= cur.start + timescale) { cur = { start: t, first: i, count: 0, bytes: 0 }; chunks.push(cur); }
    cur.count++; cur.bytes += s.data.length; t += s.dur;
  });
  return { chunks, duration: t };
}

function stbl(track, sampleEntry, chunks, offsets, keys) {
  const stts = runs(track.samples.map(s => s.dur));
  const stsc = []; let prev = -1;
  chunks.forEach((c, i) => { if (c.count !== prev) { stsc.push([i + 1, c.count]); prev = c.count; } });
  return box('stbl',
    full('stsd', 0, 0, be32(1), sampleEntry),
    full('stts', 0, 0, be32(stts.length), stts.map(([n, d]) => [be32(n), be32(d)])),
    keys && keys.length < track.samples.length ? full('stss', 0, 0, be32(keys.length), keys.map(be32)) : [],
    full('stsc', 0, 0, be32(stsc.length), stsc.map(([first, n]) => [be32(first), be32(n), be32(1)])),
    full('stsz', 0, 0, be32(0), be32(track.samples.length), track.samples.map(s => be32(s.data.length))),
    full('stco', 0, 0, be32(offsets.length), offsets.map(be32)));
}

// The track's length as played, in the movie's milliseconds: priming samples are not played.
const shown = t => Math.round(Math.max(0, t.duration - (t.track.delay || 0)) * 1000 / t.timescale);

function trak(id, kind, track, timescale, duration, chunks, offsets, length) {
  const video = kind === 'video', delay = track.delay || 0, played = shown({ track, duration, timescale });
  const tkhd = full('tkhd', 0, 3, be32(0), be32(0), be32(id), zeros(4), be32(length), zeros(8),
    be16(0), be16(0), be16(video ? 0 : 0x0100), zeros(2), MATRIX,
    be32(video ? track.width * 65536 : 0), be32(video ? track.height * 65536 : 0));
  const mdhd = full('mdhd', 0, 0, be32(0), be32(0), be32(timescale), be32(duration), be16(0x55c4) /* und */, be16(0));
  const hdlr = full('hdlr', 0, 0, zeros(4), Buffer.from(video ? 'vide' : 'soun'), zeros(12), Buffer.from(video ? 'VideoHandler\0' : 'SoundHandler\0'));
  const dinf = box('dinf', full('dref', 0, 0, be32(1), full('url ', 0, 1)));
  let entry, keys = null;
  if (video) {
    entry = box('avc1', zeros(6), be16(1), zeros(16), be16(track.width), be16(track.height),
      be32(0x00480000), be32(0x00480000), zeros(4), be16(1), zeros(32), be16(0x0018), be16(0xffff),
      box('avcC', Buffer.from(track.description)),
      // BT.709, limited range: what Chromium's encoder writes into the stream (its colorSpace says so).
      box('colr', Buffer.from('nclx'), be16(1), be16(1), be16(1), Buffer.from([0])));
    keys = []; track.samples.forEach((s, i) => { if (s.key) keys.push(i + 1); });
  } else {
    const esds = full('esds', 0, 0, desc(3, be16(0), Buffer.from([0]),
      desc(4, Buffer.from([0x40, 0x15]), zeros(3), be32(track.bitrate), be32(track.bitrate), desc(5, Buffer.from(track.description))),
      desc(6, Buffer.from([2]))));
    entry = box('mp4a', zeros(6), be16(1), zeros(8), be16(track.channels), be16(16), zeros(4), be32(track.sampleRate * 65536), esds);
  }
  const head = video ? full('vmhd', 0, 1, zeros(8)) : full('smhd', 0, 0, zeros(4));
  const edts = delay || length < played ? box('edts', full('elst', 0, 0, be32(1), be32(length), be32(delay), be16(1), be16(0))) : [];
  return box('trak', tkhd, edts, box('mdia', mdhd, hdlr, box('minf', head, dinf, stbl(track, entry, chunks, offsets, keys))));
}

export function writeMP4({ video, audio }) {
  if (!video?.samples?.length) throw new Error('mp4: no video samples');
  video = { ...video, ...toAVC(video.samples, video.description) };
  if (!video.description?.length) throw new Error('mp4: the H.264 encoder gave no avcC description');
  const tracks = [{ kind: 'video', track: video, timescale: video.timescale }];
  if (audio?.samples?.length) {
    if (!audio.description?.length) throw new Error('mp4: the AAC encoder gave no AudioSpecificConfig');
    tracks.push({ kind: 'audio', track: audio, timescale: audio.sampleRate });
  }
  for (const t of tracks) Object.assign(t, chunked(t.track, t.timescale));
  // The video sets the length: audio stops with the last frame, even mid AAC frame.
  const movieDuration = shown(tracks[0]);

  // Interleave the chunks by start time, and write them in that order.
  const order = tracks.flatMap((t, ti) => t.chunks.map(c => ({ ti, c, at: c.start / t.timescale }))).sort((a, b) => a.at - b.at || a.ti - b.ti);
  const moovFor = offsetsByTrack => box('moov',
    full('mvhd', 0, 0, be32(0), be32(0), be32(1000), be32(movieDuration), be32(0x00010000), be16(0x0100), zeros(10), MATRIX, zeros(24), be32(tracks.length + 1)),
    tracks.map((t, i) => trak(i + 1, t.kind, t.track, t.timescale, t.duration, t.chunks, offsetsByTrack[i], Math.min(shown(t), movieDuration))));
  const ftyp = box('ftyp', Buffer.from('isom'), be32(512), Buffer.from('isomiso2avc1mp41'));
  // The moov's size does not depend on the offset values, so size it with zeros first.
  const blank = tracks.map(t => t.chunks.map(() => 0));
  const dataStart = ftyp.length + moovFor(blank).length + 8;
  const offsets = tracks.map(() => []);
  let pos = dataStart;
  for (const { ti, c } of order) { offsets[ti].push(pos); pos += c.bytes; }
  if (pos > 0xffffffff) throw new Error('mp4: the file would pass 4 GB; lower --fps, --width or --scale');
  const moov = moovFor(offsets);
  const mdat = [be32(pos - dataStart + 8), Buffer.from('mdat')];
  for (const { ti, c } of order) for (let k = 0; k < c.count; k++) mdat.push(Buffer.from(tracks[ti].track.samples[c.first + k].data));
  return Buffer.concat([ftyp, moov, ...mdat]);
}
