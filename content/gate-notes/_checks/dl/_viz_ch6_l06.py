"""Chapter 6, Lesson 6 scenes (shift registers, ring and Johnson counters, LFSRs). Every register
content, serial output, state cycle and feedback bit is a seqlib computation (shift_right,
Sync, ring_step, johnson_step, register_cycle), so no value or caption number can drift from the
checked maths."""
import math
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import seqlib as sq  # noqa: E402
from _viz_ch6_base import S, scene, tv  # noqa: E402
from _viz_ch6_l03 import state_graph  # noqa: E402

B = sq.bstr


def dff_row(s, pid, names, x0, y, w, h, gap, size):
    """D flip-flops in a row: D on the left, Q on the right (same height), clock pin at the bottom.
    Returns (pins per stage, x of each block). The value of each stage is a text `{pid}v{i}` in the box."""
    pins, xs = [], []
    for i, nm in enumerate(names):
        x = x0 + i * (w + gap)
        P = s.block(f"{pid}{i}", x, y, w, h, left=["D"], right=["Q"], bottom=[">"], size=size)
        s.text(f"{pid}n{i}", x + w / 2, y - 12, nm, size, anchor="middle", mono=True, weight="bold")
        s.text(f"{pid}v{i}", x + w / 2, P["D"][1], "0", s.v(18, 16), anchor="middle", mono=True, weight="bold", tone="muted")
        pins.append(P)
        xs.append(x)
    return pins, xs


def clock_bus(s, pid, pins, xl, ybus, size):
    s.line(f"{pid}bus", [[xl, ybus], [pins[-1][">"][0], ybus]], tone="muted")
    for i, P in enumerate(pins):
        s.line(f"{pid}drop{i}", [[P[">"][0], ybus], list(P[">"])], tone="muted")
    s.text(f"{pid}lbl", xl, ybus + 14, "CLK (common)", size, anchor="start", mono=True, tone="muted")


def vals(pid, reg, hl=()):
    return [(f"{pid}v{i}", {"text": str(b), "tone": "accent" if i in hl else tv(b)}) for i, b in enumerate(reg)]


# ── shift-register-march ───────────────────────────────────────────────────

@scene
def shift_register_march(L):
    """A cleared 4-bit shift-right register receives 1011 LSB first (1, 1, 0, 1), then zeros."""
    s = S(L)
    W, NW = 680, 360
    n = 4
    word = [1, 1, 0, 1]
    ins = word + [0] * 4
    reg, states, outs = (0,) * n, [], []
    for d in ins:
        reg, o = sq.shift_right(reg, d)
        states.append(reg)
        outs.append(o)
    assert [B(x) for x in states] == ["1000", "1100", "0110", "1011", "0101", "0010", "0001", "0000"]
    # where the word's bits are: bit j (0-based, time order) sits in stage k − 1 − j after clock k
    pos = lambda k, j: k - 1 - j  # noqa: E731
    for k in range(1, 9):
        for j in range(4):
            if 0 <= pos(k, j) < n:
                assert states[k - 1][pos(k, j)] == word[j]
    so = [x[-1] for x in states]
    s.head("A 4-bit shift register: the word 1011 enters LSB first", "4-bit shift register (SISO / SIPO)", W, NW)
    w, h, gap = s.v(70, 56), 56, s.v(50, 24)
    x0 = (s.v(W, NW) - (n * w + (n - 1) * gap)) / 2
    y = 74
    sz = s.v(13, 12)
    pins, xs = dff_row(s, "f", [f"Q{i + 1}" for i in range(n)], x0, y, w, h, gap, sz)
    yp = pins[0]["D"][1]
    for i in range(n - 1):
        s.line(f"w{i}", [list(pins[i]["Q"]), list(pins[i + 1]["D"])], tone="muted")
    xe = pins[-1]["Q"][0]
    s.line("si", [[x0 - 24, yp], list(pins[0]["D"])], tone="muted")
    s.line("so", [[xe, yp], [xe + 24, yp]], tone="muted")
    s.text("sil", x0 - 12, y - 12, "SI", sz, anchor="middle", mono=True, weight="bold")
    s.text("sol", xe + 12, y - 12, "SO", sz, anchor="middle", mono=True, weight="bold")
    ybus = y + h + 16
    clock_bus(s, "c", pins, x0 - 24, ybus, sz)
    ty = ybus + s.v(48, 46)
    lh = s.v(26, 24)
    tx = s.v(W / 2, NW / 2)
    ts = s.v(14, 12)
    s.text("t1", tx, ty, "serial in, next bit first: 1 1 0 1", ts, anchor="middle", mono=True)
    s.text("t2", tx, ty + lh, "parallel out Q1Q2Q3Q4 = 0000", ts, anchor="middle", mono=True, weight="bold")
    s.text("t3", tx, ty + 2 * lh, "seen at SO: (nothing yet)", ts, anchor="middle", mono=True)
    s.text("t4", tx, ty + 3 * lh, "clock 0", ts, anchor="middle", tone="muted")
    s.step("A cleared 4-bit shift register on one clock. The word 1011 will be sent LSB first, so the bits enter in the time order 1, 1, 0, 1.",
           *vals("f", (0,) * n))
    for k in range(1, 9):
        st = states[k - 1]
        queue = " ".join(map(str, word[k:])) if k < 4 else "zeros"
        seen = " ".join(str(word[j]) for j in range(4) if k >= j + n)
        hl = [pos(k, 0)] if 0 <= pos(k, 0) < n else []
        if k == 1:
            cap = "Clock 1: the first bit, 1, enters Q1; the zeros move one place right and a 0 leaves at SO. Register 1000."
        elif k == 4:
            cap = "Clock 4: the parallel outputs read the whole word 1011, and its first bit is already at the serial output Q4."
        elif k == 7:
            cap = "Clock 7: the last bit of the word reaches Q4. All four bits have now been seen at SO: 2n − 1 = 7 clocks."
        elif k == 8:
            cap = "Clock 8: the last bit is shifted out. No bit of the word is left in the register: 2n = 8 clocks."
        else:
            cap = f"Clock {k}: {ins[k - 1]} enters Q1, every bit moves one stage right and {outs[k - 1]} drops out of Q4. Register {B(st)}."
        assert len(cap) <= 140, (len(cap), cap)
        s.step(cap, *vals("f", st, hl),
               ("t1", {"text": f"serial in, next bit first: {queue}"}),
               ("t2", {"text": f"parallel out Q1Q2Q3Q4 = {B(st)}", "tone": "accent" if k == 4 else "ink"}),
               ("t3", {"text": f"seen at SO: {seen}" if seen else "seen at SO: (nothing yet)", "tone": "accent" if k in (4, 7) else "ink"}),
               ("t4", {"text": f"clock {k}"}),
               ("so", {"tone": "accent" if 4 <= k <= 7 else "muted"}))
    assert [so[k - 1] for k in range(4, 8)] == word
    s.step("Load: 4 clocks. First bit at SO: clock 4. Last bit at SO: clock 7. Word gone: clock 8. Every bit is delayed by n = 4 clocks.",
           ("t4", {"text": "load 4 · first out 4 · last out 7 · empty 8", "tone": "accent"}), ("so", {"tone": "muted"}))
    return s.done("A 4-bit shift register receiving 1011", (W, ty + 3 * lh + 24), (NW, ty + 3 * lh + 24),
                  "Four D flip-flops Q1 to Q4 share one clock; the serial input SI enters Q1 and Q4 is the serial output SO. "
                  "Each step is one clock edge; the stage holding the word's first bit is highlighted.")


# ── piso-load-shift ────────────────────────────────────────────────────────

PISO = sq.Sync([("QA", "D", {"D": lambda e: (e["L"] & e["A"]) | ((1 - e["L"]) & e["S"])}),
                ("QB", "D", {"D": lambda e: (e["L"] & e["B"]) | ((1 - e["L"]) & e["QA"])}),
                ("QC", "D", {"D": lambda e: (e["L"] & e["C"]) | ((1 - e["L"]) & e["QB"])})], inputs=("L", "A", "B", "C", "S"))


@scene
def piso_load_shift(L):
    """The 1991 PISO: a 2:1 steering MUX per stage; load ABC = 101, then shift with S = 0, 1, 1."""
    s = S(L)
    W, NW = 680, 360
    data = (1, 0, 1)
    xs_in = [(1,) + data + (0,), (0, 0, 0, 0, 0), (0, 0, 0, 0, 1), (0, 0, 0, 0, 1)]
    tr = PISO.trace((0, 0, 0), xs=xs_in)
    assert [B(x) for x in tr] == ["000", "101", "010", "101", "110"]
    ex = [PISO.excite(tr[k], xs_in[k]) for k in range(4)]
    s.head("Parallel in, serial out: load 101, then shift (GATE 1991 design)", "PISO: load, then shift", W, NW)
    w, gap = s.v(80, 70), s.v(90, 40)
    x0 = (s.v(W, NW) - (3 * w + 2 * gap)) / 2
    ym, hm = 84, 56
    yf, hf = ym + hm + 30, 56
    sz = s.v(13, 12)
    names = ["QA", "QB", "QC"]
    letters = ["A", "B", "C"]
    mux, ff = [], []
    for i in range(3):
        x = x0 + i * (w + gap)
        M = s.block(f"m{i}", x, ym, w, hm, left=["1", "0"], bottom=["Y"], top=["L"], size=sz)
        F = s.block(f"f{i}", x, yf, w, hf, top=["D"], right=["Q"], bottom=[">"], size=sz)
        s.text(f"fv{i}", x + w / 2 - s.v(4, 4), yf + 30, f"{names[i]}=0", s.v(14, 13), anchor="middle", mono=True, weight="bold", tone="muted")
        s.line(f"y{i}", [list(M["Y"]), list(F["D"])], tone="muted")
        p1 = M["1"]
        s.line(f"d{i}", [[p1[0] - 22, p1[1]], list(p1)], tone="muted")
        s.text(f"dl{i}", p1[0] - 26, p1[1], letters[i], s.v(14, 13), anchor="end", mono=True, weight="bold")
        mux.append(M)
        ff.append(F)
    # serial input S into the first MUX's 0 input, and Q of each stage into the next MUX's 0 input
    p0 = mux[0]["0"]
    s.line("q0", [[p0[0] - 22, p0[1]], list(p0)], tone="muted")
    s.text("ql0", p0[0] - 26, p0[1], "S", s.v(14, 13), anchor="end", mono=True, weight="bold")
    for i in range(1, 3):
        a, b = ff[i - 1]["Q"], mux[i]["0"]
        mx = b[0] - 10
        s.line(f"q{i}", [list(a), [mx, a[1]], [mx, b[1]], list(b)], tone="muted")
    qo = ff[2]["Q"]
    s.line("so", [list(qo), [qo[0] + 30, qo[1]]], tone="muted")
    s.text("sol", qo[0] + 17, qo[1] - 14, "out", sz, anchor="middle", mono=True, weight="bold")
    # L bus over the MUXes
    yl = ym - 16
    s.line("lbus", [[x0 - 22, yl], [mux[2]["L"][0], yl]], tone="muted")
    for i in range(3):
        s.line(f"ld{i}", [[mux[i]["L"][0], yl], list(mux[i]["L"])], tone="muted")
    s.text("lbl", x0 - 26, yl, "L", s.v(14, 13), anchor="end", mono=True, weight="bold")
    ybus = yf + hf + 16
    clock_bus(s, "c", [{">": F[">"]} for F in ff], x0 - 22, ybus, sz)
    ty = ybus + s.v(46, 44)
    lh = s.v(26, 24)
    tx = s.v(W / 2, NW / 2)
    ts = s.v(14, 12)
    s.text("t1", tx, ty, "L = LOAD/SHIFT′", ts, anchor="middle", mono=True, weight="bold")
    s.text("t2", tx, ty + lh, "QA QB QC = 000", ts, anchor="middle", mono=True)
    s.text("t3", tx, ty + 2 * lh, "serial out so far: –", ts, anchor="middle", mono=True)

    def regpats(st, hl=()):
        return [(f"fv{i}", {"text": f"{names[i]}={st[i]}", "tone": "accent" if i in hl else tv(st[i])}) for i in range(3)]

    def path(load):
        p = []
        for i in range(3):
            p += [(f"d{i}", {"tone": "accent" if load else "muted"}), (f"q{i}", {"tone": "muted" if load else "accent"}),
                  (f"y{i}", {"tone": "accent"}), (f"ld{i}", {"tone": "accent"})]
        return p + [("lbus", {"tone": "accent"})]

    s.step("Each D flip-flop has a 2-to-1 steering MUX in front of it. L = 1 selects input 1 (the data A, B, C); L = 0 selects input 0 (the neighbour).",
           *regpats((0, 0, 0)), ("t1", {"text": "L = LOAD/SHIFT′"}))
    d1 = tuple(ex[0][n_]["D"] for n_ in names)
    assert d1 == data
    s.step(f"L = 1, data ABC = {B(data)}: every MUX passes its data input, so D_A = A, D_B = B, D_C = C before the clock.",
           *path(True), ("t1", {"text": "L = 1: load (D = A, B, C)", "tone": "accent"}),
           *[(f"dl{i}", {"tone": tv(data[i])}) for i in range(3)])
    outs = [tr[1][2]]
    s.step(f"Clock: one edge copies A, B, C in at once. QA QB QC = {B(tr[1])}, and C = {tr[1][2]} is already on the serial output.",
           *regpats(tr[1], [2]), ("t2", {"text": f"QA QB QC = {B(tr[1])}"}), ("t3", {"text": f"serial out so far: {outs[0]}", "tone": "accent"}))
    s.step("L = 0: now each MUX passes its left neighbour: D_A = S, D_B = QA, D_C = QB. The register shifts towards QC.",
           *path(False), ("t1", {"text": "L = 0: shift (D = S, QA, QB)", "tone": "accent"}), *[(f"dl{i}", {"tone": "ink"}) for i in range(3)])
    sv = [x[4] for x in xs_in[1:]]
    for k in range(1, 4):
        st = tr[k + 1]
        outs.append(st[2])
        what = {1: "B", 2: "A", 3: "the first S bit"}[k]
        cap = f"Shift {k} with S = {sv[k - 1]}: QA QB QC = {B(st)}. The serial output QC now shows {what} = {st[2]}."
        assert len(cap) <= 140, (len(cap), cap)
        s.step(cap, *regpats(st, [2]), ("t2", {"text": f"QA QB QC = {B(st)}"}),
               ("t3", {"text": f"serial out so far: {', '.join(map(str, outs))}", "tone": "accent"}))
    assert outs[:3] == [data[2], data[1], data[0]]
    s.step("The word left in the order C, B, A = 1, 0, 1, and S flowed in behind it. One load clock, then n − 1 = 2 shifts to see the whole word.",
           ("t1", {"text": "C, B, A out; S follows", "tone": "accent"}))
    return s.done("A 3-bit parallel-in/serial-out register", (W, ty + 2 * lh + 24), (NW, ty + 2 * lh + 24),
                  "Three D flip-flops QA, QB, QC on one clock, each fed by a 2-to-1 MUX: input 1 is the data bit (A, B, C), input 0 is the "
                  "left neighbour (S for QA). L selects. Each step is one control change or one clock edge.")


# ── ring-johnson-cycles ────────────────────────────────────────────────────

def cells(s, pid, x0, y, cw, ch, title, fb_label, sz, invert=False):
    for i in range(4):
        s.box(f"{pid}c{i}", x0 + i * cw, y, cw, ch, tone="ink")
        s.text(f"{pid}v{i}", x0 + i * cw + cw / 2, y + ch / 2, "0", s.v(16, 15), anchor="middle", mono=True, weight="bold", tone="muted")
        s.text(f"{pid}q{i}", x0 + i * cw + cw / 2, y + ch + 12, f"Q{i + 1}", sz, anchor="middle", mono=True)
    xr, xl, ym = x0 + 4 * cw, x0, y + ch / 2
    yt = y - 14
    x_start = xr
    if invert:  # the Johnson loop starts at an inversion bubble on Q4's output: one inverter
        rb = 4
        s.node(f"{pid}inv", xr + rb, ym, rb, tone="accent")
        x_start = xr + 2 * rb
    xo = xr + (14 if invert else 10)
    s.line(f"{pid}fb", [[x_start, ym], [xo, ym], [xo, yt], [xl - 12, yt], [xl - 12, ym]], tone="accent")
    s.add(id=f"{pid}fbh", type="arrow", **{"from": [xl - 12, ym]}, to=[xl, ym], tone="accent")  # arrowhead into D1
    s.text(f"{pid}fl", x0 + 2 * cw, yt - 12, fb_label, sz, anchor="middle", mono=True, weight="bold", tone="accent")
    s.text(f"{pid}tt", x0 + 2 * cw, yt - 34, title, s.v(15, 13), anchor="middle", weight="bold")


@scene
def ring_johnson_cycles(L):
    """A 4-bit ring counter (from 1000) and a 4-bit Johnson counter (from 0000) on the same clock."""
    s = S(L)
    W, NW = 680, 360
    ring = sq.register_cycle(sq.ring_step, (1, 0, 0, 0))
    john = sq.register_cycle(sq.johnson_step, (0, 0, 0, 0))
    assert [B(x) for x in ring] == ["1000", "0100", "0010", "0001"]
    assert [B(x) for x in john] == ["0000", "1000", "1100", "1110", "1111", "0111", "0011", "0001"]
    others = [c for c in sq.autonomous_cycles(sq.johnson_step, [sq.bits(v, 4) for v in range(16)]) if (0, 0, 0, 0) not in c]
    assert [len(c) for c in others] == [8]
    s.head("Ring versus Johnson: one inverter doubles the cycle", "Ring and Johnson counters", W, NW)
    sz = s.v(13, 12)
    cw, ch = s.v(36, 34), 30
    # panel geometry
    if s.wd:
        rx, ry = 88, 100
        jx, jy = 438, 100
        rc, rR, jc, jR = (160, 300), 68, (510, 300), 100
        r = 22
    else:
        rx, ry = 112, 94
        jx, jy = 112, 430
        rc, rR, jc, jR = (180, 250), 62, (180, 640), 108
        r = 21
    cells(s, "r", rx, ry, cw, ch, "Ring: D1 = Q4", "Q4 → D1", sz)
    cells(s, "j", jx, jy, cw, ch, "Johnson: D1 = Q̄4", "Q̄4 → D1", sz, invert=True)

    def ring_nodes(states, c, R):
        nd = {}
        for i, st in enumerate(states):
            a = math.radians(-90 + i * 360 / len(states))
            nd[B(st)] = (round(c[0] + R * math.cos(a), 2), round(c[1] + R * math.sin(a), 2), B(st))
        return nd

    gr = state_graph(s, "gr", ring_nodes(ring, rc, rR), r, [(B(ring[i]), B(ring[(i + 1) % 4])) for i in range(4)], s.v(13, 12))
    gj = state_graph(s, "gj", ring_nodes(john, jc, jR), r, [(B(john[i]), B(john[(i + 1) % 8])) for i in range(8)], s.v(13, 12))
    s.text("rcnt", rc[0], rc[1], "mod-4", s.v(14, 13), anchor="middle", weight="bold", tone="muted")
    s.text("jcnt", jc[0], jc[1], "mod-8", s.v(14, 13), anchor="middle", weight="bold", tone="muted")

    def regp(pid, st):
        return [(f"{pid}v{i}", {"text": str(b), "tone": tv(b)}) for i, b in enumerate(st)]

    def at(g, states, k, prev):
        cur = B(states[k % len(states)])
        p = [(g["nodes"][cur], {"tone": "accent"})]
        if prev is not None:
            p.append((g["nodes"][B(states[prev % len(states)])], {"tone": "ink"}))
            p += [(i, {"tone": "accent"}) for i in g["edges"][prev % len(states)]]
            if prev >= 1:
                p += [(i, {"tone": "muted"}) for i in g["edges"][(prev - 1) % len(states)]]
        return p

    s.step("Both registers shift right on one shared clock. The ring feeds Q4 back into D1; the Johnson counter feeds back Q̄4, its complement.",
           *regp("r", ring[0]), *regp("j", john[0]), *at(gr, ring, 0, None), *at(gj, john, 0, None))
    for k in range(1, 9):
        rs, js = ring[k % 4], john[k % 8]
        if k == 4:
            cap = "Clock 4: the ring is back at 1000 after 4 states; the Johnson counter has only just filled with 1s (1111)."
        elif k == 8:
            cap = "Clock 8: the Johnson counter is back at 0000 after 2n = 8 states, while the ring has gone round twice."
        elif k < 4:
            cap = f"Clock {k}: the ring's single 1 moves on ({B(rs)}); the Johnson counter takes in another 1 ({B(js)})."
        else:
            cap = f"Clock {k}: ring {B(rs)}; the Johnson counter now feeds back Q̄4 = 0 and fills with 0s ({B(js)})."
        assert len(cap) <= 140, (len(cap), cap)
        s.step(cap, *regp("r", rs), *regp("j", js), *at(gr, ring, k, k - 1), *at(gj, john, k, k - 1))
    s.step("4 flip-flops: ring mod-4 (one-hot), Johnson mod-8. The 8 unused Johnson states form a second cycle that never meets this one.",
           ("rcnt", {"tone": "accent"}), ("jcnt", {"tone": "accent"}))
    Hh = max(rc[1] + rR, jc[1] + jR) + r + 20
    return s.done("A ring counter and a Johnson counter side by side", (W, Hh), (NW, Hh),
                  "Two 4-bit shift registers on one clock: the ring counter feeds Q4 back into D1, the Johnson counter feeds back Q̄4. "
                  "Below each register its state cycle; the current state is highlighted.")


# ── lfsr-feedback ──────────────────────────────────────────────────────────

M2001 = sq.Sync([("Q2", "D", {"D": lambda e: e["Q1"]}), ("Q1", "D", {"D": lambda e: e["Q0"]}), ("Q0", "D", {"D": lambda e: e["Q1"] ^ e["Q2"]})])


@scene
def lfsr_feedback(L):
    """GATE 2001: Q0 → Q1 → Q2 with D0 = Q1 ⊕ Q2, from 001: 1, 2, 5, 3, 7, 6, 4, 1."""
    s = S(L)
    W, NW = 680, 360
    tr = M2001.trace((0, 0, 1), 7)
    seqv = [sq.val(x) for x in tr]
    assert seqv == [1, 2, 5, 3, 7, 6, 4, 1] and M2001.step((0, 0, 0)) == (0, 0, 0)
    s.head("XOR feedback: a 3-bit LFSR (GATE 2001)", "3-bit LFSR (GATE 2001)", W, NW)
    sz = s.v(13, 12)
    w, h, gap = s.v(70, 54), 56, s.v(60, 34)
    x0 = s.v(110, 34)
    y = 150
    pins, xs = dff_row(s, "f", ["Q0", "Q1", "Q2"], x0, y, w, h, gap, sz)
    yp = pins[0]["D"][1]
    for i in range(2):
        s.line(f"w{i}", [list(pins[i]["Q"]), list(pins[i + 1]["D"])], tone="muted")
    gw, gh = s.v(60, 44), 40
    gx = pins[2]["Q"][0] + s.v(46, 22)
    gy = yp - gh + 6
    gpins, gout = s.gate("x", gx, gy, gw, gh, "xor")
    in1, in2 = gpins
    # Q2 → lower input
    q2 = pins[2]["Q"]
    mx = round((q2[0] + in2[0]) / 2, 2)
    s.line("t2", [list(q2), [mx, q2[1]], [mx, in2[1]], list(in2)], tone="muted")
    # Q1 tap (from the Q1 → D2 wire) → upper input, over the top of Q2's block
    xt = round(pins[1]["Q"][0] + gap / 2, 2)
    ytap = y - s.v(46, 42)
    s.line("t1", [[xt, yp], [xt, ytap], [in1[0] - 8, ytap], [in1[0] - 8, in1[1]], list(in1)], tone="muted")
    s.node("tapj", xt, yp, 3.5, fill="ink")  # junction dot: the tap leaves the Q1 → D2 wire
    # XOR output back to D0 over everything
    ytop = ytap - s.v(30, 28)
    xo = gout[0] + 10
    xl = x0 - s.v(22, 18)
    s.line("fb", [list(gout), [xo, gout[1]], [xo, ytop], [xl, ytop], [xl, yp], list(pins[0]["D"])], tone="accent")
    s.text("fbl", s.v(W / 2, NW / 2), ytop - 14, "D0 = Q1 ⊕ Q2 = 0", s.v(14, 12), anchor="middle", mono=True, weight="bold", tone="accent")
    ybus = y + h + 16
    clock_bus(s, "c", pins, xl, ybus, sz)
    ty = ybus + s.v(46, 44)
    lh = s.v(26, 24)
    tx = s.v(W / 2, NW / 2)
    ts = s.v(14, 12)
    s.text("t1x", tx, ty, "state Q2Q1Q0 = 001 = 1", ts, anchor="middle", mono=True, weight="bold")
    s.text("t2x", tx, ty + lh, "sequence: 1", ts, anchor="middle", mono=True)

    def show(st):  # st = (Q2, Q1, Q0); boxes are Q0, Q1, Q2 left to right
        q2_, q1_, q0_ = st
        return vals("f", (q0_, q1_, q2_))

    fb0 = tr[0][1] ^ tr[0][0]
    s.step(f"Start at Q0 = 1, Q1 = Q2 = 0 (state 4Q2 + 2Q1 + Q0 = 1). The XOR of Q1 and Q2 is {fb0}: that is what D0 will take at the next clock.",
           *show(tr[0]), ("fbl", {"text": f"D0 = Q1 ⊕ Q2 = {fb0}"}))
    for k in range(1, 8):
        st = tr[k]
        old = tr[k - 1]
        fb = old[1] ^ old[0]
        nfb = st[1] ^ st[0]
        cap = f"Clock {k}: D0 took {fb} (from the old Q1 ⊕ Q2), Q1 took Q0 and Q2 took Q1. State {B(st)} = {seqv[k]}."
        if k == 7:
            cap = "Clock 7: the state is 001 = 1 again. The cycle 1, 2, 5, 3, 7, 6, 4 visits all seven non-zero states."
        assert len(cap) <= 140, (len(cap), cap)
        s.step(cap, *show(st), ("fbl", {"text": f"D0 = Q1 ⊕ Q2 = {nfb}"}),
               ("t1x", {"text": f"state Q2Q1Q0 = {B(st)} = {seqv[k]}"}),
               ("t2x", {"text": "sequence: " + ", ".join(map(str, seqv[:k + 1])), "tone": "accent" if k == 7 else "ink"}))
    s.step("The missing state is 000: there Q1 ⊕ Q2 = 0, so a 0 is fed in and the register stays at 000 forever. Seed an LFSR non-zero.",
           *vals("f", (0, 0, 0)), ("fbl", {"text": "D0 = Q1 ⊕ Q2 = 0", "tone": "danger"}), ("fb", {"tone": "danger"}),
           ("t1x", {"text": "state 000 → 000 (stuck)", "tone": "danger"}))
    return s.done("A 3-bit LFSR stepping through 1, 2, 5, 3, 7, 6, 4", (W, ty + lh + 24), (NW, ty + lh + 24),
                  "Three D flip-flops in a chain Q0 → Q1 → Q2 on one clock; an XOR of Q1 and Q2 feeds D0. The state is 4Q2 + 2Q1 + Q0. "
                  "Each step is one clock edge.")
