import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import {
  SPECIES, SPECIES_LIST, treeSVG, stageForMinutes, stageForProgress
} from './trees.js';
import { forestSceneHTML } from './forest.js';
import {
  computeStats, groupSessionsByDay, formatDayHeading, formatDateShort,
  weekdayShort, formatMinutes, formatHours
} from './stats.js';
import * as storage from './storage.js';
import { playBell, initAudio } from './sound.js';

const hasTauri = storage.hasTauri;

const PLAY_ICON = '<svg viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M4 2.2v9.6c0 .6.7 1 1.2.7l7-4.8c.4-.3.4-.9 0-1.2l-7-4.8c-.5-.3-1.2.1-1.2.7Z"/></svg>';
const PAUSE_ICON = '<svg viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><rect x="3" y="2" width="3" height="10" rx="1"/><rect x="8" y="2" width="3" height="10" rx="1"/></svg>';
const SUN_ICON = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="3.1"/><path d="M8 1.4v1.6M8 13v1.6M1.4 8h1.6M13 8h1.6M3.3 3.3l1.1 1.1M11.6 11.6l1.1 1.1M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1"/></svg>';
const MOON_ICON = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5 5.8 5.8 0 1 0 13.5 9.6Z"/></svg>';
const LOCK_ICON = '<svg class="lock" viewBox="0 0 10 12" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><rect x="1.6" y="5" width="6.8" height="5.6" rx="1.4"/><path d="M3.2 5V3.4a1.8 1.8 0 0 1 3.6 0V5"/></svg>';

function uid() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* ignorieren */ }
  return 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

function clampInt(value, min, max, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function fmtClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function treeHTML(species, stage, seed, height, cls = '') {
  return treeSVG(species, stage, seed, cls)
    .replace('<svg', `<svg style="height:${Math.round(height)}px;width:auto"`);
}

// Voll ausgewachsener Baum (50 Min) füllt die Verlaufshöhe; andere proportional.
function historyTreeHeight(minutes) {
  const clamped = Math.max(1, Math.min(50, Number(minutes) || 1));
  return Math.round(28 + (clamped / 50) * 76);
}

function stageLabel(minutes) {
  const stage = stageForMinutes(minutes);
  return ['Setzling', 'Kleiner Baum', 'Wachsender Baum', 'Voll ausgewachsen'][stage - 1] || 'Setzling';
}

function formatDurationDE(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  const parts = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? 'Stunde' : 'Stunden'}`);
  if (m > 0) parts.push(`${m} ${m === 1 ? 'Minute' : 'Minuten'}`);
  return parts.join(' ') || '0 Minuten';
}

function formatDateTimeDE(value) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '–';
  const date = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time} Uhr`;
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHTML(value);
}

// Lokaler Kalendertag als Schlüssel – für den Wechsel der Weihnachtszeit um Mitternacht.
function localDayKey(d = new Date()) {
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function defaultState() {
  return {
    version: 1,
    settings: {
      mode: 'pomodoro',
      workMinutes: 25,
      breakMinutes: 5,
      theme: 'system',
      sound: true,
      autostart: false,
      closeToTray: true,
      miniAlwaysOnTop: true,
      species: 'eiche',
      christmas: true
    },
    sessions: [],
    unlockedSpecies: ['eiche'],
    active: null
  };
}

function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const minutes = Math.round(Number(raw.minutes));
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  const endedAt = new Date(raw.endedAt);
  if (!Number.isFinite(endedAt.getTime())) return null;
  const startedRaw = new Date(raw.startedAt || raw.endedAt);
  const startedAt = Number.isFinite(startedRaw.getTime()) ? startedRaw : endedAt;
  return {
    id: String(raw.id || uid()),
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    minutes,
    species: SPECIES[raw.species] ? raw.species : 'eiche',
    seed: Number(raw.seed) || 1,
    stage: stageForMinutes(minutes),
    completed: raw.completed === true
  };
}

export function normalizeState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;

  const s = Object.assign({}, base.settings, (raw.settings && typeof raw.settings === 'object') ? raw.settings : {});
  s.mode = s.mode === 'frei' ? 'frei' : 'pomodoro';
  s.workMinutes = clampInt(s.workMinutes, 1, 180, 25);
  s.breakMinutes = clampInt(s.breakMinutes, 1, 60, 5);
  s.theme = ['light', 'dark', 'system'].includes(s.theme) ? s.theme : 'system';
  s.sound = s.sound !== false;
  s.autostart = s.autostart === true;
  s.closeToTray = s.closeToTray !== false;
  s.miniAlwaysOnTop = s.miniAlwaysOnTop !== false;
  s.species = SPECIES[s.species] ? s.species : 'eiche';
  s.christmas = s.christmas !== false;

  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions.map(normalizeSession).filter(Boolean)
    : [];
  const totalMinutes = sessions.reduce((sum, x) => sum + x.minutes, 0);
  const unlocked = SPECIES_LIST.filter((sp) => totalMinutes >= sp.need * 60).map((sp) => sp.id);
  if (!unlocked.includes(s.species)) s.species = unlocked[0] || 'eiche';

  let active = null;
  const a = raw.active;
  if (a && typeof a === 'object' && a.phase && a.startedAt != null && a.targetMs != null) {
    const startedAt = Number(a.startedAt);
    const targetMs = Number(a.targetMs);
    if (Number.isFinite(startedAt) && Number.isFinite(targetMs) && targetMs > 0 && (a.phase === 'focus' || a.phase === 'break')) {
      active = {
        id: String(a.id || uid()),
        startedAt,
        targetMs,
        phase: a.phase,
        mode: a.mode === 'frei' ? 'frei' : 'pomodoro',
        pausedAt: (a.pausedAt != null && Number.isFinite(Number(a.pausedAt))) ? Number(a.pausedAt) : null,
        pausedTotalMs: Math.max(0, Number(a.pausedTotalMs) || 0),
        species: SPECIES[a.species] ? a.species : 'eiche',
        seed: Number(a.seed) || 1
      };
    }
  }

  return { version: 1, settings: s, sessions, unlockedSpecies: unlocked, active };
}

export class App {
  constructor({ mini = false } = {}) {
    this.mini = mini;
    this.state = defaultState();
    this.els = new Map();
    this.lastTreeKey = null;
    this.lastBroadcastAt = 0;
    this.snapshot = null;
    this.snapshotAt = 0;
    this.miniTreeKey = null;
    this.miniIconKey = null;
    this.pauseIconKey = null;
    this.confirmEnd = false;
    this.confirmTimer = null;
    this.toastTimer = null;
    this.saveChain = Promise.resolve();
    this.mqBound = false;
    this.lastWaldDay = null;
  }

  $(id) {
    if (!this.els.has(id)) this.els.set(id, document.getElementById(id));
    return this.els.get(id);
  }

  async init() {
    const loaded = await storage.loadState();
    this.state = normalizeState(loaded);
    if (this.mini) {
      this.initMini();
      return;
    }
    this.applyTheme();
    this.bindUI();
    this.bindTauriEvents();
    this.requestNotificationPermission();
    this.loadDataPath();
    this.loadVersion();
    this.call('set_close_to_tray', { enabled: this.state.settings.closeToTray });
    this.call('set_mini_always_on_top', { enabled: this.state.settings.miniAlwaysOnTop });
    this.syncAutostart();
    this.restoreActive();
    this.renderAll();
    this.startTicker();
    this.broadcast();

    document.addEventListener('pointerdown', () => initAudio(), { once: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.broadcast();
    });
  }

  // ---------- Timer-Logik ----------

  plannedMs(phase = 'focus') {
    const s = this.state.settings;
    return (phase === 'break' ? s.breakMinutes : s.workMinutes) * 60000;
  }

  elapsedMs(active, now = Date.now()) {
    const end = active.pausedAt != null ? active.pausedAt : now;
    return Math.max(0, end - active.startedAt - (active.pausedTotalMs || 0));
  }

  currentSpecies() {
    const unlocked = this.state.unlockedSpecies || [];
    return unlocked.includes(this.state.settings.species) ? this.state.settings.species : (unlocked[0] || 'eiche');
  }

  startFocus() {
    if (this.state.active) return;
    const now = Date.now();
    this.state.active = {
      id: uid(),
      startedAt: now,
      targetMs: this.plannedMs('focus'),
      phase: 'focus',
      mode: this.state.settings.mode,
      pausedAt: null,
      pausedTotalMs: 0,
      species: this.currentSpecies(),
      seed: Math.floor(Math.random() * 1000000) + 1
    };
    this.confirmEnd = false;
    this.lastTreeKey = null;
    this.save();
    this.renderAll();
    this.broadcast();
  }

  startBreak(species, seed) {
    this.state.active = {
      id: uid(),
      startedAt: Date.now(),
      targetMs: this.plannedMs('break'),
      phase: 'break',
      mode: 'pomodoro',
      pausedAt: null,
      pausedTotalMs: 0,
      species: species || this.currentSpecies(),
      seed: seed || 1
    };
    this.confirmEnd = false;
    this.lastTreeKey = null;
  }

  togglePauseOrStart() {
    const a = this.state.active;
    if (!a) {
      this.startFocus();
      return;
    }
    const now = Date.now();
    if (a.pausedAt != null) {
      a.pausedTotalMs += now - a.pausedAt;
      a.pausedAt = null;
    } else {
      a.pausedAt = now;
    }
    this.save();
    this.renderAll();
    this.broadcast();
  }

  handleEndClick() {
    const a = this.state.active;
    if (!a) return;
    if (!this.confirmEnd) {
      this.confirmEnd = true;
      this.renderTimer();
      clearTimeout(this.confirmTimer);
      this.confirmTimer = setTimeout(() => {
        this.confirmEnd = false;
        this.renderTimer();
      }, 4000);
      return;
    }
    this.confirmEnd = false;
    clearTimeout(this.confirmTimer);
    this.completeSession({ auto: false });
  }

  completeSession({ auto = false, restore = false } = {}) {
    const a = this.state.active;
    if (!a) return;
    const now = Date.now();
    const elapsed = this.elapsedMs(a, now);

    // Sehr kurze, manuell beendete Sessions pflanzen nichts.
    if (!auto && a.phase === 'focus' && elapsed < 5000) {
      this.state.active = null;
      this.confirmEnd = false;
      this.lastTreeKey = null;
      this.save();
      this.renderAll();
      this.broadcast();
      this.showToast('Session beendet – kein Baum gepflanzt.');
      return;
    }

    if (a.phase === 'focus') {
      const minutes = auto ? Math.max(1, Math.round(a.targetMs / 60000)) : Math.max(1, Math.round(elapsed / 60000));
      const completed = auto || elapsed >= a.targetMs - 1000;
      this.plantTree({
        minutes,
        species: a.species,
        seed: a.seed,
        completed,
        startedAt: a.startedAt,
        endedAt: now
      });
      this.state.active = null;
      this.confirmEnd = false;

      const pomodoro = this.state.settings.mode === 'pomodoro' && a.mode === 'pomodoro';
      if (pomodoro && !restore) {
        this.startBreak(a.species, a.seed);
        this.showToast(`Baum gepflanzt · ${formatMinutes(minutes)}. Pause startet.`, true);
        this.notify('Baum gepflanzt', `${formatMinutes(minutes)} gelernt. Zeit für eine Pause.`);
      } else {
        this.showToast(`Baum gepflanzt · ${formatMinutes(minutes)}.`, true);
        this.notify('Baum gepflanzt', `Du hast ${formatMinutes(minutes)} gelernt.`);
      }
    } else {
      this.state.active = null;
      this.confirmEnd = false;
      this.showToast('Pause vorbei – bereit für die nächste Session.', true);
      this.notify('Pause vorbei', 'Bereit für die nächste Lern-Session.');
    }

    this.lastTreeKey = null;
    this.save();
    this.renderAll();
    this.broadcast();
  }

  plantTree({ minutes, species, seed, completed, startedAt, endedAt }) {
    this.state.sessions.push({
      id: uid(),
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
      minutes,
      species: SPECIES[species] ? species : 'eiche',
      seed: Number(seed) || 1,
      stage: stageForMinutes(minutes),
      completed
    });
    this.syncUnlocks();
  }

  syncUnlocks() {
    const totalMinutes = this.state.sessions.reduce((sum, s) => sum + s.minutes, 0);
    const unlocked = SPECIES_LIST.filter((sp) => totalMinutes >= sp.need * 60).map((sp) => sp.id);
    this.state.unlockedSpecies = unlocked;
    if (!unlocked.includes(this.state.settings.species)) {
      this.state.settings.species = unlocked[0] || 'eiche';
    }
  }

  restoreActive() {
    const a = this.state.active;
    if (!a || a.pausedAt != null) return;
    if (this.elapsedMs(a) >= a.targetMs) {
      this.completeSession({ auto: true, restore: true });
    }
  }

  startTicker() {
    setInterval(() => this.tick(), 250);
  }

  tick() {
    const now = Date.now();
    // Mitternacht: Weihnachtszeit kann beginnen, weiterlaufen oder enden.
    const dayKey = localDayKey();
    if (dayKey !== this.lastWaldDay) {
      this.lastWaldDay = dayKey;
      if (this.$('waldDays')) this.renderWald();
    }
    const a = this.state.active;
    if (a) {
      if (a.pausedAt == null && this.elapsedMs(a, now) >= a.targetMs) {
        this.completeSession({ auto: true });
        return;
      }
      this.renderTimer(now);
    }
    if (now - this.lastBroadcastAt >= 1000) {
      this.lastBroadcastAt = now;
      this.broadcast();
    }
  }

  // ---------- Hauptfenster-Rendering ----------

  renderAll() {
    this.renderTimer();
    this.renderToday();
    this.renderRecent();
    this.renderWald();
    this.renderStats();
    this.renderSettings();
  }

  renderTimer(now = Date.now()) {
    const a = this.state.active;
    const s = this.state.settings;
    const target = a ? a.targetMs : this.plannedMs('focus');
    const elapsed = a ? this.elapsedMs(a, now) : 0;
    const remaining = Math.max(0, target - elapsed);
    const progress = a ? Math.min(elapsed / target, 1) : 0;

    const time = this.$('mainTime');
    if (time) time.textContent = fmtClock(remaining);

    const bar = this.$('mainBar');
    if (bar) bar.style.width = (progress * 100).toFixed(1) + '%';
    const pct = this.$('mainPct');
    if (pct) pct.textContent = Math.round(progress * 100) + ' %';

    const totalMin = Math.max(1, Math.round(target / 60000));
    const elapsedMin = Math.min(totalMin, Math.floor(elapsed / 60000));
    const elapsedEl = this.$('mainElapsed');
    if (elapsedEl) elapsedEl.textContent = `${elapsedMin} von ${totalMin} Min`;

    let label;
    if (!a) {
      label = s.mode === 'pomodoro' ? 'bereit · Pomodoro' : 'bereit · Freier Timer';
    } else if (a.phase === 'break') {
      label = a.pausedAt != null ? 'pausiert · Pause' : 'Pause';
    } else {
      label = (a.pausedAt != null ? 'pausiert' : 'verbleibend') + (a.mode === 'pomodoro' ? ' · Fokus' : ' · Freie Session');
    }
    const labelEl = this.$('mainTimeLabel');
    if (labelEl) labelEl.textContent = label;

    // Baum
    const species = a ? a.species : this.currentSpecies();
    const seed = a ? a.seed : 7;
    const stage = a ? (a.phase === 'break' ? 4 : stageForProgress(progress)) : 3;
    const key = `${species}|${stage}|${seed}`;
    if (key !== this.lastTreeKey) {
      this.lastTreeKey = key;
      const host = this.$('bigTree');
      if (host) {
        host.innerHTML = treeSVG(species, stage, seed, 'sway');
        const svg = host.querySelector('svg');
        if (svg) {
          svg.style.height = '224px';
          svg.style.width = 'auto';
        }
        host.classList.remove('grow-in');
        void host.offsetWidth;
        host.classList.add('grow-in');
      }
    }

    // Buttons
    let pauseLabel = 'Session starten';
    let icon = PLAY_ICON;
    if (a) {
      if (a.pausedAt != null) {
        pauseLabel = 'Weiter';
      } else {
        pauseLabel = 'Pause';
        icon = PAUSE_ICON;
      }
    }
    const iconKey = icon === PLAY_ICON ? 'play' : 'pause';
    if (iconKey !== this.pauseIconKey) {
      this.pauseIconKey = iconKey;
      const iconEl = this.$('pauseIcon');
      if (iconEl) iconEl.innerHTML = icon;
    }
    const pauseLabelEl = this.$('pauseLabel');
    if (pauseLabelEl) pauseLabelEl.textContent = pauseLabel;

    const endBtn = this.$('endBtn');
    if (endBtn) {
      if (!a) {
        this.confirmEnd = false;
        endBtn.classList.add('hidden');
      } else {
        endBtn.classList.remove('hidden');
        endBtn.textContent = this.confirmEnd
          ? 'Wirklich beenden?'
          : (a.phase === 'break' ? 'Pause beenden' : 'Session beenden');
      }
    }

    // Modus & Baumart
    document.querySelectorAll('.seg-btn[data-mode]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === s.mode);
      btn.disabled = !!a;
    });

    const note = this.$('modeNote');
    if (note) {
      if (a && a.phase === 'break') {
        note.textContent = 'Pause läuft · danach neue Session';
      } else if (s.mode === 'pomodoro') {
        note.textContent = `${s.workMinutes} Min lernen · ${s.breakMinutes} Min Pause`;
      } else {
        note.textContent = `Freier Timer · ${s.workMinutes} Min ohne Pause`;
      }
    }

    const speciesSelect = this.$('speciesSelect');
    if (speciesSelect) speciesSelect.disabled = !!a;

    const hint = this.$('timerHint');
    if (hint) {
      if (a && a.phase === 'break') hint.textContent = 'Pause läuft – neue Session danach per Klick';
      else if (a) hint.textContent = 'Der Baum wächst mit jeder Minute';
      else if (s.mode === 'pomodoro') hint.textContent = 'Nach der Session startet die Pause automatisch';
      else hint.textContent = 'Am Ende wird der Baum direkt gepflanzt';
    }
  }

  renderToday() {
    const stats = computeStats(this.state.sessions);
    const mins = this.$('todayMinutes');
    if (mins) mins.innerHTML = `${stats.todayMinutes}<span style="font-size:12px;font-weight:500"> Min</span>`;
    const trees = this.$('todayTrees');
    if (trees) trees.textContent = String(this.countTodayTrees());
    const streak = this.$('todayStreak');
    if (streak) streak.textContent = String(stats.streak);
    const date = this.$('todayDate');
    if (date) date.textContent = formatDateShort(new Date());
  }

  countTodayTrees() {
    const today = new Date();
    return this.state.sessions.filter((s) => {
      const d = new Date(s.endedAt);
      return d.getFullYear() === today.getFullYear()
        && d.getMonth() === today.getMonth()
        && d.getDate() === today.getDate();
    }).length;
  }

  renderRecent() {
    const host = this.$('recentTrees');
    if (!host) return;
    const recent = this.state.sessions.slice()
      .sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt))
      .slice(0, 6);
    if (!recent.length) {
      host.innerHTML = '<span class="empty">Noch kein Baum gepflanzt</span>';
      const label = this.$('recentLabel');
      if (label) label.textContent = '–';
      return;
    }
    host.innerHTML = recent.map((s) => (
      `<span class="slot">${treeHTML(s.species, stageForMinutes(s.minutes), s.seed, historyTreeHeight(s.minutes))}</span>`
    )).join('');
    const latest = new Date(recent[0].endedAt);
    const now = new Date();
    const sameDay = latest.getFullYear() === now.getFullYear()
      && latest.getMonth() === now.getMonth()
      && latest.getDate() === now.getDate();
    const label = this.$('recentLabel');
    if (label) label.textContent = sameDay ? 'heute' : formatDateShort(latest);
  }

  renderWald() {
    const summary = this.$('waldSummary');
    const stats = computeStats(this.state.sessions);
    if (summary) summary.textContent = `${formatHours(stats.totalMinutes)} · ${stats.totalTrees} ${stats.totalTrees === 1 ? 'Baum' : 'Bäume'}`;

    const host = this.$('waldDays');
    if (host) {
      const groups = groupSessionsByDay(this.state.sessions, 30);
      const forest = forestSceneHTML(this.state.sessions, {
        date: new Date(),
        christmas: this.state.settings.christmas
      });
      this.lastWaldDay = localDayKey();
      if (!groups.length) {
        host.innerHTML = forest;
      } else {
        const days = groups.map((g) => {
          const heading = formatDayHeading(g.date);
          const dateText = formatDateShort(g.date);
          const meta = `${formatMinutes(g.minutes)} · ${g.trees.length} ${g.trees.length === 1 ? 'Baum' : 'Bäume'}`;
          const trees = g.trees.map((t) => {
            const speciesName = SPECIES_LIST.find((sp) => sp.id === t.species)?.name || 'Baum';
            const tip = `Wann: ${formatDateTimeDE(t.endedAt)}\nLernzeit: ${formatDurationDE(t.minutes)}\nBaum: ${speciesName} – ${stageLabel(t.minutes)}`;
            return `<span class="slot" title="${escapeAttr(tip)}">${treeHTML(t.species, stageForMinutes(t.minutes), t.seed, historyTreeHeight(t.minutes))}</span>`;
          }).join('');
          return `<div class="day">
            <div class="day-head"><span class="day-name">${escapeHTML(heading)} <span class="day-date">${escapeHTML(dateText)}</span></span><span class="day-meta">${escapeHTML(meta)}</span></div>
            <div class="day-strip">${trees}</div>
          </div>`;
        }).join('');
        host.innerHTML = `${forest}<div class="wald-history"><div class="section-head" style="margin:14px 2px 10px"><span class="section-title" style="font-size:13px">Verlauf</span><span class="card-sub">nach Tagen</span></div>${days}</div>`;
      }
    }

    const grid = this.$('speciesGrid');
    if (grid) {
      grid.innerHTML = SPECIES_LIST.map((sp, i) => {
        const unlocked = stats.totalMinutes >= sp.need * 60;
        const metaText = unlocked ? 'freigeschaltet' : `${sp.need} Std`;
        return `<div class="sp${unlocked ? '' : ' locked'}">
          ${treeSVG(sp.id, unlocked ? 4 : 2, 50 + i)}
          <div><div class="sp-name">${escapeHTML(sp.name)}</div><div class="sp-meta">${escapeHTML(metaText)}${unlocked ? '' : ` ${LOCK_ICON}`}</div></div>
        </div>`;
      }).join('');
    }
  }

  renderStats() {
    const stats = computeStats(this.state.sessions);
    const today = this.$('statsToday');
    if (today) today.textContent = formatMinutes(stats.todayMinutes);
    const week = this.$('statsWeek');
    if (week) week.textContent = formatMinutes(stats.weekMinutes);
    const total = this.$('statsTotal');
    if (total) total.textContent = formatHours(stats.totalMinutes);
    const streak = this.$('statsStreak');
    if (streak) streak.textContent = `${stats.streak} ${stats.streak === 1 ? 'Tag' : 'Tage'}`;

    const chart = this.$('chart');
    const labels = this.$('chartLabels');
    if (chart) {
      const max = Math.max(30, ...stats.last7.map((d) => d.minutes));
      chart.innerHTML = stats.last7.map((d) => {
        const h = Math.max(2, Math.round((d.minutes / max) * 118));
        return `<div class="col${d.today ? ' today' : ''}">
          <span class="val">${d.minutes ? formatMinutes(d.minutes) : ''}</span>
          <div class="bar" style="height:${h}px"></div>
        </div>`;
      }).join('');
    }
    if (labels) {
      labels.innerHTML = stats.last7.map((d) => (
        `<span class="${d.today ? 'today' : ''}">${weekdayShort(d.date)}</span>`
      )).join('');
    }
  }

  renderSettings() {
    const s = this.state.settings;

    const work = this.$('workInput');
    if (work && document.activeElement !== work) work.value = String(s.workMinutes);
    const brk = this.$('breakInput');
    if (brk && document.activeElement !== brk) brk.value = String(s.breakMinutes);

    const closeTray = this.$('closeTrayToggle');
    if (closeTray) closeTray.checked = s.closeToTray;
    const autostart = this.$('autostartToggle');
    if (autostart) autostart.checked = s.autostart;
    const miniTop = this.$('miniTopToggle');
    if (miniTop) miniTop.checked = s.miniAlwaysOnTop;
    const sound = this.$('soundToggle');
    if (sound) sound.checked = s.sound;
    const christmas = this.$('christmasToggle');
    if (christmas) christmas.checked = s.christmas;

    document.querySelectorAll('#themeSeg .seg-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.set === s.theme);
    });

    const speciesSelect = this.$('speciesSelect');
    if (speciesSelect) {
      const totalMinutes = this.state.sessions.reduce((sum, x) => sum + x.minutes, 0);
      speciesSelect.innerHTML = SPECIES_LIST.map((sp) => {
        const unlocked = totalMinutes >= sp.need * 60;
        return `<option value="${escapeAttr(sp.id)}"${unlocked ? '' : ' disabled'}>${escapeHTML(sp.name)}${unlocked ? '' : ` · ab ${sp.need} Std`}</option>`;
      }).join('');
      speciesSelect.value = this.currentSpecies();
      speciesSelect.disabled = !!this.state.active;
    }
  }

  // ---------- Einstellungen & Aktionen ----------

  afterSettingsChange() {
    this.lastTreeKey = null;
    this.save();
    this.renderAll();
    this.broadcast();
  }

  setMode(mode) {
    if (this.state.active) {
      this.showToast('Der Modus lässt sich während einer Session nicht ändern.');
      return;
    }
    this.state.settings.mode = mode === 'frei' ? 'frei' : 'pomodoro';
    this.afterSettingsChange();
  }

  setTheme(theme) {
    this.state.settings.theme = ['light', 'dark', 'system'].includes(theme) ? theme : 'system';
    this.applyTheme();
    this.save();
  }

  applyTheme() {
    const setting = this.state.settings.theme;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const dark = setting === 'dark' || (setting === 'system' && mq.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const btn = this.$('themeBtn');
    if (btn) btn.innerHTML = dark ? MOON_ICON : SUN_ICON;
    document.querySelectorAll('#themeSeg .seg-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.set === setting);
    });
    if (!this.mqBound) {
      this.mqBound = true;
      mq.addEventListener('change', () => {
        if (this.state.settings.theme === 'system') this.applyTheme();
      });
    }
  }

  async syncAutostart() {
    if (!hasTauri) return;
    try {
      const mod = await import('@tauri-apps/plugin-autostart');
      const enabled = await mod.isEnabled();
      if (enabled !== this.state.settings.autostart) {
        this.state.settings.autostart = enabled;
        this.renderSettings();
        this.save();
      }
    } catch { /* optional */ }
  }

  async applyAutostart(enabled) {
    if (!hasTauri) {
      this.showToast('Autostart ist nur in der Desktop-App verfügbar.');
      return;
    }
    try {
      const mod = await import('@tauri-apps/plugin-autostart');
      if (enabled) await mod.enable();
      else await mod.disable();
    } catch (err) {
      console.error('Autostart konnte nicht geändert werden', err);
      this.state.settings.autostart = !enabled;
      this.renderSettings();
      this.save();
      this.showToast('Autostart konnte nicht geändert werden.');
    }
  }

  async loadDataPath() {
    const path = await storage.getDataPath();
    for (const id of ['dataPath', 'helpDataPath']) {
      const el = this.$(id);
      if (el) el.textContent = path;
    }
  }

  async loadVersion() {
    let version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';
    if (hasTauri) {
      try {
        const mod = await import('@tauri-apps/api/app');
        version = await mod.getVersion();
      } catch { /* Build-Version als Rückfall */ }
    }
    if (!version) return;
    const label = `Version ${version}`;
    for (const id of ['appVersion', 'appVersionChip']) {
      const el = this.$(id);
      if (el) el.textContent = label;
    }
  }

  async openMini() {
    if (!hasTauri) {
      this.showToast('Der Mini-Modus ist nur in der Desktop-App verfügbar.');
      return;
    }
    await this.call('toggle_mini', { alwaysOnTop: this.state.settings.miniAlwaysOnTop });
    setTimeout(() => this.broadcast(), 400);
  }

  async quitApp() {
    if (!hasTauri) {
      this.showToast('Beenden ist nur in der Desktop-App verfügbar.');
      return;
    }
    await this.call('quit_app');
  }

  async requestNotificationPermission() {
    if (!hasTauri) return;
    try {
      const mod = await import('@tauri-apps/plugin-notification');
      if (!(await mod.isPermissionGranted())) await mod.requestPermission();
    } catch { /* Benachrichtigungen sind optional */ }
  }

  async notify(title, body) {
    if (!hasTauri) return;
    try {
      const mod = await import('@tauri-apps/plugin-notification');
      let granted = await mod.isPermissionGranted();
      if (!granted) granted = (await mod.requestPermission()) === 'granted';
      if (granted) mod.sendNotification({ title, body });
    } catch { /* optional */ }
  }

  showToast(message, ring = false) {
    const toast = this.$('toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => toast.classList.remove('show'), 5500);
    }
    if (ring && this.state.settings.sound) playBell();
  }

  async call(command, args) {
    if (!hasTauri) return null;
    try {
      return await invoke(command, args);
    } catch (err) {
      console.error(`Command ${command} fehlgeschlagen`, err);
      return null;
    }
  }

  save() {
    const snapshot = JSON.parse(JSON.stringify(this.state));
    this.saveChain = this.saveChain
      .then(() => storage.saveState(snapshot))
      .catch((err) => {
        console.error('Speichern fehlgeschlagen', err);
        this.showToast('Speichern fehlgeschlagen – der Wald konnte nicht gesichert werden.');
      });
  }

  // ---------- Ereignisse ----------

  bindUI() {
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = this.$('panel-' + tab.dataset.tab);
        if (panel) panel.classList.add('active');
        if (tab.dataset.tab === 'wald') this.renderWald();
        if (tab.dataset.tab === 'stats') this.renderStats();
        if (tab.dataset.tab === 'settings') this.renderSettings();
      });
    });

    const themeBtn = this.$('themeBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const dark = document.documentElement.dataset.theme === 'dark';
        this.setTheme(dark ? 'light' : 'dark');
      });
    }

    const winMin = this.$('winMin');
    if (winMin) winMin.addEventListener('click', () => this.call('minimize_main'));
    const winMax = this.$('winMax');
    if (winMax) winMax.addEventListener('click', () => this.call('toggle_maximize'));
    const winClose = this.$('winClose');
    if (winClose) winClose.addEventListener('click', () => this.call('close_main'));
    const winQuit = this.$('winQuit');
    if (winQuit) winQuit.addEventListener('click', () => this.quitApp());
    const miniModeBtn = this.$('miniModeBtn');
    if (miniModeBtn) miniModeBtn.addEventListener('click', () => this.openMini());

    const pauseBtn = this.$('pauseBtn');
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePauseOrStart());
    const endBtn = this.$('endBtn');
    if (endBtn) endBtn.addEventListener('click', () => this.handleEndClick());

    document.querySelectorAll('.seg-btn[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });
    document.querySelectorAll('#themeSeg .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.setTheme(btn.dataset.set));
    });

    const speciesSelect = this.$('speciesSelect');
    if (speciesSelect) {
      speciesSelect.addEventListener('change', () => {
        if (this.state.active) return;
        if (!SPECIES[speciesSelect.value]) return;
        if (!this.state.unlockedSpecies.includes(speciesSelect.value)) return;
        this.state.settings.species = speciesSelect.value;
        this.lastTreeKey = null;
        this.save();
        this.renderTimer();
      });
    }

    const bindMinutes = (id, key, min, max) => {
      const input = this.$(id);
      if (!input) return;
      input.addEventListener('change', () => {
        const fallback = this.state.settings[key];
        const raw = input.value.trim();
        const next = raw === '' ? fallback : clampInt(raw, min, max, fallback);
        input.value = String(next);
        if (next === this.state.settings[key]) return;
        this.state.settings[key] = next;
        this.afterSettingsChange();
      });
    };
    bindMinutes('workInput', 'workMinutes', 1, 180);
    bindMinutes('breakInput', 'breakMinutes', 1, 60);

    const closeTray = this.$('closeTrayToggle');
    if (closeTray) closeTray.addEventListener('change', () => {
      this.state.settings.closeToTray = closeTray.checked;
      this.call('set_close_to_tray', { enabled: closeTray.checked });
      this.save();
    });

    const autostart = this.$('autostartToggle');
    if (autostart) autostart.addEventListener('change', () => {
      this.state.settings.autostart = autostart.checked;
      this.save();
      this.applyAutostart(autostart.checked);
    });

    const miniTop = this.$('miniTopToggle');
    if (miniTop) miniTop.addEventListener('change', () => {
      this.state.settings.miniAlwaysOnTop = miniTop.checked;
      this.call('set_mini_always_on_top', { enabled: miniTop.checked });
      this.save();
    });

    const sound = this.$('soundToggle');
    if (sound) sound.addEventListener('change', () => {
      this.state.settings.sound = sound.checked;
      this.save();
      if (sound.checked) playBell();
    });

    const christmas = this.$('christmasToggle');
    if (christmas) christmas.addEventListener('change', () => {
      this.state.settings.christmas = christmas.checked;
      this.save();
      this.renderWald();
      this.showToast(christmas.checked
        ? 'Weihnachtszeit ist an – sichtbar vom 1. bis 26. Dezember.'
        : 'Weihnachtszeit ist aus.');
    });

    document.querySelectorAll('[data-open-folder]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          const opened = await storage.openDataFolder();
          this.showToast(opened ? 'Speicherordner geöffnet.' : 'Speicherordner ist nur in der Desktop-App verfügbar.');
        } catch {
          this.showToast('Speicherordner konnte nicht geöffnet werden.');
        }
      });
    });

    const openMiniBtn = this.$('openMiniBtn');
    if (openMiniBtn) openMiniBtn.addEventListener('click', () => this.openMini());

    const feedbackSendBtn = this.$('feedbackSendBtn');
    if (feedbackSendBtn) feedbackSendBtn.addEventListener('click', () => {
      const subject = (this.$('feedbackSubject')?.value || '').trim() || 'Baumzeit Feedback';
      const message = (this.$('feedbackMessage')?.value || '').trim();
      if (!message) {
        this.showToast('Bitte schreibe zuerst eine Nachricht.');
        this.$('feedbackMessage')?.focus();
        return;
      }
      const version = this.$('appVersion')?.textContent || '';
      const body = version ? `${message}\n\n---\n${version}` : message;
      const mailto = `mailto:baumzeit@schneemann.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
    });

    document.addEventListener('keydown', (event) => {
      if (event.target instanceof Element && event.target.closest('input, select, textarea, button')) return;
      if (event.code === 'Space') {
        event.preventDefault();
        this.togglePauseOrStart();
      } else if (event.key.toLowerCase() === 'm' && event.ctrlKey) {
        event.preventDefault();
        this.openMini();
      }
    });
  }

  bindTauriEvents() {
    if (!hasTauri) return;
    listen('mini:action', (event) => {
      const action = event.payload && event.payload.action;
      if (action === 'toggle-pause') this.togglePauseOrStart();
      else if (action === 'open-main') this.call('show_main');
      else if (action === 'close') this.call('hide_mini');
    });
    listen('mini:request', () => this.broadcast());
    listen('tray:show', () => this.call('show_main'));
    listen('tray:toggle-pause', () => this.togglePauseOrStart());
    listen('tray:toggle-mini', () => this.openMini());
  }

  broadcast() {
    if (!hasTauri) return;
    const a = this.state.active;
    const now = Date.now();
    const target = a ? a.targetMs : this.plannedMs('focus');
    const elapsed = a ? this.elapsedMs(a, now) : 0;
    const remaining = Math.max(0, target - elapsed);
    const progress = a ? Math.min(elapsed / target, 1) : 0;
    const stage = a ? (a.phase === 'break' ? 4 : stageForProgress(progress)) : 3;
    const targetMin = Math.max(1, Math.round(target / 60000));
    let sub;
    if (!a) sub = `Bereit · ${targetMin} Min`;
    else if (a.phase === 'break') sub = a.pausedAt != null ? 'Pausiert · Pause' : `Pause · ${targetMin} Min`;
    else sub = a.pausedAt != null ? 'Pausiert · Fokus' : `Fokus · ${targetMin} Min`;

    emit('timer:snapshot', {
      source: 'main',
      idle: !a,
      running: !!(a && a.pausedAt == null),
      paused: !!(a && a.pausedAt != null),
      phase: a ? a.phase : 'idle',
      remainingMs: remaining,
      targetMs: target,
      progress,
      species: a ? a.species : this.currentSpecies(),
      seed: a ? a.seed : 7,
      stage,
      sub
    }).catch(() => {});
  }

  // ---------- Mini-Modus ----------

  initMini() {
    this.miniTreeKey = null;
    this.miniIconKey = null;

    const pause = this.$('miniPause');
    if (pause) pause.addEventListener('click', (event) => {
      event.stopPropagation();
      this.miniAction('toggle-pause');
    });
    const close = this.$('miniClose');
    if (close) close.addEventListener('click', (event) => {
      event.stopPropagation();
      this.miniAction('close');
    });
    const win = this.$('miniWindow');
    if (win) win.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      this.miniAction('open-main');
    });

    if (hasTauri) {
      listen('timer:snapshot', (event) => {
        this.snapshot = event.payload;
        this.snapshotAt = performance.now();
        this.renderMini();
      });
      emit('mini:request', {}).catch(() => {});
    }

    setInterval(() => this.renderMini(), 250);
    this.renderMini();
  }

  miniAction(action) {
    if (!hasTauri) {
      if (action === 'close') {
        const view = this.$('view-mini');
        if (view) view.classList.add('hidden');
      }
      return;
    }
    emit('mini:action', { action }).catch(() => {});
  }

  renderMini() {
    const snap = this.snapshot;
    const now = performance.now();
    let remaining = 25 * 60000;
    let idle = true;
    let paused = false;
    let species = 'eiche';
    let seed = 7;
    let stage = 3;
    let sub = 'Bereit';

    if (snap) {
      idle = !!snap.idle;
      paused = !!snap.paused;
      species = snap.species || 'eiche';
      seed = snap.seed || 7;
      stage = snap.stage || 3;
      sub = snap.sub || 'Bereit';
      const drift = snap.running ? Math.max(0, now - this.snapshotAt) : 0;
      remaining = Math.max(0, snap.remainingMs - drift);
    }

    const time = this.$('miniTime');
    if (time) time.textContent = fmtClock(remaining);
    const subEl = this.$('miniSub');
    if (subEl) subEl.textContent = sub;

    const treeKey = `${species}|${stage}|${seed}`;
    if (treeKey !== this.miniTreeKey) {
      this.miniTreeKey = treeKey;
      const host = this.$('miniTree');
      if (host) {
        host.innerHTML = treeSVG(species, stage, seed);
        const svg = host.querySelector('svg');
        if (svg) {
          svg.style.height = '42px';
          svg.style.width = 'auto';
        }
      }
    }

    const icon = (idle || paused) ? PLAY_ICON : PAUSE_ICON;
    const iconKey = (idle || paused) ? 'play' : 'pause';
    if (iconKey !== this.miniIconKey) {
      this.miniIconKey = iconKey;
      const btn = this.$('miniPause');
      if (btn) btn.innerHTML = icon;
    }
  }
}
