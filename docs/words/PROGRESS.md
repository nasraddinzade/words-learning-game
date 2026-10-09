# Word base progress (SPEC §9)

Read this first in every word-base session. Continue from the first range that is not done.

## Master list

Done 2026-10-08: `docs/words/master-list.tsv`, 10 000 rows (see `SOURCE.md`), with `master-overrides.tsv` for the ~800 manual drops and part-of-speech fixes found in a full read of the list. `validate-words` enforces master-list ranks and counts the distractor supply and `avoid` words against the master list, so a batch is valid on its own.

## Status by level (order of work: B2 → C1 → B1 → A2 → A1)

Counts are entries written / entries in the master list for that level.

| Level | Rank band | Written | Notes |
|---|---|---|---|
| B2 | 4001–6500 | 2500 / 2500 | **done**: starter words + batches 1–10 (4001–6500); words that cross into B2 after a rebuild are picked up by the next C1 batch |
| C1 | 6501–10000 | 3453 / 3500 | **done**: starter words + batch 10 (6501–6601) + C1 batches 1–14 (6602–9999); words that cross into C1 after a rebuild are picked up by the next batch of any level; 47 entries moved down to B2 in later rebuilds, so the count reads 3453 although every C1 rank has an entry |
| B1 | 2001–4000 | 2000 / 2000 | **done**: starter words + B1 batches 1–8 (2001–3963); words that cross into B1 after a rebuild are picked up by the next batch of any level |
| A2 | 1001–2000 | 1000 / 1000 | **done**: starter words + A2 batches 1–4 (1002–2000); words that cross into A2 after a rebuild are picked up by the next batch of any level |
| A1 | 1–1000 | 506 / 1000 | starter words + A1 batches 1–2 (1–501). Next: `python3 scripts/words/next_batch.py A1` → from rank 502 |

Batch log: `docs/words/batch-*.md`. Fix log for Bad-card reports: `docs/words/fixes.md`.

## How a batch is done

1. `python3 scripts/words/next_batch.py <LEVEL>` (now `A1`) prints the next 250 master-list words of the level with no entry yet, in rank order.
2. Write the entries by SPEC §9.3 as a Python data file (`ENTRIES = [(word, pos, topic, definition, sentence, translation, avoid[, accept]), …]`) and run `python3 scripts/words/add_entries.py <file>`: it takes rank and level from the master list and places entries in the 500-rank files. Previous data files live in `docs/words/batches/`.
3. `npm run validate-words` clean. If the master list has a wrong part of speech, fix it in `master-overrides.tsv`, rebuild (see `SOURCE.md`), run `scripts/words/rerank_starter.py`.
4. 25 random entries read critically (meaning, collisions with neighbours, natural sentence, correct translation). More than 3 bad out of 25 → re-read the whole batch.
5. `docs/words/batch-<first rank>.md` with the result, then `content: words <first>-<last>` commit, separate from code.
