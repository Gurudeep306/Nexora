# NexoraGuru Voice — the blueprint

> Status: **Phase 0 done** (Action Graph, voice-ready names, Guru Spec, test
> sets, zero-spend guard, consent) **and voice commands live** (browser speech +
> rule matcher). Next: Scene Voice. Plan Written 2026-11-21 from two research rounds
> (`docs/voice/research/`). Every licence, price and limit below must be
> re-checked on the official page before it is relied on: the research could
> not open some sites and marks those facts as unverified.

## 1. The idea in one paragraph

A student opens NexoraGuru and talks to it, in English, Hindi or Hinglish, the
way they would talk to a senior who knows every lesson on the site. The site
listens, moves, explains and asks back. It opens the right notes, plays the
animation and stops exactly where the student asks ("ruko, swap pe"), answers
"why did `i` become 4?" from the real trace, turns a spoken approach into
pseudocode, runs *the student's own* algorithm — mistakes included — next to
the correct one, and never hands over the answer before the student has tried.
It sounds like a person, answers in under a second for commands and about a
second for questions, and works on a cheap phone as well as a good laptop.

Other platforms can copy a voice chat. They cannot copy this, because it is
built on three things only NexoraGuru has: **a step-tagged animation engine,
a judge in 30+ languages, and verified GATE content tied to Nexus mastery.**

## 2. What is genuinely new here

From about 100 searches across both research rounds, nothing close was found
for the first four. "Nothing found" is a strong signal, not proof: run a
patent and GitHub search before saying "first" in public.

| # | Innovation | What it is | Why only Nexora can do it |
|---|---|---|---|
| 1 | **Scene Voice** — talk to the animation | "Pause at the swap." "Go back to when low = high." "What if the array was sorted?" "Why did `i` become 4?" Before each reveal: "say what happens next". | Every animation step is already tagged (`t.step(stepId, note, vars)`). Jumps are lookups; "what if" is a real re-run; "why" is answered from the recorded trace, so numbers can't be invented. |
| 2 | **Mirror Run** — your algorithm, bugs included | Speak an approach in Hinglish → it becomes pseudocode, line by line, exactly as said → it runs as an animation beside the correct one → the first step where they differ lights up → the tutor asks one question about that step. | Needs the tracer, the animation player and the judge together. No product found does the full chain. |
| 3 | **Explain-back mastery** | Explain a solution or a function aloud; a rubric grader scores it; a passed, unaided explanation counts towards Nexus mastery. | Spoken "explain in plain English" grading was not found anywhere; Nexus mastery is ours. |
| 4 | **Bharat Code Speech** — the first spoken Hinglish code corpus | Opt-in "read this code aloud" and "explain this solution" tasks build a public test set (and, with consent, training data) for how Indian students *say* code. | No public corpus exists. It makes every later model better, and is publishable research. |
| 5 | **Trace-grounded tutor** | The tutor's facts about a run come from the trace log, not from the model's memory. "Why 4?" → it reads the step where `i` changed and explains that line. | Same engine as Scene Voice. Removes the main way tutors give wrong explanations. |
| 6 | **Leak Guard in code, not in the prompt** | Before a student has tried, any tutor output that is too similar to the reference solution (code tokens, AST shape) is blocked and replaced with a hint. Measured, with a target leak rate. | Harvard's CS50 Duck still leaks code ~25% of the time with prompt rules alone. We hold the reference solutions, so we can check. |

Also planned, opt-in: **"My voice"** — a student's own voice reads back their
notes and explanations (4.5.1). Voice cloning itself exists; using it for
"revise in your own voice" was not found elsewhere.

Built well but not new (do them, don't advertise them as inventions): whole-site
voice control, a Socratic voice tutor, a voice viva after "Accepted", reading
code aloud, Hindi TTS.

## 3. Decisions — defaults chosen (change any of them)

| # | Decision | Default in this blueprint |
|---|---|---|
| 1 | Learn vs Build mode | **Learn mode on any unsolved graded problem**: speech is transcribed faithfully, the AI never writes the solution. **Build mode** only after "Accepted", in "translate to another language", and in a free practice sandbox. |
| 2 | First feature | **Scene Voice** (most novel, lowest risk). |
| 3 | Default ears | **Self-hosted open models** (IndicConformer / IndicWhisper / a Hinglish Whisper) on our server; free Groq Whisper tier as overflow; no paid API in the base. |
| 4 | Browser speech | Chrome's **on-device** mode (`processLocally`) for commands where available; the cloud mode only with a clear notice and opt-in. |
| 5 | Launch languages | **English + Hinglish** first, then Hindi; Tamil, Telugu, Bengali, Marathi after measured quality. |
| 6 | Pseudocode style | One **NexoraGuru pseudocode** (GATE/CLRS-like), used in lessons and voice alike. |
| 7 | Leak target | **≤ 2%** of tutor turns on unsolved problems leak solution code, measured weekly on a fixed test set; code-level block, not just prompt. |
| 8 | Spoken grading | Counts towards Nexus mastery **only if unaided** and on a randomised variant; vivas stay practice. |
| 9 | Voice corpus | **Start now**, opt-in, clear consent, audio kept 12 months then deleted unless the student donates it; under-18s need parental consent (DPDP Act). |
| 10 | Listening style | **Push-to-talk** by default (button + hotkey); optional hands-free session that ends after silence; no always-on wake word. |
| 11 | WebMCP | Publish the action list to outside AI agents **later**, behind a feature check, once browsers ship it. |
| 12 | Accessibility | **Yes**: labels pass WCAG 2.5.3 site-wide, plus a hands-free GATE exam console. |
| 13 | Research partners | Write to IIT Bombay (CodeVaani) and AI4Bharat; publish our own study of Scene Voice and Mirror Run. |

## 4. The architecture — one mic, one router, five lanes

```
             ┌──────────────── Student's device (browser) ────────────────┐
 Mic (push-to-talk / hotkey)                                               │
   → Voice detector (Silero-class VAD, in browser)                         │
   → Ears ── on-device (commands, strong devices) ─┐                       │
          └─ streamed to server (Hinglish, Indic) ─┤                       │
   → Normaliser: symbols, Hinglish synonyms, Devanagari ⇄ Roman,           │
                 page + editor word list (variable names, lesson terms)    │
   → ROUTER (rules first, tiny model second)                               │
       A. Site command   → Action Graph → do it (outline target 400 ms)    │
       B. Scene command  → Scene Voice: jump / rewind / what-if / why      │
       C. Code edit      → tree-sitter + Monaco edit (instant, undoable)   │
       D. Approach       → pseudocode (faithful) → confirm → Mirror Run    │
                           → (Build mode) code in diff view → judge        │
       E. Question       → Guru tutor (grounded, hint ladder, Leak Guard)  │
   → Mouth: pre-voiced clip if one exists, else live TTS, streamed         │
             sentence by sentence; code shown on screen, never read raw    │
             └──────────────────────────────────────────────────────────────┘
```

**Shared context.** Every lane sees the same "now" object: page, lesson,
question, animation step and its variables, editor contents, cursor line,
the student's attempt state (tried / solved), language. "Yeh kyun hua?" on a
paused animation reaches the tutor with that step attached.

### 4.1 The Action Graph (foundation for lanes A and B)

One registry of everything the site can do. Each page registers actions with
a React hook:

```ts
useVoiceAction({
  id: 'gate.answer.choose',
  say: { en: ['option {x}', 'choose {x}'], hi: ['{x} chuno', 'option {x} lo'] },
  args: { x: ['A', 'B', 'C', 'D'] },
  risk: 'reversible',            // 'safe' | 'reversible' | 'irreversible'
  run: ({ x }) => choose(x),
})
```

- The **same registry** drives keyboard shortcuts, the ⌘K palette, voice, the
  tutor's tool calls and (later) WebMCP. Tested once, used everywhere.
- **Risk tiers.** Safe (scroll, open, play): do it, outline the target for
  400 ms so the student can say "nahi". Reversible (choose option, edit code):
  do it, "undo" works. Irreversible (submit a test, post publicly, delete):
  spoken *and* visible confirmation.
- **Fallbacks.** No rule match → a small model picks *one* action from the
  registry (constrained to the list; server re-checks). Still unsure → "show
  numbers" badges over visible controls ("click 7"); two matches → "1 ya 2?".
- **Accessibility first.** Every control has an accessible name that contains
  its visible text (WCAG 2.5.3), checked in CI, so phone and laptop voice tools
  work too.

### 4.2 Scene Voice (lane B)

The animation player already holds every step: id, note, variables, code
line. Voice adds four verbs:

| Verb | Example | How |
|---|---|---|
| **Jump** | "swap pe ruko", "go to step 12", "when low equals high" | Match against step ids/notes; for conditions, evaluate them on each step's variables and jump to the first match. |
| **Rewind / replay** | "do step peeche", "replay the last swap" | Player API. |
| **What if** | "what if the array was sorted?", "n = 0 karke dikhao" | Build the new input, re-run the real algorithm in the tracer, play it. Nothing invented. |
| **Why** | "why did i become 4?" | Find the step where `i` changed, give the tutor that step + code line; it explains that line. |

Plus **predict-then-reveal**: before key steps the narrator asks "agla kya
hoga?" and waits for a spoken or tapped guess (self-explanation, g ≈ 0.55).

### 4.3 Code by voice (lanes C and D)

**Rule: speak ideas, show code.** Speech recognition gets ~28% of words wrong
on raw spoken code and spoken prompts make worse code, so the voice carries
the approach and short commands; exact code lives on screen.

- **Lane C — quick edits, no AI**: "line 12 pe jao", "rename i to j", "for
  loop daalo 0 se n tak", "undo", "run", "submit" (confirm). tree-sitter finds
  the structure, Monaco applies the edit (`executeEdits`), the edit is
  highlighted and undoable. Under 300 ms.
- **Lane D — approach → pseudocode → Mirror Run**:
  1. The student explains the idea, in any mix of languages.
  2. The model writes NexoraGuru pseudocode, **each line linked to the phrase
     that produced it**, and in Learn mode **without fixing anything**.
  3. The student edits/confirms by voice or touch.
  4. **Mirror Run**: the pseudocode is compiled to a traced program and run on
     the sample input beside the reference trace. The first diverging step is
     highlighted; the tutor asks one question about it.
  5. Learn mode: the student writes the code (typing or Lane C). Build mode:
     code is generated in the chosen language, shown as a diff, accepted, and
     the judge runs it; on failure the tutor asks about the failing case (max
     3 automatic retries, Build mode only).
- **Ears that know the page**: the editor's identifiers and the lesson's terms
  are passed to recognition as hints, and a small correction pass fixes
  "dye extra" → "Dijkstra", "eye plus plus" → `i++`.
- **Reading code**: summary first ("a loop from 0 to n−1 with an if inside"),
  line by line only when asked, with that line highlighted.

### 4.4 Guru, the tutor (lane E)

- **Knowledge lock**: answers come from the verified notes, solutions and the
  live trace (retrieval), not from the model's memory. Not in our content →
  it says so.
- **Topic lock**: the router stops off-topic requests; refusal examples in
  training; an over-refusal metric so it does not refuse real CS questions.
- **Hint ladder** on unsolved problems: nudge → question → partial idea →
  pseudocode outline → (only after a real attempt or "show solution") the
  verified solution, explained step by step.
- **Leak Guard**: every reply on an unsolved problem is compared with the
  reference solution (token n-grams + AST shape). Too similar → blocked,
  replaced with the next hint. Logged and measured.
- **Talks like a person**: short spoken sentences, matches the student's
  language mix, "acha", "dekho", "nice, almost", remembers the last session,
  encourages after mistakes. One persona spec, written by the founder.
- **Stuck detection (experimental)**: long silences plus editor inactivity
  offer a gentle hint; never interrupts a speaking student.

### 4.5 The voices (mouth)

| Use | Voice | Where |
|---|---|---|
| Lessons, solution walkthroughs, recaps (fixed text) | **Founder's cloned voice**, generated once per lesson, word-timed for highlighting | Pre-generated on free GPU time, served as audio files (≈2–3 MB per 10 min). ₹0 per listen. |
| Live replies | Open Indian TTS (Maya 2 Native, Indic Parler-TTS — both reported Apache-2.0) streamed per sentence | Our server/GPU when available |
| Offline / weak device | Kokoro (browser) or Piper Hindi voices | Student's device |

- Cloning only the founder's voice, with a written consent record.
- India's IT Amendment Rules 2026 require clear labels on synthetic audio:
  the player always shows "AI voice". Add an inaudible watermark.
- XTTS-v2 and F5-TTS base weights are **non-commercial — do not use**.
- Students choose from **4–6 natural Indian voices** for the live tutor
  (male/female, calm/energetic, one close to their own pitch).

### 4.5.1 "My voice" — the student's own voice (opt-in, later phase)

A student can record a short sample and hear chosen things **in their own
voice**. Open models can copy a voice from a few seconds of speech (Maya 2
Native reports 3–10 s; Chatterbox, MIT) — both run on a server GPU, not on
phones.

**Where it is used (best value, lowest cost):**

| Feature | What the student hears | How it's made |
|---|---|---|
| **Revise in my voice** | Their own highlights, margin notes and flashcards read back before the exam | Generated **once per note** on the server, cached as audio |
| **Explain-back replay** | Their spoken explanation played back cleaned up and fluent — "how confident me would say it" | Generated once per explanation |
| **My reminders** | Short study reminders and streak nudges | Generated once, reused |

The **live tutor stays on the chosen natural voices**: live replies in each
student's own voice would need a GPU per reply, which is the most expensive
voice path and not free at scale. If credits allow later, a small daily quota
of live replies in "my voice" can be tested.

**Safety rules (all required):**

1. **Adults first.** 18+ only at launch; under-18s only with verifiable
   parental consent (DPDP Act).
2. **Live liveness check.** The student reads a random sentence on screen; an
   uploaded or pre-recorded clip is rejected. A voice can only ever be used
   by the account that recorded it.
3. **Store the voice fingerprint, not the recording.** The sample is deleted
   after the fingerprint is made. "Delete my voice" removes the fingerprint
   and every clip made with it, at once.
4. **No downloads** of "my voice" audio; an inaudible watermark in every clip;
   the player always shows "AI copy of your voice".
5. **Never used** for anything public (posts, explanations shared with others,
   live rooms) and never for training without separate consent.
6. **Easy off switch.** Many people dislike hearing their own voice; one tap
   returns to the normal voices.

### 4.6 The brains and where they run

| Tier | Device | Guru model (local) | Code model |
|---|---|---|---|
| L | 16 GB laptops, M-series Macs with headroom | Guru-L = Qwen3.5-4B fine-tune, 4/5-bit | server |
| M | 8 GB laptops, good phones | Guru-M = Qwen3.5-2B fine-tune | server |
| S | 4–6 GB devices that pass the test | Guru-S = Qwen3.5-0.8B fine-tune (commands, short answers) | server |
| — | Everything else; iPhone Safari above ~1B (tab killed at ~2 GB) | none: server | server |

- Pick the tier from WebGPU limits, device memory, a 2-second speed test and
  crash history. Download only after the student agrees (Wi-Fi), keep in
  OPFS/Cache, run in a Web Worker, unload when idle. Never touch the page's
  main thread.
- Server brain (no Oracle — its free servers are rarely available): Cloudflare
  Workers AI free daily allowance (open models; LoRA add-ons on supported
  bases), plus free API tiers (Groq, Gemini, Cerebras, OpenRouter — one
  account each, official limits only); a small always-on CPU model server on
  Hugging Face Spaces (free CPU, sleeps when idle) if needed. Never run heavy
  models on the Azure VM that serves the live site.
- Code generation: Qwen2.5-Coder 0.5B/1.5B (Apache-2.0); **not the 3B
  (Qwen-Research licence)**. Prefer 5–8-bit for models ≤ 2B (4-bit loses
  facts on small models).
- Licences: Qwen3.5 small models are Apache-2.0 — keep the licence and notice
  files, say they were modified, don't use the Qwen name for the product
  ("Guru S/M/L, built on Qwen3.5").

### 4.7 Ears (speech to text)

| Need | Choice |
|---|---|
| Commands on supported browsers | Web Speech API on-device mode + `phrases` list from the Action Graph |
| Hinglish / Indian English | Server: Whisper-turbo-class (LoRA-tuned on our corpus later) or IndicConformer; free Groq Whisper tier as overflow |
| Hindi and other Indian languages | Server: IndicConformer (MIT, 22 languages) or IndicWhisper (MIT) |
| Voice activity | Silero-class VAD in the browser (check the upstream licence; one release shows CC-BY-NC) |
| Turn end | VAD + a turn-detector model (LiveKit's supports Hindi) |

### 4.8 Speed budget

| Path | Target (p50) | How |
|---|---|---|
| Command (lane A/B/C) | < 400 ms to action | rules, on-device ears where possible, no LLM |
| Tutor first audio | ~1 s on Wi-Fi, ≤ 1.5 s on 4G | streaming ears, LLM starts on partial transcript, first sentence to TTS at once, short filler ("hmm, dekho…") if late |
| Mirror Run | < 3 s to first frame | pseudocode streamed, trace run in a worker |

Measured from Indian networks before launch; nobody has published these.

## 5. Training Guru (the model you design)

1. **The Guru Spec** (founder writes, ~10 pages): persona, language rules,
   hint ladder, refusals, the action list, 50 perfect example conversations.
   Every training example is generated from it; every test checks it.
2. **Data** — allowed: our own notes, verified solutions, traces, lessons;
   conversations generated by **open models whose licences allow it** (e.g.
   DeepSeek-R1, MIT; Qwen, Apache-2.0). **Not allowed**: outputs of Claude,
   ChatGPT, Gemini or Sarvam as training data (their terms forbid building
   competing models); the third-party reference notes in Materials.
3. **SFT with LoRA** (Unsloth/TRL) on Guru-L, with retrieved passages in the
   prompt (RAFT-style), tool calls from the Action Graph, Hinglish variants.
4. **Preference tuning (DPO/ORPO)**: hint vs leaked answer, refusal vs comply,
   human-sounding vs textbook.
5. **Distil** Guru-M and Guru-S from Guru-L.
6. **Router** trained from scratch (small classifier) — fully ours.
7. **Ears**: LoRA-tune Whisper on Bharat Code Speech (≈1 hour of in-domain
   audio cut code WER from 28% to ~9% in published work).
8. **Compute**: Kaggle (~30 GPU h/week), Colab free, Modal free credits; then
   startup credits (Google for Startups, AWS Activate, Microsoft for
   Startups) and the IndiaAI compute portal (subsidised, ~₹65–92/GPU-hour,
   eligibility rules apply).

### Quality gates (must pass before release)

| Test set | Target |
|---|---|
| Command → action (500 utterances, EN/Hinglish/Hindi) | ≥ 95% correct, 0 wrong irreversible actions |
| Scene Voice jumps and "why" answers (300) | ≥ 95% correct step / faithful to trace |
| Tutor faithfulness to verified content (500) | ≥ 90% |
| Leak rate on unsolved problems | ≤ 2% |
| Off-topic refusal / over-refusal | ≥ 95% / ≤ 3% |
| Pseudocode faithfulness (Learn mode, 300 spoken approaches) | ≥ 90% "says exactly what was spoken" |
| Hinglish code-speech WER (Bharat Code Speech test split) | publish baseline, then beat it each release |
| Listening test with students from 5+ states | "sounds human" ≥ 4/5; "understood me" ≥ 4/5 |

## 6. Privacy, safety, law

- **Consent** before the mic is used; a visible mic state; push-to-talk; no
  recording kept unless the student opts in to the corpus.
- **Children**: many users are under 18. India's DPDP Act needs verifiable
  parental consent for their personal data — needed for the corpus.
- **Labels**: "AI voice" on every synthetic voice (IT Rules 2026).
- **Students' own voices** ("My voice", 4.5.1): liveness check, adults first,
  fingerprint only, delete-anytime, no downloads, watermark, never public.
- **Untrusted text**: notes and comments written by users never steer the
  tutor (prompt-injection defence).
- **No secrets or personal data** sent to outside services; free-tier APIs
  get only the utterance text, never names or emails.
- **Licences** re-checked on official pages before each model ships; a
  `THIRD_PARTY_NOTICES` file lists every model and its licence.

## 7. Cost

| Stage | Monthly cost | How |
|---|---|---|
| Build + pilot (≤ 200 daily users) | ₹0 | free GPU hours (Kaggle/Colab), Cloudflare free tiers (Workers, Workers AI, R2 for audio with free downloads, Realtime), Azure Speech free tier for the best Indian voices, free API tiers, on-device models, pre-voiced lessons |
| 1,000 daily users | ₹0–small | most traffic is commands (no AI), pre-voiced clips and on-device models; live tutor turns capped per student per day |
| 1,000 students talking at the same moment | real money (paid APIs ≈ ₹90k–2.1 lakh/hour) | startup credits + own GPU inference before this point |

### Zero-spend rule

The feature never calls a paid service. A test fails if a paid key is added to
it. When free limits run out it falls back (text hints, browser voices, the
verified solution) instead of charging. Upgrades with startup credits are an
explicit admin choice.

### Never stuck on a limit: automatic switching

Every job has a **chain** of free options. When one is full, slow or down, the
next takes over by itself, and the student never sees an error. The last link
in every chain runs on the student's own device or needs no AI at all, so it
cannot run out.

| Job | Chain, in order (first that has room wins) |
|---|---|
| Ears (speech → text) | on-device browser recognition → Groq Whisper (free) → Cloudflare Workers AI Whisper → Azure Speech free tier → small Whisper in the browser → typed input |
| Brain (tutor answers) | Guru on the student's device → cached answer for the same doubt → Cloudflare Workers AI → Groq → Gemini → Cerebras → OpenRouter free models → verified solution + hint text (no AI) |
| Mouth (voice) | pre-voiced clip (founder's voice, from R2) → Azure Speech free tier (best Indian voices) → open Indian TTS on a free host → Kokoro / Piper in the browser → the browser's built-in voice |
| Commands, Scene Voice | always on the device, no limit |

How it works (reuses Hive's existing provider router and key handling,
Admin → AI models):

- **Quota tracking**: count each provider's use against its published daily
  and per-minute limits; switch *before* hitting the limit, not after errors.
- **Health checks and circuit breakers**: a provider that fails or slows down
  is skipped for a few minutes, then retried.
- **Daily reset**: free quotas refill each day; the chain returns to the best
  option automatically.
- **Fair share**: a soft per-student daily budget for live AI turns so a few
  heavy users can't use up the day for everyone; beyond it, the device and
  no-AI links still answer.
- **Admin view**: today's usage per provider, how often each link answered,
  and alerts when a chain is close to its last link.

Ways to need fewer free calls in the first place:

1. **Answer cache**: the same doubt asked again (in other words) reuses a
   stored answer — most doubts repeat.
2. **Pre-generate**: lesson narration, solution walkthroughs and the top
   doubts per question are made once on free GPU time and served from R2.
3. **On-device first**: commands, Scene Voice and Guru on capable devices use
   no server at all; every new student brings their own compute.
4. **Short answers**: spoken replies are kept brief; long text only on request.
5. **Startup credits**: when granted, added as extra links at the front of
   the chain — never required.

Honest limit: free services can change their terms or close. One account
per provider, official limits only (several accounts at one provider breaks
their terms). Because the last links run on the device, the feature keeps
working even if every free service disappeared — just simpler.

## 8. Phases

| Phase | Weeks | Ships | Done when |
|---|---|---|---|
| **0. Foundations** | 2 | Action Graph + WCAG 2.5.3 labels + Guru Spec draft + test sets + consent/corpus flow | registry drives ⌘K and shortcuts; labels pass CI |
| **1. Voice commands + Scene Voice** | 4–6 | Push-to-talk, EN + Hinglish commands across the site, Scene Voice on DSA animations, predict-then-reveal; Kokoro voice | command ≥ 95%, Scene Voice ≥ 95% on test sets |
| **2. Guru tutor + pre-voiced lessons** | 6–8 | Tutor lane with retrieval, hint ladder, Leak Guard; founder-voice narration for DM + DSA with word highlighting | faithfulness ≥ 90%, leak ≤ 2% |
| **3. Code by voice + Mirror Run** | 6–8 | Lane C edits, Lane D approach → pseudocode → Mirror Run, Build mode diff + judge | pseudocode faithfulness ≥ 90% |
| **4. Own models + languages** | 8–12 | Guru-S/M/L on device, router, Hindi, explain-back mastery, hands-free GATE console | all quality gates pass on device tiers |
| **4b. "My voice" (opt-in)** | 3–4 | Liveness-checked voice sample, "Revise in my voice", explain-back replay, delete-anytime; adults first | consent + deletion tested; listening test ≥ 4/5 "sounds like me" |
| **5. Research + platform** | ongoing | Bharat Code Speech release, paper, WebMCP, more languages | corpus published; study submitted |

## 9. Where it lives in the code (planned)

| Path | What |
|---|---|
| `client/src/voice/` | mic, VAD, ears adapters, normaliser, router, mic pill UI |
| `client/src/voice/actions/` | Action Graph (`useVoiceAction`, registry, risk tiers, numbers overlay) |
| `client/src/viz/voice/` | Scene Voice verbs on the animation player |
| `client/src/voice/code/` | tree-sitter + Monaco edits, pseudocode panel, Mirror Run view |
| `src/voice/` | server ears, tutor, Leak Guard, TTS streaming, corpus storage (own store, never in the core DB) |
| `deploy/voice/` | ASR/TTS/LLM server configs (Cloudflare Workers / Workers AI, Hugging Face Space, GPU farm when available) |
| `docs/voice/` | this blueprint, the Guru Spec (`GURU_SPEC.md`), test sets (`tests/commands.json`, `scene.json`, `tutor.json`), research |

## 10. Biggest risks

1. **Hinglish recognition of code words** is unmeasured. Build the corpus first; ship typed fallback for everything.
2. **"Helpful" models fix the student's bug** in Mirror Run. Faithfulness tests and Learn-mode rules guard it.
3. **iPhone Safari memory** limits local models: server path for iPhones.
4. **Free tiers change.** Never depend on one; route across several; cap per student.
5. **Stress and fairness** in spoken grading: randomised variants, practice-first, typed alternative.
6. **Scope.** Ship phase by phase; each phase is useful on its own.

## 11. Research behind this

- `docs/voice/research/Indian voice AI tutor options.md` — ears, voices, models, runtimes, training, compute, Indian resources, competitors.
- `docs/voice/research/Voice coding and voice control.md` — voice coding, whole-site voice control, learning science, novelty ranking.
