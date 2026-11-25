# D. Free, commercially licensed TTS and voice cloning for Indian English, Hindi and Hinglish (CPU server or browser)

Research date: 2026-11-24. Scope: open models whose code AND weights allow commercial use, running on a free 4-core ARM CPU (Oracle Always Free) or in a browser. Paid APIs are excluded.

Context from this repo: NexoraGuru already runs HeadTTS + Kokoro-82M on the Oracle server (`deploy/voice-server/README.md`) with the four Kokoro Indian voices, and writes Hindi as IPA itself (`src/voice/hindi-ipa.js`) before sending it.

## Q1. Ranked comparison: licences, quality evidence, CPU speed, languages, timings

### Takeaway
On a free CPU server or in a browser, Kokoro-82M through HeadTTS is still the only option that meets every condition together: Apache-2.0 weights, MIT server, faster than real time on CPU and WebGPU, and word, phoneme and viseme timings for lip sync. Its Hindi voices are weak, though; the author grades them only "C". Better Indian voices with clean licences exist (Indic Parler-TTS, Svara-TTS v1, Veena and Chatterbox Multilingual), but they are 0.5B to 4B-parameter models. None of them returns timings, and I found no measured CPU speed for any of them. Expect them to be slower than real time on 4 ARM cores.

### Ranked table (best fit for the free CPU or browser plus lip sync goal first)

| # | Model | Code licence | Weights licence | Indian langs / voices | Quality evidence | CPU / browser speed | Timings for lip sync | Cloning |
|---|---|---|---|---|---|---|---|---|
| 1 | Kokoro-82M via HeadTTS | MIT (HeadTTS) | Apache-2.0 | Hindi: hf_alpha, hf_beta, hm_omega, hm_psi; graded C | Author grade C, 1–10 h Hindi data | RTF ≈0.22 Node CPU (M2), ≈0.23 Chrome WebGPU, ≈1.45 WASM q4 | Yes: words, visemes, phonemes, ms | No |
| 2 | Indic Parler-TTS (AI4Bharat) | Apache-2.0 (parler-tts) | Apache-2.0 | 21 langs incl. Hindi and English, 69 voices | Hindi NSS 84.79 | 0.9B; no CPU numbers found | No | No; voice chosen by text description |
| 3 | Svara-TTS v1 (Kenpath) | not stated in card | Apache-2.0 (Llama-3.2-3B base) | 19 (18 Indic + Indian English), ~50 speakers, emotion tags | No metrics | 3B; GGUF builds; no numbers | No | Separate voiceclone beta |
| 4 | Veena (Maya Research) | not checked | Apache-2.0 (page also shows a "proprietary" tag) | Hindi and English, 4 voices, code-mixed | MOS 4.2 (self-reported) | 3B/4B; GPU needed; CPU "much slower" | No | No |
| 5 | Chatterbox Multilingual (Resemble) | MIT | MIT | 23 langs incl. Hindi; Hindi finetune | none independent found | 0.5B; ONNX ports exist; no CPU RTF found | No | Yes, zero-shot (~10 s claimed) |
| 6 | IndicF5 (AI4Bharat) | (F5 code MIT) | MIT, gated, consent terms | 11 Indic incl. Hindi (no English listed) | none found | F5-based; no CPU numbers | No | Yes (reference clip and transcript) |
| — | Piper hi_IN voices | MIT engine | Each voice inherits its dataset licence. priyamvada: CC BY-NC-SA. rohan: IIT Madras IndicTTS licence PDF (unclear). pratham: reported NC. | Hindi | — | Very fast on CPU | Phoneme alignment possible | No |

Excluded (non-commercial or unclear): Meta MMS-TTS (CC-BY-NC 4.0), Coqui XTTS-v2 (CPML), F5-TTS official weights (CC-BY-NC-4.0), IndexTTS2 (bilibili licence, commercial use needs contact), Orpheus Hindi research release (gated "research release", licence not confirmed), AI4Bharat Indic-TTS FastPitch checkpoints (no stated checkpoint licence; the dataset is IIT Madras-licensed).

### Cited Findings
- Kokoro Hindi voices hf_alpha, hf_beta (female) and hm_omega, hm_psi (male). Each has target-quality B, "MM minutes" of training (10–100 min) and an overall grade of C. Total Hindi training data is "H hours" (1–10 h). Hindi is `lang_code='h'` with espeak-ng `hi` fallback, and the card warns that non-English support "may be absent or thin due to weak G2P and/or lack of training data." — [Kokoro VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)
- HeadTTS returns `words`, `wtimes` and `wdurations`, plus `visemes`, `vtimes`, `vdurations` and `phonemes`, all in ms. Its only supported language is `en-us`. It is MIT licensed, "doesn't use eSpeak or any other GPL-licensed module", and its dependencies are transformers.js/ONNX Runtime (Apache-2.0) and Kokoro (Apache-2.0). — [HeadTTS GitHub](https://github.com/met4citizen/HeadTTS)
- HeadTTS RTF on a MacBook Air M2:
  - Node CPU fp32: ≈0.21–0.24. The result is similar with 1 or 4 threads, and more threads can slow it down.
  - Browser WebGPU fp32: Chrome 0.23, Edge 0.24, Safari 0.91.
  - Browser WASM q4: ≈1.45–1.50, slower than real time.
  — [HeadTTS GitHub](https://github.com/met4citizen/HeadTTS)
- Kokoro on a 2-core ARM machine with no GPU (board unnamed): speed multipliers of ≈0.52× with 1 thread, 0.87× with 2 and 0.70× with 4, so it "never reaches real time". Piper ran ≈8× real time on the same box. — [Stacker News post](https://stacker.news/items/1578766) (community, single test)
- Kokoro ONNX on a desktop CPU: mean RTF 0.6415. — [benchmark report](https://raw.githubusercontent.com/gauravvij/kokoro-tts-vs-supertonic-3-tts/main/results/benchmark_report.md)
- No published, sourced benchmark shows Kokoro in real time on a Raspberry Pi 4 or 5. — [PromptQuorum](https://www.promptquorum.com/power-local-llm/best-local-tts-raspberry-pi); sherpa-onnx documents an RTF test on a Pi 4, but I did not retrieve the numbers — [sherpa-onnx Kokoro](https://k2-fsa.github.io/sherpa/onnx/tts/pretrained_models/kokoro.html)
- Indic Parler-TTS: "permissively licensed under the Apache 2.0 license". 21 languages including Hindi and English, 69 voices (the card elsewhere says 18 languages). 0.9B parameters, F32. Hindi Native Speaker Score is 83.43 ± 1.53 (pretrained) and 84.79 ± 2.09 (fine-tuned), with no English score. Recommended speakers are Rohit and Divya (Hindi) and Thoma and Mary (English). Code-mixing is not mentioned. — [HF card](https://huggingface.co/ai4bharat/indic-parler-tts)
- Svara-TTS v1: Apache-2.0, 3B (Llama-3.2-3B fine-tune, Orpheus approach). 19 languages (18 Indic + Indian English), ~50 speakers. The card calls it "code-switch aware", says common patterns work, and gives no metrics or speed figures. Six quantised variants and GGUF exports are listed for "edge/CPU". — [HF card](https://huggingface.co/kenpath/svara-tts-v1); there is also an [OpenVINO int4 build](https://huggingface.co/kenpath/svara-tts-v1-openvino-int4) and a [voiceclone beta](https://huggingface.co/kenpath/svara-tts-voiceclone-beta)
- Svara training data: 2000+ h from SYSPIN, RASA, IndicTTS and SPICOR, and "each dataset's license/terms apply". Emotion tags (`<happy>`, `<sad>`, …) go at the end of a sentence, and a `<clear>` tag helps with proper nouns. "Code-mixing works well in common patterns but is not a rules engine"; Hinglish is harder, and fine-tuning is the suggested fix. — [Svara blog](https://huggingface.co/blog/kenpath/svara-tts-open-multilingual-speech-for-india)
- Veena:
  - Licence and size: Apache 2.0 (a "proprietary" tag also appears, so the page is inconsistent). The overview says 3B but the metadata says 4B BF16. It uses the SNAC 24 kHz codec.
  - Voices: four (kavya, agastya, maitri, vinaya) in Hindi and English, with "code-mixed support".
  - Self-reported quality: MOS 4.2, 92% speaker similarity, 98% intelligibility.
  - Speed: <80 ms latency on H100, RTF 0.05. It needs a GPU; CPU is "much slower". NF4 quantisation is supported.
  - Training data: proprietary.
  — [HF card](https://huggingface.co/maya-research/Veena)
- Maya Research also released "Maya 2 Native" (11 Indian languages + English), reported as Apache-2.0. — [AIM](https://analyticsindiamag.com/ai-news/maya-research-releases-open-weight-speech-model-supporting-12-languages); not verified on the official card
- Chatterbox: MIT ("Licensed under MIT"). Multilingual covers 23 languages including Hindi, with a dedicated Hindi finetune. About 0.5B parameters (Llama backbone). Outputs carry the PerTh imperceptible watermark. The card gives no CPU speed. — [HF card](https://huggingface.co/ResembleAI/chatterbox)
- Chatterbox ONNX ports (onnx-community and community mirrors) cover 23 languages including Hindi under MIT. I found no CPU RTF. — [onnx-community](https://huggingface.co/onnx-community/chatterbox-ONNX), [KitsuMate mirror](https://huggingface.co/KitsuMate/chatterbox-multilingual-ONNX)
- Resemble's own pages conflict on commercial framing. One says to use it in commercial products freely; an archive page says its models are "no longer offered as commercial paid products" but remain open. — [Resemble product page](https://resemble.ai/learn/models/chatterbox-multilingual), [Resemble archive](https://resemble.ai/introducing-chatterbox-multilingual-open-source-tts-for-23-languages)
- IndicF5: "License: mit". 11 Indic languages including Hindi (English not listed). Access is gated and users must agree "to only clone voices for which you have explicit permission". The card recommends Indic-Speak (22 languages) instead. — [HF card](https://huggingface.co/ai4bharat/IndicF5)
- Piper hi_IN has three voices: pratham, priyamvada and rohan. — [piper-voices tree](https://huggingface.co/rhasspy/piper-voices/tree/main/hi/hi_IN)
  - priyamvada dataset licence: CC BY-NC-SA 4.0 — [MODEL_CARD](https://huggingface.co/rhasspy/piper-voices/blob/main/hi/hi_IN/priyamvada/medium/MODEL_CARD)
  - rohan: IIT Madras "Hindi Mono Male", licence in a linked PDF, fine-tuned from the US English lessac voice — [MODEL_CARD](https://huggingface.co/rhasspy/piper-voices/blob/main/hi/hi_IN/rohan/medium/MODEL_CARD)
  - pratham: reported as dataset CC BY-NC-SA 4.0 (secondhand) — [pali-tts](https://huggingface.co/dhammagift/pali-tts)
- AI4Bharat Indic-TTS: MIT code, FastPitch + HiFi-GAN checkpoints in a GitHub release with no checkpoint licence stated, trained on the IndicTTS dataset, 13 languages including Hindi. The README gives no MOS numbers in text. — [GitHub](https://github.com/AI4Bharat/Indic-TTS)
- Excluded, with the licence confirmed:
  - MMS-TTS Hindi: "licensed as CC-BY-NC 4.0" — [HF card](https://huggingface.co/facebook/mms-tts-hin)
  - XTTS-v2: Coqui Public Model License, supports Hindi, 6-second cloning — [HF card](https://huggingface.co/coqui/XTTS-v2)
  - F5-TTS weights: CC-BY-NC-4.0, trained on Emilia — [HF card](https://huggingface.co/SWivid/F5-TTS)
- IndexTTS2: bilibili Model Use License (2025-09-09), and the repo says "for commercial usage… contact indexspeech@bilibili.com". Third parties disagree on revenue thresholds. — [index-tts GitHub](https://github.com/index-tts/index-tts), [ScanCode licence entry](https://scancode-licensedb.aboutcode.org/bilibili-model-ula-2025-09-09.html)
- Orpheus Hindi (`canopylabs/3b-hi-ft-research_release`) is a gated "research release". The Apache claim comes from a Reddit summary, not from the card. — [HF gated page](https://huggingface.co/canopylabs/3b-hi-ft-research_release), [collection](https://huggingface.co/collections/canopylabs/orpheus-multilingual-research-release)
- Kyutai Pocket TTS:
  - Licence and size: CC-BY-4.0, 100M parameters. Access is gated by a prohibited-use policy that bars cloning without consent.
  - Languages: EN, FR, DE, PT, IT, ES only (no Hindi).
  - Speed: ≈6× real time on an M4 CPU using 2 cores, ~200 ms to first chunk.
  - Cloning: from a WAV file.
  — [HF card](https://huggingface.co/kyutai/pocket-tts)

### Inferences
- With 4 Ampere A1 ARM cores, Kokoro should land near or slightly faster than real time per sentence. The Oracle cores are faster than a 2-core no-name ARM box and slower than an M2. HeadTTS notes that extra threads do not help, so streaming sentence by sentence matters more than the core count. This is extrapolated, not measured.
- The 3B models (Svara, Veena) and Chatterbox at 0.5B are, by size, unlikely to reach real time on 4 ARM cores even when quantised. They need a GPU (Kaggle/Colab for batch pre-rendering of fixed lesson audio, or the GPU model farm). A good pattern is to pre-render fixed lesson narration offline with a better model, run forced alignment for the lip timings, and keep Kokoro for live replies.
- Indic Parler-TTS (0.9B, Apache-2.0) is the strongest clean-licence choice for natural Hindi and Indian-English narration rendered offline. It has an independent-ish metric (NSS), and its speakers are chosen by description, so the voice stays consistent.
- None of the Indian-quality models return phoneme timings. Getting them would need a forced aligner (for example a CTC aligner) run on the output audio. That aligner's licence would need its own check.
- Piper's Indian voices look fast, but they are not safe for commercial use. priyamvada is plainly NC; rohan depends on the IIT Madras licence PDF, which I could not read.

### Gaps
- No measured RTF for Kokoro, Indic Parler-TTS, Svara, Veena or Chatterbox on an Oracle A1 (Neoverse-N1) 4-core VM. Each one needs a local benchmark.
- I did not fetch the IIT Madras IndicTTS licence PDF (`iitm.ac.in/donlab/indictts/downloads/license.pdf`). Its terms decide whether Piper rohan, the AI4Bharat FastPitch checkpoints and possibly part of Svara's data are commercial-safe.
- No independent MOS or listening test comparing these models on Hindi or Indian English. TTS Arena-style leaderboards were not checked for Indic languages.
- I could not verify the following in this pass. My background knowledge, unconfirmed here, is:
  - Fish Speech / OpenAudio S1-mini: CC-BY-NC-SA weights
  - Spark-TTS: CC-BY-NC-SA weights, zh/en
  - CosyVoice2: Apache-2.0 but no Hindi
  - Zonos v0.1: Apache-2.0, no Hindi
  - Kitten TTS: Apache-2.0, English only
  - MeloTTS: MIT, has an "EN-India" English accent speaker but no Hindi
  - OpenVoice v2: MIT since 2024, tone-colour cloning on MeloTTS
  - StyleTTS2: MIT code, with weights conditions
  - Dia: Apache-2.0, English only
  - VibeVoice: MIT but withdrawn by Microsoft in 2025, en/zh
  The report writer should treat these as unverified.
- Svara-TTS code licence and inference repo: the card says deployment scripts are "coming soon".

## Q2. Voice cloning with a commercial licence from 10–60 s of reference

### Takeaway
The commercially licensed cloners with Hindi are Chatterbox Multilingual (MIT, zero-shot, Hindi included, watermarked output) and IndicF5 (MIT, gated, consent terms, Indic only). Svara has a cloning beta. XTTS-v2, F5-TTS (official weights) and IndexTTS2 are out on licence. Kyutai Pocket TTS is CPU-fast and CC-BY-4.0 but has no Hindi. I found no measured CPU or WebGPU speed for the Hindi-capable cloners.

### Cited Findings
- Chatterbox Multilingual clones zero-shot. Resemble says "from 10 seconds of reference audio", and Hindi has its own finetune. — [Resemble product page](https://resemble.ai/learn/models/chatterbox-multilingual); MIT and PerTh watermark — [HF card](https://huggingface.co/ResembleAI/chatterbox)
- ONNX exports of Chatterbox Multilingual exist (a browser/onnxruntime path). The only timing I found is GPU latency (PyTorch BF16 ≈3.0 s for a full WAV). — [hugbos ONNX v2](https://huggingface.co/hugbos/chatterbox-multilingual-ONNX-v2)
- IndicF5 clones from a reference clip plus its transcript. It is MIT, but users must "only clone voices for which you have explicit permission". — [HF card](https://huggingface.co/ai4bharat/IndicF5)
- Svara-TTS ships a separate voice-clone beta. — [HF](https://huggingface.co/kenpath/svara-tts-voiceclone-beta)
- Pocket TTS clones from a WAV file and can export a voice embedding, ≈6× real time on 2 CPU cores, but only in EN/FR/DE/PT/IT/ES. — [HF card](https://huggingface.co/kyutai/pocket-tts)
- XTTS-v2 clones from 6 s but is under CPML — [HF card](https://huggingface.co/coqui/XTTS-v2). F5-TTS weights are CC-BY-NC-4.0 — [HF card](https://huggingface.co/SWivid/F5-TTS). IndexTTS2 needs bilibili's permission — [GitHub](https://github.com/index-tts/index-tts).

### Inferences
- For "the founder's AI voice on lessons", the realistic free and legal path is:
  1. Chatterbox Multilingual (Hindi or English language tag, with the founder's consented 10–30 s clip) on a free GPU (Kaggle/Colab) to pre-render lesson audio.
  2. Align it for lip timings.
  3. Serve it as static files.
  Live cloning on 4 ARM cores is unlikely to be real time for a 0.5B LLM-based model.
- Kokoro cannot clone. Its voices are fixed style vectors (blending voices is possible, but that is not cloning).
- Chatterbox's PerTh watermark is a feature here: it lets the site prove that audio is synthetic.

### Gaps
- No quality reports found for cloning Indian-accented English with Chatterbox, IndicF5 or Svara.
- No WebGPU in-browser numbers for any Hindi-capable cloner.
- Reference-length sweet spot (10 vs 30 vs 60 s) is not documented for these models.

## Q3. Hinglish in Roman script

### Takeaway
No model here documents reliable handling of Romanised Hinglish ("mid kya hai"). Veena claims code-mixed Hindi and English, and Svara claims common code-switch patterns. Kokoro and HeadTTS need the text converted first: transliterate the Roman Hindi words to Devanagari or IPA, and keep English words in English. NexoraGuru already does this with `hindi-ipa.js`.

### Cited Findings
- Veena: "Native Hindi and English capabilities with code-mixed support." — [HF card](https://huggingface.co/maya-research/Veena)
- Svara: "Code-mixing works well in common patterns but is not a rules engine"; Hinglish is harder and fine-tuning is suggested. — [Svara blog](https://huggingface.co/blog/kenpath/svara-tts-open-multilingual-speech-for-india)
- Indic Parler-TTS: the card does not mention code-mixed text. — [HF card](https://huggingface.co/ai4bharat/indic-parler-tts)
- HeadTTS officially supports only `en-us`. — [HeadTTS](https://github.com/met4citizen/HeadTTS); Kokoro Hindi depends on misaki/espeak G2P, which the author calls weak. — [VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)

### Inferences
- All of these models expect Hindi in Devanagari. Romanised Hinglish needs a word-level language tagger plus Roman-to-Devanagari transliteration (for example IndicXlit, whose licence would need checking) before synthesis, whichever model is used.

### Gaps
- No published test of any model on Roman-script Hinglish.

## Q4. Speed on a 4-core ARM CPU and in the browser

### Takeaway
The only numbers found are for Kokoro: CPU RTF ≈0.22 on an M2, 0.52–0.87× real time on a weak 2-core ARM box, ≈0.23 with WebGPU in Chrome, and ≈1.45 with WASM, which is too slow. Pocket TTS shows a 100M model can run ≈6× real time on 2 CPU cores, but it has no Hindi. There are no CPU or browser numbers for any Indian-specific model.

### Cited Findings
- Kokoro/HeadTTS RTFs (CPU, WebGPU and WASM): see Q1 — [HeadTTS](https://github.com/met4citizen/HeadTTS), [Stacker News](https://stacker.news/items/1578766), [benchmark report](https://raw.githubusercontent.com/gauravvij/kokoro-tts-vs-supertonic-3-tts/main/results/benchmark_report.md)
- Veena: GPU required for real time; CPU "much slower". — [HF card](https://huggingface.co/maya-research/Veena)
- Pocket TTS: ≈6× real time on an M4 CPU with 2 cores. — [HF card](https://huggingface.co/kyutai/pocket-tts)

### Inferences
- In the browser, Kokoro on WebGPU is real-time capable on modern laptops. On WASM-only devices (most phones without WebGPU, older Safari) it falls behind real time, so the server path is needed as a fallback.

### Gaps
- No benchmark of any of these models on an Oracle A1 4-core VM; this must be measured.
- No WebGPU numbers for Indic Parler-TTS, Svara (GGUF/WebLLM-style) or Chatterbox ONNX.
