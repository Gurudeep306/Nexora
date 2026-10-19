"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 4, Lesson 2 (carry look-ahead).
Merged by _sol_ch4.py; every key is re-derived in l4_02_cla.py (arithlib look-ahead netlists, arrival
times, gate counts, and the 2006 options compared with the carry function row by row)."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _sol_ch1_fp import opt  # noqa: E402

SOLUTIONS = {}

SOLUTIONS["cse-1997-a-15"] = {
    "approach": "Concept tested: **the delay of a hierarchical carry look-ahead adder**. 74181 slices output group generate/propagate; 74182 units combine four groups and can themselves be grouped, so the best architecture is a tree whose depth grows like $\\log N$.",
    "concepts": ["Carry look-ahead", "Group G and P", "74181/74182", "Logarithmic delay"],
    "given": "An $N$-bit adder ($N$ a multiple of 4) from 74181 4-bit ALUs and 74182 4-group look-ahead generators; the best architecture is wanted.",
    "steps": [
        {"title": "What each chip does", "body": "Each 74181 adds 4 bits and produces its block $G$ and $P$. A 74182 takes four $(G, P)$ pairs and $c_0$, returns the three block carries, and produces the $G, P$ of the 16-bit group."},
        {"title": "Build a tree", "body": "$N/4$ slices feed $N/16$ 74182s, which feed $N/64$ 74182s, and so on, until one 74182 remains: about $\\log_4 (N/4)$ levels. Carries then come back down the same tree."},
        {"title": "Time", "body": "Each level adds a constant delay (going up and coming down), so the addition time is proportional to the number of levels: $\\Theta(\\log N)$."},
    ],
    "answer": {"value": "B: proportional to log N", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Linear time is a ripple-carry design (or 74181s chained by their ripple carries); the tree of 74182s is faster."),
        opt("B", True, "A tree of 74182s has about $\\log_4 (N/4)$ levels, each a constant delay."),
        opt("C", False, "Constant time would need one look-ahead unit with unbounded fan-in over all $N$ bits; a 74182 accepts only four groups."),
        opt("D", False, "B is correct."),
    ],
    "shortcut": "Hierarchical look-ahead = tree = $\\log$; ripple = $n$; single-level unbounded fan-in = constant on paper.",
    "pitfalls": [
        "Choosing 'constant' because a single look-ahead unit has a fixed depth: it handles only 4 groups.",
        "Choosing 'proportional to N' by imagining the 74182s in a chain rather than a tree.",
    ],
    "verification": "l4_02_cla.py builds multi-level look-ahead netlists with 4-way blocks and measures their delay: 4, 8, 12 unit gates for 4, 16, 64 bits (one more level per factor of 4).",
}

SOLUTIONS["cse-2004-cs-62"] = {
    "approach": "Concept tested: **the exact delay of a 4-bit CLA when no XOR gate is allowed**. With only AND, OR, NOT, NAND, NOR (complements free), each XOR (the propagate and the sum) is a two-level circuit; the carry network is two-level AND-OR.",
    "concepts": ["Carry look-ahead", "Propagation delay", "Two-level logic"],
    "given": "4-bit CLA; gates AND, OR, NOT, NAND, NOR, each 1 unit; inputs available complemented; carry network two-level AND-OR.",
    "steps": [
        {"title": "Propagate and generate", "body": "$G_i = A_iB_i$: 1 level. $P_i = A_i \\oplus B_i = A_i\\bar B_i + \\bar A_iB_i$: an AND level and an OR level, so **2 units** (the slower of the two)."},
        {"title": "Carries", "body": "$C_{i+1} = G_i + P_iG_{i-1} + \\dots + P_i\\cdots P_0C_0$ is two-level AND-OR on the $P$'s and $G$'s: ready at $2 + 2 = $ **4 units**."},
        {"title": "Sums", "body": "$S_i = P_i \\oplus C_i$ is again an XOR built as two-level logic: $4 + 2 = $ **6 units**. (This assumes the complements $\\bar P_i$, $\\bar C_i$ are produced alongside $P_i$, $C_i$ by the same two-level stages, i.e. dual-rail logic; otherwise one more inverter level is needed.)"},
    ],
    "answer": {"value": "B: 6 time units", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "4 units is the CLA delay when XOR is a single 1-unit gate (1 + 2 + 1); here XOR must be built from the listed gates."),
        opt("B", True, "2 (P as AND-OR) + 2 (carry network) + 2 (sum XOR as AND-OR) = 6."),
        opt("C", False, "10 is the 4-bit ripple-carry adder with XOR = 2 units: $(2 + 1 + 1) + 3 \\times 2 = 10$; the question asks for the look-ahead adder."),
        opt("D", False, "12 would count each stage twice."),
    ],
    "shortcut": "CLA = three stages (P/G, carries, sums); each stage is 2 levels when XOR must be built: $3 \\times 2 = 6$.",
    "pitfalls": [
        "Counting $P_i$ as one level (only true if an XOR gate exists).",
        "Forgetting the sum XOR stage after the carries.",
    ],
    "verification": "l4_02_cla.py times the 4-bit look-ahead netlist with XOR costing 2 units (its two-level AND-OR form) and every other gate 1: carries at 4, sums at 6.",
}

SOLUTIONS["cse-2006-cs-36"] = {
    "approach": "Concept tested: **the carry of a block written as a sum of products of the operand bits**: unroll $c_3 = G_2 + P_2G_1 + P_2P_1G_0$ (carry in 0) with $G_i = a_ib_i$ and the OR form $P_i = a_i + b_i$, which is valid for carries.",
    "concepts": ["Carry look-ahead", "Generate and propagate", "Sum of products"],
    "given": "Two 3-bit numbers $a_2a_1a_0$, $b_2b_1b_0$ and a carry in $c$; the \"carry generate function\" of the 3-bit addition (the block's carry out produced by the operand bits, i.e. with $c = 0$).",
    "steps": [
        {"title": "Look-ahead form", "body": "$c_3 = G_2 + P_2G_1 + P_2P_1G_0 + P_2P_1P_0c$. The block's **generate** is the part not involving $c$: $G_2 + P_2G_1 + P_2P_1G_0$."},
        {"title": "Use the OR propagate", "body": "For carries, $P_i = a_i + b_i$ works as well as $a_i \\oplus b_i$ (they differ only when $a_i = b_i = 1$, where $G_i = 1$ already). So $G = a_2b_2 + (a_2 + b_2)a_1b_1 + (a_2 + b_2)(a_1 + b_1)a_0b_0$."},
        {"title": "Multiply out", "body": "$a_2b_2 + a_2a_1b_1 + a_1b_2b_1 + a_2a_1a_0b_0 + a_2a_0b_1b_0 + a_1a_0b_2b_0 + a_0b_2b_1b_0$: $1 + 2 + 4 = 7$ products, exactly option A."},
        {"title": "Check one row", "body": "$a = 001$, $b = 111$: $1 + 7 = 8$ produces a carry out of the 3 bits; in A the term $a_0b_2b_1b_0 = 1$ ✓. With $a = 011$, $b = 100$ ($3 + 4 = 7$, no carry) every term of A is 0 ✓."},
    ],
    "answer": {"value": "A: a2b2 + a2a1b1 + a2a1a0b0 + a2a0b1b0 + a1b2b1 + a1a0b2b0 + a0b2b1b0", "choice": ["A"], "matchesKey": True,
               "keyNote": "The scan prints the options as an unreadable bitmap; B–D are transcriptions. A is proved equal to the carry generate; B–D as transcribed are not."},
    "optionAnalysis": [
        opt("A", True, "It is $G_2 + P_2G_1 + P_2P_1G_0$ with $P_i = a_i + b_i$, multiplied out; it agrees with the carry out of $A + B$ (carry in 0) on all 64 input rows."),
        opt("B", False, "It contains $a_1a_0b_2$, which is 1 for $a = 011$, $b = 100$ ($3 + 4 = 7$, no carry): wrong row."),
        opt("C", False, "It starts with $a_2 + b_2$: a single 1 in the top column would make a carry ($4 + 0$ has none). It confuses OR with AND for the generate."),
        opt("D", False, "Its complemented literals change the function: e.g. it is 1 for $a = 001$, $b = 001$ ($1 + 1 = 2$, no carry out of 3 bits), through the term $\\overline{a_2a_1}a_0b_0$."),
    ],
    "shortcut": "$k$-bit block generate = $1 + 2 + 4 + \\dots$ products ($2^0 + 2^1 + \\dots + 2^{k-1}$ after expanding each $a_i + b_i$): for 3 bits, 7 terms with no complements.",
    "pitfalls": [
        "Expanding $P_i$ as $a_i \\oplus b_i$ and getting complemented literals (option D's look): correct but not in this form, and it is easy to drop terms.",
        "Including the carry in $c$: the generate function is the part that does not depend on it.",
    ],
    "verification": "l4_02_cla.py evaluates each option on all 64 rows of $(a, b)$ and compares with the carry out of $a + b$: A matches, B, C and D (as transcribed) do not.",
}

SOLUTIONS["cse-2007-cs-35"] = {
    "approach": "Concept tested: **gate counts of a two-level look-ahead carry generator**. Carry $C_k$ has $k$ AND terms (one per source below the top $G$) plus one OR; the sums need all of $C_1 \\dots C_3$ and $C_4$ is an output.",
    "concepts": ["Carry look-ahead", "Two-level logic", "Gate count"],
    "given": "$P_i = A_i \\oplus B_i$, $G_i = A_iB_i$ available; $C_{i+1} = G_i + P_iC_i$; two-level AND-OR, any fan-in; outputs $S_3 \\dots S_0$ and $C_4$.",
    "steps": [
        {"title": "Which carries are needed", "body": "$S_i = P_i \\oplus C_i$ needs $C_0$ (an input), $C_1$, $C_2$, $C_3$; and $C_4$ is an output. So the generator must produce $C_1 \\dots C_4$."},
        {"title": "Expand each", "body": "$C_1 = G_0 + P_0C_0$; $C_2 = G_1 + P_1G_0 + P_1P_0C_0$; $C_3 = G_2 + P_2G_1 + P_2P_1G_0 + P_2P_1P_0C_0$; $C_4$ = five terms ending with $P_3P_2P_1P_0C_0$."},
        {"title": "Count", "body": "AND gates: the products other than the bare $G$: $1 + 2 + 3 + 4 = 10$. OR gates: one per carry, 4."},
    ],
    "answer": {"value": "B: 10 AND gates and 4 OR gates", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "6 ANDs and 3 ORs build only $C_1 \\dots C_3$ ($1 + 2 + 3$); $C_4$ is a required output."),
        opt("B", True, "$1 + 2 + 3 + 4 = 10$ AND terms and one OR per carry."),
        opt("C", False, "6 ANDs would leave $C_4$'s four products unbuilt, yet 4 ORs assume $C_4$ exists."),
        opt("D", False, "5 ORs would count an OR for $C_0$, which is an input."),
    ],
    "shortcut": "$n$-bit look-ahead unit: $n(n+1)/2$ ANDs and $n$ ORs. $n = 4$: 10 and 4.",
    "pitfalls": [
        "Counting $G_i$ itself as an AND term: the $G_i$ are given.",
        "Stopping at $C_3$ because the sums only need $C_0 \\dots C_3$: $C_4$ is listed as an output.",
    ],
    "verification": "l4_02_cla.py counts the gates of the two-level look-ahead netlist for $C_1 \\dots C_4$: 10 AND and 4 OR, and checks every carry against integer addition.",
}

SOLUTIONS["cse-2016-1-cs-33"] = {
    "approach": "Concept tested: **CLA delay with bounded fan-in**. The two-level carry formula needs gates of fan-in up to $n + 1$; with fan-in at most two those become trees (or the adder becomes a multi-level CLA), giving $\\Theta(\\log n)$, which is also a lower bound for any adder.",
    "concepts": ["Carry look-ahead", "Fan-in", "Asymptotic delay"],
    "given": "An $n$-bit carry look-ahead adder built from gates of fan-in at most 2.",
    "steps": [
        {"title": "Why not constant", "body": "$c_n$ contains the product $p_{n-1}\\cdots p_0c_0$ ($n + 1$ inputs) and is an OR of $n + 1$ terms. With 2-input gates, each wide AND or OR is a balanced tree of depth $\\lceil\\log_2(n+1)\\rceil$."},
        {"title": "Upper bound", "body": "Equivalently build a multi-level CLA with 2-way blocks: $\\log_2 n$ levels, each a constant number of gate delays up and down. Its 3-input gates each become two 2-input gates, at most doubling the depth. Delay $O(\\log n)$."},
        {"title": "Lower bound", "body": "$c_n$ depends on all $2n + 1$ inputs; a circuit of depth $D$ with fan-in 2 lets an output see at most $2^D$ inputs, so $D \\ge \\log_2(2n+1)$. Hence $\\Theta(\\log n)$."},
    ],
    "answer": {"value": "B: Θ(log n)", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Θ(1) holds only if gates of unbounded fan-in cost one unit; fan-in 2 forbids that."),
        opt("B", True, "Fan-in 2 forces logarithmic-depth trees, and $\\log_2(2n+1)$ is also a lower bound."),
        opt("C", False, "Θ(√n) is the carry-select or carry-skip adder with √n-bit blocks, not a look-ahead adder."),
        opt("D", False, "Θ(n) is the ripple-carry adder."),
    ],
    "shortcut": "Bounded fan-in + look-ahead ⇒ tree ⇒ $\\log n$.",
    "pitfalls": [
        "Answering Θ(1) from the 'two-level' formula, ignoring the fan-in limit.",
        "Confusing look-ahead with carry-select (√n) or ripple (n).",
    ],
    "verification": "l4_02_cla.py measures 2-way multi-level look-ahead netlists: 4, 7, 11, 15 gate delays for 2, 4, 8, 16 bits (a constant per doubling), every gate with fan-in at most 3, each of which splits into two 2-input gates (at most doubling the depth).",
}
