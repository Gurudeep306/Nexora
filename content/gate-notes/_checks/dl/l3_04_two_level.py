"""Checks for dl/03-minimisation/04-two-level-implementation: SOP/POS literal counts (the POS = SOP of f′
theorem over every 3-variable function), NAND–NAND / NOR–NOR equivalence, the minimum 2-input gate table
(exhaustive circuit search with complemented inputs), the hazard theorem (adjacent-pair criterion against
an event simulation with delays), the consensus fix, multi-output costs (exhaustive search), the four PYQ
keys and the practice answers."""
import itertools
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import minlib as ml  # noqa: E402

L = ml.lesson_text("04-two-level-implementation.md")
has = lambda *s: bl.must_contain(L, *s)
V3, V4 = list("ABC"), list("ABCD")


def msops(ones, dcs, n, vars_):
    return {frozenset(ml.term(c, vars_) for c in cov) for cov in ml.min_covers(ones, dcs, n)}


def mposs(ones, dcs, n, vars_):
    return {frozenset(ml.sum_term(c, vars_) for c in cov) for cov in ml.min_pos_covers(ones, dcs, n)}


# ── Cost: POS(f) = SOP(f′) for every 3-variable function; examples ──────────
for t in bl.all_functions(3):
    ones = [i for i, v in enumerate(t) if v]
    if 0 < len(ones) < 8:
        assert ml.min_literals_pos(ones, [], 3) == ml.min_literals_sop(ml.zeros_of(ones, [], 3), [], 3)
assert msops([0, 1, 2, 3, 7], [], 3, V3) == {frozenset(["A'", "BC"])} and mposs([0, 1, 2, 3, 7], [], 3, V3) == {frozenset(["(A' + B)", "(A' + C)"])}
assert bl.equal("(A' + B)(A' + C)", "A' + BC", V3)
o, d = [1, 3, 5, 7, 9], [6, 12, 13]
assert msops(o, d, 4, V4) == {frozenset(["A'D", "C'D"])} and mposs(o, d, 4, V4) == {frozenset(["(D)", "(A' + C')"])}
o, d = [3, 6, 7, 9, 11, 12, 13, 14, 15], [0, 1]
assert msops(o, d, 4, V4) == {frozenset(["B'D", "BC", "AB"])} and mposs(o, d, 4, V4) == {frozenset(["(A + C)", "(B + D)"])}
sop_fn = ml.cover_fn(ml.min_covers(o, d, 4)[0], 4)
pos_fn = ml.pos_fn(ml.min_pos_covers(o, d, 4)[0], 4)
assert 1 in sop_fn and 1 not in pos_fn and 0 not in pos_fn
o, d = [1, 2, 4, 5, 6], [7]
assert ml.min_literals_sop(o, d, 3) == ml.min_literals_pos(o, d, 3) == 5
assert 7 in ml.cover_fn(ml.min_covers(o, d, 3)[0], 3) and 7 not in ml.pos_fn(ml.min_pos_covers(o, d, 3)[0], 3)

# ── NAND–NAND / NOR–NOR and the gate table ──────────────────────────────────
assert bl.equal("((A'C)' (AB)')'", "A'C + AB", V3) and bl.equal("((A + B)' + (C + D)')'", "(A + B)(C + D)", V4)
TABLE = [("A'C", 2, 1), ("AB + CD", 3, 4), ("(A + B)(C + D)", 4, 3), ("B \\oplus D", 3, 3), ("(B \\oplus D)'", 3, 3), ("AB + A'C", 3, 3)]
for e, nand, nor in TABLE:
    vs = V4 if re.search("D", e) else V3
    ones = bl.minterms(e, vs)
    assert ml.min_gates_lits(ones, len(vs), "NAND") == nand and ml.min_gates_lits(ones, len(vs), "NOR") == nor, e
assert ml.min_gates_lits(bl.minterms("A + BC", V3), 3, "NAND") == 2 and bl.min_gates(bl.tt("A + BC", V3), "NAND") == 3
assert bl.equal("(A' (B C)')'", "A + BC", V3)
assert bl.min_gates(bl.tt("B \\oplus D", ["B", "D"]), "NAND") == 4
assert bl.equal("(a + c')'", "a'c", list("ac"))

# ── Hazards: criterion vs simulation ────────────────────────────────────────
def simulate_glitch(cover, n, a, b, delays):
    """Can the AND–OR output dip while the input moves from cell a to adjacent cell b, f(a) = f(b) = 1?
    Each literal arrives after its own delay (delays[var][polarity]); a term is 1 iff all its literals are 1."""
    bit = (a ^ b).bit_length() - 1
    var = n - 1 - bit
    times = sorted({0} | {delays[var][0], delays[var][1]} | {x + 0.5 for x in (delays[var][0], delays[var][1])})
    for t in times:
        val = 0
        for c in cover:
            ok = 1
            for v, ch in enumerate(c):
                if ch == "-":
                    continue
                x_now = (a >> (n - 1 - v)) & 1
                if v == var:
                    want = int(ch)
                    # literal of polarity `want` switches at delays[var][want]
                    xa = (a >> (n - 1 - v)) & 1
                    xb = (b >> (n - 1 - v)) & 1
                    cur = xb if t >= delays[var][want] else xa
                    ok &= int(cur == want)
                else:
                    ok &= int(x_now == int(ch))
            val |= ok
        if not val:
            return True
    return False


def hazard_by_sim(cover, ones, n):
    out = set()
    for a in ones:
        for b in ones:
            if a < b and ml.adjacent(a, b):
                v = n - 1 - ((a ^ b).bit_length() - 1)
                for d0, d1 in ((1, 2), (2, 1)):
                    dl = {u: (0, 0) for u in range(n)}
                    dl[v] = (d0, d1)
                    if simulate_glitch(cover, n, a, b, dl) or simulate_glitch(cover, n, b, a, dl):
                        out.add((a, b))
    return sorted(out)


rnd_covers = []
for t in bl.all_functions(3):
    ones = [i for i, v in enumerate(t) if v]
    if not ones:
        continue
    for cov in ml.petrick(ones, ml.primes(ones, [], 3)):
        assert ml.static1_hazards(cov, ones) == hazard_by_sim(cov, ones, 3)
hz = lambda terms, vs: ml.static1_hazards([ml.parse_term(x, vs) for x in terms], ml.cover_fn([ml.parse_term(x, vs) for x in terms], len(vs)))
assert hz(["AB", "A'C"], V3) == [(3, 7)] and hz(["AB", "A'C", "BC"], V3) == []
assert ml.cover_fn([ml.parse_term(x, V4) for x in ("A'C'D", "BC", "AB'C'")], 4) == [1, 5, 6, 7, 8, 9, 14, 15]
assert hz(["A'C'D", "BC", "AB'C'"], V4) == [(1, 9), (5, 7)] and hz(["A'C'D", "BC", "AB'C'", "B'C'D", "A'BD"], V4) == []
f = [3, 4, 5, 7]
assert bl.minterms("AB' + BC", V3) == f
covers = {"i": ["AB'", "BC"], "ii": ["AB'", "BC", "AC"], "iii": ["AB'", "A'BC", "ABC"]}
assert {k: bool(hz(v, V3)) for k, v in covers.items()} == {"i": True, "ii": False, "iii": True}
assert all(ml.cover_fn([ml.parse_term(x, V3) for x in v], 3) == f for v in covers.values())
assert hz(["A'B'D'", "AB'D'"], V4) == [(0, 8), (2, 10)] and hz(["B'D'"], V4) == []
# Consensus of AB and A'C is BC; of xy' and yz is xz (and the function does not change).
assert bl.equal("AB + A'C + BC", "AB + A'C", V3) and bl.equal("xy' + yz + xz", "xy' + yz", list("xyz"))

# ── Multi-output ────────────────────────────────────────────────────────────
mo = lambda fs, sh=True: ml.multi_output_cost([(f, []) for f in fs], 3, shared=sh)
assert mo([[1, 3, 7], [3, 6, 7]])[0] == (3, 10) and mo([[1, 3, 7], [3, 6, 7]], False)[0] == (4, 12)
s, ch = mo([[4, 5, 7], [1, 3, 7]])
assert s == (3, 11) and mo([[4, 5, 7], [1, 3, 7]], False)[0] == (4, 12)
abc = ml.parse_term("ABC", V3)
assert all(abc in x for x in ch) and abc not in ml.primes([4, 5, 7], [], 3) and abc not in ml.primes([1, 3, 7], [], 3)
assert mo([[1, 3, 5], [3, 6, 7], [1, 3, 7]])[0] == (4, 14) and mo([[1, 3, 5], [3, 6, 7], [1, 3, 7]], False)[0] == (6, 18)
assert mo([[1, 3, 6, 7], [4, 5, 6, 7]])[0] == (2, 6) == mo([[1, 3, 6, 7], [4, 5, 6, 7]], False)[0]

# ── PYQ keys ────────────────────────────────────────────────────────────────
B = bl.bank()
q = B["cse-2003-cs-45"]
rows = []
for line in q["text"].splitlines():
    if line.startswith("| **"):
        rows.append("".join("1" if c.strip() == "1" else "X" if c.strip() == "X" else "0" for c in line.strip("|").split("|")[1:]))
assert rows == ["X101", "01X0", "1XX0", "X00X"]
XYZW = list("xyzw")
o, d = ml.from_map(rows, "xy", "zw", XYZW)
assert (ml.min_literals_pos(o, d, 4), ml.min_literals_sop(o, d, 4)) == (9, 8)
opts = bl.option_values(q)
assert [l for l, t in opts.items() if t.replace(" ", "") == "(9,8)"] == [] and q["answer"] == "C" and opts["C"].replace(" ", "") == "(9,10)"
assert [l for l, t in opts.items() if t.replace(" ", "").startswith("(9,")] == ["B", "C"]
q = B["cse-2006-cs-38"]
W = list("wxyz")
f06 = [5, 7, 11, 12, 13, 15]
good = []
for l, t in bl.option_values(q).items():
    terms = [x.strip().replace("\\overline{w}", "w'").replace("\\overline{y}", "y'").replace("\\overline{x}", "x'").replace("\\overline{yz}", "y'z'") for x in t.strip("$").split(",\\ ")]
    cubes = [ml.parse_term(x, W) for x in terms]
    if ml.cover_fn(cubes, 4) == f06 and not ml.static1_hazards(cubes, f06):
        good.append(l)
assert good == ["D"] == [q["answer"]]
q = B["cse-2017-1-cs-21"]
o, d = ml.from_map(["0XX0", "100X", "1001", "0XX0"], "dc", "ba", list("abcd"))
assert "Row 01: 1, blank, blank, x." in q["figures"][0]["alt"]
assert msops(o, d, 4, list("abcd")) == {frozenset(["a'c"])} and ml.min_gates_lits(o, 4, "NOR", d) == 1 and str(q["answer"]) == "1"
q = B["cse-2019-cs-50"]
o = [0, 2, 5, 7, 8, 10, 13, 15]
assert msops(o, [], 4, V4) == {frozenset(["B'D'", "BD"])} and mposs(o, [], 4, V4) == {frozenset(["(B + D')", "(B' + D)"])}
assert ml.min_gates_lits(o, 4, "NOR") == 3 and str(q["answer"]) == "3"

# ── Practice ────────────────────────────────────────────────────────────────
P = ml.practice()
bl.assert_nat(P["nx-dl-03-04-q01"], ml.min_literals_pos([1, 3, 5, 6, 7], [], 3))
o = [0, 1, 4, 5, 6, 7, 14, 15]
pair = (ml.min_literals_sop(o, [], 4), ml.min_literals_pos(o, [], 4))
q = P["nx-dl-03-04-q02"]
bl.assert_mcq(q, [l for l, t in bl.option_values(q).items() if t == f"({pair[0]}, {pair[1]})"][0])
bl.assert_nat(P["nx-dl-03-04-q03"], ml.min_gates_lits(bl.minterms("AB + C'D", V4), 4, "NAND"))
bl.assert_nat(P["nx-dl-03-04-q04"], ml.min_gates_lits(bl.minterms("(A + B')(C + D)", V4), 4, "NOR"))
assert ml.min_gates_lits(bl.minterms("(A + B')(C + D)", V4), 4, "NAND") == 4
bl.assert_nat(P["nx-dl-03-04-q05"], len(hz(["A'B", "BC'", "AC"], V3)))
q = P["nx-dl-03-04-q06"]
ok = [l for l, t in bl.option_values(q).items() if not hz([x.strip() for x in t.strip("$").split("+")], V3)
      and ml.cover_fn([ml.parse_term(x.strip(), V3) for x in t.strip("$").split("+")], 3) == f]
bl.assert_mcq(q, ok[0])
assert ok == ["C"]
q = P["nx-dl-03-04-q07"]
XYZ = list("xyz")
ok = [l for l, t in bl.option_values(q).items() if bl.equal("xy' + yz + " + t.strip("$"), "xy' + yz", XYZ)
      and not hz(["xy'", "yz", t.strip("$")], XYZ)]
bl.assert_mcq(q, ok[0])
assert ok == ["C"]
bl.assert_nat(P["nx-dl-03-04-q08"], mo([[2, 3, 7], [1, 3, 5], [3, 5, 7]])[0][0])
assert mo([[2, 3, 7], [1, 3, 5], [3, 5, 7]], False)[0][0] == 6
bl.assert_nat(P["nx-dl-03-04-q09"], 3 * 2 + 3)
assert msops(bl.minterms("AB' + A'C + BC'", V3), [], 3, V3) == {frozenset(["AB'", "A'C", "BC'"]), frozenset(["A'B", "B'C", "AC'"])}
bl.assert_msq(P["nx-dl-03-04-q10"], ["A", "C"])
odd = [1, 2, 4, 7]
assert not ml.static1_hazards(ml.min_covers(odd, [], 3)[0], odd)
assert len([k for k in P if k.startswith("nx-dl-03-04-")]) == 10

print("l3_04_two_level: POS = SOP(f′) for all 3-variable functions, gate table by exhaustive search, hazard criterion = simulation (all 3-variable irredundant covers), multi-output costs, 4 PYQ keys and 10 practice answers OK")
