# Stage 0 verification: skeleton

Date: 2026-10-07. Branch `claude/dreamy-rubin-31q8dd`. Last code commit before this report: `e6fcf2e`.

## What was checked

### 1. Automated checks (`npm run check`)

| Check | Result |
|---|---|
| `tsc -b` (app + node projects, strict, noUncheckedIndexedAccess) | clean |
| `eslint .` (typescript-eslint, react-hooks, react-refresh, pure-module import guard for `src/engine`, `src/game`) | clean |
| `vitest run` | 4 files, 18 tests passed |
| `validate-words` | ok, 0 entries (base starts in stage 1) |
| `vite build` (production) | ok, main bundle 335.7 kB / 105.8 kB gzip, 15 precache entries |
| Production bundle contains no dev-tool code (`grep dev-toggle dist/assets/*.js`) | confirmed, none |

### 2. Browser pass (Playwright, real Chromium 1194, e2e build with dev tools)

Projects: `phone` 393×873 touch dpr2 (primary), `phone-small` 360×800, `desktop` 1280×800. All 30 tests pass (10 scenarios × 3 projects).

- `e2e/smoke.spec.ts`: Home → Setup (pick B1, 15 new words) → Game stub → Card (translation hidden until **Show translation**) → Continue → Summary → Home → Map (100 cells) → Speed check → Settings. Settings survive a reload (IndexedDB). Sound toggle persists. Console has no errors or warnings during the flow.
- Hash routing: `#/settings` opens the screen directly; browser back returns to Home.
- No horizontal scroll on any of the 8 screens, on all three viewports.
- Manifest served under `/words-learning-game/`, `start_url` and `scope` equal the base, all three icons return 200, `sw.js` returns 200.
- `e2e/dev-tools.spec.ts`: `?seed=42&speed=0.5` shows in the dev panel; defaults are random / ×1; +1, +7, +N day shifts move "today" and the offset persists across a reload; set learned = 250 shows on Home and fills 2 full + 1 partial map cells; reset progress clears it, also after reload.
- `e2e/offline.spec.ts`: wait for the service worker to control the page, reload, `context.setOffline(true)`, reload again: Home opens, Setup → Game works, a cold deep link `#/settings` opens from the cache. No console errors.

### 3. Eyes (screenshots in `docs/verification/screenshots/stage-0/`)

Looked at: `phone-home`, `phone-setup`, `phone-game`, `phone-card`, `phone-card-translation`, `phone-summary`, `phone-map`, `phone-speed`, `phone-settings`, `phone-dev-panel`, `phone-small-settings`, `desktop-home`, `desktop-game`.

Found and fixed during this stage:
1. Toggle knob had no `left-0`, so it was placed at the switch's centre and pushed the page 9 px wider on the phone (horizontal scroll on Settings). Fixed, covered by the no-scroll test.
2. The DEV button sat bottom-left over **Map** (Home), **Show card** (Game) and the **Voice** select (Settings). Moved to a small tab on the right edge; the panel now drops from the top.
3. Counters were formatted three ways (`10 000`, `10,000`, `10000`). One `formatCount` helper now.
4. Dev panel code was in the production bundle. The flag is now folded at build time and the panel is a lazily imported chunk that the production build drops.
5. Dexie logs an expected warning when the e2e helper deletes the database; the console collector now attaches after the reset so real warnings still fail the test.

Honest look: the screens are clean, dark, readable, with one neon accent and 48 px targets. They do not yet feel like an arcade: nothing moves, there are no particles, no glow reacting to the player. That is expected for a skeleton and is the job of stages 1 and 3.

### 4. Console and network

Console: no errors or warnings in the smoke and offline flows (asserted in tests). Network during the stub game: only the app shell and the service worker; no word batches exist yet.

### 5. What remains

- Game, Card, Summary, Speed check are stubs with placeholder text (stage 1–2).
- `LEVEL_COUNTS` is all zeros until the 300-word B2 starter set lands (stage 1).
- `validate-words` covers schema, ids, duplicates, braces, Cyrillic; master-list rank, definition simplicity, `avoid` existence and distractor supply come with the base (stage 1).
- GitHub Pages workflow is stage 4; the Vite base and SW paths are already set for it.
- The spec asks for pushes to `main`; this session is bound to `claude/dreamy-rubin-31q8dd`, so the push and the `stage-0` tag went there. Merging into `main` is the user's call.

## Checklist for the user on a real phone

Not verified here, cannot be verified without a human:
- [ ] Install as PWA from Chrome on the Xiaomi (needs the GitHub Pages deploy, stage 4, or `npm run preview` on the LAN).
- [ ] Open it with Wi-Fi and mobile data off: Home appears, Settings open.
- [ ] Touch targets: Play, the three bottom buttons, the level rows, the toggles are comfortable with one thumb.
- [ ] Status bar / notch: nothing hidden under the top safe area on the Game screen.
- [ ] Speech, vibration, on-screen keyboard: nothing to test yet, arrives in stages 1–2.
