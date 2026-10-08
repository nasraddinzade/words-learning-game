#!/usr/bin/env python3
"""
Builds docs/words/master-list.tsv (SPEC §9.2): 10 000 English lemmas ranked by frequency,
with one part of speech each and a CEFR-ish level by rank band.

Sources (see docs/words/SOURCE.md for licences):
  - wordfreq       word frequencies (top 40 000 forms as candidates)
  - simplemma      lemmatisation (went/goes/going → go)
  - NLTK WordNet   proper-noun and junk filtering, dominant part of speech by SemCor counts

Run inside a venv with: pip install wordfreq simplemma nltk
and NLTK data: averaged_perceptron_tagger_eng is not needed; wordnet is:
  NLTK_ALLOW_PROXIED_URLOPEN=1 python -c "import nltk; nltk.download('wordnet')"

Usage: python scripts/words/build_master_list.py [--starter src/content/words/*.json]
The starter set's (word, pos) pairs are forced into the list with their hand-chosen pos.
"""
from __future__ import annotations

import argparse
import glob
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import simplemma
from nltk.corpus import wordnet as wn
from wordfreq import top_n_list, zipf_frequency

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/words/master-list.tsv"
OVERRIDES = ROOT / "docs/words/master-overrides.tsv"
TOTAL = 10_000
CANDIDATES = 40_000

# Level bands by rank (SPEC §9.2); obvious exceptions are fixed by hand later.
BANDS = [(1000, "A1"), (2000, "A2"), (4000, "B1"), (6500, "B2"), (10_000, "C1")]

WN_POS = {"n": "noun", "v": "verb", "a": "adj", "s": "adj", "r": "adv"}

# Function words are not in WordNet; they get a fixed part of speech here.
FUNCTION_WORDS: dict[str, str] = {}
for _pos, _words in {
    "det": "the a an this that these those my your his her its our their some any no every each either neither another other such what which whose all both half several many much few little enough one two three four five six seven eight nine ten eleven twelve twenty thirty forty fifty hundred thousand million billion first second third last next",
    "pron": "i you he she it we they me him them us myself yourself himself herself itself ourselves themselves yourselves mine yours hers ours theirs who whom whoever whatever whichever someone somebody something anyone anybody anything everyone everybody everything nobody nothing none",
    "prep": "of in to for with on at by from about into over after under between through during before without within along across behind beyond among around near against toward towards upon via per despite except until unless since than like onto inside outside underneath beneath throughout up down out off",
    "conj": "and or but so because although though while whereas if whether nor yet as once whenever wherever",
    "adv": "not very also just only even still then there here now how when where why too quite rather almost already always never often sometimes usually again ever soon maybe perhaps away back together else instead anyway otherwise",
    "verb": "be have do can could will would shall should may might must ought",
    "interj": "yes no hello hi okay oh wow thanks please sorry bye goodbye hey yeah",
}.items():
    for _w in _words.split():
        FUNCTION_WORDS.setdefault(_w, _pos)

# Internet noise, abbreviations and the like that WordNet happens to know.
JUNK = set(
    """
    lol omg btw thx pls plz ur im dont cant wont didnt isnt ive youre thats theyre whats hes shes
    http https www com org net html php jpg png gif pdf url wifi app apps ok okay ya yo ye em
    ie eg etc vs mr mrs ms dr jr sr st ave blvd pm am ad bc ca cm mm km kg lb oz ft inc ltd co
    ii iii iv vi vii viii ix xi xii xx xxx
    """.split()
)

# Words we do not want in a language game. Kept short on purpose; the manual pass catches more.
PROFANITY = set("fuck fucking fucked fucker shit shitty bitch bitches ass asshole damn dick cock pussy cunt bastard crap piss slut whore nigger nigga fag faggot retard".split())


def wordnet_info(word: str) -> tuple[bool, dict[str, int], dict[str, int]]:
    """(is_proper_noun, {pos: usage count}, {pos: number of senses}). Empty dicts mean unknown."""
    synsets = wn.synsets(word)
    counts: dict[str, int] = defaultdict(int)
    senses: dict[str, int] = defaultdict(int)
    forms_seen = 0
    capitalised = 0
    for s in synsets:
        for lemma in s.lemmas():
            if lemma.name().lower() != word:
                continue
            forms_seen += 1
            if lemma.name()[0].isupper() or s.instance_hypernyms():
                capitalised += 1
            counts[WN_POS[s.pos()]] += lemma.count()
            senses[WN_POS[s.pos()]] += 1
    if forms_seen == 0:
        return False, {}, {}
    # Known only in capitalised form (Paris, Monday, English as a name) → proper noun.
    return capitalised == forms_seen, dict(counts), dict(senses)


def load_overrides() -> tuple[set[str], dict[str, str]]:
    """docs/words/master-overrides.tsv: `word<TAB>drop` or `word<TAB>pos<TAB><new pos>`."""
    drop: set[str] = set()
    pos: dict[str, str] = {}
    if not OVERRIDES.exists():
        return drop, pos
    for line in OVERRIDES.read_text().splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) >= 2 and parts[1] == "drop":
            drop.add(parts[0])
        elif len(parts) >= 3 and parts[1] == "pos":
            pos[parts[0]] = parts[2]
    return drop, pos


SUFFIX_POS = [
    ("ly", "adv"), ("ness", "noun"), ("tion", "noun"), ("sion", "noun"), ("ment", "noun"), ("ity", "noun"), ("ance", "noun"), ("ence", "noun"),
    ("ship", "noun"), ("hood", "noun"), ("ism", "noun"), ("ist", "noun"), ("er", "noun"), ("or", "noun"),
    ("ous", "adj"), ("ive", "adj"), ("ful", "adj"), ("less", "adj"), ("able", "adj"), ("ible", "adj"), ("al", "adj"), ("ic", "adj"), ("ical", "adj"),
    ("ize", "verb"), ("ise", "verb"), ("ify", "verb"), ("ate", "verb"),
]


def dominant_pos(word: str, counts: dict[str, int], senses: dict[str, int]) -> str:
    if word in FUNCTION_WORDS:
        return FUNCTION_WORDS[word]
    order = {"noun": 0, "verb": 1, "adj": 2, "adv": 3}
    if counts and max(counts.values()) > 0:
        return max(counts.items(), key=lambda kv: (kv[1], -order.get(kv[0], 9)))[0]
    for suffix, pos in SUFFIX_POS:
        if word.endswith(suffix) and len(word) > len(suffix) + 2 and pos in senses:
            return pos
    if senses:
        # No usage counts: the part of speech with the most senses, nouns first on a tie.
        return max(senses.items(), key=lambda kv: (kv[1], -order.get(kv[0], 9)))[0]
    return "noun"


def lemma_of(form: str, starter: dict[str, str]) -> str:
    """simplemma first, then WordNet's morphy, then the form itself: the first one WordNet knows."""
    if form in FUNCTION_WORDS or form in starter:
        return form
    candidates = [simplemma.lemmatize(form, lang="en"), wn.morphy(form) or form, form]
    for c in candidates:
        if c and re.fullmatch(r"[a-z]+", c) and (c in FUNCTION_WORDS or wn.synsets(c)):
            return c
    return form


def level_for(rank: int) -> str:
    for upper, level in BANDS:
        if rank <= upper:
            return level
    return "C1"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--starter", nargs="*", default=sorted(glob.glob(str(ROOT / "src/content/words/*.json"))))
    ap.add_argument("--report", action="store_true", help="print what was dropped and why")
    args = ap.parse_args()

    drop_overrides, pos_overrides = load_overrides()
    starter: dict[str, str] = {}
    for f in args.starter:
        for e in json.loads(Path(f).read_text()):
            starter[e["word"]] = e["pos"]

    merged: dict[str, float] = defaultdict(float)  # lemma → summed frequency (zipf → linear)
    first_seen: dict[str, int] = {}
    dropped: list[tuple[str, str]] = []
    for i, form in enumerate(top_n_list("en", CANDIDATES)):
        if not re.fullmatch(r"[a-z]+(?:'[a-z]+)?", form):
            dropped.append((form, "not alphabetic"))
            continue
        if "'" in form:
            dropped.append((form, "contraction"))
            continue
        if len(form) < 2 and form not in ("a", "i"):
            dropped.append((form, "single letter"))
            continue
        if form in PROFANITY:
            dropped.append((form, "profanity"))
            continue
        lemma = lemma_of(form, starter)
        if lemma in JUNK or re.fullmatch(r"[ivx]{2,}", lemma) or (len(lemma) < 2 and lemma not in ("a", "i")):
            dropped.append((form, "junk"))
            continue
        if lemma in drop_overrides:
            dropped.append((form, "override"))
            continue
        merged[lemma] += 10 ** zipf_frequency(form, "en")
        first_seen.setdefault(lemma, i)

    rows: list[tuple[str, str, float]] = []
    for lemma, freq in merged.items():
        if lemma in FUNCTION_WORDS:
            rows.append((lemma, FUNCTION_WORDS[lemma], freq))
            continue
        proper, counts, senses = wordnet_info(lemma)
        if lemma in starter:
            rows.append((lemma, starter[lemma], freq))
            continue
        if lemma in pos_overrides:
            rows.append((lemma, pos_overrides[lemma], freq))
            continue
        if not counts:
            dropped.append((lemma, "not in WordNet"))
            continue
        if proper:
            dropped.append((lemma, "proper noun"))
            continue
        if len(lemma) <= 2 and sum(counts.values()) == 0:
            dropped.append((lemma, "two letters, no usage"))
            continue
        rows.append((lemma, dominant_pos(lemma, counts, senses), freq))

    rows.sort(key=lambda r: (-r[2], r[0]))
    rows = rows[:TOTAL]
    missing = sorted(set(starter) - {r[0] for r in rows})
    if missing:
        print(f"starter words outside the top {TOTAL}: {missing}", file=sys.stderr)
        # They displace the tail: insert by their own frequency so ranks stay honest.
        tail = rows
        for w in missing:
            tail.append((w, starter[w], 10 ** zipf_frequency(w, "en")))
        tail.sort(key=lambda r: (-r[2], r[0]))
        rows = tail[:TOTAL]
        still = sorted(set(starter) - {r[0] for r in rows})
        if still:
            # Even rarer than the cut: keep them at the very end, dropping the last non-starter rows.
            keep = [r for r in rows if r[0] in starter]
            others = [r for r in rows if r[0] not in starter]
            rows = (others[: TOTAL - len(keep) - len(still)] + keep + [(w, starter[w], 0.0) for w in still])
            rows.sort(key=lambda r: (-r[2], r[0]))

    OUT.write_text("word\tpos\trank\tlevel\n" + "".join(f"{w}\t{p}\t{i + 1}\t{level_for(i + 1)}\n" for i, (w, p, _) in enumerate(rows)))
    pos_totals = defaultdict(int)
    for _, p, _ in rows:
        pos_totals[p] += 1
    print(f"wrote {OUT.relative_to(ROOT)}: {len(rows)} rows; pos: {dict(sorted(pos_totals.items()))}")
    if args.report:
        reasons = defaultdict(list)
        for w, why in dropped:
            reasons[why].append(w)
        for why, ws in reasons.items():
            print(f"dropped {len(ws):5d} {why}: {' '.join(ws[:40])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
