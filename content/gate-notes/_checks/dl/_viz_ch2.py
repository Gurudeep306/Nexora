"""Generator for the Viz scenes of Digital Logic Chapter 2 (Boolean algebra and logic gates).

Every truth value, minterm list and caption number is computed here with boollib, so the scenes
cannot drift from the checked maths. Gate symbols use the Viz `gate` element; wires are `line`
elements ending exactly on the pins computed by boollib.gate_pins (the mirror of the reader's
geometry). Each scene has a wide canvas and a narrow (phone) canvas.

    python3 content/gate-notes/_checks/dl/_viz_ch2.py      # write the JSON files
    python3 content/gate-notes/_checks/dl/viz_ch2.py       # (check) files == generator output
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
from _viz_ch1_fp import spec, step, el, text, box, bits, line, heads, VIZ_DIR  # noqa: E402,F401

SPECS = {}


def scene(fn):
    SPECS[fn.__name__.replace("_", "-")] = fn
    return fn


def gate(id, x, y, w, h, kind, n=None, **kw):
    return el(id, "gate", n, x=x, y=y, w=w, h=h, kind=kind, **kw)


def pins(kind, x, y, w, h, inputs=None, bubbles=()):
    return bl.gate_pins(kind, x, y, w, h, inputs, bubbles)


def wire(id, a, b, n=None, mid=None, **kw):
    """An orthogonal wire from point a to point b (horizontal, vertical, horizontal)."""
    ax, ay = a
    bx, by = b
    if ay == by:
        pts = [[ax, ay], [bx, by]]
    else:
        mx = mid if mid is not None else round((ax + bx) / 2, 2)
        pts = [[ax, ay], [mx, ay], [mx, by], [bx, by]]
    return line(id, pts, n, **kw)


def wire_pts(a, b, mid=None):
    ax, ay = a
    bx, by = b
    if ay == by:
        return [[ax, ay], [bx, by]]
    mx = mid if mid is not None else round((ax + bx) / 2, 2)
    return [[ax, ay], [mx, ay], [mx, by], [bx, by]]


def tone(v):
    return "success" if v else "muted"


# ── Lesson 1: logic gates ───────────────────────────────────────────────────

@scene
def switch_model():
    """Series switches = AND, parallel switches = OR, stepped through the four rows."""
    rows = [(a, b) for a in (0, 1) for b in (0, 1)]
    AND = [a & b for a, b in rows]
    OR = [a | b for a, b in rows]
    assert AND == list(bl.tt("AB", ["A", "B"])) and OR == list(bl.tt("A + B", ["A", "B"]))

    def blade(px, py, closed):
        return [[px, py], [px + 40, py]] if closed else [[px, py], [px + 34, py - 20]]

    els = [*heads("Switches and a lamp: series is AND, parallel is OR", "Series = AND, parallel = OR", 640)]
    # Series panel (wide: left; narrow: top).
    sx, sy, nsx, nsy = 40, 92, 30, 72
    els += [
        text("st", sx + 130, 58, "Series: A then B", {"x": 180, "y": nsy - 24, "size": 14}, anchor="middle", size=15, weight="bold"),
        line("sl1", [[sx, sy + 30], [sx + 40, sy + 30]], {"points": [[nsx, nsy + 30], [nsx + 40, nsy + 30]]}),
        line("sl2", [[sx + 80, sy + 30], [sx + 130, sy + 30]], {"points": [[nsx + 80, nsy + 30], [nsx + 130, nsy + 30]]}),
        line("sl3", [[sx + 170, sy + 30], [sx + 230, sy + 30], [sx + 230, sy + 110], [sx, sy + 110], [sx, sy + 30]],
             {"points": [[nsx + 170, nsy + 30], [nsx + 300, nsy + 30], [nsx + 300, nsy + 110], [nsx, nsy + 110], [nsx, nsy + 30]]}),
        line("sa", blade(sx + 40, sy + 30, False), {"points": blade(nsx + 40, nsy + 30, False)}, tone="accent"),
        line("sb", blade(sx + 130, sy + 30, False), {"points": blade(nsx + 130, nsy + 30, False)}, tone="accent"),
        text("sal", sx + 58, sy + 50, "A", {"x": nsx + 58, "y": nsy + 50}, anchor="middle", size=14, weight="bold"),
        text("sbl", sx + 148, sy + 50, "B", {"x": nsx + 148, "y": nsy + 50}, anchor="middle", size=14, weight="bold"),
        el("slamp", "circle", {"cx": nsx + 300, "cy": nsy + 70, "r": 16}, cx=sx + 230, cy=sy + 70, r=16, fill="none", label="off", size=11),
        box("sbat", sx + 90, sy + 100, 50, 20, "battery", {"x": nsx + 120, "y": nsy + 100}, size=11, fill="none"),
    ]
    # Parallel panel.
    px, py, npx, npy = 350, 92, 30, 250
    els += [
        text("pt", px + 120, 58, "Parallel: A or B", {"x": 180, "y": npy - 30, "size": 14}, anchor="middle", size=15, weight="bold"),
        line("pl1", [[px, py + 30], [px + 60, py + 30]], {"points": [[npx, npy + 30], [npx + 60, npy + 30]]}),
        line("pl1b", [[px + 60, py + 10], [px + 60, py + 60]], {"points": [[npx + 60, npy + 10], [npx + 60, npy + 60]]}),
        line("pl2", [[px + 60, py + 10], [px + 80, py + 10]], {"points": [[npx + 60, npy + 10], [npx + 80, npy + 10]]}),
        line("pl3", [[px + 60, py + 60], [px + 80, py + 60]], {"points": [[npx + 60, npy + 60], [npx + 80, npy + 60]]}),
        line("pl4", [[px + 120, py + 10], [px + 160, py + 10], [px + 160, py + 60], [px + 120, py + 60]],
             {"points": [[npx + 120, npy + 10], [npx + 160, npy + 10], [npx + 160, npy + 60], [npx + 120, npy + 60]]}),
        line("pl5", [[px + 160, py + 35], [px + 250, py + 35], [px + 250, py + 110], [px, py + 110], [px, py + 30]],
             {"points": [[npx + 160, npy + 35], [npx + 300, npy + 35], [npx + 300, npy + 110], [npx, npy + 110], [npx, npy + 30]]}),
        line("pa", blade(px + 80, py + 10, False), {"points": blade(npx + 80, npy + 10, False)}, tone="accent"),
        line("pb", blade(px + 80, py + 60, False), {"points": blade(npx + 80, npy + 60, False)}, tone="accent"),
        text("pal", px + 50, py + 2, "A", {"x": npx + 50, "y": npy + 2}, anchor="middle", size=14, weight="bold"),
        text("pbl", px + 50, py + 76, "B", {"x": npx + 50, "y": npy + 76}, anchor="middle", size=14, weight="bold"),
        el("plamp", "circle", {"cx": npx + 300, "cy": npy + 72, "r": 16}, cx=px + 250, cy=py + 72, r=16, fill="none", label="off", size=11),
        box("pbat", px + 90, py + 100, 50, 20, "battery", {"x": npx + 120, "y": npy + 100}, size=11, fill="none"),
    ]
    table0 = [["A", "B", "series", "parallel"]] + [[" ", " ", " ", " "] for _ in rows]
    els.append(el("tt", "table", {"x": 60, "y": 400, "cellW": 60, "cellH": 26}, x=170, y=222, cellW=74, cellH=26, rows=table0, header=True, mono=True))
    steps = []
    cur = [r[:] for r in table0]
    for k, (a, b) in enumerate(rows):
        cur[k + 1] = [str(a), str(b), str(AND[k]), str(OR[k])]
        words = {0: "open", 1: "closed"}
        cap = (f"A = {a} ({words[a]}), B = {b} ({words[b]}). Series: the lamp is {'on' if AND[k] else 'off'}"
               f"{', both switches are closed' if AND[k] else ', an open switch breaks the only path'}. "
               f"Parallel: the lamp is {'on' if OR[k] else 'off'}"
               f"{', at least one path is closed' if OR[k] else ', both paths are open'}.")
        steps.append(step(cap,
                          ("sa", {"points": blade(sx + 40, sy + 30, a)}), ("sb", {"points": blade(sx + 130, sy + 30, b)}),
                          ("pa", {"points": blade(px + 80, py + 10, a)}), ("pb", {"points": blade(px + 80, py + 60, b)}),
                          ("slamp", {"fill": "warning" if AND[k] else "none", "label": "on" if AND[k] else "off", "tone": "warning" if AND[k] else "ink"}),
                          ("plamp", {"fill": "warning" if OR[k] else "none", "label": "on" if OR[k] else "off", "tone": "warning" if OR[k] else "ink"}),
                          ("tt", {"rows": [r[:] for r in cur], "highlight": [[k + 1, 2], [k + 1, 3]]})))
    steps.append(step("The finished table: the series lamp is the AND of the switches (on only when both are closed); the parallel lamp is the OR (on when at least one is closed).",
                      ("tt", {"highlight": []})))
    # Narrow layout: the blades move with their panel, so the narrow geometry of the blades is per-step;
    # the engine applies the narrow override after patches, so blades in the narrow layout use their own
    # positions and only change tone. To keep the animation on phones, give narrow-only twins.
    for idn, (bx0, by0), (nx0, ny0) in [("sa", (sx + 40, sy + 30), (nsx + 40, nsy + 30)), ("sb", (sx + 130, sy + 30), (nsx + 130, nsy + 30)),
                                       ("pa", (px + 80, py + 10), (npx + 80, npy + 10)), ("pb", (px + 80, py + 60), (npx + 80, npy + 60))]:
        for e in els:
            if e["id"] == idn:
                e.pop("narrow")
                e["only"] = "wide"
        els.append(line(idn + "n", blade(nx0, ny0, False), "narrow", tone="accent"))
        for k, (a, b) in enumerate(rows):
            closed = a if idn in ("sa", "pa") else b
            steps[k]["patches"].append({"id": idn + "n", "set": {"points": blade(nx0, ny0, closed)}})
    return spec("Switches and a lamp: series is AND, parallel is OR", (640, 362), (360, 560),
                "Two switches, A and B, wired in series (left) and in parallel (right). A closed switch is 1, an open one is 0; a lit lamp is 1.",
                els, steps)


GATES7 = [("not", "NOT", "A'"), ("and", "AND", "AB"), ("or", "OR", "A + B"), ("nand", "NAND", "(AB)'"),
          ("nor", "NOR", "(A + B)'"), ("xor", "XOR", "A \\oplus B"), ("xnor", "XNOR", "A \\odot B")]


@scene
def gate_symbols():
    rows = [(a, b) for a in (0, 1) for b in (0, 1)]
    cols = {k: bl.tt(expr, ["A", "B"]) if k != "not" else tuple(1 - a for a, _ in rows) for k, _, expr in GATES7}
    assert cols["not"] == (1, 1, 0, 0) and cols["xor"] == (0, 1, 1, 0) and cols["nand"] == (1, 1, 1, 0)
    W, NW = 680, 360
    els = [*heads("The seven gates, row by row", "The seven gates, row by row", W),
           text("row", W / 2, 50, "", {"x": NW / 2, "y": 50, "size": 14}, anchor="middle", size=15, tone="accent", mono=True)]
    gw, gh = 62, 42

    def cell(k, wide):
        if wide:
            c, r = k % 4, k // 4
            return 20 + c * 166, 80 + r * 150
        c, r = k % 2, k // 2
        return 10 + c * 175, 80 + r * 150

    for k, (kind, name, _) in enumerate(GATES7):
        x0, y0 = cell(k, True)
        nx0, ny0 = cell(k, False)
        gx, gy, ngx, ngy = x0 + 40, y0 + 6, nx0 + 40, ny0 + 6
        n_in = 1 if kind == "not" else 2
        p, o = pins(kind, gx, gy, gw, gh, n_in)
        np_, no = pins(kind, ngx, ngy, gw, gh, n_in)
        els.append(gate(f"g{k}", gx, gy, gw, gh, kind, {"x": ngx, "y": ngy}))
        for j in range(n_in):
            lab = "AB"[j]
            els.append(wire(f"w{k}{j}", [x0 + 14, p[j][1]], p[j], {"points": wire_pts([nx0 + 14, np_[j][1]], np_[j])}))
            els.append(text(f"l{k}{j}", x0 + 6, p[j][1], lab, {"x": nx0 + 6, "y": np_[j][1]}, anchor="middle", size=13, weight="bold"))
        els.append(wire(f"o{k}", o, [o[0] + 18, o[1]], {"points": [no, [no[0] + 18, no[1]]]}))
        els.append(text(f"v{k}", o[0] + 30, o[1], "", {"x": no[0] + 30, "y": no[1]}, anchor="middle", size=17, weight="bold", mono=True))
        els.append(text(f"n{k}", gx + gw / 2, gy + gh + 16, name, {"x": ngx + gw / 2, "y": ngy + gh + 16}, anchor="middle", size=14, weight="bold"))
        els.append(bits(f"t{k}", x0 + 30, y0 + 92, "    ", 22, {"x": nx0 + 30, "y": ny0 + 92}, labels=["00", "01", "10", "11"]))
    steps = []
    for r, (a, b) in enumerate(rows):
        pat = [("row", {"text": f"A = {a}, B = {b}  (row {r})"})]
        desc = []
        for k, (kind, name, _) in enumerate(GATES7):
            v = cols[kind][r]
            filled = "".join(str(cols[kind][i]) if i <= r else " " for i in range(4))
            pat += [(f"v{k}", {"text": str(v), "tone": tone(v)}), (f"t{k}", {"bits": filled, "highlight": [r]}),
                    (f"g{k}", {"fill": "success" if v else "none"}), (f"o{k}", {"tone": tone(v)})]
            desc.append(f"{name} {v}")
        steps.append(step(f"Row {r}: A = {a}, B = {b}. Outputs: " + ", ".join(desc) + ".", *pat))
    fin = [(f"t{k}", {"highlight": []}) for k in range(7)]
    steps.append(step("Each gate's four outputs, read top to bottom, are its truth table: NOT 1100 (it reads only A), AND 0001, OR 0111, NAND 1110, NOR 1000, XOR 0110, XNOR 1001.",
                      *fin, ("row", {"text": "rows 00, 01, 10, 11"})))
    return spec("The seven logic gates with their truth tables filling row by row", (W, 380), (NW, 680),
                "NOT, AND, OR, NAND, NOR, XOR and XNOR, each fed by the inputs A and B (NOT reads only A). The strip under each gate will hold its output for rows 00, 01, 10 and 11.",
                els, steps)


@scene
def bubble_push():
    AB = ["A", "B"]
    nand, bub_or = bl.tt("(AB)'", AB), bl.tt("A' + B'", AB)
    nor, bub_and = bl.tt("(A + B)'", AB), bl.tt("A'B'", AB)
    assert nand == bub_or == (1, 1, 1, 0) and nor == bub_and == (1, 0, 0, 0)
    W, NW = 640, 360
    gx, gy, gw, gh = 150, 80, 80, 54
    ngx, ngy = 120, 80
    p, o = pins("nand", gx, gy, gw, gh)
    np_, no = pins("nand", ngx, ngy, gw, gh)
    pb, ob = pins("or", gx, gy, gw, gh, 2, (0, 1))
    npb, nob = pins("or", ngx, ngy, gw, gh, 2, (0, 1))
    els = [*heads("Bubble pushing: De Morgan in pictures", "Bubble pushing (De Morgan)", W),
           gate("g", gx, gy, gw, gh, "nand", {"x": ngx, "y": ngy}),
           wire("wa", [gx - 50, p[0][1]], p[0], {"points": [[ngx - 50, np_[0][1]], np_[0]]}),
           wire("wb", [gx - 50, p[1][1]], p[1], {"points": [[ngx - 50, np_[1][1]], np_[1]]}),
           text("la", gx - 60, p[0][1], "A", {"x": ngx - 60, "y": np_[0][1]}, anchor="middle", size=15, weight="bold"),
           text("lb", gx - 60, p[1][1], "B", {"x": ngx - 60, "y": np_[1][1]}, anchor="middle", size=15, weight="bold"),
           wire("wo", o, [o[0] + 40, o[1]], {"points": [no, [no[0] + 40, no[1]]]}),
           text("eq", o[0] + 50, o[1], "(AB)′", {"x": no[0] + 46, "y": no[1], "size": 14}, anchor="start", size=16, mono=True),
           text("name", gx + gw / 2, gy + gh + 22, "NAND = AND with an output bubble", {"x": NW / 2, "y": ngy + gh + 22, "size": 13}, anchor="middle", size=15),
           el("tab", "table", {"x": 30, "y": 210, "cellW": 75, "cellH": 26}, x=330, y=170, cellW=70, cellH=26, header=True, mono=True,
              rows=[["A", "B", "(AB)′", "A′+B′"]] + [[str(a), str(b), " ", " "] for a in (0, 1) for b in (0, 1)])]
    rows4 = [[str(a), str(b)] for a in (0, 1) for b in (0, 1)]

    def tab(c1, c2, head):
        return [head] + [r + [c1[i], c2[i]] for i, r in enumerate(rows4)]

    s = lambda t: [str(v) for v in t]
    blank = [" "] * 4
    steps = [
        step("A NAND gate is an AND gate followed by NOT. Its output is 0 only when both inputs are 1: the column (AB)′ reads 1, 1, 1, 0.",
             ("tab", {"rows": tab(s(nand), blank, ["A", "B", "(AB)′", "A′+B′"]), "highlight": [[4, 2]]})),
        step("Push the bubble backwards through the gate. Two things change: the body flips from AND to OR, and the one bubble splits into a bubble on every input.",
             ("g", {"kind": "or", "bubbles": [0, 1], "tone": "accent"}), ("wa", {"points": [[gx - 50, pb[0][1]], pb[0]]}),
             ("wb", {"points": [[gx - 50, pb[1][1]], pb[1]]}), ("eq", {"text": "A′ + B′"}),
             ("name", {"text": "the same gate drawn as an OR with bubbled inputs"})),
        step("Check it: A′ + B′ is 1 unless both A and B are 1, exactly the NAND column. This is De Morgan's law (AB)′ = A′ + B′.",
             ("tab", {"rows": tab(s(nand), s(bub_or), ["A", "B", "(AB)′", "A′+B′"]), "highlight": [[1, 3], [2, 3], [3, 3], [4, 3]]})),
        step("The same move turns a NOR into an AND with bubbled inputs: (A + B)′ = A′B′. Both are 1 only on row 00.",
             ("g", {"kind": "and", "bubbles": [0, 1], "tone": "info"}), ("eq", {"text": "A′B′ = (A+B)′"}),
             ("wa", {"points": [[gx - 50, pins("and", gx, gy, gw, gh, 2, (0, 1))[0][0][1]], pins("and", gx, gy, gw, gh, 2, (0, 1))[0][0]]}),
             ("wb", {"points": [[gx - 50, pins("and", gx, gy, gw, gh, 2, (0, 1))[0][1][1]], pins("and", gx, gy, gw, gh, 2, (0, 1))[0][1]]}),
             ("name", {"text": "NOR drawn as an AND with bubbled inputs"}),
             ("tab", {"rows": tab(s(nor), s(bub_and), ["A", "B", "(A+B)′", "A′B′"]), "highlight": [[1, 2], [1, 3]]})),
        step("The rule: moving bubbles across a gate swaps AND and OR and complements every input and output it crosses. Two bubbles on one wire cancel.",
             ("tab", {"highlight": []})),
    ]
    # Narrow layout: wires keep their phone geometry, so give the moved wires narrow twins.
    for e in els:
        if e["id"] in ("wa", "wb"):
            e.pop("narrow")
            e["only"] = "wide"
    els += [wire("wan", [ngx - 50, np_[0][1]], np_[0], "narrow"), wire("wbn", [ngx - 50, np_[1][1]], np_[1], "narrow")]
    nand_and = pins("and", ngx, ngy, gw, gh, 2, (0, 1))[0]
    steps[1]["patches"] += [{"id": "wan", "set": {"points": [[ngx - 50, npb[0][1]], npb[0]]}}, {"id": "wbn", "set": {"points": [[ngx - 50, npb[1][1]], npb[1]]}}]
    steps[3]["patches"] += [{"id": "wan", "set": {"points": [[ngx - 50, nand_and[0][1]], nand_and[0]]}}, {"id": "wbn", "set": {"points": [[ngx - 50, nand_and[1][1]], nand_and[1]]}}]
    return spec("Bubble pushing turns NAND into a bubbled OR and NOR into a bubbled AND", (W, 320), (NW, 380),
                "A NAND gate, drawn the usual way: an AND body with a bubble (inversion) on its output.", els, steps)


@scene
def pos_neg_logic():
    phys = [("L", "L", "L"), ("L", "H", "L"), ("H", "L", "L"), ("H", "H", "H")]
    pos = [[{"H": "1", "L": "0"}[c] for c in r] for r in phys]
    neg = [[{"H": "0", "L": "1"}[c] for c in r] for r in phys]
    AB = ["A", "B"]
    assert [int(r[2]) for r in pos] == list(bl.tt("AB", AB))
    neg_sorted = sorted(neg)
    assert [int(r[2]) for r in neg_sorted] == list(bl.tt("A + B", AB))
    W, NW = 640, 360
    head = [["A", "B", "F"]]
    els = [*heads("One physical gate, two readings", "One gate, two readings", W),
           text("t1", 110, 64, "Voltages", {"x": 90, "y": 60}, anchor="middle", size=15, weight="bold"),
           el("phys", "table", {"x": 30, "y": 76, "cellW": 40, "cellH": 26}, x=50, y=80, cellW=40, cellH=28, header=True, mono=True, rows=head + [list(r) for r in phys]),
           text("t2", 320, 64, "Positive logic (H = 1)", {"x": 270, "y": 60, "size": 13}, anchor="middle", size=15, weight="bold", hidden=True),
           el("pos", "table", {"x": 210, "y": 76, "cellW": 40, "cellH": 26}, x=260, y=80, cellW=40, cellH=28, header=True, mono=True, rows=head + pos, hidden=True),
           text("t3", 530, 64, "Negative logic (L = 1)", {"x": 180, "y": 240, "size": 13}, anchor="middle", size=15, weight="bold", hidden=True),
           el("neg", "table", {"x": 120, "y": 256, "cellW": 40, "cellH": 26}, x=470, y=80, cellW=40, cellH=28, header=True, mono=True, rows=head + neg, hidden=True),
           text("p", 320, 245, "", {"x": 270, "y": 220, "size": 13}, anchor="middle", size=15, tone="success", weight="bold"),
           text("q", 530, 245, "", {"x": 180, "y": 400, "size": 13}, anchor="middle", size=15, tone="info", weight="bold"),
           text("note", W / 2, 290, "", {"x": NW / 2, "y": 430, "size": 12}, anchor="middle", size=14)]
    steps = [
        step("The datasheet lists only voltages. The output is H only when both inputs are H.", ("phys", {"highlight": [[4, 0], [4, 1], [4, 2]]})),
        step("Read H as 1 and L as 0 (positive logic). F is 1 only on row 11: this gate is an AND.",
             ("t2", {"hidden": False}), ("pos", {"hidden": False, "highlight": [[4, 2]]}), ("p", {"text": "AND"})),
        step("Now read L as 1 and H as 0 (negative logic). Every 0 becomes 1 and vice versa, in the inputs and in the output.",
             ("t3", {"hidden": False}), ("neg", {"hidden": False})),
        step("Sort the negative-logic rows into the usual order 00, 01, 10, 11: F reads 0, 1, 1, 1. The same chip is an OR gate.",
             ("neg", {"rows": head + [list(r) for r in neg_sorted], "highlight": [[2, 2], [3, 2], [4, 2]]}), ("q", {"text": "OR"})),
        step("Changing the convention complements every input and the output, which turns each function into its dual: AND ↔ OR, NAND ↔ NOR, XOR ↔ XNOR.",
             ("note", {"text": "positive AND = negative OR (the dual)"})),
    ]
    return spec("Positive and negative logic: one physical gate read two ways", (W, 310), (NW, 450),
                "A physical gate's behaviour in voltages: H is the high level, L the low level.", els, steps)


@scene
def circuit_read():
    V = ["A", "B", "C"]
    g1 = lambda A, B, C: 1 - (A & B)
    g2 = lambda A, B, C: B | C
    F = lambda A, B, C: g1(A, B, C) & g2(A, B, C)
    assert bl.tt(F, V) == bl.tt("(AB)'(B + C)", V)
    W, NW = 640, 360
    gw, gh = 64, 44
    G1 = (230, 60)
    G2 = (230, 170)
    G3 = (420, 112)
    nG1, nG2, nG3 = (110, 60), (110, 170), (240, 112)
    p1, o1 = pins("nand", *G1, gw, gh)
    p2, o2 = pins("or", *G2, gw, gh)
    p3, o3 = pins("and", *G3, gw, gh)
    q1, r1 = pins("nand", *nG1, 56, 40)
    q2, r2 = pins("or", *nG2, 56, 40)
    q3, r3 = pins("and", *nG3, 56, 40)
    xin = {"A": 60, "B": 60, "C": 60}
    nxin = 50
    els = [*heads("Reading a circuit: label every gate, then follow the signals", "Follow the signals", W),
           gate("g1", *G1, gw, gh, "nand", {"x": nG1[0], "y": nG1[1], "w": 56, "h": 40}, label="G1"),
           gate("g2", *G2, gw, gh, "or", {"x": nG2[0], "y": nG2[1], "w": 56, "h": 40}, label="G2"),
           gate("g3", *G3, gw, gh, "and", {"x": nG3[0], "y": nG3[1], "w": 56, "h": 40}, label="G3"),
           text("lA", 54, p1[0][1] - 9, "A", {"x": 44, "y": q1[0][1] - 8, "size": 12}, anchor="end", size=14, weight="bold", mono=True),
           text("lB", 54, p1[1][1] + 9, "B", {"x": 44, "y": q1[1][1] + 8, "size": 12}, anchor="end", size=14, weight="bold", mono=True),
           text("lC", 54, p2[1][1], "C", {"x": 44, "y": q2[1][1], "size": 12}, anchor="end", size=14, weight="bold", mono=True),
           wire("wA", [xin["A"], p1[0][1]], p1[0], {"points": [[nxin, q1[0][1]], q1[0]]}),
           wire("wB1", [xin["B"], p1[1][1]], p1[1], {"points": [[nxin, q1[1][1]], q1[1]]}),
           line("wB2", [[150, p1[1][1]], [150, p2[0][1]], [p2[0][0], p2[0][1]]], {"points": [[80, q1[1][1]], [80, q2[0][1]], [q2[0][0], q2[0][1]]]}),
           wire("wC", [xin["C"], p2[1][1]], p2[1], {"points": [[nxin, q2[1][1]], q2[1]]}),
           wire("w1", o1, p3[0], {"points": wire_pts(r1, q3[0])}),
           wire("w2", o2, p3[1], {"points": wire_pts(r2, q3[1])}),
           wire("wF", o3, [o3[0] + 50, o3[1]], {"points": [r3, [r3[0] + 36, r3[1]]]}),
           text("lF", o3[0] + 62, o3[1], "F", {"x": r3[0] + 46, "y": r3[1]}, anchor="middle", size=16, weight="bold")]
    vals = ["v1", "v2", "vF"]
    vpos = {"v1": ((o1[0] + 16, o1[1] - 14), (r1[0] + 12, r1[1] - 13)),
            "v2": ((o2[0] + 16, o2[1] - 14), (r2[0] + 12, r2[1] - 13)), "vF": ((o3[0] + 30, o3[1] - 14), (r3[0] + 20, r3[1] - 13))}
    for v in vals:
        (x, y), (nx, ny) = vpos[v]
        els.append(text(v, x, y, "", {"x": nx, "y": ny, "size": 14}, anchor="middle", size=16, weight="bold", mono=True))
    els.append(text("expr", W / 2, 262, "", {"x": NW / 2, "y": 250, "size": 13}, anchor="middle", size=15, mono=True))
    steps = []
    for (A, B, C) in [(0, 1, 0), (1, 1, 0)]:
        a, b = g1(A, B, C), g2(A, B, C)
        f = a & b
        steps.append(step(f"Set the inputs A = {A}, B = {B}, C = {C}. B feeds two gates (a fan-out), so it appears twice.",
                          ("lA", {"text": f"A = {A}", "tone": tone(A)}), ("lB", {"text": f"B = {B}", "tone": tone(B)}), ("lC", {"text": f"C = {C}", "tone": tone(C)}),
                          ("wA", {"tone": tone(A)}), ("wB1", {"tone": tone(B)}), ("wB2", {"tone": tone(B)}), ("wC", {"tone": tone(C)}),
                          ("v1", {"text": ""}), ("v2", {"text": ""}), ("vF", {"text": ""}), ("w1", {"tone": "ink"}), ("w2", {"tone": "ink"}), ("wF", {"tone": "ink"}),
                          ("g1", {"fill": "none"}), ("g2", {"fill": "none"}), ("g3", {"fill": "none"})))
        steps.append(step(f"Level 1. G1 = NAND(A, B) = ({A}·{B})′ = {a}. G2 = OR(B, C) = {B} + {C} = {b}.",
                          ("v1", {"text": str(a), "tone": tone(a)}), ("v2", {"text": str(b), "tone": tone(b)}),
                          ("w1", {"tone": tone(a)}), ("w2", {"tone": tone(b)}), ("g1", {"fill": "success" if a else "none"}), ("g2", {"fill": "success" if b else "none"})))
        steps.append(step(f"Level 2. F = AND(G1, G2) = {a}·{b} = {f}." + (" Every gate waited for its inputs: values flow left to right, one level at a time." if A == 0 else " Only G1 changed, and that was enough to change F."),
                          ("vF", {"text": str(f), "tone": tone(f)}), ("wF", {"tone": tone(f)}), ("g3", {"fill": "success" if f else "none"})))
    steps.append(step("Written as an expression, the circuit is F = (AB)′(B + C): G1 and G2 are the two factors, G3 multiplies them.",
                      ("expr", {"text": "F = (AB)′ · (B + C)"})))
    return spec("Reading a three-gate circuit, one level at a time", (W, 280), (NW, 270),
                "Three gates: G1 is a NAND of A and B, G2 an OR of B and C, and G3 an AND of the two results.", els, steps)


# ── Lesson 2: Boolean laws ──────────────────────────────────────────────────

def tbl(id, x, y, cw, ch, rows, n, **kw):
    return el(id, "table", n, x=x, y=y, cellW=cw, cellH=ch, rows=rows, header=True, mono=True, **kw)


@scene
def law_cards():
    X, XY = ["x"], ["x", "y"]
    cards = [
        ("Idempotence: x + x = x and x·x = x", X, ["x + x", "x x"], "x"),
        ("Absorption: x + xy = x", XY, ["x y", "x + x y"], "x"),
        ("Redundant literal: x + x′y = x + y", XY, ["x' y", "x + x' y", "x + y"], "x + y"),
    ]
    W, NW = 640, 360
    els = [*heads("Proof by truth table (perfect induction)", "Proof by truth table", W),
           text("sub", W / 2, 54, "", {"x": NW / 2, "y": 52, "size": 13}, anchor="middle", size=15, tone="accent")]
    steps = []
    for k, (title, vars_, cols, target) in enumerate(cards):
        heads_ = vars_ + [c.replace("'", "′").replace(" ", "") for c in cols]
        body = [[str(r[v]) for v in vars_] + [str(bl.ev(bl.parse(c), r)) for c in cols] for r in bl.rows(vars_)]
        ncol = len(heads_)
        cw, ncw = 78, 52
        x0, nx0 = (W - ncol * cw) / 2, (NW - ncol * ncw) / 2
        els.append(tbl(f"c{k}", x0, 80, cw, 30, [heads_] + [[" "] * ncol for _ in body], {"x": nx0, "y": 76, "cellW": ncw, "cellH": 28}, hidden=True))
        tcol = [str(v) for v in bl.tt(target, vars_)]
        eqcols = [j for j in range(ncol) if [r[j] for r in body] == tcol]
        assert len(eqcols) == [3, 2, 2][k]
        hide = [(f"c{j}", {"hidden": True}) for j in range(len(cards)) if j != k]
        steps.append(step(f"Card {k + 1}. {title}: list every row of the variables ({2 ** len(vars_)} rows).",
                          *hide, (f"c{k}", {"hidden": False, "rows": [heads_] + [r[:len(vars_)] + [" "] * len(cols) for r in body]}),
                          ("sub", {"text": title})))
        same = ", ".join(heads_[j] for j in eqcols)
        steps.append(step(f"Fill each column from the definitions. The highlighted columns {same} agree on every row. With only {2 ** len(vars_)} possible rows, that is a complete proof.",
                          (f"c{k}", {"rows": [heads_] + body, "highlight": [[i + 1, j] for i in range(len(body)) for j in eqcols]})))
    return spec("Proving Boolean laws by truth table", (W, 250), (NW, 240),
                "Three laws, each proved by listing every case: idempotence, absorption, and the redundant-literal rule.", els, steps)


def tree_els(nodes, edges, hidden=()):
    """nodes: id -> (label, (x, y), (nx, ny)); edges: (a, b). Edge ids are 'e' + a + b."""
    els = []
    for a, b in edges:
        (_, (ax, ay), (nax, nay)), (_, (bx, by), (nbx, nby)) = nodes[a], nodes[b]
        els.append(line(f"e{a}{b}", [[ax, ay + 19], [bx, by - 19]], {"points": [[nax, nay + 17], [nbx, nby - 17]]}, tone="muted",
                        **({"hidden": True} if b in hidden else {})))
    for i, (lab, (x, y), (nx, ny)) in nodes.items():
        els.append(el(i, "circle", {"cx": nx, "cy": ny, "r": 17}, cx=x, cy=y, r=19, label=lab, mono=True, size=14, fill="none",
                      **({"hidden": True} if i in hidden else {})))
    return els


@scene
def complement_tree():
    V = ["A", "B", "C", "D"]
    f, fc = "(A + B'C)(A' + D)", "A'(B + C') + AD'"
    assert bl.tt(fc, V) == bl.complement_tt(bl.tt(f, V))
    assert bl.tt(bl.dual("(A' + BC')(A + D')"), V) == bl.tt(fc, V)
    nodes = {
        "r": ("·", (320, 80), (180, 80)),
        "o1": ("+", (190, 150), (95, 145)), "o2": ("+", (450, 150), (265, 145)),
        "a": ("A", (130, 220), (45, 210)), "n": ("·", (250, 220), (145, 210)),
        "a2": ("A′", (400, 220), (225, 210)), "d": ("D", (500, 220), (305, 210)),
        "b": ("B′", (210, 290), (115, 275)), "c": ("C", (290, 290), (175, 275)),
    }
    edges = [("r", "o1"), ("r", "o2"), ("o1", "a"), ("o1", "n"), ("o2", "a2"), ("o2", "d"), ("n", "b"), ("n", "c")]
    els = [*heads("Complement = swap every operator, complement every literal", "Complementing via the tree", 640),
           *tree_els(nodes, edges),
           text("res", 320, 340, "f = (A + B′C)(A′ + D)", {"x": 180, "y": 320, "size": 13}, anchor="middle", size=16, mono=True)]
    ops = [("r", "+"), ("o1", "·"), ("o2", "·"), ("n", "+")]
    lits = [("a", "A′"), ("b", "B"), ("c", "C′"), ("a2", "A"), ("d", "D′")]
    st = [
        step("General De Morgan, rule 1: swap every operator, AND ↔ OR. The root AND becomes an OR, the two ORs become ANDs, and the inner AND becomes an OR.",
             *[(i, {"label": v, "tone": "accent", "fill": "accent"}) for i, v in ops]),
        step("Rule 2: complement every literal. A becomes A′, B′ becomes B, C becomes C′, A′ becomes A and D becomes D′.",
             *[(i, {"label": v, "tone": "info", "fill": "info"}) for i, v in lits]),
        step("Read the new tree back, keeping its grouping: the root is now an OR, so f′ = A′(B + C′) + AD′. A truth table over all 16 rows confirms it is 1 exactly where f is 0.",
             ("res", {"text": "f′ = A′(B + C′) + AD′", "tone": "success"})),
    ]
    return spec("Complementing an expression: swap operators, complement literals", (640, 360), (360, 340),
                "The expression f = (A + B′C)(A′ + D) drawn as a tree: operators inside, literals at the leaves.", els, st)


@scene
def consensus_cells():
    V = ["x", "y", "z"]
    xy, xz, yz = bl.minterms("xy", V), bl.minterms("x'z", V), bl.minterms("yz", V)
    assert set(yz) <= set(xy) | set(xz) and (xy, xz, yz) == ([6, 7], [1, 3], [3, 7])
    assert bl.equal("xy + x'z + yz", "xy + x'z", V)
    W, NW = 640, 360
    labels = [f"{i:03b}" for i in range(8)]
    els = [*heads("Consensus: yz is already covered by xy and x′z", "Consensus: yz is covered", W)]
    for id, lab, y, ny in [("sxy", "xy", 96, 90), ("sxz", "x′z", 170, 150), ("syz", "yz", 244, 210)]:
        els.append(text(id + "l", 70, y + 26, lab, {"x": 32, "y": ny + 18, "size": 13}, anchor="middle", size=16, weight="bold", mono=True))
        kw = {"labels": labels} if id == "sxy" else {}
        els.append(bits(id, 110, y, "        ", 52, {"x": 60, "y": ny, "cell": 36}, **kw))
    els.append(text("note", W / 2, 330, "", {"x": NW / 2, "y": 280, "size": 12}, anchor="middle", size=15))
    fill = lambda ms: "".join("1" if i in ms else "0" for i in range(8))
    st = [
        step("Each cell is one row xyz of the truth table. The term xy is 1 on rows 110 and 111.", ("sxy", {"bits": fill(xy), "highlight": xy})),
        step("The term x′z is 1 on rows 001 and 011.", ("sxz", {"bits": fill(xz), "highlight": xz})),
        step("The consensus term yz is 1 on rows 011 and 111. Row 111 is already in xy (there x = 1) and row 011 is already in x′z (there x = 0).",
             ("syz", {"bits": fill(yz), "highlight": yz})),
        step("So adding yz adds no new 1: xy + x′z + yz = xy + x′z. Whatever x is, one of the first two terms already covers yz.",
             ("note", {"text": "yz lies inside xy + x′z, so it is redundant", "tone": "success"})),
    ]
    return spec("The consensus theorem on the rows of a truth table", (W, 350), (NW, 300),
                "Three product terms over x, y, z, each drawn as the set of rows where it is 1.", els, st)


@scene
def shannon_tree():
    V = ["A", "B", "C"]
    assert bl.equal("A'C + AB", "AB + A'C", V)
    nodes = {
        "r": ("f", (320, 80), (180, 80)),
        "f0": ("C", (180, 170), (90, 165)), "f1": ("B", (460, 170), (270, 165)),
        "c0": ("0", (120, 260), (45, 250)), "c1": ("1", (240, 260), (135, 250)),
        "b0": ("0", (400, 260), (225, 250)), "b1": ("1", (520, 260), (315, 250)),
    }
    edges = [("r", "f0"), ("r", "f1"), ("f0", "c0"), ("f0", "c1"), ("f1", "b0"), ("f1", "b1")]
    hidden = ("f0", "f1", "c0", "c1", "b0", "b1")
    els = [*heads("Shannon expansion: f = A′·f(0,B,C) + A·f(1,B,C)", "Shannon expansion", 640), *tree_els(nodes, edges, hidden)]
    for k, (x, y, nx, ny, t) in enumerate([(230, 118, 118, 116, "A = 0"), (410, 118, 242, 116, "A = 1"),
                                           (130, 212, 50, 205, "C = 0"), (230, 212, 130, 205, "C = 1"),
                                           (410, 212, 230, 205, "B = 0"), (510, 212, 310, 205, "B = 1")]):
        els.append(text(f"t{k}", x, y, t, {"x": nx, "y": ny, "size": 11}, anchor="middle", size=13, tone="muted", hidden=True))
    els.append(text("res", 320, 322, "", {"x": 180, "y": 302, "size": 11}, anchor="middle", size=15, mono=True))
    st = [
        step("Set A = 0: the term AB vanishes and A′C becomes C. The cofactor is f(0, B, C) = C.",
             ("f0", {"hidden": False}), ("erf0", {"hidden": False}), ("t0", {"hidden": False})),
        step("Set A = 1: the term A′C vanishes and AB becomes B. The cofactor is f(1, B, C) = B.",
             ("f1", {"hidden": False}), ("erf1", {"hidden": False}), ("t1", {"hidden": False})),
        step("Glue the halves back, each with the literal that selects it: f = A′·C + A·B, which is f again.",
             ("res", {"text": "f = A′·f(0,B,C) + A·f(1,B,C) = A′C + AB"})),
        step("Keep splitting and every path ends in a constant. This decision tree describes f completely; a 2:1 multiplexer is the same picture in hardware (Chapter 4).",
             *[(i, {"hidden": False}) for i in ["c0", "c1", "b0", "b1", "t2", "t3", "t4", "t5", "ef0c0", "ef0c1", "ef1b0", "ef1b1"]]),
    ]
    return spec("Shannon expansion as a decision tree", (640, 340), (360, 320),
                "f = AB + A′C. Shannon expansion splits f on one variable into two smaller functions, the cofactors.", els, st)


@scene
def equation_sieve():
    V = ["A", "B", "C", "D"]
    eqs = [("A' + AB", "0"), ("AB", "AC"), ("AB + AC' + CD", "C'D")]
    alive, survivors = set(range(16)), []
    for lhs, rhs in eqs:
        alive = {i for i in alive if bl.tt(lhs, V)[i] == bl.tt(rhs, V)[i]}
        survivors.append(sorted(alive))
    assert survivors == [[8, 9, 10, 11], [8, 9], [9]]
    W, NW = 640, 360
    vals = [[f"{4 * r + c:04b}" for c in range(4)] for r in range(4)]
    els = [*heads("Solving a system by striking out rows", "Solve by striking out rows", W),
           el("g", "grid", {"x": 40, "y": 70, "cell": 70}, x=180, y=64, rows=4, cols=4, cell=70, values=vals, mono=True),
           text("eq", W / 2, 370, "", {"x": NW / 2, "y": 370, "size": 12}, anchor="middle", size=15, mono=True)]
    names = ["A′ + AB = 0", "AB = AC", "AB + AC′ + CD = C′D"]
    extra = ["A sum is 0 only if every term is 0: A′ = 0 forces A = 1, then AB = 0 forces B = 0. Four rows survive.",
             "With A = 1 and B = 0 the equation reads 0 = C, so C = 0. Two rows survive.",
             "With A = 1, B = 0, C = 0 it reads 0 + 1 + 0 = D, so D = 1. One row survives: ABCD = 1001."]
    st = []
    for ss, nm, ex in zip(survivors, names, extra):
        v = [[(f"{4 * r + c:04b}" if 4 * r + c in ss else "·") for c in range(4)] for r in range(4)]
        st.append(step(f"Equation: {nm}. {ex}", ("g", {"values": v, "highlight": [[i // 4, i % 4] for i in ss]}), ("eq", {"text": nm})))
    return spec("A system of Boolean equations solved by elimination", (W, 400), (NW, 400),
                "All 16 assignments of A, B, C, D (row ABCD). Each equation keeps only the rows on which its two sides are equal.", els, st)


# ── Lesson 3: XOR and operators ─────────────────────────────────────────────

@scene
def xor_controlled_inverter():
    W, NW = 640, 360
    gx, gy, gw, gh = 260, 90, 80, 56
    ngx, ngy = 140, 90
    p, o = pins("xor", gx, gy, gw, gh)
    q, r = pins("xor", ngx, ngy, gw, gh)
    els = [*heads("XOR as a controlled inverter", "XOR: a controlled inverter", W),
           gate("g", gx, gy, gw, gh, "xor", {"x": ngx, "y": ngy}),
           wire("wx", [gx - 120, p[0][1]], p[0], {"points": [[ngx - 100, q[0][1]], q[0]]}),
           wire("wc", [gx - 120, p[1][1]], p[1], {"points": [[ngx - 100, q[1][1]], q[1]]}, tone="accent"),
           wire("wo", o, [o[0] + 60, o[1]], {"points": [r, [r[0] + 50, r[1]]]}),
           text("lx", gx - 130, p[0][1], "data x", {"x": ngx - 106, "y": q[0][1] - 12, "size": 12}, anchor="end", size=15, weight="bold"),
           text("lc", gx - 130, p[1][1], "control c", {"x": ngx - 106, "y": q[1][1] + 14, "size": 12}, anchor="end", size=15, weight="bold", tone="accent"),
           text("vo", o[0] + 74, o[1], "", {"x": r[0] + 60, "y": r[1], "size": 14}, anchor="start", size=16, weight="bold", mono=True),
           text("mode", W / 2, 200, "", {"x": NW / 2, "y": 210, "size": 13}, anchor="middle", size=16, weight="bold"),
           tbl("t", 220, 230, 66, 26, [["c", "x", "x ⊕ c"]] + [[" "] * 3 for _ in range(4)], {"x": 81, "y": 236, "cellW": 66, "cellH": 24})]
    rows = [[" "] * 3 for _ in range(4)]
    st = []
    for k, (c, x) in enumerate([(0, 0), (0, 1), (1, 0), (1, 1)]):
        y = x ^ c
        rows[k] = [str(c), str(x), str(y)]
        what = "passes x unchanged" if c == 0 else "inverts x"
        st.append(step(f"c = {c}, x = {x}: the output is {x} ⊕ {c} = {y}. With the control at {c} the gate {what}.",
                       ("vo", {"text": str(y), "tone": tone(y)}), ("wo", {"tone": tone(y)}), ("wx", {"tone": tone(x)}),
                       ("mode", {"text": "c = 0: copy" if c == 0 else "c = 1: invert", "tone": "ink" if c == 0 else "accent"}),
                       ("t", {"rows": [["c", "x", "x ⊕ c"]] + [rr[:] for rr in rows], "highlight": [[k + 1, 2]]})))
    st.append(step("So x ⊕ 0 = x and x ⊕ 1 = x′. This is why XOR complements a bit on demand: in adder-subtractors, in parity generators and in the 'flip if differ' tricks of this lesson.",
                   ("t", {"highlight": []})))
    return spec("XOR as a controlled inverter", (W, 380), (NW, 370),
                "An XOR gate with a data input x and a control input c.", els, st)


@scene
def xor_parity_chain():
    bits_in = [1, 0, 1, 1]
    runs = [bits_in[0]]
    for b in bits_in[1:]:
        runs.append(runs[-1] ^ b)
    assert runs == [1, 1, 0, 1] and runs[-1] == sum(bits_in) % 2
    assert bl.tt("A \\oplus B \\oplus C \\oplus D", ["A", "B", "C", "D"])[0b1011] == 1
    W, NW = 640, 360
    gw, gh = 62, 54
    G = [(170, 56), (300, 120), (430, 184)]
    NG = [(80, 60), (170, 120), (260, 180)]
    els = [*heads("A chain of XORs computes parity", "XOR chain = parity", W)]
    names = ["A", "B", "C", "D"]
    for k, ((x, y), (nx, ny)) in enumerate(zip(G, NG)):
        p, o = pins("xor", x, y, gw, gh)
        q, r = pins("xor", nx, ny, 50, 38)
        els.append(gate(f"g{k}", x, y, gw, gh, "xor", {"x": nx, "y": ny, "w": 50, "h": 38}))
        if k == 0:
            els.append(wire("wA", [60, p[0][1]], p[0], {"points": [[24, q[0][1]], q[0]]}))
            els.append(text("lA", 52, p[0][1], "A = 1", {"x": 20, "y": q[0][1] - 10, "size": 11}, anchor="end", size=14, mono=True, weight="bold"))
        src = names[k + 1]
        els.append(wire(f"w{src}", [60, p[1][1]], p[1], {"points": [[24, q[1][1]], q[1]]}))
        els.append(text(f"l{src}", 52, p[1][1], f"{src} = {bits_in[k + 1]}", {"x": 20, "y": q[1][1] + 8, "size": 11}, anchor="end", size=14, mono=True, weight="bold"))
        if k < 2:
            p2, _ = pins("xor", *G[k + 1], gw, gh)
            q2, _ = pins("xor", *NG[k + 1], 50, 38)
            els.append(wire(f"o{k}", o, p2[0], {"points": wire_pts(r, q2[0])}))
        else:
            els.append(wire(f"o{k}", o, [o[0] + 50, o[1]], {"points": [r, [r[0] + 40, r[1]]]}))
        els.append(text(f"v{k}", o[0] + 14, o[1] - 14, "", {"x": r[0] + 10, "y": r[1] - 12, "size": 12}, anchor="middle", size=15, mono=True, weight="bold"))
    els.append(text("sum", W / 2, 280, "", {"x": NW / 2, "y": 270, "size": 12}, anchor="middle", size=15))
    st = []
    seen = [bits_in[0]]
    for k in range(3):
        b = bits_in[k + 1]
        seen.append(b)
        v = runs[k + 1]
        st.append(step(f"Gate {k + 1}: {runs[k]} ⊕ {b} = {v}. The running value is the parity of the inputs so far ({', '.join(map(str, seen))}: {sum(seen)} one{'s' if sum(seen) != 1 else ''}, {'odd' if v else 'even'}).",
                       (f"v{k}", {"text": str(v), "tone": tone(v)}), (f"o{k}", {"tone": tone(v)}), (f"g{k}", {"fill": "success" if v else "none"})))
    st.append(step("The final output is 1 because three of the four inputs are 1, an odd number. An XOR of any number of inputs is 1 exactly when an odd number of them are 1.",
                   ("sum", {"text": "1 ⊕ 0 ⊕ 1 ⊕ 1 = 1 (three 1s: odd)", "tone": "success"})))
    return spec("A chain of XOR gates computes the parity of its inputs", (W, 300), (NW, 290),
                "Four inputs A, B, C, D = 1, 0, 1, 1 enter a chain of three 2-input XOR gates.", els, st)


@scene
def assoc_test():
    V = ["a", "b", "c"]
    nand = lambda x, y: 1 - (x & y)
    head = ["a", "b", "c", "(a↑b)↑c", "a↑(b↑c)"]
    body = []
    for r in bl.rows(V):
        a, b, c = r["a"], r["b"], r["c"]
        body.append([str(a), str(b), str(c), str(nand(nand(a, b), c)), str(nand(a, nand(b, c)))])
    bad = [i for i, row in enumerate(body) if row[3] != row[4]]
    assert bad == [1, 3, 4, 6] and bl.equal("((ab)'c)'", "ab + c'", V) and bl.equal("(a(bc)')'", "a' + bc", V)
    W, NW = 640, 360
    els = [*heads("Is NAND associative? Compare both bracketings on all 8 rows", "Is NAND associative?", W),
           tbl("t", 120, 56, 80, 28, [head] + [r[:3] + [" ", " "] for r in body], {"x": 10, "y": 50, "cellW": 68, "cellH": 26}),
           text("res", W / 2, 330, "", {"x": NW / 2, "y": 300, "size": 12}, anchor="middle", size=15)]
    st = [
        step("Fill the column (a↑b)↑c: first NAND a with b, then NAND the result with c. Algebraically it is ab + c′.",
             ("t", {"rows": [head] + [r[:4] + [" "] for r in body]})),
        step("Fill the column a↑(b↑c): it is a′ + bc.",
             ("t", {"rows": [head] + body})),
        step(f"The columns disagree on rows {', '.join(f'{i:03b}' for i in bad)}. One disagreeing row is enough: NAND is not associative.",
             ("t", {"highlight": [[i + 1, j] for i in bad for j in (3, 4)]}), ("res", {"text": "(a↑b)↑c ≠ a↑(b↑c)", "tone": "danger"})),
        step("The same 8-row test works for any operator defined by a table: compute both bracketings and compare. AND, OR, XOR and XNOR pass it; NAND, NOR and implication fail.",
             ("res", {"text": "8 rows decide associativity", "tone": "ink"})),
    ]
    return spec("The associativity test for NAND", (W, 350), (NW, 320),
                "To test whether an operator is associative, compare (a ⋆ b) ⋆ c with a ⋆ (b ⋆ c) on every row.", els, st)


@scene
def xnor_chain():
    V = ["x", "y", "z"]
    x3 = bl.tt("x \\oplus y \\oplus z", V)
    n3 = bl.tt("x \\odot y \\odot z", V)
    g3 = bl.complement_tt(x3)
    assert x3 == n3 and g3 != n3
    V2 = ["x", "y"]
    assert bl.tt("x \\odot y", V2) == bl.complement_tt(bl.tt("x \\oplus y", V2))
    head = ["x", "y", "z", "x⊕y⊕z", "x⊙y⊙z", "XNOR₃"]
    body = [[str(r["x"]), str(r["y"]), str(r["z"]), str(x3[i]), str(n3[i]), str(g3[i])] for i, r in enumerate(bl.rows(V))]
    W, NW = 640, 360
    els = [*heads("Chains of XNOR vs XOR, three variables", "XNOR chain vs XOR", W),
           tbl("t", 80, 56, 80, 28, [head] + body, {"x": 6, "y": 50, "cellW": 58, "cellH": 26},
               highlight=[[i + 1, j] for i in range(8) for j in (3, 4)]),
           text("n", W / 2, 330, "With three variables the XNOR chain equals the XOR chain; a 3-input XNOR gate (XNOR₃) is their complement.",
                "wide", anchor="middle", size=13),
           text("nn", NW / 2, 300, "Odd n: chain ⊙ = chain ⊕. XNOR₃ gate = complement.", "narrow", anchor="middle", size=12)]
    return spec("XNOR chains and XOR chains agree for an odd number of variables", (W, 345), (NW, 315),
                "Truth table of x ⊕ y ⊕ z, the chain x ⊙ y ⊙ z, and a 3-input XNOR gate (the complement of the 3-input XOR).", els, [])


# ── Lesson 4: canonical forms ───────────────────────────────────────────────

@scene
def minterm_highlighter():
    V = ["P", "Q", "R"]
    terms = [("PQ", "PQ"), ("QR'", "QR′"), ("PR'", "PR′")]
    cols = [bl.tt(t, V) for t, _ in terms]
    f = bl.tt("PQ + QR' + PR'", V)
    assert [i for i, v in enumerate(f) if v] == [2, 4, 6, 7]
    head = ["m", "P", "Q", "R", "PQ", "QR′", "PR′", "f"]
    body = [[str(i)] + [str(r[v]) for v in V] + [str(c[i]) for c in cols] + [str(f[i])] for i, r in enumerate(bl.rows(V))]
    blank = [r[:4] + [" "] * 4 for r in body]
    W, NW = 640, 360
    els = [*heads("From terms to minterms: each term lights its rows", "Terms → minterms", W),
           tbl("t", 80, 50, 60, 27, [head] + blank, {"x": 4, "y": 46, "cellW": 44, "cellH": 26}),
           text("s", W / 2, 312, "", {"x": NW / 2, "y": 298, "size": 13}, anchor="middle", size=16, mono=True)]
    st, cur = [], [r[:] for r in blank]
    for k, (t, lab) in enumerate(terms):
        for i in range(8):
            cur[i][4 + k] = body[i][4 + k]
        on = [i for i in range(8) if cols[k][i]]
        pat = "".join("1" if t.count(v) and "'" not in t.split(v)[1][:1] else ("0" if v in t else "−") for v in V)
        st.append(step(f"The term {lab} fixes {len(t.replace(chr(39), ''))} of the 3 variables, so it covers 2 rows: {', '.join(f'{i:03b}' for i in on)}, that is minterms {' and '.join(map(str, on))}.",
                       ("t", {"rows": [head] + [r[:] for r in cur], "highlight": [[i + 1, 4 + k] for i in on]})))
    for i in range(8):
        cur[i][7] = body[i][7]
    on = [i for i in range(8) if f[i]]
    st.append(step("f is the OR of the three columns: it is 1 wherever at least one term is 1. Row 6 is covered three times but is counted once.",
                   ("t", {"rows": [head] + cur, "highlight": [[i + 1, 7] for i in on]})))
    st.append(step("Read the 1-rows of f: the canonical sum of products is Σm(2, 4, 6, 7), and the remaining rows give the product of maxterms ΠM(0, 1, 3, 5).",
                   ("s", {"text": "f = Σm(2, 4, 6, 7) = ΠM(0, 1, 3, 5)", "tone": "success"})))
    return spec("Expanding a sum of products into its minterms", (W, 330), (NW, 310),
                "f(P, Q, R) = PQ + QR′ + PR′. The rows are numbered with P as the most significant bit.", els, st)


@scene
def minterm_set_venn():
    n = 3
    f, g = [1, 3, 5, 7], [3, 6, 7]
    F, G = set(f), set(g)
    r = range(8)
    ops = [("f", f), ("g", g), ("f·g", [i for i in r if i in F and i in G]), ("f + g", [i for i in r if i in F or i in G]),
           ("f ⊕ g", [i for i in r if (i in F) != (i in G)]), ("f′", [i for i in r if i not in F])]
    assert ops[2][1] == [3, 7] and ops[4][1] == [1, 5, 6]
    W, NW = 640, 360
    els = [*heads("Functions as sets of rows", "Functions as sets of rows", W)]
    fill = lambda ms: "".join("1" if i in ms else "0" for i in range(8))
    for k, (lab, ms) in enumerate(ops):
        y, ny = 60 + k * 44, 58 + k * 40
        els.append(text(f"l{k}", 100, y + 18, lab, {"x": 46, "y": ny + 16, "size": 12}, anchor="end", size=15, weight="bold", mono=True, hidden=k > 1))
        kw = {"labels": [str(i) for i in range(8)]} if k == 0 else {}
        els.append(bits(f"b{k}", 112, y, fill(ms) if k < 2 else "        ", 36, {"x": 54, "y": ny, "cell": 32}, hidden=k > 1, **kw))
        els.append(text(f"s{k}", 412, y + 18, f"Σ({', '.join(map(str, ms))})" if k < 2 else "", "wide", anchor="start", size=13, mono=True))
    caps = ["AND keeps the rows that are in both sets: f·g = Σ(3, 7) (intersection).",
            "OR keeps the rows in either set: f + g = Σ(1, 3, 5, 6, 7) (union).",
            "XOR keeps the rows in exactly one set: f ⊕ g = Σ(1, 5, 6) (symmetric difference).",
            "NOT keeps the rows outside the set: f′ = Σ(0, 2, 4, 6) (complement)."]
    st = []
    for k in range(2, 6):
        ms = ops[k][1]
        st.append(step(caps[k - 2], (f"l{k}", {"hidden": False}), (f"b{k}", {"hidden": False, "bits": fill(ms), "highlight": ms}),
                       (f"s{k}", {"text": f"Σ({', '.join(map(str, ms))})"})))
    for k, c in zip(range(2, 6), caps):
        assert f"Σ({', '.join(map(str, ops[k][1]))})" in c
    return spec("AND, OR, XOR and NOT as set operations on minterm lists", (W, 330), (NW, 300),
                "Two functions of three variables, f = Σ(1, 3, 5, 7) and g = Σ(3, 6, 7), each drawn as the set of rows where it is 1.", els, st)


@scene
def function_count():
    W, NW = 640, 360
    els = [*heads("How many Boolean functions of n variables?", "How many functions?", W),
           text("rows", W / 2, 60, "", {"x": NW / 2, "y": 58, "size": 12}, anchor="middle", size=15)]
    for k, n in enumerate([1, 2, 3]):
        y, ny = 90 + k * 70, 92 + k * 92
        els.append(text(f"n{k}", 70, y + 20, f"n = {n}", {"x": 30, "y": ny + 16, "size": 12}, anchor="middle", size=15, weight="bold", hidden=True))
        els.append(bits(f"b{k}", 120, y, "?" * 2 ** n, 40, {"x": 64, "y": ny, "cell": 32}, labels=[f"{i:0{n}b}" for i in range(2 ** n)], hidden=True))
        els.append(text(f"c{k}", 120 + 2 ** n * 40 + 20, y + 20, {1: "2² = 4", 2: "2⁴ = 16", 3: "2⁸ = 256"}[n], {"x": 64, "y": ny + 50, "size": 12}, anchor="start", size=15, mono=True, hidden=True))
    assert [2 ** 2 ** n for n in (1, 2, 3, 4)] == [4, 16, 256, 65536]
    st = [
        step("One variable: 2 rows. Each row's output is an independent choice of 0 or 1, so there are 2 × 2 = 2² = 4 functions: 0, x, x′ and 1.",
             ("n0", {"hidden": False}), ("b0", {"hidden": False}), ("c0", {"hidden": False}), ("rows", {"text": "a function = one output bit per row"})),
        step("Two variables: 4 rows, so 2⁴ = 16 functions, the sixteen of Lesson 1.",
             ("n1", {"hidden": False}), ("b1", {"hidden": False}), ("c1", {"hidden": False})),
        step("Three variables: 8 rows, so 2⁸ = 256 functions. In general n variables give 2ⁿ rows and 2^(2ⁿ) functions; for n = 4 that is 65 536.",
             ("n2", {"hidden": False}), ("b2", {"hidden": False}), ("c2", {"hidden": False}), ("rows", {"text": "n variables: 2ⁿ rows, 2^(2ⁿ) functions"})),
    ]
    return spec("Counting Boolean functions: one free output bit per row", (W, 310), (NW, 370),
                "A Boolean function is completely described by its output column. Count the columns.", els, st)


@scene
def self_dual_pairs():
    n = 3
    good, bad = [0, 1, 2, 4], [0, 1, 6, 7]
    assert bl.is_self_dual(bl.from_minterms(good, n)) and not bl.is_self_dual(bl.from_minterms(bad, n))
    assert bl.is_neutral(bl.from_minterms(bad, n))
    W, NW = 640, 360
    pairs = [(0, 7), (1, 6), (2, 5), (3, 4)]
    els = [*heads("Self-dual: exactly one row of every complementary pair", "Self-dual: one of each pair", W)]
    for k, (a, b) in enumerate(pairs):
        x, nx = 120 + k * 110, 30 + k * 80
        els.append(box(f"p{k}a", x, 80, 70, 44, f"{a} = {a:03b}", {"x": nx, "y": 80, "w": 64, "h": 40, "size": 11}, mono=True, size=13))
        els.append(box(f"p{k}b", x, 150, 70, 44, f"{b} = {b:03b}", {"x": nx, "y": 150, "w": 64, "h": 40, "size": 11}, mono=True, size=13))
        els.append(line(f"p{k}l", [[x + 35, 124], [x + 35, 150]], {"points": [[nx + 32, 120], [nx + 32, 150]]}, tone="muted", dashed=True))
    els.append(text("f", W / 2, 230, "", {"x": NW / 2, "y": 226, "size": 12}, anchor="middle", size=15, mono=True))
    els.append(text("v", W / 2, 262, "", {"x": NW / 2, "y": 258, "size": 12}, anchor="middle", size=15, weight="bold"))
    pick = lambda ms, tonev: [(f"p{k}{s}", {"fill": tonev if (a if s == "a" else b) in ms else "none"}) for k, (a, b) in enumerate(pairs) for s in "ab"]
    st = [
        step("Pair every row with its bitwise complement: (0, 7), (1, 6), (2, 5), (3, 4). The two indices always add up to 2ⁿ − 1 = 7.",
             ("f", {"text": "pairs (i, 7 − i)"})),
        step("f = Σ(0, 1, 2, 4) takes exactly one row from each pair (0 from the first, 1, 2 and 4 from the others). So f(x′) = f(x)′ on every row: f is self-dual.",
             *pick(good, "success"), ("f", {"text": "f = Σ(0, 1, 2, 4)"}), ("v", {"text": "self-dual ✓", "tone": "success"})),
        step("g = Σ(0, 1, 6, 7) also has four minterms (it is neutral), but it takes both rows of the pairs (0, 7) and (1, 6) and none of the others. Not self-dual.",
             *pick(bad, "danger"), ("f", {"text": "g = Σ(0, 1, 6, 7)"}), ("v", {"text": "neutral but not self-dual ✗", "tone": "danger"})),
        step("Counting: a self-dual function is one free choice per pair. There are 2ⁿ⁻¹ pairs, so 2^(2ⁿ⁻¹) self-dual functions: 2⁴ = 16 for n = 3.",
             *pick([], "none"), ("f", {"text": "2^(2ⁿ⁻¹) self-dual functions"}), ("v", {"text": "n = 3: 16", "tone": "ink"})),
    ]
    assert sum(1 for t in bl.all_functions(3) if bl.is_self_dual(t)) == 16
    return spec("The complementary-pair test for self-dual functions", (W, 290), (NW, 290),
                "The eight rows of a 3-variable truth table, arranged in complementary pairs.", els, st)


# ── Lesson 5: universal gates ───────────────────────────────────────────────

def mini_circuit(prefix, gates_, inputs, out_label, dx, ndx, ny_shift, hidden=True, gw=50, gh=36):
    """A small circuit. gates_: list of (id, kind, (x, y), [sources]); inputs: {name: y}.
    Returns elements (wide coordinates offset by dx; narrow by ndx and ny_shift)."""
    els = []
    pos = {}
    for gid, kind, (x, y), srcs in gates_:
        pos[gid] = (kind, x, y)
    for name, y in inputs.items():
        els.append(text(f"{prefix}i{name}", dx + 8, y, name, {"x": ndx + 8, "y": y + ny_shift}, anchor="middle", size=14, weight="bold", hidden=hidden))
    for gid, kind, (x, y), srcs in gates_:
        n_in = 1 if kind == "not" else 2
        p, o = pins(kind, dx + x, y, gw, gh, n_in)
        q, r = pins(kind, ndx + x, y + ny_shift, gw, gh, n_in)
        els.append(gate(f"{prefix}{gid}", dx + x, y, gw, gh, kind, {"x": ndx + x, "y": y + ny_shift}, hidden=hidden))
        for k, s_ in enumerate(srcs):
            if s_ in inputs:
                a, na = [dx + 18, inputs[s_]], [ndx + 18, inputs[s_] + ny_shift]
            else:
                k2, x2, y2 = pos[s_]
                a = pins(k2, dx + x2, y2, gw, gh, 1 if k2 == "not" else 2)[1]
                na = pins(k2, ndx + x2, y2 + ny_shift, gw, gh, 1 if k2 == "not" else 2)[1]
            els.append(line(f"{prefix}w{gid}{k}", wire_pts(a, p[k]), {"points": wire_pts(na, q[k])}, hidden=hidden))
    last = gates_[-1]
    kind, x, y = last[1], last[2][0], last[2][1]
    o = pins(kind, dx + x, y, gw, gh)[1]
    no = pins(kind, ndx + x, y + ny_shift, gw, gh)[1]
    els.append(line(f"{prefix}wo", [o, [o[0] + 20, o[1]]], {"points": [no, [no[0] + 16, no[1]]]}, hidden=hidden))
    els.append(text(f"{prefix}lo", o[0] + 26, o[1], out_label, {"x": no[0] + 20, "y": no[1], "size": 12}, anchor="start", size=14, mono=True, hidden=hidden))
    return els


@scene
def nand_builds():
    assert bl.equal("(x x)'", "x'", ["x"]) and bl.equal("(((AB)')((AB)'))'", "AB", ["A", "B"]) and bl.equal("((A A)'(B B)')'", "A + B", ["A", "B"])
    W, NW = 660, 360
    els = [*heads("Everything from NAND: NOT, AND and OR", "Everything from NAND", W)]
    els += mini_circuit("n", [("g", "nand", (40, 70), ["x", "x"])], {"x": 88}, "x′", 0, 30, 0)
    els += mini_circuit("a", [("g1", "nand", (40, 160), ["A", "B"]), ("g2", "nand", (120, 160), ["g1", "g1"])], {"A": 172, "B": 184}, "AB", 0, 30, 10)
    els += mini_circuit("o", [("g1", "nand", (40, 60), ["A", "A"]), ("g2", "nand", (40, 130), ["B", "B"]), ("g3", "nand", (130, 95), ["g1", "g2"])],
                        {"A": 78, "B": 148}, "A + B", 330, 30, 210)
    els.append(text("cnt", W / 2, 270, "", {"x": NW / 2, "y": 470, "size": 12}, anchor="middle", size=15))
    show = lambda pre: [(e["id"], {"hidden": False}) for e in els if e["id"].startswith(pre) and e["id"] != "cnt"]
    st = [
        step("NOT: tie both inputs of a NAND together. NAND(x, x) = (x·x)′ = x′. One gate.", *show("n"), ("cnt", {"text": "NOT = 1 NAND"})),
        step("AND: a NAND followed by a NAND used as an inverter undoes the inversion: ((AB)′)′ = AB. Two gates.", *show("a"), ("cnt", {"text": "NOT 1, AND 2"})),
        step("OR: invert both inputs, then NAND them: (A′·B′)′ = A + B by De Morgan. Three gates.", *show("o"), ("cnt", {"text": "NOT 1, AND 2, OR 3 (2-input NAND gates)"})),
        step("NOT, AND and OR can build every function (canonical SOP), so NAND alone can build every function: it is universal. The NOR gate is the dual: NOT 1, OR 2, AND 3."),
    ]
    return spec("Building NOT, AND and OR from NAND gates", (W, 290), (NW, 490),
                "NAND gates only. Three small circuits will appear, one per basic gate.", els, st)


@scene
def xor_from_nand():
    AB = ["A", "B"]
    W, NW = 640, 360
    gw, gh = 58, 42
    G = {"G1": (190, 110), "G2": (320, 60), "G3": (320, 160), "G4": (450, 110)}
    NG = {"G1": (90, 110), "G2": (180, 60), "G3": (180, 160), "G4": (270, 110)}
    srcs = {"G1": ["A", "B"], "G2": ["A", "G1"], "G3": ["G1", "B"], "G4": ["G2", "G3"]}
    yin = {"A": 70, "B": 200}
    els = [*heads("XOR from four NAND gates", "XOR from four NANDs", W)]
    for g, (x, y) in G.items():
        nx, ny = NG[g]
        els.append(gate(g.lower(), x, y, gw, gh, "nand", {"x": nx, "y": ny, "w": 52, "h": 38}, label=g))
    for name, y in yin.items():
        els.append(text("l" + name, 30, y, name, {"x": 14, "y": y}, anchor="middle", size=15, weight="bold", mono=True))
    for g, ss in srcs.items():
        p, _ = pins("nand", *G[g], gw, gh)
        q, _ = pins("nand", *NG[g], 52, 38)
        for k, s_ in enumerate(ss):
            if s_ in yin:
                a, na = [44, yin[s_]], [26, yin[s_]]
            else:
                a = pins("nand", *G[s_], gw, gh)[1]
                na = pins("nand", *NG[s_], 52, 38)[1]
            mid = None
            if s_ in yin:
                mid = (G[g][0] - 30) if g == "G1" else (150 + (10 if s_ == "B" else 0))
                nmid = (NG[g][0] - 20) if g == "G1" else (60 + (8 if s_ == "B" else 0))
            else:
                nmid = None
            els.append(line(f"w{g}{k}", wire_pts(a, p[k], mid), {"points": wire_pts(na, q[k], nmid)}))
    o = pins("nand", *G["G4"], gw, gh)[1]
    no = pins("nand", *NG["G4"], 52, 38)[1]
    els.append(line("wF", [o, [o[0] + 40, o[1]]], {"points": [no, [no[0] + 24, no[1]]]}))
    els.append(text("lF", o[0] + 50, o[1], "F", {"x": no[0] + 32, "y": no[1]}, anchor="middle", size=15, weight="bold"))
    for g, (x, y) in G.items():
        nx, ny = NG[g]
        els.append(text("v" + g, x + gw + 12, y - 4, "", {"x": nx + 60, "y": ny - 4, "size": 12}, anchor="middle", size=14, weight="bold", mono=True))
    els.append(text("row", W / 2, 250, "", {"x": NW / 2, "y": 240, "size": 12}, anchor="middle", size=15, mono=True))
    nand = lambda a, b: 1 - (a & b)
    st = []
    for A, B in [(0, 0), (0, 1), (1, 0), (1, 1)]:
        g1 = nand(A, B)
        g2, g3 = nand(A, g1), nand(g1, B)
        g4 = nand(g2, g3)
        assert g4 == A ^ B
        st.append(step(f"A = {A}, B = {B}: G1 = ({A}·{B})′ = {g1}, G2 = (A·G1)′ = {g2}, G3 = (G1·B)′ = {g3}, F = (G2·G3)′ = {g4} = A ⊕ B.",
                       ("vG1", {"text": str(g1), "tone": tone(g1)}), ("vG2", {"text": str(g2), "tone": tone(g2)}),
                       ("vG3", {"text": str(g3), "tone": tone(g3)}), ("vG4", {"text": str(g4), "tone": tone(g4)}),
                       ("row", {"text": f"A = {A}, B = {B}  →  F = {g4}"})))
    st.append(step("Algebra: G2 = (A·(AB)′)′ = A′ + AB = A′ + B and G3 = A + B′, so F = ((A′ + B)(A + B′))′ = (AB + A′B′)′ = A ⊕ B. An exhaustive search confirms that no circuit of three 2-input NANDs computes XOR.",
                   ("row", {"text": "F = A ⊕ B with 4 NANDs (the minimum)", "tone": "success"})))
    assert bl.equal("(A((AB)'))'", "A' + B", AB) and bl.min_gates(bl.tt("A \\oplus B", AB), "NAND") == 4
    return spec("XOR built from four NAND gates", (W, 270), (NW, 260),
                "Four 2-input NAND gates: G1 is shared by G2 and G3, and G4 combines them.", els, st)


@scene
def nand_nand_conversion():
    V = ["A", "B", "C", "D"]
    assert bl.equal("((AB)'(CD)')'", "AB + CD", V)
    W, NW = 640, 360
    gw, gh = 60, 44
    G = {"g1": (170, 60, "and"), "g2": (170, 170, "and"), "g3": (360, 115, "or")}
    NG = {"g1": (90, 60), "g2": (90, 170), "g3": (220, 115)}
    yin = {"A": 74, "B": 90, "C": 184, "D": 200}
    els = [*heads("AND–OR to NAND–NAND by bubble pairs", "AND–OR → NAND–NAND", W)]
    for g, (x, y, k) in G.items():
        els.append(gate(g, x, y, gw, gh, k, {"x": NG[g][0], "y": NG[g][1], "w": 54, "h": 40}))
    for name, y in yin.items():
        els.append(text("l" + name, 40, y, name, {"x": 16, "y": y, "size": 12}, anchor="middle", size=14, weight="bold"))
    srcs = {"g1": ["A", "B"], "g2": ["C", "D"]}
    for g, ss in srcs.items():
        p, _ = pins("and", G[g][0], G[g][1], gw, gh)
        q, _ = pins("and", NG[g][0], NG[g][1], 54, 40)
        for k, s_ in enumerate(ss):
            els.append(line(f"w{g}{k}", wire_pts([52, yin[s_]], p[k]), {"points": wire_pts([28, yin[s_]], q[k])}))
    p3, o3 = pins("or", 360, 115, gw, gh)
    q3, r3 = pins("or", 220, 115, 54, 40)
    for k, g in enumerate(["g1", "g2"]):
        a = pins("and", G[g][0], G[g][1], gw, gh)[1]
        na = pins("and", NG[g][0], NG[g][1], 54, 40)[1]
        els.append(line(f"wm{k}", wire_pts(a, p3[k]), {"points": wire_pts(na, q3[k])}))
    els.append(line("wF", [o3, [o3[0] + 40, o3[1]]], {"points": [r3, [r3[0] + 30, r3[1]]]}))
    els.append(text("eq", W / 2, 260, "F = AB + CD", {"x": NW / 2, "y": 250, "size": 13}, anchor="middle", size=16, mono=True))
    # Bubbled inputs on the OR move its pins; the middle wires get twins per stage (wide and narrow).
    pb, _ = pins("or", 360, 115, gw, gh, 2, (0, 1))
    qb, _ = pins("or", 220, 115, 54, 40, 2, (0, 1))
    st = [
        step("Start from the two-level AND–OR circuit for F = AB + CD: one AND per product term, one OR to combine them.",),
        step("Put a bubble at the output of each AND and a bubble at the matching OR input. Each wire now has two bubbles, which cancel, so the function is unchanged.",
             ("g1", {"kind": "nand", "tone": "accent"}), ("g2", {"kind": "nand", "tone": "accent"}), ("g3", {"bubbles": [0, 1], "tone": "accent"}),
             ("wm0", {"points": wire_pts(pins("nand", 170, 60, gw, gh)[1], pb[0])}), ("wm1", {"points": wire_pts(pins("nand", 170, 170, gw, gh)[1], pb[1])})),
        step("An OR with bubbled inputs is a NAND (De Morgan). Redraw it: the whole circuit is now NAND–NAND.",
             ("g3", {"kind": "nand", "bubbles": [], "tone": "success"}), ("g1", {"tone": "success"}), ("g2", {"tone": "success"}),
             ("wm0", {"points": wire_pts(pins("nand", 170, 60, gw, gh)[1], pins("nand", 360, 115, gw, gh)[0][0])}),
             ("wm1", {"points": wire_pts(pins("nand", 170, 170, gw, gh)[1], pins("nand", 360, 115, gw, gh)[0][1])}),
             ("eq", {"text": "F = ((AB)′ · (CD)′)′ = AB + CD", "tone": "success"})),
        step("Rule: any two-level AND–OR (sum of products) becomes NAND–NAND by replacing every gate with a NAND. A single-literal term must first pass through an inverter.",),
    ]
    for e in els:
        if e["id"] in ("wm0", "wm1"):
            e.pop("narrow")
            e["only"] = "wide"
    for k, g in enumerate(["g1", "g2"]):
        na = pins("and", NG[g][0], NG[g][1], 54, 40)[1]
        nb = pins("nand", NG[g][0], NG[g][1], 54, 40)[1]
        els.append(line(f"nm{k}", wire_pts(na, q3[k]), "narrow"))
        st[1]["patches"].append({"id": f"nm{k}", "set": {"points": wire_pts(nb, qb[k])}})
        st[2]["patches"].append({"id": f"nm{k}", "set": {"points": wire_pts(nb, pins("nand", 220, 115, 54, 40)[0][k])}})
    return spec("Converting AND–OR into NAND–NAND", (W, 280), (NW, 270),
                "A sum of products, F = AB + CD, built as AND gates feeding an OR gate.", els, st)


@scene
def completeness_checklist():
    AB = ["x", "y"]
    t = lambda e, v=AB: bl.tt(e, v)
    sets = [
        ("NAND", [t("(xy)'")]),
        ("AND, OR", [t("xy"), t("x + y")]),
        ("XOR, NOT", [t("x \\oplus y"), t("x'", ["x"])]),
        ("AND, NOT", [t("xy"), t("x'", ["x"])]),
        ("IMP", [t("x' + y")]),
        ("MAJ", [t("xy + yz + zx", ["x", "y", "z"])]),
        ("MUX", [t("s'a + sb", ["s", "a", "b"])]),
    ]
    head = ["set", "T0", "T1", "S", "M", "A", "all ✓?"]
    rows_, verdict = [], []
    for name, fs in sets:
        esc = [any(not bl.post_classes(f)[c] for f in fs) for c in bl.POST]
        ok = all(esc)
        assert ok == bl.complete(fs)
        rows_.append([name] + ["✓" if e else "·" for e in esc] + ["yes" if ok else "no"])
        verdict.append(ok)
    assert verdict == [True, False, False, True, False, False, False]
    assert bl.complete(sets[4][1], constants=(0,)) and bl.complete(sets[6][1], constants=(0, 1)) and not bl.complete(sets[5][1], constants=(0, 1))
    W, NW = 660, 360
    blank = [[r[0]] + [" "] * 6 for r in rows_]
    els = [*heads("Post's test: a set must escape all five classes", "Post's five classes", W),
           tbl("t", 30, 60, 85, 30, [head] + blank, {"x": 4, "y": 56, "cellW": 50, "cellH": 28}),
           text("leg", W / 2, 320, "T0: 0-preserving · T1: 1-preserving · S: self-dual · M: monotone · A: affine. ✓ = some member is outside the class.",
                "wide", anchor="middle", size=12),
           text("legn", NW / 2, 290, "✓ = a member escapes the class", "narrow", anchor="middle", size=11)]
    st, cur = [], [r[:] for r in blank]
    why = ["NAND escapes every class: NAND(0, 0) = 1, NAND(1, 1) = 0, it is not self-dual, not monotone (0 → 1 lowers it) and not affine. Complete on its own.",
           "AND and OR are both monotone (and 0- and 1-preserving): they can never produce a complement. Not complete.",
           "XOR and NOT are both affine (x ⊕ y and x ⊕ 1): every circuit of them is an XOR of inputs and constants. Not complete.",
           "AND escapes the self-dual and affine classes, NOT escapes the preserving and monotone ones: together they escape all five. Complete.",
           "Implication escapes everything except 1-preservation (1 → 1 = 1). Not complete alone; add the constant 0 and it is.",
           "Majority is self-dual, monotone, 0- and 1-preserving. Not complete, even with free constants (constants are monotone).",
           "The 2:1 MUX preserves 0 and 1, so alone it is not complete; with the constants 0 and 1 it is (it then makes NOT and AND)."]
    for k in range(len(sets)):
        cur[k] = rows_[k][:]
        st.append(step(why[k], ("t", {"rows": [head] + [r[:] for r in cur], "highlight": [[k + 1, j] for j in range(1, 7) if rows_[k][j] in ("✓", "yes")]})))
    return spec("Functional completeness by Post's five classes", (W, 340), (NW, 310),
                "Each row is a set of gates; each column one of Post's five closed classes.", els, st)


# ── Lesson 6: circuit analysis and timing ───────────────────────────────────

def wave_points(events, t_end, x0, sx, y_low, y_high, start=0):
    """Polyline for a 0/1 waveform: events = sorted list of (time, new value)."""
    pts, v = [[x0, y_high if start else y_low]], start
    for t, nv in events:
        if nv == v:
            continue
        x = x0 + t * sx
        pts.append([x, y_high if v else y_low])
        pts.append([x, y_high if nv else y_low])
        v = nv
    pts.append([x0 + t_end * sx, y_high if v else y_low])
    return [[round(a, 2), round(b, 2)] for a, b in pts]


def simulate(events_a, d, t_end):
    """Waveform of the delayed signal a(t − d)."""
    return [(t + d, v) for t, v in events_a if t + d <= t_end]


def xor_wave(e1, e2, t_end):
    times = sorted({t for t, _ in e1} | {t for t, _ in e2})
    val = lambda ev, t: ([v for tt, v in ev if tt <= t] or [0])[-1]
    out, last = [], 0
    for t in times:
        v = val(e1, t) ^ val(e2, t)
        if v != last:
            out.append((t, v))
            last = v
    return out


def and_wave(e1, e2, t_end, start1=0, start2=0):
    times = sorted({0} | {t for t, _ in e1} | {t for t, _ in e2})
    val = lambda ev, t, s: ([v for tt, v in ev if tt <= t] or [s])[-1]
    out, last = [], val(e1, 0, start1) & val(e2, 0, start2)
    for t in times:
        v = val(e1, t, start1) & val(e2, t, start2)
        if v != last:
            out.append((t, v))
            last = v
    return out, (start1 & start2)


@scene
def signal_flow():
    V = ["A", "B", "C"]
    nand = lambda a, b: 1 - (a & b)
    assert bl.equal("((AB)'(AC)')'", "AB + AC", V)
    W, NW = 640, 360
    gw, gh = 60, 44
    G = {"G1": (210, 60), "G2": (210, 170), "G3": (400, 115)}
    NG = {"G1": (110, 60), "G2": (110, 170), "G3": (240, 115)}
    srcs = {"G1": ["A", "B"], "G2": ["A", "C"], "G3": ["G1", "G2"]}
    yin = {"A": 74.67, "B": 89.33, "C": 199.33}
    els = [*heads("Signals flow one gate delay at a time", "One gate delay per level", W)]
    for g in G:
        els.append(gate(g.lower(), *G[g], gw, gh, "nand", {"x": NG[g][0], "y": NG[g][1], "w": 54, "h": 40}, label=g))
    for name, y in yin.items():
        els.append(text("l" + name, 56, y, name, {"x": 46, "y": y, "size": 10}, anchor="end", size=13, weight="bold", mono=True))
    for g, ss in srcs.items():
        p = pins("nand", *G[g], gw, gh)[0]
        q = pins("nand", *NG[g], 54, 40)[0]
        for k, s_ in enumerate(ss):
            if s_ in yin:
                a, na = [60, yin[s_]], [50, yin[s_]]
                mid, nmid = (150 if s_ == "A" else None), (80 if s_ == "A" else None)
            else:
                a = pins("nand", *G[s_], gw, gh)[1]
                na = pins("nand", *NG[s_], 54, 40)[1]
                mid = nmid = None
            els.append(line(f"w{g}{k}", wire_pts(a, p[k], mid), {"points": wire_pts(na, q[k], nmid)}))
    o = pins("nand", *G["G3"], gw, gh)[1]
    no = pins("nand", *NG["G3"], 54, 40)[1]
    els.append(line("wF", [o, [o[0] + 40, o[1]]], {"points": [no, [no[0] + 30, no[1]]]}))
    els.append(text("lF", o[0] + 52, o[1], "F", {"x": no[0] + 40, "y": no[1]}, anchor="middle", size=15, weight="bold"))
    for g in G:
        els.append(text("v" + g, G[g][0] + gw + 12, G[g][1] - 4, "", {"x": NG[g][0] + 60, "y": NG[g][1] - 4, "size": 12}, anchor="middle", size=15, weight="bold", mono=True))
    els.append(text("clock", W / 2, 262, "", {"x": NW / 2, "y": 252, "size": 12}, anchor="middle", size=15, mono=True))
    A, B, C = 1, 0, 1
    g1, g2 = nand(A, B), nand(A, C)
    f = nand(g1, g2)
    assert (g1, g2, f) == (1, 0, 1) and f == (A & B) | (A & C)
    st = [
        step("t = 0: the inputs change to A = 1, B = 0, C = 1. The gate outputs still show their old values for one gate delay.",
             ("lA", {"text": "A = 1", "tone": "success"}), ("lB", {"text": "B = 0", "tone": "muted"}), ("lC", {"text": "C = 1", "tone": "success"}),
             ("clock", {"text": "t = 0"})),
        step(f"t = 1 gate delay: the first level settles. G1 = (A·B)′ = {g1}, G2 = (A·C)′ = {g2}.",
             ("vG1", {"text": str(g1), "tone": tone(g1)}), ("vG2", {"text": str(g2), "tone": tone(g2)}),
             ("g1", {"fill": "success" if g1 else "none"}), ("g2", {"fill": "success" if g2 else "none"}), ("clock", {"text": "t = 1 delay"})),
        step(f"t = 2 gate delays: the output gate sees settled inputs. F = (G1·G2)′ = ({g1}·{g2})′ = {f}. The circuit is AB + AC, and A(B + C) = 1·1 = 1 agrees.",
             ("vG3", {"text": str(f), "tone": tone(f)}), ("g3", {"fill": "success" if f else "none"}), ("wF", {"tone": tone(f)}),
             ("clock", {"text": "t = 2 delays: F settled"})),
        step("The longest input-to-output path passes through two gates, so the output is valid two gate delays after the inputs change: that is the circuit's propagation delay.",
             ("clock", {"text": "delay = 2 levels", "tone": "success"})),
    ]
    return spec("Values propagate through a NAND circuit level by level", (W, 280), (NW, 270),
                "A two-level NAND circuit, G1 = NAND(A, B), G2 = NAND(A, C), F = NAND(G1, G2).", els, st)


@scene
def block_sets():
    f1, f2, f = [1, 3, 5, 7, 9], [3, 7, 9, 12], [3, 7, 9, 14]
    p = sorted(set(f1) & set(f2))
    need = sorted(set(f) - set(p))
    assert p == [3, 7, 9] and need == [14] and set(p) <= set(f)
    W, NW = 660, 360
    fill = lambda ms: "".join("1" if i in ms else "0" for i in range(16))
    rows_ = [("f₁", f1), ("f₂", f2), ("f₁·f₂", p), ("f", f), ("f₃ ⊇", need)]
    els = [*heads("Solving f = f₁·f₂ + f₃ for the unknown block", "Solve f = f₁f₂ + f₃", W)]
    for k, (lab, ms) in enumerate(rows_):
        y, ny = 64 + k * 46, 62 + k * 40
        hid = k >= 2
        kw = {"labels": [str(i) for i in range(16)]} if k == 0 else {}
        els.append(text(f"l{k}", 66, y + 15, lab, {"x": 30, "y": ny + 10, "size": 11}, anchor="middle", size=14, weight="bold", hidden=hid))
        els.append(bits(f"b{k}", 104, y, fill(ms), 34, {"x": 60, "y": ny, "cell": 18}, hidden=hid, **kw))
    els.append(text("res", W / 2, 300, "", {"x": NW / 2, "y": 272, "size": 11}, anchor="middle", size=14, mono=True))
    st = [
        step("AND is intersection: f₁·f₂ = Σ(3, 7, 9). These rows are already supplied by the AND gate.",
             ("l2", {"hidden": False}), ("b2", {"hidden": False, "highlight": p})),
        step("The target is f = Σ(3, 7, 9, 14). First check that f₁·f₂ lies inside f; it does, so a solution exists.",
             ("l3", {"hidden": False}), ("b3", {"hidden": False, "highlight": p})),
        step("OR is union, so f₃ must supply every row of f that the AND does not: f₃ must contain row 14.",
             ("l4", {"hidden": False}), ("b4", {"hidden": False, "highlight": need})),
        step("f₃ must also stay inside f (any extra row would appear in the output). So f₃ = Σ(14) plus any subset of {3, 7, 9}: f − f₁f₂ ⊆ f₃ ⊆ f.",
             ("res", {"text": "Σ(14) ⊆ f₃ ⊆ Σ(3, 7, 9, 14)", "tone": "success"})),
    ]
    return spec("Unknown blocks in a circuit of functions, by minterm sets", (W, 320), (NW, 290),
                "Four-variable functions as rows 0–15. The circuit computes f = f₁·f₂ + f₃; f₁, f₂ and f are known.", els, st)


@scene
def staircase_switch():
    W, NW = 640, 360
    def blade(px, py, on):
        return [[px, py], [px + 50, py - 44]] if on else [[px, py], [px + 50, py + 44]]
    els = [*heads("Two staircase switches: the lamp is XNOR", "Staircase switches = XNOR", W),
           line("bb", [[190, 78], [450, 78]], {"points": [[110, 78], [250, 78]]}),
           line("cc", [[190, 166], [450, 166]], {"points": [[110, 166], [250, 166]]}),
           text("tb", 320, 66, "b–b wire", {"x": 180, "y": 66, "size": 11}, anchor="middle", size=12, tone="muted"),
           text("tc", 320, 184, "c–c wire", {"x": 180, "y": 184, "size": 11}, anchor="middle", size=12, tone="muted"),
           line("loop", [[140, 122], [60, 122], [60, 240], [560, 240], [560, 122], [500, 122]],
                {"points": [[60, 122], [24, 122], [24, 260], [336, 260], [336, 122], [300, 122]]}),
           el("lamp", "circle", {"cx": 180, "cy": 260, "r": 16}, cx=310, cy=240, r=18, fill="none", label="off", size=11),
           text("s1", 150, 200, "S1", {"x": 70, "y": 210, "size": 12}, anchor="middle", size=14, weight="bold"),
           text("s2", 490, 200, "S2", {"x": 290, "y": 210, "size": 12}, anchor="middle", size=14, weight="bold"),
           line("p1", blade(140, 122, 1), "wide", tone="accent"), line("p2", [[500, 122], [450, 78]], "wide", tone="accent"),
           line("p1n", blade(60, 122, 1), "narrow", tone="accent"), line("p2n", [[300, 122], [250, 78]], "narrow", tone="accent"),
           text("st", W / 2, 290, "", {"x": NW / 2, "y": 300, "size": 12}, anchor="middle", size=15, mono=True)]
    for e in els:
        if e["id"] in ("bb", "cc"):
            pass
    def b2(px, py, on, nwide=True):
        return [[px, py], [px - 50, py - 44]] if on else [[px, py], [px - 50, py + 44]]
    st = []
    for s1, s2 in [(1, 1), (1, 0), (0, 0), (0, 1)]:
        lit = int(s1 == s2)
        st.append(step(f"S1 = {s1}, S2 = {s2}: " + ("both blades touch the same wire, the loop closes, the lamp is on." if lit else "the blades touch different wires, the loop is open, the lamp is off.")
                       + (" Flipping either switch now toggles the lamp." if (s1, s2) == (1, 0) else ""),
                       ("p1", {"points": blade(140, 122, s1)}), ("p2", {"points": b2(500, 122, s2)}),
                       ("p1n", {"points": blade(60, 122, s1)}), ("p2n", {"points": b2(300, 122, s2)}),
                       ("lamp", {"fill": "warning" if lit else "none", "label": "on" if lit else "off", "tone": "warning" if lit else "ink"}),
                       ("st", {"text": f"lamp = S1 ⊙ S2 = {lit}"})))
    st.append(step("The lamp is on exactly when the two switches agree: L = S1 ⊙ S2 = S1·S2 + S1′·S2′. Swapping the wires (b to c) gives XOR instead; either way each switch toggles the lamp.",))
    assert bl.tt("S \\odot T", ["S", "T"]) == (1, 0, 0, 1)
    return spec("A staircase (two-way switch) circuit computes XNOR", (W, 310), (NW, 320),
                "Each two-way switch connects its pivot to the top terminal b (ON, 1) or the bottom terminal c (OFF, 0). The b terminals are wired together, and so are the c terminals.", els, st)


@scene
def glitch_timing():
    T, d = 10, 1
    X = [(2, 1), (6, 0)]
    Xn = [(t + d, 1 - v) for t, v in X]   # inverter output, delayed
    Y, y0 = and_wave(X, Xn, T, start1=0, start2=1)
    assert Y == [(2, 1), (3, 0)] and y0 == 0
    W, NW = 640, 360
    x0, sx, nx0, nsx = 110, 46, 60, 28
    lanes = [("X", X, 0, 70), ("X′", Xn, 1, 140), ("Y = X·X′", Y, 0, 210)]
    els = [*heads("A glitch from a slow inverter: Y = X·X′", "Glitch: Y = X·X′", W)]
    for k, (lab, ev, s0, y) in enumerate(lanes):
        ny = 70 + k * 64
        els.append(text(f"l{k}", 96, y, lab, {"x": 54, "y": ny, "size": 11}, anchor="end", size=13, weight="bold", mono=True, hidden=k > 0))
        els.append(line(f"w{k}", wave_points(ev, T, x0, sx, y + 14, y - 14, s0), {"points": wave_points(ev, T, nx0, nsx, ny + 12, ny - 12, s0)},
                        hidden=k > 0, tone="info" if k < 2 else "danger"))
    for t in range(0, T + 1, 2):
        els.append(text(f"t{t}", x0 + t * sx, 250, str(t), {"x": nx0 + t * nsx, "y": 250, "size": 10}, anchor="middle", size=11, tone="muted"))
    els.append(box("pulse", x0 + 2 * sx, 186, sx, 48, None, {"x": nx0 + 2 * nsx, "y": 190, "w": nsx, "h": 40}, fill="danger", hidden=True, dashed=True))
    els.append(text("note", W / 2, 285, "", {"x": NW / 2, "y": 285, "size": 11}, anchor="middle", size=14))
    st = [
        step("X rises at t = 2 and falls at t = 6. Logically Y = X·X′ is always 0.",),
        step("The inverter takes one time unit, so X′ falls only at t = 3 and rises only at t = 7.", ("l1", {"hidden": False}), ("w1", {"hidden": False})),
        step("Between t = 2 and t = 3 both AND inputs are 1, so Y pulses to 1 for exactly the inverter delay: a static-0 hazard (a glitch).",
             ("l2", {"hidden": False}), ("w2", {"hidden": False}), ("pulse", {"hidden": False}), ("note", {"text": "1-pulse of width = inverter delay on the rising edge"})),
        step("On the falling edge (t = 6 to 7) X is already 0 while X′ is still 0, so the AND sees 0, 0 and Y stays 0. The glitch appears only after X rises.",
             ("note", {"text": "no glitch on the falling edge", "tone": "ink"})),
    ]
    return spec("Timing diagram of the X·X′ glitch", (W, 300), (NW, 300),
                "A signal X feeds an AND gate directly and through an inverter with a delay of 1 time unit. The AND gate is ideal (no delay).", els, st)


@scene
def xor_delay_timing():
    T, d1, d2 = 8, 1, 3
    A = [(1, 1)]
    P = xor_wave(A, simulate(A, d1, T), T)
    Bw = xor_wave(P, simulate(P, d2, T), T)
    assert P == [(1, 1), (2, 0)] and Bw == [(1, 1), (2, 0), (4, 1), (5, 0)]
    W, NW = 640, 360
    x0, sx, nx0, nsx = 140, 52, 70, 32
    lanes = [("A", A), (f"A(t−{d1})", simulate(A, d1, T)), ("P", P), (f"P(t−{d2})", simulate(P, d2, T)), ("B", Bw)]
    els = [*heads("Edge detectors: XOR with a delayed copy", "XOR with a delayed copy", W)]
    for k, (lab, ev) in enumerate(lanes):
        y, ny = 64 + k * 46, 64 + k * 46
        els.append(text(f"l{k}", 128, y, lab, {"x": 64, "y": ny, "size": 11}, anchor="end", size=13, weight="bold", mono=True, hidden=k > 0))
        els.append(line(f"w{k}", wave_points(ev, T, x0, sx, y + 12, y - 12), {"points": wave_points(ev, T, nx0, nsx, ny + 12, ny - 12)},
                        hidden=k > 0, tone="danger" if k in (2, 4) else "info"))
    for t in range(0, T + 1):
        els.append(text(f"t{t}", x0 + t * sx, 300, str(t), {"x": nx0 + t * nsx, "y": 300, "size": 10}, anchor="middle", size=11, tone="muted"))
    els.append(text("note", W / 2, 330, "", {"x": NW / 2, "y": 330, "size": 11}, anchor="middle", size=14))
    show = lambda k: [(f"l{k}", {"hidden": False}), (f"w{k}", {"hidden": False})]
    st = [
        step("Input A: 0 until t = 1, then 1 for ever. (Everything is 0 before t = 0.)",),
        step(f"A buffer delays A by {d1}: its output rises at t = {1 + d1}.", *show(1)),
        step("P = A ⊕ (delayed A) is 1 only while the two differ: from t = 1 to t = 2. A single edge of A becomes a pulse whose width is the delay.", *show(2)),
        step(f"A second buffer delays P by {d2}: a copy of the pulse from t = 4 to t = 5.", *show(3)),
        step("B = P ⊕ (delayed P) is 1 wherever exactly one pulse is high: [1, 2) and [4, 5). B changes level 4 times between t = 0 and t = 8.",
             *show(4), ("note", {"text": "B: 0→1 at 1, 1→0 at 2, 0→1 at 4, 1→0 at 5: 4 transitions", "tone": "success"})),
    ]
    return spec("Timing diagram of two XOR edge-detector stages", (W, 345), (NW, 345),
                "A circuit of two stages: P = A ⊕ A delayed by 1, then B = P ⊕ P delayed by 3. XOR gates and wires have no delay.", els, st)


def build_all():
    return {name: fn() for name, fn in SPECS.items()}


def dump(s):
    return json.dumps(s, ensure_ascii=False, indent=1) + "\n"


if __name__ == "__main__":
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    for name, s in build_all().items():
        (VIZ_DIR / f"{name}.json").write_text(dump(s))
        print(f"wrote viz/{name}.json ({len(s['steps'])} steps)")
