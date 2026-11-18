# NexoraGuru house style and themes

This is the reference for how NexoraGuru looks. Read it with `AGENTS.md`
(the rules) and `docs/ui/field-journal.md` (what each page was built as).

## The house style: Field Journal

Every page outside Hive is set like a printed journal:

- **Paper and ink.** Canvas, ivory cards, one manilla "spread" per page at
  most, oat for grouped panels. Depth comes from paper tone and hairlines,
  never shadows.
- **Type.** A serif for titles, prose and big figures; a sans for controls;
  mono for numbers, ids and times. Page headers are a muted uppercase kicker,
  a serif title and one serif lead line.
- **One clay action per screen.** The main button is clay with ink text,
  square on top and rounded at the bottom. Clay is never body text: links are
  ink with an underline.
- **Lists are hairline rows**, tabs and segmented choices are underlined
  words, charts are ink lines with the one series that matters in clay.
- **Animations teach or show real state.** Nothing decorative moves.
  Reduced motion shows final states.
- **The mark** ("One line", `components/brand/`) writes itself in the page
  loader, the boot screen, empty states and the 404 page.

The building blocks live in:

| Where | What |
|---|---|
| `client/src/styles/journal.css` | the `ed-*` classes (`ed-title`, `ed-lead`, `ed-label`, `ed-card`, `ed-feature`, `ed-btn-clay`, `ed-tabs`…) and the `--ed-*` roles |
| `client/src/theme/styles.css` | the kit's look: shared components (`data-ui` hooks), the shell, the dock and the reader, all under `[data-kit='journal']` |
| `client/src/theme/themes.css` | what makes each of the ten themes itself |
| `client/src/components/ui/` | the kit (`Button`, `Card`, `Tabs`, `PageHeader`, `EmptyState`, `LoadingBlock`…) with `data-ui` hooks |

## Ten themes

A theme is a whole design, not a colour. Each has its own palette in light and
dark, a heading face and a reading face, corners and button shapes, an icon
set, an original drawing behind the page and one beside page headers.

| Theme | Feel | Type | Drawing | For |
|---|---|---|---|---|
| Field Journal | parchment, clay | Newsreader, Geist | none | readers who like it calm (default) |
| Sakura | blush paper, plum ink; a lantern-lit garden at night | Fraunces (soft), Nunito | blossom petals | soft colours, gentle shapes |
| Arcade | arcade cabinet; pea-green handheld by day | Pixelify Sans, Space Grotesk | pixel stars, hearts, coins; notched corners | gamers, night owls |
| Greenhouse | sage, forest ink, terracotta | Young Serif, Literata, Figtree | fern fronds; leaf-shaped buttons | nature lovers |
| Observatory | navy night and brass; a star atlas by day | Cormorant, Literata, Hanken | constellations, orbit rings; engraved plates | stargazers |
| Blueprint | blueprint blue; blue ink on vellum by day | Martian Mono, Inter Tight | drafting grid, compass arcs, corner ticks | builders, engineers |
| Sketchbook | pencil on dot grid; chalk on a green board at night | Kalam, Lexend | pencil doodles of arrays, trees and arrows; hand-drawn edges, a highlighter under titles | doodlers, creative minds |
| Block Print | indigo, madder and marigold on cotton | Rozha One (also sets Hindi), Onest | buta and rosettes; a stitched rule inside cards | colour, craft and culture |
| Terminal | green phosphor; green-bar printer paper by day | everything in monospace | scan lines; a prompt before titles | coders who live in the shell |
| Clear | black and white, one strong accent | Atkinson Hyperlegible | none; two-pixel borders, underlined links, a thick focus ring | low vision, bright rooms, tired eyes |

On top of any theme a person can set the **text size**, the **code font** and
the **handwriting for GATE solutions**. Everything else belongs to the theme.

Hive wears the person's own look too, dressed as "the desk"
(`docs/ui/hive-desk.md`).

### How a theme is built

1. **Palette** (`theme/palettes.ts`): OKLCH `"L C H"` strings for both modes.
   `tests/theme-contrast.test.js` holds every theme to WCAG contrast in both
   modes (text 4.5:1, muted 3:1, accent and button labels 4.5:1, state and
   syntax colours, borders).
2. **Style entry** (`theme/styles.ts`): name, tagline, about, who it is for,
   `kit: 'journal'`, the bundle (palette, UI font, code font, radius, pattern,
   icon set and style) and the display and reading faces.
3. **Rules** (`theme/themes.css`, under `[data-style='id']`): set the kit
   variables and add only what the variables can't say:

   | Variable | What it sets |
   |---|---|
   | `--kit-display`, `--kit-read`, `--kit-read-size` | heading face, reading face and size |
   | `--kit-heading-weight`, `--kit-heading-tracking` | heading weight and tracking |
   | `--kit-hero`, `--kit-hero-weight`, `--kit-hero-tracking` | the big greeting line |
   | `--kit-card-radius(-sm)`, `--kit-control-radius` | corners |
   | `--kit-btn-radius`, `--kit-tool-radius` | the main button and tool buttons |
   | `--pattern-svg`, `--pattern-size`, `--pattern-ink` | the drawing behind the page (an SVG mask, so it takes the theme's ink) |
   | `--paper-image`, `--paper-size` | the paper itself (grid, dots, ruled bands) |
   | `--kit-mark` | the drawing beside page headers |

   Drawings fade out towards the middle of the page, so text never sits on
   them, and nothing animates.
4. **Fonts**: a new face goes in `fonts.ts` (interface faces) or
   `DISPLAY_FACES` in `styles.ts`, with a loader in `fontLoaders.ts`.
5. **Migration** (`theme/look.ts`): `LOOK_TABLES.v5` maps every retired style
   and palette to a theme. Accessibility palettes always land on Clear.

## Adding a theme

1. Add a palette with `light` and `dark` to `theme/palettes.ts`. Run
   `node --test tests/theme-contrast.test.js` and tune lightness until every
   rule passes.
2. Add the theme to `STYLES` in `theme/styles.ts` (with `kit: 'journal'`,
   `forWho`, a bundle that uses your palette, and a pattern id). Add the
   pattern id to `PATTERNS`.
3. Draw the pattern and the header drawing as SVG line work (black on
   transparent: it is used as a mask) and add a `[data-style='id']` block to
   `theme/themes.css` with the kit variables.
4. Make the theme's specimen look right on the Appearance page
   (`components/look/ThemeCard.tsx` reads the same variables).
5. Check the hub, a lesson, Problems, GATE, Profile, Admin and Nexus in light,
   dark and phone with `client/scripts/check-page.cjs` and axe: 0 violations,
   no sideways scroll. Check that `/hive` still renders Studio on Midnight.
6. Update the test expecting ten themes, and this table.

## History: the 2026 premium pass

### What the research said

- Linear's 2024 redesign raised contrast and went back to a neutral, timeless look. It used fewer and smaller icons, softer borders and no extra visual treatments. Its colours are generated in a perceptual colour space (LCH), which is how our palettes already work (OKLCH).
- shadcn/ui and Radix use neutral surfaces, borders that are a light alpha of the text colour, about 10 px radii, and one restrained accent.
- Designers widely read purple-to-blue gradients, gradient text and glow blobs as "default AI styling": decoration standing in for a colour system.
- Logo guidance: favour mass over outline, use one colour and high contrast, and make a separate version for 16 px.

### Decisions

| Area | Before | Now | Why |
|---|---|---|---|
| Logo | NG strokes in a blue→violet→teal gradient, with dots | A solid tile in the text colour with the NG cut out; the N alone at 16 px (favicon) | One colour reads at every size and on every ground, and follows the theme. Five options were rendered side by side at 16, 24, 40 and 88 px, in dark and light, before choosing. |
| Wordmark | "Guru" in gradient text | "Nexora" in the text ink, "Guru" one step quieter | Hierarchy from tone, not colour. |
| Brand ramp | `--nx-b1..3` and `--brand-1..3` were blue, violet and teal | All derived from the theme's accent | Every surface that still reads the ramp becomes one hue. |
| Default theme (Midnight) | Hover accent (`accent2`) was violet | The same blue hue, lighter or darker | Hover no longer changes colour family. |
| Landing and sign-in | Aurora blobs, gradient headline, glowing gradient button, travelling border beam | A faint hairline grid, a two-tone headline, a solid ink button, a plain raised card | Structure instead of light. |
| Icons | "Soft" tiles tinted by each item's hue | A new **Quiet** container (default): neutral tile, grey glyph; success, warning and error keep their colour | Colour means state. The other containers are still in the Theme Centre. |
| Dock | Rainbow app tiles | Monochrome glyphs (the existing mono option, now the default) | Users can switch back. |
| Glows | Blurred colour blobs behind cards, neon `shadow-[0_0_…]` in animations | Removed | Decoration only. |
| Progress bars | Two-colour gradients | The solid accent | One meaning, one colour. |
| GATE notes and solutions | A marker-pen handwriting font and sketched diagrams by default | A clean font and straight lines by default; handwriting is one switch away | Hand-drawn type reads as playful. |
| Profile cover | "Aurora" colour blobs by default | **Plain** (a surface with a hairline grid) by default | Users who chose a cover keep it. |
| Radii | 10 / 14 / 20 px | 8 / 12 / 16 px | Slightly tighter, more engineered. |
| Back button | A 3D keyboard-key button; labels could disagree with where it went; did nothing on two pages | A flat icon button; goes to the page you came from in this tab, else one level up; the label names the place | Predictable, honest navigation. |

### Migrations (nobody loses a choice)

- **Look v3:** saved looks that still carry the old defaults (soft icons, handwritten solutions) move to the new defaults once. Anything chosen after v3 is kept. Tested in `tests/theme-contrast.test.js`.
- **Dock v2:** older dock settings move to mono once. Choosing colour again sticks.
- **Avatars are unchanged.** The 16 illustrated avatars are each user's own choice. A neutral "initials" option would need a server change; it is listed below.

### Checks

- `npm test`: 385 passed. The typecheck and the build pass; oxlint shows 0 errors.
- axe (WCAG 2.0 and 2.1 AA): 0 violations in dark and light on Home, Learn, GATE, Problems, Profile, Achievements, Analytics, Settings, the landing page and sign-in. This pass also fixed faint light-mode labels, unnamed progress bars, a link with no underline, a scroll area keyboards couldn't reach, and a chart role.
- Back navigation was driven in Chromium:
  - a deep link goes up ("Back to GATE");
  - in-app navigation goes back step by step, with the right names;
  - Home has no back button;
  - a shared post link goes to Community.

### Not done (honest list)

- **An "initials" avatar option** (neutral monogram), to offer alongside the illustrated set.
- **Rank and level chips** (Bit, Byte…) and the Nexus subject colours keep their colours. They carry meaning (tier, subject), but could be quieter.
