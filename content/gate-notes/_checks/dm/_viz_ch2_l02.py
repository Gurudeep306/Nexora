"""Viz scenes for dm/02-predicate-logic/02-quantifier-laws-validity. Every truth value, counter-model,
witness and restricted structure shown is computed with predlib, so the scenes cannot drift from the
checked maths."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import predlib as P  # noqa: E402
from dmlib import arrow, box, el, heads, node, spec, step, table, text  # noqa: E402

SPECS = {}
TF = lambda b: "T" if b else "F"  # noqa: E731


def scene(fn):
    SPECS[fn.__name__.replace("_", "-")] = fn()
    return fn


def U(*xs):
    return {(x,) for x in xs}


def ev(f, n, I, env=None):
    return P.holds(f, list(range(n)), I, env)


@scene
def qlaw_countermodel_search():
    hyp, con = "forall x (P(x) | Q(x))", "(forall x P(x)) | (forall x Q(x))"
    f = f"({hyp}) -> ({con})"
    one = []
    for p in (False, True):
        for q in (False, True):
            I = {"P": U(0) if p else set(), "Q": U(0) if q else set()}
            one.append((p, q, ev(hyp, 1, I), ev(con, 1, I), ev(f, 1, I)))
    assert all(r[4] for r in one) and P.counter_model(f, 1) is None
    dom, I, _ = P.counter_model(f, 2)
    assert len(dom) == 2 and ev(hyp, 2, I) and not ev(con, 2, I)
    tried = 0
    for J in P.interpretations({"P": 1, "Q": 1}, [0, 1]):
        tried += 1
        if not ev(f, 2, J):
            break
    assert J == I
    total = sum(1 for _ in P.interpretations({"P": 1, "Q": 1}, [0, 1]))
    assert total == 16
    head1 = ["P(0)", "Q(0)", "∀(P∨Q)", "∀P∨∀Q", "→"]
    rows1 = [head1] + [[TF(a), TF(b), TF(c), TF(d), TF(e)] for a, b, c, d, e in one]
    rows2 = [["x", "P(x)", "Q(x)", "P∨Q"]] + [[str(x), TF((x,) in I["P"]), TF((x,) in I["Q"]), TF((x,) in I["P"] or (x,) in I["Q"])] for x in dom]
    els = [*heads("Searching for a counter-model, smallest domain first", "Counter-model search", 640),
           text("f", 320, 52, "∀x(P(x) ∨ Q(x)) → (∀x P(x) ∨ ∀x Q(x))", {"x": 180, "y": 50, "size": 13}, anchor="middle", size=16, mono=True),
           table("t1", 70, 70, 100, 30, rows1, {"x": 15, "y": 66, "cellW": 66, "cellH": 28}, header=True, mono=True),
           table("t2", 170, 70, 75, 34, rows2, {"x": 30, "y": 66, "cellW": 75, "cellH": 32}, header=True, mono=True, hidden=True),
           text("note", 320, 262, "", {"x": 180, "y": 250, "size": 12}, anchor="middle", size=15, tone="muted")]
    steps = [
        step("Size 1: the domain {0}. There are 4 interpretations (P(0) and Q(0) each T or F). In every one the implication is true: on one element, 'each is P or Q' already means 'all P or all Q'.",
             ("t1", {"highlight": [[i, 4] for i in range(1, 5)]}), ("note", {"text": "size 1: no counter-model (4 of 4 pass)", "tone": "muted"})),
        step(f"Size 2: {total} interpretations of P and Q on {{0, 1}}. The search tries them in order and the {tried}th is the first that makes the formula false.",
             ("t1", {"hidden": True}), ("t2", {"hidden": False}), ("note", {"text": f"size 2: counter-model at try {tried} of {total}", "tone": "accent"})),
        step("Check the hypothesis in that world: element 0 has P, element 1 has Q, so every element has P or Q. ∀x(P(x) ∨ Q(x)) is T.",
             ("t2", {"highlight": [[1, 3], [2, 3]]}), ("note", {"text": "hypothesis ∀x(P ∨ Q): T", "tone": "success"})),
        step("Check the conclusion: P fails at 1 and Q fails at 0, so ∀x P(x) and ∀x Q(x) are both F, and so is their disjunction.",
             ("t2", {"highlight": [[2, 1], [1, 2]]}), ("note", {"text": "conclusion ∀P ∨ ∀Q: F", "tone": "danger"})),
        step("T → F: one counter-model, so the formula is not valid. Had sizes 1–3 all passed, we would have learned nothing about validity: only a proof shows that.",
             ("note", {"text": "counter-model found: NOT valid", "tone": "danger"})),
    ]
    return spec("Counter-model search on tiny domains", (640, 280), (360, 270),
                "To refute a law, try every interpretation on a 1-element domain, then a 2-element one. Here the split world P = {0}, Q = {1} appears on size 2.",
                els, steps)


@scene
def qlaw_expansion():
    I = {"P": U(0, 1), "Q": U(1, 2)}
    n = 3
    names = "abc"
    vals = [(x, (x,) in I["P"], (x,) in I["Q"]) for x in range(n)]
    allPQ, aP, aQ = ev("forall x (P(x) & Q(x))", n, I), ev("forall x P(x)", n, I), ev("forall x Q(x)", n, I)
    exPQ, eP, eQ = ev("exists x (P(x) | Q(x))", n, I), ev("exists x P(x)", n, I), ev("exists x Q(x)", n, I)
    aOr = ev("forall x (P(x) | Q(x))", n, I)
    assert allPQ == (aP and aQ) and exPQ == (eP or eQ)
    assert aOr and not (aP or aQ) and not allPQ
    rows = [["x", "P(x)", "Q(x)", "P∧Q", "P∨Q"]] + [[names[x], TF(p), TF(q), TF(p and q), TF(p or q)] for x, p, q in vals]
    els = [*heads("∀ is a long AND, ∃ is a long OR", "∀ = big AND, ∃ = big OR", 640),
           table("t", 120, 46, 80, 30, rows, {"x": 30, "y": 44, "cellW": 60, "cellH": 28}, header=True, mono=True),
           text("l1", 320, 196, "", {"x": 180, "y": 186, "size": 12}, anchor="middle", size=15, mono=True),
           text("l2", 320, 224, "", {"x": 180, "y": 210, "size": 12}, anchor="middle", size=15, mono=True),
           text("l3", 320, 252, "", {"x": 180, "y": 236, "size": 12}, anchor="middle", size=15, tone="muted")]
    col = lambda c: [[r, c] for r in range(1, n + 1)]  # noqa: E731
    steps = [
        step("On the domain {a, b, c}, ∀x(P(x) ∧ Q(x)) is the AND of the P∧Q column: F ∧ T ∧ F.",
             ("t", {"highlight": col(3)}), ("l1", {"text": f"∀x(P∧Q) = (P∧Q)(a)∧(P∧Q)(b)∧(P∧Q)(c) = {TF(allPQ)}"})),
        step("An AND of ANDs regroups: the same six atoms, sorted into the P column and the Q column. So ∀x(P ∧ Q) ≡ ∀x P ∧ ∀x Q.",
             ("t", {"highlight": col(1) + col(2)}), ("l2", {"text": f"∀xP ∧ ∀xQ = {TF(aP)} ∧ {TF(aQ)} = {TF(aP and aQ)}"}),
             ("l3", {"text": "∀ distributes over ∧ (both ways)", "tone": "success"})),
        step("Likewise ∃x(P ∨ Q) is the OR of the P∨Q column, and an OR of ORs regroups into ∃x P ∨ ∃x Q.",
             ("t", {"highlight": col(4)}), ("l1", {"text": f"∃x(P∨Q) = {TF(exPQ)}"}), ("l2", {"text": f"∃xP ∨ ∃xQ = {TF(eP)} ∨ {TF(eQ)} = {TF(eP or eQ)}"}),
             ("l3", {"text": "∃ distributes over ∨ (both ways)", "tone": "success"})),
        step("A mixture does not regroup. ∀x(P ∨ Q) is an AND of ORs: the P∨Q column is all T. But neither the P column nor the Q column is all T.",
             ("t", {"highlight": col(4) + [[3, 1], [1, 2]]}), ("l1", {"text": f"∀x(P∨Q) = {TF(aOr)}"}), ("l2", {"text": f"∀xP ∨ ∀xQ = {TF(aP)} ∨ {TF(aQ)} = {TF(aP or aQ)}"}),
             ("l3", {"text": "∀ over ∨: only ∀P ∨ ∀Q ⇒ ∀(P ∨ Q)", "tone": "danger"})),
    ]
    return spec("Quantifiers as long connectives", (640, 270), (360, 256),
                "Over a finite domain, ∀ is an AND and ∃ an OR of one instance per element. The two-way laws are regroupings; the one-way laws are where regrouping fails.",
                els, steps)


@scene
def qlaw_one_way():
    laws = [
        ("a", "∀A ∨ ∀B ⇒ ∀(A ∨ B)", "(forall x A(x)) | (forall x B(x))", "forall x (A(x) | B(x))", {"A": U(0), "B": U(1)}, "A={0}, B={1}"),
        ("b", "∃(A ∧ B) ⇒ ∃A ∧ ∃B", "exists x (A(x) & B(x))", "(exists x A(x)) & (exists x B(x))", {"A": U(0), "B": U(1)}, "A={0}, B={1}"),
        ("c", "∀(A → B) ⇒ (∀A → ∀B)", "forall x (A(x) -> B(x))", "(forall x A(x)) -> (forall x B(x))", {"A": U(0), "B": set()}, "A={0}, B=∅"),
        ("d", "∀(A → B) ⇒ (∃A → ∃B)", "forall x (A(x) -> B(x))", "(exists x A(x)) -> (exists x B(x))", {"A": U(0), "B": U(1)}, "A={0}, B={1}"),
        ("e", "∀(A ↔ B) ⇒ (∀A ↔ ∀B)", "forall x (A(x) <-> B(x))", "(forall x A(x)) <-> (forall x B(x))", {"A": U(0), "B": U(1)}, "A={0}, B={1}"),
        ("f", "(∃A → ∀B) ⇒ ∀(A → B)", "(exists x A(x)) -> (forall x B(x))", "forall x (A(x) -> B(x))", {"A": U(0), "B": U(0)}, "A=B={0}"),
        ("g", "∀A ⇒ ∃A", "forall x A(x)", "exists x A(x)", {"A": U(0)}, "A={0}"),
    ]
    for _, _, s, w, world, _ in laws:
        assert P.valid(f"({s}) -> ({w})", 3)
        assert ev(w, 2, world) and not ev(s, 2, world)
    els = [*heads("Each one-way law, and the world that blocks its converse", "One-way laws and counter-models", 640),
           text("cap", 320, 50, "domain {0, 1}; the world makes the right side T and the left side F", "wide", anchor="middle", size=14, tone="muted"),
           text("capn", 180, 48, "domain {0, 1}: right side T, left side F", "narrow", anchor="middle", size=12, tone="muted")]
    for i, (k, lab, *_r, wl) in enumerate(laws):
        y, yn = 66 + i * 42, 62 + i * 40
        els.append(box(f"law{k}", 30, y, 300, 34, lab, {"x": 6, "y": yn, "w": 196, "h": 32, "size": 12}, size=15, mono=True))
        els.append(box(f"w{k}", 345, y, 160, 34, wl, {"x": 208, "y": yn, "w": 146, "h": 32, "size": 12}, size=14, mono=True, hidden=True))
        els.append(text(f"v{k}", 515, y + 22, "", "wide", size=14, hidden=True))
    caps = {
        "a": "(a) If one predicate holds everywhere, the disjunction does. Converse: 0 has A, 1 has B, so ∀(A ∨ B) is T, but neither ∀A nor ∀B.",
        "b": "(b) A common witness witnesses each part. Converse: ∃A and ∃B are T (0 and 1), but no element has both.",
        "c": "(c) Modus ponens at every element. Converse: ∀A is F, so ∀A → ∀B is vacuously T; but A(0) → B(0) is T → F.",
        "d": "(d) A witness of A is carried to a witness of B. Converse: ∃A → ∃B is T → T, yet A(0) → B(0) fails.",
        "e": "(e) Apply (c) both ways. Converse: ∀A and ∀B are both F, so ∀A ↔ ∀B is T; but A(0) ↔ B(0) is F.",
        "f": "(f) If one A forces all B, each A forces its own B. Converse: ∀(A → B) is T, but ∃A is T and ∀B is F.",
        "g": "(g) Pick any element (domains are non-empty). Converse: ∃A is T at 0, ∀A is F at 1.",
    }
    steps = []
    for k, *_ in laws:
        steps.append(step(caps[k], (f"law{k}", {"tone": "success", "fill": "success"}), (f"w{k}", {"hidden": False, "tone": "danger"}),
                          (f"v{k}", {"hidden": False, "text": "converse ✗", "tone": "danger"})))
    return spec("One-way laws with their counter-models", (640, 370), (360, 350),
                "Each law goes from a strong statement to a weak one. A two-element world with the properties split refutes every converse.",
                els, steps)


@scene
def qlaw_null_flip():
    ladder = ["∀x (p(x) → W)", "∀x (¬p(x) ∨ W)", "(∀x ¬p(x)) ∨ W", "¬∃x p(x) ∨ W", "∃x p(x) → W"]
    forms = ["forall x (p(x) -> W)", "forall x (~p(x) | W)", "(forall x ~p(x)) | W", "~(exists x p(x)) | W", "(exists x p(x)) -> W"]
    for a in forms[1:]:
        assert P.equivalent(forms[0], a)
    wrong = "(forall x p(x)) -> W"
    world = {"p": U(0), "W": set()}
    vals = [ev(f, 2, world) for f in forms]
    vw = ev(wrong, 2, world)
    assert vals == [False] * 5 and vw is True and not P.equivalent(forms[0], wrong)
    els = [*heads("Moving ∀ out of a hypothesis flips it to ∃", "Out of a hypothesis, ∀ flips", 640)]
    whys = ["", "X → Y ≡ ¬X ∨ Y", "∀ passes W (no x) in ∨", "De Morgan: ∀¬ ≡ ¬∃", "¬X ∨ Y ≡ X → Y"]
    for i, (lab, why) in enumerate(zip(ladder, whys)):
        els.append(box(f"r{i}", 40, 48 + i * 50, 250, 38, lab, {"x": 10, "y": 46 + i * 46, "w": 190, "h": 36, "size": 13}, size=16, mono=True, hidden=i > 0))
        if why:
            els.append(text(f"y{i}", 305, 72 + i * 50, why, {"x": 206, "y": 69 + i * 46, "size": 11}, size=14, tone="muted", hidden=True))
    els += [box("bad", 380, 48, 230, 38, "∀x p(x) → W", {"x": 10, "y": 286, "w": 190, "h": 36, "size": 13}, size=16, mono=True, hidden=True),
            text("world", 320, 318, "", {"x": 180, "y": 342, "size": 12}, anchor="middle", size=15, tone="muted")]
    steps = [
        step("Remove the arrow: p(x) → W is ¬p(x) ∨ W. The hypothesis is now visibly negated.",
             ("r1", {"hidden": False}), ("y1", {"hidden": False})),
        step("W has no free x, so ∀x passes it in a disjunction: ∀x(¬p(x) ∨ W) ≡ (∀x ¬p(x)) ∨ W.",
             ("r2", {"hidden": False}), ("y2", {"hidden": False})),
        step("De Morgan for quantifiers: ∀x ¬p(x) is ¬∃x p(x). This is where the ∀ turns into an ∃.",
             ("r3", {"hidden": False, "tone": "accent"}), ("y3", {"hidden": False})),
        step("Put the arrow back: ¬∃x p(x) ∨ W is ∃x p(x) → W. One p is enough to force W.",
             ("r4", {"hidden": False, "tone": "success", "fill": "success"}), ("y4", {"hidden": False})),
        step("The tempting answer keeps ∀: ∀x p(x) → W (GATE 2020, option C). Test it in the world D = {0, 1}, p = {0}, W = F.",
             ("bad", {"hidden": False, "tone": "danger"}), ("world", {"text": "world: D = {0, 1}, p = {0}, W = F"})),
        step(f"Every rung of the ladder is {TF(vals[0])} there (at x = 0, p(0) → W is T → F), but ∀x p(x) → W is F → F = {TF(vw)}. Not equivalent.",
             ("bad", {"fill": "danger"}), ("world", {"text": f"ladder: {TF(vals[0])}   tempting form: {TF(vw)}", "tone": "danger"})),
    ]
    return spec("Null quantification: the flip", (640, 336), (360, 356),
                "Rewrite the implication as a disjunction, move the quantifier past W, and De Morgan does the flip.",
                els, steps)


@scene
def qlaw_swap_grid():
    n = 3

    def rel(g):
        return {"R": {(x, y) for x in range(n) for y in range(n) if g[x][y]}}
    full_col = [[0, 1, 0], [1, 1, 0], [0, 1, 1]]
    cyc = [[0, 1, 0], [0, 0, 1], [1, 0, 0]]
    AE, EA = "forall x exists y R(x, y)", "exists y forall x R(x, y)"
    a1, e1 = ev(AE, n, rel(full_col)), ev(EA, n, rel(full_col))
    a2, e2 = ev(AE, n, rel(cyc)), ev(EA, n, rel(cyc))
    assert (a1, e1, a2, e2) == (True, True, True, False)
    assert P.valid(f"({EA}) -> ({AE})", 3) and not P.valid(f"({AE}) -> ({EA})", 2)
    col = next(y for y in range(n) if all(full_col[x][y] for x in range(n)))
    wit = [next(y for y in range(n) if cyc[x][y]) for x in range(n)]
    assert col == 1 and wit == [1, 2, 0] and len(set(wit)) == n
    g = lambda m: [[str(v) for v in r] for r in m]  # noqa: E731
    els = [*heads("Rows x, columns y: a full column versus a 1 in every row", "∃y∀x versus ∀x∃y", 640),
           el("grid", "grid", {"x": 110, "y": 64, "cell": 46}, x=280, y=66, rows=3, cols=3, cell=50, values=g(full_col), mono=True),
           *[text(f"c{i}", 305 + 50 * i, 60, f"y={i}", {"x": 133 + 46 * i, "y": 58, "size": 12}, anchor="middle", size=13, tone="muted") for i in range(3)],
           *[text(f"r{i}", 270, 96 + 50 * i, f"x={i}", {"x": 104, "y": 92 + 46 * i, "size": 12}, anchor="end", size=13, tone="muted") for i in range(3)],
           text("ae", 320, 262, "", {"x": 180, "y": 238, "size": 13}, anchor="middle", size=15, mono=True),
           text("ea", 320, 288, "", {"x": 180, "y": 262, "size": 13}, anchor="middle", size=15, mono=True),
           text("foot", 320, 314, "", {"x": 180, "y": 288, "size": 12}, anchor="middle", size=14, tone="muted")]
    steps = [
        step(f"This R has a full column, y = {col}: every x is related to it. So ∃y∀x R(x, y) is T.",
             ("grid", {"highlight": [[x, col] for x in range(n)]}), ("ea", {"text": f"∃y∀x R(x, y) = {TF(e1)}", "tone": "success"})),
        step("The same column puts a 1 in every row, so every x has a partner: ∀x∃y R(x, y) is T. That is the proof of ∃y∀x ⇒ ∀x∃y: reuse the one witness for every x.",
             ("ae", {"text": f"∀x∃y R(x, y) = {TF(a1)}", "tone": "success"})),
        step("Now a cyclic relation: each row still has exactly one 1, so ∀x∃y R(x, y) stays T, with a different partner for each x.",
             ("grid", {"values": g(cyc), "highlight": [[x, wit[x]] for x in range(n)]}), ("ae", {"text": f"∀x∃y R(x, y) = {TF(a2)}"}),
             ("ea", {"text": "∃y∀x R(x, y) = ?", "tone": "ink"})),
        step(f"But no column is full: the partners are y = {wit[0]}, {wit[1]}, {wit[2]}, all different. So ∃y∀x R(x, y) is F, and ∀x∃y ⇒ ∃y∀x fails.",
             ("ea", {"text": f"∃y∀x R(x, y) = {TF(e2)}", "tone": "danger"}), ("foot", {"text": "the witness depends on x: no master key", "tone": "danger"})),
    ]
    return spec("The ∃∀ ⇒ ∀∃ grid", (640, 330), (360, 300),
                "A relation drawn as a 0/1 grid. ∃y∀x asks for a full column; ∀x∃y asks for a 1 in every row.",
                els, steps)


@scene
def qlaw_successor_chain():
    chain = [(0, 1), (1, 2), (2, 3), (3, 1)]
    R = set(chain)
    assert all(any((x, y) in R for y in range(4)) for x in range(4)) and all((x, x) not in R for x in range(4))
    clo = set(R)
    while True:
        new = {(a, d) for a, b in clo for c, d in clo if b == c} - clo
        if not new:
            break
        clo |= new
    assert (1, 1) in clo and (0, 0) not in clo and (1, 3) in clo
    PHI = ("(forall x exists y R(x, y)) & (forall x forall y (R(x, y) -> ~R(y, x))) & "
           "(forall x forall y forall z (R(x, y) & R(y, z) -> R(x, z))) & (forall x ~R(x, x))")
    assert P.model(PHI, 4) is None
    xs, nxs = [90, 230, 370, 510], [40, 133, 226, 319]
    els = [*heads("Why a serial strict order cannot live in a finite world", "No finite model (GATE 1991)", 640)]
    for i in range(4):
        els.append(node(f"n{i}", xs[i], 120, 26, f"a{i}", {"cx": nxs[i], "cy": 110, "r": 20, "size": 13}, size=15, mono=True))
    els += [arrow("e01", "n0", "n1", None, hidden=True), arrow("e12", "n1", "n2", None, hidden=True),
            arrow("e23", "n2", "n3", None, hidden=True), arrow("e31", "n3", "n1", {"curve": 0.5}, curve=0.4, hidden=True, tone="warning"),
            arrow("e13", "n1", "n3", {"curve": -0.5}, curve=-0.4, hidden=True, dashed=True, tone="danger"),
            text("note", 320, 250, "4 elements: is R serial, transitive, irreflexive?", {"x": 180, "y": 236, "size": 12}, anchor="middle", size=15, tone="muted"),
            text("note2", 320, 278, "", {"x": 180, "y": 262, "size": 12}, anchor="middle", size=15)]
    steps = [
        step("Start anywhere, a0. Seriality gives a successor a1 ≠ a0 (irreflexivity forbids a0 → a0).",
             ("e01", {"hidden": False})),
        step("Keep going: a1 → a2 and a2 → a3. Transitivity already forces a0 → a2, a0 → a3, a1 → a3, so no element can point back to an earlier one without trouble.",
             ("e12", {"hidden": False}), ("e23", {"hidden": False})),
        step("a3 needs a successor too. There are only 4 elements and a3 → a3 is forbidden, so it must point back to one already visited, say a1.",
             ("e31", {"hidden": False}), ("note", {"text": "pigeonhole: the chain must revisit an element", "tone": "warning"})),
        step("Transitivity along the loop: a1 → a3 (from a1 → a2 → a3) and a3 → a1 give a1 → a1. Irreflexivity is violated.",
             ("e13", {"hidden": False}), ("n1", {"tone": "danger", "fill": "danger"}), ("note2", {"text": "R(a1, a1): contradiction", "tone": "danger"})),
        step("The same happens on every finite domain (an exhaustive search on sizes 1–4 finds no model). In ℕ with <, the chain 0 → 1 → 2 → … never needs to come back.",
             ("note", {"text": "finite: impossible   (ℕ, <): a model", "tone": "success"})),
    ]
    return spec("Following successors in a finite world", (640, 296), (360, 280),
                "A serial, transitive, irreflexive relation on a finite set leads to a contradiction: the successor chain has to loop.",
                els, steps)


@scene
def qlaw_small_model():
    BS = "exists s exists t exists u forall v forall w (R(s, t) & R(t, u) & s != u & (R(v, w) -> ~R(w, v)))"
    body = "forall v forall w (R(s, t) & R(t, u) & s != u & (R(v, w) -> ~R(w, v)))"
    M = {"R": {(i, j) for i in range(7) for j in range(7) if i < j}}
    assert P.holds(BS, list(range(7)), M)
    wit = (2, 4, 6)
    assert P.holds(body, list(range(7)), M, dict(zip("stu", wit)))
    E = list(wit)
    Mr = {"R": {t for t in M["R"] if all(a in E for a in t)}}
    assert Mr["R"] == {(2, 4), (4, 6), (2, 6)}
    assert P.holds(body, E, Mr, dict(zip("stu", wit))) and P.holds(BS, E, Mr)
    xs = [50 + 90 * i for i in range(7)]
    nx = [24 + 52 * i for i in range(7)]
    els = [*heads("Keep the witnesses, drop the rest (GATE 2018)", "Shrinking an ∃*∀* model", 640),
           text("f", 320, 50, "∃s∃t∃u ∀v∀w (R(s,t) ∧ R(t,u) ∧ s≠u ∧ (R(v,w) → ¬R(w,v)))", "wide", anchor="middle", size=13, mono=True),
           text("fn", 180, 48, "∃s∃t∃u∀v∀w(R(s,t)∧R(t,u)∧s≠u∧(R(v,w)→¬R(w,v)))", "narrow", anchor="middle", size=11, mono=True)]
    for i in range(7):
        els.append(node(f"n{i}", xs[i], 120, 22, str(i), {"cx": nx[i], "cy": 110, "r": 18, "size": 13}, size=15, mono=True))
    lab = {2: "s", 4: "t", 6: "u"}
    for i in wit:
        els.append(text(f"l{i}", xs[i], 166, lab[i], {"x": nx[i], "y": 146, "size": 13}, anchor="middle", size=15, hidden=True, tone="accent"))
    els += [arrow("a24", "n2", "n4", {"curve": -0.4}, curve=-0.35, hidden=True), arrow("a46", "n4", "n6", {"curve": -0.4}, curve=-0.35, hidden=True),
            arrow("a26", "n2", "n6", {"curve": 0.5}, curve=0.4, hidden=True),
            text("note", 320, 236, "a model with 7 elements: R is < on 0…6", {"x": 180, "y": 226, "size": 12}, anchor="middle", size=15, tone="muted"),
            text("note2", 320, 264, "", {"x": 180, "y": 252, "size": 12}, anchor="middle", size=15)]
    steps = [
        step("In this 7-element world the sentence is true: for example s = 2, t = 4, u = 6 are witnesses (2 < 4, 4 < 6, 2 ≠ 6, and < is asymmetric).",
             *[(f"l{i}", {"hidden": False}) for i in wit], *[(f"n{i}", {"tone": "accent", "fill": "accent"}) for i in wit]),
        step("Send everyone else home: keep only {2, 4, 6}, and keep exactly the pairs of R that lie inside this set.",
             *[(f"n{i}", {"opacity": 0.25}) for i in range(7) if i not in wit],
             ("a24", {"hidden": False}), ("a46", {"hidden": False}), ("a26", {"hidden": False}),
             ("note", {"text": "restricted R = {(2,4), (4,6), (2,6)}", "tone": "accent"})),
        step("The ∃ part survives: the witnesses are still present, and R(2, 4), R(4, 6), 2 ≠ 6 are the same atoms as before.",
             ("note2", {"text": "witnesses kept: ∃s∃t∃u still true", "tone": "success"})),
        step("The ∀ part survives: every choice of v, w from {2, 4, 6} was already one of the choices in the big world, and a quantifier-free body without functions only looks at those elements.",
             ("note2", {"text": "fewer cases for ∀v∀w: still true", "tone": "success"})),
        step("So a model with at most 3 elements exists (GATE 2018, option A). With function symbols, or a ∀ before an ∃, a needed element could be outside the kept set.",
             ("note", {"text": "model of size 3 ≤ number of ∃", "tone": "success"})),
    ]
    return spec("The small-model property", (640, 280), (360, 270),
                "A model of an ∃∃∃∀∀ sentence without functions, restricted to its three witnesses, is still a model.",
                els, steps)
