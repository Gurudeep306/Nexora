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
