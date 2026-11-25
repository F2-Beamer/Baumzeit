use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::SystemTime;

use chrono::Local;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, WindowEvent};

/// Beim Schließen des Hauptfensters in den Tray legen (per Einstellung änderbar).
static CLOSE_TO_TRAY: AtomicBool = AtomicBool::new(true);
/// Verhindert das Abfangen des Schließen-Ereignisses beim echten Beenden.
static QUITTING: AtomicBool = AtomicBool::new(false);

fn data_dir() -> PathBuf {
    if let Ok(appdata) = std::env::var("APPDATA") {
        PathBuf::from(appdata).join("Baumzeit")
    } else {
        PathBuf::from(".").join("Baumzeit")
    }
}

fn state_file() -> PathBuf {
    data_dir().join("wald.json")
}

// ---------- Backups ----------
// Vor jedem Schreiben wird der bisherige Stand gesichert. Es wird höchstens
// einmal pro Stunde ein Backup angelegt, damit die sieben Stände nicht alle
// aus derselben Minute stammen. Immer die letzten BACKUP_KEEP bleiben erhalten.

/// Anzahl der aufbewahrten Backups von wald.json.
const BACKUP_KEEP: usize = 7;
/// Mindestabstand zwischen zwei automatischen Backups in Sekunden.
const BACKUP_MIN_INTERVAL_SECS: u64 = 60 * 60;
const BACKUP_PREFIX: &str = "wald-";
const BACKUP_SUFFIX: &str = ".json";

fn backups_dir() -> PathBuf {
    data_dir().join("backups")
}

fn is_backup_file(path: &Path) -> bool {
    path.is_file()
        && path
            .file_name()
            .and_then(|name| name.to_str())
            .map(|name| name.starts_with(BACKUP_PREFIX) && name.ends_with(BACKUP_SUFFIX))
            .unwrap_or(false)
}

/// Alle Backups, aufsteigend nach dem Zeitstempel im Dateinamen.
fn backup_files() -> Vec<PathBuf> {
    let Ok(entries) = fs::read_dir(backups_dir()) else {
        return Vec::new();
    };
    let mut files: Vec<PathBuf> = entries
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| is_backup_file(path))
        .collect();
    files.sort();
    files
}

fn newest_backup_age_secs() -> Option<u64> {
    let newest = backup_files().pop()?;
    let modified = fs::metadata(&newest).ok()?.modified().ok()?;
    SystemTime::now()
        .duration_since(modified)
        .ok()
        .map(|age| age.as_secs())
}

/// Entfernt die ältesten Backups, sodass nur die letzten BACKUP_KEEP übrig bleiben.
fn prune_backups() {
    let files = backup_files();
    if files.len() <= BACKUP_KEEP {
        return;
    }
    for old in &files[..files.len() - BACKUP_KEEP] {
        let _ = fs::remove_file(old);
    }
}

/// Sichert den bisherigen Stand, bevor wald.json ersetzt wird.
fn backup_before_save(source: &Path) {
    if !source.exists() {
        return;
    }
    if let Some(age) = newest_backup_age_secs() {
        if age < BACKUP_MIN_INTERVAL_SECS {
            return;
        }
    }
    let Ok(current) = fs::read_to_string(source) else {
        return;
    };
    // Beschädigte Stände nicht in die Backup-Kette aufnehmen.
    if !is_valid_state(&current) {
        return;
    }
    let dir = backups_dir();
    if fs::create_dir_all(&dir).is_err() {
        return;
    }
    let stamp = Local::now().format("%Y-%m-%d_%H-%M-%S");
    let dest = dir.join(format!("{BACKUP_PREFIX}{stamp}{BACKUP_SUFFIX}"));
    if fs::write(&dest, current.as_bytes()).is_err() {
        return;
    }
    prune_backups();
}

fn is_valid_state(raw: &str) -> bool {
    serde_json::from_str::<serde_json::Value>(raw)
        .map(|value| value.is_object())
        .unwrap_or(false)
}

/// Schreibt den Zustand atomar über eine temporäre Datei.
fn write_state_file(raw: &str) -> Result<(), String> {
    let dir = data_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let tmp = dir.join("wald.json.tmp");
    fs::write(&tmp, raw.as_bytes()).map_err(|e| e.to_string())?;
    fs::rename(&tmp, state_file()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_state() -> Result<Option<String>, String> {
    let path = state_file();
    if path.exists() {
        match fs::read_to_string(&path) {
            Ok(raw) if is_valid_state(&raw) => return Ok(Some(raw)),
            Ok(_) => eprintln!("wald.json ist beschädigt – prüfe Backups"),
            Err(err) => eprintln!("wald.json konnte nicht gelesen werden: {err}"),
        }
    }
    // Datei fehlt oder ist unbrauchbar: neuestes gültiges Backup wiederherstellen.
    for backup in backup_files().iter().rev() {
        let Ok(raw) = fs::read_to_string(backup) else {
            continue;
        };
        if !is_valid_state(&raw) {
            continue;
        }
        if let Err(err) = write_state_file(&raw) {
            eprintln!("Backup konnte nicht wiederhergestellt werden: {err}");
        }
        return Ok(Some(raw));
    }
    Ok(None)
}

const MAX_STATE_BYTES: usize = 2 * 1024 * 1024;

#[tauri::command]
fn save_state(state: String) -> Result<(), String> {
    if state.len() > MAX_STATE_BYTES {
        return Err("Zustand ist zu groß".to_string());
    }
    // Sicherheitsnetz: nur gültiges, plausibles JSON auf die Platte schreiben.
    let value: serde_json::Value =
        serde_json::from_str(&state).map_err(|e| format!("Ungültiger Zustand: {e}"))?;
    let obj = value
        .as_object()
        .ok_or_else(|| "Ungültiger Zustand: Root muss ein Objekt sein".to_string())?;
    if let Some(v) = obj.get("version") {
        if !v.is_number() {
            return Err("Ungültiger Zustand: version muss eine Zahl sein".to_string());
        }
    }
    if let Some(v) = obj.get("settings") {
        if !v.is_object() {
            return Err("Ungültiger Zustand: settings muss ein Objekt sein".to_string());
        }
    }
    if let Some(v) = obj.get("sessions") {
        if !v.is_array() {
            return Err("Ungültiger Zustand: sessions muss ein Array sein".to_string());
        }
    }
    if let Some(v) = obj.get("active") {
        if !(v.is_object() || v.is_null()) {
            return Err("Ungültiger Zustand: active muss ein Objekt oder null sein".to_string());
        }
    }
    if let Some(v) = obj.get("unlockedSpecies") {
        if !v.is_array() {
            return Err("Ungültiger Zustand: unlockedSpecies muss ein Array sein".to_string());
        }
    }

    let dir = data_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = state_file();
    let tmp = dir.join("wald.json.tmp");

    fs::write(&tmp, state.as_bytes()).map_err(|e| e.to_string())?;
    backup_before_save(&path);
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn data_path() -> String {
    state_file().to_string_lossy().to_string()
}

#[tauri::command]
fn open_data_folder() -> Result<(), String> {
    let dir = data_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    #[cfg(windows)]
    {
        let explorer = std::env::var("SystemRoot")
            .map(|root| PathBuf::from(root).join("explorer.exe"))
            .unwrap_or_else(|_| PathBuf::from(r"explorer.exe"));
        std::process::Command::new(explorer)
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(windows))]
    {
        let _ = &dir;
    }
    Ok(())
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn show_main(app: tauri::AppHandle) {
    show_main_window(&app);
}

#[tauri::command]
fn hide_main(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn close_main(app: tauri::AppHandle) {
    if CLOSE_TO_TRAY.load(Ordering::SeqCst) {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.hide();
        }
    } else {
        QUITTING.store(true, Ordering::SeqCst);
        app.exit(0);
    }
}

#[tauri::command]
fn minimize_main(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.minimize();
    }
}

#[tauri::command]
fn toggle_maximize(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_maximized().unwrap_or(false) {
            let _ = window.unmaximize();
        } else {
            let _ = window.maximize();
        }
    }
}

#[tauri::command]
fn toggle_mini(app: tauri::AppHandle, always_on_top: Option<bool>) {
    if let Some(window) = app.get_webview_window("mini") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.set_always_on_top(always_on_top.unwrap_or(true));
            let _ = window.show();
        }
    }
}

#[tauri::command]
fn hide_mini(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("mini") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn set_mini_always_on_top(app: tauri::AppHandle, enabled: bool) {
    if let Some(window) = app.get_webview_window("mini") {
        let _ = window.set_always_on_top(enabled);
    }
}

#[tauri::command]
fn set_close_to_tray(enabled: bool) {
    CLOSE_TO_TRAY.store(enabled, Ordering::SeqCst);
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    QUITTING.store(true, Ordering::SeqCst);
    app.exit(0);
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            data_path,
            open_data_folder,
            show_main,
            hide_main,
            close_main,
            minimize_main,
            toggle_maximize,
            toggle_mini,
            hide_mini,
            set_mini_always_on_top,
            set_close_to_tray,
            quit_app
        ])
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "Öffnen", true, None::<&str>)?;
            let pause = MenuItem::with_id(app, "pause", "Pause / Fortsetzen", true, None::<&str>)?;
            let mini = MenuItem::with_id(app, "mini", "Mini-Modus", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "Beenden", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &pause, &mini, &separator, &quit])?;

            let mut builder = TrayIconBuilder::with_id("main-tray")
                .tooltip("Baumzeit")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main_window(app),
                    "pause" => {
                        let _ = app.emit_to("main", "tray:toggle-pause", ());
                    }
                    "mini" => {
                        let _ = app.emit_to("main", "tray:toggle-mini", ());
                    }
                    "quit" => {
                        QUITTING.store(true, Ordering::SeqCst);
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                });

            if let Some(icon) = app.default_window_icon().cloned() {
                builder = builder.icon(icon);
            }
            builder.build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                match window.label() {
                    "main" => {
                        if QUITTING.load(Ordering::SeqCst) {
                            return;
                        }
                        if CLOSE_TO_TRAY.load(Ordering::SeqCst) {
                            api.prevent_close();
                            let _ = window.hide();
                        } else {
                            QUITTING.store(true, Ordering::SeqCst);
                            window.app_handle().exit(0);
                        }
                    }
                    "mini" => {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                    _ => {}
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten von Baumzeit");
}
