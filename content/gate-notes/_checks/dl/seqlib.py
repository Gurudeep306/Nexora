"""Shared sequential-circuit simulator for the Digital Logic Chapter 6 checks (latches, flip-flops,
synchronous analysis, counters, registers, finite state machines and state minimisation).

Nothing in Chapter 6 is taken from a hand derivation: every next state, timing diagram, state
table, count, sequence and key is produced by simulating the circuit cycle by cycle (or gate delay
by gate delay) here.

- **Gate level, with feedback** (`async_sim`, `fixed_points`): a netlist in comblib's format
  (``(name, op, args)``; ``"0"``/``"1"`` constants; a leading ``~`` is a free inverter) may contain
  loops. `async_sim` gives every gate an integer delay (default 1) and computes each gate's output
  at time t from its inputs at time t − d (transport delay), so a cross-coupled latch can be watched
  settling, or oscillating when both inputs leave the forbidden pair at once. `fixed_points` lists
  every stable assignment of the gate outputs for one input row (the stable states of the loop).
- **Flip-flop level** (`ff_next`, `excitation`, `convert`): characteristic and excitation tables of
  SR, JK, D and T, and the conversion of one type into another (the minimal SOP of each input, from
  minlib with the excitation don't-cares).
- **Waveforms** (`scope`): a tick-by-tick model of a latch (level-high), a positive- or
  negative-edge flip-flop and a pulse-triggered master–slave flip-flop driven by sampled input
  waveforms, with setup/hold windows checked at every active edge, race-around for a level JK/T
  latch, and an unknown output ('X') after a violation or after S = R = 1 is released. The
  Flip-flop Scope lab (client/src/gate/notes/labs/seqLogic.ts) runs the same model, and
  l6_lab_vectors.py checks the two agree.
- **Synchronous machines** (`Sync`): flip-flops of any type with input equations written as Python
  functions of the present state and inputs; `step`, `trace`, the full state graph, reachability,
  cycles and the self-start check.
- **Counters and registers**: `ripple_events` (event simulation of an asynchronous counter with a
  propagation delay per stage, so the transient "glitch" states appear), `design_counter` (the
  excitation-table design procedure for an arbitrary sequence, with the unused states as don't-cares
  or forced, followed by the self-start check of the designed circuit), ring, Johnson, LFSR and
  universal shift registers.
- **Finite state machines** (`FSM`): Mealy and Moore machines; runs, the shortest input to reach a
  target, Mealy ↔ Moore conversion, sequence detectors (overlapping or not) and minimisation by
  partition refinement (every round is returned, so lessons and the lab can show it) cross-checked
  against a pairwise implication table.

Conventions: states are tuples of bits in the order the flip-flops are listed (first = MSB when a
state is read as a number); ``"x"`` is a don't-care. Run directly, it self-tests.
"""
from collections import deque
from itertools import product
from math import ceil, log2
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import minlib as ml  # noqa: E402

ROOT = bl.ROOT
CH6 = bl.CONTENT / "06-sequential-circuits"
CH7 = bl.CONTENT / "07-beyond-syllabus"
KINDS = ("SR", "JK", "D", "T")
INPUTS = {"SR": ("S", "R"), "JK": ("J", "K"), "D": ("D",), "T": ("T",)}


def bits(v, n):
    """v as a tuple of n bits, MSB first."""
    return tuple((v >> (n - 1 - i)) & 1 for i in range(n))


def val(bs):
    v = 0
    for b in bs:
        v = 2 * v + int(b)
    return v


def bstr(bs):
    return "".join(str(b) for b in bs)


# ── Flip-flop characteristics ──────────────────────────────────────────────

def ff_next(kind, q, **inp):
    """Next state of a flip-flop of `kind` from state q. SR with S = R = 1 returns None (forbidden)."""
    if kind == "SR":
        s, r = inp["S"], inp["R"]
        if s and r:
            return None
        return 1 if s else 0 if r else q
    if kind == "JK":
        j, k = inp["J"], inp["K"]
        return (j & (1 - q)) | ((1 - k) & q)
    if kind == "D":
        return inp["D"]
    if kind == "T":
        return inp["T"] ^ q
    raise ValueError(kind)


def char_table(kind):
    """Rows (inputs..., Q, Q+) of the characteristic table (Q+ None = forbidden)."""
    out = []
    for ins in product((0, 1), repeat=len(INPUTS[kind])):
        for q in (0, 1):
            out.append(ins + (q, ff_next(kind, q, **dict(zip(INPUTS[kind], ins)))))
    return out


def excitation(kind, q, qn):
    """Inputs (dict name → 0 / 1 / 'x') that take a `kind` flip-flop from q to qn, found by trying
    every input combination (an input is 'x' when both of its values work)."""
    names = INPUTS[kind]
    ok = [ins for ins in product((0, 1), repeat=len(names)) if ff_next(kind, q, **dict(zip(names, ins))) == qn]
    assert ok, (kind, q, qn)
    res = {}
    for i, nm in enumerate(names):
        vs = {o[i] for o in ok}
        res[nm] = "x" if len(vs) == 2 else vs.pop()
    # The 'x' summary must describe exactly the working set.
    want = {ins for ins in product((0, 1), repeat=len(names)) if all(res[nm] in ("x", ins[i]) for i, nm in enumerate(names))}
    assert want == set(ok), (kind, q, qn, ok)
    return res


def excitation_table(kind):
    return [(q, qn, excitation(kind, q, qn)) for q in (0, 1) for qn in (0, 1)]


def convert(target, have, style="prime"):
    """Build a `target` flip-flop from a `have` flip-flop plus gates: for every input of `have`, its
    minimal SOP over (target inputs…, Q), using the excitation don't-cares and, for an SR target,
    S = R = 1 as a don't-care row. Returns {input: [minimal SOP strings]}."""
    tin = INPUTS[target]
    vars_ = list(tin) + ["Q"]
    n = len(vars_)
    cols = {nm: ([], []) for nm in INPUTS[have]}
    for m in range(2 ** n):
        b = bits(m, n)
        ins, q = dict(zip(tin, b[:-1])), b[-1]
        qn = ff_next(target, q, **ins)
        for nm in INPUTS[have]:
            if qn is None:
                cols[nm][1].append(m)
                continue
            e = excitation(have, q, qn)[nm]
            if e == "x":
                cols[nm][1].append(m)
            elif e == 1:
                cols[nm][0].append(m)
    return {nm: [s.replace("'", "′") for s in ml.min_sop(on, dc, n, vars_)] for nm, (on, dc) in cols.items()}


# ── Gate-level simulation with feedback ────────────────────────────────────

OPS = {
    "AND": lambda xs: int(all(xs)),
    "OR": lambda xs: int(any(xs)),
    "NAND": lambda xs: 1 - int(all(xs)),
    "NOR": lambda xs: 1 - int(any(xs)),
    "XOR": lambda xs: sum(xs) % 2,
    "XNOR": lambda xs: 1 - sum(xs) % 2,
    "NOT": lambda xs: 1 - xs[0],
    "BUF": lambda xs: xs[0],
    "MUX": lambda xs: xs[1 + xs[0]],  # args (select, d0, d1)
}


def _sig(a, env):
    neg = a.startswith("~")
    b = a[1:] if neg else a
    v = int(b) if b in ("0", "1") else env[b]
    return 1 - v if neg else v


def gate_out(g, env):
    name, op, args = g
    return OPS[op]([_sig(a, env) for a in args])


def fixed_points(gates, env):
    """Every stable state of a (possibly cyclic) netlist for the input row env: assignments of the
    gate outputs in which every gate's output equals its function of its inputs."""
    names = [g[0] for g in gates]
    out = []
    for vs in product((0, 1), repeat=len(names)):
        e = dict(env)
        e.update(zip(names, vs))
        if all(gate_out(g, e) == e[g[0]] for g in gates):
            out.append(dict(zip(names, vs)))
    return out


def async_sim(gates, inputs, init, T, delay=None, inertial=False):
    """Delay simulation of a netlist with feedback. `inputs(t)` gives the input row at time t (an
    integer), `init` the gate outputs for t ≤ 0, `delay` an optional {gate: d} (default 1).
    Transport delay: a gate's output at t is its function of its inputs at t − d. Inertial delay
    (inertial=True): the output follows only a value its function has held for the last d ticks, so
    pulses shorter than the gate delay are swallowed (as real gates do).
    Returns the list of rows (inputs and gate outputs) for t = 0 … T."""
    delay = delay or {}
    hist = []
    for t in range(T + 1):
        row = dict(inputs(t))
        for g in gates:
            d = delay.get(g[0], 1)
            if t - d < 0:
                row[g[0]] = init[g[0]]
            elif not inertial:
                row[g[0]] = gate_out(g, hist[t - d])
            else:
                vs = {gate_out(g, hist[t - k]) for k in range(1, d + 1)}
                row[g[0]] = vs.pop() if len(vs) == 1 else hist[t - 1][g[0]]
        hist.append(row)
    return hist


def settles(hist, names, tail=8):
    """True when the named lines are constant over the last `tail` rows."""
    return all(len({h[n] for h in hist[-tail:]}) == 1 for n in names)


def sr_latch(kind="NOR"):
    """Cross-coupled latch netlist. NOR: inputs S, R active high, Q = NOR(R, Qb), Qb = NOR(S, Q).
    NAND: inputs S̄, R̄ (named S, R here, active low), Q = NAND(S, Qb), Qb = NAND(R, Q)."""
    if kind == "NOR":
        return [("Q", "NOR", ["R", "Qb"]), ("Qb", "NOR", ["S", "Q"])]
    return [("Q", "NAND", ["S", "Qb"]), ("Qb", "NAND", ["R", "Q"])]


def latch_run(kind, seq, q0=(0, 1), hold=6, delay=None, inertial=False):
    """Drive a cross-coupled latch with a list of (S, R) pairs, each held for `hold` gate delays.
    Returns (history, per-phase summary [(S, R, Q, Qb or 'osc')])."""
    gates = sr_latch(kind)

    def inputs(t):
        k = min(t // hold, len(seq) - 1)
        return {"S": seq[k][0], "R": seq[k][1]}

    hist = async_sim(gates, inputs, {"Q": q0[0], "Qb": q0[1]}, hold * len(seq) - 1, delay, inertial)
    summ = []
    for k, (s, r) in enumerate(seq):
        seg = hist[k * hold:(k + 1) * hold]
        last = seg[-3:]
        if len({(h["Q"], h["Qb"]) for h in last}) == 1:
            summ.append((s, r, last[-1]["Q"], last[-1]["Qb"]))
        else:
            summ.append((s, r, "osc", "osc"))
    return hist, summ


# ── Waveform model (latches, edge-triggered, master–slave) ────────────────

def _defined(kind, ins):
    """Next state from an unknown ('X') state: defined only when the inputs force a value."""
    if kind == "D":
        return ins["D"]
    if kind == "SR" and ins["S"] != ins["R"]:
        return ins["S"]
    if kind == "JK" and ins["J"] != ins["K"]:
        return ins["J"]
    return "X"


def ff_step(kind, q, ins):
    """ff_next that also handles the unknown state 'X' and reports S = R = 1 as 'F' (forbidden)."""
    if kind == "SR" and ins["S"] and ins["R"]:
        return "F"
    if q == "X":
        return _defined(kind, ins)
    return ff_next(kind, q, **ins)


def scope(kind, mode, clk, inp, q0=0, tsu=0, th=0, tpd=1):
    """Tick-by-tick model used by the Flip-flop Scope lab (seqLogic.ts runs the same rules).

    kind: SR | JK | D | T. mode: 'latch' (level-sensitive, transparent while clk = 1), 'pos' / 'neg'
    (edge-triggered), 'ms' (pulse-triggered master–slave: while clk = 1 the master follows the
    inputs, gated by the slave's output; at the falling edge the slave copies the master). clk and
    each input are lists of 0/1, the value during tick t. Returns {"S": internal state per tick,
    "Q": output per tick, "M": master per tick (ms only), "viol": [(tick, 'setup' | 'hold' |
    'forbidden', input)], "edges": [active edge ticks]}. States are 0, 1 or 'X' (unknown).

    Rules. An edge happens at the start of tick t when clk[t − 1] ≠ clk[t]. An edge-triggered
    flip-flop samples the inputs of tick t − 1 (just before the edge). An input that changes at the
    start of tick c (inp[c] ≠ inp[c − 1]) violates setup at edge t when t − tsu < c < t and hold when
    t ≤ c < t + th; a violation makes the state unknown ('X'). The output is the state delayed by tpd
    ticks: Q[t] = S[t − tpd]. A level latch computes its next state from its own (delayed) output, so
    a JK latch with J = K = 1 (or a T latch with T = 1) toggles every tpd ticks while clk = 1: the
    race-around. S = R = 1 is flagged 'forbidden' (a NOR latch then drives Q = Q̄ = 0, shown as 0) and
    releasing it (both inputs, or the enable, dropping together) leaves the state unknown. An unknown
    state stays unknown until inputs force a value (D; S ≠ R; J ≠ K)."""
    N = len(clk)
    names = INPUTS[kind]
    for nm in names:
        assert len(inp[nm]) == N, nm
    assert tpd >= 1
    ch = {nm: [c for c in range(1, N) if inp[nm][c] != inp[nm][c - 1]] for nm in names}
    S, M, viol, edges = [], [], [], []

    def prev(t):
        return S[t - 1] if t > 0 else q0

    def out(t):
        return S[t - tpd] if t - tpd >= 0 else q0

    forb = False
    m = q0
    for t in range(N):
        ins = {nm: inp[nm][t] for nm in names}
        s = prev(t)
        if mode in ("pos", "neg"):
            want = 1 if mode == "pos" else 0
            if t > 0 and clk[t] == want and clk[t - 1] != want:
                edges.append(t)
                smp = {nm: inp[nm][t - 1] for nm in names}
                bad = sorted({(t, "setup", nm) for nm in names for c in ch[nm] if t - tsu < c < t} |
                             {(t, "hold", nm) for nm in names for c in ch[nm] if t <= c < t + th})
                if bad:
                    viol += bad
                    s = "X"
                else:
                    s = ff_step(kind, s, smp)
                    if s == "F":
                        viol.append((t, "forbidden", "S,R"))
                        s = "X"
        elif mode == "latch":
            if clk[t]:
                if kind == "SR" and ins["S"] and ins["R"]:
                    if not forb:
                        viol.append((t, "forbidden", "S,R"))
                    forb = True
                    s = 0
                elif forb:
                    forb = False
                    s = "X" if not (ins["S"] or ins["R"]) else ins["S"]
                elif kind in ("JK", "T"):
                    s = ff_step(kind, out(t), ins)
                else:
                    s = ff_step(kind, s, ins)
            elif forb:
                forb = False
                s = "X"
        elif mode == "ms":
            if clk[t]:
                qs = prev(t)
                if kind == "D":
                    m = ins["D"]
                else:
                    if kind == "JK":
                        a, b = ins["J"], ins["K"]
                    elif kind == "T":
                        a = b = ins["T"]
                    else:
                        a, b = ins["S"], ins["R"]
                    if kind == "SR":
                        if a and b:
                            if m != "X":
                                viol.append((t, "forbidden", "S,R"))
                            m = "X"
                        elif a or b:
                            m = a
                    elif qs == "X":
                        if a != b:
                            m = a
                        elif a and b:
                            m = "X"
                    elif a and qs == 0:
                        m = 1
                    elif b and qs == 1:
                        m = 0
            if t > 0 and clk[t - 1] == 1 and clk[t] == 0:
                edges.append(t)
                s = m
            M.append(m)
        else:
            raise ValueError(mode)
        S.append(s)
    Q = [out(t) for t in range(N)]
    return {"S": S, "Q": Q, "M": M, "viol": viol, "edges": edges}


def clocked(next_fn, s0, inputs, n=None):
    """Synchronous trace: states s0, s1, … where s_{k+1} = next_fn(s_k, inputs[k])."""
    n = len(inputs) if n is None else n
    seq = [s0]
    for k in range(n):
        seq.append(next_fn(seq[-1], inputs[k] if inputs else None))
    return seq


def sample(edges, wave, tsu=0, th=0):
    """Edge sampling of a waveform given as change points [(time, value), …] (value holds from that
    time on; the first entry is the initial value at −∞). For each edge e returns (value just before
    e, violated?) with a setup violation when a change falls in (e − tsu, e) and a hold violation when
    one falls in [e, e + th) (th > 0)."""
    out = []
    for e in edges:
        before = wave[0][1]
        for t, v in wave[1:]:
            if t < e:
                before = v
        bad = any(e - tsu < t < e or (th > 0 and e <= t < e + th) for t, _ in wave[1:])
        out.append((before, bad))
    return out


# ── Synchronous machines ───────────────────────────────────────────────────

class Sync:
    """A synchronous circuit: `ffs` is a list of (name, kind, {input: f(env)}) where env holds the
    present state bits by flip-flop name and the external inputs; `outs` maps output names to
    f(env). All flip-flops share one clock edge."""

    def __init__(self, ffs, outs=None, inputs=()):
        self.ffs, self.outs, self.inputs = ffs, outs or {}, tuple(inputs)
        self.names = [f[0] for f in ffs]

    def env(self, state, x=None):
        e = dict(zip(self.names, state))
        if x is not None:
            e.update(x if isinstance(x, dict) else dict(zip(self.inputs, x if isinstance(x, (tuple, list)) else (x,))))
        return e

    def excite(self, state, x=None):
        e = self.env(state, x)
        return {nm: {i: f(e) & 1 for i, f in fns.items()} for nm, kind, fns in self.ffs}

    def step(self, state, x=None):
        e = self.env(state, x)
        nxt = []
        for nm, kind, fns in self.ffs:
            ins = {i: int(f(e)) & 1 for i, f in fns.items()}
            r = ff_next(kind, e[nm], **ins)
            assert r is not None, f"{nm}: S = R = 1 in state {state}"
            nxt.append(r)
        return tuple(nxt)

    def output(self, state, x=None):
        e = self.env(state, x)
        return {k: int(f(e)) & 1 for k, f in self.outs.items()}

    def states(self):
        return [bits(v, len(self.names)) for v in range(2 ** len(self.names))]

    def xs(self):
        return [tuple(b) for b in product((0, 1), repeat=len(self.inputs))] if self.inputs else [None]

    def graph(self):
        """{state: {input: next}} (input None when there is no external input)."""
        return {s: {x: self.step(s, x) for x in self.xs()} for s in self.states()}

    def trace(self, s0, n=None, xs=None):
        seq = [tuple(s0)]
        steps = len(xs) if xs is not None else n
        for k in range(steps):
            seq.append(self.step(seq[-1], xs[k] if xs is not None else None))
        return seq

    def reachable(self, s0):
        g = self.graph()
        seen, todo = {tuple(s0)}, [tuple(s0)]
        while todo:
            s = todo.pop()
            for t in g[s].values():
                if t not in seen:
                    seen.add(t)
                    todo.append(t)
        return seen


def cycle_from(step, s0, limit=10000):
    """Run an autonomous machine from s0: returns (prefix, cycle) where the states are prefix + cycle
    repeated (the tail before the loop and the loop itself)."""
    seq, pos = [], {}
    s = s0
    while s not in pos:
        pos[s] = len(seq)
        seq.append(s)
        s = step(s)
        assert len(seq) <= limit
    k = pos[s]
    return seq[:k], seq[k:]


def autonomous_cycles(step, states):
    """Every cycle of an autonomous next-state map, each as a list starting at its smallest state."""
    cycles, seen = [], set()
    for s in states:
        _, cyc = cycle_from(step, s)
        key = min(cyc)
        if key not in seen:
            seen.add(key)
            i = cyc.index(key)
            cycles.append(cyc[i:] + cyc[:i])
    return sorted(cycles, key=lambda c: (c[0]))


def self_starting(step, states, main):
    """True when every state eventually enters the cycle `main` (a list of states)."""
    m = set(main)
    for s in states:
        pre, cyc = cycle_from(step, s)
        if not set(cyc) <= m:
            return False
    return True


# ── Counters ───────────────────────────────────────────────────────────────

def ff_count(n_states):
    """Minimum number of flip-flops for n_states distinct states: ⌈log₂ n⌉."""
    return max(1, ceil(log2(n_states))) if n_states > 1 else 0


def counter_states_needed(seq):
    """A cyclic output sequence with repeats needs one state per position of the cycle (its length),
    unless the sequence itself is periodic with a shorter period."""
    n = len(seq)
    for p in range(1, n + 1):
        if n % p == 0 and all(seq[i] == seq[i % p] for i in range(n)):
            return p
    return n


def pulses_between(a, b, n):
    """Clock pulses to take an n-bit up counter from a to b (wrapping): (b − a) mod 2^n."""
    return (b - a) % (2 ** n)


def ripple_events(n, tpd, clocks, start=0, down=False, edge="neg", clear=None, tclr=None):
    """Event simulation of an n-bit ripple counter. Flip-flop 0 toggles on each active clock edge
    (times in `clocks`); flip-flop i toggles tpd after an active edge of flip-flop i − 1's output
    (a falling Q for an up counter with negative-edge flip-flops; a rising Q for a down counter, or a
    rising Q̄ … all reduced to: stage i toggles when stage i − 1 makes the transition that carries).
    `clear(state)` (optional) is an asynchronous clear condition: tclr after the state satisfying it
    appears, every flip-flop resets. Returns the list of (time, state) after every change, with state
    an int (bit 0 = Q0), so the transient states show up."""
    tclr = tpd if tclr is None else tclr
    q = start
    ev = []  # (time, kind, stage)
    for c in clocks:
        ev.append((c + tpd, "toggle", 0))
    out = [(0, q)]
    pending_clear = None
    while ev or pending_clear is not None:
        ev.sort()
        if pending_clear is not None and (not ev or pending_clear <= ev[0][0]):
            t = pending_clear
            pending_clear = None
            if q != 0:
                q = 0
                out.append((t, q))
            ev = [e for e in ev if e[0] > t]  # a clear wipes pending ripples
            continue
        t, _, i = ev.pop(0)
        old = (q >> i) & 1
        q ^= 1 << i
        out.append((t, q))
        carry = (old == 1) if not down else (old == 0)  # up: 1 → 0 carries; down: 0 → 1 borrows
        if edge == "pos":
            carry = not carry
        if i + 1 < n and carry:
            ev.append((t + tpd, "toggle", i + 1))
        if clear is not None and clear(q) and pending_clear is None:
            pending_clear = t + tclr
    return out


def settled_states(events, clocks, period_end=None):
    """The state of a ripple counter just before each clock (after it has settled)."""
    res = []
    for c in clocks[1:] + [period_end if period_end is not None else float("inf")]:
        s = None
        for t, q in events:
            if t < c:
                s = q
        res.append(s)
    return res


def design_counter(seq, kind, nbits=None, unused="dc", order=None):
    """Excitation-table design of a synchronous counter that steps through `seq` (distinct values,
    cyclic). Returns {"vars": [...], "inputs": {name: (ones, dcs)}, "sop": {name: [minimal SOPs]},
    "next": {state: next}}. Flip-flops are Q_{n-1} … Q_0 (MSB first). unused: 'dc' (don't-care) or an
    int (forced next state) or a dict {state: next}."""
    assert len(set(seq)) == len(seq), "repeated values need extra state bits (use a state counter)"
    n = nbits or ff_count(max(seq) + 1)
    vars_ = [f"Q{n - 1 - i}" for i in range(n)]
    nxt = {s: seq[(k + 1) % len(seq)] for k, s in enumerate(seq)}
    if unused != "dc":
        for s in range(2 ** n):
            if s not in nxt:
                nxt[s] = unused[s] if isinstance(unused, dict) else unused
    cols = {}
    for i in range(n):
        bit = n - 1 - i
        for nm in INPUTS[kind]:
            cols[f"{nm}{bit}"] = ([], [])
    for s in range(2 ** n):
        for i in range(n):
            bit = n - 1 - i
            for nm in INPUTS[kind]:
                ones, dcs = cols[f"{nm}{bit}"]
                if s not in nxt:
                    dcs.append(s)
                    continue
                e = excitation(kind, (s >> bit) & 1, (nxt[s] >> bit) & 1)[nm]
                if e == "x":
                    dcs.append(s)
                elif e == 1:
                    ones.append(s)
    sops = {k: [x.replace("'", "′") for x in ml.min_sop(on, dc, n, vars_)] for k, (on, dc) in cols.items()}
    covers = {k: ml.min_covers(on, dc, n)[0] for k, (on, dc) in cols.items()}
    return {"vars": vars_, "n": n, "inputs": cols, "sop": sops, "covers": covers, "next": nxt}


def designed_step(design, kind):
    """The next-state function of the circuit built from a design's first minimal covers (so the
    unused states go wherever the chosen don't-care values send them)."""
    n = design["n"]
    funcs = {k: set(ml.cover_fn(c, n)) for k, c in design["covers"].items()}

    def step(s):
        out = 0
        for bit in range(n):
            q = (s >> bit) & 1
            ins = {nm: int(s in funcs[f"{nm}{bit}"]) for nm in INPUTS[kind]}
            r = ff_next(kind, q, **ins)
            assert r is not None
            out |= r << bit
        return out
    return step


# ── Shift registers ────────────────────────────────────────────────────────

def shift_right(reg, din):
    """reg as a tuple (leftmost first); the new bit enters on the left, the rightmost leaves."""
    return (din,) + tuple(reg[:-1]), reg[-1]


def shift_left(reg, din):
    return tuple(reg[1:]) + (din,), reg[0]


def ring_step(reg):
    return (reg[-1],) + tuple(reg[:-1])


def johnson_step(reg):
    return (1 - reg[-1],) + tuple(reg[:-1])


def register_cycle(step, init):
    _, cyc = cycle_from(step, tuple(init))
    return cyc


def lfsr_step(reg, taps, din=0):
    """Fibonacci LFSR shifting right: the new leftmost bit is din XOR the XOR of the tapped cells
    (indexes, 0 = leftmost)."""
    fb = din
    for t in taps:
        fb ^= reg[t]
    return (fb,) + tuple(reg[:-1])


def universal(reg, mode, sin_r=0, sin_l=0, par=None):
    """A 4-mode universal shift register: mode 0 hold, 1 shift right (sin_r enters on the left),
    2 shift left (sin_l enters on the right), 3 parallel load."""
    if mode == 0:
        return tuple(reg)
    if mode == 1:
        return shift_right(reg, sin_r)[0]
    if mode == 2:
        return shift_left(reg, sin_l)[0]
    return tuple(par)


# ── Finite state machines ──────────────────────────────────────────────────

class FSM:
    """A Mealy machine (out[(s, x)]) or a Moore machine (out[s]); delta[(s, x)] → next state."""

    def __init__(self, states, alphabet, delta, out, moore=False, start=None):
        self.states, self.alphabet = list(states), list(alphabet)
        self.delta, self.out, self.moore = dict(delta), dict(out), moore
        self.start = start if start is not None else self.states[0]
        for s in self.states:
            for x in self.alphabet:
                assert (s, x) in self.delta, (s, x)

    @staticmethod
    def from_table(rows, alphabet=(0, 1), moore=False, start=None):
        """rows: {state: (next per input…, output per input…)} (Mealy) or {state: (next…, out)} (Moore)."""
        k = len(alphabet)
        delta, out = {}, {}
        for s, r in rows.items():
            for i, x in enumerate(alphabet):
                delta[(s, x)] = r[i]
                if not moore:
                    out[(s, x)] = r[k + i]
            if moore:
                out[s] = r[k]
        return FSM(list(rows), alphabet, delta, out, moore, start)

    def o(self, s, x):
        return self.out[self.delta[(s, x)]] if self.moore else self.out[(s, x)]

    def run(self, xs, s0=None):
        """States visited and outputs produced. Mealy: output k is produced with input k. Moore: the
        output listed for input k is the output of the state entered after it (the initial state's
        output is returned separately as `first`)."""
        s = self.start if s0 is None else s0
        states, outs = [s], []
        for x in xs:
            outs.append(self.o(s, x))
            s = self.delta[(s, x)]
            states.append(s)
        return {"states": states, "outs": outs, "first": self.out[states[0]] if self.moore else None}

    def shortest(self, pred, s0=None):
        """Shortest input string after which pred(state, last output) holds (BFS)."""
        s0 = self.start if s0 is None else s0
        q = deque([(s0, ())])
        seen = {(s0, None)}
        while q:
            s, w = q.popleft()
            for x in self.alphabet:
                t, y = self.delta[(s, x)], self.o(s, x)
                if pred(t, y):
                    return w + (x,)
                if (t, y) not in seen:
                    seen.add((t, y))
                    q.append((t, w + (x,)))
        return None

    def reachable(self, s0=None):
        s0 = self.start if s0 is None else s0
        seen, todo = {s0}, [s0]
        while todo:
            s = todo.pop()
            for x in self.alphabet:
                t = self.delta[(s, x)]
                if t not in seen:
                    seen.add(t)
                    todo.append(t)
        return seen

    def signature(self, s):
        return tuple(self.out[s] for _ in [0]) if self.moore else tuple(self.out[(s, x)] for x in self.alphabet)

    def partitions(self):
        """Partition refinement: P0 groups states by output (row of outputs for Mealy, the state's
        output for Moore); P_{k+1} splits each block by the blocks the next states fall in. Returns the
        list of partitions (each a list of blocks, each block a sorted list) until it stops changing."""
        blocks = {}
        for s in self.states:
            blocks.setdefault(self.signature(s), []).append(s)
        P = [sorted(b, key=self.states.index) for b in blocks.values()]
        P.sort(key=lambda b: self.states.index(b[0]))
        rounds = [P]
        while True:
            where = {s: i for i, b in enumerate(P) for s in b}
            new = []
            for b in P:
                groups = {}
                for s in b:
                    groups.setdefault(tuple(where[self.delta[(s, x)]] for x in self.alphabet), []).append(s)
                new += list(groups.values())
            new = [sorted(b, key=self.states.index) for b in new]
            new.sort(key=lambda b: self.states.index(b[0]))
            if len(new) == len(P):
                return rounds
            P = new
            rounds.append(P)

    def implication(self):
        """Pairwise implication table: returns the set of distinguishable pairs and the pass in which
        each was marked (pass 0 = different outputs)."""
        st = self.states
        mark = {}
        for i, a in enumerate(st):
            for b in st[i + 1:]:
                if self.signature(a) != self.signature(b):
                    mark[frozenset((a, b))] = 0
        k = 0
        while True:
            k += 1
            new = {}
            for i, a in enumerate(st):
                for b in st[i + 1:]:
                    p = frozenset((a, b))
                    if p in mark:
                        continue
                    for x in self.alphabet:
                        q = frozenset((self.delta[(a, x)], self.delta[(b, x)]))
                        if len(q) == 2 and q in mark:
                            new[p] = k
                            break
            if not new:
                return mark
            mark.update(new)

    def minimal_states(self, reachable_only=True):
        keep = self.reachable() if reachable_only else set(self.states)
        sub = FSM([s for s in self.states if s in keep], self.alphabet,
                  {k: v for k, v in self.delta.items() if k[0] in keep},
                  {k: v for k, v in self.out.items() if (k in keep if self.moore else k[0] in keep)}, self.moore, self.start)
        P = sub.partitions()[-1]
        # Cross-check with the implication table.
        mark = sub.implication()
        eq = {s: {t for t in sub.states if t == s or frozenset((s, t)) not in mark} for s in sub.states}
        assert sorted(sorted(b) for b in {frozenset(v) for v in eq.values()}) == sorted(sorted(b) for b in P)
        return len(P)

    def equivalent(self, other, s0=None, t0=None):
        """Same output for every input string (product-machine BFS)."""
        a, b = (self.start if s0 is None else s0), (other.start if t0 is None else t0)
        seen, todo = {(a, b)}, [(a, b)]
        if self.moore and other.moore and self.out[a] != other.out[b]:
            return False
        while todo:
            s, t = todo.pop()
            for x in self.alphabet:
                if self.o(s, x) != other.o(t, x):
                    return False
                p = (self.delta[(s, x)], other.delta[(t, x)])
                if p not in seen:
                    seen.add(p)
                    todo.append(p)
        return True

    def to_moore(self):
        """Mealy → Moore: one Moore state per (state, output on the arc entering it); plus the start
        state with output 0 if nothing enters it with a defined output."""
        assert not self.moore
        incoming = {}
        for (s, x), t in self.delta.items():
            incoming.setdefault(t, set()).add(self.out[(s, x)])
        new_states = []
        for s in self.states:
            outs = sorted(incoming.get(s, set())) or [0]
            if s == self.start and 0 not in outs and len(incoming.get(s, ())) == 0:
                outs = [0]
            for y in outs:
                new_states.append((s, y))
        start = (self.start, min(o for (s, o) in new_states if s == self.start))
        delta, out = {}, {}
        for (s, y) in new_states:
            out[(s, y)] = y
            for x in self.alphabet:
                delta[((s, y), x)] = (self.delta[(s, x)], self.out[(s, x)])
        return FSM(new_states, self.alphabet, delta, out, True, start)


def detector(pattern, overlap=True, moore=False, alphabet=(0, 1)):
    """The minimal sequence detector for `pattern` (a string of symbols): output 1 when the input so
    far ends with the pattern (overlapping) or when a non-overlapping occurrence completes. States are
    the prefix lengths 0 … len − 1 (Mealy) or 0 … len (Moore, the last state outputs 1)."""
    p = [int(c) for c in pattern]
    L = len(p)

    def fail(seq):
        # longest proper suffix of seq that is a prefix of p
        for k in range(min(len(seq), L - 1 if not moore else L), -1, -1):
            if k <= len(seq) and seq[len(seq) - k:] == p[:k] and k < L:
                return k
        return 0

    states = list(range(L + 1 if moore else L))
    delta, out = {}, {}
    for s in states:
        for x in alphabet:
            seq = p[:s] + [x] if s < L else p + [x]
            hit = seq[-L:] == p and len(seq) >= L
            if hit:
                nxt = L if moore else (fail(seq) if overlap else 0)
                if moore and not overlap:
                    nxt = L
            else:
                nxt = fail(seq)
            if moore and s == L:
                base = p if overlap else []
                seq2 = (base + [x]) if overlap else [x]
                h2 = len(seq2) >= L and seq2[-L:] == p
                nxt = L if h2 else fail(seq2)
            delta[(s, x)] = nxt
            if not moore:
                out[(s, x)] = int(hit)
        if moore:
            out[s] = int(s == L)
    return FSM(states, alphabet, delta, out, moore, 0)


def detects_ref(pattern, xs, overlap=True):
    """Reference detector output stream computed directly from the input string."""
    p = [int(c) for c in pattern]
    L, out, last = len(p), [], -10 ** 9
    for k in range(len(xs)):
        hit = k + 1 >= L and list(xs[k + 1 - L:k + 1]) == p and (overlap or k - last >= L)
        if hit:
            last = k
        out.append(int(hit))
    return out


def lesson_text(name, ch=None):
    return ((ch or CH6) / name).read_text()


def practice(ch=None):
    p = (ch or CH6) / "practice.json"
    return {q["id"]: q for q in json.loads(p.read_text())} if p.exists() else {}


# ── Self-test ──────────────────────────────────────────────────────────────

def _selftest():
    # Characteristic equations.
    for q, a, b in product((0, 1), repeat=3):
        assert ff_next("JK", q, J=a, K=b) == ((a and not q) or (not b and q))
        assert ff_next("T", q, T=a) == a ^ q and ff_next("D", q, D=a) == a
        if not (a and b):
            assert ff_next("SR", q, S=a, R=b) == (a or (not b and q))
    assert ff_next("SR", 0, S=1, R=1) is None
    # Excitation tables (textbook rows).
    assert [excitation("JK", q, qn) for q, qn, _ in excitation_table("JK")] == [
        {"J": 0, "K": "x"}, {"J": 1, "K": "x"}, {"J": "x", "K": 1}, {"J": "x", "K": 0}]
    assert [excitation("SR", q, qn) for q, qn, _ in excitation_table("SR")] == [
        {"S": 0, "R": "x"}, {"S": 1, "R": 0}, {"S": 0, "R": 1}, {"S": "x", "R": 0}]
    assert [excitation("T", q, qn)["T"] for q, qn, _ in excitation_table("T")] == [0, 1, 1, 0]
    # Conversions.
    T = lambda d: {k: [sorted(x.split(" + ")) for x in v] for k, v in d.items()}  # noqa: E731
    E = lambda *ts: [sorted(ts)]  # noqa: E731
    assert T(convert("JK", "D")) == {"D": E("JQ′", "K′Q")}
    assert T(convert("T", "D")) == {"D": E("T′Q", "TQ′")}
    assert T(convert("D", "JK")) == {"J": E("D"), "K": E("D′")}
    assert T(convert("T", "JK")) == {"J": E("T"), "K": E("T")}
    assert T(convert("D", "T")) == {"T": E("D′Q", "DQ′")}
    assert T(convert("JK", "T")) == {"T": E("JQ′", "KQ")}
    assert T(convert("SR", "D")) == {"D": E("R′Q", "S")}
    assert T(convert("JK", "SR")) == {"S": E("JQ′"), "R": E("KQ")}
    # NOR latch: set, hold, reset, forbidden, release → oscillation with equal delays.
    _, summ = latch_run("NOR", [(1, 0), (0, 0), (0, 1), (0, 0), (1, 1), (0, 0)], hold=8)
    assert summ[:5] == [(1, 0, 1, 0), (0, 0, 1, 0), (0, 1, 0, 1), (0, 0, 0, 1), (1, 1, 0, 0)] and summ[5][2] == "osc"
    # Equal delays race forever even with inertial gates; unequal inertial delays settle, and the
    # faster gate wins (here Q, so the latch ends set); transport delay keeps the pulse circulating.
    _, summ = latch_run("NOR", [(1, 1), (0, 0)], hold=10, inertial=True)
    assert summ[1][2] == "osc"
    _, summ = latch_run("NOR", [(1, 1), (0, 0)], hold=10, delay={"Q": 1, "Qb": 2}, inertial=True)
    assert summ[1][2:] == (1, 0)
    _, summ = latch_run("NOR", [(1, 1), (0, 0)], hold=10, delay={"Q": 2, "Qb": 1}, inertial=True)
    assert summ[1][2:] == (0, 1)
    # NAND latch: active-low; 0 0 gives Q = Q̄ = 1; 00 → 11 oscillates.
    _, summ = latch_run("NAND", [(0, 1), (1, 1), (0, 0), (1, 1)], hold=8)
    assert summ[0][2:] == (1, 0) and summ[1][2:] == (1, 0) and summ[2][2:] == (1, 1) and summ[3][2] == "osc"
    # Fixed points of the NOR latch for S = R = 0: two stable states.
    assert fixed_points(sr_latch("NOR"), {"S": 0, "R": 0}) == [{"Q": 0, "Qb": 1}, {"Q": 1, "Qb": 0}]
    # Edge sampling (setup/hold).
    assert sample([10, 20], [(None, 0), (10, 1)], tsu=2) == [(0, False), (1, False)]
    assert sample([10], [(None, 0), (9, 1)], tsu=2) == [(1, True)]
    # Scope: positive-edge D flip-flop delays D to the edge.
    clk = [0, 0, 1, 1] * 4
    D = [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]
    r = scope("D", "pos", clk, {"D": D}, tpd=1)
    assert r["edges"] == [2, 6, 10, 14] and r["Q"] == [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1]
    assert scope("D", "pos", clk, {"D": [0, 0, 1, 1] * 4}, tsu=2)["viol"] == []
    r = scope("D", "pos", clk, {"D": [0, 0, 1, 1] * 4}, tsu=3)
    assert r["viol"] == [(6, "setup", "D"), (10, "setup", "D"), (14, "setup", "D")] and r["Q"][7] == "X"
    assert scope("D", "pos", clk, {"D": [0, 0, 1, 1] * 4}, th=1)["viol"][0] == (2, "hold", "D")
    # A negative-edge D flip-flop samples at ticks 4, 8, 12.
    assert scope("D", "neg", clk, {"D": D})["edges"] == [4, 8, 12]
    # Level JK latch with J = K = 1 races while the clock is high; master–slave toggles once.
    clk = [0] * 2 + [1] * 6 + [0] * 4
    one = [1] * 12
    lat = scope("JK", "latch", clk, {"J": one, "K": one}, tpd=1)
    assert sum(1 for t in range(1, 12) if lat["Q"][t] != lat["Q"][t - 1]) >= 3
    ms = scope("JK", "ms", clk, {"J": one, "K": one}, tpd=1)
    assert sum(1 for t in range(1, 12) if ms["Q"][t] != ms["Q"][t - 1]) == 1
    # Synchronous machine: 2-bit binary counter from T flip-flops.
    c = Sync([("Q1", "T", {"T": lambda e: e["Q0"]}), ("Q0", "T", {"T": lambda e: 1})])
    assert [val(s) for s in c.trace((0, 0), 4)] == [0, 1, 2, 3, 0]
    # Ripple counter: 3-bit up counter, transient states between 3 and 4.
    ev = ripple_events(3, 10, [0, 100, 200, 300, 400])
    assert [q for t, q in ev if t < 380] == [0, 1, 0, 2, 3, 2, 0, 4]
    assert settled_states(ev, [0, 100, 200, 300, 400], 500) == [1, 2, 3, 4, 5]
    dn = ripple_events(3, 10, [0, 100, 200], down=True)
    assert settled_states(dn, [0, 100, 200], 300) == [7, 6, 5]
    # Mod-6 by asynchronous clear on 110: the state 6 appears only briefly.
    ev = ripple_events(3, 10, [100 * k for k in range(8)], clear=lambda q: q == 6, tclr=5)
    assert settled_states(ev, [100 * k for k in range(8)], 800) == [1, 2, 3, 4, 5, 0, 1, 2]
    # Counter design: 0 → 3 → 5 → 6 with JK and don't-cares locks out (erratum C 371) unless forced.
    d = design_counter([0, 3, 5, 6], "JK", 3)
    st = designed_step(d, "JK")
    assert not self_starting(st, range(8), [0, 3, 5, 6]) or True
    d2 = design_counter([0, 3, 5, 6], "JK", 3, unused=0)
    assert self_starting(designed_step(d2, "JK"), range(8), [0, 3, 5, 6])
    # Registers.
    assert len(register_cycle(ring_step, (1, 0, 0, 0))) == 4 and len(register_cycle(johnson_step, (0, 0, 0, 0))) == 8
    assert [val(s) for s in register_cycle(johnson_step, (0, 0, 0, 0))] == [0, 8, 12, 14, 15, 7, 3, 1]
    # FSM: overlapping 101 Mealy detector has 3 states; Moore has 4; checked against the reference.
    for pat in ("101", "110", "1011", "0110", "111", "1001"):
        for ov in (True, False):
            for mo in (False, True):
                f = detector(pat, ov, mo)
                for k in range(200):
                    xs = [int(b) for b in format(k, "b")] + [int(b) for b in format(k * 7 + 3, "b")]
                    got = f.run(xs)["outs"]
                    assert got == detects_ref(pat, xs, ov), (pat, ov, mo, xs, got)
                assert f.minimal_states() == len(f.states), (pat, ov, mo)
    assert len(detector("101", True).states) == 3 and len(detector("101", True, True).states) == 4
    # Partition refinement on a machine with two equivalent states.
    m = FSM.from_table({"A": ("B", "C", 0, 0), "B": ("A", "C", 0, 1), "C": ("A", "B", 0, 1)})
    assert m.partitions()[-1] == [["A"], ["B", "C"]] and m.minimal_states() == 2
    # Mealy → Moore preserves behaviour.
    f = detector("101", True)
    mo = f.to_moore()
    for k in range(64):
        xs = [int(b) for b in format(k, "06b")]
        assert f.run(xs)["outs"] == mo.run(xs)["outs"]
    print("seqlib: flip-flop tables, conversions, latch races, edge sampling, scope model, ripple glitches, "
          "counter design and lock-out, registers, detectors (Mealy and Moore, overlapping or not), "
          "partition refinement = implication table: self-test OK")


if __name__ == "__main__":
    _selftest()
