"""The C programs the PDS Live Labs run (a library, not a check).

Each entry: id, chapter (the lab that offers it as a preset; 0 = test only), title, source, input.
lab_vectors.py compiles every program with the system C compiler, records its real output, and
writes lab_vectors_c.json (the vectors tests/gate-notes.test.js runs through cLogic.ts) and
client/src/gate/notes/labs/cPresets.ts (the presets each lab offers, with the compiler's output).
Programs with "expect": "error" must be rejected by the interpreter (undefined behaviour or a
compile error) instead of producing output; the compiler's own result is recorded for reference.
"""

P = []


def prog(id, chapter, title, src, input="", expect="ok"):
    P.append({"id": id, "chapter": chapter, "title": title, "src": src.strip() + "\n", "input": input, "expect": expect})


# ── Chapter 1: values, operators, control flow, functions, storage, scope ──

prog("int-division", 1, "Integer division and remainder", r"""
#include <stdio.h>
int main(void) {
    printf("%d %d\n", 7 / 2, 7 % 2);
    printf("%d %d\n", -7 / 2, -7 % 2);
    printf("%d %d\n", 7 / -2, 7 % -2);
    printf("%f\n", 7 / 2.0);
    return 0;
}""")

prog("promotion", 1, "Integer promotion and the unsigned trap", r"""
#include <stdio.h>
int main(void) {
    unsigned int u = 1;
    int i = -1;
    char c = 'A';
    if (i < u) printf("-1 < 1u\n");
    else printf("-1 > 1u: -1 became %u\n", (unsigned) i);
    printf("%d %d\n", c + 1, (int) sizeof(c + 1));
    printf("%u\n", u - 2);
    return 0;
}""")

prog("short-circuit", 1, "Short-circuit && and || (GATE 2021)", r"""
#include <stdio.h>
int main(void) {
    int i, j, count;
    count = 0;
    i = 0;
    for (j = -3; j <= 3; j++) {
        if ((j >= 0) && (i++))
            count = count + j;
    }
    count = count + i;
    printf("%d\n", count);
    return 0;
}""")

prog("incdec", 1, "Pre- and post-increment (GATE 2017)", r"""
#include <stdio.h>
int main(void) {
    int m = 10;
    int n, n1;
    n = ++m;
    n1 = m++;
    n--;
    --n1;
    n -= n1;
    printf("%d\n", n);
    return 0;
}""")

prog("bitwise-ascii", 1, "Bitwise operators on characters (GATE 2022)", r"""
#include <stdio.h>
int main(void) {
    char a = 'P';
    char b = 'x';
    char c = (a & b) + '*';
    char d = (a | b) - '-';
    char e = (a ^ b) + '+';
    printf("%c %c %c\n", c, d, e);
    return 0;
}""")

prog("shift-count", 1, "Counting bits by shifting (GATE 2014)", r"""
#include <stdio.h>
int func(int num) {
    int count = 0;
    while (num) {
        count++;
        num >>= 1;
    }
    return count;
}
int main(void) {
    printf("%d\n", func(435));
    return 0;
}""")

prog("ternary", 1, "Nested conditional operator (GATE 2008)", r"""
#include <stdio.h>
int main(void) {
    int x = 3, y = 4, z = 2;
    int a = (x > y) ? ((x > z) ? x : z) : ((y > z) ? y : z);
    printf("%d\n", a);
    return 0;
}""")

prog("unsigned-strlen", 1, "strlen returns an unsigned size (GATE 2017)", r"""
#include <stdio.h>
#include <string.h>
void printlength(char *s, char *t) {
    unsigned int c = 0;
    int len = ((strlen(s) - strlen(t)) > c) ? strlen(s) : strlen(t);
    printf("%d\n", len);
}
int main(void) {
    char *x = "abc";
    char *y = "defgh";
    printlength(x, y);
    return 0;
}""")

prog("char-wrap", 1, "A char counter wraps around", r"""
#include <stdio.h>
int main(void) {
    unsigned char u = 250;
    int n = 0;
    while (u != 4) { u++; n++; }
    printf("%d\n", n);
    signed char s = 127;
    s = s + 1;
    printf("%d\n", s);
    return 0;
}""")

prog("comma-op", 1, "The comma operator", r"""
#include <stdio.h>
int main(void) {
    int a, b;
    a = (b = 3, b + 4);
    printf("%d %d\n", a, b);
    a = 1, 2;
    printf("%d\n", a);
    return 0;
}""")

prog("switch-fall", 1, "switch fall-through (GATE 2012)", r"""
#include <stdio.h>
int main(void) {
    char inChar = 'A';
    switch (inChar) {
    case 'A': printf("Choice A\n");
    case 'B':
    case 'C': printf("Choice B");
    case 'D':
    case 'E':
    default: printf(" No Choice");
    }
    printf("\n");
    return 0;
}""")

prog("switch-count", 1, "Counting printf calls in a switch (GATE 2015)", r"""
#include <stdio.h>
int main(void) {
    int i, j, k = 0, calls = 0;
    j = 2 * 3 / 4 + 2.0 / 5 + 8 / 5;
    k -= --j;
    for (i = 0; i < 5; i++) {
        switch (i + k) {
        case 1:
        case 2: printf("%d ", i + k); calls++;
        case 3: printf("%d ", i + k); calls++;
        default: printf("%d ", i + k); calls++;
        }
    }
    printf("\ncalls = %d\n", calls);
    return 0;
}""")

prog("dangling-else", 1, "The dangling else", r"""
#include <stdio.h>
int main(void) {
    int x = -10, y = 20;
    if (x > y)
        if (x < 0) x = -x;
        else x = 2 * x;
    printf("%d\n", x);
    return 0;
}""")

prog("halving-loop", 1, "A halving loop (GATE 2006)", r"""
#include <stdio.h>
int main(void) {
    int i, j, n = 37;
    for (i = n, j = 0; i > 0; i /= 2, j += i)
        ;
    printf("%d\n", j);
    return 0;
}""")

prog("do-while", 1, "do-while runs its body at least once", r"""
#include <stdio.h>
int main(void) {
    int n = 0, w = 0, d = 0;
    while (n > 0) { w++; n--; }
    n = 0;
    do { d++; n--; } while (n > 0);
    printf("while: %d, do-while: %d\n", w, d);
    return 0;
}""")

prog("float-loop", 1, "A loop on floats (GATE 2019)", r"""
#include <stdio.h>
int main(void) {
    float sum = 0.0, j = 1.0, i = 2.0;
    int times = 0;
    while (i / j > 0.0625) {
        j = j + j;
        sum = sum + i / j;
        printf("%f\n", sum);
        times++;
    }
    printf("printed %d times\n", times);
    return 0;
}""")

prog("nested-loop-sum", 1, "Closed form of a nested loop (GATE 2013)", r"""
#include <stdio.h>
int unknown(int n) {
    int i, j, k = 0;
    for (i = n / 2; i <= n; i++)
        for (j = 2; j <= n; j = j * 2)
            k = k + n / 2;
    return k;
}
int main(void) {
    printf("%d %d %d\n", unknown(8), unknown(16), unknown(10));
    return 0;
}""")

prog("gcd-subtract", 1, "GCD by repeated subtraction (GATE 2025)", r"""
#include <stdio.h>
int main(void) {
    int x = 126, y = 105;
    do {
        if (x > y) x = x - y;
        else y = y - x;
    } while (x != y);
    printf("%d\n", x);
    return 0;
}""")

prog("fast-power", 1, "Square-and-multiply (GATE 2016)", r"""
#include <stdio.h>
int power(int X, int Y) {
    int res = 1, a = X, b = Y;
    while (b != 0) {
        if (b % 2 == 0) { a = a * a; b = b / 2; }
        else { res = res * a; b = b - 1; }
    }
    return res;
}
int main(void) {
    printf("%d %d\n", power(3, 5), power(2, 10));
    return 0;
}""")

prog("horner", 1, "Horner's rule (GATE 2021)", r"""
#include <stdio.h>
int SimpleFunction(int Y[], int n, int x) {
    int total = Y[0], loopIndex;
    for (loopIndex = 1; loopIndex <= n - 1; loopIndex++)
        total = x * total + Y[loopIndex];
    return total;
}
int main(void) {
    int Z[10] = {1, 1, 1, 1, 1, 1, 1, 1, 1, 1};
    printf("%d\n", SimpleFunction(Z, 10, 2));
    return 0;
}""")

prog("reverse-digits", 1, "Reversing digits", r"""
#include <stdio.h>
int main(void) {
    int n = 4729, rev = 0;
    while (n > 0) {
        rev = rev * 10 + n % 10;
        n = n / 10;
        printf("rev = %d, n = %d\n", rev, n);
    }
    return 0;
}""")

prog("alt-digits", 1, "Keeping alternate digits (GATE 2025)", r"""
#include <stdio.h>
int gate(int n) {
    int d, t, newnum, turn;
    newnum = turn = 0;
    t = 1;
    while (n >= t) t *= 10;
    t /= 10;
    while (t > 0) {
        d = n / t;
        n = n % t;
        t /= 10;
        if (turn) newnum = 10 * newnum + d;
        turn = (turn + 1) % 2;
    }
    return newnum;
}
int main(void) {
    printf("%d\n", gate(14362));
    return 0;
}""")

prog("static-counter", 1, "A static local keeps its value (GATE 2000)", r"""
#include <stdio.h>
int incr(int i) {
    static int count = 0;
    count = count + i;
    return count;
}
int main(void) {
    int i, j;
    for (i = 0; i <= 4; i++)
        j = incr(i);
    printf("%d\n", j);
    return 0;
}""")

prog("static-vs-auto", 1, "static and automatic locals (GATE 2012)", r"""
#include <stdio.h>
int a, b, c = 0;
void prtFun(void);
int main(void) {
    static int a = 1;
    prtFun();
    a += 1;
    prtFun();
    printf("%d %d\n", a, b);
    return 0;
}
void prtFun(void) {
    static int a = 2;
    int b = 1;
    a += ++b;
    printf("%d %d\n", a, b);
}""")

prog("globals-statics", 1, "Global, static and local x (GATE 2015)", r"""
#include <stdio.h>
int f1(void);
int f2(void);
int f3(void);
int x = 10;
int main(void) {
    int x = 1;
    x += f1() + f2() + f3() + f2();
    printf("%d\n", x);
    return 0;
}
int f1(void) { int x = 25; x++; return x; }
int f2(void) { static int x = 50; x++; return x; }
int f3(void) { x *= 10; return x; }""")

prog("static-for", 1, "A static counter drives a for loop (GATE 2019)", r"""
#include <stdio.h>
int r(void) {
    static int num = 7;
    return num--;
}
int main(void) {
    for (r(); r(); r())
        printf("%d ", r());
    printf("\n");
    return 0;
}""")

prog("funcp-static", 1, "Two calls, one static (GATE 2023)", r"""
#include <stdio.h>
int funcp(void) {
    static int x = 1;
    x++;
    return x;
}
int main(void) {
    int x, y;
    x = funcp();
    y = funcp() + x;
    printf("%d\n", x + y);
    return 0;
}""")

prog("block-shadow", 1, "A block-scope variable shadows a parameter (GATE 2026)", r"""
#include <stdio.h>
void func(int i, int j) {
    if (i < j) {
        int i = 0;
        while (i < 10) { j += 2; i++; }
    }
    printf("%d\n", i);
}
int main(void) {
    int i = 9, j = 10;
    func(i, j);
    return 0;
}""")

prog("shadow-loop", 1, "A loop-body declaration hides the outer i (GATE IT 2008)", r"""
#include <stdio.h>
int main(void) {
    int i, j;
    int a[8] = {1, 2, 3, 4, 5, 6, 7, 8};
    for (i = 0; i < 3; i++) {
        a[i] = a[i] + 1;
        i++;
    }
    i--;
    for (j = 7; j > 4; j--) {
        int i = j / 2;
        a[i] = a[i] - 1;
    }
    printf("%d,%d\n", i, a[i]);
    return 0;
}""")

prog("call-by-value", 1, "Call by value: the swap that does not swap", r"""
#include <stdio.h>
void swap(int a, int b) { int t = a; a = b; b = t; }
void swapp(int *a, int *b) { int t = *a; *a = *b; *b = t; }
int main(void) {
    int x = 1, y = 2;
    swap(x, y);
    printf("%d %d\n", x, y);
    swapp(&x, &y);
    printf("%d %d\n", x, y);
    return 0;
}""")

prog("jumble", 1, "Return values carry the result back (GATE 2019)", r"""
#include <stdio.h>
int jumble(int x, int y) {
    x = 2 * x + y;
    return x;
}
int main(void) {
    int x = 2, y = 5;
    y = jumble(y, x);
    x = jumble(y, x);
    printf("%d\n", x);
    return 0;
}""")

prog("macro-swap", 1, "A macro versus functions (GATE IT 2008)", r"""
#include <stdio.h>
#define swap1(a, b) tmp = a; a = b; b = tmp
void swap2(int a, int b) { int tmp; tmp = a; a = b; b = tmp; }
void swap3(int *a, int *b) { int tmp; tmp = *a; *a = *b; *b = tmp; }
int main(void) {
    int num1 = 5, num2 = 4, tmp;
    if (num1 > num2) { swap1(num1, num2); }
    if (num1 < num2) { swap2(num1 + 1, num2); }
    if (num1 >= num2) { swap3(&num1, &num2); }
    printf("%d %d\n", num1, num2);
    return 0;
}""")

prog("macro-paren", 1, "Why macro bodies need parentheses", r"""
#include <stdio.h>
#define SQ(x) x * x
#define SQP(x) ((x) * (x))
int main(void) {
    printf("%d %d\n", SQ(2 + 3), SQP(2 + 3));
    return 0;
}""")

prog("ub-double-modify", 0, "Modifying i twice in one expression", r"""
#include <stdio.h>
int main(void) {
    int i = 5;
    i = i++ + ++i;
    printf("%d\n", i);
    return 0;
}""", expect="error")

prog("ub-div-zero", 0, "Integer division by zero", r"""
#include <stdio.h>
int main(void) {
    int z = 0;
    printf("%d\n", 10 / z);
    return 0;
}""", expect="error")

prog("printf-return", 1, "printf returns the number of characters printed", r"""
#include <stdio.h>
int main(void) {
    int n = printf("GATE%d\n", 2027);
    printf("%d\n", n);
    printf("%d\n", printf("ab"));
    return 0;
}""")

prog("octal-hex", 1, "Octal, hex and character constants", r"""
#include <stdio.h>
int main(void) {
    int a = 011, b = 0x1F, c = 'a';
    printf("%d %d %d %o %x %c\n", a, b, c, 64, 255, 66);
    return 0;
}""")

prog("int-overflow-unsigned", 1, "Computing nC3 without overflow (GATE 2014)", r"""
#include <stdio.h>
int main(void) {
    unsigned int n = 2000, p1, p2;
    p1 = n * (n - 1) * (n - 2) / 6;
    p2 = n * (n - 1) / 2 * (n - 2) / 3;
    printf("%u %u\n", p1, p2);
    return 0;
}""")
