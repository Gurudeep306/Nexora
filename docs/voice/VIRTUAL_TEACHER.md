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
  rigged, realistic humans with face shapes for speech). The owner asked for
  an Indian look and voice (2026-11-23), so seven were chosen and toned to
  look Indian: Priya, Kavya, Neha, Ananya, Arjun, Rohan and Dev
  (`client/public/teachers/`, 3–5 MB each, MIT notice in
  `LICENSE-rocketbox.md`; which avatar and toning in its README).
  `scripts/teacher/tint-skin.py` warms and deepens only skin-coloured pixels
  and makes the iris brown (the eyeball sits in the same place in every
  Rocketbox head texture). The first four (Maya, Elena, Kai, Victor) were
  retired; a saved choice moves to Ananya, Kavya, Arjun or Dev.
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
- **Talks, in an Indian voice:** our own free voice server
  (`deploy/voice-server`: HeadTTS, MIT, running Kokoro's four Indian voices,
  Apache-2.0, commercial use allowed) speaks English with an Indian accent
  and Hindi. Hindi is written as sounds by `src/voice/hindi-ipa.js` (schwa
  deletion, nasals, nukta; only Kokoro's symbols), so no GPL phonemizer is
  used. Each teacher has their own voice (`teachers.ts`). The server also
  returns the exact mouth shapes (visemes) and word times, which the teacher
  plays: lips match the sound. Other voices (device, Kokoro in the browser)
  fall back to word timing by length (`teacher/lipsync.ts`). A speech bubble
  shows the sentence, with the "AI voice" label and Stop.
- **Light:** a warm key light, a soft fill and slightly lower exposure, so
  skin keeps its colour and shape.
- **Body, by voice or its buttons:** go left, go right, come here (middle),
  turn around, sit down, stand up, wave, namaste, thumbs up, point, hide,
  show, introduce yourself. In English, Hinglish and Hindi
  (`voice/actions/teacherSpecs.ts`, in the command test set). When it moves
  it glides there with its body turned the way it goes.
- **Conversation mode (talk like a person):** the teacher's Talk button, or
  "let's talk" / "baat karte hain". The teacher greets you, then the mic
  opens by itself each time they finish speaking, so you just talk, no
  tapping (`client/src/voice/talk.ts`, `VoiceButton.tsx`). Each question goes
  to Guru with the teacher's name and gender and the last 8 turns
  (`src/voice/guru.js`: `personaFor`, `cleanHistory`, the `TALK` style: warm,
  short, natural, reacts and remembers, a little small talk then back to
  study, honest that it is an AI teacher; Hindi verb forms match the
  teacher's gender). All of Guru's rules still hold (free models only, Leak
  Guard, no help in a test). While you speak the teacher looks at you and
  shows your words; while thinking it glances away ("…"); while speaking its
  hands move. Commands still work mid-talk ("go left"). "Bye", "bas" or
  "stop talking" ends it with a wave; two quiet turns in a row end it too, so
  the mic is never left open.
- **Face and hands follow the words** (`teacher/expressions.ts`, rules, no
  AI): a smile for greetings and praise, thumbs up for "well done" /
  "shabaash", namaste for "namaste", a shrug for "I won't guess", pointing
  for "dekho"; otherwise the hands move a little while talking. A calm face
  (no smile) when the student sounds worried or stuck. A small nod when the
  student finishes speaking. When idle, now and then a glance at where the
  student points. Reduced motion: no gestures or nods.
- **Guide (T2, `teacher/guide.ts`, `findTarget.ts`):** the teacher finds
  things by the names people see, on any page, with no tagging
  (`data-guide-label` can give a clearer name):
  - "point at the Run button", "Settings kahan hai": scrolls to it, walks
    under it, turns, looks and points with the hand on that side, outlines
    it, says "Here it is".
  - "click Run", "Run dabao": the same, says "Okay, pressing Run", then
    presses it. Never presses anything that changes or loses something
    (submit, delete, sign out, reset, send…): points and asks the student
    to press it.
  - "point at line 12": in the code editor in use, scrolls to the line,
    selects it, points and reads it.
  - "what's on your right?": names the nearest three things on that side.
  - "give me a tour" / "is page ke baare mein batao": what the page is (from
    the Explore list, true names only), then up to four main things on it,
    walking to and pointing at each; any new command stops it.
  The sentence shapes are strict (whole sentence), so a question like
  "where is the mistake in my code" still goes to Guru.
- **Whiteboard (T3, `src/voice/board.js`, `teacher/Board.tsx`):** "explain
  binary search on the whiteboard", "board pe recursion samjhao", "open the
  whiteboard" (this page's topic), or the Board button. A free model writes
  a short lesson as 3–6 steps; each is a spoken sentence or two plus shapes
  in a tiny drawing language (text, box, circle, arrow/line, array with
  highlights and pointers, clear). The server checks it strictly (known
  shapes only, kept on the 100×60 board, short text, at most 8 steps and 14
  shapes a step; HTML tags removed, comparison signs kept), and on an
  unsolved question Guru's Leak Guard reads everything said and written
  (the prompt also asks for a different example); no board during a test.
  The board draws each step stroke by stroke and writes text left to right
  (in the student's handwriting font if they chose one), the teacher stands
  beside it, points at what was just drawn and explains; then the next step.
  Pause, back, next, start again and close, by button or voice ("aage",
  "ruko", "phir se bolo", "board band karo"). While the board is open its
  caption carries the "AI voice" label. Reduced motion: no drawing
  animation.
- **Never in the way:** the drawing lets every click through; only its name
  bar (move, sit/stand, hide) is clickable. Hidden, it leaves a small "Show
  Maya" button. Its place is remembered in the browser. It is not shown in
  the exam console. It stops drawing while the tab is in the background.
- **Loads only when on:** three.js, TalkingHead and the model are lazy
  (`TeacherHost.tsx` → `TeacherLayer.tsx`); a portrait shows while it loads.
  Without WebGL 2 it says so plainly.
- **Reduced motion:** it appears in its new place instead of gliding, and
  idle head movement is smaller.

### 3.2.1 The teacher listens, not the website (2026-11-23, #257)

The owner's ask: "I want the 3D model to listen, not the website." With a
teacher on screen, every voice turn is hers (`VoiceButton.tsx`, `TEACHER_SHOWS`):
she looks at the student and nods now and then while they speak, her bubble
shows the words being heard and "Cancel", she glances away while thinking,
and she answers in her voice, or in her bubble when sound is off. The website
box stays only for things that need a tap (confirm, choose, "did you mean").
The exam console keeps its own mic and box.

- **Conversational speech:** with a teacher on screen every answer uses the
  spoken-conversation style (`TALK` in `src/voice/guru.js`: react first, short
  and medium sentences, contractions, Hinglish the way students talk, one
  question back), and the voice pauses between sentences like a person,
  longer after a question (`gapAfter` in `sentences.ts`).
- **Interrupting:** in a conversation, starting to talk while she speaks stops
  her and she listens (`bargeIn.ts`: echo cancellation, a level well above what
  the mic hears while she talks, held for 350 ms; two false alarms turn it off
  for the session; nothing is recorded, only loudness is read).
- **A natural voice, offered once:** without the voice server she would use the
  device's robotic voice, so she offers Kokoro in the browser (one-time
  download, Apache-2.0) herself (`VoiceOffer.tsx`); "Not now" is remembered.
- Tapping her body to talk was tried and left out: her picture area is
  click-through so the page under her stays usable; her Talk button starts a
  conversation.

### 3.2.2 She remembers you, and can think on your device (2026-11-23, #258)

- **Memory** (`src/voice/memory.js`, table `teacher_memory`, one row per student):
  learned by rules from what the student says and the page they are on, no
  AI. It keeps their name if they say it ("my name is…", "mera naam … hai",
  "call me…"), their goal (GATE, placements…), up to six recent topics and
  up to four things that felt hard, plus how many turns they've had.
- **Privacy**: the AI is given study facts only (goal, topics, what was
  hard), as one short system line. The name she remembers is used only in
  greetings built on our server ("Welcome back, Asha! Last time we were on
  heaps…") and spoken by our own voice; it is never added to an AI prompt
  (checked by the browser sweep with a stand-in model).
- **See and erase it**: Settings → Virtual teacher → "What she remembers"
  lists everything, with "Forget all of it" (`DELETE /api/voice/teacher/memory`).
- **Her own brain**: the same settings card offers the on-device Guru
  (Qwen3.5, WebGPU, `voice/brain/`) as her brain, so she thinks on the
  device instead of a server. While it is answering, a small chip shows in
  her bar. The server still decides per turn: unsolved questions, tests and
  Explain-back stay on the server so answer keys never reach a device.

### 3.2.3 She reacts to your results, and a studio light (2026-11-23, #259)

- **Reactions** (`voice/teacher/reactions.ts`, `teacherReact` in `store.ts`):
  - When the judge returns a verdict on the Solve page (not in a contest), or
    a GATE practice or daily question is graded (never in a timed test), she
    reacts like a teacher beside you:
    - Accepted: a thumbs up and a smile.
    - Examples only, or a correct GATE answer: the "OK" sign.
    - A wrong answer, time limit or crash: a calm nod and one line of general
      advice (never a thumbs down).
    - The third miss in a row: she offers a hint.
  - Lines are varied, in English or Hindi. Each one is checked to contain no
    digits, option letters or code, so nothing about the answer leaks.
  - She speaks the line if reading aloud is on; otherwise it shows in her
    bubble. She stays quiet while she is already talking or in a
    conversation turn, and reacts at most once every 5 seconds.
- **Light**: a soft, cool back light (the library's spot light, behind and
  above her) separates her from the page in both themes, like a studio
  portrait. It was compared side by side in light and dark with no back
  light and a stronger one; the softer setting looked the most natural.

### 3.2.4 The voice, reworked (2026-11-23, #260)

The owner found her voice robotic, choppy, odd on some words and out of step
with her lips. The causes, and what changed:

- **Robotic:** without a voice server she uses a voice built into the
  device, and the site took the first one listed for the language. On a Mac
  that is often a robotic one. Now `deviceVoice.ts` scores every voice:
  - the right language;
  - natural ones first (Edge "Online (Natural)", macOS "Premium" or
    "Enhanced", Google);
  - the teacher's gender;
  - novelty voices last.
- **Odd words:** the conversation prompt told the AI to open English answers
  with Hindi words ("Achha", "Haan, dekho"), and a few of her fixed lines had
  "Shabaash". An English voice says these badly. Now Hindi words are used
  only when the student speaks Hinglish.
- **Choppy:** every sentence was a separate clip with an added pause on top
  of the voice's own. Now sentences are joined into a few pieces
  (`speechChunks`: a short first piece so she starts at once, then up to 180
  characters), with no added pause.
- **Lips:** for the device voice, the length of each sentence was guessed, so
  the mouth drifted. Now the word starts the voice reports (`onboundary`,
  `onWord`) move her lips word by word. Voices that report none fall back to
  the guess.
- **For a natural voice for everyone:** set up the free voice server
  (`deploy/voice-server`: Kokoro on a free Oracle server). It gives every
  student the same Indian voices, with exact lip shapes. Azure's free tier is
  not an option: Microsoft allows commercial use of its voices only on the
  paid tier, which Admin → Voice recognition also says. The most natural
  Indian voices (IndicF5, Veena, Indic Parler) are free models but need a
  paid GPU server to speak in real time.

### 3.2.5 A truer look, and teachers the student names (2026-11-24, #261)

- **Look** (`voice/teacher/look.ts`). Tuned by comparing renders side by side
  in light and dark, on a woman and a man teacher:
  - The library's ACES tone mapping washed the skin out and made it orange.
    Neutral tone mapping keeps real skin colour and depth.
  - Skin and clothes are matte (the models were as shiny as plastic).
  - Hair edges are cut cleanly, with no dark halo.
  - Textures are sharper at an angle.
  - The portraits are re-rendered to match
    (`scripts/teacher/render-portraits.cjs`).
- **Speed**: TalkingHead multiplies its pixel ratio by the screen's, and we
  passed up to 1.5, so a Retina Mac drew her at 3× (about 9× the pixels
  needed). Now she is drawn at no more than 2×.
- **Catalogue, no names**:
  - Settings → Virtual teacher shows looks ("Brown sweater, curly hair in a
    bun"), and the student names their teacher ("What will you call her?",
    `prefs.teacherNames`). Until then the teacher is "Teacher".
  - The name goes to the AI as the teacher's name (`personaFor(look, name)`),
    cleaned to letters only, at most 20 characters.
  - Anyone who chose a teacher before this keeps the old name.
  - Guru training examples use many names, so a model trained on them
    answers to any name.

### 3.2.6 A catalogue of voices, clearer and louder (2026-11-24, #262)

- **Voices** (`voice/voices.ts`): twelve of Kokoro's voices (Apache-2.0) on
  the student's device, women and men, American, British and Indian. Each
  has a name, a few words on how it sounds, and a play button (Settings →
  Virtual teacher → Voice).
  - By default the teacher uses the clearest voice for their gender. Kokoro
    grades Heart (woman) A; the Indian voices are graded C (little training
    data), which was part of why the voice sounded unclear.
  - Hindi always goes to a Hindi voice of the same gender.
- **Clearer:** a GPU without half precision used to fall back to the small
  compressed model on the processor, which sounds muffled. It now runs the
  full model on the GPU. Only devices with no WebGPU use the small model.
- **Louder:** each clip is brought to speaking level (`levelUp`: RMS 0.1,
  peaks never above 0.95).

### 3.2.7 A voice of your own, free and on the device (2026-11-24, #263)

The owner asked for students to give any voice (30 seconds to a minute) for
the teacher to speak in, with no cost at all.

- **Model:** Chatterbox (MIT, Resemble AI), the ONNX export from
  `onnx-community/chatterbox-ONNX`. It runs in a Web Worker on the student's
  GPU (WebGPU) through transformers.js (`voice/clone/worker.ts`).
  - About 1.5 GB, downloaded once: language model 305–354 MB, speech decoder
    540 MB, voice encoder 592 MB, text embeddings 62 MB.
  - Output carries Resemble's PerTh watermark.
- **Once per voice:** the sample (trimmed of silence, at most 15 s; at least
  8 s of speech) becomes a voice print in a few seconds.
- **Every sentence:** each sentence she says is made as she says it.
  - Measured on a 4-core processor without a GPU (2026-11-24): 7× slower than
    real time (5.4 s of speech in 47 s). That is too slow for a server
    without a GPU, so this runs on the student's own GPU.
  - In a real browser (headless Chromium on the processor, WebAssembly,
    2026-11-24), the whole pipeline worked: the model loaded in 104 s, the
    voice print was made, and a 3.5 s sentence was spoken in 250 s. The
    browser's processor path is far too slow, so the feature needs WebGPU.
    Its speed on a real GPU is measured on the student's device the first
    time.
  - The first sentence is timed. Below 0.8× real time she keeps her usual
    voice and says why.
- **Privacy and consent:**
  - The sample is kept only in the browser (IndexedDB) and is never sent
    anywhere. A test checks the clone code makes no network calls.
  - Recording and upload stay locked until the student confirms it is their
    own voice, or that its owner agreed. The recording starts with them
    reading a consent line.
  - "Delete this voice" erases it.
- **Limits:**
  - English only: the in-browser model doesn't speak Hindi yet, so Hindi
    sentences use her usual Hindi voice.
  - It needs WebGPU (Chrome or Edge on a computer with a good graphics chip).
  - Lips follow the sentence length, not exact mouth shapes.
- **Rejected, and why:**
  - A cloud GPU (Modal): its free credit is $30 a month, and the owner wants
    no paid plan at all.
  - The free Oracle server: it has no GPU and is too slow (measured above).
  - IndicF5: its licence for commercial use is unclear.

### 3.2.8 Full audit (2026-11-24, #265)

I read every file of the teacher (layer, host, store, talk, mic, speech,
board, guide, voices, own voice, memory) and checked each behaviour in a
real browser. What was wrong, and the fix:

| Flaw | Fix |
|---|---|
| Renaming the teacher reloaded the whole 3D model (the loader depended on the name) | The name only words messages (a ref); a sweep check marks the canvas and confirms it survives a rename |
| She showed (and could talk) in timed tests and contest papers: only `/gate/cbt` hid her | The exam console sets `exam` in the teacher store for its whole life; the host hides her |
| In a conversation the mic opened after 1.5 s even if her voice hadn't started yet (natural or own voice), cutting her first words | `aboutToSpeak()` in `speak.ts`; the conversation waits for the voice to start (at most 20 s) |
| English greetings still said "Haan, bolo!" (an English voice says Hindi words badly) | Plain English; a test checks the rule greetings |
| After a page reload the student's own voice wasn't used until Settings was opened (the saved sample was only looked up there) | `checkSavedOnce()` before speaking |
| The own voice's first-time checks (voice print, speed test) could wait forever | Each has a 60 s limit; then her usual voice, with the reason in Settings |
| Whiteboard "say it again" / "start again" on the same step did nothing while playing | A replay counter re-runs the step |
| Unnamed teacher: "I'm Teacher", "Virtual teacher Teacher", "What Teacher remembers" | "Your teacher" in sentences, and "your NexoraGuru teacher" when she introduces herself |
| "Her own brain / her own AI chip" for men teachers too | His or her, by the teacher |
| Phones: her button bar ran off the right edge, and the assistant's round button sat on it | On phones she stands above that button; the bar aligns with her screen edge and keeps only its buttons (the name stays in the region's label) |

Checked and fine:
- Layering: dialogs, menus and tooltips all sit above her.
- The board's server-side checks: known shapes only, numbers kept inside the
  board, text limits, the Leak Guard.
- The guide never presses risky buttons.
- Memory never puts the name in a prompt.

### 3.2.9 She listens like a person, and her words light up as she says them (2026-11-24)

- **Lips follow the real sound.** Voices that give no word times (the
  student's own voice, Azure's) now send their loudness every 20 ms
  (`energyEnvelope` in `lipsync.ts`, from the clip in `speak.ts`). The words
  share only the time the voice is sounding (`wordTimesByEnergy`), so the
  mouth rests in every pause and a word never stretches across one. Voices
  with exact mouth shapes (our voice server, the on-device voices) keep them.
- **Captions lit word by word.** The sentence in her bubble shows the words
  already said in full ink, the current word underlined in the accent, and
  the rest quieter (`Caption`, `captionStarts`, `wordAt`). It follows the
  voice's own word times; with the device voice it follows each word the
  voice reports (`sameWord`). It scrolls itself, never the page.
- **Listening body language** (`presence.ts`): she leans in a little, tilts
  her head towards the page, lifts her brows, half-smiles; with our own ears
  she nods as the student starts each phrase (`nodder`, from the mic level
  `onMicLevel` in `capture.ts`). Thinking: lips pressed, brows drawn a
  touch, eyes up and aside. Held a moment at a time, so nothing sticks;
  reduced motion keeps the face and drops the lean and tilt. A question she
  asks ends with raised brows.
- **A mic meter** in her listening bubble: five bars that rise with the
  student's voice (with the browser's own ears, a pulse as words arrive).
- **Thinking shows what was asked** ("“what is a stack”", then three soft
  dots), said or typed (`talk.asked`).
- **Type to her** (the keyboard button on her bar): handled exactly like
  spoken words (`askTyped` in `talk.ts`, taken by the top-bar mic's
  `decide`; never by the exam console's). With the voice off her answer
  stays above the box, like a chat.
- **Drag her** by her name bar; she settles on the nearest side (left,
  middle, right). The move button still does it from the keyboard.
- **Bubble**: a tail towards her, sits just above her head, a short fade-in
  (none with reduced motion). On phones the bar now always fits beside her
  (her grid column is exactly her width).

Tests: `tests/voice-teacher.test.js` (sound-following lips, captions in
English and Hindi, presence shapes present in every model, nods, typing).
Browser: typing, thinking, the answer, dragging, captions moving word by
word, axe 0 in light, dark and at 360 px, no sideways scroll.

### 3.2.10 The Teacher studio, a tidy bar and new settings (2026-11-24)

- **Teacher studio** (`/teacher`, `TeacherStudio.tsx`, `studio.css`): one page
  for everything about the teacher, with the real teacher standing large in
  a preview and changing as the settings change. The preview is not a
  second drawing: the page marks a box (`Stage`) and TeacherLayer stands in
  it (`store.anchor`; she is hidden while the box is scrolled away). Under
  her: Say hello, Talk, Wave, Namaste, Thumbs up, Turn around. Sections:
  who teaches you (the catalogue), name, voice (speed, read aloud, the
  voice catalogue, your own voice), on screen (framing, size beside pages,
  captions), behaviour, memory and privacy (memory, the on-device brain).
  Settings → Preferences keeps one short card that opens it. Reached from
  that card, her menu, Explore and the spoken command "teacher studio" /
  "teacher badlo". It is deliberately **not** a spoken place in the nav
  list: "Teacher …" as a place made "teacher dikhao" ambiguous (the sweep
  caught it).
- **New settings** (`prefs.ts`): speaking speed (`rate`: Slower 0.85,
  Normal, Faster 1.15; the on-device voices speak at that speed themselves,
  other voices are played faster or slower with the pitch kept, and the
  lips and captions follow the new times); framing (`teacherView`: face,
  upper body, to the waist); captions on or off; hands while talking;
  reacting to results; glancing where you point.
- **Her bar**: name, Talk, Type and one **More** menu (whiteboard, move,
  sit or stand, wave, Teacher studio, hide) instead of seven small icons.
  A real menu: arrow keys, Home/End, Escape returns to the button, a click
  outside closes it.
- **Fixed**: what she remembers said "she" for men teachers; the catalogue
  cards were see-through, so a theme's night sky showed through them.

Browser: `scripts/voice/sweep/teacher-studio.cjs` (22 checks: she stands
centred in the preview; framing, speed and captions save; a new name shows
on her bar; the menu by keyboard; the Settings card; axe 0 and no sideways
scroll in light, dark, 360 px and with no teacher).

### 3.3 Honest limits

- **No walking legs yet.** It glides (turned sideways) rather than taking
  steps. Mixamo's walk animations may not be redistributed, so a walk cycle
  needs our own keyframes or a CC0 source (T2).
- Exact lip shapes need the voice server; with the device's own voice the
  lips follow the words' length only.
- Azure Speech's free tier is **not** used: Microsoft's terms give
  commercial rights to the paid tier only, and NexoraGuru is (or will be)
  commercial. It stays behind an off switch for non-commercial sites.
- No free tool with clear commercial terms makes a 3D person from a photo
  (checked 2026-11); Rocketbox, toned, is the best free option. MetaHuman
  may only be rendered in Unreal Engine, so not on a web page.
- The browser picture is a little less rich than an offline render. On older
  phones the first load is 3–5 MB plus 1 MB of 3D code, and drawing costs
  battery; it is off by default for that reason.
- The site's security policy allows `blob:` connections, because the 3D
  loader unpacks the model's own textures that way.

### 3.4 Next

- **T2 — guide:** done (point, press, line, side, tour). Still to do: a
  real walk cycle (our own keyframes or a CC0 source), and Guru's answers
  choosing places to point at.
- **T3 — whiteboard:** done. Next: trees and graphs as shapes, and the
  board from Guru's answers in conversation mode.

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
