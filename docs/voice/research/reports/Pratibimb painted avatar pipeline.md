# Fit FLAME, paint the texture, calibrate lips

Pratibimb can be built as one fixed, free pipeline with commercial-safe parts. Measured face points do the work that photo cut-outs do now. The steps are: an adult-only consent capture; MediaPipe measurement of every photo (Apache-2.0); a multi-view optimisation fit of the **FLAME 2023 Open** head (reported as CC-BY-4.0) using MIT fitting code and the BSD PyTorch3D renderer on a CPU, then moved onto the CC0 MakeHuman/MPFB2 body we already rig; skin painted offline from *measured* colours and feature outlines, delit with classical maths, never pasted from a photo; a soft, wrap-lit "painted" shader in three.js in place of toon steps and ink lines; MakeHuman bodies fitted to silhouettes and height, wearing CC0 MakeHuman clothes plus Indian wear we author ourselves; **Chatterbox Multilingual V3 and its Hindi fine-tune** (MIT, watermarked) for the cloned voice, rendered offline; and lip sync that blends the current wav2arkit_cpu curves with forced-aligned phoneme timings and is **calibrated against the person's own mouth movement**. That last step is the most direct fix for the "exaggerated" first demo. It matters because almost every strong research model in this field (MICA, DECA, EMOCA, Pixel3DMM, SMPL-X, AMASS-trained motion, insightface, F5-TTS, MMS aligners, nvdiffrast, strand-hair models) is non-commercial. A pipeline that looks state of the art on paper would be illegal to ship. Two targets need to be stated honestly. "95% real" is not one number anywhere in the literature, so we have to define it: a blind A/B test against real video, plus automatic sync and closure gates. "95% of the photo-vs-photo likeness ceiling" with a painted, non-photo texture is probably out of reach, because face-recognition judges lean heavily on photographic skin detail. Several key licences (the FLAME 2023 Open page itself, AuraFace's data, the Silent-Face weights, the gated AI4Bharat aligner, BEAT) were read only second-hand. They are listed for a human read before launch.

## The licence screen decides the architecture before quality does

The strongest face regressors would close most of today's likeness gap, and every one of them is closed to us. MICA, metrical-tracker, DECA, EMOCA, TRUST and PIXIE carry the Max Planck non-commercial licence. SPECTRE, VHAP and GaussianAvatars are CC BY-NC-SA, and Pixel3DMM is CC BY-NC ([MICA LICENSE](https://raw.githubusercontent.com/Zielon/MICA/master/LICENSE), [DECA LICENSE](https://raw.githubusercontent.com/yfeng95/DECA/master/LICENSE), [Pixel3DMM LICENSE](https://raw.githubusercontent.com/SimonGiebenhain/pixel3dmm/master/LICENSE), [VHAP LICENSE](https://raw.githubusercontent.com/ShenhanQian/VHAP/main/LICENSE)). The best published NoW scores (**TokenFace 0.76 mm median, Pixel3DMM 0.87, MICA 0.90**) all come from methods we either cannot use or cannot download ([RealDenseFace](https://arxiv.org/html/2608.09238)). The same pattern repeats in every other stage:

- **Body:** SMPL-X is non-commercial ([SMPL-X licence](https://smpl-x.is.tue.mpg.de/modellicense.html)).
- **Motion:** AMASS, and every text-to-motion model trained on it, is non-commercial ([AMASS licence](https://amass.is.tue.mpg.de/license.html)).
- **Recognition:** insightface's auto-downloaded recognition models are "for non-commercial research purposes only" ([insightface README](https://raw.githubusercontent.com/deepinsight/insightface/master/README.md)).
- **Clothes parsing:** NVIDIA's SegFormer licence covers most clothes parsers ([SegFormer LICENSE](https://raw.githubusercontent.com/NVlabs/SegFormer/master/LICENSE)).
- **Rendering:** nvdiffrast, which many avatar repos pull in quietly, is non-commercial ([nvdiffrast LICENSE](https://raw.githubusercontent.com/NVlabs/nvdiffrast/main/LICENSE.txt)).

The consequence is structural. Pratibimb must be built from **parametric models with open licences, fitted by optimisation**, rather than from learned regressors. Optimisation is slower and needs more care, but it runs on a free CPU, it is deterministic, and every number in it can be explained. That suits a "fixed pipeline, same for every person". The table below is the whole stack at a glance. Later sections justify each row.

| Stage | Ranked choice | Backup | Code / weights / data licence | Runs where |
|---|---|---|---|---|
| Consent | Live consent video with a random code, liveness, face match, staff review | Same flow without the liveness model | Silent-Face code Apache-2.0; weights **unverified** | Browser capture, CPU server checks |
| Photo reading | MediaPipe Face Mesh V2 (478 points) + multiclass segmenter + Pose | BiRefNet (MIT) / SAM 2 (Apache-2.0) for silhouettes | Apache-2.0 (verified card) | Browser or CPU server |
| Face shape | FLAME 2023 Open, multi-view landmark + silhouette fit, moved onto MPFB | Current 222-target MPFB solve with added contour terms | FLAME 2023 Open CC-BY-4.0 (**search only**); photometric_optimization MIT; PyTorch3D BSD | CPU server, offline |
| Skin and features | Measured-colour painted albedo: SH delighting, multi-view weights, LaMa fill, own anisotropic Kuwahara | Photo-projected skin (today's bake_skin.py) at low weight | OpenCV Apache-2.0; LaMa code Apache-2.0, training data **unverified** | CPU server, offline |
| Look | Custom three.js shader: wrap / pre-integrated skin, authored face-shadow map, soft rim, feature mask | MToon extended through `onBeforeCompile` at low toony values | three.js MIT, three-vrm MIT | Browser |
| Body | MPFB macros + `measure-*` targets fitted to front/side silhouettes and height | SAM 3D Body as a second opinion | MPFB assets CC0; SAM License (commercial, use limits); MHR Apache-2.0 | CPU server (browser possible) |
| Clothes | CC0 MakeHuman packs + in-house Indian wear through MPFB MakeClothes | CC-BY packs with a credits page | CC0 / CC-BY per item header | Offline authoring, browser fitting |
| Hair | Measured hair features → nearest CC0 card style, lattice-fit to masks | MPFB hair editor → baked cards | CC0 (template licence **unverified**) | CPU server + offline art |
| Joints and motion | VRM 1.0 humanoid with fingers, joint-limit table, CC0 Quaternius clips, rule-based gestures | CMU MoCap clips; Mixamo baked in | CC0; CMU "free for all uses" (**secondary**); Mixamo royalty-free in product | Browser |
| Voice | Chatterbox Multilingual V3 + Chatterbox-Multilingual-hi | Kokoro fixed Hindi voices; OpenVoice V2 timbre transfer | MIT (verified file + tags) | Offline GPU |
| Lip sync | Phoneme timings (HeadTTS / CTC aligner) + JALI-style rules fused with wav2arkit_cpu, calibrated per person | NVIDIA Audio2Face-3D v3.0 offline | Apache-2.0; A2F weights NVIDIA Open Model License | CPU server or browser; A2F needs an NVIDIA GPU |
| Whiteboard | Existing board and animation player as a panel beside her; deictic point + gaze by IK | Gaze only | three.js MIT | Browser |

## Measured geometry replaces photo cut-outs in the face

### FLAME 2023 Open is the one statistically sound face space we may ship

Today's solver fits about 222 MakeHuman targets linearly to MediaPipe points, and SFace puts the result at about a third of the photo-vs-photo ceiling. MakeHuman targets are hand-made sliders, not a statistical face space. They can reach poses no real face has, and they cannot reach many faces that exist. **FLAME 2023 Open is reported to be CC-BY-4.0, "for any purpose, including commercial use"**, while FLAME 2017–2020 and the original 2023 model stay non-commercial and forbid training networks ([FLAME licence page](https://flame.is.tue.mpg.de/modellicense.html)). An MPI confirmation is reported second-hand on Hugging Face ([LAM-20K discussion](https://huggingface.co/3DAIGC/LAM-20K/discussions/2)). The licence page could not be opened during this research, and an earlier note in this series called FLAME "research-only". That holds for the older versions, but nobody has read whether the 2023 Open landmark embeddings and masks share the CC-BY terms. **Reading that page is the first gate of the whole project.**

The fit should run by optimisation with code we may use. **HavenFeng's photometric_optimization is MIT** and already pairs FLAME with PyTorch3D ([LICENSE](https://raw.githubusercontent.com/HavenFeng/photometric_optimization/master/LICENSE)). flame-head-tracker is MIT but bundles DECA and MICA, which must be removed ([LICENSE](https://raw.githubusercontent.com/PeizhiYan/flame-head-tracker/main/LICENSE)). **PyTorch3D is BSD** ([LICENSE](https://raw.githubusercontent.com/facebookresearch/pytorch3d/main/LICENSE)), and its soft rasteriser runs on a CPU. The fit has three parts:

- **One shared identity β per person.** Each photo gets its own camera and expression ψ, so a smile in one photo does not bend the person's face.
- **Two error terms.** The 478 MediaPipe points (mapped once onto FLAME vertices by non-rigid ICP), weighted by visibility, plus a Chamfer term between the mesh's projected outline and the segmenter's face-skin and hair boundary. The outline term is what fixes jaw, chin and cheek width, which the landmarks alone leave loose.
- **A prior.** A shape term ‖β‖² keeps the result a plausible face.

Microsoft's Dense Landmarks work shows that landmarks alone, with no differentiable rendering, reach state-of-the-art monocular accuracy and combine well across views ([project page](https://microsoft.github.io/DenseLandmarks/)). So a landmark-plus-outline first stage on a CPU is a sound base. A photometric refinement at 256 px with PyTorch3D comes second. MediaPipe's mesh was checked across 17 geographic subregions, with tracking error between **2.06% and 3.27% of the interocular distance** ([Face Mesh V2 card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf)). That is fair evidence it works across skin tones, though not proof.

The fitted head then goes onto the body we already rig. Build a fixed FLAME→MPFB correspondence once. Then either carry FLAME's vertex offsets onto the MPFB face and keep the existing ARKit-52 and Oculus-15 shapes as deltas, or move those 67 shapes onto the FLAME head by deformation transfer. **The first option is the right start**: it changes one stage of `pipeline.py` and keeps `solve_multiview.py`'s camera code. The backup, if the FLAME licence fails, is today's MPFB solve with the same outline term added and side photos weighted up. It is less statistically sound but entirely CC0.

### Features are drawn from points; photo pixels only supply measurements

The owner asked for features taken from measured positions, not photo cut-outs, and `paint_features.py` already draws brows, lids, lips and nostrils from the 478 points. The change Pratibimb needs is in *how* they are drawn. They are drawn now in a "light anime style": a lid line that thickens toward the outer corner, a lash flick, a dark line where the lips meet, and blush. `anime_textures.py` and `cv2.stylization` in `paint_look.py` add flat, posterised tone on top. That combination is the most likely cause of the "too cartoonish" verdict. This is an inference from the code, not measured. Painted portraits show features as changes of *value and hue* (a darker, warmer upper lid; a lip whose shadow side is cooler), not as outlines.

The painted albedo should therefore be built as layers. The low-frequency skin tone comes from the photos, measured but delit. Feature shapes come from the points, rendered as soft value shifts. Small marks (moles, bindi, scars) are found as blobs that appear in at least two delit views and kept as a decal. Iris colour is the median Lab colour of the MediaPipe iris ring. Each layer is a measurement, so filters and lighting in a single selfie cannot leak into the result as pixels.

### Delighting has no commercial learned model, so it stays classical

No commercially licensed learned delighting or albedo model was found. TRUST is MPI non-commercial ([LICENSE](https://raw.githubusercontent.com/HavenFeng/TRUST/main/LICENSE)) and LBM relighting is CC-BY-NC. FFHQ-UV's code is MIT but its data comes from NVIDIA's non-commercial FFHQ ([FFHQ-UV README](https://raw.githubusercontent.com/csbhr/FFHQ-UV/main/README.md)). The classical route:

1. Project each photo into UV through its fitted camera.
2. Weight each texel by viewing angle × parsing confidence × sharpness, and zero it under hair, glasses and hands.
3. Fit and divide out 9-coefficient spherical-harmonic lighting per photo. This also removes much of a beauty filter's colour cast.
4. Blend with Laplacian-pyramid seams.
5. Mirror-fill skin texels missing on one side, keeping asymmetric marks from the side where they were seen.
6. Fill the last holes with **LaMa (Apache-2.0 code; the ONNX port is tagged Apache)** ([LaMa LICENSE](https://raw.githubusercontent.com/advimman/lama/main/LICENSE)).

LaMa's training data (Places, CelebA-HQ) was not checked. If it fails a licence read, mirror fill plus a smooth diffusion fill is enough for small holes. Beauty-filter warps show up as landmark outliers between photos, and those photos lose weight. GFPGAN and CodeFormer stay out until someone has read their licences.

## A painted look comes from the texture, not from toon steps

Productions that read as "painted real people" put the paint in the textures and light them gently. Arcane's artists painted light, shadow and brush marks into the albedo so characters would not look like "plastic toys" ([RedShark News](https://redsharknews.com/why-netflixs-arcane-looks-so-good-how-fortiche-ramped-up-the-animation-pipeline), [80.lv](https://80.lv/articles/a-closer-look-at-texturing-in-arcane)). These Arcane sources are secondary. Guilty Gear Xrd's hard cel shading needed hand-cleaned normals, because "every little noise on the surface will become extremely distracting" ([Motomura handout](https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf)). Genshin-style shaders swap N·L on the face for an authored shadow-threshold map ([Mendez breakdown](https://adrianmendez.artstation.com/projects/wJZ4Gg)). The lesson for Pratibimb is that **hard light steps flatten the cheekbones, nasolabial folds and jaw that carry a real person's likeness** and push the result toward anime. A painted look that keeps identity uses soft wrap lighting, a warm shadow hue, an authored face-shadow shape that stays put while she talks, a faint rim, and almost no ink.

### The offline bake does the painting

The painting runs on the CPU server with **OpenCV (Apache-2.0)** ([LICENSE](https://raw.githubusercontent.com/opencv/opencv/4.x/LICENSE)):

1. Start from the delit albedo and run an edge-preserving smooth (bilateral or guided filter).
2. Run an **anisotropic Kuwahara filter written in NumPy from the Kyprianidis papers** ([2009](https://umsl.edu/~kangh/Papers/kang_cgf09.pdf), [2010](https://www.umsl.edu/~kangh/Papers/kang-tpcg2010.pdf)). It follows the local feature direction, so it flattens skin into strokes but keeps contours. Use a per-region radius from a UV mask: wide on cheek, forehead and neck, 1–2 px on lips, lids, brows and the lash line.
3. Quantise colour softly toward a limited palette, add warmer, more saturated tints in creases, and paint ambient-occlusion shapes into the albedo.
4. Lay a self-made or CC0 canvas grain along the structure-tensor flow.
5. Re-score likeness after each bake, and reject any bake that drifts.

The algorithm is published maths, not copyrighted code. Blender's GPU Kuwahara is GPL, so read it for structure only ([Blender PR #110786](https://projects.blender.org/blender/blender/pulls/110786)). Neural style transfer is out for now. pytorch-AdaIN's code is MIT, but the pretrained weights were trained on art of unknown licence ([AdaIN LICENSE](https://raw.githubusercontent.com/naoto0804/pytorch-AdaIN/master/LICENSE)). It could come back only with weights we train ourselves on CC0 paintings.

### The run-time shader stays cheap and soft

In the browser, the base is **three.js (MIT)** and three-vrm's MToon (MIT), whose uniforms already cover shade colour, a shading shift texture, a toony factor, matcap, parametric rim and outline width ([MToonMaterial.ts](https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm-materials-mtoon/src/MToonMaterial.ts)). The earlier report in this series found that **MToon's defaults (toony 0.9, GI equalisation 0.9) give a hard cel edge, and that three-vrm's MToon ignores environment lighting** ([VRM MToon spec](https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_materials_mtoon-1.0/README.md), [mtoon.frag](https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm-materials-mtoon/src/shaders/mtoon.frag)). So the ranked choice is a custom shader. It uses wrap diffuse or a **pre-integrated skin lookup indexed by N·L and curvature**, one texture fetch with a warm shadow side ([Penner, GPU Pro 2](https://www.gameenginegems.com/gemsdb/article.php?id=1103); note the known integration-range erratum in the sample code, [notes](https://progmdong.github.io/2019-02-03/Skin_Rendering)). It adds an authored face-shadow threshold map, a soft rim, smoothed or baked normals, and IBL from the existing `look.ts` setup. Exported VRM files still carry MToon-compatible materials so they open in other apps.

The backup is MToon through `onBeforeCompile` with toony around 0.35–0.5 on skin and outlines off or hairline-thin. Those values come from the earlier report's design proposal; no source publishes them. Hair uses a shifted Kajiya-Kay highlight on painted cards. Any screen-space painterly pass stays optional. **Kuwahara on a phone GPU has been reported at about 1 fps** ([Imagination forum](https://forums.imgtec.com/t/frame-drop/867)), and nobody has published a millisecond figure for a mid-range phone. If the pass runs at all, it runs at half resolution over the avatar's box, desktop only, with a mask that keeps the lips, inner mouth, eyes and brows unfiltered so they do not "swim" while she talks. Screen-space edge lines on a talking face flicker on lips and nostrils and should not be used.

## Body, outfits and hair are fitted to measurements, then chosen from libraries we own

There is no commercial-safe "photos to body" model, so the body is fitted the same way as the face. NAVER's **Anny** shows the shape space is sound. Its code is Apache-2.0, its MakeHuman-derived assets are CC0, and it can output the full 163-bone MakeHuman rig. Its **Anny-Fit image fitter is NAVER non-commercial**, though, and its SMPL-X topology is non-commercial too ([Anny README](https://github.com/naver/anny), [Anny-Fit LICENSE](https://raw.githubusercontent.com/naver/anny-fit/main/LICENSE.txt)). The fit:

1. Ask for the person's height (needed for metric scale), and weight if they offer it.
2. Cut front and side silhouettes with **BiRefNet (MIT)** or **SAM 2 (Apache-2.0)** ([BiRefNet](https://raw.githubusercontent.com/ZhengPeng7/BiRefNet/main/LICENSE), [SAM 2](https://raw.githubusercontent.com/facebookresearch/sam2/main/LICENSE)), and read the body levels from MediaPipe Pose.
3. Turn the front width and side depth at each level into a girth with an ellipse model calibrated on slices of the MPFB mesh.
4. Solve the macros (gender, age, weight, muscle, height, proportions), then the CC0 `measure-*` targets (bust, waist, hips, shoulder, neck, upper arm, thigh, calf and more) by least squares ([mpfb2](https://github.com/makehumancommunity/mpfb2)).

**Meta's SAM 3D Body is licensed for commercial use with use restrictions** (no military, weapons or espionage use; trade controls), and its MHR body model is Apache-2.0 ([SAM 3D Body LICENSE](https://raw.githubusercontent.com/facebookresearch/sam-3d-body/main/LICENSE), [MHR LICENSE](https://raw.githubusercontent.com/facebookresearch/MHR/main/LICENSE)). That makes it a usable second opinion on proportions, though no MHR→MakeHuman transfer exists yet. Loose saree, kurta and salwar silhouettes inflate waist and hip girths. Trust only the levels where the cloth hugs the body (shoulders, upper arm, neck), ask for one photo in fitted clothes, and always show correction sliders. Accuracy figures for clothed silhouettes were not extracted. The BodyM dataset (8,978 silhouettes of 2,505 people) is the obvious place to test the method, but its licence is unverified ([BodyM paper](https://ar5iv.labs.arxiv.org/html/2205.14347)).

**Outfits** come from the MakeHuman asset packs, where each item is CC0 or CC-BY. The CC0 sets cover blazers and suits (suits01), shirts and tees (shirts01), harem and wool trousers (pants01), long skirts (skirts01), and a long tunic and kimono (dress01) ([asset packs](https://github.com/makehumancommunity/makehuman-static-website/tree/master/content/Assets/AssetPacks)). The packs also include **CC0 Indian skin textures** ([skins01](https://github.com/makehumancommunity/makehuman-static-website/blob/master/content/Assets/AssetPacks/skins01.md)). **No free saree, kurta, salwar or dupatta exists.** The one free "saree" found is under a royalty-free licence, not CC ([CGTrader](https://www.cgtrader.com/free-3d-models/character/clothing/bangladeshi-saree-blender)). Indian wear must therefore be authored in-house, with the CC0 items as bases:

- **Kurta:** start from the long tunic, then add side slits and a collar.
- **Salwar:** start from the harem pants. **Churidar:** fitted trousers.
- **Blouse:** start from a camisole or crop top.
- **Saree:** model the pleated skirt as a skinned garment. Drape the pallu (and any dupatta) as a separate cloth-simulated mesh, then bake it.

Each garment is written as an `.mhclo` through MPFB's built-in MakeClothes. MPFB then refits every garment to every body shape through barycentric mapping, and copies bone weights from the body ([clothes service](https://github.com/makehumancommunity/mpfb2/blob/master/docs/services/clothesservice.md), [MakeClothes](https://github.com/makehumancommunity/mpfb2/blob/master/docs/ui/create_assets/makeclothes.md)). In the browser, the pallu becomes a spring-bone chain, or a region of **three-simplecloth (MIT)** with sphere colliders on the shoulder and chest ([three-simplecloth](https://github.com/bandinopla/three-simplecloth)). A saree is not a closed tube, so a few drape presets per size range are a likely compromise. That is an inference, and the authoring time is unknown.

The **ffunch/vrm-avatar-maker** project (MIT code, CC0 assets) already fits these garments to MakeHuman bodies live in the browser and exports VRM. It warns that "some packs labelled CC0 contain items under other licenses", and its credits script fails the build on any item whose own header is not CC0 ([README](https://raw.githubusercontent.com/ffunch/vrm-avatar-maker/main/README.md)). Copy that ledger. MPFB's own parser defaults unknown licence lines to CC0, so the parser is not a licence check ([mhclo format](https://github.com/makehumancommunity/mpfb2/blob/master/docs/fileformats/mhclo.md)). Clothes are matched to a photo by MediaPipe's clothes mask, split by Pose landmarks into upper and lower garments. Hem and sleeve length and a diagonal pallu band decide the garment type, and Lab k-means picks the colours. A SegFormer-based parser such as FASHN would be more precise but inherits NVIDIA's non-commercial terms ([FASHN README](https://raw.githubusercontent.com/fashn-AI/fashn-human-parser/main/README.md)).

**Hair** follows the same pattern. Every single-image strand method checked is non-commercial or unclear: HairStep is CC BY-NC, DiffLocks is MPI non-commercial, and Perm's single-view pipeline is "not yet released with a public license" and weak on curly hair ([HairStep](https://raw.githubusercontent.com/GAP-LAB-CUHK-SZ/HairStep/main/LICENSE), [DiffLocks](https://raw.githubusercontent.com/Meshcapade/difflocks/main/LICENSE), [Perm README](https://raw.githubusercontent.com/c-he/perm/main/README.md)). So the pipeline measures instead:

1. Take the union of the photos' hair masks and measure length, volume, parting, fringe, any bun or plait outside the skull outline, and colour.
2. Pick the nearest style from a tagged library. The CC0 hair01 and system sets include braids, buns, bobs and long hair; hair02 and hair03 are better but CC-BY ([hair01](https://github.com/makehumancommunity/makehuman-static-website/blob/master/content/Assets/AssetPacks/hair01.md)).
3. Deform it with a lattice to each photo's hair outline, then recolour it.

South Asian styles (long plait, low bun, oiled centre parting, short curly) should be authored with the MPFB hair editor and the hair-card bake that arrived in October 2026 ([hair editor](https://github.com/makehumancommunity/makehuman-static-website/blob/master/content/Assets/AssetPacks/haireditor.md)). The licence of its templates is not stated.

## Every joint works, and nothing walks or pretends to write

VRM 1.0's humanoid has full finger bones, and the whole run-time motion stack is permissive: three.js with CCDIKSolver, THREE.IK (MIT), Kalidokit (MIT), three-vrm and MediaPipe ([THREE.IK](https://github.com/jsantell/THREE.IK), [Kalidokit](https://registry.npmjs.org/kalidokit/latest)). "Fully customisable with every joint working" means three things here.

- **A joint-limit table per bone.** VRM has no built-in limits, so we author one, and every IK result and every customisation slider is clamped to it.
- **Hand shapes authored once on the finger bones:** point, count 1–5, OK, pinch, open palm and relaxed curl. Quaternius and CMU clips have weak or no fingers.
- **An automated sweep** that drives every bone through its range on every body preset and checks that the skin does not tear or pass through itself.

The motion clips must be clean. **Quaternius UAL 1 and 2 are CC0** and the current player uses only 43 of more than 120 UAL 1 clips ([OpenGameArt UAL](https://opengameart.org/content/universal-animation-library); exact Standard-versus-Pro lists unverified because quaternius.com was unreachable). Mixamo clips are royalty-free inside a product, but they must not be shipped as raw files or used to train a model ([Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html); the training ban comes from a staff forum post, not the terms). CMU MoCap is "free for all uses" short of resale, according to secondary wording ([CMU](https://mocap.cs.cmu.edu/resources.php)).

Every text-to-motion model (MDM, MotionGPT, MoMask, T2M-GPT) has MIT or Apache code but **trains on HumanML3D, which inherits AMASS's non-commercial terms**, so its weights and outputs are unsafe ([HumanML3D](https://github.com/EricGuo5513/HumanML3D)). BEAT2 and EMAGE are tagged Apache-2.0 on Hugging Face. But EMAGE outputs SMPL-X and FLAME, and the README invites "commercial collaboration" by email ([PantoMatrix](https://github.com/PantoMatrix/PantoMatrix)). Treat both as a licence conflict until the authors confirm in writing.

So gesture is rule-based and testable, like Scene Voice. Lesson text and word timings produce tags: counting words → finger counts; "this/here/dekho" → a point at the board; "but/lekin" → a hand flip; stressed words → small beat strokes. Each gesture runs preparation → stroke on the word → hold → retraction. Listening behaviour needs care: **a mistimed nod hurts more than no nod** ([Inden et al., ICMI 2013](https://projet.liris.cnrs.fr/imagine/pub/proceedings/ICMI-2013/icmi/p181.pdf), via a search summary). Nods should come only on a pitch fall plus a pause, and a "thinking" pose should cover the model's response time.

The owner's requirement removes the hardest motion problems. There is no walking, so no root motion, foot locking or navigation. There is no pretend board-writing, so no hand IK tracing strokes. **The whiteboard is a UI panel that opens beside her**, reusing the site's existing teaching board and animation player. Her only link to it is a deictic gesture: the chest turns slightly, a two-bone arm IK reaches toward the panel edge, the gaze shifts to the board and back to the student, all driven by the same word tags. The board is real and the gesture is honest, which also fits the site rule that "animations explain an idea".

## Lip sync failed by being too big, so calibrate to the person

### The voice is Chatterbox, rendered offline, watermarked

**Chatterbox Multilingual V3 (0.5B, MIT code and weights, 23 languages including Hindi) and the dedicated Chatterbox-Multilingual-hi fine-tune (MIT)** are the only strong zero-shot cloners found with Hindi and a clean licence ([Chatterbox card](https://huggingface.co/ResembleAI/chatterbox), [LICENSE](https://raw.githubusercontent.com/resemble-ai/chatterbox/master/LICENSE), [Chatterbox-hi](https://huggingface.co/ResembleAI/Chatterbox-Multilingual-hi)). Every output carries Resemble's **PerTh watermark** (MIT) ([Perth](https://raw.githubusercontent.com/resemble-ai/Perth/master/LICENSE)). That suits the consent and labelling duties below.

The alternatives fall away one by one:

- **F5-TTS:** base weights are CC-BY-NC ([HF](https://huggingface.co/api/models/SWivid/F5-TTS)).
- **XTTS-v2:** non-commercial Coqui licence ([HF](https://huggingface.co/api/models/coqui/XTTS-v2)).
- **Fish Audio:** S1-mini weights are CC-BY-NC-SA, and its community licence caps revenue and bans hosted cloning services ([Fish LICENSE](https://raw.githubusercontent.com/fishaudio/fish-speech/main/LICENSE)).
- **CosyVoice 3 and Qwen3-TTS:** Apache, but neither lists Hindi ([Qwen3-TTS](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-Base)).
- **IndicF5:** tagged MIT but gated, and it credits F5-TTS. Whether it was fine-tuned from the non-commercial base is unknown ([IndicF5](https://huggingface.co/api/models/ai4bharat/IndicF5)).
- **svara-TTS and Veena:** Apache tags, but fixed speakers on a Llama 3.2 lineage.

The backup is Kokoro's four fixed Hindi voices (Apache-2.0, no cloning), with OpenVoice V2's MIT timbre converter as an untested way to move them toward the person's voice ([Kokoro voices](https://huggingface.co/hexgrad/Kokoro-82M/raw/main/VOICES.md), [OpenVoice](https://huggingface.co/api/models/myshell-ai/OpenVoiceV2)). Chatterbox's CPU speed is unmeasured. Plan on lesson narration rendered offline on a GPU. The earlier report found that Colab's free tier forbids serving web traffic and Kaggle bans "server farming" ([Colab FAQ](https://research.google.com/colaboratory/faq.html)), so batch rendering must stay a manual, offline job, and even that should be checked against each service's terms. No published speaker-similarity or MOS figures for Chatterbox in Hindi were found. Our own A/B test is the only evidence there will be.

### Timing from phonemes, shape from audio, size from the person

The current curves come from **wav2arkit_cpu (Apache-2.0, based on LAM Audio2Expression; 52 ARKit values at 30 fps; about 45 ms per second of audio; 1.8 MB ONNX)** ([card](https://huggingface.co/myned-ai/wav2arkit_cpu), [LAM LICENSE](https://raw.githubusercontent.com/aigc3d/LAM_Audio2Expression/main/LICENSE)). It is small enough for the free CPU server, and probably for onnxruntime-web in the browser. Two weaknesses explain the exaggerated demo.

- **Its encoder is English-only.** It is built on wav2vec2-base-960h ([card](https://huggingface.co/myned-ai/wav2arkit_cpu)), so Hindi retroflex and aspirated sounds are a guess.
- **Its curves have no notion of this face.** Applied at full weight to MakeHuman's ARKit targets on a fitted face, they open the jaw as far as the training rig did, not as far as this person does.

The research supports a precise fix rather than simply turning the gain down. In a perceptual study, raters preferred **expressive lips with 100 ms of asynchrony over precise but under-expressive lips, 82.6% to 17.4%** ([Perceptually Accurate 3D Talking Head](https://arxiv.org/html/2503.20308)). So shrinking every curve would trade one failure for another. The right target is *the person's own amplitude*, and the pipeline already has the means to measure it. The consent step records the person reading sentences aloud on camera. `analyse.py` already runs MediaPipe Face Landmarker with blendshape output switched on. Running it over that clip gives the person's real ARKit curves for jawOpen, mouthClose, funnel, pucker and stretch, matched to their audio.

Fit a per-person gain and offset for each mouth channel, so the distribution of generated values on the same sentences matches the real ones. Then cap each channel at the person's own 98th percentile. This is our own proposal, not a published method, but it turns "less exaggerated" into a number we can test.

On top of the calibrated curves sits a deterministic layer in the JALI style: a separate jaw and lip channel driven by phoneme timings, each viseme with attack, apex, sustain and decay ([JALI](https://dgp.toronto.edu/~elf/JALISIG16.pdf)).

- **Dominance blending with hard overrides.** Cohen-Massaro-style dominance blends neighbouring visemes, but it can fail to close the lips on /p b m/, so hard closures for bilabials and lip-to-teeth contact for /f v/ override it.
- **Jaw scaled by loudness.** The jaw channel follows the loudness envelope, which is the expressiveness raters reward.
- **Hindi mapping.** Retroflex stops use the alveolar viseme with a little more jaw. Aspirates get a short open release frame. फ is /pʰ/ in Hindi words but /f/ in Hinglish loanwords. व is a light labiodental. This mapping is phonetic reasoning and needs checking against the person's video.

A JALI-style patent exists (US 10839825), so the team should check it before copying any exact claimed method ([USPTO](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10839825)).

Phoneme timings come from HeadTTS for English Kokoro speech (MIT, English only) ([HeadTTS](https://raw.githubusercontent.com/met4citizen/HeadTTS/main/README.md)). For cloned and Hindi audio they come from a forced aligner. The commercial-safe Hindi model is **ai4bharat/indicwav2vec-hindi (tagged Apache-2.0, gated)**, or its parseh/aligner-hi derivative ([HF](https://huggingface.co/api/models/ai4bharat/indicwav2vec-hindi)), run by a CTC aligner over a Hindi G2P with schwa deletion. English uses MFA (MIT code) or WhisperX (BSD-2), with the acoustic model pinned and its licence read ([MFA](https://raw.githubusercontent.com/MontrealCorpusTools/Montreal-Forced-Aligner/main/LICENSE)). Avoid MMS-based aligners (CC-BY-NC) and the GPL Bournemouth aligner. The quality backup is **NVIDIA Audio2Face-3D v3.0**. Its weights are under the NVIDIA Open Model License: commercially usable, but revocable and with an attribution notice ([licence](https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-open-model-license/)). It needs an NVIDIA GPU with CUDA and TensorRT ([SDK README](https://raw.githubusercontent.com/NVIDIA/Audio2Face-3D-SDK/main/README.md)), so it is for offline lesson rendering only. ARTalk, DiffPoseTalk and UniTalker score better on research benchmarks but output FLAME meshes, not ARKit. SelfTalk and EmoTalk are CC BY-NC ([SelfTalk](https://raw.githubusercontent.com/psyai-net/SelfTalk_release/main/LICENSE)).

## "95% real" and "95% likeness" need definitions before they need code

### Lip-sync realism is a blind test against the person's own video

There is no single "percent real" in the field. SyncNet's LSE-D and LSE-C are the standard automatic scores, but **Wav2Lip scores "better than real" on LRS2 (LSE-D 6.386 against real video's 6.736)**, so SyncNet can be gamed ([Wav2Lip](https://ar5iv.labs.arxiv.org/html/2008.10010)). THEval's study of 85,000 videos found that existing metrics, LSE included, correlate poorly with what people prefer ([THEval](https://arxiv.org/html/2511.04520v2)). Pratibimb's "95% real" should therefore be a set of gates, each scored against the **person's own recorded video of the same sentences**, which is the only fair "real row" for a painted render:

| Gate | Test | Pass mark |
|---|---|---|
| Sync | SyncNet on frontal renders, fixed head pose | LSE-D ≤ real row; LSE-C ≥ real row − 5%; offset ≤ 1 frame; audio never more than 50 ms ahead of the lips ([2503.20308](https://arxiv.org/html/2503.20308)) |
| Amplitude | Generated vs real mouth-channel percentiles on held-out sentences | Within ±15% at the 50th and 95th percentile (our proposal, replaces "exaggerated") |
| Expressiveness | Correlation between mouth opening and loudness (SLCC-style) | ≥ the person's own (VOCASET ground truth is 0.34) |
| Closures | /p b m/ fully closed, /f v/ touching, rounded vowels rounded, per forced-aligned phone | 100% of bilabials; ≥95% of the others |
| Human | Blind pairwise A/B against real footage, same speaker and sentence; ≥20 raters, ≥30 clips, English, Hindi and Hinglish | Avatar chosen ≥45% on "lip sync" and on "naturalness" (a statistical tie) |

The human gate is the honest meaning of "95% real". A tie against real video is the ceiling any method can reach. ARTalk's and DiffPoseTalk's studies used the same pairwise and ground-truth-reference design ([ARTalk](https://arxiv.org/html/2502.20323), [DiffPoseTalk](https://arxiv.org/html/2310.00434)). Two cautions apply. First, SyncNet was trained on real faces, so a painted render may score lower for reasons of style alone; that is why the real row is the person's own video, not LRS2 numbers. Second, the SyncNet weights' licence was not checked. Internal evaluation is lower-risk than shipping them, but someone should still read the licence.

### Likeness needs two judges, matched renders, and an honest ceiling

`likeness.py` scores SFace (OpenCV Zoo, Apache-2.0 repo) render-vs-photo against photo-vs-photo. Its training data was not checked. Pratibimb's bench adds four things.

- **A second judge.** AuraFace-v1 is tagged Apache-2.0 and described as trained on "a commercial dataset". Its data is undisclosed and its card warns that coverage of ethnicities may be limited ([AuraFace card](https://huggingface.co/fal/AuraFace-v1)), so it supplements SFace and does not replace it. Every strong alternative (insightface, AdaFace, ElasticFace, EdgeFace weights) is non-commercial.
- **Matched renders.** Each render matches each photo's fitted camera, expression and approximate lighting. Comparing a neutral render with a smiling, filtered selfie penalises the model unfairly.
- **Geometry checks.** Landmark reprojection error normalised by interocular distance, and silhouette IoU per photo. These do not depend on any recognition network.
- **A human recognition test.** Friends of the person pick their render out of a line-up of renders built from other people's photos.

The gate should be the lower of the two judges, never shape optimised directly against either one, because that overfits the judge.

On the target itself: **95% of the photo ceiling with a painted, non-photo texture is probably not reachable.** Recognition networks rely on photographic skin texture, and painting deliberately removes it. No published identity scores for stylised avatars exist to say what is possible. An honest staged target is this. First, clear SFace's own same-person line (cosine 0.363) on at least 90% of matched renders with both judges. Then raise the ratio by improving shape (outline terms, side views) rather than by putting photo pixels back. Then let the human line-up decide whether she "is" the person. If the owner wants the ratio number specifically, the only lever is to blend more photo-derived albedo into the paint. That conflicts with the "no cut-outs" rule, and he should make the trade knowingly.

### Consent and labelling are a pipeline stage, not a policy page

Consent comes first in the pipeline. Follow HeyGen's and Synthesia's practice: the person in the photos records a live consent statement, and the system checks that the face in the video matches the photos ([HeyGen consent](https://developers.heygen.com/docs/avatar-consent), [Synthesia moderation](https://help.synthesia.io/en/articles/13846500-photo-avatars-content-moderation)). Pratibimb adds:

- **Adults only.** Only someone 18 or over may make an avatar, and only of themselves. This sidesteps the DPDP Rules 2025 verifiable parental consent duty (Rule 10, which comes into force about 18 months after the November 2025 notification) ([SCC Online](https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/)).
- **A plain notice in English and Hindi** of what is captured, why, where it is kept and for how long, and how to withdraw.
- **A randomised consent sentence read on camera.** The same clip doubles as the lip-sync calibration and real-row recording above.
- **Liveness checks.** Passive liveness with Silent-Face-Anti-Spoofing (Apache-2.0 code; weights, accuracy and performance on Indian faces unchecked) ([repo](https://github.com/minivision-ai/Silent-Face-Anti-Spoofing)), plus a head-turn and blink challenge from MediaPipe.
- **Staff review** before publishing, a signed record of hashes, and one-tap withdrawal that deletes photos, voice reference, textures and model.
- **Labels on every output.** A visible "AI-generated" label on every video and on the live 3D view, as the IT Amendment Rules 2026 require for realistic synthetic media (in force about 20 February 2026; exact label wording unverified against the Gazette) ([Business Today](https://www.businesstoday.in/technology/story/govt-tightens-rules-on-ai-generated-content-mandates-labels-and-faster-takedowns-515505-2026-02-10)). C2PA credentials go on MP4 and PNG exports via c2pa-rs or c2pa-js (MIT) ([c2pa-rs](https://github.com/contentauth/c2pa-rs)). C2PA support for GLB or VRM files is unconfirmed.

The founder's own avatar goes through the same flow.

## A build order that fixes what the owner saw first

The order follows two rules: fix the two visible complaints before rebuilding the foundations, and never ship a part whose licence is still marked unverified.

**Phase 0 (licence reads and benches, about a week).** A human reads the primary pages for: FLAME 2023 Open and its embeddings, Silent-Face weights, the gated indicwav2vec and IndicF5 cards, AuraFace, LaMa's data, Quaternius Standard versus Pro, CMU, Rokoko, the pmndrs/postprocessing text, the SyncNet weights, the Chatterbox weights' terms, and the GPU services' terms for offline batch rendering. In the same week, build both benches: the matched-render, two-judge likeness bench and the five-gate lip-sync bench. Record the founder's consent and reference video so every later change has a real row to beat.

**Phase 1 (fix the demo).** Calibrate wav2arkit curves to the founder's own blendshape percentiles. Add the phoneme layer with hard closures (HeadTTS timings in English first). Replace the anime feature strokes and the `cv2.stylization` pass with value-shift features and the region-masked Kuwahara bake. Swap the toon shader for the wrap-lit, pre-integrated, face-shadow-mapped shader. Success means the amplitude and closure gates pass, and the owner picks the new render over the old in a blind side-by-side.

**Phase 2 (face foundations).** Fit FLAME with landmark and outline terms on the CPU, carry it onto MPFB, and add SH delighting, multi-view texel weights, mirror and LaMa fill, and the mole and iris decals. Success is lower reprojection error and higher IoU on every test person, with the two-judge ratio rising on a fixed set of people of varied gender, age and skin tone.

**Phase 3 (body, outfits, hair).** Silhouette and height body fit, the CC0 wardrobe with a licence ledger, then in-house kurta, salwar, churidar, blouse and saree with spring-bone or simplecloth drape. Hair measurement and card fitting, plus the authored South Asian hair styles. Success is girth error against tape measurements on volunteers, mask IoU for hair and clothes, and a frame-rate floor on a mid-range Android phone.

**Phase 4 (voice).** Chatterbox V3 and the Hindi fine-tune, offline. The indicwav2vec aligner for Hindi and Hinglish timings. The watermark checked on every file. Success is a blind A/B of the voice against the real voice, Hindi ASR error rates, and the full lip-sync gate set in all three language modes.

**Phase 5 (joints, gestures, board).** The joint-limit table and range sweep, finger poses, the rule-based gesture planner, the listening and thinking states, and the board panel with a deictic gesture. Success is zero skin tears in the sweep, and gestures landing within one frame of their words.

**Phase 6 (consent at scale and the human gates).** The full consent flow, labels and C2PA. Then the 20-rater, 30-clip A/B tests and the friend line-up test, which are the gates that decide whether Pratibimb has earned "95% real".

## Conclusion

The research changes what the main problem looks like. The exaggerated lips and the cartoonish look were not shortfalls in model quality that a bigger model would cure. Both came from missing references. The lips had no measure of how far *this* person's mouth moves. The painting borrowed anime conventions for a face meant to read as a real person. The consent recording the pipeline needs for legal reasons turns out to give the lip-sync reference too, and the measured-points approach the owner asked for is also the one the licences allow. So one fixed pipeline can be legal, free and fair across faces, *provided* the team accepts optimisation over regression, and its own libraries of clothes and hair over research reconstructions.

The biggest remaining uncertainties are not technical. They are: whether the FLAME 2023 Open licence reads as reported; whether Chatterbox's Hindi clones survive a blind test; and whether the owner prefers a painted face that friends recognise to a recognition score that only photo pixels can push past about 90%. Those three answers, all cheap to get, should come before any large build.
