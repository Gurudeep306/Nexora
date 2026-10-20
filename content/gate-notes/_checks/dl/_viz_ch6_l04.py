"""Chapter 6, Lesson 4 scenes (counter basics and ripple counters). Every waveform, transient
state, clear pulse and period is a seqlib.ripple_events run (event simulation with a delay per
stage and an optional asynchronous clear), so no state or caption number can drift from the
checked maths."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import seqlib as sq  # noqa: E402
from _viz_ch6_base import S, reveal, scene, tv, waveform  # noqa: E402


def falling_clock(periods, high, low, lead=1):
    """Clock ticks: `lead` low ticks, then `periods` × (high 1s, low 0s). Returns (ticks, falling edges)."""
    clk = [0] * lead + ([1] * high + [0] * low) * periods
    falls = [t for t in range(1, len(clk)) if clk[t - 1] == 1 and clk[t] == 0]
    return clk, falls


def states_per_tick(ev, T):
    """The counter state at every tick (all events with time ≤ t applied)."""
    out, k, cur = [], 0, ev[0][1]
    for t in range(T):
        while k < len(ev) and ev[k][0] <= t:
            cur = ev[k][1]
            k += 1
        out.append(cur)
    return out


def chain_between(ev, a, b):
    """The states the counter passes through for events with a < time < b, starting from the state before."""
    before = [q for t, q in ev if t <= a][-1]
    return [before] + [q for t, q in ev if a < t < b]


def b3(q, n=3):
    return format(q, f"0{n}b")


def tff_chain(s, pid, n, x0, y, bw, bh, gap, clear=False):
    """n T flip-flops (T = 1) in a row, Q_i wired to the clock of stage i + 1. Returns the pin dicts."""
    pins = []
    for i in range(n):
        x = x0 + i * (bw + gap)
        P = s.block(f"{pid}{i}", x, y, bw, bh, left=["T=1", ">"], right=[f"Q{i}"], bottom=["CLR"] if clear else (), size=s.v(13, 12))
        pins.append(P)
    for i in range(n - 1):
        a, b = pins[i][f"Q{i}"], pins[i + 1][">"]
        s.wire(f"{pid}w{i}", a, b, mid=round(a[0] + gap / 2, 2))
    return pins


def edge_marks(s, pid, falls, x0, dx, ytop, ybot, size):
    tight = dx * min(b - a for a, b in zip(falls, falls[1:])) < 3 * size * 0.62 + 4
    for k, e in enumerate(falls):
        xe = x0 + e * dx
        s.line(f"{pid}{k}", [[xe, ytop], [xe, ybot]], dashed=True, tone="accent", hidden=True)
        s.text(f"{pid}t{k}", xe, ytop - 10, "↓" if tight else f"↓{k + 1}", size, anchor="middle", tone="accent", mono=True, hidden=True)


def rows_panel(s, pid, rows, x, y, dx, h, gap, groups, lsize):
    ids, ys = {}, {}
    for i, (key, lab, vals, tone) in enumerate(rows):
        yy = y + i * gap
        ys[key] = yy
        s.text(f"{pid}l{key}", x - 8, yy + h / 2, lab, lsize, anchor="end", mono=True, weight="bold")
        ids[key] = waveform(s, f"{pid}{key}", x, yy, h, dx, vals, groups, tone=tone)
    return ids, ys


def show_all(ids, k):
    pats = []
    for key in ids:
        pats += reveal(ids[key], k)
    return pats


# ── ripple-counter-wave ────────────────────────────────────────────────────

@scene
def ripple_counter_wave(L):
    """A 3-bit negative-edge ripple up counter with one tick of delay per stage (seqlib.ripple_events)."""
    s = S(L)
    W, NW = 680, 360
    n, tpd = 3, 1
    clk, falls = falling_clock(8, 3, 3)
    T = len(clk) + 3
    clk = clk + [1, 1, 1]
    ev = sq.ripple_events(n, tpd, falls)
    st = states_per_tick(ev, T)
    settled = sq.settled_states(ev, falls, T)
    assert settled == [1, 2, 3, 4, 5, 6, 7, 0]
    chains = [chain_between(ev, f, f + 6) for f in falls]
    assert chains[3] == [3, 2, 0, 4] and chains[7] == [7, 6, 4, 0]
    assert max(len(c) for c in chains) - 1 == n
    s.head("A 3-bit ripple up counter: each stage clocks the next", "3-bit ripple up counter", W, NW)
    bw, bh, gap = s.v(84, 60), 52, s.v(70, 38)
    bx0, by = s.v(170, 74), 64
    pins = tff_chain(s, "ff", n, bx0, by, bw, bh, gap)
    xin = bx0 - s.v(60, 30)
    s.wire("wclk", (xin, pins[0][">"][1]), pins[0][">"])
    s.text("lclk", xin - 6, pins[0][">"][1], "CLK", s.v(14, 12), anchor="end", mono=True, weight="bold")
    for i in range(n):
        s.text(f"v{i}", bx0 + i * (bw + gap) + bw / 2, by - 12, f"Q{i} = 0", s.v(13, 12), anchor="middle", mono=True, tone="muted")
    x0, dx = s.v(110, 52), s.v(10.5, 5.6)
    h, rgap = s.v(18, 16), s.v(40, 36)
    y0 = by + bh + s.v(56, 52)
    groups = [(0, falls[0])] + [(falls[k], falls[k + 1] if k + 1 < len(falls) else T) for k in range(len(falls))]
    rows = [("c", "CLK", clk, "ink")] + [(f"q{i}", f"Q{i}", [(x >> i) & 1 for x in st], "accent") for i in range(n)]
    ids, ys = rows_panel(s, "w", rows, x0, y0, dx, h, rgap, groups, s.v(14, 12))
    ytop, ybot = y0 - 6, ys[f"q{n - 1}"] + h + 6
    edge_marks(s, "m", falls, x0, dx, ytop, ybot, s.v(13, 12))
    s.text("st", s.v(W / 2, NW / 2), ybot + 24, "state Q2Q1Q0 = 000", s.v(15, 13), anchor="middle", mono=True, weight="bold")
    s.text("sub", s.v(W / 2, NW / 2), ybot + 48, "", s.v(13, 12), anchor="middle", tone="muted")

    def stage_pats(state, toggled):
        p = []
        for i in range(n):
            v = (state >> i) & 1
            p += [(f"v{i}", {"text": f"Q{i} = {v}", "tone": tv(v)}), (f"ff{i}", {"tone": "accent" if i in toggled else "muted"})]
        for i in range(n - 1):
            p.append((f"ffw{i}", {"tone": "accent" if i + 1 in toggled else "muted"}))
        return p

    s.step("All three flip-flops start at 0. Each is a T flip-flop with T = 1 that toggles on a falling edge at its clock pin; one t_pd = 1 tick.",
           *show_all(ids, 0), *stage_pats(0, []), ("sub", {"text": "only Q0 sees the real clock", "tone": "muted"}))
    for k, f in enumerate(falls):
        ch = chains[k]
        toggled = [i for i in range(n) if any(((ch[j] ^ ch[j + 1]) >> i) & 1 for j in range(len(ch) - 1))]
        m = len(ch) - 1
        path = " → ".join(b3(q) for q in ch)
        if m == 1:
            cap = f"Edge {k + 1}: Q0 toggles {ch[0] & 1} → {ch[1] & 1}. A rising Q0 is not a falling edge, so Q1 is not clocked: {path}."
        else:
            cap = f"Edge {k + 1}: each falling Q clocks the next stage one t_pd later: {path}, settled {m} t_pd after the edge."
        pats = show_all(ids, k + 1) + stage_pats(ch[-1], toggled)
        pats += [(f"m{k}", {"hidden": False, "tone": "accent"}), (f"mt{k}", {"hidden": False, "tone": "accent"})]
        if k:
            pats += [(f"m{k - 1}", {"tone": "muted"}), (f"mt{k - 1}", {"tone": "muted"})]
        tone = "danger" if m > 2 else "accent" if m == 2 else "ink"
        pats += [("st", {"text": path if m > 1 else f"state = {b3(ch[-1])} ({ch[-1]})", "tone": tone}),
                 ("sub", {"text": f"count {ch[-1]}; {m - 1} false state{'s' if m - 1 != 1 else ''} on the way" if m > 1 else f"count {ch[-1]}", "tone": "muted"})]
        assert len(cap) <= 140, (len(cap), cap)
        s.step(cap, *pats)
    worst = [k + 1 for k, c in enumerate(chains) if len(c) - 1 == n]
    s.step(f"Eight edges count 0 … 7 and wrap to 0. Edges {worst[0]} and {worst[1]} ripple through all {n} stages: two false states, settled after {n} t_pd.",
           *stage_pats(0, []), ("m7", {"tone": "muted"}), ("mt7", {"tone": "muted"}),
           ("st", {"text": "settle time = n · t_pd (worst case)", "tone": "accent"}), ("sub", {"text": "the carry ripples like a wave", "tone": "muted"}))
    return s.done("A 3-bit ripple up counter and its transient states", (W, ybot + 64), (NW, ybot + 64),
                  "Three T flip-flops with T = 1 toggle on the falling edge of their clock pin; CLK drives Q0, Q0 clocks Q1 and Q1 "
                  "clocks Q2. Each stage has a delay of one tick. The waveforms grow one clock period per step.")


# ── mod-n-clear ────────────────────────────────────────────────────────────

@scene
def mod_n_clear(L):
    """Mod-6 from a 3-bit ripple counter: an AND of Q2 and Q1 drives an asynchronous clear."""
    s = S(L)
    W, NW = 680, 360
    n, tpd, tclr = 3, 1, 1
    clk, falls = falling_clock(7, 3, 3)
    T = len(clk) + 3
    clk = clk + [1, 1, 1]
    cond = lambda q: (q >> 2) & 1 and (q >> 1) & 1  # noqa: E731
    ev = sq.ripple_events(n, tpd, falls, clear=cond, tclr=tclr)
    st = states_per_tick(ev, T)
    settled = sq.settled_states(ev, falls, T)
    assert settled == [1, 2, 3, 4, 5, 0, 1]
    chains = [chain_between(ev, f, f + 6) for f in falls]
    assert chains[5] == [5, 4, 6, 0]
    clr = [1 if cond(q) else 0 for q in st]
    assert sum(clr) == tclr and all(not cond(q) for q in settled)
    # detecting only the 1 bits of 6 is safe: 7 is never reached and no transient has Q2 = Q1 = 1 before 6
    assert all(not cond(q) for c in chains[:5] for q in c)
    s.head("Mod-6 from a 3-bit ripple counter: clear the moment 110 appears", "Mod-6 by asynchronous clear", W, NW)
    bw, bh, gap = s.v(84, 60), 64, s.v(70, 38)
    bx0, by = s.v(170, 74), 64
    pins = tff_chain(s, "ff", n, bx0, by, bw, bh, gap, clear=True)
    xin = bx0 - s.v(60, 30)
    s.wire("wclk", (xin, pins[0][">"][1]), pins[0][">"])
    s.text("lclk", xin - 6, pins[0][">"][1], "CLK", s.v(14, 12), anchor="end", mono=True, weight="bold")
    for i in range(n):
        s.text(f"v{i}", bx0 + i * (bw + gap) + bw / 2, by - 12, f"Q{i} = 0", s.v(13, 12), anchor="middle", mono=True, tone="muted")
    # the clear bus under the blocks and the AND gate below it
    ybus = by + bh + 18
    cx = [pins[i]["CLR"][0] for i in range(n)]
    gw, gh = s.v(48, 40), 34
    gx = cx[1] + s.v(10, 0)
    gy = ybus + 16
    gpins, gout = s.gate("and", gx, gy, gw, gh, "and")
    xr = max(cx[-1], gout[0] + 14)
    s.line("bus", [[cx[0], ybus], [xr, ybus], [xr, gout[1]], list(gout)])
    for i in range(n):
        s.line(f"drop{i}", [[cx[i], ybus], list(pins[i]["CLR"])])
    for j, lab in enumerate(["Q2", "Q1"]):
        p = gpins[j]
        s.line(f"gin{j}", [[p[0] - s.v(22, 16), p[1]], list(p)])
        s.text(f"gl{j}", p[0] - s.v(26, 20), p[1], lab, s.v(13, 12), anchor="end", mono=True, weight="bold")
    s.text("gt", gx + gw + s.v(26, 16), gy + gh + 12, "", s.v(13, 12), anchor="end", mono=True)
    x0, dx = s.v(110, 52), s.v(11.5, 6.3)
    h, rgap = s.v(18, 16), s.v(38, 34)
    y0 = gy + gh + s.v(54, 50)
    groups = [(0, falls[0])] + [(falls[k], falls[k + 1] if k + 1 < len(falls) else T) for k in range(len(falls))]
    rows = [("c", "CLK", clk, "ink")] + [(f"q{i}", f"Q{i}", [(x >> i) & 1 for x in st], "accent") for i in range(n)]
    rows.append(("r", "CLR", clr, "danger"))
    ids, ys = rows_panel(s, "w", rows, x0, y0, dx, h, rgap, groups, s.v(14, 12))
    ytop, ybot = y0 - 6, ys["r"] + h + 6
    edge_marks(s, "m", falls, x0, dx, ytop, ybot, s.v(13, 12))
    s.text("st", s.v(W / 2, NW / 2), ybot + 24, "count 0", s.v(15, 13), anchor="middle", mono=True, weight="bold")
    s.text("sub", s.v(W / 2, NW / 2), ybot + 48, "", s.v(13, 12), anchor="middle", tone="muted")

    def stage_pats(state, toggled, firing=False):
        p = []
        for i in range(n):
            v = (state >> i) & 1
            p += [(f"v{i}", {"text": f"Q{i} = {v}", "tone": tv(v)}), (f"ff{i}", {"tone": "danger" if firing else "accent" if i in toggled else "muted"})]
        p += [("bus", {"tone": "danger" if firing else "muted"})] + [(f"drop{i}", {"tone": "danger" if firing else "muted"}) for i in range(n)]
        return p

    s.step("A 3-bit ripple up counter whose flip-flops have an asynchronous clear. The AND gate watches Q2 and Q1, the 1 bits of 6 = 110.",
           *show_all(ids, 0), *stage_pats(0, []), ("sub", {"text": "CLR = Q2 · Q1", "tone": "muted"}))
    seen = []
    for k, f in enumerate(falls):
        ch = chains[k]
        fired = any(cond(q) for q in ch)
        toggled = [i for i in range(n) if any(((ch[j] ^ ch[j + 1]) >> i) & 1 for j in range(len(ch) - 1))]
        pats = show_all(ids, k + 1) + [(f"m{k}", {"hidden": False, "tone": "accent"}), (f"mt{k}", {"hidden": False, "tone": "accent"})]
        if k:
            pats += [(f"m{k - 1}", {"tone": "muted"}), (f"mt{k - 1}", {"tone": "muted"})]
        if fired:
            six = next(j for j, q in enumerate(ch) if cond(q))
            path = " → ".join(b3(q) for q in ch[:six + 1])
            cap = f"Edge {k + 1}: {path}. Q2 = Q1 = 1, the gate fires and the clear wipes every stage to 000 within one clear delay."
            pats += stage_pats(ch[-1], toggled, True) + [("st", {"text": f"{path} → {b3(ch[-1])}", "tone": "danger"}),
                                                         ("sub", {"text": "6 lives for one clear delay only", "tone": "danger"}),
                                                         ("gt", {"text": "fires", "tone": "danger"})]
        else:
            seen.append(ch[-1])
            cap = f"Edge {k + 1}: the counter settles at {b3(ch[-1])} = {ch[-1]}. Q2 · Q1 = 0, so the clear stays inactive."
            pats += stage_pats(ch[-1], toggled) + [("st", {"text": f"count {ch[-1]}", "tone": "ink"}),
                                                   ("sub", {"text": "CLR = 0", "tone": "muted"}), ("gt", {"text": "", "tone": "muted"})]
        assert len(cap) <= 140, (len(cap), cap)
        s.step(cap, *pats)
    cyc = sorted(set([0] + seen))
    assert cyc == [0, 1, 2, 3, 4, 5]
    s.step("The settled states are 0, 1, 2, 3, 4, 5, then 0: a mod-6 counter. Detect N itself (not N − 1), because the clear acts at once.",
           *stage_pats(settled[-1], []), ("m6", {"tone": "muted"}), ("mt6", {"tone": "muted"}),
           ("st", {"text": "0 → 1 → 2 → 3 → 4 → 5 → 0", "tone": "accent"}), ("sub", {"text": "mod-6: six stable states", "tone": "muted"}))
    return s.done("A mod-6 counter made by clearing a ripple counter at 110", (W, ybot + 64), (NW, ybot + 64),
                  "A 3-bit ripple up counter (one tick of delay per stage) whose flip-flops have an asynchronous clear driven by "
                  "Q2 AND Q1. The waveforms grow one clock period per step; CLR is the gate output.")


# ── frequency-divider ──────────────────────────────────────────────────────

@scene
def frequency_divider(L):
    """CLK, Q0, Q1, Q2 of a 3-bit ripple counter (delays ignored): periods 2T, 4T, 8T."""
    s = S(L)
    W, NW = 680, 360
    n = 3
    clk, falls = falling_clock(12, 2, 2)
    T = len(clk) + 2
    clk = clk + [1, 1]
    ev = sq.ripple_events(n, 0, falls)
    st = states_per_tick(ev, T)
    assert sq.settled_states(ev, falls, T) == [1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4]
    qs = [[(x >> i) & 1 for x in st] for i in range(n)]
    P = 4  # clock period in ticks

    def period(w):
        rises = [t for t in range(1, len(w)) if w[t - 1] == 0 and w[t] == 1]
        return (rises[1] - rises[0] if len(rises) > 1 else None), rises

    per = [period(q) for q in qs]
    assert per[0][0] == 2 * P and per[1][0] == 4 * P
    # Q2: rising edges 8T apart, and high for half of that
    f2 = [t for t in range(1, T) if qs[2][t - 1] == 1 and qs[2][t] == 0]
    assert per[2][0] == 8 * P and f2[0] - per[2][1][0] == 4 * P  # high for half of its 8T period
    div = [2, 4, 8]
    s.head("A ripple counter is a chain of divide-by-two stages", "Ripple counter = frequency divider", W, NW)
    x0, dx = s.v(110, 54), s.v(9.6, 5.0)
    h, rgap = s.v(20, 18), s.v(52, 46)
    y0 = 70
    groups = [(0, falls[0])] + [(falls[k], falls[k + 1] if k + 1 < len(falls) else T) for k in range(len(falls))]
    rows = [("c", "CLK", clk, "ink")] + [(f"q{i}", f"Q{i}", qs[i], "accent") for i in range(n)]
    ids, ys = rows_panel(s, "w", rows, x0, y0, dx, h, rgap, groups, s.v(14, 12))
    xr = x0 + T * dx + s.v(14, 6)
    labs = ["f"] + [f"f/{d}" for d in div]
    for i, (key, *_r) in enumerate(rows):
        s.text(f"fr{i}", xr, ys[key] + h / 2, labs[i], s.v(14, 12), anchor="start", mono=True, weight="bold", hidden=True, tone="accent")
    ybot = ys[f"q{n - 1}"] + h + 6
    # one-period brackets under each Q row (hidden until its step)
    for i in range(n):
        a = per[i][1][0]
        b = a + div[i] * P
        yb = ys[f"q{i}"] + h + 8
        s.line(f"br{i}", [[x0 + a * dx, yb - 4], [x0 + a * dx, yb], [x0 + b * dx, yb], [x0 + b * dx, yb - 4]], tone="accent", hidden=True)
        s.text(f"bt{i}", x0 + (a + b) / 2 * dx, yb + 12, f"{div[i]}T", s.v(13, 12), anchor="middle", mono=True, tone="accent", hidden=True)
    edge_marks(s, "m", falls, x0, dx, y0 - 6, ybot, s.v(13, 12))
    ybot += 24
    s.text("st", s.v(W / 2, NW / 2), ybot + 18, "clock period T", s.v(15, 13), anchor="middle", weight="bold")
    s.step("Clock period T. Q0 toggles at every falling edge of CLK; Q1 at every falling edge of Q0; Q2 at every falling edge of Q1.",
           *show_all(ids, 0), ("st", {"text": "clock period T, frequency f", "tone": "ink"}))
    for k, f in enumerate(falls):
        s_ = st[f]
        cap = f"Falling edge {k + 1}: the count becomes {b3(s_)} = {s_}." + (" Q0 has fallen, so Q1 toggles too." if (s_ & 1) == 0 else "")
        if s_ % 4 == 0:
            cap += " Q1 has fallen as well: Q2 toggles."
        pats = show_all(ids, k + 1) + [(f"m{k}", {"hidden": False, "tone": "accent"}), (f"mt{k}", {"hidden": False, "tone": "accent"})]
        if k:
            pats += [(f"m{k - 1}", {"tone": "muted"}), (f"mt{k - 1}", {"tone": "muted"})]
        pats += [("st", {"text": f"count {s_}", "tone": "ink"})]
        assert len(cap) <= 140, (len(cap), cap)
        s.step(cap, *pats)
    for i in range(n):
        cap = (f"Q{i} repeats every {div[i]} clock periods: period {div[i]}T, frequency f/{div[i]}."
               + (" Each stage halves the frequency of the one before." if i == 1 else "")
               + (" The third stage is Q2, at f/8." if i == 2 else ""))
        pats = [(f"br{i}", {"hidden": False}), (f"bt{i}", {"hidden": False}), (f"fr{i + 1}", {"hidden": False}),
                ("st", {"text": f"Q{i}: f/{div[i]}", "tone": "accent"})]
        if i == 0:
            pats += [("fr0", {"hidden": False})]
            pats += [(f"{w}{k}", {"hidden": True}) for k in range(len(falls)) for w in ("m", "mt")]
        s.step(cap, *pats)
    s.step("Stage i of a ripple counter runs at f/2^(i+1); an n-bit counter's last stage gives f/2^n, here f/8 with a 50% duty cycle.",
           ("st", {"text": "n stages: f / 2ⁿ", "tone": "accent"}))
    return s.done("Frequency division in a 3-bit ripple counter", (W, ybot + 40), (NW, ybot + 40),
                  "The clock and the outputs Q0, Q1 and Q2 of a 3-bit negative-edge ripple counter (delays ignored), one clock "
                  "period per step; then each output's period is marked.")
