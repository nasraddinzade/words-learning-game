#!/usr/bin/env python3
"""
Gives every entry in src/content/words its rank and level from docs/words/master-list.tsv and
moves it into the batch file that holds that rank (500 per file). Run after the master list
changes. Entries whose (word, pos) is not in the master list are reported and left untouched.
"""
from __future__ import annotations

import glob
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORDS = ROOT / "src/content/words"
MASTER = ROOT / "docs/words/master-list.tsv"


def main() -> int:
    master: dict[tuple[str, str], tuple[int, str]] = {}
    for line in MASTER.read_text().splitlines()[1:]:
        word, pos, rank, level = line.split("\t")
        master[(word, pos)] = (int(rank), level)

    entries = []
    for f in sorted(glob.glob(str(WORDS / "*.json"))):
        entries.extend(json.loads(Path(f).read_text()))
    missing = [e["id"] for e in entries if (e["word"], e["pos"]) not in master]
    if missing:
        print(f"not in master list, left untouched: {missing}", file=sys.stderr)
        return 1

    files: dict[str, list[dict]] = defaultdict(list)
    for e in entries:
        rank, level = master[(e["word"], e["pos"])]
        e["rank"], e["level"] = rank, level
        lo = (rank - 1) // 500 * 500 + 1
        files[f"{lo:05d}-{lo + 499:05d}.json"].append(e)

    for f in glob.glob(str(WORDS / "*.json")):
        Path(f).unlink()
    for name, rows in files.items():
        rows.sort(key=lambda e: e["rank"])
        (WORDS / name).write_text("[\n" + ",\n".join(json.dumps(e, ensure_ascii=False) for e in rows) + "\n]\n")
    print(f"re-ranked {len(entries)} entries into {len(files)} files: {', '.join(sorted(files))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
