"""Checks for dl/01-number-systems/01-place-value: every worked value, check answer, PYQ key
and practice answer of the lesson, recomputed exactly and tied to the text that states it."""
import json
import math
import pathlib
import sys
from fractions import Fraction as F

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import numlib as nl  # noqa: E402

L = nl.lesson_text("01-place-value.md")
has = lambda *s: nl.must_contain(L, *s)

# ── The idea: bundles, odometer, digit limit ───────────────────────────────
assert nl.to_base(46, 3) == "1201" and nl.value("1201", 3) == 46
assert nl.value("1201", 5) == 176
assert nl.to_base(3, 3) == "10" and nl.to_base(27, 3) == "1000"
assert nl.poly_value("13", 2) == nl.value("101", 2) == 5  # "(13)_2 would equal (101)_2" if the digit 3 were allowed
has("$(13)_2$ would equal $(101)_2$")
assert not nl.valid_in("3021", 3) and nl.valid_in("777", 8) and not nl.valid_in("1G", 16) and nl.valid_in("10", 2)
assert min(b for b in range(2, 37) if nl.valid_in("4072", b)) == 8
has("$(4072)_b$ forces $b \\ge 8$")

# ── Expansion / Horner ────────────────────────────────────────────────────
assert [1, 5, 15, 46] == nl.horner_trace("1201", 3)[1:]
has("$0 \\to 1 \\to 1\\cdot 3 + 2 = 5 \\to 5 \\cdot 3 + 0 = 15 \\to 15 \\cdot 3 + 1 = 46$")
assert nl.value("0.8", 16) == F(1, 2) and nl.value("0.101", 2) == F(5, 8)
assert nl.horner_trace("11010", 2)[1:] == [1, 3, 6, 13, 26]
has("$1 \\to 3 \\to 6 \\to 13 \\to 26$")
# Worked examples.
assert nl.value("11010", 2) == 26 == 16 + 8 + 2
assert nl.value("257", 8) == 175 and nl.horner_trace("257", 8)[1:] == [2, 21, 175]
assert nl.value("3C7", 16) == 967 == 768 + 192 + 7 and nl.horner_trace("3C7", 16)[1:] == [3, 60, 967]
assert nl.value("2120", 3) == 69 and nl.to_base(69, 16) == "45" and [r[2] for r in nl.division_steps(69, 16)] == [5, 4]
assert nl.value("1A.8", 16) == F(53, 2)
has("$(11010)_2 = 26$", "$(257)_8 = 175$", "$(3C7)_{16} = 967$", "$(2120)_3 = 69 = (45)_{16}$", "$(1A.8)_{16} = 26.5$")
# Check: Horner.
assert nl.horner_trace("1101", 2)[-1] == 13 and nl.horner_trace("342", 5)[1:] == [3, 19, 97]
has("$3 \\to 3\\cdot5+4 = 19 \\to 19\\cdot5+2 = 97$")

# ── Repeated division ─────────────────────────────────────────────────────
assert [(r[1], r[2]) for r in nl.division_steps(46, 3)] == [(15, 1), (5, 0), (1, 2), (0, 1)]
assert [(r[1], r[2]) for r in nl.division_steps(45, 2)] == [(22, 1), (11, 0), (5, 1), (2, 1), (1, 0), (0, 1)]
assert nl.to_base(45, 2) == "101101"
assert [(r[1], r[2]) for r in nl.division_steps(2748, 16)] == [(171, 12), (10, 11), (0, 10)] and nl.to_base(2748, 16) == "ABC"
assert [(r[1], r[2]) for r in nl.division_steps(39, 5)] == [(7, 4), (1, 2), (0, 1)] and nl.to_base(39, 5) == "124"
assert nl.value("421", 5) == 111
has("$(421)_5 = 111$")
assert nl.to_base(0, 8) == "0" and nl.to_base(7, 8) == "7" and nl.to_base(8, 8) == "10"
assert nl.to_base(100, 3) == "10201" and [r[2] for r in nl.division_steps(100, 3)] == [1, 0, 2, 0, 1]
has("45 = (101101)_2$", "2748 = (ABC)_{16}$", "39 = (124)_5$", "(10201)_3$")

# ── Base to base ──────────────────────────────────────────────────────────
assert nl.value("777", 8) == 511 and nl.value("FF", 16) == 255
assert nl.value("213", 4) == 39 and nl.to_base(39, 6) == "103"
vals = {k: nl.value(n, b) for k, (n, b) in {"a": ("14", 8), "b": ("C", 16), "c": ("110", 3), "d": ("22", 5), "e": ("21", 6)}.items()}
assert nl.value("1100", 2) == 12 and [k for k, v in vals.items() if v == 12] == ["a", "b", "c", "d"] and vals["e"] == 13
pairs = {(5, 7): (3 * 5 + 5, 2 * 7 + 6), (7, 10): (26, 26), (8, 12): (29, 30)}
for (x, y), (lv, rv) in pairs.items():
    assert 3 * x + 5 == lv and 2 * y + 6 == rv
valid_pairs = [(x, y) for (x, y) in pairs if 3 * x + 5 == 2 * y + 6 and nl.valid_in("35", x) and nl.valid_in("26", y)]
assert valid_pairs == [(7, 10)]
assert not nl.valid_in("194", 8)

# ── Digit counts ──────────────────────────────────────────────────────────
assert nl.digit_count(1000, 2) == 10 and nl.to_base(1000, 2) == "1111101000"
assert nl.to_base(2 ** 20, 8) == "4000000" and nl.digit_count(2 ** 20, 8) == 7 == 20 // 3 + 1
assert nl.min_bits_for_decimal_digits(32) == 107 and 2 ** 106 < 10 ** 32 <= 2 ** 107
assert round(2 ** 106 / 1e31, 1) == 8.1
has("$2^{106} - 1 \\approx 8.1 \\times 10^{31}$")
assert nl.digit_count(1024, 2) == 11 and math.ceil(math.log2(1024)) == 10
assert nl.digit_count(256, 2) == 9
assert nl.digit_count(8, 2) == 4

# ── Unknown base ──────────────────────────────────────────────────────────
def bases(pred, digits):
    return [b for b in range(2, 65) if nl.valid_in(digits, b) and pred(b)]

assert bases(lambda b: nl.poly_value("24", b) == 18, "24") == [7]
assert bases(lambda b: nl.poly_value("13", b) ** 2 == nl.poly_value("171", b), "13171") == [8]
assert nl.value("13", 8) == 11 and nl.value("171", 8) == 121
assert bases(lambda b: nl.poly_value("231", b) / nl.poly_value("20", b) == nl.poly_value("11.4", b), "2312011.4".replace(".", "")) == [7]
assert nl.value("231", 7) == 120 and nl.value("20", 7) == 14 and nl.value("11.4", 7) == F(60, 7)
assert bases(lambda b: nl.poly_value("11", b) == 3 + 6 and nl.poly_value("22", b) == 3 * 6, "11226") == [8]
assert bases(lambda b: nl.poly_value("144", b) == nl.poly_value("12", b) ** 2, "14412") == list(range(5, 65))
assert bases(lambda b: nl.poly_value("121", b) == nl.poly_value("11", b) ** 2, "121") == list(range(3, 65))
assert bases(lambda b: nl.poly_value("1331", b) == nl.poly_value("11", b) ** 3, "1331") == list(range(4, 65))
assert bases(lambda b: nl.poly_value("25", b) == 17, "25") == [6]

# ── Counting solutions ────────────────────────────────────────────────────
assert bases(lambda b: nl.poly_value("21", b) == 7, "21") == [3]


def count(pred, xs, ys):
    return [(x, y) for x in xs for y in ys if pred(x, y)]

# (54)_6 = (x6)_y, x a digit of base y.
assert nl.value("54", 6) == 34
s = count(lambda x, y: x * y + 6 == 34 and y >= 7 and 1 <= x < y, range(0, 40), range(2, 40))
assert s == [(1, 28), (2, 14), (4, 7)]
assert sorted((x, 28 // x) for x in range(1, 29) if 28 % x == 0) == [(1, 28), (2, 14), (4, 7), (7, 4), (14, 2), (28, 1)]
# (32)_x = (y2)_6, y a digit of base 6.
s = count(lambda x, y: 3 * x + 2 == 6 * y + 2 and x >= 4, range(2, 40), range(0, 6))
assert s == [(4, 2), (6, 3), (8, 4), (10, 5)]
# (x5)_y = 47.
s = count(lambda x, y: x * y + 5 == 47 and y >= 6 and 0 <= x < y, range(0, 50), range(2, 50))
assert s == [(1, 42), (2, 21), (3, 14), (6, 7)]
assert len(count(lambda x, y: x * y + 5 == 47 and y >= 6, range(1, 50), range(2, 50))) == 5
# The trap's numbers: (43)_x = (y3)_8 and (123)_5 = (x8)_y.
assert len([y for y in range(1, 8)]) == 7
assert count(lambda x, y: 4 * x + 3 == 8 * y + 3 and x >= 5, range(2, 40), range(0, 8)) == [(6, 3), (8, 4), (10, 5), (12, 6), (14, 7)]
assert len([x for x in range(1, 31) if 30 % x == 0]) == 8
assert count(lambda x, y: x * y + 8 == 38 and y >= 9 and 1 <= x < y, range(0, 40), range(2, 40)) == [(1, 30), (2, 15), (3, 10)]

# ── PYQ keys (recomputed from scratch, compared with the bank) ────────────
bank = {q["id"]: q for q in json.loads((nl.ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}
key = lambda i: str(bank[i]["answer"])
assert nl.value("132", 4) == 30 and nl.to_base(30, 5) == "110" and key("cse-2023-cs-22") in ("110 to 110", "110")
assert nl.to_base(int(nl.value("210", 3)), 16) == "15" and key("cse-2021-1-cs-6") == "A"
assert nl.value("110.101", 2) == F(53, 8) and nl.to_base(1118, 16) == "45E" and "6.625" in key("cse-1993-ii-a-6-5") and "45E" in key("cse-1993-ii-a-6-5")
opts = {"A": nl.value("64", 10), "B": nl.value("100", 8), "C": nl.value("50", 16), "D": nl.value("121", 7)}
assert sorted(k for k, v in opts.items() if v == nl.value("224", 5)) == ["A", "B", "D"] and key("cse-2024-2-cs-39") == "A;B;D"
ok = [k for k, (x, y) in {"A": (8, 16), "B": (10, 12), "C": (9, 13), "D": (8, 11)}.items() if 7 * x + 3 == 5 * y + 4 and x > 7 and y > 5]
assert ok == ["D"] and key("cse-2004-cs-19") == "D"
assert bases(lambda r: nl.poly_value("11", r) ** 2 == nl.poly_value("121", r), "121") == list(range(3, 65)) and key("cse-2008-cs-6") == "D"
assert bases(lambda r: nl.poly_value("13", r) ** 2 == nl.poly_value("224", r), "13224") == [5] and key("cse-1997-a-39") == "C"
assert bases(lambda b: nl.poly_value("13", b) == 5 + 6 and nl.poly_value("36", b) == 30, "13365") == [8] and key("cse-2017-2-cs-24") == "8"
assert bases(lambda b: nl.poly_value("312", b) == nl.poly_value("20", b) * nl.poly_value("13.1", b), "31220131") == [5] and key("cse-2014-1-cs-8") == "5"
s = count(lambda x, y: x * y + 8 == nl.value("123", 5) and y >= 9 and 0 <= x < y, range(0, 60), range(2, 60))
assert len(s) == 3 and key("cse-2014-2-cs-8") == "3"
s = count(lambda x, y: nl.poly_value("43", x) == nl.poly_value(f"{y}3", 8) and x >= 5, range(2, 60), range(0, 8))
assert len(s) == 5 and key("cse-2015-3-cs-35") == "5"

# ── Practice answers ──────────────────────────────────────────────────────
P = nl.practice()
nl.assert_nat(P["nx-dl-01-01-q01"], nl.value("3021", 4))
assert nl.value("1203", 4) == 99
q = P["nx-dl-01-01-q02"]
opt = {k: nl.value(v.strip("$()_7"), 7) for k, v in nl.option_values(q).items()}
nl.assert_mcq(q, [k for k, v in opt.items() if v == 2026][0])
assert opt["A"] == 1174 and opt["C"] == 2032
nl.assert_nat(P["nx-dl-01-01-q03"], bases(lambda r: nl.poly_value("110", r) == nl.value("2A", 16), "110")[0])
assert nl.value("110", 7) == 56
nl.assert_nat(P["nx-dl-01-01-q04"], nl.min_bits_for_decimal_digits(20))
assert round(2 ** 66 / 1e19, 1) == 7.4
q = P["nx-dl-01-01-q05"]
vals = {"A": nl.value("144", 8), "B": nl.value("46", 16), "C": nl.value("202", 7), "D": nl.value("10201", 3)}
nl.assert_msq(q, [k for k, v in vals.items() if v == 100])
assert vals["B"] == 70 and nl.to_base(100, 16) == "64"
q = P["nx-dl-01-01-q06"]
smallest = min(b for b in range(2, 37) if nl.valid_in("7A5", b))
assert smallest == 11 and nl.value("7A5", 11) == 962 and nl.value("7A5", 16) == 1957
nl.assert_mcq(q, "C")
q = P["nx-dl-01-01-q07"]
assert bases(lambda r: nl.poly_value("1331", r) == nl.poly_value("11", r) ** 3, "1331")[0] == 4
nl.assert_mcq(q, "C")
nl.assert_nat(P["nx-dl-01-01-q08"], bases(lambda b: nl.poly_value("16", b) * 5 == nl.poly_value("106", b), "16106")[0])
assert nl.value("16", 7) * 5 == 65 and nl.value("106", 7) == 55 and nl.value("16", 10) * 5 == 80
s = [(x, y) for x in range(0, 9) for y in range(0, 7) if 45 + x == 7 * y + 4]
nl.assert_nat(P["nx-dl-01-01-q09"], len(s))
assert s == [(1, 6)] and [(x, y) for x in range(0, 9) for y in range(0, 8) if 45 + x == 7 * y + 4] == [(1, 6), (8, 7)]

# The numbers quoted in solutions and wrong-answer notes are the computed ones.
qt = lambda i: json.dumps(P[i], ensure_ascii=False)
nl.must_contain(qt("nx-dl-01-01-q01"), "(1203)_4 = 64 + 32 + 0 + 3 = 99", "= 201", where="q01")
nl.must_contain(qt("nx-dl-01-01-q02"), "(3265)_7 = 1174", "(5632)_7 = 2032", "1715 + 294 + 14 + 3 = 2026", where="q02")
nl.must_contain(qt("nx-dl-01-01-q03"), "(110)_7 = 56", where="q03")
nl.must_contain(qt("nx-dl-01-01-q05"), "(46)_{16} = 70", "(64)_{16}", where="q05")
nl.must_contain(qt("nx-dl-01-01-q06"), "847 + 110 + 5 = 962", "= 1957", where="q06")
nl.must_contain(qt("nx-dl-01-01-q08"), "\\\\times 5 = 65", "(106)_7 = 55", "64 + 6 = 70", where="q08")
nl.must_contain(qt("nx-dl-01-01-q09"), "(51)_9 = 46", "(64)_7 = 46", where="q09")
assert nl.value("51", 9) == nl.value("64", 7) == 46

# Second-pass review: ⌈3.32 k⌉ is only an approximation of ⌈k log2 10⌉.
assert nl.min_bits_for_decimal_digits(25) == 84 and math.ceil(25 * 3.32) == 83 and 2 ** 83 < 10 ** 25
nl.must_contain(L, "$k = 25$ needs 84 bits, not 83")

print("l01_place_value: every value in the lesson, its PYQ keys and its practice answers check out")
