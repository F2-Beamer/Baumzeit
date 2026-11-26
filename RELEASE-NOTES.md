# Release Notes – Baumzeit

## v0.4.0 (25.11.2026) – Streak-Toleranz, Lernzeit am Timer und Vögel

### Neu
- **Streak mit Pausentagen:** Der Streak zählt Lerntage. Mindestens 5 Lerntage in einem rollierenden 7-Tage-Fenster halten ihn am Leben – so sind bis zu 2 Pausentage möglich.
- **Vogel-Bonus:** Ab 10 Lerntagen fliegen 3 Vögel durch die Wald-Ansicht, ab 20 Lerntagen 4 und ab 30 Lerntagen 5. Fällt der Streak unter 10, verschwinden sie wieder.
- **Lernzeit auf der Timer-Seite:** Zahlenfeld mit −/+ direkt unter der Baumart. Änderungen gelten für die nächste Session.

### Geändert
- **Statistik:** Der Streak wird als „X Lerntage“ angezeigt; darunter steht, wie viele Lerntage die letzten 7 Tage haben und ob der Streak sicher ist, ein Pausentag möglich ist oder heute gelernt werden sollte.
- **Timer:** Ein dezenter Hinweis erscheint nur, wenn der Streak ohne Session heute brechen würde.
- **Wald-Verlauf:** Zeigt nur noch die letzten 4 Lerntage als kompakte Karten; die Tage stehen nebeneinander statt jeweils über die volle Breite.
- **Hilfe und README:** 5-von-7-Regel, Timer-Lernzeit und Vogel-Stufen dokumentiert.

### Hinweis
- Die Vogel-Animation respektiert `prefers-reduced-motion`; bei aktivierter Einstellung bleiben die Vögel statisch.
- Keine Schema-Änderung: Der Streak wird weiterhin aus den Sessions berechnet.

### Artefakte
- Installer: `Baumzeit_0.4.0_x64-setup.exe`
- Portable: `Baumzeit-portable-0.4.0.exe`

## v0.3.3 (25.11.2026) – Automatische Backups

### Neu
- **Automatische Backups:** Vor jedem Schreiben wird der bisherige Stand von `wald.json` gesichert – ohne Zutun, ohne Cloud.
- **Immer die letzten 7:** Es werden maximal 7 Backups aufbewahrt; ältere werden automatisch entfernt.
- **Sinnvoller Abstand:** Höchstens ein Backup pro Stunde. Bei täglicher Nutzung ergibt das rund 7 Tage Historie, bei intensiver Nutzung die letzten 7 Stunden.
- **Automatische Rettung:** Fehlt `wald.json` oder ist sie beschädigt, wird beim Start das neueste gültige Backup geladen und zurückgeschrieben.

### Dokumentation
- Neues Dokument `BACKUP-KONZEPT.md` mit Ablauf, Rotation, manueller Wiederherstellung und Grenzen.
- Der Hilfe-Tab erklärt Speicherort und automatische Sicherung.
- README beschreibt Backup-Ordner und Wiederherstellung.

### Hinweis
- Backups liegen unter `%APPDATA%\Baumzeit\backups\` auf derselben Festplatte und schützen nicht vor einem Hardwaredefekt. Für eine externe Sicherung den Ordner `%APPDATA%\Baumzeit\` mitsichern.

### Artefakte
- Installer: `Baumzeit_0.3.3_x64-setup.exe`
- Portable: `Baumzeit-portable-0.3.3.exe`

## v0.3.2 (24.11.2026) – 60-Minuten-Baum und Blumenwiese

- **Baumwachstum angepasst:** Ein Baum ist jetzt nach 60 Minuten voll ausgewachsen (Stufen bei 15/30/60 Minuten).
- **Blumenwiese:** Nach dem ausgewachsenen Baum wächst bis 120 Minuten eine Blumenwiese in 4 Stufen um den Baum (75/90/105/120 Minuten).
- **Hilfe:** Die Wachstumsstufen für Baum und Blumenwiese sind im Hilfe-Tab übersichtlich beschrieben.
- **Hinweis:** Bestehende Sessions werden beim Laden neu eingestuft; dadurch können frühere Bäume je nach Lernzeit eine andere Wachstumsstufe anzeigen.

## v0.3.1 (24.11.2026) – Waldabstände feiner

### Geändert
- **Waldansicht:** Mindestabstand zwischen Bäumen halbiert, damit der Wald dichter wirkt. Der horizontale Mindestversatz bleibt bestehen, sodass keine Bäume direkt hintereinander stehen.

### Artefakte
- Installer: `Baumzeit_0.3.1_x64-setup.exe`
- Portable: `Baumzeit-portable-0.3.1.exe`

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
