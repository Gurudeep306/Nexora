# Nexora Stage: the animation library for every course

Stage is how every AI course shows ideas working, in 2D and 3D. A lesson
adds one block, `{ t: 'stage', scene }`, and the scene plays on its own with
everything below built in. Live examples: `/ai-lab` (signed in).

Code: `client/src/ai/stage/` (the library) and `client/src/ai/three/` (the 3D
frame, primitives and studio look). Tests: `tests/stage.test.js`.

## What every scene gets for free

- **2D and 3D in one scene.** It can start as a flat diagram and rise into 3D
  on cue (`dim` on a step), or at the student's click (the 2D / 3D switch).
  The camera swings up and the lens narrows (a dolly zoom), and heights grow
  out of the page: a heat map becomes a surface, tiles become bars, a matrix
  stacks into a tensor, a network's neurons fill up.
- **Time.** Steps play on their own when the scene scrolls into view, every
  number glides between steps, there are reading breaks (`pause`), a
  scrubber, ½× / 1× / 2× speed, and keys (space, comma, full stop).
- **A guided camera** (`view` per step) that hands over when you drag;
  "Follow the tour" hands it back. Arrow keys turn, + and − zoom, 0 resets.
  In flat 2D the same view is seen from straight above, so it pans and zooms.
- **Focus** (`focus`): the step's subject stays bright, the rest dims.
- **Linked words**: in a caption, `[the weights](#W1)` lights up element
  `W1` when the student points at the words.
- **Live formulas** (`tex`): KaTeX with the step's real numbers.
- **Hover** any element for its exact value.
- **Numbers on grids** are drawn onto one flat sheet per grid
  (`NumberPlane` in `three/prims.tsx`), not one page label per cell, so big
  scenes stay smooth. A sheet shows only when its cells are big enough on
  screen to read; zoom in to see more. In 3D the values become heights.
- **The studio look**: matte porcelain materials, studio light panels,
  ambient occlusion and a soft ground shadow (3D only; none in flat 2D),
  smooth edges. Theme colours only; no glow.
- **Accessible**: a text description, keyboard control, reduced motion
  (no autoplay, whole steps), a 2D fallback without WebGL, axe 0, phones.

## A scene

```ts
{
  version: 1,
  title: 'Attention: who looks at whom',
  description: 'The whole scene in words, for screen readers…',
  dim: 2,                                   // start flat
  camera: { position: [3, 4.5, 5.8], target: [0, 0.4, 0] },
  params: { rho: 0 },                       // named numbers for formulas; they glide too
  elements: [
    { id: 'grid', type: 'bars', values: [[…]], numbers: true },
    { id: 'bell', type: 'surface', f: 'exp(-(x^2 + y^2) / 2)', range: [-3, 3] },
  ],
  steps: [
    { label: 'Raw scores', caption: 'Each [cell](#grid) is q·k / √d.', tex: 's_{ij} = …' },
    { label: 'Softmax', set: [{ id: 'grid', set: { values: [[…]] } }], pause: true },
    { label: 'Rise into 3D', dim: 3, focus: ['grid'], view: { camera: […], target: […] } },
  ],
}
```

Coordinates are maths coordinates: x right, y away, z up. Colours are roles
(`tone`): ink, ink2, muted, hair, accent, info, success, warning, error.
Formulas use x, y, the scene's `params`, pi, e and the usual functions
(sin, exp, log, sqrt, tanh, sigmoid, relu, max, …); they are parsed safely,
never run as code, and a typo fails when the scene loads.

`validateStage(scene)` lists every problem in plain words; the lesson block
shows them instead of a broken scene.

## The kits

| Kit | Elements | Use it for |
|---|---|---|
| Maths | `surface` (formula or grid), `contours`, `field` (vector field), `points`, `path`, `line`, `arrow`, `label`, `axes`, `lattice` (space moved by a 3 × 3 matrix), `ellipsoid` | Functions, loss surfaces, gradients and score fields, data clouds, linear maps, eigenvectors, probability densities |
| Data | `tiles` (a matrix or image), `bars` (values as heights), `tensor` (depth × rows × columns) | Matrices, attention weights, images and feature maps, tensor shapes, histograms |
| Flow | `beads` (from → to along an arc, by `progress`) | Signals, products flying into a sum, samples moving |
| Neural networks | `network` | A network that computes: jars that fill with each activation, weight ribbons (thickness = size, colour = sign), beads sized by each contribution w·a, the activation curve squashing z into a, the weight matrices beside each layer, and the backward pass (`forward` 0 → L−1 and `backward` 0 → L glide between steps) |
| Plots | `curve` (y = f(x) or x(t), y(t); `upTo`, `fill`, `riemann`, `tangent` + `h` for a secant), `chart` (`line` with log axes, `bars`, `hist` counted from real `samples`) | Functions, derivatives, integrals, Taylor series, loss curves, scaling laws, distributions, histograms. Charts stand up in 3D |
| Shapes | `shape` (circle, ellipse, rect, polygon, box, sphere), `plane` (point + normal), `region` (a classifier's decision from its formula, with a smooth boundary) | Norm balls, Venn diagrams, IoU, planes meeting, column spaces, decision boundaries (logistic, SVM, k-NN, trees) |
| Graphs | `graph` (`layout`: given, tree, layered, ring; weighted, directed edges; beads with `flow`, `reverse` for the backward pass; `lit`) | Computation graphs, backprop, decision and search trees, MDPs, HMM trellises, GNN message passing, GPU rings |
| Vision | `image` (grey or RGB pixels; `split` channels into layers, `relief`, `patch` grid, `window`), `boxes` | Images, convolution, ViT patches, receptive fields, detection boxes |
| Language | `tokens` (chips with `probs` bars, `highlight`, `masked`, `upTo` for generation, `vertical`) | Tokenisation, BPE, n-grams, masked and causal language models, decoding, bits of a float |
| Reinforcement learning | `gridworld` (`walls`, `rewards`, `values` as heat and height, `policy` arrows, `agent`, `trail`) | MDPs, Bellman updates, value iteration, TD, Q-learning, policies |
| Systems | `membar` (memory against a capacity, split across `devices` with `sharded` parts), `timeline` (lanes × blocks, a `now` cursor) | GPU memory budgets, ZeRO/FSDP, pipeline bubbles, streams, schedules, checkpointing |
| Code and tables | `code` (lines, the `active` one, `vars` made so far), `table` (cells can be marked) | Code run line by line, small data tables, Q-tables |

Every element glides between steps: numbers, lists and objects (graph nodes, boxes, segments) blend; integers such as `riemann` or `devices` round as they go.

**Every topic is covered.** `client/src/ai/stage/coverage.ts` lists, for every topic in `curriculum.json`, the elements that draw its visual. A test fails if a topic is missing or names an element the library does not have. On `/ai-lab`, "Every kit at work" shows one computed scene per kit (`stage/kitDemos.ts`): secant to tangent and Riemann sums, dice averages and the central limit theorem, logistic regression learning its boundary, values forward and gradients back through a graph, a convolution, IoU, next-word probabilities from counts, value iteration on a grid world, the memory to train a 7B model and ZeRO-3, the pipeline bubble, and code run line by line. Copy them when building a lesson.

**Many scenes on one page.** Browsers allow about 16 live 3D views at a time, so a scene only holds its 3D view while it is near the screen (within about a screen's height) and frees it when far away. A lesson can have as many scenes as it needs.

The registry (`stage/registry.ts`) maps every element type to its drawer,
and TypeScript refuses to build if a type has none.

## Scenes from a computation (the generator)

Write the computation on the tape (`engine/tape.ts`): `input`, `param`,
`matmul`, `add` (with a bias row), `mul`, `scale`, `transpose`, `tanh`,
`sigmoid`, `relu`, `softmax`, `bce`, `mse`; call `backward(loss)`. Then
`traceScene(tape, { title, description, loss, notes })` (`stage/trace.ts`)
builds the scene: every matrix as a grid of its real numbers, laid out in
the order it was computed; one step per operation, with beads from exactly
the cells that feed each result; the formula with real names and shapes; the
camera framing the operation's inputs and result; a rise into 3D; and every
gradient, back to the weights. The tape is checked
against finite differences in the tests.

Use the generator for whole models (an MLP, an attention head, a transformer
block); use hand-written scenes when a single idea needs its own picture.

## Adding a kit

1. Add the element type and its fields to `StageElement` in `spec.ts`, and
   its checks to `validateStage`.
2. Write the drawer in `stage/kits/<kit>.tsx` with the shared helpers
   (`kits/shared.ts`: `at3` for the 2D/3D lift, `toneColor`, `fmt`,
   `useFormula`) and the shared material `Mat` (`three/studio.tsx`).
3. Register it in `registry.ts` (and in `KITS`, for the catalogue).
4. Add a test scene to `tests/stage.test.js` and a demo to `/ai-lab`; check
   light, dark and phone with axe 0.

Kits planned next, as the courses reach them: vision (images, convolution
windows, bounding boxes), language (token strips, embeddings, attention
arcs), reinforcement learning (grid worlds, value columns, policy arrows),
systems (GPUs, memory levels, parallelism), graphs (nodes and messages).
