# AGENTS.md

## Project Snapshot

- App: Dayly, a macOS menu bar calendar app for Chinese public holidays.
- Runtime: Tauri 2 desktop app with a React 19 + TypeScript + Vite frontend.
- Package manager: `pnpm`
- Frontend holiday data: `date-holidays` with `CN` holidays only.
- Current desktop target: macOS. Autostart behavior is implemented via `@tauri-apps/plugin-autostart` and `tauri-plugin-autostart`.

## What The App Does

- Shows a fixed-size floating calendar window from the tray icon.
- Tray title displays the current date as `YY-M-D星期X` and refreshes every minute.
- Main window is transparent, always on top, hidden by default, and removed from the taskbar/dock flow.
- Clicking the tray icon toggles the window. Losing focus hides the window.
- UI supports `zh` and `en`.
- Settings currently cover language switching and launch-at-login.

## Important Files

- `src/App.tsx`: main React UI, page switching, locale persistence, autostart toggle.
- `src/lib/calendar.ts`: calendar grid generation and holiday loading/cache.
- `src/i18n.ts`: all localized copy and locale types.
- `src/styles.css`: full app styling for the floating glassmorphism window.
- `src-tauri/src/main.rs`: tray behavior, window show/hide logic, activation policy, tray title loop.
- `src-tauri/tauri.conf.json`: window size and Tauri build/runtime config.
- `src-tauri/capabilities/default.json`: allowed Tauri permissions.

## Run And Verify

- Web frontend only: `pnpm dev`
- Frontend production build: `pnpm build`
- Desktop dev app: `pnpm tauri dev`
- Desktop production build: `pnpm tauri build`

There is currently no automated test suite in this repo. For most changes, verify with `pnpm build`. If the change affects tray behavior, window visibility, autostart, sizing, or positioning, also verify manually in `pnpm tauri dev`.

## Change Boundaries

- Keep changes surgical. This is a small app with a shallow structure; avoid introducing abstractions unless a change clearly requires them.
- Prefer editing the existing files above rather than creating new layers.
- Do not hand-edit build output such as `dist/` or `src-tauri/target/`.
- Preserve current app behavior unless the task explicitly changes it:
  - fixed window size `392x490`
  - transparent, undecorated, always-on-top tray window
  - hide-on-blur behavior
  - Chinese holiday scope

## Notes For Future Agents

- If a request mentions “calendar logic”, start in `src/lib/calendar.ts`.
- If a request mentions “tray”, “menu bar”, “window show/hide”, or “position”, start in `src-tauri/src/main.rs`.
- If a request is visual only, it is likely confined to `src/App.tsx` and `src/styles.css`.
- If copy changes are requested, update both `zh` and `en` unless the task explicitly says otherwise.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
