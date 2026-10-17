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


# ── Lesson 6 ────────────────────────────────────────────────────────────────

def idx_labels(n, first, marks):
    """Bit-index labels for a field: only the indexes in `marks` are shown."""
    return [str(first - i) if (first - i) in marks else "" for i in range(n)]


@scene
def ieee_layout():
    v = F(-27, 4)
    n = fp.encode(v)
    s, e, f = fp.split_fields(n)
    assert (fp.hexs(n), s, e, f[:4]) == ("C0D80000", "1", "10000001", "1011") and int(e, 2) - 127 == 2
    d = fp.encode(v, *fp.DOUBLE)
    assert fp.hexs(d, 64) == "C01B000000000000" and fp.split_fields(d, *fp.DOUBLE)[1] == "10000000001"
    c, x0, y0 = 22, 28, 84
    els = [*heads("IEEE-754 layouts: −6.75 in single, then in double", "IEEE-754: −6.75", 760),
           text("sgl", x0, 58, "single precision: 32 bits", {"x": 24, "y": 54}, size=15, tone="muted"),
           bits("sgn", x0, y0, s, c, "wide", fill="danger", labels=["31"]),
           bits("exp", x0 + c, y0, e, c, "wide", fill="info", labels=idx_labels(8, 30, {30, 23})),
           bits("frc", x0 + 9 * c, y0, f, c, "wide", fill="success", labels=idx_labels(23, 22, {22, 0})),
           text("tsg", x0 + c / 2, y0 + c + 20, "s", "wide", anchor="middle", size=14, tone="danger"),
           text("tex", x0 + 5 * c, y0 + c + 20, "exponent e: 8 bits, bias 127", "wide", anchor="middle", size=14, tone="info"),
           text("tfr", x0 + 20.5 * c, y0 + c + 20, "fraction f: 23 bits (hidden 1 not stored)", "wide", anchor="middle", size=14, tone="success"),
           # narrow: sign + exponent on one row, the fraction on two rows
           bits("nsgn", 30, 84, s, 30, "narrow", fill="danger", labels=["31"]),
           bits("nexp", 60, 84, e, 30, "narrow", fill="info", labels=idx_labels(8, 30, {30, 23})),
           text("ntex", 24, 134, "s | exponent e (8 bits, bias 127)", "narrow", size=13, tone="info"),
           bits("nfr1", 24, 172, f[:12], 26, "narrow", fill="success", labels=idx_labels(12, 22, {22, 11})),
           bits("nfr2", 24, 214, f[12:], 26, "narrow", fill="success", labels=[""] * 11),
           text("ntfr", 24, 258, "fraction f (23 bits)", "narrow", size=13, tone="success"),
           text("val", 380, 162, "value = −1.1011₂ × 2^(129 − 127) = −1.6875 × 4 = −6.75", {"x": 180, "y": 290, "size": 14}, anchor="middle", size=16, mono=True, hidden=True),
           text("dbl", x0, 206, "double precision: 64 bits", {"x": 24, "y": 330}, size=15, tone="muted", hidden=True),
           box("dsg", x0, 222, 11, 36, None, {"x": 24, "y": 346, "w": 24, "h": 36}, fill="danger", hidden=True),
           box("dex", x0 + 11, 222, 121, 36, "e: 11 bits", {"x": 48, "y": 346, "w": 80, "h": 36, "size": 13}, fill="info", size=14, hidden=True),
           box("dfr", x0 + 132, 222, 572, 36, "f: 52 bits", {"x": 128, "y": 346, "w": 208, "h": 36, "size": 13}, fill="success", size=14, hidden=True),
           text("dv1", 380, 286, "bias 1023: e = 2 + 1023 = 1025 = 100 0000 0001", {"x": 180, "y": 410, "size": 13}, anchor="middle", size=15, mono=True, hidden=True),
           text("dv2", 380, 312, "−6.75 = 0xC01B000000000000", {"x": 180, "y": 436, "size": 14}, anchor="middle", size=16, mono=True, hidden=True, tone="success"),
           ]
    steps = [
        step("The sign bit (bit 31) comes first. It is 1, so the number is negative. The significand is stored as a magnitude: sign-magnitude, not 2's complement.",
             ("sgn", {"highlight": [0]}), ("nsgn", {"highlight": [0]})),
        step(f"Bits 30–23 hold the biased exponent e = {e} = {int(e, 2)}. Subtracting the bias 127 gives the true exponent E = 2.",
             ("sgn", {"highlight": []}), ("nsgn", {"highlight": []}), ("exp", {"highlight": list(range(8))}), ("nexp", {"highlight": list(range(8))})),
        step("Bits 22–0 hold the fraction f = 1011 followed by zeros. The leading 1 of the significand is hidden, so the significand is 1.1011₂ = 1.6875.",
             ("exp", {"highlight": []}), ("nexp", {"highlight": []}), ("frc", {"highlight": [0, 1, 2, 3]}), ("nfr1", {"highlight": [0, 1, 2, 3]})),
        step("Put it together: (−1)¹ × 1.1011₂ × 2² = −110.11₂ = −6.75. In hex the word is 0xC0D80000.",
             ("val", {"hidden": False})),
        step("Double precision keeps the same three fields, only wider: 1 sign bit, an 11-bit exponent with bias 1023, and a 52-bit fraction.",
             ("dbl", {"hidden": False}), ("dsg", {"hidden": False}), ("dex", {"hidden": False}), ("dfr", {"hidden": False})),
        step("The same −6.75 as a double: the true exponent is still 2, so e = 1025; the fraction 1011 is padded with 48 zeros. The word is 0xC01B000000000000.",
             ("dv1", {"hidden": False}), ("dv2", {"hidden": False})),
    ]
    return spec("IEEE-754 single and double layouts", (760, 330), (360, 460),
                "The 32 bits of −6.75 in single precision, split into a 1-bit sign (red), an 8-bit exponent (blue) and a 23-bit fraction (green).",
                els, steps)


@scene
def ieee_encode():
    v = F(109, 8)
    n = fp.encode(v)
    s, e, f = fp.split_fields(n)
    assert fp.hexs(n) == "415A0000" and fp.binary(v, 3) == "1101.101" and fp.normalise_hidden(v) == (F(109, 64), 3)
    assert fp.frac_bits(F(5, 8), 3) == "101" and e == "10000010" and f.startswith("101101") and f[6:] == "0" * 17
    lines = [
        ("l1", "sign: + so s = 0"),
        ("l2", "13 = 1101₂ (repeated division by 2)"),
        ("l3", "0.625 = 0.101₂ (doubling: 1.25, 0.5, 1.0)"),
        ("l4", "13.625 = 1101.101₂ = 1.101101₂ × 2³"),
        ("l5", "e = 3 + 127 = 130 = 1000 0010₂"),
        ("l6", "f = 101101, then 17 zeros"),
    ]
    els = [*heads("Encoding 13.625 in single precision", "Encode 13.625 (single)", 640)]
    for i, (id, t) in enumerate(lines):
        els.append(text(id, 30, 62 + 30 * i, t, {"x": 16, "y": 56 + 28 * i, "size": 14}, size=16, mono=True, hidden=True))
    c, x0, y0 = 18, 32, 268
    els += [bits("ws", x0, y0, s, c, "wide", fill="danger", hidden=True),
            bits("we", x0 + c, y0, e, c, "wide", fill="info", hidden=True),
            bits("wf", x0 + 9 * c, y0, f, c, "wide", fill="success", hidden=True),
            bits("ns", 30, 252, s, 30, "narrow", fill="danger", hidden=True),
            bits("ne", 60, 252, e, 30, "narrow", fill="info", hidden=True),
            bits("nf1", 24, 296, f[:12], 26, "narrow", fill="success", hidden=True),
            bits("nf2", 24, 330, f[12:], 26, "narrow", fill="success", hidden=True),
            text("hex", 320, 330, "0100 0001 0101 1010 0000 … 0000 = 0x415A0000", {"x": 180, "y": 384, "size": 13}, anchor="middle", size=16, mono=True, hidden=True, tone="success"),
            text("chk", 320, 360, "check: +1.703125 × 2³ = 13.625", {"x": 180, "y": 410, "size": 13}, anchor="middle", size=15, tone="muted", hidden=True)]
    steps = [
        step("Step 1, the sign: 13.625 is positive, so the sign bit is 0.", ("l1", {"hidden": False})),
        step("Step 2, the integer part in binary: 13 = 8 + 4 + 1 = 1101₂.", ("l2", {"hidden": False})),
        step("Step 3, the fraction part by repeated doubling: 0.625 × 2 = 1.25 (bit 1), 0.25 × 2 = 0.5 (bit 0), 0.5 × 2 = 1.0 (bit 1). So 0.625 = 0.101₂, and it terminates.",
             ("l3", {"hidden": False})),
        step("Step 4, normalise: move the point 3 places left so exactly one 1 is before it. 1101.101₂ = 1.101101₂ × 2³.", ("l4", {"hidden": False})),
        step("Step 5, bias the exponent: e = 3 + 127 = 130 = 10000010₂.", ("l5", {"hidden": False})),
        step("Step 6, the fraction field holds the bits after the point (the leading 1 is hidden): 101101, padded with 17 zeros to 23 bits.", ("l6", {"hidden": False})),
        step("Step 7, assemble sign | exponent | fraction into 32 bits.",
             *[(i, {"hidden": False}) for i in ("ws", "we", "wf", "ns", "ne", "nf1", "nf2")]),
        step("Step 8, regroup the 32 bits in fours to get hex: 0x415A0000. Decoding it gives 1.703125 × 8 = 13.625 exactly, because 13.625 = 109/8 has a power-of-two denominator.",
             ("hex", {"hidden": False}), ("chk", {"hidden": False})),
    ]
    return spec("Decimal to IEEE-754: encoding 13.625", (640, 380), (360, 430),
                "We will turn 13.625 into a 32-bit single-precision word, one decision at a time.", els, steps)


@scene
def ieee_special_values():
    rows = [["exponent e", "fraction f", "meaning", "value"],
            ["0000 0000", "0", "zero", "±0"],
            ["0000 0000", "≠ 0", "denormal", "±0.f × 2⁻¹²⁶"],
            ["1 … 254", "any", "normal", "±1.f × 2^(e−127)"],
            ["1111 1111", "0", "infinity", "±∞"],
            ["1111 1111", "≠ 0", "NaN", "not a number"]]
    nrows = [["e", "f", "value"], ["0", "0", "±0"], ["0", "≠ 0", "±0.f × 2⁻¹²⁶"], ["1–254", "any", "±1.f × 2^(e−127)"],
             ["255", "0", "±∞"], ["255", "≠ 0", "NaN"]]
    assert fp.classify(0) == "+0" and fp.classify(0x80000000) == "-0" and fp.classify(1) == "denormal"
    assert fp.classify(0x3F800000) == "normal" and fp.classify(0x7F800000) == "+inf" and fp.classify(0x7FC00000) == "nan"
    assert fp.decode(0x00400000) == F(2) ** -127 and fp.decode(0xFF800000) == fp.NINF
    els = [*heads("How IEEE-754 single precision reads the exponent field", "Special values (single)", 640),
           el("tab", "table", "wide", x=20, y=50, cellW=150, cellH=34, rows=rows, header=True, mono=True),
           el("ntab", "table", "narrow", x=12, y=50, cellW=112, cellH=34, rows=nrows, header=True, mono=True)]
    ex = ["0x00000000 is +0 and 0x80000000 is −0. They compare equal, but 1/(+0) = +∞ and 1/(−0) = −∞.",
          "0x00400000 has e = 0 and f = 100…0: a denormal, 0.1₂ × 2⁻¹²⁶ = 2⁻¹²⁷. No hidden 1, and the exponent is fixed at −126.",
          "Every field from 1 to 254 is an ordinary number with a hidden 1: 0x3F800000 has e = 127, so it is 1.0.",
          "0x7F800000 is +∞ and 0xFF800000 is −∞: the results of overflow or of dividing a non-zero number by zero.",
          "0x7FC00000 has e = 255 and a non-zero fraction: NaN, from 0/0, ∞ − ∞ or √−1. NaN is unequal even to itself."]
    steps = [step(c, ("tab", {"highlight": [[r, k] for k in range(4)]}), ("ntab", {"highlight": [[r, k] for k in range(3)]}))
             for r, c in enumerate(ex, start=1)]
    steps.append(step("Only the two end fields are special. The 254 fields in between hold every normal number, from 2⁻¹²⁶ up to about 3.4 × 10³⁸.",
                      ("tab", {"highlight": []}), ("ntab", {"highlight": []})))
    return spec("IEEE-754 special values", (640, 270), (360, 270),
                "The five ways IEEE-754 single precision reads a word, chosen by the exponent field and whether the fraction is zero.",
                els, steps)


@scene
def gradual_underflow():
    vals = [fp.decode(n, 3, 2) for n in range(0, 0x11) if fp.decode(n, 3, 2) <= 1]
    assert vals == [0, F(1, 16), F(1, 8), F(3, 16), F(1, 4), F(5, 16), F(3, 8), F(7, 16), F(1, 2), F(5, 8), F(3, 4), F(7, 8), F(1)]
    assert fp.smallest_normal(3, 2) == F(1, 4) and fp.smallest_denormal(3, 2) == F(1, 16) and fp.ulp(F(1, 4), 3, 2) == F(1, 16)
    x, y = F(5, 16), F(1, 4)
    assert x - y == F(1, 16) and fp.round_to(x - y, 3, 2) == F(1, 16)
    X0, S, NX0, NS, Y = 40, 560, 20, 320, 130

    def px(v, narrow=False):
        return (NX0 + float(v) * NS) if narrow else (X0 + float(v) * S)

    els = [*heads("A toy float (3-bit exponent, 2 fraction bits) between 0 and 1", "Toy float between 0 and 1", 640),
           line("axis", [[X0 - 10, Y], [X0 + S + 10, Y]], {"points": [[NX0 - 8, Y], [NX0 + NS + 8, Y]]}, tone="muted")]
    for i, v in enumerate(vals):
        den = 0 < v < F(1, 4)
        els.append(line(f"t{i}", [[px(v), Y - 14], [px(v), Y + 14]], {"points": [[px(v, True), Y - 12], [px(v, True), Y + 12]]},
                        tone="warning" if den else "info", hidden=den))
    for v, lab in ((0, "0"), (F(1, 4), "1/4"), (F(1, 2), "1/2"), (F(1), "1")):
        els.append(text(f"l{lab.replace('/', '_')}", px(v), Y + 34, lab, {"x": px(v, True), "size": 13}, anchor="middle", size=14, mono=True, tone="muted"))
    els += [box("hole", px(0) + 3, Y - 30, px(F(1, 4)) - px(0) - 6, 60, None, {"x": px(0, True) + 2, "w": px(F(1, 4), True) - px(0, True) - 4}, fill="danger", tone="danger", dashed=True, hidden=True),
            text("xl", px(x), Y - 36, "x", {"x": px(x, True)}, anchor="middle", size=15, tone="subject", hidden=True),
            text("yl", px(y), Y - 36, "y", {"x": px(y, True)}, anchor="middle", size=15, tone="subject", hidden=True),
            box("note", 120, 196, 400, 44, "normals only: nothing between 0 and 1/4", {"x": 10, "y": 196, "w": 340, "h": 44, "size": 13}, size=15)]
    den_ticks = [i for i, v in enumerate(vals) if 0 < v < F(1, 4)]
    steps = [
        step("With normal numbers only, the smallest positive value is 1/4 (1.00 × 2⁻²) and the next one down is 0. Just above 1/4 the values are 1/16 apart, but below it there is a hole four times wider.",
             ("hole", {"hidden": False})),
        step("Take x = 5/16 and y = 4/16, two different normal numbers. Their difference 1/16 falls in the hole, so a flush-to-zero machine returns x − y = 0 even though x ≠ y.",
             ("xl", {"hidden": False}), ("yl", {"hidden": False}), ("note", {"label": "flush to zero: x − y = 0", "tone": "danger", "fill": "danger"})),
        step("Denormals use the exponent field 0 with no hidden 1: 0.f × 2⁻², giving 1/16, 2/16 and 3/16. They fill the hole with the same 1/16 spacing as the first normal binade.",
             ("hole", {"hidden": True}), *[(f"t{i}", {"hidden": False}) for i in den_ticks],
             ("note", {"label": "with denormals: evenly spaced down to 0", "tone": "success", "fill": "success"})),
        step("Now x − y = 1/16 is the denormal 0.01 × 2⁻², stored exactly. With denormals, x ≠ y always gives x − y ≠ 0.",
             (f"t{den_ticks[0]}", {"tone": "success"}), ("note", {"label": "x − y = 1/16, exact", "tone": "success", "fill": "success"})),
        step("The largest denormal, 3/16, is exactly one step below the smallest normal, 1/4. In IEEE single precision the same picture holds with 2⁻¹⁴⁹ steps up to 2⁻¹²⁶.",
             ("note", {"label": "largest denormal 3/16, smallest normal 1/4", "tone": "info", "fill": "info"})),
    ]
    return spec("Gradual underflow: denormals fill the hole around zero", (640, 260), (360, 260),
                "The values from 0 to 1 of a toy IEEE-style format with a 3-bit exponent (bias 3) and 2 fraction bits. At first only the normal numbers are drawn.",
                els, steps)


# ── Lesson 7 ────────────────────────────────────────────────────────────────

def sig_row(id, x, y, sig, extra, c, nx, ny, nc, hidden=False, **kw):
    """A significand row: the kept bits, then the extra (guard/round/sticky) bits in a warning tone."""
    return [bits(id, x, y, sig, c, {"x": nx, "y": ny, "cell": nc}, hidden=hidden, **kw),
            bits(id + "g", x + c * len(sig) + 6, y, extra or "  ", c, {"x": nx + nc * len(sig) + 4, "y": ny, "cell": nc}, fill="warning", hidden=hidden or not extra.strip())]


@scene
def fp_align_add():
    f = 4
    A, B = F(7), F(13, 8)
    assert fp.normalise_hidden(A) == (F(7, 4), 2) and fp.normalise_hidden(B) == (F(13, 8), 0)
    exact = A + B
    assert exact == F(69, 8) and fp.add(A, B, 4, f) == F(17, 2) and fp.binary(exact, 3) == "1000.101"
    assert fp.grs("0001" + "010", 4) == ("0001", 0, 1, 0)
    c, x0 = 34, 200
    nc, nx0 = 26, 120
    els = [*heads("Adding 7 + 1.625 with 4 fraction bits", "7 + 1.625, 4 fraction bits", 640)]
    rows = [("a", 60, "01.1100", "00", "A = 7", "× 2²"), ("b", 112, "01.1010", "00", "B = 1.625", "× 2⁰"),
            ("s", 196, "10.0010", "10", "sum", "× 2²"), ("n", 248, "01.0001", "01", "normalise", "× 2³"),
            ("r", 300, "01.0001", "", "round", "× 2³")]
    for id, y, sig, extra, lab, ex in rows:
        hid = id in ("s", "n", "r")
        ny = y + 10
        els += sig_row(id, x0, y, sig, extra, c, nx0, ny, nc, hidden=hid)
        els.append(text(id + "l", x0 - 16, y + c / 2, lab, {"x": nx0 - 8, "y": ny + nc / 2, "size": 13}, anchor="end", size=15, hidden=hid))
        els.append(text(id + "e", x0 + 10 * c, y + c / 2, ex, {"x": nx0 + 9 * nc + 6, "y": ny + nc / 2, "size": 13}, size=16, mono=True, hidden=hid, tone="info"))
    els.append(line("bar", [[x0 - 4, 170], [x0 + 9 * c + 10, 170]], {"points": [[nx0 - 4, 166], [nx0 + 9 * nc + 6, 166]]}, hidden=True))
    els.append(text("gl", x0 + 7 * c + 6 + c, 44, "G R", {"x": nx0 + 7 * nc + 4 + nc, "y": 50, "size": 12}, anchor="middle", size=13, tone="warning"))
    els.append(text("res", 320, 362, "", {"x": 180, "y": 370, "size": 13}, anchor="middle", size=16, tone="success"))
    steps = [
        step("Write both significands with their hidden 1 and two extra guard positions. A = 1.1100 × 2², B = 1.1010 × 2⁰. The exponents differ by 2.",
             ("a", {"highlight": [3, 4]}), ("b", {"highlight": [3, 4]})),
        step("Align: shift the smaller number right by 2 and raise its exponent to 2. B becomes 0.0110 × 2², and the bits shifted out (1 0) land in the guard and round positions instead of being lost.",
             ("b", {"bits": "00.0110", "highlight": []}), ("bg", {"bits": "10"}), ("be", {"text": "× 2²"}), ("a", {"highlight": []})),
        step("Add the aligned significands: 1.1100 00 + 0.0110 10 = 10.0010 10. The sum overflowed into a second integer bit.",
             ("bar", {"hidden": False}), ("s", {"hidden": False}), ("sg", {"hidden": False}), ("sl", {"hidden": False}), ("se", {"hidden": False})),
        step("Normalise: 10.0010 10 has two bits before the point, so shift right by 1 and add 1 to the exponent: 1.0001 010 × 2³. The bit shifted out joins the extra bits: G = 0, R = 1.",
             ("n", {"hidden": False}), ("ng", {"hidden": False}), ("nl", {"hidden": False}), ("ne", {"hidden": False})),
        step("Round to nearest even: the guard bit is 0, so the extra bits are less than half an ulp and are dropped. Result 1.0001 × 2³ = 8.5.",
             ("r", {"hidden": False}), ("rl", {"hidden": False}), ("re", {"hidden": False}),
             ("res", {"text": "stored 8.5; exact sum 8.625 (error 0.125, under half an ulp = 0.25)"})),
    ]
    return spec("Floating-point addition: align, add, normalise, round", (640, 380), (360, 390),
                "Two numbers in a toy format with 4 fraction bits: A = 7 = 1.1100 × 2² and B = 1.625 = 1.1010 × 2⁰.",
                els, steps)


@scene
def round_nearest_even():
    f = 4
    cases = [("1.0110", "011", "1.0110", "G = 0: less than half an ulp, round down (truncate)."),
             ("1.0110", "101", "1.0111", "G = 1 and R or S = 1: more than half an ulp, round up."),
             ("1.0110", "100", "1.0110", "G = 1, R = S = 0: exactly half. Tie: keep the even last bit (0), so round down."),
             ("1.0111", "100", "1.1000", "Exactly half again, but the last kept bit is 1 (odd): round up to make it even.")]
    for kept, ex, res, _ in cases:
        v = F(int((kept + ex).replace(".", ""), 2), 2 ** (4 + len(ex)))
        assert fp.round_to(v, 4, f) == F(int(res.replace(".", ""), 2), 2 ** 4), (kept, ex)
        g, r, s = int(ex[0]), int(ex[1]), int(ex[2])
        assert fp.rne_from_grs(kept.replace(".", ""), g, r, s) == (res != kept)
    c, x0 = 46, 120
    els = [*heads("Round to nearest, ties to even, from the G, R and S bits", "Rounding with G, R, S", 600),
           bits("k", x0, 70, cases[0][0], c, {"x": 14, "y": 70, "cell": 34}, labels=["", "", "", "", "", "LSB"]),
           bits("x", x0 + 6 * c + 10, 70, cases[0][1], c, {"x": 14 + 6 * 34 + 6, "y": 70, "cell": 34}, fill="warning", labels=["G", "R", "S"]),
           text("arrow", 300, 156, "↓ round", {"x": 180, "y": 140}, anchor="middle", size=15, tone="muted"),
           bits("out", x0, 180, cases[0][0], c, {"x": 14, "y": 162, "cell": 34}, fill="success", hidden=True),
           text("why", 300, 250, "", {"x": 180, "y": 232, "size": 12}, anchor="middle", size=14)]
    steps = []
    for kept, ex, res, why in cases:
        steps.append(step(f"Kept bits {kept}, extra bits G R S = {' '.join(ex)}. {why} Result {res}.",
                          ("k", {"bits": kept, "highlight": [5]}), ("x", {"bits": ex}), ("out", {"bits": res, "hidden": False}),
                          ("why", {"text": why.split(':')[0] if ':' in why else why})))
    return spec("Round to nearest, ties to even", (600, 270), (360, 250),
                "A significand with 4 kept fraction bits, followed by the guard (G), round (R) and sticky (S) bits that the hardware keeps while it computes.",
                els, steps)


@scene
def absorption():
    f = 4
    assert fp.add(32, 1, 4, f) == 32 and fp.add(fp.add(32, 1, 4, f), 1, 4, f) == 32 and fp.add(32, 2, 4, f) == 34 and fp.add(1, 1, 4, f) == 2
    assert fp.ulp(32, 4, f) == 2
    c, x0 = 40, 150
    els = [*heads("Absorption: a small number added to a large one (4 fraction bits)", "Absorption (4 fraction bits)", 640),
           text("xl", x0 - 14, 80, "x = 32", {"x": 70, "y": 80, "size": 13}, anchor="end", size=15),
           bits("x", x0, 60, "1.0000", c, {"x": 80, "y": 60, "cell": 30}),
           text("xe", x0 + 6 * c + 70, 80, "× 2⁵", {"x": 80 + 6 * 30 + 50, "y": 80, "size": 13}, size=16, mono=True, tone="info"),
           text("yl", x0 - 14, 140, "y = 1", {"x": 70, "y": 140, "size": 13}, anchor="end", size=15),
           bits("y", x0, 120, "1.0000", c, {"x": 80, "y": 120, "cell": 30}),
           bits("yg", x0 + 6 * c + 6, 120, "  ", c, {"x": 80 + 6 * 30 + 4, "y": 120, "cell": 30}, fill="warning", hidden=True, labels=["G", "R"]),
           text("ye", x0 + 6 * c + 70, 140, "× 2⁰", {"x": 80 + 6 * 30 + 50, "y": 140, "size": 13}, size=16, mono=True, tone="info"),
           box("res", 120, 190, 400, 46, "", {"x": 10, "y": 190, "w": 340, "h": 46, "size": 13}, size=15),
           text("note", 320, 262, "ulp(32) = 2 here, so half an ulp is 1", {"x": 180, "y": 262, "size": 13}, anchor="middle", size=14, tone="muted")]
    steps = [
        step("Align y to x's exponent 5: shift its significand right 5 places. The 1 lands just past the 4 kept bits: 0.0000 with guard bit 1 and round bit 0.",
             ("y", {"bits": "0.0000"}), ("yg", {"bits": "10", "hidden": False}), ("ye", {"text": "× 2⁵"})),
        step("The extra bits are exactly half an ulp (G = 1, R = S = 0): a tie. Ties go to the even neighbour, and 1.0000 is even, so x + y rounds to 32. y has been absorbed.",
             ("res", {"label": "32 + 1 = 32 (tie, rounds to even)", "tone": "danger", "fill": "danger"})),
        step("Add 1 again: the same thing happens, so (32 + 1) + 1 = 32.",
             ("res", {"label": "(32 + 1) + 1 = 32", "tone": "danger", "fill": "danger"})),
        step("Now add the small numbers first: 1 + 1 = 2 exactly. Aligning 2 = 1.0000 × 2¹ to exponent 5 shifts it 4 places: 0.0001, with nothing left over. 32 + 2 = 1.0001 × 2⁵ = 34 exactly.",
             ("yl", {"text": "y = 2"}), ("y", {"bits": "0.0001"}), ("yg", {"bits": "00"}),
             ("res", {"label": "32 + (1 + 1) = 34", "tone": "success", "fill": "success"})),
        step("So (32 + 1) + 1 ≠ 32 + (1 + 1): floating-point addition is not associative. Adding the small terms first keeps them from being absorbed.",
             ("note", {"text": "order matters: add small numbers first", "tone": "subject"})),
    ]
    return spec("Absorption and the loss of associativity", (640, 280), (360, 280),
                "A toy format with 4 fraction bits: x = 32 = 1.0000 × 2⁵ and y = 1 = 1.0000 × 2⁰. The next float above 32 is 34 (ulp = 2).",
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
