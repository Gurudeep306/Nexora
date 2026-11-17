# GATE Notes pipeline: how a subject is built (binding)

This is the end-to-end pipeline for building a GATE notes subject to the
**Digital Logic standard**. It is binding for every agent. Read it in full
before you start any stage, and again before you start each new chapter.

The four subjects to build now, in this order:

| Order | Subject | Key | PYQs | Notes state today | Subject file |
|---|---|---|---|---|---|
| 1 | Discrete Mathematics | `dm` | 392 | Outline done (8 ch, 33 lessons); Ch 1 published; Ch 2 has a plan only | [`dm.md`](dm.md) |
| 2 | Theory of Computation | `toc` | 306 | Nothing yet | [`toc.md`](toc.md) |
| 3 | Compiler Design | `cd` | 214 | Nothing yet | [`cd.md`](cd.md) |
| 4 | Computer Organisation & Architecture | `coa` | 272 | Nothing yet | [`coa.md`](coa.md) |

The rules for animations and Live Labs are in [`animations.md`](animations.md).
The prompt for the agent that does the work is in [`VIBE_PROMPT.md`](VIBE_PROMPT.md).

---

## 0. The bar: what "Digital Logic standard" means, in numbers

Digital Logic (`content/gate-notes/dl/`) is the reference. Open its lessons and
copy their shape, depth and tone. What it has:

| Measure | Digital Logic | Minimum for every new subject |
|---|---|---|
| Lessons | 41 in 7 chapters | Every syllabus topic and every PYQ topic has a lesson |
| Words of lesson text | ≈ 375,000 (≈ 9,000 per lesson) | ≥ 6,000 per lesson; ≥ 8,000 for core lessons |
| Animated scenes (`viz/*.json`) | 163 (≈ 4 per lesson) | **≥ 6 per lesson** (the owner wants *more* than DL) |
| Live Lab uses (`:::lab`) | 16 (one lab per chapter, used in several lessons) | **≥ 1 lab per chapter**, used in ≥ 2 lessons of it |
| Worked examples (`:::example`) | 844 (≈ 20 per lesson) | ≥ 4 per concept, ≥ 15 per lesson |
| PYQs embedded (`:::pyq`) | 304 / 304 (100 %) | **100 % of the subject's PYQs**, each with `tests="…"` |
| Practice questions (`practice.json`) | per chapter | ≥ 25 per chapter, our own, each with a full solution |
| Verification scripts (`_checks/<subject>/`) | every answer re-derived | every number, table, key and practice answer re-derived by code |

"Minimum" means minimum. A lesson that meets the numbers but reads thin is
not done. Depth, clarity and correctness come first, always.

---

## 1. Ground rules (never broken)

1. **Never commit to `main`.** One branch per unit of work (a chapter, a lab,
   a viz-engine change). Open a pull request. Merge only when CI is green and
   the gate for that stage is met (see §5).
2. **No force-push, no history rewrite, no skipped, disabled or deleted test.**
   If a check fails, fix the cause.
3. **Nothing is copied.** The reference notes (`GATE_NOTES/`) and websites are
   a coverage checklist and a fact-check only. Every sentence, example,
   diagram and question in a lesson is written in Nexora's own words, with our
   own numbers. No scans, crops, traced figures, screenshots or pasted
   paragraphs. Never name the authors or institutes of the reference notes;
   sets are "A, B, C…" only.
4. **Reference notes and digests are never committed to this repo.** The repo
   is public. `GATE_NOTES/` and `content/gate-notes/_digest/` are gitignored:
   keep it that way. Never `git add -f` them.
5. **Every fact is verified.** Every PYQ key, worked-example answer, table,
   truth table, automaton, parse table, cache trace, pipeline diagram and
   practice answer is recomputed by a script in
   `content/gate-notes/_checks/<subject>/` (Python, `sympy` available). If a
   PYQ's stored answer in `src/gate/questions.json` disagrees with your
   derivation, check the official key (gate.iitk.ac.in / IIT answer keys,
   GATE Overflow discussions as a pointer, never as proof) and record the
   disagreement in `_errata/<subject>.md`; never silently change a key.
6. **No model names or ids** in commits, PR titles/bodies or code comments.
7. **No secrets, no personal data** in commits or in requests to outside
   services.
8. **Design rules** (see `AGENTS.md`): design tokens only, colour means
   something, clay is never text, no glows, gradients or neon; light and dark
   both work; `prefers-reduced-motion` respected; no sideways scroll at 360 px.
   Do not change Hive.
9. **Free sources only.** Use free textbooks' public pages, official syllabus
   and answer keys, university lecture notes, NPTEL, Wikipedia (for checking),
   and GATE Overflow (for spotting traps, never as a source of truth). Never
   use paid, leaked or pirated material.

---

## 2. Where everything lives

| What | Path |
|---|---|
| Lessons | `content/gate-notes/<s>/NN-chapter/NN-lesson-slug.md` |
| Chapter meta | `content/gate-notes/<s>/NN-chapter/_meta.json` (`title`, `summary`) |
| Chapter plan (internal) | `content/gate-notes/<s>/NN-chapter/_plan.md` |
| Practice questions | `content/gate-notes/<s>/NN-chapter/practice.json` |
| PYQ → block map (optional) | `content/gate-notes/<s>/NN-chapter/pyq-map.json` |
| Animated scenes | `content/gate-notes/<s>/viz/<name>.json` (generated by `_checks/<s>/_viz_chN*.py`) |
| Subject meta | `content/gate-notes/<s>/_meta.json` |
| Master outline (internal) | `content/gate-notes/<s>/_outline.md` |
| PYQ coverage report (generated) | `content/gate-notes/<s>/_coverage.md` |
| Verification scripts | `content/gate-notes/_checks/<s>/*.py` (files starting `_` are helpers, not run by CI) |
| Errata (internal) | `content/gate-notes/_errata/<s>.md` |
| Progress tracker | `content/gate-notes/_progress.json` |
| Style guide (binding) | `content/gate-notes/_style.md` |
| Reference notes (NOT in git) | `GATE_NOTES/` (see §3) |
| Digests (NOT in git) | `content/gate-notes/_digest/<s>/` |
| Build script | `scripts/build-gate-notes.js` (block vocabulary, `LAB_TABS`) |
| Live Labs | `client/src/gate/notes/labs/*.tsx` + `index.ts` |
| Viz engine | `client/src/viz/` (`schema.ts`, `VizScene.tsx`, `VizPlayer.tsx`, `geometry.ts`, `viz.css`) |
| PYQ bank | `src/gate/questions.json` (`subject`, `topic`, `answer`, `solution`) |
| Nexus subject | `content/nexus/<s>.json` (nodes link `lessons` and `pyqTopics`) |

The production build (`npm run notes:build`) ships only lessons with
`status: published` and `needs_review: false`. Drafts never reach users, so
merging a draft chapter is safe.

---

## 3. The reference notes (`GATE_NOTES/`)

Thirteen merged PDFs, one per subject, 6,574 pages. Each holds several note
sets, A–F. `content/gate-notes/_inventory.md` lists every set's page range,
topics and scan quality. For our four subjects:

| Subject | PDF | Sets |
|---|---|---|
| dm | `GATE_NOTES/…Discrete_Mathematics…pdf` | A–E |
| toc | `GATE_NOTES/…TOC…pdf` | A–E |
| cd | `GATE_NOTES/…Compiler_Design…pdf` | A–F |
| coa | `GATE_NOTES/…COA…pdf` | A–F |

They are kept in a **private** repository, never in this public one. To get
them onto your machine:

```bash
cd <your Nexora checkout>
git clone https://github.com/Gurudeep306/nexora-gate-notes.git GATE_NOTES   # private; gitignored here
cd GATE_NOTES && ./join.sh && cd ..   # re-joins any PDF that was split into <95 MB parts
mkdir -p content/gate-notes/_digest && cp -R GATE_NOTES/digests/* content/gate-notes/_digest/ 2>/dev/null || true
python3 scripts/gate-notes/inventory.py --notes GATE_NOTES   # must print the 13 subjects
```

The DL and DM digests made earlier (if the owner had them on disk) arrive in
`content/gate-notes/_digest/`; reuse the DM ones, write new ones for the other
subjects. How the owner sets up the private repo: [`owner-setup.md`](owner-setup.md).

**If `GATE_NOTES/` is not available**, do not stop and do not guess what the
notes say. Write the digest stage from the official syllabus, the PYQs and the
standard textbooks (listed in each subject file), and mark it in
`_progress.json` as `"digests": "textbook-only"`. The notes are only a coverage
checklist; the lessons never depend on them.

Reading scans: render pages to PNG at the dpi in `_quality.json` and read
them as images. Many sets are handwritten; `pypdf` text extraction gives
nothing useful for them.

```bash
pdftoppm -r 200 -f 120 -l 130 -png GATE_NOTES/<file>.pdf /tmp/toc-A   # pages 120–130
```

---

## 4. The stages

Each stage ends with a **gate**: a concrete test that must pass before the next
stage starts. Record each stage in `content/gate-notes/_progress.json`
(`subjects.<s>.stages`, and per chapter `chapters[].status` and
`lessons_status`) in the same PR as the work.

### N0 — Setup and inventory (once per subject)
1. Read `AGENTS.md`, `content/gate-notes/_style.md`, this file,
   `animations.md`, the subject file, and two full DL lessons
   (`dl/01-number-systems/06-ieee-754.md`, `dl/06-sequential-circuits/*` — pick
   the longest) and one DM lesson (`dm/01-propositional-logic/01-*.md`).
2. List the subject's PYQs from `src/gate/questions.json`
   (`subject === "<s>"`): count by `topic`, by year, by marks, by type. Save the
   counts in the outline (N1).
3. Check the PYQ bank's health for the subject: entries with `needsReview`,
   figures, and answers you will need to re-derive. (Today: dm 25, toc 27,
   cd 17, coa 29 flagged `needsReview`.)
4. Copy the reference notes in (§3), or record "textbook-only".

**Gate N0:** you can list the subject's PYQ count by topic, and you have read
the DL lessons above in full.

### N1 — Digests and master outline (Checkpoint A)
1. **Digests (internal, never committed):** for every set, page by page, write
   `content/gate-notes/_digest/<s>/<set>.md`: topics, definitions, theorems,
   tricks, typical examples (in your own words), and errors you find (these go
   to `_errata/<s>.md`, which is committed). Digests are a checklist of *what*
   to cover, never text to reuse.
2. **Master outline** `content/gate-notes/<s>/_outline.md`, in the exact format
   of `dl/_outline.md` and `dm/_outline.md`:
   - how the map was built (official syllabus + every set + every PYQ);
   - a chapter table (folder, lessons, PYQs, estimated time);
   - for each lesson: id `<s>-NN-MM-slug`, prerequisites (cross-subject
     ones too, e.g. `dl:sequential-analysis`), sub-topics, sets and pages,
     `pyq_topics`, **the full list of PYQ ids assigned to it**, time,
     **diagrams/animations planned (≥ 6)**, the Live Lab, practice themes and
     gaps (topics thin in every set, to be written from textbooks).
   - **Every PYQ of the subject is assigned to exactly one lesson.**
3. Write `_checks/<s>/_assign.py` (makes the assignment, if you script it) and
   `_checks/<s>/outline_pyq_assignment.py`, which **fails** unless every PYQ id
   in the bank for `<s>` appears exactly once in the outline. Copy
   `_checks/dm/outline_pyq_assignment.py`.
4. Subject `_meta.json` (title ≤ 80, description ≤ 400, `order`, `icon`,
   `color`, `pyq_scope: ["<s>"]`). Use orders: dl 1, coa 2, dm 3, toc 4, cd 5
   (check that no other subject already uses the number; if one does, use the
   next free one).

**Gate N1:** `python3 scripts/gate-notes/run_checks.py <s>` passes (assignment is
100 %), and the outline lists ≥ 6 animations and a lab for every lesson. One PR:
"`<Subject>` notes N1: master outline (X chapters, Y lessons, Z/Z PYQs
assigned)".

### N2 — Chapter plan (one per chapter, before writing it)
`NN-chapter/_plan.md`, like `dl/01-number-systems/_plan.md`:
- each lesson's section list (headings), the block ids you will use, and which
  PYQ tests which block;
- every viz scene by name, with its steps listed in one line each (what moves,
  what the caption says);
- the chapter's Live Lab: its tabs, inputs, what it shows, and the
  verification vectors it must agree with;
- the practice questions' themes (≥ 25).

**Gate N2:** the plan covers every PYQ assigned to the chapter and every
sub-topic in the outline.

### N3 — Live Lab and viz-engine work for the chapter (code)
Build what the chapter needs **before** writing its lessons, so lessons embed
working labs. Follow [`animations.md`](animations.md). In one PR per lab:
1. `client/src/gate/notes/labs/<Name>.tsx` + pure logic in
   `labs/<name>Logic.ts`; register in `labs/index.ts` **and** in `LAB_TABS` in
   `scripts/build-gate-notes.js` (names and tabs must match exactly).
2. Lab test vectors: `_checks/<s>/lab_vectors_chN.json` produced by a Python
   reference implementation in `_checks/<s>/`, and a Node test in
   `tests/gate-notes-<s>.test.js` that runs the lab's TS logic on the same
   vectors and must agree (see how `tests/gate-notes-dm.test.js` does it).
3. If the chapter needs a new viz element type (state, tape, stack, waveform,
   code…), add it to the viz engine first (schema + renderer + validation +
   test) as described in `animations.md` §3.

**Gate N3:** `npm test`, `cd client && npx tsc -b`, `npx oxlint src`,
`npx vite build` pass; the lab works with the keyboard; axe shows 0 violations
in light, dark and at 360 px with no sideways scroll (`client/scripts/check-page.cjs`);
reduced motion turns animation off.

### N4 — Write the lessons (one lesson at a time)
For each lesson, in order:
1. **Frontmatter** (every field; the build rejects unknown ones):

   ```yaml
   ---
   id: <slug, = file name without NN->
   subject: <s>
   chapter: <chapter slug, = folder without NN->
   title: <title>
   order: <NN as a number>
   prerequisites: [<lesson ids, same subject or subject:id>]
   pyq_topics: [<s>/<topic>, …]   # must exist in the bank
   est_minutes: <1–240>
   difficulty: basic | intermediate | advanced
   status: review          # "published" only after N7
   needs_review: false
   sources:
     - "Nexora's own text, examples and diagrams; every … is recomputed in content/gate-notes/_checks/<s>/<script>.py."
     - "Coverage checklist only (internal digests, never copied): set A pp. …, set B pp. …"
     - "Facts checked against standard textbooks: …"
     - "PYQs: src/gate/questions.json (<s>/<topic>); all N keys re-derived in <script>.py."
   updated: "YYYY-MM-DD"
   ---
   ```
2. **Opening** (2–3 short paragraphs: what this lesson builds and why it
   matters), then `## Where this fits` (links to earlier and later lessons with
   `[text](lesson:<id>)`, and to other subjects with `/gate/notes/<s>/<id>`).
3. **GATE radar** table (`:::table{#radar …  depth="quick"}`): PYQ count and
   years, marks split, the 3–5 recurring patterns with years, and "what
   examiners test".
4. **Body**, following `_style.md` exactly:
   - for every concept the full arc: `:::intuition` (analogy or puzzle) →
     `:::definition` → why it works (`:::theorem` + `:::proof`, or
     `:::derivation`) → how to use it → `:::trap` / `:::trick`;
   - **≥ 4 worked examples per concept** (easy → medium → GATE → tricky edge
     case), always `:::example{level}` with `:::step{why="…"}` per step and a
     final `:::answer`;
   - **a `:::viz` scene wherever something moves or changes** — every
     algorithm, construction, conversion, trace, table fill, state change,
     pipeline, derivation and parse is animated step by step (≥ 6 per
     lesson; see `animations.md` for what each subject must animate);
   - `:::lab` where the reader should try it themselves;
   - `:::check` (quick self-test) after each major section;
   - a 2–4 line recap at the end of each section.
5. **PYQs inside the lesson:** embed every PYQ assigned to this lesson at the
   point where the reader can solve it: `:::pyq{id="cse-…" tests="block-id,block-id"}`.
   `tests` names the concept blocks it tests (ids must exist). The PYQ's
   solution in the bank must be teacher-quality (concept tested, steps, why each
   wrong option is wrong, faster trick); if it is not, improve the solution in
   `src/gate/questions.json` following `docs/gate/SOLUTION_AUTHORING.md`, and
   verify it in `_checks`.
6. **End of lesson:** `## Summary` (`:::summary`), `## Common mistakes`, and
   `:::practice{id="…"}` embeds for the lesson's practice questions.
7. **Verification script** `_checks/<s>/lN_MM_<slug>.py`: recompute every
   number in the lesson's examples, every table, every PYQ key assigned to
   it, and every practice answer. It must fail loudly on any mismatch.
8. **Viz scenes** for the lesson are generated by `_checks/<s>/_viz_chN_lMM.py`
   (a `SPECS` dict of scene builders), merged and written by `_viz_chN.py`,
   and checked by `viz_chN.py` (files equal generator output). Copy the DM
   pattern (`dmlib.parts`, `dmlib.write_viz`). Scenes that show computed
   results (a DFA's table, a parse, a cache trace) **must take their data from
   the same Python reference code the checks use**, never typed by hand.

Build and check after every lesson:

```bash
node scripts/build-gate-notes.js --drafts       # must print no errors
python3 scripts/gate-notes/run_checks.py <s>    # every script passes
```

**Gate N4 (per lesson):** the build has no errors; the lesson's checks pass;
it meets the §0 numbers; it reads well aloud (no walls of algebra, a "why"
after every "what").

### N5 — Practice questions (per chapter)
`practice.json`: ≥ 25 of our own questions per chapter, a mix of MCQ, MSQ and
NAT, 1 and 2 marks, easy to GATE-hard. Fields: `id` (`nx-<s>-NN-MM-qNN`),
`type`, `marks`, `text`, `options` (MCQ/MSQ), `answer`, `solution` (list of
steps), `concept`, `common_wrong` (`[{answer, why}]`), `blocks` (the block ids
it practises). Never reuse a PYQ's wording. Every answer is recomputed in
`_checks/<s>/`.

### N6 — Nexus, Learn and search linkage (per chapter, same PR as the lessons)
1. `content/nexus/<s>.json`:
   - set `"gate": { "pyqSubject": "<s>", "notesSubject": "<s>" }`;
   - every lesson is linked from at least one node (`"lessons": ["<lesson id>"]`),
     and every node's `pyqTopics` matches the lessons' topics;
   - node `desc`, `summary` and `topics` describe what the lesson teaches (see
     `content/nexus/dl.json`);
   - keep the rules in `content/nexus/README.md`: 4–7 zones, 12–40 nodes,
     1–10 nodes per zone, no dangling `requires`, no cycles (cross-subject
     `requires` like `"dl:sequential-analysis"` are encouraged where true).
2. Check: `npm run nexus:check` and `node --test tests/nexus-subjects.test.js`.
3. The Learn subject page (`/learn/<s>`) and the search index
   (`client/src/lib/lessonSearch.ts`) read the built notes automatically. Open
   `/learn/<s>` and confirm the chapter's lessons appear and open in the reader.
4. Site map: the subject appears automatically as `gate.notes.<s>`; do not
   hard-code anything.

### N7 — Review (per chapter, before publishing)
1. **Self-review**, as a strict GATE examiner, lesson by lesson: every
   definition exact, every theorem's conditions stated, every example's answer
   re-derived, every trap real, every PYQ solution correct, nothing copied.
   Write the findings and fixes in the PR description.
2. **Independent review:** request a second-pass review from a reviewer of a
   different model family (in Hive: the review step; otherwise ask the owner to
   run it). The reviewer checks: correctness of every PYQ key and example,
   misleading statements, missing syllabus topics, copied text, animation
   accuracy (each step's caption matches the frame), accessibility.
3. Fix every finding, re-run every check, record in `_progress.json` like DL
   (`"review": "YYYY-MM-DD: second-pass examiner review: N findings (…) all
   fixed and re-checked; X/X PYQ keys re-derived"`).
4. Browser check every lesson of the chapter (`client/scripts/check-page.cjs`,
   light, dark, phone): axe 0, no sideways scroll, every viz plays and every
   lab loads. Attach screenshots (light, dark, phone) to the PR.

**Gate N7:** zero open findings, all checks green, screenshots attached.

### N8 — Publish (per chapter)
Set each lesson's `status: published`. Run `npm run notes:build` (production
build) and `npm run notes:check`, commit the regenerated `src/gate/notes/`,
and merge when CI is green. After the last chapter, set the subject
`_meta.json` `status` to `published` only when `_coverage.md` says 100 %
(the build fails otherwise, by design).

### N9 — Wrap-up (per subject)
- `_progress.json` stages all `done`;
- `docs/handoff/` note: what was built, numbers against §0, open items;
- AGENTS.md "Where things stand" updated in the same PR.

---

## 5. Git and PR workflow

- Branch names: `notes/<s>-n1-outline`, `notes/<s>-ch03`, `notes/<s>-lab-<name>`,
  `notes/viz-<element>`.
- One PR per chapter (lessons + viz + practice + checks + Nexus links +
  regenerated `src/gate/notes/`). Labs and viz-engine changes get their own PRs
  first.
- Before every push, all of these pass locally:
  ```bash
  npm test
  npm run notes:check
  python3 scripts/gate-notes/run_checks.py
  npm run nexus:check
  cd client && npx tsc -b && npx oxlint src && npx vite build
  ```
- PR description: what was built, the §0 numbers for the chapter, the review
  findings and fixes, screenshots (light, dark, 360 px phone).
- Merge (squash) only when CI is green. Chapters with `status: review` may be
  merged (they don't ship); flipping to `published` needs Gate N7.
- If a merge conflict appears: merge `main` into your branch (never rebase a
  shared branch), regenerate `src/gate/notes/` with the build script (never
  hand-merge generated JSON), re-run all checks.

---

## 6. When you are unsure

- A syllabus point is ambiguous → follow the official GATE CSE syllabus PDF
  (gate2026/2027 site) and note the decision in the outline.
- Two sources disagree → derive it yourself, verify by script, record in
  `_errata/<s>.md`.
- A PYQ is ambiguous or its official key is disputed → say so in its solution
  ("Official key: B; IIT accepted B and C"), with the reasoning.
- A feature is missing in the viz engine or reader → build it properly (§N3),
  with tests, in its own PR. Never fake an animation with a static image.
- You cannot do something to the standard → stop, write what blocks you in the
  PR and in `_progress.json`, and move to the next independent unit.
