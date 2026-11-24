# Baumzeit – Weihnachtszeit im Wald

Zeitlich begrenzter Weihnachtsmodus für die Wald-Ansicht: ein geschmückter Christbaum rechts neben dem Hain,
jeden Tag abwechselnd eine Kerze und eine Kugel mehr, am 24. Dezember der Stern – dazu ein leicht verschneiter Wald.
Abschaltbar über die Einstellungen.

- **Projektordner:** `D:\Users\f2bea\KI-APPs-D\MeinWald`
- **Ausgangsversion:** 0.2.8
- **Zielversion:** 0.3.0
- **Vorschau:** `design\christmas-preview.html` · Bilder in `design\preview\`
- **Stand:** umgesetzt in Version 0.3.0 (24.11.2026)

---

## 1. Ziel

Während der Adventszeit soll der eigene Wald weihnachtlich wirken – ohne dass etwas Bestehendes verändert wird.
Wer den Effekt nicht mag, schaltet ihn einmal aus und sieht wieder exakt den heutigen Wald.

Wichtig: Der Effekt ist reine Dekoration. Er hat **keinen** Einfluss auf Sessions, Statistik, Baumarten,
Freischaltungen oder gespeicherte Bäume.

---

## 2. Getroffene Entscheidungen

| Thema | Entscheidung |
|---|---|
| Schalter | **ein** Schalter „Weihnachtszeit im Wald“ für Baum **und** Schnee zusammen |
| Standard | **an** – im Dezember erscheint alles automatisch |
| Ausschalten | bleibt dauerhaft aus, bis man ihn wieder einschaltet (kein automatisches Wiedereinschalten) |
| Zeitfenster | **1. bis 26. Dezember** (lokale Systemzeit), jedes Jahr |
| Menge | **abwechselnd**: ungerade Tage eine Kerze, gerade Tage eine Kugel – max. 24 Teile (12 Kerzen + 12 Kugeln) |
| Stern | ab dem **24. Dezember**, bleibt bis zum 26. stehen |
| Ab dem 27. | wieder normaler Wald, kein Rest, keine Nachwirkung |
| Platzierung | **rechts** neben dem Hain, deutlich größer als die Waldbäume (ca. 1,5–1,6× Höhe des größten Baums) |
| Leerer Wald | Christbaum erscheint trotzdem, Hinweistext steht darunter |
| Winter | Schnee auf Boden **und** Baumkronen, kühlerer Himmel, langsam fallende Flocken |
| Kerzen | angezündet, mit warmem Schein und sanftem Flackern |
| Kugeln | Rot, Gold, Grün, Blau mit kleinem Glanzlicht |
| Wirkung | **nur** in der Wald-Ansicht (nicht Timer, Mini-Modus, Verlauf, „Zuletzt gepflanzt“) |
| Zusatzinfo | nur ein Tooltip am Baum, keine weitere Beschriftung |
| Datum & Schalter | Schalter = Erlaubnis; außerhalb des Fensters bewirkt „an“ nichts |
| Beispielbild | aus dem echten Code erzeugte SVG-Vorschau (kein KI-Bild) |

---

## 3. Zeitfenster und Tageslogik

Berechnung ausschließlich aus dem lokalen Datum – es wird nichts gespeichert und nichts nachgetragen.
Wer am 20. Dezember zum ersten Mal startet, sieht sofort 10 Kerzen und 10 Kugeln.

| Datum | Kerzen | Kugeln | Stern |
|---|---|---|---|
| 30. November | – | – | – (kein Weihnachtsmodus) |
| 1. Dezember | 1 | 0 | nein |
| 2. Dezember | 1 | 1 | nein |
| 3. Dezember | 2 | 1 | nein |
| 12. Dezember | 6 | 6 | nein |
| 23. Dezember | 12 | 11 | nein |
| 24. Dezember | 12 | 12 | **ja** |
| 25./26. Dezember | 12 | 12 | ja (unverändert) |
| ab 27. Dezember | – | – | – (kein Weihnachtsmodus) |

```js
christmasState(date) // -> { active, day, ornaments, candles, balls, star, start, end }
```

- `active`: Monat = Dezember **und** Tag 1–26
- `ornaments`: `min(Tag, 24)` – Gesamtzahl der Teile
- `candles`: `ceil(ornaments / 2)` (ungerade Tage)
- `balls`: `floor(ornaments / 2)` (gerade Tage)
- `star`: `active && Tag >= 24`
- Ungültiges Datum → `active: false` (kein Absturz)

**Tageswechsel:** Läuft die App über Mitternacht, muss die Wald-Ansicht neu gezeichnet werden.
Im bestehenden Ticker (`startTicker` in `src/app.js`) wird der zuletzt gezeichnete Tag mitgeführt;
ändert er sich, wird `renderWald()` erneut aufgerufen. Kein zusätzlicher Timer, kein Flackern.

**Zeitumstellung / falsche Systemzeit:** Es gilt schlicht die lokale Uhr. Kein Sonderfall, keine Korrektur.

---

## 4. Der Christbaum

Eigene, größere Tanne – nicht aus `SPECIES`, damit die Waldbäume unverändert bleiben.

- `viewBox 0 0 200 300`, Bodenlinie y = 286
- **6 Zweigetagen** von unten (breit, dunkelgrün) nach oben (schmal, heller), je Etage eine dunkle Schattenkopie für Tiefe
- Stamm aus zwei Brauntönen, weicher Bodenschatten, leichte Schneeauflage auf jeder Zweigkante
- **24 feste Plätze** (12 Kerzen, 12 Kugeln), strikt abwechselnd: pro Etage links Kerze, links Kugel, rechts Kerze, rechts Kugel
- Reihenfolge von unten nach oben, Tag 1 = unterster Platz (Kerze) → die Deko wächst natürlich nach oben, ohne Umverteilung
- Ab Tag 24 zusätzlich der Stern (5-zackig, gold, mit weichem Schein) an der Spitze

| Element | Ausführung |
|---|---|
| Kugel | r = 4,4, Aufhänger, Farben `#c14b3f` / `#d8a53c` / `#3f7f63` / `#3f6390`, Glanzlicht |
| Kerze | Wachskörper 4 × 9, Flamme, warmes Glühen, Flackern 2,6 s, versetzte Verzögerungen |
| Stern | Außenradius 15, Innenradius 6,2, zwei Goldtöne, drei weiche Glorien |
| Schnee | weiße Kante je Etage, Opazität 0,78 – „leicht bedeckt“, nicht zugeschneit |

**Barrierefreiheit:** Flackern und Flocken laufen nur, wenn `prefers-reduced-motion` nicht gesetzt ist.
Das SVG selbst ist `aria-hidden`; die Szene trägt ein `aria-label` („Verschneiter Wald mit … Bäumen und Weihnachtsbaum“).

---

## 5. Die Wald-Ansicht im Dezember

Grundlage ist die bestehende Szene (`forestSceneHTML`, jetzt in `src/forest.js`). Im Dezember wird sie erweitert:

- Szene wird breiter: **1140 × 380** statt 900 × 380, Waldfläche endet bei x = 860
- Christbaum steht rechts, `scale = 1.0` (300 Einheiten hoch), Basis auf der Bodenlinie
- Position: `max(Waldkante + 150, W - 125)` – bei kleinem Hain rückt der Baum näher heran, bei vollem Wald bleibt er rechts außen
- Die viewBox umfasst **Wald und Christbaum**, damit beide immer vollständig sichtbar sind (bestehende Zoom-Logik bleibt erhalten)
- Leerer Wald: Der Baum steht mittig in der Szene, darunter der bekannte Hinweistext
- Winter-Palette als CSS-Klassen-Override auf `.forest-scene.winter` (hell **und** dunkel), die Waldbäume bekommen Schneehauben über `treeSVG(…, snow = true)`
- Schneewehen am Boden, kühlerer Himmel und Hügel
- 30 Flocken, deterministisch per Seed, Fallzeit 9–17 s, keine Sprünge beim Neuzeichnen

**Nicht betroffen:** Timer-Baum, Mini-Modus, „Zuletzt gepflanzt“, Tagesverlauf, Baumarten-Kacheln.

---

## 6. Einstellungen

Neue Zeile in **Einstellungen → Darstellung**, direkt unter „Design“:

> **Weihnachtszeit im Wald** — Vom 1. bis 26. Dezember: Christbaum mit Kerzen, Kugeln und Schnee · Schalter

- Umschalten speichert sofort (`save()` wie bei den übrigen Schaltern) und zeichnet die Wald-Ansicht neu
- Außerhalb des Fensters ändert „an“ nichts – die Beschreibung erklärt das Fenster, damit niemand rätselt
- Der Schalter ist auch im November sichtbar (kein verstecktes UI), damit man ihn findet

---

## 7. Datenmodell

```json
{
  "version": 1,
  "settings": {
    "mode": "pomodoro",
    "workMinutes": 25,
    "breakMinutes": 5,
    "theme": "system",
    "sound": true,
    "autostart": false,
    "closeToTray": true,
    "miniAlwaysOnTop": true,
    "species": "eiche",
    "christmas": true
  }
}
```

- `christmas: true` ist Standard; `normalizeState()` ergänzt das Feld bei bestehenden `wald.json`-Dateien
- Nur `christmas === false` schaltet ab (robust gegen fehlende oder fremde Werte)
- Keine weiteren Daten: Der Fortschritt ergibt sich aus dem Datum, es gibt keine Migration von Deko-Ständen

---

## 8. Dateien und Änderungen

| Datei | Änderung | Stand |
|---|---|---|
| `src/christmas.js` | **neu**: `christmasState`, `christmasTreeSVG`, `ornamentSlots` | fertig |
| `src/forest.js` | **neu**: `forestSceneHTML` aus `app.js` ausgelagert, um Winter + Christbaum erweitert, feste Winterpalette für Vorschau | fertig |
| `src/trees.js` | optionaler `snow`-Parameter für Schneehauben auf allen Baumarten | fertig |
| `src/styles.css` | Winter-Palette hell/dunkel für `.forest-scene.winter` | fertig |
| `src/app.js` | Import aus `forest.js`, Einstellungszeile anbinden, Datum an die Szene geben, Tageswechsel im Ticker | fertig |
| `index.html` | Schalter „Weihnachtszeit im Wald“ in „Darstellung“ | fertig |
| `tests/check.mjs` | Prüfungen für Zeitfenster, Tageszählung, Stern, SVG-Mengen | fertig |
| `scripts/christmas-preview.mjs` | **neu**: erzeugt die Vorschau-SVGs | fertig |
| `design/christmas-preview.html` | **neu**: Vorschauseite mit allen Bildern | fertig |
| `design/preview/*.svg` | **neu**: erzeugte Beispielbilder | fertig |

---

## 9. Tests

In `tests/check.mjs` ergänzen (reine Logik, ohne DOM):

- 30.11. → `active: false`, `ornaments: 0`, `star: false`
- 1.12. → `active: true`, `ornaments: 1`, `candles: 1`, `balls: 0`, `star: false`
- 2.12. → `candles: 1`, `balls: 1`
- 3.12. → `candles: 2`, `balls: 1` (strikt abwechselnd, beginnend mit der Kerze)
- 24.12. → `ornaments: 24`, `candles: 12`, `balls: 12`, `star: true`
- 25./26.12. → weiterhin `24` / `12` / `12` und `star: true`
- 27.12. → `active: false`
- `christmasState` mit ungültigem Datum → `active: false`
- `christmasTreeSVG({ ornaments: 24, star: true })` enthält 12 Kugeln (`bz-ball`) und 12 Kerzen (`bz-candle`), mit `ornaments: 1` genau eine Kerze und keine Kugel
- `ornamentSlots()` liefert 24 Plätze, abwechselnd Kerze/Kugel, der erste Platz ist eine Kerze
- `forestSceneHTML([], { date: 24.12., palette })` enthält den Christbaum trotz leerem Wald
- `forestSceneHTML` ohne Winter bleibt unverändert (keine `winter`-Klasse, kein `christmas-tree`)

Zusätzlich: `npm run check`, `npm run build`, Sichtprüfung der Wald-Ansicht im Dezember und im Normalzustand.

---

## 10. Release

1. Version **0.3.0** in `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`
2. `README.md` (Installer-Dateiname) und `PLAN.md` (Status) aktualisieren
3. `npm run check` und `npm run build`
4. `npm run tauri build` → portable EXE und NSIS-Installer
5. Artefakte nach `release\` übernehmen, Commit `v0.3.0: Weihnachtszeit im Wald`

---

## 11. Beispielbilder

Alle Bilder entstehen aus dem echten Zeichen-Code, nicht aus einer Nachzeichnung.

| Datei | Inhalt |
|---|---|
| `design\preview\weihnachtsbaum-24-dezember.svg` | vollständiger Baum: 12 Kerzen, 12 Kugeln, Stern |
| `design\preview\weihnachtsbaum-verlauf.svg` | 1., 12. und 24. Dezember im Vergleich |
| `design\preview\wald-im-dezember.svg` | komplette Wald-Ansicht mit Christbaum rechts |
| `design\christmas-preview.html` | Vorschauseite mit allen drei Bildern |

Neu erzeugen: `node scripts/christmas-preview.mjs`

---

## 12. Bewusst nicht enthalten

- Kein Schnee in Timer, Mini-Modus oder Verlauf
- Keine Geschenke, kein Rentier, keine Musik, keine Adventskranz-Extras
- Keine rückwirkende Deko aus vergangenen Jahren
- Keine Statistik über die Weihnachtszeit
- Kein zweiter Schalter für den Winter allein
- Keine Änderung an Bäumen, die bereits im Wald stehen

---

## 13. Risiken und Stolpersteine

| Risiko | Gegenmaßnahme |
|---|---|
| App läuft über Mitternacht, Deko fehlt | Tageswechsel im bestehenden Ticker prüfen und neu zeichnen |
| Sehr großer Wald quetscht den Christbaum | Szene auf 1140 verbreitern, Baum zusätzlich in die viewBox aufnehmen |
| 24 Dekoteile wirken überladen | feste Plätze, kleine Kugeln (r 4,4), zurückhaltendes Flackern |
| Flocken springen bei jedem Neuzeichnen | deterministischer Seed für Position und Verzögerung |
| Dunkles Design wirkt grell durch Schnee | eigene, gedämpfte Winter-Palette für `data-theme="dark"` |
| Nutzer findet den Schalter nicht | Zeile dauerhaft in „Darstellung“, Text nennt das Zeitfenster |
