# AGENTS.md

## Commands
- `npm install` – Voraussetzungen: Node.js, Rust (MSVC-Toolchain), WebView2.
- `npm run dev` – nur Frontend im Browser (Vite, Port **1420**, `strictPort: true`).
- `npm run tauri dev` – komplette Desktop-App; startet Vite selbst über `beforeDevCommand` (nicht zusätzlich `npm run dev` starten).
- `npm run check` – einzige Testsuite (`tests/check.mjs`, Node, ohne DOM/Tauri). Es gibt keinen Linter, Formatter, Typecheck und keine CI.
- `npm run build` – Vite-Build nach `dist/`; `npm run tauri build` ruft ihn über `beforeBuildCommand` selbst auf.
- `cd src-tauri; cargo check` – Rust prüfen. PowerShell wertet Cargo-Stderr teils als Fehler; Exitcode (`$LASTEXITCODE`) prüfen.
- `node scripts/christmas-preview.mjs` – erzeugt `design/preview/*` aus `christmas.js`/`forest.js` neu.

## Architektur
- **Tauri 2 + Vanilla JS/Vite**, kein Framework/TypeScript. UI, Doku und Commit-Texte auf Deutsch.
- **Einstieg:** `index.html` → `src/main.js` → `src/app.js` (`App`). Hauptfenster und Mini (`index.html?view=mini`) sind getrennte Webviews, beide in `src-tauri/tauri.conf.json` definiert.
- **Frontend-Module:** `app.js` (Zustand, Timer, Rendering, Persistenz), `trees.js` (prozedurale Baum-SVGs), `forest.js` (Wald-Szene), `christmas.js` (Weihnachtszeit), `stats.js` (reine Statistik), `storage.js` (Tauri invoke bzw. `localStorage`-Fallback `baumzeit-state`), `sound.js` (Audio).
- **Mini-Fenster** speichert nie selbst: Es erhält Snapshots per Tauri-Event `timer:snapshot` vom Hauptfenster und sendet `mini:action`/`mini:request` zurück.
- **Rust-Backend:** `src-tauri/src/main.rs` → `baumzeit_lib::run()` in `src-tauri/src/lib.rs` (Persistenz, Tray, Fenster, Single-Instance, Autostart/Notification).
- **v0.4.0:** `PLAN-V0.4.0.md` – Streak-Toleranz (5 von 7 Lerntagen), Lernzeit auf der Timer-Seite, Vogel-Bonus; umgesetzt in `stats.js`, `forest.js`, `app.js`.

## Persistenz
- Datei: `%APPDATA%\Baumzeit\wald.json`, Schema-Version `1`; Schreiben atomar über `wald.json.tmp`.
- Backups: `%APPDATA%\Baumzeit\backups\wald-<Datum>_<Zeit>.json`, maximal 7, höchstens eines pro Stunde (`BACKUP_KEEP`, `BACKUP_MIN_INTERVAL_SECS` in `lib.rs`). Fehlt oder beschädigt `wald.json`, stellt `load_state` das neueste gültige Backup wieder her und schreibt es zurück.
- `save_state` prüft Größe (2 MB) und Top-Level-Typen (`version`, `settings`, `sessions`, `active`, `unlockedSpecies`). Neue Top-Level-Felder sind unkritisch; bestehende nicht umbenennen oder entfernen.
- Alle Zustandsänderungen laufen über `App.save()` (serialisierte Promise-Kette). Beim Laden normalisiert `normalizeState()` den Zustand; neue Felder dort defaulten und in `tests/check.mjs` abdecken.

## Konventionen / Gotchas
- `npm run check` importiert `src/app.js`: Dort nichts DOM- oder Tauri-abhängiges auf Modulebene ausführen, sonst bricht die Testsuite.
- Baumwachstum kommt ausschließlich aus `trees.js` (`stageForMinutes`, `meadowStageForMinutes`, `heightForMinutes`). `normalizeSession()` leitet `stage`/`meadowStage` aus den Minuten ab – geänderte Grenzen stufen bestehende Sessions beim nächsten Laden neu ein. Baumgröße ist ab 60 Minuten gedeckelt.
- Versionsanzeige im Hilfe-Tab: `__APP_VERSION__` kommt per Vite-`define` aus `package.json`; in Tauri wird zusätzlich `getVersion()` (aus `tauri.conf.json`) verwendet.
- Bei jeder inhaltlichen Änderung Version anheben in: `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `README.md` (Installer-Dateiname), `RELEASE-NOTES.md`. Danach `npm run check` und `npm run tauri build` (enthält den Vite-Build).
- Sicherheit: CSP in `src-tauri/tauri.conf.json` nicht aufweichen (erlaubt u. a. `asset:`/`blob:` für Medien); Capabilities in `src-tauri/capabilities/default.json` minimal halten. HTML nur mit `escapeHTML`/`escapeAttr` ausgeben; `innerHTML` nur mit bewusst sicheren/statischen Daten.
- Windows/Encoding: JSON/TOML/MD per Shell als UTF-8 **ohne BOM** schreiben; BOM bricht Vite/Tooling.

## Release
- Nach **jedem** `npm run tauri build`: portable EXE als `release/Baumzeit-portable-<version>.exe` und NSIS-Installer aus `src-tauri/target/release/bundle/nsis/` als `release/Baumzeit_<version>_x64-setup.exe` ablegen.
- `dist/`, `release/`, `src-tauri/target/`, `src-tauri/gen/` sind gitignored.
- Veröffentlichung als GitHub-Release mit Tag `v<version>` und beiden Artefakten; Commit-Stil: `v0.3.3: Kurzbeschreibung`.
