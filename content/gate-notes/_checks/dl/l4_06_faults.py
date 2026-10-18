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
# ... and the double fault {p/1, C/0} is still caught by other rows (001, 011, 101).
dbl = [m for m, r in enumerate(cl.rows(V3)) if cl.evaluate(N94, r)["f"] != cl.evaluate(N94, r, {"p": 1, "C": 0})["f"]]
assert dbl == rows_of("001", "011", "101")
# Multi-output example: p = AB feeds f1 = p + C and f2 = p D; p s-a-0 tests = union over outputs.
MO = [("p", "AND", ["A", "B"]), ("f1", "OR", ["p", "C"]), ("f2", "AND", ["p", "D"])]
t1, t2 = cl.tests_for(MO, V4, "f1", "p", 0), cl.tests_for(MO, V4, "f2", "p", 0)
assert t1 == rows_of("1100", "1101") and sorted(set(t1) | set(t2)) == rows_of("1100", "1101", "1111")
assert cl.boolean_difference(MO, V4, "f1", "p") == bl.minterms("C'", V4) and cl.boolean_difference(MO, V4, "f2", "p") == bl.minterms("D", V4)
r1111 = dict(zip(V4, (1, 1, 1, 1)))
assert cl.evaluate(MO, r1111)["f1"] == cl.evaluate(MO, r1111, {"p": 0})["f1"] == 1 and cl.evaluate(MO, r1111)["f2"] == 1 != cl.evaluate(MO, r1111, {"p": 0})["f2"]
for line in cl.lines(MO, V4):  # the multi-output test condition, on every line
    for v in (0, 1):
        want = {m for m, r in enumerate(cl.rows(V4)) if cl.evaluate(MO, r)[line] == 1 - v
                and (m in cl.boolean_difference(MO, V4, "f1", line) or m in cl.boolean_difference(MO, V4, "f2", line))}
        got = {m for m, r in enumerate(cl.rows(V4)) if any(cl.evaluate(MO, r)[o] != cl.evaluate(MO, r, {line: v})[o] for o in ("f1", "f2"))}
        assert got == want, (line, v)
has("$\\partial f_1 / \\partial p = \\overline{C}$ and $\\partial f_2 / \\partial p = D$")
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
opt_rows = []
for l, txt in bl.option_values(q).items():
    v = txt.strip("$")
    if v.isdigit():
        r = dict(zip(X, map(int, v)))
        if cl.detects(IT07, X, "f", "T", 0, r):
            det.append(l)
        ev = cl.evaluate(IT07, r)
        if v in ("0111", "1111"):  # #ex-und-gate step 4: both activate (T = 1), both blocked (o = 1)
            assert ev["T"] == 1 and ev["o"] == 1 and ev["f"] == 0 == cl.evaluate(IT07, r, {"T": 0})["f"], v
        if v == "0000":
            assert ev["T"] == 0, v
        opt_rows.append(v)
correct = ["D"] if not det else det
assert {"0000", "0111", "1111"} <= set(opt_rows)
has("0000 does not activate (T = 0); 0111 and 1111 both activate (X3 = X4 = 1)", "both $X_1X_2X_3X_4 = 0111$ and $1111$ set $T = 1$")
assert "0000 and 0111 do not activate" not in L
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

# Redundancy removal one line at a time: f = OR(x1, x2) on two branches of x.
OR2 = [("x1", "BUF", ["x"]), ("x2", "BUF", ["x"]), ("f", "OR", ["x1", "x2"])]
assert not cl.tests_for(OR2, ["x"], "f", "x1", 0) and not cl.tests_for(OR2, ["x"], "f", "x2", 0)  # each redundant
assert cl.truth(OR2, ["x"], "f", {"x1": 0, "x2": 0}) != cl.truth(OR2, ["x"], "f")              # not both together
assert [m for m, r in enumerate(cl.rows(["x"])) if cl.evaluate(OR2, r, {"x1": 0})["f"] != cl.evaluate(OR2, r, {"x1": 0, "x2": 0})["f"]] == [1]
has("redundant lines one at a time, and re-checking after each removal")

# ── Dominance, coverage, the checkpoint theorem ─────────────────────────────
DOM = {"AND": (1, 1), "NAND": (1, 0), "OR": (0, 0), "NOR": (0, 1)}  # (input stuck value, output stuck value)
for g, (vi, vo) in DOM.items():
    for n in (2, 3, 4):
        ins = [f"x{i}" for i in range(n)]
        net = [("f", g, ins)]
        out_t = set(cl.tests_for(net, ins, "f", "f", vo))
        for x in ins:
            it = set(cl.tests_for(net, ins, "f", x, vi))
            assert it and it < out_t, (g, n, x)  # strict: the output fault has other tests too
# Dominance needs the input to feed only this gate: a fanned-out input can show through another path.
FD = [("a1", "BUF", ["a"]), ("a2", "BUF", ["a"]), ("b1", "BUF", ["b"]), ("b2", "BUF", ["b"]),
      ("g", "AND", ["a1", "b1"]), ("h", "AND", ["g", "b2"]), ("f", "OR", ["h", "a2"])]
assert 0 in cl.tests_for(FD, list("ab"), "f", "a", 1) and 0 not in cl.tests_for(FD, list("ab"), "f", "g", 1)
assert set(cl.tests_for(FD, list("ab"), "f", "a1", 1)) <= set(cl.tests_for(FD, list("ab"), "f", "g", 1))  # the branch is fine
# 1994: f/0 dominates C/1 and p/1.
assert set(T94[("C", 1)]) <= set(T94[("f", 0)]) and set(T94[("p", 1)]) <= set(T94[("f", 0)])
assert T94[("f", 0)] == rows_of("000", "010", "100", "110", "111")
has("dominates $C$ s-a-1 (tests\n$000, 010, 100$)")
# Coverage of {011, 101, 111}: 9/10 faults, 5/6 classes; C/1 is the one missed.
S3 = set(rows_of("011", "101", "111"))
missed = [fl for fl, t in T94.items() if not set(t) & S3]
assert missed == [("C", 1)] and len(T94) - len(missed) == 9
cls_hit = [c for c in classes.values() if any(set(T94[fl]) & S3 for fl in c)]
assert len(cls_hit) == 5 and len(classes) == 6 and round(500 / 6, 1) == 83.3
has("$9 / 10 = 90\\%$", "$5/6 \\approx 83.3\\%$")
# Checkpoint example: targeting A, B, C only gives {000, 011, 101, 111}, which detects all 10 faults.
cps94 = [fl for fl in T94 if fl[0] in V3]
assert len(cps94) == 6
S4 = set(rows_of("000", "011", "101", "111"))
assert all(set(T94[fl]) & S4 for fl in cps94) and all(set(t) & S4 for t in T94.values())
assert T94[("C", 0)] == rows_of("001", "011", "101") and T94[("A", 1)] == rows_of("011")


def explicit_fanout(gates, ins):
    """Insert a BUF branch for every use of a signal that is used more than once. Returns (net, branches)."""
    uses = {}
    for _, _, a in gates:
        for x in a:
            uses[x] = uses.get(x, 0) + 1
    net, br, cnt = [], [], {}
    for name, op, a in gates:
        args = []
        for x in a:
            if uses[x] > 1:
                cnt[x] = cnt.get(x, 0) + 1
                b = f"{x}_b{cnt[x]}"
                net.append((b, "BUF", [x]))
                br.append(b)
                args.append(b)
            else:
                args.append(x)
        net.append((name, op, args))
    return net, br


def checkpoint_claim(net, ins, out, cps):
    """True when every fault has a checkpoint fault whose (non-empty) tests are all its tests."""
    T = {(l, v): set(cl.tests_for(net, ins, out, l, v)) for l in cl.lines(net, ins) for v in (0, 1)}
    return all(any(T[(c, w)] and T[(c, w)] <= t for c in cps for w in (0, 1)) for (l, v), t in T.items()), T


import random  # noqa: E402
rng = random.Random(2026)
checked = 0
while checked < 150:
    nin = rng.choice([2, 3, 4])
    ins = [f"i{k}" for k in range(nin)]
    sigs, gates = list(ins), []
    for g in range(rng.choice([3, 4, 5, 6])):
        op = rng.choice(["AND", "OR", "NAND", "NOR", "NOT"])
        k = 1 if op == "NOT" else rng.choice([2, 3])
        args = rng.sample(sigs, k) if len(sigs) >= k else None
        if args:
            gates.append((f"g{g}", op, args))
            sigs.append(f"g{g}")
    if not gates:
        continue
    need, keep = {gates[-1][0]}, []
    for gt in reversed(gates):
        if gt[0] in need:
            keep.append(gt)
            need |= set(gt[2])
    net, br = explicit_fanout(keep[::-1], ins)
    cps = set(ins) | set(br)
    T = {(c, w): cl.tests_for(net, ins, keep[0][0], c, w) for c in cps for w in (0, 1)}
    if not all(T.values()):
        continue  # the theorem's hypothesis: every checkpoint fault detectable
    ok, _ = checkpoint_claim(net, ins, keep[0][0], cps)
    assert ok, net
    checked += 1
# Where it fails: XOR (the set {00, 11} catches every input fault but not f s-a-0) ...
XR = [("f", "XOR", ["a", "b"])]
TX = {(l, v): set(cl.tests_for(XR, list("ab"), "f", l, v)) for l in ("a", "b", "f") for v in (0, 1)}
S = set(rows_of("00", "11"))
assert all(TX[(x, v)] & S for x in "ab" for v in (0, 1)) and not TX[("f", 0)] & S and TX[("f", 0)] == set(rows_of("01", "10"))
# ... and a redundant circuit with an undetectable checkpoint fault: f = NAND(A, A) + A on three branches.
RD, brd = explicit_fanout([("g", "NAND", ["A", "A"]), ("f", "OR", ["g", "A"])], ["A"])
TR = {(l, v): set(cl.tests_for(RD, ["A"], "f", l, v)) for l in cl.lines(RD, ["A"]) for v in (0, 1)}
cp_det = [fl for fl in TR if fl[0] in {"A"} | set(brd) and TR[fl]]
Tset = set().union(*(TR[fl] for fl in cp_det))
assert all(TR[fl] & Tset for fl in cp_det) and TR[("g", 0)] and not TR[("g", 0)] & Tset
has("detects every single stuck-at fault on the checkpoints detects every single stuck-at fault in the")

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
      "worked tests, multi-output condition, dominance, coverage, checkpoint theorem (150 random circuits + 2 counterexamples), "
      "n + 1 test sets (n = 2…5), 3 PYQ keys and 10 practice answers OK")
