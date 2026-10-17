"""Checks for dl/02-boolean-algebra-gates/01-logic-gates: the seven gate tables, the sixteen
two-input functions table (parsed from the lesson and re-evaluated), tied/constant inputs, the
NAND/NOR chains, positive vs negative logic, every worked example, the PYQ key (cse-1999-a-7)
and the practice answers. Everything is decided by truth-table enumeration."""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402

L = bl.lesson_text("01-logic-gates.md")
has = lambda *s: bl.must_contain(L, *s)
AB, ABC = ["A", "B"], ["A", "B", "C"]
col = lambda e, v=AB: "".join(map(str, bl.tt(e, v)))

# The seven gates and the vocabulary line.
gates = {"AND": "AB", "OR": "A + B", "NAND": "(AB)'", "NOR": "(A + B)'", "XOR": "A \\oplus B", "XNOR": "A \\odot B"}
cols = {k: col(e) for k, e in gates.items()}
assert cols == {"AND": "0001", "OR": "0111", "NAND": "1110", "NOR": "1000", "XOR": "0110", "XNOR": "1001"}
has("**0001 is AND, 0111 is OR, 1110 is NAND, 1000 is NOR,\n0110 is XOR, 1001 is XNOR.**")
assert col("A'B + AB'") == cols["XOR"] and col("AB + A'B'") == cols["XNOR"]
for name, c in [("AND", "0001"), ("OR", "0111"), ("NAND", "1110"), ("NOR", "1000"), ("XOR", "0110"), ("XNOR", "1001")]:
    assert re.search(rf"\| {name} \| .* \| {c} \|", L), f"summary row for {name}"

# Sixteen functions: parse every row of the table and re-evaluate its expression.
sec = L.split(':::table{#sixteen-functions')[1].split("\n:::")[0]
rows16 = re.findall(r"^\| (\d{4}) \| \$(.+?)\$ \| (.+?) \|$", sec, re.M)
assert len(rows16) == 16
assert sorted(c for c, _, _ in rows16) == [f"{k:04b}" for k in range(16)]
for c, expr, name in rows16:
    assert col(expr) == c, (c, expr, name)
assert sum(1 for t in bl.all_functions(2)) == 16 == 2 ** 4

# Tied and constant inputs table.
x = ["x"]
ops = {"AND": lambda a, b: a & b, "OR": lambda a, b: a | b, "NAND": lambda a, b: 1 - (a & b),
       "NOR": lambda a, b: 1 - (a | b), "XOR": lambda a, b: a ^ b, "XNOR": lambda a, b: 1 - (a ^ b)}
name_of = {(0, 1): "$x$", (1, 0): "$x'$", (0, 0): "0", (1, 1): "1"}
tie = L.split(":::definition{#tie-inputs")[1].split("\n:::")[0]
for g, f in ops.items():
    want = [name_of[(f(0, 0), f(1, 1))], name_of[(f(0, 0), f(1, 0))], name_of[(f(0, 1), f(1, 1))]]
    assert f"| {g} | {want[0]} | {want[1]} | {want[2]} |" in tie, (g, want)
assert ops["NOR"](0, 1) == ops["NOR"](1, 1) == 0 and ops["NAND"](0, 1) == 1 and ops["NAND"](1, 1) == 0
# The inverter trick: each listed form equals x'.
for e in ["x \\uparrow x", "x \\uparrow 1", "x \\downarrow x", "x \\downarrow 0", "x \\oplus 1", "x \\odot 0"]:
    assert bl.tt(e, x) == (1, 0), e
assert bl.tt("x \\downarrow 1", x) == (0, 0) and bl.tt("x \\uparrow 0", x) == (1, 1)

# Worked examples: evaluating gates.
A, B, C = 1, 0, 1
assert (A & B & C, A | B | C, 1 - (A & B & C), 1 - (A | B | C)) == (0, 1, 1, 0)
w1, w2 = 0b1011, 0b0110
assert (f"{~(w1 & w2) & 15:04b}", f"{~(w1 | w2) & 15:04b}", f"{w1 ^ w2:04b}") == ("1101", "0000", "1101")
has("NAND: only the third column is $(1,1)$, so the result is $1101$.", "NOR: $0000$.", "XOR: the columns differ in positions 1, 2 and 4, so the result is $1101$.")
assert bl.tt("x x'", x) == (0, 0) and bl.tt("x \\odot 1", x) == (0, 1)
bits4 = (1, 1, 0, 1)
assert sum(bits4) % 2 == 1 and ((1 ^ 1) ^ 0) ^ 1 == 1

# Identifying gates.
assert col("A' + B") == "1101" and col("A + B'") == "1011"
phys = {(0, 0): 1, (0, 1): 1, (1, 0): 1, (1, 1): 0}  # H = 1: the datasheet table H, H, H, L
neg = {(1 - a, 1 - b): 1 - v for (a, b), v in phys.items()}
assert "".join(str(neg[k]) for k in sorted(neg)) == "1000"
has("Rows 00, 01, 10, 11 give 1, 0, 0, 0: a NOR.")

# Multi-input: the NAND and NOR chains.
assert bl.equal("(((AB)')C)'", "AB + C'", ABC) and not bl.equal("(((AB)')C)'", "(ABC)'", ABC)
assert bl.ev(bl.parse("(((AB)')C)'"), {"A": 0, "B": 0, "C": 1}) == 0 and bl.ev(bl.parse("(ABC)'"), {"A": 0, "B": 0, "C": 1}) == 1
assert bl.equal("((A + B)' + C)'", "(A + B)C'", ABC) and not bl.equal("((A + B)' + C)'", "(A + B + C)'", ABC)
assert bl.equal("(((AB)')' C)'", "(ABC)'", ABC)  # the correct 3-gate build
has("\\text{NAND}(\\text{NAND}(A, B), C) = \\big((AB)' \\cdot C\\big)' = AB + C' .", "$\\text{NOR}(\\text{NOR}(A, B), C) = (A + B)C'$")

# De Morgan in gate form and the logic-duality theorem.
assert bl.equal("(AB)'", "A' + B'", AB) and bl.equal("(A + B)'", "A'B'", AB)
for f, d in [("AB", "A + B"), ("(AB)'", "(A + B)'"), ("A \\oplus B", "A \\odot B")]:
    assert bl.dual_tt(bl.tt(f, AB)) == bl.tt(d, AB) and bl.dual_tt(bl.tt(d, AB)) == bl.tt(f, AB)
assert bl.tt("(A' + B')'", AB) == bl.tt("AB", AB) and bl.tt("P'' + Q''", ["P", "Q"]) == bl.tt("P + Q", ["P", "Q"])
# Bubble examples.
assert bl.equal("A'B'", "(A + B)'", AB)
assert bl.equal("((A' + B')')'", "(AB)'", AB)  # negative-logic NOR = NAND
assert bl.dual_tt(bl.tt("(A + B)'", AB)) == bl.tt("(AB)'", AB)

# Reading circuits.
assert bl.tt("(AB)'(B + C)", ABC) == tuple(int((1 - (a & b)) & (b | c)) for a in (0, 1) for b in (0, 1) for c in (0, 1))
assert (lambda a, b, c: (1 - (a & b)) & (b | c))(0, 1, 0) == 1 and (lambda a, b, c: (1 - (a & b)) & (b | c))(1, 1, 0) == 0
assert ((1 - (1 & 1)) | 0) == 0
g1 = bl.tt("(A + B)'", AB)
assert g1 == (1, 0, 0, 0) and tuple(a ^ b for a, b in zip(g1, (0, 0, 1, 1))) == (1, 0, 1, 1) == bl.tt("A + B'", AB)
assert bl.ev(bl.parse("AB + C'D"), {"A": 0, "B": 1, "C": 0, "D": 1}) == 1
assert bl.equal("A(A + B)", "A", AB) and not bl.depends_on(bl.tt("A(A + B)", AB), 1)

# PYQ key: cse-1999-a-7, every option evaluated.
q = bl.bank()["cse-1999-a-7"]
opts = {"A": "x \\uparrow x", "B": "x \\downarrow x", "C": "x \\uparrow 1", "D": "x \\downarrow 1"}
assert [o["t"] for o in q["options"]] == ["$x$ NAND $x$", "$x$ NOR $x$", "$x$ NAND 1", "$x$ NOR 1"]
not_equiv = [k for k, e in opts.items() if bl.tt(e, x) != (1, 0)]
assert not_equiv == ["D"] == [q["answer"]]

# Practice.
P = bl.practice()
bl.assert_mcq(P["nx-dl-02-01-q01"], {"NAND": "A", "NOR": "B", "XNOR": "C", "AND": "D"}[[k for k, c in cols.items() if c == "1000"][0]])
bl.assert_nat(P["nx-dl-02-01-q02"], sum(bl.tt("(A + B + C + D)'", ["A", "B", "C", "D"])))
q3 = {"A": "x \\uparrow 1", "B": "x \\oplus 1", "C": "x \\downarrow x", "D": "x \\odot 1"}
bl.assert_msq(P["nx-dl-02-01-q03"], [k for k, e in q3.items() if bl.tt(e, x) == (1, 0)])
q4 = {"A": "A \\oplus B", "B": "A \\odot B", "C": "(AB)'", "D": "A + B"}
bl.assert_mcq(P["nx-dl-02-01-q04"], [k for k, e in q4.items() if bl.tt(e, AB) == bl.dual_tt(bl.tt("A \\oplus B", AB))][0])
bl.assert_nat(P["nx-dl-02-01-q05"], sum(1 for t in bl.all_functions(2) if t[1] == t[2]))
q6 = {"A": "(ABC)'", "B": "AB + C'", "C": "A' + B' + C", "D": "(AB)'C"}
bl.assert_mcq(P["nx-dl-02-01-q06"], [k for k, e in q6.items() if bl.equal(e, "(((AB)')C)'", ABC)][0])
q7 = {"A": bl.equal("A'B'", "(A + B)'", AB), "B": bl.equal("x''", "x", x), "C": bl.equal("(A' + B')'", "AB", AB),
      "D": bl.tt("(x 0)'", x) == (1, 0)}
bl.assert_msq(P["nx-dl-02-01-q07"], [k for k, v in q7.items() if v])
bl.assert_nat(P["nx-dl-02-01-q08"], sum(bl.tt("(AB)' + (B + C)'", ABC)))
assert bl.equal("(AB)' + (B + C)'", "A' + B'", ABC) and bl.minterms("(AB)' + (B + C)'", ABC) == [0, 1, 2, 3, 4, 5]
xc = ["x", "c"]
xor = bl.tt("x \\oplus c", xc)
behaviour = {"A": xor == bl.tt("c x + c'x'", xc), "B": xor == bl.tt("c'x + c x'", xc),
             "C": all(bl.ev(bl.parse("x \\oplus c"), {"x": v, "c": 1}) == 0 for v in (0, 1)),
             "D": all(bl.ev(bl.parse("x \\oplus c"), {"x": v, "c": 1}) == 1 for v in (0, 1))}
bl.assert_mcq(P["nx-dl-02-01-q09"], [k for k, v in behaviour.items() if v][0])
assert sorted(k for k in P if k.startswith("nx-dl-02-01-")) == [f"nx-dl-02-01-q{i:02d}" for i in range(1, 10)]

print("l2_01_logic_gates: every table, example, the PYQ key and the practice answers check out")
