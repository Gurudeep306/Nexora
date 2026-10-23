"""Quantifier Lab (Chapter 2 Live Lab) test vectors.

The lab's logic lives in client/src/gate/notes/labs/predLogic.ts. This check computes, with predlib, the
value of formulas on fixed finite interpretations and the first counter-model / model found by the
exhaustive search (same enumeration order), writes lab_vectors_ch2.json, and fails if the committed
file is stale; tests/gate-notes-dm.test.js checks the TypeScript against it.

    python3 content/gate-notes/_checks/dm/l2_lab_vectors.py --write
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import predlib as P  # noqa: E402

OUT = pathlib.Path(__file__).parent / "lab_vectors_ch2.json"
WORLDS = [
    (3, {"P": {(0,), (1,)}, "Q": {(1,)}, "R": {(0, 1), (1, 2), (2, 0)}}),
    (2, {"P": set(), "Q": {(0,), (1,)}, "R": {(0, 0), (1, 0)}}),
    (4, {"P": {(0,), (2,)}, "Q": {(2,)}, "R": {(i, j) for i in range(4) for j in range(4) if i < j}}),
]
FORMULAS = [
    "forall x exists y R(x, y)", "exists y forall x R(x, y)", "forall x (P(x) -> Q(x))", "exists x (P(x) & Q(x))",
    "exists x (P(x) & forall y (P(y) -> y = x))", "∃!x Q(x)", "¬∀x P(x) ↔ ∃x ¬P(x)", "(∀x)(P(x) ∨ Q(x))",
    "forall x forall y (R(x, y) -> ~R(y, x))", "exists x forall y (x != y -> R(x, y))", r"\forall x \exists y (R(x,y) \wedge P(y))",
]
SEARCH = [
    "forall x P(x) -> exists x P(x)", "(exists x forall y R(x, y)) -> (forall y exists x R(x, y))",
    "(forall y exists x R(x, y)) -> (exists x forall y R(x, y))", "(forall x (P(x) | Q(x))) -> ((forall x P(x)) | (forall x Q(x)))",
    "(exists x (P(x) & Q(x))) -> ((exists x P(x)) & (exists x Q(x)))", "((exists x P(x)) & (exists x Q(x))) -> exists x (P(x) & Q(x))",
    "forall x ~(x = x)", "exists x forall y (R(x, y) <-> ~R(y, y))", "forall x exists y (x != y)",
]


def enc(I):
    return {k: sorted(",".join(map(str, t)) for t in v) for k, v in sorted(I.items())}


def found(x, want):
    r = P.counter_model(x) if not want else P.model(x)
    return None if r is None else {"n": len(r[0]), "interp": enc(r[1])}


VEC = {
    "worlds": [{"n": n, "interp": enc(I)} for n, I in WORLDS],
    "evals": [{"src": f, "values": [P.holds(f, list(range(n)), I) for n, I in WORLDS],
               "preds": P.predicates(P.parse(f))} for f in FORMULAS],
    "search": [{"src": f, "counter": found(f, False), "model": found(f, True)} for f in SEARCH],
}
text = json.dumps(VEC, indent=1, ensure_ascii=False) + "\n"
if "--write" in sys.argv:
    OUT.write_text(text)
assert OUT.exists() and OUT.read_text() == text, "lab_vectors_ch2.json is stale: run with --write"
print(f"l2_lab_vectors: {len(FORMULAS)} formulas on {len(WORLDS)} worlds, {len(SEARCH)} model searches")
