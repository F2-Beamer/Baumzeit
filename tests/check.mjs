// Prüfskript für die reine Logik (läuft ohne Tauri und ohne DOM).
import assert from 'node:assert/strict';
import {
  computeStats, computeStreak, groupSessionsByDay, formatMinutes, formatHours,
  dayKey, formatDayHeading
} from '../src/stats.js';
import {
  treeSVG, stageForMinutes, meadowStageForMinutes, heightForMinutes, stageForProgress, SPECIES_LIST
} from '../src/trees.js';
import { normalizeState } from '../src/app.js';
import { christmasState, christmasTreeSVG, ornamentSlots, ORNAMENT_SLOTS } from '../src/christmas.js';
import { forestSceneHTML, WINTER_PALETTE, birdCountForStreak } from '../src/forest.js';

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
assert.equal(stats.learnedToday, true, 'Heute wurde gelernt');
assert.equal(stats.last7LearningDays, 3, 'Drei Lerntage in den letzten 7 Tagen');
assert.equal(stats.streakAtRisk, false, 'Mit Session heute kein Risiko');

// --- Streak mit 5-von-7-Toleranz ---
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const dayMap = (offsets) => {
  const map = new Map();
  for (const off of offsets) {
    const d = new Date(now);
    d.setDate(d.getDate() - off);
    map.set(dayKey(d), 25);
  }
  return map;
};
const sessionsOn = (offsets, minutes = 25) => offsets.map((off) => session(off, minutes));

assert.equal(computeStreak(dayMap([0, 1]), now), 2, 'Streak heute + gestern');
assert.equal(computeStreak(dayMap([0, 3, 4, 5, 6, 7]), now), 6, '5 Lerntage + 2 Pausen + heute');
assert.equal(computeStreak(dayMap([4, 5, 6, 7, 8]), now), 0, '5 Lerntage + 3 Pausen (danach)');
assert.equal(computeStreak(dayMap(range(3, 12)), now), 10, '10 Lerntage + 2 Pausen, heute offen');
assert.equal(computeStreak(dayMap(range(4, 13)), now), 0, '10 Lerntage + 3 Pausen (danach)');
assert.equal(computeStreak(dayMap([2, 3, 4]), now), 0, '3 Lerntage + 1 Pause');
assert.equal(computeStreak(dayMap(range(1, 20)), now), 20, 'Lückenlose alte Serie bleibt');

const restAvailable = computeStats(sessionsOn([1, 2, 3, 4, 5]), now);
assert.equal(restAvailable.streak, 5, 'Fünf Lerntage ohne heute');
assert.equal(restAvailable.restDayAvailable, true, 'Heute ist ein freier Pausentag');
assert.equal(restAvailable.streakAtRisk, false, 'Freier Pausentag: kein Risiko');

const atRisk = computeStats(sessionsOn([1, 2, 3, 5]), now);
assert.equal(atRisk.restDayAvailable, false, 'Zu wenige Lerntage für einen Pausentag');
assert.equal(atRisk.streakAtRisk, true, 'Ohne Lernen heute bricht der Streak');

const noStreak = computeStats([], now);
assert.equal(noStreak.streakAtRisk, false, 'Ohne Streak kein Hinweis');
assert.equal(noStreak.restDayAvailable, false);

const learned = computeStats(sessionsOn([0, 1]), now);
assert.equal(learned.learnedToday, true);
assert.equal(learned.restDayAvailable, false, 'Nach dem Lernen ist heute kein Pausentag mehr');
assert.equal(learned.streakAtRisk, false);

const grouped = groupSessionsByDay(sessions, 30);
assert.equal(grouped.length, 3, 'Drei Tagesgruppen');
assert.equal(grouped[0].minutes, 30, 'Neuester Tag zuerst');
assert.equal(grouped[0].trees.length, 2, 'Zwei Bäume heute');

// --- Bäume ---
assert.equal(stageForMinutes(1), 1);
assert.equal(stageForMinutes(14), 1);
assert.equal(stageForMinutes(15), 2);
assert.equal(stageForMinutes(30), 3);
assert.equal(stageForMinutes(59), 3);
assert.equal(stageForMinutes(60), 4);
assert.equal(stageForMinutes(120), 4);
assert.ok(heightForMinutes(5) < heightForMinutes(25), 'Länger = größer');
assert.ok(heightForMinutes(25) < heightForMinutes(60), 'Bis 60 Min weiter größer');
assert.equal(heightForMinutes(60), heightForMinutes(120), 'Baumgröße ab 60 Min gedeckelt');
assert.equal(stageForProgress(0), 1);
assert.equal(stageForProgress(0.24), 1);
assert.equal(stageForProgress(0.25), 2);
assert.equal(stageForProgress(0.5), 3);
assert.equal(stageForProgress(0.75), 4);
assert.equal(stageForProgress(0.9), 4);

assert.equal(meadowStageForMinutes(60), 0);
assert.equal(meadowStageForMinutes(74), 0);
assert.equal(meadowStageForMinutes(75), 1);
assert.equal(meadowStageForMinutes(90), 2);
assert.equal(meadowStageForMinutes(105), 3);
assert.equal(meadowStageForMinutes(120), 4);

const svg = treeSVG('tanne', 4, 123);
assert.match(svg, /^<svg class="" viewBox="0 0 100 140"/);
assert.ok(svg.length > 200, 'Baum hat Inhalt');
const meadow2 = treeSVG('eiche', 4, 42, '', false, 2);
const meadow4 = treeSVG('eiche', 4, 42, '', false, 4);
assert.ok(meadow2.includes('<g'), 'Wiese Stufe 2 hat Elemente');
assert.ok(meadow4.includes('<g'), 'Wiese Stufe 4 hat Elemente');
assert.ok(meadow4.length > meadow2.length, 'Wiese Stufe 4 ist voller als Stufe 2');
assert.ok(!svg.includes('circle cx="24"'), 'Ohne Wiese keine Wiesenblüten');
assert.equal(SPECIES_LIST.length, 6, 'Sechs Baumarten');

// --- Zustands-Normalisierung ---
const normalized = normalizeState({
  version: 1,
  settings: { mode: 'quatsch', workMinutes: 999, breakMinutes: 0, theme: 'blau', species: 'tanne' },
  sessions: [session(0, 25), { minutes: -3 }, null],
  active: null
});
assert.equal(normalized.settings.mode, 'pomodoro');
assert.equal(normalized.settings.workMinutes, 180);
assert.equal(normalized.settings.breakMinutes, 1);
assert.equal(normalized.settings.theme, 'system');
assert.equal(normalized.sessions.length, 1);
assert.equal(normalized.settings.species, 'eiche', 'Gesperrte Art fällt auf Eiche zurück');

const custom = normalizeState({ settings: { workMinutes: 7, breakMinutes: 3 } });
assert.equal(custom.settings.workMinutes, 7, 'Freie Lernzeit bleibt erhalten');
assert.equal(custom.settings.breakMinutes, 3, 'Freie Pause bleibt erhalten');

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
assert.equal(normalizeState(null).settings.christmas, true, 'Weihnachtszeit ist standardmäßig an');
assert.equal(normalizeState({ settings: { christmas: false } }).settings.christmas, false, 'Aus bleibt aus');
assert.equal(normalizeState({ settings: { christmas: 'quatsch' } }).settings.christmas, true, 'Ungültiger Wert fällt auf an zurück');

// --- Weihnachtszeit ---
const xmasAt = (month, day) => christmasState(new Date(2026, month, day));

assert.equal(xmasAt(10, 30).active, false, '30. November: keine Weihnachtszeit');
assert.equal(xmasAt(10, 30).ornaments, 0);
assert.equal(xmasAt(10, 30).star, false);
assert.equal(xmasAt(11, 1).active, true, '1. Dezember: aktiv');
assert.equal(xmasAt(11, 1).candles, 1, '1. Dezember: eine Kerze');
assert.equal(xmasAt(11, 1).balls, 0, '1. Dezember: noch keine Kugel');
assert.equal(xmasAt(11, 1).star, false);
assert.equal(xmasAt(11, 2).candles, 1, '2. Dezember: Kerze bleibt');
assert.equal(xmasAt(11, 2).balls, 1, '2. Dezember: Kugel kommt dazu');
assert.equal(xmasAt(11, 3).candles, 2, '3. Dezember: zweite Kerze');
assert.equal(xmasAt(11, 3).balls, 1);
assert.equal(xmasAt(11, 12).candles, 6, '12. Dezember: 6 Kerzen');
assert.equal(xmasAt(11, 12).balls, 6, '12. Dezember: 6 Kugeln');
assert.equal(xmasAt(11, 23).candles, 12, '23. Dezember: 12 Kerzen');
assert.equal(xmasAt(11, 23).balls, 11, '23. Dezember: 11 Kugeln');
assert.equal(xmasAt(11, 24).candles, 12, '24. Dezember: 12 Kerzen');
assert.equal(xmasAt(11, 24).balls, 12, '24. Dezember: 12 Kugeln');
assert.equal(xmasAt(11, 24).star, true, '24. Dezember: Stern');
assert.equal(xmasAt(11, 25).active, true, '25. Dezember: noch aktiv');
assert.equal(xmasAt(11, 26).active, true, '26. Dezember: noch aktiv');
assert.equal(xmasAt(11, 26).star, true);
assert.equal(xmasAt(11, 27).active, false, '27. Dezember: vorbei');
assert.equal(christmasState(new Date('kaputt')).active, false, 'Ungültiges Datum bleibt inaktiv');

const slots = ornamentSlots();
assert.equal(slots.length, ORNAMENT_SLOTS, '24 feste Plätze');
assert.equal(slots[0].type, 'candle', 'Erster Platz ist eine Kerze');
assert.equal(slots.filter((s) => s.type === 'candle').length, 12, '12 Kerzen');
assert.equal(slots.filter((s) => s.type === 'ball').length, 12, '12 Kugeln');
assert.ok(slots.every((s, i) => s.type === (i % 2 === 0 ? 'candle' : 'ball')), 'Strikt abwechselnd');

const tree24 = christmasTreeSVG({ ornaments: 24, star: true });
assert.equal((tree24.match(/class="bz-ball"/g) || []).length, 12, 'Baum am 24.: 12 Kugeln');
assert.equal((tree24.match(/class="bz-candle"/g) || []).length, 12, 'Baum am 24.: 12 Kerzen');
assert.ok(tree24.includes('bz-star'), 'Baum am 24.: Stern');
const tree1 = christmasTreeSVG({ ornaments: 1 });
assert.equal((tree1.match(/class="bz-ball"/g) || []).length, 0, 'Baum am 1.: keine Kugel');
assert.equal((tree1.match(/class="bz-candle"/g) || []).length, 1, 'Baum am 1.: eine Kerze');
assert.ok(!tree1.includes('bz-star'), 'Baum am 1.: kein Stern');

const sceneXmas = forestSceneHTML([], { date: new Date(2026, 11, 24), palette: WINTER_PALETTE });
assert.ok(sceneXmas.includes('christmas-tree'), 'Leerer Wald zeigt den Christbaum');
assert.ok(sceneXmas.includes('forest-scene winter'), 'Winterklasse gesetzt');
assert.ok(sceneXmas.includes('Noch kein Baum gepflanzt'), 'Hinweis bleibt erhalten');

const sceneNormal = forestSceneHTML([], { date: new Date(2026, 10, 24) });
assert.ok(!sceneNormal.includes('forest-scene'), 'Im November keine Szene');
assert.ok(sceneNormal.includes('Noch kein Baum gepflanzt'));

const sceneOff = forestSceneHTML([session(0, 25)], { date: new Date(2026, 11, 24), christmas: false });
assert.ok(sceneOff.includes('forest-scene'), 'Ausgeschaltet: normaler Wald');
assert.ok(!sceneOff.includes('christmas-tree'), 'Ausgeschaltet: kein Christbaum');
assert.ok(!sceneOff.includes('winter'), 'Ausgeschaltet: kein Winter');

const sceneOn = forestSceneHTML([session(0, 25)], { date: new Date(2026, 11, 24) });
assert.ok(sceneOn.includes('christmas-tree'), 'Dezember: Christbaum im Wald');
assert.ok(sceneOn.includes('Weihnachtsbaum · 24. Dezember'), 'Tooltip nennt Datum und Deko');

// --- Vogel-Bonus ---
assert.equal(birdCountForStreak(0), 0, 'Kein Streak: keine Vögel');
assert.equal(birdCountForStreak(9), 0, 'Unter 10: keine Vögel');
assert.equal(birdCountForStreak(10), 3, 'Ab 10: drei Vögel');
assert.equal(birdCountForStreak(19), 3);
assert.equal(birdCountForStreak(20), 4, 'Ab 20: vier Vögel');
assert.equal(birdCountForStreak(29), 4);
assert.equal(birdCountForStreak(30), 5, 'Ab 30: fünf Vögel');
assert.equal(birdCountForStreak(100), 5);
assert.equal(birdCountForStreak(undefined), 0, 'Ohne Streak keine Vögel');

const birdsFor = (scene) => (scene.match(/class="bz-bird"/g) || []).length;
const sceneNoBirds = forestSceneHTML([session(0, 25)], { date: new Date(2026, 10, 24), streak: 9 });
assert.equal(birdsFor(sceneNoBirds), 0, 'Streak 9: keine Vögel');
const sceneBirds3 = forestSceneHTML([session(0, 25)], { date: new Date(2026, 10, 24), streak: 10 });
assert.equal(birdsFor(sceneBirds3), 3, 'Streak 10: drei Vögel');
assert.ok(sceneBirds3.includes('bz-bird-flock'), 'Vogelschwarm ist enthalten');
const sceneBirds4 = forestSceneHTML([session(0, 25)], { date: new Date(2026, 10, 24), streak: 20 });
assert.equal(birdsFor(sceneBirds4), 4, 'Streak 20: vier Vögel');
const sceneBirds5 = forestSceneHTML([session(0, 25)], { date: new Date(2026, 10, 24), streak: 30 });
assert.equal(birdsFor(sceneBirds5), 5, 'Streak 30: fünf Vögel');
const sceneWithoutStreak = forestSceneHTML([session(0, 25)], { date: new Date(2026, 10, 24) });
assert.equal(birdsFor(sceneWithoutStreak), 0, 'Ohne Streak-Option keine Vögel');
const winterBirds = forestSceneHTML([session(0, 25)], {
  date: new Date(2026, 11, 24), palette: WINTER_PALETTE, streak: 10
});
assert.equal(birdsFor(winterBirds), 3, 'Winter: Vögel sichtbar');
assert.ok(winterBirds.includes('christmas-tree'), 'Winter: Christbaum bleibt erhalten');

console.log('Alle Logikprüfungen bestanden.');
