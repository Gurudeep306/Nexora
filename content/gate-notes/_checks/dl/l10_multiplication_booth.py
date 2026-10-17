"""Checks for dl/01-number-systems/10-multiplication-booth: signed shift-and-add, product bits, Booth
recoding (value proof by brute force), the register algorithm, operation counts, best/worst patterns and
bit-pair recoding; the 8 PYQ keys (re-derived from scratch) and the practice answers."""
import itertools
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boothlib as bl  # noqa: E402
import numlib as nl  # noqa: E402

L = nl.lesson_text("10-multiplication-booth.md")
has = lambda *s: nl.must_contain(L, *s)
tw = nl.from_twos
b2 = lambda s: int(s, 2)


def signed_shift_add(m, q, n):
    """n-bit 2's-complement M × Q by sign-extended partial products, the top one subtracted."""
    M = tw(m)
    total = 0
    for i, bit in enumerate(reversed(q)):
        if bit == "1":
            total += (-1 if i == n - 1 else 1) * (M << i)
    return nl.to_base(total % 2 ** (2 * n), 2, 2 * n)


# Signed shift-and-add.
for n in (3, 4, 5):
    for a in range(-(2 ** (n - 1)), 2 ** (n - 1)):
        for b in range(-(2 ** (n - 1)), 2 ** (n - 1)):
            assert tw(signed_shift_add(nl.to_twos(a, n), nl.to_twos(b, n), n)) == a * b
            assert -(2 ** (2 * n - 1)) <= a * b < 2 ** (2 * n - 1)
assert 0b1011 * 0b0110 == 66 == b2("01000010") and b2("10110") + b2("101100") == b2("1000010")
assert signed_shift_add("1101", "0101", 4) == "11110001" and tw("11110001") == -15 and 13 + 52 == 65
assert (b2("11111101") + b2("11110100")) % 256 == b2("11110001")
assert signed_shift_add("11111001", "00000110", 8)[-8:] == "11010110" and tw("11010110") == -42
assert (b2("11110010") + b2("11100100")) % 256 == b2("11010110")
assert signed_shift_add("0011", "1101", 4) == "11110111" and 3 + 12 - 24 == -9 and 3 * 13 == 39
# Product bits by brute force over all 4-bit pairs.
for A in range(16):
    for B in range(16):
        a = [(A >> i) & 1 for i in range(4)]
        b = [(B >> i) & 1 for i in range(4)]
        P = A * B
        assert P & 1 == a[0] & b[0] and (P >> 1) & 1 == (a[1] & b[0]) ^ (a[0] & b[1])
# Booth recoding examples.
assert bl.fmt(bl.booth_digits("0011100")) == "0 +1 0 0 −1 0 0" and 32 - 4 == 28
assert nl.to_twos(-29, 8) == "11100011" and bl.fmt(bl.booth_digits("11100011")) == "0 0 −1 0 0 +1 0 −1" and -32 + 4 - 1 == -29
assert bl.fmt(bl.booth_digits("1000")) == "−1 0 0 0" and bl.fmt(bl.booth_digits("1101")) == "0 −1 +1 −1"
tr, p = bl.booth_trace(3, b2("1101"), 4)
assert [(op, f"{A % 16:04b}", f"{Q:04b}", q1) for op, A, Q, q1 in tr] == [
    ("A − M", "1110", "1110", 1), ("A + M", "0000", "1111", 0), ("A − M", "1110", "1111", 1), ("none", "1111", "0111", 1)]
assert f"{p:08b}" == "11110111"
assert bl.booth_trace(-8, b2("1000"), 4)[1] == 64 and 0 - (-8) > 7
# The value theorem (telescoping), brute force up to 12 bits.
for n in range(1, 13):
    for v in range(-(2 ** (n - 1)), 2 ** (n - 1)):
        assert bl.digits_value(bl.booth_digits(nl.to_twos(v, n))) == v
# Counts.
assert bl.booth_ops("01111110") == 2 and "01111110".count("1") == 6
assert bl.booth_ops("0011110011110000") == 4 and "0011110011110000".count("1") == 8
assert bl.booth_ops("0101" * 4) == 16 and bl.booth_ops("1010" * 4) == 15
assert bl.booth_ops("11110000") == 1 and bl.digits_value(bl.booth_digits("11110000")) == -16
for n in range(2, 11):                                # alternating 01…01 is the unique worst case
    allq = ["".join(t) for t in itertools.product("01", repeat=n)]
    best = max(bl.booth_ops(x) for x in allq)
    worst = [x for x in allq if bl.booth_ops(x) == best]
    assert best == n and worst == [("01" * n)[-n:]]                 # only the alternating pattern ending in 1
# Bit-pair.
table = {f"{a}{b}{c}": bl.bitpair_digit(a, b, c) for a in (0, 1) for b in (0, 1) for c in (0, 1)}
assert table == {"000": 0, "001": 1, "010": 1, "011": 2, "100": -2, "101": -1, "110": -1, "111": 0}
assert bl.bitpair_digits("0110") == [2, -2] and bl.bitpair_digits("11100011") == [0, -2, 1, -1]
assert bl.bitpair_digits(nl.sign_extend("10110", 6)) == [-1, 2, -2] and tw("10110") == -10 and b2("010110") == 22
for n in (2, 4, 6, 8, 10):
    for v in range(-(2 ** (n - 1)), 2 ** (n - 1)):
        assert bl.digits_value(bl.bitpair_digits(nl.to_twos(v, n)), 4) == v
assert divmod(7, 2) == (3, 1)
has("$1111\\,0111 = -9$", "$0\\ 0\\ {-1}\\ 0\\ 0\\ {+1}\\ 0\\ {-1}$", "$-1\\ {+2}\\ {-2}$", "$1101\\,0110 = -42 = (-7) \\times 6$")

# ── PYQ keys, re-derived ────────────────────────────────────────────────────
bank = {q["id"]: q for q in json.loads((nl.ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}
key = lambda i: bank[i]["answer"]
opts = lambda i: {o["l"]: o["t"] for o in bank[i]["options"]}
assert key("cse-1991-a-1-v").replace(" ", "") == "$c_1=a_1b_0\\oplusa_0b_1$"
# cse-1996-a-23: worst Booth performance among the four patterns (n = 12 stands for the dots).
pats = {"A": "10" * 6, "B": "1" + "0" * 10 + "1", "C": "1" * 12, "D": "0" + "1" * 10 + "0"}
counts = {k: bl.booth_ops(v) for k, v in pats.items()}
assert max(counts, key=counts.get) == "A" == key("cse-1996-a-23") and counts == {"A": 11, "B": 3, "C": 1, "D": 2}
# cse-1999-a-20 and it-2005-cs-8: −57 in 8 bits.
d57 = bl.booth_digits(nl.to_twos(-57, 8))
norm = lambda t: [int(x.replace("+", "").replace("−", "-").replace("-", "-")) for x in t.replace("−", "-").split()]
assert norm(opts("cse-1999-a-20")["B"]) == d57 and key("cse-1999-a-20") == "B"
assert norm(opts("it-2005-cs-8")["A"]) == d57 and key("it-2005-cs-8") == "A"
assert all(norm(t) != d57 for k, t in opts("cse-1999-a-20").items() if k != "B")
# cse-2004-cs-66: 11111010 × 00001010 (−6 × 10 = −60) in 8 bits.
assert tw("11111010") * tw("00001010") == -60 == tw("11000100") and key("cse-2004-cs-66") == "A"
# it-2006-cs-38: rows 5 (100) and 8 (111).
assert (table["100"], table["111"]) == (-2, 0) and key("it-2006-cs-38") == "C"
# it-2008-it-42 and cse-2025-2-cs-22: operation counts.
assert bl.booth_ops("0111011110111101") == 8 and key("it-2008-it-42") == "B"
assert bl.booth_ops("1010010010101010") == 13 and key("cse-2025-2-cs-22").startswith("13")

# ── Practice ───────────────────────────────────────────────────────────────
P = nl.practice()
q = P["nx-dl-01-10-q01"]
dig = lambda t: [int(x) for x in t.replace("$", "").replace("\\ ", " ").replace("{", "").replace("}", "").replace("+", "").split()]
got = {o["l"]: dig(o["t"]) for o in q["options"]}
assert got["A"] == bl.booth_digits("00101101") and got["B"] == [-d for d in got["A"]] and bl.digits_value(got["D"]) == 46
assert bl.digits_value(got["C"]) == 45 and set(got["C"]) <= {0, 1}
nl.assert_mcq(q, "A")
nl.assert_nat(P["nx-dl-01-10-q02"], bl.booth_ops("1100" * 4))
q = P["nx-dl-01-10-q03"]
c3 = {o["l"]: bl.booth_ops(o["t"].strip("$").replace("\\,", "")) for o in q["options"]}
assert c3 == {"A": 4, "B": 8, "C": 1, "D": 4}
nl.assert_mcq(q, max(c3, key=c3.get))
nl.assert_nat(P["nx-dl-01-10-q04"], tw(signed_shift_add("1011", "0110", 4)))
q = P["nx-dl-01-10-q05"]
truth = {"A": bl.fmt(bl.booth_digits("0111")) == "+1 0 0 −1", "B": bl.booth_ops("00001111") == 2,
         "C": all(bl.booth_ops("".join(t)) <= "".join(t).count("1") for t in itertools.product("01", repeat=8)), "D": False}
nl.assert_msq(q, [k for k, t in truth.items() if t])
q = P["nx-dl-01-10-q06"]
got = {o["l"]: dig(o["t"]) for o in q["options"]}
assert got["A"] == bl.bitpair_digits("01101011") and bl.digits_value(got["C"], 4) == 109 and got["B"] == [1, 2, 2, 3]
assert nl.to_base(107, 4) == "1223" and got["D"] == [-d for d in got["A"]][:1] + got["D"][1:]
nl.assert_mcq(q, "A")
A, B = b2("1101"), b2("0111")
nl.assert_nat(P["nx-dl-01-10-q07"], (A * B >> 2) & 1)
assert A * B == 91 == b2("1011011")
q = P["nx-dl-01-10-q08"]
tr, p = bl.booth_trace(5, b2("0110"), 4)
op, Areg, Qreg, q1 = tr[1]
assert (f"{Areg % 16:04b}", f"{Qreg:04b}", q1) == ("1101", "1001", 1) and p == 30
nl.assert_mcq(q, "A")

print("l10_multiplication_booth: every value in the lesson, its 8 PYQ keys and its practice answers check out")
