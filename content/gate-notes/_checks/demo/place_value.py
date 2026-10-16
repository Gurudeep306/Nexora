"""Checks for demo/01-number-systems/01-place-value (lesson worked values and practice answers)."""
import json
import pathlib

from sympy import Integer, Rational

ROOT = pathlib.Path.cwd()
CHAPTER = ROOT / "content" / "gate-notes" / "demo" / "01-number-systems"


def value(numeral: str, base: int) -> Rational:
    """Exact value of a numeral with an optional radix point, e.g. value('1011.01', 2)."""
    whole, _, frac = numeral.upper().partition(".")
    digit = lambda ch: int(ch, 36)
    for ch in whole + frac:
        assert digit(ch) < base, f"digit {ch} is not valid in base {base}"
    n = Integer(0)
    for ch in whole:
        n = n * base + digit(ch)
    for i, ch in enumerate(frac, start=1):
        n += Rational(digit(ch), base**i)
    return n


# Worked values in the lesson text, the viz and the table.
assert value("1011", 2) == 11
assert value("257", 8) == 175
assert value("110", 2) == 6
assert value("13", 8) == value("B", 16) == 11
# "If (31)_b = 16 then b = 5": the only base that works.
assert [b for b in range(4, 37) if value("31", b) == 16] == [5]
# The double-and-add trace 0 → 1 → 2 → 5 → 11.
trace, t = [0], 0
for bit in "1011":
    t = 2 * t + int(bit)
    trace.append(t)
assert trace == [0, 1, 2, 5, 11]

# Practice answers match the computed values.
practice = {q["id"]: q for q in json.loads((CHAPTER / "practice.json").read_text())}
q1 = practice["nx-demo-01-01-q01"]
assert Rational(str(q1["answer"])) == value("1011.01", 2) == Rational(45, 4)
for wrong in q1["common_wrong"]:
    assert Rational(str(wrong["answer"])) != value("1011.01", 2)

q2 = practice["nx-demo-01-01-q02"]
options = {o["l"]: int(o["t"].strip("$")) for o in q2["options"]}
assert options[q2["answer"]] == value("2D", 16) == 45
assert [l for l, v in options.items() if v == 45] == [q2["answer"]], "exactly one option is correct"

# The PYQ embedded in the lesson: 132 in radix 4 written in radix 5.
assert value("132", 4) == value("110", 5) == 30

print("demo/place-value: all values check out")
