"""Chapter 6, Lesson 1 scenes (feedback, latches and races). Every value comes from seqlib:
fixed points of the loop, the gate-delay simulation of the NOR and NAND latches, the MUX latch."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import seqlib as sq  # noqa: E402
from _viz_ch6_base import S, lv, reveal, scene, tv, vtext, waveform  # noqa: E402


@scene
def feedback_stability(L):
    """Cut the loop Q = aQ + ab + bQ and test Q = 0 and Q = 1 for every input pair (1991)."""
    s = S(L)
    W, NW = 680, 360
    gates = [("Q", "OR", ["t1", "t2", "t3"]), ("t1", "AND", ["a", "Q"]), ("t2", "AND", ["a", "b"]), ("t3", "AND", ["b", "Q"])]

    def f(a, b, q):
        e = {"a": a, "b": b, "Q": q}
        e["t1"], e["t2"], e["t3"] = a & q, a & b, b & q
        return sq.gate_out(gates[0], e)

    rows = [(a, b) for a in (0, 1) for b in (0, 1)]
    fps = {(a, b): sorted(fp["Q"] for fp in sq.fixed_points(gates, {"a": a, "b": b})) for a, b in rows}
    assert fps == {(0, 0): [0], (0, 1): [0, 1], (1, 0): [0, 1], (1, 1): [1]}
    s.head("Cut the loop: which values of Q reproduce themselves?", "Cut the loop and test Q", W, NW)
    # The loop as a block: a, b and Q (assumed) in, Q (produced) out, the feedback cut underneath.
    bx, by, bw, bh = s.v(250, 116), 52, s.v(200, 150), 92
    s.box("blk", bx, by, bw, bh)
    s.text("blkf", bx + bw / 2, by + 30, "f = aQ + ab + bQ", s.v(15, 13), anchor="middle", mono=True, weight="bold")
    s.text("blkn", bx + bw / 2, by + 58, "majority of a, b, Q", s.v(13, 12), anchor="middle", tone="muted")
    ya, yb_, yin = by + 18, by + 44, by + 74
    xl = bx - s.v(70, 46)
    s.line("wa", [[xl, ya], [bx, ya]])
    s.text("la", xl - 6, ya, "a", s.v(15, 13), anchor="end", mono=True, weight="bold")
    s.line("wb", [[xl, yb_], [bx, yb_]])
    s.text("lb", xl - 6, yb_, "b", s.v(15, 13), anchor="end", mono=True, weight="bold")
    xo = bx + bw + s.v(40, 16)
    s.line("wq", [[bx + bw, by + bh / 2], [xo, by + bh / 2]])
    s.text("lqo", xo + 6, by + bh / 2, "Q out", s.v(14, 12), anchor="start", mono=True, weight="bold")
    # the cut feedback: from the output round under the block into the Q input
    ybot = by + bh + 22
    xr = bx + bw + s.v(20, 8)
    s.line("wfb", [[xr, by + bh / 2], [xr, ybot], [xl, ybot], [xl, yin], [bx, yin]], dashed=True, tone="muted")
    s.text("lqi", xl - 6, yin, "Q in", s.v(14, 12), anchor="end", mono=True, weight="bold")
    s.text("cut", s.v(W / 2, NW / 2), ybot + 20, "the loop is cut: assume Q in, compute Q out", s.v(13, 12), anchor="middle", tone="muted")
    # The table.
    tx, ty = s.v(45, 12), ybot + 44
    cw = s.v(118, 67)
    head = ["a b", "f if Q=0", "f if Q=1", "stable Q", "the loop is"] if s.wd else ["a b", "Q=0", "Q=1", "stable", "acts as"]
    empty = [head] + [[f"{a} {b}", "", "", "", ""] for a, b in rows]
    s.table("tt", tx, ty, cw, 28, empty)
    s.text("res", s.v(W / 2, NW / 2), ty + 5 * 28 + 24, "", s.v(15, 13), anchor="middle", weight="bold")
    cur = [list(r) for r in empty]
    word = {(0, 0): "constant 0", (0, 1): "memory", (1, 0): "memory", (1, 1): "constant 1"}
    nword = {(0, 0): "0", (0, 1): "hold", (1, 0): "hold", (1, 1): "1"}
    for k, (a, b) in enumerate(rows):
        for q in (0, 1):
            out = f(a, b, q)
            cur[k + 1][1 + q] = str(out)
            ok = out == q
            cap = (f"a = {a}, b = {b}: assume Q in = {q}; the block gives Q out = {out}, "
                   + ("the same, so Q = %d is stable." % q if ok else "different, so Q = %d cannot last." % q))
            s.step(cap, ("tt", {"rows": [list(r) for r in cur], "highlight": [[k + 1, 1 + q]]}),
                   ("wa", {"tone": tv(a)}), ("wb", {"tone": tv(b)}), ("wfb", {"tone": tv(q)}), ("wq", {"tone": tv(out)}),
                   ("lqi", {"text": f"Q in = {q}", "tone": tv(q)}), ("lqo", {"text": f"Q out = {out}", "tone": tv(out)}),
                   ("la", {"text": f"a={a}", "tone": tv(a)}), ("lb", {"text": f"b={b}", "tone": tv(b)}))
        st = fps[(a, b)]
        cur[k + 1][3] = " or ".join(map(str, st)) if s.wd else ",".join(map(str, st))
        cur[k + 1][4] = word[(a, b)] if s.wd else nword[(a, b)]
        s.step(f"a b = {a}{b}: stable Q = {' and '.join(map(str, st))}, so the loop acts as {word[(a, b)]}"
               + (" (it keeps the old Q)." if len(st) == 2 else "."),
               ("tt", {"rows": [list(r) for r in cur], "highlight": [[k + 1, 3], [k + 1, 4]]}))
    s.step("The loop holds a bit when a ≠ b, and is forced to a = b otherwise: the 1991 table 0, Q, Q, 1.",
           ("tt", {"highlight": [[2, 4], [3, 4]]}), ("res", {"text": "ab = 00 → 0, 01 → Q, 10 → Q, 11 → 1", "tone": "accent"}))
    return s.done("Stable states of a feedback loop, found by cutting it", (W, ty + 5 * 28 + 44), (NW, ty + 5 * 28 + 44),
                  "A combinational block f(a, b, Q) = aQ + ab + bQ with its output Q fed back to its own input. "
                  "The loop is cut, Q in is assumed 0 or 1, and Q out is compared with it.")


def latch_scene(s, kind, seq, hold, W, NW, title_w, title_n):
    """A cross-coupled latch (NOR or NAND) driven through `seq`, gate delay by gate delay, with the
    waveforms of S, R, Q and Q̄ underneath."""
    hist, summ = sq.latch_run(kind, seq, q0=(0, 1), hold=hold)
    T = len(hist)
    g = kind.lower()
    gw, gh = s.v(70, 56), s.v(52, 46)
    gx = s.v(210, 120)
    y1, y2 = s.v(56, 50), s.v(150, 132)
    p1, o1 = s.gate("g1", gx, y1, gw, gh, g)
    p2, o2 = s.gate("g2", gx, y2, gw, gh, g)
    sname, rname = ("S", "R") if kind == "NOR" else ("S̄", "R̄")
    # G1 (output Q): pin0 = R (NOR) / S̄ (NAND); G2 (output Q̄): pin1 = S (NOR) / R̄ (NAND).
    top_in, bot_in = (rname, sname) if kind == "NOR" else (sname, rname)
    xin = gx - s.v(100, 70)
    s.wire("wtop", (xin, p1[0][1]), p1[0])
    s.text("ltop", xin - 6, p1[0][1], top_in, s.v(15, 13), anchor="end", mono=True, weight="bold")
    s.wire("wbot", (xin, p2[1][1]), p2[1])
    s.text("lbot", xin - 6, p2[1][1], bot_in, s.v(15, 13), anchor="end", mono=True, weight="bold")
    xq = o1[0] + s.v(70, 52)
    s.wire("wq", o1, (xq, o1[1]))
    s.text("lq", xq + 6, o1[1], "Q", s.v(15, 13), anchor="start", mono=True, weight="bold")
    s.wire("wqb", o2, (xq, o2[1]))
    s.text("lqb", xq + 6, o2[1], "Q̄", s.v(15, 13), anchor="start", mono=True, weight="bold")
    # Cross-coupling: Q → G2 pin0, Q̄ → G1 pin1, crossing between the gates.
    xa, xb = o1[0] + s.v(22, 16), gx - s.v(28, 22)
    ym1, ym2 = y1 + gh + s.v(14, 10), y2 - s.v(14, 10)
    s.line("fq", [[xa, o1[1]], [xa, ym1], [xb + 8, ym2], [xb + 8, p2[0][1]], [p2[0][0], p2[0][1]]])
    s.line("fqb", [[xa + 8, o2[1]], [xa + 8, ym2], [xb, ym1], [xb, p1[1][1]], [p1[1][0], p1[1][1]]])
    # Waveforms.
    wy = s.v(250, 228)
    dx = s.v(18, 10.5)
    wx = s.v(70, 40)
    names = [("S", [h["S"] for h in hist]), ("R", [h["R"] for h in hist]), ("Q", [h["Q"] for h in hist]), ("Qb", [h["Qb"] for h in hist])]
    lab = {"S": sname, "R": rname, "Q": "Q", "Qb": "Q̄"}
    groups = [(k * hold, (k + 1) * hold) for k in range(len(seq))]
    wave_ids = {}
    for i, (nm, vals) in enumerate(names):
        yy = wy + i * s.v(30, 28)
        s.text(f"wl{nm}", wx - 8, yy + 9, lab[nm], s.v(14, 12), anchor="end", mono=True, weight="bold")
        wave_ids[nm] = waveform(s, f"w{nm}", wx, yy, 18, dx, vals, groups, tone="accent" if nm in ("Q", "Qb") else "ink")
    s.text("tl", wx, wy - 14, "one column = one gate delay", s.v(13, 12), anchor="start", tone="muted")
    s.text("st", s.v(W / 2, NW / 2), wy + 4 * s.v(30, 28) + 12, "", s.v(14, 12), anchor="middle", weight="bold")
    return hist, summ, wave_ids, groups, (sname, rname)


def latch_steps(s, kind, seq, hold, hist, summ, wave_ids, groups, names, words):
    sname, rname = names
    for k, (a, b) in enumerate(seq):
        seg = hist[k * hold:(k + 1) * hold]
        pats = []
        for nm in ("S", "R", "Q", "Qb"):
            pats += reveal(wave_ids[nm], k)
        last = seg[-1]
        top = last["R"] if kind == "NOR" else last["S"]
        bot = last["S"] if kind == "NOR" else last["R"]
        pats += [("wtop", {"tone": tv(top)}), ("wbot", {"tone": tv(bot)}),
                 ("ltop", {"text": f"{'R' if kind == 'NOR' else 'S̄'}={top}", "tone": tv(top)}),
                 ("lbot", {"text": f"{'S' if kind == 'NOR' else 'R̄'}={bot}", "tone": tv(bot)})]
        _, _, q, qb = summ[k]
        if q == "osc":
            flips = [(h["Q"], h["Qb"]) for h in seg]
            pats += [("wq", {"tone": "danger"}), ("wqb", {"tone": "danger"}), ("fq", {"tone": "danger"}), ("fqb", {"tone": "danger"}),
                     ("lq", {"text": "Q osc", "tone": "danger"}), ("lqb", {"text": "Q̄ osc", "tone": "danger"}),
                     ("st", {"text": "oscillating: " + " → ".join(f"{x}{y}" for x, y in flips[:4]) + " …", "tone": "danger"})]
        else:
            pats += [("wq", {"tone": tv(q)}), ("wqb", {"tone": tv(qb)}), ("fq", {"tone": tv(q)}), ("fqb", {"tone": tv(qb)}),
                     ("lq", {"text": f"Q={q}", "tone": tv(q)}), ("lqb", {"text": f"Q̄={qb}", "tone": tv(qb)}),
                     ("st", {"text": f"{sname}{rname} = {a}{b}: Q Q̄ = {q}{qb}", "tone": "ink"})]
        s.step(words[k], *pats)


@scene
def sr_latch_feedback(L):
    s = S(L)
    W, NW = 680, 360
    seq = [(1, 0), (0, 0), (0, 1), (0, 0), (1, 1), (0, 0)]
    hold = 5
    s.head("The NOR latch, one gate delay per column", "NOR latch, gate by gate", W, NW)
    hist, summ, wid, groups, names = latch_scene(s, "NOR", seq, hold, W, NW, "", "")
    assert summ[:5] == [(1, 0, 1, 0), (0, 0, 1, 0), (0, 1, 0, 1), (0, 0, 0, 1), (1, 1, 0, 0)] and summ[5][2] == "osc"
    # Gate-delay detail of the set and of the race, for the captions.
    set_q = [(h["Q"], h["Qb"]) for h in hist[0:hold]]
    race = [(h["Q"], h["Qb"]) for h in hist[5 * hold:6 * hold]]
    assert set_q[:3] == [(0, 1), (0, 0), (1, 0)] and race[:4] == [(0, 0), (1, 1), (0, 0), (1, 1)]
    words = [
        "S = 1, R = 0: Q̄ = NOR(1, Q) falls to 0 after one delay, then Q = NOR(0, 0) rises to 1. Set: Q = 1.",
        "S = R = 0: each gate now just inverts the other's output, and Q = 1, Q̄ = 0 feeds itself. Hold.",
        "R = 1: Q = NOR(1, Q̄) falls to 0, then Q̄ = NOR(0, 0) rises to 1. Reset: Q = 0.",
        "S = R = 0 again: the loop keeps Q = 0. The latch remembers which input was 1 last.",
        "S = R = 1: both NORs see a 1, so Q = Q̄ = 0. The outputs are no longer complements: the forbidden input.",
        "Both inputs drop together: each gate sees 0, 0 and rises, then each sees a 1 and falls, again and again.",
    ]
    latch_steps(s, "NOR", seq, hold, hist, summ, wid, groups, names, words)
    s.step("With equal gate delays the race never ends. With unequal delays the faster gate wins, so the final Q cannot be predicted.",
           ("st", {"text": "release from 11 → 00: a race", "tone": "danger"}))
    return s.done("The NOR SR latch: set, hold, reset, and the race into oscillation", (W, 392), (NW, 366),
                  "Two NOR gates, each output feeding the other gate. S and R are active high. "
                  "Waveforms of S, R, Q and Q̄ grow below, one column per gate delay.")


@scene
def nand_latch(L):
    s = S(L)
    W, NW = 680, 360
    seq = [(0, 1), (1, 1), (1, 0), (1, 1), (0, 0), (1, 1)]
    hold = 5
    s.head("The NAND latch: active-low inputs S̄ and R̄", "NAND latch (active low)", W, NW)
    hist, summ, wid, groups, names = latch_scene(s, "NAND", seq, hold, W, NW, "", "")
    assert summ[:5] == [(0, 1, 1, 0), (1, 1, 1, 0), (1, 0, 0, 1), (1, 1, 0, 1), (0, 0, 1, 1)] and summ[5][2] == "osc"
    words = [
        "S̄ = 0 (a 0 does the work): Q = NAND(0, Q̄) = 1, then Q̄ = NAND(1, 1) = 0. Set: Q = 1.",
        "S̄ = R̄ = 1: the inputs are idle and the loop holds Q = 1. For a NAND latch, 11 is hold.",
        "R̄ = 0: Q̄ = NAND(0, Q) = 1, then Q = NAND(1, 1) = 0. Reset: Q = 0.",
        "S̄ = R̄ = 1 again: hold Q = 0.",
        "S̄ = R̄ = 0: both NANDs see a 0, so Q = Q̄ = 1 (GATE 2004: Q = 1, Q′ = 1, not 'indeterminate').",
        "Both go back to 1 together (00 → 11, IT 2007): each gate sees 1, 1 and falls, then rises: oscillation.",
    ]
    latch_steps(s, "NAND", seq, hold, hist, summ, wid, groups, names, words)
    s.step("NAND latch: 11 holds, 01 sets, 10 resets, 00 is forbidden. It is the NOR latch with every input level inverted.",
           ("st", {"text": "00 → 11 races, like 11 → 00 on a NOR latch", "tone": "danger"}))
    return s.done("The NAND SR latch: active-low inputs and its forbidden 00", (W, 392), (NW, 366),
                  "Two NAND gates, cross-coupled. The inputs S̄ and R̄ are active low: a 0 sets or resets. "
                  "Waveforms grow below, one column per gate delay.")


@scene
def mux_latch(L):
    s = S(L)
    W, NW = 680, 360
    gates = [("Q", "MUX", ["S", "Q", "D"])]
    Sv = [0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0]
    Dv = [1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0]
    T = len(Sv)
    hist = sq.async_sim(gates, lambda t: {"S": Sv[t], "D": Dv[t]}, {"Q": 0}, T - 1)
    Q = [h["Q"] for h in hist]
    # the latch follows D (one MUX delay later) while S = 1 and holds while S = 0
    for t in range(1, T):
        assert Q[t] == (Dv[t - 1] if Sv[t - 1] else Q[t - 1])
    for fp_s in (0, 1):
        for d in (0, 1):
            fps = [fp["Q"] for fp in sq.fixed_points(gates, {"S": fp_s, "D": d})]
            assert fps == ([0, 1] if fp_s == 0 else [d])
    s.head("A 2:1 MUX with its output fed back to input 0", "MUX with feedback = D latch", W, NW)
    bx, by, bw, bh = s.v(250, 140), s.v(56, 50), 90, 96
    P = s.block("mux", bx, by, bw, bh, left=["0", "1"], right=["Q"], bottom=["S"], title="MUX", title_xy=(bx + bw / 2, by + 36))
    yq = P["Q"][1]
    xo = bx + bw + s.v(70, 50)
    s.wire("wq", P["Q"], (xo, yq))
    s.text("lq", xo + 6, yq, "Q", s.v(15, 13), anchor="start", mono=True, weight="bold")
    ytop = by - 14
    s.line("fb", [[bx + bw + 30, yq], [bx + bw + 30, ytop], [bx - 30, ytop], [bx - 30, P["0"][1]], [bx, P["0"][1]]])
    xd = bx - s.v(90, 80)
    s.wire("wd", (xd, P["1"][1]), P["1"])
    s.text("ld", xd - 6, P["1"][1], "D", s.v(15, 13), anchor="end", mono=True, weight="bold")
    ys = by + bh + 22
    s.line("ws", [[xd, ys], [P["S"][0], ys], [P["S"][0], by + bh]])
    s.text("ls", xd - 6, ys, "S", s.v(15, 13), anchor="end", mono=True, weight="bold")
    wy, dx, wx = s.v(210, 200), s.v(24, 13.5), s.v(80, 50)
    per = [(k, min(k + 2, T)) for k in range(0, T, 2)]
    ids = {}
    for i, (nm, vals) in enumerate((("S", Sv), ("D", Dv), ("Q", Q))):
        yy = wy + i * 34
        s.text(f"wl{nm}", wx - 8, yy + 9, nm, s.v(14, 12), anchor="end", mono=True, weight="bold")
        ids[nm] = waveform(s, f"w{nm}", wx, yy, 18, dx, vals, per, tone="accent" if nm == "Q" else "ink")
    s.text("st", s.v(W / 2, NW / 2), wy + 3 * 34 + 14, "", s.v(14, 12), anchor="middle", weight="bold")
    for k, (a, b) in enumerate(per):
        t = b - 1
        sv, dv, qv = Sv[t], Dv[t], Q[t]
        mode = "S = 1: Q follows D (transparent)" if Sv[a] else "S = 0: input 0 is Q itself, so Q holds"
        pats = []
        for nm in ids:
            pats += reveal(ids[nm], k)
        pats += [("wd", {"tone": tv(dv)}), ("ws", {"tone": tv(sv)}), ("wq", {"tone": tv(qv)}), ("fb", {"tone": tv(qv)}),
                 ("ld", {"text": f"D={dv}", "tone": tv(dv)}), ("ls", {"text": f"S={sv}", "tone": tv(sv)}),
                 ("lq", {"text": f"Q={qv}", "tone": tv(qv)}), ("st", {"text": mode, "tone": "accent" if Sv[a] else "ink"})]
        cap = f"Ticks {a}–{b - 1}: " + ("S = 1, so the MUX passes D and Q copies it one MUX delay later." if Sv[a]
                                       else "S = 0, so the MUX passes its own output back: Q keeps its value whatever D does.")
        s.step(cap, *pats)
    s.step("Transparent while S = 1, holding while S = 0, and level- not edge-sensitive: a D latch (GATE 2023, option B).",
           ("st", {"text": "Q⁺ = S·D + S̄·Q: a D latch", "tone": "accent"}))
    return s.done("A multiplexer with feedback is a D latch", (W, 340), (NW, 340),
                  "A 2:1 multiplexer: data input 1 is D, data input 0 is the output Q fed back, select is S. "
                  "Waveforms of S, D and Q grow below.")
