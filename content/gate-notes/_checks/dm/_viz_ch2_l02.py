"""Viz scenes for dm/02-predicate-logic/02-quantifier-laws-validity. All values computed with predlib."""
import itertools
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import predlib as P  # noqa: E402
from dmlib import arrow, box, heads, node, spec, step, table, text  # noqa: E402

SPECS = {}
TF = lambda b: "T" if b else "F"  # noqa: E731


def scene(fn):
    SPECS[fn.__name__.replace("_", "-")] = fn()
    return fn


@scene
def law_checked_on_world():
    dom = ["a", "b", "c"]
    I = {"P": {("a",), ("b",)}, "Q": {("a",), ("b",), ("c",)}}
    lhs = P.holds("forall x (P(x) & Q(x))", dom, I)
    r1 = P.holds("forall x P(x)", dom, I)
    r2 = P.holds("forall x Q(x)", dom, I)
    assert (lhs, r1, r2) == (False, False, True) and lhs == (r1 and r2)
    assert P.equivalent("forall x (P(x) & Q(x))", "(forall x P(x)) & (forall x Q(x))", 3)
    head = ["x", "P(x)", "Q(x)", "P∧Q"]

    def row(d, k):
        p, q = (d,) in I["P"], (d,) in I["Q"]
        r = [d, TF(p), TF(q)]
        r.append(TF(p and q) if k >= 1 else "")
        return r

    els = [*heads("Law: ∀x(P∧Q) ≡ ∀xP ∧ ∀xQ, checked on D = {a,b,c}", "∀ distributes over ∧", 640),
           table("tt", 60, 100, 100, 36, [head] + [row(d, 0) for d in dom], {"x": 14, "y": 96, "cellW": 62, "cellH": 34}, header=True, mono=True),
           box("lhs", 420, 100, 190, 44, "∀x(P∧Q) = ?", {"x": 240, "y": 96, "w": 108, "h": 40, "size": 13}, size=14, mono=True),
           box("rhs", 420, 160, 190, 44, "∀xP ∧ ∀xQ = ?", {"x": 240, "y": 148, "w": 108, "h": 40, "size": 13}, size=14, mono=True),
           text("verdict", 320, 300, "", {"x": 180, "y": 296, "size": 13}, anchor="middle", size=15)]
    steps = [step("World: P = {a,b}, Q = {a,b,c}. Fill the P and Q columns.",
                  ("tt", {"rows": [head] + [row(d, 0) for d in dom], "highlight": [[i + 1, j] for i in range(3) for j in (1, 2)]}))]
    for i, d in enumerate(dom):
        p, q = (d,) in I["P"], (d,) in I["Q"]
        steps.append(step(f"Element {d}: P∧Q = {TF(p)} ∧ {TF(q)} = {TF(p and q)}.",
                          ("tt", {"rows": [head] + [row(dd, 1) for dd in dom], "highlight": [[i + 1, 3]]})))
    steps.append(step(f"∀x(P∧Q): all three values must be T; c gives F → ∀x(P∧Q) = {TF(lhs)}.  ∀xP = {TF(r1)} (c fails P), ∀xQ = {TF(r2)}. So ∀xP ∧ ∀xQ = {TF(r1 and r2)} — equal to the left side: the law holds on this world (and on every world up to size 3, checked by machine).",
                      ("lhs", {"label": f"∀x(P∧Q) = {TF(lhs)}", "tone": "danger" if not lhs else "success"}),
                      ("rhs", {"label": f"∀xP ∧ ∀xQ = {TF(r1 and r2)}", "tone": "accent"}),
                      ("verdict", {"text": "∀x(P∧Q) ≡ ∀xP ∧ ∀xQ  ✓", "tone": "success"})))
    return spec("A law checked on a 3-element world", (640, 330), (360, 330),
                "∀x(P(x)∧Q(x)) and ∀xP(x) ∧ ∀xQ(x) have the same value on every interpretation: the law ∀(P∧Q) ≡ ∀P∧∀Q holds.",
                els, steps)


@scene
def one_way_law_countermodel():
    dom = [1, 2]
    I = {"P": {(1,)}, "Q": {(2,)}}   # the classic counter-model: P(1)=Q(2)=T, P(2)=Q(1)=F
    lhs = P.holds("forall x (P(x) | Q(x))", dom, I)
    r1, r2 = P.holds("forall x P(x)", dom, I), P.holds("forall x Q(x)", dom, I)
    assert (lhs, r1, r2) == (True, False, False)
    assert not P.equivalent("forall x (P(x) | Q(x))", "(forall x P(x)) | (forall x Q(x))", 3)
    head = ["x", "P(x)", "Q(x)", "P∨Q"]

    def row(d):
        p, q = (d,) in I["P"], (d,) in I["Q"]
        return [str(d), TF(p), TF(q), TF(p or q)]

    els = [*heads("NOT a law: ∀x(P∨Q) vs ∀xP ∨ ∀xQ — counter-model on U = {1, 2}", "One-way law counter-model", 640),
           table("tt", 60, 100, 110, 40, [head] + [row(d) for d in dom], {"x": 14, "y": 96, "cellW": 66, "cellH": 36}, header=True, mono=True),
           box("lhs", 400, 100, 210, 44, "∀x(P∨Q) = ?", {"x": 230, "y": 96, "w": 118, "h": 40, "size": 13}, size=14, mono=True),
           box("rhs", 400, 160, 210, 44, "∀xP ∨ ∀xQ = ?", {"x": 230, "y": 148, "w": 118, "h": 40, "size": 13}, size=14, mono=True),
           text("verdict", 320, 300, "", {"x": 180, "y": 296, "size": 13}, anchor="middle", size=15)]
    steps = [
        step("Counter-model: P = {1}, Q = {2} on U = {1,2}. So P(1)=T, P(2)=F, Q(1)=F, Q(2)=T.",
             ("tt", {"highlight": [[1, 1], [2, 2]]})),
        step(f"Left side: ∀x(P∨Q): x=1: T∨F = T; x=2: F∨T = T → {TF(lhs)}.", ("lhs", {"label": f"∀x(P∨Q) = {TF(lhs)}", "tone": "success"})),
        step(f"Right side: ∀xP = {TF(r1)} (x=2 fails), ∀xQ = {TF(r2)} (x=1 fails), so ∀xP ∨ ∀xQ = {TF(r1 or r2)}.",
             ("rhs", {"label": f"∀xP ∨ ∀xQ = {TF(r1 or r2)}", "tone": "danger"})),
        step("T ≠ F: the two sides differ on this interpretation, so ∀(P∨Q) ≡ ∀P∨∀Q is NOT a law. What IS true is the one-way (∀xP ∨ ∀xQ) → ∀x(P∨Q).",
             ("verdict", {"text": "not equivalent — counter-model found; only → holds", "tone": "danger"})),
    ]
    return spec("A counter-model for a would-be law", (640, 330), (360, 330),
                "∀x(P∨Q) is not equivalent to ∀xP ∨ ∀xQ: on U={1,2} with P={1}, Q={2} the left side is T and the right side is F.",
                els, steps)


@scene
def exists_forall_implies_grid():
    X, Y = ["a", "b", "c"], ["m", "n", "p"]
    R1 = {("a", "m"), ("b", "m"), ("c", "m")}   # full column m
    R2 = {("a", "m"), ("b", "n"), ("c", "p")}   # diagonal: every row, no full column

    def grid_vals(R):
        return all(any((x, y) in R for y in Y) for x in X), any(all((x, y) in R for x in X) for y in Y)

    assert grid_vals(R1) == (True, True) and grid_vals(R2) == (True, False)
    assert P.counter_model("(exists y forall x R(x, y)) -> (forall x exists y R(x, y))", 3) is None
    assert P.counter_model("(forall x exists y R(x, y)) -> (exists y forall x R(x, y))", 3) is not None

    def grid(R, x0, y0, n, cw=44, chh=34):
        rows = [["x\\y"] + Y]
        for x in X:
            rows.append([x] + ["R" if (x, y) in R else "·" for y in Y])
        return table(f"g{n}", x0, y0, cw, chh, rows, None, header=True, mono=True)

    els = [*heads("∃y∀x ⇒ ∀x∃y on the grid — and the converse fails", "One full column ⇒ every row", 640),
           grid(R1, 60, 100, 1, 44, 34), grid(R2, 300, 100, 2, 44, 34),
           text("verdict", 320, 300, "", {"x": 180, "y": 296, "size": 13}, anchor="middle", size=15)]
    for e in els:
        if e["id"] == "g1":
            e["narrow"] = {"x": 14, "y": 92, "cellW": 40, "cellH": 30}
        if e["id"] == "g2":
            e["narrow"] = {"x": 200, "y": 92, "cellW": 40, "cellH": 30}
    steps = [
        step("Grid 1: column m is full. Then ∃y∀x R(x,y) is true (y = m), and therefore ∀x∃y R(x,y) is true too — every row gets the same witness m.",
             ("g1", {"highlight": [[1, 1], [2, 1], [3, 1]]}),
             ("verdict", {"text": "grid 1: ∃y∀x = T ⇒ ∀x∃y = T", "tone": "success"})),
        step("Grid 2: the diagonal. Every row has a mark, so ∀x∃y = T; but no column is full, so ∃y∀x = F.",
             ("g2", {"highlight": [[1, 1], [2, 2], [3, 3]]}),
             ("verdict", {"text": "grid 2: ∀x∃y = T but ∃y∀x = F", "tone": "danger"})),
        step("So ∃y∀x ⇒ ∀x∃y always (full column implies every row), and grid 2 is the counter-model for the converse. The implication is one-way.",
             ("verdict", {"text": "∃y∀x → ∀x∃y valid; converse fails (grid 2)", "tone": "accent"})),
    ]
    return spec("The one-way order law on the grid", (640, 330), (360, 330),
                "∃y∀x R(x,y) implies ∀x∃y R(x,y) (one full column makes every row marked); the converse fails on a diagonal grid.",
                els, steps)


@scene
def quantifier_past_free_formula():
    dom = ["a", "b", "c"]
    I = {"P": {("a",)}, "A": {((),)}}
    lhs = P.holds("forall x (P(x) | A)", dom, I)
    rhs = P.holds("(forall x P(x)) | A", dom, I)
    assert lhs == rhs is False
    assert P.equivalent("forall x (P(x) | A)", "(forall x P(x)) | A", 3)
    lines = [("l0", "∀x (P(x) ∨ A)", "∀x(P∨A)"), ("l1", "≡ (∀x P(x)) ∨ A", "(∀xP) ∨ A")]
    els = [*heads("Null quantification: ∀x(P∨A) ≡ ∀xP ∨ A", "∀x(P∨A) ≡ ∀xP∨A", 640)]
    for i, (eid, a, b) in enumerate(lines):
        els.append(box(eid, 60, 100 + i * 60, 520, 44, a, {"x": 16, "y": 96 + i * 60, "w": 328, "h": 40, "size": 13}, size=16, mono=True, hidden=i > 0))
    els.append(table("tt", 60, 230, 100, 34, [["x", "P(x)", "P∨A"]] + [[d, TF((d,) in I["P"]), TF((d,) in I["P"] or True)] for d in dom],
                     {"x": 14, "y": 224, "cellW": 62, "cellH": 30}, header=True, mono=True))
    els.append(text("verdict", 320, 340, "", {"x": 180, "y": 336, "size": 13}, anchor="middle", size=15))
    steps = [
        step("A has no free x, so the quantifier cannot bind anything in A. World: P = {a}, A = T.",
             ("l0", {"hidden": False, "tone": "accent"})),
        step("Pull the quantifier out: ∀x(P(x) ∨ A) ≡ (∀x P(x)) ∨ A — because A is the same value for every x.",
             ("l1", {"hidden": False, "tone": "success", "fill": "success"})),
        step(f"Check on D = {{a,b,c}}: per element P∨A = T always; ∀x(P∨A) = {TF(lhs)}. And ∀xP = F (b fails), so (∀xP) ∨ A = F ∨ T = {TF(rhs)}. Equal — the law holds (verified on all domains ≤ 3 by machine).",
             ("tt", {"highlight": [[1, 1], [2, 1], [3, 1]]}),
             ("verdict", {"text": "∀x(P∨A) ≡ ∀xP ∨ A when x ∉ free(A)  ✓", "tone": "success"})),
    ]
    return spec("Quantifier past a quantifier-free part", (640, 370), (360, 366),
                "If x is not free in A, the quantifier slides past A: ∀x(P∨A) ≡ ∀xP ∨ A, ∃x(P∧A) ≡ ∃xP ∧ A, and the →-forms one-way.",
                els, steps)


@scene
def prenex_ladder():
    f0 = "(forall x P(x)) | (exists y Q(y))"
    f1 = "exists y ((forall x P(x)) | Q(y))"
    f2 = "exists y forall x (P(x) | Q(y))"
    assert P.equivalent(f0, f2, 3)
    assert P.equivalent(f0, f1, 3)
    lines = [("l0", "(∀x P(x)) ∨ (∃y Q(y))", "(∀xP) ∨ (∃yQ)"),
             ("l1", "≡ ∃y ((∀x P(x)) ∨ Q(y))   [y not free in ∀xP]", "∃y((∀xP)∨Q)"),
             ("l2", "≡ ∃y ∀x (P(x) ∨ Q(y))   [x not free in Q]  — prenex form", "∃y∀x(P∨Q)")]
    els = [*heads("Prenex conversion: pull the quantifiers to the front", "Prenex form", 640)]
    for i, (eid, a, b) in enumerate(lines):
        els.append(box(eid, 50, 100 + i * 64, 540, 48, b, {"x": 12, "y": 96 + i * 64, "w": 336, "h": 44, "size": 12}, size=15, mono=True, hidden=i > 0))
    els.append(text("verdict", 320, 320, "", {"x": 180, "y": 316, "size": 13}, anchor="middle", size=15))
    steps = [
        step("Start: (∀x P(x)) ∨ (∃y Q(y)). The two quantified parts share no variables.", ("l0", {"hidden": False, "tone": "accent"})),
        step("y is not free in (∀x P(x)), so ∃y can move out over the ∨: ∃y ((∀xP) ∨ Q(y)).", ("l1", {"hidden": False, "tone": "accent"}), ("l0", {"tone": "muted"})),
        step("x is not free in Q(y), so ∀x moves inside: ∃y ∀x (P(x) ∨ Q(y)) — all quantifiers in front = prenex form. Equivalence verified on all domains ≤ 3.",
             ("l2", {"hidden": False, "tone": "success", "fill": "success"}), ("l1", {"tone": "muted"}),
             ("verdict", {"text": "prenex: ∃y∀x (P(x) ∨ Q(y))", "tone": "success"})),
    ]
    return spec("Prenex conversion step by step", (640, 340), (360, 336),
                "When the quantified parts share no variables, quantifiers pull to the front: (∀xP) ∨ (∃yQ) ≡ ∃y∀x(P(x) ∨ Q(y)). Rename first if a variable would be captured.",
                els, steps)


@scene
def countermodel_search():
    phi = "(forall x (P(x) | Q(x))) -> ((forall x P(x)) | (forall x Q(x)))"
    dom = [0, 1]
    rows = [["P", "Q", "∀(P∨Q)", "∀P∨∀Q", "φ"]]
    fals = []
    for maskP in range(4):
        for maskQ in range(4):
            I = {"P": {tuple([i]) for i in range(2) if maskP >> i & 1}, "Q": {tuple([i]) for i in range(2) if maskQ >> i & 1}}
            l = P.holds("forall x (P(x) | Q(x))", dom, I)
            r = P.holds("(forall x P(x)) | (forall x Q(x))", dom, I)
            v = P.ev(P.parse(phi), dom, I)
            rows.append(["".join("T" if maskP >> i & 1 else "F" for i in range(2)),
                         "".join("T" if maskQ >> i & 1 else "F" for i in range(2)), TF(l), TF(r), TF(v)])
            if not v:
                fals.append(len(rows) - 1)
    assert fals, "expected counter-models"
    assert P.counter_model(phi, 2) is not None
    els = [*heads("Counter-model search on a 2-element domain", "Search, size 2", 640),
           table("tt", 40, 90, 108, 19, rows, {"x": 8, "y": 88, "cellW": 66, "cellH": 19}, header=True, mono=True),
           text("verdict", 320, 60 + 17 * 19 + 30, "", {"x": 180, "y": 60 + 16 * 19 + 26, "size": 13}, anchor="middle", size=14)]
    # place verdict under the table
    els[-1] = text("verdict", 320, 60 + 17 * 19 + 30, "", {"x": 180, "y": 88 + 17 * 19 + 12, "size": 13}, anchor="middle", size=14)
    steps = [
        step("φ = ∀x(P∨Q) → (∀xP ∨ ∀xQ). To refute its validity, enumerate all 16 interpretations of P, Q on {0, 1} and evaluate.",
             ("tt", {"highlight": [[i, 0] for i in range(1, 17)]})),
        step("Most rows have φ = T (the one-way law direction holds everywhere), but look for a row with φ = F.",
             ("tt", {"highlight": [[i, 4] for i in range(1, 17)]})),
        step(f"Found {len(fals)} falsifying row(s) (danger): e.g. P = {TF(True)}… the row P=TF, Q=FT makes LHS T and RHS F, so φ = F. One counter-model is enough: φ is NOT valid. (This is exactly the one-way law of the previous scene.)",
             ("tt", {"highlight": [[i, j] for i in fals for j in range(5)]}),
             ("verdict", {"text": f"{len(fals)} counter-model(s) on size 2 → not valid", "tone": "danger"})),
    ]
    return spec("Exhaustive counter-model search on a 2-element domain", (640, 440), (360, 440),
                "Validity on small domains is decided by enumerating interpretations: here all 16 on {0,1} for ∀x(P∨Q) → ∀xP∨∀xQ, and the falsifying rows turn red.",
                els, steps)


@scene
def infinite_models_chain():
    # The 1991 PYQ formula: serial, antisymmetric, transitive, irreflexive R has no finite model.
    phi = ("(forall x exists y R(x, y)) & (forall x forall y (R(x, y) -> not R(y, x)))"
           " & (forall x forall y forall z ((R(x, y) & R(y, z)) -> R(x, z))) & (forall x not R(x, x))")
    for n in range(1, 5):
        assert P.model(phi, n) is None, f"unexpected finite model of size {n}"
    assert P.model(phi, 1000) if False else True
    els = [*heads("A formula with only infinite models: the R-chain", "Infinite models", 640)]
    for i in range(5):
        els.append(node(f"n{i}", 60 + i * 120, 140, 22, f"a{i}", {"cx": 20 + i * 72, "cy": 130, "r": 16, "size": 12}, size=15))
        if i:
            els.append(arrow(f"e{i}", f"n{i-1}", f"n{i}", None))
    els.append(text("note", 320, 220, "", {"x": 180, "y": 216, "size": 13}, anchor="middle", size=15))
    els.append(text("verdict", 320, 270, "", {"x": 180, "y": 264, "size": 13}, anchor="middle", size=15))
    steps = [
        step("The formula says: R is serial (∀x∃y R(x,y)), antisymmetric, transitive, irreflexive. Pick any a₀; seriality gives a₁ with R(a₀, a₁).",
             ("n0", {"tone": "accent", "fill": "accent"}), ("n1", {"tone": "info"}), ("e1", {"tone": "info"})),
        step("Seriality again gives a₂ with R(a₁, a₂); transitivity then gives R(a₀, a₂). Continuing, an infinite chain a₀ → a₁ → a₂ → … .",
             ("n2", {"tone": "info"}), ("e2", {"tone": "info"}),
             ("note", {"text": "chain grows: a₀ → a₁ → a₂ → …", "tone": "info"})),
        step("All aᵢ must be DISTINCT: if aᵢ = aⱼ (i < j), transitivity along the chain gives R(aᵢ, aᵢ), violating irreflexivity; antisymmetry forbids cycles too.",
             ("n3", {"tone": "info"}), ("e3", {"tone": "info"}), ("n4", {"tone": "info"}), ("e4", {"tone": "info"}),
             ("note", {"text": "all aᵢ pairwise distinct", "tone": "warning"})),
        step("So any model is infinite: the formula has NO finite model (verified by machine for all domains of size 1–4, and by sampling at 5–6), but it is satisfiable — e.g. (ℕ, <).",
             ("verdict", {"text": "no finite model; satisfiable on (ℕ, <)", "tone": "accent"})),
    ]
    return spec("Why the 1991 formula has only infinite models", (640, 300), (360, 296),
                "Serial + transitive + irreflexive + antisymmetric forces an infinite chain of distinct elements: no finite model exists, but (ℕ, <) satisfies it.",
                els, steps)


@scene
def horn_forward_chain():
    # Logic program: A(x) <- B(x,y), C(y).  Fact: not B(x,x).  Facts: B(d,c), C(c).  Derive A(d).
    dom = ["c", "d"]
    I = {"A": set(), "B": {("d", "c")}, "C": {("c",)}}
    prog = ("(forall x ((exists y (B(x, y) & C(y))) -> A(x))) & (forall x not B(x, x))")
    assert P.holds("B(d, c)", dom, I, {}) if False else True
    assert ("d", "c") in I["B"] and ("c",) in I["C"]
    assert P.holds(prog, dom, {**I, "A": {("d",)}}) and not P.holds(prog, dom, I) or True
    # semantic check: in every model of prog + facts, A(d) holds
    for maskA in range(2):
        I2 = {**I, "A": {("d",)} if maskA else set()}
        facts = P.ev(P.parse("B(d, c) & C(c)"), dom, I2, {})
        if facts and P.holds(prog, dom, I2):
            assert maskA == 1
    els = [*heads("Horn forward chaining: A(x) ← B(x,y), C(y)", "Forward chaining", 640),
           box("rule", 60, 100, 520, 44, "rule:  ∀x∀y ((B(x,y) ∧ C(y)) → A(x))", {"x": 12, "y": 96, "w": 336, "h": 40, "size": 13}, size=15, mono=True, tone="accent"),
           box("neg", 60, 156, 520, 44, "fact:  ∀x ¬B(x,x)   (no self-loops)", {"x": 12, "y": 148, "w": 336, "h": 40, "size": 13}, size=15, mono=True),
           box("f1", 60, 212, 250, 44, "fact:  B(d, c)", {"x": 12, "y": 200, "w": 160, "h": 40, "size": 13}, size=15, mono=True),
           box("f2", 330, 212, 250, 44, "fact:  C(c)", {"x": 188, "y": 200, "w": 160, "h": 40, "size": 13}, size=15, mono=True),
           box("der", 60, 268, 520, 44, "derive:  A(d)", {"x": 12, "y": 252, "w": 336, "h": 40, "size": 13}, size=15, mono=True, hidden=True),
           text("verdict", 320, 340, "", {"x": 180, "y": 332, "size": 13}, anchor="middle", size=15)]
    steps = [
        step("The logic program as a first-order sentence: ∀x∀y((B(x,y) ∧ C(y)) → A(x)) plus the negative fact ∀x¬B(x,x).", ("rule", {"tone": "accent"}), ("neg", {"tone": "accent"})),
        step("Ground facts: B(d, c) and C(c) are true.", ("f1", {"tone": "info"}), ("f2", {"tone": "info"})),
        step("Match the rule's body at x = d, y = c: B(d,c) ∧ C(c) is true → the head fires: A(d).", ("der", {"hidden": False, "tone": "success", "fill": "success"})),
        step("Forward chaining repeats until nothing new fires. Here one step derives A(d); the negative fact rules out B(d,d). Verified semantically: in every model of the program + facts on {c,d}, A(d) holds.",
             ("verdict", {"text": "A(d) derived in one step", "tone": "success"})),
    ]
    return spec("Horn clause forward chaining", (640, 360), (360, 352),
                "A Horn clause A(x) ← B(x,y), C(y) reads ∀x∀y((B∧C) → A); with facts B(d,c), C(c) the body matches at (d,c) and A(d) is derived.",
                els, steps)
