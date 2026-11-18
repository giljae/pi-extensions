// A small animated-GIF encoder for blueprint sheets. No dependencies.
// Sheets are flat line art in a handful of colours, so one global palette, built from sample
// frames, keeps every frame consistent; only the rectangle that changed is written each frame,
// and frames with no change extend the previous frame's delay instead.
//
//   const gif = new GifWriter(width, height, samples)  // samples: a few RGBA frames for the palette
//   gif.add(rgba, delaySeconds); ... ; const bytes = gif.end();

export class GifWriter {
  constructor(width, height, samples) {
    this.w = width; this.h = height;
    this.palette = buildPalette(samples);
    this.cache = new Map();
    this.prev = null; this.frames = [];
  }
  index(r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    let i = this.cache.get(key);
    if (i !== undefined) return i;
    let best = 0, bd = Infinity;
    const p = this.palette;
    for (let k = 0; k < p.length; k += 3) {
      const dr = r - p[k], dg = g - p[k + 1], db = b - p[k + 2];
      const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
      if (d < bd) { bd = d; best = k / 3; if (d === 0) break; }
    }
    this.cache.set(key, best);
    return best;
  }
  add(rgba, delay) {
    const { w, h } = this, idx = new Uint8Array(w * h);
    for (let i = 0, j = 0; i < idx.length; i++, j += 4) idx[i] = this.index(rgba[j], rgba[j + 1], rgba[j + 2]);
    let x0 = 0, y0 = 0, x1 = w - 1, y1 = h - 1;
    if (this.prev) {
      x0 = w; y0 = h; x1 = -1; y1 = -1;
      for (let y = 0; y < h; y++) {
        const row = y * w;
        for (let x = 0; x < w; x++) if (idx[row + x] !== this.prev[row + x]) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      if (x1 < 0) { this.frames[this.frames.length - 1].delay += delay; return; }
    }
    const fw = x1 - x0 + 1, fh = y1 - y0 + 1, sub = new Uint8Array(fw * fh);
    for (let y = 0; y < fh; y++) sub.set(idx.subarray((y0 + y) * w + x0, (y0 + y) * w + x0 + fw), y * fw);
    this.frames.push({ x: x0, y: y0, w: fw, h: fh, data: lzw(sub, 8), delay });
    this.prev = idx;
  }
  end(loop = 0) {
    const out = [], u16 = v => out.push(v & 255, (v >> 8) & 255);
    out.push(...Buffer.from('GIF89a', 'latin1'));
    u16(this.w); u16(this.h); out.push(0xf7, 0, 0);                       // global table, 256 entries
    const pal = new Uint8Array(768); pal.set(this.palette); out.push(...pal);
    out.push(0x21, 0xff, 11, ...Buffer.from('NETSCAPE2.0', 'latin1'), 3, 1); u16(loop); out.push(0);
    const chunks = [Buffer.from(out)];
    // Delays are whole hundredths of a second. Rounding each frame on its own drifts (1/15 s is
    // 6.67 cs: 7 runs 5% slow; 1/30 s is 3.33 cs: 3 runs 10% fast), so carry each frame's rounding
    // error into the next and the running total stays within half a hundredth of the true time.
    let carry = 0;
    for (const f of this.frames) {
      const hd = [0x21, 0xf9, 4, 0x04, 0, 0, 0, 0];                         // disposal: leave in place
      const want = f.delay * 100 + carry, cs = Math.min(65535, Math.max(2, Math.round(want)));
      carry = want - cs; hd[4] = cs & 255; hd[5] = (cs >> 8) & 255;
      hd.push(0x2c, f.x & 255, f.x >> 8, f.y & 255, f.y >> 8, f.w & 255, f.w >> 8, f.h & 255, f.h >> 8, 0, 8);
      chunks.push(Buffer.from(hd));
      for (let i = 0; i < f.data.length; i += 255) {
        const n = Math.min(255, f.data.length - i);
        chunks.push(Buffer.from([n]), Buffer.from(f.data.subarray(i, i + n)));
      }
      chunks.push(Buffer.from([0]));
    }
    chunks.push(Buffer.from([0x3b]));
    return Buffer.concat(chunks);
  }
}

// Palette: exact colours when there are few; otherwise the most common colours of a 5-bit grid,
// each the average of the pixels that fell in its cell.
function buildPalette(samples) {
  const exact = new Map();
  for (const s of samples) for (let j = 0; j < s.length; j += 4) {
    const k = (s[j] << 16) | (s[j + 1] << 8) | s[j + 2];
    exact.set(k, (exact.get(k) || 0) + 1);
    if (exact.size > 256) break;
  }
  if (exact.size <= 256) {
    const p = new Uint8Array(768); let i = 0;
    for (const k of exact.keys()) { p[i++] = k >> 16; p[i++] = (k >> 8) & 255; p[i++] = k & 255; }
    return p.subarray(0, i);
  }
  const cells = new Map();
  for (const s of samples) for (let j = 0; j < s.length; j += 4) {
    const k = ((s[j] >> 3) << 10) | ((s[j + 1] >> 3) << 5) | (s[j + 2] >> 3);
    let c = cells.get(k); if (!c) cells.set(k, c = [0, 0, 0, 0]);
    c[0] += s[j]; c[1] += s[j + 1]; c[2] += s[j + 2]; c[3]++;
  }
  const top = [...cells.values()].sort((a, b) => b[3] - a[3]).slice(0, 256);
  const p = new Uint8Array(top.length * 3);
  top.forEach((c, i) => { p[i * 3] = c[0] / c[3]; p[i * 3 + 1] = c[1] / c[3]; p[i * 3 + 2] = c[2] / c[3]; });
  return p;
}

// GIF-flavoured LZW with variable code width, packed little-endian.
function lzw(pixels, minSize) {
  const clear = 1 << minSize, eoi = clear + 1, out = [];
  let size = minSize + 1, next = eoi + 1, dict = new Map(), bits = 0, acc = 0;
  const emit = code => { acc |= code << bits; bits += size; while (bits >= 8) { out.push(acc & 255); acc >>>= 8; bits -= 8; } };
  emit(clear);
  let prefix = pixels[0];
  for (let i = 1; i < pixels.length; i++) {
    const k = pixels[i], key = prefix * 4096 + k, hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix);
    if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
    else { emit(clear); dict = new Map(); size = minSize + 1; next = eoi + 1; }
    prefix = k;
  }
  emit(prefix); emit(eoi);
  if (bits > 0) out.push(acc & 255);
  return Uint8Array.from(out);
}
