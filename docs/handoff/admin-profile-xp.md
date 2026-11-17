# Handoff: XP rule, profile avatar, staff permissions, site map

This file tracks one piece of work the owner asked for on 2026-11-17
(session 10). The main handoff (`docs/HANDOFF.md`) points here. Keep this
file current as each part lands; each part is its own pull request.

## The owner's request, in their words, and what was agreed

1. **XP for passing only the examples** → owner chose: *XP, marked
   "examples"*. Passing only the examples earns the XP (once per problem),
   but the problem shows "Passed the examples", not "Solved", and does not
   count in the solved total or the levels' problem count until a full check
   passes.
2. **"Edit profile: include avatar, don't make it a separate thing"** →
   choosing the picture happens inside the Edit profile form.
3. **"Admin: one thing only for top admins — the owner or big staff decide
   which staff get which permission, for each part of Admin."**
4. **"Each part of the website as a tree; admins can show or hide each part
   for users, with more options; each part connected to its code"** → owner
   chose: *Open on GitHub* (each part lists its real files with links that
   open them on GitHub to read or edit there).
5. **Register page (added during the work): "ask some things like pick
   avatar, give bio etc. as optional, make it more interesting"** → after
   the account is made, a short optional step (avatar with the same picker as
   Edit profile, a bio, and a little more), easy to skip.

## Status

| Part | Status | Pull request |
|---|---|---|
| 1. XP rule ("Passed the examples") | Built, tested; PR open, waiting for CI to merge | https://github.com/Gurudeep306/Nexora/pull/149 |
| 2. Avatar inside Edit profile | Next — plan below, no code yet | — |
| 3. Staff permissions per Admin part | Not started | — |
| 4. Site map tree (show/hide, GitHub links) | Not started | — |
| 5. Register: optional avatar, bio, … step | Not started (built with part 2) | — |

## 1. XP rule — how it works

- `POST /api/judge` (src/server.js) already returns `coverage` (#148): `full`
  is true when the judge's own tests ran (NexoraGuru, Workshop, Learn,
  Codeforces with the open dataset's tests), false when only the examples and
  the student's own tests did.
- Accepted with `coverage.full === false` → `progress.status = 'examples'`;
  XP is given if this problem never gave XP before (`xp_earned` is 0 and it
  is not solved). Accepted with a full check → `status = 'solved'`
  (`firstSolve`), no second XP if "examples" already gave it. A later wrong
  answer never drops "examples" or "solved". `daily_activity.problems_solved`
  and achievements count full checks only.
- Everything that counts solved problems uses `status='solved'`, so
  "examples" stays out of the solved total and the levels' problem count by
  itself; XP (`SUM(xp_earned)`) includes it.
- Problems solved before this change keep "solved" (nothing is taken away).
- Screens: the Problems table (a filled-circle icon, tooltip "Passed the
  examples"), the status filter ("Passed the examples"), the problem header,
  bookmark cards, and the XP card ("The XP counts now. The problem counts as
  solved once a full check passes.").
- **A full check means every official test ran.** An official Codeforces test
  that equals an example (or the student's own test) runs once under that
  name and still counts; one cut by the judge's size limits did not run, so
  that is not a full check.
- `/problems?status=examples` (also solved, attempted, unsolved) opens the
  list already filtered.
- Tests: `tests/judge-coverage.test.js` (+3: XP once, status, filter, wrong
  answer keeps it; a later full check makes it solved without XP twice; an
  official test equal to an example still makes a full check).
- **Existing tests changed honestly:** `tests/coding-analysis.test.js`,
  `tests/judge-integrity.test.js` and `tests/per-user.test.js` used
  Codeforces problems with only examples and expected "solved". Under the
  new rule that is "Passed the examples", so each now gives its problem the
  official tests the live site would have (the same inputs it already used,
  so every count it checks is unchanged). Nothing was skipped or removed.
- Checked in the browser (demo, CSES): XP card text, the Problems filter and
  icon, axe 0 in light, dark and phone.

## Plan for parts 2–5 (not started; written when work stopped)

**Part 2 + 5 (avatar inside Edit profile; optional step after sign-up)**
- Today: `client/src/components/account/AvatarCard.tsx` (in Settings) holds
  the photo upload and the avatar grid. It uses a conic-gradient glow, which
  the rules forbid. Upload: `POST /api/user/avatar {username, image}` (data
  URL). Save a set avatar: `PUT /api/user/profile {currentUsername, avatar:
  formatAvatar(id), avatarUrl: ''}`. The grid is
  `components/account/AvatarPicker.tsx` (`AVATAR_SET` in `lib/avatar`).
- `components/profile/EditProfileSheet.tsx` (Modal, saves `PUT
  /api/profiles/me`) ends with "Change your photo or avatar in Settings" —
  replace that with a shared `AvatarChooser` (no glow; photo upload + the
  grid) as a "Picture" group at the top of the form, and make the live
  preview show the chosen picture. Settings then links to Edit profile
  instead of having its own card.
- Register: `pages/AuthPage.tsx` `handleSubmit` calls `register(...)` then
  navigates to `from` after ~1.1 s. Add a short optional "Make it yours" step
  after the account is made (picture via `AvatarChooser`, bio, maybe
  pronouns/what you're learning), Field Journal look, "Skip" always visible,
  reduced motion respected; then continue to `from`. Don't send it for
  sign-in, only new accounts (OAuth new accounts too).

**Part 3 (staff permissions per Admin part)** — start by reading
`src/authz/permissions.js` and the Admin Users section (`UsersSection`,
`UserDrawer`). Only the owner and top admins can open it; they tick, per
staff member, which Admin sections they may see/edit. Server must enforce it
(not just hide tabs), with tests.

**Part 4 (site map tree)** — an Admin section listing every part of the site
as a tree (from the router + Nexus/Learn/GATE areas). Per part: show/hide for
users (and options like "staff only", "coming soon"), enforced on the server
and client routes; each part lists its source files with "Open on GitHub"
links (`https://github.com/Gurudeep306/Nexora/blob/main/<path>`). Tests for
the hide rule.

## Notes for whoever continues

- Rules from `AGENTS.md` apply: Field Journal look, tokens only, light/dark,
  phone width, reduced motion, axe 0, no secrets, no model names in commits,
  never skip a test, leave Hive alone.
