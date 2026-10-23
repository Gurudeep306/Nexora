"""Viz scenes for dm/01-propositional-logic/01-propositions-connectives. Every truth value shown is
computed with logiclib, so the scenes cannot drift from the checked maths."""
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
def truth_table_build():
    vs = ["p", "q", "r"]
    rs = list(L.rows(vs))
    c1 = L.table("p -> q", vs)
    c2 = L.table("q -> r", vs)
    c3 = L.table("(p -> q) & (q -> r)", vs)
    assert c3 == [a and b for a, b in zip(c1, c2)]
    head = ["p", "q", "r", "p→q", "q→r", "both"]
    base = [[TF(r["p"]), TF(r["q"]), TF(r["r"]), "", "", ""] for r in rs]

    def rows(k):
        out = [head]
        for i, r in enumerate(base):
            row = list(r)
            if k >= 1:
                row[3] = TF(c1[i])
            if k >= 2:
                row[4] = TF(c2[i])
            if k >= 3:
                row[5] = TF(c3[i])
            out.append(row)
        return out
    true_rows = [i + 1 for i, v in enumerate(c3) if v]
    assert true_rows == [1, 5, 7, 8]
    els = [*heads("Building the table of (p → q) ∧ (q → r), one column at a time", "Truth table of (p→q) ∧ (q→r)", 640),
           table("tt", 50, 44, 90, 30, rows(0), {"x": 12, "y": 44, "cellW": 56, "cellH": 30}, header=True, mono=True),
           text("note", 320, 338, "8 rows: p alternates slowest, T before F", {"x": 180, "y": 338, "size": 13}, anchor="middle", size=15, tone="muted")]
    f1 = [[i + 1, 3] for i, v in enumerate(c1) if not v]
    f2 = [[i + 1, 4] for i, v in enumerate(c2) if not v]
    steps = [
        step("Three variables give 2³ = 8 rows. The variable columns are filled first: p is T for the first four rows, q alternates in pairs, r every row.",
             ("tt", {"highlight": [[i, j] for i in range(1, 9) for j in range(3)]})),
        step("Column p → q: it is false only where p = T and q = F, which is rows 3 and 4. Every other row keeps the promise.",
             ("tt", {"rows": rows(1), "highlight": f1}), ("note", {"text": "p → q fails on rows 3 and 4", "tone": "danger"})),
        step("Column q → r: false only where q = T and r = F, rows 2 and 6.",
             ("tt", {"rows": rows(2), "highlight": f2}), ("note", {"text": "q → r fails on rows 2 and 6", "tone": "danger"})),
        step("The conjunction is true only where both columns are T: rows 1, 5, 7 and 8 (TTT, FTT, FFT, FFF).",
             ("tt", {"rows": rows(3), "highlight": [[i, 5] for i in true_rows]}), ("note", {"text": "true on rows 1, 5, 7, 8", "tone": "success"})),
        step("Read the true rows left to right: the values never drop from T to F along p, q, r. The column is the whole meaning of the formula.",
             ("tt", {"highlight": [[i, j] for i in true_rows for j in range(3)]}), ("note", {"text": "true exactly when p, q, r never go T → F", "tone": "accent"})),
    ]
    return spec("A truth table, column by column", (640, 352), (360, 352),
                "The formula (p → q) ∧ (q → r) has three variables. We list all 8 assignments and add one column per sub-formula.",
                els, steps)


@scene
def implication_promise():
    cases = [(True, True), (True, False), (False, True), (False, False)]
    vals = [L.ev(L.parse("p -> q"), {"p": a, "q": b}) for a, b in cases]
    assert vals == [True, False, True, True]
    labels = ["scored > 90, got the prize", "scored > 90, no prize", "scored ≤ 90, got a prize", "scored ≤ 90, no prize"]
    els = [*heads("The promise “if you score above 90 (p), you get a prize (q)”", "Promise: if p then q", 640)]
    for k, ((a, b), lab) in enumerate(zip(cases, labels)):
        y = 50 + k * 62
        ny = 46 + k * 84
        els.append(box(f"c{k}", 30, y, 380, 48, f"{TF(a)} {TF(b)}: {lab}", {"x": 10, "y": ny, "w": 340, "h": 40, "size": 13}, size=15))
        els.append(box(f"v{k}", 440, y, 170, 48, "?", {"x": 90, "y": ny + 44, "w": 180, "h": 32, "size": 13}, size=15, mono=True))
    els.append(text("foot", 320, 316, "p → q is false on one row only", {"x": 180, "y": 392, "size": 13}, anchor="middle", size=15, tone="muted"))
    steps = [
        step("Case T, T: you scored above 90 and got the prize. The promise was kept, so p → q is true.",
             ("v0", {"label": "kept: T", "tone": "success", "fill": "success"}), ("c0", {"tone": "accent"})),
        step("Case T, F: you scored above 90 and got no prize. This is the one way to break the promise: p → q is false.",
             ("v1", {"label": "broken: F", "tone": "danger", "fill": "danger"}), ("c1", {"tone": "danger"})),
        step("Case F, T: you scored 90 or less but got a prize anyway (maybe for something else). The promise said nothing about this case, so it is not broken: true.",
             ("v2", {"label": "not broken: T", "tone": "success", "fill": "success"}), ("c2", {"tone": "accent"})),
        step("Case F, F: you scored 90 or less and got nothing. Again the promise was never tested: true. A false hypothesis makes the implication vacuously true.",
             ("v3", {"label": "not broken: T", "tone": "success", "fill": "success"}), ("c3", {"tone": "accent"})),
        step("So p → q is false exactly when p is true and q is false; that is the same column as ¬p ∨ q.",
             ("foot", {"text": "p → q ≡ ¬p ∨ q (false only on T, F)", "tone": "accent"})),
    ]
    return spec("Implication as a promise", (640, 330), (360, 404),
                "An implication is a promise. It is broken only if the condition happens and the promised result does not.", els, steps)


@scene
def implication_square():
    imp = {"orig": "p -> q", "conv": "q -> p", "inv": "~p -> ~q", "contra": "~q -> ~p"}
    assert L.equivalent(imp["orig"], imp["contra"]) and L.equivalent(imp["conv"], imp["inv"])
    assert not L.equivalent(imp["orig"], imp["conv"])
    row = {"p": True, "q": False}
    v = {k: L.ev(L.parse(f), row) for k, f in imp.items()}
    assert v == {"orig": False, "conv": True, "inv": True, "contra": False}
    W = 640
    pos = {"orig": (40, 60), "conv": (400, 60), "inv": (40, 230), "contra": (400, 230)}
    npos = {"orig": (10, 60), "conv": (190, 60), "inv": (10, 230), "contra": (190, 230)}
    lab = {"orig": "p → q (original)", "conv": "q → p (converse)", "inv": "¬p → ¬q (inverse)", "contra": "¬q → ¬p (contrapos.)"}
    els = [*heads("The four relatives of an implication", "Four relatives of p → q", W)]
    for k in pos:
        x, y = pos[k]
        nx, ny = npos[k]
        els.append(box(k, x, y, 200, 56, lab[k], {"x": nx, "y": ny, "w": 160, "h": 56, "size": 12}, size=14))
        els.append(text(f"{k}t", x + 100, y + 80, "", {"x": nx + 80, "y": ny + 78, "size": 13}, anchor="middle", size=14, mono=True))
    els += [arrow("a1", "orig", "conv", None, label="swap", head="both"),
            arrow("a2", "orig", "inv", None, label="negate", head="both"),
            arrow("a3", "orig", "contra", None, label="swap + negate", head="both", hidden=True)]
    els.append(text("foot", 320, 346, "", {"x": 180, "y": 346, "size": 13}, anchor="middle", size=15, tone="muted"))
    steps = [
        step("Start from p → q. Swapping the sides gives the converse q → p; negating both sides gives the inverse ¬p → ¬q.",
             ("orig", {"tone": "accent", "fill": "accent"})),
        step("Doing both (swap and negate) gives the contrapositive ¬q → ¬p.", ("a3", {"hidden": False, "tone": "accent"})),
        step(f"Test the row p = T, q = F. Original: T → F = {TF(v['orig'])}. Contrapositive: ¬q → ¬p = T → F = {TF(v['contra'])}. They fail together.",
             ("origt", {"text": f"p=T,q=F: {TF(v['orig'])}", "tone": "danger"}), ("contrat", {"text": f"p=T,q=F: {TF(v['contra'])}", "tone": "danger"}),
             ("contra", {"tone": "success", "fill": "success"}), ("orig", {"tone": "success", "fill": "success"})),
        step(f"On the same row the converse is F → T = {TF(v['conv'])} and the inverse is F → T = {TF(v['inv'])}: they differ from the original, so they are not equivalent to it.",
             ("convt", {"text": f"p=T,q=F: {TF(v['conv'])}", "tone": "warning"}), ("invt", {"text": f"p=T,q=F: {TF(v['inv'])}", "tone": "warning"}),
             ("conv", {"tone": "warning", "fill": "warning"}), ("inv", {"tone": "warning", "fill": "warning"})),
        step("The diagonals pair up: original ≡ contrapositive, and converse ≡ inverse (each is the other's contrapositive).",
             ("foot", {"text": "p → q ≡ ¬q → ¬p    and    q → p ≡ ¬p → ¬q", "tone": "accent"})),
    ]
    return spec("Converse, inverse and contrapositive", (640, 360), (360, 360),
                "From one implication we can build three others by swapping and negating its two sides. Only one of them says the same thing.",
                els, steps)


@scene
def unless_decoder():
    s1, s2 = "~Z -> (X -> Y)", "(X & ~Z) -> Y"
    assert L.equivalent(s1, s2)
    bad = [r for r in L.rows(["X", "Y", "Z"]) if not L.ev(L.parse(s2), r)]
    assert bad == [{"X": True, "Y": False, "Z": False}]
    lines = ["if X then Y  unless Z", "(if X then Y)  unless  Z", "¬Z → (X → Y)", "(X ∧ ¬Z) → Y"]
    nlines = ["if X then Y unless Z", "(if X then Y) unless Z", "¬Z → (X → Y)", "(X ∧ ¬Z) → Y"]
    els = [*heads("Decoding “if X then Y unless Z”", "Decoding “unless”", 640)]
    for k, (a, b) in enumerate(zip(lines, nlines)):
        els.append(box(f"l{k}", 150, 48 + k * 64, 340, 46, a, {"x": 20, "y": 48 + k * 64, "w": 320, "h": 46, "size": 14},
                       size=16, hidden=k > 0, mono=k >= 2))
    els.append(text("foot", 320, 322, "", {"x": 180, "y": 322, "size": 13}, anchor="middle", size=15, tone="muted"))
    steps = [
        step("Bracket the sentence first. 'Unless Z' qualifies the whole promise 'if X then Y'.", ("l1", {"hidden": False, "tone": "accent"})),
        step("'A unless Z' means 'if not Z, then A'. With A = (X → Y) this is ¬Z → (X → Y).", ("l2", {"hidden": False, "tone": "accent"})),
        step("Exportation moves the outer hypothesis inside: A → (B → C) ≡ (A ∧ B) → C. The result is (X ∧ ¬Z) → Y.", ("l3", {"hidden": False, "tone": "success", "fill": "success"})),
        step("Check with the forbidden situation. The sentence is broken only if X happens, Z does not, and Y fails: X = T, Y = F, Z = F. The formula is false on exactly that row.",
             ("foot", {"text": "only forbidden row: X = T, Y = F, Z = F", "tone": "danger"})),
    ]
    return spec("'Unless' means 'if not'", (640, 336), (360, 336),
                "The phrase 'unless Z' turns into the hypothesis 'not Z'. We decode a GATE sentence in three moves.", els, steps)


@scene
def custom_operator():
    op = {"⊙": (True, True, False, True)}
    vs = ["A", "B"]
    t = L.table("A ⊙ B", vs, op)
    assert t == [True, True, False, True]
    assert L.equivalent(L.parse("A ⊙ B", op), "A | ~B")
    forms = ["~A ⊙ B", "~(A ⊙ ~B)", "~(~A ⊙ ~B)", "~(~A ⊙ B)"]
    good = [f for f in forms if L.equivalent(L.parse(f, op), "A & B")]
    assert good == ["~(~A ⊙ B)"]
    rows = [["A", "B", "A ⊙ B"]] + [[TF(r["A"]), TF(r["B"]), TF(v)] for r, v in zip(L.rows(vs), t)]
    els = [*heads("An operator given only by its table (GATE 2006)", "A new operator ⊙", 640),
           table("tt", 40, 50, 70, 32, rows, {"x": 99, "y": 46, "cellW": 54, "cellH": 30}, header=True, mono=True),
           box("r1", 300, 54, 310, 44, "false only at A = F, B = T", {"x": 20, "y": 204, "w": 320, "h": 44, "size": 14}, size=15, hidden=True),
           box("r2", 300, 112, 310, 44, "A ⊙ B ≡ A ∨ ¬B", {"x": 20, "y": 256, "w": 320, "h": 44, "size": 14}, size=16, mono=True, hidden=True),
           box("r3", 300, 170, 310, 44, "¬A ⊙ B ≡ ¬A ∨ ¬B", {"x": 20, "y": 308, "w": 320, "h": 44, "size": 14}, size=16, mono=True, hidden=True),
           box("r4", 300, 228, 310, 44, "¬(¬A ⊙ B) ≡ A ∧ B", {"x": 20, "y": 360, "w": 320, "h": 44, "size": 14}, size=16, mono=True, hidden=True)]
    steps = [
        step("Find the false rows of the new operator. There is only one: A = F, B = T.", ("tt", {"highlight": [[3, 0], [3, 1], [3, 2]]}), ("r1", {"hidden": False, "tone": "danger"})),
        step("An operator false on one row is the disjunction that fails there: A ∨ ¬B fails only at A = F, B = T. So A ⊙ B ≡ A ∨ ¬B (which is B → A).", ("r2", {"hidden": False, "tone": "accent"})),
        step("We want A ∧ B = ¬(¬A ∨ ¬B). The option ¬A ⊙ B substitutes ¬A for A: it gives ¬A ∨ ¬B, a NAND.", ("r3", {"hidden": False, "tone": "accent"})),
        step("Negating it gives ¬(¬A ∨ ¬B) = A ∧ B by De Morgan. The answer is ∼(∼A ⊙ B).", ("r4", {"hidden": False, "tone": "success", "fill": "success"})),
    ]
    return spec("Rewriting an invented operator", (640, 290), (360, 420),
                "GATE sometimes defines a connective by its four-row table. Read its false row, rewrite it with ¬ and ∨, and the options become easy.",
                els, steps)


@scene
def parse_tree():
    f = "~p | q & r -> p <-> q"
    env = {"p": False, "q": True, "r": False}
    e = L.parse(f)
    assert e == L.parse("((~p | (q & r)) -> p) <-> q") and e[0] == "iff"  # precedence: ↔ is the root
    sub = {k: L.ev(L.parse(s), env) for k, s in
           {"neg": "~p", "and": "q & r", "or": "~p | (q & r)", "imp": "(~p | (q & r)) -> p", "root": f}.items()}
    assert sub == {"neg": True, "and": False, "or": True, "imp": False, "root": False}
    # (id, wide x, y, narrow x, label before, label after evaluation)
    nodes = [("n0", 265, 50, 145, "↔", f"↔ = {TF(sub['root'])}"),
             ("n1", 140, 120, 75, "→", f"→ = {TF(sub['imp'])}"), ("n2", 420, 120, 230, "q", "q = T"),
             ("n3", 60, 190, 20, "∨", f"∨ = {TF(sub['or'])}"), ("n4", 240, 190, 140, "p", "p = F"),
             ("n5", 10, 260, 5, "¬p", f"¬p = {TF(sub['neg'])}"), ("n6", 140, 260, 90, "∧", f"∧ = {TF(sub['and'])}"),
             ("n7", 80, 330, 55, "q", "q = T"), ("n8", 220, 330, 150, "r", "r = F")]
    els = [*heads("The parse tree of ¬p ∨ q ∧ r → p ↔ q", "Parse tree of ¬p ∨ q ∧ r → p ↔ q", 640)]
    for i, x, y, nx, lab, _ in nodes:
        els.append(box(i, x, y, 110, 40, lab, {"x": nx, "y": y, "w": 72, "h": 40, "size": 13}, size=15, mono=True))
    for k, (a, b) in enumerate([("n0", "n1"), ("n0", "n2"), ("n1", "n3"), ("n1", "n4"), ("n3", "n5"), ("n3", "n6"), ("n6", "n7"), ("n6", "n8")]):
        els.append(arrow(f"e{k}", a, b, None))
    els.append(text("foot", 320, 400, "the root is the main connective", {"x": 180, "y": 400, "size": 13}, anchor="middle", size=15, tone="muted"))
    lab = {i: after for i, *_, after in nodes}
    steps = [
        step("Precedence decides the shape: ¬ binds first, then ∧, then ∨, then →, and ↔ is applied last. So ↔ is the root (the main connective): the formula is a biconditional.",
             ("n0", {"tone": "accent", "fill": "accent"}), ("foot", {"text": "main connective: ↔", "tone": "accent"})),
        step("Evaluate at p = F, q = T, r = F. Start at the leaves: write each variable's value.",
             *[(i, {"label": lab[i]}) for i in ("n2", "n4", "n7", "n8")]),
        step("Lowest operators next: ¬p = T, and q ∧ r = T ∧ F = F.",
             ("n5", {"label": lab["n5"], "tone": "success"}), ("n6", {"label": lab["n6"], "tone": "danger"})),
        step("One level up: ¬p ∨ (q ∧ r) = T ∨ F = T.", ("n3", {"label": lab["n3"], "tone": "success"})),
        step("The implication has hypothesis T and conclusion p = F: T → F = F, its one false row.", ("n1", {"label": lab["n1"], "tone": "danger"})),
        step("The root compares its two sides: F ↔ T = F, because they disagree. A truth table is this tree evaluated once per row.",
             ("n0", {"label": lab["n0"], "tone": "danger", "fill": "danger"}), ("foot", {"text": "value at p = F, q = T, r = F: F", "tone": "danger"})),
    ]
    return spec("Reading a formula as a tree", (640, 416), (360, 416),
                "Precedence turns a string of symbols into a tree. The connective applied last is the root; evaluation runs from the leaves up.",
                els, steps)
