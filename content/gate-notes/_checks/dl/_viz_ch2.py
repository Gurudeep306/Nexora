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


def build_all():
    return {name: fn() for name, fn in SPECS.items()}


def dump(s):
    return json.dumps(s, ensure_ascii=False, indent=1) + "\n"


if __name__ == "__main__":
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    for name, s in build_all().items():
        (VIZ_DIR / f"{name}.json").write_text(dump(s))
        print(f"wrote viz/{name}.json ({len(s['steps'])} steps)")
