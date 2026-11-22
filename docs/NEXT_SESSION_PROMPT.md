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
  2. docs/HANDOFF.md section 3 "Where it stands" — the Session 11 block at
     the top (everything up to #226 is merged and live, no PR is open).
  3. docs/voice/BLUEPRINT.md and docs/voice/VIRTUAL_TEACHER.md (the voice
     plan and my newest brief).
  4. docs/ui/field-journal.md and docs/ui/premium.md (the look).

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
  1. Voice: ears + natural voice (docs/voice/VIRTUAL_TEACHER.md §7 step 1):
     Groq Whisper server link with the free-chain switching, the code-word
     normaliser with tests, natural voice links, and measured speed.
  2. Voice: the virtual teacher (§3): optional, small, flies to named
     places only, points, speaks with lip sync, bubble text, reduced motion,
     light/dark/phone, axe 0.
  3. Then stop and ask me what to build next, with 3 short suggestions.
  If I send the problem that gave an error on loading, fix that first.

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
