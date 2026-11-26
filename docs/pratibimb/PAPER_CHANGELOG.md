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

## v3
Editor of round 2 (reviews: art direction R2A, face science R2F, teaching R2T, buildability R2B). 95 layers →
93 (L0–L92): four merged away (v2 L21 asymmetry, L48 hair motion, L50 garment motion, L57 eyes and hair
highlights), two added (L22 salient marks, lid crease, hairline; L73 attention sharing); renumbered from L21
on; §5.12 regenerated from the layer texts (16 exist, 46 partial, 31 to build). Layer numbers below are v3
numbers unless marked "v2".

Checked by the editor this round:
- **Repository (R2B's central claim): confirmed.** `scripts/teacher/build-vrm-teacher.py` builds a MakeHuman
  person headless in Blender with MPFB, loads all 52 ARKit `faceunits01` and the 15 `visemes02` shapes,
  refuses any worn asset whose own file does not say CC0, enforces a 30–70k triangle budget and has a
  shape-keeping decimation; `scripts/teacher/fit/corr.py` and `corr.json` hold the 478-point correspondence
  on the base mesh; `fit/apply.py` is an RBF face fit (similarity alignment, damped depth, fade towards
  ears and neck, inner lips excluded); `maker/export_base.py` exports the base mesh as arrays; `maker/bench.py`
  and `likeness.py` are a bench harness with held-out clips and a cross-person control. L0, L33, L34, L35,
  L36, L38, L48 are now *partial*, with the files named.
- **Licence (D2): settled.** `docs/voice/licences/2026-11-25/mpfb2-LICENSE.md` (§C assets incl. base mesh,
  targets, rigs, expressions, clothes: CC0 1.0; §D: "no claim whatsoever" over exports and "graphical data
  generated via scripting"), the functional-pack records (CC0) and the clothes-pack note. The GPL code runs
  only internally and is never distributed. HeadTTS's licence is MIT (copy in that folder), so v2's
  "UNVERIFIED" is corrected.
- **three.js (R2B-6, R2B-7): confirmed** in the client's r187: `WebGLMorphtargets.js` allocates a Float32
  RGBA `DataArrayTexture` of all vertices × data slots × targets; `morphtarget_vertex.glsl.js` skips zero
  influences.
- **R2F-7 (the v2 likeness score always selects γ = 0): confirmed.** v2's score is a distance margin
  measured around the veridical face. With a = F − F̄, the render is γ‖a‖ from the truth and ≈ √(γ²‖a‖² + r²)
  from impostors at radius r; the margin's derivative γ‖a‖²/√(…) − ‖a‖ is negative for every γ > 0, and the
  nearest impostor (along a) gives r − 2γ‖a‖, also decreasing; the Procrustes term grows with γ. Under the
  other possible reading (impostors caricatured too, probe = photo) the optimum depends on r vs ‖a‖, i.e. on
  an arbitrary constant, which is no better. Either way the caricature advantage is perceptual and cannot be
  found by a veridical-distance score.

Key judgements where reviewers converged or disagreed:
- **Where the paint is made** (R2A-1 artist master set vs. R2B-9 procedural shared paint, R2B-10 "no
  artists"): both say *paint once on the template and recolour per person*; accepted as the architecture
  (L51). They disagree on who paints: the procedural painter makes the master set first (free); the week-1
  look spike decides; staff paint it in Krita only if it fails (D3 reduced). Recolouring runs in the shader
  (R2B-9), not as R2A-1's per-person Reinhard bake, which keeps L42 simple and lets look changes reach every
  teacher without rebuilds.
- **Shading proxy** (R2A-7 planar vs. R2F-12 spectral low-pass of the person): the spectral proxy is the base,
  because it keeps identity; R2A-7's authored planes are an optional snap on top, with an ablation.
- **Expression rig** (R2F-10 ICT expressions + example-based vs. R2B-5 `faceunits01` + correction): merged
  into L35 on `faceunits01` (same topology, CC0, already in the build) with Li–Weise–Pauly refinement; ICT
  expressions, eyes and teeth not adopted (a second template means seam work).
- **ICT-FaceKit** (R2F-9): accepted only as optional real-scan identity variation for the head prior, after
  owner decision D12 (scan subjects' consent and demographics unknown); the matched norm is built from
  published Indian anthropometric norms and consented builds instead.
- **Distinctiveness key**: removed (R2A-15 and R2F-16 independently).
- **Likeness gate**: S1 demoted to a mesh-based regression test, S2 the only likeness release gate (R2F-11,
  R2A-12a), with R2B-11's staffable rater plan.

Accepted (id → what changed):
- R2A-1 → L51 master band set on the template, recoloured per person (with changes: procedural first,
  run-time recolour, see above); per-person overlay only.
- R2A-2 → L52 broken terminator from a brush-edge threshold map.
- R2A-3 → L51 wrinkle layers with shadow-band deltas, blended in L52; L21's fallback.
- R2A-4 → merged with R2F-3 and R2F-4 into new L22.
- R2A-5 → L51 focal falloff of stroke size and contrast; focus weight in L52.
- R2A-6 → L49 value-key presets from the measured background; new S19 figure–ground gate.
- R2A-7 → L50 optional planar snap over the spectral proxy (with changes, see above).
- R2A-8 → L51 one stroke layout across bands, 512² face chart, KTX2/UASTC, painted mips.
- R2A-9 → L54 no default silhouette hull; feature lines only; hull as a theme option.
- R2A-10 → L52 per-region edge widths.
- R2A-11 → L47 painted highlight shapes per clump; used in L52.
- R2A-12 → (a) L24 identity on mesh vertices, landmarker as a drawing check; (b) feature exaggeration
  as an arm of the γ pilot (untested).
- R2A-13 → L55, L56 no velocity target; internal resolution capped at 720 physical px (S14).
- R2A-14 → StyleBlit / lit-sphere variant merged into the painted master set (L51).
- R2A-15 → distinctiveness key removed from L49 and §8.5.
- R2A-16 → L52 stroke-quantised band choice as an untested option, off by default, with an ablation.
- R2A risks → look spike (§8.6), sameness check in S18 and a stroke-seed shuffle (L51), the deep-skin-over-
  light-theme cell (S19), DPR cap, morph shadow deltas (L53), owned paint and no series frames (D3, L51).
- R2F-1 → L19 full pinhole camera with EXIF focal and observable distance; L4 distance coach.
- R2F-2 → L19 profile-contour chamfer on the mask; near-profile cells in L4.
- R2F-3, R2F-4 → new L22 (marks, freckles, lid crease and type, epicanthic fold, scleral show, hairline,
  nostril); L45 crease, L47 hairline; per-item keep/remove; "not measured" state.
- R2F-5 → L46 four mouth-interior numbers; smile-teeth gate.
- R2F-7 → L24 rewritten: direction-in-face-space identity constraint on stylisation; γ global from a
  perceptual pilot over {0, 0.05, 0.10, 0.20} with an eeriness check; the person may refuse.
- R2F-8 → L24 caricature on identity only, Jacobian on expression deltas; PBM contact gate.
- R2F-9 → L23 matched norm (sex-matched, Indian anthropometric means and SDs, running mean of consented
  builds) (with changes: ICT only after D12).
- R2F-10 → L35 transfer of the template's face units plus example-based refinement (merged with R2B-5).
- R2F-11 → S1 a mesh-based regression; S2 the only likeness release gate; perceptual impostor radius (L0).
- R2F-12 → L50 spectral low-pass proxy of the person's own mesh; identity gate on band boundaries.
- R2F-13 → L43 brow density, direction, tail, gap; stroke clumps; IoU ≥ 0.85 and tail gate; brows in foil
  matching.
- R2F-14 → L44 eyeball centre by gaze-invariant sphere fit; corneal apex depth; gates.
- R2F-15 → L40 three contrast features; third arm of the D1 ablation.
- R2F-16 → same as R2A-15.
- R2F-17 → v2 L21 merged into L24 (confidence and shrinkage) and L34 (weights); its gate moved to L24.
- R2F-18 → L21 narrowed; forehead and under-eye lines opt-in.
- R2F new idea (de-attenuation) → L24 option, off until second-day agreement improves (untested).
- R2F risks → D12, "not measured" states (L22), the γ = 0 vs. chosen choice (L24, §8.3), fairness via the
  matched norm (L23, risk 10).
- R2T-1 → new L73 attention sharing; L72 default mutual gaze only while the board is still; ablation.
- R2T-2 → L86 feedback after the verdict; L69 encouraging cue; S12 "disappointed" question.
- R2T-3 → L58 code-mixing accommodation with a CMI validator; L87 target.
- R2T-4 → L57 per-utterance provenance cue; L87 persona contract; new S20; D13.
- R2T-5 → L84 typed turns as events; L72 glance to chat; no speech over a typing student.
- R2T-6 → L90 phone tier; L75 gaze plus highlight instead of arm deixis; S8/S14 phone reports.
- R2T-7 → L5 mirror detection and un-mirroring; §8.3 true vs. mirrored, the person's own judgement never a gate.
- R2T-8 → L85 wait time II hold, hint ladder only on request or as an offer after ≥ 8 s; S10 split by turn type.
- R2T-9 → L60 fallback: never another voice on her face; captions or a separate labelled presenter; D5 and §7.4.
- R2T-10 → L74 cultural and teacher-role rules and a regional rater gate per action.
- R2T-11 → L69 cue set (empathetic, encouraging; peaks for "aha" moments).
- R2T-12 → §8.4 rewritten: Latin square over 3 lessons, no-presenter and generic-presenter arms, knows /
  does not know the teacher, delayed post-test and transfer, Ho–MacDorman, cognitive load, parasocial and
  attribution measures, stratified sampling; S9 now appeal and eeriness.
- R2T-13 → S12 raters from four regions, reported per region.
- R2T-14 → D7 slider moves shape and material together; eeriness check on γ (L24).
- R2T-15 → L74 about 20 launch actions (7 removed, "number on fingers" merged into count).
- R2T-16 → L86 divergence deixis as an untested option, as a hint-ladder step, never in tests, with an
  ablation (with changes: tied to Guru's ladder and Leak Guard).
- R2T risks → D11 (revocation continuity), persona boundary (L87, risk 13), students' voice consent (§6.2, L85).
- R2B-1 → L33 template built by `make_template.py` from the existing MPFB build; procedural attributes; D2
  settled (the GPL nuance recorded: internal use only).
- R2B-2 → L92 gate renders by the shipping player in GPU headless Chromium, moderngl fallback; week-1 spike;
  §7.1 gate time raised to 45 s.
- R2B-3 → L62 phrase bank after signing; S13 measures a usable model.
- R2B-4 → §8.6 performance spike on the site's seven existing teachers plus one MPFB export.
- R2B-5 → merged with R2F-10 (L35).
- R2B-6 → L54, L56 three.js WebGL2 only; WebGPU compute contours removed.
- R2B-7 → L33, L37 head-and-neck geometry carries the morphs; GPU memory and download recomputed (§7.2).
- R2B-8 → L61 shipped aligner (`wav2vec2-lv-60-espeak-cv-ft`, Apache-2.0 tag; Libri-Light to check) and MFA
  with our own Common Voice models for narration; "our own recogniser" removed; L3 check item.
- R2B-9 → merged with R2A-1 (L51, L52).
- R2B-10 → L41 generated Monk table; L47 four scripted hair styles; L48 CC0 clothes packs (with changes: a
  kurta modelled by us ships at launch, because the brief asks for Indian clothes; §2.4 note).
- R2B-11 → S2 and §8.2: ≥ 5 acquaintances per person pooled, plus ≥ 30 strangers per person (D10).
- R2B-12 → §8.6 rewritten (spikes; "talking likeness" in weeks 2–5 on HeadTTS phone times; narration and
  three actions in weeks 5–8; live conversation after D5/D13).
- R2B-13 → L57 frame watermark *later*; label and AudioSeal kept.
- R2B-14 → *later*: L68 fine-tune, L78 synergy space, L84 turn-aware ASR adapter, L89 speculative drafting
  (the distinctiveness key was removed outright).
- R2B-15 → L38 two LODs; v2 L57 merged into L52.
- R2B-16 → v2 L48 and L50 merged into L82 (one spring solver); garment springs only for dupatta/pallu.
- R2B-17 → §5.0 and L92 one bench harness; layer gates that restate an S gate reference it; §8.7 code modules.
- R2B-18 → §9.1 risk 1: the style is the top risk.
- R2B-19 → L92 one long-lived worker process; §7.1 note; first end-to-end build in week 5.
- R2B-20 → L0 impostors checked against S2; §9.1 risk 7.
- R2B-21 → D5 consequence stated; §7.4.
- R2B-22 → Stage D intro, L34: Blender only for the template; per-person fit in numpy/torch.
- R2B-23 → L92 fixed-point gate (untested), on synthetic heads per pull request.

Rejected (id → why):
- R2A-1 as stated (4–6 hand-painted sets by an artist as the default, recoloured per person by a build-time
  Reinhard transfer) → rejected as the default only: the owner prefers free work and no evidence yet shows
  the procedural set fails; the look spike decides (D3). The run-time recolour replaces the per-person bake.
- R2F-9 "ICT-FaceKit as head prior, expression template and eye/teeth geometry" → rejected for the
  expression template and geometry (a second template with a neck join, when CC0 face units, eyes and teeth
  already exist in our topology) and deferred for the prior until D12, because the scan subjects' consent is
  not stated.
- R2F-12's implied removal of authored planes → rejected; the planar snap stays as an option (R2A-7) under
  the identity gate.
- R2B-10 "kurta and saree come when someone can model them" → rejected for the kurta: the brief requires
  Indian clothes, so one is modelled for release 1; the saree and dupatta are *later*.
- R2B-17 "delete layer gates" → rejected as worded: each layer keeps a Gate field (the paper's contract); a
  gate that only restates a system gate now just names it.
- R2T-12's "≥ 15 raters who know the person" style sampling for every arm → not adopted for S2 (R2B-11's plan
  instead); the study's own sample is 96.

CHANGE SIZE: medium — the architecture held (stages, one template, paint in texture space, lips from spoken
phones, goal-based gestures); what changed is where the paint is made (once, on the template), the likeness
method (the v2 score was provably inert and is replaced), the template's status (it largely exists in the
repo), the teaching behaviour around the lesson and the verdict, and the build order; round 3 should check
the look spike's plan, the matched norm and the new L22/L73 rather than the overall design.
