# B. Rendering look: a premium soft-3D stylised character in three.js on mid-range phones

Research date: 2026-11-24. Scope: shading (MToon vs PBR vs custom), lighting, post-processing, performance budget, hair and eyes.

Network note: in this session `wiki.virtualcast.jp`, `discourse.threejs.org`, `pixiv.github.io` and `threejs.org` could not be fetched (DNS blocked). Findings from those hosts come from search snippets only. The MToon numbers below were checked against primary sources on GitHub (the VRM spec and the three-vrm source).

Repo context (not web research): the current teacher (`client/src/voice/teacher/look.ts`) runs TalkingHead avatars on PBR materials. It already uses `NeutralToneMapping`, exposure 1.12, `scene.environmentIntensity` 0.55, skin roughness 0.68, cloth roughness at least 0.8, alpha-test 0.45 for hair and lashes, anisotropy up to 8, and a pixel ratio capped at 2. Any new VRM path should be compared side by side against this baseline.

## 1. MToon parameters for a softer, more 3D look

### Takeaway
MToon's defaults (toony 0.9, GI equalisation 0.9) are built for flat anime cel shading. For "soft 3D film" you lower toony to roughly 0.3–0.6 for a wide, soft terminator, lower GI equalisation so ambient light keeps its direction, and add only a faint parametric rim plus a short, lighting-mixed outline. One important catch: three-vrm's MToon does not read `scene.environment`, so IBL from RoomEnvironment does not light MToon materials. Indirect light has to come from ambient, hemisphere or LightProbe lights.

### Cited Findings
- Spec defaults in MToon 1.0:
  - `shadingToonyFactor` 0.9 ("width of the shading boundary"), `shadingShiftFactor` 0.0, `giEqualizationFactor` 0.9 (0 = normal GI, near 1 = flattened GI).
  - `parametricRimColorFactor` [0,0,0], `parametricRimFresnelPowerFactor` 5.0 (0 can produce NaN), `parametricRimLiftFactor` 0.0, `rimLightingMixFactor` 1.0, `matcapFactor` [1,1,1].
  - `outlineWidthMode` "none" / "worldCoordinates" (metres) / "screenCoordinates" (ratio of screen height), `outlineWidthFactor` 0.0, `outlineLightingMixFactor` 1.0, `shadeColorFactor` [0,0,0].
  - Source: [VRMC_materials_mtoon-1.0 spec](https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_materials_mtoon-1.0/README.md)
- The spec's pseudocode is `linearstep(-1.0 + shadingToonyFactor, 1.0 - shadingToonyFactor, shading)`. A higher toony value gives a narrower band and a harder edge; at 0.9 the transition spans about -0.1 to 0.1 of N·L. Shift moves where the boundary sits. — [VRM spec](https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_materials_mtoon-1.0/README.md)
- In a VRM MToon proposal, toony 0.0 is described as Lambert ("0.0 is Lambert. Higher value get toony shading"). — [V-Sekai decision record](https://v-sekai.github.io/manuals/decisions/20240218-vrm-substance-editor.html)
- three-vrm's `MToonMaterial` uses the same defaults: toony 0.9, shift 0, GI equalisation 0.9, rim colour black, fresnel power 5, lift 0, rimLightingMix 1, matcap factor white, outline width 0, outline lighting mix 1, shade colour black, outline mode None. It sets `lights = true`, `fog = true`, `clipping = true`. `v0CompatShade` (off by default, "usually not recommended") restores VRM0 shading. — [three-vrm MToonMaterial.ts](https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm-materials-mtoon/src/MToonMaterial.ts)
- How three-vrm's MToon fragment shader gets indirect light:
  - It uses `ambientLightColor`, light probes (`getLightProbeIrradiance`, r157+) and hemisphere lights.
  - `#include <envmap_fragment>` is commented out, so environment maps / `scene.environment` are not used.
  - Direct-light shadows are applied before the toon ramp (`shading *= shadow`), and indirect terms are not shadowed.
  - Rim is `parametricRimColor * pow(saturate(1 - dot(V,N) + lift), fresnelPower)`, plus matcap. The total is multiplied by `mix(1, directSpecular, rimLightingMixFactor)`, so `rimLightingMixFactor` also scales the matcap.
  - Source: [three-vrm mtoon.frag](https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm-materials-mtoon/src/shaders/mtoon.frag)
- One port (Bevy WGSL / Godot-style) defaults toony to 0.95 rather than 0.9. Ports disagree slightly. — [bevy_vrm1 mtoon_fragment.wgsl](https://docs.rs/crate/bevy_vrm1/0.6.2/source/src/vrm/mtoon_fragment.wgsl)
- For WebGPURenderer, three-vrm says to set `MToonMaterialLoaderPlugin`'s `materialType` to `MToonNodeMaterial` (three r167+). It warns that "the NodeMaterial system of Three.js is still under development". — [three-vrm README](https://unpkg.com/@pixiv/three-vrm@3.5.5/README.md)

### Inferences
- Suggested starting values for "soft 3D". These are my own tuning proposal and no source gives them; tune by side-by-side renders as was done for `look.ts`:
  - **Skin:** toony 0.35–0.5, shift -0.05 to 0.05. `shadeColorFactor` should be a warm, slightly saturated, darker version of the base colour (e.g. base × (0.80, 0.62, 0.60)), never grey. That gives the "warm terminator" read of film skin.
  - **Clothes:** toony 0.5–0.65. **Hair:** toony 0.6–0.75, so hair keeps a slightly graphic read.
  - **giEqualizationFactor:** 0.3–0.5. The default 0.9 flattens ambient light, which is exactly the flat-anime look to avoid.
  - **Rim:** colour about 0.15–0.25 of the key-light colour, fresnel power 3–5, lift 0–0.05, `rimLightingMixFactor` 0.7–1 so the rim does not glow in shadowed areas.
  - **Outline:** screenCoordinates, very thin (about 0.002–0.004 of screen height), `outlineLightingMixFactor` 1, outline colour a dark hue-shifted base colour, never black. Or turn outlines off entirely for a softer film look. The outline pass draws every outlined mesh a second time, so it doubles their draw calls.
  - **Matcap:** a subtle soft-studio matcap only on hair and eyes (it adds to rim). Avoid it on skin.
- MToon does not take IBL, so for MToon do either of these:
  - Add a `HemisphereLight` (sky a warm white, ground a soft bounce colour).
  - Bake a `LightProbe` from RoomEnvironment with `LightProbeGenerator.fromCubeRenderTarget`, which MToon does read.
  - This needs checking on a device.
- The fetch summary said `giEqualizationFactor` is "declared but never used" in `mtoon.frag`. It is probably applied in a separate lights chunk (`lights_mtoon_pars_fragment`), so verify this before relying on it.

### Gaps
- I found no published "recommended soft values" from VTubers or three-vrm docs. The Virtualcast MToon reference could not be fetched.
- No three-vrm example of LightProbe + MToon was found.

## 2. Alternatives: PBR conversion, "PBR toon", skin wrap lighting, Genshin-style

### Takeaway
There are two realistic paths. Path A: keep MToon, retuned soft as above (cheapest, keeps the VRM look). Path B: patch `MeshStandardMaterial` / `MeshPhysicalMaterial` via `onBeforeCompile` (WebGL) or TSL (WebGPU), with a ramp or wrap diffuse and a soft rim, so the character also gets IBL and real speculars. That "PBR toon" path is what makes it look like a soft-3D film character rather than anime. Genshin-style face SDF shadows are a known technique, but I found no ready-made three.js implementation; it would be a custom port.

### Cited Findings
- I found no guide for swapping VRM's MToon for MeshStandardMaterial in three.js. MToon's look comes from "mixing Lit Color and Shade Color based on Lighting parameters"; a plain PBR swap loses it. The Babylon port warns that some settings are "ignored or generates inconsistent lighting". — [babylon-mtoon-material](https://github.com/noppefoxwolf/babylon-mtoon-material), [UniVRM MToon doc](https://dwango.github.io/en/vrm/univrm/shaders/mtoon)
- Wrap lighting / half-Lambert:
  - Wrapped diffuse "spreads light past the terminator" and fakes subsurface scattering. — [Unity manual: Wrapped Diffuse](https://docs.unity3d.com/Manual/SL-SurfaceShaderExamples-WrappedDiffuse.html)
  - Sloan et al. give a wrap formula with a parameter w; it is not energy-normalised, so the result brightens as w grows. — [JGT wrap paper](https://cim.mcgill.ca/~derek/files/publication-files/jgt_wrap_final.pdf)
  - With w = 1 it reduces to half-Lambert (from Valve's TF2 illustrative rendering). — [Wrapped Diffuse slides](https://es.slideshare.net/slideshow/wrapped-diffuse/28103297)
  - Wrap lighting is the classic cheap skin approximation. — [GPU Gems ch. 3](https://developer.nvidia.com/gpugems/GPUGems/gpugems_ch03.html)
- RyShade, a stylised shader, uses half-Lambert so the "rear of objects" does not go flat, and fakes SSS with a modified Lambert. It cites Valorant and Uncharted 4 as using similar approaches. — [RyShade](https://github.com/LoganFairbairn/RyShade)
- Godot's "Stylized Skin" shader combines two-tone lighting with a fresnel rim, a small reference implementation. — [godotshaders Stylized Skin](https://godotshaders.com/shader/stylized-skin/)
- Genshin-style face shading:
  - It uses a face shadow-threshold texture covering lighting from 0–180°, mirrored for the other side. A script feeds the head's forward and right vectors to the shader. — [URPSimpleGenshinShaders](https://github.com/NoiRC256/URPSimpleGenshinShaders)
  - Face UVs must be symmetrical, and R16 is suggested for antialiasing. — [URP_Toon](https://github.com/ChiliMilk/URP_Toon)
  - HoyoToon exposes softness, flip and forward-vector settings. — [HoyoToon wiki](https://github.com/Melioli/HoyoToon/wiki/Using-the-Genshin-Shader)
  - A workflow for authoring face SDFs from several light angles. — [Stylized facial shadow workflow](https://sydianandrewchen.github.io/projects/3-stylized-facial-shadow-workflow)
- I found no three.js Genshin face-SDF example. A three.js forum thread on a custom toon shader exists, but I could not open it. — [three.js forum](https://discourse.threejs.org/t/custom-toon-shader-in-three-js/88273)

### Inferences
- Recommended "PBR toon" recipe for the Nexora teacher. These are my synthesis and are unbenchmarked:
  - **Base:** `MeshStandardMaterial` (Physical only where needed: `sheen` for cloth, `clearcoat` for eyes). Patch the direct diffuse to wrap: `max((NdotL + w)/(1 + w), 0)`, w ≈ 0.3–0.5 for skin and 0.15 for cloth.
  - **Skin terminator:** optionally replace the wrap with a 1D ramp texture, a soft gradient going from a warm red-orange band to shadow.
  - **Shadows:** tint them toward a warm shade colour, not black.
  - **Specular and IBL:** keep standard GGX specular, with skin roughness about 0.6–0.7 as `look.ts` already does. Keep IBL from RoomEnvironment at low intensity.
  - **Rim:** add a soft fresnel rim (power about 4) only on the side facing the rim light.
  - This keeps IBL and shadows working, fits the current TalkingHead PBR pipeline, and costs a few ALU ops.
- The face SDF shadow is the single biggest step up in "anime-film" faces, but it needs a hand-authored texture per face. It would apply to a teacher-maker only if faces share a UV layout, so treat it as a later phase.
- Licences: three-vrm is MIT ([repo](https://github.com/pixiv/three-vrm)), and three.js is MIT. I did not check the licences of the Unity, Unreal and Godot references, so use them for the method only and do not copy their code.

### Gaps
- I found no maintained three.js library for stylised "PBR toon" character shading.
- I did not verify the licences of RyShade, URP_Toon, HoyoToon or the godotshaders snippets.

## 3. Lighting

### Takeaway
Use a three-point setup: a warm key `DirectionalLight` at 30–45° from the front side and above, a cool fill (or a hemisphere/IBL instead of a fill light), and a strong back rim. Add soft indirect light: IBL from RoomEnvironment for PBR materials, a Hemisphere light or LightProbe for MToon. Ground contact should be a baked or contact-shadow blob, not real-time shadow maps on phones.

### Cited Findings
- MToon uses ambient, hemisphere and light-probe irradiance, but not envMap. — [three-vrm mtoon.frag](https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm-materials-mtoon/src/shaders/mtoon.frag)
- Contact shadows:
  - three.js has an official `webgl_shadow_contact` example. — [three.js forum](https://discourse.threejs.org/t/shadow-contact-threejs/29505)
  - drei's `<ContactShadows>` gives soft ground-plane shadows more cheaply than shadow maps, but only onto a plane. — [skills.sh shadows guide](https://skills.sh/openaec-foundation/three.js-claude-skill-package/threejs-impl-shadows), [glodrei ContactShadows source](https://cdn.jsdelivr.net/npm/glodrei@0.0.2/src/core/ContactShadows.tsx)
  - Needle Engine ships a ContactShadows component. — [Needle ContactShadows.ts](https://cdn.jsdelivr.net/npm/@needle-tools/engine@4.5.8/src/engine-components/ContactShadows.ts)
- A performance guide recommends no shadows on mobile and low-end devices, and testing on target devices. — [NotBlox PERFORMANCE.md](https://raw.githubusercontent.com/iErcann/NotBlox/main/PERFORMANCE.md)
- GTAO in forward rendering needs a depth/normal pre-pass plus a GTAO pass plus a lit pass; the extra scene traversal is the main cost. This comes from a third-party skill document, not official docs. — [threejs-ambient-contact-shading SKILL](https://raw.githubusercontent.com/linegel/threejs-complete-set-of-skill/main/threejs-ambient-contact-shading/SKILL.md). Official example: [webgpu_postprocessing_ao](https://threejs.org/examples/webgpu_postprocessing_ao)

### Inferences
- Recommended rig (my proposal; tune on device):
  - **Key:** a DirectionalLight, warm white (around 5200–5600 K look), front-left and up about 35°.
  - **Fill:** a HemisphereLight (sky cool white, ground warm bounce) at low intensity, or RoomEnvironment IBL with `environmentIntensity` about 0.4–0.6 for PBR.
  - **Rim:** a DirectionalLight from behind and above, slightly cool, 1.5–2.5× the key's intensity on the silhouette.
- **Self-shadowing:** at most one 512–1024 shadow map from the key, limited to the head and torso frustum. Better still, skip it on phones and rely on the toon or wrap terminator plus a baked AO texture.
- **SSAO/GTAO:** skip on phones. A per-character baked AO map (or vertex AO) gives most of the depth for free.
- **Floor:** a static radial-gradient blob texture under the feet is cheapest. Use a ContactShadows-style pass only when the character moves a lot, and update it at a low rate.

### Gaps
- I found no measured phone timings for GTAO, SSAO or contact shadows in three.js.

## 4. Post-processing on phones

### Takeaway
Avoid an EffectComposer chain on phones if possible. Render straight to the canvas with `antialias: true` (MSAA), the renderer's own tone mapping, and the pixel ratio capped (≤ 2, or 1.5 on weak GPUs). Use Neutral or AgX tone mapping, not ACES, for character skin. Add bloom only on desktop or high tier.

### Cited Findings
- **Antialiasing:**
  - `antialias: true` is MSAA on the default framebuffer. It is lost when you render into a render target unless you use a multisample target. — [three.js forum: what AA method](https://discourse.threejs.org/t/what-aa-method-does-antialias-true-use/15146), [FXAA < antialias:true thread](https://discourse.threejs.org/t/fxaa-webglrenderer-antialias-true/21175)
  - FXAA is "very cheap" and "for mobile" but blurry; one mobile user found TAA better but laggy. — [three.js forum: AA performance](https://discourse.threejs.org/t/performance-of-different-antialiasing-techniques/56740)
  - "Use SMAA 1x if you can't afford MSAA but find FXAA too blurry" (Godot docs, general guidance). — [Godot 3D antialiasing](https://docs.godotengine.org/en/4.6/tutorials/3d/3d_antialiasing.html)
- **Tone mapping:**
  - three.js `NeutralToneMapping` is the Khronos PBR Neutral tone mapper, aimed at a near-1:1 colour match. — [three.js forum tone-mapping overview](https://discourse.threejs.org/t/tone-mapping-overview/75204), [Khronos news](https://gamedev.net/news/khronos-pbr-neutral-tone-mapper-released-for-true-to-life-color-rendering-of-3d-objects-r2733)
  - AgX is "expected" to be less saturated than ACES. — [AgX thread](https://discourse.threejs.org/t/is-agx-tonemapping-implemented-correctly/60609)
  - `renderer.toneMapping` is ignored when rendering to a render target, so with post-processing you need an `OutputPass` / ToneMappingPass. — [Tone mapping overview](https://discourse.threejs.org/t/tone-mapping-overview/75204)
  - In pmndrs/postprocessing, AgX needs three r160+ and Neutral needs r162+. — [ToneMappingMode](https://pmndrs.github.io/postprocessing/public/docs/file/src/enums/ToneMappingMode.js.html)
- **Repo evidence:** the current teacher's `look.ts` notes that ACES "washed the skin out and turned it orange; Neutral keeps real skin colour and depth".
- **Pixel ratio:** one forum post says that rendering above the device pixel ratio looks better but "will cost a lot more"; no recommended cap was found. — [AA performance thread](https://discourse.threejs.org/t/performance-of-different-antialiasing-techniques/56740)

### Inferences
- **Phone tier:** no composer. MSAA on (4×, the browser default), Neutral tone mapping, exposure about 1.0–1.15, pixel ratio min(dpr, 2). Drop to 1.5 if frame time is over budget; the dynamic-resolution idea is my own suggestion.
- **High tier:** a composer with a multisample render target (samples 4), a subtle `UnrealBloomPass` (strength about 0.15–0.3, threshold about 0.9, only on eye highlights and rim), then `OutputPass` for tone mapping. Toon characters with bright rims can bloom into "glow blobs", which Nexora's design rules forbid, so keep it barely visible.
- **Tone mapping choice:** Neutral for faithful skin, AgX for a softer filmic roll-off. Test both on the two reference teachers. ACES shifts skin hue.

### Gaps
- I found no measured phone cost for bloom, SMAA or FXAA passes in three.js.

## 5. Performance budget and the WebGPU renderer in 2026

### Takeaway
For one talking character on a mid-range Android phone, target 60 fps where possible (30 fps as the floor), with under about 30–50 draw calls for the character, about 30–70k triangles, KTX2 textures (ETC1S/UASTC) at most 1024² on phones (2048² only for the face atlas on high tier), and the spring-bone count kept small. Stay on `WebGLRenderer` for phones in 2026. WebGPURenderer works with a WebGL2 fallback, but forum reports show it slower on the CPU and on first frame.

### Cited Findings
- **Draw calls and triangles** (community rules of thumb, not official):
  - Under 100 draw calls on mobile. — [three.js performance skill](https://tessl.io/registry/skills/github/CloudAI-X/threejs-skills/threejs-performance), [three.js forum: mobile performance](https://discourse.threejs.org/t/problems-with-performance-on-mobile-devices/23734)
  - A forum poster cites Oculus figures of 50–100 draw calls and 50–100k triangles, calling them a guess. — [three.js forum: scene optimisation](https://discourse.threejs.org/t/three-scene-optimization-texture-size-calculation-in-gpu-compression-merge-meshes-what-the-limits/23972)
  - One case study: merging cut draw calls from 387 to 42 and moved mobile from 10 to about 30 fps. — [How we optimized our three.js app for mobile](https://javascript.plainenglish.io/how-we-optimized-our-three-js-application-to-run-on-mobile-devices-4a3bc9e572f4)
- **Textures:** KTX2/ETC1S at most 1024 px on mobile, UASTC on desktop. A 1024² RGBA texture is about 4 MB of VRAM uncompressed. — [threejs agents model optimizer](https://skills.sh/openaec-foundation/three.js-claude-skill-package/threejs-agents-model-optimizer)
- **Measuring:** use `renderer.info.render.calls` and `.triangles`, and `renderer.info.memory.textures`. — [three.js performance skill](https://tessl.io/registry/skills/github/CloudAI-X/threejs-skills/threejs-performance)
- **WebGPURenderer status:**
  - It falls back to WebGL2 automatically. — [three.js manual](https://threejs.org/manual/en/webgpurenderer)
  - One r183 report says it is about 2× slower on the CPU and 5–10× slower on first frame than WebGLRenderer on many-mesh scenes, on both backends. — [forum r183](https://discourse.threejs.org/t/webgpurenderer-2x-slower-cpu-and-5-10x-slower-first-frame-than-webglrenderer-on-many-mesh-scenes-r183-same-on-both-backends/91904)
  - Regressions in r182 were said to be fixed for r183. — [forum r182](https://discourse.threejs.org/t/webgpu-significant-performance-drop-and-shadow-quality-regression-in-r182-vs-webgl-r170/89322)
  - A Babylon forum user: WebGPU on mobile is "not ready to replace WebGL 2 on every mobile device yet". — [Babylon forum](https://forum.babylonjs.com/t/webgpu-on-mobile-is-it-ready/63694)
  - A May 2026 article claims it is production-ready, without benchmarks. — [vr.org](https://vr.org/articles/webgpu-baseline-2026-three-js-webxr-default)
- **three-vrm:** an academic paper says three-vrm has performance problems that hinder VRM use in browsers. — [IOS Press paper](https://ebooks.iospress.nl/pdf/doi/10.3233/ATDE221162)

### Inferences
- Budget for the teacher (my proposal, in line with the cited rules of thumb):
  - **Character:** 30–70k triangles. Material slots at most about 8 (skin, face, eyes, hair, cloth ×2, lashes/brows, mouth); merge meshes per material. Outlines double the draw calls of outlined meshes.
  - **Textures:** KTX2 ETC1S for base colour on phones, UASTC for normal maps and the face. 1024² per atlas on phones. About 20–40 MB of GPU texture memory in total.
  - **Skinning:** at most about 4 bone influences. Bone count is not a GPU issue at these sizes.
  - **Spring bones:** three-vrm runs them on the CPU in JS. Keep chains to about 10–30 joints, collider counts small, and update at a fixed step.
  - **Frame time:** 16.6 ms target, 33 ms floor. Since the teacher is a page overlay, cap rendering to 30 fps when idle and render on demand when nothing animates.
- Use `WebGLRenderer` + MToonMaterial or patched PBR on phones in 2026. Keep any WebGPU path optional and opt-in, measured per device, much like the existing on-device Guru gating.
- The existing head-and-shoulders framing allows a lower triangle budget below the waist. Decimate legs and feet heavily.

### Gaps
- I found no measured cost for spring bones in three-vrm and no benchmarks of `MToonNodeMaterial` on mobile.
- I found no official three.js triangle or draw-call budget.

## 6. Hair and eye rendering for anime characters

### Takeaway
Eyes: a parallax iris (UV offset by view direction) plus a highlight that is a separate, always-bright texture or mesh, optionally rotated by the half vector. A clearcoat or matcap "cornea" sheen sells depth cheaply. True refraction is costly and reportedly hard to make look right. Hair: alpha-test (cutout) for cards, a shifted "angel-ring" anisotropic band (Kajiya-Kay style or a matcap/texture band), a higher toony factor than skin, and a soft rim. For the face–hair overlap, render the hair shadow on the face via a stencil or a simple offset shadow (a common anime technique; no source was fetched for this).

### Cited Findings
- Anime Shading Plus eye setup: parallax mapping for the concave pupil, a MatCap eyeball reflection, and a highlight map that "rotates based on the current Half Vector". If the pupil is modelled concave, the parallax can be skipped. — [ASP eye guide](https://erichu33.github.io/ASPDocs/en/articles/eyes-anime-like-setup-guide.html)
- CryEngine's eye shader uses an iris-depth parallax and a glint multiplier for the highlight. — [CryEngine Eye Shader](https://www.cryengine.com/docs/static/engines/cryengine-3/categories/1114113/pages/15728675)
- Unity HDRP Eye master stack: Depth Offset fed from Parallax Occlusion Mapping, plus an iris normal. — [Unity HDRP Eye](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@14.0/manual/master-stack-eye.html)
- Valve EyeRefract shader. — [Valve EyeRefract](https://developer.valvesoftware.com/wiki/EyeRefract)
- An Unreal user says refraction "couldn't get it to look right", which favours parallax over refraction. — [UE forum](https://forums.unrealengine.com/t/eye-shader-iris-parallax-effect/2364)
- Parallax interior-mapping anime eyes. — [80.lv](https://80.lv/articles/artist-shows-parallax-interior-map-setup-with-anime-eyes/)
- Repo evidence: `look.ts` already alpha-tests hair and lashes at 0.45 with depthWrite on, to avoid dark halos from blended self-overlap.

### Inferences
- **Eyes (cheap, phone-safe):**
  - In the eye material, offset the iris UV by `(V.xy in tangent space) * depth` with depth about 0.02–0.05.
  - Add a separate unlit highlight layer (two small dots: key and fill). Keep it unaffected by tone mapping or shadow, and move it slightly with the head to sell wetness.
  - Use a thin clearcoat (PBR path) or a matcap (MToon path) for the cornea.
  - Never let the toon shadow fully cover the iris.
- **Hair:**
  - Alpha-test the cards. Sort the opaque scalp first.
  - Add an anisotropic highlight band via a tangent-shifted specular, or a baked "angel ring" texture modulated by N·H. Optionally use `MeshPhysicalMaterial.anisotropy` (r163+) on the PBR path. All of this is unbenchmarked.
  - Use the rim on hair edges to separate the hair from the background, which matters for legibility on phones.

### Gaps
- I found no three.js-specific anime eye or hair shader examples, and no WebGL cost data for them.
- I could not source the hair-shadow-on-face technique in this session.
