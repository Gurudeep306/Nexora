# Chapter 5 plan: Algebraic structures

Internal planning file (the build skips it). Same house rules as Chapters 1–4 (`_style.md`).

- Folder: `content/gate-notes/dm/05-algebraic-structures/`; `chapter: algebraic-structures`;
  `pyq_topics`: `dm/groups`. 47 PYQs: 12 + 17 + 13 + 5.
- Conventions: a binary operation on S is a function S × S → S (closure is part of the definition, and
  the lessons say so whenever a PYQ lists closure separately); the structure ladder magma → semigroup →
  monoid → group → abelian group; order of a group |G|, order of an element o(a) = least positive k with
  a^k = e; S_n composes right to left ((p ∘ q)(x) = p(q(x))).
- Check scripts: **`grouplib.py`** (Structure: closure/associativity/commutativity with failure
  witnesses, identity, inverses, idempotents, kind; powers, orders, generated subgroups, generators,
  all subgroups, cosets; ℤ_n, ℤ_n*, × mod n on any set, S_n, direct products, Klein group,
  isomorphism by search; order mod n, φ, square-and-multiply, abelian group counts). Lesson checks
  `l5_01_operations.py` … `l5_04_modular.py`.
- Viz: `_viz_ch5_l01.py` … `_viz_ch5_l04.py` (operation tables with the associativity triple; the
  structure ladder; Latin-square completion of a group table; inverse pairs; element powers cycling;
  cosets tiling the group; the subgroup lattice of ℤ_12; powers of 3 mod 17; square-and-multiply).
- Live Lab: **Group Lab** (`group-lab`, tabs `table` and `subgroups`), `GroupLab.tsx` with
  `groupLogic.ts` (twin of grouplib; vectors `lab_vectors_ch5.json`).
- Errata: X1 (order ≤ 6 groups), B 276 (subgroups of order 24), C 411, C 418, C 420, C 425/662 (order of
  a generator), C 427/662 (HK), C 428 (non-empty), C 435.

| # | Lesson id | Title | PYQs | Est. study time |
|---|---|---|---|---|
| 1 | `dm-05-01-binary-operations` | Binary operations, semigroups and monoids | 12 | 55 min |
| 2 | `dm-05-02-groups` | Groups, abelian groups and group tables | 17 | 70 min |
| 3 | `dm-05-03-subgroups-lagrange` | Subgroups, cyclic groups, cosets and Lagrange's theorem | 13 | 70 min |
| 4 | `dm-05-04-modular-rings-fields` | Modular arithmetic, rings and fields | 5 | 55 min |
