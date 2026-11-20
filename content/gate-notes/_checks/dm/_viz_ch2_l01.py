"""Viz scenes for dm/02-predicate-logic/01-predicates-quantifiers. Every truth value shown is computed
with predlib on the scene's own world, so the scenes cannot drift from the checked logic."""
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


def one(I, pred, k):
    """Value of a unary predicate at element k of interpretation I."""
    return (k,) in I[pred]


def strip(names, wide_x0=40, wide_w=120, gap=24, y=70, ny=62, nw=74, ngap=10, nx0=14):
    """Positions of a row of domain boxes (wide, narrow)."""
    out = []
    for k, _ in enumerate(names):
        out.append(((wide_x0 + k * (wide_w + gap), y, wide_w), (nx0 + k * (nw + ngap), ny, nw)))
    return out


@scene
def forall_big_and():
    names = ["a", "b", "c", "d"]
    dom = [0, 1, 2, 3]
    I = {"P": {(0,), (1,), (3,)}}
    vals = [one(I, "P", k) for k in dom]
    assert vals == [True, True, False, True]
    assert P.holds("forall x P(x)", dom, I) is False
    pos = strip(names)
    els = [*heads("∀x P(x) on the domain {a, b, c, d}: one big AND", "∀x P(x): a big AND", 640)]
    for k, (nm, ((x, y, w), (nx, ny, nw))) in enumerate(zip(names, pos)):
        els.append(box(f"e{k}", x, y, w, 52, nm, {"x": nx, "y": ny, "w": nw, "h": 44}, size=17, mono=True))
        els.append(box(f"v{k}", x, y + 70, w, 44, "P(" + nm + ") = ?", {"x": nx, "y": ny + 60, "w": nw, "h": 40, "size": 12}, size=15, mono=True))
    els.append(text("conj", 320, 236, "P(a) ∧ P(b) ∧ P(c) ∧ P(d)", {"x": 180, "y": 214, "size": 13}, anchor="middle", size=17, mono=True))
    els.append(text("verdict", 320, 276, "", {"x": 180, "y": 252, "size": 13}, anchor="middle", size=16))
    steps = [
        step("A universal claim has one term per element. On a four-element domain, ∀x P(x) is the conjunction P(a) ∧ P(b) ∧ P(c) ∧ P(d).",
             *[(f"e{k}", {"tone": "accent"}) for k in dom]),
        step("Check a: P(a) is true. The claim survives this element.", ("e0", {"tone": "success"}), ("v0", {"label": "P(a) = T", "tone": "success", "fill": "success"})),
        step("Check b: P(b) is true. Still no counterexample.", ("e1", {"tone": "success"}), ("v1", {"label": "P(b) = T", "tone": "success", "fill": "success"})),
        step("Check c: P(c) is false. One false term makes the whole AND false: c is a counterexample.",
             ("e2", {"tone": "danger"}), ("v2", {"label": "P(c) = F", "tone": "danger", "fill": "danger"})),
        step("d is true as well, but it no longer matters: a universal needs every element, and c already failed.",
             ("e3", {"tone": "muted"}), ("v3", {"label": "P(d) = T", "tone": "muted"})),
        step("So ∀x P(x) = T ∧ T ∧ F ∧ T = F. To refute a ∀, one counterexample is enough.",
             ("conj", {"text": "T ∧ T ∧ F ∧ T = F", "tone": "danger"}), ("verdict", {"text": "∀x P(x) is false (counterexample c)", "tone": "danger"})),
    ]
    return spec("∀ is a big AND", (640, 296), (360, 270),
                "The domain has four elements. P is true at a, b and d, and false at c. Watch the universal check every element.",
                els, steps)


@scene
def exists_big_or():
    names = ["a", "b", "c", "d"]
    dom = [0, 1, 2, 3]
    I = {"Q": {(2,)}}
    vals = [one(I, "Q", k) for k in dom]
    assert vals == [False, False, True, False]
    assert P.holds("exists x Q(x)", dom, I) is True
    pos = strip(names)
    els = [*heads("∃x Q(x) on the same domain: one big OR", "∃x Q(x): a big OR", 640)]
    for k, (nm, ((x, y, w), (nx, ny, nw))) in enumerate(zip(names, pos)):
        els.append(box(f"e{k}", x, y, w, 52, nm, {"x": nx, "y": ny, "w": nw, "h": 44}, size=17, mono=True))
        els.append(box(f"v{k}", x, y + 70, w, 44, "Q(" + nm + ") = ?", {"x": nx, "y": ny + 60, "w": nw, "h": 40, "size": 12}, size=15, mono=True))
    els.append(text("disj", 320, 236, "Q(a) ∨ Q(b) ∨ Q(c) ∨ Q(d)", {"x": 180, "y": 214, "size": 13}, anchor="middle", size=17, mono=True))
    els.append(text("verdict", 320, 276, "", {"x": 180, "y": 252, "size": 13}, anchor="middle", size=16))
    steps = [
        step("An existential claim is the OR of one term per element: ∃x Q(x) = Q(a) ∨ Q(b) ∨ Q(c) ∨ Q(d).",
             *[(f"e{k}", {"tone": "accent"}) for k in dom]),
        step("Check a: Q(a) is false. A false term does not hurt an OR; keep looking.", ("e0", {"tone": "muted"}), ("v0", {"label": "Q(a) = F", "tone": "muted"})),
        step("Check b: Q(b) is false too. Still no witness.", ("e1", {"tone": "muted"}), ("v1", {"label": "Q(b) = F", "tone": "muted"})),
        step("Check c: Q(c) is true. c is a witness, and one true term makes the whole OR true.",
             ("e2", {"tone": "success"}), ("v2", {"label": "Q(c) = T", "tone": "success", "fill": "success"})),
        step("We can stop here: d is never needed. ∃x Q(x) = F ∨ F ∨ T ∨ … = T. To prove an ∃, show one witness.",
             ("disj", {"text": "F ∨ F ∨ T ∨ … = T", "tone": "success"}), ("verdict", {"text": "∃x Q(x) is true (witness c)", "tone": "success"})),
        step("The two quantifiers are mirror images: ∀ needs no counterexample, ∃ needs one witness.",
             ("verdict", {"text": "∀: no counterexample. ∃: one witness.", "tone": "accent"})),
    ]
    return spec("∃ is a big OR", (640, 296), (360, 270),
                "Same four elements. Q is true only at c. Watch the existential look for a witness.",
                els, steps)


@scene
def scope_bracket():
    toks = ["∀x", "(", "P(x)", "→", "∃y", "R(x, y)", ")", "∧", "Q(x)"]
    f = P.parse("forall x (P(x) -> exists y R(x, y)) & Q(x)")
    assert P.free_vars(f) == {"x"}
    assert P.free_vars(P.parse("forall x ((P(x) -> exists y R(x, y)) & Q(x))")) == set()
    widths = [52, 26, 60, 34, 52, 82, 26, 34, 60]
    x, wide = 26, []
    for w in widths:
        wide.append((x, w))
        x += w + 10
    assert x <= 640
    nrow = [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0), (0, 1), (1, 1), (2, 1), (3, 1)]
    nws = [60, 30, 66, 40, 60]
    els = [*heads("Who owns which variable? ∀x (P(x) → ∃y R(x, y)) ∧ Q(x)", "Scope of each quantifier", 640)]
    for k, (t, (wx, ww)) in enumerate(zip(toks, wide)):
        c, r = nrow[k]
        nx = 10 + sum(nws[:c]) + 8 * c if r == 0 else 10 + [0, 92, 132, 174][c]
        nw = nws[c] if r == 0 else [84, 30, 34, 66][c]
        els.append(box(f"t{k}", wx, 80, ww, 46, t, {"x": nx, "y": 66 + r * 62, "w": nw, "h": 44, "size": 13}, size=15, mono=True))
    els.append(text("note", 320, 190, "", {"x": 180, "y": 214, "size": 13}, anchor="middle", size=15))
    els.append(text("note2", 320, 222, "", {"x": 180, "y": 244, "size": 13}, anchor="middle", size=15))
    scope_x = [0, 1, 2, 3, 4, 5, 6]
    steps = [
        step("A quantifier binds as tightly as ¬: ∀x applies to the next unit, which here is the whole bracket ( … ).",
             *[(f"t{k}", {"tone": "accent"}) for k in scope_x], ("note", {"text": "scope of ∀x: the bracket after it", "tone": "accent"})),
        step("Inside that bracket, ∃y owns the y in R(x, y). Its scope is just R(x, y).",
             ("t4", {"tone": "info", "fill": "info"}), ("t5", {"tone": "info", "fill": "info"}), ("note", {"text": "scope of ∃y: R(x, y)", "tone": "info"})),
        step("The x in P(x) and in R(x, y) are inside the scope of ∀x: they are bound.",
             ("t2", {"tone": "success", "fill": "success"}), ("t5", {"tone": "success", "fill": "success"}), ("note2", {"text": "bound: x in P(x), x and y in R(x, y)", "tone": "success"})),
        step("The bracket closes before ∧. The x in Q(x) is outside every quantifier on x: it is free.",
             ("t8", {"tone": "danger", "fill": "danger"}), ("note", {"text": "the x in Q(x) is free", "tone": "danger"})),
        step("A formula with a free variable is not a sentence: its value depends on what x is. To cover Q(x) too, bracket the whole conjunction after ∀x.",
             ("note2", {"text": "fix: ∀x ((P(x) → ∃y R(x, y)) ∧ Q(x))", "tone": "accent"})),
    ]
    return spec("Scope, bound and free", (640, 250), (360, 270),
                "Each quantifier owns its variable inside its scope. An occurrence outside every scope is free.",
                els, steps)


def world_table(names, cols, rowvals):
    return [["", *cols]] + [[nm, *r] for nm, r in zip(names, rowvals)]


@scene
def all_are_wrong():
    names = ["dog 1", "dog 2", "cat"]
    dom = [0, 1, 2]
    I = {"A": {(0,), (1,)}, "B": {(0,), (1,)}}
    imp = [P.holds("A(x) -> B(x)", dom, I, {"x": k}) for k in dom]
    con = [P.holds("A(x) & B(x)", dom, I, {"x": k}) for k in dom]
    assert imp == [True, True, True] and con == [True, True, False]
    assert P.holds("forall x (A(x) -> B(x))", dom, I) and not P.holds("forall x (A(x) & B(x))", dom, I)
    cols = ["dog?", "barks?", "A→B", "A∧B"]
    base = [[TF(one(I, "A", k)), TF(one(I, "B", k)), "", ""] for k in dom]

    def rows(c3=False, c4=False):
        return world_table(names, cols, [[r[0], r[1], TF(imp[i]) if c3 else "", TF(con[i]) if c4 else ""] for i, r in enumerate(base)])
    els = [*heads("“All dogs bark”: ∀x (A → B) versus the wrong ∀x (A ∧ B)", "All dogs bark: → vs ∧", 640),
           table("w", 50, 50, 90, 38, rows(), {"x": 6, "y": 50, "cellW": 69, "cellH": 36}, header=True, mono=True),
           text("v1", 320, 236, "", {"x": 180, "y": 222, "size": 13}, anchor="middle", size=15),
           text("v2", 320, 268, "", {"x": 180, "y": 250, "size": 13}, anchor="middle", size=15)]
    steps = [
        step("A world with two barking dogs and a cat. The English sentence is true here: every dog barks.",
             ("w", {"highlight": [[1, 0], [2, 0]]})),
        step("Column A → B: for each dog the promise is kept (T → T). For the cat the hypothesis is false, so the promise is kept vacuously.",
             ("w", {"rows": rows(True), "highlight": [[1, 3], [2, 3], [3, 3]]})),
        step("Every row of A → B is T, so ∀x (A(x) → B(x)) is true, matching the English.",
             ("v1", {"text": "∀x (A → B) = T: matches the sentence", "tone": "success"})),
        step("Column A ∧ B: true for the dogs, but false for the cat, because the cat is not a dog.",
             ("w", {"rows": rows(True, True), "highlight": [[3, 4]]})),
        step("So ∀x (A(x) ∧ B(x)) is false: the cat is a counterexample. That formula claims everything is a barking dog.",
             ("v2", {"text": "∀x (A ∧ B) = F: wrongly fails on the cat", "tone": "danger"})),
        step("Rule: a universal over a noun takes →. The ∧ version is stronger than the sentence and fails as soon as the domain has a non-dog.",
             ("v2", {"text": "∀ goes with →", "tone": "accent"})),
    ]
    return spec("All A are B: → not ∧", (640, 290), (360, 270),
                "Domain: two dogs and a cat. A(x): x is a dog. B(x): x barks.",
                els, steps)


@scene
def some_are_wrong():
    names = ["dog", "cat"]
    dom = [0, 1]
    I = {"A": {(0,)}, "B": set()}
    con = [P.holds("A(x) & B(x)", dom, I, {"x": k}) for k in dom]
    imp = [P.holds("A(x) -> B(x)", dom, I, {"x": k}) for k in dom]
    assert con == [False, False] and imp == [False, True]
    assert not P.holds("exists x (A(x) & B(x))", dom, I) and P.holds("exists x (A(x) -> B(x))", dom, I)
    cols = ["dog?", "barks?", "A∧B", "A→B"]
    base = [[TF(one(I, "A", k)), TF(one(I, "B", k))] for k in dom]

    def rows(c3=False, c4=False):
        return world_table(names, cols, [[r[0], r[1], TF(con[i]) if c3 else "", TF(imp[i]) if c4 else ""] for i, r in enumerate(base)])
    els = [*heads("“Some dog barks”: ∃x (A ∧ B) versus the wrong ∃x (A → B)", "Some dog barks: ∧ vs →", 640),
           table("w", 50, 56, 90, 40, rows(), {"x": 6, "y": 56, "cellW": 69, "cellH": 38}, header=True, mono=True),
           text("v1", 320, 210, "", {"x": 180, "y": 202, "size": 13}, anchor="middle", size=15),
           text("v2", 320, 242, "", {"x": 180, "y": 230, "size": 13}, anchor="middle", size=15)]
    steps = [
        step("A world with one silent dog and a cat. The English sentence is false here: no dog barks.",
             ("w", {"highlight": [[1, 2]]})),
        step("Column A ∧ B: the dog does not bark, and the cat is not a dog. No row is T.",
             ("w", {"rows": rows(True), "highlight": [[1, 3], [2, 3]]})),
        step("So ∃x (A(x) ∧ B(x)) is false, matching the sentence.",
             ("v1", {"text": "∃x (A ∧ B) = F: matches the sentence", "tone": "success"})),
        step("Column A → B: the dog breaks the promise (T → F), but the cat keeps it vacuously (F → F = T).",
             ("w", {"rows": rows(True, True), "highlight": [[2, 4]]})),
        step("One T row is enough for ∃, so ∃x (A(x) → B(x)) is true, witnessed by the cat. It says the opposite of the sentence.",
             ("v2", {"text": "∃x (A → B) = T: wrongly true (the cat)", "tone": "danger"})),
        step("Rule: an existential over a noun takes ∧. With →, any object outside the noun is a free witness.",
             ("v2", {"text": "∃ goes with ∧", "tone": "accent"})),
    ]
    return spec("Some A are B: ∧ not →", (640, 262), (360, 250),
                "Domain: a dog that does not bark, and a cat. A(x): x is a dog. B(x): x barks.",
                els, steps)


@scene
def forall_exists_grid():
    names = ["a", "b", "c", "d"]
    dom = [0, 1, 2, 3]
    R1 = {(0, 1), (1, 2), (2, 3), (3, 0)}
    I1 = {"R": R1}
    assert P.holds("forall x exists y R(x, y)", dom, I1) and not P.holds("exists y forall x R(x, y)", dom, I1)
    R2 = R1 | {(0, 2), (1, 2), (3, 2), (2, 2)}
    I2 = {"R": R2}
    assert P.holds("exists y forall x R(x, y)", dom, I2) and P.holds("forall x exists y R(x, y)", dom, I2)

    def grid(R):
        return [["x \\ y", *names]] + [[names[i], *[TF((i, j) in R) for j in dom]] for i in dom]
    first_t = [min(j for j in dom if (i, j) in R1) for i in dom]
    first_f = [min(i for i in dom if (i, j) not in R1) for j in dom]
    els = [*heads("Rows for ∀x ∃y, columns for ∃y ∀x", "∀x∃y vs ∃y∀x on a grid", 640),
           table("g", 40, 50, 64, 40, grid(R1), {"x": 20, "y": 48, "cellW": 64, "cellH": 38}, header=True, mono=True),
           text("v1", 470, 120, "", {"x": 180, "y": 262, "size": 13}, anchor="middle", size=15),
           text("v2", 470, 160, "", {"x": 180, "y": 288, "size": 13}, anchor="middle", size=15),
           text("v3", 470, 200, "", {"x": 180, "y": 314, "size": 13}, anchor="middle", size=15)]
    steps = [
        step("R(x, y) as a grid: row x, column y, T where x is related to y. Each x is related to exactly one y here.", ("g", {"highlight": []})),
        step("∀x ∃y R(x, y) asks: does every ROW contain a T? Row a has T at b, row b at c, row c at d, row d at a.",
             ("g", {"highlight": [[i + 1, first_t[i] + 1] for i in dom]})),
        step("Every row has a T, so ∀x ∃y R(x, y) is true. The witness y is different for each x, and that is allowed.",
             ("v1", {"text": "∀x∃y R: every row has a T  ✓", "tone": "success"})),
        step("∃y ∀x R(x, y) asks for one COLUMN that is T all the way down. Each column has an F somewhere.",
             ("g", {"highlight": [[first_f[j] + 1, j + 1] for j in dom]})),
        step("No full column, so ∃y ∀x R(x, y) is false. Swapping ∀ and ∃ changed the answer.",
             ("v2", {"text": "∃y∀x R: no full column  ✗", "tone": "danger"})),
        step("Now make column c all T. Then ∃y ∀x R(x, y) is true (y = c works for everyone)…",
             ("g", {"rows": grid(R2), "highlight": [[i + 1, 3] for i in dom]}), ("v2", {"text": "∃y∀x R: column c is full  ✓", "tone": "success"})),
        step("…and every row automatically contains that T in column c, so ∀x ∃y R(x, y) is true too. ∃∀ implies ∀∃, never the other way.",
             ("v3", {"text": "∃y∀x ⇒ ∀x∃y", "tone": "accent"})),
    ]
    return spec("The order of ∀ and ∃", (640, 270), (360, 330),
                "A relation R on {a, b, c, d}. Read ∀x∃y along the rows and ∃y∀x down the columns.",
                els, steps)


@scene
def negation_ladder():
    forms = ["¬∀x ∃y (P(x) → Q(x, y))", "∃x ¬∃y (P(x) → Q(x, y))", "∃x ∀y ¬(P(x) → Q(x, y))", "∃x ∀y (P(x) ∧ ¬Q(x, y))"]
    src = ["~forall x exists y (P(x) -> Q(x, y))", "exists x ~exists y (P(x) -> Q(x, y))",
           "exists x forall y ~(P(x) -> Q(x, y))", "exists x forall y (P(x) & ~Q(x, y))"]
    for a in src[1:]:
        assert P.equivalent(src[0], a, 2)
    assert P.to_str(P.push_not(P.parse(src[0]))) == "∃x ∀y (P(x) ∧ ¬Q(x, y))"
    laws = ["", "¬∀ = ∃¬", "¬∃ = ∀¬", "¬(A → B) = A ∧ ¬B"]
    els = [*heads("Pushing ¬ inward, one symbol at a time", "Negation, step by step", 640)]
    for k, (f, law) in enumerate(zip(forms, laws)):
        y = 56 + k * 52
        els.append(box(f"f{k}", 40, y, 330, 40, f, {"x": 10, "y": 50 + k * 70, "w": 340, "h": 38, "size": 14}, size=15, mono=True, hidden=k > 0))
        if law:
            els.append(text(f"l{k}", 392, y + 26, law, {"x": 20, "y": 102 + (k - 1) * 70, "size": 13}, size=15, tone="info", hidden=True))
    els.append(text("end", 320, 284, "", {"x": 180, "y": 340, "size": 13}, anchor="middle", size=15))
    steps = [
        step("Start: the negation of “for every x there is a y with P(x) → Q(x, y)”. The ¬ sits outside both quantifiers.", ("f0", {"tone": "accent"})),
        step("Move ¬ past ∀x: it becomes ∃x and the ¬ moves inside. The variable x stays where it is.",
             ("f1", {"hidden": False, "tone": "accent"}), ("l1", {"hidden": False}), ("f0", {"tone": "muted"})),
        step("Move ¬ past ∃y: it becomes ∀y. The order x, y is unchanged; only the kinds flipped.",
             ("f2", {"hidden": False, "tone": "accent"}), ("l2", {"hidden": False}), ("f1", {"tone": "muted"})),
        step("Now ¬ meets an implication. A promise is broken exactly when the hypothesis holds and the conclusion fails: ¬(A → B) = A ∧ ¬B.",
             ("f3", {"hidden": False, "tone": "success", "fill": "success"}), ("l3", {"hidden": False}), ("f2", {"tone": "muted"})),
        step("Final form: some x has P, and every y fails Q(x, y). Check: two quantifiers flipped, the arrow became ∧, one new ¬ on Q.",
             ("end", {"text": "same order x, y · kinds flipped · → became ∧", "tone": "accent"})),
    ]
    return spec("Negating a nested formula", (640, 300), (360, 360),
                "De Morgan's laws for quantifiers, applied one symbol at a time, then the Chapter 1 law for ¬(A → B).",
                els, steps)


@scene
def exists_unique():
    nums = [1, 2, 3, 4, 5]
    dom = list(range(5))
    even_prime = {(i,) for i, n in enumerate(nums) if n % 2 == 0 and n > 1 and all(n % d for d in range(2, n))}
    even = {(i,) for i, n in enumerate(nums) if n % 2 == 0}
    f = "exists x (E(x) & forall z (E(z) -> z = x))"
    assert P.holds(f, dom, {"E": even_prime}) and not P.holds(f, dom, {"E": even})
    assert P.holds("exists x E(x)", dom, {"E": even})
    els = [*heads("∃!x φ(x) = “one qualifies, and every qualifier is that one”", "Exactly one: ∃!", 640)]
    for k, n in enumerate(nums):
        x, nx = 40 + k * 116, 10 + k * 70
        els.append(box(f"n{k}", x, 60, 96, 50, str(n), {"x": nx, "y": 56, "w": 60, "h": 44}, size=18, mono=True))
        els.append(box(f"q{k}", x, 124, 96, 38, "?", {"x": nx, "y": 110, "w": 60, "h": 34, "size": 13}, size=14, mono=True))
    els.append(text("phi", 320, 196, "φ(x): x is an even prime", {"x": 180, "y": 176, "size": 13}, anchor="middle", size=15, tone="muted"))
    els.append(text("v", 320, 232, "", {"x": 180, "y": 210, "size": 13}, anchor="middle", size=15))
    ep = [(i,) in even_prime for i in dom]
    ev = [(i,) in even for i in dom]
    steps = [
        step("Part 1, at least one: look for a witness of φ. 2 is even and prime.",
             ("n1", {"tone": "success"}), ("q1", {"label": "T", "tone": "success", "fill": "success"})),
        step("Part 2, the guard: every z with φ(z) must equal 2. Test the others: 1, 3, 4 and 5 are not even primes.",
             *[(f"q{i}", {"label": TF(ep[i]), "tone": "muted"}) for i in dom if i != 1]),
        step("Both parts hold, so ∃!x φ(x) is true: exactly one element qualifies.",
             ("v", {"text": "∃!x (even prime) = T: only 2", "tone": "success"})),
        step("Now change φ to “x is even”. Part 1 still holds (2 is a witness)…",
             ("phi", {"text": "φ(x): x is even"}), *[(f"q{i}", {"label": TF(ev[i]), "tone": "success" if ev[i] else "muted", "fill": "success" if ev[i] else "none"}) for i in dom],
             ("v", {"text": "at least one: yes", "tone": "accent"})),
        step("…but the guard fails: 4 also qualifies and 4 ≠ 2. So ∃! is false although ∃ is true.",
             ("n3", {"tone": "danger"}), ("q3", {"tone": "danger", "fill": "danger"}), ("v", {"text": "∃!x (even) = F: 2 and 4 both qualify", "tone": "danger"})),
    ]
    return spec("Exactly one", (640, 250), (360, 230),
                "Domain {1, 2, 3, 4, 5}. Exactly one = at least one witness, plus a guard that rules out a second.",
                els, steps)


@scene
def translate_steps():
    src = "exists y forall x ((x != y) -> (M(x, y) & ~M(y, x)))"
    f = P.parse(src)
    assert P.free_vars(f) == set()
    # A world where it holds (y = 0 is known by all and knows nobody) and one where it fails.
    good = {"M": {(1, 0), (2, 0), (1, 2)}}
    bad = {"M": {(1, 0), (2, 0), (0, 2)}}
    assert P.holds(src, [0, 1, 2], good) and not P.holds(src, [0, 1, 2], bad)
    parts = [("There is a person", "∃y"), ("for everyone else", "∀x (x ≠ y →"), ("x knows y", "M(x, y)"),
             ("and y does not know x", "∧ ¬M(y, x))")]
    els = [*heads("Translating phrase by phrase (GATE 2026)", "Phrase by phrase", 640)]
    for k, (en, fo) in enumerate(parts):
        y = 54 + k * 50
        els.append(box(f"en{k}", 30, y, 270, 40, en, {"x": 8, "y": 50 + k * 66, "w": 170, "h": 30, "size": 12}, size=14))
        els.append(box(f"fo{k}", 330, y, 280, 40, fo, {"x": 184, "y": 50 + k * 66, "w": 168, "h": 30, "size": 12}, size=15, mono=True, hidden=True))
    els.append(text("all", 320, 276, "", {"x": 180, "y": 330, "size": 12}, anchor="middle", size=15, mono=True))
    steps = [
        step("“There is a person” fixes one y first, before anyone else is considered: the outer quantifier is ∃y.",
             ("en0", {"tone": "accent"}), ("fo0", {"hidden": False, "tone": "accent"})),
        step("“everyone else” ranges over every x other than y: a universal restricted by x ≠ y, so it takes →.",
             ("en1", {"tone": "accent"}), ("fo1", {"hidden": False, "tone": "accent"})),
        step("“is known by everyone else”: each such x knows y, M(x, y).",
             ("en2", {"tone": "accent"}), ("fo2", {"hidden": False, "tone": "accent"})),
        step("“does not know anyone else”: y does not know x, joined with ∧ inside the same promise.",
             ("en3", {"tone": "accent"}), ("fo3", {"hidden": False, "tone": "accent"})),
        step("Assembled: ∃y ∀x ((x ≠ y) → (M(x, y) ∧ ¬M(y, x))). Swapping to ∀y would describe everyone; ∃x would need only one other person.",
             ("all", {"text": "∃y ∀x ((x ≠ y) → (M(x, y) ∧ ¬M(y, x)))", "tone": "success"})),
    ]
    return spec("English to logic, phrase by phrase", (640, 296), (360, 350),
                "“There is a person who does not know anyone else, but that person is known by everyone else.”",
                els, steps)
