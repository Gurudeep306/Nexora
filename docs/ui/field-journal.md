# Field Journal — the house style

Field Journal is the NexoraGuru house style and the default for everyone. It
carries the landing page's look into the app: warm paper, ink and one clay
pencil.

- **Paper:** parchment canvas, ivory cards, oat for grouped panels, manilla
  for the one featured spread on a page.
- **Type:** Newsreader (serif) for titles and prose, Geist for controls,
  JetBrains Mono for code and numbers.
- **Lines, not shadows:** elevation is tone plus a 1px hairline. No shadows,
  glows, blur or gradients.
- **One clay action per screen:** a clay fill with ink text, square at the top
  and rounded at the foot (`0 0 8px 8px`). Clay is never used for text on paper
  (it fails contrast); links are ink with an underline.
- **Motion:** `cubic-bezier(0.22, 1, 0.36, 1)`; everything honours
  reduced motion (`MotionConfig reducedMotion="user"` sits at the root).

## Where it lives

| Piece | File |
|---|---|
| Palette `parchment` (light and dark) | `client/src/theme/palettes.ts` |
| Style `journal` (default) | `client/src/theme/styles.ts` |
| Look migration v4 (untouched old default → journal) | `client/src/theme/look.ts`, tests in `tests/theme-contrast.test.js` |
| Editorial classes (`ed-*`) | `client/src/styles/journal.css` |
| Kit, shell and Dock skin | `client/src/theme/styles.css`, section "Field Journal" |
| Landing-only pieces | `client/src/components/landing/landing.css` |

## The editorial classes

`styles/journal.css` holds the shared classes: `ed-display-serif`,
`ed-display-sans`, `ed-title`, `ed-h2`, `ed-heading`, `ed-subheading`,
`ed-body`, `ed-lead`, `ed-ui`, `ed-caption`, `ed-label`, `ed-card`,
`ed-card-sm`, `ed-feature`, `ed-oat`, `ed-rows`, `ed-btn` with `ed-btn-clay`,
`ed-btn-ivory` and `ed-btn-outline`, `ed-icon-btn`, `ed-link`, `ed-figure`,
`ed-serif-numeral`, `ed-wordmark`, `ed-tabs` and `ed-tab`, and `ed-spark`.

They work in three scopes:

- `.lp` / `.ed`: the landing, sign-in and coming-soon pages, with fixed
  parchment values.
- Any `[data-style]` (inside the app): every `--ed-*` variable reads the
  semantic tokens, so a page built with these classes looks right in every
  style.
- `[data-style='journal'][data-palette='parchment']`: the exact clay
  (`#d97757`) and manilla.

The file sits in `@layer components`, so Tailwind utilities still win for
spacing.

## Hooks for styles

Kit components carry `data-ui` attributes, so a style can restyle them without
touching other styles:

- `button` (with `data-variant`)
- `card`, `card-title`
- `badge` (with `data-variant`)
- `tabs` (with `data-variant`), `tab`, `tab-ink` (the sliding underline, hidden
  unless a style draws it)
- `table`, `thead`
- `progress` (with `data-done`), `progress-bar`
- `page-header`, `eyebrow`, `page-title`, `page-lead`, `page-icon`
- `stat`, `stat-label`, `stat-value`
- `empty`, `empty-title`
- `scrim`, `sheet`, `sheet-title`, `group-title`
- `tooltip`, `kbd`, `rank`
- `topbar` (with `data-scrolled`), `crumb-section`

The Dock and the phone tab bar use these classes:

- Dock: `dock-glass`, `dock-dot`, `dock-divider`, `dock-more`, `dock-plate`,
  `dock-label`
- Phone tab bar: `tabbar`, `tabbar-tick`

## Hive

Since 2026-11 Hive wears the person's own look like every other page, dressed
as "the desk" for a work tool. `hiveLook` in `theme/look.ts` now returns the
look unchanged, and the first-paint script in `client/index.html` no longer
swaps it. See `docs/ui/hive-desk.md`.

## Checks

The Dock still magnifies, auto-hides and opens More in every style. To check
it, start the demo server:

```bash
PORT=3300 node scripts/hive-demo.js
```

Then run the check:

```bash
node client/scripts/check-dock.cjs
```
