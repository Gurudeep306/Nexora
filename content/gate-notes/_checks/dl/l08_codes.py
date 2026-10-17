"""Checks for dl/01-number-systems/08-codes: BCD, excess-3, weighted and self-complementing codes,
Gray conversions and successor tables, parity, Hamming distance and Hamming (7,4), PYQ key
(re-derived by brute force) and practice answers."""
import json
import math
import pathlib
import sys
from itertools import combinations

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import numlib as nl  # noqa: E402

L = nl.lesson_text("08-codes.md")
has = lambda *s: nl.must_contain(L, *s)


def successor(width, bit):
    """Minterms (indexed by the Gray input h) where bit `bit` of Gray(n+1 mod 2^w) is 1."""
    return sorted(nl.gray(n) for n in range(2 ** width) if (nl.gray((n + 1) % 2 ** width) >> bit) & 1)


# BCD / excess-3.
assert nl.bcd(59) == "0101 1001" and nl.xs3(59) == "1000 1100" and int("01011001", 2) == 89
assert nl.bcd(25) == "0010 0101" and int("00100101", 2) == 37
assert int("1010", 2) > 9 and nl.bcd(73) == "0111 0011"
assert nl.min_bits_for_decimal_digits(6) == 20 and 2 ** 20 == 1048576 and round(6 * math.log2(10), 2) == 19.93
codes2421 = nl.weighted_codes([2, 4, 2, 1])
assert [d for d, c in codes2421.items() if len(c) == 2] == [2, 3, 4, 5, 6, 7] and codes2421[6] == ["0110", "1100"]
assert [nl.WEIGHTED_2421[d] for d in range(10)] == ["0000", "0001", "0010", "0011", "0100", "1011", "1100", "1101", "1110", "1111"]
assert all(nl.weighted_value(nl.WEIGHTED_2421[d], [2, 4, 2, 1]) == d for d in range(10))
# Self-complementing.
xs3 = {d: nl.to_base(d + 3, 2, 4) for d in range(10)}
bcd = {d: nl.to_base(d, 2, 4) for d in range(10)}
c842 = {d: nl.weighted_codes([8, 4, -2, -1])[d][0] for d in range(10)}
assert all(len(v) == 1 for v in nl.weighted_codes([8, 4, -2, -1]).values())
assert nl.is_self_complementing(xs3) and nl.is_self_complementing(nl.WEIGHTED_2421) and nl.is_self_complementing(c842)
assert not nl.is_self_complementing(bcd) and bcd[9] == "1001"
assert xs3[2] == "0101" and xs3[7] == "1010" and c842[4] == "0100" and c842[5] == "1011"
assert [d for d, c in nl.weighted_codes([7, 1, 1, 0]).items() if not c] == [3, 4, 5, 6]
# Theorem check by brute force: every weighted, self-complementing table has weights summing to 9.
import itertools
for ws in itertools.product(range(-3, 10), repeat=4):
    table = nl.weighted_codes(list(ws))
    if all(table[d] for d in range(10)):
        for choice in itertools.product(*[table[d] for d in range(10)]):
            t = dict(enumerate(choice))
            if len(set(choice)) == 10 and nl.is_self_complementing(t):
                assert sum(ws) == 9, ws
                break

# Gray.
assert nl.gray_bits(11, 4) == "1110" and int("1011", 2) ^ int("0101", 2) == int("1110", 2)
assert nl.to_base(nl.gray_inv(0b101100), 2, 6) == "110111" and 0b110111 ^ 0b011011 == 0b101100 and 0b110111 == 55
assert nl.reflected_gray(3) == ["000", "001", "011", "010", "110", "111", "101", "100"]
assert nl.gray_bits(15, 4) == "1000" and nl.gray_bits(16, 5) == "11000"
assert nl.gray_bits(13, 4) == "1011" and 0b1101 ^ 0b0110 == 0b1011
wrong = lambda g: g[0] + "".join(str(int(g[i]) ^ int(g[i + 1])) for i in range(len(g) - 1))
assert wrong("1110") == "1001" and nl.to_base(nl.gray_inv(0b1110), 2, 4) == "1011"
has("$1101 \\oplus 0110 = 1011$", "the wrong rule gives $1001$ instead of $1011$")
# Successor functions.
assert nl.gray_inv(0b0110) == 4 and nl.gray_bits(5, 4) == "0111"
assert successor(2, 1) == [1, 3] and successor(2, 0) == [0, 1]
assert successor(3, 2) == [2, 5, 6, 7] and sorted(n for n in range(8) if nl.gray(n + 1) >> 2 & 1 and n < 7) == [3, 4, 5, 6]
assert successor(3, 0) == [0, 1, 6, 7]
has("$g_2 = \\Sigma(2, 5, 6, 7)$", "$g_1 = \\Sigma(1, 3) = h_0$")

# Parity, distance, Hamming.
assert nl.parity_bit("1101001") == "0"
assert "11010010".count("1") % 2 == 0 and "01010010".count("1") == 3 and "00010010".count("1") == 2
w = nl.hamming74_encode("1011")
assert w == "0110011" and nl.flip(w, 6) == "0110001" and nl.hamming74_syndrome("0110001") == (6, (1, 1, 0))
assert nl.parity_bits_needed(4) == 3 and nl.parity_bits_needed(11) == 4 and 2 ** 2 < 4 + 2 + 1
code = [nl.hamming74_encode(nl.to_base(d, 2, 4)) for d in range(16)]
assert min(nl.hamming_distance(a, b) for a, b in combinations(code, 2)) == 3
parity_code = [c + nl.parity_bit(c) for c in (nl.to_base(k, 2, 3) for k in range(8))]
assert min(nl.hamming_distance(a, b) for a, b in combinations(parity_code, 2)) == 2
ext = [c + nl.parity_bit(c) for c in code]
assert min(nl.hamming_distance(a, b) for a, b in combinations(ext, 2)) == 4
d = 4
assert d - 1 == 3 and (d - 1) // 2 == 1
assert ord("A") == 0x41 == 65 and ord("a") == 0x61 == 97 and ord("a") ^ ord("A") == 0x20 and ord("0") == 0x30 == 48

# PYQ key: cse-2006-cs-40 (re-derive all four option lists).
bank = {q["id"]: q for q in json.loads((nl.ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}
q = bank["cse-2006-cs-40"]
claims = {"A": (0, [1, 2, 3, 6, 10, 13, 14, 15]), "B": (1, [4, 9, 10, 11, 12, 13, 14, 15]),
          "C": (2, [2, 4, 5, 6, 7, 12, 13, 15]), "D": (3, [0, 1, 6, 7, 10, 11, 12, 13])}
for k, (bit, lst) in claims.items():
    nums = sorted(int(x) for x in q["options"][ord(k) - 65]["t"].split("Sigma(")[1].split(")")[0].split(","))
    assert nums == lst, (k, nums)
assert [k for k, (bit, lst) in claims.items() if successor(4, bit) == lst] == ["C"] == [q["answer"]]

# Practice.
P = nl.practice()
q = P["nx-dl-01-08-q01"]
nl.assert_mcq(q, [k for k, t in nl.option_values(q).items() if t.strip("$") == nl.gray_bits(13, 4)][0])
assert nl.to_base(nl.gray_inv(0b1101), 2, 4) == "1001"
nl.assert_nat(P["nx-dl-01-08-q02"], nl.gray_inv(0b1101))
assert int(wrong("1101"), 2) == 11
nl.assert_msq(P["nx-dl-01-08-q03"], [k for k, t in {"A": xs3, "B": bcd, "C": nl.WEIGHTED_2421, "D": c842}.items() if nl.is_self_complementing(t)])
nl.assert_nat(P["nx-dl-01-08-q04"], sum(1 for p in range(256) if (p >> 4) > 9 or (p & 15) > 9))
q = P["nx-dl-01-08-q05"]
nl.assert_mcq(q, [k for k, t in nl.option_values(q).items() if t.strip("$").replace("\\;", " ") == nl.xs3(47)][0])
assert nl.to_base(50, 2, 8) == "00110010" and nl.bcd(47) == "0100 0111"
nl.assert_nat(P["nx-dl-01-08-q06"], nl.parity_bits_needed(11))
q = P["nx-dl-01-08-q07"]
syn = nl.hamming74_syndrome("1110110")[0]
nl.assert_mcq(q, {3: "A", 6: "B", 5: "C", 0: "D"}[syn])
assert nl.flip("1110110", 3) == nl.hamming74_encode("0110") == "1100110" and nl.hamming74_syndrome("1110110")[1] == (0, 1, 1)
nl.assert_nat(P["nx-dl-01-08-q08"], next(dm for dm in range(1, 20) if (dm - 1) // 2 >= 2))
q = P["nx-dl-01-08-q09"]
opts = {k: sorted(int(x) for x in t.split("Sigma(")[1].split(")")[0].split(",")) for k, t in nl.option_values(q).items()}
nl.assert_mcq(q, [k for k, v in opts.items() if v == successor(3, 0)][0])
assert opts["B"] == sorted(n for n in range(8) if nl.gray((n + 1) % 8) & 1) and opts["D"] == successor(3, 2)

# Second-pass review: in q07 the last check alone passes (so "no error" comes from computing only it).
r = "1110110"
assert sum(int(r[k - 1]) for k in (4, 5, 6, 7)) % 2 == 0 and sum(int(r[k - 1]) for k in (1, 3, 5, 7)) % 2 == 1
assert r.count("1") == 5 and nl.parity_bits_needed(11) == 4 and int(math.log2(11)) == 3

print("l05_codes: every value in the lesson, its PYQ key and its practice answers check out")
