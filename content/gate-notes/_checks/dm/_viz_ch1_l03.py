"""Viz scenes for dm/01-propositional-logic/03-inference-resolution. Every truth value, critical row,
resolvent and surviving puzzle world shown is computed with logiclib, so the scenes cannot drift from
the checked maths."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import logiclib as L  # noqa: E402
from dmlib import arrow, box, heads, spec, step, table, text  # noqa: E402

SPECS = {}
TF = lambda b: "T" if b else "F"  # noqa: E731


def scene(fn):
    SPECS[fn.__name__.replace("_", "-")] = fn()
    return fn


@scene
def critical_rows():
    vs = ["p", "q", "r"]
    rs = list(L.rows(vs))
    cols = {"p→q": L.table("p -> q", vs), "q→r": L.table("q -> r", vs), "p→r": L.table("p -> r", vs), "r→p": L.table("r -> p", vs)}
    crit = [i + 1 for i in range(8) if cols["p→q"][i] and cols["q→r"][i]]
    assert crit == [1, 5, 7, 8]
    assert all(cols["p→r"][i - 1] for i in crit) and L.valid_argument(["p -> q", "q -> r"], "p -> r")[0]
    bad = [i for i in crit if not cols["r→p"][i - 1]]
    assert bad == [5, 7] and L.valid_argument(["p -> q", "q -> r"], "r -> p")[1] == [rs[4], rs[6]]
    head = ["p", "q", "r", "p→q", "q→r", "p→r", "r→p"]

    def rows(k):
        out = [head]
        for i, r in enumerate(rs):
            row = [TF(r["p"]), TF(r["q"]), TF(r["r"]), "", "", "", ""]
            for j, name in enumerate(["p→q", "q→r", "p→r", "r→p"][:k]):
                row[3 + j] = TF(cols[name][i])
            out.append(row)
        return out
    els = [*heads("Checking an argument only on its critical rows", "Critical rows of an argument", 640),
           table("tt", 75, 44, 70, 30, rows(0), {"x": 12, "y": 44, "cellW": 48, "cellH": 30}, header=True, mono=True),
           text("note", 320, 340, "premises p → q and q → r", {"x": 180, "y": 340, "size": 13}, anchor="middle", size=15, tone="muted")]
    steps = [
        step("Fill the two premise columns. p → q fails only on rows 3 and 4; q → r fails only on rows 2 and 6.",
             ("tt", {"rows": rows(2), "highlight": [[i, 3] for i in (3, 4)] + [[i, 4] for i in (2, 6)]}),
             ("note", {"text": "premises fail on rows 2, 3, 4, 6", "tone": "danger"})),
        step(f"The critical rows are those where every premise is T: rows {', '.join(map(str, crit))}. Only these rows can produce a counterexample.",
             ("tt", {"highlight": [[i, j] for i in crit for j in (3, 4)]}), ("note", {"text": "critical rows: 1, 5, 7, 8", "tone": "accent"})),
        step("Conclusion p → r: look at the critical rows only. It is T on all four, so no counterexample exists: the argument is valid (hypothetical syllogism).",
             ("tt", {"rows": rows(3), "highlight": [[i, 5] for i in crit]}), ("note", {"text": "p → r is T on every critical row: valid", "tone": "success"})),
        step("Now try the conclusion r → p with the same premises. On critical rows 5 (F T T) and 7 (F F T) it is T → F = F.",
             ("tt", {"rows": rows(4), "highlight": [[i, j] for i in bad for j in range(7)]}), ("note", {"text": "rows 5 and 7: premises T, r → p F", "tone": "danger"})),
        step("Even one critical row with a false conclusion is a counterexample, so p → q, q → r ∴ r → p is invalid (it is the converse of the valid conclusion). The non-critical rows never matter.",
             ("note", {"text": "counterexample p = F, r = T: invalid", "tone": "danger"})),
    ]
    return spec("Critical rows decide validity", (640, 360), (360, 360),
                "An argument is valid when the conclusion is true on every row where all premises are true. We mark those critical rows and test two conclusions.",
                els, steps)


@scene
def fallacy_rows():
    vs = ["p", "q"]
    rs = list(L.rows(vs))
    imp = L.table("p -> q", vs)
    forms = [("MP", "p", "q"), ("MT", "~q", "~p"), ("AC", "q", "p"), ("DA", "~p", "~q")]
    info = []
    for name, extra, concl in forms:
        crit = [i + 1 for i, r in enumerate(rs) if imp[i] and L.ev(L.parse(extra), r)]
        bad = [i for i in crit if not L.ev(L.parse(concl), rs[i - 1])]
        ok, ce = L.valid_argument(["p -> q", extra], concl)
        assert ok == (not bad)
        info.append((name, crit, bad))
    assert [(c, b) for _, c, b in info] == [([1], []), ([4], []), ([1, 3], [3]), ([3, 4], [3])]
    rows = [["p", "q", "p→q"]] + [[TF(r["p"]), TF(r["q"]), TF(v)] for r, v in zip(rs, imp)]
    labels = ["MP: p→q, p ∴ q", "MT: p→q, ¬q ∴ ¬p", "AC: p→q, q ∴ p", "DA: p→q, ¬p ∴ ¬q"]
    verdict = ["MP: p→q, p ∴ q: valid", "MT: p→q, ¬q ∴ ¬p: valid", "AC: p→q, q ∴ p: invalid", "DA: p→q, ¬p ∴ ¬q: invalid"]
    els = [*heads("Two valid forms and two fallacies on one table", "Valid forms and fallacies", 640),
           table("tt", 40, 56, 60, 34, rows, {"x": 90, "y": 44, "cellW": 60, "cellH": 32}, header=True, mono=True)]
    for k, lab in enumerate(labels):
        els.append(box(f"f{k}", 260, 56 + k * 58, 350, 46, lab, {"x": 10, "y": 222 + k * 52, "w": 340, "h": 42, "size": 13}, size=15, mono=True))
    els.append(text("foot", 320, 306, "", {"x": 180, "y": 438, "size": 13}, anchor="middle", size=15, tone="muted"))
    caps = [
        "Modus ponens: the critical row (p → q and p both T) is row 1, TT, where q is T. Valid.",
        "Modus tollens: p → q and ¬q are both T only on row 4, FF, where ¬p is T. Valid.",
        "Affirming the consequent: p → q and q are both T on rows 1 and 3. On row 3 (p = F, q = T) the conclusion p is F. Invalid.",
        "Denying the antecedent: p → q and ¬p are both T on rows 3 and 4. On row 3 the conclusion ¬q is F. Invalid.",
    ]
    steps = []
    for k, ((name, crit, bad), cap) in enumerate(zip(info, caps)):
        hl = [[i, j] for i in crit for j in range(3)]
        tone = "success" if not bad else "danger"
        steps.append(step(cap, ("tt", {"highlight": hl}), (f"f{k}", {"label": verdict[k], "tone": tone, "fill": tone})))
    steps.append(step("Both fallacies are defeated by the same row, p = F and q = T: the promise is kept, q holds, and p does not.",
                      ("tt", {"highlight": [[3, 0], [3, 1], [3, 2]]}), ("foot", {"text": "counterexample for both: p = F, q = T", "tone": "danger"})))
    return spec("Modus ponens, modus tollens and the two fallacies", (640, 320), (360, 452),
                "From p → q you may reason forwards from p or backwards from ¬q. The other two directions are fallacies; the table shows why.",
                els, steps)


@scene
def rule_chain():
    s1, s2, s1c, goal = "c -> ~e", "k -> e", "e -> ~c", "k -> ~c"
    assert L.equivalent(s1, s1c) and L.valid_argument([s1, s2], goal)[0]
    others = {"c -> k": "A", "~c -> ~k": "B", "~k -> ~c": "D"}
    assert all(not L.valid_argument([s1, s2], f)[0] for f in others)
    els = [*heads("Chaining two implications (GATE 2015)", "Chaining S1 and S2", 640),
           text("legend", 320, 54, "c: known corrupt   e: elected   k: kind", {"x": 180, "y": 54, "size": 13}, anchor="middle", size=15, tone="muted"),
           box("s1", 40, 80, 240, 46, "S1: c → ¬e", {"x": 10, "y": 80, "w": 160, "h": 40, "size": 14}, size=16, mono=True),
           box("s2", 360, 80, 240, 46, "S2: k → e", {"x": 190, "y": 80, "w": 160, "h": 40, "size": 14}, size=16, mono=True),
           box("s1c", 40, 190, 240, 46, "e → ¬c", {"x": 10, "y": 190, "w": 160, "h": 40, "size": 14}, size=16, mono=True, hidden=True),
           box("res", 200, 290, 240, 46, "k → ¬c", {"x": 100, "y": 290, "w": 160, "h": 40, "size": 14}, size=16, mono=True, hidden=True),
           arrow("a1", "s1", "s1c", None, label="contrapositive", hidden=True),
           arrow("a2", "s2", "res", None, hidden=True),
           arrow("a3", "s1c", "res", None, hidden=True),
           text("foot", 320, 366, "", {"x": 180, "y": 372, "size": 13}, anchor="middle", size=15, tone="muted")]
    steps = [
        step("Translate both sentences about one candidate: S1 is c → ¬e and S2 is k → e. The middle letters do not match: one says ¬e, the other e.",
             ("s1", {"tone": "accent"}), ("s2", {"tone": "accent"})),
        step("Take the contrapositive of S1: c → ¬e is equivalent to e → ¬c. Now e appears as a hypothesis.",
             ("s1c", {"hidden": False, "tone": "accent", "fill": "accent"}), ("a1", {"hidden": False})),
        step("S2 ends in e and the rewritten S1 starts with e. Hypothetical syllogism chains them: k → e and e → ¬c give k → ¬c.",
             ("res", {"hidden": False, "tone": "success", "fill": "success"}), ("a2", {"hidden": False}), ("a3", {"hidden": False})),
        step("k → ¬c is option C: if a person is kind, he is not known to be corrupt. Options A, B and D each have a row with S1 and S2 true and the option false.",
             ("foot", {"text": "follows: k → ¬c (and its contrapositive c → ¬k)", "tone": "success"})),
    ]
    return spec("Contrapositive, then chain", (640, 384), (360, 390),
                "Two implications that do not line up can often be chained after taking a contrapositive.", els, steps)


def cl(c):
    order = {"p": 0, "q": 1, "r": 2}
    lits = sorted(c, key=lambda l: order[l.lstrip("¬")])
    return " ∨ ".join(lits) if lits else "□"


@scene
def resolution_tree():
    C = [frozenset(x) for x in ({"p", "q"}, {"¬p", "r"}, {"¬q", "r"}, {"¬r"})]
    n5 = L.resolve(C[1], C[3])
    n6 = L.resolve(C[2], C[3])
    assert n5 == [frozenset({"¬p"})] and n6 == [frozenset({"¬q"})]
    n7 = L.resolve(C[0], n5[0])
    assert n7 == [frozenset({"q"})]
    n8 = L.resolve(n7[0], n6[0])
    assert n8 == [frozenset()] and L.refutable(C)
    assert L.valid_argument(["p | q", "p -> r", "q -> r"], "r")[0]
    wx, nx = [30, 180, 330, 480], [8, 96, 184, 272]
    els = [*heads("Resolution refutation: proving r from p ∨ q, p → r, q → r", "Refuting the negated goal ¬r", 640)]
    for k, c in enumerate(C):
        els.append(box(f"c{k}", wx[k], 56, 120, 44, cl(c), {"x": nx[k], "y": 56, "w": 80, "h": 40, "size": 14}, size=16, mono=True,
                       **({"tone": "warning"} if k == 3 else {})))
    els += [box("n5", 240, 150, 100, 44, cl(n5[0]), {"x": 130, "y": 150, "w": 70, "h": 40, "size": 14}, size=16, mono=True, hidden=True),
            box("n6", 420, 150, 100, 44, cl(n6[0]), {"x": 250, "y": 150, "w": 70, "h": 40, "size": 14}, size=16, mono=True, hidden=True),
            box("n7", 120, 240, 100, 44, cl(n7[0]), {"x": 30, "y": 240, "w": 70, "h": 40, "size": 14}, size=16, mono=True, hidden=True),
            box("n8", 290, 320, 100, 44, cl(n8[0]), {"x": 150, "y": 320, "w": 70, "h": 40, "size": 14}, size=18, mono=True, hidden=True)]
    for a, b, i in [("c1", "n5", 1), ("c3", "n5", 2), ("c2", "n6", 3), ("c3", "n6", 4), ("c0", "n7", 5), ("n5", "n7", 6), ("n7", "n8", 7), ("n6", "n8", 8)]:
        els.append(arrow(f"a{i}", a, b, None, hidden=True))
    els.append(text("foot", 320, 386, "clauses of the premises, plus ¬r", {"x": 180, "y": 386, "size": 13}, anchor="middle", size=15, tone="muted"))
    steps = [
        step("Write the premises as clauses (p → r is ¬p ∨ r, q → r is ¬q ∨ r) and add the negation of the goal, ¬r. If this set is unsatisfiable, r follows.",
             ("c3", {"tone": "warning", "fill": "warning"})),
        step("Resolve ¬p ∨ r with ¬r on the pair r, ¬r: the resolvent is ¬p.",
             ("n5", {"hidden": False, "tone": "accent"}), ("a1", {"hidden": False}), ("a2", {"hidden": False})),
        step("Resolve ¬q ∨ r with ¬r in the same way: the resolvent is ¬q.",
             ("n6", {"hidden": False, "tone": "accent"}), ("a3", {"hidden": False}), ("a4", {"hidden": False})),
        step("Resolve p ∨ q with ¬p on the pair p, ¬p: the resolvent is q.",
             ("n7", {"hidden": False, "tone": "accent"}), ("a5", {"hidden": False}), ("a6", {"hidden": False})),
        step("Resolve q with ¬q: nothing is left. The empty clause □ is false in every world, so the clause set is unsatisfiable and r follows.",
             ("n8", {"hidden": False, "tone": "success", "fill": "success"}), ("a7", {"hidden": False}), ("a8", {"hidden": False}),
             ("foot", {"text": "□ derived: {p ∨ q, p → r, q → r} ⊨ r", "tone": "success"})),
    ]
    return spec("A resolution tree", (640, 400), (360, 400),
                "Resolution proves a conclusion by adding its negation and cancelling complementary literals until the empty clause appears.",
                els, steps)


@scene
def knights_grid():
    worlds = [(t, h) for t in (True, False) for h in (True, False)]
    says = [L.ev(L.parse("h <-> t"), {"h": h, "t": t}) for t, h in worlds]
    fits = [s == t for s, (t, h) in zip(says, worlds)]
    assert says == [True, False, False, True] and fits == [True, False, True, False]
    surv = [i + 1 for i, f in enumerate(fits) if f]
    assert all(worlds[i - 1][1] for i in surv) and L.equivalent("t <-> (h <-> t)", "h")
    name = lambda t: "truthful" if t else "liar"  # noqa: E731

    def rows(k):
        out = [["speaker", "coin", "h ↔ t", "fits?"]]
        for i, (t, h) in enumerate(worlds):
            out.append([name(t), "head" if h else "tail", TF(says[i]) if k >= 1 else "", ("yes" if fits[i] else "no") if k >= 2 else ""])
        return out
    els = [*heads("“Head if and only if I am telling the truth” (GATE 2015)", "Head iff I am truthful", 640),
           table("tt", 100, 50, 110, 36, rows(0), {"x": 10, "y": 50, "cellW": 85, "cellH": 34}, header=True),
           text("foot", 320, 262, "t: the speaker is truthful   h: the coin shows head", {"x": 180, "y": 252, "size": 12}, anchor="middle", size=15, tone="muted")]
    steps = [
        step("List the four possible worlds: the speaker's type times the coin. In each, evaluate the statement h ↔ t.",
             ("tt", {"rows": rows(1), "highlight": [[i, 2] for i in range(1, 5)]})),
        step("A truthful speaker's statement must be T and a liar's must be F. Keep a world only if the statement's value matches the type.",
             ("tt", {"rows": rows(2), "highlight": [[i, 3] for i in range(1, 5)]})),
        step(f"Two worlds survive, rows {surv[0]} and {surv[1]}: (truthful, head) and (liar, head). The coin is head in both.",
             ("tt", {"highlight": [[i, j] for i in surv for j in range(4)]}), ("foot", {"text": "surviving worlds: both show head", "tone": "success"})),
        step("So the result is head, whatever the type; the type itself stays unknown. Algebraically t ↔ (h ↔ t) ≡ h.",
             ("foot", {"text": "t ↔ (h ↔ t) ≡ h: the coin is head", "tone": "accent"})),
    ]
    return spec("Truth-tellers, liars and a coin", (640, 280), (360, 270),
                "A speaker's statement is true exactly when the speaker is truthful. Tabulate type against coin and keep the worlds where that rule holds.",
                els, steps)
