#!/usr/bin/env python3
"""Prints the next N master-list words of a level that have no entry yet (rank order). Usage: next_batch.py B2 [250]"""
from __future__ import annotations

import glob
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
level = sys.argv[1] if len(sys.argv) > 1 else "B2"
n = int(sys.argv[2]) if len(sys.argv) > 2 else 250
have = set()
for f in glob.glob(str(ROOT / "src/content/words/*.json")):
    for e in json.loads(Path(f).read_text()):
        have.add((e["word"], e["pos"]))
rows = []
for line in (ROOT / "docs/words/master-list.tsv").read_text().splitlines()[1:]:
    word, pos, rank, lvl = line.split("\t")
    if lvl == level and (word, pos) not in have:
        rows.append((int(rank), word, pos))
rows.sort()
for rank, word, pos in rows[:n]:
    print(f"{rank}\t{word}\t{pos}")
print(f"# {min(len(rows), n)} of {len(rows)} remaining {level} words", file=sys.stderr)
