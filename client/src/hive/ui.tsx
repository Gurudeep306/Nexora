import type { ReactNode } from 'react'
import { StatusPill as KitStatusPill } from './kit/StatusPill'
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
  siliconflow: { name: 'SiliconFlow', mark: 'SF', hue: 265 },
  chutes: { name: 'Chutes', mark: 'Ch', hue: 140 },
  zai: { name: 'Z.ai (GLM)', mark: 'Z', hue: 245 },
  codestral: { name: 'Codestral', mark: 'Cs', hue: 40 },
  modelscope: { name: 'ModelScope', mark: 'MS', hue: 290 },
  ovh: { name: 'OVHcloud AI', mark: 'OV', hue: 225 },
  cohere: { name: 'Cohere', mark: 'Co', hue: 320 },
  pollinations: { name: 'Pollinations', mark: 'Po', hue: 100 },
  llm7: { name: 'LLM7', mark: 'L7', hue: 180 },
  vercel: { name: 'Vercel AI', mark: '▲', hue: 0, chroma: 0.01 },
  deepinfra: { name: 'DeepInfra', mark: 'DI', hue: 215 },
  hyperbolic: { name: 'Hyperbolic', mark: 'Hy', hue: 200 },
  nebius: { name: 'Nebius', mark: 'Nb', hue: 160 },
  novita: { name: 'Novita', mark: 'Nv', hue: 150 },
  scaleway: { name: 'Scaleway', mark: 'Sc', hue: 270 },
  featherless: { name: 'Featherless', mark: 'Fe', hue: 30 },
  minimax: { name: 'MiniMax', mark: 'Mx', hue: 350 },
  upstage: { name: 'Upstage Solar', mark: 'Up', hue: 60 },
  ollama_cloud: { name: 'Ollama Cloud', mark: 'OC', hue: 0, chroma: 0.01 },
  oneaiapikey: { name: 'OneAIAPIKey', mark: '1A', hue: 265 },
  farm: { name: 'Your GPU farm', mark: 'GPU', hue: 160, chroma: 0.12 },
  opencode_zen: { name: 'OpenCode Zen', mark: 'Zn', hue: 210 },
  kilo: { name: 'Kilo Gateway', mark: 'Ki', hue: 120 },
  claude_code: { name: 'Claude Code', mark: 'CC', hue: 30 },
  vibe: { name: 'Mistral Vibe', mark: 'MV', hue: 50 },
  codex: { name: 'Codex', mark: '>_', hue: 160 },
  auto: { name: 'Auto', mark: '✦', hue: 285 },
  custom: { name: 'Custom', mark: '◇', hue: 290, chroma: 0.03 },
  openai_compat: { name: 'Custom', mark: '◇', hue: 290, chroma: 0.03 },
}

export function vendorStyle(id: string) {
  const key = typeof id === 'string' ? id : ''
  const v = VENDOR[key] ?? { name: key, mark: key.slice(0, 1).toUpperCase() || '·', hue: 260, chroma: 0.03 }
  return { ...v, color: `oklch(70% ${v.chroma ?? 0.14} ${v.hue})` }
}
export const vendorName = (id: string) => vendorStyle(id).name

/** Compatibility alias used across Hive components. */
export const PROVIDER_STYLE = new Proxy({} as Record<string, { hue: string; short: string; name: string }>, {
  get: (_t, id: string | symbol) => {
    // React and dev tools probe objects with symbol keys: those aren't vendors.
    if (typeof id !== 'string') return undefined
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
  incomplete: { label: 'Incomplete', color: 'var(--color-state-warning)' },
  merged: { label: 'Merged', color: 'var(--color-state-success)' },
}
export const statusColor = (s: string) => STATUS[s]?.color ?? 'var(--color-text-muted)'
export const statusLabel = (s: string) => STATUS[s]?.label ?? s

export function StatusDot({ status, className }: { status: string; className?: string }) {
  return <span className={cn('inline-block size-2 shrink-0 rounded-full', status === 'running' && 'hive-dot-run', className)} style={{ background: statusColor(status) }} />
}

/** One status vocabulary: the kit pill (icon + word + colour), with Hive's own words. */
export function StatusPill({ status, className }: { status: TaskStatus | AgentRow['status'] | string; className?: string }) {
  return <KitStatusPill size="sm" status={status} label={STATUS[status]?.label} className={className} />
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

/** Time until a moment in the future: "4m", "2h", "3d" (null when unknown or past). */
export function until(t: number | string | null | undefined): string | null {
  if (t == null || t === '') return null
  const ms = typeof t === 'number' ? (t < 1e12 ? t * 1000 : t) : Date.parse(t)
  if (!Number.isFinite(ms)) return null
  const s = (ms - Date.now()) / 1000
  if (s <= 0) return null
  if (s < 60) return `${Math.ceil(s)}s`
  if (s < 3600) return `${Math.round(s / 60)}m`
  if (s < 86400) return `${Math.round(s / 3600)}h`
  return `${Math.round(s / 86400)}d`
}

export type PlanWindow = { utilization: number; resetsAt: number | null; status: string | null }
const WINDOW_LABEL: Record<string, string> = { five_hour: '5-hour window', seven_day: 'This week', seven_day_opus: 'This week · Opus', seven_day_sonnet: 'This week · Sonnet', primary: 'Short window', secondary: 'This week' }

/** Subscription plan windows (Claude / ChatGPT): how much of each window is used and when it resets. */
export function PlanWindows({ windows, compact }: { windows: Record<string, PlanWindow> | null | undefined; compact?: boolean }) {
  const list = Object.entries(windows ?? {}).sort(([a], [b]) => (a.includes('five') || a === 'primary' ? -1 : 1) - (b.includes('five') || b === 'primary' ? -1 : 1))
  if (!list.length) return <div className="text-[11.5px] text-text-muted">Plan usage appears after the first run.</div>
  return (
    <div className={cn('space-y-2', compact && 'space-y-1.5')}>
      {list.map(([id, w]) => {
        const reset = until(w.resetsAt)
        const used = reset || !w.resetsAt ? Math.max(0, Math.min(1, w.utilization > 1 ? w.utilization / 100 : w.utilization)) : 0
        const pct = Math.round(used * 100)
        const tone = w.status === 'rejected' || pct >= 95 ? 'var(--color-state-error)' : pct >= 75 ? 'var(--color-state-warning)' : 'var(--color-state-success)'
        return (
          <div key={id}>
            <div className="mb-1 flex justify-between gap-2 text-[11.5px] tabular-nums text-text-muted">
              <span>{WINDOW_LABEL[id] ?? id.replace(/_/g, ' ')}</span>
              <span>
                <span className="text-text-secondary">{w.status === 'rejected' ? 'limit reached' : `${pct}% used`}</span>
                {reset ? ` · resets in ${reset}` : ''}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-text-primary/[0.07]">
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: tone }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Budgets ──────────────────────────────────────────────────────────── */
export function keyShare(k: HiveKey): number | null {
  if (k.tokenLimit == null) return null
  return k.tokenLimit === 0 ? 0 : Math.max(0, Math.min(1, (k.remaining ?? 0) / k.tokenLimit))
}

export function shareTone(share: number | null): string {
  return share == null ? 'var(--color-text-muted)' : share < 0.1 ? 'var(--color-state-error)' : share < 0.3 ? 'var(--color-state-warning)' : 'var(--color-state-success)'
}

export function Meter({ value, color, className, label = 'Share' }: { value: number; color?: string; className?: string; label?: string }) {
  return (
    <div className={cn('h-1 overflow-hidden rounded-full bg-text-primary/8', className)} role="meter" aria-label={label} aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, background: color ?? 'var(--color-accent-brand)' }} />
    </div>
  )
}

export function TokenMeter({ k, compact }: { k: HiveKey; compact?: boolean }) {
  const share = keyShare(k)
  return (
    <div className={cn('min-w-0', compact ? 'w-20' : 'w-full')}>
      <Meter value={share ?? 0} color={share == null ? 'transparent' : shareTone(share)} />
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

/** Page title in the site's style: icon badge, display title, subtitle, actions on the right. */
/**
 * The Hive page header (same as the kit's PageHead): a 26px title, one short
 * line and the page's actions. The icon tile of the old header is gone — the
 * sidebar already shows where you are.
 */
export function PageTitle({ title, sub, children }: { title: ReactNode; sub?: ReactNode; icon?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col items-start gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[var(--hv-text-1)]">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-[13.5px] text-[var(--hv-text-3)] text-pretty">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-1.5">{children}</div>}
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

/**
 * An icon tile like Nexora's feature cards: a rounded square tinted by `hue`
 * (OKLCH hue angle), with a soft border and the icon in the same colour.
 */
export function IconTile({ hue, size = 40, className, children }: { hue: number; size?: number; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-[var(--radius-control,12px)] border [&_svg]:size-[46%]', className)}
      style={{ width: size, height: size, background: `oklch(62% 0.13 ${hue} / 0.14)`, borderColor: `oklch(62% 0.13 ${hue} / 0.32)`, color: `color-mix(in oklab, oklch(66% 0.15 ${hue}) 82%, var(--color-text-primary))` }}
    >
      {children}
    </span>
  )
}

/** Midnight UTC — when most providers' daily free limits reset. */
function nextUtcMidnight() {
  const d = new Date()
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)
}

/**
 * The limit of one connection, always: the provider's live numbers when it
 * sends them, a plan's usage windows for subscriptions, else the free tier's
 * daily allowance against what Hive used today, else the budget you set.
 */
export function LimitBar({ k, compact = false }: { k: HiveKey; compact?: boolean }) {
  const rl = k.rateLimit
  const plan = (rl as unknown as { plan?: boolean; windows?: Record<string, PlanWindow> } | null)?.plan ? (rl as unknown as { windows: Record<string, PlanWindow> }).windows : null
  if (plan && Object.keys(plan).length) return <PlanWindows windows={plan} compact={compact} />
  // Any connection the provider has stopped for now: say so, with when it frees up.
  if (k.limitUntil && k.limitUntil > Date.now()) {
    return (
      <div className={cn(compact ? 'text-[11px]' : 'text-[11.5px]')}>
        <div className="mb-1 flex justify-between gap-2">
          <span className="font-medium text-state-error">Limit reached</span>
          <span className="text-text-secondary">frees up in {until(k.limitUntil)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-state-error/70" />
        <div className="mt-1 truncate text-[10.5px] text-text-muted" title={k.limitNote ?? ''}>
          Hive moves work to other models until then{k.limitNote ? ` · ${k.limitNote}` : ''}
        </div>
      </div>
    )
  }
  if (k.subscription) {
    // Claude publishes plan usage (5-hour / weekly windows); Codex and Mistral Vibe don't,
    // so show what Hive used on this plan today instead of an empty bar.
    const runs = k.todayRequests ?? 0
    const toks = k.todayTokens ?? 0
    const claude = k.provider === 'claude_code'
    return (
      <div className={cn('text-text-muted', compact ? 'text-[11px]' : 'text-[11.5px]')}>
        <div className="mb-1 flex justify-between gap-2">
          <span>{claude ? 'Plan usage' : 'Used today'}</span>
          <span className="text-text-secondary">
            {claude && !runs ? 'not measured yet' : `${fmtTokens(runs)} run${runs === 1 ? '' : 's'}${toks ? ` · ${fmtTokens(toks)} tokens` : ''}`}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-text-primary/[0.07]">
          {runs > 0 && <div className="h-full rounded-full bg-state-success/70" style={{ width: `${Math.min(100, 8 + runs * 4)}%` }} />}
        </div>
        <div className="mt-1 text-[10.5px]">
          {claude
            ? 'Press Refresh usage, or it fills in after this account’s first run'
            : `${k.provider === 'vibe' ? 'Mistral' : 'OpenAI'} doesn’t share plan limits — Hive shows its own use, and warns here the moment the plan says stop`}
        </div>
      </div>
    )
  }
  const fresh = !!rl && !!k.rateLimitAt && Date.now() - k.rateLimitAt < 10 * 60_000 && !(rl.resetAt && Date.parse(rl.resetAt) < Date.now())
  let label = ''
  let left = ''
  let used: number | null = null
  let foot = ''
  if (fresh && (rl!.requestsLimit || rl!.tokensLimit)) {
    const tok = rl!.tokensLimit != null
    const lim = tok ? rl!.tokensLimit! : rl!.requestsLimit!
    const rem = tok ? (rl!.tokensRemaining ?? 0) : (rl!.requestsRemaining ?? 0)
    label = 'Provider limit (live)'
    left = `${fmtTokens(rem)} / ${fmtTokens(lim)} ${tok ? 'tokens' : 'requests'} left`
    used = 1 - rem / Math.max(1, lim)
    foot = rl!.resetAt ? `resets in ${until(Date.parse(rl!.resetAt))}` : ''
  } else if (k.freeLimit && (k.freeLimit.rpd || k.freeLimit.tpd)) {
    const byTokens = !k.freeLimit.rpd
    const lim = byTokens ? k.freeLimit.tpd! : k.freeLimit.rpd!
    const u = byTokens ? (k.todayTokens ?? 0) : (k.todayRequests ?? 0)
    label = 'Free daily limit'
    left = `${fmtTokens(u)} / ${fmtTokens(lim)} ${byTokens ? 'tokens' : 'requests'} today`
    used = u / Math.max(1, lim)
    foot = `about · resets in ${until(nextUtcMidnight())}${k.freeLimit.rpm ? ` · ${k.freeLimit.rpm}/min` : ''}`
  } else if (k.tokenLimit != null) {
    label = 'Your budget'
    left = `${fmtTokens(k.remaining ?? 0)} / ${fmtTokens(k.tokenLimit)} left`
    used = k.used / Math.max(1, k.tokenLimit)
    foot = k.periodEnds ? `resets in ${until(k.periodEnds)}` : ''
  } else if (k.freeLimit) {
    label = 'Free limit'
    left = `${fmtTokens(k.todayRequests ?? 0)} requests today`
    foot = k.freeLimit.note
  } else {
    label = 'Limit'
    left = `${fmtTokens(k.todayRequests ?? 0)} requests · ${fmtTokens(k.todayTokens ?? 0)} tokens today`
    foot = 'No fixed limit · set a budget to cap it'
  }
  const pct = used == null ? null : Math.min(100, Math.max(0, used * 100))
  const tone = used == null ? 'var(--color-text-muted)' : used > 0.9 ? 'var(--color-state-error)' : used > 0.7 ? 'var(--color-state-warning)' : 'var(--color-state-success)'
  return (
    <div title={k.freeLimit?.note}>
      <div className={cn('mb-1 flex justify-between gap-2 tabular-nums text-text-muted', compact ? 'text-[11px]' : 'text-[11.5px]')}>
        <span>{label}</span>
        <span className="truncate text-text-secondary">{left}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-text-primary/[0.07]">{pct != null && <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`, background: tone }} />}</div>
      {foot && <div className={cn('mt-1 truncate text-text-muted', compact ? 'text-[10.5px]' : 'text-[10.5px]')}>{foot}</div>}
    </div>
  )
}
