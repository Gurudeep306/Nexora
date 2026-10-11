import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** Small copy-to-clipboard button with a "Copied" confirmation. */
export function CopyButton({ text, label = 'Copy', showLabel = true, className }: { text: string; label?: string; showLabel?: boolean; className?: string }) {
  const [done, setDone] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <button
      type="button"
      onClick={async () => {
        if (!(await copyText(text))) return
        setDone(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setDone(false), 1600)
      }}
      className={cn('ai-copy', done && 'ai-copy-done', className)}
      aria-label={done ? 'Copied' : label}
      title={done ? 'Copied' : label}
    >
      {done ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {showLabel && <span>{done ? 'Copied' : 'Copy'}</span>}
    </button>
  )
}
