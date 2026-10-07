# Stage 2 verification: full learning logic

Date: 2026-10-07. Branch `claude/dreamy-rubin-31q8dd`. Commits `e1d6faf`..`d410cb6` plus the loader fix after them; pushed and merged into `main` via pull request (the session cannot push to `main` directly). Full e2e run: 90 passed on three projects, 14.9 min.

## What was built

- Typing rounds (SPEC §5.2): steps 3 and 4 fall as a single chip with letter slots; step 3 shows the first letter. A hidden input keeps the keyboard open with autocorrect, autocapitalize, autocomplete and spellcheck off; letters appear in the slots as typed; the answer is checked on Enter or when the word length is reached. Typos are mistakes; `accept` spellings count. Typing rounds get 1.6× the fall time. The game and Speed check screens size themselves to `visualViewport` so the explanation and the chip stay above the keyboard.
- Fast skip (§6.3): a correct first tap within the first third of the fall marks the word; 3–5 rounds later it returns as a hidden typing check. Typed → learned at once. Not typed → no life lost, normal path from step 2 tomorrow.
- Control checks (§6.5): learned words come back as hidden typing rounds at 21, 60 and 180 days; a failure returns the word to step 3 and takes one from the learned counter; three passes retire the word.
- Queue (§6.6): tap and typing rounds alternate where possible, after the debts.
- Speed check (§7): a separate screen; 20 unseen words below the start level, hidden typing, no lives, 7 s per word, Skip button. Correct → learned; skipped, mistyped or fallen → normal queue from step 1 due today. Explains itself when nothing is below the start level.
- Confusion list and the regulator were already live from stage 1 and are exercised again here.

## 1. Automated checks (`npm run check`)

| Check | Result |
|---|---|
| `tsc -b` | clean |
| `eslint .` | clean |
| `vitest run` | 11 files, 70 tests |
| `validate-words` | ok, 314 entries |
| production build | ok, no dev code in the bundle |

## 2. Browser pass (Playwright, Chromium, 393×873 touch / 360×800 / 1280×800)

New specs: `e2e/typing.spec.ts` (typing, fast skip, control checks), `e2e/speed.spec.ts`. The stage 0–1 specs still run; `learning.spec.ts` was updated because step-3 words are now typed.

- Step 3: first letter shown in the slots, input focused with the four keyboard attributes, letters fill in, correct typing moves the word to step 4 due in 4 days.
- Typo: "Not quite" card with what was typed, one life lost, word drops to step 2 in debt.
- Enter submits a short answer as a mistake. (Found and fixed: the Enter that submits was also caught by the freshly mounted card's key listener and pressed Continue. The card now ignores keys for its first 250 ms.)
- `fulfil` typed as `fulfill` counts; a step-4 word becomes learned, summary shows Learned today 1, Home shows 1 / 10 000.
- A typing word that reaches the bottom is a miss.
- Tap and typing rounds alternate (typing rounds never adjacent).
- Fast skip: fast first tap → hidden typing check with the "You knew it fast" hint within 5 rounds → learned at once; a failed check costs no life and the word stays on step 2 without debt.
- Control checks: two learned words due at day 21; one typed right → checksPassed 1, due at day 60; one mistyped → step 3, learning, in debt, learned counter 5 → 4.
- Speed check: empty state at start level B2; with start level C1, 20 B2 words; typed right → "Learned" feedback, Skip → "To the queue", a wrong Enter → queue; progress rows and Home counters (1 learned, 2 due) follow.
- All stage 0–1 scenarios pass, with test taps now deliberately slow so they do not trigger fast skips (a fast tap is opt-in in the helpers).

## 3. Eyes (`docs/verification/screenshots/stage-2/`)

Looked at: `phone-typing-step3`, `phone-typing-partial`, `phone-card-typo`, `phone-speed-round`, `phone-speed-feedback`, `phone-speed-empty`, plus the stage 1 set regenerated.

Found and fixed:
1. The hidden input covered the Skip button in Speed check (a tap on Skip focused the input instead). The input is now 1 px, pointer-events off.
2. The Enter double-handling described above.
3. The screenshot scenario captured a step-4 round under the step-3 name; fixed in the scenario.

Honest look: typing rounds read well, the slots and the glowing chip are clear, the keyboard attributes are right. What cannot be judged here: how the real on-screen keyboard behaves (the emulated browser has none), whether the chip and definition stay visible with the keyboard up, and whether 11 s of fall time (ladder level 0 × 1.6) is enough to type an 11-letter word on a phone.

## 4. Console and network

No console errors or warnings in the gameplay and offline tests (asserted). Network during play: shell, service worker, one word-batch chunk.

## 5. Not in this stage

- Themes, streak, celebrations, sounds, vibration, personal bests: stage 3.
- Export/import, Bad-card export, keyboard 1–6 on desktop, deploy workflow: stage 4.
- Skip checks that the game ends before are simply dropped; the word keeps its normal path.

## Checklist for the user on a real phone

- [ ] Typing round: does the keyboard open by itself when the chip appears? If not, tap the field once.
- [ ] With the keyboard open, are the definition panel and the falling chip both visible? (This is the `visualViewport` sizing; iOS and Android differ.)
- [ ] No autocorrect, no capital first letter, no suggestions bar changing your word?
- [ ] Is 11 s enough to type a long word at the start? Typing time is `typeFallFactor` in `src/game/balance.ts`.
- [ ] Fast skip: tap a word you know immediately when it appears; a few rounds later it should come back to be typed. Did that feel right or annoying?
- [ ] Speed check with the start level raised to C1: is 7 s per word comfortable?
