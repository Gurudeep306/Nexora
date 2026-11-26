# Pratibimb paper: change log

## v1
Written by the author agent: 98 layers in 11 stages.

## v2
Editor of round 1 (reviews: graphics R1G, motion R1M, speech R1S, systems R1X). 98 layers → 95 (L0–L94),
renumbered from Stage C on; §5.12 regenerated from the layer texts. New §2.6 "Owner decisions needed"
(D1–D10), §7.4 server cost, §8.6 build order. Sources re-checked by the editor: MakeHuman licence page (core
assets CC0, code AGPL/GPL), Chatterbox README (archived August 2026; Hindi checkpoint; Turbo/Nano English
only), AudioSeal README (MIT including weights).

Key judgements where reviewers converged or disagreed:
- **One owned template mesh** (R1G-6, R1X-8, R1G-14, R1X-15): accepted. Two reviewers independently found the
  per-person mesh chain the largest source of risk and the reason nothing could be authored once. The
  MakeHuman licence page says core assets are CC0; the older readme's AGPL wording is recorded as owner
  decision D2, with our own template as plan B.
- **Build-time painter that sees only our renders** (R1G-7 texture-space bands, R1X-1 diffusion painter):
  merged. R1G-7's light/half-tone/shadow band textures chosen at run time are the default, because painted
  light baked into one texture would turn with the head; the painter is procedural by default (`paint.py`),
  and R1X-1's diffusion painter becomes an optional variant that produces the same band textures, gated on
  an owned style kit and a confirmed base-model licence (D3, D9).
- **SFace as the likeness gate** (R1X-7, R1G-4): accepted. SFace is photo-trained and partly trained on a
  withdrawn dataset; S1 is now rank-1 identification under a style-independent geometric score plus SFace
  as a check only, and L24's search is driven by the geometric score (SFace may veto, never choose). The
  general check-only rule (L3, D6) also covers ECAPA and XLSR.
- **The albedo-blur question** (R1G-10, R1X-22): parametric colour is the default; the band-limited field
  is an owner decision (D1) with an ablation; L45's tautological test is replaced by an information-budget
  certificate and, for the field only, a 2–6 cycle band test.
- **Caricature** (R1G-21, R1X-4): proposed independently by two reviewers; accepted into L24 with an ablation.

Accepted (id → what changed):
- R1G-1 → new L52 shading-normal field (authored blend weights and forced light/dark offsets on the template).
- R1G-2 → new L55 key-light cast shadow (1024², stylised) and baked per-vertex occlusion on rest pose and targets.
- R1G-3 → new L58 anti-aliasing (4× MSAA, alpha-to-coverage, morphological AA on "basic").
- R1G-4 → geometric likeness score in L24; S1 rewritten.
- R1G-5 → L44 eye optics: iris parallax, limbal darkening, tear line, caruncle.
- R1G-6 → Stage D replaced by L33 template, L34 template fit (landmarks + non-rigid ICP + Laplacian), L35–L38.
- R1G-7 → L53 build-time painter (band textures), L54 run-time band choice; Kuwahara removed from the frame.
- R1G-8 → L59 forward render graph (colour + one id/velocity target); WebGL2 complete, WebGPU optional.
- R1G-9 → L56 inverted-hull lines on WebGL2, compute contours on WebGPU.
- R1G-10 → L40 parametric colour default, L42 rewritten, owner decision D1, ablation in §8.5.
- R1G-11 → L47 clump library first, ribbons only for flyaways; L48 spines.
- R1G-12 → L41 artist-authored Monk table; form carried by rim and bounce on deep skin; per-texel colour.
- R1G-13 → L59 Kuwahara out of the shipped path (bake tool in L53); TAA off by default in L58.
- R1G-14 → merged into the template layers (L33–L38).
- R1G-15 → old L47 merged into L41 (shine level per region, no measured roughness, palette subsurface tint).
- R1G review note on L23 crease curves → L22 keeps a curve only if it follows expressions and is not a fixed image edge.
- R1G-16 → §8.6 week-1 spike frame before Stage F code; active-morph evaluation in L37.
- R1G-17 → L60 premultiplied alpha before any neighbour read; fringe test in the gate.
- R1G-18 → resolved by the template (no oval seam; five-finger template hands).
- R1G-19 → §7.1 rebudgeted (≈ 153 s critical path).
- R1G-20 → D2 and the L3 pin.
- R1G-21 → L24 caricature term (untested; ablation).
- R1M-1 → L79 scapulohumeral rhythm; correctives keyed on the combined angle (L37).
- R1M-2 → L81 task-space minimum-jerk paths, Fitts-like duration; L82 swept capsules; S7 per frame.
- R1M-3 → L76 `join(hands, frame)` primitive; namaste re-specified (head–neck bow).
- R1M-4 → L77 framing constraint and gate.
- R1M-5 → L83 rest poses from L16.
- R1M-6 → new L84 secondary dynamics, clamped after filtering.
- R1M-7 → L72 emotion drives body scalars.
- R1M-8 → L75 vestibulo-ocular stabilisation and its gate.
- R1M-9 → L79 analytic two-bone IK with filtered swivel; FABRIK only for comparison.
- R1M-10 → L81 apex on the pitch accent, onset solved backwards, energy alignment.
- R1M-11 → L83 speech-planned breathing; quiet breathing only when idle.
- R1M-12 → L83 Perlin noise on hands removed; sway and settling.
- R1M-13 → L74 eye–head order fixed; amplitude-dependent head share.
- R1M-14 → L11/L29 three numbers per hand by reprojection; ruler gate on the bench.
- R1M-15 → L85 per-joint crossfades and post-mix clamp; acceleration gate.
- R1M-16 → §5.0 effect sizes instead of KS p-values; L74 gate.
- R1M-17 → L78 arm line on target, vertical bias, gaze; S8 becomes a perception test.
- R1M-18 → L30 learned plausibility field removed.
- R1M-19 → old L86 merged into L79 (torso extension).
- R1M-20 → L77 learned scorer removed; LLM tags plus rules.
- R1M-21 → L78 observer-solved deixis with disambiguators (untested).
- R1M risks → twist and deltoid helper joints and A-pose bind (L27), scroll-following target filter (L78),
  thumb opposition range for phalanx counting (L29), shoulder weights smoothed for garments (L36, L49),
  hands judged as rendered silhouettes (L80).
- R1S-1 → L62 pronunciation lattice, L64 lattice alignment drives the lips; S3/S4 on realised phones.
- R1S-2 → L71 replay gate; S6 rewritten.
- R1S-3 → L92 closure hold; L68 minimum hold; S3 with injected frame drops.
- R1S-4 → L92 output-latency calibration; S5 made asymmetric (lead ≤ 80 ms, lag ≤ 40 ms).
- R1S-5 → L86 echo guard; push-to-talk default without AEC; S11 echo test.
- R1S-6 → new L65 personal phrase bank.
- R1S-7 → L91 speculative drafting; Voice-Light credited in L87, L90, L91 (L90 "Ours" removed).
- R1S-8 → L87 tutoring wait time (Rowe 1986).
- R1S-9 → L63 Hindi checkpoint, vendored archive, second engine, per-language references (L15),
  `cfg_weight` rule, one clause per call with Devanagari respelling (L61), exaggeration mapping, join gate.
- R1S-10 → L68 banded QP with must-hit equality constraints.
- R1S-11 → L64 alignment always; acoustic closure fallback.
- R1S-12 → L86 streaming VAD + turn-aware ASR, L87 hybrid endpointing, no VAP weights; §7.3 rewritten with
  recognition time; IndicFDB as comparison only.
- R1S-13 → L88 ≈ 1 per 12 s, visual-only while the student talks, neutral set chosen perceptually; S12.
- R1S-14 → L88 agreement only on final, confident transcripts; no concern faces on partials; vocabulary bias in L86.
- R1S-15 → L89 streamed text with inline tags; Leak Guard per clause before synthesis; streaming-order test.
- R1S-16 → Stage H mouth path runs on the server with the voice; values shipped per chunk.
- R1S-17 → L66 AudioSeal as the one gated mark (MIT incl. weights, verified); Perth only if licensed and non-interfering.
- R1S-18 → old L75 merged into L64.
- R1S-19 → RETRO lip class merged into TD (L67); retroflex only in the tongue (L46, L70).
- R1S-20 → L68 personal coarticulation parameters (untested; ablation).
- R1S risks → §7.4 (running cost, D5), TTS latency marked UNVERIFIED in L63/§7.3, unmaintained dependency
  (L63), voice-to-consent match (L1, L15), S4 scored on realisations.
- R1X-1 → optional diffusion variant inside L53 (accept-with-changes: not the default; D9).
- R1X-2 → owned style kit as optional ground truth; S18 style distance once it exists; D3, D4.
- R1X-3 → same as R1G-1 (L52).
- R1X-4 → same as R1G-21 (L24).
- R1X-5 → new §7.4; D5.
- R1X-6 → new L0 bench as first deliverable; D10.
- R1X-7 → S1 rank-1 with a gallery; SFace check-only (accept-with-changes: the ≥ 50 impostors are synthetic
  hard negatives from the head prior plus the 7 other bench people, since 50 real people are not available).
- R1X-8 → same as R1G-6.
- R1X-9 → L64 aligner on the critical path; ready IPA recognisers as check-only prototypes; own recogniser to ship.
- R1X-10 → L63 pinned weights and a second engine.
- R1X-11 → S2 matched foils, ≥ 15 raters, CIs.
- R1X-12 → S16 monitored on the bench, gated on an extended set.
- R1X-13 → S3/S4 on rendered pixels plus blind raters.
- R1X-14 → L94 smoke bench per PR, full bench nightly.
- R1X-15 → old L35, L36, L37 removed; L38, L41 reduced to template data (now L36, L38).
- R1X-16 → old L39 merged into L37.
- R1X-17 → old L51 merged into L46.
- R1X-18 → L50 spring bones, cloth XPBD deferred; L48 hair spring chains.
- R1X-19 → learned parts of the gesture planner and turn-taking deferred until own data (L77, L87, L88).
- R1X-20 → old L21 folded into L20 as optional correctives.
- R1X-21 → same as R1G-11 (L47).
- R1X-22 → L42 information-budget certificate; patch test kept as a check.
- R1X-23 → L51 distinctiveness-aimed key as an option, off until its ablation passes (untested).
- R1X risks → warm-worker clock and cold start reported (§7.1, S13, D8), licence items moved into §6.3 with
  check-only status, consent for the style kit (D4), no series frames anywhere (§6.2), vertical slice (§8.6).

Rejected (id → why):
- R1G-7 (TAA as a required pass), R1X-1 (diffusion painter as the default path) → rejected as defaults only:
  the paint is on the surface, so TAA mainly smears speech, and a diffusion painter adds unmeasured build
  time, a licence question and a style model we cannot train until an owned kit exists. Both stay optional.
- R1G-10 option 2 (keep the field, rename it) as the default → rejected: the brief says the photo pixels
  themselves are never used, and the field's band carries identity; the owner may still choose it (D1).
- R1X-7 "≥ 50 impostor renders of real people" as stated → rejected: we do not have 50 consented people;
  replaced by synthetic hard negatives (see accepted).
- R1S-2 Fréchet Oral Distance as a gate → rejected as a gate (English-only reference, licence unverified);
  allowed as a secondary report.

CHANGE SIZE: large — the surface and rig chain, the painted-look method, the likeness gate, the colour model
and the conversation loop were all replaced; layers were added (bench, template and fit, shading normals,
shadows, anti-aliasing, phrase bank, springs) and others merged or removed (98 → 95); round 2
should check the new template, painter and lattice designs rather than expect only refinements.
