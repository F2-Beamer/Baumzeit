// Klangschalen-Ton über WebAudio – keine Audiodateien nötig.

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
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.9, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);
  master.connect(context.destination);

  // Klangschale: Grundton, Obertöne und leichte Schwebung.
  const partials = [
    { freq: 262, gain: 0.34, decay: 5.2, type: 'sine' },
    { freq: 524, gain: 0.16, decay: 4.4, type: 'sine' },
    { freq: 786, gain: 0.08, decay: 3.4, type: 'sine' },
    { freq: 1048, gain: 0.045, decay: 2.8, type: 'sine' },
    { freq: 265.5, gain: 0.05, decay: 4.8, type: 'sine' } // leichte Schwebung
  ];

  for (const p of partials) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = p.type;
    osc.frequency.setValueAtTime(p.freq, now);
    // Sanfter Anschlag: minimaler Pitch-Fall wie bei einer echten Schale.
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, p.freq * 0.998), now + 1.5);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(p.gain, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + p.decay + 0.1);
  }
}
