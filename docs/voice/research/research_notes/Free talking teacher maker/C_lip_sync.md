# C. Free, commercially-licensed lip sync and facial animation for browser 3D avatars (VRM aa/ih/ou/ee/oh, ARKit-52)

Researched 2026-11-24. Some hosts could not be reached from the research machine (www.nvidia.com was blocked), so the NVIDIA licence findings below come from search snippets, Hugging Face cards and secondary copies. Flagged where that applies.

## 1. TTS-driven visemes: HeadTTS + Kokoro, and TalkingHead's lip-sync modules

### Takeaway
When we have the text (our own TTS), HeadTTS is the best free option. It is MIT and gives exact phoneme-level viseme timings from a timestamped Kokoro model, in the 15 Oculus visemes. It covers English (en-us) only. TalkingHead's rule-based `lipsync-xx` modules are the fallback for other TTS engines, but they have no real coarticulation model and only approximate timing (word timestamps scaled to the word).

### Cited Findings
- **HeadTTS licence:** MIT. Its dependencies are MIT (ws), Apache-2.0 (transformers.js, ONNX Runtime, the Kokoro model), simplified BSD (the CMU dictionary) and CC BY 4.0 (the Finnish compound dictionary). It deliberately avoids eSpeak and other GPL modules. — [HeadTTS](https://github.com/met4citizen/HeadTTS)
- **HeadTTS output:** WAV or raw PCM16 audio, plus word start times and durations, viseme IDs with start times and durations, and the phonemes behind each viseme. — [HeadTTS](https://github.com/met4citizen/HeadTTS)
- **Viseme set:** the Oculus 15: aa, E, I, O, U, PP, SS, TH, CH, FF, kk, nn, RR, DD, sil. — [HeadTTS](https://github.com/met4citizen/HeadTTS)
- **Timing:** a timestamped variant of Kokoro gives phoneme-level timing. Viseme start and end are shifted by configurable offsets, by default −10 ms at the start and +10 ms at the end. — [HeadTTS](https://github.com/met4citizen/HeadTTS)
- **Languages:** only en-us is fully supported. Pronunciation comes from a CMU dictionary converted to Misaki phonemes. Words outside the dictionary use the 1976 NRL letter-to-sound rules. "fi" works only with English voices, and its pronunciation is poor. — [HeadTTS](https://github.com/met4citizen/HeadTTS)
- **Speed (the author's own unofficial tests, MacBook Air M2):**
  - Chrome with WebGPU/fp32: real-time factor (RTF) 0.23, about 718 ms to the first byte.
  - WASM/q4: RTF about 1.5, which is slower than real time.
  - Node server, WebGPU, two threads: RTF 0.15.
  - WebGPU is about 5× faster than WASM. Kokoro-82M loads slowly at first and uses a lot of memory.
  - — [HeadTTS](https://github.com/met4citizen/HeadTTS)
- **TalkingHead visemes and rig:** it uses the same 15 Oculus visemes as blend shapes. The avatar needs a Mixamo-compatible rig plus the 52 ARKit blend shapes and the 15 visemes. VRM is not loaded natively; a Blender workflow converts VRoid/VRM models. Library MIT; some example avatars are non-commercial. — [TalkingHead](https://github.com/met4citizen/TalkingHead)
- **TalkingHead language modules:**
  - The README lists built-in lip sync for English, German, French, Brazilian Portuguese, Finnish, Lithuanian and Bengali.
  - Default `lipsyncModules` is ["en","fi","lt"].
  - A module implements `preProcessText` and `wordsToVisemes`. It returns visemes with relative times, which are scaled to the TTS word timestamps.
  - `ttsTrimStart` (default 0 ms) and `ttsTrimEnd` (default 400 ms) adjust the timing.
  - Streaming `lipsyncType` can be visemes, blendshapes or words.
  - — [TalkingHead](https://github.com/met4citizen/TalkingHead)
- **How the English module works:**
  - It uses NRL Report 7948 (1976) letter-to-sound rules.
  - Relative viseme durations: aa 0.95, E 0.90, I 0.92, O 0.96, U 0.95, PP 1.08, SS 1.23, TH 1, DD 1.05, FF 1.00, kk 1.21, nn 0.88, RR 0.88. A TODO in the code says these values are not yet checked against English statistics.
  - There is no real coarticulation. A repeated viseme is merged into the previous one at 0.7× its duration.
  - Pauses: comma 3, space 1, dash and apostrophe 0.5. They are timing gaps, not `sil` entries.
  - — [lipsync-en.mjs](https://raw.githubusercontent.com/met4citizen/TalkingHead/main/modules/lipsync-en.mjs)
- **Speaking behaviour:** `avatarSpeakingEyeContact` and `avatarSpeakingHeadMove` both default to 0.5. The example "talking" mood uses blinks on random delays and head rotation. — [TalkingHead](https://github.com/met4citizen/TalkingHead)
- **Visemes differ by language:** Microsoft's 22-viseme scheme notes that visemes vary by language and locale, and that visemes do not map one-to-one to phonemes. — [Microsoft Learn](https://learn.microsoft.com/azure/ai-services/speech-service/how-to-speech-synthesis-viseme)

### Inferences
- **Oculus 15 → VRM 5** (our proposal; no published source found):

  | Oculus visemes | VRM expressions |
  |---|---|
  | aa | aa |
  | E | ee |
  | I | ih |
  | O | oh |
  | U, and partly RR and CH (rounding) | ou |
  | PP | all five at 0 (lips shut) |
  | FF | small ih |
  | SS, DD, TH, nn, kk | small ih or ee with a small aa (jaw just open) |
  | sil | 0 |

  VRM has no closed-lip or teeth-on-lip shape, so a VRM-only avatar cannot show PP/FF/TH properly. Adding custom expressions, or ARKit-52 (mouthClose, mouthPressLeft/Right, mouthRollLower/Upper, mouthFunnel, mouthPucker, jawOpen), is needed for near-perfect bilabials.
- **Oculus 15 → ARKit** (also a proposal):

  | Oculus viseme | ARKit blendshapes |
  |---|---|
  | PP | mouthClose + mouthPress + mouthRollLower |
  | FF | mouthRollLower + mouthUpperUp |
  | U, O | mouthFunnel / mouthPucker + jawOpen |
  | aa | jawOpen high |
  | E, I | mouthStretch / mouthSmile with low jawOpen |
  | CH | mouthFunnel + mouthShrug |

  TalkingHead requires both sets on the avatar, so a ready-made ARKit+Oculus avatar avoids doing this mapping at run time.
- Because HeadTTS's timings come from the TTS model itself, they should be more exact than any audio analysis. This is the "exact lips" path for TTS speech.

### Gaps
- No published accuracy figures (frame-level viseme error) for HeadTTS or TalkingHead.
- No HeadTTS support for Hindi. Kokoro has a Hindi voice, but HeadTTS lists en-us only.

## 2. Audio-driven models (needed for cloned-voice audio): sizes, speed, quality, licences

### Takeaway
For arbitrary audio, two options are both free and commercially licensed and run on CPU:
- **wav2arkit_cpu** (Apache-2.0, ARKit-52 at 30 fps). The real download is about 404 MB, and the page reports about 45 ms of inference per second of audio.
- **HeadAudio** (MIT, a 14 kB MFCC/Gaussian classifier in an AudioWorklet, Oculus-15 visemes). Tiny and instant, but noticeably less accurate.

Other options:
- **NVIDIA Audio2Face-3D:** the SDK is MIT and the weights are under the NVIDIA Open Model License, which allows commercial use. It needs an NVIDIA GPU with CUDA/TensorRT, so it does not suit a free CPU server or a browser.
- **EmoTalk:** CC BY-NC, so excluded.
- **FaceFormer and UniTalker:** the code is permissive, but they output mesh vertices and are trained on research datasets of unclear licence. Treat them as unclear and excluded.

### Cited Findings
- **wav2arkit_cpu:**
  - Apache-2.0, built on facebook/wav2vec2-base-960h and 3DAIGC/LAM_audio2exp.
  - Input: 16 kHz mono float32. Output: [batch, frames, 52] in the range 0–1, at 30 fps.
  - About 45 ms of CPU inference per second of audio (about 22× real time).
  - An identity encoder supports 12 speakers, and this export has ID 11 fixed.
  - No accuracy benchmarks are given. The page mentions onnxruntime-web, but its example uses onnxruntime-node.
  - — [HF card](https://huggingface.co/myned-ai/wav2arkit_cpu)
- **wav2arkit_cpu real size:** wav2arkit_cpu.onnx is 1.86 MB, but wav2arkit_cpu.onnx.data is 402 MB (404 MB in total). The "1.8 MB" on the card is misleading. — [HF files](https://huggingface.co/myned-ai/wav2arkit_cpu/tree/main)
- **Smaller versions:** the model tree lists two quantized variants and one finetune of LAM_audio2exp (not of wav2arkit_cpu). Their sizes and quality were not given. — [HF wav2arkit_cpu](https://huggingface.co/myned-ai/wav2arkit_cpu); [HF LAM_audio2exp](https://huggingface.co/3DAIGC/LAM_audio2exp)
- **LAM_Audio2Expression:**
  - The GitHub code is Apache-2.0, and the HF weights card says Apache-2.0.
  - It maps audio (Wav2Vec encoder) to ARKit blendshapes adapted to FLAME topology, and is described as real-time.
  - No latency figures are given. It needs Python 3.10 and CUDA for the reference code.
  - Demos: a Gradio app with WebGL and a ModelScope Space.
  - — [GitHub](https://github.com/aigc3d/LAM_Audio2Expression); [HF](https://huggingface.co/3DAIGC/LAM_audio2exp)
- **wav2arkit in the browser (secondary source, 2026-10-02):** gsplat-talkinghead (MIT, React) runs wav2arkit_cpu in the browser through onnxruntime-web with no server. myned-ai/interactive-website-navigator runs it server-side on CPU (FastAPI + ONNX Runtime). — [Radiance Fields article](https://radiancefields.com/gsplat-talkinghead-brings-lip-synced-gaussian-splat-avatars-to-ai-voice-agents); [repo](https://github.qingwei-s.workers.dev/myned-ai/interactive-website-navigator)
- **HeadAudio:**
  - MIT, no dependencies.
  - Method: MFCC (12 coefficients plus log-energy), Mahalanobis distance to Gaussian prototypes per viseme, and an energy-gate VAD.
  - Output: the 15 Oculus visemes as values 0–1. Model about 14 kB. Per-block work is under 0.1 ms.
  - About 50 ms end-to-end latency. The author suggests delaying the audio by 50–100 ms (a DelayNode of about 0.1 s) to match.
  - Trained on 4 HeadTTS voices × about 10 minutes of Harvard Sentences.
  - Accuracy is "far from optimal" at low signal-to-noise ratio and below text-driven TalkingHead.
  - Tested on desktop Chrome, Edge, Firefox and Safari, and on iPad/iPhone.
  - — [HeadAudio](https://github.com/met4citizen/HeadAudio)
- **HeadAudio smoothing defaults:**
  - `visemeMinMs` 120 and `visemeRampMs` 100; `visemeEasingSharpness` 5.
  - `visemeMaxs` 0.65 (0.75 for PP and FF).
  - VAD gate −40/−50 dB (−40/−60 in the example) with 10 ms holds.
  - — [HeadAudio](https://github.com/met4citizen/HeadAudio)
- **wLipSync:** MIT. A WASM/AudioWorklet port of uLipSync's MFCC lip sync that needs HTTPS. It needs a profile calibrated in Unity with uLipSync (no in-browser calibration tool). — [wLipSync](https://github.com/mrxz/wLipSync)
- **uLipSync:**
  - MIT. Compares MFCCs to a calibrated per-voice profile; "basically AIUEO is fine", plus a breath/noise phoneme.
  - Has a "Smoothness" setting and a log-scale Volume Min/Max.
  - Supports VRM 0.x and VRM 1.0 expressions directly.
  - Recommends calibrating with the actual voice in a quiet room.
  - — [uLipSync](https://github.com/hecomi/uLipSync)
- **Rhubarb Lip Sync:**
  - MIT. Bundled parts are BSD, MIT and Boost-licensed (PocketSphinx and the CMU acoustic model are BSD variants). Output data belongs to the user.
  - — [LICENSE.md](https://raw.githubusercontent.com/DanielSWolf/rhubarb-lip-sync/master/LICENSE.md)
  - Mouth shapes: A–F plus G, H and X (Preston Blair style; A is closed for P/B/M, F is puckered for UW/OW/W, G is F/V).
  - Recognizers: PocketSphinx (English only) or a language-independent "phonetic" mode (less precise). An optional transcript improves results.
  - It is an offline command-line tool; the README gives no real-time figures.
  - — [GitHub](https://github.com/DanielSWolf/rhubarb-lip-sync)
- **NVIDIA Audio2Face-3D (v3.0, about 180M parameters):**
  - Weights under the NVIDIA Open Model License; the card says it is "ready for commercial/non-commercial use".
  - Optimised for NVIDIA GPUs with TensorRT. No CPU requirements are listed.
  - Output: a 2D float array for skin, tongue, jaw and eyes, combined with an emotion label through a diffusion mechanism.
  - — [HF card](https://huggingface.co/nvidia/Audio2Face-3D-v3.0)
- **Audio2Face-3D SDK:**
  - MIT. Requires CUDA 12.8+ and TensorRT 10.13+, 4 GB+ GPU memory recommended. No CPU path is described and no ONNX export is mentioned.
  - "Faster than 60 FPS". Samples output vertex positions.
  - Audio2Emotion models are gated with their own licence.
  - — [SDK](https://github.com/NVIDIA/Audio2Face-3D-SDK)
- **NVIDIA Open Model License (from search snippets; www.nvidia.com was blocked here):**
  - Grants a perpetual, worldwide, royalty-free licence to reproduce, make derivatives of, sublicense and distribute, with notices kept.
  - Rights terminate automatically if a model guardrail is removed without a substantially similar replacement.
  - Incorporates NVIDIA's Trustworthy AI terms.
  - Search summaries also say build.nvidia.com bars emotion recognition and NGC says it may not be used outside the Audio2Face project. These are unverified.
  - — [NVIDIA Open Model Agreement 2026-04-02 PDF](https://www.nvidia.com/content/dam/en-zz/Solutions/license-agreements/enterprise-services/nvidia-open-model-agreement-2026-04-02.pdf); [scancode copy, 2025 version](https://scancode-licensedb.aboutcode.org/nvidia-open-model-2025.LICENSE)
  - Conflict: the HF card lists "emotion detection and affective computing" among intended uses, which contradicts the snippet saying emotion recognition is barred. — [HF card](https://huggingface.co/nvidia/Audio2Face-3D-v3.0)
- **Audio2Face in the browser:** an NVIDIA forum post describes streaming Audio2Face-3D from a server onto a rig in a browser tab. The GPU stays on the server. — [NVIDIA forum](https://forums.developer.nvidia.com/t/a-digital-human-in-a-browser-tab-streaming-audio2face-3d-onto-whatever-rig-the-visitor-brought/383953)
- **OVRLipSync:**
  - Distributed under the Oculus Audio SDK licence, which allows use and redistribution, but modifications must be shared with Oculus and the licence passed on.
  - Meta says the Lipsync plugin is end-of-life; the Movement SDK replaces it.
  - It is a native/Unity/Unreal plugin, not a web library.
  - — [Oculus Audio SDK License](https://developers.meta.com/horizon/licenses/audio-3.3/); [Meta docs](https://developers.meta.com/horizon/documentation/unity/audio-ovrlipsync-unity/)
- **EmoTalk:** CC BY-NC 4.0, with commercial licensing by contacting the authors. Excluded. — [EmoTalk_release](https://github.com/psyai-net/EmoTalk_release)
- **FaceFormer:** the code is MIT. Pretrained biwi.pth and vocaset.pth have no stated licence, and they are trained on VOCASET and BIWI, which you must request from their hosts. Output is mesh vertices. — [FaceFormer](https://github.com/EvelynFan/FaceFormer)
- **UniTalker:** the code is Apache-2.0. The checkpoints have no stated licence. It needs FLAME and trains on BIWI, VOCASET, meshtalk, HDTF, RAVDESS, FaceForensics++ and others. — [UniTalker](https://github.com/X-niper/UniTalker)
- **AnimaSync:** a Rust/WASM in-browser lip-sync project advertised with a "30-day free trial", so it is not free. — [AnimaSync](https://goodganglabs.github.io/AnimaSync/)

### Inferences
Ranking for our use (free, commercial, browser or CPU):

| Rank | Method | When to use | Quality | Latency | Licence |
|---|---|---|---|---|---|
| 1 | HeadTTS timings | Our own TTS, English | Best (exact timings from the TTS) | About 0 extra | MIT |
| 2 | wav2arkit_cpu (ONNX) | Cloned-voice or any audio | Learned coarticulation, full ARKit-52 incl. jaw, lips and cheeks; likely best audio-driven quality | About 45 ms per second of audio on CPU, but a 400 MB download | Apache-2.0 |
| 3 | HeadAudio | Any audio, live (instant) | Fair | About 50 ms | MIT |
| 4 | wLipSync / uLipSync | When a voice-specific profile can be made | Vowels only, good once calibrated to that voice | Real time | MIT |
| 5 | Rhubarb | Offline pre-baking | Cartoon-level, 9 shapes | Offline | MIT |

- wav2arkit_cpu: the 400 MB download is too heavy for most phones. Running it on our free CPU server (Oracle/Azure VM) in chunks, then streaming the blendshape frames with the audio, fits "free server". The browser is realistic only on desktop and after a one-time cached download.
- For cloned voices whose transcript we know (we produced the text), there is a hybrid: force-align the transcript to the cloned audio, then use HeadTTS-style viseme rules. Combine with HeadAudio or wav2arkit for amplitude. We found no ready-made free browser forced aligner in this research.
- Audio2Face-3D is legally usable but practically excluded, because it needs an NVIDIA GPU. A free Kaggle or Colab GPU is not a production server, and the guardrail and "Audio2Face project only" terms need a lawyer's reading.

### Gaps
- No public accuracy benchmark compares wav2arkit_cpu, HeadAudio, uLipSync and Rhubarb.
- The size and quality of the quantized LAM_audio2exp variants were not found.
- We did not measure wav2arkit_cpu's speed in onnxruntime-web (WASM/WebGPU); only the CPU figure on the card exists.
- We did not check the licences of the HuBERT-BiLSTM "ai-speak-lipsync", OpenFaceFX, SelfTalk or Meta's Movement SDK, which ran out of research budget. Treat them as unverified.
- The full text of the NVIDIA Open Model License could not be fetched (host blocked).

## 3. Which approach works for arbitrary (cloned-voice) audio in real time, in a browser, on CPU, on a free server?

### Takeaway
- In real time in any browser, including phones, only the MFCC methods (HeadAudio, wLipSync) work. They are tiny and run in an AudioWorklet with about 50 ms latency, but their quality is lower.
- For the best quality on cloned audio, run wav2arkit_cpu (Apache-2.0) on CPU, either on the free server or on desktop browsers via onnxruntime-web, and buffer about 0.1–0.3 s ahead.

### Cited Findings
- HeadAudio runs in an AudioWorklet in desktop Chrome, Edge, Firefox and Safari and on iPad/iPhone, with about 50 ms latency and a 14 kB model. — [HeadAudio](https://github.com/met4citizen/HeadAudio)
- wav2arkit_cpu runs at about 22× real time on CPU, with a 404 MB download. — [HF card](https://huggingface.co/myned-ai/wav2arkit_cpu); [HF files](https://huggingface.co/myned-ai/wav2arkit_cpu/tree/main)
- wav2arkit_cpu has been run fully in the browser via onnxruntime-web (gsplat-talkinghead) and server-side on CPU (interactive-website-navigator). — [Radiance Fields](https://radiancefields.com/gsplat-talkinghead-brings-lip-synced-gaussian-splat-avatars-to-ai-voice-agents)
- Audio2Face-3D needs an NVIDIA GPU with CUDA and TensorRT. — [SDK](https://github.com/NVIDIA/Audio2Face-3D-SDK)

### Inferences
- Since TTS or cloned audio is generated before playback, "real time" just means a small look-ahead buffer. Holding the audio back by the analysis time (about 100 ms, as HeadAudio advises) gives sync with no visible lag.
- A sensible tier plan:
  - phone: HeadAudio
  - desktop with a cached model: wav2arkit_cpu in onnxruntime-web
  - fallback: wav2arkit_cpu on the server, streamed as 52 × 30 fps frames (small JSON or binary)
  - our own English TTS: HeadTTS timings

### Gaps
- No measured onnxruntime-web WASM/WebGPU speed for wav2arkit_cpu on phones.
- Whether a cloned-voice timbre (different from the 4 Kokoro voices HeadAudio was trained on) lowers HeadAudio's accuracy is untested; retraining from new voices is supported.

## 4. Best practices for near-perfect lip sync: lead time, coarticulation, bilabial closure, jaw vs lips, smoothing, loudness, blinks and brows, avoiding chattering

### Takeaway
- Make the mouth slightly early, not late. Viewers notice sound arriving before the picture at about 45 ms, but tolerate the picture arriving early by about 125 ms.
- Blend neighbouring visemes (coarticulation), with lip-rounding visemes starting early.
- Keep the jaw and the lips as separate channels (JALI).
- Always fully close the lips on p/b/m.
- Enforce a minimum viseme hold (about 100–120 ms), ramp the values, and cap the peaks (about 0.65) so the mouth doesn't chatter.

### Cited Findings
- **ITU-R BT.1359 thresholds:** detectable at about +45 ms (sound ahead of picture) to −125 ms (sound behind picture); acceptable at +90 ms to −190 ms. People are much more forgiving of sound lagging. Sources disagree on sign conventions. — [ITU-R BT.1359-1](https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1359-1-199811-I!!PDF-E.pdf); [Wikipedia](https://en.wikipedia.org/wiki/Audio-to-video_synchronization)
- **Other thresholds:** Steinmetz found ±80 ms acceptable to observers. Film aims for ≤22 ms. — [arXiv 2212.01686](https://arxiv.org/pdf/2212.01686); [Wikipedia](https://en.wikipedia.org/wiki/Audio-to-video_synchronization)
- **JALI:** speech is modelled as two separate actions, jaw and lip, built on FACS, and blends neighbouring visemes because humans do not articulate each phoneme separately. — [JALI SIGGRAPH 2016](https://dgp.toronto.edu/~elf/JALISIG16.pdf); [project](https://www.dgp.toronto.edu/~elf/jali.html)
- **Anticipation:** in the JALI patent, lip-heavy visemes such as /w/ "commence early", and the start can move back to the previous phoneme's start. The neutral face holds the lips lightly tensed, as for /m/. — [US10839825B2](https://patents.google.com/patent/US10839825)
- **Viseme curves:** VisemeNet describes a viseme's attack, apex, sustain and decay, following the Cohen–Massaro dominance model. Phonemes map to visemes many-to-many, and /p/ and /b/ look nearly identical. — [VisemeNet](https://ar5iv.labs.arxiv.org/html/1805.09488)
- **HeadAudio's anti-chatter settings:** `visemeMinMs` 120 (raise it to reduce switching), `visemeRampMs` 100, easing sharpness 5, peak caps 0.65 (PP/FF 0.75), and audio delayed 50–100 ms. — [HeadAudio](https://github.com/met4citizen/HeadAudio)
- **HeadTTS timing:** default viseme offsets are −10 ms at the start and +10 ms at the end. — [HeadTTS](https://github.com/met4citizen/HeadTTS)
- **TalkingHead:** `ttsTrimEnd` defaults to 400 ms. Repeated visemes are merged (0.7× duration). — [TalkingHead](https://github.com/met4citizen/TalkingHead); [lipsync-en.mjs](https://raw.githubusercontent.com/met4citizen/TalkingHead/main/modules/lipsync-en.mjs)
- **Loudness:** uLipSync scales mouth opening by a calibrated log-volume range (Volume Min/Max), and has a Smoothness setting. wLipSync exposes `volume` alongside the weights. — [uLipSync](https://github.com/hecomi/uLipSync); [wLipSync](https://github.com/mrxz/wLipSync)
- **Blinks and head during speech:** TalkingHead uses speaking eye contact 0.5, speaking head movement 0.5, and random-delay blinks in its talking mood. — [TalkingHead](https://github.com/met4citizen/TalkingHead)
- **Rhubarb's shape set:** a dedicated closed shape (A) for P/B/M, a G shape for F/V, and X for rest. — [Rhubarb](https://github.com/DanielSWolf/rhubarb-lip-sync)

### Inferences
These are practical recipes built from the sources above, not measured.
- Start each viseme 30–60 ms before its phoneme (safely inside the 45 ms / 125 ms window, on the early-picture side). Start rounding visemes (U/O/w) one phoneme earlier.
- Make the PP closure a hard override: lips fully shut for at least about 2 frames at 30 fps, even when smoothing would soften it. Likewise FF lower-lip tuck. Smoothing must not wash out closures, so give PP/FF a faster attack than vowels.
- Drive jawOpen from smoothed loudness (an RMS envelope with a 30–50 ms attack and 80–120 ms release) and lip shape from the visemes. This is the JALI split. Louder or stressed syllables get more jaw, not more lip spread.
- Use critically-damped springs or attack/release one-pole filters rather than plain lerps. Merge visemes shorter than about 60 ms into their neighbours.
- Blinks: roughly every 2–6 s, with more at phrase ends and pauses. Brows rise slightly on stressed words and questions. Keep these on separate channels from the mouth.
- With wav2arkit (ARKit-52 output), apply light temporal smoothing only. The model already coarticulates, and heavy smoothing would blur closures.

### Gaps
- We found no free user study comparing these specific smoothing values. The figures above are the tools' defaults, not perceptual optima.
- We found no source giving exact JALI timing numbers for bilabial anticipation.

## 5. Hindi / Hinglish phoneme-to-viseme mappings

### Takeaway
There is no ready-made free Hindi viseme module for TalkingHead or HeadTTS. Academic work shows that Hindi phonemes map well onto the standard 22-viseme and English sets (most Hindi phonemes also occur in English), so a Hindi module can map IPA phonemes from a Hindi grapheme-to-phoneme tool onto the Oculus 15.

### Cited Findings
- A paper maps the standard 22 visemes to the Hindi phoneme set, plus English phonemes for mixed Hindi-English speech. Its recognizer, trained on 100 Hindi speakers, reached 70% viseme-class correctness. — [ACL W13-3904](https://preview.aclanthology.org/moar-dois/W13-3904.pdf)
- A patent table maps Hindi phones onto the English phone set, marking each pair as exact or only acoustically close. — [US6813607B1](https://patents.google.com/patent/US6813607)
- Hindi phrases were converted with phonemizer and mapped through the Jeffers phoneme-to-viseme map; most Hindi phonemes also appear in English corpora. — [arXiv 1901.10139](https://arxiv.org/pdf/1901.10139)
- IIIT Hyderabad drove lips in English video from Hindi dubbed audio and noted that the phoneme differences between the languages were the core challenge. — [IIIT-H](https://cvit.iiit.ac.in/images/ConferencePapers/2019_01/Cross-language_Speech_Dependent_Lip-synchronization.pdf)
- TalkingHead modules are pluggable (`lipsync-xx.mjs` implementing `preProcessText` and `wordsToVisemes`), and a Bengali module is listed, which shows an Indic module is feasible. — [TalkingHead](https://github.com/met4citizen/TalkingHead)

### Inferences
- **Hindi → Oculus visemes** (proposal):

  | Hindi sounds | Oculus viseme | Note |
  |---|---|---|
  | प फ ब भ म | PP | aspirated forms are the same shape, a bit longer |
  | फ़ and व/w (labiodental) | FF | |
  | त थ द ध न ल and retroflex ट ठ ड ढ ण | DD / nn | visually close to dental; the tongue is hidden |
  | क ख ग घ ङ ह | kk | |
  | च छ ज झ श ष | CH | |
  | स ज़ | SS | |
  | र ड़ | RR | |
  | अ / आ | aa | |
  | इ / ई | I | |
  | ए / ऐ | E | |
  | ओ / औ | O | |
  | उ / ऊ | U | |
  | nasalised vowels | same vowel | |

- Hinglish needs per-word language detection, so English words go through English rules and Hindi words through the Hindi map.
- Audio-driven methods (wav2arkit, HeadAudio) do not depend on the language at the viseme level. They are the easy path for Hindi or cloned-voice audio, though they were trained on English.

### Gaps
- We found no free, commercially-licensed Hindi viseme table in code form.
- We found no evaluation of wav2arkit or LAM on Hindi speech.

## 6. Evidence of quality (demos, user studies, comparisons)

### Takeaway
The evidence is mostly demos and authors' own statements. We found no head-to-head user study of the free browser methods.

### Cited Findings
- HeadAudio's author says it is less accurate than text-driven TalkingHead and "far from optimal" at low signal-to-noise ratio. — [HeadAudio](https://github.com/met4citizen/HeadAudio)
- The wav2arkit_cpu card gives no accuracy benchmarks. — [HF](https://huggingface.co/myned-ai/wav2arkit_cpu)
- LAM_Audio2Expression offers a demo video, a Gradio WebGL app and a ModelScope Space, with no metrics in the README. — [GitHub](https://github.com/aigc3d/LAM_Audio2Expression)
- The Hindi viseme recognizer reached 70% viseme-class correctness (a recognition metric, not an animation-quality metric). — [W13-3904](https://preview.aclanthology.org/moar-dois/W13-3904.pdf)
- The UniTalker, FaceFormer and SelfTalk papers report mesh-vertex error on VOCASET/BIWI, but their licences are unclear or research-only datasets, so they are excluded here. — [UniTalker arXiv](https://arxiv.org/abs/2408.00762); [SelfTalk arXiv](https://arxiv.org/pdf/2306.10799)

### Inferences
- We should run our own blind A/B test: the same sentences with HeadTTS timings, wav2arkit and HeadAudio, rated by a few students. Also track an objective check, such as whether the lips are closed within ±1 frame of every p/b/m in the forced-aligned transcript.

### Gaps
- No independent perceptual study of HeadTTS, HeadAudio or wav2arkit was found.
