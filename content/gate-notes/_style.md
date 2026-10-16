# GATE Notes — writing style (binding for every lesson)

This file adds the owner's feedback to the build prompt (§4 lesson template, §6 diagrams, §7
questions, §10 checklist). Where they differ, this file wins.

## Depth: fuller, "bulky" explanations
The owner wants explanations that are **generous and complete**, not terse. Concretely:
- **Every concept gets the full arc:** intuition (analogy or puzzle) → precise definition → why it
  works → how to use it → what goes wrong. Never jump straight to the rule.
- **Explain each step in sentences**, as a teacher talking to the class. Prefer two clear
  paragraphs over one dense one. Say *why* after every *what*.
- **More worked examples:** at least **4 per concept** (easy → medium → GATE-level → tricky edge
  case), each in the step format below. Add a second method or a sanity check when one exists.
- **Show the thinking, not just the result:** call out the moment of insight ("notice that…",
  "the key observation is…") and the common wrong turn.
- **Recap at the end of each section** in 2–4 lines before moving on.
- **Still to the point:** depth means more explanation of the idea, not filler, repetition or
  history lessons. Every sentence must teach something.

## Blocks
- Every block spans the full lesson width (already enforced by the reader).
- One idea per block. Use `:::intuition` before every new idea.
- **Worked examples always use steps:** `:::example{level}` → problem, `:::step{why="…"}` for each
  step (what we do + why), `:::answer`. Never a wall of algebra.
- Every formula has a `:::derivation` (or links to one) and a sanity check.
- Every GATE-used theorem has `:::theorem` + `:::proof`, with the proof idea first.
- `:::trick` always explains why it works and when it fails; `:::trap` names the wrong answer
  examiners expect.

## Diagrams and animations (build prompt §6)
- A diagram every few paragraphs on visual topics; **animate wherever motion teaches** (conversions,
  carries, grouping, traversal, pipelines, state changes), with a caption for every step.
- All diagrams are our own Viz specs: no scans, crops or traced images.
- At least **one Live Lab per chapter**, backed by the same verified functions as `_checks/`.

## PYQs
- Every PYQ of the subject is mapped to the blocks that teach it (coverage must be 100% before a
  subject is published).
- Each embedded PYQ gets a full teacher-style solution: concept tested, steps, why the wrong
  options are wrong, and a faster trick if one exists.

## Typography
- Body font: **Shantell Sans** (owner kept the default). "Clean font" toggle stays available.
