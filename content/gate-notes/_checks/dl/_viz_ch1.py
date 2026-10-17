"""Generator for the Digital Logic Chapter 1 Viz scenes (content/gate-notes/dl/viz/*.json).

Every number in a caption, label or table is computed here with numlib, so the
scenes cannot drift from the checked maths.

    python3 content/gate-notes/_checks/dl/_viz_ch1.py          # write the JSON files
    python3 content/gate-notes/_checks/dl/viz_ch1.py           # (check) files == generator output

The leading underscore keeps scripts/gate-notes/run_checks.py from running this
file as a check; viz_ch1.py does that comparison instead.
"""
import json
import math
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from fractions import Fraction  # noqa: E402

import numlib as nl  # noqa: E402

VIZ_DIR = nl.CONTENT / "viz"
SUP = str.maketrans("0123456789-", "⁰¹²³⁴⁵⁶⁷⁸⁹⁻")
SUB = str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉")


def sup(n):
    return str(n).translate(SUP)


def sub(n):
    return str(n).translate(SUB)


def spec(title, width, height, intro, elements, steps):
    return {"version": 1, "title": title, "width": width, "height": height, "intro": intro,
            "elements": elements, "steps": steps}


def step(caption, *patches):
    return {"caption": caption, "patches": [{"id": i, "set": s} for i, s in patches]}


def text(id, x, y, t, **kw):
    return {"id": id, "type": "text", "x": x, "y": y, "text": t, **kw}


def box(id, x, y, w, h, label=None, **kw):
    el = {"id": id, "type": "box", "x": x, "y": y, "w": w, "h": h, **kw}
    if label is not None:
        el["label"] = label
    return el


def arrow(id, frm, to, **kw):
    return {"id": id, "type": "arrow", "from": frm, "to": to, **kw}


SPECS = {}


def scene(fn):
    SPECS[fn.__name__.replace("_", "-")] = fn
    return fn


# ── Lesson 1 ────────────────────────────────────────────────────────────────

@scene
def place_value_strip():
    digits = "1201"
    cell, x0, y0 = 72, 136, 70
    els = [
        text("base", 280, 22, "Reading 1201 in base 3", anchor="middle", size=18, weight="bold"),
        {"id": "cells", "type": "bits", "x": x0, "y": y0, "bits": digits, "cell": cell,
         "labels": [f"3{sup(3 - i)}" for i in range(4)], "below": [str(3 ** (3 - i)) for i in range(4)]},
    ]
    for i in range(4):
        els.append(text(f"c{i}", x0 + cell * i + cell / 2, y0 + cell + 52, "", anchor="middle", size=16, mono=True, tone="subject"))
    els.append(box("total", 170, 236, 220, 46, "total = 0", mono=True, size=18))
    steps, total = [], 0
    for i, ch in enumerate(digits):
        d, p = int(ch), 3 ** (3 - i)
        total += d * p
        steps.append(step(
            f"The {ordinal(i)} digit is {d} and sits in the 3{sup(3 - i)} = {p} place, so it adds {d} × {p} = {d * p}. Running total: {total}.",
            ("cells", {"highlight": list(range(i + 1))}),
            (f"c{i}", {"text": f"{d}×{p}={d * p}"}),
            ("total", {"label": f"total = {total}"}),
        ))
    assert total == nl.value("1201", 3) == 46
    steps[-1]["caption"] += " So (1201)₃ = 46."
    steps[-1]["patches"].append({"id": "total", "set": {"tone": "success", "fill": "success"}})
    t5 = nl.value("1201", 5)
    steps.append(step(
        "Now keep the same four digits but switch the base to 5. Only the place values change: 125, 25, 5 and 1.",
        ("base", {"text": "Reading 1201 in base 5"}),
        ("cells", {"labels": [f"5{sup(3 - i)}" for i in range(4)], "below": [str(5 ** (3 - i)) for i in range(4)], "highlight": []}),
        *[(f"c{i}", {"text": ""}) for i in range(4)],
        ("total", {"label": "total = 0", "tone": "ink", "fill": "none"}),
    ))
    parts = [int(ch) * 5 ** (3 - i) for i, ch in enumerate(digits)]
    steps.append(step(
        f"Weighting each digit again: {' + '.join(str(p) for p in parts)} = {t5}. Same digits, larger base, larger value: (1201)₅ = {t5}.",
        ("cells", {"highlight": [0, 1, 2, 3]}),
        *[(f"c{i}", {"text": f"{digits[i]}×{5 ** (3 - i)}={parts[i]}"}) for i in range(4)],
        ("total", {"label": f"total = {t5}", "tone": "success", "fill": "success"}),
    ))
    return spec("Place value: the same digits in base 3 and base 5", 560, 300,
                "The digits 1 2 0 1 in four cells. Above each cell is its place value in base 3, a power of 3 that grows from right to left.",
                els, steps)


def ordinal(i):
    return ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"][i]


@scene
def odometer_rollover():
    x0, y0, w = 120, 70, 64
    els = [text("head", 280, 26, "A base-3 counter (each wheel shows 0, 1 or 2)", anchor="middle", size=17, weight="bold")]
    for i in range(4):
        els.append(box(f"w{i}", x0 + i * (w + 16), y0, w, 76, "0", mono=True, size=34))
        els.append(text(f"p{i}", x0 + i * (w + 16) + w / 2, y0 + 96, f"3{sup(3 - i)}", anchor="middle", size=15, tone="muted"))
    els.append(box("count", 160, 196, 240, 44, "count = 0", mono=True, size=17))
    els.append(arrow("carry", [x0 + 3 * (w + 16) + 4, y0 - 8], [x0 + 2 * (w + 16) + w - 4, y0 - 8], curve=-0.5, tone="warning", hidden=True, label="carry"))

    def show(n, *extra, tone_hi=()):
        s = nl.to_base(n, 3, 4)
        pats = [(f"w{i}", {"label": s[i], "tone": "subject" if i in tone_hi else "ink", "fill": "subject" if i in tone_hi else "none"}) for i in range(4)]
        return pats + [("count", {"label": f"count = {n}"})] + list(extra)

    assert nl.to_base(3, 3, 4) == "0010" and nl.to_base(26, 3, 4) == "0222" and nl.to_base(27, 3, 4) == "1000"
    steps = [
        step("One count: the right wheel moves from 0 to 1.", *show(1, tone_hi=(3,))),
        step("Two counts: the right wheel shows 2, the largest digit base 3 allows.", *show(2, tone_hi=(3,))),
        step("Three counts: the right wheel cannot show 3, so it rolls back to 0 and pushes the next wheel on by one. The display reads 10, which in base 3 means one three and no ones.",
             *show(3, ("carry", {"hidden": False}), tone_hi=(2, 3))),
        step("Jump ahead to 26 counts: every wheel shows its largest digit, 222. That is 2·9 + 2·3 + 2 = 26 = 3³ − 1.",
             *show(26, ("carry", {"hidden": True}), tone_hi=())),
        step("One more count makes every wheel roll over in turn, and the carry ripples to a new wheel: 1000 in base 3 is 3³ = 27. In any base, 1 followed by k zeros is b to the power k.",
             *show(27, ("count", {"tone": "success", "fill": "success"}), tone_hi=(0, 1, 2, 3))),
    ]
    return spec("An odometer that rolls over at 3", 560, 260,
                "Four counter wheels, all at 0. Under each wheel is the place value it stands for: 27, 9, 3 and 1.", els, steps)


@scene
def repeated_division_ladder():
    n, b = 2748, 16
    rows = nl.division_steps(n, b)
    assert [r[2] for r in rows] == [12, 11, 10] and nl.to_base(n, b) == "ABC"
    els = [text("head", 24, 26, f"Convert {n} to base {b}: divide by {b}, keep the remainder", size=17, weight="bold")]
    y = 76
    for i, (dvd, q, r) in enumerate(rows):
        els.append(text(f"r{i}", 30, y + 54 * i, f"{dvd} = {b} × {q} + {r}", size=18, mono=True, hidden=True))
        els.append(box(f"d{i}", 300, y + 54 * i - 21, 56, 42, nl.DIGITS[r], mono=True, size=22, hidden=True, tone="subject"))
        els.append(text(f"n{i}", 372, y + 54 * i, f"{r} is the hex digit {nl.DIGITS[r]}", size=15, tone="muted", hidden=True))
    els.append(arrow("up", [328, y + 54 * 2 + 32], [328, y - 32], tone="success", hidden=True))
    els.append(box("ans", 150, 250, 260, 44, f"{n} = (ABC)₁₆", mono=True, size=19, hidden=True, tone="success", fill="success"))
    steps = []
    for i, (dvd, q, r) in enumerate(rows):
        tail = (" This first remainder is the units digit." if i == 0 else
                " The quotient is now 0, so we stop." if q == 0 else " Carry on with the quotient.")
        steps.append(step(
            f"Divide {dvd} by {b}: quotient {q}, remainder {r}, which is written {nl.DIGITS[r]} in hex.{tail}",
            (f"r{i}", {"hidden": False}), (f"d{i}", {"hidden": False}), (f"n{i}", {"hidden": False}),
        ))
    steps.append(step("The first remainder is the lowest digit and the last remainder is the leading digit, so read the column from the bottom up: A, B, C.",
                      ("up", {"hidden": False})))
    check = 10 * 256 + 11 * 16 + 12
    assert check == n
    steps.append(step(f"So {n} = (ABC)₁₆. Check by expanding: 10·256 + 11·16 + 12 = 2560 + 176 + 12 = {check}.",
                      ("ans", {"hidden": False})))
    return spec("Repeated division: 2748 to hexadecimal", 560, 310,
                "We will divide by 16 again and again. Each remainder becomes one hex digit.", els, steps)


@scene
def horner_chain():
    num, b = "257", 8
    tr = nl.horner_trace(num, b)
    assert tr == [0, 2, 21, 175]
    els = [text("head", 280, 24, "Horner's chain for (257)₈: multiply by 8, add the next digit", anchor="middle", size=16, weight="bold")]
    xs = [30, 160, 290, 420]
    for i, v in enumerate(tr):
        els.append(box(f"t{i}", xs[i], 90, 110, 52, str(v) if i == 0 else "?", mono=True, size=22,
                       tone="ink", hidden=i > 0))
    for i in range(3):
        els.append(arrow(f"a{i}", f"t{i}", f"t{i + 1}", label=f"×8, +{num[i]}", hidden=True, tone="subject"))
        els.append(text(f"w{i}", xs[i + 1] + 55, 172, f"{tr[i]}×8+{num[i]}", anchor="middle", size=15, mono=True, tone="muted", hidden=True))
    els.append(text("note", 280, 220, "", anchor="middle", size=15))
    steps = []
    for i in range(3):
        steps.append(step(
            f"Take the running total {tr[i]}, multiply by 8 and add the next digit {num[i]}: {tr[i]} × 8 + {num[i]} = {tr[i + 1]}.",
            (f"a{i}", {"hidden": False}), (f"t{i + 1}", {"hidden": False, "label": str(tr[i + 1]), "tone": "success" if i == 2 else "ink", "fill": "success" if i == 2 else "none"}),
            (f"w{i}", {"hidden": False}),
        ))
    steps.append(step("Every digit has been used, so the last total is the value: (257)₈ = 175. The same total comes from 2·64 + 5·8 + 7, but without writing any powers.",
                      ("note", {"text": "2·64 + 5·8 + 7 = 175 ✓"})))
    return spec("Horner's chain: (257)₈ to decimal", 560, 240,
                "Start with a running total of 0. Each arrow will multiply the total by the base 8 and add one digit.", els, steps)


@scene
def radix_solutions_grid():
    # (123)_5 = (x8)_y  →  xy + 8 = 38  →  xy = 30.
    rows_a = [["x", "y", "valid?"]]
    hi_a = []
    for x in range(1, 31):
        if 30 % x == 0:
            y = 30 // x
            ok = y >= 9 and 1 <= x < y
            why = "✓" if ok else ("y=1 ✗" if y == 1 else "y<9 ✗")
            rows_a.append([str(x), str(y), why])
            if ok:
                hi_a += [[len(rows_a) - 1, c] for c in range(3)]
    assert sum(1 for r in rows_a[1:] if r[2] == "✓") == 3 == len(hi_a) // 3
    assert nl.value("123", 5) == 38
    # (43)_x = (y3)_8  →  4x + 3 = 8y + 3  →  x = 2y.
    rows_b = [["y", "x", "valid?"]]
    hi_b = []
    for y in range(0, 8):
        x = 2 * y
        ok = x >= 5
        rows_b.append([str(y), str(x), "✓" if ok else "x<5 ✗"])
        if ok:
            hi_b += [[len(rows_b) - 1, c] for c in range(3)]
    assert len(hi_b) // 3 == 5
    els = [
        text("ha", 140, 18, "(123)₅ = (x8)ᵧ, so xy = 30", anchor="middle", size=15, weight="bold"),
        {"id": "ta", "type": "table", "x": 14, "y": 34, "cellW": 84, "cellH": 30, "rows": rows_a, "header": True, "highlight": hi_a, "mono": True},
        text("hb", 420, 18, "(43)ₓ = (y3)₈, so x = 2y", anchor="middle", size=15, weight="bold"),
        {"id": "tb", "type": "table", "x": 294, "y": 34, "cellW": 84, "cellH": 30, "rows": rows_b, "header": True, "highlight": hi_b, "mono": True},
        text("fa", 140, 326, "3 solutions", anchor="middle", size=16, weight="bold", tone="success"),
        text("fb", 420, 326, "5 solutions", anchor="middle", size=16, weight="bold", tone="success"),
    ]
    return spec("Counting radix solutions: every candidate pair, with the invalid ones explained", 560, 344,
                "Two tables of candidate pairs. A tick marks a pair that satisfies the equation and every digit limit. A cross names the rule the pair breaks: y = 1 is not a base, the digit 8 needs y ≥ 9, and the digit 4 needs x ≥ 5.",
                els, [])


# ── Lesson 2 ────────────────────────────────────────────────────────────────

@scene
def grouping_slider():
    bits = "1011010"
    n = int(bits, 2)
    assert n == 90 and nl.to_base(n, 8) == "132" and nl.to_base(n, 16) == "5A"
    cells = "00" + bits            # two padding cells on the left
    cw, x0, y0 = 50, 55, 70
    els = [text("head", 280, 24, "Grouping the bits of (1011010)₂ from the right", anchor="middle", size=17, weight="bold")]
    for i, c in enumerate(cells):
        pad = i < 2
        els.append(box(f"b{i}", x0 + i * cw, y0, cw, 50, c, mono=True, size=22, hidden=pad, dashed=pad, tone="muted" if pad else "ink"))
    els.append(text("pt", x0 + 9 * cw + 6, y0 + 36, "•", size=26, weight="bold", tone="danger"))
    els.append(text("ptl", x0 + 9 * cw - 4, y0 + 74, "point", size=14, tone="danger"))
    # octal groups (cells 6-8, 3-5, 0-2) and hex groups (cells 5-8, 1-4)
    def bracket(id, a, b, label, tone):
        xa, xb = x0 + a * cw + 4, x0 + (b + 1) * cw - 4
        return [{"id": id, "type": "line", "points": [[xa, y0 + 60], [xa, y0 + 70], [xb, y0 + 70], [xb, y0 + 60]], "tone": tone, "hidden": True},
                text(id + "t", (xa + xb) / 2, y0 + 98, label, anchor="middle", size=22, mono=True, weight="bold", tone=tone, hidden=True)]
    oct_groups = [(6, 8), (3, 5), (0, 2)]
    for k, (a, b) in enumerate(oct_groups):
        g = cells[a:b + 1]
        els += bracket(f"o{k}", a, b, str(int(g, 2)), "subject")
    hex_groups = [(5, 8), (1, 4)]
    for k, (a, b) in enumerate(hex_groups):
        g = cells[a:b + 1]
        els += bracket(f"h{k}", a, b, nl.DIGITS[int(g, 2)], "info")
    els.append(box("ans", 130, 236, 300, 44, "", mono=True, size=18, hidden=True, tone="success", fill="success"))
    steps = [
        step("Start at the radix point (here, just right of the last bit) and cut off three bits: 010. Three bits make one octal digit, and 010 is 2.",
             ("o0", {"hidden": False}), ("o0t", {"hidden": False})),
        step("The next three bits to the left, 011, are the octal digit 3.", ("o1", {"hidden": False}), ("o1t", {"hidden": False})),
        step("Only one bit, 1, is left. Pad it on the left with two zeros (that adds nothing to the value) to make 001 = 1.",
             ("b0", {"hidden": False}), ("b1", {"hidden": False}), ("o2", {"hidden": False}), ("o2t", {"hidden": False})),
        step(f"Read the groups left to right: (1011010)₂ = (132)₈. Check: 64 + 24 + 2 = {n}.",
             ("ans", {"hidden": False, "label": "(1011010)₂ = (132)₈"})),
        step("Now regroup in fours for hexadecimal, again starting at the point: 1010 is A.",
             *[(f"o{k}", {"hidden": True}) for k in range(3)], *[(f"o{k}t", {"hidden": True}) for k in range(3)],
             ("b0", {"hidden": True}), ("ans", {"hidden": True}), ("h0", {"hidden": False}), ("h0t", {"hidden": False})),
        step(f"The last three bits 101 need one padding zero: 0101 = 5. So (1011010)₂ = (5A)₁₆ = 5·16 + 10 = {n}.",
             ("h1", {"hidden": False}), ("h1t", {"hidden": False}), ("ans", {"hidden": False, "label": "(1011010)₂ = (5A)₁₆"})),
    ]
    return spec("Grouping bits into octal and hex digits", 560, 300,
                "The seven bits 1011010. The red dot marks the radix point at the right end. Dashed cells on the left are padding zeros that will appear when a group runs short.",
                els, steps)


@scene
def octal_hex_bridge():
    oc = "546"
    n = int(oc, 8)
    b = "".join(nl.to_base(int(c), 2, 3) for c in oc)
    assert b == "101100110" and nl.to_base(n, 16) == "166" and n == 358
    cw, x0 = 40, 60
    els = [text("head", 280, 22, "Octal → binary → hexadecimal, never through decimal", anchor="middle", size=17, weight="bold")]
    for k, c in enumerate(oc):
        els.append(box(f"oc{k}", x0 + (3 + 3 * k) * cw, 44, 3 * cw - 6, 40, c, mono=True, size=22, tone="subject"))
    padded = "000" + b  # 12 cells, 3 padding zeros in front
    for i, c in enumerate(padded):
        els.append(box(f"c{i}", x0 + i * cw - 3 * cw + 3 * cw, 120, cw, 44, c, mono=True, size=20, hidden=True, dashed=i < 3, tone="muted" if i < 3 else "ink"))
    for k in range(3):
        g = padded[4 * k:4 * k + 4]
        xa = x0 + 4 * k * cw
        els.append({"id": f"hb{k}", "type": "line", "points": [[xa + 4, 172], [xa + 4, 180], [xa + 4 * cw - 4, 180], [xa + 4 * cw - 4, 172]], "tone": "info", "hidden": True})
        els.append(box(f"hx{k}", xa + 30, 196, 4 * cw - 60, 42, nl.DIGITS[int(g, 2)], mono=True, size=22, tone="info", hidden=True))
    els.append(text("lab1", 18, 64, "8", size=15, tone="muted"))
    els.append(text("lab2", 18, 142, "2", size=15, tone="muted"))
    els.append(text("lab3", 14, 217, "16", size=15, tone="muted"))
    els.append(text("note", 280, 268, "", anchor="middle", size=16, tone="success", weight="bold"))
    steps = [
        step("Write each octal digit as exactly three bits: 5 → 101, 4 → 100, 6 → 110. Each digit is replaced on its own; nothing carries between digits.",
             *[(f"c{i}", {"hidden": False}) for i in range(3, 12)]),
        step("Now forget the old boundaries. Cut the bit string into fours, starting from the right end (the radix point).",
             *[(f"hb{k}", {"hidden": False}) for k in range(3)]),
        step("The leftmost group has only one bit, so pad it with three zeros on the left: 0001.",
             *[(f"c{i}", {"hidden": False}) for i in range(3)]),
        step("Read each four-bit group as one hex digit: 0001 → 1, 0110 → 6, 0110 → 6.",
             *[(f"hx{k}", {"hidden": False}) for k in range(3)]),
        step(f"So (546)₈ = (166)₁₆. Both equal {n}: 5·64 + 4·8 + 6 = {n} and 1·256 + 6·16 + 6 = {n}.",
             ("note", {"text": f"(546)₈ = (166)₁₆ = {n}"})),
    ]
    assert 5 * 64 + 4 * 8 + 6 == 256 + 96 + 6 == n
    return spec("The binary bridge from octal to hex", 560, 290,
                "The octal numeral 546, one box per digit. Binary and hex rows will appear under it.", els, steps)


@scene
def hex_nibble_table():
    rows_l = [["hex", "bits", "1s", "dec"]]
    rows_r = [["hex", "bits", "1s", "dec"]]
    for d in range(16):
        r = [nl.DIGITS[d], nl.to_base(d, 2, 4), str(bin(d).count("1")), str(d)]
        (rows_l if d < 8 else rows_r).append(r)
    els = [
        {"id": "tl", "type": "table", "x": 8, "y": 8, "cellW": 64, "cellH": 30, "rows": rows_l, "header": True, "mono": True},
        {"id": "tr", "type": "table", "x": 280, "y": 8, "cellW": 64, "cellH": 30, "rows": rows_r, "header": True, "mono": True},
    ]
    return spec("The sixteen hex digits as 4-bit groups, with their count of 1s", 548, 290,
                "Two tables. Left: hex digits 0 to 7, right: 8 to F. Each row gives the digit, its four bits, how many of those bits are 1, and its decimal value. For example 7 is 0111 with three 1s, and F is 1111 with four 1s.",
                els, [])


@scene
def base_carry_column():
    a, b = "37", "45"
    s = nl.to_base(int(a, 8) + int(b, 8), 8)
    assert s == "104" and 7 + 5 == 12 == 8 + 4 and 3 + 4 + 1 == 8
    xs = [220, 290, 360]   # columns: 64s, 8s, 1s
    els = [text("head", 280, 22, "Adding (37)₈ + (45)₈: a column that reaches 8 carries", anchor="middle", size=17, weight="bold")]
    for k, ch in enumerate(" " + a):
        els.append(text(f"a{k}", xs[k], 78, ch, anchor="middle", size=28, mono=True))
    for k, ch in enumerate(" " + b):
        els.append(text(f"b{k}", xs[k], 122, ch, anchor="middle", size=28, mono=True))
    els.append(text("plus", 170, 122, "+", anchor="middle", size=28, mono=True))
    els.append({"id": "bar", "type": "line", "points": [[180, 146], [390, 146]]})
    for k in range(3):
        els.append(text(f"s{k}", xs[k], 176, "", anchor="middle", size=28, mono=True, tone="success", weight="bold"))
        els.append(text(f"cy{k}", xs[k], 44, "", anchor="middle", size=18, mono=True, tone="warning"))
    els.append(text("work", 280, 226, "", anchor="middle", size=16))
    els.append(text("chk", 280, 258, "", anchor="middle", size=15, tone="muted"))
    steps = [
        step("Units column: 7 + 5 = 12. In base 8, twelve is one eight and four units, so write 4 and carry 1 into the eights column.",
             ("s2", {"text": "4"}), ("cy1", {"text": "1"}), ("work", {"text": "7 + 5 = 12 = 1·8 + 4"})),
        step("Eights column: 3 + 4 + the carry 1 = 8. That is exactly one 64 and no eights, so write 0 and carry 1 again.",
             ("s1", {"text": "0"}), ("cy0", {"text": "1"}), ("work", {"text": "3 + 4 + 1 = 8 = 1·8 + 0"})),
        step("Nothing is left to add except the carry, so it becomes the leading digit: (37)₈ + (45)₈ = (104)₈.",
             ("s0", {"text": "1"}), ("work", {"text": "(37)₈ + (45)₈ = (104)₈"})),
        step("Check in decimal: 31 + 37 = 68, and (104)₈ = 64 + 4 = 68.", ("chk", {"text": "31 + 37 = 68 = 64 + 0·8 + 4 ✓"})),
    ]
    assert int(a, 8) == 31 and int(b, 8) == 37 and int(s, 8) == 68
    return spec("Column addition in base 8", 560, 280,
                "Two octal numbers lined up by place: 37 above 45. Carries will appear above the columns.", els, steps)


# ── Writer ──────────────────────────────────────────────────────────────────

def build_all():
    return {name: fn() for name, fn in SPECS.items()}


def dump(s):
    return json.dumps(s, ensure_ascii=False, indent=1) + "\n"


if __name__ == "__main__":
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    for name, s in build_all().items():
        (VIZ_DIR / f"{name}.json").write_text(dump(s))
        print(f"wrote viz/{name}.json ({len(s['steps'])} steps)")
