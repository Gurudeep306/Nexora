# Body shape, clothing and hair for the Pratibimb photo-rigged teacher avatar

Research date: 2026-11-25. Network note: this session could reach github.com and
raw.githubusercontent.com but NOT huggingface.co, smpl-x.is.tue.mpg.de,
static.makehumancommunity.org or registry.opendata.aws. Licence facts below are
marked **[verified: file read]** when the LICENSE/README text was read this session,
and **[unverified]** when they come only from search snippets or prior knowledge.

## 1. Body shape from a few photos, mapped onto a rigged CC0 body

### Takeaway
No commercial-OK, ready-made "photos to MakeHuman shape" model exists. The free and
legal route is to fit the CC0 MakeHuman/MPFB2 body itself: take height from the
user, get front and side silhouettes (SAM 2 or BiRefNet, plus MediaPipe), estimate
girths from silhouette widths, then solve MPFB's macros and `measure-*` targets so
the mesh's measured widths and girths match. Meta's SAM 3D Body can be used
commercially, so it can give a body-shape prior or a check. SMPL-family models
and NAVER's Anny-Fit are non-commercial: avoid them.

### Cited Findings
**Body models and their licences**
- NAVER **Anny**: the code is Apache-2.0 (Copyright 2025 NAVER Corp.) [verified: file read]. "MakeHuman assets adapted from MPFB2 are under CC0 1.0", and the Face Units assets are CC0. The "soma" topology is Apache-2.0 (from SOMA-X). The **"smplx" topology is non-commercial only** and downloaded separately. The "full" install pulls in non-free dependencies — [naver/anny README](https://github.com/naver/anny); [LICENSE](https://raw.githubusercontent.com/naver/anny/main/LICENSE)
- Anny capabilities: a differentiable PyTorch body from "infants to elders". High-level phenotype parameters lie in [0,1] and local shape changes in [-1,1]. It has hand and face part models and facial-expression blendshapes. Its default rig `anny` has 104 bones; `rig="makehuman"` gives the full 163-bone MakeHuman rig. Its topology is derived from MakeHuman, so it is directly compatible with our MPFB2 base — [naver/anny](https://github.com/naver/anny)
- Anny paper "Human Mesh Modeling for Anny Body" (arXiv 2511.03589, NAVER LABS Europe, Nov 2025): Anny is "scan-free" and grounded in MakeHuman anthropometry. Anny-One is a synthetic set of about 800k images. HMR models trained on it are reported as competitive, and as better when body shapes vary widely. No licence was found for Anny-One itself — [arXiv](https://arxiv.org/abs/2511.03589v2); [NAVER blog](https://europe.naverlabs.com/blog/anny-a-free-to-use-3d-human-parametric-model-for-all-ages/)
- **Anny-Fit** (image to Anny mesh fitting; multi-person, all ages; initialised from Multi-HMR plus detectron2) is under a **NAVER Non-Commercial License**: "The Materials are used solely for non-commercial purposes… You may not use the Materials or derivatives thereof for any commercial purpose" [verified: file read]. The Materials include "models, model checkpoints, and data" — [anny-fit LICENSE.txt](https://raw.githubusercontent.com/naver/anny-fit/main/LICENSE.txt); [repo](https://github.com/naver/anny-fit)
- **SAM 3D Body** (Meta, CVPR 2026) recovers the full body (body, feet and hands) from one image, outputs the **Momentum Human Rig (MHR)**, and claims "better shape recovery". The checkpoints and code are under the **SAM License**, which grants a "non-exclusive, worldwide, non-transferable and royalty-free limited license … to use, reproduce, distribute, copy, create derivative works of, and make modifications". It has no non-commercial clause. It does have restrictions: trade controls, and no military, nuclear, espionage or weapons use [verified: file read] — [sam-3d-body LICENSE](https://raw.githubusercontent.com/facebookresearch/sam-3d-body/main/LICENSE); [README](https://raw.githubusercontent.com/facebookresearch/sam-3d-body/main/README.md)
- **MHR** (the body model SAM 3D Body outputs) is Apache-2.0 [verified: file read] — [facebookresearch/MHR LICENSE](https://raw.githubusercontent.com/facebookresearch/MHR/main/LICENSE). Secondary sources had disagreed about this licence; the primary file settles it — [search summary of mirrors](https://huggingface.co/facebook/sam-3d-body-dinov3/blob/main/README.md)
- **SMPL / SMPL-X / STAR**: the licence page could not be reached from this session (host blocked). From prior knowledge **[unverified this session]**, the MPI licences allow non-commercial scientific use only, and commercial use needs a separate paid licence (sold through Meshcapade). Anny's own README confirms that its SMPL-X topology is "non-commercial use only" — [naver/anny](https://github.com/naver/anny)

**Measurements from silhouettes**
- **BodyM** dataset (Amazon): 8,978 front and side silhouettes of 2,505 real people, with height, weight and 14 body measurements. The method from the same work, **BMnet**, predicts measurements from two silhouettes. No code release was found, and the dataset licence was not readable (host blocked) **[unverified]** — [arXiv 2205.14347 / ar5iv](https://ar5iv.labs.arxiv.org/html/2205.14347); [AWS registry](https://registry.opendata.aws/bodym/)
- Related papers: "Human Body Measurement Estimation with Adversarial Augmentation" — [ar5iv 2210.05667](https://ar5iv.labs.arxiv.org/html/2210.05667); the BODY-fit silhouette benchmark — [ICPR 2020 demo paper](https://www.micc.unifi.it/icpr2020/wp-content/uploads/demos/s3.4-paper.pdf)
- A simple practical approach takes front and side images and fits an **elliptical cross-section** model calibrated by the person's real height (the licence was empty) — [live-measurements-api](https://awesome.ecosyste.ms/projects/github.com%2Fjavtahir%2Flive-measurements-api)
- Silhouette tools: **SAM 2** is Apache-2.0 [verified: file read] — [sam2 LICENSE](https://raw.githubusercontent.com/facebookresearch/sam2/main/LICENSE). **BiRefNet** is MIT [verified: file read] — [BiRefNet LICENSE](https://raw.githubusercontent.com/ZhengPeng7/BiRefNet/main/LICENSE)

**MakeHuman/MPFB2 measurement targets** (all in the CC0 MPFB2 repo, each as an `-incr`/`-decr` pair) [verified: file list read] — [mpfb2 repo](https://github.com/makehumancommunity/mpfb2)
- torso: `measure-bust-circ`, `measure-underbust-circ`, `measure-waist-circ`, `measure-hips-circ`, `measure-frontchest-dist`, `measure-shoulder-dist`, `measure-napetowaist-dist`, `measure-waisttohip-dist`
- neck: `measure-neck-circ`, `measure-neck-height`
- arms: `measure-upperarm-circ`, `measure-upperarm-length`, `measure-lowerarm-length`; hands: `measure-wrist-circ`
- legs: `measure-thigh-circ`, `measure-knee-circ`, `measure-calf-circ`, `measure-upperleg-height`, `measure-lowerleg-height`; feet: `measure-ankle-circ`

### Inferences
- Recommended pipeline (all commercial-OK):
  1. Ask for height (needed for metric scale) and, optionally, weight.
  2. From a front and a side photo (A-pose, fitted clothes), make silhouettes with BiRefNet or SAM 2, cleaned with MediaPipe multiclass selfie segmentation (hair and clothes classes) and Pose landmarks for levels: shoulder, bust, waist, hip, thigh, knee, calf.
  3. At each level, front width a and side depth b give a girth by the ellipse (Ramanujan) approximation. Calibrate it once against the real MPFB mesh, by slicing the MakeHuman body at the same levels, rather than trusting ellipses alone.
  4. Optimise: first the macros (gender, age, weight, muscle, height, proportions) by least squares on height plus the main girths, then the `measure-*` targets for residuals. Measure the mesh with loops of base-mesh vertices (the hm08 topology is fixed, so a vertex loop per girth is defined once). Fitting in Python/numpy offline is enough, since the targets are linear offsets. A browser version is possible because the targets are sparse vertex deltas.
  5. Optionally run SAM 3D Body on one photo as a second opinion for proportions (MHR to MakeHuman needs a retarget; licence OK).
- Clothes inflate girths. Loose garments (saree, kurta, salwar) make waist and hip estimates unreliable. Ask for fitted clothes, or treat the clothed silhouette as an upper bound and trust only the levels where the garment hugs (shoulders, upper arm, neck). Show sliders so the person can correct the result.
- Anny is attractive as a differentiable optimiser for the same CC0 MakeHuman shape space (Apache-2.0 code, CC0 assets). A team could write its own silhouette-fitting loss on Anny with PyTorch3D-style differentiable rendering. Using Anny-Fit or its checkpoints commercially is not allowed.

### Gaps
- No published accuracy figures were read for silhouette-to-measurement methods with clothes on. BodyM/BMnet numbers are in the paper but were not extracted. The BodyM licence is unverified.
- The SAM 3D Body checkpoints are on Hugging Face (blocked). No MHR to MakeHuman shape-transfer tool was found.
- The SMPL/SMPL-X/STAR licence text was not re-read this session.

## 2. Clothing assets, fitting and authoring (including Indian wear)

### Takeaway
The MakeHuman community asset packs give a large, legally clean wardrobe: shirts, trousers, formal suits and blazers, dresses, skirts, harem pants and a kimono. Each item is CC0 or CC-BY, listed per item. There is **no saree, kurta, salwar or dupatta** in any pack, and no verified CC0 saree exists on Sketchfab. Indian wear must be authored in-house: Blender cloth simulation, baked, exported through MPFB MakeClothes as `.mhclo`, which then refits to every body shape automatically. The open-source vrm-avatar-maker (MIT code, CC0 assets) already does in-browser fitting of these garments to a MakeHuman body with VRM export, and is the closest reference implementation.

### Cited Findings
**MakeHuman asset packs (licence per item, from the pack pages)** — [AssetPacks index and pages](https://github.com/makehumancommunity/makehuman-static-website/tree/master/content/Assets/AssetPacks)
- System assets (CC0): `male_casualsuit01–06`, `male_elegantsuit01`, `male_worksuit01`, `female_casualsuit01/02`, `female_elegantsuit01`, `female_sportsuit01`, `shoes01–06`, `fedora01`; proxy meshes `male_generic`, `female_generic`, `proxy741` and others; hair `afro01`, `bob01/02`, `braid01`, `long01`, `ponytail01`, `short01–04`
- **suits01 (CC0, by MargaretToigo)**: `toigo_female_suit`, `toigo_female_suit_2`, `toigo_female_double-breasted_suit`, `toigo_male_suit_3`, `toigo_male_suit_tie_and_jacket`, `toigo_male_double-breasted_suit`, `toigo_suit_with_dinner_jacket`, `toigo_suit_with_jacket_and_bowtie` (blazer and shirt-trousers looks)
- **shirts01 (CC0)**: `namuhekam_male_polo_shirt`, `toigo_basic_tucked_t-shirt`, `toigo_fisherman_sweater`, `toigo_bodice-style_top`, `toigo_camisole_top` and others
- **pants01 (CC0)**: `toigo_wool_pants`, `toigo_harem_pants` (a possible base for salwar or dhoti-style pants), `cortu_cargo_pants`, `cortu_jeans_shorts`
- **skirts01 (CC0)**: `toigo_long_full_skirt` (a possible base for a lehenga or a saree's under-skirt look), `toigo_tiered_skirt` and others
- **dress01 (CC0)**: `mindfront_kimono`, `wdg_mycenaean_tunic` (long-tunic base, kurta-like), `toigo_shift_dress` and others
- CC-BY packs (credit required): shirts02 (`elvs_male_shirt_tie_tucked1`, `elvs_male_shirt_untucked_bd1`, `mindfront_cardigan_long_open_front`), pants02 (`elvs_male_trouser`, `mindfront_female_trousers_1`, `mindfront_male_trousers_1/2`), suits03 (`mindfront_m_suit_01`), dress02 (`elvs_sarong_cover_up`, `elvs_goddess_dress1–8`), shirts03 (`drednicolson_asymmetric_tunic_and_sash`)
- CC0 skins include `cutoff3d_indian_female_skin` and `cutoff3d_indian_female_enhanced` (skins01) — [skins01.md](https://github.com/makehumancommunity/makehuman-static-website/blob/master/content/Assets/AssetPacks/skins01.md)
- The pack FAQ defines CC-BY as "do whatever you want … as long as you give credit to the author" — [faq.md](https://github.com/makehumancommunity/makehuman-static-website/blob/master/content/Assets/AssetPacks/faq.md)
- Warning from vrm-avatar-maker: "Only use items whose own `.mhclo`/`.mhmat` header says CC0: some packs labelled CC0 contain items under other licenses". Their `make_credits.py` "fails if any item's own files don't say CC0" — [vrm-avatar-maker README](https://raw.githubusercontent.com/ffunch/vrm-avatar-maker/main/README.md)
- The MPFB mhclo parser reads licences loosely: any line containing "by" gives CC-BY, and anything unmatched defaults to CC0. So parser output is not a reliable licence check; read the header text — [mpfb2 docs/fileformats/mhclo.md](https://github.com/makehumancommunity/mpfb2/blob/master/docs/fileformats/mhclo.md)

**Indian garments**
- I found no CC0 or CC-BY saree, kurta or salwar. The saree results were paid or royalty-free CGTrader listings, and one free "Bangladeshi Saree" on CGTrader carries a royalty-free licence, not CC — [CGTrader free saree](https://www.cgtrader.com/free-3d-models/character/clothing/bangladeshi-saree-blender). No pack page mentions sari, kurta, salwar or dhoti (grep of all pack pages this session).

**How fitting works (MPFB2)**
- In an `.mhclo` file, each garment vertex maps to three base-mesh vertices with barycentric weights plus a scaled offset. `fit_clothes_to_human` refits the garment to the current shape keys, and `interpolate_weights` copies bone weights from the body through the same mapping (weights below 0.001 are dropped). Optional `.mpfbskel` sub-rigs and custom weight files are supported — [clothesservice.md](https://github.com/makehumancommunity/mpfb2/blob/master/docs/services/clothesservice.md)
- **MakeClothes is now inside MPFB2** (Create assets → MakeClothes). Steps: build the xref cache, extract or mark the object type (Clothes/Hair/…), set metadata including licence, use a MakeSkin material, optionally paint a delete group (body vertices to hide), validate, then write `.mhclo` + `.mhmat` + `.obj` — [makeclothes.md](https://github.com/makehumancommunity/mpfb2/blob/master/docs/ui/create_assets/makeclothes.md). An older 2022 release note said the port had "hardly started"; the current code and docs supersede that — [MPFB 2.0-alpha2 notes](https://static.makehumancommunity.org/mpfb/releases/release_20a2.html)
- MPFB 2.x needs Blender 4.2 or later — [mpfb2 README](https://raw.githubusercontent.com/makehumancommunity/mpfb2/master/README.md)

**Reference implementation**
- **ffunch/vrm-avatar-maker** (MIT, 2026): realistic VRM 1.0 avatars in the browser. "Bodies, skins and clothes come from the MakeHuman community's CC0 assets, fitted live in the browser as you move the sliders." It has spring-bone hair, visemes, a "From a photo" beta (MediaPipe face and hair: face shape, skin tone, eye and hair colour), a budget of at most 40k triangles, 16 materials, 2048 px textures and 20 MB, a recipe stored inside the VRM, and `paint_garments.py` ("our own garment designs, painted onto the texture of an existing CC0 garment by position on the body") — [README](https://raw.githubusercontent.com/ffunch/vrm-avatar-maker/main/README.md); [LICENSE (MIT)](https://raw.githubusercontent.com/ffunch/vrm-avatar-maker/main/LICENSE)

**Browser cloth and secondary motion**
- three-vrm is MIT [verified]. From v3 it has WebGPURenderer support (`MToonNodeMaterial`), and spring bones are in `@pixiv/three-vrm-springbone` — [three-vrm LICENSE](https://raw.githubusercontent.com/pixiv/three-vrm/dev/LICENSE); [springbone README](https://cdn.jsdelivr.net/npm/@pixiv/three-vrm-springbone@3.4.4/README.md)
- **three-simplecloth** (MIT, 2026, based on three.js's `webgpu_compute_cloth`): vertex-paint parts of a skinned mesh red, and they blend from skinned to cloth. It has sphere colliders that "stick to" named bones. The author advises keeping cloth parts as separate meshes under the same rig — [README/LICENSE](https://github.com/bandinopla/three-simplecloth)
- A WebGPU mass-spring cloth paper (2025) reports 60 fps at up to 640K nodes (desktop GPU) — [arXiv 2507.11794](https://arxiv.org/html/2507.11794v1)
- Spring-bone collider workarounds (for example, shrinking head colliders) are common for hair and skirts — [N.E.K.O vrm-springbone skill](https://skills.sh/project-n-e-k-o/n.e.k.o/vrm-springbone-physics)

**Fabric textures** **[unverified this session: licence pages not fetched]**: ambientCG and Poly Haven publish their textures as CC0 (prior knowledge) — [ambientCG](https://ambientcg.com/); [Poly Haven licence](https://polyhaven.com/license)

**VRoid**
- Base model meshes, clothing meshes and presets are pixiv's property. Commercial use of presets is broadly allowed "unless the item's license adds special conditions". Exported models can be sold or streamed. Textures and hair you make yourself belong to you — [VRoid Studio Guidelines](https://vroid.com/en/studio/guidelines); [conditions of use](https://developer.vroid.com/en/guidelines/conditions_of_use.html). Full terms (Articles 5 and 11) were not read **[unverified]**. There are also some CC0 VRoid-made models on OpenGameArt — [VRoid Studio CC0 models](https://opengameart.org/content/vroid-studio-cc0-models)

### Inferences
- Authoring plan for Indian wear (one-time art work, free tools):
  - **Kurta**: start from `wdg_mycenaean_tunic` or a CC0 long shirt, add side slits and a mandarin collar, run MakeClothes.
  - **Salwar**: start from `toigo_harem_pants` (CC0).
  - **Churidar**: tight trousers.
  - **Saree**: model the petticoat and pleats as a skinned garment, with the pallu as a separate mesh draped by Blender cloth simulation in the rest pose, then baked. In the browser the pallu (and dupatta) becomes either a spring-bone chain or a three-simplecloth region with sphere colliders on the shoulder, chest and upper arm.
  - **Blouse**: from `toigo_camisole_top` or a crop top. **Blazer** and **shirt-trousers**: use suits01 directly (CC0).
  - The saree is not a closed tube. The mhclo mapping keeps it attached to the waist and hips, but the drape needs per-body re-simulation or a tolerant offset, so a few size presets may be needed.
- Keep a per-item licence ledger generated from the mhclo headers, as vrm-avatar-maker does. Ship CC0 by default, and CC-BY only with a credits page.

### Gaps
- No free, CC-licensed Indian garment exists to reuse. The time needed to author one is unknown.
- The cost of browser cloth simulation on low-end Android phones was not measured. Spring bones are the safe default.

## 3. Garment from photo: recognise, recolour, re-texture

### Takeaway
Use segmentation plus colour and pattern extraction to pick a garment from our own catalogue, then recolour or re-texture it. Do not reconstruct garments from images with research models. Most clothes parsers inherit non-commercial licences (NVIDIA SegFormer). ChatGarment code is Apache-2.0 and GarmentCode is MIT, but their weights and data terms (and an SMPL dependency) are unverified.

### Cited Findings
- **FASHN Human Parser** (SegFormer-B4, 18 classes, made for virtual try-on) "inherits the NVIDIA Source Code License for SegFormer" — [fashn-human-parser README](https://raw.githubusercontent.com/fashn-AI/fashn-human-parser/main/README.md). The NVIDIA SegFormer licence allows use "non-commercially … for research or evaluation purposes only" [verified: file read] — [NVlabs/SegFormer LICENSE](https://raw.githubusercontent.com/NVlabs/SegFormer/master/LICENSE)
- `mattmdjaga/segformer_b2_clothes` is fine-tuned on the ATR dataset. It is SegFormer-based, so the same NVIDIA restriction likely applies **[unverified]** — [model card](https://huggingface.co/mattmdjaga/segformer_b2_clothes)
- **ChatGarment** (CVPR 2025, built on LLaVA and LISA): the repo LICENSE is Apache-2.0 [verified]. The weights' terms and the LLaVA base-model terms are unverified — [ChatGarment](https://github.com/biansy000/chatgarment); [LICENSE](https://raw.githubusercontent.com/biansy000/ChatGarment/main/LICENSE)
- **GarmentCode** (parametric sewing patterns, with GarmentCodeData, "the first open, large-scale dataset of made-to-measure garments") has MIT code [verified] — [GarmentCode LICENSE](https://raw.githubusercontent.com/maria-korosteleva/GarmentCode/main/LICENSE); [GarmentCodeData paper](https://arxiv.org/pdf/2405.17609). The dataset's licence and its body model are unverified.
- MediaPipe multiclass selfie segmentation (already in use) gives hair, body-skin, face-skin and clothes classes. vrm-avatar-maker vendors MediaPipe Tasks Vision and its face and hair models as Apache-2.0 — [vrm-avatar-maker README](https://raw.githubusercontent.com/ffunch/vrm-avatar-maker/main/README.md)

### Inferences
- A practical, licence-safe pipeline:
  1. Take the MediaPipe "clothes" mask and split it into upper and lower parts using Pose landmarks (shoulder, hip, knee). Garment length (hip, knee or ankle), sleeve length (from the elbow and wrist mask) and the presence of a pallu (a diagonal band across the torso to the shoulder) decide the type: shirt, kurta, saree or blazer.
  2. Take the main colours with k-means in Lab space, ignoring shadows.
  3. Classify the pattern (plain, stripes, checks, print) from FFT and edge statistics, or with a commercial-OK CLIP-style zero-shot classifier (licence to be checked).
  4. Recolour by multiplying the CC0 garment's albedo (kept as greyscale plus a mask) by the colour. Tile a crop of the photo's fabric as a pattern only when the person owns the photo.
- Avoid FASHN or SegFormer clothes parsers in production unless a commercially licensed alternative is confirmed.

### Gaps
- No commercial-OK fine-grained clothes parser was verified. SCHP and Sapiens licences were not found (Sapiens is believed to be CC-BY-NC, **unverified**).
- The ChatGarment and GarmentCodeData weights and data licences were not read (Hugging Face was blocked).

## 4. Hair

### Takeaway
There are CC0 hair meshes in MakeHuman system assets and hair01. Better high-poly hair is in hair02 and hair03, but those are CC-BY and need credit. MPFB2 now has a geometry-nodes hair editor and hair-card generation and baking (Oct 2026), so custom Indian hairstyles (long braid, bun, oiled straight hair) can be made as hair cards and exported. In the browser, animate hair with VRM spring bones, and give it anisotropic (Kajiya-Kay/Marschner-style) shading plus alpha-to-coverage or dithered transparency.

### Cited Findings
- **hair01 (CC0)**, mostly low-poly and stylised: `elvs_double_mh_braid`, `elvs_french_braid_variation`, `elvs_reverse_french_braid_bun`, `elvs_unkempt_french_braid`, `rehmanpolanski_hair_bun_brown`, `o4saken_long01`, `toigo_blunt_bob`/`_with_bangs`, `toigo_inverted_bob`, `toigo_curled_under_bob`, `littleright_bobcut_hair`, `cortu_short_messy_hair`, `culturalibre_hair_01/02/05/06`, `faydaen_hair_1` and others — [hair01.md](https://github.com/makehumancommunity/makehuman-static-website/blob/master/content/Assets/AssetPacks/hair01.md)
- **hair02 (CC-BY, Elvaerwyn, "mostly high-poly")**: `elvs_braid_bun`, `elvs_braided_rows`, `elvs_50s_updo`, `elvs_wavy_bob`, `elvs_micky_afro`, `elvs_short_side_do`, `elvs_maxwell_hair` and others. **hair03 (CC-BY)**: `punkduck_alpha7_long/long2/curly/curly2`, `o4saken_curly01`, `culturalibre_hair_11–18` and others — [hair02.md](https://github.com/makehumancommunity/makehuman-static-website/blob/master/content/Assets/AssetPacks/hair02.md); [hair03.md](https://github.com/makehumancommunity/makehuman-static-website/blob/master/content/Assets/AssetPacks/hair03.md)
- System hair (CC0): `afro01`, `bob01/02`, `braid01`, `long01`, `ponytail01`, `short01–04`, plus extra material packs (system_hair_materials01/02, CC0) — [makehuman_system_assets.md](https://github.com/makehumancommunity/makehuman-static-website/blob/master/content/Assets/AssetPacks/makehuman_system_assets.md)
- The **Hair editor** pack (updated 2026-10-24) has "geometry nodes hair and fur" blend files with template styles by Tomáš Klecer, and "prepares for upcoming hair card bake feature of MPFB" — [haireditor.md](https://github.com/makehumancommunity/makehuman-static-website/blob/master/content/Assets/AssetPacks/haireditor.md); [_index.md](https://github.com/makehumancommunity/makehuman-static-website/blob/master/content/Assets/AssetPacks/_index.md). The MPFB2 source already contains `haircardservice.py`, `hairbakeservice.py` and `generate_hair_cards_operator.py` (a Brno University of Technology thesis extension, dated 19.10.2026) — [mpfb2 repo](https://github.com/makehumancommunity/mpfb2). The licence of the hair-editor templates was not stated on the pack page **[unverified]**.
- vrm-avatar-maker ships "hair that sways (spring bones)" and colour matching of hair from a photo via MediaPipe's hair segmenter — [README](https://raw.githubusercontent.com/ffunch/vrm-avatar-maker/main/README.md)

### Inferences
- Matching a hairstyle from the photo: from the MediaPipe hair mask, measure the length (the lowest hair pixel against the shoulder and chest landmarks), the volume (mask width against head width), the parting and fringe (hair pixels above the brow line), and the presence of a bun or braid (a blob behind or below the head in the side photo). Pick the nearest item from a tagged catalogue, then set its colour from the mask's median Lab colour.
- Indian looks to author: long single plait (`braid01` or `elvs_double_mh_braid` as a base), low bun, oiled straight hair with a centre parting, short male side-part. Build them with the MPFB hair editor and bake them to cards. Give braids and long hair spring-bone chains with a head, neck and upper-back collider.
- Shading: three.js `MeshPhysicalMaterial` has `anisotropy` and `sheen`. A custom Kajiya-Kay shader with two shifted specular lobes and a tangent from the card UVs gives the "real hair" look cheaply.

### Gaps
- No CC0 hair library with true Indian styles was found outside MakeHuman.
- The hair-editor template licence and the hair-card output quality were not verified.

## 5. Customisation UX references

### Takeaway
The best free reference is vrm-avatar-maker: MakeHuman-based, CC0, browser-only, with VRM export and a recipe in the file. Its controls (body, face, skin, eyes, hair, beard, glasses, hats, clothes, makeup, ready-made avatars, "Surprise me", photo beta, share link) match what Pratibimb needs. I did not read detailed slider lists for VRoid Studio, Ready Player Me or Character Creator this session.

### Cited Findings
- vrm-avatar-maker's offer: "body, face, skin, eyes, hair, beard, glasses, hats, clothes and makeup"; ready-made avatars; "Surprise me"; a live seated or standing preview; "From a photo (beta)" with three shots (straight on, then turned a little each way); "Copy link" (the recipe in the URL fragment); "Download as GLB"; and "Fix my VRM" for budget — [README](https://raw.githubusercontent.com/ffunch/vrm-avatar-maker/main/README.md)
- MakeHuman/MPFB's exposed controls are the macros (gender, age, weight, muscle, height, proportions) plus measurement targets (see section 1) — [mpfb2 targets](https://github.com/makehumancommunity/mpfb2)
- VRoid lets creators set their own terms for their models, textures and items, including commercial permission, and VRM metadata stores the permission (VRM 0.0 has a "non-profit only" option) — [VRoid guidelines](https://vroid.com/en/studio/guidelines)

### Inferences
- Suggested Pratibimb panel, simple first with advanced options folded away:
  - **Body**: height in cm, build (from the photo), and a "measurements" drawer for bust, waist, hip, shoulder and arm length, driving the `measure-*` targets.
  - **Outfit**: type chips (Saree, Kurta + salwar, Shirt + trousers, Blazer), then colour swatches taken from the photo, a pattern, and border colour (saree).
  - **Hair**: style chips, length, colour.
  - **Extras**: bindi, glasses, earrings (the jewelry01/02 packs exist; licences not checked).
  - Also: "Match my photo" to re-run the estimate, and "Reset to photo".
  - Store the recipe inside the VRM, as vrm-avatar-maker does.

### Gaps
- The VRoid Studio, Ready Player Me (its consumer service shut down after its acquisition — **unverified**) and Reallusion Character Creator control lists were not researched in this session.
