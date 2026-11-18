# How the AI courses animate everything

The rule from the owner: every idea is **shown working**, and plays on its
own: Play, autoplay and smooth motion, not a picture. 3D scenes are real
meshes you can drag, zoom and step through. This file is the contract for
every scene in every AI course. The working engine and seven example scenes
are at `/ai-lab` (signed in).

## 1. The technology (and why)

| Layer | What we use | Why |
|---|---|---|
| 3D rendering | **three.js** (WebGL 2) through **React Three Fiber** | The most mature free web 3D engine; React components for every object, so scenes are code we can test and review. MIT licence. |
| Camera, lines, labels | **drei**: `OrbitControls`, `Line` (thick anti-aliased lines), `Html` (labels in the page's own fonts) | Drag to turn, pinch or scroll to zoom, right-drag to pan, with damping; labels stay crisp and readable by screen readers. MIT. |
| Time | **Our own clock** (`Scene3D`): continuous time `t` in steps | Plays, pauses, scrubs forwards and backwards, replays exactly, changes speed. A tween library can't scrub a computed scene backwards. |
| Numbers | **Our engine** (`client/src/ai/engine/`): linear algebra, optimisers, a small network with backprop, convolution, PCA | Every number on screen is computed, never typed in. Same seed → same scene on every visit. Checked against NumPy in the golden tests. |
| Math | **KaTeX** (already in the site) | Fast, offline, accessible (MathML). |
| 2D step views | The existing **viz player** (`client/src/viz/`) | For matrices, graphs, arrays and code tracing, where 3D adds nothing. |
| Later | WebGPU renderer (three.js has it) | Faster for big scenes, but drei's lines and labels don't fully support it yet. Switch when they do; the scene code stays the same. |

Bundle: the 3D code loads only on pages that use it (about 270 KB
compressed); every other page is unaffected.

## 2. Which kind of scene for which idea

| The idea is about… | Use | Primitives (`client/src/ai/three/prims.tsx`) | Example in `/ai-lab` |
|---|---|---|---|
| A function of two variables (loss, density, a network's output) | 3D surface mesh + contours on the floor | `SurfaceMesh`, `Contours` | Optimisers, XOR, Gaussian |
| An algorithm moving through space (descent, sampling, a policy) | Path that grows + ball at its head + direction arrow | `PathLine`, `Arrow` | Optimisers |
| A matrix or linear map | Space itself bending: lattice + sphere → ellipsoid, eigenvectors | `GridWarp`, `Arrow`, `Axes` | Matrix bending space |
| Data points, embeddings, clusters | Point cloud in 3D, coloured by class, turning between views | `Points3D`, `Label` | PCA of Iris |
| A network computing | Nodes and weighted edges; beads travel forward (signals) then back (gradients) | `Line`, `Bead`, `Label` | Forward then backward |
| Images, feature maps, matrices of values | Raised tiles; a window glides; results carried to the output | `CellGrid`, `Line` | Convolution |
| Something changing with a parameter (correlation, temperature, step size) | The parameter on the clock; the shape morphs | any | Gaussian |
| Order of operations on discrete things (arrays, trees, code) | The 2D viz player, step by step | viz views | DSA course |

Scenes planned for the rest of the curriculum, by the same table:
attention (queries and keys as vectors, the score matrix as tiles, values
mixed), diffusion (2D points noised then denoised, the score field as
arrows), a transformer block (a token's vector through each piece), the KV
cache and FlashAttention (tiles moving between memory levels), a GPU (blocks
of threads on a tiled matrix multiply), data/tensor/pipeline parallelism
(GPUs as tiles, an all-reduce moving round a ring), RL (a grid world in 3D,
values rising as columns, a policy as arrows).

## 3. How time works (Scene3D)

- A scene has **steps** (`SceneStep[]`: a label and a plain-words note
  that names the real numbers of that step) and draws itself from
  `{ step, t, frac, p, reduced }`.
  - `t` is continuous time in steps (0 … steps − 1). Use it for anything
    that should glide: `PathLine upTo={t}`, a map at `t / T`, a window at
    the step plus the fraction.
  - `step` is the current whole step (for labels and what is "done").
  - `frac` is the eased fraction into the current step (for beads moving
    along an edge, nets part-way between two snapshots).
- **Autoplay:** each scene plays once, from the start, the first time most
  of it scrolls into view. Then: Pause, Replay, step back and forward, a
  scrubber, and ½× / 1× / 2× speed.
- **Reduced motion** (`prefers-reduced-motion`): no autoplay; Play moves
  whole steps with a pause between them; no damping on the camera.
- The step note is read to screen readers when it changes while paused
  (`aria-live` is off while playing, so it isn't noisy).

## 4. Rules every scene follows

1. **Teach one idea.** If a scene shows two ideas, split it. No decoration.
2. **Real numbers only**, from the engine; the note under the scene names
   them ("Gradient descent: f = 0.011").
3. **Show the mechanism, not just the result**: something moves to explain
   *why* (the gradient arrow, the bead of a signal, the window and the line to
   its output cell).
4. **Colour means something**, theme tokens only (read through
   `usePalette3D`, so every theme and light/dark work): ink = values and the
   main thing; `state-info` = gradients and the second series; accent = the
   current item and the third series; `state-error` = loss. No glows, no
   bloom, no gradients, no shadows; surfaces are matte.
5. **Honest geometry:** equal scales on axes unless the page says otherwise;
   a fixed height scale when a shape changes (the bell visibly rises).
6. **Readable from the first frame**: a framing that shows the whole scene;
   the camera backs off by itself on narrow screens; "Reset view" returns
   there.
7. **Accessible:** the view is focusable (arrow keys turn, + and − zoom, 0
   resets, space plays, comma and full stop step); a text description of
   the whole scene; a 2D fallback when WebGL is missing; axe 0.
8. **Phones:** no sideways scroll at 360 px, controls wrap, pinch to zoom.
9. **Performance:** render only when something changes (`frameloop`
   "demand"); instanced meshes for many objects; pixel ratio capped at 2.
10. **Checked:** every new scene is screenshot in light, dark and phone,
    mid-motion, with axe 0 (the script used for `/ai-lab` is the model).

## 5. Adding a scene

1. Compute what it shows in `client/src/ai/engine/` (add a golden test).
2. Write it with `Scene3D` and the primitives; give it steps with real
   numbers in their notes.
3. Check it: typecheck, lint, build, then the browser check above.
