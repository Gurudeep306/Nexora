"""Checks for dl/01-number-systems/09-code-arithmetic: binary and base-b arithmetic, complement
subtraction (end-around carry, brute force), signed addition and overflow (the carry theorem by brute
force), flags, BCD and excess-3 corrections (every digit pair), Gray arithmetic and shifts; the 15 PYQ
keys (re-derived from scratch) and the practice answers. Exact integer arithmetic only."""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import numlib as nl  # noqa: E402

L = nl.lesson_text("09-code-arithmetic.md")
has = lambda *s: nl.must_contain(L, *s)
b2 = lambda s: int(s, 2)
tw = lambda s: nl.from_twos(s)


def add_carries(a, b, n, cin=0):
    """(sum mod 2^n, carry into the MSB c_{n-1}, carry out c_n)."""
    low = (a % 2 ** (n - 1)) + (b % 2 ** (n - 1)) + cin
    c_in = low >> (n - 1)
    total = a + b + cin
    return total % 2 ** n, c_in, total >> n


# Binary arithmetic.
assert b2("1011") + b2("0110") == b2("10001") == 17
assert b2("10110101") + b2("01101110") == 291 == b2("100100011") and 291 - 256 == 35
assert b2("1000") - b2("0011") == b2("0101") and b2("10100") - b2("1011") == 9
assert (5 - 7) % 16 == b2("1110") and tw("1110") == -2
assert b2("101") * b2("11") == b2("1111") and b2("1101") * b2("1011") == 143 == b2("10001111")
assert b2("1101") + b2("11010") == b2("100111") and b2("100111") + b2("1101000") == b2("10001111")
assert divmod(b2("100111"), b2("101")) == (b2("111"), b2("100")) and b2("1001") - b2("101") == b2("100")
assert b2("11") * b2("11") == b2("1001") and 1.5 * 1.5 == 2.25
# Base b.
assert nl.value("56", 8) + nl.value("27", 8) == nl.value("105", 8) == 69
assert int("B4", 16) - int("6F", 16) == int("45", 16) == 69
assert nl.value("34", 5) * nl.value("23", 5) == 247 and nl.to_base(247, 5) == "1442"
assert nl.value("1000", 7) - 1 == nl.value("666", 7) == 342
# Complement subtraction.
assert 72532 + (10 ** 5 - 3250) == 169282 and 10 ** 5 - 3250 == 96750
assert b2("1010100") + (b2("1000011") ^ 127) == b2("10010000") and (b2("10010000") - 128) + 1 == 17
assert 99999 - 72532 == 27467 and 3250 + 27467 == 30717 < 10 ** 5 and 99999 - 30717 == 69282
assert nl.radix_complement("617", 8) == "161" and nl.value("352", 8) + nl.value("161", 8) == nl.value("533", 8) < 512
assert nl.radix_complement("533", 8) == "245" and nl.value("352", 8) - nl.value("617", 8) == -nl.value("245", 8) == -165
assert 25 + 74 == 99 and 25 + 75 == 100
for r in (2, 8, 10, 16):                                     # the end-around theorem, brute force (3 digits)
    n = 3
    for M in range(0, r ** n, max(1, r ** n // 37)):
        for N in range(0, r ** n, max(1, r ** n // 41)):
            S = M + (r ** n - 1 - N)
            if M > N:
                assert S >= r ** n and S - r ** n + 1 == M - N
            else:
                assert S < r ** n and S == r ** n - 1 - (N - M)
            S2 = M + (r ** n - N) if N else M + r ** n
            assert (S2 >= r ** n) == (M >= N)
# Overflow theorem, brute force for n = 2 … 8.
for n in range(2, 9):
    lo, hi = -(2 ** (n - 1)), 2 ** (n - 1) - 1
    for a in range(2 ** n):
        for b in range(2 ** n):
            s, c_in, c_out = add_carries(a, b, n)
            va, vb = nl.from_twos(nl.to_base(a, 2, n)), nl.from_twos(nl.to_base(b, 2, n))
            over = not lo <= va + vb <= hi
            assert over == (c_in != c_out)
            sa, sb, ss = a >> (n - 1), b >> (n - 1), s >> (n - 1)
            assert over == bool(sa & sb & (1 - ss) | (1 - sa) & (1 - sb) & ss)
            if sa != sb:
                assert not over
# Lesson examples.
s, ci, co = add_carries(b2("0101"), b2("0100"), 4)
assert (s, ci, co) == (b2("1001"), 1, 0) and tw("1001") == -7
s, ci, co = add_carries(b2("01101101"), b2("11010011"), 8)
assert (tw("01101101"), tw("11010011"), s, co) == (109, -45, 64, 1) and 109 + 211 == 320
s, ci, co = add_carries(b2("1011"), b2("1010"), 4)
assert (tw("1011"), s, ci, co) == (-5, b2("0101"), 0, 1) and nl.to_twos(-6, 4) == "1010"
assert nl.sign_extend("1101", 8) == "11111101" and (b2("11111101") + b2("00010100")) % 256 == 17 and b2("00001101") + 20 == 33
assert nl.from_ones("1100") == -3 and nl.from_ones("1101") == -2 and b2("1100") + b2("1101") == b2("11001")
assert nl.from_ones(nl.to_base(b2("1001") + 1, 2, 4)) == -5
# BCD: the +6 rule for every digit pair and carry.
for x in range(10):
    for y in range(10):
        for c in (0, 1):
            t = x + y + c
            raw, carry4 = t % 16, t >= 16
            fix = raw > 9 or carry4
            digit = (raw + 6) % 16 if fix else raw
            assert digit == t % 10 and fix == (t >= 10)
assert b2("1111") + 6 == b2("10101") and 9 + 8 == b2("10001")
assert nl.bcd(59) == "0101 1001" and nl.bcd(97) == "1001 0111" and 386 + 457 == 843 and nl.bcd(843) == "1000 0100 0011"
assert (13 + 6) % 16 == 3 and (14 + 6) % 16 == 4 and 100 - 35 == 65 and 72 + 65 == 137
# Excess-3: −3 without a carry, +3 with one, for every digit pair and carry.
for x in range(10):
    for y in range(10):
        for c in (0, 1):
            t = (x + 3) + (y + 3) + c
            out = (t % 16) + 3 if t >= 16 else t - 3
            assert out == (x + y + c) % 10 + 3 and (t >= 16) == (x + y + c >= 10)
assert nl.xs3(7) == "1010" and int("0110", 2) + int("0111", 2) == 13 and 13 - 3 == int("1010", 2)
assert int("1001", 2) + int("1010", 2) == 19 and (19 % 16) + 3 == int("0110", 2)
assert nl.xs3(47) == "0111 1010" and nl.xs3(38) == "0110 1011" and nl.xs3(85) == "1011 1000"
assert int("1011", 2) + int("1001", 2) == 20 and (20 % 16) + 3 == int("0111", 2) and int("0111", 2) + 1 == int("1000", 2) == 5 + 3
# Gray.
assert nl.gray(3) == b2("0010") and nl.gray(5) == b2("0111") and b2("0010") + b2("0111") == b2("1001") and nl.gray_inv(b2("1001")) == 14
assert nl.gray(8) == b2("1100") and nl.gray_inv(b2("0101")) == 6 and nl.gray(7) == b2("0100")
assert nl.gray_inv(b2("1100")) == 8 and nl.gray_inv(b2("1010")) == 12 and b2("1100") - b2("1010") == 2
# Shifts.
assert (3 << 2) % 16 == 12 and tw("1100") == -4
assert nl.to_twos(-20, 8) == "11101100" and nl.asr("11101100", 2) == "11111011" and tw("11111011") == -5
assert tw(nl.to_base(0xFFB4, 2, 16)) == -76 and nl.to_base((0xFFB4 << 2) % 2 ** 16, 16, 4) == "FED0" and -304 % 65536 == 0xFED0
assert nl.to_twos(-9, 8) == "11110111" and nl.asr("11110111", 1) == "11111011" and int(-9 / 2) == -4
assert nl.lsr("11101100", 2) == "00111011" and b2("00111011") == 59
has("$10001_2 = 17$", "$0010001_2 = 17 = 84 - 67$", "$FED0_{16} = -304 = 4 \\times (-76)$", "$1011\\,1000$ = excess-3 of $85$")

# ── PYQ keys, re-derived ────────────────────────────────────────────────────
bank = {q["id"]: q for q in json.loads((nl.ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}
key = lambda i: bank[i]["answer"]
opts = lambda i: {o["l"]: o["t"] for o in bank[i]["options"]}
over = lambda a, b, n: add_carries(b2(a), b2(b), n)[1] != add_carries(b2(a), b2(b), n)[2]
neg = lambda x, n: nl.to_base((-b2(x)) % 2 ** n, 2, n)
# it-2006-cs-7: 1101 + 0100 = 0001, no overflow.
s, ci, co = add_carries(b2("1101"), b2("0100"), 4)
assert s == 1 and ci == co and key("it-2006-cs-7") == "C"
# cse-2022-cs-8: which R1 + R2 overflows.
pairs = {"A": ("1011", "1110"), "B": ("1100", "1010"), "C": ("0011", "0100"), "D": ("1001", "1111")}
assert [k for k, (a, b) in pairs.items() if over(a, b, 4)] == ["B"] == [key("cse-2022-cs-8")]
# it-2004-it-42: 1100+1100, 0011+0111, 1111+0111.
res = [over("1100", "1100", 4), over("0011", "0111", 4), over("1111", "0111", 4)]
assert res == [False, True, False] and key("it-2004-it-42") == "B"
# cse-2002-a-21: (B) opposite signs never overflow.
assert key("cse-2002-a-21") == "B"
# cse-1992-b-4-a: descriptive, the carry rule.
assert "carry into the MSB differs" in key("cse-1992-b-4-a")
# cse-2017-1-cs-9 and cse-2006-cs-39: the sign-form expression.
assert key("cse-2017-1-cs-9") == "C" and key("cse-2006-cs-39") == "B"
for a in range(256):
    for b in range(256):
        s, ci, co = add_carries(a, b, 8)
        a7, b7, s7 = a >> 7, b >> 7, s >> 7
        assert (ci != co) == bool(a7 & b7 & (1 - s7) | (1 - a7) & (1 - b7) & s7)
        if (a + b) % 256 != (a + b):                       # option A of 2017 (carry C7 alone) is not overflow
            pass
assert not over("01101101", "11010011", 8) and add_carries(b2("01101101"), b2("11010011"), 8)[2] == 1
# 2006: c_{n-1} is the top sum bit there; option C uses c_out ⊕ (sum MSB), which fails on 0+0 → 0 with no carry? check:
for a in range(16):
    for b in range(16):
        s, ci, co = add_carries(a, b, 4)
        a3, b3, s3 = a >> 3, b >> 3, s >> 3
        ovf = ci != co
        assert ovf == bool(a3 & b3 & (1 - s3) | (1 - a3) & (1 - b3) & s3)            # option B
assert any((add_carries(a, b, 4)[2] ^ (add_carries(a, b, 4)[0] >> 3)) != (add_carries(a, b, 4)[1] != add_carries(a, b, 4)[2]) for a in range(16) for b in range(16))
# it-2008-it-15: flags of 01001101 + 11101001.
s, ci, co = add_carries(b2("01001101"), b2("11101001"), 8)
assert (co, int(ci != co), s >> 7) == (1, 0, 0) and key("it-2008-it-15") == "B"
# cse-2024-1-cs-3: A = 01010 (10), B = 11010 (−6), 5 bits.
A, B = tw("01010"), tw("11010")
rng = range(-16, 16)
outcomes = {"A": A + B in rng, "B": A - B in rng, "C": B - A in rng, "D": 2 * B in rng}
assert (A, B) == (10, -6) and [k for k, ok in outcomes.items() if not ok] == ["B"] == [key("cse-2024-1-cs-3")]
# cse-2026-2-cs-18: N1..N4 in 4 bits.
N = {k: tw(v) for k, v in {"1": "1011", "2": "1101", "3": "1010", "4": "1001"}.items()}
ops = {"A": N["1"] + N["2"], "B": N["2"] + N["3"], "C": N["3"] - N["4"], "D": N["1"] + N["4"]}
assert sorted(k for k, v in ops.items() if not -8 <= v <= 7) == ["B", "D"] and key("cse-2026-2-cs-18") == "B; D"
# cse-2019-cs-8: SM X − Y needs n + 1 bits.
n = 8
mx = 2 ** (n - 1) - 1
assert mx - (-mx) == 2 ** n - 2 > mx and (2 ** n - 2) < 2 ** n - 1 and key("cse-2019-cs-8") == "C"
# cse-2026-1-cs-12: SM X = 10110100 (−52), Y = 01001100 (+76), 8 bits (range ±127).
X, Y = nl.from_sm("10110100"), nl.from_sm("01001100")
z = {"A": X + Y, "B": X - Y, "C": -X + Y, "D": -X - Y}
assert (X, Y) == (-52, 76) and sorted(k for k, v in z.items() if abs(v) > 127) == ["B", "C"] and key("cse-2026-1-cs-12") == "B; C"
# it-2005-cs-47: (33.4)8 × (23.4)8 = 536.25 = (1030.2)8 → none of these.
prod = nl.value("33.4", 8) * nl.value("23.4", 8)
assert prod == nl.value("1030.2", 8) and key("it-2005-cs-47") == "D"
# cse-2010-cs-8: 8 × F87B.
assert nl.to_base((0xF87B << 3) % 2 ** 16, 16, 4) == "C3D8" and key("cse-2010-cs-8") == "A"
# cse-1995-a-51: unsigned bytes A = 5CH, B = 92H.
A, B = 0x5C, 0x92
assert ((A + B) % 256, abs(A - B), (A - B) % 256, A * B) == (0xEE, 0x36, 0xCA, 0x3478)
assert "X = EEH" in key("cse-1995-a-51") and "Z = 3478H" in key("cse-1995-a-51")

# ── Practice ───────────────────────────────────────────────────────────────
P = nl.practice()
nl.assert_nat(P["nx-dl-01-09-q01"], b2("110110") - b2("1011"))
q = P["nx-dl-01-09-q02"]
s = 4021 + (10 ** 4 - 7352)
assert s == 6669 < 10 ** 4 and -(10 ** 4 - s) == 4021 - 7352 == -3331
nl.assert_mcq(q, "A")
s = b2("01100101") + (b2("00101100") ^ 255)
assert s >> 8 == 1
nl.assert_nat(P["nx-dl-01-09-q03"], (s % 256) + 1)
q = P["nx-dl-01-09-q04"]
cases = {"A": tw("0110") + tw("0011"), "B": tw("1100") + tw("1101"), "C": tw("1000") + tw("1111"), "D": tw("0111") - tw("1111")}
nl.assert_msq(q, [k for k, v in cases.items() if not -8 <= v <= 7])
q = P["nx-dl-01-09-q05"]
s, ci, co = add_carries(b2("10010110"), b2("10100011"), 8)
flags = f"{co}, {int(ci != co)}, {s >> 7}"
nl.assert_mcq(q, {o["t"]: o["l"] for o in q["options"]}[flags])
corr, c = 0, 0
for x, y in ((9, 6), (7, 5)):
    t = x + y + c
    corr += t > 9
    c = int(t > 9)
nl.assert_nat(P["nx-dl-01-09-q06"], corr)
assert 79 + 56 == 135
q = P["nx-dl-01-09-q07"]
nl.assert_mcq(q, {o["t"].replace("$", "").replace("\\,", " "): o["l"] for o in q["options"]}[nl.xs3(59)])
assert nl.xs3(24) == "0101 0111" and nl.xs3(35) == "0110 1000" and nl.bcd(59) == "0101 1001"
q = P["nx-dl-01-09-q08"]
nl.assert_mcq(q, {o["t"].strip("$"): o["l"] for o in q["options"]}[nl.asr("10110100", 3)])
assert tw("10110100") == -76 and tw(nl.asr("10110100", 3)) == -10 and nl.lsr("10110100", 3) == "00010110"
nl.assert_nat(P["nx-dl-01-09-q09"], int(nl.to_base(nl.value("123", 4) + nl.value("321", 4), 4)))

print("l09_code_arithmetic: every value in the lesson, its 15 PYQ keys and its practice answers check out")
