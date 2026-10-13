# GATE bulk verification pass

Every GATE question is checked against its original PDF (GATE_PYQ/), its
figures are redrawn, and a v2 solution is written (docs/gate/SOLUTION_AUTHORING.md).

- `batches.json` — 319 batches of ≤13 question ids (newest papers first), each
  with the paper's source PDF. cse-2023 was the pilot and is already done.
- `workflow.js` — the Claude Code workflow that runs one agent per batch in an
  isolated worktree. Each agent commits only part files
  (`src/gate/{solutions,fixes}/<paper>.part-<n>.json`) and SVGs, so batches never conflict.

After a wave: merge the agents' worktree branches into `gate-bulk`, then
`node scripts/gate/combine-parts.mjs && node scripts/gate/apply-fixes.mjs && node scripts/gate/validate-solutions.mjs`,
run `npm test`, commit, push, and remove the worktrees to free disk space.
