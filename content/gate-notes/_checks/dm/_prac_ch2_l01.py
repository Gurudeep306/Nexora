"""Practice questions for dm/02-predicate-logic/01-predicates-quantifiers (our own; never a PYQ's
wording). Writes them into 02-predicate-logic/practice.json; every answer is re-derived in
l2_01_quantifiers.py.

    python3 content/gate-notes/_checks/dm/_prac_ch2_l01.py
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib  # noqa: E402


def q(i, typ, marks, text_, answer, solution, concept, wrong, blocks, options=None):
    d = {"id": f"nx-dm-02-01-q{i:02d}", "type": typ, "marks": marks, "text": text_}
    if options:
        d["options"] = [{"l": l, "t": t} for l, t in zip("ABCD", options)]
    d.update({"answer": answer, "solution": solution, "concept": concept,
              "common_wrong": [{"answer": a, "why": w} for a, w in wrong], "blocks": blocks, "source": "nexora"})
    return d


QS = [
    q(1, "MCQ", 1, "With $E(x)$: $x$ is an engineer and $K(x)$: $x$ knows Python, which formula says **“every engineer knows Python”**?", "B",
      ["“Every engineer” is a universal over a restricted noun, so the restriction becomes the hypothesis of $\\to$.",
       "$\\forall x\\, (E(x) \\to K(x))$: for each $x$, if $x$ is an engineer then $x$ knows Python.",
       "Non-engineers keep the promise vacuously, exactly as the English intends."],
      "∀ pairs with →.", [("A", "$\\forall x\\, (E \\wedge K)$ claims everyone is an engineer who knows Python."),
                          ("C", "That is “some engineer knows Python”."), ("D", "$\\exists x\\, (E \\to K)$ is true as soon as one non-engineer exists.")],
      ["four-forms", "pairing-theorem"],
      ["$\\forall x\\, (E(x) \\wedge K(x))$", "$\\forall x\\, (E(x) \\to K(x))$", "$\\exists x\\, (E(x) \\wedge K(x))$", "$\\exists x\\, (E(x) \\to K(x))$"]),
    q(2, "MCQ", 1, "With $F(x)$: $x$ is a fruit and $S(x)$: $x$ is sour, which formula says **“some fruit is sour”**?", "C",
      ["“Some fruit” is an existential over a restricted noun: the restriction is joined with $\\wedge$.",
       "$\\exists x\\, (F(x) \\wedge S(x))$: one object that is a fruit and sour, both at once."],
      "∃ pairs with ∧.", [("A", "$\\exists x\\, (F \\to S)$ is made true by any non-fruit."), ("B", "That is “every fruit is sour”."),
                          ("D", "$\\forall x\\, (F \\wedge S)$ says everything is a sour fruit.")],
      ["four-forms", "trap-exists-imp"],
      ["$\\exists x\\, (F(x) \\to S(x))$", "$\\forall x\\, (F(x) \\to S(x))$", "$\\exists x\\, (F(x) \\wedge S(x))$", "$\\forall x\\, (F(x) \\wedge S(x))$"]),
    q(3, "NAT", 1, "The domain is $\\{1, 2, 3, 4, 5, 6\\}$ and $y \\mid x$ means $y$ divides $x$. For how many $x$ in the domain is $\\exists y\\, (y \\mid x \\wedge 1 < y \\wedge y < x)$ true?", 2,
      ["The formula says $x$ has a divisor strictly between 1 and $x$, i.e. $x$ is composite (with the divisor inside the domain).",
       "1, 2, 3 and 5 have no such divisor. 4 has $y = 2$; 6 has $y = 2$ (and 3).", "So the formula is true for $x = 4$ and $x = 6$."],
      "Read a number-theory formula back into its textbook meaning, then test each element.",
      [(3, "Counting 1 as composite: 1 has no divisor strictly between 1 and 1."), (4, "Counting the primes instead of the composites.")],
      ["prime-def", "quantifier-def"]),
    q(4, "MSQ", 2, "Which formulas are equivalent to $\\neg\\forall x\\, (P(x) \\to Q(x))$? (Select all that apply.)", ["A", "C"],
      ["Push the negation through: $\\neg\\forall x\\, \\varphi \\equiv \\exists x\\, \\neg\\varphi$.",
       "$\\neg(P \\to Q) \\equiv P \\wedge \\neg Q$, so the formula is $\\exists x\\, (P(x) \\wedge \\neg Q(x))$: option A.",
       "Option C: $P \\to Q \\equiv \\neg P \\vee Q$, so $\\exists x\\, \\neg(\\neg P(x) \\vee Q(x))$ is the same formula.",
       "B and D keep a $\\forall$: they are much stronger claims."],
      "¬∀ = ∃¬, and ¬(A → B) = A ∧ ¬B.", [("B", "Keeps $\\forall$ and negates only the conclusion: “no $P$ is a $Q$”."),
                                         ("D", "$\\forall x\\, (\\neg P \\vee \\neg Q)$ is “nothing is both $P$ and $Q$”.")],
      ["qdm-theorem", "deriv-push", "trap-half-push"],
      ["$\\exists x\\, (P(x) \\wedge \\neg Q(x))$", "$\\forall x\\, (P(x) \\to \\neg Q(x))$", "$\\exists x\\, \\neg(\\neg P(x) \\vee Q(x))$", "$\\forall x\\, (\\neg P(x) \\vee \\neg Q(x))$"]),
    q(5, "MCQ", 1, "Which is the negation of $\\forall x\\, \\exists y\\, (x + y = 0)$?", "D",
      ["Flip each quantifier, keeping the order $x, y$: $\\exists x\\, \\forall y$.", "Negate the matrix: $x + y \\ne 0$.",
       "Result: $\\exists x\\, \\forall y\\, (x + y \\ne 0)$."],
      "Negation flips every quantifier and keeps their order.",
      [("A", "Flips the order of the variables as well; the order never changes."), ("B", "Flips the quantifiers but leaves the matrix un-negated."),
       ("C", "Negates only the matrix.")],
      ["deriv-push", "trick-neg-check"],
      ["$\\exists y\\, \\forall x\\, (x + y \\ne 0)$", "$\\exists x\\, \\forall y\\, (x + y = 0)$", "$\\forall x\\, \\exists y\\, (x + y \\ne 0)$", "$\\exists x\\, \\forall y\\, (x + y \\ne 0)$"]),
    q(6, "NAT", 2, "On the domain $\\{a, b, c\\}$, $R$ holds exactly for $(a, a), (a, b), (a, c), (b, c), (c, c)$. How many of these six sentences are true: $\\forall x \\forall y R$, $\\exists x \\exists y R$, $\\forall x \\exists y R$, $\\exists x \\forall y R$, $\\forall y \\exists x R$, $\\exists y \\forall x R$ (each with matrix $R(x, y)$)?", 5,
      ["Draw the grid: row $a$ is T T T, row $b$ is F F T, row $c$ is F F T.",
       "$\\forall\\forall$: F (cell $(b, a)$). $\\exists\\exists$: T. $\\forall x \\exists y$: every row has a T: T. $\\exists x \\forall y$: row $a$ is full: T.",
       "$\\forall y \\exists x$: every column has a T (row $a$ is full): T. $\\exists y \\forall x$: column $c$ is full: T.",
       "Five of the six are true."],
      "Read ∀x∃y along rows, ∃x∀y as a full row, ∀y∃x along columns, ∃y∀x as a full column.",
      [(4, "Missing that column $c$ is full, so $\\exists y\\, \\forall x$ is true."), (6, "Forgetting that $\\forall\\forall$ needs every cell.")],
      ["grid-reading", "nested-def"]),
    q(7, "MCQ", 1, "With $G(x)$: $x$ is a graduate and $E(x)$: $x$ is eligible, which formula says **“only graduates are eligible”**?", "A",
      ["“Only graduates” restricts who can be eligible: anyone eligible must be a graduate.",
       "So: for every $x$, if $x$ is eligible then $x$ is a graduate, $\\forall x\\, (E(x) \\to G(x))$."],
      "“Only A are B” = ∀x (B → A): the arrow reverses.",
      [("B", "That is “all graduates are eligible”, a different claim."), ("C", "That only says some eligible graduate exists."),
       ("D", "Says everyone is an eligible graduate.")],
      ["four-forms", "ex-tr-only"],
      ["$\\forall x\\, (E(x) \\to G(x))$", "$\\forall x\\, (G(x) \\to E(x))$", "$\\exists x\\, (E(x) \\wedge G(x))$", "$\\forall x\\, (G(x) \\wedge E(x))$"]),
    q(8, "MSQ", 2, "Which formulas say that **exactly one** element has property $P$? (Select all that apply.)", ["A", "B"],
      ["Option A is the standard form: some $x$ has $P$, and every $y$ with $P$ equals $x$.",
       "Option B is “at least one” ∧ “at most one”, the same meaning.",
       "Option C alone is true when **no** element has $P$; option D says at least two."],
      "Exactly one = at least one + at most one.",
      [("C", "“At most one”: it is true when nothing has $P$."), ("D", "That is “at least two”.")],
      ["unique-def", "counting-table", "trap-unique-missing"],
      ["$\\exists x\\, (P(x) \\wedge \\forall y\\, (P(y) \\to y = x))$", "$\\exists x\\, P(x) \\wedge \\forall x\\, \\forall y\\, ((P(x) \\wedge P(y)) \\to x = y)$",
       "$\\forall x\\, \\forall y\\, ((P(x) \\wedge P(y)) \\to x = y)$", "$\\exists x\\, \\exists y\\, (x \\ne y \\wedge P(x) \\wedge P(y))$"]),
    q(9, "MCQ", 2, "Over the integers $\\mathbb{Z}$, which sentence is **true**?", "B",
      ["B: for any $x$, take $y = x - 1$; then $y < x$. True.",
       "A: any candidate $y$ fails at $x = y$. C: any candidate $x$ fails at $y = x - 1$. D fails at $y = x$."],
      "∀∃ lets the witness depend on x; ∃∀ needs one witness for all.",
      [("A", "No integer exceeds every integer (it fails against itself)."), ("C", "$\\mathbb{Z}$ has no least element; on $\\mathbb{N}$ this would be true."),
       ("D", "Fails when $x = y$.")],
      ["ea-implies-ae", "ex-eval-gate"],
      ["$\\exists y\\, \\forall x\\, (x < y)$", "$\\forall x\\, \\exists y\\, (y < x)$", "$\\exists x\\, \\forall y\\, (x \\le y)$", "$\\forall x\\, \\forall y\\, (x < y \\vee y < x)$"]),
    q(10, "NAT", 2, "On the domain $\\{1, 2, 3\\}$ with the usual $>$, for how many of the $2^3$ choices of a unary predicate $P$ is $\\forall x\\, (P(x) \\to \\exists y\\, (y > x \\wedge P(y)))$ true?", 1,
      ["The sentence says: every element of $P$ has a larger element of $P$.",
       "If $P$ is non-empty, its largest element $m$ needs some $y > m$ in $P$, which is impossible.",
       "So only $P = \\varnothing$ works (vacuously). Answer: 1."],
      "A finite non-empty set has a largest element; ‘always a bigger one’ forces emptiness (or an infinite domain).",
      [(2, "Counting $P = \\{1, 2, 3\\}$, but its largest element 3 has nothing above it."), (0, "Forgetting that the empty predicate makes a ∀x (P(x) → …) vacuously true.")],
      ["quantifier-def", "nonempty-convention"]),
]

if __name__ == "__main__":
    print("practice.json now has", dmlib.put_practice(2, QS), "questions")
