"""Checks for dm/01-propositional-logic/03-inference-resolution: the validity theorems, the ten rules of
inference and the two fallacies, every worked example (critical rows, counterexamples, consistency,
resolution refutations, axiom-system models, truth-teller puzzles), all eight PYQ keys (options parsed
verbatim where they are formulas; descriptive answers re-derived) and the eleven practice answers."""
import itertools
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib as D  # noqa: E402
import logiclib as L  # noqa: E402

T, F_ = True, False
B = D.bank()
P = D.practice(1)
TXT = D.lesson_text(1, "03")
VA = lambda ps, c: L.valid_argument(ps, c)[0]  # noqa: E731


def models(fs, vs):
    return [r for r in L.rows(vs) if all(L.ev(L.parse(f), r) for f in fs)]


def theory_complete(axioms, vs):
    """Consistent propositional theory over vs is negation-complete iff it has exactly one model
    (checked here by brute force over every one of the 2^(2^n) formulas, as truth tables)."""
    ms = models(axioms, vs)
    rs = list(L.rows(vs))
    idx = [rs.index(m) for m in ms]
    for tab in itertools.product([T, F_], repeat=len(rs)):
        vals = {tab[i] for i in idx}
        if len(vals) > 1:              # neither phi nor ~phi holds in every model
            return False
    return True


# ── Validity theorem (three tests agree) on a batch of arguments ───────────
batch = [(["p -> q", "~q"], "~p"), (["p -> q", "q"], "p"), (["p | q", "~p | r"], "q | r"), (["p", "~p"], "q"),
         (["p -> (q | r)", "~q", "p"], "r")]
for ps, c in batch:
    conj = "(" + ") & (".join(ps) + ")"
    assert VA(ps, c) == L.is_taut(f"({conj}) -> ({c})") == (not L.is_sat(f"({conj}) & ~({c})"))
assert not L.consistent(["p", "~p"]) and VA(["p", "~p"], "q")                       # explosion / ex-arg-edge
# Refutation theorem on the same batch.
for ps, c in batch:
    assert VA(ps, c) == (not L.consistent(ps + [f"~({c})"]))
assert not L.consistent(["p", "~(p | q)"])                                          # sanity check in the proof

# ── Rules of inference (the table) and fallacies ──────────────────────────
RULES = {
    "MP": (["p", "p -> q"], "q"), "MT": (["~q", "p -> q"], "~p"), "HS": (["p -> q", "q -> r"], "p -> r"),
    "DS": (["p | q", "~p"], "q"), "addition": (["p"], "p | q"), "simplification": (["p & q"], "p"),
    "conjunction": (["p", "q"], "p & q"), "resolution": (["p | q", "~p | r"], "q | r"),
    "constructive dilemma": (["(p -> q) & (r -> s)", "p | r"], "q | s"),
    "destructive dilemma": (["(p -> q) & (r -> s)", "~q | ~s"], "~p | ~r"),
}
for name, (ps, c) in RULES.items():
    assert VA(ps, c), name
    assert L.is_taut("((" + ") & (".join(ps) + f")) -> ({c})"), name
# Substitution: MP with formulas in place of letters stays valid.
assert VA(["(a | b) & ~c", "((a | b) & ~c) -> (d <-> e)"], "d <-> e")
# Resolution contains MP and DS (sanity check of the derivation).
assert L.equivalent("~p | r", "p -> r")
ok, ce_ac = L.valid_argument(["p -> q", "q"], "p")
ok2, ce_da = L.valid_argument(["p -> q", "~p"], "~q")
assert not ok and not ok2 and ce_ac == ce_da == [{"p": F_, "q": T}]                  # fallacy-theorem
assert VA(["p <-> q", "q"], "p") and VA(["p <-> q", "~p"], "~q")                     # ex-fal-edge

# ── Worked examples ────────────────────────────────────────────────────────
crit = [r for r in L.rows(["p", "q"]) if L.ev(L.parse("p -> q"), r) and not r["q"]]
assert crit == [{"p": F_, "q": F_}]                                                  # ex-arg-easy
assert VA(["p -> (q | r)", "~q", "p"], "r")                                          # ex-arg-medium
IT04 = [(["~p | q", "r -> s", "p | r"], "~s -> q"), (["~p & q", "q -> (p -> r)"], "~r"),
        (["(q & r) -> p", "~q & p"], "r"), (["p", "p -> r", "q | ~r"], "q")]
res04 = [L.valid_argument(ps, c) for ps, c in IT04]
assert [v for v, _ in res04] == [T, F_, F_, T]                                        # ex-arg-gate
assert res04[1][1] == [{"p": F_, "q": T, "r": T}] and res04[2][1] == [{"p": T, "q": F_, "r": F_}]
assert not L.consistent(["p -> q", "q -> r", "p", "~r"])                             # ex-cons-easy
F93 = "A & (A -> (B | C)) & (B -> ~A)"
assert models([F93], list("ABC")) == [{"A": T, "B": F_, "C": T}] and L.implies(F93, "C")  # ex-cons-medium, GATE 1993
assert not L.consistent(["p <-> q", "q -> ~p", "p | q"])                             # ex-cons-gate S1
assert models(["p -> q", "~q | r", "~r -> ~p", "p"], list("pqr")) == [{"p": T, "q": T, "r": T}]  # S2
trio = ["p | q", "~p | q", "~q"]
assert all(L.consistent(list(pair)) for pair in itertools.combinations(trio, 2)) and not L.consistent(trio)  # ex-cons-edge, trap-pairwise
assert VA(["p -> q", "q -> r", "p | s", "~s"], "r")                                  # ex-rule-medium
S1, S2 = "c -> ~e", "k -> e"
assert L.equivalent(S1, "e -> ~c") and VA([S1, S2], "k -> ~c")                       # ex-rule-gate
for f, row in [("c -> k", {"c": T, "e": F_, "k": F_}), ("~c -> ~k", {"c": F_, "e": T, "k": T}), ("~k -> ~c", {"c": T, "e": F_, "k": F_})]:
    assert all(L.ev(L.parse(x), row) for x in (S1, S2)) and not L.ev(L.parse(f), row)
DD = ["(p -> q) & (r -> s)", "~q | ~s"]
assert VA(DD, "~p | ~r") and not VA(DD, "~p & ~r")                                   # ex-rule-edge
assert all(L.ev(L.parse(x), {"p": T, "q": T, "r": F_, "s": F_}) for x in DD)
assert not L.ev(L.parse("~p & ~r"), {"p": T, "q": T, "r": F_, "s": F_})
assert VA(["p -> q", "q -> r", "~r"], "~p")                                          # ex-chain-easy
assert VA(["u -> b", "(b & t) -> d", "t", "~d"], "~u") and len(list(L.rows(list("ubtd")))) == 16  # ex-chain-medium
assert VA(["~p | q", "r -> s", "p | r", "~s"], "q")                                  # ex-chain-gate (deduction theorem form)
assert VA(["p -> q", "p -> ~q"], "~p") and L.consistent(["p -> q", "p -> ~q"])         # ex-chain-edge
# Deduction theorem on random-ish instances.
for ps, a, b in [(["p | q"], "~p", "q"), (["p -> q", "q -> r"], "p", "r"), (["r -> s"], "~s", "~r")]:
    assert VA(ps + [a], b) == VA(ps, f"({a}) -> ({b})")

# Resolution
fs = frozenset
assert L.resolve(fs({"p"}), fs({"¬p", "q"})) == [fs({"q"})] and L.resolve(fs({"¬q"}), fs({"¬p", "q"})) == [fs({"¬p"})]  # ex-res-easy
assert L.resolve(fs({"¬p", "q"}), fs({"¬q", "r"})) == [fs({"¬p", "r"})]
assert L.refutable([{"p", "q"}, {"¬p", "r"}, {"¬q", "r"}, {"¬r"}])                    # ex-res-medium
R92 = [{"¬Q", "P", "¬R"}, {"R", "¬Q"}, {"Q"}, {"¬P"}]                               # ground instances x = y = a
assert L.refutable(R92) and not L.consistent(["Q -> (P | ~R)", "R | ~Q", "Q", "~P"])  # ex-res-gate, GATE 1992
assert L.resolve(fs({"Q"}), fs({"R", "¬Q"})) == [fs({"R"})]
assert L.resolve(fs({"Q"}), fs({"¬Q", "P", "¬R"})) == [fs({"P", "¬R"})]
assert L.resolve(fs({"P", "¬R"}), fs({"R"})) == [fs({"P"})] and L.resolve(fs({"P"}), fs({"¬P"})) == [fs()]
two = L.resolve(fs({"p", "q"}), fs({"¬p", "¬q"}))
assert sorted(map(sorted, two)) == [["p", "¬p"], ["q", "¬q"]]                        # ex-res-edge, trap-double-resolve
assert not L.refutable([{"p", "q"}, {"¬p", "¬q"}]) and L.consistent(["p | q", "~p | ~q"])
assert L.ev(L.parse("(p | q) & (~p | ~q)"), {"p": T, "q": F_})
# Soundness of a resolvent, and failure of the converse (proof-resolution-sound).
assert L.implies("(l | a) & (~l | b)", "a | b") and not L.implies("a | b", "(l | a) & (~l | b)")
assert L.ev(L.parse("a | b"), {"l": T, "a": T, "b": F_}) and not L.ev(L.parse("~l | b"), {"l": T, "a": T, "b": F_})

# Axiom systems
assert theory_complete(["p", "p -> q"], ["p", "q"]) and L.consistent(["p", "p -> q"])  # ex-ax-easy
assert L.consistent(["p | q"]) and not theory_complete(["p | q"], ["p", "q"])          # ex-ax-medium
assert len(models(["p | q"], ["p", "q"])) == 3
A91 = ["p", "q"]
assert L.consistent(A91) and theory_complete(A91, ["p", "q"])                          # ex-ax-gate, GATE 1991
for k in range(len(A91) + 1):
    for sub in itertools.combinations(A91, k):
        assert L.consistent(list(sub) or ["T"])                                         # every subsystem consistent
assert not theory_complete(["p"], ["p", "q"])                                           # but {p} is not complete
assert not L.consistent(["p", "~p"]) and VA(["p", "~p"], "q") and VA(["p", "~p"], "~q")  # ex-ax-edge

# Truth-tellers and liars
assert not L.is_sat("x <-> ~x")                                                        # ex-kn-easy
assert models(["a <-> b", "b <-> (a xor b)"], ["a", "b"]) == [{"a": F_, "b": F_}]      # ex-kn-medium
assert L.equivalent("x <-> (S <-> x)", "S")                                            # knights-theorem
assert models(["x <-> (x -> g)"], ["x", "g"]) == [{"x": T, "g": T}]                    # ex-kn-edge

# ── PYQs (keys re-derived) ────────────────────────────────────────────────
# 1991 (DESC): every subsystem consistent, not necessarily complete (verified above on A = {p, q}).
assert "consistent but not necessarily complete" in B["cse-1991-a-4-iv"]["answer"]
# 1992 (DESC): inconsistent; R(a) from (2),(3); P(a) from (1); clash with ~P(a) (verified above).
assert "R(a)" in B["cse-1992-b-15-a"]["answer"] and "P(a)" in B["cse-1992-b-15-a"]["answer"]
# 1993 (DESC): F true only at A=1, B=0, C=1 (verified above).
assert "A=1, B=0, C=1" in B["cse-1993-ii-b-18"]["answer"]
# 2003: P, Q, R arbitrary formulas. Model them as all truth tables over two letters x, y and brute force.
cols = list(itertools.product([T, F_], repeat=4))


def all_rows(pred):
    return all(pred(i) for i in range(4))


claims = {"A": T, "B": T, "C": T, "D": T}
for Pt, Qt, Rt in itertools.product(cols, repeat=3):
    par = [(Pt[i] or Rt[i]) and (Qt[i] or not Rt[i]) for i in range(4)]
    res = [Pt[i] or Qt[i] for i in range(4)]
    if not all_rows(lambda i: (not par[i]) or res[i]):
        claims["A"] = F_
    if not all_rows(lambda i: (not res[i]) or (Pt[i] or Rt[i] or Qt[i] or not Rt[i])):
        claims["B"] = F_
    if any(res) != any(par):
        claims["C"] = F_
    if (not any(res)) != ((not any(Pt)) and (not any(Qt))):
        claims["D"] = F_
assert claims == {"A": T, "B": T, "C": F_, "D": T}
x_ = (T, T, F_, F_)                                      # the column of x over (x, y)
nx_ = tuple(not v for v in x_)
assert any(a or b for a, b in zip(x_, nx_)) and not any((a or c) and (b or not c) for a, b, c in zip(x_, nx_, x_))  # P = x, Q = ¬x, R = x
D.assert_key("cse-2003-cs-72", [k for k, v in claims.items() if not v])
# IT 2004: valid arguments 1 and 4 -> option C (parse the options' numbers).
q = B["it-2004-it-31"]
valid_set = {i + 1 for i, (v, _) in enumerate(res04) if v}
num = lambda t: {int(n) for n in t.replace("and", ",").replace(" ", "").split(",") if n}  # noqa: E731
D.assert_key("it-2004-it-31", D.which(q, lambda t: num(t) == valid_set))
# 2012: I1 = modus tollens (valid), I2 = denying the antecedent (invalid) -> B.
i1, i2 = VA(["r -> ~m", "m"], "~r"), VA(["r -> ~m", "~r"], "m")
assert i1 and not i2
D.assert_key("cse-2012-cs-1", "B")
# 2015-2: options as formulas over c (corrupt), e (elected), k (kind).
opt15 = {"A": "c -> k", "B": "~c -> ~k", "C": "k -> ~c", "D": "~k -> ~c"}
D.assert_key("cse-2015-2-cs-3", [l for l, f in opt15.items() if VA([S1, S2], f)])
# 2015-3: surviving worlds of t <-> (h <-> t); test each option in all of them.
W = models(["t <-> (h <-> t)"], ["t", "h"])
assert W == [{"t": T, "h": T}, {"t": F_, "h": T}]
opt15b = {"A": "h", "B": "~h", "C": "~t -> ~h", "D": "t -> ~h"}
D.assert_key("cse-2015-3-cs-24", [l for l, f in opt15b.items() if all(L.ev(L.parse(f), w) for w in W)])

# ── Practice ───────────────────────────────────────────────────────────────
D.assert_mcq(P["nx-dm-01-03-q01"], "B")
assert RULES["MT"] == (["~q", "p -> q"], "~p")
D.assert_nat(P["nx-dm-01-03-q02"], len(models(["p | q", "~p | r"], list("pqr"))))
q03 = {"A": (["p -> q", "~p"], "~q"), "B": (["p -> q", "q -> r"], "p -> r"), "C": (["p | q", "p"], "~q"), "D": (["p | q", "~q"], "p")}
D.assert_msq(P["nx-dm-01-03-q03"], [l for l, (ps, c) in q03.items() if VA(ps, c)])
q04 = {"A": "~s", "B": "s", "C": "~s -> c"}
good = [l for l, f in q04.items() if VA(["s -> c", "~c"], f)]
assert good == ["A"]
D.assert_mcq(P["nx-dm-01-03-q04"], "A")
D.assert_nat(P["nx-dm-01-03-q05"], len(models(["p -> q", "q -> r", "r -> p"], list("pqr"))))
C6 = [{"p", "q"}, {"¬p", "q"}, {"p", "¬q"}, {"¬p", "¬q"}]
assert L.refutable(C6) and not L.consistent(["p | q", "~p | q", "p | ~q", "~p | ~q"])
s1 = L.resolve(fs({"p", "q"}), fs({"¬p", "q"}))[0]
s2 = L.resolve(fs({"p", "¬q"}), fs({"¬p", "¬q"}))[0]
assert s1 == fs({"q"}) and s2 == fs({"¬q"}) and L.resolve(s1, s2) == [fs()]           # three steps
D.assert_mcq(P["nx-dm-01-03-q06"], "D")
W7 = models(["a <-> (~a & ~b)"], ["a", "b"])
assert W7 == [{"a": F_, "b": T}]
D.assert_mcq(P["nx-dm-01-03-q07"], "C")
S8 = ["p -> q", "q -> r", "r -> ~p"]
q08 = {"A": L.consistent(S8), "B": VA(S8, "~p"), "C": VA(S8, "~r"), "D": not L.consistent(S8 + ["p"])}
D.assert_msq(P["nx-dm-01-03-q08"], [l for l, v in q08.items() if v])
assert L.consistent(["p <-> q"]) and not theory_complete(["p <-> q"], ["p", "q"]) and not VA(["p <-> q"], "p")
D.assert_mcq(P["nx-dm-01-03-q09"], "A")
D.assert_nat(P["nx-dm-01-03-q10"], sum(VA(["p | q", "~p"], c) for c in ["q", "p", "q | r", "p -> r", "~q"]))
assert not VA(["c -> g", "g"], "c") and L.valid_argument(["c -> g", "g"], "c")[1] == [{"c": F_, "g": T}]
D.assert_mcq(P["nx-dm-01-03-q11"], "B")
assert len([k for k in P if k.startswith("nx-dm-01-03-")]) == 11

D.must_contain(TXT, "Arguments **1 and 4** are valid", "**(C)** \"If a person is kind", "**I1 is correct but I2 is not.**",
               "**The result is head**", "**Every subsystem is consistent, but not necessarily complete.**",
               "$(A, B, C) = (1, 0, 1)$", ":::lab{#lab-argument")
print("l1_03_inference: validity tests, 10 rules + 2 fallacies, worked examples, 8 PYQ keys and 11 practice answers OK")
