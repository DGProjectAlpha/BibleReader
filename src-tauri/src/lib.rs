use tauri_plugin_dialog;
use tauri_plugin_fs;
use tauri_plugin_store;

use std::sync::atomic::{AtomicU32, Ordering};

static WINDOW_COUNTER: AtomicU32 = AtomicU32::new(1);

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Opens a new full reader window (independent App instance).
#[tauri::command]
fn open_new_window(app: tauri::AppHandle) -> Result<String, String> {
    let n = WINDOW_COUNTER.fetch_add(1, Ordering::SeqCst);
    let label = format!("reader-{}", n);

    let url = tauri::WebviewUrl::App("index.html".into());

    tauri::WebviewWindowBuilder::new(&app, &label, url)
        .title("Bible Reader")
        .inner_size(800.0, 600.0)
        .build()
        .map(|_| label.clone())
        .map_err(|e| format!("Failed to create window: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![greet, open_new_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
