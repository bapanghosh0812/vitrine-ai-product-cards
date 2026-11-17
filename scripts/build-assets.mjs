#!/usr/bin/env node
/**
 * Generates every raster brand asset from the source art in ../_brand and the
 * hand-drawn SVG logo below. Run once after changing the art:
 *
 *   node scripts/build-assets.mjs [--icon <path-to-vitrine-icon.webp>] [--sheet <path-to-kabir-sheet.png>]
 *
 * Outputs (committed):
 *   public/favicon.svg, public/favicon.ico, public/icons/*.png, public/brand/*.webp
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const ICON = arg('--icon', '../_brand/vitrine/vitrine-icon.webp');
const SHEET = arg('--sheet', '../_brand/vitrine/kabir-sheet.png');
const out = (...p) => join(process.cwd(), 'public', ...p);
mkdirSync(out('icons'), { recursive: true });
mkdirSync(out('brand'), { recursive: true });

/* ------------------------------------------------------------------ */
/* 1. Hand-made SVG logo mark: emerald squircle, gold arch, card, spark */
/* ------------------------------------------------------------------ */
export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Vitrine">
  <defs>
    <linearGradient id="vt-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1A7A5D"/>
      <stop offset=".55" stop-color="#0E4D3A"/>
      <stop offset="1" stop-color="#05261C"/>
    </linearGradient>
    <linearGradient id="vt-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F6E3AE"/>
      <stop offset=".5" stop-color="#D8B46A"/>
      <stop offset="1" stop-color="#A7802F"/>
    </linearGradient>
    <radialGradient id="vt-glow" cx=".5" cy=".55" r=".5">
      <stop offset="0" stop-color="#F6E3AE" stop-opacity=".35"/>
      <stop offset="1" stop-color="#F6E3AE" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="64" height="64" rx="15" fill="url(#vt-bg)"/>
  <rect x="1" y="1" width="62" height="62" rx="14" fill="none" stroke="#7FD1B0" stroke-opacity=".18"/>
  <ellipse cx="32" cy="36" rx="17" ry="15" fill="url(#vt-glow)"/>
  <path d="M20.5 47.5V28.5a11.5 11.5 0 0 1 23 0v19" fill="none" stroke="url(#vt-gold)" stroke-width="3.2" stroke-linecap="round"/>
  <rect x="15.5" y="46.5" width="33" height="5" rx="2.5" fill="url(#vt-gold)"/>
  <g transform="rotate(-11 32 35.5)">
    <rect x="24.5" y="26.5" width="15" height="18" rx="3.2" fill="url(#vt-gold)"/>
    <path d="M29.4 32.2h5.2l.7 4.6h-6.6z" fill="#0E4D3A" fill-opacity=".9"/>
    <path d="M30.7 32.2v-.9a1.3 1.3 0 0 1 2.6 0v.9" fill="none" stroke="#0E4D3A" stroke-opacity=".9" stroke-width="1"/>
    <rect x="27.6" y="39" width="8.8" height="1.5" rx=".75" fill="#0E4D3A" fill-opacity=".55"/>
    <rect x="27.6" y="41.4" width="5.6" height="1.3" rx=".65" fill="#0E4D3A" fill-opacity=".4"/>
  </g>
  <path d="M45.5 11.5c.5 3.1 1.7 4.3 4.8 4.8-3.1.5-4.3 1.7-4.8 4.8-.5-3.1-1.7-4.3-4.8-4.8 3.1-.5 4.3-1.7 4.8-4.8z" fill="#FBEFC8"/>
</svg>
`;

writeFileSync(out('favicon.svg'), LOGO_SVG);
writeFileSync(out('brand', 'logo-mark.svg'), LOGO_SVG);

const svgBuffer = Buffer.from(LOGO_SVG);
const png = (size) => sharp(svgBuffer, { density: Math.max(72, (size / 64) * 72 * 2) }).resize(size, size).png({ compressionLevel: 9 });

for (const size of [192, 512]) await png(size).toFile(out('icons', `icon-${size}.png`));
await png(180).toFile(out('icons', 'apple-touch-icon.png'));

// Maskable icon: full-bleed emerald with the mark inside the 80% safe zone.
const inner = await png(400).toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0E4D3A' } })
  .composite([{ input: inner, top: 56, left: 56 }])
  .png()
  .toFile(out('icons', 'maskable-512.png'));

// favicon.ico with embedded PNGs (16, 32, 48)
const icoSizes = [16, 32, 48];
const icoPngs = await Promise.all(icoSizes.map((s) => png(s).toBuffer()));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);
let offset = 6 + 16 * icoSizes.length;
const entries = icoPngs.map((buf, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(icoSizes[i] % 256, 0);
  e.writeUInt8(icoSizes[i] % 256, 1);
  e.writeUInt8(0, 2);
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(buf.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += buf.length;
  return e;
});
writeFileSync(out('favicon.ico'), Buffer.concat([header, ...entries, ...icoPngs]));

/* ------------------------------------------------------------------ */
/* 2. Large app icon / OG art from the provided webp                   */
/* ------------------------------------------------------------------ */
if (existsSync(ICON)) {
  await sharp(ICON).resize(1024, 1024).webp({ quality: 86 }).toFile(out('brand', 'vitrine-icon.webp'));
  await sharp(ICON).resize(384, 384).webp({ quality: 84 }).toFile(out('brand', 'vitrine-icon-384.webp'));
} else {
  console.warn(`! icon not found at ${ICON}, skipping`);
}

/* ------------------------------------------------------------------ */
/* 3. Kabir mascot: flood-fill background removal + crops              */
/* ------------------------------------------------------------------ */
if (existsSync(SHEET)) {
  const { data, info } = await sharp(SHEET).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const bg = [197, 195, 198];
  const mask = new Uint8Array(W * H); // 1 = background
  const at = (x, y) => (y * W + x) * 3;
  const isBg = (x, y) => {
    const i = at(x, y);
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const d = Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
    if (d < 26) return true;
    // Soft floor shadows near the bottom: neutral greys
    if (y > H * 0.9) {
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const lum = (r + g + b) / 3;
      return max - min < 10 && lum > 120 && lum < 215;
    }
    return false;
  };
  const queue = new Int32Array(W * H);
  let head = 0, tail = 0;
  const seed = (x, y) => {
    const k = y * W + x;
    if (!mask[k] && isBg(x, y)) {
      mask[k] = 1;
      queue[tail++] = k;
    }
  };
  for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
  while (head < tail) {
    const k = queue[head++];
    const x = k % W, y = (k / W) | 0;
    if (x > 0) seed(x - 1, y);
    if (x < W - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < H - 1) seed(x, y + 1);
  }
  // Alpha: erode 1px then soften the edge.
  const alpha = Buffer.alloc(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = y * W + x;
      let fg = mask[k] ? 0 : 255;
      if (fg && (mask[k - 1] || mask[k + 1] || mask[k - W] || mask[k + W])) fg = 140;
      alpha[k] = fg;
    }
  }
  const softAlpha = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } })
    .blur(0.7)
    .toColourspace('b-w')
    .extractChannel(0)
    .raw()
    .toBuffer();
  if (softAlpha.length !== W * H) throw new Error(`alpha size mismatch: ${softAlpha.length} vs ${W * H}`);
  const rgba = Buffer.alloc(W * H * 4);
  for (let k = 0; k < W * H; k++) {
    rgba[k * 4] = data[k * 3];
    rgba[k * 4 + 1] = data[k * 3 + 1];
    rgba[k * 4 + 2] = data[k * 3 + 2];
    rgba[k * 4 + 3] = softAlpha[k];
  }
  const cut = () => sharp(rgba, { raw: { width: W, height: H, channels: 4 } });
  const crops = [
    { name: 'kabir-avatar', region: { left: 215, top: 18, width: 280, height: 280 }, size: [256, 256] },
    { name: 'kabir-bust', region: { left: 160, top: 10, width: 390, height: 470 }, size: [390, 470] },
    { name: 'kabir-full', region: { left: 170, top: 6, width: 370, height: 1010 }, size: [370, 1010] },
    { name: 'kabir-three-quarter', region: { left: 630, top: 6, width: 350, height: 1010 }, size: [350, 1010] },
    { name: 'kabir-profile', region: { left: 1140, top: 6, width: 220, height: 1010 }, size: [220, 1010] },
  ];
  for (const c of crops) {
    const buf = await cut().extract(c.region).png().toBuffer();
    await sharp(buf).resize(c.size[0], c.size[1], { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 88, alphaQuality: 90 }).toFile(out('brand', `${c.name}.webp`));
  }
  // 96px launcher head for the floating Ask Kabir button
  const head96 = await cut().extract({ left: 250, top: 18, width: 210, height: 210 }).png().toBuffer();
  await sharp(head96).resize(128, 128).webp({ quality: 88, alphaQuality: 90 }).toFile(out('brand', 'kabir-head.webp'));
} else {
  console.warn(`! mascot sheet not found at ${SHEET}, skipping`);
}

console.log('assets: done');
