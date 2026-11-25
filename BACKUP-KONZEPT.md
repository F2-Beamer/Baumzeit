# Backupkonzept für `wald.json`

## Ziel

- Der Wald darf durch einen fehlerhaften Schreibvorgang, eine beschädigte Datei oder ein versehentliches Zurücksetzen nicht verloren gehen.
- Es sind **immer die letzten 7 Backups** vorhanden – ältere werden automatisch entfernt.
- Die Sicherung läuft ohne Zutun des Nutzers und ohne Cloud.

## Ablauf beim Speichern

1. Der neue Zustand wird zuerst in die temporäre Datei `wald.json.tmp` geschrieben.
2. Ist die vorhandene `wald.json` gültig, wird sie in den Backup-Ordner kopiert – aber nur, wenn das letzte Backup **mindestens eine Stunde** zurückliegt.
3. Anschließend ersetzt `wald.json.tmp` die bisherige `wald.json` atomar.
4. Nach dem Anlegen eines Backups werden die ältesten Stände gelöscht, sodass höchstens 7 übrig bleiben.

## Dateien und Orte

| Datei | Zweck |
| --- | --- |
| `%APPDATA%\Baumzeit\wald.json` | Aktueller Zustand |
| `%APPDATA%\Baumzeit\backups\wald-<Datum>_<Uhrzeit>.json` | Automatische Backups (lokale Zeit) |
| `%APPDATA%\Baumzeit\wald.json.tmp` | Kurzlebige temporäre Datei beim Schreiben |

Beispiel: `wald-2026-11-25_09-35-00.json`

## Rotation

- Aufbewahrt werden die **7 neuesten** Backups (sortiert nach Zeitstempel im Dateinamen).
- Beim Anlegen eines achten Backups wird das älteste gelöscht.
- Die Rotation betrifft ausschließlich Dateien mit dem Muster `wald-*.json` im Backup-Ordner.

## Warum höchstens ein Backup pro Stunde?

Gespeichert wird bei Ereignissen wie Session-Start, Pause, Session-Ende oder Einstellungsänderungen. Ohne Drosselung wären die sieben Stände nach wenigen Minuten verbraucht und würden kaum unterschiedliche Zustände abdecken.

Mit der Stundengrenze passt sich die Historie an die Nutzung an:

- **Tägliche Nutzung:** etwa ein Backup pro Tag → rund 7 Tage Historie.
- **Intensive Nutzung:** ein Stand pro Stunde → die letzten 7 Stunden.

## Wiederherstellung

### Automatisch

Beim Start wird `wald.json` geprüft:

- Fehlt die Datei oder ist sie kein gültiges JSON-Objekt, wird das **neueste gültige Backup** geladen und wieder als `wald.json` geschrieben.
- Beschädigte Backups werden übersprungen.

### Manuell

1. Baumzeit beenden (auch im Tray).
2. Gewünschtes Backup aus `%APPDATA%\Baumzeit\backups\` auswählen.
3. Die Datei als `%APPDATA%\Baumzeit\wald.json` kopieren (bestehende Datei überschreiben).
4. Baumzeit starten.

## Grenzen

- Backups liegen auf derselben Festplatte und schützen nicht vor einem Hardwaredefekt. Für eine externe Sicherung den Ordner `%APPDATA%\Baumzeit\` mitsichern.
- Im Browser-Betrieb (Vite ohne Tauri) wird `localStorage` verwendet; dort gibt es diese Datei-Backups nicht.
- Beschädigte Zustände werden nicht in die Backup-Kette übernommen, damit gute Stände nicht verdrängt werden.

## Implementierung

- `src-tauri/src/lib.rs`
  - `BACKUP_KEEP = 7`
  - `BACKUP_MIN_INTERVAL_SECS = 3600`
  - `backup_before_save()` – Sicherung vor dem Ersetzen
  - `prune_backups()` – Rotation auf die letzten 7
  - `load_state()` – Fallback auf das neueste gültige Backup
