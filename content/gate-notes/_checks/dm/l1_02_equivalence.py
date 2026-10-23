"""Checks for dm/01-propositional-logic/02-equivalence-normal-forms: the classification facts, every
law (and its dual), the splitting / exportation / absurdity derivations, the false 'law' of the errata
(A 23), the falsification examples, canonical forms with maxterm numbering (C 326: Π(1, 4, 6)), the
CNF satisfiability theorems (exhaustively on small cases), Post's classes, the complete sets and the
function counts, every worked example, all twenty-three PYQ keys and the twelve practice answers."""
import itertools
import math
import pathlib
import random
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib as D  # noqa: E402
import logiclib as L  # noqa: E402

T, F_ = True, False
B = D.bank()
P = D.practice(1)
TXT = D.lesson_text(1, "02")
eq, imp, cls = L.equivalent, L.implies, L.classify


def funcs(n):
    """All Boolean functions of n variables as truth tables (rows() order)."""
    return L.all_tables(n)


# ── Classification facts and theorems ──────────────────────────────────────
assert cls("p | ~p") == "tautology" and cls("p & ~p") == "contradiction" and cls("p") == "contingency"
# negation swaps verdicts, closure facts 1-4: checked over all functions of 2 variables (as tables).
F2 = funcs(2)
taut = lambda t: all(t)  # noqa: E731
contra = lambda t: not any(t)  # noqa: E731
for a in F2:
    na = tuple(not x for x in a)
    assert taut(a) == contra(na) and (any(a)) == (not taut(na))
    for b in F2:
        if taut(a):
            assert taut(tuple(x or y for x, y in zip(a, b))) and taut(tuple((not y) or x for x, y in zip(a, b)))
        assert taut(tuple(x and y for x, y in zip(a, b))) == (taut(a) and taut(b))
        if contra(a):
            assert taut(tuple((not x) or y for x, y in zip(a, b))) and contra(tuple(x and y for x, y in zip(a, b)))
        # fact 4: C -> D and C -> ¬D tautologies => C unsatisfiable
        if taut(tuple((not x) or y for x, y in zip(a, b))) and taut(tuple((not x) or (not y) for x, y in zip(a, b))):
            assert contra(a)
# substitution keeps tautologies
assert cls("(p -> q) | (q -> p)") == "tautology" and cls("((a & b) -> c) | (c -> (a & b))") == "tautology"

# ── Equivalence vs implication ────────────────────────────────────────────
assert L.is_taut("(p -> q) <-> (~p | q)") and eq("p -> q", "~p | q")
assert imp("p & q", "p | q") and not imp("p | q", "p & q")

# ── The laws (each with its dual) ─────────────────────────────────────────
laws = [
    ("p & T", "p"), ("p | F", "p"), ("p & F", "F"), ("p | T", "T"), ("p & p", "p"), ("p | p", "p"),
    ("p & ~p", "F"), ("p | ~p", "T"), ("~~p", "p"), ("p & q", "q & p"), ("p | q", "q | p"),
    ("(p & q) & r", "p & (q & r)"), ("(p | q) | r", "p | (q | r)"),
    ("p & (q | r)", "(p & q) | (p & r)"), ("p | (q & r)", "(p | q) & (p | r)"),
    ("~(p & q)", "~p | ~q"), ("~(p | q)", "~p & ~q"), ("p & (p | q)", "p"), ("p | (p & q)", "p"),
    ("p & (~p | q)", "p & q"), ("p | (~p & q)", "p | q"),
]
for a, b in laws:
    assert eq(a, b), (a, b)


def dual(e):
    k = e[0]
    if k == "var":
        return e
    if k == "const":
        return ("const", not e[1])
    if k == "not":
        return ("not", dual(e[1]))
    return ({"and": "or", "or": "and"}[k], dual(e[1]), dual(e[2]))


for a, b in laws:
    assert eq(dual(L.parse(a)), dual(L.parse(b))), ("dual", a, b)
imp_laws = [
    ("p -> q", "~p | q"), ("p -> q", "~q -> ~p"), ("~(p -> q)", "p & ~q"), ("p | q", "~p -> q"),
    ("p <-> q", "(p -> q) & (q -> p)"), ("p <-> q", "(p & q) | (~p & ~q)"), ("p <-> q", "~p <-> ~q"),
    ("~(p <-> q)", "p <-> ~q"), ("~(p <-> q)", "p xor q"), ("(p & q) -> r", "p -> (q -> r)"),
    ("(p -> q) & (p -> r)", "p -> (q & r)"), ("(p -> q) | (p -> r)", "p -> (q | r)"),
    ("(p -> r) & (q -> r)", "(p | q) -> r"), ("(p -> r) | (q -> r)", "(p & q) -> r"),
    ("(p -> q) & (p -> ~q)", "~p"),
]
for a, b in imp_laws:
    assert eq(a, b), (a, b)
# not laws: → not commutative / associative; ∧ does not distribute over → (errata A 23)
assert not eq("p -> q", "q -> p") and not eq("(p -> q) -> r", "p -> (q -> r)")
assert not eq("p & (q -> r)", "(p & q) -> (p & r)")
assert L.counterexample("p & (q -> r)", "(p & q) -> (p & r)")["p"] is F_
assert all(not L.ev(L.parse("p & (q -> r)"), r) and L.ev(L.parse("(p & q) -> (p & r)"), r)
           for r in L.rows(list("pqr")) if not r["p"])
assert eq("p -> (q -> r)", "(p -> q) -> (p -> r)") and eq("p | (q -> r)", "(p | q) -> (p | r)")
# duality proof idea: ¬A(p) ≡ A^d(¬p)
for a, _ in laws:
    e = L.parse(a)
    vs = L.variables(e)
    for r in L.rows(vs) if vs else [{}]:
        nr = {v: not x for v, x in r.items()}
        assert (not L.ev(e, r)) == L.ev(dual(e), nr)

# ── Worked examples: classification ───────────────────────────────────────
assert [cls(f) for f in ["A <-> (A | A)", "(A | B) -> B", "A & ~(A | B)"]] == ["tautology", "contingency", "contradiction"]
assert eq("P -> ~P", "~P") and cls("P -> ~P") == "contingency" and cls("(P -> ~P) | (~P -> P)") == "tautology"
assert cls("p & (p | ~p)") == "contingency"                           # ex-class-edge: A ∧ B with A taut

# ── Worked examples: equivalence ──────────────────────────────────────────
X, Y = "(P | Q) -> R", "(P -> R) | (Q -> R)"
assert eq(X, "(P -> R) & (Q -> R)") and eq(Y, "(P & Q) -> R")
assert L.is_taut(f"({X}) -> ({Y})") and not L.is_taut(f"({Y}) -> ({X})") and not eq(X, Y)
r = {"P": T, "Q": F_, "R": F_}
assert L.ev(L.parse(Y), r) and not L.ev(L.parse(X), r)
r = {"P": T, "Q": T, "R": F_}
assert not L.ev(L.parse(Y), r) and not L.ev(L.parse(X), r)

# ── Worked examples: laws and proofs ──────────────────────────────────────
assert eq("p & (~p | q)", "p & q") and cls("p & q") == "contingency"
assert eq("(p -> q) & (p -> ~q)", "~p")
assert eq("~(p | (~p & q))", "~p & ~q")
assert eq("~p & (p | q)", "~p & q")
S = "((P & Q) -> R) -> ((P & Q) -> (Q -> R))"
assert L.is_taut(S) and eq("(P & Q) -> R", "(P & Q) -> (Q -> R)") and eq("(P & Q) -> R", "~P | ~Q | R")
# ex-proof-edge (GATE 2000): in every situation where the facts hold, the formula is true.
facts = ["a <-> (b | ~b)", "b <-> c"]
assert all(L.ev(L.parse("(a & b) -> (a & c) | d"), r) for r in L.rows(list("abcd")) if all(L.ev(L.parse(f), r) for f in facts))
assert L.parse("(a & b) -> (a & c) | d") == L.parse("(a & b) -> ((a & c) | d)")

# ── Falsification ─────────────────────────────────────────────────────────


def falsifiers(f):
    e = L.parse(f)
    vs = sorted(L.variables(e))
    return [r for r in L.rows(vs) if not L.ev(e, r)]


assert falsifiers("((a -> b) & (b -> c)) -> (a -> c)") == []           # falsify-tree scene
assert falsifiers("p | (p -> q)") == [] and falsifiers("(p | q) -> p") and falsifiers("p -> (p -> q)")
assert falsifiers("(~p | q) -> (q -> p)") == [{"p": F_, "q": T}]
assert {"a": F_, "b": F_, "c": F_} in falsifiers("(a <-> c) -> (~b -> (a & c))")
assert cls("(P -> (Q | R)) -> ((P | Q) -> R)") == "contingency"
assert {"P": F_, "Q": T, "R": F_} in falsifiers("(P -> (Q | R)) -> ((P | Q) -> R)")
# 2017 edge: (p→q)→r false ⇒ r = F, p→q = T; then (r→p)→q ≡ q.
rows17 = [r for r in L.rows(list("pqr")) if not L.ev(L.parse("(p -> q) -> r"), r)]
assert all(not r["r"] for r in rows17) and all(L.ev(L.parse("(r -> p) -> q"), r) == r["q"] for r in rows17)
assert cls("(p -> q) -> r") == "contingency"                           # not literally a contradiction

# ── Canonical forms ───────────────────────────────────────────────────────
assert L.minterms("p -> q", ["p", "q"]) == [0, 1, 3] and L.maxterms("p -> q", ["p", "q"]) == [2]
assert L.clause_index("~p | q", ["p", "q"]) == 2
f95 = "(p & q) | (~q & r)"
assert L.minterms(f95, list("pqr")) == [1, 5, 6, 7] and L.maxterms(f95, list("pqr")) == [0, 2, 3, 4]
assert eq(f95, L.cnf([0, 2, 3, 4], list("pqr"))) and eq(f95, L.dnf([1, 5, 6, 7], list("pqr")))
assert [L.clause_index(c, list("pqr")) for c in ["p | q | r", "p | ~q | r", "p | ~q | ~r", "~p | q | r"]] == [0, 2, 3, 4]
# C 326 (errata): Π(1, 4, 6), not Π(1, 3, 6).
c326 = ["P | Q | ~R", "~P | Q | R", "~P | ~Q | R"]
idx = [L.clause_index(c, list("PQR")) for c in c326]
assert idx == [1, 4, 6]
assert L.maxterms(" & ".join(f"({c})" for c in c326), list("PQR")) == [1, 4, 6]
assert L.minterms(" & ".join(f"({c})" for c in c326), list("PQR")) == [0, 2, 3, 5, 7]
minterm_rule = lambda c: int("".join("1" if v else "0" for v in L.parse_clause(c).values()), 2)  # noqa: E731
assert minterm_rule("~P | Q | R") == 3                                  # the slip the errata records
assert L.clause_index("x | y | z", list("xyz")) == 0 and L.clause_index("~x | ~y | ~z", list("xyz")) == 7
# 2008 via minterm lists
m08 = {k: L.minterms(f, ["P", "Q"]) for k, f in {"I": "P | ~Q", "II": "~(~P & Q)", "III": "(P & Q) | (P & ~Q) | (~P & ~Q)",
                                                   "IV": "(P & Q) | (P & ~Q) | (~P & Q)"}.items()}
assert m08 == {"I": [0, 2, 3], "II": [0, 2, 3], "III": [0, 2, 3], "IV": [1, 2, 3]}
# number of variables = log2(#PDNF + #PCNF)
for f, vs in [(f95, list("pqr")), ("p -> q", ["p", "q"])]:
    assert math.log2(len(L.minterms(f, vs)) + len(L.maxterms(f, vs))) == len(vs)

# ── CNF satisfiability ────────────────────────────────────────────────────


def lits(vs):
    return [v for x in vs for v in (x, "¬" + x)]


def clause_true(c, r):
    return any(r[l[1:]] is F_ if l.startswith("¬") else r[l] for l in c)


def all_clauses(vs):
    out = []
    for choice in itertools.product([None, "+", "-", "±"], repeat=len(vs)):
        c = []
        for v, ch in zip(vs, choice):
            if ch in ("+", "±"):
                c.append(v)
            if ch in ("-", "±"):
                c.append("¬" + v)
        if c:
            out.append(frozenset(c))
    return out


# half-the-clauses theorem: exhaustive over every set of clauses on 2 variables, random on 3-4 variables.
vs2 = ["p", "q"]
C2 = all_clauses(vs2)
rows2 = list(L.rows(vs2))
for mask in range(1, 2 ** len(C2)):
    cs = [c for i, c in enumerate(C2) if mask >> i & 1]
    best = max(sum(clause_true(c, r) for c in cs) for r in rows2)
    assert 2 * best >= len(cs)
rng = random.Random(7)
for n in (3, 4):
    vs = list("pqrs"[:n])
    Cn = all_clauses(vs)
    rws = list(L.rows(vs))
    for _ in range(3000):
        cs = [rng.choice(Cn) for _ in range(rng.randint(1, 12))]
        for r in rws:  # complement argument, clause by clause
            rb = {v: not x for v, x in r.items()}
            assert all(clause_true(c, r) or clause_true(c, rb) for c in cs)
        assert 2 * max(sum(clause_true(c, r) for c in cs) for r in rws) >= len(cs)
# tightness: p ∧ ¬p ∧ q ∧ ¬q has exactly 2 of 4 true under every assignment
tight = [frozenset({"p"}), frozenset({"¬p"}), frozenset({"q"}), frozenset({"¬q"})]
assert {sum(clause_true(c, r) for c in tight) for r in rows2} == {2}
# 3-CNF bound 7/8 by expectation: average over all rows of satisfied fraction equals 1 - 1/8 per clause
vs3 = list("pqr")
full3 = [frozenset(x if s else "¬" + x for x, s in zip(vs3, bits)) for bits in itertools.product([T, F_], repeat=3)]
for c in full3:
    assert sum(clause_true(c, r) for r in L.rows(vs3)) == 7
# m < 2^k clauses of k distinct literals are satisfiable: exhaustive for k = 2 over 3 variables, m ≤ 3.
k2 = [c for c in all_clauses(vs3) if len(c) == 2 and len({l.lstrip("¬") for l in c}) == 2]
for m in range(1, 4):
    for cs in itertools.combinations(k2, m):
        assert any(all(clause_true(c, r) for c in cs) for r in L.rows(vs3))
# all four 2-clauses on p, q: unsatisfiable (ex-sat-easy); maxterm counting (practice q09)
assert not L.is_sat("(p | q) & (p | ~q) & (~p | q) & (~p | ~q)") and eq("(p | q) & (p | ~q)", "p")
for cs in itertools.combinations(full3, 7):
    assert sum(all(clause_true(c, r) for c in cs) for r in L.rows(vs3)) == 1
# ex-sat-medium
sat_rows = [r for r in L.rows(vs3) if L.ev(L.parse("(p | q) & (~p | r)"), r)]
assert len(sat_rows) == 4
assert [("".join("T" if r[v] else "F" for v in vs3)) for r in sat_rows] == ["TTT", "TFT", "FTT", "FTF"]

# ── Functional completeness ───────────────────────────────────────────────
for s in [["not", "and", "or"], ["not", "and"], ["not", "or"], ["not", "imp"], ["imp", "F"], ["nand"], ["nor"]]:
    assert L.complete_set(s), s
for s in [["iff"], ["not", "iff"], ["and", "or", "imp", "iff"], ["imp"], ["xor", "iff"], ["and", "or"]]:
    assert not L.complete_set(s), s
C = L.CONNECTIVES
pc = {k: L.post_classes(v) for k, v in C.items() if k not in ("T", "F")}
assert all("T1" in pc[k] for k in ["and", "or", "imp", "iff"])                    # trap-xnor
assert {"T1", "affine"} <= pc["iff"] and "affine" in pc["not"] and "affine" in pc["xor"]
# Post table rows of the lesson
assert all("T0" in pc[k] for k in ["and", "or", "xor"]) and all("T0" not in pc[k] for k in ["not", "imp", "iff", "nand", "nor"])
assert all("T1" not in pc[k] for k in ["not", "xor", "nand", "nor"])
assert "self-dual" in pc["not"] and all("self-dual" not in pc[k] for k in ["and", "or", "imp"])
assert all("monotone" in pc[k] for k in ["and", "or"]) and all("monotone" not in pc[k] for k in ["not", "imp", "xor"])
assert all("affine" not in pc[k] for k in ["and", "or", "imp"])
maj = L._t(lambda a, b, c: (a and b) or (a and c) or (b and c), 3)
assert "self-dual" in L.post_classes(maj)
# constructions
nand = {"↑": C["nand"]}
nor = {"↓": C["nor"]}
assert eq(L.parse("p ↑ p", nand), "~p") and eq(L.parse("(p ↑ q) ↑ (p ↑ q)", nand), "p & q") and eq(L.parse("(p ↑ p) ↑ (q ↑ q)", nand), "p | q")
assert eq(L.parse("p ↓ p", nor), "~p") and eq(L.parse("(p ↓ q) ↓ (p ↓ q)", nor), "p | q")
assert eq("~p -> q", "p | q") and eq("p -> F", "~p")
# counting
n_cnt = {}
for n in (1, 2, 3):
    fs = funcs(n)
    assert len(fs) == 2 ** 2 ** n
    n_cnt[n] = {c: sum(c in L.post_classes(t) for t in fs) for c in L.CLASSES}
    n_cnt[n]["neutral"] = sum(sum(t) == 2 ** (n - 1) for t in fs)
    assert n_cnt[n]["T0"] == n_cnt[n]["T1"] == 2 ** (2 ** n - 1)
    assert n_cnt[n]["self-dual"] == 2 ** 2 ** (n - 1)
    assert n_cnt[n]["affine"] == 2 ** (n + 1)
    assert n_cnt[n]["neutral"] == math.comb(2 ** n, 2 ** (n - 1))
assert (n_cnt[2]["T0"], n_cnt[2]["self-dual"], n_cnt[2]["neutral"], n_cnt[2]["affine"]) == (8, 4, 6, 8)
assert n_cnt[3]["self-dual"] == 16 and n_cnt[3]["neutral"] == 70 and len(funcs(3)) == 256
sole = [t for t in funcs(2) if L.complete([t])]
assert sorted(sole) == sorted([C["nand"], C["nor"]]) and len(sole) == 2
cands = [t for t in funcs(2) if t[0] is F_ and t[3] is T]
assert len(cands) == 4 and sum("self-dual" in L.post_classes(t) for t in cands) == 2

# ── PYQs (keys re-derived) ────────────────────────────────────────────────
# 1991 (MSQ, key B): brute force over all F1, F2, F3 among the 16 functions of (p, q).
claims = {"A": True, "B": True, "C": True, "D": True}
for f1, f2, f3 in itertools.product(F2, repeat=3):
    c = tuple(a and b for a, b in zip(f1, f2))
    if taut(tuple((not x) or y for x, y in zip(c, f3))) and taut(tuple((not x) or (not y) for x, y in zip(c, f3))):
        claims["A"] &= taut(f1) and taut(f2)
        claims["B"] &= contra(c)
        claims["C"] &= (not taut(f1)) and (not taut(f2))
        claims["D"] &= contra(f1) and contra(f2)
forced = sorted(k for k, v in claims.items() if v)
assert forced == ["B"]
D.assert_key("cse-1991-a-3-xii", forced)      # E ("none of the above") is then false
# 1992 (MSQ, key B): parse options verbatim (→ right-associative).
q = B["cse-1992-a-2-xvi"]
D.assert_key("cse-1992-a-2-xvi", D.which(q, L.is_taut))
assert not L.is_taut("((a -> b) -> (b -> c))")   # D is not a tautology under either grouping
# 1993 (MSQ with E, key B)
q = B["cse-1993-ii-a-8-2"]
f93 = "p & (~p | q)"
verdict = {"A": cls(f93) == "tautology", "B": eq(f93, "p & q"), "C": eq(f93, "p | q"), "D": cls(f93) == "contradiction"}
verdict["E"] = not any(verdict.values())
D.assert_key("cse-1993-ii-a-8-2", sorted(k for k, v in verdict.items() if v))
# 1995 (DESC): principal CNF = Π(0, 2, 3, 4), the bank's four clauses.
bank95 = ["p | q | r", "p | ~q | r", "p | ~q | ~r", "~p | q | r"]
assert sorted(L.clause_index(c, list("pqr")) for c in bank95) == L.maxterms(f95, list("pqr"))
assert eq(" & ".join(f"({c})" for c in bank95), f95)
# 1996 (MCQ, key D): the false (non-tautological) option.
q = B["cse-1996-a-28"]
D.assert_key("cse-1996-a-28", D.which(q, lambda t: not L.is_taut(t)))
# 1997 (MCQ, key C)
D.assert_key("cse-1997-a-17", D.which(B["cse-1997-a-17"], L.is_taut))
# 1999-a (DESC): p = F, q = T falsifies (∼p ∨ q) ⇒ (q ⇒ p).
f99 = B["cse-1999-b-62-a"]["text"].split("[")[1].split("]")[0]
assert not L.ev(L.parse(f99), {"p": F_, "q": T}) and falsifiers(f99) == [{"p": F_, "q": T}]
# 1999-b (DESC): A tautology ⇒ A ∨ B tautology, over all functions of two variables (checked above too).
assert all(taut(tuple(x or y for x, y in zip(a, b))) for a in F2 if taut(a) for b in F2)
# 2000 (MCQ, key A): always true under the facts.
assert all(L.ev(L.parse("(a & b) -> (a & c) | d"), r) for r in L.rows(list("abcd")) if all(L.ev(L.parse(f), r) for f in facts))
D.assert_key("cse-2000-a-2-7", "A")
# 2001 (MCQ, key A): F1 satisfiable (contingency), F2 valid.
f1, f2 = "P -> ~P", "(P -> ~P) | (~P -> P)"
st = {"A": L.is_sat(f1) and L.is_taut(f2), "B": (not L.is_sat(f1)) and L.is_sat(f2),
      "C": (not L.is_sat(f1)) and L.is_taut(f2), "D": L.is_sat(f1) and L.is_sat(f2)}
assert st == {"A": True, "B": False, "C": False, "D": True}
# D is also literally true (both satisfiable); A is the precise, keyed statement.
D.assert_key("cse-2001-a-3", "A")
# 2002 (DESC): (i) tautology, (ii) neither, (iii) contradiction.
assert [cls(f) for f in ["A <-> (A | A)", "(A | B) -> B", "A & (~(A | B))"]] == ["tautology", "contingency", "contradiction"]
# 2004 (MCQ, key A): satisfiable but not valid.
c04 = cls(B["cse-2004-cs-70"]["text"].split("$")[1])
D.assert_key("cse-2004-cs-70", {"contingency": "A", "tautology": "B", "contradiction": "C"}[c04])
assert imp("(P | Q) -> R", "P -> (Q | R)") and not imp("P -> (Q | R)", "(P | Q) -> R")   # 2004 pitfall: conclusion is stronger
assert falsifiers("(P -> (Q | R)) -> ((P | Q) -> R)") == [{"P": T, "Q": T, "R": F_}, {"P": F_, "Q": T, "R": F_}]
# 2005 (MCQ, key B)
sub = lambda t: t.replace("X", f"({X})").replace("Y", f"({Y})")  # noqa: E731
q = B["cse-2005-cs-40"]
D.assert_key("cse-2005-cs-40", D.which(q, lambda t: L.is_taut(sub(t))))
# 2006 (MCQ, key D): both P1 and P2 are not tautologies (≡ read as ↔).
P1 = "((A & B) -> C) <-> ((A -> C) & (B -> C))"
P2 = "((A | B) -> C) <-> ((A -> C) | (B -> C))"
assert not L.is_taut(P1) and not L.is_taut(P2)
assert not L.ev(L.parse(P1), {"A": T, "B": F_, "C": F_}) and not L.ev(L.parse(P2), {"A": T, "B": F_, "C": F_})
assert L.parse(B["cse-2006-cs-27"]["text"].split("P1: $")[1].split("$")[0]) == L.parse(P1)
D.assert_key("cse-2006-cs-27", "D")
# 2007 (MCQ, key A): proved exhaustively above (half-clauses); B refuted by p ∧ ¬p; C contradicts A.
assert not L.is_sat("p & ~p")
D.assert_key("cse-2007-cs-48", "A")
# 2008 (MCQ, key B): I, II, III equivalent.
same = sorted(k for k, v in m08.items() if v == m08["I"])
assert same == ["I", "II", "III"]
D.assert_key("cse-2008-cs-31", "B")
# IT 2008 (MCQ, key A): the incomplete set.
sets08 = {"A": ["iff"], "B": ["imp", "not"], "C": ["or", "not"], "D": ["nand"]}
D.assert_key("it-2008-it-1", [k for k, s in sets08.items() if not L.complete_set(s)])
# 2014-2 (MCQ, key B): parse options, find the non-tautology.
D.assert_key("cse-2014-2-cs-53", D.which(B["cse-2014-2-cs-53"], lambda t: not L.is_taut(t)))
# 2015 (MCQ, key C)
D.assert_key("cse-2015-1-cs-14", D.which(B["cse-2015-1-cs-14"], lambda t: not eq(t, "p <-> q")))
# 2017-1-1 (MCQ, key D): II and III.
st17 = {"I": "p -> q", "II": "q -> p", "III": "~q | p", "IV": "~p | q"}
good = sorted(k for k, f in st17.items() if eq(f, "~p -> ~q"))
assert good == ["II", "III"]
D.assert_key("cse-2017-1-cs-1", "D")
# 2017-1-29 (MCQ, key D): given (p→q)→r false.
opts29 = {"A": lambda rs: all(L.ev(L.parse("(r -> p) -> q"), r) for r in rs),
          "B": lambda rs: not any(L.ev(L.parse("(r -> p) -> q"), r) for r in rs),
          "C": lambda rs: all(L.ev(L.parse("(r -> p) -> q"), r) for r in rs if not r["p"]),
          "D": lambda rs: all(L.ev(L.parse("(r -> p) -> q"), r) for r in rs if r["q"])}
D.assert_key("cse-2017-1-cs-29", sorted(k for k, fn in opts29.items() if fn(rows17)))
# 2021-1 (MCQ, key B)
s1, s2 = "(~p & (p | q)) -> q", "q -> (~p & (p | q))"
v21 = (L.is_taut(s1), L.is_taut(s2))
D.assert_key("cse-2021-1-cs-7", {(T, T): "A", (T, F_): "B", (F_, T): "C", (F_, F_): "D"}[v21])
# 2021-2 (MSQ, key B; D)
c21 = {"A": cls(S) == "contingency", "B": cls(S) == "tautology", "C": cls(S) == "contradiction",
       "D": eq("(P & Q) -> R", "(P & Q) -> (Q -> R)")}
D.assert_key("cse-2021-2-cs-15", sorted(k for k, v in c21.items() if v))

# ── Practice ───────────────────────────────────────────────────────────────
q = P["nx-dm-01-02-q01"]
D.assert_mcq(q, D.which(q, lambda t: cls(t) == "contingency")[0])
D.assert_nat(P["nx-dm-01-02-q02"], len(L.minterms("p -> (q & r)", list("pqr"))))
q = P["nx-dm-01-02-q03"]
pc3 = L.maxterms("(p | q | ~r) & (~p | q | r)", list("pqr"))
D.assert_mcq(q, D.which(q, lambda t: t == f"$\\Pi({', '.join(map(str, pc3))})$")[0])
assert pc3 == [1, 4] and sorted(minterm_rule(c) for c in ["p | q | ~r", "~p | q | r"]) == [3, 6]
q = P["nx-dm-01-02-q04"]
D.assert_msq(q, D.which(q, lambda t: eq(t, "p -> (q -> r)")))
q = P["nx-dm-01-02-q05"]
sets5 = {"A": ["not", "or"], "B": ["imp", "F"], "C": ["nor"], "D": ["and", "or", "imp", "iff"]}
D.assert_mcq(q, [k for k, s in sets5.items() if not L.complete_set(s)][0])
D.assert_nat(P["nx-dm-01-02-q06"], n_cnt[3]["self-dual"])
q = P["nx-dm-01-02-q07"]
lhs, rhs = L.parse("p | (p & q)"), L.parse("p")


def is_dual_of_absorption(t):
    a, b = t.strip("$").split("\\equiv")
    return L.parse(a) == dual(lhs) and L.parse(b) == dual(rhs)


D.assert_mcq(q, D.which(q, is_dual_of_absorption)[0])
assert all(eq(*t.strip("$").split("\\equiv")) for l, t in D.opts(q).items() if l in ("A", "D"))
assert not eq(*D.opts(q)["B"].strip("$").split("\\equiv")) and not eq(*D.opts(q)["C"].strip("$").split("\\equiv"))
q = P["nx-dm-01-02-q08"]
c8 = cls("((p -> q) -> p) -> p")
assert c8 == "tautology"
D.assert_mcq(q, "C")
D.assert_nat(P["nx-dm-01-02-q09"], 1)
q = P["nx-dm-01-02-q10"]
D.assert_msq(q, D.which(q, L.is_taut))
q = P["nx-dm-01-02-q11"]
D.assert_mcq(q, D.which(q, lambda t: L.minterms(t, ["p", "q"]) == [0, 3])[0])
D.assert_nat(P["nx-dm-01-02-q12"], len(sole))
assert len([k for k in P if k.startswith("nx-dm-01-02-")]) == 12

# Radar marks line (7 one-mark, 11 two-mark, 4 descriptive, 1 unmarked MSQ) recomputed from the bank.
PYQ02 = [k for k in B if k in TXT and B[k]["subject"] == "dm" and f'pyq{{id="{k}"' in TXT]
assert len(PYQ02) == 23
dsc = [k for k in PYQ02 if B[k]["type"] == "DESC"]
assert len(dsc) == 4 and sum(B[k]["marks"] == 1 for k in PYQ02 if k not in dsc) == 7
assert sum(B[k]["marks"] == 2 for k in PYQ02 if k not in dsc) == 11 and sum(B[k]["marks"] is None for k in PYQ02 if k not in dsc) == 1
D.must_contain(TXT, "\\Pi(1, 4, 6)", "\\Pi(0, 2, 3, 4)", "\\Sigma(0, 2, 3)", "$2^{2^n}$",
               "$p \\wedge (\\neg p \\vee q) \\equiv p \\wedge q$", "Exactly **2** of the 16 binary connectives")
print("l1_02_equivalence: laws and duals, falsification, canonical forms (Π(1, 4, 6)), CNF bounds, Post classes, "
      "23 PYQ keys and 12 practice answers OK")
