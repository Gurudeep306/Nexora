"""Teacher-style v2 solutions for the PYQs of PDS Chapter 1, Lesson 1 (types, operators and expressions).
Every key is re-derived in l1_01_types_operators.py by compiling and running the program with cc (the
FORTRAN and Pascal ones from the language rules). `python3 _sol.py 1` writes them into src/gate/solutions."""
import common as C

opt = C.opt
SOLUTIONS = {}


def code(src, line=None, vars=None, output=None, title=None, caption=None):
    f = {"kind": "code", "lang": "c", "code": src}
    if title:
        f["title"] = title
    if line:
        f["line"] = line
    if vars:
        f["vars"] = vars
    if output is not None:
        f["output"] = output
    if caption:
        f["caption"] = caption
    return f


def table(title, cols, rows, labels=None, reveal=None, caption=None):
    f = {"kind": "table", "title": title, "cols": cols, "rows": rows, "mono": True}
    if labels:
        f["rowLabels"] = labels
    if reveal is not None:
        f["reveal"] = reveal
    if caption:
        f["caption"] = caption
    return f


SOLUTIONS["cse-1991-a-4-i"] = {
    "approach": "Concept tested: **a relational expression is itself a Boolean value**. `x > 5` already evaluates to `true` or `false`, so the whole `if` that copies that truth value into `y` collapses to one assignment.",
    "concepts": ["Boolean expression", "Relational operator", "Assignment"],
    "given": "Pascal: `if x > 5 then y := true else y := false;` with `y` a Boolean variable.",
    "steps": [
        {"title": "What the if statement stores", "body": "When `x > 5` is true the statement stores `true` in `y`; when it is false it stores `false`. In both cases the value stored is exactly the value of the condition `x > 5`."},
        {"title": "Replace the if by its condition", "body": "So the statement is equivalent to **`y := x > 5`**. In Pascal `>` has lower precedence than `:=`'s right-hand side needs, but the right-hand side of an assignment is the whole expression, so no parentheses are required (writing `y := (x > 5)` is equally correct)."},
        {"title": "The same idea in C", "body": "In C a relational expression has type `int` with value 1 or 0, so `if (x > 5) y = 1; else y = 0;` is `y = x > 5;` for the same reason."},
    ],
    "answer": {"value": "y := x > 5", "matchesKey": True},
    "shortcut": "Whenever an `if` assigns `true` in one branch and `false` in the other, the assignment is `y := condition` (or `y := not condition` if the branches are swapped).",
    "pitfalls": [
        "Writing `y := (x > 5) = true`: correct but redundant; comparing a Boolean with `true` adds nothing.",
        "Swapping the branches by mistake: `if x > 5 then y := false else y := true` is `y := not (x > 5)`, i.e. `y := x <= 5`.",
    ],
    "verification": "For every x from −3 to 11 the value stored by the if statement equals the value of `x > 5` (checked exhaustively).",
}

SOLUTIONS["cse-1993-a-2-5"] = {
    "approach": "Concept tested: **precedence, associativity and integer division**. In FORTRAN `**` binds tighter than unary minus, `*` and `/` share one level and go left to right, and dividing two integers truncates; the REAL result is truncated when it is stored in the INTEGER `I`.",
    "concepts": ["Operator precedence", "Associativity", "Integer division", "Type conversion"],
    "given": "`I = -2**2 + 5.0*X/X*3 + 3/4` with `X = 4.0`; `I` is INTEGER (FORTRAN's implicit typing: names starting with I–N are integers).",
    "steps": [
        {"title": "-2**2", "body": "Exponentiation binds tighter than the unary minus: $-2^{**}2 = -(2^2) = -4$, not $(-2)^2 = 4$."},
        {"title": "5.0*X/X*3", "body": "`*` and `/` have equal precedence and associate left to right: $((5.0 \\times 4.0) / 4.0) \\times 3 = (20.0 / 4.0) \\times 3 = 5.0 \\times 3 = 15.0$."},
        {"title": "3/4", "body": "Both operands are integers, so this is integer division: $3/4 = 0$ (the fraction is discarded)."},
        {"title": "Add and store", "body": "$-4 + 15.0 + 0 = 11.0$; storing the REAL 11.0 into the INTEGER `I` gives **11**."},
    ],
    "answer": {"value": "11", "number": 11, "matchesKey": True},
    "pitfalls": [
        "Reading `-2**2` as $(-2)^2 = 4$, which gives 19: unary minus is applied after `**`.",
        "Treating `5.0*X/X*3` as $5.0X/(3X)$ (a fraction with $X \\cdot 3$ below): that gives $-4 + 1.67 + 0 \\approx -2$. Left-to-right grouping puts the 3 in the numerator.",
        "Taking 3/4 as 0.75: with two integer operands it is 0.",
    ],
    "verification": "Re-evaluated with the FORTRAN rules in Python: (−4) + 15.0 + 0 = 11.0, truncated to 11 (the misreading as a fraction would give −2).",
    "animation": table("Evaluating the right-hand side, term by term", ["term", "rule", "value"],
                       [["-2**2", "** before unary -", "-4"], ["5.0*X/X*3", "* / left to right", "15.0"], ["3/4", "integer division", "0"], ["sum → I", "REAL to INTEGER", "11"]], reveal=0),
}

SOLUTIONS["it-2004-it-15"] = {
    "approach": "Concept tested: **arithmetic that flips a 0/1 value**. When x can only be 0 or 1, the statement maps 0 → 1 and 1 → 0; check each option on both values, and watch for an option that divides by zero.",
    "concepts": ["Arithmetic operators", "Integer remainder", "Undefined behaviour"],
    "steps": [
        {"title": "What the statement does", "body": "`if (x == 0) x = 1; else x = 0;` sends **0 → 1** and **1 → 0**: it toggles x.", "scene": {"reveal": 1}},
        {"title": "Try each option on x = 0 and x = 1", "body": "A: `1 + x` gives 1 and 2 (wrong for x = 1). **B: `1 - x` gives 1 and 0** (exactly the toggle). C: `x - 1` gives −1 and 0. D: `1 % x` divides by zero when x = 0.", "scene": {"reveal": 5}},
        {"title": "Why D is not an answer even if it seems to print 1", "body": "`1 % 0` is integer division by zero, which is **undefined behaviour** in C: on x86-64 the program is killed with a floating-point exception, on some ARM processors the instruction quietly produces a number. A statement with undefined behaviour is not equivalent to anything."},
    ],
    "answer": {"value": "(B) x = 1 - x;", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "1 + x maps 0 → 1 but 1 → 2, not 0."),
        opt("B", True, "1 − x maps 0 → 1 and 1 → 0: exactly the toggle."),
        opt("C", False, "x − 1 maps 0 → −1 and 1 → 0."),
        opt("D", False, "For x = 0 it computes 1 % 0, a division by zero: undefined behaviour (x = 1 gives 1 % 1 = 0)."),
    ],
    "shortcut": "For a value known to be 0 or 1, `1 - x`, `!x` and `x ^ 1` all toggle it.",
    "pitfalls": [
        "Testing only x = 0: A and D both seem to give 1 there.",
        "Believing `1 % 0` is 1 because one compiler printed 1: division and remainder by zero are undefined.",
    ],
    "verification": "Each option compiled and run for x = 0 and x = 1 with cc: only B prints 1 then 0; D is reported as a division by zero by the undefined-behaviour sanitizer.",
    "animation": table("The four options on both inputs", ["x = 0", "x = 1"],
                       [["1", "0"], ["1", "2"], ["1", "0"], ["-1", "0"], ["÷ by 0", "0"]],
                       ["if/else", "A: 1 + x", "B: 1 - x", "C: x - 1", "D: 1 % x"], reveal=1),
}

SOLUTIONS["cse-2008-cs-18"] = {
    "approach": "Concept tested: **the conditional operator `?:`**. The nested expression returns the largest of x, y and z, so `a = 4` exactly when the maximum of the three is 4.",
    "concepts": ["Conditional operator", "Nested expressions", "Maximum"],
    "given": "`a = (x > y) ? ((x > z) ? x : z) : ((y > z) ? y : z)`",
    "steps": [
        {"title": "Read the expression", "body": "If x > y, the larger of x and z is chosen; otherwise the larger of y and z. Either way the result is **max(x, y, z)** (ties resolve to one of the equal values, which is still the maximum)."},
        {"title": "Find the option whose maximum is 4", "body": "A: max(3, 4, 2) = **4**. B: max(6, 5, 3) = 6. C: max(6, 3, 5) = 6. D: max(5, 4, 5) = 5."},
        {"title": "Trace A to be sure", "body": "x = 3, y = 4: `x > y` is false, so evaluate `(y > z) ? y : z` = `(4 > 2) ? 4 : 2` = 4. So a = 4."},
    ],
    "answer": {"value": "(A) x = 3, y = 4, z = 2", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "x > y is false, then y > z is true: a = y = 4."),
        opt("B", False, "x > y and x > z: a = x = 6."),
        opt("C", False, "x > y and x > z: a = x = 6."),
        opt("D", False, "x > y, then x > z is false (5 > 5): a = z = 5."),
    ],
    "shortcut": "Recognise the pattern \"(x > y) ? max(x, z) : max(y, z)\" as max of three; then only option A has maximum 4.",
    "pitfalls": [
        "Grouping `?:` the wrong way: it associates right to left, and here the parentheses make the grouping explicit anyway.",
        "In D, taking 5 > 5 as true: it is false, so z (also 5) is chosen; the result is 5 either way.",
    ],
    "verification": "Compiled and run with cc for the four (x, y, z) triples: 4, 6, 6, 5.",
    "animation": table("Which branch each option takes", ["x > y?", "next test", "a"],
                       [["no", "y > z: yes", "4"], ["yes", "x > z: yes", "6"], ["yes", "x > z: yes", "6"], ["yes", "x > z: no", "5"]],
                       ["A (3,4,2)", "B (6,5,3)", "C (6,3,5)", "D (5,4,5)"], reveal=0),
}

FUNC = """int func(int num) {
    int count = 0;
    while (num) {
        count++;
        num >>= 1;
    }
    return (count);
}"""
SOLUTIONS["cse-2014-2-cs-10"] = {
    "approach": "Concept tested: **right shift as halving**. Each `num >>= 1` drops the lowest bit, so the loop runs once per bit of 435 and stops when no 1 bits remain: the count is the number of binary digits, $\\lfloor \\log_2 435 \\rfloor + 1$.",
    "concepts": ["Right shift", "Binary representation", "Loop counting"],
    "steps": [
        {"title": "Write 435 in binary", "body": "$435 = 256 + 128 + 32 + 16 + 2 + 1 = 110110011_2$, a 9-bit number (its top bit has weight $2^8 = 256$).", "scene": {"line": 3, "vars": {"num": 435, "count": 0}}},
        {"title": "Each iteration removes one bit", "body": "`num >>= 1` is integer division by 2 for a positive value: 435 → 217 → 108 → 54 → 27 → 13 → 6 → 3 → 1 → 0. The loop body runs once for each of the 9 values before 0.", "scene": {"line": 5, "vars": {"num": 0, "count": 9}}},
        {"title": "Return the count", "body": "The loop ends when num becomes 0, after **9** iterations: func(435) = 9.", "scene": {"line": 7}},
    ],
    "answer": {"value": "9", "number": 9, "matchesKey": True},
    "shortcut": "For n > 0 the loop count is the bit length: $\\lfloor \\log_2 n \\rfloor + 1$. Since $2^8 = 256 \\le 435 < 512 = 2^9$, it is 9.",
    "pitfalls": [
        "Counting the 1 bits instead (popcount 435 = 6): the loop counts every shift, not only the 1s.",
        "Answering $\\lfloor \\log_2 435 \\rfloor = 8$: the loop also runs for the last value 1.",
    ],
    "verification": "Compiled and run with cc: func(435) prints 9; for n = 1, 2, 3, 7, 8, 255, 256, 1000 and 2³⁰ the result equals ⌊log₂ n⌋ + 1.",
    "animation": code(FUNC, line=1, vars={"num": 435, "count": 0}, title="func(435)"),
}

SOLUTIONS["cse-2014-2-cs-11"] = {
    "approach": "Concept tested: **unsigned overflow and exact integer division**. With 32-bit unsigned arithmetic, a product that exceeds $2^{32} - 1$ wraps modulo $2^{32}$, so keep intermediate values small by dividing early, but only by divisions that are always exact.",
    "concepts": ["Unsigned overflow", "Integer division", "Order of evaluation"],
    "given": "`n` and `p` are `unsigned int` (32 bits); we want $\\binom{n}{3} = \\frac{n(n-1)(n-2)}{6}$ for large n.",
    "steps": [
        {"title": "Why A overflows", "body": "`n * (n-1) * (n-2)` is computed first, about $n^3$. For n = 2000 that is $7.99 \\times 10^9 > 2^{32} \\approx 4.29 \\times 10^9$, so it wraps before the division by 6 and the result is wrong although $\\binom{2000}{3} = 1\\,331\\,334\\,000$ itself fits."},
        {"title": "Why D does not help", "body": "In `n * (n-1) * (n-2) / 6.0` the product is still evaluated in `unsigned int` (left to right, both operands unsigned) and wraps; only the final division is done in double. The damage is already done."},
        {"title": "Why B is exact and keeps numbers small", "body": "Left to right: `n * (n-1)` is a product of two consecutive integers, always even, so `/ 2` is exact; then `* (n-2)` gives $\\binom{n}{2}(n-2)$, which is $3\\binom{n}{3}$, so `/ 3` is exact too. The largest intermediate value is about $n^3/2$ instead of $n^3$."},
        {"title": "Why C can be wrong", "body": "`n * (n-1) / 3` is exact only when 3 divides $n(n-1)$, i.e. when $n \\bmod 3 \\ne 2$. For n = 5: $20/3 = 6$ (truncated), $6 \\times 3 / 2 = 9$, but $\\binom{5}{3} = 10$."},
    ],
    "answer": {"value": "(B) p = n * (n-1) / 2 * (n-2) / 3;", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Forms the full product n(n−1)(n−2) first; for large n it wraps modulo 2³² before the division."),
        opt("B", True, "Both divisions are exact at the moment they happen (two consecutive integers are divisible by 2; C(n,2)(n−2) = 3·C(n,3)) and intermediate values stay half as large."),
        opt("C", False, "Divides n(n−1) by 3 first, which truncates when n mod 3 = 2 (n = 5 gives 9 instead of 10)."),
        opt("D", False, "The product is still computed in unsigned int and wraps; converting to double only for the last division is too late."),
    ],
    "shortcut": "Divide as early as possible, but only by a number that is guaranteed to divide what you have so far: 2 | n(n−1), then 3 | C(n,2)(n−2).",
    "pitfalls": [
        "Choosing D because \"6.0 makes it floating point\": the conversion happens only at the last operation.",
        "Choosing C because it also divides early: the first division is not always exact.",
    ],
    "verification": "Compiled with cc for n = 5, 10, 100, 1000, 1500, 1625 and 2000: B always equals the exact C(n,3); for n = 2000, A and D give wrapped values; C gives 9 for n = 5.",
    "animation": table("n = 2000 (exact C(n,3) = 1331334000)", ["largest intermediate", "result"],
                       [["7,992,004,000 (wraps)", "wrong"], ["3,996,002,000 (fits)", "1331334000"], ["2,665,334 × 1998 ok", "exact only if 3 | n(n−1)"], ["wraps before /6.0", "wrong"]],
                       ["A", "B", "C", "D"], reveal=0),
}

SRC_2017_53 = """#include <stdio.h>
#include <string.h>

void printlength(char *s, char *t) {
   unsigned int c = 0;
   int len = ((strlen(s) - strlen(t)) > c) ? strlen(s): strlen(t);
   printf("%d\\n", len);
}

void main() {
   char *x = "abc";
   char *y = "defgh";
   printlength(x,y);
}"""
SOLUTIONS["cse-2017-1-cs-53"] = {
    "approach": "Concept tested: **unsigned subtraction never goes negative**. `strlen` returns the unsigned `size_t`, so `strlen(s) - strlen(t)` = 3 − 5 wraps round to a huge positive number, the comparison `> c` is true, and the program prints `strlen(s)`.",
    "concepts": ["size_t", "Unsigned arithmetic", "Usual arithmetic conversions", "Conditional operator"],
    "steps": [
        {"title": "The lengths", "body": "`strlen(\"abc\") = 3` and `strlen(\"defgh\") = 5`, both of type `size_t` (unsigned).", "scene": {"line": 6, "vars": {"strlen(s)": 3, "strlen(t)": 5}}},
        {"title": "3 − 5 in unsigned arithmetic", "body": "Unsigned arithmetic is modulo $2^w$ ($w$ = 32 for the question's `unsigned int`, 64 for a 64-bit `size_t`): $3 - 5 = 2^w - 2$, a very large **positive** number. There are no negative unsigned values.", "scene": {"vars": {"strlen(s)": 3, "strlen(t)": 5, "s−t": "2^w − 2"}}},
        {"title": "The comparison and the choice", "body": "`(2^w − 2) > c` with `c = 0` is true, so the conditional operator chooses `strlen(s)` = 3, and `len = 3`. The program prints **3**.", "scene": {"line": 7, "output": "3"}},
    ],
    "answer": {"value": "3", "number": 3, "matchesKey": True},
    "shortcut": "If the difference of two `size_t` values is compared with 0 (or any unsigned 0), the test is true unless the two lengths are equal; so the first branch wins whenever the lengths differ.",
    "pitfalls": [
        "Answering 5 by treating 3 − 5 as −2 (false) and taking `strlen(t)`: that is what happens with `int` lengths, not with `size_t`.",
        "Worrying about `void main()`: it is not standard C but the compilers GATE assumes accept it; the question is about the arithmetic.",
    ],
    "verification": "Compiled and run with cc (with `int main` and also as written): prints 3. With the lengths cast to int, `(3 - 5) > 0` is 0 and the program would print 5.",
    "animation": code(SRC_2017_53, line=6, title="printlength(\"abc\", \"defgh\")"),
}

SRC_2017_54 = """#include<stdio.h>
int main() {
    int m = 10;
    int n, n1;
    n = ++m;
    n1 = m++;
    n--;
    --n1;
    n -= n1;
    printf("%d", n);
    return 0;
}"""
SOLUTIONS["cse-2017-2-cs-54"] = {
    "approach": "Concept tested: **pre- versus post-increment**. `++m` increments first and yields the new value; `m++` yields the old value and increments afterwards. As separate statements `n--` and `--n1` are just decrements.",
    "concepts": ["Pre-increment", "Post-increment", "Compound assignment"],
    "steps": [
        {"title": "n = ++m", "body": "m becomes 11 first, and n receives the new value: m = 11, n = 11.", "scene": {"line": 5, "vars": {"m": 11, "n": 11, "n1": "?"}}},
        {"title": "n1 = m++", "body": "n1 receives the current value 11, then m becomes 12: n1 = 11, m = 12.", "scene": {"line": 6, "vars": {"m": 12, "n": 11, "n1": 11}}},
        {"title": "n-- and --n1", "body": "Used as whole statements, prefix and postfix forms do the same thing: n = 10, n1 = 10.", "scene": {"line": 8, "vars": {"m": 12, "n": 10, "n1": 10}}},
        {"title": "n -= n1", "body": "n = 10 − 10 = **0**, which is printed.", "scene": {"line": 10, "vars": {"m": 12, "n": 0, "n1": 10}, "output": "0"}},
    ],
    "answer": {"value": "0", "number": 0, "matchesKey": True},
    "shortcut": "n and n1 both start at 11 (++m gives the new 11, m++ gives the old 11) and both lose 1, so their difference is 0.",
    "pitfalls": [
        "Taking n1 = 12 (as if m++ yielded the new value): that gives −1.",
        "Thinking `n--` versus `--n1` makes a difference here: only the value of the expression differs, and here that value is not used.",
    ],
    "verification": "Compiled and run with cc: prints 0.",
    "animation": code(SRC_2017_54, line=3, vars={"m": 10}),
}

SRC_2021 = """#include <stdio.h>
int main()
{
    int i, j, count;
    count = 0;
    i = 0;
    for (j = -3; j <= 3; j++)
    {
        if ((j >= 0) && (i++))
            count = count + j;
    }
    count = count + i;
    printf("%d", count);
    return 0;
}"""
SOLUTIONS["cse-2021-1-cs-37"] = {
    "approach": "Concept tested: **short-circuit evaluation with a side effect**. `&&` evaluates its right operand only when the left one is true, so `i++` runs only for j ≥ 0; and `i++` yields the **old** value of i, so the very first time it is 0 (false).",
    "concepts": ["Short-circuit &&", "Post-increment", "Side effects", "Loop tracing"],
    "steps": [
        {"title": "j = −3, −2, −1", "body": "`j >= 0` is false, so `&&` stops: `i++` is **not evaluated**. i stays 0, count stays 0.", "scene": {"reveal": 3}},
        {"title": "j = 0", "body": "`j >= 0` is true, so `i++` runs: it yields the old value 0 (false) and i becomes 1. The condition is false; count is unchanged.", "scene": {"reveal": 4}},
        {"title": "j = 1, 2, 3", "body": "Now `i++` yields 1, 2, 3 (all true) and i becomes 2, 3, 4. Each time count += j: count = 1 + 2 + 3 = 6.", "scene": {"reveal": 7}},
        {"title": "After the loop", "body": "count = count + i = 6 + 4 = **10**. The program compiles and prints 10.", "scene": {"reveal": 8}},
    ],
    "answer": {"value": "(B) compiles and prints 10", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "The program is ordinary ANSI C; nothing in it is a compile error."),
        opt("B", True, "i++ runs only for j = 0…3 (i ends at 4); it is true for j = 1, 2, 3, adding 6; 6 + 4 = 10."),
        opt("C", False, "8 would need i = 2 or count = 4 at the end; the trace gives count = 6 (j = 1, 2, 3) and i = 4."),
        opt("D", False, "13 would come from evaluating i++ for all seven values of j (i = 7) and adding 6, ignoring the short circuit."),
    ],
    "shortcut": "The right operand runs once per j ≥ 0: four times, so i = 4. It is true for all but its first run, so count gets j = 1, 2, 3 = 6. Total 6 + 4.",
    "pitfalls": [
        "Forgetting the short circuit and incrementing i for negative j as well (gives 13).",
        "Using the new value of i in the test: `i++` tests the value before the increment, so j = 0 adds nothing.",
    ],
    "verification": "Compiled and run with cc: prints 10.",
    "animation": table("The loop, iteration by iteration", ["j >= 0", "i++ runs?", "old i", "i after", "count"],
                       [["no", "no", "-", "0", "0"], ["no", "no", "-", "0", "0"], ["no", "no", "-", "0", "0"], ["yes", "yes", "0", "1", "0"],
                        ["yes", "yes", "1", "2", "1"], ["yes", "yes", "2", "3", "3"], ["yes", "yes", "3", "4", "6"], ["", "", "", "", "6 + 4 = 10"]],
                       ["j = -3", "j = -2", "j = -1", "j = 0", "j = 1", "j = 2", "j = 3", "end"], reveal=0),
}

SRC_2022 = """char a = 'P';
char b = 'x';
char c = (a & b) + '*';
char d = (a | b) - '-';
char e = (a ^ b) + '+';
printf("%c %c %c\\n", c, d, e);"""
SOLUTIONS["cse-2022-cs-34"] = {
    "approach": "Concept tested: **characters are small integers**. Do the bitwise operations on the ASCII codes in binary, add or subtract the codes of `*`, `-`, `+`, and print each result with `%c` as a character.",
    "concepts": ["char arithmetic", "ASCII", "Bitwise AND OR XOR", "printf %c"],
    "given": "'P' = 80 = 0101 0000, 'x' = 120 = 0111 1000, '*' = 42, '-' = 45, '+' = 43.",
    "steps": [
        {"title": "a & b", "body": "0101 0000 & 0111 1000 = 0101 0000 = 80. Then 80 + 42 = 122 = **'z'**.", "scene": {"line": 3, "vars": {"a": "80 'P'", "b": "120 'x'", "c": "122 'z'"}}},
        {"title": "a | b", "body": "0101 0000 | 0111 1000 = 0111 1000 = 120. Then 120 − 45 = 75 = **'K'**.", "scene": {"line": 4, "vars": {"a": "80 'P'", "b": "120 'x'", "c": "122 'z'", "d": "75 'K'"}}},
        {"title": "a ^ b", "body": "0101 0000 ^ 0111 1000 = 0010 1000 = 40. Then 40 + 43 = 83 = **'S'**.", "scene": {"line": 5, "vars": {"a": "80 'P'", "b": "120 'x'", "c": "122 'z'", "d": "75 'K'", "e": "83 'S'"}}},
        {"title": "Print as characters", "body": "`%c` prints the character with each code: **z K S**.", "scene": {"line": 6, "output": "z K S"}},
    ],
    "answer": {"value": "(A) z K S", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "122, 75 and 83 printed with %c are z, K and S."),
        opt("B", False, "These are the right codes, but %c prints characters, not numbers."),
        opt("C", False, "These are just the three constants added; the bitwise results were ignored."),
        opt("D", False, "Not related to the computation (it echoes the inputs and one constant)."),
    ],
    "shortcut": "80 and 120 differ only in bits 5 and 3 (32 + 8 = 40): AND keeps the common part 80, OR gives 120, XOR gives 40. Add the constants and read the ASCII table.",
    "pitfalls": [
        "Printing codes instead of characters (option B).",
        "Worrying about overflow: every result (122, 75, 83) fits in a char.",
    ],
    "verification": "Compiled and run with cc: prints `z K S`.",
    "animation": code(SRC_2022, line=1, vars={"a": "80 'P'", "b": "120 'x'"}),
}

SRC_2024 = """#include <stdio.h>

int g(int p) { printf("%d", p); return p; }
int h(int q) { printf("%d", q); return q; }

void f(int x, int y) {
  g(x);
  h(y);
}

int main() {
  f(g(10),h(20));
}"""
SOLUTIONS["cse-2024-2-cs-3"] = {
    "approach": "Concept tested: **arguments are evaluated before the call, in an order C leaves unspecified**. The question fixes the order (right to left), so `h(20)` runs before `g(10)`; then f's body calls g and h in program order.",
    "concepts": ["Function call", "Order of evaluation", "Side effects"],
    "steps": [
        {"title": "Evaluate f's arguments, right to left", "body": "First `h(20)`: prints **20**, returns 20. Then `g(10)`: prints **10**, returns 10. Output so far: `2010`.", "scene": {"line": 12, "output": "2010"}},
        {"title": "Run f(10, 20)", "body": "x = 10, y = 20. `g(x)` prints **10**, then `h(y)` prints **20**. Statements always run in order.", "scene": {"line": 8, "output": "20101020"}},
        {"title": "Total output", "body": "Putting the two halves together: the arguments printed `20` then `10`, the body printed `10` then `20`, so the whole output is **20101020**. Notice that the second half never depends on the argument order: it is always g first, then h."},
    ],
    "answer": {"value": "(A) 20101020", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Arguments right to left (20, 10), then the body in order (10, 20)."),
        opt("B", False, "Arguments left to right and then the body backwards: the body's statements cannot run backwards."),
        opt("C", False, "Right to left for the arguments, but then the body is also run backwards (h before g)."),
        opt("D", False, "This is the output with left-to-right argument evaluation, which the question rules out."),
    ],
    "shortcut": "Only the argument order is in question; the second half of the output is always g then h, i.e. ...1020. Right-to-left makes the first half 2010.",
    "pitfalls": [
        "Applying \"right to left\" to the statements inside f: it applies only to evaluating the arguments of one call.",
        "Believing C always evaluates arguments left to right: the order is unspecified; the question had to state it.",
    ],
    "verification": "Simulated with both orders: right to left gives 20101020, left to right 10201020; the compiled program prints one of these two (cc on this machine evaluates left to right).",
    "animation": code(SRC_2024, line=12),
}

