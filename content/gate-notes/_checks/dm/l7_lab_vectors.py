"""Recurrence Lab (Chapter 7 Live Lab) test vectors.

The lab's logic lives in client/src/gate/notes/labs/recLogic.ts (floating point). This check computes
exactly with reclib/sympy: iterated terms (with forcing terms), characteristic roots with multiplicity,
the homogeneous closed-form constants (sympy, cross-checked with rsolve), and generating-function
series; writes lab_vectors_ch7.json and fails if the committed file is stale.

    python3 content/gate-notes/_checks/dm/l7_lab_vectors.py --write
"""
import json
import pathlib
import sys

import mpmath as mp
import sympy as sp

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import reclib as R  # noqa: E402

OUT = pathlib.Path(__file__).parent / "lab_vectors_ch7.json"
RECS = [
    ([1, 1], [0, 1], None, None, None), ([1, 1], [2, 1], None, None, None), ([5, -6], [1, 2], None, None, None),
    ([4, -4], [0, 1], None, None, None), ([2], [2], [-1], None, None), ([2], [0], [1], None, None),
    ([2, -2], [1, 1], None, None, None), ([1, 1, 1], [0, 0, 1], None, None, None), ([3, -3, 1], [1, 2, 4], None, None, None),
    ([1], [1], [0, 1], None, None), ([0, 4], [0, 0], [0, 1], None, None), ([3], [1], None, 2, 2), ([-5, -6], [1, 0], [0, 0, 3], None, None),
]


def f_of(poly, q, s):
    return lambda n: sum(c * n ** i for i, c in enumerate(poly or [])) + (q * s ** n if q else 0)


mp.mp.dps = 40


def numeric_constants(coeffs, init, rts):
    """Constants of a_n = Σ c n^t r^n fitted to the initial values (40-digit arithmetic)."""
    basis = [(mp.mpc(complex(sp.N(r, 45))), t) for r, m in sorted(rts.items(), key=lambda kv: (float(sp.re(sp.N(kv[0]))), float(sp.im(sp.N(kv[0]))))) for t in range(m)]
    A = mp.matrix([[mp.mpf(j) ** t * r ** j for r, t in basis] for j in range(len(coeffs))])
    cs = mp.lu_solve(A, mp.matrix([mp.mpf(v) for v in init]))
    return [(r, t, cs[i]) for i, (r, t) in enumerate(basis)]


def num(z):
    z = complex(sp.N(z, 30)) if not isinstance(z, (mp.mpc, mp.mpf)) else complex(z)
    return {"re": round(z.real, 9) + 0.0, "im": round(z.imag, 9) + 0.0}


cases = []
for coeffs, init, poly, q, s in RECS:
    terms = R.iterate(coeffs, init, 16, f_of(poly, q, s) if (poly or q) else None)
    rts = R.roots(coeffs)
    assert sum(rts.values()) == len(coeffs)
    roots = sorted(([num(r), m] for r, m in rts.items()), key=lambda t: (t[0]["re"], t[0]["im"]))
    c = {"coeffs": coeffs, "init": init, "terms": [float(t) for t in terms], "roots": roots}
    if not poly and not q:
        cons = numeric_constants(coeffs, init, rts)
        for m in range(16):
            v = sum(k * mp.mpf(m) ** t * r ** m for r, t, k in cons)
            assert abs(v - terms[m]) < mp.mpf(10) ** -15 * max(1, abs(terms[m])), (coeffs, m, v, terms[m])
        c["solution"] = sorted(({"root": num(r), "power": t, "c": num(k)} for r, t, k in cons), key=lambda d: (d["root"]["re"], d["root"]["im"], d["power"]))
    if poly:
        c["poly"] = poly
    if q:
        c["q"], c["s"] = q, s
    cases.append(c)
SERIES = [([1, 1], R.binom_power(-1, 3)), ([1], R.binom_power(-1, 2)), ([1], [1, -1, -1]), ([0, 0, 0, 0, 0, 0, 0, 0, 0, 1], R.binom_power(-1, 3)),
          ([1, -1], R.binom_power(-1, 2)), ([2, -3], [1, -3, 2])]
ser = [{"num": n, "den": d, "coeffs": [float(v) for v in R.series(n, d, 16)]} for n, d in SERIES]
VEC = {"recs": cases, "series": ser, "binom": [[s, k, R.binom_power(s, k)] for s in (-1, 1) for k in range(1, 6)]}
text = json.dumps(VEC, separators=(",", ":")) + "\n"
if "--write" in sys.argv:
    OUT.write_text(text)
assert OUT.exists() and OUT.read_text() == text, "lab_vectors_ch7.json is stale: run with --write"
print(f"l7_lab_vectors: {len(cases)} recurrences (closed forms checked against the exact terms), {len(ser)} series")
