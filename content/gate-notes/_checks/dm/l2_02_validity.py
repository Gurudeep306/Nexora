"""Checks for dm/02-predicate-logic/02-quantifier-laws-validity: the two equivalence laws and the two
not-laws, the five one-way laws with counter-models for their converses, null quantification, prenex
conversion, counter-model search by enumeration, the 1991 infinite-only sentence, the
Bernays-Schoenfinkel witness-picking demo, Horn-clause semantics, induction-as-axiom (finite
domains with the fixed-point boundary convention), all sixteen PYQ keys and the twelve practice
answers. Validity verdicts search all interpretations up to domain size 3 (full search when the
predicate space is small, seeded sampling of 3000 worlds per size otherwise)."""
import itertools
import pathlib
import random
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib as D  # noqa: E402
import predlib as P  # noqa: E402

T, F = True, False
B = D.bank()
PR = D.practice(2)


def fix(s):
    """Normalise a bank option's LaTeX/Unicode into predlib syntax (tuples pass through)."""
    if not isinstance(s, str):
        return s
    s = re.sub(r"\\(?:text|mathrm|mathit|operatorname|boldsymbol)\{([^}]*)\}", r"\1", s)
    s = re.sub(r"(\\forall|\\exists!?|\u2200|\u2203!?)\s*\(\s*([A-Za-z]\w*)\s*\)", r"\1 \2", s)  # \u2200(x) \u2192 \u2200x
    s = re.sub(r"(\\forall|\\exists!?|\u2200|\u2203!?)\s*([A-Za-z]\w*)\s*,", r"\1 \2 ", s)  # \u2200x, \u03b1  \u2192  \u2200x \u03b1
    s = re.sub(r"(\\forall|\\exists!?|\u2200|\u2203!?)\s*([A-Za-z]\w*)\s*:", r"\1 \2 ", s)  # \u2200x: \u03c6  \u2192  \u2200x \u03c6
    s = re.sub(r"([A-Za-z]\w*)([A-Z]\w*\()", r"\1 \2", s)                     # glued \u2203yP(x,y) \u2192 \u2203y P(x,y)
    s = re.sub(r"(\w)\s*\*\s*(\w)", r"mul(\1, \2)", s)          # y*z \u2192 mul(y, z)
    s = re.sub(r"(\w)\s*\|\s*(\w)", r"div(\1, \2)", s)          # z|x \u2192 div(z, x)
    s = s.replace("\\mid", "|")
    s = re.sub(r"(\w)\|(\w)", r"div(\1, \2)", s)                 # remaining a|b \u2192 div(a, b)
    s = re.sub(r"P\(\s*(\w)\s*\+\s*1\s*\)", r"Ps(\1)", s)         # P(x+1) \u2192 Ps(x)
    s = re.sub(r"P\(\s*(\w)\s*-\s*1\s*\)", r"Pp(\1)", s)         # P(x-1) \u2192 Pp(x)
    s = s.replace("\\{", "(").replace("\\}", ")")                   # LaTeX \{ \} \u2192 ( )
    s = re.sub(r"\b([FT])(?=\s*\()", r"\1_", s)                      # predicate F( \u2192 F_( (F alone is the constant)
    return s


def _space(f, n):
    return sum(n ** a for a in P.predicates(P.F(fix(f))).values())


def _worlds(preds, n, count, seed=20261118):
    rng = random.Random(seed)
    dom = list(range(n))
    names = sorted(preds)
    for _ in range(count):
        yield {nm: {t for t in itertools.product(dom, repeat=preds[nm]) if rng.random() < 0.5} for nm in names}


def _sampled_agree(a, b, n, count, seed=20261118):
    ea, eb = P.F(fix(a)), P.F(fix(b))
    preds = P.predicates(ea)
    preds.update(P.predicates(eb))
    for I in _worlds(preds, n, count, seed):
        if P.ev(ea, dom := list(range(n)), I) != P.ev(eb, dom, I):
            return False
    return True


def equiv(a, b, k=3):
    """Equivalence on all interpretations up to domain size k (full search when cheap, seeded
    sampling of 3000 worlds per size when the predicate space is big)."""
    for n in range(1, k + 1):
        if 2 ** min(_space(a, n) + _space(b, n), 40) <= 2 ** 18:
            if not P.equivalent(fix(a), fix(b), n):
                return False
        elif not _sampled_agree(a, b, n, 3000):
            return False
    return True


def valid_sampled(f, k=3):
    """No counter-model found on domains 1..k (full search when cheap, seeded sampling otherwise)."""
    for n in range(1, k + 1):
        if 2 ** min(_space(f, n), 40) <= 2 ** 18:
            if P.counter_model(fix(f), n) is not None:
                return False
        else:
            e = P.F(fix(f))
            for I in _worlds(P.predicates(e), n, 3000):
                if not P.ev(e, list(range(n)), I):
                    return False
    return True


def has_counter(f, k=3):
    """A counter-model exists on some domain of size 1..k (the refutation direction)."""
    for n in range(1, k + 1):
        if 2 ** min(_space(f, n), 40) <= 2 ** 18:
            if P.counter_model(fix(f), n) is not None:
                return True
        else:
            e = P.F(fix(f))
            for I in _worlds(P.predicates(e), n, 3000):
                if not P.ev(e, list(range(n)), I):
                    return True
    return False


# ── the two equivalence laws and the two not-laws ─────────────────────────────
assert equiv("\u2200x (P(x) & Q(x))", "(\u2200x P(x)) & (\u2200x Q(x))")          # law-forall-and
assert equiv("\u2203x (P(x) | Q(x))", "(\u2203x P(x)) | (\u2203x Q(x))")          # law-exists-or
assert has_counter("\u2200x (P(x) | Q(x)) \u2194 (\u2200x P(x)) | (\u2200x Q(x))")  # not-law-forall-or
assert has_counter("\u2203x (P(x) & Q(x)) \u2194 (\u2203x P(x)) & (\u2203x Q(x))")  # not-law-exists-and
# the counter-model on U = {1,2}: P(1) = Q(2) = T, P(2) = Q(1) = F
dom2 = [1, 2]
Icm = {"P": {(1,)}, "Q": {(2,)}}
assert P.ev(P.F("\u2200x (P(x) | Q(x))"), dom2, Icm) is T
assert P.ev(P.F("(\u2200x P(x)) | (\u2200x Q(x))"), dom2, Icm) is F
assert P.ev(P.F("(\u2203x P(x)) & (\u2203x Q(x))"), dom2, Icm) is T
assert P.ev(P.F("\u2203x (P(x) & Q(x))"), dom2, Icm) is F

# ── the five one-way laws (and the converse of each fails) ─────────────────────
ONE_WAYS = [
    "\u2200x P(x) \u2192 \u2203x P(x)",                                            # non-empty domain
    "(\u2200x P(x)) | (\u2200x Q(x)) \u2192 \u2200x (P(x) | Q(x))",
    "\u2203x (P(x) & Q(x)) \u2192 (\u2203x P(x)) & (\u2203x Q(x))",
    "\u2200x (P(x) \u2192 Q(x)) \u2192 ((\u2200x P(x)) \u2192 (\u2200x Q(x)))",
    "\u2203y\u2200x R(x,y) \u2192 \u2200x\u2203y R(x,y)",
]
CONVERSES = [
    "\u2203x P(x) \u2192 \u2200x P(x)",
    "\u2200x (P(x) | Q(x)) \u2192 (\u2200x P(x)) | (\u2200x Q(x))",
    "(\u2203x P(x)) & (\u2203x Q(x)) \u2192 \u2203x (P(x) & Q(x))",
    "((\u2200x P(x)) \u2192 (\u2200x Q(x))) \u2192 \u2200x (P(x) \u2192 Q(x))",
    "\u2200x\u2203y R(x,y) \u2192 \u2203y\u2200x R(x,y)",
]
for law in ONE_WAYS:
    assert valid_sampled(law), law
for cv in CONVERSES:
    assert has_counter(cv), cv
# the grid picture: one full column => every row marked; every row marked =/=> full column
grid_full_col = {(x, "b") for x in "abc"}                            # column y=b full
Ir = {"R": grid_full_col}
assert P.ev(P.F("\u2203y\u2200x R(x,y)"), ["a", "b", "c"], Ir) is T
assert P.ev(P.F("\u2200x\u2203y R(x,y)"), ["a", "b", "c"], Ir) is T
grid_rows = {("a", "a"), ("b", "b"), ("c", "c")}  # diagonal: every row marked, no full column
Ir2 = {"R": grid_rows}
assert P.ev(P.F("\u2200x\u2203y R(x,y)"), ["a", "b", "c"], Ir2) is T
assert P.ev(P.F("\u2203y\u2200x R(x,y)"), ["a", "b", "c"], Ir2) is F

# ── null quantification (x not free in A; A is a 0-ary predicate here) ────────
A0 = "A"
NULL_BOTH = [
    ("\u2200x (P(x) | A)", "(\u2200x P(x)) | A"),
    ("\u2200x (P(x) & A)", "(\u2200x P(x)) & A"),
    ("\u2203x (P(x) | A)", "(\u2203x P(x)) | A"),
    ("\u2203x (P(x) & A)", "(\u2203x P(x)) & A"),
]
NULL_ONE_WAY = [
    ("\u2200x (P(x) \u2192 A)", "(\u2203x P(x)) \u2192 A"),
    ("\u2203x (P(x) \u2192 A)", "(\u2200x P(x)) \u2192 A"),
]
NULL_WRONG = [
    ("\u2200x (P(x) \u2192 A)", "(\u2200x P(x)) \u2192 A"),
    ("\u2203x (A \u2192 P(x))", "A \u2192 \u2200x P(x)"),
]
for a, b in NULL_BOTH + NULL_ONE_WAY:
    assert equiv(a, b), (a, b)
for a, b in NULL_WRONG:
    assert has_counter(f"{a} \u2194 {b}"), (a, b)

# ── prenex conversion ──────────────────────────────────────────────────────────
PREM = "(\u2200x P(x)) | (\u2203y Q(y))"
assert equiv(PREM, "\u2200x\u2203y (P(x) | Q(y))")
assert equiv(PREM, "\u2203y\u2200x (P(x) | Q(y))")
assert has_counter(f"{PREM} \u2194 \u2200x\u2200y (P(x) | Q(y))")
assert has_counter(f"{PREM} \u2194 \u2203x\u2203y (P(x) | Q(y))")
# capture-avoiding rename: (\u2200x P(x)) & (\u2200x Q(x)) pulls out as \u2200x\u2200y (P(x) & Q(y))
assert equiv("(\u2200x P(x)) & (\u2200x Q(x))", "\u2200x\u2200y (P(x) & Q(y))")

# ── counter-model search by enumeration (how "which is valid" is decided) ─────
rows = list(P.interpretations({"P": 1}, [1, 2]))
assert len(rows) == 4                                   # 2^2 interpretations of P over a 2-element domain
falsifying = [I for I in rows if not P.ev(P.F("\u2200x P(x) \u2192 \u2203x P(x)"), [1, 2], I)]
assert falsifying == []                                 # the law holds on every one of the 4 rows
rowsR = list(P.interpretations({"R": 2}, [1, 2]))
assert len(rowsR) == 16                                 # 2^4 for a binary predicate
bad = [I for I in rowsR if not P.ev(P.F("\u2200x\u2203y R(x,y) \u2192 \u2203y\u2200x R(x,y)"), [1, 2], I)]
assert len(bad) == 2                                    # exactly the diagonal and the anti-diagonal falsify
assert P.counter_model("\u2200x\u2203y R(x,y) \u2192 \u2203y\u2200x R(x,y)", 2) is not None

# ── interpretations / models / satisfiable / valid (worked examples) ───────────
dom3 = [1, 2, 3]
assert sum(1 for _ in P.interpretations({"P": 1}, dom3)) == 8          # 2^3 unary interpretations
assert sum(1 for _ in P.interpretations({"R": 2}, [1, 2])) == 16        # 2^4 binary over 2 elements
assert P.satisfiable("\u2200x P(x)", 3) and not P.valid("\u2200x P(x)", 3)
assert P.valid("\u2200x P(x) \u2192 \u2203x P(x)", 3)                     # needs the non-empty domain
assert P.counter_model("\u2200x P(x) \u2192 \u2203x P(x)", 0) is None and P.counter_model("\u2200x P(x) \u2192 \u2203x P(x)", 3) is None

# ── 1991 PYQ: serial + antisymmetric + transitive + irreflexive has no finite model ──
PHI = ("\u2200x\u2203y R(x,y) & \u2200x\u2200y (R(x,y) \u2192 \u00acR(y,x)) & "
       "\u2200x\u2200y\u2200z (R(x,y) & R(y,z) \u2192 R(x,z)) & \u2200x \u00acR(x,x)")
assert all(P.model(PHI, n) is None for n in range(1, 5))               # no model of size 1..4
# satisfiable on (N, <): check the four conjuncts with plain Python semantics. Seriality is the one
# that needs witnesses beyond any finite cut (x has a larger natural) — that is why no finite model exists.
lt = lambda x, y: x < y  # noqa: E731
assert all(any(lt(x, y) for y in range(1000)) for x in range(50))      # serial on N (no top element)
assert all(not (lt(x, y) and lt(y, x)) for x in range(50) for y in range(50))          # antisymmetric
assert all(not (lt(x, y) and lt(y, z)) or lt(x, z) for x in range(20) for y in range(20) for z in range(20))  # transitive
assert all(not lt(x, x) for x in range(50))                            # irreflexive
# chain lemma: witnesses a0, a1, a2, ... are pairwise distinct (irreflexive + antisymmetric)
dom5 = list(range(5))
I5 = {"R": {(x, x + 1) for x in range(4)}}   # a 0->1->2->3->4 chain, not serial at 4
assert P.ev(P.F("\u2200x\u2200y (R(x,y) \u2192 \u00acR(y,x))"), dom5, I5) is T
assert P.ev(P.F("\u2200x \u00acR(x,x)"), dom5, I5) is T
assert P.ev(P.F("\u2200x\u2203y R(x,y)"), dom5, I5) is F                  # fails seriality at the end

# ── Bernays-Schoenfinkel witness picking (2018 PYQ demo) ─────────────────────
PSI = "\u2203s\u2203t\u2203u\u2200v\u2200w\u2200x\u2200y (\u00ac(s = t) & \u00ac(s = u) & \u00ac(t = u))"
assert P.model(PSI, 7) is not None      # a 7-element model exists
assert P.model(PSI, 3) is not None      # so a model of size <= 3 exists (the witnesses s,t,u)
assert P.model(PSI, 2) is None          # but not of size 2

# ── Horn clauses / logic programs ──────────────────────────────────────────────
PROG = "\u2200x ((\u2203y (B(x,y) & C(y))) \u2192 A(x)) & \u00ac\u2203x B(x,x)"
domH = [1, 2]
base = {"B": {(1, 2)}, "C": {(2,)}}     # facts B(1,2), C(2); no B(x,x)
assert P.ev(P.F(PROG), domH, {**base, "A": set()}) is F        # without A(1) the program is false
assert P.ev(P.F(PROG), domH, {**base, "A": {(1,)}}) is T        # forward chaining derives A(1)
assert P.ev(P.F("\u00ac\u2203x B(x,x)"), domH, base) is T

# ── induction as a first-order axiom (finite domains, fixed-point boundary) ───
def nat_ev(letter, N, S):
    """Evaluate option `letter` of cse-2025-2-cs-5 on domain {0..N} with extension S, successor
    Ps(x)=P(x+1) for x<N and Ps(N)=P(N) (fixed point), predecessor likewise."""
    dom = list(range(N + 1))
    I = {"P": {(x,) for x in S},
         "Ps": {(x,) for x in dom if min(x + 1, N) in S},
         "Pp": {(x,) for x in dom if max(x - 1, 0) in S},
         "B0": {()} if 0 in S else set(), "B1000": {()} if 1000 in S else set()}
    forms = {
        "A": "(B0 & \u2200x (P(x) \u2192 Ps(x))) \u2192 \u2200x P(x)",
        "B": "(B0 & \u2200x (P(x) \u2192 Pp(x))) \u2192 \u2200x P(x)",
        "C": "(B1000 & \u2200x (P(x) \u2192 Pp(x))) \u2192 \u2200x P(x)",
        "D": "(B1000 & \u2200x (P(x) \u2192 Ps(x))) \u2192 \u2200x P(x)",
    }
    return P.ev(P.F(forms[letter]), dom, I)

assert all(nat_ev("A", N, set(S)) for N in range(1, 7) for r in range(N + 2)
           for S in itertools.combinations(range(N + 1), r))       # A valid on every finite 0..N
assert not nat_ev("B", 1001, {0})                                   # downward step reaches only x<=0
assert not nat_ev("C", 1001, set(range(0, 1001)))                   # base at 1000 misses x=1001
assert not nat_ev("D", 1001, {1000, 1001})                          # base at 1000 misses x<1000

# ── PYQ keys (lesson 2, sixteen) ───────────────────────────────────────────────
# cse-1991-b-15-b (DESC): "No finite models; satisfiable, e.g. (N, <)" — no finite model (checked
# exhaustively above for sizes 1..4) and the countable model (N, <) satisfies all four conjuncts.
assert "No finite models" in B["cse-1991-b-15-b"]["answer"]
assert all(P.model(PHI, n) is None for n in range(1, 5))

# cse-1992-a-2-xv (MSQ, A): only ((forall P) or (forall Q)) -> forall (P or Q) is valid
q = B["cse-1992-a-2-xv"]
got = D.which(q, valid_sampled)
assert got == ["A"], got
D.assert_key("cse-1992-a-2-xv", ["A"])

# cse-2003-cs-32 (D): alpha/beta have x as only free variable, so substitute A(x), B(x)
q = B["cse-2003-cs-32"]
gk = lambda t: t.replace("\\alpha", "A(x)").replace("\\beta", "B(x)")  # noqa: E731
got = D.which(q, lambda t: valid_sampled(gk(t)))
assert got == ["D"], got
D.assert_key("cse-2003-cs-32", "D")

# cse-2003-cs-33 (D): over N with Q_xy = "y divides x", both prime and composite readings satisfy alpha,
# because forall y (Q_xy <-> not Q_yy) is false for every x (witness y = x, since x|x is true)
q = B["cse-2003-cs-33"]
dom8 = list(range(1, 9))
Qdiv = {"Q": {(x, y) for x in dom8 for y in dom8 if y != 0 and x % y == 0}}  # Q(x,y): y divides x
alpha33 = "(\u2200x (P(x) \u2194 (\u2200y (Q(x,y) \u2194 \u00acQ(y,y))))) \u2192 (\u2200x \u00acP(x))"
assert all(not P.ev(P.F("\u2200y (Q(x,y) \u2194 \u00acQ(y,y))"), dom8, Qdiv, {"x": x}) for x in dom8)
primes8 = {x for x in dom8 if x > 1 and all(x % d for d in range(2, x))}
comps8 = {x for x in dom8 if x > 1 and x not in primes8}
for pset in (primes8, comps8):
    assert P.ev(P.F(alpha33), dom8, {**Qdiv, "P": {(x,) for x in pset}}) is T
D.assert_key("cse-2003-cs-33", "D")

# cse-2003-cs-71 (A, needsReview resolved): the program A(x) <- B(x,y), C(y); <- B(x,x)
# is the sentence forall x ((exists y (B(x,y) & C(y))) -> A(x)) & ~exists x B(x,x).
# Keys B and D are printed identically (both use forall y in the body) and are both wrong; C uses "or".
q = B["cse-2003-cs-71"]
got = D.which(q, lambda t: equiv(t, PROG))
assert got == ["A"], got
assert not any(equiv(D.opts(q)[l], PROG) for l in "BCD")
D.assert_key("cse-2003-cs-71", "A")

# it-2005-cs-36 (B): only forall x (P -> Q) -> ((forall x P) -> (forall x Q)) is always true
q = B["it-2005-cs-36"]
got = D.which(q, valid_sampled)
assert got == ["B"], got
D.assert_key("it-2005-cs-36", "B")

# it-2006-cs-21 (B): symmetry is satisfiable (empty R) and so is its negation (R = {(1,2)})
q = B["it-2006-cs-21"]
SYM = "\u2200x\u2200y (R(x,y) \u2192 R(y,x))"
assert P.satisfiable(SYM, 3) and P.satisfiable(("not", P.F(SYM)), 3) and not P.valid(SYM, 3)
assert P.holds(SYM, [1, 2], {"R": set()}) is T
assert P.holds(SYM, [1, 2], {"R": {(1, 2)}}) is F
D.assert_key("it-2006-cs-21", "B")

# it-2007-cs-21 (A): only the forall(->) distribution law is valid
q = B["it-2007-cs-21"]
got = D.which(q, valid_sampled)
assert got == ["A"], got
D.assert_key("it-2007-cs-21", "A")

# it-2008-it-21 (C, beta has no free variable): [(exists x alpha) -> beta] -> [forall x (alpha -> beta)].
# The paper's "forall x, beta -> alpha" style needs the wide-scope reading, so hand-bracket all four:
# alpha := A(x), beta := B (0-ary).
q = B["it-2008-it-21"]
HB = {
    "A": "(B \u2192 \u2203x A(x)) \u2192 \u2200x (B \u2192 A(x))",
    "B": "(\u2203x (B \u2192 A(x))) \u2192 (B \u2192 \u2200x A(x))",
    "C": "((\u2203x A(x)) \u2192 B) \u2192 \u2200x (A(x) \u2192 B)",
    "D": "((\u2200x A(x)) \u2192 B) \u2192 \u2200x (A(x) \u2192 B)",
}
assert valid_sampled(HB["C"]) and equiv(HB["C"], "((\u2203x A(x)) \u2192 B) \u2192 \u2200x (A(x) \u2192 B)")
assert all(has_counter(HB[l]) for l in "ABD")
D.assert_key("it-2008-it-21", "C")

# cse-2013-cs-47 (D, needsReview resolved): NOT equivalent is D; B and C are equivalent.
# Errata: as printed, A is also not equivalent (GATE 2013 gave marks to all); the key stays D.
# Substitute alpha := A(x,y), beta := B(x,z) (both may contain x).
q = B["cse-2013-cs-47"]
gk = lambda t: t.replace("\\alpha", "A(x,y)").replace("\\beta", "B(x,z)")  # noqa: E731
ORIG47 = "\u00ac\u2203x (\u2200y A(x,y) & \u2200z B(x,z))"
got = D.which(q, lambda t: equiv(gk(t), ORIG47))
assert got == ["B", "C"], got
assert all(not equiv(gk(D.opts(q)[l]), ORIG47) for l in "AD")
D.assert_key("cse-2013-cs-47", "D")

# cse-2015-2-cs-55 (C, needsReview resolved): C is a tautology because P -> R and ~P | R are the
# same formula pointwise. Errata: D is FOL-valid too, but GATE means propositional tautology here
# (D's truth-functional form is A -> B, not a propositional tautology); the key stays C.
q = B["cse-2015-2-cs-55"]
got = D.which(q, valid_sampled)
assert got == ["C", "D"], got                      # C and D are both FOL-valid ...
assert valid_sampled(D.opts(q)["C"])               # ... and C is the propositional tautology (A <-> A)
assert has_counter(D.opts(q)["A"]) and has_counter(D.opts(q)["B"])
D.assert_key("cse-2015-2-cs-55", "C")

# cse-2016-2-cs-27 (D): the NOT-valid one is forall(p|q) -> (forall p) | (forall q)
q = B["cse-2016-2-cs-27"]
got = D.which(q, lambda t: not valid_sampled(t))
assert got == ["D"], got
D.assert_key("cse-2016-2-cs-27", "D")

# cse-2017-1-cs-2 (B): F = forall x exists y R(x,y) implies I and IV only
q = B["cse-2017-1-cs-2"]
F17 = "\u2200x\u2203y R(x,y)"
ST17 = {"I": "\u2203y\u2203x R(x,y)", "II": "\u2203y\u2200x R(x,y)", "III": "\u2200y\u2203x R(x,y)", "IV": "\u00ac\u2203x\u2200y \u00acR(x,y)"}
implied = sorted(k for k, f in ST17.items() if valid_sampled(f"{F17} \u2192 {f}"))
assert implied == ["I", "IV"], implied             # = option B ("I and IV only")
D.assert_key("cse-2017-1-cs-2", "B")

# cse-2018-cs-28 (A): Bernays-Schoenfinkel — exists* forall* quantifier-free has a model of size <= 3
# whenever it has any model (witness picking; demonstrated above on the distinctness psi)
q = B["cse-2018-cs-28"]
assert P.model(PSI, 7) is not None and P.model(PSI, 3) is not None and P.model(PSI, 2) is None
D.assert_key("cse-2018-cs-28", "A")

# cse-2020-cs-39 (C): NOT valid is forall x (p(x) -> W) <-> (forall x p(x)) -> W, with W free of x
q = B["cse-2020-cs-39"]
got = D.which(q, lambda t: not valid_sampled(t))
assert got == ["C"], got
assert equiv(D.opts(q)["A"], "\u2200x (p(x) | W) \u2194 (\u2200x p(x)) | W")
assert equiv(D.opts(q)["B"], "\u2203x (p(x) & W) \u2194 (\u2203x p(x)) & W")
assert equiv(D.opts(q)["D"], "\u2203x (p(x) \u2192 W) \u2194 (\u2200x p(x)) \u2192 W")
D.assert_key("cse-2020-cs-39", "C")

# cse-2025-2-cs-5 (A): induction over N; A valid on every finite 0..N (fixed-point boundary),
# B/C/D have the explicit counter-models computed above
q = B["cse-2025-2-cs-5"]
assert all(nat_ev("A", N, set(S)) for N in range(1, 7) for r in range(N + 2)
           for S in itertools.combinations(range(N + 1), r))
assert [not nat_ev(l, 1001, S) for l, S in (("B", {0}), ("C", set(range(0, 1001))), ("D", {1000, 1001}))] == [T, T, T]
D.assert_key("cse-2025-2-cs-5", "A")

# ── practice answers (nx-dm-02-02-*) ───────────────────────────────────────────
q = PR["nx-dm-02-02-q01"]
S1 = {"A": "\u2200x (P(x) | Q(x)) \u2192 (\u2200x P(x)) | (\u2200x Q(x))",
      "B": "\u2203x (P(x) & Q(x)) \u2192 (\u2203x P(x)) & (\u2203x Q(x))",
      "C": "\u2200x\u2203y R(x,y) \u2192 \u2203y\u2200x R(x,y)",
      "D": "((\u2200x P(x)) | (\u2200x Q(x))) \u2192 \u2200x (P(x) | Q(x))"}
assert sorted(k for k, f in S1.items() if valid_sampled(f)) == ["B", "D"]     # = option "B and D"
D.assert_msq(q, ["B"])
q = PR["nx-dm-02-02-q02"]
def refutes(Pset, Qset):
    I = {"P": {(x,) for x in Pset}, "Q": {(x,) for x in Qset}}
    return P.ev(P.F("\u2200x (P(x) | Q(x))"), dom2, I) and not P.ev(P.F("(\u2200x P(x)) | (\u2200x Q(x))"), dom2, I)
assert [refutes(*s) for s in (({1}, {2}), ({1, 2}, set()), (set(), set()), ({1}, {1, 2}))] == [T, F, F, F]
D.assert_mcq(q, "A")
D.assert_nat(PR["nx-dm-02-02-q03"], 2 ** 2)
q = PR["nx-dm-02-02-q04"]
assert equiv("\u2200x (P(x) \u2192 A)", "(\u2203x P(x)) \u2192 A")
assert not equiv("\u2200x (P(x) \u2192 A)", "(\u2200x P(x)) \u2192 A")
D.assert_mcq(q, "C")
q = PR["nx-dm-02-02-q05"]
assert D.which(q, valid_sampled) == ["A", "B", "C"] and not valid_sampled(D.opts(q)["D"])
D.assert_mcq(q, "D")
q = PR["nx-dm-02-02-q06"]
base6 = "\u2200x (P(x) \u2192 Q(x))"
S6 = {"I": "\u2200x (\u00acP(x) | Q(x))", "II": "\u00ac\u2203x (P(x) & \u00acQ(x))",
      "III": "\u2203x (\u00acP(x) | Q(x))", "IV": "\u2200x (\u00acQ(x) \u2192 \u00acP(x))"}
assert sorted(k for k, f in S6.items() if equiv(f, base6)) == ["I", "II", "IV"]  # = option A
D.assert_msq(q, ["A"])
D.assert_mcq(PR["nx-dm-02-02-q07"], "C")                       # satisfiable but not valid = some yes, some no
q = PR["nx-dm-02-02-q08"]
assert P.model(PSI, 7) is not None and P.model(PSI, 3) is not None   # BS small-model property
D.assert_mcq(q, "D")
D.assert_nat(PR["nx-dm-02-02-q09"], 2 ** 4)
q = PR["nx-dm-02-02-q10"]
assert nat_ev("A", 6, {0, 2, 3}) is T and not nat_ev("B", 1001, {0})
D.assert_mcq(q, "A")
q = PR["nx-dm-02-02-q11"]
HORN = "\u2200x ((\u2203y (B(x,y) & C(y))) \u2192 A(x))"
assert D.which(q, lambda t: equiv(t, HORN)) == ["B"]
D.assert_mcq(q, "B")
q = PR["nx-dm-02-02-q12"]
PREM12 = "(\u2200x P(x)) | (\u2203y Q(y))"
S12 = {"A": "\u2200x\u2203y (P(x) | Q(y))", "B": "\u2203y\u2200x (P(x) | Q(y))",
       "C": "\u2200x\u2200y (P(x) | Q(y))", "D": "\u2203x\u2203y (P(x) | Q(y))"}
assert sorted(k for k, f in S12.items() if equiv(f, PREM12)) == ["A", "B"]  # = option "A and B"
D.assert_msq(q, ["A"])
assert len([k for k in PR if k.startswith("nx-dm-02-02-")]) == 12

# ── lesson text (added when the markdown exists) ───────────────────────────────
if list(D.chapter_dir(2).glob("02-*.md")):
    TXT = D.lesson_text(2, "02")
    D.must_contain(TXT, "law-checked-on-world", "one-way-law-countermodel", "exists-forall-implies-grid",
                   "quantifier-past-free-formula", "prenex-ladder", "countermodel-search",
                   "infinite-models-chain", "horn-forward-chain",
                   "trap-nonempty-domain", "cse-1991-b-15-b", "cse-2025-2-cs-5", "nx-dm-02-02-q12",
                   "quantifier-lab")

print("l2_02_validity: laws, one-ways, null quantification, prenex, counter-model search, "
      "infinite-only sentence, BS demo, Horn program, induction boundary, 16 PYQ keys, 12 practice answers OK")
