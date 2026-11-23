# Handoff — everything done, and everything left to do, end to end

Read this first in every new session, then `AGENTS.md` and `CLAUDE.md`. The
prompt to start the next session is `docs/NEXT_SESSION_PROMPT.md`.

**Keep this file current.** Before you stop for any reason (usage limit, end
of session, the owner interrupts), update "Where it stands" and "What is left,
in order", and push it with your work. Short, plain sentences, exact paths.

Contents:

1. How the owner wants work done
2. Branch, PRs and merging
3. Where it stands
4. What is done (all sessions)
5. The visual dry run: design and how it works
6. What is left, in order (the end-to-end plan)
7. How to check your work (tools and scripts)
8. Things learnt the hard way

---

## 1. How the owner wants work done

- **Quality.** Highest quality, professional, "never fails in any case".
  Finish one thing fully before the next: tests, light + dark + phone, axe 0.
- **Look.** Everything matches the site: the Field Journal look, tokens only,
  no glows or gradients, and clay only for the one primary action or the
  "you are here" mark. Clay is never text.
- **Honesty.** Never show made-up data. Say plainly what is not possible, and
  build the legitimate version. Never suggest breaking a provider's terms
  (for example several free accounts at one provider for one person).
- **Explaining.** Short sentences, exact clicks. The owner reads on a phone.
  Every report says what changed, what was checked, and what is not done and
  why, with screenshots (desktop light, desktop dark, phone).
- **Merging.** Only the owner says "merge". Merging to `main` deploys the
  live site (Render).
- **Interruptions.** The owner often sends new messages mid-task. Answer
  briefly, then carry on. Commit and push often so nothing is lost.
- **Speed.** When the owner asks for things "all at once", split independent
  pieces between helper agents, each in its own worktree. Each helper writes
  only new files. Then check and integrate their work yourself. This is how
  the C and JavaScript/TypeScript dry runs were built in session 3.

## 2. Branch, PRs and merging

- Work on the session's own branch (named in the session's system prompt).
  Never commit to `main`. One PR per finished piece. No force-push.
- After a PR merges, restart the branch from the new `main` (stash, `git
  checkout -B <branch> origin/main`, pop). If the push is refused because the
  remote branch still holds old merged history, run
  `git fetch origin <branch> && git merge -s ours FETCH_HEAD` and push.
- Wait for green CI (Server tests, Client build, GATE notes) before merging,
  and squash-merge.
- `git add -A` also picks up helper worktrees under `.claude/worktrees/`.
  Add that folder to `.git/info/exclude` first.

## 3. Where it stands (latest first)

### Session 11 (2026-11-22): voice, coding, Live, Messages — read this first

Merging: the owner authorised "push all, merge all" for this work: PR →
green CI → squash-merge → check the "Deploy site" run (Azure VM, not Render).
Live site last deployed at `6c04b8fe` (PR #226).

**Merged and live (PRs, newest first):**

| PR | What |
|---|---|
| #242 | **Conversation mode**: talk to the teacher hands-free (Talk button or "let's talk"): the mic reopens after each reply, Guru answers as the chosen teacher (name, gender-correct Hindi) remembering the last 8 turns, warm and short, small talk allowed then back to study; listening / thinking cues, hands while speaking; "bye" or two quiet turns end it. |
| #241 | **Indian teachers and a free Indian voice**: seven Rocketbox teachers chosen and toned to look Indian (Priya, Kavya, Neha, Ananya, Arjun, Rohan, Dev; `scripts/teacher/tint-skin.py`; old choices move on), warmer lighting; our own voice server `deploy/voice-server` (HeadTTS MIT + Kokoro's Indian voices, Apache, commercial OK, on the free Oracle server, shares Caddy with the coding model) speaks English with an Indian accent and Hindi (`src/voice/hindi-ipa.js`, no GPL phonemizer) and returns exact mouth shapes the teacher plays; Admin → Natural voice: address, password, Test in English/Hindi. Azure's free tier is now off by default (its terms: commercial use only on the paid tier). |
| #240 | **Virtual teacher T1**: four realistic 3D teachers (Maya, Elena, Kai, Victor; Microsoft Rocketbox, MIT; converted by `scripts/teacher/convert-rocketbox.py`) drawn with TalkingHead (MIT), chosen in Settings → Virtual teacher (off by default); lips follow every spoken sentence (`speak.ts` `onSentence`, Hindi via Roman spelling), speech bubble with the AI-voice label; by voice or its buttons it goes left/right/middle (glides, turned), turns around, sits and stands, waves, namaste, thumbs up, points, hides; never takes a click; lazy-loaded; not in the exam console. CSP `connect-src` gains `blob:` (model textures). `tests/voice-teacher.test.js`. |
| #239 | Voice step 1e, **S9 measuring**: `scripts/voice/asr-eval.js` (WER, code-word error rate, command and code accuracy, p50/p95, the gates; every service separately within its free caps via `stt.transcribeWith`), 58-sentence clip list `docs/voice/tests/asr/clips.json` (expectations self-checked), Admin → Voice recognition → **Record test clips** (saved to your device only), recordings gitignored. Normaliser learns Hindi comparison order ("a of i key se chhota hai" → `a[i] < key`). |
| #238 | Voice step 1d, **S8 natural voice**: Azure Speech neural voices (Neerja, Prabhat, Swara, Madhur) through the ears' Azure entry, free tier only (stops at 85% of 500,000 characters a month; cap can only be lowered; daily share per student; cache), Admin → Voice recognition → Natural voice; answers spoken sentence by sentence with the next made while one plays; "AI voice" label with Stop; Settings → Voice picker with **Kokoro** opt-in (loaded from jsDelivr/Hugging Face only after consent, never bundled, because its phonemizer bundles GPL eSpeak NG — owner to decide). |
| #235 | Voice step 1c, **S6 confidence check**: unsure answers are cross-checked with the next service; in the mic, unsure words that would change something ask "Did you mean this?" (nothing changes until tapped), two different answers ask "Which did you say?", and what was heard always shows with **Fix** (type it). The consent screen now says honestly that, with server ears on, a short clip goes through NexoraGuru to a speech service (not kept). Fixed: "light mode" matched "night mode" (dark) because a one-letter slip could change the first letter; `sameWord` now keeps the first letter. |
| #234 | Voice step 1b, **S5 normaliser** (`src/voice/normalise.js`, `src/voice/numwords.js`): cleans digits and the danda, joins spelt names ("b f s" → BFS), fixes known mishearings ("kyu" → queue) and, for commands and code, near-misses of the page's own names ("mit" → mid); code pages also get the speech as code ("low equals mid plus one" → `low = mid + 1`). 340-case set `docs/voice/tests/normalise.json` (100%, `tests/voice-normalise.test.js`). The browser sends the mode and the page's names (`client/src/voice/hints.ts`). Hindi answered in Urdu script → next service. **Bug fixed:** the 2% usage clean-up in `stt.js` used a case-blind LIKE and wrong cut-off, wiping the month and current-hour counters (free limits could be passed); now `pruneUsage()` with GLOB, tested. |
| #233 | Voice step 1a: the mic appears in browsers without their own speech recognition (Firefox, some in-app browsers) when the server ears are set up. `useVoiceSupport()` in `client/src/voice/speech.ts` replaces `speechSupported()` wherever a mic is shown (top bar, Settings → Voice, Explain-back, Mirror Run); `serverEars()` re-asks after a minute if the answer was "no". Message alerts box gets `role="log"` (axe). Checked in a browser with recognition removed: the clip is recorded, sent and acted on. |
| #232 | Voice recognition: more keys per service, each from a **different person's own account** (owner named, consent ticked); Save pill fix. |
| #231 | Voice recognition: "Save and test" beside each key. |
| #230 | Voice recognition: the order is arranged automatically from real results (`voice_stt_stats`); one entry per service. |
| #229 | Voice step 1 "ears": `src/voice/stt.js`, a speech-to-text chain for Indian speech (Sarvam, Google, ElevenLabs, Groq Whisper, Deepgram, Azure, any Whisper-compatible server) with free limits per service and key, switching at 85%, resting after errors, a fair daily share per student, and the browser's own recognition as the last link (nothing charged); Admin → Voice recognition; `client/src/voice/capture.ts` records a clean clip for `listenOnce`; the ink listening animation (`listen/InkWave.tsx`). Tests: `tests/voice-stt.test.js`, `tests/voice-zero-spend.test.js`. |
| #228 | `docs/voice/STEP1_EARS_DESIGN.md`: the precise design of step 1. |
| #227 | Handoff for session 11 and the virtual-teacher plan. |
| #226 | Dock: Messages removed (it is a Community section). Dock settings v3 drop it from older saves once. |
| #225 | Live: the **iPad teaching board** opens straight from the QR (pages, PDF/photos opened as pages with pdf.js, pen, highlighter, eraser, laser). Fixed a real bug: a tablet opening its board while joining left both sides stuck ("RTP extension ID reassignment"); `mesh.ts` now rebuilds a stuck link. You see your own share ("You're presenting", Stop). `live/blank.ts` warns when a share is black. The stage fits a screen's real shape. The control bar is centred. Tablet panel v3. Test: `tests/live-blank.test.js`. |
| #224 | Messages moved into Community (`/messages` redirects); the chat fits the window so only it scrolls; Back walks through sections and chats; **quick chat** panel from the top bar with "Send this page"; whole-screen sharing by QR for laptops; Android no longer offered a share that always fails. |
| #223 | **Explore** page (`/explore`): every feature in one place. |
| #222 | **Live lectures**: one teaches, many watch (viewers), "Let speak", the tablet board opens by itself. |
| #221 | Solve page: AI explanations on Dry run and How it runs, grounded in the real run. |
| #220 | Messages page (later merged into Community), WhatsApp-style alerts, free **Web Push**, call invites (ring online friends, link to the rest), share sheet, Community redesign, Submit reel animation. |
| #218 | Solve page: **10+ AI tests made automatically** (official examples first), a **benchmark of 10–12 tests per problem** (100% only when all pass), Qwen thinking control, translation kept when the layout changes, stay in calls across pages, no blinking mute dot. |
| #217 | Reasoning models' "thinking" stripped before students see it. |
| #216 | Voice: **Build mode** (translate any time; changes only after Accepted), numbers spoken in the exam console, **Explain-back**. |
| #212–#215 | Voice Phases 2–3: Guru tutor, code by voice, Mirror Run, word-by-word Listen, exam console by voice. |

**What is left, in order:**

1. **Voice, next (owner chose 2026-11-22): ears + natural voice**. Step 1
   order: a) mic without browser recognition — done (#233); b) S5 normaliser — done (#234); c) S6 — done (#235);
   d) S8 natural voices — done (#238); e) S9 measuring — done. **Step 1 is
   finished.** Owner: record the test clips (Admin → Voice recognition →
   Record test clips), then run the script (see STEP1 §S9).
   (precise
   design: [`docs/voice/STEP1_EARS_DESIGN.md`](voice/STEP1_EARS_DESIGN.md); the owner
   has added a Groq key), then the
   **virtual teacher**: T1 done (#240), Indian teachers and the free Indian
   voice done (#241; the owner must run `deploy/voice-server` on the
   Oracle server). Next, in order (owner's ask 2026-11-23: "talk to a normal
   person", "do all the parts"): conversation mode (#242), the lifelike look (expressions, listening and thinking
   cues), in-browser HeadTTS replacing the GPL kokoro-js opt-in, then T2
   (guide: places, point, click, tours, walk cycle) and T3 (whiteboard). Plan and honest limits:
   [`docs/voice/VIRTUAL_TEACHER.md`](voice/VIRTUAL_TEACHER.md) §3. After the
   teacher: Phase 4 own models (ask the owner for Kaggle before training).
2. **Owner reported "some problems are not fetched (an error)"**: still
   waiting for the problem link or a screenshot. Fix it on its own PR.
3. **The owner's own steps:**
   - Add a free Groq key (Admin → AI models → Add provider → Groq), set
     Main model and "AI tutor chat" to Qwen, and press Try.
   - Test on a real iPad and Mac: Live → tablet QR → board → open a PDF.
   - Turn on notifications in Community → Messages.
4. Paused older work:
   - GATE notes (waiting for the owner's "DM is ready" message and the
     Materials folder name);
   - DM Ch3–8, COA, TOC and CD notes.
5. A flaky test (the agent budget test once returned 401 in CI) was offered
   as a separate task; it is not fixed yet.

**How to check Live and Messages locally** (what this session used):
- Start the server with a scratch database:
  `PORT=3100 DB_PATH=<scratch>/site.db SESSION_SECRET=<32+ chars> JUDGE_MODE=local DISABLE_PUPPETEER=1 node src/server.js`.
- Run a mock AI on :3199 and set `GROQ_BASE_URL=http://localhost:3199`.
- Use Playwright with `--use-fake-device-for-media-stream` and
  `--use-fake-ui-for-media-stream`; for screen sharing add
  `--auto-select-desktop-capture-source=Entire screen`.
- Emulate an iPad with `devices['iPad Pro 11']`.
- To debug the mesh, patch `RTCPeerConnection` in an init script and read
  `signalingState` on both sides.

### Older: 3. Where it stands (2026-11-17, session 9)

- **Session 10 (owner, 2026-11-17): XP rule, avatar in Edit profile, staff
  permissions, site map.** Tracked in its own file:
  [`docs/handoff/admin-profile-xp.md`](handoff/admin-profile-xp.md).
- **Session 9 — student walk-through, coding first — merged (#148):**
  Walked the site as a new student on the demo with 38,631 real problems
  imported (Codeforces, CSES, AtCoder, Kattis, CodeChef, LeetCode, DMOJ,
  Euler, Timus): search → open → run → submit (wrong, compile error, right)
  → XP → Dry run → How it runs → Submissions; then Learn, GATE, Contests,
  Messages, Profile, Settings, Nexus (axe + sideways scroll + console +
  failed requests, light/dark/phone). Found and fixed:
  - **"Accepted" on the examples only** (the big one): every judge but
    Codeforces keeps its tests private, and Codeforces' come from the open
    dataset only after a first fetch, so a wrong idea (Watermelon without
    the w = 2 case) showed "Accepted +10 XP". `POST /api/judge` now returns
    `coverage` (`full`, `official`, `judge`, `url`, `pending`, `failed`);
    the Result tab, banner and toast say **"Passed the examples, not
    <judge>' full tests"** with why (being fetched now / could not be
    fetched / not available here) and a link to submit on the judge. No
    confetti for it. With the official tests cached, the same wrong code
    gets WA 19/20 (checked live). `cf-dataset.testsState` (fetching /
    failed lately) keeps "being fetched" true; a problem missing from the
    dataset is remembered. **XP is still given for passing the examples:
    owner's decision** (see section 6).
  - **Statement maths left raw**: CSES now ships pandoc spans
    (`<span class="math math-inline">`); AtCoder writes every input format
    as `<pre><var>N \ K</var></pre>` (converted inside `<pre>` too; the old
    test "math inside <pre> is left alone" now asserts the new rule and
    that other `<pre>` text stays data); Kattis wraps `$…$` over lines;
    Euler's `$\operatorname{OP}$s`, `$k$th`. And on the client, TeX with
    `<`, `>`, `&` was escaped twice (`&lt;` reached KaTeX) on every judge:
    `client/src/lib/mathHtml.ts` (testable, no KaTeX) decodes first.
    Checked in the browser: 3 problems per judge, no raw TeX left
    (DMOJ shows "Read on DMOJ": its pages block servers, as before).
  - **Learn problem tests were labelled "Hidden"** while shown: they are
    open practice (solutions are public too), so "Test 1, 2 …"; Workshop
    hidden tests still reach only their author.
  - **Problems page**: said "six judges" (now Codeforces, CodeChef,
    AtCoder, LeetCode, CSES and more); an empty catalog said "Try
    widening your filters" with no filter set ("No problems yet").
  - **404 page**: the binary-search cells it discards were 11 px muted ink
    below 4.5:1; now the secondary ink (the dashed edge still marks them).
  - Checked and fine: compile errors explained on the exact line ("Missing
    ;" with "What it means"), Dry run and How it runs on C++, Submissions,
    Messages on phone, GATE practice, Contests (71 live/upcoming/past),
    every page axe 0 in light/dark/phone (Nexus once flagged a row mid
    fade-in; 0 after it settles).
  - Tests: `tests/judge-coverage.test.js` (4: private judge → examples
    only; Codeforces pending; Codeforces with official tests catches the
    wrong idea; practice runs carry nothing), `tests/cf-dataset.test.js`
    (+1, failed download), `tests/sources.test.js` (+2), and
    `tests/statement-math.test.js` (2). `npm test`: 708 passed.
- **Session 9 — "first k of N" — merged (#147):**
  - One note for anything the dry run draws in part (`capNote` in
    `client/src/components/solve/dryrun/toFrames.ts`): arrays "first 40 of
    100", stacks "top 40 of 60" (a stack shows its top), queues "first 40 of
    49", grids "first 20 of 30 rows · first 20 of 25 columns" (columns were
    cut silently), linked lists "first 30 of 45 nodes" ("of 300+" when the
    list goes on past what the trace carries), heaps drawn as trees and
    union-find forests "first 31 of 50 items", edge lists "first 60 of 66
    edges", adjacency lists "one node shows only the first 80 neighbours".
    Nothing that fits whole carries a note. Maps already said "and N more".
  - **C/C++ "set" wording**: an array (or grid) whose drawn cells are all set
    said "40 of 100 set" even when all 100 were set; now "first 40 of 100".
    "k of N set" stays for arrays only partly written.
  - **Python linked lists stopped 7 nodes deep**: the tracer nested each
    object one level deeper. Objects are now queued (`_hq`/`_drain` in
    `src/dryrun/python.js`), so a 20-node list is drawn whole (measured: C,
    C++, Java, JS, Go and Rust already drew all 20).
  - **Python 3.12 changed traced programs**: reading `f_locals` at module
    level inside an inlined list comprehension set its loop variables to None
    (a CPython 3.12 bug; 3.13 is fine), so `[(i, j) for …]` produced
    `(None, 2)`. The tracer reads the module's globals there instead. CI runs
    Python 3.12; the regression test runs on every Python installed.
  - **Accessibility**: a grid wider than the stage scrolls sideways; it is now
    a focusable, named region (axe `scrollable-region-focusable`).
  - **Tests**: `tests/dryrun-frames.test.js` (+6: grid columns, stack top /
    queue front, 20-node list whole, 50-node list "first 30 of 50", heap /
    union-find / edge list, nothing whole has a note); a 100-item vector in
    every traced language (C, C++, Java, JS, Go, Rust run here; C#, Kotlin,
    Swift replay new traces recorded from real runs:
    `tests/fixtures/dryrun-{csharp,kotlin,swift}-big.json`); a C 2D array
    test. `npm test`: 698 passed.
  - **Checked on the real Solve page** (demo, Learn problem, Python):
    "STACK · TOP 40 OF 60", "GRID · FIRST 20 OF 25 COLUMNS", "HEAD · FIRST
    30 OF 45 NODES" in light, dark and phone; axe 0; no sideways scroll.
- **Session 8 in one line:** everything asked for is merged and live —
  A1 #136, A3 #137, B #138, A2 #139, C #140, D Messages #141, E Contests
  #142, dry-run polish #143, F linked platforms #144, "How it runs" tab #145.
  No PR is open. The only item left from the plan is the "first k of N"
  label (section 6, item 4); then the owner chooses what comes next.
- **Cloud environment "Nexora"** (made 2026-11-17, owner approved): this
  repo's sessions can reach codeforces.com, atcoder.jp, kenkoooo.com,
  leetcode.com, codechef.com, dmoj.ca, github.com, api.github.com,
  open.kattis.com, spoj.com, yukicoder.me, cses.fi, hackerrank.com,
  geeksforgeeks.org and the code runners (wandbox.org, godbolt.org,
  api.paiza.io, api.kotlinlang.org). Start the demo through the proxy like
  this (Node's own `fetch` ignores the proxy without the first variable):
  `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt
  NODE_OPTIONS="-r <scratch>/proxy/preload.js" PORT=3300 node scripts/hive-demo.js`
  (the preload patches `https` with `https-proxy-agent@7`; v9 is ESM-only).
- **To do on the live site (owner):** set `GITHUB_CLIENT_ID` and
  `GITHUB_CLIENT_SECRET` on Render and add the callback
  `<API_URL>/auth/github/callback/link` (API_URL, else the app URL; on the
  live site that is `https://nexoraguru.in/...`) to the GitHub OAuth app,
  or "Connect GitHub" stays switched off (it says so on the page).
- **Owner's standing instruction (2026-11-17):** "merge everything as any
  work is done i want no issues". Each finished PR is merged by the agent
  once CI is green, there are no conflicts, and the checks below are clean
  (tests, typecheck, build, no new lint warnings, axe 0 light/dark/phone).
- **Merged and live:** #127–#131, #133 (Admin → Compilers), **#134**
  (Judge0 runners, key-based services' terms on the admin page, traces sized
  to each runner, Java/Kotlin runner faults, dry-run polish: structs drawn
  field by field, step notes say what changed). Details of #134 below.
- **A1, plain-English error explanations — merged (#136):** `client/src/lib/diagnostics.ts` rewritten
  against real output from every runner (`tests/fixtures/diagnostics-real.json`,
  16 languages, compile error + crash each). Only the student's own file is
  marked (`isStudentFile`). Each common error gets a label and a "What it
  means" line (`explainError`, 19 rules: unknown name, missing import,
  missing `;`, brackets, indentation, outside a function, missing return,
  declared twice, index out of range, division by zero, empty value, empty
  list, not a number, read past the input, recursion too deep, out of memory,
  wrong type, Java public class, syntax). Shown in the editor marker (hover),
  the inline lens, the Result tab (and a "What it means" box when the runner
  gives no line), and the status bar ("1 issue · Ln 4: Missing ;").
  Tests: `tests/diagnostics.test.js`.
- **A3, coding analysis and levels — merged (#137):**
  - **"+XP" on Accepted**: `POST /api/judge` returns `xp: { gainedXp,
    firstSolve, before, after, solved }` (both levels from the same
    `calcLevel` the Profile uses). The Result tab shows `XpGain`
    (`ResultsPanel.tsx`): "+40 XP · Level 1 Bit · 760 XP and 99 more problems
    to level 2", XP and problems progress bars, a level-up line, a link to
    `/profile#levels`; a repeat Accepted says XP counts once per problem.
  - **Profile, "How levels are earned"** (`components/profile/LevelRules.tsx`,
    `GET /api/levels/rules`): the XP per rating table and every level's XP +
    problems, from the server's own `XP_BY_RATING` and `RIFT_LEVELS` (so it
    cannot drift), and the Nexus web rank: concepts + 15 XP per GATE lesson +
    5 XP per PYQ + 25% of problem XP. Opens by itself at `#levels`.
    Note: the old handoff said it the other way round ("problem XP plus a
    quarter of the web rank"); the code adds 25% of problem XP to the web
    rank, and that is what the page says.
  - **Analytics, "Verdicts over time"** (`VerdictTrendChart`,
    `verdictTrend` in `/api/performance`, `buildVerdictTrend`): 12 weeks of
    stacked verdicts and "Accepted N% in the last 4 weeks (M% in the 8
    before)". Wrong answers are drawn in the site's error colour (they used
    the accent, green in some themes) — new `error` chart colour.
  - **Per problem**: `GET /api/problems/:id` adds `analysis` (tries, first
    Accepted, tries to accept, minutes to accept, languages, fastest) and
    each submission's language and tests passed; the Submissions tab shows
    "Accepted on try 2, …" and the numbers. Only the signed-in user's rows.
  - Accessibility fixes found on the way: the "Original" link's name now
    starts with its visible word; the problem's scroll area is focusable.
  - Tests: `tests/coding-analysis.test.js`.
- **B, problem pipeline — merged (#138):**
  - **Images are ours, never hot-linked**: `normalizeStatementHtml`
    (`src/statement-media.js`) now points every judge image, video and
    poster at `/api/imgproxy`, which answers from the stored copy
    (`src/media-store.js`); only hosts we may not fetch keep a direct link.
    `_saveStatement` stores a statement's media at once, from absolute URLs
    (relative ones like `/predownloaded/…` were missed before).
  - **"What is missing"** (`src/sources/audit.js`, Admin → Problem sources,
    `node scripts/problems-audit.js [--json | --gaps <source> <field>]`): per
    source, statements not fetched, samples, limits, tags, rating, images not
    stored. A field the judge does not publish is "n/a", never a gap (no
    rated problem → ratings n/a; answer-only → no samples; modules declare
    the rest with `publishes`: CodeChef has no memory limit, UVa statements
    are PDFs). Click a number to see the problems; re-import up to 25, 1.5 s
    apart (`POST /api/problem-sources/reimport`), or store their images.
  - **Honest fetching**: the old scraper's desktop-Chrome User-Agent and
    Chrome's anti-detection flag are gone; every fetch says who we are. A bot
    check is reported ("blocks automated access"), never worked around.
  - **Codeforces titles**: the list now asks for `lang=en` (a live sync
    stored Russian titles without it).
  - **Live run, 2026-11-17** (all sources synced in the demo through the
    proxy): Codeforces 11,526, CodeChef 5,781, AtCoder 9,959, LeetCode 3,324,
    CSES 400, Project Euler 1,019, DMOJ 5,274, Timus 1,243, Kattis 100, UVa
    5,009. SPOJ's list and DMOJ's problem pages are behind a bot check (stay
    missing). Re-importing 2 problems per source: 18 of 20 saved (the 2 DMOJ
    ones blocked); every Euler and Kattis figure stored and served by us.
  - Tests: `tests/sources-audit.test.js`; `tests/statement-media.test.js`
    now checks that judge media is served by us (it checked hot-linking).
- **A2, the editor — merged (#139):**
  - **Live syntax check while typing** (`client/src/lib/syntaxCheck.ts`,
    amber squiggles + "Ln 4: Brackets" in the status bar, click to jump):
    unclosed / extra / mismatched brackets and unclosed strings in 31
    languages, Python's mixed tabs and spaces. Comment, string, char-literal,
    regex, raw-string, template and Lisp-character aware; shell and Perl are
    left alone (too irregular to scan safely). 0 false alarms on 1,042 real
    programs (Learn solutions, self-tests, dry-run suites).
  - **Format for every language** (same scanner): JS/TS/JSON/CSS/HTML use
    Monaco's full formatter; 17 brace languages are re-indented by bracket
    depth (case bodies, Go tabs and gofmt-style cases, chains, preprocessor
    lines; text inside multi-line strings never touched); the rest only lose
    trailing spaces. The button's label says which. One undo step.
  - **Cheat sheet per language** (`client/src/lib/cheatsheets.ts`, book icon
    in the editor header): read a line, read n numbers, fast I/O, print,
    arrays, maps, sort, common mistakes, and a whole program — for C++, C,
    Java, Python, JS, TS, Go, Rust, C#, Kotlin, Swift, Ruby, PHP, Lua. Every
    whole program printed 15 for "3 / 4 5 6" on the real judges.
  - **Suggestions after a library name**: `Integer.`, `fmt.`, `Console.`
    now offer that library's own functions (they offered only generic
    methods).
  - **Playwright per language** (`client/scripts/check-editor.cjs`, run
    against the demo): suggestions, parameter hints, hover, live check,
    Format, cheat sheet — all pass in 14 languages.
  - Accessibility: Monaco's touch-screen "show the keyboard" field is named.
  - Tests: `tests/syntax-check.test.js`, `tests/cheatsheets.test.js`.
- **C, "Add a coding problem" for staff — merged (#140):**
  - **Where**: Admin → Add a problem (`components/admin/AuthoredSection.tsx`,
    permission `problems.manage`) lists drafts and published problems;
    "New problem" opens the editor at `/admin/problems/:id`
    (`pages/AuthorProblemPage.tsx`, 404 to non-staff like `/admin`).
  - **Editor tabs**: Statement (title, statement, input, output, note in
    Markdown + `$maths$`, "Add a picture"; a live preview beside it, made by
    the server the same way publishing makes it, in the real `ProblemPanel`),
    Tests (add, upload files paired by name `1.in`/`1.out`,
    `input1.txt`/`output1.txt`; "shown as an example" per test; "Make
    outputs" from a chosen solution; a generator program that makes hidden
    tests, reading the test number on its input), Limits & checker (time,
    memory, difficulty, topics; checker: same lines, same words, numbers
    within a difference, lines in any order, any letter case, or a checker
    program that reads `{"input","expected","output"}` JSON and prints OK),
    Solutions (C++, Java, Python, JavaScript, C; "Start from a template"),
    Editorial (Intuition / Approach / Complexity, live preview), Check &
    publish (runs every solution on every test; checklist; Publish /
    Publish changes / Unpublish / Delete draft).
  - **Rules** (`src/authoring.js`, `src/routes/authoring.js`): saves as you
    type (one save at a time; editing pauses while a job runs). Publishing
    needs a title, a statement, an example, two tests, every output, and all
    five solutions passing a check that is still current (a change to tests,
    checker, solutions or time limit makes it stale). Tests: at most 100, 1 MB
    each, 8 MB in all (refused with a clear message, `413`). Pictures: PNG,
    JPEG, GIF, WebP up to 2 MB, checked by their bytes (no SVG).
  - **For students**: a published problem is platform `nexora` (`NX<id>`),
    judged on all its tests with its checker (`/api/judge`); hidden tests'
    input and expected output are blanked for anyone without
    `problems.manage`. The Solve page shows its editorial and five solutions
    in the Solution tab (behind "Give it a real try first"). An unpublished
    problem leaves the catalog and answers 404 to students on
    `/api/problems/:id`, `/api/problem-statement/:id` and `/api/judge`.
    No "open on another site" link (the problem lives here).
  - **Checked** on the demo with the real judges: made outputs from C++,
    all five languages passed (Java 118 ms, JS 216 ms slowest), published,
    the Solve page shows Description / Solution. Axe 0 and no sideways scroll
    on the list and all six tabs, light, dark and phone.
  - Tests: `tests/authoring.test.js` (4), `tests/authoring-routes.test.js` (5).
- **D, Messages — merged (#141).**
  The owner asked for "the best system possible" with more features (2026-11-17).
  - **Server**: `src/chat.js` (rules) + `src/routes/chat.js` (`/api/chat/*`).
    Tables `chat_conversations`, `chat_members` (role, last_read_id, muted,
    accepted), `chat_messages` (body, attachment, share, reply_to, poll,
    pinned, forwarded, edited, deleted), `chat_reactions`, `chat_poll_votes`,
    `chat_saved`, `chat_settings` (who can message me). Live socket events
    to every member: `chat:message`, `chat:update`, `chat:reaction`,
    `chat:read`, `chat:typing`, `chat:conversation`, `chat:mention`.
  - **Features**: DMs; groups with owner/admin/member (add, remove, rename,
    description, hand-over, leave); message requests (strangers wait,
    receipts hidden until accepted, at most 3 messages before acceptance);
    privacy (everyone / people I follow / nobody); blocking (social_blocks);
    typing; Seen / Seen by; replies, edits, deletes, reactions, pins; polls;
    forward (up to 5 chats); saved messages; invite links (on/off);
    search; @mentions (still counted in muted chats); mute; report
    (`reports`, content type `chat_message`, Admin → Moderation);
    attachments up to 5 MB checked by bytes (images, PDF, text/code saved as
    .txt, voice notes webm/ogg/m4a/mp3; no SVG/HTML); share cards built by
    the server (problem, own submission with code, contest, GATE question
    without the answer, solve room); a pasted nexoraguru.in /solve/<id> or
    /gate/practice?ids= link becomes a card; code blocks coloured with Copy
    and Run (/api/run); "Solve together" makes a room (`/social?tab=rooms&room=`).
  - **Old DMs**: the `messages` table is copied in once (`chat_meta.migrated`);
    `POST /api/messages` and the `direct-message` socket still work and also
    write to the new chat.
  - **Client**: `client/src/components/social/MessagesTab.tsx` (list, filters
    All/Unread/Groups/Requests, search, ?c= ?peer= ?join=) and
    `client/src/components/social/chat/` (Thread, MessageItem, Composer,
    RichText, dialogs, types, chat.css). Top-bar bell and the Messages tab
    badge use `/api/chat/unread`.
  - **Honest limits**: not end-to-end encrypted (the privacy dialog says so);
    no voice/video calls; no previews of other websites (would be an SSRF risk).
  - **Checked**: `tests/chat.test.js` (10) and `tests/chat-routes.test.js` (5);
    `npm test` 658 passed; `tsc -b` and `vite build` clean; no new lint
    warnings. A 3-user Playwright run on the demo passed: run code printed 42,
    request showed "Sent" until accepted then "Seen", typing live, reaction
    live, group invite under Requests, poll vote live, @mention highlighted,
    search found the message.
  - **Final check (session 8)** on the demo with 3 users (a DM with a
    reply, a reaction, a code block and an @mention; a group with a poll):
    axe 0 and no sideways scroll on `/social?tab=messages`, the list and
    both conversations, light, dark and phone. Fixed on the way:
    - the conversation box fills the screen under the top bar and scrolls
      into view when opened, so the box to type in is always on screen
      (it was below the fold on a phone);
    - on a phone the floating assistant button steps aside while a chat is
      open (it covered Send: `:root[data-chat-open] .ai-fab`);
    - on a touch screen a message's actions show for the message you tap,
      and a tap elsewhere puts them away (they showed under every message);
    - a reply's quote shows code as "[code]", not raw ``` marks
      (`quoteText` in `chat/types.ts`);
    - day and "New messages" lines are plain list items (axe "list").
- **E, Contests — merged (#142).**
  - **Server**: `src/contests.js` (rules, pure and tested) + `src/routes/hosted-contests.js`
    (`/api/hosted/*`). It keeps `custom_contests` (old contests still work; their
    Workshop problem list becomes items once) and adds `contest_items`
    (kind `problem` | `workshop` | `gate` | `question`, ref, marks),
    `contest_questions` (the host's own MCQ/MSQ/NAT: text with $maths$,
    options, answer, marks, negative marks, up to 6 figures, solution),
    `contest_responses` (the paper, graded once) and `contest_runs` (coding
    runs counted by `/api/judge` when it gets `contest_id`). New columns:
    `custom_contests.status/settings/updated_at`,
    `contest_participants.started_at/ends_at/finished_at/paper_at`,
    `custom_problems.editorial/contest_only` (added in `src/db.js`).
  - **Rules**: anyone signed in can host (staff with `contests.manage` can
    manage any). Timing "fixed" (everyone together) or "window" (open until a
    close time; each person gets the duration from Start). Access by link,
    or link + password. Marks list live / after the end / only the host
    (teacher mode). Answers and solutions after the end, or after each person
    finishes. Questions are fixed once anyone has started. Coding: marks per
    solve, ties by minutes to solve + penalty per wrong try before Accepted
    (compile errors free). Past-paper MCQs: GATE's −1/3, scaled to the
    contest's marks (can be turned off). A problem written for a contest
    (`contest_only`) is hidden from the Workshop list, and opens only for its
    author, staff, and people in one of its contests once their time starts.
  - **Host's analysis** (`/contests/:id/results`): marks list with every
    question's marks, highest/average/median/lowest; by question (right, tried,
    average marks, average time, the options picked with the right one in
    green, how well it separates the top 27% from the bottom 27%); by student
    (every answer, time, coding runs); over time (right/wrong per slice, how
    long people took); CSV export (Excel-safe: no formulas, BOM).
  - **Client**: `pages/contests/` — `HostedBuilderPage` (`/contests/new`,
    `/contests/:id/edit`: Questions / Timing & rules / Share & publish),
    `HostedContestPage` (`/contests/c/:code`: join, clock, questions, marks
    list), `HostedPaperPage` (`/contests/:id/paper`: the GATE exam console
    with the contest's deadline, then the review), `HostedResultsPage`.
    `components/contests/hosted/` (api, pickers, `AddToContest`,
    `QuestionEditor`, `ContestBar`, `HostedSection`, `useLoaded`, hosted.css).
    **From anywhere**: "Add to a contest" in the Solve page's ⋯ menu and on
    every gradable GATE question (trophy icon); Contests page "Hosted on
    NexoraGuru" (New contest, Join with a code); the Workshop's contests tab.
    The Solve page with `?contest=ID` shows a bar with the clock and counts
    every Submit there. The Workshop problem form has an Editorial field.
  - **Shared console fixes** (`gate/cbt/CbtConsole.tsx`): a `deadline` prop
    (the clock never passes it, reloads included); the console is a modal
    dialog with no second `<header>`/`<main>` (axe landmark rules), one label
    darker. GATE mock exams pass too.
  - **Honest limits**: GATE past-paper questions and their answers are public
    on the site, so the builder says to write your own questions for a graded
    test. Run (not Submit) never counts. No proctoring.
  - **Checked**: `tests/contests.test.js` (8) and `tests/contests-routes.test.js`
    (7); `npm test` 673 passed. On the demo with real runners: a class test
    with a coding problem written for it, a GATE question and three own
    questions; Ravi's WA and Asha's AC counted; both papers graded. Axe 0 and
    no sideways scroll in light, dark and phone on: Contests, the builder
    (3 tabs, question editor open, GATE picker), the lobby, the contest page
    (host and student), the paper (console instructions, the exam, the
    review), results (4 tabs), the Solve page with the contest bar, and
    "Add to a contest" from a problem and a GATE question.
- **Dry-run polish (section 6, item 4) — merged (#143).**
  - **JavaScript sort comparators** (`src/dryrun/js.js`, `comparator`): the
    function given to `sort` / `toSorted`, `(a, b) => a - b` included, is a
    short call "compare" with its two values and its answer ("compare returns
    -3"). Only the first 40 comparisons of each sort are drawn (`__nx.call`
    takes a limit; past it the frame is a no-op), so a big sort keeps its
    steps for the program.
  - **JavaScript async functions**: traced now (they were skipped). Each
    `await x` becomes `__nx_f.resume(await __nx_f.pause(x))`: the call steps
    off the stack while other code runs and back when it resumes; the line
    that was running is reported first, so lines stay in the order they
    ran. The replay (`replay.ts`, `running`) shows the stack only up to the
    call that is running. Generators and `for await` are still skipped.
    `applyEdits` takes an order key `o` for closers at the same place.
  - **C pointers into arrays** (`c.js` `walker`, `c-runtime.h` `__NX_PAT`,
    `__nx_inside`): a pointer to numbers the program never subscripts
    (`p++`, `*p`, `*(p+1)`) is sent as `{t:'at', a:'a', i:2}` and drawn as a
    chip under `a[2]`, shown as `&a[2]`; `*p` lights the cell it reads or
    writes. Arrays are remembered with their names; a malloc'd block is
    named by the pointer that holds its start. A pointer used with `[]`
    (a parameter `int *arr`) stays an array, as before. C++ is unchanged.
  - **Linked lists and trees** (`learn/engine/views/Linked.tsx`): several
    pointers on one node stack in lanes with one arrow (it landed on the
    name above).
  - **Checked**: corpora still 193/193 for JavaScript, C and C++, 192/193 for
    TypeScript (the known top-level `return`); tests added to
    `tests/dryrun-js.test.js` (2) and `tests/dryrun-c.test.js` (1); browser
    dry runs (C two pointers, Python linked list) axe 0 in light, dark and
    phone. `client/scripts/check-dryrun.cjs` now clicks the visible Dry run
    button (on a phone it is in the bottom bar).
- **F, linked platforms — merged (#144).**
  The owner allowed the network: a personal environment "Nexora" (this
  repo) can reach the judges, GitHub and the code runners. Node's own
  `fetch` needs `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`
  to use the proxy (the demo's preload only patches `https`).
  - **Checked live first** (2026-11-17), so only sites that publish what is
    needed were added:
    - **DMOJ** — official API v2 (`/api/v2/user/<name>`): the
      Self-description (`about`) holds the one-time code; every solved
      problem code is imported and matched to the catalog (`dmoj` ids are
      problem codes). Its `rank` is a site role (admin), not shown.
    - **CodeChef** — no public API; the public profile page has the name,
      rating, highest rating, stars and "Total Problems Solved", not the
      list (`codechefProfile` in `src/accounts.js`). Proof: the code added
      to the profile Name for a moment (CodeChef has no bio). Import: the
      exact count and rating (nothing is marked solved here).
    - **GitHub** — real OAuth (`/auth/github/link` →
      `/auth/github/callback/link`, a sub-path of the sign-in app's callback,
      which GitHub allows; same `GITHUB_CLIENT_ID/SECRET`). One-time state in
      the session, tied to the account, 10 minutes. We read login, public
      repos, followers and contributions in the last year (GraphQL), then
      revoke the token (`DELETE /applications/{id}/token`); nothing that could
      act for the person is stored. Refresh reads the public numbers again.
      If the env vars are missing, the row says it is not set up.
    - Left out, honestly: HackerRank (undocumented endpoint, terms forbid
      automated access), SPOJ (bot check), yukicoder and CSES (no profile
      field to prove ownership), Kattis (no public profile API).
  - **Badges**: CodeChef 4★ (1800), On GitHub, Builder (10 public repos),
    Contributor (100 contributions in a year). GitHub has no solve tiers and
    does not count toward Multi-judge.
  - **Client**: `components/account/LinkedAccounts.tsx` — DMOJ and CodeChef
    rows (handle → code → Check → Import), a GitHub row (Connect with GitHub,
    Refresh, Disconnect; repos / followers / contributions), a toast when
    you come back from GitHub (`?linked=github` / `?link_error=`).
  - **Checked**: `tests/accounts.test.js` (+3, with trimmed real answers in
    `tests/fixtures/accounts/`), `tests/accounts-github-routes.test.js` (3:
    state, single use, cancel); `npm test` 682 passed. On the demo, linking
    started against the real DMOJ and CodeChef (rating 2039 / 3355, 7★), and
    Check correctly says "not yet" (the code isn't on those real profiles).
    Settings → Platforms axe 0 and no sideways scroll in light, dark, phone.
  - **Not checkable here**: a full GitHub connect needs the live site's OAuth
    app (it is covered by the route and unit tests with GitHub's documented
    answers).
- **"How it runs" is its own tab again — merged (#145)** (owner's choice, 2026-11-17). The
  Solve page's results tabs are now Tests · Result · Dry run · How it runs.
  To make room the owner chose to remove Coach → Hints (it duplicated Help →
  Hint / Ask the tutor): Help → "Give me a hint" now asks the tutor for one
  small next step. Analysis moved under Result (Result | Analysis). The
  coach's live check still runs: its issues are marked in the editor
  ("AI check: …") and its approach · complexity chip opens Result →
  Analysis. Old links (`openTab('coach' | 'analysis' | 'journey')`) land in
  the right place. `CoachPanel.tsx` was deleted.
- **Lost work, rebuilt from the plan:** session 6 built B (problem pipeline)
  and A3 (coding analysis + XP) in helper worktrees on its own machine and
  never pushed them. They are not recoverable here and are rebuilt next.
- **Next:**
  1. The "first k of N" label on a capped vector (section 6, item 4).
  2. Then ask the owner. Open ideas from this session: SPOJ, Kattis,
     CSES and yukicoder in Linked platforms are left out on purpose
     (bot check, no public profile API or no proof field), so don't add
     them; Messages has no calls or link previews (honest limits).
- **Owner decisions (2026-11-16):** dry run for Ruby, PHP, Lua, Perl and
  functional languages is **later**; the ideas in section 6, item 7 are
  **no for now**.

### #134 in detail (session 6)

- **Merged and live:** #127–#131, #133 (Admin → Compilers). Live check,
  2026-11-16: `https://nexoraguru.in/api/health` answers OK on commit
  `42d29e1` (#133); the private "coming soon" page shows. Signing in and
  pressing Dry run on the live site needs the owner (the site is private).
- **On branch `claude/clever-babbage-km37j9` (pushed, PR not opened yet):
  finishing Admin → Compilers.**
  - **Judge0** (`src/judge0.js`): add it in Admin → Code runners as a second
    kind of runner next to Piston — our own Judge0 server (GPL-3.0, allowed)
    or a Judge0 Cloud / RapidAPI key (Judge0 sells it for programming and
    e-learning platforms). Key sealed with `src/hive/vault.js`, tested on
    save (reads `/languages`, maps our languages to the newest matching
    Judge0 id, runs `print(6*7)`), on/off, order, health. Runs before the
    public runners for the languages it has. Tests: `tests/judge0.test.js`.
  - **Key-based services, terms read 2026-11-16** (the network is open now):
    JDoodle — not allowed (licence only "for your own use or for your
    internal business purposes"; other use needs written consent,
    hello@jdoodle.com). glot.io — not allowed (no terms published; its
    runner code is MIT and could be self-hosted, which Piston already
    covers). Coliru — not allowed (no terms, no API, one person's donated
    server). Shown on the admin page with each reason (`KEYED_SERVICES` in
    `src/runners.js`).
  - **Dry-run traces sized to each runner** (`TRACE_BYTES`, `withBudget`,
    `forRunner` in `src/dryrun/index.js`): measured stderr limits —
    Wandbox ~128 KB, Kotlin Playground ~128 KB of all output, Compiler
    Explorer 32 KB, Paiza 10 KB, our Piston 4 MB (`PISTON_OUTPUT_MAX_SIZE`).
    Before, a long trace was cut and could take the program's own output with
    it. `remoteRun`/`runChain` accept code as a function of the runner.
  - **Java tracer**: no shutdown-hook thread any more (Compiler Explorer
    cannot start threads; Java printed a warning into the output).
  - **New compiler versions** (`scripts/dryrun-suites/newest.js`, runs what
    the updater would pick), all passing traced and plain: Python 3.14 /
    3.15, GCC 16.2 (C++ and C), Java 27, Go 1.26, Rust 1.99, .NET 10, Swift
    6.4.2, Kotlin 2.4.21 (Kotlin Playground). No version needs pinning.
  - **Kotlin on Compiler Explorer** cannot read input on any version (its JVM
    overflows its own class loader). `jvmSandboxFault` in
    `src/remote-exec.js` now calls that the runner's fault, so the chain moves
    on to Paiza instead of blaming the student.
  - **Dry-run polish (item 4), done here:** Swift and C# structs come as
    records (`{t:'rec'}`), and any plain object (no links) in any language
    draws its lists/maps as `uf.p` and numbers as `uf.count`; `p` with a
    `find(` is a union-find forest; the step note names the exact change
    (`a[1]: 5 → 9`, `a[0] ↔ a[1]`, `st gets 7`, `cnt["x"]: 1 → 2`).
- **Built by helpers, waiting to be integrated as their own PRs** (worktrees
  under `.claude/worktrees/`, not committed): **B** problem pipeline
  (`agent-a66b67d0…`: 9 of 11 sources full, images stored in the database,
  audit script, Admin "What is missing" panel, re-import; SPOJ and DMOJ are
  bot-checked and stay missing), **A3** coding analysis + real XP / level
  progress + Profile "How your level is earned" (`agent-ac32da41…`).
  **A1** error explanations still running (`agent-a029dae8…`).
- **Next:** integrate B, A3, A1 (one PR each, after this PR merges), then A2
  (after A1: both touch the editor), C, D, E, F, and the rest of item 4
  (JS async/sort tracing, C pointers into arrays, linked-list pointer lanes).
- **Owner decisions (2026-11-16):** dry run for Ruby, PHP, Lua, Perl and
  functional languages is **later**; the ideas in section 6, item 7 are
  **no for now**.

## 4. What is done (all sessions)

### Session 4 in detail (dry run for Go, Rust, C#, Kotlin, Swift; Solve page)

- Merged: #127 (judge, runners, editor help, How it runs, Python dry run),
  #128 (dry-run known issues), **#129** (dry run for C++, C, Java,
  JavaScript, TypeScript). The dry run works in 6 languages.
- **Open PR: the Solve page redesign (section 6, item 2) — done**, branch
  `claude/fervent-curie-vjgcd8`. Waiting for the owner's "merge".
- **Item 1 (live check) needs the owner**: the site is private, so only the
  owner can sign in and press Dry run on the live site in each language.
- **Dry run for Go — done (session 4)**, in the same PR:
  `src/dryrun/go.js` + `go-runtime.go`. Reflection-based runtime; imports
  added (aliased) on the package line; a deferred `__nxDone` per function
  reports a panic on its line and re-panics, so the program behaves exactly
  as before; output counted by wrapping `fmt.Print*` and the `os.Stdout`
  handed to writers (no goroutines, nothing can be lost); `byte`s shown as
  characters; maps drawn sorted (Go's order is random); only `package main`
  types become objects; `Len/Less/Swap/String/Error` methods not traced.
  Picture-picker: Go stacks (`st = append(st, x)` + `st[:len(st)-1]`),
  queues (`q = q[1:]`), `container/heap`, edge lists (`edges` of pairs),
  field names matched without case (`Val`, `Next`, `Left`). Checked: 10
  classic programs print exactly the same traced and untraced
  (`node scripts/dryrun-trace.mjs <file> go`), `tests/dryrun-go.test.js`.
  Also checked through the live runners (Wandbox, Compiler Explorer,
  Paiza.io): same output, same steps.
- **Dry run for Rust — done (session 4)**, same PR: `src/dryrun/rust.js` +
  `rust-runtime.rs`. Values through a `__nx_rt::S` trait with "autoref
  specialisation" (S if the type has it, else short Debug text, else
  nothing — never a compile error); the student's non-generic structs get
  an `S` impl (objects by address: `Option<Box<Node>>` lists,
  `Rc<RefCell<TreeNode>>` trees); frame `Drop` sends `ret` (also while
  unwinding); a panic hook reports the line and message, then Rust's own
  message is printed; output counted by wrapping println!/print!/
  writeln!/write!. **Borrow-checker rules** (the hard part): a step only
  reads variables that are surely readable — not after a move (passed /
  assigned / returned / iterated / stored by value, consumed by
  `into_iter`/`unwrap`…, bound by value in `if let`/`while let`/`match`;
  `x = f(x)` makes x readable again), not while lent out as `&mut`
  (`&mut x`, `iter_mut`, `get_mut`, `entry`… for as long as the binding
  lives; in `if let`/`match`/`for` bodies), not a `let x;` before its value;
  Copy values (numbers, bools, chars, refs) are always readable. Iterators
  and IO plumbing are left out. `impl Trait for X` methods (Ord, Display,
  Iterator…) are not traced; nor are closures. If the traced copy still
  does not compile, `dryRun()` says so honestly (Run still works). Checked:
  11 programs print exactly the same traced and untraced (incl. moves,
  `&mut` loans, `let x;`, linked lists, Rc<RefCell> BST, BinaryHeap with
  Reverse, VecDeque, HashMap, BufWriter + writeln!, labels, tuple structs),
  `tests/dryrun-rust.test.js`, and through Compiler Explorer.
- **Loops without an update** (Rust `for`/`loop`, Go `range`): the
  end-of-pass step is added at the end of the body, so `j` is not shown one
  box too far.
- **C# dry run: DONE** (`src/dryrun/csharp.js` + `csharp-runtime.cs`).
  Classic `Main`, top-level programs, local functions and `=>` bodies (the
  `=>` and `;` are commented out so lines stay put); List/arrays (1D, 2D,
  jagged), Dictionary, Stack, Queue, HashSet, PriorityQueue, linked lists,
  exceptions on their line. ToString/Equals/CompareTo and IO helpers are not
  traced. 7 programs print exactly the same traced and untraced on Compiler
  Explorer (.NET 9). CI has no dotnet, so `tests/dryrun-csharp.test.js`
  checks the instrumented code and replays traces recorded from a real run
  (`tests/fixtures/dryrun-csharp-*.json`).
- **C# now runs on .NET 9 first** (Compiler Explorer), Mono as fallback.
  Before, Run/Submit went to Wandbox's Mono first, which gave a false
  compile error for local functions, top-level programs and PriorityQueue.
- **Kotlin dry run: DONE** (`src/dryrun/kotlin.js` + `kotlin-runtime.kt`).
  Block and `= expr` functions (the latter wrapped in `.let { try … }` so
  the type is still inferred), local functions, classes and objects (their
  readable properties; not lateinit, lazy or custom getters), labels,
  `val x: Int` set later. Output is counted by file-level print/println and
  `System.out` → `__Nx.out` (no System.setOut, which the Playground may
  block). The grammar leaves a body written on the next line (`for (…)` ⏎
  body) as the next statement: it is re-attached, so no step goes between.
  5 programs print exactly the same on the Kotlin Playground; tests replay
  recorded traces (`tests/fixtures/dryrun-kotlin-*.json`).
- **Kotlin stderr fix:** the Playground sends stderr in one block per stretch
  between stdout writes; only the first was kept. Now all are joined.
- **Known:** Compiler Explorer's Kotlin (kotlinc 2.3.10) crashes with a
  StackOverflowError even on plain programs (seen 2026-11-16). The Playground
  is first in the chain, so students are not affected unless it is down.
- **Swift dry run: DONE** (`src/dryrun/swift.js` + `swift-runtime.swift`).
  Functions get a frame closed by `defer`; a one-expression body (implicit
  return) becomes `return __nx_f.ret(…)`, but an if/switch that returns from
  its branches stays a statement. Top-level code is the "main" frame.
  Methods read stored properties (not lazy/computed/static; init is not
  traced). `if let`/`guard let`/`while let`/`catch let` bindings, labels,
  `let x: Int` set later. A crash (index out of range, `!` on nil) is a
  signal: reported on its line, then the program stops as before. 6 programs
  print exactly the same on Compiler Explorer and Paiza; tests replay
  recorded traces (`tests/fixtures/dryrun-swift-*.json`).
- **All 10 compiled/typed languages now have the dry run:** Python, C++, C,
  Java, JavaScript, TypeScript, Go, Rust, C#, Kotlin, Swift.
- **Next for the agent: section 6, item 3** — Ruby, PHP, Lua, Perl (they
  have built-in trace hooks; test through the remote runners with the proxy
  preload), then functional languages.
- The owner said **no for now** to the ideas in section 6, item 7.


### Site-wide UI (sessions before 2, PRs #117–#126)

- **Field Journal look**, rolled out in phases to every page. Details are in
  `docs/ui/FIELD_JOURNAL_HANDOVER.md` and `docs/ui/field-journal.md`.
- **Ten themes**, plus "Make it yours" (accent, ink, faces, corners, Dock).
  Theme menu in the top bar. See AGENTS.md.
- **Landing, sign-in and the private "Coming soon" page** with the owner/staff
  sign-in. The NG mark never vanishes.
- **Notes and lessons** share one reader. The search is the "ledger line".
- **Learn** is clear and linked: subject pages open on Lessons.
- **Admin:**
  - AI models (any OpenAI-compatible provider, sealed keys)
  - Site defaults
- **Problems:**
  - search and filters are back
  - one dropdown style everywhere (and dropdowns scroll)
  - source imports fixed
- **Home:**
  - everything in progress rotates, with its real animation
  - "For you today"
  - animations are sized properly
- **Hive:** see `docs/hive/GUIDE.md`.

### Coding (session 2, PR #127)

- **The judge never blames the student** (`src/remote-exec.js`):
  - Each language has a chain of runners: our own Piston servers, then
    Wandbox, Compiler Explorer, Kotlin Playground, Paiza.io.
  - Busy runners are skipped and rested. Real CE/WA/RE/TLE are never retried.
  - When everything is down, the student sees "busy, not your code".
- **Our own runners:**
  - Code: `src/piston.js`, `src/runners.js`, `deploy/runner/setup.sh`,
    `docs/ops/fast-judge.md`.
  - Admin: Admin → Code runners. A runner is tested on save and its password
    is sealed.
  - Or set `PISTON_URL` / `PISTON_TOKEN` on Render. The owner will create the
    machines.
- **Exact errors:**
  - Kotlin errors point at the student's line.
  - C# errors are no longer empty.
  - Julia load errors are reported honestly.
- **Editor help for all 36 languages** (`client/src/lib/langIntel.ts`,
  `langIntelMore.ts`): completions, parameter hints, hover docs.
- **"How it runs"** (Solve tab; `src/explain-run.js`, `/api/explain-run`,
  `client/src/components/solve/journey/`): write → read → check → translate
  (real assembly or bytecode, tied to lines) → run. 20 languages have a real
  listing. Not yet checked on a phone.

### The visual dry run (sessions 2–3, PRs #127, #128, #129)

- **Python:** the tracer is `src/dryrun/python.js`.
- **C++, C, Java, JavaScript, TypeScript** (session 3, PR #129):
  - each has a tree-sitter instrumenter and a small runtime
  - all 193 Learn solutions per language print exactly the right answer when
    traced
  - all five run on Wandbox
- **The shared player:** `client/src/learn/engine/FramePlayer.tsx`, used by
  the DSA chapters and the dry run.
- **The Solve page panel:** `client/src/components/solve/dryrun/DryRunPanel.tsx`,
  plus a Dry run button next to Run and Submit.
- **Session 3 fixes:**
  - pointer-chip contrast
  - a taller dry run, and a full-height Results tab on phones
  - role colours: the journal kit wiped them on every player, the DSA
    chapters included
  - recursion trees
  - dict-of-dict tries
  - ∞ for an "infinity" the code uses
  - long values get wider boxes
  - weights are not graph pointers
  - full screen is a labelled dialog
  - values written the language's way (`nullptr`, `null`, `None`)
  - small records show their fields
  - one recursion tree at a time, only for calls that recurse
  - a reversed list is no longer called circular
  - C/C++ local arrays show only the part written
  - contrast of line numbers and return values
- **Checked:**
  - 14 real Python programs in the browser
  - C++/C/Java/JS/TS programs in the browser
  - axe 0 in light, dark and phone, across several themes
  - bubble sort and 2D DP in all ten themes
  - DSA lesson `/learn/dsa/arrays/6` in all ten themes, light and dark

## 5. The visual dry run — design and how it works

**What the owner asked for:** while solving any problem, in any language, a
student presses **Dry run** and watches their own code run on each sample,
like the DSA chapters:

- arrays appear as boxes and values drop in
- the index variables ride under the boxes, named exactly as in the code
  (`i`, `j`, `j+1`, `lo`, `hi`)
- swaps glide and the current line is lit
- variables show what they were before
- the call stack and the recursion tree grow and shrink
- the output builds up

It must never fail silently.

**The owner's words:** "work on all types of datastructure and as best a
spossible with proper naming present as per the code i want the best work
here". Every picture is named after the student's variable: the list is
`head`, the tree is `root`, the window is `l … r`.

**Pipeline (three layers):**

1. **Trace** (server, per language). The program runs on the normal runners
   with tracing added. It writes one JSON event per step to stderr after the
   marker `\x1eNXT `. The format is documented at the top of
   `src/dryrun/index.js`:
   - Events:
     - `call` (function, call id, depth, arguments)
     - `line` (the line that just ran, changed variables `v`, gone names
       `x`, changed objects `h`, output length `o`)
     - `ret` (`r`)
     - `exc` (`m`)
     - `cap`
   - Values:
     - scalars
     - `{t:'list'|'tuple'|'set'|'deque', n, i}`
     - `{t:'dict', n, k}`
     - `{t:'ref', id}` into the heap
     - `{t:'big'|'num'|'str', s}`
   - Limits: 3000 events, 1.5 MB, 80 items per list, 300 characters per
     string.
   - Per language (`TRACERS` in `src/dryrun/index.js`):
     - **Python** — `python.js`, `sys.settrace`.
     - **C++** — `cpp.js` + `cpp-runtime.h` (prepended, ends with `#line 1`).
       Template serializer, struct fields through a generated
       `friend __nx_fields`, pointers followed only into `new`'d blocks,
       `cout`/`printf` counted, crash signal handler on its own stack.
     - **C** — `c.js` + `c-runtime.h`. Type descriptors from declarations,
       `malloc`/`free` tracked.
     - **Java** — `java.js` + `java-runtime.java` (appended as the
       non-public class `__Nx`). Reflection, try/catch/finally per method.
     - **JavaScript and TypeScript** — `js.js` + `js-runtime.js` (joined onto
       line 1; for TypeScript loaded through `(0, eval)("…")`).
     - **Shared** — `treesitter.js` (parsers from `web-tree-sitter` 0.25.10 +
       `tree-sitter-wasms` 0.1.13, pinned) and `macros.js` (expands the
       student's own `#define`s, line for line).
   - `dryRun()`:
     - when the traced copy does not compile, it runs the student's own
       code; if that also fails, the student sees their own compiler message
     - otherwise it says honestly that the tracer can't follow this program
2. **Frames** (client, `client/src/components/solve/dryrun/`):
   - `replay.ts` rebuilds snapshots from the events. `setLanguage()` decides
     how values are written.
   - `toFrames.ts` picks the picture from the data and how the code uses it:
     - arrays with index pointers, compare / write / new / swap roles, and
       window bands
     - strings as characters
     - sets and tuples
     - stacks and queues (from methods in any language)
     - heaps (array + tree)
     - union-find (forest) and segment trees
     - grids / DP tables (with the cell read and written lit)
     - adjacency lists and matrices (graph)
     - maps
     - linked lists (singly, doubly, circular)
     - binary trees, N-ary trees and tries (objects or dicts of dicts)
     - graph objects
     - bitmasks
     - the recursion tree, call stack, variables with "was", and output
3. **Player** (`client/src/learn/engine/FramePlayer.tsx`, views in
   `client/src/learn/engine/views/`):
   - stage, note, legend, controls, scrubber with marks, speeds, step log,
     full screen (a dialog) and keyboard
   - the DSA chapters use the same player

**Never fails:** every failure shows a plain reason and a way forward:

- a language not traced yet (the panel lists the ones that are)
- the step cap
- a crash: the animation stops on the line, with the message
- the runner is busy
- the program does not compile (the student's own message)
- the tracer can't follow the program (said honestly)

**Known limits (tell the owner if asked):**

- **C:**
  - not followed: pointers into the middle of a block, pointers to arrays
    (`int (*a)[10]`), 2D array parameters, unions, bit-fields, `char*` to
    string literals
  - structs declared inside a function are not drawn
- **JavaScript:**
  - not traced: async and generator functions, and anonymous callbacks
    other than array methods (`sort` comparators, `setTimeout`)
- **All languages:**
  - not traced: input/output helpers (`ni()`, `nextInt()`, `read()`…), on
    purpose
  - a big array is checked only at its start, to find the part in use
    (sieves stay fast)

## 6. What is left, in order (the end-to-end plan)

Each item is one finished, tested PR. Report to the owner after each.

**Decided (owner, session 10):** passing only the examples gives XP once but
shows "Passed the examples", not solved (see `docs/handoff/admin-profile-xp.md`).

### 1. Check the live site after #129 deploys

- On https://nexoraguru.in, open any problem.
- For each of Python, C++, C, Java, JavaScript and TypeScript: paste a small
  program, press Dry run, and see it draw.
- The live server runs code remotely (Wandbox), so this is the real test.
- Note how long TypeScript takes (Wandbox compiles it: about 15–40 s). If it
  is too slow, say so and offer a faster path. Our own Piston runner has
  `tsx`; the owner must create one, see `docs/ops/fast-judge.md`.

### 2. Solve page redesign — every button in its best place — DONE (session 4)

What was built (`client/src/pages/SolvePage.tsx`, `components/solve/CodeEditor.tsx`,
`ProblemPanel.tsx`, `LanguagePicker.tsx`):

- Top bar: language · Dry run · Run · Submit (the one clay button) · ⋯ (full-
  screen arena, layout presets, the key list). The old AI menu is gone.
- Examples: "Run this", "Dry run this", "Add to tests" on each example.
- Editor header: file chip with the saved dot; Format (only JS/TS/JSON/CSS/
  HTML, where Monaco has a real formatter); Snippets; Reset to template;
  **Help** (AI: hint, explain my error, fix my code, ask the tutor ⌘J); ⋯
  Editor settings (theme, font size, indent, wrap, minimap, Vim, AI
  suggestions, copy, download, shortcuts, full screen). Undo/Redo buttons,
  the timer, char count, wrap label and theme name are gone.
- Status bar: Ln/Col, language, issue count (click → Result), saved.
- Results: 4 tabs — Tests (+ "Generate with AI"), Result (issues listed on
  top, click → line; Result | Analysis), Dry run ("Watch it run" / "Under
  the hood"), How it runs (since #145; Coach → Hints was removed then). Old links (`openTab('analysis')` etc.) still land in
  the right tab and view.
- Phone: Dry run · Run · Submit bar at the bottom. Alt+D opens the dry run.
- Checked: axe 0 and no sideways scroll in light, dark and phone; 533 tests.

The plan that was followed:

**The owner's words:** "i want the buttons not everything at the bottom part i
want it to uniquely place all buttons and remove all unnecessary features …
by analyzing what to place where to make it look the best and show case best
… all buttons not just dry run".

**What is there today** (`client/src/pages/SolvePage.tsx`,
`components/solve/*`). It is too much, and much of it appears twice:

- **Top bar:** layout menu, full-screen arena, language picker, an "AI tools"
  menu (Fix my code, Analyse my code, See how it runs, Generate tests, Ask the
  assistant, Inline suggestions), Dry run, Run, Submit.
- **Editor toolbar (15):** editor theme, font −/+, word wrap, minimap, Vim,
  snippets, template, copy, download, undo, redo, keyboard shortcuts, focus.
- **Editor status bar:** Ln/Col, language, indent width, line/char count,
  session timer, wrap state, issue count, saved state, theme name.
- **Bottom panel, 8 tabs:** Tests, Result, Dry run, AI tests, Analysis, How it
  runs, Coach, Issues. Three of these are also in the AI menu.
- **Problem panel:** Description / Submissions, examples with copy and "Add to
  tests", translate bar.

**The plan.** Each control lives where it is used, and nothing appears twice.

1. **Top bar** = the actions on the code, nothing else.
   - Left: the problem title + difficulty.
   - Right, in this order: language picker · **Dry run** · **Run** ·
     **Submit** (the only clay button) · one "⋯".
   - The "⋯" holds: layout, full-screen arena, shortcuts, reset layout.
2. **Actions on a sample sit on the sample.** Each example in the Problem
   panel gets "Run this" and "Dry run this" beside its copy button. They
   select that case and act. "Add to tests" stays.
3. **The editor header is slim.**
   - Left: a file chip (`main.py`, with the saved dot).
   - Right: Format, Snippets, Reset to template, and "⋯ Editor settings"
     (theme, font size, wrap, minimap, Vim, indent, inline AI suggestions,
     copy, download, shortcuts).
   - Remove: the Undo/Redo buttons (the keys stay), the session timer, the
     char count, the theme name and the wrap label.
   - The status bar keeps Ln/Col, language and the issue count. Clicking the
     count jumps to the first error and opens Result.
4. **AI help in one drawer.** One "Help" button (or ⌘J) opens: Hint, Fix my
   code, Explain my error (only when there is one), Ask. "Analyse", "See how
   it runs" and "Generate tests" live in the tabs they open.
5. **Results panel: 4 tabs.**
   - **Tests:** the cases, custom input, "Paste many tests", "Generate tests
     with AI".
   - **Result:** run and judge results, with compile errors explained and
     linked to lines (Issues folds in here).
   - **Dry run:** a switch "Under the hood" shows How it runs.
   - **Coach:** hints, issues, and Analysis (complexity, what to improve).
6. **Phone:** Problem / Code / Results tabs at the top, and a sticky bottom
   bar with Dry run · Run · Submit.
7. **Keys:** Ctrl/⌘+Enter runs, Ctrl/⌘+Shift+Enter submits, Alt+D starts a
   dry run. All are listed in "⋯ → Shortcuts".
8. **Nothing is lost.** Every advanced feature is reachable in at most two
   clicks; only duplicates and noise go.
   - Check: axe 0 in light, dark and phone, no sideways scroll at 360 px.
   - "How it runs" on a phone: checked in #145 (axe 0; it is the last tab,
     so on a narrow phone it shows once the tab row is swiped).

### 3. Dry run for the other languages

- **Go, Rust, C#, Kotlin, Swift: DONE.** The approach — a tree-sitter
  instrumenter + a small runtime that writes the same events, on the same
  lines.
  - The grammars are in `tree-sitter-wasms`.
  - The local box has no compilers for them. Test through Wandbox
    (`remoteRun` in `src/remote-exec.js`, via the demo proxy) and against
    the Learn corpus where solutions exist.
- **Then the rest — NOT NOW (owner, 2026-11-16).** Do not start these:
  - Ruby, PHP, Lua and Perl have built-in trace hooks (like Python's
    `settrace`).
  - Haskell, OCaml, Clojure, Scheme and the other functional languages:
    show calls and values, no boxes, and say so on screen.
- Add each language to `TRACERS` and `DRY_RUN_LANGS`.

### 4. Dry run polish (smaller, can go with item 3) — DONE (sessions 8 and 9)

- **Swift and C# structs** show as one line of text (`UF(p: [0, 0, 2, 3])`):
  draw their fields (as objects without identity) so a union-find's array
  is a real array.

- **JavaScript:** trace async functions and `sort` comparators.
- **C:** pointers into arrays.
- **Labels:** a "first k of N" label when a vector is capped.
- **Linked lists:** the `prev` / `cur` chips sitting on the same node overlap
  a little. Give each pointer its own lane, like arrays do.
- **The step note** reads "Line 8: … — a changes". Say what changed:
  "a[1] 4 → 2".

### 5. Admin → Compilers (approved)

- **One list:** every code-running service with its health and the
  compilers it offers — Wandbox, Compiler Explorer, Paiza.io, Kotlin
  Playground, our own runners.
- **Key-based services:** only where their terms allow it. Check each first:
  self-hosted Judge0, JDoodle free tier, Glot.io, Coliru.
- **Keys:** admins add them, sealed like AI keys.
- **Self-updating:** every few hours the server fetches each service's
  compiler list (`/api/list.json`, `/api/compilers`, `/api/v2/runtimes`…),
  tests them, and updates each language's chain by itself. New versions
  appear without code changes.
- **Controls:** a per-language view of the chain, and on/off per service.

### 6. The older requests (the owner's first brief) — each its own PR

"Add as many features to each as possible."

**A. Compiler and editor, the unfinished parts**

- **Plain-English error explanations on the exact line, for every runner.**
  - Rewrite `client/src/lib/diagnostics.ts` against the real formats:
    - gcc/clang `<source>:L:C`
    - javac `Main.java:L:`
    - Go `./prog.go:L:C`
    - Rust `--> file:L:C`
    - C#/TS/F# `file(L,C):`
    - D/Nim/Pascal `file(L)`
    - Python `File "…", line L`
    - Ruby `file:L:`
    - PHP `on line L`
    - Perl `at file line L`
    - Lua `file:L:`
    - OCaml `File "…", line L, characters`
    - Crystal `In file:L:C`
    - Groovy `@ line L, column C`
    - Scheme `at line L`
    - Node `file:L` + stack frames
    - Java/Kotlin `(File.java:L)`
  - Accept only the student's own file names (`<source>`, `prog.*`, `Main.*`,
    `main.*`, `example.*`, `File.kt`, `/workspace/Main.*`,
    `/home/wandbox/prog.*`, `arena_*`), never system headers.
  - Add a "What it means" line for common errors:
    - undeclared name, missing `;`, unmatched brackets, indentation
    - type mismatch, index out of range, division by zero, null/None
    - bad number input, reading past the input, recursion too deep
    - missing return, code outside a function, Java public class
    - duplicate name, out of memory
  - Show it in the marker, the Result tab and the status bar.
- **Live syntax check while typing**, for every language: unmatched brackets
  and unterminated strings (aware of comments and strings), and Python mixed
  tabs/spaces.
- **Format for every language:** JS/TS through Monaco; brace languages
  re-indented by brace depth; the rest get only trailing whitespace trimmed.
  Say plainly which languages get a full formatter.
- **A cheat sheet per language**, opened from the editor: read a line, read n
  numbers, fast I/O, print, arrays, maps, sort, common mistakes.
- **A Playwright test per language:** completions, signature help, hover and
  cheat sheet.
- **Coding analysis page** (`client/src/pages/AnalyticsPage.tsx`,
  `/api/stats`): by difficulty, tag, language, verdict trend, time to solve,
  weak tags with links; plus a per-problem analysis.
- **Levels:**
  - show "+XP" and level progress on Accepted
  - the Profile explains how the level is earned: Problem XP is the Rift
    level (`calcLevel`), plus a quarter of the Nexus web rank
    (`src/nexus/ranks.js`)

**B. Problem pipeline** (`src/sources/*.js`)

- Every source imports the full statement, all samples, limits, tags, rating
  and images. Images are stored and served by us, never hot-linked.
- An audit script, and an Admin page of gaps per source and per problem, with
  re-import.
- Never bypass bot protection. Use official APIs and open datasets
  (`src/sources/cf-dataset.js`).

**C. Staff-only "Add a coding problem" editor** (`src/authz`) — DONE (session 7, see section 3)

- Statement with maths and images.
- Samples + hidden tests (paste, upload or generate).
- Limits, a custom checker, tags, rating, editorial.
- Solutions in 5 languages, run on the judge against every test before
  publishing.
- Preview as a student.

**D. Social** (`src/routes/social.js`, `client/src/components/social/*`) — DONE (#141)

- DMs, and groups (create, invite, roles).
- Typing indicator, read receipts, attachments, reactions, search.
- Rich share cards for problems, solutions, contests and GATE questions.

**E. Contests** (`/api/contests/*`, `client/src/components/contests/*`,
`pages/WorkshopPage.tsx`) — DONE (session 8, see section 3)

- Make a contest from anywhere: pick questions and timeline, share a link.
- Custom questions with every feature:
  - coding: statement, samples, hidden tests, limits, editorial
  - GATE: MCQ / MSQ / NAT, marks, negative marks, figures, solutions
- Teacher GATE contests: marks list, analysis per question, per student and
  per time, CSV export.

**F. Linked platforms** (`src/accounts.js`) — DONE (session 8, see section 3)

- More sites.
- Proof of ownership by a one-time code the user puts on their profile there.
- Import solves and achievements.
- Real OAuth only where it exists (GitHub). Never a fake permission screen.

### 7. Ideas never started — the owner said NO for now (2026-11-16): do not start them

- Fine-tuned Nexora models trained on our own data (GATE solutions,
  animation scenes).
- A Modal or Kaggle version of the model farm.
- More DSA chapters to the same depth as the finished ones.

## 7. How to check your work

```bash
npm install && npm install --prefix client
npm test                                    # all must pass (533 at the end of session 3)
cd client && npx tsc -b && npx oxlint <touched files> && npx vite build
npm i --no-save --prefix /tmp/axe axe-core  # once, for the browser checks
```

**The demo server, with the real code runners:**

- The container needs the agent proxy.
  1. Install `https-proxy-agent` in a scratch folder.
  2. Write a preload that sets it as the agent on every `https.request` to a
     non-localhost host (CA `/root/.ccr/ca-bundle.crt`).
  3. Start the demo:
     `NODE_OPTIONS="-r /path/preload.js" PORT=3300 node scripts/hive-demo.js`
     (NODE_OPTIONS, so the server's child process gets it too).
- Log in as owner / owner123.
- The demo database is new on every start. Rebuild the client after client
  changes, and restart the demo after server changes (the runtimes are read
  when it starts).

**Scripts:**

- `node client/scripts/check-page.cjs <route> <name> [light,dark,phone]` —
  axe + overflow + screenshots for any page.
- `node client/scripts/check-dryrun.cjs <name> <lang> <file> [light|dark|phone] [theme]`
  — runs the dry run on the Solve page:
  - creates the test problem if missing
  - `STEP=mid` moves the scrubber, `FOCUS=1` opens full screen
  - `WAIT=40000` for TypeScript
- `node scripts/dryrun-trace.mjs <file> <lang> [input]` — what each step
  draws, in the terminal (`AT=20 N=3`, `EV=10`).
- `node scripts/dryrun-trace.mjs --corpus <lang>` — every Learn solution must
  print exactly its expected output when traced. Use it after any tracer
  change. Python, C++, C, Java and JS give 193/193. TypeScript gives 192/193
  under Node's quick type-stripping: one solution has a top-level `return`
  that `tsx` and Wandbox accept.
- To force the remote runners, call `remoteRun(code, input, lang)` from
  `src/remote-exec.js` through the proxy preload.

## 8. Things learnt the hard way

**Dry run:**

- A step is sent before each statement and reports the line before it. A
  loop's end-of-pass step runs before its update (`j++`), or the pointers
  show one box too far.
- **Java:**
  - only read variables that are surely assigned
  - never add a statement after `return`/`break` (unreachable is a compile
    error)
  - put the step before a label, not between the label and its loop
  - methods returning `byte`/`short`/`char` need a cast around the
    returned value
- **C++:**
  - the judge swaps `<bits/stdc++.h>` for its own list on clang, so the
    runtime includes exact headers and must build with GCC and Clang
  - `vector<int> a(n);` parses like a prototype; treat a local prototype
    with unnamed parameters as a variable
- **TypeScript on Wandbox** is compiled down to old JavaScript, where
  `for…of` over a Map does nothing. Hence the eval'd runtime.
- **Big arrays:** scan only their start on every step, or a sieve of a
  million takes minutes.

**Styles:**

- `[data-kit='journal'] .viz-cell` has the same specificity as the role
  rule and loads later. Role colours need their own journal rule
  (`theme/styles.css`).
- axe fails opacity fades and small coloured text on tints. Use solid
  tokens: secondary text for quiet text, and mix the state colours toward
  the text colour.
