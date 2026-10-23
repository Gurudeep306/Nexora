"""Truth Table Lab (Chapter 1 Live Lab) test vectors.

The lab's logic lives in client/src/gate/notes/labs/logicLogic.ts. This check computes, with logiclib,
what that module claims (variables, truth-table columns, classification, minterms/maxterms, equivalence
and implication between formulas, argument validity with critical and counterexample rows), writes
lab_vectors_ch1.json, and fails if the committed file is stale; tests/gate-notes-dm.test.js checks the
TypeScript against the same file.

    python3 content/gate-notes/_checks/dm/l1_lab_vectors.py --write
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import logiclib as L  # noqa: E402

OUT = pathlib.Path(__file__).parent / "lab_vectors_ch1.json"
OP = (True, True, False, True)
FORMULAS = [
    "(p -> q) & (q -> r)", "p -> q -> r", "(p -> q) -> r", "(X & ~Z) -> Y", "(~(p <-> q) & r) | (p & q & ~r)",
    "~(~A ⊙ B)", "~A ⊙ B", "(p -> q) <-> (~q -> ~p)", "((p -> q) -> p) -> p", "p & ~p", "p xor q xor r",
    "~p | q -> r", "a & b | c & d", "(a | b) & (c | d) -> e", "T -> F", "p <-> q <-> r",
    "\\neg p \\vee (p \\Rightarrow q)", "(P \\wedge Q) \\rightarrow R",
    # Edge cases: constants only (one row, no variables), a bare variable, five variables (32 rows),
    # precedence between ∨, ⊕, ⊙ and →, and the parity facts taught in the lesson.
    "T", "F", "T & ~F", "~T | F", "T -> F <-> F", "p", "~~p",
    "(a -> b) & (c | d) <-> e", "a xor b xor c xor d xor e", "p | q xor r", "p xor q | r", "p ⊙ q xor r", "~p ⊙ q -> r",
    "p & q -> r", "p & (q -> r)", "(p xor q xor r) & ~(p & q & r)", "p <-> q <-> r <-> s", "p \\to q",
]
PAIRS = [("p -> q", "~q -> ~p"), ("p -> q", "q -> p"), ("p & (p -> q)", "q"), ("p", "p | q"), ("p <-> q", "p -> ~q"),
         ("~(p & q)", "~p | ~q"), ("p & (q -> r)", "(p & q) -> (p & r)"), ("x xor y", "~(x <-> y)"),
         ("T", "p | ~p"), ("p <-> q <-> r", "p xor q xor r"), ("~p & ~q", "~(p & q)"), ("p & q -> r", "p & (q -> r)")]
ARGS = [(["p -> q", "~q"], "~p"), (["p -> q", "q"], "p"), (["p | q", "~p"], "q"), (["p -> q", "q -> r"], "p -> r"),
        (["p -> q", "~p"], "~q"), (["A", "A -> (B | C)", "B -> ~A"], "C"),
        (["p", "~p"], "q"), (["T"], "p | ~p"), (["p xor q", "q"], "~p")]


def case(src):
    e = L.parse(src, {"⊙": OP})
    vs = sorted(L.variables(e))
    col = [L.ev(e, r) for r in L.rows(vs)]
    shown = L.to_str(e)
    if e[0] not in ("var", "const", "not"):
        shown = shown[1:-1]  # the lab drops the outermost brackets
    ms, Ms = L.minterms(e, vs), L.maxterms(e, vs)
    return {"src": src, "vars": vs, "table": col, "kind": L.classify(e, vs), "minterms": ms, "maxterms": Ms,
            "dnf": L.dnf(ms, vs), "cnf": L.cnf(Ms, vs), "shown": shown}


def pair(a, b):
    ea, eb = L.parse(a), L.parse(b)
    vs = sorted(set(L.variables(ea)) | set(L.variables(eb)))
    ta, tb = [L.ev(ea, r) for r in L.rows(vs)], [L.ev(eb, r) for r in L.rows(vs)]
    return {"a": a, "b": b, "vars": vs, "equivalent": L.equivalent(a, b), "aImpliesB": L.implies(a, b), "bImpliesA": L.implies(b, a),
            "differ": [i for i in range(len(ta)) if ta[i] != tb[i]]}


def arg(ps, c):
    pe = [L.parse(p) for p in ps]
    ce = L.parse(c)
    vs = sorted(set().union(*[set(L.variables(p)) for p in pe], set(L.variables(ce))))
    rs = list(L.rows(vs))
    crit = [i for i, r in enumerate(rs) if all(L.ev(p, r) for p in pe)]
    counter = [i for i in crit if not L.ev(ce, rs[i])]
    assert (not counter) == L.valid_argument(ps, c)[0]
    return {"premises": ps, "conclusion": c, "vars": vs, "critical": crit, "counter": counter, "valid": not counter}


VEC = {"op": list(OP), "cases": [case(f) for f in FORMULAS], "pairs": [pair(a, b) for a, b in PAIRS], "args": [arg(p, c) for p, c in ARGS]}
text = json.dumps(VEC, indent=1, ensure_ascii=False) + "\n"
if "--write" in sys.argv:
    OUT.write_text(text)
assert OUT.exists() and OUT.read_text() == text, "lab_vectors_ch1.json is stale: run with --write"
print(f"l1_lab_vectors: {len(VEC['cases'])} formulas, {len(VEC['pairs'])} pairs, {len(VEC['args'])} arguments")
