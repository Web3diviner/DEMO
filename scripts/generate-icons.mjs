// Generates Skylora PWA icons from the brand mark (gold "light" star on green).
// Renders the SVG with headless Chromium so the PNGs match the in-app <LogoMark/> exactly.
//   node scripts/generate-icons.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

const STAR =
  "M256 116 C272 214 298 240 396 256 C298 272 272 298 256 396 C240 298 214 272 116 256 C214 240 240 214 256 116 Z";

const GRADS = `
  <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
    <stop offset="0" stop-color="#27B074"/><stop offset="1" stop-color="#168A5C"/>
  </linearGradient>
  <linearGradient id="star" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFE0A0"/><stop offset="1" stop-color="#E7A52E"/>
  </linearGradient>`;

// Rounded tile (regular "any" icon).
const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>${GRADS}</defs>
  <rect width="512" height="512" rx="116" fill="url(#bg)"/>
  <path d="${STAR}" fill="url(#star)"/>
  <circle cx="214" cy="208" r="13" fill="#fff" opacity="0.5"/></svg>`;

// Maskable: full-bleed green, star scaled into the ~72% safe zone (no rounded corners).
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>${GRADS}</defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(0.72) translate(-256 -256)">
    <path d="${STAR}" fill="url(#star)"/></g></svg>`;

// Notification badge: monochrome white star on transparent (Android tints it).
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <g transform="translate(256 256) scale(0.82) translate(-256 -256)">
    <path d="${STAR}" fill="#ffffff"/></g></svg>`;

const targets = [
  ["icon-192.png", tile, 192, false],
  ["icon-512.png", tile, 512, false],
  ["maskable-512.png", maskable, 512, false],
  ["badge-72.png", badge, 72, true],
];

const browser = await chromium.launch();
for (const [name, svg, size, transparent] of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<!doctype html><html><body style="margin:0">
       <div style="width:${size}px;height:${size}px">${svg.replace('viewBox', `width="${size}" height="${size}" viewBox`)}</div>
     </body></html>`,
  );
  await page.screenshot({ path: join(OUT, name), omitBackground: transparent });
  await page.close();
  console.log("wrote", name);
}
await browser.close();
