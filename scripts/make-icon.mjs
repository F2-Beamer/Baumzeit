// Erzeugt das Quell-Icon (1024x1024 PNG) für `tauri icon`.
// Bewusst ohne externe Abhängigkeiten: eigener PNG-Encoder mit zlib.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SIZE = 1024;
const SS = 3; // Supersampling
const W = SIZE * SS;

const px = new Float32Array(W * W * 4); // RGBA 0..255

function blend(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= W || y >= W || a <= 0) return;
  const i = (y * W + x) * 4;
  const sa = Math.min(1, a);
  const da = px[i + 3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return;
  px[i] = (r * sa + px[i] * da * (1 - sa)) / outA;
  px[i + 1] = (g * sa + px[i + 1] * da * (1 - sa)) / outA;
  px[i + 2] = (b * sa + px[i + 2] * da * (1 - sa)) / outA;
  px[i + 3] = outA * 255;
}

function hex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

// Weiche Kante über Abstandsfunktion
function fillShape(test, color, alpha = 1) {
  const [r, g, b] = hex(color);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      if (test(x + 0.5, y + 0.5)) blend(x, y, r, g, b, alpha);
    }
  }
}

function roundedRect(x0, y0, x1, y1, radius) {
  return (x, y) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const cx = Math.min(Math.max(x, x0 + radius), x1 - radius);
    const cy = Math.min(Math.max(y, y0 + radius), y1 - radius);
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
  };
}

function ellipse(cx, cy, rx, ry) {
  return (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

// Hintergrund: abgerundetes Quadrat mit sanftem Verlauf
const margin = 40;
const bgTest = roundedRect(margin, margin, SIZE - margin, SIZE - margin, 210);
for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    if (!bgTest(x / SS, y / SS)) continue;
    const t = y / W;
    const r = 63 + (52 - 63) * t;
    const g = 109 + (92 - 109) * t;
    const b = 78 + (65 - 78) * t;
    blend(x, y, r, g, b, 1);
  }
}

// Boden-Schatten
fillShape(ellipse(512, 806, 260, 46), '#1e2a22', 0.22);
// Stamm
fillShape(roundedRect(478, 540, 546, 820, 26), '#f0e6d2');
// Wurzeln / Stammfuß
fillShape(ellipse(512, 812, 70, 22), '#f0e6d2');
// Krone: dunkle Lage leicht versetzt
fillShape(ellipse(524, 462, 232, 218), '#a9c9a2');
fillShape(ellipse(392, 540, 132, 120), '#a9c9a2');
fillShape(ellipse(632, 540, 132, 120), '#a9c9a2');
// Krone: helle Lagen
fillShape(ellipse(512, 442, 226, 212), '#eef5e8');
fillShape(ellipse(380, 522, 128, 116), '#eef5e8');
fillShape(ellipse(644, 522, 128, 116), '#eef5e8');
// Innenliegende Blatt-Andeutung
fillShape(ellipse(470, 388, 96, 82), '#dcebd5');
fillShape(ellipse(566, 470, 78, 66), '#dcebd5');

// Herunterrechnen auf Zielgröße
const out = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const i = (((y * SS + sy) * W) + (x * SS + sx)) * 4;
        const al = px[i + 3] / 255;
        r += px[i] * al;
        g += px[i + 1] * al;
        b += px[i + 2] * al;
        a += al;
      }
    }
    const o = (y * SIZE + x) * 4;
    if (a > 0) {
      out[o] = Math.round(r / a);
      out[o + 1] = Math.round(g / a);
      out[o + 2] = Math.round(b / a);
    }
    out[o + 3] = Math.round((a / (SS * SS)) * 255);
  }
}

// PNG schreiben
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  out.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;  // Bittiefe
ihdr[9] = 6;  // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);

const target = 'icon-source.png';
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, png);
console.log(`Icon geschrieben: ${target} (${png.length} Bytes)`);
