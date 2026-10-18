"""Shared helpers for the Digital Logic Chapter 4 checks (combinational circuits).

Everything is decided by enumeration over every input row, never by trusting a hand derivation:

- a **netlist** is a list of nodes in topological order, each ``(name, op, args)``:
  ``op`` is one of AND, OR, NAND, NOR, XOR, XNOR (any fan-in), NOT, BUF (one input),
  MUX (``args = {"d": [data…], "s": [select MSB … LSB], "en": name | None, "en_low": bool}``),
  DEC (``args = {"a": [address MSB … LSB], "en": name | None, "low": bool}``; its outputs are
  referred to as ``"<name>.<i>"``). Signal names are primary inputs, earlier node names or the
  constants ``"0"`` and ``"1"``; a leading ``~`` complements a signal (``"~x"``), which models a
  free inverter on an input wire;
- ``evaluate`` computes every line for one input row, optionally with stuck-at faults injected
  (``faults = {line: 0 | 1}``), so the fault lesson simulates the good and the faulty circuit with
  the same code that the MUX and decoder lessons use;
- rows are numbered with the first input as the most significant bit (as in boollib/minlib), and a
  MUX's select list is MSB first, so data input ``i`` is chosen when the select bits read ``i`` in
  binary.

Built on boollib (expressions, truth tables) and minlib (cubes, minimal SOP/POS). Run directly, it
self-tests (run_checks.py runs it as a check).
"""
from itertools import combinations, product
from math import ceil, log2
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import minlib as ml  # noqa: E402

ROOT = bl.ROOT
CH4 = bl.CONTENT / "04-combinational-circuits"

GATES = {
    "AND": lambda xs: int(all(xs)),
    "OR": lambda xs: int(any(xs)),
    "NAND": lambda xs: 1 - int(all(xs)),
    "NOR": lambda xs: 1 - int(any(xs)),
    "XOR": lambda xs: sum(xs) % 2,
    "XNOR": lambda xs: 1 - sum(xs) % 2,
    "NOT": lambda xs: 1 - xs[0],
    "BUF": lambda xs: xs[0],
}


# ── Rows and bits ──────────────────────────────────────────────────────────

def bits_of(m, n):
    """Row m as a list of n bits, MSB first."""
    return [(m >> (n - 1 - i)) & 1 for i in range(n)]


def num(bits):
    """A list of bits (MSB first) as an integer."""
    v = 0
    for b in bits:
        v = 2 * v + int(b)
    return v


def rows(inputs):
    """Every assignment of the inputs, as dicts, in row order (first input = MSB)."""
    n = len(inputs)
    return [dict(zip(inputs, bits_of(m, n))) for m in range(2 ** n)]


# ── Netlists ───────────────────────────────────────────────────────────────

def _sig(name, val):
    neg = name.startswith("~")
    base = name[1:] if neg else name
    if base in ("0", "1"):
        v = int(base)
    else:
        v = val[base]
    return 1 - v if neg else v


def evaluate(net, env, faults=None):
    """Every line's value for the input row `env` (dict name → 0/1). `faults` maps a line name
    (a primary input, a node output or a decoder output "Q.i") to its stuck value."""
    faults = faults or {}
    val = {}
    for k, v in env.items():
        val[k] = faults.get(k, v)
    for name, op, args in net:
        if op in GATES:
            out = GATES[op]([_sig(a, val) for a in args])
            val[name] = faults.get(name, out)
        elif op == "MUX":
            en = 1
            if args.get("en"):
                en = _sig(args["en"], val)
                if args.get("en_low"):
                    en = 1 - en
            sel = num([_sig(s, val) for s in args["s"]])
            out = _sig(args["d"][sel], val) if en else 0
            val[name] = faults.get(name, out)
        elif op == "DEC":
            en = 1
            if args.get("en"):
                en = _sig(args["en"], val)
                if args.get("en_low"):
                    en = 1 - en
            k = num([_sig(a, val) for a in args["a"]])
            for i in range(2 ** len(args["a"])):
                o = int(en and i == k)
                if args.get("low"):
                    o = 1 - o
                val[f"{name}.{i}"] = faults.get(f"{name}.{i}", o)
        else:
            raise ValueError(f"unknown op {op}")
    return val


def truth(net, inputs, out, faults=None):
    """The output column of `out` over every row of `inputs` (a tuple of 0/1)."""
    return tuple(evaluate(net, r, faults)[out] if not out.startswith("~") else 1 - evaluate(net, r, faults)[out[1:]]
                 for r in rows(inputs))


def ones_of(t):
    return [i for i, v in enumerate(t) if v]


def lines(net, inputs):
    """Every line of a netlist that can carry a stuck-at fault (inputs, then node outputs)."""
    out = list(inputs)
    for name, op, args in net:
        if op == "DEC":
            out += [f"{name}.{i}" for i in range(2 ** len(args["a"]))]
        else:
            out.append(name)
    return out


# ── Multiplexers ───────────────────────────────────────────────────────────

def mux(data, sel):
    """Output of a MUX with the given data values and select bits (MSB first)."""
    assert len(data) == 2 ** len(sel)
    return data[num(sel)]


def mux_sop(n_sel):
    """The MUX equation Y = Σ m_i(S) I_i as a list of (minterm of S, data index)."""
    return [(i, i) for i in range(2 ** n_sel)]


def select_lines(n_inputs):
    """Fewest select lines for an N:1 MUX (⌈log2 N⌉)."""
    return 0 if n_inputs <= 1 else ceil(log2(n_inputs))


def residues(ones, n, sel_idx, dcs=()):
    """Implementation table: for a MUX whose selects are the variables at positions sel_idx (MSB
    first), the residue on each data line as a truth table over the remaining variables (in their
    original order). A don't-care row gives 'X' in the residue."""
    rest = [i for i in range(n) if i not in sel_idx]
    out = []
    for s in range(2 ** len(sel_idx)):
        sb = bits_of(s, len(sel_idx))
        col = []
        for r in range(2 ** len(rest)):
            rb = bits_of(r, len(rest))
            bitsv = [0] * n
            for i, b in zip(sel_idx, sb):
                bitsv[i] = b
            for i, b in zip(rest, rb):
                bitsv[i] = b
            m = num(bitsv)
            col.append("X" if m in dcs else (1 if m in ones else 0))
        out.append(tuple(col))
    return out, rest


def residue_name(col, rvars):
    """A residue (truth table over rvars, 'X' = don't-care) named in the lessons' notation:
    0, 1, x, x′ for one variable; a minimal SOP for more."""
    care = [v for v in col if v != "X"]
    if not care or all(v == 0 for v in care):
        return "0"
    if all(v == 1 for v in care):
        return "1"
    ones = [i for i, v in enumerate(col) if v == 1]
    dcs = [i for i, v in enumerate(col) if v == "X"]
    cover = sorted(ml.min_covers(ones, dcs, len(rvars))[0], key=lambda c: (ml.literals(c), c.replace("-", "2")))
    return ml.sop(cover, rvars).replace("'", "′")


def impl_table(ones, n, sel_idx, vars_, dcs=()):
    """(names of the residues on I0 … I(2^k − 1), the residue variables)."""
    cols, rest = residues(ones, n, sel_idx, dcs)
    rv = [vars_[i] for i in rest]
    return [residue_name(c, rv) for c in cols], rv


def mux_realises(ones, n, sel_idx, data_exprs, vars_):
    """True when a MUX with selects vars_[sel_idx] and data inputs given as expressions over the
    other variables (strings, or '0'/'1') computes the function with these minterms."""
    got = []
    for m in range(2 ** n):
        env = dict(zip(vars_, bits_of(m, n)))
        s = num([env[vars_[i]] for i in sel_idx])
        e = data_exprs[s]
        v = int(e) if e in ("0", "1") else bl.ev(bl.parse(e), env)
        got.append(v)
    return ones_of(got) == sorted(ones)


def mux_tree(n_inputs, k):
    """An N:1 MUX built from k:1 MUXes: (blocks per level from the data side, total, levels).
    Each level rounds up (a partly used block still counts)."""
    levels, m = [], n_inputs
    while m > 1:
        m = ceil(m / k)
        levels.append(m)
    return levels, sum(levels), len(levels)


# ── Decoders, demultiplexers, encoders ─────────────────────────────────────

def decoder(addr_bits, en=1, low=False):
    """Outputs D0 … D(2^n − 1) of an n:2^n decoder (address MSB first)."""
    k = num(addr_bits)
    out = [int(en and i == k) for i in range(2 ** len(addr_bits))]
    return [1 - o for o in out] if low else out


def demux(d, sel):
    """A 1:2^n DEMUX: the data bit appears on output num(sel), every other output is 0."""
    return decoder(sel, en=d)


def decoder_tree(n, k):
    """An n:2^n decoder from k:2^k decoders with enables and no other gates:
    (blocks per level from the output side, total). Leaves: 2^(n−k); each level up drives the
    enables of the level below."""
    assert n >= k
    levels, need = [], 2 ** n
    while need > 1:
        need = ceil(need / 2 ** k)
        levels.append(need)
    return levels, sum(levels)


def encoder(d):
    """A 2^n:n binary encoder that assumes exactly one active input (OR of the indices with bit j);
    returns the code bits MSB first. With several active inputs it ORs their codes."""
    n = max(1, ceil(log2(len(d))))
    return [int(any(d[i] for i in range(len(d)) if (i >> (n - 1 - j)) & 1)) for j in range(n)]


def priority_encoder(d, order=None):
    """(code bits MSB first, valid) for a priority encoder. `order` lists input indexes from the
    highest priority down (default: the highest index wins). Invalid (no input active): code 0…0."""
    n = max(1, ceil(log2(len(d))))
    order = order if order is not None else list(range(len(d) - 1, -1, -1))
    for i in order:
        if d[i]:
            return bits_of(i, n), 1
    return [0] * n, 0


# ── Comparators and parity ─────────────────────────────────────────────────

def compare(a, b):
    """(G, E, L) for unsigned integers a and b."""
    return int(a > b), int(a == b), int(a < b)


def comparator_gt_expr(n, A="A", B="B"):
    """The cascade expression for A > B over n bits (MSB index n−1), as a boollib string using
    x_i = A_i ⊙ B_i written out with XNOR."""
    terms = []
    for i in range(n - 1, -1, -1):
        eqs = [f"({A}{j} \\odot {B}{j})" for j in range(n - 1, i, -1)]
        terms.append(" ".join(eqs + [f"{A}{i} {B}{i}'"]))
    return " + ".join(terms)


def parity(bits, even=True):
    """The parity bit that makes the total number of 1s even (even=True) or odd."""
    p = sum(bits) % 2
    return p if even else 1 - p


def xor_tree(n):
    """(2-input XOR gates, depth) of a balanced XOR tree over n inputs."""
    return n - 1, ceil(log2(n)) if n > 1 else 0


# ── ROM, PLA, PAL ──────────────────────────────────────────────────────────

def rom_size(n_in, n_out):
    """(words, bits per word, total bits) of a ROM storing an n_in-input, n_out-output table."""
    return 2 ** n_in, n_out, 2 ** n_in * n_out


def multiplier_rom(n, m=None):
    """ROM for an n-bit × m-bit unsigned multiplier: (words, width, total bits); width is the
    number of bits of the largest product."""
    m = n if m is None else m
    width = ((2 ** n - 1) * (2 ** m - 1)).bit_length()
    return 2 ** (n + m), width, 2 ** (n + m) * width


def pla_min_terms(funcs, n, max_k=8):
    """Fewest distinct product terms for a PLA computing every (ones, dcs) output: each output is
    the OR of some of the shared terms, each term inside that output's ones ∪ dcs. Exhaustive
    search over implicants (practical for n ≤ 3, or n = 4 with few terms). Returns (k, terms)."""
    cands = sorted({c for ones, dcs in funcs for c in ml.implicants(ones, dcs, n)}, key=ml.cube_key)
    for k in range(0, max_k + 1):
        for comb in combinations(cands, k):
            ok = True
            for ones, dcs in funcs:
                allowed = set(ones) | set(dcs)
                cov = set()
                for c in comb:
                    cs = set(ml.cells(c))
                    if cs <= allowed:
                        cov |= cs
                if not set(ones) <= cov:
                    ok = False
                    break
            if ok:
                return k, list(comb)
    return None


def pal_terms(funcs, n):
    """Product terms a PAL needs: no sharing, so the sum of each output's minimal term count."""
    return sum(len(ml.min_covers(ones, dcs, n, "terms")[0]) if ones else 0 for ones, dcs in funcs)


# ── Gate counts ─────────────────────────────────────────────────────────────

def min_gates_aon(ones, n, dcs=(), max_k=4, max_fanin=None):
    """Fewest AND, OR and NOT gates (AND/OR of any fan-in ≥ 2, up to max_fanin) computing f on its
    care rows, when only the uncomplemented inputs are available (each inverter is a gate).
    Exhaustive iterative deepening over signal masks."""
    R = 2 ** n
    full = (1 << R) - 1
    care = full & ~sum(1 << m for m in dcs)
    goal = sum(1 << m for m in ones)
    ins = bl.input_masks(n)
    fanin = max_fanin or n + max_k

    def hit(s):
        return (s & care) == (goal & care)

    if any(hit(s) for s in ins) or hit(0) or hit(full):
        return 0

    def dfs(sig, k):
        cand = set()
        for s in sig:
            cand.add(full ^ s)
        for r in range(2, min(fanin, len(sig)) + 1):
            for c in combinations(sig, r):
                a, o = full, 0
                for x in c:
                    a &= x
                    o |= x
                cand.add(a)
                cand.add(o)
        for s in cand:
            if hit(s):
                return True
        if k > 1:
            for s in cand:
                if s not in sig and dfs(sig + [s], k - 1):
                    return True
        return False

    for k in range(1, max_k + 1):
        if dfs(list(ins), k):
            return k
    return None


# ── Stuck-at faults ────────────────────────────────────────────────────────

def detects(net, inputs, out, line, v, row_env):
    """True when the input row exposes `line` stuck-at-v (the good and faulty outputs differ)."""
    return evaluate(net, row_env)[out] != evaluate(net, row_env, {line: v})[out]


def tests_for(net, inputs, out, line, v):
    """Every input row (as an integer, first input = MSB) that detects line stuck-at-v."""
    return [m for m, r in enumerate(rows(inputs)) if detects(net, inputs, out, line, v, r)]


def boolean_difference(net, inputs, out, line):
    """Rows where forcing the line to 0 and to 1 give different outputs (the line is observable)."""
    return [m for m, r in enumerate(rows(inputs))
            if evaluate(net, r, {line: 0})[out] != evaluate(net, r, {line: 1})[out]]


def multiple_fault_count(n_lines):
    """Distinct multiple stuck-at faults on n lines, by enumeration: each line is fault-free, s-a-0 or
    s-a-1, and the all-fault-free assignment is not a fault."""
    return sum(1 for a in product((None, 0, 1), repeat=n_lines) if any(x is not None for x in a))


# ── Lesson and practice helpers ────────────────────────────────────────────

def lesson_text(name):
    return (CH4 / name).read_text()


def practice():
    p = CH4 / "practice.json"
    return {q["id"]: q for q in json.loads(p.read_text())} if p.exists() else {}


# ── Self-test ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # A 4:1 MUX equals its SOP equation for every data/select pattern.
    for d in product((0, 1), repeat=4):
        for s in product((0, 1), repeat=2):
            assert mux(list(d), list(s)) == [d[0], d[1], d[2], d[3]][2 * s[0] + s[1]]
    # XOR3 on a 4:1 MUX (S1 = A, S0 = B, data C, C', C', C).
    V3 = list("ABC")
    net = [("f", "MUX", {"d": ["C", "~C", "~C", "C"], "s": ["A", "B"]})]
    assert truth(net, V3, "f") == bl.tt("A \\oplus B \\oplus C", V3)
    names, rv = impl_table(bl.minterms("A \\oplus B \\oplus C", V3), 3, [0, 1], V3)
    assert names == ["C", "C′", "C′", "C"] and rv == ["C"]
    # Majority with select z: residues are xy (z = 0) and x + y (z = 1).
    XYZ = list("xyz")
    maj = bl.minterms("xy + yz + zx", XYZ)
    names, rv = impl_table(maj, 3, [2], XYZ)
    assert names == ["xy", "x + y"] and rv == ["x", "y"]
    assert mux_realises(maj, 3, [2], ["xy", "x + y"], XYZ)
    # Enable: disabled MUX outputs 0.
    net = [("f", "MUX", {"d": ["x", "x", "y", "~y"], "s": ["~y", "z"], "en": "~z"})]
    assert ones_of(truth(net, XYZ, "f")) == bl.minterms("xyz'", XYZ)
    # Trees.
    assert mux_tree(16, 4) == ([4, 1], 5, 2) and mux_tree(32, 2)[1] == 31 and mux_tree(64, 4)[1] == 21
    assert mux_tree(10, 4) == ([3, 1], 4, 2)
    assert decoder_tree(6, 3) == ([8, 1], 9) and decoder_tree(4, 2) == ([4, 1], 5) and decoder_tree(5, 3) == ([4, 1], 5)
    assert decoder_tree(8, 2)[1] == 64 + 16 + 4 + 1
    # Decoders and demux.
    assert decoder([1, 0, 1]) == [0, 0, 0, 0, 0, 1, 0, 0] and decoder([1, 0], low=True) == [1, 1, 0, 1]
    assert demux(0, [1, 1]) == [0, 0, 0, 0] and demux(1, [1, 1]) == [0, 0, 0, 1]
    net = [("Q", "DEC", {"a": ["z", "y", "x"]}), ("f", "NOR", ["Q.7", "Q.5", "Q.2", "Q.0"])]
    assert truth(net, list("zyx"), "f") == bl.tt("x \\oplus z", list("zyx"))
    # Encoders.
    assert encoder([0, 0, 1, 0]) == [1, 0] and priority_encoder([1, 1, 0, 1]) == ([1, 1], 1)
    assert priority_encoder([0, 0, 0, 0]) == ([0, 0], 0) and priority_encoder([1, 1, 0, 0]) == ([0, 1], 1)
    # Comparator cascade expression equals A > B for 2 and 3 bits.
    for n in (2, 3):
        vs = [f"A{i}" for i in range(n - 1, -1, -1)] + [f"B{i}" for i in range(n - 1, -1, -1)]
        t = bl.tt(comparator_gt_expr(n), vs)
        assert all(t[m] == compare(m >> n, m & (2 ** n - 1))[0] for m in range(4 ** n))
    assert parity([1, 0, 1, 1]) == 1 and parity([1, 0, 1, 1], even=False) == 0 and xor_tree(8) == (7, 3) and xor_tree(5) == (4, 3)
    # ROMs.
    assert multiplier_rom(4) == (256, 8, 2048) and multiplier_rom(8) == (65536, 16, 1048576) and rom_size(4, 3) == (16, 3, 48)
    # PLA vs PAL: f1 = AB + AC, f2 = AB + BC share AB.
    f1, f2 = bl.minterms("AB + AC", V3), bl.minterms("AB + BC", V3)
    assert pla_min_terms([(f1, []), (f2, [])], 3)[0] == 3 and pal_terms([(f1, []), (f2, [])], 3) == 4
    # Gate counts (AND/OR/NOT, no free complements): digit ≥ 5 on BCD is A + B(C + D): 3 gates.
    V4 = list("ABCD")
    assert min_gates_aon([5, 6, 7, 8, 9], 4, range(10, 16)) == 3
    assert min_gates_aon(bl.minterms("A'", ["A", "B"]), 2) == 1
    # Faults: NAND(A, B) = p feeding NAND(p, C); p s-a-1 is detected only by A = B = C = 1.
    net = [("p", "NAND", ["A", "B"]), ("f", "NAND", ["p", "C"])]
    assert tests_for(net, V3, "f", "p", 1) == [7]
    assert boolean_difference(net, V3, "f", "p") == [1, 3, 5, 7]
    assert [multiple_fault_count(k) for k in (1, 2, 3)] == [3 ** k - 1 for k in (1, 2, 3)]
    print("comblib: netlists (MUX/DEC/enable), implementation tables, trees, decoders, encoders, comparators, parity, ROM/PLA/PAL sizing, gate counts and fault simulation self-test OK")
