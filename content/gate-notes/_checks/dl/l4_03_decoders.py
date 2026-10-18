"""Checks for dl/04-combinational-circuits/03-decoders-encoders: decoder outputs as minterms (and
maxterms when active-low), decoder + OR / NOR / NAND / AND over every 3-variable function, the
worked examples (full adder, NOR of four outputs, active-low NAND/AND, address order reversed),
decoder trees as netlists of DEC nodes with enables (3:8, 4:16, 5:32, 6:64) against comblib's
counts and the closed form, DEMUX = decoder with data on the enable, encoders, priority-encoder
equations (4:2 and 8:3, both priority orders) and their MUX realisation, the 1992 code assignments,
memory-decoder sizes, decoder-into-MUX row counts, the seven PYQ keys and every practice answer,
option and common wrong answer."""
import math
import pathlib
import sys
from itertools import combinations, product

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import comblib as cl  # noqa: E402

L = cl.lesson_text("03-decoders-encoders.md")
LN = " ".join(L.split())
has = lambda *s: bl.must_contain(LN, *s)
P = cl.practice()
BANK = bl.bank()
V2, V3 = list("AB"), list("ABC")


def ones(net, ins, out):
    return cl.ones_of(cl.truth(net, ins, out))


def gate_on_decoder(gate, idx, n=3, low=False, en=None, a=None):
    a = a or V3[:n]
    d = {"a": a, "low": low}
    if en:
        d["en"] = en
    return [("Q", "DEC", d), ("f", gate, [f"Q.{i}" for i in idx])]


def rev(i, n):
    return int(format(i, f"0{n}b")[::-1], 2)


# ── Decoder outputs are minterms; active-low outputs are maxterms ───────────
for n in (1, 2, 3):
    for e in (0, 1):
        for m in range(2 ** n):
            bits = cl.bits_of(m, n)
            hi, lo = cl.decoder(bits, e), cl.decoder(bits, e, low=True)
            assert hi == [e * int(i == m) for i in range(2 ** n)]
            assert lo == [1 - x for x in hi]
            if e:
                assert sum(hi) == 1 and sum(lo) == 2 ** n - 1  # one-hot / one-cold
# The 2:4 table in the lesson (E, A1, A0 → D0..D3).
TABLE24 = {(0, 0, 0): "0000", (1, 0, 0): "1000", (1, 0, 1): "0100", (1, 1, 0): "0010", (1, 1, 1): "0001"}
for (e, a1, a0), want in TABLE24.items():
    assert "".join(map(str, cl.decoder([a1, a0], e))) == want
for a1, a0 in product((0, 1), repeat=2):
    assert cl.decoder([a1, a0], 0) == [0, 0, 0, 0]
# D_i = E m_i as equations of the 2:4 decoder.
EQ24 = ["E A1' A0'", "E A1' A0", "E A1 A0'", "E A1 A0"]
for i, eq in enumerate(EQ24):
    net = [("Q", "DEC", {"a": ["A1", "A0"], "en": "E"})]
    assert cl.truth(net, ["E", "A1", "A0"], f"Q.{i}") == bl.tt(eq, ["E", "A1", "A0"])
has("D_i = E \\cdot m_i(A_{n-1}, \\dots, A_0)", "the active-low outputs are the **maxterms** of the address")

# ── Decoder + one gate realises every 3-variable function ──────────────────
for t in bl.all_functions(3):
    o = cl.ones_of(t)
    z = [i for i in range(8) if i not in o]
    if o:
        assert cl.truth(gate_on_decoder("OR", o), V3, "f") == t
        assert cl.truth(gate_on_decoder("NAND", o, low=True), V3, "f") == t
    if z:
        assert cl.truth(gate_on_decoder("NOR", z), V3, "f") == t
        assert cl.truth(gate_on_decoder("AND", z, low=True), V3, "f") == t
# With the enable off: OR form gives 0, NOR form gives 1.
for idx in ([1, 2, 4, 7], [0, 3, 5, 6]):
    net = gate_on_decoder("OR", idx, en="E")
    assert all(cl.evaluate(net, dict(zip(["E"] + V3, [0] + list(b))))["f"] == 0 for b in product((0, 1), repeat=3))
    net = gate_on_decoder("NOR", idx, en="E")
    assert all(cl.evaluate(net, dict(zip(["E"] + V3, [0] + list(b))))["f"] == 1 for b in product((0, 1), repeat=3))
has("the OR form gives 0 while the NOR form gives 1")

# Trap: AND of ≥ 2 different active-high outputs is 0; OR of ≥ 2 different active-low outputs is 1.
for k in (2, 3, 4):
    for idx in combinations(range(8), k):
        assert ones(gate_on_decoder("AND", idx), V3, "f") == []
        assert ones(gate_on_decoder("OR", idx, low=True), V3, "f") == list(range(8))
has("an AND of two or more **different** outputs is the constant 0", "is the constant 1")

# Trick: the short list. A function with 7 ones = NOR of 1 output.
assert cl.truth(gate_on_decoder("NOR", [5]), V3, "f") == bl.tt("(A B' C)'", V3)

# Trap: decoder order. Reversing the address order reverses the bits of each index.
for idx in ([1, 3, 4, 6], [1, 2, 3], [0, 3, 5, 6]):
    a = ones(gate_on_decoder("OR", idx, a=["C", "B", "A"]), V3, "f")
    assert a == sorted(rev(i, 3) for i in idx)
assert sorted(rev(i, 3) for i in [1, 3, 4, 6]) == [1, 3, 4, 6] and [rev(1, 3), rev(3, 3)] == [4, 6]
has("($1 = 001 \\to 100 = 4$, $3 = 011 \\to 110 = 6$)", "the set $\\{1, 3, 4, 6\\}$ maps onto itself: $1 \\leftrightarrow 4$")

# ── Worked examples: functions from a decoder ───────────────────────────────
FA = ["A", "B", "K"]
fa_s = gate_on_decoder("OR", [1, 2, 4, 7], a=FA)
fa_c = gate_on_decoder("OR", [3, 5, 6, 7], a=FA)
assert cl.truth(fa_s, FA, "f") == bl.tt("A \\oplus B \\oplus K", FA)
assert cl.truth(fa_c, FA, "f") == bl.tt("AB + A K + B K", FA)
# Half adder from the lower pins with the MSB held at 0, and directly from a 2:4 decoder.
for b, c in product((0, 1), repeat=2):
    d = cl.decoder([0, b, c])
    assert (d[1] | d[2], d[3]) == (b ^ c, b & c)
    d2 = cl.decoder([b, c])
    assert (d2[1] | d2[2], d2[3]) == (b ^ c, b & c)
# Medium: NOR(D0, D3, D5, D6) = XOR3; OR of them = XNOR3.
assert ones(gate_on_decoder("NOR", [0, 3, 5, 6]), V3, "f") == [1, 2, 4, 7]
assert cl.truth(gate_on_decoder("NOR", [0, 3, 5, 6]), V3, "f") == bl.tt("A \\oplus B \\oplus C", V3)
assert cl.truth(gate_on_decoder("OR", [0, 3, 5, 6]), V3, "f") == bl.tt("(A \\oplus B \\oplus C)'", V3)
# GATE: active-low NAND(0,1,6,7) and AND(2,3,4,5) are both A ⊙ B; active-high reading gives constants.
xn = bl.tt("A \\odot B", V3)
assert cl.truth(gate_on_decoder("NAND", [0, 1, 6, 7], low=True), V3, "f") == xn
assert cl.truth(gate_on_decoder("AND", [2, 3, 4, 5], low=True), V3, "f") == xn
assert bl.minterms("A \\odot B", V3) == [0, 1, 6, 7]
assert ones(gate_on_decoder("NAND", [0, 1, 6, 7]), V3, "f") == list(range(8))
assert ones(gate_on_decoder("AND", [2, 3, 4, 5]), V3, "f") == []
# Edge: OR(D1, D2, D3) with A as MSB, and with C as MSB.
assert cl.truth(gate_on_decoder("OR", [1, 2, 3]), V3, "f") == bl.tt("A'(B + C)", V3)
assert ones(gate_on_decoder("OR", [1, 2, 3], a=["C", "B", "A"]), V3, "f") == [2, 4, 6]
assert cl.truth(gate_on_decoder("OR", [1, 2, 3], a=["C", "B", "A"]), V3, "f") == bl.tt("C'(A + B)", V3)
has("$f_a = \\Sigma m(1, 2, 3) = \\overline{A}(B + C)$", "$f_b = \\overline{C}(A + B)$")

# ── Expansion ───────────────────────────────────────────────────────────────
def tree_net(n, k, top_pad=True):
    """An n:2^n decoder from k:2^k decoders with active-high enables and no gates, as a netlist.
    Address A{n-1} … A0. Returns (net, inputs, list of the 2^n output names, block count)."""
    addr = [f"A{i}" for i in range(n - 1, -1, -1)]
    net, count = [], [0]

    def build(bits, en, prefix):
        """Decode `bits` (MSB first) with enable `en`; return the output names (2^len(bits))."""
        if len(bits) <= k:
            name = f"{prefix}"
            pad = ["0"] * (k - len(bits))
            net.append((name, "DEC", {"a": pad + bits, "en": en}))
            count[0] += 1
            return [f"{name}.{i}" for i in range(2 ** len(bits))]
        high, low = bits[: len(bits) - k], bits[len(bits) - k:]
        enables = build(high, en, prefix + "t")
        outs = []
        for j, e in enumerate(enables):
            name = f"{prefix}L{j}"
            net.append((name, "DEC", {"a": low, "en": e}))
            count[0] += 1
            outs += [f"{name}.{i}" for i in range(2 ** k)]
        return outs

    outs = build(addr, "E", "D")
    return net, ["E"] + addr, outs, count[0]


# The netlist builder emits DEC nodes after their enable sources only if the top is built first.
def ordered(net):
    """Topological order: a node whose enable comes from another DEC must follow it."""
    out, done = [], set()
    pending = list(net)
    while pending:
        for x in pending:
            en = x[2].get("en")
            src = en.split(".")[0] if en and "." in en else None
            if src is None or src in done:
                out.append(x)
                done.add(x[0])
                pending.remove(x)
                break
    return out


TREES = {(3, 2): ([2, 1], 3), (4, 2): ([4, 1], 5), (6, 3): ([8, 1], 9), (5, 3): ([4, 1], 5),
         (8, 2): ([64, 16, 4, 1], 85), (6, 2): ([16, 4, 1], 21), (3, 1): ([4, 2, 1], 7), (8, 4): ([16, 1], 17)}
for (n, k), (levels, total) in TREES.items():
    assert cl.decoder_tree(n, k) == (levels, total), (n, k)
    if n <= 6:
        net, ins, outs, cnt = tree_net(n, k)
        net = ordered(net)
        assert cnt == total, (n, k, cnt)
        for r in cl.rows(ins):
            v = cl.evaluate(net, r)
            want = cl.decoder([r[a] for a in ins[1:]], r["E"])
            assert [v[o] for o in outs] == want, (n, k)
    if n % k == 0:
        assert total == (2 ** n - 1) // (2 ** k - 1)
    assert len(levels) == math.ceil(n / k)
# Edge 5:32: the formula without ceilings would give 4.5.
assert 32 / 8 + 32 / 64 == 4.5
# 3:8 from two 2:4 with one inverter (A2 / ~A2 on the enables).
net = [("U", "DEC", {"a": ["A1", "A0"], "en": "A2"}), ("Lo", "DEC", {"a": ["A1", "A0"], "en": "~A2"})]
for r in cl.rows(["A2", "A1", "A0"]):
    v = cl.evaluate(net, r)
    assert [v[f"Lo.{i}"] for i in range(4)] + [v[f"U.{i}"] for i in range(4)] == cl.decoder([r["A2"], r["A1"], r["A0"]])
# Gate-free 3:8: the top 2:4 has its MSB pin tied to 0; outputs D0, D1 are A2', A2.
for a2 in (0, 1):
    assert cl.decoder([0, a2])[:2] == [1 - a2, a2]
# 4:16 from two 3:8 with an inverter.
net = [("U", "DEC", {"a": ["A2", "A1", "A0"], "en": "A3"}), ("Lo", "DEC", {"a": ["A2", "A1", "A0"], "en": "~A3"})]
for r in cl.rows(["A3", "A2", "A1", "A0"]):
    v = cl.evaluate(net, r)
    assert [v[f"Lo.{i}"] for i in range(8)] + [v[f"U.{i}"] for i in range(8)] == cl.decoder([r[x] for x in ["A3", "A2", "A1", "A0"]])
# Address 1001 in the 4:16 tree: leaf 2, output 1 = big output 9.
assert (0b1001 >> 2, 0b1001 & 3, 2 * 4 + 1) == (2, 1, 9)
# Extra variable on the enable: 2:4 on A, B with E = C, OR(D0, D3) = (A ⊙ B) C.
net = [("Q", "DEC", {"a": ["A", "B"], "en": "C"}), ("f", "OR", ["Q.0", "Q.3"])]
assert cl.truth(net, V3, "f") == bl.tt("(A \\odot B) C", V3)
has("$64 + 16 + 4 + 1 = 85$", "$16 + 4 + 1 = 21$", "$(64 - 1)/(8 - 1) = 9$", "$4 + 2 + 1 = 7 = 7/1$",
    "$(2^6 - 1)/(2^3 - 1) = 63/7 = 9$", "$4 + 1 = 5$ decoders $= (16 - 1)/(4 - 1)$", "Total $4 + 1 = 5$", "$4 + 0.5$")

# ── DEMUX = decoder with data on the enable ─────────────────────────────────
for nsel in (1, 2, 3):
    for d in (0, 1):
        for s in product((0, 1), repeat=nsel):
            y = cl.demux(d, list(s))
            assert y == cl.decoder(list(s), en=d)
            assert all(y[i] == 0 for i in range(2 ** nsel) if i != cl.num(s))
    for s in product((0, 1), repeat=nsel):
        assert cl.demux(1, list(s)) == cl.decoder(list(s))
        assert cl.demux(0, list(s)) == [0] * 2 ** nsel
for i, eq in enumerate(["I S1' S0'", "I S1' S0", "I S1 S0'", "I S1 S0"]):
    vs = ["I", "S1", "S0"]
    assert tuple(cl.demux(r["I"], [r["S1"], r["S0"]])[i] for r in cl.rows(vs)) == bl.tt(eq, vs)
# MUX + DEMUX link with the same select: input i arrives at output i.
for s in range(4):
    for data in product((0, 1), repeat=4):
        y = cl.demux(cl.mux(list(data), cl.bits_of(s, 2)), cl.bits_of(s, 2))
        assert y[s] == data[s] and all(y[j] == 0 for j in range(4) if j != s)

# ── Encoders ────────────────────────────────────────────────────────────────
D4 = ["D3", "D2", "D1", "D0"]


def env4(bits):  # bits D3 D2 D1 D0
    return dict(zip(D4, bits))


for i in range(4):
    d = [int(j == i) for j in range(4)]
    assert cl.encoder(d) == cl.bits_of(i, 2)
    assert cl.encoder(d) == [d[2] | d[3], d[1] | d[3]]
assert cl.encoder([0, 0, 1, 0]) == [1, 0] and cl.encoder([0, 1, 1, 0]) == [1, 1] and cl.encoder([0, 0, 0, 0]) == [0, 0]
# 8:3 encoder Y2 = D4 + D5 + D6 + D7.
for i in range(8):
    assert cl.encoder([int(j == i) for j in range(8)])[0] == int(i >= 4)
# Lift: floors 1 and 2 together give 11.
assert cl.encoder([0, 1, 1, 0]) == [1, 1]
# Decimal → BCD encoder (input 0 unconnected): D = 8 + 9, C = 4..7, B = 2, 3, 6, 7, A = odd.
for i in range(10):
    code = [int(i in (8, 9)), int(i in (4, 5, 6, 7)), int(i in (2, 3, 6, 7)), int(i in (1, 3, 5, 7, 9))]
    assert code == cl.bits_of(i, 4)
# Decoder + rewired encoder = binary → Gray converter.
for i in range(8):
    g = i ^ (i >> 1)
    d = cl.decoder(cl.bits_of(i, 3))
    wired = [0] * 8
    for j in range(8):
        wired[j ^ (j >> 1)] |= d[j]
    assert cl.encoder(wired) == cl.bits_of(g, 3)

# ── Priority encoders ───────────────────────────────────────────────────────
X1, X0, VV = "D2 + D3", "D3 + D1 \\overline{D2}", "D0 + D1 + D2 + D3"
for m in range(16):
    e = env4(cl.bits_of(m, 4))
    d = [e["D0"], e["D1"], e["D2"], e["D3"]]
    code, v = cl.priority_encoder(d)
    assert bl.ev(bl.parse(VV), e) == v
    if v:
        assert [bl.ev(bl.parse(X1), e), bl.ev(bl.parse(X0), e)] == code
    else:
        assert [bl.ev(bl.parse(X1), e), bl.ev(bl.parse(X0), e)] == [0, 0]
# The table: 5 rows cover 1 + 1 + 2 + 4 + 8 = 16 patterns.
assert 1 + 1 + 2 + 4 + 8 == 16
# Sanity checks: 0110 → 10, 1111 → 11, 0011 → 01.
for pat, want in (("0110", [1, 0]), ("1111", [1, 1]), ("0011", [0, 1])):
    b = [int(c) for c in pat]  # D3 D2 D1 D0
    assert cl.priority_encoder(b[::-1]) == (want, 1)
# Medium example: 0011, 0110, 1010, 0000 → 01, 10, 11, 00 (V = 0); plain encoder 01, 11, 11, 00.
want_p = {"0011": ([0, 1], 1), "0110": ([1, 0], 1), "1010": ([1, 1], 1), "0000": ([0, 0], 0)}
want_e = {"0011": [0, 1], "0110": [1, 1], "1010": [1, 1], "0000": [0, 0]}
for pat in want_p:
    d = [int(c) for c in pat][::-1]
    assert cl.priority_encoder(d) == want_p[pat] and cl.encoder(d) == want_e[pat]
has("$D_3D_2D_1D_0 = 0011$, $0110$, $1010$ and $0000$", "A plain encoder would give 01, 11, 11, 00")
# 8:3 equations against the enumeration (all 256 patterns).
D8 = [f"D{i}" for i in range(7, -1, -1)]
Y8 = ["D4 + D5 + D6 + D7",
      "D7 + D6 + \\overline{D5}\\,\\overline{D4}(D3 + D2)",
      "D7 + \\overline{D6} D5 + \\overline{D6}\\,\\overline{D4} D3 + \\overline{D6}\\,\\overline{D4}\\,\\overline{D2} D1"]
for m in range(256):
    e = dict(zip(D8, cl.bits_of(m, 8)))
    d = [e[f"D{i}"] for i in range(8)]
    code, v = cl.priority_encoder(d)
    if v:
        assert [bl.ev(bl.parse(y), e) for y in Y8] == code
# GATE example (ii): I5 = 1, I6 = I7 = 0, anything below → 101, V = 1.
for low in product((0, 1), repeat=5):
    assert cl.priority_encoder(list(low) + [1, 0, 0]) == ([1, 0, 1], 1)
# Edge: lowest index wins.
EX1 = "\\overline{D0}\\,\\overline{D1}(D2 + D3)"
EX0 = "\\overline{D0} D1 + \\overline{D0}\\,\\overline{D1}\\,\\overline{D2} D3"
for m in range(16):
    e = env4(cl.bits_of(m, 4))
    d = [e["D0"], e["D1"], e["D2"], e["D3"]]
    code, v = cl.priority_encoder(d, order=[0, 1, 2, 3])
    assert bl.ev(bl.parse(VV), e) == v
    if v:
        assert [bl.ev(bl.parse(EX1), e), bl.ev(bl.parse(EX0), e)] == code
assert cl.priority_encoder([0, 1, 1, 0], order=[0, 1, 2, 3]) == ([0, 1], 1) and cl.priority_encoder([0, 1, 1, 0]) == ([1, 0], 1)

# Priority encoder from MUXes: selects D3, D2; X1 data 0 1 1 1, X0 data D1 0 1 1, V data (D1 + D0) 1 1 1.
net = [("x1", "MUX", {"d": ["0", "1", "1", "1"], "s": ["D3", "D2"]}),
       ("x0", "MUX", {"d": ["D1", "0", "1", "1"], "s": ["D3", "D2"]}),
       ("o", "OR", ["D1", "D0"]),
       ("v", "MUX", {"d": ["o", "1", "1", "1"], "s": ["D3", "D2"]})]
for r in cl.rows(D4):
    val = cl.evaluate(net, r)
    code, v = cl.priority_encoder([r["D0"], r["D1"], r["D2"], r["D3"]])
    assert val["v"] == v
    if v:
        assert [val["x1"], val["x0"]] == code
has("the $X_1$ MUX has data $0, 1, 1, 1$ and the $X_0$ MUX has data $D_1, 0, 1, 1$")

# Encoder vs decoder table signatures used in the GATE example: (i) decoder, (iii) MUX.
for pq in range(4):
    assert cl.decoder(cl.bits_of(pq, 2)) == [int(i == pq) for i in range(4)]

# ── 1992: priority encoder from 4:1 MUXes (A > B > C) ───────────────────────
def pe3(codes):
    """Outputs (X1, X0) of the 3-input priority encoder for every row of (A, B, C); none → 00."""
    out = {}
    for r in cl.rows(V3):
        w = next((x for x in "ABC" if r[x]), None)
        out[(r["A"], r["B"], r["C"])] = codes[w] if w else (0, 0)
    return out


def mux_data_for(codes):
    """Data inputs (AB = 00, 01, 10, 11) of the X1 and X0 MUXes with A on S1 and B on S0."""
    t = pe3(codes)
    res = []
    for bit in (0, 1):
        col = []
        for a, b in product((0, 1), repeat=2):
            v0, v1 = t[(a, b, 0)][bit], t[(a, b, 1)][bit]
            col.append(str(v0) if v0 == v1 else ("C" if (v0, v1) == (0, 1) else "C'"))
        res.append(col)
    return res


NAT92 = {"A": (1, 1), "B": (1, 0), "C": (0, 1)}
t92 = pe3(NAT92)
assert tuple(t92[k][0] for k in sorted(t92)) == bl.tt("A + B", V3)
assert tuple(t92[k][1] for k in sorted(t92)) == bl.tt("A + B'C", V3)
assert mux_data_for(NAT92) == [["0", "1", "1", "1"], ["C", "0", "1", "1"]]
ALT92 = {"A": (0, 1), "B": (1, 0), "C": (1, 1)}
t = pe3(ALT92)
assert tuple(t[k][0] for k in sorted(t)) == bl.tt("A'(B + C)", V3)
assert tuple(t[k][1] for k in sorted(t)) == bl.tt("A + B'C", V3)
assert mux_data_for(ALT92) == [["C", "1", "0", "0"], ["C", "0", "1", "1"]]
for codes, (d1, d0) in ((NAT92, mux_data_for(NAT92)), (ALT92, mux_data_for(ALT92))):
    net = [("x1", "MUX", {"d": [x.replace("C'", "~C") for x in d1], "s": ["A", "B"]}),
           ("x0", "MUX", {"d": [x.replace("C'", "~C") for x in d0], "s": ["A", "B"]})]
    tt = pe3(codes)
    for r in cl.rows(V3):
        v = cl.evaluate(net, r)
        assert (v["x1"], v["x0"]) == tt[(r["A"], r["B"], r["C"])]
q = BANK["cse-1992-b-4-b"]
for s in ("A→11, B→10, C→01", "$X_1 = A + B$", "$X_0 = A + \\overline{B}C$", "0,1,1,1", "C,0,1,1"):
    assert s in q["answer"], s

# ── Address decoding ────────────────────────────────────────────────────────
def mem_decoder(n_bytes, word_bytes=1):
    loc = n_bytes // word_bytes
    m = int(math.log2(loc))
    assert 2 ** m == loc
    return m, loc


K = 1024
assert mem_decoder(2 * K) == (11, 2048) and sum(mem_decoder(2 * K)) == 2059
assert mem_decoder(1 * K) == (10, 1024) and sum(mem_decoder(K)) == 1034
assert mem_decoder(4 * K, 4) == (10, 1024)
assert mem_decoder(4 * K) == (12, 4096)
# 4 KB of 1 KB chips: 12 lines, 2:4 chip select on A11 A10, address 0x9A3 → chip 2, byte 0x1A3.
assert mem_decoder(4 * K)[0] == 12 and (4 * K) // K == 4 and cl.select_lines(4) == 2
assert (0x9A3 >> 10, 0x9A3 & 0x3FF) == (2, 0x1A3)
# Trap wrong answers differ from 1034.
assert {20, 1024, 2048}.isdisjoint({1034})
# Coincident decoding: two 5:32 decoders = 64 lines; 2^a + 2^b with a + b = 10 is smallest at a = b.
assert 32 + 32 == 64 and min(range(11), key=lambda a: 2 ** a + 2 ** (10 - a)) == 5
has("$m + n = 11 + 2048 = 2059$","$32 + 32 = 64$", "($10 + 1024 = 1034$ for 1 KB, byte-addressable)")

# ── Decoder feeding a MUX ───────────────────────────────────────────────────
IN4 = ["A", "B", "S1", "S0"]
# The shared-variable example's data with separate selects S1, S0: the per-line count 7 (its wrong answer).
net = [("Q", "DEC", {"a": ["A", "B"]}), ("Y", "MUX", {"d": ["Q.1", "Q.2", "Q.3", "1"], "s": ["S1", "S0"]})]
assert len(ones(net, IN4, "Y")) == 7 == 1 + 1 + 1 + 4
assert cl.truth(net, IN4, "Y") == bl.tt("S1' S0' A' B + S1' S0 A B' + S1 S0' A B + S1 S0", IN4)
# Edge: D3 → S1, D0 → S0, data C, C', 1, 1: 5 rows; I3 never selected.
def edge_net(i3):
    return [("Q", "DEC", {"a": ["A", "B"]}), ("Y", "MUX", {"d": ["C", "~C", "1", i3], "s": ["Q.3", "Q.0"]})]


assert len(ones(edge_net("1"), V3, "Y")) == 5 and cl.truth(edge_net("1"), V3, "Y") == cl.truth(edge_net("0"), V3, "Y")
assert all(not (cl.evaluate(edge_net("1"), r)["Q.3"] and cl.evaluate(edge_net("1"), r)["Q.0"]) for r in cl.rows(V3))
has("$1 + 1 + 1 + 2^2 = 7$", "$1 + 2 + 2 = 5$ rows, and $I_3$ is never used")

# ── PYQ keys ────────────────────────────────────────────────────────────────
# 2007: 6:64 from 3:8 with enables, no gates.
q = BANK["cse-2007-cs-8"]
assert bl.which(bl.option_values(q), lambda t: int(t) == cl.decoder_tree(6, 3)[1]) == ["C"] == bl.key_letters(q["answer"])

# IT 2008: decoder inputs z (MSB), y, x; NOR of O7, O5, O2, O0.
q = BANK["it-2008-it-9"]
ZYX = ["z", "y", "x"]
net = [("Q", "DEC", {"a": ZYX}), ("f", "NOR", ["Q.7", "Q.5", "Q.2", "Q.0"])]
f08 = cl.truth(net, ZYX, "f")
assert cl.ones_of(f08) == [1, 3, 4, 6] and f08 == bl.tt("x \\oplus z", ZYX)
opts = {k: bl.tt(t.strip("$").replace("xz", "x z").replace("xy", "x y").replace("yz", "y z"), ZYX) for k, t in bl.option_values(q).items()}
assert [k for k, t in opts.items() if t == f08] == ["B"] == bl.key_letters(q["answer"])
assert opts["A"] == (1,) * 8  # as typeset, xz + (xz)' is a tautology
assert cl.truth([("Q", "DEC", {"a": ZYX}), ("f", "OR", ["Q.7", "Q.5", "Q.2", "Q.0"])], ZYX, "f") == bl.tt("x z + x' z'", ZYX)
# The same circuit with x read as the MSB gives the same function (the index set is closed under reversal).
net_r = [("Q", "DEC", {"a": ["x", "y", "z"]}), ("f", "NOR", ["Q.7", "Q.5", "Q.2", "Q.0"])]
assert cl.truth(net_r, ZYX, "f") == f08

# 2013: the table is a priority encoder with D3 highest; X0 is the high bit of the code.
q = BANK["cse-2013-cs-5"]
rows13 = [("0000", None, 0), ("1000", (0, 0), 1), ("x100", (0, 1), 1), ("xx10", (1, 0), 1), ("xxx1", (1, 1), 1)]
covered = 0
for pat, x0x1, v in rows13:
    free = [i for i, c in enumerate(pat) if c == "x"]
    for fill in product((0, 1), repeat=len(free)):
        bits = [int(c) if c != "x" else 0 for c in pat]
        for i, b in zip(free, fill):
            bits[i] = b
        code, valid = cl.priority_encoder(bits)  # bits = D0 D1 D2 D3
        assert valid == v
        if v:
            assert tuple(code) == x0x1  # (X0, X1) = (MSB, LSB)
        covered += 1
assert covered == 16
assert bl.option_values(q)["A"] == "Priority encoder" and bl.key_letters(q["answer"]) == ["A"]

# 2020: 1 KB byte-addressable → m + n = 1034.
q = BANK["cse-2020-cs-20"]
assert float(q["answer"]) == sum(mem_decoder(K)) == 1034

# 2022: S has 1024 words (10-bit field), R has 32 (5-bit field), M is 1 bit: 16 bits.
q = BANK["cse-2022-cs-30"]
assert mem_decoder(1024)[0] + mem_decoder(32)[0] + 1 == 16
assert "10:2^{10}" in q["options"][2]["t"] and "5:2^{5}" in q["options"][2]["t"] and "2:1 multiplexer" in q["options"][2]["t"]
assert "encoder" in q["options"][1]["t"] and "de-multiplexer" in q["options"][3]["t"]
assert bl.key_letters(q["answer"]) == ["C"]

# 2026 set 2: D0 → I0, 0 → I1, 1 → I2, D3 → I3.
q = BANK["cse-2026-2-cs-49"]
net = [("Q", "DEC", {"a": ["A", "B"]}), ("Y", "MUX", {"d": ["Q.0", "0", "1", "Q.3"], "s": ["S1", "S0"]})]
IN26 = ["A", "B", "S1", "S0"]
n26 = len(ones(net, IN26, "Y"))
assert n26 == 1 + 0 + 4 + 1 == 6 and q["answer"] == "6 to 6"

# ── Practice ────────────────────────────────────────────────────────────────
q = P["nx-dl-04-03-q01"]
bl.assert_nat(q, cl.decoder_tree(6, 2)[1])
assert cl.decoder_tree(6, 2)[0] == [16, 4, 1]

q = P["nx-dl-04-03-q02"]
f = cl.truth(gate_on_decoder("OR", [0, 2, 4, 6]), V3, "f")
vals = {k: bl.tt(t.strip("$"), V3) for k, t in bl.option_values(q).items()}
bl.assert_mcq(q, [k for k, t in vals.items() if t == f][0])
assert [k for k, t in vals.items() if t == f] == ["B"]
assert vals["A"] == cl.truth(gate_on_decoder("NOR", [0, 2, 4, 6]), V3, "f")
assert vals["C"] == cl.truth(gate_on_decoder("OR", [0, 2, 4, 6], a=["C", "B", "A"]), V3, "f")

q = P["nx-dl-04-03-q03"]
f = cl.truth(gate_on_decoder("NOR", [0, 1, 2, 3, 4]), V3, "f")
assert cl.ones_of(f) == [5, 6, 7]
vals = {k: bl.tt(t.strip("$"), V3) for k, t in bl.option_values(q).items()}
assert [k for k, t in vals.items() if t == f] == ["D"]
bl.assert_mcq(q, "D")
assert vals["A"] == cl.truth(gate_on_decoder("OR", [0, 1, 2, 3, 4]), V3, "f")
assert cl.ones_of(vals["C"]) == [3, 4, 5, 6, 7]

q = P["nx-dl-04-03-q04"]
f = cl.truth(gate_on_decoder("AND", [1, 2], n=2, low=True), V2, "f")
vals = {"A": bl.tt("A \\odot B", V2), "B": bl.tt("A \\oplus B", V2), "C": (0, 0, 0, 0), "D": (1, 1, 1, 1)}
assert [k for k, t in vals.items() if t == f] == ["A"]
bl.assert_mcq(q, "A")
assert cl.truth(gate_on_decoder("AND", [1, 2], n=2), V2, "f") == vals["C"]
assert cl.truth(gate_on_decoder("NAND", [1, 2], n=2, low=True), V2, "f") == vals["B"]

q = P["nx-dl-04-03-q05"]
d = [int(i in (2, 3, 5)) for i in range(8)]
code, v = cl.priority_encoder(d)
vals = bl.option_values(q)
assert [k for k, t in vals.items() if t == "".join(map(str, code))] == ["C"] and v == 1
bl.assert_mcq(q, "C")
assert vals["B"] == "".join(map(str, cl.encoder(d))) and vals["A"] == "".join(map(str, cl.priority_encoder(d, order=list(range(8)))[0]))

q = P["nx-dl-04-03-q06"]
EQ = {"A": ("X1", "D2 + D3"), "B": ("X0", "D1 + D3"), "C": ("X0", "D3 + D1\\overline{D2}"), "D": ("V", "D0 + D1 + D2 + D3")}
good = []
for k, (o, e) in EQ.items():
    ok = True
    for m in range(16):
        en = env4(cl.bits_of(m, 4))
        code, v = cl.priority_encoder([en["D0"], en["D1"], en["D2"], en["D3"]])
        want = {"X1": code[0], "X0": code[1], "V": v}[o]
        if (o != "V" and not v):
            continue
        ok &= bl.ev(bl.parse(e), en) == want
    if ok:
        good.append(k)
bl.assert_msq(q, good)
assert good == ["A", "C", "D"]

q = P["nx-dl-04-03-q07"]
bl.assert_nat(q, mem_decoder(4 * K, 4)[1])

q = P["nx-dl-04-03-q08"]
truths = {
    "A": all(cl.demux(dd, list(s)) == cl.decoder(list(s), en=dd) for dd in (0, 1) for s in product((0, 1), repeat=3)),
    # B: a decoder without enable ignores the data, so it cannot equal the DEMUX for both data values.
    "B": all(cl.decoder(list(s)) == cl.demux(dd, list(s)) for dd in (0, 1) for s in product((0, 1), repeat=2)),
    "C": all(all(cl.demux(dd, list(s))[i] == 0 for i in range(4) if i != cl.num(s)) for dd in (0, 1) for s in product((0, 1), repeat=2)),
    "D": all(cl.demux(0, list(s)) == cl.decoder(list(s)) for s in product((0, 1), repeat=2)),
}
bl.assert_msq(q, sorted(k for k, t in truths.items() if t))

q = P["nx-dl-04-03-q09"]
chips = (16 * K) // (4 * K)
m9 = cl.select_lines(chips)
assert mem_decoder(16 * K)[0] - mem_decoder(4 * K)[0] == m9 == 2
bl.assert_nat(q, m9 + chips)
assert {w["answer"] for w in q["common_wrong"]} == {14 + 16384, 12 + 4096, 4}

q = P["nx-dl-04-03-q10"]
net = [("Q", "DEC", {"a": ["A", "B"]}), ("Y", "MUX", {"d": ["Q.0", "Q.1", "Q.3", "0"], "s": ["S", "B"]})]
IN10 = ["A", "B", "S"]
y10 = cl.truth(net, IN10, "Y")
assert y10 == bl.tt("S' A'", IN10)
bl.assert_nat(q, len(cl.ones_of(y10)))

# Every practice question carries this lesson's block ids.
ids = set(__import__("re").findall(r"\{#([a-z0-9-]+)", L))
for qid, qq in P.items():
    if qid.startswith("nx-dl-04-03-"):
        assert set(qq["blocks"]) <= ids, (qid, set(qq["blocks"]) - ids)
        assert f':::practice{{id="{qid}"' in L
# MCQ keys spread: no letter more than twice.
from collections import Counter  # noqa: E402
keys = Counter(qq["answer"] for qid, qq in P.items() if qid.startswith("nx-dl-04-03-") and qq["type"] == "MCQ")
assert max(keys.values()) <= 2, keys


# Option analyses in _sol_ch4_l03.py: IT 2008 options C and D, as printed.
assert cl.ones_of(bl.tt("\\overline{x y} + y z", ZYX)) == [0, 1, 2, 4, 5, 6, 7]
assert cl.ones_of(bl.tt("x y + \\overline{y z}", ZYX)) == [0, 1, 2, 3, 4, 5, 7]
# 1992 pitfall: B on S1, A on S0 permutes the data: X1 (0, 1, 1, 1), X0 (C, 1, 0, 1).
net = [("x1", "MUX", {"d": ["0", "1", "1", "1"], "s": ["B", "A"]}), ("x0", "MUX", {"d": ["C", "1", "0", "1"], "s": ["B", "A"]})]
for r in cl.rows(V3):
    v = cl.evaluate(net, r)
    assert (v["x1"], v["x0"]) == t92[(r["A"], r["B"], r["C"])]
assert [t92[k] for k in sorted(t92)] == [(0, 0), (0, 1), (1, 0), (1, 0), (1, 1), (1, 1), (1, 1), (1, 1)]
# ── Review fixes: new worked examples and claims ───────────────────────────
# Trap (active-low): an OR of ≥ 2 different active-low outputs is 1 with the enable off too.
for idx in combinations(range(8), 2):
    net = gate_on_decoder("OR", idx, low=True, en="E")
    assert all(cl.evaluate(net, dict(zip(["E"] + V3, [e] + list(b))))["f"] == 1 for e in (0, 1) for b in product((0, 1), repeat=3))
has("is the constant 1, enabled or not")
# Trap (decoder count): seven 3:8 decoders give 56 < 64 outputs; 7 is the 3:8-from-1:2 count.
assert 7 * 8 == 56 < 64 and cl.decoder_tree(3, 1)[1] == 7 == 4 + 2 + 1 and cl.decoder_tree(6, 1)[1] == 63
has("seven 3:8 decoders have only $7 \\times 8 = 56$ outputs")
# Edge example answer: 010 is its own reversal; IT 2008's set is closed under reversal by swaps.
assert rev(2, 3) == 2 and {rev(i, 3) for i in (1, 3, 4, 6)} == {1, 3, 4, 6} and (rev(1, 3), rev(3, 3)) == (4, 6)
# Half adder (A held at 0) and half subtractor from a 2:4 decoder: D = D1 + D2, B_out = D1.
for a, b in product((0, 1), repeat=2):
    d2 = cl.decoder([a, b])
    assert d2[1] | d2[2] == a ^ b and d2[1] == int(a - b < 0)
has("With $A$ held at 0, the same decoder gives the half adder of $B$ and $C_{in}$", "$B_{out} = D_1$ alone")
# BCD → excess-3 from a 4:16 decoder and four ORs (D10–D15 unconnected).
XS3 = {3: [5, 6, 7, 8, 9], 2: [1, 2, 3, 4, 9], 1: [0, 3, 4, 7, 8], 0: [0, 2, 4, 6, 8]}
assert [format(d + 3, "04b") for d in range(10)] == ["0011", "0100", "0101", "0110", "0111", "1000", "1001", "1010", "1011", "1100"]
for d in range(10):
    dec = cl.decoder(cl.bits_of(d, 4))
    out = [int(any(dec[i] for i in XS3[bit])) for bit in (3, 2, 1, 0)]
    assert out == cl.bits_of(d + 3, 4)
assert [b for b in (3, 2, 1, 0) if 7 in XS3[b]] == [3, 1] and 0b1010 == 7 + 3
has("$E_3 = D_5 + D_6 + D_7 + D_8 + D_9$", "$E_0 = D_0 + D_2 + D_4 + D_6 + D_8$")
# DEMUX examples. Easy: S = 10, I = 1 → 0010; I = 0 → 0000.
assert cl.demux(1, [1, 0]) == [0, 0, 1, 0] and cl.demux(0, [1, 0]) == [0, 0, 0, 0]


# Medium: 1:8 from 1:2 DEMUXes (root on S2) = 7 blocks; from 1:4 DEMUXes = 3; S = 101 → Y5.
def demux_tree(i, sel, k):
    """Route data i through a tree of 1:2^k DEMUXes, root on the high select bits (a partly used
    root has its spare select pins tied to 0). Returns (outputs, blocks)."""
    n = len(sel)
    widths = [n % k or k] + [k] * ((n - (n % k or k)) // k)
    outs, blocks, pos = [i], 0, 0
    for w in widths:
        bits = sel[pos:pos + w]
        pos += w
        new = []
        for x in outs:
            y = cl.demux(x, [0] * (k - w) + bits)
            new += y[:2 ** w]
            blocks += 1
        outs = new
    return outs, blocks


for k, want_blocks in ((1, 7), (2, 3)):
    for s in range(8):
        for i in (0, 1):
            outs, blocks = demux_tree(i, cl.bits_of(s, 3), k)
            assert outs == cl.demux(i, cl.bits_of(s, 3))
    assert blocks == want_blocks == cl.decoder_tree(3, k)[1]
assert demux_tree(1, [1, 0, 1], 1)[0].index(1) == 5
has("(a) $1 + 2 + 4 = 7$ blocks", "(b) $2 + 1 = 3$ blocks")
# GATE: MUX (select A) → wire → DEMUX (select T = A ⊕ M): straight for M = 0, crossed for M = 1.
for A, M, Pv, Qv in product((0, 1), repeat=4):
    W = cl.mux([Pv, Qv], [A])
    y0, y1 = cl.demux(W, [A ^ M])
    if M == 0:
        assert (y0, y1) == ((1 - A) & Pv, A & Qv)
    else:
        assert (y0, y1) == (A & Qv, (1 - A) & Pv)
# Edge: a 3:8 decoder without enable, I on the MSB pin: D4..D7 = 1:4 DEMUX of I, D0..D3 = DEMUX of I'.
for i in (0, 1):
    for s in range(4):
        d = cl.decoder([i] + cl.bits_of(s, 2))
        assert d[4:] == cl.demux(i, cl.bits_of(s, 2)) and d[:4] == cl.demux(1 - i, cl.bits_of(s, 2))
assert all(sum(cl.decoder(cl.bits_of(s, 2))) == 1 for s in range(4))  # no enable: always one output lit
# Encoders: octal 8:3, hex 16:4 and decimal 10:4 OR lists.
for i in range(8):
    d = [int(j == i) for j in range(8)]
    assert [int(any(d[j] for j in lst)) for lst in ([4, 5, 6, 7], [2, 3, 6, 7], [1, 3, 5, 7])] == cl.bits_of(i, 3)
HEX = [list(range(8, 16)), [4, 5, 6, 7, 12, 13, 14, 15], [2, 3, 6, 7, 10, 11, 14, 15], list(range(1, 16, 2))]
for i in range(16):
    d = [int(j == i) for j in range(16)]
    assert [int(any(d[j] for j in lst)) for lst in HEX] == cl.bits_of(i, 4) == cl.encoder(d)
assert all(len(lst) == 8 for lst in HEX) and 0 not in sum(HEX, [])
DEC10 = [[8, 9], [4, 5, 6, 7], [2, 3, 6, 7], [1, 3, 5, 7, 9]]
for i in range(10):
    assert [int(i in lst) for lst in DEC10] == cl.bits_of(i, 4)
# Lift analogy: 001 OR 010 = 011.
assert cl.encoder([0, 1, 1, 0, 0, 0, 0, 0]) == [0, 1, 1]
has("$001 \\text{ OR } 010 = 011$")
# Gray converter: decoder output i → encoder input g(i); i = 5 → 111; the reversed wiring gives 6.
G = [i ^ (i >> 1) for i in range(8)]
assert G == [0, 1, 3, 2, 6, 7, 5, 4] and G[5] == 0b111
inv = {g: i for i, g in enumerate(G)}
assert inv[5] == 6 == 0b110
has("$g = 0, 1, 3, 2, 6, 7, 5, 4$")
# Priority encoder from MUXes, the 1992 form in the definition: X1 data 0,1,1,1; X0 data C,0,1,1.
assert mux_data_for(NAT92) == [["0", "1", "1", "1"], ["C", "0", "1", "1"]]
has("the $X_1$ MUX has data $0, 1, 1, 1$ and the $X_0$ MUX has data $C, 0, 1, 1$")
# Address decoding. Gate (word-addressable): 8 KB / 4 B = 2048 words → 11 bits; 64 registers → 6; 18 bits.
assert mem_decoder(8 * K, 4) == (11, 2048) and mem_decoder(64) == (6, 64) and 1 + 11 + 6 == 18
assert mem_decoder(8 * K) == (13, 8192)
has("$1 + 11 + 6 = 18$ bits")
# Edge: 6 KB from three 2 KB chips: 13 lines, A10..A0 shared, 2:4 select with output 3 unused; 0x1234 → chip 2, 0x234.
assert math.ceil(math.log2(6 * K)) == 13 and 2 ** 12 < 6 * K <= 2 ** 13 and cl.select_lines(3) == 2
assert int(math.log2(2 * K)) == 11 and (0x1800, 0x1FFF) == (3 * 2 * K, 4 * 2 * K - 1)
assert 0x1234 == 4660 == 2 * 2048 + 564 and (0x1234 >> 11, 0x1234 & 0x7FF) == (2, 0x234) and 564 == 0x234
has("$m = \\lceil \\log_2 6144 \\rceil = 13$", "$0x1234$ is byte $0x234$ of chip 2")
# Decoder → MUX. Easy: data 0, D0, 1, 0 → 5 rows.
net = [("Q", "DEC", {"a": ["A", "B"]}), ("Y", "MUX", {"d": ["0", "Q.0", "1", "0"], "s": ["S1", "S0"]})]
assert len(ones(net, IN4, "Y")) == 5 and cl.truth(net, IN4, "Y") == bl.tt("S1' S0 A' B' + S1 S0'", IN4)
# Medium (shared A): S1 = A, S0 = C, data D1, D2, D3, 1 → 4 rows, Y = BC' + AC; the per-line count gives 7.
net = [("Q", "DEC", {"a": ["A", "B"]}), ("Y", "MUX", {"d": ["Q.1", "Q.2", "Q.3", "1"], "s": ["A", "C"]})]
assert len(ones(net, V3, "Y")) == 4 and cl.truth(net, V3, "Y") == bl.tt("B C' + A C", V3)
assert ones(net, V3, "Y") == [0b010, 0b101, 0b110, 0b111] and 1 + 1 + 1 + 4 == 7
# Gate: data D2, 1, D2, 1 → 10 rows, Y = S0 + AB'; counting D2 once gives 9.
net = [("Q", "DEC", {"a": ["A", "B"]}), ("Y", "MUX", {"d": ["Q.2", "1", "Q.2", "1"], "s": ["S1", "S0"]})]
assert len(ones(net, IN4, "Y")) == 10 == 1 + 4 + 1 + 4 and cl.truth(net, IN4, "Y") == bl.tt("S0 + A B'", IN4)
has("$1 + 4 + 1 + 4 = 10$ rows", "$0 + 1 + 4 + 0 = 5$ rows", "4 rows. The per-line count")
print("l4_03_decoders: decoder minterms/maxterms, decoder + gate over all 3-variable functions, trees as netlists, DEMUX, encoders, priority encoders (4:2, 8:3, both orders, MUX form, 1992 codes), memory decoders, decoder-into-MUX counts, 7 PYQ keys and 10 practice answers (with solution option analyses) OK")
