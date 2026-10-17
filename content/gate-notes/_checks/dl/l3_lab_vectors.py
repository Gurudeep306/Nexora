"""K-map Solver (Chapter 3 Live Lab) test vectors.

The lab's logic lives in client/src/gate/notes/labs/kmapLogic.ts. This check computes, with minlib,
everything that module claims, writes it to lab_vectors_ch3.json, and fails if the committed file is
stale; tests/gate-notes.test.js then checks the TypeScript against the same file:

- the Quine–McCluskey rounds (cubes and ticks) and the prime implicants;
- the EPI / redundant / selective classification;
- every minimal SOP and POS cover (Petrick's method in minlib, branch and bound in the lab);
- the loop rectangles of every prime implicant on 2–4 variable maps (wrap-around pieces);
- each preset's function.

    python3 content/gate-notes/_checks/dl/l3_lab_vectors.py --write   # refresh the JSON
"""
import json
import pathlib
import random
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import minlib as ml  # noqa: E402

OUT = pathlib.Path(__file__).parent / "lab_vectors_ch3.json"

FIXED = [
    (2, [1, 2, 3], []),
    (3, [1, 2, 3, 4, 5, 6], []),
    (3, [0, 1, 2, 5], []),
    (4, [0, 1, 2, 4, 5, 6, 8, 9, 12, 13, 14], []),
    (4, [1, 5, 6, 7, 11, 12, 13, 15], []),
    (4, [0, 2, 5, 7, 9, 11], [3, 8, 10, 12, 14]),
    (4, [1, 2, 3, 4, 5, 7, 10, 12, 13, 14], []),
    (4, [0, 2, 4, 5, 6, 10], []),
    (4, [1, 2, 5, 12], [0, 7, 8, 10, 13, 15]),
    (4, [0, 2, 8, 10, 15], [3, 11, 12, 14]),
    (5, [0, 2, 5, 7, 8, 10, 13, 15, 16, 18, 21, 23, 24, 26, 29, 31], []),
    (5, [0, 1, 4, 5, 9, 13, 16, 17, 20, 21, 25, 29, 31], [3, 30]),
]
PRESETS = {
    "octet": (4, [0, 1, 2, 4, 5, 6, 8, 9, 12, 13, 14], []),
    "centre": (4, [1, 5, 6, 7, 11, 12, 13, 15], []),
    "cyclic": (3, [1, 2, 3, 4, 5, 6], []),
    "gate2018": (4, [0, 2, 5, 7, 9, 11], [3, 8, 10, 12, 14]),
    "gate2026": (4, [1, 2, 3, 4, 5, 7, 10, 12, 13, 14], []),
    "five": (5, [0, 2, 5, 7, 8, 10, 13, 15, 16, 18, 21, 23, 24, 26, 29, 31], []),
}


def case(n, ones, dcs):
    rounds, _ = ml.qm(ones, dcs, n)
    ps, es, red, sel = ml.classify(ones, dcs, n)
    sop = [list(c) for c in ml.min_covers(ones, dcs, n)]
    pos = [list(c) for c in ml.min_pos_covers(ones, dcs, n)]
    rects = {p: [list(r) for r in ml.loop_rects(p, n)] for p in ps} if n <= 4 else {}
    return {"n": n, "ones": ones, "dcs": dcs,
            "rounds": [[[c, k] for c, k in r] for r in rounds],
            "primes": ps, "essential": es, "redundant": red, "selective": sel,
            "sop": sop, "pos": pos, "rects": rects}


def build():
    rnd = random.Random(2026)
    cases = [case(*c) for c in FIXED]
    for n in (2, 3, 4, 4, 4, 4, 4, 4):
        vals = [rnd.choice("01X0") for _ in range(2 ** n)]
        ones = [i for i, v in enumerate(vals) if v == "1"]
        dcs = [i for i, v in enumerate(vals) if v == "X"]
        if ones:
            cases.append(case(n, ones, dcs))
    return {"cases": cases, "presets": {k: {"n": n, "ones": o, "dcs": d} for k, (n, o, d) in PRESETS.items()}}


data = build()
# Facts the lessons quote about the presets.
pre = {k: case(*v) for k, v in PRESETS.items()}
assert len(pre["cyclic"]["primes"]) == 6 and not pre["cyclic"]["essential"] and len(pre["cyclic"]["sop"]) == 2
assert pre["centre"]["redundant"] == ["-1-1"]
assert len(pre["gate2018"]["essential"]) == 3 and len(pre["gate2026"]["sop"]) == 3
text = json.dumps(data, indent=1) + "\n"
if "--write" in sys.argv:
    OUT.write_text(text)
    print(f"wrote {OUT.name}")
assert OUT.exists() and OUT.read_text() == text, "lab_vectors_ch3.json is stale: run with --write"
print(f"l3_lab_vectors: {len(data['cases'])} functions (Q–M rounds, PIs, EPIs, minimal SOP/POS covers, loops), {len(data['presets'])} presets")
