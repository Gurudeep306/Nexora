"""Combinational Workbench (Chapter 4 Live Lab) test vectors.

The lab's logic lives in client/src/gate/notes/labs/combLogic.ts. This check computes, with comblib,
everything that module claims, writes it to lab_vectors_ch4.json, and fails if the committed file is
stale; tests/gate-notes.test.js then checks the TypeScript against the same file:

- MUX outputs (2:1, 4:1, 8:1) over every data and select pattern, enable 0/1, active high and low,
  and the terms of the MUX equation Y = Σ mᵢ(S)·Iᵢ;
- implementation tables (residue columns and names, comblib.residue_name) for fixed cases, the
  presets and seeded random 3- and 4-variable functions over every choice of select variables on
  a 4:1 and an 8:1 MUX, with the truth table the wired MUX realises (each residue name evaluated);
- decoder (2:4, 3:8; enable active high/low; active-low outputs), DEMUX, 4:2 / 8:3 binary and
  priority encoders over every input;
- the decoder + OR (or NOR of the 0-rows, whichever list is shorter, ties → OR) lists;
- each preset's function.

    python3 content/gate-notes/_checks/dl/l4_lab_vectors.py --write   # refresh the JSON
"""
from itertools import permutations, product
import json
import pathlib
import random
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import comblib as cl  # noqa: E402
import minlib as ml  # noqa: E402

OUT = pathlib.Path(__file__).parent / "lab_vectors_ch4.json"

PRESETS = {
    "majority": (["x", "y", "z"], "xy + yz + zx", [], "mux4", [0, 1]),
    "xor3": (["A", "B", "C"], "A \\oplus B \\oplus C", [], "mux4", [0, 1]),
    "gate2021": (["x", "y", "z"], [0, 1, 3, 4, 5, 6], [], "mux4", [1, 2]),
    "gate2023": (["A", "B", "C"], "A' + A'C' + AB'C", [], "mux4", [0, 2]),
    "agtb": (["A1", "A0", "B1", "B0"], None, [], "mux8", [0, 1, 2]),
    "fa-sum": (["x", "y", "z"], "x \\oplus y \\oplus z", [], "dec", [0, 1]),
    "fa-carry": (["x", "y", "z"], "xy + yz + zx", [], "dec", [0, 1]),
    "it2008": (["z", "y", "x"], "x \\oplus z", [], "dec", [0, 1]),
}


def preset_fn(vars_, f):
    if f is None:  # 2-bit A > B, by comparing the numbers
        return [m for m in range(16) if cl.compare(m >> 2, m & 3)[0]]
    return sorted(f) if isinstance(f, list) else bl.minterms(f, vars_)


def eval_name(name, rvars, env):
    """Evaluate a residue name (0, 1 or an SOP in ′ notation) independently of minlib."""
    if name in ("0", "1"):
        return int(name)
    pat = re.compile("(" + "|".join(sorted(map(re.escape, rvars), key=len, reverse=True)) + ")(′?)")
    for t in name.split(" + "):
        lits = pat.findall(t)
        assert "".join(v + p for v, p in lits) == t, (name, t)
        if all(env[v] == (0 if p else 1) for v, p in lits):
            return 1
    return 0


def impl_case(vars_, ones, dcs, sel):
    n = len(vars_)
    cols, rest = cl.residues(ones, n, sel, dcs)
    names, rv = cl.impl_table(ones, n, sel, vars_, dcs)
    realised = []
    for m in range(2 ** n):
        b = cl.bits_of(m, n)
        s = cl.num([b[i] for i in sel])
        realised.append(eval_name(names[s], rv, {vars_[i]: b[i] for i in rest}))
    # The wired MUX realises f on every care row.
    assert all(realised[m] == (m in ones) for m in range(2 ** n) if m not in dcs), (vars_, ones, dcs, sel)
    return {"vars": vars_, "ones": ones, "dcs": dcs, "sel": sel, "cols": [list(c) for c in cols],
            "names": names, "rvars": rv, "realised": realised}


def dec_gate(n, ones, dcs):
    zeros = ml.zeros_of(ones, dcs, n)
    return {"gate": "NOR", "outputs": zeros} if len(zeros) < len(ones) else {"gate": "OR", "outputs": sorted(ones)}


def build():
    # MUX: index ((data * 2^k + sel) * 2 + en) * 2 + enLow.
    mux = {}
    for k in (1, 2, 3):
        out = []
        for d in range(2 ** 2 ** k):
            data = cl.bits_of(d, 2 ** k)
            for s in range(2 ** k):
                for en in (0, 1):
                    for low in (0, 1):
                        net = [("Y", "MUX", {"d": [f"I{i}" for i in range(2 ** k)], "s": [f"S{j}" for j in range(k)],
                                             "en": "E", "en_low": bool(low)})]
                        env = {f"I{i}": data[i] for i in range(2 ** k)}
                        env.update({f"S{j}": b for j, b in enumerate(cl.bits_of(s, k))})
                        env["E"] = en
                        y = cl.evaluate(net, env)["Y"]
                        assert y == (cl.mux(data, cl.bits_of(s, k)) if en != low else 0)
                        out.append(str(y))
        names = [f"S{k - 1 - i}" for i in range(k)]
        terms = [ml.term("".join(map(str, cl.bits_of(i, k))), names).replace("'", "′")
                 for i, _ in cl.mux_sop(k)]
        mux[str(k)] = {"out": "".join(out), "terms": terms}

    # Implementation tables.
    impl = []
    for vars_, ones, dcs, sel in [
        (list("xyz"), [3, 5, 6, 7], [], [2]),
        (list("ABC"), [1, 2, 4, 7], [], [0, 1]),
        (list("ABCD"), [0, 2, 5, 7, 9, 11], [3, 8, 10, 12, 14], [0, 1]),
        (list("ABCD"), [1, 2, 4, 7, 8, 11, 13, 14], [], [3, 1]),
        (list("ABCD"), [0, 3], [1, 2], [0, 1]),
        (list("ABCD"), [], [5], [0, 1, 2]),
    ]:
        impl.append(impl_case(vars_, ones, dcs, sel))
    pre = {}
    for pid, (vars_, f, dcs, target, sel) in PRESETS.items():
        ones = preset_fn(vars_, f)
        pre[pid] = {"vars": vars_, "fn": {"n": len(vars_), "ones": ones, "dcs": dcs}, "target": target, "sel": sel}
        impl.append(impl_case(vars_, ones, dcs, sel))
    rnd = random.Random(2026)
    for n in (3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4):
        vals = [rnd.choice("01X01") for _ in range(2 ** n)]
        ones = [i for i, v in enumerate(vals) if v == "1"]
        dcs = [i for i, v in enumerate(vals) if v == "X"]
        vars_ = list("ABCD")[:n]
        for k in (2, 3):
            for sel in permutations(range(n), k):
                impl.append(impl_case(vars_, ones, dcs, list(sel)))

    # Decoder + gate.
    decgate = []
    cases = [(c["vars"], c["ones"], c["dcs"]) for c in impl]
    seen = set()
    for vars_, ones, dcs in cases:
        key = (len(vars_), tuple(ones), tuple(dcs))
        if key in seen:
            continue
        seen.add(key)
        n = len(vars_)
        g = dec_gate(n, ones, dcs)
        net = [("Q", "DEC", {"a": vars_})]
        net.append(("f", g["gate"], [f"Q.{i}" for i in g["outputs"]] or ["0"]))
        if not g["outputs"]:  # an OR of nothing is 0
            net[-1] = ("f", "BUF", ["0"])
        t = list(cl.truth(net, vars_, "f"))
        assert all(t[m] == (m in ones) for m in range(2 ** n) if m not in dcs)
        decgate.append({"n": n, "ones": ones, "dcs": dcs, **g, "realised": t})

    # Decoders, DEMUX, encoders.
    dec = {}
    for n in (2, 3):
        rows_ = []
        for a in range(2 ** n):
            for en in (0, 1):
                for low in (0, 1):
                    for enlow in (0, 1):
                        eff = 1 - en if enlow else en
                        net = [("Q", "DEC", {"a": [f"A{j}" for j in range(n)], "en": "E", "en_low": bool(enlow), "low": bool(low)})]
                        env = {f"A{j}": b for j, b in enumerate(cl.bits_of(a, n))}
                        env["E"] = en
                        v = cl.evaluate(net, env)
                        out = [v[f"Q.{i}"] for i in range(2 ** n)]
                        assert out == cl.decoder(cl.bits_of(a, n), eff, bool(low))
                        rows_.append({"addr": cl.bits_of(a, n), "en": en, "low": low, "enLow": enlow, "out": out})
        dec[str(n)] = rows_
    demux = {str(n): [{"d": d, "sel": cl.bits_of(s, n), "out": cl.demux(d, cl.bits_of(s, n))}
                      for d in (0, 1) for s in range(2 ** n)] for n in (1, 2, 3)}
    enc = {}
    for size in (4, 8):
        rows_ = []
        for m in range(2 ** size):
            d = cl.bits_of(m, size)[::-1]  # d[i] = bit i of m
            code, valid = cl.priority_encoder(d)
            rows_.append({"d": d, "enc": cl.encoder(d), "pri": code, "valid": valid})
        enc[str(size)] = rows_
    return {"mux": mux, "impl": impl, "decgate": decgate, "decoder": dec, "demux": demux, "encoder": enc, "presets": pre}


data = build()
# Facts the lessons quote about the presets.
by = {(tuple(c["vars"]), tuple(c["ones"]), tuple(c["sel"])): c for c in data["impl"]}
P = data["presets"]
get = lambda p: by[(tuple(P[p]["vars"]), tuple(P[p]["fn"]["ones"]), tuple(P[p]["sel"]))]["names"]  # noqa: E731
assert get("majority") == ["0", "z", "z", "1"]
assert get("xor3") == ["C", "C′", "C′", "C"]
assert get("gate2021") == ["1", "1", "x", "x′"]
assert P["gate2023"]["fn"]["ones"] == [0, 1, 2, 3, 5] and get("gate2023") == ["1", "1", "0", "B′"]
assert P["agtb"]["fn"]["ones"] == [4, 8, 9, 12, 13, 14] and get("agtb") == ["0", "0", "B0′", "0", "1", "0", "1", "B0′"]
assert P["it2008"]["fn"]["ones"] == [1, 3, 4, 6] and dec_gate(3, [1, 3, 4, 6], []) == {"gate": "OR", "outputs": [1, 3, 4, 6]}
assert dec_gate(3, [0, 1, 3, 4, 5, 6], []) == {"gate": "NOR", "outputs": [2, 7]}
text = json.dumps(data, indent=0, ensure_ascii=False) + "\n"
if "--write" in sys.argv:
    OUT.write_text(text)
    print(f"wrote {OUT.name}")
assert OUT.exists() and OUT.read_text() == text, "lab_vectors_ch4.json is stale: run with --write"
print(f"l4_lab_vectors: MUX 2:1/4:1/8:1, {len(data['impl'])} implementation tables, {len(data['decgate'])} decoder + gate "
      f"realisations, decoders, DEMUX, encoders and {len(data['presets'])} presets")
