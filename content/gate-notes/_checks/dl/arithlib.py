"""Shared helpers for the Digital Logic Chapter 4 checks (arithmetic circuits).

Every adder, subtractor, BCD adder and multiplier of the chapter is built here as a gate netlist in
comblib's format (a list of ``(name, op, args)`` in topological order; ``"0"``/``"1"`` are constants,
a leading ``~`` is a free inverter on a wire) and checked by **exhaustive simulation** against
integer arithmetic. Delays are never taken from a hand derivation:

- ``arrival`` is the static (structural) arrival time of every line, the longest input-to-line
  path with a delay per gate type (``delay = {"XOR": 2, ...}``, default 1 for every gate);
- ``simulate`` is a transport-delay simulation: the circuit is settled on the old inputs, the new
  inputs are applied at t = 0, and every gate's output at time t is its function of its inputs at
  time t − d. It returns, for each line, the time of its last change (its settling time for that
  input change). The Adder Race lab (client/src/gate/notes/labs/adderLogic.ts) runs the same
  simulation, and l4_lab_vectors.py checks the two agree.

Bit conventions: an n-bit operand is ``a0 … a{n-1}`` (a0 = LSB); carries are ``c0`` (carry in) …
``c{n}`` (carry out); sums ``s0 … s{n-1}``. Run directly, it self-tests.
"""
from itertools import product
from math import ceil, log
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import comblib as cl  # noqa: E402

ROOT = bl.ROOT
CH4 = bl.CONTENT / "04-arithmetic-circuits"
GATE_OPS = ("AND", "OR", "NAND", "NOR", "XOR", "XNOR", "NOT", "BUF", "MUX")


# ── Operands ───────────────────────────────────────────────────────────────

def env_of(n, a, b, cin=0, extra=None):
    """Input row for an n-bit adder: a, b as integers (taken mod 2^n)."""
    e = {f"a{i}": (a >> i) & 1 for i in range(n)}
    e.update({f"b{i}": (b >> i) & 1 for i in range(n)})
    e["c0"] = cin
    if extra:
        e.update(extra)
    return e


def inputs_of(n, extra=()):
    return [f"a{i}" for i in range(n)] + [f"b{i}" for i in range(n)] + ["c0"] + list(extra)


def word(val, prefix, n):
    """The integer held on lines prefix0 … prefix{n-1} (LSB first)."""
    return sum(val[f"{prefix}{i}"] << i for i in range(n))


def tc(v, n):
    """Signed value of an n-bit 2's-complement pattern."""
    v %= 2 ** n
    return v - 2 ** n if v >> (n - 1) else v


# ── Building blocks ────────────────────────────────────────────────────────

def half_adder(a, b, s, c):
    return [(s, "XOR", [a, b]), (c, "AND", [a, b])]


def full_adder(a, b, cin, s, cout, tag):
    """A full adder from two half adders and an OR (the GATE 2015 construction)."""
    p, g, t = f"p{tag}", f"g{tag}", f"t{tag}"
    return half_adder(a, b, p, g) + half_adder(p, cin, s, t) + [(cout, "OR", [g, t])]


def full_adder_sop(a, b, cin, s, cout, tag):
    """A full adder as two-level AND-OR logic with free input complements (the majority and the odd
    function): S = Σm(1, 2, 4, 7), C = ab + bc + ca."""
    na, nb, nc = f"~{a}", f"~{b}", f"~{cin}"
    return [
        (f"m1{tag}", "AND", [na, nb, cin]), (f"m2{tag}", "AND", [na, b, nc]),
        (f"m4{tag}", "AND", [a, nb, nc]), (f"m7{tag}", "AND", [a, b, cin]),
        (s, "OR", [f"m1{tag}", f"m2{tag}", f"m4{tag}", f"m7{tag}"]),
        (f"x{tag}", "AND", [a, b]), (f"y{tag}", "AND", [b, cin]), (f"z{tag}", "AND", [cin, a]),
        (cout, "OR", [f"x{tag}", f"y{tag}", f"z{tag}"]),
    ]


def half_subtractor(x, y, d, bo):
    """D = x ⊕ y, borrow = x′y (x − y)."""
    return [(d, "XOR", [x, y]), (bo, "AND", [f"~{x}", y])]


def full_subtractor(x, y, bin_, d, bout, tag):
    """x − y − bin from two half subtractors and an OR."""
    return half_subtractor(x, y, f"e{tag}", f"u{tag}") + half_subtractor(f"e{tag}", bin_, d, f"v{tag}") + [(bout, "OR", [f"u{tag}", f"v{tag}"])]


def rca(n, a="a", b="b", cin="c0", s="s", c="c", sop=False, prefix=""):
    """n-bit ripple-carry adder: n full adders, carry c{i+1} from stage i. Operand lines may be
    given as lists of signal names (a[i] = bit i) instead of a prefix."""
    A = a if isinstance(a, list) else [f"{a}{i}" for i in range(n)]
    B = b if isinstance(b, list) else [f"{b}{i}" for i in range(n)]
    net, carry = [], cin
    fa = full_adder_sop if sop else full_adder
    for i in range(n):
        nxt = f"{c}{i + 1}"
        net += fa(A[i], B[i], carry, f"{s}{i}", nxt, f"{prefix}{i}")
        carry = nxt
    return net


# ── Carry look-ahead ───────────────────────────────────────────────────────

def lookahead(gs, ps, cin, out, tag):
    """Two-level AND-OR carries: out[k] = G_k + P_k G_{k-1} + … + P_k … P_0 cin for every position k
    (out[k] is the carry INTO position k + 1). Returns the netlist."""
    net = []
    for k in range(len(gs)):
        terms = [gs[k]]
        for j in range(k - 1, -2, -1):
            lits = ps[j + 1:k + 1] + ([gs[j]] if j >= 0 else [cin])
            t = f"{tag}a{k}_{j + 1}"
            net.append((t, "AND", lits))
            terms.append(t)
        net.append((out[k], "OR", terms))
    return net


def cla(n, k=4, cin="c0", b="b"):
    """n-bit carry look-ahead adder with fan-in-k blocks, as many levels as needed (n = k^d):
    level 1 makes p_i = a_i ⊕ b_i and g_i = a_i b_i; each block of k makes a group G (two levels)
    and P (one AND); a lookahead unit over k groups makes the group carries; inside each block the
    carries come from the block's carry in (two levels); s_i = p_i ⊕ c_i."""
    net = []
    for i in range(n):
        net += [(f"p{i}", "XOR", [f"a{i}", f"{b}{i}"]), (f"g{i}", "AND", [f"a{i}", f"{b}{i}"])]
    made = set()

    def gp(lo, hi):
        """Names of the group (G, P) of bits lo … hi-1."""
        if hi - lo == 1:
            return f"g{lo}", f"p{lo}"
        G, P = f"G{lo}_{hi}", f"P{lo}_{hi}"
        if G not in made:
            size = (hi - lo) // k
            subs = [gp(lo + j * size, lo + (j + 1) * size) for j in range(k)]
            gs, ps = [x[0] for x in subs], [x[1] for x in subs]
            terms = [gs[-1]]
            for j in range(k - 2, -1, -1):
                t = f"{G}a{j}"
                net.append((t, "AND", ps[j + 1:] + [gs[j]]))
                terms.append(t)
            net.append((G, "OR", terms))
            net.append((P, "AND", ps))
            made.add(G)
        return G, P

    def carries(lo, hi, c_in):
        """Carries c_{lo+1} … c_hi of the bits lo … hi-1 given the carry c_lo = c_in."""
        L = hi - lo
        if L <= k:
            gs = [f"g{i}" for i in range(lo, hi)]
            ps = [f"p{i}" for i in range(lo, hi)]
            net.extend(lookahead(gs, ps, c_in, [f"c{i + 1}" for i in range(lo, hi)], f"L{lo}_{hi}"))
            return
        size = k ** (ceil(round(log(L, k), 9)) - 1)
        blocks = [(lo + j * size, lo + (j + 1) * size) for j in range(L // size)]
        subs = [gp(a_, b_) for a_, b_ in blocks]
        outs = [f"c{b_}" for _, b_ in blocks]
        net.extend(lookahead([x[0] for x in subs], [x[1] for x in subs], c_in, outs, f"T{lo}_{hi}"))
        for j, (a_, b_) in enumerate(blocks):
            cb = c_in if j == 0 else f"c{a_}"
            # the block's own carry out c_{b_} is already made by the level above
            if b_ - a_ <= k:
                gs = [f"g{i}" for i in range(a_, b_ - 1)]
                ps = [f"p{i}" for i in range(a_, b_ - 1)]
                net.extend(lookahead(gs, ps, cb, [f"c{i + 1}" for i in range(a_, b_ - 1)], f"L{a_}_{b_}"))
            else:
                inner_carries_except_top(a_, b_, cb)

    def inner_carries_except_top(lo, hi, c_in):
        L = hi - lo
        size = k ** (ceil(round(log(L, k), 9)) - 1)
        blocks = [(lo + j * size, lo + (j + 1) * size) for j in range(L // size)]
        subs = [gp(a_, b_) for a_, b_ in blocks]
        outs = [f"c{b_}" for _, b_ in blocks[:-1]]
        net.extend(lookahead([x[0] for x in subs[:-1]], [x[1] for x in subs[:-1]], c_in, outs, f"T{lo}_{hi}"))
        for j, (a_, b_) in enumerate(blocks):
            cb = c_in if j == 0 else f"c{a_}"
            if b_ - a_ <= k:
                gs = [f"g{i}" for i in range(a_, b_ - 1)]
                ps = [f"p{i}" for i in range(a_, b_ - 1)]
                net.extend(lookahead(gs, ps, cb, [f"c{i + 1}" for i in range(a_, b_ - 1)], f"L{a_}_{b_}"))
            else:
                inner_carries_except_top(a_, b_, cb)

    carries(0, n, cin)
    for i in range(n):
        net.append((f"s{i}", "XOR", [f"p{i}", cin if i == 0 else f"c{i}"]))
    return order(net)


def order(net):
    """Topologically sort a netlist (stable), so builders may append nodes in any order."""
    names = {x[0] for x in net}
    done, out, pending = set(), [], list(net)
    while pending:
        rest = []
        for node in pending:
            args = node[2]["d"] + node[2]["s"] if node[1] == "MUX" else node[2]
            deps = [x.lstrip("~") for x in args]
            if all(d not in names or d in done for d in deps):
                out.append(node)
                done.add(node[0])
            else:
                rest.append(node)
        assert len(rest) < len(pending), "netlist has a cycle"
        pending = rest
    return out


def cla_blocks_rippled(n, k=4, cin="c0"):
    """k-bit carry look-ahead blocks whose carries ripple from block to block (each block's carry
    out c_{4j+4} comes from its own two-level lookahead on the block's carry in)."""
    net = []
    for i in range(n):
        net += [(f"p{i}", "XOR", [f"a{i}", f"b{i}"]), (f"g{i}", "AND", [f"a{i}", f"b{i}"])]
    for lo in range(0, n, k):
        cb = cin if lo == 0 else f"c{lo}"
        idx = range(lo, lo + k)
        net += lookahead([f"g{i}" for i in idx], [f"p{i}" for i in idx], cb, [f"c{i + 1}" for i in idx], f"R{lo}")
    for i in range(n):
        net.append((f"s{i}", "XOR", [f"p{i}", cin if i == 0 else f"c{i}"]))
    return order(net)


def carry_select(n, blk, cin="c0"):
    """Carry-select adder: the first block is a plain ripple adder; every later block has two ripple
    adders (carry in 0 and 1) and 2:1 MUXes that pick the sums and the carry by the previous block's
    carry."""
    net = rca(blk, cin=cin, prefix="r")
    for j in range(1, n // blk):
        lo = j * blk
        A = [f"a{i}" for i in range(lo, lo + blk)]
        B = [f"b{i}" for i in range(lo, lo + blk)]
        for v in (0, 1):
            net += rca(blk, A, B, str(v), f"s{v}_{j}_", f"c{v}_{j}_", prefix=f"x{v}{j}_")
        sel = f"c{lo}"
        for i in range(blk):
            net.append((f"s{lo + i}", "MUX", {"d": [f"s0_{j}_{i}", f"s1_{j}_{i}"], "s": [sel]}))
        net.append((f"c{lo + blk}", "MUX", {"d": [f"c0_{j}_{blk}", f"c1_{j}_{blk}"], "s": [sel]}))
    return net


# ── Adder–subtractor, flags, BCD adder ─────────────────────────────────────

def adder_subtractor(n):
    """B_i ⊕ K into a ripple adder whose carry in is K (K = 0: A + B, K = 1: A − B), with the flags
    C = c_n, V = c_n ⊕ c_{n-1}, N = s_{n-1}, Z = NOR of the sums."""
    net = [(f"y{i}", "XOR", [f"b{i}", "K"]) for i in range(n)]
    net += rca(n, "a", "y", "K")
    net += [("V", "XOR", [f"c{n}", f"c{n - 1}"]), ("Z", "NOR", [f"s{i}" for i in range(n)]),
            ("N", "BUF", [f"s{n - 1}"]), ("C", "BUF", [f"c{n}"])]
    return net


def alu_2003():
    """GATE 2003: the B input of each full adder is B_i ⊕ K and the carry in C_0 is a separate line
    (4 bits suffice to decide every claim). Inputs a*, b*, K, c0."""
    n = 4
    net = [(f"y{i}", "XOR", [f"b{i}", "K"]) for i in range(n)]
    return net + rca(n, "a", "y", "c0")


def bcd_adder():
    """One-digit BCD adder: a 4-bit binary adder, the correction detector K + Z3 Z2 + Z3 Z1, and a
    second 4-bit adder that adds 0110 when the detector is 1. Inputs a0-3, b0-3, c0; outputs
    s0-3 (the BCD digit) and Cout."""
    net = rca(4, "a", "b", "c0", "z", "k", prefix="u")
    net += [("d32", "AND", ["z3", "z2"]), ("d31", "AND", ["z3", "z1"]), ("Cout", "OR", ["k4", "d32", "d31"])]
    net += rca(4, "z", ["0", "Cout", "Cout", "0"], "0", "s", "h", prefix="w")
    return net


def adder_converter_1996():
    """GATE 1996: b3 b2 b1 b0 plus the operand 0, b3·b2, 0, 0 (MSB → LSB), carry in 0; output
    d4 = carry, d3 … d0 = sum. Inputs b0-3."""
    net = [("t", "AND", ["b3", "b2"])]
    net += rca(4, "b", ["0", "0", "t", "0"], "0", "d", "k", prefix="q")
    net.append(("d4", "BUF", ["k4"]))
    return net


def lab_adder(kind, n, sub=True):
    """The Adder Race netlists: the adder–subtractor XOR row y_i = b_i ⊕ K, carry in K, then a
    ripple-carry ("rca") or carry look-ahead ("cla", fan-in 4) adder, and the flags."""
    net = [(f"y{i}", "XOR", [f"b{i}", "K"]) for i in range(n)]
    net += rca(n, "a", "y", "K") if kind == "rca" else cla(n, 4, "K", "y")
    net += [("V", "XOR", [f"c{n}", f"c{n - 1}"]), ("Z", "NOR", [f"s{i}" for i in range(n)])]
    return order(net)


def lab_inputs(n):
    return [f"a{i}" for i in range(n)] + [f"b{i}" for i in range(n)] + ["K"]


def lab_env(n, a, b, K):
    e = {f"a{i}": (a >> i) & 1 for i in range(n)}
    e.update({f"b{i}": (b >> i) & 1 for i in range(n)})
    e["K"] = K
    return e


# ── Multipliers ────────────────────────────────────────────────────────────

def array_multiplier(n):
    """n × n unsigned array multiplier (the textbook ripple-row array): n² AND gates make the
    partial products a_j b_i; row i (i = 1 … n-1) is an n-bit ripple adder that adds partial-product
    row i to the upper n bits of the running sum. Product bits P0 … P{2n-1}.

    Inputs a0 … a{n-1} (multiplicand), b0 … b{n-1} (multiplier)."""
    net = []
    for i in range(n):
        for j in range(n):
            net.append((f"pp{i}_{j}", "AND", [f"a{j}", f"b{i}"]))
    net.append(("P0", "BUF", ["pp0_0"]))
    upper = [f"pp0_{j}" for j in range(1, n)] + ["0"]
    for i in range(1, n):
        X = [f"pp{i}_{j}" for j in range(n)]
        net += rca(n, X, upper, "0", f"r{i}_", f"k{i}_", prefix=f"m{i}_")
        net.append((f"P{i}", "BUF", [f"r{i}_0"]))
        upper = [f"r{i}_{j}" for j in range(1, n)] + [f"k{i}_{n}"]
    for j in range(n):
        net.append((f"P{n + j}", "BUF", [upper[j]]))
    return net


def multiplier_cost(n):
    """(AND gates, adder cells) of the n × n array: n², n(n − 1)."""
    return n * n, n * (n - 1)


def sequential_multiply(m, q, n):
    """Unsigned shift-and-add hardware (registers C, A, Q, M): n cycles, each adds M to A when
    Q0 = 1 and shifts C A Q right. Returns the trace and the 2n-bit product."""
    C, A, Q = 0, 0, q
    trace = []
    for _ in range(n):
        add = Q & 1
        if add:
            t = A + m
            C, A = t >> n, t % 2 ** n
        comb = (C << 2 * n) | (A << n) | Q
        comb >>= 1
        C, A, Q = 0, (comb >> n) % 2 ** n, comb % 2 ** n
        trace.append((add, A, Q))
    return trace, (A << n) | Q


# ── Serial and pipelined adders ────────────────────────────────────────────

def serial_add(a, b, n):
    """Bit-serial adder: one full adder and a carry flip-flop; bit i is added in clock i. Returns
    the sum bits per clock and the final carry."""
    c, out = 0, []
    for i in range(n):
        x, y = (a >> i) & 1, (b >> i) & 1
        out.append(x ^ y ^ c)
        c = (x & y) | (x & c) | (y & c)
    return out, c


def pipeline_2002(A_seq, B_seq):
    """GATE 2002 (Q56): three register stages R0, R1, R2 and one full adder per stage, all loaded on
    the same clock edge. Returns Z = z3 z2 z1 z0 after each clock (initial registers all 0)."""
    def fa(x, y, c):
        return x ^ y ^ c, (x & y) | (x & c) | (y & c)

    R0 = dict(a2=0, a1=0, a0=0, b2=0, b1=0, b0=0)
    R1 = dict(a2=0, a1=0, b2=0, b1=0, s0=0, c1=0)
    R2 = dict(a2=0, b2=0, s0=0, s1=0, c2=0)
    out = []
    for A, B in zip(A_seq, B_seq):
        s0, c1 = fa(R0["a0"], R0["b0"], 0)
        s1, c2 = fa(R1["a1"], R1["b1"], R1["c1"])
        nR2 = dict(a2=R1["a2"], b2=R1["b2"], s0=R1["s0"], s1=s1, c2=c2)
        nR1 = dict(a2=R0["a2"], a1=R0["a1"], b2=R0["b2"], b1=R0["b1"], s0=s0, c1=c1)
        nR0 = dict(a2=A >> 2 & 1, a1=A >> 1 & 1, a0=A & 1, b2=B >> 2 & 1, b1=B >> 1 & 1, b0=B & 1)
        R0, R1, R2 = nR0, nR1, nR2
        z2, z3 = fa(R2["a2"], R2["b2"], R2["c2"])
        out.append(f"{z3}{z2}{R2['s1']}{R2['s0']}")
    return out


# ── Timing ─────────────────────────────────────────────────────────────────

def dly(op, delay):
    delay = delay or {}
    if op in delay:
        return delay[op]
    return delay.get("*", 1)


def _args(node):
    name, op, args = node
    return args["d"] + args["s"] if op == "MUX" else args


def arrival(net, inputs, delay=None):
    """Static arrival time of every line (longest path, delay per gate type; BUF and wires 0)."""
    t = {x: 0 for x in inputs}
    t["0"] = t["1"] = 0
    for node in net:
        name, op, _ = node
        d = 0 if op == "BUF" else dly(op, delay)
        t[name] = max(t[a.lstrip("~")] for a in _args(node)) + d
    return t


def simulate(net, inputs, old, new, delay=None, horizon=None):
    """Transport-delay simulation. The circuit is settled on `old`; `new` is applied at t = 0; a
    gate's output at time t is its function of its input values at time t − d (BUF has d = 0).
    Returns (settle, wave): settle[line] = time of the line's last change (0 if it never changes),
    wave[line] = its value at t = 0 … horizon."""
    st = arrival(net, inputs, delay)
    T = horizon if horizon is not None else max(st.values()) + 1
    v_old = cl.evaluate(net, old)
    wave = {x: [new[x]] * (T + 1) for x in inputs}

    def at(sig, t):
        neg = sig.startswith("~")
        base = sig.lstrip("~")
        if base in ("0", "1"):
            v = int(base)
        elif t < 0:
            v = v_old[base]
        else:
            v = wave[base][t]
        return 1 - v if neg else v

    for node in net:
        name, op, args = node
        d = 0 if op == "BUF" else dly(op, delay)
        w = []
        for t in range(T + 1):
            if op == "MUX":
                sel = cl.num([at(s, t - d) for s in args["s"]])
                w.append(at(args["d"][sel], t - d))
            else:
                w.append(cl.GATES[op]([at(a, t - d) for a in args]))
        wave[name] = w
    settle = {}
    for x, w in wave.items():
        last = 0
        prev = v_old[x] if x in v_old else w[0]
        for t, v in enumerate(w):
            if v != prev:
                last = t
            prev = v
        settle[x] = last
    final = cl.evaluate(net, new)
    for x in wave:
        assert wave[x][-1] == final[x], f"{x} has not settled by t = {T}"
    return settle, wave


def min_gates_multi(n_in, targets, gate="NAND", max_k=7):
    """Fewest 2-input `gate`s (NAND or NOR; inputs uncomplemented, no constants) that produce every
    target truth table (tuples over the 2^n_in rows, first input = MSB) on some line: an exhaustive
    iterative-deepening search over gate networks. Returns None if more than max_k are needed."""
    R = 2 ** n_in
    full = (1 << R) - 1

    def mask(t):
        return sum(int(v) << m for m, v in enumerate(t))

    ins = [mask([(m >> (n_in - 1 - i)) & 1 for m in range(R)]) for i in range(n_in)]
    want = [mask(t) for t in targets]
    op = (lambda x, y: full & ~(x & y)) if gate == "NAND" else (lambda x, y: full & ~(x | y))

    def rec(sigs, k):
        if all(w in sigs for w in want):
            return True
        missing = sum(1 for w in want if w not in sigs)
        if k < missing:
            return False
        n = len(sigs)
        for i in range(n):
            for j in range(i, n):
                v = op(sigs[i], sigs[j])
                if v in sigs:
                    continue
                if rec(sigs + [v], k - 1):
                    return True
        return False

    for k in range(1, max_k + 1):
        if rec(list(ins), k):
            return k
    return None


def gate_count(net, ops=None):
    from collections import Counter
    c = Counter(op for _, op, _ in net if op != "BUF")
    return {k: v for k, v in c.items() if ops is None or k in ops}


# ── Delay formulas (checked against the netlists in the self-test) ─────────

def rca_delay_unit(n):
    """Unit gate delays, full adder from two half adders + OR: carry out after 2n + 1."""
    return 2 * n + 1


def cla_delay_unit(n, k=4):
    """Unit gate delays, fan-in-k blocks, n = k^d: 2d + 2 levels for d ≥ 1 (p/g, then two levels
    per lookahead level up and down, then the sum XOR)."""
    d = round(log(n, k))
    assert k ** d == n
    return 1 + 2 * (2 * d - 1) + 1 if d > 1 else 4


# ── Lesson and practice helpers ────────────────────────────────────────────

def lesson_text(name):
    return (CH4 / name).read_text()


def practice():
    p = CH4 / "practice.json"
    return {q["id"]: q for q in json.loads(p.read_text())} if p.exists() else {}


# ── Self-test ──────────────────────────────────────────────────────────────

def check_adder(net, n, cin=True):
    ins = inputs_of(n)
    for a in range(2 ** n):
        for b in range(2 ** n):
            for c in ((0, 1) if cin else (0,)):
                v = cl.evaluate(net, env_of(n, a, b, c))
                assert word(v, "s", n) + (v[f"c{n}"] << n) == a + b + c, (n, a, b, c)


if __name__ == "__main__":
    # Half and full adders, both constructions, against the integer sum.
    for a, b, c in product((0, 1), repeat=3):
        v = cl.evaluate(full_adder("a", "b", "c", "s", "co", "0"), {"a": a, "b": b, "c": c})
        assert 2 * v["co"] + v["s"] == a + b + c
        v = cl.evaluate(full_adder_sop("a", "b", "c", "s", "co", "0"), {"a": a, "b": b, "c": c})
        assert 2 * v["co"] + v["s"] == a + b + c
        v = cl.evaluate(full_subtractor("x", "y", "z", "d", "bo", "0"), {"x": a, "y": b, "z": c})
        assert v["d"] - 2 * v["bo"] == a - b - c
    for n in (1, 2, 3, 4):
        check_adder(rca(n), n)
        check_adder(rca(n, sop=True), n)
    for n, k in ((4, 4), (8, 4), (16, 4), (4, 2), (8, 2)):
        net = cla(n, k)
        if n <= 4:
            check_adder(net, n)
        else:
            import random
            rnd = random.Random(n * 7 + k)
            for _ in range(3000):
                a, b, c = rnd.randrange(2 ** n), rnd.randrange(2 ** n), rnd.randrange(2)
                v = cl.evaluate(net, env_of(n, a, b, c))
                assert word(v, "s", n) + (v[f"c{n}"] << n) == a + b + c
    check_adder(carry_select(4, 2), 4)
    check_adder(carry_select(6, 2), 6)
    # Delays (unit gates) agree with the formulas.
    for n in (1, 2, 4, 8, 16):
        t = arrival(rca(n), inputs_of(n))
        assert t[f"c{n}"] == rca_delay_unit(n) and max(t[f"s{i}"] for i in range(n)) == 2 * n
    for n in (4, 16, 64):
        net = cla(n)
        t = arrival(net, inputs_of(n))
        assert max(t[x] for x in [f"s{i}" for i in range(n)] + [f"c{n}"]) == cla_delay_unit(n), (n, t[f"c{n}"])
    # Adder–subtractor and flags.
    n = 4
    net = adder_subtractor(n)
    for a in range(16):
        for b in range(16):
            for K in (0, 1):
                v = cl.evaluate(net, {**env_of(n, a, b), "K": K})
                r = word(v, "s", n)
                want = (a + b) if K == 0 else (a - b)
                assert r == want % 16
                assert v["V"] == int(not -8 <= ((tc(a, 4) + tc(b, 4)) if K == 0 else (tc(a, 4) - tc(b, 4))) <= 7)
                assert v["Z"] == int(r == 0) and v["N"] == r >> 3
                if K == 1:
                    assert v["C"] == int(a >= b)  # carry = NOT borrow
    # BCD adder: every digit pair and carry in.
    net = bcd_adder()
    for a in range(10):
        for b in range(10):
            for c in (0, 1):
                v = cl.evaluate(net, env_of(4, a, b, c))
                assert 10 * v["Cout"] + word(v, "s", 4) == a + b + c and word(v, "s", 4) <= 9
    # Array multiplier.
    for n in (2, 3, 4):
        net = array_multiplier(n)
        ins = [f"a{j}" for j in range(n)] + [f"b{j}" for j in range(n)]
        for x in range(2 ** n):
            for y in range(2 ** n):
                e = {**{f"a{j}": x >> j & 1 for j in range(n)}, **{f"b{j}": y >> j & 1 for j in range(n)}}
                assert word(cl.evaluate(net, e), "P", 2 * n) == x * y
    for m in range(16):
        for q in range(16):
            assert sequential_multiply(m, q, 4)[1] == m * q
    assert serial_add(11, 6, 4) == ([1, 0, 0, 0], 1)
    # Simulation: settles to the right values; 8-bit RCA, 1 + (−1) from all-zero inputs ripples the whole way.
    net = rca(8)
    st, _ = simulate(net, inputs_of(8), env_of(8, 0, 0), env_of(8, 1, 255))
    # stage 0 generates (a0 = b0 = 1), so c1 is ready after AND + OR = 2, then 2 per stage: c8 at 16.
    assert st["c8"] == 16 and max(st[f"s{i}"] for i in range(8)) == 15
    print("arithlib: adders (HA/FA, SOP FA, subtractors, ripple, CLA up to 64 bits, carry-select), adder–subtractor flags, "
          "BCD adder, array multiplier, sequential and serial adders, delays and transport simulation self-test OK")
