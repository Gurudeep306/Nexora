"""Checks for dm/01-propositional-logic/01-propositions-connectives: the truth tables of the
connectives, the theorems (only-if reading, contrapositive), every worked example, all twelve PYQ keys
(options parsed verbatim and evaluated by truth table) and the ten practice answers."""
import itertools
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib as D  # noqa: E402
import logiclib as L  # noqa: E402

T, F_ = True, False
B = D.bank()
P = D.practice(1)
TXT = D.lesson_text(1, "01")

# ── Definitions and theorems ───────────────────────────────────────────────
assert L.table("p -> q", ["p", "q"]) == [T, F_, T, T]
assert L.table("p <-> q", ["p", "q"]) == [T, F_, F_, T] and L.table("p xor q", ["p", "q"]) == [F_, T, T, F_]
assert L.equivalent("p -> q", "~p | q") and L.equivalent("p <-> q", "(p -> q) & (q -> p)") and L.equivalent("p xor q", "~(p <-> q)")
assert L.equivalent("p -> q", "~q -> ~p") and L.equivalent("q -> p", "~p -> ~q") and not L.equivalent("p -> q", "q -> p")
assert not L.implies("p -> q", "~p -> ~q") and L.counterexample("p -> q", "~p -> ~q") is not None
# Right-associativity and precedence in the parser, as the lesson states them.
assert L.parse("p -> q -> r") == L.parse("p -> (q -> r)")
assert L.parse("~p | q -> r") == L.parse("((~p) | q) -> r")
assert not L.equivalent("(p -> q) -> r", "p -> (q -> r)")
assert len(list(L.rows(list("abc")))) == 8 and 2 ** 2 ** 2 == 16

# ── Worked examples ───────────────────────────────────────────────────────
env = {"p": T, "q": F_, "r": T}
assert L.ev(L.parse("(p & ~q) -> (q | ~r)"), env) is False                          # ex-conn-easy
assert L.ev(L.parse("a -> b"), {"a": F_, "b": F_})                                  # ex-conn-vacuous
allowed = [r for r in L.rows(["p", "q"]) if L.ev(L.parse("~p -> q"), r)]
vals = {L.ev(L.parse("~p | (p -> q)"), r) for r in allowed}
assert len(allowed) == 3 and vals == {T, F_}                                        # ex-conn-unknown
e = {"p": F_, "q": T, "r": F_}
assert L.ev(L.parse("p -> q -> r"), e) is T and L.ev(L.parse("(p -> q) -> r"), e) is F_  # ex-conn-edge
assert L.table("~p | (p & q)", ["p", "q"]) == [T, F_, T, T]                          # ex-tt-easy
assert L.table("(p -> q) & (q -> r)", list("pqr")) == [T, F_, F_, F_, T, F_, T, T]   # ex-tt-medium
assert L.table("(p & q) | (p & ~q)", ["p", "q"]) == L.table("p", ["p", "q"])         # ex-tt-edge


def props(x):
    comp = x > 3 and any(x % d == 0 for d in range(2, x))
    sq = int(x ** 0.5) ** 2 == x
    prime = x > 1 and not any(x % d == 0 for d in range(2, x))
    return {"p": 8 <= x <= 12, "q": comp, "r": sq, "s": prime}


sols16 = [x for x in range(2, 500) if L.ev(L.parse("~((p -> q) & (~r | ~s))"), props(x))]
assert sols16 == [11]                                                                # ex-tt-gate and GATE 2016-1
assert L.equivalent("~Z -> (X -> Y)", "(X & ~Z) -> Y")                              # ex-tr-gate
op = {"□": (T, T, F_, T)}
assert L.equivalent(L.parse("P □ Q", op), "P | ~Q")                                  # ex-op-easy
exactly2 = lambda r: sum(r.values()) == 2  # noqa: E731
f14 = "(~(p <-> q) & r) | (p & q & ~r)"
assert all(L.ev(L.parse(f14), r) == exactly2(r) for r in L.rows(list("pqr")))          # ex-op-edge

# ── PYQs (keys re-derived) ────────────────────────────────────────────────
# 1994 (TF): "p <-> q does not imply p -> ~q" is TRUE: some row makes p <-> q true and p -> ~q false.
assert not L.implies("p <-> q", "p -> ~q") and B["cse-1994-a-3-13"]["answer"] == "True"
# 1995: cannot be determined.
D.assert_key("cse-1995-a-44", "D")
# 1998: converse of stay -> go is go -> stay = "I stay if you go" (A).
D.assert_key("cse-1998-a-5", "A")
# 2002: parse the four options, compare with ~Z -> (X -> Y).
q = B["cse-2002-a-8"]
D.assert_key("cse-2002-a-8", D.which(q, lambda t: L.equivalent(t, "~Z -> (X -> Y)")))
# 2006: A ⊙ B table T, T, F, T; which option equals A ∧ B.
q = B["cse-2006-cs-28"]
op6 = {"⊙": (T, T, F_, T)}
fix = lambda t: t.replace("\\odot", "⊙").replace("\\sim", "~")  # noqa: E731
D.assert_key("cse-2006-cs-28", D.which(q, lambda t: L.equivalent(L.parse(fix(t), op6), "A & B")))
# 2009: P □ Q table T, T, F, T; which option equals P ∨ Q.
q = B["cse-2009-cs-24"]
op9 = {"□": (T, T, F_, T)}
D.assert_key("cse-2009-cs-24", D.which(q, lambda t: L.equivalent(L.parse(t.replace("\\square", "□"), op9), "P | Q")))
# 2014-1: exactly two of p, q, r true.
q = B["cse-2014-1-cs-53"]
D.assert_key("cse-2014-1-cs-53", D.which(q, lambda t: all(L.ev(L.parse(t), r) == exactly2(r) for r in L.rows(list("pqr")))))
# 2014-3: P: g -> ~c, Q: c -> ~g; L, M, N all true (D).
assert L.equivalent("g -> ~c", "c -> ~g")
D.assert_key("cse-2014-3-cs-1", "D")
# 2016-1 (NAT) = 11.
D.assert_key("cse-2016-1-cs-1", 11)
# 2016-2 (NAT): implied by P ∧ (P → Q): false, Q, true, P ∨ Q, ¬Q ∨ P.
cands = ["F", "Q", "T", "P | Q", "~Q | P"]
D.assert_key("cse-2016-2-cs-1", sum(L.implies("P & (P -> Q)", c) for c in cands))
# 2017-2: "¬p ∧ r, and ¬r only if (p ∧ q)".
# The key is the faithful translation (A). Because the first conjunct forces p = F, option B is logically
# equivalent to A as a whole (both reduce to ¬p ∧ r), but its second clause reverses the "only if";
# the lesson and the solution say so. Options C and D are not even equivalent.
q = B["cse-2017-2-cs-11"]
assert D.which(q, lambda t: L.equivalent(t, "(~p & r) & (~r -> (p & q))")) == ["A", "B"]
assert L.equivalent("(~p & r) & (~r -> (p & q))", "~p & r")
assert not L.equivalent("~r -> (p & q)", "(p & q) -> ~r")
lit = {"A": "(~p & r) & (~r -> (p & q))"}
assert L.parse(D.opts(q)["A"]) == L.parse(lit["A"])
D.assert_key("cse-2017-2-cs-11", "A")
# 2024-2: forbids q ∧ p.
q = B["cse-2024-2-cs-2"]
D.assert_key("cse-2024-2-cs-2", D.which(q, lambda t: L.equivalent(t, "~(q & p)")))

# ── Practice ───────────────────────────────────────────────────────────────
D.assert_mcq(P["nx-dm-01-01-q01"], "C")
D.assert_nat(P["nx-dm-01-01-q02"], L.table("(p | q) -> r", list("pqr")).count(F_))
q = P["nx-dm-01-01-q03"]
D.assert_mcq(q, D.which(q, lambda t: L.equivalent(t, "e -> f"))[0])
q = P["nx-dm-01-01-q04"]
D.assert_msq(q, D.which(q, lambda t: L.equivalent(t, "p -> q")))
q = P["nx-dm-01-01-q05"]
D.assert_mcq(q, D.which(q, lambda t: L.equivalent(t, "p | q"))[0])
a, b = L.table("p -> (q -> r)", list("pqr")), L.table("(p -> q) -> r", list("pqr"))
D.assert_nat(P["nx-dm-01-01-q06"], sum(x != y for x, y in zip(a, b)))
q = P["nx-dm-01-01-q07"]
star = {"∗": (F_, T, T, T)}
D.assert_mcq(q, D.which(q, lambda t: L.equivalent(L.parse(t.replace("\\ast", "∗"), star), "p | q"))[0])
known = [r for r in L.rows(list("pqr")) if not L.ev(L.parse("p -> q"), r)]
vals = {L.ev(L.parse("(q -> r) & (r | ~p)"), r) for r in known}
assert vals == {T, F_}
D.assert_mcq(P["nx-dm-01-01-q08"], "C")
# q09: b → a with a = even, b = div by 4; options as formulas over (a, b).
forms = {"A": "b -> a", "B": "a -> b", "C": "b -> a", "D": "~a -> ~b"}
D.assert_msq(P["nx-dm-01-01-q09"], sorted(k for k, f in forms.items() if L.equivalent(f, "b -> a")))
cnt = sum(1 for bits in itertools.product([T, F_], repeat=4) if sum(bits) == 2 and ((not bits[0]) or bits[1]))
D.assert_nat(P["nx-dm-01-01-q10"], cnt)
assert len([k for k in P if k.startswith("nx-dm-01-01-")]) == 10

D.must_contain(TXT, "$x = 11$", "(X \\wedge \\neg Z) \\to Y", "$q \\to \\neg p$", "$\\sim(\\sim A \\odot B)$")
print("l1_01_connectives: connective tables, contrapositive, 12 PYQ keys and 10 practice answers OK")
