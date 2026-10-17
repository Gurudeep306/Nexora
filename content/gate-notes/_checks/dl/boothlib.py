"""Exact helpers for signed multiplication and Booth recoding (Digital Logic Chapter 1, lesson 10).

Run directly for a self-test (brute force over every 2's-complement multiplier up to 10 bits)."""
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import numlib as nl  # noqa: E402


def booth_digits(q):
    """Radix-2 Booth digits of a bit string q (MSB first): d_i = q_{i-1} - q_i with q_{-1} = 0. Returned MSB first."""
    bits = [int(c) for c in q][::-1]                     # bits[i] = q_i
    prev = [0] + bits[:-1]
    return [p - b for b, p in zip(bits, prev)][::-1]


def digits_value(ds, radix=2):
    v = 0
    for d in ds:
        v = v * radix + d
    return v


def booth_ops(q):
    """Number of additions/subtractions of radix-2 Booth = number of non-zero recoded digits."""
    return sum(1 for d in booth_digits(q) if d)


def fmt(ds):
    return " ".join({1: "+1", -1: "−1", 0: "0", 2: "+2", -2: "−2"}[d] for d in ds)


def bitpair_digit(q1, q0, qm1):
    return -2 * q1 + q0 + qm1


def bitpair_digits(q):
    """Radix-4 (bit-pair) digits of q (even length, MSB first), from triples (q_{i+1}, q_i, q_{i-1}), i even."""
    bits = [int(c) for c in q][::-1]
    assert len(bits) % 2 == 0
    out = []
    for i in range(0, len(bits), 2):
        qm1 = bits[i - 1] if i else 0
        out.append(bitpair_digit(bits[i + 1], bits[i], qm1))
    return out[::-1]


def booth_trace(m, q, n):
    """Register trace of radix-2 Booth: M (int), Q (int pattern), n bits. Returns list of (op, A, Q, Q-1) after each step
    and the 2n-bit product pattern. A is kept n+1 bits wide so that −M never overflows."""
    w = n + 1
    A, Q, Qm1 = 0, q, 0
    M = m % 2 ** w
    trace = []
    for _ in range(n):
        pair = (Q & 1, Qm1)
        op = {(1, 0): "A − M", (0, 1): "A + M"}.get(pair, "none")
        if pair == (1, 0):
            A = (A - M) % 2 ** w
        elif pair == (0, 1):
            A = (A + M) % 2 ** w
        # arithmetic right shift of the combined A, Q, Q-1
        Qm1 = Q & 1
        Q = (Q >> 1) | ((A & 1) << (n - 1))
        sign = A >> (w - 1)
        A = (A >> 1) | (sign << (w - 1))
        trace.append((op, A, Q, Qm1))
    prod = ((A << n) | Q) % 2 ** (2 * n)
    return trace, prod


if __name__ == "__main__":
    for n in range(2, 11):
        for v in range(-(2 ** (n - 1)), 2 ** (n - 1)):
            q = nl.to_twos(v, n)
            assert digits_value(booth_digits(q)) == v, (q, v)
            if n % 2 == 0:
                assert digits_value(bitpair_digits(q), 4) == v
            assert booth_ops(q) == sum(1 for i in range(n) if (int(q[::-1][i]) != (int(q[::-1][i - 1]) if i else 0)))
    for n in range(2, 7):
        for m in range(-(2 ** (n - 1)), 2 ** (n - 1)):
            for v in range(-(2 ** (n - 1)), 2 ** (n - 1)):
                _, prod = booth_trace(m, int(nl.to_twos(v, n), 2), n)
                assert nl.from_twos(nl.to_base(prod, 2, 2 * n)) == m * v, (m, v)
    print("boothlib: self-test passed")
