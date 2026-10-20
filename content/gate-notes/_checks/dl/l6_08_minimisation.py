"""Checks for dl/06-sequential-circuits/08-state-minimisation: every partition, refinement round,
implication-table pass, implied pair, merged table, state count, distinguishing string, flip-flop
count and practice answer of the lesson is a seqlib computation (FSM.partitions, implication,
minimal_states, equivalent, reachable, incompatible, min_closed_cover, detector, ff_count). The
lesson's theorems are also tested on random machines: P_k = k-equivalence (by brute-force
experiments), refinement stops within n − b rounds, the implication table's pass k crosses exactly
the pairs that are not k-equivalent, and the merged machine is equivalent to the original."""
import pathlib
import random
import sys
from itertools import combinations, product

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import seqlib as sq  # noqa: E402

L = sq.lesson_text("08-state-minimisation.md")
LW = " ".join(L.split())  # line breaks in the Markdown do not matter
has = lambda *s: bl.must_contain(LW, *[" ".join(x.split()) for x in s])  # noqa: E731
bank = bl.bank()
P = sq.practice()
F = sq.FSM.from_table


def blocks(m, k=-1):
    return [sorted(b, key=m.states.index) for b in m.partitions()[k]]


def fmt(part):
    return ", ".join("{" + ", ".join(map(str, b)) + "}" for b in part)


def outseq(m, s, w):
    """Output sequence of w from s (Moore: including the starting state's output)."""
    r = m.run(list(w), s)
    return ([r["first"]] if m.moore else []) + r["outs"]


def dist(m, a, b, maxlen=8):
    """Shortest distinguishing strings of a and b (all of the shortest length)."""
    for n in range(0, maxlen + 1):
        ws = [w for w in product(m.alphabet, repeat=n) if outseq(m, a, w) != outseq(m, b, w)]
        if ws:
            return ws
    return []


def merged(m):
    """One representative (first state) per block of the final partition; next states redirected."""
    part = m.partitions()[-1]
    rep = {s: b[0] for b in part for s in b}
    rows = {}
    for b in part:
        s = b[0]
        nx = tuple(rep[m.delta[(s, x)]] for x in m.alphabet)
        rows[s] = nx + ((m.out[s],) if m.moore else tuple(m.out[(s, x)] for x in m.alphabet))
    return F(rows, m.alphabet, m.moore, rep[m.start])


def implied(m, a, b):
    st = m.states
    res = []
    for x in m.alphabet:
        q = sorted({m.delta[(a, x)], m.delta[(b, x)]}, key=st.index)
        if len(q) == 2:  # a cell may list itself
            res.append("".join(map(str, q)))
    return res


def pr(a, b):
    return frozenset((a, b))


def keq(m, a, b, k):
    """Brute-force k-equivalence: same outputs for every experiment with at most k transitions."""
    n = k + 1 if not m.moore else k
    return all(outseq(m, a, w) == outseq(m, b, w) for ln in range(0, n + 1) for w in product(m.alphabet, repeat=ln))


# ── Theorems on random machines ────────────────────────────────────────────
random.seed(8)
for trial in range(400):
    n = random.randint(2, 6)
    moore = trial % 2 == 1
    names = "ABCDEF"[:n]
    rows = {s: (random.choice(names), random.choice(names)) + ((random.randint(0, 1),) if moore else (random.randint(0, 1), random.randint(0, 1)))
            for s in names}
    m = F(rows, moore=moore)
    parts = m.partitions()
    b = len(parts[0])
    # P_k = k-equivalence (brute force), for every k computed and one beyond
    for k in range(len(parts) + 1):
        Pk = parts[min(k, len(parts) - 1)]
        where = {s: i for i, blk in enumerate(Pk) for s in blk}
        for a, c in combinations(names, 2):
            assert (where[a] == where[c]) == keq(m, a, c, k), (rows, k, a, c)
    # stops within n − b splitting rounds (≤ n − 1)
    assert len(parts) - 1 <= n - b <= n - 1
    # implication table: crossed by pass k ⇔ not k-equivalent; productive passes = splitting rounds
    mark = m.implication()
    for a, c in combinations(names, 2):
        k = mark.get(pr(a, c))
        if k is not None:
            assert not keq(m, a, c, k) and (k == 0 or keq(m, a, c, k - 1))
        else:
            assert m.equivalent(m, a, c)
    assert (max(mark.values()) if mark else 0) == len(parts) - 1 or (not mark and len(parts) == 1)
    # equivalence relation and closure: classes are disjoint, transitions respect them
    eq = {(a, c): m.equivalent(m, a, c) for a in names for c in names}
    for a, c, d in product(names, repeat=3):
        assert not (eq[(a, c)] and eq[(c, d)]) or eq[(a, d)]
        assert eq[(a, c)] == eq[(c, a)]
    for a, c in product(names, repeat=2):
        if eq[(a, c)]:
            assert all(m.o(a, x) == m.o(c, x) and eq[(m.delta[(a, x)], m.delta[(c, x)])] for x in m.alphabet)
    # merged machine behaves like the original from every state's representative
    mm = merged(m)
    rep = {s: blk[0] for blk in parts[-1] for s in blk}
    for s in names:
        assert m.equivalent(mm, s, rep[s])
    # distinguishable pairs are separated within n − b transitions
    for a, c in combinations(names, 2):
        if not eq[(a, c)]:
            d = dist(m, a, c)
            assert d and len(d[0]) - (0 if moore else 1) <= n - b
    # n − (uncrossed cells) is the minimal count only when classes have ≤ 2 states
    if all(len(blk) <= 2 for blk in parts[-1]):
        assert n - sum(1 for a, c in combinations(names, 2) if pr(a, c) not in mark) == len(parts[-1])

# Distinguishable histories force distinct states (pigeonhole): checked on the 2003 machine below.

# ── GATE 1996 ──────────────────────────────────────────────────────────────
M96 = F({"A": ("D", "B", 0, 1), "B": ("A", "C", 0, 1), "C": ("A", "B", 0, 1), "D": ("A", "C", 1, 1)})
P96 = M96.partitions()
assert [fmt(p) for p in P96] == ["{A, B, C}, {D}", "{A}, {B, C}, {D}"] and M96.minimal_states() == 3
assert sorted(M96.reachable()) == ["A", "B", "C", "D"]
k96 = [l for l, t in bl.option_values(bank["cse-1996-a-48"]).items() if t == str(M96.minimal_states())]
assert k96 == bl.key_letters(bank["cse-1996-a-48"]["answer"]) == ["B"]
mk96 = M96.implication()
assert {"".join(sorted(p)): v for p, v in mk96.items()} == {"AD": 0, "BD": 0, "CD": 0, "AB": 1, "AC": 1}
assert implied(M96, "A", "B") == ["AD", "BC"] and implied(M96, "A", "C") == ["AD"] and implied(M96, "B", "C") == ["BC"]
assert sorted({M96.delta[("B", 1)], M96.delta[("C", 1)]}) == ["B", "C"]  # B–C implies only itself
assert not any(M96.delta[("B", x)] == M96.delta[("C", x)] for x in (1,)) and len(P96[0]) == 2
mm96 = merged(M96)
assert {s: (mm96.delta[(s, 0)], mm96.delta[(s, 1)], mm96.out[(s, 0)], mm96.out[(s, 1)]) for s in mm96.states} == \
    {"A": ("D", "B", 0, 1), "B": ("A", "B", 0, 1), "D": ("A", "B", 1, 1)} and M96.equivalent(mm96)
assert ("0", "0") and outseq(M96, "A", (0, 0)) == [0, 1] and outseq(M96, "B", (0, 0)) == [0, 0]
assert len(dist(M96, "A", "B")[0]) == 2 and (0, 0) in dist(M96, "A", "B")
# identical-row merging finds nothing in 1996
rows96 = {s: (M96.delta[(s, 0)], M96.delta[(s, 1)], M96.out[(s, 0)], M96.out[(s, 1)]) for s in M96.states}
assert len(set(rows96.values())) == 4
# edited 1996 table (D's output on 0 = 0) collapses to one state
E96 = F({"A": ("D", "B", 0, 1), "B": ("A", "C", 0, 1), "C": ("A", "B", 0, 1), "D": ("A", "C", 0, 1)})
assert E96.minimal_states() == 1 and len(E96.partitions()) == 1
has("$P_0 = \\{A, B, C\\}, \\{D\\}$", "$P_1 = \\{A\\}, \\{B, C\\}, \\{D\\}$", "**3** states (GATE 1996, option B)",
    "$A$: $D$/0, $B$/1; $B$: $A$/0, $B$/1; $D$: $A$/1, $B$/1", "$A$–$B$: $(D, A)$ and $(B, C)$, so \"AD, BC\"",
    "$A$–$C$: $(D, A)$ and $(B, B)$, so \"AD\"", "So the string **0 0** separates $A$ from $B$",
    "the whole machine collapses to one state", "answers **4**", "has **3** states")

# ── GATE 2025 ──────────────────────────────────────────────────────────────
M25 = F({"A": ("F", "B", 0, 0), "B": ("D", "C", 0, 0), "C": ("F", "E", 0, 0), "D": ("G", "A", 1, 0), "E": ("D", "C", 0, 0),
         "F": ("F", "B", 1, 1), "G": ("G", "H", 0, 1), "H": ("G", "A", 1, 0)})
P25 = M25.partitions()
assert [fmt(p) for p in P25] == ["{A, B, C, E}, {D, H}, {F}, {G}", "{A, C}, {B, E}, {D, H}, {F}, {G}"]
assert M25.minimal_states() == 5 and len(M25.reachable()) == 8
k25 = bank["cse-2025-1-cs-49"]["answer"]
assert k25 == "5 to 5" and M25.minimal_states() == 5
mk25 = M25.implication()
assert sum(1 for v in mk25.values() if v == 0) == 21 and len(mk25) == 25 and max(mk25.values()) == 1
surv0 = sorted("".join(sorted(p)) for p in map(frozenset, combinations(M25.states, 2)) if p not in {q for q, v in mk25.items() if v == 0})
assert surv0 == ["AB", "AC", "AE", "BC", "BE", "CE", "DH"]
assert {k: implied(M25, *k) for k in ["AB", "AC", "AE", "BC", "BE", "CE", "DH"]} == \
    {"AB": ["DF", "BC"], "AC": ["BE"], "AE": ["DF", "BC"], "BC": ["DF", "CE"], "BE": [], "CE": ["DF", "CE"], "DH": []}
assert implied(M25, "C", "E") == ["DF", "CE"] and sorted({M25.delta[("C", 1)], M25.delta[("E", 1)]}) == ["C", "E"]
assert sorted("".join(sorted(p)) for p in map(frozenset, combinations(M25.states, 2)) if p not in mk25) == ["AC", "BE", "DH"]
mm25 = merged(M25)
assert {s: (mm25.delta[(s, 0)], mm25.delta[(s, 1)], mm25.out[(s, 0)], mm25.out[(s, 1)]) for s in mm25.states} == \
    {"A": ("F", "B", 0, 0), "B": ("D", "A", 0, 0), "D": ("G", "A", 1, 0), "F": ("F", "B", 1, 1), "G": ("G", "D", 0, 1)}
assert M25.equivalent(mm25)
# wrong answers: stop at P0 (4); merge identical rows once (B = E, D = H) and stop (6)
assert len(P25[0]) == 4
rows25 = {s: (M25.delta[(s, 0)], M25.delta[(s, 1)], M25.out[(s, 0)], M25.out[(s, 1)]) for s in M25.states}
assert rows25["B"] == rows25["E"] and rows25["D"] == rows25["H"] and len(set(rows25.values())) == 6
# after merging B = E and D = H, A and C become identical (A → F, B; C → F, E = B)
assert M25.delta[("A", 0)] == M25.delta[("C", 0)] and {M25.delta[("A", 1)], M25.delta[("C", 1)]} == {"B", "E"}
assert ((0, 1) in dist(M25, "A", "B")) and outseq(M25, "A", (0, 1)) == [0, 1] and outseq(M25, "B", (0, 1)) == [0, 0]
assert 8 - 4 == 4  # n − b bound quoted in the example
has("$P_0 = \\{A, B, C, E\\}, \\{D, H\\}, \\{F\\}, \\{G\\}$ (4 blocks)", "$P_1 = \\{A, C\\}, \\{B, E\\}, \\{D, H\\}, \\{F\\}, \\{G\\}$",
    "**5** states (GATE 2025)", "$A$: $F$, $B$ / 0, 0; $B$: $D$, $A$ / 0, 0; $D$: $G$, $A$ / 1, 0; $F$: $F$, $B$ / 1, 1; $G$: $G$, $D$ / 0, 1",
    "Of the 28 cells, 21 are crossed at once", "$A$–$B$: DF, BC. $A$–$C$: BE. $A$–$E$: DF, BC. $B$–$C$: DF, CE.",
    "$C$–$E$: DF, CE", "Uncrossed: $A$–$C$, $B$–$E$, $D$–$H$", "at most 4 rounds could have split anything; here 1 did",
    "(4 in GATE 2025, 2 in GATE 1996)")
# C–E lists itself (CE) besides DF; a self entry never crosses a cell
assert sorted({M25.delta[("C", 0)], M25.delta[("E", 0)]}) == ["D", "F"]

# ── trap-moore-p0: grouping a Mealy table by one column ────────────────────
T = F({"A": ("A", "B", 0, 0), "B": ("A", "B", 0, 1)})
wrong = sq.FSM(T.states, T.alphabet, T.delta, {(s, x): T.out[(s, 0)] for s in T.states for x in T.alphabet})
assert wrong.minimal_states() == 1 and T.minimal_states() == 2 and T.o("A", 1) != T.o("B", 1)
has("the procedure \"proves\" a one-state machine", "the machine is already minimal with **2** states")

# ── Six-state Moore machine ────────────────────────────────────────────────
M6 = F({"A": ("B", "E", 1), "B": ("D", "E", 1), "C": ("C", "E", 0), "D": ("C", "B", 1), "E": ("F", "F", 0), "F": ("E", "F", 0)}, moore=True)
assert [fmt(p) for p in M6.partitions()] == ["{A, B, D}, {C, E, F}", "{A, B}, {C, E, F}, {D}", "{A}, {B}, {C, E, F}, {D}"]
assert M6.minimal_states() == 4
mm6 = merged(M6)
assert {s: (mm6.delta[(s, 0)], mm6.delta[(s, 1)], mm6.out[s]) for s in mm6.states} == \
    {"A": ("B", "C", 1), "B": ("D", "C", 1), "C": ("C", "C", 0), "D": ("C", "B", 1)} and M6.equivalent(mm6)
assert (0, 0) in dist(M6, "A", "B") and len(dist(M6, "A", "B")[0]) == 2 and outseq(M6, "A", (0, 0)) == [1, 1, 1] and outseq(M6, "B", (0, 0)) == [1, 1, 0]
assert all(M6.delta[(s, x)] in "CEF" and M6.out[s] == 0 for s in "CEF" for x in (0, 1))
has("$P_0 = \\{A, B, D\\}$ (output 1), $\\{C, E, F\\}$ (output 0)", "$P_1 = \\{A, B\\}, \\{C, E, F\\}, \\{D\\}$",
    "$P_2 = \\{A\\}, \\{B\\}, \\{C, E, F\\}, \\{D\\}$", "**4** states: $C \\equiv E \\equiv F$",
    "$A$: $B$, $C$ / 1; $B$: $D$, $C$ / 1; $C$: $C$, $C$ / 0; $D$: $C$, $B$ / 1",
    "it gives the outputs 1, 1, 1 from $A$ (through $B$ and $D$) and 1, 1, 0 from $B$ (through $D$ and $C$)")
# flip-flops 6 → 4: 3 → 2; K-map cells
assert (sq.ff_count(6), sq.ff_count(4)) == (3, 2) and (2 ** 3 * 2, 6 * 2, 2 ** 2 * 2) == (16, 12, 8)
has("**3 → 2** flip-flops", "= 16$ cells for 3 flip-flops and one input, of which $6 \\times 2 = 12$ are specified")
# a class of three: 3 uncrossed cells, 6 − 3 ≠ 4 (practice q06 D)
unc6 = [p for p in map(frozenset, combinations(M6.states, 2)) if p not in M6.implication()]
assert len(unc6) == 3 and 6 - len(unc6) != M6.minimal_states()

# ── Edge case: Moore 1011 detector, slowest refinement ─────────────────────
D4 = sq.detector("1011", True, True)
assert {s: (D4.delta[(s, 0)], D4.delta[(s, 1)], D4.out[s]) for s in D4.states} == \
    {0: (0, 1, 0), 1: (2, 1, 0), 2: (0, 3, 0), 3: (2, 4, 0), 4: (2, 1, 1)}
assert [len(p) for p in D4.partitions()] == [2, 3, 4, 5] and D4.minimal_states() == 5 and 5 - 2 == len(D4.partitions()) - 1
assert [fmt(p) for p in D4.partitions()[:3]] == ["{0, 1, 2, 3}, {4}", "{0, 1, 2}, {3}, {4}", "{0, 1}, {2}, {3}, {4}"]
# distinguishing strings 1 (S3 from the rest), 11 (S2), 011 (S1 from S0), each of shortest length
assert all(outseq(D4, 3, (1,)) != outseq(D4, s, (1,)) for s in (0, 1, 2)) and len(dist(D4, 3, 0)[0]) == 1
assert all(outseq(D4, 2, (1, 1)) != outseq(D4, s, (1, 1)) for s in (0, 1)) and len(dist(D4, 2, 0)[0]) == 2
assert outseq(D4, 1, (0, 1, 1)) != outseq(D4, 0, (0, 1, 1)) and len(dist(D4, 1, 0)[0]) == 3
has("$P_1 = \\{S_0, S_1, S_2\\}, \\{S_3\\}, \\{S_4\\}$", "$P_2 = \\{S_0, S_1\\}, \\{S_2\\}, \\{S_3\\}, \\{S_4\\}$",
    "The machine is **already minimal** (5 states)", "the **maximum** $n - b = 3$ splitting rounds",
    "1 separates $S_3$ from the rest, 11 separates $S_2$, 011 separates $S_1$ from $S_0$")

# ── Two-pass implication table ─────────────────────────────────────────────
M2 = F({"A": ("E", "C", 1, 0), "B": ("A", "E", 1, 0), "C": ("A", "E", 1, 0), "D": ("D", "E", 1, 0), "E": ("B", "D", 0, 0)})
mk2 = M2.implication()
assert {"".join(sorted(p)): v for p, v in mk2.items()} == {"AE": 0, "BE": 0, "CE": 0, "DE": 0, "AB": 1, "AC": 1, "AD": 1, "BD": 2, "CD": 2}
assert {k: implied(M2, *k) for k in ["AB", "AC", "AD", "BC", "BD", "CD"]} == \
    {"AB": ["AE", "CE"], "AC": ["AE", "CE"], "AD": ["DE", "CE"], "BC": [], "BD": ["AD"], "CD": ["AD"]}
assert [fmt(p) for p in M2.partitions()] == ["{A, B, C, D}, {E}", "{A}, {B, C, D}, {E}", "{A}, {B, C}, {D}, {E}"]
assert M2.minimal_states() == 4 and (sq.ff_count(5), sq.ff_count(4)) == (3, 2)
assert len(dist(M2, "B", "D")[0]) == 3 and (0, 0, 0) in dist(M2, "B", "D")
assert outseq(M2, "D", (0, 0, 0)) == [1, 1, 1] and outseq(M2, "B", (0, 0, 0)) == [1, 1, 0]
has("$A$–$B$: AE, CE. $A$–$C$: AE, CE. $A$–$D$: DE, CE. $B$–$C$: nothing (identical rows). $B$–$D$: AD. $C$–$D$: AD.",
    "Only $B$–$C$ survives: **4** states", "$P_1 = \\{A\\}, \\{B, C, D\\}, \\{E\\}$, $P_2 = \\{A\\}, \\{B, C\\}, \\{D\\}, \\{E\\}$",
    "($D$ stays in $D$ and outputs 1, 1, 1; $B$ goes to $A$ and then to $E$, whose output on 0 is 0, so it outputs 1, 1, 0)")

# ── Edge case: two pairs implying each other ───────────────────────────────
MC = F({"A": ("C", "E", 0, 1), "B": ("D", "E", 0, 1), "C": ("A", "E", 1, 0), "D": ("B", "E", 1, 0), "E": ("B", "D", 0, 0)})
mkc = MC.implication()
assert sorted("".join(sorted(p)) for p in map(frozenset, combinations(MC.states, 2)) if p not in mkc) == ["AB", "CD"]
assert all(v == 0 for v in mkc.values()) and implied(MC, "A", "B") == ["CD"] and implied(MC, "C", "D") == ["AB"]
assert MC.minimal_states() == 3 and fmt(MC.partitions()[-1]) == "{A, B}, {C, D}, {E}" and len(MC.reachable()) == 5
has("Both pairs survive: $A \\equiv B$ and $C \\equiv D$, so the machine has **3** states: $\\{A, B\\}, \\{C, D\\}, \\{E\\}$")

# ── Unreachable states ─────────────────────────────────────────────────────
MU = F({"A": ("B", "C", 0, 0), "B": ("A", "C", 1, 0), "C": ("D", "D", 0, 0), "D": ("A", "B", 0, 0), "E": ("C", "D", 0, 0)})
assert sorted(MU.reachable()) == ["A", "B", "C", "D"] and MU.minimal_states() == 4 and MU.minimal_states(False) == 5
assert [fmt(p) for p in MU.partitions()] == ["{A, C, D, E}, {B}", "{A}, {B}, {C, E}, {D}", "{A}, {B}, {C}, {D}, {E}"]
SU = sq.FSM(list("ABCD"), (0, 1), {k: v for k, v in MU.delta.items() if k[0] != "E"}, {k: v for k, v in MU.out.items() if k[0] != "E"})
assert [fmt(p) for p in SU.partitions()] == ["{A, C, D}, {B}", "{A}, {B}, {C}, {D}"]
assert (sq.ff_count(4), sq.ff_count(5)) == (2, 3)
has("**4** states, 2 flip-flops. Refining the whole table gives 5 states and 3 flip-flops",
    "refining all five states gives **5**, while the correct minimal machine started in $A$ has **4** states")

# ── No flip-flop saved: 1996 and 2025 ──────────────────────────────────────
assert (sq.ff_count(4), sq.ff_count(3), sq.ff_count(8), sq.ff_count(5)) == (2, 2, 3, 3)
assert ((2 ** 2 - 3) * 2, 2 ** 2 * 2, (2 ** 3 - 5) * 2, 2 ** 3 * 2) == (2, 8, 6, 16)
has("2 of the 8 cells of each next-state K-map", "6 of the 16 cells become don't-cares", "**No flip-flop is saved**")

# ── States from words ──────────────────────────────────────────────────────
def explore(start, alphabet, nxt, out, moore=False):
    states, todo, delta, o = [start], [start], {}, {}
    while todo:
        s = todo.pop(0)
        for x in alphabet:
            t = nxt(s, x)
            delta[(s, x)] = t
            if not moore:
                o[(s, x)] = out(s, x)
            if t not in states:
                states.append(t)
                todo.append(t)
        if moore:
            o[s] = out(s)
    return sq.FSM(states, alphabet, delta, o, moore, start)


# parity: count mod 4 → 2 states
par = explore(0, (0, 1), lambda s, x: (s + x) % 4, lambda s: s % 2, moore=True)
assert len(par.states) == 4 and fmt(par.partitions()[0]) == "{0, 2}, {1, 3}" and len(par.partitions()) == 1 and par.minimal_states() == 2
assert outseq(par, 0, ()) != outseq(par, par.delta[(0, 1)], ())
has("$P_0 = \\{0, 2\\}, \\{1, 3\\}$", "**2** states (one flip-flop")
# mod 3, MSB first, tracked mod 6 → 3 states
m3 = explore(0, (0, 1), lambda s, x: (2 * s + x) % 6, lambda s: int(s % 3 == 0), moore=True)
assert sorted(m3.states) == [0, 1, 2, 3, 4, 5]
assert [fmt(p) for p in m3.partitions()] == ["{0, 3}, {1, 2, 4, 5}", "{0, 3}, {1, 4}, {2, 5}"] and m3.minimal_states() == 3
assert [m3.delta[(s, x)] for s in (1, 4) for x in (0, 1)] == [2, 3, 2, 3] and [m3.delta[(s, x)] for s in (2, 5) for x in (0, 1)] == [4, 5, 4, 5]
h = {w: m3.run([int(c) for c in w])["states"][-1] for w in ("0", "1", "10")}
assert (h["0"], h["1"], h["10"]) == (0, 1, 2) and outseq(m3, 0, ())[0] == 1 and outseq(m3, 1, ())[0] == 0 == outseq(m3, 2, ())[0]
assert outseq(m3, 1, (1,))[-1] == 1 and outseq(m3, 2, (1,))[-1] == 0
has("$P_0 = \\{0, 3\\}, \\{1, 2, 4, 5\\}$", "$P_1 = \\{0, 3\\}, \\{1, 4\\}, \\{2, 5\\}$", "**3** states, one per remainder")


# GATE 2003: difference z − n, verdict at ±2; naive machine tracking d up to ±6 and the verdict
def gate2003(th, K=6, moore=False):
    def o(s, x):
        d, v = s
        if v:
            return v
        d2 = d + (1 if x == 0 else -1)
        return "10" if d2 == th else "01" if d2 == -th else "00"

    def nx(s, x):
        d, v = s
        y = o(s, x)
        return (max(-K, min(K, d + (1 if x == 0 else -1))), v or (y if y != "00" else ""))
    if moore:
        return explore((0, ""), (0, 1), nx, lambda s: s[1] or "00", moore=True)
    return explore((0, ""), (0, 1), nx, o)


g03 = gate2003(2)
assert len(g03.states) == 29 and g03.minimal_states() == 5 and gate2003(2, moore=True).minimal_states() == 5
C03 = F({"0": ("+1", "-1", "00", "00"), "+1": ("L10", "0", "10", "00"), "-1": ("0", "L01", "00", "01"),
         "L10": ("L10", "L10", "10", "10"), "L01": ("L01", "L01", "01", "01")})
assert C03.equivalent(g03) and C03.minimal_states() == 5 and len(C03.partitions()) == 1
hist = {"ε": (), "0": (0,), "1": (1,), "00": (0, 0), "11": (1, 1)}
end = {k: C03.run(list(v))["states"][-1] for k, v in hist.items()}
assert end == {"ε": "0", "0": "+1", "1": "-1", "00": "L10", "11": "L01"}
for a, b in combinations(hist, 2):
    assert len(dist(C03, end[a], end[b])[0]) == 1  # one-bit suffix separates every pair
assert outseq(C03, "0", (0,)) == ["00"] and outseq(C03, "+1", (0,)) == ["10"]
k03 = [l for l, t in bl.option_values(bank["cse-2003-cs-44"]).items() if t == "5"]
assert k03 == bl.key_letters(bank["cse-2003-cs-44"]["answer"]) == ["A"]
has("**5** states (GATE 2003, option A)", "29 reachable states and minimises to exactly 5",
    "Rows: $A, B, C, E$ → 00; $D, H$ → 10; $F$ → 11; $G$ → 01", "00 00, 10 00, 00 01, 10 10, 01 01")
# pigeonhole lower bound: in any machine with the behaviour the 5 histories end in 5 different states
for mach in (g03, C03):
    assert len({mach.run(list(v))["states"][-1] for v in hist.values()}) == 5

# detector with an extra reset state
D11 = F({"S": ("Z", "O", 0), "Z": ("Z", "O", 0), "O": ("Z", "OO", 0), "OO": ("Z", "OO", 1)}, moore=True)
assert [fmt(p) for p in D11.partitions()] == ["{S, Z, O}, {OO}", "{S, Z}, {O}, {OO}"] and D11.minimal_states() == 3
assert D11.equivalent(sq.detector("11", True, True)) and len(sq.detector("11", True, True).states) == 3
assert len(sq.detector("11", True, False).states) == 2
has("$P_1 = \\{S, Z\\}, \\{O\\}, \\{OO\\}$", "Not minimal: **3** states ($S \\equiv Z$). The Mealy version needs only 2")

# ── Incompletely specified machine ─────────────────────────────────────────
IC = F({"A": ("A", "B", 0, 0), "B": ("A", "C", None, 0), "C": ("A", "C", 1, 0)})
bad = IC.incompatible()
assert set(bad) == {pr("A", "C")} and IC.compatible_by_runs("A", "B") and IC.compatible_by_runs("B", "C") and not IC.compatible_by_runs("A", "C")
size, cover = IC.min_closed_cover()
assert size == 2
for cv in ([["A", "B"], ["B", "C"]], [["A"], ["B", "C"]]):  # both covers quoted in the lesson are closed
    sets = [set(c) for c in cv]
    assert set().union(*sets) == {"A", "B", "C"}
    assert all(any({IC.delta[(s, x)] for s in c} <= d for d in sets) for c in sets for x in (0, 1))
assert implied(IC, "A", "B") == ["BC"]
has("**2** states. The wrong answer is 1", "Compatible pairs: $A$–$B$ and $B$–$C$, but not $A$–$C$")

# ── Radar and PYQ marks ────────────────────────────────────────────────────
assert [bank[q]["marks"] for q in ("cse-1996-a-48", "cse-2003-cs-44", "cse-2025-1-cs-49")] == [2, 2, 2]
assert [bank[q]["type"] for q in ("cse-1996-a-48", "cse-2003-cs-44", "cse-2025-1-cs-49")] == ["MCQ", "MCQ", "NAT"]


# ── Practice ───────────────────────────────────────────────────────────────
def mcq_by_value(q, value):
    return [k for k, v in bl.option_values(q).items() if v == value]


Q1 = F({"A": ("F", "B", 1, 1), "B": ("D", "B", 1, 1), "C": ("A", "E", 1, 1), "D": ("B", "E", 1, 1), "E": ("A", "G", 1, 0),
        "F": ("A", "E", 1, 1), "G": ("G", "C", 1, 1)})
assert len(Q1.reachable()) == 7
assert [fmt(p) for p in Q1.partitions()] == ["{A, B, C, D, F, G}, {E}", "{A, B, G}, {C, D, F}, {E}", "{A, B}, {C, D, F}, {E}, {G}"]
bl.assert_nat(P["nx-dl-06-08-q01"], Q1.minimal_states())
# identical-row merging (wrong answer 6): only C and F have identical rows, and after merging them nothing else is identical
rows1 = {s: (Q1.delta[(s, 0)], Q1.delta[(s, 1)], Q1.out[(s, 0)], Q1.out[(s, 1)]) for s in Q1.states}
assert len(set(rows1.values())) == 6 and rows1["C"] == rows1["F"]
rows1m = {s: tuple("C" if v == "F" else v for v in r) for s, r in rows1.items() if s != "F"}
assert len(set(rows1m.values())) == 6 and Q1.minimal_states() == 4

Q2 = F({"A": ("B", "A", 0, 1), "B": ("D", "C", 0, 0), "C": ("D", "B", 0, 0), "D": ("E", "E", 0, 1), "E": ("F", "B", 0, 1), "F": ("E", "E", 0, 1)})
assert len(Q2.reachable()) == 6 and fmt(Q2.partitions()[1]) == "{A}, {B, C}, {D, F}, {E}" and len(Q2.partitions()) == 2
pairs2 = {"A": ("A", "E"), "B": ("B", "C"), "C": ("D", "F"), "D": ("A", "D")}
assert {l: bl.option_values(P["nx-dl-06-08-q02"])[l] for l in "ABCD"} == {l: f"{a} and {b}" for l, (a, b) in pairs2.items()}
bl.assert_msq(P["nx-dl-06-08-q02"], [l for l, (a, b) in pairs2.items() if Q2.equivalent(Q2, a, b)])
assert outseq(Q2, "A", (0, 1)) == [0, 0] and outseq(Q2, "E", (0, 1)) == [0, 1] and outseq(Q2, "D", (0, 1)) == [0, 1]

Q3 = F({"A": ("D", "B", 1, 1), "B": ("D", "A", 1, 1), "C": ("B", "C", 1, 0), "D": ("A", "E", 1, 0), "E": ("C", "E", 1, 0)})
assert len(Q3.reachable()) == 5
P3 = Q3.partitions()
tex = lambda p: ", ".join("\\{" + ", ".join(b) + "\\}" for b in p)  # noqa: E731
q3 = P["nx-dl-06-08-q03"]
bl.assert_mcq(q3, mcq_by_value(q3, f"${tex(P3[1])}$")[0])
assert mcq_by_value(q3, f"${tex(P3[0])}$") == ["A"] and mcq_by_value(q3, f"${tex(P3[2])}$") == ["C"] and len(P3) == 3

Q4 = gate2003(3)
bl.assert_nat(P["nx-dl-06-08-q04"], Q4.minimal_states())
assert Q4.minimal_states() == 7 and gate2003(3, moore=True).minimal_states() == 7
h4 = [(), (0,), (0, 0), (1,), (1, 1), (0, 0, 0), (1, 1, 1)]
assert len({Q4.run(list(w))["states"][-1] for w in h4}) == 7 and len({Q4.run(list(w))["states"][-1][1] for w in h4}) == 3

Q5 = F({"S0": ("S1", "S0", 0), "S1": ("S1", "S2", 0), "S2": ("S1", "S3", 0), "S3": ("S4", "S0", 0), "S4": ("S1", "S2", 1)}, moore=True)
d0110 = sq.detector("0110", True, True)
assert all(Q5.delta[(f"S{s}", x)] == f"S{d0110.delta[(s, x)]}" and Q5.out[f"S{s}"] == d0110.out[s] for s in range(5) for x in (0, 1))
bl.assert_nat(P["nx-dl-06-08-q05"], len(Q5.partitions()) - 1)
assert len(Q5.partitions()) - 1 == 3 == 5 - len(Q5.partitions()[0])

truth6 = {"A": all(((pr(a, b) in M25.implication() and M25.implication()[pr(a, b)] == 0) == M25.clash(a, b))
                   for a, b in combinations(M25.states, 2)),
          "B": pr("B", "C") not in M96.implication() and implied(M96, "B", "C") == ["BC"],
          "C": False, "D": False}
assert pr("B", "C") not in mk96 and M96.delta[("B", 1)] != M96.delta[("C", 1)]  # C is false: different next states, not crossed
assert 6 - len(unc6) == 3 != M6.minimal_states()  # D is false
bl.assert_msq(P["nx-dl-06-08-q06"], [k for k, v in truth6.items() if v])

Q7 = F({"A": ("F", "A", 1, 0), "B": ("D", "G", 1, 1), "C": ("B", "E", 1, 1), "D": ("C", "E", 1, 1), "E": ("D", "E", 1, 0),
        "F": ("G", "B", 1, 1), "G": ("C", "G", 1, 0)})
assert len(Q7.reachable()) == 7 and fmt(Q7.partitions()[-1]) == "{A}, {B, C, D}, {E, G}, {F}"
assert [fmt(p) for p in Q7.partitions()] == ["{A, E, G}, {B, C, D, F}", "{A, E, G}, {B, C, D}, {F}", "{A}, {B, C, D}, {E, G}, {F}"]
bl.assert_nat(P["nx-dl-06-08-q07"], sq.ff_count(Q7.minimal_states()))
assert sq.ff_count(7) == 3

bl.assert_mcq(P["nx-dl-06-08-q08"], "C")  # the definition (equivalent-states block)
assert M96.equivalent(M96, "B", "C") and M96.delta[("B", 1)] != M96.delta[("C", 1)]  # A is not necessary
assert M2.signature("B") == M2.signature("D") and not M2.equivalent(M2, "B", "D")  # B is too weak

Q9 = F({"A": ("F", "E", 0, 1), "B": ("B", "A", 0, 1), "C": ("A", "A", 0, 0), "D": ("A", "D", 0, 1), "E": ("F", "A", 0, 1), "F": ("C", "E", 0, 1)})
assert sorted(Q9.reachable()) == ["A", "C", "E", "F"] and Q9.minimal_states(False) == 5
q9 = P["nx-dl-06-08-q09"]
bl.assert_mcq(q9, mcq_by_value(q9, str(Q9.minimal_states()))[0])
assert mcq_by_value(q9, "4") == ["A"] and mcq_by_value(q9, "5") == ["C"] and mcq_by_value(q9, "6") == ["D"]
assert Q9.equivalent(Q9, "A", "E")

Q10 = F({"A": ("B", "C", 0, 0), "B": ("A", "D", 0, 1), "C": ("D", "A", 1, 1), "D": ("C", "B", 1, 0)})
q10 = P["nx-dl-06-08-q10"]
bl.assert_mcq(q10, mcq_by_value(q10, f"${tex(Q10.partitions()[0])}$")[0])


def group(key):
    g = {}
    for s in Q10.states:
        g.setdefault(key(s), []).append(s)
    return f"${tex(sorted(g.values(), key=lambda b: Q10.states.index(b[0])))}$"


assert mcq_by_value(q10, group(lambda s: Q10.out[(s, 0)])) == ["A"] and mcq_by_value(q10, group(lambda s: Q10.out[(s, 1)])) == ["B"]
assert mcq_by_value(q10, group(lambda s: Q10.out[(s, 0)] + Q10.out[(s, 1)])) == ["D"]

assert len([k for k in P if k.startswith("nx-dl-06-08-")]) == 10
keys = [P[f"nx-dl-06-08-q{k:02d}"]["answer"] for k in range(1, 11) if P[f"nx-dl-06-08-q{k:02d}"]["type"] == "MCQ"]
assert keys.count("B") >= 2 and keys.count("C") >= 2 and max(keys.count(x) for x in "ABCD") <= 2
for k in range(1, 11):
    q = P[f"nx-dl-06-08-q{k:02d}"]
    for blk in q["blocks"]:
        assert f"#{blk} " in L or f"#{blk}}}" in L, (q["id"], blk)
print("l6_08_minimisation: P_k = k-equivalence, n − b round bound and implication passes on 400 random machines, "
      "1996 (3), 2003 (5, histories pairwise distinguishable), 2025 (5) keys, Moore and Mealy refinements, two-pass and "
      "circular implication tables, unreachable states, flip-flop counts, compatibility, 10 practice answers OK")
