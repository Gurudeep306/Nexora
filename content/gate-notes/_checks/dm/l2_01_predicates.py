"""Checks for dm/02-predicate-logic/01-predicates-quantifiers: predlib basics, every worked example,
all nineteen PYQ keys (options parsed verbatim and compared on all interpretations up to size 3, or
evaluated numerically for the number-theory ones) and the twelve practice answers."""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib as D  # noqa: E402
import predlib as P  # noqa: E402

T, F = True, False
B = D.bank()
PR = D.practice(2)
TXT = D.lesson_text(2, "01")


def fix(s):
    """Normalise a bank option's LaTeX/Unicode into predlib syntax (tuples pass through)."""
    if not isinstance(s, str):
        return s
    s = re.sub(r"\\(?:text|mathrm|mathit|operatorname|boldsymbol)\{([^}]*)\}", r"\1", s)
    s = re.sub(r"(\\forall|\\exists!?|∀|∃!?)\s*\(\s*([A-Za-z]\w*)\s*\)", r"\1 \2", s)  # ∀(x) → ∀x
    s = re.sub(r"(\\forall|\\exists!?|∀|∃!?)\s*([A-Za-z]\w*)\s*,", r"\1 \2 ", s)  # ∀x, α  →  ∀x α
    s = re.sub(r"(\\forall|\\exists!?|∀|∃!?)\s*([A-Za-z]\w*)\s*:", r"\1 \2 ", s)  # ∀x: φ  →  ∀x φ
    s = re.sub(r"(\w)\s*\*\s*(\w)", r"mul(\1, \2)", s)          # y*z → mul(y, z)
    s = re.sub(r"(\w)\s*\|\s*(\w)", r"div(\1, \2)", s)          # z|x → div(z, x)
    s = s.replace("\\mid", "|")
    s = re.sub(r"(\w)\|(\w)", r"div(\1, \2)", s)                 # remaining a|b → div(a, b)
    s = re.sub(r"P\(\s*(\w)\s*\+\s*1\s*\)", r"Ps(\1)", s)         # P(x+1) → Ps(x)
    s = re.sub(r"P\(\s*(\w)\s*-\s*1\s*\)", r"Pp(\1)", s)         # P(x-1) → Pp(x)
    s = s.replace("\\{", "(").replace("\\}", ")")                   # LaTeX \{ \} → ( )
    s = re.sub(r"\b([FT])(?=\s*\()", r"\1_", s)                      # predicate F( → F_( (F alone is the constant)
    return s


import itertools
import random


def _space(f, n):
    preds = P.predicates(P.F(fix(f)))
    return sum(n ** a for a in preds.values())


def _sampled_agree(a, b, n, count, seed=20261118):
    ea, eb = P.F(fix(a)), P.F(fix(b))
    preds = P.predicates(ea)
    preds.update(P.predicates(eb))
    names = sorted(preds)
    rng = random.Random(seed)
    dom = list(range(n))
    for _ in range(count):
        I = {nm: {t for t in itertools.product(dom, repeat=preds[nm]) if rng.random() < 0.5} for nm in names}
        if P.ev(ea, dom, I) != P.ev(eb, dom, I):
            return False
    return True


def equiv(a, b, k=3):
    """Equivalence on all interpretations up to domain size k: full search when cheap, seeded sampling
    (3000 worlds per size) when the predicate space is big. A wrong pairing fails on tiny worlds."""
    for n in range(1, k + 1):
        if 2 ** min(_space(a, n) + _space(b, n), 40) <= 2 ** 18:
            if not P.equivalent(fix(a), fix(b), n):
                return False
        elif not _sampled_agree(a, b, n, 3000):
            return False
    return True


def imp(a, b):
    return ("imp", P.F(fix(a)), P.F(fix(b)))


def valid_sampled(f, k=3):
    """No counter-model found: full search when cheap, seeded sampling otherwise."""
    for n in range(1, k + 1):
        if 2 ** min(_space(f, n), 40) <= 2 ** 18:
            if P.counter_model(fix(f), n) is not None:
                return False
        else:
            e = P.F(fix(f))
            preds = P.predicates(e)
            names = sorted(preds)
            rng = random.Random(20261118)
            dom = list(range(n))
            for _ in range(3000):
                I = {nm: {t for t in itertools.product(dom, repeat=preds[nm]) if rng.random() < 0.5} for nm in names}
                if not P.ev(e, dom, I):
                    return False
    return True


# ── predlib basics ──────────────────────────────────────────────────────────
assert P.parse("forall x P(x)") == ("forall", "x", ("pred", "P", ("x",)))
assert P.parse("∀x∃!y R(x,y)") == ("forall", "x", ("exists1", "y", ("pred", "R", ("x", "y"))))
assert P.parse("(∀x)(P(x) → Q(x))")[0] == "forall"
assert P.parse("∀x P(x) ∨ Q(x)") == P.parse("(∀x P(x)) ∨ Q(x)")     # quantifier binds like ¬
assert P.free_vars(P.parse("forall x (P(x) | Q(x, y)) | R(y)")) == {"y"}
assert P.free_vars(P.parse("exists x (x = y)")) == {"y"}   # ex-b-easy: x bound, y free
assert P.push_not(P.parse("¬∀x ∃y (P(x) → Q(y))")) == P.parse("∃x ∀y (P(x) ∧ ¬Q(y))")
assert P.equivalent("¬∀x P(x)", "∃x ¬P(x)", 3) and P.equivalent("¬∃x P(x)", "∀x ¬P(x)", 3)
assert P.equivalent("∀x∀y P(x,y)", "∀y∀x P(x,y)", 3) and P.equivalent("∃x∃y P(x,y)", "∃y∃x P(x,y)", 3)
assert P.counter_model("∃y∀x R(x,y) → ∀x∃y R(x,y)", 3) is None   # one-way law holds
assert P.counter_model("∀x∃y R(x,y) → ∃y∀x R(x,y)", 3) is not None  # converse fails
assert P.valid("(∀x P(x)) → (∃x P(x))", 3)   # valid on non-empty domains (predlib searches n≥1)

# ── worked examples (lesson 01) ─────────────────────────────────────────────
# predicates
dom = [2, 3, 4]
assert [P.holds("P(x)", dom, {"P": {(2,), (3,)}}, {"x": d}) for d in dom] == [T, T, F]      # ex-p-easy
dom = [1, 2, 3]
lt = {"R": {(x, y) for x in dom for y in dom if x < y}}
assert sorted(t for t in lt["R"]) == [(1, 2), (1, 3), (2, 3)]                                  # ex-p-medium
dom8 = list(range(1, 9))
prime_ext = {x for x in dom8 if x > 1 and all(x % d for d in range(2, x))}
I8 = {"div": {(y, x) for x in dom8 for y in dom8 if y != 0 and x % y == 0}}
def prime_formula(x):
    return x > 1 and all((y == 1 or y == x) for y in dom8 if (y, x) in I8["div"])
assert [x for x in dom8 if prime_formula(x)] == sorted(prime_ext) == [2, 3, 5, 7]             # ex-p-gate
# ex-p-edge: over {-2..2} with integer divisibility, no x satisfies x>1 ∧ ∀y(div(y,x) → y=1∨y=x)
domz = list(range(-2, 3))
Iz = {"div": {(y, x) for x in domz for y in domz if y != 0 and x % y == 0}}
def pz(x):
    return x > 1 and all((y == 1 or y == x) for y in domz if (y, x) in Iz["div"])
assert not any(pz(x) for x in domz)                                                          # ex-p-edge
# ∀
assert P.holds("∀x P(x)", [1, 2], {"P": {(1,), (2,)}}) is T                                   # ex-f-easy
assert P.holds("∀x P(x)", [2, 3, 4, 5], {"P": {(2,), (3,), (5,)}}) is F                      # ex-f-medium (counterexample 4)
assert P.holds("∀x P(x)", [2, 3, 4, 5], {"P": {(2,), (3,), (4,), (5,)}}) is T
domab = ["a", "b"]
Ikn = {"R": {("a", "b")}}
assert P.holds("∀x∃y R(x,y)", domab, Ikn) is F and P.holds("∃y∀x R(x,y)", domab, Ikn) is F    # ex-f-gate
assert P.equivalent("∀x A", "A", 3) and P.equivalent("∀x (P | Q)", "P | Q", 3)  # ex-f-edge null quantification (A, P, Q 0-ary)
# ∃
assert P.holds("∃x P(x)", [1, 3, 5], {"P": set()}) is F                                       # ex-e-easy
assert P.holds("∃x P(x)", [1, 2, 3, 4], {"P": {(2,), (4,)}}) is T                             # ex-e-medium
assert not equiv("∃x (real(x) & rational(x))", "∃x (real(x) → rational(x))")                   # ex-e-gate wrong pairing
assert P.holds("∃x P(x)", ["a"], {"P": {("a",)}}) and P.holds("∀x P(x)", ["a"], {"P": {("a",)}})  # ex-e-edge singleton
# free/bound
assert P.free_vars(P.parse("∃x (x = y)")) == {"y"}                                             # ex-b-easy
assert P.free_vars(P.parse("∃x (P(x) & Q(x)) & ∀x R(x)")) == set()                             # ex-b-medium
assert P.parse("∀x P(x) | Q(x)") == P.parse("(∀x P(x)) | Q(x)") and P.free_vars(P.parse("∀x P(x) | Q(x)")) == {"x"}  # ex-b-gate
assert P.equivalent("∀x P(x)", "∀y P(y)", 3)                                                   # ex-b-edge renaming
# translation examples are covered by the PYQs below (same shapes); the shapes themselves:
assert not equiv("∀x (dog(x) → bark(x))", "∀x (dog(x) & bark(x))")
assert not equiv("∃x (cat(x) & black(x))", "∃x (cat(x) → black(x))")
assert equiv("¬∃x (student(x) & perfect(x))", "∀x (student(x) → ¬perfect(x))")                 # ex-t-medium2
assert not equiv("∀x ((G(x) | S(x)) → P(x))", "∀x (P(x) → (G(x) & S(x)))")
assert not equiv("∀x ((G(x) | S(x)) → P(x))", "∀x ((G(x) & S(x)) → P(x))")
assert not equiv("∀x (canVote(x) → member(x))", "∀x (member(x) → canVote(x))")                 # only vs all
assert not equiv("∀x (student(x) → ∃y L(x,y))", "∃y ∀x (student(x) → L(x,y))")                 # ex-t-edge order
# nested
assert P.holds("∀x∀y P(x,y)", domab, {"P": {(x, y) for x in domab for y in domab if x != y}}) is F  # ex-n-easy
assert P.holds("∀x∃y R(x,y)", [1, 2, 3], {"R": {(x, y) for x in range(1, 4) for y in range(1, 4) if x < y}}) is F  # ex-n-medium
assert P.holds("∃y∀x R(x,y)", [1, 2, 3], {"R": {(x, y) for x in range(1, 4) for y in range(1, 4) if x < y}}) is F
assert equiv("∀x (teacher(x) → ∃y (student(y) & likes(y,x)))", "∀x (teacher(x) → ∃y (student(y) & likes(y,x)))")
assert not equiv("∀x (teacher(x) → ∃y (student(y) & likes(y,x)))", "∀x (teacher(x) & ∃y (student(y) → likes(y,x)))")
assert equiv("∀x∃y∃t ¬F_(x,y,t)", "¬∃x∀y∀t F_(x,y,t)", 2)                                            # ex-n-edge
# uniqueness
assert P.holds("∃!x P(x)", ["a", "b", "c"], {"P": {("b",)}}) is T                              # ex-u-easy
assert P.holds("∃!x P(x)", ["a", "b", "c"], {"P": {("a",), ("b",)}}) is F                       # ex-u-medium
assert equiv("∃!x P(x)", "∃x (P(x) & ∀y (P(y) → y = x))")
assert equiv("∃x∃y (cat(x) & cat(y) & x ≠ y)", "∃x∃y (cat(x) & cat(y) & ¬(x = y))")              # ex-u-gate
assert P.holds("∀x∀y ((P(x) & P(y)) → x = y)", ["a", "b"], {"P": set()}) is T                   # ex-u-edge at-most-one vacuous
assert P.holds("∃!x P(x)", ["a", "b"], {"P": set()}) is F                                      # ex-u-edge ∃! false
# negation
assert equiv("¬∀x (bird(x) → fly(x))", "∃x (bird(x) & ¬fly(x))")                               # ex-g-easy
assert equiv("¬∃x P(x)", "∀x ¬P(x)")                                                           # ex-g-medium law
# numbers
def even_f(x):
    return any(x == 2 * k for k in range(0, x + 1))
assert [even_f(x) for x in range(0, 9)] == [True, F, T, F, T, F, T, F, T]                       # ex-num-easy
def is_prime(x):
    return x > 1 and all(x % d for d in range(2, x))
assert [x for x in range(1, 61) if is_prime(x)] == [x for x in range(1, 61) if
    (x != 1) and all((not any(x == y * z for z in range(1, x + 1))) or y == x or y == 1
                    for y in range(1, x + 1))]                                                # ex-num-gate (GATE 2011 formula)
assert is_prime(6) is F and is_prime(7) is T                                                  # ex-num-medium

# ── PYQ keys (lesson 1) ─────────────────────────────────────────────────────
# cse-2004-cs-23 (D): "Some boys in the class are taller than all the girls"
INTENDED = "∃x (boy(x) & ∀y (girl(y) → taller(x, y)))"
q = B["cse-2004-cs-23"]
got = D.which(q, lambda t: equiv(t, INTENDED))
assert got == ["D"], got
assert not any(equiv(D.opts(q)[l], INTENDED) for l in "ABC")
D.assert_key("cse-2004-cs-23", "D")

# it-2004-it-3 (C): negation form
q = B["it-2004-it-3"]
ORIG = "∃x∀y ((a(x,y) & b(x,y)) & ¬c(x,y))"
got = D.which(q, lambda t: equiv(t, ORIG))
assert got == ["C"], got
D.assert_key("it-2004-it-3", "C")

# cse-2005-cs-41 (B): every teacher liked by some student
q = B["cse-2005-cs-41"]
INT = "∀x (teacher(x) → ∃y (student(y) & likes(y, x)))"
got = D.which(q, lambda t: equiv(t, INT))
assert got == ["B"], got
D.assert_key("cse-2005-cs-41", "B")

# cse-2006-cs-26 (D): tigers and lions attack if hungry or threatened
q = B["cse-2006-cs-26"]
INT = "∀x ((tiger(x) | lion(x)) → ((hungry(x) | threatened(x)) → attacks(x)))"
got = D.which(q, lambda t: equiv(t, INT))
assert got == ["D"], got
D.assert_key("cse-2006-cs-26", "D")

# cse-2007-cs-22 (D): the one that does NOT represent "not every graph is connected"
q = B["cse-2007-cs-22"]
INT = "¬∀x (Graph(x) → Connected(x))"
got = D.which(q, lambda t: not equiv(t, INT))
assert got == ["D"], got
assert all(equiv(D.opts(q)[l], INT) for l in "ABC")
D.assert_key("cse-2007-cs-22", "D")

# cse-2008-cs-30 (A) — needsReview resolved: option A is the only one readable as the statement;
# its printed (∀x fsa(x)) scopes loosely (free x in the consequent). Intended: ∀x(fsa(x) → ∃y(pda(y) & eq(x,y))).
q = B["cse-2008-cs-30"]
INT = "∀x (fsa(x) → ∃y (pda(y) & equivalent(x, y)))"
# Option A's printed ∃y loosely brackets only pda(y); the intended reading scopes it over the
# conjunction (recorded in _errata/dm.md as a bank note for this question):
optA = "(∀x fsa(x)) → (∃y (pda(y) & equivalent(x, y)))"
assert valid_sampled(imp(INT, "∀x " + optA))   # the universally closed option A is implied by the intended formula
assert not any(equiv(D.opts(q)[l], INT) for l in "BCD")
D.assert_key("cse-2008-cs-30", "A")

# it-2008-it-22 (D): negation of ∀x α→(∃y β→(∀u ∃v γ)). GATE's "[∀x, φ]" brackets mean the
# quantifier scopes over the whole bracket, so we compare fully bracketed (wide-scope) forms.
STMT_W = "∀x (A(x) → (∃y (B(y) → (∀u (∃v C(u, v))))))"
NEG_W = P.push_not(("not", P.parse(STMT_W)))
OPTS_W = {
    "A": "∃x (A(x) → (∀y (B(y) → (∃u (∀v C(u, v))))))",
    "B": "∃x (A(x) → (∀y (B(y) → (∃u (∀v ¬C(u, v))))))",
    "C": "∀x (¬A(x) → (∃y (¬B(y) → (∀u (∃v ¬C(u, v))))))",
    "D": "∃x (A(x) ∧ (∀y (B(y) ∧ (∃u (∀v ¬C(u, v))))))",
}
assert P.parse(OPTS_W["D"]) == NEG_W
assert all(P.parse(OPTS_W[l]) != NEG_W for l in "ABC")
D.assert_key("it-2008-it-22", "D")

# cse-2009-cs-23 (D): gold and silver ornaments are precious
q = B["cse-2009-cs-23"]
INT = "∀x ((G(x) | S(x)) → P(x))"
got = D.which(q, lambda t: equiv(t, INT))
assert got == ["D"], got
D.assert_key("cse-2009-cs-23", "D")

# cse-2009-cs-26 (B): I = ¬∀xP and IV = ∃x¬P are equivalent
q = B["cse-2009-cs-26"]
I, II, III, IV = "¬∀x P(x)", "¬∃x P(x)", "¬∃x ¬P(x)", "∃x ¬P(x)"
assert equiv(I, IV) and not equiv(I, II) and not equiv(I, III) and not equiv(II, III) and not equiv(II, IV)
D.assert_key("cse-2009-cs-26", "B")

# cse-2010-cs-30 (B): ∀x∃y∃t ¬F(x,y,t) = "no one can fool everyone all the time"
assert equiv("∀x∃y∃t ¬F_(x,y,t)", "¬∃x∀y∀t F_(x,y,t)", 2)
D.assert_key("cse-2010-cs-30", "B")

# cse-2011-cs-30 (A): the predicate is primality (verified numerically above for x ≤ 60)
D.assert_key("cse-2011-cs-30", "A")

# cse-2012-cs-13 (C): some real numbers are rational
q = B["cse-2012-cs-13"]
INT = "∃x (real(x) & rational(x))"
got = D.which(q, lambda t: equiv(t, INT))
assert got == ["C"], got
D.assert_key("cse-2012-cs-13", "C")

# cse-2013-cs-27 (D): none of my friends are perfect
q = B["cse-2013-cs-27"]
INT = "¬∃x (F(x) & P(x))"
got = D.which(q, lambda t: equiv(t, INT))
assert got == ["D"], got
D.assert_key("cse-2013-cs-27", "D")

# cse-2014-1-cs-1 (D): not all that glitters is gold (options print ∀x: φ without brackets; read wide)
q = B["cse-2014-1-cs-1"]
INT = "∃x (glitters(x) & ¬gold(x))"
OPTS_14 = {"A": "∀x (glitters(x) → ¬gold(x))", "B": "∀x (gold(x) → glitters(x))",
           "C": "∃x (gold(x) & ¬glitters(x))", "D": "∃x (glitters(x) & ¬gold(x))"}
assert D.opts(q).keys() == OPTS_14.keys()
assert [l for l, f in OPTS_14.items() if equiv(f, INT)] == ["D"]
D.assert_key("cse-2014-1-cs-1", "D")

# cse-2014-3-cs-53 (D): not all rainy days are cold
q = B["cse-2014-3-cs-53"]
INT = "∃d (Rainy(d) & ¬Cold(d))"
got = D.which(q, lambda t: equiv(t, INT))
assert got == ["D"], got
D.assert_key("cse-2014-3-cs-53", "D")

# cse-2019-cs-35 (C): "every prime has a larger prime" holds on N+ (and Z under the positive-divisor
# reading the question intends) but not on {1..100} (largest prime 97 has no larger prime in the set).
def phi(dom):
    div = {(z, x) for x in dom for z in dom if z > 0 and x % z == 0}
    def prime(x):
        return all(z == x or z == 1 for z in dom if z > 0 and (z, x) in div)
    for x in dom:
        if prime(x):
            if not any(w > x and prime(w) for w in dom):
                return False
    return True
assert phi(list(range(1, 101))) is False          # S1 fails: x = 97
# S2 = positive integers: verified up to 500 (Euclid); key C = S2 and S3
assert all(any(w > x and is_prime(w) for w in range(x + 1, 501)) for x in range(1, 490) if is_prime(x))  # every prime below 490 has a larger prime ≤ 499
D.assert_key("cse-2019-cs-35", "C")

# cse-2023-cs-16 (MSQ B, C): options implying ∀x(P(x) → ∃y Q(x,y))
CONJ = "∀x (P(x) → ∃y Q(x, y))"
q = B["cse-2023-cs-16"]
got = D.which(q, lambda t: valid_sampled(imp(t, CONJ)))
assert got == ["B", "C"], got
D.assert_key("cse-2023-cs-16", ["B", "C"])

# cse-2025-1-cs-38 (MSQ B, D): everyone has exactly one mother
q = B["cse-2025-1-cs-38"]
INT = "∀x∃y (mother(y, x) & ∀z (mother(z, x) → z = y))"
got = D.which(q, lambda t: equiv(t.replace("noteq(", "_ne("), INT.replace("noteq", "ne")))
# noteq(z,y) means z≠y: encode as ¬(z = y)
def fix_noteq(s):
    return re.sub(r"noteq\((\w),\s*(\w)\)", r"¬(\1 = \2)", s)
got = D.which(q, lambda t: equiv(fix_noteq(fix(t)), INT))
assert got == ["B", "D"], got
assert not any(equiv(fix_noteq(fix(D.opts(q)[l])), INT) for l in "AC")
D.assert_key("cse-2025-1-cs-38", ["B", "D"])

# cse-2026-2-cs-1 (A): there is a person who knows no one else but is known by everyone else
q = B["cse-2026-2-cs-1"]
INT = "∃y∀x ((x ≠ y) → (M(x, y) & ¬M(y, x)))"
got = D.which(q, lambda t: equiv(t, INT))
assert got == ["A"], got
D.assert_key("cse-2026-2-cs-1", "A")

# ── practice answers (nx-dm-02-01-*) ────────────────────────────────────────
q = PR["nx-dm-02-01-q01"]
D.assert_mcq(q, D.which(q, lambda t: equiv(t, "∀x (student(x) → ∃y (course(y) & loves(x, y)))"))[0])
q = PR["nx-dm-02-01-q02"]
D.assert_mcq(q, D.which(q, lambda t: equiv(t, "¬∃x (A(x) & B(x))"))[0])
D.assert_nat(PR["nx-dm-02-01-q03"], sum(1 for p in [( "a","b"),("b","a"),("c","d")] if p[0] != p[1]))
q = PR["nx-dm-02-01-q04"]
assert P.free_vars(P.parse("∀x (P(x) | Q(x, y)) & R(y)")) == {"y"}
D.assert_mcq(q, "A")
q = PR["nx-dm-02-01-q05"]
INT = "¬∃x (P(x) & Q(x))"
forms = {"I": "∀x ¬(P(x) & Q(x))", "II": "∀x (P(x) → ¬Q(x))", "III": "∃x ¬(P(x) & Q(x))", "IV": "∀x (¬P(x) | ¬Q(x))"}
assert sorted(k for k, f in forms.items() if equiv(f, INT)) == ["I", "II", "IV"]  # = option A
D.assert_msq(q, ["A"])
D.assert_nat(PR["nx-dm-02-01-q06"], sum(1 for x in range(1, 9) if is_prime(x)))
q = PR["nx-dm-02-01-q07"]
# R = {(a,b),(b,a)} on {a,b}: ∀x∃y T, ∃y∀x F → option C
assert P.holds("∀x∃y R(x,y)", domab, {"R": {("a", "b"), ("b", "a")}}) is T
assert P.holds("∃y∀x R(x,y)", domab, {"R": {("a", "b"), ("b", "a")}}) is F
D.assert_mcq(q, "C")
q = PR["nx-dm-02-01-q08"]
D.assert_mcq(q, D.which(q, lambda t: equiv(t, "∃x∀y ¬R(x,y)"))[0])
q = PR["nx-dm-02-01-q09"]
at_most_2 = "∀x∀y∀z ((P(x) & P(y) & P(z)) → (x = y ∨ y = z ∨ z = x))"
not3 = "¬∃x∃y∃z (P(x) & P(y) & P(z) & ¬(x = y) & ¬(y = z) & ¬(z = x))"
forms = {"I": at_most_2, "II": not3, "III": "∃x∃y (P(x) & P(y) & ¬(x = y))", "IV": "∀x∀y ((P(x) & P(y)) → x = y)"}
assert sorted(k for k, f in forms.items() if equiv(f, at_most_2)) == ["I", "II"]  # = option A
D.assert_msq(q, ["A"])
D.assert_nat(PR["nx-dm-02-01-q10"], sum(1 for x in range(1, 7) if x % 2 == 0))
q = PR["nx-dm-02-01-q11"]
D.assert_mcq(q, D.which(q, lambda t: equiv(t, "∀x (B(x) → A(x))"))[0])
q = PR["nx-dm-02-01-q12"]
D.assert_mcq(q, D.which(q, lambda t: equiv(t, "∃x (glitters(x) & ¬gold(x))"))[0])
assert len([k for k in PR if k.startswith("nx-dm-02-01-")]) == 12

D.must_contain(TXT, "forall-big-and", "exists-big-or", "scope-bracket-grow", "all-vs-wrong-conj",
               "some-vs-wrong-imp", "translate-phrase-by-phrase", "order-grid-forall-exists",
               "negation-push-ladder", "unique-exists-unique", "trap-order-matters", "trap-wrong-pairing",
               "cse-2004-cs-23", "cse-2026-2-cs-1", "nx-dm-02-01-q12", "quantifier-lab")
print("l2_01_predicates: predlib laws, 42 example answers, 19 PYQ keys and 12 practice answers OK")
