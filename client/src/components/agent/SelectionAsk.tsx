import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useAgentContext } from '@/context/AgentContext'

const IGNORE = 'input,textarea,select,[contenteditable="true"],.monaco-editor,.ai-window,.ai-fab,[data-agent-ignore]'
const MIN = 3
const MAX = 3000

/**
 * Select text anywhere in the page content and an "Ask AI" button appears
 * next to it; it opens the assistant with that passage. (Code in the editor
 * has its own "Explain" action.)
 */
export function SelectionAsk() {
  const { openAssistant, summary } = useAgentContext()
  const [pick, setPick] = useState<{ text: string; x: number; y: number } | null>(null)

  useEffect(() => {
    let timer = 0
    const read = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const sel = window.getSelection()
        const text = sel?.toString().trim() ?? ''
        if (!sel || sel.rangeCount === 0 || text.length < MIN) return setPick(null)
        const node = sel.anchorNode
        const el = node instanceof Element ? node : node?.parentElement
        if (!el || !el.closest('#main-content') || el.closest(IGNORE)) return setPick(null)
        const r = sel.getRangeAt(0).getBoundingClientRect()
        if (!r.width && !r.height) return setPick(null)
        const x = Math.min(Math.max(r.left + r.width / 2 - 45, 8), window.innerWidth - 100)
        const y = r.top > 48 ? r.top - 36 : Math.min(r.bottom + 8, window.innerHeight - 40)
        setPick({ text: text.slice(0, MAX), x, y })
      }, 120)
    }
    const clear = () => setPick(null)
    document.addEventListener('mouseup', read)
    document.addEventListener('keyup', read)
    document.addEventListener('touchend', read)
    window.addEventListener('scroll', clear, true)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('mouseup', read)
      document.removeEventListener('keyup', read)
      document.removeEventListener('touchend', read)
      window.removeEventListener('scroll', clear, true)
    }
  }, [])

  if (!pick || summary.examActive) return null
  return (
    <button
      type="button"
      className="ai-select-ask"
      style={{ left: pick.x, top: pick.y }}
      // Keep the selection while clicking.
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => {
        const text = pick.text
        setPick(null)
        window.getSelection()?.removeAllRanges()
        const quoted = text.length > 600 ? `${text.slice(0, 600)}…` : text
        openAssistant(`Explain this from the page:\n\n> ${quoted.replace(/\n+/g, '\n> ')}`, { page: { selection: text } })
      }}
      aria-label="Ask AI about the selected text"
    >
      <Sparkles aria-hidden="true" /> Ask AI
    </button>
  )
}
