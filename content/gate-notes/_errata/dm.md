# Discrete Mathematics errata (internal)

This file records places where a reference set (A–E) is wrong, where sets disagree, or where a set
disagrees with the textbooks, plus question-bank notes. Each entry gives the correct version with a
short reason. Lessons teach the **correct** version and, where a slip is a classic trap, name it in a
`:::trap`. Page numbers are PDF pages. Sets are named only by letter.

Legend: **E** = error in one set · **X** = sets disagree · **B** = question-bank note (PYQ pipeline).

## 1. Cross-set disagreements (X)

| # | Topic | Disagreement | Correct version |
|---|---|---|---|
| X1 | Order ≤ 6 groups | B 256 says every group of order ≤ 6 is abelian; B 201 says the smallest non-abelian group has order 6. | S₃ (order 6) is non-abelian. Every group of order ≤ 5 (more generally of order p or p²) is abelian. |
| X2 | Walk / trail / path | E 894 calls an edge sequence without repeated edges a "walk"; C and A use walk = any sequence, trail = no repeated edge, path = no repeated vertex. | Use walk ⊇ trail ⊇ path (A/C, and GATE's usage). |
| X3 | Semi-Euler | C 508 says an Euler graph is "definitely semi-Euler", contradicting C 506 (semi-Euler = Euler trail but no circuit). | Under the C 506 definition the classes are disjoint; under "has an Euler trail" every Euler graph qualifies. State the definition used. |
| X4 | Pseudograph | C 498 allows loops but not parallel edges; most texts allow both. | Convention only; the lessons say "multigraph with loops" and avoid the word. |
| X5 | Parallel lines | C 360 calls "is parallel to" reflexive; many texts exclude a line from being parallel to itself. | Convention-dependent; a question must say which (none of our PYQs depends on it). |
| X6 | 0 | 0 | E 807 says 0 ∤ 0; the usual definition a | b ⇔ ∃k b = ak gives 0 | 0. | 0 | 0 holds; divisibility on ℤ fails antisymmetry (1 | −1, −1 | 1), not reflexivity. |

## 2. Errors inside a single set (E)

### Logic
- **A 23:** "∧ distributes over →", i.e. p ∧ (q → r) ≡ (p ∧ q) → (p ∧ r), is false (p = F: left F, right T). The forms p → (q ∧ r) ≡ (p → q) ∧ (p → r) and p ∨ (q → r) ≡ (p ∨ q) → (p ∨ r) are fine.
- **A 28/31, B 172, A 42:** ∀xP(x) → ∃xP(x) is valid only under the non-empty-domain convention (which GATE assumes); A 31 evaluates quantifiers over an empty domain without saying so.
- **A 34:** the English gloss of "only A's are B's" is reversed; the formula ∀x(B(x) → A(x)) is right.
- **A 38:** typo "∃x∃yα = ∀∃y∃xα" for ∃y∃xα.
- **B 163:** p → q → r is a WFF read right-associatively as p → (q → r).
- **C 313:** any clause is called a "maxterm" and any conjunction a "minterm"; a maxterm/minterm must contain every variable once (C 323–325 correct).
- **C 326:** the PCNF of (P∨Q∨¬R)(¬P∨Q∨R)(¬P∨¬Q∨R) is Π(1, 4, 6), not Π(1, 3, 6): a maxterm is numbered by the row that makes it false (¬P∨Q∨R is false at 100 = 4).
- **D 677:** "I ⊨ F ⇔ F satisfiable ⇔ F valid" holds for closed quantified Boolean formulas, not for first-order sentences.
- **D 681:** repeats the D 677 slip (QBF truth-table reasoning applied to a first-order sentence).
- **E 783:** the step rewriting q → (p → q) as q ∧ ¬p is garbled; it equals ¬q ∨ ¬p ∨ q, a tautology (conclusion right).

### Sets, relations, functions
- **A 48:** "R ⊆ ℕ×ℕ is a relation on (ℕ×ℕ)×(ℕ×ℕ)" is garbled; R ⊆ ℕ×ℕ is a relation on ℕ.
- **A 10:** −11 = 3(−4) + 1, so −11 mod 3 = 1, not 2; and the remainder satisfies 0 ≤ r < d (not r > 0).
- **C 340:** for languages, A(B ∩ C) ⊆ AB ∩ AC only (A = {a, ab}, B = {b}, C = {λ}: left ∅, right ∋ ab).
- **C 359:** S(m, n) splits m elements into **n** non-empty subsets.
- **C 374:** "b = aᵏ for some integer k" on the reals is not antisymmetric if k may be negative (2 and 1/2); it is a partial order only for k ≥ 1 on a suitable base set.
- **C 402:** if g∘f is onto then g must be onto; only f need not be (C 360 correct).
- **C 658:** symmetric-and-transitive relations number Bell(n+1); 2^{(n²−n)/2} counts reflexive-and-symmetric ones.
- **D 693:** "asymmetric = not symmetric" is wrong; asymmetric means (a, b) ∈ R ⇒ (b, a) ∉ R.
- **D 694:** counts left blank: antisymmetric 2ⁿ·3^{n(n−1)/2}, asymmetric 3^{n(n−1)/2}, neither reflexive nor irreflexive 2^{n²} − 2·2^{n²−n}.
- **E 821 (and A 60):** a unique maximal element is the greatest element only in a **finite** poset.

### Posets and lattices
- **A 60:** (ℕ, ≤) has an identity for join (its least element); what it lacks is a top, i.e. an identity for meet.
- **A 63:** domination law typo S ∪ U = M for S ∪ U = U.
- **A 64:** in M₃ the complements of b are a and c (the two other atoms), not b itself.
- **A 98:** the Hasse diagram of P(A), |A| = n, is Qₙ with n·2^{n−1} edges, not n·2ⁿ.
- **C 392:** "edges of a Boolean algebra = n·2^{n−1}" with n the number of **atoms**, not elements.
- **C 410:** (Dₙ, |) is a Boolean algebra only when n is square-free.
- **D 703:** meet and join are paired with the wrong bound; a ∧ b = glb, a ∨ b = lub.

### Algebraic structures
- **B 276:** "a group of order 24 has 8 subgroups (the divisors)" holds only for the cyclic group; S₄ has 30.
- **C 411:** a ∗ b = √(ab) fails to be a binary operation on ℝ because ab < 0 has no real root (not because of ±).
- **C 418:** ℤ_p* = {1, …, p − 1}, not {1, …, p}.
- **C 420:** the order of a is the least **positive** n with aⁿ = e.
- **C 425 / 662:** a generator of a finite cyclic group has order exactly |G|; it is the exponent k in gᵏ that must be coprime to |G|.
- **C 427 / 662:** HK need not be a subgroup (two order-2 subgroups of S₃ give |HK| = 4 ∤ 6); it is one iff HK = KH. And |H ∩ K| (not |HK|) divides |H| and |K|; |HK| = |H||K|/|H ∩ K|.
- **C 428:** the one-step subgroup test needs H ≠ ∅.
- **C 435:** the ⊕ₘ rule: a + b ≥ m (not > m) wraps to a + b − m.

### Combinatorics
- **A 70:** symmetry is C(n, r) = C(n, n − r), not C(n, r − 1).
- **A 73:** Pascal: C(n+1, k) = C(n, k−1) + C(n, k).
- **A 74:** C(2n, 2) = 2·C(n, 2) + n² (not 2·C(n, 1) + n²).
- **A 79:** dealing 52 cards to 4 players with the queen of spades to a fixed player: C(51, 12)·C(39, 13)·C(26, 13)·C(13, 13).
- **A 84:** n-digit numbers with strictly increasing digits: C(9, n) (0 can never appear); strictly decreasing: C(10, n).
- **A 85:** compositions have positive parts (zero parts are weak compositions).
- **A 7:** the harmonic-progression "sum" formula is an integral approximation, not a closed form.
- **C 592:** the lattice-path count subtracts paths through each forbidden point and adds back paths through both: that is "avoid both", as intended; the question text says "or".
- **C 595:** not divisible by p or q: n − n/p − n/q + n/(pq) (the written PIE is wrong; the final answer is right).
- **C 597:** the least N with ⌈N/k⌉ ≥ r is k(r − 1) + 1.
- **C 666:** D₀ = 1, D₁ = 0.
- **D 705:** the "r ≥ n objects, one per cell" count is muddled; it is P(r, n) ways to fill n cells from r distinct objects.
- **E 735–737:** "minimum number to guarantee 5 people with the same birth month" is 4·12 + 1 = 49; 50 and 60 also suffice but are not the minimum.
- **E 737:** socks of c colours, k pairs guaranteed: 2k + c − 1 socks (6 for two pairs, 8 for three, with c = 3).
- **E 873:** 8 people into 4 teams of 2: 8!/(2!⁴·4!) = 105 for unlabelled teams (2520 only if teams are labelled).
- **E 874:** the coefficient of x²y³z³ in (x − y + 2z)⁸ is 560·(−1)³·2³ = −4480.

### Recurrences and generating functions
- **A 87:** finite sequences have generating functions too (polynomials).
- **C 606:** last term α_k r_kⁿ.
- **C 610:** 1/(1 − x)ⁿ is an infinite series; ln(1 + x) starts at k = 1; C(−n, r) = (−1)^r C(n + r − 1, r).
- **C 613:** {1, 9, 28, …} is not r³ + 1 at r = 1.
- **C 614–615:** the numeric-function product uses b_r = r + 2; the difference closed forms hold only beyond the boundary.
- **C 621:** the repeated-root example must be x_n = 4x_{n−1} − 4x_{n−2} (r² − 4r + 4 = (r − 2)²).
- **C 629:** a_n = 7a_{n−1} − 10a_{n−2}, a₀ = 2, a₁ = 3: a_n = (7/3)2ⁿ − (1/3)5ⁿ.
- **C 634:** a_{n+2} − 4a_n = n has particular solution −n/3 − 2/9.
- **C 635:** a_n + 5a_{n−1} + 6a_{n−2} = 3n² has particular solution n²/4 + 17n/24 + 115/288.
- **C 637:** √a_n = (2^{n+1} + (−1)ⁿ)/3, so a_n = ((2^{n+1} + (−1)ⁿ)/3)².
- **E 862:** complex roots ρe^{±iθ} give rⁿ(c₁ cos nθ + c₂ sin nθ) with r = |α ± βi|.
- **D 670:** the contents list generating functions, but the set has none.

### Graph theory
- **A 94:** nδ/2 ≤ |E| ≤ nΔ/2 (the factor ½ is missing).
- **A 97:** the wheel Wₙ (n rim vertices + hub) has 2n edges.
- **A 99:** graph isomorphism has no known exponential lower bound (best known algorithm is quasi-polynomial).
- **A 102:** the edgeless graph is bipartite but not K_{m,n} with m, n ≥ 1.
- **A 108:** Wₙ has n + 1 vertices, so its minimum edge cover is ⌈(n + 1)/2⌉.
- **A 141:** |E(G)| + |E(Ḡ)| = C(n, 2), not n.
- **A 142:** bipartite: a bipartition (not a "bijection") of V.
- **A 143:** more than n²/4 edges ⇒ not bipartite (stronger than "not complete bipartite").
- **A 144:** more than C(n − 1, 2) **edges** ⇒ connected.
- **A 146:** the minimum vertex cover of W₅ has size 4 (it contains the hub); the example claiming {a, d} is wrong.
- **A 153:** the four colour theorem bounds χ(G), not K(G).
- **B 197:** for functions {0,1}⁴ → {0,1}, N = 2^{16}, log₂N = 16, log₂log₂N = 4.
- **B 219:** the 2018 permutation graph has 100! vertices (answer 109 unaffected).
- **B 227:** exact chromatic-number algorithms exist; none is known to be efficient (NP-hard).
- **B 273:** C₅ is not the only self-complementary graph (P₄, the bull, …; one exists for every n ≡ 0, 1 mod 4); it is the only self-complementary **cycle**.
- **B 275:** adding an edge between two non-adjacent vertices of a 10-vertex tree: 45 − 9 = 36 choices, each making one cycle.
- **B 276:** a non-trivial tree has at least **two** leaves.
- **C 443:** P₄ is self-complementary.
- **C 447:** Qₙ is Hamiltonian for every n ≥ 2; "k even ⇒ Eulerian" needs connectivity.
- **C 448:** Ore's condition is required only for non-adjacent pairs.
- **C 449:** f = mn − m − n + 2 for K_{m,n} only when it is planar (min(m, n) ≤ 2).
- **C 450 / 665:** fundamental cycles w.r.t. a spanning tree number e − n + 1.
- **C 456 / 546:** even order is necessary, not sufficient, for a perfect matching (K_{1,3}).
- **C 460:** an Euler trail need not be closed.
- **C 493:** connected means at least one path between each pair (exactly one characterises trees).
- **C 512:** the 3×3 grid has no Hamiltonian cycle (bipartite, odd order).
- **C 519:** invariants equal is not sufficient for isomorphism.
- **C 522:** n(n − 1)/2 = 136 gives n = 17.
- **C 525:** a bipartite graph has χ = 2 only if it has an edge.
- **C 531–532:** Havel–Hakimi decrements exactly the next d₁ entries.
- **C 534:** α(Kₙ) = 1 (single vertices are independent).
- **C 551:** ν ≤ τ ≤ 2|M| for any maximal matching M with τ the **minimum** vertex cover; a minimal cover can be much larger.
- **C 662:** labelled trees number n^{n−2} (not 2ⁿ − n); connected labelled graphs have no closed form (1, 1, 4, 38, 728, …).
- **C 665:** the degree sequence of Ḡ is (n − 1 − dᵢ).
- **D 723:** not every 3-regular graph on 6 vertices is K_{3,3}; the prism is planar.
- **D 725:** Kₙ (n even) has (n − 1)!! perfect matchings (K₄: 3), not n(n − 1)/2; planar graphs have α ≥ n/4 (K₄ breaks n/3).
- **E 892:** G ≅ G′ iff A′ = PAPᵀ for some permutation matrix P.
- **E 898–899:** Euler / Euler-trail conditions need connectivity (ignoring isolated vertices).
- **E 909:** Kuratowski: planar iff no subgraph is a subdivision of K₅ or K_{3,3}.
- **E 912:** the number of chromatic partitions is not χ in general.
- **E 913:** α′ + β′ = n (Gallai) holds for graphs without isolated vertices; the set's redefinition is non-standard.
- **E 914:** highest-degree-first greedy is a heuristic for vertex cover, not exact.

## 3. Question-bank notes (B)

(Filled in as the chapters are written: any key that a script disagrees with is fixed through
`src/gate/fixes/<paper>.json` and logged here. Keys below were re-derived by script and kept unchanged.)

### Chapter 2 (predicate logic) — resolved 2026-11-18

- **B cse-2008-cs-30:** option A prints `$\exists y\,pda(y)\wedge equivalent(x,y)$` inside a `$\to$`, which
  loosely brackets only `pda(y)`. The intended wide reading is
  `$\forall x(fsa(x) \to \exists y(pda(y) \wedge equivalent(x,y)))$`. Finite-domain equivalence search
  (`l2_01_predicates.py`): under the intended reading option A is equivalent to the universal closure of the
  statement, so key A stands. Key unchanged.
- **B cse-2003-cs-71:** options B and D are printed **identically** in the paper (both wrongly put `$\forall y$`
  around the rule body `$B(x,y)\wedge C(y)$`). Equivalence search up to domain size 3 (`l2_02_validity.py`):
  only option A (`$\forall x[(\exists y)(B(x,y)\wedge C(y)) \to A(x)] \wedge \neg\exists x B(x,x)$`) matches the
  logic program. Key A unchanged.
- **B cse-2013-cs-47:** as printed, **both A and D** are not equivalent to `$\neg\exists x(\forall y\,\alpha \wedge
  \forall z\,\beta)$` — predlib finds counter-models for each on a 1-element domain with `$\alpha=\beta=$ true`
  (A rewrites to `$\forall x(\forall z\beta \vee \forall y\alpha)$`, D to `$\forall x(\forall y\alpha \vee
  \exists z\neg\beta)$`; the target is `$\forall x(\exists y\neg\alpha \vee \exists z\neg\beta)$`; B and C match
  it). GATE 2013 awarded marks to all for this question. The intended key **D is kept** (never changed silently).
  Evidence: `l2_02_validity.py`.
- **B cse-2015-2-cs-55:** "tautology" here means **propositional** tautology. Option C is one: both sides are the
  same formula up to `$P\to R \equiv \neg P\vee R$` under an unchanged quantifier prefix, so the skeleton is
  `$X \leftrightarrow X$`. Option D (`$\forall x\forall y P(x,y) \to \forall x\forall y P(y,x)$`) is FOL-valid but
  its truth-functional form is `$A \to B$`, not a propositional tautology; A and B have counter-models. Key C kept.
  Evidence: `l2_02_validity.py`.
