# Full-body motion, joint control, interaction and consent for the Pratibimb browser teacher

Scope: what motion data, models and libraries NexoraGuru may use commercially for free with a VRM 1.0 (three-vrm) teacher, how to make her move and react like a person, and what a consent flow for photo-built avatars must contain under Indian law. Researched 2026-11-25. Licence texts were fetched from raw.githubusercontent.com, Hugging Face API and official pages where possible; anything taken only from search summaries is marked **(unverified: secondary)**. `quaternius.com` could not be reached from this session (DNS blocked), so Quaternius facts come from itch.io/OpenGameArt/press summaries.

## Commercial-OK motion sources and motion-generation models

### Takeaway
For data, only CC0 packs (Quaternius UAL 1 and 2), Mixamo (royalty-free inside a product, but no raw redistribution and reportedly no ML training), CMU MoCap (free incl. commercial products, no resale) and Rokoko free Motion Library clips are safe for shipping. Almost every text-to-motion and co-speech model (MDM, MotionGPT, MoMask, T2M-GPT) has MIT/Apache *code* but was trained on AMASS/HumanML3D/SMPL, which are non-commercial, so their *weights and outputs* are not safe for a commercial product; Bandai Namco's dataset is CC BY-NC 4.0 and also out.

### Cited Findings
**Motion data**
- Quaternius Universal Animation Library (UAL 1): all animations CC0; a Standard (free) zip and a Pro zip (33 MB, $9.99) exist; UAL 2 described as 130+ animations (melee/armed combos, parkour, farming, fishing, zombie locomotion), standard version free with ~70% of the set, licence CC0 — [OpenGameArt UAL](https://opengameart.org/content/universal-animation-library); [itch.io UAL 2](https://quaternius.itch.io/universal-animation-library-2); [Digital Production, Feb 2026](https://digitalproduction.com/2026/02/10/130-animations-one-rig-zero-drama/) **(unverified: secondary; exact Pro clip list not obtained — quaternius.com blocked)**. Quaternius describes UAL 1 as "a kit of 120+ animations, created using a universal humanoid rig … compatible with Unreal Engine, Godot and Unity, ready for retargeting" (meta text of [quaternius.com UAL page](https://quaternius.com/packs/universalanimationlibrary.html), fetched by curl). Clip preview: quaternius.com/animviewer.html (per search summary).
- Note for the team: the current system uses 43 UAL clips; UAL 1 says 120+ and UAL 2 adds 130+, so most of the CC0 library is not yet used (Pro is paid, $9.99 — the owner cannot pay, so Standard only unless someone buys it; Pro content is also CC0 per summaries).
- Mixamo official FAQ (fetched): "You can use both characters and animations royalty free for personal, commercial, and non-profit projects including: …" — [Adobe Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html). Adobe staff forum post: raw character/animation files may not be distributed, and training machine-learning models on Mixamo content is not allowed — [Adobe community FAQ thread](https://community.adobe.com/t5/mixamo-discussions/mixamo-faq-licensing-royalties-ownership-eula-and-tos/td-p/13234775) **(unverified: forum, not terms text)**. Mixamo needs an Adobe account.
- CMU Graphics Lab MoCap: the database page says the data is "free for all uses"; "you may include this data in commercially-sold products, but you may not resell this data directly, even in converted form"; asks for an acknowledgement — [CMU mocap (resources/FAQ)](https://mocap.cs.cmu.edu/resources.php) **(fetched page failed; wording from search summary)**. A 4TU FBX conversion is relabelled CC BY-NC 4.0, so use only the original or an equally free conversion — [4TU.ResearchData](https://data.4tu.nl/datasets/0448aab2-3332-449f-a8e2-d208cb58c7df). CMU has no fingers and old, noisy skeletons; it is BVH.
- Bandai Namco Research Motion Dataset: README (fetched) — "Bandai-Namco-Research-Motiondataset-1: CC BY-NC 4.0", "-2: CC BY-NC 4.0", Blender visualiser MIT; the dataset LICENSE file begins "Attribution-NonCommercial 4.0 International" — [GitHub README](https://github.com/BandaiNamcoResearchInc/Bandai-Namco-Research-Motiondataset). **Not usable commercially.**
- AMASS licence page (fetched): "Dataset Copyright License for non-commercial scientific research purposes … To use the Dataset for the sole purpose of performing non-commercial scientific research, non-commercial education, or non-commercial artistic projects" — [AMASS license](https://amass.is.tue.mpg.de/license.html).
- HumanML3D: repo code MIT, but the data "originates from a combination of HumanAct12 and Amass" and "Due to the distribution policy of AMASS dataset, we are not allowed to distribute the data directly" (README, fetched) — [HumanML3D](https://github.com/EricGuo5513/HumanML3D). So HumanML3D inherits AMASS's non-commercial terms.
- SMPL-X model licence (fetched): "Software Copyright License for non-commercial scientific research purposes"; "Any other use, in particular any use for commercial … purposes is prohibited. This includes, without limitation, incorporation in a commercial product, use in a commercial service, or production of other artifacts…"; commercial via Meshcapade — [SMPL-X model license](https://smpl-x.is.tue.mpg.de/modellicense.html). Meshcapade commercial licences reported at about €2,000/year (micro-enterprise) — [Meshcapade body models](https://meshcapade.com/assets/body-models) **(unverified: secondary summary of pricing)**.
- Rokoko Motion Library: launched 150 free mocap moves in 2020, "licensed for use in commercial projects" — [CG Channel 2020](https://www.cgchannel.com/2020/03/get-150-free-mocap-moves-from-rokokos-motion-library); pricing page says Motion Library animations can be used in any projects including commercial — [Rokoko pricing](https://rokoko.com/pricing/) **(unverified: no current licence text found; check which clips are still free)**.
- No reliable source found for an "OpenMoCap" CC0 dataset or other "Kinetic" CC0 packs within the call budget — see Gaps.

**Motion-generation models (code licence fetched from raw LICENSE files)**
- MDM (motion-diffusion-model): "MIT License, Copyright (c) 2022 Guy Tevet"; README: "our code depends on other libraries, including CLIP, SMPL, SMPL-X, PyTorch3D, and uses datasets that each have their own respective licenses that must also be followed." — [MDM](https://github.com/GuyTevet/motion-diffusion-model).
- MotionGPT (OpenMotionLab): MIT, same "datasets … have their own respective licenses" note — [MotionGPT](https://github.com/OpenMotionLab/MotionGPT).
- MoMask: MIT (Copyright 2023 Chuan Guo), same SMPL/datasets note — [momask-codes](https://github.com/EricGuo5513/momask-codes).
- T2M-GPT: Apache 2.0 — [T2M-GPT](https://github.com/Mael-zys/T2M-GPT). Trained on HumanML3D/KIT-ML (non-commercial data).
- TMR (text-motion retrieval): MIT — [TMR](https://github.com/Mathux/TMR).
- All four above train on HumanML3D (AMASS) and output SMPL joints, so the weights and generated motion fall under the non-commercial data terms; only the code is free.

### Inferences
- Safe production stack: CC0 Quaternius (Standard) + Mixamo clips baked into the app (never offered as raw downloads; never used to train a model) + selected CMU clips (cleaned, retargeted, with acknowledgement) + procedural layers. Keep a per-clip provenance file (source, licence, URL, date) like the repo's other licence checks.
- Do not ship MDM/MoMask/MotionGPT/T2M-GPT weights or their generated clips. A commercial-safe generator would need retraining on CC0/CMU/Mixamo-free data (Mixamo explicitly excluded for ML), which is a research project, not a quick win.
- Fingers: Quaternius UAL and CMU have weak or no finger detail; teaching hand shapes (counting, pointing, "OK", open palm) should be authored as VRM finger poses (VRM humanoid has full finger bones) and blended procedurally.

### Gaps
- Exact Quaternius UAL Pro vs Standard clip lists and whether UAL 2 has a Pro tier with different terms (site blocked; summaries disagree: one says no Pro for UAL 2, one lists UAL 1 Pro at $9.99). Allow `quaternius.com` and read its licence page.
- CMU licence text could not be fetched directly; some copies say "free for use in research projects" — conflict noted by search summary.
- Rokoko current licence text not found.
- No verified CC0 "OpenMoCap" or other large CC0 mocap dataset found.

## Co-speech gestures (commercial models or rule-based) and fingers

### Takeaway
BEAT/BEAT2 data and EMAGE weights are tagged Apache-2.0 on Hugging Face, which on paper permits commercial use, but EMAGE outputs SMPL-X (non-commercial body model) and the original BEAT release was, to my recollection, CC BY-NC — this conflict must be resolved before use. TalkSHOW is MPI-licensed (commercial by contact), Trimodal (ai4r) uses a dual open/commercial licence, Gesticulator is GPL-3.0 and audio2photoreal is CC BY-NC. A rule-based BEAT-style gesture planner on top of CC0 clips is the only fully clean path today.

### Cited Findings
- BEAT2 dataset card (fetched): YAML header `license: apache-2.0`; HF API tags "license:apache-2.0" — [HF haiyangliu0/BEAT2](https://huggingface.co/datasets/haiyangliu0/BEAT2). BEAT (v1, BVH + ARKit) also tagged apache-2.0 — [HF haiyangliu0/BEAT](https://huggingface.co/datasets/haiyangliu0/BEAT). BEAT project page footer: "Licensed under the Apache-2.0 license." — [BEAT project page](https://pantomatrix.github.io/BEAT/) (this may refer to the website template, ambiguous).
- BEAT2 is "76h co-speech 3D body, hand & face dataset (30 speakers, SMPL-X + FLAME)"; BEAT is the same 76 h as BVH + ARKit — [PantoMatrix README](https://github.com/PantoMatrix/PantoMatrix).
- EMAGE weights: HF model tagged `license:apache-2.0` — [HF haiyangliu0/emage_audio](https://huggingface.co/haiyangliu0/emage_audio). PantoMatrix README lists DisCo, CaMN, EMAGE weights; outputs "in SMPL-X (body + hands) and FLAME (face) parameters"; "For custom speaker/character style capture or commercial collaboration: [email]" — [PantoMatrix](https://github.com/PantoMatrix/PantoMatrix). No LICENSE file was found at the repo root (404 on LICENSE/LICENSE.md).
- TalkSHOW README: "For commercial licensing, please contact ps-licensing@tue.mpg.de" (no LICENSE file at root) — [TalkSHOW](https://github.com/yhw-yhw/TalkSHOW). Uses SMPL-X.
- Gesture-Generation-from-Trimodal-Context (ai4r, TED dataset): "AIR License and Service Agreement … two policies, 'Open Source License' and 'Commercial License'" — [ai4r LICENSE.md](https://github.com/ai4r/Gesture-Generation-from-Trimodal-Context).
- Gesticulator: GNU GPL v3 — [gesticulator LICENSE](https://github.com/Svito-zar/gesticulator).
- audio2photoreal (Meta): "Attribution-NonCommercial 4.0 International" — [audio2photoreal LICENSE](https://github.com/facebookresearch/audio2photoreal).

### Inferences
- Treat BEAT/BEAT2/EMAGE as **"licence conflict, do not ship"** until the authors confirm in writing: the BEAT data were recorded with paid actors, the README invites "commercial collaboration" by email, and EMAGE's SMPL-X/FLAME output and evaluation tools sit on non-commercial body models. If confirmed Apache for data *and* motion is retargeted from the BVH (BEAT v1, no SMPL-X), it would be the best co-speech source.
- Rule-based plan (fully clean, runs in browser, no model):
  1. Text → gesture tags from the lesson script and TTS word timings (the site already has word tracking): numbers "first/second/three" → finger counting; "this/here/look" → deictic point at board target via IK; contrast words ("but", "however", "lekin") → hand flip; lists → open palm per item; emphasis/stressed syllables → beat gestures (small downward hand stroke aligned ~ on the stressed word); questions → open palms + head tilt; "big/small/grows" → metaphoric size gestures.
  2. Each gesture = preparation → stroke (aligned to the word) → hold → retraction to rest, with blending; never two strokes within ~300 ms (my design choice, not sourced).
  3. Finger poses authored once on VRM finger bones (point, count 1–5, OK, pinch, open palm, relaxed curl) and slerped.
  4. Hindi/Hinglish keyword lists sit beside English ones (the voice system already has Hinglish matchers).
- Real-time co-speech ML in the browser is not needed for quality at this stage; the rule planner is deterministic and testable (like Scene Voice's "answers from recorded frames").

### Gaps
- Original BEAT licence on its first GitHub release could not be checked (PantoMatrix GitHub API blocked; raw LICENSE missing). This is the key unanswered question.
- No commercially licensed, pretrained co-speech gesture model with clean training data was found.

## Real-time IK, foot locking, walking and navigation in the browser

### Takeaway
Everything needed is MIT/Apache: three.js (includes CCDIKSolver), THREE.IK (FABRIK), Kalidokit (pose → VRM rig), three-vrm and MediaPipe. Use two-bone analytic IK for arms/legs, CCD for spine/neck chains, and VRM's own LookAt for eyes.

### Cited Findings
- three.js: "The MIT License, Copyright © 2010-2026 three.js authors" — [three.js LICENSE](https://github.com/mrdoob/three.js/blob/dev/LICENSE) (CCDIKSolver ships in `examples/jsm/animation/CCDIKSolver.js`, same licence).
- THREE.IK (FABRIK solver for three.js): "The MIT License, Copyright © 2018 Jordan Santell" — [THREE.IK](https://github.com/jsantell/THREE.IK); npm `three-ik` "license":"MIT" — [npm](https://registry.npmjs.org/three-ik/latest).
- Kalidokit (MediaPipe/TF.js landmarks → VRM/Live2D rig): npm "license":"MIT", v1.1.5 — [npm kalidokit](https://registry.npmjs.org/kalidokit/latest); [GitHub](https://github.com/yeemachine/kalidokit).
- three-vrm: "Copyright (c) 2019-2026 pixiv Inc. MIT License" — [three-vrm LICENSE](https://github.com/pixiv/three-vrm).
- MediaPipe: Apache License 2.0 — [MediaPipe LICENSE](https://github.com/google-ai-edge/mediapipe).

### Inferences
- Layered animation stack per frame: (1) base clip (idle/walk/sit, CC0) → (2) additive layers (breathing, weight shift, gesture strokes) → (3) IK pass: hand to board point/pointer target (two-bone, elbow pole hint down/out), feet locked to floor during contact phases (detect contact from foot height/velocity in the clip, pin the foot, solve leg IK, release with a short blend), (4) look-at: head 30–40%, neck, chest small share, eyes via VRM LookAt, with saccades; (5) springbones (hair/cloth) last.
- Writing on board: path from stroke data (the site already has handwriting/board stroke code) → hand IK target traces the stroke at the TTS pace; chest turns toward board, head alternates board/student.
- Walking: use in-place clips plus root motion extracted from the hip track, or root-motion clips with speed matching (stride length × cadence) to avoid foot sliding; for a classroom, a few waypoints (board left, board centre, desk) with straight-line paths and turn-in-place is enough — no navmesh needed (single agent, "crowd-free").
- Joint limits: clamp IK results to per-bone ranges to prevent unnatural elbows/wrists (VRM has no built-in limits; author a table).

### Gaps
- No benchmark found for IK cost per frame on low-end Android; needs measuring in the target app.

## Interaction: listening, turn-taking, attention, latency

### Takeaway
Listener behaviour (nods, "hmm", gaze) must be timed to the speaker's prosody and pauses; badly timed nods hurt more than none. MediaPipe (Apache-2.0) in the browser can give face/gaze direction for attention-following with the student's opt-in camera; the cursor is a zero-privacy fallback.

### Cited Findings
- Backchannel timing is crucial; a mistimed listener nod can disrupt the speaker (citing Gratch et al. 2006; Poppe et al. 2011) — [ICMI 2013 (Inden et al.)](https://projet.liris.cnrs.fr/imagine/pub/proceedings/ICMI-2013/icmi/p181.pdf) **(via search summary)**.
- Listeners usually nod at or just after a speaker cue — [UTEP Novick](https://www.cs.utep.edu/nigel/feedback/pdf/P15novick.pdf) **(via search summary)**.
- Sequential probabilistic models predict backchannel opportunities from speaker prosody, pauses, gaze and words — [DTIC report](https://apps.dtic.mil/sti/trecms/pdf/AD1157722.pdf) **(via search summary)**.
- Turn-taking is more evident with eye contact — [Interspeech 2011, KTH](https://www.speech.kth.se/~jocke/publications/2011/interspeech2011_predicting.pdf) **(via search summary)**.
- Backchannel behaviour varies a lot between individuals — [Language and Cognition 2024](https://www.cambridge.org/core/journals/language-and-cognition/article/backchannel-behavior-is-idiosyncratic/F75D0AEEAF258399166A58E3DDCC7D7E).
- 2025 real-time model predicting timing and type of listener nods — [arXiv 2507.23298](https://web3.arxiv.org/pdf/2507.23298) (licence of any code not checked).

### Inferences
- States: Idle → Listening (student speaking: lean in slightly, gaze on student, nods on pitch-fall + pause ≥ ~200–400 ms, occasional "hmm"/"achha" only if voice is on) → Thinking (server/model latency: gaze up-left/away, hand to chin, short "let me see") → Speaking (gestures per rule planner) → Yielding the turn (end of question: eyebrow raise, open palm toward student, gaze returns, hold still). Thresholds are design guesses to tune; the 200 ms figure was **not** found in sources.
- Latency budget (design proposal, not sourced): show a visible reaction within ~200 ms of the student finishing (nod or think pose) even if the answer takes seconds; the "thinking" animation hides model latency.
- Attention: cursor/touch point → head/eyes follow with lag and smoothing; optional webcam (MediaPipe Face Landmarker, on device, no frames sent) for mutual gaze. Camera must be opt-in, off for minors by default unless parental consent covers it (see next section).

### Gaps
- Exact numeric norms (gap durations, nod rate per minute) were not extracted from full texts; read Inden 2013 and the 2025 arXiv paper.

## Consent and safety for building avatars from photos (India)

### Takeaway
Follow the HeyGen/Synthesia pattern: the person in the photo records a live consent statement on camera, the face must match the photo, consent must be informed and revocable with deletion. In India, the DPDP Rules 2025 (notified Nov 2025) require verifiable parental consent for under-18s (Rule 10), commencing 18 months after publication (~May 2027); the IT Amendment Rules 2026 (notified 10 Feb 2026, in force ~20 Feb 2026) require prominent labels on realistic synthetic audio/video. C2PA tooling (c2pa-rs, c2pa-js) is MIT for images/video; glTF/VRM coverage was not confirmed.

### Cited Findings
- HeyGen: the avatar subject records a short consent statement on camera via HeyGen's hosted consent page; uploading a pre-recorded consent video is limited to whitelisted enterprise accounts — [HeyGen developer docs: avatar consent](https://developers.heygen.com/docs/avatar-consent). Users must hold rights and explicit consent of anyone whose likeness is used, and honour removal requests — [HeyGen ethics](https://www.heygen.com/ethics) **(via search summary)**.
- Synthesia photo avatars: submission is rejected unless the person in the consent video matches the uploaded photo and the consent is clear and informed — [Synthesia help: photo avatars moderation](https://help.synthesia.io/en/articles/13846500-photo-avatars-content-moderation); no avatar without informed consent incl. a biometric consent process; owners can request deletion any time — [Synthesia avatar policy](https://help.synthesia.io/en/articles/15453102-avatar-policy-foundation) **(via search summary)**.
- Liveness: Silent-Face-Anti-Spoofing (minivision) LICENSE is Apache License 2.0 (fetched) — [GitHub](https://github.com/minivision-ai/Silent-Face-Anti-Spoofing). Weights' licence and accuracy not separately checked. Most "open" liveness SDKs (Faceplugin, KBY-AI/MiniAI) need a paid licence key — [KBY-AI Docker](https://hub.docker.com/r/kbyai/face-liveness-detection) **(via search summary)**.
- DPDP Rules 2025: notified 13 November 2025 with phased rollout — [Tribune](https://www.tribuneindia.com/news/business/govt-notifies-digital-personal-data-protection-rules-rollout-in-phases-specified-obligations-for-data-fiduciaries). SCC Online (fetched): "Rules 3, 5 to 16, 22 and 23 come into force eighteen months after publication"; "Rule 10 provides the conditions for obtaining verifiable consent before processing a child's personal data. A data fiduciary must collect verifiable consent from a parent or guardian…"; Rule 11 similar for persons with disabilities — [SCC Online, Dec 2025](https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/). Parent's adulthood checked via existing records or authorised digital tokens incl. DigiLocker; educational institutions partly exempt but not for tracking/behavioural monitoring/targeted ads at children — [AZB Partners](https://www.azbpartners.com/bank/update-indias-digital-personal-data-protection-framework-comes-into-effect/) **(via search summary)**.
- IT (Intermediary Guidelines and Digital Media Ethics Code) Amendment Rules, 2026: notified 10 Feb 2026, in force 20 Feb 2026; "synthetically generated information" = audio/visual/audio-visual content artificially or algorithmically created or altered that appears real; text-only outside; prominent labels; tools that generate SGI must take user declarations and technical checks; good-faith educational/accessibility uses partly excluded if not creating false records — [Business Today](https://www.businesstoday.in/technology/story/govt-tightens-rules-on-ai-generated-content-mandates-labels-and-faster-takedowns-515505-2026-02-10); [SCC Online](https://www.scconline.com/blog/post/2026/02/12/it-rules-2026-ai-and-intermediary-compliance/); [Nishith Desai](https://www.nishithdesai.com/research-and-articles/hotline/technology-law-analysis/deepfakes-disclosure-and-due-diligence-unpacking-indias-sgi-amendments-15532) **(via search summaries; read the Gazette text)**.
- C2PA: spec 2.2 (May 2025) and 2.3 (2026-01-05) published — [C2PA 2.3 spec](https://spec.c2pa.org/specifications/specifications/2.3/specs/_attachments/C2PA_Specification.pdf). c2pa-rs LICENSE-MIT "© Copyright 2020 Adobe" (dual MIT/Apache) — [c2pa-rs](https://github.com/contentauth/c2pa-rs); c2pa-js MIT "© Copyright 2025 Adobe" — [c2pa-js](https://github.com/contentauth/c2pa-js).

### Inferences
- Proposed Pratibimb consent flow:
  1. Only an adult (18+) may create an avatar of themselves; no avatars of other people, no avatars of minors (avoids Rule 10 entirely for creation; also safest for the brand).
  2. Plain-language notice in English/Hindi: what is captured (photos, derived face shape/texture), purpose (teacher avatar on NexoraGuru), where stored, retention, who sees it, how to withdraw (DPDP notice/consent duties).
  3. Live consent capture: the person reads a randomised sentence on camera ("Main, <name>, NexoraGuru ko apna avatar banane ki anumati deti/deta hoon — code 4821"); passive liveness (Silent-Face, Apache-2.0, run server-side or on-device) + a simple active challenge (turn head, blink — MediaPipe landmarks) + face match between consent video and source photos.
  4. Staff review before the avatar can be published; signed record (hash of photos, consent video, timestamp) kept; consent video kept only as long as needed as evidence.
  5. One-tap withdrawal → delete photos, textures, model; existing videos removed or re-rendered.
  6. Every rendered video/still of a real-person-likeness avatar carries a visible "AI-generated" label (IT Rules 2026) and C2PA Content Credentials for MP4/PNG exports; for live in-browser 3D, a persistent on-screen label.
  7. Student-side features (webcam attention) for under-18 users: off by default, on-device only; once Rule 10 is in force (~May 2027), require verifiable parental consent for any processing of a child's camera data.
- The owner's own face (founder avatar) still needs a recorded consent record — the same flow, for consistency and evidence.

### Gaps
- Official Gazette texts of the DPDP Rules and IT Amendment Rules 2026 were not fetched; exact label wording/size obligations (an earlier draft proposed 10% coverage; whether kept in the final is unverified).
- Whether C2PA 2.2/2.3 or c2pa-rs supports embedding in glTF/GLB/VRM — not confirmed.
- Accuracy/licence of Silent-Face pretrained weights and their suitability for Indian faces not checked.
