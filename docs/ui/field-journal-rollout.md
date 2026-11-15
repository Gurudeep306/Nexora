# Field Journal: take the whole site into the new look

> **What this is.** A brief for the agent (or team of agents) that rolls the
> landing page's "field journal" design out to every page of NexoraGuru except
> Hive. It covers the design system, how to build it on the existing theme
> engine, the planned layout of every page, the animations, six new styles for
> the Appearance page, and how to check and ship the work.
> Read `AGENTS.md` first. This brief adds to it and does not replace it.

---

## 0. The owner's words, and the bar

> "I loved this theme so I decided to keep this theme in the entire website…
> restructure the website a bit to look more good especially the home page and
> every page… make notes with this theme… notes animations would look super
> crazy… add few themes in the theme section that look even more beautiful…
> leave Hive for now."

The bar is the live landing page (`client/src/pages/LandingPage.tsx`) and
sign-in page (`client/src/pages/AuthPage.tsx`). Every page should feel like
it was printed in the same journal: warm paper, an editorial serif, hairlines,
quiet confidence, and animations that teach. When a page you build sits next to
the landing page, nobody should be able to tell which was built first.

**Quality first.** Finish one area completely (built, checked, screenshotted in
light, dark and on a phone) before starting the next. Never ship half a page.

---

## 1. Rules that are never broken (from AGENTS.md, repeated because they matter)

- Work on a branch. One pull request per phase (section 8). Never commit to
  `main`. Merging to `main` deploys the live site, and only the owner says
  "merge".
- No force-pushes. No secrets. No model names in commits, PR titles or code.
- Never skip or weaken a test to get CI green.
- **Hive is out of scope.** Don't touch `client/src/hive/**`, `--hv-*` tokens or
  the Hive kit. Hive must look exactly as it does today, so check `/hive` after
  every phase.
- Design tokens only, no raw colours in components (the palette and style CSS
  are where colour values live).
- Light and dark must both work. Respect `prefers-reduced-motion`. No
  horizontal scroll at 360px.
- No gradient text, no glow blobs, no neon shadows, no rainbow bars, no
  hexagons. The journal look has **no shadows at all**: depth comes from paper
  colour and hairlines.
- Animations explain an idea. They are never decoration only.
- Copy tells the truth. Don't invent numbers, users or testimonials.

---

## 2. The design system

### 2.1 Colour

Two modes, one warm family. The site's palette engine stores **OKLCH as
`"L C H"` strings** (see `client/src/theme/palettes.ts`), so the values are
given both ways.

**Light (the default)**

| Role | Hex | OKLCH | Palette slot |
|---|---|---|---|
| Canvas (page) | `#f0eee6` | `0.948 0.011 95` | `bg[0]` |
| Card / ivory | `#faf9f5` | `0.982 0.005 95` | `bg[1]` |
| Raised / feature spread (manilla) | `#f5e3c7` | `0.923 0.042 79` | `bg[2]` (use sparingly; see 2.4) |
| Hover / oat | `#e3dacc` | `0.892 0.021 79` | `bg[3]` |
| Fill | `#d9d4c7` | `0.865 0.017 88` | `bg[4]` |
| Ink (primary text) | `#141413` | `0.191 0.002 107` | `fg[0]` |
| Ink-2 (secondary) | `#3d3d3a` | `0.359 0.005 107` | `fg[1]` |
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
| Clay deep (hover) | `#e08a6c` | `0.717 0.114 40` |
| Inverse footer | `#0f0f0e` | |

**State colours.** Keep them muted and earthy so they sit on paper:
- success: moss, light `0.52 0.11 145`, dark `0.74 0.12 145`
- warning: ochre, light `0.58 0.12 75`, dark `0.80 0.12 80`
- danger: brick, light `0.52 0.16 30`, dark `0.72 0.15 30`
- info: slate blue, light `0.50 0.08 245`, dark `0.76 0.08 245`

Check each against canvas and card at 4.5:1 for text.

**Syntax colours** (code blocks and editors): ink-based and low chroma.
- keyword: clay deep
- string: moss
- number: ochre
- function: ink
- type: slate blue
- comment: muted italic

**What colour means:**
- **Clay** is only for the one main action on a screen, the current item, and
  the "answer" moment of an animation (the found cell, the reached node).
- Clay is **never body text**: as text on parchment it is about 2.9:1 and fails.
  Links are ink with a clay or stone underline.
- State colours are only for state.
- Icons default to the quiet container: neutral tile, grey glyph.

### 2.2 Type

| Use | Face | Notes |
|---|---|---|
| Display headlines, page titles, lesson titles, big numbers | **Newsreader Variable** (serif, opsz) | weight 400; tracking -0.015 to -0.02em; `text-wrap: balance` |
| Declarative hero only (landing, Hub greeting) | Geist Variable 700 | the one place a heavy sans headline appears |
| Body prose (lessons, notes, editorials, descriptions) | Newsreader | 1.125–1.25rem, line-height 1.45–1.6, max 68ch |
| UI chrome (buttons, nav, tabs, inputs, table heads, chips) | Geist Variable | 13–15px, weight 500 |
| Labels / kickers | Geist 600 uppercase | 0.75rem, tracking 0.08em, muted |
| Code, numbers in data, pointers | JetBrains Mono Variable | tabular figures |
| Maths (KaTeX) | keep KaTeX fonts | size them to match the serif x-height |

All three fonts are already dependencies (`@fontsource-variable/newsreader`,
`geist`, `jetbrains-mono`). Load Newsreader's `opsz.css` once in the app entry
when the journal style is active.

**Scale** (desktop / phone):
- display: 4.25 / 2.5rem
- h1: 3.25 / 2.25rem
- h2: 2.25 / 1.75rem
- h3 (sans): 1.25rem
- body: 1.25 / 1.125rem
- small: 1rem
- caption: 0.8125rem

### 2.3 Shape, space and lines

- Cards: 24px radius (16px on small items), 1px hairline, **no shadow**.
- Inputs: 12px radius, hairline border, canvas fill on a card (card fill on
  the canvas); focus is an ink border plus a 3px clay ring at 22%.
- **Primary button (clay):** padding 12px 24px, radius `0 0 8px 8px` (square on
  top, rounded only at the bottom), ink text. This is the signature; keep it.
- Secondary button: ivory with a hairline border and the same bottom-only radius.
- Tertiary: text with an underline.
- Outline / tool buttons: 12px radius.
- Tabs: text with a 2px ink underline that slides (no pills). Segmented
  controls become underlined tab rows.
- Dividers: 1px hairline rules.
- Lists are hairline-separated rows, not boxed cards.
- Space: 8px base; sections 96–128px apart on desktop and 64–96px on phone;
  max content width 1280px; reading column 68ch.
- Page header: a muted uppercase kicker, a serif title, and one serif line of
  lead. Nothing else.

### 2.4 Surfaces

- **Canvas** is every page background.
- **Ivory card** holds things you act on.
- **Manilla feature spread** is for **one** hero moment per page at most: the
  live animation, the "continue" card, the featured lesson.
- **Oat panel** groups secondary sets (stats, filters).
- **Inverse (ink) footer** appears only on public pages.

### 2.5 Motion

- One curve everywhere: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Durations: 300ms for UI, 600–800ms for reveals, 450ms for tab underlines.
- **Page enter:** content rises 24px and fades in over 0.7s.
- **Reveal on scroll:** once only, using `whileInView` like `Reveal` in
  `LandingPage.tsx`.
- **Numbers count up** once when seen (`CountUp` in
  `components/landing/motifs.tsx`).
- **Teaching animations** use the shared step player
  (`components/landing/player.tsx` and `useStepper.ts`):
  - they play on their own
  - they pause on hover and focus
  - they have step buttons and a "Step i of n" counter
  - a serif narration line sits under every frame, with `aria-live="polite"`
- Under reduced motion: no autoplay, no marquee, no rises, final numbers shown,
  and animations wait for the step buttons.
- No springs that overshoot, no bounce, no confetti except one moment (first
  accepted solution) that is already in the product. Restyle it as falling
  paper slips in palette colours.

### 2.6 Icons, charts, images

- Icons: lucide-style line icons through `Icon`, 1.5px stroke, ink or muted.
  No filled colour tiles.
- **Charts** (Analytics, Profile, GATE analytics) use ink and muted lines, clay
  for the one series that matters, hairline grids, and serif axis titles.
  Follow the `dataviz` method:
  - sequential: oat → clay deep
  - categorical: ink, clay, moss, slate, ochre, plum `0.45 0.08 340`
- Avatars and figures sit on ivory with a hairline frame.

### 2.7 Writing voice

- Short, warm, specific.
- Kickers are nouns ("The atlas", "Today", "Your ledger").
- Leads are one serif sentence that says what the page is *for*.
- Use the "rooms" names from the landing page where they help people find their
  way:
  - The Library: Learn and notes
  - The Workshop: Problems, Solve and Contests
  - The Exam Hall: GATE
  - The Atlas: Nexus
  - The Ledger: Analytics, Achievements and Profile
  - The Bridge: linked accounts

  They are kickers, not replacements for the plain page names in navigation.

---

## 3. How to build it (architecture)

Build on the existing theme engine; don't fork it.

1. **Palette.**
   - Add `parchment` to `client/src/theme/palettes.ts`, category `signature`,
     with both `light` and `dark` `ModeTokens` filled from 2.1.
   - Its blurb: "Warm paper, ink and a clay pencil."
2. **Style.**
   - Add `journal` to `STYLES` in `client/src/theme/styles.ts`:
     - name: "Field Journal"
     - tagline: "Warm paper, set like a journal"
     - bundle: `{ theme: 'parchment', font: 'geist', codeFont: 'jetbrains', radius: 'rounded', cardStyle: 'flat', pattern: 'none' }`
     - `displayFont: 'newsreader'`
   - Write its rules in `client/src/theme/styles.css` under
     `[data-style='journal']`:
     - serif `h1`/`h2`/`.sx-h`
     - label treatment
     - no shadows on cards (override every `shadow-*` the kit uses)
     - `[data-ui='button'][data-variant='primary']` → clay with bottom-only
       radius
     - secondary → ivory hairline
     - tabs → underline
     - `::selection` in oat
     - focus ring in clay deep
3. **One source of truth.**
   - Move the generic `ed-*` utility classes from
     `components/landing/landing.css` into `client/src/styles/journal.css`
     (display, heading, body, label, card, feature, oat, rule, link, button,
     icon-btn, figure, serif numeral).
   - Scope it `:is(.lp, .ed, [data-style='journal'])`.
   - Make the `--ed-*` variables **read from the semantic tokens**
     (`--ed-canvas: var(--color-bg-app)` and so on) inside the app, while the
     landing and auth pages keep their fixed parchment values. Then a user who
     picks another palette still gets a coherent journal layout in that palette.
   - Keep `landing.css` for landing-only pieces (marquee, specimens, ladder).
4. **Default for everyone.**
   - Make `journal` the default style in the admin default-style setting
     (`components/admin/DefaultStylePanel.tsx` and the server status it
     reads), and the fallback in `theme/look.ts`.
   - Add a look migration to **v4**: anyone whose look is still the untouched
     v3 default (Studio, midnight) moves to Field Journal. Anyone who chose a
     style keeps it.
   - Extend `tests/theme*.test.js` with the migration cases (as was done for v3).
5. **Shared UI kit first** (`client/src/components/ui/`). Restyle these so
   every page inherits the look before any page is touched:
   - Button, Card, Badge, Tabs (underline), Input, Select, SearchCombobox and
     `styles/search.css` (hairline field, serif placeholder optional), Table
     (hairline rows, sans header in label style), Modal (ivory sheet, 24px,
     hairline, scrim of ink at 30%), Toast (ink slip at bottom-left), Tooltip
     (ink on ivory), Progress (2px ink line, clay at completion), StatCard
     (serif number, label kicker), EmptyState (serif line and one tertiary
     link), PageHeader (kicker / serif title / lead), BackButton, Kbd,
     AnimatedNumber (count up on the shared curve).
6. **App shell** (`components/layout/`):
   - **Topbar.** Flat canvas with a hairline that appears on scroll (like the
     landing nav). Logo mark and the serif "NexoraGuru" wordmark. The
     breadcrumb becomes `Room · Page` in label style. Search uses the journal
     field.
   - **Dock** (`Deck.tsx`, `MobileTabBar.tsx`). An ivory strip with a hairline,
     not a floating glass pill: grey glyphs, ink for the current page, and a
     2px clay tick under it. On phones it's a bottom tab bar on canvas.
   - **Command palette.** Ivory sheet, serif group titles, mono shortcuts.
   - **User menu and notifications.** Ivory sheets, hairline rows.
7. **Viz engine** (`client/src/viz/`, `viz.css`). Map its colours to the
   journal roles so every lesson animation matches the landing specimens:
   - cells and nodes: ivory with a hairline
   - visited: ink fill, canvas text
   - current / answer: clay
   - discarded: 35% opacity
   - pointers: mono labels
   - edges: hairline, then line-strong, then clay when active

   Give `VizPlayer` the landing player's controls (step buttons, segmented
   progress, "Step i of n", narration line in serif).

---

## 4. Page-by-page structure

For each page: what it is for, then the structure top to bottom. Keep every
existing feature and route; restructure and restyle, don't remove. If a
feature seems to have no place, put it in the page's secondary area and say
so in the PR.

### 4.1 Hub (`/hub`, `pages/HubPage.tsx`): "Today"
It answers *what should I do next?* in five seconds.
1. **Greeting.**
   - Kicker: the date, e.g. "Sunday, 15 November".
   - Serif headline: "Good evening, {name}."
   - One lead line that names the single best next step, worked out from real
     data (continue lesson / review due / daily challenge).
   - The clay button does that step.
2. **Manilla spread: "Continue".**
   - The lesson or problem in progress, with its live mini-animation (the
     current lesson's first viz frame, via the step player) and a progress
     hairline.
   - If there's nothing in progress, a "Start here" path.
3. **Your ledger.**
   - Four serif figures that count up, on hairline-topped columns: XP and
     level, streak, solved, rank.
   - Under them, the level ladder from the landing page, with your bar filling
     to your real level.
4. **Today's list.**
   - Hairline rows: daily challenges (with "resets in"), GATE daily question,
     review queue due.
   - Each row is a sentence, not a widget.
5. **The rooms.**
   - Six ivory cards (Library, Workshop, Exam Hall, Atlas, Ledger, Bridge),
     each with one live line ("3 lessons left in Arrays", "12 due for
     review").
   - This replaces the 15-tile "Explore NexoraGuru" grid. Everything from that
     grid stays reachable inside the rooms or the command palette.
6. **Recent activity:** a hairline timeline in serif, with mono times.

### 4.2 Learn (`/learn`, `pages/LearnPage.tsx`): "The Library"
1. Header: kicker "The Library", serif title "Learn", one lead line.
2. **Ready to study:**
   - one manilla spread for the subject you're in (title, a live first-frame
     animation, next lesson, the clay "Continue" button)
   - ivory cards for the other ready subjects, each with three text links
     (Lessons · Skill tree · Practice) instead of three boxed buttons
3. **All subjects:**
   - group headings in serif with counts in mono
   - subjects as hairline rows (name, short line, status label: Ready /
     Being written) in a two-column list on desktop
   - the search field filters it live
4. "More ways to learn": a quiet hairline list at the end.

### 4.3 Subject page (`/learn/:subject`, `pages/SubjectPage.tsx`)
A table of contents, like a book.
1. Header: kicker is the group, serif title, lead line, then progress as a
   hairline with "12 of 38 lessons".
2. A sticky chapter index on the left (desktop).
3. Chapters as numbered serif headings with roman numerals in italic, lessons
   as hairline rows with reading time in mono, and a check in moss when done.
4. Skill tree and practice links in the header as text links.
5. "In the Nexus" becomes a small atlas card that links to the subject's tree.

### 4.4 Lesson and notes reader (DSA topics, `/learn/dsa/:topic`, GATE notes `/gate/notes/:subject/:lesson`, `styles/reader.css`)
**The showpiece. Spend the most care here.** "Notes animations would look
super crazy" is the owner's dream; make it true.
- **Layout:**
  - lessons rail on the left (collapses to the mini strip)
  - a centred reading column of 68ch on canvas
  - the live "On this page" outline on the right, in label style, with the
    current section marked by a clay tick
- **Title block:**
  - kicker "Chapter III · Arrays"
  - serif display title
  - a serif dek (the one-line summary)
  - a mono meta line: "12 min · 1 animation · 5 questions"
- **Prose:** Newsreader 1.2rem/1.6. Drop the first paragraph's first line
  into small caps. Pull-quotes and key definitions are set as **margin notes**
  (a hairline-topped aside in the right margin on wide screens, inline on
  phones) in italic serif.
- **Animations (viz blocks):**
  - Each is a **manilla figure spread** that breaks out wider than the text
    column (up to 960px), with "Figure 3 · Binary search on a sorted array"
    as a label caption, the shared step player, and the serif narration line.
  - They **play when scrolled into view** and pause when out of view.
  - Every frame's narration is written to explain *why*, as on the landing
    page.
- **Tables:** hairline rules only, a mono header row in label style, and
  numbers right-aligned in tabular figures.
- **Maths:** display equations centred with generous space and an optional
  equation number in mono at the right.
- **Code:**
  - an ivory block with a hairline, the mono font and journal syntax colours
  - the active line highlighted in oat when tied to a viz step
  - language tabs underlined
- **Callouts:**
  - "Pitfall" uses a brick hairline at the left edge
  - "Why it works" uses moss
  - "Check yourself" uses clay
  - each has a label kicker, serif body and no filled backgrounds
- **Past-question embeds (PYQ):**
  - an ivory card with "GATE 2019 · 2 marks" in mono
  - options as hairline rows; reveal shows the answer row in moss and the
    worked solution in serif
- **End of lesson:**
  - a hairline rule, then "Next: …" as a big serif link
  - progress dots
  - the "Check yourself" set
- **Notes index** (`/gate/notes`):
  - serif title "Notes", lead, search
  - "Ready to read" as ivory cards with a live first-frame thumbnail of each
    subject's signature animation
  - "Being written" as muted hairline rows
- **Notes subject page:** same pattern as the subject page in 4.3.

### 4.5 Problems (`/problems`, `pages/ProblemsPage.tsx`): "The Workshop"
1. Header: kicker "The Workshop", serif "Problems", lead; "Surprise me"
   becomes a tertiary underlined link.
2. Search (journal field) and filters as an underlined filter row: platform,
   difficulty, status, tags, sets, rating. Active filters show as ink chips
   with an ×.
3. Results as a **hairline table**:
   - serif problem title
   - platform and id in mono
   - difficulty as a word coloured by meaning (moss / ochre / brick), not a
     pill
   - a status mark
   - a bookmark
4. Empty state: a serif line and one link.
5. Infinite scroll keeps working; skeleton rows are hairline bars that
   shimmer in oat (static under reduced motion).

### 4.6 Solve (`/solve/:id`, `pages/SolvePage.tsx`)
A working page; calm and dense.
- **Statement panel:** canvas, serif statement, mono examples in ivory blocks,
  figures framed by hairlines, the source credit in caption style.
- **Editor panel:** the Monaco theme generated from the journal syntax tokens
  (light and dark), with a hairline gutter.
- **Toolbar:** language select, Run (outline), and Submit (clay, the one
  primary).
- **Verdicts:**
  - accepted: moss serif "Accepted", with a paper-slip confetti once
  - wrong: brick
  - test details: hairline rows with mono timings
- Keep every current feature (AI help, custom tests, fullscreen, layout
  switch). Fix the "Not found" state into a proper journal empty state with a
  way back.

### 4.7 Contests (`/contests`) and Workshop (`/workshop`)
- **Contests:**
  - upcoming rounds as a **calendar-like hairline list**, with day/date in
    serif numerals, the platform in mono, a countdown in mono, and a "Remind
    me" link
  - NexoraGuru custom contests are ivory cards
- **Workshop:** custom problems as hairline rows; the "New problem" action is
  the clay button.

### 4.8 Nexus (`/nexus`, `pages/NexusPage.tsx`): "The Atlas"
- Keep the radial Rift Trees, but **draw them like an engraved star chart on
  paper**:
  - hairline ink rings and edges
  - subject arcs labelled in spaced small caps (label style) instead of
    rainbow-coloured arcs
  - mastered nodes ink, in-progress nodes clay-outlined, locked nodes hollow
    hairline
  - on hover, the path back to the centre is drawn in clay
- **Side panel** (ivory sheet): node name in serif, mastery as a hairline
  bar, "Lessons · Problems" as text links.
- **Phone:** a list view by subject is the default, with the chart one tap
  away.

### 4.9 GATE (`/gate` and its subpages): "The Exam Hall"
- **GATE home** ("Command centre"):
  - kicker "The Exam Hall · GATE CSE", serif title "Your exam desk", lead
  - countdown to the exam date as big serif numerals
  - a manilla spread for "Today's plan" (from the planner), with the clay
    "Start practising" button
  - four count-up figures (attempted, accuracy, review due, papers done)
  - subject mastery as hairline bars with subject names in serif
  - weak topics as a sentence list
- **Sub-navigation:** an underlined tab row, scrollable on phones.
- **Practice / Daily / Review:**
  - the question card is ivory, the question in serif and options as hairline
    rows
  - the answer reveal uses the moss / brick meaning colours
  - the review queue shows "due today" as a serif count
- **Tests and Analytics:** hairline tables, journal charts (2.6).
- **Syllabus:** a book-style table of contents with a check per topic.
- **Planner:** a week view as hairline columns, with day names in label style.
- **Notebook:** an ivory "index card" grid.
- **Leaderboard:** a hairline ranking table with the top three as serif
  numerals.
- **CBT exam console** (`GateCbtPage.tsx`): **keep its function and layout
  faithful to the real GATE console**, because students practise muscle
  memory. Only restyle it: ivory panels, hairlines, Geist, the question palette
  colours kept exactly as GATE uses them (answered / not answered / marked)
  but on paper tones. Don't serif-ify the console.

### 4.10 Analytics, Achievements and Profile: "The Ledger"
- **Analytics:**
  - one serif headline sentence that summarises the week ("You solved 14
    problems this week, 4 more than last.")
  - charts in a 2-column grid of ivory cards, journal chart styling, serif
    chart titles
  - "Weakness analysis" as a sentence list with links
- **Achievements:**
  - badges as **embossed paper seals**: a circular hairline seal, an ink glyph,
    and clay once earned; locked ones are debossed (muted)
  - earning plays a 600ms stamp animation, once
  - grouped by room, with group titles in serif
- **Profile:**
  - a header with the avatar framed in hairline, serif name, mono handle, a bio
    in serif italic, and text-link actions (Share · Edit profile)
  - stats as serif figures
  - the activity heatmap in oat → clay deep
  - tabs underlined
  - linked accounts ("The Bridge") as hairline rows with verified marks

### 4.11 Social (`/social`) and posts
- The feed is a **single reading column**: posts as ivory cards with the
  author in Geist, the body in serif, code in mono blocks, and reactions as
  quiet text counts.
- Trending is a hairline list in the right margin.
- The composer is an ivory sheet with a serif placeholder ("Share what you
  learned today…").

### 4.12 Submissions and Bookmarks
Hairline tables with verdict words in meaning colours and mono times. Filters
are underlined tabs.

### 4.13 Settings, Appearance and Admin
- **Settings:** a book-style two-column layout, with section names in serif on
  the left (sticky) and forms on the right. Hairline separators between
  groups.
- **Appearance** (`/theme`, `ThemeCentrePage.tsx`):
  - put **Field Journal first and marked "Default"**
  - the style previews must render the real journal tokens (serif title, clay
    bottom-radius button)
  - add the six new styles from section 5
  - the live preview panel shows a lesson figure (a mini step player), not
    only a dashboard
- **Admin:** functional; restyle via the kit only. The "Preview the landing
  page" link stays.

### 4.14 Not found, errors, loading
- **404:** serif "This page wandered off the map.", a binary search animation
  "looking" for it and not finding it (cells fade out one half at a time), and
  "Back to Today" as a link.
- **Error boundary:** a serif apology, the error id in mono, and Retry.
- **Route progress:** a 2px ink line at the top.
- **Skeletons:** oat bars.

### 4.15 Landing, sign-in, coming soon (done)
Already in this look. After the shared `journal.css` exists, switch them to it
so they stay identical. They are the reference: don't change how they look.

---

## 5. Six new styles for the Appearance page

Each is a full **style** (palette in `palettes.ts` with light **and** dark, a
bundle in `styles.ts`, and rules in `styles.css`), built on the journal's
structure (serif display, hairlines, no shadows, one accent) so every page
layout from section 4 works unchanged. The structure is the journal's; the
mood changes. Give each a real preview card on the Appearance page. Check
contrast for every token pair (4.5:1 text, 3:1 large text and UI).

1. **Herbarium**: pressed leaves in a botanist's book.
   - light: sage paper `#eef0e6`, ivory `#f8f9f3`, moss ink `#1f2a1f`,
     accent fern `#4f7a4a`
   - dark: forest night `#151a15`, accent `#8fbf86`
   - The serif headings are italic.
2. **Atlas**: a cartographer's chart.
   - light: chart cream `#f2efe4`, ink navy `#1b2433`, accent sea blue
     `#2f6f9f`, contour hairlines
   - dark: deep sea `#0f1720`, accent `#7fb3d9`
   - Optional page pattern: faint contour lines.
3. **Darkroom**: photographs developing under a safelight. **Dark-first.**
   - dark: near-black `#121010`, prints in `#ece6df`, accent safelight red
     `#d0503c`
   - light: fixer-tray grey `#ecebe8` with the same red
   - Images and figures get a thin white border like prints.
4. **Letterpress**: cotton paper and deep ink.
   - light: cotton `#f6f4ef`, navy ink `#16213a`, accent vermilion `#d4462a`
   - dark: ink-stained `#141823`, accent `#f07a5c`
   - Headings use slight negative tracking.
   - Buttons look debossed: an inset hairline, still no shadow.
5. **Observatory**: a star chart at night. **Dark-first.**
   - dark: night navy `#0d1324`, chart cream lines `#e8e2cf`, accent brass
     `#c9a14a`
   - light: day chart `#f1efe7` with a brass accent
   - Fits the Nexus star-chart treatment perfectly.
6. **Riso**: a two-ink risograph zine.
   - light: off-white `#f4f1ea`, fluorescent pink `#e8457a` and blue `#2b59c3`
     as the only two inks
   - dark: `#16151a` with the same inks lifted
   - Headings may be offset by 1px in the second ink (a printed
     misregistration) as a **static** effect. No animation, and turn it off
     under reduced motion.

Each style needs a one-sentence `about`, a tagline, and a preview that shows a
lesson figure. Keep the existing 15 styles working. Field Journal is the
default; the others are choices.

---

## 6. Animation catalogue (where the "crazy" goes)

Each item must teach something or show real state. Build them on the shared
step player or the viz engine, never with ad-hoc timers.

| Where | Animation | What it explains |
|---|---|---|
| Hub "Continue" | the current lesson's first frames playing | where you left off |
| Hub ledger | ladder fills to your real level; figures count up | your progress |
| Learn spread | subject's signature viz (sorting for DSA, gates for Digital Logic, set Venn for Discrete Maths) | what the subject feels like |
| Lessons/notes | every viz block as a manilla figure, autoplay on view | the idea itself |
| Notes outline | clay tick slides along "On this page" | where you are |
| Problems | verdict row "types" in after a submit (mono, 20ms per char) | the judge's answer |
| Solve | test cases tick from hairline to moss / brick one by one | which tests passed |
| GATE home | countdown numerals roll over at midnight | time to exam |
| GATE review | cards slide back into the queue with their next date | spaced repetition |
| Nexus | path from centre to hovered node draws in clay | how ideas connect |
| Achievements | seal stamps in, once | the moment of earning |
| 404 | binary search fails to find the page | a joke that teaches |

All of them stop under reduced motion. All of them pause when off-screen.
None of them runs more than one timer per component.

---

## 7. Accessibility and performance

- axe: **0 violations** on every page touched, in light and dark.
- Keyboard: every control reachable; visible clay-deep focus ring; tabs use
  `role="tablist"` with arrow keys.
- Text contrast 4.5:1 (3:1 for 24px+). Muted text on manilla needs the darker
  muted (`#5c5b55` light / `#aaa79e` dark), as on the landing page.
- Phone: 360px wide, no horizontal scroll, 44px touch targets, the dock as a
  bottom bar.
- Fonts: preload Newsreader opsz, use `font-display: swap`, and don't add new
  font families for the journal.
- No layout shift from animations (reserve heights, e.g. `min-h-[3lh]` for
  narration).
- Bundle: no new heavy dependencies. Motion, the step player and the viz
  engine already exist.

---

## 8. Phases (one pull request each)

1. **Foundation**:
   - parchment palette, `journal` style, `styles/journal.css`
   - default plus look migration v4 (with tests)
   - UI kit restyle, app shell (topbar, dock, palette)
   - after this PR, every page already looks mostly right
2. **Today and the Library**: Hub, Learn, Subject page.
3. **The reader**: lesson and notes reader, viz engine colours and player,
   notes index and subject pages. (The owner's favourite; take the time.)
4. **The Workshop**: Problems, Solve (with Monaco journal theme), Contests,
   Workshop, Submissions, Bookmarks.
5. **The Exam Hall**: GATE home and every GATE subpage, CBT console (restyle
   only).
6. **The Atlas and the Ledger**: Nexus star chart, Analytics, Achievements
   seals, Profile, Social.
7. **Settings, Appearance and the six new styles**, plus 404, errors and
   loading.
8. **Polish sweep**: every route in light, dark and on a phone; fix anything
   that doesn't match; update `docs/ui/premium.md` and `AGENTS.md` (Design
   section) to describe Field Journal as the house style.

**For every PR:**
- `npm test` passes
- `cd client && npx tsc -b && npx oxlint src && npx vite build` is clean
- axe shows 0 violations on the touched routes in both modes
- include screenshots: desktop light, desktop dark and phone for each page,
  side by side with the landing page for comparison
- confirm `/hive` is visually unchanged
- the description says what moved where, so nothing is lost

Use the demo server to check: `PORT=3300 node scripts/hive-demo.js`, log in as
owner / owner123.

## 9. Pitfalls already learned

- Unlayered CSS beats Tailwind utilities. Wrap the journal CSS in
  `@layer components`, as `landing.css` does.
- Clay text fails contrast on paper. Use ink text with clay underline or clay
  fills with ink text.
- OKLCH strings in palettes are `"L C H"` without `oklch()`.
- The landing page's unlit tagline words needed explicit colours to pass axe
  (`#87857e` light, `#75736c` dark); reuse those for "not yet" states.
- Style dots and other small targets need 24px hit areas.
- Signed-in users are redirected from `/` to `/hub`. Use `/?preview` to see
  the landing page.
- Keep `MotionConfig reducedMotion="user"` at the app root, and check every
  autoplaying element with the reduced-motion emulation in Playwright.

## 10. Definition of done

Every non-Hive page:
- uses the journal system
- has its section 4 structure
- passes the checks in section 8
- looks like it belongs next to the landing page

Field Journal is the default for new and untouched accounts. Six new styles
appear on the Appearance page. Hive is unchanged. The owner has seen
screenshots of every page and said yes.
