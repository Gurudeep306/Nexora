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
            x0 = 699 if i == 0 else G[i - 1][0]
            x1 = G[i][0] + G[i][2] if i < n else 20
            s.line(f"c{i}", [[x0, y], [x1, y]])
            s.text(f"cl{i}", (x0 + x1) / 2 + (3 if i == 0 else 0), y - 14, f"c{i}=0", 13, anchor="middle", mono=True)

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


# ── Lesson 2: carry look-ahead ─────────────────────────────────────────────

@scene
def rca_vs_cla_timing(L):
    s = S(L)
    W, NW = 700, 360
    n = 16
    tr = al.arrival(al.rca(n), al.inputs_of(n))
    tc_ = al.arrival(al.cla(n), al.inputs_of(n))
    R = [tr[f"c{i}"] for i in range(1, n + 1)]
    C = [tc_[f"c{i}"] for i in range(1, n + 1)]
    assert R == [2 * i + 1 for i in range(1, n + 1)] and max(C) == 7
    endR = max(R[-1], max(tr[f"s{i}"] for i in range(n)))
    endC = max(max(C), max(tc_[f"s{i}"] for i in range(n)))
    assert (endR, endC) == (33, 8)
    s.head("16-bit adder: when each carry is ready (unit gate delays)", "16-bit: ripple vs look-ahead", W, NW)
    s.text("clk", s.v(W - 20, NW - 12), s.v(52, 46), "t = 0", s.v(16, 14), anchor="end", weight="bold", mono=True, tone="accent")

    def row(prefix, y0, label):
        if s.wd:
            s.text(f"{prefix}lab", 40, y0 - 22, label, 14, anchor="start", weight="bold")
            s.text(f"{prefix}hl", 40, y0 + 56, "c16", 13, anchor="start", tone="muted", mono=True)
            s.text(f"{prefix}hr", 676, y0 + 56, "c1", 13, anchor="end", tone="muted", mono=True)
            for k in range(n):
                i = n - k  # carry index, c16 on the left
                s.box(f"{prefix}{i}", 40 + 40 * k, y0, 36, 36, label="", size=13, mono=True)
        else:
            s.text(f"{prefix}lab", 12, y0 - 20, label, 13, anchor="start", weight="bold")
            for r in range(2):
                for k in range(8):
                    i = n - 8 * r - k
                    s.box(f"{prefix}{i}", 12 + 42 * k, y0 + 44 * r, 38, 36, label="", size=12, mono=True)
            s.text(f"{prefix}hl", 12, y0 + 98, "c16 … c9 / c8 … c1", 12, anchor="start", tone="muted", mono=True)

    row("r", s.v(84, 80), "Ripple-carry: c_i ready at 2i + 1")
    row("k", s.v(196, 240), "Carry look-ahead (fan-in 4, two levels)")
    s.text("res", s.v(W / 2, NW / 2), s.v(286, 396), "", s.v(15, 13), anchor="middle", weight="bold")
    times = sorted(set(R + C + [endR, endC]))
    for t in times:
        newR = [i for i in range(1, n + 1) if R[i - 1] == t]
        newC = [i for i in range(1, n + 1) if C[i - 1] == t]
        pats = [("clk", {"text": f"t = {t}"})]
        for i in range(1, n + 1):
            for p, arr in (("r", R), ("k", C)):
                ready = arr[i - 1] <= t
                pats.append((f"{p}{i}", {"label": str(arr[i - 1]) if ready else "", "fill": "success" if ready else "none",
                                         "tone": "accent" if arr[i - 1] == t else "ink"}))
        parts = []
        if newR:
            parts.append(f"ripple: c{newR[0]} ready")
        if newC:
            parts.append("look-ahead: " + ", ".join(f"c{i}" for i in newC) + " ready")
        if t == endC:
            parts.append("look-ahead's last sum done at 8")
        if t == endR:
            parts = ["ripple: c16 ready; ripple done at 33"]
        cap = f"t = {t}: " + "; ".join(parts) + "."
        if t == 3:
            cap += " Both adders have c1, but look-ahead also has c2 and c3."
        res = {"text": f"done: look-ahead {endC}, ripple {endR} gate delays", "tone": "accent"} if t == endR else {"text": ""}
        s.step(cap, *pats, ("res", res))
    return s.done("Ready times of the carries in a 16-bit ripple-carry and a carry look-ahead adder", (W, 310), (NW, 420),
                  "Each box is one carry, c16 on the left, c1 on the right. It fills with its ready time when it settles. Every gate costs one unit.")


@scene
def cla_gp_tree(L):
    s = S(L)
    W, NW = 700, 360
    n = 16
    net = al.cla(n)
    t = al.arrival(net, al.inputs_of(n))
    tG = [t[f"G{4 * j}_{4 * j + 4}"] for j in range(4)]
    tP = [t[f"P{4 * j}_{4 * j + 4}"] for j in range(4)]
    top = [t[f"c{4 * j + 4}"] for j in range(4)]
    inner = [max(t[f"c{4 * j + k}"] for k in (1, 2, 3)) for j in range(4)]
    sums = [max(t[f"s{4 * j + k}"] for k in range(4)) for j in range(4)]
    ts = [t[f"s{i}"] for i in range(n)]
    assert ts[4] == 5 and ts[8] == ts[12] == 6 and max(ts[5:8]) == 7 and [i for i in range(n) if ts[i] == 8] == [9, 10, 11, 13, 14, 15]
    assert max(ts[0:4]) == 4
    assert tG == [3] * 4 and tP == [2] * 4 and top == [4, 5, 5, 5] and inner == [3, 6, 7, 7] and sums == [4, 7, 8, 8]
    s.head("Two-level carry look-ahead for 16 bits: up the tree, then down", "16-bit CLA: up, then down", W, NW)
    s.text("clk", s.v(W - 20, NW - 12), s.v(46, 46), "t = 0", s.v(16, 14), anchor="end", weight="bold", mono=True, tone="accent")
    yA, yB, yC, yD, yE = s.v(70, 72), s.v(140, 140), s.v(214, 212), s.v(290, 286), s.v(364, 360)
    if s.wd:
        bx = [40 + 160 * (3 - j) for j in range(4)]  # block j's x (block 0 on the right)
        bw = 156
        for i in range(n):
            x = 40 + 40 * (n - 1 - i)
            s.box(f"pg{i}", x, yA, 36, 34, label=str(i), size=13, mono=True)
            s.line(f"wa{i}", [[x + 18, yA + 34], [x + 18, yB]])
            s.box(f"sm{i}", x, yE, 36, 34, label=f"s{i}", size=13, mono=True)
            s.line(f"we{i}", [[x + 18, yD + 40], [x + 18, yE]])
        s.text("rowA", 40, yA - 14, "level 1: p_i = a_i ⊕ b_i, g_i = a_i b_i (bit 15 … 0)", 13, anchor="start", tone="muted")
        s.text("rowE", 40, yE + 50, "sums s_i = p_i ⊕ c_i", 13, anchor="start", tone="muted")
    else:
        bx = [10 + 87 * (3 - j) for j in range(4)]
        bw = 81
        for j in range(4):
            s.box(f"npg{j}", bx[j], yA, bw, 34, label=f"p,g {4 * j + 3}–{4 * j}", size=12)
            s.line(f"nwa{j}", [[bx[j] + bw / 2, yA + 34], [bx[j] + bw / 2, yB]])
            s.box(f"nsm{j}", bx[j], yE, bw, 34, label=f"s {4 * j + 3}–{4 * j}", size=12)
            s.line(f"nwe{j}", [[bx[j] + bw / 2, yD + 40], [bx[j] + bw / 2, yE]])
        s.text("rowA", 10, yA - 14, "level 1: p_i, g_i", 12, anchor="start", tone="muted")
        s.text("rowE", 10, yE + 50, "sums s_i = p_i ⊕ c_i", 12, anchor="start", tone="muted")
    for j in range(4):
        s.box(f"gp{j}", bx[j], yB, bw, 40, label=s.v(f"block {j}: G, P", f"G,P {j}"), size=s.v(14, 12))
        s.line(f"wb{j}", [[bx[j] + bw / 2, yB + 40], [bx[j] + bw / 2, yC]])
        s.box(f"in{j}", bx[j], yD, bw, 40, label=s.v(f"c{4 * j + 1}–c{4 * j + 3}", f"c{4 * j + 1}–{4 * j + 3}"), size=s.v(14, 12))
        s.line(f"wc{j}", [[bx[j] + bw / 2, yC + 40], [bx[j] + bw / 2, yD]])
    x0, x1 = bx[3], bx[0] + bw
    s.box("unit", x0, yC, x1 - x0, 40, label=s.v("second-level lookahead: c4, c8, c12, c16", "lookahead: c4 c8 c12 c16"), size=s.v(14, 12))
    steps = [
        (1, "t = 1: every bit makes p_i = a_i ⊕ b_i and g_i = a_i b_i in one gate level, all 16 in parallel.", [("pg", "all")]),
        (2, "t = 2: each block's P = p3 p2 p1 p0 is one AND of its four p's.", []),
        (3, "t = 3: each block's G = g3 + p3g2 + p3p2g1 + p3p2p1g0 (AND then OR). Block 0's c1–c3 are ready too.", [("gp", "all"), ("in", [0])]),
        (4, "t = 4: c4 = G0 + P0·c0 from the second-level unit; the sums s0–s3 are done.", [("sm", [0])]),
        (5, "t = 5: c8, c12, c16 = G + PG + PPG + … over the blocks: the top of the tree is done; s4 is done.", [("unit", "all")]),
        (6, "t = 6: going down: block 1 makes c5–c7 from c4 in two levels; s8 and s12 are done.", [("in", [1])]),
        (7, "t = 7: blocks 2 and 3 make c9–c11 and c13–c15 from c8 and c12; s5–s7 are done.", [("in", [2, 3]), ("sm", [1])]),
        (8, "t = 8: the last sums s9–s11 and s13–s15 are done. 8 gate delays, against 33 for a ripple adder.", [("sm", [2, 3])]),
    ]
    lit = set()
    for tt, cap, what in steps:
        pats = [("clk", {"text": f"t = {tt}"})]
        for kind, which in what:
            js = range(4) if which == "all" else which
            if kind == "pg":
                if s.wd:
                    pats += [(f"pg{i}", {"fill": "success"}) for i in range(n)]
                else:
                    pats += [(f"npg{j}", {"fill": "success"}) for j in range(4)]
            elif kind == "sm":
                for j in js:
                    if s.wd:
                        pats += [(f"sm{4 * j + k}", {"fill": "success"}) for k in range(4)]
                    else:
                        pats.append((f"nsm{j}", {"fill": "success"}))
            elif kind == "unit":
                pats.append(("unit", {"fill": "success", "tone": "accent"}))
                pats += [(f"wc{j}", {"tone": "accent"}) for j in range(4)]
            else:
                for j in js:
                    pats.append((f"{kind}{j}", {"fill": "success", "tone": "accent"}))
                    if kind == "gp":
                        pats.append((f"wb{j}", {"tone": "accent"}))
        if tt == 2:
            pats += [(f"gp{j}", {"tone": "accent"}) for j in range(4)]
        s.step(cap, *pats)
        lit.add(tt)
    assert max(sums) == 8
    return s.done("A two-level carry look-ahead tree for a 16-bit adder", (W, 430), (NW, 430),
                  "Sixteen bit pairs make p and g; four blocks make group G and P; a second-level unit makes the block carries; each block then makes its inner carries and sums.")


@scene
def carry_select(L):
    s = S(L)
    W, NW = 700, 360
    A, B = 0b01101011, 0b00110110
    net = al.carry_select(8, 4)
    t = al.arrival(net, al.inputs_of(8), {"MUX": 2})
    v = cl.evaluate(net, al.env_of(8, A, B))
    assert al.word(v, "s", 8) == (A + B) % 256 and v["c8"] == (A + B) >> 8
    lo = (A & 15) + (B & 15)
    up0, up1 = (A >> 4) + (B >> 4), (A >> 4) + (B >> 4) + 1
    c4 = lo >> 4
    assert c4 == 1 and t["c4"] == 9 and max(t[f"s{i}"] for i in range(8)) == 11 and al.rca_delay_unit(8) == 17
    s.head("Carry-select: compute the upper half both ways, then choose", "Carry-select adder (8 bits)", W, NW)
    s.text("clk", s.v(W - 20, NW - 12), s.v(46, 46), "t = 0", s.v(16, 14), anchor="end", weight="bold", mono=True, tone="accent")
    if s.wd:
        u0 = (40, 92, 220, 50)
        u1 = (40, 172, 220, 50)
        mx = (330, 104, 120, 106)
        lw = (470, 232, 200, 54)
    else:
        u0 = (20, 84, 150, 50)
        u1 = (190, 84, 150, 50)
        mx = (120, 176, 120, 60)
        lw = (80, 320, 200, 54)
    s.text("inU", s.v(150, 180), s.v(70, 66), f"a7–4 = {A >> 4:04b}, b7–4 = {B >> 4:04b}", s.v(14, 12), anchor="middle", mono=True)
    s.box("u0", *u0, label="upper, carry in 0", size=s.v(14, 12))
    s.box("u1", *u1, label="upper, carry in 1", size=s.v(14, 12))
    s.box("mx", *mx, label="2:1 MUX", size=s.v(14, 12))
    s.box("lw", *lw, label="lower 4 bits", size=s.v(14, 12))
    s.text("inL", lw[0] + lw[2] / 2, lw[1] - 14, f"a3–0 = {A & 15:04b}, b3–0 = {B & 15:04b}", s.v(14, 12), anchor="middle", mono=True)
    if s.wd:
        s.line("w0", [[u0[0] + u0[2], u0[1] + 25], [300, u0[1] + 25], [300, 130], [mx[0], 130]], tone="muted")
        s.line("w1", [[u1[0] + u1[2], u1[1] + 25], [300, u1[1] + 25], [300, 184], [mx[0], 184]], tone="muted")
        s.line("wc", [[lw[0], lw[1] + 27], [390, lw[1] + 27], [390, mx[1] + mx[3]]], tone="muted")
        s.line("wo", [[mx[0] + mx[2], 157], [500, 157]], tone="muted")
        s.text("vo", 506, 157, "s7–4 = ?", 14, anchor="start", mono=True, weight="bold")
        s.line("wl", [[lw[0] + lw[2] / 2, lw[1] + lw[3]], [lw[0] + lw[2] / 2, lw[1] + lw[3] + 16]], tone="muted")
        s.text("vl", lw[0] + lw[2] / 2, lw[1] + lw[3] + 30, "s3–0 = ?", 14, anchor="middle", mono=True, weight="bold")
        s.text("vc", 380, 270, "c4 = ?", 14, anchor="end", mono=True)
        s.text("v0", u0[0] + u0[2] / 2, u0[1] + u0[3] + 12, "", 13, anchor="middle", mono=True)
        s.text("v1", u1[0] + u1[2] / 2, u1[1] + u1[3] + 12, "", 13, anchor="middle", mono=True)
    else:
        s.line("w0", [[u0[0] + u0[2] / 2, u0[1] + u0[3]], [u0[0] + u0[2] / 2, 160], [150, 160], [150, mx[1]]], tone="muted")
        s.line("w1", [[u1[0] + u1[2] / 2, u1[1] + u1[3]], [u1[0] + u1[2] / 2, 160], [210, 160], [210, mx[1]]], tone="muted")
        s.line("wc", [[lw[0] + lw[2] / 2, lw[1] - 28], [lw[0] + lw[2] / 2, 270], [180, 270], [180, mx[1] + mx[3]]], tone="muted")
        s.line("wo", [[mx[0] + mx[2], mx[1] + 30], [262, mx[1] + 30]], tone="muted")
        s.text("vo", 266, mx[1] + 30, "s7–4=?", 12, anchor="start", mono=True, weight="bold")
        s.line("wl", [[lw[0] + lw[2] / 2, lw[1] + lw[3]], [lw[0] + lw[2] / 2, lw[1] + lw[3] + 14]], tone="muted")
        s.text("vl", lw[0] + lw[2] / 2, lw[1] + lw[3] + 28, "s3–0 = ?", 12, anchor="middle", mono=True, weight="bold")
        s.text("vc", 194, 256, "c4 = ?", 12, anchor="start", mono=True)
        s.text("v0", u0[0] + u0[2] / 2, u0[1] - 0 - 6 + 0, "", 12, anchor="middle", mono=True, hidden=True)
        s.text("v1", u1[0] + u1[2] / 2, u1[1] - 6, "", 12, anchor="middle", mono=True, hidden=True)
    s.step("t = 0: all three 4-bit ripple adders start at once. The upper half does not wait: it adds both ways, with carry in 0 and 1.")
    s.step(f"t = 9: the upper adders finish: {up0 % 16:04b} (carry {up0 >> 4}) and {up1 % 16:04b} (carry {up1 >> 4}).",
           ("clk", {"text": "t = 9"}), ("u0", {"label": f"c=0: {up0 % 16:04b}, out {up0 >> 4}", "fill": "success"}),
           ("u1", {"label": f"c=1: {up1 % 16:04b}, out {up1 >> 4}", "fill": "success"}),
           ("w0", {"tone": "ink"}), ("w1", {"tone": "ink"}))
    s.step(f"t = 9 too: the lower adder gives {lo % 16:04b} with carry c4 = {c4}. Every adder took 2 × 4 + 1 = 9 gate delays.",
           ("lw", {"label": f"lower: {lo % 16:04b}", "fill": "success"}), ("wl", {"tone": "success"}),
           ("vl", {"text": f"s3–0 = {lo % 16:04b}", "tone": "success"}), ("wc", {"tone": "accent"}), ("vc", {"text": f"c4 = {c4}", "tone": "accent"}))
    s.step(f"t = 11: c4 = 1 selects the 'carry in 1' result through the MUX (2 gate levels): s7–4 = {up1 % 16:04b}, carry out {up1 >> 4}.",
           ("clk", {"text": "t = 11"}), ("mx", {"tone": "accent", "fill": "success"}), ("w1", {"tone": "accent"}), ("w0", {"tone": "muted"}),
           ("u0", {"fill": "none"}), ("wo", {"tone": "success"}), ("vo", {"text": s.v(f"s7–4 = {up1 % 16:04b}", f"{up1 % 16:04b}"), "tone": "success"}))
    s.step(f"Sum {(A + B) % 256:08b} = {A} + {B} = {A + B} after 11 gate delays; an 8-bit ripple adder needs 17. The price: a third adder and the MUXes.",
           ("u0", {"fill": "none"}))
    return s.done("A carry-select adder choosing between two precomputed upper halves", (W, 330), (NW, 420),
                  "An 8-bit carry-select adder: a lower 4-bit ripple adder, two upper 4-bit ripple adders (carry in 0 and carry in 1) and a row of 2:1 MUXes driven by the lower carry c4.")


# ── Lesson 3: adder–subtractor, flags, BCD adder ───────────────────────────

def flags_of(n, a, b, K):
    v = cl.evaluate(al.adder_subtractor(n), {**al.env_of(n, a, b), "K": K})
    return v, al.word(v, "s", n)


@scene
def addsub_overflow(L):
    s = S(L)
    W, NW = 700, 360
    n = 4
    cases = [(0b0101, 0b0110, 0, "5 + 6"), (0b0101, 0b0110, 1, "5 − 6"), (0b0011, 0b0101, 1, "3 − 5"), (0b1000, 0b0001, 1, "−8 − 1")]
    s.head("A 4-bit adder–subtractor: K inverts B and adds 1", "Adder–subtractor with overflow", W, NW)
    G = []
    for i in range(n):
        if s.wd:
            x, y = 480 - 140 * i, 170
            G.append((x, y, 96, 60))
            s.box(f"fa{i}", x, y, 96, 60, label=f"FA{i}", size=14)
            s.box(f"x{i}", x + 46, 82, 44, 30, label="⊕", size=14)
            s.text(f"b{i}", x + 80, 47, f"b{i}=0", 13, anchor="middle", mono=True)
            s.line(f"wb{i}", [[x + 80, 56], [x + 80, 82]])
            s.line(f"wk{i}", [[x + 56, 66], [x + 56, 82]])
            s.line(f"wy{i}", [[x + 68, 112], [x + 68, 170]])
            s.text(f"y{i}", x + 74, 140, "", 13, anchor="start", mono=True)
            s.text(f"a{i}", x + 22, 140, f"a{i}=0", 13, anchor="middle", mono=True)
            s.line(f"wa{i}", [[x + 22, 150], [x + 22, 170]])
            s.line(f"ws{i}", [[x + 48, 230], [x + 48, 248]])
            s.text(f"s{i}", x + 48, 262, f"s{i}", 13, anchor="middle", mono=True)
        else:
            x, y = 150, 80 + 92 * i
            G.append((x, y, 90, 52))
            s.box(f"fa{i}", x, y, 90, 52, label=f"FA{i}", size=13)
            s.box(f"x{i}", 74, y + 8, 46, 34, label="⊕", size=13)
            s.text(f"b{i}", 36, y + 16, f"b{i}=0", 12, anchor="middle", mono=True)
            s.line(f"wb{i}", [[52, y + 16], [74, y + 16]])
            s.line(f"wk{i}", [[62, y + 34], [74, y + 34]])
            s.line(f"wy{i}", [[120, y + 25], [150, y + 25]])
            s.text(f"y{i}", 135, y + 50, "", 12, anchor="middle", mono=True)
            s.text(f"a{i}", 274, y + 14, f"a{i}=0", 12, anchor="start", mono=True)
            s.line(f"wa{i}", [[240, y + 14], [270, y + 14]])
            s.line(f"ws{i}", [[240, y + 38], [270, y + 38]])
            s.text(f"s{i}", 274, y + 38, f"s{i}", 12, anchor="start", mono=True)
    if s.wd:
        s.line("kbus", [[40, 66], [s.v(616, 0), 66]])
        s.text("kl", 36, 66, "K=0", 14, anchor="end", mono=True, weight="bold")
        for i in range(n + 1):
            y = 200
            x0 = 690 if i == 0 else G[i - 1][0]
            x1 = G[i][0] + G[i][2] if i < n else 40
            s.line(f"c{i}", [[x0, y], [x1, y]])
            if i == n:
                s.text(f"cl{i}", 44, y - 14, f"c{i}", 13, anchor="end", mono=True)
            else:
                s.text(f"cl{i}", (x0 + x1) / 2 + (2 if i == 0 else 0), y - 14, f"c{i}", 13, anchor="middle", mono=True)
        # V = c4 ⊕ c3: taps from the c4 and c3 wires.
        vp, vo = s.gate("vg", 70, 286, 44, 40, "xor")
        s.line("tap4", [[50, 200], [50, vp[0][1]], vp[0]])
        s.line("tap3", [[178, 200], [178, 250], [60, 250], [60, vp[1][1]], vp[1]])
        s.line("wv", [vo, [vo[0] + 20, vo[1]]])
        s.text("vv", vo[0] + 26, vo[1], "V", 14, anchor="start", mono=True, weight="bold")
        s.text("flags", 680, 300, "", 14, anchor="end", mono=True, weight="bold")
        s.text("res", 680, 330, "", 14, anchor="end")
    else:
        s.line("kbus", [[62, 46], [62, G[n - 1][1] + 34]])
        s.text("kl", 62, 36, "K=0", 12, anchor="middle", mono=True, weight="bold")
        for i in range(n + 1):
            y0 = 52 if i == 0 else G[i - 1][1] + 52
            y1 = G[i][1] if i < n else G[n - 1][1] + 52 + 40
            s.line(f"c{i}", [[195, y0], [195, y1]])
            s.text(f"cl{i}", 205, (y0 + y1) / 2, f"c{i}", 12, anchor="start", mono=True)
        vp, vo = s.gate("vg", 160, 470, 40, 36, "xor")
        s.line("tap4", [[195, G[n - 1][1] + 92], [140, G[n - 1][1] + 92], [140, vp[0][1]], vp[0]])
        s.line("tap3", [[195, G[n - 2][1] + 72], [130, G[n - 2][1] + 72], [130, vp[1][1]], vp[1]])
        s.line("wv", [vo, [vo[0] + 16, vo[1]]])
        s.text("vv", vo[0] + 20, vo[1], "V", 12, anchor="start", mono=True, weight="bold")
        s.text("flags", NW / 2, 530, "", 12, anchor="middle", mono=True, weight="bold")
        s.text("res", NW / 2, 552, "", 12, anchor="middle")
    s.step("K = 0: each XOR passes b_i unchanged (b ⊕ 0 = b) and the carry in c0 = K = 0, so the circuit is an ordinary adder.")
    s.step("K = 1: each XOR inverts its bit (b ⊕ 1 = b′) and c0 = 1 adds one: A + B′ + 1 = A − B in two's complement.")
    for a, b, K, name in cases:
        v, r = flags_of(n, a, b, K)
        sa, sb = al.tc(a, n), al.tc(b, n)
        true = sa - sb if K else sa + sb
        assert v["V"] == int(not -8 <= true <= 7)
        pats = [("kl", {"text": f"K={K}", "tone": tv(K)}), ("kbus", {"tone": tv(K)})]
        for i in range(n):
            bi, ai, yi = b >> i & 1, a >> i & 1, v[f"y{i}"]
            pats += [(f"b{i}", {"text": f"b{i}={bi}", "tone": tv(bi)}), (f"wb{i}", {"tone": tv(bi)}), (f"wk{i}", {"tone": tv(K)}),
                     (f"x{i}", {"tone": "accent" if K else "ink"}), (f"y{i}", {"text": f"{yi}", "tone": tv(yi)}), (f"wy{i}", {"tone": tv(yi)}),
                     (f"a{i}", {"text": f"a{i}={ai}", "tone": tv(ai)}), (f"wa{i}", {"tone": tv(ai)}),
                     (f"s{i}", {"text": f"s{i}={v[f's{i}']}", "tone": tv(v[f"s{i}"])}), (f"ws{i}", {"tone": tv(v[f"s{i}"])})]
        cs = [K] + [v[f"c{i}"] for i in range(1, n + 1)]
        for i in range(n + 1):
            tone = "accent" if i >= n - 1 else tv(cs[i])
            pats += [(f"c{i}", {"tone": tone}), (f"cl{i}", {"text": f"c{i}={cs[i]}", "tone": tone})]
        pats += [("tap4", {"tone": tv(cs[n])}), ("tap3", {"tone": tv(cs[n - 1])}), ("vg", {"tone": "danger" if v["V"] else "ink"}),
                 ("wv", {"tone": "danger" if v["V"] else "muted"}), ("vv", {"text": f"V={v['V']}", "tone": "danger" if v["V"] else "muted"}),
                 ("flags", {"text": f"C={v['C']} V={v['V']} N={v['N']} Z={v['Z']}"}),
                 ("res", {"text": f"{name}: {r:04b} reads {al.tc(r, n)}" + (" (overflow)" if v["V"] else ""), "tone": "danger" if v["V"] else "success"})]
        why = (f"c4 = {cs[n]} and c3 = {cs[n - 1]} differ, so V = 1: {name} = {true} does not fit in 4 bits." if v["V"]
               else f"c4 = c3 = {cs[n]}, so V = 0: {name} = {true} fits.")
        s.step(f"{name}: K = {K}, sum {r:04b}. " + why, *pats)
    return s.done("A 4-bit adder–subtractor with its overflow detector", (W, 350), (NW, 566),
                  "Each b_i passes through an XOR with the control line K before entering the full adders; K is also the carry in c0. An XOR of c4 and c3 gives the overflow flag V.")


@scene
def bcd_adder_hw(L):
    s = S(L)
    W, NW = 700, 360
    net = al.bcd_adder()
    cases = [(8, 7, 0), (4, 5, 0), (9, 9, 1), (8, 9, 0)]
    s.head("The BCD adder: add in binary, detect > 9, add 0110", "BCD adder circuit", W, NW)
    if s.wd:
        a1 = (60, 70, 260, 56)
        a2 = (60, 250, 260, 56)
        s.text("in", 190, 52, "A = 0000, B = 0000, cin = 0", 14, anchor="middle", mono=True)
        s.box("add1", *a1, label="4-bit binary adder", size=14)
        s.line("wz", [[190, 126], [190, 250]])
        s.text("zt", 200, 160, "K Z = ?", 14, anchor="start", mono=True, weight="bold")
        gp1, go1 = s.gate("d1", 430, 120, 50, 40, "and")
        gp2, go2 = s.gate("d2", 430, 180, 50, 40, "and")
        gp3, go3 = s.gate("d3", 540, 140, 54, 60, "or", inputs=3)
        for k, (p, lab) in enumerate([(gp1[0], "Z3"), (gp1[1], "Z2"), (gp2[0], "Z3"), (gp2[1], "Z1")]):
            s.line(f"dw{k}", [[p[0] - 30, p[1]], p])
            s.text(f"dl{k}", p[0] - 34, p[1], lab, 13, anchor="end", mono=True)
        s.line("dk", [[400, 105], [520, 105], [520, gp3[0][1]], gp3[0]])
        s.text("dkl", 396, 105, "K", 13, anchor="end", mono=True)
        s.line("o1", [go1, [510, go1[1]], [510, gp3[1][1]], gp3[1]])
        s.line("o2", [go2, [510, go2[1]], [510, gp3[2][1]], gp3[2]])
        s.line("wc", [go3, [626, go3[1]]])
        s.text("cout", 630, go3[1], "Cout", 14, anchor="start", mono=True, weight="bold")
        s.line("wcor", [[612, go3[1]], [612, 278], [320, 278]])
        s.text("corr", 470, 266, "adds 0 Cout Cout 0", 13, anchor="middle", mono=True)
        s.box("add2", *a2, label="4-bit binary adder", size=14)
        s.line("wo", [[190, 306], [190, 322]])
        s.text("out", 190, 336, "BCD digit = ?", 14, anchor="middle", mono=True, weight="bold")
    else:
        a1 = (40, 64, 280, 50)
        a2 = (40, 340, 280, 50)
        s.text("in", 180, 48, "A=0000 B=0000 cin=0", 12, anchor="middle", mono=True)
        s.box("add1", *a1, label="4-bit binary adder", size=13)
        s.line("wz", [[70, 114], [70, 340]])
        s.text("zt", 80, 134, "K Z = ?", 12, anchor="start", mono=True, weight="bold")
        gp1, go1 = s.gate("d1", 160, 160, 44, 36, "and")
        gp2, go2 = s.gate("d2", 160, 214, 44, 36, "and")
        gp3, go3 = s.gate("d3", 250, 176, 46, 54, "or", inputs=3)
        for k, (p, lab) in enumerate([(gp1[0], "Z3"), (gp1[1], "Z2"), (gp2[0], "Z3"), (gp2[1], "Z1")]):
            s.line(f"dw{k}", [[p[0] - 24, p[1]], p])
            s.text(f"dl{k}", p[0] - 28, p[1], lab, 12, anchor="end", mono=True)
        s.line("dk", [[150, 150], [236, 150], [236, gp3[0][1]], gp3[0]])
        s.text("dkl", 146, 150, "K", 12, anchor="end", mono=True)
        s.line("o1", [go1, [228, go1[1]], [228, gp3[1][1]], gp3[1]])
        s.line("o2", [go2, [228, go2[1]], [228, gp3[2][1]], gp3[2]])
        s.line("wc", [go3, [318, go3[1]]])
        s.text("cout", 340, 164, "Cout", 12, anchor="end", mono=True, weight="bold")
        s.line("wcor", [[306, go3[1]], [306, 340]])
        s.text("corr", 230, 300, "adds 0 C C 0", 12, anchor="middle", mono=True)
        s.box("add2", *a2, label="4-bit binary adder", size=13)
        s.line("wo", [[180, 390], [180, 404]])
        s.text("out", 180, 418, "BCD digit = ?", 12, anchor="middle", mono=True, weight="bold")
    s.step("Stage 1: an ordinary 4-bit adder adds the two BCD digits and the carry in. Its result K Z3 Z2 Z1 Z0 can be 0 … 19.")
    s.step("The detector fires when that binary sum is 10 or more: K = 1 (16–19) or Z = 1010 … 1111 (Z3Z2 or Z3Z1).",
           ("d1", {"tone": "accent"}), ("d2", {"tone": "accent"}), ("d3", {"tone": "accent"}))
    for a, b, c in cases:
        v = cl.evaluate(net, al.env_of(4, a, b, c))
        z, k = al.word(v, "z", 4), v["k4"]
        C = v["Cout"]
        digit = al.word(v, "s", 4)
        assert 10 * C + digit == a + b + c and C == int(16 * k + z >= 10)
        d32, d31 = v["d32"], v["d31"]
        pats = [("in", {"text": s.v(f"A = {a:04b}, B = {b:04b}, cin = {c}", f"A={a:04b} B={b:04b} cin={c}")}),
                ("zt", {"text": f"K Z = {k} {z:04b}", "tone": "accent"}),
                ("dkl", {"text": f"K={k}", "tone": tv(k)}), ("dk", {"tone": tv(k)}),
                ("dl0", {"text": f"Z3={z >> 3 & 1}", "tone": tv(z >> 3 & 1)}), ("dl1", {"text": f"Z2={z >> 2 & 1}", "tone": tv(z >> 2 & 1)}),
                ("dl2", {"text": f"Z3={z >> 3 & 1}", "tone": tv(z >> 3 & 1)}), ("dl3", {"text": f"Z1={z >> 1 & 1}", "tone": tv(z >> 1 & 1)}),
                ("o1", {"tone": tv(d32)}), ("o2", {"tone": tv(d31)}), ("d1", {"tone": "ink"}), ("d2", {"tone": "ink"}),
                ("d3", {"tone": "accent" if C else "ink"}), ("wc", {"tone": tv(C)}), ("wcor", {"tone": tv(C)}),
                ("cout", {"text": f"Cout={C}", "tone": tv(C)}),
                ("corr", {"text": s.v(f"adds 0{C}{C}0", f"adds 0{C}{C}0"), "tone": "accent" if C else "muted"}),
                ("out", {"text": f"digit {digit:04b} = {digit}, carry {C}", "tone": "success"})]
        if C and k:
            why = f"K = 1 (sum {16 * k + z} > 15) though Z = {z:04b} looks valid: only K catches it."
        elif C:
            why = f"Z = {z:04b} = {z} is not a BCD digit (Z3 = 1 with Z2 or Z1)."
        else:
            why = f"{z:04b} = {z} is a valid digit, so nothing is added."
        s.step(f"{a} + {b}" + (f" + {c}" if c else "") + f" = {a + b + c}: adder 1 gives {k} {z:04b}. " + why + f" Out: carry {C}, digit {digit}.", *pats)
    return s.done("A one-digit BCD adder with its correction detector", (W, 350), (NW, 430),
                  "Two 4-bit binary adders. The first adds the digits; a detector K + Z3Z2 + Z3Z1 decides whether the sum exceeds 9; the second adds 0110 when it does. The detector's output is the decimal carry.")


# ── Lesson 4: multipliers ──────────────────────────────────────────────────

def array_critical_path(n):
    """Cells (row i, bit j) on the critical path of arithlib.array_multiplier(n), in order, with the
    time the path leaves each cell, and the overall delay."""
    net = al.array_multiplier(n)
    ins = [f"a{j}" for j in range(n)] + [f"b{j}" for j in range(n)]
    t = al.arrival(net, ins)
    src = {x[0]: x for x in net}
    out = max((f"P{k}" for k in range(2 * n)), key=lambda x: t[x])
    seq, x = [], out
    while x in src:
        seq.append(x)
        x = max((a.lstrip("~") for a in src[x][2]), key=lambda a: t.get(a, 0))
    seq.reverse()
    cells = []
    for name in seq:
        import re as _re
        m = _re.fullmatch(r"[pgt]m(\d+)_(\d+)", name) or _re.fullmatch(r"r(\d+)_(\d+)", name)
        k = _re.fullmatch(r"k(\d+)_(\d+)", name)
        if k:
            cell = (int(k.group(1)), int(k.group(2)) - 1)
        elif m:
            cell = (int(m.group(1)), int(m.group(2)))
        else:
            continue
        if cells and cells[-1][0] == cell:
            cells[-1] = (cell, t[name])
        else:
            cells.append((cell, t[name]))
    return cells, t[out], out


@scene
def array_multiplier_grid(L):
    s = S(L)
    W, NW = 700, 360
    n = 4
    cells, T, out = array_critical_path(n)
    assert T == 18 == 6 * (n - 1) and out == "P7"
    assert [c for c, _ in cells] == [(1, 0), (1, 1), (1, 2), (1, 3), (2, 2), (2, 3), (3, 2), (3, 3)]
    assert [tt for _, tt in cells] == [4, 6, 8, 9, 12, 13, 16, 18]
    A, B = 0b1011, 0b1101
    v = cl.evaluate(al.array_multiplier(n), {**{f"a{j}": A >> j & 1 for j in range(n)}, **{f"b{j}": B >> j & 1 for j in range(n)}})
    assert al.word(v, "P", 2 * n) == A * B == 143
    s.head("A 4 × 4 array multiplier and its critical path", "4 × 4 array multiplier", W, NW)
    s.text("clk", s.v(W - 20, NW - 12), s.v(46, 46), "t = 0", s.v(16, 14), anchor="end", weight="bold", mono=True, tone="accent")
    cw, ch = s.v(66, 42), s.v(50, 46)
    X = lambda w: s.v(520 - 76 * (w - 1), 290 - 48 * (w - 1))  # noqa: E731
    Y = lambda i: s.v(110 + 90 * (i - 1), 100 + 90 * (i - 1))  # noqa: E731
    s.text("pp", s.v(W / 2, NW / 2), s.v(72, 66), s.v("16 AND gates make every partial product a_j b_i at t = 1", "16 ANDs: a_j b_i at t = 1"),
           s.v(14, 12), anchor="middle", tone="muted")
    for i in range(1, n):
        for j in range(n):
            w = i + j
            x, y = X(w), Y(i)
            s.box(f"c{i}{j}", x, y, cw, ch, label="FA", size=s.v(14, 12), mono=True)
            if j < n - 1:
                s.line(f"h{i}{j}", [[x, y + ch / 2], [X(w + 1) + cw, y + ch / 2]])
            if i < n - 1 and j >= 1:
                s.line(f"v{i}{j}", [[x + cw / 2, y + ch], [x + cw / 2, Y(i + 1)]])
        x0 = X(i) + cw
        s.text(f"P{i}", x0 + 4, Y(i) + ch / 2, f"P{i}", s.v(13, 12), anchor="start", mono=True, tone="muted")
    s.text("P0", X(1) + cw + 4, s.v(92, 86), "P0", s.v(13, 12), anchor="start", mono=True, tone="muted")
    for j in range(1, n):
        s.text(f"Q{3 + j}", X(3 + j) + cw / 2, Y(3) + ch + 16, f"P{3 + j}", s.v(13, 12), anchor="middle", mono=True, tone="muted")
    s.text("P7", X(6) - 4, Y(3) + ch / 2, "P7", s.v(13, 12), anchor="end", mono=True, tone="muted")
    s.text("res", s.v(W / 2, NW / 2), s.v(372, 362), "", s.v(14, 12), anchor="middle", weight="bold")
    s.step("t = 1: all 16 partial products a_j·b_i are ready at once (one AND level). Row i of adders adds row i of them to the running sum.",
           ("pp", {"tone": "success"}), ("clk", {"text": "t = 1"}))
    names = {(1, 0): "row 1 starts: its first cell", (1, 3): "row 1's last cell", (2, 2): "row 2", (3, 2): "row 3"}
    prev = None
    for k, ((i, j), tt) in enumerate(cells):
        pats = [("clk", {"text": f"t = {tt}"}), (f"c{i}{j}", {"label": str(tt), "fill": "success", "tone": "accent"})]
        if prev and prev[0] == i:
            pats.append((f"h{i}{prev[1]}", {"tone": "accent"}))
        elif prev:
            pats.append((f"v{prev[0]}{prev[1]}", {"tone": "accent"}))
        kind = "carry" if (k + 1 < len(cells) and cells[k + 1][0][0] == i) or k == len(cells) - 1 else "sum"
        where = f"row {i}, bit {j}"
        if k == 0:
            cap = f"t = {tt}: the carry ripples along row 1: cell ({where}) is done."
        elif kind == "sum":
            cap = f"t = {tt}: cell ({where}) passes its sum down to the next row (same weight, one row lower)."
        elif k == len(cells) - 1:
            cap = f"t = {tt}: the last carry leaves cell ({where}) as P7. Critical path: 8 cells, 18 gate delays = 6(n − 1)."
        else:
            cap = f"t = {tt}: the carry moves left inside row {i}: cell ({where}) is done."
        if k == len(cells) - 1:
            pats.append(("P7", {"tone": "accent"}))
            pats.append(("res", {"text": f"1011 × 1101 = {A * B}: P = {A * B:08b}", "tone": "success"}))
        s.step(cap, *pats)
        prev = (i, j)
    s.step("The path crosses each row and moves one row down per step: O(n) cells, so the delay is Θ(n) although there are n² cells.",
           ("res", {"text": "n² cells, Θ(n) delay", "tone": "accent"}))
    return s.done("The critical path through a 4 × 4 array multiplier", (W, 390), (NW, 380),
                  "Three rows of four full-adder cells, shifted one bit per row. Partial products feed every cell; sums go down, carries go left. The product bits P0 … P7 leave at the right and the bottom.")


@scene
def booth_datapath(L):
    s = S(L)
    W, NW = 700, 360
    import boothlib as bt
    n, m, q = 4, 6, 0b1101
    trace, prod = bt.booth_trace(m, q, n)
    assert al.tc(prod, 2 * n) == m * al.tc(q, n) == -18
    s.head("Booth multiplier hardware: 6 × (−3) in 4 bits", "Booth hardware: 6 × (−3)", W, NW)
    if s.wd:
        rM, rS, rA, rQ, rQ1 = (60, 64, 200, 44), (60, 146, 200, 44), (60, 230, 200, 44), (300, 230, 170, 44), (500, 230, 70, 44)
        ctl = (500, 146, 170, 44)
    else:
        rM, rS, rA, rQ, rQ1 = (20, 60, 200, 40), (20, 136, 200, 40), (20, 214, 150, 40), (180, 214, 110, 40), (300, 214, 50, 40)
        ctl = (236, 120, 114, 56)
    s.box("M", *rM, label="M = 00110", size=s.v(15, 12), mono=True)
    s.box("add", *rS, label="adder–subtractor", size=s.v(14, 12))
    s.box("A", *rA, label="A = 00000", size=s.v(15, 12), mono=True)
    s.box("Q", *rQ, label="Q = 1101", size=s.v(15, 12), mono=True)
    s.box("Q1", *rQ1, label="0", size=s.v(15, 12), mono=True)
    s.text("q1l", rQ1[0] + rQ1[2] / 2, rQ1[1] + rQ1[3] + 14, "Q−1", s.v(13, 12), anchor="middle", tone="muted")
    s.box("ctl", *ctl, label=s.v("control: Q0 Q−1", "Q0 Q−1"), size=s.v(14, 12))
    xm = rM[0] + rM[2] / 2
    s.line("wm", [[xm - 40, rM[1] + rM[3]], [xm - 40, rS[1]]])
    s.line("wa", [[xm + 40, rA[1]], [xm + 40, rS[1] + rS[3]]])
    s.line("wr", [[xm - 40, rS[1] + rS[3]], [xm - 40, rA[1]]])
    if s.wd:
        s.line("wq", [[rQ[0] + rQ[2] - 20, rQ[1]], [rQ[0] + rQ[2] - 20, 210], [550, 210], [550, ctl[1] + ctl[3]]])
        s.line("wq1", [[rQ1[0] + rQ1[2] / 2 + 20, rQ1[1]], [rQ1[0] + rQ1[2] / 2 + 20, ctl[1] + ctl[3]]])
        s.line("wk", [[ctl[0], ctl[1] + 22], [rS[0] + rS[2], rS[1] + 22]])
        s.text("op", 585, 110, "", 14, anchor="middle", weight="bold", mono=True)
        s.text("cyc", 60, 312, "", 14, anchor="start", weight="bold")
        s.text("note", 60, 340, "", 14, anchor="start")
    else:
        s.line("wq", [[rQ[0] + rQ[2] - 16, rQ[1]], [rQ[0] + rQ[2] - 16, 196], [270, 196], [270, ctl[1] + ctl[3]]])
        s.line("wq1", [[rQ1[0] + rQ1[2] / 2, rQ1[1]], [rQ1[0] + rQ1[2] / 2, ctl[1] + ctl[3]]])
        s.line("wk", [[ctl[0], ctl[1] + 28], [rS[0] + rS[2], ctl[1] + 28]])
        s.text("op", 293, 104, "", 12, anchor="middle", weight="bold", mono=True)
        s.text("cyc", 20, 290, "", 12, anchor="start", weight="bold")
        s.text("note", 20, 312, "", 12, anchor="start")
    w = n + 1
    s.step("Start: A = 0 (5 bits: one extra bit so that −M always fits), Q = multiplier −3 = 1101, Q−1 = 0, M = 6.",
           ("cyc", {"text": "cycle 0"}))
    A, Q, Q1 = 0, q, 0
    for k, (op, nA, nQ, nQ1) in enumerate(trace, 1):
        pair = f"{Q & 1}{Q1}"
        if op == "A − M":
            mid = (A - m) % 2 ** w
        elif op == "A + M":
            mid = (A + m) % 2 ** w
        else:
            mid = A
        what = {"A − M": "subtract M", "A + M": "add M", "none": "no add"}[op]
        s.step(f"Cycle {k}: Q0 Q−1 = {pair}, so {what}: A = {mid:0{w}b}.",
               ("op", {"text": op if op != "none" else "—", "tone": "accent" if op != "none" else "muted"}),
               ("ctl", {"tone": "accent"}), ("add", {"fill": "success" if op != "none" else "none"}), ("wk", {"tone": "accent" if op != "none" else "muted"}),
               ("A", {"label": f"A = {mid:0{w}b}"}), ("cyc", {"text": f"cycle {k}: {what}"}), ("note", {"text": ""}))
        s.step(f"Cycle {k}: arithmetic right shift of A, Q, Q−1 (A's sign bit is copied): A = {nA:0{w}b}, Q = {nQ:04b}, Q−1 = {nQ1}.",
               ("add", {"fill": "none"}), ("ctl", {"tone": "ink"}),
               ("A", {"label": f"A = {nA:0{w}b}"}), ("Q", {"label": f"Q = {nQ:04b}"}), ("Q1", {"label": str(nQ1)}),
               ("note", {"text": "shift right (arithmetic)"}))
        A, Q, Q1 = nA, nQ, nQ1
    s.step(f"After n = 4 cycles, A Q = {prod:08b} = −18 = 6 × (−3). One adder, n cycles, at most n additions or subtractions.",
           ("cyc", {"text": f"product {prod >> 4:04b} {prod & 15:04b} = −18", "tone": "success"}), ("note", {"text": ""}), ("op", {"text": ""}))
    return s.done("Booth multiplier datapath stepping through 6 × (−3)", (W, 360), (NW, 330),
                  "Registers M (multiplicand), A (accumulator, one extra bit), Q (multiplier) and the bit Q−1. The control looks at Q0 Q−1 and tells the adder–subtractor to add M, subtract M or do nothing; then A, Q, Q−1 shift right together.")


ORDER = ["half-adder-design", "full-adder-from-has", "ripple-carry-wave", "pipeline-adder",
         "rca-vs-cla-timing", "cla-gp-tree", "carry-select", "addsub-overflow", "bcd-adder-hw", "array-multiplier-grid", "booth-datapath"]


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
