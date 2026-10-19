"""Adder Race (Chapter 4 Live Lab) test vectors.

The lab's logic lives in client/src/gate/notes/labs/adderLogic.ts. This check computes, with
arithlib, everything that module claims, writes it to lab_vectors_ch4.json, and fails if the
committed file is stale; tests/gate-notes.test.js then checks the TypeScript against the same file:

- for the ripple-carry and carry look-ahead Adder Race circuits (XOR row b ⊕ K, carry in K, flags
  V = c_n ⊕ c_{n-1} and Z) at widths 4, 8 and 16 and XOR delays 1 and 2: the gate count, the static
  worst-case delay of the sums and carry out, and, for fixed and seeded random input changes (add
  and subtract), the result, the C, V, N, Z flags and the transport-delay settling time of every sum,
  the carry out and V (the race is settled when Z has settled too);
- the scaling table (unit gates, MUX = 2): ripple, CLA with fan-in 4, carry-select with 4-bit blocks
  for n = 4 … 64.

    python3 content/gate-notes/_checks/dl/l4_lab_vectors.py --write   # refresh the JSON
"""
import json
import pathlib
import random
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import arithlib as al  # noqa: E402
import comblib as cl  # noqa: E402

OUT = pathlib.Path(__file__).parent / "lab_vectors_ch4.json"


def outs(n):
    return [f"s{i}" for i in range(n)] + [f"c{n}", "V"]


def case(kind, n, xd, prev, nxt):
    net = al.lab_adder(kind, n)
    ins = al.lab_inputs(n)
    st, _ = al.simulate(net, ins, al.lab_env(n, *prev), al.lab_env(n, *nxt), {"XOR": xd})
    v = cl.evaluate(net, al.lab_env(n, *nxt))
    a, b, K = nxt
    s = al.word(v, "s", n)
    # Independent check of the result and the flags against integer arithmetic.
    want = (a + b) % 2 ** n if K == 0 else (a - b) % 2 ** n
    sa, sb = al.tc(a, n), al.tc(b, n)
    true = sa + sb if K == 0 else sa - sb
    assert s == want and v["V"] == int(not -(2 ** (n - 1)) <= true <= 2 ** (n - 1) - 1) and v["Z"] == int(s == 0)
    assert v[f"c{n}"] == (int(a + b >= 2 ** n) if K == 0 else int(a >= b))
    return {"kind": kind, "n": n, "xor": xd, "prev": list(prev), "next": list(nxt), "sum": s, "C": v[f"c{n}"], "V": v["V"],
            "N": s >> (n - 1), "Z": v["Z"], "settle": [st[x] for x in outs(n)], "settled": max(st[x] for x in outs(n) + ["Z"])}


def build():
    rnd = random.Random(404)
    circuits, cases = [], []
    for kind in ("rca", "cla"):
        for n in (4, 8, 16):
            net = al.lab_adder(kind, n)
            for xd in (1, 2):
                t = al.arrival(net, al.lab_inputs(n), {"XOR": xd})
                circuits.append({"kind": kind, "n": n, "xor": xd, "gates": sum(1 for _, op, _ in net if op != "BUF"),
                                 "worst": max(t[x] for x in outs(n)[:-1])})
            M = 2 ** n
            fixed = [((0, 0, 0), (1, M - 1, 0)), ((0, 0, 0), (M // 2 - 1, 1, 0)), ((0, 0, 0), (5 % M, 6 % M, 1)),
                     ((1, M - 1, 0), (0, 0, 0)), ((3, 5, 0), (3, 5, 1)), ((0, 0, 0), (M // 2, M // 2, 0))]
            for _ in range(8):
                fixed.append(((rnd.randrange(M), rnd.randrange(M), rnd.randrange(2)), (rnd.randrange(M), rnd.randrange(M), rnd.randrange(2))))
            for prev, nxt in fixed:
                for xd in (1, 2):
                    cases.append(case(kind, n, xd, prev, nxt))
    scale = []
    for n in (4, 8, 16, 32, 64):
        ins = al.inputs_of(n)

        def worst(net, d=None):
            t = al.arrival(net, ins, d)
            return max(t[x] for x in [f"s{i}" for i in range(n)] + [f"c{n}"])

        scale.append({"n": n, "rca": worst(al.rca(n)), "cla": worst(al.cla(n)), "csel": worst(al.carry_select(n, 4), {"MUX": 2})})
    return {"circuits": circuits, "cases": cases, "scaling": scale}


data = build()
# Facts the lessons quote.
W = {(c["kind"], c["n"], c["xor"]): c["worst"] for c in data["circuits"]}
S = {r["n"]: r for r in data["scaling"]}
assert S[16]["rca"] == 33 and S[16]["cla"] == 8 and S[64]["cla"] == 12 and S[4]["cla"] == 4
assert [S[n]["rca"] for n in (4, 8, 16, 32, 64)] == [2 * n + 1 for n in (4, 8, 16, 32, 64)]
one = next(c for c in data["cases"] if c["kind"] == "rca" and c["n"] == 8 and c["xor"] == 1 and c["next"] == [1, 255, 0])
assert one["sum"] == 0 and one["C"] == 1 and one["V"] == 0 and one["Z"] == 1
text = json.dumps(data, indent=0, ensure_ascii=False) + "\n"
if "--write" in sys.argv:
    OUT.write_text(text)
    print(f"wrote {OUT.name}")
assert OUT.exists() and OUT.read_text() == text, "lab_vectors_ch4.json is stale: run with --write"
print(f"l4_lab_vectors: {len(data['circuits'])} circuits, {len(data['cases'])} timed input changes, scaling n = 4 … 64 "
      f"(16-bit ripple {S[16]['rca']} vs CLA {S[16]['cla']} unit delays)")
