"""Checks for dl/07-beyond-syllabus/02-data-converters: every DAC output, step, full scale, resolution,
node voltage, leg current, weighted-DAC current, ADC code, quantisation error, comparator count,
conversion time, dual-slope count and SAR trace of the lesson is recomputed with convlib (the DACs by
exact nodal analysis of the circuit, never by their formula), and every practice answer, MSQ option and
MCQ distractor is re-derived. (No PYQs: outline 0.)"""
import pathlib
import re
import sys
from fractions import Fraction as F
from math import floor

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import convlib as cv  # noqa: E402
import seqlib as sq  # noqa: E402

L = sq.lesson_text("02-data-converters.md", sq.CH7)
WS = lambda t: " ".join(t.split())  # noqa: E731
LW = WS(L)
has = lambda *s: bl.must_contain(LW, *map(WS, s))  # noqa: E731  (line breaks in the lesson do not matter)
P = sq.practice(sq.CH7)
fr = cv.frac
assert L.split("---\n", 2)[2].lstrip().startswith("*Optional: beyond the core GATE syllabus.*")
assert ":::pyq{" not in L
has("content/gate-notes/_checks/dl/l7_02_converters.py")
has(':::lab{#lab-sar lab="converter-bench" tab="sar" depth="standard"}',
    ':::lab{#lab-dac lab="converter-bench" tab="dac" depth="standard"}',
    ':::viz{#sar-viz spec="sar-binary-search" mode="animate"', ':::viz{#r2r-viz spec="r2r-ladder-currents" mode="animate"')


def lad(n, code, vref, r, rf):
    return cv.ladder(n, code, vref, r, rf)


# ── DAC basics: the 4-bit, 10 V sanity check and the full-scale trap ────────
assert cv.step_size(4, 10) == F(5, 8) and cv.dac_ideal(4, 0b1000, 10) == 5
assert cv.dac_ideal(4, 0b1111, 10) == F(75, 8) == cv.full_scale(4, 10) == 10 - cv.step_size(4, 10)
has("$\\Delta = 10/16 = 0.625$ V", "$0.1_2 \\times 10 = 5$ V", "= (15/16) \\times 10 = 9.375$ V",
    "$9.375$ V: the top step is one step short of the ceiling")
# 8-bit, 2.55 V full scale: 10 mV steps, V_ref 2.56 V; percentages
assert fr("2.55") / 255 == fr("0.01") and 256 * fr("0.01") == fr("2.56") and cv.full_scale(8, "2.56") == fr("2.55")
assert cv.dec(cv.resolution_percent(4), 2) == "6.67" and cv.dec(cv.resolution_percent(8), 3) == "0.392"
assert cv.dec(F(100, 256), 3) != "0.392"
has("10 mV steps); given the **reference**", "$V_{ref} = 2.56$ V for the same DAC", "$6.67\\%$ for 4 bits, $0.392\\%$ for 8 bits")

# ── Weighted-resistor DAC ──────────────────────────────────────────────────
W = cv.weighted(4, 0b1000, 5, 10, 5)
assert W["resistors"] == [10, 20, 40, 80] and W["iout"] == F(1, 2) and W["vo"] == F(-5, 2)
W = cv.weighted(4, 0b0001, 5, 10, 5)
assert W["iout"] == F(1, 16) and W["vo"] == F(-5, 16) == -cv.step_size(4, 5)
has("$I_{out} = 0.5$ mA, $V_o = -2.5$ V $= -5 \\times 1/2$", "$I_{out} = 0.0625$ mA, $V_o = -0.3125$ V $= -5/16$")
for n in range(1, 9):  # R_f = R/2 is the ideal DAC; the general formula -V_ref (R_f/R) 2D/2^n
    for code in range(2 ** n):
        assert cv.weighted(n, code, 5, 10, 5)["vo"] == -cv.dac_ideal(n, code, 5)
assert [cv.weighted(n, 1, 1, 1, 1)["spread"] for n in (4, 8, 16)] == [8, 128, 32768]
assert 2 ** 7 * F(1, 100) > 1 and 2 ** 6 * F(1, 100) < 1          # a 1% MSB error exceeds one step from 8 bits
has("8 for 4 bits, 128 for 8 bits, 32 768 for\n16 bits", "128 kΩ LSB resistor", "which already happens at 8 bits")
# ex-dac-weighted
W = cv.weighted(4, 0b0110, 5, 10, 5)
assert W["currents"] == [0, F(1, 4), F(1, 8), 0] and W["iout"] == F(3, 8) and W["vo"] == F(-15, 8)
assert -5 * F(6, 16) == W["vo"] and cv.weighted(8, 1, 5, 10, 5)["resistors"][-1] == 1280
has("$5/20 = 0.25$ mA and $5/40 = 0.125$ mA", "$I_{out} = 0.375$ mA, $V_o = -5 \\times 0.375 = -1.875$ V",
    "spread $2^7 = 128$, from 10 kΩ to 1.28 MΩ")

# ── R-2R ladder: theorem by nodal analysis, the erratum, examples ──────────
for n in range(1, 9):
    for code in range(2 ** n):
        X = lad(n, code, 5, 2, 2)
        assert X["iref"] == F(5, 2) and X["volts"] == [F(5, 2 ** k) for k in range(n)]
        assert X["legs"][-1] == X["term"] and X["vo"] == -cv.dac_ideal(n, code, 5)
X = lad(3, 0b001, 5, 2, 2)
assert X["iref"] == F(5, 2) and X["volts"] == [5, F(5, 2), F(5, 4)]
assert X["legs"] == [F(5, 4), F(5, 8), F(5, 16)] and X["term"] == F(5, 16) and sum(X["legs"]) + X["term"] == F(5, 2)
assert X["iout"] == F(5, 16) and X["vo"] == F(-5, 8) and X["iref"] != 25 and X["vo"] != F(-5, 16)
has("$I = V_{ref}/R = 5\\text{ V}/2\\text{ kΩ} = \\mathbf{2.5}$ **mA** (not 25 mA)", "$I/8 = 0.3125$ mA",
    "\\mathbf{-0.625\\ V}", "(not $-0.3125$ V)", "$-5 \\times 1/8 = -0.625$ V")
has("$I = V_{ref}/R = 5/2 = 2.5$ mA.", "$A_2 = 5$ V, $A_1 = 2.5$ V, $A_0 = 1.25$ V.",
    "Legs: $5/4 = 1.25$ mA (MSB), $0.625$ mA, $0.3125$ mA (LSB); terminator $0.3125$ mA. Total $2.5$ mA.",
    "$I_{out} = 0.3125$ mA, $V_o = -2 \\times 0.3125 = -0.625$ V.")
X = lad(3, 0b111, 5, 2, 2)
assert X["iout"] == F(35, 16) and X["vo"] == F(-35, 8) == -5 * F(7, 8) and X["ignd"] == F(5, 16)
assert X["iout"] + X["ignd"] == F(5, 2) and len({lad(3, c, 5, 2, 2)["iref"] for c in range(8)}) == 1
has("$I_{out} = 1.25 + 0.625 + 0.3125 = 2.1875$ mA.", "$V_o = -2 \\times 2.1875 = -4.375$ V $= -5 \\times 7/8$.",
    "Into ground: $0.3125$ mA; $2.1875 + 0.3125 = 2.5$ mA")
# voltage-switched ladder: V_ref = 8 V, codes 100 and 010
assert cv.ladder_voltage_mode(3, 0b100, 8, 1)["vout"] == 4 and cv.ladder_voltage_mode(3, 0b010, 8, 1)["vout"] == 2
has("with $V_{ref} = 8$ V, code 100 gives 4 V and code 010\ngives 2 V")
# trick: 10 V, 1011 → 6.875 V (unity gain ladder)
assert lad(4, 0b1011, 10, 1, 1)["vo"] == -F(55, 8) and cv.dac_ideal(4, 11, 10) == F(55, 8)
assert cv.dac_ideal(4, 11, 10) == 10 * F(0b1011, 16)
has("$10 \\times 0.1011_2 = 10 \\times 11/16 = 6.875$ V")
# ex-dac-easy and ex-dac-fullscale
assert cv.dac_ideal(4, 11, 10) == 11 * F(5, 8) and cv.full_scale(4, 10) == 15 * F(5, 8)
has("$\\Delta = 10/2^4 = 0.625$ V.", "$V_o = 11 \\times 0.625 = 6.875$ V $= 10 \\times 0.6875$",
    "$V_{FS} = 15 \\times 0.625 = 9.375$ V; resolution $= 1/15 = 6.67\\%$")
assert cv.dac_ideal(8, 100, "2.56") == 1 and cv.bstr(100, 8) == "01100100"
has("$1.00/0.01 = 100 = 0110\\,0100_2$; check: $2.56 \\times 100/256 = 1.00$ V.", "$100/255 = 0.392\\%$.")

# ── ADC basics ─────────────────────────────────────────────────────────────
assert cv.lsb(8, "5.12") == fr("0.02") and fr("3.37") / fr("0.02") == fr("168.5")
assert cv.ideal_code(8, "5.12", "3.37") == 168 and cv.ideal_code(8, "5.12", "3.37", True) == 169
assert fr("3.37") - 168 * fr("0.02") == fr("0.01") and fr("3.37") - 169 * fr("0.02") == fr("-0.01")
assert cv.bstr(168, 8) == "10101000" and cv.bstr(169, 8) == "10101001"
has("the truncating code is 168 ($V_q = 3.36$ V, error $+10$ mV $= +0.5$ LSB), while the rounding code is 169",
    "$3.37/0.02 = 168.5$", "Truncating: $D = 168 = 1010\\,1000$, $V_q = 3.36$ V, $e = +10$ mV. Rounding: $\\lfloor 169 \\rfloor = 169 = 1010\\,1001$, $V_q = 3.38$ V, $e = -10$ mV.")
# flash, 3 bits, 8 V, 5.3 V
f = cv.flash(3, 8, "5.3")
assert f["comparators"] == 7 and f["resistors"] == 8 and f["thresholds"] == list(range(1, 8))
assert "".join(map(str, f["outputs"])) == "0011111" and f["code"] == 5 and cv.bstr(5, 3) == "101"
has("thresholds 1, 2, …, 7 V: 7 comparators, 8 resistors", "From the top (7 V) down: $0\\,0\\,1\\,1\\,1\\,1\\,1$",
    "7 comparators, 8 resistors, outputs $0011111$, code $101$ ($V_q = 5$ V, error 0.3 V)")
# dual slope
ds = cv.dual_slope(1000, 2, "0.75")
assert ds["count"] == 375 and ds["total"] == 1375
has("$N_2 = 1000 \\times 0.75/2 = 375$.", "$N_1 + N_2 = 1375$ clocks.")
# 10-bit, 1 MHz, 10.24 V
assert cv.flash(10, "10.24", 0)["comparators"] == 1023 and cv.conversion_clocks("flash", 10) == 1
assert cv.conversion_clocks("sar", 10) == 10 and cv.conversion_clocks("counter", 10) == 1023
assert cv.lsb(10, "10.24") == fr("0.01")
c = cv.counter_adc(10, "10.24", "3.00")
assert c["code"] == c["clocks"] == 300 == cv.conversion_clocks("counter", 10, 300)
has("Flash: $2^{10} - 1 = 1023$ comparators, 1 clock $= 1\\ \\mu$s.", "SAR: 1 comparator, 10 clocks $= 10\\ \\mu$s",
    "Counter: 1 comparator, up to $1023$ clocks $= 1023\\ \\mu$s.", "$3.00/0.01 = 300$, so code 300 after $300\\ \\mu$s.",
    "$1023$ clocks for 10 bits, $1023\\ \\mu$s at 1 MHz")
# edge case: 4 bits, 8 V, 7.9 V
assert cv.lsb(4, 8) == F(1, 2) and fr("7.9") / F(1, 2) == fr("15.8")
assert cv.ideal_code(4, 8, "7.9") == 15 == cv.ideal_code(4, 8, "7.9", True) and floor(fr("15.8") + F(1, 2)) == 16
e = cv.sar(4, 8, "7.9", True)
assert e["code"] == 15 and e["err"] == fr("0.4") and e["errLsb"] == fr("0.8") and e["err"] >= cv.lsb(4, 8) / 2
assert 8 - cv.lsb(4, 8) / 2 == fr("7.75")
has("$\\Delta = 0.5$ V; $7.9/0.5 = 15.8$.", "Truncating: $D = 15 = 1111$, $V_q = 7.5$ V, $e = 0.4$ V $= 0.8$ LSB",
    "Rounding: $\\lfloor 16.3 \\rfloor = 16 \\to 15$", "$V_{ref} - \\Delta/2 = 7.75$ V")
# trap: SAR time, 12 bits at 2 MHz
assert cv.conversion_clocks("sar", 12) * F(1, 2) == 6
has("$12 \\times 0.5\\ \\mu\\text{s} = 6\\ \\mu$s")

# ── SAR traces ─────────────────────────────────────────────────────────────


def trace(n, vref, vin, off=False):
    r = cv.sar(n, vref, vin, off)
    return [(cv.bstr(s["trial"], n), cv.dec(s["v"], 6), s["keep"]) for s in r["steps"]], r


t, r = trace(3, 8, "5.3")
assert t == [("100", "4", True), ("110", "6", False), ("101", "5", True)] and r["code"] == 5 == cv.flash(3, 8, "5.3")["code"]
has("Clock 1: trial $100$, $V_{DAC} = 4$ V; $5.3 \\ge 4$, keep: $100$.", "Clock 2: trial $110$, $V_{DAC} = 6$ V; $5.3 < 6$, clear: $100$.",
    "Clock 3: trial $101$, $V_{DAC} = 5$ V; $5.3 \\ge 5$, keep: $101$.")
t, r = trace(4, 10, "6.4")
assert t == [("1000", "5", True), ("1100", "7.5", False), ("1010", "6.25", True), ("1011", "6.875", False)]
assert r["code"] == 10 and r["vq"] == F(25, 4) and r["err"] == fr("0.15") and r["errLsb"] == fr("0.24")
assert [s["range"] for s in r["steps"]][2] == (8, 12)                     # codes 8 to 11 before clock 3
has("Clock 1: $1000 \\to 5$ V; $6.4 \\ge 5$, keep. Clock 2: $1100 \\to 7.5$ V; $6.4 < 7.5$, clear.",
    "Clock 3: $1010 \\to 6.25$ V; $6.4 \\ge 6.25$, keep. Clock 4: $1011 \\to 6.875$ V; $6.4 < 6.875$, clear.",
    "Code $1010 = 10$, $V_q = 6.25$ V, error $0.15$ V $= 0.24$ LSB", "\\lfloor 10.24 \\rfloor = 10")
t, r = trace(8, "5.12", "3.37")
assert t == [("10000000", "2.56", True), ("11000000", "3.84", False), ("10100000", "3.2", True), ("10110000", "3.52", False),
             ("10101000", "3.36", True), ("10101100", "3.44", False), ("10101010", "3.4", False), ("10101001", "3.38", False)]
assert r["code"] == 168 and cv.conversion_clocks("sar", 8) == 8
r2 = cv.sar(8, "5.12", "3.37", True)
diff = [k for k, (a, b) in enumerate(zip(r["steps"], r2["steps"])) if a["keep"] != b["keep"]]
assert diff == [7] and r2["code"] == 169                                    # only the last decision differs
has("$1000\\,0000 \\to 2.56$ keep; $1100\\,0000 \\to 3.84$ clear; $1010\\,0000 \\to 3.20$ keep; $1011\\,0000 \\to 3.52$ clear.",
    "$1010\\,1000 \\to 3.36$ keep; $1010\\,1100 \\to 3.44$ clear; $1010\\,1010 \\to 3.40$ clear; $1010\\,1001 \\to 3.38$ clear.",
    "8 clocks $\\times 1\\ \\mu$s $= 8\\ \\mu$s.")
t, r = trace(4, 10, "6.6")
assert [x[2] for x in t] == [True, False, True, False] and r["code"] == 10 and r["err"] == fr("0.35") and r["errLsb"] == fr("0.56")
t, r = trace(4, 10, "6.6", True)
assert t == [("1000", "4.6875", True), ("1100", "7.1875", False), ("1010", "5.9375", True), ("1011", "6.5625", True)]
assert r["code"] == 11 and r["vq"] == fr("6.875") and r["err"] == fr("-0.275") and r["errLsb"] == fr("-0.44")
assert fr("6.6") / fr("0.625") == fr("10.56") and cv.ideal_code(4, 10, "6.6", True) == 11
has("No offset: $5$ keep, $7.5$ clear, $6.25$ keep, $6.875$ clear: $1010 = 10$ ($6.25$ V, error $0.35$ V $= 0.56$ LSB).",
    "With offset: $4.6875$ keep, $7.1875$ clear, $5.9375$ keep, $6.5625$ **keep**: $1011 = 11$.",
    "$\\lfloor 11.06 \\rfloor = 11$; $V_q = 6.875$ V, error $-0.275$ V $= -0.44$ LSB.")
t, r = trace(4, 16, 10)
assert t == [("1000", "8", True), ("1100", "12", False), ("1010", "10", True), ("1011", "11", False)] and r["code"] == 10 and r["err"] == 0


def strict_sar(n, vref, vin):  # a comparator that clears on a tie (keeps only when V_in > V_DAC)
    q, code = cv.lsb(n, vref), 0
    for k in range(n - 1, -1, -1):
        if fr(vin) > (code | 1 << k) * q:
            code |= 1 << k
    return code


assert strict_sar(4, 16, 10) == 9 and strict_sar(4, 16, "10.5") == cv.sar(4, 16, "10.5")["code"]
has("$1000 \\to 8$ keep; $1100 \\to 12$ clear; $1010 \\to 10$: a **tie**, $10 \\ge 10$, keep; $1011 \\to 11$ clear.",
    "Strict: $8$ keep, $12$ clear, $10$ clear, $1001 \\to 9$ keep: result $1001 = 9$, error $1$ V $= 1$ LSB.")
# SAR theorem: the trial is the midpoint of the open interval and the result is the floor (all n ≤ 6, quarter-LSB grid)
for n in range(1, 7):
    for tq in range(0, 4 * 2 ** n + 4):
        vin = cv.lsb(n, 8) * F(tq, 4)
        r = cv.sar(n, 8, vin)
        for s in r["steps"]:
            lo, hi = s["range"]
            assert s["trial"] == (lo + hi) // 2 and lo <= cv.ideal_code(n, 8, vin) < hi
        assert r["code"] == cv.ideal_code(n, 8, vin)

# ── Practice ───────────────────────────────────────────────────────────────
ov = bl.option_values
q1 = P["nx-dl-07-02-q01"]
v1 = {k: fr(t.split()[0]) for k, t in ov(q1).items()}
assert v1["A"] == 10 and v1["C"] == cv.dac_ideal(4, 14, 10) and v1["D"] == cv.dac_ideal(4, 17, 10)
bl.assert_mcq(q1, bl.which(ov(q1), lambda t: fr(t.split()[0]) == cv.dac_ideal(4, 0b1111, 10))[0])

bl.assert_nat(P["nx-dl-07-02-q02"], cv.flash(6, 1, 0)["comparators"])
assert cv.flash(6, 1, 0)["resistors"] == 64

q3 = P["nx-dl-07-02-q03"]
tclk = F(1, 4)                                                              # μs at 4 MHz
v3 = {k: fr(t.split()[0]) for k, t in ov(q3).items()}
assert v3["A"] == cv.conversion_clocks("counter", 12) * tclk and v3["B"] == 12 and v3["D"] == cv.conversion_clocks("flash", 12) * tclk
bl.assert_mcq(q3, bl.which(ov(q3), lambda t: fr(t.split()[0]) == cv.conversion_clocks("sar", 12) * tclk)[0])

X = lad(4, 0b1010, 8, 1, 1)
outs = {lad(4, c, 8, 1, 1)["iout"] for c in range(16)}
st4 = {"A": all(lad(4, c, 8, 1, 1)["iref"] == 8 for c in range(16)), "B": X["volts"][-1] == 1,
       "C": len(outs) == 1, "D": X["vo"] == -5}
assert X["legs"] == [4, 2, 1, F(1, 2)] and X["iout"] == 5
bl.assert_msq(P["nx-dl-07-02-q04"], [k for k, v in st4.items() if v])

q5 = P["nx-dl-07-02-q05"]
r5 = cv.sar(4, 8, "5.3")
want = f"Trials {', '.join(cv.bstr(s['trial'], 4) for s in r5['steps'])}; result {cv.bstr(r5['code'], 4)}"
assert want == "Trials 1000, 1100, 1010, 1011; result 1010"
bl.assert_mcq(q5, bl.which(ov(q5), lambda t: t == want)[0])
assert cv.sar(4, 8, "3.9")["steps"][0]["keep"] is False                     # C is the trace of an input below 4 V
assert [cv.bstr(s["trial"], 4) for s in cv.sar(4, 8, "2.6")["steps"]] == ["1000", "0100", "0110", "0101"]

q6 = P["nx-dl-07-02-q06"]
bl.assert_nat(q6, cv.ideal_code(8, "2.56", "1.237", True))
assert cv.ideal_code(8, "2.56", "1.237") == 123 and cv.sar(8, "2.56", "1.237", True)["code"] == 124
assert cv.sar(8, "2.56", "1.237", True)["errLsb"] == fr("-0.3")

q7 = P["nx-dl-07-02-q07"]
w7 = cv.weighted(8, 1, 1, 2, 1)
bl.assert_mcq(q7, bl.which(ov(q7), lambda t: t == f"{w7['resistors'][-1]} kΩ; ratio {w7['spread']}")[0])
assert ov(q7)["A"] == "512 kΩ; ratio 256" and ov(q7)["D"] == "128 kΩ; ratio 64"

st8 = {"A": cv.flash(8, 1, 0)["comparators"] == 255,
       "B": len({cv.counter_adc(4, 8, v)["clocks"] for v in (0, 3, 7)}) == 1,
       "C": all(0 <= cv.sar(6, 8, cv.lsb(6, 8) * F(t, 3))["errLsb"] < 1 for t in range(3 * 64)),
       "D": cv.dual_slope(1000, 2, 1)["count"] == 500}
bl.assert_msq(P["nx-dl-07-02-q08"], [k for k, v in st8.items() if v])

mcq = [P[k]["answer"] for k in sorted(P) if k.startswith("nx-dl-07-02-") and P[k]["type"] == "MCQ"]
assert sorted(set(mcq)) == ["B", "C"] and max(mcq.count(x) for x in mcq) <= 2
ids = set(re.findall(r"\{#([a-z0-9-]+)", L))
mine = [k for k in P if k.startswith("nx-dl-07-02-")]
assert len(mine) == 8 and {P[k]["type"] for k in mine} == {"MCQ", "MSQ", "NAT"}
for k in mine:
    assert set(P[k]["blocks"]) <= ids, (k, set(P[k]["blocks"]) - ids)
print("l7_02_converters: DAC steps and full scale, weighted DAC (n ≤ 8, all codes), R-2R ladder by nodal analysis (n ≤ 8, all codes) "
      "and the C 397 erratum, voltage-mode ladder, ADC codes, flash, counter, dual slope, 6 SAR traces (+ the tie and the theorem "
      "for n ≤ 6), and 8 practice answers OK")
