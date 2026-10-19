"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 4, Lesson 4 (array multipliers).
Merged by _sol_ch4.py; both keys are re-derived in l4_04_multipliers.py from timed array netlists."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import arithlib as al  # noqa: E402
from _sol_ch1_fp import opt  # noqa: E402

SOLUTIONS = {}


def _delays():
    out = []
    for n in range(2, 9):
        net = al.array_multiplier(n)
        t = al.arrival(net, [f"a{j}" for j in range(n)] + [f"b{j}" for j in range(n)])
        out.append([str(n), str(n * n), str(n * (n - 1)), str(max(t[f"P{k}"] for k in range(2 * n)))])
    return out


ROWS = _delays()
ANIM = {"kind": "table", "title": "Array multiplier: hardware grows as n², delay as n", "cols": ["n", "AND gates", "adder cells", "delay (unit gates)"], "rows": ROWS, "mono": True}
STEPS = [
    {"title": "What the cells do", "body": "The $n^2$ AND gates make all partial products in one gate delay. The $n(n-1)$ full-adder cells are arranged as $n - 1$ rows: each sum moves down a row at the same weight, each carry moves left one weight in its row."},
    {"title": "Longest path: upper bound", "body": "Along any path the row index and the weight never decrease, and every cell increases one of them. With $n - 1$ rows and $2n - 1$ weights, a path crosses fewer than $3n$ cells, each a constant number of gate delays: $O(n)$."},
    {"title": "Longest path: lower bound", "body": "The final carry depends on partial products in the first row, and any route from there to the last row crosses every row: at least $n - 1$ cells. So $\\Omega(n)$."},
    {"title": "Measured", "body": "On our ripple-row netlist (unit gates) the worst case is $6(n - 1)$: 6, 12, 18, 24, 30, 36, 42 for $n = 2 \\dots 8$, while the cell count grows as $n(n - 1)$."},
]

SOLUTIONS["cse-1999-a-21"] = {
    "approach": "Concept tested: **the delay of an array multiplier**. Its cells work in parallel; the delay is the longest chain of cells a signal crosses, which grows linearly with $n$ even though there are about $n^2$ cells.",
    "concepts": ["Array multiplier", "Critical path", "Asymptotic delay"],
    "given": "An array multiplier for two $n$-bit numbers; the maximum gate delay for any output to appear.",
    "steps": STEPS,
    "answer": {"value": "B: O(n)", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$O(n^2)$ is the number of cells (hardware), not the delay: the cells operate in parallel."),
        opt("B", True, "Every path moves left or down through $O(n)$ cells."),
        opt("C", False, "$O(\\log n)$ needs a tree (Wallace/Dadda) reduction with a fast adder, which is not an array."),
        opt("D", False, "Constant delay would need a two-level SOP of every product bit with unbounded fan-in (exponentially many gates); no array does that."),
    ],
    "shortcut": "Array: hardware $n^2$, delay $n$. Tree: delay $\\log n$.",
    "pitfalls": [
        "Equating the number of cells with the delay.",
        "Confusing an array with a Wallace tree.",
    ],
    "verification": "l4_04_multipliers.py simulates the array netlists for $n = 2 \\dots 4$ exhaustively and times them for $n = 2 \\dots 8$: delay $6(n - 1)$, linear.",
    "animation": ANIM,
}

SOLUTIONS["cse-2003-cs-11"] = {
    "approach": "Concept tested: **the order of an array multiplier's delay with unit gate delays**: the critical path crosses $\\Theta(n)$ cells, each a constant number of gates.",
    "concepts": ["Array multiplier", "Critical path", "Asymptotic delay"],
    "given": "An array multiplier for two $n$-bit numbers; every gate has unit delay.",
    "steps": STEPS,
    "answer": {"value": "C: Θ(n)", "choice": ["C"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "Θ(1) would need two-level logic with unbounded fan-in and exponentially many gates, not an adder array."),
        opt("B", False, "Θ(log n) is a tree multiplier with a fast final adder."),
        opt("C", True, "Upper bound O(n) (paths move left or down) and lower bound Ω(n) (some path crosses every row)."),
        opt("D", False, "Θ(n²) counts the cells, which work in parallel."),
    ],
    "shortcut": "Same as GATE 1999: array ⇒ linear.",
    "pitfalls": [
        "Choosing Θ(n²) from the $n^2$ AND gates and cells.",
        "Choosing Θ(log n) by analogy with carry look-ahead.",
    ],
    "verification": "l4_04_multipliers.py: measured unit-gate delays 6, 12, …, 42 for $n = 2 \\dots 8$ (exactly $6(n - 1)$).",
    "animation": ANIM,
}
