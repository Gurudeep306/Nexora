"""Check: Chapter 1, Lesson 2 (control flow and loop tracing).

Every C fact the lesson states, every worked-example number, every PYQ key and every practice answer
is re-derived here by compiling and running real C with the system compiler (common.run_c); the Pascal
questions (1991 repeat-until, 1995 dangling else) are translated to C where the semantics coincide and
re-derived in Python from the language rules. Loops that never stop are run with an iteration cap
(or a time limit) and shown to hit the cap.
"""
import json
import math
import random

import common as C

B = C.bank()
P = C.main_wrap


def out(body, before="", **kw):
    return C.c_out(P(body, before=before), **kw)


def popcount(n):
    return bin(n).count("1")


# ── if / else ─────────────────────────────────────────────────────────────────

# Any non-zero scalar is true, 0 is false; a condition may be any arithmetic (or pointer) value.
assert out('printf("%d%d%d%d", -1 ? 1 : 0, 0.5 ? 1 : 0, 0 ? 1 : 0, 0.0 ? 1 : 0);') == "1100"
# The value of an assignment is the stored value: if (x = 0) is always false and destroys x.
assert out('int x = 3; if (x = 0) printf("zero"); else printf("x=%d", x);') == "x=0"
assert out('int x = 3; if (x == 0) printf("zero"); else printf("x=%d", x);') == "x=3"
assert out('int x = 3; if (x = 5) printf("T%d", x);') == "T5"
# clang warns about an assignment used as a condition (-Wparentheses); extra brackets silence it.
assert not C.run_c(P('int x = 3; if (x = 0) printf("z");'), flags=("-Werror=parentheses",)).compiled
assert C.run_c(P('int x = 3; if ((x = 0)) printf("z");'), flags=("-Werror=parentheses",)).compiled
# ex-elseif-easy: the first true test wins.
GRADE = "char g; if (m >= 90) g = 'A'; else if (m >= 75) g = 'B'; else if (m >= 60) g = 'C'; else g = 'F'; printf(\"%c\", g);"
assert [out(f"int m = {m}; {GRADE}") for m in (72, 75, 90, 59)] == ["C", "B", "A", "F"]
# The dangling else: an else binds to the nearest unmatched if (indentation is ignored).
DANGLE = "int x = %d, y = %d; if (x > y) if (x < 0) x = -x; else x = 2 * x; printf(\"%%d\", x);"
BRACED = "int x = %d, y = %d; if (x > y) { if (x < 0) x = -x; } else x = 2 * x; printf(\"%%d\", x);"
assert out(DANGLE % (-10, 20)) == "-10"  # 1995: x > y is false and the else belongs to the inner if
assert out(BRACED % (-10, 20)) == "-20"  # with braces the else belongs to the outer if
assert out(DANGLE % (-30, -40)) == "30" == out(BRACED % (-30, -40))
assert out(DANGLE % (30, 20)) == "60" and out(BRACED % (30, 20)) == "30"
# clang flags the ambiguity (-Wdangling-else), but the program is valid C.
assert not C.run_c(P(DANGLE % (-10, 20)), flags=("-Werror=dangling-else",)).compiled

# cse-1995-a-4 (Pascal): X := -10; Y := 20; if X > Y then if X < 0 then X := abs(X) else X := 2*X;
# Pascal resolves the dangling else exactly as C does (nearest unmatched if), so the C translation applies.
def pascal_1995(X, Y):
    if X > Y:
        if X < 0:
            X = abs(X)
        else:
            X = 2 * X
    return X


assert pascal_1995(-10, 20) == -10 == int(out(DANGLE % (-10, 20)))
for X in range(-15, 16, 5):
    for Y in range(-15, 16, 5):
        assert pascal_1995(X, Y) == int(out(DANGLE % (X, Y)))
assert C.key_letters(B["cse-1995-a-4"]["answer"]) == ["C"]

# ── switch ────────────────────────────────────────────────────────────────────

# cse-2012-cs-3: case 'A' matches, then fall-through to the end.
SRC12 = C.code_block(B["cse-2012-cs-3"])
assert out(SRC12) == "Choice A\nChoice B No Choice"
assert out(SRC12.replace("'A' ;", "'C' ;", 1)) == "Choice B No Choice"
assert out(SRC12.replace("'A' ;", "'Z' ;", 1)) == " No Choice"
assert C.key_letters(B["cse-2012-cs-3"]["answer"]) == ["C"]
# Rules: the controlling expression must be an integer; case labels integer constants, distinct.
assert not C.c_compiles(P('switch (2.5) { case 2: printf("two"); }'))
assert not C.c_compiles(P('int x = 1; switch (x) { case 1.1: printf("a"); }'))
assert not C.c_compiles(P('int x = 1; switch (x) { case 1: printf("a"); case 1: printf("b"); }'))
assert not C.c_compiles(P('int x = 1, y = 1; switch (x) { case y: printf("a"); }'))
assert out("char c = 'b'; switch (c) { case 'a' + 1: printf(\"98\"); }") == "98"
# No match and no default: the whole body is skipped.
assert out('int x = 7; switch (x) { case 1: printf("one"); } printf("end");') == "end"
# ex-switch-default: default may stand anywhere; it is only a label.
SWD = 'for (int i = 0; i < 4; i++) switch (i) { default: printf("d"); case 1: printf("1"); case 2: printf("2"); break; case 3: printf("3"); }'
assert out(SWD) == "d121223"
# ex-switch-edge: relational case labels are constants 0 and 1; "case1:" (no space) is an ordinary label.
SWE = 'int k = %d; switch (k %% 2) { case 5 < 4: printf("even "); case1: printf("one "); case 10 > 9: printf("odd"); }'
assert out(SWE % 8) == "even one odd" and out(SWE % 7) == "odd"
assert C.run_c(P(SWE % 8), flags=("-pedantic-errors", "-Wno-unused-label")).compiled
# break inside a switch leaves only the switch; continue inside a switch goes to the enclosing loop.
assert out('int s = 0; for (int i = 0; i < 4; i++) { switch (i) { case 1: continue; case 2: break; } s += 10 * i; } printf("%d", s);') == "50"

# cse-2015-3-cs-48: j = 2*3/4 + 2.0/5 + 8/5 = 1 + 0.4 + 1 = 2.4, stored in int j = 2; k -= --j: j = 1, k = -1.
assert out('int j = 2 * 3 / 4 + 2.0 / 5 + 8 / 5; printf("%d %d %.1f %d", j, 2 * 3 / 4, 2.0 / 5, 8 / 5);') == "2 1 0.4 1"
assert out('int j = 2, k = 0; k -= --j; printf("%d %d", j, k);') == "1 -1"
SRC15 = C.code_block(B["cse-2015-3-cs-48"])
assert C.c_out(SRC15.replace('printf("\\n%d", i+k);', 'printf("\\n%d", i+k), n++;').replace("int i, j, k = 0;", "int i, j, k = 0, n = 0;").replace("return 0;", 'printf("\\n#%d", n); return 0;')).endswith("#10")
lines15 = [l for l in C.c_out(SRC15).split("\n") if l]
assert lines15 == ["-1", "0", "1", "1", "1", "2", "2", "2", "3", "3"] and len(lines15) == 10 == B["cse-2015-3-cs-48"]["answer"]
# Per value of i + k: -1 -> default only (1), 0 -> 1, 1 -> 3, 2 -> 3, 3 -> 2.
per = {v: lines15.count(str(v)) for v in (-1, 0, 1, 2, 3)}
assert per == {-1: 1, 0: 1, 1: 3, 2: 3, 3: 2}

# ── while, do-while, for, repeat-until, break, continue, goto ─────────────────

# ex-while-do-easy: the do-while body runs once even when the condition is false at the start.
WD = 'int n = %d, w = 0, d = 0, m = n; while (n > 0) { w++; n--; } n = m; do { d++; n--; } while (n > 0); printf("%%d %%d", w, d);'
assert out(WD % 0) == "0 1" and out(WD % 3) == "3 3" and out(WD % -2) == "0 1"
# for (init; cond; inc) body  ==  init; while (cond) { body; inc; }   when body has no continue.
for n in (0, 1, 5, 9):
    a = out(f'int s = 0, i; for (i = 0; i < {n}; i++) s += i * i; printf("%d %d", s, i);')
    b = out(f'int s = 0, i; i = 0; while (i < {n}) {{ s += i * i; i++; }} printf("%d %d", s, i);')
    assert a == b
# A missing condition means "true": for (;;) needs a break.
assert out('int i = 0; for (;;) { if (++i == 4) break; } printf("%d", i);') == "4"
# Comma operator in for and an empty body (the 2006 shape) with n = 37: j = 18 + 9 + 4 + 2 + 1 + 0 = 34.
HALV = 'int i, j, n = %d; for (i = n, j = 0; i > 0; i /= 2, j += i); printf("%%d", j);'
assert out(HALV % 37) == "34" == str(37 - popcount(37))
# The stray-semicolon trap: the body of while (i < 3); is empty, so it never ends (cut off by the time limit).
assert C.run_c(P('int i = 0; while (i < 3); { i++; } printf("%d", i);'), timeout=2).status is None
# ex-continue-edge: continue in a for still runs the increment; the naive while translation does not.
assert out('int s = 0; for (int i = 0; i < 5; i++) { if (i == 2) continue; s += i; } printf("%d", s);') == "8"
assert out('int s = 0, i = 0, guard = 0; while (i < 5 && guard++ < 1000) { if (i == 2) continue; s += i; i++; } printf("%d %d %d", s, i, guard);') == "1 2 1001"
assert out('int s = 0, i = 0; while (i < 5) { if (i == 2) { i++; continue; } s += i; i++; } printf("%d", s);') == "8"
# break leaves only the innermost loop.
assert out('int c = 0; for (int i = 0; i < 3; i++) for (int j = 0; j < 3; j++) { if (j == 1) break; c++; } printf("%d", c);') == "3"
# goto out of two loops versus a flag.
assert out('int i, j; for (i = 0; i < 5; i++) for (j = 0; j < 5; j++) if (i * j == 6) goto done; done: printf("%d %d", i, j);') == "2 3"
assert out('int i, j, f = 0; for (i = 0; i < 5 && !f; i++) for (j = 0; j < 5 && !f; j++) if (i * j == 6) f = 1; printf("%d %d", i - 1, j - 1);') == "2 3"
# do { body } while (c): continue jumps to the test.
assert out('int i = 0, s = 0; do { i++; if (i % 3 == 0) continue; s += i; } while (i < 10); printf("%d", s);') == "37"

# cse-1991-a-4-ii: repeat S until B  ==  S; while not B do S. Simulated on random little state machines:
# S is a random map on a finite state space, B a random predicate; both forms run the same steps.
def repeat_until(S, Bp, x, cap=200):
    trace = []
    while True:
        x = S(x)
        trace.append(x)
        if Bp(x) or len(trace) > cap:
            return x, trace


def seq_while(S, Bp, x, cap=200):
    x = S(x)
    trace = [x]
    while not Bp(x) and len(trace) <= cap:
        x = S(x)
        trace.append(x)
    return x, trace


def while_only(S, Bp, x, cap=200):  # the wrong translation: while not B do S
    trace = []
    while not Bp(x) and len(trace) <= cap:
        x = S(x)
        trace.append(x)
    return x, trace


rng = random.Random(1991)
wrong_differs = 0
for _ in range(2000):
    m = rng.randint(2, 9)
    tab = [rng.randrange(m) for _ in range(m)]
    good = {k for k in range(m) if rng.random() < 0.4}
    S, Bp = (lambda x, t=tab: t[x]), (lambda x, g=good: x in g)
    x0 = rng.randrange(m)
    assert repeat_until(S, Bp, x0) == seq_while(S, Bp, x0)
    wrong_differs += repeat_until(S, Bp, x0) != while_only(S, Bp, x0)
assert wrong_differs > 0
assert "while not B do S" in B["cse-1991-a-4-ii"]["answer"]
# ex-repeat-gate: repeat x := 2x until x > 100, from x = 3 and from x = 500 (C translation: do-while).
REP = 'int x = %d, n = 0; do { x = 2 * x; n++; } while (!(x > 100)); printf("%%d %%d", x, n);'
assert out(REP % 3) == "192 6" and out(REP % 500) == "1000 1"
assert out('int x = 500, n = 0; while (!(x > 100)) { x = 2 * x; n++; } printf("%d %d", x, n);') == "500 0"
assert out('int x = 500, n = 0; x = 2 * x; n++; while (!(x > 100)) { x = 2 * x; n++; } printf("%d %d", x, n);') == "1000 1"

# ── Counting iterations ───────────────────────────────────────────────────────

def count_arith(a, b, s):  # for (i = a; i <= b; i += s), s > 0
    return max(0, (b - a) // s + 1)


cases = [(a, b, s) for a in range(-6, 7, 3) for b in range(-8, 30, 5) for s in (1, 2, 3, 7)]
body = "".join(f"c = 0; for (i = {a}; i <= {b}; i += {s}) c++; printf(\"%d \", c); "
               f"c = 0; for (i = {a}; i < {b}; i += {s}) c++; printf(\"%d \", c); "
               f"c = 0; for (i = {b}; i >= {a}; i -= {s}) c++; printf(\"%d \", c);\n" for a, b, s in cases)
got = list(map(int, out("int c, i;\n" + body).split()))
assert len(cases) * 3 == 480
assert got == [x for a, b, s in cases for x in (count_arith(a, b, s), count_arith(a, b - 1, s), count_arith(a, b, s))]
# ex-count-easy: i = 3, 7, ..., 51 (13 times) and with i < 51 (12 times, last value 47).
assert out('int c = 0, last = 0, i; for (i = 3; i <= 51; i += 4) { c++; last = i; } printf("%d %d %d", c, last, i);') == "13 51 55"
assert out('int c = 0, last = 0, i; for (i = 3; i < 51; i += 4) { c++; last = i; } printf("%d %d %d", c, last, i);') == "12 47 51"
assert count_arith(3, 51, 4) == 13 and count_arith(3, 50, 4) == 12
# Halving and doubling loops.
NS = list(range(1, 70)) + [100, 127, 128, 1000, 1023, 1024, 1025, 10 ** 6, 2 ** 30]
body = "".join(f"""n = {n}; c1 = c2 = c3 = c4 = c5 = 0;
for (int i = n; i > 0; i /= 2) c1++;
for (int i = n; i > 1; i /= 2) c2++;
for (long i = 1; i <= n; i *= 2) c3++;
for (long i = 1; i < n; i *= 2) c4++;
for (long j = 2; j <= n; j *= 2) c5++;
printf("%d %d %d %d %d\\n", c1, c2, c3, c4, c5);
""" for n in NS)
rows = out("int n, c1, c2, c3, c4, c5;\n" + body).splitlines()
for n, got in zip(NS, rows):
    L = math.floor(math.log2(n))
    ceil = (n - 1).bit_length()  # ceil(log2 n) for n >= 1
    assert got == f"{L + 1} {L} {L + 1} {ceil} {L}", (n, got)
    assert n.bit_length() == L + 1
assert len(rows) == len(NS)
# ex-count-doubling: for (i = 1; i < n; i *= 2): n = 1000 -> 10; n = 1024 -> 10; i <= 1024 -> 11.
assert out('int c = 0; for (int i = 1; i < 1000; i *= 2) c++; printf("%d", c);') == "10"
assert out('int c = 0; for (int i = 1; i < 1024; i *= 2) c++; printf("%d", c);') == "10"
assert out('int c = 0; for (int i = 1; i <= 1024; i *= 2) c++; printf("%d", c);') == "11"
# ex-count-edge: starting a doubling loop at 0, or testing i >= 0 in a halving loop, never stops.
assert out('int c = 0, i; for (i = 0; i < 100 && c < 1000; i *= 2) c++; printf("%d %d", c, i);') == "1000 0"
assert out('int c = 0, i; for (i = 100; i >= 0 && c < 1000; i /= 2) c++; printf("%d %d", c, i);') == "1000 0"
# Sum of the halvings: sum_{k>=1} floor(n / 2^k) = n - popcount(n)  (the 2006 value of j).
for n in range(1, 2049):
    assert sum(n >> k for k in range(1, n.bit_length() + 1)) == n - popcount(n)
HN = (1, 2, 3, 37, 100, 1000, 4096, 4095, 10 ** 6)
got = out("int i, j, n;\n" + "".join(f"n = {n}; for (i = n, j = 0; i > 0; i /= 2, j += i); printf(\"%d \", j);\n" for n in HN)).split()
for n, g in zip(HN, got):
    assert int(g) == n - popcount(n)
    assert n - 1 - math.floor(math.log2(n)) <= n - popcount(n) <= n - 1

# cse-2006-cs-15: val(j) = n - popcount(n), between n - 1 - log2 n and n - 1: Theta(n).
assert C.code_block(B["cse-2006-cs-15"]).strip() == "for (i = n, j = 0; i > 0; i /= 2, j += i);"
for n in (8, 100, 1000, 65536, 10 ** 6):
    assert int(out(HALV % n)) == n - popcount(n)
assert int(out(HALV % 1000)) == 994 and int(out(HALV % 65536)) == 65535
assert C.key_letters(B["cse-2006-cs-15"]["answer"]) == ["C"]

# cse-2018-cs-32: fun(2^40): first loop j = 40; second loop halves 40 -> 20 -> 10 -> 5 -> 2 -> 1: sum = 5.
FUN18 = C.code_block(B["cse-2018-cs-32"])
assert out('printf("%lu %lu %lu", fun(1UL << 40), fun(1UL << 16), fun(1000));', before=FUN18) == "5 4 3"
assert math.floor(math.log2(40)) == 5 and [40 >> k for k in range(6)] == [40, 20, 10, 5, 2, 1]
got = out("".join(f'printf("%lu ", fun(1UL << {e}));' for e in range(2, 64)), before=FUN18).split()
assert [int(g) for g in got] == [math.floor(math.log2(e)) for e in range(2, 64)]
assert C.key_letters(B["cse-2018-cs-32"]["answer"]) == ["B"]

# ── Nested loops ──────────────────────────────────────────────────────────────

assert out('int c = 0; for (int i = 0; i < 4; i++) for (int j = 0; j < 5; j++) c++; printf("%d", c);') == "20"
for n in (1, 2, 5, 10, 17):
    assert int(out(f'int c = 0; for (int i = 0; i < {n}; i++) for (int j = i; j < {n}; j++) c++; printf("%d", c);')) == n * (n + 1) // 2
    assert int(out(f'int c = 0; for (int i = 0; i < {n}; i++) for (int j = i; j < {n}; j++) for (int k = i; k <= j; k++) c++; printf("%d", c);')) == n * (n + 1) * (n + 2) // 6
assert out('int c = 0; for (int i = 0; i < 10; i++) for (int j = i; j < 10; j++) c++; printf("%d", c);') == "55"

# cse-2013-cs-31: k = (n - floor(n/2) + 1) * floor(log2 n) * floor(n/2).
FUN13 = C.code_block(B["cse-2013-cs-31"])


def unknown_closed(n):
    return (n - n // 2 + 1) * math.floor(math.log2(n)) * (n // 2)


NS13 = list(range(2, 80)) + [100, 128, 1000]
got = out("".join(f'printf("%d ", unknown({n}));' for n in NS13), before=FUN13).split()
assert [int(g) for g in got] == [unknown_closed(n) for n in NS13]
assert int(out('printf("%d %d %d", unknown(8), unknown(16), unknown(10));', before=FUN13).split()[0]) == 60
assert out('printf("%d %d %d", unknown(8), unknown(16), unknown(10));', before=FUN13) == "60 288 90"
assert (5 * 3 * 4, 9 * 4 * 8, 6 * 3 * 5) == (60, 288, 90)
# Theta(n^2 log n): the ratio k / (n^2 log2 n) tends to 1/4.
r = [unknown_closed(2 ** e) / ((2 ** e) ** 2 * e) for e in (10, 15, 20)]
assert all(abs(x - 0.25) < 0.01 for x in r)
assert C.key_letters(B["cse-2013-cs-31"]["answer"]) == ["B"]
# ex-nested-edge: the dependent doubling nest: for (i = 1; i <= n; i *= 2) for (j = 0; j < i; j++): 2^(L+1) - 1.
for n in (1, 5, 64, 100, 1000):
    L = math.floor(math.log2(n))
    assert int(out(f'int c = 0; for (int i = 1; i <= {n}; i *= 2) for (int j = 0; j < i; j++) c++; printf("%d", c);')) == 2 ** (L + 1) - 1
assert out('int c = 0; for (int i = 1; i <= 100; i *= 2) for (int j = 0; j < i; j++) c++; printf("%d", c);') == "127"

# cse-2014-1-cs-41: MyX returns the maximum sum of a (non-empty, contiguous) sub-array.
FUN14 = C.code_block(B["cse-2014-1-cs-41"])
rng = random.Random(2014)


def kadane(a):
    best = cur = a[0]
    for x in a[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    return best


arrays = [[rng.randint(-9, 9) for _ in range(rng.randint(1, 9))] for _ in range(60)]
arrays += [[-3, -1, -2], [5], [2, -1, 2], [-2, 1, -3, 4, -1, 2, 1, -5, 4], [3, -4, 5, -1, 2]]
body = "".join(f"{{ int E[] = {{{', '.join(map(str, a))}}}; printf(\"%d \", MyX(E, {len(a)})); }}\n" for a in arrays)
got = list(map(int, out(body, before=FUN14).split()))
assert got == [kadane(a) for a in arrays]
# Option B (max element), C, D (total sum) are different on the lesson's example array.
ex = [3, -4, 5, -1, 2]
assert kadane(ex) == 6 and max(ex) == 5 and sum(ex) == 5
subs = [ex[i:j + 1] for i in range(len(ex)) for j in range(i, len(ex))]
assert sum(max(s) for s in subs) == 50
assert C.key_letters(B["cse-2014-1-cs-41"]["answer"]) == ["A"]

# ── Floats and infinite loops ─────────────────────────────────────────────────

# cse-2019-cs-52: 2/1, 2/2, ..., the ratio halves; prints for ratios 2, 1, 0.5, 0.25, 0.125: 5 times.
SRC19 = C.code_block(B["cse-2019-cs-52"])
assert C.c_out(SRC19) == "1.000000\n1.500000\n1.750000\n1.875000\n1.937500\n" and B["cse-2019-cs-52"]["answer"] == 5
# Powers of two are exact in binary floating point; 0.1 is not.
assert out('float x = 0; for (int k = 0; k < 10; k++) x += 0.1f; printf("%.9f %d", x, x == 1.0f);') == "1.000000119 0"
assert out('double x = 0; for (int k = 0; k < 10; k++) x += 0.1; printf("%.17g %d", x, x == 1.0);') == "0.99999999999999989 0"
assert out('float x = 0; int n = 0; while (x != 1.0f && n < 1000) { x += 0.1f; n++; } printf("%d", n);') == "1000"
assert out('float x = 0; int n = 0; while (x < 1.0f) { x += 0.25f; n++; } printf("%d %d", n, x == 1.0f);') == "4 1"
assert out('int n = 0; for (int k = 0; k < 10; k++) n++; printf("%.1f", n / 10.0);') == "1.0"
assert out('float x = 0; int n = 0; while (x < 0.95f) { x += 0.1f; n++; } printf("%d", n);') == "10"
# cse-2024-1-cs-8: a = 6 -> 6/12 + 1 = 1 -> 1/12 + 1 = 1 forever: the program never prints.
SRC24 = C.code_block(B["cse-2024-1-cs-8"])
r24 = C.run_c(SRC24, timeout=2)
assert r24.compiled and r24.status is None and r24.out == ""
assert out('int a = 6, b = 0, it = 0; while (a < 10 && it < 1000) { a = a / 12 + 1; a += b; it++; } printf("%d %d", a, it);') == "1 1000"
assert [6 // 12 + 1, 1 // 12 + 1] == [1, 1]
assert C.key_letters(B["cse-2024-1-cs-8"]["answer"]) == ["C"]
# The fixed-point theorem: with a = 6 the state after one pass is 1, and 1 maps to itself.
seen, a = [], 6
while a < 10 and a not in seen:
    seen.append(a)
    a = a // 12 + 1
assert seen == [6, 1] and a == 1
# For 0 <= a < 10, a / 12 = 0, so one pass sets a = 1 + b and it stays there: the loop ends iff 1 + b >= 10.
assert out('int a = 6, b = 9; while (a < 10) { a = a / 12 + 1; a += b; } printf("%d", a);') == "10"
assert out('int a = 6, b = 3, it = 0; while (a < 10 && it < 1000) { a = a / 12 + 1; a += b; it++; } printf("%d %d", a, it);') == "4 1000"
# ex-unsigned-edge: unsigned u >= 0 is always true; u-- from 0 wraps to 4294967295.
assert out('int c = 0; unsigned u; for (u = 3; u >= 0 && c < 10; u--) c++; printf("%d %u", c, u);') == "10 4294967289"
assert out('unsigned u = 0; u--; printf("%u", u);') == "4294967295"
# A signed char counter: a++ computes 128 in int and converting it back to signed char gives -128 (our model).
assert out('char a = 10; int n = 0; while (a > 0) { n++; a++; } printf("%d %d", n, a);') == "118 -128"
# A loop is infinite if its state repeats while the condition holds: while (a = b) with b = 5.
assert out('int a = 0, b = 5, n = 0; while ((a = b) && n < 50) { a++; n++; } printf("%d %d", a, n);') == "5 50"

# ── Tracing ───────────────────────────────────────────────────────────────────

# ex-trace-easy: odd numbers add up to squares.
assert out('int i, s; for (i = 1, s = 0; s < 20; i += 2) s += i; printf("%d %d", i, s);') == "11 25"
# it-2007-cs-31: increasing runs 2 | -2 | -1 | 3 4 | 2; the best run sum is 3 + 4 = 7.
SRC07 = C.code_block(B["it-2007-cs-31"])
assert C.c_out(SRC07) == "7\n" and C.key_letters(B["it-2007-cs-31"]["answer"]) == ["C"]
assert C.c_out(SRC07.replace("{2, -2, -1, 3, 4, 2}", "{1, 2, 3, -1, 5, 6}")) == "11\n"
# cse-2003-cs-88: every A[j] (3 <= j <= n) becomes 1, so nothing is printed.
SRC03 = C.code_block(B["cse-2003-cs-88"])
body = "".join(f"n = {n}; TwoLog_n = {2 * math.floor(math.log2(n))};\n{SRC03}\nprintf(\"|\");\n" for n in range(3, 130))
assert out("int A[140], j, k, n, TwoLog_n;\n" + body) == "|" * 127
# Why: let m be the smallest k >= 2 that does not divide j. All of 2 .. m-1 divide j, so lcm(2..m-1) <= j, and
# lcm(2..t) >= 2^(t-1); hence 2^(m-2) <= j, m <= floor(log2 j) + 2 <= 2 floor(log2 n) for n >= 4 (n = 3: m = 2 = TwoLog_n),
# and m <= j - 1 because j - 1 never divides j (j >= 3). So some k in the loop's range marks every j.
for t in range(2, 40):
    assert math.lcm(*range(2, t + 1)) >= 2 ** (t - 1)
for n in range(3, 400):
    tl = 2 * math.floor(math.log2(n))
    for j in range(3, n + 1):
        m = next(k for k in range(2, j + 1) if j % k)
        assert m <= min(tl, j - 1) and 2 ** (m - 2) <= j
assert C.key_letters(B["cse-2003-cs-88"]["answer"]) == ["D"]
# With !(j%k) (mark the multiples of k, as a real sieve does) the same fragment prints the odd primes: 3 5 7 for n = 10.
assert out("int A[12], j, k, n = 10, TwoLog_n = 6; for (k=3;k<=n;k++) A[k]=0; for (k=2;k<=TwoLog_n;k++) for (j=k+1;j<=n;j++) A[j] = A[j] || !(j%k); for (j=3;j<=n;j++) if (!A[j]) printf(\"%d \",j);") == "3 5 7 "

# More facts the lesson states.
assert out('unsigned char x = 126; int n = 0; while (x > 0) { x++; n++; } printf("%d %d", n, x);') == "130 0"
assert out('int i, sum = 0, n = 5; for (i = 0; i < n; i++); { sum += i; } printf("%d %d", i, sum);') == "5 5"
assert out('int i = 0, s = 0; L: if (!(i < 5)) goto end; s += i; i++; goto L; end: printf("%d", s);') == "10"
assert out('int c = 0; for (int i = 0; i < 5; i++) c++; int i = 0, d = 0; while (i < 5) { d++; i++; } printf("%d %d", c, d);') == "5 5"
FUN13C = FUN13.replace("k = k + n/2;", "k = k + 1;")
assert out('printf("%d %d", unknown(8), unknown(1024));', before=FUN13C) == f"15 {(1024 - 512 + 1) * 10}"
assert bin(40)[2:] == "101000" and popcount(1000) == 6 and bin(37)[2:] == "100101"
assert [1000 >> k for k in range(10)] == [1000, 500, 250, 125, 62, 31, 15, 7, 3, 1]
assert sum([3, 4, 2]) == 9 and 2 + 0 + 0 == 2  # IT 2007 trap answer 9 adds the final 2 into the run

print("l1_02_control_flow: facts, 12 PYQ keys and the worked examples re-derived with cc", end="; ")

# ── Practice answers (practice.json, lesson 2) ───────────────────────────────

PR = {q["id"]: q for q in json.loads((C.CHAPTERS[1] / "practice.json").read_text()) if q["id"].startswith("nx-pds-01-02-")}
assert len(PR) == 10
# q01: dangling else with x = 5, y = 0.
assert out('int x = 5, y = 0; if (x > 0) if (y > 0) printf("A"); else printf("B"); printf("C");') == "BC"
assert out('int x = -5, y = 0; if (x > 0) if (y > 0) printf("A"); else printf("B"); printf("C");') == "C"
assert PR["nx-pds-01-02-q01"]["answer"] == "A"
# q02: for (i = 5; i < 100; i += 7): 5, 12, ..., 96: 14 times.
assert int(out('int c = 0; for (int i = 5; i < 100; i += 7) c++; printf("%d", c);')) == PR["nx-pds-01-02-q02"]["answer"] == 14 == count_arith(5, 99, 7)
# q03: switch with default in the middle and a break.
Q3 = 'int s = 0; for (int i = 1; i <= 4; i++) { switch (i %% 3) { case 1: s += 1; default: s += 10; break; case 2: s += 100; } } printf("%%d", s);'
assert out(Q3 % ()) == "132" and PR["nx-pds-01-02-q03"]["answer"] == "C"
# q04: harmonic nest for n = 10.
assert int(out('int c = 0, n = 10; for (int i = 1; i <= n; i++) for (int j = 1; j <= n; j += i) c++; printf("%d", c);')) == PR["nx-pds-01-02-q04"]["answer"] == 33
assert sum((10 - 1) // i + 1 for i in range(1, 11)) == 33
# q05: which loops terminate?  A: unsigned u >= 0 (never); B: a = a / 2 while a > 1 (yes); C: float x != 1.0f (never);
# D: unsigned char c += 3 until c == 10 (yes, after 174 passes: 3 is invertible mod 256).
assert out('int c = 0; for (unsigned u = 5; u >= 0 && c < 1000; u--) c++; printf("%d", c);') == "1000"
assert out('int a = 100, c = 0; while (a > 1) { a = a / 2; c++; } printf("%d %d", a, c);') == "1 6"
assert out('float x = 0; int c = 0; while (x != 1.0f && c < 1000) { x += 0.1f; c++; } printf("%d", c);') == "1000"
assert out('unsigned char c = 0; int n = 0; do { c += 3; n++; } while (c != 10); printf("%d", n);') == "174"
assert (3 * 174) % 256 == 10
assert PR["nx-pds-01-02-q05"]["answer"] == ["B", "D"]
# q06: while vs do-while with a false start.
assert out('int n = 0, a = 0, b = 0; while (n) { a++; n--; } do { b++; } while (n); printf("%d %d", a, b);') == "0 1"
assert PR["nx-pds-01-02-q06"]["answer"] == "A"
# q07: j after the 2006 loop with n = 100: 50 + 25 + 12 + 6 + 3 + 1 + 0 = 97.
assert int(out(HALV % 100)) == PR["nx-pds-01-02-q07"]["answer"] == 97 == 100 - popcount(100)
# q08: for (i = n; i > 1; i /= 2) for (j = 1; j < i; j *= 2): sum of log2 i = L(L + 1)/2 for n = 2^L: Theta(log^2 n).
for L in (1, 4, 10, 20):
    assert int(out(f'long c = 0; for (long i = 1L << {L}; i > 1; i /= 2) for (long j = 1; j < i; j *= 2) c++; printf("%ld", c);')) == L * (L + 1) // 2
assert PR["nx-pds-01-02-q08"]["answer"] == "B"
# q09: which switch statements compile?  A: case 'a' + 1 (yes); B: switch on a double (no); C: default first (yes);
# D: a variable as a case label (no).
assert C.c_compiles(P("char c = 'b'; switch (c) { case 'a' + 1: printf(\"x\"); }"))
assert not C.c_compiles(P('double d = 2.0; switch (d) { case 2: printf("x"); }'))
assert C.c_compiles(P('int x = 3; switch (x) { default: printf("d"); case 1: printf("1"); }'))
assert not C.c_compiles(P('int x = 3, y = 3; switch (x) { case y: printf("y"); }'))
assert PR["nx-pds-01-02-q09"]["answer"] == ["A", "C"]
# q10: do-while with continue (the test still runs): 1 + 2 + 4 + 5 + 7 + 8 + 10 = 37.
assert int(out('int i = 0, s = 0; do { i++; if (i % 3 == 0) continue; s += i; } while (i < 10); printf("%d", s);')) == PR["nx-pds-01-02-q10"]["answer"] == 37
# The distractors' numbers.
assert sum(10 // i for i in range(1, 11)) == 27 and sum(i for i in range(1, 10) if i % 3) == 27
assert (1 + 100 + 10 + 1, 11 + 110 + 10 + 11, 11 + 100 + 10) == (112, 142, 121)
mcq = [PR[q]["answer"] for q in PR if PR[q]["type"] == "MCQ"]
assert len(set(mcq)) >= 3
print("10 practice answers re-derived with cc")
