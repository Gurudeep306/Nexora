"""Teacher-style v2 solutions for the 14 PYQs of Digital Logic Chapter 4 (Arithmetic circuits).

The solutions live in one module per lesson (`_sol_ch4_l01.py` … `_sol_ch4_l04.py`, each defining a
SOLUTIONS dict); this file merges them, and `python3 content/gate-notes/_checks/dl/_sol_ch4.py`
writes each solution into src/gate/solutions/<paper>.json (the v2 solutions pipeline).
pyq_ch4.py and scripts/gate/validate-solutions.mjs check the result, and every key is re-derived
from scratch in the lesson checks l4_01 … l4_04 (arithlib simulation).
"""
import importlib
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _sol_ch1_fp import ROOT  # noqa: E402

SOLUTIONS = {}
for k in range(1, 5):
    name = f"_sol_ch4_l{k:02d}"
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
