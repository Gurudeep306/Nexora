# Pratibimb: a layered, measurement-only pipeline that turns a phone capture into a painted, talking, gesturing digital teacher

*NexoraGuru research paper, design version 2 (2026-11-26). Supersedes version 1 after the first review round
(graphics, motion, speech, systems; decisions in `PAPER_CHANGELOG.md`). It specifies the black box described
in `BRIEF.md`, refines the 64-layer plan in `LAYERS.md`, and keeps the engine choices in `ENGINE.md` and the
rules in `SPEC.md`. Where those files disagree, the brief wins (§2.4 lists the disagreements found). Things
only the owner can decide are collected in §2.6.*

---

## Abstract

We describe Pratibimb, a system that takes a consenting adult's ordinary capture (photos and/or a short
phone or webcam video, plus their voice) and builds one digital human of that person: waist up, facing the
student, recognisable as them, drawn in a hand-painted look, speaking in their cloned voice with accurate lip
sync in any language, gesturing with arms and five-finger hands, showing emotion, listening and reacting, and
conversing as a teacher through the site's tutor ("Guru"). The system is built as **95 layers (L0–L94) in
11 stages**. Each layer has one input, one output, a stated method with its research basis, its defaults, a
fallback, and a measurable gate that must pass before its output is used.

Three constraints shape the design. (1) **No photo pixels are reproduced**: from the capture we learn only
measurements (3D shape, proportions, bone lengths, motion habits) and a small set of colour numbers (region
palettes and smooth gradients), and every build ships an *information-budget certificate* listing each
photo-derived number. (2) **Any gesture without an animation library**: actions are short goal programs
(look at X, point at lesson element Y, count three, namaste) solved every frame by an analytic arm solver
with shoulder-girdle rhythm along task-space hand paths, under joint limits and swept-capsule collision,
followed by a spring layer, and styled by the person's own measured habits. (3) **Build in 3–4 minutes on
one rented GPU and play at 30 fps in an ordinary laptop's browser**: heavy work is learned or authored once
(shared priors and **one owned template mesh** with its rig, UVs and authored painting attributes); per
person we only measure, fit the template, and bake; the runtime is a small skinned mesh with a forward,
texture-space painted shading model, not a neural renderer and not a screen-space paint filter.

The painted look is made where the reference look makes it: **in the textures**. A build-time painter that
sees only our own renders of the fitted template paints light, half-tone and shadow versions of every
surface; at run time a stabilised shading normal and a key-light shadow choose between them. The paint is
on the surface, so it cannot flicker.

The main new ideas are: measurement-only appearance with a certificate of what was measured; likeness put
back into geometry by a likeness-gated caricature term, judged by a style-independent geometric likeness
score; lip sync driven by the phones the voice *actually spoke* (a pronunciation-lattice aligner) and solved
as a constrained trajectory whose closures cannot be missed, with per-person coarticulation parameters that
carry across languages through IPA; deictic gestures that land on the exact element of the lesson animation
and are solved for how an *observer* reads a point; listening that is contingent on whether the student is
right (the teacher never nods at a wrong answer) and that waits like a teacher after a question; and a build
that grades itself on held-out frames and retries or asks for the missing photo. Most individual techniques
are known; we state plainly which parts are new (§9.3). Status: 16 layers exist in code (some in part) and 43 are partial
(`scripts/pratibimb/engine/`, `scripts/teacher/maker/`); the other 36 are specified here and still to build
(index in §5.12).

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
(§2.6).

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
   memorised. The painter never sees a photo (L53); what the model keeps from the photos is listed number by
   number (L42).
3. **No outside body or face model with a restrictive licence.** No FLAME, SMPL/SMPL-X, MANO, original 3DGS
   code, insightface, nvdiffrast, F5-TTS, MMS aligners (`SPEC.md` §2). The template (L33) is CC0 or our own.
4. **Build ≤ 3–4 minutes** per person on one rented GPU (24 GB class), measured from a warm worker (§7.1).
5. **Playback 30 fps in a browser** on an ordinary laptop (integrated GPU), 720p panel.
6. **Consent first**: adults only, their own face and voice, spoken consent matched to the face *and to the
   voice*, one-tap delete, revocable.

### 2.4 Inconsistencies found in the existing documents (for the owner)

- `BRIEF.md` fixes the look as the hand-painted style of reference sheet 1–8 (realistic proportions, painted
  skin and hair, dramatic key and rim light), but its part table still says "stylised to anime (larger eyes,
  simpler nose)" and "anime eyes", left from the earlier anime choice. This paper follows the newer sentence:
  **realistic proportions with a mild, likeness-gated stylisation** (L24), painted in texture space
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

### 2.5 Measurable success criteria (release gates for the whole system)

| # | Criterion | Measure | Target |
|---|---|---|---|
| S1 | Likeness (machine) | Rank-1 identification of neutral and three-quarter renders against the person's held-out photos, in a gallery of the other bench people's renders plus ≥ 50 synthetic hard-negative renders made by the same pipeline (L94); two scorers: the geometric likeness score (L24) and SFace cosine | Rank 1 under both scorers for every bench person, with a margin ≥ 0.05 (geometric score) over the best impostor |
| S2 | Likeness (human) | People who know the person pick their render from a lineup of 4 bench or synthetic renders whose foils match sex, Monk group, hair length and glasses; ≥ 15 raters per person | ≥ 90% correct (chance 25%), 95% CI reported |
| S3 | Lip closures | p/b/m (and प फ ब भ म) *as realised* (L64) show full lip closure in the displayed frame nearest the closure midpoint, measured on the **rendered pixels** (landmarks re-detected on renders) with 10% injected frame drops; plus blind raters on muted clips | 100%; raters tell p/b/m clips from others ≥ 90% |
| S4 | Lip-teeth contact | Phones *realised* as [f] or [v] (L64; [ʋ]/[w] realisations are excluded) with lower lip at the upper teeth, on rendered pixels | ≥ 95% |
| S5 | Audio–video offset | Measured in the browser after output-latency calibration (L92) | lips lead audio by ≤ 80 ms and lag by ≤ 40 ms |
| S6 | Mouth range | Replay gate (L71): the person's own held-out reading driven through L64–L71 vs. the 52 values tracked from the same video | per-class amplitude within ±15%; inner-lip distance error reported |
| S7 | Gesture validity | Every action of the library × 8 bench bodies, **every frame at 30 fps** of the trajectory | 0 limit violations; 0 penetrations > 2 mm |
| S8 | Pointing | Observers pick the indicated lesson element from its neighbours on silent clips; the shoulder–wrist–fingertip line hits the element's box | ≥ 95% correct picks; line hits ≥ 98% |
| S9 | Naturalness | GENEA-style human-likeness and appropriateness ratings (§8.4) vs. a real teacher video | within 1 scale point; ours ≥ "rule-based" ablation |
| S10 | Responsiveness | Student stops → first visible reaction / first audio (phrase bank or speech) / first content clause | ≤ 300 ms / ≤ 0.8 s / ≤ 1.8 s (medians, measured end to end including recognition) |
| S11 | Barge-in | Student speaks over her → her audio fades; she never interrupts herself through echo | ≤ 300 ms after the student's onset; 0 self-interruptions in the echo test |
| S12 | Pedagogical honesty | Agreement signals after a wrong student answer (controls); perceptual check: Indian students judge "did she agree?" on the neutral set | 0; neutral set at chance |
| S13 | Build time | Pack upload → signed model with report, one warm 24 GB GPU worker | median ≤ 210 s, p95 ≤ 240 s (cold start reported separately) |
| S14 | Playback | 30 fps at 720p on an Intel Iris Xe-class laptop in Chrome; p99 frame ≤ 40 ms | pass |
| S15 | No pixel copy | Information-budget certificate complete and within budget (L42); patch-copy check; painter input audit (no photo reached L53) | pass on every build |
| S16 | Fairness | S1, S2 and the style rating per Monk Skin Tone group, sex and age band | monitored report on the bench; gate (no group > 5 points below the mean) only on the extended set (≥ 30 people, or synthetic heads for the colour layers) |
| S17 | Provenance | Every weight and asset in the model traces to a commercial-OK source; gate models obey the check-only rule (L3) | 100% (else the site refuses to publish) |
| S18 | Style | Owner's rating against references 1–8 (§8.3); once the owned style kit exists, the style distance to it (L53) | ≥ 4/5; style distance ≤ the kit's own spread |

### 2.6 Owner decisions needed

These cannot be settled by engineering. Until the owner decides, the paper uses the default named.

| # | Decision | Why it is the owner's | Default in this paper |
|---|---|---|---|
| D1 | **The albedo-blur question.** May the model keep a blurred colour map of the person's face (a band-limited field from the photos), or only a few hundred colour numbers (palette plus smooth per-region gradients)? | The blurred map helps likeness but sits in the band people recognise faces with; whether that counts as "photo pixels" is a reading of the brief | Parametric colour only (L40). The ablation in §8.5 measures what the field would add, so the owner decides with numbers |
| D2 | **Template licence.** The MakeHuman licence page (checked 2026-11-26) says all core assets are CC0 and only the code is AGPL/GPL; an older GitHub readme speaks of AGPL for mesh data. Accept the CC0 reading (after a legal look) and pin the asset version, or author our own template | Licence risk on the one mesh every model is made from | MakeHuman core base mesh, exact version and hash pinned in L3, no MakeHuman code; our own template as plan B |
| D3 | **Paying artists.** An owned style kit (30–60 painted portraits over our own plain renders), the stroke atlas, and the template's authored painting attributes need artists | Money, and who owns the work | Our own stroke atlas only; the kit is not assumed; S18 falls back to the owner's rating |
| D4 | **Who is painted in the style kit.** Bench people (needs written consent to derivative artworks and to training a style model on them), artists' self-portraits, or fictional heads | Consent and paperwork | Fictional heads and artists' self-portraits |
| D5 | **Running cost of live conversation.** Live cloned speech needs a GPU running while students talk (§7.4); it is not free | Money | Lesson narration pre-rendered at publish time (free at play time); live replies in the cloned voice only while a GPU worker is up, otherwise the labelled default voice or text plus the phrase bank |
| D6 | **Check-only use of models trained on research data.** SFace (trained partly on the withdrawn MS-Celeb-1M), ECAPA speaker models (VoxCeleb) and XLSR phone recognisers (BABEL in pre-training) are used only to *check* a build (pass/fail), never to choose a shipped parameter | Legal risk appetite | Allowed as checks only (L3 rule); never ship their weights; replace each when a commercial-trained one exists |
| D7 | **Proportions.** Confirm realistic proportions with mild stylisation (brief's newer sentence) rather than the part table's anime eyes and nose | The brief contradicts itself | Realistic, $s_{max}$ = 0.35 |
| D8 | **Warm worker.** Keep one GPU worker warm (cost) so builds meet 3–4 minutes, or accept 30–90 s more on a cold start | Money vs. the build-time promise | Warm worker during Studio hours; cold builds report their start-up time separately |
| D9 | **Diffusion painter.** Pursue the optional diffusion painter (L53 variant) at all: GPU time per build, a base model whose licence must be confirmed, and a style model trained only on the owned kit (D3) | Money and licence | Not pursued until D3 exists; the procedural painter is the default |
| D10 | **The bench.** Recruit 8 adults with written consent for a second-day capture, readings and hand clips (L0) | People and paperwork; every gate depends on it | Required before any Stage C–F layer is called done |

---

## 3. Innovation method

### 3.1 Design science, build → evaluate cycles

We follow design-science research (Hevner et al. 2004; mapped to software engineering in arXiv 1904.12742;
taught as a method in 2407.09844). Each layer is an artefact with (a) a requirement drawn from §2, (b) a
build, (c) an evaluation against a **gate** that is a number with a threshold, measured on the bench (L0)
and on held-out data, and (d) a recorded decision. A layer that fails its gate does not ship; the build
falls back to the layer's stated fallback, and the build report names it. A 2-person smoke bench runs on
every change; the full bench runs nightly and before a release (L94).

### 3.2 TRIZ: removing contradictions instead of trading them off

TRIZ (Altshuller) treats a hard design problem as a contradiction between two requirements and looks for a
principle that removes it (separation in time, space, condition or scale; intermediaries; prior action;
and so on). Recent work automates the search with language models (AutoTRIZ 2403.13002, TRIZ Agents
2506.18783, TRIZ-GPT 2408.05897); we used the method by hand, with those papers as checklists. The
contradictions and their resolutions:

| # | Contradiction | TRIZ principle | Resolution in Pratibimb |
|---|---|---|---|
| C1 | Likeness needs the person's appearance **vs.** no photo pixels may be used | Separation by scale ("separate the property from the carrier"); "the other way round" (#13) | Likeness lives in *geometry* (face shape, proportions, hair silhouette) and a few colour numbers. Detail is *painted*, not copied (L40–L43, L53). Lost texture cues are put back as geometry: a likeness-gated caricature term pushes the face *away* from the average (L24). |
| C2 | Any gesture **vs.** no animation library or animator | Prior action (#10) + dynamism (#15) | Actions are goal programs solved every frame (analytic IK + limits + task-space paths + springs). The "library" holds goals, not motion (L76–L85). |
| C3 | Quality **vs.** an ordinary laptop | Separation in time (#10 prior action) | Heavy work once (shared priors, one authored template), fitting and baking per person, a small explicit model at run time (§6, §7). |
| C4 | Painted look every frame **vs.** temporal stability (painted filters flicker) | Separation in space (#17 another dimension) | The paint lives in texture space on the surface: light, half-tone and shadow are each painted, and the run time only chooses between them by a stabilised shading normal (L52–L54). No screen-space paint filter. |
| C5 | Lips right in any language **vs.** no lip data for most languages | Intermediary (#24) | All languages pass through IPA phones, aligned on the audio the voice actually spoke; mouth shapes depend on articulation, not language (L62–L71). |
| C6 | Respond fast **vs.** think well | Preliminary action (#10), partial action (#16) | Visible pre-reaction at 250 ms, a pre-synthesised phrase from the person's own bank, speculative drafting on the partial transcript, the rest streamed clause by clause (L65, L91). |
| C7 | Expressive listening **vs.** never misleading the student | Separation by condition | Agreement signals only after the grader marks a *final* transcript correct; nothing evaluative fires on partial transcripts (L88). |
| C8 | A cloned voice and face are useful **vs.** they can be misused | Self-service (#25) and "the other way round" (#13) | The model carries its own consent record, face and voice lock, signature, watermark and visible label; it refuses to play outside the site (L1–L3, L66, L60). |
| C9 | Build quickly **vs.** perfect result | Feedback (#23) | The build grades itself on held-out frames and spends its remaining time budget only on failing layers (L94). |
| C10 | One topology for everyone **vs.** everyone's own shape | Universality (#6) + intermediary (#24) | One authored template carries every asset that must be made once (UVs, loops, weights, correctives, line and stroke attributes); only its shape is fitted per person (L33–L38). |

### 3.3 Recombination

Creative results usually come from recombining proven pieces in a new arrangement (discussed for AI systems
in 2405.01453). Pratibimb recombines: dense-landmark face fitting (2204.02776), personalised blendshapes
(2007.06759, 2010.00560), template fitting by non-rigid ICP (Amberg et al. 2007), production stylised
shading with authored normals and painted light (Motomura, GDC 2015; Arcane's texture painting as described
in trade press), the caricature advantage in face perception (Rhodes et al. 1987), analytic arm IK with
scapulohumeral rhythm, constrained coarticulation, voice-activity and semantic endpointing, speculative
response generation (2609.20995), and an LLM tutor, under one shared clock and one set of explicit controls.

---

## 4. System overview

### 4.1 Stages

```
            BUILD (once per person, ≤ 4 min on one warm GPU)                 PLAY (browser, 30 fps)
 ┌──────────────────────────────────────────────────────────────┐   ┌──────────────────────────────────────┐
 │ A  Bench, consent & provenance  L0–L3                        │   │ J  Listen & converse   L86–L91       │
 │ B  Capture & reading     L4–L16   (on device + worker CPU)   │   │      student audio → turn state,     │
 │ C  Shape                 L17–L32  (who they are: geometry)   │   │      reactions, Guru → script        │
 │ D  Template fit & rig    L33–L38  (one owned template)       │   │ G  Voice               L61–L66       │
 │ E  Appearance            L39–L50  (colour numbers, eyes,     │──►│      text → IPA → cloned audio →     │
 │                                    mouth, hair, clothes)     │   │      spoken-phone alignment          │
 │ F  Painted look (bake)   L51–L53, L55                        │   │ H  Lips & face         L67–L75       │
 │ G  Phrase bank           L65                                 │   │ I  Body action         L76–L85       │
 │ K  Gates & packaging     L93–L94                             │   │ F  Painted renderer    L54–L60       │
 └──────────────────────────────────────────────────────────────┘   │ K  Clock & delivery    L92           │
                                                                    └──────────────────────────────────────┘
```

Stage G's voice reference and phrase bank, Stage H's mouth ranges and coarticulation parameters, Stage I's
skeleton limits and rest poses, and Stage F's painted band textures are prepared at build time; the stages on
the right run at play time on the person model the build produced. Lesson narration is synthesised once, at
publish time, through Stages G–H on the server (§7.4).

### 4.2 Data flow at run time (one clock: the audio)

```
 student mic ─► L86 VAD / streaming ASR / echo guard ─► L87 turn state ─┬─► L88 reactions (final transcript + grader) ─┐
                                                                         └─► L89 Guru: streamed clauses, Leak Guard     │
                                                                               │ L90 barge-in, L91 speculation + bank    │
            ┌──────────────────────────────────────────────────────────────────┴──────────────┐                         │
            ▼                                                                                 ▼                         ▼
   L61 text norm ─► L62 G2P lattice ─► L63 cloned voice ─► audio ─► L64 align spoken phones   L76 action language
                     (server)            │ L66 watermark         + prosody (server)           L77 gesture plan
                                         ▼                                │                    L78 target (DOM → 3D)
   L67 visemes ─► L68 constrained coarticulation ─► L69 jaw/lip ─► L70 tongue ─► L71 refine   L79 arm solver, L80 hands
   (server, shipped with each audio chunk as 52 values + events)                              L81 trajectories, L82 collisions
   L72 emotion, L73 blinks/brows, L74 head, L75 gaze (+VOR) ──┐                               L83 rest/idle/breath
                                                              ▼                               L84 springs
                                     L85 mixer: pose(t) = {52 face values, jaw, tongue, eyes, skeleton} ◄──┘
                                                              ▼ (L92 audio clock, closure hold)
                    L37 skinning + morphs + correctives ─► L48 hair / L50 garment springs ─► L54–L60 painted frame ─► panel
```

### 4.3 The person model (what a build produces)

One signed file (`.pbmodel`, an extension of the identity pack format in `PACK_FORMAT.md`): a reference to
the pinned template version plus the person's fitted vertex positions (template topology, so UVs, weights,
correctives and authored attributes come from the template), LOD positions, 52 personal expression targets,
the skeleton with bone lengths and joint limits, hand parameters, the colour model (palette and smooth
per-region gradients; ≤ a few hundred numbers), painted band textures (light, half-tone, shadow per chart),
feature curves (brows, lids, lips), eye, teeth and tongue parameters, the hair clump fit, wardrobe fit,
motion-habit profile and rest poses, coarticulation parameters, voice reference (speaker embedding,
per-language reference spans, optional adapter), the phrase bank (audio, phones, motion), consent record,
provenance ledger, information-budget certificate and the build report. Target download ≤ 8 MB (phrase bank
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

---

### Stage A: Bench, consent, identity and provenance (L0–L3)

#### L0 The bench (first deliverable)
- **Purpose.** Almost every gate in this paper is measured on the bench; it must exist before any layer
  is called done.
- **In → Out.** Eight consenting adults (§8.2) → per person: the standard guided capture, a second-day
  capture, 5 minutes of reading in English and Hindi/Hinglish with the face visible, 2 minutes of free
  explanation with hands visible, a ruler measurement of hand length and palm width; the written consent
  records; a synthetic hard-negative gallery (≥ 50 heads per person sampled from the head prior near that
  person, L23) for S1.
- **Method.** Recruit to the coverage of §8.2; written consent naming the bench use, retention and
  deletion; store encrypted with the same crypto-shredding as models (L3). The synthetic gallery is made by
  sampling head-prior coefficients at a fixed distance from the person's (hard negatives), rendered by the
  same pipeline.
- **Research.** Design-science evaluation (1904.12742); impostor controls in face verification (2205.12010).
- **Ours.** A bench of second-day captures with hard synthetic impostors for stylised likeness.
- **Defaults.** 8 people; smoke bench = 2 of them (one light, one deep Monk group).
- **Fails → fallback.** None: without the bench, layers stay "unverified" in the index.
- **Gate.** All 8 people's material complete and consented (owner decision D10).
- **Status.** *To build*.

#### L1 Consent capture and verification
- **Purpose.** Nothing is built unless the person shown agreed, on camera, in their own words, in their own
  voice.
- **In → Out.** Consent clip (video + audio), account, declared age ≥ 18 → signed consent record
  `{who, by_whom, sentence, transcript, time, clip_hash, scope, voice_match}`.
- **Method.** The person reads a fixed sentence naming NexoraGuru, the purpose (teaching presenter) and
  the right to delete. Speech recognition (L86's recogniser) transcribes it; a normalised word error rate
  against the sentence must be low. Liveness: the face must move (blink, mouth motion correlated with the
  audio envelope, r ≥ 0.3), which rejects a still photo held to the camera. **Voice match**: the voice
  reference chosen in L15 must be the same speaker as the consent clip (ECAPA cosine above the same-speaker
  line, a check-only model, L3), so nobody else's audio can be cloned under a valid face consent. "Someone
  you know" mode records that person's own sentence, never the uploader's.
- **Research.** Consent and authorised use of synthetic talking heads (avatar fingerprinting 2305.03713);
  ethics of identity in synthetic media (2604.12490, 2104.05030); ECAPA-TDNN (2005.07143). India's IT Rules
  (2026) labelling duty, as noted in `SPEC.md`.
- **Ours.** Audio–mouth liveness from the same signals we already extract; face *and* voice bound to the
  consent; scope stored with the record (teaching presenter only).
- **Defaults.** WER ≤ 0.25 after normalisation; liveness r ≥ 0.3; ECAPA same-speaker line calibrated on the
  bench; age is declared (we do not estimate age from faces: estimates are biased and unreliable).
- **Fails → fallback.** Ask to record again with the reason in plain words; nothing is built.
- **Gate.** 100% of builds have a valid record; bench replay attacks (photo, screen replay of someone
  else) and voice swaps rejected 100%.
- **Status.** *Partial*: consent record and clip in `worker.py`/`pack.py`; ASR check, liveness and voice
  match *to build*.

#### L2 Identity lock
- **Purpose.** The face in the consent clip must be the face the model is made of, and every later build
  must be of the same person.
- **In → Out.** Consent clip frames, capture frames → identity vector (SFace, 128-d), match score, lock.
- **Method.** YuNet face detection, SFace embedding (2205.12010) of the 5 sharpest consent frames and
  of the capture's main person (L6); take the maximum cosine over pairs; also store the mean capture
  embedding in the model as the lock. A rebuild or an imported pack must match the lock. Photo-to-photo
  comparison only (SFace's own domain); it is a check, not a chooser (L3).
- **Research.** SFace (2205.12010); YuNet/SFace from the OpenCV model zoo (MIT/Apache-2.0).
- **Ours.** The lock travels inside the signed model, so a model cannot be re-dressed with another
  person's capture.
- **Defaults.** Same-person line cosine 0.363 (SFace's published threshold).
- **Fails → fallback.** "The face in the consent video is not the face in the photos" (existing message).
- **Gate.** Bench: all 8 genuine pairs pass; all 56 cross pairs fail.
- **Status.** *Exists*: `consent_matches` in `scripts/teacher/maker/worker.py`.

#### L3 Provenance ledger, labelling and revocation
- **Purpose.** Prove that every part of a model is commercially usable, label all output, and make
  deletion total.
- **In → Out.** Build inputs (datasets, weights, assets, template version, code version) → ledger in the
  model manifest; `publishable: true/false`; label and watermark settings; a deletion key.
- **Method.** Every prior, weight and asset file carries a licence tag and a content hash; the ledger is the
  union of tags over the build; any tag not in the allow list (`COMMERCIAL_OK` in `build.py`) makes the
  model research-only and the site refuses to publish it. **Check-only rule**: a model whose training data
  is not commercial-OK (SFace, ECAPA, XLSR phone recognisers) may only produce pass/fail on a build; it may
  never choose a shipped parameter, and its weights are never shipped (owner decision D6). The ledger records
  each check-only model and what it checked. The template is pinned by version and hash (D2). The model is
  encrypted with a per-person key held by the server; deletion destroys the key and the files
  (crypto-shredding), so stray copies become unreadable.
- **Research.** Provenance tracking for synthetic media (FakeTagger 2009.09869; proactive defence
  2607.20564).
- **Ours.** Licence provenance as a hard build gate, not documentation, including which models were allowed
  to judge and which to choose.
- **Defaults.** Allow list: own consented data, CC0, CC-BY, MIT, Apache-2.0, BSD (§6.3).
- **Fails → fallback.** Research-only model, never shown to students.
- **Gate.** S17: 100% traced; no check-only model on a parameter-choosing path (static check of the build
  graph); a deletion test leaves no readable model on server or cache.
- **Status.** *Partial*: `--datasets`/`COMMERCIAL_OK` in `scripts/pratibimb/engine/build.py`; signed pack in
  `pack.py`; check-only rule and crypto-shred *to build*.

---

### Stage B: Capture and reading the person (L4–L16)

Stage B runs on the person's device during capture where possible (MediaPipe web), and again on the
worker CPU for photos and uploads. Its output is the identity pack (`PACK_FORMAT.md`).

#### L4 Capture coach and coverage planner
- **Purpose.** Get the views, expressions and hand shapes later layers need, from people who are not
  photographers, without a long session.
- **In → Out.** Live camera frames → per-shot checks (face size, angle, light, sharpness, eyes open, one
  person), auto-shutter, a coverage map, and "the next shot to take".
- **Method.** A coverage vector over required cells: head yaw {−60, −30, 0, 30, 60}° × pitch {−20, 0, 20}°;
  expressions {neutral, smile, "aah", "ooh", "ee", brows up, frown, eyes closed}; hands {open palm front,
  back of hand, point, count 1–5}; waist-up front. Each cell has a quality floor (L5). The coach asks for the
  cell with the largest expected gain to the gates that are weakest (e.g., the side silhouette for L23).
- **Research.** The camera coach idea of `ENGINE.md` §3.6; dense landmarks integrate shape across frames
  (2204.02776).
- **Ours.** Coverage driven by downstream gates: the coach asks for what will raise the weakest gate.
- **Defaults.** Minimum: front, two three-quarter views, one profile per side, smile, "aah"; ≤ 3 min.
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
  still picture. Cuts: large jumps in colour histogram and identity position.
- **Research.** Standard image-quality cues; occlusion-aware fitting (2305.11522).
- **Ours.** Still-picture and repeat rejection by landmark-layout constancy (exists).
- **Defaults.** ≥ 40 usable frames, face ≥ 160 px across.
- **Fails → fallback.** Ask for more frames; photo-only path with fewer gates.
- **Gate.** ≥ 40 usable frames, or the build stops with a named reason.
- **Status.** *Exists*: `sharpness`, `quality`, `covered`, stillness check in `capture.py`.

#### L6 Main-person tracking
- **Purpose.** Use only the consenting person, even in interviews or classrooms.
- **In → Out.** Frames → frames and boxes of one identity.
- **Method.** Embed every detected face (SFace); cluster by cosine (agglomerative, threshold 0.363); the
  largest cluster that matches L2's lock is the person.
- **Research.** SFace 2205.12010.
- **Ours.** —
- **Defaults.** Cluster threshold 0.363.
- **Fails → fallback.** If no cluster matches the lock, stop.
- **Gate.** Other people never used (manual audit of bench clips with bystanders: 0 frames).
- **Status.** *Exists*: `capture.py`.

#### L7 Dense face points
- **Purpose.** The basis of face shape and expression: 478 3D points per frame.
- **In → Out.** Frame + face box → 478 points (468 face + 10 iris), image pixels, z scaled like x.
- **Method.** MediaPipe Face Landmarker on a crop zoomed so the face fills the input (small faces in
  webcam frames otherwise lose accuracy); points mapped back to the full frame. The same landmarker is run
  on our renders by the geometric likeness score (L24) and the rendered-pixel lip gates (S3, S4).
- **Research.** Attention Mesh (2006.10962); dense landmarks beat sparse ones for fitting and integrate
  across frames (2204.02776).
- **Ours.** Zoom crop before detection (exists).
- **Defaults.** Crop margin 1.6 × face box.
- **Fails → fallback.** Frame dropped.
- **Gate.** Detection on ≥ 95% of usable frames; mean landmark jitter on static frames < 0.5% of eye distance.
- **Status.** *Exists*: `zoom_landmarks` in `capture.py`.

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
- **Status.** *Partial*: values read in `capture.py`; neutral frames chosen by `neutral()`; calibration *to build*.

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
- **Status.** *Exists*: `procrustes` in `rig.py`, `umeyama` in `pack.py`.

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
- **Status.** *Exists* in part: `capture.py`, `pack.py`, `proportions()` in `body.py`.

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
- **In → Out.** Frames + masks → white-balanced colours per frame.
- **Method.** The sclera is close to neutral: sample the eye-white pixels inside the eye ring excluding
  the iris disc; per-channel gain so their median becomes grey; then exposure normalisation by the face's
  mid-tone. Colours are stored in CIELAB.
- **Research.** Skin-tone estimation must disambiguate light and albedo to avoid bias against dark skin
  (2205.03962, 2411.12002).
- **Ours.** Eye-white reference (exists); also used to flag coloured light (gain spread across channels > 30%).
- **Defaults.** Gains clamped 0.6–1.6.
- **Fails → fallback.** Grey-world on the background mask.
- **Gate.** Sclera chroma after correction ≤ 4 (CIELAB a,b) on bench frames.
- **Status.** *Exists*: `white_gain` in `capture.py`.

#### L14 Accessories and facial hair
- **Purpose.** Glasses, beards, moustaches, bindis, turbans and earrings matter for recognition by eye.
- **In → Out.** Views + masks → `{glasses: frame shape, colour, rim thickness; facial hair: region map
  (moustache, chin, cheeks), density, colour; head covering; earrings}`.
- **Method.** Glasses: edge density along the brow–cheek band and a reflection test; rim shape traced as
  a closed curve around each eye from the best front view, fitted as a superellipse. Facial hair: texture
  energy and darkness inside fixed regions of the face mesh (upper lip, chin, jaw, cheeks) relative to the
  person's forehead skin. Head covering: hair mask replaced by a cloth-coloured region above the forehead.
- **Research.** Avatar diversity and self-presentation (2208.11170); facial hair capture (2606.08041,
  for ideas only).
- **Ours.** Accessories stored as parameters, not pixels; redrawn by our own generators (L32).
- **Defaults.** Region thresholds learned on the synthetic set (§6.1).
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
  default Indian voice until then.
- **Gate.** One reference ≥ 10 s at SNR ≥ 20 dB per language used, matching the consent voice.
- **Status.** *Partial*: `voice.wav` and spans in `capture.py`; SNR, pitch and language ID *to build*.

#### L16 Motion-habit profile
- **Purpose.** How this person moves: the "style" for every motion layer.
- **In → Out.** Per-frame values and pose → profile: blinks/min and blink duration; head speed and range
  per axis; nod rate; mouth range per viseme class while speaking; smile and brow-raise share; hand
  visibility, height, rest position and gesture rate; pause lengths.
- **Method.** Event detection on the calibrated values (blink = mean eyeBlink > 0.5); robust statistics
  (median, 10th/90th percentiles). Mouth range per class uses L64's phone times when the capture has speech.
  Rest positions of the hands (clasped at the waist, hand on wrist, arms down) are clustered from the free
  explanation video where present (L83).
- **Research.** Blink statistics in conversation (Bentivoglio et al. 1997); speaking style capture (VOCA
  1905.03079); personalised audio-driven motion by retrieval (2604.23692).
- **Ours.** Per-viseme-class mouth range from the person's own speech (drives L69).
- **Defaults.** Population values when a statistic has fewer than 20 events.
- **Fails → fallback.** Population defaults.
- **Gate.** Blink rate on two halves of the capture agree within ±20%.
- **Status.** *Exists* in part: profile in `capture.py`; per-class range and rest positions *to build*.

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
- **Status.** *Exists*: `Rig.build` in `rig.py`.

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
  Bundle adjustment over the 468 points and per-view poses under a weak-perspective camera, with a
  Laplacian smoothness prior on the face mesh to stop single points drifting; robust (Huber) loss.
- **Research.** Multi-view geometry consistency for face reconstruction (2007.12494); prior-guided
  multi-view head reconstruction (2107.04277); multi-view consensus landmarks (1910.06007).
- **Ours.** Uses only landmark observations (no photometric term), so it is fast and pixel-free.
- **Defaults.** ≥ 3 views spanning ≥ 50° of yaw; Huber δ = 1 px at 512 px.
- **Fails → fallback.** Single-view depth from the landmarker.
- **Gate.** Profile-view reprojection error drops ≥ 20% vs. single-view depth; held-out view error < 2%.
- **Status.** *Partial*: `solve_multiview.py`, `solve_points3d.py` (for the older rig); port to the engine *to build*.

#### L20 Personal expression basis (with optional pair correctives)
- **Purpose.** This person's own way of smiling, opening the mouth, raising brows.
- **In → Out.** Canonical-frame face per frame + 52 calibrated values → linear map $F(b) = \bar F +
  \sum_k b_k D_k$ (52 personal deltas $D_k$), plus corrective deltas $C_{ij}$ only where the data supports
  them.
- **Method.** Ridge regression $W = (X^\top X + \lambda I)^{-1} X^\top Y$ with $X = [b, 1]$, $Y$ the flattened
  local faces. Values the person never showed get a population delta (from the synthetic set, scaled to
  their face) blended by a confidence weight equal to the value's observed range. Pair correctives: for
  pairs $(i,j)$ that co-occur in ≥ 30 frames (rare in a phone capture), fit $Y - F(b) \approx \sum b_i b_j
  C_{ij}$ and keep a pair only if it lowers held-out error; otherwise shared population correctives (from
  the synthetic set) are used once they exist.
- **Research.** Personalised blendshapes (2007.06759, 2010.00560); FLARE (2310.17519); example-based
  rigging (Li et al. 2010); corrective shapes (2105.02451; Lewis et al. 2014).
- **Ours.** Population fallback weighted by observed range, so unseen expressions stay plausible.
- **Defaults.** λ = 0.05·n; ≤ 24 pair correctives.
- **Fails → fallback.** Population deltas only; no correctives.
- **Gate.** Held-out shape error < 2%; mouth opening follows the real mouth r ≥ 0.9 (measured 0.97);
  a kept corrective lowers combination error ≥ 20%.
- **Status.** *Exists*: ridge map in `rig.py`; population fallback and correctives *to build*.

#### L21 Symmetry and asymmetry
- **Purpose.** Keep the person's real asymmetry (it is part of likeness), remove noise.
- **In → Out.** Neutral face and deltas → symmetric part + measured asymmetry, smoothed.
- **Method.** Mirror map of the face mesh (MediaPipe topology is symmetric); decompose $F = F_s + F_a$;
  shrink $F_a$ towards 0 by its across-frame variance (James–Stein style shrinkage), so stable asymmetry
  survives and noise does not.
- **Research.** Morphable-model symmetry priors (1911.08008, 2311.02461).
- **Ours.** Variance-based shrinkage of asymmetry.
- **Defaults.** Shrink weight $v/(v+\sigma^2_{noise})$.
- **Fails → fallback.** Raw face.
- **Gate.** Asymmetry measured on two halves of the capture agrees (correlation ≥ 0.8).
- **Status.** *To build*.

#### L22 Face detail curves
- **Purpose.** Lines that make a face theirs: nasolabial folds, eye bags, forehead lines, dimples.
- **In → Out.** Views + face mesh → a small set of crease curves on the mesh with strength and where
  they appear (always, or only with smile).
- **Method.** On aligned, light-normalised face crops, detect ridge/valley lines (Hessian of luminance at
  two scales); keep lines that appear at the same mesh position in ≥ 3 views. Luminance Hessians on phone
  images also pick up cast shadows, make-up and compression edges, so a curve is kept only if (a) its
  strength correlates with the expression values it should follow (or it is present in every view, for
  permanent lines) **and** (b) it does not appear as a fixed image-space edge across head poses. Store as
  curves in mesh barycentric coordinates with a strength per expression value. Drawn by L56 as lines,
  never as pixels.
- **Research.** Dense-landmark detail (2204.02776); implicit detail recovery (2203.09692); SPARK
  (2409.07984).
- **Ours.** Detail as *vector curves bound to the mesh*, which keeps it pixel-free and paintable.
- **Defaults.** ≤ 12 curves; strength < 1 never darker than the shadow band.
- **Fails → fallback.** None (a clean face).
- **Gate.** Curves stable across views (mean positional disagreement < 3% of eye distance) and the owner's
  side-by-side check (§8.3) prefers with-curves for ≥ 6/8 people.
- **Status.** *To build* (`solve_detail.py` is the older pixel-based version).

#### L23 Full head completion
- **Purpose.** A closed head (skull, back, crown) from a mostly frontal capture, as the target for the
  template fit.
- **In → Out.** Canonical face + side silhouettes → head-prior coefficients and a closed head surface.
- **Method.** Our own statistical head prior: principal components of closed heads in the **template's
  topology**, built from (a) the CC0 MakeHuman heads (§6.1) and (b) consented bench people. Fit by least
  squares: face points as hard-ish constraints, side and top silhouettes (L12) as a chamfer loss on the
  projected contour; 30 PCA coefficients with a Gaussian prior. The prior's mean head $\bar F$ is also the
  "average face" of L24's caricature term and the sampler of L0's hard negatives.
- **Research.** Complete head models (1911.08008); combining face and head models (1903.03785); SPHEAR
  (2311.02461); one-shot full heads (2604.13856, 2602.11693) for ideas only.
- **Ours.** A head prior trained only on CC0 and consented heads (no FLAME), in the template's own topology.
- **Defaults.** 30 components, prior weight 1.0.
- **Fails → fallback.** The template's mean head scaled to the face.
- **Gate.** Side-silhouette IoU ≥ 0.9.
- **Status.** *Partial*: ellipsoidal shell in `rig.py` and `anime.py`; prior *to build*.

#### L24 Likeness-gated stylisation and caricature
- **Purpose.** The painted look has gently stylised proportions; stylisation must never cost likeness, and
  the likeness lost with the photo texture is put back into geometry.
- **In → Out.** Neutral face $F$, population mean $\bar F$ (L23), style $s\in[0,1]$, caricature $\gamma \in
  [0, 0.3]$ → stylised face map applied to every expression:
  $F_{s,\gamma} = M_s\big(\bar F + (1+\gamma)(F-\bar F)\big)$, with $M_s$ a linear map so all 52 expressions
  remain morph targets.
- **Method.** $M_s$: smooth local scalings around the eyes, nose, mouth and jaw (as in `anime.py`).
  Caricature: exaggerating a face's deviation from the average is recognised as well as or better than the
  veridical drawing (the "caricature advantage", Rhodes, Brennan and Carey 1987); unlike $M_s$, which pulls
  every face towards one style, $\gamma$ pushes each face away from the average. Deviation is shrunk by
  L21's confidence first, so noise is not exaggerated. **Geometric likeness score** (style-independent):
  run L7's landmarker on the neutral and two three-quarter renders, and combine (a) the Procrustes residual
  against the captured canonical face and (b) a vector of ~20 identity ratios (eye spacing / face width,
  nose length / face height, jaw angle, lip thickness, brow height…) normalised by the spread of the bench
  impostors; the score is the margin to the best impostor. Choose $(s, \gamma)$ by a small grid search
  that maximises $s$ and the score subject to the score's margin ≥ 0.05; SFace may veto a choice (check
  only, L3) but never selects it.
- **Research.** Stylised avatars that keep identity: AgileAvatar (2211.07818), ToonifyGB (2505.10072),
  exemplar-based portrait stylisation (2104.14559), LeGO (2403.15227); the caricature advantage (Rhodes et
  al. 1987, *Cognitive Psychology*; cited from the classic literature, not re-read in this round); SFace
  is trained on photographs (2205.12010), so its scores on painted renders are out of domain.
- **Ours.** Style strength and caricature set per person by a style-independent likeness constraint; the
  pixel ban answered by geometry, not texture. (Novelty **UNVERIFIED**.)
- **Defaults.** $s_{max}$ = 0.35 for the painted look (realistic proportions; 0.8 reproduces the earlier
  anime proportions, owner decision D7); $\gamma$ grid {0, 0.1, 0.2, 0.3}.
- **Fails → fallback.** $s = 0$, $\gamma = 0$.
- **Gate.** S1 and S2 hold at the chosen $(s, \gamma)$; ablation $\gamma = 0$ vs. chosen (§8.5).
- **Status.** *Partial*: `stylise_map` in `anime.py`; caricature, geometric score and search *to build*.

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
  finger segment (needed for the South Asian count on the phalanges, L80).
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
  used by the arm solver (L79).
- **Method.** Shoulders and wrists use swing–twist decomposition with an elliptical swing cone; elbows and
  finger joints are hinges with ranges; coupling rules for fingers (DIP ≈ ⅔ PIP; ring and little finger
  enslavement). No learned plausibility field: the shippable pose sets are non-commercial and our own
  captures are minutes long; analytic limits, coupling and the swivel cost already exclude impossible
  poses. A hand synergy space (L80) is added only if our consented hand captures are large enough.
- **Research.** Biomechanical limits (2509.06607, 2605.09258); hand synergies (Santello et al. 1998).
- **Ours.** —
- **Defaults.** Elbow 0–150°; MCP −20–90°; PIP 0–110°; DIP 0–80°; wrist flexion −70–80°.
- **Fails → fallback.** Hard clamp.
- **Gate.** S7 (limits after every layer, including the spring layer L84).
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
  face with density and colour, painted by L53 with hair strokes and given a broken outline of small cards
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

#### L33 The template mesh (authored once)
- **Purpose.** Everything that must be made by hand, made once, for everyone.
- **In → Out.** Authoring (once) → a waist-up template: animation edge loops, five-finger hands, mouth bag,
  eye sockets, ears, teeth and tongue, UV charts, skeleton with twist and helper joints (L27), skin weights,
  pose correctives, LODs, and the **authored painting attributes** per vertex: shading-normal blend weights
  and forced light/dark offsets (L52), line width and colour controls (L56), stroke layout and orientation
  per chart (L53), garment cages (L49), the hair scalp (L47).
- **Method.** Start from the MakeHuman base mesh (core assets CC0 per the MakeHuman licence page; asset
  version and hash pinned in L3; no MakeHuman code used; owner decision D2), cut to waist-up, retopologised
  where our face binding (L35) and the mouth need denser loops; or, if D2 says no, model our own. The face
  region gets a fixed correspondence to MediaPipe's 468 points, made once.
- **Research.** Production practice of one topology per character family; MakeHuman licence pages
  (makehumancommunity.org); Guilty Gear Xrd authored normals and line control (Motomura, GDC 2015).
- **Ours.** A template whose painting attributes are authored once and inherited by every person.
- **Defaults.** LOD0 ≈ 45k triangles (≈ 12k face), LOD1 20k, LOD2 8k; A-pose bind.
- **Fails → fallback.** None at build time (the template is a fixed asset); a template change re-runs the
  bench.
- **Gate.** Manifold, no self-intersection; library poses (S7) deform without flipped triangles on 8 bench
  bodies; owner approves the authored attributes on the bench renders.
- **Status.** *To build* (`anime.py` and `body.py` parts are replaced).

#### L34 Template fit
- **Purpose.** The template takes the person's shape without losing its loops, UVs or rig.
- **In → Out.** Template, canonical face (L17–L22, stylised by L24), head (L23), ears (L25), neck (L26),
  skeleton (L27), posture (L28), body volume (L31) → fitted vertex positions in template topology.
- **Method.** (1) Fixed landmark correspondences (face points → template face vertices, skeleton joints →
  template joints). (2) Non-rigid ICP with stiffness annealing (Amberg, Romdhani and Vetter 2007) to the
  completed head and the silhouette-fitted body profiles. (3) Laplacian detail preservation (Sorkine et al.
  2004) so edge loops and authored regions keep their layout. (4) Joint positions re-derived from the fitted
  surface and the measured bone lengths. One sparse solve per stage on the GPU.
- **Research.** Optimal-step non-rigid ICP (Amberg et al., CVPR 2007); Laplacian surface editing (Sorkine
  et al., SGP 2004); deformation transfer (Sumner and Popović 2004).
- **Ours.** —
- **Defaults.** Stiffness schedule 50 → 1 over 6 steps.
- **Fails → fallback.** Fit to the face and skeleton only, body volumes from ratios.
- **Gate.** Face points within 0.5% of eye distance of L17–L24's face; head, neck and body silhouette IoU
  ≥ 0.9; no flipped triangles.
- **Status.** *To build*.

#### L35 Face binding and expression morphs
- **Purpose.** Every face, lid, lip and brow vertex follows the person's 468 points, so their measured
  expressions become GPU morph targets.
- **In → Out.** Fitted template + face points → sparse linear map $V = G\,P + d$ on the face region;
  52 morph targets $G D_k$ (and kept correctives $G C_{ij}$).
- **Method.** Template face vertices are fixed linear combinations of nearby points (radial falloff,
  computed once on the template, re-normalised after the fit); because $G$ is linear, each personal delta
  becomes a morph target of the whole head. No seam: the face region *is* template topology.
- **Research.** Rig-space binding (2003.09820, ideas); deformation transfer (Sumner and Popović 2004).
- **Ours.** The binding that turns the person's measured expressions into template morph targets.
- **Defaults.** Falloff 2.5 rings beyond the face oval.
- **Fails → fallback.** —
- **Gate.** Max vertex error vs. direct evaluation < 0.1 mm; no shading discontinuity across the old oval
  line (band-boundary test, L52).
- **Status.** *Partial*: the binding exists for the older face mesh (`Character.build` in `anime.py`);
  template binding *to build*.

#### L36 Skin weights
- **Purpose.** How much each bone moves each vertex.
- **In → Out.** Template weights + fitted mesh → ≤ 4 weights per vertex.
- **Method.** The template's authored weights are carried through the fit (same topology); only
  re-normalised, and finger weights restricted to their own chain. Shoulder weights are smoothed under the
  arm for garments that must not ride up when an arm is raised above 90° (L49).
- **Research.** Pinocchio heat diffusion (Baran and Popović 2007) for authoring; robust biharmonic skinning
  (2406.00238).
- **Ours.** —
- **Defaults.** 4 influences.
- **Fails → fallback.** —
- **Gate.** No tearing or folding (flipped triangles = 0) on every frame of every library action.
- **Status.** *Partial*: ring-to-bone weights for tubes in `body.py`; template weights *to build*.

#### L37 Runtime deformer: correctives and skinning
- **Purpose.** Elbows, shoulders and knuckles keep their shape; wrists do not "candy-wrap"; dual
  quaternions do not bulge.
- **In → Out.** 52 face values, joint angles → deformed vertices.
- **Method.** On the GPU: 52 face morphs (only active targets: a viseme frame uses fewer than 15) from a
  float texture, then template pose correctives driven by a radial basis of the joint swing angles
  (keyed on the combined clavicle + glenohumeral angle at the shoulder, L79), then a per-vertex blend of
  linear (LBS) and dual-quaternion (DQS) skinning with weight $\alpha$ high near twisting joints (forearm,
  wrist) and low at bending creases. With twist and helper joints (L27) few correctives are needed.
- **Research.** Dual-quaternion skinning (Kavan et al. 2008); neural blend shapes (2105.02451);
  pose-dependent deformation distilled for mobile (TaoAvatar 2503.17032); velocity skinning (2104.04934).
- **Ours.** Correctives as template assets scaled by the fit (no per-person training).
- **Defaults.** $\alpha$ = 0.8 on the forearm, 0.2 at the elbow crease; 3 correctives per shoulder, 2 per
  elbow, 1 per knuckle row.
- **Fails → fallback.** LBS, no correctives.
- **Gate.** Volume change at elbows and wrists < 10% and silhouette error at a 90° elbow bend ≥ 20% lower
  than without correctives, across the library.
- **Status.** *To build*.

#### L38 Levels of detail
- **Purpose.** Hold 30 fps on weak GPUs.
- **In → Out.** Template LODs + the fit → LOD0, LOD1, LOD2 positions, face at full detail in all.
- **Method.** The template's LODs are authored once; per person each LOD vertex is a fixed barycentric
  combination of LOD0 vertices, so the fit carries over with no decimation at build time.
- **Research.** Garland and Heckbert (1997) for authoring; level-of-detail perception (2501.17085).
- **Ours.** —
- **Defaults.** Switch by measured frame time (L92).
- **Fails → fallback.** LOD0 only.
- **Gate.** LOD2 silhouette IoU ≥ 0.97 vs. LOD0 at panel size.
- **Status.** *To build*.

---

### Stage E: Appearance, eyes, mouth, hair and clothes (L39–L50)

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
  mean. **Variant, only if the owner allows it (D1):** a band-limited field on the face chart (smooth
  least-squares field, low-passed below $f_c$), checked by L42's band test. The ablation (§8.5) reports
  what the field adds over the parametric model.
- **Research.** Inverse rendering on avatars (2312.05210, 2407.15212); albedo estimation without
  light-skin bias (2205.03962, 2406.13149, 2411.12002); spatial frequencies used in face recognition
  (Näsänen 1999, *Vision Research* 39).
- **Ours.** Parametric colour as the shipped model, low information by design.
- **Defaults.** 14 regions; polynomial order 2.
- **Fails → fallback.** One colour per region.
- **Gate.** Mean ΔE₀₀ to measured skin colour (L13) < 3; no region darker than 3σ of its own frames (no
  baked shadows).
- **Status.** *Partial*: colour-point appearance in `splats.py`/`build.py` (fits pixels; replaced by this
  model); `pack.py` measures colours.

#### L41 Region palette, skin tone and shine
- **Purpose.** A painter's palette: a few colours per region, which is what a painting of a face uses, and
  where the skin shines.
- **In → Out.** Colour model → regions (forehead, cheeks, nose, lips, under-eye, chin, neck, ears, hands)
  each with light, half-tone, shadow and terminator colours, a shine level (none/low/high), a subsurface
  tint; Monk Skin Tone class.
- **Method.** Skin tone class by nearest Monk swatch in CIELAB. The light/shadow colours shift hue as a
  painter would (warm lights, cooler, slightly more saturated shadows) by an **artist-authored table** for
  all ten Monk classes, painted over reference swatches and checked by S16 (no learned shift, which would
  need training data we do not have). On deep skin the value contrast between bands is low; form is carried
  by rim, painted highlight and warm bounce instead, so the table raises those rather than darkening the
  shadow. Shine: one level per region with a per-Monk default, adjusted only when a clear highlight is seen
  in several frames (measured specular roughness is not used: oil, make-up, compression and auto-exposure
  confound it). Subsurface tint from the palette, not from a photo's terminator. Colours are applied **per
  texel** through the region gradient (L40), so cheek, lip and under-eye variation survives banding.
- **Research.** Skin-tone fairness (2205.03962); Gooch cool-to-warm shading (Gooch et al. 1998); painted
  light on dark skin (art practice; no paper verified).
- **Ours.** Monk-aware painterly palette rules authored for every class.
- **Defaults.** 4 colours per region; shine "low" on forehead and nose.
- **Fails → fallback.** Single skin colour per band.
- **Gate.** Region colours stable between two halves of the capture (ΔE₀₀ < 3); owner's form-readability
  check per Monk group on the bench.
- **Status.** *Partial*: Monk class and colours in `pack.py`; authored table *to build*.

#### L42 No-copy guard: information-budget certificate
- **Purpose.** Prove that no photo pixels are on the model, in a way a copy would fail.
- **In → Out.** The `.pbmodel` and the build graph → a certificate listing every photo-derived number
  (name, count, precision, layer) with its total, and a pass/fail report.
- **Method.** (1) **Certificate**: the build graph tags each value derived from photo pixels (as opposed to
  landmarks or masks); the certificate sums them; the budget is fixed in code (parametric colour: a few
  hundred numbers). A copied image cannot fit in the budget. (2) **Painter audit**: the painter's inputs
  (L53) are only renders of our own fitted template; the audit checks that no photo or photo-derived image
  is on that path. (3) **Patch check** as a sanity test: compare 16×16 patches of the final painted textures
  with every source frame's aligned face by NCC, against a threshold calibrated on *different* people. (4)
  **Only if the colour field is allowed (D1)**: the v1 test (high-pass both, NCC) cannot fail on a
  low-passed field, so it is replaced by a test in the band 2–6 cycles per eye distance: the field's NCC to
  the person's own aligned faces in that band must not exceed the 99th percentile of its NCC to *other*
  bench people's faces by more than a margin. (5) Clothes and background are never learned (L49).
- **Research.** Nearest-neighbour matching against training images is a common way to audit generative
  models for memorisation (general practice; no single source verified here: **UNVERIFIED**).
- **Ours.** A certificate of what was measured, rather than a test of what was not copied. We did not find
  this as a stated build check in prior avatar work.
- **Defaults.** Budget 600 numbers (parametric); patch NCC threshold = 99th percentile of the cross-person
  distribution on the bench.
- **Fails → fallback.** Drop to one colour per region; if the painter audit fails, the build stops.
- **Gate.** S15 on every build.
- **Status.** *To build*.

#### L43 Feature curves: brows, lids, lip line, lashes
- **Purpose.** Brows, eyes and lips carry most of a face's identity at a glance; draw them crisp.
- **In → Out.** Face points + masks → vector features: brow shapes (upper and lower outline, thickness
  along the brow, colour), lash line weight, lip outline and colour gradient (upper darker), eye-line shape.
- **Method.** Brow outline: from the brow landmark pairs (`BROW_L/R` in `anime.py`) refined to the brow
  mask edge by 1-D search along normals; thickness profile sampled at 9 stations. Lips: the outer and inner
  rings give the outline; colour from L41's lip region. Curves are numbers (control points), counted in L42.
- **Research.** Line drawings (1810.01175); stylised feature rendering in ToonifyGB (2505.10072).
- **Ours.** Features measured as vectors and painted by our painter and shader.
- **Defaults.** 9 thickness stations per brow.
- **Fails → fallback.** Landmark-only brows.
- **Gate.** Brow-shape IoU ≥ 0.8 vs. the masks in the front view.
- **Status.** *Partial*: brow ribbons from landmarks in `anime.py`.

#### L44 Eyes
- **Purpose.** Eyes that look at the student, with the person's iris colour, never a "sticker" at
  three-quarter angles, and never showing the inside of the head.
- **In → Out.** Eye rings, iris centre and radius, iris colour → two eyeballs (sclera, iris with layered
  pattern, pupil, cornea), placed and sized in mm; a tear-line strip and a caruncle.
- **Method.** Eyeball radius 12 mm; centre behind the iris by the iris–centre distance; iris radius
  measured (L18). The iris is shaded procedurally (radial fibres + limbal ring + darker collarette), in the
  measured colour. **Optics**: iris parallax (cornea refraction approximated by offsetting the iris UV along
  the view ray by the anterior-chamber depth), limbal darkening growing with view angle, a wet tear-line
  (meniscus) strip along the lower lid and a caruncle at the inner corner. Rotation by gaze angles (L75) with
  pupil size tied to scene brightness.
- **Research.** Eye modelling (Bérard et al. 2014; EyeNeRF 2206.08428); gaze redirection (2411.12981).
- **Ours.** Measured, procedurally painted iris; no iris pixels.
- **Defaults.** Gaze range ±30° horizontal, ±20° vertical; anterior chamber 3 mm.
- **Fails → fallback.** Dark-brown iris.
- **Gate.** No head-interior pixels visible at ±30° gaze; iris colour ΔE₀₀ < 5 vs. L13; owner judges the
  three-quarter eye "not flat" on 8/8.
- **Status.** *Partial*: generated eye spheres and shader eyes in `anime.py`; optics *to build*.

#### L45 Eyelids and lashes
- **Purpose.** Lids that hug the eyeball and follow gaze; lashes and blinks.
- **In → Out.** Eye rings, personal expression deltas → lid geometry that slides over the eyeball.
- **Method.** Upper and lower lid vertices are projected onto a sphere 0.5 mm larger than the eyeball
  each frame (so no gap appears); vertical gaze lifts the upper lid by 0.4 × pitch; lash strips are
  ribbons along the upper lid with thickness from L43.
- **Research.** Lid–gaze coupling in eye animation (Bérard et al. 2014; codec avatars with gaze 2008.05023).
- **Ours.** —
- **Defaults.** Lid follow 0.4.
- **Fails → fallback.** —
- **Gate.** No lid–eyeball gap at any gaze in ±30°; full closure at eyeBlink = 1.
- **Status.** *Partial*: lid ribbons in `anime.py`.

#### L46 Teeth, gums, mouth cavity and tongue
- **Purpose.** A mouth that is solid inside; teeth visible exactly when lips part; a tongue for the
  sounds where it shows.
- **In → Out.** Inner lip ring, jaw, tongue controls (L70) → upper teeth (fixed to the skull), lower teeth
  (on the jaw), gums, a dark-shaded cavity, tongue pose.
- **Method.** The template's teeth arch is scaled per person (width from the mouth-corner distance; height
  from the inner-lip opening in "aah" frames); upper arch fixed to the head, lower to the jaw rotation from
  jawOpen; the cavity is the template's mouth bag, shaded darker with depth. The tongue is the template's
  tongue on a 4-bone chain (root, body, blade, tip) with 5 key poses: rest, tip up (t, d, n, l), tip between
  teeth (θ, ð), back raised (k, g), out; retroflex (ʈ, ɖ, ɳ) curls the tip only, inside the mouth (no lip
  or jaw claim, L67).
- **Research.** Full-head models with teeth (1911.08008); mouth interiors in Gaussian heads (2409.11951);
  articulatory models (2408.05641, DYNARTmo 2507.20343); tongue reconstruction (2106.12302).
- **Ours.** Measured arch size; teeth colour from the palette (a per-Monk-neutral ivory adjusted by the "aah"
  frames' median, one number).
- **Defaults.** 8 visible teeth per arch at LOD0; tongue visible only when jawOpen > 0.15 or tongueOut > 0.
- **Fails → fallback.** Dark cavity; tongue at rest.
- **Gate.** No see-through mouth at any expression; teeth visible iff inner lips separate > 1 mm; tongue
  visible on "th" and "l" in close-up renders and never through the teeth.
- **Status.** *Partial*: cavity in `rig.py`; teeth spheres and a tongue shape in `anime.py`.

#### L47 Hair shape (library first)
- **Purpose.** Their hairstyle, length, parting and volume, as large painted clumps, which is how the
  reference look draws hair.
- **In → Out.** Hair masks from several views, hair colour, length, parting, head covering → a fitted style
  from an owned parametric clump library, plus a few flyaway ribbons.
- **Method.** (1) **Library**: owned parametric clump-hair meshes (short, crop, side part, curls, bob,
  shoulder, long straight, long wavy, bun, braid, ponytail, and head coverings: turban, dupatta over the
  head, hijab, cap), each with control points for parting, fringe, length, volume and clump count (in the
  spirit of CHARM's control points, 2509.21114). (2) **Fit**: choose the style and its parameters by
  matching the visual-hull silhouettes of the hair masks in front and three-quarter views (chamfer + IoU),
  parting position from the front view. (3) **Detail**: 10–30 guided ribbons for flyaways and lock edges,
  grown along a smoothed 2D orientation field where views allow; this is optional and never on the critical
  path. Clumps are opaque, with alpha-to-coverage tips (L58), so no transparency sorting is needed.
- **Research.** Hair cards from one image (HairDeck 2610.40599), CGHair (2604.03716); control-point
  hairstyles (CHARM 2509.21114); multi-view strand reconstruction needs dense video and long optimisation
  (Neural Haircut 2306.05872; EfficientMonoHair 2604.05794), so it stays research.
- **Ours.** A pixel-free hair pipeline: only masks, length, parting and colour select and shape owned clumps.
- **Defaults.** 20–40 clumps; 6 segments each.
- **Fails → fallback.** The nearest library style at default parameters for the measured length.
- **Gate.** Hair silhouette IoU ≥ 0.8 in front and three-quarter views; owner judges the style "theirs" on
  ≥ 7/8.
- **Status.** *Partial*: locks from measured length/volume/parting in `make_hair` (`anime.py`); library
  *to build*.

#### L48 Hair motion
- **Purpose.** Hair that sways a little with the head and never passes through it.
- **In → Out.** Head motion → clump spine poses.
- **Method.** Each clump has a spine of 3–6 spring bones: a damped second-order follow of its rest
  orientation (stiff at the root, softer at the tip), solved in the worker; collisions of spine points
  against 3 head/neck/shoulder capsules by projection. The clump mesh is skinned to its spine.
- **Research.** Augmented mass–spring hair with a ghost rest shape (2412.17144); XPBD (Macklin et al.
  2016) for the optional particle variant; neural hair simulation (2507.05191) for ideas.
- **Ours.** —
- **Defaults.** 20–40 spines; root frequency 4 Hz, tip 1.5 Hz, damping ratio 0.7.
- **Fails → fallback.** Rigid hair.
- **Gate.** No spine point inside a head capsule; stable at 30 fps for 10 min.
- **Status.** *To build*.

#### L49 Wardrobe and garment fit
- **Purpose.** New clothes (Indian and Western) that fit their body; nothing from the photos.
- **In → Out.** Fitted body + outfit parameters (garment type, colour, sleeve, collar, ease) → garment mesh
  skinned to the same bones.
- **Method.** Garments are authored once on the template (cages, UVs, painted fold strokes), so per person
  they follow the template fit; parameters set ease, hem height, neckline curve and sleeve length;
  garment-specific parts (kurta placket, dupatta strip, saree pallu over one shoulder, shirt collar, blazer
  lapels). Skin weights from the template's smoothed shoulder weights (L36), so garments do not ride up
  when an arm is raised; a min-distance constraint keeps cloth outside the body.
- **Research.** Garment-aware rigging (TailorRig 2611.02902); bone-driven garments (HyperBones 2605.20460);
  made-to-measure garments (2405.17609, ideas only).
- **Ours.** A wardrobe of parameters with Indian garments, authored once on the template.
- **Defaults.** 6 garments at launch: kurta, saree (pallu), shirt, blazer, T-shirt, sweater.
- **Fails → fallback.** Plain shirt.
- **Gate.** No body vertex outside the garment on any frame of the library, including arms above 90°.
- **Status.** *Partial*: offset tubes and outfit colours in `body.py`.

#### L50 Garment motion
- **Purpose.** Dupatta and pallu that move; folds at elbows and waist.
- **In → Out.** Body motion → garment deformation.
- **Method.** Skinned garments; loose parts (dupatta, pallu, sleeve ends, kurta hem) get 3–6 secondary
  spring bones each, solved like L48 with capsule collisions; fold detail as angle-driven correctives and
  painted fold strokes (L53). Particle cloth (XPBD) is deferred to research: waist-up garments under
  gesturing arms give the most collision artefacts for the least gain.
- **Research.** XPBD (Macklin et al. 2016); position-based inelasticity (2405.11694), ideas only.
- **Ours.** Simulate only what flows, with springs; skin the rest.
- **Defaults.** 4 spring chains per loose garment.
- **Fails → fallback.** Skinned only.
- **Gate.** Stable at 30 fps; 0 cloth–body penetrations > 2 mm on every frame of the library.
- **Status.** *To build*.

---

### Stage F: The painted look (L51–L60)

The target is the hand-painted style of the brief's reference sheet: realistic proportions, painted skin
and hair with visible brushwork, a dramatic key light and a coloured rim light, strong readable expressions.
By the accounts available, that look's studio painted light, shadow and brushwork **into the textures** of
its 3D models (trade-press breakdowns of its texturing and an FMX 2025 session; studio details
**UNVERIFIED** beyond those secondary sources). Version 1 instead put a screen-space Kuwahara filter over
toon bands: a nonlinear sector choice that shimmers in motion, gives a generic "oil filter" look, and was the
most expensive pass of the frame. Version 2 paints in texture space at build time and only *chooses* paint at
run time. All of it is our own code (WebGL2 complete; WebGPU as an optimisation). The offline painter
`paint.py` becomes the build-time painter.

#### L51 Lighting rig
- **Purpose.** The light that makes the painted forms read: a warm key, a cool fill, a coloured rim.
- **In → Out.** Site theme (light/dark, accent), the person's shape → three lights + ambient, fixed in the
  panel frame.
- **Method.** Key upper-left in front, fill right, rim behind (as `STUDIO` in `twin.py`), with colours
  from the theme palette; the key's direction is fixed relative to the camera so the face never goes dark.
  **Option (untested, off until its ablation passes):** a distinctiveness-aimed key: inside an
  art-direction cone (azimuth ±35°, elevation 10–45°), pick the direction that maximises the energy of the
  banded shading difference between the person's face and the mean face $\bar F$, weighted by L21's
  confidence (30-direction grid of low-resolution renders, < 0.1 s).
- **Research.** Studio three-point lighting; theme matching per `docs/ui/premium.md`.
- **Ours.** Rim colour follows the site theme; the distinctiveness key is our own idea (**UNVERIFIED** as
  novelty).
- **Defaults.** Key 0.85, fill 0.35, rim 0.35, ambient 0.28 (as in `twin.py`).
- **Fails → fallback.** Default palette and fixed key.
- **Gate.** Face mean luminance in [0.45, 0.75] for every bench person and theme.
- **Status.** *Exists* in part: `twin.py`.

#### L52 Shading-normal field
- **Purpose.** Banded shading has no in-between tones, so tiny normal noise becomes a blotch; painted faces
  read through large, simple light shapes.
- **In → Out.** Fitted mesh, template's authored attributes → a per-vertex shading normal and per-vertex
  threshold offsets, baked per person (and per morph target).
- **Method.** Shading normal $= \mathrm{normalize}(\mathrm{lerp}(n_{true}, n_{proxy}, w))$, where
  $n_{proxy}$ is the normal of a heavily smoothed proxy (a Laplacian-smoothed head; cylinders for neck and
  arms) and $w$ is authored on the template (≈ 0.6–0.8 on cheeks and forehead, ≈ 0.2 on the nose bridge and
  lips). Threshold offsets force areas lit or dark as painters do (under the nose, eye sockets, under the
  lower lip, the neck under the jaw). Morph targets carry shading-normal deltas, so expressions shade cleanly.
- **Research.** Authored normals and shading thresholds for stylised 3D (Motomura, *Guilty Gear Xrd's art
  style*, GDC 2015 slides).
- **Ours.** —
- **Defaults.** As above; bake ≈ 2 s.
- **Fails → fallback.** True normals with a wider soft step.
- **Gate.** In a slow head turn and a speech clip, band islands smaller than 1% of the face area: 0.
- **Status.** *To build*.

#### L53 Build-time painter: painted band textures
- **Purpose.** The brushwork and the painted light, on the surface, in the person's colours.
- **In → Out.** Renders of our own fitted template only (UV-space region ids, palette colours, curvature and
  hair-flow directions, feature curves) → per UV chart, three painted textures: **light**, **half-tone**,
  **shadow**, plus a terminator-warmth mask; for hair and garments, two bands.
- **Method.** *Default (procedural)*: our offline painter (`paint.py`) paints each band in texture space
  from the L41 palette and gradients with the owned stroke atlas (8 shapes × 3 sizes), stroke orientation
  following curvature on the body, the hair flow on hair and radial directions around eyes and mouth (the
  stroke layout is authored once on the template, L33); strokes larger in shadow and smaller near features;
  feature curves (L43) and facial-hair regions (L32) painted in; flow-aligned smoothing (anisotropic
  Kuwahara and line integral convolution) used here as offline tools to merge strokes into planes. *Variant
  for artist control*: a lit-sphere exemplar per palette family painted by an artist, transferred with
  normal guidance in the spirit of StyleBlit. *Variant, optional (owner decision D9)*: a diffusion painter
  conditioned only on those renders (normals, depth, region colours, curves), with synchronised multi-view
  denoising in UV space and lit/unlit separation, one pass per band, its style taken only from an owned
  style kit (D3, D4); never trained on or shown frames of the series. The painter never sees a photo (L42
  audit). Once an owned style kit exists, a *style distance* (feature-statistics distance of bench renders to
  the kit) becomes a machine gate beside the owner's rating (S18).
- **Research.** Painterly rendering for animation (Meier 1996); StyleBlit (Sýkora et al. 2019, 1807.03249);
  SyncMVD (2311.12891), MVPaint (2411.02336), Paint3D (2312.13913), TEXTure (2302.01721) for the diffusion
  variant; anisotropic Kuwahara (Kyprianidis et al. 2009) and LIC (Cabral and Leedom 1993) as bake tools;
  stylised scene methods (StyleGaussian 2403.07807; ARF 2206.06360) for ideas.
- **Ours.** Painted light as separate band textures painted from measured colour numbers on an owned
  template, chosen per pixel at run time (L54).
- **Defaults.** 256² face chart, 128² elsewhere per band (≈ +1 MB); bake ≈ 8 s (procedural, estimate).
- **Fails → fallback.** Flat palette bands (no strokes).
- **Gate.** S18; flicker (L58) ≤ the plain shaded render; L42 painter audit passes.
- **Status.** *Partial*: offline painter in `paint.py`; texture-space bands *to build*.

#### L54 Painted shading model (run time)
- **Purpose.** Light and shadow as painted shapes, not smooth CG gradients.
- **In → Out.** Shading normal (L52), shadow map and occlusion (L55), lights, band textures (L53) → shaded
  colour per pixel.
- **Method.** Band coordinate $d = \mathrm{wrap}(n_s\cdot l) \cdot$ shadow $\cdot$ occlusion + threshold
  offset; the painted light, half-tone and shadow textures are blended with a soft step on $d$ (edge width
  0.08), and the terminator-warmth mask adds the warm band between them. Shadows are therefore cooler and
  more saturated because they were *painted* so (L41), not because of multiplying albedo by light.
  Specular is a small painted highlight shape where L41 says. Rim: $r = (1-n\cdot v)^p \cdot \max(0, n
  \cdot l_{rim})$, coloured, stronger on deep skin per the L41 table.
- **Research.** Cool-to-warm shading (Gooch et al. 1998); toon/cel shading (the lab `toon.js`); painterly
  harmonisation (2312.10263, ideas).
- **Ours.** Run-time choice between painted band textures by a stabilised normal.
- **Defaults.** 3 bands on skin, 2 on hair and cloth; rim power 4.
- **Fails → fallback.** Two-tone toon shading (current `toon.js`).
- **Gate.** S18; form readable per Monk group (owner's check on the bench).
- **Status.** *Partial*: MToon-based lab shader in `player/toon.js`; band blending *to build*.

#### L55 Key-light cast shadow and baked occlusion
- **Purpose.** Readability in the reference look comes from cast shadows (hair on the forehead, nose on the
  cheek, chin on the neck, the pointing hand on the chest) and darkened eye sockets and under-chin areas.
- **In → Out.** Deformed meshes, key light → a stylised shadow term; per-vertex occlusion.
- **Method.** One 1024² shadow map for the key light covering head, hair and hands; hard-edged, sampled with
  a small fixed kernel, and fed into the band coordinate (so a shadow selects the painted shadow texture,
  tinted by the region's palette). Per-vertex ambient occlusion baked at build time on the rest pose and on
  each of the 52 targets, interpolated with the morphs.
- **Research.** Shadow mapping and baked occlusion (standard real-time practice).
- **Ours.** —
- **Defaults.** 1024² map; ~25k shadow-casting triangles.
- **Fails → fallback.** Occlusion only (tier "basic").
- **Gate.** GPU time ≤ 1.2 ms on the reference laptop (estimate 0.8–1.2 ms, **UNVERIFIED** until the spike,
  §8.6); no shadow acne in the head-turn clip.
- **Status.** *To build*.

#### L56 Lines
- **Purpose.** Painted outlines and feature lines: eyelids, lip line, brows, nose side, jaw contour,
  creases (L22).
- **In → Out.** Deformed meshes, authored line attributes, feature curves → line layer.
- **Method.** WebGL2 path: an **inverted-hull** outline extruded in clip space for constant pixel width,
  with per-vertex width and colour authored on the template (thinner in light, thicker in shadow, broken at
  authored places), plus screen-space depth/id edges for interior contours. WebGPU path: compute-shader
  skinning, then occluding contours from face-normal sign changes on the deformed mesh. Feature curves
  (L43, L22) drawn as textured ribbons whose weight follows the light and the expression.
- **Research.** Line drawings from 3D models (1810.01175); line control in stylised 3D (Motomura 2015);
  XDoG (Winnemöller et al. 2012) as used offline in `paint.py`.
- **Ours.** Expression-driven crease lines from measured curves.
- **Defaults.** Line colour = darkest palette colour of the region, never black.
- **Fails → fallback.** Screen-space edges only.
- **Gate.** No line flicker (L58) and lines present on all 8 features in every bench render.
- **Status.** *Partial*: offline lines in `paint.py`; outline in `toon.js`.

#### L57 Painted eyes and hair highlights
- **Purpose.** The two places where painted characters are most expressive.
- **In → Out.** Eye and hair materials → specialised shading.
- **Method.** Eyes: a painted catch-light shape fixed to the key light direction, iris shadow under the
  upper lid (an occlusion band driven by lid position), sclera tinted towards the skin's shadow colour at the
  corners, with L44's parallax and limbal darkening. Hair: a two-lobe anisotropic highlight shifted along
  the clump tangent (Kajiya–Kay style, simplified), drawn as a broken painted band.
- **Research.** Real-time strand rendering (2405.10565); light-aware Gaussian hair (2402.10483, ideas).
- **Ours.** —
- **Defaults.** Catch-light radius 12% of iris.
- **Fails → fallback.** Plain shading.
- **Gate.** Catch-light visible in both eyes in 100% of frames with gaze within ±20°.
- **Status.** *Partial*: matcap highlights in `toon.js`.

#### L58 Anti-aliasing and temporal stability
- **Purpose.** Banded edges and thin dark lines alias badly at 720p; nothing may crawl or flicker.
- **In → Out.** The forward pass → an anti-aliased, stable frame.
- **Method.** 4× MSAA in the forward pass (WebGL2 multisampled renderbuffers, then a blit), alpha-to-coverage
  for hair tips and lash edges (no sorting); a cheap morphological AA on the "basic" tier. Because the paint
  is on the surface, temporal reprojection is **off** by default (without sub-pixel jitter it only smears a
  fast mouth); a jittered TAA restricted to skin and hair ids may be enabled later if the flicker gate needs
  it.
- **Research.** Temporal coherence in stylised animation (Bénard, Thollot, Collomosse, CGF 2011, cited from
  memory); temporal anti-aliasing practice.
- **Ours.** —
- **Defaults.** MSAA 4×; TAA off.
- **Fails → fallback.** MSAA 2× or morphological AA.
- **Gate.** Edge-crawl and flicker metrics (mean absolute frame difference after motion compensation) on a
  slow head-turn clip ≤ 1.5× the plain shaded render.
- **Status.** *To build*.

#### L59 Render graph
- **Purpose.** Do all of the above within the frame budget of an integrated GPU, which is limited by
  memory bandwidth.
- **In → Out.** Deformed meshes → shadow pass → forward MSAA pass (colour + one id/velocity target) → line
  pass → composite.
- **Method.** WebGL2 complete (WebGPU, now in Chrome/Edge and Safari and partly in Firefox, as an
  optimisation for compute skinning and contours): pass 1 shadow map; pass 2 forward shading of body,
  garments, hair and eyes with band textures; pass 3 lines; pass 4 composite with premultiplied alpha.
  No five-target G-buffer and no half-resolution filter pass. Morph targets live in a float texture
  (52 × face vertices), only active targets evaluated.
- **Research.** Skinned Gaussian avatars on the web run 40–50 fps on a phone and 240 fps on a laptop GPU
  (2510.13978), which bounds what a mesh pipeline should reach; WebGPU browser status (web.dev, 2025).
- **Ours.** —
- **Defaults.** 720p panel.
- **Fails → fallback.** Drop passes by tier (L92).
- **Gate.** S14.
- **Status.** *Partial*: three.js lab players in `scripts/teacher/maker/player/`.

#### L60 Compositing, transparency and the AI label
- **Purpose.** The person only, over the lesson, always labelled.
- **In → Out.** Frame → premultiplied RGBA in the panel, with a visible "AI-generated" badge and an
  invisible frame watermark.
- **Method.** Alpha from MSAA coverage, premultiplied before any pass reads neighbours (otherwise the
  lesson background bleeds dark fringes into hair edges); a soft edge of 1 px. The label is part of the
  panel UI and cannot be hidden by the page. Recorded lesson clips carry the label burned in and a frame
  watermark (a low-amplitude spread-spectrum pattern in the chroma of the person region).
- **Research.** Audio-visual tamper-resistant watermarking (LAVA 2604.23957; cross-modal 2507.12723, ideas).
- **Ours.** Label enforced in the player component.
- **Defaults.** Badge always on.
- **Fails → fallback.** Player refuses to render without the label component.
- **Gate.** 100% of rendered frames and exported clips carry the label; watermark detected after
  re-encoding at 1 Mbps; no dark fringe on hair over a white lesson background.
- **Status.** *To build* (transparent output exists in `perform.py`).

---

### Stage G: Voice (L61–L66)

Voice runs on the server: lesson narration once at publish time, live replies on demand (§7.4). Each audio
chunk is shipped to the browser with its aligned phones, prosody and the 52 mouth values of Stage H.

#### L61 Text normalisation and language routing
- **Purpose.** Turn Guru's text (English, Hindi in Devanagari, Hinglish in Latin script, code, maths) into
  speakable words in the right language per span.
- **In → Out.** Text → clauses of spans `{lang, script, words}`.
- **Method.** Rules for numbers, units, symbols and code identifiers (spoken as the lesson speaks them:
  `arr[i]` → "arr of i"); script detection per token; Hinglish tokens in Latin script are tagged by a
  small language-ID classifier and transliterated to Devanagari when Hindi. Inside Hindi-dominant clauses,
  English loanwords are respelled in Devanagari (the Indian-English phonology Hinglish speakers use), so a
  whole clause is synthesised in one call (L63) instead of being stitched from language spans.
- **Research.** Code-mixed TTS (2409.10969, 2412.19043); script-first multilingual TTS (2510.25178);
  Hindi–English code-switching corpus (1810.00662).
- **Ours.** Code- and maths-aware normalisation from our lesson vocabulary.
- **Defaults.** English unless a span is classified Hindi with p ≥ 0.7; a clause's language is its
  dominant span language.
- **Fails → fallback.** English pronunciation.
- **Gate.** Round trip: ASR of the synthesised Hinglish set has character error rate ≤ 15%.
- **Status.** *To build* (voice rules in `docs/voice/` apply).

#### L62 Grapheme to phoneme: a pronunciation lattice
- **Purpose.** Every language becomes the same sound alphabet, which drives the lips (contradiction C5),
  with the alternatives a real voice may choose.
- **In → Out.** Words per language → a lattice of IPA phone paths with stress and syllables.
- **Method.** English: a pronunciation dictionary with a neural fallback for unknown words. Hindi: the
  script is nearly phonemic except **schwa deletion**, handled by a classifier on the orthography; nasal
  vowels and anusvara resolved by the following consonant's place. Other Indian languages: rule tables per
  script. The lattice adds the alternatives a zero-shot voice may realise: optional schwa, [ʋ]/[w]/[v],
  Indian-English retroflex t/d, nasal vowel vs. nasal + stop for anusvara. L64 picks the path from the audio.
- **Research.** Hindi and Punjabi schwa deletion (2004.10353); multilingual G2P (2204.03067, 1708.01464);
  IPA-based cross-lingual alignment (2311.08323); speaker and regional variation in Indian English (Indic
  TIMIT, 2204.06502).
- **Ours.** Anusvara and nasal rules that also feed the lips (no closure unless a labial follows); the
  lattice as the lips' input instead of one predicted string.
- **Defaults.** ≤ 4 alternatives per word.
- **Fails → fallback.** Letter-to-sound rules, single path.
- **Gate.** Phone error rate of the best lattice path ≤ 5% on a 500-word Hindi and a 500-word English list.
- **Status.** *Partial*: the voice server returns phones for English; Hindi G2P and lattice *to build*.

#### L63 Cloned voice synthesis
- **Purpose.** Their voice, any sentence, any supported language.
- **In → Out.** Clauses + the person's per-language reference (L15) and optional adapter → 24 kHz audio per
  clause.
- **Method.** Zero-shot cloning with Chatterbox Multilingual (MIT; Hindi among its 23 languages), using the
  dedicated Hindi checkpoint (`Chatterbox-Multilingual-hi`, MIT per its model card) for Hindi clauses. The
  project is archived ("retired research, no longer maintained", README, August 2026), so the weights and
  code are vendored and pinned by hash (L3), and a maintained second engine sits behind the same slot
  interface (CosyVoice, once its checkpoint licence is confirmed). One clause per call (no stitched
  Hinglish: pitch and energy reset at joins); reference in the clause's language, and with only a
  cross-language reference, the reference-adherence weight (`cfg_weight`) set to 0 as the README advises.
  Arousal (L72) maps to the model's `exaggeration` (0.3–0.7), paired with a lower `cfg_weight` because
  exaggeration speeds speech. Optional per-person adapter from 30–60 min of their reading, trained after
  the build (not in the 4-minute budget).
- **Research.** Chatterbox README and Hindi model card; zero-shot multilingual TTS: CosyVoice (2407.05407),
  cross-lingual cloning (2608.11650), compact TTS (2610.14776), mobile zero-shot TTS (2402.09378), StyleTTS
  2 (2306.07691); Indian-language TTS (2211.09536, 2507.15272, 2505.18609); voice cloning survey (2505.00579).
- **Ours.** Per-language references and clause-level synthesis for code-mixed speech.
- **Defaults.** Reference 20 s; first clause ≤ 12 words. First-chunk latency is **UNVERIFIED** and must be
  measured: the one-step-decoder Turbo model is English-only, and the multilingual model keeps a multi-step
  decoder, so Hindi first audio is slower.
- **Fails → fallback.** Default Indian voice (Kokoro via HeadTTS, Apache-2.0), labelled as not their voice;
  or text plus the phrase bank (L65).
- **Gate.** Speaker similarity (ECAPA-TDNN cosine, check-only, 2005.07143) between synthesis and held-out
  real speech ≥ 0.75 × the real-vs-real ceiling; intelligibility by ASR round trip (WER ≤ 8% English, CER ≤
  12% Hindi); F0 jump at clause joins < 2 semitones; MOS ≥ 3.8 in the listening test.
- **Status.** *Partial*: HeadTTS fixed voices in use (`perform.py`); cloning *to build* on the GPU worker.

#### L64 Spoken-phone alignment and prosody
- **Purpose.** The exact phones the voice *actually spoke*, with their times, plus stress, pitch and
  pauses — the clock and the content of the lips. The audio is the single truth.
- **In → Out.** Audio + the L62 lattice → `[(ipa, t0, t1)]` on the chosen path; per-syllable pitch (z-scored
  to the speaker), energy, duration, stress flag, phrase boundaries, pause lengths.
- **Method.** A CTC phone recogniser over IPA scores every lattice path; Viterbi picks the path and the
  boundaries; the chosen path, not the G2P string, drives L67–L70. It runs on every clause (Chatterbox
  exposes no durations), on streaming chunks. If alignment confidence is low, closure times are taken from
  acoustics (a stop gap or a nasal murmur on energy and spectrum), never from uniform durations. The same
  10 ms pass computes F0 and energy; stress = local maxima of a weighted sum of pitch excursion, energy and
  duration; phrase ends at pauses > 180 ms or falling pitch. Recogniser: for prototypes a ready zero-shot
  IPA recogniser (XLSR-53 fine-tuned with espeak phones, 2109.11680, or Allophant, 2306.04306), as a check
  until its licence is confirmed (BABEL in pre-training; D6); to ship, our own trained on Common Voice (CC0)
  and LibriTTS-R (CC BY).
- **Research.** IPA-based forced alignment in any language (2311.08323); neural forced alignment
  (2606.25460, 2406.19363); alignment evaluation (2608.28508); prosody for gesture and head motion
  (2210.14800, SemTalk 2412.16563).
- **Ours.** Lattice alignment of synthetic speech so the mouth shows what was said, not what was predicted.
- **Defaults.** 10 ms frames; stress threshold z ≥ 1.0.
- **Fails → fallback.** Acoustic closure detection for must-hit events; lexical stress from G2P.
- **Gate.** Median boundary error ≤ 20 ms on a hand-labelled 200-phone set per language; logged rate of
  must-hit events where lattice choice and acoustics disagree; stress agreement with a hand-labelled set
  ≥ 80%.
- **Status.** *Partial*: HeadTTS gives timings; `lipsync/prosody.py` computes prosody; lattice aligner
  *to build*.

#### L65 Personal phrase bank
- **Purpose.** Backchannels and latency fillers need about zero synthesis latency.
- **In → Out.** The person's voice reference → 30–60 short items in their cloned voice, each in 2–3 prosodic
  variants (haan, achha, hmm, theek hai, dekho, ek second, bolo, sahi, "let's see", "good question", safe
  canned hints for L89), with aligned phones, prosody and precomputed mouth and head motion.
- **Method.** Synthesised in one batch at build time through L63–L71; items chosen at run time by L88 and
  L91 by context and variant rotation (no repeat within 30 s).
- **Research.** Latency hiding in streaming digital-human agents (2608.24909).
- **Ours.** A per-person bank in the cloned voice, with its motion baked.
- **Defaults.** 40 items × 2 variants; ≤ 2 MB, streamed after the model.
- **Fails → fallback.** Visual-only backchannels.
- **Gate.** Every item passes L63's speaker and intelligibility gates and S3–S4.
- **Status.** *To build*.

#### L66 Audio watermark and provenance
- **Purpose.** Every cloned sentence can be proven synthetic and traced to the model.
- **In → Out.** Audio → watermarked audio; detector.
- **Method.** One gated mark: AudioSeal (code and weights MIT, per its README since April 2024), localised,
  carrying a 16-bit model id, so clips cut from lessons are still detectable. The TTS's own Perth mark is kept
  only if its licence is confirmed and a test shows the two do not interfere; otherwise it is removed.
- **Research.** AudioSeal localised watermarking (2401.17264); timbre watermarking (2312.03410); robustness
  across codecs (2611.04716).
- **Ours.** Model id in the mark ties audio to its consent record.
- **Defaults.** Imperceptible setting; detection on 1 s windows.
- **Fails → fallback.** No publish.
- **Gate.** Detection ≥ 99% after MP3/Opus re-encoding at 32 kbps; no audible artefacts (ABX at chance).
- **Status.** *To build*.

---

### Stage H: Lips and face performance (L67–L75)

Stage H's mouth path (L67–L71) runs on the server next to the voice and ships 52 values plus must-hit events
with each audio chunk; the browser only mixes and holds closures (L85, L92). The face layers L72–L75 run in
the browser worker.

#### L67 Phones to visemes
- **Purpose.** One articulation table for every language.
- **In → Out.** IPA phone (as realised, L64) → viseme class and mouth targets on the 52 values.
- **Method.** 12 classes by articulation: PBM (lips closed), FV (lower lip to upper teeth), TH, TD
  (dental, alveolar and retroflex stops share it; the difference is barely visible from outside and lives
  only in the tongue, L70), SH (lips forward), KG, EE, AA, OH, OO, W, silence; targets as in `phonemes.py`.
  Aspirated stops get a longer release; [ʋ] maps to FV only when realised with lip–teeth contact.
- **Research.** Viseme classes (Fisher 1968); VisemeNet (1805.09488); viseme dynamics (2301.06059);
  multilingual lip-sync data (2406.14272).
- **Ours.** A single table for all languages with Hindi additions (exists).
- **Defaults.** As in `phonemes.py`, with RETRO merged into TD.
- **Fails → fallback.** Unknown phone → nearest class by articulatory features.
- **Gate.** All IPA phones in the test set map to a class (exists: `test_every_language_sound_has_a_mouth`).
- **Status.** *Exists*: `scripts/pratibimb/engine/phonemes.py` (RETRO merge *to do*).

#### L68 Coarticulation as a constrained trajectory
- **Purpose.** Each sound's mouth shape blends with its neighbours, as in real speech, and the closures
  viewers watch most can never be missed or kinked.
- **In → Out.** Viseme timeline (with must-hit intervals) → smooth trajectories of each mouth value.
- **Method.** Per clause and per mouth value, a small banded quadratic programme:
  minimise $\sum_t \sum_i w_i(t)\,(x_t - T_i)^2 + \lambda \sum_t (\Delta^3 x_t)^2$, with **equality
  constraints** at must-hit frames (PBM closure, FV contact, held for at least max(acoustic closure, 1.5
  frames)) and bounds from the person's range (L69). Lip rounding has a low weight over a wide window
  (anticipatory rounding before /u/). Dominance functions (Cohen and Massaro 1993) give the weights $w_i$.
  **Personal coarticulation (untested):** per viseme class four parameters (target scale, spread window,
  closure hold, lead) are fitted to the person's capture speech by minimising the replay error of L71; 12 × 4
  numbers ship in the model, and because they sit on articulatory classes, they carry to languages the
  person never recorded.
- **Research.** Cohen and Massaro (1993); quantitative coarticulation from articulatory models
  (2408.05641); a geometric coarticulation measure (2610.03436); visible articulation directions
  (2609.30517); audio-visual asynchrony in natural speech varies by sound (Schwartz and Savariaux 2014, PLoS
  Comput Biol).
- **Ours.** Hard must-hit constraints with smooth approaches; personal class parameters fitted from a short
  capture and transferred through IPA (novelty **UNVERIFIED**).
- **Defaults.** Lead per class (not one constant; start at 40 ms, fitted per person); λ from a validation
  sweep. Solve < 1 ms per clause.
- **Fails → fallback.** Per-phone targets with attack/release smoothing and closure enforcement (exists).
- **Gate.** S3 and S4 by construction on controls and on rendered pixels; coarticulation path ratio
  (2610.03436) within the range of the person's real speech.
- **Status.** *Partial*: smoothing and lip check in `phonemes.py`; QP solver and personal parameters
  *to build*.

#### L69 Jaw–lip split and personal mouth range
- **Purpose.** Loud speech opens the jaw, not the lips; each person's mouth opens to their own extent.
- **In → Out.** Trajectories + loudness + motion profile → jawOpen and lip values separately, scaled.
- **Method.** Two independent controls per frame as in JALI: jaw $j(t)$ scales with the vowel's openness
  and the syllable's loudness; lip intensity $l(t)$ with articulation clarity. Then scale each class by
  the person's measured range (L16): $x \leftarrow x \cdot r_{class}^{person}/r_{class}^{pop}$. These
  ranges are the bounds of L68's programme.
- **Research.** JALI (Edwards et al. 2016); speech–lip intensity correlation (SLCC in 2503.20308).
- **Ours.** Per-class personal range from their own speech.
- **Defaults.** Jaw gain 0.6–1.2 with loudness.
- **Fails → fallback.** Population range.
- **Gate.** S6; SLCC on held-out speech ≥ the value of the person's own video (2503.20308 metric).
- **Status.** *To build* (global gains exist in the lip-sync slot).

#### L70 Tongue and teeth visibility control
- **Purpose.** Drive L46's tongue and decide teeth visibility from the sounds.
- **In → Out.** Phones → tongue pose weights, teeth-show weight.
- **Method.** Tongue poses keyed by class (TD → tip up, retroflex phones → tip curled inside the mouth,
  TH → between teeth, KG → back up) with the same trajectory solve as L68; teeth-show = smooth function of
  inner-lip separation and FV/EE.
- **Research.** Articulatory models (2507.20343, 2408.05641).
- **Ours.** Retroflex tongue for Indian languages (no visual claim outside the mouth).
- **Defaults.** —
- **Fails → fallback.** Tongue at rest.
- **Gate.** Tongue visible on 100% of θ/ð and ≥ 80% of l in close-up; teeth never visible with closed lips.
- **Status.** *To build*.

#### L71 Learned lip refiner and the replay gate
- **Purpose.** Rules get the important events right; a learned model adds the natural in-between motion;
  a replay of the person's own speech proves the whole mouth path.
- **In → Out.** Audio (16 kHz) + constrained trajectories → refined 52 values at 30 fps (on the server, sent
  with each audio chunk); a replay report.
- **Method.** An audio-to-expression network (default: wav2arkit, Apache-2.0; later our fine-tune on
  consented Hindi/English video) predicts values; fusion by a per-value weight (rules dominate closure and
  contact values, the network dominates cheeks, mouth corners and press); must-hit constraints are re-applied
  after fusion by re-solving L68 with the fused values as targets. **Replay gate**: each bench person's own
  5-minute reading (L0) is fed through L64–L71 and compared frame by frame with the 52 values MediaPipe
  tracks on the same video: per-value correlation, inner-lip distance error (the LVE idea), and a histogram
  of closure-onset offsets. The Fréchet Oral Distance (2611.01705) may be reported as a secondary rank check
  (its reference set is English-only and its licence **UNVERIFIED**; evaluation only).
- **Research.** FaceFormer (2112.05329); SAiD blendshape diffusion (2401.08655); ARTalk (2502.20323);
  personalised causal motion (2604.23692); multilingual 3D talking heads (2406.14272).
- **Ours.** Rule–network fusion with constraints re-solved; a per-person, language-independent replay gate.
- **Defaults.** Fusion weights per value from a validation sweep.
- **Fails → fallback.** Rules only.
- **Gate.** S3–S6 still hold after fusion; PLRS (2503.20308) ≥ rules-only; replay correlation on the mouth
  values ≥ rules-only.
- **Status.** *Partial*: wav2arkit slot in `slots.json`, `lipsync/wav2arkit-run.mjs`; fusion and replay
  *to build*.

#### L72 Emotion layer (face and body)
- **Purpose.** Readable emotions that match what she says, in the face and in how she moves.
- **In → Out.** Script tags `{valence, arousal}` + discrete cue (pleased, curious, concerned, thinking,
  surprised) → expression offsets on non-mouth values; body scalars (gesture tempo, amplitude, frequency,
  expansiveness, head height); voice style hints (L63).
- **Method.** Each discrete cue is a small set of action units (e.g., pleased = cheekSquint + mouthSmile
  at 0.3–0.6; concerned = browInnerUp 0.4 + browDown 0.2); continuous valence/arousal interpolate between
  them; mouth values from the cue are limited during speech so lip sync wins (mixer, L85). Arousal scales
  gesture velocity, amplitude and frequency (L81); valence scales expansiveness (open vs. closed postures,
  head up vs. down, L83); both are multiplied with the personal style scalars (L85).
- **Research.** Continuous valence–arousal control (CETalk 2608.15110); AU-controlled emotional heads
  (2602.09534); verbal–nonverbal mismatch for training agents (2608.22731); LLM interpretation of
  valence–arousal (2502.06875); Laban Effort mappings for agents (EMOTE, Chi et al. 2000; citation details
  **UNVERIFIED**).
- **Ours.** Emotion intensity scaled by the person's own expressiveness (smile and brow share from L16).
- **Defaults.** Emotion decay 1.5 s unless refreshed.
- **Fails → fallback.** Neutral-pleasant.
- **Gate.** Observers recognise the 5 cues from silent clips ≥ 70% (chance 20%), with the face and with the
  face blurred (body only) reported separately.
- **Status.** *To build*.

#### L73 Blinks, brows and micro-motion
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
- **Status.** *Exists* in part: rules in `perform.py`.

#### L74 Head motion
- **Purpose.** Nods, tilts and turns that follow speech and listening.
- **In → Out.** Prosody, turn state, gaze target → head yaw/pitch/roll.
- **Method.** Nods (pitch dips) on stressed syllables and at affirmations; slow drift from an
  Ornstein–Uhlenbeck process with the person's measured head speed and range; for gaze shifts the eyes
  start first (or together) and land first, the head continues and the eyes counter-rotate (L75); the
  head's share of a gaze shift grows smoothly with its amplitude (a contribution curve, not a 15° switch).
- **Research.** Naturalistic head motion from speech (2210.14800); speech-driven head pose (2310.20240,
  2502.20323); eye–head coordination in gaze shifts (Freedman 2008, *Biol. Cybern.*; exact figures
  **UNVERIFIED**).
- **Ours.** Person's own range and speed.
- **Defaults.** Nod amplitude 3–6°; head share 0 below 10°, rising to ≈ 0.7 at 40°.
- **Fails → fallback.** Drift only.
- **Gate.** Head speed distribution matches the person's own: median and 90th percentile within ±20% on
  6/8 bench people.
- **Status.** *Partial*: nods in `perform.py`.

#### L75 Gaze
- **Purpose.** Look at the student, at the board element being discussed, or away while thinking — and
  keep looking at the student while the head moves.
- **In → Out.** Script gaze tag, lesson target position (L78), turn state, mixed head pose → eye angles.
- **Method.** A small state machine: *student* (camera) while asking and listening; *board* at the target
  element when pointing or referring; *away* (up-left or down) briefly when "thinking" or at the start of
  a long answer (gaze aversion), returning before the key point; saccades between targets with
  main-sequence velocity; micro-saccades during fixation. **Vestibulo-ocular stabilisation**: eye angles are
  computed in world space from the gaze target *after* the head pose is mixed, so the eyes counter-rotate
  during every nod, tilt and drift and mutual gaze holds.
- **Research.** Gaze in conversation (Kendon 1967); speech-driven gaze (TalkingEyes 2501.09921); expressive
  gaze dynamics (2610.19635); turn-level interactive heads (2512.15340); spatially aware agents (SARAH
  2602.18432).
- **Ours.** Gaze that knows the lesson's element positions.
- **Defaults.** Mutual gaze 60–70% of speaking time.
- **Fails → fallback.** Student gaze with idle saccades.
- **Gate.** Gaze lands within 2° of the target element's centre within 250 ms of the cue; during fixation
  the gaze direction error stays < 1° while the head moves.
- **Status.** *To build*.

---

### Stage I: Physical actions of the upper body (L76–L85)

The aim is "every physical thing a person does with the upper body", without an animation library and
without an animator (contradiction C2). Actions are **goal programs**, solved every frame along task-space
paths, not once per key pose: most "robotic avatar" failures happen *between* key poses, so every Stage I
gate is measured on every frame of the trajectory at 30 fps.

#### L76 Action language
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
  line to target, L78)`, `shape(point)`, `look(target)`. A new action is a new expansion entry, no code.
- **Research.** Intention-aware hierarchical motion (2506.01563); LLM-driven pedagogical expression
  (2603.09536); behaviour markup traditions (BML, Kopp et al. 2006).
- **Ours.** Actions as goals over primitives, validated against limits before they run.
- **Defaults.** 30 named actions at launch (namaste, point, count 1–5, open palms, beat, wave, thumbs up,
  shrug, think (hand to chin), hand on chest, lean in, lean back, nod, shake, "this much" (two hands
  apart), steeple, rub hands, cross arms, hands on hips, emphasise (chop), offer (palm up), stop (palm out),
  welcome, clap, write-in-air, number-on-fingers, look-at-board, come-closer, okay-sign).
- **Fails → fallback.** Unknown or invalid action → nearest named action or none, logged.
- **Gate.** Every action parses and expands; every expansion solvable (L79) for all 8 bench bodies;
  two-hand actions: palm gap ≤ 5 mm and no interpenetration on every frame.
- **Status.** *Partial*: four hand-posed gestures in `body.py` (`gesture`); language *to build*.

#### L77 Gesture planner
- **Purpose.** Decide which gesture, with which hand, when — including gestures nobody writes in the
  script (beats, open palms) — and keep them inside the frame.
- **In → Out.** Sentence, word times, prosody, explicit action tags, the person's gesture rate, the camera
  frame → a gesture schedule `[act, start, apex, end, strength]`.
- **Method.** Explicit tags first (namaste, point at, count): Guru (L89) already writes `gesture` fields,
  and LLM gesture selection is published and works. Then rules add beats and metaphoric gestures (open
  palms, "this much", offer) on stressed words: word class, stress, position in phrase, cue words
  ("first/second" → count, "this/here/look" → point, "big/small" → size); constraints: one gesture per phrase
  on average, rest between gestures ≥ 300 ms, rate matched to the person's measured gesture rate (L16) and
  scaled by arousal (L72). **Framing**: the panel is waist-up and fixed, so hand targets carry the camera
  frustum minus a safe margin as a soft constraint, default gesture height is slightly above real life (as
  presenters do), and beats and counts are planned at chest height, never below the crop. No learned scorer
  until our own commercial-OK gesture data exists.
- **Research.** LLM gesture selection (2503.14408); semantic co-speech gestures (SemTalk 2412.16563;
  SemConFlow 2603.26553; SARGes 2503.20202); labelling sentences with deictic gestures (2407.02151);
  gesture space (McNeill 1992); review of data-driven gesture generation (2301.05339).
- **Ours.** The planner outputs goal programs, not motion, so any gesture it picks is physically solved.
- **Defaults.** Rules plus LLM tags.
- **Fails → fallback.** Beats on stressed words only.
- **Gate.** Appropriateness rating (GENEA-style, §8.4) ≥ the rule baseline; no two apexes < 300 ms apart;
  hands visible on ≥ 95% of stroke frames and never clipped by the frame edge mid-stroke.
- **Status.** *Partial*: word rules in `perform.py`; gesture slot in `slots.json`.

#### L78 Target resolution: lesson element to 3D point, for the observer
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
  element, a spoken label ("node 7"), or a step-highlight request to the lesson player.
- **Research.** Interpretation of pointing (Herbort and Kunde 2016, *JEP:HPP* 42; Herbort et al. on bent
  pointing); pointing in situated agents (2509.12507); avatar-led explanations judged on whether they point
  at the content (VisualTalk-Bench 2611.25444).
- **Ours.** Deixis bound to the live layout of our own lesson animations and solved for an observer, with
  the candidate set known exactly because the lesson publishes its elements (novelty **UNVERIFIED**).
- **Defaults.** Board plane 0.55 m in front of the chest; disambiguate when the margin < 20%.
- **Fails → fallback.** Gaze-only reference ("here") with an open-palm gesture towards the side.
- **Gate.** S8.
- **Status.** *To build* (step ids exist in the lesson engine).

#### L79 Arm solver: analytic IK with shoulder girdle and torso
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

#### L80 Hand shapes
- **Purpose.** Natural hands for every named shape and for the in-between.
- **In → Out.** Shape name or count → 20 finger joint angles per hand.
- **Method.** Named shapes as joint-angle sets (point, count 1–5 in the Indian styles — fingers raised, or
  the thumb touching the phalanges — and the Western style as a setting, open, flat, relaxed, fist, OK,
  thumbs up, pinch, steeple); in-between shapes interpolate with finger coupling (DIP ≈ ⅔ PIP) applied, in a
  synergy space (PCA of our consented hand captures) only if those captures are large enough; relaxed
  hands curl a little more on the ulnar side. At 720p a hand is about 60–90 px tall, so shapes are judged as
  rendered, painted silhouettes.
- **Research.** Hand synergies (Santello et al. 1998); hand motion completion with priors (2607.05938);
  biomechanical finger tracking (2605.09258).
- **Ours.** Counting style as a setting, learned from the person's own counting frames when captured
  (which styles to offer is to be checked with teachers: **UNVERIFIED**).
- **Defaults.** Relaxed shape between gestures.
- **Fails → fallback.** Relaxed hand.
- **Gate.** Every named shape within L30's limits; observers identify counts 1–5 from rendered, painted
  clips ≥ 95%.
- **Status.** *Partial*: point and count curls in `body.py`.

#### L81 Trajectories and gesture phases
- **Purpose.** Gestures that look human: preparation, stroke, hold, retraction, with the apex on the word,
  and hands that travel like hands.
- **In → Out.** Gesture schedule + goals → per-frame hand goals (task space) and finger shapes over time.
- **Method.** Human reaching is roughly straight in hand space with a bell-shaped speed profile, so the
  wrist/fingertip path is planned in **task space** (minimum jerk), with a via-point that keeps clearance
  from the torso capsules; L79 solves it every frame. Duration from distance and precision (Fitts-like:
  precise pointing gets a longer deceleration tail). The stroke **apex** (maximum extension, velocity
  minimum) is placed on the pitch-accented vowel (L64) within ±60 ms, and the stroke onset is solved
  backwards from the stroke duration; apexes are also aligned with energy peaks of our own audio, which is
  physically consistent with how gesture impulses shape speech. Fingers move in their shape space;
  consecutive gestures co-articulate (skip retraction when the next preparation starts within 400 ms) and
  gesture units return to a rest pose (L83) only at unit ends.
- **Research.** Gesture phases (McNeill 1992; Kita et al. 1998); minimum-jerk motion (Flash and Hogan 1985);
  apex–prosody alignment (Leonard and Cummins 2011; spread from Pouw and Dixon 2019 as summarised in citing
  work, exact numbers **UNVERIFIED**); gesture–speech physics (Pouw, Paxton, Harrison, Dixon 2020, *PNAS*
  117(21)); streaming gesture generation (GestureFAR 2609.21576; LiveGesture 2604.10927).
- **Ours.** —
- **Defaults.** Hold 150–400 ms.
- **Fails → fallback.** Joint-space blends with ease-in/out.
- **Gate.** |apex − accent| ≤ 100 ms in 95% of beats.
- **Status.** *Partial*: ease in/out in `perform.py`.

#### L82 Self-collision avoidance
- **Purpose.** Hands never pass through the body, the other hand or the face, on any frame.
- **In → Out.** Per-frame pose and its predecessor → corrected pose.
- **Method.** Capsules for torso, neck, head, upper arms, forearms, palms and finger segments (≈ 40);
  tested as **swept** capsules between consecutive frames (continuous collision); on contact the hand goal
  is pushed out along the separating normal and L79 re-solves; `touch` and `join` goals use a 5 mm contact
  offset.
- **Research.** Physics-based interaction priors (2609.06591) for ideas; capsule collision practice.
- **Ours.** —
- **Defaults.** 3 resolve iterations.
- **Fails → fallback.** Abort the gesture and return to the rest pose.
- **Gate.** S7: 0 penetrations deeper than 2 mm on every frame of the library × 8 bodies.
- **Status.** *To build*.

#### L83 Rest poses, idle life and breathing
- **Purpose.** Alive while listening or waiting; never frozen; never "floating".
- **In → Out.** Time, turn state, speech plan → rest pose, breathing, sway, discrete adjustments.
- **Method.** **Rest poses**: 3–4 home poses (hands loosely clasped at the waist, one hand on the other
  wrist, arms down and relaxed, a hand resting on the desk edge), chosen per person from L16; switched only
  at turn boundaries. **Breathing while speaking** follows the speech plan: a fast chest and shoulder rise
  (≈ 0.3–0.6 s) in the pause before each phrase, scaled by the next phrase's length, then a slow linear fall
  through the phrase; **quiet breathing** (≈ 4 s period, about 40/60 in/out) only while listening or idle;
  coordinated with any audible breaths the voice produces. **Sway**: a slow (≈ 0.1–0.3 Hz), small lateral
  shift visible as a shoulder-line tilt with a head counter-roll. Hands hold still apart from the spring
  layer (L84) and the breathing passed through the chest; occasional discrete self-adjustments (shoulder
  roll, re-clasp, solved with `join`) at turn boundaries. Noise remains only on the head (L74) and brows
  (L73).
- **Research.** Speech breathing (Winkworth et al., *JSHR* 1994/1995; the year varies across citations,
  **UNVERIFIED** which); gesture units (Kendon); listening behaviour (2409.20188, 2112.13548).
- **Ours.** Breaths placed by the speech plan; rest poses from the person's own video.
- **Defaults.** Breathing amplitude 4 mm at the sternum.
- **Fails → fallback.** Arms-down rest with quiet breathing.
- **Gate.** No interval > 2 s with all joint velocities below 0.2°/s; inhalation onsets in pauses ≥ 95%.
- **Status.** *To build*.

#### L84 Secondary dynamics
- **Purpose.** Real arms overshoot slightly, wrists and fingers lag the forearm on fast strokes, and the
  head settles after a nod; a purely kinematic figure looks robotic.
- **In → Out.** Mixed pose (L85) → filtered pose.
- **Method.** A per-joint second-order (spring–damper) filter on the mixed rotations: higher frequency and
  near-critical damping near the root, lower frequency and more damping at wrist and fingers; clamped to
  L30's limits *after* filtering. Microseconds per joint, in the worker.
- **Research.** Complementary dynamics for flesh (2303.11886, the published reference; a joint-level spring
  is enough for our budget).
- **Ours.** —
- **Defaults.** Shoulder 6 Hz / ζ 0.9; wrist 3 Hz / ζ 0.7; fingers 2.5 Hz / ζ 0.8.
- **Fails → fallback.** Off.
- **Gate.** No added limit violations; apex timing (L81) still within tolerance after filtering.
- **Status.** *To build*.

#### L85 Motion mixer and personal style
- **Purpose.** Combine all motion sources with clear priorities, in the person's own style, without pops.
- **In → Out.** Lip, emotion, blink, head, gaze, gesture, rest and idle streams → one pose per frame.
- **Method.** Per-joint masks with priorities per channel: mouth values (lips > emotion > idle), eyes (blink
  > gaze), arms (explicit action > planned gesture > rest/idle); changes of the winning source crossfade over
  150–250 ms with quaternion blending; additive layers (breathing, sway, micro-motion) on top; then L84's
  springs; then a **post-mix clamp** to L30's limits. Must-hit mouth events from L68 are re-asserted last.
  Personal style: amplitude and tempo of gestures, head and brows scaled by the person's profile (L16) and
  by emotion (L72); preferred hand from L11.
- **Research.** Motion layering practice; speaking-style capture (1905.03079); identity-aware motion
  (2604.25164).
- **Ours.** Style as measured scalars, not a style network.
- **Defaults.** Crossfade 200 ms.
- **Fails → fallback.** Unstyled defaults.
- **Gate.** Mouth closures (S3) never broken by other layers; angular acceleration per joint bounded (no
  single-frame spikes) across a 10-minute conversation; style scalars within ±2σ of the population.
- **Status.** *To build*.

---

### Stage J: Listening and conversation (L86–L91)

The site's speech chain today is batch: it posts a whole recording (`src/voice/stt.js`, up to 3 MB) to
cloud providers. A live teacher needs streaming. No commercially licensed two-channel Hindi conversation
corpus is known, and the original voice-activity-projection models are trained on Switchboard (an LDC
corpus; commercial terms **UNVERIFIED**, 2205.09812), so version 2 starts from hybrid rules and streaming
recognition, and adds learned turn models only on our own consented data.

#### L86 Listening: voice activity, streaming recognition and echo guard
- **Purpose.** Know when the student speaks and what they say, in English, Hindi or Hinglish, fast — and
  never mistake her own voice for the student's.
- **In → Out.** Student microphone (with echo cancellation) + the played reference signal → speech/no-speech
  per 30 ms, streaming partial transcripts with confidence and n-best, final transcript.
- **Method.** A small VAD (Silero-class, MIT) on device; a turn-aware streaming ASR on the server (a LoRA on
  Qwen3-ASR-0.6B as in 2609.04225, Apache-2.0 per its model tag — to confirm in L3), biased towards the
  lesson vocabulary (keyword boosting); the site's free cloud chain (Admin → Voice recognition) is kept for
  the final transcript where it is better. **Echo guard**: we know the exact playback signal, so a residual
  echo test (normalised cross-correlation between the mic and the played reference) and a speaker check (the
  voice is not the cloned teacher) must both say "student" before an onset counts. When the browser reports
  no echo cancellation and no headphones, push-to-talk is the default.
- **Research.** Whisper (2212.04356); turn-aware streaming ASR (2609.04225: 0.97 boundary recall at 0.39 s
  median); Indian-language ASR benchmarks (2604.19151, 2305.15386, 2609.24199); code-switched speech
  (2406.10993).
- **Ours.** Reuses the site's free speech chain for finals; echo guard from our own known playback.
- **Defaults.** End-of-speech silence 500 ms as a last resort (L87 usually decides earlier).
- **Fails → fallback.** The batch chain with silence endpointing; typed input.
- **Gate.** WER/CER on the Hinglish classroom set within 10% relative of the best single provider; S11's
  echo test (her own speech on laptop speakers never triggers barge-in).
- **Status.** *Partial*: batch chain in the site (`src/voice/stt.js`, `client/src/voice/`); streaming and
  echo guard *to build*.

#### L87 Turn-taking, with a teacher's wait time
- **Purpose.** Answer at the right moment; do not cut the student off; do not leave dead air — and after
  she asks a question, wait like a teacher.
- **In → Out.** VAD, partial transcript, tutoring state → each 50 ms: keep listening, prepare, answer,
  backchannel, stop (student interrupted), ignore (noise).
- **Method.** Hybrid endpointing: silence hysteresis plus the streaming ASR's turn boundary plus a semantic
  completeness score from the transcript (question complete? sentence complete? a numeric answer parsed by
  the grader?). **Wait time**: after she has asked the student a question, the end-of-turn threshold is a
  teaching policy, not a conversation one: she waits at least 3 s, showing visible "thinking with you"
  listening and no filler; "ruko / ek minute" holds the floor indefinitely; a parsed complete answer ends the
  wait early. A learned turn model (voice-activity projection) is trained later, only on our own consented
  two-channel tutoring recordings.
- **Research.** Wait time (Rowe 1986, *J. Teacher Education* 37(1)); voice activity projection
  (2403.06487, 2401.04868, 2503.06241); FastTurn (2604.01897); speculative and hybrid turn control
  (Voice-Light 2609.20995: a learned policy alone reached 12.5% recall at a safe cut-off rate); full-duplex
  dialogue (2410.00037, 2604.21406, 2509.22243); IndicFDB behaviours as a comparison benchmark (via
  2604.23295; licence **UNVERIFIED**, comparison only).
- **Ours.** Tutoring-state-aware wait time.
- **Defaults.** Answer when silence ≥ 350 ms and (ASR boundary or semantic end ≥ 0.6); after a question,
  wait ≥ 3 s.
- **Fails → fallback.** Silence threshold (L86).
- **Gate.** False cut-ins ≤ 5% of student turns; median gap after a true end ≤ 300 ms to first reaction;
  after questions, 0 cut-ins inside 3 s.
- **Status.** *To build*.

#### L88 Listening reactions, contingent on correctness
- **Purpose.** She shows she is listening, and never signals agreement with a wrong answer.
- **In → Out.** Turn state, the student's prosody, transcripts with confidence, **the grader's verdict** →
  backchannel events (nod type, short vocal token from the bank, facial reaction).
- **Method.** Timing and type by rules (pause-based opportunities, prosodic cues), with a learned
  predictor later on our own data. A gate filters them: **agreement** ("haan", an affirmative nod) only after
  a *final* transcript with ASR confidence above a threshold *and* a grader verdict "correct"; **concern or
  negative faces never fire on partial transcripts**; otherwise only neutral attention (steady gaze, slight
  forward lean, a brow lift). Because "hmm" and a lateral head tilt or wobble are commonly read as assent in
  Hindi conversation (**UNVERIFIED** as a measured effect), the neutral set is chosen by the perceptual test
  of S12, not assumed. While the student talks, backchannels are visual only (vocal tokens cause
  echo-cancellation double-talk and damage recognition); vocal tokens only in pauses ≥ 250 ms. When
  confusion cues appear (long pauses, "umm", rising pitch), she shows concern and the hint ladder may step.
- **Research.** Backchannel prediction (2410.15929, 2304.04472, 2607.22729); nodding types (2507.23298);
  listening heads (2112.13548, 2409.20188, GLARE 2609.40317); dyadic behaviour (2510.04637, 2506.22554);
  confusion detection (2206.02436); Hindi backchannel rates (IndicFDB numbers quoted in 2604.23295).
- **Ours.** Correctness-contingent backchannels on final transcripts. We found backchannel timing and type
  models, but none that conditions agreement on a correctness check.
- **Defaults.** ≈ 1 backchannel per 12 s (human Hindi listeners ≈ 0.079/s), calibrated on the bench.
- **Fails → fallback.** Neutral attention only.
- **Gate.** S12; backchannel timing rated natural ≥ 3.5/5.
- **Status.** *To build* (the grader and hint ladder exist in Guru: `src/voice/guru.js`).

#### L89 Brain and streamable performance script
- **Purpose.** What she says and how: words, emotion, gaze, gestures and targets, clause by clause, and
  nothing unsafe ever reaches the voice.
- **In → Out.** Student turn, lesson context, student memory → a stream of speakable text with inline tags,
  parsed into validated clauses.
- **Method.** Guru (`src/voice/guru.js`, `docs/voice/GURU_SPEC.md`): free providers with failover, the hint
  ladder, Leak Guard, no help in tests. It streams **plain speakable text with light inline tags**
  (`⟨g:point|el42⟩`, `⟨emo:curious⟩`, `⟨gaze:board⟩`), parsed as the text arrives (a JSON object per clause
  cannot be spoken until it closes). A validator checks every tag against the action list (L76) and the
  lesson's real element ids (L78); anything invalid is dropped or replaced by rules. **Leak Guard per
  clause, before synthesis**: speech cannot be unsaid, so each clause is checked before L63; a failing clause
  is replaced by a safe canned hint from the bank (L65) and the rest of that clause's tokens are dropped.
  "Honest face": when retrieval confidence is low, the clause gets `emo:thinking`, a hedge, and a pointer to
  the source.
- **Research.** LLM-driven pedagogical agents (2603.09536, 2604.12253); embodied LLM agents with nonverbal
  planning (2308.15214, 2603.03282); backend-agnostic embodiment layers (BASE 2611.30388).
- **Ours.** A streamed, validated script tied to real lesson element ids, with a clause-level Leak Guard.
- **Defaults.** First clause ≤ 12 words.
- **Fails → fallback.** Text answer with neutral gestures.
- **Gate.** 100% of executed tags valid; Leak Guard tests pass, including a new test of streaming order (no
  clause reaches the voice before its check).
- **Status.** *Partial*: Guru exists; streaming tags, validator and clause guard *to build*.

#### L90 Barge-in and repair
- **Purpose.** When the student interrupts, she stops quickly and politely, and knows what was heard.
- **In → Out.** Student onset during her speech (confirmed by L86's echo guard) → fade-out, state update,
  repair line.
- **Method.** If student speech lasts > 300 ms and is not a backchannel (L87 decides), fade her audio over
  80 ms, freeze the gesture into a hold, turn gaze to the student, and cut Guru's context to the words
  actually played (the audio clock knows them; rendered audio is the durable history, as in Voice-Light).
  Repair: "haan, bolo" from the bank and, after the student, an offer to finish the point.
- **Research.** Overlap handling benchmarks (2507.23159); full-duplex systems (2509.06502); Voice-Light
  (2609.20995) for "rendered audio is authoritative".
- **Ours.** — (the context cut follows Voice-Light).
- **Defaults.** As above.
- **Fails → fallback.** Finish the clause, then stop.
- **Gate.** S11.
- **Status.** *To build*.

#### L91 Latency hiding: speculation and the bank
- **Purpose.** No dead pauses even when recognition and the brain take a second or more.
- **In → Out.** Partial transcripts, predicted end of turn → a private draft, visible pre-reaction, a bank
  phrase, early speech.
- **Method.** Generate privately from the partial transcript (speculative drafting); start synthesis only
  once the end of turn is confirmed; throw the draft away if the transcript changes. At 250 ms after the end,
  an intake breath and a brow lift; at confirmation, a bank phrase in her own voice ("achha", "dekho…")
  covers the first clause's synthesis; lesson answers known in advance come from the lesson cache
  (pre-rendered, §7.4).
- **Research.** Voice-Light speculative generation (2609.20995); response-time studies in full-duplex
  dialogue (2604.21406); streaming agents for digital humans (2608.24909); human Hindi response gaps ≈ 0.26 s
  and the best Hindi duplex model ≈ 2.0 s (2604.23295).
- **Ours.** Pre-speech body cues and a personal phrase bank as part of the latency budget.
- **Defaults.** Pre-reaction at 250 ms; bank phrase only when the first clause will be later than 700 ms.
- **Fails → fallback.** Thinking cue (L72) until audio starts.
- **Gate.** S10.
- **Status.** *To build*.

---

### Stage K: Clock, delivery and gates (L92–L94)

#### L92 Clock, scheduler and adaptive quality
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
  server); the worker runs the face and body layers 160 ms ahead. Tiers by measured GPU time over the last
  60 frames: *full* → *light* (no cast shadow, MSAA 2×, LOD1) → *basic* (occlusion only, morphological AA,
  LOD2, no garment springs).
- **Research.** Lip-sync detectability asymmetry (ITU-R BT.1359; figures from memory, **UNVERIFIED**);
  streaming embodiment on one timeline (BASE 2611.30388); real-time portrait animation (Teller 2503.18429).
- **Ours.** Audio-master evaluation of explicit controls with closure hold and output-latency calibration.
- **Defaults.** Tier change hysteresis 2 s.
- **Fails → fallback.** Basic tier.
- **Gate.** S5 and S14 on the reference laptops; S3 with 10% injected frame drops.
- **Status.** *Partial*: frame-exact `renderAt(t)` in the lab player; worker scheduling, closure hold and
  latency calibration *to build*.

#### L93 Model packaging and signing
- **Purpose.** One file that carries the person model, its consent and its report.
- **In → Out.** All build outputs → `.pbmodel` (zip: manifest with SHA-256 of every file, signature,
  consent record, provenance ledger, information-budget certificate, build report, template version, fitted
  positions, morphs, palette, band textures, curves, hair fit, wardrobe fit, motion profile, coarticulation
  parameters, voice reference); the phrase bank as a companion file.
- **Method.** As the identity pack (`PACK_FORMAT.md`), signed with the server key; encrypted at rest with
  the person's key (L3); the player verifies the signature, the template hash and the lock before loading.
- **Research.** —
- **Ours.** The model refuses to load without its consent record and label component.
- **Defaults.** ≤ 8 MB (bank ≤ 2 MB extra).
- **Fails → fallback.** —
- **Gate.** Tampered files rejected 100%; size within budget.
- **Status.** *Partial*: signed identity pack exists (`pack.py`); model format *to build*.

#### L94 Self-grading build, bench and release gates
- **Purpose.** Every build checks itself; every change to any layer is checked on the bench.
- **In → Out.** The built model + held-out frames → report with every gate's number and pass/fail; retries;
  release decision.
- **Method.** After the build, render held-out views (the end of the capture, or another day's photos) with
  the frames' own head pose and expression values, and run: likeness (S1, with the gallery of L0), shape
  error, lip checks on rendered pixels (S3–S6 with the person's own audio and the replay gate), limits and
  collisions on every frame of the action library (S7), pointing (S8, geometric part), no-copy (S15), size
  and a browser-speed proxy. If a gate fails and time remains, re-run only the layers upstream of that gate
  with the next fallback setting (e.g., lower style $s$ or $\gamma$, another hair style); else ship the
  report with the failure named and the missing input asked for ("one more photo of your left side"). A
  2-person smoke bench runs on every pull request touching the engine; the full 8-person bench nightly and
  before a release (8 builds × 4 GPU-minutes per pull request would be paid compute).
- **Research.** Design-science evaluation (1904.12742).
- **Ours.** Time-budgeted retry targeted at the failing gate.
- **Defaults.** Retry budget = 240 s − elapsed.
- **Fails → fallback.** Model marked "not ready"; never shown to students below the S1 threshold.
- **Gate.** All system gates of §2.5 green before release; the owner approves a video with sound.
- **Status.** *Partial*: held-out time split and gates in `build.py`; `bench.py`, `likeness.py`;
  `test_engine.py`.


### 5.12 Layer index (build checklist)

| # | Layer | Status | Gate (short) |
|---|---|---|---|
| L0 | The bench (first deliverable) | to build | All 8 people's material complete and consented (owner decision D10). |
| L1 | Consent capture and verification | partial | 100% of builds have a valid record; bench replay attacks (photo, screen replay of someone else) and voice … |
| L2 | Identity lock | exists | Bench: all 8 genuine pairs pass; all 56 cross pairs fail. |
| L3 | Provenance ledger, labelling and revocation | partial | S17: 100% traced; no check-only model on a parameter-choosing path (static check of the build graph); a … |
| L4 | Capture coach and coverage planner | partial | On the bench, coached captures reach "Good" coverage in ≤ 3 min for 8/8 people. |
| L5 | Frame quality, liveness and shot cuts | exists | ≥ 40 usable frames, or the build stops with a named reason. |
| L6 | Main-person tracking | exists | Other people never used (manual audit of bench clips with bystanders: 0 frames). |
| L7 | Dense face points | exists | Detection on ≥ 95% of usable frames; mean landmark jitter on static frames < 0.5% of eye distance. |
| L8 | Expression reading and per-person calibration | partial | Neutral frames read ≤ 0.1 on every value after calibration. |
| L9 | Head pose | exists | Pose jitter on still frames < 1°. |
| L10 | Body points and metric lift | exists | Bone-length coefficient of variation < 5% across frames. |
| L11 | Hand points | exists | ≥ 10 hand frames, or the report says the hands are estimated. |
| L12 | Part segmentation | exists | Mask IoU between consecutive calm frames ≥ 0.9. |
| L13 | Colour calibration | exists | Sclera chroma after correction ≤ 4 (CIELAB a,b) on bench frames. |
| L14 | Accessories and facial hair | to build | Bench: glasses and facial-hair presence correct 8/8. |
| L15 | Voice extraction and quality | partial | One reference ≥ 10 s at SNR ≥ 20 dB per language used, matching the consent voice. |
| L16 | Motion-habit profile | exists | Blink rate on two halves of the capture agree within ±20%. |
| L17 | Canonical face | exists | Held-out face error < 2% of eye distance (measured 1.05%, same-session; second-day to be measured). |
| L18 | Metric scale | exists | Uncertainty < 8%. |
| L19 | Multi-view depth refinement | partial | Profile-view reprojection error drops ≥ 20% vs. single-view depth; held-out view error < 2%. |
| L20 | Personal expression basis (with optional pair correctives) | exists | Held-out shape error < 2%; mouth opening follows the real mouth r ≥ 0.9 (measured 0.97); a kept corrective … |
| L21 | Symmetry and asymmetry | to build | Asymmetry measured on two halves of the capture agrees (correlation ≥ 0.8). |
| L22 | Face detail curves | to build | Curves stable across views (mean positional disagreement < 3% of eye distance) and the owner's … |
| L23 | Full head completion | partial | Side-silhouette IoU ≥ 0.9. |
| L24 | Likeness-gated stylisation and caricature | partial | S1 and S2 hold at the chosen $(s, \gamma)$; ablation $\gamma = 0$ vs. chosen (§8.5). |
| L25 | Ears | to build | Ear in the profile view within 3 px at 512 px. |
| L26 | Neck and throat | partial | Front silhouette IoU ≥ 0.9 in the neck band. |
| L27 | Skeleton and bone lengths | partial | Skeleton reprojection onto frames < 4% of shoulder width. |
| L28 | Posture and spine | to build | Posture reprojection error < 4% of shoulder width. |
| L29 | Hand skeleton and finger lengths | partial | Hand length within ±5% of the bench ruler measurement (L0); fingertip reprojection reported. |
| L30 | Joint limits | to build | S7 (limits after every layer, including the spring layer L84). |
| L31 | Torso and arm volume | partial | Front silhouette IoU ≥ 0.9. |
| L32 | Glasses and facial-hair geometry | to build | Owner's side-by-side check: accessories judged "right" for 8/8 bench people. |
| L33 | The template mesh (authored once) | to build | Manifold, no self-intersection; library poses (S7) deform without flipped triangles on 8 bench bodies; … |
| L34 | Template fit | to build | Face points within 0.5% of eye distance of L17–L24's face; head, neck and body silhouette IoU ≥ 0.9; no … |
| L35 | Face binding and expression morphs | partial | Max vertex error vs. direct evaluation < 0.1 mm; no shading discontinuity across the old oval line … |
| L36 | Skin weights | partial | No tearing or folding (flipped triangles = 0) on every frame of every library action. |
| L37 | Runtime deformer: correctives and skinning | to build | Volume change at elbows and wrists < 10% and silhouette error at a 90° elbow bend ≥ 20% lower than without … |
| L38 | Levels of detail | to build | LOD2 silhouette IoU ≥ 0.97 vs. LOD0 at panel size. |
| L39 | Per-frame light estimation | partial | Recovered skin albedo agrees across frames: ΔE₀₀ < 3 between the 25th and 75th percentile frames. |
| L40 | Colour model (parametric by default) | partial | Mean ΔE₀₀ to measured skin colour (L13) < 3; no region darker than 3σ of its own frames (no baked shadows). |
| L41 | Region palette, skin tone and shine | partial | Region colours stable between two halves of the capture (ΔE₀₀ < 3); owner's form-readability check per … |
| L42 | No-copy guard: information-budget certificate | to build | S15 on every build. |
| L43 | Feature curves: brows, lids, lip line, lashes | partial | Brow-shape IoU ≥ 0.8 vs. the masks in the front view. |
| L44 | Eyes | partial | No head-interior pixels visible at ±30° gaze; iris colour ΔE₀₀ < 5 vs. L13; owner judges the three-quarter … |
| L45 | Eyelids and lashes | partial | No lid–eyeball gap at any gaze in ±30°; full closure at eyeBlink = 1. |
| L46 | Teeth, gums, mouth cavity and tongue | partial | No see-through mouth at any expression; teeth visible iff inner lips separate > 1 mm; tongue visible on … |
| L47 | Hair shape (library first) | partial | Hair silhouette IoU ≥ 0.8 in front and three-quarter views; owner judges the style "theirs" on ≥ 7/8. |
| L48 | Hair motion | to build | No spine point inside a head capsule; stable at 30 fps for 10 min. |
| L49 | Wardrobe and garment fit | partial | No body vertex outside the garment on any frame of the library, including arms above 90°. |
| L50 | Garment motion | to build | Stable at 30 fps; 0 cloth–body penetrations > 2 mm on every frame of the library. |
| L51 | Lighting rig | exists | Face mean luminance in [0.45, 0.75] for every bench person and theme. |
| L52 | Shading-normal field | to build | In a slow head turn and a speech clip, band islands smaller than 1% of the face area: 0. |
| L53 | Build-time painter: painted band textures | partial | S18; flicker (L58) ≤ the plain shaded render; L42 painter audit passes. |
| L54 | Painted shading model (run time) | partial | S18; form readable per Monk group (owner's check on the bench). |
| L55 | Key-light cast shadow and baked occlusion | to build | GPU time ≤ 1.2 ms on the reference laptop (estimate 0.8–1.2 ms, **UNVERIFIED** until the spike, §8.6); no … |
| L56 | Lines | partial | No line flicker (L58) and lines present on all 8 features in every bench render. |
| L57 | Painted eyes and hair highlights | partial | Catch-light visible in both eyes in 100% of frames with gaze within ±20°. |
| L58 | Anti-aliasing and temporal stability | to build | Edge-crawl and flicker metrics (mean absolute frame difference after motion compensation) on a slow … |
| L59 | Render graph | partial | S14. |
| L60 | Compositing, transparency and the AI label | to build | 100% of rendered frames and exported clips carry the label; watermark detected after re-encoding at 1 … |
| L61 | Text normalisation and language routing | to build | Round trip: ASR of the synthesised Hinglish set has character error rate ≤ 15%. |
| L62 | Grapheme to phoneme: a pronunciation lattice | partial | Phone error rate of the best lattice path ≤ 5% on a 500-word Hindi and a 500-word English list. |
| L63 | Cloned voice synthesis | partial | Speaker similarity (ECAPA-TDNN cosine, check-only, 2005.07143) between synthesis and held-out real speech … |
| L64 | Spoken-phone alignment and prosody | partial | Median boundary error ≤ 20 ms on a hand-labelled 200-phone set per language; logged rate of must-hit … |
| L65 | Personal phrase bank | to build | Every item passes L63's speaker and intelligibility gates and S3–S4. |
| L66 | Audio watermark and provenance | to build | Detection ≥ 99% after MP3/Opus re-encoding at 32 kbps; no audible artefacts (ABX at chance). |
| L67 | Phones to visemes | exists | All IPA phones in the test set map to a class (exists: `test_every_language_sound_has_a_mouth`). |
| L68 | Coarticulation as a constrained trajectory | partial | S3 and S4 by construction on controls and on rendered pixels; coarticulation path ratio (2610.03436) … |
| L69 | Jaw–lip split and personal mouth range | to build | S6; SLCC on held-out speech ≥ the value of the person's own video (2503.20308 metric). |
| L70 | Tongue and teeth visibility control | to build | Tongue visible on 100% of θ/ð and ≥ 80% of l in close-up; teeth never visible with closed lips. |
| L71 | Learned lip refiner and the replay gate | partial | S3–S6 still hold after fusion; PLRS (2503.20308) ≥ rules-only; replay correlation on the mouth values ≥ … |
| L72 | Emotion layer (face and body) | to build | Observers recognise the 5 cues from silent clips ≥ 70% (chance 20%), with the face and with the face … |
| L73 | Blinks, brows and micro-motion | exists | Blinks per minute within ±20% of the person's own (from L16). |
| L74 | Head motion | partial | Head speed distribution matches the person's own: median and 90th percentile within ±20% on 6/8 bench people. |
| L75 | Gaze | to build | Gaze lands within 2° of the target element's centre within 250 ms of the cue; during fixation the gaze … |
| L76 | Action language | partial | Every action parses and expands; every expansion solvable (L79) for all 8 bench bodies; two-hand actions: … |
| L77 | Gesture planner | partial | Appropriateness rating (GENEA-style, §8.4) ≥ the rule baseline; no two apexes < 300 ms apart; hands … |
| L78 | Target resolution: lesson element to 3D point, for the observer | to build | S8. |
| L79 | Arm solver: analytic IK with shoulder girdle and torso | to build | Target error < 2% of arm length; 0 limit violations; no single-frame swivel change > 5° while the target … |
| L80 | Hand shapes | partial | Every named shape within L30's limits; observers identify counts 1–5 from rendered, painted clips ≥ 95%. |
| L81 | Trajectories and gesture phases | partial | |apex − accent| ≤ 100 ms in 95% of beats. |
| L82 | Self-collision avoidance | to build | S7: 0 penetrations deeper than 2 mm on every frame of the library × 8 bodies. |
| L83 | Rest poses, idle life and breathing | to build | No interval > 2 s with all joint velocities below 0.2°/s; inhalation onsets in pauses ≥ 95%. |
| L84 | Secondary dynamics | to build | No added limit violations; apex timing (L81) still within tolerance after filtering. |
| L85 | Motion mixer and personal style | to build | Mouth closures (S3) never broken by other layers; angular acceleration per joint bounded (no single-frame … |
| L86 | Listening: voice activity, streaming recognition and echo guard | partial | WER/CER on the Hinglish classroom set within 10% relative of the best single provider; S11's echo test … |
| L87 | Turn-taking, with a teacher's wait time | to build | False cut-ins ≤ 5% of student turns; median gap after a true end ≤ 300 ms to first reaction; after … |
| L88 | Listening reactions, contingent on correctness | to build | S12; backchannel timing rated natural ≥ 3.5/5. |
| L89 | Brain and streamable performance script | partial | 100% of executed tags valid; Leak Guard tests pass, including a new test of streaming order (no clause … |
| L90 | Barge-in and repair | to build | S11. |
| L91 | Latency hiding: speculation and the bank | to build | S10. |
| L92 | Clock, scheduler and adaptive quality | partial | S5 and S14 on the reference laptops; S3 with 10% injected frame drops. |
| L93 | Model packaging and signing | partial | Tampered files rejected 100%; size within budget. |
| L94 | Self-grading build, bench and release gates | partial | All system gates of §2.5 green before release; the owner approves a video with sound. |

Totals: 95 layers (L0–L94); 16 exist, 43 partial, 36 to build.


---

## 6. Training and data

### 6.1 What is learned or authored once (shared) and what per person

| Learned or authored once (shared, rebuilt when improved) | Layer | Data | Size / cost (estimate) |
|---|---|---|---|
| The template: topology, UVs, loops, skeleton with twist/helper joints, weights, correctives, LODs, authored painting attributes, garment cages, scalp | L33 | MakeHuman CC0 core base mesh (pinned) or our own model; our artists (D3) | authoring weeks, once |
| Face-controls / face-shape regressor (points → shape) | L19, L20 fallback | Synthetic CC0 MakeHuman people rendered in Blender (`training/face_controls`) | 20–50k people; CPU or ≈ 10 GPU-h render |
| Population expression deltas and pair correctives | L20 | Same synthetic set + consented bench | — |
| Head prior (30 PCA components, template topology) | L23, L24, L0 | CC0 heads + consented bench | minutes on CPU |
| Accessory and facial-hair detectors | L14 | Synthetic renders with CC0 glasses/beards we model | ≈ 5 GPU-h |
| Monk-class painterly palette table | L41 | Authored by our artists over reference swatches | — |
| Hair clump library | L47 | Modelled by us (owned) | authoring, once |
| Stroke atlas and stroke layout | L53 | Painted by our own artists (owned) | — |
| Owned style kit (optional) | L53, S18 | 30–60 portraits painted by our artists over our own plain renders of fictional heads or self-portraits (D3, D4) | — |
| Hand synergy space (optional) | L80 | Consented hand captures (counting, pointing, palms) | small |
| Lip refiner (audio → 52 values) | L71 | Consented Hindi/Hinglish/English face video (1–3 h start), `training/lipsync` | ≈ 20 GPU-h fine-tune |
| Indic voice adapter | L63 | Consented readings, 30–60 min per voice; CC0 Common Voice Hindi for robustness | ≈ 10 GPU-h |
| Phone recogniser for the lattice aligner (IPA CTC) | L64 | CC0 / CC-BY speech (Common Voice, LibriTTS-R) | ≈ 20 GPU-h |
| Language-ID for Hinglish | L61 | Our own lesson text + consented transcripts | CPU |
| Turn-aware streaming ASR adapter | L86 | Consented Hinglish classroom speech | ≈ 5 GPU-h |
| Turn-taking / backchannel models (later) | L87, L88 | Consented two-channel tutoring conversations (10–20 h) | ≈ 10 GPU-h |

| Per person (in the 3–4 minute build) | Layers |
|---|---|
| Neutral 3D face, metric scale, multi-view refinement | L17–L19 |
| Personal expression deltas (and kept correctives), asymmetry, crease curves | L20–L22 |
| Head completion, stylisation and caricature strength, ears, neck | L23–L26 |
| Skeleton, posture, hands, limits, body volume, accessories | L27–L32 |
| Template fit, face binding, weights, LODs | L34–L38 |
| Light, colour model, palette, certificate, features, eyes, teeth, hair style fit | L39–L47 |
| Garment fit | L49 |
| Shading normals, occlusion, painted band textures | L52, L53, L55 |
| Motion-habit profile, mouth ranges, coarticulation parameters, rest poses | L16, L68, L69, L83 |
| Voice references per language, phrase bank; optional adapter later, outside the budget | L15, L63, L65 |

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

### 6.3 Datasets and models with licences

| Item | Use | Licence | Ship-OK? |
|---|---|---|---|
| MakeHuman core base mesh and assets | Template (L33), synthetic training people and heads | Core assets CC0 per the MakeHuman licence page (checked 2026-11-26); code AGPL/GPL (not used); an older readme says otherwise (D2) | yes, after D2; version pinned |
| Blender | Rendering synthetic data | GPL (tool only; outputs are ours) | yes (outputs) |
| Mozilla Common Voice | Aligner, voice robustness | CC0 | yes |
| LibriTTS-R | Aligner | CC BY 4.0 | yes (attribute) |
| AI4Bharat IndicVoices / Kathbath | Hindi ASR/aligner | CC BY 4.0 — **UNVERIFIED** | only after checking |
| IIT-Madras IndicTTS | Voice | custom licence — **UNVERIFIED**, treat as no | no |
| RASMALAI (2505.18609) | Indic TTS | **UNVERIFIED** | only after checking |
| IndicFDB | Conversation benchmark | **UNVERIFIED** | comparison only |
| BEAT2, AMASS, MEAD, HDTF, VOCASET, Seamless Interaction, VoxCeleb, FFHQ, Switchboard | Comparison only | non-commercial, research or LDC terms | no |
| MediaPipe face/pose/hands/segmentation | Stage B, geometric likeness score, rendered-pixel lip gates | Apache-2.0 | yes |
| YuNet / SFace (OpenCV zoo) | L2, L6, S1 check | MIT / Apache-2.0 weights; trained partly on MS-Celeb-1M (withdrawn) | check-only (D6); not shipped |
| Chatterbox Multilingual + `Chatterbox-Multilingual-hi` | L63 | MIT; archived and unmaintained since August 2026 (vendored, pinned) | yes |
| Chatterbox-Nano (English, CPU) | §7.4 option for English live replies on CPU | licence and cloning quality **UNVERIFIED** | check |
| Kokoro via HeadTTS | L63 fallback | Apache-2.0 (Kokoro); HeadTTS licence **UNVERIFIED** | yes after check |
| CosyVoice (2407.05407) | L63 second engine | Apache-2.0 (per authors) — **UNVERIFIED** for every checkpoint | check |
| wav2arkit_cpu; LAM Audio2Expression | L71 | Apache-2.0 (per `slots.json`, `TRAINING.md`) | yes |
| Whisper; IndicConformer | L86 | MIT | yes |
| Qwen3-ASR-0.6B | L86 streaming ASR | Apache-2.0 per its model tag — **UNVERIFIED** in L3 | check |
| Silero VAD | L86 | MIT | yes |
| XLSR-53 phone recogniser (2109.11680); Allophant (2306.04306) | L64 prototypes | weights **UNVERIFIED**; BABEL (LDC) in pre-training | check-only until confirmed |
| AudioSeal (2401.17264) | L66 | MIT, code and weights (README, April 2024) | yes |
| Perth watermark (in Chatterbox) | L66 (optional) | **UNVERIFIED** | only after checking |
| ECAPA-TDNN (SpeechBrain) | L1 voice match, L63 gate | Apache-2.0 code; weights trained on VoxCeleb | check-only (D6) |
| Diffusion base model for the optional painter (e.g. FLUX.1-schnell) | L53 variant | **UNVERIFIED** | only after checking (D9) |
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

| Step | Layers | Device | Target (s) |
|---|---|---|---|
| Unpack, verify signature, consent, face lock, voice match | L1–L3 | CPU | 6 |
| Re-read any uploads not processed on device | L5–L16 | CPU (parallel) | 0–40, overlapped |
| Canonical face, scale, multi-view BA, expression basis, asymmetry | L17–L21 | CPU/GPU | 10 |
| Crease curves, head prior fit | L22–L23 | GPU | 8 |
| Stylisation and caricature search (renders + landmarks) | L24 | GPU | 8 |
| Ears, neck, skeleton, posture, hands, limits, volume, accessories | L25–L32 | CPU | 8 |
| Template fit (sparse solves), face binding, weights, LODs | L34–L38 | GPU + CPU | 6 |
| Light + parametric colour model + palette | L39–L41 | GPU | 15 |
| Information-budget certificate, patch check | L42 | CPU | 3 |
| Features, eyes, lids, mouth | L43–L46 | CPU | 3 |
| Hair style fit | L47 | GPU | 6 |
| Garment fit | L49 | CPU | 2 |
| Shading normals and occlusion bake (rest + 52 targets) | L52, L55 | GPU | 6 |
| Painted band textures (procedural painter) | L53 | GPU | 10 |
| Voice references, mouth ranges, coarticulation fit | L15, L63, L68, L69 | GPU | 12 |
| Phrase bank synthesis (batched; mostly overlapped with CPU stages) | L65 | GPU | 10 on the critical path (≈ 20 in all) |
| Gates: held-out renders, likeness gallery, rendered-pixel lip checks, replay, action library × limits/collisions per frame, certificate, perf proxy | L94 | GPU + CPU | 35 |
| Package, sign, upload | L93 | CPU | 5 |
| **Total (sequential critical path)** | | | **≈ 153** |
| Retry budget for failing gates | L94 | | up to 87 |

The template removes about 30 s of v1's critical path (implicit surface, remesh, UVs, heat diffusion); the
painter and the phrase bank spend part of it. The optional diffusion painter (D9) would add an estimated
20–40 s (**UNVERIFIED**) and is not in this budget.

### 7.2 Playback: 30 fps at 720p on an ordinary laptop

Reference devices: an Intel Iris Xe-class integrated GPU laptop and a 2020 MacBook Air (M1), Chrome and
Safari. Frame budget 33.3 ms; target GPU ≤ 15 ms and main thread ≤ 6 ms so the lesson page stays smooth.
Estimates, to be measured (**UNVERIFIED**) by the spike frame of §8.6 before any Stage F code is written:

| Work | Where | Target |
|---|---|---|
| Face and body layers (blinks, head, gaze, emotion), arm solver, hands, swept collisions, springs, mixer (mouth values arrive from the server) | Worker | 2.0 ms |
| Hair and garment spring chains (≈ 60 spines) | Worker | 0.5 ms |
| Upload pose (≈ 70 bones + 52 values + correctives) | Main | 0.3 ms |
| Skinning + active morphs (≤ 15 of 52 per frame, float texture; body 25k vertices) | GPU VS | 1.5 ms |
| Key-light shadow map 1024² | GPU | 1.0 ms |
| Forward 4× MSAA pass: band textures, shading, rim, highlights, eyes | GPU | 4.0 ms |
| Lines (inverted hull + edges) | GPU | 1.0 ms |
| Resolve + composite | GPU | 0.7 ms |
| **GPU total** | | **≈ 8.2 ms** |

Download ≤ 8 MB per teacher (fitted positions and LODs ≈ 1.5 MB compressed, morph targets ≈ 2 MB at fp16,
band textures ≈ 2 MB, hair and garments ≈ 0.5 MB; the template itself is cached once for all teachers), plus
the phrase bank ≤ 2 MB. As a sanity bound, skinned Gaussian avatars reach 40–50 fps on a phone and 240 fps
on a laptop GPU in a web/mobile system (2510.13978).

### 7.3 Conversation latency (student stops → teacher)

Version 1 left out recognition time. With it:

| Step | Target |
|---|---|
| End-of-turn decision (streaming ASR boundary + silence + semantics, L86–L87) | 350–500 ms after the last word (2609.04225 reports a 0.39 s median) |
| Visible pre-reaction (L91) | 250 ms after the last word, in parallel |
| Bank phrase audio (local, L65) | ≈ 100 ms after the decision → first audio ≈ 0.5–0.7 s |
| Brain first clause (streamed; the speculative draft may already exist) | 0.3–0.6 s |
| Clause Leak Guard (L89) | < 50 ms |
| Voice first chunk, multilingual model (L63) | 0.3–0.6 s (**UNVERIFIED**; Hindi slower than English) |
| Alignment and mouth path for the chunk (L64–L71, server) | < 50 ms |
| Network both ways | 50–100 ms |
| **First content clause** | **≈ 1.2–1.8 s** (S10 median ≤ 1.8 s); lower when speculation was right |

For comparison: human Hindi listeners respond in about 0.26 s, and the best published Hindi duplex model
takes about 2.0 s (2604.23295).

### 7.4 Server cost and concurrency (the "free where possible" budget)

| Load | When | Cost |
|---|---|---|
| Lesson narration (audio, phone times, 52 values, gestures) | Once per lesson × teacher model, at publish time, on the build GPU | One-off GPU time; play time is static files (free) |
| Phrase bank | In the build (§7.1) | Inside the build budget |
| Live replies in the cloned voice | Per clause while a student talks | **Not free**: needs a GPU worker up during sessions. Concurrent streams per GPU and cost per student-hour (GPU-hour price ÷ concurrent streams × share of time she speaks) are measured on the bench before launch; no number is assumed here |
| Streaming ASR | Per student turn | Small model on GPU or CPU — **UNVERIFIED**; the free cloud chain for finals |
| Brain | Per turn | Guru's free providers with failover (existing) |
| CPU fallbacks | When no GPU is up | Labelled default voice (Kokoro); for English, Chatterbox-Nano on CPU is worth measuring (its README reports 3× real time on 8 CPU cores; ARM speed, cloning quality and licence **UNVERIFIED**); otherwise text plus the phrase bank |

The owner chooses whether live cloned replies are offered at all (D5).

---

## 8. Evaluation protocol

### 8.1 Metrics

| Family | Metric | Used in |
|---|---|---|
| Likeness (machine) | Rank-1 identification against the L0 gallery under the geometric likeness score (L24) and SFace (check-only); margin to the best impostor | S1, L24, L94 |
| Likeness (human) | 4-alternative lineup with matched foils, ≥ 15 raters per person, CIs; owner's side-by-side sheet | S2 |
| Shape | Face point error (% of eye distance) on held-out frames; silhouette IoU for head, hair, body | L17–L34 |
| Lip sync | On rendered pixels: per-class closure and contact rates (S3, S4) on realised phones, with injected frame drops; mouth range and the replay gate (S6, L71); browser A/V offset (S5); secondary: MTM, PLRS, SLCC (2503.20308) and the coarticulation path measure (2610.03436). SyncNet-style scores (2008.10010) are reported only for comparison, because they reward timing even when shapes are wrong (`ENGINE.md` §4) | L67–L71 |
| Voice | ECAPA speaker similarity vs. real-vs-real ceiling (check-only); ASR round-trip WER/CER; F0 continuity at joins; MOS; watermark detection | L63, L66 |
| Physical | Per-frame joint-limit violations and penetrations, pointing perception and line error, apex–accent offset, angular-acceleration spikes, hands-in-frame share | L76–L85 |
| Conversation | First-reaction, first-audio and first-clause latency including recognition, barge-in stop time, self-interruptions, false cut-ins, wait-time cut-ins, backchannel timing, S12 | L86–L91 |
| Rendering | fps and p99 frame time on reference laptops; band-island count (L52); flicker and edge crawl (L58); style rating and style distance (S18) | L51–L60, L92 |
| Fairness | All of the above by Monk Skin Tone group, sex, age band, glasses, facial hair (monitored on the bench; gated on the extended set) | S16 |
| Integrity | Information-budget certificate, painter audit, provenance completeness, check-only rule, label presence, deletion test | L3, L42, L60 |

### 8.2 The bench: 8 people (L0)

Eight adults who consented in writing to being on the bench (or whose material has a licence allowing this
use), chosen to cover: both sexes; Monk Skin Tone groups from light to deep (at least 3 people in groups 6–10);
ages 20–60; glasses (2); beard or moustache (2); long hair (2), short hair (2), a head covering if a
volunteer agrees; one capture on a cheap 480p webcam and one on a good phone. Each person gives: the standard
guided capture; a **second-day** capture for held-out tests (harder than the same-session split used so far);
5 minutes of reading in English and Hindi/Hinglish with the face visible (for lip, replay and voice gates);
2 minutes of free explanation with hands visible (for gesture style and rest poses); a ruler measurement of
hand length and palm width. Controls: every person's model is scored against the other seven and against
≥ 50 synthetic hard negatives near them (impostors). Eight people cannot support per-group fairness gates
(S16): they are reported, and gated only on an extended set of ≥ 30 people or synthetic heads for the
colour layers.

### 8.3 Owner review

Side-by-side sheet per person: real photo, neutral render, three-quarter render, smile render, and a 20 s clip
with sound. The owner rates likeness ("clearly them" / "looks like a relative" / "not them") and style match
against references 1–8 (1–5). Nothing ships without the owner approving a video with sound (`SPEC.md`).

### 8.4 User study

- **Participants.** ≥ 30 students (target 48 for a 3-condition within-subject design with counterbalancing),
  recruited from NexoraGuru users who opt in; consent and the right to withdraw; no minors without guardian
  consent (prefer 18+).
- **Conditions.** (A) Pratibimb full; (B) Pratibimb without listening reactions and without deictic pointing
  (ablation); (C) a real teacher on recorded video doing the same lesson segment and answering the same
  scripted questions (Wizard-of-Oz for live answers).
- **Task.** A 6-minute lesson segment (e.g., binary search) with 3 student questions, in English or Hinglish
  by the student's choice.
- **Measures.** 7-point ratings: naturalness, lip sync, "felt listened to", trust, clarity; GENEA-style
  human-likeness and appropriateness of gestures (2208.10441, 2308.12646, 2608.10839; evaluation practice
  review 2101.03769); a 5-question quiz on the content (learning outcome); "was this a real person?" (to check
  that the AI label is understood, not to deceive); "did she agree with the answer?" on scripted wrong
  answers (S12); open comments.
- **Analysis.** Linear mixed-effects models with participant and lesson as random effects; pre-registered
  hypotheses: H1 A ≥ B on "felt listened to" and appropriateness; H2 A within 1 point of C on clarity; H3 quiz
  scores of A not worse than C (equivalence margin 10%). Report effect sizes with confidence intervals.
- **Ethics.** Every condition shows the AI-generated label; no deception about the nature of A and B; data
  stored without names.

### 8.5 Ablations (to show each new idea earns its place)

Parametric colour vs. a band-limited colour field (S1, S2: the numbers for owner decision D1); caricature
$\gamma$ = 0 vs. chosen (S1, S2); painted band textures vs. v1's toon bands plus screen-space Kuwahara
(flicker, S18, GPU time); shading-normal field on/off (band islands); cast shadow on/off (owner's style
rating); distinctiveness key vs. fixed key (S2, style); lattice alignment vs. G2P-string timing (S3, S4 on
realised phones); personal coarticulation parameters on/off (replay error, cross-language on the Hindi
reading when fitted on English only); rule–network fusion vs. network only (S3, PLRS); task-space paths plus
springs vs. joint-space key poses (S7 per frame, S9); observer-solved pointing vs. finger-ray pointing (S8);
correctness gate on backchannels on/off (S12, trust); speculation plus phrase bank vs. neither (S10);
likeness-gated stylisation vs. a fixed style strength (S1 vs. the owner's style rating).

### 8.6 Build order: a vertical slice first

Thirty-odd layers built in sequence would be a waterfall. The order is:

1. **Week 1, spike frame**: a throwaway 45k-triangle skinned mesh with 52 morphs, a 1024² shadow map, 4×
   MSAA and inverted-hull lines on an Iris Xe laptop and an M1; GPU-timer numbers committed before any
   Stage F code. In parallel: recruit the bench (L0, D10) and settle D2 (template licence).
2. **Vertical slice**: template fit (L33–L38) with parametric colour (L40–L42), the procedural painter
   (L52–L54), rule lips with the lattice aligner and constrained coarticulation (L62, L64, L67–L69), six
   gestures (namaste, point, count, open palms, beat, nod) on the arm solver with task-space paths and
   springs (L76, L79, L81–L85), and silence-plus-ASR-boundary turn-taking with the phrase bank (L65, L86, L87).
3. **Gate and grow**: every further layer enters only with its gate measured on the smoke bench; the full
   bench before each release.

---

## 9. Risks, open problems and what is new

### 9.1 Top risks

1. **Stylisation and the pixel ban vs. likeness.** Photo-trained recognisers score painted renders out of
   domain, and the parametric colour model carries less identity than a colour map. Mitigation: geometry
   carries likeness (template fit, caricature term, distinctiveness key as an option); a style-independent
   geometric score and a rank-based S1; the human lineup (S2) with matched foils as the primary test; the
   D1 ablation gives the owner the cost in numbers.
2. **Hands.** Few hand shapes are captured, fingers occlude each other, and hand animation is where avatars
   look wrong first. Mitigation: template five-finger hands with three measured numbers per hand, goal-based
   shapes with limits and coupling, per-frame collision, hand-shape coverage in the coach (L4), shapes judged
   as rendered painted silhouettes.
3. **Hindi/Hinglish voice and lips.** Cloned Hindi still trails the best commercial voices; the chosen TTS is
   archived; code-mixed text causes pronunciation errors; lip-sync models are mostly trained on English.
   Mitigation: the dedicated Hindi checkpoint, per-language references, clause-level synthesis, a maintained
   second engine behind the same slot, lattice alignment on the spoken audio, per-class gates on realised
   phones.
4. **Browser performance on weak laptops.** Unmeasured until the spike (§8.6). Mitigation: forward rendering
   with no screen-space paint pass, quality tiers (L92), active-morph evaluation.
5. **Template licence or fit quality.** If D2 fails or the fit cannot reach some body types, every model is
   affected. Mitigation: our own template as plan B; the fit's gates on the bench's diverse bodies.
6. **Live-conversation cost and latency.** Live cloned speech needs a running GPU (not free) and the
   multilingual model's first-chunk latency is unmeasured. Mitigation: pre-rendered narration, phrase bank,
   speculation, honest S10, CPU fallbacks, owner decision D5.
7. **Misuse of a cloned voice and face.** Mitigation: consent with face and voice match, identity lock,
   crypto-shredding, signed models that load only in our player, visible label, audio and frame watermarks,
   scope limited to teaching.
8. **Bias.** Albedo and skin-tone estimation are biased towards light skin (2205.03962, 2411.12002); banded
   shading reads poorly on deep skin if it relies on value contrast; face recognisers vary by group.
   Mitigation: eye-white calibration, the authored Monk palette table that carries form by rim and bounce,
   fairness reported per group and gated on an extended set.
9. **Licence contamination.** One non-commercial weight would taint the model, and research-trained models
   might choose parameters. Mitigation: L3 ledger as a hard gate, the check-only rule (D6), UNVERIFIED items
   in §6.3 not used until checked.
10. **Uncanny or cold behaviour.** Kinematic gestures look robotic between key poses. Mitigation: shoulder
    rhythm, task-space paths, springs, rest poses, speech-planned breathing, per-frame gates, user study with
    ablations.
11. **Pedagogical harm.** A teacher who nods at a wrong answer, looks disapproving at a mis-heard partial
    transcript, or bluffs damages learning. Mitigation: agreement and concern only on final, confident
    transcripts; neutral set chosen by a perceptual test; honest-face behaviour (L89); S12.
12. **Schedule.** Mitigation: the vertical slice of §8.6; the bench first.

### 9.2 Open problems

- A painted look that people *and* machines recognise as the person: there is no accepted likeness metric
  for stylised portraits; our geometric score is a proposal to be validated against S2.
- How much likeness the parametric colour model costs against a colour field (D1's ablation).
- Reliable 3D hands from a few phone frames without a hand model trained on non-commercial MRI or scan data.
- Lip-sync gates for languages beyond English and Hindi without per-language video (the IPA route should
  generalise; it must be tested per language).
- Turn-taking in Hinglish tutoring: no public two-channel corpus with commercial terms; we must record our own.
- Whether Hindi-speaking students read "hmm" and the head wobble as agreement (S12's perceptual test).
- A second-day held-out test is harder than the same-session test reported so far for the Living Portrait
  (97–103% of ceiling); expect lower numbers.

### 9.3 What is genuinely new here, and what is not

Not new (prior art we build on): dense-landmark face fitting, personalised blendshapes, template fitting by
non-rigid ICP, authored shading normals and painted light in stylised production, shadow maps, inverted-hull
lines, SH light estimation, dominance coarticulation and JALI, analytic arm IK and scapulohumeral rhythm,
minimum-jerk reaching, gesture phases, voice activity projection and semantic endpointing, speculative
response generation and context cuts at the played audio (Voice-Light 2609.20995), zero-shot voice cloning,
audio watermarking, LLM tutors, the caricature advantage. Each is cited at its layer.

New or, to our knowledge, not previously combined this way (to be confirmed by a wider literature search
before any external publication — **UNVERIFIED as novelty claims**):

1. **Measurement-only appearance with an information-budget certificate** (L40–L42): the model lists every
   photo-derived number and a copy cannot fit in the budget; the painter provably never sees a photo.
2. **Likeness-gated stylisation with caricature compensation** (L24): style strength and exaggeration away
   from the average are chosen per person under a style-independent geometric likeness score, putting back in
   geometry what the pixel ban removes from texture.
3. **Painted band textures from measured colour numbers on an owned template, chosen per pixel by a
   stabilised shading normal** (L52–L54), for a painted look that is stable by construction at laptop frame
   rates.
4. **Lips from the phones actually spoken**: a pronunciation lattice aligned on synthetic speech, a
   constrained trajectory with hard must-hit events, and **personal coarticulation parameters per
   articulatory class that transfer across languages** (L62, L64, L68).
5. **Deixis bound to a live web lesson and solved for the observer** (L78): the arm line lands on the exact
   element of the animation step, checked by a model of how a student reads a point, with automatic
   disambiguation when elements are dense.
6. **Correctness-contingent listening with a teacher's wait time** (L87, L88): agreement only after a final,
   confident, graded transcript, and question-aware waiting instead of the shortest gap.
7. **Gestures as validated goal programs over a measured skeleton**, solved every frame along task-space
   paths with springs, styled by measured habits, with no motion clips (L76–L85).
8. **A self-grading, time-budgeted build** that retries only the layers upstream of a failing gate and
   otherwise names the missing photo (L94).

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

**Capture and reading.** 2006.10962 (Attention Mesh / MediaPipe face). 2006.10204 (BlazePose). 2006.10214
(MediaPipe Hands). 2205.12010 (SFace). 2204.02776 (dense landmarks). 2305.11522 (occlusion-robust dense face
alignment). 2007.07227 (MeTRAbs). 2002.10322 (bone-based pose). 1604.06195 (hand pose review). 2510.19884
(iris area). 2205.03962, 2411.12002, 2406.13149 (skin tone and albedo bias). Hashemi et al. (2015) corneal
diameter. Bentivoglio et al. (1997) blink rate, Movement Disorders 12(6).

**Face and head shape, likeness.** Gower (1975) generalised Procrustes, Psychometrika 40. Umeyama (1991),
IEEE TPAMI 13(4). 2007.12494, 2107.04277, 1910.06007 (multi-view face). 2007.06759, 2010.00560, 2508.08429
(personalised rigs). 2310.17519 (FLARE). 2105.02451 (neural blend shapes). 1911.08008, 1903.03785, 2311.02461
(head models). 2604.13856, 2602.11693 (one-shot full heads). 2203.09692, 2409.07984 (detail; SPARK).
2211.07818, 2505.10072, 2104.14559, 2403.15227 (stylised identity-preserving avatars). Lewis et al. (2014)
blendshape practice, Eurographics STAR. Li, Weise, Pauly (2010) example-based facial rigging, SIGGRAPH.
Rhodes, Brennan, Carey (1987) identification and ratings of caricatures, *Cognitive Psychology* 19. Näsänen
(1999) spatial frequency bandwidth used in the recognition of facial images, *Vision Research* 39.

**Template, body, hands, rig.** MakeHuman licence pages (makehumancommunity.org, "about/license", checked
2026-11-26). Amberg, Romdhani, Vetter (2007) optimal step non-rigid ICP, CVPR. Sorkine et al. (2004)
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

**Painted rendering.** Motomura (2015) *Guilty Gear Xrd's art style: the X factor between 2D and 3D*, GDC
slides. Trade-press accounts of the reference series' texturing (80.lv, "A closer look at texturing in
Arcane", parts 1–2) and FMX 2025 session "Achieving Arcane's hand-painted style with Mari" (secondary; studio
details unverified). 1807.03249 (StyleBlit). 2311.12891 (SyncMVD). 2411.02336 (MVPaint). 2312.13913
(Paint3D). 2302.01721 (TEXTure). 1810.01175 (line drawings from 3D). Bénard, Thollot, Collomosse (2011)
temporal coherence for stylized animations, CGF. 2312.12392 (recursive camera painting). 2403.07807
(StyleGaussian). 2602.00618 (Tune-Your-Style). 2206.06360 (ARF). 2312.10263 (painterly harmonisation).
2401.16224 (Diffutoon). Meier (1996) painterly rendering for animation, SIGGRAPH. Kuwahara et al. (1976)
processing of RI-angiocardiographic images. Kyprianidis, Kang, Döllner (2009) anisotropic Kuwahara filtering,
Computer Graphics Forum. Cabral and Leedom (1993) line integral convolution, SIGGRAPH. Winnemöller,
Kyprianidis, Olsen (2012) XDoG, Computers & Graphics. 2510.13978 (instant skinned Gaussian avatars for web).
web.dev (2025) WebGPU supported in major browsers. 2308.04079 (3D Gaussian splatting; paper only). 2409.06765
(gsplat). 2404.19398 (Gaussian blendshapes). 2604.23957, 2507.12723 (audio-visual watermarking).

**Voice.** Chatterbox README and `Chatterbox-Multilingual-hi` model card (Resemble AI; archived August 2026).
AudioSeal README (licence update, April 2024). 2505.00579 (voice cloning survey). 2407.05407 (CosyVoice).
2608.11650 (cross-lingual zero-shot TTS). 2610.14776 (compact TTS). 2402.09378 (MobileSpeech). 2306.07691
(StyleTTS 2). 2211.09536, 2507.15272, 2505.18609, 2410.14197 (Indian-language TTS). 2409.10969, 2412.19043,
2510.25178 (code-switched TTS). 1810.00662 (Hindi–English code-switching corpus). 2004.10353 (Hindi schwa
deletion). 2204.03067, 1708.01464 (multilingual G2P). 2204.06502 (Indic TIMIT, Indian English variation).
2311.08323 (IPA alignment). 2109.11680 (zero-shot cross-lingual phoneme recognition). 2306.04306 (Allophant).
2606.25460, 2406.19363, 2608.28508 (forced alignment). 2401.17264 (AudioSeal). 2312.03410 (timbre
watermarking). 2611.04716 (cross-codec watermark robustness). 2005.07143 (ECAPA-TDNN).

**Lips and face performance.** Fisher (1968) visemes, J. Speech and Hearing Research. Cohen and Massaro
(1993) coarticulation in visual speech, Models and Techniques in Computer Animation. Edwards, Landreth,
Fiume, Singh (2016) JALI, ACM TOG. Schwartz and Savariaux (2014) No, there is no 150 ms lead of visual speech
on auditory speech, PLoS Comput Biol 10(7). ITU-R BT.1359 (relative timing of sound and vision). 1805.09488
(VisemeNet). 2301.06059 (viseme dynamics). 2408.05641 (phoneme-to-articulatory coarticulation). 2507.20343
(DYNARTmo). 2609.30517 (visible articulation). 2610.03436 (geometric coarticulation measure). 2503.20308
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
(mis-)interpretation of pointing gestures, JEP:HPP 42. Winkworth et al. (1994/1995) speech breathing, JSHR.
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

**Evaluation.** 2208.10441, 2308.12646, 2608.10839 (GENEA challenges). 2101.03769 (gesture evaluation
review). 2605.06063 (avatar representation in gesture evaluation).

**Internal documents.** `docs/pratibimb/BRIEF.md`, `LAYERS.md`, `ARCHITECTURE.md`, `ENGINE.md`, `SPEC.md`,
`TRAINING.md`, `PACK_FORMAT.md`, `PAPER_CHANGELOG.md`; code in `scripts/pratibimb/engine/` and
`scripts/teacher/maker/`.
