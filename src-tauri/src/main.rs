#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    thread,
    time::Duration,
};

use chrono::{Datelike, Local, Weekday};
use tauri::{
    menu::{Menu, MenuEvent, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    ActivationPolicy, App, AppHandle, Manager, WebviewWindow, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_positioner::{Position, WindowExt};

const MAIN_WINDOW_LABEL: &str = "main";

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None::<Vec<&str>>,
        ))
        .setup(|app| {
            app.set_activation_policy(ActivationPolicy::Accessory);

            let tray = build_tray(app)?;
            start_tray_title_loop(tray);

            if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                let _ = window.hide();
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == MAIN_WINDOW_LABEL && matches!(event, WindowEvent::Focused(false)) {
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("failed to run Dayly");
}

fn build_tray(app: &App) -> tauri::Result<tauri::tray::TrayIcon> {
    let open = MenuItem::with_id(app, "open", "Open Dayly", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Dayly", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &quit])?;

    TrayIconBuilder::with_id("dayly-tray")
        .menu(&menu)
        .title(tray_title())
        .show_menu_on_left_click(false)
        .on_menu_event(handle_menu_event)
        .on_tray_icon_event(|tray, event| {
            tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_window(tray.app_handle());
            }
        })
        .build(app)
}

fn handle_menu_event(app: &AppHandle, event: MenuEvent) {
    match event.id.as_ref() {
        "open" => toggle_window(app),
        "quit" => app.exit(0),
        _ => {}
    }
}

fn toggle_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return;
    };

    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
        return;
    }

    show_window(&window);
}

fn show_window(window: &WebviewWindow) {
    let _ = window.move_window_constrained(Position::TrayCenter);
    let _ = window.show();
    let _ = window.set_focus();
}

fn start_tray_title_loop(tray: tauri::tray::TrayIcon) {
    thread::spawn(move || loop {
        let _ = tray.set_title(Some(&tray_title()));
        thread::sleep(Duration::from_secs(60));
    });
}

fn tray_title() -> String {
    let now = Local::now();
    format!(
        "{:02}-{:02}-{:02}{}",
        now.year() % 100,
        now.month(),
        now.day(),
        weekday_label(now.weekday())
    )
}

fn weekday_label(weekday: Weekday) -> &'static str {
    match weekday {
        Weekday::Mon => "星期一",
        Weekday::Tue => "星期二",
        Weekday::Wed => "星期三",
        Weekday::Thu => "星期四",
        Weekday::Fri => "星期五",
        Weekday::Sat => "星期六",
        Weekday::Sun => "星期日",
    }
}
