"""Chapter 6, Lesson 2 scenes (flip-flops, edge triggering and timing). Every waveform is a
seqlib.scope run (latch, positive edge, master–slave, setup/hold windows) and every table entry of
the conversion scene comes from seqlib.ff_next / excitation / convert, so no value or caption
number can drift from the checked maths."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import seqlib as sq  # noqa: E402
from _viz_ch6_base import S, ff_block, reveal, scene, tv, vtext, waveform  # noqa: E402


def changes(w, a=1, b=None):
    b = len(w) if b is None else b
    return [t for t in range(max(a, 1), b) if w[t] != w[t - 1]]


def wave(s, pid, x, y, h, dx, vals, groups, tone):
    """waveform() per group, but every run of unknown ('X') ticks becomes one soft danger band."""
    out = []
    for gi, (a, b) in enumerate(groups):
        ids, t = [], a
        while t < b:
            u = t
            if vals[t] == "X":
                while u < b and vals[u] == "X":
                    u += 1
                bid = f"hl{pid}g{gi}x{t}"
                s.box(bid, x + t * dx, y, (u - t) * dx, h, fill="danger", tone="danger", hidden=True, opacity=0.9)
                ids.append(bid)
            else:
                while u < b and vals[u] != "X":
                    u += 1
                ids += waveform(s, f"{pid}g{gi}r{t}", x, y, h, dx, vals, [(t, u)], tone=tone)[0]
            t = u
        out.append(ids)
    return out


def rows_panel(s, pid, rows, x, y, dx, h, gap, groups, lsize):
    """Waveform rows [(key, label, values, tone)] stacked from y; returns ({key: ids per group}, {key: y})."""
    ids, ys = {}, {}
    for i, (key, lab, vals, tone) in enumerate(rows):
        yy = y + i * gap
        ys[key] = yy
        s.text(f"{pid}l{key}", x - 8, yy + h / 2, lab, lsize, anchor="end", mono=True, weight="bold")
        ids[key] = wave(s, f"{pid}{key}", x, yy, h, dx, vals, groups, tone)
    return ids, ys


def show_all(ids, k):
    pats = []
    for key in ids:
        pats += reveal(ids[key], k)
    return pats


def seq(vals):
    return ", ".join(vtext(v) for v in vals)


# ── edge-ff-timing ─────────────────────────────────────────────────────────

@scene
def edge_ff_timing(L):
    """One D waveform into a D latch and a positive-edge D flip-flop (seqlib.scope)."""
    s = S(L)
    W, NW = 680, 360
    clk = [0] + [1, 1, 1, 0, 0, 0] * 4
    D = [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0]
    N = len(clk)
    lat = sq.scope("D", "latch", clk, {"D": D}, tpd=1)
    ff = sq.scope("D", "pos", clk, {"D": D}, tpd=1)
    rises = ff["edges"]
    assert rises == [1, 7, 13, 19]
    samp = [D[e - 1] for e in rises]
    assert samp == [0, 1, 1, 0] and [ff["S"][e] for e in rises] == samp
    # the story the captions tell
    assert changes(D, 1, 4) == [3] and changes(lat["S"], 1, 4) == [3]          # latch follows a mid-pulse rise
    assert changes(D, 7, 10) == [9] and changes(lat["S"], 7, 10) == [9]        # … and a mid-pulse fall
    assert changes(D, 10, 13) == [11] and changes(lat["S"], 10, 13) == []      # closed: ignores D
    assert changes(D, 19, 25) == [20, 22] and lat["S"][24] == 1 and ff["S"][24] == 0  # pulse caught by the latch only
    s.head("Same clock, same D: a D latch and a rising-edge D flip-flop", "D latch vs edge-triggered D", W, NW)
    # the two devices
    bw, bh = s.v(118, 96), 48
    bx1, bx2, by = s.v(150, 20), s.v(400, 190), s.v(60, 58)
    ff_block(s, "bl", bx1, by, bw, bh, ["D"], ["Q"], edge="latch")
    ff_block(s, "bf", bx2, by, bw, bh, ["D"], ["Q"], edge="pos")
    s.text("blt", bx1 + bw / 2, by - 12, "D latch (level)", s.v(13, 12), anchor="middle", weight="bold")
    s.text("bft", bx2 + bw / 2, by - 12, "D flip-flop (↑ edge)", s.v(13, 12), anchor="middle", weight="bold")
    s.text("blv", bx1 + bw + 8, by + bh / 2, "", s.v(14, 12), anchor="start", mono=True, weight="bold")
    s.text("bfv", bx2 + bw + 8, by + bh / 2, "", s.v(14, 12), anchor="start", mono=True, weight="bold")
    x0, dx = s.v(110, 66), s.v(22, 11.3)
    h, gap = s.v(18, 16), s.v(42, 38)
    y0 = s.v(150, 146)
    groups = [(0, 4), (4, 7), (7, 10), (10, 13), (13, 16), (16, 19), (19, 22), (22, 25)]
    rows = [("c", "CLK", clk, "ink"), ("d", "D", D, "ink"), ("l", "Q latch", lat["S"], "accent"), ("f", "Q FF", ff["S"], "accent")]
    ids, ys = rows_panel(s, "w", rows, x0, y0, dx, h, gap, groups, s.v(14, 12))
    ytop, ybot = y0 - 6, ys["f"] + h + 6
    for k, e in enumerate(rises):
        xe = x0 + e * dx
        s.line(f"m{k}", [[xe, ytop], [xe, ybot]], dashed=True, tone="accent", hidden=True)
        s.text(f"mt{k}", xe, ytop - 10, f"↑{k + 1}", s.v(13, 12), anchor="middle", tone="accent", mono=True, hidden=True)
    s.text("st", s.v(W / 2, NW / 2), ybot + 22, "", s.v(14, 12), anchor="middle", weight="bold")
    for k, (a, b) in enumerate(groups):
        pats = show_all(ids, k)
        high = clk[b - 1] == 1
        lv_, fv = lat["S"][b - 1], ff["S"][b - 1]
        pats += [("bl", {"tone": "accent" if high else "muted"}), ("bf", {"tone": "accent" if high else "muted"}),
                 ("blv", {"text": f"Q={lv_}", "tone": tv(lv_)}), ("bfv", {"text": f"Q={fv}", "tone": tv(fv)})]
        dch = changes(D, a, b)
        if high:
            n = k // 2
            e = rises[n]
            pats += [(f"m{n}", {"hidden": False, "tone": "accent"}), (f"mt{n}", {"hidden": False})]
            if n:
                pats += [(f"m{n - 1}", {"tone": "muted"}), (f"mt{n - 1}", {"tone": "muted"})]
            follow = (f"D {'rises' if D[dch[0]] else 'falls'} mid-pulse and the latch follows it."
                      if dch else f"the latch passes D = {D[b - 1]}.")
            cap = f"Rising edge {n + 1}: the flip-flop samples D = {D[e - 1]} (just before the edge) and holds it. CLK = 1: " + follow
            pats += [("st", {"text": f"edge {n + 1}: FF ← {D[e - 1]}; latch open", "tone": "accent"})]
        else:
            cap = (f"CLK = 0: the latch is closed and holds {lv_}; the flip-flop waits for the next edge."
                   + (" D changes now, but neither output moves." if dch else ""))
            pats += [("st", {"text": f"CLK = 0: both hold (latch {lv_}, FF {fv})", "tone": "ink"})]
        assert len(cap) <= 140, cap
        s.step(cap, *pats)
    s.step(f"The latch followed D all through each high phase and caught the last pulse; the flip-flop stepped only at edges: {seq(samp)}.",
           ("st", {"text": "latch = window, flip-flop = camera", "tone": "accent"}), ("m3", {"tone": "muted"}), ("mt3", {"tone": "muted"}))
    return s.done("A D latch and an edge-triggered D flip-flop on the same waveforms", (W, ybot + 40), (NW, ybot + 40),
                  "A D latch and a positive-edge D flip-flop share one clock and one data input D. "
                  "The waveforms grow half a clock period per step (gate delays ignored); dashed lines mark the rising edges.")


# ── master-slave ───────────────────────────────────────────────────────────

@scene
def master_slave(L):
    """Master latch open while CLK = 1, slave while CLK = 0 (seqlib.scope mode 'ms')."""
    s = S(L)
    W, NW = 680, 360
    clk = [0] + [1, 1, 1, 0, 0, 0] * 4
    D = [0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0]
    r = sq.scope("D", "ms", clk, {"D": D}, tpd=1)
    M, Q = r["M"], r["Q"]
    falls = r["edges"]
    assert falls == [4, 10, 16, 22]
    assert [r["S"][t] for t in falls] == [D[t - 1] for t in falls] == [1, 0, 1, 1]
    assert all(M[t] == D[t] for t in range(len(clk)) if clk[t])
    assert all(t in falls for t in changes(r["S"]))
    s.head("Master–slave: two latches on opposite clock phases", "Master–slave D flip-flop", W, NW)
    bw, bh = s.v(96, 72), s.v(64, 60)
    mx, sx, by = s.v(170, 56), s.v(390, 196), 56
    PM = s.block("mas", mx, by, bw, bh, left=["D", "C"], right=["Q"])
    PS = s.block("sla", sx, by, bw, bh, left=["D", "C"], right=["Q"])
    s.text("mast", mx + bw / 2, by + bh + 13, "master", s.v(13, 12), anchor="middle", weight="bold")
    s.text("slat", sx + bw / 2, by + bh + 13, "slave", s.v(13, 12), anchor="middle", weight="bold")
    xin = s.v(110, 30)
    s.wire("wd", (xin, PM["D"][1]), PM["D"])
    s.text("ld", xin - 6, PM["D"][1], "D", s.v(15, 13), anchor="end", mono=True, weight="bold")
    xm = (mx + bw + sx) / 2
    s.line("wm", [list(PM["Q"]), [xm, PM["Q"][1]], [xm, PS["D"][1]], list(PS["D"])])
    s.text("lm", xm, by - 10, "M", s.v(14, 12), anchor="middle", mono=True, weight="bold")
    xo = sx + bw + s.v(60, 30)
    s.wire("wq", PS["Q"], (xo, PS["Q"][1]))
    s.text("lq", xo + 6, PS["Q"][1], "Q", s.v(15, 13), anchor="start", mono=True, weight="bold")
    yc = by + bh + s.v(40, 36)
    xb = mx - s.v(24, 14)
    s.line("wc1", [[xin, yc], [xb, yc], [xb, PM["C"][1]], list(PM["C"])])
    s.text("lc", xin - 6, yc, "CLK", s.v(14, 12), anchor="end", mono=True, weight="bold")
    gw, gh = s.v(40, 30), 24
    gx = xm - gw / 2
    pins, gout = s.gate("inv", gx, yc - gh / 2, gw, gh, "not")
    s.line("wc2", [[xb, yc], list(pins[0])])
    xs = sx - s.v(20, 14)
    s.line("wc3", [list(gout), [xs, gout[1]], [xs, PS["C"][1]], list(PS["C"])])
    x0, dx = s.v(110, 50), s.v(22, 12)
    h, gap = s.v(18, 16), s.v(40, 36)
    y0 = yc + s.v(44, 40)
    groups = [(0, 4), (4, 7), (7, 10), (10, 13), (13, 16), (16, 19), (19, 22), (22, 25)]
    ids, ys = rows_panel(s, "w", [("c", "CLK", clk, "ink"), ("d", "D", D, "ink"), ("m", "M", M, "info"), ("q", "Q", r["S"], "accent")],
                         x0, y0, dx, h, gap, groups, s.v(14, 12))
    ybot = ys["q"] + h + 6
    for k, e in enumerate(falls):
        xe = x0 + e * dx
        s.line(f"m{k}", [[xe, y0 - 6], [xe, ybot]], dashed=True, tone="accent", hidden=True)
    s.text("st", s.v(W / 2, NW / 2), ybot + 22, "", s.v(14, 12), anchor="middle", weight="bold")
    for k, (a, b) in enumerate(groups):
        pats = show_all(ids, k)
        high = clk[b - 1] == 1
        m, q = M[b - 1], r["S"][b - 1]
        pats += [("mas", {"tone": "accent" if high else "muted"}), ("sla", {"tone": "muted" if high else "accent"}),
                 ("wd", {"tone": tv(D[b - 1])}), ("wm", {"tone": tv(m)}), ("wq", {"tone": tv(q)}),
                 ("wc1", {"tone": tv(clk[b - 1])}), ("wc2", {"tone": tv(clk[b - 1])}), ("wc3", {"tone": tv(1 - clk[b - 1])}),
                 ("lm", {"text": f"M = {m}", "tone": tv(m)}), ("lq", {"text": f"Q = {q}", "tone": tv(q)})]
        if high:
            ms = sorted(set(M[a:b]), key=M[a:b].index) if a else [M[b - 1]]
            mv = " then ".join(map(str, [M[t] for t in [x for x in range(max(a, 1), b) if x == max(a, 1) or M[x] != M[x - 1]]]))
            cap = f"CLK = 1: the master is open and follows D (M = {mv}); the slave is closed, so Q stays {q}."
            del ms
            pats += [("st", {"text": "master open, slave closed", "tone": "info"})]
        else:
            n = k // 2
            pats += [(f"m{n}", {"hidden": False, "tone": "accent"})] + ([(f"m{n - 1}", {"tone": "muted"})] if n else [])
            cap = (f"CLK falls: the master closes holding M = {m}; the slave opens and copies it, so Q = {q}."
                   + (" D changes now, but the master is shut." if changes(D, a, b) else ""))
            pats += [("st", {"text": f"falling edge {n + 1}: Q ← {m}", "tone": "accent"})]
        assert len(cap) <= 140, cap
        s.step(cap, *pats)
    s.step(f"Q moved only at the falling edges, each time to the value D had as CLK fell: {seq([D[t - 1] for t in falls])}.",
           ("st", {"text": "never both open: an edge from two latches", "tone": "accent"}), ("m3", {"tone": "muted"}))
    return s.done("A master–slave D flip-flop: the master follows, the slave copies at the falling edge", (W, ybot + 40), (NW, ybot + 40),
                  "Two D latches in series. The master is enabled by CLK, the slave by CLK through an inverter. "
                  "Waveforms of CLK, D, the master M and Q grow half a period per step (delays ignored).")


# ── race-around ────────────────────────────────────────────────────────────

@scene
def race_around(L):
    """Level JK latch with J = K = 1 toggles every t_pd while CLK = 1; master–slave toggles once."""
    s = S(L)
    W, NW = 680, 360
    tpd = 2
    clk = [0, 0] + [1] * 7 + [0] * 5 + [1] * 5 + [0] * 6
    N = len(clk)
    one = [1] * N
    lat = sq.scope("JK", "latch", clk, {"J": one, "K": one}, tpd=tpd)
    ms = sq.scope("JK", "ms", clk, {"J": one, "K": one}, tpd=1)
    lq, mq = lat["Q"], ms["Q"]
    pulses = [(2, 9), (14, 19)]
    tog = [len(changes(lq, a, b + tpd)) for a, b in pulses]
    assert tog == [-(-(b - a) // tpd) for a, b in pulses] == [4, 3]
    assert [len(changes(mq, a, b + 2)) for a, b in pulses] == [1, 1]
    assert lq[13] == 0 and lq[-1] == 1 and mq[13] == 1 and mq[-1] == 0
    s.head("J = K = 1: a level JK latch races, a master–slave JK toggles once", "Race-around: latch vs master–slave", W, NW)
    bw, bh = s.v(118, 120), 54
    bx1, bx2, by = s.v(150, 24), s.v(400, 214), s.v(60, 58)
    ff_block(s, "bl", bx1, by, bw, bh, ["J=1", "K=1"], ["Q"], edge="latch")
    ff_block(s, "bm", bx2, by, bw, bh, ["J=1", "K=1"], ["Q"], edge="neg")
    s.text("blt", bx1 + bw / 2, by - 12, "JK latch (level)", s.v(13, 12), anchor="middle", weight="bold")
    s.text("bmt", bx2 + bw / 2, by - 12, "JK master–slave", s.v(13, 12), anchor="middle", weight="bold")
    x0, dx = s.v(110, 66), s.v(22, 11.3)
    h, gap = s.v(18, 16), s.v(44, 40)
    y0 = s.v(160, 156)
    groups = [(0, 2), (2, 4), (4, 6), (6, 8), (8, 10), (10, 14), (14, 16), (16, 18), (18, 20), (20, 22), (22, 25)]
    ids, ys = rows_panel(s, "w", [("c", "CLK", clk, "ink"), ("l", "Q latch", lq, "accent"), ("m", "Q m–s", mq, "accent")],
                         x0, y0, dx, h, gap, groups, s.v(14, 12))
    s.text("tw", x0 + 2 * dx, y0 - 12, "t_w = 7 ticks", s.v(13, 12), anchor="start", tone="muted", hidden=True)
    s.text("tp", x0 + 14 * dx, y0 - 12, "t_w = 5 ticks", s.v(13, 12), anchor="start", tone="muted", hidden=True)
    ybot = ys["m"] + h
    s.text("st", s.v(W / 2, NW / 2), ybot + 26, "", s.v(14, 12), anchor="middle", weight="bold")
    count = {0: 0, 1: 0}
    for k, (a, b) in enumerate(groups):
        pats = show_all(ids, k)
        pi = 0 if a < 12 else 1
        pa, pb = pulses[pi]
        new = changes(lq, max(a, 1), b)
        count[pi] += len(new)
        high = any(clk[a:b])
        pats += [("bl", {"tone": "danger" if new else "accent" if high else "muted"}),
                 ("bm", {"tone": "accent" if changes(mq, max(a, 1), b) else "muted"})]
        if k == 0:
            cap = f"Both start at Q = 0 with J = K = 1. One latch delay t_pd = {tpd} ticks; the first clock pulse is 7 ticks wide."
            pats += [("tw", {"hidden": False}), ("st", {"text": "t_pd = 2 ticks", "tone": "ink"})]
        elif new and high:
            cap = (f"Toggle {count[pi]} lands (Q = {lq[b - 1]}). CLK is still 1, so the latch sees its new Q and flips again. "
                   "The master–slave Q waits.")
            pats += [("st", {"text": f"latch toggles: {count[pi]}", "tone": "danger"})]
        elif new:
            cap = (f"CLK has fallen, but the toggle started at tick {new[-1] - tpd} still completes: Q = {lq[b - 1]}, "
                   f"{count[pi]} toggles in all. Master–slave: Q = {mq[b - 1]}, once.")
            pats += [("st", {"text": f"{count[pi]} toggles vs 1", "tone": "danger"})]
        elif high and pi == 0:
            cap = f"CLK rises: told to toggle, the latch starts to flip; the new Q appears t_pd = {tpd} ticks later. The master–slave master moves, Q waits."
            pats += [("st", {"text": "pulse 1: 7 ticks", "tone": "ink"})]
        elif high:
            cap = f"CLK = 1 again, now for 5 ticks. The latch starts toggling every {tpd} ticks; the master–slave slave stays shut."
            pats += [("tp", {"hidden": False}), ("st", {"text": "second pulse: 5 ticks", "tone": "ink"})]
        else:
            par = "odd, so it ended flipped" if count[pi] % 2 else "even, so it ended where it began"
            cap = f"CLK = 0: both hold. The latch made {count[pi]} toggles ({par}): Q = {lq[b - 1]}. Master–slave Q = {mq[b - 1]}."
            pats += [("st", {"text": f"latch {lq[b - 1]}, master–slave {mq[b - 1]}", "tone": "ink"})]
        assert len(cap) <= 140, (len(cap), cap)
        s.step(cap, *pats)
    s.step(f"The latch toggled ⌈t_w / t_pd⌉ = {tog[0]} then {tog[1]} times, so its result depends on the pulse width; the master–slave toggled once per pulse.",
           ("st", {"text": "race-around iff t_w > t_pd", "tone": "accent"}), ("bl", {"tone": "danger"}), ("bm", {"tone": "success"}))
    return s.done("Race-around in a level JK latch, and the master–slave cure", (W, ybot + 46), (NW, ybot + 46),
                  "Two JK storage elements with J = K = 1 share one clock: a level-sensitive JK latch with a delay of 2 ticks and a "
                  "master–slave JK flip-flop. Two clock pulses, 7 and 5 ticks wide.")


# ── setup-hold ─────────────────────────────────────────────────────────────

@scene
def setup_hold(L):
    """One rising edge with its setup/hold window and three D waveforms (seqlib.scope with tsu, th)."""
    s = S(L)
    W, NW = 680, 360
    tsu, th = 2, 2
    clk = [0] * 7 + [1] * 7 + [0] * 4
    N = len(clk)
    e = 7
    cases = [("early", 3), ("inside", 6), ("late", 10)]
    runs = []
    for name, c in cases:
        D = [0] * c + [1] * (N - c)
        r = sq.scope("D", "pos", clk, {"D": D}, tsu=tsu, th=th, tpd=1)
        runs.append((name, c, D, r))
    assert runs[0][3]["viol"] == [] and runs[0][3]["S"][e] == 1
    assert runs[1][3]["viol"] == [(e, "setup", "D")] and runs[1][3]["S"][e] == "X"
    assert runs[2][3]["viol"] == [] and runs[2][3]["S"][e] == 0
    s.head("One rising edge and its sampling window", "Setup and hold window", W, NW)
    x0, dx = s.v(150, 76), s.v(28, 15)
    h, gap = s.v(18, 16), s.v(38, 34)
    y0 = s.v(70, 66)
    rows = [("c", "CLK", clk, "ink")]
    for k, (name, c, D, r) in enumerate(runs):
        rows += [(f"d{k}", f"D {name}", D, "ink"), (f"q{k}", "Q", r["Q"], "accent")]
    ids, ys = rows_panel(s, "w", rows, x0, y0, dx, h, gap, [(0, N)], s.v(14, 12))
    ybot = ys["q2"] + h + 6
    xe = x0 + e * dx
    s.box("hlwin", x0 + (e - tsu) * dx, y0 - 8, (tsu + th) * dx, ybot - y0 + 8, fill="warning", tone="warning", opacity=0.6, hidden=True)
    s.line("edge", [[xe, y0 - 8], [xe, ybot]], dashed=True, tone="accent", hidden=True)
    s.text("lsu", xe - 4, y0 - 20, "t_su", s.v(13, 12), anchor="end", mono=True, tone="warning", hidden=True)
    s.text("lh", xe + 4, y0 - 20, "t_h", s.v(13, 12), anchor="start", mono=True, tone="warning", hidden=True)
    s.text("st", s.v(W / 2, NW / 2), ybot + 22, "", s.v(14, 12), anchor="middle", weight="bold")
    s.step(f"A rising edge at tick {e}. D must be stable from t_su = {tsu} ticks before it to t_h = {th} ticks after it: the shaded window.",
           *reveal(ids["c"], 0), ("hlwin", {"hidden": False}), ("edge", {"hidden": False}), ("lsu", {"hidden": False}), ("lh", {"hidden": False}),
           ("st", {"text": f"window: ticks {e - tsu} to {e + th}", "tone": "warning"}))
    words = {
        "early": "D rises at tick {c}, before the window opens: a clean sample.",
        "inside": "D rises at tick {c}, inside the setup window: the edge may catch 0, 1 or a metastable level.",
        "late": "D rises at tick {c}, after the hold time has passed: the edge saw the old value.",
    }
    for k, (name, c, D, r) in enumerate(runs):
        s.step(words[name].format(c=c), *reveal(ids[f"d{k}"], 0), ("st", {"text": f"D {name}: changes at tick {c}", "tone": "ink"}))
        qv = r["S"][e]
        res = {"early": f"Q becomes {qv} one tick after the edge: the new value was set up in time.",
               "inside": "Setup violated: the model marks Q unknown (X) until a later clean edge forces a value.",
               "late": f"Q stays {qv}: the 1 arrives after the hold time and will be taken only at the next rising edge."}[name]
        s.step(res, *reveal(ids[f"q{k}"], 0), ("st", {"text": f"Q = {vtext(qv)}", "tone": "danger" if qv == "X" else tv(qv)}))
    s.step("Keep every input still from t_su before to t_h after each active edge; then the edge reads the value just before it.",
           ("st", {"text": "outside the window: reliable; inside: X", "tone": "accent"}))
    return s.done("Setup and hold: when an edge reads its input reliably", (W, ybot + 40), (NW, ybot + 40),
                  "A positive-edge D flip-flop with setup time 2 ticks and hold time 2 ticks. One clock edge, and three versions of D "
                  "that rise early, inside the window and late, each with its Q.")


# ── ff-conversion ──────────────────────────────────────────────────────────

@scene
def ff_conversion(L):
    """JK from D: characteristic table → D column (D excitation) → K-map → D = JQ̄ + K̄Q."""
    s = S(L)
    W, NW = 680, 360
    rows8 = [(j, k, q) for j in (0, 1) for k in (0, 1) for q in (0, 1)]
    qn = {r: sq.ff_next("JK", r[2], J=r[0], K=r[1]) for r in rows8}
    dcol = {r: sq.excitation("D", r[2], qn[r])["D"] for r in rows8}
    assert all(dcol[r] == qn[r] for r in rows8)
    sop = sq.convert("JK", "D")["D"]
    assert sorted(sop[0].split(" + ")) == sorted(["JQ′", "K′Q"])
    s.head("Building a JK flip-flop from a D flip-flop", "JK from D, step by step", W, NW)
    cw, ch = s.v(40, 36), s.v(26, 24)
    tx, ty = s.v(30, 90), 46
    head = ["J", "K", "Q", "Q⁺", "D"]
    cur = [head] + [[str(j), str(k), str(q), "", ""] for j, k, q in rows8]
    s.table("tt", tx, ty, cw, ch, cur)
    # K-map: rows Q = 0, 1; columns JK in Gray order 00 01 11 10
    gray = [(0, 0), (0, 1), (1, 1), (1, 0)]
    kcw, kch = s.v(44, 46), s.v(32, 30)
    kx, ky = s.v(330, 65), s.v(110, ty + 9 * ch + 44)
    km = [["Q\\JK"] + [f"{a}{b}" for a, b in gray], ["0", "", "", "", ""], ["1", "", "", "", ""]]
    s.table("km", kx, ky, kcw, kch, km, hidden=True)
    s.text("kmt", kx + 2.5 * kcw, ky - 16, "K-map of D", s.v(14, 12), anchor="middle", weight="bold", hidden=True)
    s.text("res", s.v(kx + 2.5 * kcw, NW / 2), ky + 3 * kch + s.v(70, 66), "", s.v(17, 15), anchor="middle", mono=True, weight="bold")
    s.text("sub", s.v(kx + 2.5 * kcw, NW / 2), ky + 3 * kch + s.v(30, 28), "", s.v(13, 12), anchor="middle", tone="muted")

    def cell(q, jk):
        return 1 + q, 1 + gray.index(jk)
    for i in range(4):
        part = rows8[2 * i:2 * i + 2]
        for r in part:
            cur[1 + rows8.index(r)][3] = str(qn[r])
        hl = [[1 + rows8.index(r), 3] for r in part]
        j, k = part[0][0], part[0][1]
        act = {(0, 0): "hold: Q⁺ = Q", (0, 1): "reset: Q⁺ = 0", (1, 0): "set: Q⁺ = 1", (1, 1): "toggle: Q⁺ = Q̄"}[(j, k)]
        s.step(f"JK = {j}{k} is '{act.split(':')[0]}', so from Q = 0 and Q = 1 the JK goes to {qn[part[0]]} and {qn[part[1]]}.",
               ("tt", {"rows": [list(x) for x in cur], "highlight": hl}), ("sub", {"text": f"JK = {j}{k}: {act}", "tone": "ink"}))
    for r in rows8:
        cur[1 + rows8.index(r)][4] = str(dcol[r])
    s.step("A D flip-flop goes wherever D tells it, so its excitation is simply D = Q⁺: the D column copies the Q⁺ column.",
           ("tt", {"rows": [list(x) for x in cur], "highlight": [[i, 4] for i in range(1, 9)]}), ("sub", {"text": "D excitation: D = Q⁺", "tone": "ink"}))
    kmr = [list(x) for x in km]
    for r in rows8:
        rr, cc = cell(r[2], (r[0], r[1]))
        kmr[rr][cc] = str(dcol[r])
    ones = [list(cell(r[2], (r[0], r[1]))) for r in rows8 if dcol[r]]
    assert len(ones) == 4
    s.step("Place the D column in a K-map with Q down the side and JK across in Gray order 00, 01, 11, 10.",
           ("km", {"hidden": False, "rows": kmr, "highlight": ones}), ("kmt", {"hidden": False}), ("tt", {"highlight": []}),
           ("sub", {"text": "four 1s to cover", "tone": "ink"}))
    g1 = [list(cell(0, (1, 1))), list(cell(0, (1, 0)))]
    assert all(dcol[(jk[0], jk[1], 0)] == 1 for jk in [(1, 1), (1, 0)])
    s.box("lp1", kx + 3 * kcw + 3, ky + kch + 3, 2 * kcw - 6, kch - 6, tone="accent", hidden=True)
    s.step("Row Q = 0 has 1s under JK = 11 and 10, the columns where J = 1: the group J·Q̄ (set or toggle from 0).",
           ("km", {"highlight": g1}), ("lp1", {"hidden": False}), ("sub", {"text": "group 1: J·Q̄", "tone": "accent"}))
    g2 = [list(cell(1, (0, 0))), list(cell(1, (1, 0)))]
    assert all(dcol[(jk[0], jk[1], 1)] == 1 for jk in [(0, 0), (1, 0)])
    s.box("lp2a", kx + kcw + 3, ky + 2 * kch + 3, kcw - 6, kch - 6, tone="success", hidden=True)
    s.box("lp2b", kx + 4 * kcw + 3, ky + 2 * kch + 3, kcw - 6, kch - 6, tone="success", hidden=True)
    s.step("Row Q = 1 has 1s under JK = 00 and 10 (the map wraps round): K = 0 there, so the group is K̄·Q (hold or set from 1).",
           ("km", {"highlight": g2}), ("lp2a", {"hidden": False}), ("lp2b", {"hidden": False}), ("sub", {"text": "group 2: K̄·Q (wraps)", "tone": "success"}))
    s.step("So D = JQ̄ + K̄Q, the JK characteristic equation itself: with a D flip-flop, D is always the wanted Q⁺.",
           ("km", {"highlight": ones}), ("res", {"text": "D = JQ̄ + K̄Q", "tone": "accent"}), ("sub", {"text": "check: J = K = 1 gives D = Q̄", "tone": "muted"}))
    H = ky + 3 * kch + s.v(96, 92)
    return s.done("Converting flip-flops: a JK flip-flop from a D flip-flop", (W, max(H, ty + 9 * ch + 30)), (NW, H),
                  "The conversion method for a JK flip-flop built from a D flip-flop: the JK characteristic table, the D column "
                  "from the D excitation table, and the K-map of D.")
