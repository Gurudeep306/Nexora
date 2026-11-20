"""Practice questions for dm/02-predicate-logic/02-quantifier-laws-validity (our own; never a PYQ's
wording). Writes them into 02-predicate-logic/practice.json; every answer is re-derived in
l2_02_validity.py.

    python3 content/gate-notes/_checks/dm/_prac_ch2_l02.py
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib  # noqa: E402


def q(i, typ, marks, text_, answer, solution, concept, wrong, blocks, options=None):
    d = {"id": f"nx-dm-02-02-q{i:02d}", "type": typ, "marks": marks, "text": text_}
    if options:
        d["options"] = [{"l": l, "t": t} for l, t in zip("ABCD", options)]
    d.update({"answer": answer, "solution": solution, "concept": concept,
              "common_wrong": [{"answer": a, "why": w} for a, w in wrong], "blocks": blocks, "source": "nexora"})
    return d


QS = [
    q(1, "MCQ", 1, "Which formula is **valid**?", "C",
      ["C: if $P \\wedge Q$ holds for every $x$, then in particular $P$ holds for every $x$ (∀ distributes over ∧).",
       "A and B are the wrong directions of the one-way laws; D is the converse of a one-way law.",
       "The turn-taking world $D = \\{1, 2\\}$, $P = \\{1\\}$, $Q = \\{2\\}$ refutes A and B; $P = \\{1\\}$, $Q = \\varnothing$ refutes D."],
      "∀ distributes over ∧; ∀ over ∨ and ∃ over ∧ only go one way.",
      [("A", "∀ over ∨: fails when P and Q take turns."), ("B", "Two witnesses need not be one."),
       ("D", "When $\\forall x\\, P$ is false the hypothesis is vacuous, yet $P \\to Q$ can fail at one element.")],
      ["two-way-laws", "one-way-laws", "trick-two-elements"],
      ["$\\forall x\\, (P(x) \\vee Q(x)) \\to (\\forall x\\, P(x) \\vee \\forall x\\, Q(x))$", "$(\\exists x\\, P(x) \\wedge \\exists x\\, Q(x)) \\to \\exists x\\, (P(x) \\wedge Q(x))$",
       "$\\forall x\\, (P(x) \\wedge Q(x)) \\to \\forall x\\, P(x)$", "$(\\forall x\\, P(x) \\to \\forall x\\, Q(x)) \\to \\forall x\\, (P(x) \\to Q(x))$"]),
    q(2, "MCQ", 1, "Classify $\\exists x\\, P(x) \\wedge \\exists x\\, \\neg P(x)$.", "A",
      ["It is true on $D = \\{1, 2\\}$ with $P = \\{1\\}$ (witnesses 1 and 2): satisfiable.",
       "It is false on any world where $P$ holds everywhere: not valid.", "So it is satisfiable but not valid (contingent)."],
      "Satisfiable = some world; valid = every world.",
      [("B", "A world where P holds everywhere makes it false."), ("C", "The world {1, 2} with P = {1} satisfies it."),
       ("D", "No formula is both valid and unsatisfiable on a non-empty domain.")],
      ["valid-def", "duality-theorem"],
      ["Satisfiable but not valid", "Valid", "Unsatisfiable", "Both valid and unsatisfiable"]),
    q(3, "NAT", 2, "On the domain $\\{1, 2\\}$, unary predicates $P$ and $Q$ can be chosen in $4 \\times 4 = 16$ ways. In how many of these worlds is $\\forall x\\, (P(x) \\vee Q(x)) \\to (\\forall x\\, P(x) \\vee \\forall x\\, Q(x))$ **false**?", 2,
      ["The implication is false when $\\forall x\\, (P \\vee Q)$ is true and both $\\forall x\\, P$ and $\\forall x\\, Q$ are false.",
       "So $P \\cup Q = \\{1, 2\\}$ while $P \\ne \\{1, 2\\}$ and $Q \\ne \\{1, 2\\}$.", "That forces $\\{P, Q\\} = \\{\\{1\\}, \\{2\\}\\}$ in either order: 2 worlds."],
      "Count counter-models by translating ‘false’ into conditions on the sets.",
      [(1, "Forgetting the mirror world P = {2}, Q = {1}."), (4, "Also counting worlds where P or Q is all of {1, 2}, which make the conclusion true.")],
      ["one-way-laws", "trick-counter"]),
    q(4, "MSQ", 2, "$W$ is a sentence with no free $x$. Which formulas are equivalent to $\\forall x\\, (P(x) \\to W)$? (Select all that apply.)", ["A", "C", "D"],
      ["$P(x) \\to W \\equiv \\neg P(x) \\vee W$, so C is the same formula.",
       "Pull $\\forall x$ past $W$: $\\forall x\\, \\neg P(x) \\vee W \\equiv \\neg\\exists x\\, P(x) \\vee W \\equiv \\exists x\\, P(x) \\to W$: A.",
       "D: $\\neg\\exists x\\, (P(x) \\wedge \\neg W) \\equiv \\forall x\\, \\neg(P(x) \\wedge \\neg W) \\equiv \\forall x\\, (P(x) \\to W)$.",
       "B has $\\forall$ where $\\exists$ is needed."],
      "A quantifier leaving a hypothesis flips.", [("B", "The classic wrong pull-out (GATE 2020): it is much weaker.")],
      ["pull-laws", "trap-pull-flip"],
      ["$\\exists x\\, P(x) \\to W$", "$\\forall x\\, P(x) \\to W$", "$\\forall x\\, (\\neg P(x) \\vee W)$", "$\\neg\\exists x\\, (P(x) \\wedge \\neg W)$"]),
    q(5, "MCQ", 2, "Which is a prenex form of $\\exists x\\, P(x) \\to \\forall y\\, Q(y)$?", "B",
      ["$\\exists x$ sits in the hypothesis: pulling it out flips it to $\\forall x$.",
       "$\\forall y$ sits in the conclusion: it comes out unchanged.", "Result: $\\forall x\\, \\forall y\\, (P(x) \\to Q(y))$."],
      "Hypothesis quantifiers flip; conclusion quantifiers do not.",
      [("A", "Keeps ∃x although it left a hypothesis."), ("C", "Flips both quantifiers."), ("D", "Flips the wrong one.")],
      ["prenex-def", "pull-laws", "ex-pf-prenex"],
      ["$\\exists x\\, \\forall y\\, (P(x) \\to Q(y))$", "$\\forall x\\, \\forall y\\, (P(x) \\to Q(y))$", "$\\forall x\\, \\exists y\\, (P(x) \\to Q(y))$", "$\\exists x\\, \\exists y\\, (P(x) \\to Q(y))$"]),
    q(6, "NAT", 1, "What is the size of the smallest model of $\\exists x\\, \\exists y\\, \\exists z\\, (x \\ne y \\wedge y \\ne z \\wedge x \\ne z)$?", 3,
      ["The sentence asks for three pairwise different elements.", "A domain with 3 elements works; 2 cannot (two of $x, y, z$ would be equal)."],
      "Equality lets a sentence demand ‘at least n’ elements.",
      [(2, "With two elements, two of the three witnesses must coincide."), (1, "Forgetting that ≠ forces different elements.")],
      ["size-table", "ex-size-atmost"]),
    q(7, "MCQ", 2, "Which sentence has models, but **only infinite** ones?", "C",
      ["A and B have finite models: a 2-cycle $R = \\{(1, 2), (2, 1)\\}$ satisfies both.",
       "C adds transitivity: every chain of successors must be new forever (a cycle would give $R(x, x)$), so no finite model; $(\\mathbb{N}, <)$ is a model.",
       "D has the one-element model with $R = \\{(1, 1)\\}$."],
      "Serial + transitive + irreflexive forces an infinite chain.",
      [("A", "$R = \\{(1, 1)\\}$ is a one-element model."), ("B", "The 2-cycle on {1, 2} is a model."), ("D", "$R(1, 1)$ on {1} is a model.")],
      ["infinite-def", "proof-infinite"],
      ["$\\forall x\\, \\exists y\\, R(x, y)$", "$\\forall x\\, \\exists y\\, R(x, y) \\wedge \\forall x\\, \\neg R(x, x)$",
       "$\\forall x\\, \\exists y\\, R(x, y) \\wedge \\forall x\\, \\neg R(x, x) \\wedge \\forall x\\, \\forall y\\, \\forall z\\, ((R(x, y) \\wedge R(y, z)) \\to R(x, z))$", "$\\exists x\\, \\forall y\\, R(x, y)$"]),
    q(8, "MSQ", 2, "Which sentences are logically implied by $\\exists y\\, \\forall x\\, R(x, y)$? (Select all that apply.)", ["A", "B"],
      ["A: ∃∀ implies ∀∃: the single y works for every x.", "B: the domain is non-empty, so some pair is related.",
       "C: rows and columns: ‘every y is hit’ does not follow from ‘some column is full’.", "D: a full column is not a full grid."],
      "∃y∀x ⇒ ∀x∃y; ∃∀ says nothing about the other columns.",
      [("C", "$D = \\{1, 2\\}$, $R = \\{(1, 1), (2, 1)\\}$: column 1 is full but column 2 is empty."), ("D", "The same world: $R(1, 2)$ is false.")],
      ["one-way-laws", "ex-cls-implied"],
      ["$\\forall x\\, \\exists y\\, R(x, y)$", "$\\exists x\\, \\exists y\\, R(x, y)$", "$\\forall y\\, \\exists x\\, R(x, y)$", "$\\forall x\\, \\forall y\\, R(x, y)$"]),
    q(9, "MCQ", 2, "Which formula is **NOT** valid?", "D",
      ["A is valid on non-empty domains; B and C are rows of the one-way table.",
       "D is the converse of C: with $P = \\{1\\}$, $Q = \\{2\\}$ on $\\{1, 2\\}$, $\\exists x\\, P \\to \\exists x\\, Q$ is true but $P(1) \\to Q(1)$ is false."],
      "One-way laws: the converse of a valid law is the usual NOT-valid option.",
      [("A", "Valid: the non-empty domain supplies a witness."), ("B", "Valid: the witness of P ∧ Q is a witness of P."),
       ("C", "Valid: apply the promise to the witness of P.")],
      ["one-way-laws", "ex-pf-imp-exists"],
      ["$\\forall x\\, P(x) \\to \\exists x\\, P(x)$", "$\\exists x\\, (P(x) \\wedge Q(x)) \\to \\exists x\\, P(x)$",
       "$\\forall x\\, (P(x) \\to Q(x)) \\to (\\exists x\\, P(x) \\to \\exists x\\, Q(x))$", "$(\\exists x\\, P(x) \\to \\exists x\\, Q(x)) \\to \\forall x\\, (P(x) \\to Q(x))$"]),
    q(10, "NAT", 2, "How many of these five are valid? (i) $\\forall x\\, \\forall y\\, R(x, y) \\to \\forall x\\, R(x, x)$; (ii) $\\forall x\\, R(x, x) \\to \\forall x\\, \\forall y\\, R(x, y)$; (iii) $\\exists x\\, \\forall y\\, R(x, y) \\to \\forall y\\, \\exists x\\, R(x, y)$; (iv) $\\forall x\\, \\exists y\\, R(x, y) \\to \\exists y\\, \\forall x\\, R(x, y)$; (v) $\\exists x\\, (P(x) \\to \\forall y\\, P(y))$.", 3,
      ["(i) valid (instantiate $y = x$); (ii) not valid (a reflexive relation need not relate every pair).",
       "(iii) valid: the row $x$ that is full gives every column $y$ a T. (iv) not valid (Lesson 1's grid).",
       "(v) valid (the ‘drinker’ sentence): if $P$ holds everywhere, any $x$ works; if not, pick an $x$ with $\\neg P(x)$, which makes $P(x) \\to \\dots$ vacuously true.",
       "Total: 3."],
      "Prove the valid ones by take–unpack–build; refute the rest with small worlds.",
      [(2, "Missing (v): it looks paradoxical but is valid on non-empty domains."), (4, "Thinking (iv) holds: ∀∃ does not give ∃∀.")],
      ["one-way-laws", "ex-pf-instance", "proof-shape-intuition"]),
]

if __name__ == "__main__":
    print("practice.json now has", dmlib.put_practice(2, QS), "questions")
