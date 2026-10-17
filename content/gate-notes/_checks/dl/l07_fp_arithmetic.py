"""Checks for dl/01-number-systems/07-floating-point-arithmetic: rounding modes and G/R/S, addition,
absorption and non-associativity, multiplication/division, overflow/underflow; the 8 PYQ keys
(re-derived from scratch) and the practice answers. fplib's exact IEEE arithmetic is cross-checked
against Python's own float arithmetic rounded to float32 (fp.f32) wherever both apply."""
import json
import pathlib
import sys
from fractions import Fraction as F

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import fplib as fp  # noqa: E402
import numlib as nl  # noqa: E402

L = nl.lesson_text("07-floating-point-arithmetic.md")
has = lambda *s: nl.must_contain(L, *s)
D = lambda h: fp.decode(int(h, 16))
H = lambda v: fp.hexs(fp.encode(v))

# Rounding.
assert fp.round_to(F(45, 32), 4, 3) == F(11, 8) and float(F(45, 32)) == 1.40625 and F(45, 32) - F(11, 8) == F(1, 32) < F(1, 16)
assert fp.round_to(F(21, 16), 4, 3) == F(5, 4) and fp.round_to(F(23, 16), 4, 3) == F(3, 2)
M, E = fp.normalise_hidden(F(1, 3))
bits = fp.frac_bits(M - 1, 26)
assert E == -2 and fp.grs(bits, 23)[1:] == (1, 0, 1) and H(F(1, 3)) == "3EAAAAAB" == fp.hexs(fp.f32_bits(1 / 3))
assert fp.hexs(fp.encode(F(1, 3), mode="rtz")) == "3EAAAAAA"
modes = [fp.round_to(F(-21, 16), 4, 2, m) for m in ("rne", "rtz", "up", "down")]
assert modes == [F(-5, 4), F(-5, 4), F(-5, 4), F(-3, 2)]
for kept, ex in (("10110", "101"), ("10110", "1001"), ("10110", "100")):
    v = F(int(kept + ex, 2), 2 ** (4 + len(ex)))
    assert fp.round_to(v, 4, 4) == (F(int(kept, 2), 16) if ex == "100" else F(int(kept, 2) + 1, 16))
# Every G/R/S decision agrees with exact rounding (brute force over 4 kept + 6 extra bits).
for n in range(2 ** 10):
    s = f"{n:010b}"
    kept, ex = "1" + s[:4], s[4:]
    v = F(int(kept + ex, 2), 2 ** 10)
    up = fp.rne_from_grs(kept, *fp.grs(ex, 0)[1:])
    assert fp.round_to(v, 5, 4) == F(int(kept, 2) + up, 16)
# Addition.
assert fp.add(F(5, 2), F(3, 4)) == F(13, 4) and fp.add(6, 3) == 9 and fp.add(12, F(5, 2)) == F(29, 2)
assert H(fp.add(D("41A00000"), D("C1000000"))) == "41400000" and D("41A00000") == 20 and D("C1000000") == -8
assert fp.add(1, F(1, 2 ** 24)) == 1 and fp.add(1, F(1, 2 ** 24) + F(1, 2 ** 47)) == 1 + F(1, 2 ** 23)
assert fp.add(7, F(13, 8), 4, 4) == F(17, 2) and 7 + F(13, 8) == F(69, 8)
# Absorption and order.
assert fp.add(2 ** 24, 1) == 2 ** 24 and fp.add(fp.add(2 ** 24, 1), 1) == 2 ** 24 and fp.add(2 ** 24, 2) == 2 ** 24 + 2
assert fp.ulp(2 * F(10) ** 30) == F(2) ** 77 and abs(2.0 ** 77 / 1.5e23 - 1) < 0.01
x = fp.round_to(F(10) ** 20)
assert fp.ulp(x) == F(2) ** 43 and fp.add(fp.add(x, -x), 3) == 3 and fp.add(x, fp.add(-x, 3)) == 0
assert fp.dec_round(fp.dec_round(224 - 221, 3) + F(437, 100), 3) == F(737, 100)
assert fp.dec_round(-221 + F(437, 100), 3) == -217 and fp.dec_round(224 - 217, 3) == 7
s = F(0)
for _ in range(10):
    s = fp.add(s, fp.round_to(F(1, 10)))
t = 0.0
for _ in range(10):
    t = fp.f32(t + fp.f32(0.1))
assert s == F(t) == 1 + F(1, 2 ** 23) and H(s) == "3F800001"
assert fp.add(32, 1, 4, 4) == 32 and fp.add(32, 2, 4, 4) == 34 and fp.add(32, 3, 4, 4) == 36
# Multiplication and division.
assert fp.mul(F(3, 2), F(5, 2)) == F(15, 4) and 127 + 128 - 127 == 128
assert H(fp.mul(D("40400000"), D("C0E00000"))) == "C1A80000" == fp.hexs(fp.f32_bits(3.0 * -7.0))
assert D("42C80000") == 100 and H(fp.div(D("42C80000"), D("41200000"))) == "41200000" and 133 - 130 + 127 == 130
assert fp.mul(F(7, 4), F(3, 2), 4, 4) == F(21, 8) and fp.normalise_hidden(F(21, 8)) == (F(21, 16), 1)
assert 128 + 128 - 127 == 129 and fp.decode(129 << 23) == 4
# Overflow and underflow.
assert H(fp.mul(F(2) ** 127, 2)) == "7F800000" and H(fp.mul(F(2) ** -100, F(2) ** -100)) == "00000000"
assert H(fp.mul(F(2) ** -65, F(2) ** -65)) == "00080000"
assert fp.encode((2 - F(1, 2 ** 24)) * F(2) ** 127) == 0x7F800000 and fp.encode((2 - F(3, 2 ** 25)) * F(2) ** 127) == 0x7F7FFFFF
has("`0x3EAAAAAB`", "`C1A80000`", "`0x00080000`", "$(2 - 2^{-24})\\,2^{127}$")

# ── PYQ keys, re-derived ────────────────────────────────────────────────────
bank = {q["id"]: q for q in json.loads((nl.ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}
key = lambda i: bank[i]["answer"]
# cse-1997-b-72-b/c: truncating 5-bit fraction-form format.
def trunc5(v):
    M, E = fp.normalise_fraction_form(v)
    return F(int(fp.frac_bits(M, 5), 2), 32), E
(ma, ea), (mb, eb) = trunc5(F(219, 4)), trunc5(F(39, 4))
mb_aligned = F(int(fp.frac_bits(mb / 2 ** (ea - eb), 5), 2), 32)
total = ma + mb_aligned
assert (ma, ea, mb, eb) == (F(27, 32), 6, F(19, 32), 4) and mb_aligned == F(4, 32) and total == F(31, 32) and total * 2 ** ea == 62
assert "62" in key("cse-1997-b-72-b") and "0 11111" in key("cse-1997-b-72-b")
pct = (F(219, 4) + F(39, 4) - 62) / (F(219, 4) + F(39, 4)) * 100
assert round(float(pct), 1) == 3.9 and key("cse-1997-b-72-c").startswith("3.9")
# cse-2000-a-2-14: 32-bit floats, A = 2e30, B = −2e30, C = 1.
A, B, C = fp.round_to(2 * F(10) ** 30), -fp.round_to(2 * F(10) ** 30), F(1)
X = fp.add(fp.add(A, B), C)
Y = fp.add(fp.add(A, C), B)
assert (X, Y) == (1, 0) and key("cse-2000-a-2-14") == "B"
# cse-2004-cs-28: 3-digit decimal with rounding.
r1 = fp.dec_round(fp.dec_round(113 - 111, 3) + F(751, 100), 3)
r2 = fp.dec_round(113 + fp.dec_round(-111 + F(751, 100), 3), 3)
assert (r1, r2) == (F(951, 100), 10) and key("cse-2004-cs-28") == "A"
# cse-2020-cs-29: 0x42200000 / 0xC1200000.
assert (D("42200000"), D("C1200000")) == (40, -10) and H(fp.div(D("42200000"), D("C1200000"))) == "C0800000" and key("cse-2020-cs-29") == "B"
# cse-2023-cs-35: 0xC1800000 × 0x3F5C2EF4.
assert D("C1800000") == -16 and H(fp.mul(D("C1800000"), D("3F5C2EF4"))) == "C15C2EF4" and key("cse-2023-cs-35") == "C"
assert (0x3F5C2EF4 + 0x02000000) | 0x80000000 == 0xC15C2EF4
# cse-2025-2-cs-39 (MSQ).
Xv, Yv, Zv = D("C1100000"), D("40C00000"), D("41400000")
claims = {"A": 4 * (Xv + Yv) + Zv == 0, "B": 2 * Yv - Zv == 0, "C": 4 * Xv + 3 * Zv == 0, "D": Xv + Yv + Zv == 0}
assert (Xv, Yv, Zv) == (-9, 6, 12) and sorted(k for k, t in claims.items() if t) == ["A", "B", "C"] and key("cse-2025-2-cs-39") == "A;B;C"
# cse-2026-1-cs-26: 0x35C00000 + 0x34A00000.
assert D("35C00000") == F(3, 2) * F(2) ** -20 and D("34A00000") == F(5, 4) * F(2) ** -22
assert H(fp.add(D("35C00000"), D("34A00000"))) == "35E80000" and key("cse-2026-1-cs-26") == "C"

# ── Practice ───────────────────────────────────────────────────────────────
P = nl.practice()
q = P["nx-dl-01-07-q01"]
a, b = D("40A00000"), D("3FC00000")
calc = {"A": H(fp.add(a, b)), "B": H(F(7)), "C": H(fp.add(a, b) / 4), "D": H(F(6))}
assert (a, b) == (5, F(3, 2)) and calc == {o["l"]: o["t"].strip("`")[2:] for o in q["options"]}
nl.assert_mcq(q, "A")
q = P["nx-dl-01-07-q02"]
p = fp.mul(D("41100000"), D("BF000000"))
calc = {"A": H(p), "B": H(p * 4), "C": H(-p), "D": H(p / 2)}
assert p == F(-9, 2) and calc == {o["l"]: o["t"].strip("`")[2:] for o in q["options"]}
nl.assert_mcq(q, "A")
q = P["nx-dl-01-07-q03"]
cases = {"A": ("10110", "100", 22), "B": ("10101", "100", 22), "C": ("10110", "011", 23), "D": ("11111", "110", 32)}
truth = {k: fp.round_to(F(int(kp + ex, 2), 2 ** 7), 5, 4) == F(res, 16) for k, (kp, ex, res) in cases.items()}
nl.assert_msq(q, [k for k, t in truth.items() if t])
y = next(y for y in range(1, 10) if fp.add(2 ** 25, y) != 2 ** 25)
nl.assert_nat(P["nx-dl-01-07-q04"], y)
q = P["nx-dl-01-07-q05"]
truth = {"A": all(fp.add(u, v) == fp.add(v, u) for u in (1, F(1, 3), 2 ** 25) for v in (F(2, 7), -3, F(10) ** 9)),
         "B": fp.add(fp.add(2 ** 24, 1), 1) == fp.add(2 ** 24, fp.add(1, 1)),  # a counterexample decides "for all"
         "C": fp.add(fp.add(2 ** 25, 1), 1) == 2 ** 25,
         "D": fp.add(2 ** 25, fp.add(1, 1)) == 2 ** 25 + 2}
nl.assert_msq(q, [k for k, t in truth.items() if t])
nl.assert_nat(P["nx-dl-01-07-q06"], fp.fields(fp.encode(fp.mul(D("3F000000"), D("3E800000"))))[1])
q = P["nx-dl-01-07-q07"]
nl.assert_mcq(q, {o["t"].strip("`")[2:]: o["l"] for o in q["options"]}[H(fp.add(D("7F000000"), D("7F000000")))])
assert fp.hexs(fp.encode(F(2) ** 128, mode="rtz")) == "7F7FFFFF"
def trunc_fmt(v):
    M, E = fp.normalise_fraction_form(v)
    return F(int(fp.frac_bits(M, 5), 2), 32), E
(ma, ea), (mb, eb) = trunc_fmt(F(45, 4)), trunc_fmt(F(7, 2))
mb_al = F(int(fp.frac_bits(mb / 2 ** (ea - eb), 5), 2), 32)
comp = (ma + mb_al) * 2 ** ea
true = F(45, 4) + F(7, 2)
assert (ma * 2 ** ea, mb_al * 2 ** ea, comp, true) == (11, F(7, 2), F(29, 2), F(59, 4))
nl.assert_nat(P["nx-dl-01-07-q08"], round((true - comp) / true * 100, 2))
assert round(float((true - comp) / comp * 100), 2) == 1.72
q = P["nx-dl-01-07-q09"]
r = fp.div(D("C1800000"), D("40000000"))
calc = {"A": H(r), "B": fp.hexs(fp.pack(1, 131 - 128, 0)), "C": H(-r), "D": H(r * 4)}
assert r == -8 and calc == {o["l"]: o["t"].strip("`")[2:] for o in q["options"]}
nl.assert_mcq(q, "A")

print("l07_fp_arithmetic: every value in the lesson, its 8 PYQ keys and its practice answers check out")
