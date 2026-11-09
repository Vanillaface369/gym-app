// Writes simple PNG app icons (dumbbell on dark background) without any image libraries.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x0b, 0x0d, 0x10];
const FG = [0xb6, 0xf2, 0x3a];
// Same shapes as public/icon.svg, in a 64-unit grid; maskable-safe (kept inside the centre 80%).
const rects = [
  [10, 22, 7, 20], [47, 22, 7, 20], [18, 18, 6, 28], [40, 18, 6, 28], [24, 29, 16, 6],
];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size) {
  const s = size / 64;
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = x / s, v = y / s;
      const hit = rects.some(([rx, ry, rw, rh]) => u >= rx && u < rx + rw && v >= ry && v < ry + rh);
      const c = hit ? FG : BG;
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) writeFileSync(`public/icon-${size}.png`, png(size));
console.log('icons written');
