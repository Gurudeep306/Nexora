# Pratibimb: a layered, measurement-only pipeline that turns a phone capture into a painted, talking, gesturing digital teacher

*NexoraGuru research paper, design version 3 (2026-11-26). Supersedes version 2 after the second review round
(art direction, face science, teaching, buildability; earlier rounds: graphics, motion, speech, systems;
decisions in `PAPER_CHANGELOG.md`). It specifies the black box described
in `BRIEF.md`, refines the 64-layer plan in `LAYERS.md`, and keeps the engine choices in `ENGINE.md` and the
rules in `SPEC.md`. Where those files disagree, the brief wins (§2.4 lists the disagreements found). Things
only the owner can decide are collected in §2.6.*

---

## Abstract

We describe Pratibimb, a system that takes a consenting adult's ordinary capture (photos and/or a short
phone or webcam video, plus their voice) and builds one digital human of that person: waist up, facing the
student, recognisable as them, drawn in a hand-painted look, speaking in their cloned voice with accurate lip
sync in any language, gesturing with arms and five-finger hands, showing emotion, listening and reacting, and
conversing as a teacher through the site's tutor ("Guru"). The system is built as **93 layers (L0–L92) in
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
(shared priors and **one template mesh built by our own script from CC0 MakeHuman assets** with its rig,
UVs, 52 face units and authored painting attributes); per person we only measure, fit the template, and
bake; the runtime is a small skinned mesh with a forward, texture-space painted shading model in three.js
(WebGL2), not a neural renderer and not a screen-space paint filter.

The painted look is made where the reference look makes it: **in the textures**, and like the mesh it is
**painted once**. The template carries a master band set (light, half-tone and shadow paint sharing one
stroke layout, with broken terminator edges and expression wrinkles); at run time the person's palette
recolours it, a stabilised shading normal and a key-light shadow choose between the bands, and only the
person's own features (brows, lip line, marks, facial hair) are painted per person, as a small overlay. The
paint is on the surface, so it cannot flicker.

The main new ideas are: measurement-only appearance with a certificate of what was measured; likeness put
back into geometry by exaggerating the face away from a **matched norm** (sex- and population-matched), with
the strength set once by a human pilot and stylisation constrained not to rotate the face's direction in
face space; lip sync driven by the phones the voice *actually spoke* (a pronunciation-lattice aligner) and solved
as a constrained trajectory whose closures cannot be missed, with per-person coarticulation parameters that
carry across languages through IPA; deictic gestures that land on the exact element of the lesson animation
and are solved for how an *observer* reads a point; listening that is contingent on whether the student is
right (the teacher never nods at a wrong answer), that waits like a teacher after a question, and that
answers a wrong answer by looking at where it went wrong rather than with a face; a teacher who shares the
student's attention with the moving lesson; and a build that grades itself on held-out frames and on a
rebuild from its own renders, and retries or asks for the missing photo. Most individual techniques are
known; we state plainly which parts are new (§9.3). Status: 16 layers exist in code (some in part) and
46 are partial (`scripts/pratibimb/engine/`, `scripts/teacher/maker/`, `scripts/teacher/`); the other
31 are specified here and still to build (index in §5.12). Layers and options marked **later** are
outside release 1 (§8.6).

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
reorders the build so the first milestone is a painted, talking head judged by the owner.

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
6. **Consent first**: adults only, their own face and voice, spoken consent matched to the face *and to the
   voice*, one-tap delete, revocable.

### 2.4 Inconsistencies found in the existing documents (for the owner)

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

### 2.5 Measurable success criteria (release gates for the whole system)

| # | Criterion | Measure | Target |
|---|---|---|---|
| S1 | Likeness regression (machine; not a release gate for likeness) | Identity geometry computed **on the mesh vertices** (exact correspondence, L24): the direction cosine of the person's deviation from the matched norm before and after stylisation, and ~20 identity ratios; rank-1 among the other bench people and synthetic impostors at a perceptually calibrated radius (L0); the landmarker on renders and SFace only as render-sanity checks (L3) | Direction cosine ≥ 0.95; no regression against the last release on any bench person; render-sanity checks pass |
| S2 | Likeness (human; **the only likeness release gate**) | (a) Acquaintances (≥ 5 per bench person) pick the person's render from a lineup of 4 whose foils match sex, Monk group, hair length, glasses and brow shape; (b) strangers (≥ 30 opted-in students per person) match a held-out photo to one of 4 such renders; neutral and three-quarter renders reported separately | (a) pooled ≥ 90% correct with the lower 95% bound ≥ 75% (chance 25%); (b) ≥ 70% per person; CIs reported |
| S3 | Lip closures | p/b/m (and प फ ब भ म) *as realised* (L61) show full lip closure in the displayed frame nearest the closure midpoint, measured on the **rendered pixels** (landmarks re-detected on renders) with 10% injected frame drops; plus blind raters on muted clips | 100%; raters tell p/b/m clips from others ≥ 90% |
| S4 | Lip-teeth contact | Phones *realised* as [f] or [v] (L61; [ʋ]/[w] realisations are excluded) with lower lip at the upper teeth, on rendered pixels | ≥ 95% |
| S5 | Audio–video offset | Measured in the browser after output-latency calibration (L90) | lips lead audio by ≤ 80 ms and lag by ≤ 40 ms |
| S6 | Mouth range | Replay gate (L68): the person's own held-out reading driven through L61–L68 vs. the 52 values tracked from the same video | per-class amplitude within ±15%; inner-lip distance error reported |
| S7 | Gesture validity | Every action of the library × 8 bench bodies, **every frame at 30 fps** of the trajectory | 0 limit violations; 0 penetrations > 2 mm |
| S8 | Pointing | Observers pick the indicated lesson element from its neighbours on silent clips; the shoulder–wrist–fingertip line hits the element's box; rerun at a 360 px phone width with the phone tier (L90) | ≥ 95% correct picks; line hits ≥ 98%; phone result reported |
| S9 | Appeal and naturalness | Ho–MacDorman humanness and eeriness indices, an appeal rating and GENEA-style appropriateness of gestures (§8.4); realism is not the target of a painted look | Eeriness ≤ the generic painted presenter arm; appropriateness ≥ "rule-based" ablation |
| S10 | Responsiveness | Student stops → first visible reaction / first audio (phrase bank or speech) / first content clause, **for student questions**; evaluations of a student's answer keep the deliberate hold of L85 and are reported separately | ≤ 300 ms / ≤ 0.8 s / ≤ 1.8 s (medians, measured end to end including recognition) |
| S11 | Barge-in | Student speaks over her → her audio fades; she never interrupts herself through echo | ≤ 300 ms after the student's onset; 0 self-interruptions in the echo test |
| S12 | Pedagogical honesty | Agreement signals after a wrong student answer (controls); perceptual checks by Indian student raters from at least North, South, East and West India, reported per region: "did she agree?" on the neutral set, and "was she disappointed in me?" on wrong-answer clips | 0 agreement signals; neutral set at chance in every region; "disappointed" at or below the neutral baseline |
| S13 | Build time | Pack upload → **usable** signed model with report, one warm 24 GB GPU worker (the phrase bank streams in afterwards, L62) | median ≤ 210 s, p95 ≤ 240 s (cold start reported separately) |
| S14 | Playback | 30 fps at 720p (internal resolution ≤ 720 physical pixels tall at any device pixel ratio, L56) on an Intel Iris Xe-class laptop in Chrome; p99 frame ≤ 40 ms; a mid-range Android phone at the phone tier reported | pass |
| S15 | No pixel copy | Information-budget certificate complete and within budget (L42); patch-copy check; painter input audit (no photo reached L51) | pass on every build |
| S16 | Fairness | S1, S2 and the style rating per Monk Skin Tone group, sex and age band | monitored report on the bench; gate (no group > 5 points below the mean) only on the extended set (≥ 30 people, or synthetic heads for the colour layers) |
| S17 | Provenance | Every weight and asset in the model traces to a commercial-OK source; gate models obey the check-only rule (L3) | 100% (else the site refuses to publish) |
| S18 | Style | Owner's rating against references 1–8 (§8.3), over a light and a dark theme background; once the owned style kit exists, the style distance to it (L51); raters must not judge two bench teachers "same paint" above chance | ≥ 4/5; style distance ≤ the kit's own spread; sameness at chance |
| S19 | Figure–ground | Silhouette contrast of the teacher against the actual page behind her, for all 24 theme × light/dark backgrounds × the 8 bench people, with the deep Monk groups over light themes as their own cell (L49) | ≥ 3:1 along ≥ 90% of the outline in every cell |
| S20 | Attribution | Students answer "did your teacher personally say this?" on recorded-lesson and live-AI clips (L57, L87) | ≥ 90% correct |

### 2.6 Owner decisions needed

These cannot be settled by engineering. Until the owner decides, the paper uses the default named.

| # | Decision | Why it is the owner's | Default in this paper |
|---|---|---|---|
| D1 | **The albedo-blur question.** May the model keep a blurred colour map of the person's face (a band-limited field from the photos), or only a few hundred colour numbers (palette plus smooth per-region gradients and three contrast numbers)? | The blurred map helps likeness but sits in the band people recognise faces with; whether that counts as "photo pixels" is a reading of the brief | Parametric colour only (L40). The ablation in §8.5 has three arms (parametric, parametric plus contrast features, field), so the owner decides with numbers |
| D2 | **Template licence. Settled (2026-11-26), no owner action needed.** The MPFB2 licence (copy in `docs/voice/licences/2026-11-25/mpfb2-LICENSE.md`) says the assets (base mesh, proxies, targets, textures, clothes, rigs, expressions) are CC0 1.0 and, in §D, that the MakeHuman team "makes no claim whatsoever" over exports or "graphical data generated via scripting"; the functional packs (`faceunits01`, `visemes02`) and the clothes packs list every item as CC0; the MakeHuman `LICENSE.md` on GitHub master says the same (read by the build reviewer). The older AGPL wording is superseded | — | MakeHuman/MPFB CC0 assets, exact versions and hashes pinned in L3. MPFB and Blender code (GPLv3) run only on our own machines to make the template and are never shipped or distributed; a lawyer's look is optional, not a blocker. Our own template stays plan B |
| D3 | **Paying artists.** An owned style kit (30–60 painted portraits over our own plain renders) and a hand-painted master band set (4–6 sets on the template) need painters | Money, and who owns the work | The master band set is first generated by our procedural painter; if it fails the week-1 look spike (§8.6), staff paint it in Krita (owned outright, assignment in writing); an outside artist only if both fail. The style kit is not assumed; S18 falls back to the owner's rating |
| D4 | **Who is painted in the style kit.** Bench people (needs written consent to derivative artworks and to training a style model on them), artists' self-portraits, or fictional heads | Consent and paperwork | Fictional heads and artists' self-portraits |
| D5 | **Running cost of live conversation.** Live cloned speech needs a GPU running while students talk (§7.4); it is not free. **Consequence to know:** without a GPU kept up, most live replies will *not* be in the teacher's voice | Money | Lesson narration pre-rendered at publish time (free at play time); live replies in the cloned voice only while a GPU worker is up. Otherwise she never speaks in another voice: she shows listening and thinking cues and the answer appears as captioned text, or a clearly different, labelled presenter answers (L60) |
| D6 | **Check-only use of models trained on research data.** SFace (trained partly on the withdrawn MS-Celeb-1M), ECAPA speaker models (VoxCeleb) and XLSR phone recognisers (BABEL in pre-training) are used only to *check* a build (pass/fail), never to choose a shipped parameter | Legal risk appetite | Allowed as checks only (L3 rule); never ship their weights; replace each when a commercial-trained one exists |
| D7 | **Proportions.** Confirm realistic proportions with mild stylisation (brief's newer sentence) rather than the part table's anime eyes and nose. Whatever is chosen, the slider moves eyes, nose and mouth together with the painted material, so no mismatched mix (anime eyes on a realistic face) can be reached | The brief contradicts itself | Realistic, $s_{max}$ = 0.35 |
| D8 | **Warm worker.** Keep one GPU worker warm (cost) so builds meet 3–4 minutes, or accept 30–90 s more on a cold start | Money vs. the build-time promise | Warm worker during Studio hours; cold builds report their start-up time separately |
| D9 | **Diffusion painter.** Pursue the optional diffusion painter (L51 variant) at all: it would paint the template's master band sets once, offline (no per-build GPU time), but needs a base model whose licence must be confirmed and a style model trained only on the owned kit (D3) | Money and licence | Not pursued until D3 exists; the procedural painter is the default |
| D10 | **The bench and its raters.** Recruit 8 adults with written consent for a second-day capture, readings and hand clips (L0); ≥ 5 acquaintances per bench person and ≥ 30 opted-in students per person for S2 | People and paperwork; every gate depends on it | Required before any Stage C–F layer is called done |
| D11 | **When a teacher revokes consent.** Revocation deletes the model and every lesson clip narrated with it (L3). What do students of those lessons get? | Continuity of courses vs. the teacher's right to leave | Lessons fall back to a generic, labelled presenter with a default voice, re-narrated automatically; the teacher is told this before consenting |
| D12 | **Real-scan face data for the head prior.** ICT-FaceKit Light (MIT licence, file read by the face reviewer) has 100 identity modes from light-stage scans; whether its scan subjects consented to redistribution, and who they are (demographics), is not stated | Consent of third parties and fairness | Not used until both are checked; the prior is built from MakeHuman CC0 heads and consented builds, centred on published Indian anthropometric norms (L23) |
| D13 | **Live AI replies in a teacher's voice, by default.** Each teacher has a persona contract (L87) and can switch live replies off; should they start on or off? | Trust and the teacher's control over what "they" say | Off until the teacher reads the contract and switches them on; recorded lessons are unaffected |

---

## 3. Innovation method

### 3.1 Design science, build → evaluate cycles

We follow design-science research (Hevner et al. 2004; mapped to software engineering in arXiv 1904.12742;
taught as a method in 2407.09844). Each layer is an artefact with (a) a requirement drawn from §2, (b) a
build, (c) an evaluation against a **gate** that is a number with a threshold, measured on the bench (L0)
and on held-out data, and (d) a recorded decision. A layer that fails its gate does not ship; the build
falls back to the layer's stated fallback, and the build report names it. A 2-person smoke bench runs on
every change; the full bench runs nightly and before a release (L92).

### 3.2 TRIZ: removing contradictions instead of trading them off

TRIZ (Altshuller) treats a hard design problem as a contradiction between two requirements and looks for a
principle that removes it (separation in time, space, condition or scale; intermediaries; prior action;
and so on). Recent work automates the search with language models (AutoTRIZ 2403.13002, TRIZ Agents
2506.18783, TRIZ-GPT 2408.05897); we used the method by hand, with those papers as checklists. The
contradictions and their resolutions:

| # | Contradiction | TRIZ principle | Resolution in Pratibimb |
|---|---|---|---|
| C1 | Likeness needs the person's appearance **vs.** no photo pixels may be used | Separation by scale ("separate the property from the carrier"); "the other way round" (#13) | Likeness lives in *geometry* (face shape, proportions, hair silhouette) and a few colour numbers. Detail is *painted*, not copied (L40–L43, L51). Lost texture cues are put back as geometry and as a few measured marks: a caricature term pushes the face *away* from a matched norm, at a strength chosen once by a human pilot (L24), and salient marks, lid crease and hairline are kept as numbers (L22). |
| C2 | Any gesture **vs.** no animation library or animator | Prior action (#10) + dynamism (#15) | Actions are goal programs solved every frame (analytic IK + limits + task-space paths + springs). The "library" holds goals, not motion (L74–L83). |
| C3 | Quality **vs.** an ordinary laptop | Separation in time (#10 prior action) | Heavy work once (shared priors, one authored template), fitting and baking per person, a small explicit model at run time (§6, §7). |
| C4 | Painted look every frame **vs.** temporal stability (painted filters flicker) | Separation in space (#17 another dimension) | The paint lives in texture space on the surface, painted once on the template: light, half-tone and shadow share one stroke layout, the run time recolours them by the palette and chooses between them by a stabilised shading normal (L50–L52). No screen-space paint filter. |
| C5 | Lips right in any language **vs.** no lip data for most languages | Intermediary (#24) | All languages pass through IPA phones, aligned on the audio the voice actually spoke; mouth shapes depend on articulation, not language (L59–L68). |
| C6 | Respond fast **vs.** think well | Preliminary action (#10), partial action (#16) | Visible pre-reaction at 250 ms, a pre-synthesised phrase from the person's own bank, the rest streamed clause by clause; speculative drafting on the partial transcript later (L62, L89). |
| C7 | Expressive listening **vs.** never misleading the student | Separation by condition | Agreement signals only after the grader marks a *final* transcript correct; nothing evaluative fires on partial transcripts (L86). |
| C8 | A cloned voice and face are useful **vs.** they can be misused | Self-service (#25) and "the other way round" (#13) | The model carries its own consent record, face and voice lock, signature, watermark and visible label; it refuses to play outside the site (L1–L3, L63, L57). |
| C9 | Build quickly **vs.** perfect result | Feedback (#23) | The build grades itself on held-out frames and spends its remaining time budget only on failing layers (L92). |
| C10 | One topology for everyone **vs.** everyone's own shape | Universality (#6) + intermediary (#24) | One template, built by a deterministic script from CC0 assets, carries every asset that must be made once (UVs, loops, weights, correctives, 52 face units, line and stroke attributes, the master paint); only its shape and expression ranges are fitted per person (L33–L38). |
| C11 | Teacher presence **vs.** the student's attention on the lesson | Separation in time (#1 segmentation by condition) | While a lesson step animates she looks at it and gestures only by pointing; direct gaze and expressive gesture return between steps (L73). |

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
 │ A  Bench, consent & provenance  L0–L3                        │   │ J  Listen & converse   L84–L89       │
 │ B  Capture & reading     L4–L16   (on device + worker CPU)   │   │      student audio → turn state,     │
 │ C  Shape                 L17–L32  (who they are: geometry)   │   │      reactions, Guru → script        │
 │ D  Template fit & rig    L33–L38  (one owned template)       │   │ G  Voice               L58–L63       │
 │ E  Appearance            L39–L48  (colour numbers, eyes,     │──►│      text → IPA → cloned audio →     │
 │                                    mouth, hair, clothes)     │   │      spoken-phone alignment          │
 │ F  Painted look (bake)   L49–L51, L53                        │   │ H  Lips, face, attention  L64–L73    │
 │ G  Phrase bank (after signing) L62                           │   │ I  Body action         L74–L83       │
 │ K  Gates & packaging     L91–L92                             │   │ F  Painted renderer    L52–L57       │
 └──────────────────────────────────────────────────────────────┘   │ K  Clock & delivery    L90           │
                                                                    └──────────────────────────────────────┘
```

Stage G's voice reference and phrase bank, Stage H's mouth ranges and coarticulation parameters, Stage I's
skeleton limits and rest poses, and Stage F's per-person paint overlay and baked shading data are prepared at
build time (the master band set is part of the template); the stages on the right run at play time on the
person model the build produced. The phrase bank is synthesised after the model is signed and streams in
when ready. Lesson narration is synthesised once, at publish time, through Stages G–H on the server (§7.4).

### 4.2 Data flow at run time (one clock: the audio)

```
 student mic ─► L84 VAD / streaming ASR / echo guard ─► L85 turn state ─┬─► L86 reactions (final transcript + grader) ─┐
                                                                         └─► L87 Guru: streamed clauses, Leak Guard     │
                                                                               │ L88 barge-in, L89 speculation + bank    │
            ┌──────────────────────────────────────────────────────────────────┴──────────────┐                         │
            ▼                                                                                 ▼                         ▼
   L58 text norm ─► L59 G2P lattice ─► L60 cloned voice ─► audio ─► L61 align spoken phones   L74 action language
                     (server)            │ L63 watermark         + prosody (server)           L75 gesture plan
                                         ▼                                │                    L76 target (DOM → 3D)
   L64 visemes ─► L65 constrained coarticulation ─► L66 jaw/lip ─► L67 tongue ─► L68 refine   L77 arm solver, L78 hands
   (server, shipped with each audio chunk as 52 values + events)                              L79 trajectories, L80 collisions
   L69 emotion, L70 blinks/brows, L71 head, L72 gaze (+VOR),  ┐                               L81 rest/idle/breath
   L73 attention beside the moving lesson ────────────────────┤                               L82 springs (body, hair, cloth)
                                                              ▼
                                     L83 mixer: pose(t) = {52 face values, jaw, tongue, eyes, skeleton} ◄──┘
                                                              ▼ (L90 audio clock, closure hold)
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
hair clump fit, wardrobe fit, motion-habit profile and rest poses, coarticulation parameters, voice reference (speaker embedding,
per-language reference spans, optional adapter), the phrase bank (audio, phones, motion), consent record,
provenance ledger, information-budget certificate and the build report. Target download ≤ 8 MB per teacher
(≈ 5 MB expected, §7.2; the template and its master band set are cached once for all teachers; phrase bank
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
All gates run in **one bench harness** (L92) with about twenty metrics; a layer gate that is only a system
gate says so ("S14") instead of restating it. Layers are a checklist; fourteen code modules are the unit of
ownership (§8.7). **Later** in a Status line means outside release 1 (§8.6).

---

### Stage A: Bench, consent, identity and provenance (L0–L3)

#### L0 The bench (first deliverable)
- **Purpose.** Almost every gate in this paper is measured on the bench; it must exist before any layer
  is called done.
- **In → Out.** Eight consenting adults (§8.2) → per person: the standard guided capture, a second-day
  capture, 5 minutes of reading in English and Hindi/Hinglish with the face visible, 2 minutes of free
  explanation with hands visible, a ruler measurement of hand length and palm width; the written consent
  records; a synthetic hard-negative gallery (≥ 50 heads per person sampled from the head prior near that
  person, L23) for the S1 regression; the S2 raters (≥ 5 acquaintances per person, ≥ 30 opted-in students
  per person, from at least four regions of India for S12).
- **Method.** Recruit to the coverage of §8.2; written consent naming the bench use, retention and
  deletion; store encrypted with the same crypto-shredding as models (L3). The synthetic gallery is made by
  sampling head-prior coefficients at a distance $r$ from the person's (hard negatives), rendered by the
  same pipeline. $r$ is calibrated **perceptually** once: the distance at which raters tell two synthetic heads
  apart 75% of the time (a fixed, uncalibrated $r$ makes rank-1 trivially easy or impossible). Because the
  prior is mostly MakeHuman-like heads, the impostors are checked against S2 before S1 margins are trusted.
- **Research.** Design-science evaluation (1904.12742); impostor controls in face verification (2205.12010).
- **Ours.** A bench of second-day captures with perceptually calibrated synthetic impostors for stylised
  likeness.
- **Defaults.** 8 people; smoke bench = 2 of them (one light, one deep Monk group).
- **Fails → fallback.** None: without the bench, layers stay "unverified" in the index. The fixed-point
  gate (L92) and synthetic heads need no bench people and run from week 1.
- **Gate.** All 8 people's material complete and consented, raters recruited (owner decision D10).
- **Status.** *Partial*: the harness `scripts/teacher/maker/bench.py` (held-out clips, every model against
  every other person as a control) and `likeness.py` exist; people, consent, raters and the synthetic gallery
  *to build*.

#### L1 Consent capture and verification
- **Purpose.** Nothing is built unless the person shown agreed, on camera, in their own words, in their own
  voice.
- **In → Out.** Consent clip (video + audio), account, declared age ≥ 18 → signed consent record
  `{who, by_whom, sentence, transcript, time, clip_hash, scope, voice_match}`.
- **Method.** The person reads a fixed sentence naming NexoraGuru, the purpose (teaching presenter) and
  the right to delete. Speech recognition (L84's recogniser) transcribes it; a normalised word error rate
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
  each check-only model and what it checked. The template is pinned by version and by the hash of every
  MakeHuman/MPFB asset it uses (D2, settled); the GPL tools that build it (MPFB, Blender) are recorded as
  internal tools that are never shipped. Items still to check before shipping: the Libri-Light pre-training
  data of the aligner (L61), the KTX2/Basis transcoder (L51), and ICT-FaceKit's scan subjects (D12). The model is
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
  `pack.py`; per-asset CC0 refusal in `scripts/teacher/build-vrm-teacher.py`; licence records in
  `docs/voice/licences/2026-11-25/`; check-only rule and crypto-shred *to build*.

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
- **Status.** *Exists*: `sharpness`, `quality`, `covered`, stillness check in `capture.py`; mirror check
  *to build*.

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
  on our renders as a drawing check (L24) and by the rendered-pixel lip gates (S3, S4).
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
  default Indian voice until then.
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
  explanation video where present (L81).
- **Research.** Blink statistics in conversation (Bentivoglio et al. 1997); speaking style capture (VOCA
  1905.03079); personalised audio-driven motion by retrieval (2604.23692).
- **Ours.** Per-viseme-class mouth range from the person's own speech (drives L66).
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
- **Status.** *Exists*: ridge map in `rig.py`; example selection and confidences *to build*.

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
  curves in mesh barycentric coordinates with a strength per expression value. Drawn by L54 as lines,
  never as pixels. Forehead lines and eye bags mostly read as *age*, and ink lines on them age a painted
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
  a habitual bindi position, freckles, the eyelid type, the hairline, the nostril shape.
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
  The person sees a **per-item keep/remove list** in the Studio: some want a scar kept and spots removed.
  Everything is counted in L42 (about 100 numbers); painted by the per-person overlay (L51) and drawn as
  lines (L54).
- **Research.** External features such as the hairline matter as much as internal ones to unfamiliar
  viewers, internal ones to familiar viewers (Ellis, Shepherd and Davies 1979, *Perception* 8); pigmentation
  is about as important as shape for identity (Russell, Sinha, Biederman and Nederhouser 2006, *Perception*
  35).
- **Ours.** Marks and lid and hairline descriptors as consent-listed numbers, not pixels.
- **Defaults.** ≤ 10 marks; marks below 1.5 mm radius dropped.
- **Fails → fallback.** Item "not measured"; the template default.
- **Gate.** Marks found on both capture days at the same position (≤ 3% of eye distance) on the bench; the
  owner's side-by-side check prefers "with marks" for every bench person who has them; S2 ablation.
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
  MakeHuman modifier heads is a PCA of artist sliders, not of people. So $N$ is sex-matched and re-centred so
  its ~20 identity ratios equal published Indian anthropometric means (Farkas et al. 2005 includes an Indian
  group; table values not yet read, **UNVERIFIED**), and ratios are whitened by the published SDs; as
  consented builds accumulate (their consent names this use), a running mean of them replaces the
  re-centring. The norm also samples L0's hard negatives.
- **Research.** Complete head models (1911.08008); combining face and head models (1903.03785); SPHEAR
  (2311.02461); one-shot full heads (2604.13856, 2602.11693) for ideas only; own-group face norms (Byatt and
  Rhodes 1998, *Vision Res.* 38); facial anthropometry across populations (Farkas et al. 2005, *J Craniofac
  Surg* 16); ICT-FaceKit (github.com/USC-ICT/ICT-FaceKit, MIT).
- **Ours.** A head prior trained only on CC0 and consented heads (no FLAME), in the template's own topology,
  with a population- and sex-matched norm.
- **Defaults.** 30 components, prior weight 1.0; norm by declared sex and Indian anthropometric means.
- **Fails → fallback.** The template's mean head scaled to the face.
- **Gate.** Side-silhouette IoU ≥ 0.9; the norm's ratios within 0.5 SD of the published means; S16's
  monitored report shows no Monk group systematically "further from the norm" than others.
- **Status.** *Partial*: ellipsoidal shell in `rig.py` and `anime.py`; prior and norm *to build*.

#### L24 Stylisation and caricature from the matched norm
- **Purpose.** The painted look has gently stylised proportions; stylisation must never rotate a face's
  identity, and the likeness lost with the photo texture is partly put back into geometry.
- **In → Out.** Measured neutral $F_0$ (L17–L19), matched norm $N$ (L23), personal expression deltas
  $D_k$ (L35), style $s\in[0,1]$, caricature $\gamma$ → the stylised face
  $F(b) = M_s\big(N + (1+\gamma)\,W_c \odot (F_0 - N)\big) + \sum_k b_k\, J_{M_s} D_k$,
  with $M_s$ a smooth linear map, $J_{M_s}$ its Jacobian applied to the deltas only, and $W_c$ the per-vertex
  confidence of the deviation.
- **Method.** $M_s$: smooth local scalings around the eyes, nose, mouth and jaw (as in `anime.py`), moving
  eyes, nose and mouth together with the material's stylisation (D7). **Caricature on identity only**:
  scaling the expression deltas by $(1+\gamma)$ would push the lips through each other at closure and break
  the mouth calibration, so expressions pass only through $J_{M_s}$. **Confidence** $W_c$ (the v2 symmetry
  layer folded in here): the deviation is split into symmetric and asymmetric parts by the template's mirror
  map, and the asymmetric part is shrunk by its across-frame variance (James–Stein style,
  $v/(v+\sigma^2_{noise})$), so stable asymmetry survives and noise is not exaggerated. **Why v2's score was
  replaced**: v2 chose $\gamma$ to maximise a distance margin to impostors around the veridical face. With
  $a = F_0 - N$, the render sits at distance $\gamma\lVert a\rVert$ from the truth and at about
  $\sqrt{\gamma^2\lVert a\rVert^2 + r^2}$ from impostors at radius $r$, so the margin falls monotonically in
  $\gamma$ and the search always returned $\gamma = 0$. The caricature advantage is perceptual (identity is
  coded as a direction from the norm and strength as distance along it; Leopold, O'Toole, Vetter and Blanz
  2001), so no veridical-distance score can find it. **Identity constraint** (machine, on the mesh): the
  cosine between $W(R - M_s(N))$ and $W(F_0 - N)$, with $R$ the stylised neutral's **mesh vertices** (exact
  correspondence; no landmarker on painted renders) and $W$ the whitening of L23, must stay ≥ 0.95; it is
  invariant to $\gamma$ and so constrains $s$ and $M_s$: stylisation may not rotate identity. $s$ is the
  largest value meeting the constraint, capped at $s_{max}$. **$\gamma$ is set perceptually, once, for
  everyone**: an S2-style pilot on the bench over $\gamma \in \{0, 0.05, 0.10, 0.20\}$ with an eeriness check
  (Ho–MacDorman index); photographic caricatures were best at only about +4% (Benson and Perrett 1991),
  very familiar faces may prefer slight anti-caricatures (Lee and Perrett 2009, abstract only), and the
  effect is stronger for drawn depictions (Rhodes et al. 1987). In the same pilot, one arm also scales the
  vector features (brow shape and thickness, lid-crease height, mark size) by $(1+\gamma/2)$ (untested).
  **The person chooses**: the Studio shows $\gamma = 0$ beside the chosen value and the person picks; never
  caricature from a cross-group norm. **De-attenuation (untested, off by default)**: every stage shrinks a
  face towards its prior (landmarker prior, Procrustes averaging, the shrinkage above, ICP stiffness,
  Laplacian regularisation); synthetic heads of known shape rendered at the capture's poses and distances are
  run through L7→L34, the slope $\beta_k$ of recovered on true deviation is measured per head-prior component
  and per ratio, and $a_k \leftarrow a_k/\beta_k$ (capped, confidence-weighted) undoes the attenuation, so
  $\gamma$ only adds the small perceptual exaggeration. The landmarker runs on renders only as a drawing
  check (disagreement with the mesh beyond 3% of eye distance flags a painting problem, such as a lip line
  drawn off the lip edge).
- **Research.** Stylised avatars that keep identity: AgileAvatar (2211.07818), ToonifyGB (2505.10072),
  exemplar-based portrait stylisation (2104.14559), LeGO (2403.15227); the caricature advantage (Rhodes,
  Brennan and Carey 1987); norm-based coding (Leopold et al. 2001, *Nat. Neurosci.* 4); Benson and Perrett
  (1991, abstract read); Lee and Perrett (2009, abstract only); matched appearance of shape and material
  (Zell et al. 2015, *ACM TOG* 34(6)); errors-in-variables correction (standard statistics).
- **Ours.** A direction-in-face-space constraint on stylisation, a matched norm, a perceptually chosen global
  exaggeration that the person may refuse, and measured de-attenuation (novelty **UNVERIFIED**).
- **Defaults.** $s_{max}$ = 0.35 for the painted look (realistic proportions; 0.8 reproduces the earlier
  anime proportions, owner decision D7); $\gamma$ from the pilot, grid {0, 0.05, 0.10, 0.20}; de-attenuation
  off until the second-day captures agree better with it.
- **Fails → fallback.** $s = 0$, $\gamma = 0$.
- **Gate.** Identity cosine ≥ 0.95; at the stylised mouth, PBM reaches inner-lip contact with ≤ 0.3 mm
  penetration on every bench person; asymmetry measured on two halves of the capture agrees (correlation
  ≥ 0.8); S2 at the chosen $(s, \gamma)$; eeriness at the chosen $\gamma$ ≤ at $\gamma = 0$ + 0.5 points.
- **Status.** *Partial*: `stylise_map` in `anime.py`; norm, identity constraint, pilot and de-attenuation
  *to build*.

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
  finger segment (needed for the South Asian count on the phalanges, L78).
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
  used by the arm solver (L77).
- **Method.** Shoulders and wrists use swing–twist decomposition with an elliptical swing cone; elbows and
  finger joints are hinges with ranges; coupling rules for fingers (DIP ≈ ⅔ PIP; ring and little finger
  enslavement). No learned plausibility field: the shippable pose sets are non-commercial and our own
  captures are minutes long; analytic limits, coupling and the swivel cost already exclude impossible
  poses. A hand synergy space (L78) is added only if our consented hand captures are large enough.
- **Research.** Biomechanical limits (2509.06607, 2605.09258); hand synergies (Santello et al. 1998).
- **Ours.** —
- **Defaults.** Elbow 0–150°; MCP −20–90°; PIP 0–110°; DIP 0–80°; wrist flexion −70–80°.
- **Fails → fallback.** Hard clamp.
- **Gate.** S7 (limits after every layer, including the spring layer L82).
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
  numbers the owner can review. The head and neck (≈ 7k vertices) are split into their own skinned
  geometry so the morph texture covers only them (L37). LOD1 comes from MPFB's proxy or one decimation that
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
- **Method.** (0) Start from the existing fit: similarity alignment on the correspondence points and an RBF
  displacement that fades out towards ears, scalp and neck, with damped depth (`fit/apply.py`), ported from
  Blender to numpy. (1) Fixed landmark correspondences (face points → template face vertices, skeleton joints
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
- **Fails → fallback.** The RBF face fit and the skeleton only, body volumes from ratios.
- **Gate.** Face points within 0.5% of eye distance of L17–L24's face; head, neck and body silhouette IoU
  ≥ 0.9; no flipped triangles.
- **Status.** *Partial*: RBF face fit in `scripts/teacher/fit/apply.py` (inside Blender) and array export in
  `scripts/teacher/maker/export_base.py`; numpy port, non-rigid ICP and body fit *to build*.

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
  quaternions do not bulge; the morph data fits in an integrated GPU's memory.
- **In → Out.** 52 face values, joint angles → deformed vertices.
- **Method.** On the GPU, in three.js: the 52 face morphs live **only on the head-and-neck geometry**.
  three.js (r187, the client's version) builds one Float32 RGBA array texture of *all vertices of a geometry*
  × data slots (position, normal, colour) × targets, on the main thread at load: over a 25k-vertex body with
  three slots and 52 targets that is ≈ 62 MB; over the ≈ 7k-vertex head it is ≈ 17 MB. Its morph shader
  skips zero influences, so only active targets cost time. Per-target occlusion (L53) uses the colour slot.
  Then template pose correctives driven by a radial basis of the joint swing angles (keyed on the combined
  clavicle + glenohumeral angle at the shoulder, L77), then a per-vertex blend of linear (LBS) and
  dual-quaternion (DQS) skinning with weight $\alpha$ high near twisting joints and low at bending creases.
- **Research.** Dual-quaternion skinning (Kavan et al. 2008); neural blend shapes (2105.02451);
  pose-dependent deformation distilled for mobile (TaoAvatar 2503.17032); velocity skinning (2104.04934);
  three.js `WebGLMorphtargets.js` and `morphtarget_vertex.glsl.js` (read in the repository's copy).
- **Ours.** —
- **Defaults.** $\alpha$ = 0.8 on the forearm, 0.2 at the elbow crease; 3 correctives per shoulder, 2 per
  elbow, 1 per knuckle row; morph deltas stored sparse (most face units move < 20% of the head) at fp16,
  normals recomputed at load if that is cheaper.
- **Fails → fallback.** LBS, no correctives.
- **Gate.** Volume change at elbows and wrists < 10% and silhouette error at a 90° elbow bend ≥ 20% lower
  than without correctives; morph GPU memory ≤ 20 MB; load-time morph texture build ≤ 150 ms on the
  reference laptop.
- **Status.** *To build* (the lab players skin and morph through three.js today).

#### L38 Levels of detail
- **Purpose.** Hold 30 fps on weak GPUs.
- **In → Out.** Template LODs + the fit → LOD0 and LOD1 positions, the head at full detail in both.
- **Method.** Two LODs are enough. Per person each LOD1 vertex is a fixed barycentric combination of LOD0
  vertices, so the fit carries over with no decimation at build time.
- **Research.** Garland and Heckbert (1997); level-of-detail perception (2501.17085).
- **Ours.** —
- **Defaults.** Switch by measured frame time (L90).
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
  carry, with no field. **Variant, only if the owner allows it (D1):** a band-limited field on the face chart
  (smooth least-squares field, low-passed below $f_c$), checked by L42's band test. The ablation (§8.5)
  reports parametric, parametric plus contrasts, and the field.
- **Research.** Inverse rendering on avatars (2312.05210, 2407.15212); albedo estimation without
  light-skin bias (2205.03962, 2406.13149, 2411.12002); spatial frequencies used in face recognition
  (Näsänen 1999, *Vision Research* 39); pigmentation and identity (Russell, Sinha, Biederman and Nederhouser
  2006, *Perception* 35, abstract read).
- **Ours.** Parametric colour as the shipped model, low information by design.
- **Defaults.** 14 regions; polynomial order 2.
- **Fails → fallback.** One colour per region.
- **Gate.** Mean ΔE₀₀ to measured skin colour (L13) < 3; no region darker than 3σ of its own frames (no
  baked shadows); the three contrasts in the rendered light band within 15% of measured.
- **Status.** *Partial*: colour-point appearance in `splats.py`/`build.py` (fits pixels; replaced by this
  model); `pack.py` measures colours.

#### L41 Region palette, skin tone and shine
- **Purpose.** A painter's palette: a few colours per region, which is what a painting of a face uses, and
  where the skin shines.
- **In → Out.** Colour model → regions (forehead, cheeks, nose, lips, under-eye, chin, neck, ears, hands)
  each with light, half-tone, shadow and terminator colours, a shine level (none/low/high), a subsurface
  tint; Monk Skin Tone class.
- **Method.** Skin tone class by nearest Monk swatch in CIELAB. The light/shadow colours shift hue as a
  painter would (warm lights, cooler, slightly more saturated shadows) by a **table generated from palette
  rules** for all ten Monk classes (hue shift towards cool and saturated in shadow, rim strength by depth),
  with a handful of numbers the owner adjusts and S16 checks (no learned shift, which would need training
  data we do not have; an artist may refine it later). On deep skin the value contrast between bands is low; form is carried
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
- **Status.** *Partial*: Monk class and colours in `pack.py`; generated table *to build*.

#### L42 No-copy guard: information-budget certificate
- **Purpose.** Prove that no photo pixels are on the model, in a way a copy would fail.
- **In → Out.** The `.pbmodel` and the build graph → a certificate listing every photo-derived number
  (name, count, precision, layer) with its total, and a pass/fail report.
- **Method.** (1) **Certificate**: the build graph tags each value derived from photo pixels (as opposed to
  landmarks or masks); the certificate sums them; the budget is fixed in code (parametric colour: a few
  hundred numbers, plus the marks, lid, hairline, mouth-interior and contrast numbers of L22, L46 and
  L40). A copied image cannot fit in the budget. (2) **Painter audit**: the master band set (L51) is
  template data with no person in it; the per-person overlay is painted only from the certificate's numbers
  and our own renders of the fitted template; the audit checks that no photo or photo-derived image is on
  either path. (3) **Patch check** as a sanity test: compare 16×16 patches of the final overlay and of the
  recoloured bands with every source frame's aligned face by NCC, against a threshold calibrated on
  *different* people. (4)
  **Only if the colour field is allowed (D1)**: the v1 test (high-pass both, NCC) cannot fail on a
  low-passed field, so it is replaced by a test in the band 2–6 cycles per eye distance: the field's NCC to
  the person's own aligned faces in that band must not exceed the 99th percentile of its NCC to *other*
  bench people's faces by more than a margin. (5) Clothes and background are never learned (L48).
- **Research.** Nearest-neighbour matching against training images is a common way to audit generative
  models for memorisation (general practice; no single source verified here: **UNVERIFIED**).
- **Ours.** A certificate of what was measured, rather than a test of what was not copied. We did not find
  this as a stated build check in prior avatar work.
- **Defaults.** Budget 800 numbers (parametric colour, contrasts, marks and descriptors); patch NCC
  threshold = 99th percentile of the cross-person distribution on the bench.
- **Fails → fallback.** Drop to one colour per region; if the painter audit fails, the build stops.
- **Gate.** S15 on every build.
- **Status.** *To build*.

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
- **Status.** *Partial*: brow ribbons from landmarks in `anime.py`.

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
  (meniscus) strip along the lower lid and a caruncle at the inner corner. Rotation by gaze angles (L72) with
  pupil size tied to scene brightness.
- **Research.** Eye modelling (Bérard et al. 2014; EyeNeRF 2206.08428); gaze redirection (2411.12981).
- **Ours.** Measured, procedurally painted iris; no iris pixels.
- **Defaults.** Gaze range ±30° horizontal, ±20° vertical; anterior chamber 3 mm.
- **Fails → fallback.** Dark-brown iris.
- **Gate.** Eye-centre fit residual < 0.5 mm; in the facing render the iris is centred on the camera within
  1°; no head-interior pixels visible at ±30° gaze; iris colour ΔE₀₀ < 5 vs. L13; owner judges the
  three-quarter eye "not flat" on 8/8.
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
- **In → Out.** Inner lip ring, jaw, tongue controls (L67) → upper teeth (fixed to the skull), lower teeth
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
  2509.21114). Release 1: four styles (short, side part, long straight, bun); *later*: crop, curls, bob,
  shoulder, long wavy, braid, ponytail, and head coverings (turban, dupatta over the head, hijab, cap). The
  hairline curve (L22) sets the fringe and the scalp edge. Each clump family carries two or three
  **painted highlight shapes** in its UV, used by L52. (2) **Fit**: choose the style and its parameters by
  matching the visual-hull silhouettes of the hair masks in front and three-quarter views (chamfer + IoU),
  parting position from the front view. (3) **Detail**: 10–30 guided ribbons for flyaways and lock edges,
  grown along a smoothed 2D orientation field where views allow; this is optional and never on the critical
  path. Clumps are opaque, with alpha-to-coverage tips (L55), so no transparency sorting is needed.
- **Research.** Hair cards from one image (HairDeck 2610.40599), CGHair (2604.03716); control-point
  hairstyles (CHARM 2509.21114); multi-view strand reconstruction needs dense video and long optimisation
  (Neural Haircut 2306.05872; EfficientMonoHair 2604.05794), so it stays research.
- **Ours.** A pixel-free hair pipeline: only masks, length, parting and colour select and shape owned clumps.
- **Defaults.** 20–40 clumps; 6 segments each; motion by the spring layer (L82).
- **Fails → fallback.** The nearest library style at default parameters for the measured length.
- **Gate.** Hair silhouette IoU ≥ 0.8 in front and three-quarter views; owner judges the style "theirs" on
  ≥ 7/8.
- **Status.** *Partial*: locks from measured length/volume/parting in `make_hair` (`anime.py`); library
  *to build*.

#### L48 Wardrobe and garment fit
- **Purpose.** New clothes (Indian and Western) that fit their body; nothing from the photos.
- **In → Out.** Fitted body + outfit parameters (garment type, colour, sleeve, collar, ease) → garment mesh
  skinned to the same bones.
- **Method.** Garments are MHCLO assets on the template (cages, UVs, fold strokes in the master paint), so
  per person they follow the template fit; parameters set ease, hem height, neckline curve and sleeve
  length. Release 1 starts from the CC0 MPFB clothes packs already licence-checked (`shirts01`, `suits01`,
  …), re-shaded in bands, plus **a kurta modelled by us** on the template, because the brief asks for Indian
  clothes and no CC0 pack has them; *later*: saree with pallu over one shoulder and dupatta (their loose
  parts move with the spring layer, L82), blazer lapels. Skin weights from the template's smoothed shoulder
  weights (L36), so garments do not ride up when an arm is raised; a min-distance constraint keeps cloth
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
hand can enter (D3), and it is cheap to replace. All run-time code is three.js on WebGL2 (one back end).

#### L49 Lighting rig and theme-aware value key
- **Purpose.** The light that makes the painted forms read — a warm key, a cool fill, a coloured rim — and
  a figure that stands out from whatever page is behind her.
- **In → Out.** Site theme (light/dark, accent), the measured luminance of the panel's actual background →
  three lights + ambient, fixed in the panel frame, and a value-key preset.
- **Method.** Key upper-left in front, fill right, rim behind (as `STUDIO` in `twin.py`), with colours from
  the theme palette; the key's direction is fixed relative to the camera so the face never goes dark, and is
  the same for every teacher (one lighting language across the site). The reference drama comes from dark
  surroundings; over a light lesson page or a drawn theme scene a coloured rim vanishes against white and
  saturated cool shadows read as dirt. So the preset is chosen from the **measured** background luminance,
  not the theme name: on light backgrounds a high key (shadow band lifted ≈ 15% in value, the rim turned
  into a darker contact edge in the region's line colour, a reflected bounce taken from the page colour); on
  dark backgrounds full drama.
- **Research.** Studio three-point lighting; theme matching per `docs/ui/premium.md`; the site's twelve
  themes in light and dark (`client/src/theme/styles.ts`).
- **Ours.** Value key chosen from the measured page behind the teacher, with a figure-ground gate.
- **Defaults.** Key 0.85, fill 0.35, rim 0.35, ambient 0.28 (as in `twin.py`).
- **Fails → fallback.** Default palette, fixed key, dark preset over a solid panel.
- **Gate.** Face mean luminance in [0.45, 0.75] for every bench person and theme; S19, with the deep Monk
  groups over light themes as their own cell.
- **Status.** *Exists* in part: `twin.py`; presets and the background measurement *to build*.

#### L50 Shading-normal field
- **Purpose.** Banded shading has no in-between tones, so tiny normal noise becomes a blotch; painted faces
  read through large, simple light shapes that still belong to *this* face.
- **In → Out.** Fitted mesh, template's authored attributes → a per-vertex shading normal and per-vertex
  threshold offsets, baked per person (and per morph target).
- **Method.** Shading normal $= \mathrm{normalize}(\mathrm{lerp}(n_{true}, n_{proxy}, w))$. The proxy is a
  **spectral low-pass of the person's own fitted mesh** (cotangent-Laplacian eigenbasis, cut at ≈ 15 mm), which
  removes noise and pores but keeps cheekbones, brow ridge and jaw: with three bands, the terminator is a
  main carrier of 3D face shape, and a heavily smoothed proxy would make two people with similar palettes
  render alike. An optional **planar snap** (authored strength per region) then pulls the proxy normals towards
  the template's plane segmentation (L33), on shading normals only, never positions, by an as-rigid-as-possible
  normal snap in the spirit of Cubic Stylization; it gives the chiselled planes of the reference look where
  the person's own geometry does not break them. $w$ is authored (≈ 0.6–0.8 on cheeks and forehead, ≈ 0.2
  on the nose bridge and lips). Threshold offsets force areas lit or dark as painters do (under the nose, eye
  sockets, under the lower lip, the neck under the jaw). Morph targets carry shading-normal deltas.
- **Research.** Authored normals and shading thresholds (Motomura, GDC 2015); spectral mesh processing
  (Laplacian eigenbasis, standard); Cubic Stylization (Liu and Jacobson 2019, 1910.02926); planes of the head
  (figure-drawing practice, no paper).
- **Ours.** An identity-keeping proxy from the person's own low frequencies, with optional authored planes.
- **Defaults.** Cut-off 15 mm; planar snap 0.5 on forehead and cheekbone planes, 0 elsewhere (ablation
  §8.5); bake ≈ 2 s.
- **Fails → fallback.** True normals with a wider soft step.
- **Gate.** In a slow head turn and a speech clip, band islands smaller than 1% of the face area: 0; the
  band-boundary map of each bench person differs from the norm face's by ≥ X% of the face area, X chosen on
  the bench.
- **Status.** *To build*.

#### L51 The master band set and the per-person overlay
- **Purpose.** The brushwork and the painted light, on the surface, painted once for everyone, plus the
  few things that are only this person's.
- **In → Out.** (Once, template data) the template's UVs, stroke layout and plane segmentation → the
  **master band set**: per chart, value and hue-shift layers for **light**, **half-tone** and **shadow**
  that share **one stroke-id layer and one stroke geometry** (a painter re-mixes a stroke rather than
  repainting it, so strokes do not "boil" as the terminator moves), a terminator-warmth layer, a brush-edge
  threshold map, a per-region edge-width map, expression **wrinkle layers** (forehead on brow raise, crow's
  feet and nasolabial deepening on smile, glabella on frown, chin dimpling on lip press) with shadow-band
  deltas for jawOpen, eyeSquint and cheekPuff, a focus weight, and the hair clumps' highlight shapes. (Per
  person) the certificate's numbers → a small **overlay** (≈ 256² on the face chart): feature curves (L43),
  brows as stroke clumps, salient marks and freckles kept by the person (L22), facial hair (L32), crease
  curves (L21).
- **Method.** *Master set, default*: generated by our procedural painter (`paint.py`) on the template, with
  stroke orientation following curvature on the body, hair flow on hair and radial directions around eyes
  and mouth; strokes larger in shadow and smaller near features; stroke size, contrast and saturation fall
  away from the face by geodesic distance (the eyes and mouth get the finest strokes, garments and the lower
  torso the broadest; the hands get a second focus while gesturing), because uniform detail is a "3D render"
  tell and pulls the student's eye off the face. Flow-aligned smoothing (anisotropic Kuwahara, LIC) are bake
  tools here. *Master set, painted*: if the procedural set fails the look spike (§8.6), staff paint 4–6 sets in
  Krita (by age band, sex and Monk cluster), owned outright (D3); never painted over frames of the series.
  *Diffusion variant (D9)*: would paint master sets offline, once, from the owned kit only. Each mip level
  is painted from the stroke list (as tonal art maps do) rather than box-filtered; textures are compressed
  with KTX2/Basis UASTC. *Overlay*: painted per person by `paint.py` from numbers only. Against "siblings"
  (everyone painted from the same masters), each person gets a stroke-id seed shuffle within the master's
  layout. The painter never sees a photo (L42 audit). Once an owned style kit exists, a *style distance*
  becomes a machine gate beside the owner's rating (S18).
- **Research.** Painterly rendering for animation (Meier 1996); texture painting in the reference series
  (secondary accounts, **UNVERIFIED**); tonal art maps (Praun, Hoppe, Webb and Finkelstein 2001, cited from
  memory); expression wrinkle maps (Jimenez, Echevarria, Oat and Gutierrez 2011, *GPU Pro 2*); StyleBlit
  (1807.03249) and lit spheres, merged here into the painted master set; SyncMVD (2311.12891), MVPaint
  (2411.02336), Paint3D (2312.13913), TEXTure (2302.01721) for the diffusion variant; anisotropic Kuwahara
  (Kyprianidis et al. 2009) and LIC (Cabral and Leedom 1993) as bake tools; KTX2/Basis Universal (the
  three.js transcoder lists Apache 2.0; upstream text to confirm in L3).
- **Ours.** One painted master set recoloured per person, with a numbers-only overlay; wrinkle layers in the
  paint language.
- **Defaults.** Master set: 512² face chart per layer (1024² if a close-up framing is offered), 256² hands,
  128² elsewhere, ≈ 3 MB once for all teachers; overlay ≈ 0.3 MB per teacher; overlay bake ≈ 2 s.
- **Fails → fallback.** Flat palette bands (no strokes).
- **Gate.** S18 (including sameness at chance); flicker (L55) ≤ the plain shaded render; L42 painter audit
  passes.
- **Status.** *Partial*: offline painter in `paint.py`; master set on the template and the overlay *to build*.

#### L52 Painted shading model (run time), with eyes and hair highlights
- **Purpose.** Light and shadow as painted shapes, not smooth CG gradients, and the two places where
  painted characters are most expressive: eyes and hair.
- **In → Out.** Shading normal (L50), shadow map and occlusion (L53), lights, master band set and overlay
  (L51), palette (L40–L41), face values → shaded colour per pixel.
- **Method.** Band coordinate $d = \mathrm{wrap}(n_s\cdot l) \cdot$ shadow $\cdot$ occlusion + threshold
  offset, then a **broken terminator** $d' = d + a_r\,(T(uv) - 0.5)$ with $T$ the brush-edge threshold map
  and $a_r$ authored per region (large on cheeks and hair, small on nose and lips), locked to the surface so
  it does not swim. The bands are blended with a soft step whose **width is authored per region** (hard for
  cast shadows and under the jaw, soft on the cheek turn and forehead: "lost and found" edges). **Colour** $=
  \mathrm{palette}_{region}(uv, \mathrm{band}) \otimes \mathrm{stroke}(uv, \mathrm{band})$: the region's
  polynomial gradient (L40) is evaluated in the shader and modulated by the master set's value and hue-shift
  layers, with the three contrast features held; then the overlay. Wrinkle layers blend by their face values
  and region masks; the focus weight lowers contrast around the band midpoint away from the face. Shadows are
  cooler and more saturated because they were *painted* so (L41). Specular is a small painted highlight
  shape where L41 says. Rim: $r = (1-n\cdot v)^p \cdot \max(0, n \cdot l_{rim})$, coloured, stronger on deep
  skin per the L41 table, or the contact edge of the light-page preset (L49). **Eyes**: a painted catch-light
  fixed to the key direction, iris shadow under the upper lid driven by lid position, sclera tinted towards
  the skin's shadow colour at the corners, with L44's parallax and limbal darkening. **Hair**: the clump's
  painted highlight shapes, switched on by the band coordinate and shifted along the clump tangent by the
  half-vector (an analytic Kajiya–Kay lobe reads as a CG "shampoo" sheen). **Option (untested, off):
  stroke-quantised band choice**: a small UV-space pass (256²) renders the deformed shading normal; each
  texel's stroke-id points to its stroke centre, where $d'$ and the shadow are sampled, so a whole stroke is
  light or shadow and the terminator advances stroke by stroke; a 2–3-frame hysteresis crossfade per stroke
  (a ping-pong 256² state texture) stops flicker at the threshold. Strokes must not cross UV seams (the
  layout is authored, L33).
- **Research.** Cool-to-warm shading (Gooch et al. 1998); locally controllable stylised shading (Todo,
  Anjyo, Baxter and Igarashi 2007, *ACM TOG* 26(3)); Shading Rig (Petikam, Anjyo and Rhee 2021, *ACM TOG*,
  10.1145/3461696); toon/cel shading (the lab `toon.js`); real-time strand rendering (2405.10565, ideas).
- **Ours.** Run-time recolouring of a shared painted master set by measured colour numbers, chosen by a
  stabilised normal with broken, per-region edges; stroke-quantised choice (untested; we found no
  published version).
- **Defaults.** 3 bands on skin, 2 on hair and cloth; rim power 4; catch-light radius 12% of iris; band
  choice per pixel.
- **Fails → fallback.** Two-tone toon shading (current `toon.js`).
- **Gate.** S18; form readable per Monk group over light and dark backgrounds (owner's check on the bench);
  catch-light visible in both eyes in 100% of frames with gaze within ±20°; the stroke-quantised option
  only if its flicker ≤ the per-pixel version.
- **Status.** *Partial*: MToon-based lab shader and matcap highlights in `player/toon.js`; band
  recolouring *to build*.

#### L53 Key-light cast shadow and baked occlusion
- **Purpose.** Readability in the reference look comes from cast shadows (hair on the forehead, nose on the
  cheek, chin on the neck, the pointing hand on the chest) and darkened eye sockets and under-chin areas.
- **In → Out.** Deformed meshes, key light → a stylised shadow term; per-vertex occlusion.
- **Method.** One 1024² shadow map for the key light covering head, hair and hands; hard-edged, sampled with
  a small fixed kernel, and fed into the band coordinate (so a shadow selects the painted shadow band,
  tinted by the region's palette; its edge is "hard" in L52's edge map). Per-vertex ambient occlusion baked
  at build time on the rest pose and, for the head geometry only, on each of the 52 targets, interpolated
  with the morphs (the colour slot of L37). Painted rest-pose shadow strokes in the wrong place on a wide
  "aah" or squint are corrected by the wrinkle layers' shadow-band deltas (L51).
- **Research.** Shadow mapping and baked occlusion (standard real-time practice).
- **Ours.** —
- **Defaults.** 1024² map; ~25k shadow-casting triangles.
- **Fails → fallback.** Occlusion only (tier "basic").
- **Gate.** GPU time ≤ 1.2 ms on the reference laptop (estimate 0.8–1.2 ms, **UNVERIFIED** until the spike,
  §8.6); no shadow acne in the head-turn clip.
- **Status.** *To build*.

#### L54 Lines
- **Purpose.** Sparse, freehand-looking feature lines: lash line, upper-lid crease, lip parting line,
  nostril, ear inner fold, fingernails and finger separation, creases (L21), and where a hand crosses the body.
- **In → Out.** Deformed meshes, authored line controls, feature curves → line layer.
- **Method.** **No silhouette outline by default**: a constant-width inverted hull around the whole figure is
  the cel and anime signature that the brief replaced; the silhouette is separated by value, rim and the
  contact edge (L49). Feature curves (L43, L21, L22) are drawn as textured ribbons in the region's darkest
  paint colour, with jittered width whose weight follows the light and the expression; interior contours
  where a hand crosses the body come from the 8-bit id target (L56). The inverted hull stays as a theme
  option. WebGL2 only.
- **Research.** Line drawings from 3D models (1810.01175); line control in stylised 3D (Motomura 2015);
  XDoG (Winnemöller et al. 2012) as used offline in `paint.py`; accounts of hand-made, shaky lines in the
  reference look come only from recreation write-ups (**UNVERIFIED** for the series itself).
- **Ours.** Expression-driven crease lines from measured curves.
- **Defaults.** Line colour = darkest palette colour of the region, never black; hull off.
- **Fails → fallback.** Id edges only.
- **Gate.** No line flicker (L55) and lines present on all named features in every bench render.
- **Status.** *Partial*: offline lines in `paint.py`; outline in `toon.js`.

#### L55 Anti-aliasing and temporal stability
- **Purpose.** Banded edges and thin dark lines alias badly at 720p; nothing may crawl or flicker.
- **In → Out.** The forward pass → an anti-aliased, stable frame.
- **Method.** 4× MSAA in the forward pass (WebGL2 multisampled renderbuffers, then a blit), alpha-to-coverage
  for hair tips and lash edges (no sorting); a cheap morphological AA on the "basic" tier. Because the paint
  is on the surface, temporal reprojection is **off** (without sub-pixel jitter it only smears a fast mouth),
  so no velocity target is rendered.
- **Research.** Temporal coherence in stylised animation (Bénard, Thollot, Collomosse, CGF 2011, cited from
  memory); temporal anti-aliasing practice.
- **Ours.** —
- **Defaults.** MSAA 4×; TAA off.
- **Fails → fallback.** MSAA 2× or morphological AA.
- **Gate.** Edge-crawl and flicker metrics (mean absolute frame difference after motion compensation) on a
  slow head-turn clip ≤ 1.5× the plain shaded render.
- **Status.** *To build*.

#### L56 Render graph
- **Purpose.** Do all of the above within the frame budget of an integrated GPU, which is limited by
  memory bandwidth, with one back end that the build worker can also run.
- **In → Out.** Deformed meshes → shadow pass → forward MSAA pass (colour + one 8-bit id target) → line
  pass → composite.
- **Method.** three.js (r187, already a client dependency) on **WebGL2 only**: the band shading through
  `ShaderMaterial` or `onBeforeCompile`; pass 1 shadow map; pass 2 forward shading of body, garments, hair
  and eyes; pass 3 lines; pass 4 composite with premultiplied alpha. No G-buffer, no half-resolution filter
  pass, no velocity target, no WebGPU path (two back ends would double the shader and test work for a small
  team; WebGPU returns only if S14 fails). **Render scale**: the internal resolution is capped at 720 physical
  pixels tall whatever the device pixel ratio (a "720p panel" at DPR 2 is 4× the fragments and MSAA memory),
  then upscaled; the painted look tolerates it. The **same player** renders the build's gate frames headless
  on the worker (L92).
- **Research.** Skinned Gaussian avatars on the web run 40–50 fps on a phone and 240 fps on a laptop GPU
  (2510.13978), which bounds what a mesh pipeline should reach.
- **Ours.** —
- **Defaults.** 720p panel; DPR cap as above.
- **Fails → fallback.** Drop passes by tier (L90).
- **Gate.** S14.
- **Status.** *Partial*: three.js lab players with a frame-exact `renderAt(t)` in
  `scripts/teacher/maker/player/`.

#### L57 Compositing, transparency, the AI label and the provenance cue
- **Purpose.** The person only, over the lesson, always labelled, and the student always knows *whose words*
  they are hearing.
- **In → Out.** Frame, the clause's provenance (L87) → premultiplied RGBA in the panel, a visible
  "AI-generated" badge, and a quiet provenance cue.
- **Method.** Alpha from MSAA coverage, premultiplied before any pass reads neighbours (otherwise the
  lesson background bleeds dark fringes into hair edges); a soft edge of 1 px. The label is part of the
  panel UI and cannot be hidden by the page. **Provenance cue**: a generic label does not stop students
  believing *their teacher* said what Guru said (in a 2026 survey nearly half of 170 CS students could not
  tell that videos were AI-made, 2607.28203), so each utterance carries one of two quiet cues: "recorded
  lesson" (narration the teacher approved at publish time) or "AI answer in [name]'s voice" (a live reply).
  Recorded lesson clips carry the label burned in; the audio carries AudioSeal (L63). An invisible frame
  watermark that survives re-encoding is a research project and is *later*.
- **Research.** Students and AI-made instructional video (2607.28203, 2602.18457); audio-visual
  watermarking (LAVA 2604.23957; cross-modal 2507.12723, ideas).
- **Ours.** Label and per-utterance provenance enforced in the player component.
- **Defaults.** Badge always on; cue on every utterance.
- **Fails → fallback.** Player refuses to render without the label component.
- **Gate.** 100% of rendered frames and exported clips carry the label; S20; no dark fringe on hair over a
  white lesson background.
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
  whole clause is synthesised in one call (L60) instead of being stitched from language spans.
  **Accommodation**: she mirrors the student's code-mixing ratio and script, measured over the last three
  turns (Latin-script Hinglish typed means Hinglish spoken); technical terms stay in English (`array`,
  `pointer`, `mid`) even inside Hindi sentences, as Indian CS teachers do, and Hindi carries rapport and
  encouragement. The target code-mixing index goes into Guru's prompt (L87) and a validator checks each
  clause's index within ±0.15 of the target.
- **Research.** Code-mixed TTS (2409.10969, 2412.19043); script-first multilingual TTS (2510.25178);
  Hindi–English code-switching corpus (1810.00662); code-mixing index (2410.11079); classroom code-switching
  in India does teaching and rapport work (Pallavi 2016, *J. Indian Education* 42(1); Adinolfi, Open
  University, on low-cost English-medium schools).
- **Ours.** Code- and maths-aware normalisation from our lesson vocabulary.
- **Defaults.** English unless a span is classified Hindi with p ≥ 0.7; a clause's language is its
  dominant span language.
- **Fails → fallback.** English pronunciation.
- **Gate.** Round trip: ASR of the synthesised Hinglish set has character error rate ≤ 15%; in the study,
  "she spoke the way I speak" ≥ 5/7.
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
- **Method.** Zero-shot cloning with Chatterbox Multilingual (MIT; Hindi among its 23 languages), using the
  dedicated Hindi checkpoint (`Chatterbox-Multilingual-hi`, MIT per its model card) for Hindi clauses. The
  project is archived ("retired research, no longer maintained", README, August 2026), so the weights and
  code are vendored and pinned by hash (L3), and a maintained second engine sits behind the same slot
  interface (CosyVoice, once its checkpoint licence is confirmed). One clause per call (no stitched
  Hinglish: pitch and energy reset at joins); reference in the clause's language, and with only a
  cross-language reference, the reference-adherence weight (`cfg_weight`) set to 0 as the README advises.
  Arousal (L69) maps to the model's `exaggeration` (0.3–0.7), paired with a lower `cfg_weight` because
  exaggeration speeds speech. Optional per-person adapter from 30–60 min of their reading, trained after
  the build (not in the 4-minute budget).
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
- **Gate.** Speaker similarity (ECAPA-TDNN cosine, check-only, 2005.07143) between synthesis and held-out
  real speech ≥ 0.75 × the real-vs-real ceiling; intelligibility by ASR round trip (WER ≤ 8% English, CER ≤
  12% Hindi); F0 jump at clause joins < 2 semitones; MOS ≥ 3.8 in the listening test.
- **Status.** *Partial*: HeadTTS fixed voices in use (`perform.py`); cloning *to build* on the GPU worker.

#### L61 Spoken-phone alignment and prosody
- **Purpose.** The exact phones the voice *actually spoke*, with their times, plus stress, pitch and
  pauses — the clock and the content of the lips. The audio is the single truth.
- **In → Out.** Audio + the L59 lattice → `[(ipa, t0, t1)]` on the chosen path; per-syllable pitch (z-scored
  to the speaker), energy, duration, stress flag, phrase boundaries, pause lengths.
- **Method.** A CTC phone recogniser over IPA scores every lattice path; Viterbi picks the path and the
  boundaries; the chosen path, not the G2P string, drives L64–L67. It runs on every clause (Chatterbox
  exposes no durations), on streaming chunks. If alignment confidence is low, closure times are taken from
  acoustics (a stop gap or a nasal murmur on energy and spectrum), never from uniform durations. The same
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
- **Gate.** Median boundary error ≤ 20 ms on a hand-labelled 200-phone set per language; logged rate of
  must-hit events where lattice choice and acoustics disagree; stress agreement with a hand-labelled set
  ≥ 80%.
- **Status.** *Partial*: HeadTTS gives timings; `lipsync/prosody.py` computes prosody; lattice aligner on
  the shipped recogniser and MFA models *to build*.

#### L62 Personal phrase bank
- **Purpose.** Backchannels and latency fillers need about zero synthesis latency.
- **In → Out.** The person's voice reference → 30–60 short items in their cloned voice, each in 2–3 prosodic
  variants (haan, achha, hmm, theek hai, dekho, ek second, bolo, sahi, "let's see", "good question", safe
  canned hints for L87), with aligned phones, prosody and precomputed mouth and head motion.
- **Method.** Synthesised through L60–L68 **after the model is signed** (the cloned multilingual model is
  autoregressive; at about 1 s per clip, run one after another, 80 clips take about 80 s, **UNVERIFIED**), so
  it never holds up S13; the bank streams to the browser when ready, and until then backchannels are visual
  only. Items chosen at run time by L86 and L89 by context and variant rotation (no repeat within 30 s).
- **Research.** Latency hiding in streaming digital-human agents (2608.24909).
- **Ours.** A per-person bank in the cloned voice, with its motion baked.
- **Defaults.** 40 items × 2 variants; ≤ 2 MB, streamed after the model.
- **Fails → fallback.** Visual-only backchannels.
- **Gate.** Every item passes L60's speaker and intelligibility gates and S3–S4.
- **Status.** *To build*.

#### L63 Audio watermark and provenance
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

### Stage H: Lips, face performance and attention (L64–L73)

Stage H's mouth path (L64–L68) runs on the server next to the voice and ships 52 values plus must-hit events
with each audio chunk; the browser only mixes and holds closures (L83, L90). The face layers L69–L72 and the
attention layer L73 run in the browser worker.

#### L64 Phones to visemes
- **Purpose.** One articulation table for every language.
- **In → Out.** IPA phone (as realised, L61) → viseme class and mouth targets on the 52 values.
- **Method.** 12 classes by articulation: PBM (lips closed), FV (lower lip to upper teeth), TH, TD
  (dental, alveolar and retroflex stops share it; the difference is barely visible from outside and lives
  only in the tongue, L67), SH (lips forward), KG, EE, AA, OH, OO, W, silence; targets as in `phonemes.py`.
  Aspirated stops get a longer release; [ʋ] maps to FV only when realised with lip–teeth contact.
- **Research.** Viseme classes (Fisher 1968); VisemeNet (1805.09488); viseme dynamics (2301.06059);
  multilingual lip-sync data (2406.14272).
- **Ours.** A single table for all languages with Hindi additions (exists).
- **Defaults.** As in `phonemes.py`, with RETRO merged into TD.
- **Fails → fallback.** Unknown phone → nearest class by articulatory features.
- **Gate.** All IPA phones in the test set map to a class (exists: `test_every_language_sound_has_a_mouth`).
- **Status.** *Exists*: `scripts/pratibimb/engine/phonemes.py` (RETRO merge *to do*).

#### L65 Coarticulation as a constrained trajectory
- **Purpose.** Each sound's mouth shape blends with its neighbours, as in real speech, and the closures
  viewers watch most can never be missed or kinked.
- **In → Out.** Viseme timeline (with must-hit intervals) → smooth trajectories of each mouth value.
- **Method.** Per clause and per mouth value, a small banded quadratic programme:
  minimise $\sum_t \sum_i w_i(t)\,(x_t - T_i)^2 + \lambda \sum_t (\Delta^3 x_t)^2$, with **equality
  constraints** at must-hit frames (PBM closure, FV contact, held for at least max(acoustic closure, 1.5
  frames)) and bounds from the person's range (L66). Lip rounding has a low weight over a wide window
  (anticipatory rounding before /u/). Dominance functions (Cohen and Massaro 1993) give the weights $w_i$.
  **Personal coarticulation (untested):** per viseme class four parameters (target scale, spread window,
  closure hold, lead) are fitted to the person's capture speech by minimising the replay error of L68; 12 × 4
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

#### L66 Jaw–lip split and personal mouth range
- **Purpose.** Loud speech opens the jaw, not the lips; each person's mouth opens to their own extent.
- **In → Out.** Trajectories + loudness + motion profile → jawOpen and lip values separately, scaled.
- **Method.** Two independent controls per frame as in JALI: jaw $j(t)$ scales with the vowel's openness
  and the syllable's loudness; lip intensity $l(t)$ with articulation clarity. Then scale each class by
  the person's measured range (L16): $x \leftarrow x \cdot r_{class}^{person}/r_{class}^{pop}$. These
  ranges are the bounds of L65's programme.
- **Research.** JALI (Edwards et al. 2016); speech–lip intensity correlation (SLCC in 2503.20308).
- **Ours.** Per-class personal range from their own speech.
- **Defaults.** Jaw gain 0.6–1.2 with loudness.
- **Fails → fallback.** Population range.
- **Gate.** S6; SLCC on held-out speech ≥ the value of the person's own video (2503.20308 metric).
- **Status.** *To build* (global gains exist in the lip-sync slot).

#### L67 Tongue and teeth visibility control
- **Purpose.** Drive L46's tongue and decide teeth visibility from the sounds.
- **In → Out.** Phones → tongue pose weights, teeth-show weight.
- **Method.** Tongue poses keyed by class (TD → tip up, retroflex phones → tip curled inside the mouth,
  TH → between teeth, KG → back up) with the same trajectory solve as L65; teeth-show = smooth function of
  inner-lip separation and FV/EE.
- **Research.** Articulatory models (2507.20343, 2408.05641).
- **Ours.** Retroflex tongue for Indian languages (no visual claim outside the mouth).
- **Defaults.** —
- **Fails → fallback.** Tongue at rest.
- **Gate.** Tongue visible on 100% of θ/ð and ≥ 80% of l in close-up; teeth never visible with closed lips.
- **Status.** *To build*.

#### L68 Learned lip refiner and the replay gate
- **Purpose.** Rules get the important events right; a learned model adds the natural in-between motion;
  a replay of the person's own speech proves the whole mouth path.
- **In → Out.** Audio (16 kHz) + constrained trajectories → refined 52 values at 30 fps (on the server, sent
  with each audio chunk); a replay report.
- **Method.** An audio-to-expression network (default: wav2arkit, Apache-2.0; our fine-tune on consented
  Hindi/English video is *later*, since no such video exists yet) predicts values; fusion by a per-value weight (rules dominate closure and
  contact values, the network dominates cheeks, mouth corners and press); must-hit constraints are re-applied
  after fusion by re-solving L65 with the fused values as targets. **Replay gate**: each bench person's own
  5-minute reading (L0) is fed through L61–L68 and compared frame by frame with the 52 values MediaPipe
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

#### L69 Emotion layer (face and body)
- **Purpose.** Readable emotions that match what she says, in the face and in how she moves.
- **In → Out.** Script tags `{valence, arousal}` + discrete cue (pleased, curious, empathetic, encouraging,
  thinking, surprised) → expression offsets on non-mouth values; body scalars (gesture tempo, amplitude,
  frequency, expansiveness, head height); voice style hints (L60).
- **Method.** Each discrete cue is a small set of action units (e.g., pleased = cheekSquint + mouthSmile
  at 0.3–0.6; empathetic = browInnerUp 0.4 + a soft smile 0.2; encouraging = mouthSmile 0.3 + a slight
  forward lean). *Empathetic* is used only on empathy clauses in her own speech ("this part is hard"), never
  as a reaction to the student; *encouraging* is the face for errors and confusion (L86). Intensity stays
  moderate in content clauses; peaks (surprise, delight) are kept for "aha" moments. Learners do better with
  instructors who show positive emotion, an effect seen on a delayed test (Lawson, Mayer et al. 2021, *ETR&D*,
  doi 10.1007/s11423-021-10057-w). Continuous valence/arousal interpolate between
  them; mouth values from the cue are limited during speech so lip sync wins (mixer, L83). Arousal scales
  gesture velocity, amplitude and frequency (L79); valence scales expansiveness (open vs. closed postures,
  head up vs. down, L81); both are multiplied with the personal style scalars (L83).
- **Research.** Continuous valence–arousal control (CETalk 2608.15110); AU-controlled emotional heads
  (2602.09534); the positivity principle for instructors (Lawson et al. 2021); verbal–nonverbal mismatch for
  training agents (2608.22731); LLM interpretation of
  valence–arousal (2502.06875); Laban Effort mappings for agents (EMOTE, Chi et al. 2000; citation details
  **UNVERIFIED**).
- **Ours.** Emotion intensity scaled by the person's own expressiveness (smile and brow share from L16).
- **Defaults.** Emotion decay 1.5 s unless refreshed.
- **Fails → fallback.** Neutral-pleasant.
- **Gate.** Observers recognise the 6 cues from silent clips ≥ 65% (chance ≈ 17%), with the face and with
  the face blurred (body only) reported separately.
- **Status.** *To build*.

#### L70 Blinks, brows and micro-motion
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

#### L71 Head motion
- **Purpose.** Nods, tilts and turns that follow speech and listening.
- **In → Out.** Prosody, turn state, gaze target → head yaw/pitch/roll.
- **Method.** Nods (pitch dips) on stressed syllables and at affirmations; slow drift from an
  Ornstein–Uhlenbeck process with the person's measured head speed and range; for gaze shifts the eyes
  start first (or together) and land first, the head continues and the eyes counter-rotate (L72); the
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

#### L72 Gaze
- **Purpose.** Look at the student, at the board element being discussed, or away while thinking — and
  keep looking at the student while the head moves.
- **In → Out.** Script gaze tag, lesson target position (L76), turn state, mixed head pose → eye angles.
- **Method.** A small state machine: *student* (camera) while asking and listening; *board* at the target
  element when pointing or referring, and on the active element while a lesson step animates (L73);
  *chat* (a glance down to the chat box) while the student is typing, then an attentive waiting pose and no
  speech over a typing student; following the student's own stepping of the animation; *away* (up-left or down) briefly when "thinking" or at the start of
  a long answer (gaze aversion), returning before the key point; saccades between targets with
  main-sequence velocity; micro-saccades during fixation. **Vestibulo-ocular stabilisation**: eye angles are
  computed in world space from the gaze target *after* the head pose is mixed, so the eyes counter-rotate
  during every nod, tilt and drift and mutual gaze holds.
- **Research.** Gaze in conversation (Kendon 1967); speech-driven gaze (TalkingEyes 2501.09921); expressive
  gaze dynamics (2610.19635); turn-level interactive heads (2512.15340); spatially aware agents (SARAH
  2602.18432).
- **Ours.** Gaze that knows the lesson's element positions.
- **Defaults.** Mutual gaze 60–70% of speaking time **only while nothing on the board moves**.
- **Fails → fallback.** Student gaze with idle saccades.
- **Gate.** Gaze lands within 2° of the target element's centre within 250 ms of the cue; during fixation
  the gaze direction error stays < 1° while the head moves.
- **Status.** *To build*.

#### L73 Attention sharing beside a moving lesson
- **Purpose.** An on-screen instructor competes with the board for the student's eyes; while the lesson
  moves, she should send attention to it, not pull it to herself.
- **In → Out.** The lesson player's step events (`lesson_moving`, the active element id, published for L76),
  turn state → gaze mode for L72, an amplitude scalar for gestures and idle (L83), allowed gesture classes
  for L75.
- **Method.** While a lesson step animates she uses **fixed guided gaze**: eyes and head stay on the active
  element; gestures are limited to deixis at that element; beat and idle amplitude drop by about 60%; blinks
  and micro-motion stay on (she is never frozen). Direct gaze to the student returns between steps and when
  she asks a question. The policy is a rule on existing inputs, no model.
- **Research.** On-screen instructors compete with the board for attention (Stull, Fiorella and Mayer
  2018, *Comput. Hum. Behav.* 88); a meta-analysis reports that instructor guided gaze helps learning
  (g ≈ 0.33) and fixed guided gaze more than shifting gaze (g ≈ 0.57 vs. 0.27) (Kuang, Wang, Xie, Mayer and
  Hu 2023, *Educ. Psychol. Rev.* 35(4); figures from the abstract, **UNVERIFIED** against the full text);
  agent gesture and near transfer (Davis 2018, g = 0.39, secondary source).
- **Ours.** Gaze and gesture budget driven by the live step events of our own lesson animations.
- **Defaults.** Amplitude 0.4 during steps; return to the student 300 ms after a step ends.
- **Fails → fallback.** L72's default state machine.
- **Gate.** In clips of animated steps, gaze on the active element ≥ 90% of step time; ablation (§8.5):
  quiz score with the layer on ≥ off.
- **Status.** *To build* (step events exist in the lesson engine).

---

### Stage I: Physical actions of the upper body (L74–L83)

The aim is "every physical thing a person does with the upper body", without an animation library and
without an animator (contradiction C2). Actions are **goal programs**, solved every frame along task-space
paths, not once per key pose: most "robotic avatar" failures happen *between* key poses, so every Stage I
gate is measured on every frame of the trajectory at 30 fps.

#### L74 Action language
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
  line to target, L76)`, `shape(point)`, `look(target)`. A new action is a new expansion entry, no code.
  **Teacher-role and cultural rules**: the index finger never points at the student (the camera); pointing
  is for content, and towards the student she uses an open palm; offering, giving and counting use the
  right hand or both hands (giving with the left hand is frowned upon); a head shake is for content ("no,
  not this one"), never a reaction to a student's answer (L86).
- **Research.** Intention-aware hierarchical motion (2506.01563); LLM-driven pedagogical expression
  (2603.09536); behaviour markup traditions (BML, Kopp et al. 2006); Indian etiquette guides (Eccles School,
  University of Utah; SBS Cultural Atlas: weak sources, hence the rater gate).
- **Ours.** Actions as goals over primitives, validated against limits before they run.
- **Defaults.** About 20 named actions at launch: namaste, point, count 1–5 (with the finger and phalanx
  styles), open palms, beat, wave, thumbs up, shrug, think (hand to chin), hand on chest, lean in, lean back,
  nod, shake, "this much" (two hands apart), emphasise (chop), offer (palm up), stop (palm out), welcome,
  look-at-board, okay-sign. Left out: hands on hips and crossed arms (they read as dominance or a closed
  posture for a teacher), come-closer (sources disagree on palm-up beckoning in India), and clap,
  write-in-air, rub hands and steeple (little teaching value, extra hand-contact risk for S7); "number on
  fingers" is the same as count.
- **Fails → fallback.** Unknown or invalid action → nearest named action or none, logged.
- **Gate.** Every action parses and expands; every expansion solvable (L77) for all 8 bench bodies;
  two-hand actions: palm gap ≤ 5 mm and no interpenetration on every frame; before an action ships, Indian
  student raters from at least 3 regions rate it "appropriate for my teacher" ≥ 4/5 (thumbs up and okay-sign
  included).
- **Status.** *Partial*: four hand-posed gestures in `body.py` (`gesture`); language *to build*.

#### L75 Gesture planner
- **Purpose.** Decide which gesture, with which hand, when — including gestures nobody writes in the
  script (beats, open palms) — and keep them inside the frame.
- **In → Out.** Sentence, word times, prosody, explicit action tags, the person's gesture rate, the camera
  frame → a gesture schedule `[act, start, apex, end, strength]`.
- **Method.** Explicit tags first (namaste, point at, count): Guru (L87) already writes `gesture` fields,
  and LLM gesture selection is published and works. Then rules add beats and metaphoric gestures (open
  palms, "this much", offer) on stressed words: word class, stress, position in phrase, cue words
  ("first/second" → count, "this/here/look" → point, "big/small" → size); constraints: one gesture per phrase
  on average, rest between gestures ≥ 300 ms, rate matched to the person's measured gesture rate (L16) and
  scaled by arousal (L69). **Framing**: the panel is waist-up and fixed, so hand targets carry the camera
  frustum minus a safe margin as a soft constraint, default gesture height is slightly above real life (as
  presenters do), and beats and counts are planned at chest height, never below the crop. While the lesson
  moves, only deixis is allowed (L73). **Phone tier** (panel ≤ 480 px, L90): she is a head-and-shoulders
  picture-in-picture, so arm deixis is replaced by gaze plus a highlight request to the lesson player (L76's
  disambiguator). No learned scorer until our own commercial-OK gesture data exists.
- **Research.** LLM gesture selection (2503.14408); semantic co-speech gestures (SemTalk 2412.16563;
  SemConFlow 2603.26553; SARGes 2503.20202); labelling sentences with deictic gestures (2407.02151);
  gesture space (McNeill 1992); review of data-driven gesture generation (2301.05339).
- **Ours.** The planner outputs goal programs, not motion, so any gesture it picks is physically solved.
- **Defaults.** Rules plus LLM tags.
- **Fails → fallback.** Beats on stressed words only.
- **Gate.** Appropriateness rating (GENEA-style, §8.4) ≥ the rule baseline; no two apexes < 300 ms apart;
  hands visible on ≥ 95% of stroke frames and never clipped by the frame edge mid-stroke.
- **Status.** *Partial*: word rules in `perform.py`; gesture slot in `slots.json`.

#### L76 Target resolution: lesson element to 3D point, for the observer
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

#### L77 Arm solver: analytic IK with shoulder girdle and torso
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

#### L78 Hand shapes
- **Purpose.** Natural hands for every named shape and for the in-between.
- **In → Out.** Shape name or count → 20 finger joint angles per hand.
- **Method.** Named shapes as joint-angle sets (point, count 1–5 in the Indian styles — fingers raised, or
  the thumb touching the phalanges — and the Western style as a setting, open, flat, relaxed, fist, OK,
  thumbs up, pinch, steeple); in-between shapes interpolate with finger coupling (DIP ≈ ⅔ PIP) applied, in a
  synergy space (PCA of our consented hand captures) only if those captures are large enough; relaxed
  hands curl a little more on the ulnar side. At 720p a hand is about 60–90 px tall, so shapes are judged as
  rendered, painted silhouettes. The synergy space is *later*.
- **Research.** Hand synergies (Santello et al. 1998); hand motion completion with priors (2607.05938);
  biomechanical finger tracking (2605.09258).
- **Ours.** Counting style as a setting, learned from the person's own counting frames when captured
  (which styles to offer is to be checked with teachers: **UNVERIFIED**).
- **Defaults.** Relaxed shape between gestures.
- **Fails → fallback.** Relaxed hand.
- **Gate.** Every named shape within L30's limits; observers identify counts 1–5 from rendered, painted
  clips ≥ 95%.
- **Status.** *Partial*: point and count curls in `body.py`.

#### L79 Trajectories and gesture phases
- **Purpose.** Gestures that look human: preparation, stroke, hold, retraction, with the apex on the word,
  and hands that travel like hands.
- **In → Out.** Gesture schedule + goals → per-frame hand goals (task space) and finger shapes over time.
- **Method.** Human reaching is roughly straight in hand space with a bell-shaped speed profile, so the
  wrist/fingertip path is planned in **task space** (minimum jerk), with a via-point that keeps clearance
  from the torso capsules; L77 solves it every frame. Duration from distance and precision (Fitts-like:
  precise pointing gets a longer deceleration tail). The stroke **apex** (maximum extension, velocity
  minimum) is placed on the pitch-accented vowel (L61) within ±60 ms, and the stroke onset is solved
  backwards from the stroke duration; apexes are also aligned with energy peaks of our own audio, which is
  physically consistent with how gesture impulses shape speech. Fingers move in their shape space;
  consecutive gestures co-articulate (skip retraction when the next preparation starts within 400 ms) and
  gesture units return to a rest pose (L81) only at unit ends.
- **Research.** Gesture phases (McNeill 1992; Kita et al. 1998); minimum-jerk motion (Flash and Hogan 1985);
  apex–prosody alignment (Leonard and Cummins 2011; spread from Pouw and Dixon 2019 as summarised in citing
  work, exact numbers **UNVERIFIED**); gesture–speech physics (Pouw, Paxton, Harrison, Dixon 2020, *PNAS*
  117(21)); streaming gesture generation (GestureFAR 2609.21576; LiveGesture 2604.10927).
- **Ours.** —
- **Defaults.** Hold 150–400 ms.
- **Fails → fallback.** Joint-space blends with ease-in/out.
- **Gate.** |apex − accent| ≤ 100 ms in 95% of beats.
- **Status.** *Partial*: ease in/out in `perform.py`.

#### L80 Self-collision avoidance
- **Purpose.** Hands never pass through the body, the other hand or the face, on any frame.
- **In → Out.** Per-frame pose and its predecessor → corrected pose.
- **Method.** Capsules for torso, neck, head, upper arms, forearms, palms and finger segments (≈ 40);
  tested as **swept** capsules between consecutive frames (continuous collision); on contact the hand goal
  is pushed out along the separating normal and L77 re-solves; `touch` and `join` goals use a 5 mm contact
  offset.
- **Research.** Physics-based interaction priors (2609.06591) for ideas; capsule collision practice.
- **Ours.** —
- **Defaults.** 3 resolve iterations.
- **Fails → fallback.** Abort the gesture and return to the rest pose.
- **Gate.** S7: 0 penetrations deeper than 2 mm on every frame of the library × 8 bodies.
- **Status.** *To build*.

#### L81 Rest poses, idle life and breathing
- **Purpose.** Alive while listening or waiting; never frozen; never "floating".
- **In → Out.** Time, turn state, speech plan → rest pose, breathing, sway, discrete adjustments.
- **Method.** **Rest poses**: 3–4 home poses (hands loosely clasped at the waist, one hand on the other
  wrist, arms down and relaxed, a hand resting on the desk edge), chosen per person from L16; switched only
  at turn boundaries. **Breathing while speaking** follows the speech plan: a fast chest and shoulder rise
  (≈ 0.3–0.6 s) in the pause before each phrase, scaled by the next phrase's length, then a slow linear fall
  through the phrase; **quiet breathing** (≈ 4 s period, about 40/60 in/out) only while listening or idle;
  coordinated with any audible breaths the voice produces. **Sway**: a slow (≈ 0.1–0.3 Hz), small lateral
  shift visible as a shoulder-line tilt with a head counter-roll. Hands hold still apart from the spring
  layer (L82) and the breathing passed through the chest; occasional discrete self-adjustments (shoulder
  roll, re-clasp, solved with `join`) at turn boundaries. Noise remains only on the head (L71) and brows
  (L70).
- **Research.** Speech breathing (Winkworth et al., *JSHR* 1994/1995; the year varies across citations,
  **UNVERIFIED** which); gesture units (Kendon); listening behaviour (2409.20188, 2112.13548).
- **Ours.** Breaths placed by the speech plan; rest poses from the person's own video.
- **Defaults.** Breathing amplitude 4 mm at the sternum.
- **Fails → fallback.** Arms-down rest with quiet breathing.
- **Gate.** No interval > 2 s with all joint velocities below 0.2°/s; inhalation onsets in pauses ≥ 95%.
- **Status.** *To build*.

#### L82 Secondary dynamics and spring chains (body, hair, loose garments)
- **Purpose.** Real arms overshoot slightly, wrists and fingers lag the forearm on fast strokes, the head
  settles after a nod, hair sways a little, and a dupatta or pallu moves; a purely kinematic figure looks
  robotic. One spring solver does all of it.
- **In → Out.** Mixed pose (L83), head and chest motion → filtered joint rotations; hair-clump spine poses;
  loose-garment chain poses.
- **Method.** One second-order (spring–damper) follow of a rest orientation, used three ways: (1) per body
  joint on the mixed rotations, higher frequency and near-critical damping near the root, lower frequency and
  more damping at wrist and fingers, clamped to L30's limits *after* filtering; (2) per hair clump, a spine of
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
- **Gate.** No added limit violations; apex timing (L79) still within tolerance after filtering; no spine
  point inside a head capsule; 0 cloth–body penetrations > 2 mm; stable at 30 fps for 10 min.
- **Status.** *To build*.

#### L83 Motion mixer and personal style
- **Purpose.** Combine all motion sources with clear priorities, in the person's own style, without pops.
- **In → Out.** Lip, emotion, blink, head, gaze, gesture, rest and idle streams → one pose per frame.
- **Method.** Per-joint masks with priorities per channel: mouth values (lips > emotion > idle), eyes (blink
  > gaze), arms (explicit action > planned gesture > rest/idle); changes of the winning source crossfade over
  150–250 ms with quaternion blending; additive layers (breathing, sway, micro-motion) on top; then L82's
  springs; then a **post-mix clamp** to L30's limits. Must-hit mouth events from L65 are re-asserted last.
  Personal style: amplitude and tempo of gestures, head and brows scaled by the person's profile (L16), by
  emotion (L69) and by the attention scalar (L73); preferred hand from L11.
- **Research.** Motion layering practice; speaking-style capture (1905.03079); identity-aware motion
  (2604.25164).
- **Ours.** Style as measured scalars, not a style network.
- **Defaults.** Crossfade 200 ms.
- **Fails → fallback.** Unstyled defaults.
- **Gate.** Mouth closures (S3) never broken by other layers; angular acceleration per joint bounded (no
  single-frame spikes) across a 10-minute conversation; style scalars within ±2σ of the population.
- **Status.** *To build*.

---

### Stage J: Listening and conversation (L84–L89)

The site's speech chain today is batch: it posts a whole recording (`src/voice/stt.js`, up to 3 MB) to
cloud providers. A live teacher needs streaming. No commercially licensed two-channel Hindi conversation
corpus is known, and the original voice-activity-projection models are trained on Switchboard (an LDC
corpus; commercial terms **UNVERIFIED**, 2205.09812), so version 2 starts from hybrid rules and streaming
recognition, and adds learned turn models only on our own consented data.

#### L84 Listening: voice activity, streaming recognition and echo guard
- **Purpose.** Know when the student speaks and what they say, in English, Hindi or Hinglish, fast — and
  never mistake her own voice for the student's.
- **In → Out.** Student microphone (with echo cancellation) + the played reference signal → speech/no-speech
  per 30 ms, streaming partial transcripts with confidence and n-best, final transcript.
- **Method.** A small VAD (Silero-class, MIT) on device; a streaming ASR on the server (Qwen3-ASR-0.6B,
  Apache-2.0 per its model tag — to confirm in L3; the turn-aware LoRA of 2609.04225 is *later*, since no
  Hinglish classroom speech exists to train it), biased towards the lesson vocabulary (keyword boosting); the site's free cloud chain (Admin → Voice recognition) is kept for
  the final transcript where it is better. **Echo guard**: we know the exact playback signal, so a residual
  echo test (normalised cross-correlation between the mic and the played reference) and a speaker check (the
  voice is not the cloned teacher) must both say "student" before an onset counts. When the browser reports
  no echo cancellation and no headphones, push-to-talk is the default. **Typed input** is a first-class
  turn: typing start and stop are events for L85–L86 (many students will type in shared rooms, in noise, or
  out of shyness about spoken English; the share is **UNVERIFIED** and is logged from day one).
- **Research.** Whisper (2212.04356); turn-aware streaming ASR (2609.04225: 0.97 boundary recall at 0.39 s
  median); Indian-language ASR benchmarks (2604.19151, 2305.15386, 2609.24199); code-switched speech
  (2406.10993).
- **Ours.** Reuses the site's free speech chain for finals; echo guard from our own known playback.
- **Defaults.** End-of-speech silence 500 ms as a last resort (L85 usually decides earlier).
- **Fails → fallback.** The batch chain with silence endpointing; typed input.
- **Gate.** WER/CER on the Hinglish classroom set within 10% relative of the best single provider; S11's
  echo test (her own speech on laptop speakers never triggers barge-in).
- **Status.** *Partial*: batch chain in the site (`src/voice/stt.js`, `client/src/voice/`); streaming and
  echo guard *to build*.

#### L85 Turn-taking, with a teacher's wait time
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
  student answers, she holds a visible, attentive pause of 1–2 s before the verbal verdict (pausing after the
  answer makes answers longer and better reasoned; Rowe 1986; practice guides give 3–5 s for classrooms,
  **UNVERIFIED** for one-to-one tutoring, so the hold is tuned in the study). A learned turn model
  (voice-activity projection) is *later*, trained only on our own consented two-channel tutoring recordings
  (students' voices need their own opt-in consent, and a guardian's for minors).
- **Research.** Wait time (Rowe 1986, *J. Teacher Education* 37(1)); voice activity projection
  (2403.06487, 2401.04868, 2503.06241); FastTurn (2604.01897); speculative and hybrid turn control
  (Voice-Light 2609.20995: a learned policy alone reached 12.5% recall at a safe cut-off rate); full-duplex
  dialogue (2410.00037, 2604.21406, 2509.22243); IndicFDB behaviours as a comparison benchmark (via
  2604.23295; licence **UNVERIFIED**, comparison only).
- **Ours.** Tutoring-state-aware wait time.
- **Defaults.** Answer when silence ≥ 350 ms and (ASR boundary or semantic end ≥ 0.6); after a question,
  wait ≥ 3 s; hint offer after ≥ 8 s; verdict hold 1.5 s.
- **Fails → fallback.** Silence threshold (L84).
- **Gate.** False cut-ins ≤ 5% of student turns; median gap after a true end ≤ 300 ms to first reaction;
  after questions, 0 cut-ins inside 3 s; 0 automatic ladder steps.
- **Status.** *To build*.

#### L86 Listening reactions, contingent on correctness
- **Purpose.** She shows she is listening, and never signals agreement with a wrong answer.
- **In → Out.** Turn state, the student's prosody, transcripts with confidence, **the grader's verdict** →
  backchannel events (nod type, short vocal token from the bank, facial reaction).
- **Method.** Timing and type by rules (pause-based opportunities, prosodic cues), with a learned
  predictor later on our own data. A gate filters them: **agreement** ("haan", an affirmative nod) only after
  a *final* transcript with ASR confidence above a threshold *and* a grader verdict "correct"; **negative
  faces never fire, and nothing evaluative fires on partial transcripts**; otherwise only neutral attention (steady gaze, slight
  forward lean, a brow lift). Because "hmm" and a lateral head tilt or wobble are commonly read as assent in
  Hindi conversation (**UNVERIFIED** as a measured effect), the neutral set is chosen by the perceptual test
  of S12, not assumed. While the student talks, backchannels are visual only (vocal tokens cause
  echo-cancellation double-talk and damage recognition); vocal tokens only in pauses ≥ 250 ms. Confusion
  cues (long pauses outside wait time, "umm", rising pitch) bring the *encouraging* face and, per L85, an
  offer of a hint, never a concern face. **After the grader's verdict** (following L85's hold): on a correct
  answer, an affirmative nod and a specific process-praise clause ("you checked mid first, good"); on a wrong
  answer, no head shake, no concern face and no frown — a warm neutral face, a slight lean in, and a reply
  about the content. **Divergence deixis (untested option)**: when the grader says "wrong", or Mirror Run's
  `compare.ts` finds the first frame where the student's trace differs from the lesson's, her first reaction
  is a look and a point (L76) at *that* step's element, then, after the hold, one question about it ("yahan
  `low` kya tha?"). The nonverbal channel then carries *where* the error is, not *that* there is one. It is a
  step of Guru's hint ladder (`GURU_SPEC.md`), passes the Leak Guard, and never runs during a test.
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

#### L87 Brain and streamable performance script
- **Purpose.** What she says and how: words, emotion, gaze, gestures and targets, clause by clause, and
  nothing unsafe ever reaches the voice.
- **In → Out.** Student turn, lesson context, student memory → a stream of speakable text with inline tags,
  parsed into validated clauses.
- **Method.** Guru (`src/voice/guru.js`, `docs/voice/GURU_SPEC.md`): free providers with failover, the hint
  ladder, Leak Guard, no help in tests. It streams **plain speakable text with light inline tags**
  (`⟨g:point|el42⟩`, `⟨emo:curious⟩`, `⟨gaze:board⟩`), parsed as the text arrives (a JSON object per clause
  cannot be spoken until it closes). A validator checks every tag against the action list (L74) and the
  lesson's real element ids (L76); anything invalid is dropped or replaced by rules. **Leak Guard per
  clause, before synthesis**: speech cannot be unsaid, so each clause is checked before L60; a failing clause
  is replaced by a safe canned hint from the bank (L62) and the rest of that clause's tokens are dropped.
  "Honest face": when retrieval confidence is low, the clause gets `emo:thinking`, a hedge, and a pointer to
  the source. **Persona contract per teacher**: allowed topics and tone; no personal anecdotes, opinions,
  exam predictions, promises, or claims of personal memory or feelings ("this is about the lesson"); the
  teacher can read reply transcripts and switch live replies off (default off until they switch them on,
  D13). Every clause carries its provenance (recorded lesson vs. live AI) for L57's cue, and the target
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

#### L88 Barge-in and repair
- **Purpose.** When the student interrupts, she stops quickly and politely, and knows what was heard.
- **In → Out.** Student onset during her speech (confirmed by L84's echo guard) → fade-out, state update,
  repair line.
- **Method.** If student speech lasts > 300 ms and is not a backchannel (L85 decides), fade her audio over
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

#### L89 Latency hiding: speculation and the bank
- **Purpose.** No dead pauses even when recognition and the brain take a second or more.
- **In → Out.** Partial transcripts, predicted end of turn → a private draft, visible pre-reaction, a bank
  phrase, early speech.
- **Method.** *Later*: generate privately from the partial transcript (speculative drafting); start
  synthesis only once the end of turn is confirmed; throw the draft away if the transcript changes. Release 1
  uses the rest of this layer: at 250 ms after the end,
  an intake breath and a brow lift; at confirmation, a bank phrase in her own voice ("achha", "dekho…")
  covers the first clause's synthesis; lesson answers known in advance come from the lesson cache
  (pre-rendered, §7.4).
- **Research.** Voice-Light speculative generation (2609.20995); response-time studies in full-duplex
  dialogue (2604.21406); streaming agents for digital humans (2608.24909); human Hindi response gaps ≈ 0.26 s
  and the best Hindi duplex model ≈ 2.0 s (2604.23295).
- **Ours.** Pre-speech body cues and a personal phrase bank as part of the latency budget.
- **Defaults.** Pre-reaction at 250 ms; bank phrase only when the first clause will be later than 700 ms.
- **Fails → fallback.** Thinking cue (L69) until audio starts.
- **Gate.** S10.
- **Status.** *To build*.

---

### Stage K: Clock, delivery and gates (L90–L92)

#### L90 Clock, scheduler and adaptive quality
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
  LOD1, no spring chains). The internal resolution cap of L56 applies at every tier. **Phone tier** (panel
  ≤ 480 px wide, as the site must work at phone width): a head-and-shoulders picture-in-picture at the basic
  tier, lip and eye contrast tuned for a face about 120 px tall, deixis by gaze and lesson highlight (L75).
- **Research.** Lip-sync detectability asymmetry (ITU-R BT.1359; figures from memory, **UNVERIFIED**);
  streaming embodiment on one timeline (BASE 2611.30388); real-time portrait animation (Teller 2503.18429).
- **Ours.** Audio-master evaluation of explicit controls with closure hold and output-latency calibration.
- **Defaults.** Tier change hysteresis 2 s.
- **Fails → fallback.** Basic tier.
- **Gate.** S5 and S14 on the reference laptops; S3 with 10% injected frame drops; S3 and S8 rerun at
  360 px and the frame rate on a mid-range Android phone reported.
- **Status.** *Partial*: frame-exact `renderAt(t)` in the lab player; worker scheduling, closure hold and
  latency calibration *to build*.

#### L91 Model packaging and signing
- **Purpose.** One file that carries the person model, its consent and its report.
- **In → Out.** All build outputs → `.pbmodel` (zip: manifest with SHA-256 of every file, signature,
  consent record, provenance ledger, information-budget certificate, build report, template version and
  hash, fitted positions, head morphs (sparse), palette and contrasts, paint overlay, curves and marks, hair
  fit, wardrobe fit, motion profile, coarticulation parameters, voice reference, persona contract); the
  phrase bank as a companion file, added when ready.
- **Method.** As the identity pack (`PACK_FORMAT.md`), signed with the server key; encrypted at rest with
  the person's key (L3); the player verifies the signature, the template hash and the lock before loading.
- **Research.** —
- **Ours.** The model refuses to load without its consent record and label component.
- **Defaults.** ≤ 8 MB (bank ≤ 2 MB extra).
- **Fails → fallback.** —
- **Gate.** Tampered files rejected 100%; size within budget.
- **Status.** *Partial*: signed identity pack exists (`pack.py`); model format *to build*.

#### L92 Self-grading build, bench and release gates
- **Purpose.** Every build checks itself; every change to any layer is checked on the bench.
- **In → Out.** The built model + held-out frames → report with every gate's number and pass/fail; retries;
  release decision.
- **Method.** **One bench harness** (one program, about twenty metrics: the S table plus a few internal
  ones) runs every gate; layers are a checklist, not separate test programs. **Renderer**: gate frames are
  drawn by the shipping three.js player in headless Chromium on the worker GPU, driven by Playwright with the
  frame-exact `renderAt(t)` (as `player/render.cjs` does), so gates measure what students see. Today those
  scripts launch with SwiftShader (CPU rendering, an estimated 0.2–1 s per 720p 4× MSAA frame,
  **UNVERIFIED**), which would blow the gate budget; GPU-backed headless Chrome (ANGLE on Vulkan or EGL) in the
  rented container is a week-1 item (**UNVERIFIED**), with an EGL port of the same GLSL on moderngl (MIT) as
  the fallback. After the build, render held-out views (the end of the capture, or another day's photos)
  with the frames' own head pose and expression values, and run: the likeness regression (S1, on the mesh,
  with the gallery of L0), shape error, lip checks on rendered pixels (S3–S6 with the person's own audio and
  the replay gate), limits and collisions on every frame of the action library (S7), pointing (S8, geometric
  part), no-copy (S15), figure–ground (S19), size and a browser-speed proxy. **Fixed-point gate (untested)**:
  render the model at the capture's views and expressions, run Stage B on those renders, and re-measure face
  shape, ratios, palette, hair length and expression ranges; a sound pipeline is close to idempotent,
  measure(render(build(x))) ≈ measure(x) within per-quantity tolerances learned on synthetic heads (first in
  plain shading, then painted). It catches drift, double-counted stylisation, broken bindings and regressions
  in any layer, needs **no bench people**, and runs on every pull request on synthetic MakeHuman heads;
  where the landmarker fails on painted renders, that failure is itself a warning. If a gate fails and time
  remains, re-run only the layers upstream of that gate with the next fallback setting (e.g., lower style
  $s$, another hair style); else ship the report with the failure named and the missing input asked for
  ("one more photo of your left side"). The whole build runs in **one long-lived worker process** with every
  model resident; each stage is a function, not a subprocess, so start-up is paid once. A 2-person smoke
  bench and the fixed-point gate run on every pull request touching the engine; the full 8-person bench
  nightly and before a release (8 builds × 4 GPU-minutes per pull request would be paid compute).
- **Research.** Design-science evaluation (1904.12742); cycle consistency in learning (general practice; as
  a release gate for a measurement-only avatar builder we know of no prior use, **UNVERIFIED**).
- **Ours.** Time-budgeted retry targeted at the failing gate; the fixed-point gate.
- **Defaults.** Retry budget = 240 s − elapsed.
- **Fails → fallback.** Model marked "not ready"; never shown to students below the S1 thresholds, nor
  before S2 has passed on the bench for the release.
- **Gate.** All system gates of §2.5 green before release; the owner approves a video with sound.
- **Status.** *Partial*: held-out time split and gates in `build.py`; `bench.py`, `likeness.py`;
  `test_engine.py`; headless player rendering (SwiftShader) in `scripts/teacher/maker/player/render.cjs`;
  GPU headless rendering, the single harness and the fixed-point gate *to build*.


### 5.12 Layer index (build checklist)

| # | Layer | Status | Gate (short) |
|---|---|---|---|
| L0 | The bench (first deliverable) | partial | All 8 people's material complete and consented, raters recruited (owner decision D10). |
| L1 | Consent capture and verification | partial | 100% of builds have a valid record; bench replay attacks (photo, screen replay of someone else) and voice swaps rejected 100%. |
| L2 | Identity lock | exists | Bench: all 8 genuine pairs pass; all 56 cross pairs fail. |
| L3 | Provenance ledger, labelling and revocation | partial | S17: 100% traced; no check-only model on a parameter-choosing path (static check of the build graph); a deletion test leaves no readable … |
| L4 | Capture coach and coverage planner | partial | On the bench, coached captures reach "Good" coverage in ≤ 3 min for 8/8 people. |
| L5 | Frame quality, liveness and shot cuts | exists | ≥ 40 usable frames, or the build stops with a named reason; every bench photo's handedness correct. |
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
| L19 | Multi-view depth refinement | partial | Profile-view reprojection error drops ≥ 20% vs. single-view depth; held-out view error < 2%; profile-contour error < 1.5% of face … |
| L20 | Expression examples and the measured basis | exists | Held-out shape error of the measured basis < 2%; mouth opening follows the real mouth r ≥ 0.9 (measured 0.97). |
| L21 | Face detail curves | to build | Curves stable across views (mean positional disagreement < 3% of eye distance) and the owner's side-by-side check (§8.3) prefers … |
| L22 | Salient marks, lid crease, hairline and nostril shape | to build | Marks found on both capture days at the same position (≤ 3% of eye distance) on the bench; the owner's side-by-side check prefers "with … |
| L23 | Full head completion and the matched norm | partial | Side-silhouette IoU ≥ 0.9; the norm's ratios within 0.5 SD of the published means; S16's monitored report shows no Monk group … |
| L24 | Stylisation and caricature from the matched norm | partial | Identity cosine ≥ 0.95; at the stylised mouth, PBM reaches inner-lip contact with ≤ 0.3 mm penetration on every bench person; asymmetry … |
| L25 | Ears | to build | Ear in the profile view within 3 px at 512 px. |
| L26 | Neck and throat | partial | Front silhouette IoU ≥ 0.9 in the neck band. |
| L27 | Skeleton and bone lengths | partial | Skeleton reprojection onto frames < 4% of shoulder width. |
| L28 | Posture and spine | to build | Posture reprojection error < 4% of shoulder width. |
| L29 | Hand skeleton and finger lengths | partial | Hand length within ±5% of the bench ruler measurement (L0); fingertip reprojection reported. |
| L30 | Joint limits | to build | S7 (limits after every layer, including the spring layer L82). |
| L31 | Torso and arm volume | partial | Front silhouette IoU ≥ 0.9. |
| L32 | Glasses and facial-hair geometry | to build | Owner's side-by-side check: accessories judged "right" for 8/8 bench people. |
| L33 | The template (built once, by script) | partial | Two runs of the script give identical asset hashes; manifold, no self-intersection; library poses (S7) deform without flipped triangles … |
| L34 | Template fit | partial | Face points within 0.5% of eye distance of L17–L24's face; head, neck and body silhouette IoU ≥ 0.9; no flipped triangles. |
| L35 | Personal expression rig | partial | Full lid closure at eyeBlink = 1; PBM inner-lip contact with ≤ 0.3 mm penetration; no lip through teeth at any value; held-out … |
| L36 | Skin weights | partial | No tearing or folding (flipped triangles = 0) on every frame of every library action. |
| L37 | Runtime deformer: correctives and skinning | to build | Volume change at elbows and wrists < 10% and silhouette error at a 90° elbow bend ≥ 20% lower than without correctives; morph GPU memory … |
| L38 | Levels of detail | partial | LOD1 silhouette IoU ≥ 0.97 vs. LOD0 at panel size. |
| L39 | Per-frame light estimation | partial | Recovered skin albedo agrees across frames: ΔE₀₀ < 3 between the 25th and 75th percentile frames. |
| L40 | Colour model (parametric by default) | partial | Mean ΔE₀₀ to measured skin colour (L13) < 3; no region darker than 3σ of its own frames (no baked shadows); the three contrasts in the … |
| L41 | Region palette, skin tone and shine | partial | Region colours stable between two halves of the capture (ΔE₀₀ < 3); owner's form-readability check per Monk group on the bench. |
| L42 | No-copy guard: information-budget certificate | to build | S15 on every build. |
| L43 | Feature curves: brows, lids, lip line, lashes | partial | Brow-shape IoU ≥ 0.85 vs. the masks in the front view and the tail position within 2% of eye distance. |
| L44 | Eyes | partial | Eye-centre fit residual < 0.5 mm; in the facing render the iris is centred on the camera within 1°; no head-interior pixels visible at … |
| L45 | Eyelids and lashes | partial | No lid–eyeball gap at any gaze in ±30°; full closure at eyeBlink = 1. |
| L46 | Teeth, gums, mouth cavity and tongue | partial | No see-through mouth at any expression; teeth visible iff inner lips separate > 1 mm; in the smile render, teeth display within ±1 mm of … |
| L47 | Hair shape (library first) | partial | Hair silhouette IoU ≥ 0.8 in front and three-quarter views; owner judges the style "theirs" on ≥ 7/8. |
| L48 | Wardrobe and garment fit | partial | No body vertex outside the garment on any frame of the library, including arms above 90°. |
| L49 | Lighting rig and theme-aware value key | exists | Face mean luminance in [0.45, 0.75] for every bench person and theme; S19, with the deep Monk groups over light themes as their own cell. |
| L50 | Shading-normal field | to build | In a slow head turn and a speech clip, band islands smaller than 1% of the face area: 0; the band-boundary map of each bench person … |
| L51 | The master band set and the per-person overlay | partial | S18 (including sameness at chance); flicker (L55) ≤ the plain shaded render; L42 painter audit passes. |
| L52 | Painted shading model (run time), with eyes and hair highlights | partial | S18; form readable per Monk group over light and dark backgrounds (owner's check on the bench); catch-light visible in both eyes in 100% … |
| L53 | Key-light cast shadow and baked occlusion | to build | GPU time ≤ 1.2 ms on the reference laptop (estimate 0.8–1.2 ms, **UNVERIFIED** until the spike, §8.6); no shadow acne in the head-turn clip. |
| L54 | Lines | partial | No line flicker (L55) and lines present on all named features in every bench render. |
| L55 | Anti-aliasing and temporal stability | to build | Edge-crawl and flicker metrics (mean absolute frame difference after motion compensation) on a slow head-turn clip ≤ 1.5× the plain … |
| L56 | Render graph | partial | S14. |
| L57 | Compositing, transparency, the AI label and the provenance cue | to build | 100% of rendered frames and exported clips carry the label; S20; no dark fringe on hair over a white lesson background. |
| L58 | Text normalisation and language routing | to build | Round trip: ASR of the synthesised Hinglish set has character error rate ≤ 15%; in the study, "she spoke the way I speak" ≥ 5/7. |
| L59 | Grapheme to phoneme: a pronunciation lattice | partial | Phone error rate of the best lattice path ≤ 5% on a 500-word Hindi and a 500-word English list. |
| L60 | Cloned voice synthesis | partial | Speaker similarity (ECAPA-TDNN cosine, check-only, 2005.07143) between synthesis and held-out real speech ≥ 0.75 × the real-vs-real … |
| L61 | Spoken-phone alignment and prosody | partial | Median boundary error ≤ 20 ms on a hand-labelled 200-phone set per language; logged rate of must-hit events where lattice choice and … |
| L62 | Personal phrase bank | to build | Every item passes L60's speaker and intelligibility gates and S3–S4. |
| L63 | Audio watermark and provenance | to build | Detection ≥ 99% after MP3/Opus re-encoding at 32 kbps; no audible artefacts (ABX at chance). |
| L64 | Phones to visemes | exists | All IPA phones in the test set map to a class (exists: `test_every_language_sound_has_a_mouth`). |
| L65 | Coarticulation as a constrained trajectory | partial | S3 and S4 by construction on controls and on rendered pixels; coarticulation path ratio (2610.03436) within the range of the person's … |
| L66 | Jaw–lip split and personal mouth range | to build | S6; SLCC on held-out speech ≥ the value of the person's own video (2503.20308 metric). |
| L67 | Tongue and teeth visibility control | to build | Tongue visible on 100% of θ/ð and ≥ 80% of l in close-up; teeth never visible with closed lips. |
| L68 | Learned lip refiner and the replay gate | partial | S3–S6 still hold after fusion; PLRS (2503.20308) ≥ rules-only; replay correlation on the mouth values ≥ rules-only. |
| L69 | Emotion layer (face and body) | to build | Observers recognise the 6 cues from silent clips ≥ 65% (chance ≈ 17%), with the face and with the face blurred (body only) reported … |
| L70 | Blinks, brows and micro-motion | exists | Blinks per minute within ±20% of the person's own (from L16). |
| L71 | Head motion | partial | Head speed distribution matches the person's own: median and 90th percentile within ±20% on 6/8 bench people. |
| L72 | Gaze | to build | Gaze lands within 2° of the target element's centre within 250 ms of the cue; during fixation the gaze direction error stays < 1° while … |
| L73 | Attention sharing beside a moving lesson | to build | In clips of animated steps, gaze on the active element ≥ 90% of step time; ablation (§8.5): quiz score with the layer on ≥ off. |
| L74 | Action language | partial | Every action parses and expands; every expansion solvable (L77) for all 8 bench bodies; two-hand actions: palm gap ≤ 5 mm and no … |
| L75 | Gesture planner | partial | Appropriateness rating (GENEA-style, §8.4) ≥ the rule baseline; no two apexes < 300 ms apart; hands visible on ≥ 95% of stroke frames … |
| L76 | Target resolution: lesson element to 3D point, for the observer | to build | S8. |
| L77 | Arm solver: analytic IK with shoulder girdle and torso | to build | Target error < 2% of arm length; 0 limit violations; no single-frame swivel change > 5° while the target moves smoothly. |
| L78 | Hand shapes | partial | Every named shape within L30's limits; observers identify counts 1–5 from rendered, painted clips ≥ 95%. |
| L79 | Trajectories and gesture phases | partial | |apex − accent| ≤ 100 ms in 95% of beats. |
| L80 | Self-collision avoidance | to build | S7: 0 penetrations deeper than 2 mm on every frame of the library × 8 bodies. |
| L81 | Rest poses, idle life and breathing | to build | No interval > 2 s with all joint velocities below 0.2°/s; inhalation onsets in pauses ≥ 95%. |
| L82 | Secondary dynamics and spring chains (body, hair, loose garments) | to build | No added limit violations; apex timing (L79) still within tolerance after filtering; no spine point inside a head capsule; 0 cloth–body … |
| L83 | Motion mixer and personal style | to build | Mouth closures (S3) never broken by other layers; angular acceleration per joint bounded (no single-frame spikes) across a 10-minute … |
| L84 | Listening: voice activity, streaming recognition and echo guard | partial | WER/CER on the Hinglish classroom set within 10% relative of the best single provider; S11's echo test (her own speech on laptop … |
| L85 | Turn-taking, with a teacher's wait time | to build | False cut-ins ≤ 5% of student turns; median gap after a true end ≤ 300 ms to first reaction; after questions, 0 cut-ins inside 3 s; 0 … |
| L86 | Listening reactions, contingent on correctness | to build | S12 (both questions, every region); backchannel timing rated natural ≥ 3.5/5; divergence deixis only if, against a neutral face plus the … |
| L87 | Brain and streamable performance script | partial | 100% of executed tags valid; Leak Guard tests pass, including a new test of streaming order (no clause reaches the voice before its … |
| L88 | Barge-in and repair | to build | S11. |
| L89 | Latency hiding: speculation and the bank | to build | S10. |
| L90 | Clock, scheduler and adaptive quality | partial | S5 and S14 on the reference laptops; S3 with 10% injected frame drops; S3 and S8 rerun at 360 px and the frame rate on a mid-range … |
| L91 | Model packaging and signing | partial | Tampered files rejected 100%; size within budget. |
| L92 | Self-grading build, bench and release gates | partial | All system gates of §2.5 green before release; the owner approves a video with sound. |

Totals: 93 layers (L0–L92); 16 exist, 46 partial, 31 to build.


---

## 6. Training and data

### 6.1 What is learned or authored once (shared) and what per person

| Learned or made once (shared, rebuilt when improved) | Layer | Data | Size / cost (estimate) |
|---|---|---|---|
| The template: topology, UVs, rig with twist/helper joints, weights, correctives, two LODs, 52 face units and 15 visemes, head split, generated painting attributes, plane segmentation, garment cages, scalp | L33 | MakeHuman/MPFB CC0 assets (pinned; D2 settled), built by `make_template.py` | hours of scripting on top of `build-vrm-teacher.py`; minutes to run |
| Master band set (light, half-tone, shadow on one stroke layout; brush-edge, edge-width, wrinkle, focus and hair-highlight layers) | L51 | Procedural (`paint.py`) first; staff-painted in Krita if the look spike fails (D3) | minutes to generate; 4–6 sets × days if painted |
| Face-controls / face-shape regressor (points → shape) | L19, fallback | Synthetic CC0 MakeHuman people rendered in Blender (`training/face_controls`) | 20–50k people; CPU or ≈ 10 GPU-h render |
| Head prior (30 PCA components, template topology) and the matched norm | L23, L24, L0 | CC0 heads + consented builds; published Indian anthropometric means and SDs; ICT-FaceKit only if D12 | minutes on CPU |
| Attenuation slopes per prior component and ratio (optional) | L24 | Synthetic heads of known shape rendered at capture poses and distances | ≈ 1–2 GPU-h |
| Perceptual impostor radius and the global caricature strength $\gamma$ | L0, L24 | Bench raters (pilot) | one pilot |
| Accessory and facial-hair detectors | L14 | Synthetic renders with CC0 glasses/beards we model | ≈ 5 GPU-h |
| Monk-class painterly palette table | L41 | Generated from palette rules; a handful of numbers adjusted by the owner | — |
| Hair clump library | L47 | Generated by script (owned); 4 styles in release 1 | — |
| Wardrobe | L48 | CC0 MPFB clothes packs re-shaded; a kurta modelled by us | days, once |
| Hand synergy space (*later*) | L78 | Consented hand captures (counting, pointing, palms) | small |
| Lip refiner fine-tune (*later*) | L68 | Consented Hindi/Hinglish/English face video (1–3 h start), `training/lipsync` | ≈ 20 GPU-h fine-tune |
| Indic voice adapter (optional, after the build) | L60 | Consented readings, 30–60 min per voice; CC0 Common Voice Hindi for robustness | ≈ 10 GPU-h |
| Acoustic models for the Montreal Forced Aligner (narration) | L61 | Common Voice (CC0) | CPU hours |
| Language-ID for Hinglish | L58 | Our own lesson text + consented transcripts | CPU |
| Turn-aware streaming ASR adapter (*later*) | L84 | Consented Hinglish classroom speech | ≈ 5 GPU-h |
| Turn-taking / backchannel models (*later*) | L85, L86 | Consented two-channel tutoring conversations (10–20 h) | ≈ 10 GPU-h |

| Per person (in the 3–4 minute build) | Layers |
|---|---|
| Neutral 3D face, metric scale, multi-view refinement with perspective and profile contour | L17–L19 |
| Expression examples, crease curves, marks and descriptors | L20, L21, L22 |
| Head completion, stylisation under the identity constraint, ears, neck | L23–L26 |
| Skeleton, posture, hands, limits, body volume, accessories | L27–L32 |
| Template fit, personal expression rig, weights, LODs (numpy/torch, no Blender) | L34–L38 |
| Light, colour model with contrasts, palette, certificate, features, eyes, teeth, hair style fit | L39–L47 |
| Garment fit | L48 |
| Shading normals, occlusion, paint overlay | L50, L51, L53 |
| Motion-habit profile, mouth ranges, coarticulation parameters, rest poses | L16, L65, L66, L81 |
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
  their consent text names that use.

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
| MediaPipe face/pose/hands/segmentation | Stage B, drawing checks on renders, rendered-pixel lip gates | Apache-2.0 | yes |
| YuNet / SFace (OpenCV zoo) | L2, L6, S1 check | MIT / Apache-2.0 weights; trained partly on MS-Celeb-1M (withdrawn) | check-only (D6); not shipped |
| Chatterbox Multilingual + `Chatterbox-Multilingual-hi` | L60 | MIT; archived and unmaintained since August 2026 (vendored, pinned) | yes |
| Chatterbox-Nano (English, CPU) | §7.4 option for English live replies on CPU | licence and cloning quality **UNVERIFIED** | check |
| Kokoro via HeadTTS | Default voice for the first milestone; the separate labelled presenter (L60, D5) | Apache-2.0 (Kokoro); HeadTTS MIT (copy in the licence folder) | yes |
| CosyVoice (2407.05407) | L60 second engine | Apache-2.0 (per authors) — **UNVERIFIED** for every checkpoint | check |
| wav2arkit_cpu; LAM Audio2Expression | L68 | Apache-2.0 (per `slots.json`, `TRAINING.md`) | yes |
| Whisper; IndicConformer | L84 | MIT | yes |
| Qwen3-ASR-0.6B | L84 streaming ASR | Apache-2.0 per its model tag — **UNVERIFIED** in L3 | check |
| Silero VAD | L84 | MIT | yes |
| `facebook/wav2vec2-lv-60-espeak-cv-ft` | L61 shipped aligner | Apache-2.0 tag on its model card; Libri-Light pre-training data **UNVERIFIED** | after the Libri-Light check |
| Montreal Forced Aligner | L61 narration aligner | MIT (code); its pretrained models **UNVERIFIED**, so we train our own on Common Voice | yes (code + our models) |
| XLSR-53 phone recogniser (2109.11680); Allophant (2306.04306) | Comparisons only | weights **UNVERIFIED**; BABEL (LDC) in pre-training | check-only |
| Playwright + Chromium (headless) | L92 gate renders | Apache-2.0 / BSD (tools) | yes (tools) |
| moderngl | L92 fallback renderer | MIT | yes |
| KTX2 / Basis Universal transcoder | L51 texture compression | Apache 2.0 per the three.js copy's README; upstream text to read | after the check |
| AudioSeal (2401.17264) | L63 | MIT, code and weights (README, April 2024) | yes |
| Perth watermark (in Chatterbox) | L63 (optional) | **UNVERIFIED** | only after checking |
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

| Step | Layers | Device | Target (s) |
|---|---|---|---|
| Unpack, verify signature, consent, face lock, voice match | L1–L3 | CPU | 6 |
| Re-read any uploads not processed on device | L5–L16 | CPU (parallel) | 0–40, overlapped |
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
| Shading normals and occlusion bake (rest; 52 targets on the head only) | L50, L53 | GPU | 5 |
| Paint overlay (the master band set is template data) | L51 | GPU | 2 |
| Voice references, mouth ranges, coarticulation fit | L15, L60, L65, L66 | GPU | 12 |
| Gates: held-out renders in headless GPU Chromium (or moderngl), likeness regression and gallery, rendered-pixel lip checks, replay, action library × limits/collisions per frame, figure–ground, certificate, perf proxy | L92 | GPU + CPU | 45 (**UNVERIFIED** until the week-1 renderer item) |
| Package, sign, upload | L91 | CPU | 5 |
| **Total (sequential critical path)** | | | **≈ 143** |
| Retry budget for failing gates | L92 | | up to 97 |
| After signing, outside S13: phrase bank (≈ 80 clips) | L62 | GPU | ≈ 80 (**UNVERIFIED**) |

All stages run as functions in one long-lived worker process with every model resident (L92), so process
and model start-up between stages is not paid per build. The template removes about 30 s of v1's critical
path (implicit surface, remesh, UVs, heat diffusion), and painting once on the template removes most of the
per-person painting time. The optional diffusion painter (D9) would paint master sets offline and adds
nothing to this budget. The first measured end-to-end build is due in week 5 (§8.6), not at the end.

### 7.2 Playback: 30 fps at 720p on an ordinary laptop

Reference devices: an Intel Iris Xe-class integrated GPU laptop and a 2020 MacBook Air (M1), Chrome and
Safari. Frame budget 33.3 ms; target GPU ≤ 15 ms and main thread ≤ 6 ms so the lesson page stays smooth.
Estimates, to be measured (**UNVERIFIED**) by the spike frame of §8.6 before any Stage F code is written:

| Work | Where | Target |
|---|---|---|
| Face and body layers (blinks, head, gaze, attention, emotion), arm solver, hands, swept collisions, springs, mixer (mouth values arrive from the server) | Worker | 2.0 ms |
| Hair (and later loose-garment) spring chains (≈ 40 spines) | Worker | 0.4 ms |
| Upload pose (≈ 70 bones + 52 values + correctives) | Main | 0.3 ms |
| Skinning (body) + active morphs on the head geometry (≈ 7k vertices, three.js skips zero influences) | GPU VS | 1.2 ms |
| Key-light shadow map 1024² | GPU | 1.0 ms |
| Forward 4× MSAA pass at ≤ 720 physical px: recoloured master bands, brush-edge, wrinkle and focus layers (≈ 4 extra fetches on face pixels), rim, highlights, eyes; colour + 8-bit id | GPU | 4.4 ms |
| Feature lines (no silhouette hull) | GPU | 0.5 ms |
| Resolve + composite | GPU | 0.7 ms |
| **GPU total** | | **≈ 7.8 ms** |

Download per teacher ≈ 5 MB (budget ≤ 8 MB): fitted positions and LOD ≈ 1.5 MB compressed; head morph
targets ≈ 2.5 MB as sparse fp16 deltas (positions plus normals over ≈ 7k vertices would be ≈ 4.4 MB dense;
**UNVERIFIED** until exported); the paint overlay ≈ 0.3 MB; hair and garments ≈ 0.5 MB. The template with its
master band set (≈ 3 MB in KTX2/UASTC) is cached once for all teachers. Phrase bank ≤ 2 MB, later. As a
sanity bound, skinned Gaussian avatars reach 40–50 fps on a phone and 240 fps on a laptop GPU in a
web/mobile system (2510.13978). The first numbers come from profiling the seven teachers the site already
plays (skinned Rocketbox models with ARKit morphs through TalkingHead/three.js, 3–5 MB each, in
`client/public/teachers/`) and one MPFB export with the band shader, in week 1 (§8.6).

### 7.3 Conversation latency (student stops → teacher)

Version 1 left out recognition time. With it:

| Step | Target |
|---|---|
| End-of-turn decision (streaming ASR boundary + silence + semantics, L84–L85) | 350–500 ms after the last word (2609.04225 reports a 0.39 s median) |
| Visible pre-reaction (L89) | 250 ms after the last word, in parallel |
| Bank phrase audio (local, L62) | ≈ 100 ms after the decision → first audio ≈ 0.5–0.7 s |
| Brain first clause (streamed; the speculative draft may already exist) | 0.3–0.6 s |
| Clause Leak Guard (L87) | < 50 ms |
| Voice first chunk, multilingual model (L60) | 0.3–0.6 s (**UNVERIFIED**; Hindi slower than English) |
| Alignment and mouth path for the chunk (L61–L68, server) | < 50 ms |
| Network both ways | 50–100 ms |
| **First content clause** | **≈ 1.2–1.8 s** (S10 median ≤ 1.8 s, for student questions); lower once speculation (*later*) is right |

When the student has *answered* a question, the verdict deliberately waits 1–2 s more (wait time II, L85);
that hold is pedagogy, not latency, and S10 reports it separately.

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
| CPU fallbacks | When no GPU is up | Never another voice on her face (L60): captioned text with listening and thinking cues, or a separate, labelled presenter (Kokoro); for English, Chatterbox-Nano on CPU is worth measuring as a cloned-voice option (its README reports 3× real time on 8 CPU cores; ARM speed, cloning quality and licence **UNVERIFIED**) |

The owner chooses whether live cloned replies are offered at all (D5). Said plainly: with no GPU kept up,
most students will not hear the teacher's own voice in live turns, only in recorded lessons.

---

## 8. Evaluation protocol

### 8.1 Metrics

| Family | Metric | Used in |
|---|---|---|
| Likeness (machine, regression) | Identity direction cosine and ratios on mesh vertices against the matched norm; rank-1 against the L0 gallery at a perceptually calibrated radius; landmarker and SFace as render-sanity checks only | S1, L24, L92 |
| Likeness (human, release) | Acquaintance lineup (≥ 5 per person, pooled) and stranger photo-to-render matching (≥ 30 per person), matched foils including brow shape, CIs; the global $\gamma$ pilot; owner's side-by-side sheet | S2, L24 |
| Shape | Face point error (% of eye distance) on held-out frames; silhouette IoU for head, hair, body | L17–L34 |
| Lip sync | On rendered pixels: per-class closure and contact rates (S3, S4) on realised phones, with injected frame drops; mouth range and the replay gate (S6, L68); browser A/V offset (S5); secondary: MTM, PLRS, SLCC (2503.20308) and the coarticulation path measure (2610.03436). SyncNet-style scores (2008.10010) are reported only for comparison, because they reward timing even when shapes are wrong (`ENGINE.md` §4) | L64–L68 |
| Voice | ECAPA speaker similarity vs. real-vs-real ceiling (check-only); ASR round-trip WER/CER; F0 continuity at joins; MOS; watermark detection | L60, L63 |
| Physical | Per-frame joint-limit violations and penetrations, pointing perception and line error, apex–accent offset, angular-acceleration spikes, hands-in-frame share | L74–L83 |
| Conversation | First-reaction, first-audio and first-clause latency including recognition, barge-in stop time, self-interruptions, false cut-ins, wait-time cut-ins, automatic ladder steps, backchannel timing, S12 per region, attribution (S20) | L84–L89 |
| Teaching | Pre-test, immediate and 1-week delayed post-test, one transfer item; gaze on the active element during steps; cognitive load; parasocial interaction | L73, §8.4 |
| Rendering | fps and p99 frame time on reference laptops and a phone; band-island count (L50); flicker and edge crawl (L55); figure–ground contrast (S19); style rating, sameness and style distance (S18); the fixed-point gate (L92) | L49–L57, L90, L92 |
| Fairness | All of the above by Monk Skin Tone group, sex, age band, glasses, facial hair (monitored on the bench; gated on the extended set) | S16 |
| Integrity | Information-budget certificate, painter audit, provenance completeness, check-only rule, label presence, deletion test | L3, L42, L57 |

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
colour layers. **Raters we can staff**: ≥ 15 acquaintances per person would mean about 120 recruited
acquaintances; S2 instead uses ≥ 5 acquaintances per person (pooled across the bench) plus ≥ 30 opted-in
NexoraGuru students per person on a stranger matching task, and reports both. S12's raters come from at
least North, South, East and West India.

### 8.3 Owner review

Side-by-side sheet per person: real photo, neutral render, three-quarter render, smile render, and a 20 s clip
with sound, over a light and a dark theme background. The owner rates likeness ("clearly them" / "looks like
a relative" / "not them") and style match against references 1–8 (1–5). Nothing ships without the owner
approving a video with sound (`SPEC.md`). The person themself sees their model both true and mirrored and
the $\gamma = 0$ vs. chosen pair, and picks; their own likeness judgement is recorded but never used as a
gate, because people prefer the mirror image of their own face while their friends prefer the true one
(Mita, Dermer and Knight 1977). The cloned teacher is also asked "would I teach like this?".

### 8.4 User study: does a likeness of *their own* teacher help?

The project's premise is that a clone of a teacher the student knows helps more than a voice or a generic
presenter. The study is designed to test that, not only to rate naturalness.

- **Participants.** Target 96 students in two strata of 48: students who **know** the cloned teacher and
  students who do not; stratified by Hindi- vs. English-medium schooling and by phone vs. laptop; recruited
  from NexoraGuru users who opt in; consent and the right to withdraw; adults (18+) only, or guardian consent.
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
  disappointed in me?" and "did she agree?" on the wrong answer (S12), and the attribution question "did your
  teacher personally say this?" (S20). Open comments. (Instrument suggestions such as Leppink 2013 and the
  Agent Persona Instrument: citations **UNVERIFIED**.)
- **Analysis.** Linear mixed-effects models with participant and lesson as random effects; pre-registered
  hypotheses: H1 A ≥ B on "felt listened to", appropriateness and delayed post-test; H2 A > D and A > E on the
  delayed post-test among students who know the teacher (the premise; if not, likeness does not earn its
  cost); H3 A not worse than C on the delayed post-test (equivalence margin 10%); H4 eeriness of A ≤ E. Effect
  sizes with confidence intervals.
- **Ethics.** Every condition shows the AI-generated label and the provenance cue; no deception about the
  nature of A, B, D and E; data stored without names.

### 8.5 Ablations (to show each new idea earns its place)

Parametric colour vs. parametric plus contrast features vs. a band-limited colour field (S1, S2: the numbers
for owner decision D1); the global $\gamma$ pilot over {0, 0.05, 0.10, 0.20}, with and without feature
exaggeration, with an eeriness check (S2, S9); de-attenuation on/off (second-day agreement, S2); salient
marks and lid/hairline descriptors on/off (S2, owner); procedural vs. hand-painted master band set (S18,
sameness), and either vs. v1's toon bands plus screen-space Kuwahara (flicker, S18, GPU time); spectral proxy
with and without the planar snap (band islands, S18, S2); brush-edge threshold maps on/off; wrinkle layers
on/off (expression readability, L69's recognition test); stroke-quantised vs. per-pixel band choice (flicker,
S18); cast shadow on/off (owner's style rating); silhouette hull on/off (S18); lattice alignment vs.
G2P-string timing (S3, S4 on realised phones); personal coarticulation parameters on/off (replay error,
cross-language on the Hindi reading when fitted on English only); rule–network fusion vs. network only (S3,
PLRS); task-space paths plus springs vs. joint-space key poses (S7 per frame, S9); observer-solved pointing vs.
finger-ray pointing (S8); attention sharing on/off (quiz, gaze on element); correctness gate on backchannels
on/off (S12, trust); divergence deixis vs. a neutral face plus the same question (judgemental rating,
self-correction time); speculation plus phrase bank vs. neither (S10, *later*).

### 8.6 Build order: a convincing result first

The v2 "vertical slice" contained most of the paper. Version 3 orders work so the riskiest unknown — the
look — is tested first, and the first milestone is something the owner can judge.

1. **Weeks 1–2, spikes (each with a written decision).**
   - *Look spike* (≈ 3 days; the riskiest unknown): the MPFB default head with a procedural master band set
     from `paint.py` and the band shader, shown to the owner against references 1–8 over a light and a dark
     theme background; also one hand-painted test chart if a staff painter is available. Kill, redirect
     (hand-painted master set, D3) or go.
   - *Performance spike*: profile the seven teachers already on the site and one MPFB export with the band
     shader on an Iris Xe laptop and an M1 (GPU timers committed), including the morph texture build time.
   - *Headless renderer spike*: GPU-backed headless Chromium in the rented container, or the moderngl port.
   - In parallel: recruit the bench and raters (L0, D10); the fixed-point gate on synthetic heads.
2. **Weeks 2–5, "talking likeness".** The existing `corr.py` + `apply.py` fit upgraded to L34 (numpy);
   expressions by transfer plus refinement (L35); parametric colour with contrasts (L40–L42); the master
   band set and overlay (L51–L52); lips through L64–L66 driven by **HeadTTS/Kokoro's exact phone durations**
   (no cloned voice, no aligner); head and gaze idle. Gate: the owner's side-by-side sheet and S3/S4 on pixels
   for the 2 smoke-bench people. First measured end-to-end build in week 5.
3. **Weeks 5–8.** The cloned voice for pre-rendered narration only, with the shipped aligner (L60–L61); a
   body on the MPFB rig with three actions (namaste, point at an element, open palms) on the arm solver with
   task-space paths and springs (L74, L77, L79–L83); attention sharing (L73).
4. **Weeks 8+.** Live conversation only after D5 and D13; the phrase bank; listening reactions with the
   correctness gate and the feedback rules; the rest of the action library; then everything marked *later*,
   each entering with its gate measured on the smoke bench, the full bench before each release.

### 8.7 Code modules and the harness

Fourteen code modules are the unit of ownership; each layer belongs to one. Capture (Stage B: `capture.py`,
`pack.py`); shape (L17–L32); template (`make_template.py`, L33); fit and rig (L34–L38); colour and
certificate (L39–L42, L22); paint (master set and overlay, L51); eyes, mouth and hair (L43–L47); player
and renderer (three.js, L49–L57, L90); voice (Stage G); mouth path (L64–L68); face and attention (L69–L72,
L73); body (Stage I); conversation (Stage J); and the bench harness (L0, L92), which owns every gate.

---

## 9. Risks, open problems and what is new

### 9.1 Top risks

1. **The style is the unmeasured bet.** No owned style kit, no artist, and a procedural painter that has
   never produced a frame like references 1–8. Mitigation: the look spike in week 1 with a written
   kill/redirect decision before any other Stage F code; the master band set as the one place a painter's
   hand enters, cheap to replace (D3: staff in Krita first, paid art only if both fail); S18 over light and
   dark backgrounds; sameness checked.
2. **Stylisation and the pixel ban vs. likeness.** Photo-trained recognisers score painted renders out of
   domain, the parametric colour model carries less identity than a colour map, and no machine score can
   find the caricature advantage. Mitigation: likeness in geometry measured on the mesh; a matched norm;
   marks, lid crease, hairline, brows and contrast features as numbers; a global $\gamma$ from a human pilot
   that the person may refuse; S2 as the only likeness release gate; the D1 ablation gives the owner the cost
   in numbers.
3. **Hands.** Few hand shapes are captured, fingers occlude each other, and hand animation is where avatars
   look wrong first. Mitigation: template five-finger hands with three measured numbers per hand, goal-based
   shapes with limits and coupling, per-frame collision, a smaller launch library, shapes judged as rendered
   painted silhouettes.
4. **Hindi/Hinglish voice and lips.** Cloned Hindi still trails the best commercial voices; the chosen TTS is
   archived; code-mixed text causes pronunciation errors; lip-sync models are mostly trained on English.
   Mitigation: the dedicated Hindi checkpoint, per-language references, clause-level synthesis, a maintained
   second engine behind the same slot, lattice alignment on the spoken audio with a shipped aligner, per-class
   gates on realised phones; the first milestone needs none of it (default voice with exact phone times).
5. **Browser performance on weak laptops and phones.** Unmeasured until the spike. Mitigation: profiling the
   site's existing teachers first; one WebGL2 back end; morphs only on the head; the internal-resolution cap;
   quality tiers and a phone tier (L90).
6. **Build clock.** The critical path is plausible for compute but omits unmeasured parts: headless rendering
   of gate frames, TTS speed and process start-up. Mitigation: one long-lived worker process, the phrase bank
   after signing, the renderer spike, the first end-to-end build measured in week 5.
7. **Impostor realism.** The head prior is mostly MakeHuman-modifier heads, so synthetic hard negatives are
   MakeHuman-like, not real-face-like, and margins may be miscalibrated. Mitigation: the perceptual radius,
   S1 demoted to a regression test, validation against S2, real-scan modes only after D12.
8. **Live-conversation cost, latency and honesty.** Live cloned speech needs a running GPU (not free); without
   it most live turns are not in her voice. Mitigation: pre-rendered narration, the bank, captions or a
   separate presenter instead of a second voice on her face, honest S10, owner decision D5 stated with its
   consequence.
9. **Misuse of a cloned voice and face; misattribution.** Mitigation: consent with face and voice match,
   identity lock, crypto-shredding, signed models that load only in our player, visible label, AudioSeal,
   the per-utterance provenance cue (S20), the persona contract and the teacher's switch (D13), scope limited
   to teaching.
10. **Bias.** Albedo and skin-tone estimation are biased towards light skin; banded shading reads poorly on
    deep skin if it relies on value contrast; a face space whitened on a light-skinned majority treats South
    Asian features as "deviations"; face recognisers vary by group. Mitigation: eye-white calibration, the
    generated Monk palette table that carries form by rim and bounce, the deep-skin-over-light-theme cell of
    S19, the matched norm, fairness reported per group and gated on an extended set.
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
15. **Schedule.** Mitigation: spikes first, a "talking likeness" milestone in week 5, *later* marks on what
    is not release 1, the bench first.

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

### 9.3 What is genuinely new here, and what is not

Not new (prior art we build on): dense-landmark face fitting, personalised blendshapes, template fitting by
non-rigid ICP, authored shading normals and painted light in stylised production, shadow maps, inverted-hull
lines, SH light estimation, dominance coarticulation and JALI, analytic arm IK and scapulohumeral rhythm,
minimum-jerk reaching, gesture phases, voice activity projection and semantic endpointing, speculative
response generation and context cuts at the played audio (Voice-Light 2609.20995), zero-shot voice cloning,
audio watermarking, LLM tutors, the caricature advantage and norm-based face coding, example-based facial
rigging and deformation transfer, perspective-aware face fitting, art-directable stylised shading and
expression wrinkle maps, tonal art maps, instructor guided gaze and the positivity principle, wait time. Each
is cited at its layer.

New or, to our knowledge, not previously combined this way (to be confirmed by a wider literature search
before any external publication — **UNVERIFIED as novelty claims**):

1. **Measurement-only appearance with an information-budget certificate** (L40–L42): the model lists every
   photo-derived number and a copy cannot fit in the budget; the painter provably never sees a photo.
2. **Stylisation constrained by identity direction, with caricature from a matched norm** (L23, L24):
   stylisation may not rotate the face's direction in a whitened face space; exaggeration is away from a
   sex- and population-matched norm at a strength set once perceptually, the person may refuse it, and the
   pipeline's own shrinkage towards its priors is measured and undone (de-attenuation, untested).
3. **A painted master band set on a scripted template, recoloured per person by measured colour numbers
   and chosen by a stabilised, identity-keeping shading normal with broken, per-region edges** (L50–L52),
   for a painted look that is stable by construction at laptop frame rates; stroke-quantised band choice is
   an untested option.
4. **Lips from the phones actually spoken**: a pronunciation lattice aligned on synthetic speech, a
   constrained trajectory with hard must-hit events, and **personal coarticulation parameters per
   articulatory class that transfer across languages** (L59, L61, L65).
5. **Deixis bound to a live web lesson and solved for the observer** (L76): the arm line lands on the exact
   element of the animation step, checked by a model of how a student reads a point, with automatic
   disambiguation when elements are dense.
6. **Correctness-contingent listening with a teacher's wait time** (L85, L86): agreement only after a final,
   confident, graded transcript, and question-aware waiting instead of the shortest gap.
7. **Gestures as validated goal programs over a measured skeleton**, solved every frame along task-space
   paths with springs, styled by measured habits, with no motion clips (L74–L83).
8. **A self-grading, time-budgeted build** that retries only the layers upstream of a failing gate and
   otherwise names the missing photo, with a **fixed-point gate** that rebuilds the measurements from the
   model's own renders and needs no bench people (L92, untested).
9. **Attention sharing beside a moving lesson** driven by the lesson's own step events (L73), and
   **divergence deixis**: a wrong answer is met by a look and a point at the step where the student's trace
   first differs from the lesson's, not by a face (L86, untested).

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
(1999) spatial frequency bandwidth used in the recognition of facial images, *Vision Research* 39.

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

**Teaching.** Stull, Fiorella, Mayer (2018) an eye-tracking analysis of instructor presence in video
lectures, *Comput. Hum. Behav.* 88. Kuang, Wang, Xie, Mayer, Hu (2023) effect of the instructor's eye gaze on
student learning from video lectures, *Educ. Psychol. Rev.* 35(4) (abstract). Lawson, Mayer et al. (2021) the
positivity principle, *ETR&D* (doi 10.1007/s11423-021-10057-w). Davis (2018) pedagogical agent gesture
(secondary source). 2607.28203, 2602.18457 (students and AI-made instructional video). 2412.10384, 2304.03784
(AI vs. human instructional video). 2505.06676. Eccles School (University of Utah) and SBS Cultural Atlas
etiquette guides for India (weak sources).

**Evaluation.** 2208.10441, 2308.12646, 2608.10839 (GENEA challenges). 2101.03769 (gesture evaluation
review). 2605.06063 (avatar representation in gesture evaluation). Ho and MacDorman (2017) measuring the
uncanny valley effect, *IJSR* 9.

**Internal documents.** `docs/pratibimb/BRIEF.md`, `LAYERS.md`, `ARCHITECTURE.md`, `ENGINE.md`, `SPEC.md`,
`TRAINING.md`, `PACK_FORMAT.md`, `PAPER_CHANGELOG.md`; code in `scripts/pratibimb/engine/` and
`scripts/teacher/maker/`.
