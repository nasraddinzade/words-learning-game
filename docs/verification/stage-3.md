# Stage 3 verification: motivation

Date: 2026-10-07. Branch `claude/dreamy-rubin-31q8dd`. Commits `c513c83`..`5bf5eb5`; pushed and merged into `main` via pull request. Full e2e run: 108 passed on three projects, 19.0 min.

## What was built (SPEC §8, §12)

- Combo: tiers at 5, 10 and 20 in a row. The combo chip lights up, the field glows and its background drifts faster, the correct-tap sound rises in pitch. The multiplier on points was already live.
- Mistake: screen shake (stage 1) plus the lost heart now cracks with a short animation; a low sound and a vibration pattern.
- Learned word: the word flies from the chip into the 10 000 counter, the counter pops and turns accent-coloured, then the "Learned!" card appears. Sound and vibration pattern of their own.
- Progress map was live since stage 0.
- Every 100 learned words: full-screen celebration with confetti (canvas-confetti), sound and vibration. Every 1 000: the same plus a new theme with a **Try it** button. The dev panel's "Set learned" goes through the same path, so a jump queues the last hundred and every thousand crossed.
- Ten themes as CSS variable sets, each with its own particle look (dots or sparks, second colour). A theme grid in Settings shows locked ones with their threshold.
- Daily streak with freezes (`src/engine/streak.ts`): a game started counts as a play; 7 days in a row earn a freeze; a missed day is covered by a freeze; otherwise the streak restarts at 1 with a neutral note, never a reproach. Home shows the streak and the freezes.
- Personal bests for combo and score; the summary marks a beaten record with a badge, sound and vibration.
- Summary now carries the streak with freezes and a one-line note (freeze earned, freeze used, new streak).
- Sounds synthesised with the Web Audio API (`src/app/sound.ts`), vibration via `navigator.vibrate` (`src/app/haptics.ts`); both and auto-speech obey the Settings toggles. Confetti respects `prefers-reduced-motion`.

## 1. Automated checks (`npm run check`)

| Check | Result |
|---|---|
| `tsc -b` | clean |
| `eslint .` | clean |
| `vitest run` | 13 files, 77 tests (streak, milestones added) |
| `validate-words` | ok, 314 entries |
| production build | ok, no dev code in the bundle |

## 2. Browser pass (Playwright, Chromium, 393×873 touch / 360×800 / 1280×800)

New spec `e2e/motivation.spec.ts`; all stage 0–2 specs still run.

- Dev panel "Set learned" 100 → "100 words learned" celebration, dismiss; 150 → nothing; 1 000 → "New theme unlocked: Ember", **Try it** switches the page theme and it survives a reload; Settings shows Ember selected, Ocean locked and disabled; switching back to Neon works. No console errors.
- A jump 0 → 2 250 celebrates 2 200, then Ember, then Ocean; three themes unlocked.
- Streak: play → 1 day; next day → 2 days; a stored streak of 6 and a play → "7 days · 1 ❄" with the "earned a freeze" note and the freeze on Home; skip a day → 8 days, "A freeze covered a missed day"; skip again without a freeze → 1 day, "New streak started today".
- Records: first game sets both records (two badges, best combo ×2); a weaker second game shows none.
- Five correct in a row → combo tier 1 on the chip and on the field.
- Learned word: the flight element appears with the word, then the "Learned!" card, counter reads 1/10 000.

## 3. Eyes (`docs/verification/screenshots/stage-3/`)

Looked at: `phone-celebration-hundred`, `phone-celebration-thousand`, `phone-summary-records`, `phone-settings-themes`, and for the themes ember, mono, gold, aurora, candy, forest, sunset, violet, ocean on Home and in a round (`phone-theme-<id>-home/-game`).

Found and fixed:
1. The hundred celebration dismissed twice on one tap (the backdrop and the button both handled it), so the next queued celebration vanished unseen. Backdrop tap removed.
2. The celebration sat under the dev panel in the e2e build. Raised above it.

Contrast: every theme keeps light text on a dark surface; chips are readable on all ten fields; the primary button has dark ink on each accent. Mono is deliberately quiet. Gold and Ember glow warm, Aurora and Ocean cool. None of the screenshots showed a low-contrast pair.

Honest look: now it is an arcade. The field breathes with the combo, taps burst, learned words fly, milestones explode in confetti. Sound and vibration cannot be judged here; see the checklist. The confetti canvas is a small library (canvas-confetti), the only one added.

## 4. Console and network

No console errors or warnings in the gameplay, offline and celebration tests (asserted). The headless browser creates the AudioContext without complaint. Network during play unchanged: shell, service worker, one word-batch chunk.

## 5. Not in this stage

- Export/import, Bad-card export file, keyboard 1–6 on desktop, GitHub Pages workflow: stage 4.
- The "learned" flight uses the tapped chip's position; for typing rounds it starts at the typing chip.
- Combo sound pitch per tier exists, but a dedicated "combo 10 / 20" fanfare does not; the tiers are shown visually and by pitch only.

## Checklist for the user on a real phone

- [ ] Sound: tap, wrong, learned, celebration, record. Too loud, too quiet, annoying after ten minutes? (Volume in `src/app/sound.ts`, gain values.)
- [ ] Vibration on Android: tap, wrong, learned, celebration. iOS has no vibration API, nothing to expect there.
- [ ] Confetti at 100 words: smooth or stuttering on the phone?
- [ ] Learned word flight: readable, or too fast at 0.75 s?
- [ ] Combo at 5/10/20: does the glow and the faster drift feel exciting or distracting while reading definitions?
- [ ] Pick a theme in Settings (all unlock as you go; the dev build unlocks with "Set learned"): is every theme pleasant on the phone's screen brightness?
- [ ] Streak on Home after two days of play.
