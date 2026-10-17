"""Checks for dl/01-number-systems/02-power-of-two-bases: grouping, base-4/8/16 conversions,
popcounts, base-b arithmetic, PYQ keys and practice answers. Every conversion is done twice:
once with our own grouping function and once with Python's int(s, base)."""
import json
import pathlib
import sys
from fractions import Fraction as F

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import numlib as nl  # noqa: E402

L = nl.lesson_text("02-power-of-two-bases.md")
has = lambda *s: nl.must_contain(L, *s)
v = lambda s, b: nl.value(s, b)


def regroup(numeral, src, dst):
    """Convert between bases 2, 4, 8, 16 purely by bit grouping (no arithmetic on the value)."""
    k_src, k_dst = {2: 1, 4: 2, 8: 3, 16: 4}[src], {2: 1, 4: 2, 8: 3, 16: 4}[dst]
    whole, _, frac = numeral.upper().partition(".")
    wb = "".join(nl.to_base(int(c, 16), 2, k_src) for c in whole)
    fb = "".join(nl.to_base(int(c, 16), 2, k_src) for c in frac)
    wb = wb.rjust(-(-len(wb) // k_dst) * k_dst, "0")
    fb = fb.ljust(-(-len(fb) // k_dst) * k_dst, "0")
    w = "".join(nl.DIGITS[int(wb[i:i + k_dst], 2)] for i in range(0, len(wb), k_dst)).lstrip("0") or "0"
    f = "".join(nl.DIGITS[int(fb[i:i + k_dst], 2)] for i in range(0, len(fb), k_dst)).rstrip("0")
    out = w + ("." + f if f else "")
    assert v(out, dst) == v(numeral, src), (numeral, src, dst, out)
    return out


# Grouping and padding.
assert regroup("110101", 2, 8) == "65" and regroup("110101", 2, 16) == "35" and v("110101", 2) == 53
assert v("101", 2) == v("0101", 2) and v("0.11", 2) == v("0.110", 2) == F(3, 4) and v("0.011", 2) == F(3, 8)
assert v("0.11", 2) == v("0.6", 8)
# Whole-number examples.
assert regroup("1011010", 2, 8) == "132" and v("1011010", 2) == 90 == v("132", 8)
assert regroup("101110111", 2, 16) == "177" and v("101110111", 2) == 375 == 256 + 64 + 32 + 16 + 4 + 2 + 1
assert regroup("546", 8, 16) == "166" and v("546", 8) == 358 == 256 + 96 + 6
assert regroup("3F2C", 16, 8) == "37454" and v("3F2C", 16) == 16172 == 3 * 4096 + 7 * 512 + 4 * 64 + 5 * 8 + 4
assert regroup("1010110", 2, 16) == "56" and v("1010110", 2) == 86 and v("A6", 16) == 166
has("$(1011010)_2 = (132)_8$", "$(101110111)_2 = (177)_{16}$", "$(546)_8 = (166)_{16}$", "$(3F2C)_{16} = (37454)_8$", "$(56)_{16}$", "$(A6)_{16} = 166$")
# The 657 trap: correct 1AF; fours from the left give D, 7, then a right-padded 1000 = 8.
b657 = "".join(nl.to_base(int(c), 2, 3) for c in "657")
assert b657 == "110101111" and regroup("657", 8, 16) == "1AF"
left = [b657[i:i + 4].ljust(4, "0") for i in range(0, 9, 4)]
assert "".join(nl.DIGITS[int(g, 2)] for g in left) == "D78"
# Fractions.
assert regroup("0.1011", 2, 16) == "0.B" and v("0.B", 16) == F(11, 16)
assert regroup("0.11", 2, 8) == "0.6" and v("0.3", 8) == F(3, 8)
assert regroup("2D.6", 16, 8) == "55.3" and v("2D.6", 16) == F(363, 8) == 45 + F(3, 8)
# Base 4 and octal/hex.
assert regroup("231", 4, 16) == "2D" and v("231", 4) == 45
assert regroup("B7", 16, 4) == "2313" and v("B7", 16) == 183 and regroup("B", 16, 4) == "23" and regroup("7", 16, 4) == "13"
assert regroup("52", 8, 4) == "222" and v("52", 8) == 42
assert regroup("1017", 8, 16) == "20F" and v("1017", 8) == 527 and v("101111", 2) == 47 and nl.to_base(47, 16) == "2F"
# Powers of 16 and popcounts.
pop = lambda n: bin(n).count("1")
assert 5 * 4096 + 12 * 16 + 7 == 0x50C7 and pop(0x50C7) == 7
assert 8 * 16 ** 3 + 4 * 16 ** 2 + 255 == 0x84FF and pop(0x84FF) == 10
assert 0xFFF == 2 ** 12 - 1 == 4095 and pop(0xFFF) == 12
assert 3 * 256 + 20 * 16 + 5 == 0x445 == 1093 == 1024 + 64 + 4 + 1 and pop(0x445) == 4
assert [pop(d) for d in range(16)] == [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4]
# Arithmetic.
assert nl.to_base(v("37", 8) + v("45", 8), 8) == "104" and v("37", 8) + v("45", 8) == 68
assert nl.to_base(0xA9 - 0x3F, 16) == "6A" and 0xA9 - 0x3F == 106 and 9 + 16 - 15 == 10
assert nl.to_base(v("26", 8) * 7, 8) == "232" and v("26", 8) * 7 == 154 and 6 * 7 == 5 * 8 + 2 and 2 * 7 + 5 == 2 * 8 + 3
assert nl.to_base(v("4002", 8) - v("1765", 8), 8) == "2015" and v("4002", 8) == 2050 and v("1765", 8) == 1013
has("$(104)_8$", "$(6A)_{16}$", "$(232)_8$", "$(2015)_8$")
# Check blocks added in the review pass.
assert pop(0xA5) == 4 and 10 * 16 + 5 == 0xA5
assert nl.to_base(v("65", 8) + v("27", 8), 8) == "114" and v("65", 8) == 53 and v("27", 8) == 23 and 53 + 23 == 76 == 64 + 8 + 4
assert 5 + 7 == 1 * 8 + 4 and 6 + 2 + 1 == 1 * 8 + 1
has("Result $(114)_8$. Check: $53 + 23 = 76 = 64 + 8 + 4$.")

# PYQ keys.
bank = {q["id"]: q for q in json.loads((nl.ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}
key = lambda i: str(bank[i]["answer"])
opts = lambda i: {o["l"]: o["t"] for o in bank[i]["options"]}
assert regroup("657", 8, 16) == "1AF" and opts("cse-2005-cs-17")[key("cse-2005-cs-17")] == "1AF"
assert regroup("1217", 8, 16) == "28F" and key("cse-2009-cs-5") == "B"
assert v("1217", 8) == 655 != 2297
assert regroup("BCA9", 16, 8) == "136251" and opts("cse-2017-2-cs-1")[key("cse-2017-2-cs-1")] == "136251"
assert regroup("123456", 8, 16) == "A72E" and regroup("123456", 8, 4) == "22130232" and key("it-2004-it-43") == "A"
assert 3 * 4096 + 15 * 256 + 5 * 16 + 3 == 0x3F53 and pop(0x3F53) == 10 and opts("cse-1995-a-37")[key("cse-1995-a-37")] == "10"
printed = 16 ** 3 + 9 + 16 ** 2 + 7 + 16 + 5 + 3
assert printed == 4392 and pop(printed) == 4 == int(key("cse-1991-a-1-iii")) and pop(0x9753) == 9
has("which is 4392 and", "has four 1s; the key agrees", "which has nine 1s")
prod = v("33.4", 8) * v("23.4", 8)
assert prod == F(2145, 4) and nl.to_base_mixed(prod, 8, 1) == "1030.2" and nl.expand_fraction(prod - 536, 8) == ("2", "")
assert all(v(o.strip("$()_8"), 8) != prod for o in [opts("it-2005-cs-47")[k] for k in "ABC"]) and key("it-2005-cs-47") == "D"

# Practice.
P = nl.practice()
q = P["nx-dl-01-02-q01"]
vals = {k: v(t.strip("$()_{16}"), 16) for k, t in nl.option_values(q).items()}
nl.assert_mcq(q, [k for k, x in vals.items() if x == v("7354", 8)][0])
assert v("7354", 8) == 3820 and v("3820", 16) == 14368 and regroup("7354", 8, 16) == "EEC"
nl.assert_nat(P["nx-dl-01-02-q02"], pop(0x7E5F))
q = P["nx-dl-01-02-q03"]
vals = {k: (v(t.strip("$()_8"), 8) if nl.valid_in(t.strip("$()_8"), 8) else None) for k, t in nl.option_values(q).items()}
nl.assert_mcq(q, [k for k, x in vals.items() if x == v("3A.C", 16)][0])
assert v("72.14", 8) == F(931, 16) and float(F(931, 16)) == 58.1875 and not nl.valid_in("58.6", 8)
q = P["nx-dl-01-02-q04"]
target = v("2301", 4)
vals = {"A": v("10110001", 2), "B": v("261", 8), "C": v("B1", 16), "D": v("1B", 16)}
nl.assert_msq(q, [k for k, x in vals.items() if x == target])
assert target == 177 and vals["D"] == 27
nl.assert_nat(P["nx-dl-01-02-q05"], int(nl.to_base(int(v("57", 8) * 6), 8)))
assert 7 * 6 == 5 * 8 + 2 and 5 * 6 + 5 == 4 * 8 + 3 and v("432", 8) == 282 == 47 * 6
q = P["nx-dl-01-02-q06"]
nl.assert_mcq(q, "A")
assert nl.to_base(0xFFFF - 1, 8) == "177776" and nl.to_base(0xFFFF, 8) == "177777" and 0xFFFE == 65534
nl.assert_nat(P["nx-dl-01-02-q07"], len(nl.to_base(2 ** 32 - 1, 8)))
assert nl.to_base(2 ** 32 - 1, 8) == "37777777777"
q = P["nx-dl-01-02-q08"]
nl.assert_mcq(q, [k for k, t in nl.option_values(q).items() if int(t) == pop(4 * 16 ** 3 + 2 * 16 + 7)][0])
nl.assert_nat(P["nx-dl-01-02-q09"], v("1F3", 16) - v("765", 8))
assert v("1F3", 16) == 499 and v("765", 8) == 501 and 499 - 765 == -266
qt = lambda i: json.dumps(P[i], ensure_ascii=False)
nl.must_contain(qt("nx-dl-01-02-q01"), "= 3820", "is 14368", where="q01")
nl.must_contain(qt("nx-dl-01-02-q03"), "= 58.1875", "= 58.75", where="q03")
nl.must_contain(qt("nx-dl-01-02-q04"), "= 177", "= 27", where="q04")
nl.must_contain(qt("nx-dl-01-02-q05"), "= 282", where="q05")
nl.must_contain(qt("nx-dl-01-02-q06"), "65534 = (177776)_8", where="q06")
nl.must_contain(qt("nx-dl-01-02-q09"), "= 499", "= 501", "= -266", where="q09")

print("l02_grouping: every value in the lesson, its PYQ keys and its practice answers check out")
