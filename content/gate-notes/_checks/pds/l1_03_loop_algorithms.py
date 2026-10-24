"""Check: Chapter 1, Lesson 3 (loop algorithms, invariants and correctness).

Every C fact the lesson states, every worked-example number and every PYQ key is re-derived here by
compiling and running real C with the system compiler (common.run_c); the Pascal and pseudo-code
questions are simulated in Python from the language rules (or translated to C where the semantics
coincide). Invariants are checked state by state on many inputs, not only on the lesson's examples.
"""
import json
import math

import common as C

B = C.bank()
P = C.main_wrap
UB = ("-fsanitize=undefined", "-fno-sanitize-recover=all")


def out(body, before="", **kw):
    return C.c_out(P(body, includes=("stdio.h", "limits.h", "math.h"), before=before), **kw)


def ints(s):
    return [int(x) for x in s.split()]


def ub(body, before=""):
    """True when the program is stopped by the undefined-behaviour sanitizer."""
    r = C.run_c(P(body, includes=("stdio.h", "limits.h"), before=before), flags=UB)
    assert r.compiled, r.err
    return not r.ok


# ── The loop-correctness theorem: the coin-counting sanity check ─────────────
got = ints(out('for (int T = 0; T <= 1000; T++) { int pile = T, bags = 0; while (pile >= 100) { pile -= 100; bags++; } printf("%d %d ", bags, pile); }'))
assert got == [v for T in range(1001) for v in (T // 100, T % 100)]

# ── Worked examples: invariants and termination ──────────────────────────────
# ex-running-max: m = max(a[0..i-1]) at every test; n - 1 passes.
src = 'int a[7] = {3, -1, 8, 8, 2, 9, 4}, n = 7, m = a[0], i, passes = 0; for (i = 1; i < n; i++) { if (a[i] > m) m = a[i]; passes++; } printf("%d %d", m, passes);'
assert out(src) == "9 6"


# loop-invariant-1991 (Pascal, i >= 0 inside the body, so div and mod act on non-negative values).
def pascal_1991(i):
    states = [i]
    if i % 2 == 0:
        while i >= 0:
            i = i // 2  # Pascal div on a non-negative value = floor division
            i = i - 1 if i % 2 != 0 else i - 2
            states.append(i)
    return states


for i0 in range(0, 1001, 2):
    st = pascal_1991(i0)
    assert all(v % 2 == 0 and v >= -2 for v in st)  # the invariant (strengthened: i >= -2)
    assert all(b < a for a, b in zip(st, st[1:]))  # i is a variant
    assert st[-1] == -2
assert pascal_1991(10) == [10, 4, 0, -2]
assert B["cse-1991-a-1-vi"]["answer"].startswith("i mod 2 = 0")

# ex-strong-invariant: x + 3y = 3n, y >= 0, x % 3 == 0 hold at every test; x < 3n does not.
for n in range(0, 30):
    x, y = 0, n
    states = [(x, y)]
    while y > 0:
        x, y = x + 3, y - 1
        states.append((x, y))
    assert all(a + 3 * b == 3 * n and b >= 0 and a % 3 == 0 for a, b in states)
    assert not all(a < 3 * n for a, b in states)
    assert states[-1] == (3 * n, 0)
assert out("int n = 7, x = 0, y = n; while (y > 0) { x = x + 3; y = y - 1; } printf(\"%d\", x);") == "21"


# ex-variant-edge: v = 0 (x = 1), 2x (even), 2x + 3 (odd > 1) strictly decreases.
def v(x):
    return 0 if x == 1 else 2 * x if x % 2 == 0 else 2 * x + 3


for x0 in range(1, 100001):
    x = x0
    while x != 1:
        nx = x + 1 if x % 2 else x // 2
        assert v(nx) < v(x), x
        x = nx
got = out('long total = 0; for (int x0 = 1; x0 <= 100000; x0++) { int x = x0; while (x != 1) { x = (x % 2) ? x + 1 : x / 2; total++; } } printf("%ld", total);')
assert int(got) > 0  # every one of the 100 000 compiled loops terminated (run_c has a time limit)
assert out('int x = 7, c = 0; while (x != 1) { x = (x % 2) ? x + 1 : x / 2; c++; printf("%d ", x); } printf("| %d", c);') == "8 4 2 1 | 4"

# ── GCD by subtraction ───────────────────────────────────────────────────────
GCD = "int gsub(int x, int y, int *passes) { int m = x, n = y; *passes = 0; while (m != n) { if (m > n) m = m - n; else n = n - m; (*passes)++; } return n; }\n"
got = ints(out('int p; for (int x = 1; x <= 60; x++) for (int y = 1; y <= 60; y++) printf("%d ", gsub(x, y, &p));', before=GCD))
assert got == [math.gcd(x, y) for x in range(1, 61) for y in range(1, 61)]
# Passes < x + y, and passes = (sum of Euclid's quotients) - 1.
def quotients(a, b):
    qs = []
    while b:
        qs.append(a // b)
        a, b = b, a % b
    return qs


got = ints(out('int p; for (int x = 1; x <= 60; x++) for (int y = 1; y <= 60; y++) { gsub(x, y, &p); printf("%d ", p); }', before=GCD))
k = 0
for x in range(1, 61):
    for y in range(1, 61):
        assert got[k] < x + y and got[k] == sum(quotients(x, y)) - 1
        k += 1
assert out('int p; int g = gsub(126, 105, &p); printf("%d %d ", g, p); g = gsub(34, 21, &p); printf("%d %d ", g, p); g = gsub(100, 1, &p); printf("%d %d", g, p);', before=GCD) == "21 5 1 7 1 99"
assert quotients(126, 105) == [1, 5] and quotients(34, 21) == [1, 1, 1, 1, 1, 1, 2] and sum(quotients(34, 21)) == 8
# The remainder version: 2 passes for (126, 105), 1 for (100, 1).
REM = "int grem(int m, int n, int *passes) { int t; *passes = 0; while (n != 0) { t = m % n; m = n; n = t; (*passes)++; } return m; }\n"
assert out('int p; int g = grem(126, 105, &p); printf("%d %d ", g, p); g = grem(100, 1, &p); printf("%d %d", g, p);', before=REM) == "21 2 1 1"
# 126 = 2*3^2*7, 105 = 3*5*7.
assert 2 * 3 ** 2 * 7 == 126 and 3 * 5 * 7 == 105
# trap-gcd-precondition: y = 0 never ends; the do-while with x == y never ends; while with x == y returns x.
assert C.run_c(P('int m = 5, n = 0; while (m != n) { if (m > n) m = m - n; else n = n - m; } printf("%d", n);'), timeout=2).status is None
assert C.run_c(P('int x = 5, y = 5; do { if (x > y) x = x - y; else y = y - x; } while (x != y); printf("%d", x);'), timeout=2).status is None
assert out('int x = 5, y = 5; while (x != y) { if (x > y) x = x - y; else y = y - x; } printf("%d", x);') == "5"

# cse-2025-2-cs-23 (do-while): 21.
assert C.c_out(P(C.code_block(B["cse-2025-2-cs-23"]))) == "21"
assert B["cse-2025-2-cs-23"]["answer"] == "21 to 21"
assert out('int x = 126, y = 105, c = 0; do { if (x > y) x = x - y; else y = y - x; c++; printf("%d,%d ", x, y); } while (x != y);') == "21,105 21,84 21,63 21,42 21,21 "

# cse-2004-cs-41: the program prints gcd(x, y) (scanf input).
src = C.code_block(B["cse-2004-cs-41"]).replace("main ()", "#include <stdio.h>\nint main(void)")
for x, y in ((126, 105), (12, 18), (7, 13), (100, 75), (9, 9)):
    assert C.c_out(src, stdin=f"{x} {y}") == str(math.gcd(x, y))
assert C.key_letters(B["cse-2004-cs-41"]["answer"]) == ["C"]
# The other options: x + y, x mod y, lcm differ for (12, 18).
assert {12 + 18, 12 % 18, 36} & {math.gcd(12, 18)} == set()


# cse-1995-a-28 (Pascal while; same semantics as C).
def pascal_1995(X, Y):
    while X != Y:
        if X > Y:
            X -= Y
        else:
            Y -= X
    return X


for X in range(1, 40):
    for Y in range(1, 40):
        assert pascal_1995(X, Y) == math.gcd(X, Y)
assert C.key_letters(B["cse-1995-a-28"]["answer"]) == ["C"]

# ── Fast exponentiation ──────────────────────────────────────────────────────
EXP = "int power(int X, int Y, int *passes) { int res = 1, a = X, b = Y; *passes = 0; while (b != 0) { if (b % 2 == 0) { a = a * a; b = b / 2; } else { res = res * a; b = b - 1; } (*passes)++; } return res; }\n"
got = ints(out('int p; for (int X = 1; X <= 4; X++) for (int Y = 0; Y <= 14; Y++) { int r = power(X, Y, &p); printf("%d %d ", r, p); }', before=EXP))
k = 0
for X in range(1, 5):
    for Y in range(0, 15):
        assert got[k] == X ** Y
        assert got[k + 1] == (0 if Y == 0 else math.floor(math.log2(Y)) + bin(Y).count("1"))
        k += 2
assert out('int p; int r = power(3, 11, &p); printf("%d %d", r, p);', before=EXP) == "177147 6"
assert math.floor(math.log2(11)) + bin(11).count("1") == 6


# Invariant X^Y = res * a^b at every test (exact integers in Python), and the 2016 options.
def exp_states(X, Y):
    res, a, b = 1, X, Y
    st = [(res, a, b)]
    while b != 0:
        if b % 2 == 0:
            a, b = a * a, b // 2
        else:
            res, b = res * a, b - 1
        st.append((res, a, b))
    return st


opts16 = {
    "A": lambda X, Y, r, a, b: X ** Y == a ** b,
    "B": lambda X, Y, r, a, b: (r * a) ** Y == (r * X) ** b,
    "C": lambda X, Y, r, a, b: X ** Y == r * a ** b,
    "D": lambda X, Y, r, a, b: X ** Y == (r * a) ** b,
}
holds = {l: all(f(X, Y, *s) for X in range(2, 6) for Y in range(1, 20) for s in exp_states(X, Y)[:-1]) for l, f in opts16.items()}
assert holds == {"A": False, "B": False, "C": True, "D": False}
assert all(opts16[l](2, 3, 1, 2, 3) for l in "BCD")  # B and D (and C) hold at the very first test
assert exp_states(2, 3) == [(1, 2, 3), (2, 2, 2), (2, 4, 1), (8, 4, 0)]
assert [a ** b for r, a, b in exp_states(2, 3)] == [8, 4, 4, 1]
assert (2 * 2) ** 3 == 64 and (2 * 2) ** 2 == 16
assert C.key_letters(B["cse-2016-2-cs-35"]["answer"]) == ["C"]
assert [(r, a, b) for r, a, b in exp_states(3, 11)] == [(1, 3, 11), (3, 3, 10), (3, 9, 5), (27, 9, 4), (27, 81, 2), (27, 6561, 1), (177147, 6561, 0)]
# exp(5, 0) = 1.
assert out('int p; printf("%d", power(5, 0, &p));', before=EXP) == "1"

# cse-2020-cs-48: pp(3, 4) = 81 (compiled as given).
PP = C.code_block(B["cse-2020-cs-48"])
assert out('printf("%d", pp(3, 4));', before=PP) == "81" and B["cse-2020-cs-48"]["answer"] == 81
assert out('int arr[20]; int len = tob(4, arr); printf("%d %d %d %d", len, arr[0], arr[1], arr[2]);', before=PP) == "3 0 0 1"
got = ints(out('for (int a = 1; a <= 4; a++) for (int b = 0; b <= 14; b++) printf("%d ", pp(a, b));', before=PP))
assert got == [a ** b for a in range(1, 5) for b in range(0, 15)]
assert out('printf("%d", pp(5, 0));', before=PP) == "1"
# The invariant of the bit-array version: ex = a^(2^i), tot = a^(b mod 2^i) at each test.
for a in range(2, 5):
    for b in range(1, 40):
        bits = [int(c) for c in bin(b)[2:][::-1]]
        tot, ex = 1, a
        for i, bit in enumerate(bits):
            assert ex == a ** (2 ** i) and tot == a ** (b % 2 ** i)
            if bit:
                tot *= ex
            ex *= ex
        assert tot == a ** b
# 3^4 trace: ex 3 -> 9 -> 81 -> 6561, tot 1, 1, 81.
assert [3 ** (2 ** i) for i in range(4)] == [3, 9, 81, 6561]
# trap-power-overflow: pp(2, 16) squares 65536 once more (2^32): signed overflow, caught by UBSan;
# without the sanitizer the wasted value is discarded and 65536 is printed.
assert ub('printf("%d", pp(2, 16));', before=PP)
assert out('printf("%d", pp(2, 16));', before=PP) == "65536"
assert not ub('int p; printf("%d", power(2, 16, &p));', before=EXP)  # exp never squares needlessly

# ── Horner and digit loops ───────────────────────────────────────────────────
SF = C.code_block(B["cse-2021-1-cs-48"])
assert out('int Z[10]; for (int i = 0; i < 10; i++) Z[i] = 1; printf("%d", SimpleFunction(Z, 10, 2));', before=SF) == "1023"
assert B["cse-2021-1-cs-48"]["answer"] == 1023 and 2 ** 10 - 1 == 1023
assert out('int Y[4] = {4, 7, 2, 9}; printf("%d", SimpleFunction(Y, 4, 10));', before=SF) == "4729"
assert out('int Y[4] = {4, 5, 6, 9}; printf("%d", SimpleFunction(Y, 4, 2));', before=SF) == "73"
assert 4 * 8 + 5 * 4 + 6 * 2 + 9 == 73
# The trace of 2021: totals 1, 3, 7, ..., 1023 = 2^(k+1) - 1 after index k.
assert out('int t = 1; for (int k = 1; k <= 9; k++) { t = 2 * t + 1; printf("%d ", t); }') == "3 7 15 31 63 127 255 511 1023 "
# Invariant of Horner for random-ish coefficients.
for n in range(1, 8):
    Y = [(3 * j + 1) % 7 - 3 for j in range(n)]
    x = 3
    total = Y[0]
    for k in range(1, n):
        assert total == sum(Y[j] * x ** (k - 1 - j) for j in range(k))
        total = x * total + Y[k]
    assert total == sum(Y[j] * x ** (n - 1 - j) for j in range(n))
# Multiplication counts: Horner d, naive d(d+1)/2, running power 2d - 1.
assert [d * (d + 1) // 2 for d in (3, 9)] == [6, 45] and 2 * 3 - 1 == 5
# Repunits: (x^n - 1)/(x - 1).
assert all(sum(x ** k for k in range(n)) == (x ** n - 1) // (x - 1) for x in (2, 3, 10) for n in range(1, 12))

# Digit loops (the table).
assert out('int n = 4729, c = 0, s = 0, rev = 0, m = n; while (m > 0) { c++; s += m % 10; rev = rev * 10 + m % 10; m /= 10; } printf("%d %d %d", c, s, rev);') == "4 22 9274"
assert out('int n = 13, r = 0; while (n > 0) { r = r * 2 + n % 2; n /= 2; } printf("%d", r);') == "11"
for n in (1, 9, 10, 99, 100, 4729, 123456789):
    assert int(out(f'int n = {n}, c = 0; while (n > 0) {{ c++; n /= 10; }} printf("%d", c);')) == math.floor(math.log10(n)) + 1
# The reversal trace and invariant (reverse-theorem), on every n < 20000.
assert out('int n = 4729, rev = 0; while (n > 0) { rev = rev * 10 + n % 10; n = n / 10; printf("%d %d ", n, rev); }') == "472 9 47 92 4 927 0 9274 "
for n0 in range(1, 20000):
    d = str(n0)
    m = len(d)
    n, rev, j = n0, 0, 0
    while n > 0:
        rev = rev * 10 + n % 10
        n //= 10
        j += 1
        assert n == (int(d[: m - j]) if m - j > 0 else 0)
        assert rev == int(d[::-1][:j])
    assert j == m


# cse-2004-cs-32 options on 4729 after j = 2, and the counter-example to C (n = 11).
def opts04(n0, j):
    d = [None] + [int(c) for c in str(n0)]
    m = len(d) - 1
    n, rev = n0, 0
    for _ in range(j):
        rev, n = rev * 10 + n % 10, n // 10
    num = lambda idx: int("".join(str(d[i]) for i in idx)) if idx else 0
    A = n == num(range(1, m - j + 1)) and rev == num(range(m, m - j, -1))
    Bo = n == num(range(m - j + 1, m + 1)) or rev == num(range(m - j, 0, -1))
    Co = n != rev
    D = n == num(range(1, m + 1)) or rev == num(range(m, 0, -1))
    return {"A": A, "B": Bo, "C": Co, "D": D}


assert opts04(4729, 2) == {"A": True, "B": False, "C": True, "D": False}
assert opts04(11, 1)["C"] is False
assert all(opts04(n0, j)["A"] for n0 in (5, 47, 4729, 120, 90001) for j in range(len(str(n0)) + 1))
assert C.key_letters(B["cse-2004-cs-32"]["answer"]) == ["A"]
# trap-digits: rev(120) = 21; rev(21) = 12; negative n with while (n != 0); overflow of 1000000003.
REV = "int rev(int n) { int r = 0; while (n > 0) { r = r * 10 + n % 10; n = n / 10; } return r; }\nint rev2(int n) { int r = 0; while (n != 0) { r = r * 10 + n % 10; n = n / 10; } return r; }\n"
assert out('printf("%d %d %d %d", rev(120), rev(21), rev(-12), rev2(-12));', before=REV) == "21 12 0 -21"
assert ub('printf("%d", rev(1000000003));', before=REV)
assert 1000000003 <= 2 ** 31 - 1 < 3000000001 and 300000000 * 10 > 2 ** 31 - 1

# cse-2025-1-cs-53: gate(14362) = 46 (compiled as given).
assert C.c_out(C.code_block(B["cse-2025-1-cs-53"])) == "46" and B["cse-2025-1-cs-53"]["answer"] == "46 to 46"
GATE = C.code_block(B["cse-2025-1-cs-53"]).split("int main")[0].replace("#include <stdio.h>", "")
got = ints(out('for (int n = 0; n < 200000; n++) printf("%d ", gate(n));', before=GATE))
assert got == [int(str(n)[1::2]) if str(n)[1::2] else 0 for n in range(200000)]
assert out('printf("%d %d", gate(123456), gate(0));', before=GATE) == "246 0"
# Appending on turn 0 instead keeps 1, 3, 2 -> 132 (the common slip).
assert int("14362"[0::2]) == 132
assert ub('printf("%d", gate(1234567890));', before=GATE)  # t *= 10 overflows for n >= 10^9

# ── Division, square roots, series ───────────────────────────────────────────
DIV = "void divide(int x, int y, int *q, int *r) { *q = 0; *r = x; while (*r >= y) { *r = *r - y; *q = *q + 1; } }\n"
got = ints(out('int q, r; for (int x = 0; x <= 50; x++) for (int y = 1; y <= 9; y++) { divide(x, y, &q, &r); printf("%d %d ", q, r); }', before=DIV))
assert got == [v for x in range(51) for y in range(1, 10) for v in (x // y, x % y)]
assert out('int q = 0, r = 17, y = 5; while (r >= y) { r = r - y; q = q + 1; printf("%d %d ", q, r); }') == "1 12 2 7 3 2 "
# Negative x with signed int: loop skipped, r = x < 0.
assert out('int q, r; divide(-5, 3, &q, &r); printf("%d %d", q, r);', before=DIV) == "0 -5"


# cse-2015-1-cs-33: post-condition B holds for every positive x, y; A, C, D fail somewhere.
def post15(x, y):
    q, r = 0, x
    while r >= y:
        r, q = r - y, q + 1
    return {"A": r == q * x + y and r < y, "B": x == q * y + r and r < y, "C": y == q * x + r and 0 < r < y, "D": q + 1 < r - y and y > 0}


res = [post15(x, y) for x in range(1, 60) for y in range(1, 60)]
assert all(r["B"] for r in res) and not any(all(r[l] for r in res) for l in "ACD")
assert post15(17, 5) == {"A": False, "B": True, "C": False, "D": False}
assert C.key_letters(B["cse-2015-1-cs-33"]["answer"]) == ["B"]

# cse-2017-2-cs-37 (unsigned int): C terminates with x == y*q + r; counter-examples for A, B, D.
FR = "unsigned run(unsigned x, unsigned y, unsigned q, unsigned r) { while (r >= y) { r = r - y; q = q + 1; } return x == y * q + r; }\n"
assert out('int ok = 1; for (unsigned x = 0; x < 60; x++) for (unsigned y = 1; y < 12; y++) ok &= run(x, y, 0, x); printf("%d", ok);', before=FR) == "1"
assert out('printf("%u", run(7, 2, 5, 7));', before=FR) == "0"  # B: q not 0
assert out('printf("%u", run(7, 2, 0, 4));', before=FR) == "0"  # D: r not x
assert out('unsigned q = 5, r = 7, y = 2; while (r >= y) { r = r - y; q = q + 1; } printf("%u %u", q, r);') == "8 1"
assert out('unsigned q = 0, r = 4, y = 2; while (r >= y) { r = r - y; q = q + 1; } printf("%u %u", q, r);') == "2 0"
assert out('printf("%u", run(7, 3, 0, 0));', before=FR) == "0"  # A with y > 0: x = 7 is not 0
assert C.run_c(P('unsigned x = 5, y = 0, q = 0, r = 0; while (r >= y) { r = r - y; q = q + 1; } printf("%u", q);'), timeout=2).status is None  # A with y = 0
assert out('printf("%u", run(0, 4, 0, 0));', before=FR) == "1"  # x = 0 is fine: x > 0 in B is irrelevant
assert C.key_letters(B["cse-2017-2-cs-37"]["answer"]) == ["C"]

# cse-1991-a-3-viii (Pascal function X, translated to C): X(N) = floor(sqrt N) + 1; options C, D fail.
XF = "int X(int M) { int i = 0; while (i * i <= M) i = i + 1; return i; }\n"
got = ints(out('for (int N = 1; N <= 10000; N++) printf("%d ", X(N));', before=XF))
isq = [math.isqrt(N) for N in range(1, 10001)]
ceil_sq = [s if s * s == N else s + 1 for s, N in zip(isq, range(1, 10001))]
assert got == [s + 1 for s in isq]
assert any(g != c for g, c in zip(got, ceil_sq)) and any(g != c + 1 for g, c in zip(got, ceil_sq))
assert any(g != s for g, s in zip(got, isq))
assert out('printf("%d %d", X(10), X(16));', before=XF) == "4 5"
assert C.key_letters(B["cse-1991-a-3-viii"]["answer"]) == ["B"]
# ex-isqrt-edge: 46340^2 <= INT_MAX < 46341^2, and the last test overflows (UB).
assert 46340 ** 2 == 2147395600 <= 2 ** 31 - 1 < 46341 ** 2 == 2147488281
assert ub('printf("%d", X(INT_MAX));', before=XF)
assert out('int M = INT_MAX, i = 1; while (i <= M / i) i++; printf("%d", i);') == "46341"

# cse-2004-cs-42 (pseudo-code on reals): Heron's loop -> sqrt(m). Simulated in double precision.
HER = "double heron(double m, double e, int *k) { double x = m, y = 1; *k = 0; while (x - y > e) { x = (x + y) / 2; y = m / x; (*k)++; } return x; }\n"
assert out('int k; double r = heron(2, 1e-6, &k); printf("%.7f %d", r, k);', before=HER) == "1.4142136 4"
assert out('int k; double r = heron(9, 1e-6, &k); printf("%.10f %d", r, k);', before=HER) == "3.0000000014 5"
assert out('double x = 9, y = 1, m = 9; for (int k = 0; k < 4; k++) { x = (x + y) / 2; y = m / x; printf("%.4f %.4f ", x, y); }') == "5.0000 1.8000 3.4000 2.6471 3.0235 2.9767 3.0001 2.9999 "
assert out('double x = 2, y = 1, m = 2; for (int k = 0; k < 4; k++) { x = (x + y) / 2; y = m / x; printf("%.7f ", x); }') == "1.5000000 1.4166667 1.4142157 1.4142136 "
for m in (1.5, 2, 3, 9, 10, 100, 12345.0):
    x, y = m, 1.0
    while x - y > 1e-9:
        nx = (x + y) / 2
        ny = m / nx
        assert nx - ny <= (x - y) / 2 + 1e-12 and ny <= math.sqrt(m) + 1e-12 <= nx + 2e-12 and abs(nx * ny - m) <= 1e-9 * m
        assert abs((nx - math.sqrt(m)) - (x - math.sqrt(m)) ** 2 / (2 * x)) <= 1e-9 * m  # quadratic convergence
        x, y = nx, ny
    assert abs(x - math.sqrt(m)) <= 1e-9
assert abs(0.0235294 ** 2 / (2 * 3.0235294) - 0.0000916) < 1e-6
assert C.key_letters(B["cse-2004-cs-42"]["answer"]) == ["C"]

# cse-2003-cs-1: the e^x loop (compiled as given, float).
F03 = C.code_block(B["cse-2003-cs-1"])
assert out('printf("%f %f %f", f(1, 20), f(2, 20), f(1, 5));', before=F03) == "2.718282 7.389057 2.708333"
assert abs(1 + 1 + 1 / 2 + 1 / 6 + 1 / 24 - 2.708333) < 1e-6
assert out('printf("%d", fabs(f(0.5, 25) - exp(0.5)) < 1e-6);', before=F03) == "1"
# Invariant p = x^(i-1)/(i-1)!, s = sum_{k<i} x^k/k! (exact rationals).
from fractions import Fraction as Fr  # noqa: E402

for xx in (Fr(1), Fr(1, 2), Fr(3)):
    s, p, i = Fr(1), Fr(1), 1
    while i < 12:
        assert p == xx ** (i - 1) / math.factorial(i - 1) and s == sum(xx ** k / math.factorial(k) for k in range(i))
        p *= xx / i
        s += p
        i += 1
assert C.key_letters(B["cse-2003-cs-1"]["answer"]) == ["B"]
# The other series the lesson names: sin, cos, ln(1 + x) loops.
assert out('double x = 0.5, s = 0, t = x; for (int i = 1; i <= 10; i++) { s += t; t = -t * x * x / ((2*i) * (2*i + 1)); } printf("%d", fabs(s - sin(x)) < 1e-12);') == "1"
assert out('double x = 0.5, s = 0, t = 1; for (int i = 1; i <= 10; i++) { s += t; t = -t * x * x / ((2*i - 1) * (2*i)); } printf("%d", fabs(s - cos(x)) < 1e-12);') == "1"
assert out('double x = 0.5, s = 0, p = 1; for (int i = 1; i <= 60; i++) { p *= -x; s += p / i; } printf("%d", fabs(-s - log(1 + x)) < 1e-12);') == "1"

# ── Swaps and closed forms ───────────────────────────────────────────────────
# cse-1993-ii-a-7-4 (Pascal; same arithmetic in C for values without overflow).
for a0 in range(-20, 21):
    for b0 in range(-20, 21):
        a, b = a0, b0
        a = a + b
        b = a - b
        a = a - b
        assert (a, b) == (b0, a0)
assert out('int a = 5, b = 9; a = a + b; printf("%d %d ", a, b); b = a - b; printf("%d %d ", a, b); a = a - b; printf("%d %d", a, b);') == "14 9 14 5 9 5"
assert C.key_letters(B["cse-1993-ii-a-7-4"]["answer"]) == ["A"]
# Unsigned: works even when a + b wraps; signed: a + b overflow is UB; aliasing zeroes; XOR swap.
assert out('unsigned a = 4000000000u, b = 3000000000u; a = a + b; b = a - b; a = a - b; printf("%u %u", a, b);') == "3000000000 4000000000"
assert ub('int a = INT_MAX, b = 1; a = a + b; b = a - b; a = a - b; printf("%d %d", a, b);')
SW = "void swap(int *p, int *q) { *p = *p + *q; *q = *p - *q; *p = *p - *q; }\nvoid xswap(int *p, int *q) { *p ^= *q; *q ^= *p; *p ^= *q; }\nvoid tswap(int *p, int *q) { int t = *p; *p = *q; *q = t; }\n"
assert out('int v[3] = {4, 7, 9}; swap(&v[0], &v[2]); swap(&v[1], &v[1]); printf("%d %d %d", v[0], v[1], v[2]);', before=SW) == "9 0 4"
assert out('int v[3] = {4, 7, 9}; tswap(&v[0], &v[2]); tswap(&v[1], &v[1]); printf("%d %d %d", v[0], v[1], v[2]);', before=SW) == "9 7 4"
assert out('int a = 5, b = 9, c = 6; xswap(&a, &b); xswap(&c, &c); printf("%d %d %d", a, b, c);', before=SW) == "9 5 0"

# cse-2024-1-cs-38: closed form (x + y) 2^y - y; B and D are true.
F24 = C.code_block(B["cse-2024-1-cs-38"])
got = ints(out('printf("%d %d %d %d", f(20, 10), f(20, 20), f(10, 20), f(1, 2));', before=F24))
assert got == [30710, 41943020, 31457260, 10]
cf = lambda x, y: (x + y) * 2 ** y - y
assert got == [cf(20, 10), cf(20, 20), cf(10, 20), cf(1, 2)]
for x0 in range(-5, 30):
    for y in range(0, 12):
        x = x0
        for i in range(y):
            assert x + y == (x0 + y) * 2 ** i
            x = x + x + y
        assert x == cf(x0, y)
opts24 = {"A": got[0] > 2 ** 20, "B": got[1] > 2 ** 20, "C": got[0] < 2 ** 10, "D": got[2] > 2 ** 20}
assert [l for l, v in opts24.items() if v] == ["B", "D"] == C.key_letters(B["cse-2024-1-cs-38"]["answer"])
assert 2 ** 14 < 30710 < 2 ** 15
# ex-closed-edge: f(20, 30) overflows on pass 26.
assert ub('printf("%d", f(20, 30));', before=F24)
assert 50 * 2 ** 25 - 30 == 1677721570 <= 2 ** 31 - 1 < 50 * 2 ** 26 - 30 == 3355443170
# The general affine closed form x_k = f + c^k (x0 - f), f = d / (1 - c).
for c, d, x0 in ((2, 5, 3), (3, -4, 3), (-2, 3, 1)):
    f = Fr(d, 1 - c)
    x = x0
    for k in range(10):
        assert x == f + c ** k * (x0 - f)
        x = c * x + d


# ── Practice answers (practice.json, lesson 3) ───────────────────────────────
PR = {q["id"]: q for q in json.loads((C.CHAPTERS[1] / "practice.json").read_text()) if q["id"].startswith("nx-pds-01-03-")}
assert len(PR) == 10
# q01: binary reversal of 13 = 1101 -> 1011 = 11.
assert out('int n = 13, r = 0; while (n > 0) { r = r * 2 + n % 2; n /= 2; } printf("%d", r);') == "11" and PR["nx-pds-01-03-q01"]["answer"] == "A"
# q02: subtraction GCD of (91, 35): 5 passes, gcd 7.
assert sum(quotients(91, 35)) == 6
assert out('int p; int g = gsub(91, 35, &p); printf("%d %d", g, p);', before=GCD) == "7 5" and PR["nx-pds-01-03-q02"]["answer"] == 5
# q03: right-to-left power loop; invariant r * a^b = X^Y.
def rl_states(X, Y):
    r, a, b = 1, X, Y
    st = [(r, a, b)]
    while b > 0:
        if b & 1:
            r *= a
        a *= a
        b >>= 1
        st.append((r, a, b))
    return st


q3 = {
    "A": lambda X, Y, r, a, b: r == X ** (Y - b),
    "B": lambda X, Y, r, a, b: r * a ** b == X ** Y,
    "C": lambda X, Y, r, a, b: a == X ** b,
    "D": lambda X, Y, r, a, b: r * a == X ** Y,
}
q3h = {l: all(f(X, Y, *s) for X in range(2, 5) for Y in range(1, 30) for s in rl_states(X, Y)) for l, f in q3.items()}
assert q3h == {"A": False, "B": True, "C": False, "D": False} and PR["nx-pds-01-03-q03"]["answer"] == "B"
assert out('int X = 3, Y = 13, r = 1, a = X, b = Y; while (b > 0) { if (b & 1) r *= a; a *= a; b >>= 1; } printf("%d", r);') == "1594323" == str(3 ** 13)
# q04 (signed int): which initial states end with x == q*y + r && 0 <= r && r < y?
Q4 = "int ok(int x, int y) { int q = 0, r = x; while (r >= y) { r -= y; q++; } return x == q * y + r && 0 <= r && r < y; }\n"
assert C.run_c(P("int x = 7, y = 0, q = 0, r = x; while (r >= y) { r -= y; q++; } printf(\"%d\", q);"), timeout=2).status is None  # A: y = 0 never ends (until q overflows: UB)
assert out('printf("%d %d %d", ok(-5, 3), ok(0, 4), ok(23, 23));', before=Q4) == "0 1 1"
assert PR["nx-pds-01-03-q04"]["answer"] == ["C", "D"]
# q05: x = 3x - 4 five times from 3: 2 + 3^5 = 245.
assert out('int x = 3; for (int i = 0; i < 5; i++) { x = 3 * x - 4; printf("%d ", x); }') == "5 11 29 83 245 "
assert out('int x = 3; for (int i = 0; i < 5; i++) x = 3 * x - 4; printf("%d", x);') == "245" and PR["nx-pds-01-03-q05"]["answer"] == 245
# q06: integer Newton x = (x + m/x)/2 from x = m while x*x > m returns floor(sqrt m) (m = 1 .. 46340).
NEWTON = "int g(int m) { int x = m; while (x * x > m) x = (x + m / x) / 2; return x; }\n"
assert ints(out('for (int m = 1; m <= 46340; m++) printf("%d ", g(m));', before=NEWTON)) == [math.isqrt(m) for m in range(1, 46341)]
assert out('int m = 1000, x = m; while (x * x > m) { x = (x + m / x) / 2; printf("%d ", x); }') == "500 251 127 67 40 32 31 "
assert out('printf("%d", g(1000));', before=NEWTON) == "31" and PR["nx-pds-01-03-q06"]["answer"] == "C"
# q07: invariants of i = 0, s = 0; while (i < n) { i++; s += 2*i - 1; }: s = i^2, i <= n, s <= n^2 (not "s odd").
for n in range(0, 25):
    i, s = 0, 0
    st = [(i, s)]
    while i < n:
        i += 1
        s += 2 * i - 1
        st.append((i, s))
    assert all(s == i * i and i <= n and s <= n * n for i, s in st)
assert not all(s % 2 == 1 for i, s in [(0, 0), (2, 4)])
assert out('int n = 6, i = 0, s = 0; while (i < n) { i++; s += 2 * i - 1; } printf("%d %d", i, s);') == "6 36"
assert PR["nx-pds-01-03-q07"]["answer"] == ["A", "B", "C"]
# q08: Horner with c = {2, -1, 0, 3} at x = 3: 48.
assert out('int c[4] = {2, -1, 0, 3}, x = 3, t = 0; for (int k = 0; k < 4; k++) t = t * x + c[k]; printf("%d", t);') == "48" and PR["nx-pds-01-03-q08"]["answer"] == 48
assert 2 * 27 - 9 + 0 + 3 == 48
# q09: arithmetic swap through pointers with an aliased call.
assert out('int v[3] = {4, 7, 9}; swap(&v[0], &v[2]); swap(&v[1], &v[1]); printf("%d %d %d", v[0], v[1], v[2]);', before=SW) == "9 0 4" and PR["nx-pds-01-03-q09"]["answer"] == "D"
# q10: the term recurrence t = -t*x*x/((2i)(2i+1)) from t = x sums sin x.
assert out('double x = 1.0, s = 0, t = x; for (int i = 1; i <= 12; i++) { s += t; t = -t * x * x / ((2*i) * (2*i + 1)); } printf("%.6f %.6f", s, sin(1.0));') == "0.841471 0.841471"
assert PR["nx-pds-01-03-q10"]["answer"] == "A"

print("l1_03_loop_algorithms: facts, invariants, 16 PYQ keys, worked examples and 10 practice answers re-derived with cc")
