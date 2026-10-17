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
from fractions import Fraction as F  # noqa: E402

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


# ── Lesson 3 ────────────────────────────────────────────────────────────────

def _peel_rows(x, base, n):
    rows, cyc = nl.frac_steps(x, base, n)
    return rows, cyc


def fmt_dec(fr):
    """Exact short decimal for a Fraction with a terminating decimal expansion."""
    s = nl.to_base_mixed(fr, 10, 8).rstrip("0").rstrip(".")
    assert nl.value(s, 10) == fr, fr
    return s


@scene
def doubling_peel():
    x = F(5, 8)
    rows, cyc = _peel_rows(x, 2, 10)
    assert cyc is None and [r[2] for r in rows] == [1, 0, 1]
    els = [text("head", 280, 24, "0.625 to binary: double, peel off the integer part", anchor="middle", size=17, weight="bold")]
    for i, (xb, p, d, xa) in enumerate(rows):
        y = 70 + 48 * i
        els.append(text(f"r{i}", 40, y, f"{fmt_dec(xb)} × 2 = {fmt_dec(p)}", size=19, mono=True, hidden=True))
        els.append(box(f"d{i}", 300, y - 19, 44, 38, str(d), mono=True, size=20, tone="subject", hidden=True))
        els.append(text(f"k{i}", 356, y, f"keep {fmt_dec(xa)}", size=15, tone="muted", hidden=True))
    els.append(arrow("down", [322, 40], [322, 70 + 48 * 2 + 30], tone="success", hidden=True))
    els.append(text("bits", 28, 238, "0.", size=24, mono=True, weight="bold"))
    for i in range(3):
        els.append(box(f"b{i}", 62 + 40 * i, 218, 38, 40, "", mono=True, size=22, tone="success"))
    els.append(text("ans", 220, 238, "", size=17, tone="success", weight="bold"))
    steps = []
    for i, (xb, p, d, xa) in enumerate(rows):
        tail = " The fraction left is 0, so the expansion stops: 0.625 has a finite binary form." if xa == 0 else ""
        steps.append(step(
            f"{fmt_dec(xb)} × 2 = {fmt_dec(p)}. The integer part {d} is the next bit after the point; keep the fraction {fmt_dec(xa)} for the next round.{tail}",
            (f"r{i}", {"hidden": False}), (f"d{i}", {"hidden": False}), (f"k{i}", {"hidden": False}), (f"b{i}", {"label": str(d)})))
    steps.append(step("The bits come out first-to-last from the top, so read the column downward: 0.625 = (0.101)₂ = 1/2 + 1/8.",
                      ("down", {"hidden": False}), ("ans", {"text": "= 1/2 + 1/8 = 0.625"})))
    assert nl.value("0.101", 2) == x
    return spec("Repeated doubling: 0.625 to binary", 560, 270,
                "We will double the fraction again and again. Each integer part that pops out is one bit after the point.", els, steps)


@scene
def recurring_loop():
    x = F(1, 10)
    rows, cyc = _peel_rows(x, 2, 20)
    assert cyc == 1 and len(rows) == 5 and [r[2] for r in rows] == [0, 0, 0, 1, 1]
    assert nl.expand_fraction(x, 2) == ("0", "0011")
    els = [text("head", 280, 22, "0.1 to binary never stops: the fraction comes back", anchor="middle", size=17, weight="bold")]
    for i, (xb, p, d, xa) in enumerate(rows):
        y = 62 + 40 * i
        els.append(text(f"r{i}", 40, y, f"{fmt_dec(xb)} × 2 = {fmt_dec(p)}", size=18, mono=True, hidden=True))
        els.append(box(f"d{i}", 270, y - 16, 36, 32, str(d), mono=True, size=18, tone="subject", hidden=True))
        els.append(text(f"k{i}", 320, y, f"keep {fmt_dec(xa)}", size=15, tone="muted", hidden=True))
    els.append(arrow("loop", [440, 62 + 40 * 4], [440, 62 + 40 * 1], curve=-0.5, tone="danger", hidden=True))
    els.append(text("looplab", 500, 62 + 40 * 2.5, "repeats", size=15, tone="danger", hidden=True))
    els.append(text("ans", 280, 278, "", anchor="middle", size=18, mono=True, weight="bold", tone="success"))
    steps = []
    for i, (xb, p, d, xa) in enumerate(rows):
        steps.append(step(f"{fmt_dec(xb)} × 2 = {fmt_dec(p)}: bit {d}, keep {fmt_dec(xa)}.",
                          (f"r{i}", {"hidden": False}), (f"d{i}", {"hidden": False}), (f"k{i}", {"hidden": False})))
    steps.append(step("The fraction left over is 0.2 again, the same as after the first row. From here the same four rows repeat for ever, so the bits 0011 repeat for ever.",
                      ("k4", {"tone": "danger"}), ("k0", {"tone": "danger"}), ("loop", {"hidden": False}), ("looplab", {"hidden": False})))
    steps.append(step("So 0.1 = (0.0 0011 0011 0011 …)₂, a recurring binary fraction. Any finite number of bits only approximates it.",
                      ("ans", {"text": "0.1 = (0.0 0011 0011 …)₂"})))
    return spec("Why 0.1 recurs in binary", 560, 300,
                "The same doubling method as for 0.625, applied to 0.1. Watch the fraction that is kept after each row.", els, steps)


@scene
def fixed_point_ruler():
    n = 4
    x0, x1, y = 40, 520, 140
    scale = (x1 - x0) / 16  # pixels per unit, axis 0 … 16
    els = [text("head", 280, 22, "4 bits, point moved: range shrinks, steps get finer", anchor="middle", size=17, weight="bold"),
           {"id": "axis", "type": "line", "points": [[x0, y], [x1, y]]}]
    for k in range(0, 17, 4):
        els.append(text(f"ax{k}", x0 + k * scale, y + 30, str(k), anchor="middle", size=15, tone="muted"))
    for t in range(16):
        els.append({"id": f"t{t}", "type": "line", "points": [[x0 + t * scale, y - 18], [x0 + t * scale, y]], "tone": "subject"})
    els.append(text("info", 280, 210, "", anchor="middle", size=17, mono=True))
    els.append(text("fmt", 280, 70, "", anchor="middle", size=18, mono=True, weight="bold"))
    steps = []
    for f in range(0, 4):
        i = n - f
        mn, mx, res, cnt = nl.fixed_range(i, f)
        assert cnt == 16
        pats = [(f"t{t}", {"points": [[round(x0 + float(t * res) * scale, 2), y - 18], [round(x0 + float(t * res) * scale, 2), y]]}) for t in range(16)]
        bits = "b" * i + ("." + "b" * f if f else "")
        steps.append(step(
            f"With {f} fraction bit{'s' if f != 1 else ''} ({i}.{f} format) the 16 patterns are the multiples of {fmt_dec(res)} from 0 to {fmt_dec(mx)}: resolution {fmt_dec(res)}, largest value {fmt_dec(mx)} = 2{sup(i)} − {fmt_dec(res)}.",
            *pats, ("info", {"text": f"step {fmt_dec(res)}, max {fmt_dec(mx)}"}), ("fmt", {"text": f"{bits}   (i = {i}, f = {f})"})))
    steps.append(step("The count of values never changes: n bits always give 2ⁿ = 16 patterns. Moving the point only trades range for resolution.",
                      ("info", {"tone": "success"})))
    return spec("Fixed point: the range–resolution trade-off", 560, 240,
                "A number line from 0 to 16 with sixteen tick marks, one for each 4-bit pattern. Each step moves the binary point one place left.",
                els, steps)


@scene
def fixed_point_bits():
    labels = ["b₇", "b₆", "b₅", "b₄", "b₃", "b₂", "b₁", "b₀"]
    weights = ["16", "8", "4", "2", "1", "½", "¼", "⅛"]
    x = F(45, 4)   # 11.25
    pat = nl.fixed_bits(x, 5, 3).replace(".", "")
    assert pat == "01011010"
    els = [text("head", 280, 22, "Unsigned 5.3 fixed point: b₇ … b₃ . b₂ b₁ b₀", anchor="middle", size=17, weight="bold"),
           {"id": "cells", "type": "bits", "x": 90, "y": 72, "bits": pat, "cell": 48, "labels": labels, "below": weights,
            "highlight": [i for i, c in enumerate(pat) if c == "1"]},
           text("pt", 90 + 5 * 48, 118, "•", anchor="middle", size=30, weight="bold", tone="danger"),
           text("val", 280, 184, "01011.010 = 8 + 2 + 1 + ¼ = 11.25", anchor="middle", size=18, mono=True, tone="success"),
           text("rng", 280, 220, "range 0 … 31.875 in steps of ⅛ (2⁸ = 256 values)", anchor="middle", size=16, tone="muted")]
    mn, mx, res, cnt = nl.fixed_range(5, 3)
    assert mx == F(255, 8) and res == F(1, 8) and cnt == 256 and 8 + 2 + 1 + F(1, 4) == x
    return spec("Bit weights in a 5.3 fixed-point byte", 560, 240,
                "Eight bit cells b7 to b0 with the binary point between b3 and b2. Weights above the point are 16, 8, 4, 2, 1; below it ½, ¼, ⅛. The pattern 01011.010 is 8 + 2 + 1 + ¼ = 11.25. The format covers 0 to 31.875 in steps of ⅛.",
                els, [])


# ── Lesson 4 ────────────────────────────────────────────────────────────────

WC, WR = (250, 272), 172   # wheel centre and node radius


def polar(cx, cy, r, deg):
    """Same convention as client/src/viz/geometry.ts: degrees clockwise from 12 o'clock."""
    a = math.radians(deg)
    return round(cx + r * math.sin(a), 2), round(cy - r * math.cos(a), 2)


def _wheel(values, title):
    cx, cy = WC
    els = [text("head", 250, 22, title, anchor="middle", size=17, weight="bold"),
           {"id": "pos", "type": "arc", "cx": cx, "cy": cy, "r": WR + 44, "r0": WR + 32, "start": -11.25, "end": 168.75,
            "fill": "success", "tone": "success", "hidden": True},
           {"id": "neg", "type": "arc", "cx": cx, "cy": cy, "r": WR + 44, "r0": WR + 32, "start": 168.75, "end": 348.75,
            "fill": "danger", "tone": "danger", "hidden": True},
           {"id": "path", "type": "arc", "cx": cx, "cy": cy, "r": 140, "r0": 128, "start": 0, "end": 22.5,
            "fill": "warning", "tone": "warning", "emphasis": "strong", "hidden": True}]
    for k in range(16):
        x, y = polar(cx, cy, WR, 22.5 * k)
        els.append({"id": f"n{k}", "type": "node", "cx": x, "cy": y, "r": 25, "label": nl.to_base(k, 2, 4), "mono": True, "size": 14})
        vx, vy = polar(cx, cy, 104, 22.5 * k)
        els.append(text(f"v{k}", vx, vy, str(values[k]), anchor="middle", size=17, mono=True))
    els.append(arrow("ptr", [cx, cy], "n0", tone="accent"))
    els.append(text("lab", cx, 506, "", anchor="middle", size=17, weight="bold"))
    return els


def _vals(kind):
    f = {"unsigned": lambda p: int(p, 2), "twos": nl.from_twos, "sm": nl.from_sm, "ones": nl.from_ones}[kind]
    out = []
    for k in range(16):
        p = nl.to_base(k, 2, 4)
        val = f(p)
        neg_zero = kind in ("sm", "ones") and val == 0 and p[0] == "1"
        out.append("−0" if neg_zero else (f"+{val}" if val > 0 and kind != "unsigned" else str(val).replace("-", "−")))
    return out


def _relabel(kind):
    return [(f"v{k}", {"text": t}) for k, t in enumerate(_vals(kind))]


@scene
def twos_complement_wheel():
    els = _wheel(_vals("unsigned"), "4-bit patterns on a wheel")
    tw = _vals("twos")
    assert tw[7] == "+7" and tw[8] == "−8" and tw[15] == "−1"
    assert _vals("sm")[8] == "−0" and _vals("ones")[15] == "−0" and _vals("sm")[15] == "−7" and _vals("ones")[8] == "−7"
    hi = lambda ks, tone="subject": [(f"n{k}", {"fill": tone, "tone": tone}) for k in ks]
    clear = [(f"n{k}", {"fill": "none", "tone": "ink"}) for k in range(16)]
    steps = [
        step("Each clockwise step adds 1. From 0000 to 0111 the patterns count 0 to 7, exactly as unsigned numbers.",
             *hi(range(8)), ("ptr", {"to": "n7"})),
        step("Now step backwards from 0000: one step anticlockwise lands on 1111. A step back means −1, so it is natural to read 1111 as −1, not 15.",
             *clear, *hi([15], "danger"), ("ptr", {"to": "n15"}), ("v15", {"text": "−1"})),
        step("Reading every pattern with a leading 1 as (unsigned value − 16) gives 2's complement: 1111 = −1, 1110 = −2, …, 1000 = −8. The top bit now says the sign.",
             *clear, *_relabel("twos"), ("pos", {"hidden": False}), ("neg", {"hidden": False}), ("lab", {"text": "2's complement"})),
        step("The only jump is the seam at the bottom: 0111 (+7) is followed by 1000 (−8). Crossing it is overflow. 4-bit 2's complement covers −8 … +7, sixteen different values, one zero.",
             *hi([7, 8], "warning"), ("ptr", {"to": "n8"})),
        step("Sign-magnitude reads the top bit as a sign and the other three as a size: 1000 is −0 and 1111 is −7. Two patterns mean zero, so only 15 values fit (−7 … +7).",
             *clear, *_relabel("sm"), *hi([0, 8], "danger"), ("lab", {"text": "sign-magnitude"}), ("ptr", {"to": "n8"})),
        step("1's complement negates by flipping every bit: 1111 is −0 and 1000 is −7. Again two zeros and the range −7 … +7.",
             *clear, *_relabel("ones"), *hi([0, 15], "danger"), ("lab", {"text": "1's complement"}), ("ptr", {"to": "n15"})),
        step("Back to 2's complement: one zero, no gaps, and the wheel's clockwise steps are ordinary addition. That is why every modern machine uses it.",
             *clear, *_relabel("twos"), ("lab", {"text": "2's complement"}), ("ptr", {"to": "n0"})),
    ]
    return spec("The 2's-complement wheel", 500, 520,
                "Sixteen 4-bit patterns arranged clockwise in counting order, 0000 at the top. The number inside the ring next to each pattern is its unsigned value, 0 to 15.",
                els, steps)


@scene
def overflow_wheel():
    els = _wheel(_vals("twos"), "Adding on the wheel: overflow is crossing the seam")
    els = [dict(e, hidden=False) if e["id"] in ("pos", "neg") else e for e in els]
    s = lambda a, b: nl.from_twos(nl.to_base((int(nl.to_twos(a, 4), 2) + int(nl.to_twos(b, 4), 2)) % 16, 2, 4))
    assert s(5, 4) == -7 and s(-6, -3) == 7 and s(5, -3) == 2
    k = lambda v: int(nl.to_twos(v, 4), 2)
    steps = [
        step("Start at 0101 = +5. Adding a positive number means stepping clockwise.",
             ("ptr", {"to": f"n{k(5)}"}), (f"n{k(5)}", {"fill": "subject", "tone": "subject"})),
        step("Add +4: four steps clockwise pass 0111 (+7) and cross the seam into 1001. The pattern reads −7, but 5 + 4 = 9 does not fit in 4 bits. Overflow.",
             ("path", {"hidden": False, "start": 22.5 * 5, "end": 22.5 * 9}), ("ptr", {"to": f"n{k(-7)}"}),
             (f"n{k(-7)}", {"fill": "danger", "tone": "danger"}), ("lab", {"text": "5 + 4 → −7 ✗"})),
        step("Start at 1010 = −6 and add −3: three steps anticlockwise cross the seam backwards to 0111 = +7. The true sum −9 is below −8. Overflow again.",
             (f"n{k(5)}", {"fill": "none", "tone": "ink"}), (f"n{k(-7)}", {"fill": "none", "tone": "ink"}),
             ("path", {"start": 22.5 * 7, "end": 22.5 * 10}), ("ptr", {"to": f"n{k(7)}"}),
             (f"n{k(7)}", {"fill": "danger", "tone": "danger"}), ("lab", {"text": "−6 + (−3) → +7 ✗"})),
        step("Now 0101 (+5) + 1101 (−3). As unsigned steps that is 13 clockwise, which wraps past 0000 to 0010 = +2. Passing 0000 just drops a carry out of 4 bits; the seam is not crossed, so the answer +2 is right.",
             (f"n{k(7)}", {"fill": "none", "tone": "ink"}), ("path", {"start": 22.5 * 2, "end": 22.5 * 5}),
             ("ptr", {"to": f"n{k(2)}"}), (f"n{k(2)}", {"fill": "success", "tone": "success"}), ("lab", {"text": "5 + (−3) → +2 ✓"})),
        step("Rule: a sum overflows exactly when it crosses the +7 / −8 seam. That can only happen when both operands have the same sign. (Chapter 5 turns this into a gate: carry into the sign bit ≠ carry out of it.)",
             ("path", {"hidden": True}), ("lab", {"text": "overflow = crossing the seam"})),
    ]
    return spec("Overflow on the 2's-complement wheel", 500, 520,
                "The 4-bit wheel with 2's-complement values inside. The green band marks the non-negative patterns, the red band the negative ones; they meet at the seam between 0111 (+7) and 1000 (−8).",
                els, steps)


@scene
def negate_invert_plus_one():
    x = "01011000"
    xb = nl.invert(x)
    r = nl.add_one(xb)
    assert nl.from_twos(x) == 88 and r == nl.copy_first_one(x) == "10101000" and nl.from_twos(r) == -88
    cell, x0 = 52, 74
    els = [text("head", 280, 22, "Negating +88 in 8 bits: invert, then add 1", anchor="middle", size=17, weight="bold")]
    rows = [("x", x, 64, "x = +88"), ("xb", xb, 134, "~x (every bit flipped)"), ("r", r, 204, "~x + 1 = −88")]
    for id, b, y, lab in rows:
        els.append({"id": id, "type": "bits", "x": x0, "y": y, "bits": b, "cell": cell, "hidden": id != "x"})
        els.append(text(id + "l", x0 - 8, y + cell / 2, {"x": "x", "xb": "~x", "r": "−x"}[id], anchor="end", size=16, mono=True, hidden=id != "x"))
    els.append(text("note", 280, 286, "x = +88", anchor="middle", size=17))
    els.append(text("carry", x0 + cell * 5, 196, "", size=14, tone="warning"))
    steps = [
        step("Flip every bit of 01011000. The result 10100111 is x̄, and x + x̄ = 11111111 = 2⁸ − 1.",
             ("xb", {"hidden": False}), ("xbl", {"hidden": False}), ("note", {"text": "x + x̄ = 2⁸ − 1"})),
        step("Add 1 to x̄. The three trailing 1s of x̄ turn into 0s as the carry ripples left, and the first 0 it meets becomes 1.",
             ("xb", {"highlight": [4, 5, 6, 7]}), ("r", {"hidden": False, "highlight": [4, 5, 6, 7]}), ("rl", {"hidden": False}),
             ("carry", {"text": "carry ripples ←"}), ("note", {"text": "x̄ + 1 = 2⁸ − x, which is −x mod 2⁸"})),
        step("Compare x and −x: the rightmost 1 of x and everything to its right (1000) are copied unchanged; every bit to its left is flipped. That is the copy-to-the-first-1 shortcut.",
             ("x", {"highlight": [4, 5, 6, 7]}), ("xb", {"highlight": []}), ("carry", {"text": ""}), ("note", {"text": "copy …1000, flip 0101 → 1010"})),
        step("Check: 10101000 read with the −128 weight is −128 + 32 + 8 = −88.", ("note", {"text": "−128 + 32 + 8 = −88 ✓", "tone": "success"})),
    ]
    assert -128 + 32 + 8 == -88
    return spec("Invert and add 1, and the copy-to-the-first-1 shortcut", 560, 310,
                "The 8-bit pattern of +88: 01011000. We will build the pattern of −88 underneath.", els, steps)


@scene
def sign_extension_stretch():
    a = nl.to_twos(-3, 4)
    b8, b16 = nl.sign_extend(a, 8), nl.sign_extend(a, 16)
    p = nl.to_twos(5, 4)
    assert a == "1101" and b8 == "11111101" and b16 == "1111111111111101" and nl.from_twos(b16) == -3 and nl.sign_extend(p, 8) == "00000101"
    cell = 30
    els = [text("head", 250, 22, "Sign extension: copy the sign bit into every new place", anchor="middle", size=17, weight="bold"),
           text("l4", 10, 52, "4 bits", size=15, tone="muted"),
           {"id": "w4", "type": "bits", "x": 10 + 12 * cell, "y": 62, "bits": a, "cell": cell, "highlight": [0]},
           text("l8", 10, 114, "8 bits", size=15, tone="muted", hidden=True),
           {"id": "w8", "type": "bits", "x": 10 + 8 * cell, "y": 124, "bits": b8, "cell": cell, "hidden": True, "highlight": [0, 1, 2, 3, 4]},
           text("l16", 10, 176, "16 bits", size=15, tone="muted", hidden=True),
           {"id": "w16", "type": "bits", "x": 10, "y": 186, "bits": b16, "cell": cell, "hidden": True, "highlight": list(range(13))},
           text("val", 250, 250, "1101 = −8 + 4 + 1 = −3", anchor="middle", size=17, mono=True),
           text("bad", 250, 282, "", anchor="middle", size=15, tone="danger")]
    steps = [
        step("−3 in 4 bits is 1101: the sign bit (weight −8) is 1.", ("val", {"text": "1101 = −8 + 4 + 1 = −3"})),
        step("To widen to 8 bits, copy the sign bit 1 into the four new places: 1111 1101. The value is still −3 (−128 + 64 + 32 + 16 + 8 + 4 + 1 = −3).",
             ("w8", {"hidden": False}), ("l8", {"hidden": False}), ("val", {"text": "1111 1101 = −3"})),
        step("Widen again to 16 bits: twelve copies of the sign bit in front of 1101. Still −3.",
             ("w16", {"hidden": False}), ("l16", {"hidden": False}), ("val", {"text": "1111 1111 1111 1101 = −3"})),
        step("Padding with zeros instead (0000 1101) would give +13: zero-padding is right only for unsigned and for non-negative numbers, e.g. +5 = 0101 → 0000 0101.",
             ("bad", {"text": "0000 1101 = +13 ✗   ·   +5: 0101 → 0000 0101 ✓"})),
    ]
    assert -128 + 64 + 32 + 16 + 8 + 4 + 1 == -3 and int("00001101", 2) == 13
    return spec("Sign extension keeps the value", 500, 300,
                "The 4-bit pattern 1101 at the right. Wider copies of it will appear underneath, lined up on the right.", els, steps)


@scene
def msb_weight_bar():
    pat = nl.to_base(0xB4, 2, 8)
    ws = [-128, 64, 32, 16, 8, 4, 2, 1]
    assert pat == "10110100" and nl.from_twos(pat) == sum(w for w, c in zip(ws, pat) if c == "1") == -76
    els = [text("head", 280, 22, "8-bit 2's complement: the top bit weighs −128", anchor="middle", size=17, weight="bold"),
           {"id": "b", "type": "bits", "x": 64, "y": 74, "bits": pat, "cell": 54, "labels": [str(w).replace("-", "−") for w in ws],
            "highlight": [i for i, c in enumerate(pat) if c == "1"]},
           box("neg", 64, 74, 54, 54, None, tone="danger", fill="danger", emphasis="soft", dashed=True),
           text("sum", 280, 168, "−128 + 32 + 16 + 4 = −76", anchor="middle", size=19, mono=True, tone="success"),
           text("rng", 280, 204, "range: −128 (1000 0000) … +127 (0111 1111)", anchor="middle", size=16, tone="muted")]
    return spec("Place values of an 8-bit 2's-complement number", 560, 230,
                "Eight bit cells with weights −128, 64, 32, 16, 8, 4, 2, 1; the leftmost weight is negative. The pattern 10110100 has 1s under −128, 32, 16 and 4, so it is worth −76. The range is −128 to +127.",
                els, [])


@scene
def arithmetic_shift():
    x = nl.to_twos(-7, 8)
    a, l = nl.asr(x), nl.lsr(x)
    sl, over = nl.asl(x)
    assert (x, a, l, sl, over) == ("11111001", "11111100", "01111100", "11110010", False)
    assert nl.from_twos(a) == -4 and int(l, 2) == 124 and nl.from_twos(sl) == -14
    cell, x0 = 50, 110
    els = [text("head", 280, 22, "Shifting −7 (8 bits): arithmetic vs logical", anchor="middle", size=17, weight="bold"),
           {"id": "x", "type": "bits", "x": x0, "y": 52, "bits": x, "cell": cell},
           text("xl", x0 - 10, 77, "x", anchor="end", size=16, mono=True),
           text("xv", x0 + 8 * cell + 10, 77, "−7", size=16, mono=True),
           {"id": "a", "type": "bits", "x": x0, "y": 122, "bits": a, "cell": cell, "hidden": True, "highlight": [0]},
           text("al", x0 - 10, 147, "asr", anchor="end", size=15, mono=True, hidden=True),
           text("av", x0 + 8 * cell + 10, 147, "−4", size=16, mono=True, hidden=True, tone="success"),
           {"id": "l", "type": "bits", "x": x0, "y": 192, "bits": l, "cell": cell, "hidden": True, "highlight": [0]},
           text("ll", x0 - 10, 217, "lsr", anchor="end", size=15, mono=True, hidden=True),
           text("lv", x0 + 8 * cell + 10, 217, "124", size=16, mono=True, hidden=True, tone="danger"),
           {"id": "s", "type": "bits", "x": x0, "y": 262, "bits": sl, "cell": cell, "hidden": True, "highlight": [7]},
           text("sl", x0 - 10, 287, "asl", anchor="end", size=15, mono=True, hidden=True),
           text("sv", x0 + 8 * cell + 10, 287, "−14", size=16, mono=True, hidden=True, tone="success")]
    steps = [
        step("Arithmetic shift right: every bit moves one place right, the last bit falls off, and the sign bit is copied into the empty top place. 11111001 → 11111100 = −4.",
             ("a", {"hidden": False}), ("al", {"hidden": False}), ("av", {"hidden": False})),
        step("−7 ÷ 2 = −3.5, and the shift gave −4: an arithmetic right shift divides by 2 and rounds down (towards −∞), not towards zero.",
             ("av", {"text": "−4 = ⌊−3.5⌋"})),
        step("A logical shift right fills the top with 0 instead. 01111100 = 124: fine for unsigned numbers, wrong for negative ones.",
             ("l", {"hidden": False}), ("ll", {"hidden": False}), ("lv", {"hidden": False})),
        step("Shift left (arithmetic and logical are the same): a 0 enters at the right. 11110010 = −14 = 2 × (−7). It is exact because the top two bits of x were equal, so no significant bit was lost.",
             ("s", {"hidden": False}), ("sl", {"hidden": False}), ("sv", {"hidden": False})),
    ]
    return spec("Arithmetic and logical shifts", 560, 330,
                "The 8-bit pattern of −7, 11111001. Shifted copies will appear underneath.", els, steps)


# ── Lesson 5 ────────────────────────────────────────────────────────────────

@scene
def gray_reflect():
    g1, g2, g3 = nl.reflected_gray(1), nl.reflected_gray(2), nl.reflected_gray(3)
    assert g3 == [nl.gray_bits(i, 3) for i in range(8)]
    cw, ch = 64, 30
    els = [text("head", 280, 22, "Building Gray codes by reflection", anchor="middle", size=17, weight="bold")]
    cols = {1: 40, 2: 210, 3: 380}
    for w, lst in ((1, g1), (2, g2), (3, g3)):
        els.append(text(f"t{w}", cols[w] + cw / 2, 52, f"{w} bit{'s' if w > 1 else ''}", anchor="middle", size=15, tone="muted", hidden=w > 1))
        for i, c in enumerate(lst):
            els.append(box(f"c{w}_{i}", cols[w], 64 + i * ch, cw + (10 if w == 3 else 0), ch - 2, c, mono=True, size=16,
                           hidden=w > 1, tone="info" if (w > 1 and i >= len(lst) // 2) else "ink"))
    els.append({"id": "m2", "type": "line", "points": [[cols[2] - 10, 64 + 2 * ch - 1], [cols[2] + cw + 10, 64 + 2 * ch - 1]], "tone": "danger", "dashed": True, "hidden": True})
    els.append({"id": "m3", "type": "line", "points": [[cols[3] - 10, 64 + 4 * ch - 1], [cols[3] + cw + 20, 64 + 4 * ch - 1]], "tone": "danger", "dashed": True, "hidden": True})
    els.append(text("mirror", 300, 330, "", anchor="middle", size=15, tone="danger"))
    steps = [
        step("Start with the 1-bit Gray code: 0, 1. The two codes differ in one bit.", ),
        step("Copy the list, then append its mirror image (1, 0) underneath. Put 0 in front of the top half and 1 in front of the bottom half: 00, 01, 11, 10.",
             ("t2", {"hidden": False}), *[(f"c2_{i}", {"hidden": False}) for i in range(4)], ("m2", {"hidden": False}),
             ("mirror", {"text": "dashed line = mirror"})),
        step("Do it again: the 2-bit list, then its mirror, with prefixes 0 and 1. The result is the 3-bit reflected Gray code: 000 001 011 010 110 111 101 100.",
             ("t3", {"hidden": False}), *[(f"c3_{i}", {"hidden": False}) for i in range(8)], ("m3", {"hidden": False})),
        step("Across the mirror line the two neighbours are the same code with only the new front bit changed (010 → 110). And the last code 100 differs from the first 000 in one bit too, so the list wraps round.",
             ("c3_3", {"fill": "warning"}), ("c3_4", {"fill": "warning"}), ("c3_0", {"fill": "success"}), ("c3_7", {"fill": "success"})),
    ]
    steps[0] = {"caption": steps[0]["caption"], "patches": [{"id": "c1_0", "set": {"fill": "subject"}}, {"id": "c1_1", "set": {"fill": "subject"}}]}
    return spec("Reflected Gray code, built by mirroring", 560, 340,
                "The 1-bit Gray code, 0 and 1. Longer codes will be built to its right, each from the one before.", els, steps)


@scene
def gray_xor_ladder():
    b = "1011"
    g = nl.gray_bits(int(b, 2), 4)
    assert g == "1110"
    gb = "101100"
    bb = nl.to_base(nl.gray_inv(int(gb, 2)), 2, 6)
    assert bb == "110111"
    cell, x0 = 56, 140
    els = [text("head", 280, 22, "Binary → Gray: XOR each bit with its left neighbour", anchor="middle", size=17, weight="bold"),
           {"id": "b", "type": "bits", "x": x0, "y": 52, "bits": b, "cell": cell},
           text("bl", x0 - 12, 80, "binary", anchor="end", size=15, tone="muted"),
           {"id": "g", "type": "bits", "x": x0, "y": 172, "bits": "????", "cell": cell},
           text("gl", x0 - 12, 200, "Gray", anchor="end", size=15, tone="muted")]
    els.append(arrow("a0", [x0 + cell / 2, 112], [x0 + cell / 2, 168], tone="subject", hidden=True))
    for i in range(1, 4):
        els.append(text(f"x{i}", x0 + cell * i, 140, "⊕", anchor="middle", size=24, tone="subject", hidden=True))
    els.append(text("note", 280, 262, "", anchor="middle", size=16, mono=True))
    steps = [step("The first Gray bit is the first binary bit, copied: 1.", ("a0", {"hidden": False}), ("g", {"bits": "1???", "highlight": [0]}), ("b", {"highlight": [0]}))]
    for i in range(1, 4):
        cur = g[:i + 1] + "?" * (3 - i)
        steps.append(step(
            f"Gray bit {i + 1} = binary bit {i} ⊕ binary bit {i + 1} = {b[i - 1]} ⊕ {b[i]} = {g[i]}. (⊕ gives 1 exactly when the two bits differ.)",
            (f"x{i}", {"hidden": False}), ("b", {"highlight": [i - 1, i]}), ("g", {"bits": cur, "highlight": [i]})))
    steps.append(step("So binary 1011 (eleven) has Gray code 1110. In one line: Gray = b ⊕ (b shifted right by 1).",
                      ("b", {"highlight": []}), ("g", {"highlight": []}), ("note", {"text": "1011 ⊕ 0101 = 1110"})))
    steps.append(step("Going back, each binary bit is the XOR of all Gray bits from the left down to it, a running XOR: Gray 101100 gives binary 1, 1, 0, 1, 1, 1 = 110111.",
                      ("note", {"text": "Gray 101100 → running XOR → 110111"})))
    assert int(b, 2) ^ (int(b, 2) >> 1) == int(g, 2)
    return spec("The XOR ladder between binary and Gray", 560, 290,
                "The binary number 1011 on top and an empty Gray row underneath.", els, steps)


@scene
def gray_wheel():
    cx, cy = 250, 260
    rings = [(60, 110), (110, 160), (160, 210)]   # inner ring = MSB, outer ring = LSB
    els = [text("head", 250, 22, "A 3-bit Gray-coded rotary disc", anchor="middle", size=17, weight="bold")]
    for k in range(8):
        code = nl.gray_bits(k, 3)
        for bit, (r0, r) in enumerate(rings):
            if code[bit] == "1":
                els.append({"id": f"s{k}_{bit}", "type": "arc", "cx": cx, "cy": cy, "r": r, "r0": r0, "start": 45 * k, "end": 45 * (k + 1),
                            "fill": "subject", "emphasis": "strong", "tone": "ink"})
            else:
                els.append({"id": f"s{k}_{bit}", "type": "arc", "cx": cx, "cy": cy, "r": r, "r0": r0, "start": 45 * k, "end": 45 * (k + 1), "tone": "muted"})
        x, y = polar(cx, cy, 228, 45 * k + 22.5)
        els.append(text(f"l{k}", x, y, code, anchor="middle", size=15, mono=True))
    els.append(text("key", 250, 492, "inner ring = first bit, outer ring = last bit; shaded = 1", anchor="middle", size=15, tone="muted"))
    for k in range(8):
        assert nl.hamming_distance(nl.gray_bits(k, 3), nl.gray_bits((k + 1) % 8, 3)) == 1
    return spec("Rotary encoder disc in Gray code", 500, 510,
                "A disc cut into 8 sectors and 3 rings. Reading clockwise from the top, the sectors are coded 000, 001, 011, 010, 110, 111, 101, 100. At every boundary between neighbouring sectors only one ring changes from clear to shaded, so a sensor sitting on a boundary can misread at most one bit and is never more than one position wrong.",
                els, [])


@scene
def hamming_74_venn():
    d = "1011"
    w = nl.hamming74_encode(d)
    bad = nl.flip(w, 6)
    syn, (s4, s2, s1) = nl.hamming74_syndrome(bad)
    assert w == "0110011" and syn == 6 and (s4, s2, s1) == (1, 1, 0)
    C = {"p1": (210, 150), "p2": (330, 150), "p4": (270, 250)}
    R = 100
    els = [text("head", 270, 22, "Hamming (7,4): three parity circles", anchor="middle", size=17, weight="bold")]
    for name, (x, y) in C.items():
        els.append({"id": name, "type": "circle", "cx": x, "cy": y, "r": R, "tone": "info"})
    els += [text("lp1", 120, 70, "circle 1", size=15, tone="info"), text("lp2", 380, 70, "circle 2", size=15, tone="info"),
            text("lp4", 300, 368, "circle 4", size=15, tone="info")]
    pos = {7: (270, 192), 3: (270, 110), 5: (220, 228), 6: (320, 228), 1: (160, 130), 2: (380, 130), 4: (270, 302)}
    for p, (x, y) in pos.items():
        els.append(box(f"b{p}", x - 22, y - 16, 44, 32, "?" if p in (1, 2, 4) else w[p - 1], mono=True, size=17,
                       tone="ink" if p in (3, 5, 6, 7) else "muted"))
        els.append(text(f"n{p}", x, y + 26, f"pos {p}", anchor="middle", size=12, tone="muted"))
    els.append(text("info", 270, 400, "data 1011 in positions 3, 5, 6, 7", anchor="middle", size=16, mono=True))
    steps = [
        step("Each parity bit makes its circle hold an even number of 1s. Circle 1 holds positions 3, 5, 7 = 1, 0, 1: two 1s already, so p1 = 0.",
             ("b1", {"label": w[0], "tone": "success"}), ("p1", {"fill": "info"})),
        step("Circle 2 holds positions 3, 6, 7 = 1, 1, 1: three 1s, so p2 = 1 to make four.",
             ("p1", {"fill": "none"}), ("b2", {"label": w[1], "tone": "success"}), ("p2", {"fill": "info"})),
        step("Circle 4 holds positions 5, 6, 7 = 0, 1, 1: two 1s, so p4 = 0. The codeword (positions 1–7) is 0110011.",
             ("p2", {"fill": "none"}), ("b4", {"label": w[3], "tone": "success"}), ("p4", {"fill": "info"}), ("info", {"text": "sent: 0110011"})),
        step("Noise flips position 6 (1 → 0). The received word is 0110001.",
             ("p4", {"fill": "none"}), ("b6", {"label": bad[5], "tone": "danger", "fill": "danger"}), ("info", {"text": "received: 0110001"})),
        step("Recount each circle. Circle 1 is still even (it does not contain position 6). Circles 2 and 4 are now odd: they fail.",
             ("p2", {"tone": "danger", "fill": "danger"}), ("p4", {"tone": "danger", "fill": "danger"}), ("p1", {"tone": "success"})),
        step("Add the numbers of the failing circles: 2 + 4 = 6. The only position inside circles 2 and 4 but outside circle 1 is 6, so flip it back. Syndrome 6, corrected word 0110011.",
             ("b6", {"label": w[5], "tone": "success", "fill": "success"}), ("info", {"text": "syndrome = 4·1 + 2·1 + 1·0 = 6 → fix position 6"})),
    ]
    return spec("Hamming (7,4) as three overlapping parity circles", 540, 420,
                "Three overlapping circles named 1, 2 and 4. The seven regions hold bit positions 1 to 7: position 7 is in all three circles, 3 in circles 1 and 2, 5 in circles 1 and 4, 6 in circles 2 and 4, and 1, 2, 4 each in one circle only. The data bits 1, 0, 1, 1 sit in positions 3, 5, 6, 7.",
                els, steps)


@scene
def bcd_vs_binary():
    n = 59
    bcd = nl.bcd(n).replace(" ", "")
    bn = nl.to_base(n, 2)
    assert bcd == "01011001" and bn == "111011" and int(bcd, 2) == 89
    els = [text("head", 280, 22, "59 in BCD and in pure binary", anchor="middle", size=17, weight="bold"),
           text("t1", 30, 66, "BCD (8 bits)", size=15, tone="muted"),
           {"id": "bcd", "type": "bits", "x": 150, "y": 46, "bits": bcd, "cell": 44, "below": ["8", "4", "2", "1", "8", "4", "2", "1"]},
           text("d5", 150 + 88, 126, "digit 5", anchor="middle", size=15, tone="subject"),
           text("d9", 150 + 264, 126, "digit 9", anchor="middle", size=15, tone="subject"),
           text("t2", 30, 176, "binary (6 bits)", size=15, tone="muted"),
           {"id": "bin", "type": "bits", "x": 238, "y": 156, "bits": bn, "cell": 44, "below": ["32", "16", "8", "4", "2", "1"]},
           text("note", 280, 250, "read as binary, the BCD pattern 0101 1001 would be 89, not 59", anchor="middle", size=15, tone="danger")]
    return spec("BCD versus binary", 560, 270,
                "Top: 59 in BCD, two 4-bit groups 0101 (5) and 1001 (9), each with weights 8 4 2 1. Bottom: 59 in pure binary, 111011, six bits with weights 32 to 1. BCD spends 8 bits where binary needs 6, and reading the BCD pattern as plain binary gives 89.",
                els, [])


@scene
def code_tables():
    rows = [["digit", "8421", "XS-3", "2421", "Gray"]]
    for d in range(10):
        rows.append([str(d), nl.to_base(d, 2, 4), nl.to_base(d + 3, 2, 4), nl.WEIGHTED_2421[d], nl.gray_bits(d, 4)])
    assert rows[10] == ["9", "1001", "1100", "1111", "1101"]
    els = [{"id": "t", "type": "table", "x": 30, "y": 10, "cellW": 100, "cellH": 30, "rows": rows, "header": True, "mono": True}]
    return spec("Decimal digits in four codes", 560, 350,
                "A table of the digits 0 to 9 in 8421 BCD, excess-3, 2421 and 4-bit Gray code. For example 5 is 0101 in BCD, 1000 in excess-3, 1011 in 2421 and 0111 in Gray; 9 is 1001, 1100, 1111 and 1101.",
                els, [])


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
