# Chapter 7 plan: Recurrences and generating functions

Internal planning file (the build skips it). Same house rules as Chapters 1–6 (`_style.md`).

- Folder: `content/gate-notes/dm/07-recurrences/`; `chapter: recurrences`; `pyq_topics`:
  `dm/recurrences` (all), `dm/combinatorics` for generating functions. 21 PYQs: 9 + 7 + 5.
- Conventions: a recurrence is a rule plus initial values; state the index of the first term every
  time (GATE mixes a_0 and a_1 starts); characteristic polynomial of a_n = c1 a_{n−1} + … + ck a_{n−k}
  is r^k − c1 r^{k−1} − … − ck; generating functions are ordinary unless "exponential" is said.
- Check scripts: **`reclib.py`** (exact iteration with forcing terms; characteristic roots with
  multiplicity; closed forms by sympy.rsolve verified term by term; constants of the homogeneous
  solution; generating-function series by long division cross-checked with sympy.series; brute-force
  string counts for the modelling recurrences; pennants). Lesson checks `l7_01_forming.py`,
  `l7_02_solving.py`, `l7_03_gf.py`.
- Viz: `_viz_ch7_l01.py` … `_viz_ch7_l03.py` (last-character split trees; pennant tilings; unrolling
  ladder; characteristic roots on a number line or plane; homogeneous + particular overlay; coefficient
  extraction as one term per factor; shift and derivative operators on sequences).
- Live Lab: **Recurrence Lab** (`recurrence-lab`, tabs `iterate` and `series`), `RecurrenceLab.tsx`
  with `recLogic.ts` (numeric twin of reclib; vectors `lab_vectors_ch7.json`).
- Errata: A 87, C 606, C 610, C 613–615, C 621, C 629, C 634, C 635, C 637, E 862, D 670.

| # | Lesson id | Title | PYQs | Est. study time |
|---|---|---|---|---|
| 1 | `dm-07-01-forming-recurrences` | Modelling with recurrences | 9 | 55 min |
| 2 | `dm-07-02-solving-recurrences` | Solving linear recurrences | 7 | 70 min |
| 3 | `dm-07-03-generating-functions` | Generating functions | 5 | 55 min |
