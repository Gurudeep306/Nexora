# The shape of one AI topic

Every topic in every AI course has this shape. Pages are short, each one step.
The pilot (Phase P2 in [PIPELINE.md](PIPELINE.md)) fixes the exact look; until
then, this is the contract. The worked illustration below is for
`dl-backprop` ("Backpropagation, derived in full").

## Pages (4–8 per topic)

| # | Page | Must contain | Example (`dl-backprop`) |
|---|---|---|---|
| 1 | **Why this matters** | The problem in one concrete case; why what we know so far is not enough; what you'll be able to do after | "We can compute a network's loss. To improve it we need ∂L/∂w for every one of its 10,000 weights. Doing each one separately takes 10,000 passes. Backprop does it in one." |
| 2 | **What you need** | Links to each `needs` topic, one line each on what we use from it, a 3-question warm-up (auto-graded) | Chain rule in many variables; computational graphs; the MLP forward pass; loss functions |
| 3 | **The idea** | Plain-words intuition with one picture, no symbols yet | "Blame flows backwards: each node passes back how much the loss changes per unit change of its input." |
| 4 | **By hand, the smallest case** | The tiniest real instance with every number: inputs, each intermediate, the result. Numbers from the tensor engine | A 2-input, 2-hidden, 1-output net on one example: forward values, then each gradient, worked out |
| 5 | **The math, derived** | Definitions; the derivation in the stepper, each line with its reason; the general result boxed; shapes checked | δ for the output layer; δ for a hidden layer from the next; ∂L/∂W = δ aᵀ with shapes; the full algorithm |
| 6 | **See it run** | The scene on the tiny case (step mode), then on a real case (play mode); controls to change inputs | `opgraph` with values forward and gradients back; a 3D view of the network with gradient sizes per weight |
| 7 | **The paper** | Who introduced it, the problem they had, the key equation in our notation (with the paper's numbering), what came after; link to the original; paper walk if it is a key paper | Rumelhart, Hinton, Williams 1986 (doi:10.1038/323533a0), its update rule mapped to ours; what Baydin et al. 2015 add on automatic differentiation |
| 8 | **Build it** | A from-scratch NumPy lab (Pyodide): starter code, hidden tests, plain-words feedback | Write `backward()` for a 2-layer MLP; tests compare with finite differences |
| 9 | **Pitfalls** | What goes wrong in practice, each shown in the scene | Forgetting the transpose; reusing a buffer; why gradients vanish with sigmoid (link to `dl-vanishing`) |
| 10 | **Check yourself** | 5–10 questions (conceptual and numeric on the tiny case), then judged practice | "What is ∂L/∂w₁₁ in the example?"; "Which shape is ∂L/∂W₂?" |

Pages 1–3 can share one page for small topics; 4–6 never merge.

## Blocks a page may use

| Block | Use |
|---|---|
| `md` | Prose (Markdown + KaTeX). Short paragraphs, plain words. |
| `derivation` | A list of steps: `{ tex, reason, changed }`. Rendered by the derivation stepper. |
| `symbols` | The symbols this page introduces, with meaning and shape. Linked to scenes and code. |
| `scene` | A 2D view from the viz player (`tensor`, `opgraph`, `network`, `plot`, `points`, `kernel`, `attention`, `distribution`). |
| `scene3d` | A 3D scene (lazy-loaded) with a step mode, a text description and a 2D fallback. |
| `worked` | The by-hand example: a table of every intermediate value, from the tensor engine. |
| `paper` | A citation card: authors, year, title, venue, link, the section or equation, and what we take from it. |
| `lab` | A Pyodide lab: starter code, hidden tests, feedback messages, the reference solution (hidden). |
| `quiz` / `numeric` | Questions; numeric ones accept a tolerance. |
| `note` | "Why it works", "Pitfall", "Paper note", "GATE DA" call-outs. |

## Files per topic (settled in P1; mirrors the DSA course)

```
client/src/learn/content/ai/<course>/<topic>/
  meta.ts        ready, pages
  index.ts       assembles the pages
  pages*.ts      the pages
  scenes.ts      the topic's scenes (driven by the tensor engine)
  questions.ts   quiz and numeric questions
  labs/          lab starter code, tests and solutions
scripts/ai-courses/golden/<topic>.py   NumPy recomputation of every worked number and derived result
```

## Checklist before the PR

- [ ] Every term and symbol is defined here or in a `needs` topic.
- [ ] Every derivation step has a reason; no step skipped.
- [ ] Every worked number comes from the engine and is matched by the golden test.
- [ ] Every scene teaches one idea; step mode; reduced motion; 2D fallback for 3D; axe 0; 360 px.
- [ ] Every citation is in `sources/` and verified, with section/equation/table.
- [ ] No copied text or figures; quotes ≤ one sentence.
- [ ] Lab: the reference passes, three wrong solutions fail with helpful messages.
- [ ] Ladder check passes; `CURRICULUM.md` regenerated.
