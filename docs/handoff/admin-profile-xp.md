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
| 1. XP rule ("Passed the examples") | Done, merged to main | https://github.com/Gurudeep306/Nexora/pull/149 |
| 2. Avatar inside Edit profile | Done, merged to main (with part 5 and the new covers) | https://github.com/Gurudeep306/Nexora/pull/151 |
| 3. Staff permissions per Admin part | Done, merged to main | https://github.com/Gurudeep306/Nexora/pull/152 |
| 4. Site map tree (show/hide, GitHub links) | Done (see section 4) | — |
| Extra: Admin clean-up and finer permissions (owner's ask) | Done, merged to main | https://github.com/Gurudeep306/Nexora/pull/153 |
| 5. Register: optional avatar, bio, … step | Done, merged to main (with part 2) | https://github.com/Gurudeep306/Nexora/pull/151 |

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

## 2 + 5. Picture inside Edit profile; "Make it yours" after sign-up

- **One chooser** (`client/src/components/account/AvatarChooser.tsx`): upload
  a photo (PNG/JPG/WebP, 2 MB) or pick one of the 32 avatars
  (`AvatarPicker`, now without the coloured shadow "glow": an accent ring and
  a check mark show the choice). It saves nothing by itself: a photo is
  uploaded as soon as it is chosen with `POST /api/user/avatar { stage: true }`
  (stored, returned, not used yet) and becomes your picture only when the form
  is saved.
- **Saving**: `PUT /api/profiles/me` now takes `avatar` (`set:<id>`, checked
  with `isSetAvatar`) and `avatar_url` (`""` removes the photo; otherwise it
  must be a file this account uploaded, `/uploads/<username>_<time>.<ext>`).
  The session is updated at once, so the top bar shows the new picture.
- **Edit profile** (`components/profile/EditProfileSheet.tsx`): a "Picture"
  group at the top; the live preview shows the chosen picture. Cancel keeps
  the old one.
- **Settings → Account**: the old avatar card (`AvatarCard.tsx`, deleted, it
  had a conic-gradient glow) is now `PictureCard.tsx`: your picture and an
  "Edit profile" link to `/u/<you>?edit=1`, which opens the form directly.
- **"Make it yours"** (`pages/WelcomePage.tsx`, `/welcome`,
  `components/auth/welcome.css`): after a new account is made (password or
  GitHub/Google), the sign-up page goes here instead of straight on. Three
  numbered parts: I. your picture (the same chooser), II. display name,
  pronouns and a line about you, III. "What brings you here?" (GATE CSE, DSA,
  competitive programming, just looking around). A card on the side (on top
  on a phone) shows how others will see you as you type. "Skip for now" at
  the top and the bottom. "Save and continue" saves with the same call as
  Edit profile, keeps the choice as the personal setting `focus`, and goes to
  the page you came from or, if none, the place you picked (`/gate`,
  `/learn/dsa`, `/problems`, else `/hub`). Sign-in never shows it.
- Tests: `tests/social.test.js` "the picture is saved with Edit profile"
  (staged upload not used until saved; someone else's file, an outside URL
  and an unknown avatar refused; the session shows the picture; `""` removes
  the photo).
- Checked in the browser on the demo (Playwright): sign up → `/welcome` →
  pick an avatar, name, bio, GATE → saved and lands on `/gate`; Settings →
  Edit profile → change the avatar → saved; Skip → `/hub`. Axe 0 and no
  sideways scroll on `/welcome` and the Edit profile form, light, dark and
  phone.

## Extra (owner's ask during the work): new profile covers

The owner found the old covers boring (blurred colour blobs, which the house
rules forbid anyway, and Field Journal hid the cover entirely). A first try,
covers that each played an algorithm, was turned down ("boring, I want
something pattern type or animated type, import from internet").

- **What is there now** (`client/src/components/profile/covers.tsx`,
  `covers.css`): 12 patterns that drift slowly (Topography, Circuit, Bubbles,
  Jigsaw, Temple, Stars, Circles, Clouds, Wiggle, Autumn, Kiwi, Lines) and two
  live ones: **Waves** (four bands sliding at their own speeds) and **Life**
  (Conway's Game of Life; newly born cells in full colour; seeded by the
  username, `coverFrames.ts`). All in the profile's accent on paper tinted
  with it, so every theme, light and dark, gets its own look.
- **Where the patterns come from:** Hero Patterns by Steve Schoger
  (heropatterns.com), **CC BY 4.0**, taken from the `hero-patterns` npm
  package (its code is MIT; the drawings are CC BY). Stored as
  `client/public/covers/<id>.svg` and used as a CSS mask. The licence needs
  credit: Edit profile shows "Patterns from Hero Patterns by Steve Schoger
  (CC BY 4.0)" under the covers (`CoverCredit`). Keep that line.
- **Motion:** a cover only moves while on screen and the tab is visible;
  reduced motion and the small swatches stay still.
- **The profile stage** (owner's ask): a chosen cover is the top of the
  profile. The portrait sits fully on the pattern (on a paper disc), the
  buttons (Share, Edit profile / Message, Follow, More) sit top-right on a
  paper strip, and a paper note card on the pattern holds the bio, place,
  website, links, joined date and the Following / Followers / Posts / Friends
  counts (`pf-stage*` in `covers.css`). "Plain" keeps the old quiet layout.
- **Saved choices:** `COVER_PRESETS` in `src/routes/social.js` takes the new
  ids; the old ids (aurora, nebula, …) stay valid and show the closest new
  cover (`LEGACY` in covers.tsx).
- Tests: `tests/cover-frames.test.js` (Life rules, same board per username),
  `tests/social.test.js` (new and old cover ids accepted, unknown refused).
- Checked: axe 0 and no sideways scroll on the profile with each cover and on
  Edit profile, light, dark and phone.

## 3. Staff access (Admin → Staff access)

- **The owner's choice (2026-11-17):** keep the roles (Owner → Admin →
  Moderator → Member, each manages only the roles below it), no "top admin"
  label, and give every team member a **team title** ("Head of GATE
  content", "Founder"). The page lists people by rank: Owner, Admins,
  Moderators, Others with access.
- **Who opens it:** the owner, and admins the owner switches on there ("Can
  manage staff access": permission `staff.access`, owner-grant only like
  `site.settings`, admins only; admins don't get it by default).
- **Team titles:** `users.team_title` (40 characters, no `<` `>`), set with
  `PUT /api/admin/staff-access/:username/title`; shown in Admin and next to
  the role badge on the profile (`team_title` in `/api/profiles/:username`).
  The owner can title themselves; nobody else can.
- **What it sets:** for each person and each Admin section (Overview, Users,
  Moderation, Site, AI models, Code runners, Problem sources, Add a problem,
  Announcements, Audit log): **Role default** (no row: follows role and
  permissions, exactly as before), **Hidden**, **See** (read only) or
  **Change**. "Add person" gives access to someone who isn't staff yet (a
  member can be given just one section).
- **Where it lives:** table `staff_section_access(username, section, level,
  updated_by, updated_at)`; the section list with each section's API paths
  and permissions is `src/authz/sections.js` (add a section there when Admin
  gets one). Loaded with the user's access on every request
  (`ACCESS_COLUMNS`, `session-store.js` row cache, cleared on any write to
  the table).
- **How the server enforces it:** `sectionGate` (mounted right after the
  access control in `src/server.js`) finds the section for the request path.
  Hidden → 403 `section_hidden`; See + any write → 403 `section_read_only`;
  See/Change → the section's permissions count for **that request only**
  (`req.sectionGrant`, read by `permissions.can`). So giving a member
  "Problem sources" doesn't also open "Add a problem", although both use the
  `problems.manage` permission. Owner-only routes stay owner-only.
- **Rules:** nobody changes the owner or themselves; an allowed admin changes only
  people below their own role and can't give more than they have in a
  section. Every change is in the audit log (`staff.section`,
  `staff.title`, `staff.manage.grant` / `.revoke`).
- **Screens:** Admin's contents and tabs now follow each section's level
  (`/api/admin/me` returns `sections` and `canStaff`); a see-only section
  shows "You can see this section but not change it".
- Tests: `tests/staff-access.test.js` (role default unchanged, hide and
  see-only enforced, a member's single section opens Admin without leaking
  the same permission elsewhere, who may manage staff, team titles, audit
  rows).
- Checked: axe 0 and no sideways scroll on Admin → Staff access (a person
  opened) in light, dark and phone, and on a see-only section as a moderator.

## Extra: Admin clean-up and finer permissions

- **New permissions** (`src/authz/permissions.js`), each with its own Admin
  section or control:
  - `ai.manage`: AI models (was part of Site settings). Owner grants only.
  - `runners.manage`: Code runners and compiler choices (was part of Site
    settings). Owner grants only.
  - `problems.author`: Add a problem (was part of Problems). Admins have it
    by default; moderators don't.
  - `users.verify`: the verified badge and early access (was part of Manage
    users). Admins have it by default.
- **Nobody loses access:** a one-time copy at start-up gives everyone who had
  (or was denied) the broad permission the same choice on the new one. A
  marker in `site_settings` (`perm_split_2026_11`) stops it from running
  again, so a later "reset to role default" sticks.
- **Audit log in plain words** (`components/admin/auditLabels.ts`): "Changed
  a role", "Verified an account", "Changed section access"…; codes it doesn't
  know (Hive) become words too. More filters: Staff access, AI models, Code
  runners, Compilers.
- **User drawer:** the Access tab shows for Manage users or Verify; the
  permission switches need Manage users, the badge and early access need
  Verify, profile resets need Manage users.
- Tests: `tests/staff-access.test.js` (+2: new permissions and their
  defaults, owner-only grants, the one-time copy and that it runs once).

## 4. Site map (Admin → Site map) and Hive for admins only

- **The tree** (`src/sitemap.js`): every part of the site (137 parts today):
  Home, Learn (every Learn subject from `content/nexus/*.json`, and the DSA
  course with every chapter from `client/src/learn/content/dsa/syllabus.ts`),
  Nexus, GATE CSE (Practice, Notes with every subject from
  `content/gate-notes/<id>/_meta.json` — Digital Logic, Discrete
  Mathematics…, Mock tests, Review, Daily, Leaderboard, Planner, Notebook,
  Analytics, Syllabus), Problems (Workshop, Submissions), Contests, Social,
  AI tutor, Analytics, Achievements, Bookmarks, Profiles, Hive (Copilot,
  Chat, Projects, Pipelines, Machines, Drive, Models, Keys, Extensions,
  Spend, Inbox), and the always-on parts (Settings, Sign-in, Admin).
  Subjects are read from the content, so a new subject appears by itself.
- **Per part:** Everyone / Staff only ("page not found" for others) /
  Coming soon (staff can use it; others see "coming soon") / Hidden (only
  the owner, to check it). A part inside another is never more open than it.
  Stored as `site_settings.site_parts`; needs Site settings to change; every
  change is audited (`site.part`).
- **Enforced on the server:** the access control (`src/authz/access.js`)
  finds the most specific part for each API call and refuses it (403
  `feature_disabled` with `mode`). GATE notes subjects also leave the notes
  list and notes search. **In the app:** `/api/site/status` sends this
  viewer's closed parts; `AppLayout` shows "coming soon" or "page not
  found"; the Dock, the phone tab bar, search and GATE's own tabs drop them
  (`pathOn` in `SiteContext`).
- **The old feature flags** (Admin → Site) are the same switch: a part with
  no Site map choice follows its flag, and the flags route updates the Site
  map. The Site page now links to the Site map instead of its own switches.
- **Code:** each part lists its real files and folders with "Open on
  GitHub" links (folders show how many files). `tests/sitemap.test.js`
  checks every listed path exists.
- **Hive is for admins and the owner only** (owner's ask): `mayUseHive`
  (`src/authz/permissions.js`) gates the Hive API, its realtime connection
  and the `/hive` page. Moderators, other staff and members never see it:
  no Dock icon, no menu item, no search result, `/hive` is the normal "page
  not found", the API answers a plain 404, and the Site map doesn't list
  Hive to anyone who can't use it. Hive's own parts can still be hidden from
  admins. Honest limit: the repository is public, so Hive's code can be read
  on GitHub; on the website itself there is no trace.
- Tests: `tests/sitemap.test.js` (patterns and files, inheritance and old
  flags, owner-only changes, soon / staff / hidden enforced, a notes subject
  hidden from pages, list and search, Hive admins-only), plus the client
  checks in `tests/admin.test.js`.

## Dependency audit (2026-11-17, owner's choice)

- A new high advisory for `picomatch` (GHSA-fc5q-39xc-vjpf, ReDoS) covers
  every version, including the newest (4.0.7), so no fix exists yet. It
  turned CI's "Dependency audit (high and critical)" red on every PR.
- It only came in through build tools, so (owner approved) those are now
  dev dependencies: `@tailwindcss/vite` in `client/package.json` (it pulled
  in Vite) and `sqlite3` in the root `package.json` (its node-gyp build
  tooling). Render installs dev dependencies for the client build
  (`--include=dev`), and the live server uses Turso; `src/db.js` already
  falls back to Node's built-in SQLite when `sqlite3` isn't installed
  (checked).
- When picomatch publishes a fixed version, run `npm audit` without
  `--omit=dev` too; nothing else needs to change.

## Plan for parts 3–4 (written before the work; 2 and 5 are done above)

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
