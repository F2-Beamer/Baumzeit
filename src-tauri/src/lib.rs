use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};

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

#[tauri::command]
fn load_state() -> Result<Option<String>, String> {
    let path = state_file();
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(&path)
        .map(Some)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_state(state: String) -> Result<(), String> {
    // Sicherheitsnetz: nur gültiges JSON auf die Platte schreiben.
    serde_json::from_str::<serde_json::Value>(&state)
        .map_err(|e| format!("Ungültiger Zustand: {e}"))?;

    let dir = data_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = state_file();
    let tmp = dir.join("wald.json.tmp");

    fs::write(&tmp, state.as_bytes()).map_err(|e| e.to_string())?;
    if path.exists() {
        let _ = fs::copy(&path, dir.join("wald.json.bak"));
    }
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
        std::process::Command::new("explorer.exe")
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
