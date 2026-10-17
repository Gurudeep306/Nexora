"""Checks for dl/01-number-systems/03-fractions-fixed-point: fraction expansions (with cycle
detection), the termination test, truncation errors, fixed-point ranges and representability,
PYQ keys and practice answers. Exact arithmetic with Fraction only."""
import json
import pathlib
import sys
from fractions import Fraction as F

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import numlib as nl  # noqa: E402

L = nl.lesson_text("03-fractions-fixed-point.md")
has = lambda *s: nl.must_contain(L, *s)
v = lambda s, b: nl.value(s, b)
exp = nl.expand_fraction

# Repeated multiplication.
assert exp(F(5, 8), 2) == ("101", "") and [r[1] for r in nl.frac_steps(F(5, 8), 2)[0]] == [F(5, 4), F(1, 2), 1]
assert v("0.1101", 2) == F(13, 16) and v("0.1011", 2) == F(11, 16)
has("$0.8125 = (0.1101)_2$", "$(0.1011)_2 = 0.6875$")
assert exp(F(13, 32), 2) == ("01101", "") and [r[2] for r in nl.frac_steps(F(13, 32), 2)[0]] == [0, 1, 1, 0, 1]
assert nl.to_base_mixed(F(107, 8), 2, 3) == "1101.011" and exp(F(3, 8), 2) == ("011", "")
assert exp(F(3, 10), 2) == ("0", "1001") and nl.frac_digits(F(3, 10), 2, 6) == "010011"
assert v("0.010011", 2) == F(19, 64) and F(3, 10) - F(19, 64) == F(1, 320) == F(3125, 10 ** 6) and F(1, 64) == F(15625, 10 ** 6)
has("$0.3 - 0.296875 = 0.003125 < 2^{-6} = 0.015625$")
assert nl.to_base_mixed(F(733, 16), 16, 1) == "2D.D" and F(733, 16) == F(458125, 10000)
assert exp(F(7, 10), 8) == ("5", "4631")
has("$(0.5\\overline{4631})_8$", "(0.0\\overline{1001})_2", "$0.40625 = (0.01101)_2$", "$13.375 = (1101.011)_2$", "$45.8125 = (2D.D)_{16}$")
assert exp(F(1, 10), 2) == ("0", "0011")

# Termination theorem and examples.
for p in range(1, 60):
    for q in range(1, 60):
        for b in (2, 3, 5, 6, 8, 10, 16):
            x = F(p, q) - int(F(p, q))
            assert (exp(x, b, 400)[1] == "") == nl.terminates(x, b), (p, q, b)
assert nl.terminates(F(3, 8), 2) and not nl.terminates(F(1, 5), 2) and exp(F(1, 5), 2) == ("", "0011")
assert nl.terminates(F(1, 5), 10) and exp(F(1, 5), 5) == ("1", "")
assert exp(F(7, 12), 6) == ("33", "") and F(3, 6) + F(3, 36) == F(7, 12)
assert exp(F(1, 3), 3) == ("1", "") and exp(F(1, 3), 2) == ("", "01")
assert exp(F(1, 7), 2) == ("", "001")
assert not nl.terminates(F(1, 20), 2) and F(5, 10) == F(1, 2)

# Fixed point.
assert nl.fixed_range(5, 3) == (0, F(255, 8), F(1, 8), 256) and F(255, 8) == 31 + F(7, 8)
assert nl.fixed_range(8, 4)[1] == F(4095, 16) == 256 - F(1, 16)
assert v("1111.11", 2) == F(63, 4) == 16 - F(1, 4)
for i in range(1, 9):
    for f in range(0, 9):
        mn, mx, res, cnt = nl.fixed_range(i, f)
        assert mx == 2 ** i - res and cnt == 2 ** (i + f)
assert nl.fixed_representable(F(19, 8), 4, 4) and nl.fixed_bits(F(19, 8), 4, 4) == "0010.0110" and F(19, 8) * 16 == 38
reps = {x: nl.fixed_representable(x, 5, 3) for x in (F(165, 8), F(73, 10), F(40), F(1, 16))}
assert [x for x, ok in reps.items() if ok] == [F(165, 8)] and F(165, 8) == F(20625, 1000)
assert all(not nl.fixed_representable(F(1, 10), i, f) for i in range(1, 10) for f in range(0, 30))
assert nl.fixed_representable(F(255, 8), 5, 3) and not nl.fixed_representable(F(319, 10), 5, 3)
assert nl.q_range(4, 4) == (-8, F(127, 16), F(1, 16)) and F(127, 16) == F(79375, 10000)
assert nl.fixed_bits(F(45, 4), 5, 3) == "01011.010"
assert F(2, 16) + F(5, 256) == F(14453125, 10 ** 8)
has("0.14453125", "$255.9375$", "31.875 = 32 - \\tfrac18$")

# PYQ keys.
bank = {q["id"]: q for q in json.loads((nl.ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}
key = lambda i: str(bank[i]["answer"])
assert exp(F(1, 4), 2) == ("01", "") and key("cse-2002-a-14") == "B"
x = v("0.1101", 2)
assert x == F(8125, 10000) and 1 + 2 == 3 and key("cse-2021-2-cs-18") in ("3 to 3", "3")
assert key("cse-2017-1-cs-7") == "D"
fx = lambda val: nl.fixed_representable(val, 5, 3)
assert [fx(F(315, 10)), fx(F(875, 1000)), fx(F(121, 10)), fx(F(3001, 1000))] == [True, True, False, False] and key("cse-2018-cs-33") == "C"
diff = v("C012.25", 16) - v("10111001110.101", 2)
assert nl.to_base(int(diff), 8) == "135103" and exp(diff - int(diff), 8) == ("412", "") and key("it-2007-cs-42") == "A"

# Practice.
P = nl.practice()
nl.assert_nat(P["nx-dl-01-03-q01"], exp(F(11, 16), 2)[0].count("1"))
q = P["nx-dl-01-03-q02"]
vals = {"A": F(1, 2), "B": F(1, 5), "C": F(3, 8), "D": F(1, 20)}
nl.assert_msq(q, [k for k, x in vals.items() if nl.terminates(x, 2)])
nl.assert_nat(P["nx-dl-01-03-q03"], nl.fixed_range(6, 4)[1])
assert nl.fixed_range(6, 4)[1] == F(1023, 16)
q = P["nx-dl-01-03-q04"]
vals = {"A": F(159375, 10000), "B": F(71, 10), "C": F(1, 16), "D": F(16)}
nl.assert_msq(q, [k for k, x in vals.items() if nl.fixed_representable(x, 4, 4)])
q = P["nx-dl-01-03-q05"]
nl.assert_mcq(q, [k for k, t in nl.option_values(q).items() if F(t.strip("$")) == v("0.101", 2) + v("0.3", 8)][0])
err = F(7, 10) - v("0." + nl.frac_digits(F(7, 10), 2, 4), 2)
nl.assert_nat(P["nx-dl-01-03-q06"], err)
assert exp(F(7, 10), 2) == ("1", "0110") and F(7, 10) - F(5, 8) == F(75, 1000)
q = P["nx-dl-01-03-q07"]
lo, hi, res = nl.q_range(8, 8)
assert lo == -128 and hi == F(12799609375, 10 ** 8) and res == F(1, 256)
nl.assert_mcq(q, "A")
nl.assert_nat(P["nx-dl-01-03-q08"], len(exp(F(1, 5), 2)[1]))
x = v("0.11", 2)
nl.assert_nat(P["nx-dl-01-03-q09"], int(str(float(x))[2]) + int(str(float(x))[3]))
qt = lambda i: json.dumps(P[i], ensure_ascii=False)
nl.must_contain(qt("nx-dl-01-03-q06"), "= 0.6875", "= 0.0125", where="q06")
nl.must_contain(qt("nx-dl-01-03-q04"), "= 255", "= 113.6", "= 256", where="q04")

print("l03_fractions: every value in the lesson, its PYQ keys and its practice answers check out")
