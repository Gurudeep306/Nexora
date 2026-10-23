"""Group Lab (Chapter 5 Live Lab) test vectors.

The lab's logic lives in client/src/gate/notes/labs/groupLogic.ts. This check rebuilds each preset with
grouplib (same element order and labels), and records the operation table, the failure witnesses for
closure / associativity / commutativity, identity, inverses, kind, element orders, generators, all
subgroups and the left cosets of each, plus square-and-multiply traces; writes lab_vectors_ch5.json and
fails if the committed file is stale.

    python3 content/gate-notes/_checks/dm/l5_lab_vectors.py --write
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import grouplib as G  # noqa: E402

OUT = pathlib.Path(__file__).parent / "lab_vectors_ch5.json"


def labelled(S, labels):
    idx = {e: i for i, e in enumerate(S.E)}
    table = [[idx.get(S.T[(a, b)], -1) for b in S.E] for a in S.E]
    T = G.Structure(range(len(S.E)), lambda a, b: table[a][b])
    return labels, table, T


def perm_label(p):
    return "[" + "".join(str(x + 1) for x in p) + "]"


PRESETS = {
    "z12": labelled(G.Zn(12), [str(i) for i in range(12)]),
    "z6": labelled(G.Zn(6), [str(i) for i in range(6)]),
    "u15": labelled(G.Zn_star(15), [str(u) for u in G.units(15)]),
    "u17": labelled(G.Zn_star(17), [str(u) for u in G.units(17)]),
    "m10": labelled(G.mult_mod([1, 2, 3, 5, 7, 8, 9], 10), ["1", "2", "3", "5", "7", "8", "9"]),
    "m8": labelled(G.mult_mod(list(range(8)), 8), [str(i) for i in range(8)]),
    "s3": labelled(G.Sn(3), [perm_label(p) for p in G.Sn(3).E]),
    "klein": labelled(G.klein(), [f"({a},{b})" for a, b in G.klein().E]),
}


def case(pid, labels, table, T):
    out = {"id": pid, "labels": labels, "table": table,
           "closure": list(T.closure_failure()[:2]) if T.closure_failure() else None,
           "assoc": list(T.associative_failure()) if T.associative_failure() else None,
           "comm": list(T.commutative_failure()) if T.commutative_failure() else None,
           "kind": T.kind()}
    if T.closed():
        out["identity"] = T.identity()
        out["inverses"] = [T.inverse(a) for a in T.E]
    if T.is_group():
        out["orders"] = [T.order(a) for a in T.E]
        out["generators"] = T.generators()
        subs = sorted(T.subgroups(), key=lambda h: (len(h), sorted(labels[x] for x in h)))
        out["subgroups"] = [sorted(h) for h in subs]
        out["cosets"] = [[sorted(c) for c in T.left_cosets(sorted(h))] for h in subs]
    return out


POW = [(13, 99, 17), (3, 51, 5), (2, 10, 1000), (7, 0, 9), (5, 117, 19), (3, 16, 17)]
VEC = {"presets": [case(k, *v) for k, v in PRESETS.items()],
       "pow": [{"a": a, "k": k, "n": n, "value": G.square_and_multiply(a, k, n)[0], "steps": [[b, v] for b, v in G.square_and_multiply(a, k, n)[1]]} for a, k, n in POW],
       "orders": [{"a": a, "n": n, "order": G.order_mod(a, n)} for a, n in [(3, 17), (2, 7), (10, 11), (4, 15)]]}
text = json.dumps(VEC, separators=(",", ":"), ensure_ascii=False) + "\n"
if "--write" in sys.argv:
    OUT.write_text(text)
assert OUT.exists() and OUT.read_text() == text, "lab_vectors_ch5.json is stale: run with --write"
print(f"l5_lab_vectors: {len(PRESETS)} structures, {len(POW)} power traces")
