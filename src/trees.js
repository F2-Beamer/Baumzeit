// Prozedurale Baum-SVGs für Baumzeit.
// Alle Bäume nutzen dieselbe viewBox (0 0 100 140) mit Bodenlinie y = 132.

export const SPECIES = {
  eiche:   { c: ['#4a7352', '#5d8a63', '#74a07a', '#8db392'], bark: '#7b5c45', kind: 'round', dark: '#3a5a43' },
  birke:   { c: ['#7a9e5f', '#8fb474', '#a5c98a', '#bcd9a3'], bark: '#ddd6c6', kind: 'birch', dark: '#64854d' },
  tanne:   { c: ['#3f684c', '#51795c', '#648c6e', '#7a9e82'], bark: '#6b523f', kind: 'conifer', dark: '#31523b' },
  ahorn:   { c: ['#668752', '#7b9c65', '#90b079', '#a6c48d'], bark: '#7f5f48', kind: 'round', dark: '#4f6b3f' },
  kirsche: { c: ['#c28686', '#d39c9a', '#e2b2ad', '#efc9c2'], bark: '#86675a', kind: 'round', dark: '#a06a6a' },
  ulme:    { c: ['#5d7f57', '#719666', '#86ab7a', '#9cbf8e'], bark: '#6f5643', kind: 'round', dark: '#48613f' }
};

export const SPECIES_LIST = [
  { id: 'eiche', name: 'Eiche', need: 0 },
  { id: 'birke', name: 'Birke', need: 10 },
  { id: 'tanne', name: 'Tanne', need: 25 },
  { id: 'ahorn', name: 'Ahorn', need: 40 },
  { id: 'kirsche', name: 'Kirsche', need: 60 },
  { id: 'ulme', name: 'Ulme', need: 80 }
];

export function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function treeSVG(speciesId, stage, seed, cls, snow, meadowStage = 0) {
  const pal = SPECIES[speciesId] || SPECIES.eiche;
  const rnd = mulberry32((Number(seed) || 1) * 7919 + 13);
  const base = 132;
  const ground = '<ellipse cx="50" cy="' + (base + 1) + '" rx="' + (stage < 2 ? 11 : 23) + '" ry="4.5" fill="rgba(46,56,48,.10)"/>';
  let body = '';

  if (stage < 2) {
    const h = stage === 0 ? 10 : 26;
    body += '<path d="M50 ' + base + ' L50 ' + (base - h) + '" stroke="' + pal.c[1] + '" stroke-width="2.6" stroke-linecap="round" fill="none"/>';
    const leaves = stage === 0
      ? [[44, base - 6, -24], [56, base - 4, 24]]
      : [[42, base - 14, -30], [58, base - 18, 30], [45, base - 24, -18], [56, base - 22, 20]];
    leaves.forEach(function (l) {
      body += '<ellipse cx="' + l[0] + '" cy="' + l[1] + '" rx="7.5" ry="4.2" fill="' + pal.c[1] + '" transform="rotate(' + l[2] + ' ' + l[0] + ' ' + l[1] + ')"/>';
    });
    if (stage === 1) body += '<ellipse cx="50" cy="' + (base - 30) + '" rx="4.6" ry="7" fill="' + pal.c[2] + '"/>';
    if (snow) {
      body += '<ellipse cx="50" cy="' + (stage === 0 ? base - 8 : base - 36) + '" rx="5.2" ry="2" fill="#f6fbfe" opacity=".85"/>';
      if (stage === 1) body += '<ellipse cx="42" cy="' + (base - 15) + '" rx="4" ry="1.6" fill="#f6fbfe" opacity=".8"/>';
    }
  } else if (pal.kind === 'conifer') {
    const h = stage === 2 ? 34 : stage === 3 ? 48 : 62;
    body += '<path d="M48.6 ' + base + ' L49.6 ' + (base - h) + ' L50.4 ' + (base - h) + ' L51.4 ' + base + ' Z" fill="' + pal.bark + '"/>';
    const layers = stage === 2
      ? [[base - 24, base - 52, 16]]
      : stage === 3
        ? [[base - 22, base - 58, 20], [base - 42, base - 76, 15]]
        : [[base - 18, base - 56, 24], [base - 38, base - 78, 19], [base - 58, base - 100, 14]];
    layers.forEach(function (l, i) {
      body += '<path d="M' + (50 - l[2]) + ' ' + l[0] + ' Q50 ' + (l[0] + 6) + ' ' + (50 + l[2]) + ' ' + l[0] + ' L50 ' + l[1] + ' Z" fill="' + pal.c[Math.min(i, 3)] + '"/>';
    });
    if (snow) {
      layers.forEach(function (l) {
        body += '<path d="M' + (50 - l[2]) + ' ' + l[0] + ' Q50 ' + (l[0] + 6) + ' ' + (50 + l[2]) + ' ' + l[0] + '" fill="none" stroke="#f6fbfe" stroke-width="' + (l[2] > 15 ? 2.6 : 2.2) + '" stroke-linecap="round" opacity=".9"/>';
      });
    }
  } else if (pal.kind === 'birch') {
    const h = stage === 2 ? 38 : stage === 3 ? 52 : 66;
    const top = base - h;
    body += '<path d="M48.9 ' + base + ' C49.2 ' + (base - 16) + ' 49.3 ' + (top + 18) + ' 49.5 ' + (top + 3) + ' L50.5 ' + (top + 3) + ' C50.7 ' + (top + 18) + ' 50.8 ' + (base - 16) + ' 51.1 ' + base + ' Z" fill="' + pal.bark + '"/>';
    if (stage >= 3) {
      body += '<path d="M49.4 ' + (base - 14) + ' l2.4 -2" stroke="#9a927f" stroke-width="1.3" stroke-linecap="round"/>';
      body += '<path d="M49.5 ' + (base - 26) + ' l2.2 -1.8" stroke="#9a927f" stroke-width="1.3" stroke-linecap="round"/>';
    }
    const blobs = stage === 2
      ? [[50, top - 8, 13]]
      : stage === 3
        ? [[50, top - 12, 17], [39, top + 1, 11], [61, top + 1, 11]]
        : [[50, top - 16, 21], [36, top - 1, 14], [64, top - 1, 14], [43, top - 24, 13], [57, top - 24, 13]];
    blobs.forEach(function (b) {
      body += '<ellipse cx="' + (b[0] + 1.6).toFixed(1) + '" cy="' + (b[1] + 3).toFixed(1) + '" rx="' + b[2] + '" ry="' + (b[2] * 0.92).toFixed(1) + '" fill="' + pal.dark + '"/>';
    });
    blobs.forEach(function (b, i) {
      body += '<ellipse cx="' + b[0] + '" cy="' + b[1] + '" rx="' + b[2] + '" ry="' + (b[2] * 0.92).toFixed(1) + '" fill="' + pal.c[i % 4] + '"/>';
    });
    if (snow) {
      blobs.forEach(function (b) {
        body += '<ellipse cx="' + b[0] + '" cy="' + (b[1] - b[2] * 0.58).toFixed(1) + '" rx="' + (b[2] * 0.68).toFixed(1) + '" ry="' + (b[2] * 0.24).toFixed(1) + '" fill="#f6fbfe" opacity=".72"/>';
      });
    }
  } else {
    const h = stage === 2 ? 36 : stage === 3 ? 50 : 64;
    const top = base - h;
    body += '<path d="M47.9 ' + base + ' C48.2 ' + (base - 18) + ' 48.6 ' + (top + 16) + ' 49.4 ' + (top + 3) + ' L50.6 ' + (top + 3) + ' C51.4 ' + (top + 16) + ' 51.8 ' + (base - 18) + ' 52.1 ' + base + ' Z" fill="' + pal.bark + '"/>';
    if (stage >= 3) {
      body += '<path d="M50 ' + (base - 26) + ' C55 ' + (base - 30) + ' 58 ' + (base - 34) + ' 61 ' + (base - 38) + '" stroke="' + pal.bark + '" stroke-width="2" stroke-linecap="round" fill="none"/>';
      body += '<path d="M50 ' + (base - 20) + ' C45 ' + (base - 24) + ' 42 ' + (base - 28) + ' 39 ' + (base - 31) + '" stroke="' + pal.bark + '" stroke-width="2" stroke-linecap="round" fill="none"/>';
    }
    const blobs = stage === 2
      ? [[50, top - 8, 14]]
      : stage === 3
        ? [[50, top - 12, 18], [38, top + 1, 12], [62, top + 1, 12], [50, top - 26, 12]]
        : [[50, top - 14, 23], [34, top + 2, 15], [66, top + 2, 15], [42, top - 26, 14], [58, top - 26, 14], [50, top + 6, 14]];
    blobs.forEach(function (b) {
      body += '<ellipse cx="' + (b[0] + 1.8).toFixed(1) + '" cy="' + (b[1] + 3.4).toFixed(1) + '" rx="' + b[2].toFixed(1) + '" ry="' + (b[2] * 0.9).toFixed(1) + '" fill="' + pal.dark + '"/>';
    });
    blobs.forEach(function (b, i) {
      const jx = (rnd() - 0.5) * 2.2;
      const jy = (rnd() - 0.5) * 2.2;
      body += '<ellipse cx="' + (b[0] + jx).toFixed(1) + '" cy="' + (b[1] + jy).toFixed(1) + '" rx="' + b[2].toFixed(1) + '" ry="' + (b[2] * 0.9).toFixed(1) + '" fill="' + pal.c[i % 4] + '"/>';
    });
    if (snow) {
      blobs.forEach(function (b) {
        body += '<ellipse cx="' + b[0] + '" cy="' + (b[1] - b[2] * 0.6).toFixed(1) + '" rx="' + (b[2] * 0.7).toFixed(1) + '" ry="' + (b[2] * 0.24).toFixed(1) + '" fill="#f6fbfe" opacity=".72"/>';
      });
    }
    if (stage >= 3) {
      body += '<ellipse cx="44" cy="' + (top - 30) + '" rx="6" ry="5" fill="' + pal.c[3] + '" opacity=".7"/>';
      body += '<ellipse cx="58" cy="' + (top - 34) + '" rx="5" ry="4.5" fill="' + pal.c[3] + '" opacity=".6"/>';
    }
  }

  let meadow = '';
  const ms = Math.max(0, Math.min(4, Number(meadowStage) || 0));
  if (ms > 0) {
    if (ms >= 1) {
      meadow += '<path d="M28 132 C32 125 35 125 39 132" fill="#7da462" opacity=".95"/>';
      meadow += '<path d="M61 132 C65 125 68 125 72 132" fill="#7da462" opacity=".95"/>';
      meadow += '<path d="M38 132 C41 127 44 127 47 132" fill="#90b36f" opacity=".9"/>';
      meadow += '<path d="M53 132 C56 127 59 127 62 132" fill="#90b36f" opacity=".9"/>';
    }
    if (ms >= 2) {
      meadow += '<path d="M20 132 C24 124 28 124 32 132" fill="#739a5a" opacity=".95"/>';
      meadow += '<path d="M68 132 C72 124 76 124 80 132" fill="#739a5a" opacity=".95"/>';
      meadow += '<g><path d="M24 132 L24 126.2" stroke="#648b52" stroke-width="1.2" stroke-linecap="round"/><circle cx="24" cy="124.8" r="2" fill="#f2cf6e"/><circle cx="24" cy="124.8" r=".75" fill="#fff6cf"/></g>';
      meadow += '<g><path d="M76 132 L76 126.2" stroke="#648b52" stroke-width="1.2" stroke-linecap="round"/><circle cx="76" cy="124.8" r="2" fill="#e8a9be"/><circle cx="76" cy="124.8" r=".75" fill="#fff3f7"/></g>';
    }
    if (ms >= 3) {
      meadow += '<path d="M14 132 C19 123 23 123 28 132" fill="#6f9558" opacity=".95"/>';
      meadow += '<path d="M72 132 C77 123 81 123 86 132" fill="#6f9558" opacity=".95"/>';
      meadow += '<g><path d="M33 132 L33 125.8" stroke="#5f864f" stroke-width="1.1" stroke-linecap="round"/><circle cx="33" cy="124.4" r="1.8" fill="#ffffff"/><circle cx="33" cy="124.4" r=".7" fill="#ffe889"/></g>';
      meadow += '<g><path d="M67 132 L67 125.8" stroke="#5f864f" stroke-width="1.1" stroke-linecap="round"/><circle cx="67" cy="124.4" r="1.8" fill="#b9d7ff"/><circle cx="67" cy="124.4" r=".7" fill="#fff9d2"/></g>';
    }
    if (ms >= 4) {
      meadow = '<ellipse cx="50" cy="132.5" rx="34" ry="4.8" fill="#8fb46a" opacity=".32"/>' + meadow;
      meadow += '<path d="M44 132 C46 126.5 48 126.5 50 132" fill="#97bb76" opacity=".95"/>';
      meadow += '<path d="M50 132 C52 126.5 54 126.5 56 132" fill="#97bb76" opacity=".95"/>';
      meadow += '<g><path d="M17 132 L17 124.5" stroke="#5f864f" stroke-width="1.2" stroke-linecap="round"/><circle cx="17" cy="123" r="2.1" fill="#f4d275"/><circle cx="17" cy="123" r=".8" fill="#fff8d8"/></g>';
      meadow += '<g><path d="M41 132 L41 126.2" stroke="#5f864f" stroke-width="1.1" stroke-linecap="round"/><circle cx="41" cy="124.8" r="1.7" fill="#f0a8c0"/><circle cx="41" cy="124.8" r=".65" fill="#fff1f6"/></g>';
      meadow += '<g><path d="M59 132 L59 126.2" stroke="#5f864f" stroke-width="1.1" stroke-linecap="round"/><circle cx="59" cy="124.8" r="1.7" fill="#f4d275"/><circle cx="59" cy="124.8" r=".65" fill="#fff8d8"/></g>';
      meadow += '<g><path d="M83 132 L83 124.5" stroke="#5f864f" stroke-width="1.2" stroke-linecap="round"/><circle cx="83" cy="123" r="2.1" fill="#b9d7ff"/><circle cx="83" cy="123" r=".8" fill="#fff9d2"/></g>';
    }
  }

  return '<svg class="' + (cls || '') + '" viewBox="0 0 100 140" aria-hidden="true">' + ground + body + meadow + '</svg>';
}

// Größe im Wald richtet sich nach der tatsächlichen Lernzeit.
export function stageForMinutes(minutes) {
  if (minutes >= 60) return 4;
  if (minutes >= 30) return 3;
  if (minutes >= 15) return 2;
  return 1;
}

export function meadowStageForMinutes(minutes) {
  if (minutes >= 120) return 4;
  if (minutes >= 105) return 3;
  if (minutes >= 90) return 2;
  if (minutes >= 75) return 1;
  return 0;
}

export function heightForMinutes(minutes) {
  const clamped = Math.max(1, Math.min(60, minutes));
  return Math.round(38 + (clamped / 60) * 52);
}

export function stageForProgress(progress) {
  if (progress < 0.25) return 1;
  if (progress < 0.5) return 2;
  if (progress < 0.75) return 3;
  return 4;
}
