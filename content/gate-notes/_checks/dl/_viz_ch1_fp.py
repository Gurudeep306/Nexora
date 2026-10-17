"""Generator for the floating-point Viz scenes of Digital Logic Chapter 1 (lessons 5–7).

Every number in a caption, label or bit row is computed here with fplib (exact IEEE-style
arithmetic), so the scenes cannot drift from the checked maths. Each scene has a wide canvas
and a `narrow` canvas for phones (the Viz engine's layout extension): wide bit rows are split
into stacked fields, and long labels get shorter narrow-only twins.

    python3 content/gate-notes/_checks/dl/_viz_ch1_fp.py      # write the JSON files
    python3 content/gate-notes/_checks/dl/viz_ch1_fp.py       # (check) files == generator output
"""
import json
import pathlib
import sys
from fractions import Fraction as F

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import fplib as fp  # noqa: E402

VIZ_DIR = pathlib.Path(__file__).resolve().parents[2] / "dl" / "viz"
SPECS = {}


def scene(fn):
    SPECS[fn.__name__.replace("_", "-")] = fn
    return fn


def spec(title, wide, narrow, intro, elements, steps):
    return {"version": 1, "title": title, "width": wide[0], "height": wide[1],
            "narrow": {"width": narrow[0], "height": narrow[1]}, "intro": intro,
            "elements": elements, "steps": steps}


def step(caption, *patches):
    return {"caption": caption, "patches": [{"id": i, "set": s} for i, s in patches]}


def el(id, type, n=None, **kw):
    """An element; `n` is its narrow-layout geometry override (dict) or the string 'wide'/'narrow' for `only`."""
    e = {"id": id, "type": type, **kw}
    if isinstance(n, dict):
        e["narrow"] = n
    elif n in ("wide", "narrow"):
        e["only"] = n
    return e


def text(id, x, y, t, n=None, **kw):
    return el(id, "text", n, x=x, y=y, text=t, **kw)


def box(id, x, y, w, h, label=None, n=None, **kw):
    e = el(id, "box", n, x=x, y=y, w=w, h=h, **kw)
    if label is not None:
        e["label"] = label
    return e


def bits(id, x, y, b, cell, n=None, **kw):
    return el(id, "bits", n, x=x, y=y, bits=b, cell=cell, **kw)


def line(id, pts, n=None, **kw):
    return el(id, "line", n, points=pts, **kw)


def heads(wide_text, narrow_text, W, NW=360, size=17, nsize=15, y=24):
    """A bold title, with a shorter twin for the narrow canvas."""
    return [text("head", W / 2, y, wide_text, "wide", anchor="middle", size=size, weight="bold"),
            text("headn", NW / 2, y, narrow_text, "narrow", anchor="middle", size=nsize, weight="bold")]


def frac_str(x):
    x = F(x)
    return str(x.numerator) if x.denominator == 1 else f"{x.numerator}/{x.denominator}"


# ── Lesson 5 ────────────────────────────────────────────────────────────────

@scene
def normalise_shift():
    raw, E0 = "0.0001011", 6
    v = F(int(raw[2:], 2), 2 ** 7) * 2 ** E0
    assert v == F(11, 2)
    M1, E1 = fp.normalise_fraction_form(v)
    M2, E2 = fp.normalise_hidden(v)
    assert (fp.frac_bits(M1, 7), E1) == ("1011000", 3) and (M2, E2) == (F(11, 8), 2) and fp.frac_bits(M2 - 1, 3) == "011"
    els = [
        *heads("Normalising 0.0001011 × 2⁶ (the value is 5.5)", "Normalising 0.0001011 × 2⁶", 640),
        bits("sig", 112, 84, raw, 46, {"x": 18, "y": 84, "cell": 36}, labels=[""] * 9),
        text("exp", 548, 107, f"× 2{fp_sup(E0)}", {"x": 180, "y": 152, "size": 22}, size=24, mono=True),
        text("val", 320, 176, "value = 11/128 × 64 = 5.5", {"x": 180, "y": 196, "size": 16}, anchor="middle", size=17, tone="muted"),
        box("form", 150, 214, 340, 44, "not normalised: three 0s after the point", {"x": 20, "y": 226, "w": 320, "h": 44, "size": 15}, size=16),
    ]
    steps = [
        step("Find the first 1. It sits in the 4th place after the point, so the significand starts with three wasted zeros.",
             ("sig", {"highlight": [5]})),
        step(f"Fraction form (0.1…): shift the significand 3 places left, so the first 1 sits just after the point. "
             f"A left shift by 3 multiplies by 2³, so the exponent drops by 3: 0.1011 × 2{fp_sup(E1)}.",
             ("sig", {"bits": "0.1011000", "highlight": [2]}), ("exp", {"text": f"× 2{fp_sup(E1)}"}),
             ("val", {"text": "value = 11/16 × 8 = 5.5"}), ("form", {"label": "fraction form: ½ ≤ M < 1", "tone": "info", "fill": "info"})),
        step(f"Hidden-bit form (1.f): shift one more place, so the first 1 sits before the point. The exponent drops once more: "
             f"1.011 × 2{fp_sup(E2)}.",
             ("sig", {"bits": "1.0110000", "highlight": [0]}), ("exp", {"text": f"× 2{fp_sup(E2)}"}),
             ("val", {"text": "value = 11/8 × 4 = 5.5"}), ("form", {"label": "hidden-bit form: 1 ≤ M < 2", "tone": "subject", "fill": "subject"})),
        step("In the hidden-bit form the bit before the point is always 1, so it is not stored. The fraction field keeps only 011 (then zeros), "
             "and every shift kept the value at 5.5.",
             ("sig", {"highlight": [2, 3, 4]}), ("form", {"label": "stored fraction field: 011 000…", "tone": "success", "fill": "success"})),
    ]
    return spec("Normalising a significand: shift left, lower the exponent", (640, 280), (360, 290),
                "The significand 0.0001011 times 2 to the 6 is 5.5, but it starts with three zeros after the point, which waste precision.",
                els, steps)


def fp_sup(n):
    return str(n).translate(str.maketrans("0123456789-", "⁰¹²³⁴⁵⁶⁷⁸⁹⁻"))


@scene
def bias_order():
    rows = [["field", "unsigned", "2's comp", "excess-4", "excess-3"]]
    for p in range(8):
        tw = p - 8 if p >= 4 else p
        rows.append([f"{p:03b}", str(p), f"{tw:+d}" if tw else "0", f"{p - 4:+d}" if p != 4 else "0", f"{p - 3:+d}" if p != 3 else "0"])
    assert rows[4][2] == "+3" and rows[5][2] == "-4" and [r[3] for r in rows[1:]] == ["-4", "-3", "-2", "-1", "0", "+1", "+2", "+3"]
    els = [
        *heads("A 3-bit exponent field read in three codes", "One 3-bit field, three codes", 560, y=22),
        el("tab", "table", {"x": 2, "cellW": 71, "cellH": 28}, x=30, y=46, cellW=100, cellH=28, rows=rows, header=True, mono=True),
        text("note", 280, 318, "Unsigned order runs top to bottom.", {"x": 180, "y": 318, "size": 14}, anchor="middle", size=15, tone="muted"),
    ]
    steps = [
        step("The fields 000 … 111 are listed in unsigned order, top to bottom. A comparator that reads them as unsigned numbers puts each row above the one before it.",
             ("tab", {"highlight": [[r, 1] for r in range(1, 9)]})),
        step("Read as 2's complement, the order breaks between 011 (+3) and 100 (−4): the bigger field holds the smaller exponent. A float with exponent −1 (111) would compare above one with exponent +3 (011).",
             ("tab", {"highlight": [[4, 2], [5, 2], [8, 2]]}), ("note", {"text": "2's complement: +3 then −4 (order broken)", "tone": "danger"})),
        step("Excess-4 (bias 2³⁻¹ = 4) subtracts 4 from the unsigned value: −4, −3, …, +3. The exponents now rise exactly as the fields rise.",
             ("tab", {"highlight": [[r, 3] for r in range(1, 9)]}), ("note", {"text": "excess-4: order kept, range −4 … +3", "tone": "success"})),
        step("Excess-3 (bias 2³⁻¹ − 1, the IEEE choice) gives −3 … +4, also in order. IEEE then reserves the end fields 000 and 111 for zero, denormals, infinity and NaN.",
             ("tab", {"highlight": [[r, 4] for r in range(1, 9)]}), ("note", {"text": "excess-3: order kept, range −3 … +4", "tone": "success"})),
    ]
    return spec("Biased exponents keep the unsigned order", (560, 336), (360, 336),
                "Eight 3-bit exponent fields with their unsigned value, their 2's-complement value, and their value in excess-4 and excess-3.",
                els, steps)


@scene
def ulp_precision():
    f = 2
    vals = sorted({fp.decode(n, 4, f) for n in range(0, 0x3C) if fp.F(1, 2) <= fp.decode(n, 4, f) < 8})
    assert vals[:4] == [F(1, 2), F(5, 8), F(3, 4), F(7, 8)] and len(vals) == 16
    binades = [(F(1, 2), "1/8"), (F(1), "1/4"), (F(2), "1/2"), (F(4), "1")]
    for lo, g in binades:
        assert fp.ulp(lo, 4, f) == F(g)
    x0, sc, y = 40, 72, 120          # wide: 0 … 8 at 72 px per unit
    els = [*heads("A toy float with 2 fraction bits: 4 values in every binade", "4 values in every binade", 680),
           line("axis", [[x0, y], [x0 + 8 * sc + 8, y]], "wide", tone="muted")]
    for i, v in enumerate(vals + [F(8)]):
        X = x0 + float(v) * sc
        els.append(line(f"t{i}", [[X, y - 12], [X, y + 12]], "wide", tone="info"))
    for k in (0, 1, 2, 4, 8):
        els.append(text(f"l{k}", x0 + k * sc, y + 30, str(k), "wide", anchor="middle", size=14, mono=True, tone="muted"))
    els.append(text("l0half", x0 + 0.5 * sc, y + 30, "½", "wide", anchor="middle", size=14, mono=True, tone="muted"))
    gap_y = [y - 30, y - 30, y - 30, y - 30]
    for j, (lo, g) in enumerate(binades):
        cx = x0 + float(lo) * 1.5 * sc
        els.append(text(f"g{j}", cx, gap_y[j], f"gap {g}", "wide", anchor="middle", size=14, tone="subject", hidden=True))
    # Narrow: one row per binade, each stretched to the same width (same 4 ticks, different labels).
    for j, (lo, g) in enumerate(binades):
        ry = 78 + j * 64
        els.append(line(f"na{j}", [[40, ry], [320, ry]], "narrow", tone="muted"))
        for t in range(5):
            els.append(line(f"nt{j}_{t}", [[40 + 70 * t, ry - 10], [40 + 70 * t, ry + 10]], "narrow", tone="info"))
        els.append(text(f"nl{j}", 40, ry + 24, f"{frac_str(lo)} … {frac_str(2 * lo)}", "narrow", size=13, mono=True, tone="muted"))
        els.append(text(f"ng{j}", 320, ry + 24, f"gap {g}", "narrow", anchor="end", size=13, tone="subject", hidden=True))
    els.append(box("rel", 150, 196, 380, 40, "relative gap: gap ÷ start of binade", {"x": 20, "y": 334, "w": 320, "h": 40, "size": 14}, size=15))
    ticks = lambda lo: [i for i, v in enumerate(vals) if lo <= v < 2 * lo]
    steps = []
    order = [1, 2, 3, 0]
    for j in order:
        lo, g = binades[j]
        ids = ticks(lo)
        steps.append(step(
            f"Binade [{frac_str(lo)}, {frac_str(2 * lo)}): the exponent is fixed and the 2 fraction bits give 4 values, {', '.join(frac_str(vals[i]) for i in ids)}. "
            f"Neighbours are {g} apart: one ulp = 2^(E − 2) with E = {fp.floor_log2(lo)}.",
            *[(f"t{i}", {"tone": "subject"}) for i in ids], (f"g{j}", {"hidden": False}), (f"ng{j}", {"hidden": False}),
            *[(f"nt{j}_{t}", {"tone": "subject"}) for t in range(4)],
        ))
    steps.append(step("Every binade holds the same 4 values, so each step up doubles the gap: 1/8, 1/4, 1/2, 1. The largest gap is in the top binade.",
                      *[(f"t{i}", {"tone": "info"}) for i in range(len(vals))]))
    steps.append(step("Divide each gap by the start of its binade: (1/8)/(1/2) = (1/4)/1 = (1/2)/2 = 1/4 = 2⁻². The relative gap is the same everywhere: that is floating point's promise.",
                      ("rel", {"label": "relative gap = 2⁻² in every binade", "tone": "success", "fill": "success"})))
    return spec("The gap between neighbours doubles every binade", (680, 250), (360, 390),
                "Positive values of a toy floating-point format with a hidden bit and 2 fraction bits, from 1/2 up to 8, marked on a number line.",
                els, steps)


def build_all():
    return {name: fn() for name, fn in SPECS.items()}


def dump(s):
    return json.dumps(s, ensure_ascii=False, indent=1) + "\n"


if __name__ == "__main__":
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    for name, s in build_all().items():
        (VIZ_DIR / f"{name}.json").write_text(dump(s))
        print(f"wrote viz/{name}.json ({len(s['steps'])} steps)")
