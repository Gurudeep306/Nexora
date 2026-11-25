# Face capture for Pratibimb: free, commercially usable photo-to-head methods (checked 2026-11-25)

How the checks were done: licences marked **[verified]** were read from the repository's own LICENSE or README file on raw.githubusercontent.com, or from Google's model card PDF, on 2026-11-25. **[search only]** means the claim came from a web search summary and the primary page could not be opened. huggingface.co, flame.is.tue.mpg.de and now.is.tue.mpg.de could not be reached from this session, and the GitHub API was blocked. **[unverified]** means I could not confirm it. Never ship anything marked [search only] or [unverified] until someone has read the primary page.

Current system (given): MakeHuman/MPFB2 CC0 mesh with 52 ARKit and 15 Oculus viseme shapes; MediaPipe 478 landmarks; a linear solve of about 222 MakeHuman face targets; photo skin projected through per-photo DLT cameras; SFace similarity at about 34% of the photo-vs-photo ceiling (target 95%).

## Q1. Which 3D face reconstruction methods can we use commercially, and how accurate are they?

### Takeaway
Almost every strong learned FLAME regressor (MICA, DECA, EMOCA, SPECTRE, Pixel3DMM, VHAP, GaussianAvatars, metrical-tracker, TRUST, PIXIE) is licensed for non-commercial use only, so none can ship. The commercial-OK route is: the **FLAME 2023 Open** model (CC-BY-4.0), plus MIT-licensed fitting code (photometric_optimization, flame-head-tracker's own code, SMIRK's code), driven by our own Apache-2.0 MediaPipe landmarks, multi-view silhouettes and parsing contours, fitted by optimisation rather than a learned regressor. The best NoW scores (TokenFace 0.76 mm, MICA 0.90, Pixel3DMM 0.87 median) all come from methods we cannot use or that have no public weights.

### Cited Findings
**FLAME model licence**
- FLAME 2023 Open is released under CC-BY-4.0. It allows sharing and adapting "for any purpose, including commercial use", but bans pornographic use. FLAME 2017, 2019, 2020 and the original 2023 model stay under the non-commercial licence, which also forbids using the model to train networks. [search only: summary of the official pages; primary page unreachable] — [FLAME model licence](https://flame.is.tue.mpg.de/modellicense.html), [FLAME home](https://flame.is.tue.mpg.de/)
- A Hugging Face thread reports that the MPI team confirmed FLAME 2023 Open is free for commercial use. This is second-hand. — [LAM-20K discussion](https://huggingface.co/3DAIGC/LAM-20K/discussions/2)
- The flame-fitting README says: "The FLAME model is under a Creative Commons Attribution license" and points to the model licence page. It fits FLAME to 3D landmarks and scans. Its LICENSE file was not found on main/master. [verified README] — [Rubikplayer/flame-fitting README](https://raw.githubusercontent.com/Rubikplayer/flame-fitting/master/README.md)
- FLAME-Universe says the FLAME model and related resources (landmark embeddings, segmentation masks, quad template mesh) are downloaded only after signing up at MPI-IS. — [FLAME-Universe README](https://raw.githubusercontent.com/TimoBolkart/FLAME-Universe/main/README.md)

**Fitting and regression code: licence of code and weights [verified unless marked]**

| Method | Code licence | Weights / dependency notes | Commercial? |
|---|---|---|---|
| photometric_optimization (PyTorch FLAME fitting) | MIT ([LICENSE](https://raw.githubusercontent.com/HavenFeng/photometric_optimization/master/LICENSE)) | needs FLAME (use 2023 Open). Default texture space unknown; check it | **Code yes**, if paired with FLAME 2023 Open and no NC albedo |
| flame-head-tracker | MIT, but "contains dependencies (such as FLAME, DECA, MICA, etc.) that are subject to their own license terms" ([LICENSE](https://raw.githubusercontent.com/PeizhiYan/flame-head-tracker/main/LICENSE)) | the DECA and MICA parts are NC | only after removing DECA/MICA |
| MICA | MPI "non-commercial scientific research purposes" ([LICENSE](https://raw.githubusercontent.com/Zielon/MICA/master/LICENSE)) | — | **No** |
| metrical-tracker | same MPI NC licence ([LICENSE](https://raw.githubusercontent.com/Zielon/metrical-tracker/master/LICENSE)) | — | **No** |
| DECA | MPI NC ([LICENSE](https://raw.githubusercontent.com/yfeng95/DECA/master/LICENSE)) | — | **No** |
| EMOCA | MPI NC ([LICENSE](https://raw.githubusercontent.com/radekd91/emoca/master/LICENSE)) | — | **No** |
| SMIRK | MIT ([LICENSE](https://raw.githubusercontent.com/georgeretsi/smirk/main/LICENSE)) | the setup downloads FLAME after registration; weights `SMIRK_em1.pt` from Google Drive with no separate licence. Trained on LRS3, MEAD, CelebA and FFHQ256 ([README](https://raw.githubusercontent.com/georgeretsi/smirk/main/readme.md)). CelebA and FFHQ are usually non-commercial datasets [unverified here] | Code yes; **weights unclear**, so treat as No |
| SPECTRE | CC BY-NC-SA 4.0 ([LICENSE](https://raw.githubusercontent.com/filby89/spectre/master/LICENSE)) | — | **No** |
| Pixel3DMM | CC BY-NC 4.0 ([LICENSE](https://raw.githubusercontent.com/SimonGiebenhain/pixel3dmm/master/LICENSE)) | — | **No** |
| VHAP (multi-view FLAME tracking) | CC BY-NC-SA 4.0 ([LICENSE](https://raw.githubusercontent.com/ShenhanQian/VHAP/main/LICENSE)) | — | **No** |
| GaussianAvatars | CC BY-NC-SA 4.0 ([LICENSE.md](https://raw.githubusercontent.com/ShenhanQian/GaussianAvatars/main/LICENSE.md)) | — | **No** |
| TRUST (albedo) | MPI NC ([LICENSE](https://raw.githubusercontent.com/HavenFeng/TRUST/main/LICENSE)) | — | **No** |
| PIXIE (body + face) | MPI NC ([LICENSE](https://raw.githubusercontent.com/yfeng95/PIXIE/master/LICENSE)) | — | **No** |
| 3DDFA_V2 | MIT ([LICENSE](https://raw.githubusercontent.com/cleardusk/3DDFA_V2/master/LICENSE)) | regresses BFM-based 3DMM parameters. The Basel Face Model is non-commercial [unverified here] | Code yes; **model basis likely No** |
| Deep3DFaceRecon_pytorch | MIT ([LICENSE](https://raw.githubusercontent.com/sicxu/Deep3DFaceRecon_pytorch/master/LICENSE)) | needs BFM09 (obtained from Basel by request) and uses insightface ArcFace for its training loss ([README](https://raw.githubusercontent.com/sicxu/Deep3DFaceRecon_pytorch/master/README.md)). insightface models are non-commercial (see Q4) | **No** in practice |
| HRN | Apache-2.0 ([LICENSE](https://raw.githubusercontent.com/youngLBW/HRN/main/LICENSE)) | assets and pretrained models come from a separate assets README; based on the BFM/3DDFA lineage [unverified] | Code yes; **weights unverified** |
| Microsoft Dense Landmarks (703 points) | no code or weights linked on the project page ([project page](https://microsoft.github.io/DenseLandmarks/)) | trained on Face Synthetics, which is under the Research Use of Data Agreement ([LICENSE.txt](https://raw.githubusercontent.com/microsoft/FaceSynthetics/main/LICENSE.txt)) | **No model to use** |
| TokenFace, FlowFace, RealDenseFace | — | no public code or licence found | **Unknown** |

**Accuracy**
- The NoW non-metrical table, as reproduced in RealDenseFace (arXiv 2608.09238), gives median / mean / std in mm: SHeaP 0.95/1.18/0.99; MICA 0.90/1.11/0.92; TokenFace 0.76/0.95/0.82; FlowFace 0.87/1.07/0.88; Pixel3DMM 0.87/1.07/0.89; RealDenseFace 0.82/1.02/0.84. — [RealDenseFace HTML](https://arxiv.org/html/2608.09238)
- The official non-metrical leaderboard (last updated 27.10.2025, per search snippet) also puts TokenFace first at 0.76 median. [search only] — [NoW non-metrical](https://now.is.tue.mpg.de/nonmetricalevaluation.html)
- On the metrical leaderboard (updated 26.08.2022): TokenFace 0.97 median, MICA 1.08. [search only] — [NoW metrical](https://now.is.tuebingen.mpg.de/metricalevaluation.html)
- RealDenseFace fits FLAME by Gauss-Newton to dense UV-space correspondence and relative-depth maps. Its online tracker runs at 80+ FPS, and offline fitting is more than 20 times faster than earlier optimisation baselines. — [arXiv 2608.09238 abstract](https://arxiv.org/abs/2608.09238)
- Microsoft Dense Landmarks fits a 3DMM to 703 probabilistic landmarks (each with a certainty σ) at "over 150FPS on a single CPU thread". It shows that dense landmarks alone, without differentiable rendering, reach state-of-the-art monocular accuracy, and that they combine well across views. — [project page](https://microsoft.github.io/DenseLandmarks/)

**Speed on CPU**
- 3DDFA_V2 regresses 3DMM parameters in about 1.35 ms per image on CPU with onnxruntime. Face detection dominates, at about 15 ms for a 720p image. — [3DDFA_V2 README](https://raw.githubusercontent.com/cleardusk/3DDFA_V2/master/readme.md)

**Landmarks and parsing (commercial-OK)**
- MediaPipe Face Mesh V2 outputs 478 3D landmarks and is "LICENSED UNDER Apache License, Version 2.0" (model card dated September 15, 2022). It was evaluated across 17 geographic subregions: tracking-mode error ranges from 2.06% to 3.27% IOD MAE. [verified PDF] — [Face Mesh V2 model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf)
- The MediaPipe multiclass selfie segmenter labels background, hair, body-skin, face-skin, clothes and others, and is Apache-2.0. Its card says it is "not intended for ... applications that require pixel perfect masks". [verified PDF] — [Multiclass segmentation model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf)
- face-parsing.PyTorch (BiSeNet) has MIT code, but it is trained on CelebAMask-HQ ([README](https://raw.githubusercontent.com/zllrunning/face-parsing.PyTorch/master/README.md)). facer (FaRL parsers `farl/lapa/448`, `farl/celebm/448`) also has MIT code ([LICENSE](https://raw.githubusercontent.com/FacePerceiver/facer/main/LICENSE), [README](https://raw.githubusercontent.com/FacePerceiver/facer/main/README.md)), but its weights are trained on LaPa or CelebAMask-HQ. The jonathandinu/face-parsing card lists the dataset `celebamaskhq` and no licence field (HF API). I did not read the CelebAMask-HQ or LaPa licences here; CelebAMask-HQ is generally described as non-commercial [unverified]. hhj1897/face_parsing is MIT ([LICENSE](https://raw.githubusercontent.com/hhj1897/face_parsing/master/LICENSE)); its weights and data were not checked.
- Meta Sapiens (segmentation and normals) is CC-BY-NC-4.0 for code ([LICENSE](https://raw.githubusercontent.com/facebookresearch/sapiens/main/LICENSE)) and weights (HF API card `facebook/sapiens-seg-1b`). **No.**
- dlib is under the Boost Software License ([LICENSE.txt](https://raw.githubusercontent.com/davisking/dlib/master/LICENSE.txt)). Its 68-point predictor was trained on iBUG 300-W, which is commonly said to bar commercial use [unverified].

### Inferences
- **Recommended 3D step.** Switch the face's shape space from the ~222 MakeHuman targets to **FLAME 2023 Open** (300 shape and 100 expression components, which are smooth and statistically meaningful), and fit it by optimisation with no NC network:
  1. Collect per photo: the 478 MediaPipe landmarks, mapped to FLAME vertices through a hand-built barycentric correspondence (MediaPipe's canonical mesh to FLAME, made once by non-rigid ICP on the neutral meshes), plus the multiclass face-skin/hair mask outline, which gives the jaw, chin and cheek silhouette.
  2. Optimise one shared shape β, plus a camera and expression ψ for each photo, minimising: landmark reprojection error weighted by visibility; a silhouette term (a Chamfer distance between the projected mesh contour and the mask boundary, including the ears where they are visible); and a shape prior ‖β‖².
  3. Code bases to start from: the MIT photometric_optimization or the MIT core of flame-head-tracker, with DECA and MICA removed. Multi-view fitting matters most, because a single photo leaves depth (nose length, jaw depth) unresolved. Microsoft's paper shows that dense landmarks from several views are enough.
- **Moving the FLAME fit to MakeHuman.** Build a fixed FLAME→MPFB correspondence once (non-rigid ICP of the neutral FLAME head onto the MPFB head region, saved as barycentric weights). Then either (a) carry each fitted FLAME vertex offset onto the MPFB face and re-solve the 222 targets to it, keeping the ARKit and viseme shapes as deltas, or (b) use FLAME's head directly and transfer the 52 ARKit and 15 viseme shapes from MPFB through the same correspondence (deformation transfer). Option (b) keeps FLAME's statistically valid identity space; option (a) keeps the current rig. Either way the body stays MakeHuman (CC0).
- The 34% likeness ceiling is most likely from shape (the jaw, nose depth, eye shape) and texture (filters, lighting) rather than solver noise. The silhouette and contour terms plus delit texture (Q2) are probably the biggest levers. This is an inference, not measured.
- Do not train our own regressor on FLAME-fit pseudo-labels of CelebA or FFHQ images: those datasets' terms (and the NC FLAME versions' "no training" clause) would contaminate the result.

### Gaps
- I could not open the full FLAME 2023 Open licence text, so the attribution wording and whether the landmark embeddings and masks are also CC-BY are unconfirmed. Read [modellicense.html](https://flame.is.tue.mpg.de/modellicense.html) before switching.
- No NoW entries were found for SMIRK, HRN or 3DDFA_V2. The full official leaderboard could not be fetched.
- No commercially licensed dense-landmark model (more than 478 points) was found.
- The weights licence for SMIRK and HRN is not stated anywhere I could read.

## Q2. How do we get a complete, clean, delit skin texture from filtered photos?

### Takeaway
No commercially licensed learned face delighting or albedo model was found. Most of these models (TRUST, FFHQ-UV-Intrinsics, Sapiens, LBM relighting) are non-commercial. The workable route is classical: multi-view projection weighted by visibility, a low-order spherical-harmonic lighting fit to divide out shading, left-right symmetry fill, and LaMa (Apache-2.0) for leftover holes. Feature details (iris colour, moles, bindi) are taken from the sharpest frontal photo as separate decals.

### Cited Findings
- LaMa inpainting: the code is Apache-2.0 ([LICENSE](https://raw.githubusercontent.com/advimman/lama/main/LICENSE)), and the ONNX port `Carve/LaMa-ONNX` is listed as apache-2.0 on its HF card (HF API). The training data is Places/CelebA-HQ according to the paper [unverified].
- FFHQ-UV: the code is MIT ([LICENSE](https://raw.githubusercontent.com/csbhr/FFHQ-UV/main/LICENSE)). The dataset is built from FFHQ on the HiFi3D++ topology, and the repo gives a FLAME conversion ([README](https://raw.githubusercontent.com/csbhr/FFHQ-UV/main/README.md)). The FFHQ source images are under NVIDIA's non-commercial dataset licence [unverified here]. Ubisoft's FFHQ-UV-Intrinsics derivative is CC BY-NC-ND, research only [search only] — [MoSAR repo](https://github.com/ubisoft/ubisoft-laforge-MoSAR).
- TRUST (albedo estimation without skin-tone bias) is under the MPI NC licence — [LICENSE](https://raw.githubusercontent.com/HavenFeng/TRUST/main/LICENSE).
- `jasperai/LBM_relighting` is cc-by-nc-4.0 (HF API). `black-forest-labs/FLUX.1-Kontext-dev` uses the flux-1-dev non-commercial licence (HF API). `FLUX.1-schnell` is apache-2.0 (HF API).
- OpenDelight (2026 preprint, a delighting prior with the NeRSemble-Scan dataset) says its code and dataset are released, but no licence was found. [search only] — [alphaXiv 2605.05636](https://www.alphaxiv.org/abs/2605.05636)
- HUST (ICCV 2025, unbiased skin-tone albedo) and MAGINet (arXiv 2512.16511) list no code licence. [search only] — [HUST paper](https://openaccess.thecvf.com/content/ICCV2025/papers/Ran_HUST_High-Fidelity_Unbiased_Skin_Tone_Estimation_via_Texture_Quantization_ICCV_2025_paper.pdf), [arXiv 2512.16511](https://arxiv.org/abs/2512.16511v1)
- BiRefNet (MIT, HF API) separates the person from the background. briaai/RMBG-2.0 uses a custom "bria-rmbg-2.0" licence, which is not commercial-free (HF API).

### Inferences
- **Texture steps.**
  1. Project each photo into FLAME/MPFB UV using the fitted camera.
  2. Weight each texel by cos(view angle) × parsing confidence × sharpness (Laplacian variance), and zero it at occluders (hair, glasses, hands from the multiclass mask).
  3. Per photo, fit 9-coefficient SH lighting against a mean albedo, and divide it out before blending. This also removes much of the colour shift that beauty filters add.
  4. Blend with Laplacian-pyramid seams (as FFHQ-UV does).
  5. Mirror-fill texels missing on one side, but only for skin. Keep asymmetric marks (moles, bindi, scars) from the side where they were seen.
  6. Fill leftover holes with LaMa in UV space.
  7. Re-light in the renderer.
- **Beauty filters.** Smoothing kills pores and freckles, and face-warping filters move landmarks. Detect warp by checking landmark consistency across photos: drop or down-weight any photo whose fitted residual is an outlier. Prefer the least filtered photo for high-frequency detail, and add a CC0 or own-made pore detail map rather than restoring detail with a generative model. GFPGAN and CodeFormer card licences could not be read (HF auth error), so do not use them until checked.
- **Iris colour.** Sample the iris ring from the MediaPipe iris landmarks (in the 478 set), take the median in Lab, and drive the eye shader. Moles and bindi: find small high-contrast blobs in the delit UV that appear in at least two photos, and keep them as a decal layer so they survive re-lighting.

### Gaps
- I found no commercially usable learned albedo or delighting model. The OpenDelight licence is unknown.
- I did not open the FFHQ or CelebAMask-HQ licence texts directly in this session.

## Q3. How do we reconstruct hair from photos, and under what licences?

### Takeaway
Every single-image strand-hair method checked is non-commercial or unclear: HairStep (CC BY-NC), DiffLocks (MPI NC), HAAR (CC BY-NC), NeuralHaircut (licence not found), Perm (MIT code, but it trains on USC-HairSalon and its single-view pipeline is "not yet released with a public license"). The practical, commercial-safe route is to segment the hair (MediaPipe, Apache-2.0), classify it with hand rules, and choose and deform hair cards from a CC0 or own-made library.

### Cited Findings
- HairStep is CC BY-NC 4.0 — [LICENSE](https://raw.githubusercontent.com/GAP-LAB-CUHK-SZ/HairStep/main/LICENSE)
- DiffLocks: "DiffLocks License (Non-Commercial Scientific Research Use Only)" — [LICENSE](https://raw.githubusercontent.com/Meshcapade/difflocks/main/LICENSE)
- HAAR (text-conditioned strand hair) is CC BY-NC 4.0 — [LICENSE.txt](https://raw.githubusercontent.com/Vanessik/HAAR/master/LICENSE.txt)
- NeuralHaircut: no LICENSE or README found at SamsungLabs/NeuralHaircut on main or master (404), so its licence is **unknown**.
- Perm: the code is MIT ([LICENSE](https://raw.githubusercontent.com/c-he/perm/main/LICENSE)). The README's to-do list still has "Release a reimplementation of our single-view reconstruction pipeline with a public license" unticked, and says curly or kinky hair is "currently not well reconstructed" ([README](https://raw.githubusercontent.com/c-he/perm/main/README.md)). It is fitted to USC-HairSalon, whose licence was not checked [unverified]. It is StyleGAN-based, and NVIDIA's StyleGAN code licence may apply [unverified].
- Im2Haircut (ICCV 2025, MPI) offers code via im2haircut.is.tue.mpg.de with no licence seen. [search only] As MPI-IS work, it is likely NC [inference]. — [arXiv 2509.01469](https://arxiv.org/abs/2509.01469)
- MediaPipe HairSegmenter outputs background and hair at 512×512 input [search only: the Google guide]; its card PDF URL was not found. The multiclass selfie segmenter, which includes a hair class, is Apache-2.0 [verified]. — [Image segmenter guide](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter), [Multiclass card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf)

### Inferences
- **Hair steps.**
  1. Take the union of the hair masks from all photos, registered to the fitted head.
  2. Measure features: hairline height from the brow landmarks, part side, length class (top of the shoulders, or below), volume (mask width ÷ head width), fringe or no fringe, plait or bun (mask outline outside the skull), and colour (median Lab plus a highlight percentile).
  3. Pick the nearest card hairstyle from a library we own or that is CC0 (for example MPFB's CC0 hair assets; check each asset's licence).
  4. Deform it with a lattice so its projected outline matches each photo's hair mask (the same silhouette loss as Q1), and recolour it.
  5. Include South Asian styles (long plait, bun, oiled straight hair, short curly) in the library, since Perm reports curly hair is weak even in research models.
- Hair is outside the face crop that SFace sees, so it barely moves the likeness score. Judge it separately, with a mask IoU against each photo.

### Gaps
- No commercially licensed strand-hair reconstruction model was found.
- I did not check the licence of every MPFB/MakeHuman hair asset.

## Q4. How should we measure likeness, and with which face-recognition model?

### Takeaway
Almost all strong face-recognition weights are trained on MS1M, WebFace or CASIA-type data and are non-commercial (insightface, ElasticFace, EdgeFace weights). **AuraFace-v1** (Apache-2.0, ResNet100, ArcFace loss, trained on "commercial" data) is the main commercially framed alternative to SFace. Its training data is undisclosed, so use it as a second judge rather than the only one. Avatar papers measure identity as ArcFace cosine similarity between renders and real photos, shown as distributions (Arc2Avatar's ISD), not as percentages of a ceiling.

### Cited Findings
- SFace in the OpenCV Zoo: repo Apache-2.0 ([LICENSE](https://raw.githubusercontent.com/opencv/opencv_zoo/main/LICENSE)). MobileFaceNet with the SFace loss, LFW accuracy 0.9940 (int8 0.9932), 5-landmark alignment through YuNet ([README](https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_recognition_sface/README.md)). The training data is per the SFace paper (arXiv 2205.12010); not checked here [unverified].
- insightface: "The code ... is released under the MIT License", but "The training data containing the annotation (and the models trained with these data) are available for non-commercial research purposes only", and this includes auto-downloaded models such as buffalo_l. Commercial recognition models need a licence from recognition-oss-pack@insightface.ai. [verified] — [insightface README](https://raw.githubusercontent.com/deepinsight/insightface/master/README.md)
- AdaFace: the code is MIT ([LICENSE](https://raw.githubusercontent.com/mk-minchul/AdaFace/master/LICENSE)). Its weights are trained on CASIA-WebFace, MS1MV2/V3, WebFace4M or 12M ([README](https://raw.githubusercontent.com/mk-minchul/AdaFace/master/README.md)). R100 WebFace4M averages 0.9751 across 5 HQ validation sets. The weights inherit their datasets' terms (MS1M is distributed through insightface, which is NC per above), so **No**.
- ElasticFace is CC BY-NC-SA 4.0 and trained on MS1MV2 — [README](https://raw.githubusercontent.com/fdbtrs/ElasticFace/main/README.md). **No.**
- EdgeFace: the code is BSD-3-Clause ([LICENSE](https://raw.githubusercontent.com/otroshi/edgeface/main/LICENSE)), but the weights at `Idiap/EdgeFace-Base` are cc-by-nc-sa-4.0 (HF API). **No.**
- facenet-pytorch: the code is MIT ([LICENSE.md](https://raw.githubusercontent.com/timesler/facenet-pytorch/master/LICENSE.md)). Its weights are trained on VGGFace2 and CASIA-WebFace [from memory; unverified], both research-only datasets [unverified]. **Treat as No.**
- AuraFace-v1: the HF API card licence is `apache-2.0`. The card says it is "trained on a commercial dataset comprising face images from various sources". Fal's blog says it can be used commercially, unlike ArcFace. A third-party review says it separates strangers from matches less cleanly than buffalo_l, and its card warns its data "may not extensively cover all ethnicities". It is bundled with an insightface detector, which must be replaced (for example with YuNet, as above). [search only for the card text] — [AuraFace card](https://huggingface.co/fal/AuraFace-v1), [Fal blog](https://huggingface.co/blog/isidentical/auraface)
- Arc2Avatar's "Identity Similarity Distribution (ISD)": ArcFace embeddings of frontal and side renders compared by cosine similarity with real photos of each person, reported as distributions plus FID (Arc2Avatar FID 144.58 against ID-to-3D 154.51 and Magic123 159.21), and a 40-person user study (93% preferred Arc2Avatar). It also measures expression-vs-neutral render similarity for identity consistency. — [Arc2Avatar HTML](https://arxiv.org/html/2501.05379v2)
- A common verification threshold is ArcFace cosine above 0.6 (LAFR protocol). [search only] — [LAFR](https://arxiv.org/pdf/2505.23462)

### Inferences
- **Likeness bench.**
  1. Use two judges: SFace (current) and AuraFace (Apache-2.0). Report both, and gate on the lower one.
  2. Compute photo-vs-photo cosine for each pair of real photos (the ceiling), then render-vs-photo with the render matched to each photo's camera, expression and lighting. A neutral render against a smiling, filtered selfie unfairly lowers the score.
  3. Report the ratio, and also "share of photos where render-vs-photo is above the verification threshold".
  4. Add a geometric check that does not depend on recognition networks: landmark reprojection error (normalised by interocular distance) and mask IoU for each photo.
- **What 95% means.** 95% of the photo-vs-photo ceiling with an un-textured or painted (stylised) head is probably not reachable. Recognition networks lean heavily on skin texture and photometric detail. A realistic target for a painted, toon-shaded avatar is to clear the verification threshold on most photos. I found no published numbers for stylised avatars to back a percentage, so this stays an inference. With a photo-projected texture (Q2) and matched camera and lighting, much higher ratios are plausible.
- Don't optimise shape directly against the recognition network's embedding (a "likeness loss"): that tends to overfit the judge. If it is used at all, judge with a different network than the one used in the loss. This is standard practice in Deep3DFaceRecon-style methods, which use ArcFace in training ([README](https://raw.githubusercontent.com/sicxu/Deep3DFaceRecon_pytorch/master/README.md)).

### Gaps
- The AuraFace training data is undisclosed, and its accuracy table could not be read (huggingface.co was unreachable).
- I found no published identity scores for stylised (non-photoreal) avatars.
- The SFace training-data licence was not checked.

## Q5. Which differentiable renderers can we use on CPU for an inverse-rendering loop?

### Takeaway
PyTorch3D (BSD), Mitsuba 3 (BSD-style) and redner (MIT) are commercially usable. nvdiffrast is **not**: its "Nvidia Source Code License (1-Way Commercial)" limits use to non-commercial research and evaluation except by NVIDIA. PyTorch3D's soft rasteriser runs on CPU and is enough for a head of about 5k–20k vertices at 256–512 px.

### Cited Findings
- PyTorch3D: "BSD License For PyTorch3D software, Copyright (c) Meta Platforms" — [LICENSE](https://raw.githubusercontent.com/facebookresearch/pytorch3d/main/LICENSE)
- nvdiffrast, section 3.3: "The Work and any derivative works thereof only may be used or intended for use non-commercially ... 'non-commercially' means for research or evaluation purposes only and not for any direct or indirect monetary gain." — [LICENSE.txt](https://raw.githubusercontent.com/NVlabs/nvdiffrast/main/LICENSE.txt)
- Mitsuba 3 uses a BSD-style 3-clause licence (Copyright 2017 Wenzel Jakob). It includes an enhancements clause granting a royalty-free licence to contributed improvements. — [LICENSE](https://raw.githubusercontent.com/mitsuba-renderer/mitsuba3/master/LICENSE)
- redner is MIT — [LICENSE](https://raw.githubusercontent.com/BachiLi/redner/master/LICENSE)
- photometric_optimization (MIT) already pairs FLAME with PyTorch3D for photometric fitting — [LICENSE](https://raw.githubusercontent.com/HavenFeng/photometric_optimization/master/LICENSE)

### Inferences
- **Loop design.**
  - Stage 1 (no renderer): landmark and silhouette fit, as in Q1. Use closed-form or Gauss-Newton steps, as RealDenseFace and Dense Landmarks do, which is fast on CPU.
  - Stage 2: refine β, the per-photo SH lighting and the albedo with PyTorch3D's SoftRasterizer on CPU at 256 px, using a photometric loss on parsing-masked skin plus a contour loss.
  - Stage 3: bake the texture (Q2).
  - Use Mitsuba 3 only if a physically based skin look is needed. It is heavier.
  - Never import nvdiffrast, including through dependencies (many avatar repos pull it in).

### Gaps
- I did not benchmark PyTorch3D CPU speed for this mesh size. Measure it on the target VM.
