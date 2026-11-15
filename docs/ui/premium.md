# NexoraGuru premium look (2026)

This records the site-wide pass that removed the "cartoon" look. Every change was checked with screenshots of every main page (dark, light and phone) before and after.

## What the research said

- Linear's 2024 redesign raised contrast and went back to a neutral, timeless look. It used fewer and smaller icons, softer borders and no extra visual treatments. Its colours are generated in a perceptual colour space (LCH), which is how our palettes already work (OKLCH).
- shadcn/ui and Radix use neutral surfaces, borders that are a light alpha of the text colour, about 10 px radii, and one restrained accent.
- Designers widely read purple-to-blue gradients, gradient text and glow blobs as "default AI styling": decoration standing in for a colour system.
- Logo guidance: favour mass over outline, use one colour and high contrast, and make a separate version for 16 px.

## Decisions

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

## Migrations (nobody loses a choice)

- **Look v3:** saved looks that still carry the old defaults (soft icons, handwritten solutions) move to the new defaults once. Anything chosen after v3 is kept. Tested in `tests/theme-contrast.test.js`.
- **Dock v2:** older dock settings move to mono once. Choosing colour again sticks.
- **Avatars are unchanged.** The 16 illustrated avatars are each user's own choice. A neutral "initials" option would need a server change; it is listed below.

## Checks

- `npm test`: 385 passed. The typecheck and the build pass; oxlint shows 0 errors.
- axe (WCAG 2.0 and 2.1 AA): 0 violations in dark and light on Home, Learn, GATE, Problems, Profile, Achievements, Analytics, Settings, the landing page and sign-in. This pass also fixed faint light-mode labels, unnamed progress bars, a link with no underline, a scroll area keyboards couldn't reach, and a chart role.
- Back navigation was driven in Chromium:
  - a deep link goes up ("Back to GATE");
  - in-app navigation goes back step by step, with the right names;
  - Home has no back button;
  - a shared post link goes to Community.

## Not done (honest list)

- **An "initials" avatar option** (neutral monogram), to offer alongside the illustrated set.
- **Rank and level chips** (Bit, Byte…) and the Nexus subject colours keep their colours. They carry meaning (tier, subject), but could be quieter.
- **The System Design course animations** still use bright fixed colours inside their diagrams. The glows are gone; the palettes could move onto the theme tokens.
