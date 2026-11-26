# Baumzeit v0.4.0 – Plan

## Ziel

Drei Änderungen:

1. **Streak-Toleranz:** Mindestens 5 Lerntage in einem rollierenden 7-Tage-Fenster, damit der Streak weiterläuft (2 Pausentage möglich).
2. **Lernzeit auf der Timer-Seite** einstellbar machen.
3. **Vogel-Bonus** ab einem Streak von 10 Lerntagen, nur in der Wald-Ansicht.

Keine Umsetzung in diesem Schritt – dieser Plan ist die Grundlage für die spätere Implementierung.

---

## Entscheidungen

| Thema | Entscheidung |
|---|---|
| Streak-Modell | Rollierendes 7-Tage-Fenster: mind. 5 Lerntage in den letzten 7 Kalendertagen |
| Streak-Zahl | Zählt **Lerntage**, nicht Kalendertage; Pausentage zählen nicht mit |
| Streak-UI | Statistik-Statuszeile + dezenter Timer-Hinweis nur bei Gefahr, nur Hauptfenster |
| Timer-Einstellung | Nur Lernzeit, Zahlenfeld mit −/+, 1–180 Min |
| Timer-Verhalten | Während einer Session gesperrt; Änderung gilt für die nächste Session |
| Vogel-Bonus | Stufen: 10–19 → 3 Vögel, 20–29 → 4, ab 30 → 5 |
| Vogel-Darstellung | Dezent, nur Wald-Tab, auch im Winter, `prefers-reduced-motion` beachten |
| Vogel-Ende | Unter Streak 10 verschwinden die Vögel wieder |
| Version | v0.4.0, voller Release nach separatem Go |

---

## 1. Streak: 5 von 7

### Definitionen

- **Lerntag:** Mindestens eine gültige Session (`minutes > 0`, gültiges `endedAt`) an diesem lokalen Kalendertag. Mehrere Sessions am selben Tag zählen einmal.
- **7-Tage-Fenster:** 7 aufeinanderfolgende Kalendertage inklusive Stichtag.
- **Streak:** Anzahl der Lerntage in der aktuellen Serie. Pausentage erhöhen die Zahl nicht.
- **Pausentag erlaubt:** Ein Pausentag bricht den Streak nicht, wenn in den 7 Tagen bis einschließlich dieses Pausentags mindestens 5 Lerntage liegen.
- **Junge Streaks:** Vor den ersten 5 Lerntagen gibt es keine Toleranz. Ein einzelner Pausentag bricht dann noch. Das ergibt sich aus der Regel und muss nicht separat gespeichert werden.
- **Heute ist offen:** Hat heute noch keine Session, wird ab gestern rückwärts gezählt. Der Streak bricht nicht schon am Morgen, nur weil heute noch nichts gelernt wurde.

### Algorithmus (in `src/stats.js`)

Neue exportierte Funktion, die `computeStats()` intern nutzt:

```js
// byDay: Map<'YYYY-MM-DD', minutes>
function computeStreak(byDay, now = new Date()) {
  let cursor = startOfDay(now);
  if (!byDay.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (true) {
    if (byDay.has(dayKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    // Pausentag: erlaubt, wenn die 7 Tage bis einschließlich cursor
    // mindestens 5 Lerntage enthalten.
    if (learningDaysInWindow(byDay, cursor, 7) >= 5) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }
  return streak;
}
```

`learningDaysInWindow(byDay, endDay, 7)` zählt die Lerntage von `endDay - 6` bis `endDay`.

**Wichtig:** Der Pausentag wird anhand der 5 Lerntage **vor** ihm bewertet. Dadurch sind maximal 2 Pausentage in Folge möglich; ein dritter Pausentag hat nur noch 4 Lerntage im Fenster und bricht.

### Zusätzliche Werte in `computeStats()`

- `streak` – wie bisher, jetzt mit Toleranz.
- `last7LearningDays` – Anzahl Lerntage in den letzten 7 Tagen inklusive heute (für die Statistik-Zeile).
- `streakAtRisk` – `true`, wenn:
  - `streak > 0`,
  - heute noch keine Session,
  - und die letzten 7 abgeschlossenen Tage (ohne heute) weniger als 5 Lerntage haben.
- `restDayAvailable` – `true`, wenn `streak > 0`, heute noch keine Session und heute als Pausentag erlaubt wäre.

### Beispiele

| Verlauf | Ergebnis |
|---|---|
| 5 Tage gelernt, 2 Tage Pause, heute gelernt | Streak 6 |
| 5 Tage gelernt, 3 Tage Pause, danach bewertet | Streak 0 |
| 10 Tage gelernt, heute noch nichts | Streak 10 (heute offen) |
| 10 Tage gelernt, 2 Pausentage, heute noch nichts | Streak 10, Pausentag möglich |
| 10 Tage gelernt, 3 Pausentage, danach bewertet | Streak 0 |
| 3 Tage gelernt, 1 Pausentag, danach bewertet | Streak 0 (noch keine Toleranz) |
| Bestehender 20-Tage-Streak aus alten Daten | Bleibt 20 (war lückenlos) |

### UI

**Statistik:**
- `#statsStreak` zeigt künftig `${n} Lerntage` (Singular: `1 Lerntag`).
- Neue Zeile unter dem 7-Tage-Diagramm, z. B.:
  - `Letzte 7 Tage: 5 Lerntage · Streak sicher`
  - `Letzte 7 Tage: 4 Lerntage · Pausentag möglich`
  - `Letzte 7 Tage: 3 Lerntage · heute lernen hält den Streak`
  - Bei Streak 0 nur: `Letzte 7 Tage: 3 Lerntage`
- Die Zeile wird in `renderStats()` aus den neuen Werten gebaut, nicht hartcodiert.

**Timer:**
- Neues Element `#streakHint` unter `#timerHint`.
- Nur sichtbar, wenn `stats.streakAtRisk` gilt, Text z. B. `Heute lernen hält deinen Streak`.
- Kein Hinweis, wenn heute schon gelernt wurde, der Streak 0 ist oder heute ein freier Pausentag ist.
- **Nur Hauptfenster.** Das Mini-Fenster bleibt unverändert.

**Keine neue Einstellung** zum Abschalten der Streak-Regel.

### Tests (`tests/check.mjs`)

- Bestehender Test „Streak heute + gestern = 2" bleibt grün.
- 5 Lerntage + 2 Pausen + 1 Lerntag → 6.
- 5 Lerntage + 3 Pausen (danach bewertet) → 0.
- 10 Lerntage + 2 Pausen, heute offen → 10.
- 10 Lerntage + 3 Pausen (danach bewertet) → 0.
- 3 Lerntage + 1 Pause → 0.
- `streakAtRisk`/`restDayAvailable` für die Fälle „heute offen, 4 vs. 5 Lerntage in den letzten 7 Tagen".
- Lückenlose alte Serie bleibt unverändert.

---

## 2. Lernzeit auf der Timer-Seite

### UI

Unter der Baumart-Zeile in der Timer-Karte:

```text
Lernzeit   [−]  15 Min  [+]
```

- Neues Zahlenfeld `#timerWorkInput` (1–180, Schrittweite ±5, direkte Eingabe erlaubt).
- Buttons `#timerWorkMinus` und `#timerWorkPlus`.
- Bestehendes Feld `#workInput` in den Einstellungen bleibt erhalten.
- Beide Felder bearbeiten denselben Wert `settings.workMinutes`.

### Verhalten

- Während `this.state.active` gesetzt ist (Fokus oder Pause, laufend oder pausiert), sind Feld und Buttons deaktiviert.
- Änderung ohne aktive Session: sofort `mainTime`, `modeNote` und Fortschrittsanzeige aktualisieren.
- Änderung während einer Session ist nicht möglich; die nächste Session nutzt den neuen Wert.
- Freier Modus und Pomodoro nutzen beide `workMinutes`; die Pause bleibt ausschließlich in den Einstellungen.
- `afterSettingsChange()` wird wie bei den Einstellungen verwendet (speichern, neu rendern, Mini informieren).

### Technik

- `bindMinutes()` so erweitern, dass es mehrere Inputs für denselben Schlüssel binden kann.
- `renderTimer()` und `renderSettings()` synchronisieren beide Felder; das jeweils fokussierte Feld nicht überschreiben (`document.activeElement`).
- Neue CSS-Klasse für den Stepper; bestehende `num-field`-Optik wiederverwenden.
- Keine neuen State-Felder, keine Schema-Änderung.

### Tests

- Reine Logik ist hier DOM-gebunden und wird nicht von `npm run check` abgedeckt.
- Manuell prüfen: Ändern ohne Session, Sperre während Fokus/Pause, Synchronität mit den Einstellungen, Freier Modus.
- `normalizeState` bleibt unverändert (Grenzen 1–180 bereits vorhanden).

---

## 3. Vogel-Bonus

### Auslösung und Stufen

- `birdCountForStreak(streak)`:
  - `< 10` → 0
  - `10–19` → 3
  - `20–29` → 4
  - `>= 30` → 5
- Vögel sind an den **aktuellen** Streak gebunden. Fällt er unter 10, verschwinden sie.
- Nur in der **Wald-Ansicht**. Timer, Mini-Fenster, Statistik und Verlauf bleiben unverändert.

### Darstellung

- In `src/forest.js`: `<g class="bird-flock">` mit 3–5 Vogel-Silhouetten im oberen Drittel.
- Dezent: kleine dunkle Silhouetten, langsamer Flug über ca. 20–30 Sekunden, keine Geräusche.
- Deterministische Positionen und Animationsverzögerungen (kein Zufall pro Render), damit die Szene stabil bleibt.
- Auch im Winter-/Weihnachtsmodus sichtbar.
- `forestSceneHTML(sessions, { streak })` bekommt den Streak als Option; `renderWald()` übergibt `stats.streak`.
- Bei `prefers-reduced-motion: reduce` keine Bewegung: Vögel statisch im Bild.
- Vögel liegen in der Himmelsschicht; Bäume bleiben davor/dahinter unverändert.

### Toast beim Erreichen

- Beim Abschluss einer Session prüfen, ob ein Schwellwert (10, 20, 30) überschritten wurde.
- Nur bei nutzerinitiiertem Abschluss (`!restore`), nicht beim App-Start oder Wiederherstellen.
- Texte z. B.:
  - `Streak 10 – Vögel im Wald`
  - `Streak 20 – mehr Vögel im Wald`
  - `Streak 30 – der ganze Schwarm ist da`
- Keine Persistenz nötig: Der Toast wird aus dem Vorher/Nachher-Streak abgeleitet.

### Tests

- `birdCountForStreak`: 0, 9, 10, 19, 20, 29, 30, 100.
- `forestSceneHTML` mit `streak: 9` enthält keinen `bird-flock`.
- Mit `streak: 10` enthält 3 Vögel, mit 20 → 4, mit 30 → 5.
- Winter-Szene mit Streak 10 enthält Vögel und den Christbaum.
- Keine Vögel in `forestSceneHTML` ohne Streak-Option (Rückwärtskompatibilität).

---

## 4. Doku und Release

### Doku

- **Hilfe-Tab:** 5-von-7-Regel, „Lerntage zählen", Timer-Lernzeit, Vogel-Stufen.
- **README:** Funktionen und Streak-Erklärung ergänzen; Installer-Dateiname auf 0.4.0.
- **RELEASE-NOTES.md:** Neuer Abschnitt `v0.4.0` mit Neu/Geändert/Hinweis/Artefakte.
- **AGENTS.md:** keine Änderung nötig; die bestehenden Regeln (Version, Tests, Artefakte) gelten.

### Version 0.4.0

Anheben in:

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`
- `README.md` (Installer-Dateiname)
- `RELEASE-NOTES.md`

### Verifikation

1. `npm run check`
2. `npm run build`
3. `cd src-tauri; cargo check` (Exitcode prüfen)
4. `npm run tauri build`
5. Portable EXE und NSIS-Installer nach `release/` kopieren:
   - `release/Baumzeit-portable-0.4.0.exe`
   - `release/Baumzeit_0.4.0_x64-setup.exe`
6. GitHub-Release `v0.4.0` mit beiden Artefakten (separates Go).

---

## 5. Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/stats.js` | `computeStreak`, Fensterzählung, neue Rückgabewerte |
| `src/app.js` | Timer-Feld binden, Sperre, Streak-Hinweis, Statistik-Zeile, Vögel-Übergabe, Schwellwert-Toast |
| `src/forest.js` | `birdCountForStreak`, Vogel-SVG, `streak`-Option |
| `src/styles.css` | Stepper, `streak-hint`, Vogel-Animation, Reduced-Motion |
| `index.html` | Timer-Zeile, `streakHint`, Statistik-Statuszeile, Hilfe-Texte |
| `tests/check.mjs` | Streak-, Risiko- und Vogel-Tests |
| `README.md` | Features, Streak, Version |
| `RELEASE-NOTES.md` | v0.4.0 |
| Versionsdateien | 0.4.0 |

---

## 6. Randfälle und Risiken

- **Zeitzone/Sommerzeit:** `dayKey` nutzt lokale Kalendertage wie bisher; keine neue Logik.
- **Sessions über Mitternacht:** zählen zum Tag des `endedAt`; unverändert.
- **Alte Daten:** Kein Migrationsschritt nötig, der Streak wird weiterhin aus den Sessions berechnet. Lückenlose alte Serien bleiben gültig.
- **Performance:** Der Rückwärtslauf ist O(Streak-Tage); bei mehreren Jahren täglicher Nutzung unkritisch.
- **Animation:** `renderWald()` wird nicht im 250-ms-Ticker aufgerufen; ein Neu-Rendern startet die Vogel-Animation gelegentlich neu. Das ist akzeptabel und wird nicht extra optimiert.
- **CSP:** Keine neuen Origins; Inline-Styles sind bereits erlaubt.
- **Sicherheit:** Vogel-SVG ist statisch, keine Nutzerdaten; Toasts weiterhin per `textContent`.
- **Schema:** Keine neuen persistierten Felder, Schema-Version bleibt `1`.
- **Mini-Fenster:** unverändert, kein Streak-Hinweis, keine Vögel.

---

## 7. Offene Details (beim Umsetzen bestätigen)

- Schrittweite des Timer-Steppers: **±5** vorgeschlagen; ±1 wäre präziser, aber langsamer.
- Genaue Formulierung der Statistik-Zeile und des Timer-Hinweises.
- Ob der 10er-Toast zusätzlich im Hilfe-Tab als „freigeschaltet" erwähnt wird (Vorschlag: ja, kurz).
