"""Checks for dl/07-beyond-syllabus/01-memory-devices: every address-line count, capacity, 2-D decoder
size, refresh figure, chip plan, decoder, address range, row/offset and alias list of the lesson is
recomputed with beyondlib, each chip array is simulated bit by bit (write every address, read it back),
and every practice answer, MSQ option and MCQ distractor is re-derived. (No PYQs: outline 0.)"""
import pathlib
import sys
from fractions import Fraction as F

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import beyondlib as bz  # noqa: E402

L = bz.lesson_text("01-memory-devices.md")
has = lambda *s: bl.must_contain(L, *s)  # noqa: E731
P = bz.practice()
K = bz.K
assert L.split("---\n", 2)[2].lstrip().startswith("*Optional: beyond the core GATE syllabus.*")
assert ':::pyq{' not in L

# ── Vocabulary and the address-lines theorem ───────────────────────────────
assert bz.addr_lines(4 * K) == 12 and bz.capacity(4 * K, 8) == 32768 == 32 * K and 32768 // 8 == 4 * K
has("$4096$ words of 8 bits, so $32\\,768$ bits $= 32$ Kbit $= 4$ KB", "12 address lines, 8 data lines, $32\\,768$ bits (4 KB)")
assert bz.addr_lines(32 * K) == 15 and bz.addr_lines(256 * K) == 18 and bz.capacity(32 * K, 8) == 256 * K
has("$\\log_2(256\\text{K}) = 18$", "$\\log_2(32\\text{K}) = 15$")
assert bz.addr_lines(4 * K // 4) == 10 and bz.addr_lines(4 * K) == 12  # 4 KB of 32-bit words
has("4 KB of 32-bit words is 1024 words, so 10 address lines, not 12")
# pigeonhole: k lines name 2^k words; the width never matters
for words in (1, 2, 3, 1000, 1024, 1025, 24 * K):
    k = bz.addr_lines(words)
    assert 2 ** k >= words and (k == 0 or 2 ** (k - 1) < words)

# ── 2-D decoding ───────────────────────────────────────────────────────────
assert bz.lines_2d(10, 5) == 64 and bz.lines_2d(11, bz.best_split(11)) == 96 and bz.lines_2d(10, 2) == 260
for k in range(1, 24):
    best = min(bz.lines_2d(k, r) for r in range(k + 1))
    assert best == bz.lines_2d(k, k // 2) == bz.lines_2d(k, -(-k // 2))
    assert best == (2 * 2 ** (k // 2) if k % 2 == 0 else 3 * 2 ** ((k - 1) // 2))
has("$k = 10$: $32 + 32 = 64$ lines instead of 1024; $k = 11$: $32 + 64 = 96$", "$4 + 256 = 260$, worse than 64")
assert bz.addr_lines(64 * K) == 16 and bz.best_split(16) == 8 and bz.lines_2d(16, 8) == 512 and 2 ** 16 // 512 == 128
has("$2^8 + 2^8 = 512$", "8 + 8 bits, a $256 \\times 256$ array, 512 decoder outputs instead of $65\\,536$ (128 times fewer)")

# ── Refresh ────────────────────────────────────────────────────────────────
T, R, trc = F(64, 1000), 8192, F(50, 10 ** 9)
ti = bz.refresh_interval(T, R)
assert bz.dec(ti * 10 ** 6) == "7.8125"
ov = bz.refresh_overhead(R, trc, T)
assert ov == F(64, 10000) and bz.dec(ov * 100) == "0.64"
assert bz.dec(R * trc * 10 ** 6) == "409.6" and round(float(R * trc * 1000), 2) == 0.41
has("$t_{\\text{int}} = 64\\ \\text{ms} / 8192 = 7.8125\\ \\mu\\text{s}$", "$8192 \\times 50\\ \\text{ns} = 409.6\\ \\mu\\text{s}$",
    "$409.6\\ \\mu\\text{s} / 64\\ \\text{ms} = 0.0064 = 0.64\\%$", "$8192 \\times 50\\ \\text{ns} \\approx 0.41$ ms")
assert bz.CELL_TRANSISTORS == {"SRAM": 6, "DRAM": 1}

# ── Edge case: equal capacity, different shapes ────────────────────────────
assert bz.capacity(32 * K, 1) == bz.capacity(4 * K, 8)
assert (bz.addr_lines(32 * K) + 1, bz.addr_lines(4 * K) + 8) == (16, 20)
has("Pins: $15 + 1 = 16$ against $12 + 8 = 20$")

# ── Expansion: plans and bit-true simulation ───────────────────────────────
p = bz.chip_plan(1 * K, 8, 1 * K, 4)
assert (p["rows"], p["cols"], p["chips"], p["decoder"], p["low_bits"]) == (1, 2, 2, None, 10)
p = bz.chip_plan(8 * K, 8, 1 * K, 4)
assert (p["rows"], p["cols"], p["chips"], p["addr_bits"], p["low_bits"], p["decoder"]) == (8, 2, 16, 13, 10, (3, 8)) and p["ratio"] == 16
p = bz.chip_plan(64 * K, 16, 16 * K, 8)
assert (p["rows"], p["cols"], p["chips"], p["addr_bits"], p["low_bits"], p["decoder"], p["ratio"]) == (4, 2, 8, 16, 14, (2, 4), 8)
assert 65536 * 16 // (16384 * 8) == 8
has("$\\frac{65\\,536 \\cdot 16}{16\\,384 \\cdot 8} = 8$ and the formula gives $4 \\times 2 = 8$ chips with a $2 : 4$ decoder")
p = bz.chip_plan(24 * K, 8, 8 * K, 8)
assert (p["rows"], p["chips"], p["addr_bits"], p["low_bits"], p["decoder"], p["unused_outputs"]) == (3, 3, 15, 13, (2, 4), 1)
assert 2 ** 14 < 24 * K <= 2 ** 15 and 24 * K == 24576
assert bz.address_map(24 * K, 8 * K) == [(0, 0x0000, 0x1FFF), (1, 0x2000, 0x3FFF), (2, 0x4000, 0x5FFF)]
has("$2^{14} = 16\\,384 < 24\\,576 \\le 32\\,768 = 2^{15}$", "`0000–1FFF`, `2000–3FFF`, `4000–5FFF`; output 3 (`6000–7FFF`)")
# the expansion theorem by experiment, scaled-down copies of every lesson array (same ratios)
for W, B, w, b in ((16, 8, 16, 4), (64, 8, 8, 4), (64, 16, 16, 8), (24, 8, 8, 8), (64, 16, 16, 8), (40, 8, 8, 8)):
    assert bz.verify_system(W, B, w, b), (W, B, w, b)
# … and at full size for the animated array (write/read a sample of addresses, each selecting one row)
m = bz.MemorySystem(64 * K, 16, 16 * K, 8)
for a in (0x0000, 0x3FFF, 0x4000, 0x9A3C, 0xB123, 0xFFFF, 0x2F00):
    m.write(a, (a * 7) & 0xFFFF)
for a in (0x0000, 0x3FFF, 0x4000, 0x9A3C, 0xB123, 0xFFFF, 0x2F00):
    v, rows = m.read(a)
    assert v == (a * 7) & 0xFFFF and rows == [a >> 14]

# ── Address maps ───────────────────────────────────────────────────────────
amap = bz.address_map(64 * K, 16 * K)
assert [(bz.hx(lo), bz.hx(hi)) for _, lo, hi in amap] == [("0000", "3FFF"), ("4000", "7FFF"), ("8000", "BFFF"), ("C000", "FFFF")]
has("Row 0: `0000–3FFF`; row 1: `4000–7FFF`; row 2: `8000–BFFF`; row 3: `C000–FFFF`")
assert bz.which_chip(0x9A3C, 16 * K) == (2, 0x1A3C) and 0x1A3C == 6716 and format(0x9A3C, "016b") == "1001101000111100"
has("`9A3C` $= 1001\\,1010\\,0011\\,1100_2$; $A_{15}A_{14} = 10$, so row 2", "\\texttt{1A3C}$ (decimal 6716)")
q, off = bz.which_chip(0x1A7F, 1 * K)
assert (q, off) == (6, 0x27F) and off == 639 and format(0x1A7F, "013b") == "1101001111111" and 6 * 0x400 == 0x1800
assert (2 * q, 2 * q + 1) == (12, 13)
has("$A_{12}A_{11}A_{10} = 110$: decoder output 6", "\\texttt{27F}$ (decimal 639)", "Chips 12 (low nibble) and 13 (high nibble)")
al = bz.alias_addresses(16, 12, {15: 1})
assert [bz.hx(a) for a in al] == ["8000", "9000", "A000", "B000", "C000", "D000", "E000", "F000"] and bz.aliases(16, 12, 1) == 8
assert (0x8123 & 0xFFF) == (0xF123 & 0xFFF) == 0x123
has("$2^{16 - 12 - 1} = 8$ copies", "`8000`, `9000`, `A000`, `B000`, `C000`, `D000`, `E000`, `F000`")
# alias theorem by enumeration: every word appears 2^(n-m-d) times
for n, mm, dec in ((8, 4, {7: 1}), (8, 3, {7: 0, 6: 1}), (10, 6, {})):
    starts = bz.alias_addresses(n, mm, dec)
    assert len(starts) == bz.aliases(n, mm, len(dec))
has("there are $2^3 = 8$\ncopies")

# ── Practice ───────────────────────────────────────────────────────────────
q1 = P["nx-dl-07-01-q01"]
assert bz.addr_lines(256 * K) == 18 and bz.addr_lines(256 * K * 16) == 22
bl.assert_mcq(q1, bl.which(bl.option_values(q1), lambda t: t.startswith(f"{bz.addr_lines(256 * K)} address lines and 16 data"))[0])
bl.assert_nat(P["nx-dl-07-01-q02"], bz.chip_plan(16 * K, 16, 2 * K, 4)["chips"])
p3 = bz.chip_plan(128 * K, 8, 32 * K, 8)
assert p3["decoder"] == (2, 4) and p3["addr_bits"] == 17 and p3["low_bits"] == 15
bl.assert_mcq(P["nx-dl-07-01-q03"], "C")
assert "$2 : 4$ decoder on $A_{16}A_{15}$" in bl.option_values(P["nx-dl-07-01-q03"])["C"]
assert bz.CELL_TRANSISTORS["SRAM"] == 6
bl.assert_msq(P["nx-dl-07-01-q04"], ["A", "B", "D"])
q, off = bz.which_chip(0xB123, 16 * K)
assert (q, bz.hx(off)) == (2, "3123")
bl.assert_mcq(P["nx-dl-07-01-q05"], bl.which(bl.option_values(P["nx-dl-07-01-q05"]), lambda t: t == f"Row {q}, offset `{bz.hx(off)}`")[0])
assert P["nx-dl-07-01-q05"]["answer"] == "A"
bl.assert_nat(P["nx-dl-07-01-q06"], bz.lines_2d(bz.addr_lines(4 * K * K), bz.best_split(22)))
assert bz.aliases(16, 11, 2) == 8 == len(bz.alias_addresses(16, 11, {15: 1, 14: 0}))
bl.assert_mcq(P["nx-dl-07-01-q07"], bl.which(bl.option_values(P["nx-dl-07-01-q07"]), lambda t: t == str(bz.aliases(16, 11, 2)))[0])
p8 = bz.chip_plan(40 * K, 8, 8 * K, 8)
st8 = {"A": p8["chips"] == 5, "B": p8["addr_bits"] == 16, "C": p8["decoder"] == (3, 8) and p8["unused_outputs"] == 3,
       "D": p8["rows"] <= 4}
bl.assert_msq(P["nx-dl-07-01-q08"], [k for k, v in st8.items() if v])
mcq = [P[k]["answer"] for k in sorted(P) if k.startswith("nx-dl-07-01-") and P[k]["type"] == "MCQ"]
assert sorted(set(mcq)) == ["A", "C"] and max(mcq.count(x) for x in mcq) <= 2
ids = {i for i in __import__("re").findall(r"\{#([a-z0-9-]+)", L)}
for k in sorted(P):
    if k.startswith("nx-dl-07-01-"):
        assert set(P[k]["blocks"]) <= ids, (k, set(P[k]["blocks"]) - ids)
assert len([k for k in P if k.startswith("nx-dl-07-01-")]) == 8
print("l7_01_memory: address lines, 2-D decoding (all k), refresh, chip plans, 6 simulated chip arrays (+ the 64K x 16 at full size), "
      "address maps, row/offset, aliases, and 8 practice answers OK")
