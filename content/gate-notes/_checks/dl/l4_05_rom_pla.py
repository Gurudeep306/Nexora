"""Checks for dl/04-combinational-circuits/05-rom-pla-pal: the ROM realisation theorem (a decoder + OR
ROM equals every 3-input, 2-output function), ROM sizes, the product-width theorem (bit-length of every
product by enumeration and the two bounds), constant output columns of squarers and cubes, ROM
expansion counts, PLA term counts (comblib.pla_min_terms, exhaustive over shared implicants), PAL
counts, the complement trick, link counts, the PLA programming tables (read back into functions), the PAL
examples, the PYQ-solution scene indices, the four PYQ keys and the ten practice answers."""
import itertools
import pathlib
import sys
from math import ceil

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import comblib as cl  # noqa: E402
import minlib as ml  # noqa: E402

L = cl.lesson_text("05-rom-pla-pal.md")
has = lambda *s: bl.must_contain(L, *s)
V3 = list("ABC")
K = 1024


def rom_eval(program, addr):
    """A ROM as decoder + OR plane: program[j] = word lines connected to output j."""
    return [int(any(w and i in program[j] for i, w in enumerate(cl.decoder(cl.bits_of(addr, 3))))) for j in range(len(program))]


# ── ROM realisation theorem: every pair of 3-input functions ───────────────
for t1 in range(256):
    for t2 in (0, 0x96, 0xE8, 0xFF, t1 ^ 0x5A):
        f1 = [i for i in range(8) if t1 >> i & 1]
        f2 = [i for i in range(8) if t2 >> i & 1]
        for a in range(8):
            assert rom_eval([f1, f2], a) == [int(a in f1), int(a in f2)]
# The programming table: F1 = majority, F2 = odd parity.
F1, F2 = bl.minterms("AB + AC + BC", V3), bl.minterms("A \\oplus B \\oplus C", V3)
assert F1 == [3, 5, 6, 7] and F2 == [1, 2, 4, 7]
has("$F_1 = \\Sigma m(3, 5, 6, 7)$", "$F_2 = \\Sigma m(1, 2, 4, 7)$")
# The rom-grid scene is a 3-bit squarer (8 x 6); the prose between the viz and the table must say so.
import json  # noqa: E402
between = L.split('spec="rom-grid"')[1].split("#rom-program-table")[0]
assert "3-bit squarer" in between and "$8 \\times 6$ ROM, 48 stored bits" in between and "$7^2 = 49 = 110001_2$" in between
assert cl.rom_size(3, (7 * 7).bit_length()) == (8, 6, 48) and format(49, "b") == "110001"
assert "Sizing a ROM" in between and "## Sizing a ROM" in L  # the forward pointer names a real section
ROMGRID = pathlib.Path(__file__).resolve().parents[2] / "dl" / "viz" / "rom-grid.json"
if ROMGRID.exists():  # the scene the prose describes: x² for x = 0…7, 8 words × 6 bits
    intro = json.loads(ROMGRID.read_text())["intro"]
    assert "6 stored bits" in intro and "square" in intro, intro
assert "(or $n + 1$ bits doubled)" not in L
for a in range(8):
    assert rom_eval([F1, F2], a) == [int(a in F1), int(a in F2)]
# Two-dimensional decoding aside: 1024 bits, split costs.
assert {r: 2 ** r + 2 ** (10 - r) for r in (5, 4, 3)} == {5: 64, 4: 80, 3: 136}
assert min(2 ** r + 2 ** (10 - r) for r in range(11)) == 64
has("$32 + 32 = 64$", "$16 + 64 = 80$", "$8 + 128 = 136$")

# ── Sizing ─────────────────────────────────────────────────────────────────
assert cl.rom_size(1, 1) == (2, 1, 2) and cl.rom_size(3, 2) == (8, 2, 16)
assert cl.rom_size(4, 3) == (16, 3, 48)
has("$16 \\times 3 = 48$ bits")
assert cl.multiplier_rom(4) == (256, 8, 2048) and 2048 == 2 * K
assert cl.multiplier_rom(8) == (64 * K, 16, 2 ** 20)
assert 15 * 15 == 225 and format(225, "b") == "11100001" and 255 * 255 == 65025
has("$15^2 = 225 = 11100001_2$", "$255^2 = 65025$", "$256 \\times 8 = 2048$")
# Product width by enumeration (n x m bits) against the theorem.
for n in range(1, 9):
    for m in range(1, 9):
        width = max(a * b for a in range(2 ** n) for b in range(2 ** m)).bit_length()
        assert width == cl.multiplier_rom(n, m)[1]
        if n >= 2 and m >= 2:
            assert width == n + m
        if min(n, m) == 1:
            assert width == max(n, m)
for n in range(2, 20):
    top = (2 ** n - 1) ** 2
    assert top < 2 ** (2 * n) and top >= 2 ** (2 * n - 1) and top.bit_length() == 2 * n
assert cl.multiplier_rom(1)[1] == 1
assert cl.multiplier_rom(6, 4) == (K, 10, 10 * K) and 63 * 15 == 945
# Adder with carry-in: 4-bit (edge example), 8-bit (practice).
adder = lambda n: cl.rom_size(2 * n + 1, (2 * (2 ** n - 1) + 1).bit_length())
assert adder(4) == (512, 5, 2560) and adder(8) == (128 * K, 9, 128 * K * 9)
assert all(2 * (2 ** n - 1) + 1 == 2 ** (n + 1) - 1 for n in range(1, 12))
has("$512 \\times 5$ (2560 bits)")
# Distractors of the GATE example: 16 x 16 = 256 lost by an 8-bit word.
assert (16 * 16) % 256 == 0 and 2 ** 15 == 32 * K


# ── Constant output bits ───────────────────────────────────────────────────
def wired_columns(f, n):
    """Output columns of x -> f(x) that are constant or equal to an input bit."""
    w = max(f(x) for x in range(2 ** n)).bit_length()
    out = []
    for b in range(w):
        col = [(f(x) >> b) & 1 for x in range(2 ** n)]
        if len(set(col)) == 1 or any(col == [(x >> i) & 1 for x in range(2 ** n)] for i in range(n)):
            out.append(b)
    return w, out


for n in range(2, 9):
    assert wired_columns(lambda x: x * x, n) == (2 * n, [0, 1])
    assert all((x * x) % 4 in (0, 1) for x in range(2 ** n))
sq3 = [format(x * x, "06b") for x in range(8)]
assert sq3 == ["000000", "000001", "000100", "001001", "010000", "011001", "100100", "110001"]
assert [x for x in range(8) if (x * x) >> 2 & 1] == [2, 6]  # bit 2 is 1 for 4 and 36
has("$000000$, $000001$, $000100$, $001001$", "$010000$, $011001$, $100100$, $110001$")
# Binary-to-Gray: the MSB is a copy of the input MSB, nothing else is wired.
for n in range(2, 7):
    assert wired_columns(lambda x: x ^ (x >> 1), n)[1] == [n - 1] or n == 1
# 8 x 8 multiplier: no product column is constant or a copy of an input (16 address bits).
cols = {}
for a in range(256):
    for b in range(256):
        p = a * b
        for bit in range(16):
            cols.setdefault(bit, set()).add((p >> bit) & 1)
assert all(v == {0, 1} for v in cols.values()) and (1 * 2) >> 1 & 1
for bit in range(16):
    copies = [src for src in range(16) if all(((a * b) >> bit & 1) == ((a << 8 | b) >> src & 1) for a in range(0, 256, 7) for b in range(0, 256, 5))]
    assert copies == [], (bit, copies)

# ── Expansion ──────────────────────────────────────────────────────────────
chips = lambda W, B, w, b: (W // w) * ceil(B / b)
assert chips(K, 8, K, 4) == 2 and chips(4 * K, 8, K, 8) == 4 and chips(4 * K, 16, K, 4) == 16
assert 4 * K * 16 // (K * 4) == 16
w5, wired5 = wired_columns(lambda x: x * x, 5)
assert (w5, wired5) == (10, [0, 1]) and 31 * 31 == 961
assert chips(32, w5 - len(wired5), 32, 4) == 2 and chips(32, w5, 32, 4) == 3

# ── PLA and PAL ────────────────────────────────────────────────────────────
def pla(fs):
    return cl.pla_min_terms([(list(f), []) for f in fs], 3)[0]


def pal(fs):
    return cl.pal_terms([(list(f), []) for f in fs], 3)


def msops(f):
    return {frozenset(ml.term(c, V3) for c in cov) for cov in ml.min_covers(list(f), [], 3)}


def comp(f):
    return [i for i in range(8) if i not in f]


# Easy: f1 = AB + BC', f2 = AB + A'C.
e1, e2 = bl.minterms("AB + BC'", V3), bl.minterms("AB + A'C", V3)
assert e1 == [2, 6, 7] and e2 == [1, 3, 6, 7]
assert msops(e1) == {frozenset(["AB", "BC'"])} and msops(e2) == {frozenset(["AB", "A'C"])}
assert pla([e1, e2]) == 3 and pal([e1, e2]) == 4
# Medium: three outputs, 4 terms (7 separately).
m1, m2, m3 = [0, 1, 3, 5], [1, 3, 6, 7], [1, 5, 6, 7]
assert msops(m1) == {frozenset(["A'B'", "A'C", "B'C"])} and msops(m2) == {frozenset(["A'C", "AB"])} and msops(m3) == {frozenset(["B'C", "AB"])}
assert pla([m1, m2, m3]) == 4 and pal([m1, m2, m3]) == 7
# GATE: PLA 5, PAL 7 used, 9 uniform.
g1, g2, g3 = [1, 3, 5, 6], [2, 3, 6, 7], [0, 1, 5, 6]
assert msops(g1) == {frozenset(["A'C", "B'C", "ABC'"])} and msops(g2) == {frozenset(["B"])} and msops(g3) == {frozenset(["A'B'", "B'C", "ABC'"])}
assert pla([g1, g2, g3]) == 5 and pal([g1, g2, g3]) == 7
assert 3 * max(len(next(iter(msops(g)))) for g in (g1, g2, g3)) == 9
# Edge: complement trick, 5 -> 3.
c1, c2 = [0, 2, 4], [3, 5, 6, 7]
assert msops(c1) == {frozenset(["A'C'", "B'C'"])} and msops(c2) == {frozenset(["AB", "AC", "BC"])}
assert msops(comp(c1)) == {frozenset(["C", "AB"])} and msops(comp(c2)) == {frozenset(["A'B'", "A'C'", "B'C'"])}
pol = {(p, q): pla([c1 if p else comp(c1), c2 if q else comp(c2)]) for p in (1, 0) for q in (1, 0)}
assert pol == {(1, 1): 5, (1, 0): 3, (0, 1): 4, (0, 0): 5}
# Trap: f1 = B, f2 = A'C + AB' needs 3 lines.
assert pla([bl.minterms("B", V3), bl.minterms("A'C + AB'", V3)]) == 3
# Link counts.
links = lambda n, p, m, pol=False: 2 * n * p + p * m + (m if pol else 0)
assert links(3, 4, 2) == 32 and links(3, 4, 2, True) == 34 and cl.rom_size(3, 2)[2] == 16
assert links(16, 3, 2) == 102 and cl.rom_size(16, 2)[2] == 131072
has("24 + 8 = 32$", "96 + 6 = 102$", "$2^{16} \\cdot 2 = 131\\,072$")


# PLA programming tables (1 / 0 / – inputs, 1 / – outputs, optional T/C row): read every table in the
# lesson back into functions and compare with the example it belongs to.
def pla_tables(text):
    out = []
    for block in text.split("| Product term | $A$ | $B$ | $C$ |")[1:]:
        lines = [x for x in block.split("\n")[2:]]
        rows_ = []
        for x in lines:
            if not x.startswith("|"):
                break
            rows_.append([c.strip() for c in x.strip().strip("|").split("|")])
        out.append(rows_)
    return out


def read_pla(rows_):
    terms = [r for r in rows_ if r[0] != "polarity"]
    pol = next((r[4:] for r in rows_ if r[0] == "polarity"), ["T"] * (len(rows_[0]) - 4))
    m_out = len(rows_[0]) - 4
    funcs = []
    for j in range(m_out):
        cells = set()
        for r in terms:
            lit = "".join(v if v in "01" else "-" for v in r[1:4])
            cube_cells = {m for m in range(8) if all(c == "-" or int(c) == (m >> (2 - i)) & 1 for i, c in enumerate(lit))}
            assert ml.term(ml.parse_term(r[0].strip("$"), V3), V3) == r[0].strip("$")
            assert set(ml.cells(ml.parse_term(r[0].strip("$"), V3))) == cube_cells, r  # the 1/0/– row is the term
            if r[4 + j] == "1":
                cells |= cube_cells
            else:
                assert r[4 + j] == "–", r
        funcs.append(sorted(cells) if pol[j] == "T" else sorted(set(range(8)) - cells))
    return len(terms), pol, funcs


tabs = pla_tables(L)
assert len(tabs) == 3
assert read_pla(tabs[0]) == (3, ["T", "T"], [e1, e2])           # #pla-program-table (the easy example)
assert read_pla(tabs[1]) == (4, ["T"] * 3, [m1, m2, m3])        # #ex-pla-medium
assert read_pla(tabs[2]) == (3, ["T", "C"], [c1, c2])           # #ex-pla-edge, f2 complemented
assert sorted({0, 1} | {1, 3} | {1, 5}) == m1 and sorted({0, 2} | {0, 4}) == c1
has("cells $\\{0, 1\\} \\cup \\{1, 3\\}", "giving cells $\\{0, 1, 2, 4\\}$", "| polarity | | | | T | C |")

# PAL worked examples.
pe1, pe2 = [0, 1, 6, 7], [1, 3, 6, 7]
assert msops(pe1) == {frozenset(["A'B'", "AB"])} and msops(pe2) == {frozenset(["A'C", "AB"])}
assert pal([pe1, pe2]) == 4 and pla([pe1, pe2]) == 3
pm = [0, 1, 3, 5]
assert pm == m1 and len(ml.min_covers(pm, [], 3)[0]) == 3
assert {frozenset(ml.term(c, V3) for c in cv) for cv in ml.min_covers(pm, [7], 3)} == {frozenset(["C", "A'B'"])}
assert bl.minterms("C + A'B'", V3) == [0, 1, 3, 5, 7]
par, ab = bl.minterms("A \\oplus B \\oplus C", V3), bl.minterms("AB", V3)
assert par == [1, 2, 4, 7] and ab == [6, 7]
assert msops(par) == {frozenset(["A'B'C", "A'BC'", "AB'C'", "ABC"])} and msops(comp(par)) == {frozenset(["A'B'C'", "A'BC", "AB'C", "ABC'"])}
assert pal([par, ab]) == 5 <= 6 and len(next(iter(msops(par)))) == 4 > 3
assert pla([par, ab]) == 5 and not set(ab) <= set(par)
pi1, pi2 = list(range(7)), [7]
assert msops(comp(pi1)) == {frozenset(["ABC"])} and msops(comp(pi2)) == {frozenset(["A'", "B'", "C'"])}
assert msops(pi1) == {frozenset(["A'", "B'", "C'"])} and msops(pi2) == {frozenset(["ABC"])}
fits_inv = {name: len(next(iter(msops(comp(f))))) <= 2 for name, f in (("f1", pi1), ("f2", pi2))}
fits_hi = {name: len(next(iter(msops(f)))) <= 2 for name, f in (("f1", pi1), ("f2", pi2))}
assert fits_inv == {"f1": True, "f2": False} and fits_hi == {"f1": False, "f2": True}
has("(for an output with a fixed inverter, it is $f'$ whose SOP must fit", "$4 + 1 = 5 \\le 6$")
# Expansion: the definition states W ≥ w, and the new scene is embedded in the expansion section.
has("$W \\ge w$ and $B \\ge b$", 'spec="rom-expansion"')
exp_sec = L.split("## Building a bigger ROM from smaller chips")[1].split("\n## ")[0]
assert 'spec="rom-expansion"' in exp_sec
# Lab note: the NOR-of-0-rows form is mentioned.
has("NOR\nof the 0-rows instead")

# ── PYQ keys (from the bank's text and options) ────────────────────────────
B = bl.bank()
q = B["cse-1993-ii-a-6-6"]
assert "two 4-bit numbers" in q["text"] and q["type"] == "FILL"
M, N, _ = cl.multiplier_rom(4)
assert q["answer"] == f"M = {M}, N = {N}"


def size_of(t):
    """'$64K\\times 16$' or '64 K $\\times$ 16 bits' -> (words, bits)."""
    s = t.replace("\\text{K}", "K").replace("$", "").replace("\\times", "x").replace("bits", "").replace(" ", "")
    w, b = s.split("x")
    w = int(w[:-1]) * K if w.endswith("K") else int(w)
    return w, int(b)


for qid, n in (("cse-1996-a-21", 8), ("it-2004-it-10", 8)):
    q = B[qid]
    assert "8-bit" in q["text"]
    words, width, _ = cl.multiplier_rom(n)
    hits = [l for l, t in bl.option_values(q).items() if size_of(t) == (words, width)]
    assert hits == [q["answer"]], (qid, hits)
q = B["cse-2012-cs-19"]
assert "4 bit multiplier" in q["text"]
total = cl.multiplier_rom(4)[2]


def bits_of_opt(t):
    v, u = t.split()
    return int(v) * (K if u.startswith("K") else 1)


hits = [l for l, t in bl.option_values(q).items() if bits_of_opt(t) == total]
assert hits == [q["answer"]] == ["D"]
# The distractors named in the trap and the solutions.
assert bits_of_opt(bl.option_values(q)["C"]) == 256 * 4 and bits_of_opt(bl.option_values(q)["B"]) == 16 * 8
assert bits_of_opt(bl.option_values(q)["A"]) == 8 * 8
o96 = {l: size_of(t) for l, t in bl.option_values(B["cse-1996-a-21"]).items()}
assert o96 == {"A": (256, 16), "B": (64 * K, 8), "C": (4 * K, 16), "D": (64 * K, 16)}
o04 = {l: size_of(t) for l, t in bl.option_values(B["it-2004-it-10"]).items()}
assert o04 == {"A": (32 * K, 16), "B": (64 * K, 16), "C": (16 * K, 32), "D": (64 * K, 32)}
assert 16 * K * 32 == 2 ** 19 and 64 * K * 32 == 2 ** 21

# ── Practice ───────────────────────────────────────────────────────────────
P = cl.practice()
mine = sorted(k for k in P if k.startswith("nx-dl-04-05-"))
assert mine == [f"nx-dl-04-05-q{i:02d}" for i in range(1, 11)]
q = P["nx-dl-04-05-q01"]
opts = {l: size_of(t) for l, t in bl.option_values(q).items()}
bl.assert_mcq(q, [l for l, v in opts.items() if v == cl.rom_size(5, 3)[:2]][0])
q = P["nx-dl-04-05-q02"]
bl.assert_nat(q, cl.rom_size(4, 7)[2])
assert {w["answer"] for w in q["common_wrong"]} == {10 * 7, 16 * 8}
q = P["nx-dl-04-05-q03"]
opts = {l: size_of(t) for l, t in bl.option_values(q).items()}
bl.assert_mcq(q, [l for l, v in opts.items() if v == cl.multiplier_rom(6, 4)[:2]][0])
assert opts["A"] == (K, 24) and opts["C"][:1] == (cl.multiplier_rom(6)[0],) and opts["C"][1] == cl.multiplier_rom(6)[1]
q = P["nx-dl-04-05-q04"]
opts = {l: size_of(t) for l, t in bl.option_values(q).items()}
bl.assert_mcq(q, [l for l, v in opts.items() if v == adder(8)[:2]][0])
q = P["nx-dl-04-05-q05"]
bl.assert_nat(q, chips(16 * K, 32, 2 * K, 8))
assert {w["answer"] for w in q["common_wrong"]} == {16 * K // (2 * K), ceil(32 / 8)}
q = P["nx-dl-04-05-q06"]
h1, h2, h3 = [0, 1, 2], [0, 1, 3], [1, 2, 5]
bl.assert_nat(q, pla([h1, h2, h3]))
assert msops(h1) == {frozenset(["A'B'", "A'C'"])} and msops(h2) == {frozenset(["A'B'", "A'C"])} and msops(h3) == {frozenset(["B'C", "A'BC'"])}
assert len(set().union(*[next(iter(msops(h))) for h in (h1, h2, h3)])) == 5 and pal([h1, h2, h3]) == 6
k, terms = cl.pla_min_terms([(h, []) for h in (h1, h2, h3)], 3)
assert sorted(ml.term(c, V3) for c in terms) == sorted(["A'B'", "A'C", "B'C", "A'BC'"])
assert ml.parse_term("A'BC'", V3) not in ml.primes(h1, [], 3)
q = P["nx-dl-04-05-q07"]
truth = {"A": False, "B": True, "C": True, "D": True}
# D: every pair of 3-input functions fits an 8 x 2 ROM (the theorem above, checked for all pairs here).
for t1 in range(256):
    for t2 in range(0, 256, 17):
        f1 = [i for i in range(8) if t1 >> i & 1]
        f2 = [i for i in range(8) if t2 >> i & 1]
        assert all(rom_eval([f1, f2], a) == [int(a in f1), int(a in f2)] for a in range(8))
bl.assert_msq(q, [l for l, v in truth.items() if v])
q = P["nx-dl-04-05-q08"]
f8 = list(range(7))
assert pla([f8]) == 3 and pla([comp(f8)]) == 1 and len(f8) == 7
opts = bl.option_values(q)
bl.assert_mcq(q, [l for l, t in opts.items() if int(t) == min(pla([f8]), pla([comp(f8)]))][0])
assert pla([f8]) > 2
assert q["answer"] == "C" and {w["answer"]: int(opts[w["answer"]]) for w in q["common_wrong"]} == {"A": pla([f8]), "B": len(f8), "D": 2}
assert not any(len(c) == 2 for c in ml.min_covers(f8, [], 3))  # no 2-term SOP of f
mcq_keys = [P[k]["answer"] for k in mine if P[k]["type"] == "MCQ"]
assert set(mcq_keys) == set("ABCD") and max(mcq_keys.count(x) for x in "ABCD") <= 2, mcq_keys
q = P["nx-dl-04-05-q09"]
w, wired = wired_columns(lambda x: x ** 3, 4)
assert (w, wired) == (12, [0]) and 15 ** 3 == 3375 and (27 >> 1) & 1 == 1
bl.assert_nat(q, 2 ** 4 * (w - len(wired)))
assert {x["answer"] for x in q["common_wrong"]} == {16 * 12, 16 * 10}
q = P["nx-dl-04-05-q10"]
r1, r2 = [0, 1, 2, 7], [0, 1, 6, 7]
assert msops(r1) == {frozenset(["A'B'", "A'C'", "ABC"])} and msops(r2) == {frozenset(["A'B'", "AB"])}
fits = {"A": cl.rom_size(3, 2)[0] == 8, "B": pla([r1, r2]) <= 3, "C": pla([r1, r2]) <= 4,
        "D": max(len(next(iter(msops(r)))) for r in (r1, r2)) <= 2}
assert pla([r1, r2]) == 4
bl.assert_msq(q, [l for l, v in fits.items() if v])

# ── PYQ-solution scenes: a highlighted table row must already be revealed ─
import _sol_ch4_l05 as SOL  # noqa: E402
for qid, sol in SOL.SOLUTIONS.items():
    ncols = len(sol["animation"]["cols"])
    for st in sol["steps"]:
        sc = st.get("scene", {})
        for h in sc.get("hl", []):
            assert sc.get("reveal", 0) >= ncols * (h["r"] + 1), (qid, st["title"], sc)
s04 = {st["title"]: st["body"] for st in SOL.SOLUTIONS["it-2004-it-10"]["steps"]}
assert "$2^{15} \\le 65025 < 2^{16}$" in s04["Product bits"] and 2 ** 15 <= 65025 < 2 ** 16
assert "none is a copy of an input bit" in s04["Minimum size"]
assert "a quarter of the 64K words" in SOL.SOLUTIONS["it-2004-it-10"]["optionAnalysis"][2]["reason"]
assert 16 * K * 4 == 64 * K

# ── Key sentences ──────────────────────────────────────────────────────────
has("bit 1 of", "squares mod 4 are only 0 or 1", "$(2^n - 1)^2 < 2^{2n}$", "$2^{2n-1} \\ge 2^{n+1} - 1$",
    "$256 \\times 8 = 2048$ bits $= 2$ Kbit", "$64\\text{K} \\times 16$", "lesson:code-arithmetic")
print("l4_05_rom_pla: ROM theorem (all 3-input pairs), sizes, product width (n, m ≤ 8 by enumeration), constant columns, expansion, PLA/PAL counts (exhaustive), complement trick, 4 PYQ keys and 10 practice answers OK")
