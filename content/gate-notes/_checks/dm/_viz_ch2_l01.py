"""Viz scenes for dm/02-predicate-logic/01-predicates-quantifiers. Every truth value shown is computed with
predlib on the scene's own world, so the scenes cannot drift from the checked maths."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import predlib as P  # noqa: E402
from dmlib import box, heads, spec, step, table, text  # noqa: E402

SPECS = {}
TF = lambda b: "T" if b else "F"  # noqa: E731


def scene(fn):
    SPECS[fn.__name__.replace("_", "-")] = fn()
    return fn


@scene
def quant_strip():
    dom = [1, 2, 3, 4, 5]
    I = {"P": {(x,) for x in dom if x * x > 5}}
    vals = [P.holds("P(x)", dom, I, {"x": x}) for x in dom]
    assert vals == [False, False, True, True, True]
    allv, anyv = P.holds("forall x P(x)", dom, I), P.holds("exists x P(x)", dom, I)
    assert (allv, anyv) == (False, True) and P.holds("exists x ~P(x)", dom, I)
    els = [*heads("∀ as a big AND, ∃ as a big OR over the domain {1, …, 5}", "∀ = big AND, ∃ = big OR", 640)]
    for k, x in enumerate(dom):
        els.append(box(f"d{k}", 40 + k * 116, 56, 96, 44, f"x = {x}", {"x": 8 + k * 70, "y": 56, "w": 64, "h": 44, "size": 13}, size=15, mono=True))
        els.append(box(f"v{k}", 40 + k * 116, 112, 96, 44, "P = ?", {"x": 8 + k * 70, "y": 112, "w": 64, "h": 44, "size": 13}, size=15, mono=True))
    els += [box("all", 40, 186, 560, 46, "∀x P(x) = P(1) ∧ P(2) ∧ … ∧ P(5)", {"x": 8, "y": 180, "w": 344, "h": 46, "size": 13}, size=15, mono=True, hidden=True),
            box("any", 40, 246, 560, 46, "∃x P(x) = P(1) ∨ P(2) ∨ … ∨ P(5)", {"x": 8, "y": 240, "w": 344, "h": 46, "size": 13}, size=15, mono=True, hidden=True),
            text("foot", 320, 322, "P(x): x² > 5", {"x": 180, "y": 316, "size": 13}, anchor="middle", size=15, tone="muted")]
    steps = [
        step("Fill the strip: P(x) is 'x² > 5'. It is false for 1 and 2 (1 and 4 are not above 5) and true for 3, 4, 5.",
             *[(f"v{k}", {"label": f"P = {TF(v)}", "tone": "success" if v else "danger"}) for k, v in enumerate(vals)]),
        step("∀x P(x) is the AND of all five cells. One F cell is enough to sink an AND.",
             ("all", {"hidden": False, "tone": "accent"})),
        step("The very first cell, x = 1, is F: a counterexample. So ∀x P(x) is false; the other cells do not matter.",
             ("d0", {"tone": "danger", "fill": "danger"}), ("all", {"label": f"∀x P(x) = {TF(allv)}: counterexample x = 1", "tone": "danger"})),
        step("∃x P(x) is the OR of the same cells. One T cell is enough to make an OR true.",
             ("any", {"hidden": False, "tone": "accent"})),
        step("x = 3 is the first T cell: a witness. So ∃x P(x) is true.",
             ("d2", {"tone": "success", "fill": "success"}), ("any", {"label": f"∃x P(x) = {TF(anyv)}: witness x = 3", "tone": "success"})),
        step("The counterexample of ∀ is a witness of ∃¬: x = 1 makes ¬P true. That is De Morgan for quantifiers, ¬∀x P ≡ ∃x ¬P.",
             ("foot", {"text": "¬∀x P(x) ≡ ∃x ¬P(x): x = 1 is the witness", "tone": "accent"})),
    ]
    return spec("Quantifiers over a domain strip", (640, 336), (360, 330),
                "On a finite domain, ∀ joins the cells with AND and ∃ joins them with OR. One counterexample or one witness decides.",
                els, steps)


@scene
def quant_pairing():
    dom = ["cat 1", "cat 2", "dog"]
    I = {"C": {("cat 1",), ("cat 2",)}, "B": {("dog",)}}          # no black cat; the dog is black
    forms = {"good_all": "forall x (C(x) -> B(x))", "bad_all": "forall x (C(x) & B(x))",
             "good_some": "exists x (C(x) & B(x))", "bad_some": "exists x (C(x) -> B(x))"}
    v = {k: P.holds(f, dom, I) for k, f in forms.items()}
    assert v == {"good_all": False, "bad_all": False, "good_some": False, "bad_some": True}
    imp = [P.holds("C(x) -> B(x)", dom, I, {"x": d}) for d in dom]
    cnj = [P.holds("C(x) & B(x)", dom, I, {"x": d}) for d in dom]
    assert imp == [False, False, True] and cnj == [False, False, False]
    rows = [["x", "C", "B", "C→B", "C∧B"]] + [[d, TF((d,) in I["C"]), TF((d,) in I["B"]), "", ""] for d in dom]
    full = [["x", "C", "B", "C→B", "C∧B"]] + [[d, TF((d,) in I["C"]), TF((d,) in I["B"]), TF(a), TF(b)] for d, a, b in zip(dom, imp, cnj)]
    els = [*heads("“Some cats are black”: why ∃ needs ∧, not →", "Why ∃ goes with ∧", 640),
           table("tt", 30, 48, 64, 32, rows, {"x": 10, "y": 44, "cellW": 64, "cellH": 30}, header=True, mono=True),
           box("r1", 370, 52, 250, 44, "∃x(C ∧ B) = ?", {"x": 10, "y": 176, "w": 340, "h": 40, "size": 13}, size=15, mono=True, hidden=True),
           box("r2", 370, 108, 250, 44, "∃x(C → B) = ?", {"x": 10, "y": 224, "w": 340, "h": 40, "size": 13}, size=15, mono=True, hidden=True),
           box("r3", 370, 164, 250, 44, "∀x(C → B) = ?", {"x": 10, "y": 272, "w": 340, "h": 40, "size": 13}, size=15, mono=True, hidden=True),
           text("foot", 320, 252, "world: two white cats and a black dog", {"x": 180, "y": 336, "size": 12}, anchor="middle", size=15, tone="muted")]
    steps = [
        step("The world has two cats, neither black, and one black dog. 'Some cats are black' is false here.",
             ("tt", {"highlight": [[1, 1], [2, 1], [3, 2]]})),
        step("Fill the two columns. C ∧ B is T only on a black cat: there is none. C → B is F on each white cat and vacuously T on the dog.",
             ("tt", {"rows": full, "highlight": [[3, 3]]})),
        step(f"∃x(C ∧ B) is the OR of the C ∧ B column: {TF(v['good_some'])}. It agrees with the English.",
             ("r1", {"hidden": False, "label": f"∃x(C ∧ B) = {TF(v['good_some'])}  ✓", "tone": "success", "fill": "success"})),
        step(f"∃x(C → B) is the OR of the C → B column: {TF(v['bad_some'])}, witnessed by the dog, which is not even a cat. It claims something false.",
             ("r2", {"hidden": False, "label": f"∃x(C → B) = {TF(v['bad_some'])}  ✗", "tone": "danger", "fill": "danger"}),
             ("tt", {"highlight": [[3, 0], [3, 3]]})),
        step(f"For 'all cats are black' the filter → is right: ∀x(C → B) = {TF(v['good_all'])} (the white cats are counterexamples) and the dog is ignored.",
             ("r3", {"hidden": False, "label": f"∀x(C → B) = {TF(v['good_all'])}  ✓", "tone": "success"}),
             ("foot", {"text": "∀ goes with →,  ∃ goes with ∧", "tone": "accent"})),
    ]
    return spec("The pairing rule", (640, 268), (360, 350),
                "A world with one object outside the subject class (a dog) exposes the wrong pairing of quantifier and connective.",
                els, steps)


@scene
def quant_order_grid():
    dom = ["a", "b", "c"]
    R1 = {("a", "b"), ("b", "c"), ("c", "a")}
    R2 = R1 | {("a", "a"), ("b", "a")}
    fae, efa = "forall x exists y R(x, y)", "exists y forall x R(x, y)"
    v1 = (P.holds(fae, dom, {"R": R1}), P.holds(efa, dom, {"R": R1}))
    v2 = (P.holds(fae, dom, {"R": R2}), P.holds(efa, dom, {"R": R2}))
    assert v1 == (True, False) and v2 == (True, True)
    assert P.valid(f"({efa}) -> ({fae})") and not P.valid(f"({fae}) -> ({efa})")

    def grid(R):
        return [["x \\ y", *dom]] + [[x, *["●" if (x, y) in R else "·" for y in dom]] for x in dom]
    els = [*heads("∀x∃y: a mark in every row.  ∃y∀x: one full column.", "∀x∃y vs ∃y∀x on a grid", 640),
           table("g", 40, 52, 70, 46, grid(R1), {"x": 40, "y": 48, "cellW": 70, "cellH": 40}, header=True, mono=True),
           box("b1", 360, 60, 260, 46, "∀x∃y R(x, y) = ?", {"x": 10, "y": 224, "w": 340, "h": 40, "size": 13}, size=15, mono=True),
           box("b2", 360, 124, 260, 46, "∃y∀x R(x, y) = ?", {"x": 10, "y": 272, "w": 340, "h": 40, "size": 13}, size=15, mono=True),
           text("foot", 320, 268, "rows are x, columns are y; ● marks R(x, y)", {"x": 180, "y": 336, "size": 12}, anchor="middle", size=15, tone="muted")]
    steps = [
        step("The relation is a cycle: a → b, b → c, c → a. Row x has a mark in column y when R(x, y) holds.",
             ("g", {"highlight": [[1, 2], [2, 3], [3, 1]]})),
        step("∀x∃y R(x, y): for each row, can we find a mark? Row a: column b. Row b: column c. Row c: column a. Yes, every row has one.",
             ("b1", {"label": f"∀x∃y R(x, y) = {TF(v1[0])}", "tone": "success", "fill": "success"})),
        step("∃y∀x R(x, y): is some column full? Each column has exactly one mark, so no single y works for every x.",
             ("b2", {"label": f"∃y∀x R(x, y) = {TF(v1[1])}", "tone": "danger", "fill": "danger"}),
             ("g", {"highlight": [[1, 1], [2, 1], [3, 1]]})),
        step("Now add the pairs (a, a) and (b, a). Column a becomes full: a is a y that works for every x.",
             ("g", {"rows": grid(R2), "highlight": [[1, 1], [2, 1], [3, 1]]}),
             ("b2", {"label": f"∃y∀x R(x, y) = {TF(v2[1])}", "tone": "success", "fill": "success"})),
        step("A full column puts a mark in every row, so ∃y∀x always implies ∀x∃y. The cycle shows the converse fails.",
             ("foot", {"text": "∃y∀x ⇒ ∀x∃y, but not conversely", "tone": "accent"})),
    ]
    return spec("The order of quantifiers", (640, 284), (360, 350),
                "Draw a relation as a grid. 'For every x some y' and 'some y for every x' ask different questions of the same grid.",
                els, steps)


@scene
def quant_negation_ladder():
    lines = ["¬∀x ∃y (P(x, y) → Q(y))", "∃x ¬∃y (P(x, y) → Q(y))", "∃x ∀y ¬(P(x, y) → Q(y))", "∃x ∀y (P(x, y) ∧ ¬Q(y))"]
    asc = ["~forall x exists y (P(x, y) -> Q(y))", "exists x ~exists y (P(x, y) -> Q(y))",
           "exists x forall y ~(P(x, y) -> Q(y))", "exists x forall y (P(x, y) & ~Q(y))"]
    for a in asc[1:]:
        assert P.equivalent(asc[0], a)
    assert P.push_not(P.parse(asc[0])) == P.parse(asc[3])
    assert not P.equivalent(asc[0], "exists x forall y (P(x, y) -> ~Q(y))")
    els = [*heads("Pushing ¬ through two quantifiers", "Pushing ¬ inward", 640)]
    for k, s in enumerate(lines):
        els.append(box(f"l{k}", 120, 48 + k * 62, 400, 46, s, {"x": 10, "y": 48 + k * 62, "w": 340, "h": 46, "size": 14},
                       size=16, mono=True, hidden=k > 0))
    els.append(text("foot", 320, 316, "", {"x": 180, "y": 316, "size": 12}, anchor="middle", size=15, tone="muted"))
    steps = [
        step("Start with the negation in front. It must travel inward past each quantifier.", ("l0", {"tone": "accent"})),
        step("Passing ∀x turns it into ∃x: 'not for every x' is 'for some x, not'.", ("l1", {"hidden": False, "tone": "accent"})),
        step("Passing ∃y turns it into ∀y: 'not for some y' is 'for every y, not'.", ("l2", {"hidden": False, "tone": "accent"})),
        step("Negate the matrix with Chapter 1's law ¬(p → q) ≡ p ∧ ¬q.", ("l3", {"hidden": False, "tone": "success", "fill": "success"})),
        step("Every quantifier flipped, the ¬ now sits on an atom. The tempting ∃x∀y(P → ¬Q) is wrong: ¬(p → q) is not p → ¬q.",
             ("foot", {"text": "¬∀ = ∃¬,  ¬∃ = ∀¬,  ¬(p → q) = p ∧ ¬q", "tone": "accent"})),
    ]
    return spec("The negation ladder", (640, 330), (360, 330),
                "A negation in front of a block of quantifiers moves inward one quantifier at a time, flipping each one.",
                els, steps)


@scene
def quant_exactly_one():
    dom = [1, 2, 3]
    worlds = [("P = ∅", set()), ("P = {2}", {2}), ("P = {1, 3}", {1, 3})]
    forms = {"∃": "exists x P(x)", "≤1": "forall x forall y ((P(x) & P(y)) -> x = y)",
             "∃!": "exists x (P(x) & forall y (P(y) -> y = x))"}
    vals = [[P.holds(f, dom, {"P": {(x,) for x in s}}) for f in forms.values()] for _, s in worlds]
    assert vals == [[False, True, False], [True, True, True], [True, False, False]]
    head = ["world", "at least 1", "at most 1", "exactly 1"]
    blank = [head] + [[w, "", "", ""] for w, _ in worlds]

    def upto(c):
        return [head] + [[w, *[TF(v) if j < c else "" for j, v in enumerate(vs)]] for (w, _), vs in zip(worlds, vals)]
    els = [*heads("“Exactly one” = at least one AND at most one", "Exactly one = two promises", 640),
           table("t", 60, 52, 130, 44, blank, {"x": 10, "y": 48, "cellW": 85, "cellH": 40}, header=True, mono=True),
           text("foot", 320, 262, "domain {1, 2, 3}", {"x": 180, "y": 236, "size": 12}, anchor="middle", size=15, tone="muted")]
    steps = [
        step("Three worlds on the domain {1, 2, 3}: nobody has P, exactly one element has P, two elements have P.",
             ("t", {"highlight": [[1, 0], [2, 0], [3, 0]]})),
        step("Existence, ∃x P(x): false in the empty world, true in the other two. On its own it cannot tell one from two.",
             ("t", {"rows": upto(1), "highlight": [[3, 1]]})),
        step("Uniqueness, ∀x∀y((P(x) ∧ P(y)) → x = y): true in the empty world (vacuously) and in the one-element world, false with two.",
             ("t", {"rows": upto(2), "highlight": [[1, 2]]})),
        step("∃x(P(x) ∧ ∀y(P(y) → y = x)) needs both: it is true only in the middle world. That F, T, F pattern is the test for any 'exactly one' option.",
             ("t", {"rows": upto(3), "highlight": [[2, 3]]}), ("foot", {"text": "correct 'exactly one': F, T, F", "tone": "success"})),
    ]
    return spec("Exactly one", (640, 276), (360, 250),
                "Test any formula for 'exactly one' on three worlds: nobody qualifies, one qualifies, two qualify.", els, steps)
