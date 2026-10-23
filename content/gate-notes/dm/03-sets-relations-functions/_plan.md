# Chapter 3 plan: Sets, relations and functions

Internal planning file (the build skips it). Same house rules as Chapters 1–2 (`_style.md`).
Lessons at Digital Logic depth (7–10k words).

- Folder: `content/gate-notes/dm/03-sets-relations-functions/`; `chapter: sets-relations-functions`;
  `pyq_topics`: `dm/sets` (all), plus `dm/combinatorics` for relations, functions and
  countability-proofs, and `dm/recurrences` for countability-proofs. 81 PYQs: 14 + 20 + 15 + 24 + 8.
- Conventions (stated once, used everywhere): relations on a finite set A = {1, …, n} drawn as 0/1
  matrices (row a, column b = 1 iff a R b) and as digraphs; composition R ∘ S means "first R, then S"
  ({(a, c) : a R b, b S c}) and the lessons say so whenever a PYQ uses the other convention; functions
  f : A → B with |A| = m, |B| = n; ℕ includes 0 only when a question says so.
- Check scripts: **`rellib.py`** (all relations on small sets; the six properties with witnesses;
  composition, inverse, powers; reflexive/symmetric/transitive (Warshall) closures; classes and
  partitions; Stirling S(n, k) and Bell numbers; closed-form family counts proved in Lesson 2 and
  confirmed by enumeration; functions with injective/surjective/bijective tests, images and
  preimages; onto counts by inclusion–exclusion; involution counts; power sets). Lesson checks
  `l3_01_sets.py` … `l3_05_countability.py`; sympy/itertools for identities and counts.
- Viz: `_viz_ch3_l01.py` … `_viz_ch3_l05.py` (three-set Venn diagrams with region codes as `circle`s
  + labels; membership tables; relation matrices as `table`/`grid` beside digraphs drawn as `node` +
  `arrow`; Warshall stages; arrow diagrams for functions; the zig-zag enumeration of ℕ × ℕ; Cantor's
  diagonal; induction dominoes).
- Live Lab: **Relation Lab** (`relation-lab`, tabs `matrix` and `closure`), `RelationLab.tsx` with
  `relLogic.ts` (twin of rellib; vectors `lab_vectors_ch3.json`).
- Errata: A 48, A 10, C 340, C 359, C 374, C 402, C 658, D 693, D 694, E 807 (X6), A 60/E 821.

| # | Lesson id | Title | PYQs | Est. study time |
|---|---|---|---|---|
| 1 | `dm-03-01-sets` | Sets, set operations and identities | 14 | 60 min |
| 2 | `dm-03-02-relations` | Relations and their properties | 20 | 75 min |
| 3 | `dm-03-03-equivalence-relations` | Equivalence relations and partitions | 15 | 60 min |
| 4 | `dm-03-04-functions` | Functions: types, composition, inverses and counting | 24 | 75 min |
| 5 | `dm-03-05-countability-proofs` | Countability, infinite sets and proof techniques | 8 | 50 min |
