# Chapter 8 plan: Graph theory

Internal planning file (the build skips it). Same house rules as Chapters 1–7 (`_style.md`).

- Folder: `content/gate-notes/dm/08-graph-theory/`; `chapter: graph-theory`; `pyq_topics`:
  `dm/graphs` (all), `dm/combinatorics` for graph-basics and euler-hamilton. 90 PYQs:
  22 + 5 + 15 + 14 + 3 + 11 + 14 + 6.
- Vocabulary fixed in Lesson 1 and used everywhere (sets disagree, errata X2): walk (any sequence) ⊇
  trail (no repeated edge) ⊇ path (no repeated vertex); cycle = closed path with ≥ 3 vertices; graphs
  are simple unless a question says otherwise; W_n has n rim vertices plus a hub (n + 1 vertices, 2n
  edges); Q_n has 2^n vertices; K_{m,n} has parts of sizes m and n; "number of graphs" means labelled
  unless "non-isomorphic" is said.
- Check scripts: **`graphlib.py`** (self-contained, brute force on small graphs, cross-checked with
  networkx when installed: degrees and sequences, complements, components, distances, diameter, G²,
  cut vertices, bridges, bipartition with an odd-cycle witness, greedy and exact colouring, χ and χ′,
  line graphs, ω and α, minimum vertex cover, all matchings, ν, perfect matchings, edge cover, maximal
  independent sets, Euler kind and Hierholzer tour, Hamiltonian cycles (search and count), cycles of
  each length, Laplacian and the matrix-tree theorem vs brute force, adjacency powers and triangles,
  planarity via networkx, isomorphism by search, Havel–Hakimi vs brute force, Prüfer encode/decode,
  K_n, C_n, P_n, W_n, K_{m,n}, Q_n, Petersen, grids). Lesson checks `l8_01_basics.py` …
  `l8_08_matching.py`.
- Viz: `_viz_ch8_l01.py` … `_viz_ch8_l08.py` (graphs as `node` + `line`; handshake tokens;
  Havel–Hakimi reduction; isomorphism by relabelling; BFS components; cut vertex removal; Prüfer
  encode/decode; spanning trees of K4; Hierholzer splicing; Euler's formula edge by edge; K3,3 forced
  crossing; greedy colouring in two orders; BFS 2-colouring with an odd cycle; augmenting paths; König).
- Live Lab: **Graph Playground** (`graph-lab`, tabs `explore`, `colour`, `tours`), `GraphLab.tsx` with
  `graphLogic.ts` (twin of graphlib; vectors `lab_vectors_ch8.json`).
- Errata: the long graph-theory list in `_errata/dm.md` §2 (A 94–153, B 197–276, C 443–665, D 723–725,
  E 892–914) and X2–X4.

| # | Lesson id | Title | PYQs | Est. study time |
|---|---|---|---|---|
| 1 | `dm-08-01-graph-basics` | Graphs, degrees and the handshake lemma | 22 | 75 min |
| 2 | `dm-08-02-isomorphism-complements` | Isomorphism, complements and self-complementary graphs | 5 | 50 min |
| 3 | `dm-08-03-connectivity` | Paths, connectivity, cuts and components | 15 | 70 min |
| 4 | `dm-08-04-trees` | Trees, forests and spanning trees | 14 | 70 min |
| 5 | `dm-08-05-euler-hamilton` | Euler and Hamilton | 3 | 50 min |
| 6 | `dm-08-06-planarity` | Planar graphs | 11 | 60 min |
| 7 | `dm-08-07-colouring` | Graph colouring | 14 | 60 min |
| 8 | `dm-08-08-matching-covers` | Matchings, covers and independent sets | 6 | 55 min |
