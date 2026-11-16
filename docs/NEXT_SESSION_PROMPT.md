# Prompt for the next session

Copy everything inside the box below into a new Claude Code session on the
Nexora repository.

````text
You are continuing work on NexoraGuru (GitHub repo Gurudeep306/Nexora, live at
https://nexoraguru.in). Work with the highest, most professional quality
possible: it must never fail in any case, it must look like the rest of the
site, and you must be honest about anything that is not possible.

STEP 0 — Read first, in this order:
  1. docs/HANDOFF.md — section 3 "Where it stands" (what is merged, what PR
     is open, what is not done yet) and section 6 "What is left, in order".
  2. AGENTS.md and CLAUDE.md — the project rules.
  3. docs/ui/field-journal.md and docs/ui/premium.md — the look.
  Only I say "merge"; merging deploys the live site.

STEP 1 — The open PR "Admin → Compilers" (branch claude/fervent-curie-vjgcd8):
  - Check its CI. If it is red, find the cause and fix it (never skip a test).
  - Take screenshots of Admin → Code runners (desktop light, desktop dark,
    phone 360px) with the new "Public runners" and "Languages" panels, run
    axe (must be 0) and check there is no sideways scroll. Fix anything off.
  - Then tell me it is ready, and wait for my "merge".

STEP 2 — Finish Admin → Compilers (docs/HANDOFF.md section 3, "Not done"):
  a. After it is merged and the live updater has picked newer compiler
     versions (GCC 16, Rust 1.99, Java 27, .NET 10, Swift 6.4, Kotlin 2.4…),
     check the dry run still works on them, for every traced language:
       NODE_OPTIONS="-r <proxy preload>" node scripts/dryrun-suites/run.js <lang> [engine]
     for go, rust, csharp, kotlin, swift (and the older suites for python,
     cpp, c, java, javascript, typescript: node scripts/dryrun-trace.mjs
     --corpus <lang>). If a tracer breaks on a new version, fix the tracer;
     until it is fixed, pin the old version in Admin → Code runners.
  b. Key-based code runners: check each service's terms first (self-hosted
     Judge0, JDoodle free tier, Glot.io, Coliru). Add only the ones whose
     terms allow it, with keys sealed like AI keys (src/hive/vault.js),
     on/off and health like the others. Say plainly on the admin page which
     ones are not allowed and why. Never suggest breaking a provider's terms.

STEP 3 — Then docs/HANDOFF.md section 6, item 6 (my older requests), in this
order, one finished, tested, pushed PR per item:
  A1. Plain-English error explanations on the exact line, for every runner's
      error format (the full list is in the handoff), shown in the editor
      marker, the Result tab and the status bar.
  A2. Live syntax check while typing, Format for every language, a cheat
      sheet per language, a Playwright test per language.
  A3. Coding analysis page (/api/stats) and "+XP / level progress" on
      Accepted, with the Profile explaining how the level is earned.
  B.  Problem pipeline: full statements, samples, limits, tags, images
      (stored by us), an audit script and an Admin gaps page.
  C.  Staff-only "Add a coding problem" editor (statement, tests, limits,
      checker, editorial, solutions in 5 languages judged before publish,
      preview as a student).
  D.  Improve social. E. Improve contests. F. Linked platforms.
  "Add as many features to each as possible."
  Also section 6, item 4: dry-run polish (Swift and C# structs drawn as
  objects, not text; the other items listed there).

NOT NOW (my decision, 2026-11-16): dry run for Ruby, PHP, Lua, Perl and for
functional languages; the ideas in section 6, item 7.

When independent pieces can be built at the same time, use helper agents in
their own worktrees, then check and integrate their work yourself.

RULES (never break):
  - Never commit to main. Push only to your session's branch. One PR per
    finished piece. No force-push. Only I say "merge". If a push is refused
    because of already-merged history: git fetch origin <branch> &&
    git merge -s ours FETCH_HEAD, then push.
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
    (light, dark, phone).
  - Keep docs/HANDOFF.md (sections 3 and 6) current and pushed before you
    stop for any reason; commit and push often (I interrupt with new
    messages).

HOW TO REPORT TO ME: short, simple sentences (I read on my phone): what
changed, what you checked, and what is not done and why, with screenshots
(desktop light, desktop dark, phone).
````
