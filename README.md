# Baumzeit

Ruhiger Fokus-Timer fÃ¼r Windows 11: WÃ¤hrend des Lernens wÃ¤chst ein Baum live mit, am Ende wird er in deinem eigenen Wald gepflanzt. Nichts stirbt, jede Minute zÃ¤hlt â€“ alle Daten bleiben lokal.

## Funktionen

- **Pomodoro oder freier Timer** â€“ Lernzeit und Pause frei einstellbar (1â€“180 / 1â€“60 Min)
- **Live-Wachstum** in vier Stufen, Pause/Weiter ohne Zeitdrift
- **Wald** mit Tagesgruppen, BaumgrÃ¶ÃŸe nach tatsÃ¤chlicher Lernzeit
- **6 Baumarten**, freigeschaltet Ã¼ber Gesamtstunden (Eiche, Birke, Tanne, Ahorn, Kirsche, Ulme)
- **Statistik**: Heute, Woche, Gesamt, Streak und 7-Tage-Balkendiagramm
- **Hell/Dunkel/System**, sanfter Klangschalen-Ton am Sessionende
- **Waldansicht** als groÃŸes Wald-Bild mit allen BÃ¤umen, plus Tagesverlauf
- **Mini-Modus** (kompakt, immer im Vordergrund) Ã¼ber Titelleisten-Button oder `Strg+M`; **Tray**: SchlieÃŸen legt die App in den Tray, der Timer lÃ¤uft weiter
- **Autostart**, Wiederherstellung einer laufenden Session nach Neustart
- **Hilfe-Tab** mit Kurzbeschreibung, TastaturkÃ¼rzeln und Versionsnummer
- Installer und portable EXE

## Bedienung

| Aktion | Weg |
|---|---|
| Session starten / pausieren | Button oder `Leertaste` |
| Mini-Modus | Einstellungen, Tray-MenÃ¼ oder `Strg+M` |
| Hauptfenster Ã¶ffnen | Klick auf das Mini-Fenster, Tray-Icon oder Tray-MenÃ¼ |
| Beenden | Tray-MenÃ¼ â€žBeendenâ€œ (SchlieÃŸen legt nur in den Tray) |
| Vorzeitiges Beenden | â€žSession beendenâ€œ zweimal klicken (Sicherheitsabfrage) |

## Entwicklung

Voraussetzungen: Node.js, Rust (MSVC-Toolchain), WebView2.

```powershell
npm install
npm run dev            # nur Frontend im Browser
npm run tauri dev      # komplette Desktop-App
npm run check          # Logiktests (Statistik, BÃ¤ume, Zustand)
```

Rust prÃ¼fen:

```powershell
cd src-tauri
cargo check
```

## Release bauen

```powershell
npm run tauri build
```

Artefakte:

- Installer: `src-tauri/target/release/bundle/nsis/Baumzeit_0.3.0_x64-setup.exe`
- Portable: `src-tauri/target/release/baumzeit.exe`

## Daten

- Speicherort: `%APPDATA%\Baumzeit\wald.json`
- Beim Schreiben wird zuerst `wald.json.bak` angelegt, dann atomar Ã¼ber eine temporÃ¤re Datei ersetzt.
- Schema-Version im JSON: `1`
- Es gibt kein Konto, keine Cloud und keine Telemetrie.

## Projektstruktur

```
index.html              OberflÃ¤che (Haupt- und Mini-Ansicht)
src/main.js             Bootstrap, Auswahl Haupt/Mini
src/app.js              Zustand, Timer, Rendering, Tray-/Mini-Sync
src/trees.js            prozedurale Baum-SVGs, Stufen, GrÃ¶ÃŸen
src/stats.js            Tages-/Wochen-/Streak-Auswertung
src/storage.js          Tauri-Commands bzw. localStorage-Fallback
src/sound.js            WebAudio-Glocke
src/styles.css          Design-System (hell/dunkel)
src-tauri/src/lib.rs    Commands, Tray, Fenster, Persistenz
design/preview.html     freigegebene Design-Vorschau
PLAN.md                 Spezifikation und Meilensteine
tests/check.mjs         Logiktests
scripts/make-icon.mjs   erzeugt das Quell-Icon
```
