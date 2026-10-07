# Word base progress (SPEC §9)

Read this first in every word-base session. Continue from the first range that is not done.

## Status

| Range (rank) | Level | File | Status | Date | Notes |
|---|---|---|---|---|---|
| 4001–4314 (provisional) | B2 | `src/content/words/04001-04500.json` | done, starter set, 314 entries | 2026-10-07 | Written for stage 1 before the master list exists. Ranks follow writing order, not frequency. Review: `batch-04001.md`. |

Everything else: not started. Line W starts after stage 1 (SPEC §15), in this order: B2 (rest), C1, B1, A2, A1.

## Before line W starts

1. Decide the frequency source and record licence in `SOURCE.md` (candidates listed there).
2. Build `docs/words/master-list.tsv` (word, pos, rank, level), 10 000 rows, header line.
3. Re-rank the starter set against the master list and move entries into the right 500-word files. `validate-words` enforces master-list ranks as soon as the file exists.

## How a batch is done

- 250 words per batch, strictly from the master list.
- `npm run validate-words` clean.
- 25 random entries read critically (meaning, collisions with neighbours, natural sentence, correct translation). More than 3 bad out of 25 → re-read the whole batch.
- `docs/words/batch-NNNNN.md` with the result, then `content: words NNNNN-NNNNN` commit, separate from code.
