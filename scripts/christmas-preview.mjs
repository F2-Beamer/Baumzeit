// Erzeugt die Vorschau-SVGs der Weihnachtszeit aus demselben Code wie die App.
// Aufruf: node scripts/christmas-preview.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { christmasTreeSVG, christmasState } from '../src/christmas.js';
import { forestSceneHTML, WINTER_PALETTE } from '../src/forest.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'design', 'preview');
mkdirSync(outDir, { recursive: true });

const FONT = "'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif";

function innerTree(opts, withStyle) {
  const svg = christmasTreeSVG(opts);
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return withStyle ? inner : inner.replace(/<style>[\s\S]*?<\/style>/, '');
}

function write(name, content) {
  writeFileSync(join(outDir, name), content, 'utf8');
  console.log('geschrieben:', join('design', 'preview', name));
}

// --- 1. Der voll geschmückte Baum am 24. Dezember ---------------------------

const single = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 900" width="640" height="900">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="72%">
      <stop offset="0%" stop-color="#fbfdff"/>
      <stop offset="100%" stop-color="#dfeaf4"/>
    </radialGradient>
  </defs>
  <rect width="640" height="900" fill="url(#bg)"/>
  <ellipse cx="320" cy="756" rx="250" ry="34" fill="#ffffff" opacity=".75"/>
  <g transform="translate(190 16) scale(2.6)">${innerTree({ ornaments: 24, star: true }, true)}</g>
  <text x="320" y="836" text-anchor="middle" font-family="${FONT}" font-size="21" font-weight="600" fill="#2b4237">24. Dezember</text>
  <text x="320" y="862" text-anchor="middle" font-family="${FONT}" font-size="14" fill="#5c7264">12 Kerzen · 12 Kugeln · Stern an der Spitze</text>
</svg>`;
write('weihnachtsbaum-24-dezember.svg', single);

// --- 2. Verlauf: 1., 12. und 24. Dezember ----------------------------------

const stages = [
  { day: 1, x: 205, ornament: christmasState(new Date(2026, 11, 1)) },
  { day: 12, x: 540, ornament: christmasState(new Date(2026, 11, 12)) },
  { day: 24, x: 880, ornament: christmasState(new Date(2026, 11, 24)) }
];

const stageLabel = (s) => {
  const { candles, balls, star } = s.ornament;
  const parts = [];
  if (candles) parts.push(`${candles} ${candles === 1 ? 'Kerze' : 'Kerzen'}`);
  if (balls) parts.push(`${balls} ${balls === 1 ? 'Kugel' : 'Kugeln'}`);
  if (star) parts.push('mit Stern');
  return parts.join(' · ');
};

const stageTrees = stages.map((s, i) => (
  `<g transform="translate(${(s.x - 100 * 1.1).toFixed(1)} 158) scale(1.1)">`
  + innerTree({ ornaments: s.ornament.ornaments, star: s.ornament.star }, i === 0)
  + '</g>'
  + `<text x="${s.x}" y="548" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="600" fill="#2b4237">${s.day}. Dezember</text>`
  + `<text x="${s.x}" y="570" text-anchor="middle" font-family="${FONT}" font-size="13" fill="#5c7264">${stageLabel(s)}</text>`
)).join('\n  ');

const stagesSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 620" width="1080" height="620">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fbfdff"/>
      <stop offset="100%" stop-color="#e6f0f8"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="620" fill="url(#bg)"/>
  <text x="540" y="66" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="600" fill="#2b4237">Ein Schmuckstück pro Tag</text>
  <text x="540" y="92" text-anchor="middle" font-family="${FONT}" font-size="14" fill="#5c7264">Jeden Tag kommt abwechselnd eine Kerze und eine Kugel dazu</text>
  <ellipse cx="205" cy="474" rx="120" ry="18" fill="#ffffff" opacity=".7"/>
  <ellipse cx="540" cy="474" rx="120" ry="18" fill="#ffffff" opacity=".7"/>
  <ellipse cx="880" cy="474" rx="120" ry="18" fill="#ffffff" opacity=".7"/>
  ${stageTrees}
</svg>`;
write('weihnachtsbaum-verlauf.svg', stagesSvg);

// --- 3. Die komplette Wald-Ansicht im Dezember ----------------------------

const species = ['eiche', 'tanne', 'birke', 'ahorn', 'tanne', 'kirsche', 'eiche', 'ulme', 'birke', 'tanne', 'eiche', 'ahorn',
  'tanne', 'eiche', 'ulme', 'birke', 'tanne', 'kirsche'];
const sessions = species.map((sp, i) => ({
  id: 'p' + i,
  species: sp,
  seed: 137 * (i + 3),
  minutes: [25, 50, 12, 30, 18, 45, 8, 60, 22, 35, 5, 40, 28, 15, 50, 20, 33, 44][i],
  endedAt: new Date(2026, 10, 20 - i, 18, 0).toISOString()
}));

const sceneHtml = forestSceneHTML(sessions, {
  date: new Date(2026, 11, 24),
  palette: WINTER_PALETTE
});
const sceneSvg = sceneHtml.match(/<svg[\s\S]*<\/svg>/)[0]
  .replace('<svg ', '<svg width="1140" ');
write('wald-im-dezember.svg', sceneSvg);
