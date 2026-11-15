# Continue the Field Journal rollout for NexoraGuru — finish phase 4, then phases 5 to 9

You are continuing a large, multi-phase UI project in the GitHub repository
**Gurudeep306/Nexora** (NexoraGuru, live at https://nexoraguru.in). Phases 1, 2
and 3 are finished and merged into `main`. **Phase 4 is partly built** and pushed
to the branch `claude/clever-babbage-km37j9` (see section 3 for exactly what is
done and what is left). Your job is to **finish phase 4**, then build **phases 5
to 9** exactly as the brief at the end of this prompt describes, one phase at a
time, to the same quality bar as the finished phases.

This file lives in the repository at `docs/ui/FIELD_JOURNAL_HANDOVER.md`.
Every session that works on the rollout updates sections 3, 4 and 5 before it
stops, and pushes it with the work, so the next session can pick up exactly
where it left off.

Read this whole prompt before you touch any code. Then read `AGENTS.md` and
`CLAUDE.md` in the repository root (they are the house rules for every agent),
then `docs/ui/field-journal.md` (what phases 1–3 built and where it lives).

---

## 1. Who you are working for and how they want it done

The owner is the founder. They often work from a phone. They want:
- **Quality first, always.** Finish one phase completely before starting the
  next. Never ship half-done work. Saving effort must never lower quality.
- **UI matters most.** Clean, structured, nothing hidden, every feature kept.
- **Honesty.** Never invent numbers, users or claims. If something cannot be
  done, say so plainly and give the legitimate alternative.
- **Simple explanations.** When you report back, use short sentences, no
  jargon, exact steps.
- **Push every phase as it completes.** Open one pull request per phase.
- **Only the owner says "merge".** Do not merge a pull request until the owner
  explicitly says "merge" (or "merge all"). When they do, wait for green CI on
  the current head, confirm there is no merge conflict, then squash-merge.
  Merging to `main` deploys the live site (Render deploys `main` once CI passes).

## 2. Rules that are never broken (from AGENTS.md and the brief)

- Never commit to `main`. Work on a branch; open a pull request per phase.
- **No force-pushes**, ever. No rewriting history. No secrets in commits.
- No model names or model ids in commit messages, PR titles, PR bodies or code
  comments.
- Never skip, weaken, disable or delete a test to get CI green. Fix the cause.
- **Hive is untouched**: do not change `client/src/hive/**`, the `--hv-*`
  tokens or the Hive kit. `/hive` must look exactly as it did before.
- Tokens only: no raw colours in components (colour values live only in the
  palette `client/src/theme/palettes.ts` and the style CSS).
- Light and dark both work; `prefers-reduced-motion` is respected; no
  horizontal scroll at 360px wide.
- No gradient text, glows, neon shadows, rainbow bars, hexagon decoration,
  and **no drop shadows** in the journal style: depth is paper colour and
  hairlines.
- Every animation explains an idea or shows real state.
- Keep every feature and every route. Restructure and restyle; never remove.
  If something has no obvious place, put it in a secondary area and say so in
  the PR.
- Never send the owner's or users' personal data to outside services.

## 3. Where things stand (as of 2026-11-15)

| Phase | What | Status |
|---|---|---|
| 1 | Foundation: parchment palette, `journal` style as default, look migration v4, `styles/journal.css`, UI kit hooks, shell (top bar, palette, menus), dock skin | **Merged** in PR #112 |
| 2 | Home rebuilt as "Today", Learn as "The Library", subject pages with a book-style Contents view | **Merged** in PR #112 |
| 3 | One shared question card on every question surface, GATE solutions restyled, community stats, review queue countdown and stack | **Merged** in PR #113 |
| 4 | The reader: lessons and GATE notes, viz engine colours and player, sidenotes, scroll-sync, notes index and subject pages | **Built**, pull request open from `claude/clever-babbage-km37j9`, waiting for the owner's "merge". Left-overs in 3.1 (System Design reader, notes dek, footnotes) |
| 5 | Coding: Problems, Solve (statement, Monaco theme, judging, verdicts, editorials), Contests, Workshop, Submissions, Bookmarks | **In progress** on the same branch (PR #114 is phase 4; phase 5 commits follow it). Done: Problems page. See 3.2 |
| 6 | Nexus: the star chart ("The Atlas") | **Started** on the same branch. See 3.3 |
| 7 | Profile and the Ledger: Profile, Analytics, Achievements, Social | **Started** (profile masthead and colophon CSS written, NOT yet checked in a browser). See 3.4 |
| 8 | GATE home and the remaining pages: GATE home and subpages (CBT restyle only), Settings, Appearance, Admin, 404, errors, loading | To do |
| 9 | Polish sweep and docs | To do |

Start by **finishing phase 4** (section 3.1). Before you begin, fetch the
branch `claude/clever-babbage-km37j9` and `main`; if `main` has moved on, merge
`origin/main` into the branch (a normal merge, never a rebase of pushed
commits).

### 3.1 Phase 4: what is done and what is left

**Done (part 1), checked with axe = 0 in light, dark and phone on
`/learn/dsa/arrays`, `/learn/dsa/sorting`, `/gate/notes`, `/gate/notes/dl`,
`/gate/notes/dl/place-value`, `/gate/notes/dl/signed-numbers`; `/hive` still
renders unchanged; 441 server tests pass; typecheck and build clean:**
- DSA lesson reader (`learn/ui/TopicPage.tsx`, `learn/ui/Blocks.tsx`):
  - title block: kicker "Chapter I · Arrays · Page 1 of 24" (roman numeral from
    the topic's place in `DSA_TOPICS`), serif title, serif dek (`.nr-dek`),
    mono meta line
  - one reading column (`--nr-col`, 41rem in journal) with outset elements
    (`--nr-wide`, 60rem): figures, scrolly passages, tables, checks
  - figures are `figure.nr-figure` (manilla) with a numbered label
    "Figure N · title" (CSS counter `nr-fig`, `.nr-fig-no`) and a caption
  - callouts: note, tip, interview become **sidenotes**
    (`components/reader/Sidenote.tsx`: right margin when `.nr-main` is at
    least 1180px wide, otherwise an inline "✱ Note" `<details>`); insight is
    labelled "Why it works"; other callouts are `role="note"` (never nested
    landmarks)
  - **scroll-sync**: a viz block followed by a steps block is grouped into a
    `ScrollyFigure` (`groupFigures()` in TopicPage); the sticky figure follows
    the step in the middle of the screen (`components/reader/useScrollSync.ts`);
    off under reduced motion and below 1024px
  - "On this page" is `components/reader/Outline.tsx` with a clay tick that
    slides to the current section
  - end of lesson is `components/reader/EndOfLesson.tsx`: hairline, "Next" as a
    large serif link, progress dots, the way back
- DSA animation player (`learn/engine/VizPlayer.tsx`): plays when scrolled
  into view, holds while hovered or focused, stops following the page once the
  reader touches the controls, "Step x of y" counter, `syncTo` prop (adjusted
  during render, not in an effect), focusable code panel. Full journal skin
  for `.viz-*` in `theme/styles.css` ("Field Journal — the reader (phase 4)").
- GATE notes reader (`pages/gate/notes/NotesLessonPage.tsx`,
  `gate/notes/render/NotesContent.tsx`): `Outline` and `EndOfLesson` (dots =
  lessons of the current chapter), viz blocks are numbered `nr-figure`s, note /
  aside / trick / trap frames are `role="note"` divs, "Check yourself" frames
  are `role="group"`, unnamed frames are not landmarks, tables are labelled by
  their header row, header rows with no text are dropped, display maths is
  focusable, breadcrumb is "Notes path" (DSA uses "Lesson path").
- GATE notes animation player (`viz/VizPlayer.tsx`): autoplay on view, hold
  on hover/focus, same rules as above; journal skin for `.nxv-*` (ivory stage
  with hairline inside the manilla figure, clay "current", mono ink step
  label, clay tab play button with ink text, serif captions).
- Question options carry a screen-reader "Option A:" so maths-only options
  have a name.

**Left for phase 4 (part 2):**
1. ~~Notes index~~ **done**: each "Ready to read" card shows the first frame
   of the subject's signature animation, drawn live by `viz/VizThumb.tsx`
   (the real scene renderer, no pictures) on a manilla plate. The server adds
   `signature: { id, spec }` to each subject card (`signatureOf()` in
   `src/routes/gate-notes.js`: `signature_viz` in the subject's `_meta.json`,
   else `SIGNATURE_VIZ` — dl: gate-symbols, dm: truth-table-build — else the
   first animation). "Being written" rows are muted. Axe 0 in light, dark,
   phone. (Discrete Maths has no Venn animation yet, so it uses the truth
   table; switch to a Venn diagram when one is written.)
2. ~~Notes subject page~~ **done**: under journal the chapters show an italic
   roman numeral instead of the ring (the ring stays in other styles), a mono
   meta line with "x of y done", serif chapter titles, hairline lesson rows
   with mono times, and a clay edge on the next lesson; the chapter index uses
   roman numerals. Done with paired elements and CSS (`.nh-chapter-roman`,
   `.nh-n-roman`, `.nh-chapter-done` in `notes-home.css` and the "Notes
   subject page" block in `theme/styles.css`), so no style branching in TSX.
   Axe 0 in light, dark, phone; Studio checked unchanged.
3. **Margin sidenotes in GATE notes — deliberately not moved.** The notes
   reader keeps a lessons rail on the left and the outline on the right, and
   the owner asked for notes content to use the full width, so `.nr-main` is
   about 770px at a 1440px screen: there is no margin to put notes in, and
   `Sidenote` would fold every note/aside into a closed "✱ Note" toggle,
   hiding content. They stay in the column as `role="note"` blocks with the
   journal hairline. Revisit only if the owner wants the narrow-column look
   for notes. Footnote hover/tap text: not done (no footnotes in the notes
   content yet; check `grep -rn '\[\^' content/gate-notes` before building).
4. ~~Notes title block~~ **mostly done**: the mono meta line now reads
   "55 min · Basic · 3 animations · 3 questions · 11 past questions". There is
   **no dek** yet because lessons have no one-line summary field; add a `dek`
   to the lesson front matter (compiler + `Lesson` type) and render it as
   `.nr-dek`, rather than inventing one.
5. ~~Tables~~ **done**: columns of plain numbers are right-aligned with
   tabular figures in both readers (`isNumberCell` in `NotesContent.tsx`,
   `MD_NUMBER`/`.is-num` in `learn/md.tsx`; an author's own alignment wins).
   Tables are focusable `role="group"` boxes (not landmarks, since several
   tables can share header words). Equation numbers: not done (optional).
6. ~~Code~~ **done**: the DSA player's active-line bar is oat with a clay
   inset under journal; code language tabs are ink with a clay underline.
7. **System Design reader**
   (`learn/system-design/components/SystemNotesReader.tsx`, inside the
   System Design studio at `/learn/system-design/:systemId`): its own layout;
   only its nested `<aside>` was made `role="note"`. Restyle it with the
   reader parts (`Outline`, `EndOfLesson`, title block) in phase 9's sweep or
   as part of phase 5 if time allows; run axe on it.
8. ~~Axe across every notes lesson~~ **done**: all 45 published lessons
   (dl, dm, demo) pass axe in light (dark and phone were run too — see the
   phase 4 PR). Fixes: maths-only table headers render KaTeX's visible HTML
   with the source as the name (`learn/mathLabelled.ts`, used by both
   readers via `header` on `Inline`/`Inlines`); empty corner header cells are
   plain cells; lab subheads are h3 (were h4, broke heading order); labelled
   lab strips have roles. A sweep script pattern: list lessons from
   `/api/gate/notes/<subject>`, open each, run axe (see
   `client/scripts/check-page.cjs` for the login and look setup).
9. ~~Phone overflow~~ **done**: question cards could not shrink below their
   widest maths. Fixes in `components/question/question.css` (`.qc-body`
   and inner grids are `minmax(0, 1fr)`, `.qc-text` and `.qc-option` have
   `min-width: 0`), inline maths may break after `,` and `+`
   (`\allowbreak` added in `tex()` and `math()`), and maths that still
   cannot wrap is scaled down to fit (`components/question/useFitMaths.ts`,
   floor 60%). Don't make maths scroll inside an answer button: a focusable
   scroller inside a button is a nested-interactive error.
10. ~~Checks and PR~~ **done**: all 45 notes lessons pass axe with no
    sideways scroll in light, dark and phone; DSA lessons, notes front page,
    subject pages checked the same way; `/hive` unchanged; 441 tests pass.
    Lab tables and strips that scroll are focusable named groups. Phase 4 PR
    opened (see the PR list on GitHub).

### 3.2 Phase 5: progress

- **Problems (`/problems`) — done.** Header "The Workshop · Problems" with a
  lead line; "Surprise me" is a ghost (tertiary) button. Filters are an
  underlined row of words (`.pf-pill` under journal), active filters are ink
  chips (`.pf-chip`). Results are a hairline table: serif titles
  (`.pt-title`), mono id and tags (`.pt-meta`), platform in mono
  (`.pt-platform`), difficulty as an italic coloured word (`.pt-diff`, moss /
  ochre / brick from the badge's `data-variant`). All journal-only CSS in the
  "phase 5: Problems" block of `theme/styles.css`. Axe 0 in light, dark,
  phone. Not done: pagination as underlined page numbers (it is still
  Previous / Next with "Page x / y").
- **Demo data:** the demo database has no problems. To design against rows,
  insert a few into the running demo DB (find it with
  `cat /proc/$(pgrep -f src/server.js)/environ | tr '\0' '\n' | grep DB_PATH`)
  and bump `catalog_meta` (`update catalog_meta set v=v+1 where k='problems'`)
  so the in-memory catalog reloads. Never commit that data.
- **Solve (`/solve/:id`) — partly done.** Mono masthead and meta
  (`.sp-mast`, `.sp-meta`), serif display title (`.sp-title`), serif
  statement prose with small-caps label headings, ivory hairline example
  blocks (`.sp-sample`), verdict banner as a paper slip with the verdict word
  in serif and its meaning colour plus one line of general advice for
  non-accepted verdicts (`ADVICE` in `VerdictBanner.tsx`). The Monaco "Match
  app theme" was already generated from the palette (oat current line, clay
  cursor); the faded last line number is now readable. Axe 0.
  Judged tests are hairline rows (`.rp-cases`, `.rp-case`, a brick edge on
  failures); the first failing case already opens with Input · Expected ·
  Your output and the mismatch line. The "matches / differs" label has no
  tinted fill (it failed contrast). Checked for real: the demo **can** run
  and judge C++ locally (Paste many tests, then Run or Submit) — see the
  Playwright flow described in section 6.
  **Not done:** the paper-slip celebration (the existing confetti still
  runs), selection in oat 60%, editorial reader style. (Phone tabs Problem · Code · Results are
  done: Results hides the editor so tests and verdicts get the screen; Submit
  stays in the top bar; an sr-only h1 keeps the page titled when the
  statement tab is hidden; both resize handles carry aria values.) The demo
  cannot judge code or load statements (no network to judges), so check
  those parts where a judge is available.
- **Contests, Workshop, Submissions, Bookmarks — partly done.** They
  already use the journal kit from phase 1 (hairline tables, underlined tabs,
  stat cards). Done here: plain-voice headers with eyebrows ("The Workshop",
  "Your record"), plain empty states, and verdicts as italic serif words in
  their meaning colour (`.verdict-word` on every `VerdictBadge`; clay never
  used as text). Old lint warnings in these files fixed. Axe 0.
  **Contests list done:** under journal, `/contests` shows a calendar list
  (`components/contests/ContestRow.tsx`, `.cr-*` CSS): serif day numeral
  over month and weekday, serif name, platform / length / time in mono, mono
  countdown, a clay edge on live rounds, and "Remind me", which downloads an
  `.ics` file with a 30-minute alarm (`contestIcs()` in `contestUtils.ts`) so
  the student's own calendar reminds them (free, no server). Other styles
  keep the cards (`useTheme().shown.style`). Fixed a real bug:
  `fmtDuration` printed `1h ${m}m` literally. Checked with a mocked feed
  (Playwright route on `/api/contests`) in light, dark, phone: axe 0.
  **Not done:** custom contests as ivory cards (no data in the demo).
- **Next for phase 5:** the "Not done" items above, then open the phase 5 PR
  (or add to the open PR if the owner prefers one PR).

### 3.3 Phase 6: progress

- **Atlas mode in the existing renderer — done.**
  `components/nexus/RadialWeb.tsx` draws on a canvas. Under journal
  (`document.documentElement.dataset.style === 'journal'`, re-read when the
  theme changes) it switches to an engraved star chart without changing any
  behaviour:
  - `colOf(it)` returns ink instead of the zone hue
  - `hueOf` returns ink-2
  - no stream washes or zone tints
  - the rim is a hairline
  - region boundaries are dashed
  - region names are ink-2 small caps
  - stars: locked = hollow hairline, in progress = clay outline,
    mastered = solid ink with a canvas spark cross
  - the gold goal path and beacon become clay
  Dark mode inverts automatically (ink is the text colour).
- **Header — done.** Under journal: "The Atlas · Your sky", with the lead
  line carrying real figures (stars lit, constellations started, mastery %).
  The legend becomes an engraved key (`.nx-legend-stars`).
- Axe 0 in light, dark and phone.
- **Not done (brief 4.8):**
  - star size by weight (lessons + problems)
  - the 600ms draw-in of the hover path (the path itself is clay now:
    focused prerequisite and unlock links stroke in clay, and mastered
    links have no glow under the atlas)
  - "ignite" ring for newly unlocked stars (an accent pulse exists)
  - the side panel as an ivory sheet with "x of y lessons · x of y
    problems" and Read · Practise · Prerequisites links
  - list view (default on phones) with constellation headings
  - zoom-in serif italic names
  - concentric ring tick labels Bit → ∞ Overflow on the chart itself (the
    zone rail on the left now names the rings: italic serif numeral and
    the ring name, e.g. "3 Kilobyte", instead of the hexagon glyphs)
  Do these next. The renderer is large (about 1,900 lines); the drawing
  is in one effect, starting at "/* ── rendering ── */".

### 3.4 Phase 7: progress (stopped mid-way at a usage limit)

- **Profile (`/profile`, `/u/:username`) — first pass written, unchecked.**
  - Class hooks added: `pf-hero`, `pf-cover`, `pf-hero-body`,
    `pf-portrait`, `pf-portrait-ring`, `pf-name` in `pages/ProfilePage.tsx`;
    `pf-colophon`, `pf-fact`, `pf-fact-label`, `pf-fact-value`,
    `pf-fact-icon` in `components/profile/Showcase.tsx`.
  - Journal CSS at the end of `theme/styles.css` ("phase 7: Profile as a
    notebook cover"):
    - the masthead sits on canvas
    - the banner is hidden under journal; the chosen cover still shows in
      other styles
    - the portrait is mounted in a hairline frame with 12px ivory padding
    - the serif name is larger
    - the stats become a hairline-ruled colophon row (label over serif
      figure, no icons)
  - **First thing to do:**
    1. Build.
    2. Run `node client/scripts/check-page.cjs /profile profile --wait=2500`
       and look at light, dark and phone. The negative margin on the
       portrait was removed, so check the masthead layout.
    3. Run axe, then commit.
  - Not done (brief 4.10):
    - rank seal "Level 3 · Kilobyte" next to the name
    - bio in serif italic
    - actions as text links
    - figures counting up, with 30-day sparklines
    - calendar sentence ("Most active on Sundays…")
    - difficulty as three small multiples
    - the shelf of seals
    - the Bridge (linked judges) as hairline rows
    - Person structured data on `/u/:username`
    - the share image card in journal style
- **Analytics, Achievements, Social (brief 4.11):** not started.

### 3.5 What is left after phase 7

- Phase 8: GATE home + subpages (CBT restyle only), Settings, Appearance,
  Admin, 404, errors, loading (brief 4.9, 4.12, 4.13).
- Phase 9: polish sweep of every route (light, dark, phone), then update
  `docs/ui/premium.md` (house style + "Adding a style") and the Design
  section of `AGENTS.md`.
- Left-overs listed in 3.1–3.3: System Design reader, notes dek, Problems
  pagination as numbers, verdict "paper slip" celebration, Atlas star
  sizes, side panel, list view, ignite ring, ring tick labels.

### 3.6 Pull request state

- PR #114 (https://github.com/Gurudeep306/Nexora/pull/114) was opened for
  phase 4. Every later commit (phases 5, 6 and the start of 7) is on the same
  branch `claude/clever-babbage-km37j9`, so **PR #114 now contains phases
  4–7 (partial)**. Before the owner merges, update its title and description
  to list everything. You can also ask the owner whether they want it split.
  Do not merge without the owner saying "merge".
- Check its CI first (GitHub Actions on the PR). Fix any failure at the cause.

## 4. What phases 1–3 built (reuse these; do not rebuild them)

**Theme engine** (`client/src/theme/`):
- `palettes.ts`: palettes as OKLCH `"L C H"` strings (no `oklch()`). The
  `parchment` palette is the default. Slots: `bg[0..4]` = app, surface,
  surface-2, surface-3 (oat), surface-4; `fg[0..2]` = ink, ink-2, muted;
  `border`; `accent`, `accent2`, `onAccent`; states; syntax. The contrast
  audit lives in `audit.ts` and runs in `tests/theme-contrast.test.js`.
  - Deliberate deviations from the brief's table: manilla is **not** in
    `bg[2]` (that slot backs ~340 hover/chip uses and would tint the UI
    yellow). Manilla lives in `--ed-feature`. The palette accent is a deeper
    clay so accent text passes 4.5:1; buttons fill with the exact `#d97757`
    via `--ed-clay` with ink text. Light muted is `0.5 0.009 99` (darker than
    the brief's 0.523) for contrast. Dark accent is `0.69 0.127 39`.
- `styles.ts`: `journal` ("Field Journal") is first and is `DEFAULT_STYLE`,
  with `displayFont: 'newsreader'`.
- `look.ts`: the look model, version 4. Migration v4 moves an untouched old
  default (Studio on Midnight) to journal/parchment and keeps every other
  choice. `hiveLook()` / `isHivePath()`: while a `/hive` page is open, a
  journal look is shown as the old default so Hive looks unchanged. This is
  applied in `context/ThemeContext.tsx` (`shown`, `setHiveScope`; the Hive
  route calls `setHiveScope(true)` in `components/admin/AdminRoute.tsx`) and in
  the first-paint script in `client/index.html`. Components that branch on the
  style must read `useTheme().shown.style`, not `look.style`.
- `styles.css`: all style-specific rules, keyed by `[data-style='…']`,
  **unlayered**. The large "Field Journal" section at the end styles the kit,
  shell and dock under `[data-style='journal']`.

**Editorial classes** (`client/src/styles/journal.css`, in `@layer components`):
- `ed-display-serif`, `ed-display-sans`, `ed-title`, `ed-h2`, `ed-heading`,
  `ed-subheading`, `ed-body`, `ed-body-sm`, `ed-lead`, `ed-ui`, `ed-ui-sm`,
  `ed-caption`, `ed-label`, `ed-ink`, `ed-ink-2`, `ed-muted`, `ed-serif`,
  `ed-sans`, `ed-mono`, `ed-link`
- surfaces: `ed-card` (24px), `ed-card-sm` (16px), `ed-feature` (manilla),
  `ed-oat`, `ed-rows`, `ed-hairline`
- buttons: `ed-btn` + `ed-btn-clay` / `ed-btn-ivory` / `ed-btn-outline`,
  `ed-icon-btn`
- other: `ed-figure`, `ed-serif-numeral`, `ed-wordmark`, `ed-tabs` / `ed-tab`
  (the underline is drawn with `.is-on`, `aria-selected` or `aria-current`),
  `ed-spark`
- Scopes: `.lp` / `.ed` (landing, sign-in, coming soon) use fixed parchment
  values; inside the app any `[data-style]` maps every `--ed-*` variable to
  the theme tokens, so pages built with these classes work in every style.
  `[data-style='journal'][data-palette='parchment']` adds the exact clay and
  manilla.
- `.ed-specimen`: the landing's live lessons (`LessonPreview` binary search,
  `SchedulerPreview` round-robin, `GraphPreview` BFS, in
  `components/landing/`) work inside the app inside an `.ed-specimen` wrapper.

**Kit hooks** (`client/src/components/ui/`): components carry `data-ui`
attributes styled only under journal:
- `button` (with `data-variant`), `card`, `card-title`, `badge` (with
  `data-variant`)
- `tabs` (with `data-variant`), `tab`, `tab-ink` (a sliding underline,
  `layoutId`)
- `table`, `thead`, `progress` (with `data-done`), `progress-bar`
- `page-header`, `eyebrow`, `page-title`, `page-lead`, `page-icon`
- `stat`, `stat-label`, `stat-value` (StatCard takes `spark={number[]}`)
- `empty`, `empty-title`
- `scrim`, `sheet`, `sheet-title`, `group-title`
- `tooltip`, `kbd`, `rank`
- `topbar` (with `data-scrolled`), `crumb-section`

Also:
- `Sparkline` (`components/ui/Sparkline.tsx`): draws once in view.
- Dock classes: `dock-glass`, `dock-dot`, `dock-divider`, `dock-more`;
  phone tab bar: `tabbar`, `tabbar-tick`.
- `MotionConfig reducedMotion="user"` is at the root (`main.tsx`).

**Home** (`pages/HubPage.tsx`, `components/today/`):
- `today-data.ts` turns real data into sentences: `findContinue`,
  `nextSteps`, `lastDays`, `thisWeek`, `weekSentence`, `verdictWord`,
  `figureFor`, `resetsIn`, `until`.
- `Today.tsx`: `Reveal`, `Masthead`, `Spread`, `Ledger`, `Week`, `Rooms`,
  `FieldNotes`, `ResetsIn`.

**Learn** (`components/learn/LearnHome.tsx`, `learn-home.css`) and **subject
pages** (`pages/SubjectPage.tsx`):
- The subject pages' default view is `components/nexus/SubjectContents.tsx`;
  `?view=tree` opens the skill tree.
- Learn progress items carry `doneAt` / `updatedAt` (`learn/progress.ts`).

**Questions** (`components/question/Question.tsx` + `question.css`):
- Parts: `QuestionCard`, `Masthead`, `QuestionTitle`, `QuestionText`,
  `QuestionHint`, `OptionList`, `OptionRow` (`state`: idle | right | wrong |
  missed | dim), `AnswerField`, `QuestionActions`, `CheckButton`,
  `TextAction`, `Verdict` (focused and announced), `SolutionBlock` (open on
  wrong, folded on right), `SolutionSteps` (roman italic), `NextQuestion`.
- Used by `gate/QuestionView.tsx`, `learn/ui/QuestionCard.tsx`,
  `gate/notes/render/PracticeEmbed.tsx`, `components/nexus/NodeExtras.tsx`
  (TestOut) and the System Design quiz.
- `gate/solution/GateSolution.tsx` is restyled; the step walkthrough sits on
  `ed-feature`.
- Phase 5 (coding) should reuse this kit's look for the statement and
  verdicts where it fits.

## 5. Lessons learned (pitfalls that cost time)

- **CSS layers:** unlayered CSS beats Tailwind utilities and anything in
  `@layer components`. Put new journal CSS in `@layer components` (so
  utilities still win for spacing); style-only overrides belong unlayered in
  `theme/styles.css` under `[data-style='journal']`.
  - Old unlayered page CSS (for example `.np`, `.q-card` in `notes.css` and
    `learn.css`) will override layered components: remove or narrow it.
  - Tailwind `!important` utilities cannot be overridden from unlayered CSS,
    because important layered declarations win. Branch in the component
    instead (as `Toast.tsx` does).
- **Base layer:** `button:disabled` gets `opacity: 0.5`. Answered option rows
  set `opacity: 1` in their own layer.
- **Journal heading rules:**
  - h1/h2 are weight 400 serif; h3–h6 are sans.
  - Both skip elements whose class contains `ed-`. So to get a serif h3, give
    it an `ed-*` class such as `ed-serif`.
- **Composite shadows** can't take `none`; use `0 0 #0000`.
- **Contrast:**
  - Clay text fails on paper: use ink text with a clay underline, or a clay
    fill with ink text.
  - Muted text on manilla or oat uses `#5c5b55` (light) and `#aaa79e`
    (dark) via the `.ed-feature` / `.ed-oat` overrides in `journal.css`.
  - Opacity fades (for example 35% "discarded" cells) fail axe; use muted
    ink plus a dashed edge instead.
  - axe also flags text mid-fade, even when it is `aria-hidden`: avoid
    animating text opacity.
- **Headings:** keep a real heading order. A card in a page under h1 needs
  h2 (see the `titleAs` prop on the lesson `QuestionCard`). Hidden `sr-only`
  headings are fine.
- **ARIA:** an `aria-label` on a plain `<span>` needs `role="img"`.
  Icon-only links on phones need an `aria-label`.
- **Lint:**
  - oxlint flags `Date.now()` / `new Date()` during render and
    `setState` in effects.
  - Use `useState(() => …)` initialisers, or stamp times inside fetchers
    (see `HubPage` `fetchedAt`).
  - Add no new warnings to the files you touch.
- **Landing page:** signed-in users are redirected from `/` to `/hub`. Use
  `/?preview` to see the landing page.
- **The dock's glass is a sibling element on purpose.** Swap classes; don't
  restructure it.
- **Demo data:** signed in as **owner**, the demo shows the notes subjects
  `dl` (Digital Logic), `dm` (Discrete Maths) and `demo`. Lesson routes are
  `/gate/notes/<subject>/<lesson-id>`; get ids from
  `GET /api/gate/notes/<subject>` (chapters → lessons). Lessons with
  animations: `grep -rl ':::viz' content/gate-notes/dl` (for example
  `/gate/notes/dl/multiplexers`).
- **The demo serves `client/dist`.** After every client change run
  `cd client && npx vite build`, or the browser shows the old UI.
- **Fixed in phase 4 part 1** (don't reintroduce): nested `.nx-aside`
  landmark, duplicate "Breadcrumb" navs, unfocusable `.viz-code`,
  `.md-table-wrap`, `pre` and `.nm-display`; clay text on the selected code
  tab (`bg-accent-brand/15 text-accent-brand`, restyled under journal);
  `.viz-slot` opacity 0.8 that faded the address labels (journal sets it to
  1); "Check yourself" sections with the same name (now groups).
- **setState from props:** to follow a prop (like `syncTo`), adjust state
  during render with a "last seen" state value, not in an effect (oxlint
  flags the effect).
- **The 3 practice questions in a notes lesson** render the shared question
  kit; maths-only options need the sr-only "Option A:" prefix (done in
  `OptionRow`).
- **axe failure details:** `client/scripts/check-page.cjs` prints each
  failing node's message (contrast ratio, colours). Get the colours before
  guessing.

## 6. How to check every phase (do all of this before pushing)

```bash
npm install && npm install --prefix client
npm test                                   # all server tests must pass (441 at the end of phase 4 part 1)
cd client && npx tsc -b                    # typecheck, clean
cd client && npx oxlint src                # 0 errors; no new warnings in touched files
cd client && npx vite build                # production build
```

Then run the demo server and check in a browser (Playwright and Chromium are
available):

```bash
PORT=3300 node scripts/hive-demo.js        # sign in as owner / owner123
node client/scripts/check-dock.cjs         # the dock still magnifies, auto-hides, opens More
npm i --no-save --prefix /tmp/axe axe-core # once, for the page checker
node client/scripts/check-page.cjs /learn/dsa/arrays dsa-arrays          # light, dark, phone: overflow + axe
node client/scripts/check-page.cjs /hive hive light --noaxe --style=studio
```

- Log in from a script with `POST /api/user/login` and the JSON body
  `{"username":"owner","password":"owner123"}`.
- If a check script stubs `/api/settings`, the account's saved look and dock
  stay out of the test.
- Run **axe-core** on every touched route in light and dark (and a phone
  viewport, for example iPhone 13). The target is **0 violations**.
- Also check the following, before and after any interaction (for example
  answering a question):
  - nothing scrolls sideways at phone width
  - `/hive` still renders `data-style=studio`, `data-palette=midnight`,
    `data-card-style=soft`
- To see judging on `/solve/:id` in the demo: click "Paste many tests", fill
  `1\n---\n1\n===\n3\n---\n4`, click Add, type a program into Monaco
  (click `.monaco-editor`, Ctrl+A, type), click Submit, wait ~10 s.
- Take screenshots for each page: desktop light, desktop dark, phone. Put
  them side by side with the landing page at `/?preview`. Send them to the
  owner.

## 7. Git workflow in this environment

- Work on the branch the session tells you to (phase 4 part 1 is on
  `claude/clever-babbage-km37j9`; earlier sessions used
  `claude/fervent-curie-vjgcd8`). If your session names a different branch,
  start it from `origin/claude/clever-babbage-km37j9` so phase 4 part 1 comes
  with you (or from `main` once phase 4 is merged).
- If the remote branch still holds already-merged history and a normal push
  is rejected as non-fast-forward, **do not force-push**. Run
  `git merge -s ours origin/<branch>` (it keeps your files exactly and records
  the old tip), then push normally.
- Commit messages: describe what moved where and why. End with the
  attribution lines your environment specifies. No model names.
- **One PR per phase.** The PR description says:
  - what moved where, so nothing is lost
  - the checks you ran and their results
  - anything you could not check
  - the next phase
- After opening a PR, watch its CI. When the owner says "merge":
  1. Confirm CI is green on the current head and there is no conflict.
  2. Squash-merge.
  3. Restart the branch from the new `main` before the next phase.

## 8. Your first steps

1. Read `AGENTS.md`, `CLAUDE.md`, `docs/ui/field-journal.md`, then the brief
   below in full.
2. Fetch `claude/clever-babbage-km37j9` and `main` (see section 7). Install,
   build, and run the demo server. Open `/learn/dsa/arrays` and
   `/gate/notes/dl/place-value` to see where phase 4 stands.
3. Study the reader code before changing it (new in part 1:
   `client/src/components/reader/Sidenote.tsx`, `Outline.tsx`,
   `EndOfLesson.tsx`, `useScrollSync.ts`, and the "phase 4" blocks at the end
   of `styles/reader.css` and `theme/styles.css`):
   - `client/src/styles/reader.css`, `client/src/styles/reading.css`
   - `client/src/learn/ui/*` (the lesson reader, `Blocks.tsx`)
   - `client/src/gate/notes/**` (`NotesLessonPage`, `NotesIndexPage`,
     `NotesSubjectPage`, `render/NotesContent.tsx`, `notes.css`)
   - `client/src/viz/` (the player and scene schema)
   - `client/src/learn/system-design/components/SystemNotesReader.tsx`
4. Finish phase 4: the "Left" list in section 3.1, checked against brief §3
   step 7 (viz colours and player) and §4.4 (the reader).
5. Run every check in section 6 above, fix everything, push, and open the
   phase 4 PR. Then report to the owner in plain words, with screenshots, and
   wait for "merge" before phase 5.
6. Before you stop for any reason (a usage limit, the end of a session),
   update sections 3, 4 and 5 of `docs/ui/FIELD_JOURNAL_HANDOVER.md`
   with what you finished, what is half done (file and function names), and
   anything you learned, then commit and push it with the work.
7. Repeat for phases 5 to 9, in order, one PR each. Phase 9 includes:
   - updating `docs/ui/premium.md` (house style, and an "Adding a style"
     section)
   - updating the Design section of `AGENTS.md`
   - a sweep of every route in light, dark and on a phone

---

# The brief (verbatim). Phases 1–3 are done; build phases 4–9.

# Field Journal: take the whole site into the new look (final brief)

> **What this is.** The brief for rolling the landing page's "field journal"
> design out to **every page and every question screen** of NexoraGuru except
> Hive. It covers:
> - the design system
> - how to build it on the existing theme engine
> - a planned layout for every page, with Home, Nexus and Profile completely
>   restructured
> - every question surface (GATE PYQs, coding problems, lesson checks)
> - the dock
> - the animation catalogue
> - how to check and ship each phase
>
> Read `AGENTS.md` first. This brief adds to it and does not replace it.

---

## 0. The owner's words, and the bar

> "I loved this theme so I decided to keep this theme in the entire website…
> completely restructure home as per the theme, nexus, profile… I want every
> part — the questions, GATE PYQs, coding — everything matches it… I want the
> bottom dock to remain same, just some changes as per the theme… notes
> animations would look super crazy… leave Hive for now… amaze me."

**The bar** is the live landing page (`client/src/pages/LandingPage.tsx`), the
sign-in page (`client/src/pages/AuthPage.tsx`) and the coming-soon screen. Every
page must feel printed in the same journal:
- warm paper and an editorial serif
- hairlines instead of shadows
- one clay action per screen
- animations that teach

Put any page you build next to the landing page; nobody should be able to tell
which was built first.

**Quality first.** Finish one area completely before the next: built, checked,
and screenshotted in light, dark and on a phone. Never ship half a page.

**Out of scope for now:** new styles on the Appearance page (the owner will add
themes later; see section 6), and everything in Hive.

---

## 1. Rules that are never broken

- **Branches.** Work on a branch, with one pull request per phase (section 9).
  Never commit to `main`: merging to `main` deploys the live site, and only the
  owner says "merge".
- **Git hygiene.** No force-pushes. No secrets. No model names in commits, PR
  titles or code.
- **Tests.** Never skip or weaken a test to get CI green.
- **Hive is untouched.** Don't change `client/src/hive/**`, the `--hv-*`
  tokens or the Hive kit. Check that `/hive` looks the same after every phase.
- **Tokens only.** No raw colours in components; colour values live only in the
  palette and the style CSS.
- **Both modes, all sizes.** Light and dark both work. `prefers-reduced-motion`
  is respected. No horizontal scroll at 360px.
- **No decoration effects.** No gradient text, glow blobs, neon shadows,
  rainbow bars or hexagons. The journal has **no drop shadows**: depth comes
  from paper colour and hairlines.
- **Animations explain.** Every animation explains an idea or shows real
  state, never decoration only.
- **Copy tells the truth.** No invented numbers, users or testimonials.
- **Keep features.** Every existing feature and route stays: restructure and
  restyle, don't remove. If something seems to have no place, put it in the
  page's secondary area and say so in the PR.

---

## 2. The design system

### 2.1 Colour

The palette engine stores **OKLCH as `"L C H"` strings**
(`client/src/theme/palettes.ts`).

**Light (default)**

| Role | Hex | OKLCH | Palette slot |
|---|---|---|---|
| Canvas (page) | `#f0eee6` | `0.948 0.011 95` | `bg[0]` |
| Card / ivory | `#faf9f5` | `0.982 0.005 95` | `bg[1]` |
| Feature spread (manilla) | `#f5e3c7` | `0.923 0.042 79` | `bg[2]` |
| Hover / oat | `#e3dacc` | `0.892 0.021 79` | `bg[3]` |
| Fill | `#d9d4c7` | `0.865 0.017 88` | `bg[4]` |
| Ink | `#141413` | `0.191 0.002 107` | `fg[0]` |
| Ink-2 | `#3d3d3a` | `0.359 0.005 107` | `fg[1]` |
| Muted | `#6b6a64` | `0.523 0.009 99` | `fg[2]` |
| Hairline | `#cccbc8` | `0.842 0.004 91` | `border` |
| Clay (accent) | `#d97757` | `0.672 0.131 39` | `accent` |
| Clay deep (hover) | `#c6613f` | `0.608 0.138 39` | `accent2` |
| On clay | `#141413` | `0.191 0.002 107` | `onAccent` |

**Dark**

| Role | Hex | OKLCH |
|---|---|---|
| Canvas | `#1a1917` | `0.214 0.004 85` |
| Card | `#22211e` | `0.248 0.006 92` |
| Feature spread | `#2c2822` | `0.279 0.012 78` |
| Hover / oat | `#2a2824` | `0.278 0.008 85` |
| Ink | `#f0eee6` | `0.948 0.011 95` |
| Ink-2 | `#d4d1c7` | `0.860 0.014 93` |
| Muted | `#a5a299` | `0.712 0.013 92` |
| Hairline | `#3a3935` | `0.344 0.007 95` |
| Clay | `#d97757` | `0.672 0.131 39` |
| Clay deep | `#e08a6c` | `0.717 0.114 40` |
| Inverse footer | `#0f0f0e` | |

**State colours** are earthy so they sit on paper:

| State | Light | Dark |
|---|---|---|
| success (moss) | `0.52 0.11 145` | `0.74 0.12 145` |
| warning (ochre) | `0.58 0.12 75` | `0.80 0.12 80` |
| danger (brick) | `0.52 0.16 30` | `0.72 0.15 30` |
| info (slate) | `0.50 0.08 245` | `0.76 0.08 245` |

Check each against canvas and card at 4.5:1 for text.

**Syntax colours** (code blocks and the Monaco editor):

| Token | Colour |
|---|---|
| keyword | clay deep |
| string | moss |
| number | ochre |
| function | ink |
| type | slate |
| comment | muted italic |

**Meaning:**
- Clay is only for the one main action on a screen, the current item, and the
  "answer" moment of an animation.
- **Clay is never body text.** On parchment it is about 2.9:1 and fails, so
  links are ink with a clay or stone underline.
- State colours are only for state, and are always paired with a word or
  symbol, never colour alone.
- Icons default to the quiet container.

### 2.2 Type

| Use | Face | Notes |
|---|---|---|
| Display, page titles, lesson titles, big figures | **Newsreader Variable** (opsz) | weight 400; tracking -0.015 to -0.02em; `text-wrap: balance` |
| Declarative hero only (landing, Home greeting) | Geist Variable 700 | the one heavy sans headline |
| Body prose (lessons, notes, statements, editorials, solutions) | Newsreader | 1.125–1.25rem, line-height 1.45–1.6, max 68ch |
| UI chrome (buttons, nav, tabs, inputs, tables, chips) | Geist Variable | 13–15px, weight 500 |
| Labels / kickers | Geist 600, uppercase | 0.75rem, tracking 0.08em, muted |
| Code, data numbers, pointers, ids, times | JetBrains Mono Variable | tabular figures |
| Maths (KaTeX) | KaTeX fonts | size to the serif's x-height |

**Scale** (desktop / phone):

| Level | Desktop | Phone |
|---|---|---|
| display | 4.25rem | 2.5rem |
| h1 | 3.25rem | 2.25rem |
| h2 | 2.25rem | 1.75rem |
| h3 (sans) | 1.25rem | 1.25rem |
| body | 1.25rem | 1.125rem |
| small | 1rem | 1rem |
| caption | 0.8125rem | 0.8125rem |

All three fonts are already dependencies. Load Newsreader `opsz.css` once in
the app entry when the journal style is active.

### 2.3 Shape, space, lines

- **Cards:** 24px radius (16px for small items), 1px hairline, no shadow.
- **Inputs:** 12px radius and a hairline border. Use a canvas fill on cards and
  an ivory fill on the canvas. Focus is an ink border plus a 3px clay ring at
  22%.
- **Primary button, the signature:**
  - clay fill, ink text, padding 12px 24px
  - radius `0 0 8px 8px`: square on top, rounded only at the bottom
- **Secondary button:** ivory, hairline, with the same bottom-only radius.
- **Tertiary:** underlined text.
- **Tool buttons:** 12px radius, outline.
- **Tabs:** text with a 2px ink underline that slides; no pills. Segmented
  controls become underlined tab rows.
- **Lists:** hairline-separated rows, not boxed cards.
- **Space:**
  - 8px base
  - sections 96–128px apart on desktop, 64–96px on phone
  - max width 1280px; reading column 68ch
- **Page header:** a muted uppercase kicker, a serif title and one serif lead
  line. Nothing else.

### 2.4 Surfaces

| Surface | Use |
|---|---|
| Canvas | every page background |
| Ivory card | things you act on |
| Manilla spread | **one** hero moment per page at most |
| Oat panel | groups secondary sets |
| Inverse ink | public footers only |

### 2.5 Motion

- **Curve and timing:**
  - one curve: `cubic-bezier(0.22, 1, 0.36, 1)`
  - 300ms for UI, 600–800ms for reveals, 450ms for tab underlines
- **Page enter and reveal:**
  - pages enter by rising 24px and fading in over 0.7s
  - sections reveal once on scroll (see `Reveal` in `LandingPage.tsx`)
- **Numbers** count up once when seen (`CountUp` in
  `components/landing/motifs.tsx`).
- **Teaching animations** use the shared step player
  (`components/landing/player.tsx` plus `useStepper.ts`):
  - autoplay, pausing on hover, on focus and when off-screen
  - step buttons and "Step i of n"
  - a serif narration line (`aria-live="polite"`)
- **Reduced motion:**
  - no autoplay, marquee or rises
  - numbers show their final value
  - players wait for the step buttons
- **Avoid:** springs that overshoot and bounce. The one celebration (first
  accepted solution, first correct PYQ of the day) is falling paper slips in
  palette colours.

### 2.6 Icons, charts, images

- **Icons:** line icons through `Icon`, 1.5px stroke, ink or muted. No filled
  colour tiles.
- **Charts follow Tufte:**
  - a high data-ink ratio
  - direct labels instead of legends
  - hairline grids
  - serif chart titles, mono axis numbers
  - **sparklines** (word-sized line charts) beside numbers
  - **small multiples** (a grid of tiny charts on shared axes) instead of one
    busy chart
- **Chart colours:**
  - one series that matters: clay
  - the rest: ink or muted
  - sequential scales: oat → clay deep
  - categorical: ink, clay, moss, slate, ochre and plum `0.45 0.08 340`
- **Avatars and figures:** sit on ivory with a hairline frame.

### 2.7 Voice

- Short, warm and specific.
- Kickers are nouns: "Today", "The atlas", "Your ledger".
- Leads are one serif sentence about what the page is for.
- The landing page's "rooms" can be used as kickers, never as the navigation
  names:

  | Room | Pages |
  |---|---|
  | The Library | Learn and Notes |
  | The Workshop | Problems, Solve and Contests |
  | The Exam Hall | GATE |
  | The Atlas | Nexus |
  | The Ledger | Analytics, Achievements and Profile |
  | The Bridge | linked accounts |

---

## 3. How to build it

Build on the existing theme engine; don't fork it.

1. **Palette.** Add `parchment` to `client/src/theme/palettes.ts` (category
   `signature`, light and dark from 2.1). Blurb: "Warm paper, ink and a clay
   pencil."
2. **Style.** Add `journal` to `STYLES` in `client/src/theme/styles.ts`:
   - name "Field Journal"
   - tagline "Warm paper, set like a journal"
   - bundle `{ theme: 'parchment', font: 'geist', codeFont: 'jetbrains', radius: 'rounded', cardStyle: 'flat', pattern: 'none' }`
   - `displayFont: 'newsreader'`

   Write its rules in `client/src/theme/styles.css` under
   `[data-style='journal']`:
   - serif `h1`, `h2` and `.sx-h`
   - label treatment
   - **no shadows** (override every `shadow-*` the kit uses)
   - `[data-ui='button'][data-variant='primary']` becomes clay with the
     bottom-only radius; secondary becomes ivory with a hairline
   - tabs underlined
   - `::selection` in oat; focus ring in clay deep
3. **One source of truth.**
   - Move the generic `ed-*` classes from `components/landing/landing.css`
     into `client/src/styles/journal.css`:
     display, heading, subheading, body, label, card, feature, oat, rule, link,
     button, icon-btn, figure and serif numeral.
   - Scope it `:is(.lp, .ed, [data-style='journal'])` and wrap it in
     `@layer components`.
   - Inside the app, the `--ed-*` variables **read from the semantic tokens**
     (`--ed-canvas: var(--color-bg-app)` …). The landing and sign-in pages keep
     their fixed parchment values.
   - Keep `landing.css` only for landing-only pieces.
4. **Default for everyone.**
   - Make `journal` the default in the admin default-style setting
     (`components/admin/DefaultStylePanel.tsx` and the server status it reads)
     and the fallback in `theme/look.ts`.
   - Add look migration **v4**: anyone still on the untouched v3 default
     (Studio and midnight) moves to Field Journal. Anyone who chose a style
     keeps it.
   - Extend the theme tests with migration cases, as was done for v3.
5. **Shared UI kit first** (`client/src/components/ui/`), so every page
   inherits the look before any page is touched:

   | Component | Journal treatment |
   |---|---|
   | Button | clay primary with bottom-only radius; ivory secondary |
   | Card | 24px, hairline, no shadow |
   | Badge | plain word or ink chip, no colour pill |
   | Tabs | underline that slides |
   | Input, Select | 12px, hairline, clay focus ring |
   | SearchCombobox and `styles/search.css` | journal field |
   | Table | hairline rows; header in label style |
   | Modal | ivory sheet, 24px, hairline, ink scrim at 30% |
   | Toast | ink slip at the bottom-left |
   | Tooltip | ink on ivory |
   | Progress | 2px ink line, clay at completion |
   | StatCard | serif number, a kicker label and an optional sparkline |
   | EmptyState | one serif line and one tertiary link |
   | PageHeader | kicker, serif title, lead |
   | BackButton, Kbd | journal colours and type |
   | AnimatedNumber | counts up on the shared curve |
   | RankGlyph | ink seal |
   | Confetti | paper slips |

6. **App shell** (`components/layout/`):
   - **Topbar:**
     - flat canvas, with a hairline that appears on scroll (like the landing
       nav)
     - logo mark plus the serif "NexoraGuru" wordmark
     - breadcrumbs in label style
     - the journal search field
   - **The dock: keep it exactly as it is, and change only its skin.** See 3.1.
   - **Command palette:** an ivory sheet, serif group titles, mono shortcuts.
   - **User menu, notifications:** ivory sheets with hairline rows.
7. **Viz engine** (`client/src/viz/`, `viz.css`). Map its colours to journal
   roles so every lesson animation matches the landing specimens:

   | Element | Look |
   |---|---|
   | cells and nodes | ivory with a hairline |
   | visited | ink fill, canvas text |
   | current / answer | clay |
   | discarded | 35% opacity |
   | pointers | mono labels |
   | edges | hairline, then line-strong, then clay when active |

   Give `VizPlayer` the landing player's controls.

### 3.1 The bottom dock: same dock, journal skin

The owner wants the dock **to stay the same**. Keep everything about how it
works:
- where it sits (fixed, bottom centre, `md` and up)
- the macOS-style magnification on hover
- the hide-on-scroll behaviour
- right-click to edit, and the More menu with Customize
- `DockBadge` counts, the order and customisation (`dockStore.ts`,
  `DockEditor.tsx`, `DockSync.tsx`)
- the mobile tab bar (`MobileTabBar.tsx`) and its layout

Only change how it looks under `[data-style='journal']`:
- **Background:** the `glass-thick` layer becomes **ivory paper**
  (`--color-bg-surface`) with a 1px hairline and the same 24px radius. No blur
  and no shadow (a hairline is enough on canvas). In dark mode, use card
  colour with the dark hairline.
- **Icon tiles** (`dock-tile`, `dockIcons.ts`): when "mono" icons are on (the
  default), use the quiet look: a canvas-coloured tile with a hairline and an
  ink-2 glyph. Coloured tiles stay available as the user's choice.
- **Current page:** a 2px **clay tick** under the icon in place of the dot,
  with the glyph in ink.
- **Hover label** (`dock-label`): an ink slip with canvas text, Geist 12px and
  6px radius.
- **Divider:** a hairline.
- **Badges:** a clay dot with ink text.
- **More menu:** an ivory sheet with hairline rows.
- **Mobile tab bar:**
  - canvas background with a top hairline
  - current tab in ink with a clay tick above it
  - labels in Geist 11px

The dock must look and behave the same in every other style. Add a
Playwright check that the dock still magnifies, hides on scroll and opens
More.

---

## 4. Page-by-page structure

### 4.1 Home (`/hub`, `pages/HubPage.tsx`): complete restructure, "Today"

Think of the front page of a well-kept field journal on the day you open it.
It answers *what should I do next, and how am I doing?* in five seconds.

1. **Masthead** (full width, on canvas):
   - Kicker: the date and the reader's room, e.g. "Sunday, 15 November · Day
     12 of your streak".
   - Display headline in Geist 700, e.g. "Good evening, Gurudeep." The second
     line is serif in ink-2 and names the best next step from real data, e.g.
     "You're three pages from finishing Arrays."
   - The clay button does that step. A tertiary link offers the second-best
     step.
2. **The spread** (manilla, the page's one hero moment). Two columns:
   - Left: **"Continue"**. The lesson or problem in progress, its **live
     animation** (the lesson's current viz through the step player), the title
     in serif, and a progress hairline with "page 9 of 24".
   - Right: **"Today's three"**. Three hairline rows: the daily challenge
     (resets-in timer in mono), the GATE question of the day, and the review
     queue ("12 cards due"). Each row is a sentence with an arrow.
   - With nothing in progress: a "Start here" path of three first lessons.
3. **Your ledger** (canvas):
   - Four figures in large serif that count up, each on a hairline-topped
     column with a **sparkline** of the last 30 days beneath: XP, streak,
     solved and rank.
   - The **level ladder** (landing `LevelLadder`) with your bar filling to
     your real level and "800 XP to Byte" in mono.
4. **This week, in small multiples:**
   - a row of seven tiny day columns (Mon–Sun) showing problems solved and
     lessons read as stacked hairline bars, with today marked in clay
   - one serif sentence summarising the week
5. **The rooms** (replaces the 15-tile "Explore NexoraGuru" grid):
   - Six ivory cards in a 3×2 grid: Library, Workshop, Exam Hall, Atlas,
     Ledger, Bridge.
   - Each card has the room kicker, a serif name of the main page, **one live
     line** ("3 lessons left in Arrays", "Next contest in 2 d 4 h", "Mastery
     12%") and up to three text links to its pages.
   - Every page from the old grid stays reachable here, in the dock and in the
     command palette.
6. **Field notes** (recent activity):
   - a hairline timeline in serif, e.g. "Solved *Two Sum* in C++ · 2 h ago",
     with mono times
   - recent submissions as rows with verdict words in meaning colours
7. **Sync** (Codeforces and the other judges): a quiet tertiary link in the
   masthead, with "last synced 3 h ago" in mono.

Phone order: masthead, Continue, Today's three, ledger figures (2×2), rooms
(stacked), field notes.

### 4.2 Learn (`/learn`): "The Library"
1. Header: kicker "The Library", serif title "Learn", one lead line.
2. **Ready to study:**
   - one manilla spread for the subject in progress (live first-frame
     animation, next lesson, clay "Continue")
   - ivory cards for the other ready subjects, each with text links
     "Lessons · Skill tree · Practice"
3. **All subjects:**
   - serif group headings with mono counts
   - subjects as hairline rows (name, a short line, a "Ready" or "Being
     written" label), two columns on desktop
   - search filters live
4. "More ways to learn": a hairline list.

### 4.3 Subject page (`/learn/:subject`): a book's table of contents
1. Header: kicker is the group, serif title, lead, and a progress hairline
   with "12 of 38 lessons".
2. A sticky chapter index on the left.
3. Chapters as numbered serif headings with roman numerals in italic.
4. Lessons as hairline rows: reading time in mono, and a moss check when done.
5. Skill tree and Practice are text links in the header.
6. "In the Nexus" becomes a small atlas card that links to the subject's
   constellation.

### 4.4 The reader: lessons (`/learn/dsa/:topic`) and GATE notes (`/gate/notes/:subject/:lesson`)

**The showpiece.** Spend the most care here. It is built like Distill.pub and
Bartosz Ciechanowski's essays: one reading column, figures that break out
wider, and notes in the margin.

- **Layout:**
  - the lessons rail on the left, collapsing to the mini strip
  - a centred 68ch reading column on canvas
  - the live "On this page" outline on the right, in label style, with a clay
    tick that slides to the current section
- **Title block:**
  - kicker "Chapter III · Arrays"
  - serif display title
  - a serif dek (one-line summary)
  - a mono meta line: "12 min · 1 animation · 5 questions"
- **Prose and margin notes:**
  - prose in Newsreader at 1.2rem / 1.6
  - definitions, asides and footnotes become **sidenotes** in the right
    margin on wide screens (italic serif with a hairline top); on phones they
    fold inline as a tappable "note" marker
  - footnote numbers show their text on hover or tap
- **Figures (viz blocks):**
  - each is a **manilla figure spread** that breaks out wider than the text,
    up to 960px (Distill's "outset" idea)
  - a "Figure 3 · Binary search on a sorted array" label caption
  - the shared step player, with a serif narration line that explains *why*
  - figures **play when scrolled into view** and pause when out of view
  - where a passage walks through a figure step by step, **sync the figure
    to the text**: as each paragraph reaches the middle of the screen, the
    figure moves to that step (scrollytelling, as in Red Blob Games'
    articles), with buttons still available
  - reduced motion: no scroll-sync; buttons only
- **Tables:**
  - hairline rules only
  - a mono header in label style
  - numbers right-aligned in tabular figures
- **Maths:** display equations centred, with an optional mono equation number.
- **Code:**
  - ivory block, hairline, mono, journal syntax colours
  - the active line highlighted in oat when tied to a viz step
  - language tabs underlined
- **Callouts** (label kicker, serif body, no filled backgrounds):
  - "Pitfall": a brick hairline at the left
  - "Why it works": moss
  - "Check yourself": clay
- **Questions inside lessons:** see section 5. They must look identical to
  the GATE and practice question cards.
- **End of lesson:**
  - a hairline rule
  - "Next: …" as a large serif link
  - progress dots and the "Check yourself" set
- **Notes index** (`/gate/notes`):
  - "Ready to read" as ivory cards, each with a live first-frame thumbnail of
    the subject's signature animation
  - "Being written" as muted rows
- **Notes subject page:** the pattern from 4.3.

### 4.5 Problems (`/problems`): "The Workshop"
1. Header: kicker "The Workshop", serif "Problems" and a lead line. "Surprise
   me" is a tertiary link.
2. **Search and filters:**
   - the journal search field, with Ask AI as a tool button
   - filters (`components/problems/ProblemFilters.tsx`, `filters.css`) as an
     underlined filter row: platform, difficulty, status, tags, sets, rating
   - active filters show as ink chips with ×
3. **Results** (`ProblemTable.tsx`) as a hairline table:
   - serif title
   - platform and id in mono
   - difficulty as a coloured word (moss / ochre / brick) with the rating in
     mono
   - a status mark and a bookmark
4. Pagination as underlined numbers. Skeleton rows are oat bars.
5. The empty state is a serif line with one link.

### 4.6 Solve (`/solve/:id`)
A working page: calm and dense. Detailed in section 5.2.

### 4.7 Contests, Workshop, Submissions, Bookmarks
- **Contests:**
  - upcoming rounds as a calendar-like hairline list: day and date in serif
    numerals, platform in mono, countdown in mono, a "Remind me" link
  - custom contests as ivory cards
- **Workshop:** custom problems as hairline rows; "New problem" is the clay
  button.
- **Submissions and Bookmarks:**
  - hairline tables: verdict words in meaning colours, mono times and
    languages
  - filters as underlined tabs

### 4.8 Nexus (`/nexus`, `pages/NexusPage.tsx`): complete restructure, "The Atlas"

Turn the radial Rift Trees into **an engraved star chart of computer science**,
in the spirit of vintage celestial atlases:
- fine ink linework
- serif labels for named stars
- dashed boundaries between regions
- parchment tones

Every subject is a **constellation**; every node is a **star**.

1. **Header:**
   - kicker "The Atlas"
   - serif title "Your sky"
   - a lead line, e.g. "Every idea you've mastered is a star you've lit."
   - figures: stars lit, constellations started, mastery %
2. **The chart** (the page's hero, on canvas, not inside a card):
   - **Grid:** concentric hairline rings like declination circles, with mono
     tick labels at the edge (Bit → ∞ Overflow as ring names).
   - **Regions:** subject groups as **regions separated by dashed hairline
     boundaries**, their names set in spaced small caps along the arc (label
     style, ink-2). No rainbow arcs.
   - **Stars:**
     - locked: hollow hairline circles
     - in progress: clay-outlined
     - mastered: solid ink with a tiny canvas "spark" cross; dark mode inverts
       this
   - **Size means importance:** star size reflects the node's weight (lessons
     plus problems).
   - **Constellation lines:** prerequisite edges as fine hairlines. On hover
     or focus, the **path from the centre (you) to that star draws in clay**
     over 600ms.
   - **Centre:** your avatar in a small hairline ring with your level in mono.
   - **Camera:** pan and zoom on drag and wheel or pinch, with a "Recentre"
     tool button. Zooming fades in node names in serif italic.
   - **Unlocking:** a newly unlocked star "ignites" once (a hairline ring
     expanding and fading) the first time you see it.
3. **Side panel** (an ivory sheet at the right; a bottom sheet on phones):
   - star name in serif, constellation in label style
   - mastery as a hairline bar with "4 of 7 lessons · 12 of 20 problems"
   - text links "Read · Practise · Prerequisites"
   - prerequisites as a hairline list, each linking to its star
4. **Legend:** a tiny engraved key in the corner (hollow, outlined, solid)
   with mono captions.
5. **List view** (default on phones, a tab on desktop):
   - constellations as serif headings
   - stars as hairline rows with mastery bars
   - search filters both views
6. Keep every current feature: per-user mastery cache, rank zones, subject
   pages and links into lessons and practice.

Performance: draw the chart in SVG with one transform for pan and zoom. Above
roughly 1,500 elements, draw stars in a canvas layer and keep SVG for labels
and the hover path.

### 4.9 GATE (`/gate` and its subpages): "The Exam Hall"
- **GATE home:**
  - kicker "The Exam Hall · GATE CSE", serif title "Your exam desk", lead
  - countdown to the exam date as big serif numerals
  - a manilla spread for "Today's plan" with the clay "Start practising"
  - four count-up figures with sparklines: attempted, accuracy, review due,
    papers done
  - subject mastery as **small multiples**: one tiny bar per subject with
    serif names
  - weak topics as a sentence list
- **Sub-navigation:** an underlined tab row, scrollable on phones.
- **Practice, Daily, Review, Tests, PYQ browsing:** the question card in
  section 5.1.
- **Analytics:** journal charts (2.6).
- **Syllabus:** a book-style contents page with a check per topic.
- **Planner:** a week as hairline columns.
- **Notebook:** ivory index cards.
- **Leaderboard:** a hairline table with the top three in serif numerals.
- **CBT exam console** (`gate/cbt/CbtConsole.tsx`, `GateCbtPage.tsx`):
  - keep its function and layout faithful to the real GATE console, because
    students build muscle memory
  - restyle only: ivory panels, hairlines and Geist
  - the question palette's state colours stay the official ones (answered /
    not answered / marked / not visited), tuned to sit on paper
  - no serif in the console chrome; question text may use the serif

### 4.10 Profile (`/profile`, `/u/:username`, `pages/ProfilePage.tsx`): complete restructure

**A scientist's notebook cover and colophon.** A visitor should understand who
this person is, what they work on and how steadily, in thirty seconds.

1. **Masthead** (canvas, no banner image):
   - **Portrait:** the avatar in a 1px hairline frame with 12px padding on
     ivory, like a mounted photograph.
   - **Name and handle:** name in serif display; mono handle; a rank seal
     (`RankGlyph` as an ink seal) with "Level 3 · Kilobyte".
   - **Bio:** serif italic, max 2 lines; joined date in mono.
   - **Actions:** "Share · Edit profile · Follow" as text links. Edit is the
     clay button only on your own profile.
   - **Following line:** "12 following · 30 followers · 4 friends" in Geist
     with mono numbers.
2. **The colophon strip:**
   - a single hairline-ruled row of facts in label + serif-figure pairs: XP,
     solved, streak (best), GATE accuracy, contest rating, tests taken
   - each figure counts up once and carries a 30-day sparkline
3. **Practice calendar:**
   - a full-year contribution grid in oat → clay deep squares at a **fixed
     size**, so it causes no layout shift
   - month labels in mono, a "Less ··· More" key, and a serif sentence: "Most
     active on Sundays. Longest streak 21 days."
   - a steady streak is the thing to celebrate here
4. **Craft:**
   - Problems by difficulty as **three small multiples** (Easy / Medium /
     Hard), each a hairline bar with the count
   - top languages as a hairline list with mono shares and a thin bar
   - topic mastery as small multiples: tiny radial gauges in ink, or bars on
     phones
5. **The shelf** (achievements):
   - badges as **embossed paper seals** in a row with serif names
   - earned seals are ink with a clay rim; locked ones are debossed and muted
   - "View all" links to Achievements
6. **The Bridge:** linked judge accounts (Codeforces, AtCoder, LeetCode) as
   hairline rows: platform, handle in mono, rating, verified mark, last import.
7. **Field notes:** posts and replies (tabs underlined: Overview · Posts ·
   Replies · Media · Achievements) in the social reading style (4.11).
8. **Public view (`/u/:username`):** the same layout without private numbers.
   Add `Person` / `ProfilePage` structured data in the page head.
9. **Share:** creates an image card in the journal style: parchment, serif
   name, colophon figures and a calendar strip.

### 4.11 Analytics, Achievements, Social
- **Analytics:**
  - a serif headline sentence summarising the week
  - charts as **small multiples** in a grid of ivory cards, with serif titles
    and direct labels
  - "Weakness analysis" as a sentence list with links
- **Achievements:**
  - badges as embossed seals, grouped by room
  - earning plays a 600ms stamp animation, once
  - locked badges show the rule to earn them in serif italic
- **Social:**
  - one reading column
  - posts as ivory cards: author in Geist, body in serif, code in mono blocks,
    reactions as quiet counts
  - trending is a hairline list in the margin
  - the composer is an ivory sheet with a serif placeholder ("Share what you
    learned today…")

### 4.12 Settings, Appearance, Admin
- **Settings:**
  - a book-style two-column layout: serif section names, sticky on the left;
    forms on the right
  - hairline separators between groups
- **Appearance (`/theme`):**
  - Field Journal first and marked "Default"
  - its preview card shows the real journal look (serif title, clay
    bottom-radius button)
  - the live preview panel shows a lesson figure with a mini step player
  - every existing style keeps working
- **Admin:** functional; restyle through the kit only. Keep "Preview the
  landing page".

### 4.13 Not found, errors, loading
- **404:** serif "This page wandered off the map.", with a binary search that
  looks for the page and doesn't find it (cells fade out one half at a time),
  and "Back to Today".
- **Error boundary:** a serif apology, the error id in mono, and Retry.
- **Loading:** a 2px ink route-progress line; skeletons as oat bars.

### 4.14 Landing, sign-in, coming soon (done)
Already in this look. Once `journal.css` exists, switch them to it so they stay
identical. They are the reference; don't change how they look.

---

## 5. Every question surface matches

Questions are where students spend most of their time. Every kind of question
uses **one shared question design**:
- GATE PYQs in practice, daily, review, tests and notes
- lesson "check yourself" questions
- Nexus node questions
- coding problems

Build it once (for example `components/question/` with `QuestionCard`,
`OptionRow`, `AnswerReveal`, `SolutionBlock`) and use it everywhere.

### 5.1 The question card (MCQ, MSQ, NAT)

Files to bring onto it:
- `gate/QuestionView.tsx`
- `gate/solution/GateSolution.tsx`
- `gate/notes/render/PracticeEmbed.tsx`
- `gate/insights/ui.tsx`
- `pages/gate/*` (Practice, Daily, Review, Tests)
- `learn/ui/QuestionCard.tsx`
- `learn/ui/PracticePage.tsx`
- `learn/ui/Blocks.tsx`
- `components/nexus/NodeExtras.tsx`
- the questions in `learn/system-design/components/SystemNotesReader.tsx`

**Card:**
- **Masthead line, in mono:** "GATE CSE 2019 · Q 34 · 2 marks · MCQ" (or "DSA
  · Arrays · Check yourself"), with subject and topic as text links and a
  bookmark at the right.
- **Question text:** in serif at 1.2rem, maths in KaTeX, figures framed by
  hairlines with a figure caption, code in an ivory mono block.
- **Options** as **hairline rows** with a letter (A–D in mono inside a 28px
  hairline circle) and the option text in serif. Hover gives an oat fill;
  selected gives an ink border on the circle and an ink letter. MSQ uses square
  markers.
- **NAT:** a single journal input with mono digits, an inline unit and range
  hint in caption style.
- **Action row:** the clay "Check" button, plus tertiary "Skip" and "Show
  solution". The timer is in mono at the right when timed.

**After checking** (follow good feedback practice: show what you chose, whether
it's right, and the next step; move focus to the result; never colour alone):
- The correct row gets a moss left hairline, a moss ✓ and the word
  "Correct".
- A wrong choice gets a brick left hairline, ✕ and "Your answer".
- A one-line serif verdict appears above the solution, e.g. "Not quite. The
  answer is C." It is focused and announced to screen readers.
- **Solution block:**
  - "Solution" kicker, serif steps numbered in roman italic, maths centred
  - "Why the others are wrong" as a hairline list
  - linked notes lesson and figure, the source paper credit in caption style
  - **if a notes animation exists for the idea, embed its manilla figure** so
    the student can watch the idea, not just read it
  - the solution is worth reading even when right, so show "Read the
    reasoning" open by default on wrong answers and folded on right ones
- **Stats line:** "62% of students chose C" (only where real data exists) as
  a thin oat bar per option with mono percentages.
- **Next:** a large serif "Next question →" link, with a review-queue note in
  mono ("Back in 3 days").

**Review queue:**
- Cards slide back into a stack showing their next due date in mono.
- The day's count is a serif figure that counts down as you finish.

### 5.2 Coding problems: statement, editor, judge

Files:
- `pages/SolvePage.tsx`
- `components/solve/*`:
  - `ProblemPanel.tsx`, `statement.css`, `StatementMedia.tsx`
  - `CodeEditor.tsx`, `LanguagePicker.tsx`
  - `ResultsPanel.tsx`, `VerdictBanner.tsx`, `TestcaseDeck.tsx`
  - `SolutionTab.tsx`, `AnalysisPanel.tsx`, `CoachPanel.tsx`, `AiTestsPanel.tsx`
  - `ThinkingPad.tsx`, `TranslateBar.tsx`, `Arena.tsx`, `workspace/*`
- the Learn problem editorials

**Statement panel** (left):
- **Masthead in mono:** "Codeforces 1850G · Rating 1700 · 2 s · 256 MB", with
  tags as text links and the bookmark at the right.
- **Title:** in serif display. Statement prose in serif. Input / Output /
  Notes as small-caps label headings.
- **Examples:** paired ivory mono blocks, "Input" and "Output" side by side on
  wide screens, each with a copy button.
- **Images:** saved statement images framed by hairlines with captions.
- **Credit:** the source and licence credit (e.g. the open dataset) in caption
  style at the end.
- **Tabs:** Statement · Editorial · Solutions · Submissions · Coach, underlined.

**Editor** (right):
- **Monaco theme** generated from the journal palette for light and dark:
  canvas or ivory background, a hairline gutter, mono numbers in muted, the
  current line in oat, selection in oat 60%, journal syntax colours, and a
  clay-deep cursor.
- **Toolbar:** language picker, font size, layout and fullscreen as tool
  buttons, Run (outline) and **Submit (clay, the one primary)**.

**Test cases** (`TestcaseDeck`):
- tabs "Case 1 · Case 2 · Custom" underlined
- input and expected output in mono blocks

**Judging:**
- each test ticks from a hairline circle to a moss ✓ or brick ✕ **one by one**
  as results stream
- times and memory in mono
- the first failing case opens automatically with a three-column diff
  (input · expected · yours), with differences marked by a clay underline

**Verdict banner:**
- "Accepted" in serif, in moss, with runtime and memory in mono and the
  paper-slip celebration the first time
- other verdicts in brick with one serif line of advice
- verdict words are always shown, never colour alone

**Editorial and solutions:**
- the reader style from 4.4: `## Intuition`, `## Approach`, `## Complexity`,
  `## Why it works` and `## Pitfalls` as serif headings
- a figure spread when a viz exists
- solutions in all five languages as underlined tabs

**Coach, analysis, AI tests, thinking pad:** ivory sheets with hairline rows,
in a serif conversation style for coach messages.

**Phone:** tabs switch between Problem · Code · Results. Submit stays visible.

### 5.3 Everywhere else a question appears

Nexus node panels, notes practice embeds, the Hub's "Today's three", and GATE
daily all render the same `QuestionCard`. A question must look the same
wherever it is seen.

---

## 6. Themes

- Field Journal is **the** house style and the default.
- Keep all existing styles working.
- **Don't add new styles in this rollout:** the owner will add more later.
  Make adding one easy:
  - everything reads semantic tokens
  - style-specific rules stay in `styles.css` under `[data-style]`
  - write a short "Adding a style" section in `docs/ui/premium.md`: palette
    entry, style entry, CSS rules, preview, contrast check, migration rules

---

## 7. Animation catalogue

Each animation teaches or shows real state. Build them on the shared step
player or the viz engine; no ad-hoc timers.

| Where | Animation | What it explains |
|---|---|---|
| Home spread | the current lesson's figure playing | where you left off |
| Home ledger | figures count up; ladder fills to your level; sparklines draw left to right | your progress |
| Home week | seven day columns grow; today ticks clay | your rhythm |
| Learn spread | subject's signature figure (sorting for DSA, gates for Digital Logic, Venn for Discrete Maths) | what the subject feels like |
| Reader | figures autoplay on view; scroll-synced steps | the idea itself |
| Reader outline | clay tick slides along "On this page" | where you are |
| Question card | correct row draws its moss hairline; solution unfolds | the answer and why |
| Review queue | cards slide back into the stack with their next date | spaced repetition |
| Solve | tests tick one by one; first failure opens its diff | which tests passed |
| GATE home | countdown numerals roll over at midnight | time to the exam |
| Nexus | path from you to the hovered star draws in clay; new stars ignite once | how ideas connect |
| Profile | calendar fills week by week on first view; seals stamp | steady work |
| Achievements | seal stamps in once | the moment of earning |
| 404 | binary search fails to find the page | a joke that teaches |

All of them stop under reduced motion, pause off-screen, and use at most one
timer per component.

---

## 8. Accessibility and performance

- **axe:** 0 violations on every touched page, light and dark.
- **Keyboard:**
  - every control reachable, with a visible clay-deep focus ring
  - tabs are `role="tablist"` with arrow keys
  - option rows are a radio group (MCQ) or checkboxes (MSQ)
  - after checking an answer, focus moves to the verdict
- **Contrast:**
  - text 4.5:1 (3:1 at 24px and up)
  - muted text on manilla uses `#5c5b55` in light and `#aaa79e` in dark
  - "not yet" text uses `#87857e` in light and `#75736c` in dark
- **Phone:** 360px wide, no horizontal scroll, 44px touch targets.
- **Fonts:** preload Newsreader opsz and use `font-display: swap`. No new
  families.
- **No layout shift:** reserve heights for narration lines, the calendar and
  figures.
- **Bundle:** no new heavy dependencies. Nexus stays SVG (with canvas for many
  stars); no star-map library is needed.

---

## 9. Phases (one pull request each)

1. **Foundation:**
   - parchment palette, `journal` style, `styles/journal.css`
   - default plus migration v4 with tests
   - the UI kit
   - app shell: topbar, **dock skin (3.1)**, command palette
2. **Home:** the full restructure in 4.1, plus the Learn and Subject pages.
3. **Questions:** the shared question card and the GATE question surfaces
   (Practice, Daily, Review, Tests, PYQ browsing), lesson checks and Nexus node
   questions (section 5.1).
4. **The reader:** lessons and GATE notes, the viz engine's colours and player,
   sidenotes, scroll-sync, and the notes index and subject pages.
5. **Coding:** Problems list, Solve (statement, Monaco theme, judging,
   verdicts, editorials), Contests, Workshop, Submissions and Bookmarks
   (sections 4.5–4.7 and 5.2).
6. **Nexus:** the star chart (4.8).
7. **Profile and the Ledger:** Profile (4.10), Analytics, Achievements and
   Social.
8. **GATE home and the remaining pages:** GATE home and subpages (CBT restyle
   only), Settings, Appearance, Admin, 404, errors and loading.
9. **Polish sweep:**
   - every route in light, dark and on a phone; fix anything that doesn't
     match
   - update `docs/ui/premium.md` (house style, plus "Adding a style")
   - update the Design section of `AGENTS.md` to name Field Journal as the
     house style

**Every PR must:**
- pass `npm test`
- pass `cd client && npx tsc -b && npx oxlint src && npx vite build`, clean
- show 0 axe violations on the touched routes, in both modes
- include screenshots for each page:
  - desktop light, desktop dark and phone
  - side by side with the landing page
- confirm `/hive` is unchanged
- confirm the dock still magnifies, hides and opens More
- explain in the description what moved where, so nothing is lost

Test on the demo server:
- run `PORT=3300 node scripts/hive-demo.js`
- log in as owner / owner123
- the landing page is at `/?preview`

---

## 10. Pitfalls already learned

- **CSS layers:** unlayered CSS beats Tailwind utilities. Wrap journal CSS in
  `@layer components`, as `landing.css` does.
- **Clay contrast:** clay text fails on paper. Use ink text with a clay
  underline, or a clay fill with ink text.
- **Palette format:** palette OKLCH strings are `"L C H"` without `oklch()`.
- **Hit areas:** small targets need 24px hit areas (the style dots on sign-in
  needed it).
- **Landing redirect:** signed-in users are sent from `/` to `/hub`. Use
  `/?preview` to see the landing page.
- **Reduced motion:** keep `MotionConfig reducedMotion="user"` at the root, and
  test every autoplaying element with reduced motion in Playwright.
- **Glass effects:** the dock's glass layer is a sibling element on purpose
  (a backdrop filter clips the backdrop of everything inside it). Swap its
  class; don't restructure the dock.

---

## 11. Definition of done

- Every non-Hive page and every question surface uses the journal system and
  has the structure above.
- Home, Nexus and Profile are rebuilt as described.
- The dock works exactly as before, in a paper skin.
- Field Journal is the default for new and untouched accounts.
- All checks in section 9 pass.
- Hive is unchanged.
- The owner has seen screenshots of every page and said yes.

---

## 12. Research this brief draws on

- Distill's article layout: one body column, outset figures, margin
  sidenotes, hover footnotes ([guide](https://distill.pub/guide)).
- Explorable explanations: the active-reader idea and design patterns
  ([Bret Victor](https://worrydream.com/ExplorableExplanations/),
  [Nicky Case](https://blog.ncase.me/explorable-explanations),
  [Red Blob Games workshop notes](https://redblobgames.com/x/1436-workshop/structure.html),
  [Distill on interactive articles](https://distill.pub/2020/communicating-with-interactive-articles/)).
  Scroll-synced figures and text come from these.
- Tufte: sparklines as word-sized charts, small multiples instead of busy
  charts, direct labels
  ([notes](https://www.antoinebuteau.com/lessons-from-edward-tufte.md),
  [tiny data visualisations](https://engineered.at/articles/tiny-data-visualizations)).
- Engraved star charts: fine linework, serif star names, dashed boundaries
  ([d3-celestial](https://github.com/ofrohn/d3-celestial),
  [Observable star map](https://observablehq.com/notebook-kit/ex/d3/star-map),
  [art of the star map](https://www.centauri-dreams.org/2025/03/18/deep-space-and-the-art-of-the-map/)).
- Answer feedback: focus moves to feedback, colour is always paired with words
  or symbols, explanations are worth reading even when right
  ([Brilliant's methodology](https://brilliant.org/practice/guides/trust-and-methodology/),
  [quiz feedback UX](https://screensdesign.com/articles/mobile-quiz-wrong-answer-feedback-ux/)).
- Profiles: the activity grid as proof of steady work, fixed sizing to avoid
  layout shift, `Person`/`ProfilePage` structured data
  ([portfolio write-up](https://dev.to/ankurz/how-i-built-an-aesthetic-developer-portfolio-with-a-pixel-perfect-github-graph-3ng),
  [2026 profile guide](https://www.unilink.us/blog/how-to-grow-github-profile-2026)).
