# Discrete Mathematics (`dm`): the job book (binding)

This file is the complete, ordered list of jobs to finish Discrete Mathematics to
the Digital Logic standard, with **more and better animations than any subject so
far**. The prompt is [`VIBE_PROMPT_DM.md`](VIBE_PROMPT_DM.md). The general
pipeline is [`README.md`](README.md); the animation rules are
[`animations.md`](animations.md). Where this file is more specific, this file wins.

---

## 1. Where things stand (checked 2026-11-18)

| Item | State |
|---|---|
| Outline | `content/gate-notes/dm/_outline.md`: 8 chapters, 33 lessons, **392/392 PYQs assigned** (enforced by `_checks/dm/outline_pyq_assignment.py`) |
| Chapter 1 (3 lessons) | **Published and reviewed.** 8,196 / 10,038 / 9,541 words; 28 / 33 / 33 worked examples; 6 / 5 / 5 animated scenes; 12 / 23 / 8 PYQs; 10–12 practice each. This is the floor for every other lesson. |
| Chapter 2 | `_meta.json` and a short `_plan.md` only. Its lab `quantifier-lab` and `predlib.py` exist. |
| Chapters 3–8 | Nothing written. |
| Check skeleton | Already in `_checks/dm/` for every chapter: `lessons_chN.py` (structure), `pyq_chN.py` (PYQ solutions), `viz_chN.py` (scenes = generator), `_sol_chN.py` and `_viz_chN.py` (merge per-lesson modules `_sol_chN_lMM.py`, `_viz_chN_lMM.py`). They print "chapter not started" until the folder exists. |
| Shared helpers | `dmlib.py` (lesson structure check, PYQ key asserts, v2 solution writer `write_solutions`, practice writer `put_practice`, viz builders `spec/step/el/node/arrow/table/…`, `circle_layout`, `check_viz` with canvas bounds and min text size), `logiclib.py`, `predlib.py`, `rellib.py`. |
| Libraries still to write | `orderlib.py`, `grouplib.py`, `countlib.py`, `reclib.py`, **`graphlib.py`**, **`graphdraw.py`** |
| Live Labs in the client | `truth-table`, `quantifier-lab` only. `relation-lab`, `hasse-lab`, `group-lab`, `counting-lab`, `recurrence-lab`, `graph-lab` are listed in `LAB_TABS` (build script) but **not built**. |
| Nexus `content/nexus/dm.json` | 26 nodes in 6 zones; only 3 link lessons (Chapter 1). |
| Errata | `content/gate-notes/_errata/dm.md` (144 lines; cross-set disagreements and per-set errors). |
| PYQ bank | 392 dm PYQs; **25 flagged `needsReview`**, 21 with figures. |
| Reference notes | `GATE_CSE_Discrete_Mathematics_5_Notes.pdf`, 919 pages, sets A–E (see §2). |

**Important engine fact:** the viz player fades colour and opacity between steps,
but **position and size changes jump** (`viz.css` only transitions opacity, fill and
stroke). `arrow` elements whose ends are element ids are re-snapped every frame, so
edges follow their vertices. Smooth motion (vertices gliding, graphs morphing) needs
Job E1 below. It is the most important job for graph theory.

---

## 2. The reference notes for this subject

- File: `GATE_CSE_Discrete_Mathematics_5_Notes.pdf` (919 pages). Sets (internal
  labels only, **never write the authors' names anywhere**, even though the PDF's
  bookmarks contain them):

  | Set | Pages | Scan | What it is |
  |---|---|---|---|
  | A | 4–155 | faint (render 250 dpi) | Compact topic notes, the whole syllabus |
  | B | 156–278 | spreads (250–300 dpi, read each half) | Main notes + revision sheets |
  | C | 279–669 | good (200 dpi) | The long set: logic, sets/relations/lattices, groups, four graph-theory parts, counting, recurrences, generating functions |
  | D | 670–728 | dense (250–300 dpi) | Short typed-style sheet |
  | E | 729–919 | good (200 dpi) | Counting-first, problem-led |

- Put it at `GATE_NOTES/GATE_CSE_Discrete_Mathematics_5_Notes.pdf` (gitignored). If it is
  also at the repository root, copy it from there; **never `git add` it, never move it
  in a commit, never commit anything rendered from it.**
- **Per-lesson reading (the method for every lesson):** the outline lists, for each
  lesson, the exact set pages (`- Sets: A 93–103; B 212–222; …`). Before writing a lesson,
  render exactly those pages and read them as images:
  `pdftoppm -r 250 -f 93 -l 103 -png GATE_NOTES/GATE_CSE_Discrete_Mathematics_5_Notes.pdf /tmp/dm-A`.
  Write a lesson digest (gitignored) `content/gate-notes/_digest/dm/lessons/<lesson-id>.md`
  in the digest format of README §4 N1 (topic map with pages, key points, tricks tagged
  CORRECT / CORRECT-WITH-CAVEAT / WRONG, diagrams, worked examples each **Verified.**,
  unclear pages, errors with corrections, pages read with counts). New errors go into
  `_errata/dm.md` (committed). If full set digests already exist in
  `content/gate-notes/_digest/dm/` (the owner may supply them), read them first.
- The notes are a checklist of what to cover and where students go wrong. **Nothing is
  copied:** not wording, not examples, not figures, not graphs. Every graph in our scenes is
  our own graph or a PYQ's graph re-laid-out by our generator.

---

## 3. The bar for every lesson (measured by the checks)

From Chapter 1's actual numbers, raised for animation:

| Measure | Minimum per lesson | Graph theory (Ch 8) |
|---|---|---|
| Words (as `dmlib.check_lessons` counts them) | 7,000 | 7,000 |
| Worked examples (`:::example` with ≥ 2 `:::step` + `:::answer`) | 25, and ≥ 4 in every "Worked examples" section | 25 |
| Distinct `:::viz` scenes | **8**, at least 7 animated | **10**, at least 9 animated |
| Steps per animated scene | 5–40 (split longer processes into two scenes) | same |
| `:::intuition` blocks | one per new idea (≥ 4) | same |
| PYQs | exactly the outline's list, each with `tests="…"` | same |
| Practice questions | ≥ 10, mixed types, MCQ keys spread over A–D | same |
| Live Lab embeds | ≥ 1 per lesson (the chapter's lab, the right tab) | ≥ 2 |
| GATE radar, Where this fits, recaps, Summary (`depth="quick"`), Common mistakes | all present | all present |

**Raise the floor in the checks** when you start a chapter: in `lessons_chN.py` use
`dmlib.check_lessons(N, min_words=7000)`, and add `min_viz` (8, or 10 for Ch 8) and
`min_examples` (25) parameters to `dmlib.check_lessons` so CI enforces them. Raising a
bar is allowed; lowering one never is.

---

## 4. The jobs, in order

Each job is one pull request, from a branch named as shown. Do them in this order. A job
is done only when its **Done when** list is fully true and CI is green. If a job is too big
for one session, finish whole lessons (or whole components), push them, write exactly where
you stopped in `docs/handoff/notes-build-log.md`, and continue next session on the same
branch.

### J0 · Setup and baseline (no PR unless something is broken)
1. `git checkout main && git pull`; `npm install && npm install --prefix client`;
   `pip install sympy` (and `networkx` once J3 adds it); `sudo apt-get install -y poppler-utils`
   if `pdftoppm` is missing.
2. Place the PDF in `GATE_NOTES/` (§2). Confirm 919 pages:
   `python3 -c "import pypdf;print(len(pypdf.PdfReader('GATE_NOTES/GATE_CSE_Discrete_Mathematics_5_Notes.pdf').pages))"`.
3. Run and record the baseline: `python3 scripts/gate-notes/run_checks.py dm`,
   `node scripts/build-gate-notes.js --drafts`, `npm test`. All must pass before you change
   anything.
4. Read, in full: `AGENTS.md`, `content/gate-notes/_style.md`, `README.md`, `animations.md`,
   this file, `dm/_outline.md`, `_errata/dm.md`, all three Chapter 1 lessons, the Chapter 1
   `_viz_ch1_l0*.py`, `_sol_ch1_l0*.py` and `l1_0*_*.py` files (they are the pattern for
   every generator, solution module and check), `dmlib.py`, and
   `docs/gate/SOLUTION_AUTHORING.md`.

### E1 · Viz engine: smooth motion between steps — branch `notes/viz-motion`
The single most important job for graph theory, isomorphism, contraction, Hasse
re-drawing, sorting relation matrices and Venn work.
- In `client/src/viz/VizPlayer.tsx` / `VizScene.tsx`: when the frame changes, **tween every
  numeric geometry property** that changed (`x, y, w, h, cx, cy, r, r0, start, end, cellW,
  cellH, size, curve`, and `points` when the point count is equal) from the old frame to the
  new one over 450 ms with `--ease-standard`, using `requestAnimationFrame`. Arrows whose
  ends are element ids are recomputed on every animation frame, so edges glide with
  their vertices.
- Elements that appear fade in; elements that are hidden fade out (already the case for opacity).
- Back/Step/Play all tween; jumping several steps tweens directly to the target frame.
- `prefers-reduced-motion`, `mode="static"` and print: **no tween**, final positions at once
  (the existing static path).
- Performance: ≤ 400 elements at 60 fps on a mid phone; no layout thrash (compute in JS,
  set attributes, never re-mount elements).
- Tests: a unit test for the interpolation function (`client/src/viz/frames.ts` or a new
  `tween.ts`), and a Node test that an existing DL scene still validates and renders
  unchanged at the final frame.
- **Done when:** a test scene (kept in `tests/fixtures/`, never in `content/`, because every
  file in `viz/` must be used by a lesson) shows a vertex gliding with its edges following, at
  360 px and on desktop; reduced motion shows no movement; every existing DL and DM scene still
  passes the `--drafts` build and looks identical at the end of each step.

### E2 · Viz engine: `loop`, and edges for multigraphs — branch `notes/viz-loop`
- New element `loop` (`schema.ts` type, validation, `VIZ_ELEMENT_TYPES`, drawing in
  `VizScene.tsx`, `geometry.ts` helper): a self-loop drawn on the outline of the element
  `on` at angle `angle` (degrees, clockwise from 12 o'clock), radius `size` (default
  0.9 × the node radius), optional `label`, `tone`, `dashed`, `head` (`end` for digraphs).
  It follows its node when the node moves (E1).
- Parallel edges: confirm `arrow` with `curve: ±0.18, ±0.36` draws distinct parallel edges
  between the same two nodes and that labels sit beside the curve, not on it. Fix the label
  placement if needed.
- Edge weights: `arrow.label` placed at the mid-point, offset perpendicular to the edge so it
  never sits on the line; readable at 360 px (≥ 11 px).
- Tests as in `animations.md` §3. **Done when:** schema tests pass; a sample multigraph with
  loops renders correctly in light/dark/phone; axe 0.

### E3 · Python graph toolkit — branch `notes/dm-graph-toolkit`
Two pure-Python modules in `content/gate-notes/_checks/dm/` (no network, standard library +
`sympy`; `networkx` only as an **independent cross-check**, see the end of this job).

**`graphlib.py`: the algorithms, each returning both a result and a trace of events.**
- `Graph(vertices, edges, directed=False, multi=False)`, with helpers: degree, neighbours,
  adjacency matrix, incidence matrix, complement, line graph, induced subgraph, edge
  deletion/contraction, union, product (for Q_n), relabel.
- Named graphs: `K(n)`, `C(n)`, `P(n)`, `W(n)`, `Kmn(m,n)`, `Q(n)`, `petersen()`,
  `grid(r,c)`, `dodecahedron()`, `crown(n)`, the PYQ graphs (one builder per PYQ that has a
  graph, named by PYQ id).
- Degrees and sequences: handshake check, Havel–Hakimi with trace, graphic test.
- Traversal: BFS and DFS with events (`visit`, `enqueue`, `dequeue`, `tree_edge`,
  `back_edge`), components, distances, diameter, BFS layers.
- Connectivity: cut vertices and bridges (Tarjan low-link, with events), κ and λ by brute
  force for n ≤ 10, min edge cut.
- Isomorphism: brute-force search with invariant pruning for n ≤ 9, returning a mapping or a
  **certificate of non-isomorphism** (the first invariant that differs); automorphism count.
- Trees: tree test, Prüfer encode/decode with trace, spanning-tree count by the
  matrix-tree theorem (`sympy` exact determinant), spanning-tree enumeration for n ≤ 6,
  fundamental cycles, Kruskal/Prim traces (for the forward links to Algorithms).
- Euler/Hamilton: Euler circuit/trail test, Hierholzer with sub-circuit splice events,
  Fleury (for the bridge rule), Hamiltonian cycle/path backtracking with events (n ≤ 12),
  Dirac/Ore checks.
- Planarity: Euler-formula bounds, a Kuratowski subgraph finder by brute force on small
  graphs (n ≤ 8: search subdivisions of K5/K3,3), a crossing counter for a given straight-line
  drawing, faces of a plane drawing (from rotation systems for drawings we supply).
- Colouring: greedy with a given order (trace), exact χ by backtracking (n ≤ 12), chromatic
  polynomial by deletion–contraction (`sympy`), bipartite test returning an odd cycle,
  edge colouring for bipartite graphs (König) and χ′ by search for small graphs.
- Matchings and covers: maximum matching by augmenting paths with events (and
  Hopcroft–Karp for bipartite), all perfect matchings count, vertex cover, independent set,
  edge cover, clique (exact for n ≤ 14), König and Gallai identity checks, Hall violator
  finder.
- Counting: labelled graphs with k edges, perfect matchings of K_2n, matchings of P_n,
  Hamiltonian cycles of K_n, spanning trees of K_n with a fixed edge.

**`graphdraw.py`: layouts, scene builders and drawing checks.**
- Deterministic layouts (never random, never force-directed at run time):
  `circle`, `bipartite` (two columns or two rows), `grid`, `layered` (BFS levels or rooted
  tree, tidy-tree spacing), `star`/`wheel` (hub centre), and **hand-tuned presets** for
  Petersen (outer pentagon + inner pentagram), Q3 (two squares offset), K5 (pentagon),
  K3,3 (two rows), dodecahedron (Schlegel diagram), crown graphs, and each PYQ graph.
  Every layout returns coordinates for both canvases: wide (e.g. 640 × 360) and narrow
  (≤ 360 wide), so phone scenes are not just scaled-down desktop scenes.
- Element builders on top of `dmlib`: `vertex(name, x, y, nx, ny)` → `node` id `v_<name>`;
  `edge(a, b)` → `arrow` id `e_<a>_<b>` (sorted for undirected) with `head: "none"`, ends
  snapped to the vertex ids, `curve` for parallel edges, `label` for weights; `loop(v)` (E2);
  side panels: `queue_panel`, `stack_panel`, `degree_table`, `matrix_grid`.
- **The state colours (the same in every graph scene):** current vertex/edge `accent`;
  visited / in the tree / in the matching / in the cover `success`; frontier / candidate /
  augmenting path `info`; conflict, odd cycle, crossing, bridge being cut `danger`; "about
  to change" `warning`; done or irrelevant `muted`; removed = `hidden: true` (fades out).
  **Colour is never the only signal:** every state change is also in the caption, and colour
  classes in colouring scenes also put the colour number in the vertex label (`a·1`).
- Colour classes (colouring): fill order `accent, info, success, warning, danger`; χ ≥ 6 needs
  numbers only.
- `steps_from_trace(trace, templates)`: turns algorithm events into `step(caption, patches)`
  so a scene's frames *are* the algorithm's run; captions come from templates that include
  the real numbers (`"Dequeue c (distance 2). Its unvisited neighbours e and f join the queue."`),
  then are edited by hand to read like a teacher.
- **Drawing checks** (`check_drawing(scene, graph)`, run by `viz_ch8.py` and any chapter that
  draws graphs): the drawn vertex and edge sets equal the `Graph` object's; no edge passes
  within `r + 4` of a vertex that is not its endpoint; no two vertices closer than `2.4 r`;
  no unintended edge crossings in drawings declared planar; all labels inside both canvases;
  minimum text 12 px wide / 11 px narrow (`dmlib.MIN_TEXT`).

**Tests and cross-checks**
- `content/gate-notes/_checks/dm/graph_toolkit.py` (run by CI): unit checks for every function
  on hand-known answers (e.g. τ(K4) = 16, χ(Petersen) = 3, Petersen non-Hamiltonian,
  κ(Q3) = 3, |Aut(C5)| = 10, P(K3, k) = k(k−1)(k−2), ν(K_{3,4}) = 3, Cayley 4^{2} = 16).
- Add `networkx` (pinned, e.g. `networkx==3.4.2`) to the `pip install` line of the
  `notes-checks` job in `.github/workflows/ci.yml`, and in `graph_toolkit.py` compare
  every algorithm against networkx on 300 random small graphs (fixed seed). Our module stays
  the source of truth for scenes; networkx only catches bugs.
- **Done when:** `python3 scripts/gate-notes/run_checks.py dm` passes in CI with the new
  check; a sample scene for each layout passes `check_drawing` in both canvases.

### L-labs · One Live Lab per chapter, built just before that chapter (one PR each)
Each lab: logic in `client/src/gate/notes/labs/<name>Logic.ts`, UI in `<Name>.tsx`,
registered in `labs/index.ts` and `LAB_TABS` (same ids), Python twin in `_checks/dm/`,
vectors `lab_vectors_chN.json` written by a `lN_lab_vectors.py` script, and a Node test in
`tests/gate-notes-dm.test.js` that runs the TS logic on every vector (copy the Chapter 1/2
pattern exactly). Step / Back / Play / Reset, editable input, explanation in words for every
step (`aria-live="polite"`), input limits with clear messages, keyboard only, 360 px, light
and dark, all ten themes, axe 0, reduced motion (no auto-play). Lab drawings reuse the viz
engine's look (same node, edge and colour-state conventions as `graphdraw.py`).

| Branch | Lab | Tabs (exact ids) | What it must do | Twin |
|---|---|---|---|---|
| `notes/dm-lab-relation` | `relation-lab` | `matrix`, `closure` | Set {1..n}, n ≤ 6; toggle matrix cells or draw arrows (both views stay in sync); live property badges (reflexive, irreflexive, symmetric, antisymmetric, asymmetric, transitive, equivalence, partial order) each with the **witness cell or triple** that breaks it; composition R∘S; closures with **Warshall stepping k = 1…n**; equivalence classes shown as reordered blocks | `rellib.py` |
| `notes/dm-lab-hasse` | `hasse-lab` | `diagram`, `lattice` | Presets: divisors of n (n ≤ 120), P({a,b,c}), partitions of {1,2,3,4} by refinement, custom order by matrix; Hasse construction animated (drop loops → drop transitive edges → point up); min/max, least/greatest, bounds, lub/glb of a picked pair; chains/antichains; linear extensions counted and stepped; lattice test with the failing pair; distributive test showing an N5/M3 sublattice; complements | `orderlib.py` |
| `notes/dm-lab-group` | `group-lab` | `table`, `subgroups` | ℤ_n (+), ℤ_n* (×), S3, Klein-4, D4, custom table up to 8 × 8; closure / associativity (counterexample triple) / identity / inverses checks lighting cells; element orders; powers of a picked element cycling; cyclic test and generators; all subgroups with Lagrange check; cosets of a picked subgroup tiling the table | `grouplib.py` |
| `notes/dm-lab-counting` | `counting-lab` | `twelvefold`, `pie` | Twelvefold-way table for n balls, k boxes (distinct/identical, any/injective/surjective) with the formula and a small enumeration shown; stars and bars with sliding bars and bounds; inclusion–exclusion with 2–4 properties, Venn regions and +/− terms; derangements | `countlib.py` |
| `notes/dm-lab-recurrence` | `recurrence-lab` | `iterate`, `series` | Enter a linear recurrence (order ≤ 3, constant coefficients, polynomial/exponential RHS) and initial values; iterate the first 20 terms; characteristic roots, closed form found step by step, checked against the iterates; generating-function coefficient extraction for products of simple series | `reclib.py` |
| `notes/dm-lab-graph` | `graph-lab` | `explore`, `colour`, `tours`, `trees`, `matching` (**add `trees` and `matching` to `LAB_TABS`**) | Presets (K_n, K_{m,n}, C_n, W_n, Q_n, Petersen, grids, trees, PYQ graphs) or click to add/drag vertices and edges (n ≤ 12); `explore`: degree sequence, handshake, components by BFS (stepping), cut vertices and bridges, bipartite test with odd cycle, distances; `colour`: greedy in a chosen order (stepping) vs exact χ, colour classes, chromatic polynomial for n ≤ 7; `tours`: Euler test and Hierholzer stepping with splices, Hamiltonian search stepping (n ≤ 10); `trees`: BFS/DFS trees, Prüfer encode/decode, spanning-tree count by matrix-tree; `matching`: augmenting-path matching stepping, max matching, vertex cover, independent set, König check on bipartite graphs | `graphlib.py` (twin `graphLogic.ts`) |

### C2 … C8 · The chapters (one PR per chapter; Chapters 6 and 8 may be two PRs: lessons 1–3 / 4–6 and 1–4 / 5–8)
For each chapter, in this order (branch `notes/dm-chNN`):
1. **Plan.** Write or expand `NN-chapter/_plan.md` to the depth of
   `dl/01-number-systems/_plan.md`: for every lesson, the section list, the block ids, the
   PYQ → block map (`tests=`), **every scene by name with one line per step**, the lab tab
   used where, and the practice themes. (The Chapter 2 plan exists but is short: expand it.)
2. **Library.** The chapter's Python library (Ch 4 `orderlib.py`, Ch 5 `grouplib.py`, Ch 6
   `countlib.py`, Ch 7 `reclib.py`, Ch 8 `graphlib.py` from E3) with a self-check.
3. **Lab** (the L-labs job for this chapter) merged first.
4. **Lessons, one per commit**, following `_style.md` and README §4 N4. For lesson MM:
   - per-lesson reading of the set pages and the lesson digest (§2);
   - `NN-MM-slug.md` with `status: review`;
   - `_checks/dm/lN_MM_<slug>.py`: re-derives every number, table, example answer, PYQ key
     (`dmlib.assert_key`) and practice answer;
   - `_checks/dm/_sol_chN_lMM.py`: a v2 solution for every PYQ of the lesson (approach
     opens with "Concept tested:", ≥ 2 steps, pitfalls, verification or shortcut,
     `optionAnalysis` for every option with the reason each wrong one is wrong), written with
     `dmlib.write_solutions`;
   - `_checks/dm/_viz_chN_lMM.py`: every scene of the lesson, built from the library (graphs
     via `graphdraw.py`), written by `_viz_chN.py`;
   - practice questions with `dmlib.put_practice` (ids `nx-dm-NN-MM-qNN`).
5. **Checks green:** `lessons_chN.py` (with the raised floor), `pyq_chN.py`, `viz_chN.py`,
   every `lN_MM_*.py`, `node scripts/build-gate-notes.js --drafts`, `npm run notes:build`,
   `npm run notes:check`, `npm test`, client `tsc`/`oxlint`/`vite build`.
6. **Nexus** (§6) for the chapter's lessons.
7. **Self-review** (README §4 N7) and the review request `docs/handoff/review-dm-chNN.md`.
8. After the independent review's findings are fixed: flip the chapter's lessons to
   `status: published`, rebuild, merge.

### W · Wrap-up — branch `notes/dm-wrapup`
`_meta.json` `status: published` once `_coverage.md` shows 392/392; `_progress.json` all
`done`; AGENTS.md "Where things stand"; a handoff note with the final numbers per lesson.

---

## 5. The scenes each lesson must have (the floor; add more wherever motion teaches)

Names are suggestions; keep them unique across the subject. Every scene is generated from
the chapter library, so its numbers are right by construction.

### Chapter 2 · First-order logic (lab `quantifier-lab`, tabs `evaluate`, `models`)
**02-01 predicates and quantifiers (≥ 8):** domain strip where ∀ lights each element and
becomes one big AND; the same strip for ∃ as a big OR, stopping at the first witness; free vs
bound variables highlighted under a scope bracket that grows; "all A are B" vs the wrong
∀x(A ∧ B) evaluated on the same 4-element world (the wrong one fails on a non-A); "some A are
B" vs the wrong ∃x(A → B) (made true by a non-A); the ∀x∃y vs ∃y∀x grid (every row marked vs
one full column); negation pushed through ∀∃ one quantifier per step; translating a GATE
English sentence phrase by phrase into a formula; ∃! unpacked into "exists" + "at most one".
**02-02 laws, validity, models (≥ 8):** each equivalence law checked on a 3-element world;
each one-way law with its counter-model built element by element; ∃x∀y ⇒ ∀y∃x shown on the
grid, and the converse failing; moving a quantifier past a formula without x; prenex
conversion step by step; counter-model search over all 2-element interpretations (a table
filling until a falsifying one appears); a formula with only infinite models explained with
a growing chain; Horn clauses as a forward-chaining derivation.

### Chapter 3 · Sets, relations, functions (lab `relation-lab`)
**03-01 sets (≥ 8):** three-set Venn with regions lighting for ∪, ∩, −, Δ, complement; a
set identity proved by region shading on both sides; membership table filling row by row;
power set built by doubling (each new element copies the list); ∅ vs {∅} as boxes inside
boxes; Cartesian product as a grid filling; bit-vector view of set operations (Δ = XOR);
per-element choice tree giving 3ⁿ for A ⊆ B.
**03-02 relations (≥ 8):** pairs → matrix → digraph built together; each property checked
cell by cell with the failing witness turning red (one scene per property family:
reflexive/irreflexive, symmetric/antisymmetric/asymmetric, transitive with the triple);
composition as path joining; Rⁿ as walks of length n; Warshall k = 1…n; counting grid
(diagonal / upper / lower cells) for each formula; the empty relation's vacuous truths.
**03-03 equivalence (≥ 8):** classes forming as the matrix rows/columns reorder into blocks
(uses E1 motion); partition ↔ relation both ways; congruence mod 4 classes on a number line;
kernel of a function grouping by output; Bell triangle building; Stirling S(n,k) table;
union of two equivalence relations failing transitivity; refinement order of partitions.
**03-04 functions (≥ 8):** arrow diagrams classifying injective/surjective/bijective; image
and preimage of a set lighting; f(E∩F) ⊊ f(E)∩f(F) witness; composition chain showing which
property passes back; inverse by reversing arrows; involution pairs and fixed points;
counting functions by choices per element (tree); surjections counted by inclusion–exclusion
(preview); pairing function h(a, b) filling a grid.
**03-05 countability and proofs (≥ 8):** domino chain for induction (base, step, all fall);
strong induction with several earlier dominoes; zig-zag enumeration of ℕ × ℕ; ℚ enumeration
skipping duplicates; Cantor's diagonal flip building a missing sequence; P(ℕ) vs ℕ diagonal;
proof-by-contradiction flow; counterexample search table.

### Chapter 4 · Posets and lattices (lab `hasse-lab`)
**04-01 posets and Hasse (≥ 8):** digraph of divisibility on {1..12} → remove loops →
remove transitive edges → re-draw upward (E1 motion); minimal/maximal vs least/greatest on
two posets; upper/lower bounds and lub/glb of a pair; chains and antichains, Mirsky's
partition into antichains by levels; topological sort removing minimal elements one by one;
counting linear extensions as a tree of choices; product and lexicographic orders on pairs;
refinement order of the partitions of {1,2,3}.
**04-02 lattices (≥ 8):** lub/glb lookup on a Hasse diagram; a non-lattice with the pair that
has no join; join/meet tables; N5 and M3 with the distributive law failing on specific
elements; complements in D_30 vs D_12; D_n Boolean iff square-free (prime-power factor
highlighting); P({a,b,c}) as the cube; all lattices with ≤ 4 elements enumerated.

### Chapter 5 · Algebraic structures (lab `group-lab`)
**05-01 binary operations (≥ 8):** operation table filling; closure check (an out-of-set result
turns red); associativity tester running triples until a counterexample; identity row/column
scan; inverse pairs; idempotents; structure ladder magma → semigroup → monoid → group →
abelian with a structure climbing; string concatenation monoid.
**05-02 groups (≥ 8):** Cayley table completion as a Latin square (each step forced by
cancellation); inverse pairing by the e's position; (ab)⁻¹ = b⁻¹a⁻¹ with socks-and-shoes;
element powers cycling to e (order); ℤ_10 under × failing closure/inverses; ℤ_n* inverses
found by the extended Euclid ladder; a² = e ⇒ abelian proof steps; direct product table.
**05-03 subgroups and Lagrange (≥ 8):** cyclic group wheel with a generator stepping
(`arc`); generators of ℤ_12 (φ(12) = 4) found; subgroup lattice of ℤ_12; cosets of a
subgroup tiling the group into equal blocks; Lagrange counting; H ∪ K failing closure;
order-4 groups ℤ_4 vs Klein (tables side by side); S3's non-normal subgroup and its cosets.
**05-04 modular arithmetic, rings, fields (≥ 8):** clock arithmetic wheel; powers of 3 mod 17
cycling; square-and-multiply ladder; Fermat/Euler via Lagrange on ℤ_n*; extended Euclid for
inverses; ring hierarchy ladder; zero divisors in ℤ_12 lighting; ℤ_p as a field table.

### Chapter 6 · Combinatorics (lab `counting-lab`)
**06-01 basics (≥ 8):** product-rule decision tree; digit slots filled restricted-slot first;
sum vs product rule on the same problem; complement counting ("at least one"); permutations
of a multiset dividing out identical swaps; circular arrangements by fixing one person;
divisor grid 2^a·3^b; Legendre's staircase.
**06-02 combinations and binomial (≥ 8):** choosing a committee then dividing out orders;
Pascal's triangle with the identity highlighted; binomial expansion term by term; double
counting Σ k·C(n,k); lattice paths counted by adding left and below; forbidden point
subtraction; gap placement for no-two-adjacent 1s; Catalan reflection (bad path reflected at
the first touch).
**06-03 distributions (≥ 8):** stars and bars with bars sliding; lower bounds by pre-placing;
upper bounds by inclusion–exclusion; multisets as stars and bars; compositions as cuts in a
line; Stirling S(n,k) by placing the last element; Ferrers diagrams for partitions; the
twelvefold-way table filling cell by cell.
**06-04 inclusion–exclusion (≥ 8):** three-set Venn with +/−/+ counts per region; the general
formula counting one element exactly once; divisibility counts by 2, 3, 5; onto functions
term by term; derangements table with the forbidden diagonal; Dₙ recurrence; derangements of
LILAC; φ(n) sieve.
**06-05 pigeonhole (≥ 8):** boxes filling to r−1 then one more; generalised ⌈N/k⌉; cards of a
suit worst case; parity-class boxes for pairs; sums/differences pairing; equal-degree
vertices (forward link); Erdős–Szekeres subsequence; birthday-style minimums.
**06-06 sums and series (≥ 8):** odd-number L-shapes building a square; Gauss pairing for Σ i;
geometric sum by shifting and subtracting; telescoping cancellation; Σ i² by stacked
squares; harmonic staircase; Σ H_j identity; floor-sum blocks.

### Chapter 7 · Recurrences and generating functions (lab `recurrence-lab`)
**07-01 forming recurrences (≥ 8):** last-character split tree for strings with no 00;
pennant (1/2 tilings) growth; domino tilings of 2×n; Tower of Hanoi moves; recurrence from a
program trace; strings containing 00 by complement; Fibonacci growth bars; strong induction
proof of a Fibonacci identity.
**07-02 solving recurrences (≥ 8):** unrolling ladder; summing a_n = a_{n−1} + f(n); change of
variable n = 2^k; characteristic equation and roots; distinct vs repeated roots fitted to two
initial values; particular solution guess and resonance; homogeneous + particular overlay;
dominant-root asymptotics.
**07-03 generating functions (≥ 8):** sequence ↔ series dictionary; coefficient extraction as
choosing one term per factor; 1/(1−x)^k as stars and bars; shift and derivative operators on a
sequence table; solving a recurrence with a GF step by step; dice sums by multiplying
polynomials; bounded distributions; partial fractions to closed form.

### Chapter 8 · Graph theory (lab `graph-lab`). The hardest chapter: ≥ 10 scenes per lesson
All drawn with `graphdraw.py`, checked by `check_drawing`, using the state colours of E3.
**08-01 basics (≥ 10):** handshake tokens (each edge drops one token at each end, totals
match 2|E|); odd-degree vertices pair up; special-graph gallery built edge by edge (K_n, C_n,
W_n, K_{m,n}, Q_3 from two Q_2s, Petersen); bipartite n²/4 extremal; Havel–Hakimi reduction
on a degree sequence, vertex by vertex; a non-graphic sequence failing; adjacency matrix ↔
drawing; A² walk counting (paths of length 2 lighting); trace(A³)/6 triangles; counting
labelled graphs as edge on/off choices; equal-degree pigeonhole.
**08-02 isomorphism and complements (≥ 10):** two drawings of the same graph, vertices gliding
from one layout to the other (E1); invariant checks refuting isomorphism (degree sequence,
cycle lengths, distances) with the differing invariant in red; building a mapping vertex by
vertex with backtracking; Petersen's two famous drawings morphing; complement built by
toggling every pair; C5 morphing into its complement; P4 self-complementary; n ≡ 0,1 mod 4
counting; line graph construction (edges become vertices); counting unlabelled graphs on 4
vertices.
**08-03 connectivity (≥ 10):** walk/trail/path/cycle on one graph with the differences
marked; BFS flood labelling components (queue panel); edge bounds: extremal graph
K_{n−k+1} plus isolated vertices; removing a cut vertex and the graph falling apart (pieces
drift apart with E1); bridges found by Tarjan low-link (DFS tree with back edges); edge cut and
min cut; κ ≤ λ ≤ δ on one graph; distance and diameter by BFS layers; G² construction;
arithmetic graph |i − j| ∈ {8, 12} components via gcd.
**08-04 trees (≥ 10):** adding edges to a forest until a cycle appears (the n−1 edge
moment); unique path between two vertices; leaves ≥ 2 by the longest-path argument; Prüfer
encode (remove smallest leaf, write its neighbour); Prüfer decode; all 16 spanning trees of K4;
matrix-tree: Laplacian, delete a row/column, determinant; fundamental cycles (each non-tree
edge closes one); unicyclic graphs and their spanning trees; spanning trees of K_n through a
fixed edge.
**08-05 Euler and Hamilton (≥ 10):** Königsberg-style multigraph with degrees; why odd degree
blocks a circuit (enter/leave pairing); Hierholzer: start, get stuck, splice a sub-circuit
(several scenes); Fleury avoiding bridges; Euler trail between the two odd vertices;
Hamiltonian cycle search with backtracking on a small graph; dodecahedron Hamiltonian cycle;
Q3 cycle as a Gray code; Petersen failing (case split); bipartite unequal sides parity
obstruction; Dirac/Ore checks.
**08-06 planarity (≥ 10):** K4 redrawn without crossings (vertex glides, E1); faces counted
and face degrees summing to 2e; Euler's formula kept true as edges are added one at a time;
e ≤ 3v − 6 derivation from face degrees; K5 failing the bound; K3,3 failing e ≤ 2v − 4;
K3,3 attempted drawing with the forced crossing; subdivision vs minor (edge subdivided,
edge contracted with E1); Kuratowski subgraph found inside a PYQ graph; Q3 and the Petersen
graph (non-planar via K3,3 subdivision).
**08-07 colouring (≥ 10):** greedy colouring step by step; the same graph in a bad order
using more colours (crown graph 3 vs 2); BFS 2-colouring that finds an odd cycle; χ of C_n
by parity; wheels; clique and n/α lower bounds; Petersen 3-colouring; deletion–contraction
for the chromatic polynomial of a small graph; edge colouring of K_{3,4} with Δ colours;
map-to-graph (faces to vertices) for the four colour theorem; six-colour proof by removing a
degree ≤ 5 vertex.
**08-08 matchings and covers (≥ 10):** maximal vs maximum matching on one graph; augmenting
path found and flipped (edges swap in/out); repeated augmentation to maximum; perfect
matchings of K_4 and K_6 counted ((2n−1)!!); matchings of P_n growing like Fibonacci; vertex
cover vs independent set as complements (α + τ = n); edge cover and Gallai's identity; König:
maximum matching and minimum cover of equal size on a bipartite graph; 0/1 matrix line cover
form; Hall's condition and a violating set.

---

## 6. Nexus links (`content/nexus/dm.json`)

Every lesson must be linked from at least one node (`"lessons": [...]`), with `desc`,
`summary` and `topics` rewritten to match the lesson (see `dl.json`). Keep the README rules
(4–7 zones, 12–40 nodes, 1–10 nodes per zone, no cycles). Suggested mapping, adding nodes
where none fits:

| Node (zone) | Lessons |
|---|---|
| `predicate-logic` (1) | `predicates-quantifiers`, `quantifier-laws-validity` |
| `proof-techniques` (1) | `countability-proofs` (shared with `countability`) |
| `sets-relations` (2) | `sets`, `relations` |
| `equivalence-relations` (2) | `equivalence-relations` |
| `functions` (2) | `functions` |
| `countability` (2) | `countability-proofs` |
| `posets-lattices` (3) | `posets-hasse`, `lattices` |
| `boolean-algebra` (3) | `lattices` |
| `semigroups-monoids` (3) | `binary-operations` |
| `groups` (3) | `groups` |
| `subgroups-lagrange` (3) | `subgroups-lagrange`, `modular-rings-fields` |
| `counting-basics` (4) | `counting-basics`, `pigeonhole` |
| `combinatorics` (4) | `combinations-binomial`, `distributions` |
| `inclusion-exclusion` (4) | `inclusion-exclusion` |
| `catalan-advanced` (4) | `combinations-binomial`, `sums-series` |
| `recurrence-relations` (5) | `forming-recurrences`, `solving-recurrences` |
| `generating-functions` (5) | `generating-functions` |
| `graph-theory` (6) | `graph-basics` |
| `graph-isomorphism` (6) | `isomorphism-complements` |
| `connectivity` (6) | `connectivity` |
| `trees-forests` (6) | `trees` |
| `planarity` (6) | `planarity` |
| `graph-coloring` (6) | `colouring` |
| **new** `euler-hamilton` (6) | `euler-hamilton` |
| **new** `matching-covers` (6) | `matching-covers` |

Lesson ids are the frontmatter `id` (the file slug), e.g. `"lessons": ["graph-basics"]`.
Run `npm run nexus:check` and `node --test tests/nexus-subjects.test.js`.

---

## 7. Traps the PYQs keep testing (each becomes a `:::trap` in its lesson)
Empty relation: symmetric and transitive, not reflexive on a non-empty set; antisymmetric is
not "not symmetric"; ∀x∃y ≠ ∃y∀x; ¬∀ = ∃¬; "all A are B" uses →, "some A are B" uses ∧; a
lattice needs join *and* meet for every pair; D_n is Boolean iff n is square-free; Lagrange's
converse is false; H ∪ K is a subgroup only if one contains the other; derangements ≈ n!/e;
stars and bars needs identical objects; surjections need inclusion–exclusion; Euler circuit:
connected (ignoring isolated vertices) and all degrees even; Euler's formula needs a
connected plane graph (k + 1 for k components); e ≤ 3v − 6 needs v ≥ 3; χ(C_n) depends on
parity; greedy colouring depends on the order; labelled trees n^(n−2); perfect matchings of
K_2n = (2n−1)!!; α + τ = n; König holds only for bipartite graphs.

## 8. Sources for checking facts (never copied)
Rosen, *Discrete Mathematics and its Applications*; Liu, *Elements of Discrete Mathematics*;
West, *Introduction to Graph Theory*; Bondy–Murty, *Graph Theory* (free older edition);
Diestel, *Graph Theory* (free online edition); Gallian, *Contemporary Abstract Algebra*;
Graham–Knuth–Patashnik, *Concrete Mathematics*; Wilf, *generatingfunctionology* (free);
Lehman–Leighton–Meyer, *Mathematics for Computer Science* (MIT, free); NPTEL Discrete
Mathematics; official GATE answer keys. GATE Overflow only to find traps and disputed keys.
