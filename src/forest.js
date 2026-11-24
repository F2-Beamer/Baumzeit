// Die große Wald-Ansicht als SVG – inklusive Weihnachtszeit (Christbaum, Schnee).
// Reine String-Erzeugung ohne DOM, damit App und Vorschau dieselbe Szene nutzen.

import { treeSVG, stageForMinutes, mulberry32 } from './trees.js';
import { christmasState, christmasTreeSVG } from './christmas.js';

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Standard: Farben kommen aus den CSS-Variablen (Hell/Dunkel-Theme).
export const VAR_PALETTE = {
  skyA: 'var(--forest-sky-a)',
  skyB: 'var(--forest-sky-b)',
  hillFar: 'var(--forest-hill-far)',
  hillNear: 'var(--forest-hill-near)',
  groundA: 'var(--forest-ground-a)',
  groundB: 'var(--forest-ground-b)',
  groundShadow: 'var(--forest-ground-shadow)'
};

// Feste Winterfarben für eigenständige Vorschau-Dateien (ohne CSS-Kontext).
export const WINTER_PALETTE = {
  skyA: '#eaf3fc',
  skyB: '#ccdff1',
  hillFar: '#dde9f3',
  hillNear: '#c9dae7',
  groundA: '#f7fbfe',
  groundB: '#dfeaf3',
  groundShadow: '#a7bccb'
};

function flakeField(vbX, vbY, vbW) {
  const rnd = mulberry32(20261224);
  let out = '';
  for (let i = 0; i < 30; i += 1) {
    const x = (vbX + rnd() * vbW).toFixed(1);
    const y = (vbY + rnd() * 60).toFixed(1);
    const r = (1 + rnd() * 1.7).toFixed(2);
    const dur = (9 + rnd() * 8).toFixed(1);
    const delay = (-rnd() * dur).toFixed(1);
    const op = (0.45 + rnd() * 0.4).toFixed(2);
    out += '<circle class="bz-flake" cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#ffffff" opacity="' + op
      + '" style="animation-duration:' + dur + 's;animation-delay:' + delay + 's"/>';
  }
  return out;
}

/**
 * Wald-Szene.
 * @param {Array} sessions gepflanzte Sessions
 * @param {{date?: Date|number|string, christmas?: boolean, palette?: object}} options
 */
export function forestSceneHTML(sessions, options = {}) {
  const date = options.date === undefined ? new Date() : new Date(options.date);
  const xmas = options.christmas === false ? null : christmasState(date);
  const winter = !!(xmas && xmas.active);
  const palette = options.palette || VAR_PALETTE;

  const trees = (sessions || []).filter((s) => s && Number(s.minutes) > 0);
  if (!trees.length && !winter) {
    return '<div class="empty-state">Noch kein Baum gepflanzt.<br>Starte deine erste Session – der Wald wächst mit jeder Minute.</div>';
  }

  const W = winter ? 1140 : 900;
  const H = 380;
  const groundY = 318;
  const n = trees.length;
  const forestRight = winter ? 860 : W;
  const spreadX = Math.min(forestRight - 180, Math.max(140, Math.sqrt(n) * 62));
  const spreadY = Math.min(78, Math.max(34, Math.sqrt(n) * 11));
  const centerX = 450;
  const centerY = groundY - 34;

  // Zufällig, aber als zusammenhängender Wald-Hain.
  const placed = trees.map((s, i) => {
    const rnd = mulberry32((Number(s.seed) || i + 1) * 977 + i * 37);
    const minutes = Math.max(1, Number(s.minutes) || 1);
    const angle = rnd() * Math.PI * 2;
    const radius = Math.sqrt(rnd()); // gleichmäßiger in der Fläche
    const x = Math.min(forestRight - 55, Math.max(55, centerX + Math.cos(angle) * radius * (spreadX / 2)));
    const y = Math.min(groundY + 18, Math.max(groundY - 86, centerY + Math.sin(angle) * radius * spreadY));
    const depth = Math.min(1, Math.max(0, (y - (groundY - 86)) / 104));
    const scaleBase = 0.60 + (Math.min(50, minutes) / 50) * 0.72;
    const scale = scaleBase * (0.90 + depth * 0.16);
    return { s, minutes, scale, x, y, depth };
  }).sort((a, b) => a.y - b.y || a.x - b.x);

  // Christbaum rechts neben dem Hain, deutlich größer als die Waldbäume.
  const xmasScale = 1;
  const xmasBaseY = groundY + 12;
  let forestEdge = 0;
  for (const p of placed) forestEdge = Math.max(forestEdge, p.x + 55 * p.scale);
  const xmasX = winter
    ? (placed.length ? Math.min(W - 125, Math.max(forestRight - 125, forestEdge + 150)) : W / 2)
    : 0;
  const xmasBox = winter
    ? { x: xmasX - 100 * xmasScale, y: xmasBaseY - 300 * xmasScale, w: 200 * xmasScale, h: 300 * xmasScale }
    : null;

  // ViewBox auf vorhandene Bäume zoomen (mit Rand), damit der Wald die Fläche füllt.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const include = (x, y, w, h) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  };
  for (const p of placed) {
    include(p.x - 50 * p.scale, p.y - 132 * p.scale, 100 * p.scale, 136 * p.scale);
  }
  if (xmasBox) include(xmasBox.x, xmasBox.y, xmasBox.w, xmasBox.h);
  if (!Number.isFinite(minX)) {
    minX = 0; minY = 0; maxX = W; maxY = H;
  }

  const padX = 44;
  const padTop = 36;
  const padBottom = 48;
  minX = Math.max(0, minX - padX);
  minY = Math.max(0, minY - padTop);
  maxX = Math.min(W, maxX + padX);
  maxY = Math.min(H, Math.max(groundY + 28, maxY + padBottom));
  let vbW = Math.max(220, maxX - minX);
  let vbH = Math.max(160, maxY - minY);
  // Mindest-Seitenverhältnis beibehalten, damit es nicht zu extrem wird.
  const targetAspect = W / H;
  const aspect = vbW / vbH;
  if (aspect > targetAspect * 1.35) {
    const newH = vbW / (targetAspect * 1.35);
    minY = Math.max(0, minY - (newH - vbH) / 2);
    vbH = newH;
  } else if (aspect < targetAspect * 0.65) {
    const newW = vbH * (targetAspect * 0.65);
    minX = Math.max(0, minX - (newW - vbW) / 2);
    vbW = newW;
  }
  if (minX + vbW > W) minX = Math.max(0, W - vbW);
  if (minY + vbH > H) minY = Math.max(0, H - vbH);
  let vbX = Math.round(minX);
  const vbY = Math.round(minY);
  vbW = Math.round(Math.min(W - vbX, vbW));
  vbH = Math.round(Math.min(H - vbY, vbH));

  // Leerer Wald: breite Bühne um den Christbaum, damit die Szene nicht hochkant wird.
  if (!placed.length) {
    vbW = Math.min(W, 900);
    vbX = Math.round(Math.min(Math.max(0, xmasX - vbW / 2), W - vbW));
  }

  const snowBanks = winter
    ? '<ellipse cx="200" cy="' + (groundY + 2) + '" rx="250" ry="15" fill="#ffffff" opacity=".45"/>'
      + '<ellipse cx="560" cy="' + (groundY + 5) + '" rx="280" ry="17" fill="#ffffff" opacity=".38"/>'
      + '<ellipse cx="930" cy="' + (groundY + 3) + '" rx="230" ry="15" fill="#ffffff" opacity=".42"/>'
    : '';

  const hills = `
    <defs>
      <linearGradient id="forestSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${palette.skyA}"/>
        <stop offset="100%" stop-color="${palette.skyB}"/>
      </linearGradient>
      <linearGradient id="forestGround" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${palette.groundA}"/>
        <stop offset="100%" stop-color="${palette.groundB}"/>
      </linearGradient>
    </defs>
    <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="url(#forestSky)"/>
    <ellipse cx="180" cy="250" rx="260" ry="70" fill="${palette.hillFar}" opacity="0.55"/>
    <ellipse cx="720" cy="255" rx="280" ry="75" fill="${palette.hillFar}" opacity="0.5"/>
    <ellipse cx="450" cy="275" rx="360" ry="85" fill="${palette.hillNear}" opacity="0.45"/>
    <rect x="${vbX}" y="${groundY}" width="${vbW}" height="${Math.max(0, vbY + vbH - groundY)}" fill="url(#forestGround)"/>
    ${snowBanks}
    <ellipse cx="450" cy="${groundY + 10}" rx="520" ry="46" fill="${palette.groundShadow}" opacity="0.18"/>
  `;

  const treeGroups = placed.map(({ s, scale, x, y, depth }) => {
    const stage = stageForMinutes(s.minutes);
    const inner = treeSVG(s.species, stage, s.seed, '', winter)
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '')
      .replace(/<ellipse[^>]*cx="50"[^>]*cy="133"[^>]*\/>/, ''); // Bodenschatten des Einzelbaums entfernen
    const alpha = 0.78 + depth * 0.22;
    const tx = (x - 50 * scale).toFixed(1);
    const ty = (y - 132 * scale).toFixed(1);
    return `<g transform="translate(${tx} ${ty}) scale(${scale.toFixed(3)})" opacity="${alpha.toFixed(2)}">${inner}</g>`;
  }).join('');

  const xmasTip = xmasBox
    ? 'Weihnachtsbaum · ' + xmas.day + '. Dezember · '
      + xmas.candles + ' ' + (xmas.candles === 1 ? 'Kerze' : 'Kerzen') + ', '
      + xmas.balls + ' ' + (xmas.balls === 1 ? 'Kugel' : 'Kugeln')
      + (xmas.star ? ' · Stern an der Spitze' : '')
    : '';

  const xmasTree = xmasBox
    ? '<g class="christmas-tree" transform="translate(' + xmasBox.x.toFixed(1) + ' ' + xmasBox.y.toFixed(1) + ') scale(' + xmasScale + ')">'
      + '<title>' + esc(xmasTip) + '</title>'
      + christmasTreeSVG({ ornaments: xmas.ornaments, star: xmas.star })
        .replace(/^<svg[^>]*>/, '')
        .replace(/<\/svg>$/, '')
      + '</g>'
    : '';

  const label = winter
    ? `Verschneiter Wald mit ${n} Bäumen und Weihnachtsbaum`
    : `Wald mit ${n} Bäumen`;

  const scene = `<div class="forest-scene${winter ? ' winter' : ''}" role="img" aria-label="${esc(label)}">
    <svg viewBox="${vbX} ${vbY} ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <style>
        .bz-flake{animation-name:bzFall;animation-timing-function:linear;animation-iteration-count:infinite}
        @keyframes bzFall{0%{transform:translateY(-40px);opacity:0}12%{opacity:.9}88%{opacity:.9}100%{transform:translateY(360px);opacity:0}}
        @media (prefers-reduced-motion: reduce){.bz-flake{animation:none;opacity:.5}}
      </style>
      ${hills}
      ${treeGroups}
      ${xmasTree}
      ${winter ? flakeField(vbX, vbY, vbW) : ''}
    </svg>
  </div>`;

  if (!placed.length) {
    return scene + '<div class="empty-state">Noch kein Baum gepflanzt.<br>Starte deine erste Session – der Wald wächst mit jeder Minute.</div>';
  }
  return scene;
}
