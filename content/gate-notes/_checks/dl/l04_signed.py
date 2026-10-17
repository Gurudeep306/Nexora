"""Checks for dl/01-number-systems/04-signed-numbers: encodings (SM, 1's, 2's, excess-K), negation
rules, ranges, radix complements, minimum widths, sign extension, shifts, PYQ keys and practice
answers. Our helpers are cross-checked against Python ints masked to n bits."""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import numlib as nl  # noqa: E402

L = nl.lesson_text("04-signed-numbers.md")
has = lambda *s: nl.must_contain(L, *s)
tw, ft = nl.to_twos, nl.from_twos

# Cross-check helpers against masked Python integers, every width up to 12.
for n in range(1, 13):
    lo, hi = nl.twos_range(n)
    assert (lo, hi) == (-(1 << (n - 1)), (1 << (n - 1)) - 1)
    for v in range(lo, hi + 1):
        p = tw(v, n)
        assert int(p, 2) == v & ((1 << n) - 1)
        assert ft(nl.asr(p)) == v >> 1                      # Python >> is floor division
        s, over = nl.asl(p)
        assert over == (not lo <= 2 * v <= hi) and (over or ft(s) == 2 * v)
        if n > 1:
            assert (not over) == (p[0] == p[1])   # left shift exact iff the top two bits are equal

# Definitions and derivations.
assert nl.to_ones(-2, 4) == "1101" and (int("0101", 2) + int("1101", 2)) == 0b10010 and ft("0011") == 3
assert nl.to_base((0b0010 + 1), 2, 4) == "0011" and nl.from_ones("0011") == 3        # end-around carry: 0010 + 1
assert nl.invert("0011") == "1100" and nl.add_one("1100") == "1101" and ft("1101") == -3
assert nl.copy_first_one("00101000") == "11011000" == tw(-40, 8)
assert (int(tw(28, 8), 2) + int(tw(-28, 8), 2)) == 256 and tw(-28, 8) == "11100100"
for n in range(2, 9):
    assert nl.sm_range(n) == nl.ones_range(n) == (-(2 ** (n - 1) - 1), 2 ** (n - 1) - 1)
assert nl.twos_range(6) == (-32, 31) and nl.sm_range(6) == (-31, 31)
# The 1's-complement top weight −(2ⁿ⁻¹ − 1).
for n in range(2, 9):
    for k in range(2 ** n):
        p = nl.to_base(k, 2, n)
        if p != "1" * n:
            assert nl.from_ones(p) == -int(p[0]) * (2 ** (n - 1) - 1) + int(p[1:], 2)

# Encoding / decoding examples.
assert tw(37, 8) == "00100101"
assert tw(-45, 16) == "1111111111010011" and int(tw(-45, 16), 2) == 0xFFD3 == 65491 == 65536 - 45
assert nl.min_width_twos(-9, -9) == 5 and tw(-9, 5) == "10111" and -16 + 4 + 2 + 1 == -9
assert tw(-128, 8) == "10000000" and nl.negate_twos("10000000") == "10000000"
assert ft("1111111111101001") == -23 and int("1111111111101001", 2) == 65513
assert ft("10000000") == -128 and ft(nl.to_base(0xB4, 2, 8)) == -76 == 180 - 256
assert (nl.from_sm("1011"), nl.from_ones("1011"), ft("1011")) == (-3, -4, -5)
assert ft("11111011") == ft("1011") == -5
assert tw(-15, 5) == "10001" and ft("1111") == -1 and ft("11111") == -1 and nl.min_width_twos(-15, -15) == 5
has("$-15$ needs 5 bits and is $10001$", "$1111\\,1111\\,1101\\,0011$, which is $(FFD3)_{16}$")
# Ranges and counts.
assert len({ft(nl.to_base(k, 2, 8)) for k in range(256)}) == 256
assert len({nl.from_sm(nl.to_base(k, 2, 8)) for k in range(256)}) == 255 == len({nl.from_ones(nl.to_base(k, 2, 8)) for k in range(256)})
assert nl.to_sm(0, 6) == "000000" and nl.from_sm("100000") == 0 and nl.from_ones("111111") == 0 and nl.negate_twos("000000") == "000000"
assert nl.twos_range(1) == (-1, 0) and ft("1") == -1
# Radix complements.
assert nl.diminished_complement("0371", 10) == "9628" and nl.radix_complement("0371", 10) == "9629"
assert (7520 + 9629) % 10 ** 4 == 7149 == 7520 - 371
assert nl.diminished_complement("1234", 8) == "6543" and nl.radix_complement("1234", 8) == "6544"
assert nl.value("1234", 8) + nl.value("6544", 8) == 8 ** 4
assert nl.to_base(300, 16) == "12C" and nl.diminished_complement("12C", 16) == "ED3" and nl.radix_complement("12C", 16) == "ED4"
assert 16 ** 3 - 300 == 3796 == 0xED4 and tw(-300, 12) == "111011010100"
assert nl.radix_complement("0000", 10) == "0000" and nl.diminished_complement("0000", 10) == "9999"
# Sign extension and shifts.
assert nl.sign_extend("1101", 8) == "11111101" and nl.sign_extend("0101", 8) == "00000101" and ft("11111101") == -3 == -128 + 125
assert ft("00001010") == 10 and ft("10001010") == -118 and nl.sign_extend("1010", 8) == "11111010" and ft("11111010") == -6
assert nl.sm_extend("1011", 8) == "10000011" and nl.from_sm("10000011") == -3
p = nl.to_base(0xFFD3, 2, 16)
s, over = nl.asl(p, 2)
assert not over and int(s, 2) == 0xFF4C and ft(s) == -180 == 65356 - 65536 and p[:3] == "111"
assert nl.asr(tw(-7, 8)) == "11111100" and ft("11111100") == -4 and nl.asl(tw(-7, 8)) == ("11110010", False) and ft("11110010") == -14
assert nl.lsr(tw(-7, 8)) == "01111100" and int("01111100", 2) == 124
assert nl.asl("0100") == ("1000", True)
# Mixed.
assert ft("11111101") == -3 and [ft(x) for x in ("11110111", "11110110", "11111011")] == [-9, -10, -5]
assert [x for x in (-9, -10, -5) if x % 3 == 0] == [-9]
assert nl.to_base(-100 + 256, 2, 8) == "10011100" == tw(-100, 8)
assert nl.min_width_twos(-64, -64) == 7 and nl.min_width_twos(64, 64) == 8
# Excess-K.
assert nl.from_excess("1011", 8) == 3 and nl.from_excess("0000", 8) == -8 and nl.from_excess("10000010", 127) == 3
for n in range(2, 8):
    for v in range(*[nl.twos_range(n)[0], nl.twos_range(n)[1] + 1]):
        assert nl.to_base(v + 2 ** (n - 1), 2, n) == ("0" if tw(v, n)[0] == "1" else "1") + tw(v, n)[1:]

# PYQ keys.
bank = {q["id"]: q for q in json.loads((nl.ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}
key = lambda i: str(bank[i]["answer"])
opts = lambda i: {o["l"]: o["t"] for o in bank[i]["options"]}
assert opts("cse-2000-a-1-6")[key("cse-2000-a-1-6")] == tw(43, 8)
assert key("cse-2002-a-16") == "D"
assert key("cse-1999-a-42") == "A;B" or bank["cse-1999-a-42"]["answer"] == ["A", "B"] or key("cse-1999-a-42").replace(" ", "") in ("A;B", "['A','B']")
assert nl.twos_range(8)[0] == -128 and opts("cse-2013-cs-4")[key("cse-2013-cs-4")] == "-128"
assert key("cse-2005-cs-16") == "A"
assert opts("cse-2019-cs-4")[key("cse-2019-cs-4")].replace(" ", "") == tw(-28, 16)
assert ft("1111111111110101") == -11 and key("cse-2016-1-cs-7") == "-11"
assert opts("cse-2002-a-15")[key("cse-2002-a-15")] == tw(-15, nl.min_width_twos(-15, -15))
b342 = "".join(nl.to_base(int(c), 2, 3) for c in "342")[-8:]
assert b342 == "11100010" and ft(b342) == -30 and key("cse-1998-a-17") == "D"
q25 = bank["cse-2025-1-cs-15"]
good = [o["l"] for o in q25["options"] if (lambda bits: ft(bits) == -6)(o["t"].split(" in ")[0].replace(" ", ""))]
assert good == ["B", "D"] and key("cse-2025-1-cs-15") == "B;D"
assert 2 ** 16 - (2 ** 16 - 1) == 1 and key("cse-2016-2-cs-9") == "1"
assert nl.radix_complement(nl.to_base(539, 16), 16) == "DE5" and key("cse-2001-a-35") == "C"
s, over = nl.asl(nl.to_base(0xF87B, 2, 16), 3)
assert not over and int(s, 2) == 0xC3D8 and key("cse-2010-cs-8") == "A"
div = ft("11111011")
vals = {k: ft(t) for k, t in opts("cse-2003-cs-9").items()}
assert div == -5 and [k for k, x in vals.items() if x % div == 0] == ["A"] == [key("cse-2003-cs-9")]
for N in range(-8, 8):
    m = N + 16 if N < 0 else N
    assert nl.to_base(m, 2, 4) == tw(N, 4)

# Practice.
P = nl.practice()
nl.assert_nat(P["nx-dl-01-04-q01"], ft(nl.to_base(0xF9C, 2, 12)))
assert nl.from_ones(nl.to_base(0xF9C, 2, 12)) == -99 and 0xF9C == 3996
q = P["nx-dl-01-04-q02"]
nl.assert_mcq(q, [k for k, t in nl.option_values(q).items() if int(t.strip("$()_{16}"), 16) == int(tw(-100, 8), 2)][0])
assert int(nl.to_sm(-100, 8), 2) == 0xE4 and int(nl.to_ones(-100, 8), 2) == 0x9B
nl.assert_msq(P["nx-dl-01-04-q03"], [k for k, ok in {"A": nl.from_sm("100000") == 0, "B": nl.from_ones("111111") == 0,
                                                       "C": ft("100000") == 0, "D": ft("111111") == 0}.items() if ok])
nl.assert_nat(P["nx-dl-01-04-q04"], len({nl.from_ones(nl.to_base(k, 2, 10)) for k in range(1024)}))
q = P["nx-dl-01-04-q05"]
ext = nl.sign_extend(nl.to_base(0xB7, 2, 8), 16)
nl.assert_mcq(q, [k for k, t in nl.option_values(q).items() if int(t.strip("$()_{16}"), 16) == int(ext, 2)][0])
assert ft(ext) == -73 == 0xB7 - 256 and int(ext, 2) == 65463 and ft(nl.to_base(0x80B7, 2, 16)) == -32585
nl.assert_nat(P["nx-dl-01-04-q06"], ft(nl.asr(nl.to_base(0xFFE0, 2, 16), 3)))
assert int(nl.lsr(nl.to_base(0xFFE0, 2, 16), 3), 2) == 8188 and ft(nl.to_base(0xFFE0, 2, 16)) == -32
nl.assert_mcq(P["nx-dl-01-04-q07"], "A")
assert nl.radix_complement("4070", 10) == "5930" and nl.diminished_complement("4070", 10) == "5929"
nl.assert_nat(P["nx-dl-01-04-q08"], nl.min_width_twos(-300, 200))
q = P["nx-dl-01-04-q09"]
truth = {}
for n in range(2, 12):
    t = {"A": nl.sm_range(n) == nl.ones_range(n), "B": nl.twos_range(n) == (-(2 ** (n - 1)), 2 ** (n - 1)),
         "C": 2 ** n - (2 ** n - 1) == 1, "D": nl.sm_range(n)[1] == nl.ones_range(n)[1] == nl.twos_range(n)[1]}
    for k, val in t.items():
        truth.setdefault(k, True)
        truth[k] = truth[k] and val
nl.assert_msq(q, [k for k, val in truth.items() if val])
p = "10010110"
nl.assert_nat(P["nx-dl-01-04-q10"], nl.from_sm(p) - ft(p))
assert nl.from_sm(p) == -22 and ft(p) == -106
qt = lambda i: json.dumps(P[i], ensure_ascii=False)
nl.must_contain(qt("nx-dl-01-04-q01"), "3996 - 4096 = -100", "= 99", where="q01")
nl.must_contain(qt("nx-dl-01-04-q05"), "183 - 256 = -73", "65463 = 65536 - 73", "$-32585$", where="q05")
nl.must_contain(qt("nx-dl-01-04-q06"), "65504 - 65536 = -32", "= 8188", where="q06")

print("l04_signed: every value in the lesson, its PYQ keys and its practice answers check out")
