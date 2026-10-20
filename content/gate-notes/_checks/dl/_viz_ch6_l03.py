"""Chapter 6, Lesson 3 scenes (analysing synchronous sequential circuits). Every next state, table
row, trace step, reachable set and caption number is a seqlib.Sync computation (step, graph, trace,
reachable, cycle_from), so no value can drift from the checked maths."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import math  # noqa: E402

import seqlib as sq  # noqa: E402
from _viz_ch6_base import S, ff_block, scene, tv  # noqa: E402

B = sq.bstr


def neg(v):
    return 1 - v


def chevron(tip, ux, uy, h):
    """Arrowhead at `tip` pointing along (ux, uy), as a 3-point polyline."""
    tx, ty = tip
    bx, by = tx - ux * h, ty - uy * h
    return [[bx - uy * h * 0.55, by + ux * h * 0.55], [tx, ty], [bx + uy * h * 0.55, by - ux * h * 0.55]]


def state_graph(s, pid, nodes, r, arcs, size, hidden=False, loop_side=None):
    """A state graph drawn only with `circle` and `line` elements (the shared layout check measures
    those): nodes {name: (cx, cy, label)}, arcs [(a, b)] in order. A straight arc runs between the two
    circle outlines and ends in a chevron head; a self-loop is an open loop above (or below) the node
    with a chevron back into it. Returns {"nodes": {name: id}, "edges": [[ids] per arc]}."""
    out = {"nodes": {}, "edges": []}
    for name, (cx, cy, lab) in nodes.items():
        nid = f"{pid}n{name}"
        s.node(nid, cx, cy, r, label=lab, size=size, mono=True, tone="ink")
        out["nodes"][name] = nid
    h = 9
    for k, (a, b) in enumerate(arcs):
        eid = f"{pid}e{k}"
        ax, ay, _ = nodes[a]
        if a == b:
            side = (loop_side or {}).get(a, "top")
            sg = -1 if side == "top" else 1
            lr = r * 0.7
            ccx, ccy = ax, ay + sg * (r + lr * 0.55)
            pts = []
            for i in range(15):
                t = math.radians(-130 + i * 260 / 14)
                pts.append([round(ccx + lr * math.sin(t), 2), round(ccy + sg * lr * math.cos(t), 2)])
            tip = pts[-1]
            d = math.hypot(ax - tip[0], ay - tip[1])
            ux, uy = (ax - tip[0]) / d, (ay - tip[1]) / d
            end = [round(ax - ux * r, 2), round(ay - uy * r, 2)]
            s.line(eid, pts + [end], tone="muted", hidden=hidden)
            s.line(eid + "h", chevron(end, ux, uy, h), tone="muted", hidden=hidden)
        else:
            bx, by, _ = nodes[b]
            d = math.hypot(bx - ax, by - ay)
            ux, uy = (bx - ax) / d, (by - ay) / d
            p0 = [ax + ux * r, ay + uy * r]
            p1 = [bx - ux * (r + 1), by - uy * (r + 1)]
            s.line(eid, [p0, p1], tone="muted", hidden=hidden)
            s.line(eid + "h", chevron(p1, ux, uy, h), tone="muted", hidden=hidden)
        out["edges"].append([eid, eid + "h"])
    return out


def edge_ids(g, k):
    return g["edges"][k]


# ── circuit-to-state-table: the 2011 circuit ─────────────────────────────

M2011 = sq.Sync([("P", "D", {"D": lambda e: e["R"]}),
                 ("Q", "D", {"D": lambda e: neg(e["P"] | e["R"])}),
                 ("R", "D", {"D": lambda e: e["Q"] & neg(e["R"])})])


@scene
def circuit_to_state_table(L):
    """Equations → the 8-row next-state table, one present state per step → the diagram and its cycle."""
    s = S(L)
    W, NW = 680, 360
    m = M2011
    states = m.states()
    nxt = {st: m.step(st) for st in states}
    exc = {st: m.excite(st) for st in states}
    pre, cyc = sq.cycle_from(m.step, (0, 0, 0))
    assert pre == [] and [B(x) for x in cyc] == ["000", "010", "011", "100"]
    assert [B(x) for x in sq.autonomous_cycles(m.step, states)[0]] == ["000", "010", "011", "100"]
    assert len(sq.autonomous_cycles(m.step, states)) == 1 and sq.self_starting(m.step, states, cyc)
    s.head("From equations to a state table and diagram (GATE 2011 circuit)", "Equations → table → diagram", W, NW)
    s.text("eq", s.v(W / 2, NW / 2), s.v(52, 48), "D flip-flops: P⁺ = R, Q⁺ = (P + R)′, R⁺ = Q·R′", s.v(14, 12),
           anchor="middle", mono=False, weight="bold")
    cw, ch = s.v(52, 46), s.v(24, 22)
    tx, ty = s.v(24, 65), s.v(76, 66)
    rows = [["PQR", "P⁺", "Q⁺", "R⁺", "next"]] + [[B(st), "", "", "", ""] for st in states]
    s.table("tt", tx, ty, cw, ch, rows)
    s.text("st", s.v(tx, NW / 2), s.v(ty + 9 * ch + 22, ty + 9 * ch + 18), "", s.v(14, 12), anchor=s.v("start", "middle"), weight="bold")
    # graph: grid positions (col, row)
    pos = {"000": (1, 0), "010": (3, 0), "011": (3, 1), "100": (1, 1), "001": (0, 1), "110": (0, 2), "101": (1.8, 2), "111": (3, 2)}
    gx, gdx, gy, gdy = s.v(350, 40), s.v(100, 93), s.v(92, 322), s.v(105, 85)
    r = s.v(22, 20)
    nodes = {k: (gx + c * gdx, gy + rr * gdy, k) for k, (c, rr) in pos.items()}
    g = state_graph(s, "g", nodes, r, [(B(st), B(nxt[st])) for st in states], s.v(14, 12), hidden=True)
    s.step("Steps 2–3: D flip-flops, so each input equation is already a state equation. Now fill one row per present state.",
           ("eq", {"tone": "accent"}))
    filled = [list(x) for x in rows]
    for k, st in enumerate(states):
        e = exc[st]
        p, q, rr = e["P"]["D"], e["Q"]["D"], e["R"]["D"]
        assert (p, q, rr) == nxt[st]
        filled[k + 1] = [B(st), str(p), str(q), str(rr), B(nxt[st])]
        pats = [("tt", {"rows": [list(x) for x in filled], "highlight": [[k + 1, c] for c in range(5)]}), ("eq", {"tone": "ink"})]
        pats += [(i, {"hidden": False, "tone": "accent"}) for i in edge_ids(g, k)]
        if k:
            pats += [(i, {"tone": "muted"}) for i in edge_ids(g, k - 1)]
        pats += [(g["nodes"][B(st)], {"tone": "accent"})] + ([(g["nodes"][B(states[k - 1])], {"tone": "ink"})] if k else [])
        pats += [("st", {"text": f"row {k + 1} of 8: {B(st)} → {B(nxt[st])}", "tone": "accent"})]
        cap = f"PQR = {B(st)}: P⁺ = R = {p}, Q⁺ = (P + R)′ = {q}, R⁺ = Q·R′ = {rr}, so {B(st)} → {B(nxt[st])}; one row is one arc."
        assert len(cap) <= 140, cap
        s.step(cap, *pats)
    s.step("All 8 rows are done: the table is the circuit. Every state has exactly one arc out, because there is no input.",
           ("tt", {"highlight": []}), (g["nodes"][B(states[-1])], {"tone": "ink"}), *[(i, {"tone": "muted"}) for i in edge_ids(g, 7)],
           ("st", {"text": "8 states, 8 arcs", "tone": "ink"}))
    lit = []
    for a in cyc:
        k = states.index(a)
        lit += [(i, {"tone": "accent"}) for i in edge_ids(g, k)] + [(g["nodes"][B(a)], {"tone": "accent"})]
    cyc_rows = [[states.index(a) + 1, c] for a in cyc for c in range(5)]
    cap = "From 000 (the power-on reset): " + " → ".join(B(x) for x in cyc + [cyc[0]]) + f", a cycle of {len(cyc)} states."
    s.step(cap, ("tt", {"highlight": cyc_rows}), ("st", {"text": f"cycle of {len(cyc)} from 000", "tone": "accent"}), *lit)
    others = [B(x) for x in states if x not in cyc]
    assert others == ["001", "101", "110", "111"]
    assert all(set(sq.cycle_from(m.step, x)[1]) == set(cyc) for x in states)
    s.step(f"The other {len(others)} states ({', '.join(others)}) only lead into the cycle: never produced from 000, but not lock-outs.",
           ("st", {"text": "tails lead into the cycle", "tone": "ink"}))
    h = gy + 2 * gdy + r + s.v(20, 16)
    return s.done("The 2011 circuit: state equations, state table and state diagram", (W, h), (NW, h),
                  "Three D flip-flops P, Q, R share a clock. The state equations fill the next-state table one present state "
                  "per step; each row is drawn as an arc of the state diagram, and the cycle from 000 is lit at the end.")


# ── clock-trace: the 1994 JK / D / T chain ───────────────────────────────

M1994 = sq.Sync([("Q2", "JK", {"J": lambda e: neg(e["Q0"]), "K": lambda e: 1}),
                 ("Q1", "D", {"D": lambda e: e["Q2"]}),
                 ("Q0", "T", {"T": lambda e: e["Q1"]})])


@scene
def clock_trace(L):
    """Four clocks of the 1994 chain: inputs from the old state, then all outputs together."""
    s = S(L)
    W, NW = 680, 360
    m = M1994
    tr = m.trace((0, 0, 0), 4)
    assert [B(x) for x in tr] == ["000", "100", "010", "101", "011"]
    assert B(m.step(tr[-1])) == "000"
    s.head("Clocking a JK, a D and a T together (GATE 1994 circuit)", "Tracing GATE 1994's chain", W, NW)
    bw, bh = s.v(130, 104), s.v(72, 66)
    xs = s.v([40, 275, 510], [8, 128, 248])
    by = s.v(66, 62)
    specs = [("ff2", ["J", "K"], "JK → Q2", "J = Q̄0, K = 1"), ("ff1", ["D"], "D → Q1", "D = Q2"), ("ff0", ["T"], "T → Q0", "T = Q1")]
    for (pid, left, ttl, eq), x in zip(specs, xs):
        ff_block(s, pid, x, by, bw, bh, left, ["Q"], edge="pos")
        s.text(pid + "t", x + bw / 2, by - 12, ttl, s.v(14, 12), anchor="middle", weight="bold")
        s.text(pid + "e", x + bw / 2, by + bh + s.v(18, 16), eq, s.v(14, 12), anchor="middle", tone="muted")
        s.text(pid + "i", x + bw / 2, by + bh + s.v(38, 34), "", s.v(14, 12), anchor="middle", weight="bold")
        s.text(pid + "q", x + bw / 2, by + bh + s.v(58, 52), "", s.v(14, 12), anchor="middle", mono=True, weight="bold")
    cw, ch = s.v(90, 68), s.v(26, 22)
    tx = s.v((W - 5 * 90) / 2, (NW - 5 * 68) / 2)
    ty = by + bh + s.v(80, 72)
    rows = [["clock", "J K", "D", "T", "Q2Q1Q0"], ["start", "–", "–", "–", "000"]] + [[str(k), "", "", "", ""] for k in range(1, 5)]
    s.table("tt", tx, ty, cw, ch, rows)

    def show_q(state):
        return [(pid + "q", {"text": f"{nm} = {v}", "tone": tv(v)}) for (pid, *_), nm, v in zip(specs, ("Q2", "Q1", "Q0"), state)]

    filled = [list(x) for x in rows]
    s.step("Start at Q2Q1Q0 = 000. Each clock takes two steps: inputs from the old state, then all three outputs at once.",
           *show_q(tr[0]), ("tt", {"highlight": [[1, c] for c in range(5)]}))
    for k in range(4):
        old, new = tr[k], tr[k + 1]
        e = m.excite(old)
        j, kk, d, t = e["Q2"]["J"], e["Q2"]["K"], e["Q1"]["D"], e["Q0"]["T"]
        q2, q1, q0 = old
        act2 = "toggles" if j and kk else "sets" if j else "resets" if kk else "holds"
        assert new == (sq.ff_next("JK", q2, J=j, K=kk), d, t ^ q0)
        cap = f"Clock {k + 1}, before the edge, from {B(old)}: J = Q̄0 = {j}, K = 1, D = Q2 = {d}, T = Q1 = {t}. Nothing has moved yet."
        assert len(cap) <= 140, cap
        s.step(cap, ("ff2i", {"text": f"J={j} K={kk}", "tone": "accent"}), ("ff1i", {"text": f"D={d}", "tone": "accent"}),
               ("ff0i", {"text": f"T={t}", "tone": "accent"}), ("ff2", {"tone": "accent"}), ("ff1", {"tone": "accent"}), ("ff0", {"tone": "accent"}),
               ("tt", {"highlight": []}))
        filled[k + 2] = [str(k + 1), f"{j} {kk}", str(d), str(t), B(new)]
        cap = (f"Edge {k + 1}: the JK {act2} (Q2 = {new[0]}), the D loads {d}, the T {'toggles' if t else 'holds'} "
               f"(Q0 = {new[2]}): {B(old)} → {B(new)}.")
        assert len(cap) <= 140, cap
        s.step(cap, *show_q(new), ("ff2", {"tone": "ink"}), ("ff1", {"tone": "ink"}), ("ff0", {"tone": "ink"}),
               ("ff2i", {"tone": "muted"}), ("ff1i", {"tone": "muted"}), ("ff0i", {"tone": "muted"}),
               ("tt", {"rows": [list(x) for x in filled], "highlight": [[k + 2, c] for c in range(5)]}))
    s.step(f"After four clocks Q2Q1Q0 = {B(tr[4])} (GATE 1994). A fifth clock gives {B(m.step(tr[4]))}: a 5-state cycle.",
           ("tt", {"highlight": [[5, c] for c in range(5)]}))
    h = ty + 6 * ch + s.v(24, 20)
    return s.done("Tracing a JK, a D and a T flip-flop on one clock", (W, h), (NW, h),
                  "A JK flip-flop (J = Q̄0, K = 1, output Q2), a D flip-flop (D = Q2, output Q1) and a T flip-flop (T = Q1, output Q0) "
                  "share one clock and start at 000. Four clocks, each in two steps.")


# ── state-graph-reach: the 1996 LFSR from S4 ─────────────────────────────

M1996 = sq.Sync([("Q1", "D", {"D": lambda e: e["Q2"] ^ e["Q3"]}),
                 ("Q2", "D", {"D": lambda e: e["Q1"]}),
                 ("Q3", "D", {"D": lambda e: e["Q2"]})])


@scene
def state_graph_reach(L):
    """The 1996 state graph; from S4 the reachable states light one by one; S0 stays dark."""
    s = S(L)
    W, NW = 680, 360
    m = M1996
    nx = {sq.val(st): sq.val(m.step(st)) for st in m.states()}
    pre, cyc = sq.cycle_from(m.step, (1, 0, 0))
    order = [sq.val(x) for x in cyc]
    assert pre == [] and order == [4, 2, 5, 6, 7, 3, 1] and nx[0] == 0
    reach = sorted(sq.val(x) for x in m.reachable((1, 0, 0)))
    assert reach == [1, 2, 3, 4, 5, 6, 7]
    s.head("Which states can the 1996 circuit reach from S4?", "Reachable states from S4", W, NW)
    cx, cy, R, r = s.v(205, 180), s.v(215, 192), s.v(140, 118), s.v(24, 20)
    ring = [1, 4, 2, 5, 6, 7, 3]  # the cycle order, placed round a heptagon so every arc is a side
    nodes = {}
    for i, k in enumerate(ring):
        a = math.radians(-90 + i * 360 / 7)
        nodes[f"S{k}"] = (round(cx + R * math.cos(a), 2), round(cy + R * math.sin(a), 2), f"S{k}")
    nodes["S0"] = (cx, cy + s.v(18, 16), "S0")
    g = state_graph(s, "g", nodes, r, [(f"S{k}", f"S{nx[k]}") for k in ring] + [("S0", "S0")], s.v(14, 12))
    eidx = {k: i for i, k in enumerate(ring)}
    cw, ch = s.v(80, 76), s.v(26, 22)
    tx, ty = s.v(410, (NW - 3 * 76) / 2), s.v(70, 340)
    rows = [["state", "Q1Q2Q3", "next"]] + [[f"S{k}", B(sq.bits(k, 3)), f"S{nx[k]}"] for k in range(8)]
    s.table("tt", tx, ty, cw, ch, rows)
    sy = ty + 9 * ch + s.v(24, 20)
    s.text("st", s.v(tx, NW / 2), sy, "", s.v(14, 12), anchor=s.v("start", "middle"), weight="bold")
    s.text("st2", s.v(tx, NW / 2), sy + s.v(22, 20), "", s.v(14, 12), anchor=s.v("start", "middle"), mono=True)
    s.step("The table (Q1⁺ = Q2 ⊕ Q3, Q2⁺ = Q1, Q3⁺ = Q2) drawn as a graph: S0 → S0 is a self-loop; the other seven arcs make one cycle.",
           ("st", {"text": "the whole graph", "tone": "ink"}))
    seen = [4]
    s.step("Start at S4 = 100: it is reached after 0 clocks.", (g["nodes"]["S4"], {"tone": "accent"}),
           ("tt", {"highlight": [[5, c] for c in range(3)]}), ("st", {"text": "reached: 1", "tone": "accent"}), ("st2", {"text": "S4"}))
    for k in range(1, len(order)):
        a, b = order[k - 1], order[k]
        seen.append(b)
        cap = f"Clock {k}: S{a} → S{b} ({B(sq.bits(a, 3))} → {B(sq.bits(b, 3))}). Reached so far: {len(seen)} states."
        s.step(cap, (g["nodes"][f"S{b}"], {"tone": "accent"}), *[(i, {"tone": "accent"}) for i in edge_ids(g, eidx[a])],
               ("tt", {"highlight": [[x + 1, c] for x in seen for c in range(3)]}), ("st", {"text": f"reached: {len(seen)}", "tone": "accent"}),
               ("st2", {"text": " ".join(f"S{x}" for x in seen)}))
    last = order[-1]
    s.step(f"Clock {len(order)}: S{last} → S{nx[last]}, back to the start. The trace has repeated, so nothing new can ever appear.",
           *[(i, {"tone": "accent"}) for i in edge_ids(g, eidx[last])], ("st", {"text": f"cycle of {len(order)}: closed", "tone": "accent"}))
    unreached = [k for k in range(8) if k not in reach]
    assert unreached == [0]
    s.step("S0 never lit: its only arc is its own self-loop, so no other state leads into it. Unreachable from S4: {S0}.",
           (g["nodes"]["S0"], {"tone": "danger"}), *[(i, {"tone": "danger"}) for i in edge_ids(g, 7)],
           ("st", {"text": "unreachable: {S0}", "tone": "danger"}))
    return s.done("Reachability in the GATE 1996 circuit from S4", (W, sy + s.v(40, 36)), (NW, sy + s.v(40, 36)),
                  "Three D flip-flops with D1 = Q2 ⊕ Q3, D2 = Q1, D3 = Q2; state Sk is Q1Q2Q3 = k in binary. Starting at S4, "
                  "each step lights the state reached by one more clock.")
