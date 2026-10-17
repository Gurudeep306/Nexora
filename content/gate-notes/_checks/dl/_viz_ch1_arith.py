"""Generator for the arithmetic Viz scenes of Digital Logic Chapter 1 (lessons 9 and 10).

Every bit, carry and caption number is computed here (exact integers), so the scenes cannot
drift from the checked maths. Each scene has a wide canvas and a narrow (phone) canvas.

    python3 content/gate-notes/_checks/dl/_viz_ch1_arith.py     # write the JSON files
    python3 content/gate-notes/_checks/dl/viz_ch1_arith.py      # (check) files == generator output
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import _viz_ch1_fp as base  # noqa: E402  (shared element helpers)
import numlib as nl  # noqa: E402

spec, step, text, box, bits, line, heads = base.spec, base.step, base.text, base.box, base.bits, base.line, base.heads
VIZ_DIR = base.VIZ_DIR
SPECS = {}


def scene(fn):
    SPECS[fn.__name__.replace("_", "-")] = fn
    return fn


def add_trace(a, b, n, cin=0):
    """Column-by-column trace of an n-bit binary addition: list of (sum bit, carry out) from bit 0 up."""
    out, c = [], cin
    for i in range(n):
        t = ((a >> i) & 1) + ((b >> i) & 1) + c
        out.append((t & 1, t >> 1))
        c = t >> 1
    return out


# ── Lesson 9 ────────────────────────────────────────────────────────────────

@scene
def column_add_carry():
    a, b, n = 0b10110101, 0b01101110, 8
    tr = add_trace(a, b, n)
    total = a + b
    assert (a, b, total) == (181, 110, 291) and f"{total:09b}" == "100100011"
    c, x0, nc, nx0 = 48, 112, 34, 36
    els = [*heads("Adding 10110101 + 01101110, one column at a time", "10110101 + 01101110", 600),
           bits("ca", x0, 92, " " + f"{a:08b}", c, {"x": nx0, "y": 92, "cell": nc}),
           bits("cb", x0, 92 + c + 8, " " + f"{b:08b}", c, {"x": nx0, "y": 92 + nc + 8, "cell": nc}),
           line("bar", [[x0, 92 + 2 * c + 20], [x0 + 9 * c, 92 + 2 * c + 20]], {"points": [[nx0, 92 + 2 * nc + 18], [nx0 + 9 * nc, 92 + 2 * nc + 18]]}),
           bits("cs", x0, 92 + 2 * c + 30, " " * 9, c, {"x": nx0, "y": 92 + 2 * nc + 26, "cell": nc}, fill="success"),
           text("plus", x0 - 20, 92 + c + 8 + c / 2, "+", {"x": nx0 - 14, "y": 92 + nc + 8 + nc / 2}, anchor="middle", size=22),
           text("cap", 300, 284, "carry row", {"x": 180, "y": 236, "size": 13}, anchor="middle", size=15, tone="muted")]
    for i in range(9):
        els.append(text(f"k{i}", x0 + i * c + c / 2, 74, "", {"x": nx0 + i * nc + nc / 2, "y": 76, "size": 13}, anchor="middle", size=15, tone="warning", mono=True))
    steps, sumbits = [], [" "] * 9
    for i, (s, co) in enumerate(tr):
        col = 8 - i
        sumbits[col] = str(s)
        t = ((a >> i) & 1) + ((b >> i) & 1) + (tr[i - 1][1] if i else 0)
        pat = [("cs", {"bits": "".join(sumbits), "highlight": [col]}), ("ca", {"highlight": [col]}), ("cb", {"highlight": [col]})]
        if co:
            pat.append((f"k{col - 1}", {"text": "1"}))
        steps.append(step(f"Column {i}: {(a >> i) & 1} + {(b >> i) & 1}" + (f" + carry {tr[i - 1][1]}" if i and tr[i - 1][1] else "") +
                          f" = {t}, which is {t:b} in binary: write {s}" + (", carry 1 to the next column." if co else ", no carry."), *pat))
    sumbits[0] = "1"
    steps.append(step(f"The carry out of column 7 becomes a ninth bit: the sum is 1 0010 0011 = {total} = 181 + 110. In an 8-bit register the 1 would be the carry flag.",
                      ("cs", {"bits": "".join(sumbits), "highlight": [0]}), ("ca", {"highlight": []}), ("cb", {"highlight": []}),
                      ("cap", {"text": f"sum = {total}", "tone": "success"})))
    assert "".join(sumbits) == "100100011"
    return spec("Binary column addition with a moving carry", (600, 300), (360, 260),
                "Two bytes, 181 and 110, written one above the other. The small row on top will hold the carries.", els, steps)


@scene
def complement_subtraction():
    m, nn, w = 0b1010100, 0b1000011, 7
    nbar = nn ^ (2 ** w - 1)
    s = m + nbar
    res = (s - 2 ** w) + 1
    assert (m, nn, nbar, s, res) == (84, 67, 0b0111100, 0b10010000, 17)
    c, x0, nc, nx0 = 46, 150, 34, 88
    rows = [("m", f" {m:07b}", "M"), ("nb", f" {nbar:07b}", "N̄"), ("s", f"{s:08b}", "sum"),
            ("e", "       1", "+1"), ("r", f" {res:07b}", "M − N")]
    ys = [70, 124, 196, 250, 314]
    nys = [70, 116, 178, 224, 282]
    els = [*heads("84 − 67 with the 1's complement and the end-around carry", "84 − 67, 1's complement", 600)]
    for (id, bs, lab), y, ny in zip(rows, ys, nys):
        hid = id != "m"
        els.append(bits(id, x0, y, bs, c, {"x": nx0, "y": ny, "cell": nc}, hidden=hid, fill="success" if id == "r" else "none"))
        els.append(text(id + "l", x0 - 12, y + c / 2, lab, {"x": nx0 - 8, "y": ny + nc / 2, "size": 12}, anchor="end", size=14, hidden=hid))
    els.append(line("bar", [[x0, 182], [x0 + 8 * c, 182]], {"points": [[nx0, 166], [nx0 + 8 * nc, 166]]}, hidden=True))
    els.append(text("note", 300, 380, "", {"x": 180, "y": 340, "size": 12}, anchor="middle", size=15))
    steps = [
        step("Write N = 1000011 (67) and flip every bit: N̄ = 0111100. This is the 1's complement, 2⁷ − 1 − 67 = 60.",
             ("nb", {"hidden": False}), ("nbl", {"hidden": False})),
        step("Add M + N̄ = 1010100 + 0111100 = 1 0010000. The sum is 144 = 2⁷ + 16: a carry comes out of the top bit because M > N.",
             ("bar", {"hidden": False}), ("s", {"hidden": False, "highlight": [0]}), ("sl", {"hidden": False})),
        step("End-around carry: remove the carry (worth 2⁷) and add it back as 1 at the bottom. Removing 2⁷ leaves M − N − 1 = 16; adding 1 corrects the 'one short' of the 1's complement.",
             ("e", {"hidden": False}), ("el", {"hidden": False}), ("note", {"text": "16 + 1 = 17"})),
        step("Result 0010001 = 17 = 84 − 67. Had there been no carry, the result would have been negative, with magnitude equal to the 1's complement of the sum.",
             ("r", {"hidden": False}), ("rl", {"hidden": False}), ("note", {"text": "84 − 67 = 17 ✓", "tone": "success"})),
    ]
    return spec("Complement subtraction with the end-around carry", (600, 400), (360, 360),
                "M = 1010100 (84). We will subtract N = 1000011 (67) using only an adder and bit inversion.", els, steps)


@scene
def overflow_carries():
    cases = [(0b0101, 0b0100, "+5 + (+4)"), (0b1011, 0b1010, "−5 + (−6)"), (0b0101, 0b1101, "+5 + (−3)")]
    info = []
    for a, b, lab in cases:
        tr = add_trace(a, b, 4)
        c3, c4 = tr[2][1], tr[3][1]
        s = (a + b) % 16
        v = nl.from_twos(nl.to_base(a, 2, 4)) + nl.from_twos(nl.to_base(b, 2, 4))
        info.append((a, b, lab, s, c3, c4, v))
        assert (c3 != c4) == (not -8 <= v <= 7)
    assert [(i[4], i[5]) for i in info] == [(1, 0), (0, 1), (1, 1)]
    c, x0, nc, nx0 = 54, 210, 40, 120
    a, b, lab, s, c3, c4, v = info[0]
    els = [*heads("Overflow: compare the carry into and out of the sign bit", "Carry in vs carry out of the MSB", 600),
           text("cin", x0 + c * 1.5, 70, "c₃", {"x": nx0 + nc * 1.5, "y": 70, "size": 13}, anchor="middle", size=15, tone="warning"),
           text("cout", x0 + c * 0.5, 70, "c₄", {"x": nx0 + nc * 0.5, "y": 70, "size": 13}, anchor="middle", size=15, tone="warning"),
           text("cinv", x0 + c * 1.5, 92, "", {"x": nx0 + nc * 1.5, "y": 92, "size": 14}, anchor="middle", size=17, mono=True, tone="warning"),
           text("coutv", x0 + c * 0.5, 92, "", {"x": nx0 + nc * 0.5, "y": 92, "size": 14}, anchor="middle", size=17, mono=True, tone="warning"),
           bits("ra", x0 + c, 110, f"{a:04b}", c, {"x": nx0 + nc, "y": 110, "cell": nc}),
           bits("rb", x0 + c, 110 + c + 6, f"{b:04b}", c, {"x": nx0 + nc, "y": 110 + nc + 6, "cell": nc}),
           bits("rs", x0, 110 + 2 * c + 24, f"{c4}{s:04b}", c, {"x": nx0, "y": 110 + 2 * nc + 22, "cell": nc}, fill="info"),
           text("lab", 300, 360, "", {"x": 180, "y": 310, "size": 13}, anchor="middle", size=17)]
    steps = []
    for k, (a, b, lab, s, c3, c4, v) in enumerate(info):
        over = c3 != c4
        verdict = f"overflow (true sum {v} is outside −8 … 7)" if over else f"no overflow (the sum {v} fits)"
        steps.append(step(f"{lab}: {a:04b} + {b:04b} = {c4} {s:04b}. Carry into the sign column c₃ = {c3}, carry out c₄ = {c4}. "
                          f"They {'differ' if over else 'agree'}, so {verdict}." + (" The carry out alone is not overflow." if (c4 and not over) else ""),
                          ("ra", {"bits": f"{a:04b}", "highlight": [0]}), ("rb", {"bits": f"{b:04b}", "highlight": [0]}),
                          ("rs", {"bits": f"{c4}{s:04b}", "highlight": [0, 1], "fill": "danger" if over else "success"}),
                          ("cinv", {"text": str(c3)}), ("coutv", {"text": str(c4)}),
                          ("lab", {"text": f"{lab} → {'V = 1' if over else 'V = 0'}", "tone": "danger" if over else "success"})))
    steps.append(step("Rule: V = c₃ ⊕ c₄. Equivalently, overflow happens exactly when both operands have the same sign and the result's sign differs.",
                      ("lab", {"text": "V = carry in ⊕ carry out (sign column)", "tone": "subject"})))
    return spec("Overflow and the carries of the sign column", (600, 390), (360, 330),
                "Three 4-bit 2's-complement additions. Above the sign column we show the carry into it (c₃) and out of it (c₄).", els, steps)


def bcd_nibbles(n, digits):
    return " ".join(nl.to_base(int(d), 2, 4) for d in str(n).zfill(digits))


@scene
def bcd_plus_six():
    A, B = 386, 457
    assert nl.bcd(A) == "0011 1000 0110" and A + B == 843
    da, db = [int(x) for x in str(A)][::-1], [int(x) for x in str(B)][::-1]
    c, x0, nc, nx0 = 32, 130, 23, 18
    els = [*heads("BCD addition 386 + 457 with the +6 correction", "BCD: 386 + 457", 600),
           bits("A", x0, 64, bcd_nibbles(A, 3), c, {"x": nx0, "y": 64, "cell": nc}),
           bits("B", x0, 64 + c + 6, bcd_nibbles(B, 3), c, {"x": nx0, "y": 64 + nc + 6, "cell": nc}),
           text("Al", x0 - 10, 64 + c / 2, "386", "wide", anchor="end", size=15),
           text("Bl", x0 - 10, 64 + c * 1.5 + 6, "457", "wide", anchor="end", size=15),
           bits("raw", x0, 150, " " * 14, c, {"x": nx0, "y": 130, "cell": nc}, fill="warning"),
           text("rawl", x0 - 10, 150 + c / 2, "binary", "wide", anchor="end", size=14),
           bits("res", x0, 210, " " * 14, c, {"x": nx0, "y": 176, "cell": nc}, fill="success"),
           text("resl", x0 - 10, 210 + c / 2, "BCD", "wide", anchor="end", size=14),
           text("note", 300, 280, "", {"x": 180, "y": 236, "size": 12}, anchor="middle", size=15)]
    raw, res = [" "] * 14, [" "] * 14
    steps, carry = [], 0
    names = ["units", "tens", "hundreds"]
    for k in range(3):
        t = da[k] + db[k] + carry
        cells = slice(10 - 5 * k, 14 - 5 * k)
        rawbits = f"{t % 16:04b}"
        raw[cells] = list(rawbits)
        if t > 9:
            fixed = (t + 6) % 16
            assert fixed == t - 10
            cap = (f"{names[k].capitalize()}: {da[k]} + {db[k]}" + (" + carry 1" if carry else "") + f" = {t} > 9, so add 0110: "
                   f"{t:b} + 110 = 1 {fixed:04b}. Digit {fixed}, decimal carry 1.")
            carry = 1
            digit = fixed
        else:
            cap = f"{names[k].capitalize()}: {da[k]} + {db[k]}" + (" + carry 1" if carry else "") + f" = {t}, not above 9: no correction."
            carry = 0
            digit = t
        res[cells] = list(f"{digit:04b}")
        steps.append(step(cap, ("raw", {"bits": "".join(raw), "highlight": list(range(cells.start, cells.stop))}),
                          ("res", {"bits": "".join(res), "highlight": list(range(cells.start, cells.stop))}),
                          ("note", {"text": f"{names[k]} digit = {digit}" + (", carry 1" if carry else "")})))
    assert "".join(res) == nl.bcd(843)
    steps.append(step("The result 1000 0100 0011 is BCD 843 = 386 + 457. Each +6 skipped the six unused patterns 1010 … 1111, so the carry came out at ten.",
                      ("res", {"highlight": []}), ("raw", {"highlight": []}), ("note", {"text": "386 + 457 = 843 ✓", "tone": "success"})))
    return spec("BCD addition and the +6 correction", (600, 300), (360, 260),
                "386 and 457 in BCD, one 4-bit group per decimal digit. We add digit by digit from the right.", els, steps)


@scene
def excess3_correction():
    A, B = 47, 38
    xa, xb = nl.xs3(A), nl.xs3(B)
    assert (xa, xb, nl.xs3(85)) == ("0111 1010", "0110 1011", "1011 1000")
    c, x0, nc, nx0 = 40, 180, 30, 50
    els = [*heads("Excess-3 addition 47 + 38: −3 without a carry, +3 with one", "Excess-3: 47 + 38", 600),
           bits("A", x0, 64, xa, c, {"x": nx0, "y": 64, "cell": nc}), bits("B", x0, 64 + c + 6, xb, c, {"x": nx0, "y": 64 + nc + 6, "cell": nc}),
           text("Al", x0 - 10, 64 + c / 2, "XS3(47)", "wide", anchor="end", size=14),
           text("Bl", x0 - 10, 64 + c * 1.5 + 6, "XS3(38)", "wide", anchor="end", size=14),
           bits("raw", x0, 170, " " * 9, c, {"x": nx0, "y": 146, "cell": nc}, fill="warning"),
           bits("res", x0, 230, " " * 9, c, {"x": nx0, "y": 196, "cell": nc}, fill="success"),
           text("note", 300, 300, "", {"x": 180, "y": 256, "size": 12}, anchor="middle", size=15)]
    u = int(xa[5:], 2) + int(xb[5:], 2)
    assert u == 21 and u >= 16
    uf = (u % 16) + 3
    t = int(xa[:4], 2) + int(xb[:4], 2) + 1
    assert t == 14 and t < 16
    tf = t - 3
    steps = [
        step(f"Units: 1010 + 1011 = 1 0101. A carry came out, so the digit sum was 10 or more: add 3. 0101 + 0011 = {uf:04b} (excess-3 of 5), decimal carry 1.",
             ("raw", {"bits": f"    {u % 16:04b}"}), ("res", {"bits": f"     {uf:04b}"}), ("note", {"text": "carry → +3"})),
        step(f"Tens: 0111 + 0110 + carry 1 = {t:04b}, with no carry out: the digit sum was at most 9, so subtract 3: {t:04b} − 0011 = {tf:04b} (excess-3 of 8).",
             ("raw", {"bits": f"{t:04b} {u % 16:04b}"}), ("res", {"bits": f"{tf:04b} {uf:04b}"}), ("note", {"text": "no carry → −3"})),
        step("Why: each code carries an excess of 3, so a sum carries an excess of 6. Without a carry, remove 3 to leave a single excess of 3. With a carry, the 16 taken away already over-removed, so put 3 back.",
             ("note", {"text": "XS3(a) + XS3(b) = a + b + 6"})),
        step("Result 1011 1000 is excess-3 of 85 = 47 + 38.", ("note", {"text": "47 + 38 = 85 ✓", "tone": "success"})),
    ]
    assert f"{tf:04b} {uf:04b}" == nl.xs3(85)
    return spec("Excess-3 addition and its ±3 correction", (600, 320), (360, 280),
                "47 and 38 in excess-3 (each digit plus 3, in 4 bits).", els, steps)


def build_all():
    return {name: fn() for name, fn in SPECS.items()}


def dump(s):
    return json.dumps(s, ensure_ascii=False, indent=1) + "\n"


if __name__ == "__main__":
    for name, s in build_all().items():
        (VIZ_DIR / f"{name}.json").write_text(dump(s))
        print(f"wrote viz/{name}.json ({len(s['steps'])} steps)")
