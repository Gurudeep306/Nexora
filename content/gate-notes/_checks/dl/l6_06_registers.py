"""Checks for dl/06-sequential-circuits/06-shift-registers: every register content, clock count,
state sequence, cycle, self-loop, decoding gate and design trace of the lesson is a seqlib
simulation (Sync, shift_right / shift_left, ring_step, johnson_step, lfsr_step, register_cycle,
autonomous_cycles, self_starting, universal). The ten PYQ keys, every worked example and every
practice answer, MSQ option and MCQ distractor are recomputed."""
import pathlib
import random
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import seqlib as sq  # noqa: E402

L = sq.lesson_text("06-shift-registers.md")
LW = " ".join(L.split())  # line breaks in the Markdown do not matter
has = lambda *s: bl.must_contain(LW, *[" ".join(x.split()) for x in s])  # noqa: E731
bank = bl.bank()
P = sq.practice()
B = sq.bstr


def allst(n):
    return [sq.bits(v, n) for v in range(2 ** n)]


def bs(s):
    return tuple(int(c) for c in s)


def run_right(reg, ins):
    """States after each clock and the bits shifted out, for a shift-right register."""
    reg, states, outs = tuple(reg), [], []
    for d in ins:
        reg, o = sq.shift_right(reg, d)
        states.append(reg)
        outs.append(o)
    return states, outs


def cyc(step, init):
    return [B(s) for s in sq.register_cycle(step, bs(init) if isinstance(init, str) else init)]


def lens(step, n):
    return sorted(len(c) for c in sq.autonomous_cycles(step, allst(n)))


# ── The shift register and the delay theorem ───────────────────────────────
# Q_i after edge k holds b_{k-i+1}; SO = b_{k-n+1}; first bit out after n, last after 2n − 1, gone after 2n
random.seed(6)
for n in range(1, 8):
    for _ in range(20):
        start = tuple(random.randint(0, 1) for _ in range(n))
        stream = [random.randint(0, 1) for _ in range(3 * n + 2)]
        st, _ = run_right(start, stream)
        for k in range(1, len(stream) + 1):
            for i in range(1, n + 1):
                if k >= i:
                    assert st[k - 1][i - 1] == stream[k - i]
    # word tagged with distinct markers: positions where each word bit sits at Q_n
    word = list(range(1, n + 1))
    reg = (0,) * n
    seen = {}
    for k, d in enumerate(word + [0] * (n + 2), 1):
        reg, _ = sq.shift_right(reg, d)
        if reg[-1] in word and reg[-1] not in seen:
            seen[reg[-1]] = k
        if k == 2 * n:
            assert not set(word) & set(reg)  # none of the word left after 2n clocks
        if k == 2 * n - 1:
            assert reg[-1] == n
    assert seen[1] == n and seen[n] == 2 * n - 1
# the lesson's 4-bit run: 1, 1, 0, 1 then zeros
st4, out4 = run_right((0, 0, 0, 0), [1, 1, 0, 1, 0, 0, 0, 0])
assert [B(s) for s in st4] == ["1000", "1100", "0110", "1011", "0101", "0010", "0001", "0000"]
has("puts the first bit at $Q_4$ after clock 4, the last after clock 7, and leaves 0000 after clock 8",
    "Clock 1: 1000. Clock 2: 1100. Clock 3: 0110. Clock 4: **1011**.", "The parallel outputs read **1011**")
has("**4, 7 and 8** clocks for the serial case", "0, 3 and 4\nshifts after a parallel load")
assert (4, 2 * 4 - 1, 2 * 4) == (4, 7, 8)
# trick: 1101 with inputs 1, 0, 0 (right) and the same shifting left
st, outs = run_right(bs("1101"), [1, 0, 0])
assert [B(s) for s in st] == ["1110", "0111", "0011"] and outs == [1, 0, 1]
lft = bs("1101")
for d in (1, 0, 0):
    lft, _ = sq.shift_left(lft, d)
assert B(lft) == "1100"
has("1101 → **1**110 → **0**111 → **0**011", "ends at 0011 when shifting right and at 1100 when shifting left",
    "Clock 1 (input 1): 1101 → 1110; the bit leaving $Q_4$ is 1.", "Clock 2 (input 0): 1110 → 0111",
    "Clock 3 (input 0): 0111 → 0011", "**0011**, with the bits 1, 0, 1 shifted out in that order", "would give 1100, the trap answer")

# ── State graph of a shift register: self-loops only at 0…0 and 1…1 ─────────
for n in range(1, 6):
    m = sq.Sync([("Q1", "D", {"D": lambda e: e["x"]})] + [(f"Q{i}", "D", {"D": (lambda j: lambda e: e[f"Q{j}"])(i - 1)}) for i in range(2, n + 1)],
                inputs=("x",))
    g = m.graph()
    loops = [s for s in g if s in g[s].values()]
    assert loops == [(0,) * n, (1,) * n] if n > 1 else loops == [(0,), (1,)]
    for s in g:
        assert len(set(g[s].values())) == 2
        assert sum(1 for t in g for x in g[t] if g[t][x] == s) == 2  # two incoming arcs
        # any target within n clocks
        for tgt in g:
            cur = s
            for d in reversed(tgt):
                cur = m.step(cur, (d,))
            assert cur == tgt
# GATE 2018
m18 = sq.Sync([("Q1", "D", {"D": lambda e: e["x"]}), ("Q2", "D", {"D": lambda e: e["Q1"]})], inputs=("x",))
g18 = m18.graph()
assert {B(s): [B(g18[s][(x,)]) for x in (0, 1)] for s in g18} == {"00": ["00", "10"], "01": ["00", "10"], "10": ["01", "11"], "11": ["01", "11"]}
loops18 = [s for s in g18 if s in g18[s].values()]
assert [B(s) for s in loops18] == ["00", "11"]
assert float(bank["cse-2018-cs-22"]["answer"]) == len(loops18) == 2
assert m18.step(bs("01"), (1,)) == bs("10") and m18.step(bs("10"), (0,)) == bs("01")
has("00 → 00 (in = 0), 10 (in = 1). 01 → 00, 10. 10 → 01, 11. 11 → 01 (in = 0), 11 (in = 1).", "**2** states (GATE 2018): 00 and 11",
    "01 → 10 → 01 with the inputs 1, 0 is a cycle")

# ── Parallel load (1991) and the universal register ────────────────────────
PISO = sq.Sync([("QA", "D", {"D": lambda e: (e["L"] & e["A"]) | ((1 - e["L"]) & e["S"])}),
                ("QB", "D", {"D": lambda e: (e["L"] & e["B"]) | ((1 - e["L"]) & e["QA"])}),
                ("QC", "D", {"D": lambda e: (e["L"] & e["C"]) | ((1 - e["L"]) & e["QB"])})], inputs=("L", "A", "B", "C", "S"))
xs = [(1, 1, 0, 1, 0), (0, 0, 0, 0, 0), (0, 0, 0, 0, 1), (0, 0, 0, 0, 1)]
tr = PISO.trace((0, 0, 0), xs=xs)[1:]
assert [B(s) for s in tr] == ["101", "010", "101", "110"] and [s[2] for s in tr] == [1, 0, 1, 0]
has("$Q_AQ_BQ_C$ = 101, 010, 101, 110 and the serial output **C, B, A** = 1, 0, 1",
    "Load ($L = 1$): $Q_AQ_BQ_C = 101$. Shift, $S = 0$: 010. Shift, $S = 1$: 101. Shift, $S = 1$: 110.",
    "after the third shift the register holds $110$")
# the steering equations equal the universal register restricted to load (11) and shift right (01), for every state and input
for st in allst(3):
    for L_, a, b_, c, s_ in [tuple(sq.bits(v, 5)) for v in range(32)]:
        want = sq.universal(st, 3 if L_ else 1, sin_r=s_, par=(a, b_, c))
        assert PISO.step(st, (L_, a, b_, c, s_)) == want
# universal register mode run
reg = bs("1010")
seq_u = []
for mode, kw in [(1, dict(sin_r=1)), (1, dict(sin_r=0)), (2, dict(sin_l=1)), (0, {}), (3, dict(par=bs("0110"))), (2, dict(sin_l=0))]:
    reg = sq.universal(reg, mode, **kw)
    seq_u.append(B(reg))
assert seq_u == ["1101", "0110", "1101", "1101", "0110", "1100"] and sq.val(bs("0110")) * 2 == sq.val(bs("1100"))
has("1101, 0110, 1101, 1101, 0110, **1100**", "01, $SI_R = 1$: 1010 → 1101. 01, $SI_R = 0$: 1101 → 0110.", "10, $SI_L = 1$: 0110 → 1101.",
    "00: 1101 → 1101. 11, $I = 0110$: → 0110.", "10, $SI_L = 0$: 0110 → 1100.", "$0110_2 = 6$ to $1100_2 = 12$")
# the 4:1 MUX equation of every stage equals seqlib.universal
for st in allst(4):
    for mode in range(4):
        for sr in (0, 1):
            for sl in (0, 1):
                par = (1, 0, 0, 1)
                s1, s0 = mode >> 1, mode & 1
                ext = (sr,) + st + (sl,)
                d = tuple(((not s1 and not s0) and st[i]) or ((not s1 and s0) and ext[i]) or ((s1 and not s0) and ext[i + 2]) or ((s1 and s0) and par[i]) or 0
                          for i in range(4))
                assert tuple(int(bool(v)) for v in d) == sq.universal(st, mode, sin_r=sr, sin_l=sl, par=par)
# shifts with 0 entering double / halve
for v in range(16):
    assert sq.val(sq.shift_left(sq.bits(v, 4), 0)[0]) == (2 * v) % 16 and sq.val(sq.shift_right(sq.bits(v, 4), 0)[0]) == v // 2
# JK stage with J = x, K = x̄ is a D stage
for x in (0, 1):
    for q in (0, 1):
        assert sq.ff_next("JK", q, J=x, K=1 - x) == x

# ── RAM as a 1024-bit shift register (1991) ────────────────────────────────
def ram_run(n, din, order="rw"):
    mem, ctr, out = [0] * n, 0, []
    for d in din:
        if order == "rw":
            out.append(mem[ctr])
            mem[ctr] = d
        else:
            mem[ctr] = d
            out.append(mem[ctr])
        ctr = (ctr + 1) % n
    return out


def chain_run(n, din):
    reg, out = (0,) * n, []
    for d in din:
        reg, o = sq.shift_right(reg, d)
        out.append(o)
    return out


din = [random.randint(0, 1) for _ in range(3000)]
assert ram_run(1024, din) == chain_run(1024, din)
assert all(ram_run(1024, din)[j + 1024] == din[j] for j in range(len(din) - 1024))
for n in (1, 2, 3, 8, 16):
    assert ram_run(n, din[:200]) == chain_run(n, din[:200])
assert ram_run(1024, din, "wr") == din  # write before read: a wire
assert sq.ff_count(1024) == 10
has("on a random stream of 3000 bits", "the output is the input delayed by **1024 shifts**", "equals its input stream")

# ── Ring counters ──────────────────────────────────────────────────────────
assert cyc(sq.ring_step, "1000") == ["1000", "0100", "0010", "0001"] and cyc(sq.ring_step, "1100") == ["1100", "0110", "0011", "1001"]
has("1000 → 0100 → 0010 → 0001 → 1000 → 0100.", "1100 → 0110 → 0011 → 1001 → 1100, another 4-state cycle")
for n in range(2, 7):
    c = sq.autonomous_cycles(sq.ring_step, allst(n))
    main = sq.register_cycle(sq.ring_step, (1,) + (0,) * (n - 1))
    assert len(main) == n and all(sum(s) == 1 for s in main) and not sq.self_starting(sq.ring_step, allst(n), main)
    assert [(0,) * n] in c and [(1,) * n] in c
    assert all(len({sum(s) for s in cy}) == 1 for cy in c)  # rotation keeps the number of 1s
    # each output high one period in n
    assert all(sum(s[i] for s in main) == 1 for i in range(n))
# self-starting ring with a NOR of all outputs but the last
for n, worst in ((3, 2), (4, 3)):
    st = lambda r: ((0 if any(r[:-1]) else 1),) + tuple(r[:-1])  # noqa: E731
    main = sq.register_cycle(sq.ring_step, (1,) + (0,) * (n - 1))
    assert all(st(s) == sq.ring_step(s) for s in main)
    tails = {B(s): len(sq.cycle_from(st, s)[0]) for s in allst(n)}
    assert all(set(sq.cycle_from(st, s)[1]) == set(main) for s in allst(n)) and max(tails.values()) == worst
    if n == 4:
        assert sorted(k for k, v in tails.items() if v == worst) == ["1100", "1101", "1110", "1111"]
has("within **3** clocks (the worst\nare 1100, 1101, 1110 and 1111)", "the worst case is 2 clocks")
# counter + decoder = 2^n-bit ring counter (2014)
for n in (1, 2, 3, 4):
    k = 2 ** n
    dec = [tuple(1 if i == c % k else 0 for i in range(k)) for c in range(k + 1)]
    ring = sq.register_cycle(sq.ring_step, dec[0])
    assert dec[:k] == ring and dec[k] == dec[0]
    assert len(sq.register_cycle(sq.johnson_step, (0,) * k)) == 2 * k != k
assert [B(s) for s in sq.register_cycle(sq.ring_step, bs("1000"))] == ["1000", "0100", "0010", "0001"]
opts14 = bl.option_values(bank["cse-2014-2-cs-7"])
assert [l for l, t in opts14.items() if "ring" in t] == bl.key_letters(bank["cse-2014-2-cs-7"]["answer"]) == ["C"]
has("A **$k$-bit ring counter** (GATE 2014, option C)", "Take $n = 2$: 1000 → 0100 → 0010 → 0001 → 1000.")

# ── Johnson counters ───────────────────────────────────────────────────────
J4 = cyc(sq.johnson_step, "0000")
assert J4 == ["0000", "1000", "1100", "1110", "1111", "0111", "0011", "0001"]
assert [sq.val(bs(s)) for s in J4] == [0, 8, 12, 14, 15, 7, 3, 1]
has("$$0000 \\to 1000 \\to 1100 \\to 1110 \\to 1111 \\to 0111 \\to 0011 \\to 0001 \\to 0000,$$", "which, read with $Q_1$ as the most significant bit, is 0, 8, 12, 14, 15, 7, 3, 1.")
# the theorem: 2n states from 0…0, the shape 1^k 0^(n−k) then 0^k 1^(n−k), the map is a permutation, other cycles exist for n ≥ 3
expect = {2: [4], 3: [2, 6], 4: [8, 8], 5: [2, 10, 10, 10], 6: [4, 12, 12, 12, 12, 12]}
for n in range(2, 9):
    main = sq.register_cycle(sq.johnson_step, (0,) * n)
    shapes = [(1,) * k + (0,) * (n - k) for k in range(n + 1)] + [(0,) * k + (1,) * (n - k) for k in range(1, n)]
    assert len(main) == 2 * n and main == shapes
    imgs = {sq.johnson_step(s) for s in allst(n)}
    assert len(imgs) == 2 ** n  # a permutation
    for s in allst(n):  # the inverse given in the proof
        nx = sq.johnson_step(s)
        assert nx[1:] + (1 - nx[0],) == s
    assert sq.self_starting(sq.johnson_step, allst(n), main) == (n == 2)
    if n in expect:
        assert lens(sq.johnson_step, n) == expect[n]
    # one bit changes per clock on the main cycle; every output 50 % duty
    assert all(sum(a != b for a, b in zip(main[i], main[(i + 1) % (2 * n)])) == 1 for i in range(2 * n))
    assert all(sum(s[i] for s in main) == n for i in range(n))
has("4 for $n = 2$ (self-starting), 6 + 2\nfor $n = 3$, 8 + 8 for $n = 4$, 10 + 10 + 10 + 2 for $n = 5$ and 12 × 5 + 4 for $n = 6$")
other4 = [c for c in sq.autonomous_cycles(sq.johnson_step, allst(4)) if (0, 0, 0, 0) not in c][0]
assert [B(s) for s in other4] == ["0010", "1001", "0100", "1010", "1101", "0110", "1011", "0101"]
has("0010 → 1001 → 0100 → 1010 → 1101 → 0110 → 1011 → 0101 → 0010")
assert [[B(s) for s in c] for c in sq.autonomous_cycles(sq.johnson_step, allst(3))] == [["000", "100", "110", "111", "011", "001"], ["010", "101"]]
# decoding gates: each 2-input AND is 1 in exactly one main-cycle state
G = {"0000": lambda q: (1 - q[0]) & (1 - q[3]), "1000": lambda q: q[0] & (1 - q[1]), "1100": lambda q: q[1] & (1 - q[2]),
     "1110": lambda q: q[2] & (1 - q[3]), "1111": lambda q: q[0] & q[3], "0111": lambda q: (1 - q[0]) & q[1],
     "0011": lambda q: (1 - q[1]) & q[2], "0001": lambda q: (1 - q[2]) & q[3]}
for name, f in G.items():
    assert [B(s) for s in map(bs, J4) if f(s)] == [name]
unused4 = [s for s in allst(4) if B(s) not in J4]
assert sorted(B(s) for s in unused4 if G["1000"](s)) == ["1001", "1010", "1011"]
has("$Q_1\\overline{Q_2}$ is also 1 in 1001, 1010 and 1011")
# edge: a Johnson counter that powers up in 0100
j0100 = cyc(sq.johnson_step, "0100")
assert j0100 == ["0100", "1010", "1101", "0110", "1011", "0101", "0010", "1001"] and not set(j0100) & set(J4)
assert sorted(n for n, f in G.items() if f(bs("1010"))) == ["0011", "1000", "1110"]
has("0100 → 1010 → 1101 → 0110 → 1011 → 0101 → 0010 → 1001 → 0100.")
# the correcting feedback D3 = Q2(Q1 + Q3)
fix = lambda q: (1 - q[3], q[0], q[1] & (q[0] | q[2]), q[2])  # noqa: E731
assert all(fix(s) == sq.johnson_step(s) for s in map(bs, J4)) and sq.self_starting(fix, allst(4), [bs(s) for s in J4])
has("$D_3 = Q_2(Q_1 + Q_3)$ in place of $D_3 = Q_2$")
# flip-flops for a mod-N Johnson counter: N/2; mod-10 needs 5
assert len(sq.register_cycle(sq.johnson_step, (0,) * 5)) == 10
# GATE 2015
opts15 = bl.option_values(bank["cse-2015-1-cs-20"])
want15 = ", ".join(str(sq.val(bs(s))) for s in J4 + ["0000"])
assert [l for l, t in opts15.items() if t == want15] == bl.key_letters(bank["cse-2015-1-cs-20"]["answer"]) == ["D"]
# option A is the shift-left Johnson (1s entering at the LSB end)
jl = lambda r: tuple(r[1:]) + (1 - r[0],)  # noqa: E731
assert opts15["A"] == ", ".join(str(sq.val(s)) for s in sq.register_cycle(jl, (0, 0, 0, 0)) + [(0, 0, 0, 0)])
assert bin(3 ^ 5).count("1") == 2 and bin(2 ^ 4).count("1") == 2
assert len(set(map(int, opts15["B"].split(", ")))) == 9 and 15 not in map(int, opts15["C"].split(", "))
has("**0, 8, 12, 14, 15, 7, 3, 1, 0** (GATE 2015, option D)")
# GATE 2025: figure Q0 → D1 → … , Q̄3 → D0; every start returns after 8; 7 to 8
lo, hi = map(float, bank["cse-2025-1-cs-50"]["answer"].split(" to "))
for s in allst(4):
    c = sq.register_cycle(sq.johnson_step, s)
    assert len(c) == 8 and lo <= len(c) <= hi and lo <= len(c) - 1 <= hi
assert (lo, hi) == (7, 8) and sorted(len(sq.register_cycle(sq.johnson_step, s)) for s in [bs("01010")]) == [2]
has("**8** if the initial state is counted, **7** if only the states after it are (the key range is **7 to 8**)",
    "a start in 01010 would return after 2")
# GATE 1993: JK twisted ring
J93 = sq.Sync([("Q1", "JK", {"J": lambda e: 1 - e["Q3"], "K": lambda e: e["Q3"]}),
               ("Q2", "JK", {"J": lambda e: e["Q1"], "K": lambda e: 1 - e["Q1"]}),
               ("Q3", "JK", {"J": lambda e: e["Q2"], "K": lambda e: 1 - e["Q2"]})])
tr93 = J93.trace((0, 0, 0), 6)
assert [B(s) for s in tr93] == ["000", "100", "110", "111", "011", "001", "000"]
assert all(J93.step(s) == sq.johnson_step(s) for s in allst(3))
assert [[B(s) for s in c] for c in sq.autonomous_cycles(J93.step, allst(3))] == [["000", "100", "110", "111", "011", "001"], ["010", "101"]]
key93 = bl.key_letters(bank["cse-1993-ii-a-6-3"]["answer"])
assert key93 == ["A", "C"] and bank["cse-1993-ii-a-6-3"]["needsReview"]
opts93 = bl.option_values(bank["cse-1993-ii-a-6-3"])
assert opts93["C"] == f"Mod-{len(sq.cycle_from(J93.step, (0, 0, 0))[1])} Counter" and opts93["A"] == "Shift Register"
ring93 = sq.Sync([("Q1", "JK", {"J": lambda e: e["Q3"], "K": lambda e: 1 - e["Q3"]})] + J93.ffs[1:])
assert all(ring93.step(s) == sq.ring_step(s) for s in allst(3))
has("$$000 \\to 100 \\to 110 \\to 111 \\to 011 \\to 001 \\to 000,$$", "000 → 100 → 110 → 111 → 011 → 001 → 000.")

# ── Feedback registers and LFSRs ───────────────────────────────────────────
L4 = cyc(lambda r: sq.lfsr_step(r, [2, 3]), "1000")
assert len(L4) == 15 and L4[:5] == ["1000", "0100", "0010", "1001", "1100"]
assert L4[5:] == ["0110", "1011", "0101", "1010", "1101", "1110", "1111", "0111", "0011", "0001"]
has("1000: $0 \\oplus 0 = 0$ → 0100. 0100: $0 \\oplus 0 = 0$ → 0010. 0010: $1 \\oplus 0 = 1$ → 1001. 1001: $0 \\oplus 1 = 1$ → 1100.",
    "… 0110, 1011, 0101, 1010, 1101, 1110, 1111, 0111, 0011, 0001, and then back to 1000.", "with period **15**")
assert len(cyc(lambda r: sq.lfsr_step(r, [1, 2]), "100")) == 7
taps = {(2, 3): [1, 15], (0, 3): [1, 15], (1, 3): [1, 3, 6, 6], (0, 1, 2, 3): [1, 5, 5, 5]}
for t, want in taps.items():
    assert lens(lambda r: sq.lfsr_step(r, list(t)), 4) == want
has("the taps $\\{Q_3, Q_4\\}$ and $\\{Q_1, Q_4\\}$ give one cycle of 15 plus the fixed point 0000; $\\{Q_2, Q_4\\}$ gives\ncycles of 6, 6 and 3; all four taps give 5, 5, 5")
# the theorem: for every tap set containing the last cell, 0 is fixed, the map is a permutation, every non-zero cycle ≤ 2^n − 1
from itertools import combinations  # noqa: E402
for n in range(2, 7):
    for k in range(0, n):
        for rest in combinations(range(n - 1), k):
            t = list(rest) + [n - 1]
            step = lambda r: sq.lfsr_step(r, t)  # noqa: E731
            assert step((0,) * n) == (0,) * n and len({step(s) for s in allst(n)}) == 2 ** n
            for c in sq.autonomous_cycles(step, allst(n)):
                assert (c == [(0,) * n]) or ((0,) * n not in c and len(c) <= 2 ** n - 1)
# GATE 2001: Q0 → Q1 → Q2, D0 = Q1 ⊕ Q2, state 4Q2 + 2Q1 + Q0 (state tuples Q2, Q1, Q0)
M01 = sq.Sync([("Q2", "D", {"D": lambda e: e["Q1"]}), ("Q1", "D", {"D": lambda e: e["Q0"]}), ("Q0", "D", {"D": lambda e: e["Q1"] ^ e["Q2"]})])
s01 = [sq.val(s) for s in M01.trace((0, 0, 1), 7)]
assert s01 == [1, 2, 5, 3, 7, 6, 4, 1]
for v in range(8):
    q2, q1, q0 = sq.bits(v, 3)
    assert sq.val(M01.step((q2, q1, q0))) == (2 * v) % 8 + (q1 ^ q2)
opts01 = bl.option_values(bank["cse-2001-a-37"])
assert [l for l, t in opts01.items() if t == ",".join(map(str, s01[:7]))] == bl.key_letters(bank["cse-2001-a-37"]["answer"]) == ["B"]
ok = lambda a, b: b in ((2 * a) % 8, (2 * a) % 8 + 1)  # noqa: E731
first_bad = {l: next((i for i, (a, b) in enumerate(zip(seq_, seq_[1:])) if not ok(a, b)), None)
             for l, seq_ in ((l, list(map(int, t.split(",")))) for l, t in opts01.items())}
assert first_bad == {"A": 1, "B": None, "C": 1, "D": 0}
assert opts01["A"].startswith("1,3,4") and opts01["C"].startswith("1,2,7") and opts01["D"].startswith("1,6")
has("**1, 2, 5, 3, 7, 6, 4** (GATE 2001, option B)", "1 (001): feedback 0 → 2. 2 (010): $1 \\oplus 0 = 1$ → 5. 5 (101): $0 \\oplus 1 = 1$ → 3. 3 (011): $1 \\oplus 0 = 1$ → 7.",
    "7 (111): $1 \\oplus 1 = 0$ → 6. 6 (110): $1 \\oplus 1 = 0$ → 4. 4 (100): $0 \\oplus 1 = 1$ → 1.")
# the 2001 circuit is the lab's 3-bit maximal LFSR read with the cells (Q0, Q1, Q2)
for s in allst(3):
    q2, q1, q0 = s
    assert sq.lfsr_step((q0, q1, q2), [1, 2]) == tuple(reversed(M01.step(s)))
# edge: cleared at power-up; the NOR fix
assert M01.step((0, 0, 0)) == (0, 0, 0)
fix01 = lambda s: (s[1], s[2], (s[1] ^ s[0]) | (0 if any(s) else 1))  # noqa: E731
assert all(fix01(s) == M01.step(s) for s in allst(3) if any(s))
pre, cy = sq.cycle_from(fix01, (0, 0, 0))
assert [sq.val(x) for x in pre + cy] == [0, 1, 2, 5, 3, 7, 6, 4] and pre == [(0, 0, 0)]
has("0 → 1 → 2 → 5 → 3 → 7 → 6 → 4 → 1")
# GATE 2006: q2 q1 q0, q0+ = data, q1+ = q0 ⊕ q2, q2+ = q1
M06 = sq.Sync([("q2", "D", {"D": lambda e: e["q1"]}), ("q1", "D", {"D": lambda e: e["q0"] ^ e["q2"]}), ("q0", "D", {"D": lambda e: e["x"]})], inputs=("x",))
data = [int(c) for c in "100110000"]
tr06 = [B(s) for s in M06.trace((0, 0, 0), xs=[(d,) for d in data])]
assert tr06 == ["000", "001", "010", "100", "011", "111", "100", "010", "100", "010"]
rev06 = B(M06.trace((0, 0, 0), xs=[(d,) for d in reversed(data)])[-1])
opts06 = bl.option_values(bank["cse-2006-cs-37"])
assert [l for l, t in opts06.items() if t == tr06[-1]] == bl.key_letters(bank["cse-2006-cs-37"]["answer"]) == ["C"]
assert rev06 == "111" and rev06 not in opts06.values()
assert M06.step(bs("100"), (0,)) == bs("010") and M06.step(bs("010"), (0,)) == bs("100")
has("000 → 001 → 010 → 100 → 011 → 111 (after clock 5).", "111 → 100 → 010 → 100 → 010.", "**010** (GATE 2006, option C)",
    "it ends at 111, which is not\n   even an option", "Feeding the string last\nbit first gives 111")
# IT 2007: 0110, input 101101, new left = x ⊕ rightmost
r = bs("0110")
tr07 = []
for x in [int(c) for c in "101101"]:
    r = sq.lfsr_step(r, [3], x)
    tr07.append(B(r))
assert tr07 == ["1011", "1101", "0110", "1011", "1101", "0110"] and "101101" == "101101"[::-1]
opts07 = bl.option_values(bank["it-2007-cs-40"])
assert [l for l, t in opts07.items() if t == tr07[-1]] == bl.key_letters(bank["it-2007-cs-40"]["answer"]) == ["A"]
has("0110, in 1: $1 \\oplus 0 = 1$ → 1011. In 0: $0 \\oplus 1 = 1$ → 1101. In 1: $1 \\oplus 1 = 0$ → 0110.", "**0110** (GATE IT 2007, option A)")
# sequence generator: 1011100
seqg = [1, 0, 1, 1, 1, 0, 0]
win = lambda n: [tuple(seqg[(i + k) % 7] for k in range(n)) for i in range(7)]  # noqa: E731
assert len(set(win(2))) < 7 and len(set(win(3))) == 7 and [B(w) for w in win(3)] == ["101", "011", "111", "110", "100", "001", "010"]
r, out = bs("101"), []
for _ in range(14):
    out.append(r[-1])
    r = sq.lfsr_step(r, [1, 2])
assert out == seqg * 2
has("3-bit windows 101, 011, 111, 110, 100, 001, 010 are all different", "seeded with 101, emits exactly 1011100")

# ── PYQ keys of the design questions (1991) ────────────────────────────────
a91 = bank["cse-1991-b-6-a"]["answer"]
assert "D_A = L·A + L′·S" in a91 and "D_B = L·B + L′·Q_A" in a91 and "D_C = L·C + L′·Q_B" in a91 and "Q_C" in a91
assert "1024" in bank["cse-1991-b-6-b"]["answer"] and "10-bit" in bank["cse-1991-b-6-b"]["answer"]

# ── Practice ───────────────────────────────────────────────────────────────
def mcq_by_value(q, value):
    return [k for k, v in bl.option_values(q).items() if v == value]


# q01: 1101, shift right, inputs 1, 0, 0 → 0011 (the distractors are the left shift, the reversed input order, one clock short)
q1 = P["nx-dl-06-06-q01"]
st, _ = run_right(bs("1101"), [1, 0, 0])
assert B(st[-1]) == "0011"
rev, _ = run_right(bs("1101"), [0, 0, 1])
assert B(rev[-1]) == "1001" and B(st[-2]) == "0111"
bl.assert_mcq(q1, mcq_by_value(q1, "0011")[0])
assert set(bl.option_values(q1).values()) == {"0011", "1100", "1001", "0111"}
# q02: 6-bit SISO, last bit of the word at the output after 2n − 1
reg, seen = (0,) * 6, None
for k, d in enumerate([1, 2, 3, 4, 5, 6] + [0] * 8, 1):
    reg, _ = sq.shift_right(reg, d)
    if reg[-1] == 6 and seen is None:
        seen = k
bl.assert_nat(P["nx-dl-06-06-q02"], seen)
assert seen == 11
# q03: 5-bit Johnson from 00000, state after 7 clocks
J5 = cyc(sq.johnson_step, "00000")
q3 = P["nx-dl-06-06-q03"]
bl.assert_mcq(q3, mcq_by_value(q3, J5[7])[0])
assert J5[7] == "00111" and J5[6] == "01111" and J5[8] == "00011"
# q04: unused states of a 5-bit Johnson counter (outside the cycle through 00000)
bl.assert_nat(P["nx-dl-06-06-q04"], 2 ** 5 - len(J5))
assert 2 ** 5 - len(J5) == 22 and lens(sq.johnson_step, 5) == [2, 10, 10, 10]
# q05: 4-bit LFSR D1 = Q3 ⊕ Q4 from 1001, next three states
q5 = P["nx-dl-06-06-q05"]
r, nx = bs("1001"), []
for _ in range(3):
    r = sq.lfsr_step(r, [2, 3])
    nx.append(B(r))
bl.assert_mcq(q5, mcq_by_value(q5, ", ".join(nx))[0])
assert nx == ["1100", "0110", "1011"]
# q06: universal register: 1010; 01 (SI_R = 1), 10 (SI_L = 0), 11 (I = 0110), 01 (SI_R = 0)
q6 = P["nx-dl-06-06-q06"]
r = bs("1010")
for mode, kw in [(1, dict(sin_r=1)), (2, dict(sin_l=0)), (3, dict(par=bs("0110"))), (1, dict(sin_r=0))]:
    r = sq.universal(r, mode, **kw)
bl.assert_mcq(q6, mcq_by_value(q6, B(r))[0])
assert B(r) == "0011"
# q07: statements (A true: 4-bit ring 4 states; B false: mod-10 Johnson needs 5; C false: synchronous; D true: 2-input AND)
truth7 = {"A": len(sq.register_cycle(sq.ring_step, bs("1000"))) == 4,
          "B": len(sq.register_cycle(sq.johnson_step, (0,) * 10)) == 10,
          "C": False,  # ring counters share one clock (erratum X2): never asynchronous
          "D": all(len([s for s in map(bs, J4) if f(s)]) == 1 for f in G.values())}
bl.assert_msq(P["nx-dl-06-06-q07"], [k for k, v in truth7.items() if v])
# q08: states with no self-loop in a 4-bit serial-in register's graph
m4 = sq.Sync([("Q1", "D", {"D": lambda e: e["x"]}), ("Q2", "D", {"D": lambda e: e["Q1"]}), ("Q3", "D", {"D": lambda e: e["Q2"]}),
              ("Q4", "D", {"D": lambda e: e["Q3"]})], inputs=("x",))
g4 = m4.graph()
bl.assert_nat(P["nx-dl-06-06-q08"], sum(1 for s in g4 if s not in g4[s].values()))
# q09: 4-bit register with D1 = Q2 ⊕ Q4 from 1000
bl.assert_nat(P["nx-dl-06-06-q09"], len(cyc(lambda r: sq.lfsr_step(r, [1, 3]), "1000")))
assert len(cyc(lambda r: sq.lfsr_step(r, [1, 3]), "1000")) == 6
# q10: which wirings are 4-bit Johnson counters (from 0000 they must follow the Johnson cycle)
q10 = {"A": sq.Sync([("Q1", "D", {"D": lambda e: 1 - e["Q4"]})] + [(f"Q{i}", "D", {"D": (lambda j: lambda e: e[f"Q{j}"])(i - 1)}) for i in range(2, 5)]),
       "B": sq.Sync([("Q1", "D", {"D": lambda e: e["Q4"]})] + [(f"Q{i}", "D", {"D": (lambda j: lambda e: e[f"Q{j}"])(i - 1)}) for i in range(2, 5)]),
       "C": sq.Sync([("Q1", "JK", {"J": lambda e: 1 - e["Q4"], "K": lambda e: e["Q4"]})]
                    + [(f"Q{i}", "JK", {"J": (lambda j: lambda e: e[f"Q{j}"])(i - 1), "K": (lambda j: lambda e: 1 - e[f"Q{j}"])(i - 1)}) for i in range(2, 5)]),
       "D": sq.Sync([("Q1", "JK", {"J": lambda e: e["Q4"], "K": lambda e: 1 - e["Q4"]})]
                    + [(f"Q{i}", "JK", {"J": (lambda j: lambda e: e[f"Q{j}"])(i - 1), "K": (lambda j: lambda e: 1 - e[f"Q{j}"])(i - 1)}) for i in range(2, 5)])}
is_j = {k: all(m.step(s) == sq.johnson_step(s) for s in allst(4)) for k, m in q10.items()}
bl.assert_msq(P["nx-dl-06-06-q10"], [k for k, v in is_j.items() if v])
assert all(q10["B"].step(s) == sq.ring_step(s) for s in allst(4)) and all(q10["D"].step(s) == sq.ring_step(s) for s in allst(4))
assert len([k for k in P if k.startswith("nx-dl-06-06-")]) == 10
keys = [P[f"nx-dl-06-06-q{k:02d}"]["answer"] for k in range(1, 11) if P[f"nx-dl-06-06-q{k:02d}"]["type"] == "MCQ"]
assert keys.count("A") >= 2 and keys.count("D") >= 2 and max(keys.count(x) for x in "ABCD") <= 2
for k in range(1, 11):
    q = P[f"nx-dl-06-06-q{k:02d}"]
    for blk in q["blocks"]:
        assert f"#{blk} " in L or f"#{blk}}}" in L, (q["id"], blk)
print("l6_06_registers: shift delay (first bit n, last 2n − 1, gone 2n), state graphs and self-loops, PISO = universal register, "
      "RAM register = 1024-stage chain, ring and Johnson cycles for n ≤ 8, decoding gates, self-starting fixes, LFSR bound for every "
      "tap set up to 6 bits, 10 PYQ keys and 10 practice answers OK")
