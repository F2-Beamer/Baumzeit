# Baumzeit

Ruhiger Fokus-Timer für Windows 11: Während des Lernens wächst ein Baum live mit, am Ende wird er in deinem eigenen Wald gepflanzt. Nichts stirbt, jede Minute zählt – alle Daten bleiben lokal.

## Funktionen

- **Pomodoro oder freier Timer** – Lernzeit und Pause frei einstellbar (1–180 / 1–60 Min)
- **Live-Wachstum** in vier Stufen, Pause/Weiter ohne Zeitdrift
- **Wald** mit Tagesgruppen, Baumgröße nach tatsächlicher Lernzeit
- **6 Baumarten**, freigeschaltet über Gesamtstunden (Eiche, Birke, Tanne, Ahorn, Kirsche, Ulme)
- **Statistik**: Heute, Woche, Gesamt, Streak und 7-Tage-Balkendiagramm
- **Hell/Dunkel/System**, sanfter Klangschalen-Ton am Sessionende
- **Waldansicht** als großes Wald-Bild mit allen Bäumen, plus Tagesverlauf
- **Weihnachtszeit** (1.–26. Dezember): Christbaum rechts neben dem Wald, täglich abwechselnd Kerze und Kugel, Stern ab dem 24., Winterlook mit Schnee – per Schalter in den Einstellungen
- **Mini-Modus** (kompakt, immer im Vordergrund) über Titelleisten-Button oder `Strg+M`; **Tray**: Schließen legt die App in den Tray, der Timer läuft weiter
- **Autostart**, Wiederherstellung einer laufenden Session nach Neustart
- **Hilfe-Tab** mit Kurzbeschreibung, Tastaturkürzeln und Versionsnummer
- Installer und portable EXE

## Bedienung

| Aktion | Weg |
|---|---|
| Session starten / pausieren | Button oder `Leertaste` |
| Mini-Modus | Einstellungen, Tray-Menü oder `Strg+M` |
| Hauptfenster öffnen | Klick auf das Mini-Fenster, Tray-Icon oder Tray-Menü |
| Beenden | Tray-Menü „Beenden“ (Schließen legt nur in den Tray) |
| Vorzeitiges Beenden | „Session beenden“ zweimal klicken (Sicherheitsabfrage) |

## Entwicklung

Voraussetzungen: Node.js, Rust (MSVC-Toolchain), WebView2.

```powershell
npm install
npm run dev            # nur Frontend im Browser
npm run tauri dev      # komplette Desktop-App
npm run check          # Logiktests (Statistik, Bäume, Zustand)
```

Rust prüfen:

```powershell
cd src-tauri
cargo check
```

## Release bauen

```powershell
npm run tauri build
```

Artefakte:

- Installer: `src-tauri/target/release/bundle/nsis/Baumzeit_0.3.3_x64-setup.exe`
- Portable: `src-tauri/target/release/baumzeit.exe`

## Daten

- Speicherort: `%APPDATA%\Baumzeit\wald.json`
- Beim Schreiben wird der Zustand atomar über eine temporäre Datei ersetzt.
- Automatische Backups liegen in `%APPDATA%\Baumzeit\backups\` als `wald-<Datum>_<Uhrzeit>.json`.
- Es wird höchstens einmal pro Stunde ein Backup angelegt; die letzten **7** Backups bleiben erhalten.
- Ist `wald.json` beim Start fehlend oder beschädigt, wird automatisch das neueste gültige Backup geladen und zurückgeschrieben.
- Schema-Version im JSON: `1`
- Es gibt kein Konto, keine Cloud und keine Telemetrie.

## Projektstruktur

```
index.html              Oberfläche (Haupt- und Mini-Ansicht)
src/main.js             Bootstrap, Auswahl Haupt/Mini
src/app.js              Zustand, Timer, Rendering, Tray-/Mini-Sync
src/trees.js            prozedurale Baum-SVGs, Stufen, Größen
src/forest.js           Wald-Szene als SVG (Winter/Christbaum)
src/christmas.js        Weihnachtszeit: Datum, Christbaum, Deko
src/stats.js            Tages-/Wochen-/Streak-Auswertung
src/storage.js          Tauri-Commands bzw. localStorage-Fallback
src/sound.js            WebAudio-Glocke
src/styles.css          Design-System (hell/dunkel)
src-tauri/src/lib.rs    Commands, Tray, Fenster, Persistenz
design/preview.html     freigegebene Design-Vorschau
design/christmas-preview.html  Vorschau der Weihnachtszeit
PLAN.md                 Spezifikation und Meilensteine
PLAN-WEIHNACHTSZEIT.md   Plan für die Weihnachtszeit
RELEASE-NOTES.md        Release-Notizen
tests/check.mjs         Logiktests
scripts/make-icon.mjs   erzeugt das Quell-Icon
```
