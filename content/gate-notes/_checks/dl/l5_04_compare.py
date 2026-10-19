"""Checks for dl/05-combinational-circuits/04-comparators-parity: the 1-bit comparator (AND/XNOR and
all-NOR forms), the equality and magnitude theorems (exhaustively for n ≤ 4, including the
lexicographic = numeric claim and the disjointness of the G terms), the row counts 2^n and
(4^n − 2^n)/2, the comparator-subscript erratum, the cascade equations and the chain theorem, the
5n + 1 gate count (built and simulated as comblib netlists), signed comparison by flipping the sign
bits, comparison by subtraction (borrow out, N ⊕ V with its proof's case analysis, and the four worked examples), parity bits, the XOR-tree theorem (gate count,
depth, and the n − 1 / depth lower bounds checked by exhaustive search for small n), what parity
detects, every worked example, the Live Lab's 8:1 MUX table, and every practice answer, MSQ option
and MCQ distractor. This lesson has no PYQs."""
import itertools
import pathlib
import sys
from math import ceil, log2

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import comblib as cl  # noqa: E402
import minlib as ml  # noqa: E402

L = cl.lesson_text("04-comparators-parity.md")
has = lambda *s: bl.must_contain(L, *s)
PQ = cl.practice()
Q = lambda n: PQ[f"nx-dl-05-04-q{n:02d}"]


def vars_ab(n):
    return [f"A{i}" for i in range(n - 1, -1, -1)] + [f"B{i}" for i in range(n - 1, -1, -1)]


def split(m, n):
    return m >> n, m & (2 ** n - 1)


def gt_expr(n):
    return cl.comparator_gt_expr(n)


def lt_expr(n):
    return cl.comparator_gt_expr(n, "B", "A").replace("\\odot", "\\odot")


def eq_expr(n):
    return " ".join(f"(A{i} \\odot B{i})" for i in range(n - 1, -1, -1))


# ── 1-bit comparator ────────────────────────────────────────────────────────
AB = ["A", "B"]
assert bl.tt("AB'", AB) == (0, 0, 1, 0) and bl.tt("A'B", AB) == (0, 1, 0, 0) and bl.tt("A \\odot B", AB) == (1, 0, 0, 1)
assert all(sum(v) == 1 for v in zip(bl.tt("AB'", AB), bl.tt("A \\odot B", AB), bl.tt("A'B", AB)))
assert bl.equal("(AB' + A'B)'", "A \\odot B", AB)
# All-NOR form: N = (A + B)', L = (A + N)', G = (B + N)', E = (G + L)'.
net = [("N", "NOR", ["A", "B"]), ("L", "NOR", ["A", "N"]), ("G", "NOR", ["B", "N"]), ("E", "NOR", ["G", "L"])]
assert cl.truth(net, AB, "L") == bl.tt("A'B", AB) and cl.truth(net, AB, "G") == bl.tt("AB'", AB)
assert cl.truth(net, AB, "E") == bl.tt("A \\odot B", AB)
has("$G = AB'$, $E = A \\odot B$, $L = A'B$", "only four NOR gates", "$(A + N)' = A'B = L$")

# ── Equality, magnitude, lexicographic order, disjoint terms (n = 1 … 4) ────
for n in range(1, 5):
    vs = vars_ab(n)
    tg, te, tl = bl.tt(gt_expr(n), vs), bl.tt(eq_expr(n), vs), bl.tt(lt_expr(n), vs)
    for m in range(4 ** n):
        a, b = split(m, n)
        assert (tg[m], te[m], tl[m]) == cl.compare(a, b)
        sa, sb = format(a, f"0{n}b"), format(b, f"0{n}b")
        assert (sa > sb) == (a > b)  # lexicographic = numeric
        if a != b:  # the highest differing bit decides
            k = max(i for i in range(n) if (a >> i) & 1 != (b >> i) & 1)
            assert ((a >> k) & 1 == 1) == (a > b)
    # the n terms of G are pairwise disjoint
    terms = gt_expr(n).split(" + ")
    tts = [bl.tt(t, vs) for t in terms]
    assert all(sum(col) <= 1 for col in zip(*tts))
    # row counts
    assert sum(te) == 2 ** n and sum(tg) == sum(tl) == (4 ** n - 2 ** n) // 2
assert [(2 ** n, (4 ** n - 2 ** n) // 2) for n in (1, 2, 3, 4)] == [(2, 1), (4, 6), (8, 28), (16, 120)]
assert sum(range(1, 4)) == 6
has("$4 + 6 + 6 = 16$", "$1 + 2 + 3 = 6$", "For $n = 3$: $8$, $28$, $28$; for $n = 4$: $16$, $120$, $120$")
has("lexicographic order (read from the MSB)")

# 2-bit and 3-bit forms in the lesson
V2 = vars_ab(2)
assert bl.minterms("A1 B1' + (A1 \\odot B1) A0 B0'", V2) == [4, 8, 9, 12, 13, 14]
assert bl.minterms("A1 B1' + A0 B1' B0' + A1 A0 B0'", V2) == [4, 8, 9, 12, 13, 14]
assert ml.min_literals_sop([4, 8, 9, 12, 13, 14], [], 4) == 8
assert {frozenset(ml.term(c, V2) for c in cov) for cov in ml.min_covers([4, 8, 9, 12, 13, 14], [], 4)} == \
    {frozenset(["A1B1'", "A0B1'B0'", "A1A0B0'"])}
assert bl.minterms("A1' B1' A0 B0'", V2) == [4] and bl.minterms("A1 B1 A0 B0'", V2) == [14]
assert bl.minterms("(A1 \\odot B1)(A0 \\odot B0)", V2) == [0, 5, 10, 15]
has("$G = \\Sigma m(4, 8, 9, 12, 13, 14)$", "$G = A_1B_1' + A_0B_1'B_0' + A_1A_0B_0'$ (8 literals, minimal)")
V3 = vars_ab(3)
assert bl.equal("A2 B2' + (A2 \\odot B2) A1 B1' + (A2 \\odot B2)(A1 \\odot B1) A0 B0'", gt_expr(3), V3)

# ── Erratum A 61 / 63: the misprinted third term is identically 0 ────────────
assert bl.minterms("(A0 \\odot B0)(A1 \\odot B1) A0 B0'", V3) == []
wrong = "A2 B2' + (A2 \\odot B2) A1 B1' + (A0 \\odot B0)(A1 \\odot B1) A0 B0'"
missed = [m for m in range(64) if bl.tt(gt_expr(3), V3)[m] and not bl.tt(wrong, V3)[m]]
assert missed and all(((m >> 3) ^ (m & 7)) == 1 for m in missed)  # exactly the pairs first differing in bit 0
assert (0b101 << 3 | 0b100) in missed
has("(A_2 \\odot B_2)(A_1 \\odot B_1)\\,A_0B_0' ,", "for example $A = 101$, $B = 100$")

# ── Trick and trap ──────────────────────────────────────────────────────────
gray_to_bin = lambda g: next(b for b in range(16) if b ^ (b >> 1) == g)
assert gray_to_bin(0b0011) == 2 and gray_to_bin(0b0010) == 3
assert bl.tt("A1 B1' + A0 B0'", V2)[0b0110] == 1 and cl.compare(1, 2)[0] == 0  # claims 01 > 10
has("Gray $0011$ is 2")

# ── Worked examples: comparators ───────────────────────────────────────────
V4 = vars_ab(4)
env = lambda a, b, n=4: dict(zip(vars_ab(n), cl.bits_of(a, n) + cl.bits_of(b, n)))
terms4 = gt_expr(4).split(" + ")
e = env(0b1010, 0b1001)
assert [bl.ev(bl.parse(t), e) for t in terms4] == [0, 0, 1, 0]
assert cl.compare(10, 9) == (1, 0, 0)
lt_terms4 = lt_expr(4).split(" + ")
assert [bl.ev(bl.parse(t), e) for t in lt_terms4] == [0, 0, 0, 0]
assert bl.ev(bl.parse("A0' B0"), e) == 1  # the bit-0 test alone would say L
e = env(0b0110, 0b0110)
assert [bl.ev(bl.parse(t), e) for t in terms4] == [0, 0, 0, 0] and bl.ev(bl.parse(eq_expr(4)), e) == 1
has("The third term, $x_3x_2A_1B_1'$, fires: $G = 1$, $E = 0$, $L = 0$ ($10 > 9$)", "$(G, E, L) = (0, 1, 0)$")

# ── Cascades ───────────────────────────────────────────────────────────────
def chip(a4, b4, cin):
    g4, e4, l4 = cl.compare(a4, b4)
    gi, ei, li = cin
    return int(g4 or (e4 and gi)), int(e4 and ei), int(l4 or (e4 and li))


def chain(a, b, n, w=4):
    k = ceil(n / w)
    out = (0, 1, 0)
    for i in range(k):
        out = chip((a >> (w * i)) & (2 ** w - 1), (b >> (w * i)) & (2 ** w - 1), out)
    return out, k


# the chain theorem, exhaustively for 8 bits from 4-bit chips (and 6 bits from 2-bit chips)
for a in range(256):
    for b in range(256):
        assert chain(a, b, 8)[0] == cl.compare(a, b)
for a in range(64):
    for b in range(64):
        assert chain(a, b, 6, 2)[0] == cl.compare(a, b)
assert chip(0b1100, 0b0111, (0, 1, 0)) == (1, 0, 0) and chip(0b0101, 0b0101, (1, 0, 0)) == (1, 0, 0)
assert 0b01011100 == 92 and 0b01010111 == 87 and chain(92, 87, 8) == ((1, 0, 0), 2)
assert chain(0x7A3, 0x7A9, 12) == ((0, 0, 1), 3) and (0x7A3, 0x7A9) == (1955, 1961)
assert chip(3, 9, (0, 1, 0)) == (0, 0, 1) and chip(0xA, 0xA, (0, 0, 1)) == (0, 0, 1)
assert ceil(18 / 4) == 5 and ceil(12 / 4) == 3
has("$\\lceil 12/4 \\rceil = 3$ chips", "$1955 < 1961$", "($92 > 87$)")


# ── Gate count 5n + 1, built as a netlist and simulated ────────────────────
def comparator_net(n):
    net = []
    for k in range(n):
        net += [(f"P{k}", "AND", [f"A{k}", f"~B{k}"]), (f"Q{k}", "AND", [f"~A{k}", f"B{k}"]),
                (f"x{k}", "NOR", [f"P{k}", f"Q{k}"])]
    net.append(("E", "AND", [f"x{k}" for k in range(n - 1, -1, -1)]))
    for out, src in (("G", "P"), ("L", "Q")):
        tl = [f"{src}{n - 1}"]
        for k in range(n - 2, -1, -1):
            net.append((f"{out}t{k}", "AND", [f"x{j}" for j in range(n - 1, k, -1)] + [f"{src}{k}"]))
            tl.append(f"{out}t{k}")
        net.append((out, "OR", tl))
    return net


for n in (2, 3, 4):
    net = comparator_net(n)
    assert len(net) == 5 * n + 1
    vs = vars_ab(n)
    for out, idx in (("G", 0), ("E", 1), ("L", 2)):
        t = cl.truth(net, vs, out)
        assert all(t[m] == cl.compare(*split(m, n))[idx] for m in range(4 ** n))
net2 = comparator_net(2)
assert cl.ones_of(cl.truth(net2, V2, "G")) == [4, 8, 9, 12, 13, 14] and cl.ones_of(cl.truth(net2, V2, "E")) == [0, 5, 10, 15]
assert len(net2) == 11 and 5 * 4 + 1 == 21
has("Total: $3n + 1 + n + n = 5n + 1$ gates for $n \\ge 2$", "$n = 2$ gives 11", "11 gates ($= 5 \\cdot 2 + 1$)")


# ── Signed comparison ──────────────────────────────────────────────────────
def sval(p, n=4):
    return p - 2 ** n if p >> (n - 1) else p


for n in (2, 3, 4, 5):
    flip = 1 << (n - 1)
    for a in range(2 ** n):
        for b in range(2 ** n):
            assert cl.compare(a ^ flip, b ^ flip) == cl.compare(sval(a, n), sval(b, n))
            assert (a ^ flip) == sval(a, n) + flip
assert sval(0b1110) == -2 and cl.compare(0b1110, 0b0011)[0] == 1 and cl.compare(0b0110, 0b1011) == (0, 0, 1)
has("$0110 = 6$ against $1011 = 11$")

# ── Comparison by subtraction ──────────────────────────────────────────────
for n in (3, 4):
    for a in range(2 ** n):
        for b in range(2 ** n):
            r = (a - b) % 2 ** n
            borrow = int(a - b < 0)
            assert (a - b + 2 ** n * borrow) == r and borrow == int(a < b) and int(r == 0) == int(a == b)
            carry = int(a + ((2 ** n - 1) ^ b) + 1 >= 2 ** n)
            assert carry == 1 - borrow
            sa, sb = sval(a, n), sval(b, n)
            N = r >> (n - 1)
            V = int(not (-(2 ** (n - 1)) <= sa - sb < 2 ** (n - 1)))
            assert (N ^ V) == int(sa < sb)
r = (0b0110 - 0b1011) % 16
assert r == 0b1011 and sval(0b1011) == -5 and 6 - (-5) == 11
has("the 4-bit result of $A - B$ is $1011$, so $N = 1$")

# ── Parity ─────────────────────────────────────────────────────────────────
pop = lambda bits: sum(bits)
s2b = lambda s: [int(c) for c in s.replace(" ", "")]
assert bl.minterms("A \\oplus B \\oplus C", list("ABC")) == [1, 2, 4, 7]
assert ml.min_literals_sop([1, 2, 4, 7], [], 3) == 12
d = s2b("11010110")
assert pop(d) == 5 and cl.parity(d) == 1 and cl.parity(d, even=False) == 0
rcv = s2b("101100101")
assert pop(rcv) == 5 and pop(rcv) % 2 == 1
sent = s2b("10110010")
assert cl.parity(sent) == 0 and int("10110010", 2) == 178
bad = sent[:]
for pos in (1, 4):  # bit positions from 0 at the right
    bad[7 - pos] ^= 1
assert "".join(map(str, bad)) == "10100000" and int("10100000", 2) == 160 and pop(bad + [0]) % 2 == 0
has("1s: $1 + 1 + 0 + 1 + 0 + 1 + 1 + 0 = 5$", "Received: $1010\\,0000\\,0$", "here 2, which turned 178 into 160")


def tree_levels(n):
    lv = []
    while n > 1:
        lv.append(n // 2)
        n = ceil(n / 2)
    return lv


assert tree_levels(9) == [4, 2, 1, 1] and cl.xor_tree(9) == (8, 4)
assert tree_levels(13) == [6, 3, 2, 1] and cl.xor_tree(13) == (12, 4)
for n in range(2, 70):
    assert sum(tree_levels(n)) == n - 1 and len(tree_levels(n)) == ceil(log2(n)) == cl.xor_tree(n)[1]
has("Total $4 + 2 + 1 + 1 = 8$", "Depth $\\lceil \\log_2 9 \\rceil = 4$ is optimal")


def two_input_ops(full):
    """All 16 two-input gate functions on truth-table masks (bit t of the code = output on (a, b) = t)."""
    def make(t):
        def op(a, b):
            parts = [full & ~a & ~b, full & ~a & b, a & ~b & full, a & b]
            out = 0
            for i in range(4):
                if (t >> i) & 1:
                    out |= parts[i]
            return out
        return op
    return [make(t) for t in range(16)]


# Lower bounds by exhaustive search: the parity of n inputs needs n − 1 two-input gates (any of the
# 16 two-input functions, constants free) and depth ⌈log2 n⌉, for n = 2, 3, 4.
def search_min_gates(target, n, max_g):
    R = 2 ** n
    full = (1 << R) - 1
    ins = bl.input_masks(n)
    ops = two_input_ops(full)
    start = list(ins) + [0, full]
    if target in start:
        return 0

    def dfs(sig, k):
        cand = set()
        for a, b in itertools.combinations_with_replacement(sig, 2):
            for op in ops:
                cand.add(op(a, b))
        if target in cand:
            return True
        if k > 1:
            for s in cand:
                if s not in sig and dfs(sig + [s], k - 1):
                    return True
        return False

    for g in range(1, max_g + 1):
        if dfs(start, g):
            return g
    return None


for n in (2, 3, 4):
    par = bl.tt_to_mask(bl.tt(" \\oplus ".join(f"x{i}" for i in range(n)), [f"x{i}" for i in range(n)]))
    assert search_min_gates(par, n, n - 1) == n - 1


def depth_reach(n, depth):
    """Functions of n inputs computable by 2-input gates within the given depth (any gates)."""
    R = 2 ** n
    full = (1 << R) - 1
    level = set(bl.input_masks(n)) | {0, full}
    ops = two_input_ops(full)
    for _ in range(depth):
        level = level | {op(a, b) for a in level for b in level for op in ops}
    return level


for n in (3, 4):
    par = bl.tt_to_mask(bl.tt(" \\oplus ".join(f"x{i}" for i in range(n)), [f"x{i}" for i in range(n)]))
    assert par not in depth_reach(n, ceil(log2(n)) - 1) and par in depth_reach(n, ceil(log2(n)))


# What parity detects: every error pattern on a 9-bit even-parity word.
for w in range(2 ** 8):
    word = cl.bits_of(w, 8)
    word = word + [cl.parity(word)]
    for e in range(1, 2 ** 9):
        err = cl.bits_of(e, 9)
        rcv = [x ^ y for x, y in zip(word, err)]
        assert (sum(rcv) % 2 == 1) == (sum(err) % 2 == 1)
has("parity detects **every odd** number of errors (1, 3, 5, …), not just one, and\n**no even** number")

# ── Live Lab: 2-bit A > B on an 8:1 MUX with selects A1, A0, B1 ─────────────
VL = ["A1", "A0", "B1", "B0"]
g2 = bl.minterms(gt_expr(2), V2)
names, rv = cl.impl_table(g2, 4, [0, 1, 2], VL)
assert rv == ["B0"] and names == ["0", "0", "B0′", "0", "1", "0", "1", "B0′"]
assert cl.mux_realises(g2, 4, [0, 1, 2], ["0", "0", "B0'", "0", "1", "0", "1", "B0'"], VL)
net = [("f", "MUX", {"d": ["0", "0", "~B0", "0", "1", "0", "1", "~B0"], "s": ["A1", "A0", "B1"]})]
assert cl.ones_of(cl.truth(net, VL, "f")) == [4, 8, 9, 12, 13, 14]
has("$I_2 = B_0'$", "$I_7 = B_0'$", "$I_4 = 1$", "$I_6 = 1$", "the six 1-rows 4, 8, 9, 12, 13, 14")

# ── Practice ───────────────────────────────────────────────────────────────
# q01: which expression is A > B (2 bits)
o = bl.option_values(Q(1))
vals = {k: bl.tt(t.strip("$").replace("_", ""), V2) for k, t in o.items()}
gt2 = tuple(cl.compare(*split(m, 2))[0] for m in range(16))
lt2 = tuple(cl.compare(*split(m, 2))[2] for m in range(16))
assert bl.which(o, lambda t: bl.tt(t.strip("$").replace("_", ""), V2) == gt2) == ["B"]
assert vals["D"] == lt2 and vals["A"][0b0110] == 1 and vals["C"][0b0100] == 0 and vals["C"][0b0110] == 1
bl.assert_mcq(Q(1), "B")

# q02: rows with A ≥ B (2 bits)
ge = sum(1 for m in range(16) if split(m, 2)[0] >= split(m, 2)[1])
bl.assert_nat(Q(2), ge)
assert ge == 10 and sum(gt2) == 6

# q03: minimum 2-input gates for 6-bit equality = 11 (construction + lower bound n − 1 with 12 inputs)
net = [(f"x{i}", "XNOR", [f"A{i}", f"B{i}"]) for i in range(6)]
net += [("t1", "AND", ["x5", "x4"]), ("t2", "AND", ["t1", "x3"]), ("t3", "AND", ["t2", "x2"]),
        ("t4", "AND", ["t3", "x1"]), ("E", "AND", ["t4", "x0"])]
V6 = vars_ab(6)
t = cl.truth(net, V6, "E")
assert all(t[m] == int(split(m, 6)[0] == split(m, 6)[1]) for m in range(4 ** 6)) and len(net) == 11
# E depends on all 12 inputs, so the graph bound gives ≥ 11
assert all(any(t[m] != t[m ^ (1 << i)] for m in range(4 ** 6)) for i in range(12))
bl.assert_nat(Q(3), 11)

# q04: A = 0110, B = 0101: only the third term fires
e = env(0b0110, 0b0101)
fires = [bl.ev(bl.parse(t), e) for t in terms4]
assert fires == [0, 0, 1, 0] and cl.compare(6, 5) == (1, 0, 0)
assert [bl.ev(bl.parse(t), e) for t in lt_terms4] == [0, 0, 0, 0]
bl.assert_mcq(Q(4), "C")

# q05: chips for 18 bits
bl.assert_nat(Q(5), ceil(18 / 4))
for a, b in [(0x2ABCD, 0x2ABCE), (0x3FFFF, 0x1FFFF), (12345, 12345)]:
    assert chain(a, b, 18)[0] == cl.compare(a, b) and chain(a, b, 18)[1] == 5

# q06: odd parity of 1011001 and the XNOR checker on an intact word
d = s2b("1011001")
P = cl.parity(d, even=False)
word = d + [P]
F = 1 - sum(word) % 2
assert (P, F) == (1, 0) and cl.parity(d) == 0
opts = {"A": (1, 0), "B": (0, 0), "C": (1, 1), "D": (0, 1)}
assert [k for k, v in opts.items() if v == (P, F)] == ["A"]
bl.assert_mcq(Q(6), "A")

# q07: 13 inputs
g, dd = cl.xor_tree(13)
bl.assert_nat(Q(7), g + dd)
assert (g, dd) == (12, 4)

# q08: which error patterns on a 17-bit even-parity word are always detected
def always_detected(weights_positions):
    for w in [0, 0x1234, 0xFFFF, 0x8001]:
        word = cl.bits_of(w, 16)
        word = word + [cl.parity(word)]
        for pos in weights_positions:
            rcv = word[:]
            for p in pos:
                rcv[p] ^= 1
            if sum(rcv) % 2 == 0:
                return False
    return True


pats = {
    "A": [(i,) for i in range(16)],
    "B": list(itertools.combinations(range(17), 2)),
    "C": list(itertools.combinations(range(17), 3)),
    "D": [(16,)],
}
bl.assert_msq(Q(8), sorted(k for k, v in pats.items() if always_detected(v)))

# q09: comparator statements
def lsb_first(a, b, n):
    for i in range(n):
        if (a >> i) & 1 != (b >> i) & 1:
            return int((a >> i) & 1 == 1)
    return 0


stA = all(lsb_first(a, b, 3) == int(a > b) for a in range(8) for b in range(8))
stB = all(sum(bl.tt(eq_expr(n), vars_ab(n))) == 2 ** n for n in (1, 2, 3))
stC = all(cl.compare(*split(m, 3))[0] == 1 - (cl.compare(*split(m, 3))[1] | cl.compare(*split(m, 3))[2]) for m in range(64))
stD = all(cl.compare(a ^ 8, b ^ 8) == cl.compare(sval(a), sval(b)) for a in range(16) for b in range(16))
assert lsb_first(0b10, 0b01, 2) == 0
bl.assert_msq(Q(9), [k for k, v in zip("ABCD", (stA, stB, stC, stD)) if v])

# q10: 1010 vs 0110 on an unsigned comparator
assert cl.compare(0b1010, 0b0110) == (1, 0, 0) and (sval(0b1010), sval(0b0110)) == (-6, 6)
assert cl.compare(0b1010 ^ 8, 0b0110 ^ 8) == (0, 0, 1) and (0b0010, 0b1110) == (2, 14)
bl.assert_mcq(Q(10), "D")

# ── Review fixes: new claims and worked examples ───────────────────────────
# Dictionary: 'cartel' < 'carton' ('e' < 'o').
assert "cartel" < "carton" and "e" < "o"
has("'cartel' comes before 'carton'".replace("'", '"'))
# Equality proof: the highest differing bit k forces |A − B| ≥ 1 (n ≤ 5, exhaustive).
for n in range(1, 6):
    for a in range(2 ** n):
        for b in range(2 ** n):
            if a != b:
                k = max(i for i in range(n) if (a >> i) & 1 != (b >> i) & 1)
                low = sum(((a >> i) & 1) * 2 ** i - ((b >> i) & 1) * 2 ** i for i in range(k))
                assert abs(low) <= 2 ** k - 1 and abs(a - b) >= 2 ** k - (2 ** k - 1) == 1
has("So $|A - B| \\ge 2^k - (2^k - 1) = 1$, and $A \\ne B$.")
# Signed trap: swapping A3 and B3 in the first term of G and of L (x3 unchanged) = flipping both sign bits.
V4s = vars_ab(4)
g_sw = gt_expr(4).replace("A3 B3'", "B3 A3'", 1)
l_sw = lt_expr(4).replace("B3 A3'", "A3 B3'", 1)
assert g_sw != gt_expr(4) and l_sw != lt_expr(4)
tg, tl = bl.tt(g_sw, V4s), bl.tt(l_sw, V4s)
for m in range(256):
    a, b = split(m, 4)
    assert (tg[m], tl[m]) == (int(sval(a) > sval(b)), int(sval(a) < sval(b)))
has("in the first term of $G$ and in the first\nterm of $L$; $x_3$ is unchanged")
# Equality lower bound: E of two n-bit numbers depends on all 2n inputs → ≥ 2n − 1 gates, met by n XNORs + n − 1 ANDs.
for n in (1, 2, 3):
    vs = vars_ab(n)
    t = bl.tt(eq_expr(n), vs)
    assert all(any(t[m] != t[m ^ (1 << i)] for m in range(4 ** n)) for i in range(2 * n))
    assert n + (n - 1) == 2 * n - 1
has("at least $2n - 1$, exactly the XNOR row plus the AND tree")
# Signed less-than N ⊕ V: the proof's case analysis, exhaustively for n = 3 … 6.
for n in (3, 4, 5, 6):
    lo, hi = -(2 ** (n - 1)), 2 ** (n - 1) - 1
    for a in range(2 ** n):
        for b in range(2 ** n):
            sa, sb = sval(a, n), sval(b, n)
            D = sa - sb
            r = (a - b) % 2 ** n
            N, R = r >> (n - 1), sval(r, n)
            V = int(not lo <= D <= hi)
            # V by the sign rule: different signs of A and B, and R's sign differs from A's
            assert V == int((a >> (n - 1)) != (b >> (n - 1)) and N != (a >> (n - 1)))
            assert -(2 ** n - 1) <= D <= 2 ** n - 1
            if V == 0:
                assert R == D
            elif D >= 2 ** (n - 1):
                assert R == D - 2 ** n and -(2 ** (n - 1)) <= R <= -1 and N == 1
            else:
                assert D < -(2 ** (n - 1)) and R == D + 2 ** n and 1 <= R <= 2 ** (n - 1) - 1 and N == 0
            assert (N ^ V) == int(sa < sb)
# Worked examples: comparing by subtraction (4 bits).
def sub4(a, b):
    s = a + ((~b) & 15) + 1
    r, carry = s & 15, s >> 4
    N = r >> 3
    V = int((a >> 3) != (b >> 3) and N != (a >> 3))
    return r, carry, 1 - carry, N, V


# easy: 9 − 12
assert 0b1001 + 0b0011 + 1 == 0b1101 and sub4(0b1001, 0b1100) == (0b1101, 0, 1, 1, 0) and 9 - 12 + 16 == 13
L_, E_ = 1, int(sub4(9, 12)[0] == 0)
assert (int(not (L_ or E_)), E_, L_) == (0, 0, 1) == cl.compare(9, 12)
# medium: equal numbers
assert 0b0111 + 0b1000 + 1 == 0b10000 and sub4(7, 7)[:3] == (0, 1, 0) and cl.compare(7, 7) == (0, 1, 0)
# gate: −3 against 2, no overflow
assert sval(0b1101) == -3 and 0b1101 + 0b1101 + 1 == 0b11011 and sub4(0b1101, 0b0010) == (0b1011, 1, 0, 1, 0)
assert sval(0b1011) == -5 and (1 ^ 0) == int(-3 < 2) and cl.compare(13, 2) == (1, 0, 0)
# edge: −8 against 1, overflow
assert 0b1000 + 0b1110 + 1 == 0b10111 and sub4(0b1000, 0b0001) == (0b0111, 1, 0, 0, 1) and -8 - 1 == -9 < -8
assert (0 ^ 1) == int(-8 < 1)
# the trap: 6 − (−5) = 11 overflows, N = 1, V = 1
assert sub4(0b0110, 0b1011)[3:] == (1, 1)
has("$1001 + 0011 + 1 = 1101$", "$0111 + 1000 + 1 = 1\\,0000$", "$1101 + 1101 + 1 = 1\\,1011$", "$1000 + 1110 + 1 = 1\\,0111$")
# Parity flag F in the worked example.
has("Error flag $F = 1$", "one bit, three bits, or any odd number of\nthe nine could have flipped")
# Gate-count wording.
has("it is not\nclaimed to be minimal")

# MCQ keys spread (no letter more than twice)
keys = [q["answer"] for q in PQ.values() if q["id"].startswith("nx-dl-05-04-") and q["type"] == "MCQ"]
assert max(keys.count(k) for k in "ABCD") <= 2
print("l5_04_compare: comparator theorems (n ≤ 4), counts, erratum, cascades, 5n + 1 netlists, signed and "
      "subtraction flags, parity, XOR-tree bounds by exhaustive search, the lab MUX table and 10 practice answers OK")
