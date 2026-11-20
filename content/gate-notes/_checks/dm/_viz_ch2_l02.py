"""Viz scenes for dm/02-predicate-logic/02-quantifier-laws-validity. Truth values come from predlib on the
scene's own worlds (and the counter-model search uses predlib's own enumeration order)."""
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


def setstr(S):
    return "{" + ", ".join(str(t[0] + 1) for t in sorted(S)) + "}" if S else "∅"


@scene
def model_search():
    f = "(forall x (P(x) | Q(x))) -> ((forall x P(x)) | (forall x Q(x)))"
    dom = [0, 1]
    rows, hit = [], None
    for I in P.interpretations({"P": 1, "Q": 1}, dom):
        lhs = P.holds("forall x (P(x) | Q(x))", dom, I)
        rhs = P.holds("(forall x P(x)) | (forall x Q(x))", dom, I)
        whole = P.holds(f, dom, I)
        assert whole == ((not lhs) or rhs)
        rows.append([setstr(I["P"]), setstr(I["Q"]), TF(lhs), TF(rhs), TF(whole)])
        if not whole:
            hit = len(rows)
            break
    assert hit is not None and hit <= 8
    head = ["P", "Q", "∀(P∨Q)", "∀P ∨ ∀Q", "→"]

    def tab(k):
        return [head] + rows[:k] + [["", "", "", "", ""]] * (hit - k)
    els = [*heads("Searching every world on {1, 2} for a counter-model", "Counter-model search on {1, 2}", 640),
           table("t", 60, 46, 104, 30, tab(0), {"x": 4, "y": 44, "cellW": 70, "cellH": 28}, header=True, mono=True),
           text("v", 320, 46 + (hit + 1) * 30 + 30, "", {"x": 180, "y": 44 + (hit + 1) * 28 + 28, "size": 12}, anchor="middle", size=15)]
    steps = [step("Formula: ∀x (P(x) ∨ Q(x)) → (∀x P(x) ∨ ∀x Q(x)). With two elements, P and Q each have 4 possible extensions: 16 worlds. We try them in order.",
                  ("t", {"highlight": []}))]
    for k in range(1, hit + 1):
        r = rows[k - 1]
        last = k == hit
        cap = (f"World P = {r[0]}, Q = {r[1]}: the hypothesis is {r[2]}, the conclusion {r[3]}, so the implication is {r[4]}."
               + (" A counter-model: the search stops." if last else " Not a counter-model; next world."))
        steps.append(step(cap, ("t", {"rows": tab(k), "highlight": [[k, 4]] if not last else [[k, j] for j in range(5)]}),
                          *([("v", {"text": f"counter-model: P = {r[0]}, Q = {r[1]}  →  not valid", "tone": "danger"})] if last else [])))
    steps.append(step("One counter-model is enough to show the formula is not valid. Note the shape: P and Q take turns, so ‘each element is P or Q’ is true while neither holds everywhere.",
                      ("v", {"text": "P and Q take turns: the classic counter-model", "tone": "accent"})))
    return spec("Finding a counter-model", (640, 46 + (hit + 1) * 30 + 52), (360, 44 + (hit + 1) * 28 + 44),
                "A validity question can be refuted by one world. Here the search runs through the worlds on {1, 2} in order until the formula fails.",
                els, steps)


def two_world(title_w, title_n, lines, cap_intro, steps_spec, name):
    """Domain {1, 2} with P true at 1 and Q true at 2, and a list of (formula, value) lines evaluated in turn."""
    dom = [0, 1]
    I = {"P": {(0,)}, "Q": {(1,)}}
    els = [*heads(title_w, title_n, 640)]
    for k in dom:
        x, nx = 70 + k * 150, 40 + k * 150
        els.append(node(f"d{k}", x + 40, 92, 34, str(k + 1), {"cx": nx + 40, "cy": 86, "r": 30}, size=20, mono=True))
        els.append(box(f"p{k}", x, 136, 80, 30, "P " + TF(k == 0), {"x": nx, "y": 126, "w": 80, "h": 28, "size": 13}, size=14, mono=True,
                       tone="success" if k == 0 else "muted"))
        els.append(box(f"q{k}", x, 172, 80, 30, "Q " + TF(k == 1), {"x": nx, "y": 158, "w": 80, "h": 28, "size": 13}, size=14, mono=True,
                       tone="success" if k == 1 else "muted"))
    for i, (f, _) in enumerate(lines):
        els.append(box(f"f{i}", 380, 60 + i * 48, 236, 38, f, {"x": 20, "y": 200 + i * 44, "w": 320, "h": 36, "size": 13}, size=14, mono=True, hidden=True))
    steps = [step(cap_intro, ("d0", {"tone": "accent"}), ("d1", {"tone": "accent"}))]
    for i, ((f, src), cap) in enumerate(zip(lines, steps_spec)):
        v = P.holds(src, dom, I)
        steps.append(step(cap, (f"f{i}", {"hidden": False, "label": f"{f} = {TF(v)}", "tone": "success" if v else "danger", "fill": "success" if v else "danger"})))
    return els, steps


@scene
def forall_or_counter():
    lines = [("∀x (P ∨ Q)", "forall x (P(x) | Q(x))"), ("∀x P", "forall x P(x)"), ("∀x Q", "forall x Q(x)"), ("∀x P ∨ ∀x Q", "(forall x P(x)) | (forall x Q(x))")]
    caps = ["Element 1 is P, element 2 is Q: every element is P or Q, so ∀x (P ∨ Q) is true.",
            "But element 2 is not P, so ∀x P is false.",
            "And element 1 is not Q, so ∀x Q is false.",
            "So ∀x P ∨ ∀x Q is false: ∀ does not distribute over ∨. Only the direction ∀P ∨ ∀Q → ∀(P ∨ Q) is valid."]
    els, steps = two_world("∀ over ∨ fails: P and Q take turns", "∀ over ∨ fails", lines,
                           "A world with two elements: P is true only at 1, Q only at 2.", caps, "forall-or-counter")
    assert P.valid("((forall x P(x)) | (forall x Q(x))) -> forall x (P(x) | Q(x))")
    return spec("Why ∀x (P ∨ Q) does not give ∀x P ∨ ∀x Q", (640, 264), (360, 380),
                "The turn-taking world: P holds at 1, Q at 2. Each element is covered, but neither predicate covers everything.", els, steps)


@scene
def exists_and_counter():
    lines = [("∃x P", "exists x P(x)"), ("∃x Q", "exists x Q(x)"), ("∃x P ∧ ∃x Q", "(exists x P(x)) & (exists x Q(x))"), ("∃x (P ∧ Q)", "exists x (P(x) & Q(x))")]
    caps = ["Element 1 is a witness for ∃x P.", "Element 2 is a witness for ∃x Q.",
            "So ∃x P ∧ ∃x Q is true, with two different witnesses.",
            "But no single element is both P and Q, so ∃x (P ∧ Q) is false: ∃ does not distribute over ∧. Only ∃(P ∧ Q) → ∃P ∧ ∃Q is valid."]
    els, steps = two_world("∃ over ∧ fails: two witnesses are not one", "∃ over ∧ fails", lines,
                           "The same world: P at 1 only, Q at 2 only.", caps, "exists-and-counter")
    assert P.valid("exists x (P(x) & Q(x)) -> ((exists x P(x)) & (exists x Q(x)))")
    return spec("Why ∃x P ∧ ∃x Q does not give ∃x (P ∧ Q)", (640, 264), (360, 380),
                "The same turn-taking world shows the second classic wrong law.", els, steps)


@scene
def law_map():
    laws = [("∀x (P ∧ Q)", "∀x P ∧ ∀x Q", "forall x (P(x) & Q(x))", "(forall x P(x)) & (forall x Q(x))"),
            ("∃x (P ∨ Q)", "∃x P ∨ ∃x Q", "exists x (P(x) | Q(x))", "(exists x P(x)) | (exists x Q(x))"),
            ("∀x P ∨ ∀x Q", "∀x (P ∨ Q)", "(forall x P(x)) | (forall x Q(x))", "forall x (P(x) | Q(x))"),
            ("∃x (P ∧ Q)", "∃x P ∧ ∃x Q", "exists x (P(x) & Q(x))", "(exists x P(x)) & (exists x Q(x))"),
            ("∀x (P → Q)", "∀x P → ∀x Q", "forall x (P(x) -> Q(x))", "(forall x P(x)) -> (forall x Q(x))"),
            ("∃y ∀x R", "∀x ∃y R", "exists y forall x R(x, y)", "forall x exists y R(x, y)")]
    kinds = []
    for a, b, fa, fb in laws:
        fwd = P.valid(f"({fa}) -> ({fb})")
        back = P.valid(f"({fb}) -> ({fa})")
        assert fwd
        kinds.append(back)
    assert kinds == [True, True, False, False, False, False]
    els = [*heads("The quantifier laws: two-way and one-way", "Two-way and one-way laws", 640)]
    for i, (a, b, _, _) in enumerate(laws):
        y, ny = 50 + i * 44, 48 + i * 52
        els.append(box(f"a{i}", 40, y, 210, 34, a, {"x": 6, "y": ny, "w": 150, "h": 32, "size": 12}, size=14, mono=True))
        els.append(box(f"b{i}", 390, y, 210, 34, b, {"x": 204, "y": ny, "w": 150, "h": 32, "size": 12}, size=14, mono=True))
        els.append(arrow(f"r{i}", f"a{i}", f"b{i}", head="end", hidden=True))
    steps = [step("Six statements on the left, six on the right. For each pair we ask: does the left imply the right, and does the right imply the left?",
                  *[(f"a{i}", {"tone": "accent"}) for i in range(6)])]
    names = ["∀ distributes over ∧: both directions hold (two-way).", "∃ distributes over ∨: both directions hold (two-way).",
             "∀P ∨ ∀Q gives ∀(P ∨ Q), but not back: the turn-taking world refutes the converse.",
             "∃(P ∧ Q) gives ∃P ∧ ∃Q, but not back: two witnesses are not one.",
             "∀(P → Q) gives ∀P → ∀Q, but not back: make P fail somewhere, then the right side is vacuous.",
             "∃y∀x gives ∀x∃y, but not back: Lesson 1's grid."]
    for i, two in enumerate(kinds):
        steps.append(step(names[i], (f"r{i}", {"hidden": False, "head": "both" if two else "end", "tone": "success" if two else "info"}),
                          (f"a{i}", {"tone": "success" if two else "info"}), (f"b{i}", {"tone": "success" if two else "info"})))
    steps.append(step("Two-headed arrows are equivalences; one-headed arrows are the one-way laws GATE asks about. Learn the one-way ones with their counter-models.",
                      *[(f"r{i}", {"label": ""}) for i in range(6)]))
    return spec("Which way do the laws go?", (640, 320), (360, 370),
                "Each pair is checked: valid left-to-right, and is the converse valid too?", els, steps)


@scene
def pull_past_w():
    dom = [0, 1]
    I = {"p": {(0,)}}
    lhs = "forall x (p(x) -> W)"
    good = "(exists x p(x)) -> W"
    bad = "(forall x p(x)) -> W"
    vals = {}
    for w in (True, False):
        Iw = dict(I)
        Iw["W"] = {()} if w else set()
        vals[w] = (P.holds(lhs, dom, Iw), P.holds(good, dom, Iw), P.holds(bad, dom, Iw))
    assert vals[True] == (True, True, True) and vals[False] == (False, False, True)
    head = ["W", "∀(p→W)", "∃p → W", "∀p → W"]
    rows = [head, ["T", "", "", ""], ["F", "", "", ""]]

    def fill(c):
        out = [list(r) for r in rows]
        for i, w in enumerate((True, False)):
            for j in range(c):
                out[i + 1][j + 1] = TF(vals[w][j])
        return out
    els = [*heads("Pulling ∀x out of a hypothesis flips it: ∀x (p(x) → W) ≡ ∃x p(x) → W", "∀x (p → W) ≡ ∃x p → W", 640),
           text("world", 320, 56, "Domain {1, 2}; p true at 1 only; W has no x", {"x": 180, "y": 54, "size": 13}, anchor="middle", size=14, tone="muted"),
           table("t", 28, 76, 146, 36, fill(0), {"x": 4, "y": 72, "cellW": 88, "cellH": 34}, header=True, mono=True),
           text("v", 320, 214, "", {"x": 180, "y": 200, "size": 13}, anchor="middle", size=15)]
    steps = [
        step("W is a sentence without x, so it is simply T or F. We compare three formulas in both cases.", ("t", {"highlight": [[1, 0], [2, 0]]})),
        step("∀x (p(x) → W): if W is T every promise is kept; if W is F the promise fails at x = 1 (p is true there).",
             ("t", {"rows": fill(1), "highlight": [[2, 1]]})),
        step("∃x p(x) → W gives the same column: someone (1) is p, so it equals W.", ("t", {"rows": fill(2), "highlight": [[1, 2], [2, 2]]}),
             ("v", {"text": "∀x (p → W) ≡ ∃x p → W", "tone": "success"})),
        step("∀x p(x) → W differs when W is F: ∀x p is false (2 is not p), so the implication is vacuously true.",
             ("t", {"rows": fill(3), "highlight": [[2, 3]]}), ("v", {"text": "∀x p → W is NOT the same (GATE 2020)", "tone": "danger"})),
        step("Why: p(x) → W is ¬p(x) ∨ W. Pulling ∀x past W gives ∀x ¬p(x) ∨ W = ¬∃x p(x) ∨ W = ∃x p(x) → W. The hidden ¬ flips ∀ to ∃.",
             ("v", {"text": "a hypothesis hides a ¬, and ¬ flips the quantifier", "tone": "accent"})),
    ]
    return spec("A quantifier leaving a hypothesis flips", (640, 232), (360, 220),
                "W does not mention x. Compare ∀x (p(x) → W) with ∃x p(x) → W and with the tempting ∀x p(x) → W.", els, steps)


@scene
def prenex_steps():
    forms = [("∀x P(x) → ∃x Q(x)", "forall x P(x) -> exists x Q(x)", ""),
             ("∀x P(x) → ∃y Q(y)", "forall x P(x) -> exists y Q(y)", "rename bound variables apart"),
             ("∃x (P(x) → ∃y Q(y))", "exists x (P(x) -> exists y Q(y))", "∀x leaves the hypothesis: flips to ∃x"),
             ("∃x ∃y (P(x) → Q(y))", "exists x exists y (P(x) -> Q(y))", "∃y leaves the conclusion: unchanged")]
    for _, src, _ in forms[1:]:
        assert P.equivalent(forms[0][1], src)
    els = [*heads("Prenex form, one move at a time", "Prenex form", 640)]
    for k, (f, _, why) in enumerate(forms):
        y = 54 + k * 54
        els.append(box(f"f{k}", 20, y, 290, 40, f, {"x": 10, "y": 50 + k * 72, "w": 340, "h": 36, "size": 14}, size=15, mono=True, hidden=k > 0))
        if why:
            els.append(text(f"w{k}", 326, y + 26, why, {"x": 14, "y": 100 + (k - 1) * 72, "size": 12}, size=13, tone="info", hidden=True))
    els.append(text("end", 320, 290, "", {"x": 180, "y": 342, "size": 13}, anchor="middle", size=15))
    steps = [step("Start: an implication whose two sides are quantified, both with the letter x.", ("f0", {"tone": "accent"}))]
    for k in (1, 2, 3):
        steps.append(step(forms[k][2][0].upper() + forms[k][2][1:] + ".", (f"f{k}", {"hidden": False, "tone": "accent"}), (f"w{k}", {"hidden": False}),
                          (f"f{k - 1}", {"tone": "muted"})))
    steps.append(step("All quantifiers are now in front: the prefix ∃x ∃y says this is an ∃∃ sentence, so it has a model iff it has one with at most 2 elements.",
                      ("f3", {"tone": "success", "fill": "success"}), ("end", {"text": "prefix ∃∃: models of size ≤ 2 suffice", "tone": "success"})))
    return spec("Converting to prenex form", (640, 306), (360, 360),
                "Rename bound variables apart, then pull quantifiers out, flipping those that leave a hypothesis.", els, steps)


@scene
def infinite_chain():
    phi = ("(forall x exists y R(x, y)) & (forall x forall y (R(x, y) -> ~R(y, x))) & "
           "(forall x forall y forall z ((R(x, y) & R(y, z)) -> R(x, z))) & (forall x ~R(x, x))")
    assert P.model(phi, 3) is None
    N = list(range(6))
    lt = {(a, b) for a in N for b in N if a < b}
    assert P.holds("(forall x forall y (R(x, y) -> ~R(y, x))) & (forall x forall y forall z ((R(x, y) & R(y, z)) -> R(x, z))) & (forall x ~R(x, x))", N, {"R": lt})
    els = [*heads("Every element needs a successor, and you can never come back", "Only infinite models", 640)]
    for k in range(5):
        x, nx = 60 + k * 120, 34 + k * 72
        els.append(node(f"n{k}", x, 120, 26, f"d{k}", {"cx": nx, "cy": 110, "r": 22}, size=15, mono=True, hidden=k > 0))
        if k:
            els.append(arrow(f"e{k}", f"n{k - 1}", f"n{k}", head="end", hidden=True))
    els.append(arrow("back", "n3", "n0", head="end", curve=0.45, hidden=True, tone="danger", dashed=True))
    els.append(text("v", 320, 226, "", {"x": 180, "y": 206, "size": 12}, anchor="middle", size=15))
    els.append(text("v2", 320, 256, "", {"x": 180, "y": 232, "size": 12}, anchor="middle", size=15))
    steps = [
        step("Start anywhere: d0. The first condition says it has a successor, d0 R d1.", ("n0", {"tone": "accent"}), ("n1", {"hidden": False}), ("e1", {"hidden": False})),
        step("d1 needs a successor too: d2. Transitivity adds d0 R d2 behind the scenes.", ("n2", {"hidden": False}), ("e2", {"hidden": False})),
        step("And d3. Every new element is related to all the earlier ones.", ("n3", {"hidden": False}), ("e3", {"hidden": False})),
        step("Try to stop: let d3's successor be an old element, d0. That closes a cycle d0 R d1 R d2 R d3 R d0.",
             ("back", {"hidden": False}), ("v", {"text": "d3 R d0 would close a cycle…", "tone": "warning"})),
        step("Transitivity around the cycle gives d0 R d0, which irreflexivity forbids. So no old element can be a successor.",
             ("n0", {"tone": "danger"}), ("v", {"text": "…but then d0 R d0: forbidden", "tone": "danger"})),
        step("So the chain must keep growing with new elements: no finite model exists. (ℕ, <) is a model: 0 < 1 < 2 < … forever.",
             ("back", {"hidden": True}), ("n4", {"hidden": False}), ("e4", {"hidden": False}), ("n0", {"tone": "accent"}),
             ("v", {"text": "no finite model", "tone": "accent"}), ("v2", {"text": "(ℕ, <) is a countable model", "tone": "success"})),
    ]
    return spec("A sentence with only infinite models", (640, 276), (360, 250),
                "R has successors everywhere, is transitive, asymmetric and irreflexive. Watch what happens when we try to finish a finite model.", els, steps)


@scene
def small_model():
    # φ = ∃s∃t∃u ∀v (L(v, s) | v = s | v = t | v = u) on a 7-element model: every element is a witness or loves s.
    big = list(range(7))
    L = {(v, 0) for v in big}
    f = "exists s exists t exists u forall v (L(v, s) | v = t | v = u)"
    assert P.holds(f, big, {"L": L})
    small = [0, 1, 2]
    assert P.holds(f, small, {"L": {(a, b) for (a, b) in L if a in small and b in small}})
    els = [*heads("∃s ∃t ∃u ∀v … : keep only the three witnesses", "Shrinking to the witnesses", 640)]
    pos = [(90, 90), (200, 90), (310, 90), (420, 90), (530, 90), (145, 170), (365, 170)]
    npos = [(50, 80), (130, 80), (210, 80), (290, 80), (90, 150), (170, 150), (250, 150)]
    for k, ((x, y), (nx, ny)) in enumerate(zip(pos, npos)):
        els.append(node(f"n{k}", x, y, 26, str(k + 1), {"cx": nx, "cy": ny, "r": 24}, size=16, mono=True))
    els.append(text("v", 320, 236, "", {"x": 180, "y": 206, "size": 12}, anchor="middle", size=15))
    els.append(text("v2", 320, 266, "", {"x": 180, "y": 232, "size": 12}, anchor="middle", size=15))
    steps = [
        step("A model of φ with 7 elements. The sentence starts with three ∃'s, then only ∀'s, and has no function symbols.",
             *[(f"n{k}", {"tone": "accent"}) for k in range(7)]),
        step("Pick the witnesses for s, t and u, say elements 1, 2 and 3.",
             *[(f"n{k}", {"tone": "success", "fill": "success"}) for k in range(3)], ("v", {"text": "witnesses: 1, 2, 3", "tone": "success"})),
        step("Send the other four elements away, and keep the predicates as they were on 1, 2, 3.",
             *[(f"n{k}", {"hidden": True}) for k in range(3, 7)]),
        step("The witnesses are still here, and every ∀ now ranges over fewer elements, each instance with the same value as before. So φ is still true.",
             ("v2", {"text": "a model with at most 3 elements", "tone": "success"})),
        step("So if φ has any model, it has one of size ≤ 3 (GATE 2018, option A). Nothing forces a model to be large or exactly 7.",
             ("v", {"text": "∃³∀* ⇒ a model of size ≤ 3 exists", "tone": "accent"})),
    ]
    return spec("The small-model property", (640, 282), (360, 250),
                "Universal claims survive when elements are removed; existential witnesses must stay. Keep only the witnesses.", els, steps)


@scene
def horn_chain():
    # Program: A(x) ← B(x, y), C(y); facts B(a, b), B(c, b), C(b). Forward chaining derives A(a), A(c).
    dom = ["a", "b", "c"]
    I = {"B": {("a", "b"), ("c", "b")}, "C": {("b",)}}
    derived = sorted(x for x in dom if any((x, y) in I["B"] and (y,) in I["C"] for y in dom))
    assert derived == ["a", "c"]
    I2 = dict(I, A={(x,) for x in derived})
    prog = "forall x ((exists y (B(x, y) & C(y))) -> A(x)) & ~exists x B(x, x)"
    assert P.holds(prog, dom, I2) and not P.holds(prog, dom, dict(I, A={("a",)}))
    assert P.equivalent("forall x forall y ((B(x, y) & C(y)) -> A(x))", "forall x ((exists y (B(x, y) & C(y))) -> A(x))", 2)
    els = [*heads("A(x) ← B(x, y), C(y): from facts to conclusions", "Forward chaining a Horn rule", 640),
           box("rule", 150, 46, 340, 36, "A(x) ← B(x, y), C(y)", {"x": 30, "y": 44, "w": 300, "h": 34, "size": 14}, size=16, mono=True)]
    facts = ["B(a, b)", "B(c, b)", "C(b)"]
    for k, f in enumerate(facts):
        els.append(box(f"f{k}", 40 + k * 130, 110, 110, 34, f, {"x": 10 + k * 116, "y": 100, "w": 104, "h": 32, "size": 13}, size=15, mono=True))
    for k, x in enumerate(derived):
        els.append(box(f"d{k}", 450, 106 + k * 44, 140, 34, f"A({x})", {"x": 80 + k * 110, "y": 158, "w": 90, "h": 32, "size": 13}, size=15, mono=True, hidden=True))
    els.append(text("v", 320, 226, "", {"x": 180, "y": 220, "size": 12}, anchor="middle", size=15))
    els.append(text("v2", 320, 254, "", {"x": 180, "y": 246, "size": 12}, anchor="middle", size=14, mono=True))
    steps = [
        step("The rule says: for all x and y, if B(x, y) and C(y) then A(x). The facts are B(a, b), B(c, b) and C(b).", ("rule", {"tone": "accent"})),
        step("Match x = a, y = b: B(a, b) and C(b) both hold, so the rule fires: A(a).",
             ("f0", {"tone": "success"}), ("f2", {"tone": "success"}), ("d0", {"hidden": False, "tone": "success", "fill": "success"})),
        step("Match x = c, y = b: B(c, b) and C(b) hold: A(c). Only one y is needed each time, so y is really ‘some y’.",
             ("f0", {"tone": "muted"}), ("f1", {"tone": "success"}), ("d1", {"hidden": False, "tone": "success", "fill": "success"}),
             ("v", {"text": "y appears only in the body: it is ∃y", "tone": "accent"})),
        step("As a sentence: ∀x (∃y (B(x, y) ∧ C(y)) → A(x)), and the headless rule ← B(x, x) adds ∧ ¬∃x B(x, x). No fact B(x, x) exists here, so the program holds.",
             ("v2", {"text": "∀x(∃y(B ∧ C) → A(x)) ∧ ¬∃x B(x, x)", "tone": "success"})),
    ]
    return spec("A logic program as a first-order sentence", (640, 270), (360, 262),
                "One Horn rule and three facts. The rule fires once for each x that has some suitable y.", els, steps)
