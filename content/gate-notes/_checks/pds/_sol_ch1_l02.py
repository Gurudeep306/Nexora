"""Teacher-style v2 solutions for the PYQs of PDS Chapter 1, Lesson 2 (control flow and loop tracing).
Every key is re-derived in l1_02_control_flow.py by compiling and running the program with cc (the Pascal
ones translated to C and re-derived in Python). `python3 _sol.py 1` writes them into src/gate/solutions."""
import common as C

opt = C.opt
SOLUTIONS = {}
B = C.bank()


def code(src, line=None, vars=None, output=None, title=None, caption=None, lang="c", hl=None):
    f = {"kind": "code", "lang": lang, "code": src}
    if title:
        f["title"] = title
    if line:
        f["line"] = line
    if hl:
        f["hl"] = hl
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


SOLUTIONS["cse-1991-a-4-ii"] = {
    "approach": "Concept tested: **test-after versus test-before loops**. `repeat S until B` always runs `S` once and then stops as soon as `B` is true; a `while` loop tests first and continues while its condition is true. So peel off the first execution of `S` and negate the condition.",
    "concepts": ["repeat-until", "while loop", "Loop equivalence", "Pascal"],
    "given": "Pascal: `repeat S until B;` with an arbitrary statement S and Boolean condition B.",
    "steps": [
        {"title": "What repeat … until does", "body": "Run S; evaluate B; if B is **true**, stop; otherwise run S again and repeat. S runs **at least once**, and B is a *stopping* condition.", "scene": {"line": 1}},
        {"title": "Match the first execution", "body": "A `while` loop tests before its first pass, so it cannot by itself guarantee one execution of S. Write that first execution in front: `S;`.", "scene": {"line": 3}},
        {"title": "Match the remaining executions", "body": "After the first S, `repeat` continues exactly while B is **false**: that is `while not B do S`. Together: **`S; while not B do S`**. (If S is several statements, wrap the loop body in `begin … end`.)", "scene": {"line": 4}},
        {"title": "Why `while not B do S` alone is wrong", "body": "If B is already true before the loop, `while not B do S` runs S zero times, while `repeat` runs it once. Example: `repeat x := 2*x until x > 100` from x = 500 gives 1000; `while not (x > 100) do x := 2*x` leaves 500."},
    ],
    "answer": {"value": "S; while not B do S", "matchesKey": True},
    "shortcut": "repeat = do-while with the condition negated: `repeat S until B` ≡ C's `do S while (!B);` ≡ `S; while (!B) S;`.",
    "pitfalls": [
        "Writing `while not B do S` without the leading S: it fails when B is true at the start.",
        "Writing `S; while B do S`: `until B` means *stop* when B holds, so the while condition must be `not B`.",
    ],
    "verification": "Checked on 2000 random little state machines (a random map S and a random predicate B): `S; while not B do S` always runs the same steps as `repeat S until B`, while `while not B do S` alone differs on some; and on the example from x = 3 (192 after 6 passes) and x = 500 (1000 after 1).",
    "animation": code("repeat S until B;\n\n{ equivalent: }\nS;\nwhile not B do S;", line=1, lang="pseudo", title="repeat … until written with while"),
}

SRC95 = """X := -10; Y := 20;
If X > Y then
    if X < 0 then X := abs(X)
    else X := 2*X;"""
SOLUTIONS["cse-1995-a-4"] = {
    "approach": "Concept tested: **the dangling else**. An `else` belongs to the nearest preceding `if` that has no `else` yet, here `if X < 0`, so the whole inner `if … else` is the body of `if X > Y`, which is false: nothing is assigned.",
    "concepts": ["Dangling else", "Nested if", "Pascal"],
    "steps": [
        {"title": "Attach the else", "body": "The `else X := 2*X` belongs to the nearest unmatched `if`, which is `if X < 0`. The statement is `if X > Y then (if X < 0 then X := abs(X) else X := 2*X)`; the outer `if` has no `else`.", "scene": {"line": 3, "hl": [3, 4]}},
        {"title": "Evaluate the outer test", "body": "`X > Y` is `-10 > 20`: **false**. So the body of the outer `if`, the inner `if … else`, is skipped entirely.", "scene": {"line": 2, "vars": {"X": -10, "Y": 20, "X > Y": "false"}}},
        {"title": "Result", "body": "No assignment to X happens, so X keeps its initial value **−10**.", "scene": {"line": 4, "vars": {"X": -10, "Y": 20}}},
    ],
    "answer": {"value": "(C) -10", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "10 would need `X := abs(X)` to run, but that requires X > Y, which is false."),
        opt("B", False, "−20 comes from attaching the else to the outer if (the else would run because X > Y is false); the grammar attaches it to the inner if."),
        opt("C", True, "The outer test fails and the outer if has no else, so X stays −10."),
        opt("D", False, "C is correct."),
    ],
    "shortcut": "With a dangling else, first check the outer condition: if it is false, the whole nested statement does nothing.",
    "pitfalls": [
        "Following the layout instead of the grammar: indentation never decides where an else belongs.",
        "Running `abs(X)` because X < 0 is true, forgetting that the inner if is only reached when X > Y.",
    ],
    "verification": "Translated to C (C and Pascal resolve the dangling else identically) and compiled: prints −10; with braces around the inner if it prints −20. A Python model agrees with the C program on 49 pairs (X, Y).",
    "animation": code(SRC95, line=1, vars={"X": -10, "Y": 20}, lang="pseudo"),
}

SOLUTIONS["cse-2003-cs-88"] = {
    "approach": "Concept tested: **tracing what a loop really computes**. The fragment looks like the sieve of Eratosthenes, but it ORs in `j % k`, which is non-zero when k does **not** divide j; every j ≥ 3 has such a k in the range, so every entry is marked and nothing is printed.",
    "concepts": ["Loop tracing", "Nested loops", "Logical OR", "Remainder"],
    "given": "n ≥ 3, TwoLog_n = 2⌊log₂ n⌋, A[3..n] set to 0 first.",
    "steps": [
        {"title": "Read the update", "body": "`A[j] = A[j] || (j % k)`: once A[j] is 1 it stays 1, and it becomes 1 as soon as some k (2 ≤ k ≤ TwoLog_n, k < j) gives `j % k ≠ 0`, i.e. some k that does **not** divide j. A real sieve would mark j when k *divides* it.", "scene": {"reveal": 1}},
        {"title": "Odd j", "body": "k = 2 is always in range (n ≥ 3 makes TwoLog_n ≥ 2) and 2 < j. For odd j, `j % 2 = 1`: marked.", "scene": {"reveal": 3}},
        {"title": "Even j", "body": "Let m be the smallest number ≥ 2 that does not divide j. All of 2 … m − 1 divide j, so their lcm (≥ 2^(m−2)) is ≤ j; hence m ≤ ⌊log₂ j⌋ + 2 ≤ 2⌊log₂ n⌋ (n ≥ 4), and m ≤ j − 1 since j − 1 never divides j. So k = m is tried and marks A[j]. E.g. j = 4: k = 3; j = 6: k = 4; j = 12: k = 5.", "scene": {"reveal": 6}},
        {"title": "What is printed", "body": "Every A[j] with 3 ≤ j ≤ n is 1, so the last loop prints **nothing**: the empty set.", "scene": {"reveal": 7}},
    ],
    "answer": {"value": "(D) { }", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Factorials such as 6 = 3! are marked too (6 % 4 = 2)."),
        opt("B", False, "Squares such as 4 and 9 are marked (4 % 3 = 1, 9 % 2 = 1)."),
        opt("C", False, "Primes would be printed by the sieve `A[j] || !(j % k)`, which marks multiples; this code marks non-multiples, so primes are marked as well (3 % 2 = 1)."),
        opt("D", True, "Every j from 3 to n has a non-divisor k in the loop's range, so every A[j] becomes 1 and nothing is printed."),
    ],
    "shortcut": "Try j = 3: k = 2 gives 3 % 2 = 1, so 3 is marked. 3 is prime, a square? no, a factorial? no; already C is dead, and the same one-line test kills every odd j. Then any even j: try k = 3 (or the next non-divisor).",
    "pitfalls": [
        "Pattern-matching the code to the sieve of Eratosthenes and answering C without reading `j % k` versus `!(j % k)`.",
        "Forgetting that `||` keeps A[j] at 1 once set, so the order of the k values does not matter.",
    ],
    "verification": "Compiled and run for every n from 3 to 129: nothing printed. Python confirms for all j ≤ n < 400 that the smallest non-divisor of j lies in the loop's range. With `!(j % k)` the same fragment prints 3 5 7 for n = 10.",
    "animation": table("n = 10, TwoLog_n = 6: the first k that marks each j", ["first k with j % k ≠ 0", "A[j]"],
                       [["2", "1"], ["3", "1"], ["2", "1"], ["4", "1"], ["2", "1"], ["3", "1"], ["2", "1"], ["3", "1"]],
                       ["j = 3", "j = 4", "j = 5", "j = 6", "j = 7", "j = 8", "j = 9", "j = 10"], reveal=0),
}

SOLUTIONS["cse-2006-cs-15"] = {
    "approach": "Concept tested: **the value accumulated by a halving loop**. The loop halves i and adds the new i to j, so j = ⌊n/2⌋ + ⌊n/4⌋ + … , which is exactly n minus the number of 1 bits of n: between n − 1 − log₂ n and n − 1, hence Θ(n).",
    "concepts": ["for loop", "Comma operator", "Halving loop", "Asymptotic value"],
    "steps": [
        {"title": "Read the header", "body": "The body is empty (`;`). Each pass: test `i > 0`, then `i /= 2`, then `j += i` with the **new** i. So j collects ⌊n/2⌋, ⌊n/4⌋, …, down to 0.", "scene": {"reveal": 1}},
        {"title": "Trace a small n", "body": "n = 37: i = 18, 9, 4, 2, 1, 0 and j = 18, 27, 31, 33, 34, 34. The sum is close to n.", "scene": {"reveal": 6}},
        {"title": "Bound the sum", "body": "Without the floors, n/2 + n/4 + … < n. With them, $\\sum_{k\\ge1} \\lfloor n/2^k \\rfloor = n - s_2(n)$ where $s_2(n)$ (the number of 1 bits) is between 1 and ⌊log₂ n⌋ + 1. So n − 1 − log₂ n ≤ val(j) ≤ n − 1.", "scene": {"reveal": 7}},
        {"title": "Conclude", "body": "Both bounds are linear in n, so **val(j) = Θ(n)**. (The number of passes is Θ(log n); the question asks about the value.)"},
    ],
    "answer": {"value": "(C) val(j) = Θ(n)", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Θ(log n) is the number of iterations, not the value of j."),
        opt("B", False, "The sum is at least n/2 (its first term), far more than √n."),
        opt("C", True, "j = n − (number of 1 bits of n), between n − 1 − log₂ n and n − 1."),
        opt("D", False, "Each term is at most half the previous one, so the sum is below n, not n log n."),
    ],
    "shortcut": "A geometric series n/2 + n/4 + … is dominated by its first term and stays below n: Θ(n).",
    "pitfalls": [
        "Confusing the loop's running time Θ(log n) with the value it accumulates.",
        "Thinking j adds the old i: `i /= 2` runs before `j += i` in the comma expression, so n itself is never added (it would not change the Θ anyway).",
    ],
    "verification": "Compiled for n = 8, 37, 100, 1000, 65536 and 10⁶: j = n − popcount(n) each time (34 for 37, 994 for 1000, 65535 for 65536); the identity is checked in Python for every n ≤ 2048.",
    "animation": table("n = 37: i /= 2, then j += i", ["i", "j"],
                       [["37", "0"], ["18", "18"], ["9", "27"], ["4", "31"], ["2", "33"], ["1", "34"], ["0", "34"], ["sum", "37 − 3 = 34"]],
                       ["start", "pass 1", "pass 2", "pass 3", "pass 4", "pass 5", "pass 6", "n − popcount"], reveal=0),
}

SRC07 = C.code_block(B["it-2007-cs-31"]).rstrip()
SOLUTIONS["it-2007-cs-31"] = {
    "approach": "Concept tested: **tracing a loop with a branch**. The `if` branch closes the current run (saving its sum if it is the best) and starts a new one; the `else` extends the run. Trace the six elements one by one.",
    "concepts": ["Loop tracing", "if-else", "Running maximum"],
    "steps": [
        {"title": "i = 0", "body": "`i == 0` is true: `sum > maxsum` (0 > 0) is false; sum = a[0] = 2 (positive).", "scene": {"line": 7, "vars": {"i": 0, "sum": 2, "maxsum": 0}}},
        {"title": "i = 1, 2", "body": "a[1] = −2 < 0: maxsum = 2, sum = 0. a[2] = −1 < 0: 0 > 2 false, sum = 0.", "scene": {"line": 8, "vars": {"i": 2, "sum": 0, "maxsum": 2}}},
        {"title": "i = 3, 4", "body": "a[3] = 3: not negative and not < a[2] = −1, so `else`: sum = 3. a[4] = 4 ≥ 3: sum = 7.", "scene": {"line": 11, "vars": {"i": 4, "sum": 7, "maxsum": 2}}},
        {"title": "i = 5 and after the loop", "body": "a[5] = 2 < a[4] = 4: maxsum = 7, sum = 2. After the loop, 2 > 7 is false. The program prints **7**.", "scene": {"line": 14, "vars": {"i": 6, "sum": 2, "maxsum": 7}, "output": "7"}},
    ],
    "answer": {"value": "(C) 7", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "9 adds the final 2 to the run 3 + 4, but 2 < 4 breaks the run."),
        opt("B", False, "8 is not the sum of any run the loop forms."),
        opt("C", True, "The runs are [2], [−2], [−1], [3, 4], [2]; the best sum is 7."),
        opt("D", False, "6 would come from not saving the run [3, 4] before restarting at a[5]."),
    ],
    "shortcut": "The loop computes the largest sum of a run of non-negative, non-decreasing elements: split 2 | −2 | −1 | 3 4 | 2 and take 3 + 4.",
    "pitfalls": [
        "Treating the condition `a[i] < a[i-1]` as `a[i] < 0` only: a drop also breaks the run.",
        "Forgetting the final `if (sum > maxsum)` after the loop (irrelevant here, but decisive when the best run is last).",
    ],
    "verification": "Compiled and run with cc: prints 7. With the array {1, 2, 3, −1, 5, 6} it prints 11, confirming the run-sum reading.",
    "animation": code(SRC07, line=4, vars={"sum": 0, "maxsum": 0}),
}

SRC12 = C.code_block(B["cse-2012-cs-3"]).rstrip()
SOLUTIONS["cse-2012-cs-3"] = {
    "approach": "Concept tested: **switch fall-through**. The switch jumps to `case 'A'` and then executes every statement below it, ignoring the other labels, because there is no `break` anywhere.",
    "concepts": ["switch statement", "Fall-through", "case labels"],
    "steps": [
        {"title": "Jump to the matching label", "body": "`inChar` is `'A'`, so control enters at `case 'A'` and prints `Choice A` and a newline.", "scene": {"line": 3, "hl": [3], "output": "Choice A\n"}},
        {"title": "Fall through the empty labels", "body": "Labels are positions, not statements: `case 'B':` labels the same statement as `case 'C':`, so `printf(\"Choice B\")` runs next.", "scene": {"line": 5, "hl": [4, 5], "output": "Choice A\nChoice B"}},
        {"title": "Fall through to default", "body": "Still no `break`: `case 'D'`, `case 'E'` and `default` are passed and `printf(\" No Choice\")` runs. Output: `Choice A`, newline, `Choice B No Choice`.", "scene": {"line": 8, "hl": [6, 7, 8], "output": "Choice A\nChoice B No Choice"}},
    ],
    "answer": {"value": "(C) Choice A / Choice B No Choice", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "`No Choice` alone is printed only when no case matches; 'A' matches."),
        opt("B", False, "Stopping after `Choice A` would need a `break` after the first printf."),
        opt("C", True, "Entry at case 'A' and fall-through to the end: all three printf calls run."),
        opt("D", False, "Empty case labels and a default without break are legal C."),
    ],
    "shortcut": "No `break` anywhere: everything from the matched label to the closing brace runs.",
    "pitfalls": [
        "Assuming each case ends automatically (as in Pascal's case statement): C falls through.",
        "Thinking stacked labels such as `case 'D': case 'E':` are errors: a label may label the next labelled statement.",
    ],
    "verification": "Compiled and run with cc: prints `Choice A`, a newline and `Choice B No Choice`; with inChar = 'C' only `Choice B No Choice`, with 'Z' only ` No Choice`.",
    "animation": code(SRC12, line=2, vars={"inChar": "'A'"}, output=""),
}

SRC13 = C.code_block(B["cse-2013-cs-31"]).rstrip()
SOLUTIONS["cse-2013-cs-31"] = {
    "approach": "Concept tested: **closed form of a nested loop's result**. Count the passes of each loop (outer: about n/2; inner doubling loop: ⌊log₂ n⌋), then multiply by the amount added each time, n/2. The question asks for the returned value, not the running time.",
    "concepts": ["Nested loops", "Doubling loop", "Closed form", "Asymptotic value"],
    "steps": [
        {"title": "Outer loop", "body": "i runs from ⌊n/2⌋ to n in steps of 1: n − ⌊n/2⌋ + 1 passes, about n/2.", "scene": {"line": 3}},
        {"title": "Inner loop", "body": "j = 2, 4, 8, … while j ≤ n: a doubling loop from 2, so ⌊log₂ n⌋ passes, the same for every i.", "scene": {"line": 4}},
        {"title": "What each pass adds", "body": "`k = k + n/2` adds the constant ⌊n/2⌋. So k = (n − ⌊n/2⌋ + 1) · ⌊log₂ n⌋ · ⌊n/2⌋ ≈ n² log₂ n / 4.", "scene": {"line": 5, "vars": {"n": 8, "k": "5·3·4 = 60"}}},
        {"title": "Asymptotics", "body": "(n/2) · log n · (n/2) = **Θ(n² log n)**. (The number of passes alone is Θ(n log n): that is the running time, not the value.)", "scene": {"line": 6, "vars": {"n": 8, "k": 60}}},
    ],
    "answer": {"value": "(B) Θ(n² log n)", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Θ(n²) misses the ⌊log₂ n⌋ passes of the inner doubling loop."),
        opt("B", True, "k = (n − ⌊n/2⌋ + 1)·⌊log₂ n⌋·⌊n/2⌋ ≈ n² log n / 4."),
        opt("C", False, "Θ(n³) treats the inner loop as linear, but j doubles."),
        opt("D", False, "Θ(n³ log n) overcounts both the inner loop and the outer one."),
    ],
    "shortcut": "value = (number of executions) × (amount added) = Θ(n log n) × Θ(n).",
    "pitfalls": [
        "Answering with the running time Θ(n log n) (not even an option) or forgetting that each pass adds n/2, not 1.",
        "Counting the inner loop as log₂ n + 1: it starts at j = 2, so it runs ⌊log₂ n⌋ times (no effect on Θ).",
    ],
    "verification": "Compiled for every n from 2 to 79 and for 100, 128 and 1000: the function equals the closed form (unknown(8) = 60, unknown(16) = 288, unknown(10) = 90), and k / (n² log₂ n) approaches 1/4.",
    "animation": code(SRC13, line=1, vars={"n": 8, "k": 0}),
}

SRC14 = C.code_block(B["cse-2014-1-cs-41"]).rstrip()
SOLUTIONS["cse-2014-1-cs-41"] = {
    "approach": "Concept tested: **recognising what nested loops compute**. The innermost loop sums E[i..j] for every pair i ≤ j, and Y keeps the largest such sum; Y starts at the total, which is itself a sub-array sum. So MyX is the maximum sub-array sum.",
    "concepts": ["Nested loops", "Loop tracing", "Maximum sub-array sum"],
    "steps": [
        {"title": "The first loop", "body": "Y = E[0] + … + E[size−1], the sum of the whole array.", "scene": {"line": 8}},
        {"title": "The triple loop", "body": "For each i ≤ j the k loop sets Z = E[i] + … + E[j], the sum of the contiguous sub-array from i to j; `if (Z > Y) Y = Z` keeps the maximum.", "scene": {"line": 14, "hl": [10, 11, 13, 14]}},
        {"title": "Why starting from the total is harmless", "body": "The total is the sum of the sub-array i = 0, j = size − 1, which the loops visit anyway; so Y = max over all non-empty sub-arrays of their sums.", "scene": {"line": 17}},
        {"title": "Test on an input that splits the options", "body": "E = [3, −4, 5, −1, 2]: MyX = 6 (5 − 1 + 2), the largest element is 5, the total is 5, and the sum of the sub-array maxima is 50. Only (A) gives 6.", "scene": {"line": 19, "vars": {"Y": 6}}},
    ],
    "answer": {"value": "(A) maximum possible sum of elements in any sub-array", "choice": ["A"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", True, "Z runs through every sub-array sum and Y keeps the largest."),
        opt("B", False, "The maximum element is the best one-element sub-array; MyX also considers longer ones (6 > 5 on [3, −4, 5, −1, 2])."),
        opt("C", False, "Nothing in the code takes a maximum inside a sub-array; it adds the elements."),
        opt("D", False, "The total is only the starting value of Y; any larger sub-array sum replaces it."),
    ],
    "shortcut": "Z = E[i] + … + E[j] and `if (Z > Y) Y = Z` is the definition of the maximum sub-array sum, by brute force in Θ(n³) additions.",
    "pitfalls": [
        "Answering D because Y is initialised to the total.",
        "Reading Z as the maximum of E[i..j] (it is a sum: `Z = Z + E[k]`).",
    ],
    "verification": "MyX compiled and compared with Kadane's algorithm on 65 arrays (60 random, plus an all-negative one and classic examples): identical results.",
    "animation": code(SRC14, line=1, vars={"size": 5}),
}

SRC15 = C.code_block(B["cse-2015-3-cs-48"]).rstrip()
SOLUTIONS["cse-2015-3-cs-48"] = {
    "approach": "Concept tested: **switch fall-through plus integer arithmetic**. First compute j (integer divisions truncate, the double sum is truncated on storing) and k; then, for each value of i + k, count the printf statements from the entry label to the end (there is no break).",
    "concepts": ["switch fall-through", "Integer division", "Pre-decrement", "Counting"],
    "steps": [
        {"title": "Compute j", "body": "`2 * 3 / 4` = 6/4 = 1; `2.0 / 5` = 0.4; `8 / 5` = 1. The sum 2.4 is a double; stored in the int j it becomes **2**.", "scene": {"line": 5, "vars": {"j": 2, "k": 0}}},
        {"title": "Compute k", "body": "`--j` makes j = 1 and yields 1; `k -= 1` gives k = **−1**. So i + k = −1, 0, 1, 2, 3 for i = 0 … 4.", "scene": {"line": 6, "vars": {"j": 1, "k": -1}}},
        {"title": "Count per value", "body": "−1 and 0: no matching case, `default` only: 1 call each. 1: enters at `case 1`, falls through 2, 3, default: 3 calls. 2: 3 calls. 3: `case 3` and default: 2 calls.", "scene": {"line": 11, "vars": {"j": 1, "k": -1}}},
        {"title": "Add", "body": "1 + 1 + 3 + 3 + 2 = **10** printf calls.", "scene": {"line": 15, "output": "\n-1\n0\n1\n1\n1\n2\n2\n2\n3\n3"}},
    ],
    "answer": {"value": "10", "number": 10, "matchesKey": True},
    "shortcut": "Without breaks, the number of calls for value v is the number of printf statements at or below v's label: values −1, 0 → 1, 1 and 2 → 3, 3 → 2.",
    "pitfalls": [
        "Computing j as 2.4 or 3 (j is an int, and 2*3/4 is 1, 8/5 is 1): that shifts every switch value.",
        "Counting one printf per matched case (5 in total) and forgetting fall-through.",
        "Taking k −= --j as k = −2 (using j before the decrement): --j yields the new value 1.",
    ],
    "verification": "Compiled and run with cc, with a counter added after each printf: 10 calls; the printed values are −1, 0, 1, 1, 1, 2, 2, 2, 3, 3.",
    "animation": code(SRC15, line=5, vars={"i": "-", "j": "?", "k": 0}),
}

SRC18 = C.code_block(B["cse-2018-cs-32"]).rstrip()
SOLUTIONS["cse-2018-cs-32"] = {
    "approach": "Concept tested: **counting the passes of halving loops**. A loop that halves i while i > 1 runs ⌊log₂ i⌋ times. The first loop leaves j = log₂ 2⁴⁰ = 40, and the second loop halves j: ⌊log₂ 40⌋ = 5.",
    "concepts": ["Halving loop", "Iteration count", "Logarithm", "unsigned long"],
    "steps": [
        {"title": "First loop", "body": "i = 2⁴⁰, 2³⁹, …, 2¹ pass the test `i > 1`; i = 1 fails. That is 40 passes, so **j = 40**. (A 64-bit unsigned long holds 2⁴⁰.)", "scene": {"line": 3, "vars": {"i": 1, "j": 40, "sum": 0}}},
        {"title": "Second loop", "body": "j = 40, 20, 10, 5, 2 pass `j > 1`; j = 1 fails. Five passes: **sum = 5**.", "scene": {"line": 4, "vars": {"i": 1, "j": 1, "sum": 5}}},
        {"title": "Formula check", "body": "sum = ⌊log₂ ⌊log₂ n⌋⌋ = ⌊log₂ 40⌋ = 5, since 32 ≤ 40 < 64.", "scene": {"line": 5, "vars": {"return": 5}}},
    ],
    "answer": {"value": "(B) 5", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "4 undercounts the second loop: 40 → 20 → 10 → 5 → 2 is five halvings before reaching 1."),
        opt("B", True, "j = 40 after the first loop; the second loop runs ⌊log₂ 40⌋ = 5 times."),
        opt("C", False, "6 is the number of binary digits of 40 (the count for a test `j > 0`); with `j > 1` it is one less."),
        opt("D", False, "40 is the value of j after the first loop, not the returned sum."),
    ],
    "shortcut": "Two halving loops in a row compute ⌊log₂ ⌊log₂ n⌋⌋: log₂ 2⁴⁰ = 40, and 2⁵ ≤ 40 < 2⁶.",
    "pitfalls": [
        "Returning j instead of sum (40).",
        "Using the `> 0` count ⌊log₂ j⌋ + 1 = 6 for a loop whose test is `> 1`.",
    ],
    "verification": "Compiled with 64-bit unsigned long: fun(2⁴⁰) = 5, fun(2¹⁶) = 4, fun(1000) = 3; for every n = 2ᵉ (e = 2 … 63) the result is ⌊log₂ e⌋.",
    "animation": code(SRC18, line=1, vars={"n": "2^40", "j": 0, "sum": 0}),
}

SRC19 = C.code_block(B["cse-2019-cs-52"]).rstrip()
SOLUTIONS["cse-2019-cs-52"] = {
    "approach": "Concept tested: **counting the passes of a loop on floats**. j doubles each pass, so the tested ratio i/j halves: 2, 1, 0.5, 0.25, 0.125, 0.0625. All are powers of two, exact in float, so the loop runs while the ratio is strictly above 0.0625: 5 times.",
    "concepts": ["while loop", "Floating point", "Powers of two", "Iteration count"],
    "steps": [
        {"title": "Track the ratio", "body": "Before each test, i/j is 2/1 = 2, then 2/2 = 1, 2/4 = 0.5, 2/8 = 0.25, 2/16 = 0.125, 2/32 = 0.0625 (j doubles inside the body).", "scene": {"line": 5, "vars": {"i": 2, "j": 1, "sum": 0}}},
        {"title": "Which tests pass", "body": "The body runs for the ratios 2, 1, 0.5, 0.25, 0.125, all > 0.0625: five passes, printing sum = 1, 1.5, 1.75, 1.875, 1.9375.", "scene": {"line": 8, "vars": {"i": 2, "j": 32, "sum": 1.9375}, "output": "1.000000\n1.500000\n1.750000\n1.875000\n1.937500\n"}},
        {"title": "The last test and exactness", "body": "At j = 32 the ratio is exactly 0.0625 = 2⁻⁴, and `0.0625 > 0.0625` is false. No rounding is involved: every value is a power of two or a short binary fraction. Answer **5**.", "scene": {"line": 10}},
    ],
    "answer": {"value": "5", "number": 5, "matchesKey": True},
    "shortcut": "The ratio goes 2 → 0.0625 = 2⁻⁴ by halving: from 2¹ down to 2⁻³ inclusive is 5 values that pass the strict test.",
    "pitfalls": [
        "Fearing that 0.0625 is stored inexactly and counting a sixth pass: powers of two are exact in binary floating point.",
        "Counting the doublings of j after the loop has already stopped, or treating `>` as `>=` (6).",
    ],
    "verification": "Compiled and run with cc: exactly five lines, 1.000000 1.500000 1.750000 1.875000 1.937500.",
    "animation": code(SRC19, line=4, vars={"i": 2, "j": 1, "sum": 0}, output=""),
}

SRC24 = C.code_block(B["cse-2024-1-cs-8"]).rstrip()
SOLUTIONS["cse-2024-1-cs-8"] = {
    "approach": "Concept tested: **termination**. Run the body twice: a = 6 becomes 6/12 + 1 + 0 = 1, and 1 becomes 1/12 + 1 + 0 = 1 again. The state repeats while the test `a < 10` is true, so the loop never ends and nothing is printed.",
    "concepts": ["while loop", "Integer division", "Infinite loop", "Fixed point"],
    "steps": [
        {"title": "First pass", "body": "a = 6 < 10: `a = 6/12 + 1` = 0 + 1 = 1 (integer division), then `a += b` adds 0: a = 1.", "scene": {"line": 7, "vars": {"a": 1, "b": 0}}},
        {"title": "Second pass", "body": "a = 1 < 10: `a = 1/12 + 1` = 1, `a += 0`: a = 1. The body maps 1 to itself: a **fixed point**.", "scene": {"line": 8, "vars": {"a": 1, "b": 0}}},
        {"title": "Conclusion", "body": "The test `1 < 10` is true at a state that never changes, so the loop runs for ever and `printf` is never reached: **infinite loop**.", "scene": {"line": 6, "vars": {"a": 1, "b": 0}}},
    ],
    "answer": {"value": "(C) The program gets stuck in an infinite loop", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "a never grows: after the first pass it is always 1."),
        opt("B", False, "Reaching 10 would need b ≥ 9; with b = 0 the loop cannot reach it."),
        opt("C", True, "a = 1 is a fixed point of the body with the test true: the loop never ends."),
        opt("D", False, "6 would be printed only if the body never ran, but 6 < 10 is true."),
    ],
    "shortcut": "For 0 ≤ a < 10, a/12 is 0, so the body sets a = 1 + b every time: the loop ends only if 1 + b ≥ 10.",
    "pitfalls": [
        "Reading `a / 12` as a fraction that slowly accumulates: integer division makes it 0.",
        "Assuming every while loop in an exam terminates.",
    ],
    "verification": "Compiled and run with cc under a time limit: no output, still running when stopped. With an iteration cap of 1000, a is 1 at the end; with b = 9 the program prints 10, with b = 3 it sticks at 4.",
    "animation": code(SRC24, line=4, vars={"a": 6, "b": 0}),
}
