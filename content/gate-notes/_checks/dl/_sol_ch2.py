"""Teacher-style v2 solutions for the 64 PYQs of Digital Logic Chapter 2 (Boolean algebra and gates).

This file is the source; `python3 content/gate-notes/_checks/dl/_sol_ch2.py` writes each solution
into src/gate/solutions/<paper>.json (the v2 solutions pipeline), and pyq_ch2.py plus
scripts/gate/validate-solutions.mjs check the result. Every key is re-derived from scratch by
truth-table enumeration (or exhaustive search) in the lesson checks l2_01 … l2_06.

Each solution names the concept tested, works the steps, explains every option, adds a shortcut
or verification and lists the pitfalls.
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _sol_ch1_fp import ROOT, opt  # noqa: E402

SOLUTIONS = {}

# ── Lesson 1: logic gates ───────────────────────────────────────────────────

SOLUTIONS["cse-1999-a-7"] = {
    "approach": "Concept tested: **gates with tied or constant inputs** and **controlling values**. Evaluate each option for $x = 0$ and $x = 1$ (two rows decide everything) and look for the one that is not $\\overline{x}$.",
    "concepts": ["NAND and NOR", "Controlling values", "Tied inputs"],
    "steps": [
        {"title": "Tie both inputs", "body": "$x$ NAND $x = \\overline{x \\cdot x} = \\overline{x}$ and $x$ NOR $x = \\overline{x + x} = \\overline{x}$: an AND or OR of a signal with itself is the signal, and the output bubble inverts it."},
        {"title": "Feed a non-controlling constant", "body": "1 does not control AND ($x \\cdot 1 = x$), so $x$ NAND $1 = \\overline{x \\cdot 1} = \\overline{x}$."},
        {"title": "Feed a controlling constant", "body": "1 controls OR ($x + 1 = 1$), so $x$ NOR $1 = \\overline{x + 1} = \\overline{1} = 0$ for **both** values of $x$. It is the constant 0, not $\\overline{x}$."},
        {"title": "Conclusion", "body": "Only option (D) is not equivalent to $\\overline{x}$."},
    ],
    "answer": {"value": "(D) $x$ NOR 1", "choice": ["D"], "matchesKey": True},
    "optionAnalysis": [
        opt("A", False, "$\\overline{x \\cdot x} = \\overline{x}$: tying a NAND's inputs makes an inverter."),
        opt("B", False, "$\\overline{x + x} = \\overline{x}$: tying a NOR's inputs makes an inverter."),
        opt("C", False, "$\\overline{x \\cdot 1} = \\overline{x}$: 1 is the non-controlling value of NAND, so the gate inverts $x$."),
        opt("D", True, "$\\overline{x + 1} = 0$: 1 is the controlling value of NOR, so the output is stuck at 0."),
    ],
    "shortcut": "An inverting gate fed its **controlling** value gives a constant (NOR with 1 → 0, NAND with 0 → 1); fed the **non-controlling** value or its own input twice, it gives $\\overline{x}$.",
    "pitfalls": ["Thinking 'NOR inverts, so x NOR 1 = x̄': the 1 forces the OR part to 1 first.", "Confusing x NOR 1 with x NOR 0, which is the inverter."],
    "verification": "Two-row table: for $x = 0, 1$ options (A)–(C) give $1, 0$; option (D) gives $0, 0$.",
}


def write():
    bank = {q["id"]: q for q in json.loads((ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}
    by_paper = {}
    for qid, sol in SOLUTIONS.items():
        by_paper.setdefault(bank[qid]["paper"], {})[qid] = sol
    for paper, sols in sorted(by_paper.items()):
        p = ROOT / "src" / "gate" / "solutions" / f"{paper}.json"
        d = json.loads(p.read_text())
        for qid, sol in sols.items():
            sol = dict(sol)
            keep = sol.pop("_keep_animation", False)
            if keep and "animation" not in sol and d["solutions"].get(qid, {}).get("animation"):
                sol["animation"] = d["solutions"][qid]["animation"]
            d["solutions"][qid] = sol
        p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
        print(f"{paper}: {', '.join(sorted(sols))}")


if __name__ == "__main__":
    write()
