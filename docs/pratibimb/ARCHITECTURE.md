# Pratibimb black box: the layer architecture

Owner's brief (2026-11-26): our own technology, built layer by layer. The first layer takes the features we
extract from the person; every next layer adds something to the output. The output: a **decent-looking human
(not ultra-high-end 3D) that resembles the person, can do every physical thing a person does with their upper
body, talks in their voice, with good lip sync.** Every layer is designed from published research (cited), has
a measurable check (a gate) and is built and tested before the next.

```
capture ─► L0 ─► L1 ─► L2 ─► L3 ─► L4 ─► L5 ─► L6 ─► L7 ─► L8 ─► L9 ─► L10   (the body you see)
                                                                   ▲
 text ─► L14 brain ─► L12 voice + phonemes ─► L13 face performance ┤
                       L11 physical actions (skeleton motion) ─────┘
                                       L15 gates on everything
```

Each layer is a module in `scripts/pratibimb/engine/` with one input, one output, its own test, and its own
gate. A layer is "done" only when its gate passes on the bench (8 people, held-out data).

---

## Shape layers (who the person is)

### L0 Capture and extraction (done)
- In: consented photos and video and voice. Out: identity pack (`pack.py`).
- Per frame: 478 face points, 52 expression values, head pose, 33 body points, 21 points per hand, person
  mask, colours (white-balanced on the eye whites), voice with speaking times.
- Gate: main person found by identity; still pictures and covered faces rejected; coverage meter.

### L1 Canonical face (done)
- In: all frames' face points. Out: the person's neutral 3D face in a fixed head frame and metric scale.
- Method: iterative generalised Procrustes on stable points; fixed axes from eye corners and chin; scale from
  the iris (11.7 mm) and pupil prior, combined with its uncertainty.
- Research: Gower 1975 (generalised Procrustes); iris diameter constancy (Hashemi et al. 2015).
- Gate: held-out face error < 2% of eye distance (measured: 1.05%).

### L2 Personal expression space (done; upgrade planned)
- In: L1 face per frame + 52 expression values. Out: their own map "expression values → face shape".
- Method now: ridge regression (linear blendshapes learned from their own frames). Upgrade: a small
  per-person network with a symmetry prior and corrective shapes for combined expressions.
- Research: Lewis et al. 2014 (blendshape practice); example-based facial rigging (Li et al. 2010).
- Gate: held-out shape error < 2% (measured 1.05%); lip-opening follows the real mouth (r ≥ 0.9; measured 0.97).

### L3 Full head (to build)
- In: L1 face (front only). Out: a closed head: skull, back of head, ears, jaw line, neck.
- Method: our own statistical head prior: a principal-component model of closed heads, built from the
  consented bench people (their face points plus silhouettes from side views), fitted to the face by
  least squares; ears placed by proportion and adjusted to the side-view silhouette.
- Research: morphable models (Blanz & Vetter 1999) as the idea, with our own data (no FLAME or SMPL).
- Gate: silhouette overlap with side views ≥ 0.9 (IoU).

### L4 Skeleton and proportions (built, to refine)
- In: 33 body points over all frames, measured scale. Out: a skeleton (spine, neck, head, shoulders, arms,
  wrists, 5 fingers × 4 joints) with the person's bone lengths.
- Method: bone lengths from the median of visible frames; missing ones from anthropometric ratios
  (shoulder-width based), clamped to the human range.
- Research: anthropometric tables (Drillis & Contini 1966; NASA-STD-3000 ratios).
- Gate: bone ratios inside human ranges; reprojection of the skeleton onto the frames < 4% of shoulder width.

### L5 Hands (to build properly)
- In: 21 hand points when visible; L4 proportions. Out: two hands with 27 degrees of freedom each and
  human joint limits.
- Method: finger lengths from the hand points (or proportions); joint limits from biomechanics; a hand
  pose space (PCA) from captured hand frames for natural shapes.
- Research: hand kinematics and joint limits (Lee & Kunii 1995; Cobos et al. 2008); low-dimensional hand
  synergies (Santello et al. 1998).
- Gate: every pose in the gesture library respects joint limits; fingertip reprojection error < 5 px at 512 px.

### L6 One watertight body surface with skinning (to build)
- In: L3 head, L4 skeleton, L5 hands. Out: one closed mesh of the upper body with smooth skin weights.
- Method: implicit surface (sum of bone-aligned ellipsoids, as now), meshed by marching cubes and smoothed;
  skin weights by heat diffusion from bones, so elbows, wrists and knuckles bend without tearing; the head
  joins the neck with a blended seam.
- Research: Pinocchio heat-diffusion skinning (Baran & Popović 2007); dual-quaternion skinning (Kavan et al.
  2008) to avoid the "candy wrapper" twist.
- Gate: no self-intersection in any library pose; volume change at elbows < 10%.

## Look layers (how they appear)

### L7 Skin and face colour (built in part)
- In: the person's frames (masks) + L6 surface. Out: an albedo map (their colours without the room's light).
- Method: learned colour points (built, `splats.py`) or a texture map on L6 per vertex; room light removed
  per frame with order-1 spherical harmonics (built in `build.py`); features (brows, lips, eye rims) kept
  crisp. Option: a "decent" mode that simplifies the albedo into clean regions (skin, lips, brows).
- Research: spherical-harmonic lighting (Ramamoorthi & Hanrahan 2001); intrinsic decomposition.
- Gate: face likeness by SFace on held-out frames ≥ 90% of the person's own frame-to-frame similarity.

### L8 Eyes and mouth interior (to build)
- In: L1 eye and lip rings, iris colour. Out: eyeballs (sclera, iris, pupil, cornea highlight) that rotate
  with gaze; teeth (upper fixed to the skull, lower to the jaw) and a tongue with 4 shapes.
- Research: eye geometry (Bérard et al. 2014, simplified); tongue shapes for speech (JALI, Edwards et al. 2016).
- Gate: eyes never show the inside of the head at ±30° gaze; teeth visible exactly when the lips part.

### L9 Hair (to build)
- In: hair mask outline per frame, hair colour, length and parting. Out: hair as card strips (clumps) on the
  scalp that follow the head and sway a little.
- Method: fit the outline from several angles, grow clumps from the scalp along a guide field, simple
  spring dynamics for sway.
- Gate: hair silhouette overlap with the frames ≥ 0.8 (IoU).

### L10 Clothes and the renderer (built in part)
- Clothes: garments as offset surfaces of L6 with collars and sleeves; switchable colours.
- Renderer: our own WebGL (browser) renderer: soft studio key, fill and rim light; "decent" quality target
  (not film-grade); transparent background; 30+ fps on an ordinary laptop.
- Gate: 30 fps at 720p in a mid-range browser.

## Motion layers (what they do)

### L11 Physical actions (to build)
- In: an action request ("point at (x, y)", "namaste", "count three", "hand on chest", "shrug", "lean in").
  Out: skeleton motion for L6.
- Method: (a) inverse kinematics (FABRIK) for reaching and pointing at any screen target; (b) a library of
  parameterised gestures (namaste, count, open palms, beat, wave, thumbs up, shrug, think) written as key
  poses with timing; (c) joint limits and simple balance; (d) idle life: breathing, weight shifts, micro
  head motion. Any new action = a new key-pose entry, no code change.
- Research: FABRIK (Aristidou & Lasenby 2011); gesture phases preparation–stroke–retraction (McNeill 1992;
  Kita et al. 1998); procedural idle motion (Perlin 1995).
- Gate: no joint outside limits; hands never pass through the body; pointing lands within 2% of the target.

### L12 Speech and lip sync (built in part)
- In: text + language. Out: audio + phoneme timeline + 52 mouth values per frame.
- Method: voice with phoneme timings (HeadTTS now; the person's cloned voice later); phonemes → IPA →
  viseme classes (built, `phonemes.py`); **coarticulation** by dominance functions (each sound's target
  blends with its neighbours by how strongly it controls the lips), plus the jaw/lip split of JALI; p/b/m
  always close, f/v always touch the teeth.
- Research: Cohen & Massaro 1993 (coarticulation dominance); JALI (Edwards et al. 2016); viseme classes
  (Fisher 1968).
- Gate: our lip check (all p/b/m closed, f/v on teeth: built); audio–video offset ≤ 40 ms.

### L13 Face performance (to build)
- In: L12 timeline + emotion tags. Out: blinks, brows, gaze, head motion, emotions on top of the lips.
- Method: blink timing from the person's own captured blink rate; brow raises and nods on stressed syllables
  (pitch and loudness); gaze aversion when thinking, back to the student at turn ends; emotions as blended
  expression presets.
- Research: blink statistics (Bentivoglio et al. 1997); speech-driven head motion (Busso et al. 2007);
  gaze in conversation (Kendon 1967).
- Gate: blinks per minute within the person's own range ±20%.

### L14 Brain and conversation (exists as Guru)
- Guru tutor with lesson grounding, Leak Guard and hint ladder; outputs the text + emotion + action tags for
  L11–L13; turn-taking (listen, nod, answer).

### L15 Gates (everything)
- One test run (`engine/test_engine.py` grows per layer) and the bench report: likeness, shape, lips,
  physical plausibility, speed. Nothing ships if a gate fails.

---

## Build order (one layer at a time, each tested before the next)
1. L6 surface + skinning (on the existing L4 skeleton) → 2. L5 hands → 3. L11 physical actions
→ 4. L8 eyes and mouth → 5. L12 coarticulation → 6. L13 face performance → 7. L3 full head
→ 8. L9 hair → 9. L7 decent-mode skin → 10. L10 renderer polish → then the whole black box on the bench.

Rules: no photo pixel is pasted on (L7 learns colours only); no outside body model or asset; outside open code
only where its licence allows commercial use and it is recorded here.
