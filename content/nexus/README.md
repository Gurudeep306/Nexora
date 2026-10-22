# Nexus subjects

Every `*.json` file in this folder is one subject in the Nexus web. Files are
discovered when the server starts. Nothing lists subjects in code, so adding a subject
means dropping in a file and running the checks:

```sh
npm run nexus:check                       # validates every file
node --test tests/nexus-subjects.test.js  # the same checks plus API tests
```

## Format

```json
{
  "id": "os",                        // = the file name
  "name": "Operating Systems",
  "short": "OS",                     // 2–5 chars, used when zoomed out
  "group": "gate" | "beyond" | "core",
  "domain": "core-cs",               // neighbourhood in the web (any string; same string = same region group)
  "order": 4,                        // tie-breaker for placement
  "icon": "server",                  // a semantic icon name (client/src/components/icon/names.ts)
  "color": "#14b8a6",
  "description": "One sentence.",
  "rankTitle": "Kernel Whisperer",   // subject-rank title (default: "<short> Pathfinder")
  "gate": { "pyqSubject": "os", "notesSubject": null },   // only for subjects with GATE PYQs / notes
  "zones": [ { "level": 1, "name": "Processes & threads" } ],   // chapters, 1..N in order
  "nodes": [
    {
      "id": "processes",             // kebab-case, unique in the subject, stable
      "zone": 1,
      "name": "Processes",
      "icon": "cpu",
      "desc": "One or two sentences.",
      "kind": "concept" | "lesson" | "project",
      "requires": ["process-model", "coa:io-interrupts"],    // same subject: bare id; other subject: "subject:id"
      "pyqTopics": ["os/processes"], // optional: GATE bank "subject/topic" keys
      "pyqTags": ["fork"],           // optional: narrow the PYQ pool by tag substrings
      "pyqs": ["cse-2005-cs-62"],    // optional: explicit PYQ ids
      "lessons": ["place-value"],    // optional: GATE notes lesson ids (with gate.notesSubject)
      "target": 8,                   // optional: PYQs to master (default min(pool, 10))
      "xpReward": 60,
      "resources": [ { "title": "…", "url": "https://…" } ]
    }
  ]
}
```

A file with `"engine": "dsa"` carries only the metadata. That subject's nodes and
solve-count progress come from code (`src/nexus/dsa-nodes.js`).

## Rules the checks enforce

- No dangling `requires`, whether within a subject or across subjects.
- No cycles anywhere in the web, across subjects too.
- Each subject has 4–7 zones and 12–40 nodes, and every zone has 1–10 nodes.
- Every `pyqTopics` key and `pyqs` id exists in `src/gate/questions.json`.
- Every file has a `domain`.

## How a subject's data is used

- **Overview:** `/nexus` draws every subject as one sector of a single radial tree, zones as
  rings outward from you, subjects grouped by stream (see Streams below).
- **Subject tree:** clicking a subject opens `/nexus?subject=<id>` — its own Rift tree (zones
  as bands, nodes as orbs), built only from that subject's nodes. Prerequisites in other
  subjects appear as "Needs · X" chips in the node panel.
- **Progress:** a node's progress comes from GATE notes lessons completed and PYQs answered
  correctly. Subjects with neither start at 0 and unlock through their prerequisites.
- **Courses:** a node's "Study this" goes to its course — see Courses below.

## Ranks (fair and reachable)

The web has about 1,380 concepts. No one should need most of them, so both ladders are
tuned to what a dedicated learner can actually do. The code is `src/nexus/ranks.js`.

**Web rank** — its own ladder of web XP (the Rift's names and badges):

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Web XP | 0 | 150 | 400 | 900 | 1,800 | 3,300 | 5,600 | 9,000 | 14,000 | 22,000 | 34,000 |

- An average concept is worth about 100 XP, so level 2 comes after two or three concepts
  (one study session) and each later level is roughly 1.6× the last: always in sight.
- The top rank, 34,000 XP, is about 330 mastered concepts — one whole stream plus solid
  breadth, roughly a quarter of the web's concept XP. Tests keep it between 18% and 32%.
- What earns web XP, so effort feels proportionate:
  - a concept: its `xpReward` × mastery (a 60-XP concept at 50% gives 30; projects carry
    their larger `xpReward`);
  - a GATE notes lesson finished: +15;
  - a GATE PYQ answered correctly (up to the concept's target): +5;
  - DSA: a quarter of the problem XP (a solve is ~5–25 web XP) plus the DSA skill nodes'
    concept XP.
- No rank drops: the level shown is never below the best one stored for the user
  (`nexus_scores.web_level`), so the switch to this ladder can only move people up.
- The cards say how close the next rank is: "Next rank in about N concepts · X XP".

**Subject rank** — from the subject's mastery (mean node mastery):

| Tier | Novice | Apprentice | Adept | Expert | Master |
|---|---|---|---|---|---|
| From | 0% | 15% | 35% | 60% | 80% |

- Master also comes as soon as every **core** node is mastered: optional nodes may be
  skipped. Projects are optional (`"optional": true` in the data); mark any other node
  `"optional": true` (or a project `"optional": false`) to change that.
- Every threshold is at or below the old 20/40/60/80% one, so no subject tier drops.
- The subject card shows "Next: Expert at 60% — about N concepts".

## Courses: one tree page per subject

Every subject has **one** page, its course tree, at `/learn/<subject>` (DSA:
`/learn/dsa`), linked from the Nexus, from `/learn` (All subjects) and, for
GATE subjects, from the GATE home. Its nodes are the lessons, in learning
order. Opening a node blooms its lesson in place at `/learn/<subject>/<node>`
(DSA: `/learn/dsa/skill/<node>`): the tree folds into a path rail (what it
builds on, the node and its sections, what it unlocks) and the lesson fills
the page:

- **Subjects with GATE notes** (`gate.notesSubject`, Digital Logic): the real
  notes lesson the node teaches (`lessons` in the node), rendered inline with
  the notes reader. `/gate/notes/dl/<lesson>` keeps working as before.
- **Subjects with a written course:** `content/courses/<subject>/<node>.md`.
- **Everything else:** a "coming soon" lesson with the same structure (summary,
  what you'll learn, PYQ practice, Explain with AI, mark as learned / test out).

Older addresses redirect: `/gate/subjects/<id>[/<node>]`, `/learn/<id>#<node>`
and `/nexus?subject=<id>&node=<node>` (or `?node=<id>:<node>`).

To write a course, add a Markdown file — no code changes:

```
content/courses/<subject>/<concept>.md   the concept's lesson
```

Supported Markdown: `#`/`##`/`###` headings (the `##` ones become stops on the
rail), paragraphs, lists, `**bold**`, `` `code` `` and links. The lesson picks
the file up on the next visit.

## Hubs: Learn and GATE → Nexus

`_hubs.json` maps every Learn course and every GATE PYQ-bank subject to exactly
one Nexus subject (`tests/nexus-hubs.test.js` checks that every bank subject
has a home or a documented exception, that every Nexus subject has one
reachable page and that no static route shadows one). The map is served with
the structure (`hubs`), and the hubs read it:

| Nexus subject | Stream | Page | Learn hub | GATE hub (paper · bank id) | Lessons |
|---|---|---|---|---|---|
| Data Structures & Algorithms (`dsa`) | GATE Core CS | `/learn/dsa` | All subjects · [DSA Course](/learn?tab=dsa) | — | DSA course + problems |
| Digital Logic (`dl`) | GATE Core CS | `/learn/dl` | All subjects | CSE `dl` | GATE notes (embedded) |
| Computer Organisation (`coa`) | GATE Core CS | `/learn/coa` | All subjects | CSE `coa` | Notes coming soon (tree, PYQs) |
| Operating Systems (`os`) | GATE Core CS | `/learn/os` | All subjects | CSE `os` | Notes coming soon (tree, PYQs) |
| Databases (`dbms`) | GATE Core CS | `/learn/dbms` | All subjects | CSE `db`, DA `dbw` | Notes coming soon (tree, PYQs) |
| Computer Networks (`cn`) | GATE Core CS | `/learn/cn` | All subjects | CSE `cn` | Notes coming soon (tree, PYQs) |
| Theory of Computation (`toc`) | GATE Core CS | `/learn/toc` | All subjects | CSE `toc` | Notes coming soon (tree, PYQs) |
| Compiler Design (`cd`) | GATE Core CS | `/learn/cd` | All subjects | CSE `cd` | Notes coming soon (tree, PYQs) |
| Algorithms (`algo`) | GATE Core CS | `/learn/algo` | All subjects | CSE `algo` | Notes coming soon (tree, PYQs) |
| Programming & Data Structures (C) (`c`) | GATE Core CS | `/learn/c` | All subjects | CSE `pds` | Notes coming soon (tree, PYQs) |
| Discrete Mathematics (`dm`) | Mathematics | `/learn/dm` | All subjects | CSE `dm` | Notes coming soon (tree, PYQs) |
| Linear Algebra (`la`) | Mathematics | `/learn/la` | All subjects | CSE `la`, DA `la` | Notes coming soon (tree, PYQs) |
| Probability & Statistics (`prob`) | Mathematics | `/learn/prob` | All subjects | CSE `prob`, DA `prob` | Notes coming soon (tree, PYQs) |
| Calculus (`calc`) | Mathematics | `/learn/calc` | All subjects | CSE `calc`, DA `calc` | Notes coming soon (tree, PYQs) |
| Statistics (`statistics`) | Mathematics | `/learn/statistics` | All subjects | — | Course coming soon |
| Graph Theory (`graph-theory`) | Mathematics | `/learn/graph-theory` | All subjects | — | Course coming soon |
| Number Theory (`number-theory`) | Mathematics | `/learn/number-theory` | All subjects | — | Course coming soon |
| Numerical Methods (`numerical-methods`) | Mathematics | `/learn/numerical-methods` | All subjects | — | Course coming soon |
| General Aptitude (`ga`) | Mathematics | `/learn/ga` | All subjects | CSE `ga`, DA `ga` | Notes coming soon (tree, PYQs) |
| Machine Learning (`ml`) | AI & Data | `/learn/ml` | All subjects | DA `ml` | Notes coming soon (tree, PYQs) |
| Deep Learning (`deep`) | AI & Data | `/learn/deep` | All subjects | — | Course coming soon |
| Data Science (`data-science`) | AI & Data | `/learn/data-science` | All subjects | — | Course coming soon |
| Data Engineering & Big Data (`data-engineering`) | AI & Data | `/learn/data-engineering` | All subjects | — | Course coming soon |
| Natural Language Processing (`nlp`) | AI & Data | `/learn/nlp` | All subjects | — | Course coming soon |
| Computer Vision (`computer-vision`) | AI & Data | `/learn/computer-vision` | All subjects | — | Course coming soon |
| Reinforcement Learning (`reinforcement-learning`) | AI & Data | `/learn/reinforcement-learning` | All subjects | — | Course coming soon |
| Generative AI & LLMs (`genai-llms`) | AI & Data | `/learn/genai-llms` | All subjects | — | Course coming soon |
| MLOps (`mlops`) | AI & Data | `/learn/mlops` | All subjects | — | Course coming soon |
| Robotics (`robotics`) | AI & Data | `/learn/robotics` | All subjects | — | Course coming soon |
| Information Retrieval (`information-retrieval`) | AI & Data | `/learn/information-retrieval` | All subjects | — | Course coming soon |
| Artificial Intelligence (`ai`) | AI & Data | `/learn/ai` | All subjects | DA `ai` | Notes coming soon (tree, PYQs) |
| Python (`python`) | Programming Languages | `/learn/python` | All subjects | DA `pdsa` | Notes coming soon (tree, PYQs) |
| Java (`java`) | Programming Languages | `/learn/java` | All subjects | — | Course coming soon |
| C++ (`cpp`) | Programming Languages | `/learn/cpp` | All subjects | — | Course coming soon |
| JavaScript (`javascript`) | Programming Languages | `/learn/javascript` | All subjects | — | Course coming soon |
| TypeScript (`typescript`) | Programming Languages | `/learn/typescript` | All subjects | — | Course coming soon |
| Go (`go`) | Programming Languages | `/learn/go` | All subjects | — | Course coming soon |
| Rust (`rust`) | Programming Languages | `/learn/rust` | All subjects | — | Course coming soon |
| SQL (`sql`) | Programming Languages | `/learn/sql` | All subjects | — | Course coming soon |
| Web Development (`web`) | Web & App | `/learn/web` | All subjects | — | Course coming soon |
| App Development (`app`) | Web & App | `/learn/app` | All subjects | — | Course coming soon |
| UI/UX & HCI (`ui-ux`) | Web & App | `/learn/ui-ux` | All subjects | — | Course coming soon |
| Frontend Frameworks: React/Vue (`frontend-frameworks`) | Web & App | `/learn/frontend-frameworks` | All subjects | — | Course coming soon |
| Backend Frameworks: Node/Django/Spring (`backend-frameworks`) | Web & App | `/learn/backend-frameworks` | All subjects | — | Course coming soon |
| Android Development (`android`) | Web & App | `/learn/android` | All subjects | — | Course coming soon |
| iOS Development (`ios`) | Web & App | `/learn/ios` | All subjects | — | Course coming soon |
| System Design (`sysd`) | Software Engineering | `/learn/sysd` | All subjects · [System Design Studio](/learn?tab=sysdesign) | — | Course coming soon |
| OOP & Design Patterns (`oop-patterns`) | Software Engineering | `/learn/oop-patterns` | All subjects | — | Course coming soon |
| Software Engineering & Testing (`software-engineering`) | Software Engineering | `/learn/software-engineering` | All subjects | — | Course coming soon |
| APIs & Microservices (`apis-microservices`) | Software Engineering | `/learn/apis-microservices` | All subjects | — | Course coming soon |
| Git (`git`) | Systems & Cloud | `/learn/git` | All subjects | — | Course coming soon |
| Linux & Shell (`linux-shell`) | Systems & Cloud | `/learn/linux-shell` | All subjects | — | Course coming soon |
| Distributed Systems (`distributed-systems`) | Systems & Cloud | `/learn/distributed-systems` | All subjects | — | Course coming soon |
| Parallel & Concurrent Programming (`parallel-programming`) | Systems & Cloud | `/learn/parallel-programming` | All subjects | — | Course coming soon |
| Cloud Computing (`cloud`) | Systems & Cloud | `/learn/cloud` | All subjects | — | Course coming soon |
| DevOps (`devops`) | Systems & Cloud | `/learn/devops` | All subjects | — | Course coming soon |
| Docker & Kubernetes (`containers`) | Systems & Cloud | `/learn/containers` | All subjects | — | Course coming soon |
| Embedded Systems & IoT (`embedded-iot`) | Systems & Cloud | `/learn/embedded-iot` | All subjects | — | Course coming soon |
| Cybersecurity (`cybersecurity`) | Security | `/learn/cybersecurity` | All subjects | — | Course coming soon |
| Cryptography (`cryptography`) | Security | `/learn/cryptography` | All subjects | — | Course coming soon |
| Blockchain (`blockchain`) | Security | `/learn/blockchain` | All subjects | — | Course coming soon |
| Competitive Programming (`cp`) | Theory & Frontier | `/learn/cp` | All subjects | — | Course coming soon |
| Complexity Theory (`complexity`) | Theory & Frontier | `/learn/complexity` | All subjects | — | Course coming soon |
| Quantum Computing (`quantum-computing`) | Theory & Frontier | `/learn/quantum-computing` | All subjects | — | Course coming soon |
| Computer Graphics (`computer-graphics`) | Theory & Frontier | `/learn/computer-graphics` | All subjects | — | Course coming soon |
| Game Development (`game-dev`) | Theory & Frontier | `/learn/game-dev` | All subjects | — | Course coming soon |

Bank subjects without a tree, and why:

- `legacy`: Topics dropped from the current GATE CSE syllabus (microprocessors, software engineering, web, graphics, numerical methods). Practised from GATE practice; the live subjects for them are software-engineering, web, computer-graphics and numerical-methods.

## Streams

Every subject names its `stream` (for example `"stream": "math"`). Streams are
listed in `_streams.json` with a display name, an accent hue and their order
around the radial overview; related streams sit next to each other so the
connections between subjects stay short. `npm run nexus:check` rejects a
subject without a stream or with one that `_streams.json` does not list.
