/* ────────────────────────────────────────────────────────────────────────
   Budgets & spend: where the tokens go (by day, provider, model, project,
   person), spending caps that warn or pause work, and budget alerts.
   ──────────────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { StackedBars } from '../kit'
import { AlertTriangle, Bell, BellOff, CheckCheck, Coins, Gauge, Globe2, Info, Lock, Plus, ShieldAlert, ShieldCheck, Sparkles, Trash2, XCircle, Zap, Wallet } from 'lucide-react'
import { AnimatedNumber, Button, ConfirmDialog, Input, Modal, Select, Tabs, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { AgentMark, FAMILY, familyOf } from '../agents'
import { errMsg } from '../Improve'
import { projectColor } from '../projectColor'
import { useHive } from '../store'
import type { Bootstrap, Cap, HiveAlert, Spend, SpendRow } from '../types'
import { PageTitle, ProviderGlyph, Section, UserDot, fmtTokens, timeAgo, vendorName } from '../ui'

const EASE = [0.2, 0.8, 0.2, 1] as const
const PERIODS = [7, 30, 90] as const
type Period = (typeof PERIODS)[number]

/* Series colours: one fixed hue per series, never cycled. */
const SERIES = [
  { key: 'input', label: 'Input', color: 'var(--chart-1)' },
  { key: 'output', label: 'Output', color: 'var(--chart-3)' },
  { key: 'cached', label: 'Cached', color: 'var(--chart-4)' },
] as const

const tot = (r: Pick<SpendRow, 'input' | 'output' | 'cached'>) => r.input + r.output + r.cached

function fmtDollars(d: number | null | undefined): string {
  if (!d) return '$0'
  if (d < 0.01) return '<$0.01'
  return `$${d.toLocaleString(undefined, { minimumFractionDigits: d < 100 ? 2 : 0, maximumFractionDigits: d < 100 ? 2 : 0 })}`
}

function parseTokens(s: string): number | null {
  const m = s.trim().toLowerCase().replace(/,/g, '').match(/^(\d+(?:\.\d+)?)\s*([kmb])?$/)
  if (!m) return null
  const n = Number(m[1]) * (m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : m[2] === 'b' ? 1e9 : 1)
  return n > 0 ? Math.round(n) : null
}

/** Vendors whose usage costs nothing extra: free tiers and flat-rate plans. */
function freeVendors(boot: Bootstrap): Set<string> {
  const s = new Set<string>()
  for (const k of boot.keys) if (k.freeTier || k.subscription) s.add(k.provider)
  for (const p of boot.catalogue.providers) if (p.subscription) s.add(p.id)
  return s
}

const providerLabel = (boot: Bootstrap, id: string) => boot.catalogue.providers.find((p) => p.id === id)?.label ?? vendorName(id)
const projectName = (boot: Bootstrap, id: string | null) => (!id ? 'Chats (no project)' : (boot.projects.find((p) => p.id === id)?.name ?? 'Deleted project'))

function capScopeLabel(boot: Bootstrap, c: Pick<Cap, 'scopeType' | 'scope'>): string {
  switch (c.scopeType) {
    case 'all':
      return 'All of Hive'
    case 'project':
      return projectName(boot, c.scope)
    case 'vendor':
      return providerLabel(boot, c.scope)
    case 'user':
      return `@${c.scope}`
    default:
      return c.scope
  }
}

export default function BudgetsPage() {
  const { boot, on } = useHive()
  const toast = useToast()
  const [days, setDays] = useState<Period>(30)
  const [spend, setSpend] = useState<Spend | null>(null)
  const [caps, setCaps] = useState<Cap[] | null>(null)
  const [alerts, setAlerts] = useState<{ alerts: HiveAlert[]; unread: number } | null>(null)
  const [adding, setAdding] = useState(false)

  const loadSpend = useCallback(() => hiveApi.spend(days).then(setSpend).catch(() => {}), [days])
  const loadCaps = useCallback(() => hiveApi.caps().then((r) => setCaps(r.caps)).catch(() => {}), [])
  const loadAlerts = useCallback(() => hiveApi.alerts().then(setAlerts).catch(() => {}), [])

  useEffect(() => {
    loadSpend()
  }, [loadSpend])
  useEffect(() => {
    loadCaps()
    loadAlerts()
  }, [loadCaps, loadAlerts])

  // Live: usage arrives in bursts while agents work, so coalesce refetches.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const soon = () => {
      if (timer.current) return
      timer.current = setTimeout(() => {
        timer.current = null
        loadSpend()
        loadCaps()
      }, 2500)
    }
    const offs = [on('usage', soon), on('caps', () => loadCaps()), on('alert', () => loadAlerts())]
    return () => {
      offs.forEach((f) => f())
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
    }
  }, [on, loadSpend, loadCaps, loadAlerts])

  if (!boot) return null
  const admin = boot.me.admin

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
      <PageTitle icon={<Wallet />} title="Budgets & spend" sub="See where every token goes, and set limits so nothing runs away with the bill.">
        <div role="radiogroup" aria-label="Period" className="flex rounded-xl bg-text-primary/[0.05] p-1">
          {PERIODS.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={days === d}
              onClick={() => setDays(d)}
              className={cn('h-8 min-w-[72px] rounded-lg px-3 text-[13px] tabular-nums transition-colors', days === d ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary')}
            >
              {d} days
            </button>
          ))}
        </div>
      </PageTitle>

      <Headline boot={boot} spend={spend} />
      <DailyChart spend={spend} days={days} />
      <Breakdown boot={boot} spend={spend} />

      <Section
        title={
          <span className="flex items-center gap-2">
            <Gauge className="size-4 text-accent-brand" /> Spending caps
          </span>
        }
        action={
          admin ? (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus /> Add a cap
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-text-muted">
              <Lock className="size-3.5" /> Only admins can change caps
            </span>
          )
        }
      >
        <CapsList boot={boot} caps={caps} admin={admin} onAdd={() => setAdding(true)} onChanged={loadCaps} />
      </Section>

      <Section
        title={
          <span className="flex items-center gap-2">
            <Bell className="size-4 text-accent-brand" /> Alerts
            {!!alerts?.unread && <span className="rounded-full bg-accent-brand/15 px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-accent-brand">{alerts.unread} new</span>}
          </span>
        }
        action={
          !!alerts?.unread && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                hiveApi
                  .readAlerts()
                  .then(loadAlerts)
                  .catch((e) => toast.error(errMsg(e)))
              }
            >
              <CheckCheck /> Mark all read
            </Button>
          )
        }
      >
        <AlertsList alerts={alerts?.alerts ?? null} />
      </Section>

      <AddCap open={adding} onClose={() => setAdding(false)} boot={boot} onAdded={loadCaps} />
    </div>
  )
}

/* ── Headline tiles ───────────────────────────────────────────────────── */
function Headline({ boot, spend }: { boot: Bootstrap; spend: Spend | null }) {
  const t = useMemo(() => {
    if (!spend) return null
    const free = freeVendors(boot)
    let tokens = 0
    let freeTokens = 0
    let dollars = 0
    let requests = 0
    for (const r of spend.byVendor) {
      const n = tot(r)
      tokens += n
      dollars += r.dollars
      requests += r.requests
      if (free.has(r.key)) freeTokens += n
    }
    return { tokens, dollars, requests, freeShare: tokens ? freeTokens / tokens : 0, freeTokens }
  }, [boot, spend])

  const tiles: { label: string; icon: ReactNode; hue: number; value: number; format: (n: number) => string; hint: string }[] = [
    { label: 'Tokens', icon: <Sparkles className="size-4" />, hue: 285, value: t?.tokens ?? 0, format: (n) => fmtTokens(Math.round(n)), hint: 'Input, output and cached tokens across every model.' },
    { label: 'Estimated spend', icon: <Coins className="size-4" />, hue: 80, value: t?.dollars ?? 0, format: (n) => fmtDollars(n), hint: 'Based on list prices. Free tiers and plans count as $0.' },
    {
      label: 'On free & plan models',
      icon: <Zap className="size-4" />,
      hue: 155,
      value: (t?.freeShare ?? 0) * 100,
      format: (n) => `${Math.round(n)}%`,
      hint: 'Share of tokens on free tiers or flat-rate subscriptions (Claude Code, Codex…) — work that adds nothing to the bill. Approximate.',
    },
    { label: 'Requests', icon: <Globe2 className="size-4" />, hue: 220, value: t?.requests ?? 0, format: (n) => Math.round(n).toLocaleString(), hint: 'Model calls made by chats and agents.' },
  ]
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((x, i) => (
        <motion.div key={x.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: i * 0.04, ease: EASE }} className="hive-card p-4">
          <div className="flex items-center gap-2">
            <span className="hive-tile size-8" style={{ ['--tile' as string]: `oklch(68% 0.13 ${x.hue})` }}>
              {x.icon}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-text-muted">{x.label}</span>
            <Tooltip label={x.hint}>
              <button type="button" aria-label={`About ${x.label}`} className="grid size-7 place-items-center rounded-full text-text-muted hover:text-text-secondary">
                <Info className="size-3.5" />
              </button>
            </Tooltip>
          </div>
          {t ? (
            <AnimatedNumber value={x.value} format={x.format} className="mt-3 block text-[26px] font-semibold tracking-[-0.02em] text-text-primary" />
          ) : (
            <div className="hive-shimmer mt-3 h-8 w-24 rounded-lg" />
          )}
          {x.label === 'On free & plan models' && t && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-text-primary/8">
              <motion.div className="h-full rounded-full" style={{ background: 'oklch(68% 0.13 155)' }} initial={{ width: 0 }} animate={{ width: `${Math.round(t.freeShare * 100)}%` }} transition={{ duration: 0.8, ease: EASE }} />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}

/* ── Daily chart ──────────────────────────────────────────────────────── */
function DailyChart({ spend, days }: { spend: Spend | null; days: number }) {
  const data = useMemo(() => {
    const byKey = new Map((spend?.byDay ?? []).map((r) => [String(r.key), r]))
    const out: { day: string; label: string; input: number; output: number; cached: number; dollars: number; requests: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400e3).toISOString().slice(0, 10)
      const r = byKey.get(d)
      const label = new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      out.push({ day: d, label, input: r?.input ?? 0, output: r?.output ?? 0, cached: r?.cached ?? 0, dollars: r?.dollars ?? 0, requests: r?.requests ?? 0 })
    }
    return out
  }, [spend, days])
  const totals = useMemo(() => Object.fromEntries(SERIES.map((s) => [s.key, data.reduce((a, d) => a + d[s.key], 0)])) as Record<(typeof SERIES)[number]['key'], number>, [data])
  const empty = spend && data.every((d) => !tot(d))

  return (
    <div className="hive-card mb-10 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <h2 className="mr-auto text-[14px] font-semibold text-text-primary">Tokens per day</h2>
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[12px] text-text-secondary">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
            <span className="tabular-nums text-text-muted">{fmtTokens(totals[s.key])}</span>
          </span>
        ))}
      </div>
      <div className="relative min-h-[232px]">
        {!spend ? (
          <div className="hive-shimmer h-[232px] w-full rounded-xl" />
        ) : (
          <StackedBars
            ariaLabel={`Tokens per day, last ${days} days`}
            rows={data}
            series={SERIES.map((x) => ({ key: x.key, label: x.label, color: x.color }))}
            value={(d, k) => Number(d[k as (typeof SERIES)[number]['key']] ?? 0)}
            label={(d) => d.label}
            yFormat={fmtTokens}
            height={232}
            tip={(d) => (
              <>
                <div className="mb-1.5 font-medium text-text-primary">{new Date(`${d.day}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                {SERIES.map((x) => (
                  <div key={x.key} className="flex items-center gap-2 text-text-secondary">
                    <span className="size-2 rounded-sm" style={{ background: x.color }} />
                    <span className="flex-1">{x.label}</span>
                    <span className="tabular-nums text-text-primary">{fmtTokens(d[x.key])}</span>
                  </div>
                ))}
                <div className="mt-1.5 flex justify-between border-t hive-line pt-1.5 text-text-muted">
                  <span className="tabular-nums">{d.requests.toLocaleString()} requests</span>
                  <span className="tabular-nums">{fmtDollars(d.dollars)}</span>
                </div>
              </>
            )}
          />
        )}
        {empty && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="rounded-2xl bg-bg-surface/80 px-4 py-3 text-center backdrop-blur-sm">
              <div className="text-[13.5px] font-medium text-text-primary">No usage in this period</div>
              <div className="text-[12px] text-text-muted">Start a chat or a session and its tokens show up here within seconds.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Breakdown ────────────────────────────────────────────────────────── */
type Dim = 'vendor' | 'model' | 'project' | 'user'

function Breakdown({ boot, spend }: { boot: Bootstrap; spend: Spend | null }) {
  const [dim, setDim] = useState<Dim>('vendor')
  const free = useMemo(() => freeVendors(boot), [boot])
  const rows = spend ? { vendor: spend.byVendor, model: spend.byModel, project: spend.byProject, user: spend.byUser }[dim] : null
  const max = Math.max(1, ...(rows ?? []).map(tot))

  const ident = (r: SpendRow): { icon: ReactNode; name: string; sub?: string } => {
    const key = r.key ?? ''
    if (dim === 'vendor') return { icon: <ProviderGlyph provider={key} size="md" />, name: providerLabel(boot, key), sub: free.has(key) ? 'Free / plan' : undefined }
    if (dim === 'model') {
      const f = familyOf('', key)
      return { icon: <AgentMark provider="" model={key} size={28} />, name: key || 'Unknown model', sub: f !== 'generic' ? FAMILY[f].name : undefined }
    }
    if (dim === 'project') {
      const p = boot.projects.find((x) => x.id === key)
      return {
        icon: <span className="hive-tile size-7" style={{ ['--tile' as string]: p ? projectColor(p.color) : 'var(--color-text-muted)' }}>{p ? <span className="rounded-full size-2.5" style={{ background: projectColor(p.color) }} /> : <Sparkles className="size-3.5" />}</span>,
        name: projectName(boot, key || null),
      }
    }
    const m = boot.members.find((x) => x.username === key)
    return { icon: <UserDot username={key || '?'} size={7} />, name: m?.display_name || `@${key || 'unknown'}`, sub: m?.display_name ? `@${key}` : undefined }
  }

  return (
    <Section title="Where it goes">
      <div className="hive-card overflow-hidden">
        <div className="px-3 pt-2 sm:px-4">
          <Tabs
            active={dim}
            onChange={(id) => setDim(id as Dim)}
            items={[
              { id: 'vendor', label: 'Providers' },
              { id: 'model', label: 'Models' },
              { id: 'project', label: 'Projects' },
              { id: 'user', label: 'People' },
            ]}
          />
        </div>
        <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_80px_80px] gap-4 px-5 pt-3 text-[11px] font-medium uppercase tracking-wide text-text-muted sm:grid">
          <span>Name</span>
          <span>Tokens</span>
          <span className="text-right">Est. $</span>
          <span className="text-right">Requests</span>
        </div>
        <div className="p-2 sm:p-3">
          {!rows && [0, 1, 2, 3].map((i) => <div key={i} className="hive-shimmer m-2 h-10 rounded-xl" />)}
          {rows && !rows.length && <p className="px-3 py-8 text-center text-[13px] text-text-muted">Nothing here yet for this period.</p>}
          <AnimatePresence mode="popLayout" initial={false}>
            {rows?.map((r, i) => {
              const id = ident(r)
              const n = tot(r)
              return (
                <motion.div
                  key={`${dim}:${r.key}`}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.02, ease: EASE }}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-xl px-3 py-2.5 hover:bg-text-primary/[0.03] sm:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_80px_80px]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {id.icon}
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] text-text-primary">{id.name}</div>
                      {id.sub && <div className="truncate text-[11.5px] text-text-muted">{id.sub}</div>}
                    </div>
                  </div>
                  <div className="col-span-2 row-start-2 flex items-center gap-3 sm:col-span-1 sm:row-start-auto">
                    <Tooltip label={`${fmtTokens(r.input)} in · ${fmtTokens(r.output)} out · ${fmtTokens(r.cached)} cached`}>
                      <div className="flex h-2 flex-1 gap-[2px] overflow-hidden rounded-full bg-text-primary/[0.06]">
                        {SERIES.map((s) => (
                          <motion.div key={s.key} className="h-full first:rounded-l-full last:rounded-r-full" style={{ background: s.color }} initial={{ width: 0 }} animate={{ width: `${(r[s.key] / max) * 100}%` }} transition={{ duration: 0.6, ease: EASE }} />
                        ))}
                      </div>
                    </Tooltip>
                    <span className="w-12 text-right text-[12.5px] tabular-nums text-text-secondary">{fmtTokens(n)}</span>
                  </div>
                  <span className="text-right text-[12.5px] tabular-nums text-text-secondary">{fmtDollars(r.dollars)}</span>
                  <span className="hidden text-right text-[12.5px] tabular-nums text-text-muted sm:block">{r.requests.toLocaleString()}</span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </Section>
  )
}

/* ── Caps ─────────────────────────────────────────────────────────────── */
function Ring({ pct, size = 52 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, pct))
  const color = pct >= 1 ? 'var(--color-state-error)' : pct >= 0.8 ? 'var(--color-state-warning)' : 'var(--color-state-success)'
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} role="meter" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Used">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} stroke="color-mix(in oklab, var(--color-text-primary) 9%, transparent)" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} strokeLinecap="round" stroke={color} strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - v) }} transition={{ duration: 0.9, ease: EASE }} />
      </svg>
      <span className="absolute text-[11.5px] font-semibold tabular-nums text-text-primary">{Math.round(pct * 100)}%</span>
    </span>
  )
}

function ScopeIcon({ boot, c }: { boot: Bootstrap; c: Cap }) {
  if (c.scopeType === 'vendor') return <ProviderGlyph provider={c.scope} size="sm" />
  if (c.scopeType === 'model') return <AgentMark provider="" model={c.scope} size={20} />
  if (c.scopeType === 'user') return <UserDot username={c.scope} size={5} />
  if (c.scopeType === 'project') {
    const p = boot.projects.find((x) => x.id === c.scope)
    return <span className="rounded-full size-3" style={{ background: p ? projectColor(p.color) : 'var(--color-text-muted)' }} />
  }
  return <Globe2 className="size-4 text-accent-brand" />
}

function CapsList({ boot, caps, admin, onAdd, onChanged }: { boot: Bootstrap; caps: Cap[] | null; admin: boolean; onAdd: () => void; onChanged: () => void }) {
  const toast = useToast()
  const [del, setDel] = useState<Cap | null>(null)
  const [busy, setBusy] = useState(false)
  if (!caps)
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="hive-shimmer h-24 rounded-2xl" />
        ))}
      </div>
    )
  if (!caps.length)
    return (
      <div className="hive-card flex flex-col items-center gap-2 border-dashed px-6 py-10 text-center">
        <span className="hive-tile size-11" style={{ ['--tile' as string]: 'var(--color-accent-brand)' }}>
          <ShieldCheck className="size-5" />
        </span>
        <div className="mt-1 text-[14px] font-medium text-text-primary">No caps yet</div>
        <p className="max-w-md text-[12.5px] text-text-muted">
          A cap limits tokens or dollars per day or month — for one project, provider, model, person or all of Hive. It can <b className="font-medium text-text-secondary">warn</b> everyone at 80% and 100%, or <b className="font-medium text-text-secondary">pause</b> new model calls until the period resets.
        </p>
        {admin ? (
          <Button size="sm" className="mt-2" onClick={onAdd}>
            <Plus /> Add your first cap
          </Button>
        ) : (
          <p className="mt-1 text-[12px] text-text-muted">Ask an admin to add one.</p>
        )}
      </div>
    )
  return (
    <>
      <motion.div layout className="grid gap-3 md:grid-cols-2">
        <AnimatePresence initial={false}>
          {caps.map((c, i) => {
            const over = c.pct >= 1
            return (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.22, delay: i * 0.03, ease: EASE }}
                className={cn('hive-card flex items-center gap-4 p-4', over && 'ring-1 ring-state-error/30')}
              >
                <Ring pct={c.pct} />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <ScopeIcon boot={boot} c={c} />
                    <span className="truncate text-[14px] font-medium text-text-primary">{capScopeLabel(boot, c)}</span>
                    <span
                      className={cn('ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', c.action === 'block' ? 'bg-state-error/12 text-state-error' : 'bg-state-warning/15 text-state-warning')}
                    >
                      {c.action === 'block' ? <ShieldAlert className="size-3" /> : <Bell className="size-3" />}
                      {c.action === 'block' ? 'Pauses work' : 'Warns only'}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-[12px] tabular-nums text-text-muted">
                    {c.tokens != null && (
                      <div>
                        <span className="text-text-secondary">{fmtTokens(c.usedTokens)}</span> of {fmtTokens(c.tokens)} tokens per {c.period}
                      </div>
                    )}
                    {c.dollars != null && (
                      <div>
                        <span className="text-text-secondary">{fmtDollars(c.usedDollars)}</span> of {fmtDollars(c.dollars)} per {c.period}
                      </div>
                    )}
                    <div className="text-[11px]">
                      Resets {c.period === 'day' ? 'at midnight UTC' : 'on the 1st'} · set by @{c.createdBy}
                    </div>
                  </div>
                </div>
                {admin && (
                  <Tooltip label="Remove cap">
                    <Button size="icon-sm" variant="ghost" aria-label={`Remove cap for ${capScopeLabel(boot, c)}`} onClick={() => setDel(c)}>
                      <Trash2 />
                    </Button>
                  </Tooltip>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title="Remove this cap?"
        message={del ? `Usage for ${capScopeLabel(boot, del)} will no longer be limited.` : ''}
        confirmLabel="Remove"
        danger
        loading={busy}
        onConfirm={async () => {
          if (!del) return
          setBusy(true)
          try {
            await hiveApi.deleteCap(del.id)
            toast.success('Cap removed')
            onChanged()
            setDel(null)
          } catch (e) {
            toast.error(errMsg(e))
          } finally {
            setBusy(false)
          }
        }}
      />
    </>
  )
}

const SCOPE_TYPES: { id: Cap['scopeType']; label: string; hint: string }[] = [
  { id: 'all', label: 'All of Hive', hint: 'Everything, everyone' },
  { id: 'project', label: 'A project', hint: 'Sessions in one project' },
  { id: 'vendor', label: 'A provider', hint: 'e.g. Anthropic, OpenAI' },
  { id: 'model', label: 'A model', hint: 'One exact model id' },
  { id: 'user', label: 'A person', hint: 'One staff member' },
]

function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: ReactNode; hint?: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-xl bg-text-primary/[0.05] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn('min-h-9 rounded-lg px-2 py-1.5 text-[12.5px] transition-colors', value === o.id ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary')}
        >
          {o.label}
          {o.hint && <span className="block text-[10.5px] text-text-muted">{o.hint}</span>}
        </button>
      ))}
    </div>
  )
}

function AddCap({ open, onClose, boot, onAdded }: { open: boolean; onClose: () => void; boot: Bootstrap; onAdded: () => void }) {
  const toast = useToast()
  const [scopeType, setScopeType] = useState<Cap['scopeType']>('all')
  const [scope, setScope] = useState('')
  const [tokens, setTokens] = useState('')
  const [dollars, setDollars] = useState('')
  const [period, setPeriod] = useState<Cap['period']>('month')
  const [action, setAction] = useState<Cap['action']>('warn')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setScopeType('all')
      setScope('')
      setTokens('')
      setDollars('')
      setPeriod('month')
      setAction('warn')
    }
  }, [open])

  const t = tokens.trim() ? parseTokens(tokens) : null
  const d = dollars.trim() ? Number(dollars.replace(/[$,\s]/g, '')) : null
  const tokensBad = !!tokens.trim() && t == null
  const dollarsBad = !!dollars.trim() && !(d != null && d > 0)
  const ready = (scopeType === 'all' || !!scope.trim()) && (t != null || (d != null && d > 0)) && !tokensBad && !dollarsBad
  const vendors = useMemo(() => {
    const seen = new Set(boot.keys.map((k) => k.provider))
    return [...boot.catalogue.providers].sort((a, b) => Number(seen.has(b.id)) - Number(seen.has(a.id)) || a.label.localeCompare(b.label))
  }, [boot])

  const save = async () => {
    if (!ready || busy) return
    setBusy(true)
    try {
      await hiveApi.addCap({ scopeType, scope: scopeType === 'all' ? undefined : scope.trim(), tokens: t, dollars: d && d > 0 ? d : null, period, action })
      toast.success('Cap added')
      onAdded()
      onClose()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const label = 'mb-1.5 block text-[12px] font-medium text-text-secondary'
  return (
    <Modal open={open} onClose={onClose} title="Add a cap" description="Limit tokens or dollars for a slice of Hive. Everyone sees an alert at 80% and 100%." size="lg">
      <div className="space-y-5">
        <div>
          <span className={label}>Applies to</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {SCOPE_TYPES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={scopeType === s.id}
                onClick={() => {
                  setScopeType(s.id)
                  setScope('')
                }}
                className={cn('rounded-xl border px-3 py-2 text-left transition-colors', scopeType === s.id ? 'border-accent-brand bg-accent-brand/8' : 'hive-line hover:bg-text-primary/[0.03]')}
              >
                <div className="text-[12.5px] font-medium text-text-primary">{s.label}</div>
                <div className="text-[11px] text-text-muted">{s.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {scopeType === 'project' && (
          <div>
            <span className={label}>Project</span>
            <Select value={scope} onValueChange={setScope} placeholder="Pick a project" aria-label="Project">
              <option value="">Chats (no project)</option>
              {boot.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        {scopeType === 'vendor' && (
          <div>
            <span className={label}>Provider</span>
            <Select value={scope} onValueChange={setScope} placeholder="Pick a provider" aria-label="Provider">
              {vendors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
        )}
        {scopeType === 'model' && (
          <div>
            <span className={label}>Model id</span>
            <div className="flex items-center gap-2">
              {scope.trim() && <AgentMark provider="" model={scope} size={36} />}
              <Input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="e.g. claude-opus-4-1 or gpt-5" aria-label="Model id" />
            </div>
          </div>
        )}
        {scopeType === 'user' && (
          <div>
            <span className={label}>Person</span>
            <Select value={scope} onValueChange={setScope} placeholder="Pick a staff member" aria-label="Person">
              {boot.members.map((m) => (
                <option key={m.username} value={m.username}>
                  {m.display_name ? `${m.display_name} (@${m.username})` : `@${m.username}`}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={label}>Token limit</span>
            <Input value={tokens} onChange={(e) => setTokens(e.target.value)} placeholder="e.g. 5M" inputMode="decimal" aria-label="Token limit" aria-invalid={tokensBad} />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {['500k', '2M', '10M', '50M'].map((v) => (
                <button key={v} type="button" onClick={() => setTokens(v)} className="hive-chip h-7 px-2.5 text-[11.5px]">
                  {v}
                </button>
              ))}
            </div>
            {tokensBad && <p className="mt-1 text-[11.5px] text-state-error">Use a number like 500000, 500k or 2M.</p>}
          </div>
          <div>
            <span className={label}>Dollar limit</span>
            <Input value={dollars} onChange={(e) => setDollars(e.target.value)} placeholder="e.g. 50" inputMode="decimal" aria-label="Dollar limit" aria-invalid={dollarsBad} />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {['5', '20', '50', '200'].map((v) => (
                <button key={v} type="button" onClick={() => setDollars(v)} className="hive-chip h-7 px-2.5 text-[11.5px]">
                  ${v}
                </button>
              ))}
            </div>
            {dollarsBad && <p className="mt-1 text-[11.5px] text-state-error">Use a positive amount, like 25.</p>}
          </div>
        </div>
        <p className="-mt-2 text-[11.5px] text-text-muted">Set either or both — the cap triggers on whichever is reached first.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={label}>Every</span>
            <Seg value={period} onChange={setPeriod} label="Period" options={[{ id: 'day', label: 'Day' }, { id: 'month', label: 'Month' }]} />
          </div>
          <div>
            <span className={label}>When it’s reached</span>
            <Seg
              value={action}
              onChange={setAction}
              label="Action"
              options={[
                { id: 'warn', label: 'Warn', hint: 'Alert only' },
                { id: 'block', label: 'Block', hint: 'Pause new calls' },
              ]}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t hive-line pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!ready} loading={busy}>
            <Plus /> Add cap
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ── Alerts ───────────────────────────────────────────────────────────── */
const LEVEL = {
  info: { icon: Info, color: 'var(--color-state-info)', label: 'Info' },
  warn: { icon: AlertTriangle, color: 'var(--color-state-warning)', label: 'Warning' },
  error: { icon: XCircle, color: 'var(--color-state-error)', label: 'Problem' },
} as const

function AlertsList({ alerts }: { alerts: HiveAlert[] | null }) {
  if (!alerts)
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="hive-shimmer h-16 rounded-2xl" />
        ))}
      </div>
    )
  if (!alerts.length)
    return (
      <div className="hive-card flex items-center gap-3 px-5 py-6">
        <BellOff className="size-5 text-text-muted" />
        <div>
          <div className="text-[13.5px] font-medium text-text-primary">All quiet</div>
          <div className="text-[12px] text-text-muted">Budget warnings and automations that fail to start will show up here — and as a toast for everyone online.</div>
        </div>
      </div>
    )
  const sorted = [...alerts].sort((a, b) => b.created_at - a.created_at)
  return (
    <div className="hive-card overflow-hidden">
      <AnimatePresence initial={false}>
        {sorted.map((a) => {
          const L = LEVEL[a.level] ?? LEVEL.info
          return (
            <motion.div key={a.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: EASE }} className="border-b hive-line last:border-b-0">
              <div className={cn('flex items-start gap-3 px-4 py-3.5', !a.read && 'bg-accent-brand/[0.04]')}>
                <span className="hive-tile mt-0.5 size-8" style={{ ['--tile' as string]: L.color }} aria-label={L.label}>
                  <L.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <span className={cn('min-w-0 flex-1 text-[13.5px] text-text-primary', !a.read && 'font-medium')}>{a.title}</span>
                    {!a.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent-brand" aria-label="Unread" />}
                    <span className="shrink-0 text-[11.5px] tabular-nums text-text-muted" title={new Date(a.created_at).toLocaleString()}>
                      {timeAgo(a.created_at) === 'now' ? 'just now' : `${timeAgo(a.created_at)} ago`}
                    </span>
                  </div>
                  {a.body && <p className="mt-0.5 text-[12.5px] text-text-muted">{a.body}</p>}
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
