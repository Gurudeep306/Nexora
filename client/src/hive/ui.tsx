import { cn } from '@/lib/utils'
import type { AgentRow, HiveKey, ProviderId, TaskStatus } from './types'

export const PROVIDER_STYLE: Record<ProviderId, { hue: string; short: string; name: string }> = {
  anthropic: { hue: 'oklch(72% 0.13 48)', short: 'C', name: 'Claude' },
  openai: { hue: 'oklch(74% 0.13 165)', short: 'G', name: 'GPT' },
  gemini: { hue: 'oklch(71% 0.15 258)', short: 'Ge', name: 'Gemini' },
  openai_compat: { hue: 'oklch(72% 0.06 290)', short: '◇', name: 'Compatible' },
}

export function ProviderGlyph({ provider, size = 'md', pulse, className }: { provider: ProviderId; size?: 'xs' | 'sm' | 'md' | 'lg'; pulse?: boolean; className?: string }) {
  const s = PROVIDER_STYLE[provider] ?? PROVIDER_STYLE.openai_compat
  const dims = { xs: 'size-4 text-[8px] rounded-[5px]', sm: 'size-5 text-[9px] rounded-md', md: 'size-7 text-[11px] rounded-lg', lg: 'size-10 text-sm rounded-xl' }[size]
  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center font-semibold tracking-tight', dims, className)}
      style={{
        color: s.hue,
        background: `color-mix(in oklab, ${s.hue} 16%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${s.hue} 38%, transparent)`,
      }}
      aria-label={s.name}
    >
      {s.short}
      {pulse && <span className="hive-ping absolute -right-0.5 -top-0.5 size-2 rounded-full" style={{ background: s.hue }} />}
    </span>
  )
}

const STATUS: Record<string, { label: string; tone: string }> = {
  queued: { label: 'Queued', tone: 'text-text-muted bg-text-primary/6' },
  running: { label: 'Running', tone: 'text-accent-brand bg-accent-brand/12' },
  review: { label: 'Ready for review', tone: 'text-state-warning bg-state-warning/12' },
  done: { label: 'Done', tone: 'text-state-success bg-state-success/12' },
  committed: { label: 'Committed', tone: 'text-state-info bg-state-info/12' },
  pr_open: { label: 'PR open', tone: 'text-state-success bg-state-success/12' },
  failed: { label: 'Failed', tone: 'text-state-error bg-state-error/12' },
  stopped: { label: 'Stopped', tone: 'text-text-muted bg-text-primary/6' },
  interrupted: { label: 'Interrupted', tone: 'text-state-warning bg-state-warning/12' },
}

export function StatusPill({ status, className }: { status: TaskStatus | AgentRow['status'] | string; className?: string }) {
  const s = STATUS[status] ?? { label: status, tone: 'text-text-muted bg-text-primary/6' }
  return (
    <span className={cn('inline-flex h-5 items-center gap-1.5 rounded-full px-2 text-[11px] font-medium whitespace-nowrap', s.tone, className)}>
      <span className={cn('size-1.5 rounded-full bg-current', status === 'running' ? 'hive-dot-run' : 'opacity-70')} />
      {s.label}
    </span>
  )
}

export function fmtTokens(n: number | null | undefined): string {
  if (n == null) return '∞'
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k`
  return String(n)
}

export function fmtCost(micros: number | undefined | null): string | null {
  if (!micros) return null
  const d = micros / 1e6
  return d < 0.01 ? '<$0.01' : `$${d.toFixed(d < 10 ? 2 : 0)}`
}

export function timeAgo(t: number | null | undefined): string {
  if (!t) return ''
  const s = Math.max(0, (Date.now() - t) / 1000)
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

export function duration(from: number | null, to: number | null): string {
  if (!from) return ''
  const s = Math.max(0, ((to ?? Date.now()) - from) / 1000)
  if (s < 60) return `${Math.round(s)}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
  return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`
}

/** Share of a key's budget left: 0..1, or null when unlimited. */
export function keyShare(k: HiveKey): number | null {
  if (k.tokenLimit == null) return null
  return k.tokenLimit === 0 ? 0 : Math.max(0, Math.min(1, (k.remaining ?? 0) / k.tokenLimit))
}

export function shareTone(share: number | null): string {
  return share == null ? 'var(--color-state-info)' : share < 0.1 ? 'var(--color-state-error)' : share < 0.3 ? 'var(--color-state-warning)' : 'var(--color-state-success)'
}

export function TokenMeter({ k, compact }: { k: HiveKey; compact?: boolean }) {
  const share = keyShare(k)
  const pct = share == null ? 100 : Math.round(share * 100)
  return (
    <div className={cn('min-w-0', compact ? 'w-24' : 'w-full')}>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-text-primary/8" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Token budget left">
        <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: shareTone(share), opacity: share == null ? 0.45 : 1 }} />
      </div>
      {!compact && (
        <div className="mt-1 flex justify-between gap-2 text-[11px] tabular-nums text-text-muted">
          <span>
            {fmtTokens(k.used)} used{k.tokenLimit != null ? ` of ${fmtTokens(k.tokenLimit)}` : ''}
          </span>
          <span>{k.tokenLimit == null ? 'no limit' : `${fmtTokens(k.remaining)} left · ${k.limitPeriod === 'total' ? 'total' : `per ${k.limitPeriod}`}`}</span>
        </div>
      )}
    </div>
  )
}

export function UserDot({ username, size = 6, ring }: { username: string; size?: number; ring?: boolean }) {
  let h = 0
  for (const c of username) h = (h * 31 + c.charCodeAt(0)) % 360
  return (
    <span
      title={`@${username}`}
      className={cn('inline-grid shrink-0 place-items-center rounded-full font-semibold uppercase text-white', ring && 'ring-2 ring-bg-app')}
      style={{ width: size * 4, height: size * 4, fontSize: size * 1.7, background: `oklch(60% 0.13 ${h})` }}
    >
      {username.slice(0, 1)}
    </span>
  )
}

export const MODE_INFO = {
  solo: { label: 'Solo', hint: 'One agent does the whole task.' },
  team: { label: 'Team', hint: 'A lead plans and delegates sub-tasks to agents running in parallel on one working copy.' },
  compare: { label: 'Compare', hint: 'Each agent attempts the task on its own copy. Pick the best result.' },
  review: { label: 'Review', hint: 'Read-only agents audit the code and report findings.' },
} as const
