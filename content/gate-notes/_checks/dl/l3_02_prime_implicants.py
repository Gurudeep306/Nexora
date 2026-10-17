"""Checks for dl/03-minimisation/02-prime-implicants: the implicant criterion, the prime implicant
theorem (exhaustively, for every function of three variables), the EPI theorem, the don't-care theorem,
every worked example and scene function, all fourteen PYQ keys (every option parsed and evaluated) and
the practice answers. PIs come from Quine–McCluskey and a brute-force cube scan (they must agree);
minimal covers from Petrick's method and exhaustive search (they must agree)."""
import itertools
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import minlib as ml  # noqa: E402

L = ml.lesson_text("02-prime-implicants.md")
has = lambda *s: bl.must_contain(L, *s)
V3, V4 = list("ABC"), list("ABCD")


def T(cubes, vars_):
    return sorted(ml.term(c, vars_) for c in cubes)


def msops(ones, dcs, n, vars_):
    return {frozenset(ml.term(c, vars_) for c in cov) for cov in ml.min_covers(ones, dcs, n)}


def strip_tex(t):
    return t.replace("$", "").replace("\\,", "").replace("\\ ", " ").strip()


# ── Theorems, exhaustively for n = 3 (and with don't-cares) ─────────────────
for t in bl.all_functions(3):
    ones = [i for i, v in enumerate(t) if v]
    if not ones:
        continue
    imps = ml.implicants(ones, [], 3, need_one=False)
    # implicant criterion: p implies f iff p's cells ⊆ ones
    for c in itertools.product("01-", repeat=3):
        c = "".join(c)
        implies = all(t[m] for m in ml.cells(c))
        assert implies == (c in imps)
    # PIs suffice: the cheapest SOP over ALL implicants costs the same as the cheapest over PIs.
    best_all = None
    for k in range(1, 5):
        for comb in itertools.combinations(imps, k):
            if set().union(*(set(ml.cells(c)) for c in comb)) == set(ones):
                cst = ml.cost(comb)
                best_all = cst if best_all is None or cst < best_all else best_all
    assert best_all == ml.cost(ml.min_covers(ones, [], 3)[0])
    # EPIs are in every minimal cover (and every irredundant PI cover).
    es = set(ml.essential(ones, [], 3))
    for cov in ml.petrick(ones, ml.primes(ones, [], 3)):
        assert es <= set(cov)
# Don't-care theorem: min cover with Xs == cheapest minimal SOP over all completions (3 variables).
for vals in itertools.product("01X", repeat=8):
    if vals.count("X") not in (1, 2):
        continue
    ones = [i for i, v in enumerate(vals) if v == "1"]
    dcs = [i for i, v in enumerate(vals) if v == "X"]
    if not ones:
        continue
    best = min(ml.cost(ml.min_covers(sorted(ones + list(ex)), [], 3)[0])
               for k in range(len(dcs) + 1) for ex in itertools.combinations(dcs, k))
    assert best == ml.cost(ml.min_covers(ones, dcs, 3)[0])
# Further-depth claim: the most PIs of any 3- and 4-variable function.
def max_pis(n):
    cubes = ["".join(c) for c in itertools.product("01-", repeat=n)]
    masks = [sum(1 << m for m in ml.cells(c)) for c in cubes]
    sup = [[j for j, d in enumerate(cubes) if d != c and ml.contains(d, c)] for c in cubes]
    best = 0
    for f in range(1, 1 << (1 << n)):
        inside = {i for i, m in enumerate(masks) if m & f == m}
        best = max(best, sum(1 for i in inside if not any(j in inside for j in sup[i])))
    return best


assert max_pis(3) == 6 == len(ml.primes([1, 2, 3, 4, 5, 6], [], 3))
assert max_pis(4) == 13 == len(ml.primes([0, 2, 3, 4, 5, 7, 8, 9, 11, 13, 14], [], 4))

# ── Lesson text: ladder, counting, examples ─────────────────────────────────
XYZ = list("xyz")
f97 = bl.minterms("x' + y'x + xz", XYZ)
assert f97 == [0, 1, 2, 3, 4, 5, 7] and bl.equal("x' + y'x + xz", "x' + y' + z", XYZ)
imp = lambda term: set(ml.cells(ml.parse_term(term, XYZ))) <= set(f97)
assert imp("x'y'z'") and imp("xy'") and imp("xz") and imp("y'") and not imp("y")
assert T(ml.primes(f97, [], 3), XYZ) == sorted(["x'", "y'", "z"])
assert len(ml.implicants([0, 1, 5, 8, 12, 13], [], 4)) == 12
has("$6 + 6 = 12$ implicants")
# Viz functions.
o = [0, 1, 2, 3, 5, 7, 8, 10, 14]
ps, es, red, sel = ml.classify(o, [], 4)
assert T(ps, V4) == sorted(["A'B'", "A'D", "B'D'", "ACD'"]) and T(red, V4) == ["A'B'"]
assert msops(o, [], 4, V4) == {frozenset(["A'D", "B'D'", "ACD'"])}
o = [1, 3, 6, 7, 10, 12, 13, 14]
ps, es, red, sel = ml.classify(o, [], 4)
assert T(es, V4) == sorted(["A'B'D", "ACD'", "ABC'"]) and T(red, V4) == ["ABD'"]
assert msops(o, [], 4, V4) == {frozenset(["A'B'D", "ACD'", "ABC'", "A'BC"])} and ml.min_literals_sop(o, [], 4) == 12
# Listing PIs examples.
assert T(ml.primes([0, 1, 3, 7], [], 3), V3) == sorted(["A'B'", "A'C", "BC"]) and msops([0, 1, 3, 7], [], 3, V3) == {frozenset(["A'B'", "BC"])}
ps, es, _, _ = ml.classify([0, 1, 2, 5, 6, 7, 8, 10], [], 4)
assert len(ps) == 6 and T(es, V4) == ["B'D'"] and msops([0, 1, 2, 5, 6, 7, 8, 10], [], 4, V4) == {frozenset(["B'D'", "A'C'D", "A'BC"])}
assert {3, 9, 11} <= set(ml.cells("-0--")) and not set([3, 9, 11]) & {0, 1, 2, 5, 6, 7, 8, 10}
ps, es, red, _ = ml.classify([1, 3, 4, 6, 9, 11, 12], [0, 8, 14], 4)
assert T(ps, V4) == sorted(["B'D", "BD'", "C'D'", "B'C'"]) and T(es, V4) == sorted(["B'D", "BD'"]) and T(red, V4) == sorted(["C'D'", "B'C'"])
ps, es, _, _ = ml.classify([7], [3, 5, 15], 4)
assert T(ps, V4) == sorted(["A'CD", "A'BD", "BCD"]) and not es and len(ml.min_covers([7], [3, 5, 15], 4)) == 3
for q in ("0--1", "-1-1", "--11", "01--", "0-1-", "-11-"):
    assert 7 in ml.cells(q) and set(ml.cells(q)) - {3, 5, 7, 15}
# EPI examples.
fe = bl.minterms("ab + a'c + bc", list("abc"))
ps, es, red, _ = ml.classify(fe, [], 3)
assert fe == [1, 3, 6, 7] and T(es, list("abc")) == sorted(["ab", "a'c"]) and T(red, list("abc")) == ["bc"]
ps, es, red, _ = ml.classify([2, 3, 4, 5, 13, 15], [], 4)
assert T(ps, V4) == sorted(["A'B'C", "A'BC'", "BC'D", "ABD"]) and T(es, V4) == sorted(["A'B'C", "A'BC'", "ABD"]) and T(red, V4) == ["BC'D"]
ps, es, _, _ = ml.classify([0, 4, 8, 13], [5, 12, 15], 4)
assert T(ps, V4) == sorted(["C'D'", "BC'", "ABD"]) and T(es, V4) == ["C'D'"] and msops([0, 4, 8, 13], [5, 12, 15], 4, V4) == {frozenset(["C'D'", "BC'"])}
assert [p for p in ps if 15 in ml.cells(p)] == [ml.parse_term("ABD", V4)]
ps, es, _, _ = ml.classify([0, 1, 5, 8, 12, 13], [], 4)
assert len(ps) == 6 and not es and len(ml.min_covers([0, 1, 5, 8, 12, 13], [], 4)) == 2 and ml.min_literals_sop([0, 1, 5, 8, 12, 13], [], 4) == 9
# Cover examples.
assert msops([0, 2, 5, 7, 8, 10, 13, 15], [], 4, V4) == {frozenset(["B'D'", "BD"])}
two = [0, 2, 3, 5, 7, 10, 14]
assert msops(two, [], 4, V4) == {frozenset(["A'B'D'", "A'CD", "A'BD", "ACD'"]), frozenset(["A'B'D'", "A'B'C", "A'BD", "ACD'"])}
assert bl.minterms("A'B'D' + A'CD + A'BD + ACD'", V4) == two == bl.minterms("A'B'D' + A'B'C + A'BD + ACD'", V4)
cyc = [1, 2, 3, 4, 5, 6]
assert msops(cyc, [], 3, V3) == {frozenset(["A'C", "BC'", "AB'"]), frozenset(["A'B", "B'C", "AC'"])} and not ml.essential(cyc, [], 3)
# Don't-care examples.
assert msops([1, 3, 7, 11, 15], [0, 5], 4, V4) == {frozenset(["A'D", "CD"])} and msops([1, 3, 7, 11, 15], [], 4, V4) == {frozenset(["CD", "A'B'D"])}
assert msops([4, 5, 6, 7, 12, 13], [3, 14, 15], 4, V4) == {frozenset(["B"])}
o, d = [0, 1, 2, 3, 6, 7, 8, 10], [4, 11, 14]
assert msops(o, d, 4, V4) == {frozenset(["A'B'", "B'D'", "A'C"])} and ml.min_literals_sop(o, d, 4) == 6
pc = ml.min_pos_covers(o, d, 4)
assert len(pc) == 1 and sorted(ml.sum_term(c, V4) for c in pc[0]) == sorted(["(B' + C)", "(A' + D')"])
pf = ml.pos_fn(pc[0], 4)
assert 4 not in pf and 11 not in pf and 14 in pf and not {4, 11, 14} & set(ml.cover_fn(ml.min_covers(o, d, 4)[0], 4))
o, d = [1, 2, 4, 5, 6], [7]
sc, pcv = ml.min_covers(o, d, 3), ml.min_pos_covers(o, d, 3)
assert len(sc) == len(pcv) == 1 and ml.sop(sc[0], V3) in ("A + B'C + BC'", "A + BC' + B'C")
assert sorted(ml.sum_term(c, V3) for c in pcv[0]) == sorted(["(A + B + C)", "(B' + C')"])
assert 7 in ml.cover_fn(sc[0], 3) and 7 not in ml.pos_fn(pcv[0], 3)
assert 2 ** 6 == 64

# ── PYQ keys ────────────────────────────────────────────────────────────────
B = bl.bank()
opts = bl.option_values
W = list("wxyz")
# 1997-36.
q = B["cse-1997-a-36"]
good = []
for l, t in opts(q).items():
    t = strip_tex(t)
    term = re.search(r"([a-z\\overline{}' ]+) is", t).group(1).replace("\\overline{y}", "y'").replace(" ", "")
    cube = ml.parse_term(term, XYZ)
    cs = set(ml.cells(cube))
    if "prime implicant" in t:
        ok = cube in ml.primes(f97, [], 3)
    elif "minterm" in t:
        ok = ml.literals(cube) == 3 and cs <= set(f97)
    else:
        ok = cs <= set(f97)
    if ok:
        good.append(l)
assert good == ["C"] == [q["answer"]]
# 2004-59.
fa = bl.minterms("a'c + ac' + b'c", list("abc"))
assert fa == [1, 3, 4, 5, 6] and T(ml.essential(fa, [], 3), list("abc")) == sorted(["a'c", "ac'"]) and B["cse-2004-cs-59"]["answer"] == "A"
# it-2006-35 (rows RS, columns PQ).
P4 = list("PQRS")
q = B["it-2006-cs-35"]
assert "Row RS=00: 1 0 0 1; RS=01: 0 0 1 1; RS=11: 1 1 1 0; RS=10: 1 0 0 1" in q["figures"][0]["alt"]
o, d = ml.from_map(["1001", "0011", "1110", "1001"], "RS", "PQ", P4)
ess = {ml.term(p, P4) for p in ml.essential(o, d, 4)}
assert ess == {"Q'S'"}
assert [l for l, t in opts(q).items() if strip_tex(t) in ess] == ["D"] == [q["answer"]]
# 2015-3-43.
assert len(ml.primes([0, 2, 4, 5, 6, 10], [], 4)) == 3 and str(B["cse-2015-3-cs-43"]["answer"]) == "3"
# 2018-49.
o, d = [0, 2, 5, 7, 9, 11], [3, 8, 10, 12, 14]
assert len(ml.essential(o, d, 4)) == 3 and str(B["cse-2018-cs-49"]["answer"]) == "3"
assert len(ml.primes(o, d, 4)) == 5
# 1991.
assert msops([0, 2, 8, 10, 15], [3, 11, 12, 14], 4, V4) == {frozenset(["B'D'", "AC"])}
assert bl.equal(strip_tex(B["cse-1991-b-5-b"]["answer"]).replace("f =", ""), "B'D' + AC", V4)


def eq_letters(q, ones, dcs, vars_):
    out = []
    for l, t in opts(q).items():
        try:
            fo = bl.minterms(strip_tex(t).replace("f =", ""), vars_)
        except (ValueError, AssertionError):
            continue
        if ml.agrees(fo, ones, dcs, len(vars_)):
            out.append(l)
    return out


def minimal_letters(q, ones, dcs, vars_):
    best = ml.min_literals_sop(ones, dcs, len(vars_))
    out = []
    for l in eq_letters(q, ones, dcs, vars_):
        e = strip_tex(opts(q)[l]).replace("f =", "")
        lits = sum(1 for k, _ in bl.tokens(e) if k == "var")
        if lits == best and "(" not in e:
            out.append(l)
    return out


# 1999 (rows AB, columns CD).
q = B["cse-1999-a-8"]
o, d = ml.from_map(["0010", "XX1X", "0110", "0110"], "AB", "CD", V4)
assert eq_letters(q, o, d, V4) == ["B"] == [q["answer"]]
# 2001 (rows yz, columns wx).
q = B["cse-2001-a-11"]
o, d = ml.from_map(["0X0X", "X1X1", "0X10", "01X0"], "yz", "wx", W)
assert eq_letters(q, o, d, W) == ["A", "B", "C"] and minimal_letters(q, o, d, W) == ["A"] == [q["answer"]]
assert not ml.essential(o, d, 4) and len(ml.min_covers(o, d, 4)) == 1
# 2002 (rows yz, columns wx).
q = B["cse-2002-a-12"]
assert "Row yz=00: 0 1 1 0; row 01: x 0 0 1; row 11: x 0 0 1; row 10: 0 1 1 x" in q["figures"][0]["alt"]
o, d = ml.from_map(["0110", "X001", "X001", "011X"], "yz", "wx", W)
assert eq_letters(q, o, d, W) == ["B"] == [q["answer"]] and msops(o, d, 4, W) == {frozenset(["x'z", "xz'"])}
# 2008 (rows cd, columns ab).
ab = list("abcd")
q = B["cse-2008-cs-5"]
o, d = ml.from_map(["1101", "X000", "X000", "110X"], "cd", "ab", ab)
assert eq_letters(q, o, d, ab) == ["A", "B", "D"] and minimal_letters(q, o, d, ab) == ["A"] == [q["answer"]]
# 2012 (rows cd, columns ab).
q = B["cse-2012-cs-30"]
o, d = ml.from_map(["1XX1", "X001", "0000", "100X"], "cd", "ab", ab)
assert eq_letters(q, o, d, ab) == ["B", "C", "D"] and minimal_letters(q, o, d, ab) == ["B"] == [q["answer"]]
# 2014-3.
q = B["cse-2014-3-cs-7"]
o, d = [0, 5, 10, 15], [2, 7, 8, 13]
assert eq_letters(q, o, d, P4) == ["B", "C", "D"] and minimal_letters(q, o, d, P4) == ["B"] == [q["answer"]]
# 2017-2 (POS).
q = B["cse-2017-2-cs-28"]
o, d = [0, 1, 2, 3, 7, 8, 10], [5, 6, 11, 15]
assert eq_letters(q, o, d, W) == ["A"] == [q["answer"]] and ml.min_literals_pos(o, d, 4) == 4
assert {frozenset(ml.sum_term(c, W) for c in cov) for cov in ml.min_pos_covers(o, d, 4)} == {frozenset(["(x' + z)", "(w' + z')"])}
# 2026-1 (MSQ: minimal SOPs).
q = B["cse-2026-1-cs-38"]
o = [1, 2, 3, 4, 5, 7, 10, 12, 13, 14]
assert eq_letters(q, o, [], P4) == ["B", "D"] and minimal_letters(q, o, [], P4) == ["B", "D"] == bl.key_letters(q["answer"])
assert len(ml.min_covers(o, [], 4)) == 3

# ── Practice ────────────────────────────────────────────────────────────────
P = ml.practice()
bl.assert_nat(P["nx-dl-03-02-q01"], len(ml.primes([0, 1, 2, 5, 6, 7], [], 3)))
assert not ml.essential([0, 1, 2, 5, 6, 7], [], 3)
o, d = [1, 4, 5, 6, 7, 9, 14], [3, 15]
bl.assert_nat(P["nx-dl-03-02-q02"], len(ml.essential(o, d, 4)))
assert T(ml.primes(o, d, 4), V4) == sorted(["A'B", "BC", "A'D", "B'C'D"]) and T(ml.classify(o, d, 4)[2], V4) == ["A'D"]
q = P["nx-dl-03-02-q03"]
es = {ml.term(p, V4) for p in ml.essential(two, [], 4)}
bl.assert_mcq(q, [l for l, t in opts(q).items() if strip_tex(t) in es][0])
assert [l for l, t in opts(q).items() if strip_tex(t) in es] == ["A"]
q = P["nx-dl-03-02-q04"]
fx = bl.minterms("x'y + xz", XYZ)
pis = ml.primes(fx, [], 3)
truth = {"A": set(ml.cells(ml.parse_term("x'yz", XYZ))) <= set(fx),
         "B": ml.parse_term("yz", XYZ) in pis,
         "C": ml.parse_term("yz", XYZ) in ml.essential(fx, [], 3),
         "D": set(ml.cells(ml.parse_term("x'z", XYZ))) <= set(fx)}
bl.assert_msq(q, sorted(k for k, v in truth.items() if v))
q = P["nx-dl-03-02-q05"]
o, d = [1, 2, 5, 6, 9], list(range(10, 16))
assert eq_letters(q, o, d, V4) == ["A", "B", "C"] and minimal_letters(q, o, d, V4) == ["A"]
assert msops(o, [], 4, V4) == {frozenset(["A'C'D", "A'CD'", "B'C'D"])} or ml.min_literals_sop(o, [], 4) == 9
bl.assert_mcq(q, "A")
o = [0, 2, 3, 4, 5, 8, 11, 13]
bl.assert_nat(P["nx-dl-03-02-q06"], len(ml.min_covers(o, [], 4)))
assert ml.min_literals_sop(o, [], 4) == 15
q = P["nx-dl-03-02-q07"]
mlist = lambda t: sorted(map(int, re.findall(r"\d+", re.search(r"m\(([^)]*)\)", t).group(1))))
cyc_letters = [l for l, t in opts(q).items() if ml.primes(mlist(t), [], 3) and not ml.essential(mlist(t), [], 3)]
bl.assert_mcq(q, cyc_letters[0])
assert cyc_letters == ["A"]
q = P["nx-dl-03-02-q08"]
o, d = [1, 3, 5, 7, 9], [6, 12, 13]
pos_ok = [l for l, t in opts(q).items() if "(" in t and ml.agrees(bl.minterms(strip_tex(t), V4), o, d, 4)]
assert pos_ok == ["A", "C"] or pos_ok == ["A"]
lits = {l: sum(1 for k, _ in bl.tokens(strip_tex(opts(q)[l])) if k == "var") for l in pos_ok}
assert ml.min_literals_pos(o, d, 4) == 3 and min(lits, key=lits.get) == "A"
assert not ml.agrees(bl.minterms("D(A + C)", V4), o, d, 4)
pf = ml.pos_fn(ml.min_pos_covers(o, d, 4)[0], 4)
assert 6 not in pf and 12 not in pf and 13 in pf
bl.assert_mcq(q, "A")
bl.assert_nat(P["nx-dl-03-02-q09"], 2 ** 4)
q = P["nx-dl-03-02-q10"]
o, d = [0, 1, 3, 7, 8, 9], [2, 5, 13]
red = {ml.term(p, V4) for p in ml.classify(o, d, 4)[2]}
assert red == {"A'B'", "C'D"}
bl.assert_msq(q, sorted(l for l, t in opts(q).items() if strip_tex(t) in red))
assert len([k for k in P if k.startswith("nx-dl-03-02-")]) == 10

print("l3_02_prime_implicants: implicant/PI/EPI/don't-care theorems (all 3-variable functions), max PIs 6 and 13, examples, 14 PYQ keys and 10 practice answers OK")
