import { Check, Circle, CircleAlert, CircleDashed, Eye, Square, Timer, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * One status vocabulary for all of Hive: icon + word + colour, never colour
 * alone. Drawn as a hairline label: the word in ink, only the icon in the
 * state's colour. Domain statuses (task, agent, run, key) map onto it with toStatus().
 */
export type Status = 'queued' | 'planning' | 'running' | 'needs' | 'review' | 'done' | 'failed' | 'stopped' | 'limited'

const META: Record<Status, { label: string; color: string; Icon: typeof Circle | null }> = {
  queued: { label: 'Queued', color: 'var(--hv-text-3)', Icon: Circle },
  planning: { label: 'Planning', color: 'var(--hv-info)', Icon: CircleDashed },
  running: { label: 'Running', color: 'var(--hv-accent)', Icon: null },
  needs: { label: 'Needs you', color: 'var(--hv-accent)', Icon: CircleAlert },
  review: { label: 'In review', color: 'var(--hv-warning)', Icon: Eye },
  done: { label: 'Done', color: 'var(--hv-success)', Icon: Check },
  failed: { label: 'Failed', color: 'var(--hv-danger)', Icon: X },
  stopped: { label: 'Stopped', color: 'var(--hv-text-3)', Icon: Square },
  limited: { label: 'Limited', color: 'var(--hv-warning)', Icon: Timer },
}

/** Map any status string used across Hive onto the shared vocabulary. */
export function toStatus(s: string | null | undefined): Status {
  switch (s) {
    case 'queued':
    case 'pending':
    case 'idle':
      return 'queued'
    case 'planning':
    case 'starting':
      return 'planning'
    case 'running':
    case 'working':
    case 'in_progress':
    case 'busy':
      return 'running'
    case 'needs':
    case 'approval':
    case 'waiting':
      return 'needs'
    case 'review':
    case 'in_review':
      return 'review'
    case 'done':
    case 'ok':
    case 'committed':
    case 'pr_open':
    case 'merged':
    case 'completed':
    case 'success':
      return 'done'
    case 'failed':
    case 'error':
    case 'invalid':
      return 'failed'
    case 'stopped':
    case 'interrupted':
    case 'incomplete':
    case 'cancelled':
      return 'stopped'
    case 'limited':
    case 'cooling':
    case 'quota':
    case 'rate':
      return 'limited'
    default:
      return 'queued'
  }
}

export function StatusPill({ status, label, size = 'md', className }: { status: Status | string; label?: string; size?: 'sm' | 'md'; className?: string }) {
  const st = (status in META ? status : toStatus(status)) as Status
  const m = META[st]
  return (
    <span
      className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--hv-fill)] font-medium text-[var(--hv-text-2)]', size === 'sm' ? 'h-5 px-1.5 text-[11px]' : 'h-6 px-2 text-[12px]', className)}
    >
      {m.Icon ? <m.Icon className={size === 'sm' ? 'size-3' : 'size-3.5'} strokeWidth={2.2} style={{ color: m.color }} aria-hidden /> : <span className="hv-live size-1.5 rounded-full" style={{ background: m.color }} aria-hidden />}
      {label ?? m.label}
    </span>
  )
}
