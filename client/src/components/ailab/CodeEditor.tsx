import { lazy, Suspense } from 'react'
import { Textarea } from '@/components/ui'

const MonacoEditor = lazy(() =>
  // Load the locally bundled Monaco first (see lib/monaco.ts), then the React wrapper.
  import('@/lib/monaco').then(() => import('@monaco-editor/react')).then((m) => ({ default: m.Editor })),
)

/**
 * Lazy Monaco editor (vs-dark, minimal chrome) with a font-mono textarea fallback
 * while the editor chunk loads. Shared by the AI problem solver and AI battle.
 */
export function CodeEditor({
  value,
  onChange,
  language = 'python',
  height = '320px',
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  language?: string
  height?: string
  ariaLabel?: string
}) {
  return (
    <Suspense
      fallback={
        <Textarea
          aria-label={ariaLabel ?? 'Code editor (loading)'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="min-h-40 font-mono text-xs leading-relaxed"
          style={{ height }}
        />
      }
    >
      <div className="overflow-hidden rounded-lg border border-border" style={{ height }}>
        <MonacoEditor
          height="100%"
          language={language}
          theme="vs-dark"
          value={value}
          onChange={(v) => onChange(v ?? '')}
          loading={
            <Textarea
              aria-label={ariaLabel ?? 'Code editor (loading)'}
              value={value}
              readOnly
              className="min-h-40 font-mono text-xs"
              style={{ height }}
            />
          }
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono','Fira Code',monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 10 },
            automaticLayout: true,
            lineNumbers: 'on',
            renderWhitespace: 'none',
            tabSize: 4,
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
          }}
        />
      </div>
    </Suspense>
  )
}
