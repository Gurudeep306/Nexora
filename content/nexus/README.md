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

## Courses

Every node has a course at `/learn/<subject>/<concept>` (and every subject at
`/learn/<subject>`), generated from these data files — nothing to register.

- **Digital Logic** (and any subject with `gate.notesSubject`): the course page sends you to
  the GATE notes lesson the node teaches (`lessons` in the node), e.g.
  `/learn/dl/place-value` → `/gate/notes/dl/place-value`.
- **Other GATE subjects** (`gate.pyqSubject`, no notes yet): the course page opens the GATE
  practice with that concept's PYQs (`/gate/practice?ids=…`).
- **DSA:** "Study this" opens the DSA learning hub (`/learn`).
- **Everything else:** a course page showing the concept, its subject and stream, what it
  needs and unlocks (linked), and "Course coming soon".

To write a course, add a Markdown file — no code changes:

```
content/courses/<subject>/<concept>.md   the concept's course
content/courses/<subject>/index.md       the subject's introduction
```

Supported Markdown: `#`/`##`/`###` headings, paragraphs, `-` lists, `**bold**`, `` `code` ``
and `[links](/path or https://…)`. The page picks the file up on the next visit.

## Streams

Every subject names its `stream` (for example `"stream": "math"`). Streams are
listed in `_streams.json` with a display name, an accent hue and their order
around the radial overview; related streams sit next to each other so the
connections between subjects stay short. `npm run nexus:check` rejects a
subject without a stream or with one that `_streams.json` does not list.
