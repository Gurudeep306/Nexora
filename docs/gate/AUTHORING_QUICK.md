# GATE solutions — quick card (v2)

The compact version of `docs/gate/SOLUTION_AUTHORING.md`. Read this; open the full guide only for the one scene primitive you use (`grep -n -A4 '^\*\*graph\*\*' docs/gate/SOLUTION_AUTHORING.md`).

## Solution object
`{ approach, concepts, given?, steps, answer, optionAnalysis?, shortcut?, pitfalls?, verification?, animation? }`
- `approach`: 1–3 sentences (20–600 chars) — the best (topper's) method and why.
- `concepts`: 1–6 short names.
- `given`: optional compact restatement (small markdown table) for long/figure/number-heavy questions.
- `steps`: 2–12 `{ title, body, scene? }`. Title short, no "Step n:". Body = markdown + KaTeX, **every arithmetic step written out**, no filler.
- `answer`:
  - MCQ `{ value, choice: ["B"], matchesKey }` (exactly one) · MSQ `choice` ≥ 1 · NAT `{ value, number: 34, matchesKey }` · DESC/FILL `{ value, matchesKey }`.
  - `matchesKey` must equal agreement with the **current stored key** (the validator recomputes it; keys with " or " alternatives count if any matches).
  - `matchesKey: false` ⇒ `keyNote` + a fixes entry (`answer` fix with the official key, or `needsReview: true` + `reviewNote`).
- `optionAnalysis` (MCQ/MSQ/TF/MATCH with options): one entry per option in order A, B, C, D: `{ option, correct, reason }` — say why each distractor is wrong.
- `shortcut`, `pitfalls` (1–5), `verification` (how you double-checked).
- Size ≤ 12 KB minified per solution.

## How much to write
- **Aptitude, one-formula, definition and fact questions:** keep it short — 2–4 steps, no animation (a static figure only if it really helps). Still do `optionAnalysis` and `verification`.
- **Multi-step technical questions:** 3–8 steps; animate procedures (scheduling, paging, pipelines, automata, graph/tree/heap/BST ops, DP tables, sorting, stacks/queues, code traces, protocols) with the question's real data.

## Markdown / KaTeX
Inline `$…$`, display `$$…$$`; in JSON double every backslash (`"$\\frac{1}{2}$"`), newlines `\n`. Lists, tables, fenced code allowed; **no raw HTML**; never `|` inside math in a table cell (use `\mid`). `\text{}` for words in math.

## Animation in one paragraph
`animation` = base frame with `kind`; each step's `scene` is a shallow patch (listed keys replace; arrays/objects replaced whole); a `scene` with `kind` starts a fresh frame. Put the full structure in the base and reveal it with small patches (`upto`, `reveal`, `tones`, `subs`, `edgeTones`, `hl`, `current`, `vars`, `caption`). Colours only via tones: `default accent success error warning info muted cat1-3`.
Primitives: `array stack queue table matrix graph tree automaton gantt pipeline paging(expectFaults required) cache bits kmap(valid groups) circuit sequence numberline venn bars equation(tex without $) code panels`.

## Fixes (`src/gate/fixes/<paper>.part-<n>.json` in the bulk pass)
`{ id, field, before (exact current value — copy via node scripts/gate/question.mjs <id> --json), after, reason, source }`; field ∈ `text options answer type marks figures topic subject tags needsReview reviewNote`; one fix per (id, field); `options` replaced as a full array. Change an `answer` only with an official key or overwhelming evidence; otherwise `needsReview`.

## Checklist
Solved independently first · key agreement right · best method · every option analysed · data errors fixed · validator 0 errors.
