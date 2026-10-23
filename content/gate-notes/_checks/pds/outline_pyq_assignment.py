"""Every pds PYQ is assigned to exactly one lesson in content/gate-notes/pds/_outline.md.

The outline lists each lesson's PYQs on a line starting "- PYQs (". This check fails if any pds
question in src/gate/questions.json is missing (the "unassigned" list must be empty), appears
under two lessons, or if the outline names an id that is not a pds PYQ. It also checks that the
chapter overview table agrees with the per-lesson counts.
"""
import collections
import json
import pathlib
import re

ROOT = pathlib.Path.cwd()
OUTLINE = ROOT / "content" / "gate-notes" / "pds" / "_outline.md"
BANK = ROOT / "src" / "gate" / "questions.json"

pds = {q["id"] for q in json.loads(BANK.read_text())["questions"] if q["subject"] == "pds"}
text = OUTLINE.read_text()
lesson = None
where = {}
for line in text.splitlines():
    m = re.match(r"^### (pds-\d\d-\d\d-[a-z0-9-]+) ·", line)
    if m:
        lesson = m.group(1)
        continue
    if line.startswith("- PYQs ("):
        assert lesson, f"PYQ line before any lesson heading: {line[:60]}"
        ids = re.findall(r"`([a-z0-9-]+)`", line)
        n = int(re.match(r"- PYQs \((\d+);", line).group(1))
        assert n == len(ids), f"{lesson}: header says {n} PYQs, lists {len(ids)}"
        for qid in ids:
            assert qid in pds, f"{lesson}: {qid} is not a pds PYQ"
            assert qid not in where, f"{qid} is under both {where[qid]} and {lesson}"
            where[qid] = lesson

unassigned = sorted(pds - where.keys())
assert not unassigned, f"{len(unassigned)} unassigned pds PYQs: {unassigned}"
assert len(where) == len(pds) == 404, (len(where), len(pds))

per_ch = collections.Counter(l.split("-")[1] for l in where.values())
lessons_ch = collections.Counter(l.split("-")[1] for l in set(where.values()))
for m in re.finditer(r"^\| (\d) \| [^|]+ \| `(\d\d)-[a-z-]+` \| (\d+) \| (\d+) \|", text, re.M):
    ch = m.group(2)
    assert int(m.group(3)) == lessons_ch[ch], f"chapter {ch}: table says {m.group(3)} lessons, outline has {lessons_ch[ch]}"
    assert int(m.group(4)) == per_ch[ch], f"chapter {ch}: table says {m.group(4)} PYQs, outline has {per_ch[ch]}"
print(f"{len(where)} pds PYQs assigned across {len(set(where.values()))} lessons; unassigned: 0")
