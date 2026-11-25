# Photo pre-processing, safety/law and automatic quality gates for "any photo → photoreal talking avatar"

Researched 2026-11-25. Licence texts were downloaded from each project's own GitHub `LICENSE` file (raw.githubusercontent.com) or read from the Hugging Face API / model card front matter. Some hosts were blocked in this session (ai.google.dev, medianama.com), so a few items rely on mirrors and are marked. "NC" means non-commercial.

A rule that applies everywhere below: **a model has two licences, one for the code and one for the weights, and the weights also carry the terms of their training data.** Several "MIT" repos ship weights trained on non-commercial datasets (CelebAMask-HQ, FFHQ, WebFace260M, VGGFace2, Places365). Where a repo says nothing separate about its weights, these notes say so and do not assume the weights are clean.

---

## 1. Face detection, landmarks and parsing (commercial-OK?)

### Takeaway
MediaPipe (code Apache-2.0; model cards state Apache-2.0), OpenCV-zoo YuNet (MIT) and the biubug6 PyTorch RetinaFace code (MIT) are usable commercially. InsightFace's own weights (SCRFD, RetinaFace-R50, buffalo_l) are research-only, and since Nov 2025 InsightFace asks people to contact it for a licence. BiSeNet face parsing and SegFace have MIT code, but their weights are trained on CelebAMask-HQ, which is research-only (unverified, see Gaps). So BiSeNet and SegFace are a licence risk.

### Cited Findings
- **MediaPipe framework**: the repo `LICENSE` is the Apache License 2.0. [mediapipe LICENSE](https://raw.githubusercontent.com/google-ai-edge/mediapipe/master/LICENSE)
- **MediaPipe docs pages** carry the footer "licensed under the Creative Commons Attribution 4.0 License" (for page content) and "Apache 2.0 License" (for code samples). This CC BY 4.0 line covers the documentation text, not the models. [Image segmentation guide](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter)
- **Multi-class selfie segmenter** (`SelfieMulticlass 256x256`): its categories are "0 background 1 hair 2 body-skin 3 face-skin 4 clothes 5 others (accessories)". [Image segmentation guide](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter). Its Hugging Face mirror (`litert-community`, linked from Google's docs page as the download) is tagged `license: apache-2.0`. [HF card](https://huggingface.co/litert-community/MediaPipe-ImageSegmenter-Selfie-Multiclass). The `selfie_segmenter` (square/landscape) mirror is tagged `apache-2.0` too. [HF card](https://huggingface.co/litert-community/MediaPipe-ImageSegmenter-Selfie-Square)
- **MediaPipe Face Landmarker** mirror card: "License: `apache-2.0` — Stated as Apache License, Version 2.0 in the bundled upstream Google model-card PDFs." [HF card](https://huggingface.co/litert-community/MediaPipe-FaceLandmarker). The older ML Kit selfie model card also states Apache 2.0, per search results. [ML Kit selfie segmentation](https://developers.google.com/ml-kit/vision/selfie-segmentation)
- **YuNet** (OpenCV Zoo) `LICENSE`: "MIT License Copyright (c) 2020 Shiqi Yu". [opencv_zoo YuNet LICENSE](https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_detection_yunet/LICENSE). The LiteRT mirror says BSD-3-Clause (libfacedetection upstream). [HF card](https://huggingface.co/litert-community/YuNet-Face-LiteRT). The two sources differ, but both licences are permissive.
- **InsightFace** README, verbatim: "The code of InsightFace is released under the MIT License. There is no limitation for both academic and commercial usage. The training data containing the annotation (and the models trained with these data) are available for non-commercial research purposes only. Both manual-downloading models from our github repo and auto-downloading models with our python-library follow the above license policy(which is for non-commercial research purposes only)." Update dated 2025-11-24: "For open-sourced face recognition models (e.g., buffalo_l package), please contact recognition-oss-pack@insightface.ai for licensing." [insightface README](https://raw.githubusercontent.com/deepinsight/insightface/master/README.md). This covers the SCRFD and RetinaFace weights that InsightFace distributes.
- **Pytorch_Retinaface** (biubug6, the one facexlib/GFPGAN use): `LICENSE.MIT` is the MIT License. [LICENSE.MIT](https://raw.githubusercontent.com/biubug6/Pytorch_Retinaface/master/LICENSE.MIT). It is trained on WIDER FACE (dataset terms not checked here).
- **face-parsing.PyTorch (BiSeNet)** `LICENSE`: "MIT License Copyright (c) 2019 zll". [LICENSE](https://raw.githubusercontent.com/zllrunning/face-parsing.PyTorch/master/LICENSE). Its LiteRT mirror says "MIT (BiSeNet / zllrunning/face-parsing.PyTorch). CelebAMask-HQ label taxonomy" and segments a face into the "19 CelebAMask-HQ" classes. [HF card](https://huggingface.co/litert-community/BiSeNet-Face-Parsing-LiteRT)
- **SegFace**: code MIT ("MIT License Copyright (c) 2024 Kartik Narayan"). [LICENSE](https://raw.githubusercontent.com/Kartik-3004/SegFace/main/LICENSE). Weights on HF are tagged `mit` but are trained on CelebAMask-HQ, LaPa and Helen (`convnext_celeba_512`, `swinb_lapa_512`, `swinb_helen_512`). [SegFace README](https://raw.githubusercontent.com/Kartik-3004/SegFace/main/README.md), [HF](https://huggingface.co/kartiknarayan/SegFace)
- **dlib 68-point landmarks** (`shape_predictor_68_face_landmarks.dat`), verbatim: "The license for this dataset excludes commercial use and Stefanos Zafeiriou, one of the creators of the dataset, asked me to include a note here saying that the trained model therefore can't be used in a commercial product." [dlib-models README](https://raw.githubusercontent.com/davisking/dlib-models/master/README.md)

### Inferences
- The safest stack for detection, landmarks and parsing is MediaPipe Face Detector/Landmarker (478 points) plus the MediaPipe multiclass segmenter. The segmenter gives hair, face-skin, body-skin, clothes and "others (accessories)", which is a coarse face-parsing substitute. Its "others" class is a natural first detector for stickers, sunglasses and hats. YuNet is a permissive fallback detector, and its multi-face output can drive "group photo → pick one face".
- Do not ship InsightFace models (SCRFD, buffalo_l, antelopev2). This matters because many talking-head repos (LivePortrait, see §5) pull them in by default.

### Gaps
- I could not open Google's original model-card PDFs (ai.google.dev was blocked in this session). The Apache-2.0 claim comes from Google's HF mirrors plus the mirror card's statement about the PDFs. Before release, open the PDFs from the developers.google.com pages (links under "Model card").
- CelebAMask-HQ terms (believed "non-commercial research and educational purposes only") were not fetched. **Unverified**: treat BiSeNet/SegFace weights as NC until checked.

---

## 2. Background removal and matting

### Takeaway
BiRefNet (MIT, code and weights, including the HR-matting variant), U²-Net (Apache-2.0) and MODNet (Apache-2.0 code) are commercial-OK. BRIA RMBG-1.4 and 2.0 are non-commercial. RobustVideoMatting is GPL-3.0. That is not NC, but its copyleft applies if you distribute it, and it is a video matting model anyway.

### Cited Findings
- **BiRefNet**: `LICENSE` "MIT License Copyright (c) 2024 ZhengPeng". [LICENSE](https://raw.githubusercontent.com/ZhengPeng7/BiRefNet/main/LICENSE). HF weights tagged `license: mit`. [HF BiRefNet](https://huggingface.co/ZhengPeng7/BiRefNet). `ZhengPeng7/BiRefNet_HR-matting` is tagged `mit`. [HF API](https://huggingface.co/api/models/ZhengPeng7/BiRefNet_HR-matting)
- **RMBG-1.4**: `license: other`, `license_name: bria-rmbg-1.4`. The gate text reads "RMBG v1.4 is available as a source-available model for non-commercial use". [HF card](https://huggingface.co/briaai/RMBG-1.4)
- **RMBG-2.0**: `license_name: bria-rmbg-2.0`, `license_link: https://creativecommons.org/licenses/by-nc/4.0/deed.en` (CC BY-NC 4.0). [HF API](https://huggingface.co/api/models/briaai/RMBG-2.0)
- IC-Light's README warns: "the original BRIA RMBG 1.4 is for non-commercial use. If you use IC-Light in commercial projects, replace it with other background replacer like BiRefNet." [IC-Light README](https://raw.githubusercontent.com/lllyasviel/IC-Light/main/README.md)
- **MODNet**: `LICENSE` is the Apache License 2.0. [LICENSE](https://raw.githubusercontent.com/ZHKKKe/MODNet/master/LICENSE)
- **RobustVideoMatting**: `LICENSE` is "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007". [LICENSE](https://raw.githubusercontent.com/PeterL1n/RobustVideoMatting/master/LICENSE)
- **U²-Net**: `LICENSE` is the Apache License 2.0. [LICENSE](https://raw.githubusercontent.com/xuebinqin/U-2-Net/master/LICENSE)
- **MediaPipe selfie segmenter**: Apache-2.0 (HF mirror tag); see §1.

### Inferences
- Use BiRefNet (or BiRefNet_HR-matting for soft hair edges) server-side for the clean head-and-shoulders cut-out. Use MediaPipe selfie segmentation in the browser for a live preview. Running GPL RVM only on our server is not "distribution" in the GPL-3 sense (it is not AGPL), but BiRefNet makes it unnecessary.

### Gaps
- MODNet's pretrained weights live on Google Drive, and the repo has no separate statement that they share the Apache licence. Unverified.

---

## 3. Face restoration and upscaling

### Takeaway
Real-ESRGAN (BSD-3), SwinIR (Apache-2.0), GFPGAN (Apache-2.0 with NC third-party parts), RestoreFormer++ (Apache-2.0) and DiffBIR (Apache-2.0 code) have permissive code. CodeFormer is S-Lab NC. 4x-UltraSharp is CC BY-NC-SA 4.0. GFPGAN needs care: its LICENSE bundles the NVIDIA StyleGAN2 licence ("non-commercially … research or evaluation purposes only") for the StyleGAN2 CUDA ops, and DFDNet-derived code under CC BY-NC-SA 4.0. The clean (no-CUDA) GFPGAN v1.3/1.4 architecture avoids the custom ops, but it was trained on FFHQ.

### Cited Findings
- **GFPGAN** `LICENSE`: "GFPGAN is licensed under the Apache License Version 2.0 except for the third-party components listed below." Third-party parts it lists: "StyleGAN2 … The official repository is https://github.com/NVlabs/stylegan2, and here is the NVIDIA license." and "DFDNet The codes are largely modified from the repository DFDNet. Their license is Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License." The NVIDIA licence text it includes says: "3.3 Use Limitation. The Work and any derivative works thereof only may be used or intended for use non-commercially. … As used herein, 'non-commercially' means for research or evaluation purposes only." It also lists facexlib (MIT) and basicsr (Apache 2.0) as dependencies. [GFPGAN LICENSE](https://raw.githubusercontent.com/TencentARC/GFPGAN/master/LICENSE)
- **facexlib** (GFPGAN's face detector and parser wrapper): "MIT License Copyright (c) 2020 Xintao Wang". [LICENSE](https://raw.githubusercontent.com/xinntao/facexlib/master/LICENSE)
- **CodeFormer** `LICENSE` (S-Lab License 1.0): "Redistribution and use for non-commercial purpose in source and binary forms … are permitted … In the event that redistribution and/or use for commercial purpose in source or binary forms, with or without modification is required, please contact the contributor(s) of the work." [LICENSE](https://raw.githubusercontent.com/sczhou/CodeFormer/master/LICENSE)
- **Real-ESRGAN**: "BSD 3-Clause License Copyright (c) 2021, Xintao Wang". Weights such as `RealESRGAN_x4plus.pth` are GitHub release assets of the same repo, with no separate weight licence. [LICENSE](https://raw.githubusercontent.com/xinntao/Real-ESRGAN/master/LICENSE), [README](https://raw.githubusercontent.com/xinntao/Real-ESRGAN/master/README.md)
- **SwinIR**: Apache License 2.0. [LICENSE](https://raw.githubusercontent.com/JingyunLiang/SwinIR/main/LICENSE)
- **RestoreFormer++**: Apache License 2.0. [LICENSE](https://raw.githubusercontent.com/wzhouxiff/RestoreFormerPlusPlus/main/LICENSE)
- **DiffBIR**: Apache License 2.0 (code). [LICENSE](https://raw.githubusercontent.com/XPixelGroup/DiffBIR/main/LICENSE)
- **4x-UltraSharp** (community ESRGAN model): "License: CC BY-NC-SA 4.0". [HF card](https://huggingface.co/Kim2091/UltraSharp)

### Inferences
- Commercial-OK path: Real-ESRGAN x4plus for the whole image, with GFPGAN v1.4 (clean architecture) or RestoreFormer++ for the face, at low blend weight. Restorers *invent* detail and can drift identity, so the identity gate in §7 must run before and after restoration and reject a large drop.
- Community upscalers on OpenModelDB are licensed one by one, and many are NC. Whitelist each one.
- DiffBIR builds on Stable Diffusion weights (OpenRAIL family, use-restricted but commercial-OK). Unverified for its exact checkpoints.

### Gaps
- FFHQ's dataset licence (believed CC BY-NC-SA 4.0 from NVIDIA, with each image under its own Flickr licence) and how it binds GFPGAN, RestoreFormer++ or CodeFormer weights is not settled. **Unverified**; flag it for the owner.

---

## 4. Removing filters, stickers, sunglasses and hands; detecting beauty filters

### Takeaway
LaMa (Apache-2.0 code, with Big-LaMa weights mirrored as Apache-2.0) and FLUX.1-schnell (Apache-2.0) are commercial-OK inpainting engines. FLUX.1-Fill-dev is NC. SD-2 inpainting is OpenRAIL++ (commercial-OK with use restrictions, from memory). No licensed, off-the-shelf "beauty filter detector" was found. Detection has to be built from signals (see Inferences).

### Cited Findings
- **LaMa** `LICENSE`: Apache License 2.0. [LICENSE](https://raw.githubusercontent.com/advimman/lama/main/LICENSE). The official README downloads weights from `https://huggingface.co/smartywu/big-lama/resolve/main/big-lama.zip` [README](https://raw.githubusercontent.com/advimman/lama/main/README.md), and that HF repo is tagged `apache-2.0`. [HF API](https://huggingface.co/api/models/smartywu/big-lama). Big-LaMa was trained on Places365-Challenge (README).
- **FLUX.1-Fill-dev**: `license_name: flux-1-dev-non-commercial-license`. [HF API](https://huggingface.co/api/models/black-forest-labs/FLUX.1-Fill-dev)
- **FLUX.1-schnell**: `license: apache-2.0`. [HF API](https://huggingface.co/api/models/black-forest-labs/FLUX.1-schnell)
- **IDM-VTON** (sometimes suggested for clothes): `cc-by-nc-sa-4.0`, so NC. [HF API](https://huggingface.co/api/models/yisol/IDM-VTON)

### Inferences
- **Small occluders** (heart stickers, text, small hands at the edge): MediaPipe multiclass "others" mask, dilated, then LaMa. LaMa is good at texture but weak at faces. **Large occluders over eyes or mouth** (sunglasses, hand over mouth): inpainting would invent the person's eyes or mouth, which is an identity risk and arguably makes a "different person". The honest choice is to **ask for another photo** rather than hallucinate. If it is attempted, use FLUX.1-schnell or SD inpainting with an identity check (§7) and show the result to the user for approval.
- **Beauty-filter / AR detection signals** (none found as a ready licensed model): (a) skin-texture energy: a low high-frequency (Laplacian or wavelet) variance on the MediaPipe face-skin mask compared with the hair and background, which catches skin smoothing; (b) a landmark geometry outlier: eye size or jaw width ratios outside human norms (warp filters); (c) a large "others" or accessory mask over the face, or saturated pure colours (stickers); (d) EXIF/XMP: Snapchat and Instagram exports often drop camera EXIF. A missing make/model is a weak signal only. All of these are heuristics and need calibration on the owner's sample photos.
- Removing smoothing cannot restore real pores. The output stays "filtered-looking", and a restorer (§3) adds invented texture. Best practice is to say so in the UI and ask for an unfiltered photo when the filter score is high.

### Gaps
- SD-2-inpainting's licence could not be read (the card needs a login). It is OpenRAIL++ per general knowledge. Unverified.
- Places365's licence terms for trained-model commercial use were not checked.
- No published, licence-clear beauty-filter detector was found.

---

## 5. Pose and expression normalisation, outpainting

### Takeaway
LivePortrait's code and weights are MIT, and it offers eye, lip and head retargeting, so it can open closed eyes, reduce a smile and turn a head a little. But its default pipeline uses InsightFace detection/landmark models (NC), which must be swapped for MediaPipe. For outpainting a tight selfie to head-and-shoulders, FLUX.1-schnell (Apache-2.0) or SD inpainting can work. Expect invented clothing, so it needs user approval.

### Cited Findings
- **LivePortrait** `LICENSE`: "MIT License Copyright (c) 2024 Kuaishou Visual Generation and Interaction Center". [LICENSE](https://raw.githubusercontent.com/KwaiVGI/LivePortrait/main/LICENSE). HF weights `license: mit`, title "LivePortrait: Efficient Portrait Animation with Stitching and Retargeting Control". The weights tree includes an `insightface` folder, and the card thanks the InsightFace repositories. [HF card](https://huggingface.co/KwaiVGI/LivePortrait)
- InsightFace models are "for non-commercial research purposes only" (see §1). [insightface README](https://raw.githubusercontent.com/deepinsight/insightface/master/README.md)
- **IC-Light** code is Apache-2.0 [LICENSE](https://raw.githubusercontent.com/lllyasviel/IC-Light/main/LICENSE). The README says RMBG-1.4 must be replaced for commercial use (§2).

### Inferences
- Frontalising a strongly turned head (more than about 30°) from one photo means inventing the hidden half of the face. Reject the photo and ask for a front photo instead. Use LivePortrait retargeting only for small fixes (eyes open, mouth closed and neutral, yaw/pitch under about 15°).

### Gaps
- No commercial-OK, identity-preserving single-photo frontaliser that is clearly better than LivePortrait was found within this budget.

---

## 6. Relighting and colour normalisation for low light

### Takeaway
IC-Light's code is Apache-2.0. Its weights derive from SD1.5, so the OpenRAIL-M family applies (unverified). Classical methods (gray-world or white-patch white balance, CLAHE on the L channel, gamma) carry no licence issue, and the IT Rules FAQ explicitly treats "colour adjustment" and "increasing brightness/contrast" as **not** synthetic content.

### Cited Findings
- IC-Light `LICENSE`: Apache License 2.0. [LICENSE](https://raw.githubusercontent.com/lllyasviel/IC-Light/main/LICENSE)
- MeitY FAQ: not SGI are "Routine or good-faith actions such as editing, formatting, enhancement, technical correction, colour adjustment, noise reduction … provided such actions do not materially alter, distort, or misrepresent". Its examples include "increasing brightness/contrast or sharpening a photo without changing what it depicts" and "correcting colour balance". [MeitY FAQ, 10 Feb 2026](https://www.meity.gov.in/static/uploads/2025/10/065b6deb585441b5ccdf8be42502a49c.pdf)

### Inferences
- For all skin tones, avoid automatic "skin brightening". Normalise exposure and white balance only, and check that the mean face-skin colour (Lab) moves less than a small ΔE from the input, so darker skin is not lightened.

### Gaps
- The IC-Light weight licence was not shown on HF (the API returned none). Unverified.

---

## 7. Identity similarity, lip-sync and other automatic quality gates without InsightFace/ArcFace NC weights

### Takeaway
The cleanest commercial-OK face embedder found is **dlib's `dlib_face_recognition_resnet_model_v1`**, which the author released to the public domain. Next is **OpenCV-zoo SFace** (Apache-2.0 per the zoo). facenet-pytorch (MIT code, MIT Sandberg weights) is trained on VGGFace2 / CASIA-WebFace, which is a dataset-terms risk. EdgeFace weights are CC BY-NC-SA 4.0 (NC). AdaFace's code is MIT, but its weights come with no stated licence and are trained on MS1M/WebFace, so they are a risk. For lip-sync, the original **SyncNet (`syncnet_python`) is MIT**. LatentSync's code is Apache-2.0 and its checkpoints are OpenRAIL++.

### Cited Findings
- **dlib models** README: "As far as I am concerned, anyone can do whatever they want with these model files as I've released them into the public domain." `dlib_face_recognition_resnet_model_v1` was "trained from scratch on a dataset of about 3 million faces … face scrub … VGG dataset … and then a large number of images I scraped from the internet". It scores "mean error of 0.993833" on LFW (as written; this is accuracy). [dlib-models README](https://raw.githubusercontent.com/davisking/dlib-models/master/README.md)
- **OpenCV SFace**: "All files in this directory are licensed under Apache 2.0 License." [SFace README](https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_recognition_sface/README.md), [LICENSE](https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_recognition_sface/LICENSE)
- **facenet-pytorch**: code MIT ("Copyright (c) 2019 Timothy Esler") [LICENSE](https://raw.githubusercontent.com/timesler/facenet-pytorch/master/LICENSE.md). It is "pretrained on VGGFace2 and CASIA-Webface. Pytorch model weights were initialized using parameters ported from David Sandberg's tensorflow facenet repo" [README](https://raw.githubusercontent.com/timesler/facenet-pytorch/master/README.md), and the Sandberg repo is MIT [LICENSE](https://raw.githubusercontent.com/davidsandberg/facenet/master/LICENSE.md).
- **AdaFace**: code "MIT License Copyright (c) 2022 Minchul Kim" [LICENSE](https://raw.githubusercontent.com/mk-minchul/AdaFace/master/LICENSE). Weights are Google Drive links trained on CASIA-WebFace, VGGFace2, WebFace4M/12M and MS1MV2/V3 [README](https://raw.githubusercontent.com/mk-minchul/AdaFace/master/README.md). The CVLFace HF card shows no licence field [HF](https://huggingface.co/minchul/cvlface_adaface_ir101_webface12m).
- **EdgeFace**: code BSD-3-Clause (Idiap) [LICENSE](https://raw.githubusercontent.com/otroshi/edgeface/main/LICENSE). Weights: `EdgeFace-Base` `license: cc-by-nc-sa-4.0`, "trained on Webface260M" [HF](https://huggingface.co/Idiap/EdgeFace-Base), and `EdgeFace-S-GAMMA` is `cc-by-nc-sa-4.0` [HF API](https://huggingface.co/api/models/Idiap/EdgeFace-S-GAMMA).
- **InsightFace ArcFace / buffalo_l**: NC; contact them for licensing (see §1).
- **SyncNet** (`joonson/syncnet_python`): "Copyright (c) 2016-present Joon Son Chung. Permission is hereby granted, free of charge…" (MIT text). [LICENSE.md](https://raw.githubusercontent.com/joonson/syncnet_python/master/LICENSE.md)
- **LatentSync**: code Apache-2.0 [LICENSE](https://raw.githubusercontent.com/bytedance/LatentSync/main/LICENSE). Checkpoints `ByteDance/LatentSync-1.6` and `-1.5` are `license: openrail++` [HF 1.6](https://huggingface.co/ByteDance/LatentSync-1.6), [HF API 1.5](https://huggingface.co/api/models/ByteDance/LatentSync-1.5). StableSyncNet ships in that checkpoint repo, so OpenRAIL++ applies (inference).

### Inferences (proposed gate design; thresholds need calibration)
- **Identity**: embed the cleaned source image and N frames sampled from the video with dlib (128-d; same person if the distance is under 0.6, per the "radius 0.6" training design) and SFace (cosine). Fail if the median distance is over the threshold or any 1-second window drifts. Use two embedders, because dlib is weaker on non-Western and darker-skinned faces (bias is likely given its training data; unverified). Calibrate on Indian faces of all skin tones before trusting it.
- **Lip-sync**: SyncNet (MIT) gives the standard **LSE-C** (confidence, higher is better) and **LSE-D** (distance, lower is better) used in Wav2Lip-style papers. Gate on LSE-C above the value measured on real teacher footage.
- **Blink rate**: eye aspect ratio from MediaPipe landmarks. Real adults blink about 15–20 times a minute (general knowledge, unverified here). Flag 0 blinks in over 10 s, or a blink rate above about 40 a minute.
- **Jitter**: per-frame landmark RMS velocity after removing head pose (a high-pass filter on stabilised landmarks), plus background-pixel flicker inside the BiRefNet background mask. Flag spikes.
- **Frame quality**: no-reference sharpness (Laplacian variance) on the mouth/teeth crop, and MediaPipe face-detect confidence per frame (fails show melting faces).
- **FID/FVD**: standard metrics such as `pytorch-fid` and `clean-fid` exist, but FID/FVD compare *sets* of videos and are not meaningful for one video. Use them only to compare engine versions on a fixed test set.
- **Blind A/B**: render the same script with engines A and B. Raters see randomised left/right with no labels and pick "more natural / better lip sync / same person?". Log the choices in the DB and compute a win rate with a binomial confidence interval. Stop when the interval excludes 50%. It needs about 30 or more paired judgements per comparison for a clear result (general statistics; tune it).

### Gaps
- SFace's training set (believed MS1M-based, which has its own terms) is not stated in the zoo README. Unverified.
- VGGFace2's current dataset licence (the Oxford site withdrew distribution) was not confirmed.
- MiVOLO and other age models: see §8.

---

## 8. Safety and Indian law: DPDP Act 2023 + DPDP Rules 2025, IT Rules SGI amendments, consent flows, watermarking, age estimation

### Takeaway
(1) The **IT Amendment Rules 2026** were notified as G.S.R. 120(E) on 10 Feb 2026, in force from 20 Feb 2026. The draft's fixed 10% label size is gone. Instead, any intermediary offering an SGI-creation tool must (a) block unlawful SGI, including deceptive impersonation; (b) put a **prominent visible label** on visual SGI and a **prefixed audio disclosure** on audio; (c) embed **permanent metadata / provenance with a unique identifier** "to the extent technically feasible"; and (d) never offer "remove watermark" or "export without metadata". (2) **DPDP Rules 2025** were notified on 14 Nov 2025. Rule 10 requires verifiable parental consent for anyone under 18, applicable from about 13 May 2027 (secondary source). Excluding children (as the owner wants) needs a reliable age check, not just a tick box. (3) HeyGen and Synthesia both use a recorded **consent video** that is matched to the photo. (4) Commercial-OK provenance tools exist: Meta **Video Seal (MIT, models included)**, **invisible-watermark (MIT)** and **c2pa-rs / c2pa-python (MIT/Apache)**. (5) A public-domain (CC0) age estimator exists in dlib-models. MiVOLO v2 is CC BY-NC 4.0.

### Cited Findings — IT Rules (SGI)
- "notified the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Amendment Rules, 2026, vide Gazette notification number G.S.R. 120(E), dated 10th February, 2026, which shall come into force on 20th February, 2026." Gazette links given: https://egazette.gov.in/WriteReadData/2026/269993.pdf and https://www.meity.gov.in/static/uploads/2026/02/f55fe52418b03f58b0669f6a8bc03b6d.pdf. [MeitY FAQ](https://www.meity.gov.in/static/uploads/2025/10/065b6deb585441b5ccdf8be42502a49c.pdf) (the FAQ says "For legal compliance, the notified Rules may be referred to"; these notes quote the FAQ, not the gazette.)
- Definition, Rule 2(1)(wa): "'synthetically generated information' (SGI) means audio, visual or audio-visual information which is artificially or algorithmically created, generated, modified or altered using a computer resource, in a manner that such information appears to be real, authentic or true, and depicts or portrays any individual or event in a manner that is, or is likely to be perceived as indistinguishable from a natural person or a real-world event." [MeitY FAQ](https://www.meity.gov.in/static/uploads/2025/10/065b6deb585441b5ccdf8be42502a49c.pdf)
- Exclusion (b): "Routine or good-faith creation/preparation/formatting/design of documents, presentations, PDF files, educational/training materials … shall not be treated as SGI, so long as it does not result in creation of false documents or false electronic records." [MeitY FAQ](https://www.meity.gov.in/static/uploads/2025/10/065b6deb585441b5ccdf8be42502a49c.pdf)
- Coverage, Rule 3(3): it "applies where an intermediary offers a computer resource enabling or facilitating the creation, generation, modification, alteration, publication … of SGI", including "AI image/video generation or editing tools" and "voice synthesis / voice cloning tools". [MeitY FAQ](https://www.meity.gov.in/static/uploads/2025/10/065b6deb585441b5ccdf8be42502a49c.pdf)
- Prohibited, Rule 3(3)(a)(i): includes CSEAM, NCII and "SGI that falsely depicts/portrays a natural person or a real-world event by misrepresentation likely to deceive, including misrepresentation of identity, voice, conduct, action or statement". One example: "A deepfake video showing an ordinary individual (e.g., a teacher, student, private employee) making inflammatory/objectionable statements which they never made, circulated as genuine." [MeitY FAQ](https://www.meity.gov.in/static/uploads/2025/10/065b6deb585441b5ccdf8be42502a49c.pdf)
- Labelling, Rule 3(3)(a)(ii): SGI must be "clearly and prominently labelled / displayed with a label or notice identifying it as SGI; for visual/audiovisual content: label must ensure prominent visibility in the visual display; for audio content: there must be a prominently prefixed audio disclosure; and embedded with permanent metadata or technical provenance mechanisms, to the extent technically feasible, including a unique identifier, to enable identification of such information as SGI and identification of the computer resource used to create/modify/alter it." [MeitY FAQ](https://www.meity.gov.in/static/uploads/2025/10/065b6deb585441b5ccdf8be42502a49c.pdf)
- Anti-tampering, Rule 3(3)(b): "an intermediary must not enable the modification, suppression or removal of the SGI label and permanent metadata/provenance mechanisms and unique identifiers … The intermediary should not offer 'remove watermark', 'export without metadata', or similar functionalities." [MeitY FAQ](https://www.meity.gov.in/static/uploads/2025/10/065b6deb585441b5ccdf8be42502a49c.pdf)
- Takedown: removal "within 3 hours of receipt of such order/notice … reduced from 36 hours to 3 hours". [MeitY FAQ](https://www.meity.gov.in/static/uploads/2025/10/065b6deb585441b5ccdf8be42502a49c.pdf)
- SSMIs (over 5 million users) must, under new Rule 4(1A), "obtain a user declaration as to whether the content is SGI" before upload. [MeitY FAQ](https://www.meity.gov.in/static/uploads/2025/10/065b6deb585441b5ccdf8be42502a49c.pdf)
- The October 2025 draft's fixed 10% label size was dropped in the final rules in favour of "prominent" labels (secondary summary). [Rödl & Partner](https://www.roedl.it/en-gb/it/insights/pages/tech-data-bites/2-26/beyond-draft-indias-amended-it-rules-synthetically-generated-information.aspx), [Medianama Feb 2026 (blocked here; search snippet only)](https://www.medianama.com/2026/02/223-meity-amendments-it-rules-synthetic-media-deepfakes/)

### Cited Findings — DPDP
- "The Government of India notified the Digital Personal Data Protection (DPDP) Rules, 2025 on 14 November 2025." "When a child's personal data is involved, verifiable consent from a parent or guardian is required." [PIB explainer, 17 Nov 2025](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf)
- Rule 10(1), as reproduced on dpdpa.com (a third-party reproduction; check against the gazette): "A Data Fiduciary shall adopt appropriate technical and organisational measures to ensure that verifiable consent of the parent is obtained before the processing of any personal data of a child and shall observe due diligence, for checking that the individual identifying herself as the parent is an adult who is identifiable … by reference to— (a) reliable details of identity and age of the individual available with the Data Fiduciary; or (b) details of identity and age, voluntarily provided — (i) by the individual; or (ii) through a virtual token mapped to such details, which is issued by an authorised entity." "'adult' shall mean an individual who has completed the age of eighteen years"; an authorised entity "includes details of identity and age or token made available and verified by a Digital Locker Service Provider". [dpdpa.com Rule 10](https://www.dpdpa.com/dpdparules/rule10.html)
- The DSCI brief lists Rule 10 obligations as applying 18 months after publication (13 May 2027). [DSCI Insight Brief](https://www.dsci.in/files/content/knowledge-centre/2025/Insight-Brief-on-DPDP-Rules.pdf) (search snippet, not opened)
- A DSCI FAQ notes that processing is allowed for the fiduciary's due diligence "to confirm that the Data Principal is not a child". [DSCI FAQ](https://www.dsci.in/files/content/documents/2025/FAQs-on-Children-and-PwD-personal-data.pdf) (search snippet)

### Cited Findings — industry consent flows
- HeyGen: by default the API starts a webcam consent flow and returns a URL for the avatar subject. The consent video must be captured with the avatar footage, the person must match, and screen recordings of a consent statement are not accepted. [HeyGen avatar consent docs](https://developers.heygen.com/docs/avatar-consent), [HeyGen help: recording your consent video](https://help.heygen.com/en/articles/12092609-recording-your-consent-video). HeyGen's biometric notice says the verification compares biometric data from the submission against a separate verification recording, relying on explicit consent under GDPR Art. 9(2)(a). [HeyGen Biometric Privacy Notice](https://www.heygen.com/biometric-privacy-notice) (search-summary level; not opened)
- Synthesia Photo Avatars: the uploaded photo must match the person in a short consent video that includes a passcode. [Synthesia help: photo avatars content moderation](https://help.synthesia.io/en/articles/13846500-photo-avatars-content-moderation) (search-summary level)

### Cited Findings — watermarking and provenance
- **Meta Video Seal**: "MIT License Copyright (c) Meta Platforms, Inc." and "All models, training code, and evaluation tools released under MIT license"; "The model is licensed under an MIT license." [LICENSE](https://raw.githubusercontent.com/facebookresearch/videoseal/main/LICENSE), [README](https://raw.githubusercontent.com/facebookresearch/videoseal/main/README.md)
- **invisible-watermark** (imwatermark): "MIT License Copyright (c) 2021 ShieldMnt". [LICENSE](https://raw.githubusercontent.com/ShieldMnt/invisible-watermark/main/LICENSE)
- **C2PA SDKs**: c2pa-rs and c2pa-python ship `LICENSE-MIT` ("© Copyright 2020 Adobe") (dual MIT/Apache per the file naming; the Apache file was not opened). [c2pa-rs LICENSE-MIT](https://raw.githubusercontent.com/contentauth/c2pa-rs/main/LICENSE-MIT), [c2pa-python LICENSE-MIT](https://raw.githubusercontent.com/contentauth/c2pa-python/main/LICENSE-MIT)

### Cited Findings — age estimation
- dlib-models `dnn_age_predictor_v1`: "This age predictor model is provided for free by Cydral Technology and is licensed under the Creative Commons Zero v1.0 Universal." It is a ResNet-10 "trained using a private dataset of about 110k different labelled images". [dlib-models README](https://raw.githubusercontent.com/davisking/dlib-models/master/README.md)
- MiVOLO v2 weights: `cc-by-nc-4.0`, so NC. [HF API](https://huggingface.co/api/models/iitolstykh/mivolo_v2)
- Note: `Silent-Face-Anti-Spoofing-LiteRT` exists in litert-community (liveness), but its licence was not checked. [HF listing](https://huggingface.co/litert-community)

### Inferences
- **NexoraGuru is covered by Rule 3(3)** if members can make a talking avatar from a photo, since it offers "AI image/video generation" for SGI. The output is "realistic" by design, so the educational-materials exclusion probably does **not** cover the avatar video itself. Plan for all of these:
  1. A visible, persistent on-video label such as "AI-generated video (synthetic)", burned into the frames and also in the player UI. No size is fixed now, but it must be prominent. Keeping a 10%-style band is a safe over-compliance.
  2. A spoken prefix on audio-only exports ("This audio is synthetically generated").
  3. A C2PA manifest (c2pa-rs/python) with a unique ID, the generator name ("NexoraGuru"), the model and the time, plus an invisible Video Seal watermark carrying the same ID, because metadata gets stripped by WhatsApp and similar apps.
  4. No download without the label or watermark, and no "remove watermark" option.
  5. A 3-hour takedown path for reports (an Admin queue, plus a report button on every video).
- **Consent for a real person's face**: copy the HeyGen/Synthesia pattern. The person whose face it is records a short live webcam video in the browser, saying a random passcode and a fixed consent sentence (English/Hindi). The server checks (a) the passcode by speech recognition, (b) face match between the consent video and the photo (dlib/SFace, §7), and (c) basic liveness (blink or head turn, from MediaPipe landmarks). Store the consent record, not the raw biometrics, longer than needed. Delete it on withdrawal (DPDP rights; erasure requests within 90 days per the PIB explainer).
- **Children**: under DPDP "child" means under 18. To *exclude* children, (a) require the account holder to be 18+ by declaration plus an age estimate on the consent video. With dlib's CC0 age model, refuse if the estimate is under about 21 (a buffer for error), and route borderline cases to manual review or to DigiLocker-style age tokens later. (b) Refuse any photo where *any* detected face estimates under 18, including group photos. (c) Never use child photos even with consent, given the CSEAM-adjacent risk and Rule 3(3)(a)(i). The age estimator's accuracy on Indian faces must be measured before relying on it.
- **Biometric data**: the DPDP Act has no separate "sensitive / biometric" category (general knowledge; unverified here). Face templates are still personal data needing notice and consent. Keep embeddings ephemeral (computed for the gate, then discarded).
- **Impersonation**: allow only *one's own* face (consent video must match). Block celebrity or politician lookalikes, since Rule 3(3)(a)(i) bans deceptive impersonation. A simple control: a teacher avatar may only say lesson scripts generated by the site, never free text from users. That removes most deception risk.

### Gaps
- The gazette PDF of G.S.R. 120(E) itself was not opened. Exact rule wording should be checked there, not only in the FAQ.
- The official gazette text of DPDP Rule 10 (vs the dpdpa.com reproduction) and the exact commencement dates were not verified from the gazette.
- No separate MeitY "deepfake advisory" text was retrieved beyond the 2026 rules FAQ.
- The C2PA spec version (2.x) and how C2PA embeds in MP4 were not researched within this budget. The SynthID-Text licence was not checked (believed Apache-2.0; unverified), and it covers text only, not video.
- The accuracy and skin-tone bias of the dlib CC0 age model was not found.
