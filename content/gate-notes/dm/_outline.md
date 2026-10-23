# Discrete Mathematics: master syllabus map (Checkpoint A, status: review)

Internal planning file (the build skips it). Produced by stage N1 of the GATE Notes build for
Discrete Mathematics. Reference sets are labelled A–E only. Nothing here is published.

## How this map was built
The map is the union of three sources:
1. **Official GATE CSE syllabus, Discrete Mathematics:** propositional and first-order logic; sets,
   relations, functions, partial orders and lattices; monoids and groups; graphs (connectivity,
   matching, colouring); combinatorics (counting, recurrence relations, generating functions). The
   syllabus lists no planarity, Euler/Hamilton or trees heading of its own, but 28 PYQs test them, so
   they get lessons. **Re-verify the wording against the official PDF before publishing.**
2. **Everything any reference set covers** (digests in `_digest/dm/`, internal; set map below).
3. **Everything the 392 dm PYQs test** (`src/gate/questions.json`, read with the v2 solutions'
   `concepts` fields). The assignment was made by `_checks/dm/_assign.py` and is enforced on this file
   by `_checks/dm/outline_pyq_assignment.py`.

**Ids:** planning id `dm-NN-MM-slug` ↔ file `NN-chapter/MM-slug.md`, frontmatter `id: slug` (slugs
unique across the subject; `trees` and `groups` are prefixed where they could clash with other
subjects' ids only inside this subject, which is all the pipeline requires). **Sets:** A–E
(internal): A pp. 4–155 (compact topic notes), B pp. 156–278 (notes plus revision sheets), C pp.
279–669 (the long set: logic, sets/relations/lattices, groups, four graph-theory parts, counting,
recurrences, generating functions), D pp. 670–728 (short typed sheet), E pp. 729–919 (counting-first,
problem-led). A lesson marked **GAP** is thin in every set and is written from textbooks (Rosen,
*Discrete Mathematics and its Applications*; Liu, *Elements of Discrete Mathematics*; West,
*Introduction to Graph Theory*; Gallian, *Contemporary Abstract Algebra*; Graham–Knuth–Patashnik,
*Concrete Mathematics*). **`pyq_topics`** use the questions.json `subject/topic` keys.

## Chapter overview
| # | Chapter | Folder | Lessons | PYQs | Est. time |
|---|---|---|---|---|---|
| 1 | Propositional logic | `01-propositional-logic` | 3 | 43 | 3 h 10 min |
| 2 | First-order logic | `02-predicate-logic` | 2 | 35 | 2 h 20 min |
| 3 | Sets, relations and functions | `03-sets-relations-functions` | 5 | 81 | 5 h 20 min |
| 4 | Partial orders and lattices | `04-posets-lattices` | 2 | 23 | 2 h 10 min |
| 5 | Algebraic structures | `05-algebraic-structures` | 4 | 47 | 3 h 50 min |
| 6 | Combinatorics | `06-combinatorics` | 6 | 52 | 6 h 00 min |
| 7 | Recurrences and generating functions | `07-recurrences` | 3 | 21 | 2 h 50 min |
| 8 | Graph theory | `08-graph-theory` | 8 | 90 | 7 h 40 min |
| | **Total** | | **33** | **392** | **33 h 10 min** |

Foundation-first order: logic first, because every later chapter states and proves things
(propositional logic → quantifiers) → sets, then relations and functions built on sets (and
equivalence relations, the bridge to partitions), with countability and proof techniques (induction)
closing the chapter → partial orders and lattices, which are special relations → algebraic structures,
which need functions (binary operations) and equivalence classes (cosets) → combinatorics, which uses
sets, functions (counting maps) and equivalence classes (dividing out symmetry) → recurrences and
generating functions, which need counting and induction → graph theory last, because it uses all of
them (relations as digraphs, counting graphs, induction on trees, colouring as functions, matching as
partitions).

PYQ-topic → chapter map (bank topic counts): `dm/logic` 78 → Ch 1–2; `dm/sets` 68 → Ch 3 (sets,
relations, equivalence, functions, countability); `dm/posets` 23 → Ch 4; `dm/groups` 47 → Ch 5;
`dm/combinatorics` 67 → Ch 6 (52), plus counting-of-functions/relations PYQs in Ch 3 (9), induction
proofs in Ch 3 (2), generating functions in Ch 7 (2), graph counting in Ch 8 (2); `dm/recurrences` 21 →
Ch 7 (16), Ch 6 sums (1: harmonic numbers), Ch 3 (1: induction); `dm/graphs` 88 → Ch 8.

Set map (where each set treats each chapter, PDF pages):

| Chapter | A | B | C | D | E |
|---|---|---|---|---|---|
| Propositional logic | 15–25 | 157–167, 250–254 | 280–328 | 671–675 | 773–797 |
| First-order logic | 26–43 | 168–177 | 296–318 | 676–681 | — |
| Sets, relations, functions | 7–14, 44–52 | 178–196, 255–262 | 329–375, 394–410 | 682–698 | 730–772, 798–841 |
| Posets and lattices | 53–67 | 205–211 | 376–410 | 699–703 | 818–841 |
| Algebraic structures | 124–136 | 197–204, 256, 276 | 411–441 | 704–705 | 842–860 |
| Combinatorics | 68–86 | 231–249, 263–270 | 569–598 | 706–709 | 730–772, 862–878 |
| Recurrences, GFs | 87–92 | 270–272 | 597–658 | 710–711 | 861–862 |
| Graph theory | 93–123, 137–155 | 212–230, 273–278 | 442–568 | 712–728 | 879–919 |

---

## Chapter 1 · Propositional logic (`01-propositional-logic`)
Live Lab: **Truth Table Lab** (`truth-table`): type any formula over up to 5 variables (¬ ∧ ∨ → ↔ ⊕,
custom binary operators by truth table); the table fills row by row; badges show tautology /
contradiction / contingent; the canonical DNF/CNF (minterm/maxterm lists) appear; a second tab tests
two formulas for equivalence or an argument for validity and shows a counterexample row. Backed by
the same evaluator as `_checks/dm/logiclib.py` (twin `logicLogic.ts`, vectors file).

### dm-01-01-propositions-connectives · Propositions, connectives and truth tables
- Prerequisites: none
- Sub-topics: propositions and truth values; the five connectives and their truth tables; precedence
  and right-associative →; implication read as a promise (vacuous truth); converse, inverse,
  contrapositive; biconditional; English to logic ("only if", "unless", "necessary", "sufficient",
  "neither … nor"); operators defined by a truth table and rewriting them; counting rows (2ⁿ) and
  "exactly k true" formulas; evaluating a compound proposition from given facts
- Sets: A 15–19; B 157–163; C 280–292; D 671–673; E 773–781
- pyq_topics: dm/logic
- PYQs (12; logic): `cse-1994-a-3-13`, `cse-1995-a-44`, `cse-1998-a-5`, `cse-2002-a-8`, `cse-2006-cs-28`, `cse-2009-cs-24`, `cse-2014-1-cs-53`, `cse-2014-3-cs-1`, `cse-2016-1-cs-1`, `cse-2016-2-cs-1`, `cse-2017-2-cs-11`, `cse-2024-2-cs-2`
- Time: 60 min
- Diagrams/animations: truth-table builder (rows fill, column by column); implication as a promise
  (four cases, the one broken promise); the converse/inverse/contrapositive square; "unless" decoder
- Practice themes: build tables; translate English; implication variants; custom operators
- Gaps: "unless" and "only if" readings are thin and inconsistent across sets (C 287 and E 778 differ
  in how they read "unless"); we teach "p unless q ≡ ¬q → p ≡ p ∨ q" with the inclusive reading

### dm-01-02-equivalence-normal-forms · Tautologies, laws of equivalence and normal forms
- Prerequisites: dm-01-01
- Sub-topics: tautology, contradiction, contingency, satisfiable, valid; logical equivalence (≡) vs
  biconditional; the laws (identity, domination, idempotent, double negation, commutative,
  associative, distributive, De Morgan, absorption, implication and biconditional rewrites,
  exportation); proving equivalence by laws and by cases; checking tautologies by the "try to make it
  false" method; DNF/CNF, canonical (principal) forms, minterm/maxterm numbering; satisfiability of
  CNF (2-SAT/3-SAT names, every CNF with distinct clauses of size k) ; functional completeness
  ({¬, ∧}, {¬, ∨}, {↑}, {↓}, {→, ¬}, {→, F}) and the counting of Boolean functions (2^{2ⁿ})
- Sets: A 19–25; B 163–167, 250–254; C 292–328; D 673–675; E 781–797
- pyq_topics: dm/logic
- PYQs (23; logic): `cse-1991-a-3-xii`, `cse-1992-a-2-xvi`, `cse-1993-ii-a-8-2`, `cse-1995-b-61`, `cse-1996-a-28`, `cse-1997-a-17`, `cse-1999-b-62-a`, `cse-1999-b-62-b`, `cse-2000-a-2-7`, `cse-2001-a-3`, `cse-2002-b-53-b`, `cse-2004-cs-70`, `cse-2005-cs-40`, `cse-2006-cs-27`, `cse-2007-cs-48`, `cse-2008-cs-31`, `it-2008-it-1`, `cse-2014-2-cs-53`, `cse-2015-1-cs-14`, `cse-2017-1-cs-1`, `cse-2017-1-cs-29`, `cse-2021-1-cs-7`, `cse-2021-2-cs-15`
- Time: 75 min
- Diagrams/animations: law ladder (step-by-step rewrite with the law named); "try to falsify" tree
  (assign F to the conclusion, propagate, find a clash or a counterexample); minterm/maxterm table
  with indices; completeness diagram (what each set can build)
- Practice themes: classify formulas; prove/disprove equivalences; canonical forms; completeness
- Gaps: maxterm numbering (C 326 numbers maxterms the minterm way; see errata); the claim "∧
  distributes over →" (A 23, false)

### dm-01-03-inference-resolution · Arguments, rules of inference and resolution
- Prerequisites: dm-01-02
- Sub-topics: arguments, premises, conclusion; validity as "premises ∧ ¬conclusion unsatisfiable";
  logical consequence; the rules (modus ponens, modus tollens, hypothetical and disjunctive
  syllogism, addition, simplification, conjunction, resolution, constructive dilemma); fallacies
  (affirming the consequent, denying the antecedent); consistency of a set of formulas; resolution
  refutation (clauses, the empty clause, soundness and completeness); Horn clauses (brief); axiom
  systems: soundness, completeness, consistency (the 1991 short question); knights-and-knaves puzzles
- Sets: A 21–25; B 165–167; C 300–321; D 674–675; E 788–797
- pyq_topics: dm/logic
- PYQs (8; logic): `cse-1991-a-4-iv`, `cse-1992-b-15-a`, `cse-1993-ii-b-18`, `cse-2003-cs-72`, `it-2004-it-31`, `cse-2012-cs-1`, `cse-2015-2-cs-3`, `cse-2015-3-cs-24`
- Time: 55 min
- Diagrams/animations: argument checker (premise rows highlighted, the conclusion column checked
  only there); resolution tree growing down to □; truth-teller/liar grid
- Practice themes: valid or not; name the rule; resolution refutations; puzzles
- Gaps: **GAP** resolution completeness and axiom-system terminology (only C mentions them)

---

## Chapter 2 · First-order logic (`02-predicate-logic`)
Live Lab: **Quantifier Lab** (`quantifier-lab`): a finite domain of 2–5 elements, predicates P(x),
Q(x) and R(x, y) set by clicking a grid; type a formula with ∀ ∃ and the connectives; the lab
evaluates it with the witnesses / counterexamples highlighted, and a "models" tab searches all
interpretations on the domain for one that makes a formula false (validity check on small domains).
Backed by `predlib.py` (twin `predLogic.ts`).

### dm-02-01-predicates-quantifiers · Predicates, quantifiers and translation
- Prerequisites: dm-01-02
- Sub-topics: predicates and domains; ∀ and ∃ as big ∧ / big ∨; bound and free variables, scope;
  translating "all A are B" (∀x(A→B)) and "some A are B" (∃x(A∧B)) and why the other pairing is
  wrong; "only A are B", "no A is B", "not all", "none of"; nested quantifiers and the order of ∀∃;
  uniqueness (∃!); negation (De Morgan for quantifiers) and pushing ¬ inwards through nested
  quantifiers; number-theory predicates (prime, divides) written in logic
- Sets: A 26–37; B 168–173; C 296–311; D 676–679
- pyq_topics: dm/logic
- PYQs (19; logic): `cse-2004-cs-23`, `it-2004-it-3`, `cse-2005-cs-41`, `cse-2006-cs-26`, `cse-2007-cs-22`, `cse-2008-cs-30`, `it-2008-it-22`, `cse-2009-cs-23`, `cse-2009-cs-26`, `cse-2010-cs-30`, `cse-2011-cs-30`, `cse-2012-cs-13`, `cse-2013-cs-27`, `cse-2014-1-cs-1`, `cse-2014-3-cs-53`, `cse-2019-cs-35`, `cse-2023-cs-16`, `cse-2025-1-cs-38`, `cse-2026-2-cs-1`
- Time: 70 min
- Diagrams/animations: quantifiers as big AND/OR over a domain strip; the ∀∃ vs ∃∀ grid (rows x,
  columns y: every row has a mark vs one column full of marks); negation push-through animation
- Practice themes: translation both ways; negation; quantifier order; uniqueness
- Gaps: "only" and "none of" phrasing (A 34's gloss is reversed; see errata)

### dm-02-02-quantifier-laws-validity · Quantifier laws, validity and models
- Prerequisites: dm-02-01
- Sub-topics: interpretations (domain + meanings), satisfiable, valid, unsatisfiable; the
  non-empty-domain convention; quantifier laws: ∀ over ∧, ∃ over ∨ (equivalences) and the one-way
  laws (∀ over ∨, ∃ over ∧), ∃x∀y → ∀y∃x; moving quantifiers past a formula without x; prenex form
  (brief); finding counter-models on tiny domains; formulas with only infinite models (the 1991
  question); the Russell-style formula of 2003; Horn-clause logic programs as first-order sentences;
  induction as a first-order axiom (2025); decidable fragments named (2018 Bernays–Schönfinkel: the
  small-model argument)
- Sets: A 37–43; B 172–177; C 311–318; D 679–681
- pyq_topics: dm/logic
- PYQs (16; logic): `cse-1991-b-15-b`, `cse-1992-a-2-xv`, `cse-2003-cs-32`, `cse-2003-cs-33`, `cse-2003-cs-71`, `it-2005-cs-36`, `it-2006-cs-21`, `it-2007-cs-21`, `it-2008-it-21`, `cse-2013-cs-47`, `cse-2015-2-cs-55`, `cse-2016-2-cs-27`, `cse-2017-1-cs-2`, `cse-2018-cs-28`, `cse-2020-cs-39`, `cse-2025-2-cs-5`
- Time: 70 min
- Diagrams/animations: the one-way laws as a diagram with a counter-model for each wrong direction;
  counter-model search on a 2-element domain; ∃∀ ⇒ ∀∃ grid
- Practice themes: valid / not valid; counter-models; equivalent forms
- Gaps: **GAP** Bernays–Schönfinkel small-model property and infinite models (no set covers them;
  textbook: Enderton, *A Mathematical Introduction to Logic*)

---

## Chapter 3 · Sets, relations and functions (`03-sets-relations-functions`)
Live Lab: **Relation Lab** (`relation-lab`): a 0/1 matrix and the matching digraph for a relation on
up to 6 elements; property badges (reflexive, irreflexive, symmetric, antisymmetric, asymmetric,
transitive) with the offending pair shown; closures (reflexive, symmetric, transitive by Warshall,
animated); equivalence classes / partition view; composition R∘S; counters for the relation
families on n elements (all counts verified against enumeration for n ≤ 4). Backed by `rellib.py`
(twin `relLogic.ts`).

### dm-03-01-sets · Sets, set operations and identities
- Prerequisites: dm-01-02
- Sub-topics: sets, membership vs subset (with sets of sets: {∅} vs ∅, the 1995 and 2015 power-set
  questions); power set and its size; Cartesian products; union, intersection, difference,
  complement, symmetric difference (Δ as XOR, bit vectors); set identities proved by element
  chasing, membership tables and Venn regions; counting regions; tuples (A, B) with A ⊆ B and
  similar counts (3ⁿ by per-element choices)
- Sets: A 44–46; B 178–183; C 329–345; D 682–686; E 730–772
- pyq_topics: dm/sets
- PYQs (14; combinatorics, sets): `cse-1993-ii-a-8-4`, `cse-1995-a-20`, `cse-1996-a-1`, `cse-2000-a-2-6`, `cse-2001-b-51-a`, `cse-2005-cs-8`, `cse-2006-cs-22`, `cse-2006-cs-50`, `it-2006-cs-23`, `cse-2008-cs-2`, `cse-2015-1-cs-16`, `cse-2015-2-cs-18`, `cse-2015-3-cs-23`, `cse-2021-2-cs-50`
- Time: 60 min
- Diagrams/animations: Venn regions lighting up for each expression (three-set Venn, region codes);
  membership table; per-element choice tree (each element: in A only / in both / in neither)
- Practice themes: power sets of nested sets; identities; Δ; counting pairs of sets
- Gaps: none

### dm-03-02-relations · Relations and their properties
- Prerequisites: dm-03-01
- Sub-topics: relations as sets of pairs, matrices and digraphs; reflexive, irreflexive, symmetric,
  antisymmetric, asymmetric, transitive (with the empty relation and vacuous truth); composition and
  powers (Rⁿ as paths of length n; cycles in a digraph, the 1998 question); inverse; closures
  (reflexive, symmetric, transitive; Warshall); counting relations with each property (2^{n²},
  2^{n²−n}, 2^{n(n+1)/2}, 2ⁿ·3^{n(n−1)/2}, 3^{n(n−1)/2}, …) with proofs; relations on pairs and on
  sets (lexicographic and product orders, the symmetric-difference order of 2014)
- Sets: A 47–52; B 184–191; C 346–375; D 692–698; E 798–817
- pyq_topics: dm/sets, dm/combinatorics
- PYQs (20; combinatorics, sets): `cse-1994-a-2-3`, `cse-1995-a-19`, `cse-1996-a-27`, `cse-1998-a-38`, `cse-1998-b-62-b`, `cse-1999-a-2`, `cse-1999-b-51-1`, `cse-1999-b-51-2`, `cse-2002-a-42`, `cse-2002-b-51-a`, `cse-2002-b-52-a`, `cse-2004-cs-24`, `it-2004-it-4`, `cse-2009-cs-4`, `cse-2010-cs-3`, `cse-2014-2-cs-50`, `cse-2015-2-cs-16`, `cse-2015-3-cs-41`, `cse-2016-2-cs-26`, `cse-2020-cs-17`
- Time: 75 min
- Diagrams/animations: matrix ↔ digraph twin view with property checks; Warshall's algorithm
  animated (k = 1 … n); counting grid (diagonal / upper / lower cells and their choices)
- Practice themes: check properties; closures; compositions; counts
- Gaps: counts for antisymmetric/asymmetric (left blank in D 694)

### dm-03-03-equivalence-relations · Equivalence relations and partitions
- Prerequisites: dm-03-02
- Sub-topics: equivalence relation; classes; the partition theorem (classes ↔ partitions) with proof;
  congruence mod n; kernels of functions (x ~ y iff f(x) = f(y), the 2023 question); counting
  equivalence relations (Bell numbers, Stirling numbers of the second kind) and their sizes (largest
  n², smallest n); union and intersection of equivalence relations; the equivalence relation generated
  by R (E = R ∩ R⁻¹ from a preorder, 1997); partition refinement order (lead-in to Ch 4); "circular"
  and other non-standard relation properties (2021)
- Sets: A 48–51; B 186–191; C 355–375; D 694–698; E 808–817
- pyq_topics: dm/sets
- PYQs (15; sets): `cse-1992-b-15-b`, `cse-1996-b-56`, `cse-1997-a-43`, `cse-1997-b-58-a`, `cse-1998-a-6`, `cse-1998-a-7`, `cse-1998-b-63-a`, `cse-1998-b-63-b`, `cse-2000-a-2-5`, `cse-2001-a-2`, `cse-2005-cs-42`, `cse-2007-cs-2`, `cse-2021-1-cs-43`, `cse-2023-cs-39`, `cse-2026-2-cs-16`
- Time: 60 min
- Diagrams/animations: classes as coloured blocks of a matrix (after reordering); Bell triangle
  build; partition merge/split
- Practice themes: is it an equivalence; count classes; Bell numbers; union/intersection
- Gaps: none

### dm-03-04-functions · Functions: types, composition, inverses and counting
- Prerequisites: dm-03-02
- Sub-topics: function as a relation; domain, codomain, range; images and preimages of sets (the
  image laws: f(E∪F) = f(E)∪f(F), f(E∩F) ⊆ f(E)∩f(F), equality iff injective); injective,
  surjective, bijective; composition and which property passes to g∘f or back to f and g; inverse
  functions; involutions (f∘f = id, counting fixed points); counting functions: all (nᵐ), injective
  (n^{\underline m}), bijective, surjective (via Stirling / inclusion–exclusion, forward reference),
  strictly increasing (C(n, m)), functions on {0,1}ⁿ; pairing functions (h(a, b) = (2a+1)2^b − 1);
  functional equations on ℕ (2016)
- Sets: A 51–52; B 192–196; C 359–373; D 687–691; E 818–841
- pyq_topics: dm/sets, dm/combinatorics
- PYQs (24; combinatorics, sets): `cse-1993-ii-a-8-6`, `cse-1996-a-26`, `cse-1996-a-3`, `cse-1997-b-57-a`, `cse-1997-b-57-b`, `cse-1997-b-57-c`, `cse-1998-a-8`, `cse-2001-a-28`, `cse-2001-b-52-a`, `cse-2001-b-52-b`, `cse-2002-b-51-b`, `cse-2002-b-51-c`, `cse-2003-cs-37`, `cse-2005-cs-43`, `it-2005-cs-31`, `cse-2006-cs-2`, `cse-2012-cs-37`, `cse-2014-1-cs-50`, `cse-2014-3-cs-2`, `cse-2014-3-cs-49`, `cse-2016-1-cs-28`, `cse-2021-2-cs-11`, `cse-2024-1-cs-22`, `cse-2025-1-cs-7`
- Time: 75 min
- Diagrams/animations: arrow diagrams (domain → codomain) for each type; composition chain showing
  what fails; involution pairing; counting by "choices per element" tree
- Practice themes: classify maps; composition facts; image/preimage laws; counting functions
- Gaps: none

### dm-03-05-countability-proofs · Countability, infinite sets and proof techniques
- Prerequisites: dm-03-04
- Sub-topics: proof techniques (direct, contrapositive, contradiction, cases, counterexample);
  mathematical induction (weak, strong, with base-case care) and induction on inequalities; the
  gcd·lcm = ab proof; finite, countable, uncountable; ℕ, ℤ, ℚ, ℕ×ℕ countable; Cantor's diagonal
  argument (ℝ, P(ℕ), functions ℕ → {0,1}); subsets and unions of countable sets; Schröder–Bernstein
  (statement); infinite-set identities (S = S₁ ∪ … ∪ S_n ⇒ some Sᵢ infinite)
- Sets: A 7–14; B 179–183; C 318–328, 405–410; E 760–772
- pyq_topics: dm/sets, dm/combinatorics, dm/recurrences
- PYQs (8; combinatorics, recurrences, sets): `cse-1991-b-15-a`, `cse-1993-ii-a-8-3`, `cse-1994-a-3-9`, `cse-1995-b-71`, `cse-1998-b-62-a`, `cse-2001-a-27`, `cse-2001-b-51-b`, `cse-2018-cs-27`
- Time: 50 min
- Diagrams/animations: zig-zag enumeration of ℕ×ℕ and ℚ; the diagonal flip; induction domino chain
- Practice themes: countable or not; induction proofs; which proof technique
- Gaps: **GAP** countability (only A and C touch it briefly)

---

## Chapter 4 · Partial orders and lattices (`04-posets-lattices`)
Live Lab: **Hasse Lab** (`hasse-lab`): pick a poset (divisors of n, subsets of a small set,
partitions of a 4-set, a custom relation by pairs); the lab draws the Hasse diagram by levels,
highlights minimal/maximal/least/greatest elements, upper and lower bounds, lub/glb of a clicked pair,
chains and antichains, counts linear extensions, and says whether it is a lattice, distributive,
complemented, Boolean (with the failing pair or the N5/M3 sublattice shown). Backed by `orderlib.py`
(twin `orderLogic.ts`).

### dm-04-01-posets-hasse · Partial orders and Hasse diagrams
- Prerequisites: dm-03-03
- Sub-topics: partial order, strict order (<: irreflexive, transitive, hence asymmetric), total order;
  comparability; Hasse diagrams (covering relation) and how to draw them; minimal/maximal,
  least/greatest, upper/lower bounds, lub/glb; chains and antichains, Mirsky's and Dilworth's
  theorems (a poset with longest chain n is a union of n antichains, 1991); linear extensions and
  topological sorting (counting them, 1997 and 2024); quotient of a preorder (1997); product and
  lexicographic orders; the refinement order on partitions; monotone predicates on posets (2003)
- Sets: A 53–58; B 205–208; C 376–393; D 699–702; E 818–830
- pyq_topics: dm/posets
- PYQs (12; posets): `cse-1991-a-1-xiv`, `cse-1993-ii-a-8-5`, `cse-1996-a-2`, `cse-1997-a-41`, `cse-1997-b-58-b`, `cse-1998-b-63-c`, `cse-2003-cs-31`, `it-2005-cs-32`, `cse-2006-cs-4`, `cse-2007-cs-26`, `it-2007-cs-23`, `cse-2024-2-cs-24`
- Time: 65 min
- Diagrams/animations: Hasse construction (remove loops, remove transitive edges, point upward);
  min/max highlighting; linear extensions enumerated as paths; chain/antichain cover
- Practice themes: draw Hasse diagrams; extreme elements; count linear extensions; chains
- Gaps: Dilworth/Mirsky (only C states one form)

### dm-04-02-lattices · Lattices, distributive, complemented and Boolean lattices
- Prerequisites: dm-04-01
- Sub-topics: lattice (every pair has lub and glb); lattices as algebras (∧, ∨ with the four laws);
  sublattices; bounded lattices; complements; distributive lattices and the N5/M3 test; complemented
  and Boolean lattices; D_n (divisor lattice) and when it is Boolean (n square-free); P(S) and the
  hypercube; counting lattices on small sets (all lattices with up to 4 elements, 1994); complete
  lattices (2004); lattices of functions with the pointwise order (2025)
- Sets: A 59–67; B 208–211; C 386–410; D 703; E 830–841
- pyq_topics: dm/posets
- PYQs (11; posets): `cse-1992-b-14-b`, `cse-1994-a-2-9`, `cse-1997-a-18`, `cse-1999-a-28`, `cse-2002-b-52-b`, `cse-2004-cs-73`, `cse-2005-cs-9`, `it-2008-it-28`, `cse-2015-1-cs-34`, `cse-2017-2-cs-21`, `cse-2025-2-cs-32`
- Time: 65 min
- Diagrams/animations: lub/glb lookup on a Hasse diagram; the N5 and M3 pentagon/diamond with the
  failing distributive law animated; complement pairs in D_30 vs D_12; Boolean cube
- Practice themes: is it a lattice; complements; distributive; D_n
- Gaps: none

---

## Chapter 5 · Algebraic structures (`05-algebraic-structures`)
Live Lab: **Group Lab** (`group-lab`): choose (ℤ_n, +), (ℤ_n*, ×), small permutation groups or
a custom Cayley table; the lab checks closure, associativity, identity, inverses, commutativity
(with the failing triple), lists element orders, generators, all subgroups and the cosets of a chosen
subgroup (Lagrange visualised), and computes a^k mod n by repeated squaring. Backed by `grouplib.py`
(twin `groupLogic.ts`).

### dm-05-01-binary-operations · Binary operations, semigroups and monoids
- Prerequisites: dm-03-04
- Sub-topics: binary operation (closure built in), operation tables; associativity, commutativity,
  identity, inverses, idempotents; distributivity of one operation over another (2024); semigroups,
  monoids (strings under concatenation, functions under composition, 2025), their identities and
  invertible elements; checking a new operation (x*y = x²+y², n*m = n+m−nm, …); proofs inside a
  semigroup (the 1993 and 1998 descriptive questions)
- Sets: A 124–128; B 197–199; C 411–417; D 704; E 842–848
- pyq_topics: dm/groups
- PYQs (12; groups): `cse-1993-ii-c-28`, `cse-1994-a-2-2`, `cse-1997-a-16`, `cse-1998-b-64-a`, `cse-1998-b-64-b`, `cse-1998-b-64-c`, `cse-2003-cs-38`, `cse-2003-cs-7`, `it-2006-cs-2`, `cse-2013-cs-1`, `cse-2024-1-cs-42`, `cse-2025-1-cs-39`
- Time: 55 min
- Diagrams/animations: operation table with associativity triple tester; identity/inverse row
  scanning; structure ladder (magma → semigroup → monoid → group → abelian)
- Practice themes: properties of operations; identities/inverses; monoid or not
- Gaps: none

### dm-05-02-groups · Groups, abelian groups and group tables
- Prerequisites: dm-05-01
- Sub-topics: group axioms; uniqueness of identity and inverses; (ab)⁻¹ = b⁻¹a⁻¹; cancellation and
  the Latin-square property of tables (completing a group table, 2004); abelian groups and the
  tests (a² = e for all a ⇒ abelian; (ab)² = a²b² ⇒ abelian); order of an element; groups of
  integers mod n (ℤ_n, ℤ_n*: inverses mod n, why {1,2,3,5,7,8,9} mod 10 fails); matrix groups (2005
  upper triangular, nonsingular); roots of unity; direct products (2024); symmetric difference group
  on 2^X (2023); groups of even order have an element of order 2 (1992)
- Sets: A 128–133; B 199–204; C 417–430; D 704–705; E 848–860
- pyq_topics: dm/groups
- PYQs (17; groups): `cse-1992-b-14-a`, `cse-1994-a-10`, `cse-1995-a-42`, `cse-1996-a-29`, `cse-1996-a-4`, `cse-2000-b-4-a`, `cse-2000-b-4-b`, `cse-2002-a-6`, `cse-2004-cs-72`, `cse-2005-cs-13`, `cse-2005-cs-46`, `cse-2006-cs-3`, `cse-2009-cs-1`, `cse-2010-cs-4`, `cse-2022-cs-17`, `cse-2023-cs-41`, `cse-2024-2-cs-53`
- Time: 70 min
- Diagrams/animations: Cayley table completion (Latin square fill); inverse pairing by reflection
  over the diagonal of e's; element powers cycling round
- Practice themes: group or not; inverses mod n; complete tables; abelian criteria
- Gaps: none

### dm-05-03-subgroups-lagrange · Subgroups, cyclic groups, cosets and Lagrange's theorem
- Prerequisites: dm-05-02, dm-03-03
- Sub-topics: subgroups and the one-step/finite tests; intersections are subgroups, unions rarely
  (proof that H ∪ K is a subgroup iff one contains the other); cyclic groups, generators (φ(n) of
  them), subgroups of a cyclic group (one per divisor); cosets as equivalence classes; Lagrange's
  theorem with proof; consequences (order of an element divides |G|, groups of prime order are cyclic,
  largest proper subgroup ≤ |G|/2 … careful: 2018/2020 ask the largest possible); groups of order 4
  (ℤ₄ and the Klein group), order 6 (ℤ₆ and S₃); conjugacy as an equivalence relation (2019)
- Sets: A 133–136; B 201–204, 276; C 425–441; E 852–860
- pyq_topics: dm/groups
- PYQs (13; groups): `cse-1995-b-69-a`, `cse-1995-b-69-b`, `cse-1999-b-52-a`, `cse-1999-b-52-b`, `cse-1999-b-52-c`, `cse-2007-cs-21`, `cse-2009-cs-22`, `cse-2014-3-cs-3`, `cse-2014-3-cs-50`, `cse-2018-cs-19`, `cse-2019-cs-10`, `cse-2020-cs-18`, `cse-2021-1-cs-34`
- Time: 70 min
- Diagrams/animations: cosets tiling the group (Lagrange as equal blocks); cyclic group wheel with a
  generator stepping; subgroup lattice of ℤ_12
- Practice themes: subgroup tests; generators; coset counts; possible subgroup sizes
- Gaps: HK and the "order of a generator" slips (C 425/427; see errata)

### dm-05-04-modular-rings-fields · Modular arithmetic, rings and fields
- Prerequisites: dm-05-02
- Sub-topics: congruences and their arithmetic; fast exponentiation mod n; Fermat's little theorem
  and Euler's theorem (with proof via Lagrange); the order of a mod p; rings (two operations),
  commutative rings, rings with unity, Boolean rings (a² = a ⇒ commutative, 1994); integral domains
  and fields; subfields of ℂ (2008)
- Sets: A 7–14 (modular arithmetic); C 435–441; E 852–860 (thin)
- pyq_topics: dm/groups
- PYQs (5; groups): `cse-1994-b-38`, `it-2007-cs-16`, `it-2008-it-26`, `cse-2016-2-cs-29`, `cse-2019-cs-21`
- Time: 55 min
- Diagrams/animations: powers of 3 mod 17 cycling; square-and-multiply ladder; structure hierarchy
  (ring → commutative ring → integral domain → field)
- Practice themes: a^k mod n; orders mod p; ring/field or not
- Gaps: **GAP** rings and fields (only C names them)

---

## Chapter 6 · Combinatorics (`06-combinatorics`)
Live Lab: **Counting Lab** (`counting-lab`): the twelvefold way as a table (n balls, k boxes; balls
and boxes distinct or identical; any / at most one / at least one per box) with each count computed
and confirmed by brute-force enumeration for small n, k, plus an inclusion–exclusion tab (two to four
sets on a Venn diagram, enter the sizes, see each term added and subtracted) and a derangement and
lattice-path explorer. Backed by `countlib.py` (twin `countLogic.ts`).

### dm-06-01-counting-basics · Sum and product rules, permutations, strings and divisors
- Prerequisites: dm-03-04
- Sub-topics: sum rule, product rule, complement counting, subtraction for overlaps; permutations of
  distinct objects, with repetition and with identical objects (multinomial); circular arrangements;
  strings over an alphabet (with restrictions, "at least one", ternary strings 2025); digit problems
  (distinct digits, even numbers); counting via bijections (couples, substrings 1998); divisors from
  the prime factorisation (τ(n), 1995/2014/2015); Legendre's formula for the exponent of p in n!;
  parity-constrained 0/1 matrices (2026); residue-class counting (triples summing to 0 mod 3)
- Sets: A 68–80; B 231–240; C 569–585; D 706–709; E 730–760, 862–878
- pyq_topics: dm/combinatorics
- PYQs (14; combinatorics): `cse-1991-a-1-xiii`, `cse-1995-a-55-a`, `cse-1998-a-23`, `cse-2001-a-26`, `cse-2003-cs-5`, `cse-2004-cs-75`, `cse-2006-cs-24`, `it-2008-it-24`, `cse-2014-1-cs-37`, `cse-2014-2-cs-49`, `cse-2015-2-cs-9`, `cse-2023-cs-38`, `cse-2025-1-cs-20`, `cse-2026-1-cs-2`
- Time: 65 min
- Diagrams/animations: product-rule decision tree; digit-slot filling with the restricted slot first;
  divisor grid for 2^a·3^b; Legendre's staircase (multiples of p, p², …)
- Practice themes: strings and digits; arrangements with repeats; divisors; Legendre
- Gaps: none

### dm-06-02-combinations-binomial · Combinations, the binomial theorem and lattice paths
- Prerequisites: dm-06-01
- Sub-topics: combinations and subsets; symmetry and Pascal's identity (proofs by double counting);
  binomial theorem and the sums Σ C(n,k) = 2ⁿ, alternating sum, odd vs even subsets; Σ k·C(n,k) =
  n·2^{n−1} (2019); Vandermonde; lattice paths (with forbidden points, 2007); binary strings with no
  two adjacent 1s as gap placement (1999); merging sorted sequences (2003); BST insertion orders
  (2016); Catalan numbers (ballot sequences, balanced parentheses, binary trees) with the reflection
  proof
- Sets: A 70–80; B 237–245; C 576–596; E 862–878
- pyq_topics: dm/combinatorics
- PYQs (10; combinatorics): `cse-1991-a-2-iv`, `cse-1991-b-16-a`, `cse-1994-a-2-4`, `cse-1999-a-3`, `cse-2003-cs-4`, `cse-2006-cs-25`, `cse-2007-cs-84`, `cse-2007-cs-85`, `cse-2016-2-cs-40`, `cse-2019-cs-5`
- Time: 65 min
- Diagrams/animations: Pascal's triangle with the identity highlighted; lattice-path grid (counting
  by adding left and below; a forbidden point); reflection trick for Catalan paths
- Practice themes: subsets; identities; lattice paths; Catalan
- Gaps: Pascal's identity is mis-indexed in A 73 (errata)

### dm-06-03-distributions · Distributions: stars and bars, multisets, compositions and partitions
- Prerequisites: dm-06-02
- Sub-topics: identical balls into distinct boxes (stars and bars, with lower bounds and upper
  bounds); multisets (C(n+k−1, k)); compositions of n into k positive parts (C(n−1, k−1)) and
  non-negative parts; non-decreasing digit strings (2015); distinct objects into identical boxes
  (Stirling numbers of the second kind); identical into identical (integer partitions, 2022); the
  twelvefold-way table; distributing two colours of balls (it-2008); jobs to ordered machines with
  order constraints (2021)
- Sets: A 81–86; B 245–249; C 585–596; D 706–708; E 862–878
- pyq_topics: dm/combinatorics
- PYQs (11; combinatorics): `cse-1999-a-27`, `cse-2000-b-5-a`, `cse-2000-b-5-b`, `cse-2002-b-61-a`, `cse-2002-b-61-b`, `cse-2002-b-61-c`, `cse-2003-cs-34`, `it-2008-it-25`, `cse-2015-3-cs-5`, `cse-2021-1-cs-19`, `cse-2022-cs-22`
- Time: 65 min
- Diagrams/animations: stars and bars animation (bars slide to make boxes); the twelvefold-way grid;
  partition Ferrers diagrams
- Practice themes: equations in integers with bounds; multisets; partitions; Stirling numbers
- Gaps: integer partitions (thin in every set)

### dm-06-04-inclusion-exclusion · Inclusion–exclusion, derangements and Euler's totient
- Prerequisites: dm-06-02
- Sub-topics: two- and three-set formulas from the Venn regions; the general formula with proof
  (each element counted once); counting "none of the properties"; divisibility counts (by 2, 3, 5;
  by 3, 5 or 7); onto functions (Σ (−1)^i C(k,i)(k−i)^n); derangements (Dₙ = n!Σ(−1)^i/i!, recurrence,
  ≈ n!/e) and partial derangements; derangements of a word with repeated letters (LILAC, 2020);
  Euler's φ(n) from the prime factorisation; survey-style problems (languages spoken, foods eaten)
- Sets: A 75–80; B 240–245; C 591–596; E 750–760
- pyq_topics: dm/combinatorics
- PYQs (10; combinatorics): `cse-1993-ii-b-17`, `cse-1995-b-73-b`, `cse-1998-a-39`, `it-2004-it-2`, `it-2004-it-35`, `it-2005-cs-34`, `it-2006-cs-24`, `cse-2015-2-cs-40`, `cse-2017-1-cs-47`, `cse-2020-cs-42`
- Time: 65 min
- Diagrams/animations: three-set Venn with the +/−/+ counts per region; derangement table (rows
  i, columns positions) with forbidden diagonal; φ(n) sieve
- Practice themes: survey counts; divisibility; onto functions; derangements; φ
- Gaps: none

### dm-06-05-pigeonhole · The pigeonhole principle
- Prerequisites: dm-06-01
- Sub-topics: the basic and the generalised principle (⌈N/k⌉) with proofs; "minimum number to
  guarantee" questions (cards of a suit, socks, birthdays) and why the answer is k(r−1)+1; pigeonhole
  with pairs of numbers (parity classes, 2005), with sums and differences, with subsets (Erdős–
  Szekeres as an aside); in graphs (two vertices with equal degree, forward link to Ch 8)
- Sets: A 85–86; B 245–247; C 597–598; E 735–740
- pyq_topics: dm/combinatorics
- PYQs (2; combinatorics): `cse-2000-a-1-1`, `cse-2005-cs-44`
- Time: 40 min
- Diagrams/animations: worst-case filling (boxes fill to r−1 then one more); parity-class boxes for
  pairs
- Practice themes: guarantee counts; parity classes; the degree argument
- Gaps: the "minimum vs sufficient" confusion (E 735–737, errata)

### dm-06-06-sums-series · Sums, telescoping and harmonic numbers
- Prerequisites: dm-03-05
- Sub-topics: arithmetic and geometric sums with proofs; Σ i, Σ i², Σ i³; sums over odd/even indices
  (2008); telescoping (Σ 1/(x(x+1)), 2015); proofs without words (sum of odd numbers, 1994);
  harmonic numbers and Σ H_j = (n+1)H_n − n (it-2004); floor sums (Σ ⌊√k⌋, links to Ch 7)
- Sets: A 7–9 (series); C 638–646 (sums inside generating functions); thin elsewhere
- pyq_topics: dm/combinatorics, dm/recurrences
- PYQs (5; combinatorics, recurrences): `cse-1994-b-37-c`, `cse-1994-b-37-d`, `it-2004-it-34`, `cse-2008-cs-24`, `cse-2015-1-cs-26`
- Time: 40 min
- Diagrams/animations: L-shaped layers of a square (odd numbers); telescoping cancellation
  animation; harmonic staircase
- Practice themes: closed forms; telescoping; harmonic sums
- Gaps: **GAP** summation by parts and harmonic identities (textbook: Concrete Mathematics ch. 2)

---

## Chapter 7 · Recurrences and generating functions (`07-recurrences`)
Live Lab: **Recurrence Lab** (`recurrence-lab`): enter a linear recurrence with constant coefficients
(order ≤ 3, optional polynomial or exponential non-homogeneous term) and initial values; the lab
iterates it, finds the characteristic roots (with multiplicity), solves for the constants, shows the
closed form and checks it against the iterated values; a generating-function tab expands a rational
function into its power series and reads off coefficients. Backed by `reclib.py` (twin
`recLogic.ts`).

### dm-07-01-forming-recurrences · Modelling with recurrences
- Prerequisites: dm-06-02, dm-03-05
- Sub-topics: recurrence = rule + initial values; deriving recurrences by "what happens at the last
  step": strings with no two consecutive 0s/1s (Fibonacci), strings containing 00, pennants
  (compositions into 1s and 2s), tilings, towers of Hanoi; recurrences from programs (1992 pseudo-code);
  proving properties by strong induction (Fibonacci identities, 1996; s_i = 1 + min(…), 2000)
- Sets: A 90–92; B 270–272; C 597–606; D 710–711; E 861–862
- pyq_topics: dm/recurrences
- PYQs (9; recurrences): `cse-1992-b-7-a`, `cse-1992-b-7-b`, `cse-1996-b-57`, `cse-2000-b-3`, `cse-2008-cs-78`, `cse-2008-cs-79`, `cse-2014-1-cs-49`, `cse-2015-1-cs-49`, `cse-2016-1-cs-2`
- Time: 55 min
- Diagrams/animations: last-character split tree (strings ending in 1 vs 10); pennant tiling;
  Fibonacci growth
- Practice themes: set up the recurrence; compute small values; induction proofs
- Gaps: none

### dm-07-02-solving-recurrences · Solving linear recurrences
- Prerequisites: dm-07-01
- Sub-topics: unrolling (iteration) and summing (a_n = a_{n−1} + f(n), 2016 and 2003); first-order
  linear (x_n = c·x_{n−1} + d, 1998); change of variable for T(2^k) (2002); homogeneous linear with
  constant coefficients: characteristic equation, distinct roots, repeated roots, complex roots (r^n
  form); particular solutions for polynomial and exponential right-hand sides (and the resonance case);
  Lucas numbers (2023); asymptotics from the dominant root (2024); recurrences on n and 2n proved by
  induction (2022)
- Sets: A 90–92; C 606–637; D 710–711; E 861–862
- pyq_topics: dm/recurrences
- PYQs (7; recurrences): `cse-1998-a-58-a`, `cse-2002-a-3`, `cse-2003-cs-35`, `cse-2016-1-cs-27`, `cse-2022-cs-41`, `cse-2023-cs-5`, `cse-2024-2-cs-5`
- Time: 70 min
- Diagrams/animations: unrolling ladder; characteristic-root plot; solution = homogeneous +
  particular overlay; constants solved from two initial points
- Practice themes: closed forms; constants; particular solutions; asymptotics
- Gaps: several worked solutions in C are wrong (C 621, 629, 634, 635, 637; errata)

### dm-07-03-generating-functions · Generating functions
- Prerequisites: dm-07-02, dm-06-03
- Sub-topics: ordinary generating functions; the dictionary (1/(1−x), 1/(1−ax), 1/(1−x)^k with
  C(n+k−1, k−1), x^m shifts, derivatives); reading coefficients (x^{12} in (x³+x⁴+…)³, 2016); closed
  forms for given sequences (2018, 2022); solving recurrences with generating functions; counting
  with generating functions (dice, coins, bounded distributions); exponential generating functions
  (brief)
- Sets: A 87–89; C 638–658; E 861–862 (D lists GFs but has none; errata)
- pyq_topics: dm/recurrences, dm/combinatorics
- PYQs (5; combinatorics, recurrences): `cse-2005-cs-50`, `cse-2016-1-cs-26`, `cse-2017-2-cs-47`, `cse-2018-cs-1`, `cse-2022-cs-26`
- Time: 55 min
- Diagrams/animations: coefficient extraction as choosing one term per factor; series expansion
  table; shift/derivative operators on sequences
- Practice themes: coefficients; closed forms; solve by GF; counting by GF
- Gaps: the generalised binomial sign (C 610, errata)

---

## Chapter 8 · Graph theory (`08-graph-theory`)
Live Lab: **Graph Playground** (`graph-lab`): presets (K_n, K_{m,n}, C_n, W_n, Q_n, Petersen,
grid, trees, PYQ graphs) or click to add vertices and edges; live degree sequence, components,
bipartite check, cut vertices and bridges; a colouring tab (greedy in any order vs exact χ by search,
with the colour classes); an Euler/Hamilton tab (Euler circuit by Hierholzer, animated; Hamiltonian
cycle search for small graphs); a trees tab (spanning-tree count by the matrix-tree theorem, BFS/DFS
trees); a matching tab (maximum matching, vertex cover, independent set by search; König for
bipartite). Backed by `graphlib.py` (networkx cross-checks; twin `graphLogic.ts`).

### dm-08-01-graph-basics · Graphs, degrees and the handshake lemma
- Prerequisites: dm-03-02, dm-06-02
- Sub-topics: simple graphs, multigraphs, digraphs; adjacency and incidence; degree, the handshake
  lemma and the even number of odd vertices (with proofs); min/max degree bounds on |E|; special
  graphs (K_n, C_n, P_n, W_n, K_{m,n}, Q_n, Petersen) with their vertex/edge counts; bipartite graphs and
  the n²/4 bound; counting labelled graphs (2^{C(n,2)}, with at least k edges); degree sequences and
  Havel–Hakimi (with proof); two vertices of equal degree (pigeonhole); adjacency matrix: A² counts
  walks, trace(A³)/6 triangles; random graphs and expected counts (2013); graphs built from sets
  (subset graphs, 2000/2006), grids (2014)
- Sets: A 93–103; B 212–222; C 442–457, 529–535; D 712–717; E 879–897
- pyq_topics: dm/graphs, dm/combinatorics
- PYQs (22; combinatorics, graphs): `cse-1991-b-16-b`, `cse-1994-a-2-5`, `cse-1995-b-72`, `cse-2000-b-6-a`, `cse-2001-a-40`, `cse-2002-a-25`, `cse-2004-cs-79`, `it-2004-it-37`, `cse-2006-cs-71`, `cse-2006-cs-72`, `it-2008-it-27`, `cse-2009-cs-3`, `cse-2010-cs-28`, `cse-2013-cs-24`, `cse-2013-cs-25`, `cse-2014-1-cs-51`, `cse-2014-1-cs-52`, `cse-2014-2-cs-3`, `cse-2016-2-cs-28`, `cse-2017-2-cs-23`, `cse-2022-cs-27`, `cse-2022-cs-42`
- Time: 75 min
- Diagrams/animations: handshake (each edge drops one token at each end); Havel–Hakimi reduction
  animated; special-graph gallery; A, A², A³ walk counting
- Practice themes: degree sums; graphical sequences; counting graphs; special graphs; matrices
- Gaps: none

### dm-08-02-isomorphism-complements · Isomorphism, complements and self-complementary graphs
- Prerequisites: dm-08-01
- Sub-topics: subgraphs, induced subgraphs, spanning subgraphs; isomorphism and invariants (degree
  sequence, cycles, distances) used to refute it; finding an isomorphism; counting unlabelled graphs
  on few vertices (1994); complement and its degree sequence; self-complementary graphs (n ≡ 0, 1
  mod 4; P4, C5; the only self-complementary cycle is C5); line graphs (degrees, edges, 2013)
- Sets: A 98–103; B 216–219, 273; C 442–457, 515–528; E 892–897
- pyq_topics: dm/graphs
- PYQs (5; graphs): `cse-1994-a-6`, `cse-2012-cs-26`, `cse-2013-cs-26`, `cse-2014-2-cs-51`, `cse-2015-2-cs-28`
- Time: 50 min
- Diagrams/animations: isomorphism by relabelling (vertices glide to their images); C5 and its
  complement morphing; line-graph construction
- Practice themes: isomorphic or not; complements; self-complementary sizes; line graphs
- Gaps: none

### dm-08-03-connectivity · Paths, connectivity, cuts and components
- Prerequisites: dm-08-01
- Sub-topics: walks, trails, paths, cycles (the vocabulary differs between sets; we fix one);
  connected components; the edge bounds (n − k ≤ |E| ≤ C(n−k+1, 2)) with proofs; a disconnected
  graph has at most C(n−1, 2) edges; cut vertices (articulation points), bridges (an edge is a bridge
  iff on no cycle), edge cuts and min cuts (δ bounds the edge connectivity); vertex/edge connectivity
  κ ≤ λ ≤ δ; removing a vertex changes the component count by how much (2003); distance, diameter,
  diameter of G² (2021); components of arithmetic graphs (|i − j| ∈ {8, 12}: gcd, 1997) and of
  permutation graphs (2018)
- Sets: A 103–112; B 219–224; C 458–491; D 717–722; E 892–904
- pyq_topics: dm/graphs
- PYQs (15; graphs): `cse-1991-a-1-xv`, `cse-1995-a-25`, `cse-1997-a-42`, `cse-1999-a-15`, `cse-1999-b-53-a`, `cse-1999-b-53-b`, `cse-1999-b-53-c`, `cse-2000-b-6-b`, `cse-2003-cs-8`, `cse-2004-cs-81`, `cse-2006-cs-73`, `cse-2015-2-cs-50`, `cse-2018-cs-43`, `cse-2021-1-cs-36`, `cse-2022-cs-20`
- Time: 70 min
- Diagrams/animations: BFS flood to find components; removing a cut vertex (the graph falls apart);
  edge-bound extremal graphs (K_{n−k+1} plus isolated vertices); min cut slide
- Practice themes: components; edge bounds; cut vertices and bridges; diameter
- Gaps: none

### dm-08-04-trees · Trees, forests and spanning trees
- Prerequisites: dm-08-03
- Sub-topics: the tree characterisations (connected and acyclic ⇔ n − 1 edges and connected ⇔ unique
  paths …) with proofs; leaves (at least two); forests (n − k edges); degree sums in trees
  (binary-tree node-degree relations, 2008; ξ(G) for trees, 2010); rooted trees and distances (the
  complete binary tree of 15 routers, 2007); spanning trees, fundamental cycles (m − n + 1 of them);
  unicyclic graphs (n vertices, n edges: exactly one cycle; at least 3 spanning trees, it-2007);
  edge-disjoint spanning trees (2008); counting spanning trees: Cayley (n^{n−2}) with a Prüfer
  proof, the matrix-tree theorem (Kirchhoff), spanning trees of K_n containing a fixed edge (2026),
  arborescences in a digraph (2022)
- Sets: A 113–123; B 224–228; C 492–514; D 722–725; E 904–910
- pyq_topics: dm/graphs
- PYQs (14; graphs): `cse-1992-a-3-iii`, `cse-1993-ii-a-8-1`, `it-2004-it-5`, `it-2007-cs-25`, `it-2007-cs-63`, `cse-2008-cs-42`, `it-2008-it-76`, `it-2008-it-77`, `cse-2010-cs-1`, `cse-2014-3-cs-51`, `cse-2017-1-cs-20`, `cse-2022-cs-48`, `cse-2024-1-cs-24`, `cse-2026-2-cs-26`
- Time: 70 min
- Diagrams/animations: Prüfer code encode/decode; spanning-tree enumeration of K4 (16 trees);
  matrix-tree determinant steps; adding an edge to a tree creates exactly one cycle
- Practice themes: edges/leaves counts; degree sums; spanning-tree counts; Prüfer
- Gaps: matrix-tree theorem and arborescences (**GAP**, textbook: West)

### dm-08-05-euler-hamilton · Euler and Hamilton
- Prerequisites: dm-08-03
- Sub-topics: Euler circuits and trails (all degrees even / exactly two odd, connected; proof);
  Hierholzer's algorithm; Hamiltonian cycles and paths; Dirac's and Ore's sufficient conditions;
  bipartite parity obstruction; Hamiltonian cycles in K_n ((n−1)!/2, 2019); cycles of each length in
  K_n (2012); Q_n is Hamiltonian (Gray code); Petersen is not
- Sets: A 137–145; B 225–228; C 458–514; D 722–725; E 897–904
- pyq_topics: dm/graphs, dm/combinatorics
- PYQs (3; combinatorics, graphs): `cse-2007-cs-23`, `cse-2012-cs-38`, `cse-2019-cs-12`
- Time: 50 min
- Diagrams/animations: Hierholzer tour animated (splicing sub-circuits); Hamiltonian cycle on the
  dodecahedron/Q3; why a bipartite graph with unequal sides fails
- Practice themes: Euler or not; Hamiltonian counts; conditions
- Gaps: none

### dm-08-06-planarity · Planar graphs
- Prerequisites: dm-08-03
- Sub-topics: plane drawings, faces, the face-degree sum (2e); Euler's formula v − e + f = 2 (and
  = k + 1 for k components) with proof; e ≤ 3v − 6, e ≤ 2v − 4 (no triangles), e ≤ g(v−2)/(g−2); K5 and
  K3,3 non-planar; Kuratowski's and Wagner's theorems (subdivision / minor, stated correctly);
  smallest non-planar graphs (2007); every planar graph has a vertex of degree ≤ 5; Q3 and K4 planar
  (2011); planarity tests on drawn graphs (2005)
- Sets: A 146–155; B 228–230; C 529–568; D 722–728; E 909–919
- pyq_topics: dm/graphs
- PYQs (11; graphs): `cse-1992-a-1-x`, `cse-1992-a-2-viii`, `cse-2003-cs-40`, `cse-2005-cs-10`, `cse-2005-cs-47`, `cse-2007-cs-4`, `cse-2011-cs-17`, `cse-2012-cs-17`, `cse-2014-3-cs-52`, `cse-2015-1-cs-54`, `cse-2021-1-cs-16`
- Time: 60 min
- Diagrams/animations: K4 redrawn without crossings; Euler's formula by adding edges one at a time;
  K3,3 inside a planar host showing the forced crossing; subdivision vs minor
- Practice themes: faces/edges/vertices; non-planarity proofs; degree bounds
- Gaps: Kuratowski misstated in E 909 (errata)

### dm-08-07-colouring · Graph colouring
- Prerequisites: dm-08-01, dm-08-06
- Sub-topics: proper colourings and χ(G); χ of standard graphs (K_n, C_n by parity, W_n, K_{m,n},
  trees, Q_n, Petersen, grids); bipartite ⇔ no odd cycle ⇔ 2-colourable (proof via BFS layers,
  2009/2026); lower bounds (clique ω, n/α) and upper bounds (Δ + 1 by greedy, Brooks); greedy
  colouring depends on the order (2023); four colour theorem and the easy five/six-colour proofs;
  edge colouring and χ′ (Vizing, χ′(K_{m,n}) = Δ, 2020); chromatic number of hypercubes and the
  related diameter question (it-2006)
- Sets: A 146–155; B 226–228; C 535–568; D 725–728; E 910–919
- pyq_topics: dm/graphs
- PYQs (14; graphs): `cse-2002-a-4`, `cse-2004-cs-77`, `it-2006-cs-25`, `cse-2008-cs-23`, `it-2008-it-3`, `cse-2009-cs-2`, `cse-2016-2-cs-3`, `cse-2018-cs-18`, `cse-2020-cs-52`, `cse-2022-cs-40`, `cse-2023-cs-45`, `cse-2024-1-cs-41`, `cse-2024-2-cs-50`, `cse-2026-1-cs-45`
- Time: 60 min
- Diagrams/animations: greedy colouring in two orders (3 vs 2 colours on a crown graph); BFS
  2-colouring finding an odd cycle; Petersen 3-colouring; edge colouring of K_{3,4}
- Practice themes: χ of given graphs; bounds; greedy order; edge colouring
- Gaps: none

### dm-08-08-matching-covers · Matchings, covers and independent sets
- Prerequisites: dm-08-07
- Sub-topics: matchings (maximal vs maximum, perfect); counting perfect matchings of K_{2n}
  ((2n−1)!!, 2003); counting all matchings of a path (Fibonacci, 2026); vertex covers and independent
  sets (complements of each other: α + τ = n, 2005); edge covers and Gallai's identities (ν + ρ = n
  without isolated vertices); König's theorem for bipartite graphs (and the 0/1-matrix line-cover form,
  2004); maximal independent sets of paths (2008); vertex cover facts (2026 MCQ); Hall's theorem
  (statement)
- Sets: A 146–152; B 229–230; C 535–568; D 725–728; E 910–919
- pyq_topics: dm/graphs
- PYQs (6; graphs): `cse-2003-cs-36`, `cse-2004-cs-76`, `cse-2005-cs-11`, `it-2008-it-4`, `cse-2026-1-cs-37`, `cse-2026-1-cs-47`
- Time: 55 min
- Diagrams/animations: augmenting path flip; König on a bipartite graph (matching vs cover of equal
  size); path matchings growing like Fibonacci
- Practice themes: count matchings; α, τ, ν, ρ relations; König
- Gaps: Hall/König (thin; C states them without proof)

---

## PYQ assignment check
- dm PYQs in `src/gate/questions.json`: **392** (graphs 88, logic 78, sets 68, combinatorics 67, groups 47, posets 23, recurrences 21).
- Assigned to a lesson: **392**; each id has exactly one primary lesson.
- **Unassigned: 0** (none)
- Lessons with fewer than 3 PYQs: `dm-06-05-pigeonhole` (2; kept, a core technique used across Ch 6 and Ch 8).
- Enforced by `content/gate-notes/_checks/dm/outline_pyq_assignment.py` (run by `scripts/gate-notes/run_checks.py`). Once lessons exist, `npm run notes:build` coverage takes over.

## Gaps summary (write from textbooks)
- `dm-01-03-inference-resolution`: resolution completeness, axiom-system terminology
- `dm-02-02-quantifier-laws-validity`: Bernays–Schönfinkel, infinite models (Enderton)
- `dm-03-05-countability-proofs`: countability (only A and C touch it)
- `dm-05-04-modular-rings-fields`: rings and fields (only C names them)
- `dm-06-06-sums-series`: summation by parts, harmonic identities (Concrete Mathematics)
- `dm-08-04-trees`: matrix-tree theorem, arborescences (West)
- Everywhere: the errata in `_errata/dm.md` name the reference-set slips the lessons must teach
  against.

## Viz and Live Labs (one per chapter)
| Chapter | Live Lab (`lab` id) | Tabs | Twin of |
|---|---|---|---|
| 1 | Truth Table Lab (`truth-table`) | `table`, `compare` | `logiclib.py` |
| 2 | Quantifier Lab (`quantifier-lab`) | `evaluate`, `models` | `predlib.py` |
| 3 | Relation Lab (`relation-lab`) | `matrix`, `closure` | `rellib.py` |
| 4 | Hasse Lab (`hasse-lab`) | `diagram`, `lattice` | `orderlib.py` |
| 5 | Group Lab (`group-lab`) | `table`, `subgroups` | `grouplib.py` |
| 6 | Counting Lab (`counting-lab`) | `twelvefold`, `pie` | `countlib.py` |
| 7 | Recurrence Lab (`recurrence-lab`) | `iterate`, `series` | `reclib.py` |
| 8 | Graph Playground (`graph-lab`) | `explore`, `colour`, `tours` | `graphlib.py` |

All diagrams are our own Viz scenes generated by `_checks/dm/_viz_chN.py` from the verified
libraries (truth tables as `table` elements; Venn diagrams as overlapping `circle` elements with
region labels; Hasse diagrams and graphs as `node` + `line`/`arrow` elements laid out by the
generator; relation matrices as `grid`; counting trees as `node` + `arrow`). Every scene has a phone
canvas and a caption on every step.
