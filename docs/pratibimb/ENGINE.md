# The Pratibimb Engine: our own digital-human teacher

The owner's goal (2026-11-26): **one output, a digital human of a real, consenting person that looks almost
exactly like their photos and video, speaks in their voice with perfect lip sync, moves and gestures freely
(not a fixed set of animations), has its own brain, and converses like a human.** Built by us: we learn
ideas from published research and write our own design and code. We never copy code, and for anything
under a non-commercial licence we read only the paper.

This file is the design. It was written from about 220 papers (2024–2026, full text of about 40), listed
at the end. Numbers marked *(paper)* are what the authors report on their hardware; we will measure our own.

## 1. Why our own engine can win

General video models draw anyone doing anything, which needs enormous training budgets. We need one narrow
thing: **a teacher, waist up, facing the student, explaining.** A narrow job lets small models, trained by
us on consented data, reach top quality: our warp-based test already matched 8 different people at 97–103%
face-recognition likeness on held-out video with no training at all.

## 1a. Owner's priorities (2026-11-26, later the same day)

- **Inputs stay as they are**: the capture we already take (guided scan, phone, uploads, optional video,
  consent clip with the voice). No new long recording.
- **Building a person's model takes 3–4 minutes at most** (faster is better), with **perfection first**:
  lip sync, face and body must match the person.
- **Any language**: English first, built so any language can be added.
- The output never changes: one digital human that looks like them, speaks and converses.

## 1b. Building a person in 3–4 minutes (one rented GPU)

The heavy learning happens **once**, in a shared model trained on consented people; each new person needs only
a short fit. Recent work builds drivable 3D people in seconds from photos or a phone video with a model
trained beforehand (UIKA 2601.07603, GUAVA 2505.03351, FFAvatar 2605.15320 and 2606.30347, LHM 2503.10625,
InstantHand 2611.08330), and a short test-time adaptation on the person's own frames lifts it further
(ELITE 2601.10200). We build our own on these ideas, on our own body model.

| Time | Step |
|---|---|
| ~40 s | Read the capture (face points, 52 expression values, metric body measurements, voice); the identity pack |
| ~10 s | **Our feed-forward model** turns all the person's photos and frames into a drivable 3D upper body (face, hair, body, hands, mouth layer) on our mesh |
| ~2 min | **Polish on their own frames**: pixel loss on every frame, face-recognition identity loss, their 478 face points lock the face shape, their measured shoulders, neck and head lock the body, and their own mouth frames build the real-mouth library |
| ~30 s | **Gates on frames it never learned from**: face likeness ≥ 95% (our bench: 97–103%), body measurements within tolerance, lip-sync check; on failure it polishes longer by itself, or names the missing photo |

Every model ships with its **likeness report** (face, body, lips as numbers with pass/fail) and can be
**rebuilt in one click** when the shared model improves, with no new recording.
Hands are the weak spot: the current capture shows few hand shapes, so the shared model fills them in.
One-off cost: training the shared model, roughly 150–500 GPU-hours (estimate).

## 1c. Any language

- Lips are driven by **sounds, not words**: every language goes through a grapheme-to-phoneme step into the
  international phonetic alphabet (IPA), and the motion maker maps phonemes to mouth shapes. Articulation is
  shared across languages, so a new language moves the lips correctly at once (MuEx 2510.06612: phoneme and
  viseme alignment carries lip sync across 12 languages; Polyglot 2604.16108; AudioFace 2605.07478).
  A few hours of that language perfect its details.
- The voice keeps **speaker identity separate from language**, so a person's voice can speak languages they
  never recorded.
- **Adding a language** = its phoneme converter + a short voice fine-tune + its lip test set. The person's
  model is never rebuilt. English first; Hindi and Hinglish next (rules in §3.5).

## 2. The five layers

```
 student speaks ──► 5. CONVERSATION ──► 1. BRAIN ──► performance script ──► 2. VOICE
                         ▲                                  │                  │ audio + phoneme timeline
                         │                                  ▼                  ▼
                     WebRTC ◄── 4. RENDERER ◄────────── 3. MOTION MAKER ◄──────┘
                    (one media clock: audio is the master, video follows)
```

### 1. Brain: decides what to say and how
- An open language model, free for commercial use (Qwen3-8B or sarvam-m, Apache-2.0), with a persona card,
  per-student memory (a summary and misconceptions stored as rows) and retrieval over **our own** lessons,
  solutions and Nexus mastery. Guru's rules apply: the hint ladder, the Leak Guard, and no help during tests.
- It writes a **performance script**, one clause at a time, checked against a fixed list (anything outside
  it falls back to rules):
  `{say, lang, emo:{valence, arousal}, gaze: board|student|away, gesture: point|count|open|beat|namaste|…,
  target: <lesson step id>, emphasis:[words], pause_ms}`

### 2. Voice: the person's own voice
- Chatterbox Multilingual (MIT, watermarked) with our own Indic fine-tune, trained on 2–5 hours of the
  consenting teacher's recordings. A transliteration step handles Hinglish (a published Chatterbox + Indic
  LoRA cut code-mixed errors from 0.80 to 0.14–0.27 *(paper)*).
- The voice outputs the **phoneme timeline** with the audio. Because we make the speech ourselves, the
  timing is exact and the motion maker can look 160–300 ms ahead at no cost.

### 3. Motion maker: how every part of the body moves
- Our own model: a causal autoencoder with continuous codes at 25 fps in three streams: face (52 ARKit
  values + jaw, tongue, eyes), head and gaze, and upper body with hands **on our own skeleton**.
  - A transformer of about 100–150M parameters with a flow-matching head, distilled to 1–2 steps.
  - Chunks of 160 ms.
  - A speaking/listening flag, so the mouth is still while she listens.
- Inputs: the phoneme timeline (lips), prosody features (emphasis, nods, brows), the script tags (emotion,
  gaze target, gesture), and the student's audio while listening (reactions).
- **Any gesture, not a fixed list:** gestures with a meaning (namaste, pointing, counting on fingers) come
  from a library of the teacher's own recorded gestures, retrieved and blended into the generated motion.
  Rhythm gestures come from the model itself. A new gesture is added by recording it once.
- Speed: under 15 ms per chunk on one consumer graphics card *(papers: AVTR-1 71 ms on L40S, GestureFAR
  9.3 ms per token)*, so motion is never the bottleneck.

### 4. Renderer: turns motion into photoreal frames of the person
- One upper-body model per person, made of 3D Gaussians (tiny soft colour points) bound to our own body
  mesh: the MakeHuman base (CC0), the MediaPipe face layout and our own hand model. **Not SMPL-X, FLAME or
  MANO**, which are non-commercial without a paid licence.
- Expressions are Gaussian blendshapes driven directly by the 52 values (published at 370 fps *(paper)*).
- The mouth interior (teeth on the jaw, tongue) is its own layer, filled from a **real-mouth library**:
  crops of the person's own mouth for every sound, recorded during capture.
- Three tiers from one model:

  | Tier | How | Target |
  |---|---|---|
  | Live | Gaussian feature render + a small clean-up network, with sharper crops for mouth and hands | 40–60 fps, one rented GPU *(papers: 49–52 fps on an RTX 3090)* |
  | Browser | The same model slimmed and baked (60–150k points) | WebGPU; similar models run at 90–120 fps on phones and headsets *(papers)* |
  | Lessons | Live render + an offline video pass that perfects hands and mouth, locked to the render | Minutes per clip |

- A shared starting model trained once on consenting people (about 150 GPU-hours, ≈ $150–300), then each
  new teacher is fine-tuned from their capture (target under an hour, ≈ $1–3; not yet proven by any paper
  with hands).

### 5. Conversation: listening, turn-taking, answering
- Voice activity detection, then streaming speech recognition (IndicConformer, MIT, or Whisper large-v3),
  then **our own turn controller**, a small model trained on two-channel Hindi and English conversations. Each
  moment it chooses one of: keep listening, answer, backchannel ("haan", "achha", a nod), stop (the student
  interrupted), or ignore noise.
- Barge-in: when the student speaks for more than 300 ms (and it isn't a backchannel), her audio fades in
  80 ms and the brain's context is cut to the words the student actually heard.
- Latency, from the student finishing to the teacher's lips moving: about 0.9 s on one rented GPU,
  0.45–0.6 s when the answer is prepared just before the student finishes. At 0.25 s she already shows that
  she is about to answer (a breath, a lift of the brows), so the pause never feels dead.

## 3. Our own ideas (not in the papers)

1. **The teacher knows the lesson on screen.** Animations already record their steps (`swap`, `cmp`,
   `found`…). The brain says "point at node X at step S"; the motion maker gets its screen position, so her
   eyes and finger land on the exact element when it changes.
2. **Teaching manners.** She pauses before a key result, nods only after a *correct* step (never agrees with
   a wrong answer), waits 3–5 s after asking a question, and says "haan, bolo" when interrupted, then offers
   to finish her point.
3. **Honest face.** When the brain is unsure (weak retrieval), she looks away briefly, hedges and points to
   the source instead of bluffing.
4. **Confusion check.** On the student's own device only, frowns, long pauses and rising "umm" trigger
   "Kahan atke?" and move the hint ladder one step. No frame leaves the device.
5. **Hindi and Hinglish mouth rules.** Full lip closure on प फ ब भ म; longer opening on aspirated sounds; व
   as lip-to-teeth; retroflex sounds with a lower jaw; no closure on anusvara unless a lip sound follows;
   timing follows schwa deletion. They act as a prior and a training loss, and are tested on a Hinglish set.
6. **A capture that knows what's missing.** The camera coach tracks which mouth shapes, expressions and
   hand shapes the model has not seen yet, and asks for exactly those ("show the back of your hand, pointing
   up").
7. **Lesson cache.** A lesson's script is known in advance, so its hard gestures are rendered in top
   quality ahead of time; only unscripted answers are drawn live.
8. **Self-check before showing.** A small lip-reader reads every pre-rendered clip back. Frames whose sound
   doesn't match are made again. A pass that refines only new hand and mouth regions saves compute.
9. **Quality gates on every update.** Likeness (face recognition on held-out video), lip sync (our own
   mouth-shape checker) and audio–video offset (±40 ms) must pass, or the update stops.
10. **Everything editable.** Movement, look, clothes, light and voice are separate layers, so any one can be
    changed without remaking the others.

## 4. How we measure "perfect"

- **Likeness:** face recognition on held-out video (our bench: 8 people, controls against other people).
- **Lip sync:** our own mouth-shape checker for Hindi and English. p/b/m must close and f/v must touch the
  teeth; we report the error per sound class. The usual SyncNet score rewards timing even when the mouth
  shape is wrong (a published checker agreed with people at 0.83, SyncNet at 0.34 *(paper)*). Audio–video
  offset is measured in the browser.
- **Conversation:** response time, interruption time, wrong cut-ins, missed stops, backchannel timing.
- **"Feels human":** at least 30 students each talk to ours, ours without listening reactions, and a real
  teacher on video. They rate naturalness, lip sync, "felt listened to" and trust, then take a short quiz
  and answer "was this a person?".

## 5. Data (consented only, never committed, revocable)

| What | Who | Amount |
|---|---|---|
| Motion pretraining | 15–30 consenting Indian speakers, phone face capture + 2–3 cameras, scripted and free lectures in English, Hindi and Hinglish | 30–60 h |
| Listening and turn-taking | Paired conversations between staff | 10–20 h |
| Each teacher | Guided capture: a slow turn, a phoneme-rich Hinglish script with teeth visible, the 52-shape range, a hand alphabet (counting, pointing, palms), 30 s of teaching | 20–30 min |
| Their voice | Clean reading | 2–5 h for the best clone (10 s for a first one) |

Datasets under research or non-commercial licences (Seamless, BEAT2, AMASS, MEAD, HDTF, VOCASET) are used
only to compare with published numbers, never to train what we ship. Every output is labelled
"AI-generated"; audio is watermarked.

## 6. Build order (each step shows the owner a result)

| Step | What | GPU | Shows |
|---|---|---|---|
| 1 | Performance script format, lesson link, motion stream (done: `stream.py`) | none | Script → stream on the existing player |
| 2 | Capture app v2: the guided 20–30 min recording with coverage meter | none | The capture page |
| 3 | Renderer v1 for one person (Gaussians on our mesh, mouth layer) | 1 rented, ~1 day | Her, driven by her own held-out video, judged on likeness |
| 4 | Motion maker v1 (lips + head from the phoneme timeline) | 1 rented, ~1 day | Her saying a new sentence in her cloned voice |
| 5 | Gestures: library + generated rhythm, pointing at lesson steps | 1 rented | Namaste, pointing, explaining with hands |
| 6 | Conversation loop live (turn controller, brain, barge-in) | 1 rented, always on | Talk to her on a test page |
| 7 | Shared prior + browser tier + the 30-student study | several rented days | Ready to approve |

Estimated GPU cost to step 6: a few hundred dollars (rented prices are estimates; checked before each run).

## 7. Risks, plainly

- Fingers filmed with one or two cameras (crossings, depth order): the hardest part; more capture views help.
- The tongue (no ARKit value covers it) and hair or loose clothes.
- Light baked into the capture: relighting is later work.
- Per-person training under an hour with hands is our target, not yet shown by any paper.
- Hindi voice quality still trails the best commercial voices; it must be measured.

## 8. Papers read (arXiv ids)

Motion: 2609.22913, 2609.21576, 2604.10927, 2608.01643, 2502.20323, 2508.16401, 2606.30145, 2607.23840,
2609.40317, 2604.17211, 2510.06612, 2511.22863, 2505.15197, 2507.22731, 2610.21452, 2608.25734, 2504.13386.
Renderer: 2404.19398, 2505.03351, 2608.04722, 2603.12063, 2510.13587, 2503.17032, 2412.15171, 2605.01854,
2610.02207, 2407.21686, 2603.11746, 2608.11745, 2609.30963, 2607.28039, 2506.22065, 2411.19509.
Lip sync and conversation: 2610.09223, 2606.11180, 2611.26540, 2604.23295, 2606.13450, 2609.11066,
2603.08216, 2603.14877, 2609.29418, 2604.25441, 2602.04913.
Licence notes: SMPL-X / FLAME / MANO, Seamless (CC-BY-NC), AVTR-1 weights (revenue cap and broad derivatives
clause), F5-TTS base (CC-BY-NC) and InsightFace models are not used in anything we ship.
