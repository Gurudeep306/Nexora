"""Checks for dl/03-minimisation/01-kmaps: map layout and adjacency, the group theorem, every worked
example (SOP, POS, reading maps, patterns, free variables, counting), all twenty PYQ keys (every option
of every MCQ/MSQ is parsed and evaluated) and the practice answers.

Minimal forms come from minlib (Quine–McCluskey = brute-force PI scan, Petrick = exhaustive cover
search); sympy's simplify_logic is an independent cross-check of the minimal SOPs."""
import pathlib
import re
import sys
from itertools import product

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import minlib as ml  # noqa: E402

L = ml.lesson_text("01-kmaps.md")
has = lambda *s: bl.must_contain(L, *s)
V3, V4 = list("ABC"), list("ABCD")
G2 = ["00", "01", "11", "10"]


def from_map(rows, row_vars, col_vars, vars_, row_labels=G2, col_labels=G2):
    """(ones, dcs) of a printed map given as strings of '1'/'0'/'X' per row."""
    ones, dcs = [], []
    for r, rl in enumerate(row_labels):
        for c, cl in enumerate(col_labels):
            env = dict(zip(row_vars, rl))
            env.update(zip(col_vars, cl))
            m = int("".join(env[x] for x in vars_), 2)
            v = rows[r][c]
            if v == "1":
                ones.append(m)
            elif v in "Xx×":
                dcs.append(m)
    return sorted(ones), sorted(dcs)


def table_rows(text):
    """Cell values of the first markdown table in a question text, as '1'/'0'/'X' strings."""
    rows = []
    for line in text.splitlines():
        if line.startswith("|") and not set(line) <= set("|-: "):
            cells = [c.strip().replace("*", "") for c in line.strip("|").split("|")]
            rows.append(cells)
    body = rows[1:]
    out = []
    for r in body:
        out.append("".join("1" if c == "1" else "X" if c in ("X", "x", "×") else "0" for c in r[1:]))
    return out


def sop_set(cover, n):
    return ml.cover_fn(cover, n)


def minimal_sops(ones, dcs, n, vars_):
    return {frozenset(ml.term(c, vars_) for c in cov) for cov in ml.min_covers(ones, dcs, n)}


def terms_of(expr):
    return frozenset(t.strip() for t in expr.split("+"))


def sympy_min_literals(ones, vars_, dcs=()):
    import sympy
    syms = sympy.symbols(" ".join(vars_))
    e = sympy.SOPform(syms, [list(map(int, format(m, f"0{len(vars_)}b"))) for m in ones],
                      [list(map(int, format(m, f"0{len(vars_)}b"))) for m in dcs])
    args = e.args if isinstance(e, sympy.Or) else (e,)
    return sum(len(a.args) if isinstance(a, sympy.And) else 1 for a in args)


# ── Layout, adjacency, groups ───────────────────────────────────────────────
assert ml.gray(2) == [0, 1, 3, 2]
rows = [[ml.rc_minterm(r, c, 4) for c in range(4)] for r in range(4)]
assert rows == [[0, 1, 3, 2], [4, 5, 7, 6], [12, 13, 15, 14], [8, 9, 11, 10]]
assert [[ml.rc_minterm(r, c, 3) for c in range(4)] for r in range(2)] == [[0, 1, 3, 2], [4, 5, 7, 6]]
has("0 1 3 2 / 4 5 7 6 / 12 13 15 14 / 8 9 11 10", "0 1 3 2 / 4 5 7 6")
# Trick: swap the last two of every row, then the last two rows.
cnt = [[4 * r + c for c in range(4)] for r in range(4)]
sw = [[row[0], row[1], row[3], row[2]] for row in cnt]
sw = [sw[0], sw[1], sw[3], sw[2]]
assert sw == rows
assert int("1110", 2) == 14 and ml.cell_rc(14, 4) == (2, 3)
# Adjacency theorem: map neighbours (with wrap) == one-bit neighbours, for n = 2, 3, 4.
for n in (2, 3, 4):
    rb, cb = ml.layout(n)
    R, C = 2 ** rb, 2 ** cb
    for m in range(2 ** n):
        r, c = ml.cell_rc(m, n)
        mapn = set()
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (dr and R > 1) or (dc and C > 1):
                mapn.add(ml.rc_minterm((r + dr) % R, (c + dc) % C, n))
        mapn.discard(m)
        assert mapn == set(ml.map_neighbours(m, n)), (n, m)
        assert len(mapn) == n
# Group theorem: every legal rectangle (power-of-two sides, cyclic) is exactly one cube's cells.
for n in (3, 4):
    rb, cb = ml.layout(n)
    R, C = 2 ** rb, 2 ** cb
    cubes = {frozenset(ml.cells("".join(c))) for c in product("01-", repeat=n)}
    for h in (1, 2, 4):
        for w in (1, 2, 4):
            if h > R or w > C:
                continue
            for r0 in range(R):
                for c0 in range(C):
                    cs = frozenset(ml.rc_minterm((r0 + i) % R, (c0 + j) % C, n) for i in range(h) for j in range(w))
                    assert cs in cubes, (n, h, w, r0, c0)
                    cube = next("".join(c) for c in product("01-", repeat=n) if frozenset(ml.cells("".join(c))) == cs)
                    assert ml.literals(cube) == n - (h * w).bit_length() + 1
# Corners, reading a group.
assert ml.cells("-0-0") == [0, 2, 8, 10] and ml.adjacent(0, 8) and ml.adjacent(0, 2) and not ml.adjacent(0, 10)
assert ml.term("-1-0", V4) == "BD'" and ml.cells("-1-0") == [4, 6, 12, 14]
assert ml.parse_term("A'BC'D", V4) == "0101" and ml.cells("01-1") == [5, 7] and ml.term("01-1", V4) == "A'BD"
assert ml.cells("---0")[:4] == [0, 2, 4, 6] and len(ml.cells("---0")) == 8
has("$m_8$ (1000) on the bottom-left", "$m_5, m_9, m_{12}, m_{15}$")
assert ml.map_neighbours(13, 4) == [5, 9, 12, 15] and ml.map_neighbours(8, 4) == [0, 9, 10, 12]
# Worked examples: layout.
assert [ml.cell_rc(m, 3) for m in (1, 4, 6)] == [(0, 1), (1, 0), (1, 3)]
assert not ml.adjacent(1, 2)

# ── SOP examples and the viz function ───────────────────────────────────────
assert ml.min_sop([0, 2, 3, 6, 7], [], 3, V3) == ["A'C' + B"] or minimal_sops([0, 2, 3, 6, 7], [], 3, V3) == {frozenset(["B", "A'C'"])}
assert minimal_sops([0, 1, 2, 4, 5, 6, 8, 9, 12, 13, 14], [], 4, V4) == {frozenset(["C'", "A'D'", "BD'"])}
assert minimal_sops([0, 2, 4, 8, 10, 11, 12], [], 4, V4) == {frozenset(["C'D'", "B'D'", "AB'C"])}
assert [m for m in ml.map_neighbours(11, 4) if m in (0, 2, 4, 8, 10, 11, 12)] == [10]
centre = [1, 5, 6, 7, 11, 12, 13, 15]
ps, es, red, sel = ml.classify(centre, [], 4)
assert red == ["-1-1"] and len(es) == 4
assert minimal_sops(centre, [], 4, V4) == {frozenset(["A'C'D", "A'BC", "ACD", "ABC'"])} and ml.min_literals_sop(centre, [], 4) == 12
assert all(sum(1 for x in ml.map_neighbours(m, 4) if x in centre) == 1 for m in (1, 6, 11, 12))
for ones in ([0, 2, 3, 6, 7], [0, 1, 2, 4, 5, 6, 8, 9, 12, 13, 14], centre):
    n = 3 if max(ones) < 8 else 4
    assert sympy_min_literals(ones, (V3 if n == 3 else V4)) == ml.min_literals_sop(ones, [], n)
has("$f = B + A'C'$ (3 literals)", "$f = C' + A'D' + BD'$ (5 literals)", "$f = C'D' + B'D' + AB'C$ (7 literals)",
    "$f = A'C'D + A'BC + ACD + ABC'$ (12 literals)")

# ── POS ─────────────────────────────────────────────────────────────────────
def pos_strs(ones, dcs, n, vars_):
    return {frozenset(ml.sum_term(c, vars_) for c in cov) for cov in ml.min_pos_covers(ones, dcs, n)}


z = [0, 1, 4]
f3 = ml.zeros_of(z, [], 3)
assert pos_strs(f3, [], 3, V3) == {frozenset(["(A + B)", "(B + C)"])} and 2 in f3
assert bl.tt("(A + B)(B + C)", V3) == bl.from_minterms(f3, 3)
f4 = ml.zeros_of([0, 2, 8, 9, 10, 11, 13, 15], [], 4)
assert f4 == [1, 3, 4, 5, 6, 7, 12, 14]
assert pos_strs(f4, [], 4, V4) == {frozenset(["(B + D)", "(A' + D')"])} and minimal_sops(f4, [], 4, V4) == {frozenset(["A'D", "BD'"])}
f11 = bl.minterms("(P + Q' + R')(P + Q' + R)(P + Q + R')", list("PQR"))
assert f11 == [0, 4, 5, 6, 7] and minimal_sops(f11, [], 3, list("PQR")) == {frozenset(["P", "Q'R'"])}
f14 = bl.minterms("PQ + P'QR + P'QR'S", list("PQRS"))
assert f14 == [5, 6, 7, 12, 13, 14, 15]
assert minimal_sops(f14, [], 4, list("PQRS")) == {frozenset(["PQ", "QR", "QS"])} and ml.min_literals_sop(f14, [], 4) == 6
assert pos_strs(f14, [], 4, list("PQRS")) == {frozenset(["(Q)", "(P + R + S)"])} and ml.min_literals_pos(f14, [], 4) == 4
assert bl.equal("Q(P + R)", "PQ + P'QR", list("PQRS")) and bl.equal("Q(P + R + S)", "PQ + QR + QS", list("PQRS"))
# POS from the complement: for every 3-variable function the POS literal count = SOP literal count of f'.
for t in bl.all_functions(3):
    ones = [i for i, v in enumerate(t) if v]
    if 0 < len(ones) < 8:
        assert ml.min_literals_pos(ones, [], 3) == ml.min_literals_sop(ml.zeros_of(ones, [], 3), [], 3)
        for cov in ml.min_pos_covers(ones, [], 3):
            assert ml.pos_fn(cov, 3) == ones

# ── Reading maps and patterns ───────────────────────────────────────────────
o, _ = from_map(["1001", "0110", "0110", "1001"], "CD", "AB", V4)
assert minimal_sops(o, [], 4, V4) == {frozenset(["B'D'", "BD"])}
assert [a * 4 + int(bc, 2) for a in (0, 1) for bc, v in zip(["00", "01", "10", "11"], "1001") if v == "1"] == [0, 3, 4, 7]
assert minimal_sops([0, 3, 4, 7], [], 3, V3) == {frozenset(["B'C'", "BC"])}
odd = [m for m in range(16) if bin(m).count("1") % 2]
assert odd == [1, 2, 4, 7, 8, 11, 13, 14] and ml.min_literals_sop(odd, [], 4) == 32
for n in (2, 3, 4):
    par = [m for m in range(2 ** n) if bin(m).count("1") % 2]
    assert all(ml.literals(p) == n for p in ml.primes(par, [], n)) and len(par) == 2 ** (n - 1)
it78 = bl.minterms("ad' + a'c' + bc'd", list("abcd"))
assert it78 == [0, 1, 4, 5, 8, 10, 12, 13, 14]
assert ml.cells("1--0") == [8, 10, 12, 14] and ml.cells("0-0-") == [0, 1, 4, 5] and ml.cells("-101") == [5, 13]
assert bl.equal("B'D' + BD", "(B \\oplus D)'", V4) and bl.equal("(B + D')(B' + D)", "(B \\oplus D)'", V4)
assert bl.equal("(B + D)(B' + D')", "B \\oplus D", V4) and bl.equal("BD' + B'D", "B \\oplus D", V4)

# ── Free variables, equality, counting, conditions ──────────────────────────
f = [1, 3, 9, 11]
assert ml.depends(f, 4) == [1, 3] and minimal_sops(f, [], 4, V4) == {frozenset(["B'D"])}
assert ml.depends([1, 3, 4, 6, 9, 11, 12, 14], 4) == [1, 3]
fe = bl.minterms("AB + A'C + BC", V3)
assert fe == [1, 3, 6, 7] and bl.minterms("AB + A'C", V3) == fe
assert bl.minterms("AB + BC", V3) == [3, 6, 7] and bl.minterms("A'C + BC + AB'", V3) == [1, 3, 4, 5, 7]
assert bl.minterms("(A'B + C)'", V3) == [0, 4, 6] and bl.minterms("A'B + C", V3) == [1, 2, 3, 5, 7]
assert bl.equal("(A'B + C)'", "(A + B')C'", V3)
# Conditions example: f(0, B, C) = B + C, f(1, 1, C) = C'; m4, m5 free.
ones = [m for m in range(8) if (m < 4 and ((m >> 1) & 1 or m & 1)) or m == 6]
assert ones == [1, 2, 3, 6]
assert minimal_sops(ones, [4, 5], 3, V3) == {frozenset(["A'C", "BC'"])} and ml.min_literals_sop(ones, [4, 5], 3) == 4
for extra in ([4], [5], [4, 5]):
    assert ml.min_literals_sop(sorted(ones + extra), [], 3) == 6 and len(ml.min_covers(sorted(ones + extra), [], 3)[0]) == 3
# Algebra: GATE 2014 by algebra.
assert bl.equal("PQ + P'QR", "Q(P + R)", list("PQRS")) and bl.equal("Q(P + R) + P'QR'S", "Q(P + R + S)", list("PQRS"))

# ── PYQ keys ────────────────────────────────────────────────────────────────
B = bl.bank()


def opts(q):
    return bl.option_values(q)


def strip_tex(t):
    return t.replace("$", "").replace("\\,", "").replace("\\ ", " ").replace("\\cdot", "").strip()


def eq_letters(q, ones, dcs, vars_, exact=False):
    out = []
    for l, t in opts(q).items():
        try:
            fo = bl.minterms(strip_tex(t), vars_)
        except (ValueError, AssertionError):
            continue
        ok = (fo == sorted(ones)) if exact else ml.agrees(fo, ones, dcs, len(vars_))
        if ok:
            out.append(l)
    return out


# 1995: map figure (rows CD, columns AB), the descriptive answer BD + B'D'.
q = B["cse-1995-b-63-b"]
assert "row CD=00 columns AB=00 and 10" in q["figures"][0]["alt"]
o, d = from_map(["1001", "0110", "0110", "1001"], "CD", "AB", V4)
assert minimal_sops(o, d, 4, V4) == {frozenset(["B'D'", "BD"])} and bl.equal(strip_tex(q["answer"]), "BD + B'D'", V4)
# 1996: POS of the complementary map.
q = B["cse-1996-a-49"]
o, d = from_map(["0110", "1001", "1001", "0110"], "CD", "AB", V4)
assert pos_strs(o, d, 4, V4) == {frozenset(["(B + D)", "(B' + D')"])}
assert eq_letters(q, o, d, V4) == ["A", "C"] and q["answer"] == "C"  # A is equal but is an SOP
# 1997-71 (a), (b).
q = B["cse-1997-b-71-a"]
f97 = bl.minterms(strip_tex(q["text"].split("f=")[1].split("$")[0]), list("wxyz"))
assert f97 == [0, 1, 2, 3, 7, 11, 15] and minimal_sops(f97, [], 4, list("wxyz")) == {frozenset(["w'x'", "yz"])}
assert bl.equal(strip_tex(q["answer"]).replace("f=", ""), "w'x' + yz", list("wxyz"))
assert len(f97) == 7 and str(B["cse-1997-b-71-b"]["answer"]) == "7"
# 1998: binary-labelled map.
q = B["cse-1998-a-42"]
assert table_rows(q["text"]) == ["1001", "1001"]
o, d = from_map(table_rows(q["text"]), "A", "BC", V3, ["0", "1"], ["00", "01", "10", "11"])
assert o == [0, 3, 4, 7] and eq_letters(q, o, d, V3, exact=True) == ["C"] == [q["answer"]]
# 2000: which does NOT implement the map (rows xy, columns wz); all three agree, so "none".
q = B["cse-2000-a-2-11"]
o, d = from_map(table_rows(q["text"]), "xy", "wz", list("wxyz"))
assert (o, d) == ([6, 7, 10, 11, 14, 15], [1, 3, 5])
assert eq_letters(q, o, d, list("wxyz")) == ["A", "B", "C"] and q["answer"] == "D"
# it-2004 (repaired text): Σ(1, 3, 4, 5, 6).
q = B["it-2004-it-44"]
fit = bl.minterms(strip_tex(q["text"].split("function ")[1].split(" is")[0]), V3)
assert fit == [1, 3, 4, 5, 6] and eq_letters(q, fit, [], V3, exact=True) == ["B"] == [q["answer"]]
assert minimal_sops(fit, [], 3, V3) == {frozenset(["A'C", "AC'", "B'C"]), frozenset(["A'C", "AC'", "AB'"])}
# The reprint's duplicated term (AB'C twice) gives Σ(1, 3, 5, 6), which no option equals.
assert bl.minterms("AB'C + A'BC + ABC' + A'B'C + AB'C", V3) == [1, 3, 5, 6]
# 2005.
q = B["cse-2005-cs-18"]
o = [1, 4, 5, 9, 11, 12]
assert eq_letters(q, o, [], V4, exact=True) == ["A"] == [q["answer"]] and ml.min_literals_sop(o, [], 4) == 9
# 2007-32: which are NOT equivalent (P, Q, R, S in the stem).
q = B["cse-2007-cs-32"]
o = [0, 4, 5, 7, 8, 9, 13, 15]
stmts = dict(re.findall(r"\((P|Q|R|S)\) \$([^$]+)\$", q["text"]))
noneq = sorted(k for k, e in stmts.items() if bl.minterms(e, list("wxyz")) != o)
assert noneq == ["S"] and opts(q)[q["answer"]] == "S only"
# 2007-9 and it-2008-8: independence.
assert ml.depends([1, 3, 4, 6, 9, 11, 12, 14], 4) == [1, 3] and B["cse-2007-cs-9"]["answer"] == "B"
assert ml.depends([2, 3, 6, 7, 8, 9, 10, 11, 12, 13], 4) == [0, 1, 2] and B["it-2008-it-8"]["answer"] == "A"
# it-2007-78 (option maps from the figure alts) and 79.
q = B["it-2007-cs-78"]
optmaps = {"A": ["1100", "1100", "1101", "1001"], "B": ["1100", "1000", "1101", "1101"], "C": ["1100", "1101", "1101", "1001"], "D": ["1100", "1100", "1101", "1011"]}
assert "ā b → c̄d̄, c̄d;" in q["figures"][0]["alt"]
good = [l for l, rws in optmaps.items() if from_map(rws, "ab", "cd", list("abcd"))[0] == it78]
assert good == ["A"] == [q["answer"]]
q = B["it-2007-cs-79"]
bad = [l for l, t in opts(q).items() if bl.minterms(strip_tex(t), list("abcd")) != it78]
assert bad == ["C"] == [q["answer"]]
# 2011, 2014-1.
assert eq_letters(B["cse-2011-cs-14"], f11, [], list("PQR"), exact=True) == ["B"] == [B["cse-2011-cs-14"]["answer"]]
assert eq_letters(B["cse-2014-1-cs-7"], f14, [], list("PQRS"), exact=True) == ["A"] == [B["cse-2014-1-cs-7"]["answer"]]
# 2015-2-37: one minterm.
f15 = bl.minterms("(D' + AB' + A'C + AC'D + A'C'D)'", V4)
assert f15 == [15] and str(B["cse-2015-2-cs-37"]["answer"]) == "1"
# 2021-2-52: brute force over all 2^16 functions satisfying the three conditions.
sols = []
for t in product((0, 1), repeat=16):
    ok = all(not (((m >> 2) & 1) == 0 and ((m >> 1) & 1) == 0) or t[m] == 1 for m in range(16))
    ok = ok and all(not ((m >> 3) & 1 and (m >> 1) & 1) or t[m] == (((m >> 2) & 1) | (m & 1)) for m in range(16))
    ok = ok and all(not ((m >> 2) & 1) or t[m] == ((((m >> 3) & 1) & (m & 1)) | ((m >> 1) & 1)) for m in range(16))
    if ok:
        sols.append(t)
free = [m for m in range(16) if len({s[m] for s in sols}) > 1]
assert len(sols) == 4 and free == [2, 3]
fixed1 = [m for m in range(16) if m not in free and sols[0][m]]
assert fixed1 == [0, 1, 6, 7, 8, 9, 11, 13, 14, 15]
assert minimal_sops(fixed1, free, 4, list("wxyz")) == {frozenset(["x'y'", "xy", "wz"])} and ml.min_literals_sop(fixed1, free, 4) == 6
assert sorted(ml.min_literals_sop([m for m in range(16) if s[m]], [], 4) for s in sols) == [6, 8, 8, 9]
assert B["cse-2021-2-cs-52"]["answer"] in ("6 to 6", 6, "6")
# 2025-1, 2025-2, 2026-2.
B3 = ["b3", "b2", "b1", "b0"]
assert eq_letters(B["cse-2025-1-cs-32"], [0, 2, 4, 8, 10, 11, 12], [], B3, exact=True) == ["A"] == [B["cse-2025-1-cs-32"]["answer"]]
q = B["cse-2025-2-cs-33"]
o, d = from_map(["1001", "0110", "0110", "1001"], "wx", "yz", list("wxyz"))
assert "Row 1: 1 0 0 1. Row 2: 0 1 1 0." in q["figures"][0]["alt"]
assert eq_letters(q, o, d, list("wxyz"), exact=True) == ["A", "D"] and bl.key_letters(q["answer"]) == ["A", "D"]
assert minimal_sops([0, 1, 2, 3, 8, 9, 10, 11], [], 4, V4) == {frozenset(["B'"])} and B["cse-2026-2-cs-30"]["answer"] == "B"

# ── Practice ────────────────────────────────────────────────────────────────
P = ml.practice()


def letters_equal(q, ones, vars_, dcs=()):
    return eq_letters(q, ones, list(dcs), vars_, exact=not dcs)


q = P["nx-dl-03-01-q01"]
o = [1, 3, 5, 6, 7]
assert minimal_sops(o, [], 3, V3) == {frozenset(["C", "AB"])}
assert letters_equal(q, o, V3) == ["A", "B"]  # B is equal but not minimal
bl.assert_mcq(q, "A")
assert bl.minterms("C + AC'", V3) == [1, 3, 4, 5, 6, 7]
bl.assert_nat(P["nx-dl-03-01-q02"], ml.rc_minterm(2, 3, 4))
q = P["nx-dl-03-01-q03"]
bl.assert_msq(q, sorted(l for l, t in opts(q).items() if int(re.search(r"\d+", t).group()) in ml.map_neighbours(10, 4)))
q = P["nx-dl-03-01-q04"]
o = [0, 1, 2, 3, 4, 6, 8, 9, 10, 11]
assert pos_strs(o, [], 4, V4) == {frozenset(["(A' + B')", "(B' + D')"])}
assert minimal_sops(o, [], 4, V4) == {frozenset(["B'", "A'D'"])}
assert [l for l, t in opts(q).items() if bl.minterms(strip_tex(t), V4) == o] == ["A"]
assert bl.minterms("A'B' + B'D'", V4) == [0, 1, 2, 3, 8, 10]
bl.assert_mcq(q, "A")
bl.assert_nat(P["nx-dl-03-01-q05"], len(ml.cells("-0-0-")))
q = P["nx-dl-03-01-q06"]
grid = table_rows(q["text"])
assert grid == ["0001", "0000", "1100", "1101"]
o, _ = from_map(grid, "CD", "AB", V4)
assert o == [2, 3, 6, 7, 8, 10] and minimal_sops(o, [], 4, V4) == {frozenset(["A'C", "AB'D'"])}
mis = sorted(int(G2[r] + G2[c], 2) for r in range(4) for c in range(4) if grid[r][c] == "1")
assert minimal_sops(mis, [], 4, V4) == {frozenset(["AC'", "B'CD'"])}
assert [l for l, t in opts(q).items() if bl.minterms(strip_tex(t), V4) == o] == ["A"]
assert 0 in bl.minterms("A'C + B'D'", V4)
bl.assert_mcq(q, "A")
q = P["nx-dl-03-01-q07"]
assert ml.depends([0, 2, 5, 7, 8, 10, 13, 15], 4) == [1, 3]
bl.assert_mcq(q, "A")
q = P["nx-dl-03-01-q08"]
bl.assert_msq(q, letters_equal(q, [0, 1, 3, 7], V3))
q = P["nx-dl-03-01-q09"]
bl.assert_nat(q, len(bl.minterms("AB + CD + A'B'", V4)))
q = P["nx-dl-03-01-q10"]
printed_rows = ["00", "01", "10", "11"]
o = sorted(int(printed_rows[r] + G2[c], 2) for r in (0, 3) for c in (0, 3))
assert o == [0, 2, 12, 14] and minimal_sops(o, [], 4, V4) == {frozenset(["A'B'D'", "ABD'"])}
assert [l for l, t in opts(q).items() if bl.minterms(strip_tex(t), V4) == o] == ["B"]
assert bl.minterms("B'D'", V4) == [0, 2, 8, 10] and bl.minterms("A'D' + AD'", V4) == bl.minterms("D'", V4)
bl.assert_mcq(q, "B")
assert len([k for k in P if k.startswith("nx-dl-03-01-")]) == 10

print("l3_01_kmaps: layout, adjacency (all cells, n = 2–4), group theorem (all rectangles), examples, 20 PYQ keys and 10 practice answers OK")
