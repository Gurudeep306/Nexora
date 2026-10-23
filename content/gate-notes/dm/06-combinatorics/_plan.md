# Chapter 6 plan: Combinatorics

Internal planning file (the build skips it). Same house rules as Chapters 1–5 (`_style.md`).

- Folder: `content/gate-notes/dm/06-combinatorics/`; `chapter: combinatorics`; `pyq_topics`:
  `dm/combinatorics` (all), `dm/recurrences` for sums-series. 52 PYQs: 14 + 10 + 11 + 10 + 2 + 5.
- Method fixed for every counting lesson: decide **distinct or identical**, **order matters or not**,
  **repetition allowed or not**, then pick the model (product rule, P, C, stars and bars, S(n, k),
  partitions); always sanity-check by brute force on a tiny case — the checks do exactly that.
- Check scripts: **`countlib.py`** (twelvefold way with brute-force twin; stars and bars with bounds by
  brute force and by inclusion–exclusion; multinomials and word arrangements; derangements three ways
  and word derangements (LILAC); Catalan; onto counts; divisibility PIE asserted against direct
  counting; τ(n), Legendre, φ; lattice paths with forbidden points by DP; no-two-adjacent strings;
  pigeonhole minimum). Lesson checks `l6_01_counting.py` … `l6_06_sums.py` (sympy for sums).
- Viz: `_viz_ch6_l01.py` … `_viz_ch6_l06.py` (decision trees; digit slots; divisor grids; Legendre
  staircase; Pascal's triangle; lattice-path DP grids; Catalan reflection; stars and bars sliding;
  Ferrers diagrams; three-set Venn with +/−/+ region counts; derangement table; worst-case pigeonhole
  filling; L-shaped layers; telescoping cancellation).
- Live Lab: **Counting Lab** (`counting-lab`, tabs `twelvefold` and `pie`), `CountingLab.tsx` with
  `countLogic.ts` (twin of countlib; vectors `lab_vectors_ch6.json`).
- Errata: A 70, A 73, A 74, A 79, A 84, A 85, A 7, C 592, C 595, C 597, C 666, D 705, E 735–737,
  E 873, E 874.

| # | Lesson id | Title | PYQs | Est. study time |
|---|---|---|---|---|
| 1 | `dm-06-01-counting-basics` | Sum and product rules, permutations, strings and divisors | 14 | 65 min |
| 2 | `dm-06-02-combinations-binomial` | Combinations, the binomial theorem and lattice paths | 10 | 65 min |
| 3 | `dm-06-03-distributions` | Distributions: stars and bars, multisets, compositions and partitions | 11 | 65 min |
| 4 | `dm-06-04-inclusion-exclusion` | Inclusion–exclusion, derangements and Euler's totient | 10 | 65 min |
| 5 | `dm-06-05-pigeonhole` | The pigeonhole principle | 2 | 40 min |
| 6 | `dm-06-06-sums-series` | Sums, telescoping and harmonic numbers | 5 | 40 min |
