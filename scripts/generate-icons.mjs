/**
 * Generate the PWA icons.
 *
 * Committed as a script rather than as opaque binaries so the artwork can be
 * changed by editing numbers, and so nobody has to wonder how the PNGs in
 * public/ were made. Writes real PNGs with nothing but node:zlib.
 *
 *   node scripts/generate-icons.mjs
 */

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
/** Next picks up src/app/icon.png as the favicon automatically. */
const APP = join(ROOT, "src", "app");

const GROUND = [12, 10, 9];
const AMBER = [245, 158, 11];
const STRING = [120, 113, 108];

/** CRC-32, needed for every PNG chunk. */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  // Each scanline is prefixed with its filter type; 0 means none.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Soften an edge across roughly one pixel, so nothing looks jagged. */
function coverage(distance, feather) {
  return Math.min(1, Math.max(0, 0.5 - distance / feather));
}

function blend(target, offset, colour, alpha) {
  if (alpha <= 0) return;
  for (let i = 0; i < 3; i += 1) {
    target[offset + i] = Math.round(
      target[offset + i] * (1 - alpha) + colour[i] * alpha,
    );
  }
}

/**
 * A tuner peg with its string: a ring in the upper half, a line running from
 * it off the bottom edge. Legible at 32px, which is the only real constraint
 * on an app icon.
 */
function render(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const feather = 1.5 / size;

  const ringCentre = { x: 0.5, y: 0.4 };
  const ringRadius = 0.2;
  const ringWidth = 0.062;
  const stringWidth = 0.05;
  const stringTop = 0.4;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;

      // Full-bleed ground, so the icon also works as a maskable one.
      pixels[offset] = GROUND[0];
      pixels[offset + 1] = GROUND[1];
      pixels[offset + 2] = GROUND[2];
      pixels[offset + 3] = 255;

      // String: a vertical bar from behind the ring to the bottom edge.
      if (v > stringTop) {
        blend(
          pixels,
          offset,
          STRING,
          coverage(Math.abs(u - 0.5) - stringWidth / 2, feather),
        );
      }

      // Ring.
      const distance = Math.hypot(u - ringCentre.x, v - ringCentre.y);
      blend(
        pixels,
        offset,
        AMBER,
        coverage(Math.abs(distance - ringRadius) - ringWidth / 2, feather),
      );
    }
  }
  return pixels;
}

for (const [dir, label, name, size] of [
  [PUBLIC, "public", "icon-192.png", 192],
  [PUBLIC, "public", "icon-512.png", 512],
  [PUBLIC, "public", "apple-touch-icon.png", 180],
  [APP, "src/app", "icon.png", 64],
]) {
  writeFileSync(join(dir, name), encodePng(size, render(size)));
  console.log(`wrote ${label}/${name} (${size}x${size})`);
}
