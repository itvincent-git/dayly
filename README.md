# Dayly

<p align="center">
  <img src="./src-tauri/icons/icon.png" alt="Dayly icon" width="128" height="128" />
</p>

<p align="center">
  A lightweight macOS menu bar calendar for Chinese public holidays.
</p>

<p align="center">
  Built with Tauri 2, React 19, TypeScript, and Vite.
</p>

## Overview

Dayly is a small desktop app that lives in the macOS menu bar and opens a floating calendar window on demand. It focuses on Chinese public holidays and transfer workdays, with a simple bilingual interface in Chinese and English.

The app is designed for quick access:

- Click the tray icon to toggle the calendar window.
- The tray title shows the current date in `YY-M-D星期X` format.
- The window hides automatically when it loses focus.
- Launch-at-login can be toggled inside the app.

## Features

- macOS menu bar app with a fixed floating window
- Monthly calendar view with today highlighting
- Chinese public holiday and transfer workday labels
- Bilingual UI: `zh` and `en`
- Launch at login support
- Transparent, always-on-top tray window

## Stack

- Tauri 2
- React 19
- TypeScript
- Vite
- Rust

## Requirements

Before running the app locally, make sure you have:

- Node.js
- `pnpm` `10.32.1` or compatible
- Rust toolchain
- Xcode Command Line Tools on macOS

Typical setup:

```bash
xcode-select --install
rustup default stable
pnpm install
```

## Development

Run the frontend only:

```bash
pnpm dev
```

Run the full desktop app in development:

```bash
pnpm tauri dev
```

Build the frontend:

```bash
pnpm build
```

Build the macOS app bundle:

```bash
pnpm tauri build
```

## Current Behavior

- Desktop target is currently macOS only
- Window size is fixed at `392x490`
- Main window is transparent, undecorated, always on top, and hidden by default
- Clicking the tray icon shows or hides the window
- Losing focus hides the window
- Holiday data is loaded at runtime for `CN` from the `holiday-calendar` dataset

## Project Structure

```text
src/
  App.tsx              Main UI, page switching, locale persistence, autostart toggle
  i18n.ts              Localized copy for zh/en
  lib/calendar.ts      Calendar grid generation and holiday loading
  styles.css           Floating window styles
src-tauri/
  src/main.rs          Tray behavior and window show/hide logic
  tauri.conf.json      Tauri app and window configuration
  capabilities/        Allowed desktop permissions
```

## Notes

- There is currently no automated test suite in this repo.
- `pnpm build` is the main quick verification step for frontend changes.
- For tray behavior, window positioning, visibility, or autostart changes, verify with `pnpm tauri dev`.

## License

No license file is currently included in this repository.
