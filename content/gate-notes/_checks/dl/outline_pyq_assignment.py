"""Every dl PYQ is assigned to exactly one lesson in content/gate-notes/dl/_outline.md.

The outline lists each lesson's PYQs on a line starting "- PYQs (". This check fails
if any dl question in src/gate/questions.json is missing (the "unassigned" list must be
empty), appears under two lessons, or if the outline names an id that is not a dl PYQ.
"""
import json
import pathlib
import re

ROOT = pathlib.Path.cwd()
OUTLINE = ROOT / "content" / "gate-notes" / "dl" / "_outline.md"
BANK = ROOT / "src" / "gate" / "questions.json"

dl = {q["id"] for q in json.loads(BANK.read_text())["questions"] if q["subject"] == "dl"}
lesson = None
where = {}
for line in OUTLINE.read_text().splitlines():
    m = re.match(r"^### (dl-\d\d-\d\d-[a-z0-9-]+) ·", line)
    if m:
        lesson = m.group(1)
        continue
    if line.startswith("- PYQs ("):
        assert lesson, f"PYQ line before any lesson heading: {line[:60]}"
        for qid in re.findall(r"`([a-z0-9-]+)`", line):
            assert qid in dl, f"{lesson}: {qid} is not a dl PYQ"
            assert qid not in where, f"{qid} is under both {where[qid]} and {lesson}"
            where[qid] = lesson

unassigned = sorted(dl - where.keys())
assert not unassigned, f"{len(unassigned)} unassigned dl PYQs: {unassigned}"
assert len(where) == len(dl) == 304, (len(where), len(dl))
print(f"{len(where)} dl PYQs assigned across {len(set(where.values()))} lessons; unassigned: 0")
