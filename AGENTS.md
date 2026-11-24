# AGENTS.md

## Commands
- `npm run dev` – Frontend nur im Browser (Vite, Port **1420**, `strictPort: true`).
- `npm run tauri dev` – komplette Desktop-App (Tauri + Vite devUrl `http://localhost:1420`).
- `npm run check` – Node-Logiktests (`tests/check.mjs`); kein DOM/Tauri, läuft direkt mit Node.
- `npm run build` – Vite-Produktionsbuild nach `dist/`.
- `npm run tauri build` – Release-Build. Portable EXE: `src-tauri/target/release/baumzeit.exe`. NSIS-Installer: `src-tauri/target/release/bundle/nsis/Baumzeit_<version>_x64-setup.exe`.
- Rust prüfen: `cd src-tauri; cargo check`. In PowerShell kann Cargo-Stderr als Fehler wirken; Exitcode prüfen (`$LASTEXITCODE`).

## Architektur
- **Tauri 2 + Vanilla JS/Vite**, kein Framework/TypeScript. UI-Sprache: Deutsch.
- **Frontend-Einstieg:** `index.html` → `src/main.js` → `src/app.js` (`App`-Klasse). Zwei Ansichten: Hauptfenster und Mini (`?view=mini`).
- **Frontend-Module:** `app.js` (Zustand/Timer/Rendering/Sync), `trees.js` (prozedurale Baum-SVGs), `forest.js` (große Wald-SVG-Szene), `christmas.js` (Weihnachtszeit-Logik/SVG), `stats.js` (reine Statistik), `storage.js` (Tauri invoke oder `localStorage`-Fallback), `sound.js` (Audio).
- **Rust-Backend:** `src-tauri/src/main.rs` → `baumzeit_lib::run()` in `src-tauri/src/lib.rs`. Verantwortlich für Persistenz, Tray, Fensterverhalten, Single-Instance, Autostart/Notification-Plugins.
- **Persistenz:** JSON `%APPDATA%\Baumzeit\wald.json`, Schema-Version `1`. Laden/Speichern über Rust-Commands; Zustand beim Laden über `normalizeState()` normalisieren.

## Konventionen / Gotchas
- **State-Änderungen:** Bei neuen Feldern immer `normalizeState()`/Defaults, relevante `tests/check.mjs`-Fälle und ggf. Migration/Kompatibilität mit bestehender `wald.json` beachten.
- **Sicherheit:** CSP in `src-tauri/tauri.conf.json` nicht deaktivieren; Capabilities in `src-tauri/capabilities/default.json` minimal halten. `save_state` prüft Größe und Top-Level-Form. Bei HTML-Ausgabe `escapeHTML`/`escapeAttr` verwenden; `innerHTML` nur mit bewusst sicheren/statischen Daten.
- **Version-Bump (Release):** `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `README.md` (Installer-Dateiname), ggf. `PLAN.md`/Release Notes. Danach `npm run check`, `npm run build`, `npm run tauri build`.
- **Artefakte:** `dist/`, `release/`, `src-tauri/target/`, `src-tauri/gen/` sind gitignored. Nach `npm run tauri build` für Releases die portable EXE als `release/Baumzeit-portable-<version>.exe` und den NSIS-Installer aus `src-tauri/target/release/bundle/nsis/` nach `release/` kopieren; Upload über GitHub Releases.
- **Weihnachtszeit:** Datum/Deko kommt aus `src/christmas.js`; Wald-Darstellung aus `src/forest.js`. Vorschau-SVGs neu erzeugen: `node scripts/christmas-preview.mjs`.
- **Windows/Encoding:** Beim Schreiben von JSON/TOML/MD per Shell UTF-8 **ohne BOM** verwenden; BOM kann Vite/Tooling brechen.