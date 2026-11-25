# Natural motion for a photo-based talking teacher, and free Indian-English / Hindi / Hinglish voices with cloning and timings

Checked 2026-11-25. "Verified" means the licence text or model card was read directly in this session: GitHub `LICENSE` files through raw.githubusercontent.com, and Hugging Face licence tags through the HF API. Items marked **[unverified]** come from memory or from search snippets only, and must be checked before use. pmc.ncbi.nlm.nih.gov could not be reached from this session (blocked by the network policy), so the full texts of the blink papers were not read.

## Q1. Natural talking and listening behaviour: numbers to drive the idle/speaking motion layer

### Takeaway
Blinks are more frequent while speaking (about 26/min in conversation, against about 17/min at rest). Listeners blink less, and they time their blinks to the ends of the speaker's phrases ("feedback slots"). Speakers look away when planning hard answers. Brow raises and head motion follow pitch (F0) peaks, but loosely: about 71% of brow raises line up with F0 rises. Backchannels (nods, "hmm") come at pauses that follow a low or falling pitch region, about 4 per minute in casual English. These are good targets for a rule layer on top of any audio-driven model.

### Cited Findings
- Blink rate goes up during conversation to about 26 blinks/min. Rest is about 17/min, and reading or demanding visual tasks drop it to about 4–5/min. The motor act of speaking raises the rate, and more complex motor output (verbalising) raises it further. — [Brych et al. 2021, PLoS ONE "How the motor aspect of speaking influences the blink rate"](https://doaj.org/article/360238ef0e524934a56d072810e322ee); [preprint](https://www.biorxiv.org/content/10.1101/2020.07.31.230391.full.pdf). The figures come from the search summary; the full text could not be fetched.
- Listening to speech lowers the blink rate, more so in noise. Individual baselines range from 10 to 70/min. — [ScienceAlert summary of the Concordia study](https://www.sciencealert.com/want-to-know-if-somebody-is-truly-listening-count-their-blinks). This is a secondary source. The Brych preprint reports a listening condition that *raised* blinks, so the direction during listening is not settled.
- Most listener blinks fall in "feedback slots", around the ends of the speaker's units. — [Hömke, Holler & Levinson, PMC6291193](https://pmc.ncbi.nlm.nih.gov/articles/PMC6291193/) (snippet only).
- The cognitive-load account of gaze aversion: speakers look away to plan speech (Kendon 1967). Children look away more on harder questions. Gaze aversion is more common in dispreferred ("no") answers. — [Kendrick & Holler 2017](https://eprints.whiterose.ac.uk/112376/1/Kendrick_Holler_2017_.pdf); [Rossano, Gaze in conversation](https://www.eva.mpg.de/documents/Wiley-Blackwell/Rossano_Gaze_Handbook-of-conversation-analysis_2012_1658279.pdf)
- Cavé et al. 1996 (10 speakers): rapid brow movements matched F0 rises in about 71% of cases, and about 38% of brow movements happened while the person was not speaking. — [ICSLP 1996](https://www.isca-archive.org/icslp_1996/cave96_icslp.html)
- Brow raises tend to come just *before* pitch accents. Most pitch accents have no brow raise at all. — [Carignan et al. ISSP 2020](https://discovery.ucl.ac.uk/10152455/1/Carignan_etal_ISSP_2020.pdf), and the dissertations surfaced by the same search (snippets only).
- Head motion explains a meaningful share of F0 variance; the link to F0 is stronger than the link to loudness. Natural head motion makes speech easier to understand in noise. — [Munhall et al. 2004, Psychological Science](https://www.queensu.ca/psychology/sites/psycwww/files/uploaded_files/Faculty/Kevin%20Munhall/Munhall_Psyc_Sci.pdf)
- Backchannel cue: a region of low pitch late in an utterance, followed by a pause. The model is a set of rules on pause length and pitch slope. Backchannels are about 20% of utterances, about 4 per minute in casual English, and come faster in Japanese. — [Ward & Tsukahara 2000](https://www.cs.utep.edu/nigel/abstracts/jprag00.html); [Ward, call.pdf](https://www.cs.utep.edu/nigel/papers/call.pdf); [Truong et al. Interspeech 2010 re-implementation](https://www.isca-archive.org/interspeech_2010/truong10_interspeech.pdf)
- Gaze, head movement and posture shifts also cue listener responses. — [Paierl et al., MDPI Languages 10(8):194](https://www.mdpi.com/2226-471X/10/8/194)

### Inferences
- Rule layer for the teacher:
  - **Speaking:** blink about every 2–3 s, randomised (a Poisson process). Put blinks near phrase ends and word boundaries, using the TTS/aligner timings.
  - **Listening or idle:** blink less, about every 4–6 s, and place blinks at the student's pauses.
  - **Thinking:** before a long answer, avert gaze up or sideways for about 0.5–1.5 s.
  - **Brows:** raise just before stressed words (pitch-accent peaks from F0), but only on a fraction of them. Raising on every accent would look robotic, since most accents have none.
  - **Nods:** small nods at phrase-final low pitch plus a pause, about 4/min, when listening.
  - **Head pitch/yaw:** tie to F0 contour plus low-frequency noise.
- Some values are not sourced here and are **[unverified]**: blink duration (commonly about 100–400 ms, full closure about 100–150 ms), breathing about 12–20 breaths/min at rest, microsaccades and fixational drift. Check them against primary physiology papers.

### Gaps
- I could not read the full blink papers, so there are no exact speaking-vs-listening blinks/min from a single study (pmc host blocked).
- I found no sourced millisecond figure for nod latency after a pause, no gaze-aversion percentage from Argyle & Cook, and no Indian-speaker-specific data (for example the Indian head-waggle as a backchannel).

## Q2. Audio-to-head-pose / expression and listening-head models: licences for commercial use

### Takeaway
The cleanest commercial stack:
- **Ditto** (Apache-2.0), **JoyVASA** (MIT), **SadTalker** (Apache-2.0 with third-party exceptions), **FaceFormer** and **CodeTalker** (MIT, but trained on VOCASET/BIWI, see Q3).
- **LAM_Audio2Expression** (Apache-2.0) for ARKit blendshapes.
- **NVIDIA Audio2Face-3D**: SDK MIT, models under the NVIDIA Open Model License.

The trap is **InsightFace**. Ditto ships `insightface_det.onnx`, and the LivePortrait-based pipelines (Ditto, JoyVASA) use InsightFace models, which are non-commercial. Swap in MediaPipe or another commercial-OK face detector. SelfTalk is CC BY-NC 4.0, so it is out.

### Cited Findings
- **Ditto** (antgroup/ditto-talkinghead): LICENSE is "Apache License Version 2.0". It is built on S2G-MDDiffusion and LivePortrait. The checkpoints include `insightface_det.onnx` and a HuBERT streaming ONNX, with an "online" (streaming) config. It was tested on an A100 with TensorRT 8.6.1; the TRT engines are built for Ampere+, and other GPUs must convert from ONNX. — [README](https://github.com/antgroup/ditto-talkinghead), [LICENSE](https://raw.githubusercontent.com/antgroup/ditto-talkinghead/main/LICENSE). The HF model repo `digital-avatar/ditto-talkinghead` has no licence tag (verified via the HF API).
- **LivePortrait**: code is "MIT License, Copyright (c) 2024 Kuaishou". The README lists a ComfyUI node "with MediaPipe as an alternative to Insightface". — [LICENSE](https://raw.githubusercontent.com/KwaiVGI/LivePortrait/main/LICENSE)
- **InsightFace**: "The code of InsightFace is released under the MIT License… The training data containing the annotation (and the models trained with these data) are available for non-commercial research purposes only. Both manual-downloading models… and auto-downloading models… follow the above license policy (which is for non-commercial research purposes only)." — [insightface README](https://github.com/deepinsight/insightface)
- **JoyVASA** (jdh-algo/JoyVASA): "MIT License Copyright (c) 2024 xuyangcao", and the HF repo is tagged `license:mit`. Its renderer is LivePortrait, so the same InsightFace caveat applies (**[unverified]** which detector it loads). — [LICENSE](https://raw.githubusercontent.com/jdh-algo/JoyVASA/main/LICENSE)
- **SadTalker**: "SadTalker is licensed under the Apache 2.0 License, except for the third-party components listed below." Check that list before shipping; it includes face-detection and enhancer components. — [LICENSE](https://raw.githubusercontent.com/OpenTalker/SadTalker/main/LICENSE)
- **FaceFormer**: "MIT License Copyright (c) 2022 Evelyn". **CodeTalker**: "MIT License Copyright (c) 2023 DoubleXING". — [FaceFormer](https://raw.githubusercontent.com/EvelynFan/FaceFormer/main/LICENSE), [CodeTalker](https://raw.githubusercontent.com/Doubiiu/CodeTalker/main/LICENSE)
- **SelfTalk**: "This work is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)". Not usable. — [LICENSE](https://raw.githubusercontent.com/psyai-net/SelfTalk_release/main/LICENSE)
- **LAM_Audio2Expression** (aigc3d): Apache-2.0 on GitHub, and the HF repo `3DAIGC/LAM_audio2exp` is tagged `license:apache-2.0`. — [LICENSE](https://raw.githubusercontent.com/aigc3d/LAM_Audio2Expression/main/LICENSE)
- **NVIDIA Audio2Face-3D**: the SDK LICENSE.txt is "MIT License Copyright (c) 2025, NVIDIA CORPORATION". The model `nvidia/Audio2Face-3D-v3.0` is tagged `license:other` / `nvidia-open-model-license`. — [SDK LICENSE](https://raw.githubusercontent.com/NVIDIA/Audio2Face-3D-SDK/main/LICENSE.txt), [HF](https://huggingface.co/nvidia/Audio2Face-3D-v3.0). **[unverified]** The NVIDIA Open Model License is generally understood to permit commercial use; read its text before relying on it. The SDK targets NVIDIA GPUs.
- **KDTalker, EMOTE (radekd91), Learning to Listen (evonneng)**: no LICENSE file found at the repo root on main or master. With no licence, the default is all rights reserved, so these are not usable without permission. — Checked in this session: [learning2listen](https://github.com/evonneng/learning2listen), [chenxwh/KDTalker](https://github.com/chenxwh/KDTalker). EMOTE is part of radekd91/inferno, whose README could not be fetched; **[unverified]**. EMOTE is FLAME-based, and the FLAME model licence is research-only (**[unverified]**).
- **DIM, INFP, ListenFormer**: not checked (out of tool budget). **[unverified]**

### Inferences
- Best candidate for streaming: **Ditto** (Apache-2.0, streaming HuBERT plus online config) with LivePortrait (MIT) rendering, provided the InsightFace detector is replaced by MediaPipe (Apache-2.0) and every bundled weight file is audited.
- For a 3D or blendshape route: LAM_Audio2Expression or Audio2Face-3D produce ARKit-style blendshapes, and the exact visemes/expressions drive a 2D warp.
- Code licences do not cover the weights. The weights are trained on datasets (Q3) whose terms may still matter; this is a legal grey zone to flag to the owner.

### Gaps
- Not done: Ditto's weight-level licence (the HF repo has no tag), SadTalker's third-party list in full, the JoyVASA training data, and the licences of DIM, INFP, ListenFormer and KDTalker.

## Q3. Driving-video and motion datasets: commercial terms

### Takeaway
- **CelebV-HQ** and **CelebV-Text**: explicitly non-commercial, including "derived data".
- **HDTF**: annotations and processing under CC BY 4.0, but the clips are YouTube videos owned by third parties.
- **MMS**: CC-BY-NC.
- **Safest route:** record our own driving and listening videos, with written consent and a commercial-use release.

### Cited Findings
- **CelebV-HQ**: "available for non-commercial research purposes only… You agree not to reproduce, duplicate, copy, sell, trade, resell or exploit for any commercial purposes, any portion of the videos and any portion of derived data." **CelebV-Text** has the same wording. — [CelebV-HQ](https://github.com/CelebV-HQ/CelebV-HQ), [CelebV-Text](https://github.com/CelebV-Text/CelebV-Text)
- **HDTF**: "available to download under a Creative Commons Attribution 4.0 International License". — [HDTF](https://github.com/MRzzm/HDTF). **[inference]** The dataset is a list of YouTube links plus crops, so CC BY covers the authors' contribution but not the rights in the videos.
- **TalkSHOW**: "For commercial licensing, please contact ps-licensing@tue.mpg.de" (MPI). **PantoMatrix** (EMAGE, BEAT2): the README offers "commercial collaboration" by email, and no LICENSE file was found at the root. — [TalkSHOW](https://github.com/yhw-yhw/TalkSHOW), [PantoMatrix](https://github.com/PantoMatrix/PantoMatrix)
- **DiffSHEG** (gesture plus expression): "BSD 3-Clause License Copyright (c) 2024, JeremyCJM". **[inference]** It is trained on BEAT/SHOW data and SMPL-X bodies, which carry their own licences (SMPL-X is non-commercial, **[unverified]**). — [LICENSE](https://raw.githubusercontent.com/JeremyCJM/DiffSHEG/main/LICENSE)
- VoxCeleb1/2, MEAD, TalkingHead-1KH, RAVDESS, CMU Panoptic and BEAT/BEAT2 licences were not verified this session (the MEAD repo README was missing). From memory, **[unverified]**:
  - VoxCeleb metadata is CC BY 4.0, with the videos owned by their YouTube uploaders.
  - RAVDESS is CC BY-NC-SA 4.0.
  - BEAT is CC BY-NC 4.0 (**[unverified]**).
  - CMU Panoptic is research-oriented.

### Inferences
- For gestures from speech, no fully commercial-clean pretrained model was confirmed. The options:
  - A procedural gesture layer (beat gestures on pitch accents).
  - DiffSHEG code (BSD-3) retrained on our own data.
- Recording our own data:
  - 30–60 min of the consenting teacher (and a few staff) talking and listening, in Hindi, English and Hinglish, at 1080p/25–30 fps, front-facing.
  - A signed release covering: likeness and voice; training of models; commercial use; derivatives; withdrawal terms.
  - Note India's DPDP Act 2023 for biometric and personal data (**[unverified]** specific obligations).
  - This removes the dataset-licence risk for fine-tuning.

### Gaps
- The exact licence pages for VoxCeleb, MEAD, RAVDESS, BEAT2, TalkingHead-1KH and CMU Panoptic still need to be checked.

## Q4. Free TTS for Indian English, Hindi and Hinglish: licences of code and weights, and cloning

### Takeaway
Commercial-OK and Indic-capable:
- **IndicF5**: HF tag MIT, 11 Indian languages, zero-shot cloning from a reference clip. Caveat: the F5-TTS base *weights* are CC-BY-NC-4.0, so the provenance of IndicF5's weights needs checking.
- **Indic Parler-TTS**: Apache-2.0, described voices, no audio cloning.
- **Chatterbox Multilingual V3 and a dedicated Hindi pack**: MIT, about 10 s cloning, PerTh watermark. Resemble now calls the repo an unsupported archive.
- **Veena**: Apache-2.0, Hindi, English and code-mixed, 4 fixed voices.
- **svara-TTS**: Apache-2.0, Hindi plus Indian English plus 17 more languages, GGUF/CPU-friendly.
- **Kokoro-82M**: Apache-2.0, 4 Hindi voices graded "C", no cloning.
- **OpenVoice v2**: MIT, tone-colour converter for cloning on top of another TTS.
- **CosyVoice 2/3**: Apache-2.0; Hindi support **[unverified]**.

Not usable free for us:
- **XTTS-v2**: Coqui Public Model License, non-commercial.
- **F5-TTS base weights**: CC-BY-NC.
- **VibeVoice**: MIT, but research-only use, English/Chinese only.
- **Fish Audio**: commercial use only under USD 500k revenue and no "Hosted Service". Speaking a teacher's own lines is allowed, but letting users clone voices is not.
- **IndexTTS2**: bilibili licence; commercial use is allowed below 100M MAU / RMB 1bn revenue, but it cannot be used to improve other models. Chinese/English focus.

### Cited Findings
- **Kokoro-82M**:
  - Licence: HF tag `apache-2.0`, code Apache-2.0.
  - Voices: Hindi has 2F and 2M voices (`hf_alpha`, `hf_beta`, `hm_omega`, `hm_psi`), Target Quality B and Overall Grade C, `lang_code='h'`, espeak-ng `hi` G2P.
  - "Support for non-English languages may be absent or thin due to weak G2P and/or lack of training data."
  - It is weak on utterances under 10–20 tokens and rushes on more than 400 tokens.
  - No cloning.
  - — [VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md), [kokoro LICENSE](https://raw.githubusercontent.com/hexgrad/kokoro/main/LICENSE)
- **Indic Parler-TTS** (ai4bharat): HF tag `license:apache-2.0`, gated "auto". Its control is a text description of the voice, not audio cloning (**[unverified]** exact language count, about 20+). — [HF](https://huggingface.co/ai4bharat/indic-parler-tts)
- **IndicF5** (ai4bharat): HF tag `license:mit`, gated "auto". It clones from a reference audio plus its transcript (**[unverified]**; the card is gated and was not read). It is trained on Indic data and covers 11 languages (**[unverified]**). — [HF](https://huggingface.co/ai4bharat/IndicF5)
- **F5-TTS**: code is "MIT License Copyright (c) 2024 Yushen CHEN", but the HF weights `SWivid/F5-TTS` are tagged `license:cc-by-nc-4.0`. — [LICENSE](https://raw.githubusercontent.com/SWivid/F5-TTS/main/LICENSE), [HF](https://huggingface.co/SWivid/F5-TTS)
- **Chatterbox** (resemble-ai):
  - Licence: "MIT License Copyright (c) 2025 Resemble AI". The README says: "Resemble AI does not sell text-to-speech, voice cloning, or any other voice AI product, and this repository is not a Resemble AI product. The code stays public as an archive under the MIT license, with no support, updates, or paid tier." (Note: the same README still links a paid Resemble service, so the wording is inconsistent.)
  - Multilingual V3 (500M) covers 23 languages including Hindi (hi). The Single Language Pack includes `ResembleAI/Chatterbox-Multilingual-hi`, HF tag `license:mit`.
  - Cloning takes `audio_prompt_path="your_10s_ref_clip.wav"`. Tip from the README: the reference clip should match the language tag, otherwise set `cfg_weight` to 0. It has "Built-in PerTh Watermarking".
  - Chatterbox-Nano (110M) is English-only and runs "3x faster than realtime on 8 CPU cores". Turbo (350M) is the English low-latency model.
  - — [README](https://github.com/resemble-ai/chatterbox), [LICENSE](https://raw.githubusercontent.com/resemble-ai/chatterbox/master/LICENSE)
- **XTTS-v2** (coqui): HF tag `license:other`, `coqui-public-model-license`. **[unverified]** CPML is non-commercial, and Coqui shut down, so no commercial licence can be bought. — [HF](https://huggingface.co/coqui/XTTS-v2)
- **OpenVoice v2**: the repo LICENSE is MIT-style ("Copyright 2024 MyShell.ai, Permission is hereby granted, free of charge…"), and the HF weights `myshell-ai/OpenVoiceV2` are tagged `license:mit`. **[unverified]** Its base TTS languages do not include Hindi; the tone-colour converter can be applied to any TTS output, for example Veena or svara speech converted into the teacher's timbre. — [LICENSE](https://raw.githubusercontent.com/myshell-ai/OpenVoice/main/LICENSE)
- **Fish Speech / OpenAudio**: "FISH AUDIO COMMUNITY LICENSE AGREEMENT Version 1.0 — Last Updated: October 13, 2026". Section III(a): commercial use is allowed "only while Your Annual Revenue is less than USD 500,000". Section III(c): no licence "to offer a Hosted Service… whose primary purpose is text-to-speech, voiceover, voice generation, or voice cloning". Not a Hosted Service: "(1) generating speech for content that You create, select, or control, or that Your own product generates (for example, narration… or an assistant's spoken replies)". — [LICENSE](https://raw.githubusercontent.com/fishaudio/fish-speech/main/LICENSE). Hindi quality **[unverified]**. The HF repo `fishaudio/openaudio-s1-mini` is gated (the API returned no JSON).
- **CosyVoice 2 / Fun-CosyVoice3-0.5B-2512**: the GitHub repo is Apache-2.0, and the HF repos `FunAudioLLM/CosyVoice2-0.5B` and `FunAudioLLM/Fun-CosyVoice3-0.5B-2512` are tagged `license:apache-2.0`. Hindi is not believed to be supported (**[unverified]**). — [LICENSE](https://raw.githubusercontent.com/FunAudioLLM/CosyVoice/main/LICENSE)
- **IndexTTS2** (bilibili Model Use License):
  - 2.2: if "more than 100 million monthly active users… or… annual revenue… exceeded RMB 1 billion, You must request a separated license".
  - "You may not Use the bilibili indextts2 or any Derivative Work to improve any AI model, except for the bilibili indextts2 itself, its Derivative Works，or non-commercial AI models."
  - The HF repo `IndexTeam/IndexTTS-2` has no licence tag. Language: Chinese/English (**[unverified]**).
  - — [LICENSE](https://raw.githubusercontent.com/index-tts/index-tts/main/LICENSE)
- **Veena** (maya-research/Veena):
  - Licence: "License: Apache 2.0".
  - Model: 3B Llama-based, Hindi and English "including code-mixed scenarios", 24 kHz SNAC codec, 4 voices (`kavya`, `agastya`, `maitri`, `vinaya`), "Sub-80ms latency on H100-80GB GPUs".
  - No zero-shot cloning described; a voice would need fine-tuning.
  - — [HF card](https://huggingface.co/maya-research/Veena)
- **svara-TTS v1** (kenpath):
  - Licence: "Apache-2.0".
  - Languages: 19 (18 Indic plus Indian English).
  - Model: Orpheus-style tokens, emotion tags, "Works well with GGUF exports; suitable for edge/CPU scenarios", "LoRA-friendly", "zero-shot adaptation paths".
  - Training data: 2000+ hours from SYSPIN, RASA, IndicTTS and SPICOR, about 50 speakers. **[inference]** Check those datasets' terms; IndicTTS (IIT Madras) has its own licence.
  - — [HF card](https://huggingface.co/kenpath/svara-tts-v1)
- **Orpheus**: the repo is Apache-2.0, and the Hindi checkpoint `canopylabs/3b-hi-ft-research_release` is tagged `license:apache-2.0` (its name says "research_release"; the card was not readable). It needs Llama-3.2 base terms checked (**[unverified]**). — [LICENSE](https://raw.githubusercontent.com/canopyai/Orpheus-TTS/main/LICENSE)
- **VibeVoice-1.5B**: weights `license:mit`, but the card says:
  - "limited to research purpose use"
  - "We do not recommend using VibeVoice in commercial or real-world applications"
  - "trained only on English and Chinese data"
  - It adds an audible AI disclaimer and a watermark.
  - — [HF card](https://huggingface.co/microsoft/VibeVoice-1.5B)
- **Kyutai TTS**: `kyutai/tts-1.6b-en_fr` is `license:cc-by-4.0`, English/French only, and `kyutai/pocket-tts` is `cc-by-4.0`. No Hindi. — [HF](https://huggingface.co/kyutai/tts-1.6b-en_fr)
- **Sarvam Bulbul**:
  - It is an API, not open weights (the HF repos for bulbul are not public).
  - Pricing: Bulbul v3 is ₹30 per 10,000 characters and v2 is ₹15. The pricing page says "every plan starts with ₹1,000 in free credits".
  - Pages disagree on Bulbul v4 Flash: ₹20/10K on one page.
  - **[unverified]**: whether the free credits are one-time, and the cloning terms.
  - — [sarvam.ai/api-pricing](https://sarvam.ai/api-pricing), [docs pricing](https://docs.sarvam.ai/api/getting-started/pricing), [TTS page](https://sarvam.ai/apis/text-to-speech)

### Inferences
- For the teacher's own cloned voice in Hindi, English and Hinglish, the ranked options are:
  1. **Chatterbox-Multilingual-hi / V3** (MIT, 10 s clip, watermark). Mixed-script Hinglish quality is untested.
  2. **IndicF5**, if its weights are confirmed MIT-clean despite the F5 base. Check whether AI4Bharat trained from scratch (**[unverified]**).
  3. Fine-tune **svara-TTS** or **Veena** (Apache-2.0) with LoRA on 30–60 min of consented recordings. This gives the most natural Hinglish, but needs a GPU once.
  4. Any good Indic TTS followed by the **OpenVoice v2** converter (MIT).
- Fish is legally possible at our size for the teacher's own narration, but it is revocable and capped at USD 500k revenue. It is not "free forever" and should be said so plainly.

### Gaps
- Not read: the IndicF5 and Indic Parler model cards (gated), the Chatterbox watermark details, Hindi support in CosyVoice3, the IndexTTS2 languages, and the Sarvam open-weight models (Sarvam-M and others).
- No measured Hinglish naturalness scores across these models were found.

## Q5. Phoneme/word timestamps and forced alignment (licences), Hindi viseme mapping, speed

### Takeaway
None of the TTS models above was confirmed to output phoneme timings natively.
- Kokoro's pipeline yields token timestamps for English (**[unverified]**).
- Use **ctc-forced-aligner** (BSD-2) or **WhisperX** (BSD-2) with an **Apache-2.0 or MIT acoustic model**:
  - `ai4bharat/indicwav2vec-hindi` (Apache-2.0)
  - `ai4bharat/indic-conformer-600m-multilingual` (MIT)
  - Whisper large-v3 (Apache-2.0)
  - wav2vec2 English (Apache-2.0)
- Do **not** use the MMS weights, including the default `mms-300m-1130-forced-aligner` used by ctc-forced-aligner, which are CC-BY-NC-4.0.
- **MFA** is MIT. For Hindi visemes, the ACL W13-3904 table maps Hindi phonemes onto the standard 22-viseme set.

### Cited Findings
- **Montreal Forced Aligner**: "Copyright (c) 2016 Montreal Corpus Tools Permission is hereby granted, free of charge…" (MIT). — [LICENSE](https://raw.githubusercontent.com/MontrealCorpusTools/Montreal-Forced-Aligner/main/LICENSE). **[unverified]** The licences of the pretrained Hindi MFA acoustic models and dictionaries are separate.
- **WhisperX**: "BSD 2-Clause License Copyright (c) 2024, Max Bain". **ctc-forced-aligner**: "BSD 2-Clause License Copyright (c) 2026, Mahmoud Ashraf". — [WhisperX](https://raw.githubusercontent.com/m-bain/whisperX/main/LICENSE), [ctc-forced-aligner](https://raw.githubusercontent.com/MahmoudAshraf97/ctc-forced-aligner/main/LICENSE)
- **MMS**: "The MMS code and model weights are released under the CC-BY-NC 4.0 license." The HF repos `facebook/mms-300m` and `MahmoudAshraf/mms-300m-1130-forced-aligner` are both tagged `cc-by-nc-4.0`. — [fairseq MMS README](https://github.com/facebookresearch/fairseq/tree/main/examples/mms), [HF](https://huggingface.co/MahmoudAshraf/mms-300m-1130-forced-aligner)
- **Commercial-OK acoustic models** (HF tags): `ai4bharat/indicwav2vec-hindi` apache-2.0; `ai4bharat/indic-conformer-600m-multilingual` mit; `openai/whisper-large-v3` apache-2.0; `Systran/faster-whisper-large-v3` mit; `ARTPARK-IISc/whisper-medium-vaani-hindi` apache-2.0; `jonatasgrosman/wav2vec2-large-xlsr-53-english` apache-2.0; `facebook/wav2vec2-base-960h` apache-2.0. — HF API (for example [indicwav2vec-hindi](https://huggingface.co/ai4bharat/indicwav2vec-hindi))
- **Hindi visemes**:
  - W13-3904 builds a Hindi phoneme-to-viseme table on the standard 22-viseme set (100 native speakers, about 70% viseme-class correctness, more than 10% better than phoneme recognition). — [ACL W13-3904](https://preview.aclanthology.org/moar-dois/W13-3904.pdf)
  - Jeffers' map has been applied to Hindi after multilingual G2P; "most Hindi phonemes also appear in the English set". — [arXiv 1901.10139](https://arxiv.org/pdf/1901.10139)
  - CVIT (IIIT-H) cross-language Hindi lip-sync. — [paper](https://cvit.iiit.ac.in/images/ConferencePapers/2019_01/Cross-language_Speech_Dependent_Lip-synchronization.pdf)
  - VedicTHG, a deterministic phoneme-to-viseme mapping for educational avatars (language not confirmed). — [arXiv 2602.08775](https://arxiv.org/html/2602.08775v1)
- **Speed**:
  - Chatterbox-Nano: 3× real time on 8 CPU cores (English only).
  - Veena: under 80 ms on an H100.
  - svara: GGUF/CPU suitable.
  - Ditto: real-time streaming on an A100 with TensorRT.
  - — sources above. No independent CPU benchmarks were found for IndicF5 or Chatterbox-Multilingual. **[unverified]** Flow-matching models (F5/IndicF5) are typically well below real time on CPU.

### Inferences
- **Pipeline:** TTS audio + known text → ctc-forced-aligner with indicwav2vec-hindi (Devanagari) or wav2vec2-English (Latin) → word and character timings → G2P (espeak-ng `hi` / misaki) → Hindi phonemes → viseme table (W13-3904 or Jeffers / ARKit) → mouth shapes plus caption word highlights.
- **Hinglish:** split by script or language before alignment, or romanise to one script.
- **Hindi phonemes to treat specially:** aspirates (kh, gh) share visemes with their plain forms; retroflex sounds (ʈ, ɖ, ɳ) map to the alveolar viseme; the labiodental v/w (व) should use a lip-rounding blend; nasalisation (anusvara) needs no extra mouth shape.

### Gaps
- Not confirmed: whether Chatterbox, Veena, svara or IndicF5 expose duration or alignment outputs, the licences of MFA's pretrained Hindi models, and CPU real-time factors for the Indic TTS models.
