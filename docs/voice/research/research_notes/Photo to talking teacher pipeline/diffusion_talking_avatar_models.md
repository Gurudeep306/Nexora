# Open-source diffusion / video-foundation-model talking avatars (one photo + audio), 2024–2026

Research date: 2026-11-25. Method: licence files and READMEs read raw from GitHub (raw.githubusercontent.com), weight licences read from the Hugging Face model API (`huggingface.co/api/models/<id>` "license:" tag), and comparison tables extracted from arXiv HTML. GitHub's REST API was not reachable from this session, so repo creation dates come from READMEs. "Unverified" means the text was not read in this session.

Short map of the field (Nov 2026):
- **Gen 1 (2024), SD1.5 / SVD UNet based, head-only:** EchoMimic v1, Hallo, Hallo2, V-Express, AniPortrait, MEMO, Sonic, HunyuanPortrait, X-Portrait.
- **Gen 2 (2025), video-DiT based (Wan 2.1/2.2, HunyuanVideo, CogVideoX), upper body and hands, prompt control:** Hallo3, EchoMimic v3, FantasyTalking, OmniAvatar, HunyuanVideo-Avatar, MultiTalk, InfiniteTalk, StableAvatar, Wan2.2-S2V.
- **Gen 3 (late 2025–2026), distilled, long-form or streaming:** LongCat-Video-Avatar 1.0/1.5/1.6 (Meituan, MIT), Live Avatar (Alibaba Quark, Apache-2.0), SoulX-FlashTalk / FlashHead (Soul AI Lab), Kandinsky S2V 1.0 Lite/Pro (Kandinsky Lab, MIT, Oct 2026), EchoMimicV3-Flash.

## Q1. Licences (code, weights, base model, bundled sub-models) and commercial use from India

### Takeaway
The models that are clean for commercial use from India on both code and weights are the Wan-based family (InfiniteTalk, MultiTalk, OmniAvatar, FantasyTalking, Wan2.2-S2V, StableAvatar, EchoMimic v3, Live Avatar, SoulX-FlashTalk) plus the MIT LongCat-Video-Avatar and Kandinsky S2V lines. Sonic (CC BY-NC-SA), HunyuanPortrait (academic only) and V-Express checkpoints (research only) are out. HunyuanVideo-Avatar is allowed in India, because its Territory excludes only the EU, UK and South Korea, but it carries Tencent's community terms. Even for "clean" models, the bundled extras need checking one by one: InsightFace models, CodeFormer and SVD.

### Cited Findings

**Clean (permissive code + permissive weights + permissive base model)**
- **InfiniteTalk (MeiGen-AI, released 19 Aug 2025):** code is Apache-2.0 (`LICENSE.txt`). The weights `MeiGen-AI/InfiniteTalk` are tagged `license:apache-2.0`. Base model `Wan-AI/Wan2.1-I2V-14B-480P` is `license:apache-2.0`. Audio encoder `TencentGameMate/chinese-wav2vec2-base` is `license:mit`. — [InfiniteTalk LICENSE](https://raw.githubusercontent.com/MeiGen-AI/InfiniteTalk/main/LICENSE.txt); [HF API InfiniteTalk](https://huggingface.co/api/models/MeiGen-AI/InfiniteTalk); [HF API Wan2.1-I2V-14B-480P](https://huggingface.co/api/models/Wan-AI/Wan2.1-I2V-14B-480P); [HF API chinese-wav2vec2-base](https://huggingface.co/api/models/TencentGameMate/chinese-wav2vec2-base)
- **MultiTalk (MeiGen-AI, weights 9 Jun 2025):** code is Apache-2.0. The weights `MeiGen-AI/MeiGen-MultiTalk` are `license:apache-2.0`. It uses the same Wan2.1-I2V-14B-480P and chinese-wav2vec2 parts, plus Kokoro-82M for TTS. — [MultiTalk README](https://raw.githubusercontent.com/MeiGen-AI/MultiTalk/main/README.md); [HF API MultiTalk](https://huggingface.co/api/models/MeiGen-AI/MeiGen-MultiTalk)
- **Wan2.2-S2V-14B (Alibaba Wan, 26 Aug 2025):** the Wan2.2 repo is Apache-2.0 (`LICENSE.txt`) and the weights `Wan-AI/Wan2.2-S2V-14B` are `license:apache-2.0`. Wan2.2-Animate-14B is also `apache-2.0`. — [Wan2.2 LICENSE](https://raw.githubusercontent.com/Wan-Video/Wan2.2/main/LICENSE.txt); [HF API Wan2.2-S2V-14B](https://huggingface.co/api/models/Wan-AI/Wan2.2-S2V-14B); [HF API Wan2.2-Animate-14B](https://huggingface.co/api/models/Wan-AI/Wan2.2-Animate-14B)
- **OmniAvatar (ZJU + Alibaba, 24 Jun 2025; 1.3B on 2 Jul 2025):** code is Apache-2.0 and `OmniAvatar/OmniAvatar-14B` is `apache-2.0`. Its bases are Wan2.1-T2V-14B / T2V-1.3B (Apache-2.0, `Wan-AI/Wan2.1-T2V-1.3B` checked) and `facebook/wav2vec2-base-960h` (`apache-2.0`). — [OmniAvatar LICENSE](https://raw.githubusercontent.com/Omni-Avatar/OmniAvatar/main/LICENSE.txt); [HF API OmniAvatar-14B](https://huggingface.co/api/models/OmniAvatar/OmniAvatar-14B); [HF API wav2vec2-base-960h](https://huggingface.co/api/models/facebook/wav2vec2-base-960h)
- **FantasyTalking (AMAP/Alibaba, weights 28 Apr 2025, ACM MM 2025):** code is Apache-2.0 and `acvlab/FantasyTalking` is `apache-2.0`. Its base is Wan2.1-I2V-14B-720P and its audio encoder is wav2vec2-base-960h. — [FantasyTalking LICENSE](https://raw.githubusercontent.com/Fantasy-AMAP/fantasy-talking/main/LICENSE); [HF API FantasyTalking](https://huggingface.co/api/models/acvlab/FantasyTalking)
- **StableAvatar (11 Aug 2025; NeurIPS 2026 per README):** code is MIT ("Copyright (c) Shuyuan Tu") and the weights `FrancisRing/StableAvatar` are `license:mit`. Its base is Wan2.1-1.3B. The HF demo is limited to HF Pro users. — [StableAvatar LICENSE](https://raw.githubusercontent.com/Francis-Rings/StableAvatar/main/LICENSE.txt); [HF API StableAvatar](https://huggingface.co/api/models/FrancisRing/StableAvatar); [StableAvatar README](https://raw.githubusercontent.com/Francis-Rings/StableAvatar/main/README.md)
- **EchoMimic v3 (Ant Group, code 8 Aug 2025, AAAI 2026; Flash 22 Jan 2026):** code is Apache-2.0 (`LICENSE.txt`). The README says: "The models in this repository are licensed under the Apache 2.0 License. We claim no rights over the your generated contents". HF `BadToBest/EchoMimicV3` is `apache-2.0`. Its base `alibaba-pai/Wan2.1-Fun-V1.1-1.3B-InP` is `apache-2.0`. — [EchoMimicV3 README](https://raw.githubusercontent.com/antgroup/echomimic_v3/main/README.md); [HF API EchoMimicV3](https://huggingface.co/api/models/BadToBest/EchoMimicV3); [HF API Wan2.1-Fun](https://huggingface.co/api/models/alibaba-pai/Wan2.1-Fun-V1.1-1.3B-InP)
- **LongCat-Video-Avatar (Meituan):** v1.0 on 16 Dec 2025, v1.5 on 21 May 2026 (Whisper-Large audio encoder, 8-step distilled), and **v1.6 on 15 Nov 2026**. The repo is MIT ("Copyright (c) 2025 Meituan"). HF `meituan-longcat/LongCat-Video-Avatar` and `-1.5` and `-1.6` are all `license:mit`. Base `meituan-longcat/LongCat-Video` is `license:mit`. — [LongCat-Video README](https://raw.githubusercontent.com/meituan-longcat/LongCat-Video/main/README.md); [HF API LongCat-Video-Avatar-1.6](https://huggingface.co/api/models/meituan-longcat/LongCat-Video-Avatar-1.6); [HF API LongCat-Video-Avatar-1.5](https://huggingface.co/api/models/meituan-longcat/LongCat-Video-Avatar-1.5); [HF API LongCat-Video](https://huggingface.co/api/models/meituan-longcat/LongCat-Video)
- **Kandinsky S2V 1.0 Lite (2.3B) / Pro (21.4B) (Kandinsky Lab, paper dated 15 Oct 2026):** the paper says "we release the code, model checkpoints, and diffusers integration under the MIT license". The repo `kandinskylab/kandinsky-s2v` is MIT ("Copyright (c) 2026 Kandinsky Lab"). HF `Kandinsky-S2V-1.0-Pro` and `-Lite` are `license:mit`, and distilled and Diffusers variants exist. Its base is Kandinsky 5.0 Video (HF `kandinskylab/Kandinsky-5.0-T2V-Pro-sft-5s-Diffusers` is `license:mit`). It uses a Qwen2.5-Omni audio tower and a Hunyuan VAE. — [Kandinsky S2V paper](https://arxiv.org/html/2610.19290v1); [kandinsky-s2v LICENSE](https://raw.githubusercontent.com/kandinskylab/kandinsky-s2v/main/LICENSE); [HF API Kandinsky-S2V-1.0-Pro](https://huggingface.co/api/models/kandinskylab/Kandinsky-S2V-1.0-Pro)
- **Live Avatar (Alibaba Quark + USTC, paper 4 Dec 2025, ECCV 2026 Spotlight):** code is Apache-2.0 and HF `Quark-Vision/Live-Avatar` is `apache-2.0`. It is initialised from Wan-S2V. — [LiveAvatar LICENSE](https://raw.githubusercontent.com/Alibaba-Quark/LiveAvatar/main/LICENSE); [HF API Live-Avatar](https://huggingface.co/api/models/Quark-Vision/Live-Avatar); [Live Avatar paper](https://arxiv.org/html/2512.04677v6)
- **SoulX-FlashTalk (Soul AI Lab, 14B, Jan 2026):** code is Apache-2.0 and HF `Soul-AILab/SoulX-FlashTalk-14B` is `apache-2.0`. **SoulX-FlashHead-1.3B** (12 Feb 2026) has Apache-2.0 code, but its weights are tagged `license:other`; the actual terms are **unverified**. — [SoulX-FlashTalk LICENSE](https://raw.githubusercontent.com/Soul-AILab/SoulX-FlashTalk/main/LICENSE); [HF API FlashTalk-14B](https://huggingface.co/api/models/Soul-AILab/SoulX-FlashTalk-14B); [HF API FlashHead-1_3B](https://huggingface.co/api/models/Soul-AILab/SoulX-FlashHead-1_3B)
- **LightX2V step/CFG-distilled Wan2.1-I2V-14B-480P** (used to speed up InfiniteTalk and MultiTalk) is `license:apache-2.0`. — [HF API lightx2v distill](https://huggingface.co/api/models/lightx2v/Wan2.1-I2V-14B-480P-StepDistill-CfgDistill-Lightx2v)

**Permissive code, but weights or base need care**
- **EchoMimic v1 (Jul 2024) and v2 (Nov 2024, CVPR 2025):** code is Apache-2.0. The HF weight repos `BadToBest/EchoMimic` and `BadToBest/EchoMimicV2` carry **no licence tag**: the model cards open with the title, no `license:` front-matter. So the weight licence is **unverified/unstated**. Both pull SD1.5-family parts (`sd-vae-ft-mse`, `lambdalabs/sd-image-variations-diffusers`). SD1.5 itself is `creativeml-openrail-m`, which allows commercial use subject to use-based restrictions. — [EchoMimic LICENSE](https://raw.githubusercontent.com/antgroup/echomimic/main/LICENSE); [HF API EchoMimic](https://huggingface.co/api/models/BadToBest/EchoMimic); [HF API EchoMimicV2](https://huggingface.co/api/models/BadToBest/EchoMimicV2); [HF API SD1.5](https://huggingface.co/api/models/stable-diffusion-v1-5/stable-diffusion-v1-5)
- **Hallo / Hallo2 / Hallo3 (Fudan):** code is MIT (all three repos) and the HF weights are tagged `license:mit`.
  - Hallo and Hallo2 bundle the InsightFace face analysis, the Kim_Vocal_2 MDX-Net separator (licence **unverified**: HF API needed auth), SD1.5 and wav2vec2.
  - Hallo2's high-resolution feature "is a modified version of CodeFormer … please comply with the S-Lab License 1.0". CodeFormer's licence allows "Redistribution and use for non-commercial purpose", so it is **non-commercial**.
  - Hallo3 "is a fine-tuned derivative version based on the CogVideo-5B I2V model … must comply with the license terms of CogVideo-5B". HF tags CogVideoX-5b-I2V as `license:other`; the full text is **unverified** (the redirect was not followed).

  Sources: [Hallo2 README](https://raw.githubusercontent.com/fudan-generative-vision/hallo2/main/README.md); [Hallo3 README](https://raw.githubusercontent.com/fudan-generative-vision/hallo3/main/README.md); [CodeFormer LICENSE](https://raw.githubusercontent.com/sczhou/CodeFormer/master/LICENSE); [HF API CogVideoX-5b-I2V](https://huggingface.co/api/models/zai-org/CogVideoX-5b-I2V)
- **MEMO (Skywork/NUS, Dec 2024):** code is Apache-2.0 and `memoavatar/memo` is `apache-2.0`. Its config pulls `sd-vae-ft-mse`, `wav2vec2-base-960h` and `iic/emotion2vec_plus_large`; emotion2vec is tagged `license:other` and its terms are **unverified**. It also auto-downloads "models for face analysis and vocal separation", which are unnamed in the README (**unverified**; likely InsightFace and an MDX separator). — [MEMO README](https://raw.githubusercontent.com/memoavatar/memo/main/README.md); [MEMO config](https://raw.githubusercontent.com/memoavatar/memo/main/configs/inference.yaml); [HF API emotion2vec](https://huggingface.co/api/models/emotion2vec/emotion2vec_plus_large)
- **AniPortrait (Tencent Games Zhiji, Mar 2024):** code is Apache-2.0 and HF `ZJYang/AniPortrait` is `apache-2.0`. Its parts are SD1.5 (OpenRAIL-M), sd-vae-ft-mse, the sd-image-variations image encoder and wav2vec2-base-960h. — [AniPortrait README](https://raw.githubusercontent.com/Zejun-Yang/AniPortrait/main/README.md); [HF API AniPortrait](https://huggingface.co/api/models/ZJYang/AniPortrait)
- **X-Portrait (SIGGRAPH 2024) and X-Dyna (ByteDance):** code is Apache-2.0. X-Dyna's HF weights are `license:mit`, but its README says the released model is retrained "on public datasets … and other human video data for research use". **Both are driven by a video, not audio**, so they do not do audio lip sync by themselves. — [X-Dyna README](https://raw.githubusercontent.com/bytedance/X-Dyna/main/README.md); [X-Portrait README](https://raw.githubusercontent.com/bytedance/X-Portrait/main/README.txt)

**Tencent licences**
- **HunyuanVideo-Avatar (28 May 2025):** "TENCENT HUNYUAN COMMUNITY LICENSE AGREEMENT … THIS LICENSE AGREEMENT DOES NOT APPLY IN THE EUROPEAN UNION, UNITED KINGDOM AND SOUTH KOREA". "Territory" means "the worldwide territory, excluding the territory of the European Union, United Kingdom and South Korea", so **India is inside the Territory**. Users may not use the works or their "Output … outside the Territory". Above 100 million MAU, a separate licence is needed. The HF card has no licence tag. — [HunyuanVideo-Avatar LICENSE](https://raw.githubusercontent.com/Tencent-Hunyuan/HunyuanVideo-Avatar/main/LICENSE)
- **HunyuanPortrait (May 2025):** "You agree to use the TencentHunyuanPortrait only for academic, research and education purposes, and refrain from using it for any commercial or production purposes under any circumstances". It is also built on SVD, and its README says "Stable Video Diffusion is licensed under the Stable Video Diffusion Research License". **Not usable commercially.** — [HunyuanPortrait LICENSE](https://raw.githubusercontent.com/Tencent-Hunyuan/HunyuanPortrait/main/LICENSE); [HunyuanPortrait README](https://raw.githubusercontent.com/Tencent-Hunyuan/HunyuanPortrait/main/README.md)
- **Sonic (Tencent/ZJU, CVPR 2025):** the repo licence is "Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International". The README (2025-02-06) says: "Commercialization: Note that our license is non-commercial. If commercialization is required, please use Tencent Cloud Video Creation Large Model". The HF weight card says `license: afl-3.0`, which **conflicts** with the repo licence; the README's explicit non-commercial statement should govern. It is built on SVD-xt plus whisper-tiny. — [Sonic LICENSE](https://raw.githubusercontent.com/jixiaozhong/Sonic/main/LICENSE); [Sonic README](https://raw.githubusercontent.com/jixiaozhong/Sonic/main/README.md); [Sonic HF card](https://huggingface.co/LeonJoe13/Sonic/raw/main/README.md)
- **V-Express (Tencent AI Lab, May 2024):** there is no LICENSE file (404). The README says: "The code of V-Express is released for both academic and commercial usage. However, both manual-downloading and auto-downloading models from V-Express are for non-commercial research purposes. Our released checkpoints are also for research purposes only." — [V-Express README](https://raw.githubusercontent.com/tencent-ailab/V-Express/main/README.md)

**Shared sub-models**
- **Stable Video Diffusion (img2vid-xt), current licence "stable-video-diffusion-community":** it allows "limited commercial uses … for people or organizations generating annual revenue of less than US $1,000,000". Commercial users "must register with Stability AI". — [SVD LICENSE.md](https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt/raw/main/LICENSE.md)
- **InsightFace:** "The code of InsightFace is released under the MIT License … The training data … (and the models trained with these data) are available for non-commercial research purposes only". For buffalo_l, "please contact recognition-oss-pack@insightface.ai for licensing". This affects Hallo, Hallo2 and V-Express (buffalo_l). — [InsightFace README](https://raw.githubusercontent.com/deepinsight/insightface/master/README.md)
- **GFPGAN:** the licence file header reads "Copyright (C) 2021 THL A29 Limited, a Tencent company". Only the header was read, so the full terms are **unverified**. — [GFPGAN LICENSE](https://raw.githubusercontent.com/TencentARC/GFPGAN/master/LICENSE)
- **Audio encoders:** whisper-tiny is `apache-2.0`, wav2vec2-base-960h is `apache-2.0` and chinese-wav2vec2-base is `mit`. — [HF API whisper-tiny](https://huggingface.co/api/models/openai/whisper-tiny)

**Closed models (no code or weights)**
- **EMO (Alibaba, ECCV 2024):** the GitHub repo README holds only the title, badges and citation; there is no code or weights. — [EMO README](https://raw.githubusercontent.com/HumanAIGC/EMO/main/README.md)
- **Loopy (ByteDance):** its project page says "This is only a research demonstration and there's no product or API release plan". — [Loopy page](https://loopyavatar.github.io/)
- **OmniHuman-1 (ByteDance, ICCV 2025):** a paper and project page exist; access is through hosted services (e.g. Replicate `bytedance/omni-human`). No weights were found. — [OmniHuman page](https://omnihuman-lab.github.io); [Replicate](https://replicate.com/bytedance/omni-human)
- **VASA-1 (Microsoft):** closed. The project page text could not be extracted in this session, so the exact "no release" wording is **unverified** here. — [VASA-1 page](https://www.microsoft.com/en-us/research/project/vasa-1/)

### Inferences
- The best commercial-safe shortlist is LongCat-Video-Avatar 1.6 (MIT), Kandinsky S2V (MIT), InfiniteTalk (Apache), Wan2.2-S2V (Apache), Live Avatar (Apache), OmniAvatar (Apache) and EchoMimic v3 (Apache). Each must still be audited for any face detector or separator pulled in at runtime.
- Avoid every pipeline step that silently uses InsightFace buffalo_l, CodeFormer or GFPGAN face restoration. Use a permissive face detector and skip restoration, or use Real-ESRGAN (BSD; not verified here).
- HunyuanVideo-Avatar is legal in India under the licence text, but the output may not be "used … outside the Territory". Students in the EU or UK watching the videos could arguably count as use outside the Territory. That is a legal-risk point, so prefer the Apache/MIT models.

### Gaps
- The CogVideoX-5B licence text (for Hallo3), the emotion2vec "other" terms, the Kim_Vocal_2 separator licence, the SoulX-FlashHead "other" terms and the EchoMimic v1/v2 weight licence were not read.
- No GitHub issue threads on commercial use were read, because the GitHub API was blocked.

## Q2. Quality numbers (claimed vs independent)

### Takeaway
Independent 2026 comparisons put **LongCat-Video-Avatar 1.5** and **Kandinsky S2V Pro (distilled)** at the top of the open models. HunyuanVideo-Avatar, Wan-S2V and InfiniteTalk come next. OmniAvatar posts high Sync-C but loses identity on long videos. StableAvatar's lip sync scores poorly in two independent tests despite its own claims. Older SD1.5-based models (EchoMimic v1/v2, V-Express, AniPortrait) trail clearly.

### Cited Findings
- **Independent benchmark: Kandinsky S2V paper (Oct 2026), Table 6.** These are competitor numbers measured by Kandinsky Lab, which is not neutral about its own model but is independent for the others. Metrics are mean rank (lower is better), Sync-C ↑, Sync-D ↓, CSIM ↑, IQA ↑, ASE ↑. — [Kandinsky S2V paper](https://arxiv.org/html/2610.19290v1)
  - **EMTD:**

    | Model | Mean rank | Sync-C | Sync-D | CSIM | IQA | ASE |
    |---|---|---|---|---|---|---|
    | Kandinsky Pro (distilled) | 2.30 | 8.03 | 7.85 | 0.81 | 4.81 | 3.61 |
    | LongCat 1.5 | 2.90 | 8.41 | 7.39 | 0.75 | 4.73 | 3.63 |
    | Wan-S2V | 6.40 | 7.01 | 8.47 | 0.73 | 4.82 | 3.59 |
    | HunyuanVideo-Avatar | 6.40 | 7.52 | 8.30 | 0.79 | 4.69 | 3.52 |
    | OmniAvatar | 7.60 | 7.78 | 7.90 | 0.65 | 4.57 | 3.29 |
    | InfiniteTalk | 7.70 | 7.33 | 7.93 | 0.74 | 4.58 | 3.41 |
    | MultiTalk | 9.20 | 7.38 | 7.98 | 0.61 | 4.52 | 3.32 |
    | StableAvatar | 9.60 | 3.12 | 12.10 | 0.62 | 4.69 | 3.41 |

  - **HDTF:**

    | Model | Mean rank | Sync-C | Sync-D | CSIM |
    |---|---|---|---|---|
    | Kandinsky Pro (distilled) | 2.70 | 8.12 | 7.82 | 0.86 |
    | LongCat 1.5 | 3.00 | 8.48 | 7.34 | 0.85 |
    | HunyuanVideo-Avatar | 4.60 | 8.07 | 7.74 | 0.87 |
    | InfiniteTalk | 6.40 | 7.70 | 7.59 | 0.86 |
    | Wan-S2V | 6.80 | 7.49 | 8.10 | 0.83 |
    | OmniAvatar | 9.70 | 7.25 | 8.51 | 0.82 |

  - **CelebV-HQ:** the best are Kandinsky Pro (distilled) at mean rank 2.40 and LongCat 1.5 at 2.60, with Sync-C 7.55 for LongCat 1.5.
  - **Kandinsky's side-by-side human study:** the paper says Kandinsky S2V Pro "performs comparably to or better than" the strongest open baseline and two proprietary commercial models, and "is also preferred for lip synchronization". The exact percentages were not extracted.
- **Independent benchmark: Live Avatar paper (Alibaba Quark, v6 Jul 2026).** — [Live Avatar paper](https://arxiv.org/html/2512.04677v6)
  - **GenBench-Short:**

    | Model | Sync-C | Sync-D | Dino-S | FPS |
    |---|---|---|---|---|
    | EchoMimic-V2 | 5.57 | 9.13 | 0.79 | 0.53 |
    | Hallo3 | 4.74 | 10.19 | 0.94 | 0.26 |
    | StableAvatar | 3.42 | 11.33 | 0.93 | 0.64 |
    | OmniAvatar | 6.77 | 8.22 | 0.95 | 0.16 |
    | Wan-S2V | 5.89 | 9.08 | 0.95 | 0.25 |
    | Ditto | 4.09 | 10.76 | 0.99 | 21.8 |
    | Live Avatar | 7.03 | 8.30 | 0.96 | 45.2 |

  - **GenBench-Long (test cases longer than 5 min):** OmniAvatar reaches Sync-C 8.00 but **Dino-S 0.66** (identity collapse), and its IQA falls to 2.86. Live Avatar gets 7.16 / 0.97, Hallo3 6.18 / 0.83, Wan-S2V 6.04 / 0.80 and StableAvatar 1.97 / 0.94.
  - **User study:**

    | Model | Naturalness | Sync | Consistency |
    |---|---|---|---|
    | Wan-S2V | 84.3 | 85.2 | 92.0 |
    | Live Avatar | 80.1 | 86.0 | 93.2 |
    | OmniAvatar | 71.1 | 78.5 | 90.8 |
    | Hallo3 | 78.5 | 69.2 | 89.3 |
    | StableAvatar | 68.7 | 70.8 | 88.9 |
    | EchoMimic-V2 | 60.3 | 71.1 | 38.7 |

  - **AV-Speech FID / FVD:** OmniAvatar 50.42 / 570.32, Wan-S2V 73.68 / 642.48, Hallo3 138.40 / 1412.93, EchoMimic-V2 176.74 / 2059.81 and Live Avatar 48.91 / 502.37.
- **Independent: SoulX-FlashTalk paper (Jan 2026), TalkBench-Short.** The Sync-C scale differs here (all values are about 1). EchoMimic-V3 scores 0.89, StableAvatar 0.78, OmniAvatar 1.32, InfiniteTalk (LoRA) 1.25 and LiveAvatar 1.01. The paper reports OmniAvatar's Subject-C dropping to 85.42 on the long test (over 5 min). — [SoulX-FlashTalk paper](https://arxiv.org/html/2512.23379)
- **Claimed: InfiniteTalk paper, Table 2 (image-to-video).** — [InfiniteTalk paper](https://arxiv.org/html/2508.14033)

  | Dataset | Model | FID | FVD | Sync-C | Sync-D | CSIM |
  |---|---|---|---|---|---|---|
  | HDTF | InfiniteTalk | 27.14 | 132.54 | 9.18 | 6.84 | 0.751 |
  | HDTF | MultiTalk | 27.61 | 133.58 | 9.02 | 6.96 | 0.754 |
  | HDTF | OmniAvatar | 26.63 | 112.49 | 7.06 | 8.63 | 0.752 |
  | HDTF | Hallo3 | 36.48 | 144.65 | 7.20 | 8.61 | 0.674 |
  | HDTF | FantasyTalking | 32.06 | 110.36 | 3.78 | 10.80 | 0.684 |
  | EMTD | InfiniteTalk | — | — | 8.34 | — | 0.709 |
  | EMTD | MultiTalk | — | — | 8.13 | — | — |

  Its human-rated "Lip Sync." score (lower is better) is 1.11, against 2.32 for LatentSync and 2.57 for MuseTalk.
- **Claimed: Wan-S2V paper, Table 1.** Wan-S2V scores FID 15.66, FVD 129.57, Sync-C 4.51, EFID 0.283 and CSIM 0.677. For comparison, HY-Avatar scores FID 18.07 / Sync-C 4.71 / CSIM 0.583, EMO2 FID 27.28 / Sync-C 4.58, EchoMimicV2 FID 33.42 / Sync-C 4.44 and FantasyTalking FID 22.60 / Sync-C 3.00. — [Wan-S2V paper](https://arxiv.org/html/2508.18621)
- **Claimed: OmniAvatar paper, HDTF talking-face table.** OmniAvatar scores FID 37.3, FVD 382, Sync-C 7.62 and Sync-D 8.14. Others: MultiTalk 44.2 / 436 / 7.63, HunyuanAvatar 47.3 / 588 / 7.31, Hallo3 42.1 / 406 / 6.89, FantasyTalking 43.9 / 441 / 3.75, EchoMimic 61.7 / 575 / 5.71, V-Express 59.1 / 548 / 8.02 and AniPortrait 46.1 / 546 / 3.64. The asterisked entries "maybe" overlap their training data. On the AVSpeech semi-body test, OmniAvatar scores Sync-C 7.12, ahead of HunyuanAvatar 6.71, Hallo3 5.23 and MultiTalk 4.76. — [OmniAvatar paper](https://arxiv.org/html/2506.18866)
- Live Avatar also notes that OmniAvatar "despite achieving strong objective metrics, produces exaggerated motions that compromise identity preservation over time". — [Live Avatar paper](https://arxiv.org/html/2512.04677v6)

### Inferences
- Sync-C scales differ between papers: about 8–9 on HDTF in the Kandinsky and InfiniteTalk papers, about 4–5 in Wan-S2V's set, and about 1 in TalkBench. Compare models only within one table.
- FantasyTalking (Sync-C 3–3.8) and StableAvatar (2–3.7 independently) are weak on lip sync. Do not pick them for a lip-sync-critical teacher.
- On independent numbers, LongCat 1.5 is the best open lip-sync model as of Oct 2026. v1.6 (15 Nov 2026) claims "more natural lip movements", but it is too new for independent tests.

### Gaps
- No independent numbers were found for LongCat 1.6, EchoMimicV3-Flash, Hallo2, MEMO or Sonic in 2026 tables.
- Kandinsky's human-study percentages were not extracted.

## Q3. Upper body, hands, head motion, long-video stability

### Takeaway
For a "natural human" teacher showing head, shoulders and hands, choose a Gen 2 or Gen 3 DiT model (InfiniteTalk, Wan2.2-S2V, LongCat-Video-Avatar, Kandinsky S2V, OmniAvatar, HunyuanVideo-Avatar, EchoMimic v3). Gen 1 SD1.5 models are mostly head crops. For lessons of several minutes, only InfiniteTalk, StableAvatar, LongCat, Live Avatar, SoulX-FlashTalk and Hallo2 are built for long runs, and they differ in how much they drift.

### Cited Findings
- **InfiniteTalk** aligns "head movements, body posture, and facial expressions" with the audio, and it is "unlimited-length". Its README warns: "I2V generation: Generates good results from a single image for up to 1 minute. Beyond 1 minute, color shifts become more pronounced". The suggested trick is to turn the image into a video by translating or zooming it. The default `--max_frame_num` is 1000 frames (40 s). — [InfiniteTalk README](https://raw.githubusercontent.com/MeiGen-AI/InfiniteTalk/main/README.md)
- **MultiTalk** supports "video generation up to 15 seconds". It was trained on 81 frames at 25 fps, and up to 201 frames is possible. Its audio CFG affects colour tone across segments (set it to 3). — [MultiTalk README](https://raw.githubusercontent.com/MeiGen-AI/MultiTalk/main/README.md)
- **StableAvatar** claims "infinite-length … ID-preserving videos … without the use of any face-related post-processing". Independent tests give it low Sync-C (see Q2). — [StableAvatar README](https://raw.githubusercontent.com/Francis-Rings/StableAvatar/main/README.md)
- **Live Avatar** keeps Sync-C 7.10 → 6.98 and Dino-S 0.97 → 0.96 from 0–10 s through 10,000–10,010 s. — [Live Avatar paper](https://arxiv.org/html/2512.04677v6)
- **LongCat-Video-Avatar 1.6** claims "expressive facial, head, and body motion, while reducing error accumulation during long-form generation". v1.5 claims "robust long-video generation". — [LongCat-Video README](https://raw.githubusercontent.com/meituan-longcat/LongCat-Video/main/README.md)
- **Kandinsky S2V** animates "a single reference image with lip-sync, head pose, and gesture coherent with speech". It is long-form through "Autoregressive 5 s chunks (25 FPS) held together by a FramePack memory". — [Kandinsky S2V paper](https://arxiv.org/html/2610.19290v1)
- **Hallo2** shows 4K demos of 23, 18 and 4 minutes, and it is portrait (head) only. — [Hallo2 README](https://raw.githubusercontent.com/fudan-generative-vision/hallo2/main/README.md)
- **EchoMimic v2** is a "Semi-Body Human Animation" model that needs pose; the v2 demo aligns poses from a driving video. **EchoMimic v3** recommends "5 steps for talking head, 15~25 steps for talking body". For videos over 138 frames, use "Long Video CFG". — [EchoMimicV2 README](https://raw.githubusercontent.com/antgroup/echomimic_v2/main/README.md); [EchoMimicV3 README](https://raw.githubusercontent.com/antgroup/echomimic_v3/main/README.md)
- **FantasyTalking and OmniAvatar** take text prompts for behaviour, e.g. "with their hands continuously waving". — [FantasyTalking README](https://raw.githubusercontent.com/Fantasy-AMAP/fantasy-talking/main/README.md); [OmniAvatar README](https://raw.githubusercontent.com/Omni-Avatar/OmniAvatar/main/README.md)
- **Wan2.2-S2V** has the best HKC/HKV-adjacent FID among its compared set and the best user-rated naturalness (84.3) in the Live Avatar study. It targets "cinematic" scenes. — [Wan-S2V paper](https://arxiv.org/html/2508.18621); [Live Avatar paper](https://arxiv.org/html/2512.04677v6)
- **HunyuanVideo-Avatar** advertises emotion control and multi-character dialogue. — [HunyuanVideo-Avatar README](https://raw.githubusercontent.com/Tencent-Hunyuan/HunyuanVideo-Avatar/main/README.md)

### Inferences
- Pre-rendered lessons can be generated in 1-minute segments with InfiniteTalk or LongCat. Each segment can restart from the original photo, which avoids colour drift, at the cost of a small jump at each cut that can sit at sentence boundaries.

### Gaps
- No blink-rate or breathing metrics were found in any paper. Naturalness of the eyes and brows is only covered by user studies.

## Q4. Speed, VRAM, accelerated variants, free-GPU feasibility (Kaggle T4×2 / P100 16 GB)

### Takeaway
Every quality-first model is slow: roughly 0.16–0.6 fps on a datacentre GPU, so a 10-minute lesson takes hours. The 14B Wan models need about 36–80 GB, or offloading or quantisation to run in 8–21 GB at 1.5–3× slower. Distilled variants (LightX2V 4-step, LongCat 8-step, Kandinsky π-Flow 16-step, EchoMimicV3-Flash 8-step at 12 GB) bring it to practical levels. Real-time streaming needs 4–8 H100/H800 GPUs. On a free 16 GB T4/P100, the realistic options are 1.3B models (EchoMimicV3-Flash, StableAvatar, OmniAvatar-1.3B) or a heavily offloaded 14B through Wan2GP, and none of these was tested on T4 here.

### Cited Findings
- **MEMO:** "around 1 second per frame on H100 and 2 seconds per frame on RTX 4090" at 30 fps and 20 steps. That is about 30 s and about 60 s per second of video. — [MEMO README](https://raw.githubusercontent.com/memoavatar/memo/main/README.md)
- **EchoMimic v1:** the accelerated version goes "from ~7mins/240frames to ~50s/240frames on V100". **v2:** "~7mins/120frames to ~50s/120frames". Both were tested on A100 80G, 4090D 24G and V100 16G. — [EchoMimic README](https://raw.githubusercontent.com/antgroup/echomimic/main/README.md); [EchoMimicV2 README](https://raw.githubusercontent.com/antgroup/echomimic_v2/main/README.md)
- **EchoMimic v3:** "12G VRAM is All YOU NEED"; it runs on 16G through ComfyUI. **V3-Flash (22 Jan 2026):** "8-step High-quality Generation", "12G VRAM Requirement". — [EchoMimicV3 README](https://raw.githubusercontent.com/antgroup/echomimic_v3/main/README.md)
- **FantasyTalking on A100 (512×512, 81 frames):** 15.5 s/it at 40 GB, 32.8 s/it at 20 GB and 42.6 s/it at 5 GB. — [FantasyTalking README](https://raw.githubusercontent.com/Fantasy-AMAP/fantasy-talking/main/README.md)
- **OmniAvatar-14B on A800:** 16.0 s/it at 36 GB, 19.4 s/it at 21 GB, 22.1 s/it at 8 GB, and 4.8 s/it on 4 GPUs at 14.3 GB each. TeaCache is supported. — [OmniAvatar README](https://raw.githubusercontent.com/Omni-Avatar/OmniAvatar/main/README.md)
- **MultiTalk / InfiniteTalk:** INT8 quantisation, SageAttention2.2, TeaCache, LightX2V/FusionX LoRA, and "480P video generation on a single RTX 4090". Wan2GP enables MultiTalk "on very low VRAM hardware (8 GB of VRAM)". Sampling steps can drop "to even 10 that will not hurt the lip synchronization accuracy, but affects the motion and visual quality". — [MultiTalk README](https://raw.githubusercontent.com/MeiGen-AI/MultiTalk/main/README.md); [InfiniteTalk README](https://raw.githubusercontent.com/MeiGen-AI/InfiniteTalk/main/README.md)
- **Wan2.2-S2V-14B:** the official command "can run on a GPU with at least 80GB VRAM", with offload options for less. — [Wan2.2 README](https://raw.githubusercontent.com/Wan-Video/Wan2.2/main/README.md)
- **HunyuanVideo-Avatar:** the "minimum GPU memory required is 24GB for 704px768px129f but very slow"; 96 GB is recommended. Wan2GP runs it on "10GB VRAM … without quality degradation" (claim). — [HunyuanVideo-Avatar README](https://raw.githubusercontent.com/Tencent-Hunyuan/HunyuanVideo-Avatar/main/README.md)
- **StableAvatar (1.3B):** `model_cpu_offload` cuts memory "by roughly half". ComfyUI runs it "in just 10 steps, making it 3x faster". — [StableAvatar README](https://raw.githubusercontent.com/Francis-Rings/StableAvatar/main/README.md)
- **V-Express:** a 31 s clip needs "a peak memory of 7956MiB" on V100 and takes 2617 s in total, about 84 s per second of video. — [V-Express README](https://raw.githubusercontent.com/tencent-ailab/V-Express/main/README.md)
- **Measured fps, from the Live Avatar paper's benchmark:**

  | Model | FPS |
  |---|---|
  | EchoMimic-V2 | 0.53 |
  | StableAvatar | 0.64 |
  | Hallo3 | 0.26 |
  | Wan-S2V | 0.25 |
  | OmniAvatar | 0.16 |
  | Ditto (0.2B) | 21.8 |
  | Live Avatar | 45.2 on 5×H100, 4 steps, TTFF 1.21 s |

  Live Avatar without distillation runs at 0.29 fps (80 NFE). — [Live Avatar paper](https://arxiv.org/html/2512.04677v6)
- **Live Avatar v1.1 (20 Jan 2026):** "FP8 quantization enables inference on 48GB GPUs". Single-GPU offline inference needs "a single 80GB VRAM GPU". — [LiveAvatar README](https://raw.githubusercontent.com/Alibaba-Quark/LiveAvatar/main/README.md)
- **SoulX-FlashTalk:** 32 fps real-time; a single GPU "Requires more than 64G of VRAM. Use --cpu_offload to reduce VRAM usage to 40G". Real time needs "8xH800 or higher". **SoulX-FlashHead** claims "real-time performance on consumer GPUs (e.g., RTX 4090/5090)". InfiniteTalk's LoRA version measured 5.10 fps in their table. — [SoulX-FlashTalk README](https://raw.githubusercontent.com/Soul-AILab/SoulX-FlashTalk/main/README.md); [SoulX-FlashTalk paper](https://arxiv.org/html/2512.23379)
- **Kandinsky S2V on H100, per 5-second chunk:**

  | Variant | Resolution | 1 GPU | 2 GPUs | 4 GPUs | 8 GPUs |
  |---|---|---|---|---|---|
  | Lite, distilled | 512×768 | 43 s | 27 s | 19 s | — |
  | Lite | 512×768 | 220 s | — | — | — |
  | Pro, distilled | 512×768 | 173 s | — | — | — |
  | Pro | 512×768 | 914 s | — | — | — |
  | Pro, distilled | 1280×768 | 675 s | — | — | 145 s |

  The distilled Pro is "5.4× end-to-end speedup". Lite distilled works out to about 8.6 s of compute per second of video on one H100. — [Kandinsky S2V paper](https://arxiv.org/html/2610.19290v1)
- **LongCat-Video-Avatar 1.5:** "accelerates inference to 8 steps via step distillation". Community INT8 builds exist on HF (e.g. `TeamAIQ/LongCat-Video-Avatar-1.6-INT8-ConvRot`). — [LongCat-Video README](https://raw.githubusercontent.com/meituan-longcat/LongCat-Video/main/README.md); [HF search](https://huggingface.co/api/models?search=LongCat-Video-Avatar&limit=5)

### Inferences
- **On a T4 (16 GB, Turing, no bf16 tensor cores, no FlashAttention-2):** 14B Wan models would need fp16 or INT8 plus heavy CPU offload. Expect speeds well below the A100 figures, likely many minutes per second of video. This is an estimate, not measured.
- **On a P100 (Pascal):** it lacks tensor cores entirely, so it is worse still.
- **Best free-GPU candidates to try first:** EchoMimicV3-Flash (1.3B, 8 steps, 12 GB, Apache), OmniAvatar-1.3B (8 GB offload mode), StableAvatar (1.3B, MIT; weak lip sync) and Kandinsky S2V Lite distilled (2.3B, MIT; VRAM not stated).
- Kaggle's ~30 GPU-hours a week limits output to roughly minutes, not hours, of finished video per week at quality settings. This is an estimate.

### Gaps
- No measured runs on T4 or P100 for any model were found.
- Kaggle's quota and current GPU types were not verified in this session.
- The VRAM needs of Kandinsky S2V Lite and LongCat 1.6 were not found.

## Q5. Multilingual lip sync incl. Hindi / Hinglish

### Takeaway
No model publishes Hindi results or Indian-language demos. Several older models state they are English-trained. Newer Wan-based models use wav2vec2 or Whisper audio features, which makes them language-agnostic in principle but untested on Hindi. NexoraGuru must run its own Hindi/Hinglish test, measuring Sync-C on its own clips plus a human check on retroflex consonants and nasal vowels.

### Cited Findings
- **Hallo, Hallo2 and Hallo3:** the audio "must be in English since our training datasets are only in this language". — [Hallo README](https://raw.githubusercontent.com/fudan-generative-vision/hallo/main/README.md); [Hallo3 README](https://raw.githubusercontent.com/fudan-generative-vision/hallo3/main/README.md)
- **EchoMimic v1 and v2** were "trained on English and Mandarin Chinese". — [EchoMimic README](https://raw.githubusercontent.com/antgroup/echomimic/main/README.md); [EchoMimicV2 README](https://raw.githubusercontent.com/antgroup/echomimic_v2/main/README.md)
- **InfiniteTalk, MultiTalk, EchoMimicV3-Flash and SoulX-FlashTalk** use `chinese-wav2vec2-base` as the audio encoder. OmniAvatar, FantasyTalking, AniPortrait, MEMO and V-Express use `wav2vec2-base-960h`, an English ASR model. — READMEs above
- **HunyuanVideo-Avatar and LongCat 1.5/1.6** use Whisper. LongCat's v1.5 note says Whisper-Large gives "more accurate lip synchronization". Kandinsky S2V uses the Qwen2.5-Omni audio tower and was trained "over a multilingual video corpus with substantial Russian-language content"; its prompts work in English and Russian. — [Kandinsky S2V paper](https://arxiv.org/html/2610.19290v1); [LongCat-Video README](https://raw.githubusercontent.com/meituan-longcat/LongCat-Video/main/README.md)
- The web search found "no independent test of Hindi lip sync" for InfiniteTalk, Hallo or EchoMimic. The only multilingual claims for InfiniteTalk are vendor marketing, e.g. hosted-API listings that claim Chinese, English and Japanese. — [mindstudio listing](https://www.mindstudio.ai/models/wavespeed-ai-infinitetalk); [atlascloud listing](https://www.atlascloud.ai/hi/infinitetalk)

### Inferences
- Whisper-family encoders (LongCat, HunyuanVideo-Avatar) and Qwen2.5-Omni (Kandinsky) were trained on large multilingual audio that includes Hindi. They are the likeliest to handle Hindi and Hinglish phonemes. This is a hypothesis to test.
- Encoders built on English-only wav2vec2-960h (OmniAvatar, FantasyTalking, MEMO) are the least likely to.

### Gaps
- No Hindi or Indian-language demo or metric was found for any model.
- No study was found on code-switching (Hinglish) in talking-head lip sync.
