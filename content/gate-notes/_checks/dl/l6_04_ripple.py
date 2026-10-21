"""Checks for dl/06-sequential-circuits/04-ripple-counters: every count, state sequence, transient
state, settling time, frequency and clear gate of the lesson is an event simulation of the counter
(seqlib.ripple_events / settled_states) or a seqlib counting helper (ff_count, pulses_between,
cycle_from). The six PYQ keys, every worked example and every practice answer, MSQ option and MCQ
distractor are recomputed."""
import pathlib
import sys
from math import ceil, log2

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import seqlib as sq  # noqa: E402

L = sq.lesson_text("04-ripple-counters.md")
has = lambda *s: bl.must_contain(L, *s)  # noqa: E731
bank = bl.bank()
P = sq.practice()
CL = [100 * k for k in range(600)]  # clock edges, far apart compared with every delay used below


def b(q, n):
    return format(q, f"0{n}b")


def run(n, edges=8, start=0, **kw):
    """Settled states after each of `edges` clock edges."""
    cl = CL[:edges]
    return sq.settled_states(sq.ripple_events(n, kw.pop("tpd", 10), cl, start=start, **kw), cl, 100 * edges)


def modulus(n, **kw):
    """Cycle length of a counter started at 0 (number of stable states before it first returns to 0)."""
    st = run(n, edges=2 ** n + 2, **kw)
    return st.index(0) + 1


def chain(n, start, tpd=10, **kw):
    """(time, state) of every change after one clock edge at t = 0."""
    return sq.ripple_events(n, tpd, [0], start=start, **kw)


def gate(bits_):
    return lambda q: all((q >> i) & 1 for i in bits_)


def ones(N):
    return [i for i in range(N.bit_length()) if (N >> i) & 1]


# ── Flip-flop count ────────────────────────────────────────────────────────
for N in range(2, 2000):
    k = sq.ff_count(N)
    assert 2 ** k >= N > 2 ** (k - 1) and k == ceil(log2(N))
assert [sq.ff_count(N) for N in (1, 10, 256, 257, 258, 12, 6, 60, 1001)] == [0, 4, 8, 9, 9, 4, 3, 6, 10]
assert 2 ** 4 - 10 == 6 and 2 ** 9 - 258 == 254 and 2 ** 9 - 257 == 255
assert sq.ff_count(6) + sq.ff_count(10) == 7 and 8 - 6 == 2 and 16 - 10 == 6
# Johnson: m flip-flops give 2m states (Lesson 6's register model); 12 states → 6 flip-flops
assert len(sq.register_cycle(sq.johnson_step, (0,) * 6)) == 12 and len(sq.register_cycle(sq.ring_step, (1,) + (0,) * 11)) == 12
assert round(log2(10), 2) == 3.32 and round(log2(258), 2) == 8.01
assert round(log2(10)) != sq.ff_count(10) and round(log2(258)) != sq.ff_count(258)  # nearest-integer guess wrong for both
has("is wrong for **both**: $\\log_2 10 \\approx 3.32$ rounds to 3 and $\\log_2 258 \\approx 8.01$ rounds to 8.")
# Johnson decode: every state of a 6-bit Johnson counter is singled out by two adjacent bits, except all-0 and all-1,
# which are singled out by the two end bits
jst = sq.register_cycle(sq.johnson_step, (0,) * 6)
for st in jst:
    unique = lambda i, j: [x for x in jst if (x[i], x[j]) == (st[i], st[j])] == [st]  # noqa: E731
    if st in ((0,) * 6, (1,) * 6):
        assert unique(0, 5) and not any(unique(i, i + 1) for i in range(5))
    else:
        assert any(unique(i, i + 1) for i in range(5))
has("on two adjacent bits (for the all-0 and all-1 states, the two end bits;", "binary needs up to a 4-input decode for each state")
has("`seqlib.ff_count`\nreturns 4 for mod-10, 8 for mod-256 and 9 for mod-257 and mod-258",
    "Binary 4, one-hot 12, Johnson 6", "0, 8 and 9", "(6 of the 16 patterns are unused)", "254 of\nthe 512 patterns are unused",
    "of whose 512 patterns only 257 are used", "wastes 255\npatterns")
# floor(log2 N) + 1 is wrong for powers of two and for N = 1
assert int(log2(256)) + 1 == 9 and int(log2(1)) + 1 == 1

# ── Pulse counting ─────────────────────────────────────────────────────────
a, z = 0b10101100, 0b00100111
assert (a, z) == (172, 39) and sq.pulses_between(a, z, 8) == 123 == 256 - 172 + 39 and 172 + 123 - 256 == 39
assert sq.pulses_between(z, a, 8) == 133 and (172 - 39) % 256 == 133 and 123 + 133 == 256
# stepping a simulated 8-bit counter pulse by pulse reaches 39 after exactly 123 pulses
st = run(8, edges=130, start=172, tpd=1)
assert st.index(39) + 1 == 123
assert sq.pulses_between(2 ** 5 - 1, 0, 5) == 1 and sq.pulses_between(9, 9, 5) == 0
assert (134, 124) == (133 + 1, 123 + 1)
has("**134** $= 133 + 1$ and **124** $= 123 + 1$")
has("$(39 - 172) \\bmod 256 = 256 - 172 + 39 = 123$", "$172 + 123 = 295 = 256 + 39$", "$(172 - 39) \\bmod 256 = 133$")

# ── Ripple up / down and the wiring rule ──────────────────────────────────
up3 = run(3)
assert up3 == [1, 2, 3, 4, 5, 6, 7, 0]
assert [[(s >> i) & 1 for s in up3] for i in range(3)] == [[1, 0, 1, 0, 1, 0, 1, 0], [0, 1, 1, 0, 0, 1, 1, 0], [0, 0, 0, 1, 1, 1, 1, 0]]
has("001, 010, 011, 100, 101, 110, 111, 000: a mod-8 up counter", "$Q_0$: 1, 0, 1, 0, 1, 0, 1, 0.",
    "$Q_1$: 0, 1, 1, 0, 0, 1, 1, 0.", "$Q_2$: 0, 0, 0, 1, 1, 1, 1, 0.")
assert run(3, edges=5) == [1, 2, 3, 4, 5]
# the 2 × 2 rule: (edge, source) → direction; source Q̄ is the `down` flag, the positive edge flips it again
rule = {}
for edge in ("neg", "pos"):
    for src, dflag in (("Q", False), ("Qbar", True)):
        s = run(3, edge=edge, down=dflag)
        rule[(edge, src)] = "up" if s == [1, 2, 3, 4, 5, 6, 7, 0] else "down" if s == [7, 6, 5, 4, 3, 2, 1, 0] else None
assert rule == {("neg", "Q"): "up", ("neg", "Qbar"): "down", ("pos", "Q"): "down", ("pos", "Qbar"): "up"}
# exactly one inversion (bubble or bar) ↔ up
assert all((rule[(e, s)] == "up") == ((e == "neg") != (s == "Qbar")) for e, s in rule)
# increment / decrement: bit i flips iff bit i−1 falls (up) / rises (down), for every 6-bit value
for v in range(64):
    for i in range(1, 6):
        u, d = (v + 1) % 64, (v - 1) % 64
        assert (((v ^ u) >> i) & 1) == ((v >> (i - 1)) & 1 == 1 and (u >> (i - 1)) & 1 == 0)
        assert (((v ^ d) >> i) & 1) == ((v >> (i - 1)) & 1 == 0 and (d >> (i - 1)) & 1 == 1)
# 2010: positive-edge T stages, the second clocked by Q0
s10 = run(2, edges=4, edge="pos")
assert [b(s, 2) for s in s10] == ["11", "10", "01", "00"]
opts10 = {"A": ["11", "10", "01", "00"], "B": ["10", "11", "01", "00"], "C": ["10", "00", "01", "11"], "D": ["11", "10", "00", "01"]}
assert [k for k, v in opts10.items() if v == [b(s, 2) for s in s10]] == bl.key_letters(bank["cse-2010-cs-32"]["answer"]) == ["A"]
assert [k for k, v in opts10.items() if [x[1] for x in v] == ["1", "0", "1", "0"]] == ["A"]  # Q0 alone decides
assert [b(s, 2) for s in run(2, edges=4)] == ["01", "10", "11", "00"] and ["01", "10", "11", "00"] not in opts10.values()
assert run(2, edges=5) == [1, 2, 3, 0, 1]
has("Then 10, 01, 00. The answer is **11, 10, 01, 00**", "Options B (10, 11, 01, 00) and C (10, 00, 01, 11) have $Q_0 = 0$ after the first pulse, and D\n(11, 10, 00, 01) has $Q_0 = 0$ after the third",
    "it\nsettles at 3, 2, 1, 0", "settles at 1, 2, 3,\n4, 5 after the first five clocks")
# mixed counter: stage 1 on Q0, stage 2 on Q̄1 (negative edge)
mix = run(3, down=[0, 0, 1])
assert mix == [1, 6, 7, 4, 5, 2, 3, 0] and [b(s, 3) for s in mix] == ["001", "110", "111", "100", "101", "010", "011", "000"]
assert [s & 3 for s in mix] == [1, 2, 3, 0, 1, 2, 3, 0] and [(s >> 2) & 1 for s in mix] == [0, 1, 1, 1, 1, 0, 0, 0]
has("001, 110, 111, 100, 101, 010, 011, 000, that is 1, 6, 7, 4, 5, 2, 3, 0", "$Q_2$: 0, 1, 1, 1, 1, 0, 0, 0.")
# down counters
dn2 = run(2, edges=4, down=True)
assert [b(s, 2) for s in dn2] == ["11", "10", "01", "00"]
dn3 = run(3, down=True)
assert [b(s, 3) for s in dn3] == ["111", "110", "101", "100", "011", "010", "001", "000"]
has("**00 → 11 → 10 → 01 → 00**", "000 → 111 → 110 → 101 → 100 → 011 → 010 → 001 → 000", "**0 → 3 → 2 → 1 → 0**")
# Q̄ outputs of an up counter show a down count from the top
assert [7 - s for s in [0] + up3[:-1]] == [7] + run(3, start=7, down=True)[:-1] == [7, 6, 5, 4, 3, 2, 1, 0]
# edge case: a down counter at 000 ripples through 001, 011 to 111 in 30 ns
assert chain(3, 0, down=True) == [(0, 0), (10, 1), (20, 3), (30, 7)]
has("000 → 001 → 011 → **111**, settled 30 ns after the edge")
# q10: 3-bit negative-edge down counter (Q̄ clocks) from 010
assert [b(s, 3) for s in run(3, edges=4, start=2, down=True)] == ["001", "000", "111", "110"]
# q03: positive-edge stages clocked by Q̄ count up
assert [b(s, 3) for s in run(3, edges=3, edge="pos", down=True)] == ["001", "010", "011"]
assert [b(s, 3) for s in run(3, edges=3, edge="pos")] == ["111", "110", "101"]  # option B is the Q-clocked circuit

# ── Frequency division ─────────────────────────────────────────────────────
for n in (3, 4, 5):
    ev = sq.ripple_events(n, 3, CL[:2 ** (n + 1) + 2])
    for i in range(n):
        rises = [t for (t, q), (_, p) in zip(ev[1:], ev) if (q >> i) & 1 and not (p >> i) & 1]
        falls = [t for (t, q), (_, p) in zip(ev[1:], ev) if not (q >> i) & 1 and (p >> i) & 1]
        assert {y - x for x, y in zip(rises, rises[1:])} == {100 * 2 ** (i + 1)}  # period 2^(i+1) T, delays included
        assert falls[0] - rises[0] == 100 * 2 ** i  # 50 % duty
assert [1000 / 2 ** (i + 1) for i in range(4)] == [500, 250, 125, 62.5] and 16 * 1 == 16
has("500, 250, 125 and 62.5 kHz", "$Q_3$: 1 MHz / $2^4$ = 1000 kHz / 16 = 62.5 kHz")
# duty cycle of non-power-of-two outputs: mod-6 by clear (Q2 high in 4, 5), decade (Q3 high in 8, 9), binary stages 50 %
cyc6, cyc10 = [0] + run(3, edges=5, clear=gate(ones(6)), tclr=5), [0] + run(4, edges=9, clear=gate(ones(10)), tclr=5)
assert cyc6 == list(range(6)) and cyc10 == list(range(10))
assert [q for q in cyc6 if (q >> 2) & 1] == [4, 5] and [q for q in cyc10 if (q >> 3) & 1] == [8, 9]
assert round(100 * 2 / 6) == 33 and 100 * 2 / 10 == 20 and sum((q >> 1) & 1 for q in cyc6) == 2 and sum(q & 1 for q in cyc6) == 3
has("$Q_2$ is 1 in 2 of the 6 states (4 and 5), a 33% duty cycle", "$Q_3$ is 1 only in 8 and 9, a 20% duty cycle",
    "binary\nstages at 50% duty. A mod-$N$ output runs at $f/N$ but is square only for $N = 2^k$.")
assert 3600 / 6 == 600 and 600 / 10 == 60 and modulus(3, clear=gate(ones(6)), tclr=5) * modulus(4, clear=gate(ones(10)), tclr=5) == 60
has("60 kHz from 7 flip-flops", "$\\lceil \\log_2 60 \\rceil = 6$")
# 2025: last-stage period 64 µs of a 4-bit counter → input period 4 µs → 250 kHz
assert 64 / 2 ** 4 == 4 and 1000 / 4 == 250 and 1000 / 64 == 15.625 and 1000 / (64 / 4) == 62.5
lo, hi = map(float, bank["cse-2025-2-cs-24"]["answer"].split(" to "))
assert lo <= 250 <= hi
has("$T = 64 / 16 = 4\\ \\mu\\text{s}$", "**250 kHz** (GATE 2025)", "15.625$ kHz", "(62.5 kHz)")
# q04: 1.6 MHz, third flip-flop → f/8
bl.assert_nat(P["nx-dl-06-04-q04"], 1600 / 2 ** 3)
assert 1600 / 4 == 400 and 1600 / 32 == 50

# ── Ripple delay, f_max, glitches ──────────────────────────────────────────
for n, w in ((3, 30), (4, 40), (8, 80)):
    assert max(chain(n, s)[-1][0] for s in range(2 ** n)) == w == n * 10
has("30 ns for 3 bits, 40 ns for 4 bits and 80 ns for 8 bits")
assert chain(3, 3) == [(0, 3), (10, 2), (20, 0), (30, 4)] and [q for _, q in chain(3, 7)] == [7, 6, 4, 0]
has("**011 → 010 → 000 → 100**", "the edge that takes 111 to 000 passes through 110 and 100")
c7 = chain(4, 7)
assert c7 == [(0, 7), (10, 6), (20, 4), (30, 0), (40, 8)]
assert [c7[k + 1][0] - c7[k][0] for k in range(1, 4)] == [10, 10, 10]
has("At 10 ns: $Q_0$ falls, state 0110. At 20 ns: $Q_1$ falls, 0100. At 30 ns: $Q_2$ falls, 0000. At 40 ns: $Q_3$ rises, 1000.",
    "0110, 0100 and\n0000 for 10 ns each")
# every stage toggles at most once per edge, stage i at (i + 1)·t_pd
for n in (3, 4, 5):
    for s in range(2 ** n):
        ev = chain(n, s)
        for (t, q), (_, p) in zip(ev[1:], ev):
            i = (q ^ p).bit_length() - 1
            assert q ^ p == 1 << i and t == (i + 1) * 10
# m stages toggling → m − 1 false states
for s in range(16):
    ev = chain(4, s)
    assert len(ev) - 2 == bin(s ^ ev[-1][1]).count("1") - 1
# f_max: 8-bit, 10 ns, 15 ns decoder
assert 8 * 10 + 15 == 95 and round(1000 / 95, 2) == 10.53 and 1000 / 80 == 12.5 and 1000 / (10 + 15) == 40
has("$1/(95\\ \\text{ns}) \\approx 10.53$ MHz", "About **10.53 MHz** with the decoder (12.5 MHz without it)", "$f_{\\max} = 40$ MHz")
# q05: 5 stages × 12 ns + 20 ns
w5 = max(sq.ripple_events(5, 12, [0], start=s)[-1][0] for s in range(32))
assert w5 == 60
bl.assert_nat(P["nx-dl-06-04-q05"], 1000 / (w5 + 20))
assert 1000 / 32 == 31.25 and round(1000 / 60, 2) == 16.67
# q08: transients from 1011
c11 = chain(4, 11)
seen = [b(q, 4) for _, q in c11[1:]]
assert seen == ["1010", "1000", "1100"]
bl.assert_msq(P["nx-dl-06-04-q08"], [k for k, v in bl.option_values(P["nx-dl-06-04-q08"]).items() if v in seen])

# ── Mod-N by asynchronous clear ────────────────────────────────────────────
m6 = run(3, edges=8, clear=gate([2, 1]), tclr=5)
assert m6 == [1, 2, 3, 4, 5, 0, 1, 2]
ev6 = sq.ripple_events(3, 10, CL[:8], clear=gate([2, 1]), tclr=5)
assert [q for t, q in ev6 if 500 < t < 600] == [4, 6, 0] and [t for t, q in ev6 if 500 < t < 600] == [510, 520, 525]
dec = run(4, edges=12, clear=gate([3, 1]), tclr=5)
assert dec == [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2]
ev10 = sq.ripple_events(4, 10, CL[:12], clear=gate([3, 1]), tclr=5)
assert [q for t, q in ev10 if 900 < t < 1000] == [8, 10, 0]
has("(1001 → 1000 → 1010 → cleared)", "101 → 100 (one delay) → 110 (two delays)")
# the clear-detect theorem: AND of the 1 bits of N gives mod-N, for every N reachable by a 4- or 5-bit counter
for n in (3, 4, 5):
    for N in range(2, 2 ** n):
        assert modulus(n, clear=gate(ones(N)), tclr=5) == N, (n, N)
        # and no settled or transient state below N fires the gate
        ev = sq.ripple_events(n, 10, CL[:N], clear=gate(ones(N)), tclr=5)
        assert all(not gate(ones(N))(q) for t, q in ev if t < 100 * (N - 1))
        # detecting N − 1 asynchronously loses one more state
        if N >= 3:
            assert modulus(n, clear=gate(ones(N - 1)), tclr=5) == N - 1
# clear gates named in the trick
assert ones(6) == [1, 2] and ones(10) == [1, 3] and ones(12) == [2, 3] and ones(5) == [0, 2]
assert modulus(4, clear=gate([3, 0]), tclr=5) == 9
has("Mod-6 = 110: $Q_2 Q_1$. Mod-10 = 1010: $Q_3 Q_1$. Mod-12 = 1100: $Q_3 Q_2$. Mod-5 = 101: $Q_2 Q_0$.",
    "a gate on\n$Q_3$ and $Q_0$ clears at 1001, so the counter is mod-9")
# 2007: A4 A3 A2 A1 with A1 the LSB → A3 is bit 2, A1 is bit 0; asynchronous clear at 0101
c07 = run(4, edges=12, tpd=1, clear=gate([2, 0]), tclr=1)
assert c07[:6] == [1, 2, 3, 4, 0, 1]
cyc07 = [0] + c07[:c07.index(0)]
opts07 = {"A": [0, 3, 4], "B": [0, 3, 4, 5], "C": [0, 1, 2, 3, 4], "D": [0, 1, 2, 3, 4, 5]}
assert [k for k, v in opts07.items() if v == cyc07] == bl.key_letters(bank["cse-2007-cs-36"]["answer"]) == ["C"]
# the other bit order (A4 the LSB): A3·A1 would detect 1010 = 10, a 0 … 9 counter, which is no option
assert 0b1010 == 10 and modulus(4, clear=gate([1, 3]), tclr=5) == 10 and list(range(10)) not in opts07.values()
has("Reading $A_4$ as the\nLSB instead would make the gate detect 1010 = 10 (sequence 0 … 9), which is not among the options.")
# the same counter with a synchronous clear (option D), and the synchronous mod-5 gate (detect 4 = A3 alone)
sync = lambda g: (lambda q: 0 if g(q) else (q + 1) % 16)  # noqa: E731
assert sq.cycle_from(sync(gate([2, 0])), 0) == ([], [0, 1, 2, 3, 4, 5]) and opts07["D"] == [0, 1, 2, 3, 4, 5]
assert sq.cycle_from(sync(gate([2])), 0) == ([], [0, 1, 2, 3, 4])
for N in range(2, 16):  # synchronous clear: detect N − 1 for mod-N; detecting N gives mod-(N + 1)
    assert len(sq.cycle_from(sync(gate(ones(N - 1))), 0)[1]) == N
    if N < 15:
        assert len(sq.cycle_from(sync(gate(ones(N))), 0)[1]) == N + 1
has("**0, 1, 2, 3, 4** (GATE 2007, option C)", "0, 1, 2, 3, 4, 5 (mod-6, one state longer than the asynchronous version)")

# ── PYQs: sizing ───────────────────────────────────────────────────────────
assert bank["cse-1994-a-2-1"]["answer"] == "$\\lceil \\log_2 N \\rceil$"
opts11 = {o["l"]: int(o["t"]) for o in bank["cse-2011-cs-15"]["options"]}
assert [k for k, v in opts11.items() if v == sq.ff_count(258)] == bl.key_letters(bank["cse-2011-cs-15"]["answer"]) == ["A"]
opts05 = {o["l"]: int(o["t"]) for o in bank["it-2005-cs-11"]["options"]}
assert [k for k, v in opts05.items() if v == sq.pulses_between(172, 39, 8)] == bl.key_letters(bank["it-2005-cs-11"]["answer"]) == ["D"]
has("(GATE 2011, option A", "(IT 2005, option D)", "(GATE 2010, option A)")

# ── Practice ───────────────────────────────────────────────────────────────
bl.assert_nat(P["nx-dl-06-04-q01"], sq.ff_count(1001))
assert sq.ff_count(1001) == 10 and int(log2(1000)) == 9
bl.assert_nat(P["nx-dl-06-04-q02"], sq.pulses_between(0b110010, 0b001011, 6))
assert sq.pulses_between(0b001011, 0b110010, 6) == 39
q3 = [b(s, 3) for s in run(3, edges=3, edge="pos", down=True)]
bl.assert_mcq(P["nx-dl-06-04-q03"], [k for k, v in bl.option_values(P["nx-dl-06-04-q03"]).items() if v == ", ".join(q3)][0])
mods = {"A": [3, 1, 0], "B": [3, 2, 0], "C": [3, 2], "D": [2, 1]}
got = {k: modulus(4, clear=gate(v), tclr=5) for k, v in mods.items()}
assert got == {"A": 11, "B": 13, "C": 12, "D": 6}
bl.assert_mcq(P["nx-dl-06-04-q06"], [k for k, v in got.items() if v == 12][0])
m9 = modulus(4, clear=gate([3, 0]), tclr=5)
assert m9 == 9
bl.assert_mcq(P["nx-dl-06-04-q07"], "B")
assert bl.option_values(P["nx-dl-06-04-q07"])["B"] == f"0, 1, 2, …, {m9 - 1}"
# q09: A (n·t_pd) true, B (neg + Q is down) false, C (glitches) true, D (async detects N − 1) false
truth = {"A": max(chain(6, s)[-1][0] for s in range(64)) == 6 * 10,
         "B": rule[("neg", "Q")] == "down",
         "C": any(len(chain(4, s)) > 2 for s in range(16)),
         "D": all(modulus(4, clear=gate(ones(N - 1)), tclr=5) == N for N in range(3, 16))}
bl.assert_msq(P["nx-dl-06-04-q09"], [k for k, v in truth.items() if v])
q10 = ", ".join(b(s, 3) for s in run(3, edges=4, start=2, down=True))
bl.assert_mcq(P["nx-dl-06-04-q10"], [k for k, v in bl.option_values(P["nx-dl-06-04-q10"]).items() if v == q10][0])
assert len([k for k in P if k.startswith("nx-dl-06-04-")]) == 10
keys = [P[f"nx-dl-06-04-q{k:02d}"]["answer"] for k in range(1, 11) if P[f"nx-dl-06-04-q{k:02d}"]["type"] == "MCQ"]
assert sorted(keys) == list("ABCD")
o3 = bl.option_values(P["nx-dl-06-04-q03"])
assert o3["B"] == "111, 110, 101" and o3["D"] == ", ".join(x[::-1] for x in q3)  # Q-clocked (down) circuit; bits reversed
assert {c["answer"] for c in P["nx-dl-06-04-q03"]["common_wrong"]} == {"B", "C", "D"}
o10 = bl.option_values(P["nx-dl-06-04-q10"])
assert o10["A"] == ", ".join(b(s, 3) for s in run(3, edges=4, start=2)) and {c["answer"] for c in P["nx-dl-06-04-q10"]["common_wrong"]} == {"A", "C"}
for q in (P[f"nx-dl-06-04-q{k:02d}"] for k in range(1, 11)):
    for blk in q["blocks"]:
        assert f"#{blk} " in L or f"#{blk}}}" in L, (q["id"], blk)
assert "erratum" not in L.split("\n---\n", 1)[1] and "c343" not in L
print("l6_04_ripple: flip-flop counts, pulse counting, up/down wiring rule (all four combinations, per-stage mixed), "
      "down counts and wrap, frequency division with delays, ripple settling n·t_pd and transient states, f_max, "
      "mod-N by asynchronous and synchronous clear for every N, 6 PYQ keys and 10 practice answers OK")
