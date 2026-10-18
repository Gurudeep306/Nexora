"""Checks for dl/03-minimisation/03-tabular-method: the Quine–McCluskey theorems (weight rule,
correctness: unticked = prime, over every 4-variable function with and without don't-cares on a sample),
dominance and Petrick (every irredundant cover, against an exhaustive search), the five- and six-variable
examples, VEMs (Shannon residues), every worked example, the 1992 PYQ key and the practice answers."""
import itertools
import pathlib
import random
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import minlib as ml  # noqa: E402

L = ml.lesson_text("03-tabular-method.md")
has = lambda *s: bl.must_contain(L, *s)
V3, V4, V5 = list("ABC"), list("ABCD"), list("ABCDE")


def T(cubes, vars_):
    return sorted(ml.term(c, vars_) for c in cubes)


def msops(ones, dcs, n, vars_):
    return {frozenset(ml.term(c, vars_) for c in cov) for cov in ml.min_covers(ones, dcs, n)}


def strip_tex(t):
    return t.replace("$", "").replace("\\,", "").strip()


# ── Q–M theorems ────────────────────────────────────────────────────────────
# Weight rule: combinable cubes differ in weight by exactly 1 (all pairs of 3-variable cubes).
cubes3 = ["".join(c) for c in itertools.product("01-", repeat=3)]
for a in cubes3:
    for b in cubes3:
        if ml._combine(a, b):
            assert abs(a.count("1") - b.count("1")) == 1
assert not ml._combine("0011", "0100") and abs("0011".count("1") - "0100".count("1")) == 1
# Correctness: unticked == primes (brute force), for every 3-variable function and a 4-variable sample with Xs.
for t in bl.all_functions(3):
    ones = [i for i, v in enumerate(t) if v]
    if ones:
        _, ps = ml.qm(ones, [], 3)
        assert ps == ml.primes_brute(ones, [], 3)
rnd = random.Random(31)
for _ in range(400):
    vals = [rnd.choice("01X") for _ in range(16)]
    ones = [i for i, v in enumerate(vals) if v == "1"]
    dcs = [i for i, v in enumerate(vals) if v == "X"]
    if not ones:
        continue
    rounds, ps = ml.qm(ones, dcs, 4)
    # every implicant of ones ∪ dcs appears in the table, in the round of its size
    listed = {c for r in rounds for c, _ in r}
    assert set(ml.implicants(ones, dcs, 4, need_one=False)) == listed
    # ticked iff contained in a larger implicant
    for r in rounds:
        for c, used in r:
            assert used == any(d != c and ml.contains(d, c) for d in listed)
# Trick: minterms a < b combine iff b − a is a power of two and a & (b − a) == 0.
for a in range(16):
    for b in range(a + 1, 16):
        d = b - a
        assert (ml._combine(ml.cube_of(a, 4), ml.cube_of(b, 4)) is not None) == ((d & (d - 1)) == 0 and (a & d) == 0)
assert ml._combine("0101", "0111") == "01-1" and ml._combine("0011", "0101") is None
assert ml._combine("010-", "-010") is None
assert set(ml.cells("010-")) | set(ml.cells("-010")) == {2, 4, 5, 10}
assert not any(set(ml.cells("".join(c))) == {2, 4, 5, 10} for c in itertools.product("01-", repeat=4))

# ── Worked examples: tabulation ─────────────────────────────────────────────
r, ps = ml.qm([0, 1, 2, 5], [], 3)
assert [[c for c, _ in x] for x in r] == [["000", "001", "010", "101"], ["00-", "0-0", "-01"]]
assert T(ps, V3) == sorted(["A'B'", "A'C'", "B'C"]) and msops([0, 1, 2, 5], [], 3, V3) == {frozenset(["A'C'", "B'C"])}
r, ps = ml.qm([0, 2, 4, 5, 6, 10], [], 4)
assert sorted(c for c, _ in r[1]) == sorted(["00-0", "0-00", "0-10", "-010", "010-", "01-0"])
assert [c for c, _ in r[2]] == ["0--0"] and sorted(c for c, k in r[1] if not k) == sorted(["010-", "-010"])
assert ml._combine("00-0", "01-0") == "0--0" == ml._combine("0-00", "0-10")
r, ps = ml.qm([0, 1, 2, 8, 10, 11, 14, 15], [], 4)
assert sorted(c for c, _ in r[1]) == sorted(["000-", "00-0", "-000", "-010", "10-0", "101-", "1-10", "1-11", "111-"])
assert sorted(c for c, _ in r[2]) == sorted(["-0-0", "1-1-"]) and T(ps, V4) == sorted(["B'D'", "AC", "A'B'C'"])
assert T(ml.essential([0, 1, 2, 8, 10, 11, 14, 15], [], 4), V4) == T(ps, V4)
assert ml._combine("-000", "-010") == "-0-0" and ml._combine("1-10", "1-11") == "1-1-"
r, ps = ml.qm([1, 3, 6, 7], [5, 15], 4)
assert sorted(c for c, _ in r[1]) == sorted(["00-1", "0-01", "0-11", "01-1", "011-", "-111"]) and [c for c, _ in r[2]] == ["0--1"]
assert T(ml.primes([1, 3, 6, 7], [5, 15], 4), V4) == sorted(["A'D", "A'BC", "BCD"])
assert msops([1, 3, 6, 7], [5, 15], 4, V4) == {frozenset(["A'D", "A'BC"])}

# ── Charts, dominance, Petrick ──────────────────────────────────────────────
o = [1, 3, 4, 5, 9, 11, 12, 13]
ps, es, red, _ = ml.classify(o, [], 4)
assert T(ps, V4) == sorted(["B'D", "C'D", "BC'"]) and T(es, V4) == sorted(["B'D", "BC'"]) and T(red, V4) == ["C'D"]
ch = ml.chart(o, ps)
assert sorted(m for m, c in ch.items() if len(c) == 1) == [3, 4, 11, 12]
o = [0, 1, 2, 5, 6, 7, 8, 9, 10, 14]
ps = ml.primes(o, [], 4)
assert T(ps, V4) == sorted(["B'C'", "B'D'", "CD'", "A'C'D", "A'BD", "A'BC"])
ch = ml.chart(o, ps)
assert sorted(m for m, c in ch.items() if len(c) == 1) == [9, 14]
covered = set(ml.cells(ml.parse_term("B'C'", V4))) | set(ml.cells(ml.parse_term("CD'", V4)))
assert sorted(set(o) - covered) == [5, 7]
red_rows = {ml.term(p, V4): sorted(set(ml.cells(p)) & {5, 7}) for p in ps}
assert red_rows == {"B'C'": [], "B'D'": [], "CD'": [], "A'C'D": [5], "A'BD": [5, 7], "A'BC": [7]}
assert msops(o, [], 4, V4) == {frozenset(["B'C'", "CD'", "A'BD"])} and ml.min_literals_sop(o, [], 4) == 7
# Column dominance: rows(9) ⊆ rows(0), rows(1), rows(8).
for m in (0, 1, 8):
    assert set(ch[9]) <= set(ch[m])
# Row and column dominance never lose the minimum (exhaustive on a random sample).
for _ in range(200):
    ones = sorted(rnd.sample(range(16), rnd.choice([5, 6, 7, 8])))
    ps = ml.primes(ones, [], 4)
    ch = ml.chart(ones, ps)
    for p in ps:
        for q in ps:
            if p != q and ml.literals(p) <= ml.literals(q) and all(p in ch[m] for m in ones if q in ch[m]):
                # some minimal cover avoids q
                assert any(q not in c for c in ml.min_covers(ones, [], 4))
# Petrick on the ring.
ring = [0, 1, 5, 8, 12, 13]
names = {"a": "A'B'C'", "b": "A'C'D", "c": "BC'D", "d": "ABC'", "e": "AC'D'", "g": "B'C'D'"}
inv = {ml.parse_term(v, V4): k for k, v in names.items()}
irr = sorted("".join(sorted(inv[c] for c in cov)) for cov in ml.petrick(ring, ml.primes(ring, [], 4)))
assert irr == sorted(["ace", "bdg", "bceg", "acdg", "abde"])
has("$ace + bdg + bceg + acdg + abde$")
# Expansion shown in the lesson: (a + g)(a + b) = a + bg etc., and the eight products absorb to five.
binoms = [[{"a"}, {"b", "g"}], [{"c"}, {"b", "d"}], [{"e"}, {"d", "g"}]]
prods = [x | y | z for x in binoms[0] for y in binoms[1] for z in binoms[2]]
assert len(prods) == 8
absorbed = {frozenset(q) for q in prods if not any(set(r) < q for r in prods)}
assert sorted("".join(sorted(q)) for q in absorbed) == irr
# Review additions: column dominance examples, small Petrick, counting covers, reflected and 6-variable maps.
o = [0, 1, 2, 5, 6, 7, 8, 9, 10, 14]
ch = ml.chart(o, ml.primes(o, [], 4))
for m in (0, 1, 8):
    assert set(ch[9]) <= set(ch[m])
for m in (2, 6, 10):
    assert set(ch[14]) <= set(ch[m])
o = [1, 3, 4, 5, 9, 11, 12, 13]
ch = ml.chart(o, ml.primes(o, [], 4))
assert set(ch[3]) <= set(ch[1]) and set(ch[3]) <= set(ch[9]) and set(ch[4]) <= set(ch[5]) and set(ch[4]) <= set(ch[13])
cdp = ml.parse_term("C'D", V4)
assert not any(cdp in ch[m] for m in (3, 4, 11, 12))
o = [1, 2, 4, 6, 9, 11, 12, 13]
assert T(ml.essential(o, [], 4), V4) == sorted(["B'C'D", "A'CD'", "AB'D"]) and len(ml.min_covers(o, [], 4)) == 3
rest = {"A'BD'": [4, 6], "BC'D'": [4, 12], "AC'D": [9, 13], "ABC'": [12, 13]}
for t_, cs in rest.items():
    assert ml.cells(ml.parse_term(t_, V4)) == cs
o = [0, 1, 5, 10, 11, 12, 13, 15]
assert T(ml.essential(o, [], 4), V4) == sorted(["A'B'C'", "AB'C", "ABC'"]) and len(ml.min_covers(o, [], 4)) == 4
g3 = [format(x, "03b") for x in ml.gray(3)]
assert g3 == ["000", "001", "011", "010", "110", "111", "101", "100"]
assert all(ml.adjacent(int(g3[i], 2), int(g3[7 - i], 2)) and (int(g3[i], 2) ^ int(g3[7 - i], 2)) == 4 for i in range(4))
assert msops([2, 18], [], 5, V5) == {frozenset(["B'C'DE'"])}
assert msops([0, 1, 16, 17], [], 6, list("ABCDEF")) == {frozenset(["A'C'D'E'"])}
assert msops(ring, [], 4, V4) == {frozenset(["A'B'C'", "BC'D", "AC'D'"]), frozenset(["A'C'D", "ABC'", "B'C'D'"])}
# Petrick lists exactly the irredundant covers (exhaustive check on 3-variable functions).
for t in bl.all_functions(3):
    ones = [i for i, v in enumerate(t) if v]
    if not ones:
        continue
    ps = ml.primes(ones, [], 3)
    irr_brute = set()
    for k in range(1, len(ps) + 1):
        for comb in itertools.combinations(ps, k):
            cov = set().union(*(set(ml.cells(c)) for c in comb))
            if set(ones) <= cov and all(set(ones) - set().union(*(set(ml.cells(c)) for c in comb if c != d), set()) for d in comb):
                irr_brute.add(tuple(sorted(comb, key=ml.cube_key)))
    assert set(ml.petrick(ones, ps)) == irr_brute
# Irredundant 4-cover of the ring.
cov4 = [ml.parse_term(t, V4) for t in ("B'C'D'", "A'C'D", "BC'D", "AC'D'")]
assert ml.cover_fn(cov4, 4) == ring and ml.cost(cov4)[0] == 12
for d in cov4:
    assert set(ring) - set(ml.cover_fn([c for c in cov4 if c != d], 4))

# ── Five- and six-variable maps ─────────────────────────────────────────────
for a in range(32):
    for b in range(32):
        same_pos = (a & 15) == (b & 15) and a != b
        if same_pos:
            assert ml.adjacent(a, b)
assert not ml.adjacent(2, 16) and ml.adjacent(3, 19)
assert msops([3, 19], [], 5, V5) == {frozenset(["B'C'DE"])}
m5 = [0, 2, 3, 4, 6, 10, 11, 13, 15, 16, 18, 19, 20, 22, 26, 27]
assert bl.minterms("C'D + B'E' + A'BCE", V5) == m5 and msops(m5, [], 5, V5) == {frozenset(["B'E'", "C'D", "A'BCE"])}
assert 29 not in m5 and 31 not in m5
f5 = [0, 2, 7, 8, 10, 11, 14, 15, 16, 18, 24, 26, 27, 30, 31]
assert bl.minterms("C'E' + BD + A'CDE", V5) == f5 and msops(f5, [], 5, V5) == {frozenset(["C'E'", "BD", "A'CDE"])}
assert 23 not in f5 and [m for m in ml.map_neighbours(7, 5) if m in f5] == [15]
assert msops([2, 6, 16, 20], [], 5, V5) == {frozenset(["A'B'DE'", "AB'D'E'"])}
assert bl.minterms("B'E'", V5) == [0, 2, 4, 6, 16, 18, 20, 22]
assert msops([0, 16, 32, 48], [], 6, list("ABCDEF")) == {frozenset(["C'D'E'F'"])}
# Six-variable map adjacency: maps differing in one of A, B are adjacent; diagonal maps are not.
for ab1 in range(4):
    for ab2 in range(4):
        x = ab1 ^ ab2
        assert ml.adjacent(ab1 << 4, ab2 << 4) == (x in (1, 2))

# ── VEMs ────────────────────────────────────────────────────────────────────
# Shannon: every function of 3 variables equals the sum of its VEM cells (map vars A, B; entered C).
for t in bl.all_functions(3):
    for ab in range(4):
        r0, r1 = t[ab * 2], t[ab * 2 + 1]
        entry = {(0, 0): "0", (1, 1): "1", (0, 1): "C", (1, 0): "C'"}[(r0, r1)]
        assert all(t[ab * 2 + c] == {"0": 0, "1": 1, "C": c, "C'": 1 - c}[entry] for c in (0, 1))
# Example 1: rows B, columns C, entered A.
def vem_bca(entries):
    """entries[(B, C)] over f(A, B, C) with A entered."""
    out = []
    for a in (0, 1):
        for b in (0, 1):
            for c in (0, 1):
                e = entries[(b, c)]
                if {"0": 0, "1": 1, "A": a, "A'": 1 - a}[e]:
                    out.append(a * 4 + b * 2 + c)
    return out


f = vem_bca({(0, 0): "0", (0, 1): "1", (1, 0): "A", (1, 1): "A'"})
assert f == [1, 3, 5, 6] and bl.equal("B'C + ABC' + A'C", "B'C + ABC' + A'C", V3) and bl.minterms("B'C + ABC' + A'C", V3) == f
assert ml.min_literals_sop(f, [], 3) == 7
# Example 2: Σ(0, 3, 4, 5, 7), C entered, rows A, columns B.
f = [0, 3, 4, 5, 7]
ent = {}
for ab in range(4):
    ent[ab] = {(0, 0): "0", (1, 1): "1", (0, 1): "C", (1, 0): "C'"}[(int(ab * 2 in f), int(ab * 2 + 1 in f))]
assert ent == {0: "C'", 1: "C", 2: "1", 3: "C"}
assert bl.minterms("AB' + BC + B'C'", V3) == f and msops(f, [], 3, V3) == {frozenset(["B'C'", "BC", "AC"]), frozenset(["B'C'", "BC", "AB'"])}
# Example 3: Σ(1, 3, 4, 5, 13, 15) + d(6, 7) with D entered.
o, d = [1, 3, 4, 5, 13, 15], [6, 7]
ent = {}
for abc in range(8):
    pair = tuple("1" if m in o else "X" if m in d else "0" for m in (abc * 2, abc * 2 + 1))
    ent[format(abc, "03b")] = {("0", "1"): "D", ("1", "1"): "1", ("X", "X"): "X", ("0", "0"): "0"}[pair]
assert ent == {"000": "D", "001": "D", "010": "1", "011": "X", "100": "0", "101": "0", "110": "D", "111": "D"}
assert msops(o, d, 4, V4) == {frozenset(["A'B", "A'D", "BD"])}
# Example 4: x and x' side by side.
f = vem_bca({(0, 0): "A", (0, 1): "A'", (1, 0): "0", (1, 1): "0"})
assert f == [1, 4] and msops(f, [], 3, V3) == {frozenset(["AB'C'", "A'B'C"])} and bl.equal("AB'C' + A'B'C", "B'(A \\oplus C)", V3)
assert bl.minterms("B'", V3) == [0, 1, 4, 5]
# Viz VEM: rows A, columns B, entered C: C, 1 / 0, C'.
assert msops([1, 2, 3, 6], [], 3, V3) == {frozenset(["A'C", "BC'"])}

# ── PYQ: 1992 VEM ───────────────────────────────────────────────────────────
B = bl.bank()
q = B["cse-1992-a-1-i"]
assert "B=0,C=0 -> 1; B=0,C=1 -> 0; B=1,C=0 -> A-bar; B=1,C=1 -> A" in q["figures"][0]["alt"]
f = vem_bca({(0, 0): "1", (0, 1): "0", (1, 0): "A'", (1, 1): "A"})
assert f == [0, 2, 4, 7] and msops(f, [], 3, V3) == {frozenset(["B'C'", "A'C'", "ABC"])}
assert bl.minterms(strip_tex(q["answer"]), V3) == f

# ── Practice ────────────────────────────────────────────────────────────────
P = ml.practice()
opts = bl.option_values
r, _ = ml.qm([1, 3, 5, 7, 9], [], 4)
bl.assert_nat(P["nx-dl-03-03-q01"], len(r[1]))
q = P["nx-dl-03-03-q02"]
ok = [l for l, t in opts(q).items() if ml._combine(*[x.replace("−", "-") for x in t.split(" and ")]) is not None]
bl.assert_msq(q, ok)
assert ok == ["A", "C"]
bl.assert_nat(P["nx-dl-03-03-q03"], len(ml.primes([8, 9, 10, 11, 12, 14], [], 4)))
q = P["nx-dl-03-03-q04"]
o = [1, 3, 4, 5, 9, 11, 12, 13]
rows = {"P_1": "B'D", "P_2": "C'D", "P_3": "BC'"}
for name, term in rows.items():
    line = next(l for l in q["text"].splitlines() if f"${name}$" in l)
    marks = [c.strip() == "×" for c in line.strip("|").split("|")[1:]]
    assert [m for m, x in zip(o, marks) if x] == ml.cells(ml.parse_term(term, V4)), name
es = {ml.term(p, V4) for p in ml.essential(o, [], 4)}
assert es == {"B'D", "BC'"}
bl.assert_mcq(q, [l for l, t in opts(q).items() if t == "$P_1$ and $P_3$ only"][0])
q = P["nx-dl-03-03-q05"]
bl.assert_mcq(q, [l for l, t in opts(q).items() if t == "$Q$ and $R$"][0])
cyc = [1, 2, 3, 4, 5, 6]
bl.assert_nat(P["nx-dl-03-03-q06"], len(ml.petrick(cyc, ml.primes(cyc, [], 3))))
names = {"a": "A'C", "b": "A'B", "c": "BC'", "d": "AC'", "e": "AB'", "g": "B'C"}
inv = {ml.parse_term(v, V3): k for k, v in names.items()}
assert sorted("".join(sorted(inv[c] for c in cov)) for cov in ml.petrick(cyc, ml.primes(cyc, [], 3))) == sorted(["ace", "bdg", "bceg", "acdg", "abde"])
q = P["nx-dl-03-03-q07"]
bl.assert_msq(q, sorted(l for l, t in opts(q).items() if ml.adjacent(5, int(re.search(r"\d+", t).group()))))
q = P["nx-dl-03-03-q08"]
o = [1, 5, 10, 17, 21, 26]
assert msops(o, [], 5, V5) == {frozenset(["B'D'E", "BC'DE'"])}
eqs = [l for l, t in opts(q).items() if bl.minterms(strip_tex(t), V5) == o]
assert len(eqs) == 2
lit = lambda l: sum(1 for k, _ in bl.tokens(strip_tex(opts(q)[l])) if k == "var")
bl.assert_mcq(q, min(eqs, key=lit))
q = P["nx-dl-03-03-q09"]
f = [m for m in range(8) if {"0": 0, "1": 1, "C": m & 1, "C'": 1 - (m & 1)}[{0: "C'", 1: "1", 2: "0", 3: "C"}[m >> 1]]]
assert f == [0, 2, 3, 7] and msops(f, [], 3, V3) == {frozenset(["A'C'", "BC"])}
good = [l for l, t in opts(q).items() if bl.minterms(strip_tex(t), V3) == f]
assert len(good) == 1
bl.assert_mcq(q, good[0])
q = P["nx-dl-03-03-q10"]
f = [2, 3, 5, 8, 9, 15]
pair = (int(4 in f), int(5 in f))
assert pair == (0, 1)
bl.assert_mcq(q, [l for l, t in opts(q).items() if t == "$D$"][0])
assert len([k for k in P if k.startswith("nx-dl-03-03-")]) == 10

print("l3_03_tabular: Q–M weight rule and correctness (exhaustive / sampled), dominance, Petrick = irredundant covers (all 3-variable functions), 5/6-variable maps, VEMs, the 1992 key and 10 practice answers OK")
