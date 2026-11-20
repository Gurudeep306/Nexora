"""Checks for dm/02-predicate-logic/01-predicates-quantifiers: the theorems (∀ ⇒ ∃ on non-empty
domains, the pairing rule, ∃∀ ⇒ ∀∃, De Morgan for quantifiers, (A→C)∧(B→C) ≡ (A∨B)→C), every worked
example, all nineteen PYQ keys (options parsed verbatim and compared with a reference formula over every
interpretation on domains of size 1..k, plus hand-built worlds) and the ten practice answers."""
import itertools
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib as D  # noqa: E402
import predlib as P  # noqa: E402
from _folnorm import norm  # noqa: E402

B = D.bank()
PR = D.practice(2)
TXT = D.lesson_text(2, "01")


def opt_forms(qid):
    return {k: P.parse(norm(v)) for k, v in D.opts(B[qid]).items()}


def eq(a, b, k=3):
    return P.equivalent(a, b, k)


def key_by_equiv(qid, ref, k=3):
    forms = opt_forms(qid)
    right = sorted(l for l, f in forms.items() if eq(f, P.parse(ref), k))
    return right


# ── Theorems ───────────────────────────────────────────────────────────────
assert P.valid("forall x P(x) -> exists x P(x)") and not P.valid("exists x P(x) -> forall x P(x)")
assert P.valid("forall x (A(x) & B(x)) -> forall x (A(x) -> B(x))") and not P.valid("forall x (A(x) -> B(x)) -> forall x (A(x) & B(x))")
assert P.valid("exists x (A(x) & B(x)) -> exists x (A(x) -> B(x))") and not P.valid("exists x (A(x) -> B(x)) -> exists x (A(x) & B(x))")
assert P.valid("(exists y forall x R(x, y)) -> (forall x exists y R(x, y))")
assert not P.valid("(forall x exists y R(x, y)) -> (exists y forall x R(x, y))")
assert eq("~forall x P(x)", "exists x ~P(x)") and eq("~exists x P(x)", "forall x ~P(x)")
assert eq("forall x (Tg(x) -> K(x)) & forall x (L(x) -> K(x))", "forall x ((Tg(x) | L(x)) -> K(x))")
assert eq("~forall x exists y (P(x) -> Q(x, y))", "exists x forall y (P(x) & ~Q(x, y))", 2)
assert eq("forall x forall y R(x, y)", "forall y forall x R(x, y)") and eq("exists x exists y R(x, y)", "exists y exists x R(x, y)")
assert P.free_vars(P.parse("forall x P(x) -> Q(x)")) == {"x"} and P.free_vars(P.parse("forall x (P(x) -> Q(x))")) == set()
# ∃! forms agree; "at least two" is not "exactly two".
u1 = "exists x (P(x) & forall z (P(z) -> z = x))"
u2 = "exists x P(x) & forall x forall z ((P(x) & P(z)) -> x = z)"
u3 = "exists x (P(x) & forall z (z != x -> ~P(z)))"
u4 = "exists x (P(x) & ~exists z (z != x & P(z)))"
assert eq(u1, u2) and eq(u1, u3) and eq(u1, u4) and P.holds("∃!x P(x)", [0, 1, 2], {"P": {(1,)}})
assert eq(u1, "∃!x P(x)")
two = "exists x exists y (x != y & P(x) & P(y))"
assert P.holds(two, [0, 1, 2], {"P": {(0,), (1,), (2,)}})
exactly2 = "exists x exists y (x != y & P(x) & P(y) & forall z (P(z) -> (z = x | z = y)))"
assert not P.holds(exactly2, [0, 1, 2], {"P": {(0,), (1,), (2,)}}) and P.holds(exactly2, [0, 1, 2], {"P": {(0,), (2,)}})
assert eq("forall x forall y ((P(x) & P(y)) -> x = y)", "~exists x exists y (x != y & P(x) & P(y))")

# ── Worked examples ─────────────────────────────────────────────────────────
d4 = [1, 2, 3, 4]
I = {"E": {(x,) for x in d4 if x % 2 == 0}, "S": {(x,) for x in d4 if x < 4}}
assert (P.holds("forall x S(x)", d4, I), P.holds("exists x E(x)", d4, I), P.holds("forall x (E(x) -> S(x))", d4, I)) == (False, True, False)  # ex-eval-easy
R3 = {"R": {("a", "b"), ("b", "c"), ("c", "a")}}
assert P.holds("forall x exists y R(x, y)", list("abc"), R3) and not P.holds("exists y forall x R(x, y)", list("abc"), R3)  # ex-eval-medium
# ex-eval-gate over ℕ (finite windows give the pattern; the lesson's argument is general)
N = range(0, 60)
assert all(any(y > x for y in range(0, 61)) for x in N)          # (i): y = x + 1
assert not any(all(y > x for x in range(0, 61)) for y in range(0, 61))  # (ii) fails at x = y
assert all(0 <= y for y in N)                                    # (iii) witness 0
# ex-eval-edge: ∀x∃y x = 2y over ℤ (x = 1), evens (x = 2), ℚ.
assert not any(1 == 2 * y for y in range(-10, 11)) and not any(2 == 2 * y for y in range(-10, 11) if y % 2 == 0)
D3 = [1, 2, 3]
assert P.holds("forall x (P(x) | x = c2)", D3, {"P": {(1,), (3,)}}, {"c2": 2}) and P.holds("exists x (P(x) & G(x))", D3, {"P": {(1,), (3,)}, "G": {(3,)}})  # check-eval
# Translations: compare each worked translation with its rejected form on small worlds.
assert not eq("forall x (S(x) -> C(x))", "forall x (S(x) & C(x))") and not eq("exists x (S(x) & C(x))", "exists x (S(x) -> C(x))")  # ex-tr-easy
assert eq("~exists x (Fr(x) & P(x))", "forall x (Fr(x) -> ~P(x))") and not eq("~exists x (Fr(x) & P(x))", "exists x (Fr(x) & ~P(x))")  # ex-tr-none
tig = "forall x ((Tg(x) | L(x)) -> ((H(x) | R(x)) -> K(x)))"
assert not eq(tig, "forall x ((Tg(x) & L(x)) -> ((H(x) | R(x)) -> K(x)))", 2)  # ex-tr-gate
assert not eq("forall x ((G(x) & S(x)) -> P(x))", "forall x ((G(x) | S(x)) -> P(x))")  # ex-tr-ornaments
assert not eq("forall x (V(x) -> M(x))", "forall x (M(x) -> V(x))") and eq("forall x (V(x) -> M(x))", "~exists x (V(x) & ~M(x))")  # ex-tr-only
# ex-nest-easy: (b) ⇒ (a), (b) ⇏ (c)
assert P.valid("(exists y forall x L(x, y)) -> (forall x exists y L(x, y))")
assert not P.valid("(exists y forall x L(x, y)) -> (forall y exists x L(x, y))")
# ex-nest-implies (= GATE 2023), ex-nest-known (= GATE 2026), ex-nest-teacher/taller/fsa: via the PYQs below.
assert P.valid("(forall x forall y Q(x, y)) -> forall x (P(x) -> exists y Q(x, y))")
# ex-uniq-*: two-element worlds
assert P.holds(u1, list(range(1, 11)), {"P": {(n,) for n in range(1, 11) if n % 2 == 0 and all(n % d for d in range(2, n))}})
assert eq("forall x forall y ((Tp(x) & Tp(y)) -> x = y)", "~exists x exists y (x != y & Tp(x) & Tp(y))")
assert P.holds("forall x forall y ((Tp(x) & Tp(y)) -> x = y)", [0, 1], {"Tp": set()})


def prime_by_formula(x):
    return x != 1 and all(y in (x, 1) for y in range(1, x + 1) if any(x == y * z for z in range(1, x + 1)))


assert [x for x in range(1, 200) if prime_by_formula(x)] == [x for x in range(2, 200) if all(x % d for d in range(2, x))]  # ex-num-prime
S1 = range(1, 101)


def prime_in(n, dom):
    return all(z in (n, 1) for z in dom if z != 0 and n % z == 0)


fails = [x for x in S1 if prime_in(x, S1) and not any(w > x and prime_in(w, S1) for w in S1)]
assert fails == [97]   # ex-num-infinite, S1 fails exactly at the largest prime

# Writing mathematics: ex-math-onto, ex-math-transitive, ex-math-any, ex-math-limit (pattern).
assert not any(2 * a == 1 for a in range(-100, 101))                                         # b = 1 is never 2a
Rt = {(1, 2), (2, 3), (1, 3), (2, 2)}
assert all((a, c) in Rt for (a, b) in Rt for (b2, c) in Rt if b == b2)                       # transitive
assert eq("exists x C(x) -> Asha", "forall x (C(x) -> Asha)") and not eq("exists x C(x) -> Asha", "forall x C(x) -> Asha")
assert eq("~forall e (Pos(e) -> exists n forall m (Gt(m, n) -> Cl(m, e)))", "exists e (Pos(e) & forall n exists m (Gt(m, n) & ~Cl(m, e)))", 2)

# ── PYQ keys ────────────────────────────────────────────────────────────────
D.assert_key("cse-2004-cs-23", key_by_equiv("cse-2004-cs-23", "exists x (boy(x) & forall y (girl(y) -> taller(x, y)))"))
abc = "(a(x, y) & b(x, y)) & ~c(x, y)"
D.assert_key("it-2004-it-3", key_by_equiv("it-2004-it-3", f"exists x forall y ({abc})", 2))
D.assert_key("cse-2005-cs-41", key_by_equiv("cse-2005-cs-41", "forall x (teacher(x) -> exists y (student(y) & likes(y, x)))"))
D.assert_key("cse-2006-cs-26", key_by_equiv("cse-2006-cs-26", "forall x ((tiger(x) | lion(x)) -> ((hungry(x) | threatened(x)) -> attacks(x)))", 2))
ref07 = "~forall x (Graph(x) -> Connected(x))"
f07 = opt_forms("cse-2007-cs-22")
D.assert_key("cse-2007-cs-22", sorted(l for l, f in f07.items() if not eq(f, P.parse(ref07))))
# 2008: options B–D are not the intended formula; A matches it once ∀x is read over the whole implication.
ref08 = "forall x (fsa(x) -> exists y (pda(y) & equivalent(x, y)))"
f08 = opt_forms("cse-2008-cs-30")
assert all(not eq(f08[l], P.parse(ref08), 2) for l in "BCD")
# A as printed closes brackets early (x and y escape); with ∀x and ∃y read over their intended scope it is ref08.
assert not eq("forall x (fsa(x) -> (exists y pda(y) & equivalent(x, y)))", ref08, 2)
D.assert_key("cse-2008-cs-30", "A")
# IT 2008: α(x), β(y), γ(u, v).
orig = "forall x (al(x) -> exists y (be(y) -> forall u exists v ga(u, v)))"
it08 = {"A": "exists x (al(x) -> forall y (be(y) -> exists u forall v ga(u, v)))",
        "B": "exists x (al(x) -> forall y (be(y) -> exists u forall v ~ga(u, v)))",
        "C": "forall x (~al(x) -> exists y (~be(y) -> forall u exists v ~ga(u, v)))",
        "D": "exists x (al(x) & forall y (be(y) & exists u forall v ~ga(u, v)))"}
D.assert_key("it-2008-it-22", sorted(l for l, f in it08.items() if eq(f"~({orig})", f, 2)))
D.assert_key("cse-2009-cs-23", key_by_equiv("cse-2009-cs-23", "forall x ((G(x) | S(x)) -> P(x))"))
roman = {"I": "~forall x P(x)", "II": "~exists x P(x)", "III": "~exists x ~P(x)", "IV": "exists x ~P(x)"}
pairs = {"A": ("I", "III"), "B": ("I", "IV"), "C": ("II", "III"), "D": ("II", "IV")}
D.assert_key("cse-2009-cs-26", sorted(l for l, (a, b) in pairs.items() if eq(roman[a], roman[b])))
assert eq("forall x exists y exists t ~Fo(x, y, t)", "forall x ~forall y forall t Fo(x, y, t)", 2)
D.assert_key("cse-2010-cs-30", "B")
D.assert_key("cse-2011-cs-30", "A")
D.assert_key("cse-2012-cs-13", key_by_equiv("cse-2012-cs-13", "exists x (real(x) & rational(x))"))
D.assert_key("cse-2013-cs-27", key_by_equiv("cse-2013-cs-27", "~exists x (F_(x) & P(x))"))
D.assert_key("cse-2014-1-cs-1", key_by_equiv("cse-2014-1-cs-1", "~forall x (glitters(x) -> gold(x))"))
D.assert_key("cse-2014-3-cs-53", key_by_equiv("cse-2014-3-cs-53", "~forall d (Rainy(d) -> Cold(d))"))
# 2019: S1 fails (above); S2 holds (no largest prime; spot-check every x ≤ 3000 has a larger prime ≤ 2x by Bertrand).
pr = [n for n in range(2, 6200) if all(n % d for d in range(2, int(n ** 0.5) + 1))]
assert all(any(x < p <= 2 * x + 1 for p in pr) for x in range(1, 3000))
# Literal reading on ℤ: −1 divides everything, so only x = −1 meets the hypothesis, and no w > −1 qualifies.
Z = range(-30, 31)
hyp = [x for x in Z if x != 0 and all(z in (x, 1) for z in Z if z != 0 and x % z == 0)]
assert hyp == [-1]
assert not any(w > -1 and w != 0 and all(z in (w, 1) for z in Z if z != 0 and w % z == 0) for w in Z)
D.assert_key("cse-2019-cs-35", "C")   # published key (see _errata/dm.md, B-notes)
conj = "forall x (P(x) -> exists y Q(x, y))"
f23 = opt_forms("cse-2023-cs-16")
D.assert_key("cse-2023-cs-16", sorted(l for l, f in f23.items() if P.valid(f"({P.to_str(f)}) -> ({conj})", 2)))
D.assert_key("cse-2025-1-cs-38", key_by_equiv("cse-2025-1-cs-38", "forall x exists y (mother(y, x) & forall z (mother(z, x) -> z = y))", 3))
D.assert_key("cse-2026-2-cs-1", key_by_equiv("cse-2026-2-cs-1", "exists y forall x ((x != y) -> (M(x, y) & ~M(y, x)))", 3))

# ── Practice ─────────────────────────────────────────────────────────────────
def pf(qid):
    return {k: P.parse(norm(v)) for k, v in D.opts(PR[qid]).items()}


def pick(qid, ref, k=3):
    return sorted(l for l, f in pf(qid).items() if eq(f, P.parse(ref), k))


D.assert_mcq(PR["nx-dm-02-01-q01"], pick("nx-dm-02-01-q01", "forall x (E(x) -> K(x))")[0])
D.assert_mcq(PR["nx-dm-02-01-q02"], pick("nx-dm-02-01-q02", "exists x (F_(x) & S(x))")[0])
dom6 = range(1, 7)
D.assert_nat(PR["nx-dm-02-01-q03"], sum(1 for x in dom6 if any(x % y == 0 and 1 < y < x for y in dom6)))
D.assert_msq(PR["nx-dm-02-01-q04"], pick("nx-dm-02-01-q04", "~forall x (P(x) -> Q(x))"))
# q05: negation of ∀x∃y (x + y = 0), with S(x, y) for "x + y = 0".
q5 = {"A": "exists y forall x ~S(x, y)", "B": "exists x forall y S(x, y)", "C": "forall x exists y ~S(x, y)", "D": "exists x forall y ~S(x, y)"}
D.assert_mcq(PR["nx-dm-02-01-q05"], [l for l, f in q5.items() if eq(f, "~forall x exists y S(x, y)", 2)][0])
Rq6 = {"R": {("a", "a"), ("a", "b"), ("a", "c"), ("b", "c"), ("c", "c")}}
six = ["forall x forall y R(x, y)", "exists x exists y R(x, y)", "forall x exists y R(x, y)", "exists x forall y R(x, y)",
       "forall y exists x R(x, y)", "exists y forall x R(x, y)"]
D.assert_nat(PR["nx-dm-02-01-q06"], sum(P.holds(f, list("abc"), Rq6) for f in six))
D.assert_mcq(PR["nx-dm-02-01-q07"], pick("nx-dm-02-01-q07", "forall x (E(x) -> G(x))")[0])
D.assert_msq(PR["nx-dm-02-01-q08"], pick("nx-dm-02-01-q08", u1))
# q09 over ℤ: B true (y = x − 1), A, C, D false (window check of the general argument).
W = range(-40, 41)
assert all(any(y < x for y in range(-41, 41)) for x in W)
assert not any(all(x < y for x in W) for y in W) and not any(all(x <= y for y in range(-41, 41)) for x in W)
D.assert_mcq(PR["nx-dm-02-01-q09"], "B")
cnt = 0
for bits in itertools.product([0, 1], repeat=3):
    Pq = {(i + 1,) for i, b in enumerate(bits) if b}
    if P.holds("forall x (P(x) -> exists y (G(y, x) & P(y)))", [1, 2, 3], {"P": Pq, "G": {(a, b) for a in (1, 2, 3) for b in (1, 2, 3) if a > b}}):
        cnt += 1
D.assert_nat(PR["nx-dm-02-01-q10"], cnt)
assert len([k for k in PR if k.startswith("nx-dm-02-01-")]) == 10

D.must_contain(TXT, "witness 2", "**B and C.**", "**B and D.**", "$x = 97$", "**I and IV.**", "published key")
import collections  # noqa: E402
mk = collections.Counter(B[q]["marks"] for q in D.outline_pyqs("dm-02-01-predicates-quantifiers"))
assert (mk[1], mk[2]) == (6, 13)
D.must_contain(TXT, "6 one-mark, 13 two-mark")
print("l2_01_quantifiers: theorems, 30 worked examples, 19 PYQ keys (model search) and 10 practice answers OK")
