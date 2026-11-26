# Pratibimb: a layered, measurement-only pipeline that turns a phone capture into a painted, talking, gesturing digital teacher

*NexoraGuru research paper, design version 1 (2026-11-26). Supersedes nothing: it specifies the black box
described in `BRIEF.md`, refines the 64-layer plan in `LAYERS.md`, and keeps the engine choices in
`ENGINE.md` and the rules in `SPEC.md`. Where those files disagree, the brief wins (§2.4 lists the
disagreements found).*

---

## Abstract

We describe Pratibimb, a system that takes a consenting adult's ordinary capture (photos and/or a short
phone or webcam video, plus their voice) and builds one digital human of that person: waist up, facing the
student, recognisable as them, drawn in a hand-painted look, speaking in their cloned voice with accurate lip
sync in any language, gesturing with arms and five-finger hands, showing emotion, listening and reacting, and
conversing as a teacher through the site's tutor ("Guru"). The system is built as **98 layers in 11 stages**.
Each layer has one input, one output, a stated method with its research basis, its defaults, a fallback, and
a measurable gate that must pass before its output is used.

Three constraints shape the design. (1) **No photo pixels are reproduced**: from the capture we learn only
measurements (3D shape, proportions, bone lengths, motion habits) and colours (albedo and region palettes),
and we prove it with a band limit and a patch-copy test on every build. (2) **Any gesture without an
animation library**: actions are written as short goal programs (look at X, point at lesson element Y, count
three, namaste) and solved at run time by inverse kinematics under joint limits, collision and balance
constraints, styled by the person's own measured movement habits. (3) **Build in 3–4 minutes on one rented
GPU and play at 30 fps in an ordinary laptop's browser**: everything heavy is learned once as shared priors;
per person we only fit and bake; the runtime is a small skinned mesh with a painted shading model, not a
neural renderer.

The main new ideas are: measurement-only appearance with a verifiable no-copy gate; a painted look whose
brush strokes are anchored to the surface (so frames look painted but do not flicker); lip-sync gates per
sound class (closures, lip-teeth contact, rounding) that work in any language through IPA and include Hindi
rules; deictic gestures that land on the exact element of the lesson animation on screen; listening
behaviour that is contingent on whether the student is right (the teacher never nods at a wrong answer); and
a build that grades itself on held-out frames and retries or asks for the missing photo. Most individual
techniques are known; we state plainly which parts are new (§9.3). Status: 15 layers exist in code and 45 in part (`scripts/pratibimb/engine/`, `scripts/teacher/maker/`); the
other 38 are specified here and still to build (index in §5.12).

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
person can be rebuilt in minutes whenever the shared priors improve, without a new recording.

This paper is written as an engineering specification in research form, so that every layer can be built,
tested and replaced independently. It follows a design-science method (§3): each layer is an artefact
with a gate; a layer is "done" only when its gate passes on the bench (§8).

---

## 2. Problem statement and requirements

### 2.1 Input (fixed: the capture we already take)

| Source | What we extract | Used for |
|---|---|---|
| Guided scan or photos (front, left, right, up, down, smile, "aah", brows) | 478 face points per view, head pose | 3D face shape and proportions |
| The same, plus optional video | 52 expression values per frame; blinks, nods, mouth range | Personal expression model and motion habits |
| Waist-up shot | 33 body points, 21 points per visible hand, silhouettes | Skeleton, bone lengths, body volume |
| Colour measurements | Skin, iris, lips, brows, hair colour; hair outline and length; glasses, facial hair | Materials, hair, accessories |
| Voice (consent clip and any speech) | Speaker identity, pitch range, speaking rate | Voice clone, prosody style |

No new long recording is required. Video is optional (many people cannot film themselves); it improves
the expression model and the motion habits.

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
   memorised (made testable by L45).
3. **No outside body or face model with a restrictive licence.** No FLAME, SMPL/SMPL-X, MANO, original 3DGS
   code, insightface, nvdiffrast, F5-TTS, MMS aligners (`SPEC.md` §2).
4. **Build ≤ 3–4 minutes** per person on one rented GPU (24 GB class).
5. **Playback 30 fps in a browser** on an ordinary laptop (integrated GPU), 720p panel.
6. **Consent first**: adults only, their own face and voice, spoken consent matched to the face, one-tap
   delete, revocable.

### 2.4 Inconsistencies found in the existing documents (for the owner)

- `BRIEF.md` fixes the look as the hand-painted style of reference sheet 1–8 (realistic proportions, painted
  skin and hair, dramatic key and rim light), but its part table still says "stylised to anime (larger eyes,
  simpler nose)" and "anime eyes", left from the earlier anime choice. This paper follows the newer sentence:
  **realistic proportions with a mild, likeness-constrained stylisation** (L25), painted shading (Stage F).
  The style slider in L25 can still reach the anime proportions if the owner wants them.
- `SPEC.md` §0 asks for a "generative digital human" whose frames are drawn fresh from the person's photo
  and video; `BRIEF.md` (later) forbids using photo pixels. The Living Portrait (`portrait.py`) re-animates
  the person's own pixels; under the brief it is kept **only as a bench baseline** (a likeness ceiling and
  a lip-sync reference), never as the shipped output.
- The identity pack stores `face/texture.png` (pixels merged from views). Under the brief the shipped model
  must not use it; L44–L45 use it only as a measurement source for albedo statistics.
- The lab player (`player/retarget.js`) retargets CC0 animation clips. The brief asks for gestures without
  an animation library; those clips stay as a lab comparison only.

### 2.5 Measurable success criteria (release gates for the whole system)

| # | Criterion | Measure | Target |
|---|---|---|---|
| S1 | Likeness (machine) | SFace cosine between neutral, front-lit renders and the person's held-out photos, as a share of the photo-to-photo ceiling; impostor controls from the other bench people | ≥ 0.90 of ceiling; every impostor below the same-person line (0.363) |
| S2 | Likeness (human) | People who know the person pick their render from a lineup of 4 bench renders of the same sex | ≥ 90% correct (chance 25%) |
| S3 | Lip closures | Share of p/b/m (and प फ ब भ म) with full lip closure for ≥ 1 frame inside the phone ±20 ms | 100% |
| S4 | Lip-teeth contact | f/v (and व as [ʋ]) with lower lip at the upper teeth | ≥ 95% |
| S5 | Audio–video offset | Measured in the browser (audio clock vs. rendered mouth) | within ±40 ms, lips never > 50 ms late |
| S6 | Mouth range | Per-person mouth opening amplitude vs. their own held-out speech | within ±15% |
| S7 | Gesture validity | Every action in the action library: joint limits, self-penetration | 0 violations |
| S8 | Pointing accuracy | Fingertip ray hits the target element's box on screen | ≥ 98% of points; centre error < 2% of panel width |
| S9 | Naturalness | GENEA-style human-likeness and appropriateness ratings (§8.4) vs. a real teacher video | within 1 scale point; ours ≥ "rule-based" ablation |
| S10 | Responsiveness | Student stops talking → teacher's first visible reaction / first audio | ≤ 300 ms / ≤ 1.0 s (median) |
| S11 | Barge-in | Student speaks over her → her audio fades | ≤ 300 ms after the student's onset |
| S12 | Pedagogical honesty | Nods or "haan" after a wrong student answer | 0 |
| S13 | Build time | Pack upload → signed model with report, one 24 GB GPU | median ≤ 210 s, p95 ≤ 240 s |
| S14 | Playback | 30 fps at 720p on an Intel Iris Xe-class laptop in Chrome; p99 frame ≤ 40 ms | pass |
| S15 | No pixel copy | L45 patch-copy test and band-limit check | pass on every build |
| S16 | Fairness | S1 and S2 per Monk Skin Tone group, sex and age band | no group more than 5 points below the mean |
| S17 | Provenance | Every weight and asset in the model traces to a commercial-OK source | 100% (else the site refuses to publish) |

---

## 3. Innovation method

### 3.1 Design science, build → evaluate cycles

We follow design-science research (Hevner et al. 2004; mapped to software engineering in arXiv 1904.12742;
taught as a method in 2407.09844). Each layer is an artefact with (a) a requirement drawn from §2, (b) a
build, (c) an evaluation against a **gate** that is a number with a threshold, measured on the bench (§8)
and on held-out data, and (d) a recorded decision. A layer that fails its gate does not ship; the build
falls back to the layer's stated fallback, and the build report names it. The bench run is automatic and
runs on every change (L98).

### 3.2 TRIZ: removing contradictions instead of trading them off

TRIZ (Altshuller) treats a hard design problem as a contradiction between two requirements and looks for a
principle that removes it (separation in time, space, condition or scale; intermediaries; prior action;
and so on). Recent work automates the search with language models (AutoTRIZ 2403.13002, TRIZ Agents
2506.18783, TRIZ-GPT 2408.05897); we used the method by hand, with those papers as checklists. The
contradictions and their resolutions:

| # | Contradiction | TRIZ principle | Resolution in Pratibimb |
|---|---|---|---|
| C1 | Likeness needs the person's appearance **vs.** no photo pixels may be used | Separation by scale (#1 segmentation; "separate the property from the carrier") | Likeness lives mostly in *geometry* (face shape, proportions, hair silhouette) and *low-frequency colour*. We learn exactly those and cap the colour bandwidth; high-frequency detail is *painted* by our shader, not copied (L44–L47, L45 proves it). |
| C2 | Any gesture **vs.** no animation library or animator | Prior action (#10) + dynamism (#15) | Actions are goal programs solved at run time (IK + limits + priors). The "library" holds goals, not motion (L80–L89). |
| C3 | Quality **vs.** an ordinary laptop | Separation in time (#10 prior action) | Heavy learning once (shared priors), fitting at build time, a small explicit model at run time (§6, §7). |
| C4 | Painted look every frame **vs.** temporal stability (painted filters flicker) | Separation in space (#17 another dimension) | Strokes live in object space (anchored to the surface and moving with it), screen-space filtering only smooths within them (L58–L59, L64). |
| C5 | Lips right in any language **vs.** no lip data for most languages | Intermediary (#24) | All languages pass through IPA phones; mouth shapes depend on articulation, not language (L65–L71). |
| C6 | Respond fast **vs.** think well | Preliminary action (#10), partial action (#16) | Visible pre-reaction at 250 ms (breath, brow), first clause streamed, the rest planned while speaking (L93, L95). |
| C7 | Expressive listening **vs.** never misleading the student | Separation by condition | Listener reactions are gated by the grader's verdict: agreement signals only after a correct step (L92). |
| C8 | A cloned voice and face are useful **vs.** they can be misused | Self-service (#25) and "the other way round" (#13) | The model carries its own consent record, identity lock, signature, watermark and visible label; it refuses to play outside the site (L1–L3, L69, L63). |
| C9 | Build quickly **vs.** perfect result | Feedback (#23) | The build grades itself on held-out frames and spends its remaining time budget only on failing layers (L98). |

### 3.3 Recombination

Creative results usually come from recombining proven pieces in a new arrangement (discussed for AI systems
in 2405.01453). Pratibimb recombines: dense-landmark face fitting (2204.02776), personalised blendshapes
(2007.06759, 2010.00560), anthropometric skeletons, heat-diffusion skinning, NPR line drawing (1810.01175),
anisotropic Kuwahara filtering, dominance-based coarticulation, voice-activity projection for turn-taking
(2403.06487), and an LLM tutor, under one shared clock and one set of explicit controls.

---

## 4. System overview

### 4.1 Stages

```
            BUILD (once per person, ≤ 4 min on one GPU)                      PLAY (browser, 30 fps)
 ┌──────────────────────────────────────────────────────────────┐   ┌──────────────────────────────────────┐
 │ A  Consent & provenance  L1–L3                               │   │ J  Listen & converse   L90–L95       │
 │ B  Capture & reading     L4–L16   (on device + worker CPU)   │   │      student audio → turn state,     │
 │ C  Shape                 L17–L33  (who they are: geometry)   │   │      reactions, Guru → script        │
 │ D  Surface & rig         L34–L41  (one skinned mesh)         │   │ G  Voice               L65–L69       │
 │ E  Appearance            L42–L55  (colours, eyes, mouth,     │──►│      text → IPA → cloned audio       │
 │                                    hair, clothes)            │   │ H  Lips & face         L70–L79       │
 │ F  Painted look (bake)   L56–L64                             │   │ I  Body action         L80–L89       │
 │ K  Gates & packaging     L97–L98                             │   │ F  Painted renderer    L56–L64       │
 └──────────────────────────────────────────────────────────────┘   │ K  Clock & delivery    L96           │
                                                                    └──────────────────────────────────────┘
```

Stage G's voice reference, Stage H's mouth ranges and Stage I's skeleton limits are prepared at build time;
the stages on the right run at play time on the person model the build produced.

### 4.2 Data flow at run time (one clock: the audio)

```
 student mic ─► L90 VAD/ASR ─► L91 turn state ─┬─► L92 listening reactions (gated by Guru's grader) ──┐
                                               └─► L93 Guru brain ─► validated script clauses        │
                                                     │ L94 barge-in, L95 latency hiding               │
            ┌────────────────────────────────────────┴───────────────────────┐                        │
            ▼                                                                ▼                        ▼
   L65 text norm ─► L66 G2P (IPA) ─► L67 cloned voice ─► audio ─► L96 clock (master)     L80 action language
                                        │ phone times (L68), L69 watermark  │ time t     L81 gesture plan
                                        ▼                                   │            L82 target (DOM → 3D)
   L70 visemes ─► L71 coarticulation ─► L72 jaw/lip ─► L73 tongue ─► L74 refine          L83 IK, L84 hands
   L75 prosody ─► L76 emotion, L77 blinks/brows, L78 head, L79 gaze ──┐     │            L85 phases, L86 balance
                                                                      ▼     ▼            L87 collisions, L88 idle
                                     L89 mixer: pose(t) = {52 face values, jaw, tongue, eyes, skeleton} ◄──┘
                                                                      ▼
                    L40 skinning + morphs ─► L53 hair / L55 cloth (XPBD) ─► L56–L64 painted frame ─► panel
```

### 4.3 The person model (what a build produces)

One signed file (`.pbmodel`, an extension of the identity pack format in `PACK_FORMAT.md`):
mesh and LODs (≤ 60k triangles at LOD0), skin weights, 52 personal expression targets + correctives, the
skeleton with bone lengths and joint limits, hand parameters, region-palette albedo (band-limited, ≤ 512²),
feature curves (brows, lids, lips), eye, teeth and tongue parameters, hair cards, wardrobe fit, motion-habit
profile, voice reference (speaker embedding and optional adapter), consent record, provenance ledger and
the build report. Target download size ≤ 8 MB.

---

## 5. The layers

### 5.0 How each layer is specified

Every layer below gives: **Purpose**; **In → Out**; **Method** (enough to implement); **Research** (cited;
papers are idea sources only); **Ours** (what is new or specific to us, if anything); **Defaults**;
**Fails → fallback**; **Gate** (measurable pass/fail); **Status** (*exists* = in code today, with the file;
*partial*; *to build*). Units: metres for the body, "head units" (1 = outer eye-corner distance, ≈ 9 cm)
for the face, seconds for time, 25 or 30 fps for motion. Expression values follow the 52 ARKit names that
MediaPipe's face landmarker outputs (2006.10962 for the face mesh). "Bench" means the 8-person bench of §8.2;
"held-out" means frames from the end of the capture or another day, never used for fitting.

---

### Stage A: Consent, identity and provenance (L1–L3)

#### L1 Consent capture and verification
- **Purpose.** Nothing is built unless the person shown agreed, on camera, in their own words.
- **In → Out.** Consent clip (video + audio), account, declared age ≥ 18 → signed consent record
  `{who, by_whom, sentence, transcript, time, clip_hash, scope}`.
- **Method.** The person reads a fixed sentence naming NexoraGuru, the purpose (teaching presenter) and
  the right to delete. Speech recognition (L90's recogniser) transcribes it; a normalised word error rate
  against the sentence must be low. Liveness: the face must move (blink, mouth motion correlated with the
  audio envelope, r ≥ 0.3), which rejects a still photo held to the camera. "Someone you know" mode records
  that person's own sentence, never the uploader's.
- **Research.** Consent and authorised use of synthetic talking heads (avatar fingerprinting 2305.03713);
  ethics of identity in synthetic media (2604.12490, 2104.05030). India's IT Rules (2026) labelling duty,
  as noted in `SPEC.md`.
- **Ours.** Audio–mouth liveness from the same signals we already extract; scope stored with the record
  (teaching presenter only).
- **Defaults.** WER ≤ 0.25 after normalisation; liveness r ≥ 0.3; age is declared (we do not estimate age
  from faces: estimates are biased and unreliable).
- **Fails → fallback.** Ask to record again with the reason in plain words; nothing is built.
- **Gate.** 100% of builds have a valid record; bench replay attacks (photo, screen replay of someone
  else) rejected 100%.
- **Status.** *Partial*: consent record and clip in `worker.py`/`pack.py`; ASR check and liveness *to build*.

#### L2 Identity lock
- **Purpose.** The face in the consent clip must be the face the model is made of, and every later build
  must be of the same person.
- **In → Out.** Consent clip frames, capture frames → identity vector (SFace, 128-d), match score, lock.
- **Method.** YuNet face detection, SFace embedding (2205.12010) of the 5 sharpest consent frames and
  of the capture's main person (L6); take the maximum cosine over pairs; also store the mean capture
  embedding in the model as the lock. A rebuild or an imported pack must match the lock.
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
- **In → Out.** Build inputs (datasets, weights, assets, code version) → ledger in the model manifest;
  `publishable: true/false`; label and watermark settings; a deletion key.
- **Method.** Every prior and weight file carries a licence tag; the ledger is the union of tags over the
  build; any tag not in the allow list (`COMMERCIAL_OK` in `build.py`) makes the model research-only and the
  site refuses to publish it. The model is encrypted with a per-person key held by the server; deletion
  destroys the key and the files (crypto-shredding), so stray copies become unreadable.
- **Research.** Provenance tracking for synthetic media (FakeTagger 2009.09869; proactive defence
  2607.20564).
- **Ours.** Licence provenance as a hard build gate, not documentation.
- **Defaults.** Allow list: own consented data, CC0, CC-BY, MIT, Apache-2.0, BSD (§6.3).
- **Fails → fallback.** Research-only model, never shown to students.
- **Gate.** S17: 100% traced; a deletion test leaves no readable model on server or cache.
- **Status.** *Partial*: `--datasets`/`COMMERCIAL_OK` in `scripts/pratibimb/engine/build.py`; signed pack in
  `pack.py`; crypto-shred *to build*.

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
  cell with the largest expected gain to the gates that are weakest (e.g., the side silhouette for L24).
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
  webcam frames otherwise lose accuracy); points mapped back to the full frame.
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
- **Purpose.** Finger lengths, palm size and the person's hand habits.
- **In → Out.** Frames → 21 points per visible hand, handedness, confidence.
- **Method.** MediaPipe Hands (2006.10214) on crops around the wrist points; keep hands that are
  unoccluded (all 21 points inside the frame, confidence ≥ 0.8, not overlapping the face box).
- **Research.** MediaPipe Hands 2006.10214; hand-pose review 1604.06195.
- **Ours.** —
- **Defaults.** ≥ 10 good hand frames to measure fingers.
- **Fails → fallback.** Proportional hands (L30 fallback), flagged in the report.
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
- **Fails → fallback.** Face-oval-only colours; hair from the default shape for the measured length.
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
- **Ours.** Accessories stored as parameters, not pixels; redrawn by our own generators (L33).
- **Defaults.** Region thresholds learned on the synthetic set (§6.1).
- **Fails → fallback.** Ask "Do you wear glasses in lessons?" in the Studio.
- **Gate.** Bench: glasses and facial-hair presence correct 8/8.
- **Status.** *To build*.

#### L15 Voice extraction and quality
- **Purpose.** A clean reference for the voice clone and the person's prosody statistics.
- **In → Out.** Audio tracks → 16 kHz mono speech, speaking spans, SNR, pitch range, rate.
- **Method.** Voice activity detection; SNR from speech vs. non-speech energy; F0 by autocorrelation
  (YIN-style) over voiced frames; syllable rate from energy peaks. Choose the best 10–30 s for the voice
  reference.
- **Research.** Voice cloning needs clean references (survey 2505.00579).
- **Ours.** —
- **Defaults.** SNR ≥ 20 dB for the reference.
- **Fails → fallback.** Ask for a 30 s reading in a quiet room; default Indian voice until then.
- **Gate.** Reference ≥ 10 s at SNR ≥ 20 dB.
- **Status.** *Partial*: `voice.wav` and spans in `capture.py`; SNR and pitch *to build*.

#### L16 Motion-habit profile
- **Purpose.** How this person moves: the "style" for every motion layer.
- **In → Out.** Per-frame values and pose → profile: blinks/min and blink duration; head speed and range
  per axis; nod rate; mouth range per viseme class while speaking; smile and brow-raise share; hand
  visibility, height and gesture rate; pause lengths.
- **Method.** Event detection on the calibrated values (blink = mean eyeBlink > 0.5); robust statistics
  (median, 10th/90th percentiles). Mouth range per class uses L68's phone times when the capture has speech.
- **Research.** Blink statistics in conversation (Bentivoglio et al. 1997); speaking style capture (VOCA
  1905.03079); personalised audio-driven motion by retrieval (2604.23692).
- **Ours.** Per-viseme-class mouth range from the person's own speech (drives L72).
- **Defaults.** Population values when a statistic has fewer than 20 events.
- **Fails → fallback.** Population defaults.
- **Gate.** Blink rate on two halves of the capture agree within ±20%.
- **Status.** *Exists* in part: profile in `capture.py`; per-class range *to build*.

---

### Stage C: The person's shape (L17–L33)

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
- **Gate.** Held-out face error < 2% of eye distance (measured 1.05%).
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

#### L20 Personal expression basis
- **Purpose.** This person's own way of smiling, opening the mouth, raising brows.
- **In → Out.** Canonical-frame face per frame + 52 calibrated values → linear map $F(b) = \bar F +
  \sum_k b_k D_k$ (52 personal deltas $D_k$).
- **Method.** Ridge regression $W = (X^\top X + \lambda I)^{-1} X^\top Y$ with $X = [b, 1]$, $Y$ the flattened
  local faces. Values the person never showed get a population delta (from the synthetic set, scaled to
  their face) blended by a confidence weight equal to the value's observed range.
- **Research.** Personalised blendshapes (2007.06759, 2010.00560); FLARE (2310.17519); example-based
  rigging (Li et al. 2010).
- **Ours.** Population fallback weighted by observed range, so unseen expressions stay plausible.
- **Defaults.** λ = 0.05·n.
- **Fails → fallback.** Population deltas only.
- **Gate.** Held-out shape error < 2%; mouth opening follows the real mouth r ≥ 0.9 (measured 0.97).
- **Status.** *Exists*: ridge map in `rig.py`; population fallback *to build*.

#### L21 Expression correctives
- **Purpose.** Linear blendshapes fail on combinations (smile + "oo"); add the missing correction.
- **In → Out.** Residuals of L20 → corrective deltas for value pairs.
- **Method.** For pairs $(i,j)$ that co-occur in ≥ 30 frames, fit $Y - F(b) \approx \sum_{(i,j)} b_i b_j C_{ij}$
  by ridge regression, keeping only pairs that reduce held-out error.
- **Research.** Corrective shapes in skinning and blendshape rigs (2105.02451; Lewis et al. 2014).
- **Ours.** Correctives only where the person's own data supports them.
- **Defaults.** ≤ 24 corrective pairs.
- **Fails → fallback.** No correctives.
- **Gate.** Combination error drops ≥ 20% on held-out frames, else none kept.
- **Status.** *To build*.

#### L22 Symmetry and asymmetry
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

#### L23 Face detail curves
- **Purpose.** Lines that make a face theirs: nasolabial folds, eye bags, forehead lines, dimples.
- **In → Out.** Views + face mesh → a small set of crease curves on the mesh with strength and where
  they appear (always, or only with smile).
- **Method.** On aligned, light-normalised face crops, detect ridge/valley lines (Hessian of luminance at
  two scales); keep lines that appear at the same mesh position in ≥ 3 views; store them as curves in mesh
  barycentric coordinates, with a strength per expression value (regressed against $b$). Painted by L60 as
  lines, never as pixels.
- **Research.** Dense-landmark detail (2204.02776); implicit detail recovery (2203.09692); SPARK
  (2409.07984).
- **Ours.** Detail as *vector curves bound to the mesh*, which keeps it pixel-free and paintable.
- **Defaults.** ≤ 12 curves; strength < 1 never darker than the shading band.
- **Fails → fallback.** None (a clean face).
- **Gate.** Curves stable across views (mean positional disagreement < 3% of eye distance) and the owner's
  side-by-side check (§8.3) prefers with-curves for ≥ 6/8 people.
- **Status.** *To build* (`solve_detail.py` is the older pixel-based version).

#### L24 Full head completion
- **Purpose.** A closed head (skull, back, crown) from a mostly frontal capture.
- **In → Out.** Canonical face + side silhouettes → closed head surface.
- **Method.** Our own statistical head prior: principal components of closed heads built from (a) the
  synthetic CC0 MakeHuman heads (§6.1) and (b) consented bench people. Fit by least squares: face points
  as hard-ish constraints, side and top silhouettes (L12) as a chamfer loss on the projected contour; 30
  PCA coefficients with a Gaussian prior.
- **Research.** Complete head models (1911.08008); combining face and head models (1903.03785); SPHEAR
  (2311.02461); one-shot full heads (2604.13856, 2602.11693) for ideas only.
- **Ours.** A head prior trained only on CC0 synthetic and consented heads (no FLAME).
- **Defaults.** 30 components, prior weight 1.0.
- **Fails → fallback.** The ellipsoid shell of `anime.py` / `rig.py`.
- **Gate.** Side-silhouette IoU ≥ 0.9.
- **Status.** *Partial*: ellipsoidal shell in `rig.py` and `anime.py`; prior *to build*.

#### L25 Likeness-constrained stylisation
- **Purpose.** The painted look has gently stylised proportions; stylisation must never cost likeness.
- **In → Out.** Neutral face, style $s\in[0,1]$ → stylised face map $M_s$ (a 468×468 linear map per axis),
  applied to every expression.
- **Method.** Smooth local scalings around the eyes, nose, mouth and jaw (as in `anime.py`), written as a
  linear map so all 52 expressions remain morph targets. Choose $s$ by a line search that maximises
  "painterly" strength subject to the likeness gate: render the neutral face at $s$, compute SFace
  similarity to the held-out photos as a share of the ceiling, and stop at the largest $s$ above 0.92.
- **Research.** Stylised avatars that keep identity: AgileAvatar (2211.07818), ToonifyGB (2505.10072),
  exemplar-based portrait stylisation (2104.14559), LeGO (2403.15227).
- **Ours.** The style strength is set by a likeness constraint per person, not by taste.
- **Defaults.** $s_{max}$ = 0.35 for the painted look (realistic proportions); 0.8 reproduces the
  earlier anime proportions.
- **Fails → fallback.** $s = 0$.
- **Gate.** S1 holds at the chosen $s$.
- **Status.** *Partial*: `stylise_map` in `anime.py`; likeness-constrained search *to build*.

#### L26 Ears
- **Purpose.** Ear size and position are identity cues in three-quarter views.
- **In → Out.** Side views, head → ear placement, size and outline (parametric ear).
- **Method.** A parametric ear (helix, lobe, concha as a low-poly template we model ourselves) placed by
  proportion (top at brow height, bottom near the nose base) and refined to the side silhouette and the
  ear region of the hair mask.
- **Research.** Ears as head-model components (1911.08008).
- **Ours.** Our own ear template, CC0.
- **Defaults.** Length 0.68 × nose length; 15° backward tilt.
- **Fails → fallback.** Proportional placement; hidden under hair if the mask says so.
- **Gate.** Ear in the profile view within 3 px at 512 px.
- **Status.** *To build*.

#### L27 Neck and throat
- **Purpose.** A neck of the right width and length joining head and torso.
- **In → Out.** Head, shoulders, silhouettes → neck profile (radius along its length).
- **Method.** Elliptical sections from the jaw to the clavicle; width from the front silhouette between
  jaw and shoulders; length from L10. Adam's apple as a small bump for male-presenting people.
- **Research.** Anthropometric tables (Drillis and Contini 1966).
- **Ours.** —
- **Defaults.** Neck radius 0.145 × shoulder width (in `body.py`).
- **Fails → fallback.** Ratio defaults.
- **Gate.** Front silhouette IoU ≥ 0.9 in the neck band.
- **Status.** *Partial*: `neck_r` in `body.py`; silhouette fit *to build*.

#### L28 Skeleton and bone lengths
- **Purpose.** The upper-body skeleton the person moves with.
- **In → Out.** Bone lengths (L10) → joint hierarchy: pelvis, spine, chest, neck, head, clavicles,
  shoulders, elbows, wrists, and 5 fingers × 4 joints per hand (`build_skeleton` in `body.py`).
- **Method.** Measured lengths where known; the rest from anthropometric ratios scaled to the shoulder
  width; clamp each ratio to the 5th–95th adult range.
- **Research.** Anthropometric ratios (Drillis and Contini; NASA-STD-3000); bone-based pose decomposition
  (2002.10322).
- **Ours.** —
- **Defaults.** As in `proportions()`.
- **Fails → fallback.** Ratios only.
- **Gate.** Skeleton reprojection onto frames < 4% of shoulder width.
- **Status.** *Exists*: `body.py`.

#### L29 Posture and spine
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

#### L30 Hand skeleton and finger lengths
- **Purpose.** Hands that look like theirs and bend like hands.
- **In → Out.** Hand points (L11), palm size → per-finger phalanx lengths, metacarpal spread, thumb
  carpometacarpal axis.
- **Method.** Phalanx lengths = median distances between consecutive points over good hand frames,
  scaled metrically via the wrist–palm distance against the forearm length; the thumb CMC joint gets two
  axes (flexion and abduction) oblique to the palm.
- **Research.** Anatomical hand models: PIANO (2106.10893), NIMBLE (2202.04533) (papers only;
  MRI-derived models are non-commercial); finger biomechanics with IK (2605.09258).
- **Ours.** Hands from the person's own points, with no outside hand model.
- **Defaults.** Ratio defaults in `build_skeleton`.
- **Fails → fallback.** Ratios.
- **Gate.** Fingertip reprojection < 5 px at 512 px on held-out hand frames.
- **Status.** *Partial*: ratio hands in `body.py`; measured lengths *to build*.

#### L31 Joint limits and pose plausibility
- **Purpose.** No impossible pose, ever.
- **In → Out.** Anatomy → per-joint limits (swing cone + twist range) and a plausibility score $p(\theta)$.
- **Method.** Shoulders and wrists use swing–twist decomposition with an elliptical swing cone; elbows and
  finger joints are hinges with ranges; coupling rules for fingers (DIP ≈ ⅔ PIP). Plausibility: distance
  to the manifold of captured poses, learned as an unsigned distance field over joint rotations.
- **Research.** Biomechanical limits (2509.06607, 2605.09258); NRDF (2403.03122) for distance-field pose
  priors; hand synergies (Santello et al. 1998).
- **Ours.** —
- **Defaults.** Elbow 0–150°; MCP −20–90°; PIP 0–110°; DIP 0–80°; wrist flexion −70–80°.
- **Fails → fallback.** Hard clamp.
- **Gate.** S7: 0 library poses outside limits.
- **Status.** *To build*.

#### L32 Torso and arm volume
- **Purpose.** The body's thickness and shape.
- **In → Out.** Skeleton + silhouettes → radius profiles (ellipse sections) per bone chain.
- **Method.** "Generalised tubes": rings of points along each chain, radii from anthropometric profiles
  scaled to the person; front silhouette widths fit the x radii; depth from population ratios with sex
  and build (no side-view body photo is required).
- **Research.** Silhouette carving; anthropometric estimation from images (2512.06434).
- **Ours.** Tube body from measurements only (exists).
- **Defaults.** `torso_profile` in `body.py`.
- **Fails → fallback.** Ratios.
- **Gate.** Front silhouette IoU ≥ 0.9.
- **Status.** *Partial*: `tubes_for`, `torso_profile` in `body.py`; silhouette fit *to build*.

#### L33 Glasses and facial-hair geometry
- **Purpose.** Redraw L14's accessories as our own geometry.
- **In → Out.** Accessory parameters → glasses mesh (rims, bridge, temples) fitted to the head; facial
  hair as dense short cards or a painted region on the face.
- **Method.** Glasses: superellipse rims swept as tubes, bridge on the nose points, temples to the ears
  (L26); lens as a transparent layer with a faint highlight. Facial hair: regions on the face mesh with
  density and colour; at "decent" quality, a painted region with stroke texture (L58) and a soft edge.
- **Research.** Strand-level facial hair capture (2606.08041) for the regions only.
- **Ours.** Accessories rebuilt from parameters.
- **Defaults.** Rim thickness from L14; lens tint none.
- **Fails → fallback.** No accessory (report says so).
- **Gate.** Owner's side-by-side check: accessories judged "right" for 8/8 bench people.
- **Status.** *To build*.

---

### Stage D: One surface and its rig (L34–L41)

#### L34 Watertight surface and head–body join
- **Purpose.** One closed, manifold mesh of head, neck, torso, arms and hands.
- **In → Out.** Head (L24), ears (L26), neck (L27), tubes (L32), hands → one mesh.
- **Method.** Express each part as a signed distance function (the head mesh by its winding-number
  distance; tubes and hands as swept ellipses); union with a smooth minimum
  $d = -k\log(e^{-d_1/k}+e^{-d_2/k})$ so the neck blends into head and shoulders; extract with marching cubes
  on a 192³ grid (GPU), then keep the original face vertices exactly (the face region is copied from the
  head mesh and stitched along the oval, so the expression map stays valid).
- **Research.** Implicit surfaces and marching cubes (Lorensen and Cline 1987); the smooth-minimum union
  (Quilez; graphics practice, not peer-reviewed).
- **Ours.** Exact face region kept inside an implicit body, so personal blendshapes stay linear in the face
  points.
- **Defaults.** $k$ = 1.5 cm at the neck, 0.5 cm at fingers.
- **Fails → fallback.** Separate parts with overlapping seams (the current `body.py` tubes).
- **Gate.** Manifold, no holes, no self-intersection in the rest pose.
- **Status.** *To build* (parts exist separately in `anime.py` and `body.py`).

#### L35 Remeshing and edge loops
- **Purpose.** Triangles that deform well: dense where things bend, sparse elsewhere.
- **In → Out.** Mesh → isotropic remesh with density targets.
- **Method.** Isotropic remeshing (split/collapse/flip/relax) with a sizing field: fine at mouth, eyes,
  knuckles and elbows; coarse on the back and torso; feature-preserving at the face stitch.
- **Research.** Botsch and Kobbelt (2004) remeshing.
- **Ours.** Sizing field derived from joint positions and the face's motion variance (where the person's
  face moves most).
- **Defaults.** 45k triangles total; 12k in the face.
- **Fails → fallback.** Marching-cubes mesh with Laplacian smoothing.
- **Gate.** Minimum angle > 20° on 99% of triangles.
- **Status.** *To build*.

#### L36 UV layout
- **Purpose.** Texture coordinates for the small albedo and stroke maps.
- **In → Out.** Mesh → UVs, seams in hidden places.
- **Method.** Charts: face (MediaPipe's canonical UVs kept), head back, torso front/back, each arm, each
  hand; least-squares conformal maps per chart; seams placed behind the hair, under the arms and along
  the sides of the fingers.
- **Research.** LSCM (Lévy et al. 2002).
- **Ours.** —
- **Defaults.** Texel density 2× on the face.
- **Fails → fallback.** Per-vertex colours only (the albedo is band-limited anyway).
- **Gate.** Area stretch < 10% on 95% of triangles.
- **Status.** *To build* (face UVs exist in `pack.py`'s `face/mesh.obj`).

#### L37 Face-to-mesh binding
- **Purpose.** Every face, lid, lip and brow vertex follows the 468 personal points.
- **In → Out.** Mesh + face points → sparse linear map $V = G\,P + d$.
- **Method.** Face vertices are the points themselves; surrounding vertices (head shell, brows, lashes,
  mouth cavity rim) are fixed linear combinations of nearby points with falloff weights, as in `anime.py`.
  Because $G$ is linear, each personal delta $D_k$ becomes a morph target $G D_k$ of the whole head.
- **Research.** Rig-space binding (2003.09820, ideas).
- **Ours.** The binding that turns the person's measured expressions into GPU morph targets (exists).
- **Defaults.** Falloff 2.5 rings beyond the face oval.
- **Fails → fallback.** —
- **Gate.** Max vertex error vs. direct evaluation < 0.1 mm.
- **Status.** *Exists*: `Character.build` in `anime.py`.

#### L38 Skin weights
- **Purpose.** How much each bone moves each vertex.
- **In → Out.** Mesh + skeleton → ≤ 4 weights per vertex.
- **Method.** Heat diffusion from the bones (solve $(-\Delta + H)w_j = H p_j$ per bone with $H$ the
  inverse squared distance to the nearest visible bone), then a learned correction: a small graph network
  trained once on synthetic MakeHuman (CC0) rigs with artist weights predicts a residual; finally
  normalise and keep the top 4.
- **Research.** Pinocchio heat diffusion (Baran and Popović 2007); robust biharmonic skinning (2406.00238);
  learned skinning: VINECS (2307.00842), HumanRig (2412.02317), SkinningNet (2203.04746), RigMo
  (2601.06378).
- **Ours.** Heat diffusion plus a residual net trained only on CC0 rigs.
- **Defaults.** 4 influences; finger weights restricted to their own chain.
- **Fails → fallback.** Plain heat diffusion.
- **Gate.** No tearing or folding (flipped triangles = 0) in every library pose.
- **Status.** *Partial*: ring-to-bone weights for tubes in `body.py`; general weights *to build*.

#### L39 Skinning method: linear and dual-quaternion blend
- **Purpose.** Avoid the "candy wrapper" collapse of twisting wrists and the bulge of dual quaternions.
- **In → Out.** Weights + bone transforms → deformed vertices.
- **Method.** Per vertex, blend linear blend skinning (LBS) and dual-quaternion skinning (DQS) with a
  weight $\alpha$ that is high near twisting joints (forearm, wrist) and low near bending joints (elbow
  crease, knuckles); both computed in the vertex shader.
- **Research.** Dual-quaternion skinning (Kavan et al. 2008); velocity skinning for secondary effects
  (2104.04934).
- **Ours.** Joint-type-dependent blend.
- **Defaults.** $\alpha$ = 0.8 on the forearm, 0.2 at the elbow crease.
- **Fails → fallback.** LBS.
- **Gate.** Volume change at elbows and wrists < 10% across the library poses.
- **Status.** *To build*.

#### L40 Pose correctives and runtime deformer
- **Purpose.** Elbows, shoulders and knuckles keep their shape when bent.
- **In → Out.** Joint angles → corrective shapes; runtime deformation (morphs + correctives + skinning).
- **Method.** For each major joint, a few corrective shapes driven by a radial basis of the joint's swing
  angles, fitted once on synthetic CC0 bodies and scaled to the person; at run time the GPU applies
  52 face morphs, correctives, then LBS/DQS.
- **Research.** Neural blend shapes (2105.02451); pose-dependent deformation distilled for mobile
  (TaoAvatar 2503.17032).
- **Ours.** Correctives as a shared prior scaled by bone lengths (no per-person training).
- **Defaults.** 3 correctives per shoulder, 2 per elbow, 1 per knuckle row.
- **Fails → fallback.** No correctives.
- **Gate.** Silhouette error at 90° elbow bend drops ≥ 20% vs. no correctives.
- **Status.** *To build*.

#### L41 Levels of detail
- **Purpose.** Hold 30 fps on weak GPUs.
- **In → Out.** Mesh → LOD0 (45k), LOD1 (20k), LOD2 (8k) with the face at full detail in all.
- **Method.** Quadric error decimation away from the face, with weights and UVs carried; morph targets only
  on face vertices, which are never decimated.
- **Research.** Garland and Heckbert (1997); level-of-detail perception for Gaussian crowds (2501.17085).
- **Ours.** Face-preserving LODs.
- **Defaults.** Switch by measured frame time (L96).
- **Fails → fallback.** LOD0 only.
- **Gate.** LOD2 silhouette IoU ≥ 0.97 vs. LOD0 at panel size.
- **Status.** *To build*.

---

### Stage E: Appearance, eyes, mouth, hair and clothes (L42–L55)

The rule of this stage (contradiction C1): we learn **colours and shapes**, never pixels. L45 checks it.

#### L42 Per-frame light estimation
- **Purpose.** Separate the person's colours from the room's light.
- **In → Out.** Frames + posed mesh (normals) → order-2 spherical-harmonic light per frame.
- **Method.** For face-skin pixels with normals $n$ from the posed mesh, solve
  $I(x) \approx a\,(\sum_{lm} L_{lm} Y_{lm}(n))$ jointly for a single skin albedo $a$ and per-frame
  coefficients $L$ (9 per channel) by alternating least squares, with a prior that keeps $L$ near
  "mostly frontal, soft" light.
- **Research.** Spherical-harmonic lighting (Ramamoorthi and Hanrahan 2001); intrinsic decomposition for
  avatars (IntrinsicAvatar 2312.05210; SGIA 2407.15212; FLARE 2310.17519).
- **Ours.** —
- **Defaults.** Order 2; ridge on the non-constant terms.
- **Fails → fallback.** Order 1 (exists).
- **Gate.** Recovered skin albedo agrees across frames: ΔE₀₀ < 3 between the 25th and 75th percentile frames.
- **Status.** *Partial*: order-1 SH in `build.py`.

#### L43 Albedo field
- **Purpose.** The person's colour over the whole visible surface (skin, lips, under-eye, cheeks).
- **In → Out.** Light-normalised frames + UVs → a low-resolution albedo field on the mesh.
- **Method.** Per texel, the weighted median of light-divided colours over frames that see it well
  (weight = cos(view angle) × sharpness × mask confidence), solved as a smooth field: minimise
  $\sum (A(u)-c)^2 + \mu\|\nabla A\|^2$ on the mesh. Then band-limit (L45).
- **Research.** Inverse rendering on avatars (2312.05210, 2407.15212); albedo estimation without
  light-skin bias (2205.03962, 2406.13149, 2411.12002).
- **Ours.** Median over frames plus smoothness, followed by a hard band limit.
- **Defaults.** 256² face chart, 128² elsewhere, before band limiting.
- **Fails → fallback.** Region palette only (L44).
- **Gate.** Mean ΔE₀₀ to measured skin colour (L13) < 3; no texel darker than 3σ of its region (no baked
  shadows).
- **Status.** *Partial*: colour-point appearance in `splats.py`/`build.py` (fits pixels; to be replaced by
  this band-limited field); `pack.py` measures colours.

#### L44 Region palette and skin tone
- **Purpose.** A painter's palette: a few colours per region, which is what a painting of a face uses.
- **In → Out.** Albedo field → regions (forehead, cheeks, nose, lips, under-eye, chin, neck, ears, hands)
  each with base, shadow-side and light-side colours; Monk Skin Tone class.
- **Method.** Regions from the face mesh; per region, k-means (k = 3) in CIELAB over its texels; the shadow
  and light colours shift hue as a painter would (warm lights, cooler, slightly more saturated shadows)
  by a learned shift per Monk class. Skin tone class by nearest Monk swatch in CIELAB.
- **Research.** Skin-tone fairness (2205.03962); Gooch cool-to-warm shading (Gooch et al. 1998).
- **Ours.** Region palette as the shipped colour model (low information by design).
- **Defaults.** 3 colours per region.
- **Fails → fallback.** Single skin colour.
- **Gate.** Region colours stable between two halves of the capture (ΔE₀₀ < 3).
- **Status.** *Partial*: Monk class and colours in `pack.py`.

#### L45 No-copy guard (band limit and patch test)
- **Purpose.** Prove that no photo pixels are on the model.
- **In → Out.** Albedo field, all textures → band-limited textures; pass/fail report.
- **Method.** (1) **Band limit**: low-pass every learned texture so its maximum spatial frequency is
  below $f_c$ cycles per eye distance (detail finer than that can only come from our painted strokes).
  (2) **Patch test**: render the model's albedo in the head frame and compare 16×16 patches with every
  source frame's light-normalised, aligned face by normalised cross-correlation after high-pass filtering
  both; the 99th percentile of the best-match NCC must be below a threshold calibrated on *different*
  people (so it measures copying, not similarity). (3) Clothes and background textures are never
  learned (garments come from the wardrobe, L54).
- **Research.** Nearest-neighbour matching against training images is a common way to audit generative
  models for memorisation (general practice; no single source verified here: **UNVERIFIED**); here it is
  applied to a deterministic pipeline.
- **Ours.** A *verifiable* pixel-free appearance. We did not find this as a stated build check in prior
  avatar work.
- **Defaults.** $f_c$ = 6 cycles per eye distance; NCC threshold = 99th percentile of the cross-person
  distribution on the bench.
- **Fails → fallback.** Halve $f_c$ and repeat; if still failing, region palette only.
- **Gate.** S15 on every build.
- **Status.** *To build*.

#### L46 Feature curves: brows, lids, lip line, lashes
- **Purpose.** Brows, eyes and lips carry most of a face's identity at a glance; draw them crisp.
- **In → Out.** Face points + masks → vector features: brow shapes (upper and lower outline, thickness
  along the brow, colour), lash line weight, lip outline and colour gradient (upper darker), eye-line shape.
- **Method.** Brow outline: from the brow landmark pairs (`BROW_L/R` in `anime.py`) refined to the brow
  mask edge by 1-D search along normals; thickness profile sampled at 9 stations. Lips: the outer and inner
  rings give the outline; colour from L44's lip region.
- **Research.** Line drawings (1810.01175); stylised feature rendering in ToonifyGB (2505.10072).
- **Ours.** Features measured as vectors and painted by our shader.
- **Defaults.** 9 thickness stations per brow.
- **Fails → fallback.** Landmark-only brows.
- **Gate.** Brow-shape IoU ≥ 0.8 vs. the masks in the front view.
- **Status.** *Partial*: brow ribbons from landmarks in `anime.py`.

#### L47 Shine, warmth and subsurface parameters
- **Purpose.** Where the skin shines (forehead, nose) and how warm the light bleed looks.
- **In → Out.** Frames + light → per-region specular strength and roughness; subsurface tint.
- **Method.** Specular strength from residual brightness above the SH-diffuse prediction at the
  highlight positions predicted by L42's dominant light; roughness from the highlight spread; subsurface
  tint as the hue of the shadow-terminator band (redder for most skin).
- **Research.** PBR inverse rendering of avatars (2407.15212); relightable avatars (2312.03704,
  2506.06271) for ideas.
- **Ours.** Only a few scalars per region, painted by L57.
- **Defaults.** Clamp specular so it never exceeds the painted highlight band.
- **Fails → fallback.** Population values per Monk class.
- **Gate.** Highlight position in renders within 5% of eye distance of the measured position on 6/8 bench
  people.
- **Status.** *To build*.

#### L48 Eyes
- **Purpose.** Eyes that look at the student, with the person's iris colour, and never show the inside
  of the head.
- **In → Out.** Eye rings, iris centre and radius, iris colour → two eyeballs (sclera, iris disc with
  layered pattern, pupil, cornea bulge), placed and sized in mm.
- **Method.** Eyeball radius 12 mm; centre behind the iris by the iris–centre distance; iris radius
  measured (L18). The iris is shaded procedurally (radial fibres + limbal ring + darker collarette), in
  the measured colour; the cornea adds a moving highlight from the key light. Rotation by gaze angles
  (L79) with pupil size tied to scene brightness.
- **Research.** Eye modelling (EyeNeRF 2206.08428; Bérard et al. 2014); gaze redirection (2411.12981).
- **Ours.** Measured, procedurally painted iris; no iris pixels.
- **Defaults.** Gaze range ±30° horizontal, ±20° vertical.
- **Fails → fallback.** Dark-brown iris.
- **Gate.** No head-interior pixels visible at ±30° gaze; iris colour ΔE₀₀ < 5 vs. L13.
- **Status.** *Partial*: generated eye spheres and shader eyes in `anime.py`.

#### L49 Eyelids and lashes
- **Purpose.** Lids that hug the eyeball and follow gaze; lashes and blinks.
- **In → Out.** Eye rings, personal expression deltas → lid geometry that slides over the eyeball.
- **Method.** Upper and lower lid vertices are projected onto a sphere 0.5 mm larger than the eyeball
  each frame (so no gap appears); vertical gaze lifts the upper lid by 0.4 × pitch; lash strips are
  ribbons along the upper lid with thickness from L46.
- **Research.** Lid–gaze coupling in eye animation (Bérard et al. 2014; codec avatars with gaze 2008.05023).
- **Ours.** —
- **Defaults.** Lid follow 0.4.
- **Fails → fallback.** —
- **Gate.** No lid–eyeball gap at any gaze in ±30°; full closure at eyeBlink = 1.
- **Status.** *Partial*: lid ribbons in `anime.py`.

#### L50 Teeth, gums and mouth cavity
- **Purpose.** A mouth that is solid inside; teeth visible exactly when lips part.
- **In → Out.** Inner lip ring, jaw → upper teeth (fixed to the skull), lower teeth (on the jaw), gums,
  a dark-shaded cavity.
- **Method.** Teeth arcs as our own parametric arch (width from the mouth-corner distance; height from
  the inner-lip opening in "aah" frames), upper arch fixed to the head, lower to the jaw rotation derived
  from jawOpen; the cavity is a fan from the inner lip ring to points behind the teeth, shaded darker with
  depth (exists in `rig.py`).
- **Research.** Full-head models with teeth (1911.08008); mouth interiors in Gaussian heads (2409.11951).
- **Ours.** Measured arch size; teeth colour from the "aah" frames' teeth region median, band-limited.
- **Defaults.** 8 visible teeth per arch at LOD0.
- **Fails → fallback.** Dark cavity only.
- **Gate.** No see-through mouth at any expression; teeth visible iff inner lips separate > 1 mm.
- **Status.** *Partial*: cavity in `rig.py`; teeth spheres in `anime.py`.

#### L51 Tongue
- **Purpose.** Visible tongue for th, l, t/d and some vowels.
- **In → Out.** Tongue controls (L73) → tongue pose.
- **Method.** A tongue mesh on a 4-bone chain (root, body, blade, tip) with 6 key poses: rest, tip up (t, d,
  n, l), tip between teeth (θ, ð), retroflex (ʈ, ɖ, ɳ: tip curled back), back raised (k, g), and out.
- **Research.** Articulatory models: phoneme-to-articulatory EMA (2408.05641), DYNARTmo (2507.20343);
  tongue reconstruction (2106.12302).
- **Ours.** A retroflex pose for Indian languages.
- **Defaults.** Tongue visible only when jawOpen > 0.15 or tongueOut > 0.
- **Fails → fallback.** Tongue at rest.
- **Gate.** Tongue visible on "th" and "l" in close-up renders; never through the teeth.
- **Status.** *To build* (a tongue shape exists in `anime.py`).

#### L52 Hair shape
- **Purpose.** Their hairstyle, length, parting and volume, as painted locks.
- **In → Out.** Hair masks from several views, hair colour, length, parting → a hair volume and ≤ 300
  locks (tapered, curved ribbons or cards) on the scalp.
- **Method.** (1) Volume: carve a voxel grid around the head with the hair masks from each view (visual
  hull), intersected with a band above the scalp. (2) Guide field: a 3D direction field inside the volume,
  from 2D orientation maps (structure tensor on the hair region, as in `paint.py`) lifted to 3D and
  smoothed, with growth from the parting line. (3) Locks: seed roots on the scalp by Poisson-disk sampling,
  grow each lock along the guide field until it leaves the volume, then fit tapered ribbons. Long hair
  behind the shoulders is generated from the measured length.
- **Research.** Neural Haircut (2306.05872); EfficientMonoHair (2604.05794); hair cards: HairDeck
  (2610.40599), CGHair (2604.03716); anime hairstyles by control points (CHARM 2509.21114); strand-based
  real-time rendering with LOD (2405.10565).
- **Ours.** A pixel-free hair pipeline: only masks, orientation and colour.
- **Defaults.** 180 locks short hair, 300 long; 6 segments each.
- **Fails → fallback.** Template styles (short, bob, long straight, bun, braid) chosen by silhouette match.
- **Gate.** Hair silhouette IoU ≥ 0.8 in front and three-quarter views.
- **Status.** *Partial*: locks from measured length/volume/parting in `make_hair` (`anime.py`); visual hull
  and guide field *to build*.

#### L53 Hair motion
- **Purpose.** Hair that sways a little with the head and never passes through it.
- **In → Out.** Head motion → lock segment positions.
- **Method.** Each lock is a chain of particles with distance constraints and a bending constraint to its
  rest shape (a "ghost" rest configuration keeps the style), solved with extended position-based dynamics
  (XPBD) for 4 iterations per frame in a web worker; collisions against 3 head/neck/shoulder capsules.
- **Research.** Augmented mass–spring hair with a ghost rest shape (2412.17144); XPBD (Macklin et al.
  2016); neural hair simulation (2507.05191) for ideas.
- **Ours.** —
- **Defaults.** Stiffness high near roots, damping 0.2.
- **Fails → fallback.** Rigid hair.
- **Gate.** No hair particle inside a head capsule; stable at 30 fps for 10 min.
- **Status.** *To build*.

#### L54 Wardrobe and garment fit
- **Purpose.** New clothes (Indian and Western) that fit their body; nothing from the photos.
- **In → Out.** Body mesh + outfit parameters (garment type, colour, sleeve, collar, ease) → garment mesh
  skinned to the same bones.
- **Method.** Garments as parametric offset surfaces of the torso and arm tubes (ease factor, hem height,
  neckline curve, sleeve length) plus garment-specific parts (kurta placket, dupatta as a draped strip,
  saree pallu over one shoulder, shirt collar, blazer lapels); skin weights copied from the nearest body
  vertex; a min-distance constraint keeps cloth outside the body.
- **Research.** Garment-aware rigging (TailorRig 2611.02902); bone-driven garment simulation
  (HyperBones 2605.20460); made-to-measure garments (2405.17609, ideas only).
- **Ours.** A wardrobe of parameters with Indian garments.
- **Defaults.** 6 garments at launch: kurta, saree (pallu), shirt, blazer, T-shirt, sweater.
- **Fails → fallback.** Plain shirt.
- **Gate.** No body vertex outside the garment in any library pose.
- **Status.** *Partial*: offset tubes and outfit colours in `body.py`.

#### L55 Cloth motion
- **Purpose.** Folds at elbows and waist; dupatta and pallu that move.
- **In → Out.** Body motion → garment deformation.
- **Method.** Skinned garment plus XPBD on loose parts only (dupatta, pallu, sleeve ends): ≈ 1,500
  particles, distance and bending constraints, capsule collisions; fold detail at elbows as
  angle-driven corrective shapes (painted folds, L58).
- **Research.** XPBD; position-based inelasticity (2405.11694) for ideas.
- **Ours.** Simulate only what flows; skin the rest.
- **Defaults.** 8 iterations, 2 substeps.
- **Fails → fallback.** Skinned only.
- **Gate.** Stable at 30 fps; 0 cloth–body penetrations in the library.
- **Status.** *To build*.

---

### Stage F: The painted look (L56–L64)

The target is the hand-painted style of the brief's reference sheet: realistic proportions, painted skin
and hair with visible brushwork, a dramatic key light and a coloured rim light, strong readable expressions.
It must move like 3D and look painted in every frame, at 30 fps on an integrated GPU. All of it is our own
shader code (WebGL2 first, WebGPU when present). The offline painter `paint.py` is the reference that the
real-time version must match.

#### L56 Lighting rig
- **Purpose.** The light that makes the painted forms read: a warm key, a cool fill, a coloured rim.
- **In → Out.** Site theme (light/dark, accent) → three lights + ambient, fixed in the panel frame.
- **Method.** Key upper-left in front, fill right, rim behind (as `STUDIO` in `twin.py`), with colours
  from the theme palette; the key's direction is fixed relative to the camera so the face never goes dark.
- **Research.** Studio three-point lighting; theme matching per `docs/ui/premium.md`.
- **Ours.** Rim colour follows the site theme (e.g., the Himalaya palette's cool blue at dusk).
- **Defaults.** Key 0.85, fill 0.35, rim 0.35, ambient 0.28 (as in `twin.py`).
- **Fails → fallback.** Default palette.
- **Gate.** Face mean luminance in [0.45, 0.75] for every bench person and theme.
- **Status.** *Exists* in part: `twin.py`.

#### L57 Painted shading model
- **Purpose.** Light and shadow as painted shapes, not smooth CG gradients.
- **In → Out.** Normal, albedo region palette, lights → shaded colour per pixel.
- **Method.** Diffuse term $d = \mathrm{wrap}(n\cdot l)$ passed through a soft step with 2–3 bands
  (smoothstep edges of width 0.08) — the painter's "light, half-tone, shadow". Colour is chosen from the
  region's three palette colours (L44) by band, not by multiplying albedo with light, so shadows are
  cooler and more saturated (Gooch-style). A warm terminator band (subsurface feel, L47 tint) sits between
  light and shadow. Specular is a small painted highlight shape on forehead, nose and lips where L47 says.
  Rim: $r = (1-n\cdot v)^p \cdot \max(0, n \cdot l_{rim})$, coloured.
- **Research.** Cool-to-warm shading (Gooch et al. 1998); toon/cel shading with MToon-like bands (the lab
  `toon.js`); painterly harmonisation (2312.10263, ideas).
- **Ours.** Palette-indexed bands from the person's measured region palette (their colours, painted).
- **Defaults.** 3 bands on skin, 2 on hair and cloth; rim power 4.
- **Fails → fallback.** Two-tone toon shading (current `toon.js`).
- **Gate.** Owner's style check against references 1–8 (§8.3) ≥ 4/5; skin luminance contrast between
  bands ≥ 15%.
- **Status.** *Partial*: MToon-based lab shader in `player/toon.js`; palette bands *to build*.

#### L58 Surface-anchored brush strokes
- **Purpose.** Visible brushwork that stays on the face when it moves (no "shower door" effect).
- **In → Out.** UVs, principal curvature directions, band index → stroke modulation of the shaded colour.
- **Method.** A small tileable stroke atlas (our own painted strokes, 8 shapes × 3 sizes) is splatted in
  **texture space** along a direction field on the surface (principal curvature on the body, the hair
  guide field on hair, radial around the eyes and mouth). At bake time we write a stroke-orientation map
  and a stroke-id map per chart (256² face, 128² elsewhere). At run time the shader samples the atlas
  along that orientation and modulates the band colour by ±6% value and ±3% hue; strokes are larger in
  shadow and smaller near features (as painters do). Because strokes are attached to the surface they move
  with it and do not swim.
- **Research.** Painterly rendering of 3D scenes in real time (recursive camera painting 2312.12392);
  stylised Gaussian scenes (StyleGaussian 2403.07807; Tune-Your-Style 2602.00618; ARF 2206.06360); classic
  object-space painterly rendering (Meier 1996).
- **Ours.** Strokes oriented by the person's own geometry and hair field, sized by the shading band;
  baked once, so the run-time cost is two texture reads.
- **Defaults.** Modulation ±6% value; stroke length 3–8% of eye distance.
- **Fails → fallback.** No strokes (filter only).
- **Gate.** Temporal stability (L64) and owner's style check.
- **Status.** *To build*.

#### L59 Screen-space painterly filter
- **Purpose.** Merge pixels into painted planes and soften CG edges.
- **In → Out.** Shaded frame + G-buffer → filtered frame.
- **Method.** An anisotropic Kuwahara filter: local orientation from the structure tensor of the shaded
  frame (or directly from the G-buffer normals, which is cheaper and stable); in each of 4 sectors of an
  oriented ellipse, take mean and variance; output the mean of the lowest-variance sector (weighted
  version). Run at half resolution on the skin and hair only (ids from the G-buffer), so eyes, lips and
  lines stay crisp, and upsample with a joint bilateral filter.
- **Research.** Kuwahara (1976); anisotropic Kuwahara (Kyprianidis et al. 2009); flow-aligned smoothing
  and line integral convolution (Cabral and Leedom 1993), all used offline in `paint.py`.
- **Ours.** Orientation from the G-buffer instead of the image, so the filter cannot pick up noise.
- **Defaults.** Radius 4 px at 720p (half-res); 4 sectors; sharpness q = 8.
- **Fails → fallback.** Skip (quality tier "light").
- **Gate.** GPU time ≤ 3 ms on the reference laptop (§7.2).
- **Status.** *Partial*: offline version in `paint.py`; shader *to build*.

#### L60 Lines
- **Purpose.** Painted outlines and feature lines: eyelids, lip line, brows, nose side, jaw contour,
  creases (L23).
- **In → Out.** G-buffer (depth, normal, ids) + feature curves → line layer.
- **Method.** Occluding contours from normal·view sign changes on the mesh (object-space, so they are
  stable) drawn as tapered strokes; screen-space depth and normal discontinuities as a cheap complement;
  feature curves (L46, L23) rendered as textured ribbons whose weight follows the light (thinner in light,
  thicker in shadow) and the expression (crease strength from $b$).
- **Research.** Line drawings from 3D models (1810.01175); difference-of-Gaussians lines (XDoG, Winnemöller
  et al. 2012) as used in `paint.py`.
- **Ours.** Expression-driven crease lines from measured curves.
- **Defaults.** Line colour = darkest palette colour of the region, never black.
- **Fails → fallback.** Screen-space edges only.
- **Gate.** No line flicker (L64) and lines present on all 8 features in every bench render.
- **Status.** *Partial*: offline lines in `paint.py`; outline in `toon.js`.

#### L61 Painted eyes and hair highlights
- **Purpose.** The two places where painted characters are most expressive.
- **In → Out.** Eye and hair materials → specialised shading.
- **Method.** Eyes: a painted catch-light shape fixed to the key light direction, iris shadow under the
  upper lid (an occlusion band driven by lid position), sclera tinted towards the skin's shadow colour at
  the corners. Hair: a two-lobe anisotropic highlight shifted along the lock tangent (Kajiya–Kay / Marschner
  style simplified), drawn as a broken painted band.
- **Research.** Real-time strand rendering (2405.10565); light-aware Gaussian hair (2402.10483, ideas).
- **Ours.** —
- **Defaults.** Catch-light radius 12% of iris.
- **Fails → fallback.** Plain shading.
- **Gate.** Catch-light visible in both eyes in 100% of frames with gaze within ±20°.
- **Status.** *Partial*: matcap highlights in `toon.js`.

#### L62 Render graph
- **Purpose.** Do all of the above within the frame budget.
- **In → Out.** Deformed meshes → G-buffer → shading → filter → lines → composite.
- **Method.** WebGL2 (WebGPU when available): pass 1 renders body, garments, hair and eyes into a G-buffer
  (normal, depth, region id, band, UV-stroke sample); pass 2 shades; pass 3 filters at half resolution;
  pass 4 draws lines; pass 5 composites with premultiplied alpha. Morph targets live in a float texture
  (52 × face vertices) to avoid attribute limits.
- **Research.** Skinned Gaussian avatars on the web run 40–50 fps on a phone and 240 fps on a laptop GPU
  (2510.13978), which bounds what a mesh pipeline should reach.
- **Ours.** —
- **Defaults.** 720p panel, half-res filter.
- **Fails → fallback.** Drop passes by tier (L96).
- **Gate.** S14.
- **Status.** *Partial*: three.js lab players in `scripts/teacher/maker/player/`.

#### L63 Compositing, transparency and the AI label
- **Purpose.** The person only, over the lesson, always labelled.
- **In → Out.** Frame → premultiplied RGBA in the panel, with a visible "AI-generated" badge and an
  invisible frame watermark.
- **Method.** Alpha from coverage; a soft edge of 1 px. The label is part of the panel UI and cannot be
  hidden by the page. Recorded lesson clips carry the label burned in and a frame watermark (a low-amplitude
  spread-spectrum pattern in the chroma of the background-free region).
- **Research.** Audio-visual tamper-resistant watermarking (LAVA 2604.23957; cross-modal 2507.12723, ideas).
- **Ours.** Label enforced in the player component.
- **Defaults.** Badge always on.
- **Fails → fallback.** Player refuses to render without the label component.
- **Gate.** 100% of rendered frames and exported clips carry the label; watermark detected after
  re-encoding at 1 Mbps.
- **Status.** *To build* (transparent output exists in `perform.py`).

#### L64 Temporal stability
- **Purpose.** No flicker or swimming, which is the usual failure of painterly rendering in motion.
- **In → Out.** Current and previous frames, motion vectors → stabilised frame.
- **Method.** Motion vectors from the deformed mesh (current vs. previous positions). Reproject the
  previous filtered frame and blend $c = \mathrm{lerp}(c_{prev}, c_{now}, \beta)$ with neighbourhood colour
  clamping (as in temporal anti-aliasing) only on skin and hair ids; lines and eyes are not blended.
- **Research.** Temporal anti-aliasing practice; consistency of stylised toon video (Diffutoon
  2401.16224, ideas only).
- **Ours.** Object-space strokes (L58) make most of the image stable by construction; TAA handles the rest.
- **Defaults.** β = 0.25.
- **Fails → fallback.** β = 1 (off).
- **Gate.** Flicker metric (mean absolute frame difference after motion compensation) on a slow head-turn
  clip ≤ 1.5× that of the plain shaded render.
- **Status.** *To build*.

---

### Stage G: Voice (L65–L69)

#### L65 Text normalisation and language routing
- **Purpose.** Turn Guru's text (English, Hindi in Devanagari, Hinglish in Latin script, code, maths) into
  speakable words in the right language per span.
- **In → Out.** Text → spans `{lang, script, words}`.
- **Method.** Rules for numbers, units, symbols and code identifiers (spoken as the lesson speaks them:
  `arr[i]` → "arr of i"); script detection per token; Hinglish tokens in Latin script are tagged by a
  small language-ID classifier trained on a Hinglish corpus and transliterated to Devanagari when Hindi.
- **Research.** Code-mixed TTS (2409.10969, 2412.19043); script-first multilingual TTS (2510.25178);
  Hindi–English code-switching corpus (1810.00662).
- **Ours.** Code- and maths-aware normalisation from our lesson vocabulary.
- **Defaults.** English unless a span is classified Hindi with p ≥ 0.7.
- **Fails → fallback.** English pronunciation.
- **Gate.** Round trip: ASR of the synthesised Hinglish set has character error rate ≤ 15%.
- **Status.** *To build* (voice rules in `docs/voice/` apply).

#### L66 Grapheme to phoneme (IPA)
- **Purpose.** Every language becomes the same sound alphabet, which drives the lips (contradiction C5).
- **In → Out.** Words per language → IPA phones with stress and syllables.
- **Method.** English: a pronunciation dictionary with a neural fallback for unknown words. Hindi: the
  script is nearly phonemic except **schwa deletion**, handled by a classifier on the orthography; nasal
  vowels and anusvara resolved by the following consonant's place. Other Indian languages: rule tables per
  script.
- **Research.** Hindi and Punjabi schwa deletion (2004.10353); multilingual G2P (2204.03067, 1708.01464);
  IPA-based cross-lingual alignment (2311.08323).
- **Ours.** Anusvara and nasal rules that also feed the lips (no closure unless a labial follows).
- **Defaults.** —
- **Fails → fallback.** Letter-to-sound rules.
- **Gate.** Phone error rate ≤ 5% on a 500-word Hindi and a 500-word English test list.
- **Status.** *Partial*: the voice server returns phones for English; Hindi G2P *to build*.

#### L67 Cloned voice synthesis
- **Purpose.** Their voice, any sentence, any supported language.
- **In → Out.** Text spans + the person's reference clip (and optional adapter) → 24 kHz audio, streamed in
  chunks.
- **Method.** Zero-shot cloning from the 10–30 s reference with a commercially licensed multilingual model
  (Chatterbox Multilingual, MIT, with its built-in watermark); our Indic fine-tune (a LoRA on consented
  Hindi/Hinglish data) improves Hindi; an optional per-person adapter trained after the build (not in
  the 4-minute budget) from 30–60 min of their reading. Streaming: synthesis per clause; the first clause
  is short to cut latency.
- **Research.** Zero-shot multilingual TTS: CosyVoice (2407.05407, Apache-2.0), cross-lingual cloning
  (2608.11650), compact TTS (2610.14776), mobile zero-shot TTS (2402.09378), StyleTTS 2 (2306.07691);
  Indian-language TTS (2211.09536, 2507.15272, 2505.18609); voice cloning survey (2505.00579).
- **Ours.** Indic adapter on consented data; speaker identity kept separate from language.
- **Defaults.** Reference 20 s; first-clause target 150–250 ms to first audio on the GPU server.
- **Fails → fallback.** Default Indian voice (Kokoro via HeadTTS, Apache-2.0), labelled as not their voice.
- **Gate.** Speaker similarity (ECAPA-TDNN cosine, 2005.07143) between synthesis and held-out real speech
  ≥ 0.75 × the real-vs-real ceiling; intelligibility by ASR round trip (WER ≤ 8% English, CER ≤ 12% Hindi);
  MOS ≥ 3.8 in the listening test.
- **Status.** *Partial*: HeadTTS fixed voices in use (`perform.py`); cloning *to build* on the GPU worker.

#### L68 Phone timing
- **Purpose.** Exact start and end time of every phone in the audio — the lips' clock.
- **In → Out.** Audio + phones → `[(ipa, t0, t1)]`.
- **Method.** Take durations from the TTS when it exposes them; otherwise align with a small CTC phone
  recogniser over IPA (trained on CC0/CC-BY speech) by Viterbi forced alignment.
- **Research.** IPA-based forced alignment in any language (2311.08323); neural forced alignment
  (2606.25460, 2406.19363); alignment evaluation (2608.28508).
- **Ours.** —
- **Defaults.** 10 ms frames.
- **Fails → fallback.** Uniform durations within words from TTS word times.
- **Gate.** Median boundary error ≤ 20 ms on a hand-labelled 200-phone set per language.
- **Status.** *Partial*: HeadTTS gives timings; aligner *to build*.

#### L69 Audio watermark and provenance
- **Purpose.** Every cloned sentence can be proven synthetic and traced to the model.
- **In → Out.** Audio → watermarked audio; detector.
- **Method.** Keep the TTS model's own watermark and add a localised, sample-level watermark carrying a
  16-bit model id, so clips cut from lessons are still detectable.
- **Research.** AudioSeal localised watermarking (2401.17264); timbre watermarking (2312.03410); robustness
  across codecs (2611.04716).
- **Ours.** Model id in the mark ties audio to its consent record.
- **Defaults.** Imperceptible setting; detection on 1 s windows.
- **Fails → fallback.** No publish.
- **Gate.** Detection ≥ 99% after MP3/Opus re-encoding at 32 kbps; no audible artefacts in the listening
  test (ABX at chance).
- **Status.** *To build* (licence of the chosen watermark weights to be checked: **UNVERIFIED**).

---

### Stage H: Lips and face performance (L70–L79)

#### L70 Phones to visemes
- **Purpose.** One articulation table for every language.
- **In → Out.** IPA phone → viseme class and mouth targets on the 52 values.
- **Method.** 13 classes by articulation: PBM (lips closed), FV (lower lip to upper teeth), TH, TD,
  RETRO (retroflex, lower jaw), SH (lips forward), KG, EE, AA, OH, OO, W, silence; targets as in
  `phonemes.py`. Aspirated stops get a longer release; व as [ʋ] maps to FV.
- **Research.** Viseme classes (Fisher 1968); VisemeNet (1805.09488); viseme dynamics (2301.06059);
  multilingual lip-sync data (2406.14272).
- **Ours.** A single table for all languages with Hindi additions (exists).
- **Defaults.** As in `phonemes.py`.
- **Fails → fallback.** Unknown phone → nearest class by articulatory features.
- **Gate.** All IPA phones in the test set map to a class (exists: `test_every_language_sound_has_a_mouth`).
- **Status.** *Exists*: `scripts/pratibimb/engine/phonemes.py`.

#### L71 Coarticulation
- **Purpose.** Each sound's mouth shape blends with its neighbours, as in real speech.
- **In → Out.** Viseme timeline → smooth trajectories of each mouth value.
- **Method.** Dominance functions (Cohen and Massaro 1993): each phone $i$ has, per value $k$, a target
  $T_{ik}$ and a dominance $D_{ik}(t) = \alpha_{ik} e^{-\theta_{ik}|t-c_i|^{c}}$; the trajectory is
  $x_k(t) = \sum_i D_{ik}(t)T_{ik} / \sum_i D_{ik}(t)$. Lip closures (PBM) and lip–teeth contacts (FV) have
  very high dominance for the closure values, so they always happen ("must-hit" constraints, then a
  local correction enforces the closure frame if blending missed it). Lip rounding spreads further
  (anticipatory rounding before /u/).
- **Research.** Cohen and Massaro (1993); quantitative coarticulation from articulatory models
  (2408.05641); a geometric coarticulation measure (2610.03436); visible articulation directions
  (spreading, opening, protrusion; 2609.30517).
- **Ours.** Must-hit constraints per class plus the geometric measure of 2610.03436 used as a gate.
- **Defaults.** Lead 40 ms (audio-visual lead of the mouth); attack 60 ms (in `phonemes.py`).
- **Fails → fallback.** Per-phone targets with attack/release smoothing (exists).
- **Gate.** S3 and S4 (exists as `lip_check`); coarticulation path ratio (2610.03436) within the range of
  the person's real speech.
- **Status.** *Partial*: smoothing and lip check in `phonemes.py`; dominance model *to build*.

#### L72 Jaw–lip split and personal mouth range
- **Purpose.** Loud speech opens the jaw, not the lips; each person's mouth opens to their own extent.
- **In → Out.** Trajectories + loudness + motion profile → jawOpen and lip values separately, scaled.
- **Method.** Two independent controls per frame as in JALI: jaw $j(t)$ scales with the vowel's openness
  and the syllable's loudness; lip intensity $l(t)$ with articulation clarity. Then scale each class by
  the person's measured range (L16): $x \leftarrow x \cdot r_{class}^{person}/r_{class}^{pop}$.
- **Research.** JALI (Edwards et al. 2016); speech–lip intensity correlation (SLCC in 2503.20308).
- **Ours.** Per-class personal range from their own speech.
- **Defaults.** Jaw gain 0.6–1.2 with loudness.
- **Fails → fallback.** Population range.
- **Gate.** S6; SLCC on held-out speech ≥ the value of the person's own video (2503.20308 metric).
- **Status.** *To build* (global gains exist in the lip-sync slot).

#### L73 Tongue and teeth visibility control
- **Purpose.** Drive L51's tongue and decide teeth visibility from the sounds.
- **In → Out.** Phones → tongue pose weights, teeth-show weight.
- **Method.** Tongue poses keyed by class (TD → tip up, TH → between teeth, RETRO → curled, KG → back up)
  with the same dominance blending as L71; teeth-show = smooth function of inner-lip separation and FV/EE.
- **Research.** Articulatory models (2507.20343, 2408.05641).
- **Ours.** Retroflex tongue for Indian languages.
- **Defaults.** —
- **Fails → fallback.** Tongue at rest.
- **Gate.** Tongue visible on 100% of θ/ð and ≥ 80% of l in close-up; teeth never visible with closed lips.
- **Status.** *To build*.

#### L74 Learned lip refiner
- **Purpose.** Rules get the important events right; a learned model adds the natural in-between motion.
- **In → Out.** Audio (16 kHz) + rule trajectories → refined 52 values at 30 fps.
- **Method.** An audio-to-expression network (default: wav2arkit, Apache-2.0; later our fine-tune on
  consented Hindi/English video) predicts values; the output is fused with L71/L72 by a per-value weight
  (rules dominate closure and contact values, the network dominates cheeks, mouth corners and press);
  must-hit constraints are re-applied after fusion.
- **Research.** FaceFormer (2112.05329); SAiD blendshape diffusion (2401.08655); ARTalk (2502.20323);
  personalised causal motion (2604.23692); multilingual 3D talking heads (2406.14272).
- **Ours.** Rule–network fusion with constraints re-applied (rules as guarantees, learning as style).
- **Defaults.** Fusion weights per value from a validation sweep.
- **Fails → fallback.** Rules only.
- **Gate.** S3–S6 still hold after fusion; PLRS (2503.20308) ≥ rules-only.
- **Status.** *Partial*: wav2arkit slot in `slots.json`, `lipsync/wav2arkit-run.mjs`; fusion *to build*.

#### L75 Prosody features
- **Purpose.** Stress, pitch and pauses drive brows, nods, beats and gesture strokes.
- **In → Out.** Audio + phones → per-syllable pitch (z-scored to the speaker), energy, duration, stress
  flag, phrase boundaries, pause lengths.
- **Method.** F0 and RMS per 10 ms; syllables from phones; stress = local maxima of a weighted sum of
  pitch excursion, energy and duration; phrase ends at pauses > 180 ms or falling pitch.
- **Research.** Prosody for gesture and head motion (2210.14800, 2412.16563 SemTalk).
- **Ours.** —
- **Defaults.** Stress threshold z ≥ 1.0.
- **Fails → fallback.** Stress from the TTS's lexical stress.
- **Gate.** Stress agreement with a hand-labelled set ≥ 80%.
- **Status.** *Exists* in part: `scripts/teacher/maker/lipsync/prosody.py`.

#### L76 Emotion layer
- **Purpose.** Readable emotions that match what she says.
- **In → Out.** Script tags `{valence, arousal}` + discrete cue (pleased, curious, concerned, thinking,
  surprised) → expression offsets on non-mouth values, plus voice style hints.
- **Method.** Each discrete cue is a small set of action units (e.g., pleased = cheekSquint + mouthSmile
  at 0.3–0.6; concerned = browInnerUp 0.4 + browDown 0.2); continuous valence/arousal interpolate between
  them; mouth values from the cue are limited during speech so lip sync wins (priority mixer, L89).
- **Research.** Continuous valence–arousal control (CETalk 2608.15110); AU-controlled emotional heads
  (2602.09534); verbal–nonverbal mismatch for training agents (2608.22731); LLM interpretation of
  valence–arousal (2502.06875).
- **Ours.** Emotion intensity is scaled by the person's own expressiveness (smile and brow share from L16).
- **Defaults.** Emotion decay 1.5 s unless refreshed.
- **Fails → fallback.** Neutral-pleasant.
- **Gate.** Observers recognise the 5 cues from silent clips ≥ 70% (chance 20%).
- **Status.** *To build*.

#### L77 Blinks, brows and micro-motion
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

#### L78 Head motion
- **Purpose.** Nods, tilts and turns that follow speech and listening.
- **In → Out.** Prosody, turn state, gaze target → head yaw/pitch/roll.
- **Method.** Nods (pitch dips) on stressed syllables and at affirmations; slow drift from an
  Ornstein–Uhlenbeck process with the person's measured head speed and range; head turns lead gaze
  shifts above 15° (eyes first, head follows after 50–100 ms).
- **Research.** Naturalistic head motion from speech (2210.14800); speech-driven head pose (2310.20240,
  2502.20323).
- **Ours.** Person's own range and speed.
- **Defaults.** Nod amplitude 3–6°.
- **Fails → fallback.** Drift only.
- **Gate.** Head speed distribution matches the person's own (two-sample KS p > 0.05) on 6/8 bench people.
- **Status.** *Partial*: nods in `perform.py`.

#### L79 Gaze
- **Purpose.** Look at the student, at the board element being discussed, or away while thinking.
- **In → Out.** Script gaze tag, lesson target position (L82), turn state → eye and head angles.
- **Method.** A small state machine: *student* (camera) while asking and listening; *board* at the target
  element when pointing or referring; *away* (up-left or down) briefly when "thinking" or at the start of
  a long answer (gaze aversion), returning before the key point; saccades between targets with
  main-sequence velocity; micro-saccades during fixation.
- **Research.** Gaze in conversation (Kendon 1967); speech-driven gaze (TalkingEyes 2501.09921); expressive
  gaze dynamics (2610.19635); turn-level interactive heads (2512.15340); spatially aware agents (SARAH
  2602.18432).
- **Ours.** Gaze that knows the lesson's element positions.
- **Defaults.** Mutual gaze 60–70% of speaking time.
- **Fails → fallback.** Student gaze with idle saccades.
- **Gate.** Gaze lands within 2° of the target element's centre within 250 ms of the cue.
- **Status.** *To build*.

---

### Stage I: Physical actions of the upper body (L80–L89)

The aim is "every physical thing a person does with the upper body", without an animation library and
without an animator (contradiction C2). Actions are **goal programs** solved on the skeleton at run time.

#### L80 Action language
- **Purpose.** One small, checkable language for every action.
- **In → Out.** Script action tags → a goal program: a list of timed goals.
- **Method.** Grammar (JSON): `{act, hand: L|R|both|auto, target?, shape?, count?, at: word index |
  time, hold_ms, strength}`. Goals are primitives: `reach(hand, point)`, `orient(palm, dir)`,
  `shape(hand, name)`, `look(target)`, `lean(dir, amount)`, `nod(n)`, `shrug()`, `touch(hand, body_part)`,
  `beat(hand)`. A named action expands to primitives, e.g. `namaste` = both hands `touch(chest_front)`,
  palms `orient(facing each other)`, `shape(flat)`, head `nod(1)`, gaze student; `count(3)` =
  `reach(R, chest-height front)`, `shape(count3)`, `orient(palm to student)`; `point(target)` =
  `reach(R, ray towards target at 70% arm length)`, `shape(point)`, `look(target)`. A new action is a new
  expansion entry, no code.
- **Research.** Intention-aware hierarchical motion (2506.01563); LLM-driven pedagogical expression
  (2603.09536); behaviour markup traditions (BML, Kopp et al. 2006).
- **Ours.** Actions as goals over primitives, validated against limits before they run.
- **Defaults.** 30 named actions at launch (namaste, point, count 1–5, open palms, beat, wave, thumbs up,
  shrug, think (hand to chin), hand on chest, lean in, lean back, nod, shake, "this much" (two hands
  apart), steeple, rub hands, cross arms, hands on hips, emphasise (chop), offer (palm up), stop (palm out),
  welcome, clap, write-in-air, number-on-fingers, look-at-board, come-closer, okay-sign).
- **Fails → fallback.** Unknown or invalid action → nearest named action or none, logged.
- **Gate.** Every action in the list parses and expands; every expansion solvable (L83) for all 8 bench
  bodies.
- **Status.** *Partial*: four hand-posed gestures in `body.py` (`gesture`); language *to build*.

#### L81 Gesture planner
- **Purpose.** Decide which gesture, with which hand, when — including the many gestures nobody writes in
  the script (beats, open palms).
- **In → Out.** Sentence, word times, prosody, explicit action tags, the person's gesture rate → a gesture
  schedule `[act, start, stroke, end, strength]`.
- **Method.** Explicit tags first (namaste, point at, count). Then a learned scorer picks rhythm and
  metaphoric gestures (beat, open palms, "this much", offer) on stressed words: features = word class,
  stress, position in phrase, semantic cues ("first/second" → count, "this/here/look" → point, "big/small"
  → size); constraints: one gesture per phrase on average, rest between gestures ≥ 300 ms, rate matched to
  the person's measured gesture rate (L16).
- **Research.** Semantic co-speech gestures (SemTalk 2412.16563; SemConFlow 2603.26553; SARGes
  2503.20202); labelling sentences with deictic gestures (2407.02151); review of data-driven gesture
  generation (2301.05339); motion matching for digital humans (TRiMM 2506.01077).
- **Ours.** The planner outputs goal programs, not motion, so any gesture it picks is physically solved.
- **Defaults.** Rule scorer at launch; the learned scorer (slot `gestures`) replaces it.
- **Fails → fallback.** Beats on stressed words only.
- **Gate.** Appropriateness rating (GENEA-style, §8.4) ≥ the rule baseline; no two strokes < 300 ms apart.
- **Status.** *Partial*: word rules in `perform.py`; gesture slot in `slots.json`.

#### L82 Target resolution: lesson element to 3D point
- **Purpose.** "Point at node 7 at step `swap`" must land on node 7 on the student's screen.
- **In → Out.** Target id (lesson step or element id), panel and page layout → a 3D target point in the
  teacher's space, updated as the page scrolls or the animation moves.
- **Method.** The lesson player already names its steps and elements (`swap`, `cmp`, `found`, …). The
  player publishes the element's screen rectangle each frame. The teacher's camera is known, so the
  rectangle's centre is un-projected to a ray; the target point is where that ray meets a plane in front of
  the teacher at arm's reach ("the board plane"), chosen so the finger ray from the shoulder passes through
  the element on screen. If the element is outside the reachable cone, she points with the far hand or
  turns her torso (L86).
- **Research.** Pointing in situated agents (2509.12507); avatar-led explanations judged on whether they
  point at the content (VisualTalk-Bench 2611.25444).
- **Ours.** Deixis bound to the live layout of our own lesson animations. We did not find a prior system
  that points at elements of a live web lesson.
- **Defaults.** Board plane 0.55 m in front of the chest.
- **Fails → fallback.** Gaze-only reference ("here") with an open-palm gesture towards the side.
- **Gate.** S8.
- **Status.** *To build* (step ids exist in the lesson engine).

#### L83 Reaching by inverse kinematics
- **Purpose.** Put a hand (fingertip, palm or wrist) at any goal, naturally.
- **In → Out.** Goal (position, optional orientation) → shoulder, elbow, wrist rotations.
- **Method.** FABRIK on the clavicle–shoulder–elbow–wrist chain with joint limits applied in each backward
  and forward pass; the elbow swivel angle (redundancy) chosen by a comfort cost (elbow low and slightly
  out, as in natural reaching) plus the person's habit (L89); clavicle contributes when the target is high
  or far. A final damped least-squares step meets the fingertip goal exactly with finger joints fixed.
- **Research.** FABRIK (Aristidou and Lasenby 2011); real-time multi-constraint IK (JAX-IK 2507.00792);
  neural IK (2506.17996); physically plausible real-time synthesis (2508.02106).
- **Ours.** Swivel chosen by comfort + measured personal habit.
- **Defaults.** 10 FABRIK iterations, tolerance 2 mm.
- **Fails → fallback.** Nearest reachable point on the goal ray.
- **Gate.** Target error < 2% of arm length; 0 limit violations.
- **Status.** *To build*.

#### L84 Hand shapes
- **Purpose.** Natural hands for every named shape and for the in-between.
- **In → Out.** Shape name or count → 20 finger joint angles per hand.
- **Method.** Named shapes as joint-angle sets (point, count 1–5 in the Indian counting style and the
  Western style as a setting, open, flat, relaxed, fist, OK, thumbs up, pinch, steeple); in-between shapes
  move in a low-dimensional synergy space (PCA of captured hand poses: 5–6 components explain most
  variance); finger coupling (DIP ≈ ⅔ PIP) applied; relaxed hands curl a little more on the ulnar side.
- **Research.** Hand synergies (Santello et al. 1998); hand pose priors (NRDF 2403.03122); hand motion
  completion with priors (2607.05938); biomechanical finger tracking (2605.09258).
- **Ours.** Counting style as a setting, learned from the person's own counting frames when captured
  (styles differ between people and regions; which styles to offer is to be checked with teachers:
  **UNVERIFIED**).
- **Defaults.** Relaxed shape between gestures.
- **Fails → fallback.** Relaxed hand.
- **Gate.** Every named shape within L31's limits; observers identify counts 1–5 from renders ≥ 95%.
- **Status.** *Partial*: point and count curls in `body.py`.

#### L85 Gesture phases and timing curves
- **Purpose.** Gestures that look human: preparation, stroke, hold, retraction, with the stroke on the word.
- **In → Out.** Gesture schedule + IK poses → time-parameterised joint trajectories.
- **Method.** Each gesture has four phases; the stroke's peak velocity is placed 0–100 ms *before* the
  stressed syllable's onset (gesture strokes lead speech slightly); trajectories between key poses use
  minimum-jerk profiles in joint space for the arm and in the synergy space for fingers; consecutive
  gestures co-articulate (skip retraction when the next preparation starts within 400 ms).
- **Research.** Gesture phases (McNeill 1992; Kita et al. 1998); minimum-jerk motion (Flash and Hogan 1985);
  social gesture with synchronised speech (2610.06153); streaming gesture generation (GestureFAR
  2609.21576; LiveGesture 2604.10927).
- **Ours.** —
- **Defaults.** Stroke lead 60 ms; hold 150–400 ms.
- **Fails → fallback.** Linear blends with ease-in/out.
- **Gate.** Stroke within 100 ms of the target stress in 95% of gestures.
- **Status.** *Partial*: ease in/out in `perform.py`.

#### L86 Balance, lean and torso compensation
- **Purpose.** When she reaches far, the torso helps; when she leans in, the head stays level.
- **In → Out.** Goals + IK result → spine, chest and pelvis offsets.
- **Method.** If the hand goal is beyond 85% of arm reach, distribute the remaining distance to chest
  rotation and spine lean (weights 0.6/0.4); keep the projected centre of mass of the upper body over the
  pelvis base by a small counter-lean; head orientation is stabilised to keep gaze on target (vestibulo-
  ocular style compensation).
- **Research.** Physically plausible real-time motion (2508.02106); physics-based interaction priors
  (2609.06591).
- **Ours.** —
- **Defaults.** Max lean 12°.
- **Fails → fallback.** Arm-only reach.
- **Gate.** Centre of mass projection inside the base region in all library actions.
- **Status.** *To build*.

#### L87 Self-collision avoidance
- **Purpose.** Hands never pass through the body, the other hand or the face.
- **In → Out.** Pose → corrected pose.
- **Method.** Capsules for torso, neck, head, upper arms, forearms, palms and finger segments; after IK,
  detect capsule penetrations and push the end effector out along the separating normal, re-solving IK;
  `touch` goals use a contact offset (the palm stops 5 mm above the chest).
- **Research.** Physics-based interaction priors (2609.06591) for ideas; capsule collision practice.
- **Ours.** —
- **Defaults.** 3 resolve iterations.
- **Fails → fallback.** Abort the gesture and return to relaxed.
- **Gate.** S7: 0 penetrations deeper than 2 mm in the library × 8 bodies.
- **Status.** *To build*.

#### L88 Idle life and breathing
- **Purpose.** Alive while listening or waiting; never frozen.
- **In → Out.** Time, turn state → breathing, weight shifts, micro head and hand motion.
- **Method.** Breathing as a chest and shoulder rise (period 3.5–5 s), with inhalations placed at phrase
  starts when speaking (she breathes before she speaks); slow weight shifts every 8–20 s; Perlin-noise
  micro-motion on head and hands at small amplitude; occasional self-adjustments (shoulder roll, hand
  re-clasp) at turn boundaries.
- **Research.** Procedural noise (Perlin 1985); listening behaviour (2409.20188, 2112.13548).
- **Ours.** Breaths synchronised with the speech plan.
- **Defaults.** Breathing amplitude 4 mm at the sternum.
- **Fails → fallback.** Breathing only.
- **Gate.** No interval > 2 s with all joint velocities below 0.2°/s.
- **Status.** *To build*.

#### L89 Motion mixer and personal style
- **Purpose.** Combine all motion sources with clear priorities, in the person's own style.
- **In → Out.** Lip, emotion, blink, head, gaze, gesture, idle streams → one pose per frame.
- **Method.** Layered mixing with priorities per channel: mouth values (lips > emotion > idle); eyes (blink
  > gaze); arms (explicit action > planned gesture > idle). Additive layers (breathing, micro-motion) are
  applied on top in joint space. Personal style: amplitude and tempo of gestures, head and brows scaled
  by the person's profile (L16), and a preferred hand (handedness from L11).
- **Research.** Motion layering practice; speaking-style capture (1905.03079); identity-aware motion
  (2604.25164).
- **Ours.** Style as measured scalars, not a style network.
- **Defaults.** —
- **Fails → fallback.** Unstyled defaults.
- **Gate.** Mouth closures (S3) never broken by other layers; style scalars within ±2σ of the population.
- **Status.** *To build*.

---

### Stage J: Listening and conversation (L90–L95)

#### L90 Listening: voice activity and recognition
- **Purpose.** Know when the student speaks and what they say, in English, Hindi or Hinglish.
- **In → Out.** Student microphone (with echo cancellation of the teacher's own audio) → speech/no-speech
  per 30 ms, streaming partial transcripts, final transcript.
- **Method.** Browser echo cancellation; a small VAD on device; streaming ASR on the server (IndicConformer
  or Whisper, both MIT) or the site's voice chain (`docs/voice/`, Admin → Voice recognition), which already
  routes among free providers.
- **Research.** Whisper (2212.04356); Indian-language ASR benchmarks (2604.19151, 2305.15386, 2609.24199);
  code-switched speech (2406.10993).
- **Ours.** Reuses the site's free speech chain; no audio stored.
- **Defaults.** End-of-speech silence 500 ms as a last resort (L91 usually decides earlier).
- **Fails → fallback.** Typed input.
- **Gate.** WER/CER on the Hinglish classroom set within 10% relative of the best single provider.
- **Status.** *Exists* in the site (`src/voice/stt.js`, `client/src/voice/`).

#### L91 Turn-taking
- **Purpose.** Answer at the right moment; do not cut the student off; do not leave dead air.
- **In → Out.** Both audio channels + partial transcript → each 50 ms: keep listening, prepare, answer,
  backchannel, stop (student interrupted), ignore (noise).
- **Method.** A voice-activity-projection model: a small causal transformer over both channels predicts
  the probability that each speaker talks in the next 2 s bins; combined with a semantic end-of-turn score
  from the streaming transcript (question complete? sentence complete?) as in FastTurn. Decision rules on
  the two scores with hysteresis.
- **Research.** Voice activity projection, multilingual (2403.06487), real-time (2401.04868), noise-robust
  (2503.06241); FastTurn (2604.01897); full-duplex dialogue (2410.00037, 2604.21406, 2509.22243).
- **Ours.** Trained on consented two-channel Hindi/English tutoring conversations (§6).
- **Defaults.** Answer when P(student continues) < 0.25 and semantic end ≥ 0.6.
- **Fails → fallback.** Silence threshold (L90).
- **Gate.** False cut-ins ≤ 5% of student turns; median gap after a true end ≤ 300 ms to first reaction.
- **Status.** *To build*.

#### L92 Listening reactions, contingent on correctness
- **Purpose.** She shows she is listening (nods, "haan", "achha", brows), and never signals agreement with a
  wrong answer.
- **In → Out.** Turn state, prosody of the student, partial transcript, **the grader's running verdict**
  → backchannel events (nod type, short vocal token, facial reaction).
- **Method.** A backchannel predictor (VAP fine-tuned, as in 2410.15929; nod types as in 2507.23298) gives
  timing and type. A gate filters them: when the student is stating an answer or a step, Guru's grader
  (the same one that checks answers today) scores it; agreement tokens ("haan", affirmative nod) are
  allowed only if the step is correct; otherwise only neutral attention signals (slight head tilt, "hmm",
  steady gaze) are allowed. When confusion cues appear (long pauses, "umm", rising pitch), she shows
  concern and the hint ladder may step (on device; no frame leaves it).
- **Research.** Backchannel prediction (2410.15929, 2304.04472, 2607.22729); nodding types (2507.23298);
  listening heads (2112.13548, 2409.20188, 2609.40317 GLARE); dyadic behaviour (2510.04637, 2506.22554);
  confusion detection (2206.02436).
- **Ours.** Correctness-contingent backchannels. We found backchannel timing and type models, but none
  that conditions agreement on a correctness check; for a teacher this matters.
- **Defaults.** ≤ 1 vocal backchannel per 6 s.
- **Fails → fallback.** Neutral attention only.
- **Gate.** S12 = 0 agreement signals after wrong steps on the scripted test set; backchannel timing rated
  natural ≥ 3.5/5.
- **Status.** *To build* (the grader and hint ladder exist in Guru: `src/voice/guru.js`).

#### L93 Brain and performance script
- **Purpose.** What she says and how: words, emotion, gaze, gestures and targets, one clause at a time.
- **In → Out.** Student turn, lesson context, student memory → validated performance script clauses.
- **Method.** Guru (`src/voice/guru.js`, `docs/voice/GURU_SPEC.md`): free providers with failover, the hint
  ladder, Leak Guard, no help in tests. It is asked to write clauses in the schema
  `{say, lang, emo:{valence, arousal}, cue, gaze, gesture, target, emphasis, pause_ms}` (from `ENGINE.md`).
  A validator checks every field against the action list (L80) and the lesson's real element ids (L82);
  anything invalid is dropped or replaced by rules, never executed blindly. "Honest face": when retrieval
  confidence is low, the script gets `cue: thinking`, a hedge, and a pointer to the source.
- **Research.** LLM-driven pedagogical agents (2603.09536, 2604.12253); embodied LLM agents with
  nonverbal planning (2308.15214, 2603.03282); backend-agnostic embodiment layers (BASE 2611.30388).
- **Ours.** A validated script tied to real lesson element ids; honest-face behaviour.
- **Defaults.** First clause ≤ 12 words.
- **Fails → fallback.** Text answer with neutral gestures.
- **Gate.** 100% of executed tags valid; Leak Guard tests pass (existing voice tests).
- **Status.** *Partial*: Guru exists; script schema and validator *to build*.

#### L94 Barge-in and repair
- **Purpose.** When the student interrupts, she stops quickly and politely, and knows what was heard.
- **In → Out.** Student onset during her speech → fade-out, state update, repair line.
- **Method.** If student speech lasts > 300 ms and is not a backchannel (L91 decides), fade her audio over
  80 ms, freeze the gesture into a hold, turn gaze to the student, and cut Guru's context to the words
  actually played (the audio clock knows them). Repair: "haan, bolo" and, after the student, an offer to
  finish the point.
- **Research.** Overlap handling benchmarks (2507.23159); full-duplex systems (2509.06502).
- **Ours.** Context cut at the audio clock's played-word position.
- **Defaults.** As above.
- **Fails → fallback.** Finish the clause, then stop.
- **Gate.** S11.
- **Status.** *To build*.

#### L95 Latency hiding
- **Purpose.** No dead pauses even when the brain takes a second.
- **In → Out.** Predicted end of turn → visible pre-reaction and early speech.
- **Method.** At P(end) > 0.5, start preparing (send the partial transcript to the brain); at 250 ms after
  the end, show an intake breath and a brow lift; for long answers, the first clause is a short
  acknowledgement generated by the fast model; lesson answers known in advance come from the lesson cache.
- **Research.** Response-time studies in full-duplex dialogue (2604.21406); streaming agents for digital
  humans (2608.24909).
- **Ours.** Pre-speech body cues as part of the latency budget.
- **Defaults.** Pre-reaction at 250 ms.
- **Fails → fallback.** Thinking cue (L76) until audio starts.
- **Gate.** S10.
- **Status.** *To build*.

---

### Stage K: Clock, delivery and gates (L96–L98)

#### L96 Clock, scheduler and adaptive quality
- **Purpose.** Lips and audio in step on every device; 30 fps held by trading quality, not timing.
- **In → Out.** Audio playback position, motion streams, frame times → the pose at the audio time; a
  quality tier.
- **Method.** The audio context's playback time is the master clock; each frame evaluates every motion
  stream at that time (not at "frame count"), so dropped frames never desync lips. Motion runs 160 ms
  ahead in chunks in a worker (phone times are known in advance because we synthesise the voice). Quality
  tiers by measured GPU time over the last 60 frames: *full* → *light* (filter at quarter resolution, LOD1)
  → *basic* (no filter, LOD2, no cloth sim).
- **Research.** Streaming embodiment on one timeline (BASE 2611.30388); real-time portrait animation
  (Teller 2503.18429).
- **Ours.** Audio-master evaluation of explicit controls.
- **Defaults.** Tier change hysteresis 2 s.
- **Fails → fallback.** Basic tier.
- **Gate.** S5 and S14 on the reference laptops.
- **Status.** *Partial*: frame-exact `renderAt(t)` in the lab player; worker scheduling *to build*.

#### L97 Model packaging and signing
- **Purpose.** One file that carries the person model, its consent and its report.
- **In → Out.** All build outputs → `.pbmodel` (zip: manifest with SHA-256 of every file, signature,
  consent record, provenance ledger, build report, mesh, morphs, weights, palette, curves, hair, wardrobe
  fit, motion profile, voice reference).
- **Method.** As the identity pack (`PACK_FORMAT.md`), signed with the server key; encrypted at rest with
  the person's key (L3); the player verifies the signature and the lock before loading.
- **Research.** —
- **Ours.** The model refuses to load without its consent record and label component.
- **Defaults.** ≤ 8 MB.
- **Fails → fallback.** —
- **Gate.** Tampered files rejected 100%; size ≤ 8 MB.
- **Status.** *Partial*: signed identity pack exists (`pack.py`); model format *to build*.

#### L98 Self-grading build, bench and release gates
- **Purpose.** Every build checks itself; every change to any layer is checked on the bench.
- **In → Out.** The built model + held-out frames → report with every gate's number and pass/fail; retries;
  release decision.
- **Method.** After the build, render held-out views (the end of the capture, or another day's photos) with
  the frames' own head pose and expression values, and run: likeness (S1), shape error, lip checks (S3–S6
  with the person's own audio), limits and collisions over the whole action library (S7), pointing (S8),
  no-copy (S15), size and a browser-speed proxy. If a gate fails and time remains, re-run only the layers
  upstream of that gate with the next fallback setting (e.g., lower style $s$, more hair locks); else
  ship the report with the failure named and the missing input asked for ("one more photo of your left
  side"). The bench (8 people, §8.2) runs on every pull request touching the engine.
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
| L1 | Consent capture and verification | partial | 100% of builds have a valid record; bench replay attacks (photo, screen replay of someone |
| L2 | Identity lock | exists | Bench: all 8 genuine pairs pass; all 56 cross pairs fail. |
| L3 | Provenance ledger, labelling and revocation | partial | S17: 100% traced; a deletion test leaves no readable model on server or cache. |
| L4 | Capture coach and coverage planner | partial | On the bench, coached captures reach "Good" coverage in ≤ 3 min for 8/8 people. |
| L5 | Frame quality, liveness and shot cuts | exists | ≥ 40 usable frames, or the build stops with a named reason. |
| L6 | Main-person tracking | exists | Other people never used (manual audit of bench clips with bystanders: 0 frames). |
| L7 | Dense face points | exists | Detection on ≥ 95% of usable frames; mean landmark jitter on static frames < 0.5% of … |
| L8 | Expression reading and per-person calibration | partial | Neutral frames read ≤ 0.1 on every value after calibration. |
| L9 | Head pose | exists | Pose jitter on still frames < 1°. |
| L10 | Body points and metric lift | partial | Bone-length coefficient of variation < 5% across frames. |
| L11 | Hand points | exists | ≥ 10 hand frames, or the report says the hands are estimated. |
| L12 | Part segmentation | exists | Mask IoU between consecutive calm frames ≥ 0.9. |
| L13 | Colour calibration | exists | Sclera chroma after correction ≤ 4 (CIELAB a,b) on bench frames. |
| L14 | Accessories and facial hair | to build | Bench: glasses and facial-hair presence correct 8/8. |
| L15 | Voice extraction and quality | partial | Reference ≥ 10 s at SNR ≥ 20 dB. |
| L16 | Motion-habit profile | partial | Blink rate on two halves of the capture agree within ±20%. |
| L17 | Canonical face | exists | Held-out face error < 2% of eye distance (measured 1.05%). |
| L18 | Metric scale | exists | Uncertainty < 8%. |
| L19 | Multi-view depth refinement | partial | Profile-view reprojection error drops ≥ 20% vs. single-view depth; held-out view error … |
| L20 | Personal expression basis | exists | Held-out shape error < 2%; mouth opening follows the real mouth r ≥ 0.9 (measured 0.97). |
| L21 | Expression correctives | to build | Combination error drops ≥ 20% on held-out frames, else none kept. |
| L22 | Symmetry and asymmetry | to build | Asymmetry measured on two halves of the capture agrees (correlation ≥ 0.8). |
| L23 | Face detail curves | to build | Curves stable across views (mean positional disagreement < 3% of eye distance) and the … |
| L24 | Full head completion | partial | Side-silhouette IoU ≥ 0.9. |
| L25 | Likeness-constrained stylisation | partial | S1 holds at the chosen $s$. |
| L26 | Ears | to build | Ear in the profile view within 3 px at 512 px. |
| L27 | Neck and throat | partial | Front silhouette IoU ≥ 0.9 in the neck band. |
| L28 | Skeleton and bone lengths | exists | Skeleton reprojection onto frames < 4% of shoulder width. |
| L29 | Posture and spine | to build | Posture reprojection error < 4% of shoulder width. |
| L30 | Hand skeleton and finger lengths | partial | Fingertip reprojection < 5 px at 512 px on held-out hand frames. |
| L31 | Joint limits and pose plausibility | to build | S7: 0 library poses outside limits. |
| L32 | Torso and arm volume | partial | Front silhouette IoU ≥ 0.9. |
| L33 | Glasses and facial-hair geometry | to build | Owner's side-by-side check: accessories judged "right" for 8/8 bench people. |
| L34 | Watertight surface and head–body join | to build | Manifold, no holes, no self-intersection in the rest pose. |
| L35 | Remeshing and edge loops | to build | Minimum angle > 20° on 99% of triangles. |
| L36 | UV layout | to build | Area stretch < 10% on 95% of triangles. |
| L37 | Face-to-mesh binding | exists | Max vertex error vs. direct evaluation < 0.1 mm. |
| L38 | Skin weights | partial | No tearing or folding (flipped triangles = 0) in every library pose. |
| L39 | Skinning method: linear and dual-quaternion blend | to build | Volume change at elbows and wrists < 10% across the library poses. |
| L40 | Pose correctives and runtime deformer | to build | Silhouette error at 90° elbow bend drops ≥ 20% vs. no correctives. |
| L41 | Levels of detail | to build | LOD2 silhouette IoU ≥ 0.97 vs. LOD0 at panel size. |
| L42 | Per-frame light estimation | partial | Recovered skin albedo agrees across frames: ΔE₀₀ < 3 between the 25th and 75th … |
| L43 | Albedo field | partial | Mean ΔE₀₀ to measured skin colour (L13) < 3; no texel darker than 3σ of its region (no … |
| L44 | Region palette and skin tone | partial | Region colours stable between two halves of the capture (ΔE₀₀ < 3). |
| L45 | No-copy guard (band limit and patch test) | to build | S15 on every build. |
| L46 | Feature curves: brows, lids, lip line, lashes | partial | Brow-shape IoU ≥ 0.8 vs. the masks in the front view. |
| L47 | Shine, warmth and subsurface parameters | to build | Highlight position in renders within 5% of eye distance of the measured position on … |
| L48 | Eyes | partial | No head-interior pixels visible at ±30° gaze; iris colour ΔE₀₀ < 5 vs. L13. |
| L49 | Eyelids and lashes | partial | No lid–eyeball gap at any gaze in ±30°; full closure at eyeBlink = 1. |
| L50 | Teeth, gums and mouth cavity | partial | No see-through mouth at any expression; teeth visible iff inner lips separate > 1 mm. |
| L51 | Tongue | to build | Tongue visible on "th" and "l" in close-up renders; never through the teeth. |
| L52 | Hair shape | partial | Hair silhouette IoU ≥ 0.8 in front and three-quarter views. |
| L53 | Hair motion | to build | No hair particle inside a head capsule; stable at 30 fps for 10 min. |
| L54 | Wardrobe and garment fit | partial | No body vertex outside the garment in any library pose. |
| L55 | Cloth motion | to build | Stable at 30 fps; 0 cloth–body penetrations in the library. |
| L56 | Lighting rig | partial | Face mean luminance in [0.45, 0.75] for every bench person and theme. |
| L57 | Painted shading model | partial | Owner's style check against references 1–8 (§8.3) ≥ 4/5; skin luminance contrast between |
| L58 | Surface-anchored brush strokes | to build | Temporal stability (L64) and owner's style check. |
| L59 | Screen-space painterly filter | partial | GPU time ≤ 3 ms on the reference laptop (§7.2). |
| L60 | Lines | partial | No line flicker (L64) and lines present on all 8 features in every bench render. |
| L61 | Painted eyes and hair highlights | partial | Catch-light visible in both eyes in 100% of frames with gaze within ±20°. |
| L62 | Render graph | partial | S14. |
| L63 | Compositing, transparency and the AI label | to build | 100% of rendered frames and exported clips carry the label; watermark detected after |
| L64 | Temporal stability | to build | Flicker metric (mean absolute frame difference after motion compensation) on a slow … |
| L65 | Text normalisation and language routing | to build | Round trip: ASR of the synthesised Hinglish set has character error rate ≤ 15%. |
| L66 | Grapheme to phoneme (IPA) | partial | Phone error rate ≤ 5% on a 500-word Hindi and a 500-word English test list. |
| L67 | Cloned voice synthesis | partial | Speaker similarity (ECAPA-TDNN cosine, 2005.07143) between synthesis and held-out real … |
| L68 | Phone timing | partial | Median boundary error ≤ 20 ms on a hand-labelled 200-phone set per language. |
| L69 | Audio watermark and provenance | to build | Detection ≥ 99% after MP3/Opus re-encoding at 32 kbps; no audible artefacts in the … |
| L70 | Phones to visemes | exists | All IPA phones in the test set map to a class (exists: … |
| L71 | Coarticulation | partial | S3 and S4 (exists as `lip_check`); coarticulation path ratio (2610.03436) within the … |
| L72 | Jaw–lip split and personal mouth range | to build | S6; SLCC on held-out speech ≥ the value of the person's own video (2503.20308 metric). |
| L73 | Tongue and teeth visibility control | to build | Tongue visible on 100% of θ/ð and ≥ 80% of l in close-up; teeth never visible with … |
| L74 | Learned lip refiner | partial | S3–S6 still hold after fusion; PLRS (2503.20308) ≥ rules-only. |
| L75 | Prosody features | partial | Stress agreement with a hand-labelled set ≥ 80%. |
| L76 | Emotion layer | to build | Observers recognise the 5 cues from silent clips ≥ 70% (chance 20%). |
| L77 | Blinks, brows and micro-motion | partial | Blinks per minute within ±20% of the person's own (from L16). |
| L78 | Head motion | partial | Head speed distribution matches the person's own (two-sample KS p > 0.05) on 6/8 bench … |
| L79 | Gaze | to build | Gaze lands within 2° of the target element's centre within 250 ms of the cue. |
| L80 | Action language | partial | Every action in the list parses and expands; every expansion solvable (L83) for all 8 … |
| L81 | Gesture planner | partial | Appropriateness rating (GENEA-style, §8.4) ≥ the rule baseline; no two strokes < 300 … |
| L82 | Target resolution: lesson element to 3D point | to build | S8. |
| L83 | Reaching by inverse kinematics | to build | Target error < 2% of arm length; 0 limit violations. |
| L84 | Hand shapes | partial | Every named shape within L31's limits; observers identify counts 1–5 from renders ≥ 95%. |
| L85 | Gesture phases and timing curves | partial | Stroke within 100 ms of the target stress in 95% of gestures. |
| L86 | Balance, lean and torso compensation | to build | Centre of mass projection inside the base region in all library actions. |
| L87 | Self-collision avoidance | to build | S7: 0 penetrations deeper than 2 mm in the library × 8 bodies. |
| L88 | Idle life and breathing | to build | No interval > 2 s with all joint velocities below 0.2°/s. |
| L89 | Motion mixer and personal style | to build | Mouth closures (S3) never broken by other layers; style scalars within ±2σ of the … |
| L90 | Listening: voice activity and recognition | exists | WER/CER on the Hinglish classroom set within 10% relative of the best single provider. |
| L91 | Turn-taking | to build | False cut-ins ≤ 5% of student turns; median gap after a true end ≤ 300 ms to first … |
| L92 | Listening reactions, contingent on correctness | to build | S12 = 0 agreement signals after wrong steps on the scripted test set; backchannel … |
| L93 | Brain and performance script | partial | 100% of executed tags valid; Leak Guard tests pass (existing voice tests). |
| L94 | Barge-in and repair | to build | S11. |
| L95 | Latency hiding | to build | S10. |
| L96 | Clock, scheduler and adaptive quality | partial | S5 and S14 on the reference laptops. |
| L97 | Model packaging and signing | partial | Tampered files rejected 100%; size ≤ 8 MB. |
| L98 | Self-grading build, bench and release gates | partial | All system gates of §2.5 green before release; the owner approves a video with sound. |

Totals: 98 layers; 15 exist, 45 partial, 38 to build.

---

## 6. Training and data

### 6.1 What is learned once (shared priors) and what per person

| Learned once (shared, rebuilt when improved) | Layer | Data | Size / cost (estimate) |
|---|---|---|---|
| Face-controls / face-shape regressor (points → shape) | L19, L20 fallback | Synthetic CC0 MakeHuman people rendered in Blender (`training/face_controls`) | 20–50k people; CPU or ≈ 10 GPU-h render |
| Population expression deltas | L20 | Same synthetic set + consented bench | — |
| Head prior (30 PCA components) | L24 | Synthetic CC0 heads + consented bench | minutes on CPU |
| Skin-weight residual net | L38 | CC0 MakeHuman rigs posed randomly | ≈ 5 GPU-h |
| Pose correctives (RBF) | L40 | CC0 MakeHuman bodies, simulated | ≈ 1 GPU-h |
| Accessory and facial-hair detectors | L14 | Synthetic renders with CC0 glasses/beards we model | ≈ 5 GPU-h |
| Hand synergy space and pose prior | L31, L84 | Consented hand captures (counting, pointing, palms) + synthetic | small |
| Stroke atlas | L58 | Painted by our own artists (owned) | — |
| Lip refiner (audio → 52 values) | L74 | Consented Hindi/Hinglish/English face video (1–3 h start), `training/lipsync` | ≈ 20 GPU-h fine-tune |
| Indic voice adapter | L67 | Consented readings, 30–60 min per voice; CC0 Common Voice Hindi for robustness | ≈ 10 GPU-h |
| Phone aligner (IPA CTC) | L68 | CC0 / CC-BY speech (Common Voice, LibriTTS-R) | ≈ 20 GPU-h |
| Language-ID for Hinglish | L65 | Our own lesson text + consented transcripts | CPU |
| Gesture scorer | L81 | Consented teaching videos (pose + transcript) | ≈ 5 GPU-h |
| Turn-taking / backchannel model | L91, L92 | Consented two-channel tutoring conversations (10–20 h) | ≈ 10 GPU-h |

| Per person (in the 3–4 minute build) | Layers |
|---|---|
| Neutral 3D face, metric scale, multi-view refinement | L17–L19 |
| Personal expression deltas, correctives, asymmetry, crease curves | L20–L23 |
| Head completion coefficients, ears, neck, stylisation strength | L24–L27, L25 |
| Skeleton, posture, hands, limits, body volume, accessories | L28–L33 |
| Mesh, UVs, binding, weights, LODs | L34–L41 |
| Light, albedo field (band-limited), palette, features, shine, eyes, teeth, hair | L42–L53 |
| Garment fit | L54 |
| Stroke orientation maps | L58 |
| Motion-habit profile, mouth ranges | L16, L72 |
| Voice reference (embedding); optional adapter later, outside the budget | L67 |

### 6.2 Rules for data

- Only data we own, CC0, or licences that allow commercial training; recordings of people who agreed **in
  writing** that their recordings train NexoraGuru's models (`TRAINING.md`). Never scraped faces, voices or
  art. Never commit anyone's photos, video or packs.
- Our own lessons and solutions were drafted with AI agents, so they are lookup material only, never training
  data (`docs/voice/TRAINING.md`); this applies to any text model trained here.
- Research datasets with non-commercial terms are used **only to compare with published numbers**, never to
  train anything shipped.

### 6.3 Datasets and models with licences

| Item | Use | Licence | Ship-OK? |
|---|---|---|---|
| MakeHuman base mesh and assets | Synthetic training people and heads | CC0 (per repo notes) | yes |
| Blender | Rendering synthetic data | GPL (tool only; outputs are ours) | yes (outputs) |
| Mozilla Common Voice | Aligner, voice robustness | CC0 | yes |
| LibriTTS-R | Aligner | CC BY 4.0 | yes (attribute) |
| AI4Bharat IndicVoices / Kathbath | Hindi ASR/aligner | CC BY 4.0 — **UNVERIFIED** | only after checking |
| IIT-Madras IndicTTS | Voice | custom licence — **UNVERIFIED**, treat as no | no |
| RASMALAI (2505.18609) | Indic TTS | **UNVERIFIED** | only after checking |
| BEAT2, AMASS, MEAD, HDTF, VOCASET, Seamless Interaction, VoxCeleb, FFHQ | Comparison only | non-commercial or research terms | no |
| MediaPipe face/pose/hands/segmentation | Stage B | Apache-2.0 | yes |
| YuNet / SFace (OpenCV zoo) | L2, L6, gates | MIT / Apache-2.0 | yes |
| Chatterbox Multilingual | L67 | MIT (with watermark) | yes |
| Kokoro via HeadTTS | L67 fallback | Apache-2.0 (Kokoro); HeadTTS licence **UNVERIFIED** | yes after check |
| CosyVoice (2407.05407) | L67 alternative | Apache-2.0 (per authors) — **UNVERIFIED** for every checkpoint | check |
| wav2arkit_cpu; LAM Audio2Expression | L74 | Apache-2.0 (per `slots.json`, `TRAINING.md`) | yes |
| Whisper; IndicConformer | L90 | MIT | yes |
| gsplat (2409.06765) | Bench comparisons, optional | Apache-2.0 | yes |
| AudioSeal (2401.17264) | L69 | code MIT; weights **UNVERIFIED** | check |
| ECAPA-TDNN (SpeechBrain) | Evaluation only | Apache-2.0 code; weights trained on VoxCeleb | evaluation only |
| Qwen3-8B, sarvam-m | Guru options | Apache-2.0 (per `ENGINE.md`) | yes |
| FLAME, SMPL/SMPL-X, MANO, 3DGS code, insightface, nvdiffrast, F5-TTS, MMS | — | non-commercial | **never** |

---

## 7. Runtime budgets

### 7.1 Build: ≤ 240 s on one 24 GB GPU (e.g., L4 / A10 / RTX 4090 class)

Stage B mostly runs on the person's device during capture, so the server starts from the identity pack.
Times are design targets (**UNVERIFIED** until measured on the bench); CPU work runs in parallel with GPU work
where the dependency graph allows.

| Step | Layers | Device | Target (s) |
|---|---|---|---|
| Unpack, verify signature, consent and lock | L1–L3 | CPU | 5 |
| Re-read any uploads not processed on device | L5–L16 | CPU (parallel) | 0–40, overlapped |
| Canonical face, scale, multi-view BA, expression basis, correctives, asymmetry | L17–L22 | CPU/GPU | 12 |
| Crease curves, head prior fit, stylisation search (renders + SFace) | L23–L25 | GPU | 12 |
| Ears, neck, skeleton, posture, hands, limits, volume, accessories | L26–L33 | CPU | 8 |
| Implicit surface + marching cubes, remesh, UVs, binding | L34–L37 | GPU + CPU | 18 |
| Weights (sparse solves + residual net), correctives, LODs | L38–L41 | GPU | 12 |
| Light + albedo field (alternating least squares on GPU) | L42–L43 | GPU | 30 |
| Palette, no-copy guard, features, shine | L44–L47 | GPU | 12 |
| Eyes, lids, teeth, tongue | L48–L51 | CPU | 3 |
| Hair visual hull, guide field, locks | L52 | GPU | 15 |
| Garment fit | L54 | CPU | 4 |
| Stroke orientation bake | L58 | GPU | 6 |
| Voice reference embedding, mouth ranges | L67, L72 | GPU | 10 |
| Gates: held-out renders, SFace, lip checks, action library × limits/collisions, no-copy, perf proxy | L98 | GPU + CPU | 35 |
| Package, sign, upload | L97 | CPU | 5 |
| **Total (sequential critical path)** | | | **≈ 187** |
| Retry budget for failing gates | L98 | | up to 53 |

### 7.2 Playback: 30 fps at 720p on an ordinary laptop

Reference devices: an Intel Iris Xe-class integrated GPU laptop and a 2020 MacBook Air (M1), Chrome and
Safari. Frame budget 33.3 ms; target GPU ≤ 15 ms and main thread ≤ 6 ms so the lesson page stays smooth.
Estimates, to be measured (**UNVERIFIED**):

| Work | Where | Target |
|---|---|---|
| Motion streams (lips, emotion, blinks, head, gaze), IK, hands, collisions, mixer | Worker | 2.0 ms |
| Hair XPBD (300 locks × 6) and cloth XPBD (≈ 1.5k particles) | Worker | 2.5 ms |
| Upload pose (≈ 60 bones + 52 values + correctives) | Main | 0.3 ms |
| Skinning + morphs (face 6k vertices × 52 targets in a float texture; body 25k) | GPU VS | 1.5 ms |
| G-buffer pass | GPU | 3.0 ms |
| Painted shading + strokes + highlights | GPU | 2.0 ms |
| Kuwahara filter at half resolution + joint-bilateral upsample | GPU | 3.0 ms |
| Lines | GPU | 1.0 ms |
| Temporal stabilisation + composite | GPU | 1.0 ms |
| **GPU total** | | **≈ 11.5 ms** |

Download ≤ 8 MB per teacher (mesh ≈ 2 MB compressed, morph targets ≈ 2 MB at fp16, textures ≈ 1 MB, hair
and garments ≈ 0.5 MB). As a sanity bound, skinned Gaussian avatars reach 40–50 fps on a phone and 240 fps on
a laptop GPU in a web/mobile system (2510.13978); our mesh pipeline is lighter than that per frame, but the
painterly passes are extra.

### 7.3 Conversation latency (student stops → teacher)

| Step | Target |
|---|---|
| End-of-turn decision (L91) | 150–300 ms after the last word |
| Visible pre-reaction (L95) | 250 ms |
| Brain first clause (server GPU, streamed) | 300–500 ms |
| Voice first audio chunk (L67) | 150–250 ms |
| Motion for the first chunk (L70–L89) | < 20 ms |
| Network both ways | 50–100 ms |
| **First audio** | **≈ 0.7–1.1 s** (S10 target median ≤ 1.0 s) |

---

## 8. Evaluation protocol

### 8.1 Metrics

| Family | Metric | Used in |
|---|---|---|
| Likeness (machine) | SFace cosine of neutral, front-lit renders vs. held-out photos, as share of the person's photo-to-photo ceiling; impostor controls | S1, L25, L98 |
| Likeness (human) | 4-alternative lineup by people who know the person; owner's side-by-side sheet | S2 |
| Shape | Face point error (% of eye distance) on held-out frames; silhouette IoU for head, hair, body | L17–L33 |
| Lip sync | Per-class closure and contact rates (S3, S4), mouth range ratio (S6), browser A/V offset (S5); secondary: MTM, PLRS, SLCC (2503.20308) and the coarticulation path measure (2610.03436). SyncNet-style scores (2008.10010) are reported only for comparison, because they reward timing even when shapes are wrong (`ENGINE.md` §4) | L70–L74 |
| Voice | ECAPA speaker similarity vs. real-vs-real ceiling; ASR round-trip WER/CER; MOS; watermark detection | L67, L69 |
| Physical | Joint-limit violations, penetrations, pointing error, centre-of-mass checks, stroke–stress offset | L80–L89 |
| Conversation | First-reaction and first-audio latency, barge-in stop time, false cut-ins, missed stops, backchannel timing, S12 | L90–L95 |
| Rendering | fps and p99 frame time on reference laptops; flicker metric (L64) | L56–L64, L96 |
| Fairness | All of the above by Monk Skin Tone group, sex, age band, glasses, facial hair | S16 |
| Integrity | No-copy test, provenance completeness, label presence, deletion test | L3, L45, L63 |

### 8.2 The bench: 8 people

Eight adults who consented in writing to being on the bench (or whose material has a licence allowing this
use), chosen to cover: both sexes; Monk Skin Tone groups from light to deep (at least 3 people in groups 6–10);
ages 20–60; glasses (2); beard or moustache (2); long hair (2), short hair (2), a head covering if a
volunteer agrees; one capture on a cheap 480p webcam and one on a good phone. Each person gives: the standard
guided capture; a **second-day** capture for held-out tests (harder than the same-session split used so far);
5 minutes of reading in English and Hindi/Hinglish with the face visible (for lip and voice gates);
2 minutes of free explanation with hands visible (for gesture style). Controls: every person's model is also
scored against the other seven (impostors).

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
  that the AI label is understood, not to deceive); open comments.
- **Analysis.** Linear mixed-effects models with participant and lesson as random effects; pre-registered
  hypotheses: H1 A ≥ B on "felt listened to" and appropriateness; H2 A within 1 point of C on clarity; H3 quiz
  scores of A not worse than C (equivalence margin 10%). Report effect sizes with confidence intervals.
- **Ethics.** Every condition shows the AI-generated label; no deception about the nature of A and B; data
  stored without names.

### 8.5 Ablations (to show each new idea earns its place)

No-copy band limit on/off (likeness cost); object-space strokes on/off (flicker); per-class personal mouth
range on/off (S6); rule–network fusion vs. network only (S3, PLRS); correctness gate on backchannels on/off
(S12, trust); DOM-bound pointing vs. fixed "towards the board" pointing (S8, appropriateness); stylisation
by likeness constraint vs. a fixed style strength (S1 vs. owner's style rating).

---

## 9. Risks, open problems and what is new

### 9.1 Top risks

1. **Stylisation and the pixel ban vs. likeness.** Face recognisers are trained on photos; a painted render
   may score lower even when people recognise it. Mitigation: human lineup (S2) as the primary likeness test,
   SFace as a secondary; likeness-constrained style (L25); the gap between machine and human scores is itself
   measured on the bench.
2. **Hands.** Few hand shapes are captured, fingers occlude each other, and hand animation is where avatars
   look wrong first. Mitigation: goal-based hands with limits and synergies (L84), hand-shape coverage in the
   coach (L4), conservative gesture amplitude.
3. **Hindi/Hinglish voice and lips.** Cloned Hindi still trails the best commercial voices; code-mixed text
   causes pronunciation errors; lip-sync models are mostly trained on English. Mitigation: Indic adapter on
   consented data, transliteration (L65), IPA rules with Hindi additions (L66, L70), per-class gates.
4. **Browser performance on weak laptops.** The painterly passes may not fit integrated GPUs. Mitigation:
   quality tiers (L96), filter at quarter resolution, strokes baked into textures.
5. **3–4 minute build with hair, surface and albedo.** The estimate in §7.1 is unmeasured. Mitigation: GPU
   marching cubes and least squares, lower resolutions, retry only failing layers.
6. **Misuse of a cloned voice and face.** Mitigation: consent and identity lock, crypto-shredding, signed
   models that load only in our player, visible label, audio and frame watermarks, scope limited to teaching.
7. **Bias.** Albedo and skin-tone estimation are biased towards light skin (2205.03962, 2411.12002); face
   recognisers vary by group. Mitigation: eye-white calibration, Monk-class-aware palettes, fairness gate S16
   with a deliberately diverse bench.
8. **Licence contamination.** One non-commercial weight would taint the model. Mitigation: L3 ledger as a hard
   gate; UNVERIFIED items in §6.3 are not used until checked.
9. **Uncanny or cold behaviour.** Rule-based gestures can look robotic. Mitigation: learned gesture scorer,
   personal style scalars, user study with ablations.
10. **Pedagogical harm.** A teacher who nods at a wrong answer or bluffs damages learning. Mitigation: L92's
    correctness gate and the honest-face behaviour (L93); S12 = 0.

### 9.2 Open problems

- A painted look that people *and* machines recognise as the person: there is no accepted likeness metric
  for stylised portraits.
- Reliable 3D hands from a few phone frames without a hand model trained on non-commercial MRI or scan data.
- Lip-sync gates for languages beyond English and Hindi without per-language video (the IPA route should
  generalise; it must be tested per language).
- Turn-taking in Hinglish tutoring: no public two-channel corpus with commercial terms; we must record our own.
- A second-day held-out test is harder than the same-session test reported so far for the Living Portrait
  (97–103% of ceiling); expect lower numbers.

### 9.3 What is genuinely new here, and what is not

Not new (prior art we build on): dense-landmark face fitting, personalised blendshapes, anthropometric
skeletons, heat-diffusion skinning and DQS, SH light estimation, toon and Kuwahara-style painterly filters,
line drawing from 3D, dominance coarticulation and JALI, FABRIK, gesture phases, voice activity projection,
zero-shot voice cloning, audio watermarking, LLM tutors. Each is cited at its layer.

New or, to our knowledge, not previously combined this way (to be confirmed by a wider literature search
before any external publication — **UNVERIFIED as novelty claims**):

1. **Measurement-only appearance with a verifiable no-copy gate** (L43–L45): a band limit plus a cross-person
   calibrated patch test, run on every build, so "no photo pixels" is a tested property, not a promise.
2. **Likeness-constrained stylisation** (L25): the style strength is chosen per person as the largest value
   that keeps a likeness threshold.
3. **Painted look stable in motion through surface-anchored strokes oriented by the person's own geometry and
   hair field** (L58, L64), combined with a G-buffer-oriented Kuwahara filter (L59), at laptop frame rates.
4. **Per-sound-class lip gates that work in any language through IPA**, with Hindi-specific rules (aspirates,
   retroflex jaw, ʋ as lip–teeth, anusvara) and per-person mouth ranges per class (L66, L70–L72).
5. **Deixis bound to a live web lesson**: finger and gaze land on the exact element of the animation step
   being discussed, solved through the page layout each frame (L82).
6. **Correctness-contingent listening**: agreement backchannels gated by the tutor's grader (L92).
7. **Gestures as validated goal programs over a measured skeleton**, styled by measured habits, with no motion
   clips (L80–L89).
8. **A self-grading, time-budgeted build** that retries only the layers upstream of a failing gate and otherwise
   names the missing photo (L98).

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

**Face and head shape.** Gower (1975) generalised Procrustes, Psychometrika 40. Umeyama (1991), IEEE TPAMI
13(4). 2007.12494, 2107.04277, 1910.06007 (multi-view face). 2007.06759, 2010.00560, 2508.08429 (personalised
rigs). 2310.17519 (FLARE). 2105.02451 (neural blend shapes). 1911.08008, 1903.03785, 2311.02461 (head models).
2604.13856, 2602.11693 (one-shot full heads). 2203.09692, 2409.07984 (detail; SPARK). 2211.07818, 2505.10072,
2104.14559, 2403.15227 (stylised identity-preserving avatars). Lewis et al. (2014) blendshape practice,
Eurographics STAR. Li, Weise, Pauly (2010) example-based facial rigging, SIGGRAPH.

**Body, hands, rig.** Drillis and Contini (1966) body segment parameters. 2509.06607, 2605.09258 (biomechanics).
2106.10893 (PIANO), 2202.04533 (NIMBLE) — papers only. 2403.03122 (NRDF). 2607.05938 (hand motion priors).
Santello, Flanders, Soechting (1998) postural hand synergies, J. Neuroscience. 2512.06434 (anthropometrics).
Baran and Popović (2007) automatic rigging, SIGGRAPH. 2406.00238 (robust biharmonic skinning). 2307.00842
(VINECS). 2412.02317 (HumanRig). 2203.04746 (SkinningNet). 2601.06378 (RigMo). Kavan et al. (2008) dual
quaternion skinning, ACM TOG. 2104.04934 (velocity skinning). 2503.17032 (TaoAvatar). Lorensen and Cline
(1987) marching cubes. Botsch and Kobbelt (2004) remeshing. Lévy et al. (2002) LSCM. Garland and Heckbert
(1997) quadric simplification. 2003.09820 (rig-space rendering). 2501.17085 (LOD perception).

**Appearance, eyes, mouth, hair, clothes.** Ramamoorthi and Hanrahan (2001) SH irradiance, SIGGRAPH.
2312.05210 (IntrinsicAvatar). 2407.15212 (SGIA). 2312.03704, 2506.06271 (relightable heads). Gooch et al.
(1998) non-photorealistic lighting, SIGGRAPH. 2206.08428 (EyeNeRF). Bérard et al. (2014) eye capture,
ACM TOG. 2411.12981 (gaze redirection). 2008.05023 (audio- and gaze-driven codec avatars). 2409.11951
(GaussianHeads). 2106.12302 (tongue reconstruction). 2306.05872 (Neural Haircut). 2604.05794
(EfficientMonoHair). 2610.40599 (HairDeck). 2604.03716 (CGHair). 2509.21114 (CHARM). 2405.10565 (strand
LOD rendering). 2402.10483 (GaussianHair). 2412.17144 (augmented mass–spring hair). 2507.05191 (Neuralocks).
Macklin, Müller, Chentanez (2016) XPBD, MIG. 2611.02902 (TailorRig). 2605.20460 (HyperBones). 2405.17609
(GarmentCodeData). 2405.11694 (XPBI). 2606.08041 (facial hair capture).

**Painted rendering.** 1810.01175 (line drawings from 3D). 2312.12392 (recursive camera painting).
2403.07807 (StyleGaussian). 2602.00618 (Tune-Your-Style). 2206.06360 (ARF). 2312.10263 (painterly
harmonisation). 2401.16224 (Diffutoon). Meier (1996) painterly rendering for animation, SIGGRAPH.
Kuwahara et al. (1976) processing of RI-angiocardiographic images. Kyprianidis, Kang, Döllner (2009)
anisotropic Kuwahara filtering, Computer Graphics Forum. Cabral and Leedom (1993) line integral convolution,
SIGGRAPH. Winnemöller, Kyprianidis, Olsen (2012) XDoG, Computers & Graphics. 2510.13978 (instant skinned
Gaussian avatars for web). 2308.04079 (3D Gaussian splatting; paper only). 2409.06765 (gsplat).
2404.19398 (Gaussian blendshapes). 2604.23957, 2507.12723 (audio-visual watermarking).

**Voice.** 2505.00579 (voice cloning survey). 2407.05407 (CosyVoice). 2608.11650 (cross-lingual zero-shot
TTS). 2610.14776 (compact TTS). 2402.09378 (MobileSpeech). 2306.07691 (StyleTTS 2). 2211.09536, 2507.15272,
2505.18609, 2410.14197 (Indian-language TTS). 2409.10969, 2412.19043, 2510.25178 (code-switched TTS).
1810.00662 (Hindi–English code-switching corpus). 2004.10353 (Hindi schwa deletion). 2204.03067, 1708.01464
(multilingual G2P). 2311.08323 (IPA alignment). 2606.25460, 2406.19363, 2608.28508 (forced alignment).
2401.17264 (AudioSeal). 2312.03410 (timbre watermarking). 2611.04716 (cross-codec watermark robustness).
2005.07143 (ECAPA-TDNN).

**Lips and face performance.** Fisher (1968) visemes, J. Speech and Hearing Research. Cohen and Massaro
(1993) coarticulation in visual speech, Models and Techniques in Computer Animation. Edwards, Landreth,
Fiume, Singh (2016) JALI, ACM TOG. 1805.09488 (VisemeNet). 2301.06059 (viseme dynamics). 2408.05641
(phoneme-to-articulatory coarticulation). 2507.20343 (DYNARTmo). 2609.30517 (visible articulation).
2610.03436 (geometric coarticulation measure). 2503.20308 (perceptual lip-sync metrics). 2406.14272
(MultiTalk). 2112.05329 (FaceFormer). 2401.08655 (SAiD). 2502.20323 (ARTalk). 2604.23692 (personalised
causal facial motion). 1905.03079 (VOCA). 2008.10010 (Wav2Lip / SyncNet expert). 2608.15110 (CETalk).
2602.09534 (AUHead). 2608.22731 (verbal–nonverbal mismatch). 2502.06875 (LLMs and valence–arousal).
2110.04527 (upper-face generation). 2210.14800 (head motion from speech). 2310.20240 (head pose with speech).
Kendon (1967) gaze in conversation, Acta Psychologica 26. 2501.09921 (TalkingEyes). 2610.19635 (gaze dynamics).
2512.15340 (turn-level interactive heads). 2602.18432 (SARAH).

**Physical actions.** Aristidou and Lasenby (2011) FABRIK, Graphical Models 73(5). 2507.00792 (JAX-IK).
2506.17996 (neural IK). 2508.02106 (physically plausible synthesis). 2506.01563 (intention-aware motion).
Kopp et al. (2006) Behavior Markup Language, IVA. McNeill (1992) *Hand and Mind*. Kita, van Gijn, van der
Hulst (1998) gesture phases. Flash and Hogan (1985) minimum-jerk, J. Neuroscience. Perlin (1985) image
synthesiser, SIGGRAPH. 2412.16563 (SemTalk). 2603.26553 (SemConFlow). 2503.20202 (SARGes). 2407.02151 (deictic
labelling). 2301.05339 (gesture generation review). 2506.01077 (TRiMM). 2609.21576 (GestureFAR). 2604.10927
(LiveGesture). 2610.06153 (Talk, Render, Act). 2603.18771 (educational robot motion). 2509.12507 (pointing
gestures). 2611.25444 (VisualTalk-Bench). 2609.06591 (interaction prior).
2604.25164 (identity-aware motion).

**Conversation.** 2212.04356 (Whisper). 2604.19151, 2305.15386, 2609.24199 (Indian ASR benchmarks).
2406.10993 (code-switched speech). 2403.06487, 2401.04868, 2503.06241 (voice activity projection).
2604.01897 (FastTurn). 2410.00037 (Moshi). 2604.21406, 2509.22243, 2507.23159, 2509.06502 (full duplex).
2410.15929, 2304.04472, 2607.22729 (backchannels). 2507.23298 (nodding types). 2112.13548, 2409.20188,
2609.40317 (listening heads). 2510.04637, 2506.22554 (dyadic behaviour). 2206.02436 (confusion detection).
2603.09536, 2604.12253 (LLM pedagogical agents). 2308.15214 (FurChat). 2603.03282 (MIBURI). 2611.30388
(BASE). 2608.24909 (streaming digital-human agents). 2503.18429 (Teller).

**Evaluation.** 2208.10441, 2308.12646, 2608.10839 (GENEA challenges). 2101.03769 (gesture evaluation
review). 2605.06063 (avatar representation in gesture evaluation).

**Internal documents.** `docs/pratibimb/BRIEF.md`, `LAYERS.md`, `ARCHITECTURE.md`, `ENGINE.md`, `SPEC.md`,
`TRAINING.md`, `PACK_FORMAT.md`; code in `scripts/pratibimb/engine/` and `scripts/teacher/maker/`.
