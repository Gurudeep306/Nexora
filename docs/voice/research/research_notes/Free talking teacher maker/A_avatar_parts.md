# Free, commercially usable 3D avatar part libraries and base models for a browser "Teacher Maker"

Research date: 2026-11-24. Network note: in this session vroid.com, static.makehumancommunity.org,
arxiv.org, hackmd.io and m3-org.github.io could not be fetched (blocked by the session's allowed
domains). Those parts rely on search-engine snippets of the official pages, and are marked. GitHub
(raw files and REST API) worked, so the repo licence findings come from the files themselves.

## 1. M3-org CharacterStudio: code licence, asset pack licences, expressions/visemes, look

### Takeaway
The CharacterStudio code is MIT, so it is safe to build on. Its asset packs (loot-assets,
memelotsqui/character-assets, Anata) have **no licence file I could find**, so treat them as
**excluded** until a written licence turns up. I found no evidence that its parts carry VRM
visemes or expressions.

### Cited Findings
- The `LICENSE` file is the plain MIT text, "Copyright (c) 2022 Atlas Foundation". — [CharacterStudio LICENSE (raw)](https://raw.githubusercontent.com/M3-org/CharacterStudio/main/LICENSE)
- The README calls it an "Open-source MIT licensed codebase". It says "You need loot-assets imported to public folder for this to work!", lists memelotsqui/character-assets as sample assets, and lists export to glb and VRM plus screenshots. The demo is studio.m3org.com. The README does not name lip sync, visemes or facial expressions; its features mention "programmable animations". — [CharacterStudio README](https://github.com/M3-org/CharacterStudio)
- `M3-org/loot-assets` has no LICENSE file (raw `LICENSE` returns 404). Its README is only a checklist of "Loot (for Adventurers)" item names (weapons, robes, helms…) with links to lootproject.com and OpenSea. — [loot-assets README](https://raw.githubusercontent.com/M3-org/loot-assets/main/README.md)
- `memelotsqui/character-assets` also has no LICENSE file (404). Its README is the same Loot checklist, plus a manifest script ("npm run create-json"). — [character-assets README](https://raw.githubusercontent.com/memelotsqui/character-assets/main/README.md)
- The only lead on a licence for Anata assets is an internal HackMD planning note with a task to "provide links to CCO assets to be released with Character Studio". It states no licence for Anata. — [HackMD anata-character-studio (search snippet only)](https://hackmd.io/@XR/anata-character-studio)
- The CharacterStudio docs keep asset packs separate from the program and use manifest files. — [CharacterStudio docs: manifest files (search snippet only)](https://m3-org.github.io/characterstudio-docs/docs/Modders/manifest-files/overview)

### Inferences
- The look is fantasy/NFT ("Loot", Anata anime NFT). It is not a teacher wardrobe. Even if the licence were clear, the parts would need replacing.
- CharacterStudio's real value is its **MIT code**: the manifest-driven part picker, VRM export and atlas/merge logic. We could reuse that code with our own CC0 parts.

### Gaps
- No licence for Anata assets was found (the HackMD page could not be fetched). I don't know whether Anata NFT art is under a holder-only licence.
- Couldn't verify whether CharacterStudio's sample parts contain VRM expression morphs. Inspecting a downloaded `.vrm` would answer it.
- I couldn't open studio.m3org.com in this session, so I can't judge its look first-hand.

## 2. "vrm-avatar-maker" (browser VRM 1.0 builder, CC0 assets, MIT code)

### Takeaway
The repo is **github.com/ffunch/vrm-avatar-maker** (demo: https://avatars.somanyrooms.com/). The code is
MIT and every asset is CC0, taken from MakeHuman via MPFB 2. It exports VRM 1.0 with blink, the aa/ih/ou/ee/oh
visemes and emotions, so it is fully commercial and generator-friendly. **But it is deliberately
realistic, "not anime"**, so it doesn't match a soft-3D anime look out of the box.

### Cited Findings
- The repo is described as: "Make a realistic VRM 1.0 avatar in your browser: body, face, hair, clothes, then download. All assets CC0, code MIT, runs fully client-side." Last push was 2026-11-20. GitHub shows the licence as NOASSERTION because the file adds an assets note. — [GitHub API search](https://github.com/ffunch/vrm-avatar-maker)
- The LICENSE is MIT ("Copyright (c) 2026 Flemming Funch") and adds: "The avatar assets (web/assets/, assets/) are CC0: see ASSETS.md. Vendored libraries in web/vendor/ keep their own licenses." — [LICENSE (raw)](https://raw.githubusercontent.com/ffunch/vrm-avatar-maker/main/LICENSE)
- ASSETS.md says: "Everything an avatar is made of comes from CC0 (public domain) MakeHuman community assets, via MPFB 2. Each item's own files were checked to say CC0." — [ASSETS.md](https://raw.githubusercontent.com/ffunch/vrm-avatar-maker/main/ASSETS.md)
- Part counts, from counting ASSETS.md table rows:
  - Hair 22
  - Eyebrows 12
  - Moustache 1
  - Beard 5
  - Glasses/masks 10
  - Hats 15
  - Outfits 35
  - Tops 10
  - Bottoms 9
  - Shoes 15
  - "Always" parts 4 (low-poly body, eyelashes, teeth, tongue)
  - a "Skins and eyes" section (not counted)

  — [ASSETS.md](https://raw.githubusercontent.com/ffunch/vrm-avatar-maker/main/ASSETS.md)
- Features:
  - Body, face, skin, eyes, hair, beard, glasses, hats, clothes and makeup; sliders refit the clothes live.
  - "VRM 1.0 that moves": humanoid bones, blinking, mouth shapes for talking (aa, ih, ou, ee, oh), emotions, eyes that track a target, and spring-bone hair.
  - Photo-resemblance beta using MediaPipe, run in the browser.
  - The recipe is stored inside the VRM.
  - Plain GLB export.
  - Budget caps: 40k triangles, 16 materials, 2048 px textures, 20 MB.
  - Third-party code: three.js, three-vrm and meshoptimizer are MIT; MediaPipe is Apache-2.0.
  - "A real person, not anime."

  The README doesn't mention ARKit blendshapes. — [README](https://github.com/ffunch/vrm-avatar-maker)
- The build pipeline runs Blender 5.2 with the MPFB 2 extension and CC0 asset packs (`pipeline/build_avatar.py` builds headless from a recipe). — [README (raw)](https://raw.githubusercontent.com/ffunch/vrm-avatar-maker/main/README.md)

### Inferences
- This is the closest ready-made match to "Teacher Maker" in function. Its whole pipeline (MPFB recipe → Blender → VRM 1.0 with visemes → three-vrm in the browser) is legally clean for commercial use and for a generator.
- To get an anime or animated-film look, we would need a toon (MToon) material pass, stylised proportions and eyes, and our own hair. The geometry is MakeHuman-realistic.

### Gaps
- The README excerpt doesn't say whether the emotion set covers all of happy/sad/surprised/relaxed/angry. The phrase "emotions" suggests the VRM presets, but this isn't confirmed.
- No count of skins or eyes.

## 3. Open Source Avatars (opensourceavatars.com / ToxSam)

### Takeaway
This is a CC0 registry of ready-made VRM avatars (mostly Polygonal Mind's 100Avatars R1–R3, which is ~300 avatars), with
licences set per collection. Most collections are CC0, but VIPE Heroes is CC-BY. They are whole low-poly
characters, not swappable parts, and I couldn't confirm they have viseme or expression shapes.

### Cited Findings
- The registry code, metadata and docs are CC0 1.0. Avatar licences are set per collection in `projects.json`.
  - CC0: 100Avatars Series, Grifters Squaddies, ToxSam, Halloween Rising, Xmas Chibis, NeonGlitch86.
  - CC-BY (attribution required): VIPE Heroes.
  - Integration docs cover VRM 0.x. The README doesn't mention expressions.

  — [open-source-avatars README](https://github.com/ToxSam/open-source-avatars)
- `projects.json` lists "100Avatars R1" (001–100), "R2" (101–200) and "R3" (201–300), each `"license": "CC0"`, stored on Arweave. — [projects.json (raw)](https://raw.githubusercontent.com/ToxSam/open-source-avatars/main/data/projects.json)
- The original 100Avatars repo says they were made by the Polygonal Mind team in 2018 as "an open call to all creatives and creators to use and implement them on any project they want". — [gfodor/100avatars mirror (search snippet)](https://github.com/gfodor/100avatars)

### Inferences
- 100Avatars has a chunky low-poly toy look. It is fine for a fallback, but it is not "premium soft-3D". Treat these as whole-character presets, not parts.

### Gaps
- The visemes and expressions inside 100Avatars VRMs were not verified. Open one in a VRM viewer to check.
- The total number of avatars in the registry isn't stated (at least ~300 from 100Avatars alone).

## 4. MakeHuman / MPFB2: CC0 scope, ARKit face units, visemes, generator use, style

### Takeaway
MPFB2's **assets are CC0**. These cover the base mesh, proxies, targets/modifiers, textures, clothes, rigs, poses and
**expressions**. MakeHuman also says it claims nothing over the output. The code is GPLv3 (MPFB) or AGPL
(MakeHuman), and that only matters if we ship their code. MPFB2 ships loadable **ARKit-52 face units** and **two viseme
packs**. That makes it the strongest legal base for a talking-character generator. The catch is that the style is realistic.

### Cited Findings
- From MPFB2's LICENSE.md:
  - Code: "The MPFB source … is released under GPLv3."
  - Assets: "The base mesh and proxies; Targets and modifiers; Textures; Clothes (any MHCLO-based asset); Rigs, poses and expressions; JSON data with mesh information … have been released under CC0 1.0 Universal."
  - Output: "the MakeHuman team makes no claim whatsoever over output such as: Exports to files … Graphical data generated via scripting or plugins … Saved model files."

  — [mpfb2 LICENSE.md (raw)](https://raw.githubusercontent.com/makehumancommunity/mpfb2/master/LICENSE.md)
- The MPFB2 Face operations panel loads three shape-key packs onto any basemesh, at zero weight:
  - **visemes01**: 22 Microsoft/SSML visemes.
  - **visemes02**: 15 Meta/OVR visemes (`viseme_sil`, `viseme_PP`…).
  - **faceunits01**: 52 ARKit face units (`jawOpen`, `eyeBlinkLeft`…).

  It also wires them to the third-party Lip Sync Blender add-on. — [MPFB2 docs: faceops.md](https://raw.githubusercontent.com/makehumancommunity/mpfb2/master/docs/ui/operations/faceops.md)
- The repo also contains export properties `faceunits_arkit.json`, `visemes_meta.json`, `visemes_microsoft.json` and `bake_shapekeys.json`, and an expression file format (`docs/fileformats/expression.md`). — [GitHub code search, makehumancommunity/mpfb2](https://github.com/makehumancommunity/mpfb2)
- MakeHuman's FAQ index lists "Can I reuse the system assets and build a character generator of my own?" The answer text could not be retrieved. The licence page says core assets are CC0 ("you are free to do as you see fit with the asset or derivates"). Some third-party community assets are CC-BY. — [MakeHuman FAQ (snippet)](https://static.makehumancommunity.org/makehuman/faq.html); [Asset packs FAQ (snippet)](https://static.makehumancommunity.org/assets/assetpacks/faq.html); [MakeHuman licence page (snippet)](https://static.makehumancommunity.org/about/license.html)
- ffunch/vrm-avatar-maker is a live, public example of a character generator built on these CC0 system assets. — [vrm-avatar-maker ASSETS.md](https://raw.githubusercontent.com/ffunch/vrm-avatar-maker/main/ASSETS.md)

### Inferences
- From the CC0 grant plus the "no claim over output" statement, building our own generator from the system assets is allowed. Check each community asset's own licence (CC0 vs CC-BY) one by one.
- Running MPFB (GPL code) offline in Blender to *produce* our CC0 parts does not put the GPL on our website code. We would ship only the exported assets.
- On style: MakeHuman topology is realistic. An anime/animated-film look would need several things:
  - stylised proportion targets (big head and eyes)
  - toon (MToon) shading
  - hand-made stylised hair and eyes

  It is possible, but it's art work, not a switch.

### Gaps
- The exact FAQ answer about building a character generator was not retrieved (host blocked in this session).
- No first-hand quality check of anime-style results from MPFB.

## 5. VRoid Studio: generator ban, commercial use of hand-made models, sample models

### Takeaway
VRoid Studio's guidelines **forbid building an app that generates or outputs models, avatars or items
from deformed or combined VRoid Studio meshes or textures**. So **VRoid parts cannot be the parts library
of a Teacher Maker.** Hand-made VRoid models (built in the VRoid Studio app) can be used commercially
when the preset items carry no special clause. So a few fixed teachers made by hand in VRoid look allowed. The AvatarSample terms
couldn't be confirmed.

### Cited Findings
- Search snippets of the official guidelines say:
  - Creating "an application that can generate or output 3D models, avatars, or items from deformed or combined meshes and textures made in VRoid Studio" is not permitted.
  - "any individual or corporation may sell or use for commercial purposes any mesh, texture, or preset item provided by VRoid Studio, provided that no special clauses are indicated in the license."
  - The meshes and preset items are pixiv's own content and are **not CC0**.
  - Using VRoid Studio for anything other than creative output is prohibited.

  — [VRoid Studio Guidelines (search snippets; page itself could not be fetched)](https://vroid.com/en/studio/guidelines)
- A Steam forum user reads the rule as "only … something that can compete with VRoid Studio". That is unofficial and narrower than the guideline text. — [Steam discussion](https://steamcommunity.com/app/1486350/discussions/0/3426697823610107926/?l=french)
- An OpenGameArt page says the alpha-era VRoid sample models were released by VRoid under CC0. It points to the pixiv help article "Do VRoid Studio's sample models come with conditions of use?", which I couldn't open. — [OpenGameArt: VRoid Studio CC0 models](https://opengameart.org/content/vroid-studio-cc0-models)
- VRoid's developer conditions of use explain that VRM 1.0 splits commercialUsage into "Corporate Use" and "Commercial Use by Individuals". — [VRoid developer conditions of use (snippet)](https://developer.vroid.com/en/guidelines/conditions_of_use.html)

### Inferences
- Shipping a few **fixed**, hand-made VRoid teachers on the site looks allowed. Letting users mix VRoid hair, faces or clothes in our tool does not.
- For AvatarSample A–Z and VRoidPreset files, read the licence fields inside each VRM's meta. Don't redistribute until the pixiv help article is read.

### Gaps
- The verbatim guideline text and its last-updated date could not be fetched; vroid.com needs allowing.
- The current terms for AvatarSample A–Z and VRoidPreset are unconfirmed, including whether they are still CC0.

## 6. VRM Public License 1.0 (sample models such as Seed-san, VRM1_Constraint_Twist_Sample)

### Takeaway
VRM Public License 1.0 is a **settings-driven** licence. Each model's meta fields decide whether
commercial use (corporate and individual, separately) and redistribution are allowed. So each sample's rights
depend on what its author set. Read the meta of each file.

### Cited Findings
- From the licence text:
  - "Non-commercial" means "not primarily intended for, and not primarily directed to, commercial gain or monetary compensation".
  - If the Licensor so specifies in the License Settings, the Section 2(a)(1) licence applies only to non-commercial use.
  - "Redistribution" means providing a VRM file to the public; using the data as needed for Model/Avatar Use is not Redistribution.

  — [VRM Public License 1.0](https://vrm.dev/en/licenses/1.0)
- VRM meta offers redistribution options including "Redistribution Prohibited" and "Copyright waiver (CC0)", and also CC BY. — [VRM licence settings](https://vrm.dev/en/vrm/meta/license/); [UniVRM model info](https://vrm.dev/en/univrm/meta/univrm_meta/)

### Inferences
- Showing a sample model in our app can count as "Avatar Use", which is not redistribution. But letting users *download* it, or remixing it into parts, depends on its redistribution and modification settings.

### Gaps
- I couldn't confirm the meta settings of Seed-san or VRM1_Constraint_Twist_Sample (commercial and modification flags). Read them from the `.vrm` files in `vrm-c/vrm-specification` before use.

## 7. Other CC0/permissive VRM/glTF libraries and the 2026 status of avatar platforms

### Takeaway
Quaternius Universal Base Characters is CC0 (6 bases, glTF/FBX), but I found no confirmation that it has face shape
keys. Ready Player Me is **gone**: its public platform closed on 31 January 2026 after Netflix bought it. The only
free source I found with talking face shapes and generator rights is MakeHuman/MPFB (and ffunch's VRM maker on top of it).

### Cited Findings
- Quaternius Universal Base Characters:
  - 6 models in Superhero, Regular and Teen proportions, male and female.
  - FBX and glTF, about 13k triangles.
  - CC0, "free for personal, educational and commercial projects".
  - The Source download needs a $19.99+ contribution.
  - Facial shape keys are not mentioned.

  — [Quaternius pack page](https://quaternius.com/packs/universalbasecharacters.html); [itch.io](https://quaternius.itch.io/universal-base-characters)
- Kenney "Shape Characters" exists as a pack. Its face shapes were not checked. — [Kenney shape characters](https://kenney-assets.itch.io/shape-characters)
- Ready Player Me:
  - TechCrunch reported Netflix acquiring Ready Player Me on 2025-12-19.
  - Several (mostly competitor) sources say the public avatar creator, PlayerZero and the developer APIs went offline on 31 January 2026.
  - Union Avatars reportedly also closed in July 2026.

  — [TechCrunch](https://techcrunch.com/2025/12/19/netflix-acquires-gaming-avatar-maker-ready-player-me/?rand=8808); [Frame VR: RPM closure](https://learn.framevr.io/blog/rpm-closure); [Avatar SDK: who's alive 2026 (vendor blog)](https://avatarsdk.com/blog/2026/08/31/avatar-platforms-2026-whos-alive-whos-gone/)
- Polygonal Mind 100Avatars is CC0 (see section 3).

### Inferences
- Avatar SDK/MetaPerson, Genies and rooom are commercial vendors, not free part libraries. They are excluded under the "free only" rule unless a free tier with generator rights is proven.
- Quaternius bases are a good CC0 stylised starting mesh. ARKit or VRM shapes would have to be added (see section 8).

### Gaps
- I didn't check whether any Quaternius or Kenney character ships blend shapes.
- No other 2025–2026 open avatar part system with CC0 parts and visemes was found in this pass.

## 8. Adding ARKit/VRM face shapes to parts that lack them

### Takeaway
The cheapest legal route is MPFB2's own CC0 ARKit-52 and viseme packs on the MakeHuman basemesh. Parts fitted
to that mesh inherit the face motion. For foreign meshes, RigAnyFace (NeurIPS 2025) auto-generates FACS
blendshapes, even for meshes with disconnected parts. **arXiv 2610.35076 could not be found or verified.**

### Cited Findings
- MPFB2 loads 52 ARKit face units and Microsoft/Meta visemes onto any MakeHuman basemesh, and the assets are CC0 (see section 4). — [faceops.md](https://raw.githubusercontent.com/makehumancommunity/mpfb2/master/docs/ui/operations/faceops.md)
- RigAnyFace (arXiv 2511.18601) deforms a neutral face mesh into FACS poses to make a blendshape rig. It handles diverse topologies "including those with multiple disconnected components", and was accepted to NeurIPS 2025. — [arXiv 2511.18601](https://arxiv.org/abs/2511.18601v1)
- Search for "arXiv 2610.35076 Blendshape Generation for Models with Disconnected Parts" returned no matching paper, and arxiv.org was blocked from direct fetch here. — [search result list incl. RigAnyFace](https://arxiv.org/html/2511.18601v1)
- Paid helpers exist (for example FaceKeys, "ARKit Face Tracking Shape Keys for Realistic and Anime Heads" on Superhive). They are excluded under the free-only rule. — [FaceKeys](https://superhivemarket.com/products/facekeys)

### Inferences
- With a single CC0 basemesh (MakeHuman, or a stylised retopology carrying MPFB targets), every head part can share one set of 52 ARKit + VRM shapes. This avoids per-part blendshape generation entirely.

### Gaps
- The licence of the RigAnyFace code and weights wasn't checked; research-only terms are possible, so treat it as unconfirmed.
- I couldn't confirm that arXiv 2610.35076 exists (it may be mistyped or very new). Deformation-transfer tools such as Blender's Surface Deform/Data Transfer were not researched in this pass.
