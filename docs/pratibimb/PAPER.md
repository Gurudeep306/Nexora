# Pratibimb: a layered, measurement-only pipeline that turns a phone capture into a painted, talking, gesturing digital teacher

*NexoraGuru research paper, design version 5 (2026-11-27). Supersedes version 4 after the fourth review round
(the look and the face, voice and conversation, building it with a small team, and a red team; earlier
rounds: graphics, motion, speech, systems; art direction, face science, teaching, buildability; real-time
rendering, motion and speech, identity and safety; decisions in `PAPER_CHANGELOG.md`). It specifies the black box described
in `BRIEF.md`, refines the 64-layer plan in `LAYERS.md`, and keeps the engine choices in `ENGINE.md` and the
rules in `SPEC.md`. Where those files disagree, the brief wins (§2.4 lists the disagreements found). Things
only the owner can decide are collected in §2.6.*

---

## Abstract

We describe Pratibimb, a system that takes a consenting adult's ordinary capture (photos and/or a short
phone or webcam video, plus their voice) and builds one digital human of that person: waist up, facing the
student, recognisable as them, drawn in a hand-painted look, speaking in their cloned voice with accurate lip
sync in any language, gesturing with arms and five-finger hands, showing emotion, listening and reacting, and
conversing as a teacher through the site's tutor ("Guru"). The system is built as **92 layers (L0–L91) in
11 stages**. Each layer has one input, one output, a stated method with its research basis, its defaults, a
fallback, and a measurable gate with a stated decision rule that must pass before its output is used; every machine gate
must also be shown to *fail* on a mutant just past its threshold (S21). The repository already runs a
photos-to-teacher build in production (`scripts/teacher/maker/pipeline.py`, played by the Studio player in
`client/src/pratibimb/engine/`); this paper builds on that one stack, and its first step removes that
build's photo-pixel skin bake, which the brief forbids (§2.4, §8.6 step 0).

Three constraints shape the design. (1) **No photo pixels are reproduced**: from the capture we learn only
measurements (3D shape, proportions, bone lengths, motion habits) and a small set of colour numbers (region
palettes and smooth gradients), and every build ships an *information-budget certificate* listing each
photo-derived number with its spatial bandwidth, so that no dense field can carry a recognisable picture.
(2) **Any gesture without an animation library**: actions are short goal programs
(look at X, point at lesson element Y, count three, namaste) solved every frame by an analytic arm solver
with shoulder-girdle rhythm along task-space hand paths, under joint limits and swept-capsule collision,
followed by a spring layer, and styled by the person's own measured habits. (3) **Build in 3–4 minutes on
one rented GPU and play at 30 fps in an ordinary laptop's browser**: heavy work is learned or authored once
(shared priors and **one template mesh built by our own script from CC0 MakeHuman assets** with its rig,
UVs, 52 face units and authored painting attributes); per person we only measure, fit the template, and
bake; the runtime is a small skinned mesh with a forward, texture-space painted shading model in three.js
(WebGL2), not a neural renderer and not a screen-space paint filter.

The painted look is made where the reference look makes it: **in the textures**, and like the mesh it is
**painted once**. The template carries a master band set (light, half-tone and shadow paint sharing one
stroke layout, with broken terminator edges and expression wrinkles); at load time the person's palette is
evaluated into a tiny palette atlas that recolours it, a stabilised shading normal and a key-light shadow
choose between the bands, and only the person's own features (brows, marks, facial hair, a per-person stroke
variation, and feature lines as distance fields) are painted per person, as a small overlay. The paint and
the lines are on the surface, so they cannot flicker, and the frame is one forward pass into the canvas.

The main new ideas are: measurement-only appearance with a certificate of what was measured; likeness put
back into geometry by exaggerating the face away from a **matched norm** (sex- and population-matched), with
the strength set once by a human pilot (after release 1, which ships no exaggeration, D14) and stylisation
checked so that it does not move the face towards anyone else's; lip sync driven by the phones the voice *actually spoke* and solved as one constrained trajectory
of lips, jaw and tongue whose lip closures cannot be missed (the jaw stays free), with per-person
coarticulation parameters that carry across languages through IPA; deictic gestures that land on the exact
element of the lesson animation, legible to an observer (after legible robot pointing) and planned from the
streamed text before the audio exists; listening that is contingent on whether the student is
right (the teacher never nods at a wrong answer), that waits like a teacher after a question, and that
answers a wrong answer by looking at where it went wrong rather than with a face; a teacher who shares the
student's attention with the moving lesson; and a build that grades itself on held-out frames and on a
rebuild from its own renders, and retries or asks for the missing photo, with gates that are themselves
tested against deliberately broken models. Every teacher must be someone who agreed, live and on camera,
to each use of their likeness, including any move of their identity pack to another account. Most
individual techniques are known; we state plainly which parts are new (§9.3). Status: 6 layers exist in code and 56 are partial
(`scripts/teacher/maker/`, `scripts/teacher/`, `client/src/pratibimb/`, `src/routes/pratibimb.js`, with
`scripts/pratibimb/engine/` as a salvage source, §8.7); the rest are specified here and still to build
(index in §5.12, whose last column says which layers release 1 needs). Layers and options marked **later**
are outside release 1 (§8.6).

---

## 1. Introduction

NexoraGuru teaches computer science to Indian students with animated lessons. A recurring request from
teachers is a presenter that is *them*: their face, their voice, their manner, available at any hour, in
English, Hindi or Hinglish, standing beside the lesson and pointing at it. Generic avatars are not them;
photo-real "deepfake" talking heads raise consent and trust problems, need large GPUs to run, and cannot
point at the page. Game-style characters can be animated freely but do not resemble anyone.

Pratibimb (प्रतिबिम्ब, "reflection") sits between these. The output is a stylised but recognisable 3D
person, rendered as if painted, driven by explicit controls that any layer can inspect: 52 face expression
values, a jaw and tongue, gaze, an upper-body skeleton with 2 × 20 finger joints, and an audio clock. The
person can be rebuilt in minutes whenever the shared priors or the template improve, without a new recording.

This paper is written as an engineering specification in research form, so that every layer can be built,
tested and replaced independently. It follows a design-science method (§3): each layer is an artefact
with a gate; a layer is "done" only when its gate passes on the bench (L0, §8). Version 2 changes the
design in four places after review: one fitted template instead of a per-person mesh (Stage D); painted
light in textures instead of a screen filter (Stage F); a style-independent likeness test (S1); and a
conversation loop built on streaming recognition, a phrase bank and lips driven by the spoken phones
(Stages G, H, J). It also adds a running-cost budget (§7.4), a build order (§8.6) and the owner decisions
(§2.6). Version 3 builds on what the repository already has (the MakeHuman/MPFB build script, the
478-point correspondence and the face fit in `scripts/teacher/`), paints the look once on the template,
replaces the likeness score (the v2 score could never choose caricature), makes the human lineup the only
likeness release gate, adds the teacher's behaviour beside a moving lesson and after a verdict, and
reorders the build so the first milestone is a painted, talking head judged by the owner. Version 4 fixes
the measurement chain after a red-team review: lip gates read a geometry buffer instead of a face landmarker
on paint, likeness foils come from a separate pool of real people, the caricature strength is found by
paired comparisons, the no-copy certificate bounds spatial bandwidth and not only the count, every gate
must fail on a known-bad model, and the release gates are split between narrated lessons and live replies.
It also closes the identity-pack route around consent (live challenge consent on every import, packs
encrypted to their subject, revocation that reaches derived files and shared norms), simplifies the renderer
(feature lines as texture distance fields, one forward pass into the canvas, data kept out of compressed
paint), and solves lips, jaw and tongue as one trajectory with the jaw free at closures.

---

## 2. Problem statement and requirements

### 2.1 Input (fixed: the capture we already take)

| Source | What we extract | Used for |
|---|---|---|
| Guided scan or photos (front, left, right, up, down, smile, "aah", brows) | 478 face points per view, head pose | 3D face shape and proportions |
| The same, plus optional video | 52 expression values per frame; blinks, nods, mouth range | Personal expression model and motion habits |
| Waist-up shot | 33 body points, 21 points per visible hand, silhouettes | Template fit: bone lengths, body volume |
| Colour measurements | Skin, iris, lips, brows, hair colour; hair outline and length; glasses, facial hair | Palette, hair, accessories |
| Voice (consent clip and any speech) | Speaker identity, pitch range, speaking rate, per-language reference spans | Voice clone, prosody style, phrase bank |

No new long recording is required. Video is optional (many people cannot film themselves); it improves
the expression model, the motion habits and the personal coarticulation parameters.

### 2.2 Output (fixed: one digital human)

A waist-up painted 3D character of the person, facing the student, on a transparent background, that:
resembles them; can perform any upper-body action (namaste, pointing at screen elements, counting on
fingers, explaining with open hands, shrugging, nodding, leaning in, hand on chest, thinking pose); talks in
their cloned voice with accurate lip sync in any language (English first, then Hindi and Hinglish); shows
emotions; listens and reacts; and converses through Guru, under Guru's rules (hint ladder, Leak Guard, no
help during tests). Everything is labelled "AI-generated" and the audio is watermarked.

### 2.3 Hard constraints

1. **Our own code.** Papers are read for ideas only; code is never copied; for work under a
   non-commercial licence we read only the paper. Every shipped weight and asset is free for commercial use,
   recorded in the provenance ledger (L3).
2. **No photo pixels on the model.** Colours and measurements are learned; pixels are never pasted or
   memorised. The painter never sees a photo (L51); what the model keeps from the photos is listed number by
   number (L42).
3. **No outside body or face model with a restrictive licence.** No FLAME, SMPL/SMPL-X, MANO, original 3DGS
   code, insightface, nvdiffrast, F5-TTS, MMS aligners (`SPEC.md` §2). The template (L33) is made from CC0
   MakeHuman/MPFB assets (licence recorded in `docs/voice/licences/2026-11-25/`) or is our own.
4. **Build ≤ 3–4 minutes** per person on one rented GPU (24 GB class), measured from a warm worker (§7.1).
5. **Playback 30 fps in a browser** on an ordinary laptop (integrated GPU), 720p panel.
6. **Consent first**: adults only, their own face and voice, spoken consent with a random challenge,
   captured live in the browser and matched to the face *and to the voice*, a separate yes for each use
   (L1), one-tap delete, revocable, and the same live consent again whenever the identity moves to
   another account.

### 2.4 Inconsistencies found in the existing documents (for the owner)

- **The production build pastes photo pixels on the skin (found in round 4; fix is §8.6 step 0).** The
  Studio worker (`scripts/teacher/maker/worker.py`) runs `pipeline.py`, whose stage 6 (`bake_skin.py`) solves
  a camera per photo from the 478 points and copies every face texel's colour from the photos that see it
  best ("Paint a person's face from their photos onto the model's skin texture", its docstring); stage 7
  (`paint_features.py`) draws the traced features *onto that photo skin*, and stage 8 (`paint_look.py`) only
  filters it (OpenCV stylisation blended back with the photo skin). The default Studio style, "painted",
  and the "real" style both ship it. Under the brief every Studio model built so far carries photo skin;
  they must not be published or exported until rebuilt. The same build also keeps the best of three
  variants by an SFace score against the photos (`pipeline.py`, stage 10), so a check-only model chooses the
  shipped output, which D6 forbids. `bake_skin.py` is kept only as S15's known-bad
  mutant (L42, L91), and its texel tracer is reused, fed with template renders instead of photos, to bake
  the master band set (L51).
- **Two avatar stacks.** The brief says the engine is "our own code (`scripts/pratibimb/engine/`)". That
  folder holds one complete stack (its own mesh from the points, tube bodies, colour splats fitted to pixels,
  its own WebGL player); the Studio ships another (MakeHuman/MPFB template → `solve_face.py` →
  `build-vrm-teacher.py` → VRM → `client/src/pratibimb/engine/player.ts`). Both are our own code. This paper
  reads the brief's sentence as "our own code" and chooses the Studio stack (§8.7, with the reason); the
  useful parts of `scripts/pratibimb/engine/` are moved into it, and its pixel-fitted parts become bench
  baselines. One visible symptom of the split: commit 5fa24edb fixed the lip table in
  `scripts/pratibimb/engine/phonemes.py`, which only `engine/perform.py` and its test import, while the Studio
  player's lips come from `client/src/pratibimb/engine/lipsync.ts` (Oculus viseme classes from HeadTTS
  timing), so the fix reached nothing the Studio plays (L64).
- `BRIEF.md` fixes the look as the hand-painted style of reference sheet 1–8 (realistic proportions, painted
  skin and hair, dramatic key and rim light), but its part table still says "stylised to anime (larger eyes,
  simpler nose)" and "anime eyes", left from the earlier anime choice. This paper follows the newer sentence:
  **realistic proportions with a mild stylisation constrained not to rotate identity** (L24), painted in texture space
  (Stage F). The style slider in L24 can still reach the anime proportions if the owner wants them (§2.6, D7).
- `SPEC.md` §0 asks for a "generative digital human" whose frames are drawn fresh from the person's photo
  and video; `BRIEF.md` (later) forbids using photo pixels. The Living Portrait (`portrait.py`) re-animates
  the person's own pixels; under the brief it is kept **only as a bench baseline** (a likeness ceiling and
  a lip-sync reference), never as the shipped output.
- The identity pack stores `face/texture.png` (pixels merged from views). Under the brief the shipped model
  must not use it; L40–L41 use it only as a measurement source for region colour statistics.
- The lab player (`player/retarget.js`) retargets CC0 animation clips. The brief asks for gestures without
  an animation library; those clips stay as a lab comparison only.
- Version 1 of this paper shipped a band-limited colour field whose cut-off (6 cycles per eye distance,
  about 9 cycles per face width) sits inside the band people use to recognise faces (8–13 cycles per face
  width, Näsänen 1999). That is a blurred copy of the face's colours, which the brief's "never used: the
  photo pixels themselves" arguably forbids. Version 2 ships parametric colour by default and leaves the
  field to the owner (§2.6, D1).
- `BRIEF.md` asks for a wardrobe with Indian and Western clothes. The CC0 clothes packs the repository
  already uses (`shirts01`, `suits01`, …) are Western only; Indian garments must be modelled by us (L48). The
  paper ships a kurta at launch and adds the saree and dupatta later; the owner should know this.
- Versions 1–2 of this paper marked the template "to build" with "authoring weeks". The repository already
  builds a MakeHuman person headless in Blender with the 52 ARKit face units, checks every worn asset for
  CC0, and holds the 478-point correspondence and an RBF face fit (`scripts/teacher/build-vrm-teacher.py`,
  `scripts/teacher/fit/`). Version 3 builds on them (L33–L35).
- `PACK_FORMAT.md` and `src/routes/pratibimb.js` describe the identity pack as "reusable on any account":
  the pack holds the person's photos (`views/*.jpg`), a merged face texture and a clean voice clip, and until
  2026-11-26 an import needed only a checkbox and carried the pack's own consent record over
  (`subject: "pack"`). Unsigned packs are now refused on import (commit 5fa24edb); the rest of this paper's
  rule is still to build: every import needs a fresh live consent from the person shown, matched to the
  pack's identity; downloadable packs are encrypted to their subject and hold measured numbers only unless
  raw media are opted in; revoked packs are refused by id (L1–L3, L90, D15). `PACK_FORMAT.md` should be
  updated to match when this is built.
- L1 and the consent route accept the consent clip as an uploaded video file (`video/webm|mp4`). Under this
  paper consent is captured live in the browser with a random challenge (L1); uploads are refused.

### 2.5 Measurable success criteria (release gates for the whole system)

**Decision rules.** Every gate names one of five rules, so that no gate passes merely because too little was
measured (§5.0):
- **P (point check)**: a deterministic number computed on every build or every bench person, compared with
  the threshold; no sampling.
- **Z (zero events)**: no failure in at least the stated number of events; the report gives the rule-of-three
  bound (0 in n bounds the true rate at ≤ 3/n with 95% confidence).
- **B (bound)**: a sampled rate or median; it passes when the estimate meets the target *and* its one-sided
  95% bound meets the stated floor. The sample size comes from a power calculation written in the gate's
  operating-characteristic sheet (L91): a model 25% worse than the target (its error rate × 1.25) must fail
  with probability ≥ 0.9.
- **E (equivalence, TOST)**: for "at chance" or "no difference" claims; it passes when the 90% confidence
  interval of the difference lies inside ±margin. A small sample therefore fails rather than passes.
- **NI (non-inferiority)**: for "not worse than a baseline"; it passes when the lower 95% bound of
  (model − baseline) is above −margin.

Machine gates also carry a **mutant** at about 1.25× their threshold (S21, L91), shipped as a test with the
gate's own pull request.

| # | Criterion | Measure | Target | Rule | Profile |
|---|---|---|---|---|---|
| S1 | Likeness regression (machine; not a release gate for likeness) | Identity geometry **on the mesh vertices** (exact correspondence, L24): rank-1 identification of each bench person's stylised build among the other bench people, the foil pool (L0) and the synthetic impostors at the perceptually calibrated radius, in L24's identity coordinates; the identity direction cosine is a **diagnostic**, reported, not gated (it holds by construction of $s$); the landmarker on renders and SFace only as render-sanity checks (L3) | Rank-1 correct for every bench person with a margin ≥ 0.5 of the impostor radius; no regression against the last release | P; mutant: another bench person's deviation swapped in | R1 |
| S2 | Likeness (human; **the only likeness release gate**) | (a) Acquaintances (≥ 5 per bench person) pick the person's render from a lineup of 4; the foils are **builds of real pool people (L0) rendered with the target's own hair, glasses, facial-hair map, head covering and garment**, keeping the foil's own face geometry, marks and palette, matched only on sex and a coarse Monk bin (1–3, 4–6, 7–10); an "own attributes" lineup is reported beside it; (b) strangers (≥ 30 opted-in students per person) match a held-out photo to one of 4 such renders; neutral and three-quarter renders reported separately; catch trials in every session (S21) | (a) pooled ≥ 90% with the lower bound ≥ 75% (chance 25%); (b) pooled ≥ 70% with the lower bound ≥ 60%, per-person CIs reported. If the week-5 pilot (§8.6) shows (a) is out of reach, the fallback target of D16 applies, chosen before the full run | B | R1 |
| S3 | Lip closures | Every p/b/m (and प फ ब भ म) **realised** in the audio, taken as the union of L61's detected closures and the hand-labelled set (a closure the aligner missed counts as a failure): full inner-lip closure in the frame nearest the closure midpoint, checked on the morphed mesh (inner-lip loop distance, L65) for the milestone and, for release 1, also in the gate render's region-id pass (no cavity, teeth or tongue fragment between the inner-lip ids on three vertical lines), with 10% injected frame drops, frontal and at L72's yaws, at playback rates 1×, 1.5× and 2× (L72); blind raters on muted clips; jaw chatter (jaw-velocity reversals within ±60 ms of bilabial midpoints, per 100 bilabials) vs. the person's own video | 0 missed closures in ≥ 300 per language; raters tell p/b/m clips from others ≥ 90% (lower bound ≥ 85%); chatter within ±25% of the person's own | Z; B for raters and chatter | R1 |
| S4 | Lip-teeth contact | Phones realised as [f] or [v] (L61 plus the hand-labelled set; [ʋ]/[w] excluded) with the lower lip within 1 mm of the upper teeth on the mesh, and adjacent ids in the gate render, on the S3 render set | ≥ 95% with the lower bound ≥ 92% | B | R1 |
| S5 | Audio–video offset | Measured in the browser after output-latency calibration (L89), at 1×, 1.5× and 2× playback | median and 90th percentile: lips lead audio by ≤ 80 ms and lag by ≤ 40 ms | B (≥ 50 clauses per device) | R1 |
| S6 | Mouth range | Replay gate (L67): the person's own held-out reading driven through L61–L67 vs. the same video; **primary measure geometric**, normalised by mouth width, on the **template's own inner-lip loop** (as L65's aperture) and, on the video, from the landmarks calibrated per person at their closed frames; correlation with MediaPipe's 52 values secondary | per-class amplitude ratio within ±15% (90% CI inside ±20%); inner-lip aperture error reported | B | R1 |
| S7 | Gesture validity | Every action of the library × 8 bench bodies, **every frame at 30 fps**, measured on the final pose after springs and re-solves (L82): penetrations; the **activity of the final limit clamp** (L82 step 5), which would otherwise hide every violation; the join, touch and pointing residuals after the clamp | 0 penetrations > 2 mm; clamp active on ≤ 5% of frames with a largest correction ≤ 5°; pointing line hits ≥ 98% and two-hand contact residual ≤ 5 mm after the clamp | Z (≥ 50,000 frames); P | R1 |
| S8 | Pointing and gaze | Observers pick the indicated lesson element from its neighbours on silent clips (arm and gaze) **with L75's highlight disambiguator off**, and separately on gaze-only clips; the shoulder–wrist–fingertip line hits the element's box on the final pose; rerun at a 360 px phone width with the phone tier (L89); the share of points where the disambiguator would fire is reported | ≥ 95% correct picks (lower bound ≥ 90%); gaze-only picks ≥ 80% for elements ≥ 10° apart; line hits ≥ 98%; disambiguator on ≤ 10% of points; phone result reported | B | R1 |
| S9 | Appeal and naturalness | Ho–MacDorman humanness and eeriness indices, an appeal rating and GENEA-style appropriateness of gestures (a rating session before release, with catch trials; the full study in §8.4); realism is not the target of a painted look | Eeriness not worse than the generic painted presenter arm by more than 0.5 points; appropriateness not worse than the rule-based ablation by more than 0.5 points (7-point scales) | NI | R1 |
| S10 | Responsiveness | Student stops → first visible reaction (attention cue, L88) and → first **content** audio (not a bank filler), for student questions; for answers to her questions, the total gap to the verdict's first audio, with L84's hold running in parallel (§7.3); bank audio reported | ≤ 300 ms and ≤ 1.8 s (medians, end to end including recognition); answer turns ≤ 2.5 s median | B (medians) | Live |
| S11 | Barge-in | Student speaks over her → her audio ducks, then stops; she never interrupts herself through echo; run on the shipping playback path in Chrome on Windows, Chrome on Android and Safari on iOS (L83) | duck (−12 dB) ≤ 150 ms and stop (decided at 250 ms, 50 ms fade) ≤ 300 ms on 95% of onsets; 0 self-interruptions in ≥ 30 min of laptop-speaker echo test per browser | B; Z | Live |
| S12 | Pedagogical honesty | Agreement signals (gestures and bank words) after a wrong or not-yet-graded answer (controls); Indian student raters from at least North, South, East, West and Northeast India, per region: "did she agree?" on the neutral set, and "was she disappointed in me?" on wrong-answer clips | 0 agreement signals in ≥ 200 control turns; neutral set: \|P(agree) − 0.5\| ≤ 0.1 per region; "disappointed" not above the neutral baseline by more than 0.3 points | Z; E; NI | Live |
| S13 | Build time | Pack upload → **usable** signed model with report, one warm 24 GB GPU worker (the phrase bank streams in afterwards, L62); the photo-only path reported separately | median ≤ 210 s, p95 ≤ 240 s over the nightly bench builds (cold start reported separately) | P | R1 |
| S14 | Playback | 30 fps at 720p (internal resolution ≤ 720 physical pixels tall, L56) on an Intel Iris Xe-class laptop in Chrome, with a lesson animation running behind the panel, over a 10-minute run; a mid-range Android phone at the phone tier reported | p99 frame ≤ 40 ms and ≥ 99% of frames on cadence | P | R1 |
| S15 | No pixel copy | Information-budget certificate complete, within its count budget, every dense field within its bandwidth (L42); patch-copy check; painter input audit (no photo reached L51); **colour-only identification**: renders of the norm head carrying only the person's photo-derived numbers (palette, gradients, contrasts, marks, curves) are identified by a check-only recogniser against the bench and pool no better than chance | pass on every build; colour-only rank-1 rate within ±0.05 of chance | P; E for the colour-only test | R1 |
| S16 | Fairness | S1, S2 and the style rating per Monk Skin Tone group, sex and age band | **Release 1: monitored report** (the pool has no acquaintances, and at ≈ 4 people per group one interval is ±16 points); gate later: no group more than 5 points below the mean on S2(b), with n from a power calculation | — (R1); NI (later) | R1 (report) |
| S17 | Provenance | Every weight and asset traces to a commercial-OK source; check-only models obey the rule (L3, static check of the build graph); every generated clip is in the server's generation log (model id, consent id, time, text hash, L63) | 100% (else the site refuses to publish) | P | R1 |
| S18 | Style | Owner's rating against references 1–8 (§8.3), over a light and a dark theme background, on moving clips at shipping size; raters asked "is the brush pattern identical?" on two bench teachers | owner ≥ 4/5; "identical": \|P(yes) − 0.5\| ≤ 0.1 | Owner's decision, recorded; E | R1 |
| S19 | Figure–ground | Silhouette contrast of the teacher against the actual page behind her, for all 24 theme × light/dark backgrounds × the 8 bench people, on Playwright screenshots of the real pages; deep Monk groups over light themes and black hair over dark themes are their own cells (L49, L52) | ≥ 3:1 along ≥ 90% of the outline in every cell | P | R1 |
| S20 | Attribution | Students answer, on lesson clips (R1) and live clips (Live): "was this voice recorded by [name], or made by AI?" (correct: AI, always) and "did [name] approve these words?" (lesson: yes; live: no) (L57, L86) | ≥ 90% correct on each question (lower bound ≥ 85%) | B | R1 / Live |
| S21 | Gate liveness | Each machine gate is run on its threshold mutant (about 1.25× its limit, L91) and must turn red; each rater gate (S2, S8, S9, S12, S18, S20, S22) contains catch trials | every machine gate red on its mutant; catch trials ≥ 90% correct, else that session is void | P | R1 |
| S22 | Voice likeness (human) | The S2(a) acquaintances, in the same session, hear four clips of one unseen sentence: the person's clone and clones of three pool people matched on sex, age band and first language, made with the same L60 settings; "which one is [name]?"; per narration language the person recorded (English; Hindi and Hinglish pooled), plus a cross-lingual arm (a language they did not record) reported only; MOS on the same clips | per language: pooled ≥ 80% with the lower bound ≥ 60% (chance 25%); MOS reported | B | R1 |

**Release profiles.** Release 1 is narrated lessons on our own pages: it needs every gate marked R1 (S20's
lesson arm only). Live replies in a teacher's voice (after D5 and D13) are a second release that also needs
the gates marked Live and S20's live arm. A gate cannot hold back a release whose features it does not
measure. The "needed for R1" column of §5.12 lists the layers release 1 needs; a release-1 gate may not pull
in a layer marked *Live* or *later*.

### 2.6 Owner decisions needed

These cannot be settled by engineering. Until the owner decides, the paper uses the default named.

| # | Decision | Why it is the owner's | Default in this paper |
|---|---|---|---|
| D1 | **The albedo-blur question, as a bandwidth.** How much spatial detail may a photo-derived colour field carry? The default keeps every dense field at or below 2 cycles per face width (smooth per-region gradients plus three contrast numbers); a band-limited colour field at $f_c$ cycles per face width would carry more, and familiar faces are recognised from block portraits of about 16 × 16 (≈ 8 cycles per face width; Harmon 1973) and use 8–13 cycles per face width (Näsänen 1999) | The finer map helps likeness but approaches the band people recognise faces with; where "photo pixels" begin is a reading of the brief, now stated as one number | 2 cycles per face width (L40, L42). The ablation in §8.5 has three arms (parametric, parametric plus contrast features, field at 4 cycles per face width), so the owner decides with numbers |
| D2 | **Template licence. Settled (2026-11-26), no owner action needed.** The MPFB2 licence (copy in `docs/voice/licences/2026-11-25/mpfb2-LICENSE.md`) says the assets (base mesh, proxies, targets, textures, clothes, rigs, expressions) are CC0 1.0 and, in §D, that the MakeHuman team "makes no claim whatsoever" over exports or "graphical data generated via scripting"; the functional packs (`faceunits01`, `visemes02`) and the clothes packs list every item as CC0; the MakeHuman `LICENSE.md` on GitHub master says the same (read by the build reviewer). The older AGPL wording is superseded | — | MakeHuman/MPFB CC0 assets, exact versions and hashes pinned in L3. MPFB and Blender code (GPLv3) run only on our own machines to make the template and are never shipped or distributed; a lawyer's look is optional, not a blocker. Our own template stays plan B |
| D3 | **Paying artists.** An owned style kit (30–60 painted portraits over our own plain renders) and a hand-painted master band set (4–6 sets on the template) need painters | Money, and who owns the work | The master band set is first generated by our procedural painter; if it fails the week-1 look spike (§8.6), staff paint it in Krita (owned outright, assignment in writing); an outside artist only if both fail. The style kit is not assumed; S18 falls back to the owner's rating |
| D4 | **Who is painted in the style kit.** Bench people (needs written consent to derivative artworks and to training a style model on them), artists' self-portraits, or fictional heads | Consent and paperwork | Fictional heads and artists' self-portraits |
| D5 | **Running cost of live conversation.** Live cloned speech needs a GPU running while students talk (§7.4); it is not free. **Consequence to know:** without a GPU kept up, most live replies will *not* be in the teacher's voice | Money | Lesson narration pre-rendered at publish time (free at play time); live replies in the cloned voice only while a GPU worker is up. Otherwise she never speaks in another voice: she shows listening and thinking cues and the answer appears as captioned text, or a clearly different, labelled presenter answers (L60) |
| D6 | **Check-only use of models trained on research data.** SFace (trained partly on the withdrawn MS-Celeb-1M), ECAPA speaker models (VoxCeleb) and XLSR phone recognisers (BABEL in pre-training) are used only to *check* a build (pass/fail), never to choose a shipped parameter | Legal risk appetite | Allowed as checks only (L3 rule); never ship their weights; replace each when a commercial-trained one exists. **Plan B if the owner says no**: L1's voice match and L2's face match become a two-person staff review of the consent clip beside the capture, logged in the consent record; S1's and S15's recogniser checks are dropped and S2 carries likeness alone |
| D7 | **Proportions.** Confirm realistic proportions with mild stylisation (brief's newer sentence) rather than the part table's anime eyes and nose. Whatever is chosen, the slider moves eyes, nose and mouth together with the painted material, so no mismatched mix (anime eyes on a realistic face) can be reached | The brief contradicts itself | Realistic, $s_{max}$ = 0.35 |
| D8 | **Warm worker.** Keep one GPU worker warm (cost) so builds meet 3–4 minutes, or accept 30–90 s more on a cold start | Money vs. the build-time promise | Warm worker during Studio hours; cold builds report their start-up time separately |
| D9 | **Diffusion painter.** Pursue the optional diffusion painter (L51 variant) at all: it would paint the template's master band sets once, offline (no per-build GPU time), but needs a base model whose licence must be confirmed and a style model trained only on the owned kit (D3) | Money and licence | Not pursued until D3 exists; the procedural painter is the default |
| D10 | **The bench, the foil pool and their raters.** Recruit 8 adults with written consent for a second-day capture, readings and hand clips (L0); about 30 more adults who give only the 3-minute guided capture (including the consent sentence and one read paragraph, ≥ 20 s of speech), with consent that names "used as lineup foils and fairness controls, shown to raters, and their voice used to make foil clones" (S2, S22); ≥ 5 acquaintances per bench person and ≥ 30 opted-in students per person for S2; an independent ethics review of the bench and the study (§8.4) before recruiting (good practice; not a legal duty for non-medical research) | People and paperwork; every gate depends on it | Required before any Stage C–F layer is called done |
| D11 | **When a teacher revokes consent.** Revocation deletes the model and every lesson clip narrated with it (L3). What do students of those lessons get? | Continuity of courses vs. the teacher's right to leave | Lessons fall back to a generic, labelled presenter with a default voice, re-narrated automatically; the teacher is told this before consenting |
| D12 | **Real-scan face data for the head prior.** ICT-FaceKit Light (MIT licence, file read by the face reviewer) has 100 identity modes from light-stage scans; whether its scan subjects consented to redistribution, and who they are (demographics), is not stated | Consent of third parties and fairness | Not used until both are checked; the prior is built from MakeHuman CC0 heads and consented builds, centred on published Indian anthropometric norms (L23) |
| D13 | **Live AI replies in a teacher's voice, by default.** Each teacher has a persona contract (L86) and can switch live replies off; should they start on or off? | Trust and the teacher's control over what "they" say | Off until the teacher reads the contract and switches them on (consent scope 3, L1); recorded lessons are unaffected; for students under 18, live replies in a real teacher's voice need a guardian's consent |
| D14 | **Regional norms and caricature.** Exaggerating away from one pan-Indian mean exaggerates regional ancestry for many people (L23, L24). Caricature can apply only to the deviation from a regional norm, which needs an optional, sensitive question ("which region's norm is closest to you?") or no caricature at all | Sensitive data and dignity | The question is optional with "prefer not to say"; without a regional norm (published, or ≥ 20 consented builds of that region) the person's $\gamma$ is 0. **Release 1 ships $\gamma = 0$ for everyone** (no regional norm exists yet); the caricature pilot is *later* |
| D15 | **Identity-pack portability.** Packs are useful for moving between accounts and machines, but a pack with photos and a clean voice clip is a ready deepfake kit if it leaks | Misuse risk vs. convenience | Downloaded packs hold measured numbers only and are encrypted to their subject; raw photos, texture and voice are an explicit opt-in export; every import needs a fresh live consent from the person shown (L1); revoked packs are refused by id |
| D16 | **S2's fallback target.** Strangers match photos to photos at about 70–90% (studies cited from memory, **UNVERIFIED**), and untextured painted renders may be harder; S2(a) at ≥ 90% may be out of reach | What "recognisable by eye" must mean if the first target fails | The owner writes a fallback before the week-5 pilot (§8.6); without one, (a) pooled ≥ 80% with the lower bound ≥ 65%. A pilot above the main target keeps it |

---

## 3. Innovation method

### 3.1 Design science, build → evaluate cycles

We follow design-science research (Hevner et al. 2004; mapped to software engineering in arXiv 1904.12742;
taught as a method in 2407.09844). Each layer is an artefact with (a) a requirement drawn from §2, (b) a
build, (c) an evaluation against a **gate** that is a number with a threshold, measured on the bench (L0)
and on held-out data, and (d) a recorded decision. A layer that fails its gate does not ship; the build
falls back to the layer's stated fallback, and the build report names it. A 2-person smoke bench runs on
every change; the full bench runs nightly and before a release (L91).

### 3.2 TRIZ: removing contradictions instead of trading them off

TRIZ (Altshuller) treats a hard design problem as a contradiction between two requirements and looks for a
principle that removes it (separation in time, space, condition or scale; intermediaries; prior action;
and so on). Recent work automates the search with language models (AutoTRIZ 2403.13002, TRIZ Agents
2506.18783, TRIZ-GPT 2408.05897); we used the method by hand, with those papers as checklists. The
contradictions and their resolutions:

| # | Contradiction | TRIZ principle | Resolution in Pratibimb |
|---|---|---|---|
| C1 | Likeness needs the person's appearance **vs.** no photo pixels may be used | Separation by scale ("separate the property from the carrier"); "the other way round" (#13) | Likeness lives in *geometry* (face shape, proportions, hair silhouette) and a few colour numbers. Detail is *painted*, not copied (L40–L43, L51). Lost texture cues are put back as geometry and as a few measured marks: a caricature term pushes the face *away* from a matched norm, at a strength chosen once by a human pilot (L24), and salient marks, lid crease and hairline are kept as numbers (L22). |
| C2 | Any gesture **vs.** no animation library or animator | Prior action (#10) + dynamism (#15) | Actions are goal programs solved every frame (analytic IK + limits + task-space paths + springs). The "library" holds goals, not motion (L73–L82). |
| C3 | Quality **vs.** an ordinary laptop | Separation in time (#10 prior action) | Heavy work once (shared priors, one authored template), fitting and baking per person, a small explicit model at run time (§6, §7). |
| C4 | Painted look every frame **vs.** temporal stability (painted filters flicker) | Separation in space (#17 another dimension) | The paint lives in texture space on the surface, painted once on the template: light, half-tone and shadow share one stroke layout, the run time recolours them by the palette and chooses between them by a stabilised shading normal (L50–L52). No screen-space paint filter. |
| C5 | Lips right in any language **vs.** no lip data for most languages | Intermediary (#24) | All languages pass through IPA phones, aligned on the audio the voice actually spoke; mouth shapes depend on articulation, not language (L59–L67). |
| C6 | Respond fast **vs.** think well | Preliminary action (#10), partial action (#16) | A visible attention cue at 250 ms (gaze steady, slight lean; no intake breath before the turn decision, so it never takes the floor), a neutral pre-synthesised phrase from the person's own bank, the rest streamed clause by clause; gestures planned from the streamed text before its audio exists; speculative drafting on the partial transcript later (L62, L78, L88). |
| C7 | Expressive listening **vs.** never misleading the student | Separation by condition | Agreement signals only after the grader marks a *final* transcript correct; nothing evaluative fires on partial transcripts (L85). |
| C8 | A cloned voice and face are useful **vs.** they can be misused | Self-service (#25) and "the other way round" (#13) | The model carries its own consent record with separate scopes, face and voice consistency checks, signature, watermark and visible label, and plays only in our player; every derived file is encrypted under the person's key, every synthesised clip is in a generation log only our server can write, and a pack moves only with the subject's fresh live consent (L1–L3, L57, L63, L90). |
| C9 | Build quickly **vs.** perfect result | Feedback (#23) | The build grades itself on held-out frames and spends its remaining time budget only on failing layers (L91). |
| C10 | One topology for everyone **vs.** everyone's own shape | Universality (#6) + intermediary (#24) | One template, built by a deterministic script from CC0 assets, carries every asset that must be made once (UVs, loops, weights, correctives, 52 face units, line and stroke attributes, the master paint); only its shape and expression ranges are fitted per person (L33–L38). |
| C11 | Teacher presence **vs.** the student's attention on the lesson | Separation upon condition (the lesson is moving or not) | While a lesson step animates she looks at it, with her head turned towards the board so the direction reads on a flat screen, and gestures only by pointing; direct gaze and expressive gesture return between steps (L72). |

### 3.3 Recombination

Creative results usually come from recombining proven pieces in a new arrangement (discussed for AI systems
in 2405.01453). Pratibimb recombines: dense-landmark face fitting (2204.02776), personalised blendshapes
(2007.06759, 2010.00560), template fitting by non-rigid ICP (Amberg et al. 2007), production stylised
shading with authored normals and painted light (Motomura, GDC 2015; Arcane's texture painting as described
in trade press), art-directable shading (Todo et al. 2007; Petikam et al. 2021), expression wrinkle maps
(Jimenez et al. 2011), the caricature advantage and norm-based face coding (Rhodes et al. 1987; Leopold et al.
2001), example-based facial rigging (Li et al. 2010), instructor guided gaze (Kuang et al. 2023), analytic arm IK with
scapulohumeral rhythm, constrained coarticulation, voice-activity and semantic endpointing, speculative
response generation (2609.20995), and an LLM tutor, under one shared clock and one set of explicit controls.

---

## 4. System overview

### 4.1 Stages

```
            BUILD (once per person, ≤ 4 min on one warm GPU)                 PLAY (browser, 30 fps)
 ┌──────────────────────────────────────────────────────────────┐   ┌──────────────────────────────────────┐
 │ A  Bench, consent & provenance  L0–L3                        │   │ J  Listen & converse   L83–L88       │
 │ B  Capture & reading     L4–L16   (on device + worker CPU)   │   │      student audio → turn state,     │
 │ C  Shape                 L17–L32  (who they are: geometry)   │   │      reactions, Guru → script        │
 │ D  Template fit & rig    L33–L38  (one owned template)       │   │ G  Voice               L58–L63       │
 │ E  Appearance            L39–L48  (colour numbers, eyes,     │──►│      text → IPA → cloned audio →     │
 │                                    mouth, hair, clothes)     │   │      spoken-phone alignment          │
 │ F  Painted look (bake)   L49–L51, L53                        │   │ H  Lips, face, attention  L64–L72    │
 │ G  Phrase bank (after signing) L62                           │   │ I  Body action         L73–L82       │
 │ K  Gates & packaging     L90–L91                             │   │ F  Painted renderer    L52–L57       │
 └──────────────────────────────────────────────────────────────┘   │ K  Clock & delivery    L89           │
                                                                    └──────────────────────────────────────┘
```

Stage G's voice reference and phrase bank, Stage H's mouth ranges and coarticulation parameters, Stage I's
skeleton limits and rest poses, and Stage F's per-person paint overlay and baked shading data are prepared at
build time (the master band set is part of the template); the stages on the right run at play time on the
person model the build produced. The phrase bank is synthesised after the model is signed and streams in
when ready. Lesson narration is synthesised once, at publish time, through Stages G–H on the server (§7.4).

### 4.2 Data flow at run time (one clock: the audio)

```
 student mic ─► L83 VAD / streaming ASR / echo guard ─► L84 turn state ─┬─► L85 reactions (final transcript + grader) ─┐
                                                                         └─► L86 Guru: streamed clauses, Leak Guard     │
                                                                               │ L87 barge-in, L88 speculation + bank    │
            ┌──────────────────────────────────────────────────────────────────┴──────────────┐                         │
            ▼                                                                                 ▼                         ▼
   L58 text norm ─► L59 G2P lattice ─► L60 cloned voice ─► audio ─► L61 align spoken phones   L73 action language
                     (server)            │ L63 watermark         + prosody (server)           L74 gesture plan
                                         ▼                                │                    L75 target (DOM → 3D)
   L64 visemes ─► L65 coarticulation (lips, jaw, tongue) ─► L66 jaw/lip range ─► L67 refine   L76 arm solver, L77 hands
   (server, shipped with each audio chunk as 52 values + events)                              L78 trajectories, L79 collisions
   L68 emotion, L69 blinks/brows, L70 head, L71 gaze (+VOR),  ┐                               L80 rest/idle/breath
   L72 attention beside the moving lesson ────────────────────┤                               L81 springs (body, hair, cloth)
                                                              ▼
                                     L82 mixer: pose(t) = {52 face values, jaw, tongue, eyes, skeleton} ◄──┘
                                                              ▼ (L89 audio clock, closure hold)
                    L37 skinning + head morphs + correctives ─► L52–L57 painted frame (three.js, WebGL2) ─► panel
```

### 4.3 The person model (what a build produces)

One signed file (`.pbmodel`, an extension of the identity pack format in `PACK_FORMAT.md`): a reference to
the pinned template version plus the person's fitted vertex positions (template topology, so UVs, weights,
correctives and authored attributes come from the template), LOD positions, 52 personal expression targets,
the skeleton with bone lengths and joint limits, hand parameters, the colour model (palette, smooth
per-region gradients and three contrast numbers; ≤ a few hundred numbers), a small paint overlay (feature
curves, salient marks, facial hair; the light, half-tone and shadow paint itself is the template's master
band set), feature curves (brows, lids, lips, lid crease, hairline), eye, teeth and tongue parameters, the
hair clump fit, wardrobe fit, motion-habit profile and rest poses, coarticulation parameters, the phrase bank (audio, phones, motion; Live), consent record
(with its list of scopes, L1), provenance ledger, information-budget certificate and the build report.
**Two bundles**: the **player bundle**, which students' browsers decrypt, holds only what drawing and motion
need; the **server bundle** holds the voice reference (speaker conditioning, per-language reference spans,
optional adapter) and the SFace identity vector of L2, and never leaves the server, because synthesis and
identity checks run there (a player file with clean voice spans and a face embedding would be a deepfake kit,
L90). The model and every file derived from it (narration audio, phrase bank, exported clips) are encrypted
under the person's data key (L3); players receive short-lived licences. Target download ≤ 8 MB per teacher
(≈ 6 MB expected, §7.2; the template and its master band set are cached once for all teachers; phrase bank
streamed separately, ≤ 2 MB).

---

## 5. The layers

### 5.0 How each layer is specified

Every layer below gives: **Purpose**; **In → Out**; **Method** (enough to implement); **Research** (cited;
papers are idea sources only); **Ours** (what is new or specific to us, if anything); **Defaults**;
**Fails → fallback**; **Gate** (measurable pass/fail); **Status** (*exists* = in code today, with the file;
*partial*; *to build*). Units: metres for the body, "head units" (1 = outer eye-corner distance, ≈ 9 cm)
for the face, seconds for time, 25 or 30 fps for motion. Expression values follow the 52 ARKit names that
MediaPipe's face landmarker outputs (2006.10962 for the face mesh). "Bench" means the 8-person bench of L0
and §8.2; "held-out" means frames from the end of the capture or another day, never used for fitting.
Distribution comparisons between a render and the person use effect sizes (Wasserstein-1 distance, or median
and 90th-percentile ratios within ±20%), never "a test failed to reject", which short clips always pass.
Every gate uses one of §2.5's decision rules (P, Z, B, E, NI): a sampled gate states its n or its power,
"at chance" means an equivalence test with a margin, "≥ baseline" a non-inferiority test with a margin, and
a claim that only a user study can test (learning gains, for example) belongs to §8.4, not to a layer gate.
**Status words**: *exists* means everything release 1 needs from the layer's method is in code; *partial*
means some of it is; *to build*, none. Status lines name files in the shipping stack
(`scripts/teacher/maker/`, `scripts/teacher/`, `client/src/pratibimb/`); files under
`scripts/pratibimb/engine/` are salvage sources to be moved into it (§8.7), not the shipping path.
All gates run in **one bench harness** (L91) with about twenty metrics; a layer gate that is only a system
gate says so ("S14") instead of restating it. Layers are a checklist; fourteen code modules are the unit of
ownership (§8.7). **Later** in a Status line means outside release 1 (§8.6).

---

### Stage A: Bench, consent, identity and provenance (L0–L3)

#### L0 The bench (first deliverable)
- **Purpose.** Almost every gate in this paper is measured on the bench; it must exist before any layer
  is called done.
- **In → Out.** Eight consenting adults (§8.2) → per person: the standard guided capture, a second-day
  capture, 5 minutes of reading in English and Hindi/Hinglish with the face visible, 2 minutes of free
  explanation with hands visible, a ruler measurement of hand length and palm width, and a colour chart in
  frame for one capture of each day (for L13's gate); the written consent records. A **foil and fairness
  pool** of about 30 more adults who give only the 3-minute guided capture. A synthetic hard-negative
  gallery (≥ 50 heads per person sampled from the head prior near that person, L23) for the S1 regression.
  The S2 raters (≥ 5 acquaintances per person, ≥ 30 opted-in students per person) and S12's raters from at
  least five regions of India (North, South, East, West, Northeast).
- **Method.** Recruit to the coverage of §8.2; written consent naming each use separately (bench gates,
  showing the person's photo and renders to raters, retention and deletion; L1's scopes 5 and 6); store
  encrypted with the same crypto-shredding as models (L3). **Foil pool**: synthetic foils lack the measured
  marks, creases and asymmetry the real person's render carries, so the true render would stand out for
  being *measured*; the pool's people are built by the same pipeline, so foils and targets carry the same
  kinds of measured detail. **Attribute transplant**: matching foils on sex, Monk group, hair length, glasses
  and brow shape at once leaves a glasses wearer about 30 × ¼ × ½ × ⅓ × ½ × ⅓ ≈ 0.2 eligible foils out of 30,
  and facial hair or a head covering would still give the target away. Every attribute is a parameter, so
  each foil is rendered with the **target's** hair fit, glasses, facial-hair map, head covering and garment
  while keeping its own face geometry, marks and palette; only sex and a coarse Monk bin are matched (≈ 5
  candidates each). The pool is also S16's report set and S22's voice-foil set (each member gives ≥ 20 s of
  speech). The
  synthetic gallery is made by sampling head-prior coefficients at a distance $r$ from the person's (hard
  negatives), rendered by the same pipeline. $r$ is calibrated **perceptually** once: the distance at which
  raters tell two synthetic heads apart 75% of the time. Because the prior is mostly MakeHuman-like heads,
  S1 margins are trusted only where they agree with S2. **Catch trials** (S21): every rater session
  includes items with a known answer (a lineup whose target is an unaltered build next to obvious foils, a
  clip that nods at a wrong answer, a voice lineup with one obviously different speaker), so careless
  sessions are found and voided.
- **Research.** Design-science evaluation (1904.12742); impostor controls in face verification (2205.12010).
- **Ours.** A bench of second-day captures, a real-person foil pool built by the same pipeline, and
  perceptually calibrated synthetic impostors for stylised likeness.
- **Defaults.** 8 people; pool ≈ 30; smoke bench = 2 of them (one light, one deep Monk group).
- **Fails → fallback.** None: without the bench, layers stay "unverified" in the index. Synthetic heads
  need no bench people and serve the plumbing tests from week 1.
- **Gate.** All 8 people's material and the pool's captures complete and consented for each named use,
  raters recruited (owner decision D10).
- **Status.** *Partial*: the harness `scripts/teacher/maker/bench.py` (held-out clips, every model against
  every other person as a control) and `likeness.py` exist; people, pool, consent, raters and the synthetic
  gallery *to build*.

#### L1 Consent capture and verification
- **Purpose.** Nothing is built, and nothing moves to another account, unless the person shown agreed,
  live, on camera, in their own words and voice, to each use.
- **In → Out.** A live consent capture in the browser (video + audio), account, declared age ≥ 18 → signed
  consent record `{who, by_whom, sentence, challenge, transcript, time, clip_hash, scopes[], language,
  voice_match, nominee?}`.
- **Method.** **Live only**: the clip is captured in the browser by our page, never uploaded as a file. The
  person reads a sentence naming NexoraGuru and the right to delete, with a **random challenge** inserted
  (4–6 words or digits shown only at capture time) and one or two unplanned actions requested on screen (a
  turn to one side, a hand passing in front of the face). Speech recognition (L83's recogniser) checks the
  sentence and the challenge words; a pre-recorded or pre-generated video of the person cannot contain them,
  and challenge–response measurably degrades real-time face swaps (GOTCHA, 2210.06186). Liveness: blink and
  mouth motion correlated with the audio envelope (r ≥ 0.3), and the requested actions seen in the landmarks.
  **Voice match**: the voice reference chosen in L15 must be the same speaker as the consent clip (ECAPA
  cosine above the same-speaker line, a check-only model, L3). **Attacker model, stated**: the challenge
  defeats *offline* replay (a pre-made video or clone cannot contain words chosen at capture time); it does
  not defeat a real-time voice clone or face swap that speaks the challenge (L60's own gate makes clones
  score close to the real voice, and GOTCHA's challenges reach 88.6% AUC, not 100%), so those are measured
  and reported, not claimed as rejected. **"Someone you know" mode**: the subject
  records on **their own** signed-in account or on a one-time link opened on their own phone, never on the
  uploader's device, and both people get a copy of the record; the subject, not the uploader, owns every
  later choice (L22's keep/remove list, scopes, deletion). **Scopes**, each its own yes and each revocable
  alone: (1) build my model; (2) recorded narration in my voice; (3) live AI replies in my voice (D13); (4)
  add my measurements to the shared norm and head prior (L23); (5) use me on the bench and show my photo and
  renders to raters (L0, S2); (6) use me in the user study (§8.4). The notice and the spoken sentence are
  offered in the person's language (English or a Schedule-8 language), but the **random challenge is spoken in
  English or Hindi**, the two languages the on-server recogniser covers among Indian ones (Qwen3-ASR's model
  card lists 30 languages; read 2026-11-27): a challenge the checker cannot verify would be no check, and the
  consent clip is never sent to the site's outside recognition services. For staff and paid teachers the
  notice states that building a model is not a condition of work or of payment (consent must be free:
  DPDP Act 2023; withdrawal as easy as giving consent: DPDP Rules 2025, notified November 2025; section
  numbers **UNVERIFIED** this round). The record may name a **nominee**; on death or incapacity the model
  retires and lessons follow D11, unless the person chose otherwise. **Every import of an identity pack, into
  any account, repeats this capture** with the person shown, and L2 compares the new clip with the pack's
  identity; a pack's own consent field is never a valid consent.
- **Research.** Consent and authorised use of synthetic talking heads (avatar fingerprinting 2305.03713);
  challenge–response against real-time deepfakes (GOTCHA 2210.06186: 8 challenges, 88.6% human AUC, from
  the abstract); ethics of identity in synthetic media (2604.12490, 2104.05030); ECAPA-TDNN (2005.07143).
  India's DPDP Act 2023 and Rules 2025; IT Rules amendment (2026) labelling duty (secondary sources;
  Gazette text **UNVERIFIED**).
- **Ours.** Challenge consent bound to face *and* voice, with per-use scopes, required again on every move of
  the identity between accounts.
- **Defaults.** WER ≤ 0.25 after normalisation; all challenge words recognised; liveness r ≥ 0.3; ECAPA
  same-speaker line calibrated on the bench; age is declared (we do not estimate age from faces: estimates
  are biased and unreliable); no scope pre-ticked.
- **Fails → fallback.** Ask to record again with the reason in plain words; nothing is built or imported.
- **Gate.** 100% of builds and imports have a valid live record for every scope they use (P); the offline
  attack set is rejected in 100% of ≥ 30 attempts per kind (Z): a photo, a screen replay of someone else, a
  face-swapped and voice-cloned replay of the sentence (without the challenge), an uploaded file, and a pack
  import without fresh consent. Real-time voice swaps and virtual-camera face swaps that answer the challenge
  are run and their acceptance rates reported; they are a stated residual risk, not a passed test.
- **Status.** *Partial*: consent record and clip in `worker.py`/`pack.py`; unsigned packs refused on
  import (`src/routes/pratibimb.js`, commit 5fa24edb); live capture, challenge, ASR check, liveness, voice
  match, scopes, nominee and consent on import *to build*.

#### L2 Identity lock
- **Purpose.** The face in the consent clip must be the face the model is made of, and every later build
  must be of the same person. It is a **consistency check** and a second factor next to L1's live
  challenge consent, not a security lock on its own.
- **In → Out.** Consent clip frames, capture frames → identity vector (SFace, 128-d), match score, lock.
- **Method.** YuNet face detection, SFace embedding (2205.12010) of the 5 sharpest consent frames and of the
  capture's main person (L6); take the maximum cosine over pairs; store the mean capture embedding in the
  model. A rebuild compares a fresh L1 clip with the stored embedding; a pack import compares the *new*
  consent clip (L1) with the pack's capture, so the check never trusts anything carried inside the pack
  alone. Photo-to-photo comparison only (SFace's own domain); it is a check, not a chooser (L3).
- **Research.** SFace (2205.12010); YuNet/SFace from the OpenCV model zoo (MIT/Apache-2.0).
- **Ours.** —
- **Defaults.** Same-person line cosine 0.363 (SFace's published threshold, not validated by us).
- **Fails → fallback.** "The face in the consent video is not the face in the photos" (existing message).
- **Gate.** (P, Z) Bench: all 8 genuine pairs pass; all 56 cross pairs fail. Stated honestly: 0 of 56 cross pairs
  bounds the false-match rate only at ≤ 5.4% (95%, rule of three), so the check is reported as a
  consistency check; sibling or parent pairs are added to the attack set where bench people agree, and
  their result is reported.
- **Status.** *Partial*: `consent_matches` in `scripts/teacher/maker/worker.py` (capture path); the import
  path through a fresh consent clip *to build*. The identity vector moves to the server bundle (§4.3).

#### L3 Provenance ledger, labelling and revocation
- **Purpose.** Prove that every part of a model is commercially usable, label all output, and make
  deletion reach every copy we control, every derived file and every shared aggregate.
- **In → Out.** Build inputs (datasets, weights, assets, template version, code version) → ledger in the
  model manifest; `publishable: true/false`; label and watermark settings; a deletion key; the person's
  entries in the pack and generation registries.
- **Method.** Every prior, weight and asset file carries a licence tag and a content hash; the ledger is the
  union of tags over the build; any tag not in the allow list (`COMMERCIAL_OK` in `build.py`) makes the
  model research-only and the site refuses to publish it. **Check-only rule**: a model whose training data
  is not commercial-OK (SFace, ECAPA, XLSR phone recognisers) may only produce pass/fail on a build; it may
  never choose a shipped parameter, and its weights are never shipped (owner decision D6). The ledger records
  each check-only model and what it checked. The template is pinned by version and by the hash of every
  MakeHuman/MPFB asset it uses (D2, settled); the GPL tools that build it (MPFB, Blender) are recorded as
  internal tools that are never shipped. Items still to check before shipping: the Libri-Light pre-training
  data of the aligner (L61; the MIT licence on Libri-Light covers its code, and the LibriVox audio terms are
  **UNVERIFIED**), the Hindi pack of the TTS (L60), YuNet's training data (WIDER FACE, terms **UNVERIFIED**),
  ICT-FaceKit's scan subjects (D12), and any phone-feature table we borrow for L64; the KTX2/Basis transcoder
  and `c2pa-rs` only when their *later* features enter. **Envelope keys**: the model, pre-rendered narration
  audio, the phrase bank and exported clips are all encrypted under the person's data key, held by the
  server; deletion destroys the key and the files (crypto-shredding), so every copy **we control** dies with
  the key (server, CDN, our cache). A browser that held a licence has seen plaintext, so a copy saved from it
  cannot be recalled; that is stated to the person. Short player licences (7 days) are *later*, with the
  release whose clips or models leave our pages. **Packs**: downloaded packs are encrypted to
  their subject (a key released only to the subject's own verified account, or derived from a passphrase
  they set) and hold measured numbers only unless raw media are opted in (D15); the server keeps a list of
  pack ids and refuses revoked ones even when the file survives. A plain-ZIP pack already downloaded before
  this rule cannot be recalled; that is stated to the person. **Aggregates**: crypto-shredding does not
  remove a person from a mean or a PCA, so the head prior and the norm (L23) are refitted exactly on any
  revocation of scope 4 (both are cheap), and a person enters them only once ≥ 20 contributors exist, so the
  norm is never close to one face. **Watermark ids** (L63) are never reused; the registry keeps "revoked on
  <date>" so a leaked clip can still be answered.
- **Research.** Provenance tracking for synthetic media (FakeTagger 2009.09869; proactive defence
  2607.20564); DPDP Rules 2025 on withdrawal (secondary sources).
- **Ours.** Licence provenance as a hard build gate, not documentation, including which models were allowed
  to judge and which to choose; revocation that reaches derived files, packs by id, and shared aggregates.
- **Defaults.** Allow list: own consented data, CC0, CC-BY, MIT, Apache-2.0, BSD (§6.3); aggregates need
  k ≥ 20.
- **Fails → fallback.** Research-only model, never shown to students.
- **Gate.** S17: 100% traced; no check-only model on a parameter-choosing path (static check of the build
  graph); a deletion test leaves no readable model, narration, bank or clip on server or cache, refuses the
  deleted pack id on import, and shows the refitted norm without the person.
- **Status.** *Partial*: `--datasets`/`COMMERCIAL_OK` in `scripts/pratibimb/engine/build.py` (to be moved
  into `pipeline.py`, which has no ledger today); signed pack in
  `pack.py`; unsigned packs refused on import (`src/routes/pratibimb.js`); per-asset CC0 refusal in
  `scripts/teacher/build-vrm-teacher.py`; licence records in `docs/voice/licences/2026-11-25/`; check-only
  rule, envelope keys, pack encryption and id list, and aggregate refits *to build*.

---

### Stage B: Capture and reading the person (L4–L16)

Stage B runs on the person's device during capture where possible (MediaPipe web), and again on the
worker CPU for photos and uploads. Its output is the identity pack (`PACK_FORMAT.md`).

#### L4 Capture coach and coverage planner
- **Purpose.** Get the views, expressions and hand shapes later layers need, from people who are not
  photographers, without a long session.
- **In → Out.** Live camera frames → per-shot checks (face size, angle, light, sharpness, eyes open, one
  person), auto-shutter, a coverage map, and "the next shot to take".
- **Method.** A coverage vector over required cells: head yaw {−85, −60, −30, 0, 30, 60, 85}° × pitch
  {−20, 0, 20}° (the near-profile cells feed the profile-contour term of L19); expressions {neutral, smile,
  "aah", "ooh", "ee", brows up, frown, eyes closed}; hands {open palm front, back of hand, point, count 1–5};
  waist-up front. Each cell has a quality floor (L5). The coach asks for the cell with the largest expected
  gain to the gates that are weakest (e.g., the side silhouette for L23). **Camera distance**: a phone held
  at 30–40 cm widens the nose base and narrows the face (a 12-inch selfie makes the nasal base look about
  30% wider than at 1.5 m; Ward et al. 2018); the distance estimated by L19 is shown live, and below ≈ 45 cm
  the coach asks the person to step back or use the rear camera with a helper.
- **Research.** The camera coach idea of `ENGINE.md` §3.6; dense landmarks integrate shape across frames
  (2204.02776); selfie distance distortion (Ward, Ward, Fried, Paskhover 2018, *JAMA Facial Plast Surg*,
  doi 10.1001/jamafacial.2018.0009; abstract read).
- **Ours.** Coverage driven by downstream gates: the coach asks for what will raise the weakest gate.
- **Defaults.** Minimum: front, two three-quarter views, one near-profile per side, smile, "aah"; camera
  ≥ 45 cm; ≤ 3 min.
- **Fails → fallback.** Build proceeds; missing cells named in the report ("show the back of your hand").
- **Gate.** On the bench, coached captures reach "Good" coverage in ≤ 3 min for 8/8 people.
- **Status.** *Partial*: guided scan, shot list and coverage meter exist in the Studio; gate-driven next
  shot *to build*.

#### L5 Frame quality, liveness and shot cuts
- **Purpose.** Keep only frames that carry true information.
- **In → Out.** Frames → quality score per frame; rejected stills, repeats, covered faces, cuts.
- **Method.** Sharpness = variance of the Laplacian inside the face box; exposure from the face's
  luminance histogram; motion blur from the ratio of gradient energy along vs. across motion; face size in
  pixels. A real face always moves: frames whose landmark layout is identical within ±2 s are flagged as a
  still picture. Cuts: large jumps in colour histogram and identity position. **Mirroring**: front-camera
  photos are often saved mirrored; mirrored files are found from the source and EXIF data and checked
  against the video's own asymmetry (hair parting, marks), then un-mirrored, so asymmetry is never learned
  flipped. The student always sees the true (unmirrored) person.
- **Research.** Standard image-quality cues; occlusion-aware fitting (2305.11522).
- **Ours.** Still-picture and repeat rejection by landmark-layout constancy (exists).
- **Defaults.** ≥ 40 usable frames, face ≥ 160 px across.
- **Fails → fallback.** Ask for more frames; photo-only path with fewer gates.
- **Gate.** ≥ 40 usable frames, or the build stops with a named reason; every bench photo's handedness
  correct.
- **Status.** *Partial*: `sharpness`, `quality`, `covered`, stillness check in `capture.py`, and
  `upright.py`/`analyse.py` in the shipping build (turn tags, photos set aside with a reason); mirror check
  *to build*.

#### L6 Main-person tracking
- **Purpose.** Use only the consenting person, even in interviews or classrooms.
- **In → Out.** Frames → frames and boxes of one identity.
- **Method.** The person is chosen by **MediaPipe track continuity** from the frames of the live consent
  capture (L1's liveness), not by a recogniser: SFace choosing the build's frames would make a check-only
  model choose a shipped input (L3). SFace then only *confirms* (pass/fail) that the chosen track matches
  L2's lock.
- **Research.** MediaPipe tracking; SFace 2205.12010 (check only).
- **Ours.** —
- **Defaults.** Track broken at a gap > 0.5 s or a box jump > 30% of its width.
- **Fails → fallback.** If the track does not match the lock, stop.
- **Gate.** Other people never used (Z: manual audit of bench clips with bystanders, 0 frames in ≥ 2,000);
  the static check of L3 finds no SFace output on a choosing path.
- **Status.** *Partial*: `capture.py` (clusters by SFace today; selection by track continuity *to build*).

#### L7 Dense face points
- **Purpose.** The basis of face shape and expression: 478 3D points per frame.
- **In → Out.** Frame + face box → 478 points (468 face + 10 iris), image pixels, z scaled like x.
- **Method.** MediaPipe Face Landmarker on a crop zoomed so the face fills the input (small faces in
  webcam frames otherwise lose accuracy); points mapped back to the full frame. On our renders it runs only
  as a drawing check (L24) and on plain-shaded renders in the fixed-point gate (L91); the lip gates read
  the gate render's geometry buffer instead (S3, S4), because painted, banded faces are outside its domain.
- **Research.** Attention Mesh (2006.10962); dense landmarks beat sparse ones for fitting and integrate
  across frames (2204.02776).
- **Ours.** Zoom crop before detection (exists).
- **Defaults.** Crop margin 1.6 × face box.
- **Fails → fallback.** Frame dropped.
- **Gate.** Detection on ≥ 95% of usable frames; mean landmark jitter on static frames < 0.5% of eye distance.
- **Status.** *Exists*: `zoom_landmarks` in `capture.py`; `analyse.py` in the shipping build.

#### L8 Expression reading and per-person calibration
- **Purpose.** 52 expression values per frame that read 0 on this person's neutral face.
- **In → Out.** Frames → 52 values per frame, calibrated.
- **Method.** MediaPipe's blendshape head gives raw values $b$. Some faces read non-zero at rest (e.g., a
  natural mouth-corner droop reads as frown). Estimate the person's neutral offset $b_0$ as the robust
  low percentile (10th) of each value over calm frames, and the person's range $b_{95}$; calibrated
  $\hat b = \mathrm{clip}((b-b_0)/(b_{95}-b_0+\epsilon),0,1)$ for values whose range is reliable, otherwise
  $b-b_0$.
- **Research.** Personalised face models for tracking and retargeting (2007.06759); rig semantics for
  tracking (2508.08429).
- **Ours.** Neutral and range calibration per person, which the lips and the expression model inherit.
- **Defaults.** Calm frames = speaking off and head speed < 5°/s.
- **Fails → fallback.** Uncalibrated values (the expression model still fits, with more error).
- **Gate.** Neutral frames read ≤ 0.1 on every value after calibration.
- **Status.** *Partial*: values read in `capture.py` and `analyse.py`; neutral frames chosen by `neutral()`;
  calibration *to build*.

#### L9 Head pose
- **Purpose.** Separate head motion from face shape.
- **In → Out.** 478 points → rotation (yaw, pitch, roll), scale and translation per frame.
- **Method.** Similarity Procrustes of the frame's stable points (forehead, nose bridge, temples, eye
  corners: `STABLE` in `rig.py`) onto the canonical face (L17); angles relative to the person's own
  "straight ahead" (median of front-facing frames).
- **Research.** Generalised Procrustes (Gower 1975); Umeyama (1991) similarity alignment.
- **Ours.** Person-relative zero.
- **Defaults.** 21 stable points.
- **Fails → fallback.** Frames with residual > 3% of eye distance dropped from pose statistics.
- **Gate.** Pose jitter on still frames < 1°.
- **Status.** *Exists*: `umeyama` in `pack.py`, turn per photo in `analyse.py`; `procrustes` in `rig.py`
  (salvage).

#### L10 Body points and metric lift
- **Purpose.** Shoulder width, arm and torso lengths in metres.
- **In → Out.** Frames → 33 body points (image + 3D) per frame; metric scale from the face (L18).
- **Method.** BlazePose points (2006.10204). Bone lengths are constant over time, so each bone's length
  is the median over frames where both ends are visible with confidence ≥ 0.7, then scaled by the face's
  metric scale (eye distance in mm from L18). Shoulder width is clamped to human ratios to head size.
- **Research.** BlazePose (2006.10204); bone-length constancy (2002.10322); metric-scale pose (MeTRAbs
  2007.07227).
- **Ours.** Face-metric scaling of the body (the iris gives millimetres; the body inherits them).
- **Defaults.** Shoulder joints 3.1–3.7 (female) or 3.4–4.1 (male) outer-eye distances apart (in `body.py`).
- **Fails → fallback.** Anthropometric ratios from the head size.
- **Gate.** Bone-length coefficient of variation < 5% across frames.
- **Status.** *Partial*: `capture.py`, `pack.py`, body proportions in `analyse.py`; `proportions()` in
  `body.py` (salvage).

#### L11 Hand points
- **Purpose.** Hand size, the person's handedness and hand habits.
- **In → Out.** Frames → 21 points per visible hand, handedness, confidence.
- **Method.** MediaPipe Hands (2006.10214) on crops around the wrist points; keep hands that are
  unoccluded (all 21 points inside the frame, confidence ≥ 0.8, not overlapping the face box). Per-phalanx
  lengths are **not** read from these points (monocular hand "world" coordinates lean towards the tracker's
  prior and are biased by foreshortening); L29 fits three numbers per hand instead.
- **Research.** MediaPipe Hands 2006.10214; hand-pose review 1604.06195.
- **Ours.** —
- **Defaults.** ≥ 10 good hand frames.
- **Fails → fallback.** Proportional hands (L29 fallback), flagged in the report.
- **Gate.** ≥ 10 hand frames, or the report says the hands are estimated.
- **Status.** *Exists*: `capture.py`.

#### L12 Part segmentation
- **Purpose.** Masks for hair, face skin, neck, clothes and background; silhouettes for shape layers.
- **In → Out.** Frames → per-frame part masks.
- **Method.** MediaPipe selfie and hair segmentation; face-skin mask from the face mesh's oval minus eyes,
  brows and lips; clothes = person − skin − hair. Masks are eroded 2 px to avoid colour bleed.
- **Research.** Standard segmentation; masks for hair silhouettes (2306.05872).
- **Ours.** —
- **Defaults.** Erosion 2 px at 512 px.
- **Fails → fallback.** Face-oval-only colours; hair from the default style for the measured length.
- **Gate.** Mask IoU between consecutive calm frames ≥ 0.9.
- **Status.** *Exists*: `_parts.png` masks in `capture.py`.

#### L13 Colour calibration
- **Purpose.** Colours of the person, not of the room.
- **In → Out.** Frames + masks → white-balanced colours per frame, with an uncertainty.
- **Method.** The sclera is used as an *estimate* of a neutral, not as a neutral: it darkens, reddens and
  yellows with age (Russell, Sweda, Porcheron and Mauger 2014, *Psychol. Aging* 29(3), abstract read), and
  conjunctival pigmentation may be commoner in darker skin (**UNVERIFIED**). Sample the eye-white pixels
  inside the eye ring excluding the iris disc; per-channel gain so their median reaches the **expected
  sclera colour** for the person, not pure grey; then exposure normalisation by the face's mid-tone. Only the
  lower two-thirds of the sclera is sampled, without specular pixels (the upper lid shades the top). The
  expected colour is a **3-parameter model per Lab channel**, offset $= a + b\cdot\text{age} +
  c\cdot L^*_{skin}$, fitted on the **foil pool**, whose captures each include a printed colour card (it costs
  cents and gives ≈ 30 calibrated people), and **tested on the bench**, so fit and test never share people; a
  grid of age band × Monk group would leave ≤ 1 person per cell. Colours are stored in
  CIELAB. Without the prior, older and deep-skinned teachers would be balanced bluish, which is exactly the
  failure S16 looks for.
- **Research.** Skin-tone estimation must disambiguate light and albedo to avoid bias against dark skin
  (2205.03962, 2411.12002); sclera colour and age (Russell et al. 2014).
- **Ours.** Eye-white reference with a learned age- and Monk-dependent offset; also used to flag coloured
  light (gain spread across channels > 30%).
- **Defaults.** Gains clamped 0.6–1.6; prior offset 0 until the pool has been fitted.
- **Fails → fallback.** Grey-world on the background mask.
- **Gate.** (B) On bench captures with a colour chart in frame (people the model was not fitted on), skin
  colour after correction within ΔE₀₀ < 4 of the chart-calibrated photo, mean over the bench with the upper
  95% bound < 5; ΔE reported per Monk group and age band, not gated per cell; deep-skin capture error
  reported on its own (the old "sclera chroma ≤ 4" gate is removed: the correction forced it, so it could
  not fail).
- **Status.** *Partial*: `white_gain` in `capture.py`; prior offset and chart gate *to build*.

#### L14 Accessories and facial hair
- **Purpose.** Glasses, beards, moustaches, bindis, turbans and earrings matter for recognition by eye.
- **In → Out.** Views + masks → `{glasses: frame shape, colour, rim thickness; facial hair: region map
  (moustache, chin, cheeks), density, colour; head covering; earrings; bindi: position, size, colour}`.
  Each accessory has its own on/off toggle in the Studio, off unless the person turns it on (a bindi is an
  accessory, worn some days and not others, never recorded as an identity mark: recording it would infer
  religion or marital status).
- **Method.** Glasses: edge density along the brow–cheek band and a reflection test; rim shape traced as
  a closed curve around each eye from the best front view, fitted as a superellipse. Facial hair: texture
  energy and darkness inside fixed regions of the face mesh (upper lip, chin, jaw, cheeks) relative to the
  person's forehead skin. Head covering: hair mask replaced by a cloth-coloured region above the forehead.
- **Research.** Avatar diversity and self-presentation (2208.11170); facial hair capture (2606.08041,
  for ideas only).
- **Ours.** Accessories stored as parameters, not pixels; redrawn by our own generators (L32).
- **Defaults.** Region thresholds learned on the synthetic accessory renders (§6.1).
- **Fails → fallback.** Ask "Do you wear glasses in lessons?" in the Studio.
- **Gate.** Bench: glasses and facial-hair presence correct 8/8.
- **Status.** *To build*.

#### L15 Voice extraction and quality
- **Purpose.** Clean references for the voice clone, per language, and the person's prosody statistics.
- **In → Out.** Audio tracks → 16 kHz mono speech, speaking spans with a language label, SNR, pitch range,
  rate; the chosen reference span per language.
- **Method.** Voice activity detection; SNR from speech vs. non-speech energy; F0 by autocorrelation
  (YIN-style) over voiced frames; syllable rate from energy peaks. Spoken-language ID per span. Choose the
  best 10–30 s reference **per language**: a reference in another language than the target makes the clone
  inherit that accent (the Chatterbox README's own warning), so Hindi output uses a Hindi reference when one
  exists. The chosen spans are checked against the consent voice (L1).
- **Research.** Voice cloning needs clean references (survey 2505.00579); Chatterbox README (accent
  transfer from the reference).
- **Ours.** Per-language reference selection tied to the consent voice.
- **Defaults.** SNR ≥ 20 dB for a reference.
- **Fails → fallback.** Ask for a 30 s reading in a quiet room (in each language the person teaches in);
  default Indian voice until then. Narration in a language the person did not record is cross-lingual
  (`cfg_weight` 0); until S22's cross-lingual arm passes, it needs the teacher's approval of a sample.
- **Gate.** One reference ≥ 10 s at SNR ≥ 20 dB per language used, matching the consent voice.
- **Status.** *Partial*: `voice.wav` and spans in `capture.py`; SNR, pitch and language ID *to build*.

#### L16 Motion-habit profile
- **Purpose.** How this person moves: the "style" for every motion layer.
- **In → Out.** Per-frame values and pose → profile: blinks/min and blink duration; head speed and range
  per axis; nod rate; mouth range per viseme class while speaking; smile and brow-raise share; hand
  visibility, height, rest position and gesture rate; pause lengths.
- **Method.** Event detection on the calibrated values (blink = mean eyeBlink > 0.5); robust statistics
  (median, 10th/90th percentiles). Mouth range per class uses L61's phone times when the capture has speech.
  Rest positions of the hands (clasped at the waist, hand on wrist, arms down) are clustered from the free
  explanation video where present (L80). **Head–prosody coupling**: on the capture speech, the lagged
  cross-correlation of each head axis (pitch, yaw, roll) with syllable energy and with F0, keeping the peak
  value and lag per axis; many Indian speakers carry their rhythm on a roll or yaw wobble rather than on
  pitch nods, and that rhythm is part of likeness by eye (drives L70).
- **Research.** Blink statistics in conversation (Bentivoglio et al. 1997); speaking style capture (VOCA
  1905.03079); personalised audio-driven motion by retrieval (2604.23692); head motion coupled to F0 and
  energy (Yehia, Kuratate and Vatikiotis-Bateson 2002, *J. Phonetics*; Munhall et al. 2004, *Psychol. Sci.*;
  details **UNVERIFIED**).
- **Ours.** Per-viseme-class mouth range and per-axis head–prosody coupling from the person's own speech
  (drive L66 and L70).
- **Defaults.** Population values when a statistic has fewer than 20 events.
- **Fails → fallback.** Population defaults.
- **Gate.** Blink rate on two halves of the capture agree within ±20%.
- **Status.** *Partial*: profile in `capture.py`; per-class range and rest positions *to build*.

---

### Stage C: The person's shape (L17–L32)

Stage C measures *who they are* as geometry: targets that Stage D fits the template to.

#### L17 Canonical face
- **Purpose.** The person's neutral 3D face in a fixed head frame.
- **In → Out.** All frames' 468 points → mean face, head frame (origin between the eyes, x along the eye
  line, y to the chin).
- **Method.** Iterative generalised Procrustes on stable points (3 iterations); axes from the eye corners
  and chin; the neutral face is the intercept of the expression regression (L20), i.e., the face with
  every expression value at 0.
- **Research.** Gower 1975; dense-landmark integration across frames (2204.02776).
- **Ours.** Neutral as the regression intercept, not a single "neutral" frame.
- **Defaults.** Ridge λ = 0.05·n.
- **Fails → fallback.** Best single front frame.
- **Gate.** Held-out face error < 2% of eye distance (measured 1.05%, same-session; second-day to be measured).
- **Status.** *Exists*: `scripts/teacher/fit/shape.py` (one 3D shape from all usable photos, mouth
  ignored where they smile; run twice by `pipeline.py`, once on the base model's own renders so the reader's
  bias cancels); `Rig.build` in `rig.py` (salvage).

#### L18 Metric scale
- **Purpose.** Millimetres, so the body, eyes and teeth have true sizes.
- **In → Out.** Iris rings and pupil distance → mm per head unit, with uncertainty.
- **Method.** Horizontal visible iris diameter is nearly constant across adults (≈ 11.7 ± 0.5 mm);
  measure it on the 10 iris points of front frames; combine with a population prior on interpupillary
  distance by inverse-variance weighting.
- **Research.** Iris diameter constancy (Hashemi et al. 2015); iris visibility as a quality metric (2510.19884).
- **Ours.** Combined estimate with uncertainty (exists).
- **Defaults.** Iris 11.7 mm, σ 0.5 mm.
- **Fails → fallback.** Population eye distance (≈ 88 mm outer corners).
- **Gate.** Uncertainty < 8%.
- **Status.** *Exists*: `pack.py` (`scale_mm_per_outer_eye_unit`).

#### L19 Multi-view depth refinement
- **Purpose.** Landmark depth from one camera is weak; several views fix it.
- **In → Out.** Canonical face + views at different yaw → refined 3D points.
- **Method.** Treat each view's 2D points as observations of one rigid 3D face (neutral views only).
  Bundle adjustment over the 468 points and per-view poses under a **full pinhole camera** (focal length from
  EXIF when present, otherwise solved jointly; the iris diameter of L18 fixes absolute depth, so the camera
  distance is observable and reported to L4), with a Laplacian smoothness prior on the face mesh to stop
  single points drifting; robust (Huber) loss. **Profile contour**: the 468-point mesh is weakest where the
  three-quarter view gets its identity (nose dorsum and tip projection, philtrum and lip protrusion, chin
  projection, forehead slope), which are occluding contours; in views with |yaw| ≥ 60° a chamfer term pulls
  the projected occluding contour of the fitted face to the edge of the person mask (L12). Only the mask is
  used, never pixels.
- **Research.** Multi-view geometry consistency for face reconstruction (2007.12494); prior-guided
  multi-view head reconstruction (2107.04277); multi-view consensus landmarks (1910.06007); selfie
  perspective distortion (Ward et al. 2018; perspective-aware portraits, Fried et al. 2016, cited from memory,
  **UNVERIFIED**; DisCO 2302.12253 for ideas).
- **Ours.** Uses only landmark and mask observations (no photometric term), so it is fast and pixel-free.
- **Defaults.** ≥ 3 views spanning ≥ 50° of yaw; Huber δ = 1 px at 512 px.
- **Fails → fallback.** Single-view depth from the landmarker; weak perspective when the distance is
  unobservable (flagged).
- **Gate.** Profile-view reprojection error drops ≥ 20% vs. single-view depth; held-out view error < 2%;
  profile-contour error < 1.5% of face height; on the bench, nose-width/face-width ratios from a 35 cm and a
  1.5 m capture of the same person agree within 3%.
- **Status.** *Partial*: `solve_multiview.py`, `solve_points3d.py` (for the older rig); port to the engine *to build*.

#### L20 Expression examples and the measured basis
- **Purpose.** This person's own way of smiling, opening the mouth and raising the brows, as measured
  examples that L35 turns into the personal rig.
- **In → Out.** Canonical-frame face per frame + 52 calibrated values → a set of example frames
  $\{(b^{(e)}, Y^{(e)})\}$ chosen for coverage (one or more per captured expression), each with a per-vertex
  confidence; the measured linear map $F(b) = \bar F + \sum_k b_k D_k$ as a check and a fallback.
- **Method.** Example selection: per captured cell of L4 (smile, "aah", "ooh", "ee", brows up, frown, eyes
  closed) the sharpest calm frames; per point a confidence from landmark jitter and view angle. Ridge
  regression $W = (X^\top X + \lambda I)^{-1} X^\top Y$ with $X = [b, 1]$ gives the measured basis. A phone
  capture shows about eight expressions, so most of the 52 deltas are unobserved; they are **not** filled
  from a population set (none exists) but from the template's face units in L35. MediaPipe's points measure
  lid closure, inner-lip roll, teeth, tongue and cheek volume poorly, so those regions get low confidence
  here (the size of the error is **UNVERIFIED**; measured on the bench).
- **Research.** Personalised blendshapes (2007.06759, 2010.00560); example-based rigging (Li, Weise and
  Pauly 2010, *ACM TOG* 29(4)).
- **Ours.** —
- **Defaults.** λ = 0.05·n; ≥ 2 example frames per captured expression.
- **Fails → fallback.** Only the neutral is measured; L35 uses the template's face units at their default
  range.
- **Gate.** Held-out shape error of the measured basis < 2%; mouth opening follows the real mouth r ≥ 0.9
  (measured 0.97).
- **Status.** *Partial*: ridge map in `rig.py` (salvage); example selection and confidences *to build*.

#### L21 Face detail curves
- **Purpose.** Lines that make a face theirs and move with expression: nasolabial folds, smile-only
  creases, dimples.
- **In → Out.** Views + face mesh → a small set of crease curves on the mesh with strength and where
  they appear (always, or only with smile).
- **Method.** On aligned, light-normalised face crops, detect ridge/valley lines (Hessian of luminance at
  two scales); keep lines that appear at the same mesh position in ≥ 3 views. Luminance Hessians on phone
  images also pick up cast shadows, make-up and compression edges, so a curve is kept only if (a) its
  strength correlates with the expression values it should follow (or it is present in every view, for
  permanent lines) **and** (b) it does not appear as a fixed image-space edge across head poses. Store as
  curves in mesh barycentric coordinates (≤ 6 control points) with a strength on at most 3 driving
  expression values each (not on all 52, which alone would nearly fill L42's budget). Drawn by L54 as
  distance-field lines, never as pixels. Forehead lines and eye bags mostly read as *age*, and ink lines on them age a painted
  face, so they are **opt-in** by the person in the Studio (like the marks of L22).
- **Research.** Dense-landmark detail (2204.02776); implicit detail recovery (2203.09692); SPARK
  (2409.07984).
- **Ours.** Detail as *vector curves bound to the mesh*, which keeps it pixel-free and paintable.
- **Defaults.** ≤ 12 curves; strength < 1 never darker than the shadow band; forehead and under-eye off.
- **Fails → fallback.** The template's expression wrinkle masks (L51) at the age band's default strength.
- **Gate.** Curves stable across views (mean positional disagreement < 3% of eye distance) and the owner's
  side-by-side check (§8.3) prefers with-curves for ≥ 6/8 people.
- **Status.** *To build* (`solve_detail.py` is the older pixel-based version).

#### L22 Salient marks, lid crease, hairline and nostril shape
- **Purpose.** The identity cues a portrait painter keeps and parametric colour would drop: a mole, a scar,
  freckles, the eyelid type, the hairline, the nostril shape. (A bindi is an accessory, L14, not a mark.)
- **In → Out.** Light-normalised views, masks, face mesh → a list of numbers: up to 10 marks (mesh
  barycentric position, radius, colour offset, shape class), freckle density per region, eye-aperture
  descriptors (canthal tilt, palpebral fissure height/width, upper-lid crease height and type — single,
  double or hooded — epicanthic fold, scleral show below the iris), the hairline curve (forehead height,
  widow's peak, temple recession) and the alar/nostril outline as a curve.
- **Method.** Marks: local dark or light blobs relative to the region gradient (L40); a mark is kept only if
  it appears at the same mesh position across ≥ 3 views **or** on the second-day capture, so acne and
  make-up drop out. Lid crease: a ridge curve found with L21's machinery and its expression and pose filter,
  from the "brows" and "up" shots. Hairline: the boundary of the hair mask on the forehead, bound to the mesh
  as a curve; it drives L47's fringe and parting and the template's scalp edge. Each item has a "not
  measured" state (480p webcams will often not resolve crease, hairline or small marks) instead of a guess.
  The person sees a **per-item keep/remove list** in the Studio with **nothing pre-selected**: some marks
  are medical (vitiligo patches, burn or acid scars), and a default either way is a judgement only the
  person can make; in "someone you know" mode the list belongs to the subject, not the uploader (L1).
  Items not chosen are not drawn. Everything is counted in L42 (about 100 numbers); painted by the
  per-person overlay (L51) and drawn as distance-field lines (L54).
- **Research.** External features such as the hairline matter as much as internal ones to unfamiliar
  viewers, internal ones to familiar viewers (Ellis, Shepherd and Davies 1979, *Perception* 8); pigmentation
  is about as important as shape for identity (Russell, Sinha, Biederman and Nederhouser 2006, *Perception*
  35).
- **Ours.** Marks and lid and hairline descriptors as consent-listed numbers, not pixels.
- **Defaults.** ≤ 10 marks; marks below 1.5 mm radius dropped.
- **Fails → fallback.** Item "not measured"; the template default.
- **Gate.** Marks found on both capture days at the same position (≤ 3% of eye distance) on the bench; the
  person's own keep/remove choice is applied exactly (an unchosen item never appears); S2 ablation.
- **Status.** *To build*.

#### L23 Full head completion and the matched norm
- **Purpose.** A closed head (skull, back, crown) from a mostly frontal capture, as the target for the
  template fit, and the **norm** that L24 measures and exaggerates the face from.
- **In → Out.** Canonical face + side silhouettes → head-prior coefficients and a closed head surface; the
  matched norm $N$ (a neutral face in template topology) and a covariance for whitening.
- **Method.** Our own statistical head prior: principal components of closed heads in the **template's
  topology**, built from (a) the CC0 MakeHuman heads (§6.1), (b) consented builds, and (c) only if D12
  allows, ICT-FaceKit Light's real-scan identity modes, transferred once to template topology by the same
  correspondence and non-rigid fit as L34. Fit by least squares: face points as hard-ish constraints, side
  and top silhouettes (L12) as a chamfer loss on the projected contour; 30 PCA coefficients with a Gaussian
  prior. **Matched norm**: exaggerating away from a mismatched mean caricatures ethnicity and sex, not the
  individual (faces are coded against an own-group prototype; Byatt and Rhodes 1998), and a PCA of
  MakeHuman modifier heads is a PCA of artist sliders, not of people. One "Indian" mean is itself a
  cross-group norm for much of India: Northeast, South and North Indian faces differ systematically in
  several of L22's descriptors (epicanthic fold, nasal and malar proportions). So $N$ has two levels: a
  **pooled norm** (sex-matched, or pooled across sexes when the person chooses "unspecified"), re-centred so
  its ~20 identity ratios equal published Indian anthropometric means (Farkas et al. 2005 includes an Indian
  group; its size and table values not yet read, **UNVERIFIED**), ratios whitened by the published SDs; and,
  where one exists, a **regional norm**: published regional anthropometry, or the mean of ≥ 20 consented
  builds of that region (scope 4). The person may choose a region or "prefer not to say" (D14). The
  deviation $a = F_0 - N_{pooled}$ splits into a **group part** $g = N_{region} - N_{pooled}$ and a
  **within-group residual** $a - g$; only the residual is ever exaggerated (L24). Consented builds join
  either norm only once ≥ 20 contributors exist, and both are refitted exactly when anyone revokes scope 4
  (L3); before that, no running mean of builds is used (with 2–3 builds the "mean" is almost a person, and
  it would drift towards whoever built first). The norm also samples L0's hard negatives.
- **Research.** Complete head models (1911.08008); combining face and head models (1903.03785); SPHEAR
  (2311.02461); one-shot full heads (2604.13856, 2602.11693) for ideas only; own-group face norms (Byatt and
  Rhodes 1998, *Vision Res.* 38); facial anthropometry across populations (Farkas et al. 2005, *J Craniofac
  Surg* 16); ICT-FaceKit (github.com/USC-ICT/ICT-FaceKit, MIT).
- **Ours.** A head prior trained only on CC0 and consented heads (no FLAME), in the template's own topology,
  with a population- and sex-matched norm.
- **Defaults.** 30 components, prior weight 1.0; pooled norm by declared sex (or pooled) and Indian
  anthropometric means; no regional norm until one exists; k ≥ 20 for consented builds.
- **Fails → fallback.** The template's mean head scaled to the face.
- **Gate.** Side-silhouette IoU ≥ 0.9; the norm's ratios within 0.5 SD of the published means; S16's
  monitored report shows no Monk group or region systematically "further from the norm" than others; a
  revocation test refits the norm without the person.
- **Status.** *Partial*: ellipsoidal shell in `rig.py` and `anime.py`; prior and norm *to build*.

#### L24 Stylisation and caricature from the matched norm
- **Purpose.** The painted look has gently stylised proportions; stylisation must never rotate a face's
  identity, and the likeness lost with the photo texture is partly put back into geometry.
- **In → Out.** Measured neutral $F_0$ (L17–L19), pooled norm $N$ and group part $g$ (L23), personal
  expression deltas $D_k$ (L35), style $s\in[0,1]$, caricature $\gamma$ → the stylised face
  $F(b) = M_s\big(N + g + W_c \odot (a - g) + \gamma\,W_c \odot (a - g)\big) + \sum_k b_k\, J_{M_s} D_k$,
  with $a = F_0 - N$, $M_s$ a smooth linear map, $J_{M_s}$ its Jacobian applied to the deltas only, and $W_c$
  the per-vertex confidence of the deviation. Without a regional norm, $g = 0$ and $\gamma = 0$ (D14).
- **Method.** $M_s$: smooth local scalings around the eyes, nose, mouth and jaw (as in `anime.py`), moving
  eyes, nose and mouth together with the material's stylisation (D7). **Caricature on the within-group
  identity only**: scaling the expression deltas by $(1+\gamma)$ would push the lips through each other at
  closure and break the mouth calibration, so expressions pass only through $J_{M_s}$; and exaggerating the
  group part would exaggerate ancestry, so $\gamma$ multiplies only $a - g$. **Confidence** $W_c$: the
  deviation is split into symmetric and asymmetric parts by the template's mirror map, and the asymmetric
  part is shrunk by its across-frame variance (James–Stein style, $v/(v+\sigma^2_{noise})$), so stable
  asymmetry survives and noise is not exaggerated. **Why v2's score was replaced**: v2 chose $\gamma$ to
  maximise a distance margin to impostors around the veridical face; the render sits at $\gamma\lVert
  a\rVert$ from the truth and at about $\sqrt{\gamma^2\lVert a\rVert^2 + r^2}$ from impostors at radius $r$,
  so the margin falls monotonically in $\gamma$ and the search always returned $\gamma = 0$. The caricature
  advantage is perceptual (identity is coded as a direction from the norm and strength as distance along
  it; Leopold, O'Toole, Vetter and Blanz 2001), so no veridical-distance score can find it. **Identity
  coordinates**: $\phi(X)$ = the 30 head-prior coefficients of $X$ relative to the norm, each divided by its
  prior SD, concatenated with the ~20 identity ratios of $X$ minus the norm's, each divided by its published
  SD (a rank-30 covariance cannot whiten a 21k-dimensional vertex vector, so whitening is defined only in
  these coordinates). **Identity constraint** (machine, on the mesh vertices, never a landmarker on painted
  renders): $\cos\big(\phi_s(R),\ \phi(N + g + W_c \odot (a-g))\big) \ge 0.95$, where $R$ is the stylised
  neutral and $\phi_s$ measures it relative to $M_s(N)$. The reference already includes the confidence
  shrinkage, so only $M_s$ is constrained and $s = 0$ always satisfies it. $s$ is the largest value meeting
  the constraint **and** keeping S1's rank-1 margin, capped at $s_{max}$. Because $s$ is chosen to satisfy
  it, the cosine cannot fail and is reported as a diagnostic only; S1's rank-1 margin, which can fail, is the
  machine gate. (With $\gamma > 0$ the cosine is not invariant to $\gamma$: $g + (1+\gamma)r$ is not parallel
  to $g + r$ when $g \neq 0$, and the ratios in $\phi$ are nonlinear; this matters only after release 1.)
  **Release 1 ships $\gamma = 0$ for everyone**: under D14 a person gets $\gamma > 0$ only with a regional
  norm, none exists at launch, and the pilot below would need renders at $\gamma > 0$ that either use norms
  we do not have or exaggerate ancestry. The pilot, its mutant, the brow arm and the person's $\gamma$ choice
  are *later*, after regional norms exist. **$\gamma$ is set
  perceptually, once, for everyone (*later*)**: at an S2 target of ≥ 90%, lineup accuracy sits at ceiling and could
  not resolve the few-percent caricature effect (photographic caricatures gained about +4%; Benson and
  Perrett 1991), so the pilot is **paired comparison**: acquaintances see two renders of the same person at
  different $\gamma$ from {0, 0.05, 0.10, 0.20} and answer "which looks more like X?" (all pairs, both
  orders); a Bradley–Terry scale per $\gamma$ is fitted and its peak chosen, with the Ho–MacDorman eeriness
  check, and regional raters (S12's five regions) rate "mocking or exaggerated" per region. Very familiar
  faces may prefer slight anti-caricatures (Lee and Perrett 2009, abstract only), and the effect is stronger
  for drawn depictions (Rhodes et al. 1987). In the same pilot, one arm also scales brow shape and thickness
  and lid-crease height by $(1+\gamma/2)$ (untested); marks and freckles are **never** exaggerated (enlarged
  moles and scars read as mockery long before they help recognition). **The person may lower it**: the
  Studio shows $\gamma = 0$ beside the pilot value; the person may choose 0 or any lower value, and the pick
  is recorded, but never above the pilot value (people prefer enhanced versions of their own face, Epley
  and Whitchurch 2008, **UNVERIFIED**, so their pick is not a likeness measure). **De-attenuation
  (untested, off by default)**: every stage shrinks a face towards its prior (landmarker prior, Procrustes
  averaging, the shrinkage above, ICP stiffness, Laplacian regularisation); synthetic heads of known shape
  rendered at the capture's poses and distances are run through L7→L34, the slope $\beta_k$ of recovered
  on true deviation is measured per head-prior component and per ratio, and $a_k \leftarrow a_k/\beta_k$
  (capped, confidence-weighted) undoes the attenuation, so $\gamma$ only adds the small perceptual
  exaggeration. The landmarker runs on renders only as a drawing check (disagreement with the mesh beyond
  3% of eye distance flags a painting problem, such as a lip line drawn off the lip edge).
- **Research.** Stylised avatars that keep identity: AgileAvatar (2211.07818), ToonifyGB (2505.10072),
  exemplar-based portrait stylisation (2104.14559), LeGO (2403.15227); the caricature advantage (Rhodes,
  Brennan and Carey 1987); norm-based coding (Leopold et al. 2001, *Nat. Neurosci.* 4); own-group norms
  (Byatt and Rhodes 1998); Benson and Perrett (1991, abstract read); Lee and Perrett (2009, abstract only);
  paired comparisons (Bradley and Terry 1952, *Biometrika* 39); matched appearance of shape and material
  (Zell et al. 2015, *ACM TOG* 34(6)); errors-in-variables correction (standard statistics).
- **Ours.** A direction-in-face-space constraint on stylisation, a two-level matched norm with caricature on
  the within-group residual only, a global exaggeration found by paired comparison that the person may
  lower, and measured de-attenuation (novelty **UNVERIFIED**).
- **Defaults.** $s_{max}$ = 0.35 for the painted look (realistic proportions; 0.8 reproduces the earlier
  anime proportions, owner decision D7); $\gamma$ from the pilot, grid {0, 0.05, 0.10, 0.20}, and 0 without
  a regional norm; de-attenuation off until the second-day captures agree better with it.
- **Fails → fallback.** $s = 0$, $\gamma = 0$.
- **Gate.** (P) S1's rank-1 margin at the chosen $s$ (the cosine reported); at the stylised mouth, PBM reaches
  inner-lip contact with ≤ 0.3 mm penetration on every bench person; asymmetry measured on two halves of the
  capture agrees (correlation ≥ 0.8); S2 at the chosen $s$. *Later*, with $\gamma$: eeriness at the chosen
  $\gamma$ not worse than at $\gamma = 0$ by more than 0.5 points, and "mocking or exaggerated" not worse
  than at $\gamma = 0$ by more than 0.3 points in any region (NI, catch trials in the pilot).
- **Status.** *Partial*: no stylisation in `pipeline.py` today; `stylise_map` in `anime.py` (salvage); the
  identity constraint *to build*; norm, pilot and de-attenuation *later*.

#### L25 Ears
- **Purpose.** Ear size and position are identity cues in three-quarter views.
- **In → Out.** Side views, head → ear placement, size and outline as template ear morphs.
- **Method.** The template's ear (helix, lobe, concha) carries a few authored morphs (size, protrusion,
  lobe); placed by proportion (top at brow height, bottom near the nose base) and refined to the side
  silhouette and the ear region of the hair mask.
- **Research.** Ears as head-model components (1911.08008).
- **Ours.** —
- **Defaults.** Length 0.68 × nose length; 15° backward tilt.
- **Fails → fallback.** Proportional placement; hidden under hair if the mask says so.
- **Gate.** Ear in the profile view within 3 px at 512 px.
- **Status.** *To build*.

#### L26 Neck and throat
- **Purpose.** A neck of the right width and length joining head and torso.
- **In → Out.** Head, shoulders, silhouettes → neck profile (radius along its length), a target for L34.
- **Method.** Elliptical sections from the jaw to the clavicle; width from the front silhouette between
  jaw and shoulders; length from L10. Adam's apple as a template morph for male-presenting people.
- **Research.** Anthropometric tables (Drillis and Contini 1966).
- **Ours.** —
- **Defaults.** Neck radius 0.145 × shoulder width (in `body.py`).
- **Fails → fallback.** Ratio defaults.
- **Gate.** Front silhouette IoU ≥ 0.9 in the neck band.
- **Status.** *Partial*: `neck_r` in `body.py`; silhouette fit *to build*.

#### L27 Skeleton and bone lengths
- **Purpose.** The upper-body skeleton the person moves with.
- **In → Out.** Bone lengths (L10) → the template's joint hierarchy scaled to the person: pelvis, spine,
  chest, neck, head, clavicles, scapulae, shoulders, elbows, wrists, 5 fingers × 4 joints per hand, plus
  helper joints: 1–2 upper-arm twist, 2–3 forearm twist, and a deltoid helper per side.
- **Method.** Measured lengths where known; the rest from anthropometric ratios scaled to the shoulder
  width; clamp each ratio to the 5th–95th adult range. Twist and helper joints are driven by fixed rules
  (twist share along the bone; deltoid helper from arm elevation), so shoulders and forearms deform
  predictably without many correctives.
- **Research.** Anthropometric ratios (Drillis and Contini; NASA-STD-3000); bone-based pose decomposition
  (2002.10322); twist and helper bones are standard production rigging practice.
- **Ours.** —
- **Defaults.** As in `proportions()`; bind pose an A-pose (arms ≈ 45° down), so the common arms-down poses
  deform least.
- **Fails → fallback.** Ratios only.
- **Gate.** Skeleton reprojection onto frames < 4% of shoulder width.
- **Status.** *Partial*: skeleton in `body.py`; twist and helper joints *to build*.

#### L28 Posture and spine
- **Purpose.** People stand differently (upright, forward head, one shoulder lower).
- **In → Out.** Body points over time → rest pose offsets: spine curve, head forward offset, shoulder
  tilt and roll.
- **Method.** Median over calm frames of: neck-to-ear forward offset, shoulder height difference, chest
  lean; mapped to rest rotations of spine, chest, neck and clavicles.
- **Research.** Biomechanical spine modelling (2509.06607).
- **Ours.** Habitual posture as part of likeness.
- **Defaults.** Offsets clamped to ±10°.
- **Fails → fallback.** Neutral upright posture.
- **Gate.** Posture reprojection error < 4% of shoulder width.
- **Status.** *To build*.

#### L29 Hand skeleton and finger lengths
- **Purpose.** Hands that look like theirs and bend like hands.
- **In → Out.** Hand points (L11) → three numbers per hand (hand length, palm width, finger-length index),
  then per-finger phalanx lengths, metacarpal spread and the thumb carpometacarpal axes.
- **Method.** Fit the three numbers by 2D reprojection of the template hand across all good hand frames
  (robust loss), not by medians of the tracker's 3D points; phalanx ratios from anthropometric tables; the
  thumb CMC joint gets two oblique axes (flexion and abduction) with enough opposition range to reach every
  finger segment (needed for the South Asian count on the phalanges, L77).
- **Research.** Anatomical hand models: PIANO (2106.10893), NIMBLE (2202.04533) (papers only;
  MRI-derived models are non-commercial); finger biomechanics with IK (2605.09258).
- **Ours.** Hands from the person's own points, with no outside hand model.
- **Defaults.** Ratio defaults in `build_skeleton`.
- **Fails → fallback.** Ratios scaled to the hand length.
- **Gate.** Hand length within ±5% of the bench ruler measurement (L0); fingertip reprojection reported.
- **Status.** *Partial*: ratio hands in `body.py`; reprojection fit *to build*.

#### L30 Joint limits
- **Purpose.** No impossible pose, ever.
- **In → Out.** Anatomy → per-joint limits (swing cone + twist range), finger coupling, and a discomfort cost
  used by the arm solver (L76).
- **Method.** Shoulders and wrists use swing–twist decomposition with an elliptical swing cone; elbows and
  finger joints are hinges with ranges; coupling rules for fingers (DIP ≈ ⅔ PIP; ring and little finger
  enslavement). No learned plausibility field: the shippable pose sets are non-commercial and our own
  captures are minutes long; analytic limits, coupling and the swivel cost already exclude impossible
  poses. A hand synergy space (L77) is added only if our consented hand captures are large enough.
- **Research.** Biomechanical limits (2509.06607, 2605.09258); hand synergies (Santello et al. 1998).
- **Ours.** —
- **Defaults.** Elbow 0–150°; MCP −20–90°; PIP 0–110°; DIP 0–80°; wrist flexion −70–80°.
- **Fails → fallback.** Hard clamp.
- **Gate.** S7 (limits after every layer, including the spring layer L81).
- **Status.** *To build*.

#### L31 Torso and arm volume
- **Purpose.** The body's thickness and shape, as a target for the template fit.
- **In → Out.** Skeleton + silhouettes → radius profiles (ellipse sections) per bone chain.
- **Method.** Rings along each chain, radii from anthropometric profiles scaled to the person; front
  silhouette widths fit the x radii; depth from population ratios with sex and build (no side-view body
  photo is required).
- **Research.** Silhouette carving; anthropometric estimation from images (2512.06434).
- **Ours.** Body volume from measurements only.
- **Defaults.** `torso_profile` in `body.py`.
- **Fails → fallback.** Ratios.
- **Gate.** Front silhouette IoU ≥ 0.9.
- **Status.** *Partial*: `tubes_for`, `torso_profile` in `body.py`; silhouette fit *to build*.

#### L32 Glasses and facial-hair geometry
- **Purpose.** Redraw L14's accessories as our own geometry.
- **In → Out.** Accessory parameters → glasses mesh (rims, bridge, temples) fitted to the head; facial
  hair as painted regions with clump edges.
- **Method.** Glasses: superellipse rims swept as tubes, bridge on the nose points, temples to the ears
  (L25); lens as a transparent layer with a faint painted highlight. Facial hair: regions on the template's
  face with density and colour, painted by L51 with hair strokes and given a broken outline of small cards
  along the edge.
- **Research.** Strand-level facial hair capture (2606.08041) for the regions only.
- **Ours.** Accessories rebuilt from parameters.
- **Defaults.** Rim thickness from L14; lens tint none.
- **Fails → fallback.** No accessory (report says so).
- **Gate.** Owner's side-by-side check: accessories judged "right" for 8/8 bench people.
- **Status.** *To build*.

---

### Stage D: The template and its fit (L33–L38)

Version 1 built a new mesh for every person (implicit union, marching cubes, remeshing, per-person UVs and
weights, the face stitched in along its oval). Every person then had different topology, so nothing could
be authored once, and the stitch showed as a hard line in banded shading. Version 2 fits **one owned
template** to each person, which is how production character systems work: one topology, fitted identity.
Version 3 makes the template with a script from what the repository already runs: MPFB builds a MakeHuman
person headless in Blender with CC0 packs (`scripts/teacher/build-vrm-teacher.py`), and the 478-point
correspondence and an RBF face fit exist (`scripts/teacher/fit/`). Blender runs **only** to make the
template, once; every per-person step runs in numpy/torch on exported arrays.

#### L33 The template (built once, by script)
- **Purpose.** Everything that must be made once, made once, for everyone, reproducibly.
- **In → Out.** Pinned MPFB/MakeHuman CC0 assets + our script → a waist-up template: base mesh with
  five-finger hands, eye sockets, ears, mouth bag; MPFB eyes, teeth and tongue; the MakeHuman rig plus our
  twist and helper joints (L27); skin weights; pose correctives; two LODs; the 52 ARKit face units
  (`faceunits01`) and the 15 visemes (`visemes02`); UV charts; the **head-and-neck as its own geometry**
  carrying all morphs; the fixed 478-point correspondence (`corr.json`); and the authored painting attributes
  per vertex or texel: shading-normal blend weights, threshold offsets and the plane segmentation (L50),
  per-region edge widths and brush-edge amplitudes (L52), feature-line controls (L54), stroke layout and
  orientation (L51), garment cages (L48), the hair scalp and scalp edge (L47); and the **master band set**
  (L51).
- **Method.** `scripts/pratibimb/template/make_template.py`: deterministic bpy, extending
  `build-vrm-teacher.py` (which already loads the packs, refuses any asset whose own file does not say CC0,
  and fails outside a 30–70k triangle budget), cut to waist-up; asset files pinned by hash (L3). Authored
  attributes are made **procedurally**, not hand-painted, so the bench loop can tune and regenerate them:
  MediaPipe region masks projected onto the mesh through `corr.json`, mesh curvature, geodesic distance to
  the feature curves, and a plane segmentation of the head (forehead front and side planes, cheekbone plane,
  jaw plane, nose box: the "planes of the head" of figure drawing) seeded from curvature and adjusted by
  numbers the owner can review. The head and neck (≈ 7k vertices) and each hand (≈ 2k vertices) are split
  into their own skinned geometries, so each morph texture covers only the vertices it moves (L37). LOD1
  comes from MPFB's proxy or one decimation that
  keeps shapes (`decimate_keeping_shapes` exists). If D2 had failed, plan B would be our own mesh; D2 is
  settled.
- **Research.** Production practice of one topology per character family; MPFB2 licence (copy in
  `docs/voice/licences/2026-11-25/`); Guilty Gear Xrd authored normals and line control (Motomura, GDC
  2015).
- **Ours.** A reproducible, scripted template whose painting attributes are generated, reviewable and
  inherited by every person.
- **Defaults.** LOD0 ≈ 45k triangles (head and neck ≈ 7k vertices), LOD1 ≈ 20k; A-pose bind.
- **Fails → fallback.** None at build time (the template is a fixed asset); a template change re-runs the
  bench.
- **Gate.** Two runs of the script give identical asset hashes; manifold, no self-intersection; library
  poses (S7) deform without flipped triangles on 8 bench bodies; owner approves the attributes on bench
  renders.
- **Status.** *Partial*: MakeHuman person with all 52 face units, 15 visemes, CC0 check, triangle budget and
  shape-keeping decimation in `scripts/teacher/build-vrm-teacher.py`; correspondence in
  `scripts/teacher/fit/corr.py` and `corr.json`; waist-up cut, helper joints, head split and authored
  attributes *to build*.

#### L34 Template fit
- **Purpose.** The template takes the person's shape without losing its loops, UVs or rig.
- **In → Out.** Template arrays (exported once, as `export_base.py` does), canonical face (L17–L19,
  stylised by L24), head (L23), ears (L25), neck (L26), skeleton (L27), posture (L28), body volume (L31) →
  fitted vertex positions in template topology.
- **Method.** (0) Start from the fit the Studio already runs: `solve_face.py` solves the 222 CC0 MakeHuman
  face targets by bounded least squares (`lsq_linear`, each value in [0, 1], a small penalty towards 0) so
  that the template's 478 correspondence vertices match the person's 3D points after similarity alignment,
  with depth counting half, against the bias-cancelling reference shape of L17. It stays inside the space of
  CC0 human heads, so it cannot produce a non-human face. (0b) Only the **residual** the targets cannot reach
  is fitted further: `solve_detail.py`'s smooth correction from the multi-view points (refused if it would
  tear), and, where needed, the RBF displacement of `fit/apply.py` (fades out towards ears, scalp and neck,
  damped depth), ported from Blender to numpy. (1) Fixed landmark correspondences (face points → template face vertices, skeleton joints
  → template joints). (2) Non-rigid ICP with stiffness annealing (Amberg, Romdhani and Vetter 2007) to the
  completed head and the silhouette-fitted body profiles. (3) Laplacian detail preservation (Sorkine et al.
  2004) so edge loops and authored regions keep their layout. (4) Joint positions re-derived from the fitted
  surface and the measured bone lengths. The per-vertex confidence and asymmetry shrinkage of L24 weight the
  face deviation. One sparse solve per stage, on the GPU, inside the long-lived worker (§7.1).
- **Research.** Optimal-step non-rigid ICP (Amberg et al., CVPR 2007); Laplacian surface editing (Sorkine
  et al., SGP 2004); deformation transfer (Sumner and Popović 2004).
- **Ours.** —
- **Defaults.** Stiffness schedule 50 → 1 over 6 steps; inner-lip points excluded from the face fit (as in
  `apply.py`: their place on a closed template mouth is unreliable).
- **Fails → fallback.** The `solve_face.py` fit and the skeleton only, body volumes from ratios.
- **Gate.** Face points within 0.5% of eye distance of L17–L24's face; head, neck and body silhouette IoU
  ≥ 0.9; no flipped triangles.
- **Status.** *Partial*: target fit in `scripts/teacher/maker/solve_face.py`, residual in `solve_detail.py`
  and `solve_points3d.py`, array export in `export_base.py` (all run by `pipeline.py`); RBF face fit in
  `scripts/teacher/fit/apply.py` (inside Blender); numpy RBF port, non-rigid ICP and body fit *to build*.

#### L35 Personal expression rig
- **Purpose.** All 52 expressions as GPU morph targets that look like this person's, including the ones the
  capture never showed, with lids that close and lips that meet.
- **In → Out.** Fitted neutral (L34), the template's 52 face units, expression examples with confidences
  (L20) → 52 personal morph targets on the head geometry (and kept pair correctives).
- **Method.** (1) **Transfer**: the template's face units move to the fitted neutral by deformation transfer
  (Sumner and Popović 2004; same topology, so the transfer is exact in structure). This gives plausible,
  semantically consistent shapes for every value on day one. (2) **Example-based refinement**: with the
  captured examples, alternate solving the example weights and the shapes, keeping each shape near its
  transferred prior (Li, Weise and Pauly 2010; it handles fewer examples than shapes). The person's delta is
  applied only on vertices bound to points with confidence. (3) **Lids, inner lips and mouth corners** take
  their *shape* from the template and only their *range* from the person (L8, L16), because the points are
  poor there. Pair correctives: kept only where ≥ 30 co-occurring frames lower held-out error.
- **Research.** Deformation transfer (Sumner and Popović 2004); example-based facial rigging (Li et al.
  2010); rig-space binding (2003.09820, ideas); corrective shapes (2105.02451; Lewis et al. 2014).
- **Ours.** —
- **Defaults.** Prior weight from a validation sweep; ≤ 24 pair correctives.
- **Fails → fallback.** The transferred template face units at the person's measured ranges.
- **Gate.** Full lid closure at eyeBlink = 1; PBM inner-lip contact with ≤ 0.3 mm penetration; no lip
  through teeth at any value; held-out expression error < 2% of eye distance; no shading discontinuity
  across the face (band-boundary test, L50).
- **Status.** *Partial*: the 52 face units are loaded on the MakeHuman mesh in `build-vrm-teacher.py`; the
  older point binding in `Character.build` (`anime.py`); transfer and example-based refinement *to build*.

#### L36 Skin weights
- **Purpose.** How much each bone moves each vertex.
- **In → Out.** Template weights + fitted mesh → ≤ 4 weights per vertex.
- **Method.** The template's weights are carried through the fit (same topology); only re-normalised, and
  finger weights restricted to their own chain. Shoulder weights are smoothed under the arm for garments
  that must not ride up when an arm is raised above 90° (L48).
- **Research.** Pinocchio heat diffusion (Baran and Popović 2007) for authoring; robust biharmonic skinning
  (2406.00238).
- **Ours.** —
- **Defaults.** 4 influences.
- **Fails → fallback.** —
- **Gate.** No tearing or folding (flipped triangles = 0) on every frame of every library action.
- **Status.** *Partial*: MakeHuman rig weights in the MPFB build; ring-to-bone weights for tubes in
  `body.py`; smoothing *to build*.

#### L37 Runtime deformer: correctives and skinning
- **Purpose.** Elbows, shoulders and knuckles keep their shape; wrists do not "candy-wrap"; dual
  quaternions do not bulge; the morph data fits in an integrated GPU's memory and never stalls the page.
- **In → Out.** 52 face values, joint angles → deformed vertices.
- **Method.** On the GPU, in three.js. three.js (r187, the client's version) packs at most three morph
  slots per vertex (position, normal, colour), always Float32, into one array texture over *all vertices of
  a geometry*; its shader skips zero influences. Our data does not fit that as is (52 face targets plus ≤ 24
  pair correctives on the head is ≈ 25.5 MB in Float32, over the gate; body correctives would texture every
  body vertex), so: **(1) a slot table**, written once: *position* in slot 1; the **shading normal** delta
  (L50) in slot 2, since the rim and the painted highlights use the shading normal and the true normal is
  not morphed; *colour* slot RGBA = baked occlusion (L53), threshold-offset delta (L50) and two spare
  channels. **(2) Our own morph texture** for the head, built in RGBA16F (core in WebGL2) and read by our own
  vertex chunk through `onBeforeCompile`, which halves memory; three.js's Float32 path is the fallback.
  **(3) Separate geometries**: face targets only on the head and neck; shoulder and elbow correctives
  (position only) on the body; knuckle correctives on each hand's own geometry; garments carry the same body
  correctives, transferred through their cages (L48), so a deltoid bulge cannot poke through. **(4) Build
  off the main thread**: the dense arrays are filled in the worker and transferred, then uploaded in idle
  slices at panel mount, so the lesson page does not drop frames. Pose correctives are driven by a radial
  basis of the joint swing angles (keyed on the combined clavicle + glenohumeral angle at the shoulder,
  L76), then a per-vertex blend of linear (LBS) and dual-quaternion (DQS) skinning with weight $\alpha$ high
  near twisting joints and low at bending creases. **Memory** (RGBA16F, 8 bytes per slot): head 7k × 76
  targets × 3 slots ≈ 12.8 MB; body ≈ 14k × 10 correctives × 1 slot ≈ 1.1 MB; hands 2 × 2k × 4 × 1 ≈ 0.1 MB;
  garments ≈ 8k × 10 × 1 ≈ 0.6 MB; total ≈ 14.6 MB. On the Float32 fallback the head drops the pair
  correctives and the colour slot (occlusion and threshold offsets then stay at rest), ≈ 15.6 MB in all.
- **Research.** Dual-quaternion skinning (Kavan et al. 2008); neural blend shapes (2105.02451);
  pose-dependent deformation distilled for mobile (TaoAvatar 2503.17032); velocity skinning (2104.04934);
  three.js `WebGLMorphtargets.js`, `morphtarget_vertex.glsl.js`, `morphcolor_vertex.glsl.js` (read in the
  repository's copy, 0.187.0).
- **Ours.** —
- **Defaults.** $\alpha$ = 0.8 on the forearm, 0.2 at the elbow crease; 3 correctives per shoulder, 2 per
  elbow, 1 per knuckle row (4 per hand); morph deltas downloaded sparse (most face units move < 20% of the
  head) at fp16 and expanded in the worker.
- **Fails → fallback.** LBS, no correctives; three.js's own morph path.
- **Gate.** Volume change at elbows and wrists < 10% and silhouette error at a 90° elbow bend ≥ 20% lower
  than without correctives; morph GPU memory ≤ 20 MB on both paths, by the arithmetic above re-measured on
  the export; no main-thread task > 50 ms while the morph data loads, on the reference laptop.
- **Status.** *To build* (the lab players skin and morph through three.js today).

#### L38 Levels of detail
- **Purpose.** Hold 30 fps on weak GPUs.
- **In → Out.** Template LODs + the fit → LOD0 and LOD1 positions, the head at full detail in both.
- **Method.** Two LODs are enough. Per person each LOD1 vertex is a fixed barycentric combination of LOD0
  vertices, so the fit carries over with no decimation at build time.
- **Research.** Garland and Heckbert (1997); level-of-detail perception (2501.17085).
- **Ours.** —
- **Defaults.** Switch by measured frame time (L89).
- **Fails → fallback.** LOD0 only.
- **Gate.** LOD1 silhouette IoU ≥ 0.97 vs. LOD0 at panel size.
- **Status.** *Partial*: shape-keeping decimation in `build-vrm-teacher.py`; barycentric carry-over *to
  build*.

---

### Stage E: Appearance, eyes, mouth, hair and clothes (L39–L48)

The rule of this stage (contradiction C1): we learn **colour numbers and shapes**, never pixels. Every
photo-derived number is listed in the information-budget certificate (L42).

#### L39 Per-frame light estimation
- **Purpose.** Separate the person's colours from the room's light.
- **In → Out.** Frames + posed fitted mesh (normals) → order-2 spherical-harmonic light per frame.
- **Method.** For face-skin pixels with normals $n$ from the posed mesh, solve
  $I(x) \approx a\,(\sum_{lm} L_{lm} Y_{lm}(n))$ jointly for region albedos $a$ and per-frame coefficients
  $L$ (9 per channel) by alternating least squares, with a prior that keeps $L$ near "mostly frontal, soft"
  light.
- **Research.** Spherical-harmonic lighting (Ramamoorthi and Hanrahan 2001); intrinsic decomposition for
  avatars (IntrinsicAvatar 2312.05210; SGIA 2407.15212; FLARE 2310.17519).
- **Ours.** —
- **Defaults.** Order 2; ridge on the non-constant terms.
- **Fails → fallback.** Order 1 (exists).
- **Gate.** Recovered skin albedo agrees across frames: ΔE₀₀ < 3 between the 25th and 75th percentile frames.
- **Status.** *Partial*: order-1 SH in `build.py`.

#### L40 Colour model (parametric by default)
- **Purpose.** The person's colours over the visible surface (skin, lips, under-eye, cheeks), as numbers.
- **In → Out.** Light-normalised frames, template UV regions → per region: a base colour and a smooth
  gradient (a low-order polynomial, ≤ 6 coefficients per channel, over the region's UV chart); hair, iris,
  brow and lip colours. A few hundred numbers in all.
- **Method.** Per region, robust (weighted median) light-divided colour over frames that see it well
  (weight = cos(view angle) × sharpness × mask confidence), then a least-squares fit of the low-order
  gradient (captures e.g. warmer cheeks, darker under-eye, lip gradient) with a ridge prior to the region
  mean. **Contrast features**: three luminance contrasts per person (brow–skin, lip–skin, iris–sclera),
  kept explicitly through banding so the painter's shadow band cannot wash them out; pigmentation is about as
  important as shape for identity (Russell et al. 2006), and these recover part of what a colour field would
  carry, with no field. **Regions as a smooth partition of unity**: region boundaries are template geometry, not
  photo data, and each region $r$ has a template-defined weight $\omega_r(uv)$, a Gaussian-smoothed region
  mask with $\sigma \approx 13$ mm and $\sum_r \omega_r = 1$; all regions are fitted **jointly** and the
  colour is $\sum_r \omega_r(uv)\,p_r(uv)$. A 2–3-texel feather on a 128² atlas is only 4–6 mm, so a ΔE ≥ 5
  step (under-eye to cheek, lip to skin) would show as a mask edge and its bandwidth would be unbounded. With
  $\sigma = 13$ mm the boundary transfer falls to one half at $f_{1/2} = 0.187/\sigma$, ≈ 2 cycles per
  140 mm face width, so the steps *between* regions are within the bound by construction, and the polynomials
  inside regions (at most half a cycle across the smallest region, then the ridge) stay below it; L42 checks
  the result with an FFT of the evaluated atlas. The lip border, which must be sharp, is template geometry
  drawn by L43's lip line, not a palette step.
  **Variant, only if the owner allows it (D1):** a band-limited field on the face chart (smooth
  least-squares field, low-passed below $f_c$), checked by L42's band test. The ablation (§8.5) reports
  parametric, parametric plus contrasts, and the field.
- **Research.** Inverse rendering on avatars (2312.05210, 2407.15212); albedo estimation without
  light-skin bias (2205.03962, 2406.13149, 2411.12002); spatial frequencies used in face recognition
  (Näsänen 1999, *Vision Research* 39); pigmentation and identity (Russell, Sinha, Biederman and Nederhouser
  2006, *Perception* 35, abstract read).
- **Ours.** Parametric colour as the shipped model, low information by design.
- **Defaults.** 14 regions; polynomial order 2.
- **Fails → fallback.** One colour per region.
- **Gate.** Mean ΔE₀₀ to measured skin colour (L13) < 3; no region darker than 3σ of its own frames (no
  baked shadows); the three contrasts in the rendered light band within 15% of measured.
- **Status.** *Partial*: `analyse.py` measures skin, iris, lip, brow and hair colours (the one-colour-per-region
  fallback, used by §8.6 step 0); `pack.py` measures colours; colour-point appearance in
  `splats.py`/`build.py` fits pixels and is a bench baseline only.

#### L41 Region palette, skin tone and shine
- **Purpose.** A painter's palette: a few colours per region, which is what a painting of a face uses, and
  where the skin shines.
- **In → Out.** Colour model → regions (forehead, cheeks, nose, lips, under-eye, chin, neck, ears, hands)
  each with light, half-tone, shadow and terminator colours, a shine level (none/low/high), a subsurface
  tint; Monk Skin Tone class.
- **Method.** Skin tone class by nearest Monk swatch in CIELAB, plus a **hue-angle tercile** (red to yellow)
  from L40's lit cheek colour: Monk is one axis, and hue angle is a separate one with its own biases (Thong et
  al., 2309.05148), so Indian skin at one depth ranges from olive-yellow to red-brown. The light/shadow
  colours shift as a painter would by a **table generated from palette rules** over the 30 cells (Monk class ×
  hue tercile): on Monk 1–5, warm lights and cooler, slightly more saturated shadows; on **Monk ≥ 6 the
  shadow hue moves towards red-orange and keeps its chroma**, and coolness enters only through the rim and
  bounce, because a cool shift turns deep or yellow-undertone shadows grey, which reads as ashy or dirty
  (painting practice, Gurney 2010, from memory, **UNVERIFIED**; see also 2312.06790). A handful of numbers
  the owner adjusts and S16 reports (no learned shift, which would need training
  data we do not have; an artist may refine it later). On deep skin the value contrast between bands is low; form is carried
  by rim, painted highlight and warm bounce instead, so the table raises those rather than darkening the
  shadow. Shine: one level per region with a per-Monk default, adjusted only when a clear highlight is seen
  in several frames (measured specular roughness is not used: oil, make-up, compression and auto-exposure
  confound it). Subsurface tint from the palette, not from a photo's terminator. Colours are applied **per
  texel** through the region gradient (L40), so cheek, lip and under-eye variation survives banding.
  **Value floor and ceiling**: phone captures put black hair and dark irises near $L^* \approx 10$–20, which
  in banded paint is a flat hole; measured $L^*$ of hair, brows and iris passes through a monotone curve with
  a floor (hair and iris $L^* \ge 18$), so the order across people is kept and hue is unchanged, and the
  curve is recorded in the build report. On Monk ≥ 6, sclera and teeth are capped at the lit skin value
  + 25 $L^*$, so they do not glow at a 120 px face. **Under-eye counted once**: L40 already measures
  under-eye darkening, so L50's authored socket offset is scaled by $1 - \mathrm{clamp}(\Delta L_{under\text{-}eye/cheek}/\Delta L_{ref}, 0, 1)$.
  **Colour-edit policy**: in an Indian market some teachers will ask for lighter skin. The Studio lets the
  measured palette move only within its measurement interval (the spread across frames), never offers
  lightening as a suggestion, and logs any manual tone edit in the build report, so S16's fairness figures
  are not quietly rewritten.
- **Research.** Skin-tone fairness (2205.03962); Gooch cool-to-warm shading (Gooch et al. 1998); painted
  light on dark skin (art practice; no paper verified).
- **Ours.** Monk-aware painterly palette rules authored for every class.
- **Defaults.** 4 colours per region; shine "low" on forehead and nose.
- **Fails → fallback.** Single skin colour per band.
- **Gate.** (P) Region colours stable between two halves of the capture (ΔE₀₀ < 3); on every one of the 30
  table cells, shadow-band chroma $C^* \ge 0.8\times$ the light band's, and on Monk ≥ 6 the shadow hue within
  [−15°, +5°] of the lit hue; sclera and teeth within the ceiling; owner's form-readability and "looks
  tired?" check per Monk group on the bench, with synthetic recolours at Monk 3, 6 and 9 × two hue angles.
- **Status.** *Partial*: Monk class and colours in `pack.py` and `analyse.py`; generated table *to build*.

#### L42 No-copy guard: information-budget certificate
- **Purpose.** Prove that no photo pixels are on the model, in a way a copy would fail.
- **In → Out.** The `.pbmodel` and the build graph → a certificate listing every photo-derived number
  (name, count, precision, layer, kind, effective spatial bandwidth) with its total, and a pass/fail report.
- **Method.** (1) **Certificate**: the build graph tags each value derived from photo pixels (as opposed to
  landmarks or masks; counted conservatively, so mask-derived curves are counted too); the certificate sums
  them. A count alone proves nothing: a 16 × 16 grey block portrait is 256 numbers, and familiar faces stay
  recognisable at about that resolution (Harmon 1973, *Sci. Am.*; Sinha et al. 2006, *Proc. IEEE* 94(11);
  exact thresholds **UNVERIFIED**). So every item is also typed: a **dense field** (a value that varies over
  an area of the face: region gradients, densities) must have an effective bandwidth of at most **2 cycles
  per face width**, four times below the 8–13 cycles per face width that recognition uses (Näsänen 1999);
  a **sparse item** (a point or a curve: marks, curves, outlines) is bounded by its count, since ≤ 10 points
  and ≤ 12 curves cannot form a portrait; a **scalar** is a single number. The certificate passes when the
  count is within budget **and** every dense field is within the bandwidth limit. Line items (estimates):

  | Item | Layer | Kind | Numbers | Bandwidth |
  |---|---|---|---|---|
  | Region colour gradients: 14 regions × 6 coefficients × 3 channels | L40 | dense | 252 | ≤ 2 c/fw |
  | Hair, iris, brow, lip, teeth colours | L40, L46 | scalar | 13 | 0 |
  | Contrast features | L40 | scalar | 3 | 0 |
  | Shine levels, freckle density per region | L41, L22 | dense (per region) | 28 | ≤ 2 c/fw |
  | Salient marks: ≤ 10 × (position 2, radius, colour 3, class) | L22 | sparse | 70 | — |
  | Eye-aperture and lid-crease descriptors | L22 | scalar | 12 | 0 |
  | Hairline and nostril curves | L22 | sparse | 32 | — |
  | Hair style class, fit parameters (parting, fringe, length, volume, clump count) | L47 | scalar | ≈ 10 | 0 |
  | Flyaway ribbon directions (*later*): orientation field from hair masks, band-limited, or taken from the style library | L47 | dense | ≈ 20 | ≤ 2 c/fw |
  | Crease curves: ≤ 12 × (6 control points × 2 + 3 strengths) | L21 | sparse | 180 | — |
  | Brows: 2 × (outline 16, thickness 9, density 5, direction 3, tail 2) | L43 | sparse | 70 | — |
  | Mouth-interior numbers | L46 | scalar | 4 | 0 |
  | Accessories and facial-hair regions (colour, density) | L14 | scalar / dense per region | ≈ 20 | ≤ 2 c/fw |
  | **Total** | | | **≈ 714** | |

  The budget is 800 numbers. Bandwidth is measured over the **whole evaluated atlas**, so the steps between
  regions count, not only the polynomials inside them; with L40's partition of unity it holds by
  construction, and an FFT of the atlas checks it. A bound on the *basis* proves nothing about the *values*
  (any values pass a type check), so the certificate is paired with the **colour-only identification test**
  of S15: the norm head is rendered carrying only this person's photo-derived numbers, and a check-only
  recogniser must identify it among the bench and pool no better than chance (TOST, ±0.05); a copy fails
  this, a type check cannot. (2) **Painter audit**: the master band set (L51) is template data with no
  person in it; the per-person overlay is painted only from the certificate's numbers and our own renders
  of the fitted template; the audit checks that no photo or photo-derived image is on either path. (3)
  **Patch check** as a sanity test: compare 16×16 patches of the final overlay and of the recoloured bands
  with every source frame's aligned face by NCC, against a threshold calibrated on *different* people. (4)
  **Only if the colour field is allowed (D1)**: its bandwidth is the owner's chosen $f_c$, and the v1 test
  (high-pass both, NCC) is replaced by a test in the band 2–6 cycles per eye distance: the field's NCC to the
  person's own aligned faces in that band must not exceed the 99th percentile of its NCC to *other* bench
  people's faces by more than a margin. (5) Clothes and background are never learned (L48).
- **Research.** Nearest-neighbour matching against training images is a common way to audit generative
  models for memorisation (general practice; no single source verified here: **UNVERIFIED**); recognition
  of coarse faces (Harmon 1973; Sinha et al. 2006); spatial frequencies for faces (Näsänen 1999).
- **Ours.** A certificate of what was measured, bounded in count and in spatial bandwidth, rather than a
  test of what was not copied. We did not find this as a stated build check in prior avatar work.
- **Defaults.** Budget 800 numbers; dense fields ≤ 2 cycles per face width; patch NCC threshold = 99th
  percentile of the cross-person distribution on the bench.
- **Fails → fallback.** Drop to one colour per region; if the painter audit fails, the build stops.
- **Gate.** S15 on every build (P; E for the colour-only test); S21's mutants must fail it: the output of the
  production `bake_skin.py` (a photo projected as albedo, kept under `tests/` for this), a 16 × 16 block
  portrait smuggled in as "gradients", and a field at 2.5 c/fw (1.25× the bound).
- **Status.** *To build*. The shipping build violates it today (§2.4); §8.6 step 0 removes the photo bake.

#### L43 Feature curves: brows, lids, lip line, lashes
- **Purpose.** Brows, eyes and lips carry most of a face's identity at a glance; draw them crisp. Brows
  first: removing the eyebrows hurts recognition of familiar faces more than removing the eyes (Sadr, Jarudi
  and Sinha 2003).
- **In → Out.** Face points + masks → vector features: brow shapes (upper and lower outline, thickness
  along the brow, hair density from sparse to dense, a hair-direction field along the brow, the tail end
  point, the inter-brow gap, colour), lash line weight, lip outline and colour gradient (upper darker),
  eye-line shape.
- **Method.** Brow outline: from the brow landmark pairs (`BROW_L/R` in `anime.py`) refined to the brow
  mask edge by 1-D search along normals; thickness profile sampled at 9 stations; density and direction from
  the mask's fill and edge orientation (numbers, not pixels). Brows are painted as **stroke clumps** by the
  overlay painter (L51), never as filled shapes. Lips: the outer and inner rings give the outline; colour
  from L41's lip region. Curves are numbers (control points), counted in L42; brow shape is a foil-matching
  criterion in S2.
- **Research.** Line drawings (1810.01175); stylised feature rendering in ToonifyGB (2505.10072); the
  eyebrows in face recognition (Sadr, Jarudi and Sinha 2003, *Perception* 32).
- **Ours.** Features measured as vectors and painted by our painter and shader.
- **Defaults.** 9 thickness stations per brow; 5 density stations.
- **Fails → fallback.** Landmark-only brows.
- **Gate.** Brow-shape IoU ≥ 0.85 vs. the masks in the front view and the tail position within 2% of eye
  distance.
- **Status.** *Partial*: `paint_features.py` traces brows, lids, lips and nose from the best photo and draws
  them cleanly, but onto the photo skin (to be drawn onto the parametric skin from the curves alone, §8.6
  step 0); brow ribbons from landmarks in `anime.py` (salvage).

#### L44 Eyes
- **Purpose.** Eyes that look at the student, with the person's iris colour, never a "sticker" at
  three-quarter angles, and never showing the inside of the head.
- **In → Out.** Eye rings, iris centre and radius, iris colour → two eyeballs (sclera, iris with layered
  pattern, pupil, cornea), placed and sized in mm; a tear-line strip and a caruncle.
- **Method.** Eyeball radius 12 mm. **Centre by gaze invariance**: across frames, the 3D centre about
  which the iris centre moves on a 12 mm sphere is found by a least-squares sphere fit to the iris centres in
  the head frame, then clamped to the template socket; the corneal apex sits about 2–3 mm in front of the lid
  plane (wrong depth gives the "sticker" look at three-quarter views and wrong lid wrap in L45). Iris radius
  measured (L18). Eye geometry is the template's (MPFB CC0 eyes). The iris is shaded procedurally (radial fibres + limbal ring + darker collarette), in the
  measured colour. **Optics**: iris parallax (cornea refraction approximated by offsetting the iris UV along
  the view ray by the anterior-chamber depth), limbal darkening growing with view angle, a wet tear-line
  (meniscus) strip along the lower lid and a caruncle at the inner corner. **Dark eyes that read**: most of our
  teachers have dark-brown irises near black, so the iris gets L41's value floor and a painted **corneal
  caustic**, a lighter crescent in the lower iris opposite the catch-light (real-time eye practice, Jimenez et
  al., GDC 2013, from memory, **UNVERIFIED**). Rotation by gaze angles (L71) with
  pupil size tied to scene brightness.
- **Research.** Eye modelling (Bérard et al. 2014; EyeNeRF 2206.08428); gaze redirection (2411.12981).
- **Ours.** Measured, procedurally painted iris; no iris pixels.
- **Defaults.** Gaze range ±30° horizontal, ±20° vertical; anterior chamber 3 mm.
- **Fails → fallback.** Dark-brown iris.
- **Gate.** Eye-centre fit residual < 0.5 mm; in the facing render the iris is centred on the camera within
  1°; no head-interior pixels visible at ±30° gaze; iris colour ΔE₀₀ < 5 vs. L13 (before the value floor); iris–pupil ΔL* ≥ 8 and the caustic
  visible at the 120 px phone face; owner judges the three-quarter eye "not flat" on 8/8.
- **Status.** *Partial*: generated eye spheres and shader eyes in `anime.py`; optics *to build*.

#### L45 Eyelids and lashes
- **Purpose.** Lids that hug the eyeball and follow gaze; lashes and blinks.
- **In → Out.** Eye rings, personal expression deltas → lid geometry that slides over the eyeball.
- **Method.** Upper and lower lid vertices are projected onto a sphere 0.5 mm larger than the eyeball
  each frame (so no gap appears); vertical gaze lifts the upper lid by 0.4 × pitch; lash strips are
  ribbons along the upper lid with thickness from L43. The upper-lid crease (type and height from
  L22) shapes the lid fold and is drawn as a feature line (L54); lid shapes come from the template's face
  units, only their range from the person (L35).
- **Research.** Lid–gaze coupling in eye animation (Bérard et al. 2014; codec avatars with gaze 2008.05023).
- **Ours.** —
- **Defaults.** Lid follow 0.4.
- **Fails → fallback.** —
- **Gate.** No lid–eyeball gap at any gaze in ±30°; full closure at eyeBlink = 1.
- **Status.** *Partial*: lid ribbons in `anime.py`.

#### L46 Teeth, gums, mouth cavity and tongue
- **Purpose.** A mouth that is solid inside; teeth visible exactly when lips part; a tongue for the
  sounds where it shows.
- **In → Out.** Inner lip ring, jaw, tongue controls (L65) → upper teeth (fixed to the skull), lower teeth
  (on the jaw), gums, a dark-shaded cavity, tongue pose.
- **Method.** The template's teeth arch (MPFB CC0 teeth and tongue) is scaled per person (width from the
  mouth-corner distance; height from the inner-lip opening in "aah" frames). Teeth are what show most when a
  teacher talks, so four **mouth-interior numbers** are measured from the "aah" and smile shots: upper-incisor
  display at rest and in the smile (bright pixels inside the inner-lip ring, as a fraction of the opening),
  gum show in the smile (pink band height), and whether a midline gap is present; they set the arch's
  vertical position and the gum line, and are counted in L42. Upper arch fixed to the head, lower to the jaw rotation from
  jawOpen; the cavity is the template's mouth bag, shaded darker with depth. The tongue is the template's
  tongue on a 4-bone chain (root, body, blade, tip) with 5 key poses: rest, tip up (t, d, n, l), tip between
  teeth (θ, ð), back raised (k, g), out; retroflex (ʈ, ɖ, ɳ) curls the tip only, inside the mouth (no lip
  or jaw claim, L64).
- **Research.** Full-head models with teeth (1911.08008); mouth interiors in Gaussian heads (2409.11951);
  articulatory models (2408.05641, DYNARTmo 2507.20343); tongue reconstruction (2106.12302).
- **Ours.** Measured arch size; teeth colour from the palette (a per-Monk-neutral ivory adjusted by the "aah"
  frames' median, one number).
- **Defaults.** 8 visible teeth per arch at LOD0; tongue visible only when jawOpen > 0.15 or tongueOut > 0.
- **Fails → fallback.** Dark cavity; tongue at rest.
- **Gate.** No see-through mouth at any expression; teeth visible iff inner lips separate > 1 mm; in the
  smile render, teeth display within ±1 mm of the measurement; tongue visible on "th" and "l" in close-up
  renders and never through the teeth.
- **Status.** *Partial*: cavity in `rig.py`; teeth spheres and a tongue shape in `anime.py`.

#### L47 Hair shape (library first)
- **Purpose.** Their hairstyle, length, parting and volume, as large painted clumps, which is how the
  reference look draws hair.
- **In → Out.** Hair masks from several views, hair colour, length, parting, head covering → a fitted style
  from an owned parametric clump library, plus a few flyaway ribbons.
- **Method.** (1) **Library**: owned parametric clump-hair meshes generated by script, each with control
  points for parting, fringe, length, volume and clump count (in the spirit of CHARM's control points,
  2509.21114). Release 1 starts from the CC0 MPFB hair meshes the Studio already picks by
  measured length (`pipeline.py`) and replaces them style by style as each owned style passes the gate: short,
  side part, short wavy or curly, long straight, **plait or ponytail**, and **bun**; *later*: crop, bob,
  shoulder, long wavy, and head coverings (turban, dupatta over the head, hijab, cap). Many women teachers
  wear a plait or a low bun, which looks short from the front, so silhouette fitting alone would choose
  "short": the Studio asks "Hair tied back? (open / plait / bun / ponytail)", and the left and right scan
  views confirm it. An "oiled" shine level widens the painted highlight shapes. The
  hairline curve (L22) sets the fringe and the scalp edge. Each clump family carries two or three
  **painted highlight shapes** in its UV, used by L52. (2) **Fit**: choose the style and its parameters by
  matching the visual-hull silhouettes of the hair masks in front and three-quarter views (chamfer + IoU),
  parting position from the front view. (3) **Detail** (*later*): 10–30 guided ribbons for flyaways and lock edges,
  grown along a 2D orientation field that is band-limited to L42's bound (it is a dense photo-derived field
  and is counted there) or taken from the style library; never on the critical path. Clumps are opaque, with alpha-to-coverage tips (L55), so no transparency sorting is needed.
- **Research.** Hair cards from one image (HairDeck 2610.40599), CGHair (2604.03716); control-point
  hairstyles (CHARM 2509.21114); multi-view strand reconstruction needs dense video and long optimisation
  (Neural Haircut 2306.05872; EfficientMonoHair 2604.05794), so it stays research.
- **Ours.** A pixel-free hair pipeline: only masks, length, parting and colour select and shape owned clumps.
- **Defaults.** 20–40 clumps; 6 segments each; motion by the spring layer (L81).
- **Fails → fallback.** The nearest library style at default parameters for the measured length.
- **Gate.** (P) Hair silhouette IoU ≥ 0.8 in front and three-quarter views; style class (including tied
  back) right on 8/8 bench people and on the pool; owner judges the style "theirs" on ≥ 7/8.
- **Status.** *Partial*: MPFB hair chosen by length and recoloured in `pipeline.py`; locks from measured
  length/volume/parting in `make_hair` (`anime.py`, salvage); owned library *to build*.

#### L48 Wardrobe and garment fit
- **Purpose.** New clothes (Indian and Western) that fit their body; nothing from the photos.
- **In → Out.** Fitted body + outfit parameters (garment type, colour, sleeve, collar, ease) → garment mesh
  skinned to the same bones.
- **Method.** Garments are MHCLO assets on the template (cages, UVs, fold strokes in the master paint), so
  per person they follow the template fit; parameters set ease, hem height, neckline curve and sleeve
  length. Release 1 starts from the CC0 MPFB clothes packs already licence-checked (`shirts01`, `suits01`,
  …), re-shaded in bands, plus **a kurta modelled by us** on the template, because the brief asks for Indian
  clothes and no CC0 pack has them; *later*: saree with pallu over one shoulder and dupatta (their loose
  parts move with the spring layer, L81), blazer lapels. Skin weights from the template's smoothed shoulder
  weights (L36), so garments do not ride up when an arm is raised; garments carry the body's pose correctives
  through their cages (L37), so the shoulder and elbow shapes cannot poke through; a min-distance constraint keeps cloth
  outside the body; fold detail as angle-driven correctives and painted fold strokes. Particle cloth (XPBD) is
  deferred to research: waist-up garments under gesturing arms give the most collision artefacts for the
  least gain.
- **Research.** Garment-aware rigging (TailorRig 2611.02902); bone-driven garments (HyperBones 2605.20460);
  made-to-measure garments (2405.17609, ideas only); XPBD (Macklin et al. 2016).
- **Ours.** A wardrobe of parameters with Indian garments, made once on the template.
- **Defaults.** Release 1: shirt, T-shirt, sweater, blazer (from CC0 packs), kurta (ours).
- **Fails → fallback.** Plain shirt.
- **Gate.** No body vertex outside the garment on any frame of the library, including arms above 90°.
- **Status.** *Partial*: CC0 clothes with per-file CC0 check in `build-vrm-teacher.py`; offset tubes and
  outfit colours in `body.py`; kurta *to build*.

---

### Stage F: The painted look (L49–L57)

The target is the hand-painted style of the brief's reference sheet: realistic proportions, painted skin
and hair with visible brushwork, a dramatic key light and a coloured rim light, strong readable expressions.
By the accounts available, that look's studio painted light, shadow and brushwork **into the textures** of
its 3D models, mostly by hand on the albedo, with some shadows and key highlights painted in and the
procedural shading kept small (trade-press breakdowns of its texturing and an FMX 2025 session; studio
details **UNVERIFIED** beyond those secondary sources). Version 1 put a screen-space Kuwahara filter over
toon bands (it shimmers and reads as a generic "oil filter"). Version 2 painted band textures per person.
Version 3 **paints once, on the template**, as the mesh is made once: a master band set whose stroke
structure is shared by every teacher, recoloured per person by the palette, with only the person's own
features painted per person. Brush quality is a craft, so the master set is the one place where a painter's
hand can enter (D3), and it is cheap to replace. Version 4 keeps *data* (thresholds, widths, ids) out of
the compressed, painted-mip *paint* textures, resolves the palette once at load, draws feature lines as
texture distance fields, and renders one forward pass straight into the canvas. All run-time code is
three.js on WebGL2 (one back end).

#### L49 Lighting rig and theme-aware value key
- **Purpose.** The light that makes the painted forms read — a warm key, a cool fill, a coloured rim — and
  a figure that stands out from whatever page is behind her.
- **In → Out.** Site theme (light/dark, accent), the page's own state under the panel → three lights +
  ambient, fixed in the panel frame, and a value-key preset.
- **Method.** Key upper-left in front, fill right, rim behind (as `STUDIO` in `twin.py`), with colours from
  the theme palette; the key's direction is fixed relative to the camera so the face never goes dark, and is
  the same for every teacher (one lighting language across the site). The reference drama comes from dark
  surroundings; over a light lesson page or a drawn theme scene a coloured rim vanishes against white and
  saturated cool shadows read as dirt. So the preset follows the **background luminance behind the panel**:
  on light backgrounds a high key (shadow band lifted ≈ 15% in value, the rim turned into a darker contact
  edge in the region's line colour, a reflected bounce taken from the page colour); on dark backgrounds full
  drama. WebGL cannot read the page's pixels under its canvas, so the luminance is computed from the page's
  state: `document.elementsFromPoint` over a 3 × 3 grid of the panel rectangle, the computed background
  colours of those elements (design tokens), and the theme scene's colours (`sceneArt.ts`,
  `theme-scene.css`) for the band the panel overlaps. Presets crossfade over ≈ 400 ms with hysteresis, so
  scrolling past a dark code block does not flash the lighting. On deep skin over light pages, form rests on
  the painted highlight and the bounce (the rim has become a contact edge), so that cell gets its own
  form-readability rating.
- **Research.** Studio three-point lighting; theme matching per `docs/ui/premium.md`; the site's twelve
  themes in light and dark (`client/src/theme/styles.ts`).
- **Ours.** Value key chosen from the page state behind the teacher, with a figure-ground gate.
- **Defaults.** Key 0.85, fill 0.35, rim 0.35, ambient 0.28 (as in `twin.py`); crossfade 400 ms, hysteresis
  ±0.08 in luminance.
- **Fails → fallback.** Default palette, fixed key, dark preset over a solid panel.
- **Gate.** Face mean luminance in [0.45, 0.75] for every bench person and theme; S19 (measured on
  Playwright screenshots of the real pages, where real pixels exist), with the deep Monk groups over light
  themes as their own cell; no preset change faster than the hysteresis in a scrolling test.
- **Status.** *Partial*: three-light setup in the Studio player (`client/src/pratibimb/engine/player.ts`);
  `STUDIO` in `twin.py` (salvage); presets and the page-state luminance *to build*.

#### L50 Shading-normal field
- **Purpose.** Banded shading has no in-between tones, so tiny normal noise becomes a blotch; painted faces
  read through large, simple light shapes that still belong to *this* face.
- **In → Out.** Fitted mesh, template's authored attributes → a per-vertex shading normal and per-vertex
  threshold offsets, baked per person (and per morph target, in L37's normal and colour slots).
- **Method.** Shading normal $= \mathrm{normalize}(\mathrm{lerp}(n_{true}, n_{proxy}, w))$. The proxy is a
  **heat-diffused copy of the person's own fitted mesh**: one implicit fairing solve $(M + tL)\,x = M x_0$
  (cotangent Laplacian $L$, mass matrix $M$; Desbrun et al. 1999) on the vertex positions, with $t$ set so
  the smoothing length $\sqrt{2t}$ ≈ 15 mm, and normals taken from the smoothed surface. It removes noise
  and pores but keeps cheekbones, brow ridge and jaw: with three bands, the terminator is a main carrier of
  3D face shape, and a heavily smoothed proxy would make two people with similar palettes render alike. A
  hard cut in a Laplacian eigenbasis would ring (Gibbs), creating exactly the small band islands this layer
  forbids, and would need about 2,000 eigenvectors for a 15 mm cut on the head (Weyl's law), a near-dense
  eigensolve; the diffusion has no ringing and needs one sparse factorisation, reused for the 52 targets
  (one back-substitution each). An optional **planar snap** (authored strength per region) then pulls the
  proxy normals towards the template's plane segmentation (L33), on shading normals only, never positions,
  by an as-rigid-as-possible normal snap in the spirit of Cubic Stylization; it gives the chiselled planes
  of the reference look where the person's own geometry does not break them. $w$ is authored (≈ 0.6–0.8 on
  cheeks and forehead, ≈ 0.2 on the nose bridge and lips). Threshold offsets force areas lit or dark as
  painters do (under the nose, eye sockets, under the lower lip, the neck under the jaw). They are authored on
  the template and only an artistic bias: the *shape* of this person's nose and socket shadows comes from
  L53's key-shadow bake on their own mesh, because a template nose shadow carried over by correspondence
  would give every teacher the template's nose length and bridge in three-quarter view. Morph
  targets carry shading-normal deltas in L37's normal slot and threshold-offset deltas in its colour slot.
- **Research.** Authored normals and shading thresholds (Motomura, GDC 2015); implicit fairing (Desbrun,
  Meyer, Schröder and Barr 1999, SIGGRAPH); Cubic Stylization (Liu and Jacobson 2019, 1910.02926); planes of
  the head (figure-drawing practice, no paper).
- **Ours.** An identity-keeping proxy from the person's own low frequencies, with optional authored planes.
- **Defaults.** Smoothing length 15 mm; planar snap 0.5 on forehead and cheekbone planes, 0 elsewhere
  (ablation §8.5); bake ≈ 1–2 s (**UNVERIFIED**).
- **Fails → fallback.** True normals with a wider soft step.
- **Gate.** (Z) In a slow head turn and a speech clip, band islands smaller than 1% of the face area: 0 in
  ≥ 600 frames per bench person. (v4's "differs from the norm face by X%" clause is dropped: X had no value,
  and likeness is gated by S1 and S2.)
- **Status.** *To build*.

#### L51 The master band set and the per-person overlay
- **Purpose.** The brushwork and the painted light, on the surface, painted once for everyone, plus the
  few things that are only this person's.
- **In → Out.** (Once, template data) the template's UVs, stroke layout and plane segmentation → the
  **master band set**, split by kind:
  - **paint layers** (filtered): per chart, value and hue-shift layers for **light**, **half-tone** and
    **shadow** that share **one stroke layout** (a painter re-mixes a stroke rather than repainting it, so
    strokes do not "boil" as the terminator moves), a terminator-warmth layer, expression **wrinkle layers**
    (forehead on brow raise, crow's feet and nasolabial deepening on smile, glabella on frown, chin dimpling
    on lip press) with shadow-band deltas for jawOpen, eyeSquint and cheekPuff, and the hair clumps'
    highlight shapes; hue shift stored as a signed Oklab a/b offset biased into 8 bits;
  - **data layers** (may be filtered, never block-compressed): the brush-edge threshold map $T$, the
    per-region edge-width map, the focus weight and the wrinkle masks in one RGBA8 texture with box-filtered
    mips, and the template's own feature lines (ear fold, nostril default, fingernails, finger separation)
    as a signed-distance channel.

  (Per person) the certificate's numbers → a small **overlay** on the face chart: a signed-distance
  channel for the person's feature lines (L43 lip line and lid shapes, L22 lid crease, hairline and nostril,
  L21 creases; 512², RG8), brows as stroke clumps, salient marks and freckles kept by the person (L22),
  facial hair (L32), and a **stroke-variation map** (256², one 8-bit channel with its own painted mips):
  each master stroke receives a small value, hue and width jitter from the person's seed.
- **Method.** *Master set, default*: generated by our procedural painter (`paint.py`) on the template, with
  stroke orientation following curvature on the body, hair flow on hair and radial directions around eyes
  and mouth; strokes larger in shadow and smaller near features; stroke size, contrast and saturation fall
  away from the face by geodesic distance (the eyes and mouth get the finest strokes, garments and the lower
  torso the broadest; the hands get a second focus while gesturing), because uniform detail is a "3D render"
  tell and pulls the student's eye off the face. **Stroke size is set in screen pixels at the shipping
  sizes** (a ≈ 250 px face in the laptop panel, ≈ 120 px on a phone): each painted mip carries strokes of
  the same on-screen width, so brushwork neither vanishes nor turns into noise at panel size. Flow-aligned
  smoothing (anisotropic Kuwahara, LIC) are bake tools here. **Baking to UV** reuses `bake_skin.py`'s
  projective texel tracer (a camera per view, every texel traced to the mesh and to each view), fed with
  `paint.py` over plain, photo-free renders of the template instead of photos: the same code, legal inputs.
  **Spike version (§8.6 step 0)**: one RGBA8 texture per band (light, half-tone, shadow) on the MPFB face UV,
  made this way, with one stroke size tuned by eye at a 250 px face. Everything else in this layer (data
  layers, distance-field channels, wrinkle layers, the stroke-variation map, per-mip strokes) enters only
  after the spike's "go", each with its own A/B against the spike clip on identical frames (§8.5). *Master set, painted*: if the procedural set
  fails the look spike (§8.6), staff paint 4–6 sets in Krita (by age band, sex and Monk cluster), owned
  outright (D3); never painted over frames of the series. *Diffusion variant (D9)*: would paint master sets
  offline, once, from the owned kit only. Paint layers: each mip level painted from the stroke list (as
  tonal art maps do), shipped as WebP or PNG in release 1 (≈ 3 MB, cached once for all teachers);
  KTX2/Basis UASTC only if S14 fails on GPU memory (*later*: the three.js r187 transcoder is 527 KB raw,
  245 KB with gzip, plus a 57 KB loader, and its upstream licence is still to read). Data layers: uncompressed RGBA8, Brotli over HTTP, because
  block compression spreads error across a block and a filtered id becomes another stroke. *Overlay*:
  painted per person by `paint.py` from numbers only; the stroke-variation map replaces v3's per-person
  stroke-id shuffle, which would have forced either a per-person copy of the master set (≈ 3 MB per
  teacher) or nearest sampling through ids (shimmer at panel size). The painter never sees a photo (L42
  audit). Once an owned style kit exists, a *style distance* becomes a machine gate beside the owner's
  rating (*later*). v4's view-indexed master paint is merged into L53's pose-indexed shadow bake, which uses
  the same 5 yaw × 3 pitch grid and the same fact (a camera-locked key) and carries the person's own geometry;
  pose-indexed stroke values join that path only if the owner's motion rating still asks for them (*later*).
- **Research.** Painterly rendering for animation (Meier 1996); texture painting in the reference series
  (secondary accounts, **UNVERIFIED**); tonal art maps (Praun, Hoppe, Webb and Finkelstein 2001, cited from
  memory); expression wrinkle maps (Jimenez, Echevarria, Oat and Gutierrez 2011, *GPU Pro 2*); distance-field
  lines (Green 2007, SIGGRAPH course, from memory); StyleBlit (1807.03249) and lit spheres, merged here into
  the painted master set; SyncMVD (2311.12891), MVPaint (2411.02336), Paint3D (2312.13913), TEXTure
  (2302.01721) for the diffusion variant; anisotropic Kuwahara (Kyprianidis et al. 2009) and LIC (Cabral and
  Leedom 1993) as bake tools; KTX2/Basis Universal (*later*; the three.js transcoder lists Apache 2.0,
  upstream text to confirm in L3).
- **Ours.** One painted master set recoloured per person, with a numbers-only overlay, per-person stroke
  variation without copying the master, and wrinkle layers in the paint language.
- **Defaults.** Master set: 512² face chart per paint layer (1024² if a close-up framing is offered), 256²
  hands, 128² elsewhere, ≈ 3 MB once for all teachers; overlay ≈ 0.45 MB per teacher (SDF ≈ 0.1 MB, variation
  map ≈ 40 KB, the rest marks, brows and facial hair); overlay bake ≈ 2 s.
- **Fails → fallback.** Flat palette bands (no strokes).
- **Gate.** S18 (including the "identical brush pattern" question, on the stroke-variation map); flicker
  (L55) ≤ the plain shaded render; L42 painter audit passes; every data layer bit-exact after download (no
  block compression on data).
- **Status.** *Partial*: offline painter in `paint.py` (salvage); texel tracer in `bake_skin.py` (to be fed
  template renders); master set on the template, the data/paint split and the overlay *to build*.

#### L52 Painted shading model (run time), with eyes and hair highlights
- **Purpose.** Light and shadow as painted shapes, not smooth CG gradients, and the two places where
  painted characters are most expressive: eyes and hair.
- **In → Out.** Shading normal (L50), shadow map and occlusion (L53), lights, master band set and overlay
  (L51), the person's palette atlas (built at load from L40–L41), face values → shaded colour per pixel.
- **Method.** Band coordinate $d = \mathrm{wrap}(n_s\cdot l) \cdot$ shadow $\cdot$ occlusion + threshold
  offset, then a **broken terminator** $d' = d + a_r\,(T(uv) - 0.5)$ with $T$ the brush-edge threshold map
  and $a_r$ authored per region (large on cheeks and hair, small on nose and lips), locked to the surface so
  it does not swim. The bands are blended with a soft step whose **width is authored per region** (hard for
  cast shadows and under the jaw, soft on the cheek turn and forehead: "lost and found" edges). **Palette
  atlas**: at load, one GPU pass evaluates L40's partition-of-unity colour and the L41 band colours into two
  128² RGBA8 textures on the face chart (light/half-tone and shadow/terminator; ≈ 1 ms once, ≈ 64 KB); a hard
  region id per texel would seam at every boundary and a per-fragment region branch is slow. The atlas is rebuilt from the stored numbers, so look changes still reach every
  teacher without a rebuild. **Colour** $= \mathrm{palette}(uv, \mathrm{band}) \otimes \mathrm{stroke}(uv,
  \mathrm{band}) \otimes \mathrm{variation}(uv)$, with the three contrast features held; then the overlay.
  **Lines**: the overlay's and the master set's distance channels give each feature line as a `smoothstep`
  of the distance against a width chosen at run time and anti-aliased with `fwidth`; the width follows the
  light, the expression and $n \cdot v$ (nostril and ear-fold lines fade as they turn away); colour = the
  region's darkest paint colour, never black. Wrinkle layers blend by their face values
  and region masks; the focus weight lowers contrast around the band midpoint away from the face. Shadows are
  cooler and more saturated because they were *painted* so (L41). Specular is a small painted highlight
  shape where L41 says. Rim: $r = (1-n\cdot v)^p \cdot \max(0, n \cdot l_{rim})$, coloured, stronger on deep
  skin per the L41 table, or the contact edge of the light-page preset (L49). On hair the rim is **added** in
  the light's colour, not multiplied by the albedo, which would erase it on black hair. The rim is one-sided
  and is zero at the silhouette on the unlit side, so on **dark themes** a symmetric view-space edge term
  $(1-n\cdot v)^{p}$ in a light contact colour is added along the whole silhouette; without it black hair or a
  dark kurta over a dark page sits near 1.2:1 and S19 fails. **Far-side contour edge** (spike flag): with no
  silhouette line and no face self-shadow, a three-quarter nose against a cheek of the same palette has
  nothing to separate it, so $e = 1 - \mathrm{smoothstep}(0, k\,\mathrm{fwidth}(c), c)$ with $c = n_{rest}\cdot v$
  ($n_{rest}$ the skinned rest normal, no morph slot needed) is multiplied by an authored mask (nose and ala,
  upper lid, lower lip, chin) and drawn in the region's darkest paint colour, at most 1.5 px wide: a value
  edge, not an ink line (the cheap special case of suggestive contours, DeCarlo et al. 2003, from memory). **Eyes**: a painted catch-light
  fixed to the key direction, iris shadow under the upper lid driven by lid position, sclera tinted towards
  the skin's shadow colour at the corners, with L44's parallax and limbal darkening. **Hair**: the clump's
  painted highlight shapes, switched on by the band coordinate and shifted along the clump tangent by the
  half-vector (an analytic Kajiya–Kay lobe reads as a CG "shampoo" sheen). **Minimum on-screen sizes** (a 120 px face
  has an eye ≈ 18 px wide and an iris ≈ 7 px): catch-light radius ≥ 1.25 px, lash line ≥ 1.5 px, brow
  thickness ≥ 2 px, lip parting ≥ 1 px, whatever the authored size; below a ≈ 160 px face, L21's creases and
  L22's freckles are dropped, while brows, the lash line, the lip parting, the nostril, glasses and kept marks
  ≥ 3 mm stay. (v4's stroke-quantised band choice and its stroke-id texture are removed: no gate needed them.)
- **Research.** Cool-to-warm shading (Gooch et al. 1998); locally controllable stylised shading (Todo,
  Anjyo, Baxter and Igarashi 2007, *ACM TOG* 26(3)); Shading Rig (Petikam, Anjyo and Rhee 2021, *ACM TOG*,
  10.1145/3461696); toon/cel shading (the lab `toon.js`); real-time strand rendering (2405.10565, ideas).
- **Ours.** Load-time recolouring of a shared painted master set by measured colour numbers through a
  palette atlas, chosen by a stabilised normal with broken, per-region edges.
- **Defaults.** 3 bands on skin, 2 on hair and cloth; rim power 4; catch-light radius 12% of iris; band
  choice per pixel.
- **Fails → fallback.** Two-tone toon shading (current `toon.js`).
- **Gate.** S18; S19 with black hair on dark themes as its own cell; form readable per Monk group over light
  and dark backgrounds (owner's check on the bench); catch-light visible in both eyes in 100% of frames with
  gaze within ±20° (Z, ≥ 600 frames), at 720 px and at the 120 px phone face; the minimum sizes met at
  120 px; far-side edge present on the far nose in three-quarter renders for 8/8 people with flicker
  (L55) ≤ 1.5× plain, if the spike keeps it.
- **Status.** *Partial*: MToon looks "painted", "anime" and "real" switched at run time in
  `client/src/pratibimb/engine/look.ts` (the `look: 'band'` variant is §8.6 step 0); lab shader and matcap
  highlights in `player/toon.js`; band recolouring *to build*.

#### L53 Key-light cast shadow and baked occlusion
- **Purpose.** Readability in the reference look comes from cast shadows (hair on the forehead, the chin on
  the neck, the pointing hand on the chest) and darkened eye sockets and under-chin areas.
- **In → Out.** Deformed meshes, key light → a stylised shadow term; per-vertex occlusion.
- **Method.** One 1024² shadow map for the key light; hard-edged, sampled with a small fixed kernel, and fed
  into the band coordinate (so a shadow selects the painted shadow band, tinted by the region's palette; its
  edge is "hard" in L52's edge map). **Caster–receiver matrix**: casters are hair, hands, arms and the head
  onto the neck and chest; **face self-shadow is off**. A 1024² texel is ≈ 0.8 mm on the face, so
  morph-driven acne would crawl across the nose and lids and read as blotches in banded paint (precedent:
  authored shade control, Motomura 2015; whether that production disabled face self-shadow is
  **UNVERIFIED**). **The person's own key shadow, baked by pose**: without self-shadow and with template
  offsets alone, every teacher would get the template's nose shadow, and in a painted portrait the nose
  shadow carries nose length, bridge and tip; L72's minimum yaw makes three-quarter views the common case.
  The key is locked to the camera (L49), so the face's self-shadow depends only on head pose and a few
  expressions. At build time the key light is ray-cast against the person's **faired** mesh (L50's proxy, so
  pores and noise cast nothing) on L51's 5 yaw × 3 pitch grid, at rest and at jawOpen, and stored as a
  **signed distance to the shadow edge** (so bilinear blending moves the edge rather than cross-fading two
  edges) in a 128² R8 array on the face chart, 15 layers (≈ 245 KB), plus one layer each for the hair on the
  forehead and the chin on the neck. At run time the pose's bilinear weights blend it into $d$ as a threshold
  offset with L52's "hard" edge; template offsets stay as an artistic bias on top. It is geometry only (L42
  unchanged), one fetch, no acne, and it works at every tier, so phones and the light tier keep the hair and
  nose shadows that the dropped shadow map would take away (prior art: light-angle face-shadow threshold maps
  in stylised games, production write-ups only, **UNVERIFIED**; authored shadow offsets, Shading Rig 2021;
  ours is the per-person bake from a measured mesh). The shadow frustum is fixed to the panel and the camera-locked light and never re-fitted
  to the bounds per frame, so texels do not swim. Per-vertex ambient occlusion baked at build time on the
  rest pose and, for the head geometry only, on each of the 52 targets, interpolated with the morphs (L37's
  colour slot). Painted rest-pose shadow strokes in the wrong place on a wide "aah" or squint are corrected
  by the wrinkle layers' shadow-band deltas (L51).
- **Research.** Shadow mapping and baked occlusion (standard real-time practice); authored shade control
  (Motomura 2015).
- **Ours.** —
- **Defaults.** 1024² map; casters ≈ 15k triangles (hair, hands, arms, head); pose bake 15 + 2 layers of
  128², under 1 s per build (**UNVERIFIED**).
- **Fails → fallback.** Occlusion plus the pose bake (tier "basic").
- **Gate.** GPU time ≤ 1.0 ms on the reference laptop (**UNVERIFIED** until the spike, §8.6); no shadow acne
  and no swimming texels in the head-turn clip (Z, ≥ 600 frames); the owner's three-quarter side-by-side
  (20° yaw hold, §8.6) prefers the per-person bake to template offsets on ≥ 6/8 bench people.
- **Status.** *To build*.

#### L54 Lines
- **Purpose.** Sparse, freehand-looking feature lines: lash line, upper-lid crease, lip parting line,
  nostril, ear inner fold, fingernails and finger separation, creases (L21), and where a hand crosses the body.
- **In → Out.** The distance channels of the master set and the overlay (L51), authored line controls,
  feature curves, hand and forearm meshes → lines inside the forward pass, plus one hull draw.
- **Method.** **No silhouette outline by default**: a constant-width inverted hull around the whole figure is
  the cel and anime signature that the brief replaced; the silhouette is separated by value, rim and the
  contact edge (L49). **Feature lines as texture-space distance fields**: every feature curve (L43, L21,
  L22, and the template's own) is baked into a signed-distance channel on its chart and drawn by L52's
  shader (`smoothstep` against a run-time width, `fwidth` anti-aliasing), with jittered width whose weight
  follows the light, the expression and $n \cdot v$. They ride the surface through every morph at no
  geometry cost, cannot z-fight the skin and stay crisp at every DPR. Ribbons, which v3 used, would need
  their own morph targets (WebGL2 cannot read another mesh's morphed positions), a pass and depth bias. The
  lash line stays the template's lash cards (L45), which already carry the morphs. **Hand crossing the
  body**: the only view-dependent contour that matters gets an **inverted hull on the hands and forearms
  only** (≈ 3k vertices, depth-tested), the existing `toon.js` hull restricted to two meshes; this replaces
  v3's 8-bit id target, which cannot be multisampled as an integer format in WebGL2 (OpenGL ES 3.0 refuses
  integer multisample renderbuffers) and whose resolved values at edges would be wrong. The full-figure hull
  stays as a theme option. WebGL2 only.
- **Research.** Line drawings from 3D models (1810.01175); line control in stylised 3D (Motomura 2015);
  distance-field magnification (Green 2007, from memory); XDoG (Winnemöller et al. 2012) as used offline in
  `paint.py`; Khronos OpenGL ES 3.0 reference, `glRenderbufferStorageMultisample`; accounts of hand-made,
  shaky lines in the reference look come only from recreation write-ups (**UNVERIFIED** for the series
  itself).
- **Ours.** Expression-driven crease lines from measured curves, as distance fields on the painted surface.
- **Defaults.** Line colour = darkest palette colour of the region, never black; full hull off; hand hull on.
- **Fails → fallback.** Distance-field lines only (no hand hull).
- **Gate.** No line flicker (L55) and lines present on all named features in every bench render; line
  width stable within ±0.5 px across the 720 px and the phone size, and never below L52's minimum sizes. After
  the spike's "go", line ends may taper along the curve through the distance texture's second channel (arc
  length), A/B against round caps.
- **Status.** *Partial*: offline lines in `paint.py`; outline in `toon.js`.

#### L55 Anti-aliasing and temporal stability
- **Purpose.** Banded edges and thin dark lines alias badly at 720p; slow painted ramps band on 8-bit
  output; nothing may crawl or flicker.
- **In → Out.** The forward pass → an anti-aliased, stable, dithered frame.
- **Method.** Multisampling from the canvas itself (`antialias: true` on the WebGL2 context, typically 4×),
  alpha-to-coverage for hair tips and lash edges (no sorting), and `fwidth`-based anti-aliasing of the
  distance-field lines. On tile-based phone GPUs the browser resolves samples on-tile, whereas an explicit
  multisampled renderbuffer and blit writes every sample to memory (Arm Mali guidance), so the phone tier
  keeps MSAA and the morphological AA tier is removed. Because the paint is on the surface, temporal
  reprojection is **off** (without sub-pixel jitter it only smears a fast mouth), so no velocity target is
  rendered. **Dither**: ±0.5/255 of a fixed, screen-locked 64² blue-noise tile is added to the final colour;
  the wide soft steps (cheek turn, forehead) and the lifted high-key preset otherwise band visibly on 8-bit
  canvases, worst on deep skin, where the value range between bands is small by design (L41). A temporal
  pattern would flicker; a screen-locked one does not.
- **Research.** Temporal coherence in stylised animation (Bénard, Thollot, Collomosse, CGF 2011, cited from
  memory); temporal anti-aliasing practice; on-tile MSAA resolve (Arm, "Mali performance 2", developer
  blog); blue-noise dithering (Gjøl and Svendsen, GDC 2016, from memory, **UNVERIFIED**).
- **Ours.** —
- **Defaults.** Context MSAA on; TAA off; dither on.
- **Fails → fallback.** Lower internal resolution (L56) rather than fewer samples (a context's sample count
  is fixed when it is created).
- **Gate.** Edge-crawl and flicker metrics (mean absolute frame difference after motion compensation) on a
  slow head-turn clip ≤ 1.5× the plain shaded render; no visible banding on the deep-skin, high-key cell
  (owner's check on the spike clip).
- **Status.** *To build*.

#### L56 Render graph
- **Purpose.** Do all of the above within the frame budget of an integrated GPU, which is limited by
  memory bandwidth, with one back end that the build worker can also run.
- **In → Out.** Deformed meshes → shadow pass → one forward pass straight into the canvas (MSAA by the
  context, premultiplied alpha) → the browser's compositor.
- **Method.** three.js (r187, already a client dependency) on **WebGL2 only**: the band shading through
  `ShaderMaterial` or `onBeforeCompile`; pass 1 the shadow map (L53); pass 2 forward shading of body,
  garments, hair and eyes with the distance-field lines and dither inside it, then the hand and forearm hull
  (L54), rendered into the **default framebuffer** of a canvas created with `antialias: true`, `alpha: true`
  and `premultipliedAlpha: true`. There is no offscreen MSAA target, no blit, no id target, no line pass and
  no composite pass. No G-buffer, no half-resolution filter pass, no velocity target, no WebGPU path (two
  back ends would double the shader and test work for a small team; WebGPU returns only if S14 fails).
  **Render scale**: the canvas's width and height are the internal resolution, capped at 720 physical pixels
  tall whatever the device pixel ratio (a "720p panel" at DPR 2 is 4× the fragments and MSAA memory), and CSS
  upscales it; CSS bilinear upscaling softens lines by about 2 device pixels at DPR 2, so line widths are set
  with the upscale in mind, and text-like UI is never drawn into this canvas (the label stays DOM, L57).
  **Cadence**: frames are rendered at a fixed 30 Hz decimated from `requestAnimationFrame` (every second
  frame at 60 Hz, by an accumulator at other refresh rates); lips stay on the audio clock (L89), battery use
  halves, and the lesson page's own animations get the GPU in the free frames. The **same player** renders
  the build's gate frames headless on the worker (L91), adding in gate renders only a non-multisampled
  region-id pass to an integer target (allowed without MSAA) for the geometry-buffer lip gates (S3, S4).
- **Research.** Skinned Gaussian avatars on the web run 40–50 fps on a phone and 240 fps on a laptop GPU
  (2510.13978), which bounds what a mesh pipeline should reach; Arm and Collabora on tile-memory resolves.
- **Ours.** —
- **Defaults.** 720p panel; DPR cap as above; 30 Hz.
- **Fails → fallback.** Drop work by tier (L89).
- **Gate.** S14, measured with a lesson animation running behind the panel.
- **Status.** *Partial*: three.js lab players with a frame-exact `renderAt(t)` in
  `scripts/teacher/maker/player/`.

#### L57 Compositing, transparency, the AI label and the provenance cue
- **Purpose.** The person only, over the lesson, always labelled, and the student always knows *whose words*
  they are hearing.
- **In → Out.** Frame, the clause's provenance (L86) → premultiplied RGBA in the panel, a visible
  "AI-generated" badge, and a quiet provenance cue.
- **Method.** Alpha from MSAA coverage, written premultiplied into a premultiplied canvas, so the browser's
  compositor never bleeds the lesson background into hair edges as dark fringes; a soft edge of 1 px. The
  label is part of the panel UI (DOM) and cannot be hidden by the page. **Provenance cue**: a generic label does not stop students
  believing *their teacher* said what Guru said (in a 2026 survey nearly half of 170 CS students could not
  tell that videos were AI-made, 2607.28203), so each utterance carries one of two quiet cues, both true: "Lesson approved by [name] · AI voice"
  (narration synthesised from text the teacher approved at publish time; "recorded lesson" would be false,
  since nothing was recorded) or "AI answer, not checked by [name]" (a live reply). The audio carries
  AudioSeal (L63) and every generated clip is in the server's generation log (L63). Release 1 plays only on
  our own pages; when clips or lesson videos can be exported (*later*), each carries the label burned in and a
  signed C2PA manifest with a unique identifier, since the 2026 IT Rules amendment asks for provenance
  metadata where technically feasible (secondary sources; exact clause **UNVERIFIED**). An invisible frame watermark that survives re-encoding is
  a research project and is *later*.
- **Research.** Students and AI-made instructional video (2607.28203, 2602.18457); audio-visual
  watermarking (LAVA 2604.23957; cross-modal 2507.12723, ideas).
- **Ours.** Label and per-utterance provenance enforced in the player component.
- **Defaults.** Badge always on; cue on every utterance.
- **Fails → fallback.** Our player does not render without the label component. This is a **site
  guarantee**, not a technical lock: a patched client can remove a DOM label, which is one reason exports
  carry it burned in (*later*).
- **Gate.** (P) 100% of rendered frames carry the label; S20; no dark fringe on hair over a white lesson
  background.
- **Status.** *To build* (transparent output exists in `perform.py`).

---

### Stage G: Voice (L58–L63)

Voice runs on the server: lesson narration once at publish time, live replies on demand (§7.4). Each audio
chunk is shipped to the browser with its aligned phones, prosody and the 52 mouth values of Stage H.

#### L58 Text normalisation and language routing
- **Purpose.** Turn Guru's text (English, Hindi in Devanagari, Hinglish in Latin script, code, maths) into
  speakable words in the right language per span.
- **In → Out.** Text → clauses of spans `{lang, script, words}`.
- **Method.** Rules for numbers, units, symbols and code identifiers (spoken as the lesson speaks them:
  `arr[i]` → "arr of i"); script detection per token; Hinglish tokens in Latin script are tagged by a
  small language-ID classifier and transliterated to Devanagari when Hindi. Inside Hindi-dominant clauses,
  English loanwords are respelled in Devanagari (the Indian-English phonology Hinglish speakers use), so a
  whole clause is synthesised in one call (L60) instead of being stitched from language spans. Respellings
  come from a **curated lexicon** of the lesson vocabulary, one fixed Devanagari spelling and one IPA path per
  term (पॉइंटर, ऐरे …), inserted into L59's lattice as a fixed arc, so a term sounds the same in every
  lesson; ad hoc respellings would vary from run to run.
  **Accommodation**: she mirrors the student's code-mixing ratio and script, measured over the last three
  turns (Latin-script Hinglish typed means Hinglish spoken); technical terms stay in English (`array`,
  `pointer`, `mid`) even inside Hindi sentences, as Indian CS teachers do, and Hindi carries rapport and
  encouragement. The target code-mixing index goes into Guru's prompt (L86) and a validator checks each
  clause's index within ±0.15 of the target.
- **Research.** Code-mixed TTS (2409.10969, 2412.19043); script-first multilingual TTS (2510.25178);
  Hindi–English code-switching corpus (1810.00662); code-mixing index (2410.11079); classroom code-switching
  in India does teaching and rapport work (Pallavi 2016, *J. Indian Education* 42(1); Adinolfi, Open
  University, on low-cost English-medium schools).
- **Ours.** Code- and maths-aware normalisation from our lesson vocabulary.
- **Defaults.** English unless a span is classified Hindi with p ≥ 0.7; a clause's language is its
  dominant span language.
- **Fails → fallback.** English pronunciation.
- **Gate.** (B) Round trip: phone error rate of the synthesised Hinglish set through L61's lattice ≤ 15%
  (a script-free measure; CER would score script and transliteration choice as much as speech); every
  lexicon term realised on its fixed arc; "she spoke the way I speak" is measured in the study (§8.4).
- **Status.** *To build* (voice rules in `docs/voice/` apply).

#### L59 Grapheme to phoneme: a pronunciation lattice
- **Purpose.** Every language becomes the same sound alphabet, which drives the lips (contradiction C5),
  with the alternatives a real voice may choose.
- **In → Out.** Words per language → a lattice of IPA phone paths with stress and syllables.
- **Method.** English: a pronunciation dictionary with a neural fallback for unknown words. Hindi: the
  script is nearly phonemic except **schwa deletion**, handled by a classifier on the orthography; nasal
  vowels and anusvara resolved by the following consonant's place. Other Indian languages: rule tables per
  script. The lattice adds the alternatives a zero-shot voice may realise: optional schwa, [ʋ]/[w]/[v],
  Indian-English retroflex t/d, nasal vowel vs. nasal + stop for anusvara. L61 picks the path from the audio.
- **Research.** Hindi and Punjabi schwa deletion (2004.10353); multilingual G2P (2204.03067, 1708.01464);
  IPA-based cross-lingual alignment (2311.08323); speaker and regional variation in Indian English (Indic
  TIMIT, 2204.06502).
- **Ours.** Anusvara and nasal rules that also feed the lips (no closure unless a labial follows); the
  lattice as the lips' input instead of one predicted string.
- **Defaults.** ≤ 4 alternatives per word.
- **Fails → fallback.** Letter-to-sound rules, single path.
- **Gate.** Phone error rate of the best lattice path ≤ 5% on a 500-word Hindi and a 500-word English list.
- **Status.** *Partial*: the voice server returns phones for English; Hindi G2P and lattice *to build*.

#### L60 Cloned voice synthesis
- **Purpose.** Their voice, any sentence, any supported language.
- **In → Out.** Clauses + the person's per-language reference (L15) and optional adapter → 24 kHz audio per
  clause.
- **Method.** Zero-shot cloning with Chatterbox Multilingual, pinned to the **V3** multilingual model the
  README names as current (`t3_model="v3"`; V2 is legacy; MIT), with the README's Hindi "Single Language
  Pack" fine-tune for Hindi clauses once its own model card's licence is read (**UNVERIFIED**); exact
  checkpoints and hashes are pinned in L3. The
  project is archived ("retired research, no longer maintained", README, August 2026), so the weights and
  code are vendored and pinned by hash (L3), and a maintained second engine sits behind the same slot
  interface (CosyVoice, once its checkpoint licence is confirmed). One clause per call (no stitched
  Hinglish: pitch and energy reset at joins); reference in the clause's language, and with only a
  cross-language reference, the reference-adherence weight (`cfg_weight`) set to 0 as the README advises.
  Arousal (L68) maps to the model's `exaggeration` (0.3–0.7), paired with a lower `cfg_weight` because
  exaggeration speeds speech. **Inter-clause consistency**: each clause is an independent autoregressive
  sample, so timbre, loudness, rate and pitch can drift between clauses. The engine has no pitch or speed
  control (the README documents only `cfg_weight` and `exaggeration`), so v4's "carry the previous clause's
  pitch register" is dropped. Instead the speaker conditioning (embedding and prompt tokens) is computed
  **once per person × language**, cached and reused for every clause (the vendored code's conditioning step
  allows it, **UNVERIFIED** until the pinned code is read); a clause is never conditioned on the previous
  clause's output (that drifts); then bounded corrections in our own code: clause median F0 shifted by
  ≤ 1 semitone (PSOLA), rate by ≤ ±10% (WSOLA), loudness to −23 LUFS; a clause outside those bounds is
  re-synthesised. **Content check and best-of-N**: open autoregressive TTS fails at random (silence, early
  stop, repeats, babble), and L61 would otherwise force-align the expected phones over garbage so that the
  lips confidently mouth words never said. Every clause gets an ASR round trip, and L61's lattice has skip and
  garbage arcs with a per-phone posterior floor. **Narration** (offline): N = 4 candidates per clause, ranked
  by two model families, the L61 wav2vec2 aligner score and a different-family recogniser (Qwen3-ASR, L83) on
  CER and closure-interval agreement; the gate below uses a family the selector did not (selector and
  evaluator from one ASR family inflate apparent gains, 2607.08256), and ECAPA never selects (D6). Best-of-N
  self-verification drives catastrophic failures near zero by N = 2–4 across open codec TTS systems
  (2606.18323). **Live**: N = 1, one re-synthesis on failure, else captions. The known early-stop bug
  (resemble-ai/chatterbox issue #519) is caught by the same check. **Watermarks**: the README says every
  generated file carries Resemble's Perth mark; we vendor the code and keep exactly one mark, L63's, so Perth
  is removed in our copy (two marks risk each other's detection and the ABX). Optional per-person adapter from 30–60 min of
  their reading, trained after the build (not in the 4-minute budget).
- **Research.** Chatterbox README and Hindi model card; zero-shot multilingual TTS: CosyVoice (2407.05407),
  cross-lingual cloning (2608.11650), compact TTS (2610.14776), mobile zero-shot TTS (2402.09378), StyleTTS
  2 (2306.07691); Indian-language TTS (2211.09536, 2507.15272, 2505.18609); voice cloning survey (2505.00579).
- **Ours.** Per-language references and clause-level synthesis for code-mixed speech.
- **Defaults.** Reference 20 s; first clause ≤ 12 words. First-chunk latency is **UNVERIFIED** and must be
  measured: the one-step-decoder Turbo model is English-only, and the multilingual model keeps a multi-step
  decoder, so Hindi first audio is slower.
- **Fails → fallback.** **Never another voice in her mouth**: a face–voice mismatch is eerie (Mitchell et
  al. 2011, *i-Perception* 2(1)), and two voices on one face in one reply is worse. Without the cloned voice
  she shows listening and thinking cues and the answer appears as captioned text, with bank phrases only if
  the whole reply is text; or a clearly different, labelled presenter (Kokoro via HeadTTS) answers in its own
  panel (D5).
- **Gate.** (B) Speaker similarity (ECAPA-TDNN cosine, check-only, 2005.07143) between synthesis and held-out
  real speech ≥ 0.75 × the real-vs-real ceiling; intelligibility by ASR round trip with a family the selector
  did not use (WER ≤ 8% English, CER ≤ 12% Hindi); **clause-to-clause consistency**: each clause's median F0,
  F0 range and rate inside the person's own clause-to-clause distribution from their reading (central 95%),
  loudness jump ≤ 2 LU, with a **sanity arm**: the same test run on the person's *real* reading passes
  ≥ 95% of joins (a gate the real teacher fails measures the wrong thing; v4's "< 2 semitones at joins"
  failed normal declination resets); 0 truncated or babbled clauses in published narration (Z); S22 (voice
  likeness and MOS, with named raters and catch trials).
- **Status.** *Partial*: HeadTTS fixed voices in the Studio player (`player.ts`) and in `perform.py`
  (salvage); cloning *to build* on the GPU worker.

#### L61 Spoken-phone alignment and prosody
- **Purpose.** The exact phones the voice *actually spoke*, with their times, plus stress, pitch and
  pauses — the clock and the content of the lips. The audio is the single truth.
- **In → Out.** Audio + the L59 lattice → `[(ipa, t0, t1)]` on the chosen path; per-syllable pitch (z-scored
  to the speaker), energy, duration, stress flag, phrase boundaries, pause lengths.
- **Method.** A CTC phone recogniser over IPA scores every lattice path, which includes skip and garbage
  arcs so that a repeated or babbled span is labelled as such instead of absorbing the text's phones (L60);
  Viterbi picks the path and the boundaries; the chosen path, not the G2P string, drives L64–L66. It runs on every clause (Chatterbox
  exposes no durations), on streaming chunks. CTC posteriors are peaky (they spike rather than span a
  segment; Zeyer, Schlüter and Ney, 2105.14849) and wav2vec2 frames are 20 ms, so the lattice decides
  *which* phone occurred, and for must-hit events the **interval comes from acoustics**: the stop gap or
  the nasal murmur (energy and spectrum) found inside the CTC-chosen phone's window, never uniform
  durations. Chatterbox's multilingual model already computes a text-to-speech-token attention alignment
  for stopping (`AlignmentStreamAnalyzer`); whether it is a usable free prior for the live path is
  **UNVERIFIED** and worth a test. The same
  10 ms pass computes F0 and energy; stress = local maxima of a weighted sum of pitch excursion, energy and
  duration; phrase ends at pauses > 180 ms or falling pitch. **Recogniser, shipped now** (no recogniser of
  our own on the critical path): `facebook/wav2vec2-lv-60-espeak-cv-ft`, tagged Apache-2.0 on its model card,
  pre-trained on Libri-Light (English audiobooks; that data's licence **UNVERIFIED**, checked in L3) rather
  than XLSR-53, so BABEL is not in its pre-training, and fine-tuned on Common Voice with espeak phones. Its
  accuracy on Hindi phones is zero-shot and **UNVERIFIED**, but forced alignment over a constrained lattice
  needs far less accuracy than free recognition. **For pre-rendered narration**: the Montreal Forced Aligner
  (MIT) already compiles several pronunciations per word with probabilities into a weighted FST — that is
  this layer's lattice with path choice — with acoustic models we train ourselves on Common Voice (CC0),
  since the licences of its pretrained models are **UNVERIFIED**. For the first milestone (§8.6) the default
  voice's exact phone durations (HeadTTS/Kokoro, already received by `perform.py`) drive the lips and no
  aligner is needed.
- **Research.** IPA-based forced alignment in any language (2311.08323); neural forced alignment
  (2606.25460, 2406.19363); alignment evaluation (2608.28508); prosody for gesture and head motion
  (2210.14800, SemTalk 2412.16563); zero-shot phone recognition (2109.11680) and Allophant (2306.04306) as
  comparisons only; Montreal Forced Aligner documentation (`dictionary.rst`, licence MIT, read by the build
  reviewer).
- **Ours.** Lattice alignment of synthetic speech so the mouth shows what was said, not what was predicted.
- **Defaults.** 10 ms frames; stress threshold z ≥ 1.0.
- **Fails → fallback.** Acoustic closure detection for must-hit events; lexical stress from G2P.
- **Gate.** On a hand-labelled 200-phone set per language: phone identity on the chosen path ≥ 95% for
  must-hit classes; closure-interval overlap (IoU) with the hand labels ≥ 0.7 for p/b/m and f/v; median
  boundary error of other phones reported; logged rate of must-hit events where lattice choice and
  acoustics disagree; stress agreement with a hand-labelled set ≥ 80%.
- **Status.** *Partial*: HeadTTS gives timings; `lipsync/prosody.py` computes prosody; lattice aligner on
  the shipped recogniser and MFA models *to build*.

#### L62 Personal phrase bank
- **Purpose.** Backchannels and latency fillers need about zero synthesis latency (Live release only;
  narrated lessons need no bank).
- **In → Out.** The person's voice reference → 30–60 short items in their cloned voice, each in 2–3 prosodic
  variants (haan, achha, hmm, theek hai, dekho, ek second, bolo, sahi, "let's see", "good question", safe
  canned hints for L86), with aligned phones, prosody and precomputed mouth and head motion; each item
  tagged **agreeing** (haan, sahi, "good question") or **neutral** (achha said level, hmm, dekho, ek second,
  bolo).
- **Method.** Synthesised through L60–L67 **after the model is signed** (the cloned multilingual model is
  autoregressive; at about 1 s per clip, run one after another, 80 clips take about 80 s, **UNVERIFIED**), so
  it never holds up S13; the bank streams to the browser when ready, and until then backchannels are visual
  only. Items chosen at run time by L85 and L88 by context and variant rotation (no repeat within 30 s).
  **Before a verdict**, after a student's answer, only neutral items may play, and only those S12's
  perceptual test found neutral (a "haan" or "sahi" before the grader is exactly the agreement S12
  forbids); fillers are capped at 2 per minute, so "achha" does not open every reply. **Motion as
  deltas**: head and brow tracks are stored relative to the clip's first frame and added to the live pose
  (an absolute baked track would pop); the mouth track is stored as targets that enter L65's receding
  horizon, so a bank item cannot break closures or continuity.
- **Research.** Latency hiding in streaming digital-human agents (2608.24909).
- **Ours.** A per-person bank in the cloned voice, with its motion baked.
- **Defaults.** 40 items × 2 variants; ≤ 2 MB, streamed after the model.
- **Fails → fallback.** Visual-only backchannels.
- **Gate.** Every item passes L60's speaker and intelligibility gates and S3–S4; no agreeing item plays
  before a verdict in the S12 control set.
- **Status.** *To build*.

#### L63 Audio watermark and provenance
- **Purpose.** Every cloned sentence is labelled, marked and on record with us, so a clip can be traced to
  its model and consent, and "did NexoraGuru make this?" can be answered even when the mark is gone. It
  does **not** prove a clip synthetic against a determined attacker.
- **In → Out.** Audio → watermarked audio; a registry entry; a detector and a lookup.
- **Method.** (1) **Cooperative mark**: AudioSeal (code and weights MIT, per its README since April 2024),
  localised, carrying a 16-bit model id, so clips cut from lessons are still detectable. Its generator and
  detector are public, so an adaptive attacker can remove the mark (no surveyed audio scheme withstands all
  removal attacks: SoK 2503.19176, AudioMarkBench 2406.06979, HarmonicAttack 2511.21577), and anyone can
  *write* a teacher's id into a fake; the mark is therefore "detectable unless deliberately removed" and is
  never taken as proof on its own. Ids are never reused (L3). The TTS's own Perth mark is removed in our vendored copy
  (L60), so there is one mark. AudioMarkBench (2406.06979) reports that Opus re-encoding removes AudioSeal's
  mark at good quality, so the mark is **reported, not a publish gate**: "no publish" on a ≥ 99%-after-Opus
  target would block release 1 for a property no surveyed scheme has. (2) **Generation log (release 1)**:
  every clip we synthesise is logged on the server with model id, consent id, time and a hash of its text; it
  holds no audio. **Generation registry (*later*, with exports)**: a robust fingerprint of every clip we synthesise (a spectral-peak hash, our own code, so the
  LGPL Chromaprint is avoided) is stored with model id, time and consent id; only our server can write it,
  so a "did NexoraGuru make this?" lookup works after the mark is stripped and a forged id cannot frame a
  teacher (the retrieval defence of Krishna et al., 2303.13408, applied to audio). (3) **Signed manifest** (*later*, with exports):
  every exported clip and lesson video carries a C2PA manifest (`c2pa-rs`, licence **UNVERIFIED**, checked
  in L3 before then). (4) A public **"report a fake of me"** path runs the registry lookup and
  starts takedown within the 2026 IT Rules' shortened clock (exact hours **UNVERIFIED**). (5) *Later,
  untested*: a **face-shape watermark**, a per-model 12–16-bit code added to head-prior coefficients
  orthogonal to the person's whitened deviation (so L24's identity cosine is unchanged by construction), at
  ≤ 0.2 of L0's perceptual radius $r$; read back from suspect footage by fitting the template (L7 → L34),
  projecting onto the code directions and correlating with the registry; it should survive re-encoding,
  rescaling and screen recording because it is geometry; adopted only if S2 is unchanged and an ABX on
  renders is at chance (mesh watermarking exists for 3D files; read back from video and bounded by a
  perceptual radius, novelty **UNVERIFIED**).
- **Research.** AudioSeal localised watermarking (2401.17264); timbre watermarking (2312.03410); robustness
  across codecs (2611.04716); removal attacks (2503.19176, 2406.06979, 2511.21577); retrieval-based
  detection (2303.13408); IT Rules amendment 2026 (secondary sources).
- **Ours.** Model id in the mark tied to its consent record, plus a server-only generation log (and, *later*, a registry) that
  survives mark removal; the face-shape watermark (*later*).
- **Defaults.** Imperceptible setting; detection on 1 s windows; registry lookup on 3 s or more of audio.
- **Fails → fallback.** Without the log entry, no publish (S17); a weak mark is reported.
- **Gate.** (P) Every generated clip in the log (S17); no audible artefacts: ABX proportion correct within
  0.5 ± 0.1 (E, ≥ 200 trials); mark detection after MP3 and Opus at 32 kbps **reported**. *Later*, with
  exports: registry lookup finds ≥ 95% of our clips after re-encoding, pitch shift ±1 semitone and mark
  removal, at ≤ 1% false matches on other speech (B), and every exported clip has a valid manifest.
- **Status.** *To build*.

---

### Stage H: Lips, face performance and attention (L64–L72)

Stage H's mouth path (L64–L67) runs on the server next to the voice and ships 52 values plus must-hit events
with each audio chunk; the browser only mixes and holds closures (L82, L89). Lips, jaw and tongue are solved
as one trajectory (L65), so tongue and lips agree at every closure. The face layers L68–L71 and the
attention layer L72 run in the browser worker.

#### L64 Phones to visemes
- **Purpose.** One articulation table for every language, covering every phone our G2P and aligner emit.
- **In → Out.** IPA phone (as realised, L61), with its syllable stress → viseme class and mouth targets on
  the 52 values, and a lip dominance for L65.
- **Method.** Every phone is NFD-normalised first (precomposed nasal vowels such as `ã` keep their base
  vowel) and U+0261 `ɡ`, the IPA g that espeak-ng and most IPA G2Ps emit, is treated as `g`. Classes by
  articulation: PBM (lips closed), FV (lower lip to upper teeth), TH, TD (dental, alveolar, palatal and
  retroflex stops and approximants share it — `c ɟ ɲ ʈ ɖ ɳ ʂ ɻ` included; the difference is barely visible
  from outside and lives in the tongue, L65), SH (lips forward), KG (low lip dominance, so /k g/ take the
  neighbouring vowel's rounding), EE, AA, a reduced **SCHWA** class for `ə ɐ ʌ` and other central vowels
  (about half as open as /a/), OH, OO, W, a **NEUTRAL** class for `h ɦ ʔ` (no oral target, dominance ≈ 0,
  so they take their neighbours' shape), and silence. Vowel openness is scaled by L61's syllable stress
  (z-score) and loudness, so unstressed syllables do not open as wide as stressed /aː/, as in JALI.
  **Diphthongs** (`aɪ aʊ eɪ ɔɪ` and Hindi equivalents) become two targets at the 30% and 70% points, so the
  glide shows. Aspirated stops get a longer release; [ʋ] maps to FV only when realised with lip–teeth
  contact (L61), otherwise to W. An unknown phone falls back to the nearest class by articulatory features
  from our own small feature table (place, manner, rounding, height, backness), never to silence; every
  fallback mapping is listed in the build report.
- **Research.** Viseme classes (Fisher 1968); VisemeNet (1805.09488); viseme dynamics (2301.06059);
  multilingual lip-sync data (2406.14272); JALI (Edwards et al. 2016); PanPhon feature vectors as an idea
  source (its licence **UNVERIFIED**; L3 before any of its data is used).
- **Ours.** A single table for all languages with Hindi, Tamil and palatal additions, gated on the phones
  our own pipeline actually emits.
- **Defaults.** As in `phonemes.py`, with RETRO merged into TD.
- **Fails → fallback.** Unknown phone → nearest class by articulatory features.
- **Gate.** For each launch language (en-IN, hi, and whatever L58 routes), the phone inventory that the
  shipped aligner (L61) and the narration G2P actually emit on a 2,000-sentence corpus: zero phones map to
  silence, and every fallback is listed (the hand-picked sample of `test_every_language_sound_has_a_mouth`
  stays as a unit test only, since it passed while real phones were silent).
- **Status.** *Partial*. **Which mouth path**: the Studio player's lips come from
  `client/src/pratibimb/engine/lipsync.ts` (curves when given, else Oculus viseme classes from HeadTTS timing,
  with closures enforced on PP and lip-to-teeth on FF); `scripts/pratibimb/engine/phonemes.py` is imported
  only by `engine/perform.py` and its test. §8.6 step 0 moves the table into one data file read by both, so
  `lipsync.ts` plays it now and the server's L65 solve reads the same table later. The table itself is
  `phonemes.py`'s, with the bugs found in round 3 fixed in commit 5fa24edb (`ɡ`, NFD nasal vowels, `ɲ ʂ ɻ c ɟ` no longer silent; schwa class half as open as /a/;
  `h ɦ ʔ` neutral; closures no longer force the jaw to 0, a jaw floor of 0.06 until L65's vector solve
  exists); diphthong split, stress scaling, the feature fallback, conditional [ʋ], KG lip dominance, the
  RETRO merge and the inventory gate *to build*.

#### L65 Coarticulation as a constrained trajectory (lips, jaw and tongue)
- **Purpose.** Each sound's mouth shape blends with its neighbours, as in real speech; the closures viewers
  watch most can never be missed or kinked; the jaw never chatters; tongue and teeth agree with the lips.
- **In → Out.** Viseme timeline (with must-hit intervals), tongue keys, the person's rig → smooth
  trajectories of the mouth values that share the mouth geometry, the tongue pose weights and a teeth-show
  weight, streamed per chunk.
- **Method.** One **vector** banded quadratic programme per frame window over the coupled mouth values
  (jawOpen, mouthClose, lip rolls and presses, lowerDown/upperUp, funnel, pucker) plus the tongue weights:
  minimise $\sum_t \sum_i w_i(t)\,\lVert x_t - T_i\rVert^2_{Q} + \lambda \sum_t \lVert\Delta^3 x_t\rVert^2$.
  **Must-hit conditions are written on lip geometry, not on single values**: at PBM frames the inner-lip
  aperture $a(x) = A x + a_0 = 0$ at three points across the mouth width (centre and both thirds), and at FV
  frames lower-lip-to-upper-teeth distance = 0, held for at least max(acoustic closure, 1.5 frames). $A$ is
  linearised once per person from the rig (L35) by finite differences on the inner-lip vertices. The jaw is
  therefore free: real bilabials close by raising the lower lip while the jaw keeps its vowel context
  (DYNARTmo, 2511.22155; JALI keeps jaw and lips independent), so "aam", "ambar" or "number" do not chatter
  the jaw shut at every /m/. Bounds come from the person's range (L66). Lip rounding has a low weight over a
  wide window (anticipatory rounding before /u/); dominance functions (Cohen and Massaro 1993) give the
  weights $w_i$, with NEUTRAL and KG lips near zero. **Tongue rows** (v3's separate tongue layer, merged
  here): tongue poses keyed by class (TD → tip up, retroflex phones → tip curled inside the mouth, TH →
  between teeth, KG → back up, Tamil ɻ → curl) are extra rows of the same programme; teeth-show is a smooth
  function of the solved aperture and FV/EE, so teeth can never show with closed lips. **Receding horizon**
  across clauses and chunks: each solve fixes the last 3 frames already sent (value, Δ, Δ²) as equality
  constraints and re-solves only frames not yet sent, so two solves never meet with a velocity jump.
  **Personal coarticulation (untested):** per viseme class four parameters (target scale, spread window,
  closure hold, lead) are fitted to the person's capture speech by minimising the replay error of L67; 12 × 4
  numbers ship in the model, and because they sit on articulatory classes, they carry to languages the
  person never recorded.
- **Research.** Cohen and Massaro (1993); quantitative coarticulation from articulatory models
  (2408.05641); lips–jaw trade-off in bilabial stops (DYNARTmo 2511.22155, 2507.20343); JALI (Edwards et
  al. 2016); a geometric coarticulation measure (2610.03436); visible articulation directions (2609.30517);
  audio-visual asynchrony in natural speech varies by sound (Schwartz and Savariaux 2014, PLoS Comput Biol).
- **Ours.** Hard must-hit constraints on lip aperture with a free jaw and smooth approaches, tongue in the
  same solve, receding horizon for streaming; personal class parameters fitted from a short capture and
  transferred through IPA (novelty **UNVERIFIED**).
- **Defaults.** Lead per class (not one constant; start at 40 ms, fitted per person); λ from a validation
  sweep; ≈ 12 variables per frame, still banded, solve < 1 ms per clause on the server.
- **Fails → fallback.** Per-phone targets with attack/release smoothing and closure enforcement (exists).
- **Gate.** S3 and S4 on the mesh in numpy (inner-lip aperture ≤ 0.5 mm at every PBM frame, checked first on
  a known-closed pose so the threshold measures the mouth; the milestone's check) and, for release 1, in the
  geometry buffer; mutants: one closure frame short, aperture 0.65 mm;
  S3's jaw-chatter measure; at every clause and chunk join, $|\Delta^3 x|$ within the 99th percentile of
  in-clause frames; tongue visible on 100% of θ/ð and ≥ 80% of l in close-up; teeth never visible with
  closed lips; coarticulation path ratio (2610.03436) within the range of the person's real speech.
- **Status.** *Partial*: smoothing and lip check in `phonemes.py` (`lip_check` still tests jawOpen; to be
  changed to aperture); vector QP, tongue rows, receding horizon and personal parameters *to build*.

#### L66 Jaw–lip split and personal mouth range
- **Purpose.** Loud speech opens the jaw, not the lips; each person's mouth opens to their own extent.
- **In → Out.** Trajectories + loudness + motion profile → jawOpen and lip values separately, scaled.
- **Method.** Two independent controls per frame as in JALI: jaw $j(t)$ scales with the vowel's openness
  and the syllable's loudness; lip intensity $l(t)$ with articulation clarity. Then scale each class by
  the person's measured range (L16): $x \leftarrow x \cdot r_{class}^{person}/r_{class}^{pop}$. These
  ranges are the bounds of L65's programme; because L65's closures are constraints on lip aperture, the
  loudness-raised jaw and a bilabial closure never fight.
- **Research.** JALI (Edwards et al. 2016); speech–lip intensity correlation (SLCC in 2503.20308).
- **Ours.** Per-class personal range from their own speech.
- **Defaults.** Jaw gain 0.6–1.2 with loudness.
- **Fails → fallback.** Population range.
- **Gate.** S6; SLCC on held-out speech ≥ the value of the person's own video (2503.20308 metric).
- **Status.** *To build* (global gains exist in the lip-sync slot).

#### L67 Learned lip refiner and the replay gate
- **Purpose.** Rules get the important events right; a learned model adds the natural in-between motion;
  a replay of the person's own speech proves the whole mouth path.
- **In → Out.** Audio (16 kHz) + constrained trajectories → refined 52 values at 30 fps (on the server, sent
  with each audio chunk); a replay report.
- **Method.** An audio-to-expression network (default: wav2arkit, Apache-2.0; our fine-tune on consented
  Hindi/English video is *later*, since no such video exists yet) predicts values; fusion by a per-value weight (rules dominate closure and
  contact values, the network dominates cheeks, mouth corners and press); must-hit constraints are re-applied
  after fusion by re-solving L65 with the fused values as targets. The network runs on **overlapping
  windows** (≥ 200 ms of left context) and the overlaps are cross-faded, so its output has no step where an
  audio chunk was cut. The network was not trained on cloned-voice Hindi audio (its training data is
  **UNVERIFIED** to us), so fusion weights are fitted **per language** on the replay gate, and "rules only"
  is a valid result. **Replay gate**: each bench person's own 5-minute reading (L0) is fed through L61–L67
  and compared frame by frame with the same video. The primary measure is **geometric**, normalised by mouth
  width: inner-lip aperture, mouth width and a lip-protrusion proxy (depth of the lip-centre points), from
  the 478 landmarks on the video and from the same 478 correspondence vertices (`corr.json`) on the model's
  mesh, since MediaPipe's mouthClose, funnel and pucker coefficients are coarse and calibrated per person
  (L8), so a coefficient match can partly measure the tracker's bias. Correlation with the 52 tracked values
  and a histogram of closure-onset offsets are secondary. The Fréchet Oral Distance (2611.01705) may be
  reported as a secondary rank check (its reference set is English-only and its licence **UNVERIFIED**;
  evaluation only).
- **Research.** FaceFormer (2112.05329); SAiD blendshape diffusion (2401.08655); ARTalk (2502.20323);
  personalised causal motion (2604.23692); multilingual 3D talking heads (2406.14272).
- **Ours.** Rule–network fusion with constraints re-solved; a per-person, language-independent replay gate.
- **Defaults.** Fusion weights per value and per language from the replay gate.
- **Fails → fallback.** Rules only.
- **Gate.** S3–S6 still hold after fusion; PLRS (2503.20308) ≥ rules-only; replay geometric error ≤
  rules-only; no output discontinuity at chunk joins (L65's join test).
- **Status.** *Partial*: wav2arkit slot in `slots.json`, `lipsync/wav2arkit-run.mjs`; fusion and replay
  *to build*.

#### L68 Emotion layer (face and body)
- **Purpose.** Readable emotions that match what she says, in the face and in how she moves.
- **In → Out.** Script tags `{valence, arousal}` + discrete cue (pleased, curious, empathetic, encouraging,
  thinking, surprised) → expression offsets on non-mouth values; body scalars (gesture tempo, amplitude,
  frequency, expansiveness, head height); voice style hints (L60).
- **Method.** Each discrete cue is a small set of action units (e.g., pleased = cheekSquint + mouthSmile
  at 0.3–0.6; empathetic = browInnerUp 0.4 + a soft smile 0.2; encouraging = mouthSmile 0.3 + a slight
  forward lean). *Empathetic* is used only on empathy clauses in her own speech ("this part is hard"), never
  as a reaction to the student; *encouraging* is the face for errors and confusion (L85). Intensity stays
  moderate in content clauses; peaks (surprise, delight) are kept for "aha" moments. Learners do better with
  instructors who show positive emotion, an effect seen on a delayed test (Lawson, Mayer et al. 2021, *ETR&D*,
  doi 10.1007/s11423-021-10057-w). Continuous valence/arousal interpolate between
  them; mouth values from the cue are limited during speech so lip sync wins (mixer, L82). Arousal scales
  gesture velocity, amplitude and frequency (L78); valence scales expansiveness (open vs. closed postures,
  head up vs. down, L80); both are multiplied with the personal style scalars (L82).
- **Research.** Continuous valence–arousal control (CETalk 2608.15110); AU-controlled emotional heads
  (2602.09534); the positivity principle for instructors (Lawson et al. 2021); verbal–nonverbal mismatch for
  training agents (2608.22731); LLM interpretation of
  valence–arousal (2502.06875); Laban Effort mappings for agents (EMOTE, Chi et al. 2000; citation details
  **UNVERIFIED**).
- **Ours.** Emotion intensity scaled by the person's own expressiveness (smile and brow share from L16).
- **Defaults.** Emotion decay 1.5 s unless refreshed.
- **Fails → fallback.** Neutral-pleasant.
- **Gate.** (B, E; catch trials) Observers recognise the cues from silent clips ≥ 65% (lower bound ≥ 55%),
  scored on five classes with *empathetic* and *encouraging* merged as "warm" (they differ by less than their
  own variation, and both are used only in warm moments; chance 20%), and "warm" confused with a negative cue
  at most at chance + 0.05 (E); with the face and with the face blurred (body only) reported separately. The
  two cues stay separate in use.
- **Status.** *To build*; **later** for the full layer: release 1 narration uses only neutral and warm, from
  L80's rest expression and the narration arousal mapped to the voice (L60).

#### L69 Blinks, brows and micro-motion
- **Purpose.** The face is never frozen.
- **In → Out.** Time, prosody, gaze shifts → eyeBlink values, brow raises, small mouth-corner motion.
- **Method.** Blinks as a renewal process with the person's rate and duration (L16), plus blinks at phrase
  ends and with large gaze shifts; brows raise on stressed syllables with probability tied to pitch
  excursion; 1/f noise on brows and mouth corners at ≤ 0.03.
- **Research.** Blink statistics (Bentivoglio et al. 1997); upper-face motion from speech (2110.04527).
- **Ours.** Person's own blink rate and brow habits.
- **Defaults.** Population 17 blinks/min if unmeasured.
- **Fails → fallback.** Population.
- **Gate.** Blinks per minute within ±20% of the person's own (from L16).
- **Status.** *Partial*: blinks, small eye darts and idle life in the Studio player (`player.ts`); rules in
  `perform.py` (salvage); the person's own rates from L16 *to build*.

#### L70 Head motion
- **Purpose.** Nods, tilts and turns that follow speech and listening.
- **In → Out.** Prosody, turn state, gaze target → head yaw/pitch/roll.
- **Method.** **Prosody-locked rhythm**: the head axis that carries this person's beat (L16's coupling
  peak: pitch nods for some, a roll or yaw wobble for many Indian speakers) gets a syllable-locked impulse
  at the measured lag and gain; nods (pitch dips) also mark affirmations; the residual is slow drift from an
  Ornstein–Uhlenbeck process with the person's measured head speed and range. While **listening**, the
  wobble is not used: the listening set stays S12's perceptually chosen neutral set, because a wobble can
  read as assent (L85). For gaze shifts the eyes start first (or together) and land first, the head
  continues and the eyes counter-rotate (L71); the head's share of a gaze shift grows smoothly with its
  amplitude (a contribution curve, not a 15° switch), except during L72's guided gaze, which sets a
  minimum head yaw.
- **Research.** Naturalistic head motion from speech (2210.14800); speech-driven head pose (2310.20240,
  2502.20323); eye–head coordination in gaze shifts (Freedman 2008, *Biol. Cybern.*; exact figures
  **UNVERIFIED**).
- **Ours.** Person's own range, speed and head–prosody coupling axis.
- **Defaults.** Nod amplitude 3–6°; head share 0 below 10°, rising to ≈ 0.7 at 40°.
- **Fails → fallback.** Drift only.
- **Gate.** Head speed distribution matches the person's own: median and 90th percentile within ±20% on
  6/8 bench people; the coupling peak on held-out speech within ±0.1 of the person's own; blind
  acquaintances pick "moves like them" over a population-style clip above chance (in S2's sessions).
- **Status.** *Partial*: nods in `perform.py`.

#### L71 Gaze
- **Purpose.** Look at the student, at the board element being discussed, or away while thinking — and
  keep looking at the student while the head moves.
- **In → Out.** Script gaze tag, lesson target position (L75), turn state, mixed head pose → eye angles.
- **Method.** A small state machine: *student* (camera) while asking and listening; *board* at the target
  element when pointing or referring, and on the active element while a lesson step animates (L72);
  *chat* (a glance down to the chat box) while the student is typing, then an attentive waiting pose and no
  speech over a typing student; following the student's own stepping of the animation; *away* (up-left or down) briefly when "thinking" or at the start of
  a long answer (gaze aversion), returning before the key point; saccades between targets with
  main-sequence velocity; micro-saccades during fixation. **Vestibulo-ocular stabilisation**: eye angles are
  computed in world space from the gaze target *after* the head pose is mixed and after the springs have
  settled it (L82's order), so the eyes counter-rotate during every nod, tilt, drift and settle, and mutual
  gaze holds.
- **Research.** Gaze in conversation (Kendon 1967); speech-driven gaze (TalkingEyes 2501.09921); expressive
  gaze dynamics (2610.19635); turn-level interactive heads (2512.15340); spatially aware agents (SARAH
  2602.18432).
- **Ours.** Gaze that knows the lesson's element positions.
- **Defaults.** Mutual gaze 60–70% of speaking time **only while nothing on the board moves**.
- **Fails → fallback.** Student gaze with idle saccades.
- **Gate.** Gaze lands within 2° of the target element's centre within 250 ms of the cue; during fixation
  the gaze direction error stays < 1° while the head moves.
- **Status.** *To build*.

#### L72 Attention sharing beside a moving lesson
- **Purpose.** An on-screen instructor competes with the board for the student's eyes; while the lesson
  moves, she should send attention to it, not pull it to herself.
- **In → Out.** The lesson player's step events (`lesson_moving`, the active element id, published for L75),
  turn state → gaze mode for L71, an amplitude scalar for gestures and idle (L82), allowed gesture classes
  for L74.
- **Method.** While a lesson step animates she uses **fixed guided gaze**: eyes and head stay on the active
  element; gestures are limited to deixis at that element; beat and idle amplitude drop by about 60%; blinks
  and micro-motion stay on (she is never frozen). Direct gaze to the student returns between steps and when
  she asks a question. **Readable on a flat screen**: a pictured face's gaze is read relative to the
  screen, not the room (the Mona Lisa effect: a face looking at the camera seems to look at every viewer,
  and lateral targets are hard to read; Al Moubayed, Edlund and Beskow 2012, *ACM TiiS* 1(2), from the
  abstract), and painted eyes about 10–15 px wide at 720p cannot carry "look there" alone; so while this
  layer is active the head takes a **minimum yaw towards the board's side** (15°, more for farther
  elements) and the head carries the direction. Because she then speaks whole steps at 15–30° yaw, the lip
  gates S3 and S4 are run on renders drawn from this layer's yaw distribution, not only frontal ones. The
  policy is a rule on existing inputs, no model. **Narration–step timeline (publish time)**: guided gaze only
  helps if she says "swap" while the swap happens (temporal contiguity, Mayer 2009). At publish, each step's
  onset is anchored to the aligned onset (L61) of its event word in the narration clause ("…and now we
  **swap**"); the repository's Scene Voice already requires these words (`swap`, `cmp`, `found`) in step
  names. When a step animates longer than its clause, the narration is split at a phrase boundary and silence
  is inserted; speech is never stretched beyond ±10%. Narration is stored per step, so "phir se" or a scrub
  replays that step's clause and lips from static files. Students often watch at 1.25–2×, so playback uses
  pitch-preserving rate and S3 and S5 are run at 1.5× and 2× (at 2× a 60 ms closure is about one frame, which
  L89's closure hold keeps visible).
- **Research.** On-screen instructors compete with the board for attention (Stull, Fiorella and Mayer
  2018, *Comput. Hum. Behav.* 88); a meta-analysis reports that instructor guided gaze helps learning
  (g ≈ 0.33) and fixed guided gaze more than shifting gaze (g ≈ 0.57 vs. 0.27) (Kuang, Wang, Xie, Mayer and
  Hu 2023, *Educ. Psychol. Rev.* 35(4); figures from the abstract, **UNVERIFIED** against the full text);
  agent gesture and near transfer (Davis 2018, g = 0.39, secondary source).
- **Ours.** Gaze and gesture budget driven by the live step events of our own lesson animations.
- **Defaults.** Amplitude 0.4 during steps; minimum head yaw 15°; return to the student 300 ms after a
  step ends.
- **Fails → fallback.** L71's default state machine.
- **Gate.** (B) In clips of animated steps, gaze on the active element ≥ 90% of step time; S8's gaze-only
  picks; every step onset within ±100 ms of its event word's onset (P). Whether the layer improves the quiz
  score needs the §8.4 study and is tested there, not here.
- **Status.** *To build* (step events exist in the lesson engine).

---

### Stage I: Physical actions of the upper body (L73–L82)

The aim is "every physical thing a person does with the upper body", without an animation library and
without an animator (contradiction C2). Actions are **goal programs**, solved every frame along task-space
paths, not once per key pose: most "robotic avatar" failures happen *between* key poses, so every Stage I
gate is measured on every frame of the trajectory at 30 fps.

#### L73 Action language
- **Purpose.** One small, checkable language for every action.
- **In → Out.** Script action tags → a goal program: a list of timed goals.
- **Method.** Grammar (JSON): `{act, hand: L|R|both|auto, target?, shape?, count?, at: word index |
  time, hold_ms, strength}`. Goals are primitives: `reach(hand, point)`, `orient(palm, dir)`,
  `shape(hand, name)`, `look(target)`, `lean(dir, amount)`, `nod(n)`, `shrug()`, `touch(hand, body_part)`,
  `beat(hand)`, and `join(hands, frame)` for closed two-hand chains: a shared contact frame (midline point
  and orientation) is solved first and each hand is an offset from it. A named action expands to
  primitives, e.g. `namaste` = `join(both, sternum, palms together, fingers up, elbows slightly out)`,
  `shape(flat)`, a small bow of the head and neck (not a nod), gaze student; `count(3)` = `reach(R,
  chest-height front)`, `shape(count3)`, `orient(palm to student)`; `point(target)` = `reach(R, observer
  line to target, L75)`, `shape(point)`, `look(target)`. A new action is a new expansion entry, no code.
  **Teacher-role and cultural rules**: the index finger never points at the student (the camera); pointing
  is for content, and towards the student she uses an open palm; offering, giving and counting use the
  right hand or both hands (giving with the left hand is frowned upon); a head shake is for content ("no,
  not this one"), never a reaction to a student's answer (L85).
- **Research.** Intention-aware hierarchical motion (2506.01563); LLM-driven pedagogical expression
  (2603.09536); behaviour markup traditions (BML, Kopp et al. 2006); Indian etiquette guides (Eccles School,
  University of Utah; SBS Cultural Atlas: weak sources, hence the rater gate).
- **Ours.** Actions as goals over primitives, validated against limits before they run.
- **Defaults.** About 20 named actions at launch: namaste, point, count 1–5 (raised fingers in lesson
  content; the phalanx style only as the person's own habit, L77), open palms, beat, wave, thumbs up, shrug, think (hand to chin), hand on chest, lean in, lean back,
  nod, shake, "this much" (two hands apart), emphasise (chop), offer (palm up), stop (palm out), welcome,
  look-at-board, okay-sign. Left out: hands on hips and crossed arms (they read as dominance or a closed
  posture for a teacher), come-closer (sources disagree on palm-up beckoning in India), and clap,
  write-in-air, rub hands and steeple (little teaching value, extra hand-contact risk for S7); "number on
  fingers" is the same as count.
- **Fails → fallback.** Unknown or invalid action → nearest named action or none, logged.
- **Gate.** Every action parses and expands; every expansion solvable (L76) for all 8 bench bodies;
  two-hand actions: palm gap ≤ 5 mm and no interpenetration on every frame; before an action ships, Indian
  student raters from at least 3 regions rate it "appropriate for my teacher" ≥ 4/5 with the lower bound
  ≥ 3.5 per region (B, catch trials; thumbs up and okay-sign included).
- **Status.** *Partial*: five fixed key-pose gestures (wave, namaste, present, point, nod) in the Studio
  player (`player.ts`); four hand-posed gestures in `body.py` (salvage); language *to build*.

#### L74 Gesture planner
- **Purpose.** Decide which gesture, with which hand, when — including gestures nobody writes in the
  script (beats, open palms) — and keep them inside the frame.
- **In → Out.** Sentence, word times, prosody, explicit action tags, the person's gesture rate, the camera
  frame → a gesture schedule `[act, start, apex, end, strength]`.
- **Method.** Explicit tags first (namaste, point at, count): Guru (L86) already writes `gesture` fields,
  and LLM gesture selection is published and works. Then rules add beats and metaphoric gestures (open
  palms, "this much", offer) on stressed words: word class, stress, position in phrase, cue words
  ("first/second" → count, "this/here/look" → point, "big/small" → size); constraints: one gesture per phrase
  on average, rest between gestures ≥ 300 ms, rate matched to the person's measured gesture rate (L16) and
  scaled by arousal (L68). **Framing**: the panel is waist-up and fixed, so hand targets carry the camera
  frustum minus a safe margin as a soft constraint, default gesture height is slightly above real life (as
  presenters do), and beats and counts are planned at chest height, never below the crop. While the lesson
  moves, only deixis is allowed (L72). **Phone tier** (panel ≤ 480 px, L89): she is a head-and-shoulders
  picture-in-picture, so arm deixis is replaced by gaze plus a highlight request to the lesson player (L75's
  disambiguator). No learned scorer until our own commercial-OK gesture data exists.
- **Research.** LLM gesture selection (2503.14408); semantic co-speech gestures (SemTalk 2412.16563;
  SemConFlow 2603.26553; SARGes 2503.20202); labelling sentences with deictic gestures (2407.02151);
  gesture space (McNeill 1992); review of data-driven gesture generation (2301.05339).
- **Ours.** The planner outputs goal programs, not motion, so any gesture it picks is physically solved.
- **Defaults.** Rules plus LLM tags.
- **Fails → fallback.** Beats on stressed words only.
- **Gate.** Appropriateness rating (GENEA-style) not worse than the rule baseline by more than 0.5 points on
  a 7-point scale (NI, S9's session); no two apexes < 300 ms apart;
  hands visible on ≥ 95% of stroke frames and never clipped by the frame edge mid-stroke.
- **Status.** *Partial*: word rules in `perform.py`; gesture slot in `slots.json`.

#### L75 Target resolution: lesson element to 3D point, for the observer
- **Purpose.** "Point at node 7 at step `swap`" must make the *student* look at node 7.
- **In → Out.** Target id (lesson step or element id), panel and page layout, the candidate elements nearby
  → a 3D target for the shoulder–wrist–fingertip line, a gaze target, and, if needed, a disambiguator.
- **Method.** The lesson player names its steps and elements (`swap`, `cmp`, `found`, …) and publishes each
  element's screen rectangle every frame. The teacher's camera is known, so the element's centre is
  un-projected to a ray. Observers do not extend the finger ray: they read the arm–finger line, and read
  points as higher than intended. So the arm line (shoulder–wrist–fingertip), not only the finger, is set on
  the element, with a vertical bias correction, and head and gaze turn to the target too. A held point
  follows a moving element (scroll, animation) through a critically damped target filter with a velocity
  cap; if the element leaves the reachable cone, she retracts and re-points rather than twisting the torso
  past ≈ 30°. **Observer-solved deixis (untested):** a small observer model (arm–finger extrapolation with
  the published bias, plus the gaze line, over the known candidate boxes) predicts which element a student
  would pick; the pose is adjusted until the intended element wins by a margin over its neighbours, and
  when no pose achieves it (dense nodes), a disambiguator is added: a short trace in the air along the
  element, a spoken label ("node 7"), or a step-highlight request to the lesson player. This is *legible
  pointing* as robotics defines it (Holladay, Dragan and Srinivasa 2014: optimise the pointing pose so
  observers infer the right target among candidates; exaggeration helps), applied to live web lesson
  elements.
- **Research.** Interpretation of pointing (Herbort and Kunde 2016, *JEP:HPP* 42; Herbort et al. on bent
  pointing); legible robot pointing (Holladay, Dragan and Srinivasa, RO-MAN 2014,
  doi 10.1109/ROMAN.2014.6926256); pointing in situated agents (2509.12507); avatar-led explanations judged
  on whether they point at the content (VisualTalk-Bench 2611.25444).
- **Ours.** Legible deixis bound to the live layout of our own lesson animations, with the candidate set
  known exactly because the lesson publishes its elements; the optimisation itself is prior art.
- **Defaults.** Board plane 0.55 m in front of the chest; disambiguate when the margin < 20%. S8 is scored
  with the disambiguators off and their firing rate is capped at 10% of points, so a highlight cannot pass
  the pointing gate for the arm.
- **Fails → fallback.** Gaze-only reference ("here") with an open-palm gesture towards the side.
- **Gate.** S8.
- **Status.** *To build* (step ids exist in the lesson engine).

#### L76 Arm solver: analytic IK with shoulder girdle and torso
- **Purpose.** Put a hand (fingertip, palm or wrist) at any goal, naturally, every frame, without elbow pops.
- **In → Out.** Hand goal (position, optional orientation) per frame → clavicle, scapula, shoulder, elbow,
  wrist rotations, and spine/chest offsets for far reaches.
- **Method.** (1) **Shoulder girdle**: arm elevation is shared between the glenohumeral joint and the
  shoulder girdle by a fixed scapulohumeral curve (glenohumeral nearly alone below ≈ 30°, then about 2:1,
  clinically 1.7:1 to 2.3:1 across the arc), plus a little clavicle elevation and protraction for forward
  reach; applied before the arm solve, and correctives (L37) key on the combined angle. (2) **Analytic
  two-bone IK**: elbow flexion by the law of cosines; the one redundant degree of freedom, the swivel angle
  about the shoulder–wrist axis, is chosen by a cost mixing joint displacement and discomfort (L30), biased
  by the person's habit (L16), and filtered over time so it cannot jump; wrist orientation analytically. (3)
  **Torso extension**: beyond 85% of reach, the remaining distance goes to chest rotation and spine lean as
  a weighted extension of the same chain (clavicle → chest → spine), keeping the head level. (4) Damped
  least squares only for the final fingertip refinement with finger joints fixed.
- **Research.** Scapulohumeral rhythm (Inman et al. 1944; McClure et al. 2001, *J Shoulder Elbow Surg*);
  swivel-angle prediction (Li et al., ICRA 2012, Rosen group; Chen and Li, *Robotica* 2022: neither
  displacement nor discomfort alone predicts natural postures); FABRIK (Aristidou and Lasenby 2011) for
  comparison; real-time multi-constraint IK (JAX-IK 2507.00792).
- **Ours.** Swivel chosen by comfort plus measured personal habit.
- **Defaults.** Max lean 12°; swivel filter 8 Hz.
- **Fails → fallback.** Nearest reachable point on the goal line.
- **Gate.** Target error < 2% of arm length; 0 limit violations; no single-frame swivel change > 5° while the
  target moves smoothly.
- **Status.** *To build*.

#### L77 Hand shapes
- **Purpose.** Natural hands for every named shape and for the in-between.
- **In → Out.** Shape name or count → 20 finger joint angles per hand.
- **Method.** Named shapes as joint-angle sets (point, count 1–5 in the Indian styles — fingers raised, or
  the thumb touching the phalanges — and the Western style as a setting, open, flat, relaxed, fist, OK,
  thumbs up, pinch, steeple); in-between shapes interpolate with finger coupling (DIP ≈ ⅔ PIP) applied, in a
  synergy space (PCA of our consented hand captures) only if those captures are large enough; relaxed
  hands curl a little more on the ulnar side. At 720p a hand is about 60–90 px tall, so shapes are judged as
  rendered, painted silhouettes. **Counting at panel size**: the thumb touching finger segments is a 5–10 px
  detail there and invisible at the phone tier, so lesson counts use raised fingers; the phalanx style is
  used only as the person's own captured habit, in non-content moments or close-ups; at the phone tier a
  count becomes the spoken number plus the lesson highlight (as deixis does, L74). The synergy space is
  *later*.
- **Research.** Hand synergies (Santello et al. 1998); hand motion completion with priors (2607.05938);
  biomechanical finger tracking (2605.09258).
- **Ours.** Counting style as a setting, learned from the person's own counting frames when captured
  (which styles to offer is to be checked with teachers: **UNVERIFIED**).
- **Defaults.** Relaxed shape between gestures.
- **Fails → fallback.** Relaxed hand.
- **Gate.** Every named shape within L30's limits; observers identify counts 1–5 from rendered, painted
  clips at panel size ≥ 95% (lower bound ≥ 90%, catch trials) for the raised-finger style; reported per style.
- **Status.** *Partial*: hand poses of the Studio gestures in `player.ts`; point and count curls in
  `body.py` (salvage).

#### L78 Trajectories and gesture phases
- **Purpose.** Gestures that look human: preparation, stroke, hold, retraction, with the stroke on the right
  word, hands that travel like hands, and preparation that starts before the audio exists.
- **In → Out.** Gesture schedule + goals, the streamed text and, later, the aligned chunk → per-frame hand
  goals (task space) and finger shapes over time.
- **Method.** Human reaching is roughly straight in hand space with a bell-shaped speed profile, so the
  wrist/fingertip path is planned in **task space** (minimum jerk), with a via-point that keeps clearance
  from the torso capsules; L76 solves it every frame. Duration from distance and precision (Fitts-like:
  precise pointing gets a longer deceleration tail). **Anchor**: for deictics and iconics the stroke apex
  (maximum extension, velocity minimum) lands on the **lexical affiliate**, the word the tag binds (`at:
  word index`, L73, e.g. "seven" in "node 7"), whose nearest pitch accent may be on another word; beats
  keep the pitch-accent anchor (L61); apexes also align with energy peaks of our own audio, which is
  physically consistent with how gesture impulses shape speech. **Plan from the text first**: gesture
  onset precedes its affiliate by a median of about 0.75 s, longer for less familiar words (Morrel-Samuels
  and Krauss 1992, as summarised in Krauss 1998), while the worker looks ahead only 160 ms (L89) and aligned
  audio arrives 0.3–0.6 s after the clause text (§7.3), so planning from the audio alone would put every
  clause's first preparation in the past. So: (1) a **provisional plan from the streamed text** (L86 tags,
  G2P lexical stress, a nuclear-accent rule for the last content word, word times estimated from the voice's
  speaking rate); (2) preparation starts from it, under the opening bank phrase where there is one (L88);
  (3) when the aligned chunk arrives, only the **stroke is re-timed**: the apex moves and the remaining
  preparation path is re-solved by the minimum-jerk planner from the current state; (4) if less than about
  250 ms of lead remains, the gesture is downgraded to a beat or dropped, never landed late. Fingers move in
  their shape space; consecutive gestures co-articulate (skip retraction when the next preparation starts
  within 400 ms) and gesture units return to a rest pose (L80) only at unit ends.
- **Research.** Gesture phases (McNeill 1992; Kita et al. 1998); minimum-jerk motion (Flash and Hogan 1985);
  gesture–affiliate timing (Morrel-Samuels and Krauss 1992, *JEP:LMC* 18(3), doi 10.1037/0278-7393.18.3.615);
  apex–prosody alignment (Leonard and Cummins 2011; spread from Pouw and Dixon 2019 as summarised in citing
  work, exact numbers **UNVERIFIED**); gesture–speech physics (Pouw, Paxton, Harrison, Dixon 2020, *PNAS*
  117(21)); streaming gesture generation (GestureFAR 2609.21576; LiveGesture 2604.10927).
- **Ours.** A provisional gesture plan from streamed text, re-timed on the aligned audio, that never lands
  late. *Untested idea, gesture-led prosody*: the planner picks the affiliate first and asks the voice to
  accent it (an emphasis control where the engine has one, otherwise a phrasing change it is known to respond
  to), checks the result with L61's stress detector and logs misses per engine; tested as an ablation inside
  S8 by pick time (novelty **UNVERIFIED**).
- **Defaults.** Hold 150–400 ms; minimum lead 250 ms.
- **Fails → fallback.** Joint-space blends with ease-in/out.
- **Gate.** Apex within [−200, +60] ms of the affiliate's stressed syllable for deictics and iconics, and
  within ±100 ms of the accent for beats, in 95% of gestures (strokes may lead speech but rarely lag it;
  the human spread is **UNVERIFIED** and calibrated on the bench videos, L16); 0 strokes landing after
  their affiliate's end.
- **Status.** *Partial*: ease in/out in `perform.py`.

#### L79 Self-collision avoidance
- **Purpose.** Hands never pass through the body, the other hand or the face, on any frame.
- **In → Out.** Per-frame pose and its predecessor → corrected pose.
- **Method.** Capsules for torso, neck, head, upper arms, forearms, palms and finger segments (≈ 40);
  tested as **swept** capsules between consecutive frames (continuous collision); on contact the hand goal
  is pushed out along the separating normal and L76 re-solves; `touch` and `join` goals use a 5 mm contact
  offset.
- **Research.** Physics-based interaction priors (2609.06591) for ideas; capsule collision practice.
- **Ours.** —
- **Defaults.** 3 resolve iterations.
- **Fails → fallback.** Abort the gesture and return to the rest pose.
- **Gate.** S7: 0 penetrations deeper than 2 mm on every frame of the library × 8 bodies.
- **Status.** *To build*.

#### L80 Rest poses, idle life and breathing
- **Purpose.** Alive while listening or waiting; never frozen; never "floating".
- **In → Out.** Time, turn state, speech plan → rest pose, breathing, sway, discrete adjustments.
- **Method.** **Rest poses**: 3–4 home poses (hands loosely clasped at the waist, one hand on the other
  wrist, arms down and relaxed, a hand resting on the desk edge), chosen per person from L16; switched only
  at turn boundaries. **Breathing while speaking** follows the speech plan: a fast chest and shoulder rise
  (≈ 0.3–0.6 s) in the pause before each phrase, scaled by the next phrase's length, then a slow linear fall
  through the phrase; **quiet breathing** (≈ 4 s period, about 40/60 in/out) only while listening or idle;
  coordinated with any audible breaths the voice produces. **Sway**: a slow (≈ 0.1–0.3 Hz), small lateral
  shift visible as a shoulder-line tilt with a head counter-roll. Hands hold still apart from the spring
  layer (L81) and the breathing passed through the chest; occasional discrete self-adjustments (shoulder
  roll, re-clasp, solved with `join`) at turn boundaries. Noise remains only on the head (L70) and brows
  (L69).
- **Research.** Speech breathing (Winkworth et al., *JSHR* 1994/1995; the year varies across citations,
  **UNVERIFIED** which); gesture units (Kendon); listening behaviour (2409.20188, 2112.13548).
- **Ours.** Breaths placed by the speech plan; rest poses from the person's own video.
- **Defaults.** Breathing amplitude 4 mm at the sternum.
- **Fails → fallback.** Arms-down rest with quiet breathing.
- **Gate.** No interval > 2 s with all joint velocities below 0.2°/s; inhalation onsets in pauses ≥ 95%.
- **Status.** *To build*.

#### L81 Secondary dynamics and spring chains (body, hair, loose garments)
- **Purpose.** Real arms overshoot slightly, wrists and fingers lag the forearm on fast strokes, the head
  settles after a nod, hair sways a little, and a dupatta or pallu moves; a purely kinematic figure looks
  robotic. One spring solver does all of it.
- **In → Out.** Mixed pose (L82), head and chest motion, active contact and pointing holds → filtered joint
  rotations; hair-clump spine poses; loose-garment chain poses.
- **Method.** One second-order (spring–damper) follow of a rest orientation, used three ways: (1) per body
  joint, on the **residual** (filtered minus target) of the mixed rotations, higher frequency and
  near-critical damping near the root, lower frequency and more damping at wrist and fingers; the residual
  fades to 0 over 100 ms whenever a `join`, `touch` or pointing hold is active, because a lagging,
  overshooting wrist would open the palm gap, lift a touch off the body and move the arm line off the
  element L75 solved; L82 then re-solves the end-effector constraints and clamps; (2) per hair clump, a spine of
  3–6 spring bones, stiff at the root and softer at the tip, with spine points projected out of 3
  head/neck/shoulder capsules; (3) for the dupatta or pallu only (*later*, with those garments, L48), 3–6
  spring bones per loose part with capsule collisions. Everything else is skinned. Microseconds per joint, in
  the worker.
- **Research.** Complementary dynamics for flesh (2303.11886, the published reference; a joint-level spring
  is enough for our budget); augmented mass–spring hair with a ghost rest shape (2412.17144); XPBD (Macklin
  et al. 2016) as the deferred particle alternative; neural hair simulation (2507.05191) for ideas.
- **Ours.** —
- **Defaults.** Shoulder 6 Hz / ζ 0.9; wrist 3 Hz / ζ 0.7; fingers 2.5 Hz / ζ 0.8; hair root 4 Hz, tip
  1.5 Hz, ζ 0.7; 20–40 hair spines.
- **Fails → fallback.** Off (rigid hair, skinned garments).
- **Gate.** No added limit violations; apex timing (L78) still within tolerance after filtering; contact
  and pointing gates (L73, S8) measured on the final pose; no spine point inside a head capsule; 0
  cloth–body penetrations > 2 mm; stable at 30 fps for 10 min.
- **Status.** *To build*.

#### L82 Motion mixer and personal style
- **Purpose.** Combine all motion sources with clear priorities, in the person's own style, without pops.
- **In → Out.** Lip, emotion, blink, head, gaze, gesture, rest and idle streams → one pose per frame.
- **Method.** Per-joint masks with priorities per channel: mouth values (lips > emotion > idle), eyes (blink
  > gaze), arms (explicit action > planned gesture > rest/idle); changes of the winning source crossfade over
  150–250 ms with quaternion blending; additive layers (breathing, sway, micro-motion) on top. **Order of
  operations**, written once here: (1) mix; (2) L81's springs on the residual, faded out under active holds;
  (3) re-solve L76 for active end-effector constraints (`join`, `touch`, pointing line); (4) the eyes (L71's
  vestibulo-ocular step), after the head has settled; (5) a **post-mix clamp** to L30's limits; (6) the
  must-hit mouth events of L65 re-asserted last. Personal style: amplitude and tempo of gestures, head and
  brows scaled by the person's profile (L16), by emotion (L68) and by the attention scalar (L72); preferred
  hand from L11.
- **Research.** Motion layering practice; speaking-style capture (1905.03079); identity-aware motion
  (2604.25164).
- **Ours.** Style as measured scalars, not a style network.
- **Defaults.** Crossfade 200 ms.
- **Fails → fallback.** Unstyled defaults.
- **Gate.** Mouth closures (S3) never broken by other layers; angular acceleration per joint bounded (no
  single-frame spikes) across a 10-minute run; style scalars within ±2σ of the population; the final clamp's
  activity within S7's limits (it hides violations, so its own activity is what is gated; mutant: limits
  widened by 30° upstream).
- **Status.** *To build*.

---

### Stage J: Listening and conversation (L83–L88)

The site's speech chain today is batch: it posts a whole recording (`src/voice/stt.js`, up to 3 MB) to
cloud providers. A live teacher needs streaming. No commercially licensed two-channel Hindi conversation
corpus is known, and the original voice-activity-projection models are trained on Switchboard (an LDC
corpus; commercial terms **UNVERIFIED**, 2205.09812), so version 2 starts from hybrid rules and streaming
recognition, and adds learned turn models only on our own consented data.

#### L83 Listening: voice activity, streaming recognition and echo guard
- **Purpose.** Know when the student speaks and what they say, in English, Hindi or Hinglish, fast — and
  never mistake her own voice for the student's.
- **In → Out.** Student microphone (with echo cancellation) + the played reference signal → speech/no-speech
  per 30 ms, streaming partial transcripts with confidence and n-best, final transcript.
- **Method.** A small VAD (Silero-class, MIT) on device; a streaming ASR on the server (Qwen3-ASR-0.6B,
  Apache-2.0 per its model tag — to confirm in L3; the turn-aware LoRA of 2609.04225 is *later*, since no
  Hinglish classroom speech exists to train it), biased towards the lesson vocabulary (keyword boosting); the site's free cloud chain (Admin → Voice recognition) is kept for
  the final transcript where it is better. **Echo guard**, on the device, with no speaker model: speaker
  verification is unreliable on the 0.1–0.3 s available before a duck (about 13% EER even at 1 s,
  2005.03329; short utterances, 1901.10345), and a VoxCeleb-trained model may not ship (D6). We know the
  exact playback signal, so an onset counts as the student's when the VAD fires and the residual after echo
  cancellation has low normalised cross-correlation with the played reference (the duck, which is
  reversible); the stop (L87) also needs the streaming partial **not** to match the words she has just
  played (a text self-echo test, our own code). **Playback through the echo canceller**: Chrome reportedly
  cancels echo only for audio received over an `RTCPeerConnection`, not for Web Audio or `<audio>` playback
  (webrtc/samples issue #1243; current behaviour **UNVERIFIED**), so her audio is played through a local
  loopback peer connection, with L89's clock read on the receiving element; the added latency is measured
  inside S5's calibration. When echo cancellation cannot be confirmed on the shipping path and no headphones
  are in use, push-to-talk is the default. **Typed input** is a first-class
  turn: typing start and stop are events for L84–L85 (many students will type in shared rooms, in noise, or
  out of shyness about spoken English; the share is **UNVERIFIED** and is logged from day one).
- **Research.** Whisper (2212.04356); turn-aware streaming ASR (2609.04225: 0.97 boundary recall at 0.39 s
  median); Indian-language ASR benchmarks (2604.19151, 2305.15386, 2609.24199); code-switched speech
  (2406.10993).
- **Ours.** Reuses the site's free speech chain for finals; echo guard from our own known playback.
- **Defaults.** End-of-speech silence 500 ms as a last resort (L84 usually decides earlier).
- **Fails → fallback.** The batch chain with silence endpointing; typed input.
- **Gate.** (NI) WER/CER on the Hinglish classroom set not worse than the best single provider by more than
  10% relative; S11's echo test on the shipping playback path in Chrome on Windows, Chrome on Android and
  Safari on iOS.
- **Status.** *Partial*: batch chain in the site (`src/voice/stt.js`, `client/src/voice/`); streaming and
  echo guard *to build*.

#### L84 Turn-taking, with a teacher's wait time
- **Purpose.** Answer at the right moment; do not cut the student off; do not leave dead air — and after
  she asks a question, wait like a teacher.
- **In → Out.** VAD, partial transcript, tutoring state → each 50 ms: keep listening, prepare, answer,
  backchannel, stop (student interrupted), ignore (noise).
- **Method.** Hybrid endpointing: silence hysteresis plus the streaming ASR's turn boundary plus a semantic
  completeness score from the transcript (question complete? sentence complete? a numeric answer parsed by
  the grader?). **Wait time**: after she has asked the student a question, the end-of-turn threshold is a
  teaching policy, not a conversation one: she waits at least 3 s, showing visible "thinking with you"
  listening and no filler; "ruko / ek minute" holds the floor indefinitely; a parsed complete answer ends the
  wait early. **A pause inside wait time is not confusion**: the hint ladder steps only when the student asks,
  or, after at least 8 s, as an *offer* ("ek hint chahiye?"), never by itself. **Wait time II**: after the
  student answers, she holds a visible, attentive pause before the verbal verdict (pausing after the answer
  makes answers longer and better reasoned; Rowe 1986; practice guides give 3–5 s for classrooms,
  **UNVERIFIED** for one-to-one tutoring). The hold is a **floor that runs in parallel** with grading, the
  brain and synthesis: verdict audio starts at max(hold, first clause ready), never hold + latency, which
  would leave 2.7–3.8 s of silence and read as "she didn't hear me". One neutral receipt cue fires at the
  student's turn end (a gaze settle and a slight lean, never a nod, which reads as assent); the floor
  (1.0 / 1.5 / 2.0 s) is tuned in the study on "felt listened to" and answer elaboration. **No turn-taking cue inside
  wait time**: an intake breath and a brow lift are classic cues for *taking* the turn, so neither fires
  inside wait time or before the turn-end score reaches 0.6 (L88); only attention cues (gaze steady, a slight
  lean) do. A learned turn model
  (voice-activity projection) is *later*, trained only on our own consented two-channel tutoring recordings
  (students' voices need their own opt-in consent, and a guardian's for minors).
- **Research.** Wait time (Rowe 1986, *J. Teacher Education* 37(1)); voice activity projection
  (2403.06487, 2401.04868, 2503.06241); FastTurn (2604.01897); speculative and hybrid turn control
  (Voice-Light 2609.20995: a learned policy alone reached 12.5% recall at a safe cut-off rate); full-duplex
  dialogue (2410.00037, 2604.21406, 2509.22243); IndicFDB behaviours as a comparison benchmark (via
  2604.23295; licence **UNVERIFIED**, comparison only).
- **Ours.** Tutoring-state-aware wait time.
- **Defaults.** Answer when silence ≥ 350 ms and (ASR boundary or semantic end ≥ 0.6); after a question,
  wait ≥ 3 s; hint offer after ≥ 8 s; verdict floor 1.5 s, in parallel with the reply.
- **Fails → fallback.** Silence threshold (L83).
- **Gate.** False cut-ins ≤ 5% of student turns (B); median gap after a true end ≤ 300 ms to first reaction;
  answer turns per S10; after questions, 0 cut-ins inside 3 s and 0 intake breaths or brow lifts inside wait
  time, and 0 automatic ladder steps (Z, ≥ 200 question turns).
- **Status.** *To build*.

#### L85 Listening reactions, contingent on correctness
- **Purpose.** She shows she is listening, and never signals agreement with a wrong answer.
- **In → Out.** Turn state, the student's prosody, transcripts with confidence, **the grader's verdict** →
  backchannel events (nod type, short vocal token from the bank, facial reaction).
- **Method.** Timing and type by rules (pause-based opportunities, prosodic cues), with a learned
  predictor later on our own data. A gate filters them: **agreement** ("haan", "sahi", an affirmative nod:
  every bank item tagged *agreeing*, L62) only after
  a *final* transcript with ASR confidence above a threshold *and* a grader verdict "correct"; **negative
  faces never fire, and nothing evaluative fires on partial transcripts**; otherwise only neutral attention (steady gaze, slight
  forward lean, a brow lift). Because "hmm" and a lateral head tilt or wobble are commonly read as assent in
  Hindi conversation (**UNVERIFIED** as a measured effect), the neutral set is chosen by the perceptual test
  of S12, not assumed. While the student talks, backchannels are visual only (vocal tokens cause
  echo-cancellation double-talk and damage recognition); vocal tokens only in pauses ≥ 250 ms. Confusion
  cues (long pauses outside wait time, "umm", rising pitch) bring the *encouraging* face and, per L84, an
  offer of a hint, never a concern face. **After the grader's verdict** (following L84's hold): on a correct
  answer, an affirmative nod and a specific process-praise clause ("you checked mid first, good"); on a wrong
  answer, no head shake, no concern face and no frown — a warm neutral face, a slight lean in, and a reply
  about the content. **Divergence deixis (untested option)**: when the grader says "wrong", or Mirror Run's
  `compare.ts` finds the first frame where the student's trace differs from the lesson's, her first reaction
  is a look and a point (L75) at *that* step's element, then, after the hold, one question about it ("yahan
  `low` kya tha?"). The nonverbal channel then carries *where* the error is, not *that* there is one. It is a
  step of Guru's hint ladder (`GURU_SPEC.md`), passes the Leak Guard, and never runs during a test.
  **Minors**: for students under 18, reactions use the live signals only and nothing about the student's
  gaze, attention or confusion is logged (guardian consent and DPDP's no-tracking rule for children,
  section number **UNVERIFIED**).
- **Research.** The positivity principle for instructors, seen on delayed tests (Lawson, Mayer et al. 2021);
  backchannel prediction (2410.15929, 2304.04472, 2607.22729); nodding types (2507.23298);
  listening heads (2112.13548, 2409.20188, GLARE 2609.40317); dyadic behaviour (2510.04637, 2506.22554);
  confusion detection (2206.02436); Hindi backchannel rates (IndicFDB numbers quoted in 2604.23295).
- **Ours.** Correctness-contingent backchannels on final transcripts. We found backchannel timing and type
  models, but none that conditions agreement on a correctness check; nor an agent that ties its nonverbal
  error feedback to a trace divergence (novelty **UNVERIFIED**).
- **Defaults.** ≈ 1 backchannel per 12 s (human Hindi listeners ≈ 0.079/s), calibrated on the bench.
- **Fails → fallback.** Neutral attention only.
- **Gate.** S12 (both questions, every region); backchannel timing rated natural ≥ 3.5/5; divergence deixis
  only if, against a neutral face plus the same question, it is rated no more judgemental and gives
  self-correction no slower (§8.5).
- **Status.** *To build* (the grader and hint ladder exist in Guru: `src/voice/guru.js`; the trace compare
  exists in Mirror Run).

#### L86 Brain and streamable performance script
- **Purpose.** What she says and how: words, emotion, gaze, gestures and targets, clause by clause, and
  nothing unsafe ever reaches the voice.
- **In → Out.** Student turn, lesson context, student memory → a stream of speakable text with inline tags,
  parsed into validated clauses.
- **Method.** Guru (`src/voice/guru.js`, `docs/voice/GURU_SPEC.md`): free providers with failover, the hint
  ladder, Leak Guard, no help in tests. It streams **plain speakable text with light inline tags**
  (`⟨g:point|el42⟩`, `⟨emo:curious⟩`, `⟨gaze:board⟩`), parsed as the text arrives (a JSON object per clause
  cannot be spoken until it closes). A validator checks every tag against the action list (L73) and the
  lesson's real element ids (L75); anything invalid is dropped or replaced by rules. **Leak Guard per
  clause, before synthesis**: speech cannot be unsaid, so each clause is checked before L60; a failing clause
  is replaced by a safe canned hint from the bank (L62) and the rest of that clause's tokens are dropped.
  "Honest face": when retrieval confidence is low, the clause gets `emo:thinking`, a hedge, and a pointer to
  the source. **Persona contract per teacher**: allowed topics and tone; no personal anecdotes, opinions,
  exam predictions, promises, or claims of personal memory or feelings ("this is about the lesson"); the
  teacher can read reply transcripts and switch live replies off (default off until they switch them on,
  D13). Every clause carries its provenance (approved lesson vs. live AI) for L57's cue, and the target
  code-mixing index of L58.
- **Research.** LLM-driven pedagogical agents (2603.09536, 2604.12253); embodied LLM agents with nonverbal
  planning (2308.15214, 2603.03282); backend-agnostic embodiment layers (BASE 2611.30388); students'
  attribution of AI-made teaching video (2607.28203, 2602.18457).
- **Ours.** A streamed, validated script tied to real lesson element ids, with a clause-level Leak Guard.
- **Defaults.** First clause ≤ 12 words.
- **Fails → fallback.** Text answer with neutral gestures.
- **Gate.** 100% of executed tags valid; Leak Guard tests pass, including a new test of streaming order (no
  clause reaches the voice before its check); 0 contract violations on a red-team set; S20.
- **Status.** *Partial*: Guru exists; streaming tags, validator and clause guard *to build*.

#### L87 Barge-in and repair
- **Purpose.** When the student interrupts, she stops quickly and politely, and knows what was heard.
- **In → Out.** Student onset during her speech (confirmed by L83's echo guard) → fade-out, state update,
  repair line.
- **Method.** Two steps, so the stop meets S11: at the student's onset plus 120 ms, once L83's echo guard
  says "student", her audio **ducks** by 12 dB (reversible: if it was a backchannel, she continues at full
  level); at 250 ms after onset, if student speech continues, the partial transcript does not match her own
  recent words, and it is not a backchannel (L84 decides), she **stops** with a 50 ms fade (done by 300 ms), freezes the gesture into a hold, turns gaze to the student, and
  Guru's context is cut to the words actually played (the audio clock knows them; rendered audio is the
  durable history, as in Voice-Light). Repair: "haan, bolo" from the bank (neutral) and, after the student,
  an offer to finish the point.
- **Research.** Overlap handling benchmarks (2507.23159); full-duplex systems (2509.06502); Voice-Light
  (2609.20995) for "rendered audio is authoritative".
- **Ours.** — (the context cut follows Voice-Light).
- **Defaults.** Duck −12 dB at onset + 120 ms; stop decided at onset + 250 ms, 50 ms fade.
- **Fails → fallback.** Finish the clause, then stop.
- **Gate.** S11.
- **Status.** *To build*.

#### L88 Latency hiding: speculation and the bank
- **Purpose.** No dead pauses even when recognition and the brain take a second or more.
- **In → Out.** Partial transcripts, predicted end of turn → a private draft, a visible attention cue, a bank
  phrase, early speech.
- **Method.** *Later*: generate privately from the partial transcript (speculative drafting); start
  synthesis only once the end of turn is confirmed; throw the draft away if the transcript changes. Release 1
  uses the rest of this layer: at 250 ms after the end, an **attention cue** only (gaze steady, a slight
  lean), never inside L84's wait time; the intake breath and brow lift come only once the turn-end score
  reaches 0.6, i.e. when she is actually taking the turn (an intake breath is a turn-*taking* cue, so firing
  it on every pause would read as about to interrupt); at confirmation, a **neutral** bank phrase in her own
  voice ("dekho…", "ek second") covers the first clause's synthesis, and after a student's answer only
  neutral items may play before the verdict (L62); fillers are capped at 2 per minute; lesson answers known
  in advance come from the lesson cache (pre-rendered, §7.4).
- **Research.** Voice-Light speculative generation (2609.20995); response-time studies in full-duplex
  dialogue (2604.21406); streaming agents for digital humans (2608.24909); human Hindi response gaps ≈ 0.26 s
  and the best Hindi duplex model ≈ 2.0 s (2604.23295).
- **Ours.** Pre-speech body cues and a personal phrase bank as part of the latency budget.
- **Defaults.** Attention cue at 250 ms (50 ms inside S10's 300 ms); breath at turn-end ≥ 0.6; bank phrase
  only when the first clause will be later than 700 ms, within the cap of 2 fillers a minute; S10 therefore
  gates the first *content* audio, since at the cap a bank covers only min(1, 2/r) of r question turns a
  minute and a filler-rewarding metric would favour "achha".
- **Fails → fallback.** Thinking cue (L68) until audio starts.
- **Gate.** S10.
- **Status.** *To build*.

---

### Stage K: Clock, delivery and gates (L89–L91)

#### L89 Clock, scheduler and adaptive quality
- **Purpose.** Lips and audio in step on every device, including Bluetooth earbuds and dropped frames; 30 fps
  held by trading quality, not timing.
- **In → Out.** Audio playback position and output latency, motion streams, frame times → the pose at the
  audio time; a quality tier.
- **Method.** The audio context's playback time, corrected by `AudioContext.getOutputTimestamp()` and
  `outputLatency`, is the master clock; each frame evaluates every motion stream at that time, so dropped
  frames never desync lips. **Closure hold**: if a must-hit interval overlaps a frame's display interval
  [t, t + Δ], that frame is rendered closed (a 2–3-frame /p/ cannot be skipped by a dropped frame). Where
  output latency is large or unreported (many Bluetooth devices), a one-tap "lips early / late"
  calibration is offered and saved per device. Motion for each chunk arrives with the audio (Stage H on the
  server); the worker runs the face and body layers 160 ms ahead; frames are drawn at L56's fixed 30 Hz
  cadence. **Tiers** are chosen from `requestAnimationFrame` frame-time percentiles plus a 1 s
  micro-benchmark at first load, cached per device, because GPU timer queries
  (`EXT_disjoint_timer_query_webgl2`) exist in Chrome but not reliably in Safari or Firefox: *full* →
  *light* (no cast shadow, LOD1, internal resolution 540 px) → *basic* (occlusion only, LOD1, 480 px, no
  spring chains). MSAA stays on at every tier (it is fixed when the context is created, and on tilers it is
  nearly free); tiers trade resolution, shadows and LOD instead. The internal resolution cap of L56 applies
  at every tier. **Phone tier** (panel ≤ 480 px wide, as the site must work at phone width): a
  head-and-shoulders picture-in-picture at the basic tier with MSAA and L53's pose bake (so the hair and nose
  shadows stay), L52's minimum on-screen sizes and size-based feature drops for a face about 120 px tall,
  deixis by gaze and lesson highlight (L74), counts as the spoken number plus the highlight (L77).
  **Playback rate**: lessons play at 1×, 1.25×, 1.5× or 2× with pitch-preserving audio; the clock is the same
  audio clock, so lips follow.
- **Research.** Lip-sync detectability asymmetry (ITU-R BT.1359; figures from memory, **UNVERIFIED**);
  streaming embodiment on one timeline (BASE 2611.30388); real-time portrait animation (Teller 2503.18429).
- **Ours.** Audio-master evaluation of explicit controls with closure hold and output-latency calibration.
- **Defaults.** Tier change hysteresis 2 s; micro-benchmark re-run when the browser or GPU changes.
- **Fails → fallback.** Basic tier.
- **Gate.** S5 and S14 on the reference laptops; S3 with 10% injected frame drops; S3 and S8 rerun at
  360 px and the frame rate on a mid-range Android phone reported.
- **Status.** *Partial*: frame-exact `renderAt(t, speechT)` in the Studio player (`player.ts`) and the lab
  player; worker scheduling, closure hold and latency calibration *to build*.

#### L90 Model packaging, identity packs and signing
- **Purpose.** One file that carries the person model, its consent and its report, and an identity pack
  that cannot be turned into a teacher, or a deepfake kit, without its subject.
- **In → Out.** All build outputs → `.pbmodel` in two bundles (§4.3): the **player bundle** (manifest with
  SHA-256 of every file, signature, consent scopes, provenance ledger, information-budget certificate, build
  report, template version and hash, fitted positions, head morphs (sparse), palette and contrasts, paint
  overlay and pose-shadow bake, curves and marks, hair fit, wardrobe fit, motion profile, coarticulation
  parameters, persona contract) and the **server bundle** (voice reference and adapter, the L2 identity
  vector, the consent clip's hash), which never leaves the server; the phrase bank as a companion file,
  added when ready (Live); the downloadable identity pack.
- **Method.** As the identity pack (`PACK_FORMAT.md`), signed with the server key; encrypted at rest with
  the person's key (L3); the player verifies the signature, the template hash and the consent record before
  loading, and plays only under a current licence. **Identity packs**: (a) unsigned packs are refused on
  import (done); (b) every import, into any account, needs a fresh L1 consent from the person shown, and L2
  compares that new clip with the pack's capture; `subject: "pack"` is never a valid consent; (c) the
  downloadable pack is encrypted to its subject (L3) and by default holds the **measured numbers only**,
  which is all Stages C–K need under the brief; the raw `views/`, `face/texture.png` and `voice/voice.wav`
  are an explicit opt-in export with a warning (D15); (d) the server refuses pack ids on its revocation list.
- **Research.** Repository code (`src/routes/pratibimb.js`, `src/pratibimb/pack.js`,
  `scripts/teacher/maker/worker.py`).
- **Ours.** The model refuses to load without its consent record, licence and label component; a pack
  moves between accounts only with its subject, live.
- **Defaults.** ≤ 8 MB (bank ≤ 2 MB extra); packs numbers-only and encrypted.
- **Fails → fallback.** —
- **Gate.** (P, Z) Tampered files rejected 100%; size within budget; the player bundle holds no audio, no
  speaker conditioning and no face embedding (a scan of every file); on the attack set, an unsigned pack, a
  hand-made pack with a typed consent field, a genuine pack imported into another account without the
  subject, and a revoked pack are all refused (100%).
- **Status.** *Partial*: signed identity pack (`pack.py`); the Studio ships a VRM written by Blender
  (`build-vrm-teacher.py`); unsigned packs refused on import (`src/routes/pratibimb.js`, commit 5fa24edb);
  fresh consent on import, pack encryption, numbers-only default, revocation list, the two-bundle model
  format and, if §7.1's week-1 timing needs it, a numpy glTF/VRM writer (the engine once had one; only a
  stale `engine/__pycache__/glb.cpython-313.pyc` remains) *to build*. Models built before §8.6 step 0 are
  marked not publishable in `src/routes/pratibimb.js`.

#### L91 Self-grading build, bench and release gates
- **Purpose.** Every build checks itself; every change to any layer is checked on the bench; and every gate
  is shown able to fail.
- **In → Out.** The built model + held-out frames → report with every gate's number and pass/fail; retries;
  release decision per profile (§2.5).
- **Method.** **One bench harness** (one program, about twenty metrics: the S table plus a few internal
  ones) runs every gate; layers are a checklist, not separate test programs. **Renderer**: gate frames are
  drawn by the shipping three.js player in headless Chromium on the worker GPU, driven by Playwright with the
  frame-exact `renderAt(t)` (as `player/render.cjs` does), so gates measure what students see; gate renders
  add the non-multisampled region-id pass (L56) that S3 and S4 read. Today those scripts (`talkrender.cjs`, `film.cjs`,
  `render.cjs`) launch with SwiftShader (CPU rendering, an estimated 0.2–1 s per 720p frame, **UNVERIFIED**):
  fine for an offline 300-frame spike clip (≈ 5 minutes), too slow for the gate budget, so GPU-backed headless
  Chrome (ANGLE on Vulkan or EGL) in the rented container is a week-3 item (**UNVERIFIED**), with an EGL port
  of the same GLSL on moderngl (MIT) as the fallback; any gate rendered on the fallback is flagged in the
  report, since it is not what students see. Until then, mesh-level gates (S3, S4 on the morphed mesh, S6,
  S7) run in numpy. After the
  build, render held-out views (the end of the capture, or another day's photos) with the frames' own head
  pose and expression values, and run: the likeness regression (S1, on the mesh, with the gallery and pool
  of L0), shape error, the geometry-buffer lip checks (S3, S4) with the person's own audio and the replay
  gate (S6), limits and collisions on every frame of the action library (S7), pointing (S8, geometric
  part), no-copy (S15), figure–ground (S19), size and a browser-speed proxy. **Fixed-point gate
  (untested)**: render the model at the capture's views and expressions **in plain shading, with $s =
  \gamma = 0$ and de-attenuation off** (stylisation changes measurements by design, and the landmarker is
  out of domain on paint), run Stage B on those renders, and re-measure face shape, ratios, palette, hair
  length and expression ranges on the mesh and masks; a sound pipeline is close to idempotent,
  measure(render(build(x))) ≈ measure(x) within per-quantity tolerances. Heads drawn from the template's
  own family lie in its span and would pass by construction (an "inverse crime"), so the test heads are
  **outside the span**: foil-pool builds re-rendered, and MakeHuman heads with added held-out deformation
  modes. It catches drift, double counting, broken bindings and regressions in any layer and runs on every
  pull request touching the engine. **Mutants (dead-gate check, S21)**: every machine gate's pull request ships its mutant as a test
  (pytest or `node --test`), so CI proves the gate can fail, as the repository's "tests must pass" rule
  already demands; S21 is then a CI listing of gates and their red mutants, plus a full run before each
  release. A gate that stays green on its mutant is a **dead gate** and blocks the release. Mutants sit at
  about **1.25× the threshold**, not far past it, so they test the threshold and not only the plumbing: S1,
  another bench person's deviation swapped in; S3, one closure frame short (aperture 0.65 mm) and the jaw
  forced shut at every closure (chatter); S4, lower lip 1.25 mm from the teeth; S5, a 100 ms lead and a
  50 ms lag; S6, amplitudes × 1.2; S7, limits widened 30° upstream of the clamp and a 2.5 mm penetration; S8,
  pointing at the neighbouring element, and the disambiguator forced on; S13, a 60 s stall; S14, a per-frame
  main-thread stall that puts p99 at 50 ms; S15, the production `bake_skin.py` output, a 16 × 16 block
  portrait in the gradients and a 2.5 c/fw field; S17, an unlicensed asset, an SFace output on a choosing
  path and a clip missing from the log; S19, the dark-theme edge term off; L1, another person's voice
  reference, an uploaded file and a typed consent field; L2, a cross-person pack; L3, a cached clip left after
  deletion; L13, a sclera-forced white balance on a deep-skinned, older bench face; L60, another person's
  voice and a clause shifted 2 semitones; L65, a chunk-join jump at 1.25× the 99th percentile; L90, an
  embedding left in the player bundle; for Live, S10 and S11 with latency × 1.25 and S12 with a nod on a
  wrong answer. Rater gates (S2, S8, S9, S12, S18, S20, S22, L68, L73, L77) carry **catch trials** instead
  (L0). **Operating-characteristic sheet**: for each sampled gate the harness simulates its own noise
  (raters, clip length, voided sessions, frame drops) and reports P(pass | exactly at threshold) and
  P(pass | 25% worse); a gate's n is valid only if these are ≤ 0.5 and ≤ 0.1 (acceptance-sampling practice;
  its use for avatar release gates is, as far as we know, new, **UNVERIFIED**). If a gate fails and time remains, re-run only the layers upstream of
  that gate with the next fallback setting (e.g., lower style $s$, another hair style); else ship the
  report with the failure named and the missing input asked for ("one more photo of your left side"). The
  target shape of the build is **one long-lived worker process** with every model resident (§7.1); today's
  `pipeline.py` runs a subprocess per stage and Blender three times per variant, and is timed in week 1
  before any change (§7.1). A 2-person smoke bench and the fixed-point gate run
  on every pull request touching the engine; the full 8-person bench nightly and before a release (8 builds
  × 4 GPU-minutes per pull request would be paid compute); the full mutant run before each release.
- **Research.** Design-science evaluation (1904.12742); cycle consistency in learning (general practice; as
  a release gate for a measurement-only avatar builder we know of no prior use, **UNVERIFIED**); mutation
  testing of test suites (standard software practice), applied here to measurement gates; the "inverse
  crime" in inverse problems (standard).
- **Ours.** Time-budgeted retry targeted at the failing gate; the fixed-point gate outside the template's
  span; mutants at the threshold that prove each gate can fail.
- **Defaults.** Retry budget = 240 s − elapsed.
- **Fails → fallback.** Model marked "not ready"; never shown to students below the S1 margin, nor
  before S2 has passed on the bench for the release.
- **Gate.** All system gates of the release's profile (§2.5) green, S21 included; the owner approves a
  video with sound.
- **Status.** *Partial*: `pipeline.py`'s likeness check over 3 variants (renders scored against the photos
  by SFace, and the best kept: a check-only model choosing a shipped output, which L3 forbids; §8.6 step 0
  makes the choice by L34's mesh error and S1's margin, with SFace as pass/fail only); `bench.py`, `likeness.py`; held-out time split in `build.py` and `test_engine.py`
  (salvage); headless player rendering (SwiftShader) in `scripts/teacher/maker/player/render.cjs` and
  `talkrender.cjs`; GPU headless rendering, the region-id pass, the single harness, the fixed-point gate, the
  mutants and the operating-characteristic sheet *to build*.


### 5.12 Layer index (build checklist)

The last column says what release 1 (narrated lessons) needs: **R1**, needed and with work left; **R1 as
is**, needed and the existing code is enough for release 1; **Live**, needed only by the live-conversation
release; ***later***, after both. A release-1 gate may not pull in a layer marked *Live* or *later* (§2.5).

| # | Layer | Status | Gate (short) | Needed for R1 |
|---|---|---|---|---|
| L0 | The bench (first deliverable) | partial | All 8 people's material and the pool's captures complete and consented for each named use, raters recruited (owner decision D10). | R1 |
| L1 | Consent capture and verification | partial | 100% of builds and imports have a valid live record for every scope they use (P); the offline attack set is rejected in 100% of ≥ 30 … | R1 |
| L2 | Identity lock | partial | Bench: all 8 genuine pairs pass; all 56 cross pairs fail. Stated honestly: 0 of 56 cross pairs bounds the false-match rate only at ≤ 5.4% … | R1 |
| L3 | Provenance ledger, labelling and revocation | partial | S17: 100% traced; no check-only model on a parameter-choosing path (static check of the build graph); a deletion test leaves no readable … | R1 |
| L4 | Capture coach and coverage planner | partial | On the bench, coached captures reach "Good" coverage in ≤ 3 min for 8/8 people. | R1 as is |
| L5 | Frame quality, liveness and shot cuts | partial | ≥ 40 usable frames, or the build stops with a named reason; every bench photo's handedness correct. | R1 as is |
| L6 | Main-person tracking | partial | Other people never used (Z: manual audit of bench clips with bystanders, 0 frames in ≥ 2,000); the static check of L3 finds no SFace output … | R1 |
| L7 | Dense face points | exists | Detection on ≥ 95% of usable frames; mean landmark jitter on static frames < 0.5% of eye distance. | R1 as is |
| L8 | Expression reading and per-person calibration | partial | Neutral frames read ≤ 0.1 on every value after calibration. | R1 |
| L9 | Head pose | exists | Pose jitter on still frames < 1°. | R1 as is |
| L10 | Body points and metric lift | partial | Bone-length coefficient of variation < 5% across frames. | R1 |
| L11 | Hand points | exists | ≥ 10 hand frames, or the report says the hands are estimated. | R1 as is |
| L12 | Part segmentation | exists | Mask IoU between consecutive calm frames ≥ 0.9. | R1 as is |
| L13 | Colour calibration | partial | On bench captures with a colour chart in frame (people the model was not fitted on), skin colour after correction within ΔE₀₀ < 4 of the … | R1 |
| L14 | Accessories and facial hair | to build | Bench: glasses and facial-hair presence correct 8/8. | R1 |
| L15 | Voice extraction and quality | partial | One reference ≥ 10 s at SNR ≥ 20 dB per language used, matching the consent voice. | R1 |
| L16 | Motion-habit profile | partial | Blink rate on two halves of the capture agree within ±20%. | R1 as is |
| L17 | Canonical face | exists | Held-out face error < 2% of eye distance (measured 1.05%, same-session; second-day to be measured). | R1 as is |
| L18 | Metric scale | exists | Uncertainty < 8%. | R1 as is |
| L19 | Multi-view depth refinement | partial | Profile-view reprojection error drops ≥ 20% vs. single-view depth; held-out view error < 2%; profile-contour error < 1.5% of face height; … | R1 as is |
| L20 | Expression examples and the measured basis | partial | Held-out shape error of the measured basis < 2%; mouth opening follows the real mouth r ≥ 0.9 (measured 0.97). | R1 as is |
| L21 | Face detail curves | to build | Curves stable across views (mean positional disagreement < 3% of eye distance) and the owner's side-by-side check (§8.3) prefers … | *later* |
| L22 | Salient marks, lid crease, hairline and nostril shape | to build | Marks found on both capture days at the same position (≤ 3% of eye distance) on the bench; the person's own keep/remove choice is applied … | R1 |
| L23 | Full head completion and the matched norm | partial | Side-silhouette IoU ≥ 0.9; the norm's ratios within 0.5 SD of the published means; S16's monitored report shows no Monk group or region … | R1 (head completion; norm *later*) |
| L24 | Stylisation and caricature from the matched norm | partial | S1's rank-1 margin at the chosen $s$ (the cosine reported); at the stylised mouth, PBM reaches inner-lip contact with ≤ 0.3 mm penetration … | R1 ($s$ only; $\gamma = 0$) |
| L25 | Ears | to build | Ear in the profile view within 3 px at 512 px. | *later* |
| L26 | Neck and throat | partial | Front silhouette IoU ≥ 0.9 in the neck band. | R1 |
| L27 | Skeleton and bone lengths | partial | Skeleton reprojection onto frames < 4% of shoulder width. | R1 |
| L28 | Posture and spine | to build | Posture reprojection error < 4% of shoulder width. | *later* |
| L29 | Hand skeleton and finger lengths | partial | Hand length within ±5% of the bench ruler measurement (L0); fingertip reprojection reported. | R1 |
| L30 | Joint limits | to build | S7 (limits after every layer, including the spring layer L81). | R1 |
| L31 | Torso and arm volume | partial | Front silhouette IoU ≥ 0.9. | R1 |
| L32 | Glasses and facial-hair geometry | to build | Owner's side-by-side check: accessories judged "right" for 8/8 bench people. | R1 |
| L33 | The template (built once, by script) | partial | Two runs of the script give identical asset hashes; manifold, no self-intersection; library poses (S7) deform without flipped triangles on … | R1 |
| L34 | Template fit | partial | Face points within 0.5% of eye distance of L17–L24's face; head, neck and body silhouette IoU ≥ 0.9; no flipped triangles. | R1 |
| L35 | Personal expression rig | partial | Full lid closure at eyeBlink = 1; PBM inner-lip contact with ≤ 0.3 mm penetration; no lip through teeth at any value; held-out expression … | R1 |
| L36 | Skin weights | partial | No tearing or folding (flipped triangles = 0) on every frame of every library action. | R1 |
| L37 | Runtime deformer: correctives and skinning | to build | Volume change at elbows and wrists < 10% and silhouette error at a 90° elbow bend ≥ 20% lower than without correctives; morph GPU memory ≤ … | R1 (skinning and morph budget; correctives *later*) |
| L38 | Levels of detail | partial | LOD1 silhouette IoU ≥ 0.97 vs. LOD0 at panel size. | *later* |
| L39 | Per-frame light estimation | partial | Recovered skin albedo agrees across frames: ΔE₀₀ < 3 between the 25th and 75th percentile frames. | R1 |
| L40 | Colour model (parametric by default) | partial | Mean ΔE₀₀ to measured skin colour (L13) < 3; no region darker than 3σ of its own frames (no baked shadows); the three contrasts in the … | R1 |
| L41 | Region palette, skin tone and shine | partial | Region colours stable between two halves of the capture (ΔE₀₀ < 3); on every one of the 30 table cells, shadow-band chroma $C^* \ge … | R1 |
| L42 | No-copy guard: information-budget certificate | to build | S15 on every build (P; E for the colour-only test); S21's mutants must fail it: the output of the production `bake_skin.py` (a photo … | R1 |
| L43 | Feature curves: brows, lids, lip line, lashes | partial | Brow-shape IoU ≥ 0.85 vs. the masks in the front view and the tail position within 2% of eye distance. | R1 |
| L44 | Eyes | partial | Eye-centre fit residual < 0.5 mm; in the facing render the iris is centred on the camera within 1°; no head-interior pixels visible at ±30° … | R1 |
| L45 | Eyelids and lashes | partial | No lid–eyeball gap at any gaze in ±30°; full closure at eyeBlink = 1. | R1 |
| L46 | Teeth, gums, mouth cavity and tongue | partial | No see-through mouth at any expression; teeth visible iff inner lips separate > 1 mm; in the smile render, teeth display within ±1 mm of … | R1 |
| L47 | Hair shape (library first) | partial | Hair silhouette IoU ≥ 0.8 in front and three-quarter views; style class (including tied back) right on 8/8 bench people and on the pool; … | R1 (6 styles) |
| L48 | Wardrobe and garment fit | partial | No body vertex outside the garment on any frame of the library, including arms above 90°. | R1 |
| L49 | Lighting rig and theme-aware value key | partial | Face mean luminance in [0.45, 0.75] for every bench person and theme; S19 (measured on Playwright screenshots of the real pages, where real … | R1 |
| L50 | Shading-normal field | to build | In a slow head turn and a speech clip, band islands smaller than 1% of the face area: 0 in ≥ 600 frames per bench person. (v4's "differs … | R1 |
| L51 | The master band set and the per-person overlay | partial | S18 (including the "identical brush pattern" question, on the stroke-variation map); flicker (L55) ≤ the plain shaded render; L42 painter … | R1 |
| L52 | Painted shading model (run time), with eyes and hair highlights | partial | S18; S19 with black hair on dark themes as its own cell; form readable per Monk group over light and dark backgrounds (owner's check on the … | R1 |
| L53 | Key-light cast shadow and baked occlusion | to build | GPU time ≤ 1.0 ms on the reference laptop (**UNVERIFIED** until the spike, §8.6); no shadow acne and no swimming texels in the head-turn … | R1 |
| L54 | Lines | partial | No line flicker (L55) and lines present on all named features in every bench render; line width stable within ±0.5 px across the 720 px and … | R1 |
| L55 | Anti-aliasing and temporal stability | to build | Edge-crawl and flicker metrics (mean absolute frame difference after motion compensation) on a slow head-turn clip ≤ 1.5× the plain shaded … | R1 |
| L56 | Render graph | partial | S14, measured with a lesson animation running behind the panel. | R1 |
| L57 | Compositing, transparency, the AI label and the provenance cue | to build | 100% of rendered frames carry the label; S20; no dark fringe on hair over a white lesson background. | R1 |
| L58 | Text normalisation and language routing | to build | Round trip: phone error rate of the synthesised Hinglish set through L61's lattice ≤ 15% (a script-free measure; CER would score script and … | R1 |
| L59 | Grapheme to phoneme: a pronunciation lattice | partial | Phone error rate of the best lattice path ≤ 5% on a 500-word Hindi and a 500-word English list. | R1 |
| L60 | Cloned voice synthesis | partial | Speaker similarity (ECAPA-TDNN cosine, check-only, 2005.07143) between synthesis and held-out real speech ≥ 0.75 × the real-vs-real … | R1 |
| L61 | Spoken-phone alignment and prosody | partial | On a hand-labelled 200-phone set per language: phone identity on the chosen path ≥ 95% for must-hit classes; closure-interval overlap (IoU) … | R1 |
| L62 | Personal phrase bank | to build | Every item passes L60's speaker and intelligibility gates and S3–S4; no agreeing item plays before a verdict in the S12 control set. | Live |
| L63 | Audio watermark and provenance | to build | Every generated clip in the log (S17); no audible artefacts: ABX proportion correct within 0.5 ± 0.1 (E, ≥ 200 trials); mark detection … | R1 (log and mark; registry *later*) |
| L64 | Phones to visemes | partial | For each launch language (en-IN, hi, and whatever L58 routes), the phone inventory that the shipped aligner (L61) and the narration G2P … | R1 |
| L65 | Coarticulation as a constrained trajectory (lips, jaw and tongue) | partial | S3 and S4 on the mesh in numpy (inner-lip aperture ≤ 0.5 mm at every PBM frame, checked first on a known-closed pose so the threshold … | R1 |
| L66 | Jaw–lip split and personal mouth range | to build | S6; SLCC on held-out speech ≥ the value of the person's own video (2503.20308 metric). | R1 |
| L67 | Learned lip refiner and the replay gate | partial | S3–S6 still hold after fusion; PLRS (2503.20308) ≥ rules-only; replay geometric error ≤ rules-only; no output discontinuity at chunk joins … | R1 (replay gate; refiner *later*) |
| L68 | Emotion layer (face and body) | to build | Observers recognise the cues from silent clips ≥ 65% (lower bound ≥ 55%), scored on five classes with *empathetic* and *encouraging* merged … | *later* |
| L69 | Blinks, brows and micro-motion | partial | Blinks per minute within ±20% of the person's own (from L16). | R1 as is |
| L70 | Head motion | partial | Head speed distribution matches the person's own: median and 90th percentile within ±20% on 6/8 bench people; the coupling peak on held-out … | R1 |
| L71 | Gaze | to build | Gaze lands within 2° of the target element's centre within 250 ms of the cue; during fixation the gaze direction error stays < 1° while the … | R1 |
| L72 | Attention sharing beside a moving lesson | to build | In clips of animated steps, gaze on the active element ≥ 90% of step time; S8's gaze-only picks; every step onset within ±100 ms of its … | R1 |
| L73 | Action language | partial | Every action parses and expands; every expansion solvable (L76) for all 8 bench bodies; two-hand actions: palm gap ≤ 5 mm and no … | R1 |
| L74 | Gesture planner | partial | Appropriateness rating (GENEA-style) not worse than the rule baseline by more than 0.5 points on a 7-point scale (NI, S9's session); no two … | R1 |
| L75 | Target resolution: lesson element to 3D point, for the observer | to build | S8. | R1 |
| L76 | Arm solver: analytic IK with shoulder girdle and torso | to build | Target error < 2% of arm length; 0 limit violations; no single-frame swivel change > 5° while the target moves smoothly. | R1 |
| L77 | Hand shapes | partial | Every named shape within L30's limits; observers identify counts 1–5 from rendered, painted clips at panel size ≥ 95% (lower bound ≥ 90%, … | R1 |
| L78 | Trajectories and gesture phases | partial | Apex within [−200, +60] ms of the affiliate's stressed syllable for deictics and iconics, and within ±100 ms of the accent for beats, in … | R1 |
| L79 | Self-collision avoidance | to build | S7: 0 penetrations deeper than 2 mm on every frame of the library × 8 bodies. | R1 |
| L80 | Rest poses, idle life and breathing | to build | No interval > 2 s with all joint velocities below 0.2°/s; inhalation onsets in pauses ≥ 95%. | R1 |
| L81 | Secondary dynamics and spring chains (body, hair, loose garments) | to build | No added limit violations; apex timing (L78) still within tolerance after filtering; contact and pointing gates (L73, S8) measured on the … | R1 (hair only) |
| L82 | Motion mixer and personal style | to build | Mouth closures (S3) never broken by other layers; angular acceleration per joint bounded (no single-frame spikes) across a 10-minute run; … | R1 |
| L83 | Listening: voice activity, streaming recognition and echo guard | partial | WER/CER on the Hinglish classroom set not worse than the best single provider by more than 10% relative; S11's echo test on the shipping … | Live |
| L84 | Turn-taking, with a teacher's wait time | to build | False cut-ins ≤ 5% of student turns (B); median gap after a true end ≤ 300 ms to first reaction; answer turns per S10; after questions, 0 … | Live |
| L85 | Listening reactions, contingent on correctness | to build | S12 (both questions, every region); backchannel timing rated natural ≥ 3.5/5; divergence deixis only if, against a neutral face plus the … | Live |
| L86 | Brain and streamable performance script | partial | 100% of executed tags valid; Leak Guard tests pass, including a new test of streaming order (no clause reaches the voice before its check); … | Live |
| L87 | Barge-in and repair | to build | S11. | Live |
| L88 | Latency hiding: speculation and the bank | to build | S10. | Live |
| L89 | Clock, scheduler and adaptive quality | partial | S5 and S14 on the reference laptops; S3 with 10% injected frame drops; S3 and S8 rerun at 360 px and the frame rate on a mid-range Android … | R1 |
| L90 | Model packaging, identity packs and signing | partial | Tampered files rejected 100%; size within budget; the player bundle holds no audio, no speaker conditioning and no face embedding (a scan … | R1 |
| L91 | Self-grading build, bench and release gates | partial | All system gates of the release's profile (§2.5) green, S21 included; the owner approves a video with sound. | R1 |
Totals: 92 layers (L0–L91); 6 exist, 56 partial, 30 to build. Needed for release 1: 80 layers (12 of them as they are); 7 for the Live release only; 5 *later*.

---

## 6. Training and data

### 6.1 What is learned or authored once (shared) and what per person

| Learned or made once (shared, rebuilt when improved) | Layer | Data | Size / cost (estimate) |
|---|---|---|---|
| The template: topology, UVs, rig with twist/helper joints, weights, correctives, two LODs, 52 face units and 15 visemes, head split, generated painting attributes, plane segmentation, garment cages, scalp | L33 | MakeHuman/MPFB CC0 assets (pinned; D2 settled), built by `make_template.py` | hours of scripting on top of `build-vrm-teacher.py`; minutes to run |
| Master band set (light, half-tone, shadow on one stroke layout; brush-edge, edge-width, wrinkle, focus and hair-highlight layers) | L51 | Procedural (`paint.py`) first; staff-painted in Krita if the look spike fails (D3) | minutes to generate; 4–6 sets × days if painted |
| Face-controls / face-shape regressor (points → shape) | L19, fallback | Synthetic CC0 MakeHuman people rendered in Blender (`training/face_controls`) | 20–50k people; CPU or ≈ 10 GPU-h render |
| Head prior (30 PCA components, template topology), the pooled norm and any regional norms | L23, L24, L0 | CC0 heads + consented builds (scope 4, only once ≥ 20 contributors; refitted on revocation); published Indian and regional anthropometric means and SDs; ICT-FaceKit only if D12 | minutes on CPU |
| Foil and fairness pool builds, voice foils and the sclera model | L0, S2, S16, S22, L13 | ≈ 30 consented capture-only people, each with a printed colour card and ≥ 20 s of speech | 30 builds, once |
| Attenuation slopes per prior component and ratio (optional) | L24 | Synthetic heads of known shape rendered at capture poses and distances | ≈ 1–2 GPU-h |
| Perceptual impostor radius; the global caricature strength $\gamma$ by paired comparison (*later*, after regional norms) | L0, L24 | Bench acquaintances and regional raters | one session each |
| Sclera offset model (3 parameters per Lab channel) | L13 | Pool captures with a colour card (tested on the bench) | minutes |
| Accessory and facial-hair detectors | L14 | Synthetic renders with CC0 glasses/beards we model | ≈ 5 GPU-h |
| Monk-class painterly palette table | L41 | Generated from palette rules; a handful of numbers adjusted by the owner | — |
| Hair clump library | L47 | Generated by script (owned); 6 styles in release 1, replacing the CC0 MPFB hair style by style | — |
| Wardrobe | L48 | CC0 MPFB clothes packs re-shaded; a kurta modelled by us | days, once |
| Hand synergy space (*later*) | L77 | Consented hand captures (counting, pointing, palms) | small |
| Lip refiner fine-tune (*later*) | L67 | Consented Hindi/Hinglish/English face video (1–3 h start), `training/lipsync` | ≈ 20 GPU-h fine-tune |
| Indic voice adapter (optional, after the build) | L60 | Consented readings, 30–60 min per voice; CC0 Common Voice Hindi for robustness | ≈ 10 GPU-h |
| Acoustic models for the Montreal Forced Aligner (narration) | L61 | Common Voice (CC0) | CPU hours |
| Language-ID for Hinglish | L58 | Our own lesson text + consented transcripts | CPU |
| Turn-aware streaming ASR adapter (*later*) | L83 | Consented Hinglish classroom speech | ≈ 5 GPU-h |
| Turn-taking / backchannel models (*later*) | L84, L85 | Consented two-channel tutoring conversations (10–20 h) | ≈ 10 GPU-h |

| Per person (in the 3–4 minute build) | Layers |
|---|---|
| Neutral 3D face, metric scale, multi-view refinement with perspective and profile contour | L17–L19 |
| Expression examples, crease curves, marks and descriptors | L20, L21, L22 |
| Head completion, stylisation under the identity constraint, ears, neck | L23–L26 |
| Skeleton, posture, hands, limits, body volume, accessories | L27–L32 |
| Template fit (bounded target solve, then the residual), personal expression rig, weights, LODs | L34–L38 |
| Light, colour model with contrasts, palette, certificate, features, eyes, teeth, hair style fit | L39–L47 |
| Garment fit | L48 |
| Shading normals, occlusion, pose-indexed key-shadow bake, paint overlay | L50, L51, L53 |
| Motion-habit profile, mouth ranges, coarticulation parameters, rest poses | L16, L65, L66, L80 |
| Voice references per language | L15, L60 |
| After signing (outside S13): phrase bank; optional adapter later | L62, L60 |

### 6.2 Rules for data

- Only data we own, CC0, or licences that allow commercial training; recordings of people who agreed **in
  writing** that their recordings train NexoraGuru's models (`TRAINING.md`). Never scraped faces, voices or
  art. Never commit anyone's photos, video or packs.
- No frame, still or derivative of the reference series enters any training set, style kit, metric or test
  set; the look is a reference for people only.
- Our own lessons and solutions were drafted with AI agents, so they are lookup material only, never training
  data (`docs/voice/TRAINING.md`); this applies to any text model trained here.
- Research datasets with non-commercial terms are used **only to compare with published numbers**, never to
  train anything shipped. Models trained on such data are **check-only** (L3, D6).
- Students' voices and typed turns are used to train turn-taking or recognition only with their own opt-in
  consent (a guardian's for minors), separate from the site's terms.
- Third-party face scans (ICT-FaceKit) are used only after D12; consented builds join the norm only when
  their consent names that use (scope 4), only once ≥ 20 contributors exist, and leave it on revocation by an
  exact refit.
- Foil-pool members consent to being lineup foils and fairness controls shown to raters; bench members to
  each named use (L0, L1).
- For students under 18: live AI replies in a real teacher's voice need a guardian's consent, and nothing
  about a minor's gaze, attention or confusion is logged (L85).
- Every clip we synthesise is entered in the server's generation log (L63; model id, consent id, time, text
  hash); the log holds no audio. The fingerprint registry is *later*, with exports.

### 6.3 Datasets and models with licences

| Item | Use | Licence | Ship-OK? |
|---|---|---|---|
| MakeHuman/MPFB2 assets: base mesh, proxies, targets, rigs, eyes, teeth, tongue | Template (L33), synthetic training people and heads | CC0 1.0 (MPFB2 licence §C; §D no claim over scripted output; copy in `docs/voice/licences/2026-11-25/`) | yes; D2 settled; hashes pinned |
| MakeHuman functional packs `faceunits01` (52 ARKit), `visemes02` (15) | L33, L35 | CC0 (official pack page and each pack's records, copies in the licence folder) | yes |
| MPFB community clothes packs (`shirts01`, `pants01`, `suits01`, …) | L48 | Every item CC0 on the official pages; per-file check in `build-vrm-teacher.py` | yes |
| MPFB2 code, Blender | Building the template; rendering synthetic data | GPLv3 (internal tools; run only on our machines, never shipped or distributed; outputs are ours) | yes (outputs) |
| ICT-FaceKit Light | Optional real-scan identity modes for L23 | MIT (LICENSE read by the face reviewer); scan subjects' consent and demographics **UNVERIFIED** | only after D12 |
| Indian anthropometric norms (Farkas et al. 2005 and Indian studies) | L23 norm | published numbers, no licence issue; values **UNVERIFIED** until read | yes |
| Mozilla Common Voice | Aligner, voice robustness | CC0 | yes |
| LibriTTS-R | Aligner | CC BY 4.0 | yes (attribute) |
| AI4Bharat IndicVoices / Kathbath | Hindi ASR/aligner | CC BY 4.0 — **UNVERIFIED** | only after checking |
| IIT-Madras IndicTTS | Voice | custom licence — **UNVERIFIED**, treat as no | no |
| RASMALAI (2505.18609) | Indic TTS | **UNVERIFIED** | only after checking |
| IndicFDB | Conversation benchmark | **UNVERIFIED** | comparison only |
| BEAT2, AMASS, MEAD, HDTF, VOCASET, Seamless Interaction, VoxCeleb, FFHQ, Switchboard | Comparison only | non-commercial, research or LDC terms | no |
| MediaPipe face/pose/hands/segmentation | Stage B, drawing checks on renders, the plain-shaded fixed-point gate | Apache-2.0 | yes |
| YuNet / SFace (OpenCV zoo) | L2, L6, S1, S15 checks | MIT / Apache-2.0 weights; SFace trained partly on MS-Celeb-1M (withdrawn); YuNet on WIDER FACE (terms **UNVERIFIED**) | check-only (D6); not shipped |
| Chatterbox Multilingual V3 (`t3_model="v3"`) | L60 | MIT; archived and unmaintained since August 2026 (vendored, pinned; Perth mark removed in our copy) | yes |
| Chatterbox Hindi Single Language Pack | L60 Hindi clauses | its model card's licence **UNVERIFIED** | after the check |
| Chatterbox-Nano (English, CPU) | §7.4 option for English live replies on CPU | licence and cloning quality **UNVERIFIED** | check |
| Kokoro via HeadTTS | Default voice for the first milestone; the separate labelled presenter (L60, D5) | Apache-2.0 (Kokoro); HeadTTS MIT (copy in the licence folder) | yes |
| CosyVoice (2407.05407) | L60 second engine | Apache-2.0 (per authors) — **UNVERIFIED** for every checkpoint | check |
| wav2arkit_cpu; LAM Audio2Expression | L67 | Apache-2.0 (per `slots.json`, `TRAINING.md`) | yes |
| Whisper; IndicConformer | L83 | MIT | yes |
| Qwen3-ASR-0.6B | L1 challenge check, L60 cross-family check, L83 streaming ASR | Apache-2.0 per its model card (read 2026-11-27 by the red team); 30 languages, Hindi and English the Indian ones | yes |
| Silero VAD | L83 | MIT | yes |
| `facebook/wav2vec2-lv-60-espeak-cv-ft` | L61 shipped aligner | Apache-2.0 tag on its model card; Libri-Light's MIT licence covers its code only, the LibriVox audio terms are **UNVERIFIED** | after the Libri-Light check |
| Montreal Forced Aligner | L61 narration aligner | MIT (code); its pretrained models **UNVERIFIED**, so we train our own on Common Voice | yes (code + our models) |
| XLSR-53 phone recogniser (2109.11680); Allophant (2306.04306) | Comparisons only | weights **UNVERIFIED**; BABEL (LDC) in pre-training | check-only |
| Playwright + Chromium (headless) | L91 gate renders | Apache-2.0 / BSD (tools) | yes (tools) |
| moderngl | L91 fallback renderer | MIT | yes |
| KTX2 / Basis Universal transcoder (*later*) | L51 paint-layer compression, only if S14 fails on memory | Apache 2.0 per the three.js copy's README; upstream text to read | after the check |
| `c2pa-rs` (*later*) | L57, L63 signed manifests for exports | permissive per its repository — **UNVERIFIED** | after the check |
| PanPhon feature table | L64 feature fallback (idea source) | MIT per memory — **UNVERIFIED** | only after checking; our own table meanwhile |
| GOTCHA (2210.06186) | L1 challenge design | paper only (ideas; challenges are our own) | — |
| AudioSeal (2401.17264) | L63 | MIT, code and weights (README, April 2024) | yes |
| Perth watermark (in Chatterbox) | — (removed in our vendored copy, L60) | — | not used |
| ECAPA-TDNN (SpeechBrain) | L1 voice match, L60 gate | Apache-2.0 code; weights trained on VoxCeleb | check-only (D6) |
| Diffusion base model for the optional master-set painter (e.g. FLUX.1-schnell) | L51 variant | **UNVERIFIED** | only after checking (D9) |
| gsplat (2409.06765) | Bench comparisons, optional | Apache-2.0 | yes |
| Qwen3-8B, sarvam-m | Guru options | Apache-2.0 (per `ENGINE.md`) | yes |
| FLAME, SMPL/SMPL-X, MANO, 3DGS code, insightface, nvdiffrast, F5-TTS, MMS | — | non-commercial | **never** |

---

## 7. Runtime budgets

### 7.1 Build: ≤ 240 s on one warm 24 GB GPU (e.g., L4 / A10 / RTX 4090 class)

Stage B mostly runs on the person's device during capture, so the server starts from the identity pack.
The clock starts on a **warm** worker (weights loaded); container start, weight loading and pack download
add an estimated 30–90 s on a cold rented GPU (**UNVERIFIED**) and are reported separately (D8). Times are
design targets (**UNVERIFIED** until measured on the bench); CPU work runs in parallel with GPU work where
the dependency graph allows.

**What runs today is a different shape.** The Studio build (`pipeline.py`) calls each stage as a separate
`python -I` subprocess, starts Blender at least three times (`export_base.py`, the correspondence render,
`build-vrm-teacher.py`) and repeats stages 5–10 for three variants. The table below is the target shape (one
long-lived worker, models resident), which needs a numpy glTF/VRM writer that does not exist. **Decision
rule, week 1**: time `pipeline.py` end to end (after step 0's changes) on one rented GPU and on a CPU and
write the numbers here. If its p95 is ≤ 240 s with Blender kept, Blender stays per build and the writer is
not built; otherwise the writer is a named task in §8.6 before the talking milestone.

| Step | Layers | Device | Target (s) |
|---|---|---|---|
| Unpack, verify signature, consent, face lock, voice match | L1–L3 | CPU | 6 |
| Re-read any uploads not processed on device (on the photo-only path this lands on the critical path: ≈ 183 s, leaving ≈ 27 s of slack under S13's median) | L5–L16 | CPU (parallel) | 0–40, overlapped |
| Canonical face, scale, multi-view BA (pinhole, profile contour), expression examples | L17–L20 | CPU/GPU | 10 |
| Crease curves, marks and descriptors, head prior fit and norm | L21, L22, L23 | GPU | 9 |
| Stylisation under the identity constraint (on the mesh; $\gamma$ is global) | L24 | GPU | 3 |
| Ears, neck, skeleton, posture, hands, limits, volume, accessories | L25–L32 | CPU | 8 |
| Template fit (sparse solves, numpy/torch), expression transfer and example-based rig, weights, LODs | L34–L38 | GPU + CPU | 8 |
| Light + parametric colour model + palette + contrasts | L39–L41 | GPU | 15 |
| Information-budget certificate, patch check | L42 | CPU | 3 |
| Features, eyes (sphere fit), lids, mouth interior | L43–L46 | CPU | 4 |
| Hair style fit | L47 | GPU | 6 |
| Garment fit | L48 | CPU | 2 |
| Shading normals, occlusion bake (rest; 52 targets on the head only) and the pose-indexed key-shadow bake | L50, L53 | GPU | 5 |
| Paint overlay (the master band set is template data) | L51 | GPU | 2 |
| Voice references, mouth ranges, coarticulation fit | L15, L60, L65, L66 | GPU | 12 |
| Gates: held-out renders in headless GPU Chromium (or moderngl) with the region-id pass, likeness regression and gallery, geometry-buffer lip checks, replay, action library × limits/collisions per frame, figure–ground, certificate, perf proxy | L91 | GPU + CPU | 45 (**UNVERIFIED** until the week-1 renderer item) |
| Package, sign, upload | L90 | CPU | 5 |
| **Total (sequential critical path)** | | | **≈ 143** |
| Retry budget for failing gates | L91 | | up to 97 |
| After signing, outside S13: phrase bank (≈ 80 clips) | L62 | GPU | ≈ 80 (**UNVERIFIED**) |

In the target shape all stages run as functions in one long-lived worker process with every model resident
(L91), so process and model start-up between stages is not paid per build. The template removes about 30 s of v1's critical
path (implicit surface, remesh, UVs, heat diffusion), and painting once on the template removes most of the
per-person painting time. The optional diffusion painter (D9) would paint master sets offline and adds
nothing to this budget. The first measured end-to-end build is the week-1 timing of today's pipeline (§8.6 step 0), not the end.

### 7.2 Playback: 30 fps at 720p on an ordinary laptop

Reference devices: an Intel Iris Xe-class integrated GPU laptop and a 2020 MacBook Air (M1), Chrome and
Safari. Frame budget 33.3 ms at the fixed 30 Hz cadence (L56); target GPU ≤ 15 ms and main thread ≤ 6 ms so
the lesson page stays smooth, measured with a lesson animation running behind the panel (the viz player,
framer-motion and the theme scene share the GPU). Estimates, to be measured (**UNVERIFIED**) by the spike
frame of §8.6 before any Stage F code is written:

| Work | Where | Target |
|---|---|---|
| Face and body layers (blinks, head, gaze, attention, emotion), arm solver, hands, swept collisions, springs, mixer (mouth values arrive from the server) | Worker | 2.0 ms |
| Hair (and later loose-garment) spring chains (≈ 40 spines) | Worker | 0.4 ms |
| Upload pose (≈ 70 bones + 52 values + correctives) | Main | 0.3 ms |
| three.js render submission (scene traversal, uniforms, ≈ 30 draw calls); if the spike measures more than 3 ms, render from the worker through `OffscreenCanvas` (Safari support **UNVERIFIED**) | Main | 1.5 ms (**UNVERIFIED**) |
| Skinning (body) + active morphs on the head geometry (≈ 7k vertices, three.js skips zero influences) | GPU VS | 1.2 ms |
| Key-light shadow map 1024² (hair, hands, arms, head casters; no face self-shadow) | GPU | 0.8 ms |
| Forward pass into the canvas at ≤ 720 physical px with context MSAA: palette atlas × master bands × stroke variation, data layer (brush-edge, widths, focus, wrinkles), distance-field lines, rim, highlights, eyes, dither (about the same fetch count as v3's: the atlas removes the region logic, the line and variation channels add two) | GPU | 4.4 ms |
| Hand and forearm hull (≈ 3k vertices) | GPU | 0.2 ms |
| Browser MSAA resolve and compositing (no offscreen blit, no line or composite pass) | GPU | 0.3 ms |
| **GPU total** | | **≈ 6.9 ms** |

Download per teacher ≈ 6 MB (budget ≤ 8 MB): fitted positions and LOD ≈ 1.5 MB compressed; head morph
targets ≈ 2.5 MB as sparse fp16 deltas (positions plus shading normals over ≈ 7k vertices would be ≈ 4.4 MB
dense; **UNVERIFIED** until exported); the colour-slot deltas (threshold offsets and occlusion per target) ≈ 0.6 MB and
the position-only correctives ≈ 0.4 MB (both **UNVERIFIED**; L50 and L53 bake the 52 face targets, while
L37's 24 pair correctives carry positions only, which is why L37 holds 76 targets); the paint overlay
≈ 0.45 MB (with the distance-field and variation channels, after the spike's "go"); the pose-indexed shadow
bake ≈ 0.25 MB; hair and garments ≈ 0.5 MB; ≈ 6.2 MB in all. The template with its master band set (paint
layers ≈ 3 MB as WebP or PNG in release 1, data layers uncompressed with Brotli) is cached once for all
teachers; KTX2 and its transcoder (measured in three.js r187: `basis_transcoder.wasm` 527 KB raw, 245 KB
with gzip -9, plus a 57 KB JS loader) are *later*, only if S14 fails on GPU memory. GPU memory for morphs ≈ 14.6 MB (L37). Phrase bank ≤ 2 MB,
later. As a
sanity bound, skinned Gaussian avatars reach 40–50 fps on a phone and 240 fps on a laptop GPU in a
web/mobile system (2510.13978). The first numbers come from profiling the seven teachers the site already
plays (skinned Rocketbox models with ARKit morphs through TalkingHead/three.js, 3–5 MB each, in
`client/public/teachers/`) and one MPFB export with the band shader, in week 1 (§8.6).

### 7.3 Conversation latency (student stops → teacher)

Version 1 left out recognition time. With it:

| Step | Target |
|---|---|
| End-of-turn decision (streaming ASR boundary + silence + semantics, L83–L84) | 350–500 ms after the last word (2609.04225 reports a 0.39 s median) |
| Visible attention cue (L88) | 250 ms after the last word, in parallel (intake breath only after the turn decision) |
| Bank phrase audio (local, L62) | ≈ 100 ms after the decision → first audio ≈ 0.5–0.7 s |
| Brain first clause (streamed; the speculative draft may already exist) | 0.3–0.6 s |
| Clause Leak Guard (L86) | < 50 ms |
| Voice first chunk, multilingual model (L60) | 0.3–0.6 s (**UNVERIFIED**; Hindi slower than English) |
| Alignment and mouth path for the chunk (L61–L67, server) | < 50 ms |
| Network both ways | 50–100 ms |
| **First content clause** | **≈ 1.2–1.8 s** (S10 median ≤ 1.8 s, for student questions); lower once speculation (*later*) is right |

When the student has *answered* a question, wait time II (L84) is a **floor that overlaps** this latency:
the verdict's first audio starts at max(hold, first clause ready), with a neutral receipt cue at the turn
end, so answer turns are gated on their total gap (S10, median ≤ 2.5 s), never on hold + latency.

For comparison: human Hindi listeners respond in about 0.26 s, and the best published Hindi duplex model
takes about 2.0 s (2604.23295).

### 7.4 Server cost and concurrency (the "free where possible" budget)

| Load | When | Cost |
|---|---|---|
| Lesson narration (audio, phone times, 52 values, gestures) | Once per lesson × teacher model, at publish time, on the build GPU | One-off GPU time; play time is static files (free) |
| Phrase bank | After the model is signed (§7.1, L62), outside S13 | ≈ 80 GPU-seconds per teacher, once |
| Live replies in the cloned voice | Per clause while a student talks | **Not free**: needs a GPU worker up during sessions. Concurrent streams per GPU and cost per student-hour (GPU-hour price ÷ concurrent streams × share of time she speaks) are measured on the bench before launch; no number is assumed here |
| Streaming ASR | Per student turn | Small model on GPU or CPU — **UNVERIFIED**; the free cloud chain for finals |
| Brain | Per turn | Guru's free providers with failover (existing) |
| CPU fallbacks | When no GPU is up | Never another voice on her face (L60): captioned text with listening and thinking cues, or a separate, labelled presenter (Kokoro); for English, Chatterbox-Nano on CPU is worth measuring as a cloned-voice option (its README reports 3× real time on 8 CPU cores; ARM speed, cloning quality and licence **UNVERIFIED**) |

The owner chooses whether live cloned replies are offered at all (D5). Said plainly: with no GPU kept up,
most students will not hear the teacher's own voice in live turns, only in narrated lessons.

---

## 8. Evaluation protocol

### 8.1 Metrics

| Family | Metric | Used in |
|---|---|---|
| Likeness (machine, regression) | Identity direction cosine and ratios on mesh vertices against the matched norm; rank-1 against the L0 gallery at a perceptually calibrated radius; landmarker and SFace as render-sanity checks only | S1, L24, L91 |
| Likeness (human, release) | Acquaintance lineup (≥ 5 per person, pooled) and stranger photo-to-render matching (≥ 30 per person, pooled), with foils from the real-person pool rendered with the target's own attributes, CIs, catch trials; the colour-only identification test; the global $\gamma$ pilot by paired comparison (*later*); owner's side-by-side sheet | S2, S15, L24 |
| Shape | Face point error (% of eye distance) on held-out frames; silhouette IoU for head, hair, body | L17–L34 |
| Lip sync | In the gate render's geometry buffer: per-class closure and contact rates (S3, S4) on realised phones, with injected frame drops, frontal and at L72's yaws; jaw chatter; join continuity; geometric mouth range and the replay gate (S6, L67); browser A/V offset (S5); secondary: MTM, PLRS, SLCC (2503.20308) and the coarticulation path measure (2610.03436). SyncNet-style scores (2008.10010) are reported only for comparison, because they reward timing even when shapes are wrong (`ENGINE.md` §4) | L64–L67 |
| Voice | Voice likeness by acquaintances against cloned foils, with MOS (S22); ECAPA speaker similarity vs. real-vs-real ceiling (check-only); ASR round-trip WER/CER with a family the selector did not use; clause-to-clause consistency against the person's own reading, with the real-reading sanity arm; truncated or babbled clauses; watermark detection (reported); generation log | L60, L63, S22 |
| Physical | Per-frame joint-limit violations and penetrations on the final pose, pointing and gaze-only perception and line error, apex–affiliate and apex–accent offsets, late strokes, angular-acceleration spikes, hands-in-frame share | L73–L82 |
| Conversation | First-reaction, first-audio and first-clause latency including recognition, barge-in stop time, self-interruptions, false cut-ins, wait-time cut-ins, automatic ladder steps, backchannel timing, S12 per region, attribution (S20) | L83–L88 |
| Teaching | Pre-test, immediate and 1-week delayed post-test, one transfer item; gaze on the active element during steps; cognitive load; parasocial interaction | L72, §8.4 |
| Rendering | fps and p99 frame time on reference laptops and a phone; band-island count (L50); flicker and edge crawl (L55); figure–ground contrast (S19); style rating, sameness and style distance (S18); the fixed-point gate (L91) | L49–L57, L89, L91 |
| Fairness | All of the above by Monk Skin Tone group, sex, age band, glasses, facial hair (monitored on the bench; gated on the extended set) | S16 |
| Integrity | Information-budget certificate (count and bandwidth), painter audit, provenance completeness, check-only rule, label and manifest presence, deletion and revocation tests (packs, derived files, norm refit), the consent attack set | L1–L3, L42, L57, L63, L90 |
| Gate liveness | Every machine gate red on its threshold mutant (≈ 1.25×), shipped as a test; catch trials in every rater session; each sampled gate's operating-characteristic sheet | S21, L91 |

### 8.2 The bench: 8 people (L0)

Eight adults who consented in writing to being on the bench (or whose material has a licence allowing this
use), chosen to cover: both sexes; Monk Skin Tone groups from light to deep (at least 3 people in groups 6–10);
ages 20–60; glasses (2); beard or moustache (2); long hair (2), short hair (2), a head covering if a
volunteer agrees; one capture on a cheap 480p webcam and one on a good phone. Each person gives: the standard
guided capture; a **second-day** capture for held-out tests (harder than the same-session split used so far);
5 minutes of reading in English and Hindi/Hinglish with the face visible (for lip, replay and voice gates);
2 minutes of free explanation with hands visible (for gesture style and rest poses); a ruler measurement of
hand length and palm width; one capture per day with a colour chart in frame. Controls: every person's
model is scored against the other seven, the foil pool and ≥ 50 synthetic hard negatives near them
(impostors). **Foil and fairness pool**: about 30 more consented adults give only the 3-minute guided
capture and are built by the same pipeline; S2's matched foils are drawn from them (the other seven bench
people cannot match sex, Monk group, hair, glasses and brows for most people: two wear glasses, two have
beards, three or more are in Monk groups 6–10), and they are S16's extended set, so one recruitment serves
two gates. Eight people cannot support per-group fairness gates (S16): they are reported, and gated on the
extended set or synthetic heads for the colour layers. **Raters we can staff**: ≥ 15 acquaintances per
person would mean about 120 recruited acquaintances; S2 instead uses ≥ 5 acquaintances per person (pooled
across the bench) plus ≥ 30 opted-in NexoraGuru students per person on a stranger matching task, gated on
the pooled figure (at n = 30 a single person's 95% interval is about ±16 points), and reports both; the
same acquaintances rate S22's voice lineups in the same session. Lineup foils are pool builds rendered with
the target's own hair, glasses, facial hair, head covering and garment (L0), so the pool need not cover
every combination. S12's raters come
from at least North, South, East, West and Northeast India. Every session has catch trials (L0).

### 8.3 Owner review

Side-by-side sheet per person: real photo, neutral render, three-quarter render, smile render, and a 20 s clip
with sound, over a light and a dark theme background. The owner rates likeness ("clearly them" / "looks like
a relative" / "not them") and style match against references 1–8 (1–5). Nothing ships without the owner
approving a video with sound (`SPEC.md`). The sheet and clips are sent as MP4 links at 360 and 720 px with a 1–5 rating and one
sentence. The person themself sees their model both true and mirrored (and, *later*, the $\gamma = 0$ vs.
pilot pair; they may lower $\gamma$, never raise it, and their pick is recorded); their own likeness judgement is never used as a gate, because people prefer the mirror image of
their own face while their friends prefer the true one (Mita, Dermer and Knight 1977), and people prefer
enhanced versions of their own face (Epley and Whitchurch 2008, **UNVERIFIED**). The cloned teacher is also
asked "would I teach like this?".

### 8.4 User study: does a likeness of *their own* teacher help?

The project's premise is that a clone of a teacher the student knows helps more than a voice or a generic
presenter. The study is designed to test that, not only to rate naturalness.

- **Participants.** Target 96 students in two strata of 48: students who **know** the cloned teacher and
  students who do not; stratified by Hindi- vs. English-medium schooling and by phone vs. laptop; recruited
  from NexoraGuru users who opt in; consent and the right to withdraw; adults (18+) only, or guardian consent;
  the cloned teacher's consent names the study (scope 6); an independent ethics review before recruiting
  (D10).
- **Conditions** (between-lesson, within-subject over three matched lessons in a Latin square, so no lesson
  is seen twice and "lesson" is a real random effect): (A) Pratibimb full; (B) Pratibimb without listening
  reactions, attention sharing and deictic pointing (ablation); (C) a real teacher on recorded video doing
  the same lesson and answering the same scripted questions (Wizard-of-Oz for live answers); (D) the same
  cloned voice and lesson animation with **no presenter** (the image principle); (E) a **generic painted
  teacher** who is not a clone, with a default voice. Each participant sees three of the five, balanced.
- **Task.** A 6-minute lesson segment (e.g., binary search) with 3 student questions and one scripted wrong
  answer, in English or Hinglish by the student's choice.
- **Measures.** Learning: a pre-test, an immediate post-test, a **1-week delayed** post-test (where the
  positivity effect appeared, Lawson et al. 2021) and one transfer item. Perception: Ho–MacDorman humanness
  and eeriness indices (Ho and MacDorman 2017, *IJSR* 9), appeal, a cognitive-load scale, a
  parasocial-interaction scale, "felt listened to", trust, clarity, GENEA-style appropriateness of gestures
  (2208.10441, 2308.12646, 2608.10839; review 2101.03769), "she spoke the way I speak" (L58), "was she
  disappointed in me?" and "did she agree?" on the wrong answer (S12), the attribution questions of S20 ("was this voice recorded
  by [name], or made by AI?", "did [name] approve these words?"), and the step quiz with attention sharing
  and the narration–step timeline on vs. off (L72). Open comments. (Instrument suggestions such as Leppink 2013 and the
  Agent Persona Instrument: citations **UNVERIFIED**.)
- **Analysis.** Linear mixed-effects models with participant and lesson as random effects; pre-registered
  hypotheses: H1 A ≥ B on "felt listened to", appropriateness and delayed post-test; H2 A > D and A > E on the
  delayed post-test among students who know the teacher (the premise; if not, likeness does not earn its
  cost); H3 A not worse than C on the delayed post-test (equivalence margin 10%); H4 eeriness of A ≤ E. Effect
  sizes with confidence intervals.
- **Ethics.** Every condition shows the AI-generated label and the provenance cue; no deception about the
  nature of A, B, D and E; data stored without names.

### 8.5 Ablations (to show each new idea earns its place)

**Rule for every look ablation**: all looks share one fitted VRM and switch only in `look.ts`, so each arm
is rendered from the same `renderAt(t)` frames, timing and face; a preference can then come only from
shading, never from fit or motion (the same-pipeline control; as a way to gate each stylisation feature,
novelty **UNVERIFIED**). Parametric colour vs. parametric plus contrast features vs. a band-limited colour field (S1, S2: the numbers
for owner decision D1); *later*, the global $\gamma$ pilot over {0, 0.05, 0.10, 0.20} by paired comparison, with and
without brow and lid-crease exaggeration, with eeriness and regional "mocking" checks (S2, S9);
de-attenuation on/off (second-day agreement, S2); salient
marks and lid/hairline descriptors on/off (S2, owner); procedural vs. hand-painted master band set (S18,
sameness), and either vs. v1's toon bands plus screen-space Kuwahara (flicker, S18, GPU time); the implicit-fairing proxy
with and without the planar snap (band islands, S18, S2); per-person pose-indexed key shadow vs. template
offsets (owner's three-quarter sheet, S2); far-side contour edge on/off; brush-edge threshold maps on/off; wrinkle layers
on/off (expression readability, L68's recognition test); cast shadow on/off
(owner's style rating); silhouette hull on/off (S18); lattice alignment vs. G2P-string timing (S3, S4 on
realised phones); aperture constraint with a free jaw vs. per-value closure constraints (jaw chatter, S3);
personal coarticulation parameters on/off (replay error, cross-language on the Hindi reading when fitted on
English only); rule–network fusion vs. network only (S3, PLRS); head–prosody coupling vs. drift only
("moves like them"); task-space paths plus springs vs. joint-space key poses (S7 per frame, S9);
text-planned vs. audio-planned gestures (late strokes, apex offsets); gesture-led prosody on/off (S8 pick
time); legible vs. finger-ray pointing (S8); attention sharing with and without the minimum head yaw (quiz,
gaze on element, gaze-only picks); correctness gate on backchannels
on/off (S12, trust); divergence deixis vs. a neutral face plus the same question (judgemental rating,
self-correction time); speculation plus phrase bank vs. neither (S10, *later*); best-of-N narration vs. N = 1 (truncated and
babbled clauses, S22).

### 8.6 Build order: a convincing result first

The riskiest unknown is still the look, so it is tested first, in motion, at shipping size, with kill,
redirect and go thresholds written before anyone watches. Version 5 starts from the pipeline the Studio
already runs instead of rebuilding it, and fixes that pipeline's breach of the brief before anything else.
Every result the owner judges is sent as MP4 links at 360 px and 720 px plus a one-page side-by-side sheet,
answered with a 1–5 rating and one sentence (the owner often works from a phone), not a meeting.

0. **Step 0, days 1–10: fix the live build, then the first judgeable clip.** None of this needs the bench,
   the foil pool, the headless GPU renderer or the certificate.
   - *Day 1–2, remove the photo bake (§2.4).* In `pipeline.py`, stage 6 (`bake_skin.py`) is replaced by a
     parametric stand-in: one colour per region from the colours `analyse.py` already measures (L40's
     fallback) over the template's own CC0 skin; stage 7 draws the traced feature curves (L43) onto that
     skin, not onto a photo; stage 8 then filters a photo-free texture, for every style. Stage 10 chooses
     among variants by L34's mesh error and S1's margin, with SFace as pass/fail only (D6). Models built
     before the change are marked not publishable in `src/routes/pratibimb.js`. `bake_skin.py`'s output on a
     test head is kept under `tests/` as S15's first mutant.
   - *Day 2–3, one lip table.* The fixed table of `phonemes.py` (commit 5fa24edb) moves into one data file
     read by `client/src/pratibimb/engine/lipsync.ts` now and by the server's mouth path later (L64), so the
     Studio player's lips use it; S3 and S4 checked in numpy on the morphed mesh for HeadTTS sentences.
   - *Day 1, ask the owner* for D10 (recruitment and ethics review are the real critical path: every Stage
     C–F "done" waits on them), D6 (with its plan B) and D16 (S2's fallback target).
   - *Day 3–4, time the pipeline* end to end on one rented GPU and on a CPU (§7.1's decision rule).
   - *Day 3–8, the band look.* A `look: 'band'` variant in `look.ts`: three value bands and the rim through
     `onBeforeCompile` on the MToon material already used, reading one RGBA8 texture per band made by
     `paint.py` over plain template renders and baked to UV with `bake_skin.py`'s tracer (L51's spike
     version). Flags, each A/B on identical frames: L53's per-person pose shadow bake, L52's far-side edge,
     L52's dark-theme edge and additive hair rim.
   - *Day 8–10, film and judge.* The owner (who consents to their own build) and one consenting staff
     volunteer through `pipeline.py`; with `talkrender.cjs` or `film.cjs` (SwiftShader is fast enough for a
     300-frame clip): a 10 s head turn (±25°) and one HeadTTS sentence, at 720 and 360 px, light and dark
     themes; a 3 s hold at 20° yaw for nose form; black hair over a dark theme; the face recoloured at Monk
     3, 6 and 9 × two hue angles (palette only); shown beside the current "painted" look and the seven
     Rocketbox teachers. **Thresholds written before viewing**: go if the owner rates motion ≥ 3.5/5 and ≥ 70%
     of 10 raters prefer the band clip to the current look; kill below a line the owner sets beforehand;
     between them, redirect to a staff-painted master set (D3). Each flag is kept only if it wins its A/B.
1. **Weeks 2–3.** The performance spike (the seven site teachers and one band-look VRM on an Iris Xe laptop
   and an M1, with a lesson animation behind the panel; frame-time percentiles; morph loading as main-thread
   task lengths); the headless GPU renderer with the region-id pass (week 3); the rest of L64 (diphthongs,
   stress, feature fallback, inventory gate). Each gate's pull request ships its mutant as a test (L91).
2. **Weeks 2–5, "talking likeness".** L34 on top of `solve_face.py` (the residual fit, numpy); expressions
   by transfer plus refinement (L35); L40–L42 with the partition of unity and the certificate; the master
   band set grows from the spike version only with what won its A/B (L51–L53); lips through L64–L66 driven
   by HeadTTS/Kokoro's exact phone durations (no cloned voice, no aligner); head and gaze idle. Gates: the
   owner's sheet with a shading ablation (template vs. per-person shadows, so the owner sees what carries
   likeness), and S3/S4 on the mesh for the 2 smoke-bench people. **S2 pilot** on the smoke bench and the
   first pool builds, after D16 is written. The import route's fresh-consent rule (L1, L90) lands before
   any staff member other than the owner builds a model.
3. **Weeks 5–8.** The cloned voice for narration only (L60 with best-of-N and the content check, L61 with
   the lattice), the narration–step timeline (L72), S22 with the S2 sessions; a body on the MPFB rig with
   three actions (namaste, point at an element, open palms) on the arm solver with task-space paths and
   springs (L73, L76, L78–L82), replacing `player.ts`'s key poses; attention sharing (L72).
4. **Weeks 8+.** Release 1 (narrated lessons) on the R1 gates with S21's CI listing. Live conversation only
   after D5 and D13, as the second release on the Live gates (phrase bank, listening reactions, echo guard,
   barge-in); then everything marked *later*, each entering with its gate measured on the smoke bench, the
   full bench before each release.

**Size, said plainly.** §5.12 marks 80 layers as needed for release 1 (12 of them as they are), most of the rest partial, and four
human rater gates (S2, S8, S9, S22; S18 is the owner's) need about 38 captured people, 40 acquaintances and
about 240 students after an ethics review. With one or two engineers that is an estimate of 5–7 months to
release 1 once D10 is settled (**UNVERIFIED**; the week-1 timing and the weeks 2–5 milestone will correct
it), with recruitment, not code, on the critical path.

### 8.7 Code modules and the harness

**One avatar stack: MPFB template → `pipeline.py` → VRM → `client/src/pratibimb/engine/` (three.js and
three-vrm).** Reason: it is the stack that runs in production today (Studio worker, Studio page and teacher
panel), and it already has what the other stack would have to build: a CC0 template with a rig, five-finger
hands, 52 ARKit face units, visemes, clothes and hair (L33); a face fit bounded to the space of CC0 human
heads (`solve_face.py`); a reader-bias-cancelling reference; a player with idle life, four states, gestures,
HeadTTS-timed lips and a deterministic `renderAt(t)`; run-time look switching (`look.ts`). The other stack
(`scripts/pratibimb/engine/`: its own mesh from the points, tube bodies, colour splats fitted to pixels, its
own WebGL player) would need its own rig, hands, clothes and body, and its colour model fits pixels.
**Salvaged into the chosen stack**: `stylise_map` and `make_hair` (`anime.py`), the procedural painter
(`paint.py`, now painting template renders), the `STUDIO` lights (`twin.py`), the fixed phone table
(`phonemes.py`, as a shared data file), the `COMMERCIAL_OK` ledger (`build.py`), the held-out split and
tests. **Frozen as bench baselines only**: `splats.py` and `build.py`'s appearance (they fit pixels), and
the Living Portrait (`portrait.py`). Nothing from the frozen parts ships.

Fourteen code modules are the unit of ownership; each layer belongs to one. Capture (Stage B: `capture.py`,
`pack.py`, `upright.py`, `analyse.py`); shape (L17–L32: `fit/shape.py`, `solve_points3d.py`); template
(`export_base.py`, `build-vrm-teacher.py`, L33); fit and rig (L34–L38: `solve_face.py`, `solve_detail.py`);
colour and certificate (L39–L42, L22); paint (master set and overlay, L51: `paint.py`, the texel tracer);
eyes, mouth and hair (L43–L47: `paint_features.py`); player and renderer (`player.ts`, `look.ts`, L49–L57,
L89); voice (Stage G); mouth path (L64–L67: the shared table, `lipsync.ts`, the server solve); face and
attention (L68–L72); body (Stage I); conversation (Stage J); and the bench harness (L0, L91: `bench.py`,
`likeness.py`, the render scripts), which owns every gate. `pipeline.py` is the build's driver.

---

## 9. Risks, open problems and what is new

### 9.1 Top risks

1. **The style is the unmeasured bet.** No owned style kit, no artist, and a procedural painter that has
   never produced a frame like references 1–8. Mitigation: the look spike in week 1, in motion at shipping
   size, with kill, redirect and go thresholds written before viewing; the master band set as the one place a
   painter's hand enters, cheap to replace (D3: staff in Krita first, paid art only if both fail); stroke
   size set in screen pixels; S18 over light and dark backgrounds on moving clips; sameness checked on the
   stroke-variation map.
2. **Stylisation and the pixel ban vs. likeness.** Photo-trained recognisers score painted renders out of
   domain, the parametric colour model carries less identity than a colour map, and no machine score can
   find the caricature advantage. Mitigation: likeness in geometry measured on the mesh; a matched norm;
   marks, lid crease, hairline, brows and contrast features as numbers; the person's own nose and socket
   shadows baked from their mesh (L53); S2 as the only likeness release gate, with a pilot in week 5 and a
   fallback target written first (D16); the D1 ablation gives the owner the cost in numbers. Release 1 has
   no caricature ($\gamma = 0$), so its likeness rests on shape, hair, brows, glasses and shading.
3. **Hands.** Few hand shapes are captured, fingers occlude each other, and hand animation is where avatars
   look wrong first. Mitigation: template five-finger hands with three measured numbers per hand, goal-based
   shapes with limits and coupling, per-frame collision, a smaller launch library, shapes judged as rendered
   painted silhouettes.
4. **Hindi/Hinglish voice and lips.** Cloned Hindi still trails the best commercial voices; the chosen TTS is
   archived; code-mixed text causes pronunciation errors; lip-sync models are mostly trained on English.
   Mitigation: the dedicated Hindi checkpoint, per-language references, clause-level synthesis, a maintained
   second engine behind the same slot, lattice alignment on the spoken audio with a shipped aligner, per-class
   gates on realised phones; the first milestone needs none of it (default voice with exact phone times).
5. **Browser performance on weak laptops and phones.** Unmeasured until the spike; morph and corrective
   memory is the likeliest S14 failure on Iris Xe. Mitigation: profiling the site's existing teachers first,
   with a lesson running; one WebGL2 back end and one forward pass into the canvas; a written morph slot table
   in half floats, morphs only where they move, built off the main thread (L37); the internal-resolution cap;
   a fixed 30 Hz cadence; tiers from frame time and a phone tier (L89). Texture-format coverage (BC7, ASTC,
   ETC2 per device; M1 Safari **UNVERIFIED**) falls back to uncompressed RGBA8.
6. **Build clock.** Today's build is a subprocess per stage with Blender started several times per variant;
   §7.1's table is a target shape that needs a VRM writer we do not have. Mitigation: time `pipeline.py` in
   week 1 and apply §7.1's decision rule; the phrase bank after signing; the renderer in week 3.
7. **Impostor and foil realism.** The head prior is mostly MakeHuman-modifier heads, so synthetic hard
   negatives are MakeHuman-like, not real-face-like, and synthetic lineup foils would lack the measured
   detail of the true render. Mitigation: the real-person foil pool for S2 (L0), the perceptual radius, S1
   demoted to a regression test, validation against S2, real-scan modes only after D12.
8. **Live-conversation cost, latency and honesty.** Live cloned speech needs a running GPU (not free); without
   it most live turns are not in her voice. Mitigation: pre-rendered narration, the bank, captions or a
   separate presenter instead of a second voice on her face, honest S10, owner decision D5 stated with its
   consequence.
9. **Misuse of a cloned voice and face; misattribution.** The likeliest misuse path was the identity pack: a
   portable ZIP of photos and a clean voice, importable into any account on its own consent field.
   Mitigation: unsigned packs refused (done); live challenge consent with face and voice match on every
   build and every import (L1, L2); packs encrypted to their subject, numbers-only by default, revocable by
   id (L90, D15); envelope keys for every derived file (L3); the voice reference and face embedding only in the
   server bundle (§4.3, L90); signed models that load only in our player; visible label (a site guarantee);
   AudioSeal as a cooperative, reported mark plus a server-only generation log, with the fingerprint registry
   and signed manifests when exports exist (L63); the per-utterance provenance cue (S20); the persona contract and the teacher's
   switch (D13); per-use scopes. Residual risks, stated plainly: real-time voice clones and face swaps that answer the
   challenge; copies saved from a licensed browser; plain-ZIP packs downloaded before this rule; a mark
   stripped by re-encoding.
10. **Bias.** Albedo and skin-tone estimation are biased towards light skin, and the sclera is not neutral
    for older and deep-skinned people; banded shading reads poorly on deep skin if it relies on value contrast;
    a face space whitened on a light-skinned majority treats South Asian features as "deviations", and a
    pan-Indian norm treats regional features the same way; face recognisers vary by group; teachers may ask
    for lighter skin. Mitigation: eye-white calibration with an age- and Monk-dependent prior checked against
    a colour chart (L13), the generated Monk palette table that carries form by rim and bounce, dither and the
    deep-skin-over-light-theme cell of S19, the two-level matched norm with caricature on the within-group
    residual only (L23, L24, D14), the colour-edit policy (L41), fairness reported per group and gated on the
    foil pool.
11. **Licence contamination.** One non-commercial weight would taint the model, and research-trained models
    might choose parameters. Mitigation: L3 ledger as a hard gate, the check-only rule (D6), UNVERIFIED items
    in §6.3 not used until checked; GPL tools only on our own machines.
12. **Uncanny, cold or mocking behaviour.** Kinematic gestures look robotic between key poses; a caricature can
    read as mockery; mismatched stylisation of shape and material is eerie. Mitigation: shoulder rhythm,
    task-space paths, springs, rest poses, speech-planned breathing, per-frame gates; a small global $\gamma$
    with an eeriness check and the person's choice; the D7 slider moves shape and material together.
13. **Pedagogical harm and over-reliance.** A teacher who nods at a wrong answer, looks disappointed, pulls the
    eyes off the lesson, or invites personal chat damages learning. Mitigation: agreement only on final,
    graded transcripts; no negative faces after a wrong answer; attention sharing; the persona contract's
    "this is about the lesson" boundary and no claims of personal memory or feelings; S12 per region.
14. **A teacher leaves.** Revocation removes every lesson they narrated. Mitigation: D11's continuity rule,
    told to the teacher before consent.
15. **Schedule and people.** About 80 layers are needed for release 1 (12 as they are) and four rater gates need about 38
    captured people, 40 acquaintances and 240 students after an ethics review; recruitment, not code, is the
    critical path. Mitigation: step 0 needs no bench; D10 asked on day 1; the "needed for R1" column of §5.12
    so release-1 gates cannot pull in *later* layers; S16 monitored, not gated, in release 1.
16. **Gates that cannot fail.** A green report would not mean a good teacher if a gate is tautological
    (v3's sclera gate), measures its own detector (landmarks on paint), sits at ceiling (lineup accuracy for
    $\gamma$), or tests a pipeline on data from its own span (the fixed-point gate on MakeHuman heads).
    v4 still had some: S1's cosine and S7's "0 violations" after a clamp held by construction, S3 graded the
    mouth on its own aligner's labels, and several rater gates passed when too few people were asked.
    Mitigation: a decision rule on every gate (§2.5), mutants at 1.25× the threshold shipped as tests,
    operating-characteristic sheets, catch trials (S21, L91), closures counted from hand labels too, the
    clamp's own activity gated, test heads outside the template's span, and the colour-only identification
    test beside the bandwidth-bounded certificate.
17. **The live build breaks the brief today.** Until §8.6 step 0 lands, every Studio model carries photo
    skin (§2.4); if one is shown or exported, the brief's one hard rule is broken in public. Mitigation: step
    0 first, earlier models marked not publishable, `bake_skin.py` kept as a test mutant only.
18. **Voice likeness and echo on real devices.** The voice had no human likeness gate (now S22), and the
    browser may not cancel echo for Web Audio playback. Mitigation: S22 with cloned foil voices, best-of-N
    narration with a cross-family check, loopback playback through the peer connection, S11 on three browsers.

### 9.2 Open problems

- A painted look that people *and* machines recognise as the person: there is no accepted likeness metric
  for stylised portraits; the direction-in-face-space constraint is a proposal to be validated against S2,
  and the caricature strength can only be found perceptually.
- How much likeness the parametric colour model costs against a colour field (D1's ablation).
- Reliable 3D hands from a few phone frames without a hand model trained on non-commercial MRI or scan data.
- Lip-sync gates for languages beyond English and Hindi without per-language video (the IPA route should
  generalise; it must be tested per language).
- Turn-taking in Hinglish tutoring: no public two-channel corpus with commercial terms; we must record our own.
- Whether Hindi-speaking students read "hmm" and the head wobble as agreement (S12's perceptual test).
- A second-day held-out test is harder than the same-session test reported so far for the Living Portrait
  (97–103% of ceiling); expect lower numbers.
- Whether a procedural master band set can reach the reference look at all (the look spike), and whether
  shared masters make teachers look like siblings.
- Whether a clone of the student's own teacher teaches better than a voice or a generic presenter (§8.4, H2).
- Regional anthropometric norms for India are thin in the literature; until they exist, most people get
  $\gamma = 0$ (D14).
- Consent against real-time puppeting that answers a live challenge has no complete defence today.
- Ideas kept for later, untested: a clear-speech repair mode (slower, larger articulation within the
  person's range) for the Live release; contrastive focus taken from the lesson's frame diff to place the
  accent, the lip stress and the beat; feature weights tuned to display size by paired comparison.

### 9.3 What is genuinely new here, and what is not

Not new (prior art we build on): dense-landmark face fitting, personalised blendshapes, template fitting by
non-rigid ICP, authored shading normals and painted light in stylised production, shadow maps, inverted-hull
lines, SH light estimation, dominance coarticulation and JALI, analytic arm IK and scapulohumeral rhythm,
minimum-jerk reaching, gesture phases, voice activity projection and semantic endpointing, speculative
response generation and context cuts at the played audio (Voice-Light 2609.20995), zero-shot voice cloning,
audio watermarking and retrieval-based provenance, challenge–response liveness, legible pointing (Holladay
et al. 2014), forced alignment over pronunciation lattices (as MFA does; applying it to TTS output is common
practice), distance-field lines, implicit fairing, mutation testing,
LLM tutors, the caricature advantage and norm-based face coding, example-based facial
rigging and deformation transfer, perspective-aware face fitting, art-directable stylised shading and
expression wrinkle maps, tonal art maps, instructor guided gaze and the positivity principle, wait time. Each
is cited at its layer.

New or, to our knowledge, not previously combined this way (to be confirmed by a wider literature search
before any external publication — **UNVERIFIED as novelty claims**):

1. **Measurement-only appearance with an information-budget certificate** (L40–L42): the model lists every
   photo-derived number with its kind and spatial bandwidth, so no dense field can carry a recognisable
   picture; the painter provably never sees a photo. (A good framing whose soundness rests on the bandwidth
   bound, not on the count.)
2. **Stylisation constrained by identity direction, with caricature on the within-group residual** (L23,
   L24): stylisation may not rotate the face's direction in whitened identity coordinates (a simple
   constraint, value untested); exaggeration applies only to the deviation from a regional norm, at a
   strength found once by paired comparison, which the person may lower (after release 1); and the
   pipeline's own shrinkage towards its priors is measured and undone (de-attenuation; untested).
3. **A painted master band set on a scripted template, recoloured per person by measured colour numbers
   and chosen by a stabilised, identity-keeping shading normal with broken, per-region edges** (L50–L52),
   for a painted look that is stable by construction at laptop frame rates, with the person's own key
   shadow baked per head pose from their measured mesh (L53).
4. **Lips from the phones actually spoken**, solved as one trajectory of lips, jaw and tongue with
   must-hit constraints on lip aperture and a free jaw, and **personal coarticulation parameters per
   articulatory class that transfer across languages** (L61, L65; the lattice alignment itself is MFA
   practice; the personal parameters are untested).
5. **Legible deixis bound to a live web lesson and planned from streamed text** (L75, L78): the arm line
   lands on the exact element of the animation step, whose candidates the lesson publishes; the legibility
   optimisation is prior art (Holladay et al. 2014), the binding to live lesson elements and the text-first,
   audio-re-timed plan are ours.
6. **Correctness-contingent listening with a teacher's wait time** (L84, L85): agreement only after a final,
   confident, graded transcript, and question-aware waiting instead of the shortest gap.
7. **Gestures as validated goal programs over a measured skeleton**, solved every frame along task-space
   paths with springs, styled by measured habits, with no motion clips (L73–L82).
8. **A self-grading, time-budgeted build** that retries only the layers upstream of a failing gate and
   otherwise names the missing photo, with a **fixed-point gate** on heads outside the template's span and a
   **mutants at the threshold** and operating-characteristic sheets that block any release whose gates
   cannot fail (L91, untested).
9. **Attention sharing beside a moving lesson** driven by the lesson's own step events (L72), and
   **divergence deixis**: a wrong answer is met by a look and a point at the step where the student's trace
   first differs from the lesson's, not by a face (L85, untested).

---

## 10. References

arXiv identifiers are given as arXiv:YYMM.NNNNN. Papers are idea sources only; no code is copied, and for
non-commercial work only the paper is read.

**Method and innovation.** Hevner, March, Park, Ram (2004), Design science in information systems research,
MIS Quarterly 28(1). 1904.12742 (design science in SE). 2407.09844 (teaching design science). Altshuller,
*The Innovation Algorithm* (TRIZ). 2403.13002 (AutoTRIZ). 2506.18783 (TRIZ Agents). 2408.05897 (TRIZ-GPT).
2405.01453 (creative problem solving in AI).

**Consent, provenance, ethics.** 2305.03713 (avatar fingerprinting). 2604.12490 (deepfakes and authority).
2104.05030 (social VR ethics). 2009.09869 (FakeTagger). 2607.20564 (PhantomSeal). 2208.11170 (avatar diversity).
2210.06186 (GOTCHA, challenge–response against real-time deepfakes). 2503.19176 (SoK audio watermarking).
2406.06979 (AudioMarkBench). 2511.21577 (HarmonicAttack). 2303.13408 (retrieval defence against
paraphrased AI text). Digital Personal Data Protection Act 2023 and DPDP Rules 2025 (PIB note, 14 Nov 2025;
section numbers **UNVERIFIED**). IT Rules amendment on synthetic content (notified 10 Feb 2026; secondary
sources, Gazette text **UNVERIFIED**). C2PA and `c2pa-rs`.

**Capture and reading.** 2006.10962 (Attention Mesh / MediaPipe face). 2006.10204 (BlazePose). 2006.10214
(MediaPipe Hands). 2205.12010 (SFace). 2204.02776 (dense landmarks). 2305.11522 (occlusion-robust dense face
alignment). 2007.07227 (MeTRAbs). 2002.10322 (bone-based pose). 1604.06195 (hand pose review). 2510.19884
(iris area). 2205.03962, 2411.12002, 2406.13149 (skin tone and albedo bias). Hashemi et al. (2015) corneal
diameter. Bentivoglio et al. (1997) blink rate, Movement Disorders 12(6).

**Face and head shape, likeness.** Gower (1975) generalised Procrustes, Psychometrika 40. Umeyama (1991),
IEEE TPAMI 13(4). 2007.12494, 2107.04277, 1910.06007 (multi-view face). 2007.06759, 2010.00560, 2508.08429
(personalised rigs). 2310.17519 (FLARE). 2105.02451 (neural blend shapes). 1911.08008, 1903.03785, 2311.02461
(head models). 2604.13856, 2602.11693 (one-shot full heads). Ward, Ward, Fried, Paskhover (2018) nasal
distortion in short-distance photographs, *JAMA Facial Plast Surg* (doi 10.1001/jamafacial.2018.0009).
Fried, Shechtman, Goldman, Finkelstein (2016) perspective-aware manipulation of portrait photos, SIGGRAPH
(cited from memory, **UNVERIFIED**). 2302.12253 (DisCO). Leopold, O'Toole, Vetter, Blanz (2001)
prototype-referenced shape encoding, *Nat. Neurosci.* 4. Benson and Perrett (1991) perception and recognition
of photographic quality facial caricatures, *European J. Cognitive Psychology* 3 (abstract). Lee and Perrett
(2009, *Perception*; abstract only). Byatt and Rhodes (1998) recognition of own-race and other-race
caricatures, *Vision Res.* 38. Farkas et al. (2005) international anthropometric study of facial
morphology, *J Craniofac Surg* 16. Sadr, Jarudi, Sinha (2003) the role of eyebrows in face recognition,
*Perception* 32. Russell, Sinha, Biederman, Nederhouser (2006) is pigmentation important for face
recognition?, *Perception* 35. Ellis, Shepherd, Davies (1979) identification of familiar and unfamiliar faces
from internal and external features, *Perception* 8. Mita, Dermer, Knight (1977) reversed facial images and
the mere-exposure hypothesis, *JPSP* 35. Zell et al. (2015) to stylize or not to stylize?, *ACM TOG* 34(6). 2203.09692, 2409.07984 (detail; SPARK).
2211.07818, 2505.10072, 2104.14559, 2403.15227 (stylised identity-preserving avatars). Lewis et al. (2014)
blendshape practice, Eurographics STAR. Li, Weise, Pauly (2010) example-based facial rigging, SIGGRAPH.
Rhodes, Brennan, Carey (1987) identification and ratings of caricatures, *Cognitive Psychology* 19. Näsänen
(1999) spatial frequency bandwidth used in the recognition of facial images, *Vision Research* 39. Harmon
(1973) the recognition of faces, *Sci. Am.* 229(5). Sinha, Balas, Ostrovsky, Russell (2006) face recognition
by humans: nineteen results, *Proc. IEEE* 94(11). Bradley and Terry (1952) rank analysis of incomplete block
designs, *Biometrika* 39. Epley and Whitchurch (2008) mirror, mirror on the wall: enhancement in
self-recognition, *PSPB* (from memory, **UNVERIFIED**). Russell, Sweda, Porcheron, Mauger (2014) sclera
color changes with age, *Psychol. Aging* 29(3).

**Template, body, hands, rig.** MakeHuman licence pages (makehumancommunity.org, "about/license", checked
2026-11-26); MPFB2 licence and MakeHuman functional-pack records (copies in
`docs/voice/licences/2026-11-25/`); MakeHuman `LICENSE.md` (GitHub master, read 2026-11-26 by the build
reviewer). ICT-FaceKit (github.com/USC-ICT/ICT-FaceKit, MIT). Amberg, Romdhani, Vetter (2007) optimal step non-rigid ICP, CVPR. Sorkine et al. (2004)
Laplacian surface editing, SGP. Sumner and Popović (2004) deformation transfer, SIGGRAPH. Drillis and Contini
(1966) body segment parameters. 2509.06607, 2605.09258 (biomechanics). 2106.10893 (PIANO), 2202.04533 (NIMBLE)
— papers only. 2607.05938 (hand motion priors). Santello, Flanders, Soechting (1998) postural hand synergies,
J. Neuroscience. 2512.06434 (anthropometrics). Baran and Popović (2007) automatic rigging, SIGGRAPH.
2406.00238 (robust biharmonic skinning). Kavan et al. (2008) dual quaternion skinning, ACM TOG. 2104.04934
(velocity skinning). 2503.17032 (TaoAvatar). Garland and Heckbert (1997) quadric simplification. 2003.09820
(rig-space rendering). 2501.17085 (LOD perception). Inman, Saunders, Abbott (1944) shoulder function, J Bone
Joint Surg. McClure et al. (2001) 3-D scapular kinematics, J Shoulder Elbow Surg 10.

**Appearance, eyes, mouth, hair, clothes.** Ramamoorthi and Hanrahan (2001) SH irradiance, SIGGRAPH.
2312.05210 (IntrinsicAvatar). 2407.15212 (SGIA). 2312.03704, 2506.06271 (relightable heads). Gooch et al.
(1998) non-photorealistic lighting, SIGGRAPH. 2206.08428 (EyeNeRF). Bérard et al. (2014) eye capture,
ACM TOG. 2411.12981 (gaze redirection). 2008.05023 (audio- and gaze-driven codec avatars). 2409.11951
(GaussianHeads). 2106.12302 (tongue reconstruction). 2306.05872 (Neural Haircut). 2604.05794
(EfficientMonoHair). 2610.40599 (HairDeck). 2604.03716 (CGHair). 2509.21114 (CHARM). 2405.10565 (strand
LOD rendering). 2402.10483 (GaussianHair). 2412.17144 (augmented mass–spring hair). 2507.05191 (Neuralocks).
Macklin, Müller, Chentanez (2016) XPBD, MIG. 2611.02902 (TailorRig). 2605.20460 (HyperBones). 2405.17609
(GarmentCodeData). 2405.11694 (XPBI). 2606.08041 (facial hair capture).

**Painted rendering.** Todo, Anjyo, Baxter, Igarashi (2007) locally controllable stylized shading, *ACM TOG*
26(3). Petikam, Anjyo, Rhee (2021) Shading Rig, *ACM TOG* (10.1145/3461696). 1910.02926 (Cubic Stylization).
Jimenez, Echevarria, Oat, Gutierrez (2011) practical and realistic facial wrinkles animation, *GPU Pro 2*.
Praun, Hoppe, Webb, Finkelstein (2001) real-time hatching (tonal art maps), SIGGRAPH (from memory). KTX2 /
Basis Universal (three.js `examples/jsm/libs/basis/README.md`). three.js r187 `WebGLMorphtargets.js`. Motomura (2015) *Guilty Gear Xrd's art style: the X factor between 2D and 3D*, GDC
slides. Trade-press accounts of the reference series' texturing (80.lv, "A closer look at texturing in
Arcane", parts 1–2) and FMX 2025 session "Achieving Arcane's hand-painted style with Mari" (secondary; studio
details unverified). 1807.03249 (StyleBlit). 2311.12891 (SyncMVD). 2411.02336 (MVPaint). 2312.13913
(Paint3D). 2302.01721 (TEXTure). 1810.01175 (line drawings from 3D). Green (2007) improved alpha-tested
magnification for vector textures and special effects, SIGGRAPH course (from memory). Desbrun, Meyer,
Schröder, Barr (1999) implicit fairing of irregular meshes, SIGGRAPH. Gjøl and Svendsen (2016) the rendering
of INSIDE, GDC (from memory). Khronos OpenGL ES 3.0 reference pages (`glRenderbufferStorageMultisample`,
`glBlitFramebuffer`). Arm, "Mali performance 2: how to correctly handle framebuffers" (developer blog);
Collabora (2026) re-thinking framebuffers in PanVK. `EXT_disjoint_timer_query_webgl2` support (caniuse;
WebKit bug 252388; Mozilla bug 1328882). Bénard, Thollot, Collomosse (2011)
temporal coherence for stylized animations, CGF. 2312.12392 (recursive camera painting). 2403.07807
(StyleGaussian). 2602.00618 (Tune-Your-Style). 2206.06360 (ARF). 2312.10263 (painterly harmonisation).
2401.16224 (Diffutoon). Meier (1996) painterly rendering for animation, SIGGRAPH. Kuwahara et al. (1976)
processing of RI-angiocardiographic images. Kyprianidis, Kang, Döllner (2009) anisotropic Kuwahara filtering,
Computer Graphics Forum. Cabral and Leedom (1993) line integral convolution, SIGGRAPH. Winnemöller,
Kyprianidis, Olsen (2012) XDoG, Computers & Graphics. 2510.13978 (instant skinned Gaussian avatars for web).
web.dev (2025) WebGPU supported in major browsers. 2308.04079 (3D Gaussian splatting; paper only). 2409.06765
(gsplat). 2404.19398 (Gaussian blendshapes). 2604.23957, 2507.12723 (audio-visual watermarking).

**Voice.** Chatterbox README (Resemble AI; archived August 2026; read 2026-11-26: V3 current, a Hindi Single Language Pack, `cfg_weight` and `exaggeration` the only controls, Perth on every file). arXiv 2606.18323 (best-of-N ASR self-verification), 2607.08256 (ASR-family confound in best-of-N), 2509.19852 (alignment-based stability), 2005.03329 and 1901.10345 (short-utterance speaker verification), 2512.09221 (voice familiarity). Mayer (2009) *Multimedia Learning*, 2nd ed. (temporal contiguity).
AudioSeal README (licence update, April 2024). 2505.00579 (voice cloning survey). 2407.05407 (CosyVoice).
2608.11650 (cross-lingual zero-shot TTS). 2610.14776 (compact TTS). 2402.09378 (MobileSpeech). 2306.07691
(StyleTTS 2). 2211.09536, 2507.15272, 2505.18609, 2410.14197 (Indian-language TTS). 2409.10969, 2412.19043,
2510.25178 (code-switched TTS). 1810.00662 (Hindi–English code-switching corpus). 2004.10353 (Hindi schwa
deletion). 2204.03067, 1708.01464 (multilingual G2P). 2204.06502 (Indic TIMIT, Indian English variation).
2311.08323 (IPA alignment). 2109.11680 (zero-shot cross-lingual phoneme recognition). 2306.04306 (Allophant).
2606.25460, 2406.19363, 2608.28508 (forced alignment). 2105.14849 (peaky CTC). Resemble AI Chatterbox issue
#519 (alignment analyser stops multilingual output early). 2401.17264 (AudioSeal). 2312.03410 (timbre
watermarking). 2611.04716 (cross-codec watermark robustness). 2005.07143 (ECAPA-TDNN).
`facebook/wav2vec2-lv-60-espeak-cv-ft` model card (Apache-2.0 tag). Montreal Forced Aligner (MIT; documentation
`dictionary.rst`). Mitchell et al. (2011) a mismatch in the human realism of face and voice produces an
uncanny valley, *i-Perception* 2(1). 2410.11079 (code-mixing index). Pallavi (2016) classroom code-switching,
*J. Indian Education* 42(1). Adinolfi (Open University blog) teachers' language use in Indian low-cost
English-medium schools.

**Lips and face performance.** Fisher (1968) visemes, J. Speech and Hearing Research. Cohen and Massaro
(1993) coarticulation in visual speech, Models and Techniques in Computer Animation. Edwards, Landreth,
Fiume, Singh (2016) JALI, ACM TOG. Schwartz and Savariaux (2014) No, there is no 150 ms lead of visual speech
on auditory speech, PLoS Comput Biol 10(7). ITU-R BT.1359 (relative timing of sound and vision). 1805.09488
(VisemeNet). 2301.06059 (viseme dynamics). 2408.05641 (phoneme-to-articulatory coarticulation). 2507.20343
(DYNARTmo). 2511.22155 (DYNARTmo lips–jaw trade-off in bilabial stops). PanPhon (articulatory feature
vectors; licence **UNVERIFIED**). Yehia, Kuratate, Vatikiotis-Bateson (2002) linking facial animation, head
motion and speech acoustics, *J. Phonetics* 30; Munhall et al. (2004) visual prosody and speech
intelligibility, *Psychol. Sci.* 15 (both from memory). Al Moubayed, Edlund, Beskow (2012) taming Mona Lisa,
*ACM TiiS* 1(2). 2609.30517 (visible articulation). 2610.03436 (geometric coarticulation measure). 2503.20308
(perceptual lip-sync metrics). 2611.01705 (Fréchet Oral Distance). 2406.14272 (MultiTalk). 2112.05329
(FaceFormer). 2401.08655 (SAiD). 2502.20323 (ARTalk). 2604.23692 (personalised causal facial motion).
1905.03079 (VOCA). 2008.10010 (Wav2Lip / SyncNet expert). 2608.15110 (CETalk). 2602.09534 (AUHead).
2608.22731 (verbal–nonverbal mismatch). 2502.06875 (LLMs and valence–arousal). Chi, Costa, Zhao, Badler
(2000) EMOTE, SIGGRAPH. 2110.04527 (upper-face generation). 2210.14800 (head motion from speech). 2310.20240
(head pose with speech). Freedman (2008) coordination of the eyes and head during visual orienting, Biol.
Cybern. Kendon (1967) gaze in conversation, Acta Psychologica 26. 2501.09921 (TalkingEyes). 2610.19635 (gaze
dynamics). 2512.15340 (turn-level interactive heads). 2602.18432 (SARAH).

**Physical actions.** Aristidou and Lasenby (2011) FABRIK, Graphical Models 73(5). Li et al. (2012)
kinematic redundancy and swivel angle, ICRA (Rosen group). Chen and Li (2022) natural arm postures, Robotica.
2507.00792 (JAX-IK). 2506.17996 (neural IK). 2508.02106 (physically plausible synthesis). 2303.11886
(complementary dynamics). 2506.01563 (intention-aware motion). Kopp et al. (2006) Behavior Markup Language,
IVA. McNeill (1992) *Hand and Mind*. Kendon (2004) *Gesture: visible action as utterance*. Kita, van Gijn,
van der Hulst (1998) gesture phases. Flash and Hogan (1985) minimum-jerk, J. Neuroscience. Leonard and Cummins
(2011) temporal alignment of gesture and speech, Lang. Cogn. Processes. Pouw, Paxton, Harrison, Dixon (2020)
acoustic information about upper limb movement in voicing, PNAS 117(21). Herbort and Kunde (2016) spatial
(mis-)interpretation of pointing gestures, JEP:HPP 42. Holladay, Dragan, Srinivasa (2014) legible robot
pointing, RO-MAN (doi 10.1109/ROMAN.2014.6926256). Morrel-Samuels and Krauss (1992) word familiarity
predicts temporal asynchrony of hand gestures and speech, *JEP:LMC* 18(3); Krauss (1998) why do we gesture
when we speak?, *Curr. Dir. Psychol. Sci.* 7. Winkworth et al. (1994/1995) speech breathing, JSHR.
2503.14408 (LLM gesture selection). 2412.16563 (SemTalk). 2603.26553 (SemConFlow). 2503.20202 (SARGes).
2407.02151 (deictic labelling). 2301.05339 (gesture generation review). 2506.01077 (TRiMM). 2609.21576
(GestureFAR). 2604.10927 (LiveGesture). 2610.06153 (Talk, Render, Act). 2603.18771 (educational robot
motion). 2509.12507 (pointing gestures). 2611.25444 (VisualTalk-Bench). 2609.06591 (interaction prior).
2604.25164 (identity-aware motion).

**Conversation.** 2212.04356 (Whisper). 2609.04225 (turn-aware streaming ASR). 2604.19151, 2305.15386,
2609.24199 (Indian ASR benchmarks). 2406.10993 (code-switched speech). 2205.09812, 2403.06487, 2401.04868,
2503.06241 (voice activity projection). 2604.01897 (FastTurn). 2609.20995 (Voice-Light). 2604.23295 (Human-1,
IndicFDB). 2410.00037 (Moshi). 2604.21406, 2509.22243, 2507.23159, 2509.06502 (full duplex). 2410.15929,
2304.04472, 2607.22729 (backchannels). 2507.23298 (nodding types). 2112.13548, 2409.20188, 2609.40317
(listening heads). 2510.04637, 2506.22554 (dyadic behaviour). 2206.02436 (confusion detection). Rowe (1986)
wait time, J. Teacher Education 37(1). 2603.09536, 2604.12253 (LLM pedagogical agents). 2308.15214 (FurChat).
2603.03282 (MIBURI). 2611.30388 (BASE). 2608.24909 (streaming digital-human agents). 2503.18429 (Teller).

**Teaching.** Stull, Fiorella, Mayer (2018) an eye-tracking analysis of instructor presence in video
lectures, *Comput. Hum. Behav.* 88. Kuang, Wang, Xie, Mayer, Hu (2023) effect of the instructor's eye gaze on
student learning from video lectures, *Educ. Psychol. Rev.* 35(4) (abstract). Lawson, Mayer et al. (2021) the
positivity principle, *ETR&D* (doi 10.1007/s11423-021-10057-w). Davis (2018) pedagogical agent gesture
(secondary source). 2607.28203, 2602.18457 (students and AI-made instructional video). 2412.10384, 2304.03784
(AI vs. human instructional video). 2505.06676. Eccles School (University of Utah) and SBS Cultural Atlas
etiquette guides for India (weak sources).

**Look (round 4).** Thong, Joniak, Xiang et al., *Beyond Skin Tone*, arXiv 2309.05148 (ICCV 2023, abstract read). arXiv 2312.06790 (dark-skinned virtual humans, abstract read). DeCarlo, Finkelstein, Rusinkiewicz, Santella (2003) suggestive contours, SIGGRAPH (from memory). Jimenez et al. (2013) next-generation character rendering, GDC (from memory, **UNVERIFIED**). Gurney (2010) *Color and Light* (from memory, **UNVERIFIED**). AudioMarkBench 2406.06979 (Opus removes AudioSeal's mark).

**Evaluation.** 2208.10441, 2308.12646, 2608.10839 (GENEA challenges). 2101.03769 (gesture evaluation
review). 2605.06063 (avatar representation in gesture evaluation). Ho and MacDorman (2017) measuring the
uncanny valley effect, *IJSR* 9.

**Internal documents.** `docs/pratibimb/BRIEF.md`, `LAYERS.md`, `ARCHITECTURE.md`, `ENGINE.md`, `SPEC.md`,
`TRAINING.md`, `PACK_FORMAT.md`, `PAPER_CHANGELOG.md`; code in `scripts/pratibimb/engine/` and
`scripts/teacher/maker/`.
