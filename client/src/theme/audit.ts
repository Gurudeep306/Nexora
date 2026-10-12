/*
  The contrast rules every theme must meet, in both modes it offers.
  Used by tests/theme-contrast.test.js (the quality gate) — and handy in a
  REPL while tuning a palette.

  Ratios are WCAG 2.x: 4.5 for body-size text, 3 for large/tertiary text and
  meaningful UI, 1.5 for hairline borders that only separate surfaces.
*/
import { contrast, formatOklch, mixOklab } from './color.ts'
import type { ModeTokens } from './palettes.ts'

export interface AuditResult {
  rule: string
  ratio: number
  min: number
  ok: boolean
}

/** Colours the CSS layer derives from a mode's tokens (mirrors palettes.css generation). */
export function derived(t: ModeTokens) {
  return {
    /** Input outlines, toggles, the stronger divider (--color-border-strong). */
    borderStrong: formatOklch(mixOklab(t.border, t.fg[2], 0.55)),
    /** Text selection / highlighted row (--color-selection). */
    selection: formatOklch(mixOklab(t.accent, t.bg[1], 0.2)),
    /** Code block background (--color-code-bg). */
    codeBg: t.bg[2],
  }
}

export function auditMode(t: ModeTokens, accentOverride?: Pick<ModeTokens, 'accent' | 'accent2' | 'onAccent'>): AuditResult[] {
  const m: ModeTokens = accentOverride ? { ...t, ...accentOverride } : t
  const d = derived(m)
  const out: AuditResult[] = []
  const check = (rule: string, a: string, b: string, min: number) => {
    const ratio = contrast(a, b)
    out.push({ rule, ratio: Math.round(ratio * 100) / 100, min, ok: ratio >= min })
  }
  const [bg0, bg1, bg2, bg3] = m.bg
  const [fg0, fg1, fg2] = m.fg

  if (!accentOverride) {
    // Text hierarchy on every surface it sits on.
    check('text on app background', fg0, bg0, 4.5)
    check('text on surface', fg0, bg1, 4.5)
    check('text on raised surface', fg0, bg2, 4.5)
    check('text on hover surface', fg0, bg3, 4.5)
    check('secondary text on app background', fg1, bg0, 4.5)
    check('secondary text on surface', fg1, bg1, 4.5)
    check('secondary text on raised surface', fg1, bg2, 4.5)
    check('muted text on app background', fg2, bg0, 3)
    check('muted text on surface', fg2, bg1, 3)
    check('muted text on raised surface', fg2, bg2, 3)

    // Status colours are used as text (badges, verdicts, inline errors).
    for (const k of ['success', 'warning', 'danger', 'info'] as const) {
      check(`${k} on surface`, m[k], bg1, 4.5)
      check(`${k} on app background`, m[k], bg0, 4.5)
    }

    // Separators and controls.
    check('border on surface', m.border, bg1, 1.5)
    check('strong border on surface', d.borderStrong, bg1, 2.2)

    // Code blocks.
    for (const k of ['keyword', 'string', 'number', 'function', 'type'] as const) {
      check(`syntax ${k} on code background`, m.syntax[k], d.codeBg, 4.5)
    }
    check('syntax comment on code background', m.syntax.comment, d.codeBg, 3)
  }

  // Accent: links and active labels, filled buttons, focus ring, selection.
  check('accent text on app background', m.accent, bg0, 4.5)
  check('accent text on surface', m.accent, bg1, 4.5)
  check('accent text on raised surface', m.accent, bg2, 4.5)
  check('label on accent button', m.onAccent, m.accent, 4.5)
  check('label on accent hover', m.onAccent, m.accent2, 4.5)
  check('secondary accent on surface', m.accent2, bg1, 3)
  check('text on selection', fg0, d.selection, 4.5)
  return out
}
