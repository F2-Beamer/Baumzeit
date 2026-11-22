// Dezenter Glockenton über WebAudio – keine Audiodateien nötig.

let ctx = null;

function ensureContext() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

// AudioContext darf erst nach einer Nutzerinteraktion gestartet werden.
export function initAudio() {
  const context = ensureContext();
  if (context && context.state === 'suspended') {
    context.resume().catch(() => {});
  }
}

export function playBell() {
  const context = ensureContext();
  if (!context) return;
  if (context.state === 'suspended') {
    context.resume().catch(() => {});
  }
  const now = context.currentTime;
  const partials = [
    { freq: 880, gain: 0.16, decay: 2.2 },
    { freq: 1320, gain: 0.08, decay: 1.8 },
    { freq: 1760, gain: 0.04, decay: 1.4 }
  ];
  for (const p of partials) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.value = p.freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(p.gain, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);
    osc.connect(gain).connect(context.destination);
    osc.start(now);
    osc.stop(now + p.decay + 0.1);
  }
}
