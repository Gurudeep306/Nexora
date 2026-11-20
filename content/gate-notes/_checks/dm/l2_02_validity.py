"""Checks for dm/02-predicate-logic/02-quantifier-laws-validity: every two-way and one-way law (valid
directions by exhaustive search up to size 3, converses by explicit counter-models), the pull-out laws,
prenex conversions, the barber formula, the infinite-model sentence, the small-model argument, the
induction variants, the Horn translation, every worked example, all sixteen PYQ keys and the ten
practice answers."""
import itertools
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib as D  # noqa: E402
import predlib as P  # noqa: E402
from _folnorm import norm  # noqa: E402

B = D.bank()
PR = D.practice(2)
TXT = D.lesson_text(2, "02")
V = lambda f, k=3: P.valid(f, k)  # noqa: E731
EQ = lambda a, b, k=3: P.equivalent(a, b, k)  # noqa: E731
TURN = ([0, 1], {"P": {(0,)}, "Q": {(1,)}})


def fails(f, dom, I):
    return not P.holds(f, dom, I)


# ── Laws ─────────────────────────────────────────────────────────────────────
assert EQ("forall x (P(x) & Q(x))", "(forall x P(x)) & (forall x Q(x))")
assert EQ("exists x (P(x) | Q(x))", "(exists x P(x)) | (exists x Q(x))")
assert EQ("~forall x P(x)", "exists x ~P(x)") and EQ("~exists x P(x)", "forall x ~P(x)")
assert EQ("forall x P(x)", "forall y P(y)")
one_way = [("(forall x P(x)) | (forall x Q(x))", "forall x (P(x) | Q(x))"),
           ("exists x (P(x) & Q(x))", "(exists x P(x)) & (exists x Q(x))"),
           ("forall x (P(x) -> Q(x))", "(forall x P(x)) -> (forall x Q(x))"),
           ("forall x (P(x) -> Q(x))", "(exists x P(x)) -> (exists x Q(x))"),
           ("forall x (P(x) <-> Q(x))", "(forall x P(x)) <-> (forall x Q(x))"),
           ("forall x P(x)", "exists x P(x)")]
for a, b in one_way:
    assert V(f"({a}) -> ({b})") and not V(f"({b}) -> ({a})"), (a, b)
assert V("(exists y forall x R(x, y)) -> (forall x exists y R(x, y))", 3) and not V("(forall x exists y R(x, y)) -> (exists y forall x R(x, y))", 3)
# Table's counter-models, exactly as stated.
assert P.holds("forall x (P(x) | Q(x))", *TURN) and fails("(forall x P(x)) | (forall x Q(x))", *TURN)
assert P.holds("(exists x P(x)) & (exists x Q(x))", *TURN) and fails("exists x (P(x) & Q(x))", *TURN)
w1 = ([0, 1], {"P": {(0,)}, "Q": set()})
assert P.holds("(forall x P(x)) -> (forall x Q(x))", *w1) and fails("forall x (P(x) -> Q(x))", *w1)
assert P.holds("(exists x P(x)) -> (exists x Q(x))", *TURN) and fails("forall x (P(x) -> Q(x))", *TURN)
assert P.holds("(forall x P(x)) <-> (forall x Q(x))", *TURN) and fails("forall x (P(x) <-> Q(x))", *TURN)
# Pull-out laws (W is a 0-ary predicate, so x is not free in it).
pulls = [("forall x (p(x) | W)", "(forall x p(x)) | W"), ("exists x (p(x) | W)", "(exists x p(x)) | W"),
         ("forall x (p(x) & W)", "(forall x p(x)) & W"), ("exists x (p(x) & W)", "(exists x p(x)) & W"),
         ("forall x (W -> p(x))", "W -> forall x p(x)"), ("exists x (W -> p(x))", "W -> exists x p(x)"),
         ("forall x (p(x) -> W)", "(exists x p(x)) -> W"), ("exists x (p(x) -> W)", "(forall x p(x)) -> W")]
for a, b in pulls:
    assert EQ(a, b), (a, b)
assert not EQ("forall x (p(x) -> W)", "(forall x p(x)) -> W")
# Prenex forms (ex-pf-prenex, ex-pf-prenex2, the scene).
assert EQ("(forall x P(x)) -> (exists x Q(x))", "exists x exists y (P(x) -> Q(y))")
assert EQ("~exists x (P(x) & forall y R(x, y))", "forall x exists y (~P(x) | ~R(x, y))", 2)
# Barber (2003-33): α is valid; the core ¬∃x∀y(Q(x,y) ↔ ¬Q(y,y)) too.
assert V("~exists x forall y (Q(x, y) <-> ~Q(y, y))")
alpha = "(forall x (P(x) <-> forall y (Q(x, y) <-> ~Q(y, y)))) -> forall x ~P(x)"
assert V(alpha)
# Infinite-only sentence (1991): no model up to size 4; (ℕ, <) satisfies the universal parts.
PHI = ("(forall x exists y R(x, y)) & (forall x forall y (R(x, y) -> ~R(y, x))) & "
       "(forall x forall y forall z ((R(x, y) & R(y, z)) -> R(x, z))) & (forall x ~R(x, x))")
assert P.model(PHI, 4) is None
N = list(range(8))
LT = {(a, b) for a in N for b in N if a < b}
assert P.holds("(forall x forall y (R(x, y) -> ~R(y, x))) & (forall x forall y forall z ((R(x, y) & R(y, z)) -> R(x, z))) & (forall x ~R(x, x))", N, {"R": LT})
# Small-model property: every ∃^k∀ sentence that has a model of size ≤ 4 here also has one of size ≤ k (exhaustive on small cases).
SMALL = ["exists s exists t forall v (L(v, s) | v = t)", "exists s forall v (L(s, v) & ~L(v, v) | v = s)",
         "exists s exists t (s != t & forall v ((L(v, s) <-> ~L(v, t))))", "exists s exists t exists u forall v (v = s | v = t | v = u)"]
for f in SMALL:
    k = f.count("exists")
    if P.model(f, 4) is not None:
        assert P.model(f, k) is not None, f
# Size sentences.
assert all(P.holds("exists x exists y forall z (z = x | z = y)", list(range(n)), {}) == (n <= 2) for n in range(1, 6))
assert all(P.holds("forall x forall y (x = y)", list(range(n)), {}) == (n == 1) for n in range(1, 5))
assert P.model("(forall x forall y (x = y)) & (exists x exists y (x != y))", 4) is None
ex_sat = "(exists x exists y (x != y & P(x) & ~P(y))) & (forall z forall w ((P(z) & P(w)) -> z = w))"
assert P.model(ex_sat, 1) is None and P.model(ex_sat, 2) is not None
# Induction variants (2025): counterexample predicates on 0..3000, and the schema on {0..8} with a capped successor.
M = 3000
for hyp_start, step_dir, Pset in [(0, -1, {0}), (1000, -1, set(range(0, 1001))), (1000, +1, set(range(1000, M + 2)))]:
    assert hyp_start in Pset
    assert all((x + step_dir) in Pset or (x + step_dir) < 0 for x in Pset if x <= M)
    assert not all(x in Pset for x in range(0, M + 1))
for bits in itertools.product([0, 1], repeat=9):
    S = {i for i, b in enumerate(bits) if b}
    if 0 in S and all((x + 1) in S for x in S if x < 8):
        assert S == set(range(9))
# Horn translation (2003-71).
assert EQ("forall x forall y ((B(x, y) & C(y)) -> A(x))", "forall x ((exists y (B(x, y) & C(y))) -> A(x))", 2)
assert not EQ("forall x ((exists y (B(x, y) & C(y))) -> A(x))", "forall x ((forall y (B(x, y) & C(y))) -> A(x))", 2)

# ── Worked examples ──────────────────────────────────────────────────────────
sym = "forall x forall y (R(x, y) -> R(y, x))"
assert P.model(sym) is not None and P.counter_model(sym) is not None                         # ex-cls-easy (IT 2006)
assert V("forall x P(x) -> exists x P(x)")                                                   # ex-cls-valid
assert P.model("(exists x forall y R(x, y)) & (forall x exists y ~R(x, y))") is None         # ex-cls-unsat
F17 = "forall x exists y R(x, y)"
assert V(f"({F17}) -> exists y exists x R(x, y)") and V(f"({F17}) -> ~exists x forall y ~R(x, y)")
w2 = ([0, 1], {"R": {(0, 1), (1, 0)}})
w3 = ([0, 1], {"R": {(0, 0), (1, 0)}})
assert P.holds(F17, *w2) and fails("exists y forall x R(x, y)", *w2)
assert P.holds(F17, *w3) and fails("forall y exists x R(x, y)", *w3)                       # ex-cls-implied (2017)
assert P.model("exists x (P(x) & ~P(x))") is None and V("(exists x P(x)) | (exists x ~P(x))")
assert P.model("(exists x P(x)) -> forall x P(x)") is not None and P.counter_model("(exists x P(x)) -> forall x P(x)") is not None  # check-classify
assert V("exists x (P(x) -> forall y P(y))")                                                  # drinker (practice q10)
assert V("(forall x forall y R(x, y)) -> forall x R(x, x)") and not V("(forall x R(x, x)) -> forall x forall y R(x, y)")  # ex-pf-instance
assert V("(forall x (P(x) -> Q(x))) -> ((exists x P(x)) -> (exists x Q(x)))")                 # ex-pf-imp-exists
assert V("(exists x (P(x) & Q(x))) -> ((exists x P(x)) & (exists x Q(x)))")                  # ex-pf-exists-and
assert V("P(c) -> exists y P(y)")                                                             # ex-open-valid (closure over c)
assert EQ("forall x (Late(x) -> Delay)", "(exists x Late(x)) -> Delay")                       # ex-pull-easy
# ex-open-capture: φ[z/x] keeps meaning; the captured version is valid (so it lost its content).
assert V("forall y (R(y, y) -> R(y, y))") and not V("forall z forall y (R(z, y) -> R(y, z))")

# ── PYQ keys ─────────────────────────────────────────────────────────────────
assert P.model(PHI, 4) is None
assert B["cse-1991-b-15-b"]["answer"].startswith("No finite models")
q92 = {"A": "((forall x P(x)) | (forall x Q(x))) -> forall x (P(x) | Q(x))",
       "B": "((exists x P(x)) & (exists x Q(x))) -> exists x (P(x) & Q(x))",
       "C": "(forall x (P(x) | Q(x))) -> ((forall x P(x)) | (forall x Q(x)))",
       "D": "(exists x (P(x) | Q(x))) -> ((~forall x P(x)) | (exists x Q(x)))"}
D.assert_key("cse-1992-a-2-xv", sorted(l for l, f in q92.items() if V(f)))
q0332 = {"A": "((forall x Al(x)) -> (forall x Be(x))) -> forall x (Al(x) -> Be(x))",
         "B": "(forall x Al(x)) -> exists x (Al(x) & Be(x))",
         "C": "((forall x (Al(x) | Be(x))) -> (exists x Al(x))) -> forall x Al(x)",
         "D": "(forall x (Al(x) -> Be(x))) -> ((forall x Al(x)) -> (forall x Be(x)))"}
D.assert_key("cse-2003-cs-32", [l for l, f in q0332.items() if V(f)])
D.assert_key("cse-2003-cs-33", "D")   # α is valid (checked above), so both interpretations satisfy it
q0371 = {l: P.parse(norm(t)) for l, t in D.opts(B["cse-2003-cs-71"]).items()}
ref71 = "(forall x ((exists y (B(x, y) & C(y))) -> A(x))) & ~exists x B(x, x)"
D.assert_key("cse-2003-cs-71", sorted(l for l, f in q0371.items() if EQ(f, ref71, 2)))
fit05 = {l: P.parse(norm(t)) for l, t in D.opts(B["it-2005-cs-36"]).items()}
D.assert_key("it-2005-cs-36", sorted(l for l, f in fit05.items() if V(f)))
D.assert_key("it-2006-cs-21", "B")   # sym: model and counter-model both exist (above)
# Options as printed run letters together ("\\exists yP(x,y)"); written out here.
fit07 = {"A": "(forall x (P(x) -> Q(x))) -> ((forall x P(x)) -> (forall x Q(x)))",
         "B": "(exists x (P(x) | Q(x))) -> ((exists x P(x)) -> (exists x Q(x)))",
         "C": "(exists x (P(x) & Q(x))) <-> ((exists x P(x)) & (exists x Q(x)))",
         "D": "(forall x exists y R(x, y)) -> (exists y forall x R(x, y))"}
D.assert_key("it-2007-cs-21", sorted(l for l, f in fit07.items() if V(f, 2)))
it08 = {"A": "(Be -> exists x Al(x)) -> forall x (Be -> Al(x))", "B": "(exists x (Be -> Al(x))) -> (Be -> forall x Al(x))",
        "C": "((exists x Al(x)) -> Be) -> forall x (Al(x) -> Be)", "D": "((forall x Al(x)) -> Be) -> forall x (Al(x) -> Be)"}
D.assert_key("it-2008-it-21", [l for l, f in it08.items() if V(f)])
# 2013: with P = ∀y α(x, y), Q = ∀z β(x, z) (α, β binary), compare each option with the target.
tgt13 = "~exists x ((forall y Al(x, y)) & (forall z Be(x, z)))"
o13 = {"A": "forall x ((exists z ~Be(x, z)) -> forall y Al(x, y))", "B": "forall x ((forall z Be(x, z)) -> exists y ~Al(x, y))",
       "C": "forall x ((forall y Al(x, y)) -> exists z ~Be(x, z))", "D": "forall x ((exists y ~Al(x, y)) -> exists z ~Be(x, z))"}
not_eq13 = sorted(l for l, f in o13.items() if not EQ(f, tgt13, 2))
assert not_eq13 == ["A", "D"]                          # both, as printed (see _errata/dm.md)
D.assert_key("cse-2013-cs-47", "D")                    # published key
o15 = {"A": "(forall x exists y R(x, y)) <-> (exists y forall x R(x, y))",
       "B": "(forall x forall y ((exists u R(x, u)) -> S(x, y))) -> forall x exists y S(x, y)",
       "C": "(forall x exists y (P(x, y) -> R(x, y))) <-> (forall x exists y (~P(x, y) | R(x, y)))",
       "D": "(forall x forall y P(x, y)) -> (forall x forall y P(y, x))"}
valid15 = sorted(l for l, f in o15.items() if V(f, 2))
assert valid15 == ["C", "D"]                           # D valid as printed (see _errata/dm.md)
# B with y free in S(x, y) read universally (closure) is refuted with R, S empty:
assert fails(o15["B"], [0], {"R": set(), "S": set()})
D.assert_key("cse-2015-2-cs-55", "C")                  # published key
f16 = {l: P.parse(norm(t)) for l, t in D.opts(B["cse-2016-2-cs-27"]).items()}
D.assert_key("cse-2016-2-cs-27", sorted(l for l, f in f16.items() if not V(f)))
romans = {"I": "exists y exists x R(x, y)", "II": "exists y forall x R(x, y)", "III": "forall y exists x R(x, y)", "IV": "~exists x forall y ~R(x, y)"}
implied = sorted(k for k, f in romans.items() if V(f"({F17}) -> ({f})"))
assert implied == ["I", "IV"]
D.assert_key("cse-2017-1-cs-2", "B")
# 2018: the 7-element model of an ∃³∀ sentence shrinks to its 3 witnesses (the scene's sentence), and ψ = (v = v) has models of every size.
f18 = "exists s exists t exists u forall v (L(v, s) | v = t | v = u)"
L7 = {(v, 0) for v in range(7)}
assert P.holds(f18, list(range(7)), {"L": L7}) and P.holds(f18, [0, 1, 2], {"L": {(v, 0) for v in range(3)}})
assert all(P.holds("exists s exists t exists u forall v (v = v)", list(range(n)), {}) for n in (1, 3, 7, 9))
D.assert_key("cse-2018-cs-28", "A")
f20 = {l: P.parse(norm(t)) for l, t in D.opts(B["cse-2020-cs-39"]).items()}
D.assert_key("cse-2020-cs-39", sorted(l for l, f in f20.items() if not V(f)))
D.assert_key("cse-2025-2-cs-5", "A")

# ── Practice ─────────────────────────────────────────────────────────────────
def pf(qid):
    return {k: P.parse(norm(v)) for k, v in D.opts(PR[qid]).items()}


D.assert_mcq(PR["nx-dm-02-02-q01"], [l for l, f in pf("nx-dm-02-02-q01").items() if V(f)][0])
f2 = "(exists x P(x)) & (exists x ~P(x))"
assert P.model(f2) is not None and P.counter_model(f2) is not None
D.assert_mcq(PR["nx-dm-02-02-q02"], "A")
cnt = 0
for I in P.interpretations({"P": 1, "Q": 1}, [0, 1]):
    if fails("(forall x (P(x) | Q(x))) -> ((forall x P(x)) | (forall x Q(x)))", [0, 1], I):
        cnt += 1
D.assert_nat(PR["nx-dm-02-02-q03"], cnt)
D.assert_msq(PR["nx-dm-02-02-q04"], sorted(l for l, f in pf("nx-dm-02-02-q04").items() if EQ(f, "forall x (P(x) -> W)")))
D.assert_mcq(PR["nx-dm-02-02-q05"], [l for l, f in pf("nx-dm-02-02-q05").items() if EQ(f, "(exists x P(x)) -> (forall y Q(y))")][0])
three = "exists x exists y exists z (x != y & y != z & x != z)"
D.assert_nat(PR["nx-dm-02-02-q06"], min(n for n in range(1, 6) if P.holds(three, list(range(n)), {})))
f7 = pf("nx-dm-02-02-q07")
assert P.model(f7["C"], 4) is None and all(P.model(f7[l], 2) is not None for l in "ABD")
assert P.holds("(forall x ~R(x, x)) & (forall x forall y forall z ((R(x, y) & R(y, z)) -> R(x, z)))", N, {"R": LT})
D.assert_mcq(PR["nx-dm-02-02-q07"], "C")
D.assert_msq(PR["nx-dm-02-02-q08"], sorted(l for l, f in pf("nx-dm-02-02-q08").items() if V(f"(exists y forall x R(x, y)) -> ({P.to_str(f)})")))
D.assert_mcq(PR["nx-dm-02-02-q09"], [l for l, f in pf("nx-dm-02-02-q09").items() if not V(f)][0])
five = ["(forall x forall y R(x, y)) -> forall x R(x, x)", "(forall x R(x, x)) -> forall x forall y R(x, y)",
        "(exists x forall y R(x, y)) -> forall y exists x R(x, y)", "(forall x exists y R(x, y)) -> exists y forall x R(x, y)",
        "exists x (P(x) -> forall y P(y))"]
D.assert_nat(PR["nx-dm-02-02-q10"], sum(V(f) for f in five))
assert len([k for k in PR if k.startswith("nx-dm-02-02-")]) == 10

D.must_contain(TXT, "**Both** satisfy", "**I and IV only**", "**No finite model; satisfiable**", "The key recorded for GATE 2013 is D", "**C** (GATE 2020)")
import collections  # noqa: E402
mk = collections.Counter(B[q]["marks"] for q in D.outline_pyqs("dm-02-02-quantifier-laws-validity"))
assert (mk[1], mk[2], mk[5], mk[None]) == (2, 12, 1, 1)
D.must_contain(TXT, "2 one-mark, 12 two-mark", "max(k, 1)")
print("l2_02_validity: laws, pull-outs, prenex, barber, infinite and small models, induction, Horn, 28 examples, 16 PYQ keys and 10 practice answers OK")
