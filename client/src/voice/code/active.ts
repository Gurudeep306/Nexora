/*
  Which code editor is the student talking to? Each editor registers itself;
  the one focused or typed in most recently wins, else the one most in view.
  Same idea as scene/active.ts for animations.
*/
import type { editor as MonacoEditor } from 'monaco-editor'

export interface CodeHandle {
  id: string
  editor: () => MonacoEditor.IStandaloneCodeEditor | null
  /** Judge language id ('cpp', 'python', …). */
  language: () => string
  /** The editor's own formatter, when the language has one. */
  format?: () => boolean
}

const handles = new Map<string, { h: CodeHandle; touched: number }>()

export function registerCode(h: CodeHandle): () => void {
  handles.set(h.id, { h, touched: 0 })
  return () => {
    if (handles.get(h.id)?.h === h) handles.delete(h.id)
  }
}

export function touchCode(id: string) {
  const e = handles.get(id)
  if (e) e.touched = Date.now()
}

function visibleShare(el: HTMLElement): number {
  const r = el.getBoundingClientRect()
  const h = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0))
  const w = Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0))
  return r.height > 0 && r.width > 0 ? (h * w) / (r.height * r.width) : 0
}

/** The editor the student most likely means, if one is on screen. */
export function activeCode(): CodeHandle | null {
  let best: { h: CodeHandle; score: number } | null = null
  const now = Date.now()
  for (const { h, touched } of handles.values()) {
    const el = h.editor()?.getDomNode()
    if (!el || !el.isConnected) continue
    const share = visibleShare(el)
    if (share <= 0.1) continue
    const score = share + (now - touched < 300_000 ? 2 : 0)
    if (!best || score > best.score) best = { h, score }
  }
  return best?.h ?? null
}
