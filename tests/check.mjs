// Prüfskript für die reine Logik (läuft ohne Tauri und ohne DOM).
import assert from 'node:assert/strict';
import {
  computeStats, groupSessionsByDay, formatMinutes, formatHours,
  dayKey, formatDayHeading
} from '../src/stats.js';
import {
  treeSVG, stageForMinutes, heightForMinutes, stageForProgress, SPECIES_LIST
} from '../src/trees.js';
import { normalizeState } from '../src/app.js';

const now = new Date(2026, 10, 22, 12, 0, 0); // So 22. Nov 2026
const at = (daysAgo, hour = 10) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const session = (daysAgo, minutes, species = 'eiche') => ({
  id: 'x' + daysAgo + minutes,
  startedAt: at(daysAgo, 9),
  endedAt: at(daysAgo),
  minutes,
  species,
  seed: 42,
  completed: true
});

// --- Statistik ---
const sessions = [
  session(0, 25),
  session(0, 5, 'birke'),
  session(1, 50),
  session(3, 25)
];
const stats = computeStats(sessions, now);
assert.equal(stats.todayMinutes, 30, 'Heute summiert');
assert.equal(stats.totalMinutes, 105, 'Gesamt summiert');
assert.equal(stats.totalTrees, 4, 'Baumzahl');
assert.equal(stats.streak, 2, 'Streak heute + gestern');
assert.equal(stats.last7.length, 7, '7 Tage');
assert.equal(stats.last7[6].minutes, 30, 'Heute ist der letzte Balken');
assert.equal(stats.last7[5].minutes, 50, 'Gestern');
assert.equal(stats.last7[3].minutes, 25, 'Vor drei Tagen');
assert.equal(formatMinutes(50), '50 Min');
assert.equal(formatMinutes(75), '1 Std 15');
assert.equal(formatHours(0), '0 Std');
assert.equal(formatHours(90), '1,5 Std');
assert.equal(dayKey(now), '2026-11-22');
assert.equal(formatDayHeading(now, now), 'Heute');

// Wochensumme: Montag der aktuellen Woche (16.11.) bis heute
assert.equal(stats.weekMinutes, 105, 'Alle Sessions liegen in dieser Woche');

const grouped = groupSessionsByDay(sessions, 30);
assert.equal(grouped.length, 3, 'Drei Tagesgruppen');
assert.equal(grouped[0].minutes, 30, 'Neuester Tag zuerst');
assert.equal(grouped[0].trees.length, 2, 'Zwei Bäume heute');

// --- Bäume ---
assert.equal(stageForMinutes(1), 1);
assert.equal(stageForMinutes(5), 2);
assert.equal(stageForMinutes(15), 3);
assert.equal(stageForMinutes(25), 4);
assert.ok(heightForMinutes(5) < heightForMinutes(25), 'Länger = größer');
assert.equal(stageForProgress(0), 1);
assert.equal(stageForProgress(0.9), 4);
const svg = treeSVG('tanne', 4, 123);
assert.match(svg, /^<svg class="" viewBox="0 0 100 140"/);
assert.ok(svg.length > 200, 'Baum hat Inhalt');
assert.equal(SPECIES_LIST.length, 6, 'Sechs Baumarten');

// --- Zustands-Normalisierung ---
const normalized = normalizeState({
  version: 1,
  settings: { mode: 'quatsch', workMinutes: 999, theme: 'blau', species: 'tanne' },
  sessions: [session(0, 25), { minutes: -3 }, null],
  active: null
});
assert.equal(normalized.settings.mode, 'pomodoro');
assert.equal(normalized.settings.workMinutes, 180);
assert.equal(normalized.settings.theme, 'system');
assert.equal(normalized.sessions.length, 1);
assert.equal(normalized.settings.species, 'eiche', 'Gesperrte Art fällt auf Eiche zurück');

const active = normalizeState({
  settings: {},
  sessions: [],
  active: {
    id: 'a', startedAt: Date.now() - 10000, targetMs: 1500000,
    phase: 'focus', mode: 'pomodoro', pausedAt: null, pausedTotalMs: 0,
    species: 'eiche', seed: 9
  }
}).active;
assert.ok(active, 'Aktive Session wird übernommen');
assert.equal(active.pausedAt, null, 'pausedAt bleibt null');

const paused = normalizeState({
  settings: {}, sessions: [],
  active: {
    id: 'b', startedAt: Date.now() - 10000, targetMs: 1500000,
    phase: 'focus', pausedAt: 123456789, pausedTotalMs: 1000
  }
}).active;
assert.equal(paused.pausedAt, 123456789, 'Pausenzeit wird übernommen');

assert.deepEqual(normalizeState(null).sessions, []);
assert.equal(normalizeState(null).settings.workMinutes, 25);

console.log('Alle Logikprüfungen bestanden.');
