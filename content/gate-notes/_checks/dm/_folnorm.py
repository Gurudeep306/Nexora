"""Shared by the Chapter 2 checks: turn a PYQ option's LaTeX into predlib syntax."""
import re


def norm(s):
    """PYQ option text (LaTeX) → predlib syntax."""
    s = s.replace("$", "")
    s = re.sub(r"\\(?:text|mathit|mathrm|operatorname)\{([^{}]*)\}", r"\1", s)
    s = re.sub(r"\\(forall|exists)\s*\(\s*(\w+)\s*\)", r"\\\1 \2", s)
    # "∀x: body" (colon notation) scopes over everything after the colon.
    s = re.sub(r"(\\forall|\\exists|∀|∃)\s*(\w+)\s*:\\?\s*(.*)$", r"\1 \2 (\3)", s)
    s = s.replace("\\{", "(").replace("\\}", ")").replace(":", " ")
    s = re.sub(r"\\ne(?![a-zA-Z])", "!=", s)
    s = re.sub(r"noteq\((\w+),\s*(\w+)\)", r"(\1 != \2)", s)
    # predlib reads a bare T / F as a constant: rename predicates called T(…) or F(…).
    s = re.sub(r"\b([TF])\(", r"\1_(", s)
    return s
