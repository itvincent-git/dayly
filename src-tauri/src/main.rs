#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{thread, time::Duration};

use chrono::{Datelike, Local, Weekday};
#[cfg(target_os = "macos")]
use objc2::MainThreadMarker;
#[cfg(target_os = "macos")]
use objc2_app_kit::NSWindow;
#[cfg(target_os = "macos")]
use objc2_foundation::NSPoint;
use tauri::{
    menu::{Menu, MenuEvent, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    ActivationPolicy, App, AppHandle, Manager, WebviewWindow, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;

const MAIN_WINDOW_LABEL: &str = "main";
const TRAY_ID: &str = "dayly-tray";

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

    TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .title(tray_title())
        .show_menu_on_left_click(false)
        .on_menu_event(handle_menu_event)
        .on_tray_icon_event(|tray, event| {
            tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

            if let TrayIconEvent::Click {
                rect: _,
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

    show_window(app, &window);
}

fn show_window(app: &AppHandle, window: &WebviewWindow) {
    let positioned = position_window_from_tray(app, window).unwrap_or(false);

    if !positioned {
        let _ = tauri_plugin_positioner::WindowExt::move_window_constrained(
            window,
            tauri_plugin_positioner::Position::TrayCenter,
        );
    }

    let _ = window.show();
    let _ = window.set_focus();
}

#[cfg(target_os = "macos")]
fn position_window_from_tray(app: &AppHandle, window: &WebviewWindow) -> tauri::Result<bool> {
    let Some(tray) = app.tray_by_id(TRAY_ID) else {
        return Ok(false);
    };

    let Some((tray_x, tray_y, tray_width, visible_x, visible_width)) =
        tray.with_inner_tray_icon(|inner| unsafe {
            let mtm = MainThreadMarker::new()?;
            let status_item = inner.ns_status_item()?;
            let button = status_item.button(mtm)?;
            let tray_window = button.window()?;
            let tray_frame = tray_window.frame();
            let visible_frame = tray_window.screen()?.visibleFrame();

            Some((
                tray_frame.origin.x,
                tray_frame.origin.y,
                tray_frame.size.width,
                visible_frame.origin.x,
                visible_frame.size.width,
            ))
        })?
    else {
        return Ok(false);
    };

    let scale_factor = window.scale_factor()?;
    let window_size = window.outer_size()?;
    let window_width = window_size.width as f64 / scale_factor;
    let x = (tray_x + tray_width / 2.0 - window_width / 2.0).clamp(
        visible_x,
        (visible_x + visible_width - window_width).max(visible_x),
    );
    let top_left = NSPoint::new(x, tray_y);
    let ns_window = window.ns_window()? as usize;

    window.run_on_main_thread(move || unsafe {
        let ns_window: &NSWindow = &*(ns_window as *mut std::ffi::c_void).cast();
        ns_window.setFrameTopLeftPoint(top_left);
    })?;

    Ok(true)
}

#[cfg(not(target_os = "macos"))]
fn position_window_from_tray(_app: &AppHandle, _window: &WebviewWindow) -> tauri::Result<bool> {
    Ok(false)
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
