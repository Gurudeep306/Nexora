/*
  Monaco follows the Theme Centre: an editor theme ('nexora-app') built from
  the active palette's tokens — syntax colours, surfaces, accent — in its
  light or dark mode, and the chosen code font.
*/
import { useCallback, useEffect, useMemo } from 'react'
import type { editor } from 'monaco-editor'
import { monaco } from '@/lib/monaco'
import { useTheme } from '@/context/ThemeContext'
import { oklchToHex } from './color'
import { CODE_FONTS, DEFAULT_CODE_FONT, codeFontStack } from './fonts'
import { modeTokens, type ModeTokens, type ThemeMode } from './palettes'

export const APP_EDITOR_THEME = 'nexora-app'

export function buildMonacoTheme(t: ModeTokens, mode: ThemeMode): editor.IStandaloneThemeData {
  const hex = (s: string) => oklchToHex(s)
  const bare = (s: string) => hex(s).slice(1)
  return {
    base: mode === 'dark' ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: bare(t.syntax.comment), fontStyle: 'italic' },
      { token: 'keyword', foreground: bare(t.syntax.keyword) },
      { token: 'string', foreground: bare(t.syntax.string) },
      { token: 'regexp', foreground: bare(t.syntax.string) },
      { token: 'number', foreground: bare(t.syntax.number) },
      { token: 'constant', foreground: bare(t.syntax.number) },
      { token: 'type', foreground: bare(t.syntax.type) },
      { token: 'function', foreground: bare(t.syntax.function) },
      { token: 'variable', foreground: bare(t.fg[0]) },
      { token: 'identifier', foreground: bare(t.fg[0]) },
      { token: 'delimiter', foreground: bare(t.fg[1]) },
    ],
    colors: {
      // Transparent, so the code sits on the pane rather than in a slab.
      'editor.background': '#00000000',
      'editorGutter.background': '#00000000',
      'editor.foreground': hex(t.fg[0]),
      'editorLineNumber.foreground': hex(t.fg[2]),
      'editorLineNumber.activeForeground': hex(t.accent),
      'editorCursor.foreground': hex(t.accent),
      'editor.selectionBackground': `${hex(t.accent)}40`,
      'editor.inactiveSelectionBackground': `${hex(t.accent)}22`,
      'editor.lineHighlightBackground': `${hex(t.bg[3])}66`,
      'editor.lineHighlightBorder': '#00000000',
      // Diffs: soft tints so syntax colours stay readable on changed lines (WCAG 1.4.3).
      'diffEditor.insertedLineBackground': `${hex(t.success)}14`,
      'diffEditor.insertedTextBackground': `${hex(t.success)}26`,
      'diffEditor.removedLineBackground': `${hex(t.danger)}12`,
      'diffEditor.removedTextBackground': `${hex(t.danger)}22`,
      'editorIndentGuide.background1': hex(t.border),
      'editorIndentGuide.activeBackground1': hex(t.fg[2]),
      'editorBracketMatch.border': `${hex(t.accent)}99`,
      'editorBracketMatch.background': `${hex(t.accent)}1a`,
      'editorWidget.background': hex(t.bg[2]),
      'editorWidget.border': hex(t.border),
      'editorSuggestWidget.background': hex(t.bg[2]),
      'editorSuggestWidget.border': hex(t.border),
      'editorSuggestWidget.foreground': hex(t.fg[0]),
      'editorSuggestWidget.selectedBackground': hex(t.bg[3]),
      'editorSuggestWidget.highlightForeground': hex(t.accent),
      'editorHoverWidget.background': hex(t.bg[2]),
      'editorHoverWidget.border': hex(t.border),
      'scrollbarSlider.background': `${hex(t.fg[2])}33`,
      'scrollbarSlider.hoverBackground': `${hex(t.fg[2])}55`,
      'minimap.background': '#00000000',
    },
  }
}

/**
 * Keeps the 'nexora-app' Monaco theme and code font in step with the look.
 * Pass `beforeMount` to <Editor> so the theme exists on first render.
 */
export function useMonacoAppTheme() {
  const { palette, mode, look } = useTheme()
  const data = useMemo(
    () => buildMonacoTheme(modeTokens(palette, mode, look.accent === 'theme' ? undefined : look.accent), mode),
    [palette, mode, look.accent],
  )
  const font = CODE_FONTS.find((f) => f.id === look.codeFont) ?? CODE_FONTS.find((f) => f.id === DEFAULT_CODE_FONT)!
  const fontFamily = codeFontStack(font)

  const define = useCallback(() => monaco.editor.defineTheme(APP_EDITOR_THEME, data), [data])
  useEffect(define, [define])

  // Monaco measures glyphs once; re-measure when a (lazily loaded) font lands.
  useEffect(() => {
    let live = true
    document.fonts
      ?.load(`14px "${font.family}"`)
      .then(() => live && monaco.editor.remeasureFonts())
      .catch(() => {})
    return () => {
      live = false
    }
  }, [font.family])

  return { theme: APP_EDITOR_THEME, beforeMount: define, fontFamily, ligatures: font.ligatures, version: data }
}
