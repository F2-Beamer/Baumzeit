// Persistenz: in Tauri über Rust-Commands, im Browser als localStorage-Fallback.
import { invoke } from '@tauri-apps/api/core';

export const hasTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const FALLBACK_KEY = 'baumzeit-state';
const FALLBACK_PATH = '%APPDATA%\\Baumzeit\\wald.json';

export async function loadState() {
  if (hasTauri) {
    try {
      const raw = await invoke('load_state');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.error('Zustand konnte nicht geladen werden', err);
      return null;
    }
  }
  try {
    const raw = window.localStorage.getItem(FALLBACK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveState(state) {
  const payload = JSON.stringify(state);
  if (hasTauri) {
    await invoke('save_state', { state: payload });
    return;
  }
  window.localStorage.setItem(FALLBACK_KEY, payload);
}

export async function getDataPath() {
  if (hasTauri) {
    try {
      return await invoke('data_path');
    } catch {
      return FALLBACK_PATH;
    }
  }
  return FALLBACK_PATH;
}

export async function openDataFolder() {
  if (!hasTauri) return false;
  await invoke('open_data_folder');
  return true;
}
