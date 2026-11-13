import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { AgentRow, HiveKey, ProviderId, TaskStatus } from './types'

/* ── Vendors ──────────────────────────────────────────────────────────── */
const VENDOR: Record<string, { name: string; mark: string; hue: number; chroma?: number }> = {
  anthropic: { name: 'Claude', mark: 'C', hue: 45 },
  openai: { name: 'GPT', mark: 'G', hue: 165 },
  gemini: { name: 'Gemini', mark: 'Ge', hue: 258 },
  deepseek: { name: 'DeepSeek', mark: 'D', hue: 235 },
  xai: { name: 'Grok', mark: 'X', hue: 0, chroma: 0.01 },
  mistral: { name: 'Mistral', mark: 'M', hue: 40 },
  openrouter: { name: 'OpenRouter', mark: 'OR', hue: 275 },
  groq: { name: 'Groq', mark: 'Gq', hue: 22 },
  together: { name: 'Together', mark: 'T', hue: 210 },
  fireworks: { name: 'Fireworks', mark: 'F', hue: 12 },
  cerebras: { name: 'Cerebras', mark: 'Cb', hue: 30 },
  moonshot: { name: 'Kimi', mark: 'K', hue: 200 },
  qwen: { name: 'Qwen', mark: 'Q', hue: 290 },
  zhipu: { name: 'GLM', mark: 'Z', hue: 245 },
  perplexity: { name: 'Perplexity', mark: 'P', hue: 185 },
  github: { name: 'GitHub Models', mark: 'GH', hue: 220, chroma: 0.03 },
  nvidia: { name: 'NVIDIA NIM', mark: 'N', hue: 135 },
  sambanova: { name: 'SambaNova', mark: 'S', hue: 25 },
  huggingface: { name: 'Hugging Face', mark: 'HF', hue: 55 },
  cloudflare: { name: 'Workers AI', mark: 'CF', hue: 35 },
  ollama: { name: 'Ollama', mark: 'O', hue: 0, chroma: 0 },
  claude_code: { name: 'Claude Code', mark: 'CC', hue: 30 },
  codex: { name: 'Codex', mark: '>_', hue: 160 },
  auto: { name: 'Auto', mark: '✦', hue: 285 },
  custom: { name: 'Custom', mark: '◇', hue: 290, chroma: 0.03 },
  openai_compat: { name: 'Custom', mark: '◇', hue: 290, chroma: 0.03 },
}

export function vendorStyle(id: string) {
  const v = VENDOR[id] ?? { name: id, mark: id.slice(0, 1).toUpperCase(), hue: 260, chroma: 0.03 }
  return { ...v, color: `oklch(70% ${v.chroma ?? 0.14} ${v.hue})` }
}
export const vendorName = (id: string) => vendorStyle(id).name

/** Compatibility alias used across Hive components. */
export const PROVIDER_STYLE = new Proxy({} as Record<string, { hue: string; short: string; name: string }>, {
  get: (_t, id: string) => {
    const v = vendorStyle(id)
    return { hue: v.color, short: v.mark, name: v.name }
  },
})

export function ProviderGlyph({ provider, size = 'md', pulse, className }: { provider: ProviderId; size?: 'xs' | 'sm' | 'md' | 'lg'; pulse?: boolean; className?: string }) {
  const v = vendorStyle(provider)
  const dims = { xs: 'size-4 text-[7.5px] rounded-[5px]', sm: 'size-5 text-[9px] rounded-md', md: 'size-7 text-[10.5px] rounded-lg', lg: 'size-10 text-[13px] rounded-xl' }[size]
  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center font-semibold tracking-tight', dims, className)}
      style={{ color: v.color, background: `color-mix(in oklab, ${v.color} 14%, var(--color-bg-surface))` }}
      aria-label={v.name}
      title={v.name}
    >
      {v.mark}
      {pulse && <span className="hive-ping absolute -right-0.5 -top-0.5 size-2 rounded-full ring-2 ring-bg-app" style={{ background: v.color }} />}
    </span>
  )
}

/* ── Status ───────────────────────────────────────────────────────────── */
const STATUS: Record<string, { label: string; color: string }> = {
  queued: { label: 'Queued', color: 'var(--color-text-muted)' },
  running: { label: 'Working', color: 'var(--color-accent-brand)' },
  review: { label: 'Ready to review', color: 'var(--color-state-warning)' },
  done: { label: 'Done', color: 'var(--color-state-success)' },
  committed: { label: 'Committed', color: 'var(--color-state-info)' },
  pr_open: { label: 'PR open', color: 'var(--color-state-success)' },
  failed: { label: 'Failed', color: 'var(--color-state-error)' },
  stopped: { label: 'Stopped', color: 'var(--color-text-muted)' },
  interrupted: { label: 'Interrupted', color: 'var(--color-state-warning)' },
}
export const statusColor = (s: string) => STATUS[s]?.color ?? 'var(--color-text-muted)'
export const statusLabel = (s: string) => STATUS[s]?.label ?? s

export function StatusDot({ status, className }: { status: string; className?: string }) {
  return <span className={cn('inline-block size-2 shrink-0 rounded-full', status === 'running' && 'hive-dot-run', className)} style={{ background: statusColor(status) }} />
}

export function StatusPill({ status, className }: { status: TaskStatus | AgentRow['status'] | string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium', className)} style={{ color: statusColor(status) }}>
      <StatusDot status={status} className="size-1.5" />
      {statusLabel(status)}
    </span>
  )
}

/* ── Numbers & time ───────────────────────────────────────────────────── */
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
  if (s < 45) return 'now'
  if (s < 3600) return `${Math.round(s / 60)}m`
  if (s < 86400) return `${Math.round(s / 3600)}h`
  return `${Math.round(s / 86400)}d`
}

export function duration(from: number | null, to: number | null): string {
  if (!from) return ''
  const s = Math.max(0, ((to ?? Date.now()) - from) / 1000)
  if (s < 60) return `${Math.round(s)}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
  return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`
}

/* ── Budgets ──────────────────────────────────────────────────────────── */
export function keyShare(k: HiveKey): number | null {
  if (k.tokenLimit == null) return null
  return k.tokenLimit === 0 ? 0 : Math.max(0, Math.min(1, (k.remaining ?? 0) / k.tokenLimit))
}

export function shareTone(share: number | null): string {
  return share == null ? 'var(--color-text-muted)' : share < 0.1 ? 'var(--color-state-error)' : share < 0.3 ? 'var(--color-state-warning)' : 'var(--color-state-success)'
}

export function Meter({ value, color, className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn('h-1 overflow-hidden rounded-full bg-text-primary/8', className)} role="meter" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, background: color ?? 'var(--color-accent-brand)' }} />
    </div>
  )
}

export function TokenMeter({ k, compact }: { k: HiveKey; compact?: boolean }) {
  const share = keyShare(k)
  return (
    <div className={cn('min-w-0', compact ? 'w-20' : 'w-full')}>
      <Meter value={share ?? 1} color={share == null ? 'color-mix(in oklab, var(--color-text-muted) 40%, transparent)' : shareTone(share)} />
      {!compact && (
        <div className="mt-1.5 flex justify-between gap-2 text-[11.5px] tabular-nums text-text-muted">
          <span>{fmtTokens(k.used)} used</span>
          <span>{k.tokenLimit == null ? 'No limit' : `${fmtTokens(k.remaining)} left · ${k.limitPeriod === 'total' ? 'total' : `per ${k.limitPeriod}`}`}</span>
        </div>
      )}
    </div>
  )
}

/* ── People ───────────────────────────────────────────────────────────── */
export function UserDot({ username, size = 6, ring }: { username: string; size?: number; ring?: boolean }) {
  let h = 0
  for (const c of username) h = (h * 31 + c.charCodeAt(0)) % 360
  return (
    <span
      title={`@${username}`}
      className={cn('inline-grid shrink-0 place-items-center rounded-full font-semibold uppercase text-white', ring && 'ring-2 ring-bg-app')}
      style={{ width: size * 4, height: size * 4, fontSize: size * 1.7, background: `oklch(58% 0.12 ${h})` }}
    >
      {username.slice(0, 1)}
    </span>
  )
}

/* ── Layout bits ──────────────────────────────────────────────────────── */
export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-40', on ? 'bg-accent-brand' : 'bg-text-primary/15')}
    >
      <span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-[left] duration-200', on ? 'left-[18px]' : 'left-0.5')} />
    </button>
  )
}

export function PageTitle({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end gap-4">
      <div className="min-w-0 flex-[1_1_18rem]">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-text-primary">{title}</h1>
        {sub && <p className="mt-1 text-[14px] text-text-muted">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

export function Section({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('mb-10', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-medium text-text-secondary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export const MODE_INFO = {
  solo: { label: 'Solo', hint: 'One agent — or several sharing the same work — on one working copy.' },
  team: { label: 'Team', hint: 'A lead plans and hands sub-tasks to agents that run in parallel on one working copy.' },
  compare: { label: 'Race', hint: 'The same task goes to every agent, each on its own copy. Keep the best result.' },
  review: { label: 'Review', hint: 'Read-only agents audit the code and report findings.' },
  pipeline: { label: 'Pipeline', hint: 'Stages of agents run one after another — build, test, review, fix, ship.' },
} as const
