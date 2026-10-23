"""Viz scenes for dm/01-propositional-logic/02-equivalence-normal-forms. Every truth value, index,
forced value and class membership shown is computed with logiclib, so the scenes cannot drift from the
checked maths."""
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
def verdict_columns():
    vs = ["p", "q"]
    forms = {"A": "q -> (p -> q)", "B": "p & ~(p | q)", "C": "(p | q) -> q"}
    cols = {k: L.table(f, vs) for k, f in forms.items()}
    verdict = {k: L.classify(f, vs) for k, f in forms.items()}
    assert verdict == {"A": "tautology", "B": "contradiction", "C": "contingency"}
    rs = list(L.rows(vs))
    head = ["p", "q", "A", "B", "C"]

    def rows(k):
        out = [head]
        for i, r in enumerate(rs):
            row = [TF(r["p"]), TF(r["q"]), "", "", ""]
            for j, key in enumerate("ABC"):
                if k > j:
                    row[2 + j] = TF(cols[key][i])
            out.append(row)
        return out
    els = [*heads("Three verdicts on a column", "Three verdicts", 640),
           table("tt", 120, 44, 80, 30, rows(0), {"x": 20, "y": 44, "cellW": 64, "cellH": 30}, header=True, mono=True),
           text("la", 320, 222, "A = q → (p → q)", {"x": 180, "y": 222, "size": 13}, anchor="middle", size=15, mono=True),
           text("lb", 320, 246, "B = p ∧ ¬(p ∨ q)", {"x": 180, "y": 246, "size": 13}, anchor="middle", size=15, mono=True),
           text("lc", 320, 270, "C = (p ∨ q) → q", {"x": 180, "y": 270, "size": 13}, anchor="middle", size=15, mono=True),
           text("foot", 320, 306, "satisfiable = at least one T", {"x": 180, "y": 306, "size": 13}, anchor="middle", size=15, tone="muted")]
    fc = [i + 1 for i, v in enumerate(cols["C"]) if not v]
    assert fc == [2]
    steps = [
        step(f"Column A, q → (p → q): every row is {TF(True)}. A column of all T is a tautology (valid): true whatever p and q mean.",
             ("tt", {"rows": rows(1), "highlight": [[i, 2] for i in range(1, 5)]}), ("la", {"tone": "success", "text": "A = q → (p → q): tautology"})),
        step("Column B, p ∧ ¬(p ∨ q): every row is F. ¬(p ∨ q) forces p = F, which clashes with the first conjunct. All F is a contradiction (unsatisfiable).",
             ("tt", {"rows": rows(2), "highlight": [[i, 3] for i in range(1, 5)]}), ("lb", {"tone": "danger", "text": "B = p ∧ ¬(p ∨ q): contradiction"})),
        step("Column C, (p ∨ q) → q: false only on row 2 (p = T, q = F), true elsewhere. A mixed column is a contingency.",
             ("tt", {"rows": rows(3), "highlight": [[i, 4] for i in fc]}), ("lc", {"tone": "warning", "text": "C = (p ∨ q) → q: contingency"})),
        step("Satisfiable means at least one T: A and C are satisfiable, B is not. Falsifiable means at least one F: B and C. Only C is both.",
             ("foot", {"text": "satisfiable: A, C    falsifiable: B, C", "tone": "accent"})),
        step("Negating a formula flips its column: ¬A is all F, ¬B is all T, and ¬C is still mixed. Tautology and contradiction swap; contingency stays.",
             ("foot", {"text": "¬ swaps tautology ↔ contradiction", "tone": "accent"})),
    ]
    return spec("Tautology, contradiction, contingency", (640, 320), (360, 320),
                "The verdict on a formula is read from its final column: all T, all F, or mixed. Three formulas in p and q, one of each kind.",
                els, steps)


@scene
def law_ladder():
    rungs = [("(P ∧ Q) → (Q → R)", "start: the consequent of S"),
             ("¬(P ∧ Q) ∨ (Q → R)", "implication: A → B ≡ ¬A ∨ B"),
             ("¬(P ∧ Q) ∨ ¬Q ∨ R", "implication again"),
             ("¬P ∨ ¬Q ∨ ¬Q ∨ R", "De Morgan"),
             ("¬P ∨ ¬Q ∨ R", "idempotent: ¬Q ∨ ¬Q ≡ ¬Q"),
             ("(P ∧ Q) → R", "De Morgan + implication, read back")]
    ascii_ = ["(P & Q) -> (Q -> R)", "~(P & Q) | (Q -> R)", "~(P & Q) | ~Q | R", "~P | ~Q | ~Q | R", "~P | ~Q | R", "(P & Q) -> R"]
    for a, b in zip(ascii_, ascii_[1:]):
        assert L.equivalent(a, b)
    for (u, _), a in zip(rungs, ascii_):
        assert L.parse(u) == L.parse(a)
    S = "((P & Q) -> R) -> ((P & Q) -> (Q -> R))"
    assert L.is_taut(S)
    els = [*heads("A rewrite ladder: GATE 2021's consequent becomes its antecedent", "Rewrite ladder (GATE 2021)", 640)]
    for k, (f, law) in enumerate(rungs):
        y, ny = 44 + k * 50, 44 + k * 58
        els.append(box(f"r{k}", 30, y, 300, 40, f, {"x": 10, "y": ny, "w": 340, "h": 34, "size": 13}, size=15, mono=True, hidden=k > 0))
        els.append(text(f"w{k}", 350, y + 26, law, {"x": 180, "y": ny + 49, "size": 12, "anchor": "middle"}, size=14, tone="muted", hidden=k > 0))
    els.append(text("foot", 320, 352, "", {"x": 180, "y": 400, "size": 13}, anchor="middle", size=15, tone="accent"))
    steps = [step(f"Rung {k}: {law}. The formula becomes {f}.", (f"r{k}", {"hidden": False, "tone": "accent"}), (f"w{k}", {"hidden": False}))
             for k, (f, law) in enumerate(rungs) if k > 0]
    steps[0]["caption"] = "Rung 1: remove the outer arrow with A → B ≡ ¬A ∨ B, taking A = P ∧ Q. Always remove arrows first."
    steps[2]["caption"] = "Rung 3: push the negation inward with De Morgan: ¬(P ∧ Q) becomes ¬P ∨ ¬Q. Now every ¬ sits on a variable."
    steps[4]["caption"] = "Rung 5: ¬P ∨ ¬Q ∨ R is exactly ¬(P ∧ Q) ∨ R, i.e. (P ∧ Q) → R: the antecedent of S. So S has the shape X → X, a tautology."
    steps[-1]["patches"].append({"id": "r5", "set": {"hidden": False, "tone": "success", "fill": "success"}})
    steps[-1]["patches"].append({"id": "foot", "set": {"text": "antecedent ≡ consequent, so S ≡ X → X ≡ T"}})
    assert 4 <= len(steps) <= 8
    return spec("A ladder of laws", (640, 366), (360, 412),
                "Proving an equivalence by laws: one rung per law, arrows out first, then negations in, then tidy up.", els, steps)


@scene
def falsify_tree():
    f = "((a -> b) & (b -> c)) -> (a -> c)"
    vs = ["a", "b", "c"]
    # forced values: conclusion false gives a = T, c = F
    conc = [r for r in L.rows(vs) if not L.ev(L.parse("a -> c"), r)]
    assert {(r["a"], r["c"]) for r in conc} == {(True, False)}
    # with a = T, a → b = T forces b = T
    ab = {r["b"] for r in L.rows(vs) if r["a"] and L.ev(L.parse("a -> b"), r)}
    assert ab == {True}
    # with b = T, b → c = T forces c = T: clash with c = F
    bc = {r["c"] for r in L.rows(vs) if r["b"] and L.ev(L.parse("b -> c"), r)}
    assert bc == {True}
    assert not [r for r in L.rows(vs) if not L.ev(L.parse(f), r)]
    W = 640
    nodes = [("n0", (120, 44, 400, 38), "((a→b) ∧ (b→c)) → (a→c) = F", "accent"),
             ("n1", (20, 112, 290, 38), "(a→b) ∧ (b→c) = T", None),
             ("n2", (330, 112, 290, 38), "a → c = F", None),
             ("n3", (330, 178, 290, 38), "so a = T and c = F", None),
             ("n4", (20, 178, 290, 38), "so a→b = T and b→c = T", None),
             ("n5", (20, 244, 600, 36), "a = T and a → b = T force b = T", None),
             ("n6", (20, 300, 600, 36), "b = T and b → c = T force c = T", None),
             ("n7", (120, 356, 400, 36), "clash: c = T and c = F", None)]
    els = [*heads("Trying to falsify the hypothetical syllogism", "Try to make it false", W)]
    for k, (i, (x, y, w, h), lab, tone) in enumerate(nodes):
        kw = {"size": 14, "mono": True, "hidden": k > 0}
        if tone:
            kw["tone"] = tone
        els.append(box(i, x, y, w, h, lab, {"x": 10, "y": 44 + k * 52, "w": 340, "h": 38, "size": 12}, **kw))
    els += [arrow("e1", "n0", "n1", None, hidden=True), arrow("e2", "n0", "n2", None, hidden=True),
            arrow("e3", "n2", "n3", None, hidden=True), arrow("e4", "n1", "n4", None, hidden=True),
            arrow("e5", "n4", "n5", None, hidden=True), arrow("e6", "n5", "n6", None, hidden=True),
            arrow("e7", "n6", "n7", None, hidden=True)]
    steps = [
        step("Assume the whole implication is F. An implication is false only as T → F, so the hypothesis must be T and the conclusion F.",
             ("n1", {"hidden": False}), ("n2", {"hidden": False}), ("e1", {"hidden": False}), ("e2", {"hidden": False})),
        step("The conclusion a → c is F, which forces a = T and c = F. These values are now fixed.",
             ("n3", {"hidden": False, "tone": "accent"}), ("e3", {"hidden": False})),
        step("The hypothesis is a true conjunction, so both parts are T: a → b = T and b → c = T.",
             ("n4", {"hidden": False, "tone": "accent"}), ("e4", {"hidden": False})),
        step("a is T and a → b is T, so b must be T (otherwise a → b would be T → F).",
             ("n5", {"hidden": False, "tone": "accent"}), ("e5", {"hidden": False})),
        step("b is T and b → c is T, so c must be T. But c was already forced to F.",
             ("n6", {"hidden": False, "tone": "accent"}), ("e6", {"hidden": False})),
        step("A clash: no row can make the formula false, so it is a tautology. No branching was needed; every value was forced.",
             ("n7", {"hidden": False, "tone": "danger", "fill": "danger"}), ("e7", {"hidden": False}), ("n0", {"tone": "success"})),
    ]
    return spec("The falsification test", (640, 404), (360, 464),
                "To test ((a → b) ∧ (b → c)) → (a → c), assume it is false and follow the forced values until they clash or settle.",
                els, steps)


@scene
def canonical_table():
    vs = ["p", "q", "r"]
    f = "(p & q) | (~q & r)"
    col = L.table(f, vs)
    rs = list(L.rows(vs))
    idx = [L.index_of(r, vs) for r in rs]
    assert idx == [7, 6, 5, 4, 3, 2, 1, 0]
    mins, maxs = L.minterms(f, vs), L.maxterms(f, vs)
    assert mins == [1, 5, 6, 7] and maxs == [0, 2, 3, 4]
    clauses = L.cnf(maxs, vs)
    assert L.equivalent(clauses, f)
    pcnf = "(p∨q∨r)(p∨¬q∨r)(p∨¬q∨¬r)(¬p∨q∨r)"
    assert L.equivalent(" & ".join("(" + c + ")" for c in pcnf[1:-1].split(")(")), f)
    head = ["p", "q", "r", "f", "#", "term"]

    def rows(k):
        out = [head]
        for i, r in enumerate(rs):
            row = [TF(r["p"]), TF(r["q"]), TF(r["r"]), TF(col[i]) if k >= 1 else "", str(idx[i]) if k >= 2 else "", ""]
            if k >= 3 and col[i]:
                row[5] = f"m{idx[i]}"
            if k >= 4 and not col[i]:
                row[5] = f"M{idx[i]}"
            out.append(row)
        return out
    tr = [i + 1 for i, v in enumerate(col) if v]
    fr = [i + 1 for i, v in enumerate(col) if not v]
    els = [*heads("Canonical forms of (p ∧ q) ∨ (¬q ∧ r)", "Canonical forms (GATE 1995)", 640),
           table("tt", 80, 44, 80, 30, rows(0), {"x": 12, "y": 44, "cellW": 56, "cellH": 30}, header=True, mono=True),
           text("s1", 320, 340, "", {"x": 180, "y": 340, "size": 13}, anchor="middle", size=15, mono=True),
           text("s2", 320, 366, "", {"x": 180, "y": 366, "size": 12}, anchor="middle", size=14, mono=True)]
    steps = [
        step("Fill the column of f: p ∧ q is true on TTT and TTF; ¬q ∧ r on TFT and FFT. Four true rows.",
             ("tt", {"rows": rows(1), "highlight": [[i, 3] for i in tr]})),
        step("Number each row by reading T = 1, F = 0 with p as the most significant bit: TTT is 7, down to FFF = 0.",
             ("tt", {"rows": rows(2), "highlight": [[i, 4] for i in range(1, 9)]})),
        step(f"Each true row gives a minterm, true on that row only. The PDNF is Σ({', '.join(map(str, mins))}).",
             ("tt", {"rows": rows(3), "highlight": [[i, 5] for i in tr]}), ("s1", {"text": f"PDNF = Σ({', '.join(map(str, mins))})", "tone": "success"})),
        step(f"Each false row gives a maxterm, false on that row only. The PCNF is Π({', '.join(map(str, maxs))}): the indices the PDNF left out.",
             ("tt", {"rows": rows(4), "highlight": [[i, 5] for i in fr]}), ("s1", {"text": f"Σ({', '.join(map(str, mins))})  =  Π({', '.join(map(str, maxs))})", "tone": "accent"})),
        step("Write each maxterm with plain = 0, negated = 1: row 010 gives p ∨ ¬q ∨ r. The four clauses are the answer to GATE 1995.",
             ("s2", {"text": "PCNF = " + pcnf, "tone": "danger"})),
    ]
    return spec("Minterms and maxterms from one table", (640, 380), (360, 380),
                "One truth table gives both canonical forms: true rows become minterms (Σ), false rows become maxterms (Π).", els, steps)


@scene
def completeness_map():
    order = [("¬", "not"), ("∧", "and"), ("∨", "or"), ("→", "imp"), ("↔", "iff"), ("⊕", "xor"), ("↑", "nand"), ("↓", "nor")]
    cls = ["T0", "T1", "self-dual", "monotone", "affine"]
    short = ["T₀", "T₁", "s-d", "mon", "aff"]
    pc = {k: L.post_classes(L.CONNECTIVES[k]) for _, k in order}
    rows = [[""] + short] + [[sym] + ["in" if c in pc[k] else "—" for c in cls] for sym, k in order]
    r = {k: i + 1 for i, (_, k) in enumerate(order)}
    trap1 = ["and", "or", "imp", "iff"]
    assert all("T1" in pc[k] for k in trap1) and not L.complete_set(trap1)
    assert all("affine" in pc[k] for k in ["iff", "not"]) and not L.complete_set(["iff", "not"])
    assert L.complete_set(["not", "and"]) and L.complete_set(["nand"]) and L.complete_set(["nor"])
    assert pc["nand"] == set() and pc["nor"] == set()
    outs_na = {c: [k for k in ["not", "and"] if c not in pc[k]] for c in cls}
    assert all(outs_na.values())
    els = [*heads("Post's five classes: which connective lies in which", "Post's classes", 640),
           table("tt", 110, 44, 70, 28, rows, {"x": 12, "y": 44, "cellW": 56, "cellH": 28}, header=True, mono=True),
           text("foot", 320, 318, "in = the connective lies in that class", {"x": 180, "y": 318, "size": 12}, anchor="middle", size=15, tone="muted")]
    steps = [
        step("Each column is a class closed under composition. A set of connectives is complete only if, in every column, some member of the set says '—' (it escapes).",
             ("tt", {"highlight": [[0, j] for j in range(1, 6)]})),
        step("{∧, ∨, →, ↔}: all four say 'in' under T₁ (they output T on all-T inputs). Trapped: ¬ can never be built, so the set is not complete.",
             ("tt", {"highlight": [[r[k], 2] for k in trap1]}), ("foot", {"text": "{∧, ∨, →, ↔}: trapped in T₁", "tone": "danger"})),
        step("{↔, ¬}: ¬ escapes T₁, but both are 'in' under affine. Everything they build is an XOR-type (linear) function, so ∧ is out of reach.",
             ("tt", {"highlight": [[r["iff"], 5], [r["not"], 5]]}), ("foot", {"text": "{↔, ¬}: trapped in the affine class", "tone": "danger"})),
        step("{¬, ∧}: under every column one of them escapes (¬ escapes T₀, T₁, monotone; ∧ escapes self-dual and affine). Complete.",
             ("tt", {"highlight": [[r["not"], 1], [r["not"], 2], [r["and"], 3], [r["not"], 4], [r["and"], 5]]}),
             ("foot", {"text": "{¬, ∧}: escapes all five, complete", "tone": "success"})),
        step("NAND and NOR are '—' in every column: each escapes all five classes on its own, so each alone is functionally complete.",
             ("tt", {"highlight": [[r["nand"], j] for j in range(1, 6)] + [[r["nor"], j] for j in range(1, 6)]}),
             ("foot", {"text": "↑ and ↓ alone are complete", "tone": "success"})),
    ]
    return spec("Post's completeness map", (640, 332), (360, 332),
                "Five properties are preserved by composition. A set of connectives is complete exactly when it can escape each of them.",
                els, steps)
