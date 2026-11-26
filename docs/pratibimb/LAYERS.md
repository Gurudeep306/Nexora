# Pratibimb black box: 64 layers

Owner's brief (2026-11-26): our own technology, built layer by layer; every layer does real work and feeds
the final output: **a decent-looking human that resembles the person, can do every physical thing a person
does with the upper body, talks in their voice with good lip sync, and converses.** Nothing from memory alone:
every layer cites the research it learns from; where research has no answer, we invent and test our own.

Research base: about 310 papers found in 13 areas (`scratchpad/res/layers.json` index; full texts read for the
key ones), plus about 220 read earlier (`docs/pratibimb/ENGINE.md`). Ids are arXiv numbers.

## How we innovate (the method itself, from the research)

1. **Design science** (Hevner 2004; reviewed for software in 1904.12742): every layer is an artefact built
   in a cycle of *build → evaluate against a measurable gate → improve*. Nothing moves on until its gate passes.
2. **TRIZ, resolving contradictions** (Altshuller; automated in 2403.13002, 2506.18783): where two needs
   clash, we look for a design that removes the clash instead of trading one off against the other. Our clashes:
   - *Likeness vs no photo pixels.* Resolved: learn **only the person's colours and measurements** (albedo,
     proportions) from the photos; never their pixels (layers 25–31).
   - *Any gesture vs no animation library.* Resolved: gestures as **physical goals solved at runtime**
     (inverse kinematics plus constraints), so new ones need no animator (layers 40–47).
   - *Quality vs ordinary computers.* Resolved: heavy learning **once at build time**; the playing model is
     small and explicit (layers 58–62).
3. **Recombination** (Computational Creativity, 2405.01453): new results come from combining proven pieces
   in a new arrangement, which is how our black box is built.

Notation per layer: **In → Out. Method (research). Our idea. Gate.**

---

## Stage A: Reading the person (L1–L10)

| # | Layer | In → Out | Method (research) | Our idea | Gate |
|---|---|---|---|---|---|
| 1 | Consent and identity lock | consent clip, frames → identity vector, consent record | face verification (SFace, Apache) | consent face must match the capture before anything is built (built) | match ≥ 0.363 |
| 2 | Frame quality | frames → scored frames | sharpness, exposure, motion blur, face size | still-picture and repeat rejection (built) | ≥ 40 usable frames |
| 3 | Main-person tracking | frames → one person's frames | identity clustering | most-frequent identity (built) | other people never used |
| 4 | Dense face points | frames → 478 points per frame | dense landmarks beat sparse (2204.02776) | zoom crop before detection (built) | detection on ≥ 95% frames |
| 5 | Expression reading | frames → 52 values | ARKit-style action units | calibrated per person against their neutral | neutral frames read ≤ 0.1 |
| 6 | Head pose | frames → yaw/pitch/roll | transformation matrix | person-relative zero (straight ahead) | pose jitter < 1° |
| 7 | Body points | frames → 33 points | pose estimation; bone-length constancy over time (2002.10322) | median bone lengths over the video | length variance < 5% |
| 8 | Hand points | frames → 21 points per hand | hand landmarking | keep only confident, unoccluded hands | ≥ 10 hand frames or flag |
| 9 | Part masks | frames → hair/face/body/clothes masks | selfie segmentation | per-frame person-only mask (built) | mask IoU across frames stable |
| 10 | Colour calibration | frames → white-balanced colours | eye-white reference | scene-light removal per frame (built) | sclera ≈ neutral grey |

## Stage B: The person's shape (L11–L24)

| # | Layer | In → Out | Method (research) | Our idea | Gate |
|---|---|---|---|---|---|
| 11 | Canonical face | L4 → neutral 3D face, fixed frame | generalised Procrustes | stable-point alignment (built) | held-out error < 2% (1.05%) |
| 12 | Metric scale | iris, pupils → mm per unit | iris diameter constancy | combine iris + pupil prior with uncertainty (built) | uncertainty < 8% |
| 13 | Personal expression space | L11 + L5 → their blendshapes | personalised face models (2007.06759, 2010.00560, FLARE 2310.17519) | ridge-learned per-person basis (built) | held-out < 2% |
| 14 | Corrective shapes | combined expressions → corrections | pose/expression correctives (2105.02451) | correctives only where pairs co-occur in their video | combo error drops ≥ 20% |
| 15 | Symmetry and asymmetry | L13 → symmetric base + their own asymmetry | morphable-model symmetry priors | keep measured asymmetry (likeness), remove noise | asymmetry stable across days |
| 16 | Face detail field | L11 → wrinkles/creases as a displacement map | dense-landmark detail (2204.02776), SPARK 2409.07984 | detail only where the frames agree | detail improves held-out photo error |
| 17 | Full head completion | L11 + side views → closed head | complete head models (1911.08008); full-head avatars (2411.15604, 2604.13856) | our own head prior from consented bench people | side silhouette IoU ≥ 0.9 |
| 18 | Ears | side views → ear shape and placement | head-model ear components (1911.08008) | proportional placement + silhouette fit | ear in side view within 3 px |
| 19 | Neck and throat | head + shoulders → neck volume | anthropometrics | neck width from the frames' silhouettes | silhouette IoU ≥ 0.9 |
| 20 | Skeleton | L7 → bones with their lengths | bone-based pose decomposition (2002.10322) | anthropometric fill + clamp (built) | ratios inside human range |
| 21 | Spine and posture | L7 over time → spine curve, habitual posture | biomechanical spine models (2509.06607) | their own resting posture | posture reprojection < 4% |
| 22 | Hands skeleton | L8 → 27-DoF hands, lengths | anatomical hand models (PIANO 2106.10893, NIMBLE 2202.04533) | finger lengths from frames, else ratios | fingertip error < 5 px |
| 23 | Joint limits | anatomy → per-joint ranges | biomechanical limits (2509.06607, 2605.09258); pose priors (NRDF 2403.03122) | a plausibility score for any pose | no library pose outside limits |
| 24 | Body volume | silhouettes → torso and arm cross-sections | silhouette carving | ellipse sections fitted per height (built in part) | silhouette IoU ≥ 0.9 |

## Stage C: Surface and skin (L25–L36)

| # | Layer | In → Out | Method (research) | Our idea | Gate |
|---|---|---|---|---|---|
| 25 | Watertight surface | L17 + L24 → one mesh | implicit surface + meshing | smooth blend of head and body at the neck | no holes, manifold |
| 26 | Remeshing | L25 → even triangles, edge loops at joints | quad-dominant remeshing | denser loops at mouth, eyes, elbows, knuckles | min angle > 20° |
| 27 | Skin weights | L25 + L20 → weights | learned/automatic skinning (VINECS 2307.00842, HumanRig 2412.02317, RigMo 2601.06378) | heat diffusion + learned correction from their video | no tearing in any library pose |
| 28 | Twist-free deformation | weights → dual-quaternion skinning | DQS | blend LBS/DQS per joint | volume change < 10% at elbows |
| 29 | Pose correctives | poses → corrective shapes | neural blend shapes (2105.02451) | correctives learned from their own frames | silhouette error drops ≥ 20% |
| 30 | UV layout | L26 → texture coordinates | seam placement in hidden areas | seams behind hair and under arms | stretch < 10% |
| 31 | Albedo (skin colour) | frames + L25 → albedo map | inverse rendering (IntrinsicAvatar 2312.05210, SGIA 2407.15212, FLARE 2310.17519) | spherical-harmonic light per frame (built) | albedo stable across frames |
| 32 | Skin regions | albedo → regions (cheek blush, lips, under-eye) | colour clustering | keep their natural tone variation | region colour ΔE < 3 between days |
| 33 | Specular and roughness | frames → shine map | PBR inverse rendering (2407.15212) | forehead/nose shine from highlights | highlights match position |
| 34 | Subsurface feel | albedo → soft light bleed | screen-space subsurface scattering | warm red bleed at edges | no waxy look (owner's eye) |
| 35 | Normal detail | L16 → normal map | detail displacement | pores only at "decent" level | detail visible at 1 m, not noisy |
| 36 | Decent-look simplifier | L31–35 → clean "decent" skin | stylisation (ToonifyGB 2505.10072, AgileAvatar 2211.07818) | slider from real to clean | likeness ≥ 90% at default |

## Stage D: Eyes, mouth, hair, clothes (L37–L48)

| # | Layer | In → Out | Method (research) | Our idea | Gate |
|---|---|---|---|---|---|
| 37 | Eyeballs | eye rings + iris colour → eyes | eye modelling (EyeNeRF 2206.08428) | sclera, iris, pupil, cornea bulge, wet highlight | no head interior at ±30° gaze |
| 38 | Eyelids | L13 → lids that wrap the eye | lid follows gaze | lids hug the eyeball on gaze shifts | no lid–eye gap |
| 39 | Lashes and brows | L4 + colours → strips | card geometry | thickness and colour from the frames | brow shape IoU ≥ 0.8 |
| 40 | Teeth | mouth frames → teeth arc | full head models with teeth (1911.08008) | upper on skull, lower on jaw | teeth seen only when lips part |
| 41 | Tongue | phonemes → tongue shapes | articulatory models (2408.05641, DYNARTmo 2507.20343) | 6 tongue shapes for t/d/l/th/k | tongue visible on "th", "l" |
| 42 | Mouth cavity | lip ring → dark interior | interior modelling | depth-shaded interior | no see-through mouth |
| 43 | Hair shape | hair masks, several angles → hair volume | strand/card reconstruction (Neural Haircut 2306.05872, EfficientMonoHair 2604.05794) | volume carved from silhouettes | silhouette IoU ≥ 0.8 |
| 44 | Hair cards | L43 → clumps as cards | hair cards (HairDeck 2610.40599, CGHair 2604.03716) | clumps grown along a guide field | ≤ 300 cards, IoU kept |
| 45 | Hair shading | colour → anisotropic shine | real-time strand rendering (2405.10565) | two-lobe highlight | highlight moves with light |
| 46 | Hair motion | head motion → sway | spring bones | damped springs per card root | no hair through the head |
| 47 | Clothes | body → garments (styles, colours) | offset surfaces, garment-aware rigging (2611.02902) | wardrobe as parameters (Indian and Western) | no body through cloth |
| 48 | Cloth motion | body motion → folds | cheap cloth (position-based dynamics) | folds at elbows and waist | stable at 30 fps |

## Stage E: Physical actions (L49–L56)

| # | Layer | In → Out | Method (research) | Our idea | Gate |
|---|---|---|---|---|---|
| 49 | Action language | request → goals ("point at x", "namaste") | intention-aware motion (2506.01563) | every action = goals + timing, not a clip | any listed action parses |
| 50 | Reaching (IK) | goal → arm pose | IK; physically plausible synthesis (2508.02106) | FABRIK + joint limits + elbow comfort | target error < 2% |
| 51 | Hand shapes | goal → finger pose | hand pose priors (2403.03122) | named shapes (point, count 1–5, open, fist, OK) | within joint limits |
| 52 | Gesture phases | stroke timing → preparation, stroke, hold, retraction | gesture phases (McNeill; social gesture 2610.06153) | stroke lands on the stressed word | stroke within 100 ms of stress |
| 53 | Body balance and lean | actions → torso compensation | balance / centre of mass | lean when reaching far | centre of mass stays over base |
| 54 | Collision avoidance | poses → no hand through body | self-collision | capsule checks + push-out | zero penetrations |
| 55 | Idle life | time → breathing, weight shifts, micro motion | procedural noise (Perlin) | breathing tied to speech pauses | never frozen > 2 s |
| 56 | Teaching gestures | lesson events → point at the board step | educational co-speech gestures (2603.18771) | point at the exact animation step on screen | pointing lands on the element |

## Stage F: Voice, lips, face performance (L57–L62)

| # | Layer | In → Out | Method (research) | Our idea | Gate |
|---|---|---|---|---|---|
| 57 | Voice | text → audio + phoneme times | TTS with timings (built: HeadTTS) | the person's cloned voice later | intelligible, natural |
| 58 | Sounds to mouth targets | IPA → viseme targets | viseme classes; VisemeNet (1805.09488) | one table for every language (built) | all IPA sounds mapped |
| 59 | Coarticulation | targets → smooth trajectories | dominance functions; articulatory coarticulation (2408.05641), visible articulation (2609.30517) | per-person mouth range from their video | p/b/m closed, f/v on teeth (built check) |
| 60 | Jaw–lip split | trajectories → jaw + lips separately | JALI (jaw/lip independence); viseme dynamics (2301.06059) | loud speech opens the jaw, not the lips | audio-video offset ≤ 40 ms |
| 61 | Face performance | prosody → brows, blinks, head motion | head motion from speech (2210.14800); gaze from speech (TalkingEyes 2501.09921) | blink rate from their own video | blinks within their range ±20% |
| 62 | Listening behaviour | student's speech → nods, gaze, backchannels | turn-level interactive heads (2512.15340), dyadic behaviour (2510.04637) | never nods at a wrong answer | backchannel timing judged natural |

## Stage G: Rendering and delivery (L63–L64)

| # | Layer | In → Out | Method (research) | Our idea | Gate |
|---|---|---|---|---|---|
| 63 | Renderer | everything → frames | real-time rendering; line drawing from 3D for contours (1810.01175) | our own WebGL: soft key/fill/rim, transparent background | 30 fps at 720p in a browser |
| 64 | Quality gates and report | outputs → pass/fail report | design-science evaluation | one bench run over 8 people for every change | every gate green before release |

---

## Build order (each layer built, gated and committed before the next)

A (L1–10: mostly built) → B (L11–24) → C (L25–36) → D (L37–48) → E (L49–56) → F (L57–62) → G (L63–64).
Built so far, in some form: L1–L13, L20, L24, L31, L47, L57–L59 (`scripts/pratibimb/engine/`,
`scripts/teacher/maker/`). The rest are designed here and built in this order.
