# Chapter 4 plan: Partial orders and lattices

Internal planning file (the build skips it). Same house rules as Chapters 1–3 (`_style.md`).

- Folder: `content/gate-notes/dm/04-posets-lattices/`; `chapter: posets-lattices`; `pyq_topics`:
  `dm/posets`. 23 PYQs: 12 + 11.
- Conventions: a Hasse diagram is drawn with larger elements higher; "chain of length n" is stated
  each time (number of elements vs number of edges) because GATE 1991 counts elements; a lattice's
  ∧ is the glb (meet) and ∨ the lub (join); D_n = divisors of n under divisibility.
- Check scripts: **`orderlib.py`** (Poset class: partial-order test, covers, levels, minimal/maximal/
  least/greatest, bounds, lub/glb, lattice and distributive tests with failure witnesses, complements,
  complemented/Boolean, chains, height, width, linear-extension count by DP, sublattices; divisor and
  subset posets; all labelled posets on n ≤ 4 and unlabelled lattice counts). Lesson checks
  `l4_01_posets.py`, `l4_02_lattices.py`.
- Viz: `_viz_ch4_l01.py`, `_viz_ch4_l02.py` (Hasse construction from a digraph: drop loops, drop
  transitive edges, point upward; extreme elements; chains/antichains; linear extensions enumerated;
  lub/glb lookup; N5 and M3 with the failing law; complements in D_30 vs D_12; the Boolean cube).
- Live Lab: **Hasse Lab** (`hasse-lab`, tabs `diagram` and `lattice`), `HasseLab.tsx` with
  `orderLogic.ts` (twin of orderlib; vectors `lab_vectors_ch4.json`).
- Errata: A 60 (identity elements in (ℕ, ≤)), A 63, A 64 (complements in M3), A 98 and C 392 (edges of
  the Boolean lattice), C 410 (D_n Boolean iff n square-free), D 703 (meet = glb), E 821 (unique maximal
  ⇒ greatest only in finite posets).

| # | Lesson id | Title | PYQs | Est. study time |
|---|---|---|---|---|
| 1 | `dm-04-01-posets-hasse` | Partial orders and Hasse diagrams | 12 | 65 min |
| 2 | `dm-04-02-lattices` | Lattices, distributive, complemented and Boolean lattices | 11 | 65 min |
