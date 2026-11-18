import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * How a model's work is shown while it answers, in the manner of the best
 * chat apps, but only with what really happened:
 *
 *   Waiting   nothing has arrived yet: who we asked and the seconds so far
 *             (never invented phases like "Planning…").
 *   Thought   the reasoning the model chose to share, streaming live in a
 *             short window that follows the newest line; it folds away when
 *             the answer starts, and a finished answer keeps it behind
 *             "Thought for 12s".
 *
 * The waiting line is role="status" (screen readers hear it change, not every
 * streamed word); everything goes still under
 * prefers-reduced-motion (hive.css).
 */

const fmtSecs = (ms: number) => {
  const s = Math.max(1, Math.round(ms / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

function useSeconds(from: number, live: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!live) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [live])
  return Math.max(0, Math.floor((now - from) / 1000))
}

/** Before the first word: who was asked and how long ago, honestly. */
export function Waiting({ who, since, className }: { who?: string | null; since: number; className?: string }) {
  const secs = useSeconds(since, true)
  const line = secs < 2 ? `Asking ${who || 'the model'}` : secs < 15 ? `Waiting for ${who || 'the model'} to start` : `Still waiting for ${who || 'the model'} — some models think for a while before they write`
  return (
    <div role="status" aria-live="polite" className={cn('hv-wait', className)}>
      <span className="hv-wait-rule" aria-hidden="true" />
      <span className="min-w-0">
        <span className="text-[var(--hv-text-2)]">{line}</span>
        {secs >= 2 && <span className="hv-num ml-2 text-[var(--hv-text-3)]">{secs}s</span>}
      </span>
    </div>
  )
}

/**
 * The model's shared reasoning. `live` while it is still thinking; `answering`
 * once the answer text has begun (it folds away then, unless opened).
 */
export function Thought({ text, live = false, answering = false, startedAt, ms, className }: { text: string; live?: boolean; answering?: boolean; startedAt?: number; ms?: number | null; className?: string }) {
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const open = userOpen ?? (live && !answering)
  const thinking = live && !answering
  const [mounted] = useState(() => Date.now())
  const secs = useSeconds(startedAt ?? mounted, thinking)
  const body = useRef<HTMLDivElement>(null)
  // While it streams, keep the newest line in view.
  useLayoutEffect(() => {
    if (thinking && open && body.current) body.current.scrollTop = body.current.scrollHeight
  }, [text, thinking, open])
  if (!text.trim()) return null
  const label = thinking ? 'Thinking' : ms != null && ms > 0 ? `Thought for ${fmtSecs(ms)}` : startedAt && live ? `Thought for ${fmtSecs(secs * 1000)}` : 'Thought it through'
  return (
    <div className={cn('hv-thought', className)} data-live={thinking || undefined}>
      <button type="button" onClick={() => setUserOpen(!open)} aria-expanded={open} className="hv-thought-head">
        <span className="hv-thought-mark" aria-hidden="true" />
        <span className={cn('font-medium', thinking ? 'text-[var(--hv-text-1)]' : 'text-[var(--hv-text-2)]')}>{label}</span>
        {thinking && (
          <span className="hv-num text-[var(--hv-text-3)]" aria-hidden="true">
            {secs}s
          </span>
        )}
        <ChevronRight className={cn('size-3.5 text-[var(--hv-text-3)] transition-transform', open && 'rotate-90')} aria-hidden="true" />
      </button>
      {open && (
        <div ref={body} className={cn('hv-thought-body hive-scroll', thinking && 'is-live')}>
          {text}
        </div>
      )}
    </div>
  )
}
