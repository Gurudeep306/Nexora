# Virtual teacher, any-language ears, fast replies, "my voice"

The owner's brief (2026-11-22), the honest research answer, and the build
plan. Read with `docs/voice/BLUEPRINT.md` (the voice plan this extends) and
`docs/voice/GURU_SPEC.md` (how the tutor must answer).

## 1. What the owner asked for

1. **A small virtual teacher** that can replace the cursor (optional, off by
   default). When someone speaks, it moves by itself to the place being
   talked about ("go to Dry run", "where is the queue?"), points at it and
   explains it, with lips moving in step with its voice. Small, not in the
   way, and cool to look at.
2. **Ears for every language**: speech caught correctly in English, Hindi,
   Hinglish and other Indian languages, including code words.
3. **Fast replies**: about 1 second to the first spoken word.
4. **Ask any doubt by voice** and get a spoken answer in a natural voice.
5. **Choose the voice**: a student gives a few seconds or minutes of a voice
   and the site speaks in that voice.
6. **Accuracy above everything**: a wrong answer teaches wrong knowledge.
   Train as much as possible; build our own parts where that is better.

## 2. Is it possible? The honest answer

| Wish | Possible? | Honest limits |
|---|---|---|
| Small teacher that moves to places and points | **Yes, fully.** Our own code. | It can only go to places the site has named (the Action Graph and `data-guide` anchors). It never guesses a place. |
| Lips in step with the voice | **Yes.** | Good enough for a small cartoon face (mouth shapes, called visemes). Film-quality faces need a GPU per reply, which is not free. |
| Ears for English, Hindi, Hinglish | **Yes, today.** | Code words in Hinglish ("i plus plus", "mid ko update karo") are the weak spot for every model. Only our own recorded data fixes that (§5). |
| Ears for "all languages" | **Mostly.** Open models cover 22 Indian languages and 100+ world languages. | Quality differs a lot by language. Measure each one before turning it on; never claim a language we have not measured. |
| First spoken word in about 1 second | **Yes for commands and repeated doubts; about 1–1.5 s for new doubts** on good Wi-Fi. | 4G in India adds 100–300 ms. Under 1 s for every new question is not honest to promise. |
| Answers that are never wrong | **No AI can promise this.** | We get close by answering only from our verified lessons and solutions, saying "I'm not sure" otherwise, and testing on a fixed question set every week (§6). |
| Speak in a chosen voice from a short sample | **Yes, with open models.** | Needs a GPU to generate. Fine for clips made once and saved (revision notes, lesson replays); expensive for every live reply. |
| "Anyone's voice" | **Only your own voice, or with that person's recorded consent.** | Copying someone's voice without consent is impersonation. India's 2026 IT rules require synthetic audio to be labelled. We must block it (§4.3). |

## 3. The virtual teacher (a realistic 3D person, ₹0)

The owner chose a **real-looking 3D human**, not a cartoon (2026-11-22):
"it can move left, right, turn around… sit down… talks and interacts well…
multiple ones so that it can be selected". It is built from existing open
tools, not drawn by us.

### 3.1 What it is made from (all free and open)

- **People:** the Microsoft Rocketbox Avatar Library (MIT licence, 115
  rigged, realistic humans with face shapes for speech). Four ship now:
  Maya, Elena, Kai and Victor (`client/public/teachers/`, 3–5 MB each, with
  the MIT notice in `LICENSE-rocketbox.md`).
- **Converter:** `scripts/teacher/convert-rocketbox.py` runs Blender as a
  Python module: it poses each avatar, rebuilds the skeleton with standard
  (Mixamo) bone names, keeps 69 face shapes renamed to the Oculus visemes and
  ARKit names, resizes the textures and writes one GLB. Usage is in the file.
- **Runtime:** TalkingHead 1.8.2 (MIT, `@met4citizen/talkinghead`) on
  three.js, in a transparent canvas. It gives idle breathing, blinking, eye
  contact, hand gestures, poses and lip shapes. Its lip-sync rules are
  imported by us (`lipsync-en.mjs`), never fetched at run time.
- Ready Player Me (the usual avatar source) shut down on 2026-01-31, so it
  is not used.

### 3.2 What it does now (T1, built)

- **Choose:** Settings → Preferences → Virtual teacher: Off (default) or one
  of four faces, and a size (small, medium, large). "Say hello" makes the
  teacher introduce itself.
- **Talks:** every sentence the site says aloud (`speak.ts`) is announced
  with its length (`onSentence`). The teacher plays silent audio of that
  length with each word's timing, so its lips follow our real voice (natural
  voice, Kokoro or the device's voice). Hindi is written in Roman letters
  first (`teacher/lipsync.ts`). A speech bubble shows the sentence, with the
  "AI voice" label and Stop (it replaces the separate chip while shown). The
  male teachers get a male voice when the student picked none.
- **Body, by voice or its buttons:** go left, go right, come here (middle),
  turn around, sit down, stand up, wave, namaste, thumbs up, point, hide,
  show, introduce yourself. In English, Hinglish and Hindi
  (`voice/actions/teacherSpecs.ts`, in the command test set). When it moves
  it glides there with its body turned the way it goes.
- **Never in the way:** the drawing lets every click through; only its name
  bar (move, sit/stand, hide) is clickable. Hidden, it leaves a small "Show
  Maya" button. Its place is remembered in the browser. It is not shown in
  the exam console. It stops drawing while the tab is in the background.
- **Loads only when on:** three.js, TalkingHead and the model are lazy
  (`TeacherHost.tsx` → `TeacherLayer.tsx`); a portrait shows while it loads.
  Without WebGL 2 it says so plainly.
- **Reduced motion:** it appears in its new place instead of gliding, and
  idle head movement is smaller.

### 3.3 Honest limits

- **No walking legs yet.** It glides (turned sideways) rather than taking
  steps. Mixamo's walk animations may not be redistributed, so a walk cycle
  needs our own keyframes or a CC0 source (T2).
- Lip shapes come from the words' spelling and timing, not from the sound
  itself. Azure's exact viseme events are a later improvement.
- The browser picture is a little less rich than an offline render. On older
  phones the first load is 3–5 MB plus 1 MB of 3D code, and drawing costs
  battery; it is off by default for that reason.
- The site's security policy allows `blob:` connections, because the 3D
  loader unpacks the model's own textures that way.

### 3.4 Next

- **T2 — guide:** a places registry (`data-guide` names on each page), fly
  to a button and point at it (TalkingHead `touchAt`/IK), click it for the
  student, page tours, "point at line 12", "what's on your right", and a real
  walk cycle. The server only accepts place names that exist on the page.
- **T3 — whiteboard:** the teacher opens a board and writes and draws a
  diagram step by step while explaining, from Guru's structured steps.

## 4. Ears, speed and voices

### 4.1 Ears (speech to text), in order of use

| Link | What | Why |
|---|---|---|
| 1 | The browser's own recognition (on the device where supported) | Free, instant, private; good for English commands |
| 2 | **Whisper large-v3-turbo on Groq** (free tier) | Very fast (a short clip in well under 1 s), 99 languages, strong Hinglish; needs the owner's free Groq key |
| 3 | **IndicConformer (AI4Bharat, MIT)** on our own server or a free host | Best open model for 22 Indian languages |
| 4 | **Meta Omnilingual ASR** (open, Apache-2.0, 1,600+ languages) | Rare languages; check the licence of the exact release before use |
| 5 | Cloudflare Workers AI Whisper (free daily allowance) | Overflow |
| 6 | Typed input | Never stuck |

The chain switches by itself when one link is full or slow (blueprint §7).
After recognition, our **normaliser** turns "i plus plus" into `i++` and
"mid ko update karo" into the intent, using the page's own action and
variable names as hints. This part is ours and is where accuracy on code
words is won.

### 4.2 Speed: how to reach about 1 second

1. Stream everything: the ears send words while you speak; Guru starts on
   the partial sentence; the first sentence of the answer goes to the voice
   at once; audio plays as it arrives.
2. Fastest free brains first (Groq), short first sentence, details after.
3. **Answer cache**: the same doubt asked again (in other words) is answered
   from a saved, checked answer in about 100 ms. Most doubts repeat.
4. **Pre-made answers** for the top doubts per lesson and question, voiced
   once and saved.
5. Commands never touch an AI (under 400 ms).

Targets (to measure from Indian networks before launch): commands < 400 ms;
cached doubts < 500 ms; new doubts about 1 s on Wi-Fi, ≤ 1.5 s on 4G.

### 4.3 Voices, including "my voice"

- Default voices: natural Indian voices (Azure free tier; open Indic
  Parler-TTS; Kokoro in the browser as the last link).
- **"My voice" (opt-in)**: open models can copy a voice from 5–30 seconds of
  speech, for example **Chatterbox (MIT licence)**. Check each model's
  licence before use: XTTS-v2 and the F5-TTS base weights are
  non-commercial, so we don't use them.
- **Only your own voice, or a voice with recorded consent.** The safety
  rules in blueprint §4.5.1 are required:
  - 18+ only, or a parent's permission.
  - A live check: read a random sentence aloud, so a downloaded clip of
    someone else fails.
  - Keep the voice fingerprint only and delete the recording.
  - No downloads, an inaudible watermark, and "AI voice" always shown.
  - Never used in public places such as posts or live rooms.
- Cost: copying a voice needs a GPU. Clips made once (revision notes,
  explain-back replay, reminders) are cheap. Every live reply in a copied
  voice is the most expensive path, so it gets a small daily quota, and
  only if startup credits come.

## 5. What we can build ourselves (the real innovation)

Building speech or voice models from nothing needs thousands of GPU hours
and huge licensed datasets, so that is not realistic for free. These parts
are ours, and they make the biggest difference:

1. **Bharat Code Speech**: our own consented recordings of students saying
   code and CS terms in Hinglish and Indian languages. Nobody has this data.
   With it we fine-tune Whisper or IndicConformer (small LoRA add-ons, free
   GPU hours on Kaggle or Colab) and measure the gain.
2. **The normaliser and router**: code words, variable names and page
   actions as hints. Rule-based and tested, no AI.
3. **Guru's grounding and Leak Guard** (built): answers come only from
   verified lessons and solutions; option letters, final answers and code
   are blocked on unsolved questions.
4. **Guru fine-tune** on open-licence teacher data (never closed models'
   outputs, `docs/voice/TRAINING.md`), run on the device for capable
   laptops (Guru S/M/L, blueprint §4.6).
5. **The teacher character and its place map**: no other learning site has
   a teacher that walks to the exact button and explains it from the
   site's own data.
6. A small **sound-to-mouth model** for better lip sync (optional).

## 6. Accuracy: how we keep wrong answers out

- Answer only from our verified content (retrieval); if nothing matches,
  say "I'm not sure, here is where to look", never guess.
- A second check: a different free model reviews each new answer against
  the source before it is cached.
- Fixed test sets: `docs/voice/tests/*.json` (commands, Scene Voice, code
  edits) plus a new `tutor.json` (doubts with checked answers) and
  `asr-<lang>.json` (spoken clips with exact text). Each runs in CI or
  weekly. Release gates: commands ≥ 95%; tutor faithfulness ≥ 90%; leak
  ≤ 2%; word error rate per language published, and a language turns on
  only when it meets its target.
- Every answer shows its source ("From: BFS lesson, step 4"), and students
  can mark a wrong answer, which removes it from the cache at once.

## 7. Build order

1. **Ears and natural voice** (chosen by the owner 2026-11-22, done #233–#239):
   - a Groq Whisper server link (`POST /api/voice/stt`, audio never stored);
   - the normaliser for code words;
   - natural voice links (Azure free tier, then Kokoro in the browser);
   - the speed measurements.
   It needs the owner's free Groq key (Admin → AI models → Add provider →
   Groq).
2. **Virtual teacher** (§3): T1 done (3D people, choose one, lip sync,
   body commands); T2 guide and T3 whiteboard next. ₹0.
3. **Streaming doubts** (§4.2): partial-sentence start, answer cache, `show`
   steps from Guru, sources shown.
4. **Bharat Code Speech** collection (consent flow exists) and the first
   Whisper LoRA fine-tune; per-language measurements.
5. **"My voice"** with the safety rules, clips made once only.
6. On-device Guru S/M/L.

## 8. What the owner needs to do

1. Add the free Groq key (console.groq.com/keys → Admin → AI models → Add
   provider → Groq). It unlocks fast ears and fast answers.
2. Optional: an Azure account for the free Speech tier (best Indian voices
   and exact lip-sync events). It needs a card for sign-up but has a free
   monthly allowance.
3. The teacher's look is chosen: realistic 3D people (Rocketbox, MIT).
4. For lessons in your own voice: record 10–20 minutes of clean speech and
   sign a consent note.
