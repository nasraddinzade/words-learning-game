# Sources for the word base

## Simple-word list for definitions (`scripts/data/simple-words.txt`)

- Source: `wordfreq` 3.1.1 (Python), `top_n_list('en', 3000)` filtered to ASCII alphabetic tokens, first 2000 kept.
- Generated 2026-10-07.
- Licence: wordfreq code is MIT; its word-frequency data is released under Creative Commons Attribution-ShareAlike 4.0 (it combines sources such as OpenSubtitles, Wikipedia, Twitter, Google Books, ...). The 2000-word list is used only by `scripts/validate-words.ts` to measure how simple a definition is.

## Starter set (`src/content/words/04001-04500.json`, 300 words, B2)

- Written by hand for stage 1 (SPEC §9.4), picked from common B2 vocabulary.
- Ranks 4001–4300 are **provisional**: they follow the order the entries were written, not frequency. When the master list (`docs/words/master-list.tsv`) is built in line W, these entries get their real `rank` and move into the right batch file.

## Master list

Not built yet. Candidates: `wordfreq` top 25 000 (CC-BY-SA 4.0), `google-10000-english` (list derived from Google's Trillion Word Corpus, repository under MIT). Decide and record here before line W starts.
