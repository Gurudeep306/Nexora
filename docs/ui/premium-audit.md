# Premium polish — UI audit

Branch `ui-premium` (main + admin-system). Audited on the local dev build at
1440×900 and 375×812 in three themes: **Midnight** (dark, default),
**Porcelain** (light) and **Synthwave** (dark, vivid — the worst case for glows).
Pages: hub, top-bar search (focused / typing), command palette (empty, query,
no match), problems list + loading state, solve page, learn + a DSA topic,
GATE home + practice, contests, analytics, settings, 404, notifications,
user menu, shortcuts modal, toasts, mobile tab bar.

Screenshots: `…/scratchpad/ui-premium/before/` (`<scene>__<theme>-<mode>__<d|m>.png`),
after the fix in `…/scratchpad/ui-premium/after/` with the same names.

Out of scope (owned elsewhere / just redesigned): social + profile pages, the
admin panel, the login page and the marketing landing page. The global token
changes below still reach them, but no page-specific code there was touched.

## Findings

Severity: **H** = visibly cheap / broken, **M** = inconsistent, **L** = nit.

### Glossy, glowing and shimmering effects
| # | Where | What | Sev |
|---|---|---|---|
| 1 | Mobile tab bar | Centre search button is a glossy accent gradient tile with a coloured drop-glow; active-tab indicator has a neon `0 0 10px` glow | H |
| 2 | Command palette (+ every text field) | Global `:focus-visible` paints a 1px + 4px accent box-shadow **and forces `border-radius`** on the focused element, so the borderless palette input shows a big blue box inside the dialog; round buttons turn square when focused | H |
| 3 | Top-bar search | Double focus treatment: input border+4px halo plus a 3px wrapper halo | M |
| 4 | `PageHeader` | Every page title is gradient-clipped text (`text-gradient`) — reads as a lavender sweep on mobile/Synthwave | H |
| 5 | `Button` primary/accent | Coloured 20px accent glow under every primary button; `accent` variant is a gradient + glow ("Surprise me") | M |
| 6 | `glow-box` / `glow-box-accent` (23 files) | Neon ring + 28px coloured glow on selected/hover states (e.g. Analytics "Next Rift" glows green) | H |
| 7 | `--color-border-glow` (14 files) | Border is 45% accent → neon outlines on panels and chips | M |
| 8 | `glow-text`, `glow-accent-text` | Text-shadow glows on numbers and headings | M |
| 9 | `animate-pulse-glow` | Live dots/badges breathe at full opacity swing | L |
| 10 | `.skeleton` | Shimmer sweep (moving gradient) — the main loading state of search and pages | H |
| 11 | `text-shimmer` | Animated shimmering text utility (unused today, would shimmer if used) | L |
| 12 | `RouteProgress` | Gradient bar with a hard-coded violet glow `rgb(167 139 250)` — wrong colour on every non-violet theme | H |
| 13 | AI floating button | Accent radial "gloss" fill + 30px coloured glow; grows on hover | M |
| 14 | `EmptyState` | Blurred accent blob behind the icon (404, inbox, charts) | M |
| 15 | Icon badges (solid / gradient containers) | Strong top-light gloss (`--ib-sheen` 0.7 / 1) | L |
| 16 | Workspace (solve) | Split handles and drop zones glow with hard-coded `rgb(139 92 246)` | M |
| 17 | AI Problem Finder card | Two big blurred colour blobs in the corners | L |
| 18 | `.sheen`, `.beam-border`, `.aurora` | Landing/login only — left as designed | — |

### Elevation, radii, borders
| # | Where | What | Sev |
|---|---|---|---|
| 19 | `--elev-2/3` (dark) | 40–72px shadows at 60–70% black: heavy, muddy on near-black themes | M |
| 20 | Modal, command palette | Hard-coded `rounded-2xl` instead of `--radius-sheet`; ignore the user's Sharp/Round setting | M |
| 21 | `Button` | `rounded-lg` instead of `--radius-control` → buttons and inputs have different corners | M |
| 22 | `Card interactive` | Lifts 2px and casts a coloured accent glow on hover | M |
| 23 | Palette / combobox | Borders at `border-border/10` (almost invisible) next to full-strength borders elsewhere | L |

### Hover, motion
| # | Where | What | Sev |
|---|---|---|---|
| 24 | Global `button:hover` | **Every** button scales to 1.015 on hover — text shimmers/blurs, rows jiggle | H |
| 25 | `ghost` button | Hover tints accent (text and background) — loud for toolbar icons | L |
| 26 | Modal, palette, search panel, dock, admin kit | Springs with damping ratio ≈0.8 → a small overshoot on everyday UI; sliding `layoutId` active-row bars spring on every arrow key | M |
| 27 | Motion scale | Five unrelated easings (`ease-smooth`, `ease-spring`, `ease-spring-bounce`, ad-hoc `[0.22,1,0.36,1]`), durations 100–700ms | M |

### Typography and spacing
| # | Where | What | Sev |
|---|---|---|---|
| 28 | Base `p { mb-4 }` | Leaks a 16px gap under group headers (palette/search “PROBLEMS” header floats away from its rows), empty-state titles, modal text | H |
| 29 | Solve page statement | Scraped `div.section-title` picks up the app's marketing `.section-title` (36px bold) → giant "Input"/"Output" headings | H |
| 30 | `PageHeader` subtitle | Inherits the 16px `p` margin → uneven gap above page content | L |
| 31 | `AnimatedNumber` | Proportional digits: counters wobble width while ticking | L |

### Search experience
| # | What | Sev |
|---|---|---|
| 32 | Top-bar results panel: footer ("Open the full command palette ⌘K") is clipped by the panel's max-height | H |
| 33 | No recent searches; focusing shows a long static page list | M |
| 34 | Matched text is not highlighted | M |
| 35 | No-match state is just "Search all problems for …" — no message | M |
| 36 | Each keystroke shows a shimmer skeleton; identical queries refetch; topbar and palette fetch separately | M |
| 37 | Active row is marked by a springy sliding bar + accent-tinted icon box + arrow; heavy | L |

### Toasts
| # | What | Sev |
|---|---|---|
| 38 | Sonner close button sits half outside the top-left corner of each toast | M |
| 39 | Shadow is the heaviest elevation (`elev-3`) for a transient message | L |

## Fix plan (systemic)
1. **Tokens** (`index.css`): one motion scale (`--ease-standard`, `--ease-emphasized`, `--dur-fast/base/slow`; springs aliased to it), calmer elevation scale (`--elev-1…3`, lighter in dark), `--color-border-glow` reduced to a hairline tint, focus ring as an `outline` token (`--focus-ring`) that follows each element's own radius.
2. **Utilities** (`legacy.css`): `glow-box*` → hairline accent ring + neutral elevation; `glow-text` → none; `skeleton` → subtle opacity pulse; `text-shimmer` → static; `animate-pulse-glow` → gentle; `.statement-html .section-title` → statement subheading.
3. **Base**: drop the global hover scale (keep a 0.98 press), keep `p` margins but zero them inside the primitives that were leaking.
4. **Primitives**: Button (radius token, no glow, neutral ghost hover), Card (no lift/glow), PageHeader (solid title, rhythm), EmptyState (no blob), Modal/palette/combobox (radius + tween motion from `lib/motion.ts`), Toast (close button, elevation), AnimatedNumber (tabular), RouteProgress (token colour, no glow), Kbd.
5. **Search**: shared cached problem search, recent searches, highlighted matches, refined empty state, single focus ring, unclipped footer, calm active row with ⏎ hint.
6. **Chrome**: mobile tab bar search button flat, no glows; AI FAB flat surface; workspace glows tokenised.
