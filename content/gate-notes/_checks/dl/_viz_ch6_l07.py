"""Chapter 6, Lesson 7 scenes (finite state machines: Mealy and Moore). Every state, output, arc,
waveform tick, converted bit and J/K entry is a seqlib computation (detector, FSM.run, to_moore,
excitation, Sync), so no value or caption number can drift from the checked maths."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import seqlib as sq  # noqa: E402
from _viz_ch6_base import S, graph, light_edge, scene, tv, waveform  # noqa: E402
from _viz_ch6_l02 import rows_panel, show_all  # noqa: E402

B = sq.bstr


def X(s):
    return [int(c) for c in s]


# ── mealy-moore-timing: the 101 detector as Mealy and as Moore ─────────────

P = 4  # ticks per clock period; edge k (closing period k) is at tick P·k


def timing_model():
    """Tick-by-tick model: x_k is applied one tick after edge k − 1 and sampled at edge k; period 8
    carries a one-tick spike on x. Returns ticks, clk, x, Mealy and Moore outputs and the states."""
    xs = [1, 0, 1, 1, 0, 1, 0, 0, 0]
    me, mo = sq.detector("101"), sq.detector("101", moore=True)
    rm, ro = me.run(xs[:-1]), mo.run(xs[:-1])
    n = len(xs)
    T = P * n + 1
    clk = [1 if t % P < 2 else 0 for t in range(T)]
    clk[0] = clk[1] = 0
    x = []
    for t in range(T):
        k = max(1, (t - 1) // P + 1)  # the period whose input is on the wire at tick t
        x.append(xs[min(k, n) - 1])
    spike = P * 7 + 2  # period 8, while the machine is in S2
    x[spike] = 1
    st_me = [rm["states"][min(t // P, n - 1)] for t in range(T)]
    st_mo = [ro["states"][min(t // P, n - 1)] for t in range(T)]
    z_me = [me.o(st_me[t], x[t]) for t in range(T)]
    z_mo = [mo.out[st_mo[t]] for t in range(T)]
    return dict(xs=xs, T=T, clk=clk, x=x, z_me=z_me, z_mo=z_mo, st_me=st_me, st_mo=st_mo, rm=rm, ro=ro, spike=spike, n=n)


@scene
def mealy_moore_timing(L):
    """The overlapping 101 detector built as a Mealy machine (3 states) and as a Moore machine (4
    states) on the same input waveform: the Mealy output is high in the period of the last 1, the
    Moore output one period later; a spike on x shows up on the Mealy output only."""
    s = S(L)
    W, NW = 680, 360
    m = timing_model()
    xs, T, n = m["xs"], m["T"], m["n"]
    assert m["rm"]["outs"] == m["ro"]["outs"] == sq.detects_ref("101", xs[:-1]) == [0, 0, 1, 0, 0, 1, 0, 0]
    # Mealy: high during periods 3 and 6 (ticks after x settles); Moore: periods 4 and 7
    hi_me = sorted({t // P + 1 for t in range(T) if m["z_me"][t] and t != m["spike"]})
    hi_mo = sorted({t // P + 1 for t in range(T) if m["z_mo"][t]})
    assert hi_me == [3, 6] and hi_mo == [4, 7] and m["z_me"][m["spike"]] == 1 and m["z_mo"][m["spike"]] == 0
    assert m["st_me"][m["spike"]] == 2
    s.head("Mealy and Moore 101 detectors on the same input", "Mealy vs Moore output timing", W, NW)
    x0, dx = s.v(118, 68), s.v(15.2, 7.6)
    h, gap = s.v(18, 16), s.v(46, 44)
    y0 = s.v(92, 92)
    groups = [(P * (k - 1), P * k if k < n else T) for k in range(1, n + 1)]
    rows = [("c", "CLK", m["clk"], "ink"), ("x", "x", m["x"], "ink"), ("me", "z Mealy", m["z_me"], "accent"), ("mo", "z Moore", m["z_mo"], "accent")]
    ids, ys = rows_panel(s, "w", rows, x0, y0, dx, h, gap, groups, s.v(13, 12))
    # state rows under each output row
    sy_me, sy_mo = ys["me"] + h + s.v(13, 12), ys["mo"] + h + s.v(13, 12)
    for k in range(1, n + 1):
        cx = x0 + (P * (k - 1) + P / 2 + 0.5) * dx
        s.text(f"sme{k}", cx, sy_me, f"S{m['rm']['states'][k - 1]}", s.v(13, 12), anchor="middle", mono=True, tone="muted", hidden=True)
        s.text(f"smo{k}", cx, sy_mo, f"S{m['ro']['states'][k - 1]}", s.v(13, 12), anchor="middle", mono=True, tone="muted", hidden=True)
        s.text(f"xb{k}", cx, ys["x"] - s.v(11, 10), str(xs[k - 1]), s.v(13, 12), anchor="middle", mono=True, weight="bold", hidden=True)
    ytop, ybot = y0 - 8, sy_mo + 10
    for k in range(1, n + 1):
        xe = x0 + P * k * dx
        s.line(f"e{k}", [[xe, ytop], [xe, ybot]], dashed=True, tone="muted", hidden=True)
    s.text("st", s.v(W / 2, NW / 2), ybot + 24, "", s.v(14, 12), anchor="middle", weight="bold")
    s.text("st2", s.v(W / 2, NW / 2), ybot + 46, "", s.v(13, 12), anchor="middle", tone="muted")
    s.step("One clock, one input x (applied just after each rising edge). Above: the Mealy 101 detector (3 states); below: the Moore one (4 states).",
           ("st", {"text": "input 1 0 1 1 0 1 0 0, then 0"}), ("st2", {"text": "both start in S0"}))
    for k in range(1, n + 1):
        sm, so = m["rm"]["states"][k - 1], m["ro"]["states"][k - 1]
        zm = m["rm"]["outs"][k - 1] if k <= len(m["rm"]["outs"]) else 0
        zo = m["ro"]["outs"][k - 2] if k >= 2 else 0
        pats = show_all(ids, k - 1) + [(f"sme{k}", {"hidden": False}), (f"smo{k}", {"hidden": False}), (f"xb{k}", {"hidden": False}),
                                   (f"e{k}", {"hidden": False, "tone": "accent"})]
        if k > 1:
            pats.append((f"e{k - 1}", {"tone": "muted"}))
        if k in (3, 6):
            cap = f"Period {k}: in S{sm} the input 1 completes 101. The Mealy output goes high now, inside this period, before edge {k}."
            tone = "accent"
        elif k in (4, 7):
            cap = f"Period {k}: the Moore machine entered S3 at edge {k - 1}, so its output is high for this whole period: one clock after the Mealy output."
            tone = "accent"
        elif k == 8:
            cap = "Period 8, in S2: a spike on x makes the Mealy output pulse. Edge 8 samples x = 0, so the state ignores it; the Moore output stays 0."
            tone = "danger"
        else:
            cap = f"Period {k}: x = {xs[k - 1]}. Mealy in S{sm}, Moore in S{so}; no 101 has just ended, so both outputs are 0."
            tone = "ink"
        assert len(cap) <= 140, (len(cap), cap)
        pats += [("st", {"text": f"period {k}: x = {xs[k - 1]}, z Mealy = {zm}, z Moore = {zo}", "tone": tone}),
                 ("st2", {"text": f"Mealy S{sm}, Moore S{so}"})]
        if k == 8:
            pats += [(i, {"tone": "danger"}) for i in ids["me"][k - 1]]
        s.step(cap, *pats)
    s.step("Same sequence, two timings: the Mealy output marks the period in which the last 1 arrives; the Moore output, the period after it.",
           ("st", {"text": "Mealy: periods 3, 6. Moore: periods 4, 7", "tone": "accent"}), ("st2", {"text": "Mealy: 3 states, Moore: 4 states"}),
           (f"e{n}", {"tone": "muted"}))
    return s.done("Mealy and Moore output timing", (W, ybot + 64), (NW, ybot + 64),
                  "The overlapping 101 detector built twice, as a 3-state Mealy machine and a 4-state Moore machine, on one clock and one input x. "
                  "Each step reveals one clock period; dashed lines are the rising edges; the state in each period is printed under its output.")


# ── sequence-detector: the overlapping 101 Mealy graph on 1101011 ──────────

@scene
def sequence_detector(L):
    """The overlapping 101 Mealy detector fed 1101011 one bit per step."""
    s = S(L)
    W, NW = 680, 360
    d = sq.detector("101")
    inp = X("1101011")
    r = d.run(inp)
    assert r["outs"] == sq.detects_ref("101", inp) == [0, 0, 0, 1, 0, 1, 0] and r["states"] == [0, 1, 1, 2, 1, 2, 1, 1]
    arcs = [(0, 0), (0, 1), (1, 1), (1, 0), (2, 1), (2, 0)]  # (state, input) per drawn edge
    s.head("The overlapping 101 detector (Mealy) reading 1101011", "101 detector reading 1101011", W, NW)
    r_ = s.v(30, 26)
    if s.wd:
        pos = {0: (150, 170), 1: (340, 170), 2: (530, 170)}
    else:
        pos = {0: (80, 128), 1: (280, 128), 2: (180, 276)}
    meaning = {0: "S0", 1: "S1", 2: "S2"}
    nodes = {k: (x, y, meaning[k]) for k, (x, y) in pos.items()}
    lab = {k: f"{k}/{d.out[(st, k)]}" for st in range(3) for k in (0, 1)}
    if s.wd:
        geo = {(0, 0): dict(side="top", lx=150, ly=102), (0, 1): dict(curve=0, lx=245, ly=156),
               (1, 1): dict(side="top", lx=340, ly=102), (1, 0): dict(curve=-0.3, lx=435, ly=136),
               (2, 1): dict(curve=-0.3, lx=435, ly=206), (2, 0): dict(curve=-0.6, lx=340, ly=258)}
    else:
        geo = {(0, 0): dict(side="top", lx=80, ly=66), (0, 1): dict(curve=0, lx=180, ly=114),
               (1, 1): dict(side="top", lx=280, ly=66), (1, 0): dict(curve=0.3, lx=194, ly=180),
               (2, 1): dict(curve=0.3, lx=268, ly=224), (2, 0): dict(curve=0, lx=106, ly=214)}
    edges = []
    for st, x in arcs:
        e = dict(a=st, b=d.delta[(st, x)], label=f"{x}/{d.o(st, x)}", **geo[(st, x)])
        edges.append(e)
    assert [(e["a"], e["b"]) for e in edges] == [(0, 0), (0, 1), (1, 1), (1, 2), (2, 1), (2, 0)]
    del lab
    g = graph(s, "g", nodes, r_, edges, size=s.v(15, 13))
    # tape
    ty = s.v(310, 360)
    cw = s.v(40, 36)
    tx = s.v(W / 2, NW / 2) - 3.5 * cw + s.v(40, 26)
    s.text("tin", tx - 10, ty, "in", s.v(13, 12), anchor="end", mono=True, weight="bold")
    s.text("tout", tx - 10, ty + 30, "out", s.v(13, 12), anchor="end", mono=True, weight="bold")
    for i, b in enumerate(inp):
        s.text(f"i{i}", tx + (i + 0.5) * cw, ty, str(b), s.v(16, 14), anchor="middle", mono=True, weight="bold", tone="muted")
        s.text(f"o{i}", tx + (i + 0.5) * cw, ty + 30, "·", s.v(16, 14), anchor="middle", mono=True, tone="muted")
    s.text("st", s.v(W / 2, NW / 2), ty + 66, "", s.v(14, 12), anchor="middle", weight="bold")
    s.step("S0: no useful prefix seen. S1: the input ends in 1. S2: it ends in 10. A 1 from S2 completes 101 and outputs 1.",
           (g["nodes"][0], {"tone": "accent"}), ("st", {"text": "start in S0"}))
    for k, b in enumerate(inp):
        a, t = r["states"][k], r["states"][k + 1]
        ei = arcs.index((a, b))
        z = r["outs"][k]
        pats = light_edge(g, ei, "success" if z else "accent") + [(g["nodes"][a], {"tone": "ink"}), (g["nodes"][t], {"tone": "accent"})]
        if k:
            pi = arcs.index((r["states"][k - 1], inp[k - 1]))
            if pi != ei:
                pats += light_edge(g, pi, "muted")
        pats += [(f"i{k}", {"tone": "accent"}), (f"o{k}", {"text": str(z), "tone": "success" if z else "muted"})]
        if k:
            pats += [(f"i{k - 1}", {"tone": "ink"})]
        if z:
            cap = f"Bit {k + 1} = {b} from S{a}: 101 is complete, output 1. Go to S{t}: the final 1 can start the next 101 (overlap)."
        elif a == 1 and b == 1:
            cap = f"Bit {k + 1} = 1 from S1: 11 still ends in 1, so stay in S1 (the longest suffix that is a prefix of 101 is 1). Output 0."
        else:
            cap = f"Bit {k + 1} = {b}: S{a} → S{t}, output {z}. The input now ends in {'1' if t == 1 else '10' if t == 2 else 'no prefix of 101'}."
        assert len(cap) <= 140, (len(cap), cap)
        pats.append(("st", {"text": f"after {''.join(map(str, inp[:k + 1]))}: S{t}, output {z}", "tone": "success" if z else "accent"}))
        s.step(cap, *pats)
    s.step("Output 0001010: a 1 at bits 4 and 6, the two (overlapping) places where 101 ends. Three states were enough for a 3-bit pattern.",
           ("st", {"text": "1101011 → 0001010", "tone": "success"}), (f"i{len(inp) - 1}", {"tone": "ink"}))
    return s.done("A 101 sequence detector reading 1101011", (W, ty + 86), (NW, ty + 86),
                  "State graph of the overlapping 101 detector as a Mealy machine: arcs are labelled input/output. Below, the input string and "
                  "the output produced so far. Each step feeds one bit; the arc taken is highlighted.")


# ── serial-twos-complement: the 2005 machine on 0110100, LSB first ─────────

F05 = sq.FSM.from_table({"Q0": ("Q0", "Q1", 0, 1), "Q1": ("Q1", "Q1", 1, 0)})


@scene
def serial_twos_complement(L):
    """GATE 2005: copy up to and including the first 1, then complement; 0110100 (52) LSB first."""
    s = S(L)
    W, NW = 680, 360
    word = "0110100"
    nb = len(word)
    v = int(word, 2)
    lsb = [int(c) for c in reversed(word)]
    r = F05.run(lsb)
    out = "".join(map(str, reversed(r["outs"])))
    assert v == 52 and out == "1001100" and int(out, 2) == 2 ** nb - v == 76
    s.head("Serial 2's complement, LSB first (GATE 2005)", "Serial 2's complement (2005)", W, NW)
    r_ = s.v(30, 26)
    pos = {"Q0": (s.v(220, 90), s.v(150, 140)), "Q1": (s.v(460, 270), s.v(150, 140))}
    nodes = {k: (x, y, k) for k, (x, y) in pos.items()}
    edges = [dict(a="Q0", b="Q0", side="top", lx=pos["Q0"][0], ly=pos["Q0"][1] - s.v(70, 64), label="0/0"),
             dict(a="Q0", b="Q1", curve=0, lx=(pos["Q0"][0] + pos["Q1"][0]) / 2, ly=pos["Q0"][1] - 14, label="1/1"),
             dict(a="Q1", b="Q1", side="top", lx=pos["Q1"][0], ly=pos["Q1"][1] - s.v(70, 64), label="0/1, 1/0")]
    g = graph(s, "g", nodes, r_, edges, size=s.v(15, 13))
    s.text("q0m", pos["Q0"][0], pos["Q0"][1] + r_ + 18, "copy", s.v(13, 12), anchor="middle", tone="muted")
    s.text("q1m", pos["Q1"][0], pos["Q1"][1] + r_ + 18, "complement", s.v(13, 12), anchor="middle", tone="muted")
    cw = s.v(40, 34)
    tx = s.v(W / 2, NW / 2) - nb * cw / 2 + s.v(20, 18)
    ty = s.v(260, 250)
    s.text("lin", tx - 8, ty, "x", s.v(14, 12), anchor="end", mono=True, weight="bold")
    s.text("lout", tx - 8, ty + 32, "z", s.v(14, 12), anchor="end", mono=True, weight="bold")
    for i, c in enumerate(word):
        s.text(f"i{i}", tx + (i + 0.5) * cw, ty, c, s.v(17, 15), anchor="middle", mono=True, weight="bold", tone="muted")
        s.text(f"o{i}", tx + (i + 0.5) * cw, ty + 32, "·", s.v(17, 15), anchor="middle", mono=True, tone="muted")
    s.text("arr", tx + nb * cw / 2, ty - s.v(26, 24), "bits enter from the right (LSB first) ←", s.v(13, 12), anchor="middle", tone="muted")
    s.text("st", s.v(W / 2, NW / 2), ty + 70, "", s.v(14, 12), anchor="middle", weight="bold")
    s.step(f"The number {word} = {v} is fed LSB first. Q0 copies bits; the first 1 is copied too and moves the machine to Q1, which complements.",
           (g["nodes"]["Q0"], {"tone": "accent"}), ("st", {"text": "start in Q0"}))
    for k, b in enumerate(lsb):
        a, t = r["states"][k], r["states"][k + 1]
        z = r["outs"][k]
        col = nb - 1 - k
        ei = 0 if (a, b) == ("Q0", 0) else 1 if a == "Q0" else 2
        pats = light_edge(g, ei) + [(g["nodes"][a], {"tone": "ink"}), (g["nodes"][t], {"tone": "accent"}),
                                     (f"i{col}", {"tone": "accent"}), (f"o{col}", {"text": str(z), "tone": tv(z)})]
        if k:
            pats.append((f"i{col + 1}", {"tone": "ink"}))
            pk = 0 if (r["states"][k - 1], lsb[k - 1]) == ("Q0", 0) else 1 if r["states"][k - 1] == "Q0" else 2
            if pk != ei:
                pats += light_edge(g, pk, "muted")
        if a == "Q0" and b == 0:
            cap = f"Bit {k + 1} (weight {2 ** k}) = 0 in Q0: copied, z = 0. Trailing zeros of a number are trailing zeros of its 2's complement."
        elif a == "Q0":
            cap = f"Bit {k + 1} = 1, the first 1: copied (z = 1) and the machine moves to Q1. Every later bit will be inverted."
        else:
            cap = f"Bit {k + 1} = {b} in Q1: complemented, z = {z}."
        assert len(cap) <= 140, (len(cap), cap)
        pats.append(("st", {"text": f"z so far: {''.join(map(str, reversed(r['outs'][:k + 1])))}", "tone": "accent"}))
        s.step(cap, *pats)
    s.step(f"Result {out} = {int(out, 2)} = 128 − 52: the 7-bit 2's complement of {v}. Copy up to the first 1, then complement: that is −x.",
           ("st", {"text": f"{word} ({v}) → {out} ({int(out, 2)} = 2⁷ − {v})", "tone": "success"}))
    return s.done("A serial 2's complementer converting 0110100", (W, ty + 92), (NW, ty + 92),
                  "The two-state Mealy machine of GATE 2005 (arcs input/output): Q0 copies, Q1 complements. Below, a 7-bit number entering "
                  "least significant bit first and the output bits as they are produced.")


# ── fsm-to-circuit: the GATE 2001 copy/complement machine with JK ──────────

F01 = sq.FSM.from_table({"A": ("B", "A", 0, 1), "B": ("C", "A", 0, 1), "C": ("C", "D", 1, 0), "D": ("C", "A", 1, 0)})
ASSIGN01 = {"A": (0, 0), "B": (0, 1), "C": (1, 0), "D": (1, 1)}


def jk_rows():
    """Rows (Q1, Q0, x, Q1+, Q0+, z, J1, K1, J0, K0) of the 2001 machine with A=00, B=01, C=10, D=11."""
    inv = {v: k for k, v in ASSIGN01.items()}
    rows = []
    for q1 in (0, 1):
        for q0 in (0, 1):
            for x in (0, 1):
                st = inv[(q1, q0)]
                n1, n0 = ASSIGN01[F01.delta[(st, x)]]
                e1, e0 = sq.excitation("JK", q1, n1), sq.excitation("JK", q0, n0)
                rows.append((q1, q0, x, n1, n0, F01.o(st, x), e1["J"], e1["K"], e0["J"], e0["K"]))
    return rows


@scene
def fsm_to_circuit(L):
    """State table → assignment → bit table → J/K columns → equations, for the GATE 2001 machine."""
    s = S(L)
    W, NW = 680, 360
    rows = jk_rows()
    s.head("From state table to JK equations (GATE 2001 machine)", "2001 machine → JK equations", W, NW)
    # symbolic table
    scw, sch = s.v(62, 62), s.v(25, 24)
    sx, sy = s.v(14, (NW - 3 * 62) / 2), 50
    sym = [["state", "x = 0", "x = 1"]] + [[st, f"{F01.delta[(st, 0)]}/{F01.o(st, 0)}", f"{F01.delta[(st, 1)]}/{F01.o(st, 1)}"] for st in "ABCD"]
    s.table("sym", sx, sy, scw, sch, sym)
    s.text("symt", sx + 1.5 * scw, sy + 5 * sch + 16, "", s.v(13, 12), anchor="middle", mono=True, tone="muted")
    # bit table
    bcw, bch = s.v(50, 40), s.v(24, 22)
    bx, by = s.v(220, (NW - 8 * 40) / 2), s.v(50, sy + 5 * sch + 40)
    head = ["PS", "x", "NS", "z", "J1", "K1", "J0", "K0"]
    cell = lambda v: "×" if v == "x" else str(v)  # noqa: E731
    full = [head] + [[f"{a}{b}", str(x), f"{n1}{n0}", str(z), cell(j1), cell(k1), cell(j0), cell(k0)]
                     for a, b, x, n1, n0, z, j1, k1, j0, k0 in rows]
    blank = [head] + [[f"{a}{b}", str(x), "", "", "", "", "", ""] for a, b, x, *_ in rows]
    s.table("bt", bx, by, bcw, bch, blank, hidden=True)
    ey = by + 9 * bch + s.v(30, 28)
    ex = s.v(bx + 4 * bcw, NW / 2)
    lh = s.v(24, 22)
    eqs = ["J1 = Q0x′,  K1 = Q0x", "J0 = Q1x + Q1′x′,  K0 = 1", "z = x ⊕ Q1"]
    for i, t in enumerate(eqs):
        s.text(f"eq{i}", ex, ey + i * lh, t, s.v(15, 13), anchor="middle", mono=True, weight="bold", hidden=True)
    s.text("st", s.v(W / 2, NW / 2), ey + 3 * lh + 14, "", s.v(14, 12), anchor="middle", weight="bold")
    s.step("The 2001 machine: A, B copy the input, C, D complement it. B remembers 'last bit 0', D 'last bit 1'. Arcs are next/output.",
           ("st", {"text": "4 states → 2 flip-flops Q1Q0"}))
    s.step("Assign A = 00, B = 01, C = 10, D = 11: Q1 is the mode (0 copy, 1 complement), Q0 the 'one more of the same bit ends the mode' flag.",
           ("symt", {"text": "A=00 B=01 C=10 D=11"}), ("bt", {"hidden": False}), ("st", {"text": "Q1 = mode, Q0 = flag", "tone": "accent"}))
    part = [list(r) for r in blank]
    for blk in range(2):
        for i in range(4 * blk, 4 * blk + 4):
            part[i + 1][2], part[i + 1][3] = full[i + 1][2], full[i + 1][3]
        which = "A (00) and B (01)" if blk == 0 else "C (10) and D (11)"
        cap = f"Rewrite the rows of {which} in bits: next state NS and output z read straight from the state table."
        s.step(cap, ("bt", {"rows": [list(r) for r in part], "highlight": [[i + 1, c] for i in range(4 * blk, 4 * blk + 4) for c in (2, 3)]}),
               ("st", {"text": "NS and z filled", "tone": "ink"}))
    for i in range(8):
        part[i + 1][4], part[i + 1][5] = full[i + 1][4], full[i + 1][5]
    j1 = [i for i, r in enumerate(rows) if r[6] == 1]
    k1 = [i for i, r in enumerate(rows) if r[7] == 1]
    assert [rows[i][:3] for i in j1] == [(0, 1, 0)] and [rows[i][:3] for i in k1] == [(1, 1, 1)]
    s.step("J1, K1 from the JK excitation table: J1 matters only where Q1 = 0, K1 only where Q1 = 1. The single 1s give J1 = Q0x′, K1 = Q0x.",
           ("bt", {"rows": [list(r) for r in part], "highlight": [[i + 1, 4] for i in j1] + [[i + 1, 5] for i in k1]}),
           ("eq0", {"hidden": False}), ("st", {"text": "J1 = Q0x′, K1 = Q0x", "tone": "accent"}))
    for i in range(8):
        part[i + 1][6], part[i + 1][7] = full[i + 1][6], full[i + 1][7]
    j0 = [i for i, r in enumerate(rows) if r[8] == 1]
    assert [rows[i][:3] for i in j0] == [(0, 0, 0), (1, 0, 1)] and all(r[9] in (1, "x") for r in rows)
    s.step("J0 is 1 in rows 00 with x = 0 and 10 with x = 1: J0 = Q1x + Q1′x′ (Q1 XNOR x). Every K0 entry is 1 or ×, so K0 = 1.",
           ("bt", {"rows": [list(r) for r in part], "highlight": [[i + 1, 6] for i in j0] + [[i + 1, 7] for i in range(8)]}),
           ("eq1", {"hidden": False}), ("st", {"text": "J0 = Q1x + Q1′x′, K0 = 1", "tone": "accent"}))
    zs = [i for i, r in enumerate(rows) if r[5] == 1]
    s.step("Output: z = x in the copy mode (Q1 = 0) and x′ in the complement mode (Q1 = 1), so z = x ⊕ Q1. It depends on x: a Mealy output.",
           ("bt", {"highlight": [[i + 1, 3] for i in zs]}), ("eq2", {"hidden": False}), ("st", {"text": "z = x ⊕ Q1", "tone": "accent"}))
    c = sq.Sync([("Q1", "JK", {"J": lambda e: e["Q0"] & (1 - e["x"]), "K": lambda e: e["Q0"] & e["x"]}),
                 ("Q0", "JK", {"J": lambda e: (e["Q1"] & e["x"]) | ((1 - e["Q1"]) & (1 - e["x"])), "K": lambda e: 1})],
                outs={"z": lambda e: e["x"] ^ e["Q1"]}, inputs=("x",))
    ins = X("10110001001011011")
    st, zz = (0, 0), []
    for b in ins:
        zz.append(c.output(st, (b,))["z"])
        st = c.step(st, (b,))
    assert "".join(map(str, zz)) == "10110010110100011" == "".join(map(str, F01.run(ins)["outs"]))
    s.step("Check: the circuit, simulated on the 2001 example 101100 01001011 011, outputs 101100 10110100 011, exactly as asked.",
           ("bt", {"highlight": []}), ("st", {"text": "2 JK flip-flops, 2 AND, 1 XNOR, 1 XOR ✓", "tone": "success"}))
    h = ey + 3 * lh + 34
    return s.done("The GATE 2001 machine as a JK circuit", (W, h), (NW, h),
                  "Left (top on phones): the 4-state Mealy state table, entries next state/output. Right (below): the same table in bits after the "
                  "assignment A = 00, B = 01, C = 10, D = 11, with the JK excitation columns; the equations appear underneath.")
