# Voice cloning and near-real lip sync for the Pratibimb teacher avatar

Scope: how to measure lip sync, which open audio-to-face models we can use, how to do rule-based co-articulation well (including Hindi), which voice-cloning models are allowed for commercial use, and where phoneme timings come from. Checked 2026-11-25. Licences come from GitHub LICENSE files (raw.githubusercontent.com), HF API tags (`huggingface.co/api/models/<id>`) and the NVIDIA licence page. "Tag" means the HF metadata tag only, not a full read of the licence text. Anything not checked is marked **UNVERIFIED**.

## 1. How lip-sync quality is measured, and what "as good as real" means in numbers

### Takeaway
No single number means "95% real". The usable targets are: (a) SyncNet LSE-D/LSE-C on rendered frames, judged against real video of the same kind (real LRS2 video scores LSE-D 6.736 / LSE-C 7.838); (b) temporal misalignment under about 50 ms (people notice audio arriving more than 50 ms before the lips move); and (c) a pairwise A/B human study against real or reference footage, where a tie (about 50% preference) is the honest meaning of "as good as real". LVE and FDD need ground-truth 3D meshes, so we can only compute them on a captured dataset, not on our avatar's free speech.

### Cited Findings
- Wav2Lip (the paper that introduced the LSE-D/LSE-C protocol) reports **Real Videos: LRW LSE-D 7.012 / LSE-C 6.931; LRS2 6.736 / 7.838**. Wav2Lip itself scores LRS2 6.386 / 7.789 and LRS3 6.652 / 7.887, which is "better than real" on LSE-D. So SyncNet can be gamed and is only a sanity check, not proof of realism. — [Wav2Lip, ar5iv 2008.10010](https://ar5iv.labs.arxiv.org/html/2008.10010)
- LSE-C is a confidence score (higher is better) and LSE-D is a distance (lower is better). Both are computed per video and averaged. — [VividTalker 2310.20240](https://arxiv.org/pdf/2310.20240)
- THEval (85,000 videos from 17 methods, with a user study) finds that existing metrics, LSE included, "do not correlate well with user preferences". It also documents SyncNet instability (sensitive to the mouth crop and head pose). — [THEval 2511.04520](https://arxiv.org/html/2511.04520v2)
- "Perceptually Accurate 3D Talking Head" proposes three aspects: **temporal sync (MTM, Mean Temporal Misalignment, in ms)**, **lip readability (PLRS)** and **expressiveness (SLCC, speech-lip intensity correlation)**. It cites Vatakis et al.: mismatches become noticeable when speech leads the lips by more than **50 ms** or lags them by more than **220 ms**. Most 3D models sit at MTM **50–60 ms**. — [2503.20308](https://arxiv.org/html/2503.20308)
- In that paper's VOCASET Table 2, ground-truth mesh PLRS is 0.409 and SLCC is 0.34. FaceFormer scores MTM 53.6 ms, LVE 3.357, PLRS 0.368 and SLCC 0.26. CodeTalker scores 61.8 / 3.700 / 0.381 / 0.38. SelfTalk scores 50.1 / 2.971 / 0.414 / 0.41. — [2503.20308](https://arxiv.org/html/2503.20308)
- The same paper's human study prefers **expressive lips with 100 ms asynchrony (82.6%) over precise timing with low expressiveness (17.4%)**. Mouth-opening amplitude that tracks loudness matters as much as timing. — [2503.20308](https://arxiv.org/html/2503.20308)
- That paper also trains a speech-mesh SyncNet, so sync can be scored on 3D vertices without rendering. — [2503.20308](https://arxiv.org/html/2503.20308)
- ARTalk, TFHP dataset (LVE, FFD, MOD, lower is better): FaceFormer 12.72 / 22.06 / 2.73; CodeTalker 11.78 / 20.39 / 2.43; SelfTalk 12.07 / 23.74 / 2.57; ScanTalk* 12.14 / 21.02 / 3.20; UniTalker* 11.61 / 29.31 / 2.07; DiffPoseTalk 10.39 / 20.15 / 2.07; **ARTalk 9.34 / 18.15 / 1.81**. On VOCASET-Test, ScanTalk is best on LVE (7.15) and ARTalk is second on FFD (15.49). — [ARTalk 2502.20323](https://arxiv.org/html/2502.20323)
- ARTalk user study (pairwise, with ground truth shown as reference): users preferred ARTalk on sync over FaceFormer 75.0%, CodeTalker 84.5%, UniTalker 81.8% and DiffPoseTalk 63.1%. It notes that head motion biases sync judgements, so sync was rated with the head pose fixed. — [ARTalk 2502.20323](https://arxiv.org/html/2502.20323)
- UniTalker, BIWI (LVE / MVE / UFVE / FDD, params M, time s): FaceFormer 4.98 / 7.28 / 6.91 / 4.01, 109 M, 0.705 s; SelfTalk 4.25 / … / 3.59, 0.071 s; **UniTalker-L 3.86 / 6.42 / 6.15 / 5.23, 313 M, 0.054 s**. Its user study support rates are 72–78% on lip sync. — [UniTalker 2408.00762](https://arxiv.org/html/2408.00762)
- DiffPoseTalk user study (1–5 MOS, 26 raters, ground truth shown): lip sync FaceFormer 2.56, CodeTalker 2.88, DiffPoseTalk (no head pose) 4.23, with head pose 4.52. — [DiffPoseTalk 2310.00434](https://arxiv.org/html/2310.00434)
- ScanTalk reports a five-category user study on lip-sync quality as an evaluation option. — [2410.11041](https://arxiv.org/pdf/2410.11041)
- PASE reports LSE-C/D "very close to the ground-truth video's" values for NeRF/3DGS heads. This is the precedent for scoring rendered avatars with SyncNet. — [PASE 2504.05803](https://arxiv.org/pdf/2504.05803)

### Inferences
- A measurable definition of "95% real-looking" for Pratibimb, built from the above:
  1. **Sync gate (automatic):** render the avatar (head pose fixed, frontal, 25 fps, 224 px mouth crop) and run SyncNet. Target LSE-D at or below the real-video baseline for the same clip type (record the founder on camera reading the same lines and score that as our own "real" row; about 6.7–7.0 on LRS-style data). Target LSE-C at or above the real baseline minus 5%. Measure the audio-video offset SyncNet reports and require it to be at most 1 frame (40 ms at 25 fps) and never audio-leading by more than 50 ms.
  2. **Expressiveness gate:** the correlation between mouth-open amplitude (jawOpen + mouth blendshapes) and the RMS loudness envelope should be at or above the real recording's (SLCC-style, about 0.34 on VOCASET ground truth).
  3. **Viseme accuracy on a phonetic test set:** bilabials /p b m/ must fully close (lip distance under a threshold on 100% of frames inside the phone interval). Labiodentals /f v/ must touch. Rounded vowels must show lip funnel/pucker. Measure this per phone class against forced-aligned intervals.
  4. **Human gate (the real "95%"):** a blind pairwise A/B test of avatar against real footage of the same speaker and the same sentence (or against the best reference model), at least 20 raters and at least 30 clips. Pass when avatar preference is at least 45% (indistinguishable within the CI) on "lip sync" and on "naturalness". A 1–5 MOS with at least 4.3 (DiffPoseTalk's best with ground truth shown is 4.52) is a secondary option.
- LVE/FDD are useful only for model selection on public data (VOCASET/BIWI). They need FLAME/registered meshes, which our ARKit rig does not have.

### Gaps
- I did not find a paper that runs SyncNet on rendered ARKit-blendshape avatars and reports a ground-truth row for that render style. SyncNet was trained on real faces, so a stylised/painted avatar may score lower for domain reasons. This needs our own baseline (founder video against avatar).
- I did not check THEval's exact Spearman figure; the text extraction dropped the number.

## 2. Best open audio-to-face models: licences, quality, Hindi, speed

### Takeaway
For our ARKit-52 rig, the commercially clean choices are **NVIDIA Audio2Face-3D v3.0** (weights: NVIDIA Open Model License, commercial; SDK MIT; needs an NVIDIA GPU with CUDA/TensorRT) and **LAM Audio2Expression / wav2arkit_cpu** (Apache-2.0, ARKit-52 directly, 1.8 MB ONNX, about 45 ms per second of audio on CPU). The top research models (ARTalk, DiffPoseTalk, UniTalker, CodeTalker, FaceFormer) output FLAME or dataset meshes, not ARKit, and several are non-commercial (SelfTalk, EmoTalk are CC BY-NC 4.0).

### Cited Findings
- **NVIDIA Audio2Face-3D v3.0, v2.3-Mark, v2.3.1-Claire/James**: HF licence `nvidia-open-model-license`. The card says "ready for commercial/non-commercial use". — [HF card](https://huggingface.co/nvidia/Audio2Face-3D-v3.0)
- The NVIDIA Open Model License says: "Models are commercially usable", "You are free to create and distribute Derivative Models", and "NVIDIA does not claim ownership to any outputs". Redistribution must include the notice "Licensed by NVIDIA Corporation under the NVIDIA Open Model License". The grant is "revocable (as stated in Section 2.1)", tied to compliance and a patent/copyright-litigation clause. — [NVIDIA Open Model License](https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-open-model-license/)
- Audio2Emotion-v3.0 is under a separate `nvidia-audio2emotion-license` and is gated. Its terms were **UNVERIFIED**, so don't assume commercial use. — [HF API](https://huggingface.co/api/models/nvidia/Audio2Emotion-v3.0)
- Audio2Face-3D SDK: **MIT** licence. It requires CUDA ≥12.8, TensorRT ≥10.13, an NVIDIA GPU and 4 GB+ VRAM. No CPU path is documented. — [SDK LICENSE](https://raw.githubusercontent.com/NVIDIA/Audio2Face-3D-SDK/main/LICENSE.txt), [SDK README](https://raw.githubusercontent.com/NVIDIA/Audio2Face-3D-SDK/main/README.md)
- Audio2Face-3D training framework: **Apache-2.0**. — [LICENSE](https://raw.githubusercontent.com/NVIDIA/Audio2Face-3D-training-framework/main/LICENSE)
- Community ports of the A2F weights exist (MLX and TPU versions such as `aufklarer/Audio2Face-3D-v2.3.1-Claire-MLX` and `mashbox-labs/Audio2Face-3D-v3.0-TPU`). Their licence chain is inherited and was **UNVERIFIED**. — [HF search](https://huggingface.co/api/models?search=Audio2Face)
- **LAM Audio2Expression**: code is Apache-2.0 and the `3DAIGC/LAM_audio2exp` weights are tagged apache-2.0. — [LICENSE](https://raw.githubusercontent.com/aigc3d/LAM_Audio2Expression/main/LICENSE), [HF](https://huggingface.co/3DAIGC/LAM_audio2exp)
- **wav2arkit_cpu** (`myned-ai/wav2arkit_cpu`): apache-2.0, base model LAM_audio2exp, a fused wav2vec2 + LAM ONNX. It takes raw 16 kHz audio in and gives 52 ARKit blendshapes out at 30 fps, at "~45ms per second of audio, 22× faster than realtime", in 1.8 MB. — [HF card](https://huggingface.co/myned-ai/wav2arkit_cpu)
- The card says it is built on `facebook/wav2vec2-base-960h`, an English-only ASR encoder. — [HF card](https://huggingface.co/myned-ai/wav2arkit_cpu)
- **FaceFormer**: MIT. **CodeTalker**: MIT. **ARTalk** (xg-chu): MIT code. — [FaceFormer](https://raw.githubusercontent.com/EvelynFan/FaceFormer/main/LICENSE), [CodeTalker](https://raw.githubusercontent.com/Doubiiu/CodeTalker/main/LICENSE), [ARTalk](https://raw.githubusercontent.com/xg-chu/ARTalk/main/LICENSE)
- **SelfTalk** and **EmoTalk** (Psyche AI): "Creative Commons Attribution-NonCommercial 4.0", so **not usable**. — [SelfTalk](https://raw.githubusercontent.com/psyai-net/SelfTalk_release/main/LICENSE), [EmoTalk](https://raw.githubusercontent.com/psyai-net/EmoTalk_release/main/LICENSE)
- ARTalk runs at 0.01 s per 1 s of audio on an A100 and 0.057 s on an Apple M2 Pro. It is best on TFHP (LVE 9.34). — [ARTalk 2502.20323](https://arxiv.org/html/2502.20323)
- UniTalker-L takes 0.054 s at 313 M params and is trained on A2F-Bench (English, Chinese and multilingual datasets). — [UniTalker 2408.00762](https://arxiv.org/html/2408.00762)
- FaceFormer and CodeTalker use the English `wav2vec2-base-960h` encoder. SelfTalk uses `wav2vec2-large-xlsr-53-English`. — [UniTalker 2408.00762](https://arxiv.org/html/2408.00762)

### Inferences
- **Recommended stack:** (1) Keep wav2arkit_cpu as the CPU/browser baseline (Apache, ARKit-native). (2) Add A2F-3D v3.0 as the "quality" path on a GPU box (the free Oracle server is ARM CPU-only, so this needs a free GPU such as Kaggle or Colab for offline lesson rendering; it cannot run live there). (3) Fuse the audio-driven output with our Kokoro/aligner viseme track. Phoneme timings force exact closures for /p b m f v/, and the model supplies co-articulation and expressiveness.
- **Hindi:** every audio-to-face model here uses English-pretrained audio encoders. They track acoustics, so they generalise partly to Hindi, but retroflex and aspirate cues may be weak. A hybrid with a phoneme-driven rule layer is the safer route to measurable Hindi accuracy.
- FLAME-based models (ARTalk, DiffPoseTalk, UniTalker's FLAME heads) would need a FLAME-to-ARKit retarget. The FLAME model's own licence is, to my knowledge, research-only. **UNVERIFIED here: check it before any FLAME use.**

### Gaps
- No LICENSE file was found at the default paths for UniTalker_release, DiffPoseTalk, or the NVIDIA/Audio2Face-3D umbrella repo (404). GitHub API access was blocked in this session. Treat these as unknown.
- I did not verify A2F-3D v3.0's exact output format (it is likely a mesh/PCA solve with a blendshape solver in the SDK) or its multilingual claims.
- No published Hindi lip-sync benchmark exists for any of these models.

## 3. Rule-based co-articulation done well, and Hindi visemes and alignment

### Takeaway
The proven procedural recipe is JALI: two independent channels (JAw and LIp) driven by phoneme timings, with a viseme profile (attack, apex, sustain, decay). Cohen-Massaro dominance functions blend overlapping visemes but must be overridden so bilabials always close. For Hindi phoneme timings with a commercial licence, use the Apache-tagged `ai4bharat/indicwav2vec-hindi` (or its `parseh/aligner-hi` derivative) with a CTC aligner. Avoid MMS (CC BY-NC) and the GPL Bournemouth aligner.

### Cited Findings
- JALI separates visual speech into jaw and lip anatomical channels on a FACS-based rig. It is "an animator-centric procedural lip-sync method" that maps acoustic properties of speech to jaw and lip movement. — [JALI SIGGRAPH 2016](https://dgp.toronto.edu/~elf/JALISIG16.pdf), [project page](https://www.dgp.toronto.edu/~elf/jali.html)
- Cohen and Massaro's dominance model (1993) blends overlapping dominance functions, and it can fail to close the lips for /m b p/. — [MPI WSCG 2002](https://resources.mpi-inf.mpg.de/FAM/publ/wscg2002.pdf), via [search summary](https://www.dgp.toronto.edu/~karan/papers/visemenetSIG18.pdf)
- VisemeNet (an audio-to-JALI-curves network) treats JALI as the state of the art in procedural speech animation. It covers viseme mapping, co-articulation and viseme profile (attack, apex, sustain, decay). — [VisemeNet 1805.09488](https://ar5iv.labs.arxiv.org/html/1805.09488)
- A JALI-style lip-sync patent exists (US 10839825), "System and method for animated lip synchronization". Check it before copying its exact method into a commercial product. — [USPTO](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10839825)
- Expressiveness (amplitude tracking loudness) beats perfect timing in human preference (82.6% against 17.4%). This supports a JALI-style jaw channel scaled by loudness. — [2503.20308](https://arxiv.org/html/2503.20308)
- Hindi aligners: `ai4bharat/indicwav2vec-hindi` is tagged apache-2.0 (gated). `parseh/aligner-hi` is tagged apache-2.0 and its card asks that LICENSE/NOTICE keep attribution. — [HF API indicwav2vec-hindi](https://huggingface.co/api/models/ai4bharat/indicwav2vec-hindi), [parseh/aligner-hi](https://huggingface.co/parseh/aligner-hi)
- `facebook/mms-300m`, `facebook/mms-1b-all` and `MahmoudAshraf/mms-300m-1130-forced-aligner` are all tagged **cc-by-nc-4.0**. ctc-forced-aligner's code is BSD, but its default model is NC. — [HF API](https://huggingface.co/api/models/facebook/mms-1b-all), [ctc-forced-aligner](https://www.github.com/MahmoudAshraf97/ctc-forced-aligner)
- Bournemouth Forced Aligner has a Hindi preset and is GPLv3. — [PyPI](https://pypi.org/project/bournemouth-forced-aligner/)
- Montreal Forced Aligner code is MIT. A Hindi CV dictionary v2.0.0 exists, using the Epitran phone set. — [MFA LICENSE](https://raw.githubusercontent.com/MontrealCorpusTools/Montreal-Forced-Aligner/main/LICENSE), [MFA Hindi dictionary](https://mfa-models.readthedocs.io/en/latest/dictionary/Hindi/Hindi%20CV%20dictionary%20v2_0_0.html)
- WhisperX code is BSD-2-Clause. — [LICENSE](https://raw.githubusercontent.com/m-bain/whisperX/main/LICENSE)
- A comparison of ASR methods for forced alignment exists (2406.19363). — [arXiv](https://arxiv.org/html/2406.19363v1)

### Inferences
- **Co-articulation plan (no AI, deterministic, testable):**
  - Per phone, use Cohen-Massaro dominance with per-class rates (vowels are low-dominance; /p b m f v/ and rounded /u o/ are high).
  - Add hard constraints: bilabial closure (lip distance 0 for at least 2 frames at the phone's apex) and labiodental contact.
  - Anticipatory rounding: start lip funnel/pucker up to about 100–200 ms before a rounded vowel when no conflicting labial phone sits in between. This look-ahead value is my engineering choice, **not from a cited source**.
  - Jaw channel = viseme jaw target × loudness envelope (JALI "JA").
  - Lip channel = viseme lip shape × articulation effort (JALI "LI").
  - Always render audio-to-lips aligned to within ±1 frame, and bias lips about 0–40 ms early rather than late, since audio leading by more than 50 ms is noticeable.
- **Hindi viseme mapping** (phonetic reasoning, **not from a cited source**; validate with the founder's video):
  - Retroflex ट ठ ड ढ ण: visually close to alveolar T/D/N, with slightly more jaw open and less lip spread.
  - Aspirates ख घ छ झ ठ ढ थ ध फ भ: same viseme as the unaspirated stop, plus a short open "release" frame (about 40–80 ms of slightly open jaw).
  - फ in Hindi is often /pʰ/ (bilabial closure), but /f/ in Hinglish loanwords, so pick by the word list.
  - व is /ʋ/: labiodental-ish (FF/ V viseme, lighter).
  - Nasals: न ण → nn; म → PP (closure).
  - Nasalised vowels (anusvara/chandrabindu): no special mouth shape.
  - Schwa deletion matters for timing, because the aligner must use a schwa-deleted lexicon.
- Kokoro's Hindi voices give phoneme timings through its G2P (misaki). HeadTTS itself is English-only, so a Hindi path needs either our own Kokoro-Hindi timing extraction or the indicwav2vec CTC aligner on any TTS output.

### Gaps
- I could not verify the Hindi MFA acoustic model's licence page (404 at the guessed URL).
- I found no published Hindi viseme study with measured lip shapes.
- I did not read the upstream AI4Bharat licence text for indicwav2vec (gated; tag only).

## 4. Voice cloning with commercial-OK weights for Indian English, Hindi and Hinglish

### Takeaway
The clear winner is **Chatterbox Multilingual V3** (MIT code and weights, 23 languages including Hindi, zero-shot cloning from a short reference) plus its dedicated **Chatterbox-Multilingual-hi** fine-tune (MIT). Both come with the PerTh watermark (MIT) built in. **IndicF5** is tagged MIT but gated, and its base weights' provenance was not verified. svara-TTS and Veena are Apache-tagged but sit on a Llama-3.2 lineage and have fixed speakers, not cloning. CosyVoice 3 and Qwen3-TTS (both Apache) do not list Hindi. F5-TTS, XTTS and Fish S1-mini are non-commercial.

### Cited Findings
- **Chatterbox** (`ResembleAI/chatterbox`): HF tag mit and GitHub LICENSE MIT. Multilingual V3 is 0.5B, "improving speaker similarity, reducing hallucinations". Its 23 languages include **Hindi**. The single-language pack includes a Hindi fine-tune. "Every audio file generated by Chatterbox includes Resemble AI's Perth … watermarker." The card says it is "consistently preferred" over ElevenLabs in side-by-side tests (vendor claim, **no numbers seen**). — [HF README](https://huggingface.co/ResembleAI/chatterbox), [LICENSE](https://raw.githubusercontent.com/resemble-ai/chatterbox/master/LICENSE)
- **Chatterbox-Multilingual-hi**: tag `mit`, base `ResembleAI/chatterbox`, "optimized for Hindi … expressive text-to-speech and voice cloning". — [HF card](https://huggingface.co/ResembleAI/Chatterbox-Multilingual-hi)
- **PerTh** watermarker: MIT. **AudioSeal** (Meta): code MIT and the `facebook/audioseal` weights are tagged mit. — [Perth LICENSE](https://raw.githubusercontent.com/resemble-ai/Perth/master/LICENSE), [AudioSeal LICENSE](https://raw.githubusercontent.com/facebookresearch/audioseal/main/LICENSE), [HF](https://huggingface.co/api/models/facebook/audioseal)
- **IndicF5**: HF tag mit, gated ("auto"). It is trained on 1417 h (Rasa, IndicTTS, LIMMITS, IndicVoices-R), covers 11 Indian languages, and is described as "near-human". It credits F5-TTS for "inspiration". — [HF API](https://huggingface.co/api/models/ai4bharat/IndicF5), [GitHub README](https://raw.githubusercontent.com/AI4Bharat/IndicF5/main/README.md)
- **F5-TTS** base weights: **cc-by-nc-4.0**. — [HF API](https://huggingface.co/api/models/SWivid/F5-TTS)
- `SPRINGLab/F5-Hindi-24KHz`: cc-by-4.0 (tag). — [HF API](https://huggingface.co/api/models/SPRINGLab/F5-Hindi-24KHz)
- **svara-TTS v1** (`kenpath/svara-tts-v1`): tag apache-2.0. It is an adapter on `canopylabs/3b-hi-ft-research_release`, which is tagged apache-2.0 and built on `orpheus-3b-0.1-pretrained`, itself based on `meta-llama/Llama-3.2-3B-Instruct`. A sibling, `canopylabs/3b-hi-pretrain-research_release`, is tagged **llama3.2**. It covers 19 languages (18 Indic plus Indian English), about 50 speakers addressed as "Language (Gender)", emotion tags, and "zero-shot adaptation paths". — [HF API svara](https://huggingface.co/api/models/kenpath/svara-tts-v1), [README](https://huggingface.co/kenpath/svara-tts-v1), [HF API orpheus](https://huggingface.co/api/models/canopylabs/orpheus-3b-0.1-pretrained), [3b-hi-pretrain](https://huggingface.co/api/models/canopylabs/3b-hi-pretrain-research_release)
- **Veena** (`maya-research/Veena`): apache-2.0, 3B on a Llama architecture, Hindi, English and code-mixed text. It has 4 fixed speakers (kavya, agastya, maitri, vinaya), outputs 24 kHz through SNAC, and claims "sub-80ms latency on H100". No cloning is documented. — [HF card](https://huggingface.co/maya-research/Veena)
- **Fun-CosyVoice3-0.5B-2512**: apache-2.0, language tags zh, en, fr, es, ja, ko, it, ru, de (**no Hindi**). The CosyVoice code is Apache-2.0. — [HF API](https://huggingface.co/api/models/FunAudioLLM/Fun-CosyVoice3-0.5B-2512), [LICENSE](https://raw.githubusercontent.com/FunAudioLLM/CosyVoice/main/LICENSE)
- **Qwen3-TTS-12Hz-1.7B/0.6B-Base**: apache-2.0, "3-second rapid voice clone", streaming with about 97 ms latency, 10 languages (**no Hindi**). — [HF card](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-Base)
- **OpenVoice V2**: weights tagged mit and code MIT. — [HF API](https://huggingface.co/api/models/myshell-ai/OpenVoiceV2), [LICENSE](https://raw.githubusercontent.com/myshell-ai/OpenVoice/main/LICENSE)
- **Indic Parler-TTS**: apache-2.0, gated. — [HF API](https://huggingface.co/api/models/ai4bharat/indic-parler-tts)
- **XTTS-v2**: Coqui Public Model License (non-commercial). — [HF API](https://huggingface.co/api/models/coqui/XTTS-v2), [CPML](https://coqui.ai/cpml)
- **Fish Audio** code: "Fish Audio Community License v1.0" (updated 13 Oct 2026). It allows commercial use only while annual revenue is under USD 500,000. It bans any "Hosted Service" whose primary purpose is TTS or voice cloning for third parties' own text or voices, but allows "an assistant's spoken replies" in your own product. It requires a "Built with Fish Audio" display. The `fishaudio/s1-mini` weights are tagged **cc-by-nc-sa-4.0**, and S2-Pro weights are under a separate "Fish Audio Research License". — [LICENSE](https://raw.githubusercontent.com/fishaudio/fish-speech/main/LICENSE), [HF API s1-mini](https://huggingface.co/api/models/fishaudio/s1-mini)
- **Kokoro-82M**: apache-2.0, 2 female and 2 male Hindi voices (hf_alpha, hf_beta, hm_omega, hm_psi). It has no cloning. — [HF API](https://huggingface.co/api/models/hexgrad/Kokoro-82M), [VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/raw/main/VOICES.md)
- Other models with Apache/MIT tags that I did not evaluate for Hindi: VibeVoice-1.5B (mit), NeuTTS Air (apache-2.0, gated), Dia-1.6B (apache-2.0), kyutai tts-1.6b-en_fr (cc-by-4.0). IndexTTS-2 has no licence tag (en/zh). — [HF API](https://huggingface.co/api/models/microsoft/VibeVoice-1.5B)

### Inferences
- **Plan:**
  1. Chatterbox-Multilingual-hi (Hindi and Hinglish) plus multilingual V3 (Indian English) as the cloning engine, using a 10–30 s consenting reference recorded clean at 24 kHz or higher. Generate lessons offline (this is GPU-heavy, so the free CPU server is too slow for live use: **UNVERIFIED CPU speed**).
  2. Keep the PerTh watermark on (MIT, built in) and add AudioSeal (MIT) if a detector is needed in our own tooling.
  3. Store a signed consent record (who, when, scope, revocation) beside the voice reference.
  4. Measure quality ourselves: speaker similarity (cosine similarity of speaker embeddings, reference against output, using a commercially licensed verifier, **licence to check**), WER/CER through a Hindi ASR, and a 20-rater MOS/A-B against the real voice.
- OpenVoice V2's tone-colour converter (MIT) could re-voice Indic Parler-TTS or Kokoro-Hindi output into the cloned timbre. Its quality on Hindi is **UNVERIFIED**.
- svara and Veena are fine as fixed voices, but the Llama 3.2 lineage may bring Llama Community License duties (attribution, the MAU cap). **Read the Llama 3.2 licence before use.**
- IndicF5 should only be used after reading the gated card's full licence and confirming whether it was trained from scratch (MIT would then hold) or fine-tuned from the NC F5 base.

### Gaps
- No MOS or speaker-similarity numbers for Chatterbox-hi, IndicF5 or svara were retrieved, and I found no independent Hindi cloning benchmark.
- Sarvam Bulbul: no open weights were found (`sarvamai/bulbul-v1` returned nothing). It is an API with its own terms, not covered here.
- CPU real-time factors for Chatterbox were not measured or found.

## 5. Which TTS give phoneme timings directly, and the best forced aligner otherwise

### Takeaway
Only Kokoro via HeadTTS gives phoneme timestamps and Oculus visemes directly, and **HeadTTS is English-only**. Voice-cloning models (Chatterbox, Qwen3-TTS, CosyVoice) do not document timings, so cloned or Hindi audio needs a forced aligner. The commercial-OK picks are a CTC aligner with `ai4bharat/indicwav2vec-hindi` (Apache tag) for Hindi and MFA (MIT code) or WhisperX (BSD-2) for English. Check each acoustic model's licence separately.

### Cited Findings
- HeadTTS "provides phoneme-level timestamps and Oculus visemes for lip-sync". It is MIT, avoids eSpeak/GPL, and runs in the browser (WebGPU or WASM, with WASM "much slower") or on Node. "English is currently the only supported language." — [HeadTTS README](https://raw.githubusercontent.com/met4citizen/HeadTTS/main/README.md)
- MMS-based aligner checkpoints are cc-by-nc-4.0 (see section 3). — [HF API](https://huggingface.co/api/models/MahmoudAshraf/mms-300m-1130-forced-aligner)
- Apache-tagged Hindi wav2vec2 checkpoints: `ai4bharat/indicwav2vec-hindi` and `parseh/aligner-hi`. — [HF API](https://huggingface.co/api/models/parseh/aligner-hi)
- MFA code is MIT and WhisperX code is BSD-2-Clause. — [MFA](https://raw.githubusercontent.com/MontrealCorpusTools/Montreal-Forced-Aligner/main/LICENSE), [WhisperX](https://raw.githubusercontent.com/m-bain/whisperX/main/LICENSE)

### Inferences
- Pipeline: cloned TTS audio → text-to-phones (Hindi G2P with schwa deletion; English through the existing misaki/Kokoro G2P) → CTC alignment → Oculus/ARKit viseme track → co-articulation rules → fusion with the wav2arkit/A2F output → render → SyncNet and per-phone closure gates.
- WhisperX's default alignment models are per-language wav2vec2 checkpoints whose licences vary. Pin a known-licence model explicitly.

### Gaps
- No direct-timing output was verified for Chatterbox, Indic Parler or svara.
- No measured Hindi alignment accuracy (boundary error in ms) was found for indicwav2vec.
- The licences of MFA's pretrained English and Hindi acoustic models were not verified.
