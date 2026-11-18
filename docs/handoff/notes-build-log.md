# GATE notes build log (DM, TOC, CD, COA)

One entry per session, newest last. The pipeline is
`docs/gate/notes-pipeline/README.md`; the prompt is
`docs/gate/notes-pipeline/VIBE_PROMPT.md`.

Each entry: date · unit · PR · numbers (words, examples, scenes, labs, PYQs
embedded, practice) · what is next · anything blocked and why.

## 2026-11-17 · pipeline written

- Pipeline, animation standard and per-subject plans written in
  `docs/gate/notes-pipeline/`.
- Next unit: A1, viz engine element `state` + `loop`.
- Reference notes: not yet in the private repo `nexora-gate-notes` (the owner is
  uploading them). Until then, digests are "textbook-only".

## 2026-11-18 · Discrete Mathematics job book

- `docs/gate/notes-pipeline/dm.md` rewritten as the ordered job book (J0, E1 smooth
  motion, E2 loops, E3 graph toolkit, six labs, C2–C8, wrap-up), with the scenes each
  lesson must have; `VIBE_PROMPT_DM.md` is the prompt.
- The owner uploaded `GATE_CSE_Discrete_Mathematics_5_Notes.pdf` to the repository root.
  Vibe copies it into `GATE_NOTES/` and never commits anything from it.
- Next job: J0, then E1.

## 2026-11-18 · DM job E3 — Python graph toolkit (branch `notes/dm-graph-toolkit`)

- `content/gate-notes/_checks/dm/graphlib.py`: `Graph` (simple/multi, directed)
  with adjacency/incidence matrices, complement, line graph, induced subgraph,
  edge deletion/contraction, union, cartesian product, relabel; Havel–Hakimi
  with trace; BFS/DFS with event traces; components, distances, diameter, BFS
  layers; Tarjan articulation points and bridges with events; κ/λ and min edge
  cut (exact, n ≤ 10); isomorphism with invariant pruning + backtracking and
  non-isomorphism certificates; automorphism count; tree test, Prüfer
  encode/decode with trace, matrix-tree count (sympy), spanning-tree
  enumeration, fundamental cycles, Kruskal/Prim with traces; Euler tests,
  Hierholzer, Fleury; Hamiltonian cycle/path backtracking, Dirac/Ore; Euler
  planarity bounds + exhaustive Kuratowski-subdivision search (n ≤ 8);
  crossing counter; faces from a rotation system; greedy/exact χ, chromatic
  polynomial (deletion–contraction), bipartite with the odd cycle, König edge
  colouring (Δ rounds of Hopcroft–Karp), χ′ by search; augmenting-path and exact
  maximum matching, perfect-matching count, vertex cover, independent set,
  edge cover, clique, König/Gallai identities, Hall violator; counting
  formulas. Named graphs: K, C, P, W, K_{m,n}, Q_n, Petersen, grid,
  dodecahedron, crown; one builder per dm PYQ that has a graph (named by PYQ
  id), re-laid-out from the figure descriptions.
- `content/gate-notes/_checks/dm/graphdraw.py`: deterministic layouts for both
  canvases (circle, bipartite, grid, layered, star/wheel; presets Petersen,
  Q3, K5, K3,3, dodecahedron Schlegel, baked planar PYQ layouts); element
  builders (`vertex`/`edge`/`loop`, queue/stack panels, degree table,
  adjacency matrix grid); fixed state tones; `steps_from_trace`;
  `check_drawing` (drawn sets equal the graph's, vertex separation ≥ 2.4r,
  edge clearance ≥ r+4, no crossings when planar, canvas bounds, min text) in
  both canvases.
- `content/gate-notes/_checks/dm/graph_toolkit.py` (run by CI): unit checks on
  hand-known answers; every dm PYQ-with-graph computed property asserted
  against the official key (articulation points 3; min cut 2; χ = 4, 3, 3, 2;
  only G1 non-planar; isomorphism option B; Petersen ≅ option C; K4 and Q3
  planar); networkx (pinned 3.4.2, referee only) cross-check on 300 random
  small graphs, fixed seed — degrees, handshake, components, BFS distances,
  articulation points, bridges, κ, λ, bipartite + odd cycle, χ, max matching,
  spanning-tree count (vs enumeration), Eulerian, planarity, isomorphism; 19
  sample scenes (10 layouts + 9 PYQ graphs) pass `check_drawing` in both
  canvases.
- CI: `notes-checks` job now installs `networkx==3.4.2`.
- Checks: `run_checks.py` 119/119; `notes:build` + `notes:check` ok;
  `nexus:check` ok; `npm test` 767/773 (the 6 failures are the dry-run C/Java
  tests needing clang/javac, absent here and failing on main too).
- Next job per dm.md §4: C2 (Chapter 2, first-order logic) — expand its plan,
  then lessons one per commit.
