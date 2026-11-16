/*
  Builds the generated theme stylesheet (virtual:nexora-theme.css) from the
  palette and font data. Called by vite.config.ts at dev/build time.

    [data-palette="x"][data-mode="dark|light"]  raw palette tokens
    [data-accent="y"][data-mode="dark|light"]   accent overrides
    @font-face "<Font> Fallback"                metric-matched local fallbacks
    [data-font="z"] / [data-code-font="w"]       family stacks
    [data-solution-font="s"]                    --font-solution + --solution-* tuning

  The selectors work on any element, so previews can scope a theme.
*/
import { ACCENTS, DEFAULT_PALETTE, INKS, PALETTES, type ModeTokens } from './palettes.ts'
import { CODE_FONTS, HEADING_FACES, READ_FACES, SOLUTION_FONTS, UI_FONTS, codeFontStack, faceStack, solutionFontStack, uiFontStacks, type FallbackMetrics } from './fonts.ts'

const ok = (s: string) => `oklch(${s})`

function modeVars(t: ModeTokens): string {
  const v: [string, string][] = [
    ['--oklch-bg-0', t.bg[0]],
    ['--oklch-bg-1', t.bg[1]],
    ['--oklch-bg-2', t.bg[2]],
    ['--oklch-bg-3', t.bg[3]],
    ['--oklch-bg-4', t.bg[4]],
    ['--oklch-fg-0', t.fg[0]],
    ['--oklch-fg-1', t.fg[1]],
    ['--oklch-fg-2', t.fg[2]],
    ['--oklch-border', t.border],
    ['--oklch-accent-0', t.accent],
    ['--oklch-accent-1', t.accent2],
    ['--on-accent', t.onAccent],
    ['--oklch-success', t.success],
    ['--oklch-warning', t.warning],
    ['--oklch-danger', t.danger],
    ['--oklch-info', t.info],
    ['--syn-keyword', t.syntax.keyword],
    ['--syn-string', t.syntax.string],
    ['--syn-number', t.syntax.number],
    ['--syn-function', t.syntax.function],
    ['--syn-type', t.syntax.type],
    ['--syn-comment', t.syntax.comment],
  ]
  return v.map(([k, val]) => `${k}:${ok(val)}`).join(';')
}

function fallbackFace(name: string, m: FallbackMetrics): string {
  return `@font-face{font-family:'${name}';src:local('${m.local}');size-adjust:${m.size}%;ascent-override:${m.ascent}%;descent-override:${m.descent}%;line-gap-override:${m.lineGap}%}`
}

export function buildThemeCss(): string {
  const out: string[] = ['/* Generated from src/theme/palettes.ts and fonts.ts by vite.config.ts — do not edit. */']

  for (const p of PALETTES) {
    for (const mode of ['dark', 'light'] as const) {
      const t = p[mode]
      if (!t) continue
      // The default theme's dark mode doubles as the no-JS fallback on :root.
      const sel = `[data-palette="${p.id}"][data-mode="${mode}"]`
      out.push(`${p.id === DEFAULT_PALETTE && mode === 'dark' ? `:root,${sel}` : sel}{${modeVars(t)}}`)
    }
  }

  for (const a of ACCENTS) {
    for (const mode of ['dark', 'light'] as const) {
      const t = a[mode]
      out.push(`[data-accent="${a.id}"][data-mode="${mode}"]{--oklch-accent-0:${ok(t.accent)};--oklch-accent-1:${ok(t.accent2)};--on-accent:${ok(t.onAccent)}}`)
    }
  }
  // Personal choices on top of a theme (Appearance → Make it yours). Two
  // attributes each, so they win over a theme's own [data-style] rules.
  for (const ink of INKS) {
    for (const mode of ['dark', 'light'] as const) {
      const [a, b, c] = ink[mode]
      out.push(`[data-ink="${ink.id}"][data-mode="${mode}"]{--oklch-fg-0:${ok(a)};--oklch-fg-1:${ok(b)};--oklch-fg-2:${ok(c)}}`)
    }
  }

  for (const f of UI_FONTS) {
    out.push(fallbackFace(`${f.label} Fallback`, f.fallback))
    if (f.display) out.push(fallbackFace(`${f.label} Display Fallback`, f.display.fallback))
    const s = uiFontStacks(f)
    const tracking = f.headingTracking ? `;--heading-tracking:${f.headingTracking}` : ''
    out.push(`[data-font="${f.id}"]{--font-body:${s.body};--font-display:${s.display}${tracking}}`)
  }
  for (const f of UI_FONTS) {
    out.push(`[data-ui-font="${f.id}"][data-mode]{--font-body:${uiFontStacks(f).body}}`)
  }
  // A chosen heading face sets the big page titles (the hero) too.
  for (const f of HEADING_FACES) {
    const t = f.tracking ?? '-0.015em'
    out.push(`[data-heading-font="${f.id}"][data-mode]{--kit-display:${faceStack(f.id)};--kit-heading-tracking:${t};--kit-hero:${faceStack(f.id)};--kit-hero-weight:${f.kind === 'sans' ? 700 : 560};--kit-hero-tracking:${t}}`)
  }
  for (const f of READ_FACES) out.push(`[data-read-font="${f.id}"][data-mode]{--kit-read:${faceStack(f.id)}}`)
  for (const f of CODE_FONTS) {
    out.push(fallbackFace(`${f.label} Fallback`, f.fallback))
    out.push(`[data-code-font="${f.id}"]{--font-mono:${codeFontStack(f)};--code-ligatures:${f.ligatures ? 'normal' : 'none'}}`)
  }
  for (const f of SOLUTION_FONTS) {
    if (f.fallback) out.push(fallbackFace(`${f.label} Fallback`, f.fallback))
    const vars = [
      `--font-solution:${solutionFontStack(f)}`,
      `--solution-scale:${f.scale}`,
      `--solution-leading:${f.leading}`,
      `--solution-tracking:${f.tracking}`,
      `--solution-weight:${f.weight}`,
      `--solution-variation:${f.variation ?? 'normal'}`,
    ]
    out.push(`[data-solution-font="${f.id}"]{${vars.join(';')}}`)
  }
  return out.join('\n') + '\n'
}
