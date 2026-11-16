import { useEffect, useMemo, useRef, useState } from 'react'
import { APP_EDITOR_THEME, useMonacoAppTheme } from '@/theme/useMonacoAppTheme'
import '@/lib/monaco'
import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react'
import type { editor as MonacoNs } from 'monaco-editor'
import { initVimMode, type VimMode } from 'monaco-vim'
import {
  AlignLeft,
  Minus,
  Plus,
  Braces,
  Check,
  ClipboardCopy,
  Download,
  FileCode2,
  Keyboard,
  Maximize2,
  Minimize2,
  Search,
  Settings2,
} from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { agentTask, isAiUnavailable } from '@/lib/agent'
import { cn } from '@/lib/utils'
import { TEMPLATES, LANG_EXT } from '@/lib/templates'
import { snippetsFor } from '@/lib/snippets'
import { MONACO_LANG } from '@/lib/monacoLang'
import { Select, Tooltip } from '@/components/ui'

/** Monaco has a real formatter for these; other languages show no Format button. */
const FORMATTABLE = new Set(['javascript', 'typescript', 'json', 'css', 'html'])
import { entryFor, intelFor, signatureFor, type IntelEntry } from '@/lib/langIntel'
import type { Diag } from '@/lib/diagnostics'
import type { ReplayEvent } from '@/components/submissions/replay'

/* Maps backend language ids to Monaco language ids where they differ */

/* ── Themes ─────────────────────────────────────────────────────────── */
interface ThemeDef {
  label: string
  base: 'vs-dark' | 'vs'
  rules: { token: string; foreground: string; fontStyle?: string }[]
  colors: Record<string, string>
}

/* The two default themes (NexoraGuru Dark and the light one) have a transparent
   background, so the code sits directly on the pane's glass and the editor
   reads as part of the window rather than a dark slab dropped into it. The
   named themes (Monokai, Dracula…) keep their own backgrounds on purpose. */
const THEMES: Record<string, ThemeDef> = {
  'nexora-dark': {
    label: 'NexoraGuru Dark',
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
      'editor.background': '#00000000',
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
      'editorGutter.background': '#00000000',
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
      'editor.background': '#00000000',
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
      'editorGutter.background': '#00000000',
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

/* Languages the AI ghost completion (agent task 'complete') handles well */
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

/*
 * The language's own knowledge (lib/langIntel.ts): keywords, standard-library
 * functions with signatures, and methods after "." / "->" / "::". Functions
 * insert with their parentheses and the cursor inside.
 */
function registerLangIntel(monaco: Parameters<BeforeMount>[0], getLang: () => string) {
  return monaco.languages.registerCompletionItemProvider('*', {
    triggerCharacters: ['.', '>', ':'],
    provideCompletionItems: (
      model: { getWordUntilPosition(p: EditorPosition): { word: string }; getLineContent(n: number): string },
      position: EditorPosition,
    ) => {
      const lang = getLang()
      // JavaScript and TypeScript already have Monaco's full IntelliSense.
      if (lang === 'javascript' || lang === 'typescript') return { suggestions: [] }
      const intel = intelFor(lang)
      if (!intel) return { suggestions: [] }
      const word = model.getWordUntilPosition(position)
      const before = model.getLineContent(position.lineNumber).slice(0, position.column - 1 - word.word.length)
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: position.column - word.word.length,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      }
      const K = monaco.languages.CompletionItemKind
      const asSnippet = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      const call = (e: IntelEntry, label: string) => {
        // Only "name(…)"-style signatures get parentheses: not Lisp's
        // "(read-line)", Haskell's "f :: a -> b" or Ruby's "map { … }".
        const sig = e.signature.startsWith(e.name) ? e.signature.slice(e.name.length) : ''
        const takesArgs = /^[^\s(]{0,12}\(/.test(sig) && !/^[^\s(]*!/.test(sig)
        const empty = /\(\s*\)/.test(sig)
        return takesArgs && !label.endsWith('!') ? `${label}(${empty ? '' : '$1'})$0` : label
      }
      // After "x." (or "->" / "::" in C++): methods.
      if (/(\.|->|::)$/.test(before)) {
        return {
          suggestions: intel.members.map((e) => ({
            label: e.name,
            kind: /\(/.test(e.signature) ? K.Method : K.Field,
            detail: e.signature,
            documentation: e.doc,
            insertText: call(e, e.name),
            insertTextRules: asSnippet,
            range,
            sortText: 'b' + e.name,
          })),
        }
      }
      const globals = intel.globals.map((e) => {
        const label = e.name.split('.').pop() === e.name ? e.name : e.name
        return {
          label,
          kind: /^[A-Z]/.test(label) || /<|new /.test(e.signature) ? K.Class : K.Function,
          detail: e.signature,
          documentation: e.doc,
          insertText: call(e, label),
          insertTextRules: asSnippet,
          range,
          sortText: 'c' + label,
        }
      })
      const keywords = intel.keywords.map((k) => ({ label: k, kind: K.Keyword, insertText: k, range, sortText: 'd' + k }))
      return { suggestions: [...globals, ...keywords] }
    },
  })
}

/* Hover docs: what a standard-library name does, for every language. */
function registerHoverDocs(monaco: Parameters<BeforeMount>[0], getLang: () => string) {
  return monaco.languages.registerHoverProvider('*', {
    provideHover: (
      model: { getWordAtPosition(p: EditorPosition): { word: string; startColumn: number; endColumn: number } | null; getLineContent(n: number): string },
      position: EditorPosition,
    ) => {
      const lang = getLang()
      if (lang === 'javascript' || lang === 'typescript') return null
      const w = model.getWordAtPosition(position)
      if (!w) return null
      const line = model.getLineContent(position.lineNumber)
      const before = line.slice(0, w.startColumn - 1)
      // "Math.max", "std::sort", "Enum.map": try the qualified name first.
      const qual = /([A-Za-z_][\w.]*(?:::|\.|\/))$/.exec(before)?.[1] ?? ''
      const e = (qual && entryFor(lang, qual + w.word)) || entryFor(lang, w.word, /(\.|->|::)$/.test(before))
      if (!e) return null
      return {
        range: { startLineNumber: position.lineNumber, startColumn: w.startColumn, endLineNumber: position.lineNumber, endColumn: w.endColumn },
        contents: [{ value: '```' + (MONACO_LANG[lang] ?? lang) + '\n' + e.signature + '\n```' }, { value: e.doc }],
      }
    },
  })
}

/* Parameter hints: the signature of the call the cursor is inside. */
function registerSignatureHelp(monaco: Parameters<BeforeMount>[0], getLang: () => string) {
  return monaco.languages.registerSignatureHelpProvider('*', {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [','],
    provideSignatureHelp: (model: EditorModel & { getValueInRange(r: object): string }, position: EditorPosition) => {
      const text = model.getValueInRange({ startLineNumber: Math.max(1, position.lineNumber - 3), startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column })
      // Walk back to the unclosed "(" and count commas at that depth.
      let depth = 0
      let commas = 0
      let i = text.length - 1
      for (; i >= 0; i--) {
        const ch = text[i]
        if (ch === ')' || ch === ']' || ch === '}') depth++
        else if (ch === '(' || ch === '[' || ch === '{') {
          if (depth === 0) break
          depth--
        } else if (ch === ',' && depth === 0) commas++
      }
      if (i < 0 || text[i] !== '(') return null
      const callee = /([A-Za-z_][\w.:]*(?:->\w+)?!?)\s*$/.exec(text.slice(0, i))?.[1]
      if (!callee) return null
      const lang = getLang()
      if (lang === 'javascript' || lang === 'typescript') return null
      const e = signatureFor(lang, callee)
      if (!e) return null
      const params = (/\(([^)]*)\)/.exec(e.signature)?.[1] ?? '').split(',').map((p) => p.trim()).filter(Boolean)
      return {
        value: {
          signatures: [{ label: e.signature, documentation: e.doc, parameters: params.map((p) => ({ label: p })) }],
          activeSignature: 0,
          activeParameter: Math.min(commas, Math.max(0, params.length - 1)),
        },
        dispose: () => {},
      }
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
  reveal,
  headerExtra,
  onAiInlineChange,
  onIssuesClick,
}: {
  value: string
  language: string
  onChange: (code: string) => void
  onRunShortcut: () => void
  onSubmitShortcut: () => void
  /** Ghost-text completions from the AI agent (task 'complete', fast Groq model) */
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
  /** Move the cursor to this line (a new `id` re-triggers the same line). */
  reveal?: { line: number; id: number } | null
  /** Placed in the header, before the settings button (the page's AI Help). */
  headerExtra?: React.ReactNode
  /** Turns the AI's ghost suggestions on or off (shown in Editor settings). */
  onAiInlineChange?: (on: boolean) => void
  /** The issue count in the status bar was clicked. */
  onIssuesClick?: () => void
}) {
  const { data } = useApi(() => api.get<{ settings: Record<string, string> }>('/api/settings'), [])
  const settings = data?.settings ?? {}

  /* The editor follows the app's theme (palette, mode, accent and code font,
     from the Theme Centre) until the reader picks an editor theme of their own
     from the dropdown. */
  const appTheme = useMonacoAppTheme()
  const editorThemePinned = () => {
    try { return localStorage.getItem('nexora:editor-theme-pinned') === '1' } catch { return false }
  }
  const [theme, setTheme] = useState(() => {
    const stored = editorThemePinned() ? localStorage.getItem('nexora:editor-theme') : null
    return stored && THEMES[stored] ? stored : APP_EDITOR_THEME
  })
  const [vim, setVim] = useState(() => localStorage.getItem('nexora:editor-vim') === 'on')
  const [zen, setZen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [snipOpen, setSnipOpen] = useState(false)
  const [snipQuery, setSnipQuery] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
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
  useEffect(() => {
    const ed = editorRef.current
    if (!reveal || !ed) return
    ed.revealLineInCenter(reveal.line)
    ed.setPosition({ lineNumber: reveal.line, column: 1 })
    ed.setSelection({ startLineNumber: reveal.line, startColumn: 1, endLineNumber: reveal.line, endColumn: 1_000 })
    ed.focus()
  }, [reveal])
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
  }, [theme, appTheme.version])

  useEffect(() => {
    editorRef.current?.updateOptions({ fontFamily: appTheme.fontFamily, fontLigatures: appTheme.ligatures })
  }, [appTheme.fontFamily, appTheme.ligatures])

  /* Autosave pulse */
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

  const filteredSnips = useMemo(() => {
    const all = snippetsFor(language)
    const q = snipQuery.trim().toLowerCase()
    if (!q) return all
    return all.filter((s) => s.label.toLowerCase().includes(q) || s.detail.toLowerCase().includes(q))
  }, [language, snipQuery])

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
    let aiOffline = false
    for (const lang of AI_LANGS) {
      disposers.current.push(
        monaco.languages.registerInlineCompletionsProvider(MONACO_LANG[lang] ?? lang, {
          provideInlineCompletions: async (model: EditorModel, position: EditorPosition, _context: unknown, token: CancelToken) => {
            if (aiOffline || !aiRef.current || !AI_LANGS.includes(langRef.current)) return { items: [] }
            const stamp = ++lastRequest
            await new Promise((r) => setTimeout(r, 700)) // debounce keystrokes
            if (token.isCancellationRequested || stamp !== lastRequest) return { items: [] }
            const offset = model.getOffsetAt(position)
            const full = model.getValue()
            const prefix = full.slice(Math.max(0, offset - 3000), offset)
            if (prefix.trim().length < 12) return { items: [] }
            try {
              const res = await agentTask<{ text: string }>(
                'complete',
                { prefix, suffix: full.slice(offset, offset + 1000), language: langRef.current },
                { timeoutMs: 10000 },
              )
              const text = (res?.text ?? '').replace(/^```\w*\n?|```$/g, '')
              if (!text.trim() || token.isCancellationRequested) return { items: [] }
              return {
                items: [
                  {
                    insertText: text,
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                  },
                ],
              }
            } catch (err) {
              // No AI on this server: stop asking for the rest of this editor's life.
              if (isAiUnavailable(err)) aiOffline = true
              return { items: [] }
            }
          },
          disposeInlineCompletions: () => {},
        }),
      )
    }
    disposers.current.push(registerWordCompletions(monaco))
    disposers.current.push(registerSnippets(monaco, () => langRef.current))
    disposers.current.push(registerLangIntel(monaco, () => langRef.current))
    disposers.current.push(registerSignatureHelp(monaco, () => langRef.current))
    disposers.current.push(registerHoverDocs(monaco, () => langRef.current))

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
      fontFamily: appTheme.fontFamily,
      fontLigatures: appTheme.ligatures,
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
      {/* ── Editor header: the file, and only the tools used while writing.
            Everything else lives in "Editor settings". ── */}
      {!minimal && (
        <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-surface px-2 py-1.5">
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11.5px] text-foreground-dim" title={saveState === 'saving' ? 'Saving…' : 'Saved on this device'}>
            <span className={cn('size-1.5 shrink-0 rounded-full', saveState === 'saving' ? 'bg-warning' : 'bg-state-success')} aria-hidden="true" />
            <span className="truncate">{language === 'java' ? 'Main.java' : `main.${LANG_EXT[language] ?? language}`}</span>
          </span>
          <div className="ml-auto flex items-center gap-0.5">
            {FORMATTABLE.has(MONACO_LANG[language] ?? language) && (
              <Tooltip label="Format the code (Shift+Alt+F)">
                <button type="button" className={toolBtn} aria-label="Format the code" onClick={() => void editorRef.current?.getAction('editor.action.formatDocument')?.run()}>
                  <AlignLeft className="size-3.5" aria-hidden="true" />
                </button>
              </Tooltip>
            )}
            <Tooltip label="Snippets">
              <button type="button" className={cn(toolBtn, snipOpen && 'bg-surface-2 text-primary-bright')} onClick={() => setSnipOpen((v) => !v)} aria-pressed={snipOpen} aria-label="Snippets">
                <Braces className="size-3.5" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="Reset to the starter template">
              <button type="button" className={toolBtn} onClick={insertTemplate} aria-label="Reset to the starter template">
                <FileCode2 className="size-3.5" aria-hidden="true" />
              </button>
            </Tooltip>
            {headerExtra}
            <Tooltip label="Editor settings">
              <button type="button" className={cn(toolBtn, settingsOpen && 'bg-surface-2 text-foreground')} onClick={() => setSettingsOpen((v) => !v)} aria-pressed={settingsOpen} aria-label="Editor settings">
                <Settings2 className="size-3.5" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {settingsOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-label="Editor settings" className="card-neon absolute top-11 right-2 z-50 w-72 overflow-hidden p-0">
            <div className="border-b border-border px-3 py-2 text-[12px] font-semibold text-foreground-dim">Editor settings</div>
            <div className="space-y-3 px-3 py-3 text-[12.5px]">
              <label className="flex items-center justify-between gap-3">
                <span className="text-foreground-dim">Theme</span>
                <Select
                  variant="pill"
                  value={theme}
                  onChange={(e) => {
                    const pinned = e.target.value !== APP_EDITOR_THEME
                    try { localStorage.setItem('nexora:editor-theme-pinned', pinned ? '1' : '0') } catch { /* storage off */ }
                    setTheme(e.target.value)
                  }}
                  aria-label="Editor theme"
                  className="h-7 max-w-40 cursor-pointer rounded-md border border-border bg-background pr-6 pl-2 text-[11.5px] text-foreground outline-none"
                >
                  <option value={APP_EDITOR_THEME}>Match app theme</option>
                  {Object.entries(THEMES).map(([id, t]) => (
                    <option key={id} value={id}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="flex items-center justify-between gap-3">
                <span className="text-foreground-dim">Font size</span>
                <span className="flex items-center rounded-lg border border-border">
                  <button type="button" className={toolBtn} onClick={() => setFontSize((f) => Math.max(10, f - 1))} aria-label="Smaller font">
                    <Minus className="size-3.5" aria-hidden="true" />
                  </button>
                  <span className="w-7 text-center font-mono text-[11px] tabular-nums">{fontSize}</span>
                  <button type="button" className={toolBtn} onClick={() => setFontSize((f) => Math.min(24, f + 1))} aria-label="Larger font">
                    <Plus className="size-3.5" aria-hidden="true" />
                  </button>
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-foreground-dim">Indent</span>
                <button type="button" onClick={cycleIndent} className="rounded-md border border-border px-2 py-1 font-mono text-[11.5px] text-foreground hover:bg-surface-2" title="4 → 2 → 8 spaces">
                  {indent} spaces
                </button>
              </div>
              {(
                [
                  ['Word wrap', wrap, () => setWrap((w) => !w)],
                  ['Minimap', minimap, () => setMinimap((m) => !m)],
                  ['Vim keys', vim, () => setVim((v) => !v)],
                  ...(onAiInlineChange ? ([['AI suggestions while typing', aiInline, () => onAiInlineChange(!aiInline)]] as const) : []),
                ] as const
              ).map(([label, on, toggle]) => (
                <button key={label} type="button" role="switch" aria-checked={on} onClick={toggle} className="flex w-full cursor-pointer items-center justify-between gap-3 text-left">
                  <span className="text-foreground-dim">{label}</span>
                  <span className={cn('relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors', on ? 'border-transparent bg-accent-brand' : 'border-border bg-surface-2')} aria-hidden="true">
                    <span className={cn('absolute top-0.5 size-3.5 rounded-full transition-all', on ? 'left-[18px] bg-[var(--color-on-accent-brand)]' : 'left-0.5 bg-foreground-faint')} />
                  </span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1 border-t border-border p-2">
              {(
                [
                  [<ClipboardCopy key="c" className="size-3.5" />, 'Copy code', copyCode],
                  [<Download key="d" className="size-3.5" />, 'Download file', downloadCode],
                  [<Keyboard key="k" className="size-3.5" />, 'Shortcuts', () => setHelpOpen(true)],
                  [(focusMode ?? zen) ? <Minimize2 key="m" className="size-3.5" /> : <Maximize2 key="m" className="size-3.5" />, (focusMode ?? zen) ? 'Exit full screen' : 'Full screen', () => (onFocusMode ? onFocusMode() : setZen((z) => !z))],
                ] as const
              ).map(([icon, label, act]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false)
                    act()
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-foreground-dim hover:bg-surface-2 hover:text-foreground"
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {helpOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setHelpOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label="Keyboard shortcuts"
            className="card-neon absolute right-2 top-10 z-50 w-72 overflow-hidden p-0"
          >
            <div className="border-b border-border px-3 py-2 text-[12px] font-semibold text-foreground-dim">
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
            appTheme.beforeMount()
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

      {/* ── Status bar: where you are, the language, problems, saved ── */}
      <div className="flex shrink-0 flex-nowrap items-center gap-x-3 overflow-hidden border-t border-border bg-surface px-3 py-1 font-mono text-[10.5px] whitespace-nowrap text-foreground-faint">
        <span className="tabular-nums">
          Ln {cursor.line}, Col {cursor.col}
          {cursor.sel > 0 && <span className="text-foreground-dim"> ({cursor.sel} selected)</span>}
        </span>
        <span className="uppercase">{language}</span>
        {vim && (
          <div ref={vimStatusRef} className="text-foreground-dim">
            VIM
          </div>
        )}
        {diagnostics.length > 0 && (
          <button type="button" onClick={onIssuesClick} className="cursor-pointer text-state-error underline-offset-2 hover:underline" title="Show the issues">
            {diagnostics.length} issue{diagnostics.length > 1 ? 's' : ''}
          </button>
        )}
        <span className={cn('ml-auto flex items-center gap-1', saveState === 'saving' ? 'text-foreground-dim' : 'text-foreground-faint')}>
          {saveState === 'saving' ? 'saving…' : saveState === 'saved' ? (
            <>
              <Check className="size-3" aria-hidden="true" /> saved
            </>
          ) : null}
        </span>
      </div>
    </div>
  )
}
