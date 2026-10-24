"""Viz scenes for dm/03-sets-relations-functions/01-sets. Every membership verdict, subset list, bit
string, table column, region list and count shown is computed here with setlib (and asserted), so the
scenes cannot drift from the checked maths. Scene names start with `sets-`."""
import math
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import setlib as S  # noqa: E402
from dmlib import box, circle, el, heads, node, spec, step, table, text  # noqa: E402
from setlib import E, fs  # noqa: E402

SPECS = {}
YN = lambda b: "true" if b else "false"  # noqa: E731


def scene(fn):
    SPECS[fn.__name__.replace("_", "-")] = fn()
    return fn


def cap(s):
    assert len(s) <= 140, (len(s), s)
    return s


@scene
def sets_nesting():
    Sx = fs("a", fs("b"), fs("a", "b"))
    assert len(Sx) == 3
    claims = [("{b} ∈ S", fs("b") in Sx), ("{b} ⊆ S", fs("b") <= Sx), ("{a} ⊆ S", fs("a") <= Sx),
              ("{a, b} ∈ S", fs("a", "b") in Sx), ("{a, b} ⊆ S", fs("a", "b") <= Sx), ("{{b}} ⊆ S", fs(fs("b")) <= Sx)]
    assert [v for _, v in claims] == [True, False, True, True, False, True]
    els = [*heads("Membership looks one level down; subset unpacks first", "∈ against ⊆", 640),
           box("outer", 20, 50, 380, 150, None, {"x": 10, "y": 46, "w": 340, "h": 130}, tone="accent"),
           text("sname", 34, 68, "S = {a, {b}, {a, b}}", {"x": 22, "y": 62, "size": 13}, size=14, mono=True, tone="accent"),
           box("ea", 40, 100, 60, 70, "a", {"x": 24, "y": 88, "w": 56, "h": 70}, size=16, mono=True),
           box("eb", 125, 90, 105, 90, None, {"x": 100, "y": 82, "w": 92, "h": 82}),
           box("eb1", 152, 115, 50, 44, "b", {"x": 122, "y": 102, "w": 48, "h": 44}, size=15, mono=True, tone="muted"),
           box("eab", 255, 90, 125, 90, None, {"x": 210, "y": 82, "w": 128, "h": 82}),
           box("eab1", 266, 115, 48, 44, "a", {"x": 220, "y": 102, "w": 50, "h": 44}, size=15, mono=True, tone="muted"),
           box("eab2", 322, 115, 48, 44, "b", {"x": 278, "y": 102, "w": 50, "h": 44}, size=15, mono=True, tone="muted"),
           text("lvl", 210, 222, "three elements: a, {b}, {a, b}", {"x": 180, "y": 196, "size": 13}, anchor="middle", size=14, tone="muted")]
    for k, (c, _) in enumerate(claims):
        y = 62 + k * 44
        ny = 222 + k * 36
        els.append(text(f"c{k}", 430, y, c, {"x": 20, "y": ny, "size": 14}, size=16, mono=True))
        els.append(text(f"v{k}", 560, y, "?", {"x": 200, "y": ny, "size": 14}, size=16, mono=True, tone="muted"))
    steps = [
        step(cap("The elements of S are the three items directly inside its box: a, the box {b} and the box {a, b}. The b on its own is not one of them."),
             ("ea", {"tone": "accent", "fill": "accent"}), ("eb", {"tone": "accent", "fill": "accent"}), ("eab", {"tone": "accent", "fill": "accent"})),
        step(cap("{b} ∈ S asks: is the box {b} itself lying in S? Yes, it is the middle item. {b} ⊆ S unpacks {b} first: is b in S? No."),
             ("eb", {"tone": "success", "fill": "success"}), ("ea", {"tone": "ink", "fill": "none"}), ("eab", {"tone": "ink", "fill": "none"}),
             ("v0", {"text": YN(claims[0][1]), "tone": "success"}), ("v1", {"text": YN(claims[1][1]), "tone": "danger"}), ("eb1", {"tone": "danger"})),
        step(cap("{a} ⊆ S unpacks to a, which lies directly in S: true. So a ∈ S and {a} ⊆ S say the same thing."),
             ("eb", {"tone": "ink", "fill": "none"}), ("eb1", {"tone": "muted"}), ("ea", {"tone": "success", "fill": "success"}),
             ("v2", {"text": YN(claims[2][1]), "tone": "success"})),
        step(cap("{a, b} is an element (the third item), but {a, b} ⊆ S fails: unpacking gives a (in S) and b (not in S)."),
             ("ea", {"tone": "ink", "fill": "none"}), ("eab", {"tone": "success", "fill": "success"}), ("eab2", {"tone": "danger"}),
             ("v3", {"text": YN(claims[3][1]), "tone": "success"}), ("v4", {"text": YN(claims[4][1]), "tone": "danger"})),
        step(cap("{{b}} ⊆ S unpacks one pair of braces to {b}, which is an element of S: true. Strip one pair of braces for ⊆, none for ∈."),
             ("eab", {"tone": "ink", "fill": "none"}), ("eab2", {"tone": "muted"}), ("eb", {"tone": "success", "fill": "success"}),
             ("v5", {"text": YN(claims[5][1]), "tone": "success"}), ("lvl", {"text": "X ∈ S: listed?   X ⊆ S: unpack, then listed?", "tone": "accent"})),
    ]
    return spec("Element or subset?", (640, 330), (360, 440),
                "A set is a box; its elements are what lies directly inside. Elements can be boxes too, which is where ∈ and ⊆ part ways.",
                els, steps)


@scene
def sets_powerset_doubling():
    stages = [[E]]
    for x in "abc":
        prev = stages[-1]
        stages.append(prev + [Y | {x} for Y in prev])
    assert [len(s) for s in stages] == [1, 2, 4, 8] and set(stages[-1]) == set(S.powerset("abc"))
    order = "abc"
    name = lambda Y: "∅" if not Y else "{" + ", ".join(sorted(Y)) + "}"  # noqa: E731
    head = ["subset", "bits abc"]

    def rows(k):
        return [head] + [[name(Y), S.bits(Y, order)] for Y in stages[k]] + [["", ""]] * (8 - len(stages[k]))
    els = [*heads("Building P({a, b, c}) by doubling", "Building P({a, b, c})", 640),
           table("t", 40, 46, 120, 28, rows(0), {"x": 20, "y": 44, "cellW": 104, "cellH": 26}, header=True, mono=True),
           text("n", 470, 90, "1 subset", {"x": 180, "y": 300, "size": 14}, anchor="middle", size=20, weight="bold", tone="accent"),
           text("why", 470, 130, "start: only ∅", {"x": 180, "y": 324, "size": 12}, anchor="middle", size=14, tone="muted"),
           text("rule", 470, 300, "", {"x": 180, "y": 352, "size": 12}, anchor="middle", size=14, tone="muted")]
    new = lambda k: [[i + 1, j] for i in range(len(stages[k - 1]), len(stages[k])) for j in range(2)]  # noqa: E731
    steps = [
        step(cap("Start with no elements: the only subset is ∅, the empty bit string. One subset."), ("t", {"highlight": [[1, 0], [1, 1]]})),
        step(cap("Add a. Every old subset stays (a out) and gets a twin with a added (a in): ∅ and {a}. Two subsets."),
             ("t", {"rows": rows(1), "highlight": new(1)}), ("n", {"text": "2 subsets"}), ("why", {"text": "old ones + old ones with a"})),
        step(cap("Add b. The two old subsets stay and their twins {b}, {a, b} appear. Four subsets: the count doubles."),
             ("t", {"rows": rows(2), "highlight": new(2)}), ("n", {"text": "4 subsets"}), ("why", {"text": "old ones + old ones with b"})),
        step(cap("Add c. Four old subsets and four twins with c. Eight subsets, one for each 3-bit string 000 … 111."),
             ("t", {"rows": rows(3), "highlight": new(3)}), ("n", {"text": "8 subsets"}), ("why", {"text": "old ones + old ones with c"})),
        step(cap("Each element is an in/out switch, so n elements give 2ⁿ subsets: the bit strings are the subsets."),
             ("t", {"highlight": [[i, 1] for i in range(1, 9)]}), ("n", {"text": "2³ = 8", "tone": "success"}),
             ("rule", {"text": "each new element doubles the count", "tone": "accent"})),
    ]
    return spec("Doubling the power set", (640, 320), (360, 370),
                "We add the elements a, b, c one at a time and watch the number of subsets double.", els, steps)


@scene
def sets_bit_ops():
    U = list(range(1, 9))
    A, B = fs(1, 2, 3, 4), fs(3, 4, 5, 6)
    a, b = S.bits(A, U), S.bits(B, U)
    ops = [("A ∪ B", "or", A | B), ("A ∩ B", "and", A & B), ("A − B", "andnot", A - B), ("A Δ B", "xor", A ^ B)]
    for _, op, X in ops:
        assert S.from_bits(S.bitop(a, b, op), U) == X
    labels = [str(u) for u in U]
    els = [*heads("Sets as bit strings: each operation is one bit rule", "Sets as bit strings", 640),
           text("la", 150, 80, "A", {"x": 60, "y": 76, "size": 13}, anchor="end", size=16, mono=True),
           el("ba", "bits", {"x": 74, "y": 58, "cell": 32}, x=170, y=58, bits=a, cell=40, labels=labels),
           text("lb", 150, 130, "B", {"x": 60, "y": 120, "size": 13}, anchor="end", size=16, mono=True),
           el("bb", "bits", {"x": 74, "y": 104, "cell": 32}, x=170, y=110, bits=b, cell=40)]
    rule = {"or": "OR: 1 if either is 1", "and": "AND: 1 if both are 1", "andnot": "A AND NOT B", "xor": "XOR: 1 if they differ"}
    for k, (lab, op, _) in enumerate(ops):
        y = 180 + k * 50
        ny = 160 + k * 46
        els.append(text(f"l{k}", 150, y + 20, lab, {"x": 60, "y": ny + 16, "size": 13}, anchor="end", size=16, mono=True, hidden=True))
        els.append(el(f"r{k}", "bits", {"x": 74, "y": ny, "cell": 32}, x=170, y=y, bits=S.bitop(a, b, op), cell=40, hidden=True))
    els.append(text("note", 320, 400, "U = {1, …, 8}; bit i is 1 iff i is in the set", {"x": 180, "y": 360, "size": 12}, anchor="middle", size=14, tone="muted"))
    one = lambda s: [i for i, c in enumerate(s) if c == "1"]  # noqa: E731
    steps = [step(cap("A = {1, 2, 3, 4} and B = {3, 4, 5, 6} as 8-bit strings over U = {1, …, 8}: bit i records whether i is in the set."),
                  ("ba", {"highlight": one(a)}), ("bb", {"highlight": one(b)}))]
    for k, (lab, op, X) in enumerate(ops):
        r = S.bitop(a, b, op)
        steps.append(step(cap(f"{lab} = {S.show(X)}: {rule[op]}, position by position, gives {r}."),
                          (f"l{k}", {"hidden": False}), (f"r{k}", {"hidden": False, "highlight": one(r), "tone": "accent"}),
                          ("note", {"text": rule[op], "tone": "accent"})))
    return spec("Set operations on bit strings", (640, 420), (360, 380),
                "Store a subset of an ordered universe as a row of bits. Union, intersection, difference and symmetric difference become OR, AND, AND-NOT and XOR.",
                els, steps)


@scene
def sets_membership_table():
    exprs = [lambda s: s["B"] & s["C"], lambda s: s["A"] - (s["B"] & s["C"]), lambda s: s["A"] - s["B"],
             lambda s: s["A"] - s["C"], lambda s: (s["A"] - s["B"]) | (s["A"] - s["C"])]
    rows_ = S.membership_table(exprs)
    assert [r[4] for r in rows_] == [r[7] for r in rows_] == [0, 1, 1, 1, 0, 0, 0, 0]
    head = ["A", "B", "C", "B∩C", "L", "A−B", "A−C", "R"]

    def rows(k):
        out = [head]
        for r in rows_:
            cells = [str(v) for v in r]
            shown = 3 + k
            out.append(cells[:shown] + [""] * (8 - shown))
        return out
    els = [*heads("A membership table proves A − (B ∩ C) = (A − B) ∪ (A − C)", "Membership table", 640),
           text("def", 320, 50, "L = A − (B ∩ C),   R = (A − B) ∪ (A − C)", {"x": 180, "y": 48, "size": 12}, anchor="middle", size=15, mono=True),
           table("t", 40, 66, 70, 28, rows(0), {"x": 12, "y": 64, "cellW": 42, "cellH": 26}, header=True, mono=True),
           text("note", 320, 334, "8 rows: every membership pattern of one element", {"x": 180, "y": 312, "size": 12}, anchor="middle", size=14, tone="muted")]
    col = lambda j: [[i, j] for i in range(1, 9) if rows_[i - 1][j] == 1]  # noqa: E731
    steps = [
        step(cap("Each row is one membership pattern of an element (1 = in). Three sets give 2³ = 8 rows, from 111 down to 000.")),
        step(cap("Column B∩C: 1 only where both B and C are 1 (rows 1 and 5)."), ("t", {"rows": rows(1), "highlight": col(3)})),
        step(cap("Column L = A − (B∩C): 1 where A is 1 and B∩C is 0: rows 2, 3, 4."), ("t", {"rows": rows(2), "highlight": col(4)}),
             ("note", {"text": "L is A with the triple overlap removed", "tone": "accent"})),
        step(cap("Columns A−B and A−C: A is 1 and the other set is 0."), ("t", {"rows": rows(4), "highlight": col(5) + col(6)})),
        step(cap("Column R is the OR of those two: rows 2, 3, 4 again. Columns L and R agree on all 8 rows, so the sets are equal."),
             ("t", {"rows": rows(5), "highlight": col(4) + col(7)}), ("note", {"text": "same column ⇒ same set, for all A, B, C", "tone": "success"})),
    ]
    return spec("A membership table", (640, 350), (360, 330),
                "A membership table is a truth table for set membership. If two expressions have the same final column, they are equal for every choice of sets.",
                els, steps)


VENN_W = {"A": (255, 160), "B": (355, 160), "C": (305, 245)}
REG_W = {"ABC": (305, 188), "AB": (305, 128), "AC": (258, 226), "BC": (352, 226), "A": (215, 140), "B": (395, 140), "C": (305, 292), "-": (90, 300)}


def nar(p, ox=180, oy=150):
    return (round(ox + (p[0] - 305) * 0.72, 1), round(oy + (p[1] - 195) * 0.72, 1))


@scene
def sets_venn_regions():
    X = lambda s: (s["A"] - s["B"]) - s["C"]  # noqa: E731
    Y = lambda s: (s["A"] - s["C"]) - (s["B"] - s["C"])  # noqa: E731
    lists = {"A−B": S.regions_of(lambda s: s["A"] - s["B"]), "X": S.regions_of(X), "A−C": S.regions_of(lambda s: s["A"] - s["C"]),
             "B−C": S.regions_of(lambda s: s["B"] - s["C"]), "Y": S.regions_of(Y)}
    assert lists == {"A−B": ["AC", "A"], "X": ["A"], "A−C": ["AB", "A"], "B−C": ["AB", "B"], "Y": ["A"]}
    assert S.identity(X, Y) and S.brute_equal(X, Y) is None
    els = [*heads("Venn regions: (A − B) − C against (A − C) − (B − C)", "Venn regions (GATE 2005)", 640)]
    for k, (cx, cy) in VENN_W.items():
        nx, ny = nar((cx, cy))
        els.append(circle(f"c{k}", cx, cy, 95, None, {"cx": nx, "cy": ny, "r": 68}, tone={"A": "accent", "B": "info", "C": "warning"}[k]))
    lab = {"A": (180, 82), "B": (430, 82), "C": (305, 355)}
    for k, (x, y) in lab.items():
        nx, ny = nar((x, y))
        els.append(text(f"t{k}", x, y, k, {"x": nx, "y": ny, "size": 14}, anchor="middle", size=18, weight="bold"))
    for r, p in REG_W.items():
        nx, ny = nar(p) if r != "-" else (30, 52)
        els.append(node(f"r{r}", p[0], p[1], 19, r, {"cx": nx, "cy": ny, "r": 15, "size": 11}, size=12, mono=True, tone="muted"))
    els += [text("e1", 450, 230, "", {"x": 180, "y": 330, "size": 13}, size=15, mono=True, anchor="start"),
            text("e2", 450, 262, "", {"x": 180, "y": 356, "size": 13}, size=15, mono=True, anchor="start"),
            text("e3", 450, 300, "", {"x": 180, "y": 386, "size": 13}, size=15, anchor="start", weight="bold")]
    # narrow: the expression lines are centred under the diagram
    for e in els[-3:]:
        e["narrow"]["anchor"] = "middle"

    def lit(regs, tone):
        return [(f"r{r}", {"tone": tone, "fill": tone, "emphasis": "strong"}) for r in regs]

    def unlit(regs):
        return [(f"r{r}", {"tone": "muted", "fill": "none", "emphasis": "soft"}) for r in regs]
    allr = list(REG_W)
    steps = [
        step(cap("Three circles cut the universe into 8 regions, one per membership pattern. Each is named by the sets that contain it; − is outside all.")),
        step(cap("A − B keeps the part of A outside B: regions AC and A."), *lit(lists["A−B"], "accent"), ("e1", {"text": "A − B = {AC, A}"})),
        step(cap("Removing C deletes AC. So X = (A − B) − C is the single region A: in A, not in B, not in C."),
             *unlit(["AC"]), *lit(lists["X"], "success"), ("e2", {"text": "X = {A}", "tone": "success"})),
        step(cap("For Y: A − C = {AB, A} and B − C = {AB, B}."), *unlit(allr), *lit(["AB", "A"], "accent"), *lit(["B"], "info"),
             ("e1", {"text": "A − C = {AB, A}"}), ("e2", {"text": "B − C = {AB, B}", "tone": "info"})),
        step(cap("Removing B − C from A − C deletes AB and leaves the region A. Y has the same region list as X."),
             *unlit(allr), *lit(lists["Y"], "success"), ("e1", {"text": "Y = {A}", "tone": "success"}), ("e2", {"text": "X = {A}", "tone": "success"})),
        step(cap("Same regions, so X = Y for every choice of A, B, C. Neither is a proper subset of the other."),
             ("e3", {"text": "X = Y = A ∩ Bᶜ ∩ Cᶜ", "tone": "success"})),
    ]
    return spec("Comparing expressions by Venn regions", (640, 380), (360, 400),
                "Every expression in A, B, C is a list of some of the 8 Venn regions. Two expressions are equal for all sets exactly when their lists agree.",
                els, steps)


@scene
def sets_choice_grid():
    n = 4
    pats = [(1, 1), (0, 1), (1, 0), (0, 0)]
    ok = [p for p in pats if S.allowed_patterns(2, lambda a, b: a <= b).count(p)]
    assert ok == [(1, 1), (0, 1), (0, 0)]
    assert S.count_tuples(n, 2, lambda a, b: a <= b) == 3 ** n == 81
    head = ["element", "in both", "B only", "A only", "neither"]
    base = [head] + [[str(i), "", "", "", ""] for i in range(1, n + 1)]

    def fill(mark_forbidden):
        out = [head]
        for i in range(1, n + 1):
            out.append([str(i), "✓", "✓", "✗" if mark_forbidden else "✓", "✓"])
        return out
    els = [*heads("Counting pairs (A, B) with A ⊆ B, one element at a time", "Pairs with A ⊆ B", 640),
           table("t", 60, 50, 104, 34, base, {"x": 15, "y": 48, "cellW": 66, "cellH": 30}, header=True),
           text("prod", 320, 250, "", {"x": 180, "y": 220, "size": 14}, anchor="middle", size=18, mono=True, weight="bold"),
           text("note", 320, 286, "S = {1, 2, 3, 4}", {"x": 180, "y": 252, "size": 12}, anchor="middle", size=14, tone="muted")]
    steps = [
        step(cap("Each element of S = {1, 2, 3, 4} has four possible statuses: in both sets, in B only, in A only, in neither."),
             ("t", {"rows": fill(False), "highlight": [[i, j] for i in range(1, n + 1) for j in range(1, 5)]})),
        step(cap("A ⊆ B forbids exactly one status: being in A but not in B. Cross that column out."),
             ("t", {"rows": fill(True), "highlight": [[i, 3] for i in range(1, n + 1)]}), ("note", {"text": "forbidden: in A, not in B", "tone": "danger"})),
        step(cap("Every element now picks one of 3 statuses, independently of the others, and each choice list is a different pair."),
             ("t", {"highlight": [[i, j] for i in range(1, n + 1) for j in (1, 2, 4)]}), ("note", {"text": "3 choices per element", "tone": "accent"})),
        step(cap("Multiply over the four elements: 3 × 3 × 3 × 3 = 81 pairs. An enumeration of all 256 pairs finds exactly 81."),
             ("prod", {"text": "3 · 3 · 3 · 3 = 3⁴ = 81", "tone": "success"})),
        step(cap("In general 3ⁿ; for |S| = 10 (GATE 2021) that is 3¹⁰ = 59049. Other conditions just change the number of allowed statuses."),
             ("note", {"text": "|S| = n  ⇒  3ⁿ pairs;  n = 10: 59049", "tone": "accent"})),
    ]
    assert 3 ** 10 == 59049 and 4 ** n == 256
    return spec("Each element chooses", (640, 300), (360, 270),
                "To count pairs of subsets, let every element choose its own membership status. The condition removes some statuses; the rest multiply.",
                els, steps)


assert all(math.isfinite(s["width"]) for s in SPECS.values())
