# Baumzeit – Projektplan

Fokus-Timer für Windows 11, bei dem während des Lernens ein Baum wächst und danach im eigenen Wald gepflanzt wird.

- **Projektordner:** `D:\Users\f2bea\KI-APPs-D\MeinWald`
- **Design-Vorschau:** `design\preview.html` (freigegeben am 21.11.2026)
- **Status:** umgesetzt als Version 0.1.0 (M1–M8 fertig, Release-Build getestet)

---

## 1. Ziel

Eine ruhige, entspannte Desktop-App: Lernzeit starten, Baum wächst live mit, am Ende wird er in den Wald gepflanzt. Nichts stirbt, jede Minute zählt. Kein Konto, keine Cloud, alle Daten lokal.

---

## 2. Getroffene Entscheidungen

| Thema | Entscheidung |
|---|---|
| Grundmodell | **Entspannt** – nichts stirbt, Baum wächst immer |
| Session-Modell | **Pomodoro (25/5, anpassbar) + freier Timer**, umschaltbar |
| Baum-Wachstum | **Echtzeit-Wachstum in Stufen**, danach Pflanzung in den Wald |
| Baumgröße im Wald | **entspricht der tatsächlichen Lernzeit** (5 Min = Setzling, volle Session = großer Baum) |
| Pausen | **Pause startet automatisch** (Toast + Ton), nächste Session per Klick |
| Fenster | **Hauptfenster + Mini-Modus (always on top) + Tray** |
| Schließen | legt die App in den **Tray**, Timer läuft weiter |
| Baumarten | **6 Arten, freigeschaltet über Gesamt-Lernstunden** (kein Shop) |
| Fächer/Tags | **keine** |
| Statistik | **kompakt**: Heute, Woche, Gesamt, Streak, 7-Tage-Balken |
| Sound | **nur Endsignal** (Glockenton, per WebAudio erzeugt, keine Audiodateien) |
| Design | **ruhig & modern**, handgezeichnet wirkende SVG-Bäume, Hell/Dunkel/System |
| Name | **Baumzeit** |
| Verteilung | **NSIS-Installer + portable .exe** |
| Sprache | **nur Deutsch** |
| Technik | **Tauri 2** (Rust + HTML/CSS/JS, WebView2) |

---

## 3. Systemvoraussetzungen (geprüft am 21.11.2026)

| Werkzeug | Version | Status |
|---|---|---|
| Node.js | v22.23.3 | vorhanden |
| npm | 10.9.9 | vorhanden |
| Rust | 1.95.0 | vorhanden |
| cargo | 1.95.0 | vorhanden |
| MSVC Build Tools | Visual Studio 2022 Community (VC++ x64) | vorhanden |
| WebView2 Runtime | installiert | vorhanden |
| git | 2.45.1 | vorhanden (Projekt ist noch kein Repo) |

---

## 4. Tech-Stack

- **Tauri 2** als App-Shell (Rust) – klein (~10 MB), nutzt vorinstalliertes WebView2
- **Vite + Vanilla JS** im Frontend (kein Framework, kein TypeScript-Zwang)
- **Keine externen UI-Bibliotheken** – eigenes CSS mit Custom Properties
- **Bäume als prozedurale SVGs** (deterministisch per Seed), kein Bildmaterial
- Tauri-Plugins: `notification`, `autostart`, `single-instance`, `opener`, `fs` (oder eigene Rust-Commands)

### Projektstruktur (Ziel)

```
MeinWald/
├─ PLAN.md
├─ design/preview.html          ← freigegebene Design-Vorlage
├─ package.json
├─ vite.config.js
├─ index.html                   ← Frontend-Einstieg (Hauptfenster)
├─ src/
│  ├─ main.js                   ← Bootstrap, Routing Haupt/Mini
│  ├─ app.js                    ← Zustand, Timer, Rendering
│  ├─ trees.js                  ← SVG-Generator (Arten, Stufen, Seeds)
│  ├─ stats.js                  ← Auswertung (Tag, Woche, Streak)
│  ├─ storage.js                ← Laden/Speichern (Tauri invoke)
│  ├─ sound.js                  ← WebAudio-Glocke
│  └─ styles.css
└─ src-tauri/
   ├─ Cargo.toml
   ├─ tauri.conf.json
   ├─ capabilities/default.json
   ├─ icons/                    ← App-Icon .ico/.png (muss noch erstellt werden)
   └─ src/
      ├─ main.rs
      └─ lib.rs                 ← Commands: load_state, save_state, tray, mini window
```

---

## 5. Architektur

### Fenster

| Fenster | Label | Eigenschaften |
|---|---|---|
| Hauptfenster | `main` | 900×700 (min. 760×600), normales Fenster, eigenes Titlebar-Layout im UI |
| Mini-Modus | `mini` | 320×110, rahmenlos, `alwaysOnTop`, `skipTaskbar`, öffnet über Button/Tray |
| Tray | – | Icon mit Menü: Öffnen, Pause/Fortsetzen, Mini-Modus, Beenden |

- Schließen des Hauptfensters → `preventDefault` + `hide()`
- Beenden nur über Tray-Menü oder Einstellungen
- Mini-Fenster lädt dieselbe Seite mit `?view=mini`

### Timer

- Zustandsmaschine: `idle → focus → break → idle`
- Zeitbasis: `Date.now()`-Deltas (kein Drift durch `setInterval`), Tick alle 250 ms für flüssige Anzeige
- Pause/Weiter friert die Restzeit ein
- Session-Ende → Ton + Toast + Pause startet automatisch (Pomodoro) bzw. Session wird gepflanzt (frei)
- App-Neustart mit laufender Session: Zustand wird wiederhergestellt

### Wachstum

- Fortschritt `p = vergangene Zeit / Zielzeit`
- Stufen: `p < 0.18` Spross, `< 0.45` Setzling, `< 0.75` junger Baum, sonst voller Baum
- Beim Beenden (auch vorzeitig): Baum wird mit `minutes` gepflanzt, Größe skaliert im Wald

### Persistenz

- Datei: `%APPDATA%\Baumzeit\wald.json`
- Schreiben atomar (temp + rename), Autosave nach jeder Session und bei Einstellungsänderung
- Rust-Commands `load_state` / `save_state`, Schema-Version für spätere Migrationen

---

## 6. Datenmodell

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
    "miniAlwaysOnTop": true
  },
  "sessions": [
    {
      "id": "uuid",
      "startedAt": "2026-11-21T14:02:11.000Z",
      "endedAt": "2026-11-21T14:27:05.000Z",
      "minutes": 24,
      "species": "eiche",
      "seed": 481923,
      "stage": 4,
      "completed": true
    }
  ],
  "unlockedSpecies": ["eiche", "birke", "tanne"]
}
```

- Statistiken werden aus `sessions` berechnet (kein doppeltes Führen von Summen)
- Streak: aufeinanderfolgende Kalendertage mit mindestens einer Session
- Baumarten-Freischaltung: Gesamtstunden ≥ Schwelle

### Baumarten & Schwellen

| Art | Freischaltung |
|---|---|
| Eiche | 0 Std (Start) |
| Birke | 10 Std |
| Tanne | 25 Std |
| Ahorn | 40 Std |
| Kirsche | 60 Std |
| Ulme | 80 Std |

---

## 7. Design-System

Quelle: `design/preview.html` (freigegeben). Werte übernehmen.

### Farben (hell)

| Token | Wert | Verwendung |
|---|---|---|
| `--bg-grad-a/b` | `#fbf9f4` → `#f2efe6` | Fensterhintergrund |
| `--surface` | `rgba(255,253,248,.93)` | Karten |
| `--surface-2` | `#f3f0e8` | Eingaben, Tracks |
| `--border` | `#ddd6c6` | Rahmen |
| `--text` | `#26312a` | Text |
| `--muted` | `#6d786f` | Sekundärtext |
| `--accent` | `#3f6d4e` | Buttons, aktive Tabs |
| `--accent-soft` | `#e3ecdd` | Icon-Hintergründe |

### Farben (dunkel)

| Token | Wert |
|---|---|
| `--bg-grad-a/b` | `#1e2420` → `#171b18` |
| `--surface` | `rgba(38,45,40,.72)` |
| `--surface-2` | `#2e3630` |
| `--border` | `#353e37` |
| `--text` | `#e7ece6` |
| `--muted` | `#94a094` |
| `--accent` | `#6ea87e` |

### Typografie & Form

- Schrift: `"Segoe UI Variable Text", "Segoe UI", system-ui`
- Basis 14 px, Überschriften 13–15 px semibold, Timer 42 px, Zahlen mit `font-variant-numeric: tabular-nums`
- Radien: Karten 16 px, Buttons/Inputs 9–10 px, Fenster 18 px
- Schatten: weich, zwei Ebenen (`--shadow`, `--shadow-sm`)

### Bäume

- Prozedurale SVGs, `viewBox 0 0 100 140`, Bodenlinie y = 132
- 5 Wachstumsstufen: 0 Samen, 1 Spross, 2 Setzling, 3 jung, 4 ausgewachsen
- 3 Bauformen: Laubbaum (runde Krone), Birke (schlanker Stamm, helle Krone), Tanne (3 Etagen)
- Je Art eigene Farbpalette + dunkle Schattenlage (Offset ~2 px) für Tiefe
- Krone aus überlappenden Ellipsen, deterministisch über Seed (mulberry32)
- Animation: sanftes Wiegen (`rotate ±0.7°`, 7 s) nur im Hauptbaum

### Ansichten

1. **Timer** – Modus-Chips, großer Baum mit Glow, Zeit, Fortschrittsbalken, Pause/Beenden, Hinweis; rechts Karten „Heute“, „Zuletzt gepflanzt“, Tipp
2. **Wald** – Tagesgruppen (Heute/Gestern/…), Baumreihen, darunter Baumarten mit Freischaltung
3. **Statistik** – 4 Kacheln + Balkendiagramm der letzten 7 Tage
4. **Einstellungen** – Timer, Verhalten, Darstellung, Daten (Speicherort)
5. **Mini-Modus** – dunkle Karte: Baum, Restzeit, Pause-Button

---

## 8. Meilensteine

| # | Meilenstein | Inhalt | Status |
|---|---|---|---|
| M0 | Planung & Design | Grill, Spezifikation, Design-Vorschau | **fertig** |
| M1 | Gerüst | `npm create tauri-app`, Vite, Fenster, Tray, Schließen→Tray, Single-Instance | **fertig** |
| M2 | Timer & Baum | Zustandsmaschine, driftfreier Timer, Live-Wachstum, Pause/Weiter, Endsignal | **fertig** |
| M3 | Wald & Speicherung | Sessions pflanzen, JSON-Persistenz, Wiederherstellung, Wald-Ansicht | **fertig** |
| M4 | Statistik | Tages-/Wochen-/Gesamtwerte, Streak, 7-Tage-Balken | **fertig** |
| M5 | Einstellungen | Längen, Modus, Theme, Sound, Autostart, Tray-Verhalten | **fertig** |
| M6 | Mini-Modus | zweites Fenster, always-on-top, Synchronisation mit Hauptfenster | **fertig** |
| M7 | Paketierung | App-Icon, NSIS-Installer, portable .exe, Test auf sauberem Win11 | **fertig** |
| M8 | Feinschliff | Animationen, Tastaturkürzel, Fehlerfälle, Doku | **fertig** |

### Definition of Done je Meilenstein

- `npm run tauri dev` startet fehlerfrei
- `cargo check` ohne Warnungen im eigenen Code
- Kernablauf manuell getestet (Start → Session → Pause → Pflanzung → Neustart)
- Keine Console-Fehler im Frontend

---

## 9. Build & Release

```powershell
npm install
npm run tauri dev          # Entwicklung
npm run tauri build        # Release
```

Artefakte:

- Installer: `src-tauri/target/release/bundle/nsis/Baumzeit_<version>_x64-setup.exe`
- Portable: `src-tauri/target/release/baumzeit.exe`
- Versionierung: `0.1.0` starten, Schema-Version im JSON separat

---

## 10. Risiken & Stolpersteine

| Risiko | Gegenmaßnahme |
|---|---|
| WebView2 fehlt auf Ziel-PC | Im NSIS-Installer als Voraussetzung prüfen (Win11 hat es standardmäßig) |
| Timer läuft bei System-Sleep falsch | Zeit über `Date.now()`-Deltas, Nachhol-Logik beim Aufwachen |
| Zwei Instanzen | `single-instance`-Plugin |
| Tray-Icon unter Windows | `.ico` mit mehreren Auflösungen (16/32/48/256) nötig |
| Mini-Fenster-Fokus stiehlt Tastatur | `focus: false` beim Öffnen, `skipTaskbar: true` |
| Datenverlust beim Schreiben | atomares Schreiben + Backup `wald.json.bak` |

---

## 11. Später möglich (bewusst nicht in v1)

- Ambient-Klänge (Regen, Wald, Feuer) per WebAudio
- Fächer/Kategorien und Auswertung pro Fach
- Jahres-Heatmap
- Export (CSV/JSON) und Import
- Eigene Baumarten / Shop
- Cloud-Sync, Konten
- Englische Übersetzung
- Tastaturkürzel und Windows-Fokus-Assist-Integration

---

## 12. Nächster Schritt beim nächsten Mal

1. `PLAN.md` und `design/preview.html` lesen
2. **M1** starten: Tauri-2-Projekt im Ordner anlegen (Frontend in `src/`, Rust in `src-tauri/`)
3. Design-CSS aus `design/preview.html` nach `src/styles.css` übernehmen
4. Tray + Schließen-in-Tray zum Laufen bringen, dann M2 (Timer & Baum)

> Hinweis: Der Projektordner ist noch kein Git-Repo. Vor M1 ggf. `git init` und ersten Commit anlegen.
