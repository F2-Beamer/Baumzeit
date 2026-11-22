// Session-Ende-Ton: Klangschale als Audiodatei.
const zenToneUrl = new URL('../assets/alex_jauk-zen-tone-high-202554.mp3', import.meta.url).href;

let audio = null;

function getAudio() {
  if (audio) return audio;
  if (typeof Audio === 'undefined') return null;
  audio = new Audio(zenToneUrl);
  audio.preload = 'auto';
  audio.volume = 0.85;
  return audio;
}

// Audio darf erst nach einer Nutzerinteraktion zuverlässig gestartet werden.
export function initAudio() {
  const a = getAudio();
  if (!a) return;
  // Leise vorbereiten, damit der erste Ton nicht blockiert.
  a.load();
}

export function playBell() {
  const a = getAudio();
  if (!a) return;
  try {
    a.currentTime = 0;
    const playPromise = a.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  } catch {
    // Ton ist optional; Fehler nicht an die Oberfläche bringen.
  }
}
