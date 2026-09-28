import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import '@/lib/monaco'
import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react'
import type { editor as MonacoNs } from 'monaco-editor'
import { initVimMode, type VimMode } from 'monaco-vim'
import {
  Minus,
  Plus,
  Braces,
  Check,
  ClipboardCopy,
  Columns2,
  Download,
  FileCode2,
  Keyboard,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Redo2,
  Search,
  Terminal,
  Timer,
  Undo2,
} from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { TEMPLATES, LANG_EXT } from '@/lib/templates'
import { snippetsFor } from '@/lib/snippets'
import type { Diag } from '@/lib/diagnostics'
import type { ReplayEvent } from '@/components/submissions/replay'

/* Maps backend language ids to Monaco language ids where they differ */
const MONACO_LANG: Record<string, string> = {
  shell: 'shell',
  csharp: 'csharp',
  objectivec: 'objective-c',
  pascal: 'pascal',
  scheme: 'scheme',
  // No dedicated Monaco grammar — borrow the closest one for highlighting.
  ocaml: 'fsharp',
  crystal: 'ruby',
  groovy: 'java',
  d: 'cpp',
  zig: 'rust',
  nim: 'python',
  commonlisp: 'clojure',
  haskell: 'plaintext',
}

/* ── Themes ─────────────────────────────────────────────────────────── */
interface ThemeDef {
  label: string
  base: 'vs-dark' | 'vs'
  rules: { token: string; foreground: string; fontStyle?: string }[]
  colors: Record<string, string>
}

const THEMES: Record<string, ThemeDef> = {
  'nexora-dark': {
    label: 'Nexora Dark',
    base: 'vs-dark',
    rules: [
      { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c4b5fd' },
      { token: 'string', foreground: '67e8f9' },
      { token: 'number', foreground: 'fbbf24' },
      { token: 'type', foreground: '22d3ee' },
      { token: 'function', foreground: 'a78bfa' },
      { token: 'variable', foreground: 'e2e8f0' },
      { token: 'delimiter', foreground: '94a3b8' },
    ],
    colors: {
      'editor.background': '#12122a',
      'editor.foreground': '#e2e8f0',
      'editorLineNumber.foreground': '#4c5578',
      'editorLineNumber.activeForeground': '#a78bfa',
      'editor.selectionBackground': '#7c3aed44',
      'editor.lineHighlightBackground': '#1d1d3b66',
      'editorCursor.foreground': '#f43f5e',
      'editorIndentGuide.background1': '#2e2e52',
      'editorWidget.background': '#16162e',
      'editorWidget.border': '#4c1d95',
      'editorSuggestWidget.background': '#16162e',
      'editorSuggestWidget.selectedBackground': '#27273b',
      'editorGutter.background': '#12122a',
    },
  },
  abyss: {
    label: 'Abyss',
    base: 'vs-dark',
    rules: [
      { token: 'comment', foreground: '546178', fontStyle: 'italic' },
      { token: 'keyword', foreground: '82aaff' },
      { token: 'string', foreground: 'c3e88d' },
      { token: 'number', foreground: 'f78c6c' },
      { token: 'type', foreground: 'ffcb6b' },
      { token: 'function', foreground: '82aaff' },
      { token: 'variable', foreground: 'd6deeb' },
      { token: 'delimiter', foreground: '7d8bab' },
    ],
    colors: {
      'editor.background': '#0a0e1a',
      'editor.foreground': '#d6deeb',
      'editorLineNumber.foreground': '#3b4a6b',
      'editorLineNumber.activeForeground': '#82aaff',
      'editor.selectionBackground': '#1d3b5377',
      'editor.lineHighlightBackground': '#11224455',
      'editorCursor.foreground': '#82aaff',
      'editorIndentGuide.background1': '#1f2b47',
      'editorWidget.background': '#0d1526',
      'editorWidget.border': '#1d3b53',
      'editorSuggestWidget.background': '#0d1526',
      'editorSuggestWidget.selectedBackground': '#1d3b53',
      'editorGutter.background': '#0a0e1a',
    },
  },
  monokai: {
    label: 'Monokai',
    base: 'vs-dark',
    rules: [
      { token: 'comment', foreground: '75715e', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'f92672' },
      { token: 'string', foreground: 'e6db74' },
      { token: 'number', foreground: 'ae81ff' },
      { token: 'type', foreground: '66d9ef', fontStyle: 'italic' },
      { token: 'function', foreground: 'a6e22e' },
      { token: 'variable', foreground: 'f8f8f2' },
      { token: 'delimiter', foreground: 'f8f8f2' },
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#f8f8f2',
      'editorLineNumber.foreground': '#6d6a5f',
      'editorLineNumber.activeForeground': '#f8f8f2',
      'editor.selectionBackground': '#49483e',
      'editor.lineHighlightBackground': '#3e3d32',
      'editorCursor.foreground': '#f8f8f0',
      'editorIndentGuide.background1': '#403e3a',
      'editorWidget.background': '#1e1f1c',
      'editorWidget.border': '#49483e',
      'editorSuggestWidget.background': '#1e1f1c',
      'editorSuggestWidget.selectedBackground': '#49483e',
      'editorGutter.background': '#272822',
    },
  },
  light: {
    label: 'Daylight',
    base: 'vs',
    rules: [
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
      { token: 'keyword', foreground: '0000ff' },
      { token: 'string', foreground: 'a31515' },
      { token: 'number', foreground: '098658' },
      { token: 'type', foreground: '267f99' },
      { token: 'function', foreground: '795e26' },
      { token: 'variable', foreground: '001080' },
      { token: 'delimiter', foreground: '393a34' },
    ],
    colors: {
      'editor.background': '#fbfbfd',
      'editor.foreground': '#1f2328',
      'editorLineNumber.foreground': '#9aa2ad',
      'editorLineNumber.activeForeground': '#7c3aed',
      'editor.selectionBackground': '#d4c5fb88',
      'editor.lineHighlightBackground': '#7c3aed0d',
      'editorCursor.foreground': '#7c3aed',
      'editorIndentGuide.background1': '#e2e5ea',
      'editorWidget.background': '#ffffff',
      'editorWidget.border': '#d0d7de',
      'editorSuggestWidget.background': '#ffffff',
      'editorSuggestWidget.selectedBackground': '#7c3aed1a',
      'editorGutter.background': '#fbfbfd',
    },
  },
  dracula: {
    label: 'Dracula',
    base: 'vs-dark',
    rules: [
      { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff79c6' },
      { token: 'string', foreground: 'f1fa8c' },
      { token: 'number', foreground: 'bd93f9' },
      { token: 'type', foreground: '8be9fd', fontStyle: 'italic' },
      { token: 'function', foreground: '50fa7b' },
      { token: 'variable', foreground: 'f8f8f2' },
      { token: 'delimiter', foreground: 'f8f8f2' },
    ],
    colors: {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'editorLineNumber.foreground': '#6272a4',
      'editorLineNumber.activeForeground': '#f8f8f2',
      'editor.selectionBackground': '#44475a',
      'editor.lineHighlightBackground': '#44475a55',
      'editorCursor.foreground': '#f8f8f0',
      'editorIndentGuide.background1': '#424450',
      'editorWidget.background': '#21222c',
      'editorWidget.border': '#44475a',
      'editorSuggestWidget.background': '#21222c',
      'editorSuggestWidget.selectedBackground': '#44475a',
      'editorGutter.background': '#282a36',
    },
  },
  nord: {
    label: 'Nord',
    base: 'vs-dark',
    rules: [
      { token: 'comment', foreground: '616e88', fontStyle: 'italic' },
      { token: 'keyword', foreground: '81a1c1' },
      { token: 'string', foreground: 'a3be8c' },
      { token: 'number', foreground: 'b48ead' },
      { token: 'type', foreground: '8fbcbb' },
      { token: 'function', foreground: '88c0d0' },
      { token: 'variable', foreground: 'd8dee9' },
      { token: 'delimiter', foreground: 'eceff4' },
    ],
    colors: {
      'editor.background': '#2e3440',
      'editor.foreground': '#d8dee9',
      'editorLineNumber.foreground': '#4c566a',
      'editorLineNumber.activeForeground': '#d8dee9',
      'editor.selectionBackground': '#434c5eaa',
      'editor.lineHighlightBackground': '#3b425266',
      'editorCursor.foreground': '#d8dee9',
      'editorIndentGuide.background1': '#3b4252',
      'editorWidget.background': '#2e3440',
      'editorWidget.border': '#434c5e',
      'editorSuggestWidget.background': '#2e3440',
      'editorSuggestWidget.selectedBackground': '#434c5e',
      'editorGutter.background': '#2e3440',
    },
  },
  'github-dark': {
    label: 'GitHub Dark',
    base: 'vs-dark',
    rules: [
      { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff7b72' },
      { token: 'string', foreground: 'a5d6ff' },
      { token: 'number', foreground: '79c0ff' },
      { token: 'type', foreground: 'ffa657' },
      { token: 'function', foreground: 'd2a8ff' },
      { token: 'variable', foreground: 'c9d1d9' },
      { token: 'delimiter', foreground: 'c9d1d9' },
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#c9d1d9',
      'editorLineNumber.foreground': '#484f58',
      'editorLineNumber.activeForeground': '#c9d1d9',
      'editor.selectionBackground': '#264f7866',
      'editor.lineHighlightBackground': '#161b2266',
      'editorCursor.foreground': '#58a6ff',
      'editorIndentGuide.background1': '#21262d',
      'editorWidget.background': '#161b22',
      'editorWidget.border': '#30363d',
      'editorSuggestWidget.background': '#161b22',
      'editorSuggestWidget.selectedBackground': '#264f7844',
      'editorGutter.background': '#0d1117',
    },
  },
}

/* Monaco renders inline "after" text only via a CSS class whose ::after supplies
   the content, so each diagnostic gets a generated rule in one managed <style>. */
function setLensStyles(entries: { cls: string; message: string; severity: Diag['severity'] }[]) {
  let el = document.getElementById('nx-lens-styles') as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = 'nx-lens-styles'
    document.head.appendChild(el)
  }
  el.textContent = entries
    .map((e) => {
      const msg = e.message.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\s+/g, ' ')
      const color = e.severity === 'error' ? '#f87171' : '#fbbf24'
      return `.${e.cls}::after{content:"  // ${msg}";color:${color};font-style:italic;opacity:.9;}`
    })
    .join('\n')
}

/* Languages the /api/ai-complete endpoint handles well */
interface EditorPosition { lineNumber: number; column: number }
interface EditorModel { getOffsetAt(position: EditorPosition): number; getValue(): string }
interface CancelToken { isCancellationRequested: boolean }

const AI_LANGS = ['cpp', 'c', 'python', 'java', 'javascript', 'typescript', 'go', 'rust', 'kotlin', 'csharp']

/* Word-based completion for every language (Monaco only ships TS/JS/CSS intelligence) */
function registerWordCompletions(monaco: Parameters<BeforeMount>[0]) {
  return monaco.languages.registerCompletionItemProvider('*', {
    provideCompletionItems: (
      model: { getValue(): string; getWordUntilPosition(p: EditorPosition): { word: string } },
      position: EditorPosition,
    ) => {
      const word = model.getWordUntilPosition(position)
      const text = model.getValue()
      const found = new Set<string>()
      for (const m of text.matchAll(/[A-Za-z_][A-Za-z0-9_]{2,}/g)) found.add(m[0])
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: position.column - word.word.length,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      }
      const items = [...found]
        .filter((w) => w !== word.word)
        .slice(0, 60)
        .map((w) => ({
          label: w,
          kind: monaco.languages.CompletionItemKind.Text,
          insertText: w,
          range,
          sortText: 'z' + w,
        }))
      return { suggestions: items }
    },
  })
}

/* Competitive-programming snippets, inserted with live tab stops */
function registerSnippets(monaco: Parameters<BeforeMount>[0], getLang: () => string) {
  return monaco.languages.registerCompletionItemProvider('*', {
    provideCompletionItems: (
      model: { getWordUntilPosition(p: EditorPosition): { word: string } },
      position: EditorPosition,
    ) => {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: position.column - word.word.length,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      }
      const suggestions = snippetsFor(getLang()).map((s) => ({
        label: s.label,
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: s.detail,
        documentation: s.detail,
        insertText: s.body,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        sortText: 'a' + s.label,
      }))
      return { suggestions }
    },
  })
}

export function CodeEditor({
  value,
  language,
  onChange,
  onRunShortcut,
  onSubmitShortcut,
  aiInline = false,
  onRecord,
  diagnostics = [],
  onExplain,
  minimal = false,
  onFocusMode,
  focusMode,
}: {
  value: string
  language: string
  onChange: (code: string) => void
  onRunShortcut: () => void
  onSubmitShortcut: () => void
  /** Ghost-text completions from POST /api/ai-complete (Gemini → Groq on the server) */
  aiInline?: boolean
  /** Receives every content change as a replay delta (see components/submissions/replay.ts) */
  onRecord?: (event: ReplayEvent, fullText: string) => void
  /** Compiler/runtime errors to underline inline (error-lens style) */
  diagnostics?: Diag[]
  /** Right-click "Explain selection with AI" — receives the selected source */
  onExplain?: (selection: string) => void
  /** Distraction-free chrome (full-screen arena): no toolbar, slim status bar */
  minimal?: boolean
  /** When given, the focus button opens the page-level full-screen arena instead */
  onFocusMode?: () => void
  focusMode?: boolean
}) {
  const { data } = useApi(() => api.get<{ settings: Record<string, string> }>('/api/settings'), [])
  const settings = data?.settings ?? {}

  /* The editor follows the app's appearance until the reader picks a theme of
     their own from the dropdown. A dark editor on a light page is the one
     thing that gives away a theme that was bolted on rather than designed. */
  const { resolved: appAppearance } = useTheme()
  const editorThemePinned = () => {
    try { return localStorage.getItem('nexora:editor-theme-pinned') === '1' } catch { return false }
  }
  const themeForAppearance = (a: 'light' | 'dark') => (a === 'light' ? 'light' : 'nexora-dark')
  const [theme, setTheme] = useState(() =>
    editorThemePinned()
      ? (localStorage.getItem('nexora:editor-theme') ?? 'nexora-dark')
      : themeForAppearance(appAppearance),
  )
  useEffect(() => {
    if (!editorThemePinned()) setTheme(themeForAppearance(appAppearance))
  }, [appAppearance])
  const [vim, setVim] = useState(() => localStorage.getItem('nexora:editor-vim') === 'on')
  const [zen, setZen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [snipOpen, setSnipOpen] = useState(false)
  const [snipQuery, setSnipQuery] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [secs, setSecs] = useState(0)
  const [indent, setIndent] = useState(4)
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('nexora:editor-font')) || 14)
  const [wrap, setWrap] = useState(() => localStorage.getItem('nexora:editor-wrap') !== 'off')
  const [minimap, setMinimap] = useState(() => localStorage.getItem('nexora:editor-minimap') === 'on')
  const [cursor, setCursor] = useState({ line: 1, col: 1, sel: 0 })

  const runRef = useRef(onRunShortcut)
  runRef.current = onRunShortcut
  const submitRef = useRef(onSubmitShortcut)
  submitRef.current = onSubmitShortcut
  const aiRef = useRef(aiInline)
  aiRef.current = aiInline
  const langRef = useRef(language)
  langRef.current = language
  const recordRef = useRef(onRecord)
  recordRef.current = onRecord
  const explainRef = useRef(onExplain)
  explainRef.current = onExplain
  const disposers = useRef<{ dispose: () => void }[]>([])
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null)
  const vimModeRef = useRef<VimMode | null>(null)
  const decorationsRef = useRef<MonacoNs.IEditorDecorationsCollection | null>(null)
  const vimStatusRef = useRef<HTMLDivElement>(null)

  /* Persist editor prefs locally and on the server so they follow you across devices */
  useEffect(() => {
    localStorage.setItem('nexora:editor-theme', theme)
    localStorage.setItem('nexora:editor-vim', vim ? 'on' : 'off')
    localStorage.setItem('nexora:editor-wrap', wrap ? 'on' : 'off')
    localStorage.setItem('nexora:editor-minimap', minimap ? 'on' : 'off')
    localStorage.setItem('nexora:editor-font', String(fontSize))
    const t = setTimeout(() => {
      void api
        .post('/api/settings', {
          font_size: String(fontSize),
          word_wrap: wrap ? 'true' : 'false',
          minimap: minimap ? 'true' : 'false',
          editor_theme: theme,
        })
        .catch(() => {})
    }, 600)
    return () => clearTimeout(t)
  }, [theme, vim, wrap, minimap, fontSize])

  /* Live option updates without remounting the editor */
  useEffect(() => {
    editorRef.current?.updateOptions({
      fontSize,
      wordWrap: wrap ? 'on' : 'off',
      minimap: { enabled: minimap },
    })
  }, [fontSize, wrap, minimap])

  useEffect(() => {
    if (monacoRef.current) monacoRef.current.editor.setTheme(theme)
  }, [theme])

  /* Session timer + autosave pulse + code stats */
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const firstValue = useRef(true)
  useEffect(() => {
    if (firstValue.current) {
      firstValue.current = false
      return
    }
    setSaveState('saving')
    const t = setTimeout(() => setSaveState('saved'), 700)
    return () => clearTimeout(t)
  }, [value])

  useEffect(() => {
    const t = Number(settings.tab_size)
    if (t) setIndent(t)
  }, [settings.tab_size])

  const stats = useMemo(() => {
    const lines = value.split('\n').length
    const chars = value.length
    const words = (value.match(/\S+/g) ?? []).length
    return { lines, chars, words }
  }, [value])

  const filteredSnips = useMemo(() => {
    const all = snippetsFor(language)
    const q = snipQuery.trim().toLowerCase()
    if (!q) return all
    return all.filter((s) => s.label.toLowerCase().includes(q) || s.detail.toLowerCase().includes(q))
  }, [language, snipQuery])

  const sessionTime = useMemo(() => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    const mm = String(m).padStart(2, '0')
    const ss = String(s).padStart(2, '0')
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
  }, [secs])

  const cycleIndent = () => {
    const next = indent === 4 ? 2 : indent === 2 ? 8 : 4
    setIndent(next)
    editorRef.current?.updateOptions({ tabSize: next })
  }

  const insertSnippet = (body: string) => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    editor.trigger('snippets', 'editor.action.insertSnippet', { snippet: body })
    setSnipOpen(false)
    setSnipQuery('')
  }

  /* Vim mode toggle */
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (vim && !vimModeRef.current) {
      vimModeRef.current = initVimMode(editor, vimStatusRef.current ?? undefined)
    } else if (!vim && vimModeRef.current) {
      vimModeRef.current.dispose()
      vimModeRef.current = null
    }
  }, [vim])

  /* Error-lens: markers + inline message decorations */
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return
    const model = editor.getModel()
    if (!model) return
    const visible = diagnostics.filter((d) => d.line <= model.getLineCount())
    monaco.editor.setModelMarkers(
      model,
      'nexora-diag',
      visible.map((d) => ({
        severity: d.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
        startLineNumber: d.line,
        startColumn: d.column,
        endLineNumber: d.line,
        endColumn: Math.min(model.getLineMaxColumn(d.line), d.column + 40),
        message: d.message,
      })),
    )
    const lensEntries: { cls: string; message: string; severity: Diag['severity'] }[] = []
    decorationsRef.current?.set(
      visible.slice(0, 12).flatMap((d, i) => {
        const endCol = model.getLineMaxColumn(d.line)
        const tint = {
          range: new monaco.Range(d.line, 1, d.line, 1),
          options: {
            isWholeLine: true,
            className: d.severity === 'error' ? 'nx-diag-line-error' : 'nx-diag-line-warn',
            glyphMarginClassName: d.severity === 'error' ? 'nx-diag-glyph-error' : 'nx-diag-glyph-warn',
          },
        }
        const cls = `nx-lens-${i}`
        lensEntries.push({ cls, message: d.message, severity: d.severity })
        const lens = {
          range: new monaco.Range(d.line, endCol, d.line, endCol),
          options: { afterContentClassName: cls },
        }
        return [tint, lens]
      }),
    )
    setLensStyles(lensEntries)
  }, [diagnostics])

  useEffect(
    () => () => {
      disposers.current.forEach((d) => d.dispose())
      disposers.current = []
      vimModeRef.current?.dispose()
      vimModeRef.current = null
      setLensStyles([])
    },
    [],
  )

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    decorationsRef.current = editor.createDecorationsCollection()
    monaco.editor.setTheme(theme)
    const started = Date.now()
    disposers.current.push(
      editor.onDidChangeModelContent((e) => {
        recordRef.current?.(
          {
            t: Date.now() - started,
            changes: e.changes.map((c) => ({ range: c.range, text: c.text })),
          },
          editor.getValue(),
        )
      }),
      editor.onDidChangeCursorPosition((e) => {
        setCursor((c) => ({ ...c, line: e.position.lineNumber, col: e.position.column }))
      }),
      editor.onDidChangeCursorSelection((e) => {
        const sel = editor.getModel()?.getValueInRange(e.selection) ?? ''
        setCursor((c) => ({ ...c, sel: sel.length }))
      }),
    )

    let lastRequest = 0
    for (const lang of AI_LANGS) {
      disposers.current.push(
        monaco.languages.registerInlineCompletionsProvider(MONACO_LANG[lang] ?? lang, {
          provideInlineCompletions: async (model: EditorModel, position: EditorPosition, _context: unknown, token: CancelToken) => {
            if (!aiRef.current || !AI_LANGS.includes(langRef.current)) return { items: [] }
            const stamp = ++lastRequest
            await new Promise((r) => setTimeout(r, 700)) // debounce keystrokes
            if (token.isCancellationRequested || stamp !== lastRequest) return { items: [] }
            const offset = model.getOffsetAt(position)
            const full = model.getValue()
            const prefix = full.slice(Math.max(0, offset - 3000), offset)
            if (prefix.trim().length < 12) return { items: [] }
            try {
              const res = await api.post<{ ok: boolean; text?: string }>(
                '/api/ai-complete',
                { prefix, suffix: full.slice(offset, offset + 1000), language: langRef.current },
                { timeoutMs: 15000 },
              )
              const text = (res.text ?? '').replace(/^```\w*\n?|```$/g, '')
              if (!res.ok || !text.trim() || token.isCancellationRequested) return { items: [] }
              return {
                items: [
                  {
                    insertText: text,
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                  },
                ],
              }
            } catch {
              return { items: [] }
            }
          },
          disposeInlineCompletions: () => {},
        }),
      )
    }
    disposers.current.push(registerWordCompletions(monaco))
    disposers.current.push(registerSnippets(monaco, () => langRef.current))

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current())
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => submitRef.current())
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // The browser's save dialog is useless here; code is persisted on every keystroke.
      runRef.current()
    })
    editor.addAction({
      id: 'nexora-run',
      label: 'Run Code',
      contextMenuGroupId: '9_nexora',
      contextMenuOrder: 1,
      run: () => runRef.current(),
    })
    editor.addAction({
      id: 'nexora-submit',
      label: 'Submit Solution',
      contextMenuGroupId: '9_nexora',
      contextMenuOrder: 2,
      run: () => submitRef.current(),
    })
    editor.addAction({
      id: 'nexora-explain',
      label: 'Explain Selection with AI',
      contextMenuGroupId: '9_nexora',
      contextMenuOrder: 3,
      run: (ed) => {
        const model = ed.getModel()
        const sel = ed.getSelection()
        if (!model || !sel || sel.isEmpty() || !explainRef.current) return
        explainRef.current(model.getValueInRange(sel))
      },
    })
    editor.updateOptions({
      fontFamily: "'JetBrains Mono','Fira Code',monospace",
      fontLigatures: true,
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      cursorSurroundingLines: 3,
      renderLineHighlight: 'all',
      renderWhitespace: 'selection',
      renderControlCharacters: true,
      padding: { top: 12, bottom: 12 },
      stickyScroll: { enabled: true },
      guides: { bracketPairs: 'active', indentation: true, highlightActiveIndentation: true },
      bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
      matchBrackets: 'always',
      foldingHighlight: true,
      linkedEditing: true,
      fixedOverflowWidgets: true,
      suggest: { preview: true, showInlineDetails: true, insertMode: 'replace', localityBonus: true },
      suggestSelection: 'first',
      wordBasedSuggestions: 'currentDocument',
      occurrencesHighlight: 'singleFile',
      glyphMargin: true,
      quickSuggestions: { other: 'on', comments: 'off', strings: 'off' },
      tabCompletion: 'on',
      find: { seedSearchStringFromSelection: 'selection', addExtraSpaceOnTop: false },
    })
  }

  const insertTemplate = () => {
    const tpl = TEMPLATES[language]
    const editor = editorRef.current
    if (!tpl || !editor) return
    if (editor.getValue().trim() === '') {
      onChange(tpl)
    } else {
      const model = editor.getModel()
      if (model) {
        const last = model.getLineCount()
        const col = model.getLineMaxColumn(last)
        editor.executeEdits('template', [
          { range: { startLineNumber: last, startColumn: col, endLineNumber: last, endColumn: col }, text: '\n' + tpl },
        ])
      }
    }
    editor.focus()
  }

  const copyCode = () => {
    void navigator.clipboard?.writeText(value).catch(() => {})
  }

  const downloadCode = () => {
    const ext = LANG_EXT[language] ?? 'txt'
    const blob = new Blob([value], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexora_${language}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toolBtn =
    'inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-foreground-dim transition-colors hover:bg-surface-2 hover:text-foreground'

  return (
    <div className={cn('relative flex h-full min-h-0 flex-col', zen && 'fixed inset-0 z-[100] bg-background')}>
      {/* ── Editor toolbar (one row; scrolls sideways when narrow so nothing gets cut off) ── */}
      {!minimal && (
      <div className="flex shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto border-b border-border bg-surface px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0">
        <select
          value={theme}
          onChange={(e) => {
            try { localStorage.setItem('nexora:editor-theme-pinned', '1') } catch { /* storage off */ }
            setTheme(e.target.value)
          }}
          aria-label="Editor theme"
          className="h-7 cursor-pointer rounded-md border border-border bg-background px-1.5 text-[11px] text-foreground-dim outline-none hover:text-foreground"
        >
          {Object.entries(THEMES).map(([id, t]) => (
            <option key={id} value={id}>
              {t.label}
            </option>
          ))}
        </select>

        <div className="flex items-center rounded-lg border border-border/60 bg-background/40 px-0.5 py-0.5">
          <button className={toolBtn} onClick={() => setFontSize((f) => Math.max(10, f - 1))} aria-label="Decrease font size" title="Smaller font">
            <Minus className="size-3.5" aria-hidden="true" />
          </button>
          <span className="w-6 text-center font-mono text-[10px] text-foreground-faint tabular-nums">{fontSize}</span>
          <button className={toolBtn} onClick={() => setFontSize((f) => Math.min(24, f + 1))} aria-label="Increase font size" title="Larger font">
            <Plus className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center rounded-lg border border-border/60 bg-background/40 px-0.5 py-0.5">
          <button
            className={cn(toolBtn, wrap && 'bg-surface-2 text-primary-bright')}
            onClick={() => setWrap((w) => !w)}
            aria-pressed={wrap}
            title="Word wrap"
          >
            <Columns2 className="size-3.5" aria-hidden="true" />
          </button>
          <button
            className={cn(toolBtn, minimap && 'bg-surface-2 text-primary-bright')}
            onClick={() => setMinimap((m) => !m)}
            aria-pressed={minimap}
            title="Minimap"
          >
            <MapIcon className="size-3.5" aria-hidden="true" />
          </button>
          <button
            className={cn(toolBtn, vim && 'bg-surface-2 text-cyan')}
            onClick={() => setVim((v) => !v)}
            aria-pressed={vim}
            title="Vim keybindings"
          >
            <Terminal className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center rounded-lg border border-border/60 bg-background/40 px-0.5 py-0.5">
          <button
            className={cn(toolBtn, snipOpen && 'bg-surface-2 text-primary-bright')}
            onClick={() => setSnipOpen((s) => !s)}
            aria-pressed={snipOpen}
            aria-label="Snippet library"
            title="Snippet library"
          >
            <Braces className="size-3.5" aria-hidden="true" />
          </button>
          <button className={toolBtn} onClick={insertTemplate} title="Insert starter template">
            <FileCode2 className="size-3.5" aria-hidden="true" />
          </button>
          <button className={toolBtn} onClick={copyCode} title="Copy code">
            <ClipboardCopy className="size-3.5" aria-hidden="true" />
          </button>
          <button className={toolBtn} onClick={downloadCode} title="Download file">
            <Download className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center rounded-lg border border-border/60 bg-background/40 px-0.5 py-0.5">
          <button
            className={toolBtn}
            onClick={() => editorRef.current?.trigger('toolbar', 'undo', null)}
            aria-label="Undo"
            title="Undo"
          >
            <Undo2 className="size-3.5" aria-hidden="true" />
          </button>
          <button
            className={toolBtn}
            onClick={() => editorRef.current?.trigger('toolbar', 'redo', null)}
            aria-label="Redo"
            title="Redo"
          >
            <Redo2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="sticky right-0 z-10 ml-auto flex items-center rounded-lg border border-border/60 bg-surface px-0.5 py-0.5 shadow-[-10px_0_10px_-2px_var(--color-surface)]">
          <button
            className={cn(toolBtn, helpOpen && 'bg-surface-2 text-primary-bright')}
            onClick={() => setHelpOpen((h) => !h)}
            aria-pressed={helpOpen}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts"
          >
            <Keyboard className="size-3.5" aria-hidden="true" />
          </button>
          <button
            className={cn(toolBtn, (focusMode ?? zen) && 'text-primary-bright')}
            onClick={() => (onFocusMode ? onFocusMode() : setZen((z) => !z))}
            aria-label={(focusMode ?? zen) ? 'Exit full screen' : 'Full-screen arena'}
            title={onFocusMode ? 'Full-screen arena (Alt+4)' : 'Focus mode'}
          >
            {(focusMode ?? zen) ? <Minimize2 className="size-3.5" aria-hidden="true" /> : <Maximize2 className="size-3.5" aria-hidden="true" />}
          </button>
        </div>
      </div>
      )}

      {helpOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setHelpOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label="Keyboard shortcuts"
            className="card-neon absolute right-2 top-10 z-50 w-72 overflow-hidden p-0"
          >
            <div className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-dim">
              Keyboard shortcuts
            </div>
            <dl className="max-h-80 overflow-y-auto px-3 py-2 text-xs">
              {[
                ['Run code', '⌘/Ctrl + Enter'],
                ['Submit solution', '⌘/Ctrl + Shift + Enter'],
                ['Quick save · run', '⌘/Ctrl + S'],
                ['Find / Replace', '⌘/Ctrl + F · ⌘/Ctrl + H'],
                ['Go to line', '⌘/Ctrl + G'],
                ['Trigger suggestion', 'Ctrl + Space'],
                ['Select next occurrence', '⌘/Ctrl + D'],
                ['Multi-cursor', 'Alt + Click'],
                ['Move / duplicate line', 'Alt + ↑/↓ · Shift+Alt + ↓'],
                ['Toggle comment', '⌘/Ctrl + /'],
                ['Fold / unfold region', '⌘/Ctrl + Shift + [ / ]'],
                ['Vim mode', 'Toolbar toggle'],
              ].map(([label, keys]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-1.5">
                  <dt className="text-foreground-dim">{label}</dt>
                  <dd className="whitespace-nowrap rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                    {keys}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </>
      )}

      {snipOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSnipOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label="Snippet library"
            className="card-neon absolute right-2 top-11 z-50 w-80 overflow-hidden p-0"
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="size-3.5 shrink-0 text-foreground-faint" aria-hidden="true" />
              <input
                autoFocus
                value={snipQuery}
                onChange={(e) => setSnipQuery(e.target.value)}
                placeholder={`Search ${language} snippets…`}
                aria-label="Search snippets"
                className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-foreground-faint"
              />
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {filteredSnips.map((s) => (
                <button
                  key={s.id}
                  onClick={() => insertSnippet(s.body)}
                  className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="shrink-0 font-mono text-[11px] text-primary-bright">{s.label}</span>
                  <span className="truncate text-[10px] text-foreground-faint">{s.detail}</span>
                </button>
              ))}
              {filteredSnips.length === 0 && (
                <div className="px-3 py-6 text-center text-[11px] text-foreground-faint">
                  No snippets match — try “for”, “map”, “search”…
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          beforeMount={((monaco) => {
            for (const [id, t] of Object.entries(THEMES)) {
              monaco.editor.defineTheme(id, { base: t.base, inherit: true, rules: t.rules, colors: t.colors })
            }
          }) as BeforeMount}
          onMount={handleMount}
          theme={theme}
          language={MONACO_LANG[language] ?? language}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          loading={
            <div className="flex h-full items-center justify-center bg-surface text-xs text-foreground-faint">Loading editor…</div>
          }
          options={{
            automaticLayout: true,
            fontSize,
            tabSize: Number(settings.tab_size) || 4,
            wordWrap: wrap ? 'on' : 'off',
            minimap: { enabled: minimap },
            bracketPairColorization: { enabled: settings.bracket_color !== 'false' },
            inlineSuggest: { enabled: true, showToolbar: 'onHover' },
          }}
        />
      </div>

      {/* ── Status bar ── */}
      <div className="flex shrink-0 flex-nowrap items-center gap-x-3 overflow-hidden border-t border-border bg-surface px-3 py-1 font-mono text-[10px] whitespace-nowrap text-foreground-faint">
        <span className="tabular-nums">
          Ln {cursor.line}, Col {cursor.col}
          {cursor.sel > 0 && <span className="text-primary-bright"> ({cursor.sel} selected)</span>}
        </span>
        <span className="uppercase">{language}</span>
        <button
          onClick={cycleIndent}
          title="Cycle indent width (4 → 2 → 8)"
          className="rounded px-0.5 transition-colors hover:text-foreground"
        >
          Spaces: {indent}
        </button>
        <span className="hidden tabular-nums sm:inline">
          {stats.lines} ln · {stats.chars} ch
        </span>
        <span className="hidden items-center gap-1 tabular-nums md:flex" title="Session time">
          <Timer className="size-3" aria-hidden="true" />
          {sessionTime}
        </span>
        <span className="hidden lg:inline">{wrap ? 'wrap on' : 'wrap off'}</span>
        {vim && (
          <div ref={vimStatusRef} className="text-cyan">
            VIM
          </div>
        )}
        {diagnostics.length > 0 && (
          <span className="text-destructive">
            {diagnostics.length} issue{diagnostics.length > 1 ? 's' : ''}
          </span>
        )}
        {saveState !== 'idle' && (
          <span
            className={cn(
              'flex items-center gap-1',
              saveState === 'saving' ? 'text-warning' : 'text-emerald-400',
            )}
          >
            {saveState === 'saved' ? (
              <Check className="size-3" aria-hidden="true" />
            ) : (
              <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />
            )}
            {saveState}
          </span>
        )}
        <span className="ml-auto hidden md:inline">{THEMES[theme]?.label ?? theme}</span>
      </div>
    </div>
  )
}
