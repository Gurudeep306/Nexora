"""Teacher-style v2 solutions for the PYQs of PDS Chapter 1, Lesson 3 (loop algorithms, invariants and
correctness). Every key is re-derived in l1_03_loop_algorithms.py by compiling and running the program
with cc (the Pascal and pseudo-code ones by simulation in Python or an equivalent C translation).
`python3 _sol.py 1` writes them into src/gate/solutions."""
import common as C

opt = C.opt
SOLUTIONS = {}
B = C.bank()


def code(src, lang="c", line=None, vars=None, output=None, title=None, caption=None):
    f = {"kind": "code", "lang": lang, "code": src}
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


def upto(rows, cols):
    """reveal value that shows the first `rows` body rows of a table with `cols` columns."""
    return {"reveal": rows * cols}


# ── cse-1991-a-1-vi ─────────────────────────────────────────────────────────
SOLUTIONS["cse-1991-a-1-vi"] = {
    "approach": "Concept tested: **finding a loop invariant**. The `if` lets the loop start only with an even `i`, and each branch of the body is chosen so that `i` comes out even again; so \"`i` is even\" is true at every test of the guard.",
    "concepts": ["Loop invariant", "Initialisation and maintenance", "Pascal div and mod"],
    "given": "Pascal: `if i mod 2 = 0 then while i >= 0 do begin i := i div 2; if i mod 2 <> 0 then i := i - 1 else i := i - 2 end`.",
    "steps": [
        {"title": "Initialisation", "body": "The loop is reached only through `if i mod 2 = 0`, so at the first test of `i >= 0` the value of `i` is **even**.", "scene": upto(1, 4)},
        {"title": "Maintenance", "body": "Inside the body `i >= 0`, so `div` and `mod` act on a non-negative number. Let $h = i \\text{ div } 2$. If $h$ is odd the body makes $i = h - 1$ (even); if $h$ is even it makes $i = h - 2$ (even). Either way `i` is even at the next test.", "scene": upto(3, 4)},
        {"title": "Termination and the final value", "body": "Each pass lowers `i` by at least 1 ($h \\le i$, then 1 or 2 is subtracted), so the loop ends; the smallest possible new value is $0 - 2 = -2$. With \"$i$ even and $i \\ge -2$\" as the invariant, the exit condition $i < 0$ forces $i = -2$. Example: $10 \\to 4 \\to 0 \\to -2$.", "scene": upto(4, 4)},
    ],
    "answer": {"value": "i mod 2 = 0 (i is even); strengthened, i is even and i ≥ −2, so the loop ends with i = −2", "matchesKey": True},
    "shortcut": "Look at what the code before the loop guarantees (here: `i` even) and check that each branch of the body restores it.",
    "pitfalls": [
        "Giving `i >= 0`: that is the guard, which is false after the last pass, so it is not an invariant.",
        "Giving `i mod 2 <> 0` or a statement about `i div 2`: those describe the middle of the body, not the moments when the guard is tested.",
    ],
    "verification": "Simulated in Python with Pascal's div and mod (non-negative operands inside the body) for every even i from 0 to 1000: i is even and ≥ −2 at every test, strictly decreases, and ends at −2.",
    "animation": table("i = 10: the value at each test of the guard", ["i", "i div 2", "branch", "new i"],
                       [["10", "5 (odd)", "i − 1", "4"], ["4", "2 (even)", "i − 2", "0"], ["0", "0 (even)", "i − 2", "−2"], ["−2", "", "exit", "even"]],
                       ["test 1", "test 2", "test 3", "test 4"], reveal=0),
}

# ── cse-1991-a-3-viii ───────────────────────────────────────────────────────
SRC_1991 = C.code_block(B["cse-1991-a-3-viii"])
SOLUTIONS["cse-1991-a-3-viii"] = {
    "approach": "Concept tested: **the exit condition of a counting loop**. `i` climbs while $i^2 \\le M$, so the loop stops at the **first** $i$ whose square exceeds $M$, one step past $\\lfloor \\sqrt M \\rfloor$.",
    "concepts": ["Loop invariant", "Exit condition", "Integer square root", "Off-by-one"],
    "steps": [
        {"title": "The invariant", "body": "At every test, $(i - 1)^2 \\le M$ (for $i \\ge 1$): the previous value of `i` was accepted. It holds after the first pass ($0^2 \\le M$) and each `i := i + 1` happens only after $i^2 \\le M$ was confirmed.", "scene": {"line": 5, "vars": {"i": 0}}},
        {"title": "The exit", "body": "The loop stops when $i^2 > M$. Together with $(i - 1)^2 \\le M$ this gives $i - 1 \\le \\sqrt M < i$, so $i - 1 = \\lfloor \\sqrt M \\rfloor$ and **X(N) = $\\lfloor \\sqrt N \\rfloor + 1$**.", "scene": {"line": 6}},
        {"title": "Test the tempting options", "body": "$N = 10$: the loop accepts 0, 1, 2, 3 and stops at 4; $\\lfloor\\sqrt{10}\\rfloor + 1 = 4$ and $\\lceil \\sqrt{10} \\rceil = 4$. $N = 16$: it accepts 4 (since $16 \\le 16$) and stops at 5; $\\lfloor\\sqrt{16}\\rfloor + 1 = 5$ but $\\lceil \\sqrt{16} \\rceil = 4$. So only B is right for every positive N.", "scene": {"line": 6, "vars": {"M": 16, "i": 5}}},
    ],
    "answer": {"value": "(B) ⌊√N⌋ + 1", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "The loop overshoots by one: X(10) = 4, not ⌊√10⌋ = 3."),
        opt("B", True, "The loop stops at the first i with i² > N, which is ⌊√N⌋ + 1."),
        opt("C", False, "Agrees with B except at perfect squares: X(16) = 5 but ⌈√16⌉ = 4."),
        opt("D", False, "Agrees with B only at perfect squares: X(10) = 4 but ⌈√10⌉ + 1 = 5."),
        opt("E", False, "B is always correct, so 'none of the above' is wrong."),
    ],
    "shortcut": "A loop `while (cond(i)) i++` returns the first i for which cond fails. Here cond is i² ≤ N, so the answer is the first i with i² > N.",
    "pitfalls": [
        "Choosing C because ⌈√N⌉ = ⌊√N⌋ + 1 for every non-square N; perfect squares break it.",
        "Choosing A by thinking the loop stops at the last i with i² ≤ N; the increment happens after that test.",
    ],
    "verification": "The function translated to C and compiled: for every N from 1 to 10 000 it returns ⌊√N⌋ + 1; it differs from ⌈√N⌉ at perfect squares and from ⌈√N⌉ + 1 elsewhere.",
    "animation": code(SRC_1991, lang="pseudo", line=4, vars={"M": 10, "i": 0}, title="X(N)"),
}

# ── cse-1993-ii-a-7-4 ───────────────────────────────────────────────────────
SRC_1993 = C.code_block(B["cse-1993-ii-a-7-4"])
SOLUTIONS["cse-1993-ii-a-7-4"] = {
    "approach": "Concept tested: **swapping without a temporary**. After `a := a + b` the variable `a` holds the sum, and the sum together with either value recovers the other, so the next two statements put the old values in exchanged places.",
    "concepts": ["Swap", "Assignment sequence", "Overflow"],
    "steps": [
        {"title": "a := a + b", "body": "With old values $a_0, b_0$: $a = a_0 + b_0$, $b = b_0$.", "scene": {"line": 3, "vars": {"a": "a0 + b0", "b": "b0"}}},
        {"title": "b := a - b", "body": "$b = (a_0 + b_0) - b_0 = a_0$: `b` now has the old value of `a`.", "scene": {"line": 4, "vars": {"a": "a0 + b0", "b": "a0"}}},
        {"title": "a := a - b", "body": "$a = (a_0 + b_0) - a_0 = b_0$: `a` has the old value of `b`. Example: $(5, 9) \\to (14, 9) \\to (14, 5) \\to (9, 5)$.", "scene": {"line": 5, "vars": {"a": "b0", "b": "a0"}}},
    ],
    "answer": {"value": "(A) exchanges a and b", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "The pair (a₀, b₀) becomes (a₀ + b₀, b₀), then (a₀ + b₀, a₀), then (b₀, a₀)."),
        opt("B", False, "b ends with the old a, not 2a: (5, 9) gives b = 5."),
        opt("C", False, "a ends with the old b, not 2b: (5, 9) gives a = 9."),
        opt("D", False, "Both values change whenever a₀ ≠ b₀."),
        opt("E", False, "A is correct."),
    ],
    "shortcut": "Try one pair of different numbers, such as (5, 9): it ends as (9, 5).",
    "pitfalls": [
        "Thinking the values are lost because there is no temporary: the sum stores both of them.",
        "Ignoring the limits of the trick: a + b can overflow (an error in Pascal, undefined for signed int in C), and if a and b are the same variable the value becomes 0.",
    ],
    "verification": "Checked for every pair a, b in −20 … 20, and compiled in C for (5, 9): prints 14 9, 14 5, 9 5. With unsigned C variables the swap works even when the sum wraps.",
    "animation": code(SRC_1993, lang="pseudo", line=2, vars={"a": "a0", "b": "b0"}),
}

# ── cse-1995-a-28 ───────────────────────────────────────────────────────────
SRC_1995 = C.code_block(B["cse-1995-a-28"])
SOLUTIONS["cse-1995-a-28"] = {
    "approach": "Concept tested: **Euclid's algorithm by subtraction**. Replacing the larger number by the difference never changes the gcd (both pairs have the same common divisors), both numbers stay positive, and the loop stops when they are equal, at the gcd.",
    "concepts": ["GCD", "Loop invariant", "Termination"],
    "given": "X and Y are positive integers.",
    "steps": [
        {"title": "The invariant", "body": "If $d$ divides $X$ and $Y$ it divides $X - Y$; if it divides $X - Y$ and $Y$ it divides $X$. So $\\gcd(X - Y, Y) = \\gcd(X, Y)$, and the gcd of the pair never changes.", "scene": upto(1, 3)},
        {"title": "Termination", "body": "Both numbers stay positive and their sum drops by the smaller one each pass, so the loop must stop.", "scene": upto(4, 3)},
        {"title": "The exit", "body": "It stops when $X = Y$, and $\\gcd(X, X) = X$. So `write(X)` prints the gcd of the original numbers. Example: (12, 18) → (12, 6) → (6, 6): prints 6.", "scene": upto(5, 3)},
    ],
    "answer": {"value": "(C) Computes the GCD of two numbers", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "The result never exceeds the smaller input; for (12, 18) it prints 6, while the LCM is 36."),
        opt("B", False, "Repeated subtraction of the same divisor would be division, but here the roles swap; (12, 18) prints 6, not 1 (the quotient) or 6 as a remainder by coincidence: (7, 3) prints 1, while 7 div 3 = 2."),
        opt("C", True, "gcd(X − Y, Y) = gcd(X, Y) is invariant, and the loop ends with X = Y = gcd."),
        opt("D", False, "C is correct."),
    ],
    "shortcut": "\"While unequal, subtract the smaller from the larger\" is Euclid's subtraction GCD; memorise its shape.",
    "pitfalls": [
        "Confusing it with LCM: the numbers only ever decrease, so the result cannot be a multiple of both.",
        "Forgetting the precondition: with Y = 0 the loop would never end.",
    ],
    "verification": "Simulated (Pascal's while and := behave as in C here) for every X, Y from 1 to 39: always equals math.gcd(X, Y).",
    "animation": table("X = 12, Y = 18", ["X", "Y", "gcd(X, Y)"],
                       [["12", "18", "6"], ["12", "6", "6"], ["6", "6", "6"], ["", "", ""], ["write(X)", "", "6"]],
                       ["start", "pass 1", "pass 2", "", "exit"], reveal=0),
}

# ── cse-2003-cs-1 ───────────────────────────────────────────────────────────
SRC_2003 = C.code_block(B["cse-2003-cs-1"])
SOLUTIONS["cse-2003-cs-1"] = {
    "approach": "Concept tested: **recognising a series by its running term**. The term `p` is multiplied by $x/i$ on pass $i$, so it is $x^i / i!$, and `s` adds these terms to the initial 1: the series of $e^x$.",
    "concepts": ["Series summation", "Loop invariant", "Exponential series"],
    "steps": [
        {"title": "Follow the running term", "body": "$p$ starts at 1 and is multiplied by $x/1$, then $x/2$, then $x/3$, …: after pass $i$, $p = \\frac{x^i}{i!}$.", "scene": {"line": 4, "vars": {"i": 1, "p": "x", "s": "1 + x"}}},
        {"title": "State the invariant", "body": "At the test with index $i$: $s = \\sum_{k=0}^{i-1} \\frac{x^k}{k!}$ and $p = \\frac{x^{i-1}}{(i-1)!}$. It holds at $i = 1$ ($s = p = 1$) and each pass appends the next term.", "scene": {"line": 3, "vars": {"i": "i", "p": "x^(i−1)/(i−1)!", "s": "Σ x^k/k!, k < i"}}},
        {"title": "The exit", "body": "The loop stops at $i = y$, returning $1 + x + \\frac{x^2}{2!} + \\dots + \\frac{x^{y-1}}{(y-1)!}$. As $y$ grows this tends to $e^x$. Numerically `f(1, 20)` returns 2.718282 ≈ e.", "scene": {"line": 7, "output": "f(1, 20) = 2.718282"}},
    ],
    "answer": {"value": "(B) eˣ", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "x^y would need p *= x with no division by i; f(1, 20) would then be 20 (a sum of ones) or 1, not 2.718."),
        opt("B", True, "The sum of x^k/k! for k < y, which converges to eˣ."),
        opt("C", False, "ln(1 + x) = x − x²/2 + x³/3 − … has alternating signs and no factorials."),
        opt("D", False, "x^x is unrelated; f(1, y) would tend to 1."),
    ],
    "shortcut": "The ratio between consecutive terms identifies the series: x/i (with no sign change) means eˣ.",
    "pitfalls": [
        "Reading `p *= x/i` as `p = x^i` and forgetting that the divisions accumulate into i!.",
        "Worrying about integer division: x is float, so x/i is a floating division.",
    ],
    "verification": "Compiled as given: f(1, 20) = 2.718282, f(2, 20) = 7.389057 (e² = 7.389056), f(1, 5) = 2.708333; the invariant is checked with exact fractions for three values of x.",
    "animation": code(SRC_2003, line=3, vars={"x": 1, "i": 1, "p": 1, "s": 1}, title="f(x, y)"),
}

# ── cse-2004-cs-32 ──────────────────────────────────────────────────────────
SOLUTIONS["cse-2004-cs-32"] = {
    "approach": "Concept tested: **the invariant of digit reversal**. Each pass moves the last digit of `n` to the end of `rev`; after $j$ passes, `n` is the first $m - j$ digits and `rev` the last $j$ digits in reverse order.",
    "concepts": ["Loop invariant", "Digit extraction", "Integer division and remainder"],
    "given": "$n = d_1 d_2 \\dots d_m$ (decimal digits), and the loop `rev = rev * 10 + n % 10; n = n / 10;` while $n > 0$.",
    "steps": [
        {"title": "One pass", "body": "`n % 10` is the last digit of the current $n$; `rev * 10 + …` appends it to `rev`; `n / 10` deletes it from `n`.", "scene": upto(1, 3)},
        {"title": "By induction", "body": "After 0 passes $n = d_1 \\dots d_m$, $rev = 0$. If after $j$ passes $n = d_1 \\dots d_{m-j}$ and $rev = d_m \\dots d_{m-j+1}$, the next pass peels $d_{m-j}$: $n = d_1 \\dots d_{m-j-1}$, $rev = d_m \\dots d_{m-j}$. That is option A.", "scene": upto(3, 3)},
        {"title": "Refute the others on n = 4729 after two passes", "body": "The state is $n = 47$, $rev = 92$. B claims $n = 29$ or $rev = 74$: false. D claims $n = 4729$ or $rev = 9274$: false (D holds only before the loop or at its end). C ($n \\ne rev$) happens to hold, but for $n = 11$ one pass gives $n = rev = 1$.", "scene": upto(5, 3)},
    ],
    "answer": {"value": "(A) n = d₁d₂…d_{m−j} and rev = d_m d_{m−1}…d_{m−j+1}", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Each pass moves one digit from the end of n to the end of rev, which is exactly this statement for every j."),
        opt("B", False, "Both parts describe the wrong digits: after two passes on 4729, n = 47 (not 29) and rev = 92 (not 74)."),
        opt("C", False, "Not an invariant: for n = 11 the first pass gives n = 1 and rev = 1."),
        opt("D", False, "The first part holds only before the loop and the second only after it; in between both are false."),
    ],
    "shortcut": "An invariant must describe the middle of the loop. Only A changes with j; options that mention only the start or the end state cannot be right.",
    "pitfalls": [
        "Accepting an \"or\" of the start state and the end state: an invariant must hold after every pass, including the middle ones.",
        "Accepting C from one example: always test candidates on a second input.",
    ],
    "verification": "The loop is compiled and traced on 4729 (states 472/9, 47/92, 4/927, 0/9274); option A is checked at every pass for every n below 20 000, and the four options are evaluated at j = 2 on 4729 and on n = 11.",
    "animation": table("n = 4729, after each pass", ["n", "rev", "A holds?"],
                       [["472", "9", "yes"], ["47", "92", "yes"], ["4", "927", "yes"], ["0", "9274", "yes"], ["(n = 11) 1", "1", "C fails"]],
                       ["j = 1", "j = 2", "j = 3", "j = 4", "other n"], reveal=0),
}

# ── cse-2004-cs-41 ──────────────────────────────────────────────────────────
SRC_2004_41 = C.code_block(B["cse-2004-cs-41"])
SOLUTIONS["cse-2004-cs-41"] = {
    "approach": "Concept tested: **Euclid's subtraction GCD as a loop with an invariant**. $\\gcd(m, n)$ never changes when the larger number is replaced by the difference; the loop ends with $m = n$, which then is the gcd.",
    "concepts": ["GCD", "Loop invariant", "Variant"],
    "steps": [
        {"title": "Invariant", "body": "$m > 0$, $n > 0$ and $\\gcd(m, n) = \\gcd(x, y)$. It holds initially ($m = x$, $n = y$, both positive). A pass replaces the larger by the difference, which is positive and has the same common divisors with the smaller one.", "scene": {"line": 6, "vars": {"m": 126, "n": 105}}},
        {"title": "Variant", "body": "$m + n$ falls by $\\min(m, n) \\ge 1$ each pass and stays $\\ge 2$, so the loop terminates.", "scene": {"line": 8, "vars": {"m": 21, "n": 105}}},
        {"title": "Exit", "body": "The loop stops when $m = n$; since $\\gcd(n, n) = n$, the program prints $\\gcd(x, y)$. For (126, 105) the states are (21, 105), (21, 84), (21, 63), (21, 42), (21, 21): prints 21.", "scene": {"line": 12, "vars": {"m": 21, "n": 21}, "output": "21"}},
    ],
    "answer": {"value": "(C) the greatest common divisor of x and y", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Nothing is ever added; the numbers only decrease. For (12, 18) it prints 6, not 30."),
        opt("B", False, "x mod y would keep subtracting y from x only; here the roles swap. (12, 18) prints 6, while 12 mod 18 = 12."),
        opt("C", True, "gcd(m, n) is invariant and the loop stops at m = n = gcd(x, y)."),
        opt("D", False, "The result divides both inputs, so it cannot be their LCM (36 for (12, 18)) unless x = y."),
    ],
    "shortcut": "Same loop as GATE 1995 and 2025: \"subtract the smaller from the larger until equal\" is the gcd.",
    "pitfalls": [
        "Thinking the loop computes a remainder because it subtracts repeatedly: a remainder loop subtracts the same y every time.",
        "Ignoring the precondition x > 0, y > 0: with a zero input the loop never ends.",
    ],
    "verification": "Compiled (with `int main`) and run on the inputs (126, 105), (12, 18), (7, 13), (100, 75), (9, 9): prints 21, 6, 1, 25, 9, the gcd each time; the loop is also compared with math.gcd for all pairs up to 60.",
    "animation": code(SRC_2004_41, line=5, vars={"x": 126, "y": 105}),
}

# ── cse-2004-cs-42 ──────────────────────────────────────────────────────────
SRC_2004_42 = C.code_block(B["cse-2004-cs-42"])
SOLUTIONS["cse-2004-cs-42"] = {
    "approach": "Concept tested: **Heron's (Newton's) square-root iteration and its invariant**. The loop keeps $x \\cdot y = m$ with $y \\le \\sqrt m \\le x$, and averaging brings $x$ and $y$ together, so both approach $\\sqrt m$.",
    "concepts": ["Newton's method", "Loop invariant", "Convergence"],
    "given": "$m > 1$, $\\epsilon > 0$ (written `e`), real arithmetic.",
    "steps": [
        {"title": "The invariant x·y = m", "body": "Initially $x \\cdot y = m \\cdot 1 = m$. After `x = (x + y)/2; y = m/x;` the new product is $x \\cdot \\frac{m}{x} = m$ again.", "scene": upto(1, 3)},
        {"title": "x stays above √m, y below", "body": "The average of two positive numbers is at least their geometric mean: $\\frac{x + y}{2} \\ge \\sqrt{xy} = \\sqrt m$. Then $y = m/x \\le \\sqrt m$. The gap $x - y$ at least halves every pass, so the loop terminates.", "scene": upto(3, 3)},
        {"title": "Where it converges", "body": "At exit $x - y \\le \\epsilon$ with $y \\le \\sqrt m \\le x$, so $x$ is within $\\epsilon$ of $\\sqrt m$. For $m = 9$: $x = 5, 3.4, 3.0235, 3.00009, 3.0000000014$: it approaches 3.", "scene": upto(5, 3)},
    ],
    "answer": {"value": "(C) m^{1/2}", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "For m = 9 the loop gives 3, while log 9 ≈ 2.20 (natural) or 0.95 (base 10)."),
        opt("B", False, "x starts at m and only decreases, so it cannot approach m² > m."),
        opt("C", True, "x·y = m is invariant and x − y → 0, so x² → m."),
        opt("D", False, "A cube root would need an invariant like x·y² = m; here it is x·y = m. For m = 9 the loop gives 3, not 2.08."),
    ],
    "shortcut": "Find the invariant: x·y = m. When the loop stops x ≈ y, so x² ≈ m.",
    "pitfalls": [
        "Tracing with integer division: the algorithm is in real arithmetic (with integers y = m/x would truncate).",
        "Choosing log m because the gap halves each pass: the halving describes the speed, not the limit.",
    ],
    "verification": "Simulated in double precision (compiled C): m = 2 gives 1.4142136 after 4 passes, m = 9 gives 3.0000000014 after 5 passes with e = 10⁻⁶; the invariant, the halving of x − y and the quadratic error formula are checked for seven values of m.",
    "animation": table("m = 9", ["x", "y = m/x", "x·y"],
                       [["5", "1.8", "9"], ["3.4", "2.6471", "9"], ["3.0235", "2.9767", "9"], ["3.00009", "2.99991", "9"], ["3.0000000014", "2.9999999986", "9"]],
                       ["pass 1", "pass 2", "pass 3", "pass 4", "pass 5"], reveal=0),
}

# ── cse-2015-1-cs-33 ────────────────────────────────────────────────────────
SRC_2015 = C.code_block(B["cse-2015-1-cs-33"])
SOLUTIONS["cse-2015-1-cs-33"] = {
    "approach": "Concept tested: **postcondition = invariant + failed guard**. The loop keeps $x = qy + r$ (each pass moves one $y$ from $r$ into $qy$) and stops when $r \\ge y$ fails, i.e. $r < y$.",
    "concepts": ["Postcondition", "Loop invariant", "Division by repeated subtraction"],
    "given": "x and y are positive integers.",
    "steps": [
        {"title": "The invariant", "body": "Initially $q = 0$, $r = x$: $x = 0 \\cdot y + x$ ✓. A pass does $r \\leftarrow r - y$, $q \\leftarrow q + 1$, and $(q + 1)y + (r - y) = qy + r$, so $x = qy + r$ holds at every test.", "scene": {"line": 4, "vars": {"x": 17, "y": 5, "q": 0, "r": 17}}},
        {"title": "The exit", "body": "The loop ends when the guard `r >= y` is false: $r < y$. The postcondition is the invariant joined with this: $\\{x = qy + r \\wedge r < y\\}$.", "scene": {"line": 8, "vars": {"x": 17, "y": 5, "q": 3, "r": 2}}},
        {"title": "Check on x = 17, y = 5", "body": "$(q, r)$: $(0, 17), (1, 12), (2, 7), (3, 2)$. B: $17 = 3 \\cdot 5 + 2$ and $2 < 5$ ✓. A: $2 = 3 \\cdot 17 + 5$ ✗. C: $5 = 3 \\cdot 17 + 2$ ✗. D: $4 < -3$ ✗.", "scene": {"line": 9}},
    ],
    "answer": {"value": "(B) {x = qy + r ∧ r < y}", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Swaps the roles of x and r: for x = 17, y = 5 it claims 2 = 3·17 + 5."),
        opt("B", True, "Invariant x = qy + r and the negated guard r < y: the quotient–remainder relation."),
        opt("C", False, "Swaps x and y, and 0 < r fails whenever y divides x (r = 0)."),
        opt("D", False, "Not related to the loop: for x = 17, y = 5 it claims 4 < −3."),
    ],
    "shortcut": "Postcondition of a loop = (what every pass preserves) ∧ (not the guard). Only B has the shape \"x = qy + r and r < y\".",
    "pitfalls": [
        "Picking C because it adds 0 < r: the remainder can be 0 (x = 10, y = 5 ends with r = 0).",
        "Mixing up which variable is divided: q counts copies of y taken out of x.",
    ],
    "verification": "Simulated for every x, y from 1 to 59: B holds at the end every time, and each of A, C, D fails for some pair; the trace for (17, 5) is compiled in C.",
    "animation": code(SRC_2015, lang="pseudo", line=2, vars={"x": 17, "y": 5}),
}

# ── cse-2016-2-cs-35 ────────────────────────────────────────────────────────
SRC_2016 = C.code_block(B["cse-2016-2-cs-35"])
SOLUTIONS["cse-2016-2-cs-35"] = {
    "approach": "Concept tested: **the invariant of square-and-multiply**. Both branches rewrite $a^b$ as an equal product, so $res \\cdot a^b$ never changes; it starts as $X^Y$ and, when $b = 0$, equals $res$.",
    "concepts": ["Loop invariant", "Fast exponentiation", "Binary exponent"],
    "steps": [
        {"title": "Initialisation", "body": "$res = 1$, $a = X$, $b = Y$: $res \\cdot a^b = X^Y$. (Options B and D also reduce to $X^Y = X^Y$ here, so the first state cannot decide.)", "scene": {"line": 4, "vars": {"res": 1, "a": "X", "b": "Y"}}},
        {"title": "Even b", "body": "`a = a*a; b = b/2;` gives $res \\cdot (a^2)^{b/2} = res \\cdot a^b$: unchanged.", "scene": {"line": 5}},
        {"title": "Odd b", "body": "`res = res*a; b = b-1;` gives $(res \\cdot a) \\cdot a^{b-1} = res \\cdot a^b$: unchanged.", "scene": {"line": 6}},
        {"title": "Refute A, B, D with X = 2, Y = 3", "body": "The states at the tests are $(res, a, b) = (1, 2, 3), (2, 2, 2), (2, 4, 1)$. In the second state: A gives $a^b = 4 \\ne 8$; B gives $(res \\cdot a)^Y = 64$ but $(res \\cdot X)^b = 16$; D gives $(res \\cdot a)^b = 16 \\ne 8$. C gives $2 \\cdot 2^2 = 8$ ✓ (and $2 \\cdot 4^1 = 8$ in the third).", "scene": {"line": 3, "vars": {"res": 2, "a": 2, "b": 2}}},
    ],
    "answer": {"value": "(C) X^Y = res · a^b", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Ignores what has already been moved into res: after the first odd step (X = 2, Y = 3) a^b = 4 but X^Y = 8."),
        opt("B", False, "True at the first test (1·X)^Y = X^Y, but in the state (2, 2, 2) it says 64 = 16."),
        opt("C", True, "Both branches keep res · a^b fixed, and at b = 0 it gives res = X^Y."),
        opt("D", False, "True at the first test, but in the state (2, 2, 2) (res·a)^b = 16 ≠ 8."),
    ],
    "shortcut": "Ask what the function returns at b = 0: res. The invariant must become res = X^Y when b = 0, which only C (with a^0 = 1) does.",
    "pitfalls": [
        "Checking candidates only in the first state, where B, C and D all hold.",
        "Reading the loop as plain repeated multiplication: the even branch squares a and halves b, so it takes about log₂ Y + popcount(Y) passes.",
    ],
    "verification": "Each option evaluated with exact integers at every test of the loop for X = 2 … 5 and Y = 1 … 19: only C always holds; the compiled function returns X^Y for X ≤ 4, Y ≤ 14 with ⌊log₂ Y⌋ + popcount(Y) passes.",
    "animation": code(SRC_2016, line=2, vars={"X": 2, "Y": 3}, title="exp(2, 3)"),
}

# ── cse-2017-2-cs-37 ────────────────────────────────────────────────────────
SRC_2017 = C.code_block(B["cse-2017-2-cs-37"])
SOLUTIONS["cse-2017-2-cs-37"] = {
    "approach": "Concept tested: **the precondition a loop invariant needs**. The loop preserves $x = yq + r$, so it ends in that state only if the relation already holds at the start ($q = 0$, $r = x$), and it ends at all only if $y > 0$.",
    "concepts": ["Precondition", "Loop invariant", "Termination", "unsigned int"],
    "given": "x, y, q, r are `unsigned int`; the fragment is `while (r >= y) { r = r - y; q = q + 1; }`.",
    "steps": [
        {"title": "The loop preserves x == y*q + r", "body": "A pass replaces $(q, r)$ by $(q + 1, r - y)$, and $y(q + 1) + (r - y) = yq + r$. So the final state satisfies the relation exactly when the initial state does.", "scene": {"line": 2}},
        {"title": "Initialisation must make it true", "body": "With $q = 0$ and $r = x$: $y \\cdot 0 + x = x$ ✓ (option C). B leaves $q$ unknown and D leaves $r$ unknown, so the relation may be false from the start: B with $x = r = 7$, $y = 2$, $q = 5$ ends at $q = 8$, $r = 1$, and $17 \\ne 7$.", "scene": {"vars": {"x": 7, "y": 2, "q": 0, "r": 7}}},
        {"title": "Termination needs y > 0", "body": "With $y = 0$ the guard `r >= 0` is always true for an unsigned $r$ and the loop never ends. A does not exclude $y = 0$ (and with $y > 0$ it would still need $x = 0$).", "scene": {"vars": {"x": 7, "y": 2, "q": 3, "r": 1}, "line": 5}},
    ],
    "answer": {"value": "(C) (q == 0) && (r == x) && (y > 0)", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "q = r = 0 makes y·q + r = 0, which equals x only if x = 0; and y = 0 is allowed, which loops for ever."),
        opt("B", False, "q is not initialised, so x = y·q + r can be false at the start (q = 5, x = r = 7, y = 2 ends with 2·8 + 1 = 17 ≠ 7)."),
        opt("C", True, "q = 0, r = x make the invariant true initially; y > 0 makes r a decreasing variant, so the loop ends with x = y·q + r."),
        opt("D", False, "r is not tied to x (r = 4 with x = 7, y = 2 ends with 2·2 + 0 = 4 ≠ 7)."),
    ],
    "shortcut": "An invariant-preserving loop cannot create the invariant: the precondition must establish it (q = 0, r = x) and must make the loop finite (y > 0).",
    "pitfalls": [
        "Choosing B because x > 0 sounds necessary: x = 0 works fine; what matters is q = 0.",
        "Forgetting that with unsigned variables r >= 0 is always true, so y = 0 never stops.",
    ],
    "verification": "Compiled with unsigned variables: C ends with x == y*q + r for all x < 60, 1 ≤ y < 12; counter-examples for B (q = 5) and D (r = 4) end with the relation false; y = 0 runs until the time limit.",
    "animation": code(SRC_2017, line=1, vars={"x": 7, "y": 2, "q": "?", "r": "?"}),
}

# ── cse-2020-cs-48 ──────────────────────────────────────────────────────────
SRC_2020 = C.code_block(B["cse-2020-cs-48"])
SOLUTIONS["cse-2020-cs-48"] = {
    "approach": "Concept tested: **binary exponentiation over the bits of the exponent**. `tob` stores the bits of $b$ lowest first; `pp` keeps $ex = a^{2^i}$ and multiplies it into `tot` when bit $i$ is 1, so it returns $a^b$: $3^4 = 81$.",
    "concepts": ["Binary representation", "Fast exponentiation", "Loop invariant"],
    "steps": [
        {"title": "tob(4, arr)", "body": "$4 \\% 2 = 0$: arr[0] = 0, b = 2; arr[1] = 0, b = 1; arr[2] = 1, b = 0. It returns $i = 3$: the bits of 4 = 100₂, lowest first.", "scene": {"line": 5, "vars": {"b": 0, "i": 3, "arr": "0 0 1"}}},
        {"title": "The loop in pp", "body": "Invariant at index $i$: $ex = 3^{2^i}$ and $tot = 3^{(4 \\bmod 2^i)}$. $i = 0$: bit 0, ex = 9. $i = 1$: bit 0, ex = 81. $i = 2$: bit 1, tot = 1·81 = 81, ex = 6561.", "scene": {"line": 18, "vars": {"i": 2, "tot": 81, "ex": 6561, "len": 3}}},
        {"title": "Return", "body": "The loop ends at $i = len = 3$ and returns **81** $= 3^4$. The last square (6561) is computed but never used.", "scene": {"line": 21, "output": "81"}},
    ],
    "answer": {"value": "81", "number": 81, "matchesKey": True},
    "shortcut": "pp(a, b) computes a^b by the binary method, so pp(3, 4) = 3⁴ = 81.",
    "pitfalls": [
        "Multiplying tot for every bit instead of only the 1 bits (gives 3·9·81).",
        "Reading the bits highest first: arr[0] is the lowest bit, matched with ex = a.",
    ],
    "verification": "Compiled as given: pp(3, 4) prints 81 and tob(4) gives len 3 with bits 0 0 1; pp(a, b) = a^b for a ≤ 4, b ≤ 14, and the invariant ex = a^(2^i), tot = a^(b mod 2^i) is checked in Python.",
    "animation": code(SRC_2020, line=12, vars={"a": 3, "b": 4}, title="pp(3, 4)"),
}

# ── cse-2021-1-cs-48 ────────────────────────────────────────────────────────
SRC_2021 = C.code_block(B["cse-2021-1-cs-48"])
SOLUTIONS["cse-2021-1-cs-48"] = {
    "approach": "Concept tested: **Horner's rule**. `total = x * total + Y[k]` evaluates the polynomial $Y[0]x^{n-1} + \\dots + Y[n-1]$; with all coefficients 1 and $x = 2$ it is $2^9 + 2^8 + \\dots + 1 = 2^{10} - 1$.",
    "concepts": ["Horner's rule", "Loop invariant", "Geometric series"],
    "steps": [
        {"title": "The invariant", "body": "Before the test with index $k$, $total = \\sum_{j=0}^{k-1} Y[j]\\, x^{k-1-j}$: multiplying by $x$ raises every earlier term one power, and adding $Y[k]$ appends the new constant term.", "scene": upto(2, 3)},
        {"title": "Trace with Z = all ones, x = 2", "body": "total: 1 (Z[0]), then 3, 7, 15, 31, 63, 127, 255, 511, 1023 for loopIndex = 1 … 9: each pass is $total \\leftarrow 2 \\cdot total + 1$.", "scene": upto(10, 3)},
        {"title": "Closed form", "body": "At exit $total = 2^9 + 2^8 + \\dots + 2^0 = 2^{10} - 1 = $ **1023**, ten 1 bits in binary.", "scene": {"reveal": 30, "hl": [{"r": 9}]}},
    ],
    "answer": {"value": "1023", "number": 1023, "matchesKey": True},
    "shortcut": "Horner with all coefficients 1 is the geometric series (xⁿ − 1)/(x − 1); n = 10 elements and x = 2 give 2¹⁰ − 1.",
    "pitfalls": [
        "Using 2⁹ − 1 = 511: Z[0] is taken before the loop and the loop adds nine more, so ten coefficients are used.",
        "Computing 2¹⁰ = 1024: the series has no 2¹⁰ term; it stops at 2⁹.",
    ],
    "verification": "Compiled as given: SimpleFunction(Z, 10, 2) returns 1023; with Y = {4, 7, 2, 9} and x = 10 it returns 4729.",
    "animation": table("total = 2·total + Z[k]", ["k", "total", "binary"],
                       [[str(k), str(2 ** (k + 1) - 1), "1" * (k + 1)] for k in range(10)],
                       ["init"] + [f"pass {k}" for k in range(1, 10)], reveal=0),
}

# ── cse-2024-1-cs-38 ────────────────────────────────────────────────────────
SRC_2024 = C.code_block(B["cse-2024-1-cs-38"])
SOLUTIONS["cse-2024-1-cs-38"] = {
    "approach": "Concept tested: **a closed form for a loop**. `x = x + x + y` makes $x + y$ double on every pass ($y$ is fixed), so after $y$ passes $x = (x_0 + y)\\,2^y - y$; compare that with the powers of two.",
    "concepts": ["Closed form", "Loop invariant", "Powers of two"],
    "steps": [
        {"title": "Find the doubling quantity", "body": "New $x + y = (2x + y) + y = 2(x + y)$. So the invariant at index $i$ is $x + y = (x_0 + y)\\,2^i$.", "scene": {"line": 3}},
        {"title": "Closed form", "body": "At exit ($i = y$): $f(x_0, y) = (x_0 + y)\\,2^y - y$. Check: $f(1, 2)$: $1 \\to 4 \\to 10$, and $3 \\cdot 4 - 2 = 10$ ✓.", "scene": {"line": 5}},
        {"title": "Evaluate the calls", "body": "$f(20, 10) = 30 \\cdot 1024 - 10 = 30\\,710$; $f(20, 20) = 40 \\cdot 2^{20} - 20 = 41\\,943\\,020$; $f(10, 20) = 30 \\cdot 2^{20} - 20 = 31\\,457\\,260$. All fit in a 32-bit int.", "scene": {"line": 5, "vars": {"f(20,10)": 30710, "f(20,20)": 41943020, "f(10,20)": 31457260}}},
        {"title": "Compare", "body": "$2^{10} = 1024$, $2^{20} = 1\\,048\\,576$. A: 30 710 > 2²⁰? no. B: yes. C: 30 710 < 2¹⁰? no. D: yes.", "scene": {"line": 5}},
    ],
    "answer": {"value": "(B) and (D)", "choice": ["B", "D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "f(20, 10) = 30·2¹⁰ − 10 = 30 710, far below 2²⁰ = 1 048 576."),
        opt("B", True, "f(20, 20) = 40·2²⁰ − 20 = 41 943 020 > 2²⁰."),
        opt("C", False, "f(20, 10) = 30 710 is much larger than 2¹⁰ = 1024."),
        opt("D", True, "f(10, 20) = 30·2²⁰ − 20 = 31 457 260 > 2²⁰."),
    ],
    "shortcut": "After y passes x is about (x₀ + y)·2^y. With y = 20 the factor 2²⁰ already makes it larger than 2²⁰; with y = 10 the result is 30·2¹⁰, between 2¹⁴ and 2¹⁵.",
    "pitfalls": [
        "Treating the update as x ← 2x only and forgetting the + y, or treating y as changing (it is the loop bound and stays fixed).",
        "Choosing C by comparing 30·2¹⁰ with 2¹⁰ the wrong way round.",
    ],
    "verification": "Compiled as given: f(20, 10) = 30710, f(20, 20) = 41943020, f(10, 20) = 31457260; the closed form is checked at every pass for x₀ from −5 to 29 and y up to 11.",
    "animation": code(SRC_2024, line=1, vars={"x": 20, "y": 10}),
}

# ── cse-2025-1-cs-53 ────────────────────────────────────────────────────────
SRC_2025_1 = C.code_block(B["cse-2025-1-cs-53"])
SOLUTIONS["cse-2025-1-cs-53"] = {
    "approach": "Concept tested: **reading digits from the left**. The first loop finds $t = 10^{m-1}$, the place value of the leading digit; the second loop peels digits with `n / t` and `n % t`, and `turn` keeps every second one (the 2nd, 4th, … from the left).",
    "concepts": ["Digit extraction", "Integer division and remainder", "Loop invariant"],
    "steps": [
        {"title": "Find the leading place", "body": "`while (n >= t) t *= 10;` stops at the first power of 10 above 14362: $t = 100000$. Then `t /= 10` gives $t = 10000$.", "scene": {"line": 6, "vars": {"n": 14362, "t": 10000, "turn": 0, "newnum": 0}}},
        {"title": "Invariant of the second loop", "body": "Before the $k$-th pass: $t = 10^{5-k}$, $n$ is the digits not yet read, $turn = (k - 1) \\bmod 2$, and newnum holds the even-position digits read so far.", "scene": {"line": 7}},
        {"title": "Peel the digits", "body": "d = 1 (turn 0: skip), 4 (turn 1: newnum = 4), 3 (skip), 6 (newnum = 46), 2 (skip). After the fifth pass $t = 0$ and the loop ends.", "scene": {"line": 12, "vars": {"n": 0, "t": 0, "turn": 1, "newnum": 46}}},
        {"title": "Print", "body": "The function returns **46**, which main prints.", "scene": {"line": 17, "output": "46"}},
    ],
    "answer": {"value": "46", "number": 46, "matchesKey": True},
    "shortcut": "turn starts at 0 and the test is `if (turn)`, so digits 2, 4, … from the left are kept: 1**4**3**6**2 → 46.",
    "pitfalls": [
        "Keeping the digits read on turn 0 (1, 3, 2 → 132): the first digit is read with turn = 0 and skipped.",
        "Peeling from the right (as in the reversal loop): here d = n / t takes the leading digit.",
    ],
    "verification": "Compiled as given: prints 46. The function is also compared with \"every second digit from the left\" in Python for every n below 200 000.",
    "animation": code(SRC_2025_1, line=4, vars={"n": 14362, "t": 1}, title="gate(14362)"),
}

# ── cse-2025-2-cs-23 ────────────────────────────────────────────────────────
SRC_2025_2 = C.code_block(B["cse-2025-2-cs-23"])
SOLUTIONS["cse-2025-2-cs-23"] = {
    "approach": "Concept tested: **Euclid's subtraction GCD in a do–while loop**. Each pass replaces the larger value by the difference, which keeps $\\gcd(x, y)$; the loop stops when $x = y$, so it prints $\\gcd(126, 105) = 21$.",
    "concepts": ["GCD", "do-while loop", "Loop invariant"],
    "steps": [
        {"title": "First pass (the do-while body runs before any test)", "body": "126 > 105, so x = 126 − 105 = 21. Test 21 ≠ 105: continue.", "scene": upto(1, 3)},
        {"title": "Subtract 21 from y", "body": "y: 105 → 84 → 63 → 42 → 21. After the pass that makes y = 21, the test 21 ≠ 21 fails.", "scene": upto(5, 3)},
        {"title": "Why it is the gcd", "body": "$\\gcd(x, y)$ is unchanged by each subtraction and $\\gcd(21, 21) = 21$. Check: $126 = 2 \\cdot 3^2 \\cdot 7$, $105 = 3 \\cdot 5 \\cdot 7$, gcd $= 21$. The program prints **21**.", "scene": {"reveal": 18, "hl": [{"r": 5}]}},
    ],
    "answer": {"value": "21", "number": 21, "matchesKey": True},
    "shortcut": "Subtract the smaller from the larger until equal = gcd. Factor: gcd(126, 105) = 21.",
    "pitfalls": [
        "Stopping after the first subtraction and printing 21 for the wrong reason, or printing y: here x and y are both 21 at the end.",
        "Using this do–while with equal inputs: the body runs once, makes y = 0, and the loop never ends (x = x − 0 for ever); the while form would print x at once.",
    ],
    "verification": "Compiled as given: prints 21 after five passes (states 21/105, 21/84, 21/63, 21/42, 21/21); with x = y = 5 the do–while version runs until the time limit.",
    "animation": table("x = 126, y = 105", ["x", "y", "x ≠ y?"],
                       [["21", "105", "yes"], ["21", "84", "yes"], ["21", "63", "yes"], ["21", "42", "yes"], ["21", "21", "no"], ["print", "", "21"]],
                       ["pass 1", "pass 2", "pass 3", "pass 4", "pass 5", "after"], reveal=0),
}
