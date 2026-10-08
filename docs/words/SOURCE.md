# Sources for the word base

## Master list (`docs/words/master-list.tsv`)

Built by `scripts/words/build_master_list.py` on 2026-10-08. 10 000 rows: `word`, `pos`, `rank`, `level`.

- **Frequencies**: `wordfreq` 3.1.1, `top_n_list('en', 40000)` as candidates. wordfreq's code is MIT; its word-frequency data is released under Creative Commons Attribution-ShareAlike 4.0 (sources include OpenSubtitles, Wikipedia, Twitter, Google Books, Reddit and others). The master list is a derived work; this repository credits wordfreq here and keeps the list under the same CC-BY-SA 4.0 terms.
- **Lemmatisation**: `simplemma` 2.0.0 (MIT), validated against WordNet (`wn.morphy` as the fallback), so *went / goes / going* count towards *go*.
- **Filtering and part of speech**: NLTK's WordNet 3.0 (Princeton WordNet licence, free for any use with attribution). A candidate is kept only when WordNet knows it in lower case; proper nouns (known only capitalised, or instances such as *London*), contractions, non-alphabetic tokens, roman numerals, internet abbreviations and a short profanity list are dropped. The dominant part of speech is the one with the highest SemCor lemma count in WordNet, then suffix heuristics; function words (determiners, pronouns, prepositions, conjunctions, auxiliaries, interjections) have a fixed table in the script.
- **Levels**: by rank band, A1 ≤ 1000, A2 ≤ 2000, B1 ≤ 4000, B2 ≤ 6500, C1 ≤ 10 000. Approximate; obvious exceptions are fixed by hand in the list.
- **Starter set**: the 314 hand-written B2 words keep their hand-chosen part of speech and are forced into the list; three of them (*foresee, grumble, scarcely*) sit below the top 10 000 by frequency and were placed at the tail.

Known limits (kept as is, fixed by hand when met in a batch): British/American spelling pairs can both appear (*defence/defense*); a few nouns that are also common names appear (*turner, glen*); words with two frequent parts of speech get only the dominant one, the second is added by hand when a batch needs it (SPEC §9.2).

To rebuild: `python3 -m venv .venv && .venv/bin/pip install wordfreq simplemma nltk`, then `NLTK_ALLOW_PROXIED_URLOPEN=1 .venv/bin/python -c "import nltk; nltk.download('wordnet')"` (the env var is only needed behind an egress proxy), then `.venv/bin/python scripts/words/build_master_list.py --report`, then `.venv/bin/python scripts/words/rerank_starter.py` and `npm run validate-words`.

## Simple-word list for definitions (`scripts/data/simple-words.txt`)

- Source: `wordfreq` 3.1.1, `top_n_list('en', 3000)` filtered to ASCII alphabetic tokens, first 2000 kept. Generated 2026-10-07. Same licence as above. Used only by `scripts/validate-words.ts` to measure how simple a definition is.
