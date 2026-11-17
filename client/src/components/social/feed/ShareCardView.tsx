import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '@/components/icon/Icon'
import { useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { CodeBlock } from './CodeBlock'
import { errorText } from './lib'
import type { ShareCard } from './types'

const META: Record<ShareCard['type'], { icon: IconName; label: string }> = {
  solved: { icon: 'check-circle', label: 'Problem solved' },
  submission: { icon: 'code', label: 'Accepted solution' },
  gate_test: { icon: 'gate', label: 'GATE mock test' },
  streak: { icon: 'flame', label: 'Streak milestone' },
  lesson: { icon: 'learn', label: 'Lesson finished' },
  achievement: { icon: 'trophy', label: 'Achievement unlocked' },
}

/**
 * A "look what I did" card attached to a post, built by the server from real
 * data. Plain, like every card in the kit: a hairline, a quiet icon tile, no
 * glow. A shared solution keeps its code back from anyone who hasn't solved the
 * problem (a spoiler) until they choose Reveal.
 */
export function ShareCardView({ card, postId, className }: { card: ShareCard; postId?: number; className?: string }) {
  const m = META[card.type] ?? META.solved
  const head = (
    <div className="flex items-center gap-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-bg-surface-2 text-text-secondary" aria-hidden="true">
        <Icon name={m.icon} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-text-muted uppercase">{m.label}</p>
        <p className="truncate text-[15px] font-semibold text-text-primary">{card.title}</p>
        {card.subtitle && <p className="truncate text-xs text-text-secondary">{card.subtitle}</p>}
      </div>
      {card.stat && <span className="shrink-0 rounded-lg border border-border px-2.5 py-1 font-mono text-sm font-semibold text-text-primary tabular-nums">{card.stat}</span>}
    </div>
  )
  if (card.type === 'submission') {
    return (
      <div data-ui="card" className={cn('rounded-xl border border-border bg-bg-surface p-4', className)} onClick={(e) => e.stopPropagation()}>
        {head}
        <SolutionCode card={card} postId={postId} />
      </div>
    )
  }
  const inner = (
    <div data-ui="card" className={cn('rounded-xl border border-border bg-bg-surface p-4', className)}>
      {head}
    </div>
  )
  return card.link?.startsWith('/') ? (
    <Link to={card.link} onClick={(e) => e.stopPropagation()} className="block rounded-xl transition-colors hover:[&>div]:border-border-strong">
      {inner}
    </Link>
  ) : (
    inner
  )
}

/** The solution's code, or (for people who haven't solved it) a Reveal step. */
function SolutionCode({ card, postId }: { card: ShareCard; postId?: number }) {
  const toast = useToast()
  const [code, setCode] = useState<string | null>(card.code ?? null)
  const [busy, setBusy] = useState(false)
  const reveal = async () => {
    if (!postId) return
    setBusy(true)
    try {
      const r = await api.post<{ code: string }>(`/api/social/posts/${postId}/reveal`)
      setCode(r.code)
    } catch (e) {
      toast.error("Couldn't show the code", errorText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-3">
      {code != null ? (
        <CodeBlock lang={(card.language ?? 'text').toLowerCase()} source={code} maxLines={18} />
      ) : card.locked ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-[13px] text-text-secondary">
          <span>{card.lines ? `${card.lines} ${card.lines === 1 ? 'line' : 'lines'} of ${card.language ?? 'code'}, hidden` : 'The code is hidden'} because you haven&rsquo;t solved this problem yet.</span>
          <button type="button" className="cursor-pointer font-medium text-text-primary underline underline-offset-[3px] disabled:opacity-60" onClick={reveal} disabled={busy || !postId}>
            {busy ? 'Showing…' : 'Reveal the code'}
          </button>
        </div>
      ) : null}
      {card.link?.startsWith('/') && (
        <Link to={card.link} className="mt-2.5 inline-block text-[13px] font-medium text-text-primary underline underline-offset-[3px]">
          Open the problem
        </Link>
      )}
    </div>
  )
}
