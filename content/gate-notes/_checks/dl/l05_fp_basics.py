"""Checks for dl/01-number-systems/05-floating-point-basics: fixed vs floating point, normalisation,
biased exponents, custom formats (encode/decode), range and ulp; the 7 PYQ keys (re-derived from
scratch) and the practice answers. Exact arithmetic throughout (fplib, Fraction)."""
import json
import math
import pathlib
import sys
from fractions import Fraction as F

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import fplib as fp  # noqa: E402
import numlib as nl  # noqa: E402

L = nl.lesson_text("05-floating-point-basics.md")
has = lambda *s: nl.must_contain(L, *s)


def toy(n):
    """The lesson's 8-bit toy format: sign | exponent (4, bias 7) | fraction (3, hidden 1), no reserved fields."""
    s, e, f = n >> 7, (n >> 3) & 15, n & 7
    return (-1) ** s * (1 + F(f, 8)) * F(2) ** (e - 7)


# ── Why floating point ──────────────────────────────────────────────────────
assert 2 ** 8 - F(1, 2 ** 8) == F("255.99609375") and F(1, 2 ** 8) == F("0.00390625")
assert fp.largest(5, 10) == 65504 and fp.smallest_normal(5, 10) == F(1, 2 ** 14)
assert round(255.99609375 / 0.00390625) == 65535 and round(65504 * 16384 / 1e9, 1) == 1.1
assert 1.1e9 / 6.6e4 > 16000 and abs(F(1, 2 ** 8) / F(1, 100) - F(39, 100)) < F(1, 100)
assert fp.ulp(F(1, 100), 5, 10) == F(1, 2 ** 17) and 2 ** -17 < 1e-5 < 2 ** -16
has("$2^8 - 2^{-8} = 255.99609375$", "$2^{-8} = 0.00390625$", "65504 \\times 16384 \\approx 1.1 \\times 10^9")
q = int(F(1, 1000) * 2 ** 16 + F(1, 2))
assert q == 66 and F(66, 2 ** 16) == F("0.001007080078125")
assert abs(float((F(66, 65536) - F(1, 1000)) / F(1, 1000)) - 0.00708) < 1e-5
assert fp.hexs(fp.encode(F(1, 1000))) == "3A83126F" == fp.hexs(fp.f32_bits(0.001))
v = fp.round_to(F(1, 1000))
rel = abs((v - F(1, 1000)) / F(1, 1000))
assert str(float(v)).startswith("0.0010000000474974513") and 4.7e-8 < rel < 4.8e-8 < 2 ** -24 < 6.0e-8
assert 140000 < float(F(66, 65536) - F(1, 1000)) / float(v - F(1, 1000)) < 160000
has("`0x3A83126F`", "$66 / 65536 = 0.001007080078125$", "0.708\\,\\%")
# Sensor design.
assert 2 ** -30 <= 1e-9 < 2 ** -29 and 2 ** 20 == 1048576 > 1e6 and 2 ** -20 <= 1e-6 < 2 ** -19
assert 2 ** -10 <= 1e-3 < 2 ** -9 and len(range(-20, 20)) == 40 and 2 ** 5 < 40 <= 2 ** 6
assert 20 + 29 == 49 and 6 + 9 == 15
has("Total $20 + 29 = 49$ bits", "$6 + 9 = 15$ bits")
assert 2 ** 23 == 8388608
# Fixed vs float ranges.
assert math.isclose(2.0 ** 254, 10 ** 76.46, rel_tol=1e-2) and 2.0 ** -24 < 6e-8

# ── Normalisation ───────────────────────────────────────────────────────────
assert fp.binary(F(53, 4), 2) == "1101.01" and fp.normalise_hidden(F(53, 4)) == (F(53, 32), 3)
assert fp.normalise_fraction_form(F(53, 4)) == (F(53, 64), 4) and fp.frac_bits(F(53, 64), 6) == "110101"
assert F(53, 32) * 8 == F(53, 4) and float(F(53, 32)) == 1.65625 and float(F(53, 64)) == 0.828125
assert fp.binary(F(5, 64), 6) == "0.000101" and fp.normalise_hidden(F(5, 64)) == (F(5, 4), -4)
assert fp.normalise_fraction_form(F(5, 64)) == (F(5, 8), -3)
a = F(179, 8)
M, E = fp.normalise_fraction_form(a)
assert fp.binary(a, 3) == "10110.011" and E == 5 and fp.frac_bits(M, 8) == "10110011"
assert F(int(fp.frac_bits(M, 5), 2), 32) * 2 ** E == 22
assert fp.normalise_fraction_form(F(5, 64), 16) == (F(5, 64), 0) and F(5, 64) == F(0x14, 256)
assert fp.normalise_fraction_form(F(1, 64), 16) == (F(1, 4), -1) and F(1, 4) == F(4, 16)
assert F(3, 16) * 32 == 6 and F(3, 4) * 8 == 6 and F(3, 2) * 4 == 6
has("$0.0011 \\times 2^{5} = 0.1875 \\times 32 = 6$", "$13.25 = 1.10101_2 \\times 2^3 = 0.110101_2 \\times 2^4$",
    "$1.01_2 \\times 2^{-4} = 0.101_2 \\times 2^{-3}$", "$0.14_{16} \\times 16^0$ and $0.4_{16} \\times 16^{-1}$")

# ── Exponent codes ──────────────────────────────────────────────────────────
assert f"{3 + 127:08b}" == "10000010" and f"{-3 + 127:08b}" == "01111100"
assert (3 - 8, 3 - 7) == (-5, -4)
assert 0b1000011 - 64 == 3 and 0b0111110 - 64 == -2 and 16 ** 3 == 2 ** 12 and F(1, 16 ** 2) == F(1, 2 ** 8)
assert fp.twos_bits(-1, 8) == "11111111" and fp.twos_bits(1, 8) == "00000001" and (-1 + 127, 1 + 127) == (126, 128)
# Bias ranges, and the order theorem by brute force for a 4-bit-exponent toy format.
assert (0 - 8, 15 - 8, 0 - 7, 15 - 7) == (-8, 7, -7, 8)
for k in range(2, 9):
    pats = list(range(2 ** k))
    assert sorted(pats, key=lambda e: e - 2 ** (k - 1)) == pats
    tw = [p - 2 ** k if p >= 2 ** (k - 1) else p for p in pats]
    assert any(tw[i] > tw[i + 1] for i in range(len(tw) - 1))      # 2's complement breaks the order
vals = [fp.decode(n, 4, 3) for n in range(0, 0x78)]
assert all(vals[i] < vals[i + 1] for i in range(len(vals) - 1))      # sign 0: value order = pattern order

# ── Custom formats ──────────────────────────────────────────────────────────
assert (1 + F(3, 8)) * 2 ** (9 - 7) == F(11, 2) == toy(0b01001011)
M, E = fp.normalise_hidden(F(-3, 8))
w = "1" + f"{E + 31:06b}" + fp.frac_bits(M - 1, 9)
assert (M, E, E + 31) == (F(3, 2), -2, 29) and fp.group4(w) == "BB00" and -(1 + F(256, 512)) * F(2) ** (29 - 31) == F(-3, 8)
M, E = fp.normalise_fraction_form(F(43, 2), 16)
fr = fp.frac_bits(M, 24)
w = "0" + fr + f"{E + 64:07b}"
assert (E, hex(int(fr, 2)), f"{E + 64:07b}") == (2, "0x158000", "1000010") and fp.group4(w) == "0AC00042"
M, E = fp.normalise_fraction_form(F(-5, 32))
w = fp.twos_bits(E, 8) + "1" + fp.frac_bits(M, 23)
assert (M, E) == (F(5, 8), -2) and fp.group4(w) == "FED00000"
has("`BB00`", "`0AC00042`", "`FED00000`", "$1\\ 011101\\ 100000000 = 1011\\,1011\\,0000\\,0000")
# Truncation vs rounding of 9.75 (1997).
M, E = fp.normalise_fraction_form(F(39, 4))
assert fp.frac_bits(M, 6) == "100111" and F(0b10011, 32) * 16 == F(19, 2) and F(0b10100, 32) * 16 == 10

# ── Range and gaps ──────────────────────────────────────────────────────────
toys = sorted(toy(n) for n in range(128))
assert toys[-1] == (2 - F(1, 8)) * 2 ** 8 == 480 == toy(0b01111111) and toys[0] == F(1, 2 ** 7) == F("0.0078125")
assert 2 ** (8 - 3) == 32 and toy(0b01111110) == 448 and toys[-1] - toys[-2] == 32
assert fp.ulp(1, 4, 3) == F(1, 8) and fp.ulp(2, 4, 3) == F(1, 4)
assert F(1, 2) * F(1, 2 ** 32) == F(1, 2 ** 33) and 1 - F(1, 2 ** 9) == F(511, 512)
assert F(1, 2 ** 6) * 2 ** 15 == 2 ** 9 and F(1, 2 ** 6) * F(1, 2 ** 15) == F(1, 2 ** 21)
assert abs(252 * math.log10(2) - 75.86) < 0.01 and abs(float((1 - F(1, 16 ** 6)) * F(16) ** 63) / 7.237e75 - 1) < 1e-3
assert F(1, 16) * F(16) ** -64 == F(1, 16 ** 65) == F(1, 2 ** 260) and abs(2.0 ** -260 / 5.4e-79 - 1) < 0.01
assert round(24 * math.log10(2), 1) == 7.2 and round(53 * math.log10(2), 1) == 16.0 and round(11 * math.log10(2), 1) == 3.3
has("$2^{-6} \\times 2^{15} = 2^{9} = 512$", "$x_{\\min} = \\tfrac1{16} \\times 16^{-64} = 16^{-65} = 2^{-260} \\approx 5.4 \\times 10^{-79}$")

# ── PYQ keys, re-derived ────────────────────────────────────────────────────
bank = {q["id"]: q for q in json.loads((nl.ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}
# cse-1996-a-25: 24-bit SM mantissa (23 magnitude bits), normalised fraction → [0.5, 1 − 2^-23].
q = bank["cse-1996-a-25"]
lo, hi = F(1, 2), 1 - F(1, 2 ** 23)
assert q["answer"] == "D" and "0.5 to $(1-2^{-23})$" in q["options"][3]["t"]
# cse-1997-b-72-a: truncation into 5 magnitude bits.
q = bank["cse-1997-b-72-a"]
enc = {}
for name, v in (("A", F(219, 4)), ("B", F(39, 4))):
    M, E = fp.normalise_fraction_form(v)
    enc[name] = (fp.sm_bits(int(fp.frac_bits(M, 5), 2), 6), fp.sm_bits(E, 4), F(int(fp.frac_bits(M, 5), 2), 32) * 2 ** E)
assert enc == {"A": ("011011", "0110", 54), "B": ("010011", "0100", F(19, 2))}
assert "f = 0 11011, e = 0 110" in q["answer"] and "f = 0 10011, e = 0 100" in q["answer"] and "9.5" in q["answer"]
# cse-2002-b-57-a: −7.5, base 16, sign | fraction | excess-64 exponent.
M, E = fp.normalise_fraction_form(F(-15, 2), 16)
fr = fp.frac_bits(M, 24)
w = "1" + fr + f"{E + 64:07b}"
assert (hex(int(fr, 2)), E + 64) == ("0x780000", 65) and fp.group4(w) == "BC000041"
assert "BC000041H" in bank["cse-2002-b-57-a"]["answer"]
# cse-2002-b-57-b: largest ≈ 16^63 → nearest power of ten 10^76.
assert round(math.log10(float((1 - F(1, 16 ** 6)) * F(16) ** 63))) == 76 and "10^{76}" in bank["cse-2002-b-57-b"]["answer"]
# cse-2003-cs-43: max gap = 2^-9 · 2^(62 − 31) = 2^22 (e = 63 is reserved for zero).
gaps = [F(1, 2 ** 9) * F(2) ** (e - 31) for e in range(63)]
assert max(gaps) == 2 ** 22 and bank["cse-2003-cs-43"]["answer"] == "C" and bank["cse-2003-cs-43"]["options"][2]["t"] == "$2^{22}$"
# cse-2005-cs-85a/b: 0.239 × 2^13, sign | excess-64 exponent (7) | mantissa (8).
m = fp.frac_bits(F(239, 1000), 8)
wa = "0" + f"{13 + 64:07b}" + m
assert m == "00111101" and fp.group4(wa) == "4D3D" and bank["cse-2005-cs-85a"]["answer"] == "D"
assert bank["cse-2005-cs-85a"]["options"][3]["t"] == "4D 3D"
first = m.index("1") + 1                        # shift left until the first 1 is the hidden bit
wb = "0" + f"{13 - first + 64:07b}" + (m[first:] + "0" * first)
assert first == 3 and fp.group4(wb) == "4AE8" and bank["cse-2005-cs-85b"]["answer"] == "D"
assert (1 + F(int(m[first:], 2), 2 ** 5)) * 2 ** 10 == F(int(m, 2), 256) * 2 ** 13 == 1952   # same value, no bits lost
assert bank["cse-2005-cs-85b"]["options"][3]["t"] == "4A E8"
for k, t in zip("ABC", ["0A 20", "11 34", "49 D0"]):
    assert bank["cse-2005-cs-85b"]["options"]["ABC".index(k)]["t"] == t

# ── Practice ───────────────────────────────────────────────────────────────
P = nl.practice()
nl.assert_nat(P["nx-dl-01-05-q01"], toy(0b11010101))
assert -(F(5, 8) * 8) == -5 and -(F(13, 8) * 4) == F(-13, 2)
q = P["nx-dl-01-05-q02"]
nl.assert_mcq(q, "B")
assert fp.normalise_fraction_form(F(3, 16)) == (F(3, 4), -2) and fp.normalise_hidden(F(3, 16)) == (F(3, 2), -3)
nl.assert_nat(P["nx-dl-01-05-q03"], -5 + 127)
assert -5 + 128 == 123 and int(fp.twos_bits(-5, 8), 2) == 251
q = P["nx-dl-01-05-q04"]
M, E = fp.normalise_hidden(F(21, 2))
opts = {
    "A": "0" + f"{E + 16:05b}" + fp.frac_bits(M - 1, 10),
    "B": "0" + f"{E + 16:05b}" + fp.frac_bits(M / 2, 10),
    "C": "0" + f"{E + 15:05b}" + fp.frac_bits(M - 1, 10),
    "D": "0" + f"{E + 1 + 16:05b}" + fp.frac_bits(M / 2, 10),
}
assert {k: fp.group4(v) for k, v in opts.items()} == {o["l"]: o["t"].strip("`") for o in q["options"]}
nl.assert_mcq(q, "A")
nl.assert_nat(P["nx-dl-01-05-q05"], 126 - 63 - 8)
assert -8 - 63 == -71
q = P["nx-dl-01-05-q06"]
truth = {"A": (0 - 32, 63 - 32) == (-32, 31), "B": 0 - 31 == -31,
         "C": int(fp.twos_bits(-1, 6), 2) > int(fp.twos_bits(1, 6), 2), "D": (32 + 31).bit_length() > 6}
nl.assert_msq(q, [k for k, t in truth.items() if t])
q = P["nx-dl-01-05-q07"]
M, E = fp.normalise_fraction_form(F(-3, 8), 16)
words = {
    "A": "1" + f"{E + 64:07b}" + fp.frac_bits(M, 24),
    "B": "1" + f"{E - 1 + 64:07b}" + fp.frac_bits(M, 24),
    "C": "1" + f"{fp.normalise_fraction_form(F(3, 8))[1] + 64:07b}" + fp.frac_bits(fp.normalise_fraction_form(F(3, 8))[0], 24),
    "D": "0" + f"{E + 64:07b}" + fp.frac_bits(M, 24),
}
assert (M, E) == (F(3, 8), 0)
assert {k: fp.group4(v) for k, v in words.items()} == {o["l"]: o["t"].strip("`") for o in q["options"]}
nl.assert_mcq(q, "A")
nl.assert_nat(P["nx-dl-01-05-q08"], -1 + -128)
q = P["nx-dl-01-05-q09"]
M, E = fp.normalise_fraction_form(F(59, 2))
stored = F(int(fp.frac_bits(M, 5), 2), 32) * 2 ** E
assert fp.frac_bits(M, 6) == "111011" and E == 5 and stored == 29
assert F(0b11110, 32) * 2 ** E == 30
nl.assert_mcq(q, {28: "A", 29: "B", F(59, 2): "C", 30: "D"}[stored])

print("l05_fp_basics: every value in the lesson, its 7 PYQ keys and its practice answers check out")
