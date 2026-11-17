# Prompt for the next session

Copy everything inside the box below into a new Claude Code session on the
Nexora repository (use the "Nexora" cloud environment, so the judges' and
code runners' sites can be reached).

````text
You are continuing work on NexoraGuru (GitHub repo Gurudeep306/Nexora, live at
https://nexoraguru.in). Work with the highest, most professional quality
possible: it must never fail, it must look like the rest of the site, and you
must be honest about anything that is not possible.

STEP 0 — Read first, in this order:
  1. AGENTS.md and CLAUDE.md (the project rules).
  2. docs/HANDOFF.md section 3 "Where it stands" (session 8: everything up to
     #145 is merged, no PR is open) and section 6 "What is left".
  3. docs/ui/field-journal.md and docs/ui/premium.md (the look).

BRANCH: work only on your session's own branch. Never commit to main.

MERGING (standing permission from me): squash-merge each finished PR
yourself once CI is green, there are no conflicts, and all of these pass:
  - npm test
  - cd client && npx tsc -b
  - npx oxlint on the files you touched (no new warnings)
  - cd client && npx vite build
  - axe 0 in light, dark and phone (360 px), with no sideways scroll
    (client/scripts/check-page.cjs against the demo: node scripts/hive-demo.js,
    sign in owner / owner123).
After a merge, restart your branch from the new main.

WORK, in order (one finished, tested PR each, with a HANDOFF section 3 update):
  1. Dry run: a "first k of N" label when a vector or list is capped, so it
     is clear that only part of it is drawn (HANDOFF section 6, item 4).
     Every traced language, light/dark/phone, with tests.
  2. Then go through the whole site page by page as a student would (Learn,
     GATE, Practice/Solve, Contests, Messages, Profile, Settings) and fix
     anything broken, confusing or off-style. Report what you found.
  3. Then stop and ask me what to build next, with 3 short suggestions.

RULES (never break):
  - Field Journal look: design tokens only, clay is never text, no glows or
    gradients. Light and dark must both work, respect reduced motion, no
    sideways scroll at 360 px.
  - Never show made-up data. Never put model names in commits, PRs or code
    comments. Never skip, disable or delete a test.
  - Leave Hive untouched (client/src/hive/**, --hv-* tokens).
  - No force-push. No secrets in commits. Never send my or users' personal
    data to outside services. Never suggest breaking a provider's terms.
  - Be honest about limits. Explain to me in short, simple sentences.
````
