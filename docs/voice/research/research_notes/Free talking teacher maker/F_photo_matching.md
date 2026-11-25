# F. Matching a stylised (VRM-style) avatar to a real person from 1–3 photos

Scope: free tools whose licences allow commercial use and that can run in a browser, used to pick avatar
settings automatically (face-shape sliders, skin tone, eye colour, hair colour, hairstyle, glasses, beard,
age/gender cues). Research date: 2026-11-24.

Network note: in this research session `ai.google.dev`, `developers.google.com`, `arxiv.org`,
`chuoling.github.io` and `taxguru.in` could not be reached (blocked by the session's network allowlist).
Facts from those sites come from search-result summaries or mirrors and are marked as such. Anyone acting
on a licence should open the official page once.

## 1. MediaPipe tasks (Face Landmarker, face detector, hair and multiclass segmentation): licences and browser use

### Takeaway
MediaPipe's code is Apache-2.0, and the model cards found for the face blendshape model, the BlazeFace
detector and the hair segmenter also say Apache-2.0. Commercial use is allowed. The Face Landmarker
(478 landmarks plus 52 blendshapes) and the image segmenter (hair, and a 6-class selfie model with separate
hair and face-skin classes) give almost all the raw signals needed for avatar matching, on the user's device.

### Cited Findings
- The `google-ai-edge/mediapipe` repository is licensed Apache-2.0. Google also offers MediaPipe Studio for testing and benchmarking solutions in the browser — [GitHub: google-ai-edge/mediapipe](https://github.com/google-ai-edge/mediapipe)
- Face Landmarker runs three models in a row: one detects faces, one finds landmarks on each face, and one uses the landmarks to work out facial features and expressions (the blendshapes) — [Face landmark detection guide (search summary)](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker)
- Model Card "Blendshape V2": a small model that predicts 52 facial blendshape coefficients (floats from 0 to 1) from 146 landmarks, a subset of the 478 FaceMesh landmarks; licensed Apache License 2.0. The card was read on a mirror; the official file is `storage.googleapis.com/mediapipe-assets/Model Card Blendshape V2.pdf` — [mirror of the model card](https://dcmpx.remotevs.com/com/googleapis/storage/SL/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf); [py-feat Hugging Face port, tagged apache-2.0](https://huggingface.co/py-feat/mp_blendshapes)
- The BlazeFace (short range) model card, fetched from Google's own storage, links to the Apache License 2.0. The PDF text was compressed, so the link was the only readable licence signal — [BlazeFace Model Card (Short Range)](https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20(Short%20Range).pdf)
- Hair Segmentation model card: licensed Apache 2.0, version dated 2019-01-14, a light model that segments hair in a selfie with one person (two classes, hair and background), meant for mobile AR. Read on a mirror — [mirror of the model card](https://dcmpx.remotevs.com/com/googleapis/storage/SL/mediapipe-assets/Model%20Card%20-%20Hair%20Segmentation.pdf)
- Google's Image Segmenter guide lists HairSegmenter with a 512 × 512 float32 input, and a multiclass selfie model with the classes background, hair, body-skin, face-skin, clothes and others (accessories) — [Image segmentation guide (search summary)](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter)
- The multiclass selfie model is 256 × 256 input and about 16 MB — [face_detection_tflite docs (pub.dev)](https://pub.dev/documentation/face_detection_tflite/latest/face_detection_tflite_native/SelfieSegmentation-class.html); [Hugging Face copy of selfie_multiclass_256x256 (16.4 MB, no card)](https://huggingface.co/yolain/selfie_multiclass_256x256)
- Qualcomm AI Hub lists the MediaPipe selfie source model as Apache-2.0 (a repackaging, not Google's own statement) — [Qualcomm AI Hub: mediapipe_selfie](https://aihub.qualcomm.com/models/mediapipe_selfie)

### Inferences
- Pipeline for one photo, all in the browser with `@mediapipe/tasks-vision`: Face Landmarker (landmarks, blendshapes, head-pose matrix) → multiclass selfie segmenter (hair mask and face-skin mask) → colour sampling inside the masks. HairSegmenter is a fallback if the multiclass model's hair edge is too coarse.
- The blendshapes describe expression, not identity. They are useful to check that a photo is neutral (no smile, eyes open) before reading face shape, not as shape sliders.
- The multiclass model's "face-skin" class gives a clean skin sample that already excludes eyes, brows, lips and hair, which is what skin-tone estimation needs.

### Gaps
- No browser latency numbers were obtained: Google's docs pages (which list per-model latency) were unreachable. For a one-off avatar build on 1–3 still images, speed is not critical; measure on a low-end Android phone before shipping.
- The official model card PDFs for Face Landmarker (FaceMesh V2) and the multiclass selfie segmenter were not read directly. Their licence is very likely Apache-2.0 like the others, but this was not confirmed from Google's own file.

## 2. Fitting avatar face-shape sliders to landmarks; papers and open projects

### Takeaway
The research systems that turn a photo into game-character sliders (NetEase F2P and its follow-ups, AgileGAN)
either have no licensed code or are research-only, so none can be used as-is. The practical, licence-safe
method is to write our own: measure normalised face proportions from MediaPipe landmarks and solve for the
avatar's morph-target weights by bounded least squares against the same measurements taken on the avatar.

### Cited Findings
- F2P (Face-to-Parameter Translation for Game Character Auto-Creation, ICCV 2019, NetEase Fuxi AI Lab) turns a face photo into in-game facial parameters end to end — [ICCV 2019 open access](https://openaccess.thecvf.com/content_ICCV_2019/html/Shi_Face-to-Parameter_Translation_for_Game_Character_Auto-Creation_ICCV_2019_paper.html)
- A faster, more robust version followed at AAAI 2020 — [AAAI 2020 paper](https://ojs.aaai.org/index.php/AAAI/article/view/5537). Its GitHub page (FuxiCV/Face-to-Parameter-V2) has only a README and images: no LICENSE, no code and no weights. It says the method is used in the game Justice and is "three magnitudes faster" than the 2019 method — [GitHub: FuxiCV/Face-to-Parameter-V2](https://github.com/FuxiCV/Face-to-Parameter-V2)
- Later NetEase work extends the idea: PokerFace-GAN (neutral faces) and zero-shot text-to-parameter (CVPR 2023); EasyCraft (2025) is a newer framework for automatic avatar crafting — [PokerFace-GAN](https://arxiv.org/pdf/2008.07154.pdf); [CVPR 2023 paper](https://openaccess.thecvf.com/content/CVPR2023/papers/Zhao_Zero-Shot_Text-to-Parameter_Translation_for_Game_Character_Auto-Creation_CVPR_2023_paper.pdf); [EasyCraft](https://arxiv.org/html/2503.01158v1)
- An Electronic Arts paper (arXiv 2209.02600) on the same face-to-parameter problem describes an open-sourced codebase, but its repository and licence were not found — [arXiv 2209.02600 (search result)](https://arxiv.org/abs/2209.02600v1)
- AgileGAN (SIGGRAPH 2021) stylises portraits; no licence for the official code was found. MMGEN-FaceStylor re-implements its pipeline under Apache-2.0, but says parts carry other licences (check its LICENSES.md) and that AgileGAN's training code was never released — [GitHub: open-mmlab MMGEN-FaceStylor](https://github.com/papercatnku/MMGEN-FaceStylor); [AgileGAN paper](https://guoxiansong.github.io/homepage/paper/AgileGAN.pdf). AgileGAN also has a related granted US patent — [Justia: US 20220375024](https://patents.justia.com/patent/20220375024)
- AgileGAN outputs a stylised image, not avatar parameters, so it does not solve the slider problem even if licensed — [AgileGAN paper](https://guoxiansong.github.io/homepage/paper/AgileGAN.pdf)
- No open project was found that builds a VRM avatar's shape from a selfie. Existing open tools (KalidoKit, Mocapy, w-okada's mediapipe-avatar-js, Babylon facecap) use MediaPipe to *animate* an existing VRM (blendshapes, head rotation), not to *create* it — [GitHub: Mocapy](https://github.com/justinjohn0306/Mocapy); [GitHub: kalidokit fork](https://github.com/h030162/kalidokit); [GitHub: mediapipe-avatar-js](https://www.Github.com/w-okada/mediapipe-avatar-js)
- MeFaMo computes blendshapes from MediaPipe keypoints for Unreal LiveLink; the README does not give formulas, and its licence is in a LICENSE.txt not shown on the page (fork of JimWest/MeFaMo) — [GitHub: MeFaMo](https://github.com/PuddlePumpkin/MeFaMo)

### Inferences (proposed method, not found ready-made)
- **Measure, normalised.** From the 478 landmarks of a neutral, near-frontal face (reject a photo if yaw/pitch from the transformation matrix is more than about 15° or the smile/eye-blink blendshapes are high), compute scale-free ratios: face width ÷ face height, jaw width ÷ cheekbone width, chin length ÷ lower-face height, eye width ÷ inter-eye distance, nose width ÷ inter-eye distance, mouth width ÷ face width, brow height, forehead height ratio, and jaw angle. Divide by inter-pupil distance so photo size does not matter.
- **Same measures on the avatar.** Put matching landmark vertices on the avatar mesh once (by hand, about 30 points). For each morph target ("jaw wide", "chin long", "eye big" …) record how each ratio changes at weight 1. This gives a linear model: ratios ≈ base + J · w.
- **Solve.** Bounded least squares for w in [0, 1] (or [−1, 1] for paired sliders), with a small ridge penalty so sliders stay near the default and the face stays "cute" rather than literal. Average the ratios across the 1–3 photos (median if three) before solving.
- **Stylise, don't copy.** Anime faces exaggerate eyes and shrink nose and mouth. Map the person's deviation from the population average onto the avatar's deviation from its own default, scaled down (for example 50–70%), instead of matching raw ratios. This keeps likeness without uncanny results.
- **Let the person finish.** Show the auto result as a starting point with all sliders editable; that is how game creators use F2P-style results.
- This method needs no training data, so dataset licences (Section 3) do not apply to it.

### Gaps
- No published accuracy figure for landmark-ratio fitting on stylised avatars was found. Accuracy must be judged by a small user study (does the person recognise themselves; do friends pick the right avatar from a line-up).
- Could not read the EA paper or confirm its code licence (arxiv.org unreachable).

## 3. Skin tone, eye colour, hair colour, hairstyle, glasses and beard

### Takeaway
Skin, eye and hair colour are best done with simple colour maths inside MediaPipe masks plus white-balance
correction, then snapped to a palette such as the Monk Skin Tone scale (CC BY 4.0, commercial use with
credit). Hairstyle, glasses and beard have no clean, commercially-licensed open model that covers all three;
CelebA / CelebAMask-HQ, the usual training sets, are non-commercial and must be excluded.

### Cited Findings
- The Monk Skin Tone (MST) scale is a 10-shade scale developed by Ellis Monk with Google, licensed CC BY 4.0; secondary sources say commercial use is allowed with credit ("Monk, Ellis. Monk Skin Tone Scale, 2019, skintone.google"). The official skintone.google page was not reached — [Wikipedia: Monk Skin Tone Scale](https://en.wikipedia.org/wiki/Monk_Skin_Tone_Scale); [Google blog](https://blog.google/products/search/monk-skin-tone-scale/)
- Google cautions against equating MST shades with race; skin tone varies widely within a race — [Wikipedia: Monk Skin Tone Scale](https://en.wikipedia.org/wiki/Monk_Skin_Tone_Scale)
- Google research found skin-tone annotation is subjective, and agreement improves with several annotators — [Google Research blog](https://research.google/blog/consensus-and-subjectivity-of-skin-tone-annotation-for-ml-fairness/)
- `skin-tone-classifier` ("stone") uses face detection, skin segmentation and k-means clustering to find skin tone; it is listed as GPL-3.0 (copyleft; avoid copying its code into closed parts of the site) — [PyPI: skin-tone-classifier](https://pypi.org/project/skin-tone-classifier/); [libraries.io](https://libraries.io/pypi/skin-tone-classifier); [GitHub](https://github.com/ChenglongMa/SkinToneClassifier)
- CelebAMask-HQ is restricted to non-commercial research and education; images and derived data may not be used commercially — [GitHub: CelebAMask-HQ](https://github.com/switchablenorms/CelebAMask-HQ). CelebHair is built on CelebA, which is also distributed for non-commercial research — [search summary, Hairmony/CelebHair](https://arxiv.org/abs/2104.06885v1)
- FairFace (108,501 images, 7 race groups, gender, 9 age bands) is CC BY 4.0, but its images come from YFCC-100M Flickr photos, whose own rights were not checked, and the paper frames sharing "for a research purpose" — [GitHub: joojs/fairface](https://www.github.com/joojs/fairface); [Hugging Face: FairFace card](https://huggingface.co/datasets/HuggingFaceM4/FairFace/blob/main/README.md)
- Qualcomm's Facial-Attribute-Detection model (128 × 128 input) detects eye closeness, mask, eyeglasses and sunglasses; licence BSD-3-Clause; trained by Qualcomm on a proprietary face dataset; code in qualcomm/ai-hub-models — [Hugging Face: qualcomm/Facial-Attribute-Detection](https://huggingface.co/qualcomm/Facial-Attribute-Detection)
- ailia's ax_facial_features model classifies facial hair (moustache, beard, mouth-side hair); no licence was found — [GitHub: ailia-models ax_facial_features](https://github.com/wxf8126275/ailia-models/blob/master/face_recognition/ax_facial_features)
- Hairstyle data: a Roboflow "HAIR CLASSIFICATION" project is CC BY 4.0; a Hugging Face hair detection/segmentation set is CC BY-NC-ND 4.0 (excluded); TrainingData's facial hair set is paid; K-Hairstyle and Microsoft's Hairmony (synthetic training data plus a real evaluation set with a hairstyle taxonomy) have no licence shown in what was found — [Roboflow](https://universe.roboflow.com/together-lfzki/hair-classification); [Hugging Face hair set](https://huggingface.co/datasets/TrainingDataPro/hair-detection-and-segmentation/tree/main); [Hairmony](https://www.microsoft.com/en-us/research/publication/hairmony/); [K-Hairstyle](https://arxiv.org/abs/2102.06288)

### Inferences (proposed method)
- **White balance first.** Phone photos under tube lights or yellow bulbs shift skin colour a lot. Estimate the light from the sclera (eye whites, located by landmarks, excluding the iris) and, if visible, teeth, or fall back to grey-world over the clothes/background classes. Apply a von Kries (per-channel gain) correction before sampling.
- **Skin.** Take face-skin mask pixels from cheeks and forehead only (landmark polygons), drop the brightest and darkest 10% (shine and shadow), convert to CIELAB, take the median, and snap to the nearest MST shade (ΔE in Lab) or a finer avatar palette. Average over the 1–3 photos. Always let the person change it.
- **Eyes.** The iris landmarks (468–477) give the iris circle; sample an annulus inside it, avoid the pupil and the catchlight, and snap to a small palette (dark brown, brown, hazel, green, blue, grey). Most Indian users will be dark brown; low light makes this unreliable, so default to dark brown when the sample is very dark.
- **Hair colour.** Median Lab colour of hair-mask pixels, ignoring the brightest highlights; snap to a hair palette (black, dark brown, brown, auburn, grey/white, plus dyed colours).
- **Hairstyle without a licensed classifier.** Use mask geometry: hair-mask area and extent relative to the face box (bald / short / medium / long), whether hair reaches below the jaw or shoulders, fringe coverage of the forehead (hair pixels above the brow landmarks), parting side from the hair top's asymmetry, and bun/ponytail from a blob above or behind the head. Map these to the avatar's 10–20 hair models. This needs no training data.
- **Beard and moustache.** Compare skin-colour statistics in the chin/jaw and upper-lip regions (landmark polygons) with the cheek sample: darker, lower-chroma, textured regions suggest facial hair. This is a heuristic; offer it as a pre-selected toggle, not a final answer.
- **Glasses.** The Qualcomm BSD-3 model covers eyeglasses and sunglasses; or use a heuristic (strong edges across the nose bridge between the eye landmarks). Either way, let the person confirm.
- **Age and gender.** Avoid inferring these from the face. Ask the person (or let them pick the base body), which is more accurate, avoids bias, and avoids processing that may be seen as profiling.
- **Zero-shot option.** An open CLIP-style model could label hairstyle, glasses and beard from text prompts in the browser, but the licences of the model weights and their training data were not checked in this research; check before use.

### Gaps
- No commercially-licensed, open hairstyle classifier was confirmed.
- No accuracy figures were found for heuristic beard or hairstyle detection; these need an in-house test set of consented photos.
- The licence of qualcomm/ai-hub-models' original implementation (linked LICENSE file) was not read in full.

## 4. Privacy: in-browser processing, consent, not storing faces; India's DPDP Act 2023

### Takeaway
A face photo of an identifiable person is "personal data" under the DPDP Act 2023. The Act has no separate
"sensitive" or "biometric" tier, but it needs a lawful basis (normally clear consent with a notice), and
verifiable parental consent for anyone under 18. The safest design is: run every model in the browser, keep
only the resulting avatar parameters, and never upload or store the photo.

### Cited Findings
- The DPDP Act defines personal data as any data about an individual who is identifiable by or in relation to such data — [India Code: Act No. 22 of 2023](https://www.indiacode.nic.in/bitstream/123456789/22037/2/a2023-22.pdf)
- Unlike the GDPR, the Act does not create a separate, stricter category for sensitive data such as biometric information — [Chambers Practice Guide: India 2024](https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2024/india); [KS&K: biometric data under the DPDP Act](https://ksandk.com/data-protection-and-data-privacy/regulation-of-biometric-data-under-the-dpdp-act). A vendor blog claims facial images are a "highly sensitive" category; that is not supported by the statute summaries and should not be relied on — [Mantratec blog](https://blog.mantratec.com/DPDP-Biometrics-Compliance)
- The DPDP Rules, 2025 were notified on 14 November 2025 (some firms give 13 November) and roll out in phases: Data Protection Board provisions at once, Consent Manager framework after 12 months, and core duties (notice, consent, security safeguards) after 18 months, which one firm dates to 13 May 2027 — [India Briefing](https://www.india-briefing.com/news/dpdp-rules-2025-india-data-protection-law-compliance-40769.html); [Legal500 / Saga Legal](https://www.legal500.com/firms/237811-saga-legal/c-india/news-and-developments/the-privacy-timer-starts-now-analysing-the-dpdp-rules-and-its-18-month-countdown); [PIB document](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf)
- Verifiable parental consent is required before processing personal data of anyone under 18 (Rule 10); some bodies (healthcare, educational institutions, childcare) have exemptions — [Bar & Bench](https://www.barandbench.com/news/centre-notifies-digital-personal-data-protection-rules-2025-how-different-are-they-from-the-draft-rules); [India Briefing](https://www.india-briefing.com/news/dpdp-rules-2025-india-data-protection-law-compliance-40769.html)
- The Act also allows some "legitimate uses" without explicit consent — [KPMG: Decoding the DPDP Act](https://assets.kpmg.com/content/dam/kpmg/in/pdf/2023/08/decoding-the-digital-personal-data-protection-act-2023.pdf)

### Inferences
- If the photo never leaves the device (models and maths run in the browser, nothing uploaded, no analytics on the image), NexoraGuru likely does not "process" the face as a data fiduciary at all; the stored output is a set of avatar numbers and colours, which on their own do not identify the person. This is an inference, not legal advice; a short legal check is worth it before launch.
- Good practice regardless of the law: a plain consent screen before the camera ("Your photo stays on this device. We only keep the avatar settings."), a "skip, build it by hand" path, delete the image from memory as soon as the avatar is made, no photo in error reports or logs, no face embeddings saved, and an extra parent-consent note for under-18 students (many GATE and school users are 17–18).
- Do not let the feature use a photo of someone else; ask the user to confirm it is their own face.
- Since India's core consent duties apply from about May 2027, building consent in now avoids rework.

### Gaps
- The official gazette text of the DPDP Rules 2025 was not read directly; dates and rule numbers come from law-firm and news summaries that disagree slightly.

## 5. Existing open-source "selfie to avatar parameters" systems and their quality

### Takeaway
No free, commercially-licensed, ready-made system that turns a selfie into stylised avatar sliders was found.
The commercial ones (game studios' F2P systems) are closed, and the open tools animate an avatar rather than
build it. We will have to build our own pipeline from MediaPipe parts (Sections 2–3).

### Cited Findings
- F2P's improved method is in use in NetEase's game Justice, but no code or weights are released — [GitHub: FuxiCV/Face-to-Parameter-V2](https://github.com/FuxiCV/Face-to-Parameter-V2); [TechNode coverage](https://technode.com/2019/09/11/netease-developing-ai-to-turn-selfies-into-3d-game-avatars/)
- Open MediaPipe-to-VRM tools (KalidoKit, Mocapy, mediapipe-avatar-js) drive an existing VRM from a webcam using MediaPipe's 52 ARKit-style blendshapes and head pose; they do not create the avatar's shape — [GitHub: Mocapy](https://github.com/justinjohn0306/Mocapy); [GitHub: kalidokit fork](https://github.com/h030162/kalidokit)
- SelfieAvatar (arXiv 2601.18851, January 2026) rebuilds a realistic head avatar from a selfie video using 3DMMs and a StyleGAN generator; it is research, not a stylised VRM tool — [arXiv 2601.18851 (search result)](https://arxiv.org/abs/2601.18851)
- Google's MediaPipe blog describes using Face Landmarker blendshapes to make virtual humans more realistic (driving expressions) — [Google Developers Blog](https://developers.googleblog.com/en/mediapipe-enhancing-virtual-humans-to-be-more-realistic/)

### Inferences
- Plan: (1) MediaPipe Face Landmarker + multiclass segmenter in a Web Worker; (2) photo-quality checks (one face, frontal, neutral, light level); (3) ratio-based slider fit with shrink toward default; (4) white-balanced colour sampling snapped to palettes; (5) heuristic hair length/fringe, beard and glasses toggles; (6) the person reviews and edits everything; (7) only the parameters are saved.
- Use the same Face Landmarker at run time (already a common pattern with VRM) if the teacher ever mirrors the student's expressions, so one model download serves both.

### Gaps
- No quality benchmark exists for open selfie-to-stylised-avatar matching; quality has to be measured in-house.
