# Stage 1 verification: core, the fun prototype

Date: 2026-10-07. Branch `claude/dreamy-rubin-31q8dd`. Code commits `38362f6`..`5f1102d`, report commit after them; pushed, confirmed with `git ls-remote`. Tag `stage-1` is local only (the session's git proxy refuses tag pushes).

## What was built

- 314-word B2 starter set (`src/content/words/04001-04500.json`), `validate-words` with the full §9.5 rule set (schema, ids, duplicates, stem in definition, simple-word share via a wordfreq top-2000 list, sentence braces and length, Cyrillic translation, `avoid` existence and pos, ≥5 distractors per word, rank vs master-list when it exists). It also generates `manifest.json` and `word-index.json`.
- Pure engine (`src/engine`): scheduler (steps 1–4, one step per calendar day, mistake = one step down + debt, debt clears without advancing, control checks at 21/60/180 days wired for stage 2), queue builder with the §6.6 regulator, level order.
- Pure game logic (`src/game`): balance ladder (3→6 words, 10 s→5.6 s), distractor picker (same pos, rank ±300, never `avoid`, confusion list first, look-alikes on step 2, weak words preferred), fall planner (lanes, staggered spawns), session state machine (lives, combo, score, difficulty up every 3 correct and down on a mistake, debt return after 3–5 rounds, game over, queue complete, unresolved debts).
- UI: Game screen with a requestAnimationFrame loop writing `transform` straight to the DOM, word card (speech, hidden translation, Bad card, Enter/space to continue), pause/quit, Summary with mistakes list and card review, Home due-today count, Setup starts a game.
- Dev tools: `data-correct` on the right chip and the queue plan in the dev panel (e2e build only).

## 1. Automated checks (`npm run check`)

| Check | Result |
|---|---|
| `tsc -b` | clean |
| `eslint .` | clean |
| `vitest run` | 9 files, 55 tests |
| `validate-words` | ok, 314 entries |
| production build | ok; word batch is its own chunk (105 kB / 29 kB gzip), loaded on demand; no dev code in the bundle |

## 2. Browser pass (Playwright, Chromium, 393×873 touch / 360×800 / 1280×800)

57 e2e tests pass. Gameplay runs on all three viewports; the long learning scenario runs on the phone project.

- Correct tap → card with the word, pos, sentence with highlight; translation hidden until **Show translation**; Continue; combo and score grow.
- Wrong tap → card says which word it was and what was tapped; one life lost; combo reset.
- Missed word (`?speed=5`) → "Too slow" card, one life lost.
- Debt: after a wrong tap the same word returns in 3–5 rounds with the "It came back" hint; a correct answer clears it.
- Three mistakes → Game over, summary shows 3 came back, mistakes list opens the card.
- Five new words all correct → Round complete, moved up 5, best combo ×5, Home shows 0 due.
- Pause freezes the fall (transform unchanged after 600 ms), resume continues, quit → "Game stopped".
- Bad card sets `flagged` in IndexedDB.
- Distractors: 6 rounds checked against the data: same pos, none from `avoid`, unique.
- Days: day 0 five words → step 2 due tomorrow; same day no reviews, five different new words; day 1 → step 3 due in 2 days; day 3 a mistake drops one to step 2 in debt, the debt clears the same day without a second step up, due tomorrow, confusion list has one entry.
- Regulator: 35 due → new 5 of 10; 65 due → reviews 40, new 0, 25 deferred. Home shows the due count.
- Unresolved debt opens the next game and Home shows 1 due.
- Offline: service worker controls the page, network off, reload, play a round with words from the cached batch; no console errors.
- No horizontal scroll on any screen; manifest and sw under the base path.

## 3. Eyes (`docs/verification/screenshots/stage-1/`)

Looked at: `phone-game-falling`, `phone-card-correct`, `phone-card-wrong`, `phone-card-translation`, `phone-pause`, `phone-summary`, `phone-setup`, `phone-small-game-falling`, `desktop-game-falling`, plus home/map/speed/settings/dev-panel.

Found and fixed:
1. After an answer the round is already cleared, so the card looked for the word in the round and never rendered. Fixed by reading the word from the answer result. Caught by every gameplay test.
2. Words spawned too far apart (45 % of the fall time): 2.5 s into a round only one chip was on the field. Spread reduced to 30 %.
3. Combo showed "×0" at start, which reads like a multiplier of zero. Now a flame with the count.
4. Carried-over debts arrived through the queue without the "It came back" hint. Fixed.
5. The last round's card said "Continue" and then jumped to the summary. It now says "See results".
6. Radio "5" matched "15" in tests (exact name now).

Honest look: it plays. Chips glow, the correct tap bursts into particles, a wrong tap shakes the screen and cracks a heart, the card reads well. It is still a quiet arcade: the background is static, there is no sound, no combo escalation, no learned-word celebration. Those are stage 3. The field is empty at 3 words on 10 s; the ladder reaches 6 words at 5.6 s after ~20 correct answers in a row, which may be too slow a ramp for a B2 player. That is exactly the kind of number the user should tune after a few days (all in `src/game/balance.ts`).

## 4. Console and network

No console errors or warnings in the gameplay and offline tests (asserted). Network during play: the app shell, the service worker and the single word-batch chunk; nothing else.

## 5. Not in this stage

- Typing rounds (steps 3 and 4 play as tap rounds for now), fast skip, Speed check, Setup regulator UI: stage 2.
- Themes, streak, celebrations, sounds, vibration: stage 3. The summary shows "Streak 0 days".
- Export/import, keyboard 1–6, deploy: stage 4.
- Ranks of the starter set are provisional until the master list exists.
- Speech is implemented but cannot be heard here; see the checklist.

## Checklist for the user on a real phone

- [ ] Is a 10-second fall at 3 words too slow or fine? Does 6 words at 5.6 s feel like a rush? (`ladder` in `src/game/balance.ts`)
- [ ] Is the chip easy to hit with a thumb while it moves? Is the tap zone big enough?
- [ ] Auto speech: does the word and sentence play on the card? Does the Voice list in Settings offer anything (stage 1 lists voices only when the system reports them)?
- [ ] Does the particle burst and the shake feel good or annoying?
- [ ] Does the card appear fast enough after a tap, or does the 0.3 s feel laggy?
- [ ] Is the definition in the bottom panel readable while watching the field?
- [ ] Vibration, sound: not implemented yet, nothing to test.
