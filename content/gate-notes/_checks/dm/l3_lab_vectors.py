"""Relation Lab (Chapter 3 Live Lab) test vectors.

The lab's logic lives in client/src/gate/notes/labs/relLogic.ts. This check computes with rellib the
property verdicts and witnesses, compositions, inverses, closures (Warshall stages), equivalence classes
and the family counts (which rellib.count_brute confirms by enumeration for n ≤ 3), writes
lab_vectors_ch3.json, and fails if the committed file is stale.

    python3 content/gate-notes/_checks/dm/l3_lab_vectors.py --write
"""
import json
import pathlib
import random
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import rellib as R  # noqa: E402

OUT = pathlib.Path(__file__).parent / "lab_vectors_ch3.json"
FIXED = [
    (4, [(0, 1), (1, 2), (2, 3)]),
    (4, [(0, 0), (1, 0), (1, 1), (1, 2), (1, 3), (2, 0), (2, 1), (2, 2), (2, 3)]),
    (3, [(0, 1), (0, 2), (2, 0), (2, 1)]),
    (6, [(a, b) for a in range(6) for b in range(6) if (a - b) % 3 == 0]),
    (6, [(a, b) for a in range(6) for b in range(6) if (b + 1) % (a + 1) == 0]),
    (3, []),
    (3, [(0, 0), (1, 1), (2, 2)]),
    (2, [(0, 1), (1, 0)]),
]
rng = random.Random(3)
for _ in range(10):
    n = rng.randint(2, 5)
    FIXED.append((n, sorted({(rng.randrange(n), rng.randrange(n)) for _ in range(rng.randint(0, n * n))})))

for n in (1, 2, 3):
    assert R.count_formulas(n) == R.count_brute(n)


def M(n, S):
    return [[(i, j) in S for j in range(n)] for i in range(n)]


def case(n, pairs):
    A = list(range(n))
    S = frozenset(pairs)
    v = R.violations(S, A)
    clo, stages = R.transitive_closure(S, A)
    eq = R.equivalence(S, A)
    return {"n": n, "pairs": [list(p) for p in sorted(S)],
            "violations": {k: (list(w) if w else None) for k, w in v.items()},
            "square": M(n, R.compose(S, S)), "inverse": M(n, R.inverse(S)),
            "reflexive": M(n, R.reflexive_closure(S, A)), "symmetric": M(n, R.symmetric_closure(S)),
            "stages": stages, "equivalence": M(n, R.equivalence_closure(S, A)),
            "isEquivalence": eq, "isPartialOrder": R.partial_order(S, A), "classes": R.classes(S, A) if eq else None}


VEC = {"cases": [case(n, p) for n, p in FIXED], "counts": {str(n): R.count_formulas(n) for n in range(1, 7)}}
text = json.dumps(VEC, indent=None, separators=(",", ":")) + "\n"
if "--write" in sys.argv:
    OUT.write_text(text)
assert OUT.exists() and OUT.read_text() == text, "lab_vectors_ch3.json is stale: run with --write"
print(f"l3_lab_vectors: {len(FIXED)} relations; family counts for n = 1..6 (brute-force confirmed for n <= 3)")
