# CLAUDE.md

Personal arcade PWA for learning 10 000 English words. Full specification: [SPEC.md](./SPEC.md). Read it before any work. This file is only the short operating manual.

## Stack

Vite + React 19 + TypeScript (strict), Tailwind CSS 4 (themes via CSS variables), Zustand, Dexie (IndexedDB), motion, canvas-confetti, vite-plugin-pwa, Web Speech / Web Audio, Vitest, Playwright. No backend, no network calls during play, no game engines, no heavy UI kits.

## Commands

```
npm run dev            # dev server (dev tools on)
npm run check          # typecheck + lint + unit tests + validate-words + production build
npm run typecheck      # tsc -b
npm run lint           # eslint
npm run test           # vitest run
npm run validate-words # scripts/validate-words.ts over src/content/words
npm run build          # production build (dist/)
npm run build:e2e      # build with dev tools enabled (VITE_DEV_TOOLS=1), used by Playwright
npm run e2e            # playwright test (builds + previews automatically)
npm run icons          # regenerate PWA PNG icons from public/icons/icon.svg
```

## Code rules

- UI text is English only. Russian appears only in `translation` of a word entry.
- `src/engine/` and `src/game/` are pure modules: no React, no DOM globals. Time (`now`, current day) and RNG are passed in as parameters.
- All game-feel numbers live in `src/game/balance.ts`; learning-logic constants in `src/engine/rules.ts`.
- Layers: `src/engine` (scheduler, queue, streak, milestones) → `src/game` (session, distractors, fall, speed check) → `src/app` stores → screens. Lower layers never import higher ones.
- Themes are CSS variable sets in `src/index.css` plus the list in `src/app/themes.ts`. Sounds are synthesised in `src/app/sound.ts`, vibration in `src/app/haptics.ts`; both read the Settings toggles.
- Game loop on `requestAnimationFrame`; falling words are DOM elements moved with `transform`.
- Dev-only tools (`?seed=`, `?speed=`, dev panel) are gated by `isDevToolsEnabled()` in `src/dev/enabled.ts`. They exist in `vite dev` and in `build:e2e`, never in the production build.
- Progress is written to IndexedDB after every answer. Never block play because of mistakes or missed days.
- Animations use transform/opacity only; respect `prefers-reduced-motion`. Touch targets ≥ 48px.
- Vite `base` is `/words-learning-game/` for GitHub Pages and `/` on Vercel (auto) or when `BASE_PATH=/` is set. Never hardcode the base in HTML or code; use `%BASE_URL%` / `import.meta.env.BASE_URL`.

## Self-check rule (SPEC §13, mandatory)

A stage is done only after: `npm run check` is clean, the game was played in a real browser (Playwright, 393×873 mobile emulation plus 360×800 and 1280×800), screenshots of every screen were opened and looked at, console is clean, and a report exists at `docs/verification/stage-N.md` with screenshot paths, findings, fixes and a checklist for the user on a real phone. Keep e2e scenarios in `e2e/` and run them on every later stage. Never report "done" because the code compiles.

## Git rules (SPEC §14)

- Small conventional commits in English (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `content:`). Word batches are committed separately from code: `content: words 04001-04250`.
- Push only after the self-check. Tag the end of each stage `stage-N`.
- Never force-push, never rewrite history, never change global git config, never put tokens in files or chat.
- SPEC says push to `main`. If a session is given a dedicated working branch, push there and leave merging into `main` to the user.

## Word base (SPEC §9), how to continue

1. Read `docs/words/PROGRESS.md` and `docs/words/SOURCE.md`; continue from the first range not marked done. `python3 scripts/words/next_batch.py B2` prints the next 250 words to write.
2. Entries are written strictly by `docs/words/master-list.tsv`, in batches of 250, order of levels B2 → C1 → B1 → A2 → A1, files of 500 in `src/content/words/NNNNN-NNNNN.json`. Write them as a data file (see `docs/words/batches/`) and run `python3 scripts/words/add_entries.py <file>`; it fills rank and level from the master list.
3. Before committing a batch: `npm run validate-words` (also regenerates `manifest.json` and `word-index.json`), then read 25 random entries critically and fix them; write `docs/words/batch-NNNNN.md`.
   `avoid` may only name words that exist in the base with the same pos; list every neighbour that also fits the definition.
4. Bad cards flagged by the player arrive in an export file; fix them in a separate commit and log in `docs/words/fixes.md`.
