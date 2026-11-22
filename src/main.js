import './styles.css';
import { App } from './app.js';

const params = new URLSearchParams(window.location.search);
const isMini = params.get('view') === 'mini';

const mainView = document.getElementById('view-main');
const miniView = document.getElementById('view-mini');
if (isMini) {
  document.body.classList.add('is-mini');
  if (mainView) mainView.classList.add('hidden');
  if (miniView) miniView.classList.remove('hidden');
}

const app = new App({ mini: isMini });
app.init().catch((err) => {
  console.error('Baumzeit konnte nicht gestartet werden', err);
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = 'Fehler beim Starten: ' + (err && err.message ? err.message : err);
    toast.classList.add('show');
  }
});
