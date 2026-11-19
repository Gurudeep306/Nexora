"""Viz scenes for dm/02-predicate-logic/01-predicates-quantifiers. Every truth value shown is computed
with predlib on the same small worlds, so the scenes cannot drift from the checked maths."""
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


def strip_boxes(dom, vals, interp, pred="P"):
    """(wide pos, narrow pos, value) per element of the domain strip."""
    out = []
    for i, d in enumerate(dom):
        v = (d,) in interp[pred]
        out.append((40 + i * 145, 100, 12 + i * 86, 96, d, v))
    return out


@scene
def forall_big_and():
    dom = ["a", "b", "c", "d"]
    interp = {"P": {("a",), ("b",), ("d",)}}
    assert P.holds("forall x P(x)", dom, interp) is False
    assert [P.holds("P(x)", dom, interp, {"x": d}) for d in dom] == [True, True, False, True]
    rows = [["x", "P(x)"]] + [[d, TF(P.holds("P(x)", dom, interp, {"x": d}))] for d in dom]
    els = [*heads("∀x P(x) is a big AND over the domain D = {a, b, c, d}", "∀x P(x) = big AND", 640),
           table("tt", 440, 100, 90, 34, [["x", "P(x)"]] + [["", ""] for _ in dom], {"x": 250, "y": 100, "cellW": 48, "cellH": 34}, header=True, mono=True)]
    acc = True
    for i, d in enumerate(dom):
        wx, wy, nx, ny, _, v = strip_boxes(dom, None, interp)[i]
        els.append(box(f"e{i}", wx, wy, 120, 44, d, {"x": nx, "y": ny, "w": 76, "h": 40, "size": 14}, size=16))
        els.append(text(f"v{i}", wx + 60, wy + 66, "?", {"x": nx + 38, "y": ny + 58, "size": 12}, anchor="middle", size=14, mono=True))
        row = list(rows[i + 1])
        row[1] = TF(v)
        rows[i + 1] = row
        acc = acc and v
    els.append(box("acc", 40, 220, 360, 46, "AND so far: T", {"x": 12, "y": 210, "w": 336, "h": 40, "size": 14}, size=15, mono=True))
    els.append(text("verdict", 320, 300, "", {"x": 180, "y": 292, "size": 13}, anchor="middle", size=15))
    steps, acc = [], True
    for i, d in enumerate(dom):
        v = (d,) in interp["P"]
        acc = acc and v
        steps.append(step(
            f"Element {d}: P({d}) = {TF(v)}. The running AND becomes {TF(acc)}."
            + (" This is the counterexample: P(c) is false." if not v else ""),
            (f"v{i}", {"text": TF(v), "tone": "danger" if not v else "success"}),
            (f"e{i}", {"tone": "danger", "fill": "danger"} if not v else {"tone": "accent"}),
            ("tt", {"rows": [rows[0]] + rows[1:i + 2], "highlight": [[i + 1, 0], [i + 1, 1]]}),
            ("acc", {"label": f"AND so far: {TF(acc)}", "tone": "danger" if not acc else "accent"})))
    steps.append(step("All four elements checked: T ∧ T ∧ F ∧ T = F. So ∀x P(x) is false, and c is a counterexample.",
                      ("verdict", {"text": "∀x P(x) = F — counterexample: c", "tone": "danger"}),
                      ("acc", {"label": "AND: F", "fill": "danger", "tone": "danger"})))
    return spec("∀ as a big AND over the domain", (640, 320), (360, 312),
                "On a finite domain, ∀x P(x) is the conjunction P(a) ∧ P(b) ∧ P(c) ∧ P(d): it is false exactly when one element fails P.",
                els, steps)


@scene
def exists_big_or():
    dom = ["a", "b", "c", "d"]
    interp = {"P": {("b",)}}
    assert P.holds("exists x P(x)", dom, interp) is True
    vals = [P.holds("P(x)", dom, interp, {"x": d}) for d in dom]
    assert vals == [False, True, False, False]
    els = [*heads("∃x P(x) is a big OR that stops at the first witness", "∃x P(x) = big OR", 640)]
    acc = False
    for i, d in enumerate(dom):
        wx = 40 + i * 145
        nx = 12 + i * 86
        els.append(box(f"e{i}", wx, 100, 120, 44, d, {"x": nx, "y": 96, "w": 76, "h": 40, "size": 14}, size=16))
        els.append(text(f"v{i}", wx + 60, 166, "?", {"x": nx + 38, "y": 158, "size": 12}, anchor="middle", size=14, mono=True))
    els.append(box("acc", 40, 220, 360, 46, "OR so far: F", {"x": 12, "y": 210, "w": 336, "h": 40, "size": 14}, size=15, mono=True))
    els.append(text("verdict", 320, 300, "", {"x": 180, "y": 292, "size": 13}, anchor="middle", size=15))
    steps, acc = [], False
    for i, d in enumerate(dom):
        v = vals[i]
        if acc:
            steps.append(step(f"Element {d}: P({d}) = {TF(v)}, but the OR is already T — we stop. b is the witness.",
                              (f"v{i}", {"text": TF(v), "tone": "muted"})))
            break
        acc = acc or v
        steps.append(step(
            f"Element {d}: P({d}) = {TF(v)}. The running OR becomes {TF(acc)}."
            + (" First witness found — the OR can only stay T now." if v else ""),
            (f"v{i}", {"text": TF(v), "tone": "success" if v else "muted"}),
            (f"e{i}", {"tone": "success", "fill": "success"} if v else {"tone": "accent"}),
            ("acc", {"label": f"OR so far: {TF(acc)}", "tone": "success" if acc else "accent"})))
    steps.append(step("∃x P(x) = F ∨ T ∨ … = T. One witness (b) is enough; the rest do not matter.",
                      ("verdict", {"text": "∃x P(x) = T — witness: b", "tone": "success"}),
                      ("acc", {"label": "OR: T", "fill": "success", "tone": "success"})))
    return spec("∃ as a big OR with a first witness", (640, 320), (360, 312),
                "On a finite domain, ∃x P(x) is the disjunction P(a) ∨ P(b) ∨ P(c) ∨ P(d): true as soon as one element satisfies P.",
                els, steps)


@scene
def scope_bracket_grow():
    f = "forall x (P(x) & Q(x, y)) | R(y)"
    e = P.parse(f)
    assert P.free_vars(e) == {"y"}
    toks = ["∀x", "P(x)", "∧", "Q(x,y)", "∨ R(y)"]
    W = 640
    xs = [40, 130, 220, 290, 400]
    nxs = [12, 80, 140, 195, 260]
    els = [*heads("Scope of ∀x in  ∀x (P(x) ∧ Q(x,y)) ∨ R(y)", "Scope of ∀x", W)]
    for i, t in enumerate(toks):
        els.append(box(f"t{i}", xs[i], 100, 80 if i != 4 else 150, 44, t, {"x": nxs[i], "y": 96, "w": 58 if i != 4 else 88, "h": 40, "size": 13}, size=15, mono=True))
    els.append(box("br", xs[1] - 8, 92, xs[3] + 88 - xs[1] + 8, 60, None, {"x": nxs[1] - 6, "y": 88, "w": nxs[3] + 58 - nxs[1] + 12, "h": 56}, dashed=True, tone="accent", hidden=True))
    els.append(text("note", 320, 210, "", {"x": 180, "y": 200, "size": 13}, anchor="middle", size=15))
    els.append(text("verdict", 320, 250, "", {"x": 180, "y": 240, "size": 13}, anchor="middle", size=15, tone="accent"))
    steps = [
        step("The quantifier ∀x stands in front of a bracketed formula. Its scope is everything inside those brackets.",
             ("t0", {"tone": "accent", "fill": "accent"})),
        step("The bracket covers P(x) ∧ Q(x,y): every x inside it is bound by ∀x.",
             ("br", {"hidden": False}), ("t1", {"tone": "success"}), ("t2", {"tone": "success"}), ("t3", {"tone": "success"}),
             ("note", {"text": "x occurs only inside the scope → bound", "tone": "success"})),
        step("Outside the brackets we have ∨ R(y). The y in Q(x,y) and in R(y) is not in any quantifier's scope: it is free.",
             ("t4", {"tone": "warning", "fill": "warning"}),
             ("note", {"text": "y occurs outside every scope → free", "tone": "warning"})),
        step("So this formula has one bound variable (x) and one free variable (y); it is not yet a sentence. Quantify the y (or fix it) and it becomes a proposition.",
             ("verdict", {"text": "free variables: {y} — not a sentence yet"})),
    ]
    return spec("Bound and free variables under a scope bracket", (640, 280), (360, 270),
                "The scope of a quantifier is the part of the formula it applies to. Variables inside are bound; the rest are free.",
                els, steps)


@scene
def all_vs_wrong_conj():
    dom = ["a", "b", "c", "d"]
    A = {("a",), ("b",)}
    B = {("a",), ("b",), ("c",)}
    I = {"A": A, "B": B}
    good = "forall x (A(x) -> B(x))"
    bad = "forall x (A(x) & B(x))"
    assert P.holds(good, dom, I) is True and P.holds(bad, dom, I) is False
    head = ["x", "A(x)", "B(x)", "A→B", "A∧B"]

    def row(d, k):
        a, b = (d,) in A, (d,) in B
        r = [d, TF(a), TF(b)]
        r.append(TF(P.holds("A(x) -> B(x)", dom, I, {"x": d})) if k >= 1 else "")
        r.append(TF(P.holds("A(x) & B(x)", dom, I, {"x": d})) if k >= 2 else "")
        return r

    els = [*heads("“All A are B”:  ∀x (A(x) → B(x))   vs the wrong  ∀x (A(x) ∧ B(x))", "All A are B — correct vs wrong", 640),
           table("tt", 60, 100, 92, 34, [head] + [row(d, 0) for d in dom], {"x": 14, "y": 96, "cellW": 66, "cellH": 32}, header=True, mono=True),
           text("verdict", 320, 300, "", {"x": 180, "y": 300, "size": 13}, anchor="middle", size=15)]
    steps = [step("World: D = {a,b,c,d}, A = {a,b}, B = {a,b,c}. First fill the A and B columns.",
                  ("tt", {"rows": [head] + [row(d, 0) for d in dom], "highlight": [[i + 1, j] for i in range(4) for j in (1, 2)]}))]
    for i, d in enumerate(dom):
        steps.append(step(
            f"Element {d}: A({d}) = {TF((d,) in A)}, B({d}) = {TF((d,) in B)}, so A→B = {TF(P.holds('A(x) -> B(x)', dom, I, {'x': d}))}"
            + (" (vacuously true: not A)." if (d,) not in A else ""),
            ("tt", {"rows": [head] + [row(dd, 1) for dd in dom], "highlight": [[i + 1, 3]]})))
    steps.append(step("∀x(A→B): every element gives T (a and b because they are in B; c and d vacuously because they are not A). The statement is TRUE.",
                      ("tt", {"highlight": [[i + 1, 3] for i in range(4)], "rows": [head] + [row(dd, 1) for dd in dom]}),
                      ("verdict", {"text": "∀x(A→B) = T", "tone": "success"})))
    for i, d in enumerate(dom):
        bad_v = P.holds("A(x) & B(x)", dom, I, {"x": d})
        extra = ("verdict", {"text": "∀x(A∧B) fails at c and d", "tone": "danger"}) if i == 2 else ("tt", {"highlight": [[i + 1, 4]]})
        steps.append(step(
            f"Now the wrong pairing ∀x(A∧B): at {d}, A∧B = {TF(bad_v)}" + (" — FALSE at an element that is not even A!" if not bad_v and (d,) not in A else "."),
            ("tt", {"rows": [head] + [row(dd, 2) for dd in dom], "highlight": [[i + 1, 4]]}), extra))
    steps.append(step("The wrong formula ∀x(A∧B) claims every object is both A and B — it fails at c and d. “All A are B” only restricts the A's, so the correct form is ∀x(A(x) → B(x)).",
                      ("verdict", {"text": "correct: ∀x(A→B) = T;  wrong: ∀x(A∧B) = F", "tone": "accent"}),
                      ("tt", {"highlight": [[3, 4], [4, 4]]})))
    return spec("“All A are B” — implication, not conjunction", (640, 330), (360, 330),
                "“All A are B” is ∀x(A(x) → B(x)): non-A elements satisfy it vacuously. The ∧ version wrongly demands that everything be A and B.",
                els, steps)


@scene
def some_vs_wrong_imp():
    dom = ["a", "b", "c"]
    I = {"A": {("a",)}, "B": {("b",)}}
    good = "exists x (A(x) & B(x))"
    bad = "exists x (A(x) -> B(x))"
    assert P.holds(good, dom, I) is False and P.holds(bad, dom, I) is True
    head = ["x", "A(x)", "B(x)", "A∧B", "A→B"]

    def row(d, k):
        a, b = (d,) in I["A"], (d,) in I["B"]
        r = [d, TF(a), TF(b)]
        r.append(TF(P.holds("A(x) & B(x)", dom, I, {"x": d})) if k >= 1 else "")
        r.append(TF(P.holds("A(x) -> B(x)", dom, I, {"x": d})) if k >= 2 else "")
        return r

    els = [*heads("“Some A are B”:  ∃x (A(x) ∧ B(x))   vs the wrong  ∃x (A(x) → B(x))", "Some A are B — correct vs wrong", 640),
           table("tt", 60, 100, 100, 34, [head] + [row(d, 0) for d in dom], {"x": 14, "y": 96, "cellW": 64, "cellH": 32}, header=True, mono=True),
           text("verdict", 320, 300, "", {"x": 180, "y": 300, "size": 13}, anchor="middle", size=15)]
    steps = [step("World: D = {a,b,c}, A = {a}, B = {b}. No element is both A and B. Fill A and B first.",
                  ("tt", {"rows": [head] + [row(d, 0) for d in dom], "highlight": [[i + 1, j] for i in range(3) for j in (1, 2)]}))]
    for i, d in enumerate(dom):
        steps.append(step(f"Element {d}: A∧B = {TF(P.holds('A(x) & B(x)', dom, I, {'x': d}))}.",
                          ("tt", {"rows": [head] + [row(dd, 1) for dd in dom], "highlight": [[i + 1, 3]]})))
    steps.append(step("∃x(A∧B): all three values are F, so “some A are B” is FALSE in this world.",
                      ("tt", {"rows": [head] + [row(dd, 1) for dd in dom], "highlight": [[i + 1, 3] for i in range(3)]}),
                      ("verdict", {"text": "∃x(A∧B) = F", "tone": "danger"})))
    for i, d in enumerate(dom):
        v = P.holds("A(x) -> B(x)", dom, I, {"x": d})
        note = " — vacuously true at b, which is not A!" if (d,) not in I["A"] and v else ""
        steps.append(step(f"Wrong pairing: at {d}, A→B = {TF(v)}{note}",
                          ("tt", {"rows": [head] + [row(dd, 2) for dd in dom], "highlight": [[i + 1, 4]]})))
    steps.append(step("∃x(A→B) is TRUE — but only because b is not A, making A→B vacuously true. The ∧ form is the correct one: “some A are B” needs a witness that is both.",
                      ("verdict", {"text": "correct ∃x(A∧B) = F;  wrong ∃x(A→B) = T (vacuous)", "tone": "warning"}),
                      ("tt", {"highlight": [[2, 4]]})))
    return spec("“Some A are B” — conjunction, not implication", (640, 330), (360, 330),
                "“Some A are B” is ∃x(A(x) ∧ B(x)): it needs a witness in A∩B. The → version is made true by any non-A element.",
                els, steps)


@scene
def order_grid_forall_exists():
    X, Y = ["a", "b", "c"], ["m", "n", "p"]
    R1 = {("a", "m"), ("b", "n"), ("c", "p")}   # every row marked, no full column
    R2 = {("a", "m"), ("b", "m"), ("c", "m")}   # column m full
    # predlib quantifies over one domain; evaluate the two orders on the 3x3 grid directly:
    def grid_vals(R):
        fe = all(any((x, y) in R for y in Y) for x in X)          # ∀x∃y
        ef = any(all((x, y) in R for x in X) for y in Y)          # ∃y∀x
        return fe, ef
    assert grid_vals(R1) == (True, False) and grid_vals(R2) == (True, True)
    assert P.counter_model("(exists y forall x R(x, y)) -> (forall x exists y R(x, y))", 3) is None
    assert P.counter_model("(forall x exists y R(x, y)) -> (exists y forall x R(x, y))", 3) is not None

    def grid(R, x0, y0, n, cw=44, chh=34):
        rows = [["x\\y"] + Y]
        for x in X:
            rows.append([x] + ["R" if (x, y) in R else "·" for y in Y])
        return table(f"g{n}", x0, y0, cw, chh, rows, None, header=True, mono=True)

    els = [*heads("∀x∃y R(x,y) vs ∃y∀x R(x,y) on an x×y grid", "∀∃ vs ∃∀ grid", 640),
           grid(R1, 60, 100, 1, 44, 34), grid(R2, 300, 100, 2, 44, 34),
           text("lab1", 60 + 88, 100 + 4 * 34 + 14, "grid 1", {"x": 100, "y": 100 + 4 * 34 + 14, "size": 12}, size=14, anchor="middle"),
           text("lab2", 300 + 88, 100 + 4 * 34 + 14, "grid 2", {"x": 240, "y": 100 + 4 * 34 + 14, "size": 12}, size=14, anchor="middle"),
           text("verdict", 320, 300, "", {"x": 180, "y": 296, "size": 13}, anchor="middle", size=15)]
    # narrow overrides
    for e in els:
        if e["id"] == "g1":
            e["narrow"] = {"x": 14, "y": 92, "cellW": 40, "cellH": 30}
        if e["id"] == "g2":
            e["narrow"] = {"x": 200, "y": 92, "cellW": 40, "cellH": 30}
        if e["id"] == "lab1":
            e["narrow"] = {"x": 14 + 80, "y": 92 + 4 * 30 + 12}
        if e["id"] == "lab2":
            e["narrow"] = {"x": 200 + 80, "y": 92 + 4 * 30 + 12}
    steps = [
        step("Grid 1: marks R(a,m), R(b,n), R(c,p) — a diagonal. Read ∀x∃y R(x,y): for EACH row x, is there a mark? Yes in every row → true.",
             ("g1", {"highlight": [[1, 1], [2, 2], [3, 3]]})),
        step("Read ∃y∀x R(x,y): is there ONE column y that is full (marked in all rows)? Columns m, n, p each have only one mark → false.",
             ("g1", {"highlight": [[1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2], [3, 3]]}),
             ("verdict", {"text": "grid 1: ∀x∃y = T,  ∃y∀x = F", "tone": "danger"})),
        step("Grid 2: all marks in column m. Now ∃y∀x is true (y = m works for every x), and ∀x∃y is still true.",
             ("g2", {"highlight": [[1, 1], [2, 1], [3, 1]]})),
        step("So ∃y∀x ⇒ ∀x∃y always (one full column makes every row marked), but not conversely — grid 1 is the counter-model. Order matters.",
             ("verdict", {"text": "∃y∀x → ∀x∃y holds;  the converse fails (grid 1)", "tone": "accent"}),
             ("g1", {"highlight": [[1, 1], [2, 2], [3, 3]]}), ("g2", {"highlight": [[1, 1], [2, 1], [3, 1]]})),
    ]
    return spec("The order of ∀ and ∃ on a grid", (640, 330), (360, 330),
                "∀x∃y R(x,y) means every row has a mark; ∃y∀x R(x,y) means one full column. A full column implies every row, never the reverse.",
                els, steps)


@scene
def negation_push_ladder():
    orig = "not forall x exists y (P(x) -> Q(y))"
    final = "exists x forall y (P(x) & not Q(y))"
    assert P.push_not(P.parse(orig)) == P.parse(final)
    assert P.equivalent(orig, final, 3)
    lines = ["¬∀x ∃y (P(x) → Q(y))", "∃x ¬∃y (P(x) → Q(y))", "∃x ∀y ¬(P(x) → Q(y))", "∃x ∀y (P(x) ∧ ¬Q(y))"]
    nlines = ["¬∀x∃y(P→Q)", "∃x¬∃y(P→Q)", "∃x∀y¬(P→Q)", "∃x∀y(P∧¬Q)"]
    els = [*heads("Pushing ¬ inward: one quantifier per step", "Negation push-through", 640)]
    for k, (a, b) in enumerate(zip(lines, nlines)):
        els.append(box(f"l{k}", 60, 90 + k * 56, 520, 42, a, {"x": 16, "y": 88 + k * 56, "w": 328, "h": 40, "size": 13},
                       size=16, mono=True, hidden=k > 0))
    els.append(text("verdict", 320, 330, "", {"x": 180, "y": 322, "size": 13}, anchor="middle", size=15))
    steps = [
        step("Start: ¬∀x ∃y (P(x) → Q(y)).", ("l0", {"hidden": False, "tone": "accent"})),
        step("¬∀ becomes ∃¬:  ¬∀x φ ≡ ∃x ¬φ.  Line: ∃x ¬∃y (P(x) → Q(y)).", ("l1", {"hidden": False, "tone": "accent"}), ("l0", {"tone": "muted"})),
        step("Again: ¬∃y becomes ∀y¬:  ∃x ∀y ¬(P(x) → Q(y)).", ("l2", {"hidden": False, "tone": "accent"}), ("l1", {"tone": "muted"})),
        step("Inside: ¬(P → Q) ≡ P ∧ ¬Q (an implication is broken exactly when its hypothesis holds and conclusion fails).",
             ("l3", {"hidden": False, "tone": "success", "fill": "success"}), ("l2", {"tone": "muted"})),
        step("Final: ∃x ∀y (P(x) ∧ ¬Q(y)) — negation only on the atoms. Verified equivalent to the original on all interpretations up to size 3.",
             ("verdict", {"text": "¬∀x∃y(P→Q) ≡ ∃x∀y(P∧¬Q)", "tone": "success"})),
    ]
    return spec("De Morgan for quantifiers, pushed inward", (640, 350), (360, 344),
                "¬∀xφ ≡ ∃x¬φ and ¬∃xφ ≡ ∀x¬φ. Push ¬ through a chain of quantifiers one at a time, flipping each; then use ¬(P→Q) ≡ P∧¬Q.",
                els, steps)


@scene
def translate_phrase_by_phrase():
    dom = ["b1", "g1"]
    I = {"boy": {("b1",)}, "girl": {("g1",)}, "taller": set()}
    good = "exists x (boy(x) & forall y (girl(y) -> taller(x, y)))"
    wrong = "exists x (boy(x) -> forall y (girl(y) & taller(x, y)))"
    assert P.holds(good, dom, I) is False and P.holds(wrong, dom, I) is True
    phrases = ["“Some boys”", "“in the class”", "“are taller than”", "“all the girls”"]
    parts = ["∃x", "boy(x)", "∧", "∀y (girl(y) → taller(x,y))"]
    nparts = ["∃x", "boy(x)", "∧", "∀y(girl→taller)"]
    els = [*heads("“Some boys in the class are taller than all the girls”", "Translating phrase by phrase", 640)]
    for i, p in enumerate(phrases):
        els.append(box(f"p{i}", 30, 90 + i * 52, 210, 40, p, {"x": 10, "y": 88 + i * 52, "w": 150, "h": 38, "size": 12}, size=14, tone="muted"))
    for i, (a, b) in enumerate(zip(parts, nparts)):
        els.append(box(f"f{i}", 280, 90 + i * 52, 330, 40, b, {"x": 176, "y": 88 + i * 52, "w": 176, "h": 38, "size": 12},
                       size=15, mono=True, hidden=True))
    els.append(text("verdict", 460, 310, "", {"x": 180, "y": 306, "size": 13}, anchor="middle", size=15))
    steps = [
        step("“Some boys …” — a claim about existence of a boy: ∃x boy(x) ∧ … . The existential takes ∧.", ("p0", {"tone": "accent"}), ("f0", {"hidden": False}), ("f1", {"hidden": False})),
        step("“… in the class” just restricts the domain to classmates — no extra quantifier; the domain is the class.", ("p1", {"tone": "accent"})),
        step("“… are taller than …” — the relation taller(x, y) attaches to that boy: ∧ taller(x, y).", ("p2", {"tone": "accent"}), ("f2", {"hidden": False})),
        step("“… all the girls” — for every girl y: girl(y) → taller(x, y). The universal over girls takes →. Full: ∃x (boy(x) ∧ ∀y (girl(y) → taller(x,y))).",
             ("p3", {"tone": "accent"}), ("f3", {"hidden": False, "tone": "success", "fill": "success"})),
        step("Checked on a world with one boy, one girl and nobody taller: the correct formula is FALSE, the wrong pairing ∃x(boy(x) → …) is TRUE (vacuously at the girl). So ∧ with ∃ and → with ∀ is the right pairing.",
             ("verdict", {"text": "∃x(boy(x) ∧ ∀y(girl(y)→taller(x,y)))", "tone": "accent"})),
    ]
    return spec("Translating an English sentence phrase by phrase", (640, 330), (360, 330),
                "“Some A are B…” → ∃x(A(x) ∧ …); “…all the B” inside it → ∀y(B(y) → …). Existential takes ∧, universal takes →.",
                els, steps)


@scene
def unique_exists_unique():
    dom = ["a", "b", "c"]
    I = {"P": {("a",), ("b",)}}
    assert P.holds("exists!x P(x)", dom, I) is False
    assert P.holds("exists x P(x)", dom, I) is True
    assert P.holds("forall x forall y ((P(x) & P(y)) -> x = y)", dom, I) is False
    els = [*heads("∃!x P(x): “exactly one” = exists AND at most one", "∃! unpacked", 640),
           box("c1", 40, 100, 560, 44, "part 1 — exists:  ∃x P(x)", {"x": 12, "y": 96, "w": 336, "h": 40, "size": 13}, size=15, mono=True),
           box("c2", 40, 160, 560, 44, "part 2 — at most one:  ∀x∀y (P(x)∧P(y) → x=y)", {"x": 12, "y": 148, "w": 336, "h": 40, "size": 12}, size=14, mono=True),
           box("c3", 40, 220, 560, 44, "∃!x P(x) = part 1 ∧ part 2", {"x": 12, "y": 200, "w": 336, "h": 40, "size": 13}, size=15, mono=True),
           text("verdict", 320, 300, "", {"x": 180, "y": 292, "size": 13}, anchor="middle", size=15)]
    steps = [
        step("World: D = {a,b,c}, P = {a,b} — two elements satisfy P.", ("c1", {"tone": "accent"})),
        step("Part 1, existence: ∃x P(x) = T (witness a).", ("c1", {"label": "part 1 — exists:  ∃x P(x) = T", "tone": "success", "fill": "success"})),
        step("Part 2, at most one: check the pair (a, b): P(a) ∧ P(b) is T but a = b is F, so the implication fails.",
             ("c2", {"label": "part 2 — at most one = F (pair a, b)", "tone": "danger", "fill": "danger"})),
        step("∃!x P(x) = T ∧ F = F: there is not exactly one P — there are two.",
             ("c3", {"label": "∃!x P(x) = T ∧ F = F", "tone": "danger", "fill": "danger"}),
             ("verdict", {"text": "∃!x P(x) ≡ ∃x(P(x)∧∀y(P(y)→y=x)); here F", "tone": "accent"})),
    ]
    return spec("∃! unpacked into exists + at most one", (640, 320), (360, 310),
                "“Exactly one” is two conditions: at least one (∃x P(x)) and at most one (∀x∀y(P(x)∧P(y) → x=y)). ∃!x P(x) is their conjunction.",
                els, steps)
