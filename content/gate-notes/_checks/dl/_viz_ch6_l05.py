"""Chapter 6, Lesson 5 scenes (synchronous counter design). Every T column, K-map cell, equation,
designed next state, lock-out arc and waveform is computed with seqlib (design_counter,
designed_step, Sync, autonomous_cycles, self_starting, ripple_events), so no value or caption
number can drift from the checked maths."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import seqlib as sq  # noqa: E402
from _viz_ch6_base import S, graph, scene, tv  # noqa: E402
from _viz_ch6_l04 import chain_between, edge_marks, falling_clock, rows_panel, show_all, states_per_tick  # noqa: E402

B = sq.bstr


def neg(v):
    return 1 - v


# ── sync-counter-design: 0 → 2 → 3 → 1 with T flip-flops (GATE 2004) ──────

@scene
def sync_counter_design(L):
    """State table → T = Q ⊕ Q⁺ per bit → two K-maps → T2 = (Q2 ⊕ Q1)′, T1 = Q2 ⊕ Q1 → check."""
    s = S(L)
    W, NW = 680, 360
    seq = [0, 2, 3, 1]
    d = sq.design_counter(seq, "T", 2)
    # seqlib names the bits Q1 (MSB) and Q0; the 2004 figure calls them Q2 (MSB) and Q1.
    assert d["sop"] == {"T1": ["Q1′Q0′ + Q1Q0"], "T0": ["Q1′Q0 + Q1Q0′"]}
    step = sq.designed_step(d, "T")
    assert [step(x) for x in seq] == [2, 3, 1, 0]
    assert sq.autonomous_cycles(step, range(4)) == [[0, 2, 3, 1]]
    tcol = {x: ((x ^ d["next"][x]) >> 1 & 1, (x ^ d["next"][x]) & 1) for x in seq}
    assert [tcol[x] for x in seq] == [(1, 0), (0, 1), (1, 0), (0, 1)]
    for x in seq:  # T = Q ⊕ Q⁺ is exactly the T excitation
        assert all(sq.excitation("T", (x >> b) & 1, (d["next"][x] >> b) & 1)["T"] == tcol[x][1 - b] for b in (0, 1))
    # the circuit with the two XOR/XNOR gates, simulated as a Sync machine, counts 0, 2, 3, 1
    c = sq.Sync([("Q2", "T", {"T": lambda e: neg(e["Q2"] ^ e["Q1"])}), ("Q1", "T", {"T": lambda e: e["Q2"] ^ e["Q1"]})])
    assert [sq.val(x) for x in c.trace((0, 0), 4)] == [0, 2, 3, 1, 0]
    s.head("Designing the 0 → 2 → 3 → 1 counter with T flip-flops", "0 → 2 → 3 → 1 with T flip-flops", W, NW)
    cw, ch = s.v(64, 58), s.v(26, 24)
    tx, ty = s.v(28, 64), 62
    rows = [["Q2Q1", "Q2⁺Q1⁺", "T2", "T1"]] + [[format(x, "02b"), format(d["next"][x], "02b"), "", ""] for x in seq]
    s.table("tt", tx, ty, cw, ch, rows)
    s.text("tnote", tx + 2 * cw, ty + 5 * ch + 16, "T = Q ⊕ Q⁺: 1 where the bit changes", s.v(13, 12), anchor="middle", tone="muted")
    # two K-maps (rows Q2, columns Q1)
    kcw, kch = s.v(54, 48), s.v(28, 26)
    kx = s.v(310, 28)
    ky1 = s.v(84, ty + 5 * ch + 64)
    kx2 = s.v(kx + 3 * kcw + 30, kx + 3 * kcw + 24)
    ky2 = ky1

    def kmap_rows(col):
        r = [["", "Q1=0", "Q1=1"]]
        for q2 in (0, 1):
            r.append([f"Q2={q2}"] + [str(tcol[(q2 << 1) | q1][col]) if col is not None else "" for q1 in (0, 1)])
        return r

    blank = [["", "Q1=0", "Q1=1"], ["Q2=0", "", ""], ["Q2=1", "", ""]]
    s.table("k2", kx, ky1, kcw, kch, blank, hidden=True)
    s.table("k1", kx2, ky2, kcw, kch, blank, hidden=True)
    s.text("k2t", kx + 1.5 * kcw, ky1 - 14, "T2 map", s.v(13, 12), anchor="middle", weight="bold", hidden=True)
    s.text("k1t", kx2 + 1.5 * kcw, ky2 - 14, "T1 map", s.v(13, 12), anchor="middle", weight="bold", hidden=True)
    ey = ky1 + 3 * kch + 26
    s.text("e2", kx + 1.5 * kcw, ey, "T2 = (Q2 ⊕ Q1)′", s.v(14, 13), anchor="middle", mono=True, weight="bold", hidden=True)
    s.text("e1", kx2 + 1.5 * kcw, ey, "T1 = Q2 ⊕ Q1", s.v(14, 13), anchor="middle", mono=True, weight="bold", hidden=True)
    s.text("st", s.v(W / 2, NW / 2), ey + 40, "", s.v(14, 13), anchor="middle", weight="bold")
    s.step("Step 1, the state table: 0 → 2 → 3 → 1 → 0 in two bits Q2Q1 is 00 → 10 → 11 → 01 → 00. Every state has exactly one next state.",
           ("tt", {"highlight": [[r, c] for r in range(1, 5) for c in (0, 1)]}), ("st", {"text": "4 states, all used: no don't-cares", "tone": "ink"}))
    filled = [list(r) for r in rows]
    for k, x in enumerate(seq):
        t2, t1 = tcol[x]
        filled[k + 1][2], filled[k + 1][3] = str(t2), str(t1)
        nx = d["next"][x]
        ch2 = "changes" if t2 else "stays"
        ch1 = "changes" if t1 else "stays"
        cap = f"Row {format(x, '02b')} → {format(nx, '02b')}: Q2 {ch2} (T2 = {t2}), Q1 {ch1} (T1 = {t1}). T marks exactly the bits that flip."
        assert len(cap) <= 140, cap
        s.step(cap, ("tt", {"rows": [list(r) for r in filled], "highlight": [[k + 1, c] for c in range(4)]}),
               ("st", {"text": f"{format(x, '02b')} → {format(nx, '02b')}: T2T1 = {t2}{t1}", "tone": "accent"}))
    ones2 = [[1 + (x >> 1), 1 + (x & 1)] for x in seq if tcol[x][0]]
    ones1 = [[1 + (x >> 1), 1 + (x & 1)] for x in seq if tcol[x][1]]
    assert ones2 == [[1, 1], [2, 2]] and ones1 == [[2, 1], [1, 2]]
    s.step("Copy the T2 column into a K-map: 1s at 00 and 11, exactly where Q2 = Q1, so T2 = (Q2 ⊕ Q1)′.",
           ("tt", {"highlight": [[r, 2] for r in range(1, 5)]}), ("k2", {"hidden": False, "rows": kmap_rows(0), "highlight": ones2}),
           ("k2t", {"hidden": False}), ("e2", {"hidden": False}), ("st", {"text": "1 where Q2 = Q1: XNOR", "tone": "accent"}))
    s.step("The T1 column has 1s at 10 and 01, the other diagonal: T1 = Q2 ⊕ Q1. That is the missing input X of GATE 2004, option D.",
           ("tt", {"highlight": [[r, 3] for r in range(1, 5)]}), ("k2", {"highlight": []}), ("k1", {"hidden": False, "rows": kmap_rows(1), "highlight": ones1}),
           ("k1t", {"hidden": False}), ("e1", {"hidden": False}), ("st", {"text": "X = T1 = Q2 ⊕ Q1", "tone": "accent"}))
    s.step("Check by simulation: with these two gates the circuit steps 00 → 10 → 11 → 01 → 00. All 4 states are used, so nothing can lock out.",
           ("tt", {"highlight": []}), ("k2", {"highlight": []}), ("k1", {"highlight": []}),
           ("st", {"text": "0 → 2 → 3 → 1 → 0 ✓", "tone": "success"}))
    h = ey + 64
    return s.done("Synchronous counter design: 0 → 2 → 3 → 1 with T flip-flops", (W, h), (NW, h),
                  "Two T flip-flops Q2 (MSB) and Q1 share a clock and must step 0 → 2 → 3 → 1 → 0. The state table gets a T column per "
                  "bit (T = Q ⊕ Q⁺), each column goes into a K-map, and the maps give the two input equations.")


# ── lockout-graph: the 0 → 3 → 5 → 6 JK counter ────────────────────────────

C371 = sq.Sync([("A", "JK", {"J": lambda e: e["B"], "K": lambda e: e["B"]}),
                ("B", "JK", {"J": lambda e: 1, "K": lambda e: 1}),
                ("C", "JK", {"J": lambda e: neg(e["B"]), "K": lambda e: neg(e["B"])})])
ALT = sq.Sync([("A", "JK", {"J": lambda e: e["C"], "K": lambda e: neg(e["C"])}),
               ("B", "JK", {"J": lambda e: 1, "K": lambda e: 1}),
               ("C", "JK", {"J": lambda e: neg(e["B"]), "K": lambda e: neg(e["B"])})])


@scene
def lockout_graph(L):
    """All 8 states of the 0 → 3 → 5 → 6 JK counter: the main cycle, the lock-out cycle of the unused
    states, then two fixes (unused states forced to 000; a different but equally cheap J_A, K_A)."""
    s = S(L)
    W, NW = 680, 360
    main = [0, 3, 5, 6]
    nxt = {sq.val(x): sq.val(C371.step(x)) for x in C371.states()}
    cyc = sq.autonomous_cycles(lambda v: nxt[v], range(8))
    assert cyc == [[0, 3, 5, 6], [1, 2, 4, 7]] and not sq.self_starting(lambda v: nxt[v], range(8), main)
    # The locking wiring is one of the minimal choices that the don't-cares allow (T design: T2 = Q1, T1 = 1, T0 = Q1′).
    dT = sq.design_counter(main, "T", 3)
    assert dT["sop"] == {"T2": ["Q1"], "T1": ["1"], "T0": ["Q1′"]} and all(sq.designed_step(dT, "T")(v) == nxt[v] for v in range(8))
    # Fix 1: unused next states forced to 000 (seqlib design with unused = 0).
    dF = sq.design_counter(main, "JK", 3, unused=0)
    fstep = sq.designed_step(dF, "JK")
    fix = {v: fstep(v) for v in range(8)}
    assert all(fix[v] == nxt[v] for v in main) and all(fix[v] == 0 for v in (1, 2, 4, 7))
    assert sq.self_starting(fstep, range(8), main)
    # Cure 3 of the lesson: the same zero-gate budget, J_A = C, K_A = C′ (A copies C): every unused state enters the cycle in one clock.
    alt = {sq.val(x): sq.val(ALT.step(x)) for x in ALT.states()}
    assert all(alt[v] == nxt[v] for v in main) and {v: alt[v] for v in (1, 2, 4, 7)} == {1: 6, 2: 0, 4: 3, 7: 5}
    assert sq.self_starting(lambda v: alt[v], range(8), main)
    dJ = sq.design_counter(main, "JK", 3)
    assert dJ["sop"]["J2"] == ["Q0", "Q1"] and dJ["sop"]["K2"] == ["Q0′", "Q1"]  # both choices are minimal
    s.head("The 0 → 3 → 5 → 6 JK counter: a lock-out and two cures", "0 → 3 → 5 → 6: lock-out", W, NW)
    xs = s.v([130, 270, 410, 550], [50, 130, 210, 290])
    yt, yb = s.v(110, 112), s.v(270, 252)
    r = s.v(24, 20)
    top = ["000", "011", "101", "110"]
    bot = ["010", "100", "111", "001"]
    nodes = {k: (xs[i], yt, k) for i, k in enumerate(top)}
    nodes.update({k: (xs[i], yb, k) for i, k in enumerate(bot)})
    m_edges = [("000", "011", 0), ("011", "101", 0), ("101", "110", 0), ("110", "000", 0.35)]
    l_edges = [("001", "010", 0.35), ("010", "100", 0), ("100", "111", 0), ("111", "001", 0)]
    f_edges = [(b, "000", 0) for b in bot]
    a_edges = [(B(sq.bits(v, 3)), B(sq.bits(alt[v], 3)), 0) for v in (2, 4, 7, 1)]
    assert a_edges == [("010", "000", 0), ("100", "011", 0), ("111", "101", 0), ("001", "110", 0)]
    for a, b_, _c in m_edges + l_edges:
        assert nxt[int(a, 2)] == int(b_, 2)
    edges = [dict(a=a, b=b_, curve=c, label=None) for a, b_, c in m_edges + l_edges + f_edges + a_edges]
    g = graph(s, "g", nodes, r, edges, size=s.v(14, 12))
    groups = {"m": range(0, 4), "l": range(4, 8), "f": range(8, 12), "a": range(12, 16)}
    for e in s.els:
        if any(e["id"] in g["edges"][k] for k in range(16)):
            e["hidden"] = True
    s.text("lm", s.v(W / 2, NW / 2), yt - r - s.v(44, 40), "", s.v(13, 12), anchor="middle", tone="muted")
    s.text("st", s.v(W / 2, NW / 2), yb + r + s.v(56, 54), "", s.v(14, 13), anchor="middle", weight="bold")
    s.text("sub", s.v(W / 2, NW / 2), yb + r + s.v(80, 76), "", s.v(13, 12), anchor="middle", tone="muted")

    def arcs(key, on=True, tone="muted"):
        return [(i, {"hidden": not on, "tone": tone}) for k in groups[key] for i in g["edges"][k]]

    def node(k, tone):
        return (g["nodes"][k], {"tone": tone})

    s.step("The 8 states ABC (A = MSB) of the counter built with J_A = K_A = Q_B, J_B = K_B = 1, J_C = K_C = Q_B′. Top row: the wanted cycle.",
           ("st", {"text": "wanted: 000 → 011 → 101 → 110 → 000", "tone": "ink"}), ("sub", {"text": "001, 010, 100, 111 are unused", "tone": "muted"}))
    s.step("Simulating the circuit from 000 gives 000 → 011 → 101 → 110 → 000: the main cycle works exactly as designed.",
           *arcs("m", tone="accent"), *[node(k, "accent") for k in top], ("st", {"text": "main cycle ✓", "tone": "success"}),
           ("lm", {"text": "main cycle", "tone": "accent"}))
    path = [1, 2, 4, 7]
    for k, v in enumerate(path):
        w = nxt[v]
        e = C371.excite(sq.bits(v, 3))
        bq = sq.bits(v, 3)[1]
        what = f"A {'toggles' if e['A']['J'] else 'holds'}, B toggles, C {'toggles' if e['C']['J'] else 'holds'}"
        cap = (f"Power up in {B(sq.bits(v, 3))} (B = {bq}): {what}, so next {B(sq.bits(w, 3))}." if k == 0
               else f"From {B(sq.bits(v, 3))} (B = {bq}): {what}, so {B(sq.bits(w, 3))}.")
        assert cap.count(":") == 1, cap
        if k == 3:
            cap += " Back to 001: a lock-out cycle."
        assert len(cap) <= 140, cap
        lk = groups["l"][next(i for i, x in enumerate(l_edges) if int(x[0], 2) == v)]
        pats = [(i, {"hidden": False, "tone": "danger"}) for i in g["edges"][lk]] + [node(B(sq.bits(v, 3)), "danger")]
        pats += [("st", {"text": " → ".join(B(sq.bits(x, 3)) for x in path[:k + 1] + [w]), "tone": "danger"}),
                 ("sub", {"text": "never reaches the main cycle" if k == 3 else "still outside the main cycle", "tone": "muted"})]
        s.step(cap, *pats)
    s.step("Cure 1 (forced next states): redesign with every unused state's next state set to 000. Each one now joins the cycle in one clock.",
           *arcs("l", on=False), *arcs("f", tone="success"), *[node(k, "success") for k in bot],
           ("st", {"text": "001, 010, 100, 111 → 000", "tone": "success"}), ("sub", {"text": "self-starting; costs gates (fewer don't-cares)", "tone": "muted"}))
    s.step("Cure 3 (another minimal cover), same cost: choose J_A = Q_C, K_A = Q_C′. Unused states: 001 → 110, 010 → 000, 100 → 011, 111 → 101.",
           *arcs("f", on=False), *arcs("a", tone="success"),
           ("st", {"text": "every unused state enters the cycle", "tone": "success"}), ("sub", {"text": "same main cycle, no extra gate", "tone": "muted"}))
    s.step("The lesson: don't-cares decide where unused states go. Always simulate all 2ⁿ states of the circuit you actually built.",
           ("st", {"text": "check all 8 states, not just the 4 you wanted", "tone": "accent"}), ("sub", {"text": "", "tone": "muted"}))
    h = yb + r + s.v(100, 96)
    return s.done("Lock-out in the 0 → 3 → 5 → 6 JK counter", (W, h), (NW, h),
                  "State graph of a 3-bit JK counter designed for 0 → 3 → 5 → 6 with the unused states as don't-cares. The main "
                  "cycle is on the top row, the four unused states below; arcs appear as the circuit is simulated.")


# ── sync-vs-ripple-timing ──────────────────────────────────────────────────

@scene
def sync_vs_ripple_timing(L):
    """A 3-bit synchronous T counter and a 3-bit ripple counter on the same falling clock edges, one
    t_pd = 1 tick per flip-flop: the synchronous bits all change together, the ripple bits one after another."""
    s = S(L)
    W, NW = 680, 360
    n, tpd = 3, 1
    clk, falls = falling_clock(8, 3, 3)
    T = len(clk) + 3
    clk = clk + [1, 1, 1]
    # synchronous: T0 = 1, T1 = Q0, T2 = Q1·Q0 (seqlib design), every bit changes t_pd after the edge
    d = sq.design_counter(list(range(8)), "T")
    assert d["sop"] == {"T2": ["Q1Q0"], "T1": ["Q0"], "T0": ["1"]}
    sync = sq.Sync([("Q2", "T", {"T": lambda e: e["Q1"] & e["Q0"]}), ("Q1", "T", {"T": lambda e: e["Q0"]}), ("Q0", "T", {"T": lambda e: 1})])
    tr = [sq.val(x) for x in sync.trace((0, 0, 0), len(falls))]
    assert tr == [0, 1, 2, 3, 4, 5, 6, 7, 0]
    sst = [tr[sum(1 for f in falls if f + tpd <= t)] for t in range(T)]
    ev = sq.ripple_events(n, tpd, falls)
    rst = states_per_tick(ev, T)
    chains = [chain_between(ev, f, f + 6) for f in falls]
    assert sq.settled_states(ev, falls, T) == tr[1:]
    s.head("Synchronous versus ripple: the same count, different timing", "Synchronous vs ripple timing", W, NW)
    x0, dx = s.v(118, 60), s.v(10.5, 5.5)
    h, rgap = s.v(16, 14), s.v(34, 30)
    y0 = 60
    groups = [(0, falls[0])] + [(falls[k], falls[k + 1] if k + 1 < len(falls) else T) for k in range(len(falls))]
    rows = [("c", "CLK", clk, "ink")]
    rows += [(f"s{i}", f"S·Q{i}", [(x >> i) & 1 for x in sst], "ink") for i in range(n)]
    rows += [(f"r{i}", f"R·Q{i}", [(x >> i) & 1 for x in rst], "accent") for i in range(n)]
    ids, ys = rows_panel(s, "w", rows, x0, y0, dx, h, rgap, groups, s.v(14, 12))
    ytop, ybot = y0 - 6, ys[f"r{n - 1}"] + h + 6
    edge_marks(s, "m", falls, x0, dx, ytop, ybot, s.v(13, 12))
    s.text("ss", s.v(W / 2, NW / 2), ybot + 24, "synchronous: 000", s.v(14, 13), anchor="middle", mono=True, weight="bold")
    s.text("rs", s.v(W / 2, NW / 2), ybot + 48, "ripple: 000", s.v(14, 13), anchor="middle", mono=True, weight="bold")
    s.step("S rows: a synchronous counter (T0 = 1, T1 = Q0, T2 = Q1Q0, one clock). R rows: a ripple counter. Both use falling edges, t_pd = 1 tick.",
           *show_all(ids, 0), ("ss", {"text": "synchronous: 000", "tone": "ink"}), ("rs", {"text": "ripple: 000", "tone": "ink"}))
    for k, f in enumerate(falls):
        ch = chains[k]
        m = len(ch) - 1
        flips = bin(tr[k] ^ tr[k + 1]).count("1")
        assert flips == m
        path = " → ".join(format(q, "03b") for q in ch)
        if m == 1:
            cap = f"Edge {k + 1}: only Q0 changes, so both counters show {format(tr[k + 1], '03b')} one t_pd after the edge."
        else:
            cap = f"Edge {k + 1}: {m} bits change. Synchronous: all together after 1 t_pd. Ripple: {path}, settled after {m} t_pd."
        assert len(cap) <= 140, cap
        pats = show_all(ids, k + 1) + [(f"m{k}", {"hidden": False, "tone": "accent"}), (f"mt{k}", {"hidden": False, "tone": "accent"})]
        if k:
            pats += [(f"m{k - 1}", {"tone": "muted"}), (f"mt{k - 1}", {"tone": "muted"})]
        pats += [("ss", {"text": f"synchronous: {format(tr[k], '03b')} → {format(tr[k + 1], '03b')} (1 t_pd)", "tone": "success"}),
                 ("rs", {"text": f"ripple: {path}" if m > 1 else f"ripple: {path} (1 t_pd)", "tone": "danger" if m >= 2 else "ink"})]  # m ≥ 2: the ripple passes through a false state
        s.step(cap, *pats)
    worst = max(len(c) - 1 for c in chains)
    assert worst == n
    s.step(f"Same count 0 … 7, 0. The synchronous counter settles 1 t_pd after every edge; the ripple counter needs up to {worst} t_pd and shows false states.",
           ("m7", {"tone": "muted"}), ("mt7", {"tone": "muted"}),
           ("ss", {"text": "synchronous: settles in 1 t_pd", "tone": "success"}),
           ("rs", {"text": f"ripple: up to n · t_pd = {worst} t_pd", "tone": "danger"}))
    return s.done("A synchronous and a ripple counter on the same clock", (W, ybot + 64), (NW, ybot + 64),
                  "Two 3-bit up counters driven by the same falling clock edges, each flip-flop with one tick of delay: S rows are a "
                  "synchronous T counter, R rows a ripple counter. The waveforms grow one clock period per step.")
