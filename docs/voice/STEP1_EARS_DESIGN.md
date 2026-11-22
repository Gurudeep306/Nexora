# Step 1 — Ears and natural voice: the precise design

Goal: catch what a student says as correctly as possible, in English,
Hinglish, Hindi and other Indian languages, including code words, using only
free tools, and answer in a natural voice. This is step 1 of
`docs/voice/VIRTUAL_TEACHER.md` §7. Every stage below has its own check, so
an error is caught where it starts instead of reaching the tutor.

Status (2026-11-22): S1–S4 and S7 built (#229–#232); the mic works without
browser recognition (#233); **S5 built** (#234, `src/voice/normalise.js`,
340-line test set); **S6 built** (#235); **S8 built** (this step). S9 is next.

---

## 0. Why recognition goes wrong, and the fix for each cause

| Cause | What it looks like | Fix (stage) |
|---|---|---|
| Noise, echo, low or loud mic | Missing or invented words | Clean capture: browser noise, echo and gain control plus a denoiser (S1, S2) |
| Silence and breaths sent as speech | Whisper "hallucinates" text from silence | A voice detector cuts only the speech out (S2) |
| Wrong language guessed | Hindi written as Urdu, or Hinglish turned into English words | Language hint from the student's setting, with Roman script for Hinglish (S4) |
| Code and CS words | "i plus plus" → "I plus plus"; "BFS" → "beefs" | Vocabulary hints sent with every clip, then our normaliser (S4, S5) |
| Low confidence | One bad word changes the meaning | Read the model's own confidence; below the line, show the text and ask before acting (S6) |
| A free limit is reached | Errors, silence | Quota tracking and automatic switching to the next free link (S7) |

## 1. The pipeline

```
mic ─► S1 capture ─► S2 clean + cut speech ─► S3 encode ─► S4 recognise ─► S5 normalise ─► S6 check ─► router
            (browser)        (browser)            (browser)   (server: free chain)   (server, rules)     (both)
```

Instant feedback while speaking: the browser's own recognition (already
built, `client/src/voice/speech.ts`) shows grey interim words. The **final
text comes from the server** (S4), which is much more accurate for Indian
speech. Commands that match exactly on the interim text still run at once
(< 400 ms); everything else waits for the final text (about 0.3–0.8 s more).

---

## S1. Capture (browser)

`navigator.mediaDevices.getUserMedia` with:

```js
{ audio: {
    channelCount: 1,
    echoCancellation: true,   // the site's own voice never comes back as input
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: { ideal: 48000 },
} }
```

- Push to talk (button or Alt+M) stays the default. Hands-free mode ends
  after 1.2 s of silence.
- While the site is speaking, the mic is paused (half-duplex) unless echo
  cancellation is confirmed on. This stops the tutor hearing itself.
- **Mic check** (Settings → Voice → "Test my mic"): records 3 s, shows the
  level and how much noise there is, and suggests "move closer" or "too
  noisy" before a student relies on it.
- A level meter on the mic pill: the student sees it is hearing them.

## S2. Clean and cut out the speech (browser, free)

1. **Denoise**: RNNoise (BSD licence) as WebAssembly in an AudioWorklet,
   off the main thread. It removes fans, traffic and keyboard clicks better
   than the browser alone. Turn it off for students who sound worse with
   it: the mic check compares both versions once.
2. **Voice detector**: Silero VAD v5 (MIT licence; do not use the older
   release that was CC-BY-NC) through `@ricky0123/vad-web` (ISC licence),
   about 2 MB, in a worklet.
   - Speech starts at probability ≥ 0.5 and ends after 600 ms below 0.35.
   - Keep 300 ms before the start, so the first sound isn't cut off.
   - Drop clips under 300 ms.
   - A clip that is mostly silence is never sent. This alone prevents most
     invented text.
3. **Clip length**: cut at natural pauses into pieces of at most 25 s. A
   long explanation (Explain-back) is sent piece by piece while the student
   is still talking, so the text is ready when they stop.

## S3. Encode (browser)

- Resample to **16 kHz mono**, the rate Whisper uses (sending more wastes
  data without helping).
- Encode as **FLAC** (lossless, about half the size of WAV) or WAV.
  Lossy formats (Opus, MP3) lose detail that helps with accents. A 5 s clip
  is about 80 KB as FLAC, well inside Groq's 25 MB free limit.
- POST to `/api/voice/stt` as multipart with:
  - `lang` (the student's setting);
  - `context` (the page and the place they are on);
  - `hints` (names from the page: actions, variable names in the editor,
    the lesson's terms);
  - `clipId`.
- The audio is **never stored** unless the student opted in to Bharat Code
  Speech (separate consent, already built).

## S4. Recognise (server, the free chain)

`src/voice/stt.js`, route `POST /api/voice/stt` (signed in, rate-limited per
student, same origin check as other voice routes).

### The chain (first with room wins)

| # | Engine | When |
|---|---|---|
| 1 | Groq `whisper-large-v3-turbo` | Default: fastest, good for English and Hinglish |
| 2 | Groq `whisper-large-v3` | Hindi and other Indian languages, and any clip where #1's confidence was low (one retry) |
| 3 | Cloudflare Workers AI Whisper (free daily allowance) | When Groq is full or down |
| 4 | Browser recognition text (sent along with the clip) | When every server link is full |
| 5 | Typed input | Always offered |

Later, when it runs on a free host and beats #1 in our measurements:
**IndicConformer** (AI4Bharat, MIT) for Hindi and other Indian languages.

### What we send to Whisper (the biggest accuracy levers)

- `language`: `en` for English and Hinglish (so Hinglish comes back in Roman
  letters, as students type it), `hi` for Hindi (Devanagari), and the other
  codes for other languages. Never leave it to auto-detect: auto-detect
  often turns Hindi into Urdu script and short clips into the wrong
  language.
- `prompt` (Whisper reads it as "what came before"; up to 224 tokens). It
  is built from three things, in this order:
  1. A fixed **CS glossary** in the student's style ("BFS, DFS, queue,
     stack, i plus plus, array, mid, low, high, pointer, linked list,
     recursion, DP, O of n log n…").
  2. The page's own words: action names, variable names in the editor and
     the lesson's key terms (the `hints` from S3).
  3. One short sample sentence in the expected style, for example
     "mid ko update karo, low equals mid plus one".

  It is checked so it never goes over the limit (the extra is cut, glossary
  last).
- `temperature: 0`, `response_format: verbose_json` (gives each segment's
  `avg_logprob`, `no_speech_prob` and `compression_ratio` for S6).

### Speed

Groq runs Whisper many times faster than real time; a 3–5 s clip comes back
in about 0.2–0.5 s plus network. Measure p50 and p95 from India (the server
is in India; Groq's is not) before launch, and record them in this file.

## S5. Normalise (server, rules, no AI)

`src/voice/normalise.js`, pure functions with a test set:

- Spoken code to symbols, only when the page expects code or a command:
  "i plus plus" → `i++`, "plus equals" → `+=`, "equals equals" → `==`,
  "n minus one" → `n - 1`, "open bracket" → `[`, "a of i" → `a[i]`.
- Numbers in English, Hinglish and Hindi (reuse
  `client/src/voice/actions/number.ts` logic, moved to a shared module).
- Fix near-misses against the page's own names (edit distance ≤ 2 and the
  same first sound): "bee eff ess" → `BFS`, "kyu" → `queue`, "mid" spelt
  "mit" → `mid`. Only names that exist on the page or in the glossary are
  allowed, so it never invents a word.
- Hindi digits and the danda (`।`) cleaned; Urdu script, if it ever
  arrives, flagged for a retry with `language: hi`.

Test set: `docs/voice/tests/normalise.json` (at least 300 lines: spoken →
expected), run in `npm test`. Target 100%, because these are rules.

**As built:** the normaliser returns `text` (what the site acts on: the same
words, cleaned, with names fixed; words stay words because the browser's own
parsers in `client/src/voice/actions` and `voice/code` read words), `code`
(code pages only: the speech as code, "i plus plus" → `i++`), `unplaced`
(code pages only: words it could not place, for S6), `retryHindi` and
`changes`. Modes: `text` (no guessing), `command` and `code` (near-miss names
fixed, page names first). The browser sends the mode and the page's names
(`client/src/voice/hints.ts`: names in the code editor in use, then the
page's action titles). Hindi that comes back in Urdu script makes the chain
try the next service. Server and browser number words are checked to agree.

## S6. Check confidence before acting (both)

For each clip, from Whisper's numbers:

- Speech is **unsure** if any of these is true:
  - `avg_logprob` < −0.8;
  - `no_speech_prob` > 0.5;
  - `compression_ratio` > 2.4 (repeated words, a sign of invented text);
  - the text has words the normaliser could not place on a code page.
- Unsure + a **risky** action (submit, delete, end a test) → never act:
  show the text and ask "Did you mean …?" with Yes / Say again.
- Unsure + a harmless action or a doubt → retry once with the next engine
  (S4 #2). If the two agree, go on. If not, show both and let the student
  tap the right one.
- The student always sees what was heard (a one-line caption), and can tap
  it to fix it by typing.

**As built:** `stt.js` marks each answer `unsure` (Whisper's own signals, a
service confidence under 0.6, or unplaced words on a code page) and checks an
unsure answer once with the **next service** (another key of the same
service is not a second opinion). The same words (ignoring case, spacing and
punctuation): trusted. Different words: both come back as `alternatives`. No
second service: the answer comes back marked unsure. In the mic
(`VoiceButton.tsx`), unsure words that would change something (a code edit,
Build mode, an action whose risk isn't `safe`) show "Did you mean this?" and
change nothing until tapped; two answers show "Which did you say?". Questions
and looking around (risk `safe`) go ahead. What was heard always shows with
**Fix** (type the right words; they are used as if said).

## S7. Never stuck on a limit (server)

Groq's free tier for Whisper is reported as **20 requests a minute, 2,000
requests a day, 7,200 audio seconds an hour and 28,800 a day** (check the
console; they change). The account is shared by all students, so:

- `src/voice/quota.js` counts requests and audio seconds per engine, per
  minute, hour and day, in memory with a small table for restarts.
- Switch to the next link at **85%** of any limit, before errors start.
- An engine that errors or is slow (p95 > 2 s) is skipped for 3 minutes.
- **Fair share**: each student has a soft daily budget of server audio
  (start at 10 minutes a day). Beyond it, the browser link and typing still
  work. Staff can raise it in Admin → AI models.
- Count each clip by its real length, but remember Groq bills a 10 s minimum
  on paid plans. If the free tier counts the same way, join short commands
  into one request or answer them in the browser.
- Admin → AI models → **Voice**: today's use per engine, how often each link
  answered, and an alert when the chain reaches its last link.

## S8. Natural voice for replies (mouth)

| # | Voice | Why |
|---|---|---|
| 1 | Pre-made clips (lessons, top doubts) from storage | Zero cost, zero wait |
| 2 | Azure Speech free tier: 0.5 million characters a month; neural en-IN and hi-IN voices | Most natural Indian voices, and it gives exact mouth-shape timings for the teacher's lip sync. Needs an Azure account, and sign-up asks for a card. Free tier is throttled, not billed, when full (check). |
| 3 | Kokoro in the browser (`kokoro-js`, Apache-2.0, 82M parameters, about 300 MB once, WebGPU or WASM) | Free and unlimited, on the student's device; download only with consent on Wi-Fi; English is strong, so check Hindi quality |
| 4 | The browser's own voice (built) | Always there |

- Speak sentence by sentence: the first sentence starts as soon as it is
  written, so a reply starts in about 1 s.
- Every AI voice is labelled "AI voice" (India's IT rules).
- Text always shown alongside (sound off, deaf students).

**As built:**
- `src/voice/tts.js`, `POST /api/voice/tts`: Azure Speech neural voices
  (Neerja and Prabhat for en-IN, Swara and Madhur for hi-IN), using the
  **Azure Speech entry of the ears** (same key and region). Free tier only:
  it stops at 85% of the free 500,000 characters a month, the cap can only
  be lowered (Admin → Voice recognition → Natural voice), each student has a
  daily share (4,000 characters by default), and repeated sentences come from
  a 24 MB in-memory cache at no cost. Use a Free (F0) resource: a paid (S0)
  one would bill. `tests/voice-tts.test.js`, and the zero-spend test checks
  the cap.
- `client/src/voice/speak.ts`: best available voice (natural → Kokoro if
  downloaded → device), sentence by sentence
  (`client/src/voice/sentences.ts`), the next sentence made while one plays;
  a failure hands the rest to the device voice. `SpeakingChip` shows
  "AI voice · Neerja" (or "Device voice") with Stop while speaking.
  `playingAudio()` exposes the audio element for the teacher's lip sync.
- Settings → Voice: best available / natural (voice picker) / Kokoro
  (opt-in download with progress, English only) / device voice, and "Try the
  voice".
- **Kokoro, honestly:** kokoro-js (Apache-2.0) turns text into sounds with
  `phonemizer`, which bundles eSpeak NG (GPL-3.0). So it is never bundled
  into the site: after the student opts in, their browser loads kokoro-js
  1.2.1 from its public npm copy on jsDelivr and the model from Hugging Face
  (both allowed in the CSP). The owner should decide whether that is
  acceptable; switching it off is one line. Not tested end to end here (the
  build session's network blocks Hugging Face).
- Lip sync with exact mouth shapes (Azure visemes) needs the Speech SDK's
  WebSocket, not the REST call used here; the teacher will read the audio's
  loudness instead (step 2).

## S9. Measuring accuracy (before turning anything on)

1. **Test clips**: record (with consent; the owner and volunteers first)
   `docs/voice/tests/asr/<lang>/*.flac` with exact text:
   - English: 200 clips;
   - Hinglish: 300, half of them code;
   - Hindi: 200.
   Quiet room and noisy room, phone and laptop.
2. Script `scripts/voice/asr-eval.js`: runs every engine and settings set on
   the clips and reports:
   - word error rate;
   - **code-word error rate** (only the code and CS words);
   - command accuracy after the normaliser;
   - p50 and p95 time.
3. Gates to turn a link or language on:
   - commands ≥ 95% correct;
   - code-word error rate ≤ 5%;
   - Hinglish word error rate ≤ 15%;
   - p95 under 1.5 s on 4G.
   Results go in this file, and a language is offered only when it passes.
4. Repeat monthly and whenever an engine or prompt changes.

## S10. Getting better over time (what we build ourselves)

- **Bharat Code Speech** (consent flow built): with opt-in, keep the clip
  and the text the student confirmed or corrected (S6). That is exactly the
  data no one has.
- At about 10 hours of confirmed clips: fine-tune a small LoRA on
  `whisper-large-v3-turbo` (free GPU hours on Kaggle), host it on a free
  Space, add it to the chain, and keep it only if S9 shows it is better.
- Grow the glossary from corrections (words students had to fix most).

## Files to build (in order, one PR each)

1. Server: `src/voice/stt.js`, `src/voice/normalise.js`,
   `src/voice/quota.js`, route `POST /api/voice/stt`, tests
   (`tests/voice-stt.test.js`, `tests/voice-normalise.test.js`,
   `docs/voice/tests/normalise.json`) and the zero-spend guard (free links
   only).
2. Client capture: `client/src/voice/capture/` (getUserMedia setup, RNNoise
   and VAD worklets, 16 kHz FLAC encoder, mic check), wired into
   `VoiceButton` and `listenOnce` with the browser text as instant
   feedback.
3. Confidence and confirmation UI (S6), caption under the mic pill.
4. Admin → AI models → Voice usage view (S7).
5. Voices (S8): Azure link (if the owner adds a key), Kokoro opt-in,
   sentence streaming.
6. Measurement script and the first results (S9).

## What the owner needs to do for step 1

1. Done: Groq key added.
2. Optional, for the best Indian voice and lip sync: an Azure account,
   then Speech resource → Free F0 → copy key and region → Admin → AI models.
3. Record the first 30–50 test clips (about 15 minutes): a script will list
   the sentences to read.

Sources used for limits and licences (check again before building):
- Groq speech to text: https://console.groq.com/docs/speech-to-text
- Groq rate limits: https://console.groq.com/docs/rate-limits
- kokoro-js: https://npmjs.com/package/kokoro-js
- Azure Speech pricing: https://azure.microsoft.com/en-in/pricing/details/speech
