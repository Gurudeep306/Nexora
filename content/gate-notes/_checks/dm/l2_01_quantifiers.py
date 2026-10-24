"""Checks for dm/02-predicate-logic/01-predicates-quantifiers: the finite expansion, the pairing rule, the
order theorem, De Morgan for quantifiers, the forms of 'exactly one', the number predicates, every worked
example, all nineteen PYQ keys (options parsed verbatim where possible and compared with the intended
formula on every interpretation over domains of size 1..3, plus hand-built worlds for the English
meaning) and the ten practice answers.

Validity claims are refuted by the finite search; claims of validity (e.g. the order theorem) are proved
in the lesson and checked here on every interpretation up to size 3 (marked 'up to size k')."""
import itertools
import math
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib as D  # noqa: E402
import predlib as P  # noqa: E402

B = D.bank()
PR = D.practice(2)
TXT = D.lesson_text(2, "01")


def clean(s):
    """Normalise GATE's LaTeX spellings for predlib: \\text{boy} -> boy, ∀(x) -> ∀x, \\{ \\} -> ( ),
    'Q x:' -> 'Q x (' … ')' (a colon extends the scope to the end)."""
    s = s.replace("$", "")
    s = re.sub(r"\\(?:text|mathrm|mathit|operatorname)\{([^{}]*)\}", r"\1", s)
    s = s.replace("\\{", "(").replace("\\}", ")")
    s = re.sub(r"\\ne(?![a-z])", "≠", s)
    s = re.sub(r"(\\forall|\\exists)\s*\((\w+)\)", r"\1 \2 ", s)
    m = re.match(r"^\s*(\\forall|\\exists)\s*(\w+)\s*:(.*)$", s)
    if m:
        s = f"{m.group(1)} {m.group(2)} ({m.group(3)})"
    return re.sub(r"\b([TF])\(", r"\1_(", s)   # predicates named T or F (else read as constants)


def C(x):
    return P.parse(clean(x)) if isinstance(x, str) else x


def holds(f, dom, I, env=None):
    return P.holds(C(f), dom, I, env)


def eq(a, b, k=3):
    return P.equivalent(C(a), C(b), k)


def valid(f, k=3):
    return P.valid(C(f), k)


def parse_opt(t):
    return P.parse(clean(t))


def which_eq(qid, target, k=3, tx=lambda t: t):
    q = B[qid]
    return D.which(q, lambda t: eq(tx(clean(t)), target, k))


def implies(a, b, k=3):
    return valid(("imp", C(a), C(b)), k)


# ── Finite expansion, ∀ ⇒ ∃, precedence (expansion-theorem, nonempty-convention, precedence-quant) ──
for n in range(1, 5):
    dom = list(range(n))
    for I in P.interpretations({"P": 1}, dom):
        vals = [(d,) in I["P"] for d in dom]
        assert holds("forall x P(x)", dom, I) == all(vals) and holds("exists x P(x)", dom, I) == any(vals)
assert holds("forall x P(x)", [1, 2], {"P": {(2,)}}) is False and holds("exists x P(x)", [1, 2], {"P": {(2,)}})
assert valid("forall x P(x) -> exists x P(x)")
assert all([]) is True and any([]) is False          # the empty AND / OR: why empty domains are excluded
assert P.parse("forall x P(x) & Q(x)") == P.parse("(forall x P(x)) & Q(x)")
assert P.parse("~forall x P(x)") == ("not", P.parse("forall x P(x)"))
assert P.free_vars(P.parse("forall x P(x) & Q(x)")) == {"x"}

# ── Worked examples: evaluating quantifiers ──
D4 = [1, 2, 3, 4]
I = {"E": {(x,) for x in D4 if x % 2 == 0}, "S": {(x,) for x in D4 if math.isqrt(x) ** 2 == x}}
assert [x for x in D4 if not holds("E(x) | S(x)", D4, I, {"x": x})] == [3]                       # ex-eval-easy
assert holds("forall x (E(x) | S(x))", D4, I) is False
assert [x for x in D4 if holds("E(x) & S(x)", D4, I, {"x": x})] == [4] and holds("exists x (E(x) & S(x))", D4, I)
for dom, a, b in [(list(range(1, 6)), False, True)]:                                              # ex-eval-medium (finite part)
    lt = {"L": {(x, y) for x in dom for y in dom if x < y}, "Le": {(x, y) for x in dom for y in dom if x <= y}}
    assert holds("forall x exists y L(x, y)", dom, lt) is a and holds("exists x forall y Le(x, y)", dom, lt) is b
assert all(x <= x * x for x in range(-1000, 1001)) and not (0.5 <= 0.25)                         # ex-eval-gate
assert all(x * x + 1 >= 1 for x in [-3.5, -1, 0, 0.5, 2])
D3 = [1, 2, 3]
I = {"G": {(x,) for x in D3 if x > 5}, "Pr": {(2,), (3,)}}
assert holds("forall x (G(x) -> Pr(x))", D3, I) and not holds("exists x (G(x) & Pr(x))", D3, I)    # ex-eval-edge
assert holds("exists x (G(x) -> Pr(x))", D3, I) and holds("G(x) -> Pr(x)", D3, I, {"x": 1})

# ── Scope and free variables (bound-free-def, renaming-theorem, ex-scope-*) ──
fv = lambda s: P.free_vars(P.parse(s))  # noqa: E731
assert fv("forall x (P(x) -> exists y R(x, y, z)) & Q(x)") == {"x", "z"}
assert fv("forall x (P(x) -> Q(x, y))") == {"y"} and fv("exists y forall x R(x, y)") == set() and fv("forall x P(x) -> P(y)") == {"y"}
assert eq("forall x P(x)", "forall y P(y)") and eq("exists x R(x, x)", "exists y R(y, y)")
le = {"R": {(1, 1), (1, 2), (2, 2)}}
assert holds("forall x R(x, y)", [1, 2], le, {"y": 2}) and not holds("forall x R(x, y)", [1, 2], le, {"y": 1})
assert holds("forall y R(y, y)", [1, 2], le)
I = {"P": {(1,), (2,)}, "Q": {(1,)}}                                                              # ex-scope-medium
assert holds("forall x P(x) & Q(x)", [1, 2], I, {"x": 1}) and not holds("forall x P(x) & Q(x)", [1, 2], I, {"x": 2})
assert not holds("forall x (P(x) & Q(x))", [1, 2], I)
q08 = B["cse-2008-cs-30"]                                                                          # ex-scope-gate
o8 = {l: P.parse(t) for l, t in D.opts(q08).items()}
assert P.free_vars(o8["A"]) == {"x", "y"} and P.free_vars(o8["B"]) == {"x"} and P.free_vars(o8["C"]) == set()
assert eq("forall x (P(x) & exists x Q(x))", "forall x P(x) & exists y Q(y)")                     # ex-scope-edge
assert P.parse("forall x (P(x) & exists x Q(x))") != P.parse("forall x (P(x) & exists y Q(y))")

# ── Four forms and the pairing theorem ──
assert eq("forall x (A(x) -> B(x))", "~exists x (A(x) & ~B(x))") and eq("exists x (A(x) & B(x))", "~forall x (A(x) -> ~B(x))")
assert eq("forall x (A(x) -> ~B(x))", "~exists x (A(x) & B(x))") and eq("exists x (A(x) & ~B(x))", "~forall x (A(x) -> B(x))")
assert implies("forall x (A(x) & B(x))", "forall x (A(x) -> B(x))") and not eq("forall x (A(x) & B(x))", "forall x (A(x) -> B(x))")
assert implies("exists x (A(x) & B(x))", "exists x (A(x) -> B(x))") and not eq("exists x (A(x) & B(x))", "exists x (A(x) -> B(x))")
for n in range(1, 4):                                       # pairing-theorem: a non-A forces ∀(A∧B) false, ∃(A→B) true
    dom = list(range(n))
    for I in P.interpretations({"A": 1, "B": 1}, dom):
        if len(I["A"]) < n:
            assert not holds("forall x (A(x) & B(x))", dom, I) and holds("exists x (A(x) -> B(x))", dom, I)
W = {"A": {("cat",)}, "B": set()}                                                                  # proof sanity check
assert not holds("exists x (A(x) & B(x))", ["cat", "dog"], W) and holds("exists x (A(x) -> B(x))", ["cat", "dog"], W)
Dw = ["c1", "c2", "d"]                                                                             # ex-form-medium
W = {"C": {("c1",), ("c2",)}, "B": {("c1",), ("d",)}}
assert [holds(f, Dw, W) for f in ["forall x (C(x) -> B(x))", "forall x (C(x) & B(x))", "exists x (C(x) & B(x))", "exists x (C(x) -> B(x))"]] == [False, False, True, True]
W2 = {"C": {("c2",)}, "B": {("d",)}}
assert not holds("exists x (C(x) & B(x))", ["c2", "d"], W2) and holds("exists x (C(x) -> B(x))", ["c2", "d"], W2)
tgt = "forall x ((S(x) & K(x)) -> ~P(x))"                                                          # ex-form-gate
assert eq(tgt, "~exists x (S(x) & K(x) & P(x))") and eq(tgt, "forall x (S(x) -> (K(x) -> ~P(x)))")
assert not eq(tgt, "forall x (S(x) & K(x) & ~P(x))")
assert holds(tgt, ["n"], {"S": set(), "K": set(), "P": set()}) and not holds("forall x (S(x) & K(x) & ~P(x))", ["n"], {"S": set(), "K": set(), "P": set()})
W = {"U": set(), "W": {("h",)}}                                                                    # ex-form-edge
assert holds("forall x (U(x) -> W(x))", ["h"], W) and not holds("exists x (U(x) & W(x))", ["h"], W)
assert eq("exists x (A(x) & B(x))", "exists x (B(x) & A(x))") and not eq("forall x (A(x) -> B(x))", "forall x (B(x) -> A(x))")

# ── Only, plurals (only-def, plural-derivation, ex-only-*) ──
assert not eq("forall x (V(x) -> M(x))", "forall x (M(x) -> V(x))")
W = {"M": {("m",)}, "V": set()}
assert holds("forall x (V(x) -> M(x))", ["m"], W) and not holds("forall x (M(x) -> V(x))", ["m"], W)  # ex-only-easy
assert eq("forall x (Tg(x) -> B(x)) & forall x (L(x) -> B(x))", "forall x ((Tg(x) | L(x)) -> B(x))")  # plural-derivation
assert not eq("forall x ((Tg(x) | L(x)) -> B(x))", "forall x ((Tg(x) & L(x)) -> B(x))")
W = {"Tg": {("d",)}, "L": set(), "B": set()}
assert not holds("(Tg(x) | L(x)) -> B(x)", ["d"], W, {"x": "d"}) and holds("(Tg(x) & L(x)) -> B(x)", ["d"], W, {"x": "d"})
W = {"A": {("a",)}, "N": set(), "Fr": set()}                                                        # ex-only-medium
assert not holds("forall x ((A(x) | N(x)) -> Fr(x))", ["a"], W) and holds("forall x ((A(x) & N(x)) -> Fr(x))", ["a"], W)
for n in range(1, 4):           # the ∧ version is true in every world where nothing is both
    dom = list(range(n))
    for I in P.interpretations({"A": 1, "N": 1, "Fr": 1}, dom):
        if not (I["A"] & I["N"]):
            assert holds("forall x ((A(x) & N(x)) -> Fr(x))", dom, I)
t7 = "~forall x (E(x) -> Fa(x))"                                                                   # ex-only-gate
assert eq(t7, "exists x (E(x) & ~Fa(x))") and eq(t7, "~forall x (~E(x) | Fa(x))") and not eq(t7, "forall x (E(x) -> ~Fa(x))")
W = {"E": {("e1",), ("e2",)}, "Fa": {("e1",)}}
assert holds(t7, ["e1", "e2"], W) and not holds("forall x (E(x) -> ~Fa(x))", ["e1", "e2"], W)
assert implies("forall x (B(x) <-> De(x))", "forall x (De(x) -> B(x))") and not implies("forall x (De(x) -> B(x))", "forall x (B(x) <-> De(x))")
W = {"B": {("b",)}, "De": set()}                                                                   # ex-only-edge
assert holds("forall x (De(x) -> B(x))", ["b"], W) and not holds("forall x (B(x) <-> De(x))", ["b"], W)

# ── Nested quantifiers and the order theorem ──
assert implies("exists y forall x R(x, y)", "forall x exists y R(x, y)")                          # up to size 3
assert not implies("forall x exists y R(x, y)", "exists y forall x R(x, y)")
assert eq("forall x forall y R(x, y)", "forall y forall x R(x, y)") and eq("exists x exists y R(x, y)", "exists y exists x R(x, y)")
diag = {"R": {(0, 0), (1, 1)}}
assert holds("forall x exists y R(x, y)", [0, 1], diag) and not holds("exists y forall x R(x, y)", [0, 1], diag)
Z = range(-20, 21)
assert all(any(x + y == 0 for y in Z) for x in Z) and not any(all(x + y == 0 for x in Z) for y in Z)
Dc = ["a", "b", "c"]                                                                               # ex-nest-medium
cyc = {"L": {("a", "b"), ("b", "c"), ("c", "a")}}
assert [holds(f, Dc, cyc) for f in ["forall x exists y L(x, y)", "exists y forall x L(x, y)", "exists x forall y L(x, y)", "forall y exists x L(x, y)"]] == [True, False, False, True]
m1 = "forall x (Lk(x) -> exists y (K(y) & O(y, x)))"                                              # ex-nest-gate
m2 = "exists y (K(y) & forall x (Lk(x) -> O(y, x)))"
assert implies(m2, m1) and not implies(m1, m2)
Dk = ["l1", "l2", "k1", "k2"]
Wk = {"Lk": {("l1",), ("l2",)}, "K": {("k1",), ("k2",)}, "O": {("k1", "l1"), ("k2", "l2")}}
assert holds(m1, Dk, Wk) and not holds(m2, Dk, Wk)
Wn = {"Kn": {("a", "b")}}                                                                           # ex-nest-edge
assert holds("exists x forall y (y != x -> Kn(x, y))", ["a", "b"], Wn) and not holds("exists x forall y Kn(x, y)", ["a", "b"], Wn)

# ── Negation (quant-demorgan, restricted-negation, ex-neg-*) ──
assert eq("~forall x P(x)", "exists x ~P(x)") and eq("~exists x P(x)", "forall x ~P(x)")
assert eq("forall x P(x)", "~exists x ~P(x)") and eq("exists x P(x)", "~forall x ~P(x)")
assert eq("~forall x (A(x) -> B(x))", "exists x (A(x) & ~B(x))") and eq("~exists x (A(x) & B(x))", "forall x (A(x) -> ~B(x))")
assert not eq("~forall x (G(x) -> C(x))", "exists x (~G(x) & ~C(x))") and not eq("~forall x (G(x) -> C(x))", "forall x (G(x) -> ~C(x))")
assert P.push_not(P.parse("~forall x (B(x) -> Fl(x))")) == P.parse("exists x (B(x) & ~Fl(x))")    # ex-neg-easy
assert P.push_not(P.parse("~exists x forall y Bt(x, y)")) == P.parse("forall x exists y ~Bt(x, y)")  # ex-neg-medium
Wb = {"Bt": {("a", "b")}}
assert not holds("exists x forall y Bt(x, y)", ["a", "b"], Wb) and holds("forall x exists y ~Bt(x, y)", ["a", "b"], Wb)
cont = "forall e (Pe(e) -> exists d (Pd(d) & forall x (N(x, d) -> C(x, e))))"                       # ex-neg-gate (abstract atoms)
ncont = "exists e (Pe(e) & forall d (Pd(d) -> exists x (N(x, d) & ~C(x, e))))"
assert eq(("not", P.parse(cont)), ncont, 2) and not eq(cont, ncont, 2)   # binary N, C: domains up to size 2
st = "forall s (S(s) -> exists e (Ex(e) & P(s, e)))"                                               # ex-neg-edge
nst = "exists s (S(s) & forall e (Ex(e) -> ~P(s, e)))"
bad = "exists s (~S(s) & forall e (Ex(e) -> ~P(s, e)))"
assert eq(("not", P.parse(st)), nst, 3) and not eq(("not", P.parse(st)), bad, 2)
We = {"S": {("s",)}, "Ex": {("e",)}, "P": {("s", "e")}}
assert holds(st, ["s", "e"], We) and holds(bad, ["s", "e"], We)

# ── Exactly one, at least two, at most one (unique-def, unique-forms-theorem, ex-count-*) ──
u1 = "exists x (P(x) & forall y (P(y) -> y = x))"
u2 = "exists x P(x) & forall x forall y ((P(x) & P(y)) -> x = y)"
u3 = "exists x forall y (P(y) <-> y = x)"
alo2, amo = "exists x exists y (x != y & P(x) & P(y))", "forall x forall y ((P(x) & P(y)) -> x = y)"
for n in range(1, 5):
    dom = list(range(n))
    for I in P.interpretations({"P": 1}, dom):
        k = len(I["P"])
        assert holds(u1, dom, I) == holds(u2, dom, I) == holds(u3, dom, I) == holds("∃!x P(x)", dom, I) == (k == 1)
        assert holds(alo2, dom, I) == (k >= 2) and holds(amo, dom, I) == (k <= 1)
assert eq(amo, ("not", P.parse(alo2)))
D3 = [1, 2, 3]
assert [holds(f, D3, {"P": {(2,)}}) for f in ("exists x P(x)", "∃!x P(x)")] == [True, True]           # ex-count-easy
assert [holds(f, D3, {"P": {(1,), (3,)}}) for f in ("exists x P(x)", "∃!x P(x)")] == [True, False]
subs = [set(c) for r in range(4) for c in itertools.combinations(D3, r)]                            # ex-count-medium
assert len(subs) == 8
assert sum(holds(alo2, D3, {"P": {(x,) for x in s}}) for s in subs) == 4 == sum(holds(amo, D3, {"P": {(x,) for x in s}}) for s in subs)
ad_t = "forall s ∃!a Ad(a, s)"                                                                     # ex-count-gate
ad_a = "forall s exists a (Ad(a, s) & forall b (b != a -> ~Ad(b, s)))"
ad_b = "forall s exists a exists b (Ad(a, s) & ~Ad(b, s))"
ad_c = "forall s forall a (Ad(a, s) -> exists b (Ad(b, s) & b = a))"
assert eq(ad_a, ad_t) and not eq(ad_b, ad_t) and not eq(ad_c, ad_t) and valid(ad_c)
Wb3 = {"Ad": {(0, 0), (1, 0), (0, 1), (1, 1), (0, 2), (1, 2)}}   # everyone has two advisors (0 and 1), 2 is no advisor
assert holds(ad_b, [0, 1, 2], Wb3) and not holds(ad_t, [0, 1, 2], Wb3)
R2 = {"R": {(0, 0), (1, 0), (1, 1)}}                                                                 # ex-count-edge, trap-unique-nested
assert holds("∃!x ∃!y R(x, y)", [0, 1], R2) and holds("∃!y ∃!x R(x, y)", [0, 1], R2) and len(R2["R"]) == 3
assert not eq("∃!x ∃!y R(x, y)", "∃!y ∃!x R(x, y)")                                                  # the two orders differ somewhere
assert P.counter_model(("iff", C("∃!x ∃!y R(x, y)"), C("∃!y ∃!x R(x, y)"))) is not None

# ── Number predicates (number-predicates, prime-derivation, ex-num-*) ──
divides = lambda a, b: b % a == 0 if a != 0 else b == 0  # noqa: E731


def prime_formula(x, dom):
    """x ≠ 1 ∧ ∀y(y | x → y = 1 ∨ y = x), y over dom."""
    return x != 1 and all((not divides(y, x)) or y in (1, x) for y in dom if y != 0 or x == 0)


def isprime(n):
    return n > 1 and all(n % d for d in range(2, math.isqrt(n) + 1))


pos = range(1, 200)
assert [x for x in range(1, 31) if prime_formula(x, pos)] == [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
assert all((lambda y: (not divides(y, 1)) or y == 1)(y) for y in pos)                               # 1 passes the ∀ part
assert not prime_formula(6, pos)
assert all(divides(1, x) for x in range(1, 7)) and not any(all(divides(y, x) for y in range(1, 7)) for x in range(1, 7))  # ex-num-easy
assert math.lcm(*range(1, 7)) == 60


def prime_2011(x, bound):
    """¬(x = 1) ∧ ∀y(∃z(x = y·z) → (y = x ∨ y = 1)), y, z positive integers (z ≤ x suffices)."""
    return x != 1 and all((not any(x == y * z for z in range(1, x + 1))) or y in (x, 1) for y in range(1, bound))


assert [x for x in range(1, 13) if prime_2011(x, 50)] == [2, 3, 5, 7, 11]                           # ex-num-medium
assert all(prime_2011(x, 300) == isprime(x) for x in range(1, 200))


def no_largest_prime(dom, divdom):
    ps = [x for x in dom if all((not divides(z, x)) or z in (x, 1) for z in divdom if z != 0)]
    return all(any(w > x and w in ps for w in dom) for x in ps), ps


assert max(p for p in range(1, 51) if isprime(p)) == 47 and [p for p in range(51, 61) if isprime(p)] == [53, 59]
assert no_largest_prime(range(1, 51), range(1, 51))[0] is False and no_largest_prime(range(1, 61), range(1, 61))[0] is False  # ex-num-gate
Zs = range(-60, 61)                                                                                 # ex-num-edge
assert [x for x in Zs if all((not divides(z, x)) or z in (x, 1) for z in Zs if z != 0 or x == 0) and x != 0] == [-1]
assert not all((not divides(z, 0)) or z in (0, 1) for z in Zs)                                      # 0 fails too

# ── PYQs (keys re-derived) ────────────────────────────────────────────────
# 2004: some boys are taller than all the girls.
t04 = "exists x (boy(x) & forall y (girl(y) -> taller(x, y)))"
D.assert_key("cse-2004-cs-23", which_eq("cse-2004-cs-23", t04))
w = {"boy": {("b",)}, "girl": {("g",)}, "taller": {("b", "g")}}         # English check: one tall boy, one girl
assert holds(t04, ["b", "g"], w) and not holds(clean(D.opts(B["cse-2004-cs-23"])["B"]), ["b", "g"], w)
# IT 2004: ∃x∀y[(a ∧ b) ∧ ¬c] ≡ ¬∀x∃y[(a ∧ b) → c]. (Three binary predicates: equivalence checked on
# domains up to size 2, plus the negation pushed through structurally.)
g = "exists x forall y ((a(x, y) & b(x, y)) & ~c(x, y))"
D.assert_key("it-2004-it-3", which_eq("it-2004-it-3", g, 2))
assert P.push_not(P.parse(clean(D.opts(B["it-2004-it-3"])["C"]))) == P.parse("exists x forall y ((a(x, y) & b(x, y)) & ~c(x, y))")
# 2005: every teacher is liked by some student.
t05 = "forall x (teacher(x) -> exists y (student(y) & likes(y, x)))"
D.assert_key("cse-2005-cs-41", which_eq("cse-2005-cs-41", t05))
assert implies(clean(D.opts(B["cse-2005-cs-41"])["C"]), t05) and not implies(t05, clean(D.opts(B["cse-2005-cs-41"])["C"]))
# 2006: tigers and lions attack if they are hungry or threatened.
t06 = "forall x ((tiger(x) | lion(x)) -> ((hungry(x) | threatened(x)) -> attacks(x)))"
D.assert_key("cse-2006-cs-26", which_eq("cse-2006-cs-26", t06))
# 2007: which does NOT represent 'not every graph is connected'.
t07 = "~forall x (Graph(x) -> Connected(x))"
assert which_eq("cse-2007-cs-22", t07) == ["A", "B", "C"]
D.assert_key("cse-2007-cs-22", [l for l in "ABCD" if l not in which_eq("cse-2007-cs-22", t07)])
# 2008: A is the intended formula with the scope brackets dropped; B, C, D are wrong under any reading.
t08 = "forall x (fsa(x) -> exists y (pda(y) & equivalent(x, y)))"
wide_A = "forall x (fsa(x) -> (exists y (pda(y) & equivalent(x, y))))"   # option A, quantifiers read to the end
assert eq(wide_A, t08)
assert not eq(o8["C"], t08) and not eq(o8["D"], t08)
assert not eq("~forall y (exists x (fsa(x) -> (pda(y) & equivalent(x, y))))", t08)                  # B, even with ∃x widened
assert P.free_vars(o8["B"]) == {"x"}                                                                  # and as printed B is not a sentence
D.assert_key("cse-2008-cs-30", "A")
# IT 2008: negation of ∀x,α → (∃y,β → (∀u,∃v,γ)) (comma = scope to the end); α(x), β(x, y), γ(u, v).
o_it8 = "forall x (al(x) -> exists y (be(x, y) -> forall u exists v ga(u, v)))"
cand = {"A": "exists x (al(x) -> forall y (be(x, y) -> exists u forall v ga(u, v)))",
        "B": "exists x (al(x) -> forall y (be(x, y) -> exists u forall v ~ga(u, v)))",
        "C": "forall x (~al(x) -> exists y (~be(x, y) -> forall u exists v ~ga(u, v)))",
        "D": "exists x (al(x) & forall y (be(x, y) & exists u forall v ~ga(u, v)))"}
assert [l for l in "ABCD" if eq(("not", P.parse(o_it8)), cand[l], 2)] == ["D"]
assert P.push_not(("not", P.parse(o_it8))) == P.parse(cand["D"])
D.assert_key("it-2008-it-22", "D")
# 2009 Q23: gold and silver ornaments are precious.
D.assert_key("cse-2009-cs-23", which_eq("cse-2009-cs-23", "forall x ((G(x) | S(x)) -> P(x))"))
# 2009 Q26: I ≡ IV.
f26 = {"I": "~forall x P(x)", "II": "~exists x P(x)", "III": "~exists x ~P(x)", "IV": "exists x ~P(x)"}
pairs = [(a, b) for a, b in itertools.combinations(f26, 2) if eq(f26[a], f26[b])]
assert pairs == [("I", "IV")]
D.assert_key("cse-2009-cs-26", [l for l, t in D.opts(B["cse-2009-cs-26"]).items() if t.replace(" ", "") == "IandIV"])
# 2010: ∀x∃y∃t ¬F(x, y, t) ≡ ¬∃x∀y∀t F = 'no one can fool everyone all the time' (B). Ternary predicate:
# equivalences on domains up to size 2, plus the structural push.
f10 = "forall x exists y exists t ~F(x, y, t)"
eng = {"A": "forall x exists y exists t F(x, y, t)", "B": "~exists x forall y forall t F(x, y, t)",
       "C": "forall x exists y forall t ~F(x, y, t)", "D": "~exists x exists y exists t F(x, y, t)"}
assert P.push_not(C(eng["B"])) == C(f10)
assert [l for l in "ABCD" if eq(f10, eng[l], 2)] == ["B"]
D.assert_key("cse-2010-cs-30", "B")
# 2011: P(x) is 'x is prime' (A); B fails at 4, C fails at 1, D fails at 2.
assert all(prime_2011(x, 300) == isprime(x) for x in range(1, 200))
assert prime_2011(1, 50) is False and prime_2011(4, 50) is False and prime_2011(2, 50) is True
D.assert_key("cse-2011-cs-30", "A")
# 2012: some real numbers are rational.
D.assert_key("cse-2012-cs-13", which_eq("cse-2012-cs-13", "exists x (real(x) & rational(x))"))
# 2013: none of my friends are perfect.
D.assert_key("cse-2013-cs-27", which_eq("cse-2013-cs-27", "~exists x (F(x) & P(x))"))
# 2014-1: not all that glitters is gold.
D.assert_key("cse-2014-1-cs-1", which_eq("cse-2014-1-cs-1", "~forall x (glitters(x) -> gold(x))"))
assert parse_opt(D.opts(B["cse-2014-1-cs-1"])["A"]) == P.parse("forall x (glitters(x) -> ~gold(x))")
# 2014-3: not all rainy days are cold.
D.assert_key("cse-2014-3-cs-53", which_eq("cse-2014-3-cs-53", "~forall d (Rainy(d) -> Cold(d))"))
# 2019: φ = for every prime x there is a prime w > x. S1 fails at 97. S2 holds (Bertrand: a prime in (x, 2x]).
# S3 (all integers): with divisors over the positive integers (the intended reading, the primes as usual,
# and -1 passes the divisor test with the witness 2 above it) φ holds, so the key is C (S2 and S3).
# With divisors over all integers the divisor clause picks out only x = -1 and no w works, so φ would
# fail on S3; no option matches that strict reading (see the lesson's edge case and the solution's note).
S1 = range(1, 101)
ok1, ps1 = no_largest_prime(S1, S1)
assert ok1 is False and max(ps1) == 97 and 1 in ps1
assert all(any(isprime(w) for w in range(p + 1, 2 * p + 1)) for p in range(2, 3000) if isprime(p))
assert any(isprime(w) for w in range(2, 3))                                                         # x = 1: prime w = 2 > 1
S3 = range(-200, 201)
pos_div = lambda x: [z for z in range(1, abs(x) + 1) if x % z == 0] if x != 0 else list(range(1, 201))  # noqa: E731
ps3 = [x for x in S3 if all(z in (x, 1) for z in pos_div(x))]
assert -1 in ps3 and 0 not in ps3 and all(x == -1 or x == 1 or isprime(x) for x in ps3)
assert all(any(w > x and w in ps3 for w in S3) for x in ps3 if x < 150)                            # a larger 'prime' exists
strict3 = [x for x in S3 if x != 0 and all((not divides(z, x)) or z in (x, 1) for z in S3 if z != 0)]
assert strict3 == [-1] and not any(w > -1 and w in strict3 for w in S3)                              # strict reading: φ fails on S3
D.assert_key("cse-2019-cs-35", "C")
# 2023: which options imply ∀x(P(x) → ∃y Q(x, y)). B and C are proved valid in the lesson (non-empty
# domain for B); checked here on every interpretation up to size 3. A and D have counter-models.
g23 = "forall x (P(x) -> exists y Q(x, y))"
got = [l for l, t in D.opts(B["cse-2023-cs-16"]).items() if implies(clean(t), g23)]
D.assert_key("cse-2023-cs-16", got)
assert P.counter_model(("imp", P.parse(clean(D.opts(B["cse-2023-cs-16"])["A"])), P.parse(g23))) is not None
# 2025: everyone has exactly one mother (noteq read as ≠).
t25 = "forall x ∃!y mother(y, x)"
tx25 = lambda t: re.sub(r"noteq\((\w+),\s*(\w+)\)", r"(\1 != \2)", t)  # noqa: E731
D.assert_key("cse-2025-1-cs-38", which_eq("cse-2025-1-cs-38", t25, 3, tx25))
assert valid(tx25(clean(D.opts(B["cse-2025-1-cs-38"])["C"])))                                       # C is a tautology
# 2026: someone who knows nobody else but is known by everyone else.
t26 = "exists y forall x (x != y -> (M(x, y) & ~M(y, x)))"
D.assert_key("cse-2026-2-cs-1", which_eq("cse-2026-2-cs-1", t26))
wk = {"M": {("a", "c"), ("b", "c"), ("a", "b")}}                     # c is known by a, b and knows nobody
assert holds(t26, ["a", "b", "c"], wk)

# ── Practice ───────────────────────────────────────────────────────────────
q = PR["nx-dm-02-01-q01"]
D.assert_mcq(q, D.which(q, lambda t: eq(clean(t), "forall x ((Pr(x) & G(x)) -> O(x))"))[0])
dom5 = list(range(1, 6))
rel = {"L": {(x, y) for x in dom5 for y in dom5 if x < y}, "Le": {(x, y) for x in dom5 for y in dom5 if x <= y}}
q02 = ["forall x exists y L(x, y)", "exists y forall x Le(x, y)", "forall x exists y (L(y, x) | y = x)",
       "exists x forall y Le(x, y)", "forall y exists x L(x, y)"]
D.assert_nat(PR["nx-dm-02-01-q02"], sum(holds(f, dom5, rel) for f in q02))
q = PR["nx-dm-02-01-q03"]
D.assert_mcq(q, D.which(q, lambda t: eq(clean(t), "~forall x exists y (P(x, y) -> Q(y))"))[0])
q = PR["nx-dm-02-01-q04"]
D.assert_msq(q, D.which(q, lambda t: eq(clean(t), "~exists x (S(x) & F(x))")))
q = PR["nx-dm-02-01-q05"]
D.assert_mcq(q, D.which(q, lambda t: eq(clean(t), "forall x (V(x) -> M(x))"))[0])
cnt = sum(1 for I in P.interpretations({"R": 2}, [0, 1, 2]) if holds("exists y forall x R(x, y)", [0, 1, 2], I))
assert cnt == 2 ** 9 - 7 ** 3 == 169
assert sum(1 for I in P.interpretations({"R": 2}, [0, 1, 2]) if holds("forall x exists y R(x, y)", [0, 1, 2], I)) == 343
D.assert_nat(PR["nx-dm-02-01-q06"], cnt)
q = PR["nx-dm-02-01-q07"]
D.assert_mcq(q, D.which(q, lambda t: valid(clean(t)))[0])
q = PR["nx-dm-02-01-q08"]
D.assert_msq(q, D.which(q, lambda t: eq(clean(t), "∃!x P(x)", 4)))
q = PR["nx-dm-02-01-q09"]
assert fv("forall x (P(x) -> exists y R(x, y, z)) & Q(x)") == {"x", "z"}
D.assert_mcq(q, "B")
assert "x and $z$" in D.opts(q)["B"] or "x$ and $z" in D.opts(q)["B"]
q10 = [x for x in range(1, 11) if all(not (x % y == 0 and y > 1) or y % 2 == 0 for y in range(1, 11))]
assert q10 == [1, 2, 4, 8]
D.assert_nat(PR["nx-dm-02-01-q10"], len(q10))
assert len([k for k in PR if k.startswith("nx-dm-02-01-")]) == 10

D.must_contain(TXT, "(witness 4)", "(i) F, T; (ii) T, T; (iii) T, F", "T, F, T.", "T, F, F, T.", "4 and 4.",
               "$x \\in \\{2, 3, 5, 7, 11\\}$", "F, F, T.", "Only $x = -1$.", "(a), (b), (c) are correct",
               "Only (a).", "$\\mathrm{lcm}(1, \\dots, 6) = 60$")
print("l2_01_quantifiers: expansion, scope, pairing, only/plurals, order, negation, uniqueness, number predicates, "
      "19 PYQ keys and 10 practice answers OK")
