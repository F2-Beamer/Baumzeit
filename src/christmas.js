// Weihnachtszeit im Wald: Datumsfenster und der geschmückte Christbaum.
// Reine Funktionen ohne DOM – App, Tests und Vorschau nutzen dieselbe Quelle.

export const CHRISTMAS_FROM = 1;
export const CHRISTMAS_TO = 26;
export const CHRISTMAS_FULL_DAY = 24;
export const ORNAMENT_SLOTS = 24;

const CX = 100;

// Sechs Zweigetagen von unten (breit, dunkel) nach oben (schmal, hell).
const LAYERS = [
  { top: 178, hem: 276, half: 76, fill: '#2c5a42', shade: '#234a35' },
  { top: 148, hem: 244, half: 64, fill: '#316247', shade: '#274f39' },
  { top: 120, hem: 212, half: 54, fill: '#36684c', shade: '#2b533c' },
  { top: 92, hem: 180, half: 43, fill: '#3b6e51', shade: '#305740' },
  { top: 66, hem: 148, half: 32, fill: '#407455', shade: '#345a43' },
  { top: 42, hem: 116, half: 22, fill: '#457a5a', shade: '#386046' }
];

const BALL_COLORS = ['#c14b3f', '#d8a53c', '#3f7f63', '#3f6390'];

/**
 * Liefert den Stand der Weihnachtszeit für ein Datum.
 * Aktiv vom 1. bis 26. Dezember, Kugeln/Kerzen = Tag des Monats (max. 24),
 * Stern ab dem 24. Dezember.
 */
export function christmasState(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const valid = Number.isFinite(d.getTime());
  const day = valid ? d.getDate() : 0;
  const month = valid ? d.getMonth() : -1;
  const active = month === 11 && day >= CHRISTMAS_FROM && day <= CHRISTMAS_TO;
  const ornaments = active ? Math.min(day, CHRISTMAS_FULL_DAY) : 0;
  // Abwechselnd: 1. Dezember Kerze, 2. Dezember Kugel, 3. Dezember Kerze …
  const candles = Math.ceil(ornaments / 2);
  const balls = Math.floor(ornaments / 2);
  return {
    active,
    day: active ? day : 0,
    ornaments,
    candles,
    balls,
    star: active && day >= CHRISTMAS_FULL_DAY,
    start: active ? new Date(d.getFullYear(), 11, CHRISTMAS_FROM) : null,
    end: active ? new Date(d.getFullYear(), 11, CHRISTMAS_TO) : null
  };
}

function layerPath(layer) {
  const left = CX - layer.half;
  const right = CX + layer.half;
  const hemY = layer.hem + 9;
  return `M${CX} ${layer.top} L${left} ${layer.hem} `
    + `Q${((left + CX) / 2).toFixed(1)} ${hemY} ${CX} ${layer.hem + 2} `
    + `Q${((right + CX) / 2).toFixed(1)} ${hemY} ${right} ${layer.hem} Z`;
}

function hemPath(layer) {
  const left = CX - layer.half;
  const right = CX + layer.half;
  const hemY = layer.hem + 9;
  return `M${left} ${layer.hem} Q${((left + CX) / 2).toFixed(1)} ${hemY} ${CX} ${layer.hem + 2} `
    + `Q${((right + CX) / 2).toFixed(1)} ${hemY} ${right} ${layer.hem}`;
}

function starPoints(cx, cy, outer, inner, spikes = 5) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / spikes;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return pts.join(' ');
}

/**
 * 24 feste Plätze, strikt abwechselnd: ungerade Tage Kerze, gerade Tage Kugel.
 * Pro Etage: links Kerze, links Kugel, rechts Kerze, rechts Kugel.
 * Tag 1 füllt den untersten Platz (Kerze), Tag 24 den obersten (Kugel).
 */
export function ornamentSlots() {
  const slots = [];
  LAYERS.forEach((layer, layerIndex) => {
    const y = layer.hem - 4;
    const width = layer.half * (1 - 6 / (layer.hem - layer.top));
    const inner = 0.44 * width;
    const outer = 0.8 * width;
    slots.push(
      { type: 'candle', layer: layerIndex, x: CX - outer, y },
      { type: 'ball', layer: layerIndex, x: CX - inner, y: y + 0.5, color: 0 },
      { type: 'candle', layer: layerIndex, x: CX + outer, y },
      { type: 'ball', layer: layerIndex, x: CX + inner, y: y + 0.5, color: 1 }
    );
  });
  return slots;
}

function candleSVG(x, y, delay) {
  return `<g class="bz-candle">`
    + `<circle class="bz-glare" cx="${x.toFixed(1)}" cy="${(y - 12.5).toFixed(1)}" r="5.6" fill="#ffc46b" opacity=".42" style="animation-delay:${delay}s"/>`
    + `<rect x="${(x - 2).toFixed(1)}" y="${(y - 9).toFixed(1)}" width="4" height="9" rx="1" fill="#f8efdd"/>`
    + `<rect x="${(x - 2).toFixed(1)}" y="${(y - 9).toFixed(1)}" width="4" height="1.7" rx=".85" fill="#e9dcc2"/>`
    + `<ellipse class="bz-flame" cx="${x.toFixed(1)}" cy="${(y - 12.4).toFixed(1)}" rx="1.9" ry="3.4" fill="#ffbe55" style="animation-delay:${delay}s"/>`
    + `<ellipse cx="${x.toFixed(1)}" cy="${(y - 11.5).toFixed(1)}" rx=".8" ry="1.7" fill="#fff6da"/>`
    + `</g>`;
}

function ballSVG(x, y, colorIndex) {
  const fill = BALL_COLORS[colorIndex % BALL_COLORS.length];
  return `<g class="bz-ball">`
    + `<rect x="${(x - 0.9).toFixed(1)}" y="${(y - 5.6).toFixed(1)}" width="1.8" height="2.2" rx=".6" fill="#d9c9a5"/>`
    + `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.4" fill="${fill}"/>`
    + `<ellipse cx="${(x - 1.4).toFixed(1)}" cy="${(y - 1.5).toFixed(1)}" rx="1.5" ry="1.2" fill="#ffffff" opacity=".55"/>`
    + `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.4" fill="none" stroke="rgba(20,35,25,.18)" stroke-width=".5"/>`
    + `</g>`;
}

/**
 * SVG des Christbaums (viewBox 0 0 200 300, Bodenlinie y = 286).
 * @param {{ornaments?: number, star?: boolean, snow?: boolean, cls?: string}} opts
 */
export function christmasTreeSVG(opts = {}) {
  const count = Math.max(0, Math.min(ORNAMENT_SLOTS, Math.round(Number(opts.ornaments) || 0)));
  const showStar = opts.star === undefined ? count >= CHRISTMAS_FULL_DAY : !!opts.star;
  const snow = opts.snow !== false;

  const trunk = '<rect x="93" y="248" width="14" height="42" rx="3" fill="#6b4a35"/>'
    + '<rect x="93" y="248" width="5" height="42" fill="#7d5940" opacity=".7"/>';

  const layers = LAYERS.map((layer) => (
    `<path d="${layerPath(layer)}" fill="${layer.shade}" transform="translate(3 4)"/>`
    + `<path d="${layerPath(layer)}" fill="${layer.fill}"/>`
  )).join('');

  const snowHems = snow
    ? LAYERS.map((layer) => (
      `<path d="${hemPath(layer)}" fill="none" stroke="#eef7fd" stroke-width="2.2" stroke-linecap="round" opacity=".78"/>`
    )).join('')
    : '';

  const slots = ornamentSlots();
  const ornaments = slots.slice(0, count).map((slot, i) => (
    slot.type === 'ball'
      ? ballSVG(slot.x, slot.y, (slot.color + slot.layer) % BALL_COLORS.length)
      : candleSVG(slot.x, slot.y, Number(((i * 0.41) % 2.6).toFixed(2)))
  )).join('');

  const star = showStar
    ? `<g class="bz-star">`
      + '<circle cx="100" cy="30" r="21" fill="#ffe3a3" opacity=".12"/>'
      + '<circle cx="100" cy="30" r="15" fill="#ffe3a3" opacity=".16"/>'
      + '<circle cx="100" cy="30" r="10" fill="#ffe9b8" opacity=".2"/>'
      + `<polygon points="${starPoints(100, 30, 15, 6.2)}" fill="#f2c14e" stroke="#d9a12f" stroke-width=".7" stroke-linejoin="round"/>`
      + `<polygon points="${starPoints(100, 30, 9.4, 3.9)}" fill="#ffe9a8" opacity=".9"/>`
      + '</g>'
    : '';

  return `<svg class="${opts.cls || ''}" viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + '<style>'
    + '.bz-flame{transform-box:fill-box;transform-origin:50% 100%;animation:bzFlicker 2.6s ease-in-out infinite}'
    + '.bz-glare{animation:bzGlare 2.6s ease-in-out infinite}'
    + '@keyframes bzFlicker{0%,100%{opacity:.92;transform:scale(1,1)}50%{opacity:1;transform:scale(.94,1.07)}}'
    + '@keyframes bzGlare{0%,100%{opacity:.36}50%{opacity:.58}}'
    + '@media (prefers-reduced-motion: reduce){.bz-flame,.bz-glare{animation:none}}'
    + '</style>'
    + `<ellipse cx="100" cy="284" rx="66" ry="8" fill="rgba(30,50,40,.13)"/>`
    + `<ellipse cx="100" cy="286" rx="74" ry="6.5" fill="#f2f8fc" opacity=".9"/>`
    + trunk
    + layers
    + snowHems
    + ornaments
    + star
    + '</svg>';
}
