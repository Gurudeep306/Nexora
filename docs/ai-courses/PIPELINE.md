# The AI courses pipeline

How every AI topic is made, from the original papers to a finished, checked
lesson on NexoraGuru. Read with [AGENT_RULES.md](AGENT_RULES.md),
[TOPIC_TEMPLATE.md](TOPIC_TEMPLATE.md) and [CURRICULUM.md](CURRICULUM.md).

---

## 1. What we are building

The best AI course anywhere, for Indian students, free:

1. **From scratch, step by step.** It starts at "what is a number, a function,
   a vector" and climbs one small step at a time to diffusion models and LLMs.
   No topic uses an idea that was not taught before it (section 3).
2. **Every piece of math, in full.** Every formula is derived line by line,
   with the reason for each line. No "it can be shown", no skipped algebra.
3. **You see it happen.** Every idea is shown running: in 3D where space
   matters (loss surfaces, feature maps, embeddings), as a step-by-step
   animation where order matters (backprop, attention, a diffusion step), and
   always with the real numbers computed live.
4. **The real papers.** Every method is tied to the paper that introduced it:
   what problem it solved, its key equation in our notation, what came after.
   A guided "paper walk" makes the original readable.
5. **You build it yourself.** Each method is coded from scratch in NumPy in the
   browser, then trained live, then checked by tests.
6. **One web, not separate courses.** Every topic links to what it builds on,
   what uses it in any course, related ideas elsewhere, and the real models
   that use it (`web.json`). A student with a doubt is one click from where
   that idea is taught. New models and papers join the web as they appear
   ([UPDATING.md](UPDATING.md)).
7. **Told as a story.** Each course is a story and each topic a chapter: the
   problem, the attempt that failed, the idea, the math, what it unlocked.
   Code is built up version by version, never dumped ([STYLE.md](STYLE.md)).
8. **Inside the machine.** A whole course shows how big models are really
   built: GPUs, memory, training across thousands of GPUs, data,
   post-training, serving, and what researchers can see inside a trained
   model.

## 2. The learner's path through one topic

Every topic, from "a vector" to "the transformer", follows the same ten steps
(the full shape is in [TOPIC_TEMPLATE.md](TOPIC_TEMPLATE.md)):

1. **Why**: the problem, in one concrete example, before any symbol.
2. **What you already know**: the earlier topics this builds on, as links, plus
   a 3-question warm-up on them.
3. **Intuition**: the idea in plain words and one picture.
4. **Tiny example by hand**: the smallest real case (2 inputs, 3 points),
   every number worked out.
5. **The math, derived**: definitions, then each step of the derivation with
   its reason, in the derivation stepper.
6. **See it run**: the scene (2D, 3D or step-by-step) on the same tiny example,
   then on a real one; you can change inputs and watch.
7. **The paper**: who introduced it, the key equation in our notation, a link
   to the original, the paper walk.
8. **Build it**: a from-scratch NumPy lab in the browser, checked by tests.
9. **Pitfalls**: what goes wrong in practice and why (each shown in the scene).
10. **Check yourself**: quiz plus numeric questions, then judged practice.

## 3. The ladder: nothing is used before it is taught

This is the rule the owner cares about most.

- Every topic lists its **prerequisites** (topic ids) in `curriculum.json`.
- A prerequisite must come **earlier** in the course order, in the same
  course or an earlier one. `node scripts/ai-courses/check-curriculum.mjs`
  fails if a topic needs something that comes later, if a prerequisite id
  doesn't exist, or if there is a cycle.
- Every symbol and term a lesson uses must be defined in that lesson or in a
  prerequisite. The lesson's `symbols` list declares what it introduces; the
  reviewer checks that nothing else appears.
- **Small steps.** A topic introduces one main idea. If a lesson needs two new
  ideas, split it. Typical size: 4 to 8 pages, each page one step.
- **Course order** (each starts where the previous one ends):
  0. Foundations (school math to what ML needs: numbers, functions, sums,
     graphs, a little Python and NumPy)
  1. Math for AI (linear algebra → calculus and matrix calculus → probability →
     statistics → information theory → optimisation)
  2. Machine Learning (from "learning from data" to ensembles, kernels,
     unsupervised learning and learning theory)
  3. Deep Learning (from one neuron to transformers)
  4. Then, in any order once Deep Learning is done: Computer Vision, NLP,
     Generative Models, Reinforcement Learning
  5. Large Language Models (needs NLP and Deep Learning; RLHF needs RL)
  6. How Big Models Are Built (GPUs, memory, parallel training, data,
     post-training, serving, interpretability; ends with building your own GPT)

## 4. New technology to build first (the "AI Lab" engine)

The DSA course's tracer and 2D views are the starting point, not the limit.
AI needs more. Build these before writing content, in this order. Every piece
is free and open source, and follows the site's rules: design tokens, light
and dark, `prefers-reduced-motion`, keyboard, axe 0, no sideways scroll at
360 px, no glows or gradients.

### 4.1 `tensor` engine: every number computed, every step recorded

- A small TypeScript tensor library with reverse-mode autodiff (like
  micrograd, but with tensors): `Float32Array` storage, shapes, broadcasting,
  matmul, conv2d, softmax, the usual losses.
- It records a **tape**: every operation, its inputs, outputs and gradients.
  The tape *is* the animation: forward pass, then backward pass, step by
  step, with real values. This replaces hand-written frames for ML scenes,
  the way `trace()` does for DSA.
- Backends: plain JS (always), **WebGPU** compute shaders for training larger
  demos live (when the browser has it), with JS as the fallback.
- Checked in CI against NumPy/PyTorch on fixed seeds (section 6).

### 4.2 Scene views (2D, SVG, in the existing player)

New views for the viz player, each driven by the tape:

| View | Shows |
|---|---|
| `tensor` | A matrix/tensor as a grid of values with its shape; highlights the row × column of a matmul, a softmax over a row. |
| `opgraph` | The computational graph: forward values on edges, then gradients flowing back, node by node (the chain rule made visible). |
| `network` | Layers of neurons and weights; activations and gradients as size and ink. |
| `plot` | Functions, losses over time, decision boundaries, contours, histograms. |
| `points` | Datasets in 2D: classes, clusters, a fitted line or boundary moving as it trains. |
| `kernel` | A convolution filter sliding over an image, each output cell computed in view. |
| `attention` | Queries, keys, values and the attention matrix, head by head. |
| `distribution` | Probability densities, samples, KL between two distributions. |

### 4.3 3D scenes (three.js via `@react-three/fiber`, MIT licence)

Where space is the point:

- **Loss surfaces**: a 2-parameter loss as a 3D surface; SGD, momentum and Adam
  as balls rolling on it, from the same start, with the real update numbers.
- **Feature maps**: a CNN's activations as stacked slabs; click a cell to see
  the receptive field and the kernel that made it.
- **Embedding space**: word or image embeddings in 3D (PCA/UMAP of real
  vectors); analogies as arrows.
- **A network in 3D**: layers as planes of neurons; a forward pass as values
  moving through, a backward pass as gradients moving back.
- **Geometry of linear algebra**: a matrix acting on space (grid
  deformation), eigenvectors staying on their line, SVD as rotate-scale-rotate.
- **Diffusion**: points (or a small image) being noised and denoised,
  step by step, the score field as arrows.

Rules for 3D: lazy-loaded (not in the main bundle); flat or soft shading in
theme colours (no bloom, no glow); orbit with mouse, touch and keys; a text
description for screen readers; a 2D fallback when WebGL is missing, the
device is slow, or reduced motion is on. Every 3D scene also has a "step" mode,
so it teaches, not just spins.

### 4.4 Derivation stepper (KaTeX, already in the client)

- A derivation is a list of steps: the equation, the reason ("chain rule",
  "the sum of the derivative", "substitute (3)"), and which terms changed.
- The changed terms are marked; one step at a time, back and forward.
- **Linked symbols**: hovering $\mathbf{W}$ in an equation highlights
  $\mathbf{W}$ in the scene and in the code, and the other way round.
- Every derivation's result is checked numerically (finite differences for
  gradients) in CI, so a wrong line can't ship.

### 4.5 Labs in the browser (Pyodide: real Python and NumPy, MPL licence)

- From-scratch labs: the student writes the forward pass, the gradient, the
  update. Hidden tests run in the browser and say exactly what is wrong
  ("your gradient for $b$ is off by a factor of 2").
- Loaded on demand (it is large); progress saved like other problems.
- Optional "open in Colab" for heavy, GPU-only exercises, marked as optional
  (Colab's free tier has limits; say so).

### 4.6 Small real models in the browser (onnxruntime-web, MIT licence)

Trained by us, offline (PyTorch scripts in `scripts/ai-courses/models/`), on
openly licensed data, exported to ONNX, kept small (a few MB):

- Draw a digit → a CNN classifies it live; see every feature map (3D).
- A character-level GPT (about a million parameters): type a prompt, see each
  head's attention and the next-token probabilities.
- A tiny diffusion model on 2D shapes and digits: watch every denoising step.
- word2vec trained on an open corpus: explore neighbours and analogies.

Each says what it is, what it was trained on, and its size. No pretend demos.

### 4.7 Paper walks and the paper map

- **Paper walk**: a guided read of one key paper next to the original (linked,
  never re-hosted): the problem, the idea, each key equation in our notation
  with its derivation, the experiment's main result (with the table number),
  what was later changed and by whom, and a small replication lab.
- **Paper map**: a Nexus-style map of all 210+ papers, by course and year,
  with edges for "builds on" (from OpenAlex citation data). Click a paper →
  its walk, the topics that use it, the open copy.

### 4.8 The course web on the site

- `web.json` (generated) drives a **course web map**, like the Nexus maps: every
  topic is a node, coloured by course; "needs" and "related" are edges. Click a
  topic to open it; your progress shows on the map.
- On every lesson: "What you need" (prerequisites with a warm-up), "Stuck?"
  (the whole prerequisite chain, nearest first), "Where this goes next" (used
  by, related, models). All from `web.json`, never typed by hand.
- **Look it up from anywhere:** every defined term is in the site search
  (`lib/lessonSearch.ts`), so typing "softmax" or "KV cache" opens the lesson
  that teaches it.
- The **models timeline** (`sources/models.json`): each model links to the
  lessons that explain its parts, and says honestly how much its makers
  published.

### 4.9 "Inside the machine" scenes (for How Big Models Are Built)

- **A GPU in 3D**: streaming multiprocessors, warps executing in lock-step,
  tensor cores; a tiled matrix multiply running block by block, with memory
  traffic counted against the roofline.
- **The memory bar**: a model's memory (weights, gradients, optimiser state,
  activations) counted byte by byte for real model sizes, then split across
  GPUs by ZeRO/FSDP, tensor and pipeline parallelism.
- **A cluster in 3D**: GPUs in nodes and racks; an all-reduce moving around the
  ring; a pipeline schedule with its bubble.
- **A training run**: compute ≈ 6 × parameters × tokens, derived; loss curves
  and numbers taken only from published reports (with the table or figure
  number).
- **Inside a real model**: a walk through every layer of a real small open
  model (for example GPT-2 small, whose weights are openly released) on a
  fixed prompt, with activations computed offline by us and shipped as data;
  attention heads, induction heads and features shown on it.
- Honesty rule: for closed models (GPT-4, Claude, Gemini) we show only what
  their makers published, and say so on the page.

## 5. The pipeline for one topic (stages and gates)

Each stage has an owner (role) and a gate. A topic is one PR.

| Stage | Role | Output | Gate (must pass) |
|---|---|---|---|
| S0 Scope | Planner | Topic entry in `curriculum.json`: id, prerequisites, the one main idea, pages, papers, signature visual | `check-curriculum.mjs` passes; owner/lead approves the scope |
| S1 Sources | Librarian | Each paper and book section the topic uses is in `sources/*.json`; paywalled ones requested from the owner; the topic's `TOPIC-MAP.md` entry checked and the right pages found with `search.mjs` | `verify-sources.mjs` passes; every source read in the library |
| S1b Story and reading | Writer | The topic's story beat (problem → failed attempt → idea → what it unlocked) per [STYLE.md](STYLE.md); the matching chapters of the course's `reading` books read | Reviewer confirms the story and the "Read more" chapters |
| S2 Math | Math writer | Every definition and derivation, step by step, in our notation | Every derived result checked numerically (`golden/` test); a second reviewer redoes each step |
| S3 Worked numbers | Math writer | The tiny example, every number | Numbers produced by the tensor engine and matched by NumPy |
| S4 Scenes | Visual engineer | 2D/3D scenes on the tiny and the real example | Teaches one idea per scene; step mode; reduced motion; axe 0; phone width |
| S5 Paper walk | Librarian + math writer | The paper section(s) | Each claim cites the paper (section/equation/table); no copied text or figures |
| S6 Lab | Lab engineer | From-scratch NumPy lab, hidden tests, solution | Reference solution passes; three wrong solutions fail with the right message |
| S7 Checks | Question writer | Quiz, numeric questions, judged problems | Every answer computed, explanations derived |
| S8 Review | Reviewer (different model family) | Review notes | Ladder (nothing used before taught), math, clarity, look |
| S9 Ship | Lead | PR, screenshots | `npm test`, `tsc -b`, oxlint, build, axe 0 light/dark/phone, CI green |

## 6. Verification (nothing wrong reaches a student)

- `scripts/ai-courses/verify-sources.mjs`: every source is real (done; run it
  on every PR that touches sources).
- `scripts/ai-courses/check-curriculum.mjs`: the ladder (prerequisites come
  first, no cycles, every paper id exists).
- `scripts/ai-courses/golden/` (to build, Python): for each topic, the worked
  example and every derived formula recomputed with NumPy/PyTorch; gradient
  checks by finite differences; the tensor engine's outputs compared to the
  same seeds. Runs in CI.
- Labs: reference solution passes, known wrong solutions fail.
- Visual: the page checker (`client/scripts/check-page.cjs`) on every new page
  in light, dark and phone, axe 0.

## 7. Phases

| Phase | What | Done when |
|---|---|---|
| P0 Sources and plan | This folder: verified papers, books, courses; rules; curriculum | Done, except the 11 hand checks and the owner's 30 downloads (sources/DOWNLOAD.md) |
| P1 Engine | 4.1 tensor engine + tape, 4.2 views, 4.4 derivation stepper, golden tests | A demo page runs a 2-layer net forward and backward with every number, checked against NumPy |
| P2 Pilot | Foundations ch. 0 and Deep Learning ch. 1 ("one neuron" to "backprop"), end to end, with 4.3 (3D loss surface) and 4.5 (Pyodide lab) | The owner approves the pilot's look, depth and pace. This sets the voice for everything else. |
| P3 Build out | Courses in ladder order; several agents in parallel on topics whose prerequisites are done | Each topic passes S0–S9 |
| P4 Models and maps | 4.6 small models, 4.7 paper map | Each model page states its data and size |
| P5 Keep current | Monthly: new important papers (arXiv cs.LG/cs.CL/cs.CV), errata, student questions | Registry and topics updated, checks green |

## 8. Where things go (proposed, settled in P1)

```
docs/ai-courses/                 the plan, rules, curriculum, sources (this folder)
docs/ai-courses/private/         paywalled PDFs and downloads (git-ignored, never committed)
client/src/ai/engine/            tensor engine, autodiff, tape
client/src/ai/views/             2D views for the viz player
client/src/ai/three/             3D scenes (lazy-loaded)
client/src/ai/math/              derivation stepper, linked symbols
client/src/ai/lab/               Pyodide lab runner
client/src/learn/content/ai/<course>/<topic>/   the lessons (like the DSA course)
scripts/ai-courses/              verify-sources, check-curriculum, fetch-open, golden/, models/
content/nexus/                   existing ml, deep, nlp, … subjects link to the new lessons
```

The Nexus subjects that already exist (`ml`, `deep`, `genai-llms`, `nlp`,
`computer-vision`, `reinforcement-learning`, `prob`, `statistics`, `calc`) get
their lesson links from these courses; their skill trees stay.
GATE Data Science & AI (DA) topics are tagged in `curriculum.json`, so a GATE
DA student can follow just those.
