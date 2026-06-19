// Generates DEMO PWA icons as PNGs with zero dependencies (Node's zlib only).
// A gold "spotlight" disc on the brand indigo — the discovery mark. Re-run after a brand change:
//   node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

const BRAND = [34, 160, 110]; // DEMO green
const GOLD = [235, 140, 55]; // DEMO orange (spotlight mark)

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, { maskable } = {}) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const cx = size / 2;
  const cy = size / 2;
  // Maskable icons need their content inside the safe zone (~80%); shrink the disc.
  const r = size * (maskable ? 0.3 : 0.34);
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      // Antialiased disc edge.
      const t = Math.max(0, Math.min(1, r - d + 0.5));
      const [br, bg, bb] = BRAND;
      const [gr, gg, gb] = GOLD;
      raw[p++] = Math.round(br + (gr - br) * t);
      raw[p++] = Math.round(bg + (gg - bg) * t);
      raw[p++] = Math.round(bb + (gb - bb) * t);
      raw[p++] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const targets = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["maskable-512.png", 512, { maskable: true }],
  ["badge-72.png", 72, {}],
];
for (const [name, size, opts] of targets) {
  writeFileSync(join(OUT, name), png(size, opts));
  console.log("wrote", name);
}
