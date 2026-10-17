"""Shared, exact number-system helpers for the Digital Logic Chapter 1 checks.

Every lesson check (l01_*.py … l05_*.py), the viz generator (_viz_ch1.py) and the
practice-answer checks import this module. Arithmetic is exact (int and
fractions.Fraction); nothing here uses floats.

Run directly, it self-tests every helper against Python's own conversions.
"""
from fractions import Fraction
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[4]
CONTENT = ROOT / "content" / "gate-notes" / "dl"
CH1 = CONTENT / "01-number-systems"
DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


# ── Place value ─────────────────────────────────────────────────────────────

def digit(ch):
    return int(ch, 36)


def valid_in(numeral, base):
    """True when every digit of the numeral is < base."""
    return all(digit(c) < base for c in numeral.upper().replace(".", "").lstrip("-"))


def value(numeral, base):
    """Exact value of a base-b numeral with an optional radix point, e.g. value('1A.8', 16)."""
    s = numeral.upper().replace(" ", "")
    neg = s.startswith("-")
    s = s.lstrip("-")
    whole, _, frac = s.partition(".")
    assert valid_in(s, base), f"{numeral} is not a valid base-{base} numeral"
    n = Fraction(0)
    for c in whole:
        n = n * base + digit(c)
    for i, c in enumerate(frac, start=1):
        n += Fraction(digit(c), base ** i)
    return -n if neg else n


def poly_value(numeral, b):
    """Value of a numeral as a polynomial in an unknown base b (b may be any int; digits not checked)."""
    s = numeral.upper()
    whole, _, frac = s.partition(".")
    n = Fraction(0)
    for c in whole:
        n = n * b + digit(c)
    for i, c in enumerate(frac, start=1):
        n += Fraction(digit(c), b ** i)
    return n


def horner_trace(numeral, base):
    """Running totals of the Horner chain: start at 0, then total*b + digit for each digit."""
    t, out = 0, [0]
    for c in numeral.upper():
        t = t * base + digit(c)
        out.append(t)
    return out


def expansion_terms(numeral, base):
    """[(digit, power, digit*base**power)] for the integer part, left to right."""
    s = numeral.upper()
    k = len(s) - 1
    return [(digit(c), k - i, digit(c) * base ** (k - i)) for i, c in enumerate(s)]


def to_base(n, base, width=0):
    """Non-negative integer → base-b numeral (upper-case digits), zero-padded to width."""
    assert n >= 0 and 2 <= base <= 36 and Fraction(n).denominator == 1
    n = int(n)
    if n == 0:
        s = "0"
    else:
        s = ""
        while n:
            n, r = divmod(n, base)
            s = DIGITS[r] + s
    return s.rjust(width, "0")


def division_steps(n, base):
    """Repeated division: [(dividend, quotient, remainder)], last row has quotient 0."""
    rows = []
    while True:
        q, r = divmod(n, base)
        rows.append((n, q, r))
        n = q
        if n == 0:
            return rows


def digit_count(n, base):
    """Number of base-b digits of a positive integer (= floor(log_b n) + 1), computed exactly."""
    assert n >= 1
    k = 0
    while base ** k <= n:
        k += 1
    return k


def min_bits_for_decimal_digits(k):
    """Bits that hold every k-digit decimal number: smallest n with 2**n >= 10**k."""
    n = 0
    while 2 ** n < 10 ** k:
        n += 1
    return n


# ── Fractions ───────────────────────────────────────────────────────────────

def frac_steps(x, base, max_digits=40):
    """Repeated multiplication of a fraction 0 <= x < 1.
    Returns (rows, cycle_start): rows are (x_before, product, digit, x_after);
    cycle_start is the index of the row whose x_before repeats later (None if it terminates)."""
    x = Fraction(x)
    assert 0 <= x < 1
    seen, rows = {}, []
    while x != 0 and len(rows) < max_digits:
        if x in seen:
            return rows, seen[x]
        seen[x] = len(rows)
        p = x * base
        d = int(p)  # floor for p >= 0
        rows.append((x, p, d, p - d))
        x = p - d
    return rows, None


def frac_digits(x, base, places):
    """First `places` base-b digits of the fraction part of x (truncated), as a string."""
    x = Fraction(x) - int(Fraction(x))
    s = ""
    for _ in range(places):
        x *= base
        d = int(x)
        s += DIGITS[d]
        x -= d
    return s


def expand_fraction(x, base, max_digits=60):
    """(prefix, repetend) of the base-b expansion of 0 <= x < 1. repetend is '' if it terminates."""
    rows, cyc = frac_steps(x, base, max_digits)
    ds = "".join(DIGITS[r[2]] for r in rows)
    if cyc is None:
        return ds, ""
    return ds[:cyc], ds[cyc:]


def terminates(x, base):
    """p/q (lowest terms) terminates in base b iff every prime factor of q divides b."""
    q = Fraction(x).denominator
    for p in prime_factors(q):
        if base % p:
            return False
    return True


def prime_factors(n):
    out, d = set(), 2
    while d * d <= n:
        while n % d == 0:
            out.add(d)
            n //= d
        d += 1
    if n > 1:
        out.add(n)
    return out


def to_base_mixed(x, base, places):
    """Mixed number x >= 0 → 'int.frac' in base b with `places` truncated fraction digits."""
    x = Fraction(x)
    i = int(x)
    return to_base(i, base) + ("." + frac_digits(x, base, places) if places else "")


# ── Fixed point ─────────────────────────────────────────────────────────────

def fixed_range(i, f):
    """Unsigned i.f fixed point: (min, max, resolution, count)."""
    res = Fraction(1, 2 ** f)
    return Fraction(0), (2 ** (i + f) - 1) * res, res, 2 ** (i + f)


def fixed_representable(x, i, f):
    """x is exact in unsigned i.f iff x * 2^f is an integer in [0, 2^(i+f) - 1]."""
    s = Fraction(x) * 2 ** f
    return s.denominator == 1 and 0 <= s <= 2 ** (i + f) - 1


def fixed_bits(x, i, f):
    s = Fraction(x) * 2 ** f
    assert s.denominator == 1
    b = to_base(int(s), 2, i + f)
    return b[:i] + "." + b[i:]


def q_range(i, f):
    """Signed (2's complement) Q-format with i integer bits (incl. sign) and f fraction bits."""
    res = Fraction(1, 2 ** f)
    return Fraction(-(2 ** (i - 1))), Fraction(2 ** (i - 1)) - res, res


# ── Signed integers ─────────────────────────────────────────────────────────

def twos_range(n):
    return -(2 ** (n - 1)), 2 ** (n - 1) - 1


def sm_range(n):
    return -(2 ** (n - 1) - 1), 2 ** (n - 1) - 1


ones_range = sm_range


def to_twos(v, n):
    lo, hi = twos_range(n)
    assert lo <= v <= hi, f"{v} does not fit in {n}-bit 2's complement"
    return to_base(v % (2 ** n), 2, n)


def from_twos(bits):
    bits = bits.replace(" ", "")
    n = len(bits)
    u = int(bits, 2)
    return u - 2 ** n if bits[0] == "1" else u


def to_sm(v, n):
    lo, hi = sm_range(n)
    assert lo <= v <= hi
    return ("1" if v < 0 else "0") + to_base(abs(v), 2, n - 1)


def from_sm(bits):
    bits = bits.replace(" ", "")
    m = int(bits[1:], 2) if len(bits) > 1 else 0
    return -m if bits[0] == "1" else m


def to_ones(v, n):
    lo, hi = ones_range(n)
    assert lo <= v <= hi
    if v >= 0:
        return to_base(v, 2, n)
    return invert(to_base(-v, 2, n))


def from_ones(bits):
    bits = bits.replace(" ", "")
    if bits[0] == "0":
        return int(bits, 2)
    return -int(invert(bits), 2)


def from_excess(bits, k):
    return int(bits.replace(" ", ""), 2) - k


def invert(bits):
    return "".join("1" if b == "0" else "0" if b == "1" else b for b in bits)


def add_one(bits):
    n = len(bits)
    return to_base((int(bits, 2) + 1) % 2 ** n, 2, n)


def negate_twos(bits):
    return add_one(invert(bits))


def copy_first_one(bits):
    """Copy from the right up to and including the first 1, invert the rest."""
    i = bits.rfind("1")
    if i < 0:
        return bits
    return invert(bits[:i]) + bits[i:]


def sign_extend(bits, n):
    return bits[0] * (n - len(bits)) + bits


def sm_extend(bits, n):
    return bits[0] + "0" * (n - len(bits)) + bits[1:]


def min_width_twos(lo, hi):
    """Smallest n with every integer in [lo, hi] representable in n-bit 2's complement."""
    n = 1
    while not (twos_range(n)[0] <= lo and hi <= twos_range(n)[1]):
        n += 1
    return n


def asr(bits, k=1):
    return bits[0] * k + bits[:-k] if k else bits


def lsr(bits, k=1):
    return "0" * k + bits[:-k] if k else bits


def asl(bits, k=1):
    """Arithmetic (= logical) left shift; returns (pattern, overflowed)."""
    n = len(bits)
    out = bits[k:] + "0" * k
    over = from_twos(out) != from_twos(bits) * 2 ** k
    return out, over


def radix_complement(numeral, base, n=None):
    """r's complement of an n-digit base-r numeral: r^n - N (0 maps to 0)."""
    n = n or len(numeral)
    N = int(value(numeral, base))
    return to_base((base ** n - N) % base ** n, base, n)


def diminished_complement(numeral, base, n=None):
    """(r-1)'s complement: r^n - 1 - N, digit by digit (r-1-d)."""
    n = n or len(numeral)
    N = int(value(numeral, base))
    return to_base(base ** n - 1 - N, base, n)


# ── Codes ───────────────────────────────────────────────────────────────────

def gray(n):
    return n ^ (n >> 1)


def gray_inv(g):
    b = 0
    while g:
        b ^= g
        g >>= 1
    return b


def gray_bits(n, width):
    return to_base(gray(n), 2, width)


def reflected_gray(width):
    """Build the reflected list by mirroring: G(1) = [0, 1]; G(k+1) = 0·G(k), 1·reverse(G(k))."""
    g = ["0", "1"]
    for _ in range(width - 1):
        g = ["0" + c for c in g] + ["1" + c for c in reversed(g)]
    return g


def bcd(n):
    return " ".join(to_base(int(d), 2, 4) for d in str(n))


def xs3(n):
    return " ".join(to_base(int(d) + 3, 2, 4) for d in str(n))


WEIGHTED_2421 = {0: "0000", 1: "0001", 2: "0010", 3: "0011", 4: "0100",
                 5: "1011", 6: "1100", 7: "1101", 8: "1110", 9: "1111"}


def weighted_value(code, weights):
    return sum(w for b, w in zip(code, weights) if b == "1")


def weighted_codes(weights):
    """Every 4-bit pattern grouped by the digit it encodes (0–9) under the given weights."""
    out = {d: [] for d in range(10)}
    for p in range(16):
        c = to_base(p, 2, 4)
        v = weighted_value(c, weights)
        if 0 <= v <= 9:
            out[v].append(c)
    return out


def is_self_complementing(table):
    """table: digit → code. True when code(9 - d) == NOT code(d) for every d."""
    return all(table[9 - d] == invert(table[d]) for d in range(10))


def parity_bit(bits, even=True):
    ones = bits.count("1") % 2
    return str(ones) if even else str(1 - ones)


def hamming_distance(a, b):
    return sum(x != y for x, y in zip(a, b))


def parity_bits_needed(m):
    p = 0
    while 2 ** p < m + p + 1:
        p += 1
    return p


def hamming74_encode(d):
    """Data d3 d5 d6 d7 (string of 4 bits in that order) → 7-bit word, positions 1..7 left to right,
    even parity: p1 covers 1,3,5,7; p2 covers 2,3,6,7; p4 covers 4,5,6,7."""
    d3, d5, d6, d7 = (int(c) for c in d)
    p1 = d3 ^ d5 ^ d7
    p2 = d3 ^ d6 ^ d7
    p4 = d5 ^ d6 ^ d7
    return "".join(str(b) for b in (p1, p2, d3, p4, d5, d6, d7))


def hamming74_syndrome(w):
    b = [None] + [int(c) for c in w]
    s1 = b[1] ^ b[3] ^ b[5] ^ b[7]
    s2 = b[2] ^ b[3] ^ b[6] ^ b[7]
    s4 = b[4] ^ b[5] ^ b[6] ^ b[7]
    return 4 * s4 + 2 * s2 + s1, (s4, s2, s1)


def flip(w, pos):
    """Flip bit at 1-based position pos (left to right)."""
    i = pos - 1
    return w[:i] + ("1" if w[i] == "0" else "0") + w[i + 1:]


# ── Lesson and practice helpers ─────────────────────────────────────────────

def lesson_text(name):
    return (CH1 / name).read_text()


def practice():
    return {q["id"]: q for q in json.loads((CH1 / "practice.json").read_text())}


def must_contain(text, *snippets, where="lesson"):
    """Every snippet must appear verbatim in the text (ties a computed value to what is written)."""
    missing = [s for s in snippets if s not in text]
    assert not missing, f"{where} is missing: {missing}"


def option_values(q):
    return {o["l"]: o["t"] for o in q.get("options", [])}


def assert_mcq(q, correct_letter, why=""):
    assert q["type"] == "MCQ", q["id"]
    assert q["answer"] == correct_letter, f"{q['id']}: key {q['answer']} but computed {correct_letter} {why}"
    for w in q["common_wrong"]:
        assert w["answer"] != correct_letter, f"{q['id']}: a common wrong answer is the key"


def assert_msq(q, correct_letters):
    assert q["type"] == "MSQ", q["id"]
    assert sorted(q["answer"]) == sorted(correct_letters), f"{q['id']}: key {q['answer']} but computed {sorted(correct_letters)}"
    for w in q["common_wrong"]:
        assert sorted([w["answer"]] if isinstance(w["answer"], str) else w["answer"]) != sorted(correct_letters)


def assert_nat(q, computed):
    assert q["type"] == "NAT", q["id"]
    a = q["answer"]
    c = Fraction(computed)
    if isinstance(a, list):
        assert Fraction(str(a[0])) <= c <= Fraction(str(a[1])), f"{q['id']}: key {a} but computed {computed}"
    else:
        assert Fraction(str(a)) == c, f"{q['id']}: key {a} but computed {computed}"
    for w in q["common_wrong"]:
        assert Fraction(str(w["answer"])) != c, f"{q['id']}: a common wrong answer equals the key"


def strip_tex(s):
    return re.sub(r"[\\${}]", "", s)


# ── Self-test ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    for b in range(2, 37):
        for n in [0, 1, 7, 35, 36, 1000, 123456]:
            assert int(to_base(n, b), b) == n
            assert value(to_base(n, b), b) == n
            assert horner_trace(to_base(n, b), b)[-1] == n
            if n:
                assert digit_count(n, b) == len(to_base(n, b))
    assert value("1A.8", 16) == Fraction(53, 2)
    assert [r[2] for r in division_steps(1118, 16)] == [14, 5, 4]
    assert expand_fraction(Fraction(1, 10), 2) == ("0", "0011")
    assert expand_fraction(Fraction(5, 8), 2) == ("101", "")
    assert terminates(Fraction(1, 4), 2) and not terminates(Fraction(1, 10), 2) and terminates(Fraction(1, 3), 3)
    for n in range(1, 9):
        lo, hi = twos_range(n)
        for v in range(lo, hi + 1):
            p = to_twos(v, n)
            assert from_twos(p) == v
            assert from_twos(sign_extend(p, n + 3)) == v
            if v != lo:
                assert from_twos(negate_twos(p)) == -v
            assert negate_twos(p) == copy_first_one(p)
            assert from_twos(asr(p)) == v // 2
        if n >= 2:
            lo, hi = sm_range(n)
            for v in range(lo, hi + 1):
                assert from_sm(to_sm(v, n)) == v and from_ones(to_ones(v, n)) == v
                assert from_sm(sm_extend(to_sm(v, n), n + 2)) == v
    assert gray_bits(11, 4) == "1110" and gray_inv(int("101100", 2)) == int("110111", 2)
    assert reflected_gray(4) == [gray_bits(i, 4) for i in range(16)]
    for k in range(1, 8):
        g = reflected_gray(k)
        assert all(hamming_distance(g[i], g[(i + 1) % len(g)]) == 1 for i in range(len(g)))
    for d in range(16):
        w = hamming74_encode(to_base(d, 2, 4))
        assert hamming74_syndrome(w)[0] == 0
        for pos in range(1, 8):
            assert hamming74_syndrome(flip(w, pos))[0] == pos
    assert parity_bits_needed(4) == 3 and parity_bits_needed(11) == 4
    assert radix_complement("0371", 10) == "9629" and diminished_complement("1234", 8) == "6543"
    assert radix_complement("0000", 10) == "0000"
    assert min_bits_for_decimal_digits(32) == 107
    print("numlib: self-test passed")
