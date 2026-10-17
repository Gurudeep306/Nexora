"""Checks for dl/02-boolean-algebra-gates/06-gate-circuit-analysis: every circuit example (gate by
gate), the block-solving theorem (brute force over all 3-variable blocks), wrong-gate and switch
examples, timing examples by a small discrete-event simulator, all sixteen PYQ keys (including the
corrected key of cse-2010-cs-31) and the practice answers."""
import pathlib
import sys
from fractions import Fraction as Fr
from itertools import product

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402

L = bl.lesson_text("06-gate-circuit-analysis.md")
ABC = ["A", "B", "C"]
eq = bl.equal
tt = bl.tt
nand = lambda a, b: 1 - (a & b)
nor = lambda a, b: 1 - (a | b)

# Reading circuits.
assert eq("((AB)'(CD)')'", "AB + CD", ["A", "B", "C", "D"]) and eq("((A + B)' + (C + D)')'", "(A + B)(C + D)", ["A", "B", "C", "D"])
assert eq("((AB')'(A + B'))'", "A \\oplus B", ["A", "B"])
assert bl.minterms("a' + bc", ["a", "b", "c"]) == [0, 1, 2, 3, 7]
F = lambda A, B, C: nor(nor(nor(A, B), C), A)
assert tt(F, ABC) == tt("A'(B' + C)", ABC) and bl.minterms("A'(B' + C)", ABC) == [0, 1, 3]
PQR = ["P", "Q", "R"]
seven = lambda P, Q, R: nand(nand(nand(P, Q), nand(Q, R)), nand(nand(P, R), nand(Q, R)))
assert tt(seven, PQR) == tt("(QR)'", PQR) and not bl.depends_on(tt(seven, PQR), 0)
assert tt(lambda X, Y: nand(nand(X, Y), nand(X, 1 - Y)), ["X", "Y"]) == tt("X", ["X", "Y"])
# Signal-flow scene numbers.
assert (nand(1, 0), nand(1, 1), nand(nand(1, 0), nand(1, 1))) == (1, 0, 1)

# Block-solving theorem, by brute force over every g and h of 3 variables (f fixed sets).
R8 = set(range(8))
subsets = [frozenset(i for i in range(8) if m >> i & 1) for m in range(256)]
for F_ in [frozenset({1, 2, 6}), frozenset({0, 3, 5, 7})]:
    for G in subsets[::7]:
        sols = [H for H in subsets if G | H == F_]
        if G <= F_:
            assert set(sols) == {H for H in subsets if (F_ - G) <= H <= F_}
        else:
            assert not sols
        assert [H for H in subsets if G ^ H == F_] == [G ^ F_]
        andsols = [H for H in subsets if G & H == F_]
        if F_ <= G:
            assert set(andsols) == {H for H in subsets if F_ <= H <= (F_ | (frozenset(R8) - G))}
        else:
            assert not andsols
f1, f2, f = {0, 2, 4, 6}, {2, 3, 6, 7}, {1, 2, 6}
assert f1 & f2 == {2, 6} and f - (f1 & f2) == {1}
f1, f3, f = {1, 3, 5, 7}, {0}, {0, 3, 5}
assert all(((f1 & set(g2)) | f3) == f for g2 in [{3, 5}, {0, 2, 3, 4, 5, 6}]) and ((f1 & {1, 3, 5}) | f3) != f
assert ({1, 2, 5, 6} & {2, 3, 6, 7}) == {2, 6} and {0, 2, 3} ^ {2, 6} == {0, 3, 6} and {2, 6} ^ {0, 3, 6} == {0, 2, 3}
assert not ({1, 4} <= {1, 2})
# Block scene.
assert ({1, 3, 5, 7, 9} & {3, 7, 9, 12}) == {3, 7, 9} and {3, 7, 9, 14} - {3, 7, 9} == {14}

# Wrong gates and switches.
assert eq("(((ab)')c)'", "ab + c'", ["a", "b", "c"])
V4 = ["a", "b", "c", "d"]
assert eq("ab + c' + a'c + d'", "a' + b + c' + d'", V4) and bl.maxterms("a' + b + c' + d'", V4) == [11]
assert tt("S1 \\odot S2", ["S1", "S2"]) == (1, 0, 0, 1)
assert eq("x(x' + y)", "xy", ["x", "y"])


# A tiny discrete-event simulator for ideal gates with buffer delays (piecewise-constant signals).
def wave(events, start=0):
    return sorted(events), start


def value(w, t):
    ev, s = w
    v = s
    for tt_, nv in ev:
        if tt_ <= t:
            v = nv
    return v


def delay(w, d):
    ev, s = w
    return [(t + d, v) for t, v in ev], s


def combine(op, w1, w2, t_end):
    times = sorted({0} | {t for t, _ in w1[0]} | {t for t, _ in w2[0]})
    s = op(w1[1], w2[1])
    out, last = [], s
    for t in times:
        if t > t_end:
            break
        v = op(value(w1, t), value(w2, t))
        if v != last:
            out.append((t, v))
            last = v
    return out, s


def transitions(w, t_end):
    return sum(1 for t, _ in w[0] if 0 < t <= t_end) if True else 0


# Glitch examples.
X = wave([(2, 1), (6, 0)])
Xn = (delay(X, 1)[0], 1)
Xn = ([(t, 1 - v) for t, v in delay(X, 1)[0]], 1)
Y = combine(lambda a, b: a & b, X, Xn, 10)
assert Y[0] == [(2, 1), (3, 0)]
X = wave([(10, 1)])
Xn = ([(t, 1 - v) for t, v in delay(X, 3)[0]], 1)
assert combine(lambda a, b: a & b, X, Xn, 20)[0] == [(10, 1), (13, 0)]
X = wave([(5, 1), (9, 0)])
Xn = ([(t, 1 - v) for t, v in delay(X, 2)[0]], 1)
assert combine(lambda a, b: a | b, X, Xn, 20)[0] == [(9, 0), (11, 1)]  # 0-dip after the falling edge only
# Two-stage XOR example (lesson).
A = wave([(1, 1)])
P = combine(lambda a, b: a ^ b, A, delay(A, 1), 8)
B = combine(lambda a, b: a ^ b, P, delay(P, 3), 8)
assert B[0] == [(1, 1), (2, 0), (4, 1), (5, 0)] and transitions(B, 8) == 4
assert 2 + 3 + 2 == 7

# ── PYQ keys ────────────────────────────────────────────────────────────────
Bk = bl.bank()
q = Bk["cse-2020-cs-28"]
z = bl.minterms("a + b'c", ["a", "b", "c"])
opts = {o["l"]: sorted(int(x) for x in o["t"].split("(")[1].split(")")[0].split(",")) for o in q["options"]}
assert [k for k, v in opts.items() if v == z] == ["B"] == [q["answer"]]
q = Bk["cse-1993-ii-a-6-1"]
c = tt(lambda x, y: nor(nor(x, nor(x, y)), nor(nor(x, y), y)), ["x", "y"])
names = {"A": tt("x \\oplus y", ["x", "y"]), "B": tt("x \\odot y", ["x", "y"]), "C": tt("(xy)'", ["x", "y"]), "D": tt("(x + y)'", ["x", "y"])}
assert [k for k, v in names.items() if v == c] == ["B"] == bl.key_letters(q["answer"])
q = Bk["cse-1994-a-8"]
V4u = ["A", "B", "C", "D"]
c = tt(lambda A, B, C, D: nand(nand(nand(A, B), C), nand(C, D)), V4u)
assert [o["l"] for o in q["options"] if tt(o["t"], V4u) == c] == ["A"] == [q["answer"]]
q = Bk["cse-2010-cs-31"]
c = tt(lambda P, Q, R: nor(nor(nor(P, Q), nor(Q, R)), nor(nor(P, R), nor(Q, R))), PQR)
assert [o["l"] for o in q["options"] if tt(o["t"], PQR) == c] == ["A"]
assert q["answer"] == "A", "cse-2010-cs-31: apply src/gate/fixes/cse-2010.json (proven answer A)"
q = Bk["cse-2005-cs-15"]
XYZ = ["X", "Y", "Z"]
c = tt(lambda X, Y, Z: nand(nand(X, 1 - Y), Y & Z), XYZ)
indep = {"A": not bl.depends_on(c, 0), "B": not bl.depends_on(c, 1), "C": not bl.depends_on(c, 2)}
assert [k for k, v in indep.items() if v] == ["A"] == [q["answer"]] and c == tt("Y' + Z'", XYZ)
q = Bk["cse-2011-cs-13"]
AB = ["A", "B"]
circ = {"A": tt(lambda A, B: 1 - (A ^ B), AB), "B": tt(lambda A, B: 1 - ((1 - A) ^ (1 - B)), AB),
        "C": tt(lambda A, B: (1 - A) ^ B, AB), "D": tt(lambda A, B: 1 - ((1 - (A & (1 - B))) & ((1 - B) | A)), AB)}
assert [k for k, v in circ.items() if v != tt("A \\odot B", AB)] == ["D"] == [q["answer"]]
q = Bk["cse-2025-2-cs-21"]
XY = ["X", "Y"]
c = tt(lambda X, Y: nand(X, Y) | (1 - X) | (X & (1 - Y)), XY)
assert [o["l"] for o in q["options"] if tt(o["t"], XY) == c] == ["A", "B", "C"] == bl.key_letters(q["answer"])
q = Bk["cse-1997-a-40"]
f1, f2, f_ = {8, 9, 10}, {7, 8, 12, 13, 14, 15}, {8, 9}
good = [o["l"] for o in q["options"] if (f1 & f2) | {int(x) for x in o["t"].split("Sigma")[1].strip("$\\, ").split(",")} == f_]
assert good == ["B"] == [q["answer"]]
q = Bk["cse-2008-cs-8"]
f1, f3, f_ = {4, 5, 6, 7, 8}, {1, 6, 15}, {1, 6, 8, 15}
good = [o["l"] for o in q["options"] if (f1 & {int(x) for x in o["t"].split("(")[1].split(")")[0].split(",")}) | f3 == f_]
assert good == ["C"] == [q["answer"]]
q = Bk["cse-2002-a-26"]
f1, f2, f_ = {0, 1, 3, 5}, {6, 7}, {1, 4, 5}
# f = NAND(NAND(f1, f2), f3') = f1·f2 + f3
good = [o["l"] for o in q["options"] if o["t"] != "None of the above" and (f1 & f2) | {int(x) for x in o["t"].split("(")[1].split(")")[0].split(",")} == f_]
assert good == ["A"] == [q["answer"]]
q = Bk["cse-2019-cs-30"]
f1, f2, f3 = {0, 2, 5, 8, 14}, {2, 3, 6, 8, 14, 15}, {2, 7, 11, 14}
res = (f1 & f2) ^ f3
opts = {o["l"]: {int(x) for x in o["t"].split("(")[1].split(")")[0].split(",")} for o in q["options"]}
assert [k for k, v in opts.items() if v == res] == ["A"] == [q["answer"]] and res == {7, 8, 11}
q = Bk["cse-2024-2-cs-40"]
f1, f2, f3, f4 = {0, 2, 3, 5, 7, 8, 11, 13}, {1, 3, 5, 7, 11, 13, 15}, {0, 1, 4, 11}, {0, 2, 6, 13}
Y = (f1 & f2) ^ (f3 | f4)
assert Y == set(range(8))
def lst(t):
    return {int(x) for x in t.split("(")[1].split(")")[0].split(",")}
okk = [o["l"] for o in q["options"] if (lst(o["t"]) == Y if "sum" in o["t"] else set(range(16)) - lst(o["t"]) == Y)]
assert okk == ["C", "D"] == bl.key_letters(q["answer"])
q = Bk["it-2007-cs-38"]
c = tt(lambda a, b, c, d: nand(nand(a, b), c) | nand(nand(1 - a, c), d) | nand(nand(b, c), d) | nand(a, d), V4)
assert [o["l"] for o in q["options"] if tt(o["t"].replace("\\bar ", "\\bar"), V4) == c] == ["C"] == [q["answer"]]
q = Bk["it-2005-cs-10"]
S = ["S1", "S2"]
lit = tt(lambda S1, S2: int(S1 == S2), S)
assert [o["l"] for o in q["options"] if tt(o["t"], S) == lit] == ["C"] == [q["answer"]]
q = Bk["cse-2003-cs-47"]
A = wave([(1, 1)])
P = combine(lambda a, b: a ^ b, A, delay(A, 2), 10)
Bw = combine(lambda a, b: a ^ b, P, delay(P, 4), 10)
assert P[0] == [(1, 1), (3, 0)] and Bw[0] == [(1, 1), (3, 0), (5, 1), (7, 0)]
n = transitions(Bw, 10)
assert [o["l"] for o in q["options"] if o["t"] == str(n)] == ["D"] == [q["answer"]]
q = Bk["cse-2024-1-cs-18"]
claims = {}
X = wave([(1, 1)])
Xn = ([(t, 1 - v) for t, v in delay(X, Fr(1, 2))[0]], 1)
rise = combine(lambda a, b: a & b, X, Xn, 5)
X2 = ([(1, 0)], 1)
Xn2 = ([(t, 1 - v) for t, v in delay(X2, Fr(1, 2))[0]], 0)
fall = combine(lambda a, b: a & b, X2, Xn2, 5)
# A transient is a temporary change of the output away from its steady value (0 here).
transient = lambda w: any(v != 0 for _, v in w[0]) or w[1] != 0
claims = {"A": all(v == 0 for v in tt("X X'", ["X"])), "B": all(v == 1 for v in tt("X X'", ["X"])),
          "C": transient(rise) and any(v == 1 for _, v in rise[0]),
          "D": transient(fall)}
assert rise[0] == [(1, 1), (Fr(3, 2), 0)] and fall == ([], 0)
assert [k for k, v in claims.items() if v] == ["A", "C"] == bl.key_letters(q["answer"])

# ── Practice ────────────────────────────────────────────────────────────────
Pq = bl.practice()
q = Pq["nx-dl-02-06-q01"]
z = bl.minterms("ab' + c", ["a", "b", "c"])
opts = {o["l"]: sorted(int(x) for x in o["t"].split("(")[1].split(")")[0].split(",")) for o in q["options"]}
bl.assert_mcq(q, [k for k, v in opts.items() if v == z][0])
c = tt(lambda X, Y: nor(nor(X, Y), nor(X, 1 - Y)), ["X", "Y"])
st = {"A": not bl.depends_on(c, 0) and bl.depends_on(c, 1), "B": bl.depends_on(c, 0) and not bl.depends_on(c, 1),
      "C": not bl.depends_on(c, 0) and not bl.depends_on(c, 1), "D": bl.depends_on(c, 0) and bl.depends_on(c, 1)}
bl.assert_mcq(Pq["nx-dl-02-06-q02"], [k for k, v in st.items() if v][0])
q = Pq["nx-dl-02-06-q03"]
f1, f2, f_ = {0, 1, 2, 3, 8}, {1, 3, 8, 9, 12}, {1, 3, 6, 8}
good = [o["l"] for o in q["options"] if (f1 & f2) | lst(o["t"]) == f_]
assert len(good) == 1
bl.assert_mcq(q, good[0])
q = Pq["nx-dl-02-06-q04"]
good = [o["l"] for o in q["options"] if {1, 2, 5} ^ lst(o["t"]) == {0, 1, 5, 6}]
bl.assert_mcq(q, good[0])
q = Pq["nx-dl-02-06-q05"]
c = tt(lambda a, b, c, d: nand(a, b) | nand(c, d), V4)
good = [o["l"] for o in q["options"] if tt(o["t"], V4) == c]
assert len(good) == 1
bl.assert_mcq(q, good[0])
X = wave([(0, 1)])
Xn = ([(t, 1 - v) for t, v in delay(X, 4)[0]], 1)
Yw = delay(combine(lambda a, b: a & b, X, Xn, 20), 1)
bl.assert_nat(Pq["nx-dl-02-06-q06"], Yw[0][1][0] - Yw[0][0][0])
A = wave([(1, 1), (4, 0), (7, 1)])
P = combine(lambda a, b: a ^ b, A, delay(A, 2), 12)
bl.assert_nat(Pq["nx-dl-02-06-q07"], transitions(P, 12))
bl.assert_nat(Pq["nx-dl-02-06-q08"], max(1 + 2 + 2, 2 + 2))
q = Pq["nx-dl-02-06-q09"]
c = tt("x(x' + y) + z", ["x", "y", "z"])
good = [o["l"] for o in q["options"] if tt(o["t"].split("=")[0], ["x", "y", "z"]) == c]
assert len(good) == 1
bl.assert_mcq(q, good[0])
assert sorted(k for k in Pq if k.startswith("nx-dl-02-06-")) == [f"nx-dl-02-06-q{i:02d}" for i in range(1, 10)]

print("l2_06_circuit_analysis: circuits, block equations, timing, 16 PYQ keys and the practice answers check out")
