"""Gate Bench (Chapter 2 Live Lab) test vectors.

The lab's logic lives in client/src/gate/notes/labs/benchLogic.ts. This check computes, with boollib,
everything that module claims, writes it to lab_vectors_ch2.json, and fails if the committed file
is stale; tests/gate-notes.test.js then checks the TypeScript against the same file:

- each challenge's target column and its proven minimum 2-input NAND and NOR counts
  (exhaustive search, so "the proven minimum" in the lab's feedback is true);
- each preset bench's output column;
- the minterm-set operations on sample lists.

    python3 content/gate-notes/_checks/dl/l2_lab_vectors.py --write   # refresh the JSON
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402

OUT = pathlib.Path(__file__).parent / "lab_vectors_ch2.json"

CHALLENGES = [
    ("not", "A'", ["A"]),
    ("and", "AB", ["A", "B"]),
    ("or", "A + B", ["A", "B"]),
    ("nand", "(AB)'", ["A", "B"]),
    ("nor", "(A + B)'", ["A", "B"]),
    ("xor", "A \\oplus B", ["A", "B"]),
    ("xnor", "A \\odot B", ["A", "B"]),
    ("inhibit", "A'B", ["A", "B"]),
    ("ab-c", "AB + C", ["A", "B", "C"]),
]
PRESETS = {
    "xor4": ("A \\oplus B", ["A", "B"]),
    "majority": ("AB + BC + CA", ["A", "B", "C"]),
    "glitch": ("X X'", ["X"]),
    "nor4": ("A \\odot B", ["A", "B"]),
}
SETS = [([1, 3, 5, 7], [3, 6, 7], 3), ([0, 2, 5, 8, 14], [2, 3, 6, 8, 14, 15], 4)]


def build():
    ch = []
    for cid, expr, vars_ in CHALLENGES:
        t = bl.tt(expr, vars_)
        ch.append({"id": cid, "inputs": vars_, "table": list(t),
                   "min": {"NAND": bl.min_gates(t, "NAND"), "NOR": bl.min_gates(t, "NOR")}})
    pre = {k: list(bl.tt(e, v)) for k, (e, v) in PRESETS.items()}
    sets = []
    for f, g, n in SETS:
        F, G = set(f), set(g)
        r = range(2 ** n)
        sets.append({"f": f, "g": g, "n": n, "and": [i for i in r if i in F and i in G], "or": [i for i in r if i in F or i in G],
                     "xor": [i for i in r if (i in F) != (i in G)], "notF": [i for i in r if i not in F]})
    return {"challenges": ch, "presets": pre, "sets": sets}


data = build()
# The minimums quoted in the lessons (gate-count table in dl-02-05) and in the lab.
mins = {c["id"]: c["min"] for c in data["challenges"]}
assert mins["xor"] == {"NAND": 4, "NOR": 5} and mins["xnor"] == {"NAND": 5, "NOR": 4}
assert mins["and"] == {"NAND": 2, "NOR": 3} and mins["or"] == {"NAND": 3, "NOR": 2} and mins["ab-c"]["NOR"] == 3
text = json.dumps(data, indent=1) + "\n"
if "--write" in sys.argv:
    OUT.write_text(text)
    print(f"wrote {OUT.name}")
assert OUT.exists() and OUT.read_text() == text, "lab_vectors_ch2.json is stale: run with --write"
print(f"l2_lab_vectors: {len(data['challenges'])} challenges (minimums proven by search), {len(data['presets'])} presets, {len(data['sets'])} set cases")
