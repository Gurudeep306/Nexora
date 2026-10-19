"""Generator for the Viz scenes of Digital Logic Chapter 4 (Arithmetic circuits).

Every value a scene shows or captions (sum and carry bits, internal half-adder lines, settling
times, delays, register contents, flags, partial products, critical-path times) is computed here
with arithlib (gate netlists, static arrival times and the transport-delay simulation) and, where
cheap, asserted against integer arithmetic, so the scenes cannot drift from the checked maths.

The drawing, two-layout merging and geometry self-check machinery is shared with Chapter 5
(`_viz_ch5.S`, `merge`, `check_layout`): each scene is drawn once per layout ("wide" and "narrow");
captions and the intro are identical in both (they are the text alternative); `check_layout`
replays every frame of both layouts and asserts that everything stays inside its canvas, text is
large enough, no labels overlap and no wire crosses a label or runs through a block or gate.

Logic levels: success = 1, muted = 0, accent = the carry, path or stage that is active now.
Adders, registers and cells are `box` elements; gates are `gate` elements whose wires end on the
pins from boollib.gate_pins (the mirror of geometry.ts).

    python3 content/gate-notes/_checks/dl/_viz_ch4.py      # write the JSON files
    python3 content/gate-notes/_checks/dl/viz_ch4.py       # (check) files == generator output
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import arithlib as al  # noqa: E402
import comblib as cl  # noqa: E402
from _viz_ch1_fp import VIZ_DIR  # noqa: E402
from _viz_ch5 import S, check_layout, merge, tv, wire_pts  # noqa: E402

SPECS = {}


def scene(fn):
    name = fn.__name__.replace("_", "-")

    def build():
        s = merge(fn("wide"), fn("narrow"))
        check_layout(name, s)
        return s

    SPECS[name] = build
    return fn


def bstr(v, n):
    return format(v % 2 ** n, f"0{n}b")


# ── Lesson 1: half adder, full adder, ripple carry, pipelining ─────────────

@scene
def half_adder_design(L):
    s = S(L)
    W, NW = 660, 360
    rows = [(a, b) for a in (0, 1) for b in (0, 1)]
    net = al.half_adder("A", "B", "S", "C")
    vals = [cl.evaluate(net, {"A": a, "B": b}) for a, b in rows]
    assert [(v["S"], v["C"]) for v in vals] == [((a + b) % 2, (a + b) // 2) for a, b in rows]
    s.head("Designing the half adder: table, equations, gates", "Half adder: table to gates", W, NW)
    tx, ty = s.v(30, 40), 60
    empty = [["A", "B", "S", "C"]] + [[str(a), str(b), "", ""] for a, b in rows]
    s.table("tt", tx, ty, s.v(44, 40), 28, empty)
    s.text("eqS", s.v(240, 230), s.v(84, 84), "S = A ⊕ B", s.v(15, 13), anchor="start", weight="bold", hidden=True)
    s.text("eqC", s.v(240, 230), s.v(120, 120), "C = A·B", s.v(15, 13), anchor="start", weight="bold", hidden=True)
    gx, gy = s.v(490, 150), s.v(70, 240)
    xp, xo = s.gate("gx", gx, gy, 54, 46, "xor", hidden=True)
    ap, ao = s.gate("ga", gx, gy + 90, 54, 46, "and", hidden=True)
    ax, ay, by_ = gx - s.v(100, 110), gy + 30, gy + 72
    s.text("inA", ax - 6, xp[0][1], "A", anchor="end", weight="bold", mono=True, hidden=True)
    s.text("inB", ax - 6, xp[1][1] + 46, "B", anchor="end", weight="bold", mono=True, hidden=True)
    s.wire("wa1", (ax, xp[0][1]), xp[0], hidden=True)
    s.wire("wa2", (ax + 20, xp[0][1]), ap[0], ax + 20, hidden=True)
    s.wire("wb1", (ax, xp[1][1] + 46), xp[1], ax + 40, hidden=True)
    s.wire("wb2", (ax + 40, xp[1][1] + 46), ap[1], ax + 40, hidden=True)
    s.wire("wS", xo, (xo[0] + 30, xo[1]), hidden=True)
    s.wire("wC", ao, (ao[0] + 30, ao[1]), hidden=True)
    s.text("vS", xo[0] + 36, xo[1], "S", anchor="start", weight="bold", mono=True, hidden=True)
    s.text("vC", ao[0] + 36, ao[1], "C", anchor="start", weight="bold", mono=True, hidden=True)
    full = [["A", "B", "S", "C"]] + [[str(a), str(b), str(v["S"]), ""] for (a, b), v in zip(rows, vals)]
    s.step("Adding two bits A + B gives 0, 1 or 2, so we need two outputs: the sum bit S (weight 1) and the carry C (weight 2).")
    s.step("S column: S = 1 exactly when one input is 1 (rows 01 and 10). That is the odd function: S = A ⊕ B.",
           ("tt", {"rows": full, "highlight": [[2, 2], [3, 2]]}), ("eqS", {"hidden": False}))
    full2 = [["A", "B", "S", "C"]] + [[str(a), str(b), str(v["S"]), str(v["C"])] for (a, b), v in zip(rows, vals)]
    s.step("C column: a carry appears only for 1 + 1 = 10 (binary), row 11. So C = A·B.",
           ("tt", {"rows": full2, "highlight": [[4, 3]]}), ("eqC", {"hidden": False}))
    gate_ids = ["gx", "ga", "inA", "inB", "wa1", "wa2", "wb1", "wb2", "wS", "wC", "vS", "vC"]
    s.step("Two gates realise the two equations: an XOR for S and an AND for C, both fed by A and B.",
           *[(g, {"hidden": False}) for g in gate_ids], ("tt", {"highlight": []}))
    for k, ((a, b), v) in enumerate(zip(rows, vals)):
        s.step(f"Row A = {a}, B = {b}: {a} + {b} = {a + b}, so S = {v['S']} and C = {v['C']} (binary {v['C']}{v['S']}).",
               ("tt", {"highlight": [[k + 1, 0], [k + 1, 1], [k + 1, 2], [k + 1, 3]]}),
               ("inA", {"text": f"A={a}", "tone": tv(a)}), ("inB", {"text": f"B={b}", "tone": tv(b)}),
               ("wa1", {"tone": tv(a)}), ("wa2", {"tone": tv(a)}), ("wb1", {"tone": tv(b)}), ("wb2", {"tone": tv(b)}),
               ("wS", {"tone": tv(v["S"])}), ("wC", {"tone": tv(v["C"])}),
               ("vS", {"text": f"S={v['S']}", "tone": tv(v["S"])}), ("vC", {"text": f"C={v['C']}", "tone": tv(v["C"])}))
    return s.done("The half adder from its truth table", (W, 260), (NW, 420),
                  "A half adder adds two bits A and B. Its truth table has four rows and two output columns, S and C.")


@scene
def full_adder_from_has(L):
    s = S(L)
    W, NW = 680, 360
    net = al.full_adder("A", "B", "Cin", "S", "Cout", "")
    cases = [(1, 1, 1), (1, 0, 1), (0, 1, 0), (1, 1, 0)]
    s.head("A full adder from two half adders and an OR gate", "Full adder = 2 HAs + OR", W, NW)
    X = (lambda x: x) if s.wd else (lambda x: round(x * 0.5 + 16, 2))
    gw = s.v(50, 34)
    yA, yB, yC = 92, 132, 232
    s.box("hl1", X(130), 54, s.v(90, 60), 150, dashed=True, tone="muted")
    s.text("hl1t", X(130) + s.v(45, 30), 66, "HA1", s.v(13, 12), anchor="middle", tone="muted", weight="bold")
    s.box("hl2", X(310), 54, s.v(90, 60), 200, dashed=True, tone="muted")
    s.text("hl2t", X(310) + s.v(45, 30), 66, "HA2", s.v(13, 12), anchor="middle", tone="muted", weight="bold")
    xp1, xo1 = s.gate("x1", X(150), 78, gw, 44, "xor")
    ap1, ao1 = s.gate("a1", X(150), 146, gw, 44, "and")
    xp2, xo2 = s.gate("x2", X(330), 84, gw, 44, "xor")
    ap2, ao2 = s.gate("a2", X(330), 196, gw, 44, "and")
    op_, oo = s.gate("o1", X(470), 150, gw, 44, "or")
    lx = s.v(26, 6)
    s.text("iA", lx, yA, "A", s.v(14, 12), anchor="start", mono=True, weight="bold")
    s.text("iB", lx, yB, "B", s.v(14, 12), anchor="start", mono=True, weight="bold")
    s.text("iC", lx, yC, "Cin", s.v(14, 12), anchor="start", mono=True, weight="bold")
    st = X(76)
    s.line("wA1", [[st, yA], [X(100), yA], [X(100), xp1[0][1]], xp1[0]])
    s.line("wA2", [[X(100), yA], [X(100), ap1[0][1]], ap1[0]])
    s.line("wB1", [[st, yB], [X(116), yB], [X(116), xp1[1][1]], xp1[1]])
    s.line("wB2", [[X(116), yB], [X(116), ap1[1][1]], ap1[1]])
    s.line("wp1", [[xo1[0], xo1[1]], [X(270), xo1[1]], [X(270), xp2[0][1]], xp2[0]])
    s.line("wp2", [[X(270), xp2[0][1]], [X(270), ap2[0][1]], ap2[0]])
    s.line("wC1", [[st, yC], [X(290), yC], [X(290), xp2[1][1]], xp2[1]])
    s.line("wC2", [[X(290), yC], [X(290), ap2[1][1]], ap2[1]])
    s.line("wg", [[ao1[0], ao1[1]], [X(240), ao1[1]], [X(240), 262], [X(440), 262], [X(440), op_[0][1]], op_[0]])
    s.line("wt", [[ao2[0], ao2[1]], [X(452), ao2[1]], [X(452), op_[1][1]], op_[1]])
    endx = X(560)
    s.line("wS", [[xo2[0], xo2[1]], [endx, xo2[1]]])
    s.line("wCo", [[oo[0], oo[1]], [endx, oo[1]]])
    s.text("vS", endx + 4, xo2[1], "S", s.v(14, 12), anchor="start", mono=True, weight="bold")
    s.text("vCo", endx + 4, oo[1], "Cout", s.v(14, 12), anchor="start", mono=True, weight="bold")
    s.text("vp", s.v(248, 158), xo1[1] - 12, "p", s.v(13, 12), anchor="middle", mono=True)
    s.text("vg", X(190), 262 - 12, "g", s.v(13, 12), anchor="middle", mono=True)
    s.text("vt", s.v(426, 250), ao2[1] + s.v(-12, 16), "t", s.v(13, 12), anchor="middle", mono=True)
    s.text("note", s.v(W / 2, NW / 2), 300, "", s.v(14, 12), anchor="middle", weight="bold")
    s.step("HA1 adds A and B: its XOR gives the partial sum p = A ⊕ B, its AND gives g = A·B (a carry made here).")
    s.step("HA2 adds p and Cin: S = p ⊕ Cin is the full sum, t = p·Cin is a carry made by passing Cin along.")
    s.step("The OR merges the two possible carries: Cout = g + t = A·B + Cin·(A ⊕ B).",
           ("o1", {"tone": "accent"}), ("note", {"text": "Cout = AB + Cin(A ⊕ B)", "tone": "accent"}))
    for a, b, c in cases:
        v = cl.evaluate(net, {"A": a, "B": b, "Cin": c})
        assert 2 * v["Cout"] + v["S"] == a + b + c and not (v["gp"] if "gp" in v else 0)
        g, t, p = v["g"], v["t"], v["p"]
        assert not (g and t)
        why = "both carries can never be 1 together" if g or t else "no carry is made"
        s.step(f"A, B, Cin = {a}, {b}, {c}: p = {p}, g = {g}, t = {t}; S = {v['S']}, Cout = {v['Cout']} ({a} + {b} + {c} = {a + b + c}); {why}.",
               ("o1", {"tone": "ink"}),
               ("iA", {"text": f"A={a}", "tone": tv(a)}), ("iB", {"text": f"B={b}", "tone": tv(b)}), ("iC", {"text": f"Cin={c}", "tone": tv(c)}),
               ("wA1", {"tone": tv(a)}), ("wA2", {"tone": tv(a)}), ("wB1", {"tone": tv(b)}), ("wB2", {"tone": tv(b)}),
               ("wC1", {"tone": tv(c)}), ("wC2", {"tone": tv(c)}), ("wp1", {"tone": tv(p)}), ("wp2", {"tone": tv(p)}),
               ("wg", {"tone": tv(g)}), ("wt", {"tone": tv(t)}), ("wS", {"tone": tv(v["S"])}), ("wCo", {"tone": tv(v["Cout"])}),
               ("vp", {"text": f"p={p}", "tone": tv(p)}), ("vg", {"text": f"g={g}", "tone": tv(g)}), ("vt", {"text": f"t={t}", "tone": tv(t)}),
               ("vS", {"text": f"S={v['S']}", "tone": tv(v['S'])}), ("vCo", {"text": f"Co={v['Cout']}", "tone": tv(v['Cout'])}),
               ("note", {"text": f"{a} + {b} + {c} = {v['Cout']}{v['S']} (binary)", "tone": "accent"}))
    return s.done("A full adder built from two half adders and an OR gate", (W, 320), (NW, 320),
                  "Inputs A, B and Cin. HA1 adds A and B; HA2 adds HA1's sum and Cin; an OR gate combines the two half-adder carries into Cout.")


def fa_chain(s, n, vertical):
    """Draw n full-adder boxes (FA0 first) for the ripple scenes; returns the geometry per stage."""
    G = []
    for i in range(n):
        if vertical:
            x, y, w, h = 130, 70 + i * 104, 100, 56
        else:
            x, y, w, h = 560 - i * 160, 120, 96, 70
        s.box(f"fa{i}", x, y, w, h, label=f"FA{i}", size=s.v(15, 13))
        G.append((x, y, w, h))
    return G


@scene
def ripple_carry_wave(L):
    s = S(L)
    W, NW = 700, 360
    n = 4
    A, B = 0b0111, 0b0001
    net = al.rca(n)
    ins = al.inputs_of(n)
    st, wave = al.simulate(net, ins, al.env_of(n, 0, 0), al.env_of(n, A, B))
    fin = cl.evaluate(net, al.env_of(n, A, B))
    assert al.word(fin, "s", n) == (A + B) % 16 and fin["c4"] == 0
    T = max(st[x] for x in [f"s{i}" for i in range(n)] + [f"c{n}"])
    worst = al.arrival(net, ins)
    assert worst["c4"] == al.rca_delay_unit(4) == 9
    vert = not s.wd
    s.head("A 4-bit ripple-carry adder: the carry travels one stage at a time", "Ripple carry: 0111 + 0001", W, NW)
    G = fa_chain(s, n, vert)
    s.text("clk", s.v(W - 20, NW - 14), s.v(60, 44), "t = 0", s.v(16, 14), anchor="end", weight="bold", mono=True, tone="accent")
    for i, (x, y, w, h) in enumerate(G):
        a, b = A >> i & 1, B >> i & 1
        if vert:
            s.text(f"in{i}", x - 12, y + h / 2, f"a{i}={a} b{i}={b}", 13, anchor="end", mono=True)
            s.line(f"so{i}", [[x + w, y + h / 2], [x + w + 22, y + h / 2]])
            s.text(f"s{i}", x + w + 28, y + h / 2, f"s{i}=0", 13, anchor="start", mono=True)
        else:
            s.text(f"in{i}", x + w / 2, y - 36, f"a{i}={a} b{i}={b}", 14, anchor="middle", mono=True)
            s.line(f"ia{i}", [[x + w / 2, y - 24], [x + w / 2, y]])
            s.line(f"so{i}", [[x + w / 2, y + h], [x + w / 2, y + h + 26]])
            s.text(f"s{i}", x + w / 2, y + h + 40, f"s{i}=0", 14, anchor="middle", mono=True)
    # carry wires: c0 into FA0, c_i between FA_{i-1} and FA_i, c_n out of FA_{n-1}
    for i in range(n + 1):
        if vert:
            x = 180
            y0 = 40 if i == 0 else G[i - 1][1] + G[i - 1][3]
            y1 = G[i][1] if i < n else G[n - 1][1] + G[n - 1][3] + 40
            s.line(f"c{i}", [[x, y0], [x, y1]])
            s.text(f"cl{i}", x + 10, (y0 + y1) / 2, f"c{i}=0", 13, anchor="start", mono=True)
        else:
            y = 155
            x0 = (G[i][0] + G[i][2]) if i < n else G[n - 1][0]
            x0 = 690 if i == 0 else G[i - 1][0]
            x1 = G[i][0] + G[i][2] if i < n else 20
            s.line(f"c{i}", [[x0, y], [x1, y]])
            s.text(f"cl{i}", (x0 + x1) / 2, y - 14, f"c{i}=0", 13, anchor="middle", mono=True)

    def at(x, t):
        return wave[x][t]

    s.step(f"Inputs change at t = 0 from 0000 + 0000 to {bstr(A, 4)} + {bstr(B, 4)}. Every gate takes one unit; only stage 0 can generate a carry.",
           *[(f"in{i}", {"tone": "accent"}) for i in range(n)])
    for t in range(1, T + 1):
        ch_c = [i for i in range(1, n + 1) if at(f"c{i}", t) != at(f"c{i}", t - 1)]
        ch_s = [i for i in range(n) if at(f"s{i}", t) != at(f"s{i}", t - 1)]
        if not ch_c and not ch_s:
            continue
        parts = []
        if ch_c:
            parts.append(", ".join(f"c{i} becomes {at(f'c{i}', t)}" for i in ch_c))
        if ch_s:
            parts.append(", ".join(f"s{i} becomes {at(f's{i}', t)}" for i in ch_s))
        cap = f"t = {t}: " + "; ".join(parts) + "."
        if t == st["c3"] and 3 in ch_c:
            cap += " The carry has crossed three stages."
        pats = [("clk", {"text": f"t = {t}"})]
        for i in range(1, n + 1):
            v = at(f"c{i}", t)
            pats += [(f"c{i}", {"tone": "accent" if i in ch_c else tv(v)}), (f"cl{i}", {"text": f"c{i}={v}", "tone": "accent" if i in ch_c else tv(v)})]
        for i in range(n):
            v = at(f"s{i}", t)
            pats += [(f"s{i}", {"text": f"s{i}={v}", "tone": "accent" if i in ch_s else tv(v)}), (f"so{i}", {"tone": tv(v)})]
        s.step(cap, *pats)
    s.step(f"Settled at t = {T}: sum {bstr(al.word(fin, 's', n), 4)} = {A + B}, carry out 0. The worst case for 4 bits is {worst['c4']} units (2n + 1).",
           *[(f"c{i}", {"tone": tv(fin[f'c{i}'])}) for i in range(1, n + 1)], *[(f"cl{i}", {"tone": tv(fin[f'c{i}'])}) for i in range(1, n + 1)],
           *[(f"s{i}", {"tone": tv(fin[f's{i}'])}) for i in range(n)])
    return s.done("The carry rippling through a 4-bit ripple-carry adder", (W, 280), (NW, 520),
                  "Four full adders FA0 (least significant) to FA3 in a chain; each stage's carry out is the next stage's carry in. The clock counts gate delays.")


@scene
def pipeline_adder(L):
    s = S(L)
    W, NW = 700, 360
    A_seq, B_seq = [6, 3, 7, 5, 0, 0, 0, 0], [5, 5, 3, 6, 0, 0, 0, 0]
    Z = al.pipeline_2002(A_seq, B_seq)
    assert Z == ["0000", "0000", "1011", "1000", "1010", "1011", "0000", "0000"]
    s.head("A 3-stage pipelined adder (GATE 2002)", "Pipelined 3-bit adder", W, NW)
    if s.wd:
        cols = [(30, 70), (260, 70), (490, 70)]
        bw, fy, fh = 190, 150, 40
    else:
        cols = [(30, 56), (30, 196), (30, 336)]
        bw, fy, fh = 300, 0, 34
    names = ["R0", "R1", "R2"]
    for k, (x, y) in enumerate(cols):
        s.box(f"r{k}", x, y, bw, 52, label=f"{names[k]}: 0…0", size=s.v(14, 12), mono=True)
        fy_ = y + 80 if s.wd else y + 76
        s.box(f"f{k}", x + bw / 2 - s.v(60, 70), fy_, s.v(120, 140), fh, label=f"FA (bit {k})", size=s.v(14, 12))
        s.line(f"w{k}", [[x + bw / 2, y + 52], [x + bw / 2, fy_]])
    if s.wd:
        for k in range(2):
            x, y = cols[k]
            s.line(f"n{k}", [[x + bw / 2 + 60, 170], [x + bw + 10, 170], [x + bw + 10, 96], [cols[k + 1][0], 96]])
    else:
        for k in range(2):
            x, y = cols[k]
            s.line(f"n{k}", [[x + bw / 2 + 70, y + 93], [x + bw + 14, y + 93], [x + bw + 14, cols[k + 1][1] + 26], [x + bw, cols[k + 1][1] + 26]])
    zy = s.v(240, 470)
    s.text("clk", s.v(30, 30), zy, "clock 0", s.v(15, 13), anchor="start", weight="bold")
    s.text("z", s.v(670, 330), zy, "Z = 0000", s.v(16, 14), anchor="end", weight="bold", mono=True)
    s.text("hist", s.v(W / 2, NW / 2), zy + s.v(34, 34), "", s.v(14, 12), anchor="middle", mono=True)
    # Register contents per clock, recomputed here (independent of pipeline_2002's internals).
    R0 = R1 = R2 = None
    hist = []
    for k, (a, b) in enumerate(zip(A_seq, B_seq), 1):
        R2 = R1
        R1 = R0
        R0 = (a, b)
        hist.append(Z[k - 1])
        lab = [f"R0: {bstr(a, 3)}+{bstr(b, 3)}"]
        lab.append(f"R1: {bstr(R1[0], 3)}+{bstr(R1[1], 3)}" if R1 else "R1: 0…0")
        lab.append(f"R2: {bstr(R2[0], 3)}+{bstr(R2[1], 3)}" if R2 else "R2: 0…0")
        done = R2 is not None and (R2[0] or R2[1])
        val = f"{R2[0]} + {R2[1]} = {R2[0] + R2[1]}" if R2 else "0 + 0"
        assert int(Z[k - 1], 2) == (R2[0] + R2[1] if R2 else 0)
        if k == 1:
            cap = "Clock 1: R0 captures A = 110, B = 101. Only bit 0 is added in this stage; R1 and R2 still hold zeros, so Z = 0000."
        elif k == 2:
            cap = "Clock 2: the first pair moves to R1 (with its sum bit 0 and carry c1); R0 takes 011 + 101. Z is still 0000."
        elif k == 3:
            cap = f"Clock 3: the first pair reaches R2; FA (bit 2) finishes it: Z = {Z[2]} = 6 + 5 = 11. Latency: 3 clocks."
        else:
            cap = f"Clock {k}: a new result every clock: Z = {Z[k - 1]} ({val})." + (" Throughput: one sum per clock." if k == 4 else "")
        s.step(cap, ("r0", {"label": lab[0], "tone": "accent"}), ("r1", {"label": lab[1], "tone": "ink"}),
               ("r2", {"label": lab[2], "tone": "success" if done else "ink"}), ("clk", {"text": f"clock {k}"}),
               ("z", {"text": f"Z = {Z[k - 1]}", "tone": "success" if int(Z[k - 1], 2) else "muted"}),
               ("hist", {"text": " ".join(hist[-4:])}))
    return s.done("Three register stages and three full adders form a pipelined adder", (W, 300), (NW, 530),
                  "Registers R0, R1, R2 separate three full adders; each stage adds one bit position. A and B enter R0 at every clock.")


ORDER = ["half-adder-design", "full-adder-from-has", "ripple-carry-wave", "pipeline-adder"]


def build_all():
    assert sorted(SPECS) == sorted(ORDER), sorted(set(SPECS) ^ set(ORDER))
    return {name: SPECS[name]() for name in ORDER}


def dump(s):
    return json.dumps(s, ensure_ascii=False, indent=1) + "\n"


if __name__ == "__main__":
    only = sys.argv[1:]
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    for name in ORDER:
        if only and name not in only:
            continue
        sp = SPECS[name]()
        (VIZ_DIR / f"{name}.json").write_text(dump(sp))
        print(f"wrote viz/{name}.json ({len(sp['steps'])} steps)")
