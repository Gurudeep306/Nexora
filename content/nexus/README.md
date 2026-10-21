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

- **Web:** the client pins every node to a point of the lattice web. A subject owns a wedge
  inside its domain's group, and a node sits further from the centre the deeper its
  prerequisites go. Links run along the web's branches.
- **Path:** clicking a subject opens its Rift path (zones as bands, nodes as orbs).
- **Progress:** a node's progress comes from GATE notes lessons completed and PYQs answered
  correctly. Subjects with neither start at 0 and unlock through their prerequisites.
- **Ranks:**
  - The subject rank is the mean node mastery, shown as Novice, Apprentice, Adept, Expert
    or Master, plus `rankTitle`.
  - The web rank adds every subject's concept XP on top of DSA XP.

## Streams

Every subject names its `stream` (for example `"stream": "math"`). Streams are
listed in `_streams.json` with a display name, an accent hue and their order
around the radial overview; related streams sit next to each other so the
connections between subjects stay short. `npm run nexus:check` rejects a
subject without a stream or with one that `_streams.json` does not list.
