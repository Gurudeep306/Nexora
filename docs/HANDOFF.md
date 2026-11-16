# Handoff — continue the owner's current requests

Read this first in a new session, then `AGENTS.md` and `CLAUDE.md`. Keep this
file current: before you stop for any reason (usage limit, end of session),
update "Where it stands" and "Next" and push it with your work.

The earlier UI rollout has its own finished handover:
`docs/ui/FIELD_JOURNAL_HANDOVER.md` (phases 4–9, done).

## How the owner wants work done (short)

- Quality first; finish one thing fully before the next. UI must match the
  site's theme in all ten themes, light and dark, and on phones.
- Be honest: if a provider does not allow something, say so and build the
  legitimate version. Never fake a feature.
- Explain simply, short sentences. Ask for a screenshot when unclear.
- Only the owner says "merge". Then: confirm CI is green on the current head,
  no conflict, squash-merge. Merging deploys the live site.

## The owner's current requests (2026-11-16), in the order being built

1. **Home suggestions change and show real content** — DONE (PR #126):
   rotating Continue card with each chapter's real animation, "For you
   today" (`/api/today/picks`, `src/routes/today.js`,
   `client/src/components/today/ForYou.tsx`, `LiveFigure.tsx`), animation
   sizes capped site-wide (`viz/viz.css` `.nxv-svg`).
2. **Coding** — IN PROGRESS:
   - Levels: already true. Problem XP (judge solves and imported solves,
     `markSolved` in `src/server.js`) is the whole Rift level (`calcLevel`)
     and a quarter of the Nexus web rank (`src/nexus/ranks.js`). Tell the
     owner this plainly; add a visible "+XP / level progress" moment on
     Accepted if it is not obvious enough.
   - Coding analysis: a proper page (by difficulty, tag, language, verdict
     trend, time-to-solve, weak tags with links). Start from
     `client/src/pages/AnalyticsPage.tsx` and `/api/stats`.
   - Every judge language runs: write a script that submits hello-world and
     A+B in every language the judge lists and records pass/fail; fix or hide
     broken ones. Judge code: `src/judge*`, piston/remote exec.
   - Editor help (`client/src/components/solve/CodeEditor.tsx`, Monaco):
     Monaco has full IntelliSense only for JS/TS. For C++/Java/Python/C/Go/
     Rust/others add completion providers (keywords, standard-library
     functions with signatures, snippets such as fast I/O and templates),
     signature help, and compiler errors as editor markers (parse the judge's
     compile output: line:col). Honest limit: full language servers for 30+
     languages cannot run on the free host; say so.
3. **Problem pipeline** (`src/sources/*.js`): every source must import the
   full statement, all sample tests, and images (saved, not hot-linked).
   Build an audit script + an Admin report of gaps per source. The Codeforces
   open dataset is `src/sources/cf-dataset.js`. Do not bypass sites' bot
   protection.
4. **Social** (`src/routes/social.js`, `src/server.js` /api/rooms and
   /api/messages, `client/src/components/social/*`): proper chats, group
   chats (create, invite, roles), share problems / solutions / contests as
   cards into chats and the feed.
5. **Contests** (server `/api/contests/*` in `src/server.js`, client
   `components/contests/*`, `pages/WorkshopPage.tsx`):
   - make a contest from anywhere (any problem page, a GATE question, a set),
     choose questions and timeline, share a link;
   - contest makers write custom questions with every feature (coding:
     statement with maths and images, samples, hidden tests, limits,
     editorial; GATE: MCQ / MSQ / NAT with marks, negative marks, figures,
     solutions);
   - GATE contests for teachers: share with students, marks list, analysis
     (per question, per student, time).
6. **Staff-only "Add a coding problem"**: a full editor (statement,
   images, samples + hidden tests, limits, tags, rating, editorial,
   solutions in 5 languages run on the judge before publishing).
7. **Linked platforms** (`src/accounts.js`): more sites, proof of ownership
   (a one-time code on the user's profile there), import achievements.
   Honest limit: Codeforces, LeetCode, AtCoder, CodeChef and SPOJ offer no
   OAuth "allow this site" screen to third parties; only GitHub does. Never
   build a fake permission screen.

## Where it stands

- Merged: #124 (Problems search back, one dropdown everywhere, themed
  marketing pages, NG mark never vanishes), #125 (dropdowns scroll, private
  page "Coming soon" + "Owner & staff sign in").
- PR #126 (Home) — merged on the owner's "merge" once CI is green.
- Next: request 2 (coding).

## How to check your work

```bash
npm test                      # must pass (446 at #126)
cd client && npx tsc -b && npx vite build
PORT=3300 node scripts/hive-demo.js        # owner / owner123; serves client/dist
npm i --no-save --prefix /tmp/axe axe-core
node client/scripts/check-page.cjs /route name     # light, dark, phone: axe + overflow
```

- The demo has no problems. To design against rows, insert some into the
  running demo DB (find it with
  `cat /proc/$(pgrep -f src/server.js)/environ | tr '\0' '\n' | grep DB_PATH`)
  and run `update catalog_meta set v=v+1 where k='problems'`. Never commit it.
- The demo judges C++ locally: Solve → "Paste many tests" → Submit.
- Rebuild the client after every change; restart the demo after server
  changes (kill `hive-demo.js` and `src/server.js`, start the demo again).

## Git in this environment

- Work on the branch the session names (this one used
  `claude/clever-babbage-km37j9`), starting from the latest `origin/main`.
- If a push is refused because the remote branch holds already-merged
  history, run `git merge -s ours origin/<branch>` and push. Never force-push.
- One PR per finished piece; describe what changed, the checks run, what
  was not checked.
