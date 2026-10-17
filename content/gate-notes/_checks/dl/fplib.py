"""Exact floating-point helpers for the Digital Logic Chapter 1 floating-point lessons (5, 6, 7).

Everything is exact: values are fractions.Fraction (or the strings 'inf', '-inf', 'nan'),
patterns are Python ints. IEEE-754 binary32/binary64 behaviour comes from a generic
encoder (any exponent width k, fraction width f, round-to-nearest-even or another mode,
with denormals) that the self-test cross-checks against Python's own `struct` (the C
float/double conversions) and `math.ulp` on thousands of values.

    python3 content/gate-notes/_checks/dl/fplib.py     # self-test
"""
from fractions import Fraction as F
import math
import random
import struct

SINGLE = (8, 23)   # (exponent bits k, fraction bits f)
DOUBLE = (11, 52)
INF, NINF, NAN = "inf", "-inf", "nan"


# ── Python's own IEEE conversions (the reference) ─────────────────────────

def f32_bits(x):
    """binary32 pattern of a Python float, via C's float conversion (round to nearest even)."""
    return struct.unpack(">I", struct.pack(">f", x))[0]


def f64_bits(x):
    return struct.unpack(">Q", struct.pack(">d", x))[0]


def bits_f32(n):
    return struct.unpack(">f", struct.pack(">I", n))[0]


def bits_f64(n):
    return struct.unpack(">d", struct.pack(">Q", n))[0]


def f32(x):
    """Round a Python float to binary32 and back (one float32 operation's rounding)."""
    return bits_f32(f32_bits(x))


# ── Generic IEEE-style formats ──────────────────────────────────────────────

def bias(k):
    return 2 ** (k - 1) - 1


def fields(n, k=8, f=23):
    """Pattern → (sign, exponent field, fraction field)."""
    return n >> (k + f), (n >> f) & (2 ** k - 1), n & (2 ** f - 1)


def pack(s, e, frac, k=8, f=23):
    assert 0 <= e < 2 ** k and 0 <= frac < 2 ** f and s in (0, 1)
    return (s << (k + f)) | (e << f) | frac


def decode(n, k=8, f=23):
    """Exact value of an IEEE-style pattern (with denormals and the special values)."""
    s, e, frac = fields(n, k, f)
    sign = -1 if s else 1
    if e == 2 ** k - 1:
        return NAN if frac else (NINF if s else INF)
    if e == 0:
        return sign * F(frac, 2 ** f) * F(2) ** (1 - bias(k))   # 0.f × 2^(1−bias); ±0 when frac = 0
    return sign * (1 + F(frac, 2 ** f)) * F(2) ** (e - bias(k))


def classify(n, k=8, f=23):
    s, e, frac = fields(n, k, f)
    if e == 2 ** k - 1:
        return "nan" if frac else ("-inf" if s else "+inf")
    if e == 0:
        return ("-0" if s else "+0") if frac == 0 else "denormal"
    return "normal"


def floor_log2(x):
    """⌊log₂ x⌋ for a positive Fraction, exactly."""
    x = F(x)
    assert x > 0
    e = x.numerator.bit_length() - x.denominator.bit_length()
    while F(2) ** e > x:
        e -= 1
    while F(2) ** (e + 1) <= x:
        e += 1
    return e


def round_int(q, mode="rne", negative=False):
    """Round a non-negative Fraction q (a significand scaled to integer units) to an integer."""
    lo = q.numerator // q.denominator
    rest = q - lo
    if rest == 0:
        return lo
    if mode == "rtz":
        return lo
    if mode == "up":      # toward +inf
        return lo if negative else lo + 1
    if mode == "down":    # toward −inf
        return lo + 1 if negative else lo
    assert mode == "rne"
    if rest > F(1, 2):
        return lo + 1
    if rest < F(1, 2):
        return lo
    return lo if lo % 2 == 0 else lo + 1


def encode(x, k=8, f=23, mode="rne"):
    """Exact value (Fraction/int, or 'inf'/'-inf'/'nan') → IEEE-style pattern, with correct rounding."""
    top = 2 ** k - 1
    if x == NAN:
        return pack(0, top, 1 << (f - 1), k, f)       # the default quiet NaN
    if x in (INF, NINF):
        return pack(1 if x == NINF else 0, top, 0, k, f)
    if x == "-0":
        return pack(1, 0, 0, k, f)
    x = F(x)
    s = 1 if x < 0 else 0
    a = abs(x)
    if a == 0:
        return pack(s, 0, 0, k, f)
    emin = 1 - bias(k)
    E = max(floor_log2(a), emin)                      # denormals share the lowest exponent
    q = a / F(2) ** (E - f)                           # significand in units of the last place
    m = round_int(q, mode, negative=bool(s))
    if m == 2 ** (f + 1):                             # rounding carried into a new binade
        m //= 2
        E += 1
    if E > bias(k):                                    # overflow
        biggest = pack(s, top - 1, 2 ** f - 1, k, f)
        to_inf = mode == "rne" or (mode == "up" and not s) or (mode == "down" and s)
        return pack(s, top, 0, k, f) if to_inf else biggest
    if m < 2 ** f:                                     # denormal (or zero)
        return pack(s, 0, m, k, f)
    return pack(s, E + bias(k), m - 2 ** f, k, f)


def round_to(x, k=8, f=23, mode="rne"):
    """The representable value nearest x (per mode)."""
    return decode(encode(x, k, f, mode), k, f)


def hexs(n, bits=32):
    return f"{n:0{bits // 4}X}"


def binstr(n, bits=32):
    return f"{n:0{bits}b}"


def split_fields(n, k=8, f=23):
    b = binstr(n, 1 + k + f)
    return b[0], b[1:1 + k], b[1 + k:]


def largest(k=8, f=23):
    return (2 - F(1, 2 ** f)) * F(2) ** bias(k)


def smallest_normal(k=8, f=23):
    return F(2) ** (1 - bias(k))


def smallest_denormal(k=8, f=23):
    return F(2) ** (1 - bias(k) - f)


def ulp(x, k=8, f=23):
    """Gap from |x| up to the next representable magnitude (x representable, finite)."""
    a = abs(F(x))
    E = max(floor_log2(a), 1 - bias(k)) if a else 1 - bias(k)
    return F(2) ** (E - f)


def neighbours(x, k=8, f=23):
    n = encode(x, k, f)
    return decode(n - 1, k, f) if n & ((1 << (k + f)) - 1) else None, decode(n + 1, k, f)


# ── Arithmetic (one rounding per operation, as IEEE requires) ───────────────

def add(a, b, k=8, f=23, mode="rne"):
    return round_to(F(a) + F(b), k, f, mode)


def mul(a, b, k=8, f=23, mode="rne"):
    return round_to(F(a) * F(b), k, f, mode)


def div(a, b, k=8, f=23, mode="rne"):
    return round_to(F(a) / F(b), k, f, mode)


def grs(sig_bits, keep):
    """Split a bit string of significand bits (after the point) at `keep` bits:
    returns (kept, guard, round, sticky)."""
    kept, extra = sig_bits[:keep], sig_bits[keep:] + "00"
    return kept, int(extra[0]), int(extra[1]), int("1" in extra[2:])


def rne_from_grs(kept, g, r, s):
    """Round-to-nearest-even decision from the guard, round and sticky bits."""
    up = g == 1 and (r == 1 or s == 1 or kept[-1] == "1")
    return up


# ── Binary expansions and custom (textbook / GATE) formats ─────────────────

def frac_bits(x, n):
    """First n bits after the point of the fractional part of a non-negative Fraction (truncated)."""
    x = F(x) - int(F(x))
    out = ""
    for _ in range(n):
        x *= 2
        out += str(int(x))
        x -= int(x)
    return out


def binary(x, nfrac):
    """'110.11' style expansion of a non-negative Fraction (fraction truncated to nfrac bits)."""
    x = F(x)
    return f"{int(x):b}" + ("." + frac_bits(x, nfrac) if nfrac else "")


def normalise_fraction_form(x, base=2):
    """|x| = M · base^E with 1/base ≤ M < 1 (explicit leading digit, 0.1xxx form)."""
    a = abs(F(x))
    E = 0
    while a >= 1:
        a /= base
        E += 1
    while a < F(1, base):
        a *= base
        E -= 1
    return a, E


def normalise_hidden(x):
    """|x| = M · 2^E with 1 ≤ M < 2 (hidden-bit 1.f form)."""
    a = abs(F(x))
    E = floor_log2(a)
    return a / F(2) ** E, E


def sm_bits(v, n):
    """Sign-magnitude n-bit pattern of an integer."""
    assert abs(v) < 2 ** (n - 1)
    return ("1" if v < 0 else "0") + f"{abs(v):0{n - 1}b}"


def twos_bits(v, n):
    assert -(2 ** (n - 1)) <= v < 2 ** (n - 1)
    return f"{v % 2 ** n:0{n}b}"


def group4(bitstring):
    assert len(bitstring) % 4 == 0
    return "".join(f"{int(bitstring[i:i + 4], 2):X}" for i in range(0, len(bitstring), 4))


def dec_round(x, digits):
    """Round a Fraction to `digits` significant decimal digits (half-even on exact ties)."""
    x = F(x)
    if x == 0:
        return x
    e = 0
    a = abs(x)
    while a >= 10 ** digits:
        a /= 10
        e += 1
    while a < 10 ** (digits - 1):
        a *= 10
        e -= 1
    m = round_int(a, "rne")
    return (1 if x > 0 else -1) * F(m) * F(10) ** e


# ── Self-test ───────────────────────────────────────────────────────────────

def _selftest():
    rnd = random.Random(754)
    specials = [0.0, -0.0, 1.0, -1.0, 0.1, 1 / 3, 2.0 ** -126, 2.0 ** -149, 2.0 ** -150, 3 * 2.0 ** -150,
                2.0 ** -127, 3.4028234663852886e38, 1e-45, 7e-46, 1e38, 16777217.0, 0.2, 0.3, 123.456]
    vals = specials + [rnd.uniform(-1, 1) * 10 ** rnd.randint(-46, 38) for _ in range(4000)]
    vals += [math.ldexp(rnd.randint(1, 2 ** 30), rnd.randint(-180, 100)) for _ in range(2000)]
    for v in vals:
        if abs(v) > 3.4028234663852886e38 or (v == 0 and math.copysign(1, v) < 0):
            continue
        n = encode(F(v), *SINGLE)
        assert n == f32_bits(v), (v, hexs(n), hexs(f32_bits(v)))
        if v == v:
            back = decode(n, *SINGLE)
            assert back == F(bits_f32(n)), v
    for v in vals[:3000] + [5e-324, 2.2250738585072014e-308, 1.7976931348623157e308]:
        if v == 0 and math.copysign(1, v) < 0:
            continue
        assert encode(F(v), *DOUBLE) == f64_bits(v), v
        assert decode(f64_bits(v), *DOUBLE) == F(v)
        if v and math.isfinite(v):
            assert ulp(F(v), *DOUBLE) == F(math.ulp(v)), v
    # Every one of 2^16 half-ish patterns (k=5, f=10) round-trips; decode is monotone on positives.
    prev = None
    for n in range(0, 0x7C00):
        x = decode(n, 5, 10)
        assert encode(x, 5, 10) == n
        if prev is not None:
            assert x > prev
        prev = x
    # Specials.
    assert decode(0x7F800000) == INF and decode(0xFF800000) == NINF and decode(0x7FC00000) == NAN
    assert encode("-0") == f32_bits(-0.0) == 0x80000000 and encode(INF) == 0x7F800000 and encode(F(0)) == 0 and decode(0x80000000) == 0
    assert largest() == F(bits_f32(0x7F7FFFFF)) == (2 ** 24 - 1) * F(2) ** 104
    assert smallest_normal() == F(bits_f32(0x00800000)) and smallest_denormal() == F(bits_f32(1))
    assert encode((2 - F(1, 2 ** 24)) * F(2) ** 127) == 0x7F800000          # the midpoint rounds to +inf
    assert encode((2 - F(3, 2 ** 25)) * F(2) ** 127) == f32_bits((2 - 3 * 2.0 ** -25) * 2.0 ** 127) == 0x7F7FFFFF  # below it: max
    assert encode((2 - F(1, 2 ** 25)) * F(2) ** 127) == 0x7F800000          # above the midpoint: +inf
    assert encode(F(2) ** 128, mode="rtz") == 0x7F7FFFFF
    # Arithmetic agrees with a float32 machine (one rounding per operation).
    for _ in range(3000):
        a = f32(rnd.uniform(-1e6, 1e6) * 2.0 ** rnd.randint(-20, 20))
        b = f32(rnd.uniform(-1e6, 1e6) * 2.0 ** rnd.randint(-20, 20))
        assert add(F(a), F(b)) == F(f32(a + b))       # a + b in double is exact enough, then rounded once
        assert mul(F(a), F(b)) == F(f32(a * b))
    assert dec_round(F(10349, 100), 3) == 103 and dec_round(F(951, 100), 3) == F(951, 100)
    print("fplib: self-test passed")


if __name__ == "__main__":
    _selftest()
