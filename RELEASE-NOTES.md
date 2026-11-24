# Release Notes – Baumzeit

## v0.3.0 (24.11.2026) – Weihnachtszeit im Wald

### Neu
- **Weihnachtszeit im Wald (1.–26. Dezember):** Rechts neben dem Hain steht ein geschmückter Christbaum.
- **Tägliche Deko:** Jeden Tag kommt abwechselnd eine Kerze oder eine Kugel dazu – am 1. Dezember eine Kerze, am 2. eine Kugel, am 3. wieder eine Kerze usw.
- **Am 24. Dezember:** 12 Kerzen, 12 Kugeln und ein Stern an der Spitze (bleibt bis 26. Dezember).
- **Winterlook:** Leicht verschneiter Boden, Schneehauben auf den Baumkronen, kühlerer Himmel und langsam fallende Schneeflocken.
- **Einstellung:** „Weihnachtszeit im Wald“ unter *Einstellungen → Darstellung* (Standard: an). Ausgeschaltet bleibt der normale Wald – auch im Dezember.
- **Hinweis:** Der Effekt gilt nur in der Wald-Ansicht; Timer, Mini-Modus, Verlauf und Statistik bleiben unverändert.

### Verbesserungen
- Wald-Szene als eigenes Modul (`src/forest.js`) aufgebaut; Weihnachtslogik separat in `src/christmas.js`.
- Logiktests für Zeitfenster, Deko-Reihenfolge, Stern, leeren Wald und Einstellungs-Migration ergänzt.

### Behoben
- Mojibake/kaputte Sonderzeichen in Countdown, Verlauf und README korrigiert.

### Artefakte
- Installer: `Baumzeit_0.3.0_x64-setup.exe`
- Portable: `Baumzeit-portable-0.3.0.exe`
