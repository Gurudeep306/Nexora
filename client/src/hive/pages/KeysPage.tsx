import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SubscriptionDialog, SubscriptionsPanel } from '../Subscriptions'
import { FreeSetup } from '../FreeSetup'
import {
  Activity,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  FolderGit2,
  Gauge,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  Wallet,
  Zap,
} from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip as ChartTip } from 'recharts'
import { Button, ConfirmDialog, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Modal, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { AddGithubDialog, EditKeyDialog, parseLimit } from '../dialogs'
import { useHive } from '../store'
import type { HiveKey, ProviderInfo } from '../types'
import { ProviderGlyph, fmtCost, fmtTokens, keyShare, shareTone, vendorName, vendorStyle, LimitBar } from '../ui'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

export default function KeysPage() {
  const { boot, refresh } = useHive()
  const toast = useToast()
  // ?add=<vendor> (from Models → Free sources, the Toolbox or the Token Steward) opens the add dialog for it.
  const [params, setParams] = useSearchParams()
  const [adding, setAdding] = useState<string | null>(() => params.get('add')) // provider id, or '' for the picker
  const [addingGh, setAddingGh] = useState(false)
  const [confirmGh, setConfirmGh] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const grouped = useMemo(() => {
    const m = new Map<string, HiveKey[]>()
    for (const k of boot?.keys ?? []) {
      if (q && !`${k.label} ${vendorName(k.provider)} ${k.defaultModel ?? ''}`.toLowerCase().includes(q.toLowerCase())) continue
      ;(m.get(k.provider) ?? m.set(k.provider, []).get(k.provider)!).push(k)
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [boot?.keys, q])
  if (!boot) return null
  const keys = boot.keys
  const totals = keys.reduce(
    (a, k) => ({
      today: a.today + (k.todayTokens ?? 0),
      cost: a.cost + (k.periodCostMicros ?? 0),
      cached: a.cached + (k.periodCached ?? 0),
      live: a.live + k.active,
      healthy: a.healthy + (k.status === 'ok' && !k.disabled ? 1 : 0),
      models: a.models + k.models.length,
    }),
    { today: 0, cost: 0, cached: 0, live: 0, healthy: 0, models: 0 },
  )

  const refreshAll = async () => {
    setRefreshing(true)
    try {
      const r = await hiveApi.refreshModels()
      toast.success('Model lists refreshed', r.fresh.length ? `${r.fresh.length} new models found` : 'Everything is up to date')
      await refresh()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pb-24 pt-8 sm:px-8">
      {/* Vault header */}
      <div className="hive-card relative mb-8 overflow-hidden p-6 sm:p-7">
        <div className="hive-comb pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative flex flex-wrap items-start gap-5">
          <span className="hive-tile size-12" style={{ ['--tile' as string]: 'var(--color-state-warning)' }}>
            <KeyRound className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Key vault</h1>
            <p className="mt-1 max-w-xl text-[13.5px] text-text-muted">
              Every AI account the team shares. Keys are encrypted at rest and never reach a browser. Add as many accounts per provider as you like: Hive spreads work across them and moves on when one hits its budget or a rate limit.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={refreshAll} loading={refreshing}>
              {!refreshing && <RefreshCw />} Refresh models
            </Button>
            <Button onClick={() => setAdding('')}>
              <Plus /> Add keys
            </Button>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat icon={KeyRound} label="Keys" value={String(keys.length)} sub={`${totals.healthy} healthy`} tone="var(--color-state-warning)" />
          <Stat icon={Sparkles} label="Providers" value={String(new Set(keys.map((k) => k.provider)).size)} sub={`${totals.models} models`} tone="var(--color-accent-brand)" />
          <Stat icon={Activity} label="Today" value={fmtTokens(totals.today)} sub="tokens charged" tone="var(--color-state-info)" />
          <Stat icon={Database} label="Cache hits" value={fmtTokens(totals.cached)} sub="this period · ~90% off" tone="var(--color-state-success)" />
          <Stat icon={Wallet} label="Spend" value={fmtCost(totals.cost) ?? '$0'} sub="estimated, this period" tone="var(--color-state-gold)" />
          <Stat icon={Zap} label="Live calls" value={String(totals.live)} sub="right now" tone="var(--color-accent-brand)" live={totals.live > 0} />
        </div>
      </div>

      {keys.length > 4 && (
        <label className="mb-5 flex h-10 max-w-sm items-center gap-2 rounded-xl bg-text-primary/[0.05] px-3 focus-within:bg-text-primary/[0.08]">
          <Search className="size-4 text-text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter keys, providers, models" className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-text-muted" />
        </label>
      )}

      {/* Jump to a part of the page — nothing to dig for. */}
      <div className="sticky top-0 z-10 -mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-border bg-bg-app/95 px-1 backdrop-blur">
        {(
          [
            ['connected', `Your connections${keys.length ? ` · ${keys.length}` : ''}`],
            ['plans', 'Claude & Codex plans'],
            ['free', 'Free models'],
            ['github', 'GitHub'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => document.getElementById(`keys-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="h-10 shrink-0 border-b-2 border-transparent px-3 text-[13px] font-medium text-text-secondary hover:border-accent-brand/60 hover:text-text-primary">
            {label}
          </button>
        ))}
      </div>

      <div id="keys-connected" className="scroll-mt-14">
        {keys.length === 0 && <EmptyVault onAdd={(p) => setAdding(p)} providers={boot.catalogue.providers} />}
        <div className="space-y-6">
          {grouped.map(([vendor, list]) => (
            <ProviderGroup key={vendor} vendor={vendor} keys={list} onAdd={() => setAdding(vendor)} />
          ))}
        </div>
      </div>

      <div id="keys-plans" className="mt-10 scroll-mt-14">
        <SubscriptionsPanel onConnect={(sub) => setAdding(sub)} />
      </div>

      <div id="keys-free" className="mb-10 scroll-mt-14">
        <div id="free" />
        <FreeSetup />
      </div>

      {/* GitHub */}
      <section id="keys-github" className="mt-12 scroll-mt-14">
        <div className="mb-3 flex items-center gap-3">
          <span className="hive-tile size-9" style={{ ['--tile' as string]: 'var(--color-text-primary)' }}>
            <FolderGit2 className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold">GitHub</h2>
            <p className="text-[12.5px] text-text-muted">Fine-grained tokens with Contents + Pull requests (read & write). Add Administration to let the launchpad create repos.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setAddingGh(true)}>
            <Plus /> Connect
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {boot.github.map((g) => (
            <div key={g.id} className="hive-card flex items-center gap-3 p-4">
              <span className="grid size-10 place-items-center rounded-full bg-text-primary/[0.07] text-[14px] font-semibold">{(g.login || '?').slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[14px] font-medium">
                  @{g.login} <ShieldCheck className="size-3.5 text-state-success" />
                </div>
                <div className="truncate text-[12px] text-text-muted">
                  {g.label} · ····{g.last4} · added by @{g.createdBy}
                </div>
              </div>
              <a href={`https://github.com/${g.login}`} target="_blank" rel="noreferrer" className="grid size-8 place-items-center rounded-lg text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary" aria-label="Open on GitHub">
                <ExternalLink className="size-4" />
              </a>
              <button type="button" onClick={() => setConfirmGh(g.id)} className="grid size-8 place-items-center rounded-lg text-text-muted hover:bg-state-error/10 hover:text-state-error" aria-label="Remove">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {!boot.github.length && (
            <button type="button" onClick={() => setAddingGh(true)} className="hive-card hive-card-hover flex items-center gap-3 border-dashed p-4 text-left text-[13px] text-text-muted">
              <Plus className="size-4" /> Connect a GitHub account to work on repositories and open pull requests.
            </button>
          )}
        </div>
      </section>

      <SubscriptionDialog
        sub={adding === 'claude_code' || adding === 'codex' ? adding : null}
        onClose={() => {
          setAdding(null)
          if (params.has('add')) setParams((p) => (p.delete('add'), p), { replace: true })
        }}
      />
      <AddKeysDialog
        provider={adding === 'claude_code' || adding === 'codex' ? null : adding}
        onClose={() => {
          setAdding(null)
          if (params.has('add')) setParams((p) => (p.delete('add'), p), { replace: true })
        }}
      />
      <AddGithubDialog open={addingGh} onClose={() => setAddingGh(false)} />
      <ConfirmDialog
        open={!!confirmGh}
        onClose={() => setConfirmGh(null)}
        onConfirm={async () => {
          try {
            await hiveApi.deleteGithub(confirmGh!)
            toast.success('GitHub connection removed')
            await refresh()
          } catch (e) {
            toast.error(errMsg(e))
          }
          setConfirmGh(null)
        }}
        title="Remove this GitHub connection?"
        message="Projects that use it must be moved to another connection first."
        confirmLabel="Remove"
        danger
      />
    </div>
  )
}

function Stat({ icon: Icon, label, value, sub, tone, live }: { icon: typeof KeyRound; label: string; value: string; sub: string; tone: string; live?: boolean }) {
  return (
    <div className="rounded-2xl border hive-line bg-bg-app/40 p-3.5 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-[11.5px] font-medium text-text-muted">
        <Icon className="size-3.5" style={{ color: tone }} /> {label}
        {live && <span className="hive-dot-run ml-auto size-1.5 rounded-full" style={{ background: tone }} />}
      </div>
      <div className="mt-1.5 text-[22px] font-semibold tabular-nums tracking-[-0.02em]">{value}</div>
      <div className="truncate text-[11.5px] text-text-muted">{sub}</div>
    </div>
  )
}

function EmptyVault({ onAdd, providers }: { onAdd: (p: string) => void; providers: ProviderInfo[] }) {
  return (
    <div className="hive-card p-8 text-center">
      <h2 className="text-[17px] font-semibold">Connect your first model</h2>
      <p className="mx-auto mt-1 max-w-md text-[13px] text-text-muted">Pick a provider. Free tiers work great to start — Gemini, Groq and OpenRouter all have them.</p>
      <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
        {providers.map((p) => (
          <button key={p.id} type="button" onClick={() => onAdd(p.id)} className="hive-card hive-card-hover hive-lift flex items-center gap-2.5 p-3 text-left">
            <ProviderGlyph provider={p.id} size="md" />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">{p.label}</span>
              <span className="block truncate text-[11px] text-text-muted">{p.vendor}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ProviderGroup({ vendor, keys, onAdd }: { vendor: string; keys: HiveKey[]; onAdd: () => void }) {
  const { boot } = useHive()
  const info = boot?.catalogue.providers.find((p) => p.id === vendor)
  const color = vendorStyle(vendor).color
  const used = keys.reduce((s, k) => s + k.used, 0)
  const limit = keys.every((k) => k.tokenLimit != null) ? keys.reduce((s, k) => s + (k.tokenLimit ?? 0), 0) : null
  const live = keys.reduce((s, k) => s + k.active, 0)
  return (
    <section className="hive-card overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 px-5 pb-3 pt-4">
        <ProviderGlyph provider={vendor} size="lg" pulse={live > 0} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[15.5px] font-semibold">{vendorName(vendor)}</h2>
            <span className="hive-chip h-5 px-2 text-[11px]">{keys.length} account{keys.length === 1 ? '' : 's'}</span>
            {info && (
              <span className="hidden items-center gap-1 text-[11px] text-text-muted sm:flex">
                {[info.caps.tools && 'agents', info.caps.vision && 'vision', info.caps.pdf && 'PDFs', info.caps.images && 'images'].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[12px] tabular-nums text-text-muted">
            {fmtTokens(used)} charged this period{limit != null ? ` of ${fmtTokens(limit)} pooled` : ''} · {live ? `${live} live` : 'idle'}
          </div>
        </div>
        {info?.docs && (
          <a href={info.docs} target="_blank" rel="noreferrer" className="hidden items-center gap-1 text-[12px] text-text-muted hover:text-text-primary sm:inline-flex">
            Get a key <ExternalLink className="size-3" />
          </a>
        )}
        <Button size="sm" variant="secondary" onClick={onAdd}>
          <Plus /> Add another
        </Button>
      </header>
      {/* Pooled budget: one segment per account. */}
      <div className="mx-5 mb-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-text-primary/[0.06]">
        {keys.map((k) => {
          const share = keyShare(k)
          // One equal segment per account: filled by its remaining budget (accounts without a budget show as open).
          return (
            <div key={k.id} className="relative h-full flex-1 overflow-hidden bg-text-primary/[0.05]" style={{ opacity: k.disabled ? 0.3 : 1 }} title={`${k.label}: ${share == null ? 'no budget limit' : `${Math.round(share * 100)}% left`}`}>
              <div className="absolute inset-y-0 left-0 transition-[width] duration-700" style={{ width: share == null ? '100%' : `${Math.round(share * 100)}%`, background: share == null ? `color-mix(in oklab, ${color} 35%, transparent)` : shareTone(share) }} />
            </div>
          )
        })}
      </div>
      <div className="divide-y divide-[var(--hive-line)] border-t hive-line">
        {keys.map((k) => (
          <KeyRow key={k.id} k={k} />
        ))}
      </div>
    </section>
  )
}

/** Remaining-budget ring (or a neutral ring when the key has no budget). */
function BudgetRing({ k }: { k: HiveKey }) {
  const share = keyShare(k)
  const r = 19
  const c = 2 * Math.PI * r
  const tone = share == null ? 'var(--color-text-muted)' : shareTone(share)
  return (
    <div className="relative grid size-[52px] shrink-0 place-items-center">
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="color-mix(in oklab, var(--color-text-primary) 8%, transparent)" strokeWidth="4" />
        {share != null && <circle cx="24" cy="24" r={r} fill="none" stroke={tone} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - share)} style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)' }} />}
      </svg>
      <span className="text-[11px] font-semibold tabular-nums" style={{ color: tone }}>
        {share == null ? '∞' : `${Math.round(share * 100)}%`}
      </span>
    </div>
  )
}

function countdown(to: number | string | null | undefined): string | null {
  if (!to) return null
  const t = typeof to === 'number' ? to : Date.parse(to)
  if (!Number.isFinite(t)) return null
  const s = Math.max(0, (t - Date.now()) / 1000)
  if (s < 60) return `${Math.ceil(s)}s`
  if (s < 3600) return `${Math.round(s / 60)}m`
  if (s < 86400) return `${Math.round(s / 3600)}h`
  return `${Math.round(s / 86400)}d`
}

function KeyRow({ k }: { k: HiveKey }) {
  const { boot, refresh } = useHive()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [usage, setUsage] = useState<{ day: string; tokens: number; cached: number }[]>([])
  const canManage = !!boot && (boot.me.admin || boot.me.username === k.owner)
  const color = vendorStyle(k.provider).color

  useEffect(() => {
    let live = true
    hiveApi
      .keyUsage(k.id)
      .then((r) => live && setUsage(r.days.map((d) => ({ day: d.day.slice(5), tokens: d.input + d.output, cached: (d as { cached?: number }).cached ?? 0 }))))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [k.id, k.used])

  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true)
    try {
      await fn()
      if (ok) toast.success(ok)
      await refresh()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-text-primary/[0.02] lg:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1fr)_120px_auto]', k.disabled && 'opacity-55')}>
      <BudgetRing k={k} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-medium text-text-primary">{k.label}</span>
          {k.status === 'ok' && (
            <Tooltip label="Verified — the provider accepted this key">
              <CheckCircle2 className="size-3.5 shrink-0 text-state-success" />
            </Tooltip>
          )}
          {(k.status === 'invalid' || k.status === 'error') && (
            <Tooltip label={k.statusDetail || 'Check failed'}>
              <span className="inline-flex items-center gap-1 rounded-full bg-state-error/12 px-1.5 py-0.5 text-[10.5px] font-medium text-state-error">
                <TriangleAlert className="size-3" /> {k.status === 'invalid' ? 'Rejected' : 'Error'}
              </span>
            </Tooltip>
          )}
          {k.status === 'unchecked' && <span className="text-[11px] text-text-muted">· not checked</span>}
          {k.disabled && <span className="rounded-full bg-text-primary/[0.08] px-1.5 py-0.5 text-[10.5px] text-text-muted">paused</span>}
          {k.active > 0 && <span className="hive-dot-run ml-0.5 size-1.5 rounded-full bg-accent-brand" title={`${k.active} live`} />}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-text-muted">
          <button type="button" className="font-mono hover:text-text-primary" title="Only the last 4 characters are ever shown" onClick={() => navigator.clipboard?.writeText(k.id)}>
            ····{k.last4}
          </button>
          <span>@{k.owner}</span>
          <span>{k.models.length} models</span>
          {(k.priority ?? 0) !== 0 && <span>priority {k.priority! > 0 ? '+' : ''}{k.priority}</span>}
        </div>
        {k.defaultModel && (
          <div className="mt-1 inline-flex max-w-full items-center gap-1 rounded-md bg-text-primary/[0.05] px-1.5 py-0.5 font-mono text-[11px] text-text-secondary">
            <Sparkles className="size-3 shrink-0 text-accent-brand" />
            <span className="truncate">{k.defaultModel}</span>
          </div>
        )}
        {k.status !== 'ok' && k.statusDetail && <p className="mt-1 line-clamp-2 text-[11.5px] text-state-error">{k.statusDetail}</p>}
      </div>

      <div className="col-span-3 grid min-w-0 gap-2.5 lg:col-span-1">
        <div>
          <div className="mb-1 flex justify-between gap-2 text-[11.5px] tabular-nums text-text-muted">
            <span className="inline-flex items-center gap-1">
              <Gauge className="size-3" /> Budget
            </span>
            <span>
              {k.tokenLimit == null ? (
                <>
                  {fmtTokens(k.used)} used · <span className="text-text-secondary">no limit</span>
                </>
              ) : (
                <>
                  <span className="text-text-primary">{fmtTokens(k.remaining)}</span> left of {fmtTokens(k.tokenLimit)} {k.limitPeriod === 'total' ? 'total' : `/ ${k.limitPeriod}`}
                </>
              )}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-text-primary/[0.07]">
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${k.tokenLimit ? Math.min(100, (k.used / Math.max(1, k.tokenLimit)) * 100) : 0}%`, background: shareTone(keyShare(k)) }} />
          </div>
          {k.tokenLimit != null && k.periodEnds && <div className="mt-1 text-[10.5px] text-text-muted">Resets in {countdown(k.periodEnds)}</div>}
        </div>
        <LimitBar k={k} />
      </div>

      <div className="hidden h-14 lg:block" aria-hidden>
        {usage.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={usage} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <ChartTip cursor={false} contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--hive-line)', borderRadius: 10, fontSize: 11 }} formatter={(v, n) => [fmtTokens(Number(v)), n === 'cached' ? 'cached' : 'charged']} />
              <Area type="monotone" dataKey="cached" stroke="var(--color-state-success)" strokeWidth={1} fill="var(--color-state-success)" fillOpacity={0.08} isAnimationActive={false} />
              <Area type="monotone" dataKey="tokens" stroke={color} strokeWidth={1.6} fill={color} fillOpacity={0.14} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center text-[11px] text-text-muted">no usage yet</div>
        )}
        <div className="mt-0.5 flex justify-between text-[10.5px] tabular-nums text-text-muted">
          <span>today {fmtTokens(k.todayTokens ?? 0)}</span>
          {fmtCost(k.periodCostMicros) && <span>{fmtCost(k.periodCostMicros)}</span>}
        </div>
      </div>

      <div className="col-start-3 row-start-1 flex items-center gap-1 lg:col-start-auto lg:row-start-auto">
        <Tooltip label="Re-check & refresh models">
          <Button size="icon-sm" variant="ghost" onClick={() => act(() => hiveApi.checkKey(k.id), 'Key checked')} disabled={busy} aria-label="Re-check">
            {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          </Button>
        </Tooltip>
        <Menu>
          <MenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label="Key actions">
              <MoreHorizontal />
            </Button>
          </MenuTrigger>
          <MenuContent align="end">
            {canManage && (
              <>
                <MenuItem onSelect={() => setEditing(true)}>
                  <Settings2 className="size-3.5" /> Budget, model & priority
                </MenuItem>
                <MenuItem onSelect={() => act(() => hiveApi.updateKey(k.id, { disabled: !k.disabled }), k.disabled ? 'Resumed' : 'Paused')}>
                  {k.disabled ? <Play className="size-3.5" /> : <Pause className="size-3.5" />} {k.disabled ? 'Resume' : 'Pause'}
                </MenuItem>
              </>
            )}
            <MenuItem onSelect={() => navigator.clipboard?.writeText(k.models.join('\n')).then(() => toast.success('Model ids copied'))}>
              <Copy className="size-3.5" /> Copy model list
            </MenuItem>
            {canManage && (
              <>
                <MenuSeparator />
                <MenuItem className="text-state-error" onSelect={() => setConfirm(true)}>
                  <Trash2 className="size-3.5" /> Delete
                </MenuItem>
              </>
            )}
          </MenuContent>
        </Menu>
      </div>
      <EditKeyDialog k={k} open={editing} onClose={() => setEditing(false)} />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => act(() => hiveApi.deleteKey(k.id), 'Key deleted').then(() => setConfirm(false))}
        title="Delete this key?"
        message={`“${k.label}” leaves the shared pool. Agents using it move to another key.`}
        confirmLabel="Delete key"
        danger
        loading={busy}
      />
    </div>
  )
}

/* ── Add keys: one provider, one or many keys at once ─────────────────── */
const PRESETS = [
  { label: 'No limit', limit: '', period: 'month' },
  { label: '200k / day', limit: '200k', period: 'day' },
  { label: '1M / day', limit: '1m', period: 'day' },
  { label: '10M / month', limit: '10m', period: 'month' },
  { label: '50M / month', limit: '50m', period: 'month' },
]

type AddResult = { key: string; ok: boolean; error?: string; models?: number }

export function AddKeysDialog({ provider, onClose }: { provider: string | null; onClose: () => void }) {
  const { boot, refresh } = useHive()
  const toast = useToast()
  const open = provider !== null
  const [vendor, setVendor] = useState<string>('')
  const [q, setQ] = useState('')
  const [raw, setRaw] = useState('')
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [limit, setLimit] = useState('')
  const [period, setPeriod] = useState('month')
  const [conc, setConc] = useState(4)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<AddResult[]>([])
  const vendors = boot?.catalogue.providers ?? []
  const info = vendors.find((v) => v.id === vendor)
  const keysIn = useMemo(() => [...new Set(raw.split(/[\s,;]+/).map((s) => s.trim()).filter((s) => s.length >= 8))], [raw])
  const parsed = parseLimit(limit)
  const existing = boot?.keys.filter((k) => k.provider === vendor).length ?? 0

  useEffect(() => {
    if (!open) return
    setVendor(provider || '')
    setRaw('')
    setName('')
    setBaseUrl('')
    setLimit('')
    setPeriod('month')
    setResults([])
    setQ('')
  }, [open, provider])

  const submit = async () => {
    if (!info) return
    setBusy(true)
    setResults([])
    const out: AddResult[] = []
    for (const [i, apiKey] of keysIn.entries()) {
      const label = `${name || info.label}${keysIn.length > 1 || existing ? ` #${existing + i + 1}` : ''}`
      try {
        const r = await hiveApi.addKey({ provider: vendor, label, apiKey, baseUrl: baseUrl || undefined, tokenLimit: parsed, limitPeriod: period, maxConcurrency: conc })
        out.push({ key: apiKey, ok: r.check.ok, error: r.check.error, models: (r.check as { models?: string[] }).models?.length })
      } catch (e) {
        out.push({ key: apiKey, ok: false, error: errMsg(e) })
      }
      setResults([...out])
    }
    setBusy(false)
    await refresh()
    const good = out.filter((r) => r.ok).length
    if (good === out.length) {
      toast.success(`${good} ${info.label} key${good === 1 ? '' : 's'} added`)
      onClose()
    } else toast.warning(`${good} of ${out.length} keys verified`, 'Keys that failed the check were still saved — fix or delete them.')
  }

  return (
    <Modal open={open} onClose={onClose} size="xl" title={info ? `Add ${info.label} keys` : 'Add keys'} description={info ? `${info.vendor} · paste one key or many (one per line) — each becomes its own account in the pool.` : 'Pick a provider. You can add as many accounts per provider as you like.'}>
      {!info ? (
        <div>
          <label className="mb-3 flex h-10 items-center gap-2 rounded-xl bg-text-primary/[0.05] px-3">
            <Search className="size-4 text-text-muted" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 16 providers" className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-text-muted" />
          </label>
          <div className="grid max-h-[55vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {vendors
              .filter((v) => `${v.label} ${v.vendor}`.toLowerCase().includes(q.toLowerCase()))
              .map((v) => {
                const n = boot?.keys.filter((k) => k.provider === v.id).length ?? 0
                return (
                  <button key={v.id} type="button" onClick={() => setVendor(v.id)} className="hive-card hive-card-hover hive-lift flex items-start gap-3 p-3.5 text-left">
                    <ProviderGlyph provider={v.id} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[13.5px] font-medium">
                        {v.label}
                        {n > 0 && <span className="rounded-full bg-accent-brand/12 px-1.5 text-[10.5px] text-accent-brand">{n}</span>}
                      </span>
                      <span className="block truncate text-[11.5px] text-text-muted">{v.vendor}</span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {[v.caps.tools ? 'agents' : 'chat only', v.caps.vision && 'vision', v.caps.pdf && 'PDF', v.caps.images && 'images'].filter(Boolean).map((c) => (
                          <span key={String(c)} className="rounded bg-text-primary/[0.06] px-1.5 text-[10px] text-text-secondary">
                            {c}
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                )
              })}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-text-secondary">
                <span>API key{keysIn.length > 1 ? 's' : ''}</span>
                <span className={cn('tabular-nums', keysIn.length ? 'text-accent-brand' : 'text-text-muted')}>{keysIn.length} detected</span>
              </div>
              <textarea
                autoFocus
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={5}
                spellCheck={false}
                placeholder={`${info.keyHint}\n${info.keyHint}   ← paste several to add several accounts`}
                className="hive-code w-full resize-y rounded-xl border hive-line bg-text-primary/[0.03] p-3 outline-none placeholder:text-text-muted focus:border-accent-brand/50"
              />
              {info.docs && (
                <a href={info.docs} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] text-accent-brand hover:underline">
                  Get a {info.label} key <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-text-secondary">Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${info.label}${existing ? ` #${existing + 1}` : ''}`} className="h-9 w-full rounded-lg border hive-line bg-transparent px-3 text-[13px] outline-none focus:border-accent-brand/50" />
              </label>
              {(info.baseUrlRequired || info.id === 'custom' || info.baseUrl) && (
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-text-secondary">Base URL {info.baseUrlRequired ? '' : '(optional)'}</span>
                  <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={info.baseUrl ?? 'https://…/v1'} className="h-9 w-full rounded-lg border hive-line bg-transparent px-3 font-mono text-[12px] outline-none focus:border-accent-brand/50" />
                </label>
              )}
            </div>
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-text-secondary">Budget per key</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button key={p.label} type="button" onClick={() => (setLimit(p.limit), setPeriod(p.period))} className={cn('hive-chip', limit === p.limit && period === p.period && 'bg-accent-brand/15 text-text-primary ring-1 ring-accent-brand/40')}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="custom, e.g. 2.5m" className={cn('h-9 w-40 rounded-lg border hive-line bg-transparent px-3 text-[13px] outline-none focus:border-accent-brand/50', Number.isNaN(parsed) && 'border-state-error')} />
                <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-text-primary/[0.06] p-0.5">
                  {(['day', 'month', 'total'] as const).map((p) => (
                    <button key={p} type="button" onClick={() => setPeriod(p)} className={cn('h-8 rounded-md px-3 text-[12px] capitalize', period === p ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted')}>
                      {p === 'total' ? 'total' : `per ${p}`}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-1.5 text-[11.5px] text-text-muted">Counts input + output tokens. Prompt-cache reads are tracked separately and don’t use the budget.</p>
            </div>
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-text-secondary">Parallel calls per key · {conc}</span>
              <input type="range" min={1} max={16} value={conc} onChange={(e) => setConc(Number(e.target.value))} className="w-full accent-[var(--color-accent-brand)]" />
            </div>
          </div>
          <aside className="space-y-3">
            <div className="hive-card p-4">
              <div className="flex items-center gap-2.5">
                <ProviderGlyph provider={info.id} size="lg" />
                <div>
                  <div className="text-[14px] font-semibold">{info.label}</div>
                  <div className="text-[12px] text-text-muted">{existing} account{existing === 1 ? '' : 's'} already</div>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-[12px] text-text-secondary">
                <li className="flex justify-between"><span>Agents (tools)</span><span>{info.caps.tools ? 'yes' : 'chat only'}</span></li>
                <li className="flex justify-between"><span>Images in</span><span>{info.caps.vision ? 'yes' : 'no'}</span></li>
                <li className="flex justify-between"><span>PDFs in</span><span>{info.caps.pdf ? 'yes' : 'as text'}</span></li>
                <li className="flex justify-between"><span>Makes images</span><span>{info.caps.images ? 'yes' : 'no'}</span></li>
              </ul>
              {!provider && (
                <button type="button" onClick={() => setVendor('')} className="mt-3 text-[12px] text-accent-brand hover:underline">
                  ← Another provider
                </button>
              )}
            </div>
            {results.length > 0 && (
              <div className="hive-card space-y-1.5 p-3">
                {results.map((r) => (
                  <div key={r.key} className="flex items-start gap-2 text-[12px]">
                    {r.ok ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-state-success" /> : <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-state-error" />}
                    <span className="min-w-0">
                      <span className="font-mono">····{r.key.slice(-4)}</span>{' '}
                      <span className="text-text-muted">{r.ok ? `verified · ${r.models ?? 0} models` : r.error}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Button className="w-full" onClick={submit} loading={busy} disabled={!keysIn.length || Number.isNaN(parsed) || (info.baseUrlRequired && !baseUrl)}>
              {!busy && <Plus />} Add {keysIn.length > 1 ? `${keysIn.length} keys` : 'key'}
            </Button>
          </aside>
        </div>
      )}
    </Modal>
  )
}
