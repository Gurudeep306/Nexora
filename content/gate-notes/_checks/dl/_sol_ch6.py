"""Teacher-style v2 solutions for the 59 PYQs of Digital Logic Chapter 6 (Sequential circuits).

The solutions live in one module per lesson (`_sol_ch6_l01.py` … `_sol_ch6_l08.py`, each defining a
SOLUTIONS dict); this file merges them, and `python3 content/gate-notes/_checks/dl/_sol_ch6.py`
writes each solution into src/gate/solutions/<paper>.json (the v2 solutions pipeline).
pyq_ch6.py and scripts/gate/validate-solutions.mjs check the result, and every key is re-derived
from scratch in the lesson checks l6_01 … l6_08 (seqlib simulation).
"""
import importlib
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _sol_ch1_fp import ROOT  # noqa: E402

SOLUTIONS = {}
for k in range(1, 9):
    name = f"_sol_ch6_l{k:02d}"
    if (pathlib.Path(__file__).parent / f"{name}.py").exists():
        part = importlib.import_module(name).SOLUTIONS
        dup = set(part) & set(SOLUTIONS)
        assert not dup, f"{name}: duplicate solutions {sorted(dup)}"
        SOLUTIONS.update(part)


def write():
    bank = {q["id"]: q for q in json.loads((ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}
    by_paper = {}
    for qid, sol in SOLUTIONS.items():
        by_paper.setdefault(bank[qid]["paper"], {})[qid] = sol
    for paper, sols in sorted(by_paper.items()):
        p = ROOT / "src" / "gate" / "solutions" / f"{paper}.json"
        d = json.loads(p.read_text())
        for qid, sol in sols.items():
            d["solutions"][qid] = json.loads(json.dumps(sol))
        p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
        print(f"{paper}: {', '.join(sorted(sols))}")


if __name__ == "__main__":
    write()
