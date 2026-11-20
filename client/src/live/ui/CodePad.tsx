/*
  The shared code pad: one Monaco editor that everyone in the room types in at
  once, kept in step with Yjs (the room's shared document lives on our server,
  so people who join later get the code so far). Loaded only when opened.
*/
import { useEffect, useRef } from 'react'
import { MonacoBinding } from 'y-monaco'
import { monaco } from '@/lib/monaco'
import type { CodeLang } from '../api'
import type { LiveSession } from '../session'

const LANGS: { id: CodeLang; label: string }[] = [
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'c', label: 'C' },
  { id: 'plaintext', label: 'Plain text' },
]

export default function CodePad({ session, lang }: { session: LiveSession; lang: CodeLang }) {
  const host = useRef<HTMLDivElement>(null)
  const editor = useRef<ReturnType<typeof monaco.editor.create> | null>(null)
  const doc = session.codePad

  useEffect(() => {
    if (!host.current) return
    const dark = document.documentElement.dataset.mode === 'dark'
    const model = monaco.editor.createModel('', lang)
    const ed = monaco.editor.create(host.current, {
      model,
      theme: dark ? 'vs-dark' : 'vs',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      fontFamily: "'JetBrains Mono Variable', ui-monospace, Menlo, monospace",
      scrollBeyondLastLine: false,
      tabSize: 4,
      wordWrap: 'on',
      ariaLabel: 'Shared code pad. Everyone in the room can type here.',
    })
    editor.current = ed
    const binding = new MonacoBinding(doc.getText('code'), model, new Set([ed]))
    session.setCodeOpen(true)
    return () => {
      session.setCodeOpen(false)
      binding.destroy()
      ed.dispose()
      model.dispose()
    }
  }, [doc, session]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const model = editor.current?.getModel()
    if (model) monaco.editor.setModelLanguage(model, lang)
  }, [lang])

  return (
    <div className="lv-code">
      <div className="lv-code-bar">
        <select className="lv-select" value={lang} onChange={(e) => session.setCodeLang(e.target.value as CodeLang)} aria-label="Language (for everyone)">
          {LANGS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <button type="button" className="lv-chip-btn" onClick={() => void navigator.clipboard?.writeText(doc.getText('code').toString())}>
          Copy all
        </button>
        <span className="lv-hint">Everyone types here together.</span>
      </div>
      <div ref={host} className="lv-code-editor" />
    </div>
  )
}
