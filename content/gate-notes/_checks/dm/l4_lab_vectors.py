"""Hasse Lab (Chapter 4 Live Lab) test vectors.

The lab's logic lives in client/src/gate/notes/labs/orderLogic.ts. This check computes with orderlib (on
the element order the lab uses) the covering pairs, levels, extreme elements, lub/glb of every pair,
the lattice / distributive failure witnesses, complements, linear-extension counts, height and width,
writes lab_vectors_ch4.json, and fails if the committed file is stale.

    python3 content/gate-notes/_checks/dm/l4_lab_vectors.py --write
"""
import itertools
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import orderlib as O  # noqa: E402

OUT = pathlib.Path(__file__).parent / "lab_vectors_ch4.json"


def divisors(n):
    d = O.divisors(n)
    return [str(x) for x in d], [[d[j] % d[i] == 0 for j in range(len(d))] for i in range(len(d))]


def subsets(k):
    S = sorted([list(c) for r in range(k + 1) for c in itertools.combinations(range(1, k + 1), r)], key=lambda s: (len(s), ",".join(map(str, s))))
    lab = [("{" + ",".join(map(str, s)) + "}") if s else "∅" for s in S]
    return lab, [[set(S[i]) <= set(S[j]) for j in range(len(S))] for i in range(len(S))]


def pairs(src):
    labels, ps = [], []
    for part in [p.strip() for p in src.split(",") if p.strip()]:
        a, b = [x.strip() for x in part.split("<")]
        for x in (a, b):
            if x not in labels:
                labels.append(x)
        ps.append((labels.index(a), labels.index(b)))
    n = len(labels)
    le = [[i == j for j in range(n)] for i in range(n)]
    for a, b in ps:
        le[a][b] = True
    for k in range(n):
        for i in range(n):
            if le[i][k]:
                for j in range(n):
                    if le[k][j]:
                        le[i][j] = True
    return labels, le


CASES = [("div:30", divisors(30)), ("div:12", divisors(12)), ("div:24", divisors(24)), ("div:36", divisors(36)), ("sub:3", subsets(3)),
         ("0<a, a<b, b<1, 0<c, c<1", pairs("0<a, a<b, b<1, 0<c, c<1")), ("0<a, 0<b, 0<c, a<1, b<1, c<1", pairs("0<a, 0<b, 0<c, a<1, b<1, c<1")),
         ("a<c, a<d, b<c, b<d", pairs("a<c, a<d, b<c, b<d")), ("2<6, 3<6, 6<12, 12<24", pairs("2<6, 3<6, 6<12, 12<24")),
         ("a<b, c<d", pairs("a<b, c<d"))]


def case(src, lab_le):
    labels, le = lab_le
    n = len(labels)
    P = O.Poset(range(n), lambda i, j: le[i][j])
    lat = P.is_lattice()
    dist = lat and P.is_distributive()
    comp = lat and P.is_complemented()
    lf = P.lattice_failure()
    return {"src": src, "labels": labels, "le": le, "covers": [list(c) for c in P.covers()],
            "levels": [P.levels()[i] for i in range(n)], "minimal": P.minimal(), "maximal": P.maximal(),
            "least": P.least(), "greatest": P.greatest(),
            "lub": [[P.lub(a, b) for b in range(n)] for a in range(n)], "glb": [[P.glb(a, b) for b in range(n)] for a in range(n)],
            "latticeFailure": list(lf) if lf else None, "distributiveFailure": list(P.distributive_failure()) if lat and not dist else None,
            "complements": [P.complements(a) for a in range(n)] if lat else None,
            "analysis": {"lattice": lat, "distributive": bool(dist), "complemented": bool(comp), "boolean": bool(lat and dist and comp)},
            "linearExtensions": P.linear_extensions(), "height": P.height(), "width": P.width()}


VEC = {"cases": [case(s, x) for s, x in CASES]}
text = json.dumps(VEC, separators=(",", ":"), ensure_ascii=False) + "\n"
if "--write" in sys.argv:
    OUT.write_text(text)
assert OUT.exists() and OUT.read_text() == text, "lab_vectors_ch4.json is stale: run with --write"
print(f"l4_lab_vectors: {len(CASES)} posets")
