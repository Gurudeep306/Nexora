"""Check: every PYQ embedded in a Chapter 1 lesson has a full teacher-style v2 solution in
src/gate/solutions (the reader shows it under the question):

- the approach names the concept tested ("Concept tested: …");
- at least two worked steps, a pitfalls list, and a verification or a shortcut;
- for MCQ/MSQ, an optionAnalysis entry for every option saying why it is right or wrong;
- the solution's answer agrees with the bank key (matchesKey true).

The keys themselves are recomputed from scratch in l01…l05 (one per lesson).
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import numlib as nl  # noqa: E402

bank = {q["id"]: q for q in json.loads((nl.ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}
problems, n = [], 0
for f in sorted(nl.CH1.glob("[0-9][0-9]-*.md")):
    for qid in re.findall(r':::pyq\{id="([^"]+)"', f.read_text()):
        q = bank[qid]
        sol = json.loads((nl.ROOT / "src" / "gate" / "solutions" / f"{q['paper']}.json").read_text())["solutions"].get(qid)
        n += 1
        if not sol:
            problems.append(f"{qid}: no v2 solution")
            continue
        if not sol["approach"].startswith("Concept tested"):
            problems.append(f"{qid}: approach must open with 'Concept tested: …'")
        if len(sol["steps"]) < 2:
            problems.append(f"{qid}: fewer than 2 steps")
        if not sol.get("pitfalls"):
            problems.append(f"{qid}: no pitfalls")
        if not (sol.get("verification") or sol.get("shortcut")):
            problems.append(f"{qid}: needs a verification or a shortcut")
        if q.get("options"):
            got = [o["option"] for o in sol.get("optionAnalysis", [])]
            want = [o["l"] for o in q["options"]]
            if got != want:
                problems.append(f"{qid}: optionAnalysis covers {got}, options are {want}")
        if not sol["answer"].get("matchesKey"):
            problems.append(f"{qid}: solution does not match the key")
assert not problems, "\n" + "\n".join(problems)
print(f"pyq_ch1: {n} embedded PYQs have full teacher-style solutions")
