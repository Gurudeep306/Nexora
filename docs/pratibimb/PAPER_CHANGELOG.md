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

## v4
Editor of round 3 (reviews: real-time rendering R3G, motion and speech R3M, identity and safety R3I, red
team R3R). 93 layers → 92 (L0–L91): v3 L67 (tongue and teeth) merged into L65 as rows of one lips–jaw–tongue
solve, so v3 L68–L92 become L67–L91; §5.12 regenerated from the layer texts (14 exist, 48 partial, 30 to
build). Layer numbers below are v4 numbers unless marked "v3". New: S21 (gate liveness), a "Profile" column
in §2.5 with release profiles (R1 = narrated lessons, Live = live replies), owner decisions D14 (regional
norms) and D15 (pack portability), §2.4 notes on the pack route and uploaded consent clips, risk 16 (gates
that cannot fail).

Facts since v3, checked by the editor:
- **Commit 5fa24edb**: `src/routes/pratibimb.js` now refuses unsigned packs on import ("not made by
  NexoraGuru"); the rest of R3I-1 (fresh live consent and face match on every import, encryption to the
  subject, numbers-only default, revocation by id) is still to build and is specified in L1, L2, L3, L90, D15.
- **Same commit, `scripts/pratibimb/engine/phonemes.py`**: `ɡ`, NFD-normalised nasal vowels, `ɲ ʂ ɻ c ɟ` no
  longer map to silence; `ə ɐ ʌ …` are a SCHWA class half as open as /a/; `h ɦ ʔ` are NEUTRAL; closures keep
  jawOpen ≤ 0.06 instead of forcing 0. L64 is now *partial* (was *exists*): the table is fixed, but
  diphthongs, stress scaling, the feature fallback, conditional [ʋ] (still always FV in the table), KG lip
  dominance and the real-inventory gate remain; the aperture constraint with a free jaw is L65's.
- **three.js r187** (`client/node_modules/three/src/renderers/webgl/WebGLMorphtargets.js`): at most three
  slots per vertex (position, normal, colour), always Float32 over all vertices of a geometry — confirms
  R3G's and R3R-10's arithmetic (52 × 3 × 7k × 16 B ≈ 17.5 MB; with 24 pair correctives ≈ 25.5 MB).
- **WebGL2 / OpenGL ES 3.0**: an integer-format multisampled renderbuffer is an error (INVALID_OPERATION),
  so v3's 8-bit id target under 4× MSAA could not be built as specified (R3R-9, R3G-3).

Key judgements where reviewers converged or disagreed:
- **Dead and unbuildable gates first** (R3R-1, -2, -4, -9, -10, -18, as the task asked). All accepted. The
  lip gates read a gate-only region-id pass (non-multisampled, so an integer target is legal) instead of a
  landmarker on paint; S2's foils come from a ≈ 30-person real capture pool that is also S16's extended set;
  the certificate bounds bandwidth (≤ 2 cycles per face width for dense fields, stricter than R3R-4's
  suggested "below 8–13", because coarse block portraits stay recognisable near 8); the id target is gone
  (R3G-3's distance-field lines plus a hand-only hull make it unnecessary); the morph memory has a slot table
  and half floats (≈ 14.6 MB); and release 1 is gated only on what it ships.
- **R3R-20 dead-gate audit**: sound — a mutation test is the standard way to show a test can fail, and it
  would have caught the v3 sclera tautology and the count-only certificate. Accepted as S21 and in L91, with
  one change: rater gates cannot be mutated by a script, so they carry catch trials instead.
- **Morph slots** (R3G-5 vs. R3R-10): both say write a slot table; they disagree on where the shading normal
  goes. R3G-5's choice wins (shading normal in the normal slot, colour slot = occlusion + threshold offset),
  because the true normal need not be morphed once rim and highlights use the shading normal, which leaves
  colour channels spare; R3R-10's half-float texture and hand split are added on top.
- **Lines and the id target** (R3G-3, R3R-9): converged; distance fields in the overlay and master data
  layer, hull on hands and forearms only.
- **Closures** (R3M-2) and the tongue merge (R3M-12): one vector QP with aperture constraints; this also
  removes the "jaw = 0" constraint the per-value QP would have inherited. The code's interim jaw floor (0.06)
  is recorded as interim.
- **Identity**: R3I-1's diagnosis is confirmed in code and partly fixed; R3I-2 and R3R-5 (challenge in the
  consent sentence) merged into L1. R3I-6's regional norm is accepted with the honest consequence that most
  people get $\gamma = 0$ until regional norms exist (D14).

Accepted (id → what changed):
- R3R-1 → S3, S4 read the gate render's geometry buffer (L56 gate-only id pass, L91); L7 no longer feeds lip
  gates; S3 adds renders at L72's yaws (with R3M-7).
- R3R-2 → L0 foil and fairness pool (≈ 30 capture-only people), S2(a) foils from it, S16's extended set, D10,
  §8.2, risk 7.
- R3R-3 → L24 $\gamma$ pilot by paired comparison with a Bradley–Terry fit; §8.1, §8.5.
- R3R-4 → L42 rewritten: kinds (dense, sparse, scalar), bandwidth bound, line-item table (≈ 684 of 800);
  L21 strengths on ≤ 3 driving values; L40 bandwidth argument; D1 reframed as a bandwidth; S15.
- R3R-5 → merged into L1's random challenge (with R3I-2).
- R3R-6 → L60 inter-clause loudness, rate and ECAPA-spread gates; loudness normalisation and carried
  pitch register.
- R3R-7 → L13 rewritten (accept-with-changes: the colour chart is in bench captures only, since users have
  none; users get the sclera estimate with a learned age- and Monk-dependent offset); the tautological gate
  removed; risk 10.
- R3R-8 → L50 implicit-fairing proxy instead of the eigenbasis cut.
- R3R-9 → resolved by R3G-3 (no id target); gate-only id pass is non-multisampled.
- R3R-10 → L37 slot table (with R3G-5's slot assignment), RGBA16F own morph path, separate hand geometry
  (L33), garments carry body correctives (L48), recomputed memory, worker-built arrays.
- R3R-11 → L24 identity coordinates defined (30 prior coefficients + ~20 ratios, whitened); the cosine's
  reference includes the confidence shrinkage, so $s = 0$ always passes.
- R3R-12 → L61 acoustics primary for must-hit intervals, lattice chooses the phone; closure-interval IoU
  gate; Chatterbox's alignment analyser as an UNVERIFIED lead; issue #519 handled in L60.
- R3R-13 → L91 fixed-point gate in plain shading at $s = \gamma = 0$, de-attenuation off, on heads outside
  the template's span.
- R3R-14 → merged with R3M-8 (L77, L73 defaults, L89 phone tier).
- R3R-15 → L84 and L88: no intake breath or brow lift inside wait time or before turn-end ≥ 0.6; C6; S10.
- R3R-16 → L62 agreeing/neutral tags, only neutral items before a verdict, filler cap 2/min; L85, L88; S12
  counts bank words.
- R3R-17 → L87 duck at onset + 120 ms, stop by 300 ms; S11 split into duck and stop.
- R3R-18 → release profiles in §2.5, L91 gate, §8.6 step 4.
- R3R-19 → §7.4 phrase-bank row fixed; C6 margin stated (L88 defaults); C11 principle corrected; S18 asks
  "is the brush pattern identical?"; §8.3 and L24: the person may lower $\gamma$, never raise it; L49
  hysteresis (with R3G-6).
- R3R-20 → S21, L91 mutation audit with a mutant per machine gate, catch trials (L0), §8.1, §8.6, risk 16.
- R3R risks → S13 photo-only path note (§7.1), morph build off the main thread (L37), S2(b) gated pooled
  with per-person CIs and a 50% floor, pool consent (D10, §6.2).
- R3R novelty → §9.3: legible pointing (Holladay et al. 2014) cited and L75's claim downgraded; lattice
  alignment listed as prior art; certificate and identity cosine described as framings.
- R3G-1 → L51 paint/data/id split (UASTC only on paint; RGBA8 data; R16UI ids), L52 palette atlas.
- R3G-2 → L51 per-person stroke-variation map replaces the seed shuffle; S18 sameness on it.
- R3G-3 → L54 rewritten (distance-field lines, hand and forearm hull), L52 line evaluation, L51 SDF channels,
  L21/L22 references.
- R3G-4 → L56 one forward pass into the default framebuffer; L55 context MSAA, morphological AA removed;
  §7.2 rebudgeted (≈ 6.9 ms).
- R3G-5 → L37 slots, L50, L53 caster–receiver matrix with face self-shadow off and a fixed frustum.
- R3G-6 → L49 luminance from page state, 400 ms crossfade with hysteresis; S19 on Playwright screenshots.
- R3G-7 → L89 tiers from frame-time percentiles and a micro-benchmark; L56 fixed 30 Hz cadence.
- R3G-8 → §8.6 look spike in motion at shipping size with thresholds written before viewing; L51 stroke size
  in screen pixels; risk 1.
- R3G-9 → L55 screen-locked blue-noise dither.
- R3G new idea → L51 view-indexed paint as an untested *later* option on the shared master set; §8.5.
- R3G risks → texture-format fallback and transcoder size (§7.2, risk 5), lesson-page contention (S14, §7.2),
  CSS upscale and DOM-only label (L56), deep-skin high-key form rating (L49, §8.6).
- R3M-1 → L64 (with commit 5fa24edb): NFD, U+0261, diphthong split, conditional [ʋ], feature fallback from
  our own table, real-inventory gate.
- R3M-2 → L65 vector QP with aperture constraints and a free jaw; L66; S3 jaw-chatter measure; lip check on
  aperture.
- R3M-3 → L64 SCHWA and NEUTRAL classes (now in code), stress scaling, KG low lip dominance; Tamil ɻ curl in
  L65's tongue rows.
- R3M-4 → L65 receding horizon; L67 overlapping network windows; join gate.
- R3M-5 → L78 lexical-affiliate anchor, provisional plan from streamed text, stroke re-timing, downgrade
  under 250 ms lead; new gate; C6.
- R3M-6 → L82 order of operations; L81 springs on the residual, faded under holds; L71 eyes after springs;
  S7, S8 on the final pose.
- R3M-7 → L72 minimum head yaw 15°; S8 gaze-only picks; S3/S4 at L72's yaws.
- R3M-8 → L77 raised fingers for lesson counts, phalanx only as habit, phone-tier spoken count; L73 defaults.
- R3M-9 → S6 and L67 geometric primary measure (accept-with-changes: the model side uses the 478
  correspondence vertices on the mesh, not landmarks re-detected on paint, consistent with R3R-1).
- R3M-10 → L16 per-axis head–prosody coupling; L70 prosody-locked impulses, not while listening; gate.
- R3M-11 → L62 bank motion as deltas and mouth targets in L65's horizon.
- R3M-12 → v3 L67 merged into L65 (renumbering above).
- R3M-13 → L68 gate on five classes with "warm" merged.
- R3M risks → §8.6 lip fixes in week 1 (done in code), per-language fusion weights in L67, no-delay rule in
  L78, the aperture threshold checked on a known-closed render (L65).
- R3M new idea (gesture-led prosody) → L78 untested option, ablation in §8.5.
- R3I-1 → L1, L2, L3, L90 (pack import with fresh live consent and L2 match on the new clip; packs encrypted
  to the subject, numbers-only by default, revocation list), §2.4, D15, C8, risk 9; part (a) done in code.
- R3I-2 → L1 live-only capture, random challenge and unplanned actions, subject's own device in "someone you
  know" mode, attack set (accept-with-changes: real-time puppeting that answers the challenge is a stated
  residual risk, not a passed test).
- R3I-3 → L1 six scopes, language-matched notice, not a condition of work; D13; §8.4.
- R3I-4 → L3 envelope keys and 7-day licences for narration, bank and clips; exact aggregate refits and
  k ≥ 20 (L23, §6.1, §6.2); no watermark-id reuse; nominee in L1.
- R3I-5 → L63 rewritten (cooperative mark, server-only generation registry, C2PA manifests, "report a fake
  of me"); L57; S17; §6.3 `c2pa-rs` UNVERIFIED.
- R3I-6 → L23 two-level norm (pooled + regional), L24 caricature on the within-group residual only,
  $\gamma = 0$ without a regional norm, "unspecified" sex option, regional "mocking" ratings with a Northeast
  region (S12, L0); D14.
- R3I-7 → L24 marks and freckles never exaggerated.
- R3I-8 → bindi moved to L14 as an accessory toggle; L22 nothing pre-selected and the list owned by the
  subject; L41 colour-edit policy.
- R3I-9 → L2 reported as a consistency check with its honest bound; sibling pairs; fresh consent as the
  other factor.
- R3I-10 → L2's import sentence replaced (merged into R3I-1).
- R3I-11 → L23 running mean removed until k ≥ 20 and exact refits exist.
- R3I risks → rater consent (scope 5, L0), ethics review (D10, §8.4), minors (D13, L85, §6.2), honesty of
  L63's purpose.
- R3I new idea (face-shape watermark) → L63 untested *later* option, adopted only if S2 is unchanged and ABX
  is at chance.

Rejected (id → why):
- R3G-4's "MSAA 2× fallback" → rejected: a context's sample count is fixed at creation, so tiers trade
  internal resolution, shadows and LOD instead (L55, L89).
- R3R-10's "shading-normal delta in colour.rgb" → rejected in favour of R3G-5's normal-slot assignment (see
  above).
- R3R-4's threshold "below a published recognition band (8–13 cycles per face)" → not adopted as the limit;
  2 cycles per face width is used, since 16 × 16 block portraits (≈ 8 c/fw) are already recognisable.
- R3M-1's "implement the fallback with PanPhon" → not adopted as a dependency until its licence is checked
  (L3); our own small feature table is used meanwhile.
- R3M-9's render-side measurement "through re-detection" → rejected for the same reason as R3R-1 (the
  landmarker is out of domain on paint); mesh correspondence vertices instead.
- R3R-12's Chatterbox alignment as the live-path prior → not adopted, only flagged for a test: unverified,
  and the reported early-stop bug suggests it is not yet reliable.
- R3R-19 "default students to the pilot γ unless the teacher objects" as worded → adopted as "the person
  may lower γ, never raise it", which keeps the person's right to refuse caricature from v3.

CHANGE SIZE: medium — the architecture held (stages, one template, paint once in texture space, lips from
spoken phones, goal-based gestures), but the measurement chain was rebuilt (geometry-buffer lip gates, a
real foil pool, paired-comparison γ, a bandwidth certificate, a mutation audit, release profiles), the
renderer lost its id target, line pass and composite, the lips became one lips–jaw–tongue solve with a free
jaw, and the consent chain around identity packs was redesigned; round 4 should check the new gates and the
consent route rather than the overall design.

## v5
Editor of round 4 (reviews: the look and the face R4L, voice and conversation R4V, building it R4B, red team
R4R). The layer count stays at 92 (L0–L91). §2.5 gains S22 (voice likeness) and a "Rule" column, so every gate
names one of five decision rules (P point check, Z zero events, B bound with a power-calculated n, E
equivalence/TOST, NI non-inferiority). §5.12 is regenerated from the layer texts with a "Needed for R1"
column: 80 layers for release 1 (12 of them as they are), 7 Live only, 5 *later*. Status counts are now 6
exist, 56 partial and 30 to build, because "exists" is now defined as "everything release 1 needs is in
code". New owner decision D16 (S2's fallback target); D6 gains a plan B; D10 names voice foils; D14 says
release 1 ships γ = 0. There are new risks 17 (the live photo bake) and 18 (voice likeness and echo), and §8.6
and §8.7 are rewritten.

Facts checked by the editor in the repository:
- **The photo bake is live.** `scripts/teacher/maker/worker.py` runs `pipeline.py`. Its stage 6 runs
  `bake_skin.py`, whose docstring reads: "Paint a person's face from their photos onto the model's skin
  texture". It solves a camera per photo by DLT and colours every face texel from the photos. Stage 7
  (`paint_features.py`) draws the features onto that photo skin. Stage 8 (`paint_look.py`) blends
  `cv2.stylization` of the photo skin with the photo skin. All three Studio styles use this path.
- **A check-only model picks the shipped output (new, found by the editor).** `pipeline.py` keeps the best of
  three variants by an SFace likeness score (`likeness.py`). That breaks D6/L3. The fix is part of step 0.
- **The lip fix does not reach the Studio.** Commit 5fa24edb touched only `scripts/pratibimb/engine/phonemes.py`
  and its test (plus the pack route). `phonemes.py` is imported only by `engine/perform.py` and
  `test_engine.py`. The Studio player (`client/src/pratibimb/engine/player.ts`) imports `lipsync.ts`, which
  uses Oculus viseme classes from HeadTTS timing.
- **What the shipping stack already has.** `solve_face.py` solves 222 CC0 targets with `lsq_linear`, with depth
  counting half. `player.ts` has the states idle, listening, thinking and speaking, the gestures wave,
  namaste, present, point and nod as fixed key poses, and `renderAt(t, speechT)`. `look.ts` switches between
  painted, anime and real.
- **Writer and arXiv ids.** Only a stale `engine/__pycache__/glb.cpython-313.pyc` remains of a glTF writer.
  The titles of arXiv 2606.18323, 2607.08256, 2509.19852 and 2406.06979 were confirmed through the arXiv API.

Key judgements:
- **One avatar stack (R4B-3).** The choice is MPFB → `pipeline.py` → VRM → `client/src/pratibimb/engine/`. It
  runs in production and already has the template, rig, hands, clothes, a fit bounded to human heads and a
  player. The `scripts/pratibimb/engine/` stack would need all of that rebuilt, and its colour fits pixels.
  The brief's path name is read as "our own code" (§2.4). Useful parts are salvaged. `splats.py`, `build.py`
  and `portrait.py` are frozen as bench baselines.
- **The three release-1 chains that could not go green under default decisions.**
  - γ is fixed at 0 in release 1, so the pilot, its mutant and the brow arm are *later* (R4R-22 = R4B-11).
  - Foils are attribute-transplanted, and S16 is only monitored in release 1 (R4R-23, R4R-24).
  - The audio mark is reported rather than gated. Release 1 keeps a server generation log, and the
    registry and C2PA move to *later*, with exports (R4R-26 + R4B-13).
- **Echo guard (R4R-9 vs. R4V-4).** Both say the 120 ms speaker check is impossible. R4V-4's text self-echo
  test was taken over R4R-9's server speaker check, because it needs no speaker model and does not run into
  D6. R4R-9's 250 ms decision with a 50 ms fade was kept.
- **Look additions.** R4L-1 (a per-person shadow bake) and R4L-2 (a far-side edge) are accepted as spike
  flags, each kept only if it wins an A/B on identical frames, instead of being added unconditionally.

Accepted (id → what changed):
- R4B-1 → production files in the Status lines (L5, L7–L10, L17, L34, L40, L43, L47, L49, L52, L60, L64,
  L69, L73, L77, L89–L91) and in §8.7. L34 step (0) is `solve_face.py`; RBF/ICP fit only the residual.
- R4B-2 → §2.4 and §8.6 step 0: a parametric stand-in for stage 6, features drawn on photo-free skin, older
  models not publishable. `bake_skin.py` becomes the S15 mutant.
- R4B-3 → §8.7 one stack, with the reason and the salvage and freeze lists. L64 names its mouth path. One lip
  table is kept as a data file read by `lipsync.ts` and by the server.
- R4B-4 → §8.6 step 0 (days 1–10): the owner's own build, `look: 'band'`, `talkrender.cjs`, and a comparison
  with the current look and the Rocketbox teachers. The headless GPU renderer moves to week 3.
- R4B-5 → the spike uses `pipeline.py`'s fit on the owner and one staff volunteer. The optional hand-painted
  chart is dropped.
- R4B-6 → L51's spike version is one RGBA8 texture per band. Everything else enters only after "go", each
  piece with an A/B.
- R4B-7 → S3/S4 run on the morphed mesh in numpy for the milestone. The render id pass is kept for release 1
  (S3, L65, L91).
- R4B-8 → each gate's pull request ships its mutant as a test. S21 becomes a CI listing (L91).
- R4B-9 → §7.1 "what runs today", a week-1 timing and a decision rule (keep Blender if p95 ≤ 240 s, else build
  the VRM writer, L90).
- R4B-10 → KTX2 is out of release 1 and paint layers ship as WebP/PNG. The transcoder sizes measured by the
  reviewer are recorded (§7.2, L51, §6.3).
- R4B-11 → merged with R4R-22.
- R4B-12 → the stroke-id layer and stroke-quantised mode are removed (L51, L52, §8.5, §9.3).
- R4B-13 → registry, C2PA and 7-day licences are *later*, with exports. Consent, import rules and
  revocation stay in release 1 (L3, L57, L63, S17).
- R4B-14 → `bake_skin.py`'s texel tracer, fed `paint.py` over template renders, bakes the master set (L51).
- R4B risk 1 → the §5.12 "Needed for R1" column. Risk 3 → MP4 links plus a 1–5 rating (§8.3, §8.6). The
  new idea → the same-pipeline control as the rule for every look ablation (§8.5, with changes: a method rule,
  not a novelty claim).
- R4R-1 → S1 gates the rank-1 margin and the cosine is a diagnostic. The invariance claim is corrected (L24).
  S1 gets a mutant.
- R4R-2 → S7/L82 gate the clamp's activity and the post-clamp residuals. The mutant widens limits by 30°.
- R4R-3 → S3 counts the union of aligner and hand-labelled closures, so missed ones fail.
- R4R-4 → S8 is scored with disambiguators off, with their firing capped at 10% (L75).
- R4R-5 → the five decision rules in §2.5 and §5.0. S12, S18, L63's ABX, S9, L74, L68 and L83 are restated
  as E or NI tests with margins. L72's quiz clause moves to §8.4.
- R4R-6 → L50's "X%" clause is dropped.
- R4R-7 → mutants at about 1.25× the threshold for every machine gate, and catch trials on S9, S22, L68, L73
  and L77 (L91).
- R4R-8 → S10 gates the first *content* audio, plus answer turns at ≤ 2.5 s. Bank audio is reported (L88).
- R4R-9 → decided at 250 ms with a 50 ms fade (L87). The speaker check is replaced (see R4V-4).
- R4R-10 → a main-thread render-submission row and an OffscreenCanvas fallback. Morph counts and the
  download size are aligned (≈ 6.2 MB, §7.2).
- R4R-12 → L6 selects by track continuity and SFace only confirms. YuNet's data is recorded as UNVERIFIED.
- R4R-13 → L1 states an offline-replay attacker model. Real-time swaps are reported as a residual risk (with
  changes: no anti-spoof model is named, since none is verified commercial-OK).
- R4R-14 → the consent challenge is spoken in English or Hindi, and the Qwen3-ASR licence is settled in §6.3.
- R4R-15 → S6 uses the template's inner-lip loop, with per-person calibration at closed frames.
- R4R-16 → player and server bundles (§4.3, L2, L90), gated on "no audio, no embedding in the player".
- R4R-17 → new provenance labels ("Lesson approved by [name] · AI voice", "AI answer, not checked by [name]")
  and S20 rewritten (L57, §8.4).
- R4R-18 → "copies we control" (L3). The label is a site guarantee (L57).
- R4R-19 → L52 adds a symmetric dark-theme edge term and an additive hair rim. S19 gets a cell for black hair
  on dark themes.
- R4R-20 → L42 adds lines for the hair fit and the flyaway field and measures bandwidth over the whole
  evaluated atlas (≈ 714 numbers). R4R-20a → S15's colour-only identification test (E).
- R4R-21 → merged with R4L-7: L13 is fitted on the pool with colour cards and tested on the bench.
- R4R-22 → γ is 0 in release 1, and the pilot, its mutant and the brow arm are *later* (L24, D14, §8.5).
- R4R-23 → attribute-transplanted foils (S2, L0, §8.2).
- R4R-24 → S16 is monitored in release 1 and gated later on S2(b) with a power-calculated n.
- R4R-26 → L63's mark is reported, not gated. Publishing depends on the generation log.
- R4R-27 → "exists" is defined, and L2, L5, L6, L10, L16, L20, L49 and L69 are relabelled partial. "Spectral
  proxy" is fixed in §8.5. The Libri-Light audio terms are marked UNVERIFIED.
- R4R risk "S2 may be infeasible" → the week-5 S2 pilot with D16 written first. Risk "D6 load-bearing" → plan
  B in D6. Risk "moderngl" → gates rendered on the fallback are flagged (L91). The new idea → the
  operating-characteristic sheet in L91, used to define a valid n.
- R4L-1 + R4L-11 → L53's per-person key-shadow bake by pose (signed distance, 15 + 2 layers, ≈ 245 KB, kept at
  every tier). The view-indexed paint is merged into it (L50, L51, L89).
- R4L-2 → L52's far-side contour edge, as a spike flag.
- R4L-3 → L41's 30-cell table (Monk × hue tercile), with red-orange shadows at Monk ≥ 6 and a machine
  chroma/hue gate (with changes: the "ashy?" item goes to the owner's per-Monk check, not to S12, which is
  Live).
- R4L-4 → a value floor and ceiling (L41), the iris caustic and an iris–pupil gate (L44), and the additive hair
  rim (L52).
- R4L-5 → the under-eye darkening is counted once (L41).
- R4L-6 → L40's partition of unity with σ ≈ 13 mm (f½ = 0.187/σ ≈ 2 c/fw on a 140 mm face, recomputed by the
  editor). The lip border is drawn by L43.
- R4L-7 → L13's 3-parameter sclera model.
- R4L-8 → L47 adds plait/ponytail and bun, the "tied back?" question and the oiled shine. Release 1 starts
  from the CC0 MPFB hair already in the pipeline (with changes: "long straight" stays in release 1, since
  MPFB `long01` already ships).
- R4L-9 → L52's minimum on-screen sizes and size-based drops, and the phone tier keeps the pose bake (L89).
- R4L-10 → the spike cells: Monk 3/6/9 × hue recolours, a 20° hold with and without the flags, black hair on
  a dark theme.
- R4L risk 5 → line-end taper through the distance texture's second channel, after "go" (L54).
- R4V-1 + R4V-10 → S22 voice likeness, with MOS in the same session (with changes: Hindi and Hinglish pooled,
  the cross-lingual arm reported only). D10 names voice foils, and L60's free-floating MOS is removed.
- R4V-2 → L60 best-of-4 for narration with a cross-family rank, garbage arcs in L61, and N = 1 live.
- R4V-3 + R4V-11 → conditioning cached per person × language, bounded PSOLA/WSOLA corrections, and a
  clause-consistency gate with a real-reading sanity arm. "Carry the pitch register" is removed.
- R4V-4 + R4V-11 → no speaker model in the duck path, a text self-echo test before the stop, loopback
  peer-connection playback, and S11 on three browsers (L83, L87, S11).
- R4V-5 → wait time II as a parallel floor with a receipt cue, and answer turns at ≤ 2.5 s (L84, §7.3, S10).
- R4V-6 → the narration–step timeline in L72, pitch-preserving playback rates (L89), and S3/S5 at 1.5× and
  2×.
- R4V-8 → L58's respelling lexicon, with the gate now a phone error rate through the lattice.
- R4V-9 → L60 pinned to V3. The Hindi pack's licence is UNVERIFIED, and Perth is removed in our copy, so one
  mark remains (§6.3).
- R4V risk "no new recording" → narration in an unrecorded language needs the teacher's approval of a sample
  until S22's cross-lingual arm passes (L15).

Rejected (id → why):
- R4L-13 (feature weights tuned to display size by Bradley–Terry) → it adds a rater pilot for a gain that
  R4L-9's fixed minimum sizes mostly deliver. Listed in §9.2.
- R4V-7 (clear-speech repair mode) → repair happens only in live conversation, which is not release 1. It is
  untested, and the brief asks us to cut before we add. Listed in §9.2 for the Live release.
- R4V new idea (contrastive focus from the frame diff) → untested, and it rests on a stress detector and
  phrase splitting that are not yet validated. Listed in §9.2.
- R4R-10's alternative "render from the worker through OffscreenCanvas by default" → kept only as a
  fallback, because Safari support is UNVERIFIED.

CHANGE SIZE: medium — the design's structure holds and no layer was added or removed, but round 4 found that
production breaks the brief, chose one code stack, rewrote the build order around existing code, and gave
every gate a decision rule. Each of these is a substantive change, though not a redesign.
