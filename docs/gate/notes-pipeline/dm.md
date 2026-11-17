# Discrete Mathematics (`dm`): build plan

**State today:** N0 and N1 done. `content/gate-notes/dm/_outline.md` (8 chapters,
33 lessons, 392/392 PYQs assigned, enforced by `_checks/dm/outline_pyq_assignment.py`).
Chapter 1 (propositional logic, 3 lessons) is published and reviewed. Chapter 2
(`02-predicate-logic`) has `_meta.json` and `_plan.md` only. `_checks/dm/` already holds
helper libraries (`logiclib.py`, `predlib.py`, `rellib.py`, `dmlib.py`) and
per-chapter scripts for chapters 1–8 — **read them first; extend them, do not
duplicate them**, and confirm what each one already checks.

**Start at:** N2 for Chapter 2 (the plan exists; re-read it against the outline),
then N3 (the `quantifier-lab` exists), N4… Chapters 3–8 follow in order.

The outline is the contract. If you find a better split, change the outline in
its own PR first (and keep the 392/392 assignment check green).

## Chapters, labs and the animations each must have

The Live Labs below are already named in `LAB_TABS` (build script) but only
`truth-table` and `quantifier-lab` exist in the client. Build the rest (N3)
before their chapter.

### Ch 2 · First-order logic (35 PYQs) — lab: `quantifier-lab` (exists)
Animate: a quantifier evaluated over a finite domain (sweep each element,
light the witness/counterexample); nested ∀∃ vs ∃∀ as a grid of
(x, y) cells; negation pushing through quantifiers step by step; translating
English → formula by underlining phrases one at a time; a model that
satisfies one formula but not another; scope and free/bound variables
highlighted; valid vs satisfiable formula on a small model table;
inference with UI/EG/UG/EI as a chain where each rule fires.

### Ch 3 · Sets, relations and functions (81 PYQs) — lab: `relation-lab` (tabs `matrix`, `closure`)
Animate: Venn regions filling for each set operation and for inclusion–exclusion;
power set building by doubling; relation as matrix ↔ digraph side by side, with
each property (reflexive, symmetric, antisymmetric, transitive) checked cell by
cell; Warshall's transitive closure, one k at a time; equivalence classes
forming as a partition; composition of relations as path joining;
function arrows: injective/surjective/bijective tests, the pigeonhole forcing a
collision; inverse and composition of functions; counting relations/functions of
each type with the choice tree.

### Ch 4 · Partial orders and lattices (23 PYQs) — lab: `hasse-lab` (tabs `diagram`, `lattice`)
Animate: digraph → Hasse diagram (remove loops, remove transitive edges, orient
up); topological sort as repeated removal of minimal elements; LUB/GLB found
by climbing; lattice check (every pair has join and meet) pair by pair;
distributive and complemented lattices with the M3/N5 sub-lattice highlighted;
divisor lattices D_n; Boolean algebra as a lattice.

### Ch 5 · Algebraic structures (47 PYQs) — lab: `group-lab` (tabs `table`, `subgroups`)
Animate: Cayley table filling and the closure/identity/inverse/associativity
checks lighting cells; the hierarchy groupoid → semigroup → monoid → group →
abelian group as a ladder that a structure climbs; cyclic groups as a rotating
wheel (`arc`), generators found by stepping; Lagrange: cosets tiling the group;
subgroup tests; order of elements; isomorphism as relabelling of a table.

### Ch 6 · Combinatorics (52 PYQs) — lab: `counting-lab` (tabs `twelvefold`, `pie`)
Animate: sum vs product rule as branching trees; permutations filling slots;
combinations by dividing out orderings; stars and bars with balls dropping
into bins; inclusion–exclusion terms adding and subtracting on a Venn diagram;
derangements; pigeonhole; Pascal's triangle and identities; Catalan numbers as
lattice paths and balanced brackets; distributing distinct/identical objects
into distinct/identical boxes (the twelvefold way grid).

### Ch 7 · Recurrences and generating functions (21 PYQs) — lab: `recurrence-lab` (tabs `iterate`, `series`)
Animate: unrolling a recurrence term by term; the characteristic equation and
roots to the closed form, checked against the first 10 terms; repeated roots;
non-homogeneous particular solutions; a generating function's coefficients
appearing as a series is multiplied out; solving a counting problem by
extracting a coefficient.

### Ch 8 · Graph theory (90 PYQs) — lab: `graph-lab` (tabs `explore`, `colour`, `tours`)
Animate: degree sum (handshake) as edges adding 2 each; isomorphism by matching
degree sequences then relabelling; BFS/DFS on a graph with the frontier;
connectivity, cut vertices and bridges found by removing one at a time;
Euler circuit via Fleury/Hierholzer with the edge tour; Hamiltonian path
search with backtracking; trees (n−1 edges, unique paths), spanning trees
counted (Cayley, matrix-tree on a tiny graph); planarity and Euler's formula
V − E + F = 2 checked on drawings, K5/K3,3 subdivisions; greedy colouring and
the chromatic number, bipartite test by 2-colouring; matchings and covers
(König), augmenting paths.

## Textbooks and free sources (fact-checking only)
Rosen, *Discrete Mathematics and its Applications*; Liu, *Elements of Discrete
Mathematics*; West, *Introduction to Graph Theory*; Gallian, *Contemporary Abstract
Algebra*; Graham–Knuth–Patashnik, *Concrete Mathematics*; MIT 6.042J
*Mathematics for Computer Science* (free PDF, Lehman–Leighton–Meyer); NPTEL
Discrete Mathematics.

## Traps the PYQs keep testing (make each a `:::trap`)
Empty relation is symmetric and transitive but (on a non-empty set) not
reflexive; antisymmetric ≠ not symmetric; ∀x∃y ≠ ∃y∀x; ¬∀ = ∃¬; a lattice
needs join *and* meet for every pair; a group's identity is unique and so is
each inverse; Lagrange's converse is false; derangement formula and its
approximation n!/e; Euler circuit needs all degrees even (path: exactly 0 or 2
odd); Euler's formula needs connected planar; chromatic number of a cycle
depends on parity; number of labelled trees n^(n−2).
