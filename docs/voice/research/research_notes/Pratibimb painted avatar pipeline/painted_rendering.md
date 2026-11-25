# Painted (painterly, semi-real) character rendering for the web: Pratibimb

Scope: real-time "digital painting of a real person" look on a skinned, talking mesh in three.js / WebGL2 / WebGPU, on mid-range phones and laptops. Free/open only, commercial use required. Researched 2026-11-25.

Network note: in this session `80.lv` and `blog.maximeheckel.com` could not be fetched (host not allowed). Findings from them come from search snippets only and are marked as such. `raw.githubusercontent.com` worked, so licences below marked "verified" were read from the LICENSE file itself.

## How do productions achieve the painted look, and which techniques matter for a talking face?

### Takeaway
The productions mostly get the painted look from what goes into the textures, not from fancy real-time maths. Arcane paints light, shadow and brush marks by hand into the albedo. Guilty Gear Xrd shows that stepped lighting only works if the normals are cleaned by hand. Genshin-style shaders replace raw N·L on the face with an authored shadow map (an SDF). Spider-Verse adds drawn linework and hatching as a separate, art-directed layer. For Pratibimb this points to three things: baked painted textures, a ramp/wrap-lit shader with an authored face-shadow map, and at most a light screen-space painterly pass.

### Cited Findings
- **Arcane (Fortiche):** artists hand-painted shadows and highlights straight onto the 3D models instead of leaving them to the renderer. Some shadows are baked into the albedo and key highlights are painted by hand. Search snippets only, from secondary and fan sources; no official Fortiche technical paper found. — [80.lv: A closer look at texturing in Arcane](https://80.lv/articles/a-closer-look-at-texturing-in-arcane); [80.lv part 2](https://80.lv/articles/a-closer-look-at-texturing-in-arcane-part-2); [RedShark News](https://redsharknews.com/why-netflixs-arcane-looks-so-good-how-fortiche-ramped-up-the-animation-pipeline)
- **Arcane:** the team added imperfections (smudges, rough edges, visible brushwork) so the characters would not look like "plastic toys". Photoshop was used for texture painting. 2D effects and projection-mapped matte paintings sit on simple 3D geometry for backgrounds. — [RedShark News](https://redsharknews.com/why-netflixs-arcane-looks-so-good-how-fortiche-ramped-up-the-animation-pipeline); [80.lv backgrounds](https://80.lv/articles/arcane-artists-show-how-they-combine-traditional-art-3d-for-backgrounds)
- **Arcane-style fan recreations:** the textures are tested under a neutral white HDRI so the painted lighting reads on its own. Many strokes in colours close to the base break up "the texture's perfection". Snippets only. — [80.lv Vi recreation](https://80.lv/articles/creating-arcane-s-vi-based-on-2d-concept-with-zbrush-maya-substance-3d-marmoset); [Autodesk community: Ellie](https://forums.autodesk.com/t5/community-blog-m-e-english/ellie-inside-the-project/ba-p/13918532)
- **Guilty Gear Xrd (GDC 2015, Junya C. Motomura, Arc System Works):** the look comes from custom cel shaders plus models built specially for those shaders. "Every little noise on the surface will become extremely distracting in cel shading", so normals had to be controlled by hand. — [GDC Vault talk page](https://gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The); [Motomura handout PDF](https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf)
- **Genshin / HoYoverse style (fan reverse-engineering, not official):** the face shadow uses an authored threshold/SDF texture that stores where the shadow falls for light angles 0–180° on the xz plane (R and G channels for the two halves) instead of N·L. Hair has an "angel ring" highlight masked by a texture, shown only where hair is lit and trimmed at the sides with fresnel. A lightmap texture packs the specular mask (R) and threshold (B). There is a second, offset, harder-edged N·L band tinted in a related colour for an outer shadow, and a 2D hair shadow on the face. — [Adrian Mendez breakdown (ArtStation)](https://adrianmendez.artstation.com/projects/wJZ4Gg); [NoiRC256/URPSimpleGenshinShaders](https://github.com/NoiRC256/URPSimpleGenshinShaders); [xcupsilon/unreal-genshin-character-shader](https://www.github.com/xcupsilon/unreal-genshin-character-shader); [Stylized facial shadow workflow](https://sydianandrewchen.github.io/projects/3-stylized-facial-shadow-workflow); [B. J. Ayers Blender NPR](https://bjayers.artstation.com/blog/category/5)
- **Spider-Verse (Sony Pictures Imageworks):** SIGGRAPH 2023 "Linework in Spider-Man: Across the Spider-Verse" (Grochola, Maccari, Lee, Boulet-Gilly) describes an "artistically driven line art pipeline". Hatching was used as lighting (hatch lines build the shadows), with interactive hatching tools in Nuke. On *Into the Spider-Verse*, the Ink Line tool in Maya let artists draw pen-like strokes. "Repainting the Spider-Verse" brought the Rebelle watercolour app into the pipeline. — [SIGGRAPH archive: Linework](https://history.siggraph.org/learning/linework-in-spider-man-across-the-spider-verse-by-grochola-maccari-lee-and-boulet-gilly); [SIGGRAPH archive: Repainting](https://history.siggraph.org/learning/repainting-the-spider-verse-by-maccari-grochola-nicol-blaskovic-and-fapso); [Foundry: Across the Spider-Verse](https://foundry.com/insights/film-tv/across-the-spider-verse-nuke-mari-katana); [Cartoon Brew](https://www.cartoonbrew.com/feature-film/if-its-not-broke-break-it-sony-imageworks-renegade-approach-to-spider-man-into-the-spider-verse-167321)
- **Anisotropic Kuwahara (the painterly image filter):** Kyprianidis, Kang and Döllner (2009) adapt the Kuwahara filter to the local feature shape using a smoothed structure tensor, and it ran on video in real time on a GPU. A 2010 follow-up uses polynomial weighting functions computed during filtering, with no convolution or weight texture needed. — [Kyprianidis et al. 2009, CGF](https://umsl.edu/~kangh/Papers/kang_cgf09.pdf); [Kyprianidis et al. 2010, TPCG](https://www.umsl.edu/~kangh/Papers/kang-tpcg2010.pdf)
- **Pre-integrated skin (cheap subsurface look):** Penner and Borshukov, "Pre-Integrated Skin Shading", GPU Pro 2 (2011, pp. 41–55). A lookup texture indexed by N·L and curvature gives the scattered diffuse in one texture fetch, with no blur passes. There is a known erratum: the sample code integrates −π/2..π/2 where the maths needs −π..π. — [Game Engine Gems DB entry](https://www.gameenginegems.com/gemsdb/article.php?id=1103); [Penner SIGGRAPH 2011 slides](https://www.slideshare.net/slideshow/penner-preintegrated-skin-rendering-siggraph-2011-advances-in-realtime-rendering-course/13966747); [Skin Rendering notes with erratum](https://progmdong.github.io/2019-02-03/Skin_Rendering); [GPU Gems 1 ch.16: real-time SSS approximations (wrap lighting)](https://developer.nvidia.com/gpugems/gpugems/part-iii-materials/chapter-16-real-time-approximations-subsurface-scattering)

### Inferences
- For a *real person's* likeness, the Arcane approach (paint light and brush marks into the albedo, then light it gently) suits better than hard cel steps. Hard steps (Xrd/Genshin) flatten identity cues such as cheekbones and nasolabial folds, and look "anime" rather than "painted".
- Recommended shading model for Pratibimb (an inference from the sources above, not something any one source prescribes):
  - Diffuse is soft-ramp or wrap lighting (GPU Gems ch.16) through a small 1D or 2D ramp texture, with the shadow side hue-shifted warm/red for skin, as the pre-integrated LUT does. Optionally use a pre-integrated skin LUT indexed by curvature.
  - Use an authored face-shadow threshold map (Genshin technique), so the shadow shape on nose, cheeks and eye sockets is painterly and stable while she talks, and does not jitter with the mesh.
  - Add a matcap or parametric rim for the painted edge light.
  - Smooth the normals or bake painted normals (Xrd lesson), so a photo-derived mesh does not show noise under stepped light.
- Hair: a Kajiya-Kay style shifted highlight or a texture-masked "angel ring" band (Genshin technique). Hair cards with painted strands read as "painted" more than strand rendering does.
- Eyes: no production source on painted-eye rendering was fetched this session (see Gaps). Common practice (unverified here): paint the iris, add a hand-placed catchlight texture that follows the view a little, and add a soft shadow from the upper lid painted into the sclera.
- Lines: Spider-Verse-style linework is art-directed per shot. For a talking face, limit ink to an inverted-hull outline at very low width plus darker painted creases. Screen-space edge detection on a face tends to put lines on lips and nostrils that flicker while she talks.

### Gaps
- No official Fortiche or Riot technical talk on character shading was found. Arcane details are secondary or fan sources, and the 80.lv articles could not be opened this session.
- No primary source was fetched for Blue Protocol, for eye refraction or caustic highlights in NPR, or for Kajiya-Kay in a web context. They are not covered with citations here.
- The GDC talk content beyond the handout summary (for example, Xrd's vertex-colour shadow-bias channel) was not verified this session.

## What open-source code can we use commercially in three.js / WebGL, and what does it cost on mobile?

### Takeaway
The safe base is three.js (MIT), three-vrm's MToonMaterial (MIT), pmndrs/postprocessing (zlib-style text; see note), and OpenCV (Apache 2.0) for offline work. The fan Genshin shaders and the small Kuwahara demos have unverified or missing licences, so treat them as reading material only and write our own GLSL from the papers. No published millisecond figure exists for Kuwahara on a phone GPU; the one anecdote is about 1 fps, so it must be measured and kept small.

### Cited Findings
- **three.js:** "The MIT License", "Copyright © 2010-2026 three.js authors" (verified from LICENSE). — [three.js LICENSE](https://raw.githubusercontent.com/mrdoob/three.js/dev/LICENSE)
- **three-vrm (includes MToonMaterial):** "MIT License", "Copyright (c) 2019-2026 pixiv Inc." (verified). — [three-vrm LICENSE](https://raw.githubusercontent.com/pixiv/three-vrm/dev/LICENSE)
- **MToonMaterial's real uniforms** (read from source) cover most of the shading model above:
  - shading: `shadeColorFactor`, `shadeMultiplyTexture`, `shadingShiftFactor`, `shadingShiftTexture`, `shadingToonyFactor` (how hard the light/shade step is), `giEqualizationFactor`
  - matcap: `matcapFactor`, `matcapTexture`
  - rim: `rimMultiplyTexture`, `rimLightingMixFactor`, `parametricRimColorFactor`, `parametricRimFresnelPowerFactor`, `parametricRimLiftFactor`
  - outline: `outlineWidthFactor`, `outlineWidthMultiplyTexture`, `outlineColorFactor`, `outlineLightingMixFactor`
  - UV animation: `uvAnimationMaskTexture` with scroll and rotation

  — [MToonMaterial.ts](https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm-materials-mtoon/src/MToonMaterial.ts)
- **pmndrs/postprocessing:** the LICENSE.md text carries "Copyright © 2015 Raoul van Rüschen" with no licence title in the file. Its name is not quoted here: the file does not state it and it was not otherwise verified. Read the full text before relying on it. — [postprocessing LICENSE.md](https://raw.githubusercontent.com/pmndrs/postprocessing/main/LICENSE.md)
- **Kuwahara in the browser:**
  - Maxime Heckel's article builds a Kuwahara post-process in React Three Fiber (snippet only; code licence not verified).
  - "shader-playground" has an anisotropic Kuwahara as a THREE.js GLSL effect and notes that the plain Kuwahara looks "blocky" because of its square kernel (licence not verified).

  — [On Crafting Painterly Shaders](https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders); [shader-playground](https://sveltethemes.dev/badbadbadbadbad/shader-playground)
- **Blender's real-time compositor has anisotropic and classic Kuwahara on the GPU.** The classic one uses a naive O(radius²) loop for radius ≤ 5 and summed-area tables (O(1) per pixel) above that. Blender is GPL, so read it for structure but do not copy it into Nexora's client code (licence inferred from Blender being GPL; not re-read this session). — [Blender PR #109292 (classic)](https://projects.blender.org/blender/blender/pulls/109292); [PR #110786 (anisotropic)](https://projects.blender.org/blender/blender/pulls/110786); [PR #108796 (speed-up)](https://projects.blender.org/blender/blender/pulls/108796)
- **Mobile cost:**
  - Kuwahara on a mobile GPU reported at about 1 fps, blamed on "too much texture lookups". Anecdotal, no device named.
  - Reference points from other filters: a full-HD 5×5 filter took under 60 ms on phones (BLADE). Adreno 630 Sobel went from 7.6 ms to 2.9 ms with memory-access tuning.

  — [Imagination forum](https://forums.imgtec.com/t/frame-drop/867); [BLADE, arXiv 1711.10700](https://arxiv.org/pdf/1711.10700); [Qualcomm Adreno Sobel](https://www.qualcomm.com/news/onq/2018/10/opencl-optimization-developers-accelerating-sobel-filter-adreno-gpu)
- **Genshin-style fan shaders:** NoiRC256/URPSimpleGenshinShaders had no LICENSE at `main/LICENSE` (HTTP 404), so its licence is **unknown**. The other fan repos' licences were not read. They also reproduce a commercial game's look, so do not copy code or textures from them. — [NoiRC256 repo](https://github.com/NoiRC256/URPSimpleGenshinShaders)

### Inferences
- **Recommended stack:** a custom `ShaderMaterial`, or MToonMaterial extended through `onBeforeCompile` (MIT), for the face, skin and hair, then at most one cheap screen-space pass.
- Write the anisotropic Kuwahara ourselves from the 2009/2010 papers. Algorithms are not covered by copyright, and the papers give the maths.
- **Budget (inference; must be measured):**
  - On phones, run any painterly pass at half resolution and only over the avatar's bounding box. Use radius ≤ 3–4 with 4 sectors (the classic variant, or a generalized one with polynomial weights). Turn it off when fps drops (adaptive quality).
  - The anisotropic variant needs a structure-tensor pass, a blur and a filter pass, so plan for 3 passes. Desktop only, unless measurements show it fits on phones.
- **Cheapest route to "painted" on phones:** bake the painterly look into the texture offline (next section), and keep run-time post at zero or one pass (for example, a paper-grain or canvas overlay and a slight edge darkening). This follows Arcane's "the paint is in the texture" approach.
- **Keep the features crisp:**
  - Render a mask (lips, inner mouth, teeth, eyes, brows, lash line) into a separate target or into stencil/alpha. Let the screen-space filter blend back to the unfiltered image inside the mask, with a feathered edge.
  - In the texture bake, give those regions a smaller filter radius (see below).
  - Lips and eyes move the most while she talks, and these are exactly the regions where Kuwahara smearing would show as "swimming".

### Gaps
- No measured ms cost for Kuwahara or anisotropic Kuwahara on a specific mid-range phone (for example, Adreno 6xx/7xx or Mali-G57) was found. Benchmark it on our own devices.
- three.js example licences: the examples sit in the MIT repo. I did not open the three.js subsurface-scattering example or the GTAO pass this session to confirm their features or costs.
- The full licence wording of pmndrs/postprocessing, shader-playground and Heckel's code was not verified.

## How do we turn photo-derived skin textures into a painted texture offline while keeping identity?

### Takeaway
Use classical edge-preserving filters (OpenCV, Apache 2.0) driven by a face-region mask: bilateral or guided filtering, `stylization`, and Kuwahara or anisotropic Kuwahara in Python. Then add hand-tuned brush and hue-shift layers. Neural style transfer code is MIT, but the usual pretrained weights were trained on art datasets of unclear licence, so they are not safe for commercial use unless we train our own weights on images we have rights to.

### Cited Findings
- **OpenCV** is "Apache License, Version 2.0, January 2004" (verified from the 4.x LICENSE). — [OpenCV LICENSE](https://raw.githubusercontent.com/opencv/opencv/4.x/LICENSE)
- **pytorch-AdaIN code:** "MIT License", "Copyright (c) 2018 Naoto Inoue" (verified). This covers the code only. The licence of the released pretrained weights, and of the data they were trained on (AdaIN style training normally uses WikiArt paintings), was **not verified**. — [pytorch-AdaIN LICENSE](https://raw.githubusercontent.com/naoto0804/pytorch-AdaIN/master/LICENSE)
- **The anisotropic Kuwahara papers** describe edge-preserving abstraction that follows local feature direction, which keeps facial contours while flattening skin into strokes. — [Kyprianidis et al. 2009](https://umsl.edu/~kangh/Papers/kang_cgf09.pdf)

### Inferences
- **Suggested offline bake** (scripted, runs on CPU in Nexora's pipeline):
  1. Start from the unwrapped photo-skin UV texture. Remove baked specular and harsh shadow (delight) so lighting comes from the shader.
  2. Run an edge-preserving smooth (OpenCV `bilateralFilter`, or `ximgproc.guidedFilter` from opencv-contrib, also Apache 2.0 but not re-verified here). Then run anisotropic Kuwahara, written in NumPy from the paper. Use a per-region radius from a UV mask: large on cheeks, forehead and neck; small (1–2 px) on lips, eyelids, brows and the lash line.
  3. Quantize the colour softly toward a limited palette. Add a hue-shifted (warmer, more saturated) shadow tint in creases, and paint ambient-occlusion "shadow shapes" into the albedo (Arcane approach).
  4. Overlay a brush-stroke or canvas-grain texture (self-made or CC0) aligned to the flow field from the structure tensor.
  5. Run an identity check: compare face embeddings of the render against the source photo (the existing Teacher Maker likeness score) and reject bakes that drift.
- Keep a "detail" texture separate (pores off, but lip lines, brow hairs and iris kept), so the shader can mix crisp detail back in where needed.
- If neural style transfer is wanted later, train AdaIN or fast-style weights only on paintings we own or that are CC0/public domain, with the MIT code. Do not use the downloaded pretrained weights until their licence and data source are confirmed.

### Gaps
- No primary source was checked for the licences of pretrained style-transfer weights (pytorch examples fast-neural-style, original AdaIN Torch weights, WCT, and so on). They are unknown, so treat them as unsafe.
- No published case study was found that measures identity preservation after painterly filtering. The likeness check above is our own proposal.
