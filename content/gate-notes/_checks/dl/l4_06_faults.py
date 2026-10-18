"""Checks for dl/04-combinational-circuits/06-faults-testing: every test vector, fault count, Boolean
difference, undetectable fault, equivalence class and minimum test set of the lesson is recomputed by
fault simulation (comblib.evaluate with stuck-at faults) over every input row; the fault-count theorem
is checked by enumeration; the test-condition theorem and "undetectable ⇔ redundant" are checked on
every line of every circuit in the lesson; the three PYQ keys are re-derived from netlists built from
the bank's figure descriptions; every practice answer, MSQ option and MCQ distractor is recomputed."""
import pathlib
import sys
from itertools import combinations, product
from math import comb

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import comblib as cl  # noqa: E402

L = cl.lesson_text("06-faults-testing.md")
has = lambda *s: bl.must_contain(L, *s)
V2, V3, V4 = list("AB"), list("ABC"), list("ABCD")


def row(bits):
    return int(bits, 2)


def rows_of(*bits):
    return [row(b) for b in bits]


def faults(net, ins):
    return [(l, v) for l in cl.lines(net, ins) for v in (0, 1)]


def tests(net, ins, out="f"):
    return {f: cl.tests_for(net, ins, out, *f) for f in faults(net, ins)}


def min_test_sets(net, ins, out="f"):
    """(size, every minimum complete single-fault test set) by exhaustive search over row subsets."""
    T = tests(net, ins, out)
    det = [set(t) for t in T.values() if t]
    R = 2 ** len(ins)
    for k in range(1, R + 1):
        sols = [set(c) for c in combinations(range(R), k) if all(d & set(c) for d in det)]
        if sols:
            return k, sols


def faulty_fn(net, ins, fl, out="f"):
    return cl.truth(net, ins, out, fl)


def check_theorems(net, ins, out="f"):
    """Test condition and undetectable ⇔ redundant, on every line of the circuit."""
    good = cl.truth(net, ins, out)
    for line in cl.lines(net, ins):
        bd = set(cl.boolean_difference(net, ins, out, line))
        for v in (0, 1):
            want = {m for m, r in enumerate(cl.rows(ins)) if cl.evaluate(net, r)[line] == 1 - v and m in bd}
            got = set(cl.tests_for(net, ins, out, line, v))
            assert got == want, (line, v)
            assert (not got) == (faulty_fn(net, ins, {line: v}, out) == good), (line, v)


# ── Fault counts ─────────────────────────────────────────────────────────────
for N in range(1, 7):
    assert cl.multiple_fault_count(N) == 3 ** N - 1 == sum(comb(N, k) * 2 ** k for k in range(1, N + 1))
assert cl.multiple_fault_count(2) == 8
has("$3^N - 1$", "$2N$", "$\\binom{N}{k} 2^k$")

# Example: 1994 circuit has 5 lines, 10 single faults.
N94 = [("p", "NAND", ["A", "B"]), ("f", "NAND", ["p", "C"])]
assert len(cl.lines(N94, V3)) == 5 and len(faults(N94, V3)) == 10
# Three lines: 6 + 12 + 8 = 26.
assert [comb(3, k) * 2 ** k for k in (1, 2, 3)] == [6, 12, 8] and cl.multiple_fault_count(3) == 26
# Fan-out circuit: 8 lines, 16 single, 6560 multiple; without branches 6 lines → 12, 728.
FAN = [("a1", "BUF", ["a"]), ("a2", "BUF", ["a"]), ("g1", "AND", ["a1", "b"]), ("g2", "OR", ["a2", "c"]), ("f", "XOR", ["g1", "g2"])]
assert len(cl.lines(FAN, list("abc"))) == 8 and 2 * 8 == 16 and cl.multiple_fault_count(8) == 6560
assert 2 * 6 == 12 and 3 ** 6 - 1 == 728
has("$3^8 - 1 = 6561 - 1 = 6560$")
# Edge: f = AND(A, OR(A, B)) with fan-out: 12 faults, 8 change f, 4 do not.
ABS = [("A1", "BUF", ["A"]), ("A2", "BUF", ["A"]), ("g", "OR", ["A2", "B"]), ("f", "AND", ["A1", "g"])]
assert cl.truth(ABS, V2, "f") == bl.tt("A", V2)
T = tests(ABS, V2)
assert len(T) == 12
und = sorted(f for f, t in T.items() if not t)
assert und == sorted([("B", 0), ("B", 1), ("A2", 1), ("g", 1)])
assert faulty_fn(ABS, V2, {"A1": 1}) == bl.tt("A + B", V2) and faulty_fn(ABS, V2, {"A2": 0}) == bl.tt("AB", V2)
for fl in ({"A": 0}, {"A1": 0}, {"g": 0}, {"f": 0}):
    assert faulty_fn(ABS, V2, fl) == (0, 0, 0, 0)
for fl in ({"A": 1}, {"f": 1}):
    assert faulty_fn(ABS, V2, fl) == (1, 1, 1, 1)
check_theorems(ABS, V2)
has("12 single faults, of which only 8 change the function")

# ── Finding tests ────────────────────────────────────────────────────────────
AND2 = [("f", "AND", ["A", "B"])]
assert cl.tests_for(AND2, V2, "f", "A", 0) == [3] == cl.tests_for(AND2, V2, "f", "B", 0) == cl.tests_for(AND2, V2, "f", "f", 0)
# 1994: p s-a-1 only 111; ∂f/∂p = C (rows 1, 3, 5, 7).
assert cl.tests_for(N94, V3, "f", "p", 1) == [7]
assert cl.boolean_difference(N94, V3, "f", "p") == [1, 3, 5, 7] == bl.minterms("C", V3)
assert cl.truth(N94, V3, "f", {"p": 0}) == (1,) * 8 and cl.truth(N94, V3, "f", {"p": 1}) == bl.tt("C'", V3)
check_theorems(N94, V3)
has("$\\dfrac{\\partial f}{\\partial p} = 1 \\oplus \\overline{C} = C$", "$A = B = C = 1$ is the (only) test for $p$ s-a-1.")
# Masking: 111 detects p s-a-1 alone but not together with C s-a-0.
r111 = dict(zip(V3, (1, 1, 1)))
assert cl.detects(N94, V3, "f", "p", 1, r111)
assert cl.evaluate(N94, r111)["f"] == cl.evaluate(N94, r111, {"p": 1, "C": 0})["f"] == 1
# Behind an OR: p s-a-0 only 1101, p s-a-1 rows 1, 5, 9.
OA = [("p", "AND", ["A", "B"]), ("q", "OR", ["p", "C"]), ("f", "AND", ["q", "D"])]
assert cl.tests_for(OA, V4, "f", "p", 0) == [13] == rows_of("1101")
assert cl.tests_for(OA, V4, "f", "p", 1) == [1, 5, 9] == rows_of("0001", "0101", "1001")
check_theorems(OA, V4)
# Reconvergent stem: f = AB + A'C; stem A s-a-0 tests 101, 110; 111 fails; branch into g1 s-a-0: 110, 111.
REC = [("x1", "BUF", ["A"]), ("x2", "BUF", ["A"]), ("nx", "NOT", ["x2"]), ("g1", "AND", ["x1", "B"]), ("g2", "AND", ["nx", "C"]), ("f", "OR", ["g1", "g2"])]
assert cl.truth(REC, V3, "f") == bl.tt("AB + A'C", V3)
assert cl.tests_for(REC, V3, "f", "A", 0) == rows_of("101", "110")
assert 7 not in cl.tests_for(REC, V3, "f", "A", 0)
assert cl.boolean_difference(REC, V3, "f", "A") == bl.minterms("B \\oplus C", V3)
assert cl.tests_for(REC, V3, "f", "x1", 0) == rows_of("110", "111")
check_theorems(REC, V3)

# ── Undetectable faults ──────────────────────────────────────────────────────
NORC = [("p", "AND", ["A", "B"]), ("f", "NOR", ["p", "C"])]
t = cl.tests_for(NORC, V3, "f", "p", 1)
assert t == rows_of("000", "010", "100")
assert [m for m in rows_of("000", "011", "100", "110") if m in t] == rows_of("000", "100")
ABSB = [("g1", "AND", ["A", "B"]), ("g2", "AND", ["A", "B", "C"]), ("f", "OR", ["g1", "g2"])]
assert cl.tests_for(ABSB, V3, "f", "g2", 0) == [] and cl.truth(ABSB, V3, "f", {"g2": 0}) == bl.tt("AB", V3)
check_theorems(ABSB, V3)
# Consensus: BC gate s-a-0 undetectable, s-a-1 rows 000, 010, 100, 101; branches of B and C into it s-a-0 undetectable.
CON = [("A1", "BUF", ["A"]), ("A2", "BUF", ["A"]), ("na", "NOT", ["A2"]), ("B1", "BUF", ["B"]), ("B2", "BUF", ["B"]),
       ("C1", "BUF", ["C"]), ("C2", "BUF", ["C"]), ("g1", "AND", ["A1", "B1"]), ("g2", "AND", ["na", "C1"]),
       ("g3", "AND", ["B2", "C2"]), ("f", "OR", ["g1", "g2", "g3"])]
assert cl.truth(CON, V3, "f") == bl.tt("AB + A'C", V3)
TC = tests(CON, V3)
assert sorted(f for f, x in TC.items() if not x) == sorted([("g3", 0), ("B2", 0), ("C2", 0)])
assert TC[("g3", 1)] == rows_of("000", "010", "100", "101")
check_theorems(CON, V3)

# ── IT 2007 (it-2007-cs-45) from the figure description ──────────────────────
B = bl.bank()
q = B["it-2007-cs-45"]
alt = q["figures"][0]["alt"]
assert "3-input NAND gate (inputs X1, X2, X3)" in alt and "2-input OR gate together with X4" in alt
assert "2-input NOR gate whose other input is line T" in alt and "AND gate with inputs X3 and X4" in alt
X = ["X1", "X2", "X3", "X4"]
IT07 = [("n", "NAND", ["X1", "X2", "X3"]), ("o", "OR", ["n", "X4"]), ("T", "AND", ["X3", "X4"]), ("f", "NOR", ["o", "T"])]
assert cl.tests_for(IT07, X, "f", "T", 0) == []
assert cl.boolean_difference(IT07, X, "f", "T") == bl.minterms("X1 X2 X3 X4'", X)
assert cl.truth(IT07, X, "f", {"T": 0}) == cl.truth(IT07, X, "f") == bl.tt("X1 X2 X3 X4'", X)
check_theorems(IT07, X)
det = []
for l, txt in bl.option_values(q).items():
    v = txt.strip("$")
    if v.isdigit():
        r = dict(zip(X, map(int, v)))
        if cl.detects(IT07, X, "f", "T", 0, r):
            det.append(l)
        if v == "1111":
            assert cl.evaluate(IT07, r)["T"] == 1 and cl.evaluate(IT07, r)["o"] == 1
correct = ["D"] if not det else det
assert correct == bl.key_letters(q["answer"]) == ["D"]
has("$\\partial f / \\partial T = \\overline{o} = X_1X_2X_3\\overline{X_4}$")

# ── IT 2005 (it-2005-cs-46) ──────────────────────────────────────────────────
q = B["it-2005-cs-46"]
opts = bl.option_values(q)
form = {"$3^N$": lambda N: 3 ** N, "$3^N-1$": lambda N: 3 ** N - 1, "$2^N-1$": lambda N: 2 ** N - 1, "$2^N$": lambda N: 2 ** N}
good = [l for l, t in opts.items() if all(form[t](N) == cl.multiple_fault_count(N) for N in range(1, 7))]
assert good == bl.key_letters(q["answer"]) == ["B"]

# ── 1994 (cse-1994-b-35-b) ───────────────────────────────────────────────────
q = B["cse-1994-b-35-b"]
alt = q["figures"][0]["alt"]
assert "Two 2-input NAND gates" in alt and "Gate 1 inputs A and B" in alt and "other input is C" in alt and "s-a-1" in alt
assert cl.tests_for(N94, V3, "f", "p", 1) == [7] and q["answer"] == "A = B = C = 1"

# ── Test sets ────────────────────────────────────────────────────────────────
for n in (2, 3, 4, 5):
    ins = [f"x{i}" for i in range(n)]
    walk0 = {2 ** n - 1 - 2 ** (n - 1 - i) for i in range(n)} | {2 ** n - 1}
    walk1 = {2 ** (n - 1 - i) for i in range(n)} | {0}
    for g, want in (("AND", walk0), ("NAND", walk0), ("OR", walk1), ("NOR", walk1)):
        k, sols = min_test_sets([("f", g, ins)], ins)
        assert k == n + 1 and sols == [want], (g, n)
    # equivalence classes of an n-input AND: n + 2
    net = [("f", "AND", ins)]
    assert len({faulty_fn(net, ins, {l: v}) for l, v in faults(net, ins)}) == n + 2
assert min_test_sets(AND2, V2) == (3, [set(rows_of("01", "10", "11"))])
abc = list("abc")
assert min_test_sets([("f", "NAND", abc)], abc) == (4, [set(rows_of("011", "101", "110", "111"))])
k, sols = min_test_sets(N94, V3)
assert k == 4 and set(rows_of("000", "011", "101", "111")) in sols
assert all(set(rows_of("011", "101", "111")) <= s for s in sols)
assert {frozenset(s - set(rows_of("011", "101", "111"))) for s in sols} == {frozenset([0]), frozenset([2]), frozenset([4])}
T94 = tests(N94, V3)
assert T94[("A", 0)] == T94[("B", 0)] == T94[("p", 1)] == [7] and T94[("A", 1)] == [3] and T94[("B", 1)] == [5]
assert T94[("C", 0)] == T94[("p", 0)] == T94[("f", 1)] == [1, 3, 5] and T94[("C", 1)] == [0, 2, 4] and T94[("f", 0)] == [0, 2, 4, 6, 7]
classes = {}
for fl in faults(N94, V3):
    classes.setdefault(faulty_fn(N94, V3, {fl[0]: fl[1]}), set()).add(fl)
assert len(classes) == 6
assert {frozenset([("A", 0), ("B", 0), ("p", 1)]), frozenset([("p", 0), ("C", 0), ("f", 1)])} <= {frozenset(c) for c in classes.values()}
assert min_test_sets([("f", "XOR", abc)], abc) == (2, [{0, 7}, {1, 6}, {2, 5}, {3, 4}])
has("$\\{000, 111\\}$: 2 vectors", "$\\{011, 101, 110, 111\\}$: 4 = $n + 1$ vectors")

# ── Practice ─────────────────────────────────────────────────────────────────
P = cl.practice()
q = P["nx-dl-04-06-q01"]
Q1 = [("p", "OR", ["A", "B"]), ("f", "NAND", ["p", "C"])]
t = cl.tests_for(Q1, V3, "f", "p", 1)
assert t == [1]
ok = [l for l, x in bl.option_values(q).items() if row(x.strip("$")) in t]
bl.assert_mcq(q, ok[0])
assert ok == ["C"]
for w in q["common_wrong"]:
    assert row(bl.option_values(q)[w["answer"]].strip("$")) not in t

q = P["nx-dl-04-06-q02"]
Q2 = [("g", "AND", ["A", "B"]), ("f", "OR", ["g", "C"])]
t = cl.tests_for(Q2, V3, "f", "C", 0)
bl.assert_msq(q, [l for l, x in bl.option_values(q).items() if row(x.strip("$")) in t])

q = P["nx-dl-04-06-q03"]
Q3 = [("A1", "BUF", ["A"]), ("A2", "BUF", ["A"]), ("G1", "AND", ["A1", "B"]), ("G2", "OR", ["A2", "C"]), ("G3", "NAND", ["G1", "G2", "D"])]
bl.assert_nat(q, len(faults(Q3, V4)))
assert len(cl.lines(Q3, V4)) == 9

q = P["nx-dl-04-06-q04"]
two = sum(1 for a in product((None, 0, 1), repeat=6) if sum(x is not None for x in a) == 2)
bl.assert_nat(q, two)
assert two == comb(6, 2) * 4 == 60 and cl.multiple_fault_count(6) == 728

q = P["nx-dl-04-06-q05"]
Q5 = [("A1", "BUF", ["A"]), ("A2", "BUF", ["A"]), ("g", "AND", ["A2", "B"]), ("f", "OR", ["A1", "g"])]
assert cl.truth(Q5, V2, "f") == bl.tt("A", V2)
names = {"A": ("A", 1), "B": ("g", 1), "C": ("A2", 1), "D": ("g", 0)}
undet = [l for l, f in names.items() if not cl.tests_for(Q5, V2, "f", *f)]
bl.assert_mcq(q, undet[0])
assert undet == ["D"] and faulty_fn(Q5, V2, {"A2": 1}) == bl.tt("A + B", V2)

q = P["nx-dl-04-06-q06"]
ins5 = [f"x{i}" for i in range(5)]
bl.assert_nat(q, min_test_sets([("f", "NOR", ins5)], ins5)[0])

q = P["nx-dl-04-06-q07"]
Q7 = [("p", "AND", ["A", "B"]), ("q", "AND", ["C", "D"]), ("f", "OR", ["p", "q"])]
bd = cl.boolean_difference(Q7, V4, "f", "p")
bl.assert_nat(q, len(bd))
assert len(cl.tests_for(Q7, V4, "f", "p", 0)) == 3 and len(cl.tests_for(Q7, V4, "f", "p", 1)) == 9
assert 16 - len(bd) == 4

q = P["nx-dl-04-06-q08"]
XYZ = list("XYZ")
NOR3 = [("f", "NOR", XYZ)]
target = faulty_fn(NOR3, XYZ, {"f": 0})
cand = {"A": ("X", 0), "B": ("Y", 1), "C": ("f", 1), "D": ("Z", 1)}
bl.assert_msq(q, [l for l, f in cand.items() if faulty_fn(NOR3, XYZ, {f[0]: f[1]}) == target])

q = P["nx-dl-04-06-q09"]
Q9 = [("p", "AND", ["A", "B"]), ("q", "OR", ["p", "C"]), ("f", "NOR", ["q", "D"])]
t = cl.tests_for(Q9, V4, "f", "p", 1)
conds = {"A": "A B C' D'", "B": "(A B)' C' D'", "C": "(A B)' C D'", "D": "(A B)' C' D"}
ok = [l for l, e in conds.items() if bl.minterms(e, V4) == t]
bl.assert_mcq(q, ok[0])
assert ok == ["B"] and t == rows_of("0000", "0100", "1000")

q = P["nx-dl-04-06-q10"]
# (A) true on every line of every lesson circuit (check_theorems); (B) false: IT 2007's T is internal;
# (C) false: the consensus gate; (D) false by definition.
assert "T" in [n for n, _, _ in IT07] and "T" not in X and cl.tests_for(IT07, X, "f", "T", 0) == []
assert not TC[("g3", 0)] and TC[("g3", 1)]
bl.assert_mcq(q, "A")

assert len([k for k in P if k.startswith("nx-dl-04-06-")]) == 10
print("l4_06_faults: fault counts (3^N − 1 by enumeration), test condition and undetectable ⇔ redundant on every line of 8 circuits, "
      "worked tests, n + 1 test sets (n = 2…5), 3 PYQ keys and 10 practice answers OK")
