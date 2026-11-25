# Build the teacher from CC0 MakeHuman parts

The best free, commercially licensed Teacher Maker is one we put together ourselves. No ready-made product meets every requirement. The strongest legal base is **MakeHuman/MPFB2's CC0 assets**. They ship loadable **ARKit-52 face units and two viseme packs**, and the makers claim nothing over the output. **ffunch/vrm-avatar-maker** (MIT code, all assets CC0) already turns them into browser-built **VRM 1.0 avatars with visemes, emotions, spring hair and a MediaPipe photo-resemblance beta**. It is "a real person, not anime", so we have to add the soft-3D look as art work: stylised proportion targets, our own eyes and hair, and a soft toon shader on `WebGLRenderer`.

The other components:

- **Lip sync:** keep HeadTTS's exact phoneme timings for live Kokoro speech. Add the Apache-2.0 **wav2arkit_cpu** model on the free server for any other audio, such as pre-rendered or cloned voices. Use the 14 kB MIT HeadAudio as the instant fallback.
- **Voice:** there is no free model that gives excellent live Hindi on a CPU. Kokoro's Hindi voices are graded only "C". The best plan is a split: Kokoro for live replies, and lesson narration pre-rendered offline on a free GPU. Use **Indic Parler-TTS** (Apache-2.0) for Hindi narration and **Chatterbox Multilingual** (MIT, watermarked) for the founder's consented cloned voice.
- **Body:** procedural layers plus CC0 Quaternius clips, the credited VRoid 7-set and ports of TalkingHead's MIT gesture templates. Mixamo files should not ship.
- **Photo matching:** a home-built MediaPipe pipeline (Apache-2.0) that runs entirely on the device and keeps only the avatar settings.

VRoid parts are ruled out for the maker itself: pixiv's guidelines forbid apps that generate avatars from combined VRoid meshes. Several key licence pages could not be opened during research and must be read by hand before launch (listed at the end).

## Every part library except MakeHuman fails on licence, face shapes or look

The Teacher Maker needs parts that have three things together: a licence that allows a *generator* (not just one fixed character), face shapes for talking, and a look that can become soft-3D. Only one free source has all three in some form.

**MakeHuman/MPFB2** releases these as **CC0 1.0** ([mpfb2 LICENSE.md](https://raw.githubusercontent.com/makehumancommunity/mpfb2/master/LICENSE.md)): the base mesh, proxies, targets, modifiers, textures, clothes, rigs, poses and expressions. It also "makes no claim whatsoever" over exports. The code is GPLv3. That only matters if we ship it, and running it offline in Blender to make parts does not put the GPL on the website. MPFB2's Face panel loads three packs onto any base mesh: **22 Microsoft visemes, 15 Meta/Oculus visemes and 52 ARKit face units** ([faceops.md](https://raw.githubusercontent.com/makehumancommunity/mpfb2/master/docs/ui/operations/faceops.md)). Every head built on one shared base mesh inherits the same talking shapes, so we never generate blendshapes part by part. One caution: some MakeHuman *community* assets are CC-BY rather than CC0, so each asset needs its own licence check.

**ffunch/vrm-avatar-maker** proves the whole pipeline works ([repo](https://github.com/ffunch/vrm-avatar-maker)). It runs in the browser, its code is MIT, and its assets are CC0 ([LICENSE](https://raw.githubusercontent.com/ffunch/vrm-avatar-maker/main/LICENSE), [ASSETS.md](https://raw.githubusercontent.com/ffunch/vrm-avatar-maker/main/ASSETS.md)). It currently offers 22 hairstyles, 35 outfits, 15 hats, 10 glasses or masks, 5 beards and more. It exports VRM 1.0 with blink, the aa/ih/ou/ee/oh visemes, emotions, eye tracking and spring-bone hair. It keeps within a budget of 40k triangles, 16 materials and 2048 px textures, and it stores its recipe inside the VRM. Its geometry is MakeHuman-realistic by design, so the stylised look is our art work to add, not a setting to switch on.

The alternatives each fail on one point:

| Source | Licence | Talking face shapes | Verdict |
|---|---|---|---|
| MakeHuman / MPFB2 assets | CC0 (code GPL, not shipped) | ARKit-52 + Oculus-15 + MS-22 packs | **Base of choice** |
| ffunch/vrm-avatar-maker | MIT code, CC0 assets | VRM visemes, blink, emotions | **Fork or reuse pipeline** |
| M3-org CharacterStudio | MIT code; asset packs have **no licence file** ([LICENSE](https://raw.githubusercontent.com/M3-org/CharacterStudio/main/LICENSE), [loot-assets](https://raw.githubusercontent.com/M3-org/loot-assets/main/README.md)) | Not shown | Reuse code ideas only; fantasy/NFT parts excluded |
| VRoid Studio parts | pixiv-owned; generator apps **forbidden** ([guidelines, via search snippet](https://vroid.com/en/studio/guidelines)) | Yes | Excluded for the maker; a few fixed hand-made teachers look allowed |
| 100Avatars / Open Source Avatars | Mostly CC0; VIPE Heroes CC-BY ([registry](https://github.com/ToxSam/open-source-avatars)) | Unverified | Low-poly toy look; fallback presets only |
| Quaternius Universal Base Characters | CC0, ~13k triangles ([pack](https://quaternius.com/packs/universalbasecharacters.html)) | Not mentioned | Stylised mesh, but shapes would have to be added |
| Ready Player Me | Platform closed 31 Jan 2026 after the Netflix purchase ([TechCrunch](https://techcrunch.com/2025/12/19/netflix-acquires-gaming-avatar-maker-ready-player-me/?rand=8808), [Frame VR](https://learn.framevr.io/blog/rpm-closure)) | — | Gone |

For meshes that lack face shapes, **RigAnyFace** (NeurIPS 2025) generates FACS blendshape rigs automatically, even for meshes with disconnected parts ([arXiv 2511.18601](https://arxiv.org/abs/2511.18601v1)). Its code and weights licence was not checked, so treat it as unconfirmed. Sharing one MPFB base mesh avoids needing it at all. The VRM sample models (Seed-san and others) fall under VRM Public License 1.0. There, each file's meta fields decide commercial use and redistribution ([VRM PL 1.0](https://vrm.dev/en/licenses/1.0)), so read each file before using it.

## A softened toon shader on WebGL makes "animated film", not flat anime

The owner chose a soft-3D look, and MToon's defaults work against it. In both the spec and three-vrm, MToon defaults to **`shadingToonyFactor` 0.9 and `giEqualizationFactor` 0.9** ([VRM MToon 1.0 spec](https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_materials_mtoon-1.0/README.md), [three-vrm MToonMaterial.ts](https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm-materials-mtoon/src/MToonMaterial.ts)). Toony 0.9 squeezes the light-to-shadow edge into about ±0.1 of N·L, and GI equalisation 0.9 flattens ambient light. Together they give the hard cel look. A toony value of 0.0 is plain Lambert shading ([V-Sekai record](https://v-sekai.github.io/manuals/decisions/20240218-vrm-substance-editor.html)), so the soft-film zone sits between the two.

There is a second catch. **three-vrm's MToon shader comments out `envmap_fragment`**, so it ignores `scene.environment` and IBL entirely. It takes indirect light only from ambient, hemisphere and light-probe lights ([mtoon.frag](https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm-materials-mtoon/src/shaders/mtoon.frag)). The current teacher's look (`client/src/voice/teacher/look.ts`) depends on RoomEnvironment IBL, so it would not carry over.

That leaves two paths. **Path A: soft MToon.** The research notes propose these values; no source publishes them:

- toony about 0.35–0.5 on skin, 0.5–0.65 on clothes and 0.6–0.75 on hair
- GI equalisation 0.3–0.5
- a warm, saturated shade colour, never grey
- a faint rim
- thin outlines in screen coordinates, or none

Indirect light would come from a HemisphereLight or a LightProbe baked from RoomEnvironment. **Path B: "PBR toon".** Patch `MeshStandardMaterial` with a wrapped diffuse, `max((N·L + w)/(1 + w), 0)`, with w about 0.3–0.5 on skin. Wrapped diffuse is the classic cheap skin approximation that "spreads light past the terminator" ([Unity manual](https://docs.unity3d.com/Manual/SL-SurfaceShaderExamples-WrappedDiffuse.html), [GPU Gems ch. 3](https://developer.nvidia.com/gpugems/GPUGems/gpugems_ch03.html)). Add warm-tinted shadows and a soft rim, and keep GGX specular and IBL. Path B reads as animated film rather than anime, and it continues the PBR pipeline the site already tuned. Its catch is that a plain PBR swap loses MToon's lit-and-shade colour mixing unless we rebuild it ([babylon-mtoon-material](https://github.com/noppefoxwolf/babylon-mtoon-material)).

The recommendation is to **ship MToon-compatible materials inside every VRM, so exports work anywhere, and replace them at run time with our PBR-toon material**. Choose the final settings from side-by-side renders against the current `look.ts` baseline, the same way that file was tuned.

Three rendering details sell the look. The first is **eyes**: a parallax iris, an unlit highlight that moves with the half vector, and a matcap or clearcoat cornea ([Anime Shading Plus eye guide](https://erichu33.github.io/ASPDocs/en/articles/eyes-anime-like-setup-guide.html)). Parallax is preferred over refraction, which artists find hard to make look right ([UE forum](https://forums.unrealengine.com/t/eye-shader-iris-parallax-effect/2364)). The second is **hair**: alpha-tested cards (`look.ts` already uses a 0.45 cutoff) with an "angel ring" anisotropic band. The third is **face shadows**: Genshin-style SDF face shadows are the biggest single step up for stylised faces ([URPSimpleGenshinShaders](https://github.com/NoiRC256/URPSimpleGenshinShaders)). No three.js implementation was found, and each one needs a texture per face layout, so it belongs in a late phase. Use these engine references for method only, because their licences were not checked.

On phones, render **without a post-processing chain**: MSAA through `antialias: true`, the renderer's own tone mapping and a pixel-ratio cap. `renderer.toneMapping` is ignored once you render to a target ([three.js forum](https://discourse.threejs.org/t/tone-mapping-overview/75204)). Use **Neutral** tone mapping, as the site already does; its notes record that ACES "washed the skin out and turned it orange". Allow faint bloom on desktop only. Strong bloom on toon rims turns into the glow blobs that the design rules forbid.

**Stay on `WebGLRenderer` in 2026.** An r183 report measured WebGPURenderer about **2× slower on the CPU and 5–10× slower on the first frame** ([three.js forum](https://discourse.threejs.org/t/webgpurenderer-2x-slower-cpu-and-5-10x-slower-first-frame-than-webglrenderer-on-many-mesh-scenes-r183-same-on-both-backends/91904)). A Babylon user says WebGPU on mobile is "not ready to replace WebGL 2 on every mobile device yet" ([Babylon forum](https://forum.babylonjs.com/t/webgpu-on-mobile-is-it-ready/63694)).

The phone budget follows community rules of thumb, not official limits. Mobile guidance is **under 100 draw calls** ([forum](https://discourse.threejs.org/t/problems-with-performance-on-mobile-devices/23734)), and one case study went from 10 to about 30 fps by cutting draw calls from 387 to 42 ([case study](https://javascript.plainenglish.io/how-we-optimized-our-three-js-application-to-run-on-mobile-devices-4a3bc9e572f4)). For the teacher that means:

- **30–70k triangles and at most about 8 material slots**, with meshes merged per material
- **KTX2 textures at 1024 px on phones**
- short spring-bone chains
- no real-time shadow maps on phones, and a baked AO map instead
- a 30 fps cap when idle

## Lips need ARKit shapes, not just VRM's five vowels

VRM's five mouth expressions (aa, ih, ou, ee, oh) cannot close the lips. With only those, a VRM-only avatar can never show **p/b/m closures or the f/v lip tuck**, and those are the frames where viewers see "bad lip sync". Near-perfect lips need ARKit-52 channels such as `mouthClose`, `mouthPress`, `mouthRollLower`, `mouthFunnel`, `mouthPucker` and `jawOpen`. The MPFB base gives us these for free. Our teacher should therefore carry **ARKit-52 + Oculus-15 + VRM-5** together, the same contract the current TalkingHead setup uses ([TalkingHead](https://github.com/met4citizen/TalkingHead)).

The lip-sync drivers rank clearly:

| Driver | Licence | Use | Quality / cost |
|---|---|---|---|
| **HeadTTS timings** | MIT; Kokoro Apache-2.0 ([HeadTTS](https://github.com/met4citizen/HeadTTS)) | Our own live English TTS | Exact phoneme-level viseme times from the TTS itself; en-us only |
| **wav2arkit_cpu** | Apache-2.0 ([HF card](https://huggingface.co/myned-ai/wav2arkit_cpu)) | Any audio: pre-rendered, cloned, Hindi | ARKit-52 at 30 fps with learned coarticulation; ~45 ms of CPU per second of audio, but a **404 MB** download ([files](https://huggingface.co/myned-ai/wav2arkit_cpu/tree/main)) |
| **HeadAudio** | MIT ([HeadAudio](https://github.com/met4citizen/HeadAudio)) | Instant fallback on any device | 14 kB, ~50 ms latency, tested on iPhone/iPad; author calls it "far from optimal" at low SNR |
| uLipSync / wLipSync | MIT ([uLipSync](https://github.com/hecomi/uLipSync), [wLipSync](https://github.com/mrxz/wLipSync)) | Calibrated single voice | Vowels only; needs Unity calibration |
| Rhubarb | MIT ([LICENSE](https://raw.githubusercontent.com/DanielSWolf/rhubarb-lip-sync/master/LICENSE.md)) | Offline baking | Cartoon 9-shape set |

NVIDIA Audio2Face-3D is legally usable: MIT SDK, Open Model License weights and "ready for commercial use" ([HF card](https://huggingface.co/nvidia/Audio2Face-3D-v3.0)). In practice it is excluded, because it needs **CUDA 12.8+, TensorRT and 4 GB+ of GPU memory** ([SDK](https://github.com/NVIDIA/Audio2Face-3D-SDK)), and the guardrail terms were only seen in search snippets. EmoTalk is CC BY-NC and therefore out ([EmoTalk](https://github.com/psyai-net/EmoTalk_release)). FaceFormer and UniTalker ship checkpoints with no stated licence, trained on research datasets ([FaceFormer](https://github.com/EvelynFan/FaceFormer), [UniTalker](https://github.com/X-niper/UniTalker)).

wav2arkit_cpu belongs on the **free server, not the phone**. It runs on CPU at about 22× real time, so the Oracle box can turn a lesson's audio into a small stream of 52 × 30 fps frames, which is far lighter to send than the model. A third party has also run it fully in the browser through onnxruntime-web ([Radiance Fields](https://radiancefields.com/gsplat-talkinghead-brings-lip-synced-gaussian-splat-avatars-to-ai-voice-agents)). That is an option for desktops after one cached download.

The timing rules are firm. ITU-R BT.1359 puts the detection threshold at about **45 ms when sound leads the picture, but 125 ms when the picture leads** ([ITU-R BT.1359-1](https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1359-1-199811-I!!PDF-E.pdf)). So start each viseme 30–60 ms early, and start lip-rounding shapes one phoneme early, as the JALI patent describes ([US10839825B2](https://patents.google.com/patent/US10839825)). Drive the jaw from smoothed loudness and the lips from visemes; JALI's core point is that jaw and lips are separate actions ([JALI](https://dgp.toronto.edu/~elf/JALISIG16.pdf)). Make p/b/m a hard override that shuts the lips for at least about two frames. To stop chattering, use HeadAudio's tested defaults: **a 120 ms minimum viseme, 100 ms ramps and peaks capped at 0.65** ([HeadAudio](https://github.com/met4citizen/HeadAudio)). The specific lead and closure numbers are engineering recipes drawn from these sources, not measured optima.

**Hindi needs a module we write ourselves.** HeadTTS supports en-us only. TalkingHead's pluggable `lipsync-xx` modules include Bengali, which shows an Indic module is possible ([TalkingHead](https://github.com/met4citizen/TalkingHead)). Academic work shows Hindi phonemes map well onto standard viseme sets, because most of them also occur in English ([ACL W13-3904](https://preview.aclanthology.org/moar-dois/W13-3904.pdf), [arXiv 1901.10139](https://arxiv.org/pdf/1901.10139)). The site already writes Hindi as IPA (`src/voice/hindi-ipa.js`). A table from those IPA phonemes to the Oculus 15 visemes is a small, licence-free job, for example प फ ब भ म → PP and retroflex/dental stops → DD/nn. For Hinglish, tag each word by language and send each through its own rules.

There is still no evidence that any free method is "near-perfect". **No head-to-head perceptual study of HeadTTS, wav2arkit or HeadAudio exists.** So our own blind A/B test plus an automatic check (lips closed within ±1 frame of every aligned p/b/m) has to be the acceptance gate.

## Excellent Indian voice is possible free only if lessons are pre-rendered

This is the requirement where "perfection, free" meets its hardest limit, and the owner should hear it plainly. **Kokoro-82M through HeadTTS is the only option that meets every live condition at once.** Its weights are Apache-2.0 and HeadTTS is MIT. It runs faster than real time on CPU (RTF ≈0.21–0.24 on an M2) and on WebGPU, and it returns word, phoneme and viseme timings. But its four Hindi voices are graded **"C" overall, trained on only 1–10 hours of Hindi**, and the card warns that non-English support "may be absent or thin" ([Kokoro VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md), [HeadTTS](https://github.com/met4citizen/HeadTTS)). In WASM-only browsers it runs at RTF ≈1.45, slower than real time. One community test on a weak 2-core ARM board never reached real time ([Stacker News](https://stacker.news/items/1578766)), so the Oracle 4-core figure has to be measured, not assumed.

Better Indian voices with clean licences exist, but all are large and none returns timings:

| Model | Licence | Indian coverage | Evidence | Fit |
|---|---|---|---|---|
| **Indic Parler-TTS** | Apache-2.0 ([card](https://huggingface.co/ai4bharat/indic-parler-tts)) | 21 langs incl. Hindi + English, 69 voices | Hindi native-speaker score **84.79** | Best clean Hindi/Indian-English narration, offline (0.9B) |
| **Chatterbox Multilingual** | MIT, PerTh watermark ([card](https://huggingface.co/ResembleAI/chatterbox)) | 23 langs incl. Hindi finetune | No independent scores | **Consented clone** from ~10 s, offline (0.5B) |
| Svara-TTS v1 | Apache-2.0 weights; data terms "apply" ([card](https://huggingface.co/kenpath/svara-tts-v1), [blog](https://huggingface.co/blog/kenpath/svara-tts-open-multilingual-speech-for-india)) | 18 Indic + Indian English, code-switch "common patterns" | No metrics | 3B; GPU; worth a listening test |
| Veena | Apache-2.0, but a "proprietary" tag is also shown ([card](https://huggingface.co/maya-research/Veena)) | Hindi/English code-mixed | Self-reported MOS 4.2 | 3–4B; GPU; licence page inconsistent |
| IndicF5 | MIT, gated, consent terms ([card](https://huggingface.co/ai4bharat/IndicF5)) | 11 Indic, **no English** | None | Hindi-only cloning alternative |

The following are **excluded on licence**:

- MMS-TTS: CC-BY-NC ([card](https://huggingface.co/facebook/mms-tts-hin))
- XTTS-v2: Coqui Public Model License ([card](https://huggingface.co/coqui/XTTS-v2))
- F5-TTS official weights: CC-BY-NC ([card](https://huggingface.co/SWivid/F5-TTS))
- IndexTTS2: commercial use needs bilibili's permission ([repo](https://github.com/index-tts/index-tts))
- Piper's Hindi voices: priyamvada is CC BY-NC-SA ([model card](https://huggingface.co/rhasspy/piper-voices/blob/main/hi/hi_IN/priyamvada/medium/MODEL_CARD)), and rohan depends on an unread IIT Madras licence PDF ([model card](https://huggingface.co/rhasspy/piper-voices/blob/main/hi/hi_IN/rohan/medium/MODEL_CARD))

Kyutai Pocket TTS clones quickly on CPU (≈6× real time on 2 cores) but has no Hindi ([card](https://huggingface.co/kyutai/pocket-tts)).

The architecture that follows is a **two-lane voice**:

- **Live lane:** Guru replies and anything generated on the spot use Kokoro via HeadTTS, with exact lips.
- **Narration lane:** fixed lesson narration and the founder's voice are rendered once, offline, on a free GPU (Kaggle or Colab batch jobs, or the existing model farm). Indic Parler-TTS reads Hindi and Indian English. Chatterbox Multilingual reads in the founder's consented clone.
- **Narration lips:** run that audio through wav2arkit_cpu on the server for its face track, and serve audio plus track as static files.

Live cloned speech on a free 4-core CPU is not realistic for a 0.5B LLM-style model. Saying "the founder's voice answers live" would be a promise we cannot keep. Chatterbox's watermark is an asset here: the site can prove its audio is synthetic. Romanised Hinglish ("mid kya hai") is reliable in **none** of these models. Every lane needs a word-level language tagger and Roman-to-Devanagari or IPA conversion first, which the existing `hindi-ipa.js` partly does. Any transliterator we add (for example IndicXlit) needs its own licence check.

## Body language comes mostly from code, not motion libraries

No free motion library covers a teacher's idle, listening, thinking and talking. The reliable approach is layered:

- a slow base clip
- procedural breathing, head drift, saccades and blinks on VRM normalised bones after `mixer.update`
- `vrm.lookAt` for gaze
- additive one-shot gestures on top

This is the pattern TalkingHead's MIT code already uses, with moods, per-state eye-contact ratios and gesture templates whose angles carry random ranges, so no two plays look identical ([TalkingHead README](https://raw.githubusercontent.com/met4citizen/TalkingHead/main/README.md)). The site already ships TalkingHead 1.8.2 with **`namaste`, `thumbup`, `index`, `handup` and `shrug`** templates. Porting them to VRM bone names, using the `mixamoVRMRigMap` conversion in three-vrm's own example ([loadMixamoAnimation.js](https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm/examples/humanoidAnimation/loadMixamoAnimation.js)), gives us wave, namaste, point and thumbs-up without new assets. Namaste should finish with a two-bone IK target at the chest so the palms meet on every body shape. Pointing gets the head and eyes to the target about 150 ms before the arm.

For clips, the safe sources are:

- **Quaternius Universal Animation Library 1 and 2:** CC0, 250+ clips in total ([UAL](https://quaternius.com/packs/universalanimationlibrary.html), [UAL2](https://quaternius.com/packs/universalanimationlibrary2.html))
- **The official VRoid "VRM Animation 7-set":** commercial use allowed with the credit "Character animation credits to pixiv Inc.'s VRoid Project" ([BOOTH](https://booth.pm/ja/items/5512385), read through a search summary)
- **CMU mocap:** may be included in commercial products but not resold as data ([CMU](https://mocap.cs.cmu.edu/resources.php)). Convert the original BVH ourselves, because some converted mirrors add CC BY-NC terms ([4TU](https://data.4tu.nl/datasets/0448aab2-3332-449f-a8e2-d208cb58c7df)).

Play clips with `@pixiv/three-vrm-animation` ([repo](https://github.com/pixiv/three-vrm/tree/dev/packages/three-vrm-animation)), and convert everything to **.vrma** once so any teacher can play it without retargeting.

**Do not ship Mixamo files.** Adobe allows royalty-free use in projects but forbids distributing raw files ([Adobe Community](https://community.adobe.com/t5/mixamo-discussions/mixamo-faq-licensing-royalties-ownership-eula-and-tos/td-p/13234775)). Every file a web app plays is downloaded to the visitor's browser, so treat Mixamo as needing Adobe's written OK. Also excluded: Bandai Namco's dataset (CC BY-NC, [README](https://github.com/BandaiNamcoResearchInc/Bandai-Namco-Research-Motiondataset/blob/master/README.md)), AMASS and HumanML3D-trained models such as MoMask ([AMASS licence](https://amass.is.tue.mpg.de/license.html)), and SMPL-X-based co-speech models (BEAT2, EMAGE).

Two AI motion generators do allow commercial use, for **offline** clip-making:

- **NVIDIA Kimodo SOMA/G1:** NVIDIA Open Model License, "ready for commercial use"; its SMPL-X checkpoint is research-only ([HF](https://huggingface.co/nvidia/Kimodo-SOMA-SEED-v1.1))
- **Tencent HY-Motion 1.0:** commercial use allowed below 100M MAU, but the licence territory **excludes the EU, UK and South Korea** ([issue #49](https://github.com/Tencent-Hunyuan/HY-Motion-1.0/issues/49)). nexoraguru.in serves the world, so Kimodo is the safer of the two.

Their outputs need retargeting to VRM, and both full licence texts are still unread.

## The photo match is ours to build, privately, on the device

No free, commercially licensed "selfie to stylised avatar sliders" system exists. NetEase's F2P line is used in the game *Justice*, but its V2 repo has **no code, weights or licence** ([FuxiCV/Face-to-Parameter-V2](https://github.com/FuxiCV/Face-to-Parameter-V2)). AgileGAN outputs stylised images, not parameters, and is patented ([paper](https://guoxiansong.github.io/homepage/paper/AgileGAN.pdf), [patent](https://patents.justia.com/patent/20220375024)). Open MediaPipe-to-VRM tools such as KalidoKit *animate* an existing VRM rather than build one ([Mocapy](https://github.com/justinjohn0306/Mocapy)).

The parts we need are all Apache-2.0. The MediaPipe code and the model cards found for the blendshape, BlazeFace and hair-segmentation models all say Apache-2.0 ([MediaPipe](https://github.com/google-ai-edge/mediapipe), [Blendshape V2 card mirror](https://dcmpx.remotevs.com/com/googleapis/storage/SL/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf), [hair card mirror](https://dcmpx.remotevs.com/com/googleapis/storage/SL/mediapipe-assets/Model%20Card%20-%20Hair%20Segmentation.pdf)). The **multiclass selfie segmenter** separates hair, face-skin, body-skin and clothes ([guide, via search summary](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter)), which gives clean colour samples.

The pipeline runs in a Web Worker:

1. **Quality gate.** Reject a photo with head yaw or pitch above about 15°, or a high smile or blink score.
2. **Face shape.** Measure scale-free ratios from the 478 landmarks (jaw ÷ cheekbone width, eye width ÷ inter-eye distance and so on), averaged or medianed over the 1–3 photos.
3. **Solve the sliders.** Fit the avatar's morph weights by bounded least squares against the same ratios measured on the avatar, with a ridge penalty.
4. **Stylise.** Move the avatar only **50–70% of the person's distance from average**, so it stays cute rather than uncanny.
5. **Colours.** Correct white balance from the eye whites. Snap skin to the **Monk Skin Tone scale** (CC BY 4.0, credit required, [Wikipedia](https://en.wikipedia.org/wiki/Monk_Skin_Tone_Scale)). Snap iris and hair colours to small palettes.
6. **Hair, beard and glasses.** Hair length and fringe come from mask geometry, and beard from chin-region colour statistics. Glasses come from Qualcomm's BSD-3 attribute model ([HF](https://huggingface.co/qualcomm/Facial-Attribute-Detection)) or an edge heuristic.
7. **Ask, don't infer.** Never infer age or gender; ask the person.
8. **Review.** The person checks and edits every slider before saving.

Steps 2–6 are a design proposal with no published accuracy figure. Exclude CelebA and CelebAMask-HQ-trained classifiers, which are non-commercial ([CelebAMask-HQ](https://github.com/switchablenorms/CelebAMask-HQ)). Avoid copying the GPL-3.0 `skin-tone-classifier` code ([PyPI](https://pypi.org/project/skin-tone-classifier/)). ffunch's maker already has a MediaPipe resemblance beta that is worth studying.

Privacy shapes the design. Under India's DPDP Act 2023, a face photo is **personal data** ([Act](https://www.indiacode.nic.in/bitstream/123456789/22037/2/a2023-22.pdf)). The Rules notified in November 2025 phase in notice and consent duties over 18 months, and require **verifiable parental consent for under-18s** ([India Briefing](https://www.india-briefing.com/news/dpdp-rules-2025-india-data-protection-law-compliance-40769.html)). Many GATE and school users are 17–18. The design follows from that:

- Run every model on the device and **never upload the photo**.
- Keep only the avatar numbers, never a face embedding.
- Show a plain consent screen and a parent-consent note.
- Offer a "build it by hand" path that skips the photo.
- Make the user confirm the photo is their own face.

Whether device-only processing takes us outside "processing" under the Act is an inference and needs a short legal check.

## Recommended architecture and build plan

| Component | Choice | Licence | Main risk |
|---|---|---|---|
| A. Parts and base | One stylised MakeHuman/MPFB2 base mesh carrying ARKit-52 + Oculus-15 + VRM-5; our own CC0 hair, eyes and teacher wardrobe; fork or reuse ffunch/vrm-avatar-maker's Blender→VRM pipeline and recipe-in-VRM | CC0 assets, MIT code | Turning realistic topology into an anime-film look is art work |
| B. Look | WebGLRenderer; PBR-toon (wrap diffuse, warm shadows, soft rim, IBL) at run time, soft-MToon kept in the file; Neutral tone mapping; no composer on phones | MIT (three.js, three-vrm) | Values unbenchmarked; needs device testing |
| C. Lip sync | HeadTTS timings (live English); our Hindi IPA→viseme module; wav2arkit_cpu on the server for pre-rendered or cloned audio; HeadAudio fallback; JALI-style jaw/lip split and hard p/b/m | MIT / Apache-2.0 | No perceptual benchmark; wav2arkit untested on Hindi |
| D. Voice | Kokoro via HeadTTS live; Indic Parler-TTS for offline Hindi/Indian-English narration; Chatterbox Multilingual for the consented founder clone, pre-rendered on a free GPU | Apache-2.0 / MIT | Live Hindi stays "C" grade; no Oracle speed figures |
| E. Body | Procedural layers + ported TalkingHead templates + Quaternius UAL1/2 + VRoid 7-set (credited) + CMU (self-converted), all as .vrma | MIT / CC0 / credit | Teaching gestures mostly hand-authored |
| F. Photo match | MediaPipe Face Landmarker + multiclass segmenter in a Worker; ratio fit with shrink; MST palette; heuristics; user review; photo never leaves the device | Apache-2.0, CC BY 4.0 | No accuracy figures; DPDP consent for minors |

The build should go in six phases, each finished fully before the next.

**Phase 0: pin the licences.** Open every page that was blocked during research, save dated copies, and record the decisions in the repo. Measure Kokoro and wav2arkit speed on the Oracle A1 box.

**Phase 1: one perfect teacher.** One stylised base teacher with the full shape set, the shader, the lighting, HeadTTS lips and procedural body, tested at 60/30 fps on a mid-range Android phone. It must beat the rejected Rocketbox teacher in a blind side-by-side.

**Phase 2: the maker.** The parts library and maker UI, built with the Hive kit and the site's tokens.

**Phase 3: photo matching.** The on-device photo pipeline with the consent flow.

**Phase 4: Hindi.** The Hindi and Hinglish viseme module, plus offline Indic Parler narration with wav2arkit face tracks.

**Phase 5: the founder's voice.** The consented clone through Chatterbox, then a blind A/B lip-sync study as the release gate.

**Phase 6: polish.** Face-SDF shadows, eye and hair refinement, and offline Kimodo clips.

The following must still be verified before launch:

- **Pages that could not be opened in this research:**
  - VroidStudio guidelines (verbatim text) and the BOOTH 7-set terms
  - the AvatarSample A–Z terms
  - Adobe's Mixamo FAQ
  - the full NVIDIA Open Model License
  - the MakeHuman FAQ on character generators
  - Google's own model cards for FaceMesh V2 and the multiclass selfie segmenter
  - skintone.google
  - the IIT Madras IndicTTS licence PDF
  - the DPDP Rules gazette text
- **Things never checked:**
  - ffunch's exact emotion set
  - the visemes inside 100Avatars files
  - whether HeadTTS returns visemes for Hindi IPA input
  - whether MToon actually applies `giEqualizationFactor`
  - the licences of RigAnyFace, IndicXlit, any forced aligner and any CLIP model
  - the full HY-Motion licence
  - the Svara code licence and Veena's conflicting tags

## Conclusion

The research changes the question. It is no longer which product to adopt, but which single contract every part must honour. The one decision that unlocks everything else is **one CC0 base mesh carrying ARKit-52 + Oculus-15 + VRM-5**. With it, every hairstyle and outfit talks correctly, wav2arkit and HeadTTS both drive the same face, the photo fitter has one set of morphs to solve, and gestures transfer through VRM's normalised bones. Without it, each part needs its own face rig, and "near-perfect lips" becomes impossible, because VRM's five vowels cannot close a mouth.

The honest limit is voice. Looks, lips and motion can reach a premium level at zero cost through art work and engineering. Natural live Hindi and a live cloned voice cannot run on a free CPU in 2026. Pre-rendering narration offline and keeping Kokoro for live replies is the best that free and legal allows. Because no free method has independent quality evidence, the site's own blind tests with students, not any vendor claim, should decide when the teacher counts as "perfect".
