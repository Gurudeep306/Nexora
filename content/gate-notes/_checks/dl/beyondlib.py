"""beyondlib: the checked arithmetic behind Digital Logic Chapter 7, Lessons 1 and 3 (optional: beyond the
core GATE syllabus). Every number, table, trace and key in those lessons, their viz scenes, solutions and
practice questions is computed here (exact Fractions for every circuit value).

Memory organisation (Lesson 1, memory-devices)
- addr_lines, capacity, chip_plan (word / capacity expansion: rows, columns, chips, address split,
  chip-select decoder and its unused outputs), address_map, which_chip, hx;
- MemorySystem: a bit-true simulation of an array of w x b chips with a chip-select decoder (write every
  address, read it back, count which chips answer), used to prove the expansion recipes by experiment;
- lines_2d / best_split (2-D row/column decoding), aliases / alias_addresses (incomplete decoding),
  refresh_interval / refresh_overhead (DRAM refresh), cell transistor counts.

Logic families (Lesson 3, logic-families)
- a switch-level simulator of MOS networks (`evaluate`): NMOS on for gate 1, PMOS on for gate 0, a load
  ('r') always on; every conducting path from the node to a driven node is found, a value passed only
  through "good" transistors (NMOS for 0, PMOS for 1) is strong, one passed through a "bad" transistor
  is degraded, one through a load is weak; Z when no path, X on a fight between transistors;
- CMOS gates from series-parallel expressions (`cmos_gate`): NMOS pull-down, dual PMOS pull-up;
  `exclusive` checks that exactly one network conducts for every input;
- transmission gates and the TG multiplexer; the 1991 pass-transistor network (NET_1991);
- noise margins, input classification, the 1998 option intervals, fan-out, dynamic power C·V²·f,
  power-delay product, transistor sizing for NAND vs NOR, and the family comparison data.

    python3 content/gate-notes/_checks/dl/beyondlib.py      # self-test
"""
import math
import pathlib
import sys
from fractions import Fraction as F
from itertools import product

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402

CH7 = bl.CONTENT / "07-beyond-syllabus"
K = 1024


def lesson_text(name):
    return (CH7 / name).read_text()


def practice():
    import json
    p = CH7 / "practice.json"
    return {q["id"]: q for q in json.loads(p.read_text())} if p.exists() else {}


def fr(x):
    """An exact Fraction from an int, a Fraction or a decimal string such as '2.4'."""
    return x if isinstance(x, F) else F(str(x)) if not isinstance(x, int) else F(x)


def dec(x, places=None):
    """Plain decimal text of a Fraction (exact when it terminates; else rounded to `places`)."""
    x = fr(x)
    if places is None:
        for p in range(0, 12):
            if (x * 10 ** p).denominator == 1:
                places = p
                break
        else:
            raise ValueError(f"{x} does not terminate; give places")
    s = f"{float(round(x, places)):.{places}f}"
    return s


# ══ Lesson 1: memory organisation ══════════════════════════════════════════

def addr_lines(words):
    """Address lines needed to name `words` locations: ceil(log2 words)."""
    assert words >= 1
    return (words - 1).bit_length()


def is_pow2(n):
    return n >= 1 and n & (n - 1) == 0


def capacity(words, width):
    return words * width


def size_text(words):
    """1024 -> '1K', 65536 -> '64K', 1048576 -> '1M'; others as plain numbers."""
    for unit, v in (("M", K * K), ("K", K)):
        if words >= v and words % v == 0:
            return f"{words // v}{unit}"
    return str(words)


def chip_plan(W, B, w, b):
    """Build a W x B memory from w x b chips: rows of chips (capacity), chips per row (width)."""
    rows, cols = -(-W // w), -(-B // b)
    low = addr_lines(w)
    total = addr_lines(W)
    dec_in = addr_lines(rows) if rows > 1 else 0
    return {"rows": rows, "cols": cols, "chips": rows * cols, "low_bits": low, "addr_bits": total,
            "high_bits": total - low, "decoder": (dec_in, 2 ** dec_in) if rows > 1 else None,
            "unused_outputs": (2 ** dec_in - rows) if rows > 1 else 0,
            "ratio": F(W * B, w * b)}


def address_map(W, w, base=0):
    """(row, first, last) address of every row of chips."""
    rows = -(-W // w)
    return [(r, base + r * w, base + (r + 1) * w - 1) for r in range(rows)]


def which_chip(addr, w):
    """(row of chips, word offset inside the chip) for a system address."""
    return addr // w, addr % w


def hx(n, digits=4):
    return f"{n:0{digits}X}"


class Chip:
    def __init__(self, words, width):
        self.words, self.width = words, width
        self.cells = [0] * words
        self.selected = 0  # how many accesses selected this chip

    def access(self, cs, addr, we=False, data=None):
        if not cs:
            return None  # tri-state: the chip does not drive the data bus
        self.selected += 1
        assert 0 <= addr < self.words
        if we:
            assert 0 <= data < 2 ** self.width
            self.cells[addr] = data
            return None
        return self.cells[addr]


class MemorySystem:
    """rows x cols chips of w x b; low address bits to every chip, high bits to a chip-select decoder,
    column c of a row holds bits [c·b, (c + 1)·b) of the word."""

    def __init__(self, W, B, w, b):
        self.plan = chip_plan(W, B, w, b)
        self.W, self.B, self.w, self.b = W, B, w, b
        self.chips = [[Chip(w, b) for _ in range(self.plan["cols"])] for _ in range(self.plan["rows"])]

    def decode(self, addr):
        hi = addr >> self.plan["low_bits"]
        return [int(r == hi) for r in range(self.plan["rows"])]  # one-hot chip selects

    def write(self, addr, value):
        assert 0 <= addr < self.W and 0 <= value < 2 ** self.B
        cs = self.decode(addr)
        lo = addr & (self.w - 1)
        for r, row in enumerate(self.chips):
            for c, ch in enumerate(row):
                ch.access(cs[r], lo, True, (value >> (c * self.b)) & (2 ** self.b - 1))

    def read(self, addr):
        cs = self.decode(addr)
        lo = addr & (self.w - 1)
        bus = [None] * self.plan["cols"]
        drivers = 0
        for r, row in enumerate(self.chips):
            for c, ch in enumerate(row):
                v = ch.access(cs[r], lo)
                if v is not None:
                    assert bus[c] is None, "two chips drive the same data lines"
                    bus[c] = v
                    drivers += 1
        assert drivers == self.plan["cols"]
        return sum(v << (c * self.b) for c, v in enumerate(bus)), [r for r in range(self.plan["rows"]) if cs[r]]


def verify_system(W, B, w, b):
    """Write a distinct pattern to every address, read everything back; True if the array is a W x B memory."""
    m = MemorySystem(W, B, w, b)
    pat = [(a * 2654435761) % (2 ** B) for a in range(W)]
    for a in range(W):
        m.write(a, pat[a])
    ok = all(m.read(a)[0] == pat[a] for a in range(W))
    rows_hit = {m.read(a)[1][0] for a in range(W)}
    return ok and rows_hit == set(range(m.plan["rows"]))


def lines_2d(k, r):
    """Decoder output lines when k address bits split into r row bits and k - r column bits."""
    return 2 ** r + 2 ** (k - r)


def best_split(k):
    return min(range(0, k + 1), key=lambda r: (lines_2d(k, r), -r))


def alias_addresses(bus_bits, chip_bits, decoded_high):
    """Incomplete decoding: a 2^chip_bits chip on a bus_bits-wide bus whose chip select checks only the
    high bits listed in decoded_high {bit: value}. Returns the start addresses of every copy (alias)."""
    starts = set()
    for a in range(0, 2 ** bus_bits, 2 ** chip_bits):
        if all(((a >> bit) & 1) == v for bit, v in decoded_high.items()):
            starts.add(a)
    return sorted(starts)


def aliases(bus_bits, chip_bits, n_decoded):
    return 2 ** (bus_bits - chip_bits - n_decoded)


def refresh_interval(period, rows):
    """Time between row refreshes when `rows` rows must each be refreshed once per `period`."""
    return fr(period) / rows


def refresh_overhead(rows, t_row, period):
    """Fraction of time a DRAM is busy refreshing (one row cycle t_row per row per period)."""
    return rows * fr(t_row) / fr(period)


CELL_TRANSISTORS = {"SRAM": 6, "DRAM": 1}


# ══ Lesson 3: switch-level MOS networks ════════════════════════════════════

def lit(env, g):
    if g in (0, 1):
        return g
    if g.startswith("~"):
        return 1 - lit(env, g[1:])
    return env[g]


def conducts(t, env):
    kind, g = t[0], t[1]
    if kind == "r":
        return True
    v = lit(env, g)
    return v == 1 if kind == "n" else v == 0


LEVEL = {"strong": 3, "degraded": 2, "weak": 1}


def _paths(trans, env, drivers, node):
    adj = {}
    for t in trans:
        if conducts(t, env):
            _, _, a, b = t
            adj.setdefault(a, []).append((b, t[0]))
            adj.setdefault(b, []).append((a, t[0]))
    found = []

    def dfs(n, seen, kinds):
        if n in drivers and (kinds or n == node):
            found.append((drivers[n], list(kinds)))
            return
        for m, k in adj.get(n, []):
            if m not in seen:
                dfs(m, seen | {m}, kinds + [k])

    dfs(node, {node}, [])
    return found


def path_level(v, kinds):
    if "r" in kinds:
        return "weak"
    good = "n" if v == 0 else "p"
    return "strong" if all(k == good for k in kinds) else "degraded"


def evaluate(trans, env, node, drivers=None):
    """Switch-level value of `node`. trans: [(kind 'n'|'p'|'r', gate literal, node a, node b)];
    drivers: {node: value} (VDD = 1 and GND = 0 are added). Returns a dict with value (0, 1, 'Z', 'X'),
    level ('strong'|'degraded'|'weak'|None), fight (both values reachable: a static current path) and
    paths [(value, kinds)]."""
    d = {"VDD": 1, "GND": 0}
    d.update(drivers or {})
    found = _paths(trans, env, d, node)
    best = {}
    for v, kinds in found:
        lv_ = path_level(v, kinds)
        if v not in best or LEVEL[lv_] > LEVEL[best[v]]:
            best[v] = lv_
    if not best:
        return {"value": "Z", "level": None, "fight": False, "paths": found}
    if len(best) == 1:
        (v, lv_), = best.items()
        return {"value": v, "level": lv_, "fight": False, "paths": found}
    # both values reachable: a load (weak) loses to a transistor path (ratioed logic); otherwise X
    if best[0] == "weak" and best[1] != "weak":
        return {"value": 1, "level": best[1], "fight": True, "paths": found}
    if best[1] == "weak" and best[0] != "weak":
        return {"value": 0, "level": best[0], "fight": True, "paths": found}
    return {"value": "X", "level": None, "fight": True, "paths": found}


# Series-parallel expressions: a variable name (str, '~' allowed), ("and", [...]) or ("or", [...]).
def AND(*xs):
    return ("and", list(xs))


def OR(*xs):
    return ("or", list(xs))


def ev(e, env):
    if isinstance(e, str):
        return lit(env, e)
    vals = [ev(x, env) for x in e[1]]
    return int(all(vals)) if e[0] == "and" else int(any(vals))


def variables(e):
    if isinstance(e, str):
        return [e.lstrip("~")]
    out = []
    for x in e[1]:
        for v in variables(x):
            if v not in out:
                out.append(v)
    return out


def network(e, kind, a, b, fresh):
    """Transistors between nodes a and b. NMOS: AND = series, OR = parallel (conducts iff e = 1).
    PMOS: the dual, AND = parallel, OR = series (conducts iff e = 0)."""
    if isinstance(e, str):
        return [(kind, e, a, b)]
    series = (e[0] == "and") == (kind == "n")
    out = []
    if series:
        nodes = [a] + [fresh() for _ in e[1][:-1]] + [b]
        for x, (u, v) in zip(e[1], zip(nodes, nodes[1:])):
            out += network(x, kind, u, v, fresh)
    else:
        for x in e[1]:
            out += network(x, kind, a, b, fresh)
    return out


def cmos_gate(e, out="Y"):
    """Static CMOS gate computing Y = NOT e: NMOS pull-down network of e between Y and GND, the dual
    PMOS pull-up network between VDD and Y."""
    cnt = [0]

    def fresh():
        cnt[0] += 1
        return f"m{cnt[0]}"
    pdn = network(e, "n", out, "GND", fresh)
    pun = network(e, "p", "VDD", out, fresh)
    return pdn + pun, pdn, pun


def net_conducts(trans, env, a, b):
    adj = {}
    for t in trans:
        if conducts(t, env):
            adj.setdefault(t[2], set()).add(t[3])
            adj.setdefault(t[3], set()).add(t[2])
    seen, todo = {a}, [a]
    while todo:
        n = todo.pop()
        for m in adj.get(n, ()):
            if m not in seen:
                seen.add(m)
                todo.append(m)
    return b in seen


def exclusive(e, out="Y"):
    """For every input: exactly one of pull-up / pull-down conducts, and Y = NOT e, strong."""
    allt, pdn, pun = cmos_gate(e, out)
    vs = variables(e)
    for bits in product((0, 1), repeat=len(vs)):
        env = dict(zip(vs, bits))
        dn, up = net_conducts(pdn, env, out, "GND"), net_conducts(pun, env, "VDD", out)
        r = evaluate(allt, env, out)
        if dn == up or r["value"] != 1 - ev(e, env) or r["level"] != "strong":
            return False
    return True


def truth_table(trans, vs, node, drivers=None):
    rows = []
    for bits in product((0, 1), repeat=len(vs)):
        env = dict(zip(vs, bits))
        dd = {k: (lit(env, v) if isinstance(v, str) else v) for k, v in (drivers or {}).items()}
        rows.append((bits, evaluate(trans, env, node, dd)))
    return rows


# The 1991 network: x -> PMOS(a) -> m1 -> NMOS(b) -> f ; y -> NMOS(a) -> m2 -> PMOS(b) -> f.
NET_1991 = [("p", "a", "x", "m1"), ("n", "b", "m1", "f"), ("n", "a", "y", "m2"), ("p", "b", "m2", "f")]


def f_1991(a, b, x, y):
    return evaluate(NET_1991, {"a": a, "b": b}, "f", {"x": x, "y": y})


def tgate(ctrl, a, b):
    """Transmission gate: NMOS gated by ctrl in parallel with PMOS gated by NOT ctrl."""
    return [("n", ctrl, a, b), ("p", "~" + ctrl, a, b)]


TG_MUX = tgate("~s", "i0", "y") + tgate("s", "i1", "y")

VDD, VTN, VTP = F(5), F("0.7"), F("0.7")  # illustrative supply and threshold magnitudes (no body effect)


def pass_voltage(v, kinds, vdd=VDD, vtn=VTN, vtp=VTP):
    """Voltage a logic value v reaches after passing the transistors `kinds` (a series path): a 1 through
    any NMOS stops at vdd - vtn, a 0 through any PMOS stops at vtp; good-type devices pass it fully."""
    if v == 1:
        return vdd - vtn if "n" in kinds else vdd
    return vtp if "p" in kinds else F(0)

# nMOS (depletion-load) gates: a load from VDD to Y, the NMOS pull-down of e.
def nmos_gate(e, out="Y"):
    cnt = [0]

    def fresh():
        cnt[0] += 1
        return f"m{cnt[0]}"
    return [("r", 1, "VDD", out)] + network(e, "n", out, "GND", fresh)


def transistors(trans):
    """Transistor count; an nMOS load ('r') is a depletion-mode transistor and counts as one."""
    return len(trans)


# ══ Lesson 3: electrical numbers ═══════════════════════════════════════════

TTL = {"VOH": F("2.4"), "VOL": F("0.4"), "VIH": F("2.0"), "VIL": F("0.8"), "VCC": F(5)}
CMOS5 = {"VOH": F("4.9"), "VOL": F("0.1"), "VIH": F("3.5"), "VIL": F("1.5"), "VCC": F(5)}  # 30 % / 70 % of 5 V


def noise_margins(fam):
    return fam["VOH"] - fam["VIH"], fam["VIL"] - fam["VOL"]


def classify(v, fam):
    """How an input of the family reads voltage v: '1', '0' or 'undefined'."""
    v = fr(v)
    return "1" if v >= fam["VIH"] else "0" if v <= fam["VIL"] else "undefined"


def output_ok(v, level, fam):
    v = fr(v)
    return v >= fam["VOH"] if level == 1 else v <= fam["VOL"]


# 1998 Q15: each option as an interval (lo, hi); None = unbounded; 'VCC' = the supply.
OPT_1998 = {"A": (F("2.5"), None), "B": (F("0.8"), F("5.0")), "C": (None, F("5.0")), "D": (F("2.8"), "VCC")}


def interval_reading(opt, fam=TTL):
    """Classify an option interval: does every voltage in it read as a valid logic 1 within the supply?"""
    lo, hi = opt
    hi_v = fam["VCC"] if hi == "VCC" else hi
    lo_v = F(0) if lo is None else lo
    if hi is None:
        return "unbounded above the supply"
    reads = {classify(v, fam) for v in (lo_v, (lo_v + fam["VIL"]) / 2 if lo_v < fam["VIL"] else lo_v,
                                         (fam["VIL"] + fam["VIH"]) / 2 if lo_v < fam["VIH"] < hi_v else lo_v, hi_v)}
    if lo_v >= fam["VIH"] and hi_v <= fam["VCC"]:
        return "all logic 1"
    return "includes " + " and ".join(sorted(r for r in reads if r != "1") or ["?"])


def fanout(IOL, IIL, IOH, IIH):
    """Loads one output can drive: the smaller of the low-state and high-state current ratios."""
    lo, hi = fr(IOL) / fr(IIL), fr(IOH) / fr(IIH)
    return min(math.floor(lo), math.floor(hi)), lo, hi


# currents in mA
TTL_STD = {"IOL": F(16), "IIL": F("1.6"), "IOH": F("0.4"), "IIH": F("0.04")}
TTL_LS = {"IOL": F(8), "IIL": F("0.4"), "IOH": F("0.4"), "IIH": F("0.02")}


def fanout_of(drv, load):
    return fanout(drv["IOL"], load["IIL"], drv["IOH"], load["IIH"])


def dyn_power(C, V, f, alpha=1):
    """Dynamic (switching) power alpha·C·V²·f (SI units, exact)."""
    return fr(alpha) * fr(C) * fr(V) ** 2 * fr(f)


def pdp(P, tpd):
    return fr(P) * fr(tpd)


def sized_area(kind, n, ratio=2):
    """Total transistor width of an n-input CMOS NAND or NOR sized to match a unit inverter
    (NMOS width 1, PMOS width `ratio`): series devices are made n times wider."""
    if kind == "NAND":
        return n * n + n * ratio
    return n + n * n * ratio


def worst_resistance(kind, n, ratio=2):
    """Unsized gate (all widths 1): worst-case (pull-down, pull-up) resistance in units of one NMOS."""
    if kind == "NAND":
        return n, ratio      # n NMOS in series; one PMOS (ratio·R) alone in the worst case
    return 1, n * ratio      # one NMOS; n PMOS in series


# Family comparison (typical textbook values per gate, order-of-magnitude data for comparison only).
FAMILIES = {
    "TTL":  {"device": "bipolar", "tpd_ns": F(10), "p_mw": F(10), "density": "modest", "cost": "inexpensive"},
    "74LS": {"device": "bipolar", "tpd_ns": F("9.5"), "p_mw": F(2), "density": "modest", "cost": "inexpensive"},
    "ECL":  {"device": "bipolar", "tpd_ns": F(1), "p_mw": F(25), "density": "low", "cost": "high", "fastest_silicon": True},
    "CMOS": {"device": "unipolar", "tpd_ns": None, "p_mw": F(0), "density": "high", "cost": "low", "low_power": True},
    "nMOS": {"device": "unipolar", "tpd_ns": None, "p_mw": None, "density": "high", "cost": "low"},
    "GaAs": {"device": "unipolar", "tpd_ns": None, "p_mw": None, "density": "low", "cost": "high", "very_fast": True,
             "radiation_hard": True, "hard_to_make": True},
}

# 1994 List II as attribute tests
LIST_1994 = {
    "a": lambda f: f["device"] == "unipolar" and f.get("very_fast") and f.get("radiation_hard"),
    "b": lambda f: f["device"] == "unipolar" and f.get("low_power"),
    "c": lambda f: f["device"] == "bipolar" and f.get("fastest_silicon") and f["density"] == "low",
    "d": lambda f: f["device"] == "bipolar" and f["density"] == "modest" and f["cost"] == "inexpensive",
}


def match_1994():
    out = {}
    for item, fam in (("i", "ECL"), ("ii", "GaAs"), ("iii", "TTL"), ("iv", "CMOS")):
        hits = [k for k, t in LIST_1994.items() if t(FAMILIES[fam])]
        assert len(hits) == 1, (fam, hits)
        out[item] = hits[0]
    return out


def nand_transistors(n, style):
    """Transistors in an n-input NAND: static CMOS 2n, nMOS with a depletion load n + 1."""
    return 2 * n if style == "CMOS" else n + 1


# ══ Self-test ══════════════════════════════════════════════════════════════

def _selftest():
    # memory arithmetic
    assert addr_lines(1) == 0 and addr_lines(1024) == 10 and addr_lines(24 * K) == 15 and addr_lines(1025) == 11
    p = chip_plan(8 * K, 8, 1 * K, 4)
    assert (p["rows"], p["cols"], p["chips"], p["low_bits"], p["high_bits"], p["decoder"]) == (8, 2, 16, 10, 3, (3, 8))
    p = chip_plan(64 * K, 16, 16 * K, 8)
    assert (p["chips"], p["decoder"], p["unused_outputs"]) == (8, (2, 4), 0)
    p = chip_plan(24 * K, 8, 8 * K, 8)
    assert (p["rows"], p["chips"], p["decoder"], p["unused_outputs"], p["addr_bits"]) == (3, 3, (2, 4), 1, 15)
    for args in ((64, 8, 16, 4), (48, 8, 16, 8), (32, 16, 8, 4), (16, 4, 16, 1)):
        assert verify_system(*args), args
    assert address_map(64 * K, 16 * K)[2] == (2, 0x8000, 0xBFFF) and which_chip(0x9A3C, 16 * K) == (2, 0x1A3C)
    assert best_split(10) == 5 and lines_2d(10, 5) == 64 and lines_2d(11, best_split(11)) == 96
    for k in range(1, 16):  # the balanced split is optimal
        assert lines_2d(k, best_split(k)) == min(lines_2d(k, r) for r in range(k + 1)) == lines_2d(k, k // 2)
    assert alias_addresses(16, 12, {15: 1}) == [0x8000 + i * 0x1000 for i in range(8)] and aliases(16, 12, 1) == 8
    assert refresh_interval(F(64, 1000), 8192) == F(78125, 10 ** 10) and dec(refresh_interval(F(64, 1000), 8192) * 10 ** 6) == "7.8125"
    assert refresh_overhead(8192, F(50, 10 ** 9), F(64, 1000)) == F(64, 10000)
    # switch level
    inv, _, _ = cmos_gate("A")
    assert [evaluate(inv, {"A": a}, "Y")["value"] for a in (0, 1)] == [1, 0]
    for e in ("A", AND("A", "B"), OR("A", "B"), AND("A", "B", "C"), OR(AND("A", "B"), "C"), AND(OR("A", "B"), OR("C", "D"))):
        assert exclusive(e), e
    assert transistors(cmos_gate(AND("A", "B", "C"))[0]) == 6 and transistors(cmos_gate(OR(AND("A", "B"), "C"))[0]) == 6
    # 1991: f = a'b x + a b' y, Z when a = b, degraded levels on the conducting path
    for a, b, x, y in product((0, 1), repeat=4):
        r = f_1991(a, b, x, y)
        if a == b:
            assert r["value"] == "Z"
        else:
            assert r["value"] == ((1 - a) & b & x | a & (1 - b) & y) and r["level"] == "degraded"
    # transmission gate MUX: strong both ways
    for s, i0, i1 in product((0, 1), repeat=3):
        r = evaluate(TG_MUX, {"s": s}, "y", {"i0": i0, "i1": i1})
        assert r["value"] == (i1 if s else i0) and r["level"] == "strong"
    # single NMOS pass: 0 strong, 1 degraded; PMOS the opposite
    assert evaluate([("n", "g", "x", "o")], {"g": 1}, "o", {"x": 0})["level"] == "strong"
    assert evaluate([("n", "g", "x", "o")], {"g": 1}, "o", {"x": 1})["level"] == "degraded"
    assert evaluate([("p", "g", "x", "o")], {"g": 0}, "o", {"x": 1})["level"] == "strong"
    assert pass_voltage(1, ["p", "n"]) == F("4.3") and pass_voltage(0, ["p", "n"]) == F("0.7")
    assert pass_voltage(1, ["n", "p"]) == F("4.3") and pass_voltage(1, ["p"]) == 5 and pass_voltage(0, ["n"]) == 0
    # nMOS NAND: right logic, static current when the output is low
    nn = nmos_gate(AND("A", "B"))
    for a, b in product((0, 1), repeat=2):
        r = evaluate(nn, {"A": a, "B": b}, "Y")
        assert r["value"] == 1 - (a & b) and r["fight"] == bool(a & b)
    assert transistors(nn) == nand_transistors(2, "nMOS") == 3 and nand_transistors(2, "CMOS") == 4
    # electrical
    assert noise_margins(TTL) == (F("0.4"), F("0.4")) and noise_margins(CMOS5) == (F("1.4"), F("1.4"))
    assert [classify(v, TTL) for v in ("0.5", "1.4", "2.0", "3.3")] == ["0", "undefined", "1", "1"]
    reading = {k: interval_reading(v) for k, v in OPT_1998.items()}
    assert [k for k, r in reading.items() if r == "all logic 1"] == ["D"], reading
    assert fanout_of(TTL_STD, TTL_STD)[0] == 10 and fanout_of(TTL_LS, TTL_LS)[0] == 20 and fanout_of(TTL_LS, TTL_STD)[0] == 5
    assert dyn_power(F(10, 10 ** 12), 5, 10 ** 7) == F(25, 10 ** 4)
    assert sized_area("NAND", 2) == 8 and sized_area("NOR", 2) == 10 and sized_area("NAND", 3) == 15 and sized_area("NOR", 3) == 21
    assert worst_resistance("NAND", 2) == (2, 2) and worst_resistance("NOR", 2) == (1, 4)
    assert match_1994() == {"i": "c", "ii": "a", "iii": "d", "iv": "b"}
    assert pdp(F(10, 1000), F(10, 10 ** 9)) == F(1, 10 ** 10)
    print("beyondlib: self-test OK (memory plans and simulated arrays, 2-D decoding, aliasing, refresh; "
          "switch-level CMOS/nMOS/pass/TG networks, the 1991 network, margins, 1998 intervals, fan-out, power, sizing, 1994 match)")


if __name__ == "__main__":
    _selftest()
