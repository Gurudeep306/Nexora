"""Counting Lab (Chapter 6 Live Lab) test vectors.

The lab's logic lives in client/src/gate/notes/labs/countLogic.ts. This check computes with countlib the
twelvefold-way table (closed forms, each confirmed by brute-force enumeration), divisibility
inclusion–exclusion terms, derangements, onto counts and Catalan numbers; writes lab_vectors_ch6.json
and fails if the committed file is stale.

    python3 content/gate-notes/_checks/dm/l6_lab_vectors.py --write
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import countlib as K  # noqa: E402

OUT = pathlib.Path(__file__).parent / "lab_vectors_ch6.json"
twelve = []
for n in range(0, 8):
    for k in range(1, 6):
        for bd, xd, r in K.TWELVE:
            v = K.twelvefold(n, k, bd, xd, r)
            if k ** n <= 20000:
                assert v == K.twelvefold_brute(n, k, bd, xd, r), (n, k, bd, xd, r)
            twelve.append([n, k, bd, xd, r, v])
for n, k in [(12, 8), (10, 4), (12, 3)]:
    for bd, xd, r in K.TWELVE:
        twelve.append([n, k, bd, xd, r, K.twelvefold(n, k, bd, xd, r)])
pie = []
for N, ds in [(500, [3, 5, 7]), (123, [2, 3, 5]), (720, [2, 3, 5]), (1000, [6, 10, 15]), (100, [4]), (210, [2, 3, 5, 7])]:
    terms = []
    import itertools
    import math
    for r in range(1, len(ds) + 1):
        for S in itertools.combinations(range(len(ds)), r):
            l = math.lcm(*[ds[i] for i in S])
            terms.append({"set": list(S), "sign": 1 if r % 2 else -1, "lcm": l, "count": N // l})
    total = K.pie_count(N, ds)
    assert total == sum(t["sign"] * t["count"] for t in terms)
    pie.append({"N": N, "ds": ds, "terms": terms, "total": total, "none": N - total})
VEC = {"twelve": twelve, "pie": pie,
       "derangements": [K.derangements_exact(n) for n in range(13)], "onto": [[m, n, K.onto(m, n)] for m in range(8) for n in range(5)],
       "catalan": [K.catalan(n) for n in range(13)]}
for n in range(8):
    assert K.derangements_exact(n) == K.derangements_brute(n)
text = json.dumps(VEC, separators=(",", ":"), ensure_ascii=False) + "\n"
if "--write" in sys.argv:
    OUT.write_text(text)
assert OUT.exists() and OUT.read_text() == text, "lab_vectors_ch6.json is stale: run with --write"
print(f"l6_lab_vectors: {len(twelve)} twelvefold cells (brute-force confirmed where small), {len(pie)} PIE cases")
