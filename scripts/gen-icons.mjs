// Generates solid-color app icons (PNG) without external dependencies.
// Shape: accent background with a white "save to inbox" down-arrow tray glyph.
// Usage: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// ---- minimal PNG encoder ----
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // raw scanlines with filter byte 0
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---- icon painting ----
const ACCENT = [0x0e, 0x7c, 0x66]; // #0E7C66
const WHITE = [0xff, 0xff, 0xff];

function paintIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const px = (x, y, [r, g, b], a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    rgba[i] = r;
    rgba[i + 1] = g;
    rgba[i + 2] = b;
    rgba[i + 3] = a;
  };

  // scale glyph down for maskable safe zone
  const pad = maskable ? size * 0.2 : size * 0.04;
  const radius = size * 0.18;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // rounded-rect background (skip rounding for maskable: full bleed)
      if (!maskable) {
        const dx = Math.max(pad - x, x - (size - 1 - pad), 0);
        const dy = Math.max(pad - y, y - (size - 1 - pad), 0);
        if (dx > 0 || dy > 0) {
          // outside the padded square: transparent
          const inCorner =
            (x < pad + radius && y < pad + radius) ||
            (x > size - pad - radius && y < pad + radius) ||
            (x < pad + radius && y > size - pad - radius) ||
            (x > size - pad - radius && y > size - pad - radius);
          if (!inCorner) {
            px(x, y, [0, 0, 0], 0);
            continue;
          }
          const cx = x < size / 2 ? pad + radius : size - pad - radius;
          const cy = y < size / 2 ? pad + radius : size - pad - radius;
          if ((x - cx) ** 2 + (y - cy) ** 2 > radius ** 2) {
            px(x, y, [0, 0, 0], 0);
            continue;
          }
        }
      }
      px(x, y, ACCENT);
    }
  }

  // white glyph: tray with down arrow, centered, ~52% of size
  const s = size;
  const gx0 = Math.round(s * 0.26);
  const gx1 = Math.round(s * 0.74);
  const gyTop = Math.round(s * 0.26);
  const gyBottom = Math.round(s * 0.7);
  const stroke = Math.max(2, Math.round(s * 0.055));

  // arrow shaft
  const shaftX0 = Math.round(s * 0.46);
  const shaftX1 = Math.round(s * 0.54);
  for (let y = gyTop; y < Math.round(s * 0.5); y++)
    for (let x = shaftX0; x <= shaftX1; x++) px(x, y, WHITE);

  // arrow head (triangle)
  const headTop = Math.round(s * 0.47);
  const headBottom = Math.round(s * 0.58);
  for (let y = headTop; y <= headBottom; y++) {
    const t = (y - headTop) / (headBottom - headTop);
    const half = Math.round((1 - t) * s * 0.14);
    for (let x = Math.round(s / 2) - half; x <= Math.round(s / 2) + half; x++) px(x, y, WHITE);
  }

  // tray: U shape
  const trayTop = Math.round(s * 0.56);
  for (let y = trayTop; y <= gyBottom; y++) {
    for (let x = gx0; x < gx0 + stroke; x++) px(x, y, WHITE);
    for (let x = gx1 - stroke; x < gx1; x++) px(x, y, WHITE);
  }
  for (let y = gyBottom - stroke; y <= gyBottom; y++)
    for (let x = gx0; x < gx1; x++) px(x, y, WHITE);

  return rgba;
}

function writeIcon(relPath, size, opts) {
  const png = encodePng(size, size, paintIcon(size, opts));
  const abs = join(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, png);
  console.log(`wrote ${relPath} (${size}x${size}, ${png.length} bytes)`);
}

// web PWA icons
writeIcon("apps/web/public/icons/icon-192.png", 192);
writeIcon("apps/web/public/icons/icon-512.png", 512);
writeIcon("apps/web/public/icons/maskable-512.png", 512, { maskable: true });
writeIcon("apps/web/public/apple-touch-icon.png", 180, { maskable: true });

// extension icons
writeIcon("apps/extension/public/icons/icon-16.png", 16);
writeIcon("apps/extension/public/icons/icon-48.png", 48);
writeIcon("apps/extension/public/icons/icon-128.png", 128);
