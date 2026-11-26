// Auswertung der Sessions: Tag, Woche, Gesamt, Streak und 7-Tage-Verlauf.

export function dayKey(value) {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(value) {
  const d = startOfDay(value);
  const dow = (d.getDay() + 6) % 7; // Montag = 0
  d.setDate(d.getDate() - dow);
  return d;
}

export function validSessions(sessions) {
  if (!Array.isArray(sessions)) return [];
  return sessions.filter((s) => {
    if (!s || typeof s !== 'object') return false;
    const minutes = Number(s.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return false;
    return Number.isFinite(new Date(s.endedAt).getTime());
  });
}

// Ein Pausentag ist erlaubt, wenn in den 7 Tagen bis einschließlich
// dieses Tages mindestens 5 Lerntage liegen (5-von-7-Regel).
export const STREAK_WINDOW_DAYS = 7;
export const STREAK_MIN_LEARNING_DAYS = 5;

export function learningDaysInWindow(byDay, endDay, days = STREAK_WINDOW_DAYS) {
  const end = startOfDay(endDay);
  let count = 0;
  for (let i = 0; i < days; i += 1) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    if (byDay.has(dayKey(d))) count += 1;
  }
  return count;
}

export function restDayAllowed(byDay, day) {
  return learningDaysInWindow(byDay, day, STREAK_WINDOW_DAYS) >= STREAK_MIN_LEARNING_DAYS;
}

// Zählt Lerntage der aktuellen Serie. Pausentage zählen nicht mit und
// unterbrechen den Streak nur, wenn die 5-von-7-Regel nicht erfüllt ist.
export function computeStreak(byDay, now = new Date()) {
  let cursor = startOfDay(now);
  // Heute ist offen: Ohne Session heute ab gestern rückwärts zählen.
  if (!byDay.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (true) {
    if (byDay.has(dayKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (restDayAllowed(byDay, cursor)) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }
  return streak;
}

export function computeStats(sessions, now = new Date()) {
  const valid = validSessions(sessions);
  const todayStart = startOfDay(now).getTime();
  const weekStart = startOfWeek(now).getTime();
  const byDay = new Map();
  let total = 0;
  let today = 0;
  let week = 0;

  for (const s of valid) {
    const t = new Date(s.endedAt).getTime();
    const minutes = Math.round(Number(s.minutes));
    total += minutes;
    if (t >= todayStart) today += minutes;
    if (t >= weekStart) week += minutes;
    const k = dayKey(t);
    byDay.set(k, (byDay.get(k) || 0) + minutes);
  }

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    last7.push({ key: k, date: d, minutes: byDay.get(k) || 0, today: i === 0 });
  }

  const streak = computeStreak(byDay, now);
  const todayKey = dayKey(now);
  const learnedToday = byDay.has(todayKey);
  const last7LearningDays = last7.filter((d) => d.minutes > 0).length;
  const restDayAvailable = streak > 0 && !learnedToday && restDayAllowed(byDay, now);
  const streakAtRisk = streak > 0 && !learnedToday && !restDayAvailable;

  return {
    todayMinutes: today,
    weekMinutes: week,
    totalMinutes: total,
    totalTrees: valid.length,
    streak,
    learnedToday,
    last7LearningDays,
    restDayAvailable,
    streakAtRisk,
    last7,
    byDay
  };
}

export function groupSessionsByDay(sessions, limit = 30) {
  const valid = validSessions(sessions);
  const groups = new Map();
  for (const s of valid) {
    const t = new Date(s.endedAt).getTime();
    const key = dayKey(t);
    if (!groups.has(key)) {
      const d = startOfDay(t);
      groups.set(key, { key, date: d, minutes: 0, trees: [] });
    }
    const g = groups.get(key);
    g.minutes += Math.round(Number(s.minutes));
    g.trees.push(s);
  }
  return Array.from(groups.values())
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit)
    .map((g) => {
      g.trees.sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt));
      return g;
    });
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export function formatDayHeading(date, now = new Date()) {
  const d = startOfDay(date).getTime();
  const t = startOfDay(now).getTime();
  const diff = Math.round((t - d) / 86400000);
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Gestern';
  return WEEKDAYS[new Date(d).getDay()];
}

export function formatDateShort(date) {
  const d = new Date(date);
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

export function weekdayShort(date) {
  return WEEKDAYS_SHORT[new Date(date).getDay()];
}

export function formatMinutes(minutes) {
  const mins = Math.max(0, Math.round(minutes));
  if (mins < 60) return `${mins} Min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} Std ${m}` : `${h} Std`;
}

export function formatHours(minutes) {
  const hours = Math.round((Math.max(0, minutes) / 60) * 10) / 10;
  return `${hours.toLocaleString('de-DE')} Std`;
}
