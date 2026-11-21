# Build NexoraGuru's voice tutor as a chain

**Short answer.** The best way to build this tutor in late 2026 is a **chain of small parts**, not one big "speech-to-speech" model. The chain is: speech-to-text (ASR, the part that turns voice into text), then a small text model that reads only NexoraGuru's own notes and can press buttons on the site, then text-to-speech (TTS, the part that turns text into voice). Engineers call this a **cascade**. The reason is simple. **No open speech-to-speech model found speaks Hindi or any other Indian language well.** Qwen3-Omni, the strongest open one, speaks 10 languages and none are Indian ([arXiv 2509.17765](https://arxiv.org/html/2509.17765v1)). A cascade also lets you control the "brain": you can limit it to site content, stop it giving answers, and let it call site actions. Good open Indian parts now exist under business-friendly licences: **IndicConformer and IndicWhisper for listening (MIT)**, **Maya 2 Native, Indic Parler-TTS and svara-TTS for speaking (Apache-2.0)**, and **Qwen3.5 0.8B/2B/4B for the brain (Apache-2.0)**. A reply in under one second is possible but tight on Indian mobile networks. A realistic estimate is 650–1,100 ms, so you need streaming at every step and a few tricks. "Near zero cost" is honest only for a pilot. Free tiers and a free Oracle server can carry a few hundred students a day. At 1,000 students talking at once, paid APIs would cost roughly **₹90,000–2,10,000 per hour**, and self-hosting needs dozens of GPUs. The one gap no competitor fills is a tutor that **talks in the student's own mix of languages, uses only verified GATE answers, gives hints instead of answers, and drives NexoraGuru's pages and animations by voice.** That is the thing to own.

> **How to read this report.** Facts with a link come from a source. Words in *italics marked "(unverified)"* come from the researchers' own knowledge and were not re-checked. **"Conflict"** means two sources disagree. Several model pages (Hugging Face, Sarvam) could not be opened in full during research, so some numbers come from search previews. Check every licence on the real model page before you ship.

---

## Seven jargon words you need

| Word | Plain meaning |
|---|---|
| **ASR / STT** | Speech-to-text. The "ears". |
| **TTS** | Text-to-speech. The "mouth". |
| **LLM** | The text model that thinks. The "brain". |
| **Cascade** | Ears → brain → mouth, as three separate parts. |
| **Speech-to-speech (S2S) / full-duplex** | One model that hears and speaks directly. Full-duplex means it can listen while talking. |
| **VAD** | Voice activity detection. A tiny model that knows when someone is speaking. |
| **WER** | Word error rate. The share of words the ears get wrong. Lower is better. |
| **WebGPU** | A browser feature that lets a web page use the phone's or laptop's graphics chip to run AI. |
| **LoRA** | A cheap way to fine-tune. You train a small "add-on" instead of the whole model. |
| **RAG** | Retrieval. The tutor first looks up the right notes, then answers from them. |
| **Latency / TTFT** | Delay. TTFT is "time to first token", how fast the brain starts replying. |

---

## Why a cascade beats one speech-to-speech model today

Speech-to-speech models are exciting, but they fail NexoraGuru's three hard needs: Indian voices, control, and tools. **Qwen3-Omni** (Apache-2.0, 30B MoE) answers in about 211–234 ms, but its speech output covers only English, Chinese, French, German, Russian, Italian, Spanish, Portuguese, Japanese and Korean ([arXiv 2509.17765](https://arxiv.org/html/2509.17765v1); [Alibaba blog](https://www.alibabacloud.com/blog/qwen3-omni-natively-omni-modal-foundation-models_602581)). **Conflict:** Alibaba's newer Qwen3.5-Omni report says 10 speech-output languages, while Model Studio lists 36 for a realtime version, and it is unclear whether those weights are open at all ([Alibaba Model Studio](https://www.alibabacloud.com/help/en/model-studio/s2s-model); [arXiv 2604.15804](https://arxiv.org/pdf/2604.15804)). **MiniCPM-o 4.5** (about 9B) is built for full-duplex and fits under 12 GB of memory, but no Indian-language support was found, and its Apache-2.0 tag needs checking against the actual licence file ([HF card](https://huggingface.co/openbmb/MiniCPM-o-4_5); [arXiv 2604.27393](https://arxiv.org/abs/2604.27393)). **Moshi** reaches about 200 ms on one GPU, but it needs a 24 GB GPU and *is English-only with a weak built-in brain (unverified)* ([Moshi paper](https://arxiv.org/abs/2410.00037); [Moshi README](https://raw.githubusercontent.com/kyutai-labs/moshi/main/README.md)). When the voice and the brain are one model, you cannot swap in a better brain or force it to stay on site notes.

There is a useful middle path. **"Speech-in, text-out" models** skip the separate ears step but keep a normal text brain. **Sarvam Shuka v1** is open (CC0) and was tested in 11 Indian languages, but it was trained on under 100 hours of audio and sits on Llama-3-8B, whose own licence also applies ([Sarvam blog](https://sarvam.ai/blogs/shuka-v1); [HF](https://huggingface.co/sarvamai/shuka_v1)). **Ultravox** added Hindi in v0.4.1 and more Hindi in v0.6; its adapter is MIT but the base model's licence applies too, and the hosted version costs $0.05 per minute ([Ultravox GitHub](https://github.com/fixie-ai/ultravox); [Ultravox blog](https://www.ultravox.ai/blog/introducing-ultravox-v0-7-the-world-s-smartest-speech-understanding-model)). These could save about 100–300 ms (estimate), so test them later. Do not build on them first.

### Speech-to-speech and speech-in options

| Model | Licence | Size / GPU | Delay | Indian speech out? | Brain controllable? | Verdict |
|---|---|---|---|---|---|---|
| Qwen3-Omni 30B-A3B | Apache-2.0 | 80 GB-class GPU (estimate) | 211–234 ms (vendor) | **No** | Fairly | Watch only |
| Qwen3.5-Omni / Flash-Realtime | Unclear if open | — | — | **Conflict** (10 vs 36 languages) | — | Watch only |
| MiniCPM-o 4.5 | Apache-2.0 per card (check file) | ~9B, <12 GB INT4 | ~0.58 s first token (text input) | Not found | Partly | Research |
| Moshi (Kyutai) | CC-BY 4.0 weights | 24 GB GPU | ~200 ms | No | No | Not a fit |
| Sesame CSM-1B | Apache-2.0, gated | 1B | Not published | English | It is only a voice | Not a fit |
| Ultravox v0.6/v0.7 | MIT adapter + base licence | Up to 32B base | Hosted $0.05/min | Text out (needs TTS) | Yes | Test in phase 3 |
| Sarvam Shuka v1 | CC0 + Llama 3 terms | 8B | Not measured | Text out, 11 Indian languages in | Yes | Test in phase 3 |
| Step-Audio 2 mini | Apache-2.0 | — | — | Not found | — | Skip |

Sources: [Qwen3-Omni](https://arxiv.org/html/2509.17765v1), [MiniCPM-o](https://learnopencv.com/minicpm-o-4-5-a-9b-model-that-can-see-hear-and-speak-at-the-same-time/), [Moshi](https://raw.githubusercontent.com/kyutai-labs/moshi/main/README.md), [CSM](https://huggingface.co/sesame/csm-1b), [Ultravox](https://huggingface.co/fixie-ai/ultravox-v0_6-qwen-3-32b), [Shuka](https://huggingface.co/sarvamai/shuka_v1), [Step-Audio 2](https://huggingface.co/stepfun-ai/Step-Audio-2-mini).

---

## The ears: Whisper for Hinglish, IndicConformer for Indian languages

Hinglish is the hardest case for every listening model. Reported Hinglish error rates run from **about 27% to 70%** depending on the model, in a vendor test on the same audio ([Deepgram](https://deepgram.com/blog/hinglish-voice-ai-speech-recognition)). In a 2026 Hindi benchmark, every system got worse on mixed-language words; one Hindi model dropped about 15.6 points on them ([arXiv 2606.21408](https://arxiv.org/pdf/2606.21408)). Even on clean Indian-accented English, Whisper-large still gets **11.2%** of words wrong, and the mistakes cluster on names and special terms ([Svarah, arXiv 2305.15760](https://arxiv.org/pdf/2305.15760)). That is exactly what "Dijkstra" and "O(n log n)" are. No public test exists for spoken CS words, so NexoraGuru must build its own.

The best fix is cheap. The tutor always knows which lesson is open. So pass that lesson's word list to the ears as a hint prompt, then let the brain fix leftover errors ("dixtra" → "Dijkstra"). In a 2026 Hindi-English doctor-patient test, IndicConformer scored 26.2–26.8% and in-domain fine-tuning cut the error to **19.6%**, the biggest single gain ([arXiv 2603.06373](https://arxiv.org/pdf/2603.06373)). On the older Vistaar Hindi benchmark, **IndicWhisper averaged 13.6% WER**, against 23.9% for Google STT and 20.0% for Azure ([AI4Bharat Vistaar](https://github.com/AI4Bharat/vistaar)). *Whisper prompts are limited to about 224 tokens and only nudge spelling (unverified).*

### Speech-to-text options

| Option | Size | Licence | Languages | Quality signal | Runs where | Cost |
|---|---|---|---|---|---|---|
| **IndicConformer-600M** (AI4Bharat) | 600M | MIT (gated download) | All 22 official | 26.2% on Hinglish medical test | Server; CoreML build for iPhone exists | Free (self-host) |
| **IndicWhisper / Vistaar** | ~Whisper-medium per language (inferred) | MIT | 12 tested | 13.6% avg Hindi (2023) | Server | Free (self-host) |
| **Whisper large-v3 / turbo** | 1.55B / 809M *(unverified)* | MIT *(unverified)* | ~100; good Indian English | 11.2% on Indian English | Server; Groq | Free tier on Groq |
| **Meta Omnilingual ASR** | 300M–7B | Apache-2.0 | 1,600+ | Indian WER not checked | Server | Free (self-host) |
| **Sarvam Saaras v3 / v4, Sarvam Audio** | v4 = encoder + 3B LM | **Closed API** | 22 + code-mixed (claimed) | Vendor claims strong | Sarvam cloud | ₹30/hour |
| **Moonshine v2** | Small | English MIT; other languages "Community" licence (**conflict** on commercial use) | **No Hindi confirmed** | Built for streaming | Phone/browser | Free |
| **Web Speech API** (browser) | — | Browser feature | hi-IN, en-IN *(unverified)* | Google's server engine | Chrome sends audio to Google | Free |
| **Meta MMS-1B** | 1B | CC-BY-NC *(unverified)* | Many | — | — | **Not for business** |

Sources: [IndicConformer](https://github.com/AI4Bharat/IndicConformerASR), [HF card](https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual), [CoreML build](https://huggingface.co/phequals/indic-conformer-600m-multilingual-coreml-rnnt), [Omnilingual](https://ai.meta.com/blog/omnilingual-asr-advancing-automatic-speech-recognition/), [Sarvam Saaras v4](https://www.sarvam.ai/blogs/introducing-saaras-v4), [Moonshine licence](https://moonshine-voice.readthedocs.io/en/latest/license/), [MDN Web Speech](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API).

**Hosted ears, for free or cheap.** **Groq Whisper's free tier allows about 8 hours of audio a day** (28,800 audio-seconds, 2,000 requests a day, 20 per minute) ([Groq rate limits](https://console.groq.com/docs/rate-limits)). **Conflict:** one directory says 30 per minute and 14,400 a day. Eight hours is about 2,400 student turns of 12 seconds (estimate). **Sarvam** costs about ₹30 per hour of audio, billed per second ([Sarvam pricing](https://docs.sarvam.ai/api-reference-docs/getting-started/pricing)); **conflict** on free credits (₹100 in the docs vs ₹1,000 on the pricing page). **Azure** gives 5 free hours a month and **Google** 60 free minutes a month ([Azure](https://azure.microsoft.com/en-us/pricing/details/speech/); [Google](https://cloud.google.com/speech-to-text/pricing/)). **Bhashini** (government) has a streaming endpoint ([Bhashini docs](https://dibd-bhashini.gitbook.io/bhashini-apis/websocket-asr-api)), but one 2026 blog says its docs call the free API "for proof of concept purposes only" ([DEV Community](https://dev.to/mr_manushukla/22-scheduled-languages-one-app-what-indic-localization-actually-costs-to-ship-in-2026-12ag)). Official terms were not found, so use it only for testing.

**In the browser.** Whisper-tiny on WebGPU runs about 10–15 times faster than real time ([offlinetts](https://offlinetts.com/blog/browser-speech-recognition-whisper-comparison/)). But tiny and base sizes are poor at Hindi, and no Hindi streaming model exists for sherpa-onnx in the browser ([sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)). Browser ears are realistic only for English commands ("next step", "open notes") or a private mode. The **Web Speech API is free but Chrome sends the audio to Google** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API)). Its on-device mode is experimental and was even switched off on ChromeOS in 2025 ([Chromium thread](https://groups.google.com/a/chromium.org/g/chrome-ai-dev-preview-discuss/c/Rlyc2uAsFCY)). If you use it, the privacy page must say so.

---

## The mouth: four Indian open voices now beat Western ones

This is the area that changed most in 2026. **Maya 2 Native** (Maya Research, released 25 Oct 2026) is Apache-2.0, speaks 11 Indian languages plus English, streams in 80 ms pieces, and clones a voice from **3–10 seconds** of audio ([model card mirror](https://huggingface.co/DhanushKorada/maya2-native)). Treat its quality claims with care. Its "#2 for Hindi" ranking comes from the CEO's post, not an independent test, and the "22 languages" headline is wrong ([Digit](https://www.digit.in/features/general/maya-2-explained-a-free-open-weight-voice-ai-model-for-22-indian-languages.html)). Its card also says "see component licenses", so bundled parts may carry other terms. **Indic Parler-TTS** (AI4Bharat, Apache-2.0) covers about 21 languages and lets you describe the voice in words ("calm male teacher, medium pace") ([HF card](https://huggingface.co/ai4bharat/indic-parler-tts)). **svara-TTS** (Kenpath, 19 languages, emotion control) already has ONNX, INT4 and even a WebGPU browser demo ([Kenpath blog](https://huggingface.co/blog/kenpath/svara-tts-open-multilingual-speech-for-india); [svara WebGPU](https://awesome.ecosyste.ms/projects/github.com%2Fshreyaskarnik%2Fsvara-tts-webgpu)). Its Apache-2.0 licence is reported only by third parties.

**The licence traps are serious.** Many popular voice models cannot be used on a site that earns money. **XTTS-v2** bans commercial use of the model *and its outputs*, and the company behind it closed ([XTTS-v2 README](https://huggingface.co/coqui/XTTS-v2/blame/v2.0.3/README.md)). **F5-TTS base weights are CC-BY-NC** (non-commercial) ([AssemblyAI list](https://www.assemblyai.com/blog/free-open-source-text-to-speech)). IndicF5 is listed as MIT, but it is built on the F5 design, so confirm it was trained from scratch and not from the non-commercial F5 checkpoint ([IndicF5](https://huggingface.co/ai4bharat/IndicF5); [open question](https://huggingface.co/ai4bharat/IndicF5/discussions/3)).

### Text-to-speech and voice-cloning options

| Model | Licence | Size | Indian languages | Cloning | Speed / where | Notes |
|---|---|---|---|---|---|---|
| **Maya 2 Native** | Apache-2.0 (check bundled parts) | Server GPU | 11 + English | Yes, 3–10 s | 80 ms streaming frames | Newest; claims unverified |
| **Veena** (Maya) | Apache-2.0 | ~3B (**conflict**: 3B vs 4B) | Hindi, English | — | Server GPU | Data not open |
| **svara-TTS v1** | Apache-2.0 (third-party report) | 3B (Orpheus-based) | 18 + Indian English | Beta; "unreliable" per mlx-audio | ONNX, INT4, MLX, WebGPU demo | Emotion tags |
| **Indic Parler-TTS** | Apache-2.0 (**conflict**: AIKosh says MIT; both fine) | ~0.9B *(unverified)* | ~21 | No (describe the voice) | Server; ONNX fp16 ~2.3 GB | Widest coverage |
| **IndicF5** | MIT (confirm origin) | — | Indian languages | Yes | Server | Derivatives add own terms |
| **Chatterbox Multilingual** | MIT | — | Hindi | Yes | Server | **Watermarks every output** |
| **Kokoro** | Apache-2.0 | 82M *(unverified)* | Hindi voices (lower quality) | No | **Browser** (WebGPU/WASM) | Offline fallback |
| **Piper** | Code GPL-3.0 now *(unverified)*; voices per dataset | ~60 MB | Hindi voices exist | No | **Browser/phone** | Robotic but tiny |
| **Sarvam Bulbul v3 / V4 Flash** | Closed API | — | 11 | Enterprise only (30–60 s) | Under 250 ms first audio | ₹30 per 10K chars (v3) |
| **XTTS-v2** | **Non-commercial** | — | Hindi | Yes | — | **Do not use** |
| **F5-TTS base** | **CC-BY-NC** | — | — | Yes | — | **Do not use** |
| Kyutai TTS, Dia, MeloTTS | Open | — | **No Hindi** | — | — | Not a fit |

Sources: [Veena](https://huggingface.co/maya-research/Veena), [svara ONNX](https://huggingface.co/shreyask/svara-tts-v1-ONNX), [mlx-audio](https://blaizzy.github.io/mlx-audio/models/tts/svara/), [Parler ONNX](https://huggingface.co/OpenVoiceOS/phoonnx-indic-parler), [Chatterbox v3](https://www.resemble.ai/resources/chatterbox-multilingual-v3-tts-with-embedded-watermarking-for-25-languages), [kokoro-js](https://npmjs.com/package/kokoro-js), [Piper Hindi](https://huggingface.co/pronoobie/piper-voices-hindi), [Sarvam TTS API](https://www.sarvam.ai/apis/text-to-speech.md), [Sarvam pricing](https://sarvam.ai/api-pricing), [Kyutai](https://kyutai.org/next/tts).

**Conflict on Bulbul V4 Flash price:** ₹20 per 10K characters in the news, ₹1 per 1K characters in the docs ([AIM](https://analyticsindiamag.com/ai-news/sarvam-ai-launches-bulbul-v4-flash-for-real-time-speech-in-11-indian-languages); [Sarvam docs](https://docs.sarvam.ai/api/pricing.md)). Free hosted voices are small: Google Chirp 3 HD gives 1 million characters a month free ([Google](https://cloud.google.com/text-to-speech/pricing)), and Azure 0.5 million, though **Microsoft's own answers conflict** on whether free-tier audio can be used commercially ([MS Q&A](https://learn.microsoft.com/en-us/answers/questions/5792674/can-the-audio-generated-by-azure-speech-studios-fr)). **ElevenLabs' free tier has no commercial licence**; the cheapest commercial plan is about $6 a month ([ElevenLabs](https://elevenlabs.io/hi/pricing/api)).

**Sounding human, not robotic.** Three things matter more than the model. First, have the brain write *spoken* text: short sentences, natural fillers ("acha", "dekho", "hmm"), English CS terms kept inside Hindi sentences. Second, read maths aloud correctly. **Speech Rule Engine** (used by MathJax 4) turns formulas into spoken words and has a Hindi locale ([SRE](https://www.github.com/Speech-Rule-Engine/sre-webpages)); English output ("n squared plus one") likely suits Indian CS students better. Add a small pronunciation list for "Dijkstra", "NP-hard" and the like. Third, run a blind listening test with real students. No independent quality scores (MOS) were found for any of the Indian open voices.

**Cloning the founder's voice.** Prototype with Maya 2 Native or Chatterbox from a short clip. For a stable voice, record 30–60 minutes in a quiet room (Hinglish teaching, pure Hindi, Indian English, reading formulas) and fine-tune an Apache or MIT model. *Single-speaker fine-tunes usually need 1–10 hours for top quality, and Orpheus-style models can be LoRA-tuned on 1–3 hours (unverified).* Keep a signed consent note. **Never send the cloned voice weights to the browser**, or anyone could copy the founder's voice.

---

## The brain: Qwen3.5 in the browser for strong devices, a server for the rest

**Qwen3.5 0.8B, 2B, 4B and 9B** came out on 2 March 2026 under Apache-2.0, with a 262K context; at 4-bit, the 0.8B and 2B are each under 2 GB ([Artificial Analysis](https://artificialanalysis.ai/articles/qwen3-5-small-models); [HF Qwen3.5-2B](https://huggingface.co/Qwen/Qwen3.5-2B)). Official browser demos already run all three small sizes with transformers.js and WebGPU, but publish no speed table ([Qwen3.5 WebGPU Space](https://huggingface.co/spaces/webml-community/Qwen3.5-WebGPU)). No head-to-head Hindi test of 0.3B–4B models was found. Evidence suggests **models under 2B are weak in Hindi**, and targeted Hindi training helps a lot ([NVIDIA Hindi suite, arXiv 2508.19831](https://arxiv.org/html/2508.19831v2)). So run English and Hinglish on the device, and send Hindi or other Indian-language tutoring to the server.

**WebGPU now covers most Indian students, with holes.** Chrome on Android 12+ (Qualcomm or ARM graphics) has it, and so does Safari on iOS 26 ([web.dev](https://web.dev/blog/webgpu-supported-major-browsers)). Firefox on Android has it switched off ([caniuse](https://caniuse.com/webgpu)). Speeds vary hugely. Laptops with Apple chips or real graphics cards reach about 40–100 tokens per second ([WebLLM paper](https://arxiv.org/html/2412.15803v1)). **Phone graphics chips in the browser reach only 4–17 tokens per second** ([LlamaWeb, arXiv 2605.20706](https://arxiv.org/html/2605.20706)). Plain CPU gave about 7 tokens per second for a 1.7B model ([webllm-bench](https://github.com/andrecardenas/webllm-bench)).

**iPhones are the trap.** Safari kills the page at about **2 GB of memory even on a 12 GB iPhone 17 Pro** ([Apple forums](https://developer.apple.com/forums/thread/823061)). An iPhone 11 Pro Max said "WebGPU: yes" and still reloaded mid-answer with a 1B model ([report](https://hackernews-dynamic.seasondane.workers.dev/news/48624985)). So "has WebGPU" is not enough. Test the device with a 2–3 second warm-up, and drop it one tier after any crash. Chrome's built-in Gemini Nano is no help here: it is desktop-only, needs 22 GB of free disk and a strong machine, and does not list Hindi ([Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api); [Chrome get started](https://developer.chrome.com/docs/ai/get-started)).

### Browser runtimes

| Runtime | What it is | Best for | Watch out |
|---|---|---|---|
| **transformers.js v4** | Hugging Face's browser engine | Widest model choice; official Qwen3.5 demos | No published phone speeds |
| **WebLLM (MLC)** | Mature browser chat engine | Chat with an OpenAI-style API in a Web Worker | iOS buffer limits (cut to 256 MB) |
| **LlamaWeb (llama.cpp WebGPU)** | Microsoft Research, May 2026 | 54% faster than WebLLM median; works on more iPhones | New research code |
| **wllama** | llama.cpp on CPU (WASM) | No-GPU fallback, Firefox Android | Needs special COOP/COEP headers |
| **LiteRT-LM** | Google, native apps only | A future NexoraGuru app (~52 tok/s on phone GPU) | Not for the website |
| **Chrome Gemini Nano** | Built into Chrome desktop | Optional extra only | No Android, no Hindi |

Sources: [transformers.js v4](https://huggingface.co/blog/transformersjs-v4), [WebKit bug](https://bugs.webkit.org/show_bug.cgi?id=275958), [LlamaWeb](https://arxiv.org/html/2605.20706), [wllama](https://github.com/ngxson/wllama), [LiteRT-LM](https://developers.googleblog.com/en/blazing-fast-on-device-genai-with-litert-lm/).

### Small brain models and licences

| Model | Licence | Good for | Risk |
|---|---|---|---|
| **Qwen3.5 0.8B / 2B / 4B** | Apache-2.0 | Main choice: browser (0.8B–2B), server (2B–4B) | Hindi under 2B is weak (test it) |
| **Granite 4.0 Nano 350M / 1B** | Apache-2.0 | Tiny tasks on low-end devices | Small |
| **Sarvam-30B / 105B** | Apache-2.0 | Server teacher for making training data | Too big for devices |
| **BharatGen Param-1 2.9B** | **Conflict**: MIT vs non-commercial | Hindi-English | Check before use |
| **LFM2 / LFM2.5** (Liquid) | Free only under **US$10M revenue** | — | Future liability |
| **Gemma 3** | Google terms; restrictions must pass to your users | — | Extra legal work |
| **Krutrim** | Commercial use needs a separate deal | — | Avoid |

Sources: [Granite Nano](https://huggingface.co/blog/ibm-granite/granite-4-nano), [Sarvam 30B/105B](https://www.opensourceforu.com/2026/03/sarvam-releases-30b-and-105b-llms-under-apache-2-0/), [Param-1](https://huggingface.co/bharatgenai/Param-1-2.9B-Instruct), [LFM licence](https://docs.liquid.ai/lfm/help/model-license), [Gemma terms](https://ai.google.dev/gemma/terms), [Krutrim licence](https://huggingface.co/krutrim-ai-labs/Chitrarth/blob/main/LICENSE).

**The cheapest server brain is already in your stack.** A free Oracle Ampere A1 server (4 cores, 24 GB) runs a 3B 4-bit model at **about 10.6–15.5 tokens per second, with a 94.5 ms first token** (one blog, few runs) ([quartoblog](https://quartoblog-52a.pages.dev/blog/tech/benchmark%20local%20llm)). NexoraGuru already runs a small coding model on such a server (`deploy/coder-model/`). Here is a useful point (an inference, not a sourced fact): people speak only about 3–4 tokens' worth of words per second. So **a brain at 10 tokens per second can stay ahead of the voice**, as long as the first token arrives fast. The real limit is how many students one free server can serve at once, which nobody has measured.

---

## Hitting one second needs streaming at every step

Every published budget agrees that ears plus end-of-turn detection, the brain's first token, and the mouth's first audio make up **about 80% of the delay** ([Netguru summary](https://www.netguru.com/blog/voice-ai-low-latency-techniques)). Twilio's example adds up like this: network 40 ms, buffering 30 ms, decoding 25 ms, ears 350 ms, brain 375 ms, mouth 100 ms ([Twilio](https://www.twilio.com/en-us/blog/developers/best-practices/guide-core-latency-ai-voice-agents)). That is about 930 ms. A good target is **800 ms voice-to-voice**. Good setups get the brain's first token in 200–400 ms and the first audio in 100–200 ms ([Twig](https://www.twig.so/blog/voice-ai-agents-latency-budget-800ms)).

For NexoraGuru, the researchers estimate **650–1,100 ms** from India (not measured). The breakdown is: end-of-turn 200–300 ms, final transcript 50–150 ms, brain 200–350 ms, first audio 150–250 ms, network 50–100 ms. Under one second is reachable on Wi-Fi. It is tight on mobile data. No one has published a measured Hindi cascade delay from Indian networks.

**Ten tricks that buy the speed.** Keep the servers in India (the Azure India VM). Stream at every step. Use **Silero VAD** in the browser (about 2 MB, under 1 ms per chunk) ([silero-vad](https://raw.githubusercontent.com/snakers4/silero-vad/master/README.md)). Add a "smart turn" model that knows when a sentence is really finished, not just paused. **LiveKit's turn detector supports Hindi** and takes about 25 ms ([LiveKit docs](https://docs.livekit.io/agents/logic/turns/turn-detector)). **Pipecat Smart Turn v3** is BSD-2, 8 MB, 23 languages, about 12 ms on CPU, but Hindi is not confirmed ([Daily](https://www.daily.co/blog/announcing-smart-turn-v3-with-cpu-inference-in-just-12ms/)). Start the brain on the half-finished transcript. Speak the first short phrase while the rest is still being written. Play an instant filler ("Hmm, accha…"). Keep the system prompt short and cached. Let students interrupt ("barge-in"): stop the voice the moment they speak. **Conflict:** one Silero VAD release page shows a non-commercial licence while most sources say MIT; check the real LICENSE file before shipping ([PyPI 6.0.0](https://pypi.org/project/silero-vad/6.0.0/)).

### Voice-agent frameworks

| Framework | Licence | Why it fits | Notes |
|---|---|---|---|
| **LiveKit Agents** | Apache-2.0 *(unverified)* | NexoraGuru already uses LiveKit for Live rooms; Hindi turn detector; Sarvam guide | Strongest fit |
| **Pipecat** | BSD-2 *(unverified)* | Many plugins; Smart Turn; Sarvam production guide | Strong alternative |
| **Kyutai Unmute** | MIT | Any text brain; 16 GB GPU runs all three parts | No Indian voices; good design to copy |
| **Bolna** | MIT | Indian; Hindi sample agent | Built for phone calls; "looking for maintainers" |
| **TEN framework** | Apache-2.0 + extra conditions *(unverified)* | Own VAD and turn models | Check licence |

Sources: [Sarvam LiveKit guide](https://docs.sarvam.ai/api/integration/livekit-production-best-practices.md), [Sarvam Pipecat guide](https://docs.sarvam.ai/api/integration/pipecat-production-guide), [Unmute](https://github.com/kyutai-labs/unmute), [Bolna](https://github.com/bolna-ai/bolna). For reference, Unmute's own numbers are 220 ms from first text to first audio, and about 450–750 ms for the mouth part depending on GPUs ([Kyutai blog](https://kyutai.org/2025/07/03/tts-unmute-open-source.html)).

---

## Three architectures: best quality, best free, and the hybrid to build

### Architecture A — best quality (pays per minute)

Browser (LiveKit WebRTC, echo cancel, Silero VAD) → LiveKit Agents worker in India → **Sarvam Saaras v3 realtime** ears + lesson word list → **Qwen3.5-4B fine-tuned** on the GPU farm (or a bigger Apache model), with RAG over site notes and site tools → **Bulbul v3/V4 Flash** or self-hosted **Maya 2 Native in the founder's voice** → back to the browser. This gives the best Indian-language coverage today. The rough cost with Sarvam APIs is **₹1.5–3.5 per student-minute** (estimate), or ₹90,000–2,10,000 per hour at 1,000 students at once. Hosted Ultravox would be about $3,000 per hour at that scale.

### Architecture B — best free (for a pilot)

Browser VAD and smart-turn → ears: **Groq Whisper free tier** for English and Hinglish, self-hosted **IndicConformer** for pure Indian-language turns → brain: **Qwen3.5 2B in the browser** on strong devices, otherwise the **free Oracle A1 server** with Qwen3.5 2B/4B → mouth: **Maya 2 Native or Indic Parler-TTS** on the existing GPU farm, with **Kokoro or Piper in the browser** as an offline fallback. Licence fees are zero. But **free tiers will not cover 1,000 students at once**, and the GPU farm still costs money to run. Be honest about this. Do not create extra free accounts to stretch limits; that breaks provider terms and NexoraGuru's own rules.

### Architecture C — the hybrid to build (recommended)

The hybrid picks the path per device and per task. Cheap work moves to the browser. Hard work stays on the server. Self-hosted open models are the default, and paid APIs are a backup.

| Device tier | How to detect | Ears | Brain | Mouth |
|---|---|---|---|---|
| **High** (Apple-chip laptop, gaming laptop, flagship Android) | WebGPU + big buffer limits + fast warm-up test | Server (Whisper/IndicConformer); browser Whisper for English commands | **Browser Qwen3.5 2B–4B** (1.2–2.5 GB, Wi-Fi opt-in) for English/Hinglish; server for Indian languages | Server Maya 2 / founder voice |
| **Average** (8 GB laptop, mid-range Android) | WebGPU but slower test | Server | Browser Qwen3.5 0.8B for commands and short hints; server for explanations | Server; Kokoro offline |
| **Low** (budget Android, no WebGPU, iPhone under the 2 GB page limit, Firefox Android) | No WebGPU, or crash flag | Server; Web Speech API fallback with disclosure | **Server only** (Oracle A1 → GPU farm → paid API) | Server; Piper offline |

Tier sizes and speeds are estimates built on the measured ranges above; measure on real phones. Run every browser model in a **Web Worker** so animations never freeze. Download only on opt-in, show the size, save it in the browser's cache, and unload after 2–5 idle minutes.

---

## Controlling the website by voice: small models can call tools well

Small models can learn to press buttons reliably. Salesforce's **1B xLAM model beat GPT-3.5-Turbo and Claude-3 Haiku** on the Berkeley function-calling test in 2024 ([APIGen paper](https://arxiv.org/pdf/2406.18518.pdf)). Its training data is CC-BY-4.0 and gated ([xLAM 60k](https://huggingface.co/datasets/Salesforce/xlam-function-calling-60k)). The design is simple. Define 10–30 site actions, such as `open_lesson`, `play_animation_from_step`, `show_hint`, `search_notes`, `start_test` and `add_to_review`. Train the model on thousands of English, Hindi and Hinglish requests mapped to the right action, including "no action needed" and "not allowed". Then **force the output to match the allowed list** with structured decoding (vLLM guided JSON or llama.cpp grammars), and check every call again on the server. Never let the model trigger anything private on its own.

**Staying on site content.** Facts must come from retrieval, not from training. A peer-reviewed study found that RAG beats fine-tuning for both old and new facts, and that models "struggle to learn new factual information" through fine-tuning ([Ovadia et al., EMNLP 2024](https://aclanthology.org/2024.emnlp-main.15)). For Hindi search, **BGE-M3 scores 47.3 vs 39.9 for mE5** on Hindi-BEIR ([arXiv 2409.05401](https://arxiv.org/html/2409.05401v2)), so use it on the server. Use multilingual-e5-small (MIT, reported) or **EmbeddingGemma 2 (Apache-2.0)** in the browser ([mixed-news](https://mixed-news.com/en/google-embeddinggemma-2-apache-2-0-ungated-gemma-licence-gate)). Mix word search with meaning search, because GATE terms like "LL(1)" need exact matches. For safety, **Qwen3Guard-Gen-0.6B is Apache-2.0** ([Qwen3Guard report](https://arxiv.org/html/2510.14276v1)). Off-topic chat is not a safety issue, though. Handle it with a small intent classifier plus a tutor trained to redirect politely. Track over-refusal too: network attacks and security are in the GATE syllabus.

**Hints, not answers.** This is backed by strong evidence. In a PNAS study of about 1,000 students, an unguarded GPT helper raised practice scores by 48% but left students **17% worse on the real exam**; a guarded tutor raised practice 127% and kept exam scores level ([Bastani et al., PNAS 2025](https://ideas.repec.org/a/nas/journl/v122y2025pe2422633122.html)). A Harvard trial of a course-aligned AI tutor found an effect size of 0.63 and doubled engagement ([Kestin et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260/)). So build a **hint ladder**: nudge, then hint, then a worked step, then the verified solution, and only after the student has tried.

---

## Fine-tuning Qwen3.5 costs almost nothing on free GPUs

**Unsloth has official Qwen3.5 guides and free Colab notebooks.** LoRA needs about **3 GB of GPU memory for 0.8B, 5 GB for 2B, and 10 GB for 4B**, so all three fit on a free T4 ([Unsloth guide](https://unsloth.ai/docs/de/modelle/qwen3.5/fine-tune)). Unsloth advises bf16 LoRA over 4-bit QLoRA for Qwen3.5. A Hindi Whisper-small LoRA trained in **about 35 minutes on a free Colab T4** and cut errors by about 30% (on a tiny 30-clip test) ([model card](https://huggingface.co/manishehehe/whisper-small-hindi-lora)).

### Training methods

| Method | What it does | Use it for |
|---|---|---|
| **SFT with LoRA** | Shows the model good example chats | Tutor style, using retrieved notes, tool calls |
| **RAFT-style data** | Each example includes the retrieved notes plus some wrong ones | Staying faithful to site content *(method from background knowledge)* |
| **DPO / ORPO** | Shows "good vs bad" answer pairs | Hint instead of leaking the answer; polite refusals |
| **GRPO** | Rewards the model by rules a computer can check | Valid tool calls; no answer in hint mode |
| **Distillation** | A big open "teacher" writes training data | Making Hinglish and Indian-language dialogues from your notes |
| **Multi-LoRA** | One base model, many add-ons | Separate tutor, router and language add-ons on one GPU *(vLLM, unverified)* |

*Estimates (unverified): 5k–30k good examples shape behaviour; 2k–10k pairs for DPO; one epoch takes about 1–4 hours on a T4 for 0.8B–2B and 4–10 hours for 4B.*

**Shrink with care.** 4-bit compression hurts small models most. An IJCAI 2025 study found "significant accuracy drops" in smaller models, with AWQ beating GPTQ ([IJCAI 2025](https://www.ijcai.org/proceedings/2025/0902.pdf)). A 2026 study warns that models of about 2B or less "should be assumed to lose definitional knowledge" below Q4, even while they sound fluent ([arXiv 2610.04403](https://arxiv.org/pdf/2610.04403)). Ship Q5–Q8 for 0.8B–2B, and run every test on the compressed file you actually ship.

**Testing.** Define ">90% good" per skill. Most checks need no judge model: exact tool match, answer match against the official GATE key, and whether the final answer leaked in hint mode (target under 5%). Use an open judge only for faithfulness and language quality, and check it against human labels.

### Compute and credits

| Source | What you get | Fit |
|---|---|---|
| **Kaggle** | ~30 GPU-hours/week, 2×T4 or P100; 12 h sessions (third-party figures) | Main free training box |
| **Colab free** | T4, limits not published | Quick tests |
| **Modal** | $30/month free credits | Short A100/H100 bursts |
| **Lightning AI** | **Conflict**: 22 h/month, 30 one-time credits, or 50 h | Unreliable |
| **HF ZeroGPU** | 40 min/day on PRO (older docs: 25) | Demos only |
| **IndiaAI Compute Portal** | ~₹65–92/GPU-hour subsidised; H100 ~₹140/h; up to 40% subsidy | Big teacher runs, if eligible |
| **Google for Startups (AI)** | Up to $350k, mostly VC-backed | Unlikely now |
| **AWS Activate Founders** | Up to $5k | Realistic for bootstrapped |
| **Sarvam startup programme** | 6–12 months of API credits | Free Sarvam for a while |

Sources: [Kaggle/aimultiple](https://aimultiple.com/free-cloud-gpu), [Colab FAQ](https://research.google.com/colaboratory/faq.html), [Modal](https://modal.com/pricing), [Lightning tracker](https://pricingsaas.com/companies/lightning/diffs/2026W46), [ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu), [IndiaAI](https://business-standard.com/technology/artificial-intelligence/india-ai-compute-race-subsidised-gpu-capability-gap-126062900734_1.html), [Google](https://cloud.google.com/startup/ai), [AWS](https://fin.ai/learn/startup-credit-programs), [Sarvam programme](https://www.business-standard.com/companies/start-ups/sarvam-ai-launches-startup-programme-to-back-ai-builders-in-india-details-126030501111_1.html). One guide says IndiaAI startup access needs DPIIT recognition plus ₹50 lakh revenue or ₹1 crore funding ([productgrowth.in](https://productgrowth.in/insights/ai-ml/indiaai-compute-portal-startup-gpu-access/)). NexoraGuru may not qualify yet; student and researcher categories also exist.

### Indian datasets

| Dataset | Size | Use | Licence |
|---|---|---|---|
| **IndicVoices** | 7,348 h, 22 languages (**conflict**: later article says 12,000 h) | Train/test ears | CC BY 4.0, gated |
| **IndicVoices-R** | 1,704 h, 22 languages | Train voices | CC BY 4.0 |
| **Lahaja** | 12.5 h Hindi, 132 speakers | Test Hindi accents | CC BY 4.0 |
| **Svarah** | 9.6 h Indian English | Test Indian English | CC BY 4.0 |
| **Rasa** | Expressive speech | Emotional voices | CC BY 4.0, gated |
| **Sangraha** | Large text corpus | Indian text | CC BY 4.0 |
| **IndicTrans2** | Translation, 22 languages | Translate notes | Models MIT, data CC0 |
| **COMI-LINGUA** | 376K Hinglish text items | Hinglish text | CC BY 4.0 |
| **xLAM function-calling 60k** | 60k tool calls | Tool training | CC-BY-4.0, gated |
| Kathbath, Shrutilipi | ~1,684 h / ~6,400 h *(unverified)* | Ears | CC BY *(unverified)* |

Sources: [IndicVoices](https://arxiv.org/html/2403.01926v1), [IndiaAI article](https://indiaai.gov.in/article/iit-madras-ai4bharat-and-sarvam-ai-launch-indicvoices-a-milestone-in-indian-speech-recognition), [IndicVoices-R](https://ai4bharat.iitm.ac.in/indicvoices_r), [Lahaja](https://huggingface.co/datasets/ai4bharat/Lahaja), [Svarah](https://huggingface.co/datasets/ai4bharat/Svarah/blame/main/README.md), [Rasa](https://huggingface.co/datasets/ai4bharat/Rasa), [Sangraha](https://huggingface.co/datasets/ai4bharat/sangraha/blob/610d52914a15ec47414064d5a081874b9b14c26d/README.md), [IndicTrans2](https://aikosh.indiaai.gov.in/home/models/details/indic_trans2.html), [COMI-LINGUA](https://arxiv.org/pdf/2503.21670v3). CC BY means you must credit AI4Bharat, for example on a Credits page. **No spoken Hinglish CS dataset exists.** NexoraGuru's own recorded GATE speech would be unique.

---

## Six things NexoraGuru could own

No surveyed competitor was found doing these. Global "study modes" (ChatGPT Study Mode, Gemini Guided Learning) are free but general, not exam-specific, and do not drive a learning site ([TechCrunch](https://techcrunch.com/2025/08/06/google-takes-on-chatgpts-study-mode-with-new-guided-learning-tool-in-gemini/)); one review found Gemini drifting off-topic ([Digit](https://www.digit.in/features/general/googles-guided-learning-versus-chatgpts-study-mode-which-is-better.html)). **PhysicsWallah** leads Indian voice tutoring, with **3 million+ voice queries in a month** and Hinglish voice answers made with ElevenLabs ([Business Today](https://www.businesstoday.in/technology/story/why-physicswallah-believes-it-can-beat-openai-google-in-indias-ai-tutor-race-534212-2026-06-01); [ElevenLabs](https://elevenlabs.io/hi/blog/physicswallah)). But it focuses on school, JEE and NEET, and nothing shows it controlling the app by voice. Demand for CS in mother tongues is real: VIT Vellore is dubbing 220 BTech courses into Indian languages with Sarvam ([Careers360](https://news.careers360.com/vit-vellore-institute-of-technology-b-tech-courses-sarvam-ai-translation-hindi-tamil-telugu-mother-tongue-engineering-students/amp)). The ideas below are the researchers' proposals, not proven products.

| Idea | What the student does | Why it is hard to copy |
|---|---|---|
| **1. Voice-driven animations** | "Pause. Go back one step. Why did the pointer move?" The tutor narrates each `t.step` note in the student's language. | Needs NexoraGuru's own step-tagged animation engine |
| **2. Verified-answer grounding** | The tutor only explains NexoraGuru's checked GATE solutions, and never leaks the answer before an attempt | Needs a verified answer bank |
| **3. Lesson-aware ears** | The current lesson's terms feed the ears, so "Dijkstra" and "pumping lemma" come out right | Needs knowing exactly where the student is |
| **4. Site control by voice** | "Open last week's mistakes." "Start a 30-minute OS test." | Needs a tool list tied to the site |
| **5. Low-data mode** | Short commands and offline voice run in the browser; reasoning on the server | Helps students on weak mobile data |
| **6. Viva mode (explain-back)** | The student explains a concept aloud; the tutor checks it | Fights the overconfidence found by Bastani et al. |

Two further ideas come from this synthesis. First, **pre-record the founder's AI voice for every verified solution and every animation step once**, then serve those files from cache. That makes the most common answers instant and nearly free at playback. Second, a **spoken Hinglish GATE test set** (for example 200 recorded questions) would be the first of its kind and would let you prove your ears beat everyone else's on CS words.

---

## Legal, licence and ethics risks

**India's 2026 rules on AI audio.** The IT (Intermediary) Amendment Rules 2026 were notified on 10 February 2026 and took effect on 20 February 2026. They define "synthetically generated information", including audio made to seem real. Such content must be **clearly labelled**, intermediaries must verify declarations with technical tools, and takedown windows are short: 3 hours in general, and **2 hours for impersonation per some sources** ([Business Today](https://www.businesstoday.in/technology/story/govt-tightens-rules-on-ai-generated-content-mandates-labels-and-faster-takedowns-515505-2026-02-10); [Nishith Desai](https://www.nishithdesai.com/research-and-articles/hotline/technology-law-analysis/deepfakes-disclosure-and-due-diligence-unpacking-indias-sgi-amendments-15532); [Freshfields](https://technologyquotient.freshfields.com/post/102mjwn/india-targets-deepfakes-and-ai-generated-content-key-changes-under-meitys-2026)). **Unverified:** whether these rules apply to an educational site, as opposed to a social platform, was not checked against the Gazette text. The safe default is to label every AI voice ("AI voice of the founder, generated"), and add an audio watermark. Chatterbox watermarks every output ([Resemble](https://www.resemble.ai/resources/chatterbox-multilingual-v3-tts-with-embedded-watermarking-for-25-languages)). *India's DPDP Act likely treats a voiceprint as personal data (unverified)*, so keep consent records and do not store student voices longer than needed.

**Using closed-model outputs to train.** This is the biggest legal trap for the "own fine-tuned model" plan. **OpenAI** bars using output "to develop models that compete" ([OpenAI terms](https://www.openai.com/policies/terms-of-use/); [Business terms](https://openai.com/policies/business-terms)). **Anthropic** bars training competing AI models ([Anthropic terms](https://www.anthropic.com/legal/commercial-terms)). **Gemini** bars developing competing models ([Gemini terms](https://ai.google.dev/gemini-api/terms)). **Sarvam's EULA** also forbids using its output to train competing models ([Sarvam EULA](https://www.sarvam.ai/eula)). That last one matters: do not use Sarvam transcripts as labels for your own ears, or Bulbul audio to train your own voice. The safe teachers are open models whose licences allow it. **DeepSeek-R1 is MIT and explicitly allows distillation from both weights and API outputs** ([DeepSeek](https://api-docs.deepseek.com/news/news250120)). Qwen and Sarvam-30B/105B are Apache-2.0. Best of all is NexoraGuru's own verified notes and solutions, with teachers only rewriting them into dialogues. Using a closed model only as a judge, never as training data, is lower risk, but still check each provider's terms. A lawyer should confirm before any commercial release.

**Licence checklist.**

| Risk | Detail | Action |
|---|---|---|
| Non-commercial models | XTTS-v2, F5-TTS base weights, *MMS-1B (unverified)*, *Spark-TTS and Fish Speech (unverified)* | Do not use |
| Revenue cap | LFM (Liquid) free only under US$10M revenue | Avoid for the long term |
| Flow-down terms | Gemma's prohibited-use policy must go into your own terms | Prefer Apache models |
| Conflicting labels | BharatGen Param-1 (MIT vs non-commercial), Moonshine non-English, Silero VAD release page | Read the actual LICENSE file |
| Gated downloads | IndicConformer, IndicVoices, Rasa, xLAM need click-through | Read the gate terms |
| "See component licenses" | Maya 2 Native bundles parts | Check each part |
| Free-tier output rights | Azure (conflict), ElevenLabs free (no commercial use) | Use paid tiers or self-host |
| Privacy | Chrome Web Speech sends audio to Google; free LLM tiers may train on prompts | Disclose; strip names and emails |
| Account stacking | Several free accounts per person breaks terms | Never do it |

**Ethics.** The Bastani study shows that a tutor that hands out answers harms learning while making students feel confident. So the hint ladder is an ethical rule, not just a feature. A voice that sounds exactly like the founder can mislead students into trusting a wrong answer. Ground every answer in verified content and say when the tutor is unsure. Keep the founder's cloned voice private on the server, and keep a plan for fast takedown if it is ever misused. No trial has yet tested voice-based or Indian-language AI tutoring, so measure learning, not just usage.

---

## A phased plan from pilot to own models

| Phase | Time (estimate) | What to build | Cost | Done when |
|---|---|---|---|---|
| **0. Measure** | 2 weeks | Record a 200-clip Hinglish GATE test set (with consent). Measure Groq Whisper, IndicConformer and Sarvam on it. Blind voice test of Maya 2, Indic Parler, svara, Bulbul with students. Time each step from the Azure India VM. Check every licence file. | ~₹0 (free tiers, Sarvam credits) | You know your real error rates and delays |
| **1. Voice commands** | 4–6 weeks | LiveKit Agents worker; browser VAD + Hindi turn detector; 10–30 site tools with strict checks; voice-driven animation controls; Web Speech fallback with disclosure | Free tiers + Oracle A1 | "Open Dijkstra, play from step 4" works in under 1 s on Wi-Fi |
| **2. Grounded tutor** | 6–8 weeks | RAG over notes and verified solutions (BGE-M3 + word search); hint ladder; intent router + Qwen3Guard; pre-recorded founder-voice audio for solutions and steps; AI-voice labels | GPU farm for TTS | Hint leaks under 5%; facts match the key |
| **3. Own models** | 2–3 months | LoRA-tune Qwen3.5 2B/4B on Kaggle with DeepSeek/Qwen-made data from your notes; DPO for hints; tune Whisper-turbo on your speech; fine-tune the founder voice; test Shuka/Ultravox | Kaggle + Modal + maybe IndiaAI | Your model beats the base on every test, *after* compression |
| **4. Device tiers** | 1–2 months | Browser Qwen3.5 0.8B–2B in a Web Worker for high/average tiers; device warm-up test and crash fallback; Kokoro/Piper offline voice; viva mode | ~₹0 extra | Low-end phones never crash; strong devices cut server load |
| **5. Scale** | Ongoing | Load-test GPUs; multi-LoRA serving; apply for startup credits; paid fallback only for overflow | Grows with usage | Cost per student-minute is known and budgeted |

---

## What the research could not settle

The biggest open questions are practical, and only your own tests can answer them. There is **no measured end-to-end delay for a Hindi voice chain from Indian networks**. No one has published how many students one GPU can serve with these Indian voice models. No independent quality scores exist for Maya 2, Veena, svara or Indic Parler. No 2026 head-to-head test compares IndicConformer, Whisper-turbo and Sarvam on Hinglish. No reliable Qwen3.5 speed or Hindi score exists for phones in the browser. Bhashini's real terms, Sarvam's true free credit (₹100 or ₹1,000), and whether the 2026 IT Rules cover an education site all need direct checks.

## Conclusion

The winning move is not a better model but a better **fit**. Big labs have stronger brains, and Sarvam has strong Indian ears and voices. None of them knows which animation step a student is on, which GATE answer is verified, or when to hold back an answer. A cascade lets NexoraGuru plug that site knowledge into every step: lesson words into the ears, verified notes into the brain, site actions as tools, and a trusted voice at the end. Open Indian parts arrived in 2026 at the right moment, so the whole stack can be built without licence fees.

The honest cost picture shapes the plan. Running is cheap per student, but not free at scale. The real lever is to **cut how often the expensive path runs**: cache pre-recorded answers, move commands and VAD to the browser, use small fine-tuned models, and keep paid APIs for overflow. The most valuable asset will be data no one else has: spoken Hinglish GATE questions, verified hint ladders, and records of how students actually talk about CS. Start collecting it in phase 0, with consent, and the moat grows every week.
