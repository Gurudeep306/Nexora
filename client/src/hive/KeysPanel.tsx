import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, FolderGit2 as Github, KeyRound, Loader2, MoreHorizontal, Pause, Play, Plus, RefreshCw, ShieldCheck, Trash2, TriangleAlert, Users } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip as RTooltip } from 'recharts'
import { Button, ConfirmDialog, Input, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Modal, Select, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { useHive } from './store'
import type { HiveKey, ProviderId } from './types'
import { PROVIDER_STYLE, ProviderGlyph, TokenMeter, fmtCost, fmtTokens, timeAgo } from './ui'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

export function KeysPanel() {
  const { boot } = useHive()
  const [adding, setAdding] = useState(false)
  const [addingGh, setAddingGh] = useState(false)
  const [filter, setFilter] = useState<ProviderId | 'all'>('all')
  if (!boot) return null
  const keys = filter === 'all' ? boot.keys : boot.keys.filter((k) => k.provider === filter)
  const totals = summarize(boot.keys)

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Keys" value={String(boot.keys.filter((k) => !k.disabled).length)} />
        <Stat label="Used (period)" value={fmtTokens(totals.used)} />
        <Stat label="Live calls" value={String(totals.active)} pulse={totals.active > 0} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
          <KeyRound className="size-3.5" /> AI keys
        </h3>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus /> Add key
        </Button>
      </div>
      <div className="hive-scroll -mt-1 flex gap-1 overflow-x-auto pb-0.5">
        {(['all', 'anthropic', 'openai', 'gemini', 'openai_compat'] as const).map((p) => {
          const n = p === 'all' ? boot.keys.length : boot.keys.filter((k) => k.provider === p).length
          return (
            <button
              key={p}
              type="button"
              onClick={() => setFilter(p)}
              className={cn(
                'inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium transition-colors',
                filter === p ? 'bg-text-primary/10 text-text-primary' : 'text-text-muted hover:bg-text-primary/5 hover:text-text-secondary',
              )}
            >
              {p === 'all' ? 'All' : PROVIDER_STYLE[p].name}
              <span className="tabular-nums opacity-60">{n}</span>
            </button>
          )
        })}
      </div>

      {keys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <KeyRound className="mx-auto mb-2 size-6 text-text-muted" />
          <p className="text-sm font-medium text-text-primary">No keys yet</p>
          <p className="mt-1 text-xs text-text-muted">Add Claude, GPT, Gemini or any OpenAI-compatible key. Everyone on staff can use the shared pool.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {keys.map((k) => (
            <KeyCard key={k.id} k={k} />
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
          <Github className="size-3.5" /> GitHub connections
        </h3>
        <Button size="sm" variant="ghost" onClick={() => setAddingGh(true)}>
          <Plus /> Connect
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {boot.github.length === 0 && <p className="text-xs text-text-muted">Connect a GitHub token so agents can work on your repositories.</p>}
        {boot.github.map((g) => (
          <GithubRow key={g.id} id={g.id} label={g.label} login={g.login} last4={g.last4} by={g.createdBy} />
        ))}
      </div>

      <p className="flex items-start gap-2 rounded-lg bg-text-primary/4 p-3 text-[11px] leading-relaxed text-text-muted">
        <ShieldCheck className="mt-px size-3.5 shrink-0 text-state-success" />
        Keys and tokens are encrypted at rest and never sent to any browser — only their last 4 characters. Only staff can see this workspace.
      </p>

      <AddKeyDialog open={adding} onClose={() => setAdding(false)} />
      <AddGithubDialog open={addingGh} onClose={() => setAddingGh(false)} />
    </div>
  )
}

function summarize(keys: HiveKey[]) {
  return keys.reduce((a, k) => ({ used: a.used + k.used, active: a.active + k.active }), { used: 0, active: 0 })
}

function Stat({ label, value, pulse }: { label: string; value: string; pulse?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-bg-surface/60 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-lg font-semibold tabular-nums text-text-primary">
        {value}
        {pulse && <span className="hive-dot-run size-1.5 rounded-full bg-accent-brand" />}
      </div>
    </div>
  )
}

function KeyCard({ k }: { k: HiveKey }) {
  const { boot, refresh } = useHive()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [usage, setUsage] = useState<{ day: string; tokens: number }[] | null>(null)
  const [byUser, setByUser] = useState<{ username: string; tokens: number }[]>([])
  const canManage = !!boot && (boot.me.admin || boot.me.username === k.owner)
  const cost = fmtCost(k.periodCostMicros)

  useEffect(() => {
    let live = true
    hiveApi
      .keyUsage(k.id)
      .then((r) => {
        if (!live) return
        setUsage(r.days.map((d) => ({ day: d.day, tokens: d.input + d.output })))
        setByUser(r.byUser.map((u) => ({ username: u.username, tokens: Number(u.tokens) })))
      })
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

  const rl = k.rateLimit
  const rlShare = rl?.tokensLimit ? (rl.tokensRemaining ?? 0) / rl.tokensLimit : null

  return (
    <div className={cn('group rounded-xl border border-border bg-bg-surface/70 p-3 transition-colors hover:border-border-strong', k.disabled && 'opacity-60')}>
      <div className="flex items-start gap-2.5">
        <ProviderGlyph provider={k.provider} pulse={k.active > 0} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-text-primary">{k.label}</span>
            {k.status === 'ok' && <CheckCircle2 className="size-3.5 shrink-0 text-state-success" aria-label="Verified" />}
            {(k.status === 'invalid' || k.status === 'error') && (
              <Tooltip label={k.statusDetail || 'Check failed'}>
                <TriangleAlert className="size-3.5 shrink-0 text-state-error" />
              </Tooltip>
            )}
            {k.disabled && <span className="rounded bg-text-primary/8 px-1.5 text-[10px] text-text-muted">paused</span>}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-text-muted">
            {PROVIDER_STYLE[k.provider].name} · ····{k.last4} · @{k.owner}
            {k.baseUrl ? ` · ${new URL(k.baseUrl).host}` : ''}
          </div>
        </div>
        {usage && usage.length > 1 && (
          <div className="h-8 w-20 shrink-0" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usage} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`g-${k.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PROVIDER_STYLE[k.provider].hue} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={PROVIDER_STYLE[k.provider].hue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <RTooltip
                  cursor={false}
                  content={({ payload }) => (payload?.[0] ? <div className="pop-surface px-2 py-1 text-[11px]">{`${payload[0].payload.day}: ${fmtTokens(payload[0].value as number)}`}</div> : null)}
                />
                <Area type="monotone" dataKey="tokens" stroke={PROVIDER_STYLE[k.provider].hue} strokeWidth={1.5} fill={`url(#g-${k.id})`} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <Menu>
          <MenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label="Key actions" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
            </Button>
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem onSelect={() => act(() => hiveApi.checkKey(k.id), 'Key checked')}>
              <RefreshCw className="size-3.5" /> Re-check & refresh models
            </MenuItem>
            {canManage && (
              <>
                <MenuItem onSelect={() => setEditing(true)}>
                  <Activity className="size-3.5" /> Limits & settings
                </MenuItem>
                <MenuItem onSelect={() => act(() => hiveApi.updateKey(k.id, { disabled: !k.disabled }), k.disabled ? 'Key resumed' : 'Key paused')}>
                  {k.disabled ? <Play className="size-3.5" /> : <Pause className="size-3.5" />} {k.disabled ? 'Resume' : 'Pause'}
                </MenuItem>
                <MenuSeparator />
                <MenuItem className="text-state-error" onSelect={() => setConfirm(true)}>
                  <Trash2 className="size-3.5" /> Delete
                </MenuItem>
              </>
            )}
          </MenuContent>
        </Menu>
      </div>

      <div className="mt-3">
        <TokenMeter k={k} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
        <span className="tabular-nums">
          {fmtTokens(k.periodInput)} in · {fmtTokens(k.periodOutput)} out · {k.periodRequests ?? 0} calls
        </span>
        {cost && <span className="tabular-nums">≈ {cost}</span>}
        <span>
          {k.active}/{k.maxConcurrency} running
        </span>
        {k.models.length > 0 && <span>{k.models.length} models</span>}
      </div>

      {rl && (rl.tokensLimit || rl.requestsLimit) && (
        <div className="mt-2.5 rounded-lg bg-text-primary/4 px-2.5 py-2">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-text-muted">
            <span>Provider rate limit (live)</span>
            <span className="normal-case tracking-normal">{timeAgo(k.rateLimitAt)}</span>
          </div>
          {rl.tokensLimit != null && (
            <div className="mt-1.5">
              <div className="h-1 overflow-hidden rounded-full bg-text-primary/8">
                <div className="h-full rounded-full bg-state-info" style={{ width: `${Math.round((rlShare ?? 0) * 100)}%` }} />
              </div>
              <div className="mt-1 text-[11px] tabular-nums text-text-muted">
                {fmtTokens(rl.tokensRemaining)} / {fmtTokens(rl.tokensLimit)} tokens per minute
                {rl.requestsLimit != null && ` · ${rl.requestsRemaining}/${rl.requestsLimit} requests`}
              </div>
            </div>
          )}
        </div>
      )}

      {byUser.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
          <Users className="size-3" />
          {byUser.slice(0, 4).map((u) => (
            <span key={u.username} className="rounded-full bg-text-primary/5 px-1.5 py-px tabular-nums">
              @{u.username} {fmtTokens(u.tokens)}
            </span>
          ))}
        </div>
      )}

      <EditKeyDialog k={k} open={editing} onClose={() => setEditing(false)} />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => act(() => hiveApi.deleteKey(k.id), 'Key deleted').then(() => setConfirm(false))}
        title="Delete this key?"
        message={`“${k.label}” will be removed from the shared pool. Agents using it switch to another key of the same provider if one has budget.`}
        confirmLabel="Delete key"
        danger
        loading={busy}
      />
    </div>
  )
}

const PERIODS = [
  { id: 'day', label: 'per day' },
  { id: 'month', label: 'per month' },
  { id: 'total', label: 'in total' },
]

function AddKeyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { boot, refresh } = useHive()
  const toast = useToast()
  const [provider, setProvider] = useState<ProviderId>('anthropic')
  const [label, setLabel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [limit, setLimit] = useState('')
  const [period, setPeriod] = useState('month')
  const [conc, setConc] = useState('4')
  const [busy, setBusy] = useState(false)
  const info = boot?.catalogue.providers.find((p) => p.id === provider)

  useEffect(() => {
    if (open) {
      setLabel('')
      setApiKey('')
      setBaseUrl('')
      setLimit('')
    }
  }, [open])

  const submit = async () => {
    setBusy(true)
    try {
      const r = await hiveApi.addKey({
        provider,
        label: label || `${PROVIDER_STYLE[provider].name} key`,
        apiKey,
        baseUrl: baseUrl || undefined,
        tokenLimit: parseLimit(limit),
        limitPeriod: period,
        maxConcurrency: Number(conc) || 4,
      })
      if (r.check.ok) toast.success('Key added and verified')
      else toast.warning('Key saved, but the check failed', r.check.error)
      await refresh()
      onClose()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add an AI key" description="Shared with every staff member in Hive. Set a token budget so nobody burns through it." size="md">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['anthropic', 'openai', 'gemini', 'openai_compat'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProvider(p)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all',
                provider === p ? 'border-accent-brand bg-accent-brand/8 text-text-primary' : 'border-border text-text-secondary hover:border-border-strong',
              )}
            >
              <ProviderGlyph provider={p} />
              {PROVIDER_STYLE[p].name}
            </button>
          ))}
        </div>
        {provider === 'openai_compat' && (
          <div className="flex flex-wrap gap-1.5">
            {boot?.catalogue.compatPresets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setBaseUrl(p.baseUrl)
                  if (!label) setLabel(p.label)
                }}
                className={cn('h-7 rounded-full border px-2.5 text-[11px]', baseUrl === p.baseUrl ? 'border-accent-brand text-text-primary' : 'border-border text-text-muted hover:text-text-primary')}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
          Name
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`e.g. ${PROVIDER_STYLE[provider].name} — team budget`} maxLength={60} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
          API key
          <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={info?.keyHint} type="password" autoComplete="off" spellCheck={false} className="font-mono" />
          {info?.docs && (
            <a href={info.docs} target="_blank" rel="noreferrer" className="text-[11px] font-normal text-accent-brand hover:underline">
              Get a {info.vendor} key ↗
            </a>
          )}
        </label>
        {(provider === 'openai_compat' || baseUrl) && (
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Base URL
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" className="font-mono" />
          </label>
        )}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Token budget
            <Input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="Unlimited — or e.g. 5M" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            &nbsp;
            <Select value={period} onValueChange={setPeriod} className="w-32">
              {PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
          Parallel agents on this key
          <Select value={conc} onValueChange={setConc}>
            {[1, 2, 3, 4, 6, 8, 12, 16].map((n) => (
              <option key={n} value={String(n)}>
                {n} at a time
              </option>
            ))}
          </Select>
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={apiKey.trim().length < 8 || (provider === 'openai_compat' && !baseUrl) || Number.isNaN(parseLimit(limit))}>
            Add & verify
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function parseLimit(s: string): number | null {
  const t = s.trim().replace(/[,_\s]/g, '')
  if (!t) return null
  const m = /^([\d.]+)([kKmMbB]?)$/.exec(t)
  if (!m) return Number.NaN
  return Math.round(Number(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase() as 'k' | 'm' | 'b'] ?? 1))
}

function EditKeyDialog({ k, open, onClose }: { k: HiveKey; open: boolean; onClose: () => void }) {
  const { refresh } = useHive()
  const toast = useToast()
  const [label, setLabel] = useState(k.label)
  const [limit, setLimit] = useState(k.tokenLimit == null ? '' : String(k.tokenLimit))
  const [period, setPeriod] = useState<string>(k.limitPeriod)
  const [conc, setConc] = useState(String(k.maxConcurrency))
  const [model, setModel] = useState(k.defaultModel ?? '')
  const [rotate, setRotate] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) {
      setLabel(k.label)
      setLimit(k.tokenLimit == null ? '' : String(k.tokenLimit))
      setPeriod(k.limitPeriod)
      setConc(String(k.maxConcurrency))
      setModel(k.defaultModel ?? '')
      setRotate('')
    }
  }, [open, k])
  const parsed = parseLimit(limit)
  const save = async () => {
    setBusy(true)
    try {
      await hiveApi.updateKey(k.id, { label, tokenLimit: parsed, limitPeriod: period, maxConcurrency: Number(conc), defaultModel: model || null, ...(rotate ? { apiKey: rotate } : {}) })
      toast.success('Key updated')
      await refresh()
      onClose()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={`Settings · ${k.label}`} size="md">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
          Name
          <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Token budget {Number.isNaN(parsed) && <span className="text-state-error">— use a number like 2500000 or 2.5M</span>}
            <Input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="Unlimited" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            &nbsp;
            <Select value={period} onValueChange={setPeriod} className="w-32">
              {PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Default model
            <Select value={model} onValueChange={setModel} placeholder="Choose">
              {k.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Parallel agents
            <Select value={conc} onValueChange={setConc}>
              {[1, 2, 3, 4, 6, 8, 12, 16, 24, 32].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
          Rotate key (optional)
          <Input value={rotate} onChange={(e) => setRotate(e.target.value)} type="password" placeholder="Paste a new key to replace ····" autoComplete="off" className="font-mono" />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy} disabled={Number.isNaN(parsed) || !label.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function GithubRow({ id, label, login, last4, by }: { id: string; label: string; login: string; last4: string; by: string }) {
  const { boot, refresh } = useHive()
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const projects = useMemo(() => boot?.projects.filter((p) => p.github_id === id).length ?? 0, [boot, id])
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-bg-surface/60 px-3 py-2">
      <span className="grid size-7 place-items-center rounded-lg bg-text-primary/8">
        <Github className="size-4 text-text-secondary" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-text-primary">{label}</div>
        <div className="truncate text-[11px] text-text-muted">
          @{login} · ····{last4} · {projects} project{projects === 1 ? '' : 's'} · added by @{by}
        </div>
      </div>
      {(boot?.me.admin || boot?.me.username === by) && (
        <Button size="icon-sm" variant="ghost" aria-label="Remove connection" onClick={() => setConfirm(true)}>
          <Trash2 />
        </Button>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Remove GitHub connection?"
        message="Projects using it must be removed first."
        confirmLabel="Remove"
        danger
        loading={busy}
        onConfirm={async () => {
          setBusy(true)
          try {
            await hiveApi.deleteGithub(id)
            await refresh()
            setConfirm(false)
          } catch (e) {
            toast.error(errMsg(e))
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}

export function AddGithubDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { refresh } = useHive()
  const toast = useToast()
  const [token, setToken] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal open={open} onClose={onClose} title="Connect GitHub" description="A fine-grained personal access token with Contents and Pull requests (read & write) on the repositories Hive should work on." size="md">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
          Token
          <Input value={token} onChange={(e) => setToken(e.target.value)} type="password" placeholder="github_pat_…" autoComplete="off" className="font-mono" />
          <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer" className="text-[11px] font-normal text-accent-brand hover:underline">
            Create a fine-grained token ↗
          </a>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
          Name (optional)
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Org bot" maxLength={60} />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={token.trim().length < 10}
            onClick={async () => {
              setBusy(true)
              try {
                const r = await hiveApi.addGithub({ token: token.trim(), label: label || undefined })
                toast.success(`Connected as @${r.login}`)
                setToken('')
                await refresh()
                onClose()
              } catch (e) {
                toast.error(errMsg(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            Connect
          </Button>
        </div>
      </div>
    </Modal>
  )
}
