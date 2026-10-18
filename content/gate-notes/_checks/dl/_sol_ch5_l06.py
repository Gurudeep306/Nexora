"""Teacher-style v2 solutions for the PYQs of Digital Logic Chapter 5, Lesson 6 (stuck-at faults and
test inputs): cse-1994-b-35-b, it-2005-cs-46, it-2007-cs-45. Every key is re-derived by fault
simulation in l5_06_faults.py; _sol_ch5.py merges this module and writes src/gate/solutions."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _sol_ch1_fp import opt  # noqa: E402

SOLUTIONS = {}


def circuit(title, inputs, gates, out, caption=None):
    f = {"kind": "circuit", "title": title, "inputs": [{"id": i, "label": i, "value": v} for i, v in inputs],
         "gates": [{"id": g, "type": t, "in": ins, "label": g} for g, t, ins in gates],
         "outputs": [{"id": "F", "from": out, "label": "F"}], "showValues": True}
    if caption:
        f["caption"] = caption
    return f


SOLUTIONS["cse-1994-b-35-b"] = {
    "approach": "Concept tested: **finding a test vector for a stuck-at fault**. A test must **activate** the fault (drive line $p$ to the opposite of its stuck value in the good circuit) and **propagate** it (set the side input of every gate between $p$ and the output to its non-controlling value), so that the good and faulty outputs differ.",
    "concepts": ["Stuck-at fault", "Test vector", "Activation", "Propagation", "NAND controlling value"],
    "given": "$p = \\overline{AB}$ (NAND of $A$, $B$) feeds a second NAND with $C$: $f = \\overline{p\\,C}$. Line $p$ is stuck at 1.",
    "steps": [
        {"title": "Activate the fault", "body": "The faulty line always reads 1, so the fault can only show when the good circuit wants $p = 0$. A NAND outputs 0 only when **all** its inputs are 1, so we need $A = B = 1$. Now the good circuit has $p = 0$ and the faulty one $p = 1$: a difference exists on $p$."},
        {"title": "Propagate it through the output NAND", "body": "The difference must reach $f$. The other input of the output NAND is $C$. A 0 is the controlling value of a NAND (it forces the output to 1 whatever $p$ is), so $C$ must be at the non-controlling value **1**. Then $f = \\overline{p}$, and a change in $p$ shows at the output. In Boolean-difference form: $f|_{p=0} = 1$, $f|_{p=1} = \\overline{C}$, so $\\partial f/\\partial p = C$."},
        {"title": "Simulate good and faulty circuits", "body": "On $ABC = 111$: good $p = \\overline{1 \\cdot 1} = 0$, $f = \\overline{0 \\cdot 1} = 1$. Faulty $p = 1$, $f = \\overline{1 \\cdot 1} = 0$. The outputs differ (1 against 0), so the tester sees the fault.", "scene": {"caption": "Good circuit on A = B = C = 1: p = 0 and F = 1. With p stuck at 1, F would be 0."}},
        {"title": "No other input works", "body": "Activation allows only $AB = 11$ and propagation only $C = 1$, so the test is unique. Simulating all eight rows confirms that row 111 is the only one on which the two circuits disagree."},
    ],
    "answer": {"value": "$A = B = C = 1$ (input 111) is the test for $p$ stuck-at-1; it is the only one.", "matchesKey": True},
    "shortcut": "Set the faulty line opposite to its stuck value (here $p = 0$ needs $A = B = 1$), and put a 1 on every side input of a NAND/AND on the way to the output (here $C = 1$).",
    "pitfalls": [
        "Setting $p = 1$ (for example $A = 0$): that is the stuck value, so good and faulty circuits are identical.",
        "Taking $C = 0$: a 0 into the output NAND forces $f = 1$ in both circuits and blocks the difference.",
        "Answering with the faulty line's value instead of primary inputs: a test is a vector of $A$, $B$, $C$.",
    ],
    "verification": "Fault simulation over all 8 rows: good outputs (1, 0, 1, 0, 1, 0, 1, 1), faulty outputs with $p \\equiv 1$ equal $\\overline{C}$ = (1, 0, 1, 0, 1, 0, 1, 0); they differ only on row 7 = 111.",
    "animation": circuit("Good circuit on the test 111", [("A", 1), ("B", 1), ("C", 1)],
                         [("p", "NAND", ["A", "B"]), ("f", "NAND", ["p", "C"])], "f",
                         "A = B = 1 drives p to 0 (opposite of its stuck value); C = 1 lets p decide F."),
}

SOLUTIONS["it-2005-cs-46"] = {
    "approach": "Concept tested: **counting multiple stuck-at faults**. In a multiple fault every line is in one of **three** states (fault-free, s-a-0, s-a-1), and at least one line must be faulty. Count all assignments of states and remove the all-fault-free one.",
    "concepts": ["Stuck-at fault", "Multiple faults", "Product rule", "Counting"],
    "given": "A circuit with $N$ lines; a multiple stuck-at fault is one or more lines stuck at 0 or 1.",
    "steps": [
        {"title": "Describe a fault line by line", "body": "A (single or multiple) fault is fixed completely by saying, for each of the $N$ lines, whether it is fault-free, stuck-at-0 or stuck-at-1. Different descriptions are different faults."},
        {"title": "Count the descriptions", "body": "Three choices per line, independently: $3 \\times 3 \\times \\cdots \\times 3 = 3^N$ descriptions (product rule)."},
        {"title": "Remove the good circuit", "body": "Exactly one description has every line fault-free; it is the good circuit, not a fault. So there are $3^N - 1$ multiple stuck-at faults.", "scene": {"hl": [{"r": 0}, {"r": 1}, {"r": 2}]}},
        {"title": "Cross-check by the number of faulty lines", "body": "With exactly $k$ faulty lines: choose them in $\\binom{N}{k}$ ways and give each a stuck value in $2^k$ ways. $\\sum_{k=1}^{N} \\binom{N}{k}2^k = (1 + 2)^N - 1 = 3^N - 1$. For $N = 3$ (table): $6 + 12 + 8 = 26 = 3^3 - 1$."},
    ],
    "answer": {"value": "(B) $3^N - 1$", "choice": ["B"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$3^N$ includes the assignment in which every line is fault-free, which is the good circuit, not a fault."),
        opt("B", True, "Three states per line, minus the all-fault-free assignment."),
        opt("C", False, "$2^N - 1$ gives each line only two states and so forgets that a line may be fault-free while others are stuck; for $N = 2$ it gives 3 instead of 8."),
        opt("D", False, "$2^N$ counts only the faults in which **every** line is stuck (the $k = N$ term)."),
    ],
    "shortcut": "Each line: healthy, 0 or 1 → $3^N$; subtract the healthy circuit → $3^N - 1$. (Single faults alone would be $2N$.)",
    "pitfalls": [
        "Treating a line as having only two values (0 or 1) and answering $2^N$ or $2^N - 1$.",
        "Forgetting to subtract the all-fault-free case and answering $3^N$.",
        "Answering $2N$, which counts single faults only.",
    ],
    "verification": "Enumeration of all $\\{\\text{none}, 0, 1\\}^N$ assignments with at least one faulty line gives 2, 8, 26, 80 for $N = 1, 2, 3, 4$, which is $3^N - 1$ each time; $2^N$ and $2^N - 1$ already fail at $N = 2$.",
    "animation": {"kind": "table", "title": "Multiple faults on N = 3 lines, by number of faulty lines", "cols": ["k faulty lines", "choose lines", "stuck values", "faults"],
                  "rows": [[1, 3, 2, 6], [2, 3, 4, 12], [3, 1, 8, 8], ["total", "", "", "26 = 3³ − 1"]]},
}

SOLUTIONS["it-2007-cs-45"] = {
    "approach": "Concept tested: **an undetectable stuck-at fault**. A test for $T$ s-a-0 must make $T = 1$ (activation) and make the NOR output depend on $T$ (propagation: the NOR's other input at 0). Here the inputs that activate the fault also block it, so no input detects it.",
    "concepts": ["Stuck-at fault", "Activation", "Propagation", "Undetectable fault", "Redundancy"],
    "given": "$n = \\overline{X_1X_2X_3}$ (3-input NAND), $o = n + X_4$ (OR), $T = X_3X_4$ (AND), output $f = \\overline{o + T}$ (NOR). Line $T$ is tied to ground: $T$ stuck-at-0.",
    "steps": [
        {"title": "Activate the fault", "body": "$T$ is stuck at 0, so we need $T = 1$ in the good circuit: $X_3 = X_4 = 1$.", "scene": {"caption": "Input 1111 activates the fault: T = 1 in the good circuit."}},
        {"title": "Try to propagate through the NOR", "body": "The NOR's other input is $o$. A 1 is the controlling value of a NOR, so we need $o = 0$. But $o = n + X_4$, and activation already set $X_4 = 1$, so $o = 1$. The NOR outputs 0 whether $T$ is 1 or 0: the difference is blocked."},
        {"title": "Confirm with the Boolean difference", "body": "Force $T$: with $T = 0$, $f = \\overline{o}$; with $T = 1$, $f = 0$. So $\\partial f/\\partial T = \\overline{o} = X_1X_2X_3\\overline{X_4}$, which needs $X_4 = 0$, while activation needs $X_4 = 1$. No input satisfies both, so **no input detects the fault**."},
        {"title": "Check the options", "body": "On 0000, $T = X_3X_4 = 0$ already equals the stuck value, so the fault is not activated; $n = 1$, $o = 1$ and both circuits give $f = 0$. On 0111 and on 1111, $T = 1$ (activated) but $X_4 = 1$ makes $o = 1$, so good $f = \\overline{1 + 1} = 0$ and faulty $f = \\overline{1 + 0} = 0$. None of the three vectors gives different outputs."},
        {"title": "Why the fault is invisible", "body": "Tying $T$ to 0 gives $f = \\overline{o} = X_1X_2X_3\\overline{X_4}$, and the good circuit computes exactly the same function (whenever $T = 1$, $o$ is already 1). An undetectable fault always means a redundant line: the AND gate could be removed."},
    ],
    "answer": {"value": "(D) None of the above: $T$ stuck-at-0 cannot be detected by any input.", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "0000 gives $T = 0$ in the good circuit, which equals the stuck value: the fault is not activated (both outputs 0)."),
        opt("B", False, "0111 gives $T = 1$, but $X_4 = 1$ makes $o = 1$, which forces the NOR to 0 in both circuits."),
        opt("C", False, "1111 activates the fault ($T = 1$), which is why it looks right, but $o = 1$ blocks the NOR: good and faulty outputs are both 0."),
        opt("D", True, "Activation needs $X_4 = 1$ and propagation needs $X_4 = 0$; no input detects the fault."),
    ],
    "shortcut": "Activation of $T = X_3X_4$ needs $X_4 = 1$; the same $X_4$ is an input of the OR that feeds the NOR, and $X_4 = 1$ forces the NOR to 0. Conflict, so 'none of the above'.",
    "pitfalls": [
        "Picking 1111 (or 0111) because it sets $T = 1$: activation alone is not a test; the difference must also reach the output.",
        "Forgetting that $X_4$ drives both the AND and the OR, so the activating value also sets the side input.",
        "Assuming that every fault has some test: undetectable faults exist exactly on redundant lines.",
    ],
    "verification": "Fault simulation over all 16 inputs: the good output and the output with $T \\equiv 0$ are both $X_1X_2X_3\\overline{X_4}$ (1 only on 1110), so they never differ.",
    "animation": circuit("Input 1111: T is activated but blocked", [("X1", 1), ("X2", 1), ("X3", 1), ("X4", 1)],
                         [("n", "NAND", ["X1", "X2", "X3"]), ("o", "OR", ["n", "X4"]), ("T", "AND", ["X3", "X4"]), ("f", "NOR", ["o", "T"])], "f",
                         "T = 1 in the good circuit, but o = 1 holds the NOR at 0, with or without the fault."),
}
