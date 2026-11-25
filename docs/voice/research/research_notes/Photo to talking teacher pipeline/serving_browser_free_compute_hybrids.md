# Serving a photoreal talking-head teacher live for free: on-device options, free compute terms, hybrid architectures

Research date: 2026-11-25. Network note: huggingface.co, research.google.com, kaggle.com, deepwiki.com and developers.cloudflare.com could not be fetched directly from this session (blocked hosts). For those sources, the quotes below come from search-engine snippets of the official pages, and each one is marked. Anything marked **[unverified]** still needs a check against the live page.

## 1. In-browser and on-device options (ports, fps, sizes, first load)

### Takeaway
The only photoreal-ish, one-photo, already-browser-ready path found is **LAM** (Alibaba Tongyi, SIGGRAPH 2025). It builds a Gaussian-splat head from one image in about 1.4 s on a server. A WebGL renderer (MIT) plays it, with a vendor-reported 110+ fps on a Xiaomi 14. Lip and face motion come from ARKit blendshapes. `wav2arkit_cpu` (ONNX, about 101 MB int8) can make those from audio on the CPU or in a WASM worker. I found no browser port of LivePortrait, MuseTalk, Ditto, SadTalker or Wav2Lip with measured phone fps. Those are GPU, TensorRT-class models.

### Cited Findings
- **LAM (aigc3d/LAM).** "Build 3D Interactive Chatting Avatar with One Image in Seconds!" The LAM-20K model reconstructs an avatar in about 1.4 s. The model table reports 562.9 FPS animating and rendering on an A100, and **"110+FPS" on a Xiaomi 14 phone**. Code is Apache-2.0. There is a separate `LICENSE_WEIGHT` file whose terms the README page does not summarise **[check before use]**. Avatars export as a ZIP "for real-time conversations on OpenAvatarChat" (tools/AVATAR_EXPORT_GUIDE.md). Model sizes are not given. — [aigc3d/LAM](https://github.com/aigc3d/LAM)
- **LAM_WebRender.** A "Lightweight WebGL Renderer" for real-time 3D Gaussian Splatting of LAM avatars. Input is an avatar ZIP plus a JSON of expression frames. Licence MIT. No WebGPU, and no mobile fps or asset size stated. — [aigc3d/LAM_WebRender](https://github.com/aigc3d/LAM_WebRender)
- **LAM_Audio2Expression (LAM-A2E).** Audio goes through a Wav2Vec encoder to ARKit blendshape coefficients, adapted to FLAME topology. Licence Apache-2.0. The install targets CUDA 11.8/12.1. The README claims "real-time" but gives no benchmark. — [aigc3d/LAM_Audio2Expression](https://github.com/aigc3d/LAM_Audio2Expression)
- **wav2arkit_cpu (myned-ai).** An ONNX model, "raw audio waveforms directly into 52 ARKit-compatible facial blendshapes… based on Wav2Vec2 and LAM Audio2Expression… optimized for real-time CPU inference". Input is 16 kHz mono float32, run with ONNX Runtime CPUExecutionProvider. The card is a mirror snippet; huggingface.co was blocked. — [wav2arkit_cpu model card (mirror)](https://hug-proxy.pages.dev/myned-ai/wav2arkit_cpu)
- **avatarz (payner35).** A browser-only talking head with photoreal Gaussian-splat heads. The default lip-sync extractor is `wav2arkit`: 52 ARKit channels at 30 fps, int8, in a WASM worker, **101 MB**. Lighter options are `headaudio` (a 14 kB classifier) and `formant`. It renders in WebGL. Measured only on an M-series Mac in Chrome; Safari, Firefox and phones are untested. GPU frame drops at device pixel ratio 2 (no numbers). Code is MIT and the lip model Apache-2.0. Sample heads come from gsplat-talkinghead and are of unknown licence ("dev samples only"). — [payner35/avatarz](https://github.com/payner35/avatarz)
- **met4citizen/TalkingHead.** A JS class for a 3D (not photoreal) avatar with real-time lip-sync, viseme detection in an audio worklet, and it can run in the browser. It does not need a lip-sync module if the TTS outputs visemes or blendshapes. — [met4citizen/TalkingHead](https://github.com/met4citizen/TalkingHead)
- **GNM + Three.js talking avatar.** Fully client-side, with local WebGPU speech models. Jaw, lip and tongue are driven from the Web Audio clock. Recommends a current Chromium browser. — [threejs-talking-avatar](https://github.com/majidmanzarpour/threejs-talking-avatar)
- **LivePortrait in the browser.** No official or verified browser port found. "LP-Distilled0.1.onnx" is described as an experimental, proof-of-concept browser distillation (ONNX Runtime Web / WebGPU, WASM fallback, 256×256) with **no fps given**. — [slperez/LP-Distilled0.1-ONNX](https://huggingface.co/slperez/LP-Distilled0.1-ONNX). Native speeds:
  - FasterLivePortrait claims 30+ FPS on modern GPUs with TensorRT, a per-frame figure that includes pre- and post-processing. — [FasterLivePortrait README (HF Space)](https://huggingface.co/spaces/AndroidGuy/FasterLivepotrait/blob/main/README.md)
  - Community reports put ONNX Runtime GPU at about 70 ms/frame (~12 fps) on an RTX 3090 and about 8 fps on an RTX 4070 Ti (anecdotal, via search summary). — [FasterLivePortrait HF](https://huggingface.co/warmshao/FasterLivePortrait/tree/main)
- **LivePortrait on a Mac.** The official README says Apple Silicon is "maybe 20x slower than RTX 4090". — [KwaiVGI/LivePortrait](https://github.com/KwaiVGI/LivePortrait)
- **LivePortrait licence.** Its LICENSE file was not readable via the fetch. The README thanks InsightFace and X-Pose. **[unverified]**: from prior knowledge, the InsightFace detection models in LivePortrait are non-commercial, and that must be checked.
- **Duix-Mobile.** "an open-source SDK … to create real-time interactive AI avatars directly on mobile devices or embedded screens" (native Android/iOS, not web). — [duix-mobile README](https://cdn.jsdelivr.net/gh/duixcom/duix-mobile@main/README.md)

### Inferences
- For mid-range Android over 4G, a design of "Gaussian head + blendshapes rendered on the device" is the only photoreal route that does not need a GPU per viewer. The 110+ fps figure on the Xiaomi 14 is a flagship result; a mid-range phone (Adreno 6xx / Mali G57-class) could plausibly be 3–5× slower, which would still be at or above 25 fps. That is an estimate; test it on target phones.
- Running the 101 MB `wav2arkit` model in the browser is a heavy first load on 4G (roughly 30–60 s at 15–30 Mbps of real throughput). It is better to run `wav2arkit_cpu` on the server and stream only blendshape frames, or to use the 14 kB `headaudio` classifier on low-end phones.
- Pixel-space models (LivePortrait, MuseTalk, Wav2Lip, Ditto, SadTalker) are not realistic in a phone browser today, and nothing measured shows otherwise.

### Gaps
- No measured fps of LAM_WebRender or avatarz on a mid-range Android phone or a MacBook browser was found.
- LAM splat ZIP sizes, and the `LICENSE_WEIGHT` terms, are unknown.
- No browser ports with numbers were found for Ditto, MuseTalk, SadTalker, Wav2Lip, NeRF heads or the radiancefields.com "GSplat TalkingHead" article. The article was not retrieved.
- No WebNN, MediaPipe or TF.js talking-head benchmarks were found.

## 2. Free compute terms for serving a public website

### Takeaway
Nothing truly free gives an always-on GPU for a public site:
- **Colab:** the free tier forbids web-service use outright.
- **Kaggle:** its policy bans "server farming". Using notebooks as a backend is at best a grey area, so not advised.
- **ZeroGPU:** it works for public demos, but each visitor gets only minutes of GPU per day, and hosting one needs PRO ($9/mo) **[unverified wording]**.
- **Modal:** $30/month of credits is the best genuinely free GPU budget.
- **Oracle Always Free:** CPU only, and reportedly halved to 2 OCPU / 12 GB in 2026.
- **Cloudflare Workers AI:** 10k Neurons per day, with no avatar models.
- **NVIDIA Audio2Face-3D:** the weights are open, but they need an NVIDIA GPU to run.

### Cited Findings
- **Google Colab**
  - Copies of the FAQ list as disallowed on free managed runtimes "file hosting, media serving, or other web service offerings not related to interactive compute with Colab", and also bypassing the notebook UI to work mainly through a web UI. They state these apply to free runtimes "without a positive Colab compute unit balance". Quoted via search snippets; the live page was blocked. — [Colab FAQ](https://research.google.com/colaboratory/faq.html)
  - The Additional Terms bind users to the FAQ's restricted activities. — [Colab ToS v5](https://research.google.com/colaboratory/tos_v5.html)
  - Google restricted Stable Diffusion web UIs on the free tier, saying free interactive notebook compute "must be prioritized". — [Decrypt](https://decrypt.co/197428/google-colab-stable-diffusion-web-ui-ban)
  - Google banned deepfake-generating projects from Colab in 2022. — [TechCrunch](https://techcrunch.com/2022/06/01/2328459/)
  - This matters because a photo-driven talking head of a real person is close to that category, so keep consent on record.
- **Kaggle.** The Acceptable Use Policy bars using Services resources for cryptomining, DDoS, **"server farming"** and harmful content (via search snippet; kaggle.com was blocked). No clause naming "web server" was found. — [Kaggle AUP](https://kaggle.com/aup), [Kaggle Terms](https://kaggle.com/terms)
- **Hugging Face ZeroGPU**
  - The current docs list daily ZeroGPU quota as 2 min unauthenticated, 5 min free account, 40 min PRO, 40 min Team, 60 min Enterprise. Extra time costs $1 per 10 GPU-minutes (PRO and above). — [ZeroGPU docs](https://huggingface.co/docs/hub/spaces-zerogpu.md), [Spaces as API endpoints](https://huggingface.co/docs/hub/en/spaces-api-endpoints)
  - Forum posts still cite an older 25-min PRO figure. — [HF forum](https://discuss.huggingface.co/t/what-is-the-guest-daily-zerogpu-quota/179433)
  - Quota is charged to the visitor only if their token or X-IP-Token is forwarded; calls through a proxy or custom frontend look unauthenticated and use the shared pool. — [huggingface_hub issue #3362](https://github.com/huggingface/huggingface_hub/issues/3362), [HF forum](https://discuss.huggingface.co/t/it-seems-use-60-sec-gpu-quota-instead-of-real-time-usage/175130)
  - PRO is $9/month and covers storage and ZeroGPU. — [istarsoft guide](https://istarsoft.com/guides/huggingface-pro-9-storage-zerogpu-not-two-dollar-inference/)
  - **[unverified, docs page blocked]**: hosting your own ZeroGPU Space needs a PRO (or Team/Enterprise) account, and the GPU is an H200 slice.
- **Modal.** The Starter plan is $0 base with "$30 / month free compute". Third-party listings add 3 seats, 100 containers and a 10-GPU concurrency limit. Sources conflict on whether a card is needed (older listings: $5 without a card, $30 with one). — [Modal pricing](https://modal.com/pricing), [costbench](https://www.costbench.com/software/ai-gpu-cloud/modal/free-plan/), [Mintlify free-LLM list](https://www.mintlify.com/cheahjs/free-llm-api-resources/providers/trial/modal)
- **Oracle Cloud Always Free**
  - The docs describe A1 as "3,000 OCPU hours and 18,000 GB hours per month" (4 OCPU / 24 GB). Idle instances "may be reclaimed" if "during a 7-day period, the CPU utilization for the 95th percentile is less than 20%". — [Oracle Always Free resources](https://docs.oracle.com/iaas/Content/FreeTier/resourceref.htm)
  - 2026 reports say the limit was cut to **2 OCPU / 12 GB**, with dates cited as June 15 or Aug 18, 2026. Instances over the limit are disabled, then deleted after 30 days. — [InfoQ](https://infoq.com/news/2026/07/oracle-cloud-free-tier-limits/), [FreeTierWatch](https://buttondown.com/freetierwatch/archive/oracle-quietly-halved-its-famous-free-tier-and/), [LinuxToday](https://www.linuxtoday.com/blog/oracle-quietly-cuts-free-tier-ampere-a1-resources-in-half/)
  - Conflict: the Oracle doc snippet still shows 4/24, so check the live console.
- **Cloudflare Workers AI**
  - "10,000 Neurons per day" free, resetting at 00:00 UTC; "further operations will fail with an error" once used. Paid usage is $0.011 per 1,000 Neurons, and the Paid plan is $5/mo. — [CF pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
  - A 2026-07-28 changelog says some models now require Workers Paid. — [CF changelog](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/)
  - No talking-head or video models were found in its catalogue (from search; the catalogue was not fetched).
- **NVIDIA Audio2Face-3D**
  - Open-sourced: SDK under MIT, training framework under Apache. Weights are under the **NVIDIA Open Model License** as ONNX-TRT; Audio2Emotion is under a separate custom licence. — [NVIDIA blog](https://developer.nvidia.com/blog/nvidia-open-sources-audio2face-animation-model), [HF A2F-3D v3.0](https://huggingface.co/nvidia/Audio2Face-3D-v3.0)
  - The NIM container is under the NVIDIA Software License Agreement. — [NGC](https://catalog.ngc.nvidia.com/orgs/nim/nvidia/containers/audio2face-3d/latest)
  - Free API terms on build.nvidia.com could not be verified. — [build.nvidia.com](https://build.nvidia.com/nvidia/audio2face-3d.md)
- **Startup programmes**
  - Google for Startups pre-funded tier: "$2,000 in Cloud credits" for startups without institutional funding. Its age rule conflicts between pages (5 years vs 24 months). The $350k AI tier is for funded startups. — [Google pre-funded](https://cloud.google.com/startup/pre-funded?hl=en), [Google benefits](https://cloud.google.com/startup/benefits)
  - "Founders Hub" is renamed Microsoft for Startups: "up to $150K in Startup credits over time". It needs a registered legal entity. A forum answer cites about $5k for bootstrapped founders **[unverified]**. — [MS changes](https://learn.microsoft.com/en-us/startups/changes-microsoft-for-startups), [MS application](https://learn.microsoft.com/en-us/microsoft-for-startups/application), [MS Q&A](https://learn.microsoft.com/en-in/answers/questions/5912941/eligibility-for-microsoft-for-startups-founders-hu)

### Inferences
- Colab and Kaggle should not back a public site. Colab forbids it in plain words; Kaggle's "server farming" clause and its session limits make it unreliable and risky.
- What $30/month of Modal buys is an estimate, not a measured figure. On a T4-class GPU, which from prior knowledge costs roughly $0.59/h **[unverified]**, it is about 50 GPU-hours a month. That fits pre-rendering lesson narration in batches, but not an always-on live avatar.
- ZeroGPU suits a "try it" demo, not a production teacher. With a custom frontend, visitors share the unauthenticated pool (2 min/day).
- Oracle A1 at 2 OCPU / 12 GB is enough for `wav2arkit_cpu` blendshape inference, a few streams, and the site's other free services (coder model, voice server). It is not enough for pixel-space video synthesis. Keep CPU p95 above 20% or risk reclaim.
- Startup credits (Google $2k, Microsoft) need a legal entity and are one-time, so they are not "free forever". Say this plainly to the owner.

### Gaps
- Exact current ZeroGPU hosting rules (the PRO requirement, commercial use, GPU type) were not fetched.
- Lightning.ai free tier, AMD Developer Cloud credits, AWS Activate (Founders tier), HF Inference free tier, Sarvam, Bhashini and NVIDIA Inception terms were not researched (tool-call budget).
- Kaggle's full Terms text was not readable.

## 3. Hybrid architectures in real products and open projects

### Takeaway
The open stacks split two ways:
- **Server renders pixels, sends video by WebRTC.** LiveTalking (Wav2Lip, MuseTalk) and OpenAvatarChat with MuseTalk or FlashHead do this, and it needs an RTX 3060+ GPU per few sessions.
- **Server sends motion, the client renders.** OpenAvatarChat with LAM sends ARKit blendshapes to a WebGL splat head. bitHuman goes further and runs the whole avatar on the CPU.

For NexoraGuru the best fit, on cost, latency and phone reach, is the second: a LAM-style splat head rendered on the device, driven by blendshapes made on a free CPU server or locally, with pre-rendered video for lesson narration.

### Cited Findings
- **OpenAvatarChat** (Apache-2.0)
  - Modular ASR, LLM, TTS and avatar parts; gradio-webrtc media; silero-vad; YAML configs; a separate WebUI since v0.6.0.
  - Average response time "平均响应时间仅 2.2 秒" (about 2.2 s).
  - Avatars: LiteAvatar (multiple sessions on one machine since v0.5.1), LAM, MuseTalk, SoulX-FlashHead; all support interruption.
  - — [OpenAvatarChat](https://github.com/HumanAIGC-Engineering/OpenAvatarChat)
  - LAM is listed there as needing a GPU on the server, while other avatars are CPU-capable. The README cites up to 30 FPS CPU inference for its digital-human part, likely LiteAvatar. This is a conflict noted via search; the DeepWiki page was blocked. — [DeepWiki OpenAvatarChat LAM](https://deepwiki.com/HumanAIGC-Engineering/OpenAvatarChat/6.3-lam-system), [lite-avatar](https://github.com/ARplus/lite-avatar)
- **LiveTalking (lipku, formerly metahuman-stream)** (Apache-2.0)
  - Models: wav2lip, MuseTalk, ERNeRF, Ultralight.
  - Measured fps:

    | Model | GPU | fps |
    |---|---|---|
    | wav2lip256 | RTX 3060 | 60 |
    | wav2lip256 | RTX 3080Ti | 120 |
    | MuseTalk | RTX 3080Ti | 42 |
    | MuseTalk | RTX 3090 | 45 |
    | MuseTalk | RTX 4090 | 72 |

  - Both inference and stream fps must be ≥ 25. Video encoding runs on the CPU. Concurrency is CPU-bound when idle and GPU-bound when speaking.
  - Sends WebRTC (or RTMP); needs TCP 8010 and the UDP range open.
  - — [lipku/LiveTalking](https://github.com/lipku/LiveTalking)
- **Duix-Avatar** (offline video generation)
  - "free for most (requires license if >100k users or >$10M revenue)". Real-time is offered through duix.com, not this repo. — [Duix-Avatar README](https://cdn.jsdelivr.net/gh/duixcom/duix-avatar@main/README.md), [Duix-Avatar GitHub](https://github.com/duixcom/Duix-Avatar)
  - An unofficial fork's FAQ says the free models are "not available for commercial use", which conflicts with the official README. — [fork](https://github.com/EvolvingSoftware/duix.heygem)
  - Duix-Mobile's licence file was not retrieved.
- **bitHuman**
  - Its SDK (Aug 2025) runs avatars "directly on single CPUs", Arm and x86, on Chromebooks, Mac Minis and Raspberry Pis. It claims under 100 ms latency (vendor claim) and streams voice via LiveKit. — [SD Times](https://sdtimes.com/ai/bithuman-launches-sdk-for-creating-ai-avatars/), [DestinationCRM](https://www.destinationcrm.com/Articles/CRM-News/CRM-Across-the-Wire/bitHuman-Launches-CPU-Based-Avatar-SDK-170885.aspx)
  - A partner case study says the models run entirely on CPU. — [Cerebrium case study](https://www.cerebrium.ai/case-studies/bithuman)
- **Simli.** A third-party article says it renders from a Gaussian-splatting representation rather than in pixel space; server- or client-side is unconfirmed. The same source notes that vendor sub-100 ms figures exclude the network. — [comparison article](https://meet-cody-website-xr0tt.kinsta.page/blog/real-time-ai-avatar-models-compared/)
- **Research on low latency.** LLIA (a real-time, audio-driven diffusion portrait) shows how diffusion avatars reach low latency on high-end GPUs. — [LLIA arXiv 2506.05806](https://arxiv.org/html/2506.05806v1)

### Inferences (comparison)

| Approach | Quality | Cost (free?) | Latency to first frame | Works on mid-range Android |
|---|---|---|---|---|
| Server pixel synthesis (MuseTalk, Wav2Lip) + WebRTC | High (mouth); fixed pose | Needs a GPU per ~2–4 live sessions; not free | about 0.5–1 s after the TTS audio starts (estimate) | Yes (only plays video), but uses bandwidth |
| Server blendshapes + client splat render (LAM / OpenAvatarChat) | Good 3D head, photoreal-ish, a little "gamey" around hair and mouth interior | Free: CPU server (Oracle) or in-browser WASM | First blendshape frame in about 100–300 ms after the audio chunk (estimate) | Probably yes, needs WebGL2; untested on mid-range phones |
| Pre-rendered idle, listening and thinking loops + real-time mouth only (Wav2Lip-style patch) | High for the loops; seams are possible | Loops free (offline); the mouth patch still needs a server GPU | Low | Yes |
| Viseme sprite bank + face-tracked compositing | Medium (no in-between mouth shapes) | Fully free, client only | About 0 | Yes, even low-end |
| 2D mesh warp from landmarks (Live2D / Inochi2D-like on the photo) | Medium; photo looks puppeted | Fully free, client only | About 0 | Yes |
| Motion keypoints (LivePortrait motion space) to a client warp/decoder | High if the decoder runs | Decoder too heavy for phones today (no browser port) | — | Not yet |

- Lesson narration should be pre-rendered offline: MuseTalk, LivePortrait or LAM on Modal credits or a local GPU, then served as ordinary MP4/HLS from the site.
- Live tutor replies should use the blendshape-to-client path, with the 14 kB `headaudio` lip classifier as the fallback on weak phones.

### Gaps
- No public architecture notes from HeyGen, Synthesia, D-ID or Tavus were found or fetched.
- The internals of bitHuman and Simli are not independently confirmed.

## 4. Bandwidth per minute: video streaming vs keypoint/blendshape streaming

### Takeaway
Streaming blendshapes is about 20–60× cheaper on bandwidth than streaming talking-head video. This is a calculation, not a measured source. It matters a lot on Indian 4G data plans.

### Cited Findings
- wav2arkit outputs **52 ARKit channels at 30 fps**. — [avatarz](https://github.com/payner35/avatarz)
- LiveTalking needs at least 25 fps for real time, and its video encoding runs on the CPU. — [LiveTalking](https://github.com/lipku/LiveTalking)

### Inferences (calculations; no measured source found)
- **Blendshapes**, 52 channels × 30 fps:
  - as float32: 6.2 KB/s, about **375 KB/min**
  - quantised to 1 byte: about **94 KB/min**
  - plus head pose (6 values): small extra
  - with delta or gzip compression: likely under 100 KB/min
- **WebRTC talking-head video**, 512×512 at 25 fps with H.264/VP8 at a typical 0.5–1.0 Mbps (assumed): about **3.75–7.5 MB/min**, plus Opus audio at about 24–32 kbps (~0.2 MB/min) in both designs.
- **Motion keypoints** (LivePortrait motion space: ~21 keypoints × 3 + pose/expression, ~70 floats): similar to blendshapes, about 0.3–0.5 MB/min as float32.
- **One-time costs** of the blendshape path: the splat head ZIP (size unknown) and, if lip inference runs in the browser, the 101 MB model. Cache both with a service worker.

### Gaps
- No published measurement of real bitrates for OpenAvatarChat LAM streams or LiveTalking WebRTC streams was found.
- LAM avatar ZIP size is unknown, so the first-load estimate is incomplete.
