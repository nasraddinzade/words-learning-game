#!/usr/bin/env python3
"""
Adds entries from a Python data file to src/content/words, taking rank and level from the
master list and placing each entry in its 500-rank file. Data file: a module with ENTRIES, a list
of tuples (word, pos, topic, definition, sentence, translation, avoid[, accept]).
Usage: add_entries.py path/to/data.py
"""
from __future__ import annotations

import glob
import importlib.util
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORDS = ROOT / "src/content/words"
SUFFIX = {"noun": "n", "verb": "v", "adj": "adj", "adv": "adv", "prep": "prep", "conj": "conj", "pron": "pron", "det": "det", "interj": "interj"}


def main() -> int:
    spec = importlib.util.spec_from_file_location("data", sys.argv[1])
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(mod)
    master = {}
    for line in (ROOT / "docs/words/master-list.tsv").read_text().splitlines()[1:]:
        word, pos, rank, level = line.split("\t")
        master[(word, pos)] = (int(rank), level)

    existing = {}
    for f in glob.glob(str(WORDS / "*.json")):
        for e in json.loads(Path(f).read_text()):
            existing[e["id"]] = e
    added = 0
    replaced = 0
    for row in mod.ENTRIES:
        word, pos, topic, definition, sentence, translation, avoid = row[:7]
        accept = row[7] if len(row) > 7 else None
        if (word, pos) not in master:
            print(f"not in master list: {word} {pos}", file=sys.stderr)
            return 1
        rank, level = master[(word, pos)]
        e = {"id": f"{word}-{SUFFIX[pos]}", "word": word, "pos": pos, "rank": rank, "level": level, "topic": topic, "definition": definition, "sentence": sentence, "translation": translation}
        if accept:
            e["accept"] = accept
        e["avoid"] = avoid
        if e["id"] in existing:
            replaced += 1
        else:
            added += 1
        existing[e["id"]] = e

    files = defaultdict(list)
    for e in existing.values():
        lo = (e["rank"] - 1) // 500 * 500 + 1
        files[f"{lo:05d}-{lo + 499:05d}.json"].append(e)
    for f in glob.glob(str(WORDS / "*.json")):
        Path(f).unlink()
    for name, rows in files.items():
        rows.sort(key=lambda e: e["rank"])
        (WORDS / name).write_text("[\n" + ",\n".join(json.dumps(e, ensure_ascii=False) for e in rows) + "\n]\n")
    print(f"added {added}, replaced {replaced}, base now {len(existing)} entries in {len(files)} files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
