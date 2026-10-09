# Fixes from Bad-card reports (SPEC §9.6)

How it works: the player presses **Bad card** on a word; the id lands in `flagged` of the export file (Settings → Export progress). Hand that file to Claude Code; each flagged entry is reviewed and fixed in a separate `content:` commit, logged here.

| Date | Word id | What was wrong | Fix |
|---|---|---|---|
| 2026-10-09 | i-pron | Stored lower case (validate-words requires it), so the game showed "i" on the chip, the card and in the sentence gap. Found during A1 batch 1, not a player report. | `fix:` commit: `displayWord` in `src/app/format.ts` capitalises this one word on every screen (chip, typing slots, card, flight, speed check, summary, speech); `content:` commit: the sentence gap written as `{I}`. Checked in the browser: `docs/verification/screenshots/word-i/phone-field.png`, `phone-card.png`. |
