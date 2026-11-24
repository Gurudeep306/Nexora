# E. Free, commercially usable body animation for VRM avatars in three.js

Scope: idle (breathing, weight shift), listening, thinking, talking hand gestures, and set gestures (wave, namaste, point, thumbs up, nod, shrug) for a VRM teacher on a public commercial website (nexoraguru.in). Researched 2026-11-24.

Note on method: this session's network blocked direct fetches of helpx.adobe.com, vroid.com and unpkg.com. Those terms were read through search results that quote the pages, through GitHub/Hugging Face pages, or through forum copies. Each such case is marked. Before shipping any third-party motion file, someone should open the licence page in a browser and save a dated copy.

Repo context (checked locally): the site already ships `@met4citizen/talkinghead` 1.8.2 (MIT licence, file `client/node_modules/@met4citizen/talkinghead/LICENSE`, "Copyright (c) 2023-2024 Mika Suominen"). Its `gestureTemplates` include `handup`, `index`, `ok`, `thumbup`, `thumbdown`, `side`, `shrug` and `namaste`. `client/src/voice/teacher/TeacherLayer.tsx` already maps wave→`handup`, namaste→`namaste`, thumbs→`thumbup`, point→`index`, and `expressions.ts` picks thumbup/namaste/shrug/index from the spoken text.

## 1. VRM Animation (.vrma) and official pixiv/VRoid motions

### Takeaway
The official VRoid Project "VRM Animation 7-set (.vrma)" on BOOTH is free, may be modified and used commercially by individuals and companies, with a required credit line. It is a small set (greeting, peace sign, spin, model pose, squat, and similar), so it helps with a greeting and some poses, not with idle, listening or talking gestures. pixiv's `@pixiv/three-vrm-animation` package plays .vrma clips on VRM models in three.js.

### Cited Findings
- VRoid Project distributes 7 free VRMA animations on its official BOOTH shop; the announcement names motions such as show full body, greeting, peace sign, shoot, spin, model pose and squat, and asks users to read the terms on the BOOTH page — [VRoid News](https://vroid.com/en/news/6HozzBIV0KkcKf9dc1fZGW) (read through a search summary; direct fetch blocked).
- The BOOTH listing "VRMアニメーション7種セット（.vrma）" by VRoid Project: the data may be modified freely and used for any purpose not on the prohibited list; commercial use by individuals or companies is allowed with the credit "Character animation credits to pixiv Inc.'s VRoid Project"; sexual or extremely violent use is prohibited; terms may change without notice; Japanese law applies — [BOOTH item 5512385](https://booth.pm/ja/items/5512385), [vroid.booth.pm mirror](https://vroid.booth.pm/items/5512385) (read through a search summary).
- Third-party .vrma packs on BOOTH each set their own terms; one example allows edits, requires credit for redistributing edited versions, and bans use for commissions — [BOOTH item 5520942](https://booth.pm/en/items/5520942).
- `@pixiv/three-vrm-animation` is "The implementation of VRM Animation" in the three-vrm monorepo, with examples and API reference — [GitHub three-vrm-animation](https://github.com/pixiv/three-vrm/tree/dev/packages/three-vrm-animation).
- Usage, as documented in the package README (not re-fetched this session; unpkg blocked): register the plugin on GLTFLoader, then build a clip for a given VRM:
  ```js
  loader.register((parser) => new VRMLoaderPlugin(parser));
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  const gltf = await loader.loadAsync('greeting.vrma');
  const vrmAnimation = gltf.userData.vrmAnimations[0];
  const clip = createVRMAnimationClip(vrmAnimation, vrm);
  mixer.clipAction(clip).play();   // and vrm.update(dt) every frame
  ```
  — [three-vrm repo](https://github.com/pixiv/three-vrm) (code pattern from the package docs; verify against the README before copying).

### Inferences
- .vrma is glTF with the `VRMC_vrm_animation` extension, so a clip made once (for example retargeted from a CC0 FBX in Blender with the VRM add-on, or exported from VRoid/UniVRM tools) works on every VRM teacher without per-model retargeting. Converting all our motion into .vrma is the cleanest long-term format.
- The VRoid set is safe for the site if the credit line appears (for example on an "Credits" page of the Teacher Maker).

### Gaps
- I could not open the BOOTH page in full or the English terms text directly; the exact list of prohibited actions and whether raw redistribution of the .vrma file itself (it is downloaded by the browser) is covered needs a manual read.
- I did not find any larger official pixiv motion pack (idle/talk loops) beyond the 7-set.

## 2. Mixamo (Adobe) terms and retargeting Mixamo to VRM

### Takeaway
Mixamo animations are royalty-free for commercial projects, but the FAQ forbids distributing the raw character/animation files, and a web app necessarily sends the files to every visitor's browser. That is a grey zone at best; the strict reading excludes it. Mixamo content also may not be used to train ML models. Recommendation: do not ship Mixamo FBX/GLB files on the site; use CC0 or the VRoid set instead. The retargeting code in three-vrm's example is still the reference technique for any FBX source.

### Cited Findings
- Adobe's Mixamo FAQ: characters and animations can be used royalty free for personal, commercial and non-profit projects, including video games — [Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) (read through a search summary; direct fetch blocked).
- The FAQ examples (as quoted by the community thread) say the main thing you cannot do is distribute the raw character and animation files, and list asset-store packages and "DLC or Addon Content for Games" where raw files are distributed as not allowed — [Adobe Community: Mixamo FAQ licensing](https://community.adobe.com/t5/mixamo-discussions/mixamo-faq-licensing-royalties-ownership-eula-and-tos/td-p/13234775).
- An itch.io developer reads it as: unless stated otherwise, there is no permission to distribute downloaded FBX files — [itch.io post](https://itch.io/post/7765268) (informal opinion).
- TalkingHead's README states Mixamo animations "can be used royalty free", but raw files can't be distributed outside the project team or used to train ML models — [TalkingHead README](https://raw.githubusercontent.com/met4citizen/TalkingHead/main/README.md).
- three-vrm's `humanoidAnimation` example `loadMixamoAnimation(url, vrm)`: loads FBX with FBXLoader, takes the `mixamo.com` clip, scales hips position by the VRM/Mixamo hips height ratio, maps Mixamo bone names to VRM humanoid bones (`mixamoVRMRigMap`, e.g. `mixamorigHips`→`hips`), converts each quaternion keyframe from Mixamo rest space into the VRM normalized bone space using the parent's rest world rotation and the bone's inverse rest rotation, flips axes for VRM 0.x (`metaVersion === '0'`), and returns a new `AnimationClip` — [three-vrm example source](https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm/examples/humanoidAnimation/loadMixamoAnimation.js); rig map discussed in [three.js forum](https://discourse.threejs.org/t/fixing-skeletonutils-retarget-and-retargetclip-functions/65149/7).
- `vrm-mixamo-retarget` (npm) packages the same map with custom bone mappings — [README](https://unpkg.com/vrm-mixamo-retarget@1.0.3/README.md).

### Inferences
- A browser-delivered file is obtainable by anyone with DevTools, which is close to "distributing raw files". Baking clips into a different format (e.g. .vrma or compressed JSON tracks) does not obviously change the legal position. Treat Mixamo as "use only with Adobe's written OK".
- The same retarget function works for any Mixamo-named rig, including Quaternius' UAL exports if they use a similar skeleton (rename map needed).

### Gaps
- Could not read the current full Adobe FAQ text or Adobe General Terms directly (host blocked); whether a web app counts as "embedded in a project" was not answered officially in sources found.

## 3. CC0 / permissive motion libraries and mocap datasets

### Takeaway
Safe for commercial web use: Quaternius Universal Animation Library 1 and 2 (CC0), VRoid 7-set (credit), CMU mocap ("free for all uses", may go into commercial products, not resold as data), 100STYLE (CC BY 4.0, locomotion styles), AIST++ (CC BY 4.0, dance), Rokoko free library (commercial use stated; check redistribution). Exclude: Bandai Namco Research Motiondataset (CC BY-NC), Motion-X (CC BY-NC-SA), AMASS/HumanML3D (non-commercial), ActorCore free motions in interactive apps (needs a mass distribution licence), Truebones (terms not found, free offers appear ended), Mixamo (see above).

### Cited Findings
- Quaternius Universal Animation Library: CC0; OBJ/FBX/glTF plus .blend; about 120 animations (locomotion, sit, etc.) — [quaternius.com](https://quaternius.com/packs/universalanimationlibrary.html), [itch.io](https://quaternius.itch.io/universal-animation-library), [OpenGameArt](https://opengameart.org/content/universal-animation-library).
- Universal Animation Library 2 (January 2026): 130+ clips, CC0; standard version free, source version paid — [quaternius.com UAL2](https://quaternius.com/packs/universalanimationlibrary2.html), [itch.io UAL2](https://quaternius.itch.io/universal-animation-library-2), [Digital Production, 2026-02-10](https://digitalproduction.com/2026/02/10/130-animations-one-rig-zero-drama/).
- CMU Graphics Lab Motion Capture Database notice: free for all uses; free for research; may be included in commercially sold products but not resold directly, even in converted form — [Papers With Code copy](https://paperswithcode.com/dataset/cmu-motion-capture), [CMU resources page](https://mocap.cs.cmu.edu/resources.php). Converted mirrors carry their own licences, e.g. 4TU FBX conversion lists CC BY-NC 4.0 — [4TU.ResearchData](https://data.4tu.nl/datasets/0448aab2-3332-449f-a8e2-d208cb58c7df). So use the original BVH/ASF and convert it ourselves.
- Bandai Namco Research Motiondataset-1 and -2: CC BY-NC 4.0 in the current README (earlier reported as CC BY-NC-ND 4.0); Blender scripts MIT — [GitHub README](https://github.com/BandaiNamcoResearchInc/Bandai-Namco-Research-Motiondataset/blob/master/README.md), [Automaton 2022](https://automaton-media.com/en/news/20220430-12213/). Not commercial.
- 100STYLE: Creative Commons Attribution 4.0; commercial users asked to credit the dataset — [100STYLE project page](https://ianxmason.github.io/100style).
- AIST++: CC BY 4.0 (per Motion-X licence document and paper; AIST++'s own page not fetched) — [Motion-X licence PDF](https://motion-x-dataset.github.io/static/license/Motion-X%20License.pdf), [Motion-X paper](https://arxiv.org/pdf/2307.00818).
- Motion-X annotations: CC BY-NC-SA 4.0, access form for non-commercial purposes — [Motion-X GitHub](https://github.com/IDEA-Research/Motion-X), [licence PDF](https://motion-x-dataset.github.io/static/license/Motion-X%20License.pdf).
- AMASS: non-commercial scientific research, education or artistic projects only; excludes commercial products/services and training networks for commercial use — [AMASS licence](https://amass.is.tue.mpg.de/license.html). HumanML3D is built from AMASS + HumanAct12 — [Motion-X paper](https://arxiv.org/pdf/2307.00818).
- Rokoko: free mocap assets page (263 assets) says they may be used for commercial use in animation, VFX and games — [Rokoko free mocap assets](https://www.rokoko.com/mocap/free-mocap-assets); 150 free moves licensed for commercial projects (2020) — [CG Channel](https://www.cgchannel.com/2020/03/get-150-free-mocap-moves-from-rokokos-motion-library).
- ActorCore (Reallusion): free assets licensed for commercial use, but games/interactive applications need a separate mass distribution licence from Reallusion — [CG Channel 2022](https://www.cgchannel.com/?p=121885).
- Truebones: free Gumroad offerings exist/existed but no licence terms found — [Truebones Gumroad](https://truebones.gumroad.com/p/free-4-mocap-files-in-fbx-bvh-and-i-clone-format).

### Inferences
- Quaternius UAL is mostly game locomotion/actions; useful for weight-shift idles, sit/stand, walk, maybe wave. Talking/teaching gestures are thin, so procedural and hand-authored poses (section 5–6) will carry most of the teacher's body language.
- CMU contains conversational/gesture takes (subjects with "story", "gesture" categories are known from the database index, not verified this session); worth mining for idle and talk loops since commercial inclusion is allowed.
- Kenney: I found no Kenney humanoid motion pack in this search; Kenney assets are generally CC0 but no animation source was confirmed.

### Gaps
- Rokoko's terms page on redistributing raw files inside an app was not read.
- AIST++ own licence page and Kenney animation availability not confirmed directly.

## 4. AI motion generation and co-speech gesture models

### Takeaway
Most text-to-motion models (MoMask, T2M-GPT, MotionGPT) have permissive code but are trained on HumanML3D/AMASS and use SMPL, which are non-commercial, so their weights and outputs are not safe. Two commercially licensed options exist: Tencent HY-Motion 1.0 (community licence, commercial OK except >100M MAU, but excludes EU/UK/South Korea) and NVIDIA Kimodo SOMA/G1 checkpoints (NVIDIA Open Model License, "ready for commercial use"; the SMPL-X checkpoint is research-only). Co-speech gesture: BEAT2 is tagged Apache-2.0 on Hugging Face, but it is SMPL-X based, so the body-model licence is a blocker; EMAGE etc. are not a clean commercial path. Best use: generate a library of clips offline (server or Kaggle), retarget once to VRM, save as .vrma; do not run them live in the browser.

### Cited Findings
- HY-Motion 1.0: "TENCENT HY-MOTION 1.0 COMMUNITY LICENSE"; companies and individuals may use, copy, modify and redistribute free and commercially, except platforms over 100 million MAU — [CGWORLD](https://cgworld.jp/flashnews/01-202601-HY-Motion.html); licence territory excludes the EU, UK and South Korea — [GitHub issue #49](https://github.com/Tencent-Hunyuan/HY-Motion-1.0/issues/49); paper — [arXiv 2512.23464](https://arxiv.org/abs/2512.23464v1). India is not in the excluded list per these sources.
- Kimodo (NVIDIA): code Apache-2.0 — [Kimodo project info](https://research.nvidia.com/labs/sil/projects/kimodo/docs/project_info.html); Kimodo-G1-RP and Kimodo-SOMA-SEED v1.1 under NVIDIA Open Model License and described as ready for commercial use — [HF G1-RP](https://huggingface.co/nvidia/Kimodo-G1-RP-v1), [HF SOMA-SEED v1.1](https://huggingface.co/nvidia/Kimodo-SOMA-SEED-v1.1); Kimodo-SMPLX-RP under NVIDIA Internal Scientific Research and Development Model License — [HF SMPLX-RP](https://huggingface.co/nvidia/Kimodo-SMPLX-RP-v1). Paper [arXiv 2603.15546](https://arxiv.org/html/2603.15546v1).
- MoMask code is MIT, but the README warns that SMPL and the datasets have their own licences — [momask-codes](https://github.com/EricGuo5513/momask-codes).
- AMASS licence forbids training networks for commercial use — [AMASS licence](https://amass.is.tue.mpg.de/license.html); a HumanML3D-derived model is released CC BY-NC 4.0 "to comply with the most restrictive terms" — [HF motion-clip](https://huggingface.co/khania/motion-clip/blob/main/README.md).
- BEAT2: 60 hours of SMPL-X mocap with audio — [MPI project page](https://is.mpg.de/ps/projects/beat2-dataset-for-holistic-co-speech-gesture-generation); HF dataset card shows licence apache-2.0 with empty README — [HF H-Liu1997/BEAT2](https://huggingface.co/datasets/H-Liu1997/BEAT2). EMAGE paper — [arXiv 2401.00374](https://arxiv.org/abs/2401.00374v5).

### Inferences
- SMPL/SMPL-X body models (MPI) are themselves under non-commercial licences by default (well known, but not fetched this session), so SMPL-X-based outputs (BEAT2, EMAGE, Kimodo-SMPLX) are risky even when the data/code tag says Apache.
- Kimodo SOMA/G1 skeletons are not VRM; outputs need retargeting (Blender or a one-off script) before use. HY-Motion likewise outputs its own skeleton.
- What HY-Motion was trained on, and whether outputs carry dataset obligations, was not checked.

### Gaps
- T2M-GPT and MotionGPT repo licences not checked (time budget); they share the HumanML3D/SMPL problem anyway.
- DiffSHEG and Audio2Gestures licences not checked.
- Full text of NVIDIA Open Model License and HY-Motion licence (output ownership, attribution) not read.

## 5. Procedural techniques for natural idle, listening, thinking and talking

### Takeaway
The proven open approach (TalkingHead, MIT, already in our client) layers small procedural loops — breathing, head drift, eye saccades, blinks — chosen by state (idle/talking/listening) and mood, with eye-contact ratios per state, and blends hand-authored bone-rotation "gesture templates" on top. For VRM, do the same with three.js: play base clips through `AnimationMixer`, add procedural offsets on `vrm.humanoid` normalized bones after `mixer.update`, and use `vrm.lookAt` for gaze.

### Cited Findings
- TalkingHead: `animMoods` holds loops (breathing, head, eyes, blink, mouth, misc) selected by state (`idle`, `talking`), body form and view; moods `neutral, happy, angry, sad, fear, disgust, love, sleep` via `setMood()` — [TalkingHead README](https://raw.githubusercontent.com/met4citizen/TalkingHead/main/README.md).
- Eye contact and head movement are tunable per state: `avatarIdleEyeContact` 0.2, `avatarIdleHeadMove` 0.5, `avatarSpeakingEyeContact` 0.5, `avatarSpeakingHeadMove` 0.5, `avatarListeningEyeContact` 0.5; `makeEyeContact(t)`, `lookAt(x,y,t)`, `lookAtCamera(t)` — same source.
- Gestures: `playGesture(name, dur=3, mirror=false, ms=1000)` and `stopGesture(ms)`; custom gestures in `gestureTemplates`; poses `playPose()`; Mixamo clips `playAnimation()` with `scale` 0.01 — same source.
- `startListening(analyzer, opt, onchange)` emits `start`, `stop`, `maxsilence`, `maxactive` events, usable to drive listening body language — same source.
- TalkingHead gesture templates store per-bone Euler targets where some axes are `[min, max, ...]` ranges, so each play is slightly different (e.g. `thumbup` shoulder `x:[1.5,2,1,2]`) — local file `client/node_modules/@met4citizen/talkinghead/modules/talkinghead.mjs` (v1.8.2).
- three-vrm retarget writes into normalized humanoid bones (rest-pose-independent), which is what makes shared clips and procedural offsets work across VRMs — [loadMixamoAnimation.js](https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm/examples/humanoidAnimation/loadMixamoAnimation.js).

### Inferences (techniques, recommended recipe)
- **Base layer:** one slow idle clip (2–4 s weight shift from Quaternius/CMU, or authored) looped; crossfade between idle/listen/talk bases with `action.crossFadeTo(next, 0.4–0.8, true)`.
- **Additive layer:** `THREE.AnimationUtils.makeClipAdditive(clip)` and `action.blendMode = THREE.AdditiveAnimationBlendMode` let a nod, shrug or breathing clip play on top of any base without replacing it (three.js API; standard since r130).
- **Procedural noise:** after `mixer.update(dt)` add small rotations: spine/chest breathing as a sine at 0.2–0.3 Hz (12–18 breaths/min) of ~1–2°; head/neck drift from 2–3 summed sines of incommensurate periods (or simplex noise) at ±2–4°; hips weight shift every 4–10 s with an eased transition. Keep amplitudes lower in listening, higher and syncopated with speech energy while talking.
- **Talking gestures:** trigger beat gestures (small forearm/hand lift and drop) on stressed words or loudness peaks from the TTS word timings we already have; pick from 3–5 variants with random amplitudes (as TalkingHead's ranges do), and never repeat the same one twice in a row.
- **Listening:** more eye contact, slight head tilt (5–8° roll), occasional slow nod when the user pauses (`maxsilence` event), minimal hand motion.
- **Thinking:** gaze up-and-aside via `vrm.lookAt.lookAt(target)` to a point above/left, chin/hand-to-chin pose, slower breathing.
- **Pointing:** two-bone IK (upper arm, forearm) toward a world target, e.g. three.js `CCDIKSolver` (needs a SkinnedMesh with IK chain) or a hand-rolled analytic two-bone solve on normalized bones; add the index-extended finger pose; head/eyes look at the target first (~150 ms lead).
- **Respect `prefers-reduced-motion`:** cut amplitudes and disable gestures except one-shot ones.

### Gaps
- No source fetched on the exact noise frequencies TalkingHead uses; values above are design suggestions, not measured.
- TalkingHead itself targets Ready Player Me / Mixamo-named GLB rigs, not VRM; its templates need bone-name and rest-axis mapping to run on VRM normalized bones (inferred from its bone names like `RightForeArm`).

## 6. Hand poses for namaste and thumbs up on VRM finger bones

### Takeaway
Hand poses are just target rotations on the VRM humanoid finger bones (`leftThumbMetacarpal/Proximal/Distal`, `leftIndexProximal/Intermediate/Distal`, … for each finger and side, VRM 1.0 names). TalkingHead already ships MIT-licensed `namaste` and `thumbup` templates with per-finger values; these can be ported by mapping its Mixamo-style names to VRM names and converting for the normalized rest pose.

### Cited Findings
- TalkingHead v1.8.2 `namaste` template begins with `RightShoulder.rotation {x:1.758, y:0.099, z:1.604}`, `RightArm.rotation {x:0.862, y:-0.292, z:-0.932}`, `RightForeArm.rotation {x:0.083, y:0.066, z:-1.791}`, `RightHand.rotation {x:-0.52, y:-0.001, z:-0.176}`, followed by finger bones — local `client/node_modules/@met4citizen/talkinghead/modules/talkinghead.mjs` (MIT).
- `thumbup`/`thumbdown` templates set shoulder/arm with random ranges and differ mainly in forearm rotation (`thumbup` `LeftForeArm x:-0.415`, `thumbdown` `x:-2.015`), plus finger curls — same file.
- VRM humanoid names are what `mixamoVRMRigMap` maps into (`mixamorigLeftHandThumb1` → `leftThumbMetacarpal` in VRM 1.0, etc.) — [three-vrm example](https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm/examples/humanoidAnimation/loadMixamoAnimation.js) and [rig map discussion](https://discourse.threejs.org/t/fixing-skeletonutils-retarget-and-retargetclip-functions/65149/7).

### Inferences (how to pose on VRM)
- In VRM normalized space the rest pose is a T-pose with all bones aligned to world axes; finger curl is mainly rotation about the bone's local axis perpendicular to the palm (for left-hand fingers roughly +Z / −Z depending on side; mirror sign for right).
- **Thumbs up:** curl index–little Proximal/Intermediate/Distal ~70–90° each; thumb fully extended (Metacarpal rotated so the thumb points up, Proximal/Distal ~0°); forearm supinated so the thumb points to the sky; elbow ~90°.
- **Namaste:** both hands mirrored; upper arms in and slightly forward, elbows ~110–130°, forearms rotated so palms face each other in front of the sternum, wrists extended ~20–30°; fingers straight (all finger joints ~0–5°) and slightly together; thumbs lightly adducted. Check hand–hand penetration on each teacher's proportions; drive the final palm gap with a two-bone IK target at the chest centre rather than fixed angles so it fits every body.
- **Pointing:** index straight, middle–little curled 80–90°, thumb half curled over the middle finger.
- Build a small authoring page (sliders per finger) and store poses as JSON of quaternions per VRM bone; blend in/out over ~200–300 ms with slerp.

### Gaps
- Exact finger values of TalkingHead's templates (truncated in my read) and their axis conventions vs VRM were not mapped; needs a hands-on test on one VRM.
- No CC0 source of ready-made VRM hand poses was found.
