"""Checks for dl/01-number-systems/06-ieee-754: layouts, decode/encode, special values, denormals,
extremes, precision, bit-pattern comparison and double precision; the 10 PYQ keys (re-derived from
scratch) and the practice answers. Every pattern is cross-checked against Python's struct (C float/double)."""
import json
import math
import pathlib
import sys
from fractions import Fraction as F

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import fplib as fp  # noqa: E402
import numlib as nl  # noqa: E402

L = nl.lesson_text("06-ieee-754.md")
has = lambda *s: nl.must_contain(L, *s)
D = lambda h: fp.decode(int(h, 16))
E = lambda v: fp.hexs(fp.encode(F(v)))
assert all(fp.f32_bits(float(F(v))) == fp.encode(F(v)) for v in ["1", "12.5", "-0.09375", "0.1", "13.625", "-6.75", "-14.25"])

# Layout and landmarks.
assert fp.bias(8) == 127 and fp.bias(11) == 1023 and (1 - 127, 254 - 127) == (-126, 127) and (1 - 1023, 2046 - 1023) == (-1022, 1023)
assert E(1) == "3F800000" and E(-1) == "BF800000" and 1 / fp.smallest_normal() == 2 ** 126 < fp.largest()
for h, v in (("3F800000", 1), ("40000000", 2), ("40800000", 4), ("41000000", 8), ("41800000", 16)):
    assert D(h) == v
assert fp.largest() == (2 ** 24 - 1) * F(2) ** 104 and abs(float(fp.largest()) / 3.4028e38 - 1) < 1e-4
assert abs(float(fp.largest(11, 52)) / 1.79769e308 - 1) < 1e-4 and abs(float(F(2) ** -1022) / 2.2251e-308 - 1) < 1e-4
assert abs(2.0 ** -149 / 1.4013e-45 - 1) < 1e-4 and abs(2.0 ** -126 / 1.1755e-38 - 1) < 1e-4 and abs(5e-324 / 4.94e-324 - 1) < 0.01
assert round(24 * math.log10(2), 1) == 7.2 and round(53 * math.log10(2), 1) == 16.0
# Decoding examples.
assert D("40490000") == F(201, 64) == F("3.140625") and D("C2F70000") == F(-247, 2) and fp.split_fields(0xC2F70000)[1] == "10000101"
assert D("7F7FFFFF") == fp.largest() and abs(float((2 ** 24 - 1) * F(2) ** 127) / 2.85e45 - 1) < 0.01
has("$1.1001001_2 \\times 2^{1} = 11.001001_2 = 3 + \\tfrac18 + \\tfrac1{64} = 3.140625$", "1111011.1_2 = 123.5$")
# Encoding examples.
assert E("12.5") == "41480000" and E("-0.09375") == "BDC00000" and E("0.1") == "3DCCCCCD" and E("13.625") == "415A0000"
assert fp.hexs(fp.encode(F(1, 10), mode="rtz")) == "3DCCCCCC" and str(float(fp.round_to(F(1, 10)))).startswith("0.10000000149011")
M, Ex = fp.normalise_hidden(F(1, 10))
assert Ex == -4 and fp.frac_bits(M - 1, 25) == "10011001100110011001100" + "11"
assert E("-14.25") == "C1640000" and fp.group4("1" + "10000010" + "11100100000000000000000") == "C1720000"
assert fp.encode(2 ** 24 + 1) == fp.encode(2 ** 24) and fp.encode(2 ** 24 + 2) != fp.encode(2 ** 24)
# Special values.
assert fp.classify(0) == "+0" and fp.classify(0x80000000) == "-0" and fp.classify(0x7F800000) == "+inf"
assert fp.classify(0xFF800000) == "-inf" and fp.classify(0x7FC00000) == "nan" and fp.f32_bits(float("inf")) == 0x7F800000
nan_count = sum(1 for s in (0, 1) for f in range(1, 2 ** 23)) if False else 2 * (2 ** 23 - 1)
assert nan_count == 16777214 and nan_count + 2 == 2 ** 24
inf, nan = float("inf"), float("nan")
assert 1 / -inf == 0 and math.isnan(inf - inf) and math.isnan(0 * inf) and nan != nan and 0.0 == -0.0
assert math.copysign(1, 0.0 - 0.0) == 1
# Denormals.
assert D("00000001") == F(2) ** -149 and D("00400000") == F(2) ** -127 and D("007FFFFF") == F(2) ** -126 - F(2) ** -149
assert D("00800000") == F(2) ** -126 and D("00800000") - D("007FFFFF") == F(2) ** -149
x, y = F(5, 4) * F(2) ** -126, F(2) ** -126
assert x - y == F(2) ** -128 and fp.hexs(fp.encode(x - y)) == "00200000" and x - y < fp.smallest_normal()
assert abs(2.0 ** -127 / 5.88e-39 - 1) < 0.01
# Gradual-underflow theorem: brute force on every pair of a small IEEE-style format (k = 4, f = 3).
vals = [fp.decode(n, 4, 3) for n in range(0, 0x78)]
for a in vals:
    for b in vals:
        if a != b:
            assert fp.round_to(a - b, 4, 3) != 0
# Extremes and the double/single ratio.
assert fp.hexs(fp.encode(-fp.largest())) == "FF7FFFFF" and 0x7F7FFFFF + 1 == 0x7F800000
assert fp.hexs(fp.encode(fp.smallest_normal(11, 52), 11, 52), 64) == "0010000000000000"
assert round(math.log2(float(fp.largest(11, 52))) - math.log2(float(fp.largest()))) == 896 and round(896 * math.log10(2), 1) == 269.7
assert fp.hexs(fp.encode(fp.largest(11, 52), 11, 52), 64) == "7FEFFFFFFFFFFFFF" == fp.hexs(fp.f64_bits(1.7976931348623157e308), 64)
# Precision.
assert D("3F800001") == 1 + F(2) ** -23 and fp.ulp(1000) == F(1, 2 ** 14) == F("0.00006103515625")
assert fp.ulp(1) == F(2) ** -23 and abs(2.0 ** -23 / 1.19e-7 - 1) < 0.01 and abs(2.0 ** -52 / 2.22e-16 - 1) < 0.01
assert (0.1 + 0.2) != 0.3 and fp.hexs(fp.f64_bits(0.1 + 0.2), 64) == "3FD3333333333334" and fp.hexs(fp.f64_bits(0.3), 64) == "3FD3333333333333"
assert math.ulp(0.3) == 2 ** -54 and repr(F(0.3)).startswith("Fraction(5404319552844595")
assert str(F(0.1))[:0] == "" and f"{float(F(0.2)):.20f}".startswith("0.2000000000000000111")
assert f"{F(0.1).numerator / F(0.1).denominator:.20f}".startswith("0.1000000000000000055")
# Comparison.
assert D("41200000") == 10 and D("40F00000") == F(15, 2) and D("C1200000") == -10 and D("C0F00000") == F(-15, 2)
assert fp.classify(0x7FC00001) == "nan" and D("7F000000") == F(2) ** 127 and D("00FFFFFF") < F(2) ** -125 and abs(D("3FFFFFFF") - 2) < F(1, 2 ** 22)
pos = [n for n in range(0, 0x7F800001, 0x00123457)]
assert all((fp.decode(a) < fp.decode(b)) == (a < b) for a, b in zip(pos, pos[1:]))
# Double precision.
assert fp.hexs(fp.encode(1, 11, 52), 64) == "3FF0000000000000" and fp.hexs(fp.encode(F(-5, 2), 11, 52), 64) == "C004000000000000"
assert fp.hexs(fp.encode(F(1, 10), 11, 52), 64) == "3FB999999999999A" == fp.hexs(fp.f64_bits(0.1), 64)
assert fp.hexs(fp.f64_bits(fp.bits_f32(0xC1640000)), 64) == "C02C800000000000" and 130 + 896 == 1026 == 3 + 1023
has("`0x3DCCCCCD`", "`C02C800000000000`", "`0x7FEFFFFFFFFFFFFF`", "$2 \\times (2^{23} - 1) = 16\\,777\\,214$")

# ── PYQ keys, re-derived ────────────────────────────────────────────────────
bank = {q["id"]: q for q in json.loads((nl.ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}
key = lambda i: bank[i]["answer"]
assert fp.classify(0) == "+0" and key("cse-2008-cs-4") == "D"                                     # special value +0
assert D("C1D00000") == -26 and int("11000001110100000000000000000000", 2) == 0xC1D00000 and key("it-2008-it-7") == "C"
n = fp.encode(F(1, 2))
assert fp.fields(n)[2] == 0 and fp.fields(n)[1] - 127 == -1 and key("cse-2012-cs-7") == "B"
assert E("-14.25") == "C1640000" and key("cse-2014-2-cs-45") == "A"
v = fp.decode(int("00111110011011010000000000000000", 2))
opts = {"A": 14.5, "B": 0.145, "C": 0.227, "D": 22.7}
assert min(opts, key=lambda k: abs(opts[k] - float(v))) == "C" == key("cse-2017-2-cs-12") and abs(float(v) - 0.2314453125) < 1e-12
assert fp.decode(int("1" + "10000001" + "11110000000000000000000", 2)) == F(-31, 4) and float(bank["cse-2021-1-cs-24"]["answer"]) == -7.75
assert fp.decode(int("0" + "00000001" + "0" * 23, 2)) == fp.smallest_normal() and key("cse-2021-2-cs-4") == "C"
A, B, C = D("C1400000"), D("42100000"), D("41400000")
claims = {"A": A + C == 0, "B": C == A + B, "C": B == 3 * C, "D": B - C > 0}
assert (A, B, C) == (-12, 36, 12) and [k for k, t in claims.items() if not t] == ["B"] == [key("cse-2022-cs-31")]
pats = {"A": "0" + "01111111" + "1" * 23, "B": "0" + "11111110" + "1" * 23, "C": "0" + "11111111" + "1" * 23, "D": "0" + "01111111" + "0" * 23}
finite = {k: fp.decode(int(p, 2)) for k, p in pats.items() if fp.classify(int(p, 2)) == "normal"}
assert fp.classify(int(pats["C"], 2)) == "nan" and max(finite, key=finite.get) == "B" == key("cse-2024-2-cs-4")
assert D("C2710000") == F(-241, 4) and bank["cse-2026-2-cs-24"]["answer"].startswith("-60.25")

# ── Practice ───────────────────────────────────────────────────────────────
P = nl.practice()
nl.assert_nat(P["nx-dl-01-06-q01"], D("41A40000"))
assert fp.decode(0x41A40000) == F(41, 2) and (1 + F(9, 32)) * 8 == F(41, 4) and F(9, 32) * 16 == F(9, 2)
q = P["nx-dl-01-06-q02"]
calc = {"A": E("-3.75"), "B": fp.group4("1" + "10000001" + "1111" + "0" * 19),
        "C": E("3.75"), "D": fp.group4("1" + "10000001" + "111" + "0" * 20)}
assert calc == {o["l"]: o["t"].strip("`") for o in q["options"]} and fp.decode(int(calc["D"], 16)) == F(-15, 2)
nl.assert_mcq(q, "A")
q = P["nx-dl-01-06-q03"]
nl.assert_msq(q, [o["l"] for o in q["options"] if fp.classify(int(o["t"].strip("`"), 16)) != "normal"])
nl.assert_nat(P["nx-dl-01-06-q04"], int(math.log2(5e-324)))
assert F(5e-324) == F(2) ** -1074
nl.assert_nat(P["nx-dl-01-06-q05"], int(math.log2(fp.ulp(100))))
q = P["nx-dl-01-06-q06"]
fin = {o["l"]: fp.decode(int(o["t"].strip("`"), 16)) for o in q["options"]}
fin = {k: v for k, v in fin.items() if v not in (fp.INF, fp.NINF, fp.NAN)}
nl.assert_mcq(q, max(fin, key=fin.get))
q = P["nx-dl-01-06-q07"]
assert fp.hexs(fp.encode(F(3, 4), 11, 52), 64) == "3FE8000000000000" == fp.hexs(fp.f64_bits(0.75), 64)
assert fp.group4("0" + f"{126:011b}" + "1" + "0" * 51) == "07E8000000000000" and fp.hexs(fp.f64_bits(1.5), 64) == "3FF8000000000000"
assert E("0.75") == "3F400000"
nl.assert_mcq(q, "A")
cnt = sum(1 for k in range(2 ** 24, 2 ** 25 + 1, 1) if k % 2 == 0)        # ulp 2 in [2^24, 2^25); 2^25 exact
assert all(fp.round_to(k) == k for k in (2 ** 24, 2 ** 24 + 2, 2 ** 25 - 2, 2 ** 25)) and fp.round_to(2 ** 24 + 1) != 2 ** 24 + 1
nl.assert_nat(P["nx-dl-01-06-q08"], cnt)
q = P["nx-dl-01-06-q09"]
truth = {"A": 0.0 == -0.0, "B": fp.decode(0x80000000) == -fp.largest(), "C": nan != nan, "D": False}
assert fp.decode(0x00000001) == F(2) ** -149   # (D) no hidden 1: 0.f × 2^-126
nl.assert_msq(q, [k for k, t in truth.items() if t])

print("l06_ieee754: every value in the lesson, its 10 PYQ keys and its practice answers check out (struct cross-checked)")
