# Speak the idea, show the code

**Short answer.** Yes, both are possible, and the parts exist today. But the best design is not "say the code, the AI types it". **Students should speak ideas, approaches and pseudocode. The code should appear on screen, where they can see it, check it and fix it.** Research shows speech recognition gets code words badly wrong without help: about **28% of words wrong** for a normal English model on spoken Java, falling to **5.5%** after adaptation ([Nowrin & Vertanen](https://www.keithv.com/pub/linebyline/nowrin_spoken_program_rec.pdf)). Spoken prompts also make AI code worse: about **6–7 points lower** than typed prompts ([arXiv 2608.03970](https://arxiv.org/html/2608.03970v1)). Voice tutors that read code aloud confuse beginners ([arXiv 2509.10596](https://arxiv.org/pdf/2509.10596)). So the plan is: **(1)** speak an approach in Hinglish or any Indian language, **(2)** see it cleaned into short pseudocode you confirm, **(3)** turn it into code in the editor, **(4)** run it on the judge and watch it animate, and **(5)** talk about it with the tutor, who asks questions and never dictates the answer. Whole-site voice control is also possible, but it is **not new**. Phones and laptops already have voice control. What is missing is **Indian-language commands**: Android, Apple and Windows voice control offer no Hindi, so NexoraGuru must build its own. Build it on one list of site actions, with a fast rule matcher first and a small AI model only as backup. The ideas NexoraGuru can truly own are the ones that use its step-tagged animation engine: **voice control of animations by meaning** ("go back to the swap", "what if the array was sorted?"), and **"animate what you said, bugs included"**. No product or paper doing these was found in this research.

> **How to read this report.** Links point to sources. **"(unverified)"** means the researchers could not confirm it. **"Conflict"** means two sources disagree. Many arXiv and Hugging Face pages could not be opened in full, so some numbers come from search previews. **"Not found" means not found in about 70 searches, not proven absent.** Check before claiming "world first".

---

## Ten words you need

| Word | Plain meaning |
|---|---|
| **ASR** | Speech-to-text. The "ears". |
| **TTS** | Text-to-speech. The "mouth". |
| **WER** | Word error rate. The share of words the ears get wrong. Lower is better. |
| **Biasing** | Giving the ears a short word list ("dp array", "prefix sum") so they spell those words right. |
| **Normalizer** | A fixed rule list that turns "plus plus" into `++` and "less than equal" into `<=`. No AI. |
| **Tree-sitter** | A free tool that reads code and knows its structure (this is a loop, this is a function). Runs in the browser. |
| **Monaco** | The code editor on the Solve page (the same editor as VS Code). |
| **Action registry** | One list of everything a user can do on a page ("play animation", "choose option B"), each with a name and rules. |
| **WebMCP** | A new browser standard that lets a web page publish its actions to AI agents. Still in trial. |
| **Guardrail** | A rule, enforced in code, that stops the AI from doing something (like giving the full answer). |

---

## What already exists, and where it stops

### Voice coding tools: dictating prompts, not code

Voice coding has two families. The first is **command grammars**. You learn a special spoken language. **Talon** is the expert standard; it reached version 1.0 on 20 September 2026 ([Talon changelog](https://talonvoice.com/dl/latest/changelog.html)). **Cursorless** (MIT licence) adds it to VS Code. It puts a small coloured "hat" on every word of code, so you can say "take blue air" to pick a word ([awesome.ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fcursorless-dev%2Fcursorless)). These tools are fast and exact. But they take weeks to learn. Users are mostly people with hand injuries. A learner has no time for this. One blogger describes the long learning curve after an injury ([whitep4nth3r](https://whitep4nth3r.com/blog/how-i-learned-to-code-with-my-voice/)). *One third-party page says Talon's Linux support moves to a paid $25/month tier; this is unverified* ([LumeVoice](https://lumevoice.com/vs/talon-voice/)).

The second family is **natural speech plus AI**. Big companies tried and pulled back. **GitHub Copilot Voice** ended on 3 April 2024. GitHub called it mainly an accessibility tool ([GitHub Next](https://githubnext.com/projects/copilot-voice)). **Serenade** went fully open source (Apache-2.0) in 2022; no later activity was found ([GitHub](https://github.com/serenadeai/serenade)). Today almost every AI coding tool has voice, but it is **dictation of the request**, not of the code. **Claude Code** has push-to-talk dictation ([docs](https://code.claude.com/docs/en/voice-dictation)). **Replit** turns speech into chat text that you review first ([docs](https://docs.replit.com/features/agent/voice-mode)). **Aider** has a `/voice` command ([docs](https://aider.chat/docs/usage/voice.html)). **VS Code** has a "Hey Code" wake word and offline dictation on supported desktops ([VS Code docs](https://code.visualstudio.com/docs/configure/accessibility/voice)). **Cursor** is the one exception: since November 2026 its agents talk back in a two-way voice chat ([Cursor docs](https://cursor.com/docs/agent/voice-chat)). Users report many voice bugs in Cursor's dictation ([Cursor forum](https://forum.cursor.com/t/voice-mode-no-live-transcript-submit-keywords-never-send-finalize-on-stop-only/165822)). **Wispr Flow** sells dictation that writes `camelCase` and file names correctly, but those claims come only from the vendor ([Wispr Flow docs](https://docs.wisprflow.ai/articles/8554805225-variable-recognition)). It launched in India with Hinglish dictation and calls voice AI in India "hard" ([TechCrunch](https://techcrunch.com/2026/05/09/voice-ai-in-india-is-hard-wispr-flow-is-betting-on-it-anyway/)).

**The gap.** All these tools serve experts who want the AI to write code. **The AI does the thinking.** That is the wrong pattern for a learner. None has a protected "don't give the answer" mode.

### Research: small, scattered, and pointing one way

Research on spoken code agrees on a few things. Beginners drop symbols and punctuation when they read code aloud, and they find edit commands slow to learn ([SIGACCESS](https://www.sigaccess.org/newsletter/2022-01/nowrin.html)). Beginners say code word by word; experts speak more naturally ([Nowrin & Vertanen, CUI 2023](https://www.keithv.com/pub/progvoice)). People speak faster when the target line is highlighted ([ACM CUI 2023](https://dl.acm.org/doi/fullHtml/10.1145/3571884.3597130)). An old system, VoiceGrip, already turned a spoken "pseudo-syntax" into code, with about 2.7% symbol errors ([VoiceGrip](https://link.springer.com/content/pdf/10.1023/A:1011323308477.pdf)). An English-like spoken syntax beats dictating raw code ([Gordon & Luger](https://www.cs.unm.edu/%7Eluger/resumepapers2015/2018%20papers/GordonLuger.pdf)).

**The closest Indian work is from IIT Bombay.** **CodeVaani** (2025) lets learners ask questions about code by voice in Indian languages, inside the Bodhitree LMS. Its chain is: Indian ASR, then an AI that repairs code words in the transcript, then a code model. In a survey of 53 engineering students, **54.7% preferred voice to text**. Errors remained on variable names, operators and keywords ([arXiv 2511.20654](https://arxiv.org/abs/2511.20654v1)). **"Lost in Transcription"** (2026) showed that ASR errors in Hindi, Bengali, Tamil and Gujarati break code tasks, and that AI repair of the transcript "significantly improves" results ([arXiv 2601.15339](https://arxiv.org/abs/2601.15339)). **The gap:** CodeVaani answers questions about code. It does not help students write code or pseudocode.

### Whole-site voice control: exists, but not in Indian languages

Every operating system has voice control. They all find buttons through the page's **accessibility tree** (the hidden list of buttons and names that screen readers use). You say a button's name, or say "show numbers" and then a number, or use a grid ([Apple](https://support.apple.com/guide/mac-help/use-voice-control-commands-mh40719/26/mac); [Google](https://support.google.com/accessibility/android/answer/6151854)). **None supports Hindi or any Indian language.** Apple Voice Control offers English (India) but no Indian languages ([Apple India](https://apple.com/in/ios/feature-availability)). Windows lists English (India) on one page, but Microsoft's own pages disagree on the language list (**conflict**) ([Microsoft setup](https://support.microsoft.com/en-us/accessibility/windows/voice-access/set-up-voice-access); [command list](https://support.microsoft.com/en-us/topic/voice-access-command-list-dac0f091-87ce-454d-8d57-bef38d3d8563)). Android Voice Access, India's main platform, lists no Hindi in a search preview of Google's page (*unverified for late 2026*) ([Google Help](https://support.google.com/accessibility/android/answer/6151848)).

Commercial in-app voice tools have mostly faded. Speechly was bought by Roblox in 2023 ([Voicebot.ai](https://voicebot.ai/2023/09/19/roblox-acquires-voice-ai-moderation-startup-speechly/)). **Picovoice's free tier ended on 30 June 2026** per a user forum, but its pricing page still mentions a free plan (**conflict**) ([HA forum](https://community.home-assistant.io/t/fyi-picovoice-confirmed-free-tier-accesskeys-will-stop-working-after-june-30-2026/1012744); [Picovoice pricing](https://picovoice.ai/pricing)). No maintained open-source React library for "voice-control the whole site" was found. **The gap:** no learning app was found that combines page-aware voice commands, a tutor that knows the current lesson and animation step, and Indian-language commands.

### Indian voice tutors: busy market, no coding focus

Indian voice-first edtech is active. PhysicsWallah runs a Hinglish voice tutor ([createwith](https://www.createwith.com/tool/elevenlabs/updates/physicswallah-triples-student-engagement-with-elevenlabs-voice-ai-tutor)). Infinity Learn launched "AINA" ([Tribune](https://www.tribuneindia.com/news/business/infinity-learn-unveils-aina-indias-first-voice-first-ai-powered-mentor-to-revolutionize-exam-preparation-2)). IIT Madras and AI4Bharat launched Bodhan AI in 22 languages ([Careers360](https://news.careers360.com/iit-madras-bodhan-ai-ai4bharat-launches-four-open-models-indian-languages-digital-public-goods-sovereign-ai-student-teacher-bot)). **No Hinglish voice tutor for coding or GATE CSE was found.** Scaler, GeeksforGeeks, CodeChef and Coding Ninjas were not checked one by one, so this needs a direct check.

---

## The pipeline: each part, its licence, accuracy and speed

### The ears get code words wrong, but cheap fixes work

Plain ASR fails on code. The numbers below are the best evidence found.

| Finding | Number | Source |
|---|---|---|
| Normal English ASR on spoken Java | 28.4% WER | [Nowrin & Vertanen](https://www.keithv.com/pub/linebyline/nowrin_spoken_program_rec.pdf) |
| After ~1 hour of spoken-code training | 8.7% WER | same |
| Plus a code word model and AI re-ranking | **5.5% WER** | same |
| Old VoiceCode tool, small study | ~50% WER | [Gordon & Luger](https://www.cs.unm.edu/%7Eluger/resumepapers2015/2018%20papers/GordonLuger.pdf) |
| Mixed-language (code-switched) speech | +30–50% more errors | [HiACC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12329218/) |
| Hinglish across models, same audio (vendor test) | 27%–70% WER | [Deepgram](https://deepgram.com/blog/hinglish-voice-ai-speech-recognition.md) |
| Hinglish medical test, fine-tuned open model | 19.3% | [arXiv 2603.06373](https://arxiv.org/pdf/2603.06373) |
| Clean Indian-accented English, Whisper-large | 11.2% | [Svarah](https://arxiv.org/pdf/2305.15760) |

**No one has measured WER on Hinglish code speech**, such as "array ka size n hai, loop chalao i se n tak". NexoraGuru must measure it.

The fixes stack. First, **give the ears a short word list**: the variable names in the student's code (read by tree-sitter) and the lesson's terms. Keep it short. Long word prompts in Whisper cost time and cause made-up words ([CB-Whisper](https://aclanthology.org/2024.lrec-main.262.pdf)). A special biasing method handled a 1,000-word list well without retraining ([arXiv 2306.01942](https://arxiv.org/abs/2306.01942)). Second, **run a normalizer** for symbols and Hinglish phrases. Third, **let an AI repair the transcript** using the editor as context, as CodeVaani does ([arXiv 2511.20654](https://arxiv.org/abs/2511.20654v1)). Fourth, **do not dictate brackets and indentation**. Build them from structure, since English-like speech beats raw dictation ([Gordon & Luger](https://www.cs.unm.edu/%7Eluger/resumepapers2015/2018%20papers/GordonLuger.pdf)).

### Ear options and licences

| Option | Licence | Where it runs | Fit |
|---|---|---|---|
| **Browser Web Speech API** | Free, built in | Chrome/Edge; on-device from Chrome 139 with `processLocally` ([MDN](https://developer.mozilla.org/docs/Web/API/SpeechRecognition/processLocally)) | Best for short commands. Supports a boosted phrase list (`phrases`) ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/phrases)). Hindi quality unknown. Firefox only behind a flag ([W3C TAG](https://tag-github-bot.w3.org/gh/w3ctag/design-reviews/1038)). |
| **AI4Bharat IndicConformer 600M** | MIT | Server (needs AI4Bharat's NeMo fork) | All 22 official languages ([GitHub](https://github.com/AI4Bharat/IndicConformerASR)) |
| **IndicWhisper (Vistaar)** | Open source | Server | Best on 39 of 59 Indian benchmarks, but trained on single-language speech, not Hinglish ([ar5iv](https://ar5iv.labs.arxiv.org/html/2305.15386)) |
| **Shunya Labs zero-stt-hinglish** | Check card | Server | Hinglish, built on Whisper Medium; no WER published ([HF](https://huggingface.co/shunyalabs/zero-stt-hinglish)) |
| **Sarvam Saaras v3 / v4** | Paid API | Sarvam cloud | Built for Hinglish and Tanglish; v4 offers a code-mixed output mode ([Sarvam](https://www.sarvam.ai/blogs/introducing-saaras-v4)) |
| **Bhashini (Govt. of India)** | API key; free terms unverified | Govt. cloud, live WebSocket | ([Bhashini API](https://dibd-bhashini.gitbook.io/bhashini-apis/websocket-asr-api)) |
| **Whisper / Moonshine in the browser** | Varies; Moonshine non-English licence needs checking | Transformers.js, WebGPU | Small models suited to commands ([Transformers.js](https://huggingface.co/docs/transformers.js/en/guides/webgpu); [Moonshine](https://github.com/usefulsensors/moonshine)) |
| vosk-browser | Open source | Browser (WASM) | Last updated ~2 years ago; avoid ([GitHub](https://github.com/ccoreilly/vosk-browser)) |

**Privacy note.** Chrome's normal Web Speech mode sends audio to Google's servers. The new on-device mode keeps it on the device ([MDN](https://developer.mozilla.org/docs/Web/API/SpeechRecognition/processLocally)). Tell students which mode is in use.

### The brain: small code models in the browser, bigger ones on the server

| Model | Licence | Notes |
|---|---|---|
| **Qwen2.5-Coder 0.5B / 1.5B** | Apache-2.0 | Best licence-safe in-browser coders ([Qwen blog](https://qwenlm.github.io/blog/qwen2.5-coder-family/)) |
| Qwen2.5-Coder 3B | **Qwen-Research licence** | Stronger, but avoid for a commercial site until the terms are checked |
| **Qwen3.5 0.8B / 2B / 4B** | Apache-2.0 | General models, not code-specific ([VentureBeat](https://venturebeat.com/technology/alibabas-small-open-source-qwen3-5-9b-beats-openais-gpt-oss-120b-and-can-run)) |
| StarCoder2-3B | OpenRAIL-M (use limits) | HumanEval 31.7, weaker ([HF](https://huggingface.co/bigcode/starcoder2-3b/blob/main/README.md)) |
| Qwen3-Coder-Next (80B, 3B active) | Apache-2.0 | Server only ([Alibaba Cloud](https://www.alibabacloud.com/blog/qwen3-coder-next-pushing-small-hybrid-models-on-agentic-coding_602864)) |

A 4-bit 3B model runs at about **90 tokens (word pieces) per second** on an Apple M3 laptop in the browser ([WebLLM](https://arxiv.org/html/2412.15803v1)). **No speed data was found for the budget phones and laptops most Indian students use.** Expect much slower speeds and plan a server fallback. NexoraGuru already has a small coding model on a free Oracle server (`deploy/coder-model/`), which can be that fallback.

### Pseudocode is the right middle step

Pseudocode makes AI code much better. In PseudoEval, giving pseudocode raised the pass rate by **99% (Python), 87% (C++) and 67% (Rust)**. The main problem was solving, not syntax ([PseudoEval](https://arxiv.org/html/2502.19149v1)). Checking candidates by compiling and testing lifted success from **25.6% to 44.7%** in SPoC ([NeurIPS 2019](https://nips.cc/virtual/2019/poster/14163)). This fits NexoraGuru's judge well. **No paper was found on spoken pseudocode turned into code by AI**, and no grammar for GATE-style pseudocode exists. NexoraGuru can define a small one (CLRS-style: `for i = 1 to n`, `if … then`, `A[i] ← x`).

### Editing by voice: structure first, AI second

For small edits ("rename i to j", "delete line 5", "wrap this in a loop"), use **tree-sitter plus Monaco's `executeEdits`**. This is instant, needs no AI, and joins the undo history ([Monaco reference](https://tessl.io/registry/tessl/npm-monaco-editor/files/docs/editor-core.md); [web-tree-sitter](https://cdn.jsdelivr.net/npm/web-tree-sitter@0.27.0/README.md)). Check that tree-sitter grammar files match the library version; some older ones fail to load ([web-tree-sitter](https://cdn.jsdelivr.net/npm/web-tree-sitter@0.27.0/README.md)). For bigger requests, the AI returns a patch. Show it in **Monaco's diff editor** (old and new side by side) and let the student accept by voice ("haan, laga do") ([Tessl](https://tessl.io/registry/tessl/npm-monaco-editor/files/docs/editor-core.md)). Use `createDecorationsCollection`, since `deltaDecorations` is being retired ([Monaco changelog](https://apievangelist.com/assets/js/monaco-editor/CHANGELOG/)).

### Speed: what feels instant

People pause about **239 ms** between turns in conversation ([arXiv 2404.16053](https://arxiv.org/html/2404.16053v1)). Delays over about 500 ms feel slow (vendor view) ([AssemblyAI](https://www.assemblyai.com/blog/low-latency-voice-ai)). A 2026 benchmark counts a reply as "late" at **2.75 s**, or 4 s when a tool is used ([EVA-Bench](https://arxiv.org/pdf/2605.13841)). The budget below is an **estimate, not measured**:

| Step | Target |
|---|---|
| End of speech detected | 200–300 ms |
| Final transcript | 150–400 ms |
| Normalizer + tree-sitter command | under 20 ms |
| Monaco edit | under 16 ms (one screen frame) |
| AI transcript repair, browser 0.5–1.5B model | 0.6–2.5 s |
| Whole function from server, streamed into diff | 2–5 s |
| Judge compile + tests | seconds, in the background |

So: **commands feel instant; AI edits feel like a short wait.** Always show a live transcript and progress so the wait is visible. Run all models in Web Workers so animations never freeze ([LogRocket](https://blog.logrocket.com/how-to-build-a-real-time-voice-ai-agent-in-the-browser)).

### Site control: rules first, AI only when rules fail

Generic AI browser agents are slow and unreliable. browser-use claims 89.1% on WebVoyager tasks, but a replication found 60.2% when checked ([browser-use](https://browser-use.com/posts/sota-technical-report); [Notte](https://dev.to/andreanotte/opensource-web-agent-outclasses-browser-use-ne1)). Chrome warns these agents can be tricked by text on the page ("prompt injection") ([blink-dev](https://groups.google.com/a/chromium.org/g/blink-dev/c/gmYffo5WOE8/m/OJxuQRP3AAAJ)). A second AI that checks actions against the page gave a **+36 point gain** in DexAssist ([arXiv 2411.12214](https://arxiv.org/pdf/2411.12214)). The safer path is an **app-defined action list**. This is exactly what **WebMCP** standardises: `registerTool({name, description, inputSchema, execute})` ([WebMCP](https://github.com/webmachinelearning/webmcp)). It is in a Chrome trial (versions 149–156), with desktop launch planned in 157 and no Firefox or Safari support confirmed ([blink-dev](https://groups.google.com/a/chromium.org/g/blink-dev/c/gmYffo5WOE8/m/OJxuQRP3AAAJ)). Its name has changed (`navigator.modelContext` vs `document.modelContext`), so treat it as unstable.

Small models can pick the right action well. Salesforce's **1B xLAM model beat GPT-3.5-Turbo** on a function-calling test ([APIGen](https://arxiv.org/pdf/2406.18518.pdf)). For simple command matching, **annyang** (MIT, ~2 KB) still works ([GitHub](https://github.com/TalAter/annyang)). *react-speech-recognition (MIT) is rated "inactive" by Snyk* ([Snyk](https://security.snyk.io/package/npm/react-speech-recognition)). A hand-written matcher is simpler and avoids a stale dependency.

**The free accessibility baseline.** OS voice tools work only when each button's visible label matches its hidden name. This is rule **WCAG 2.5.3 "Label in Name"**, written mainly for speech users ([W3C](https://www.w3.org/WAI/WCAG21/Understanding/label-in-name)). Every NexoraGuru control should be a real `<button>` or `<a>`, quiz options real radio buttons, and the animation player real "Play", "Pause", "Next step" buttons. *axe has a rule for this (`label-content-name-mismatch`), unverified.* Hive's redesign already checks axe with 0 violations, so add this rule site-wide.

---

## What learning science says: make the student talk, keep the code on screen

### The evidence

**Explaining helps.** A meta-analysis of 64 reports (~6,000 people) found self-explanation gives an effect of **g = 0.55** (a solid, medium effect) ([Bisra et al. 2018](https://doi.org/10.1007/s10648-018-9434-x)). Question-style prompts ("why does this work?") gave 0.56 ([CHU table](https://www.clearinghouse.edu.tum.de/wp-content/uploads/2023/09/KR_25_ENG_Table.pdf)). **Explaining out loud tends to beat writing.** A 2021 meta-analysis found benefits only for oral explaining ([Lachner et al.](https://dspace.library.uu.nl/bitstream/handle/1874/413782/1_s2.0_S0959475220307337_main.pdf?sequence=1)). Oral explaining helped more for hard texts ([Jacob et al.](https://eld.bl.uk/catalog/100104279734_0x000001)). **Conflict:** a 2022 poster found no difference between speaking, writing and silent thinking during self-explanation ([APS 2022](https://www.psychologicalscience.org/conventions/archive/2022annual/paper/41040/)). All of this comes from reading tasks; **no trial compares spoken vs typed explaining in programming.** **Practice tests** beat re-reading, with gains lasting up to a year ([Adesope et al.](https://education.wsu.edu/documents/2018/01/rethinking-use-tests.pdf/)).

**AI that gives answers hurts.** In a study of ~1,000 students, an unguarded ChatGPT-like helper raised practice scores 48% but left students **17% worse on the real exam**. A guarded tutor kept exam scores level ([Bastani et al., PNAS 2025](https://ideas.repec.org/a/nas/journl/v122y2025pe2422633122.html)). A well-built course tutor beat active-learning classes with an effect of **0.63** ([Kestin et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260/)). Beginners with AI coding help often stop writing their own code ("shepherding") or hop between suggestions ("drifting") ([arXiv 2405.17739](https://arxiv.org/html/2405.17739v1)). One study found AI code submitted unchanged **49%** of the time ([CodeHelp](https://arxiv.org/pdf/2308.06921)).

**Prompt-only rules leak.** Harvard's CS50 Duck is told not to give code blocks, but still does so **up to a quarter of the time** ([Harvard Gazette](https://news.harvard.edu/gazette/story/2026/09/taming-the-duck-for-starters/)). A voice tutor for 9th graders gave correct feedback only **71.4%** of the time, and quality fell when it spoke code aloud ([arXiv 2509.10596](https://arxiv.org/html/2509.10596v1)).

**Students like voice, mostly.** Beginners liked voice coding more than experts did ([CONVO](https://arxiv.org/abs/2003.01318)). Given free choice, students mostly chose speech ([SIGCSE 2026](https://xinyinghou.org/assets/publications/papers/sigcse2026.pdf)). But only 8% of novices in one study often used speech tools ([CUI 2023](https://dl.acm.org/doi/fullHtml/10.1145/3571884.3597130)), and experts found speaking literal code slow and disliked it ([Begel, Microsoft Research](https://www.microsoft.com/en-us/research/?p=154727)). This is a mild **conflict**: liking voice for *talking* is not the same as liking it for *typing code*.

**Animations help about as much as debuggers.** A study of 421 students found algorithm animations and debuggers did similarly overall, with animations helping more as code got harder ([Illinois](https://experts.illinois.edu/en/publications/evaluating-algorithm-visualizations-debuggers-and-execution-towar/)). So an animation must be active (predict, ask, change input) to add value.

### Ten design rules from the evidence

| # | Rule | Why |
|---|---|---|
| 1 | **Speak ideas; show code.** Voice carries the approach and pseudocode. Exact code lives on screen. | Code ASR and code TTS both fail ([Nowrin](https://www.keithv.com/pub/linebyline/nowrin_spoken_program_rec.pdf); [arXiv 2509.10596](https://arxiv.org/pdf/2509.10596)) |
| 2 | **Never read code aloud word by word by default.** Summarise first ("a loop from 0 to n−1 with an if inside"), read a line only when asked. | Structure-first narration works better ([Brown](https://cs.brown.edu/~sk/Publications/Papers/Published/sbk-accessible-ast-blocks/paper.pdf)) |
| 3 | **Always show the live transcript, editable**, and confirm before anything runs. | Spoken prompts make worse code ([arXiv 2608.03970](https://arxiv.org/html/2608.03970v1)) |
| 4 | **Highlight the line being spoken about.** | People speak faster with it ([CUI 2023](https://dl.acm.org/doi/fullHtml/10.1145/3571884.3597130)) |
| 5 | **Transcribe faithfully in learning mode.** Do not let the AI quietly fix the student's logic. | The student must own the mistake to learn from it |
| 6 | **Enforce "no answer" in code, not only in the prompt.** Filter code blocks from tutor speech and text before the student has tried. | CS50 Duck leaks ~25% ([Harvard](https://news.harvard.edu/gazette/story/2026/09/taming-the-duck-for-starters/)) |
| 7 | **Make the student explain, predict and justify.** "What happens next step?" before revealing it. | g = 0.55 self-explanation ([Bisra](https://doi.org/10.1007/s10648-018-9434-x)) |
| 8 | **Give mastery only for unaided checks**, never for time spent with the tutor. | Students overrate learning with AI ([Bastani](https://ideas.repec.org/a/nas/journl/v122y2025pe2422633122.html)) |
| 9 | **Always offer a typed fallback** for every voice action. | Accents, noise, shared rooms, fairness |
| 10 | **Keep vivas low-stakes practice.** | 83% found AI oral exams more stressful ([arXiv 2603.18221](https://arxiv.org/pdf/2603.18221)) |

---

## Ideas NexoraGuru could own, ranked

Novelty is judged on what was found in about 70 searches. **"High" means nothing close was found, not that nothing exists.** Run a patent and GitHub search before saying "first".

| Rank | Idea | What the student does | Closest prior art | Novelty | Risk |
|---|---|---|---|---|---|
| **1** | **Voice control of animations by meaning** | "Pause at the swap." "Go back to when low equals high." "What if the array was already sorted?" The engine jumps to that step or re-runs on new input. Add "say what happens next" before each reveal. | VCR-style rewind in 1990s animation tools ([academia.edu](https://www.academia.edu/17360858/An_Interpreted_Algorithm_Animation_System)); small speech-command animation theses ([core.ac.uk](https://core.ac.uk/download/4394985.pdf)); Khanmigo diagrams, not voice-driven ([Khan blog](https://blog.khanacademy.org/?p=22106)) | **High** | **Low.** The engine already stores `t.step(stepId, note, vars)`. Re-runs are deterministic, so no made-up frames. |
| **2** | **"Animate what you said, bugs included"** | Explain an approach in Hinglish. See it as pseudocode; confirm. Watch *your* algorithm run, off-by-one and all, next to the correct one. See where they split. Fix it by voice. Then get code in 5 languages. | Code Visualizer ([ITM 2026](https://www.itm-conferences.org/articles/itmconf/pdf/2026/05/itmconf_issf2026_01013.pdf)); ALGOGEN, AI writes tracker + fixed renderer ([arXiv 2605.12159](https://arxiv.org/pdf/2605.12159)); TraceDiff ([ar5iv](https://ar5iv.arxiv.org/html/1708.03786)); CodeVaani (questions only) | **High** for the full chain | **Medium–high.** AI tends to "helpfully" fix bugs; spoken plans are often vague ([arXiv 2509.26466](https://arxiv.org/html/2509.26466v1)); code must be sandboxed. |
| **3** | **First spoken Hinglish code corpus and benchmark** | Opt-in "read this code aloud" and "explain this solution" tasks on the Solve page | Nowrin's spoken-Java transcripts ([keithv.com](https://www.keithv.com/pub/progvoice)); general Hinglish corpora ([HiACC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12329218/)) | **High** (no public one found) | **Low.** Needs consent and privacy care. |
| **4** | **Spoken "explain it in plain words", graded into Nexus mastery** | Explain a GATE solution or a function aloud; a rubric grader scores it | Text-only graders: AI writes code from the explanation, then tests it ([arXiv 2311.14903](https://arxiv.org/pdf/2311.14903)); AI judge at 0.96 accuracy ([arXiv 2605.21614](https://arxiv.org/html/2605.21614)) | **Moderate** (spoken version not found) | **Medium.** Accent bias, memorised scripts. Randomise the variant. |
| **5** | **Editor-aware Hinglish ears** | Ears that know your variable names and the lesson's words | CodeVaani and Lost in Transcription method ([arXiv 2601.15339](https://arxiv.org/abs/2601.15339)); Whisper biasing papers | **Moderate** (new for code writing in Hinglish) | **Low.** |
| **6** | **Hands-free GATE exam console** | "Mark for review." "Next question." "Numerical 3 point 1 4." Spoken confirm before submit. | No GATE platform with this found | **Moderate** | **Low–medium.** Must never mis-submit. |
| **7** | **Spoken labels in Monaco (Cursorless-style, no grammar to learn)** | Small labels on tokens; "change blue i to j" | Cursorless ([thoughtbot](https://thoughtbot.com/blog/i-m-currently-talking-to-the-machine-and-it-s-not-helpful-at-all)) | **Low–moderate** (new for learners on the web) | **Medium.** Screen clutter on phones. |
| **8** | **Socratic approach talk with enforced no-code** | Talk through your plan; the tutor only asks questions and checks complexity claims | Kognit, almost the same idea ([Devpost](https://devpost.com/software/kognit)); ChatGPT Study Mode, Gemini Guided Learning ([TechCrunch](https://techcrunch.com/2025/08/06/google-takes-on-chatgpts-study-mode-with-new-guided-learning-tool-in-gemini/)) | **Low–moderate.** New part: enforced in code, Hinglish, tied to verified editorials | **Low** |
| **9** | **Voice viva after an Accepted verdict** | 2–3 minute spoken check: "Why O(n log n)? What breaks if n = 0?" Earns a "verified" badge. | Innsbruck chatbot ([arXiv 2604.07304](https://arxiv.org/html/2604.07304)); Dartmouth SIGCSE 2026 ([SIGCSE](https://sigcse2026.sigcse.org/details/sigcse-ts-2026-lightning-talks/17/AI-Driven-Oral-Examinations-for-Code-Assessment-Evaluating-Understanding-Beyond-the-)); NYU "Viva" at ~$0.42 each ([alphaXiv](https://www.alphaxiv.org/abs/2603.18221)); NeetCode voice debrief ([NeetCode](https://neetcode.io/practice/ai-coding)) | **Low** | **Medium.** Stress and fairness. Keep optional. |
| **10** | **Detecting "stuck" from speech** | Long pauses, "umm", "matlab", restarts trigger a gentle hint | Word cues like "not sure" in Kutti AI ([arXiv 2607.22377](https://arxiv.org/pdf/2607.22377)); pause-based turn taking | **Moderate** | **High.** Thinking pauses look like stuck pauses. Experimental only. |
| **11** | **Paper dry-run table checked by camera** | Trace an algorithm on paper (common GATE practice); the camera compares each cell with the true trace | Camera homework helpers ([Google blog](https://blog.google/products-and-platforms/products/gemini/gemini-live-updates-august-2025/)) | **Unverified** (not searched) | **Medium.** Handwriting reading. |
| **12** | **AI moderator for group pair programming in Live rooms** | 2–3 students code on the shared pad; the AI keeps turns fair and asks questions | CHI '26 human-human-AI pairing ([arXiv 2601.12134](https://arxiv.org/html/2601.12134v1)) | **Low–moderate** | **High.** Many speakers, privacy, an AI that talks too much. |
| — | **Whole-site voice control** | "Open notes for deadlock." "Option B." "Scroll down." | OS voice control, Wispr Flow | **Low (commodity)** | **Low.** Worth doing for access and phones, not as a headline. |

**The pattern.** The ideas worth owning all depend on things only NexoraGuru has: a **step-tagged animation engine**, a **judge in 30+ languages**, **verified GATE solutions**, and **Nexus mastery**. Competitors can copy a voice chat. They cannot easily copy "jump to the step where 7 was inserted".

---

## Recommended architecture: one mic, one router, four lanes

### The shape

There is **one mic button** (plus a hotkey) for the whole site. It is the same mic as the voice tutor. Every utterance goes to **one router**, which picks a lane:

```
Mic (push-to-talk) → Voice detector → Ears (+ word list from page and editor)
  → Normalizer (symbols, Hinglish synonyms, Devanagari + Roman)
  → Router
      Lane A: Site command  → rule matcher → action registry → (backup: small AI picks an action)
      Lane B: Code edit     → tree-sitter + Monaco edit (instant, undoable)
      Lane C: Approach /    → AI cleans into pseudocode → student confirms
              pseudocode       → (mode-dependent) code → diff view → judge → animation
      Lane D: Question /    → Tutor (grounded in lesson, step, code; hint ladder;
              discussion       no-code filter) → voice reply; code only on screen
```

The tutor and the commands share context. If the student pauses an animation and says "yeh kyun hua?" ("why did this happen?"), the tutor gets the current step's note, variables and code line. If the student says "phir se chalao" ("run it again"), the registry does it without the AI.

### Voice coding in detail

**Two modes, chosen per problem.** In **Learn mode**, the student writes the code. The voice layer only transcribes the student's own spoken code or pseudocode, **faithfully, with no fixes**. The AI may point at a problem by question ("what happens when i equals n?"), never by rewriting. In **Build mode** (for example after an Accepted verdict, or for practice in a new language), the AI may turn confirmed pseudocode into code. The founder must choose where each mode is allowed (see decisions).

**Lane C, step by step.** The student speaks an approach. The AI writes it in NexoraGuru's small pseudocode style, **with each line linked to the spoken phrase** that produced it. The student edits or confirms by voice or touch. In Build mode, the server model generates code, shown in the **diff view**. The student accepts. The judge runs the samples in the background and the tutor announces the result in one short sentence. If it fails, the tutor asks a question about the failing case. It does not silently retry. (A SPoC-style retry loop, capped at about 3 tries, is fine only in Build mode.) The trace then plays in the existing animation player.

**Lane B commands** cover the common edits: go to line, select function, rename, delete line, insert loop, undo, indent, run, submit (with confirm). They map to tree-sitter queries and Monaco edits. No AI, so they feel instant.

**Where models run.** Commands and voice detection run in the browser. Hinglish and Indian-language ears run on NexoraGuru's server (IndicConformer or a Hinglish Whisper) by default. A browser model is an opt-in for strong devices only, because downloads are tens to hundreds of MB. Code generation runs on the server (the existing coder model, or the GPU farm). Paid APIs such as Sarvam are an optional backup, not the base.

### Whole-site voice control in detail

**Layer 0: accessibility.** Fix labels so OS voice tools work for free (WCAG 2.5.3). Add an automated check.

**Layer 1: the action registry.** Each page registers its actions with a React hook: name, spoken phrases in English, Hindi and Hinglish, inputs, and a **risk tier**. The same registry also drives keyboard shortcuts and the ⌘K palette, so it is tested once. Later, publish it through WebMCP behind a feature check, so outside AI agents can use it safely.

**Layer 2: fast matcher.** Fuzzy and sound-alike matching over the page's phrases and visible button names. Feed those phrases to the browser's `phrases` boost list where supported. Synonyms like "agla", "aage", "ruko", "chalao", "option B chuno" are built in. One-third of real Indian voice queries were fully in a regional language in one study ([arXiv 2503.07522](https://arxiv.org/html/2503.07522v1)), so this matters.

**Layer 3: small AI backup.** Only if no rule matches, a small model picks one action from the registry, forced into the allowed list. The server checks every call again.

**Layer 4: "show numbers".** Number badges over visible controls; "click 7". If two buttons match "Next", number only those and ask "1 or 2?".

**Risk tiers.**

| Tier | Examples | Behaviour |
|---|---|---|
| Safe | scroll, open page, play/pause, next step | Do it at once; outline the target for ~400 ms so the student can say "no" |
| Reversible | choose option B, edit code | Do it; "undo" or "change answer" works |
| Irreversible | submit timed test, post publicly, delete note | Spoken confirm ("confirm submit") plus a visible button |

**Modes and privacy.** Push-to-talk by default; a "hands-free session" that stops after silence is optional. No always-on listening. A clear mic pill shows the state (command, dictation, talking with tutor) and the live transcript. A free wake word is now hard to get, since Picovoice's free tier ended (per one source). Treat all page text written by users (notes, comments) as untrusted, so it cannot steer the AI. Respect `prefers-reduced-motion` for highlights and diffs.

---

## Risks

**Wrong ears, wrong action.** Hinglish errors of 27–70% across models mean misheard commands will happen ([Deepgram](https://deepgram.com/blog/hinglish-voice-ai-speech-recognition.md)). Even in a careful study with blind users, speech errors hit 27.5% of trials ([GestureVoice](https://dl.acm.org/doi/10.1145/3663547.3746388)). Users also report "Show Numbers Once" misheard as "Show Numbers" on Apple ([Apple Community](https://discussions.apple.com/thread/256317435)). Mitigate with risk tiers, undo and visible transcripts.

**Answer leakage.** Prompt rules leak about a quarter of the time ([Harvard](https://news.harvard.edu/gazette/story/2026/09/taming-the-duck-for-starters/)). A leaky voice tutor can make students worse while they feel better ([Bastani](https://ideas.repec.org/a/nas/journl/v122y2025pe2422633122.html)). Enforce in code and measure the leak rate.

**The AI "fixes" the student.** In idea 2, a helpful model will correct the off-by-one, which destroys the lesson. Confirmed pseudocode as a fixed middle step, plus tests that check faithfulness, is the guard.

**Weak devices and networks.** No speed data exists for budget Indian phones. Browser models can crash or drain battery. Server fallback must be the default.

**Fairness.** Accents, regional languages and noisy hostels may score lower in spoken grading. Always offer typing, and never let voice alone decide mastery.

**Stress.** AI vivas feel stressful to most students ([arXiv 2603.18221](https://arxiv.org/pdf/2603.18221)). Keep them optional.

**Unstable standards and vendors.** WebMCP may change. Picovoice, Speechly and Alan AI show how vendors vanish or turn paid. Prefer open parts and own the registry. *Alan AI appears to have no self-serve paid plan, per low-authority directories (unverified)* ([Capterra](https://www.capterra.com/p/253649/Alan/)).

**Licences.** Qwen2.5-Coder 3B and StarCoder2 carry use limits. Dragonfly's Kaldi back end is labelled AGPL while Kaldi itself is Apache-2.0 (**conflict**) ([Dragonfly docs](https://dragonfly.readthedocs.io/en/latest/kaldi_engine.html)). Moonshine's non-English licence and Silero VAD's licence have shown conflicting labels before. Read each real LICENSE file.

**Privacy and law.** Student voice is personal data. Keep consent records, delete audio quickly, and never send names or emails to outside services. Chrome's default speech mode sends audio to Google. India's 2026 IT rules on AI-made audio require labelling; whether they apply to an education site is unverified, so label the tutor's AI voice anyway.

**Over-claiming "first".** Every novelty rating rests on searches, not proof. Kognit shows that even a strong-sounding idea may already exist as a hackathon project.

---

## What NexoraGuru must test itself

| Test | Why no one else can answer it | Done when |
|---|---|---|
| **Hinglish code-speech set**: ~200–500 consented clips of students reading code and explaining approaches | No public data exists | You know WER on code words for each ear option |
| Ear comparison on that set: IndicConformer, Hinglish Whisper, Chrome on-device (hi-IN, en-IN), Sarvam | No head-to-head on code speech | One default ear chosen, with numbers |
| Gain from word-list biasing + normalizer + AI repair | Only measured for English Java | Each step's error cut known |
| How students actually say algorithms in Hinglish | No study exists | A phrase list and pseudocode style built from real speech |
| Latency on budget Android and Indian mobile data | No data | Commands under ~500 ms; AI edits under ~2.75 s |
| Browser model speed and crashes on low-end devices | No data | Device tiers set by measurement |
| **Leak rate** of the no-code guardrail | Varies by design | Leaks under an agreed target (for example 5%) |
| **Faithfulness rate**: does the pipeline keep the student's bug? | Untested anywhere | Bugs kept in nearly all test cases |
| Voice command task study with GATE students: success, time, ease (SUS), effort (NASA-TLX), English vs Hinglish | No study of Indian users found | Publishable result (ASSETS, W4A, CHI India) |
| Does voice help learning? A small trial of voice vs typed explaining in DSA | No programming trial exists | Learning gain, not just usage |
| Spoken grading fairness across accents and languages | No evidence | No group scores unfairly lower |
| Novelty check: patents, GitHub, and Indian competitors (Scaler, GFG, CodeChef, PW, Coding Ninjas) | Not done in this research | "First" claims are safe or dropped |

---

## Conclusion

The research changes the question. "Can students code by voice?" is the wrong goal. Experts who tried it found speaking literal code slow, and big companies dropped it. The better goal is **"can students think out loud, and see their thinking become code and motion on screen?"** That plays to voice's real strength, which is explaining, and to NexoraGuru's real strength, which is a step-by-step animation engine tied to a judge. Whole-site voice control is still worth building, but as plumbing: one action registry that serves voice, keyboard, the ⌘K palette and future AI agents at once. Its value in India comes from Indian-language commands, which no phone or laptop offers today.

The lasting advantage is data and discipline, not models. Models will improve and get cheaper for everyone. A consented corpus of Indian students speaking code, a tested pseudocode style, a measured leak rate, and proof that the system keeps a student's own bug are things no rival can download. Start collecting and measuring before building the flashy parts.

---

## Decisions the founder must make

1. **Learn mode vs Build mode.** May the AI ever turn a student's pseudocode into code on an unsolved problem? Or only after Accepted, or only in a separate practice mode?
2. **First feature to build.** Recommended: voice control of animations by meaning (idea 1), since it is the most novel and lowest risk.
3. **Default ears.** Self-hosted open models (IndicConformer, Hinglish Whisper) as the base, with Sarvam as a paid backup, or not at all?
4. **Browser speech.** Allow Chrome's Web Speech API for commands, knowing its default mode sends audio to Google? Or only its on-device mode?
5. **Languages at launch.** English + Hinglish only, or Hindi and other Indian languages from day one?
6. **Pseudocode style.** Adopt one NexoraGuru pseudocode style (CLRS/GATE-like) for all voice and lessons?
7. **Guardrail target.** What leak rate is acceptable, and does any tutor reply with code need a code-level block before the student has tried?
8. **Spoken grading.** May a spoken explanation or viva count toward Nexus mastery or a "verified" badge, or stay practice only?
9. **Voice corpus.** Start an opt-in recording program now? Decide consent wording, how long audio is kept, and who can access it.
10. **Listening style.** Push-to-talk only, or also an optional hands-free session? (Recommended: push-to-talk by default; no wake word.)
11. **WebMCP.** Publish the action registry to outside AI agents when browsers support it, or keep voice control in-app only?
12. **Accessibility push.** Fund a site-wide pass for WCAG 2.5.3 labels and a hands-free GATE exam console as an accessibility feature?
13. **Research partners.** Approach IIT Bombay's CodeVaani team, or publish NexoraGuru's own user study?
