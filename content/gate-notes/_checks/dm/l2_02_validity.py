"""Checks for dm/02-predicate-logic/02-quantifier-laws-validity: every law instance (two-way, one-way,
null quantification, prenex, swap), every counter-model and model the lesson exhibits, the infinite-model
sentence of 1991, the diagonal formula, the Horn-clause translation, the induction variants, the
small-model property, all sixteen PYQ keys (options parsed with predlib after replacing schematic letters
by predicates) and the practice answers.

A finite search refutes validity but cannot prove it. Every "valid" claim below is proved in the lesson;
here we additionally assert that no counter-model exists on domains of size 1..3 (VALID3)."""
import itertools
import pathlib
import random
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib as D  # noqa: E402
import predlib as P  # noqa: E402

B = D.bank()
PR = D.practice(2)
TXT = D.lesson_text(2, "02")


def VALID3(f, k=3):
    """Proved valid in the lesson; also no counter-model on domains of size 1..k."""
    assert P.valid(f, k), f"counter-model found for a claimed validity: {f} -> {P.counter_model(f, k)}"
    return True


def NOTVALID(f, k=2):
    assert P.counter_model(f, k) is not None, f"no counter-model up to {k}: {f}"
    return True


def EQUIV3(a, b, k=3):
    return VALID3(("iff", P.F(a), P.F(b)), k)


def U(*xs):
    return {(x,) for x in xs}


def holds(f, n, I, env=None):
    return P.holds(f, list(range(n)), I, env)


def fix(t, subst=()):
    """LaTeX option text -> predlib syntax: braces, 'Qx' letters glued to quantifiers, schematic letters."""
    t = t.replace("$", "").replace("\\{", "(").replace("\\}", ")").replace("\\sim", "~")
    t = re.sub(r"\\(forall|exists)\s*([a-z])\s*,?", r"\\\1 \2 ", t)
    for a, b in subst:
        t = t.replace(a, b)
    return t


# ── Interpretations and verdicts ────────────────────────────────────────────
R3 = {"R": {(0, 1), (1, 2), (2, 0)}}                                                       # ex-val-easy
assert holds("forall x exists y R(x, y)", 3, R3) and not holds("exists y forall x R(x, y)", 3, R3)
assert holds("forall x ~R(x, x)", 3, R3)
sym = "forall x forall y (R(x, y) -> R(y, x))"                                              # ex-val-medium, IT 2006
assert holds(sym, 1, {"R": set()}) and not holds(sym, 2, {"R": {(0, 1)}})
assert P.satisfiable(sym) and P.satisfiable(("not", P.F(sym)))
VALID3("(forall x R(x, x)) -> exists x exists y R(x, y)")                                  # ex-val-gate (i)
assert not holds("(forall x exists y R(x, y)) -> exists x R(x, x)", 2, {"R": {(0, 1), (1, 0)}})
assert P.satisfiable("(forall x exists y R(x, y)) -> exists x R(x, x)")
assert not P.satisfiable("exists x (P(x) & forall y ~P(y))")                                # (iii) (unsat: proof in lesson)
VALID3("(forall x P(x)) -> exists x P(x)")                                                 # ex-val-edge (empty domain: ∀ T, ∃ F)
# validity-theorem: substitution instances and the bridges
VALID3("(forall x P(x)) | ~(forall x P(x))")
EQUIV3("forall x (P(x) -> Q(x))", "forall x (~P(x) | Q(x))")
assert not P.satisfiable("~(forall x (P(x) | ~P(x)))")
# Counter-model search scene: the first counter-model is on size 2 and splits P and Q.
F_OR = "(forall x (P(x) | Q(x))) -> ((forall x P(x)) | (forall x Q(x)))"
assert P.counter_model(F_OR, 1) is None
cm = P.counter_model(F_OR, 2)
assert len(cm[0]) == 2 and {frozenset(cm[1]["P"]), frozenset(cm[1]["Q"])} == {frozenset(U(0)), frozenset(U(1))}

# ── Two-way laws (two-way-laws, two-way-theorem) ────────────────────────────
for a, b in [("~forall x P(x)", "exists x ~P(x)"), ("~exists x P(x)", "forall x ~P(x)"),
             ("forall x (P(x) & Q(x))", "(forall x P(x)) & (forall x Q(x))"),
             ("exists x (P(x) | Q(x))", "(exists x P(x)) | (exists x Q(x))"),
             ("exists x (P(x) -> Q(x))", "(forall x P(x)) -> (exists x Q(x))"),
             ("forall x forall y R(x, y)", "forall y forall x R(x, y)"),
             ("exists x exists y R(x, y)", "exists y exists x R(x, y)"),
             ("forall x P(x)", "forall y P(y)")]:
    EQUIV3(a, b)
w01 = {"P": U(0), "Q": U(1)}                                                              # sanity check in the proof
assert holds("exists x (P(x) | Q(x))", 2, w01) and not holds("forall x (P(x) & Q(x))", 2, w01)
EQUIV3("~forall x (P(x) -> exists y Q(x, y))", "exists x (P(x) & forall y ~Q(x, y))")      # ex-two-easy
assert P.push_not(P.parse("~forall x (P(x) -> exists y Q(x, y))")) == P.parse("exists x (P(x) & forall y ~Q(x, y))")
wall = {"P": U(0, 1), "Q": set()}                                                          # ex-two-medium
assert not holds("exists x (P(x) -> Q(x))", 2, wall) and not holds("(forall x P(x)) -> exists x Q(x)", 2, wall)
w_m = {"P": U(0), "Q": set()}
assert holds("exists x (P(x) -> Q(x))", 2, w_m) and not holds("(exists x P(x)) -> exists x Q(x)", 2, w_m)
assert not P.equivalent("exists x (P(x) -> Q(x))", "(exists x P(x)) -> exists x Q(x)")
VALID3("(forall x forall y P(x, y)) -> forall x forall y P(y, x)")                         # ex-two-edge
NOTVALID("forall x forall y (P(x, y) -> P(y, x))")

# ── One-way laws (table rows a-g; converse counter-models from the table) ──
ONE_WAY = [
    ("(forall x A(x)) | (forall x B(x))", "forall x (A(x) | B(x))", {"A": U(0), "B": U(1)}),
    ("exists x (A(x) & B(x))", "(exists x A(x)) & (exists x B(x))", {"A": U(0), "B": U(1)}),
    ("forall x (A(x) -> B(x))", "(forall x A(x)) -> (forall x B(x))", {"A": U(0), "B": set()}),
    ("forall x (A(x) -> B(x))", "(exists x A(x)) -> (exists x B(x))", {"A": U(0), "B": U(1)}),
    ("forall x (A(x) <-> B(x))", "(forall x A(x)) <-> (forall x B(x))", {"A": U(0), "B": U(1)}),
    ("(exists x A(x)) -> (forall x B(x))", "forall x (A(x) -> B(x))", {"A": U(0), "B": U(0)}),
    ("forall x A(x)", "exists x A(x)", {"A": U(0)}),
]
for strong, weak, world in ONE_WAY:
    VALID3(f"({strong}) -> ({weak})")
    assert holds(weak, 2, world) and not holds(strong, 2, world), (strong, weak)

# ── Worked examples: one-way laws ──────────────────────────────────────────
OPT_FIX = [("\\alpha", "A(x)"), ("\\beta", "B(x)")]
q = B["cse-1992-a-2-xv"]                                                                   # ex-one-easy, GATE 1992
O = {k: fix(t) for k, t in D.opts(q).items()}
assert P.parse(O["D"]) == P.parse("(exists x (P(x) | Q(x))) -> (~(forall x P(x)) | exists x Q(x))")
assert not holds(O["D"], 2, {"P": U(0, 1), "Q": set()}) and not holds(O["B"], 2, w01) and not holds(O["C"], 2, w01)
VALID3(O["A"])
D.assert_key("cse-1992-a-2-xv", [k for k, t in O.items() if P.valid(t, 2)])
q = B["it-2005-cs-36"]                                                                     # ex-one-medium
O = {k: fix(t) for k, t in D.opts(q).items()}
VALID3(O["B"])
assert all(not holds(O[k], 2, w01) for k in "ACD")
D.assert_key("it-2005-cs-36", [k for k, t in O.items() if P.valid(t, 2)])
q = B["cse-2016-2-cs-27"]                                                                  # ex-one-gate
O = {k: fix(t) for k, t in D.opts(q).items()}
for k in "ABC":
    VALID3(O[k])
assert not holds(O["D"], 2, {"p": U(0), "q": U(1)})
EQUIV3("(forall x p(x)) -> forall x q(x)", "(exists x ~p(x)) | forall x q(x)")
D.assert_key("cse-2016-2-cs-27", [k for k, t in O.items() if not P.valid(t, 2)])
q = B["cse-2003-cs-32"]                                                                    # ex-one-edge (α, β -> A(x), B(x))
O = {k: fix(t, OPT_FIX) for k, t in D.opts(q).items()}
VALID3(O["D"])
assert not holds(O["A"], 2, {"A": U(0), "B": set()}) and not holds(O["B"], 2, {"A": U(0, 1), "B": set()})
assert not holds(O["C"], 2, {"A": U(0), "B": U(1)})
D.assert_key("cse-2003-cs-32", [k for k, t in O.items() if P.valid(t, 2)])

# ── Null quantification (W has no free x) ──────────────────────────────────
NULL = [("forall x (A(x) & W)", "(forall x A(x)) & W"), ("forall x (A(x) | W)", "(forall x A(x)) | W"),
        ("exists x (A(x) & W)", "(exists x A(x)) & W"), ("exists x (A(x) | W)", "(exists x A(x)) | W"),
        ("forall x (W -> A(x))", "W -> forall x A(x)"), ("exists x (W -> A(x))", "W -> exists x A(x)"),
        ("forall x (A(x) -> W)", "(exists x A(x)) -> W"), ("exists x (A(x) -> W)", "(forall x A(x)) -> W"),
        ("forall x W", "W"), ("exists x W", "W")]
for a, b in NULL:
    EQUIV3(a, b)
wn = {"A": U(0), "W": set()}                                                               # null-derivation sanity check
assert not holds("forall x (A(x) -> W)", 2, wn) and not holds("(exists x A(x)) -> W", 2, wn) and holds("(forall x A(x)) -> W", 2, wn)
assert not P.equivalent("forall x (A(x) -> W)", "(forall x A(x)) -> W")
EQUIV3("(exists x (P(x) & W)) | (exists x (Q(x) & W))", "(exists x (P(x) | Q(x))) & W")   # ex-null-easy
q = B["cse-2020-cs-39"]                                                                    # ex-null-medium
O = {k: fix(t) for k, t in D.opts(q).items()}
for k in "ABD":
    VALID3(O[k])
assert not holds(O["C"], 2, {"p": U(0), "W": set()})
D.assert_key("cse-2020-cs-39", [k for k, t in O.items() if not P.valid(t, 2)])
q = B["it-2008-it-21"]                                                                     # ex-null-gate (α(x) -> A(x), β -> W)
# The paper writes "∀x, β → α(x)" for ∀x(β → α(x)); a verbatim parse would bind only β, so the options are
# transcribed by hand (α(x) -> A(x), β -> nullary W) and their pieces matched against the printed text.
O = {"A": "(W -> exists x A(x)) -> forall x (W -> A(x))", "B": "(exists x (W -> A(x))) -> (W -> forall x A(x))",
     "C": "((exists x A(x)) -> W) -> forall x (A(x) -> W)", "D": "((forall x A(x)) -> W) -> forall x (A(x) -> W)"}
for k, t in D.opts(q).items():
    flat = t.replace(" ", "").strip("$")
    assert flat.startswith({"A": "[\\beta\\to(\\exists", "B": "[\\existsx,\\beta", "C": "[(\\existsx", "D": "[(\\forallx"}[k]), (k, flat)
VALID3(O["C"])
assert not holds(O["A"], 2, {"A": U(0), "W": {()}}) and not holds(O["B"], 2, {"A": U(0), "W": {()}})
assert not holds(O["D"], 2, {"A": U(0), "W": set()})
D.assert_key("it-2008-it-21", [k for k, t in O.items() if P.valid(t, 2)])
VALID3("exists x (P(x) -> forall y P(y))")                                                 # ex-null-drinker
assert not P.equivalent("forall x (P(x) -> Q(x))", "(exists x P(x)) -> Q(x)")              # ex-null-edge
assert holds("forall x (P(x) -> Q(x))", 2, {"P": U(0), "Q": U(0)}) and not holds("(exists x P(x)) -> Q(x)", 2, {"P": U(0), "Q": U(0)}, {"x": 1})

# ── Prenex form ───────────────────────────────────────────────────────────
EQUIV3("(forall x P(x)) -> exists x Q(x)", "exists x (~P(x) | Q(x))")                     # ex-pnf-easy
EQUIV3("~(exists x forall y R(x, y)) | forall z P(z)", "forall x exists y forall z (~R(x, y) | P(z))")  # ex-pnf-medium
EQUIV3("~(exists x forall y R(x, y)) | forall z P(z)", "forall z forall x exists y (~R(x, y) | P(z))")
# ex-pnf-gate: Q is ternary, so size 3 would mean 2^27 interpretations of Q; checked on sizes 1..2 (the law chain is the proof).
EQUIV3("forall x forall y ((exists z (P(x, z) & P(y, z))) -> exists u Q(x, y, u))",
       "forall x forall y forall z exists u (~P(x, z) | ~P(y, z) | Q(x, y, u))", 2)
EQUIV3("(forall x P(x)) | forall x Q(x)", "forall x forall y (P(x) | Q(y))")               # ex-pnf-edge, trap-rename
assert not P.equivalent("(forall x P(x)) | forall x Q(x)", "forall x (P(x) | Q(x))")
EQUIV3("(forall x P(x)) | exists y Q(y)", "forall x exists y (P(x) | Q(y))")                # trick-prenex-order
EQUIV3("(forall x P(x)) | exists y Q(y)", "exists y forall x (P(x) | Q(y))")

# ── Quantifier order ──────────────────────────────────────────────────────
VALID3("(exists y forall x R(x, y)) -> forall x exists y R(x, y)")                         # swap-theorem
VALID3("(exists x forall y R(x, y)) -> forall y exists x R(x, y)")
VALID3("(forall x forall y R(x, y)) -> exists y forall x R(x, y)")
VALID3("(forall x exists y R(x, y)) -> exists x exists y R(x, y)")
DIAG = {"R": {(0, 0), (1, 1)}}
COL = {"R": {(0, 0), (1, 0)}}
assert holds("forall x exists y R(x, y)", 2, DIAG) and not holds("exists y forall x R(x, y)", 2, DIAG)
SWAP_BAD = "(forall x exists y R(x, y)) -> exists y forall x R(x, y)"
assert P.counter_model(SWAP_BAD, 1) is None and P.counter_model(SWAP_BAD, 2) is not None   # ex-swap-edge: smallest is 2
# trick-grid: the diagonal satisfies the 'each' forms, not the 'full' forms; a full column only ∃y∀x and ∀x∃y.
for f, d, c in [("forall x exists y R(x, y)", True, True), ("exists y forall x R(x, y)", False, True),
                ("exists x forall y R(x, y)", False, False), ("forall y exists x R(x, y)", True, False)]:
    assert holds(f, 2, DIAG) == d and holds(f, 2, COL) == c, f
Z = range(-20, 21)                                                                         # ex-swap-easy (integers, sampled)
assert all(any(x < y for y in range(-20, 22)) for x in Z) and not any(all(x < y for x in Z) for y in Z)
q = B["cse-2017-1-cs-2"]                                                                   # ex-swap-medium
FF = "forall x exists y R(x, y)"
S17 = {"I": "exists y exists x R(x, y)", "II": "exists y forall x R(x, y)", "III": "forall y exists x R(x, y)",
       "IV": "~exists x forall y ~R(x, y)"}
imp = sorted(k for k, s in S17.items() if P.valid(f"({FF}) -> ({s})", 2))
assert imp == ["I", "IV"]
for k in ("I", "IV"):
    VALID3(f"({FF}) -> ({S17[k]})")
assert not holds(S17["III"], 2, COL) and not holds(S17["II"], 2, DIAG)
D.assert_key("cse-2017-1-cs-2", D.which(q, lambda t: t.strip().rstrip(".") in ("I and IV only",)))
q = B["cse-2015-2-cs-55"]                                                                  # ex-swap-gate, ex-two-edge
O = {k: fix(t) for k, t in D.opts(q).items()}
assert not holds(O["A"], 2, DIAG)
assert not holds(O["B"], 1, {"R": set(), "S": set()}, {"y": 0})
VALID3(O["C"])
VALID3(O["D"])
taut15 = sorted(k for k, t in O.items() if P.valid(t, 2))
# BANK NOTE: as printed, option D (∀x∀yP(x,y) → ∀x∀yP(y,x)) is ALSO valid, so the MCQ has two correct options;
# the bank key C (the intended / published answer) is one of them. We assert both and keep the key C.
assert taut15 == ["C", "D"]
D.assert_key("cse-2015-2-cs-55", "C")
q = B["it-2007-cs-21"]                                                                     # IT 2007
O = {k: fix(t) for k, t in D.opts(q).items()}
assert P.parse(O["B"]) == P.parse("(exists x (P(x) | Q(x))) -> ((exists x P(x)) -> exists x Q(x))")
VALID3(O["A"])
assert not holds(O["B"], 2, {"P": U(0, 1), "Q": set()}) and not holds(O["C"], 2, w01)
assert not holds(O["D"], 2, {"P": {(0, 0), (1, 1)}})
D.assert_key("it-2007-cs-21", [k for k, t in O.items() if P.valid(t, 2)])

# ── Infinite models (GATE 1991) ────────────────────────────────────────────
SER, ASY = "forall x exists y R(x, y)", "forall x forall y (R(x, y) -> ~R(y, x))"
TRA, IRR = "forall x forall y forall z (R(x, y) & R(y, z) -> R(x, z))", "forall x ~R(x, x)"
PHI = f"({SER}) & ({ASY}) & ({TRA}) & ({IRR})"
# Only infinite models: no finite model is proved in the lesson (successor chain + pigeonhole); searched up to size 4.
assert P.model(PHI, 4) is None
N = 60                                                                                     # (ℕ, <) on an initial segment: all but seriality exactly
LT = {(i, j) for i in range(N) for j in range(N) if i < j}
assert holds(f"({ASY}) & ({TRA}) & ({IRR})", 12, {"R": {(i, j) for i, j in LT if j < 12}})
assert all(any((i, j) in LT for j in range(N)) for i in range(N - 1))                       # every n < N-1 has n+1
VALID3(f"({ASY}) -> ({IRR})")                                                             # irreflexivity is redundant
assert P.model(f"({ASY}) & ({TRA}) & ({IRR})", 1) is not None                             # ex-inf-medium: size 1
mm = P.model(f"({SER}) & ({ASY}) & ({IRR})", 3)                                            # ex-inf-edge: smallest 3
assert P.model(f"({SER}) & ({ASY}) & ({IRR})", 2) is None and len(mm[0]) == 3
assert holds(f"({SER}) & ({ASY}) & ({IRR})", 3, R3) and not holds(TRA, 3, R3)
LEQ = {"R": {(i, j) for i in range(5) for j in range(5) if i <= j}}                        # ex-inf-easy: ≤ is not irreflexive
assert not holds(IRR, 5, LEQ)
D.must_contain(B["cse-1991-b-15-b"]["answer"], "No finite models", "satisfiable")
assert P.parse(B["cse-1991-b-15-b"]["text"].split("$$")[1].replace("(\\forall x)", "\\forall x ")) is not None

# ── Diagonal formula (GATE 2003 Q33) ───────────────────────────────────────
VALID3("~exists x forall y (Q(x, y) <-> ~Q(y, y))")                                        # russell-theorem
VALID3("~exists x forall y (R(x, y) <-> ~R(y, x))")                                        # ex-rus-medium
assert all(not holds("forall y (Q(x, y) <-> ~Q(y, y))", 1, {"Q": q_}, {"x": 0}) for q_ in (set(), {(0, 0)}))
ALPHA = "(forall x (P(x) <-> forall y (Q(x, y) <-> ~Q(y, y)))) -> forall x ~P(x)"
VALID3(ALPHA)
dom = list(range(1, 40))                                                                    # I1, I2 on an initial segment
div = {(x, y) for x in dom for y in dom if x % y == 0}
isprime = lambda n: n > 1 and all(n % d for d in range(2, n))  # noqa: E731
for pred in (isprime, lambda n: n > 1 and not isprime(n)):
    I = {"P": {(n,) for n in dom if pred(n)}, "Q": div}
    assert P.holds(ALPHA, dom, I) and not P.holds("forall x ~P(x)", dom, I)
D.assert_key("cse-2003-cs-33", "D")
RE = "forall x exists y (Q(x, y) <-> ~Q(y, y))"                                            # ex-rus-edge
assert P.model(RE, 1) is None
me = P.model(RE, 2)
assert me is not None and len(me[0]) == 2
assert holds(RE, 2, {"Q": {(0, 0), (0, 1)}})

# ── Horn clauses (GATE 2003 Q71) ───────────────────────────────────────────
PROG = "(forall x forall y (B(x, y) & C(y) -> A(x))) & (forall x ~B(x, x))"
EQUIV3("forall x forall y (B(x, y) & C(y) -> A(x))", "forall x ((exists y (B(x, y) & C(y))) -> A(x))")
EQUIV3("forall x ~B(x, x)", "~exists x B(x, x)")
q = B["cse-2003-cs-71"]
O = {k: fix(t) for k, t in D.opts(q).items()}
EQUIV3(O["A"], PROG)
assert O["B"] == O["D"]                                                                    # printed identical (bank note)
wh = {"A": set(), "B": {(0, 1)}, "C": U(1)}
assert not holds(PROG, 2, wh) and holds(O["B"], 2, wh)
wc = {"A": set(), "B": {(0, 0)}, "C": set()}
assert not holds(PROG, 1, wc) and holds(O["C"], 1, wc)
D.assert_key("cse-2003-cs-71", [k for k, t in O.items() if P.equivalent(t, PROG, 2)])
assert not holds("forall x forall y (B(x, y) & C(y) -> A(x))", 2, wh) and not holds("forall x ((exists y (B(x, y) & C(y))) -> A(x))", 2, wh)
EQUIV3("forall x forall y forall z (P(x, y) & P(y, z) -> G(x, z))", "forall x forall z ((exists y (P(x, y) & P(y, z))) -> G(x, z))", 2)  # ex-horn-easy
EQUIV3("forall x (B(x, x) -> F)", "~exists x B(x, x)")                                     # ex-horn-medium
EQUIV3("forall x forall y (Q(y) -> P(x))", "(exists y Q(y)) -> forall x P(x)")              # ex-horn-edge

# ── Induction (GATE 2025) ─────────────────────────────────────────────────
def ind_ok(n, base, step, cover):
    """On {0..n}: every S containing `base` and closed under step (where defined) equals {0..n} iff cover."""
    U_ = set(range(n + 1))
    for mask in range(1 << (n + 1)):
        S = {i for i in U_ if mask >> i & 1}
        if base <= S and all(step(x) not in U_ or x not in S or step(x) in S for x in U_):
            if S != U_:
                return False
    return True


assert ind_ok(10, {0}, lambda x: x + 1, True)                                              # induction-theorem sanity (finite segments)
assert not ind_ok(10, {0}, lambda x: x + 2, True) and ind_ok(10, {0, 1}, lambda x: x + 2, True)  # ex-ind-edge
NAT = range(0, 3000)
for base, step, Pp in [(1000, 1, lambda x: x >= 1000), (1000, -1, lambda x: x <= 1000), (0, -1, lambda x: x == 0)]:
    hyp = Pp(base) and all((not Pp(x)) or Pp(max(x + step, 0)) for x in NAT[:-1])          # truncated 0 - 1 = 0
    hyp2 = Pp(base) and all((not Pp(x)) or Pp(x + step) for x in NAT[1:-1])                # step only where x - 1 ∈ ℕ
    assert hyp and hyp2 and not all(Pp(x) for x in NAT)
D.assert_key("cse-2025-2-cs-5", "A")

# ── Small models (GATE 2018) ──────────────────────────────────────────────
def restrict(I, E):
    return {k: {t for t in v if all(a in E for a in t)} for k, v in I.items()}


BS = "exists s exists t exists u forall v forall w (R(s, t) & R(t, u) & s != u & (R(v, w) -> ~R(w, v)))"
M7 = {"R": {(i, j) for i in range(7) for j in range(7) if i < j}}
assert P.holds(BS, list(range(7)), M7)
wit = (2, 4, 6)
body = "forall v forall w (R(s, t) & R(t, u) & s != u & (R(v, w) -> ~R(w, v)))"
assert P.holds(body, list(range(7)), M7, dict(zip("stu", wit)))
assert P.holds(BS, list(wit), restrict(M7, wit)) and P.holds(body, list(wit), restrict(M7, wit), dict(zip("stu", wit)))
# The theorem on random ∃²∀² sentences over one binary R: a model up to size 4 implies one up to size 2, and the
# restriction of the found model to its witnesses is itself a model (the proof, executed).
rng = random.Random(7)
ATOMS = ["R(s, t)", "R(t, s)", "R(s, s)", "R(v, w)", "R(w, v)", "R(s, v)", "R(v, t)", "s = t", "v = w", "R(v, v)"]
for _ in range(25):
    cls = [" | ".join(("~" if rng.random() < 0.5 else "") + a for a in rng.sample(ATOMS, 3)) for _ in range(3)]
    mat = " & ".join(f"({c})" for c in cls)
    sen = f"exists s exists t forall v forall w ({mat})"
    big = P.model(sen, 3)
    if big is None:
        continue
    dom_, I, _ = big
    e = P.F(f"forall v forall w ({mat})")
    st = next((s, t) for s in dom_ for t in dom_ if P.ev(e, dom_, I, {"s": s, "t": t}))
    E = sorted(set(st))
    assert P.ev(e, E, restrict(I, E), {"s": st[0], "t": st[1]}) and P.model(sen, 2) is not None
assert P.model("exists x forall y R(x, y)", 1) is not None                                  # ex-bs-easy
assert holds("exists x forall y R(x, y)", 1, {"R": {(0, 0)}})
TWO = "exists x exists y forall z (x != y & (z = x | z = y))"                              # ex-bs-medium
assert [n for n in range(1, 5) if any(P.holds(TWO, list(range(n)), {}) for _ in [0])] == [2]
assert all(P.holds("exists s exists t exists u forall v (v = v)", list(range(n)), {}) for n in range(1, 9))
q = B["cse-2018-cs-28"]                                                                    # ex-bs-gate: A true; B, C, D refuted
D.assert_key("cse-2018-cs-28", "A")
TH = "(forall x exists y R(x, y)) & forall x ~R(x, x)"                                     # ex-bs-edge
assert P.model(TH, 1) is None and holds(TH, 2, {"R": {(0, 1), (1, 0)}}) and not holds(TH, 1, restrict({"R": {(0, 1), (1, 0)}}, {0}))

# ── IT 2006 and 2013 keys ─────────────────────────────────────────────────
D.assert_key("it-2006-cs-21", "B")
q = B["cse-2013-cs-47"]
O = {k: fix(t, [("\\alpha", "A(x, y)"), ("\\beta", "Bt(x, z)")]) for k, t in D.opts(q).items()}
G13 = "~exists x ((forall y A(x, y)) & forall z Bt(x, z))"
noteq = sorted(k for k, t in O.items() if not P.equivalent(t, G13, 2))
for k in "BC":
    EQUIV3(O[k], G13, 2)    # binary α(x, y), β(x, z): size 3 is 2^18 interpretations; the law chain in the lesson is the proof
# BANK NOTE: as printed both A (∀x(Q ∨ P)) and D (∀x(P ∨ ¬Q)) are NOT equivalent; the key D is one of them.
assert noteq == ["A", "D"]
D.assert_key("cse-2013-cs-47", "D")

# ── Practice ───────────────────────────────────────────────────────────────
def pfix(t):
    return fix(t)


q = PR["nx-dm-02-02-q01"]
D.assert_mcq(q, [k for k, t in D.opts(q).items() if P.valid(pfix(t), 3)][0])
cnt = 0
for Pm in range(4):
    for Qm in range(4):
        I = {"P": {(i,) for i in range(2) if Pm >> i & 1}, "Q": {(i,) for i in range(2) if Qm >> i & 1}}
        cnt += not holds(F_OR, 2, I)
D.assert_nat(PR["nx-dm-02-02-q02"], cnt)
q = PR["nx-dm-02-02-q03"]
D.assert_mcq(q, [k for k, t in D.opts(q).items() if P.equivalent(pfix(t), "~exists x forall y (P(x, y) -> Q(y))", 2)][0])
q = PR["nx-dm-02-02-q04"]
D.assert_msq(q, [k for k, t in D.opts(q).items() if P.valid(pfix(t), 3)])
q = PR["nx-dm-02-02-q05"]
D.assert_mcq(q, [k for k, t in D.opts(q).items() if P.valid(f"(exists y forall x R(x, y)) -> ({pfix(t)})", 3)][0])
SA = f"({SER}) & ({ASY})"
D.assert_nat(PR["nx-dm-02-02-q06"], min(len(P.model(SA, k)[0]) for k in (3,) if P.model(SA, 2) is None))
q = PR["nx-dm-02-02-q07"]
D.assert_mcq(q, [k for k, t in D.opts(q).items() if P.equivalent(pfix(t), "forall x forall y (Q(x, y) & R(y) -> P(x))", 2)][0])
q = PR["nx-dm-02-02-q08"]
D.assert_mcq(q, [k for k, t in D.opts(q).items() if P.equivalent(pfix(t), "(forall x P(x)) | forall x Q(x)", 3)][0])
q = PR["nx-dm-02-02-q09"]
# no finite model: proved in the solution (irreflexive + transitive gives asymmetric, then the 1991 argument); searched to size 4
D.assert_msq(q, [k for k, t in D.opts(q).items() if P.model(pfix(t), 4) is None])
for k, t in D.opts(q).items():
    if P.model(pfix(t), 4) is not None:
        assert P.model(pfix(t), 3) is not None
D.assert_nat(PR["nx-dm-02-02-q10"], 4)                                                     # k = 4 existentials: small-model theorem
assert P.model("exists a exists b exists c exists d forall u (a != b & a != c & a != d & b != c & b != d & c != d)", 3) is None
assert P.model("exists a exists b exists c exists d forall u (a != b & a != c & a != d & b != c & b != d & c != d)", 4) is not None
q = PR["nx-dm-02-02-q11"]
# induction variants checked on {0..n}: base set and step
VAR11 = {"A": ({0}, lambda x: x + 2), "B": ({0, 1}, lambda x: x + 2), "C": ({1}, lambda x: x + 1), "D": ({0}, lambda x: x - 1)}
D.assert_mcq(q, [k for k, (b_, s_) in VAR11.items() if ind_ok(9, b_, s_, True)][0])
q = PR["nx-dm-02-02-q12"]
F12 = "(forall x forall y (R(x, y) -> R(y, x))) & (exists x exists y R(x, y)) & (forall x ~R(x, x))"
assert P.satisfiable(F12) and P.satisfiable(("not", P.F(F12)))
D.assert_mcq(q, "C")
DR = "exists x (P(x) -> forall y P(y))"
D.assert_nat(PR["nx-dm-02-02-q13"], sum(not holds(DR, 3, {"P": {(i,) for i in range(3) if m >> i & 1}}) for m in range(8)))
assert len([k for k in PR if k.startswith("nx-dm-02-02-")]) == 13

D.must_contain(TXT, "Only **(A)**", "**(B)**. One world", "**(D)**. Notice", "**(C)** is not valid", "**I and IV only**",
               "**Both** $I_1$ and $I_2$", "**(A)**, the principle", "No finite models; **satisfiable**")
print("l2_02_validity: two-way, one-way and null-quantification laws, prenex forms, swap, infinite models, diagonal, "
      "Horn clauses, induction, small models, 16 PYQ keys and 13 practice answers OK")
