"""Check: Chapter 1, Lesson 1 (types, operators and expressions).

Every C fact the lesson states and every PYQ key is re-derived here by compiling and running real C
with the system compiler (common.run_c); the FORTRAN and Pascal questions are re-derived from the
language rules in Python. The worked examples' numbers are checked the same way.
"""
import common as C

B = C.bank()
P = C.main_wrap


def out(body, **kw):
    return C.c_out(P(body), **kw)


# ── Facts the lesson states ──────────────────────────────────────────────────

# Sizes on the course's 64-bit model (the lesson's table).
assert out('printf("%zu %zu %zu %zu %zu %zu %zu", sizeof(char), sizeof(short), sizeof(int), sizeof(long), sizeof(long long), sizeof(float), sizeof(double));') == "1 2 4 8 8 4 8"
assert out('printf("%zu", sizeof(int *));') == "8"
assert out("printf(\"%zu %zu\", sizeof 'A', sizeof(char));") == "4 1"  # a character constant has type int in C
assert out('printf("%d %d %u", -2147483647 - 1, 2147483647, 4294967295u);') == "-2147483648 2147483647 4294967295"
# Constants.
assert out('printf("%d %d %d %d", 011, 0x1F, 010 + 1, \'0\');') == "9 31 9 48"
assert not C.c_compiles(P("int a = 098; printf(\"%d\", a);"))  # 8 and 9 are not octal digits
# Division truncates towards zero; % takes the sign of the dividend; (a/b)*b + a%b == a.
assert out('printf("%d %d %d %d %d %d", 7/2, 7%2, -7/2, -7%2, 7/-2, 7%-2);') == "3 1 -3 -1 -3 1"
for a in range(-9, 10):
    for b in (-4, -3, -2, -1, 1, 2, 3, 4):
        q = int(a / b)  # truncation, as C
        assert q * b + (a - q * b) == a
assert out('printf("%d", -7/2*2 + -7%2);') == "-7"
# Unsigned arithmetic wraps modulo 2^32.
assert out('unsigned u = 0; u = u - 1; printf("%u %u", u, u + 2);') == "4294967295 1"
assert out('unsigned char c = 255; c++; printf("%d", c);') == "0"
# Integer promotion: char operands become int before arithmetic.
assert out('char c = 100, d = 100; int s = c + d; printf("%d %zu", s, sizeof(c + d));') == "200 4"
assert out('char c = 100, d = 100; char e = c + d; printf("%d", e);') == "-56"  # stored back into a signed char
# The usual arithmetic conversions: -1 < 1u is false.
assert out('int i = -1; unsigned u = 1; printf("%d %d", i < u, i < (int)u);') == "0 1"
assert out('long l = -1; unsigned u = 1; printf("%d", l < u);') == "1"  # long can hold every unsigned int
# Floating point to integer truncates toward zero.
assert out('int a = 7.9, b = -7.9; printf("%d %d", a, b);') == "7 -7"
assert out('printf("%d %.1f %.1f", 7/2, 7/2.0, (double)7/2);') == "3 3.5 3.5"
# Relational and logical operators give int 0 or 1; any non-zero value is true.
assert out('int x = 5; printf("%d %d %d %d", x > 3, x == 4, !x, !!x);') == "1 0 0 1"
# (3 < 2) < 1 -> 0 < 1. Recent clang rejects chained comparisons by default; the C language allows them.
assert out('printf("%d", 3 < 2 < 1);', flags=("-Wno-parentheses", "-Wno-format")) == "1"
assert out('int a = 1, b = 2; printf("%d", a == b == 0);', flags=("-Wno-parentheses", "-Wno-format")) == "1"
# Precedence traps.
assert out('int x = 5; printf("%d", x & 1 == 0);') == "0"  # == binds tighter than &
assert out('printf("%d %d", 1 << 2 + 1, (1 << 2) + 1);') == "8 5"  # + binds tighter than <<
assert out('int a = 2, b = 3; a += b *= 2; printf("%d %d", a, b);') == "8 6"  # assignments group right to left
# Increment.
assert out('int m = 5; int a = m++; int b = ++m; printf("%d %d %d", a, b, m);') == "5 7 7"
# Comma operator.
assert out('int a, b; a = (b = 3, b + 4); printf("%d %d", a, b);') == "7 3"
assert out('int a; a = 1, 2; printf("%d", a);') == "1"
# Shifts.
assert out('printf("%d %d %d", 13 << 2, 13 >> 1, 1 << 10);') == "52 6 1024"
# Bitwise identities used in the lesson.
assert out('int x = 12; printf("%d %d %d", x & (x - 1), x & -x, x ^ x);') == "8 4 0"
# The short-circuit facts.
assert out('int i = 0, j = 5; int r = i++ && j++; printf("%d %d %d", r, i, j);') == "0 1 5"
assert out('int a = 2, b = 3, c = 4; if (a < b || ++a < c) printf("%d %d %d", a, b, c);') == "2 3 4"
# sizeof does not evaluate its operand.
assert out('int i = 1; size_t s = sizeof(i++); printf("%zu %d", s, i);') == "4 1"
# printf returns the number of characters it printed.
assert out('int n = printf("GATE"); printf(" %d", n);') == "GATE 4"


# ── PYQ keys ────────────────────────────────────────────────────────────────

# cse-1993-a-2-5 (FORTRAN 77): ** binds tighter than unary minus, so -2**2 = -(2**2) = -4; * and / of
# equal precedence go left to right: 5.0*X/X*3 = ((5.0*X)/X)*3 = 15.0; 3/4 is integer division = 0.
X = 4.0
term1 = -(2 ** 2)
term2 = ((5.0 * X) / X) * 3
term3 = 3 // 4
I = int(term1 + term2 + term3)  # assigning a REAL to INTEGER I truncates
assert (term1, term2, term3, I) == (-4, 15.0, 0, 11)
assert B["cse-1993-a-2-5"]["answer"] == 11
# The scan-misreading of the question (a fraction 5.0*X / (X*3)) would give -4 + 1.67 = -2.33 -> -2.
assert int(-4 + (5.0 * X) / (X * 3) + 0) == -2

# cse-1991-a-4-i (Pascal): y := x > 5 is the single assignment (a relational expression has a Boolean value).
for x in range(-3, 12):
    y_if = True if x > 5 else False
    assert y_if == (x > 5)
assert "x > 5" in B["cse-1991-a-4-i"]["answer"]

# it-2004-it-15: for x in {0, 1}, which statement equals "if (x == 0) x = 1; else x = 0;"?
res = {}
for l, stmt in (("A", "x = 1 + x;"), ("B", "x = 1 - x;"), ("C", "x = x - 1;"), ("D", "x = 1 % x;")):
    vals = []
    for x0 in (0, 1):
        r = C.run_c(P(f"int x = {x0}; {stmt} printf(\"%d\", x);"))
        vals.append(r.out if r.ok else "crash")
    res[l] = vals
ref = [C.c_out(P(f"int x = {x0}; if (x == 0) x = 1; else x = 0; printf(\"%d\", x);")) for x0 in (0, 1)]
assert ref == ["1", "0"]
# D computes 1 % 0 when x = 0: division by zero is undefined behaviour. Whatever one machine happens to
# print (on arm64 the remainder instruction quietly gives 1; on x86-64 the program is killed), it is not a
# statement with a defined meaning, so only B is equivalent.
assert res["A"] != ref and res["C"] != ref and res["B"] == ref
assert not C.run_c(P("int x = 0; x = 1 % x; printf(\"%d\", x);"), flags=("-fsanitize=undefined", "-fno-sanitize-recover=all")).ok
assert C.key_letters(B["it-2004-it-15"]["answer"]) == ["B"]

# cse-2008-cs-18: which (x, y, z) gives a = 4? (a = max of the three)
expr = "(x > y) ? ((x > z) ? x : z) : ((y > z) ? y : z)"
opts = {"A": (3, 4, 2), "B": (6, 5, 3), "C": (6, 3, 5), "D": (5, 4, 5)}
got = {l: int(out(f"int x = {a}, y = {b}, z = {c}; int r = {expr}; printf(\"%d\", r);")) for l, (a, b, c) in opts.items()}
assert got == {"A": 4, "B": 6, "C": 6, "D": 5}
assert all(got[l] == max(v) for l, v in opts.items())
assert [l for l, v in got.items() if v == 4] == ["A"] == C.key_letters(B["cse-2008-cs-18"]["answer"])

# cse-2014-2-cs-10: func(435) counts the bits of 435 = 110110011b: 9.
FUNC = "int func(int num) { int count = 0; while (num) { count++; num >>= 1; } return (count); }\n"
assert C.c_out(C.main_wrap('printf("%d", func(435));', before=FUNC)) == "9"
assert bin(435) == "0b110110011" and 435 .bit_length() == 9 and B["cse-2014-2-cs-10"]["answer"] == 9
# The general rule: for n > 0 the loop runs floor(log2 n) + 1 times.
import math
for n in (1, 2, 3, 7, 8, 255, 256, 1000, 2 ** 30):
    assert int(C.c_out(C.main_wrap(f'printf("%d", func({n}));', before=FUNC))) == math.floor(math.log2(n)) + 1

# cse-2014-2-cs-11: which statement computes nC3 correctly for large n (unsigned int)?
def ncr_opts(n):
    res = {}
    for l, e in (("A", "n * (n-1) * (n-2) / 6"), ("B", "n * (n-1) / 2 * (n-2) / 3"), ("C", "n * (n-1) / 3 * (n-2) / 2"), ("D", "n * (n-1) * (n-2) / 6.0")):
        res[l] = int(out(f"unsigned int n = {n}u, p; p = {e}; printf(\"%u\", p);"))
    return res


exact = lambda n: n * (n - 1) * (n - 2) // 6
# B is right for every n (each division is exact at the moment it happens) as long as the final value fits;
# A and D overflow the 32-bit product first; C divides n(n-1) by 3 before (n-2) is multiplied in, which is
# not always exact.
for n in (5, 10, 100, 1000, 1500, 1625, 2000):
    r = ncr_opts(n)
    assert r["B"] == exact(n), (n, r)
n = 2000
r = ncr_opts(n)
assert r["A"] != exact(n) and r["D"] != exact(n) and r["B"] == exact(n) == 1331334000
assert any(ncr_opts(m)["C"] != exact(m) for m in (5, 8, 11, 14)), "C loses exactness when 3 does not divide n(n-1)"
assert ncr_opts(5)["C"] == (5 * 4 // 3) * 3 // 2 == 9 and exact(5) == 10
for k in range(3, 3000):
    assert (k * (k - 1)) % 2 == 0 and (k * (k - 1) // 2 * (k - 2)) % 3 == 0  # why B's divisions are exact
assert C.key_letters(B["cse-2014-2-cs-11"]["answer"]) == ["B"]

# cse-2017-1-cs-53: strlen(s) - strlen(t) is unsigned, so 3 - 5 wraps to a huge value > 0: prints strlen(s) = 3.
src = C.code_block(B["cse-2017-1-cs-53"]).replace("void main()", "int main(void)")
assert C.c_out(src) == "3\n" and B["cse-2017-1-cs-53"]["answer"] == 3
assert out('printf("%d", (3 - 5) > 0);') == "0"  # with ints the comparison is false (the trap: answer 5)

# cse-2017-2-cs-54: n = ++m (11); n1 = m++ (11, m = 12); n-- (10); --n1 (10); n -= n1 -> 0.
assert C.c_out(C.code_block(B["cse-2017-2-cs-54"])) == "0" and B["cse-2017-2-cs-54"]["answer"] == 0

# cse-2021-1-cs-37: (j >= 0) && (i++): i++ runs for j = 0..3 (4 times); the test is true when the old i is
# non-zero: j = 1, 2, 3 add 6 to count; then count += i (4): 10.
assert C.c_out(C.code_block(B["cse-2021-1-cs-37"])) == "10" and C.key_letters(B["cse-2021-1-cs-37"]["answer"]) == ["B"]

# cse-2022-cs-34: 'P' & 'x' = 80 & 120 = 80, + 42 = 122 'z'; 80 | 120 = 120, - 45 = 75 'K'; 80 ^ 120 = 40, + 43 = 83 'S'.
assert (80 & 120, 80 | 120, 80 ^ 120) == (80, 120, 40)
assert C.c_out(C.code_block(B["cse-2022-cs-34"])) == "z K S\n" and C.key_letters(B["cse-2022-cs-34"]["answer"]) == ["A"]

# cse-2024-2-cs-3: with right-to-left argument evaluation, f(g(10), h(20)) first runs h(20) (prints 20),
# then g(10) (prints 10); inside f, g(x) prints 10 and h(y) prints 20: "20101020".
def simulate_f(order):
    out = []
    g = lambda p: (out.append(str(p)), p)[1]
    h = lambda q: (out.append(str(q)), q)[1]
    args = {}
    for k in order:
        args[k] = g(10) if k == 0 else h(20)
    g(args[0])
    h(args[1])
    return "".join(out)


assert simulate_f([1, 0]) == "20101020" and simulate_f([0, 1]) == "10201020"
assert C.key_letters(B["cse-2024-2-cs-3"]["answer"]) == ["A"]
# The real compiler is free to choose; ours prints one of the two orders.
assert C.c_out(C.code_block(B["cse-2024-2-cs-3"])) in ("20101020", "10201020")

# ── Worked examples of the lesson ────────────────────────────────────────────

# ex-promote-gate: unsigned char a = 200, b = 100; a + b is 300 as int; stored in unsigned char = 44.
assert out('unsigned char a = 200, b = 100; int s = a + b; unsigned char t = a + b; printf("%d %d", s, t);') == "300 44"
# ex-shortcircuit-edge: the i++ / j++ count with || .
assert out('int i = 0, j = 0, n = 0; for (int k = 0; k < 4; k++) if (i++ || j++) n++; printf("%d %d %d", i, j, n);') == "4 1 3"
# ex-mixed: int x = 7, y = 2; double d = x / y; d = 3.0; and (double)x / y = 3.5
assert out('int x = 7, y = 2; double d = x / y; double e = (double)x / y; printf("%.1f %.1f", d, e);') == "3.0 3.5"
# ex-ub: i = i++ is undefined; clang warns (we only check that it is flagged with -Wunsequenced)
r = C.run_c(P("int i = 5; i = i++; printf(\"%d\", i);"), flags=("-Werror=unsequenced",))
assert not r.compiled
# ex-char-arith: 'a' - 'A' = 32; 'C' + 32 = 'c'; '7' - '0' = 7
assert out("printf(\"%d %c %d\", 'a' - 'A', 'C' + 32, '7' - '0');") == "32 c 7"
# ex-nested-ternary: largest of three with ties.
assert out("int x = 5, y = 5, z = 2; printf(\"%d\", (x > y) ? ((x > z) ? x : z) : ((y > z) ? y : z));") == "5"
# ex-bits-pow2: x & (x - 1) == 0 tests a power of two (for x > 0).
assert out('int c = 0; for (int x = 1; x <= 1024; x++) if ((x & (x - 1)) == 0) c++; printf("%d", c);') == "11"
# ex-ternary-assoc: a ? b : c ? d : e groups as a ? b : (c ? d : e).
assert out('int a = 0, c = 1; printf("%d", a ? 10 : c ? 20 : 30);') == "20"

# More worked-example numbers.
assert out('printf("%d %d %d %d %d %d", 17/5, 17%5, -17/5, -17%5, 17/-5, 17%-5);') == "3 2 -3 -2 -3 2"
assert out('int x = 7, y = 2; double f = 2.0 + x / y; printf("%.1f %.1f", f, 2.0 * 7 / 2);') == "5.0 7.0"
assert out("char a = 'P', b = 3; printf(\"%d %zu %c\", a + b, sizeof(a + b), a + b);") == "83 4 S"
assert out('unsigned char u = 250; int n = 0; while (u != 4) { u++; n++; } signed char s = 127; s = s + 1; printf("%d %d", n, s);') == "10 -128"
assert out('unsigned char a = 200, b = 100; printf("%d", a + b > 255);') == "1"
assert out('int x = 6; printf("%d %d %d", x & 1 == 0, 1 << 2 + 1, x > 3 == 1); x = 7, 8; printf(" %d", x);', flags=("-Wno-parentheses",)) == "0 8 1 7"
assert out('int a = 2, b = 3; a *= b + 1; printf("%d", a);') == "8"
assert out('int i = 5, j; j = (i++, i++); printf("%d %d", j, i);') == "6 7"
assert out('int i = 5, j; j = i++ && i++; printf("%d %d", j, i);') == "1 7"
assert out('int i = 5; i = i + 1; printf("%d", i);') == "6"
assert not C.run_c(P("int i = 5, j; j = i++ + i++; printf(\"%d\", j);"), flags=("-Werror=unsequenced",)).compiled
assert out('int x = 3, y = 4, z = 2; int a = (x > y) ? ((x > z) ? x : z) : ((y > z) ? y : z); printf("%d", a);') == "4"
for t in ((6, 5, 3), (6, 3, 5), (5, 4, 5)):
    assert int(out('int x = %d, y = %d, z = %d; printf("%%d", (x > y) ? ((x > z) ? x : z) : ((y > z) ? y : z));' % t)) == max(t)

print("l1_01_types_operators: facts, 11 PYQ keys and the worked examples re-derived with cc")

# ── Practice answers (practice.json, lesson 1) ───────────────────────────────
import json  # noqa: E402

PR = {q["id"]: q for q in json.loads((C.CHAPTERS[1] / "practice.json").read_text()) if q["id"].startswith("nx-pds-01-01-")}
assert len(PR) == 10
assert out('printf("%d %d", -9 / 4, -9 % 4);') == "-2 -1" and PR["nx-pds-01-01-q01"]["answer"] == "B"
assert int(out("int a = 012, b = 0x12, c = '2' - '0'; printf(\"%d\", a + b + c);")) == PR["nx-pds-01-01-q02"]["answer"] == 30
assert out('unsigned int x = 5; int y = -7; if (x + y > 0) printf("P"); else printf("N"); printf("%d", x > y);') == "P0" and PR["nx-pds-01-01-q03"]["answer"] == "D"
assert int(out('int i = 3, j = 4, k; k = i++ * --j; k += j++ - --i; printf("%d", i + j + k);')) == PR["nx-pds-01-01-q04"]["answer"] == 16
q5 = {}
for l, e in (("A", "x > 5 || y++"), ("B", "x < 5 && y++"), ("C", "(x > 5) ? 1 : y++"), ("D", "!y || ++y")):
    q5[l] = out(f'int x = 10, y = 0; int v = {e}; printf("%d %d", v, y);')
assert sorted(l for l, v in q5.items() if v == "1 0") == PR["nx-pds-01-01-q05"]["answer"] == ["A", "C", "D"]
assert out('printf("%d", 5 & 3 == 3);', flags=("-Wno-parentheses",)) == "1" and PR["nx-pds-01-01-q06"]["answer"] == "C"
assert int(out('unsigned int n = 1000000, count = 0; while (n > 1) { n = n >> 2; count++; } printf("%u", count);')) == PR["nx-pds-01-01-q07"]["answer"] == 10
assert out('char c = 200; printf("%d %d", c, c + 100);') == "-56 44" and PR["nx-pds-01-01-q08"]["answer"] == "D"
assert out('int a = 1, b = 2, c; c = (a = 5, b += a, a * b); printf("%d %d %d", a, b, c);') == "5 7 35" and PR["nx-pds-01-01-q09"]["answer"] == "A"
# q10: A and C are undefined (UBSan / -Werror=unsequenced reject them); B and D are defined (i = 3, i = 4).
assert not C.run_c(P("int i = 1; i = i++ + 1; printf(\"%d\", i);"), flags=("-Werror=unsequenced",)).compiled
assert not C.run_c(P("volatile int s = 31; int i = 1; i = i << s; printf(\"%d\", i);"), flags=("-fsanitize=undefined", "-fno-sanitize-recover=all")).ok
assert out("int i = 1; i = (i++, i + 1); printf(\"%d\", i);") == "3"
assert out("int i = 1; i = sizeof(i++); printf(\"%d\", i);") == "4"
assert PR["nx-pds-01-01-q10"]["answer"] == ["A", "C"]
print("l1_01_types_operators: 10 practice answers re-derived with cc")
