import { useEffect, useRef } from 'react'
import '@/lib/monaco'
import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import type { ReplayEvent } from '@/components/submissions/replay'

/* Maps backend language ids to Monaco language ids where they differ */
const MONACO_LANG: Record<string, string> = {
  shell: 'shell',
  csharp: 'csharp',
  objectivec: 'objective-c',
  pascal: 'pascal',
  scheme: 'scheme',
}

const NEXORA_THEME = 'nexora-dark'

const beforeMount: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(NEXORA_THEME, {
    base: 'vs-dark',
    inherit: true,
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
  })
}

/* Languages the /api/ai-complete endpoint handles well */
/* Minimal structural types — monaco-editor's own typings aren't a dependency here */
interface EditorPosition { lineNumber: number; column: number }
interface EditorModel { getOffsetAt(position: EditorPosition): number; getValue(): string }
interface CancelToken { isCancellationRequested: boolean }

const AI_LANGS = ['cpp', 'c', 'python', 'java', 'javascript', 'typescript', 'go', 'rust', 'kotlin', 'csharp']

export function CodeEditor({
  value,
  language,
  onChange,
  onRunShortcut,
  onSubmitShortcut,
  aiInline = false,
  onRecord,
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
}) {
  const { data } = useApi(() => api.get<{ settings: Record<string, string> }>('/api/settings'), [])
  const settings = data?.settings ?? {}
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
  const disposers = useRef<{ dispose: () => void }[]>([])

  useEffect(
    () => () => {
      disposers.current.forEach((d) => d.dispose())
      disposers.current = []
    },
    [],
  )

  const handleMount: OnMount = (editor, monaco) => {
    const started = Date.now()
    disposers.current.push(
      editor.onDidChangeModelContent((e) => {
        recordRef.current?.({
          t: Date.now() - started,
          changes: e.changes.map((c) => ({ range: c.range, text: c.text })),
        }, editor.getValue())
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

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current())
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
      () => submitRef.current(),
    )
    editor.updateOptions({
      fontFamily: "'JetBrains Mono','Fira Code',monospace",
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      renderLineHighlight: 'line',
      padding: { top: 12, bottom: 12 },
    })
  }

  return (
    <Editor
      height="100%"
      beforeMount={beforeMount}
      onMount={handleMount}
      theme={NEXORA_THEME}
      language={MONACO_LANG[language] ?? language}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      loading={
        <div className="flex h-full items-center justify-center bg-surface text-xs text-foreground-faint">
          Loading editor…
        </div>
      }
      options={{
        automaticLayout: true,
        fontSize: Number(settings.font_size) || 14,
        tabSize: Number(settings.tab_size) || 4,
        wordWrap: settings.word_wrap === 'true' ? 'on' : 'off',
        minimap: { enabled: settings.minimap === 'true' },
        bracketPairColorization: { enabled: settings.bracket_color !== 'false' },
        inlineSuggest: { enabled: true },
      }}
    />
  )
}
