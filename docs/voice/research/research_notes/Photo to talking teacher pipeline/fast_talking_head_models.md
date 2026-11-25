# Fast one-photo, audio-driven talking-head models (motion-space / real-time family), 2023–2026

Research date: 2026-11-25. Method: READMEs and LICENSE files read straight from raw.githubusercontent.com, Hugging Face file lists and licence tags read from `huggingface.co/api/models/<id>`, and arXiv HTML papers downloaded and their tables parsed. Limits on this session: GitHub issue *bodies* could not be read (the API and github.com pages were blocked), so for issues only titles and dates are known. Some LICENSE files could not be fetched; those are marked "unverified". "Claimed" means the model's own authors say it. "Third-party" means another paper measured it, and that paper is usually a competitor, so it is not fully independent. No truly independent benchmark (blog or leaderboard) was found in the budget.

## Q1. Code licence, weight licence and bundled sub-models (can it be used commercially, and how are non-commercial parts replaced?)

### Takeaway
Ditto (Apache-2.0), LivePortrait/FasterLivePortrait (MIT), JoyVASA (MIT), IMTalker (Apache-2.0 code), MuseTalk (MIT, weights "even commercially"), LatentSync (Apache-2.0 code, OpenRAIL++ weights), SadTalker (Apache-2.0 plus third-party parts), AniPortrait (Apache-2.0) and LAM / LAM_audio2exp (Apache-2.0) are the candidates that allow commercial use. FLOAT (CC BY-NC-ND), KDTalker (README says CC BY-NC 4.0), Wav2Lip (non-commercial) and GaussianTalker (Inria Gaussian-Splatting licence) do not. Almost every fast model bundles InsightFace detector or landmark ONNX files, whose models are "for non-commercial research purposes only". Those files must be swapped, for example for MediaPipe (Apache-2.0), which Ditto already ships.

### Cited Findings
**InsightFace (the common blocker)**
- InsightFace README: "The code of InsightFace is released under the MIT License. There is no limitation for both academic and commercial usage. The training data containing the annotation (and the models trained with these data) are available for non-commercial research purposes only." It adds that both manually downloaded and auto-downloaded models "follow the above license policy (which is for non-commercial research purposes only)". A 2025-11-24 update says that for the open recognition models (buffalo_l), contact recognition-oss-pack@insightface.ai "for licensing". — [InsightFace README](https://raw.githubusercontent.com/deepinsight/insightface/master/README.md)
- MediaPipe repository LICENSE is Apache License 2.0. — [MediaPipe LICENSE](https://raw.githubusercontent.com/google-ai-edge/mediapipe/master/LICENSE)

**Ditto (antgroup/ditto-talkinghead; HF digital-avatar/ditto-talkinghead)**
- README: "This repository is released under the Apache-2.0 license as found in the LICENSE file." The GitHub LICENSE file is Apache 2.0. — [Ditto README](https://raw.githubusercontent.com/antgroup/ditto-talkinghead/main/README.md)
- The HF repo has its own LICENSE file (Apache License 2.0) but no `license:` tag in its metadata. — [HF LICENSE](https://huggingface.co/digital-avatar/ditto-talkinghead/raw/main/LICENSE), [HF API](https://huggingface.co/api/models/digital-avatar/ditto-talkinghead)
- HF file list:
  - `ditto_onnx/`: appearance_extractor, blaze_face, decoder, face_mesh, hubert, insightface_det, landmark106, landmark203, lmdm_v0.4_hubert, motion_extractor, stitch_network, warp_network(+_ori) ONNX files, plus `libgrid_sample_3d_plugin.so`.
  - `ditto_pytorch/aux_models/`: `2d106det.onnx`, `det_10g.onnx` (InsightFace buffalo names), `face_landmarker.task` (MediaPipe), `hubert_streaming_fix_kv.onnx`, `landmark203.onnx`.
  - `ditto_trt_Ampere_Plus/`: fp16/fp32 TensorRT engines of every part.
  — [HF API](https://huggingface.co/api/models/digital-avatar/ditto-talkinghead)
- `core/atomic_components/source2info.py` imports InsightFaceDet, Landmark106 (InsightFace), Landmark203, Landmark478 (MediaPipe BlazeFace + face mesh/task) and `EyeAttrUtilsByMP`. In `_crop`, `if last_lmk is None: # det for first frame or image`, it runs `insightface_det` and then `landmark106(img, boxes[0])` on the largest box. For video frames it tracks with the previous 203-point landmarks instead. So InsightFace runs only on the first frame, but both the detector **and** the 106-point landmarker are used, not the detector alone. — [source2info.py](https://raw.githubusercontent.com/antgroup/ditto-talkinghead/main/core/atomic_components/source2info.py)
- Ditto is built on LivePortrait and S2G-MDDiffusion (README acknowledgement). — [Ditto README](https://raw.githubusercontent.com/antgroup/ditto-talkinghead/main/README.md)
- Open licence issues on GitHub (titles only; bodies and replies not readable here):
  - #84 "Auxiliary model license clarification" (2026-02-04)
  - #97 "License of landmark203 and HuBERT weights for commercial use" (2026-10-11)
  - #98 "Licensing clarification request: provenance of landmark203.onnx in the distributed checkpoints" (2026-10-31)
  — [#84](https://github.com/antgroup/ditto-talkinghead/issues/84), [#97](https://github.com/antgroup/ditto-talkinghead/issues/97), [#98](https://github.com/antgroup/ditto-talkinghead/issues/98)

**LivePortrait (KwaiVGI)**
- MIT licence (Copyright 2024 Kuaishou), with this appended to the LICENSE file: "The code of InsightFace is released under the MIT License. The models of InsightFace are for non-commercial research purposes only. If you want to use the LivePortrait project for commercial purposes, you should remove and replace InsightFace's detection models to fully comply with the MIT license." — [LivePortrait LICENSE](https://raw.githubusercontent.com/KwaiVGI/LivePortrait/main/LICENSE)
- The README lists ComfyUI-LivePortraitKJ "with MediaPipe as an alternative to Insightface". — [LivePortrait readme](https://raw.githubusercontent.com/KwaiVGI/LivePortrait/main/readme.md)
- The HF API for KwaiVGI/LivePortrait returned no readable JSON, so the weight licence tag is unverified.

**FasterLivePortrait (warmshao)**
- Code is MIT (Copyright 2025 warmshao); the HF repo is tagged `license:mit`. — [LICENSE](https://raw.githubusercontent.com/warmshao/FasterLivePortrait/master/LICENSE), [HF API](https://huggingface.co/api/models/warmshao/FasterLivePortrait)
- HF ships `liveportrait_onnx/retinaface_det_static.onnx`, `face_2dpose_106_static.onnx` and `landmark.onnx`. The names point to InsightFace-family detector and 106-point models; this is an inference from the names, provenance not verified. — [HF API](https://huggingface.co/api/models/warmshao/FasterLivePortrait)

**JoyVASA (jdh-algo)**
- MIT licence (Copyright 2024 xuyangcao); HF jdh-algo/JoyVASA is tagged `license:mit`. — [LICENSE](https://raw.githubusercontent.com/jdh-algo/JoyVASA/main/LICENSE), [HF API](https://huggingface.co/api/models/jdh-algo/JoyVASA)
- Its checkpoint tree includes `insightface/.../2d106det.onnx` and `det_10g.onnx`, plus LivePortrait weights. Audio encoders are wav2vec2-base-960h (HF `license:apache-2.0`) and TencentGameMate/chinese-hubert-base (HF `license:mit`). — [JoyVASA README](https://raw.githubusercontent.com/jdh-algo/JoyVASA/main/README.md), [wav2vec2 HF](https://huggingface.co/api/models/facebook/wav2vec2-base-960h), [chinese-hubert HF](https://huggingface.co/api/models/TencentGameMate/chinese-hubert-base)

**KDTalker (chaolongy/KDTalker)**
- README badge reads "license-CC--BY--NC 4.0". The text says: "Our code is under the CC-BY-NC 4.0 license and intended solely for research purposes. If you have any questions or wish to use it for commercial purposes, please contact us." — [KDTalker README](https://raw.githubusercontent.com/chaolongy/KDTalker/main/README.md)
- Conflict: the HF repo ChaolongYang/KDTalker is tagged `license:mit`. It ships InsightFace buffalo_l `det_10g.onnx` and `2d106det.onnx`, dlib `shape_predictor_68_face_landmarks.dat`, and LivePortrait ONNX/TRT files. — [HF API](https://huggingface.co/api/models/ChaolongYang/KDTalker)

**IMTalker (cbsjtu01/IMTalker, arXiv 2511.22167, Nov 2025)**
- The GitHub LICENSE file is Apache License 2.0; the HF repo cbsjtu01/IMTalker is tagged `license:mit` (a mismatch, but both are permissive). — [LICENSE](https://raw.githubusercontent.com/cbsjtu01/IMTalker/main/LICENSE), [HF API](https://huggingface.co/api/models/cbsjtu01/IMTalker)
- Audio encoder is wav2vec2-base-960h (Apache-2.0). No InsightFace file appears in the HF list (filter matched nothing); the face-crop tool it uses is unverified. — [IMTalker README](https://raw.githubusercontent.com/cbsjtu01/IMTalker/main/README.md)

**FLOAT (deepbrainai-research/float)**
- "This work is licensed under a Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License. You may not use this work for commercial purposes and may use it only for research purposes." Checkpoints were released on 2025-02-17 under a "Non-commercial License". It uses wav2vec2-base-960h and an English speech-emotion wav2vec (r-f/wav2vec-english-speech-emotion-recognition). — [FLOAT README](https://raw.githubusercontent.com/deepbrainai-research/float/main/README.md)

**SadTalker (OpenTalker)**
- LICENSE: "SadTalker is licensed under the Apache 2.0 License, except for the third-party components listed below." README: "The license has been updated to Apache 2.0, and we've removed the non-commercial restriction." — [LICENSE](https://raw.githubusercontent.com/OpenTalker/SadTalker/main/LICENSE), [README](https://raw.githubusercontent.com/OpenTalker/SadTalker/main/README.md)
- Its bundled parts are GFPGAN/facexlib (face detection and enhancement), face-alignment detection models, a Deep3DFaceReconstruction 3DMM extractor and face-vid2vid. HF vinthony/SadTalker (tagged `license:mit`) also contains `BFM_Fitting/facemodel_info.mat` (Basel Face Model data) and the dlib `shape_predictor_68_face_landmarks.dat`. — [README](https://raw.githubusercontent.com/OpenTalker/SadTalker/main/README.md), [HF API](https://huggingface.co/api/models/vinthony/SadTalker)

**AniPortrait (Zejun-Yang)**
- Apache-2.0 LICENSE; HF ZJYang/AniPortrait is tagged `license:apache-2.0`. Audio encoder is wav2vec2-base-960h. — [LICENSE](https://raw.githubusercontent.com/Zejun-Yang/AniPortrait/main/LICENSE), [HF API](https://huggingface.co/api/models/ZJYang/AniPortrait)

**Takin-ADA (Ximalaya, arXiv 2410.14283)**
- A repository named audiobooklm/takinada exists (found by GitHub search). Its licence and whether code and weights were released are unverified (access blocked). — [Takin-ADA project page](https://everest-ai.github.io/takinada)

**TEMPO**
- No talking-head paper or repository named "TEMPO" was found. The nearest names are TempoSyncDiff (arXiv 2603.06057, March 2026; GitHub mazumdarsoumya/TempoSyncDiff, MIT, about 5 stars) and real-time papers such as Teller (CVPR 2025, 25 FPS), READ, RAP, REST and Livatar-1. Their code and licences were not checked. — [TempoSyncDiff arXiv](https://arxiv.org/abs/2603.06057), [Teller](https://arxiv.org/abs/2503.18429v1)

**MuseTalk 1.5 (TMElyralab)**
- README "Disclaimer/License": "`code`: The code of MuseTalk is released under the MIT License. There is no limitation for both academic and commercial usage. `model`: The trained model are available for any purpose, even commercially." HF TMElyralab/MuseTalk is tagged `license:mit`. — [MuseTalk README](https://raw.githubusercontent.com/TMElyralab/MuseTalk/main/README.md), [HF API](https://huggingface.co/api/models/TMElyralab/MuseTalk)
- Sub-models:
  - whisper-tiny (HF `license:apache-2.0`)
  - sd-vae-ft-mse (HF `license:mit`)
  - DWPose, face-alignment, face-parsing.PyTorch and S3FD, each with its own licence, not checked here
  — [README](https://raw.githubusercontent.com/TMElyralab/MuseTalk/main/README.md), [sd-vae HF](https://huggingface.co/api/models/stabilityai/sd-vae-ft-mse), [whisper-tiny HF](https://huggingface.co/api/models/openai/whisper-tiny)

**LatentSync 1.5 / 1.6 (ByteDance)**
- Code LICENSE is Apache 2.0. The model card for ByteDance/LatentSync-1.6 (and 1.5) declares `license: openrail++`. — [LICENSE](https://raw.githubusercontent.com/bytedance/LatentSync/main/LICENSE), [HF card 1.6](https://huggingface.co/ByteDance/LatentSync-1.6/raw/main/README.md)
- The HF repo bundles `auxiliary/sfd_face.pth` (S3FD), `auxiliary/syncnet_v2.model` and `stable_syncnet.pt`. The README's data-processing steps use InsightFace landmarks for the affine transform; whether inference also needs InsightFace is unverified. — [HF API](https://huggingface.co/api/models/ByteDance/LatentSync-1.6), [README](https://raw.githubusercontent.com/bytedance/LatentSync/main/README.md)
- Open issues (titles only, all 2026-10):
  - #369 "Clarification of commercial usage rights for LatentSync 1.6 pretrained weights"
  - #370 "License terms for LatentSync 1.5 in hosted and on-premises products"
  - #371 "License terms for the LatentSync 1.6 model weights"
  — [#369](https://github.com/bytedance/LatentSync/issues/369), [#371](https://github.com/bytedance/LatentSync/issues/371)

**Wav2Lip (Rudrabha)**
- README: "All results from this open-source code or our demo website should only be used for research/academic/personal purposes only. As the models are trained on the LRS2 dataset, any form of commercial use is strictly prohibited" (the sentence is truncated at "any form of c…" in the line we read). It also says: "This repository can only be used for personal/research/non-commercial purposes. However, for commercial requests, please contact us directly… synclabs.so". The README now leads with a paid "Commercial Version". The LICENSE file could not be fetched. — [Wav2Lip README](https://raw.githubusercontent.com/Rudrabha/Wav2Lip/master/README.md)

**GeneFace++ / Real3DPortrait / MimicTalk (yerfor)**
- All three are MIT (Copyright 2024 ZhenhuiYe). — [GeneFace++ LICENSE](https://raw.githubusercontent.com/yerfor/GeneFacePlusPlus/main/LICENSE), [Real3DPortrait LICENSE](https://raw.githubusercontent.com/yerfor/Real3DPortrait/main/LICENSE), [MimicTalk LICENSE](https://raw.githubusercontent.com/yerfor/MimicTalk/main/LICENSE)
- All three need the Basel Face Model (BFM) 3DMM files placed in `deep_3drecon/BFM`, downloaded separately. The BFM licence was not read here. Weight licence is unverified (HF yerfor/Real3DPortrait has no tag). — [Real3DPortrait README](https://raw.githubusercontent.com/yerfor/Real3DPortrait/main/README.md), [GeneFace++ README](https://raw.githubusercontent.com/yerfor/GeneFacePlusPlus/main/README.md)

**ER-NeRF / GaussianTalker / TalkingGaussian**
- ER-NeRF LICENSE is MIT (Copyright 2022 hawkey). — [ER-NeRF LICENSE](https://raw.githubusercontent.com/Fictionarry/ER-NeRF/main/LICENSE)
- GaussianTalker's LICENSE file begins "Gaussian-Splatting License … Inria and the Max Planck Institut…". Only the heading was read; the Inria 3DGS licence is generally known to be non-commercial (inference, not verified text). — [GaussianTalker LICENSE](https://raw.githubusercontent.com/cvlab-kaist/GaussianTalker/main/LICENSE)
- No LICENSE file was found at the TalkingGaussian root (unverified).

**LAM / LAM_Audio2Expression (aigc3d)**
- Both GitHub LICENSE files are Apache 2.0. HF 3DAIGC/LAM_audio2exp is tagged `license:apache-2.0`; HF 3DAIGC/LAM-20K has no licence tag. — [LAM LICENSE](https://raw.githubusercontent.com/aigc3d/LAM/main/LICENSE), [LAM_A2E LICENSE](https://raw.githubusercontent.com/aigc3d/LAM_Audio2Expression/main/LICENSE), [HF A2E](https://huggingface.co/api/models/3DAIGC/LAM_audio2exp)
- LAM_A2E outputs ARKit blendshapes adapted to the FLAME topology. The FLAME model licence was not read. — [LAM_A2E README](https://raw.githubusercontent.com/aigc3d/LAM_Audio2Expression/main/README.md)

**Shared audio encoders**
- HF licence tags: facebook/wav2vec2-base-960h Apache-2.0; facebook/hubert-large-ls960-ft Apache-2.0; TencentGameMate/chinese-hubert-base MIT; openai/whisper-tiny Apache-2.0. — [HF API wav2vec2](https://huggingface.co/api/models/facebook/wav2vec2-base-960h), [hubert](https://huggingface.co/api/models/facebook/hubert-large-ls960-ft), [whisper-tiny](https://huggingface.co/api/models/openai/whisper-tiny)

### Inferences
- **Ditto, commercially clean path:** drop `insightface_det` and `landmark106` and seed the first-frame crop with MediaPipe. The BlazeFace box and Face Landmarker 478 points are already in the repo as `blaze_face.onnx`, `face_mesh.onnx` and `face_landmarker.task`. Map a subset of the 478 points to what `crop_image` and `landmark203` expect, or compute the crop box straight from the MediaPipe mesh. Two parts still have unclear provenance and are the subject of open issues: `landmark203.onnx` (probably LivePortrait's `landmark.onnx`) and `hubert.onnx` (which HuBERT checkpoint is unknown). Treat both as unverified until #97 and #98 are answered.
- The same swap applies to LivePortrait, FasterLivePortrait, JoyVASA, KDTalker and IMTalker. They all share the LivePortrait crop pipeline, which uses InsightFace for detection plus 106 landmarks.
- SadTalker and the GeneFace/Real3DPortrait/MimicTalk family depend on BFM (and dlib 68-point) assets whose licences are separate and commonly non-commercial. Calling them "Apache/MIT" alone is not enough.
- Wav2Lip and any derivative that reuses its LRS2-trained weights (Wav2Lip-HD, Wav2Lip+GFPGAN and so on) inherit the non-commercial restriction. Avoid them.
- OpenRAIL++ (LatentSync weights) is usually read as allowing commercial use under use-based restrictions. ByteDance has not answered the October 2026 issues asking about it, so it carries more risk than MIT or Apache.

### Gaps
- GitHub issue bodies and maintainer replies (Ditto #84/#97/#98, LatentSync #369–371) could not be read.
- The licence text of landmark203 and Ditto's HuBERT is unknown.
- The licences of BFM, FLAME, dlib 68, S3FD, SyncNet, face-parsing and DWPose were not read.
- No LICENSE files were read for Wav2Lip, TalkingGaussian or Takin-ADA.
- The LivePortrait HF weight licence tag could not be read.

## Q2. Quality numbers (Sync-C/D, FID, FVD, CSIM, E-FID, head motion, blinks)

### Takeaway
On papers alone, IMTalker (2025-11) and Ditto lead the fast family on lip sync. However, a third-party paper (IMTalker) measured Ditto far lower than Ditto reports for itself: HDTF Sync-C 6.09 against Ditto's own 8.94. KDTalker gives the best measured head-motion diversity. Among mouth-only dubbing models, LatentSync and MuseTalk each beat the other in their own papers.

### Cited Findings
**Ditto, claimed (arXiv 2411.19509)**

Talk9 dataset:

| Model | FID | FVD | CSIM | Sync-C | Sync-D | RTF |
|---|---|---|---|---|---|---|
| Ditto, 10 steps | 17.060 | 231.2 | 0.861 | 8.111 | 7.291 | 0.635 |
| Ditto, 50 steps | 17.254 | 219.4 | 0.864 | 8.069 | 7.114 | 2.121 |
| MuseTalk | 21.4 | 436.9 | 0.807 | 5.586 | 8.400 | — |
| Hallo2 | 22.9 | 245.2 | 0.806 | 7.737 | 7.608 | — |
| Ground truth | — | — | — | 8.044 | 6.943 | — |

HDTF100:

| Model | FID | FVD | SyncC | SyncD |
|---|---|---|---|---|
| Ditto | 16.430 | 134.640 | 8.939 | 6.913 |
| Hallo2 | 16.616 | 239.5 | 7.379 | 7.697 |

- In the user study, Ditto won visual quality (84.0%) and lipsync (80.7%), but **naturalness only 48.7%**, behind Hallo2 (59.3%) and EchoMimic (58.7%). — [Ditto arXiv HTML](https://arxiv.org/html/2411.19509)

**IMTalker (arXiv 2511.22167): its own numbers plus third-party numbers for Ditto and FLOAT** (HDTF / CelebV)

| Model | Sync-C | Sync-D | FID | FVD | CSIM |
|---|---|---|---|---|---|
| IMTalker | 7.711 / 7.364 | 7.794 / 7.832 | 9.084 / 17.921 | 143.6 / 200.6 | 0.869 / 0.814 |
| Ditto | 6.093 / 5.154 | 8.938 / 9.771 | 11.746 / 25.367 | 195.8 / 288.8 | 0.886 / 0.806 |
| FLOAT | 6.854 / 6.843 | 8.336 / 8.171 | 9.164 / 18.272 | 199.0 / 228.2 | 0.843 / 0.745 |
| Hallo | 7.497 / 6.843 | 7.694 / 8.065 | — | — | 0.863 / 0.787 |

- In video-driven reenactment, IMTalker beat LivePortrait in self-reenactment (FID 7.426 vs 9.049; CSIM 0.898 vs 0.896) and in cross-reenactment (CSIM 0.824 vs 0.789). — [IMTalker arXiv HTML](https://arxiv.org/html/2511.22167)
- Contradiction: Ditto's own HDTF100 Sync-C is 8.939 and Sync-D 6.913, while IMTalker's measurement on HDTF is 6.093 and 8.938. Test sets, crops and settings differ, and IMTalker is a competitor. — [Ditto](https://arxiv.org/html/2411.19509); [IMTalker](https://arxiv.org/html/2511.22167)

**KDTalker, claimed (arXiv 2503.12963, HDTF, RTX 4090)**

| Model | LSE-C | LSE-D | Pose diversity | FID | CSIM | FPS |
|---|---|---|---|---|---|---|
| KDTalker | 7.326 | 7.548 | **0.760** | 9.756 | 0.949 | 21.678 |
| Real video | 8.243 | 6.929 | 0.639 | — | — | — |
| SadTalker | 7.121 | 7.813 | 0.494 | — | — | 21.277 |
| Real3DPortrait | 7.004 | 7.804 | 0.118 | — | — | 3.092 |
| AniTalker | 7.107 | 8.077 | 0.374 | — | — | 14.045 |
| AniPortrait | 3.438 | 10.946 | — | — | — | 1.555 |

- In the user study, KDTalker was chosen best for head diversity by 61.7% of participants. — [KDTalker arXiv HTML](https://arxiv.org/html/2503.12963)

**FLOAT, claimed (arXiv 2412.01064)**
- On HDTF / RAVDESS: FID 21.100 / 31.681, FVD 162.052 / 166.359, E-FID 1.229 / 1.367, LSE-D 7.290 / 6.994 (Table 2, row A).
- MOS for SadTalker: lip sync 2.20 and head motion 2.03 out of 5. — [FLOAT arXiv HTML](https://arxiv.org/html/2412.01064)

**JoyVASA, claimed (arXiv 2411.09209)**
- On CelebV-HQ: Sync-C 4.85, Sync-D 13.53, FVD-25 459.04 (best FVD in its table).
- That is lower lip sync than Hallo (6.25) and JoyHallo (6.36), and higher than AniPortrait (1.98). — [JoyVASA arXiv HTML](https://arxiv.org/html/2411.09209)

**Takin-ADA, claimed (arXiv 2410.14283)**
- Speech-driven: MOS-R 4.187, MOS-N 3.839, MOS-LS 3.887, FID 27.803, LSE-D 7.764.
- SadTalker in the same table: LSE-D 7.748; EDTalk: 7.686. — [Takin-ADA arXiv HTML](https://arxiv.org/html/2410.14283)

**LatentSync, claimed (arXiv 2412.09262; mouth dubbing, needs a source video)**

| Model | Sync conf (HDTF) | FID (HDTF) | FVD (HDTF) |
|---|---|---|---|
| LatentSync | 8.9 | 7.22 | 162.74 |
| Wav2Lip | 8.2 | 12.5 | — |
| MuseTalk | 6.8 | 9.35 | — |

— [LatentSync arXiv HTML](https://arxiv.org/html/2412.09262)

**MuseTalk, claimed (arXiv 2410.10122)**

| Model | FID (HDTF) | CSIM (HDTF) | LSE-C (HDTF) | Ground truth LSE-C |
|---|---|---|---|---|
| MuseTalk | 6.52 | 0.86 | 6.53 | 7.73 |
| LatentSync | 8.41 | — | 7.90 | — |
| Wav2Lip | — | — | 7.42 | — |

- In MuseTalk's user study it won visual quality (4.26) and identity (4.15), while LatentSync won lip-sync quality (4.07 vs 3.77). Each paper ranks itself first on its headline metric. — [MuseTalk arXiv HTML](https://arxiv.org/html/2410.10122)

**Blinks and eyes**
- Ditto computes eye attributes with MediaPipe (`EyeAttrUtilsByMP` in source2info.py). — [source2info.py](https://raw.githubusercontent.com/antgroup/ditto-talkinghead/main/core/atomic_components/source2info.py)
- IMTalker takes explicit head-pose and eye-gaze inputs; its ablation shows that adding pose and gaze lowers FID from 17.55 to 9.08. — [IMTalker README](https://raw.githubusercontent.com/cbsjtu01/IMTalker/main/README.md), [IMTalker arXiv](https://arxiv.org/html/2511.22167)

### Inferences
- For "natural, not robotic" motion, use KDTalker's diversity metric (0.760 vs a real-video 0.639) and Ditto's weaker naturalness vote (48.7%) as signals. Ditto's lip sync is strong, but its motion may need tuning (its emotion and canonical-keypoint conditions matter a lot, per its ablation) or a different motion source.
- KDTalker is non-commercial, so IMTalker (permissive) or Ditto are the realistic commercial picks. JoyVASA's lip sync is clearly weaker.
- MuseTalk or LatentSync could serve as a second "mouth refinement" pass over a Ditto or IMTalker output. LatentSync costs more time and VRAM.

### Gaps
- No blink-rate metric was reported by any of these papers.
- FLOAT's main Table 1 (Sync-C vs baselines) could not be parsed.
- No numbers were read for GaussianTalker, TalkingGaussian, GeneFace++, MimicTalk or LAM.
- No truly independent benchmark (a non-author leaderboard) was found.

## Q3. Speed, latency, streaming, VRAM, resolution, drift

### Takeaway
Ditto is the only one with a published streaming mode and first-frame delay: 385 ms first-frame delay and real-time factor (RTF) 0.895 online on an A100 at 512×512. IMTalker and Takin-ADA claim about 42 FPS at 512² on an RTX 4090. KDTalker claims about 22 FPS. FasterLivePortrait claims 30+ FPS end to end on an RTX 3090 with TensorRT. CPU-only use is not practical for any of them.

### Cited Findings
**Ditto (claimed, A100 with a 12-core Xeon 8369B)**
- Per-step module times: Audio2Feat 23 ms (RTF 0.115), Motion DiT 62 ms (0.310), face rendering 15 ms (0.375).
- Talking head offline RTF 0.635; online RTF 0.895 with a 385 ms first-frame delay (FFD).
- Full body at 1920×1080: online RTF 0.914, FFD 392 ms. — [Ditto arXiv HTML](https://arxiv.org/html/2411.19509)
- Separate online and offline configs (`v0.4_hubert_cfg_trt_online.pkl` vs `..._trt.pkl`); tested on CentOS, A100, TensorRT 8.6.1. — [Ditto README](https://raw.githubusercontent.com/antgroup/ditto-talkinghead/main/README.md)
- Issue titles only:
  - #93 "inference.py silently produces only ~5 frames with online cfg (imports offline StreamSDK)" (2026-08-28)
  - #87 "Choosing RTX 3090 vs 4090 vs 5090 vs A100" (2026-03)
  - #62 "Realtime CONCURRENCY" (2025-09)
  - #40 "HuBERT - KV Cache and other optimizations" (2025-05)
  - #12 "CPU run error" (2025-01)
  — [#93](https://github.com/antgroup/ditto-talkinghead/issues/93), [#87](https://github.com/antgroup/ditto-talkinghead/issues/87), [#62](https://github.com/antgroup/ditto-talkinghead/issues/62), [#40](https://github.com/antgroup/ditto-talkinghead/issues/40), [#12](https://github.com/antgroup/ditto-talkinghead/issues/12)

**LivePortrait (claimed, RTX 4090, PyTorch + torch.compile, per frame)**
- Appearance extractor 0.82 ms, motion extractor 0.84 ms, SPADE generator 7.59 ms, warping 5.21 ms, stitching/retargeting 0.31 ms. About 14.8 ms of rendering per frame.
- On Apple Silicon it "maybe 20x slower than RTX 4090". — [speed.md](https://raw.githubusercontent.com/KwaiVGI/LivePortrait/main/assets/docs/speed.md), [readme](https://raw.githubusercontent.com/KwaiVGI/LivePortrait/main/readme.md)

**FasterLivePortrait (claimed)**
- "real-time running of LivePortrait on RTX 3090 GPU using TensorRT, reaching speeds of 30+ FPS. This is the speed for rendering a single frame, including pre- and post-processing."
- Needs TensorRT 8.x (">=10.x are not compatible") and a custom grid_sample 3D plugin.
- onnxruntime-gpu needs a custom build for 5D grid_sample; "cpu inference is extremely slow and not recommended".
- It also advertises "Audio-driven video (real-time)". — [FasterLivePortrait README](https://raw.githubusercontent.com/warmshao/FasterLivePortrait/master/README.md)

**Other models (claimed unless noted)**
- **IMTalker:** 42 FPS audio-driven and 40 FPS video-driven at 512×512 on an RTX 4090. Pose, gaze and step ablation: 5/10/50 steps all usable. — [IMTalker README](https://raw.githubusercontent.com/cbsjtu01/IMTalker/main/README.md), [arXiv](https://arxiv.org/html/2511.22167)
- **Takin-ADA:** 512×512 "up to 42 FPS on an RTX 4090 GPU" with native PyTorch, "from audio input to final portrait output". — [Takin-ADA arXiv HTML](https://arxiv.org/html/2410.14283)
- **KDTalker:** 21.678 FPS on one RTX 4090; runs on an RTX 3090 or 4090. — [KDTalker arXiv](https://arxiv.org/html/2503.12963), [README](https://raw.githubusercontent.com/chaolongy/KDTalker/main/README.md)
- **FLOAT:** 41.37 FPS at NFE 10 and 45.22 at NFE 2 on a V100. This is a forward-pass measurement. — [FLOAT arXiv HTML](https://arxiv.org/html/2412.01064)
- **JoyVASA:** tested on an A100. The paper notes other methods' roughly 0.4 s motion context as a limitation, and it generates long videos by a sequential, non-reference approach. — [JoyVASA README](https://raw.githubusercontent.com/jdh-algo/JoyVASA/main/README.md), [arXiv](https://arxiv.org/html/2411.09209)
- **MuseTalk:**
  - "30fps+ on an NVIDIA Tesla V100" in real-time mode, with avatar pre-processing done in advance.
  - On an RTX 3050 Ti laptop with 4 GB VRAM in fp16, "generating an 8-second video takes approximately 5 minutes".
  - Input should be 25 fps. — [MuseTalk README](https://raw.githubusercontent.com/TMElyralab/MuseTalk/main/README.md)
- **LatentSync:**
  - Minimum inference VRAM is 8 GB for 1.5 and 18 GB for 1.6.
  - `inference_steps` 20–50 ("higher value improves visual quality but slows down").
  - 1.6 (released 2025-06-11) is trained at 512×512 to fix blurry teeth and lips. — [LatentSync README](https://raw.githubusercontent.com/bytedance/LatentSync/main/README.md), [HF card](https://huggingface.co/ByteDance/LatentSync-1.6/raw/main/README.md)
- **LAM:**
  - Reconstruction takes 1.4 s per image.
  - Animation and rendering run at 562.9 FPS on an A100 and "110+FPS" on a Xiaomi 14 phone.
  - A "Low-latency SDK for Realtime Interactive Chatting Avatar" and export to OpenAvatarChat are offered.
  - LAM_A2E has a streaming config (`lam_audio2exp_config_streaming.py`). — [LAM README](https://raw.githubusercontent.com/aigc3d/LAM/main/README.md), [LAM_A2E README](https://raw.githubusercontent.com/aigc3d/LAM_Audio2Expression/main/README.md)
- **NeRF and Gaussian-splat models:**
  - GaussianTalker was tested on an RTX 3090 and an A6000.
  - ER-NeRF and TalkingGaussian need a per-person training video ("must be 25FPS, with all frames containing the talking person"), so they are not one-photo. — [GaussianTalker README](https://raw.githubusercontent.com/cvlab-kaist/GaussianTalker/main/README.md), [ER-NeRF README](https://raw.githubusercontent.com/Fictionarry/ER-NeRF/main/README.md), [TalkingGaussian README](https://raw.githubusercontent.com/Fictionarry/TalkingGaussian/main/README.md)

### Inferences
- **Live tutor replies.** Ditto online on an A100 adds about 0.4 s to the first frame on top of TTS. On free or cheap GPUs (T4, consumer cards) expect a slower real-time factor, possibly above 1.0 (not measured).
- **Ditto vs IMTalker.** IMTalker's 42 FPS has no published streaming mode or first-frame delay, so Ditto is the only one proven to stream.
- **No GPU.** LAM's on-phone 110+ FPS is the only route that avoids a GPU server. However, it is a 3D Gaussian avatar driven by ARKit blendshapes, which is less photoreal than a warped photo, and FLAME licensing needs checking.

### Gaps
- No CPU fps numbers for Ditto, IMTalker or KDTalker.
- No first-frame delay for anything but Ditto.
- No T4 or free-tier GPU measurements.
- No long-video drift numbers.
- No fps read for GaussianTalker or TalkingGaussian.

## Q4. Hindi / Hinglish lip sync (are the audio encoders language-agnostic?)

### Takeaway
None of these models has a published Hindi evaluation. All are driven by self-supervised speech encoders (HuBERT, wav2vec2, Whisper), which work from sound rather than words, so they should transfer across languages. Encoders trained mostly on English (wav2vec2-base-960h, LibriSpeech HuBERT) are the weakest bet. Whisper (MuseTalk, LatentSync) is multilingual.

### Cited Findings
- **Ditto:** uses HuBERT (`hubert.onnx`, `hubert_streaming_fix_kv.onnx`); which HuBERT checkpoint is unverified (issue #97). — [HF API](https://huggingface.co/api/models/digital-avatar/ditto-talkinghead), [#97](https://github.com/antgroup/ditto-talkinghead/issues/97)
- **JoyVASA:** supports wav2vec2-base-960h and chinese-hubert-base, and claims "robust multilingual support through a hybrid dataset" (Chinese plus English). — [JoyVASA README](https://raw.githubusercontent.com/jdh-algo/JoyVASA/main/README.md), [JoyVASA arXiv](https://arxiv.org/html/2411.09209)
- **ER-NeRF:** "In our test, HuBERT extractor performs better for more languages". TalkingGaussian recommends HuBERT "if the audio is not in English". — [ER-NeRF README](https://raw.githubusercontent.com/Fictionarry/ER-NeRF/main/README.md), [TalkingGaussian README](https://raw.githubusercontent.com/Fictionarry/TalkingGaussian/main/README.md)
- **English-only encoders:** FLOAT, AniPortrait, IMTalker and LAM_A2E use wav2vec2-base-960h (or wav2vec). FLOAT adds an *English* speech-emotion encoder. — [FLOAT README](https://raw.githubusercontent.com/deepbrainai-research/float/main/README.md), [IMTalker README](https://raw.githubusercontent.com/cbsjtu01/IMTalker/main/README.md)
- **Whisper-based dubbing models:** MuseTalk uses frozen whisper-tiny; LatentSync uses Whisper. LatentSync 1.5 specifically "improves performance on Chinese videos", which shows that training data per language matters. A LatentSync issue asks about fine-tuning on one language (#247, 2025-05). — [MuseTalk README](https://raw.githubusercontent.com/TMElyralab/MuseTalk/main/README.md), [LatentSync README](https://raw.githubusercontent.com/bytedance/LatentSync/main/README.md), [#247](https://github.com/bytedance/LatentSync/issues/247)
- GitHub issue search for "hindi" in the Ditto and MuseTalk repos returned no issues. — [GitHub search](https://github.com/antgroup/ditto-talkinghead/issues?q=hindi)

### Inferences
- Hindi bilabials (प/ब/म) and retroflexes come down to mouth shapes that sound-level encoders capture. Expect lip sync to work but to be weaker on fast Hinglish.
- Test with our own clips by measuring Sync-C on Hindi sentences.
- If it is weak, fine-tune the audio-to-motion part (Ditto has released training code on its `train` branch, 2025-11-12) on Indian speech, under the TRAINING.md rules.

### Gaps
- No Hindi or Indic demo or metric was found for any model.
- The exact HuBERT checkpoint in Ditto is unknown.

## Q5. ONNX / TensorRT / CoreML / WebGPU / ONNX Runtime Web ports

### Takeaway
ONNX and TensorRT are well covered: Ditto ships both (Ampere+), and FasterLivePortrait ships both. The awkward part is the 5D `grid_sample` warp. It needs a custom TensorRT plugin and a custom onnxruntime-gpu build, which also makes a browser (WebGPU/ORT-Web) port hard. No browser port with measured fps was found.

### Cited Findings
- Ditto ships `ditto_onnx/*` with `libgrid_sample_3d_plugin.so`, `ditto_trt_Ampere_Plus/*` fp16/fp32 engines, and a PyTorch path (added 2025-07-11). Issue #8 asks "How to convert warp network". — [HF API](https://huggingface.co/api/models/digital-avatar/ditto-talkinghead), [Ditto README](https://raw.githubusercontent.com/antgroup/ditto-talkinghead/main/README.md), [#8](https://github.com/antgroup/ditto-talkinghead/issues/8)
- FasterLivePortrait offers TensorRT (recommended), onnxruntime-gpu (custom 1.17 branch with grid_sample CUDA), onnxruntime-cpu ("extremely slow"), Docker, and Windows one-click scripts. — [FasterLivePortrait README](https://raw.githubusercontent.com/warmshao/FasterLivePortrait/master/README.md)
- KDTalker's HF repo ships LivePortrait ONNX and `.trt` files. — [HF API](https://huggingface.co/api/models/ChaolongYang/KDTalker)
- Community project helloprototype/ditto-ai-avatar (3 stars) offers "Real-time AI avatar system with WebSocket-based video streaming and lip-sync generation using Ditto TalkingHead". Its quality and licence were not checked. — [GitHub](https://github.com/helloprototype/ditto-ai-avatar)
- LAM renders on a phone (110+ FPS on a Xiaomi 14), which points to a WebGL or native Gaussian renderer. — [LAM README](https://raw.githubusercontent.com/aigc3d/LAM/main/README.md)

### Inferences
- A WebGPU port of Ditto or LivePortrait would need a WGSL 3D grid_sample kernel. It is feasible but no one has published one with measurements. Server-side TensorRT is the realistic path.

### Gaps
- No CoreML, WebGPU or ORT-Web port with measured fps was found for any warp-based model.

## Q6. Known failure cases

### Takeaway
Warp-based (LivePortrait-family) models, which include Ditto, JoyVASA and KDTalker, have documented trouble with large head poses, occlusions and identity drift. JoyVASA's quality is capped by its LivePortrait first stage. Specific evidence on glasses, beards, teeth and hands was not found in primary sources.

### Cited Findings
- IMTalker, on warp-based methods: they "struggle to handle large head poses, occlusions, and non-rigid articulations, often producing stretching, tearing, or identity drift". — [IMTalker arXiv HTML](https://arxiv.org/html/2511.22167)
- JoyVASA: "One limitation of this work lies in the upper bound of the generated content, which is constrained by the performance of the first-stage model, including the appearance…" (LivePortrait). — [JoyVASA arXiv HTML](https://arxiv.org/html/2411.09209)
- Ditto ablation: without the emotion condition, Sync-C falls to 6.31 and FID rises to 23.0; without adaptive loss weights, Sync-C falls to 0.289 (sync collapses). — [Ditto arXiv HTML](https://arxiv.org/html/2411.19509)
- LatentSync 1.5 had blurry teeth and lips ("Many people have reported that the teeth and lips generated by LatentSync 1.5 are blurry"), which is why 1.6 was trained at 512². — [HF card 1.6](https://huggingface.co/ByteDance/LatentSync-1.6/raw/main/README.md)
- MuseTalk's teeth are rated in FLOAT's MOS only for other models (SadTalker teeth clarity 1.53 out of 5, EDTalk 1.17). — [FLOAT arXiv HTML](https://arxiv.org/html/2412.01064)
- Ditto's first-frame crop picks only the largest InsightFace box (`boxes[0]`); `return None` if no face is found. A side face that fails detection gives no output. — [source2info.py](https://raw.githubusercontent.com/antgroup/ditto-talkinghead/main/core/atomic_components/source2info.py)

### Inferences
- For a teacher avatar, ask for a frontal, well-lit photo with the mouth closed or slightly open. Keep head-motion amplitude moderate to stay inside the warp model's reliable range.
- Hidden teeth in the source photo will be hallucinated by the warp or decoder. A frontal photo with slightly visible teeth is safer.

### Gaps
- No primary-source reports were found on glasses, beards, hands near the face or long-video drift for Ditto or IMTalker, since GitHub issue bodies were not readable here.
