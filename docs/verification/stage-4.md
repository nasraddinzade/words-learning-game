# Stage 4 verification: polish

Date: 2026-10-07. Branch `claude/dreamy-rubin-31q8dd`. Pushed and merged into `main` via pull request; commit hashes in the git log under `feat(transfer)`, `feat(ui)`, `ci:`, `test(e2e)`, `docs:` of 2026-10-07. Full e2e run: 115 tests on three projects (112 in one run of 18.3 min; the three distractor tests failed only because the test helper read the new key badge as part of the word, fixed and re-run green).

## What was built

- Export / import (SPEC §10): Settings → **Export progress** downloads `words-progress-YYYY-MM-DD.json` with version, date, profile, every progress row and the list of flagged ids. **Import progress** opens a file picker, validates the file strictly (`src/engine/transfer.ts`: app marker, version, every field of every row), shows what will be replaced (learned in the file vs on the device, number of words, export date) and asks for confirmation. Replace writes everything in one IndexedDB transaction, so a failure leaves the old data. A broken, foreign, future-version or malformed file shows a readable error and changes nothing.
- Bad card (§9.6): flagged ids travel in the export file; Settings shows how many cards are flagged; `docs/words/fixes.md` is the log for the fixes.
- Keyboard on the computer (§12): keys 1–6 tap the chip with that number (badges appear only on devices with a fine pointer), Enter and space continue after the card (stage 1), Escape pauses and resumes. Typing rounds already use the keyboard.
- Loading (§9.1): batches load on demand through the manifest and word index (stage 1); the next batch in manifest order is warmed up in idle time after a game starts. The service worker precaches every batch chunk at install, so offline play never waits on the network.
- Deploy (§14): `.github/workflows/deploy.yml` runs `npm run check` and publishes `dist` to GitHub Pages on every push to `main` (base `/words-learning-game/`). `.github/workflows/ci.yml` runs the same checks on pull requests. Vercel stays as it is (base `/`, auto-detected).

## 1. Automated checks (`npm run check`)

| Check | Result |
|---|---|
| `tsc -b` | clean |
| `eslint .` | clean |
| `vitest run` | 14 files, 80 tests (transfer added) |
| `validate-words` | ok, 314 entries |
| production build | ok, no dev code in the bundle |

## 2. Browser pass (Playwright, Chromium, 393×873 touch / 360×800 / 1280×800)

New specs: `e2e/transfer.spec.ts`, `e2e/keyboard.spec.ts` (desktop only). All earlier specs still run.

- Play two rounds (one flagged), change a setting, export: the download is named by date, holds 2 progress rows, the flagged id and `sound: false`. Reset the device. A broken file ("not valid JSON"), a foreign file ("not exported by Words Learning Game") and a file with a bad row ("row 1") are refused and nothing changes. The real file previews "0 learned, 2 words" vs "0 learned"; Cancel changes nothing; Replace restores progress and the setting, also after a reload.
- A device with 50 learned importing a file with 7: the preview shows both numbers; after Replace, Home shows 7 / 10 000 and the file's streak.
- Desktop: the number badge is visible, the digit of the correct chip answers the round, Enter continues, Escape pauses and resumes, a digit for a chip that has not spawned does nothing.

## 3. Eyes (`docs/verification/screenshots/stage-4/`)

Looked at: `phone-import-error`, `phone-import-confirm`, `phone-settings-themes`, and the regenerated stage 1–3 set.

Found and fixed: the key badge's number was read by the test helper as part of the chip text (the helper now reads the word span). The confirmation box reads clearly, the error is one line in red. The badges on chips are hidden on the phone screenshots (fine pointer only), visible on the desktop ones.

## 4. Console and network

No console errors or warnings in the asserted tests. Network during play unchanged.

## 5. What remains after stage 4

- GitHub Pages must be enabled once in the repository settings (Pages → Source: GitHub Actions). The workflow cannot be verified from this session; the first run on `main` will show in the Actions tab. The Vercel deployment already serves the same build at the root.
- The Playwright suite runs locally only (~20 min); CI runs typecheck, lint, unit tests, validate-words and the build.
- Line W (the word base) starts now: `docs/words/PROGRESS.md`.

## Checklist for the user on a real phone

- [ ] Export: does the browser save the file where you can find it (Downloads / Files)? On iOS Safari the file may open in a new tab instead; use Share → Save to Files.
- [ ] Import on the second device: pick the file, read the preview, Replace. Does Home show the same numbers?
- [ ] After enabling GitHub Pages: open `https://nasraddinzade.github.io/words-learning-game/`, install as PWA, go offline, play.
