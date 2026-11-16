# Prompt for the next session

Copy everything inside the box below into a new Claude Code session on the
Nexora repository.

````text
You are continuing work on NexoraGuru (GitHub repo Gurudeep306/Nexora, live at
https://nexoraguru.in). Work with the highest, most professional quality
possible: it must never fail in any case, it must look like the rest of the
site, and you must be honest about anything that is not possible.

STEP 0 — Read first, in this order:
  1. docs/HANDOFF.md — everything done so far, how the visual dry run works,
     and section 6 "What is left, in order", the end-to-end plan. Follow it
     in order.
  2. AGENTS.md and CLAUDE.md — the project rules.
  3. docs/ui/field-journal.md and docs/ui/premium.md — the look.
  Start your branch from the latest origin/main (check docs/HANDOFF.md
  section 3, "Where it stands", for any PR still open). Only I say "merge";
  merging deploys the live site.

STEP 1 — Set up and see the current state yourself:
  npm install && npm install --prefix client
  npm test                      (all must pass, about 530)
  cd client && npx tsc -b && npx vite build
  Start the demo through the agent proxy (docs/HANDOFF.md section 7), then:
  node client/scripts/check-dryrun.cjs bubble python <a bubble-sort file> light
  and look at the screenshot.

THEN DO docs/HANDOFF.md section 6 IN ORDER, one finished, tested, pushed PR
per item:
  1. Check the dry run on the live site in every traced language.
  2. The Solve page redesign: ALL buttons, each in its best place, nothing
     twice, nothing advanced lost. In my words: "i want the buttons not
     everything at the bottom part i want it to uniquely place all buttons
     and remove all unnecessary features … by analyzing what to place where
     to make it look the best and show case best … all buttons not just dry
     run". The exact plan is in the handoff.
  3. Dry run for Go, Rust, C#, Kotlin and Swift, then the rest (functional
     languages: calls and values only, and say so on screen). Keep to my
     words: "work on all types of datastructure and as best a spossible
     with proper naming present as per the code i want the best work here".
  4. Dry run polish.
  5. Admin → Compilers.
  6. My older requests A–F (compiler/editor leftovers, coding analysis and
     +XP; problem pipeline; staff problem editor; social; contests; linked
     platforms). "Add as many features to each as possible."
  7. Ideas never started: only if I agree.
  When independent pieces can be built at the same time, use helper agents
  in their own worktrees (as in session 3), then check and integrate their
  work yourself.

RULES (never break):
  - Never commit to main. Push only to your session's branch. One PR per
    finished piece. No force-push. Only I say "merge".
  - No secrets, and no model names in commits, PRs or code comments.
  - Never skip, disable or delete a test.
  - Hive (client/src/hive/**, --hv-* tokens) stays untouched.
  - Tokens only, no raw colours; clay is never text; no glows or gradients.
  - Light and dark, reduced motion, no sideways scroll at 360px.
  - Never show made-up data. Be honest about anything not done or not
    possible. Never suggest breaking a provider's terms.
  - Never send my or users' personal data to outside services.
  - Before every push: npm test, cd client && npx tsc -b, oxlint on touched
    files (no new warnings), npx vite build, axe 0 on touched routes
    (light, dark, phone). After any dry-run tracer change, also run
    node scripts/dryrun-trace.mjs --corpus <lang>.
  - Keep docs/HANDOFF.md (sections 3 and 6) current and pushed before you
    stop for any reason; commit and push often (I interrupt with new
    messages).

HOW TO REPORT TO ME: short, simple sentences (I read on my phone): what
changed, what you checked, and what is not done and why, with screenshots
(desktop light, desktop dark, phone).
````
