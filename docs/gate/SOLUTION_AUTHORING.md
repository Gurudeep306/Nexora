# GATE solution authoring guide (format v2)

You are writing worked solutions for the GATE question bank. Follow this file literally.
Correctness comes first; presentation second.

- Contract (types): `client/src/gate/solution/types.ts`
- JSON Schema: `src/gate/solution.schema.json`
- Validator: `node scripts/gate/validate-solutions.mjs <paperId>` (must print `0 errors`)
- Question printer: `node scripts/gate/question.mjs <paperId> --todo` / `<questionId>`
- Worked examples (copy their style): `src/gate/solutions/*.json`

## 1. Workflow (one paper at a time)

1. `node scripts/gate/question.mjs cse-2012 --todo` — lists the paper's questions with type, marks, stored key, figure descriptions.
2. For each question: **solve it yourself from scratch**, then compare with the stored key (`key:` line).
3. Write the solution into `src/gate/solutions/<paperId>.json` (create the file if missing — see §2). Only touch your paper's files.
4. If the question data is wrong (text, options, key, subject/topic, header junk such as "Computer Science and Information Technology (CS2)" pasted into an option), add a correction to `src/gate/fixes/<paperId>.json` (§7) and run `node scripts/gate/apply-fixes.mjs <paperId>`.
5. `node scripts/gate/validate-solutions.mjs <paperId>` until it reports 0 errors. Fix warnings too unless you have a reason.
6. `npm test` (root) must stay green.

Source PDFs (when available locally) live in `GATE_PYQ/` at the main checkout root.

## 2. File format

```json
{
  "paper": "cse-2012",
  "version": 2,
  "solutions": {
    "cse-2012-cs-40": { "...Solution..." }
  }
}
```

Keys of `solutions` are question ids from `questions.json` and must belong to this paper. Keep the file formatted with 2-space indentation.

## 3. Solution object

| Field | Required | Rules |
|---|---|---|
| `approach` | yes | 1–3 sentences (20–600 chars): the **best** method and why it is the best. |
| `concepts` | yes | 1–6 short concept names, e.g. `"SRTF (preemptive SJF)"`. |
| `given` | no | Compact restatement of the data (markdown; a small table is ideal). Use it when the question is long, has a figure, or lists numbers. |
| `steps` | yes | 2–12 steps (normally 3–8). See §4. |
| `answer` | yes | See below. |
| `optionAnalysis` | MCQ/MSQ/TF/MATCH with options | One entry per option **in order** `A, B, C, D`: `{ "option": "A", "correct": false, "reason": "…" }`. `correct` must equal membership in `answer.choice`. Each reason says *why* — e.g. which mistake produces that distractor. |
| `shortcut` | recommended | A faster exam-hall route (only if it is genuinely valid). |
| `pitfalls` | recommended | 1–5 traps students fall into. |
| `verification` | recommended | How you double-checked: an independent method, back-substitution, a sanity bound. |
| `animation` | optional | The base frame of the canvas (§5). |

`answer`:

```json
{ "value": "**19 ms** — option (D)", "choice": ["D"], "matchesKey": true }
{ "value": "$x + 10y =$ **34**", "number": 34, "matchesKey": true }
{ "value": "The program prints **9**", "number": 9, "matchesKey": false,
  "keyNote": "Stored key is 1, but tracing gives 9 …" }
```

- `value`: display markdown.
- `choice`: required for MCQ (exactly one letter), MSQ (one or more), TF/MATCH with options.
- `number`: required for NAT (the value you computed; the validator accepts it if it lies in the key range, e.g. `"0.49 to 0.51"`).
- `matchesKey`: `true` only if your answer agrees with the **current** stored key. The validator recomputes this and errors if you are wrong either way.
- `matchesKey: false` requires `keyNote` **and** an entry for that question in `src/gate/fixes/<paper>.json` — either an `answer` fix (when the official key confirms you; then re-run apply-fixes and set `matchesKey: true`) or `needsReview: true` + `reviewNote` (when you cannot see the official key). Before declaring a key wrong, re-solve twice with different methods.
- DESC/FILL questions: no `choice`/`number`; `matchesKey` asserts textual agreement with the stored answer.

## 4. Steps

```json
{ "title": "t = 2: P3 arrives and preempts P1",
  "body": "P1's remaining time is $10-2=8$; P3 needs $6$ …",
  "scene": { "upto": 8, "cursor": 8 } }
```

- `title`: short, specific, no numbering ("Step 2:" is added by the page). Plain text + `$math$`.
- `body`: markdown + KaTeX. **Show every arithmetic step** (`$\frac{16+37+6+17}{4} = \frac{76}{4} = 19$`), never just the result. Small tables and lists are welcome.
- Use the best method (the one a topper would use), not a generic template. No filler ("Using the governing laws…").
- `scene`: optional frame patch (§5).

### Markdown + KaTeX conventions (the renderer is `client/src/learn/md.tsx`)

- Inline math `$…$` on one line; display math `$$…$$` on its own line(s). A literal dollar is `\$`.
- In JSON every backslash is doubled: `"$\\frac{1}{2}$"`, newlines are `\n`.
- Supported: `**bold**`, `*italic*`, `` `code` ``, lists (`- `, `1. `), tables (`| a | b |` + `|---|---|`), fenced code (```` ```c ````), `### headings`, `> quote`. **No raw HTML.**
- Inside table cells never write `|` inside math — use `\mid` or `\lvert … \rvert`.
- Use `\text{…}` for words inside math, `\times` for multiplication, `\cdot` sparingly, `\lceil \rceil`, `\binom{n}{k}`.
- The validator parses every formula with KaTeX; fix what it reports.

## 5. Animation: frames and patches

The canvas shows one **frame** per step. Frame semantics:

1. `solution.animation` is the base frame (it has `kind`).
2. Each step's `scene` is a **shallow patch** applied on top of the previous step's frame: listed keys replace the old values, omitted keys keep theirs. **Arrays and objects are replaced, never merged** (to change one node's colour, resend the whole `tones` map).
3. A step without `scene` keeps showing the previous frame.
4. A `scene` that contains `kind` starts a **fresh** frame (no merge) — use it to switch primitive (e.g. Gantt → result table).
5. `kind: "panels"` patches merge element-wise: `"panels": [null, { "reveal": 2 }]` keeps panel 0 and patches panel 1.

So the design pattern is: put the **complete final structure** in the base (all nodes, all bars, the whole DP table) and let steps reveal/colour it with small patches (`upto`, `reveal`, `tones`, `subs`, `edgeTones`, `hl`, `current`, `vars`, `caption`).

### When to animate

- **Animate** processes: scheduling, page replacement, pipelines, automata runs, graph algorithms, tree/heap/BST operations, DP tables, sorting/searching, stacks/queues, code traces, sliding windows, protocol timelines.
- **Static figure** (an `animation` with no step scenes) for formula/aptitude questions where one picture helps (Venn, number line, probability tree, binomial bars).
- **No animation** for pure-fact or definition questions. Do not invent decorative visuals.
- Every frame must show the question's **actual data** — never a generic demo.

### Common fields (every kind)

`title` (heading above canvas), `caption` (one short markdown line under it), `vars` (`{"name": value}` chips; changed values glow).

### Tones (colours)

Never write colours. Use `tone`: `default`, `accent` (in focus now), `success` (done / hit / final answer), `error` (fault / rejected / no-update), `warning` (candidate / just updated), `info` (visited / tree edge), `muted` (discarded), `cat1`–`cat3` (extra categories). Be consistent within a solution.

## 6. Scene primitives (minimal JSON)

Indices are 0-based unless stated. Ids are case-sensitive strings.

**array** — cells with indices, pointers, highlights, brackets (`variant: "linked"` draws a linked list). Give cells `id`s if they move (swaps glide).
```json
{ "kind": "array", "label": "A", "cells": [5, 2, { "v": 9, "id": "n9", "tone": "success" }, 1],
  "pointers": [{ "name": "i", "at": 1 }], "hl": [{ "at": [0, 1], "tone": "warning" }],
  "ranges": [{ "from": 0, "to": 2, "label": "window" }] }
```
**stack** (bottom → top; `popped` ghosts the removed item) / **queue** (front → rear; `dequeued`)
```json
{ "kind": "stack", "items": ["a", "+", "b"], "popped": "*" }
{ "kind": "queue", "items": ["P2", "P3"], "dequeued": "P1" }
```
**table** — DP tables, truth tables, relations, page tables. `hl` marks a cell (`r`,`c`), a row (`r` only) or a column (`c` only); `reveal: N` shows the first N body cells row-major (fill animation); `arrows` for back-pointers.
```json
{ "kind": "table", "cols": ["ε", "a", "b"], "rowLabels": ["ε", "a"], "corner": "A \\ B",
  "rows": [[0, 0, 0], [0, 1, 1]], "reveal": 4, "hl": [{ "r": 1, "c": 1, "tone": "accent" }],
  "arrows": [{ "from": [1, 1], "to": [0, 0] }], "mono": true }
```
**matrix** — matrices and operators.
```json
{ "kind": "matrix", "terms": [{ "name": "A", "rows": [[1, 2], [3, 4]], "hl": [{ "r": 0 }] }, "×", { "rows": [[1], [0]] }] }
```
**graph** — nodes/edges with weights; coordinates in any consistent unit (scaled to fit) or `layout: "circle" | "layered"`. Patch `tones`, `subs` (badges such as distances) and `edgeTones` (`"from>to"`) instead of resending nodes/edges.
```json
{ "kind": "graph", "directed": true,
  "nodes": [{ "id": "S", "x": 0, "y": 0 }, { "id": "A", "x": 2, "y": 0 }],
  "edges": [{ "from": "S", "to": "A", "w": 4 }],
  "tones": { "S": "success" }, "subs": { "S": "0", "A": "4" }, "edgeTones": { "S>A": "warning" } }
```
**tree** — nested nodes; `null` children reserve a slot (BST left/right); array labels draw B-tree nodes; `edge` labels the edge from the parent (probability trees). Give `id`s when labels repeat. Patches replace the whole `root`.
```json
{ "kind": "tree", "root": { "label": 71, "children": [{ "label": 65, "children": [null, { "label": 69, "tone": "accent" }] }, { "label": [80, 90] }] } }
```
**automaton** — DFA/NFA/PDA. `layout: "row"` (default without coords), `"circle"` or manual `x`/`y`. One edge per state pair (merge symbols: `"0,1"`). `current` = active state set, `tape` with `head` (index of next symbol), PDA `stack`, `edgeTones`.
```json
{ "kind": "automaton", "states": [{ "id": "q0", "start": true }, { "id": "q1", "accept": true }],
  "edges": [{ "from": "q0", "to": "q1", "label": "1" }, { "from": "q0", "to": "q0", "label": "0" }],
  "current": ["q0"], "tape": { "cells": ["0", "1"], "head": 0 } }
```
**gantt** — CPU scheduling / multiprocessor / I/O lanes. Put the whole schedule in the base and grow it with `upto` + `cursor`. Same bar label ⇒ same colour.
```json
{ "kind": "gantt", "unit": "ms", "lanes": [{ "label": "CPU", "bars": [{ "start": 0, "end": 2, "label": "P1" }] }],
  "marks": [{ "t": 1, "label": "P2↓" }], "upto": 2, "cursor": 2 }
```
**pipeline** — instructions × cycles. `start` is the 1-based cycle of `cells[0]`; `"-"` is a stall. `hl.c` and `forwards` use **cycle numbers** (1-based), rows 0-based. Grow with `upto`.
```json
{ "kind": "pipeline", "rows": [{ "label": "I1", "start": 1, "cells": ["IF", "ID", "EX"] }, { "label": "I2", "start": 2, "cells": ["IF", "-", "ID", "EX"] }],
  "forwards": [{ "from": [0, 3], "to": [1, 5] }], "upto": 5 }
```
**paging** — simulated by the page (FIFO/LRU/OPT; OPT ties evict the earliest-loaded page). Always set `expectFaults` (validated) and update it when you patch `policy`/`frames`/`refs`. Grow with `upto`.
```json
{ "kind": "paging", "policy": "LRU", "frames": 3, "refs": [1, 2, 3, 2, 4], "upto": 5, "expectFaults": 4 }
```
**cache** — sets × ways with tags; `access` highlights the current lookup.
```json
{ "kind": "cache", "sets": [{ "lines": [{ "tag": "0x1A" }, null] }, { "lines": [null, null] }], "access": { "set": 0, "way": 0, "result": "hit" } }
```
**bits** — IP/subnet, address splits (tag/index/offset), IEEE-754, instruction formats. `bits` uses `0`, `1`, `x`; `group: 8` adds byte gaps.
```json
{ "kind": "bits", "group": 8, "rows": [{ "label": "addr", "fields": [{ "bits": "110000001010", "label": "tag", "tone": "accent" }, { "bits": "0110", "label": "offset" }], "value": "0xC0A6" }] }
```
**kmap** — 2–4 `variables` (rows = first half, Gray order); `ones`, `dcs`, `groups` (must be valid power-of-two wrap-around rectangles over 1s/don't-cares — validated), `hl` cells.
```json
{ "kind": "kmap", "variables": ["P", "Q", "R", "S"], "ones": [0, 2, 8, 10], "dcs": [5], "groups": [{ "cells": [0, 2, 8, 10], "label": "Q′S′" }] }
```
**circuit** — logic gates (AND, OR, NOT, NAND, NOR, XOR, XNOR, BUF), auto-layered; with all input `value`s set the page computes and colours every wire.
```json
{ "kind": "circuit", "inputs": [{ "id": "A", "value": 1 }, { "id": "B", "value": 0 }],
  "gates": [{ "id": "g1", "type": "NAND", "in": ["A", "B"] }], "outputs": [{ "id": "Y", "from": "g1" }] }
```
**sequence** — message sequence / timing diagrams (TCP handshakes, sliding window, stop-and-wait); `lost: true` draws a dropped message. Grow with `upto`.
```json
{ "kind": "sequence", "actors": ["Sender", "Receiver"], "unit": "ms",
  "messages": [{ "from": "Sender", "to": "Receiver", "t0": 0, "t1": 2, "label": "F0" }, { "from": "Receiver", "to": "Sender", "t0": 2, "t1": 4, "label": "ACK1" }] }
```
**numberline** / **venn** (2–3 sets; region keys `"A"` = only A, `"AB"` = A∩B only, `"ABC"`, `"-"` outside) / **bars**
```json
{ "kind": "numberline", "min": 0, "max": 10, "points": [{ "x": 3, "label": "x₀" }], "intervals": [{ "from": 2, "to": 5, "open": [false, true] }] }
{ "kind": "venn", "sets": [{ "id": "A", "label": "Java" }, { "id": "B", "label": "C" }], "regions": { "A": 12, "AB": 5, "B": 8, "-": 3 }, "hl": [{ "region": "AB" }] }
{ "kind": "bars", "bars": [{ "label": "k=3", "value": 4, "display": "4/16", "tone": "success" }] }
```
**equation** — a derivation chain; TeX **without** `$`; grow with `reveal`.
```json
{ "kind": "equation", "lines": [{ "tex": "P(HH)=\\tfrac15+\\tfrac15", "note": "total probability" }, { "tex": "=\\tfrac25", "tone": "success" }], "reveal": 1 }
```
**code** — code trace: `line` (1-based current line), `hl` lines, `vars` chips, `callStack`, `output`.
```json
{ "kind": "code", "lang": "c", "code": "int x = 1;\nx += 2;", "line": 2, "vars": { "x": 3 }, "callStack": [{ "name": "main", "vars": { "x": 3 } }], "output": "" }
```
**panels** — 2–3 frames side by side (`dir: "col"` to stack), e.g. graph + distance table, tree + equation.
```json
{ "kind": "panels", "panels": [{ "kind": "tree", "root": { "label": "pick" } }, { "kind": "equation", "lines": [{ "tex": "x=1" }] }] }
```

## 7. Fixes files (question corrections)

`src/gate/fixes/<paperId>.json`:

```json
{ "paper": "cse-2025-2",
  "fixes": [
    { "id": "cse-2025-2-cs-16", "field": "options",
      "before": [ "...exact current value..." ], "after": [ "...corrected value..." ],
      "reason": "Page header pasted into option D.", "source": "pdf p.7" } ] }
```

- `field` ∈ `text, options, answer, type, marks, figures, topic, subject, tags, needsReview, reviewNote`.
- `before` must be the **exact current value** (copy it with `node scripts/gate/question.mjs <id> --json`); `after` replaces it wholesale (for `options`, give the full array).
- One fix per (id, field). `source`: `pdf p.N` when you checked the PDF, otherwise the evidence (e.g. `transcription artifact (running page header)`).
- Apply with `node scripts/gate/apply-fixes.mjs <paperId>` (idempotent; refuses on any mismatch and writes nothing). Commit both the fixes file and `questions.json`.
- Change an `answer` only with an official key in hand; otherwise flag with `needsReview` + `reviewNote`.
- Known data problems to look for: page headers/footers inside text or options, one-line code that lost its formatting, Unicode maths italics (𝑃, 𝑥) instead of `$P$`, wrong subject/topic (many CS questions are filed as `ga/quant`), and suspicious 2026 NAT keys (several are `1`).

## 8. Size budget

Each solution must be **≤ 12 KB** of minified JSON (validator error). Patterns that keep it small: full structure once in `animation`, small patches per step; `tones`/`subs`/`edgeTones` for graphs; `upto`/`reveal` instead of repeating tables.

## 9. Checklist (every solution)

- [ ] Solved independently; answer agrees with the key — or `matchesKey:false` + `keyNote` + fixes entry.
- [ ] Best method stated in `approach`; every arithmetic step written out.
- [ ] `optionAnalysis` for every option, with the reason each distractor is wrong.
- [ ] Animation (if any) uses the question's real data; each step's frame matches its text.
- [ ] Data errors in the question corrected through the fixes file.
- [ ] `node scripts/gate/validate-solutions.mjs <paperId>` → 0 errors; `npm test` green.
