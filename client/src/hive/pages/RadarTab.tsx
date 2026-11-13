import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, Eye, FileText, Loader2, MessageSquare, Music, Radar, RefreshCw, Search, Sparkles } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { useHive } from '../store'
import type { MarketModel } from '../types'
import { ProviderGlyph, fmtTokens, timeAgo, vendorName } from '../ui'

type Sort = 'new' | 'cheap' | 'context'

export default function RadarTab({ embedded = false }: { embedded?: boolean }) {
  const { boot, modelsVersion, refresh } = useHive()
  const toast = useToast()
  const navigate = useNavigate()
  const [recent, setRecent] = useState<{ vendor: string; model: string; first_seen: number }[]>([])
  const [market, setMarket] = useState<MarketModel[]>([])
  const [at, setAt] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [lab, setLab] = useState('all')
  const [sort, setSort] = useState<Sort>('new')
  const load = (force = false) => {
    setLoading(true)
    hiveApi
      .radar(force)
      .then((r) => {
        setRecent(r.recent)
        setMarket(r.market)
        setAt(r.marketAt)
        setErr(r.marketError)
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }
  useEffect(() => load(), [modelsVersion])
  const labs = useMemo(() => {
    const m = new Map<string, number>()
    for (const x of market) m.set(x.lab, (m.get(x.lab) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)
  }, [market])
  const shown = useMemo(() => {
    const s = q.toLowerCase()
    const l = market.filter((m) => (lab === 'all' || m.lab === lab) && (!s || `${m.name} ${m.id} ${m.description}`.toLowerCase().includes(s)))
    if (sort === 'cheap') l.sort((a, b) => (a.input ?? 1e9) - (b.input ?? 1e9))
    else if (sort === 'context') l.sort((a, b) => (b.context ?? 0) - (a.context ?? 0))
    return l
  }, [market, q, lab, sort])
  if (!boot) return null
  const hasOpenRouter = boot.keys.some((k) => k.provider === 'openrouter' && !k.disabled)
  const yours = boot.keys.reduce((m, k) => m.set(k.provider, new Set([...(m.get(k.provider) ?? []), ...k.models])), new Map<string, Set<string>>())

  const tryIt = (provider: string, model: string) => navigate('/hive/chat', { state: { send: `Hi! In two sentences: who are you, and what are you best at?`, spec: { provider, keyId: 'auto', model, effort: null } } })

  return (
    <div className={embedded ? 'w-full pb-16' : 'mx-auto w-full max-w-[1160px] px-4 pb-24 pt-8 sm:px-8'}>
      <div className="hive-card relative overflow-hidden p-6 sm:p-7">
        <div className="hive-comb pointer-events-none absolute inset-0" />
        <div className="relative flex flex-wrap items-start gap-5">
          <span className="hive-tile size-12" style={{ ['--tile' as string]: 'var(--color-state-info)' }}>
            <Radar className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Model radar</h1>
            <p className="mt-1 max-w-2xl text-[13.5px] text-text-muted">
              Hive re-reads every key’s model list twice a day, so new releases show up in the model picker on their own — and retired ones stop being defaults. Below: what just appeared on your keys, and the newest models across all labs.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              loading={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  const r = await hiveApi.refreshModels()
                  toast.success('Your keys were re-checked', r.fresh.length ? `${r.fresh.length} new models` : 'No new models since the last check')
                  await refresh()
                  load()
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Failed')
                } finally {
                  setBusy(false)
                }
              }}
            >
              {!busy && <RefreshCw />} Check my keys now
            </Button>
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2">
          {[...yours.entries()].map(([v, set]) => (
            <span key={v} className="hive-chip h-8 bg-bg-app/50">
              <ProviderGlyph provider={v} size="xs" /> {vendorName(v)} <b className="tabular-nums text-text-primary">{set.size}</b>
            </span>
          ))}
          {!yours.size && <span className="text-[12.5px] text-text-muted">Add keys to see the models you can use.</span>}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
          <Sparkles className="size-4 text-accent-brand" /> New on your keys
          <span className="text-[12px] font-normal text-text-muted">last 45 days</span>
        </h2>
        {recent.length ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((r, i) => (
              <motion.div key={`${r.vendor}:${r.model}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} className="hive-card flex items-center gap-3 p-3">
                <ProviderGlyph provider={r.vendor} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-[12.5px]">{r.model}</div>
                  <div className="text-[11px] text-text-muted">
                    {vendorName(r.vendor)} · appeared {timeAgo(r.first_seen)} ago
                  </div>
                </div>
                <button type="button" onClick={() => tryIt(r.vendor, r.model)} className="rounded-md px-2 py-1 text-[11.5px] text-accent-brand hover:bg-accent-brand/10">
                  Try
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="hive-card p-5 text-[13px] text-text-muted">Nothing new yet. The first check of each provider sets the baseline; later releases appear here (and as a notification) automatically.</div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold">
            <Radar className="size-4 text-state-info" /> Latest across the market
          </h2>
          <span className="text-[12px] text-text-muted">{at ? `via OpenRouter’s public catalogue · updated ${timeAgo(at)} ago` : ''}</span>
          <div className="ml-auto flex items-center gap-2">
            <label className="flex h-8 w-56 items-center gap-2 rounded-lg bg-text-primary/[0.05] px-2.5">
              <Search className="size-3.5 text-text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search models" className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-text-muted" />
            </label>
            <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-text-primary/[0.06] p-0.5">
              {(
                [
                  ['new', 'Newest'],
                  ['cheap', 'Cheapest'],
                  ['context', 'Context'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setSort(k)} className={cn('h-7 rounded-md px-2.5 text-[11.5px]', sort === k ? 'bg-bg-surface shadow-sm' : 'text-text-muted')}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="hive-scroll mb-3 flex gap-1.5 overflow-x-auto pb-1">
          <button type="button" onClick={() => setLab('all')} className={cn('hive-chip shrink-0', lab === 'all' && 'bg-accent-brand/15 text-text-primary')}>
            All labs
          </button>
          {labs.map(([l, n]) => (
            <button key={l} type="button" onClick={() => setLab(l)} className={cn('hive-chip shrink-0', lab === l && 'bg-accent-brand/15 text-text-primary')}>
              {l} <span className="text-text-muted">{n}</span>
            </button>
          ))}
        </div>
        {loading && !market.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="hive-shimmer h-32 rounded-2xl" />
            ))}
          </div>
        ) : err && !market.length ? (
          <div className="hive-card p-5 text-[13px] text-text-muted">Couldn’t load the market feed ({err}). Your own keys’ models still refresh automatically.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {shown.map((m) => (
              <div key={m.id} className="hive-card hive-card-hover flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-text-primary/[0.06] text-[11px] font-bold uppercase">{m.lab.slice(0, 2)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{m.name}</div>
                    <div className="truncate font-mono text-[11px] text-text-muted">{m.id}</div>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10.5px]', Date.now() - m.created < 7 * 86400e3 ? 'bg-state-success/15 text-state-success' : 'bg-text-primary/[0.06] text-text-muted')}>{Date.now() - m.created < 7 * 86400e3 ? 'new · ' : ''}{timeAgo(m.created)}</span>
                </div>
                {m.description && <p className="mt-2 line-clamp-2 text-[12.5px] text-text-secondary">{m.description}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[11.5px] tabular-nums text-text-muted">
                  {m.context && <span>{fmtTokens(m.context)} context</span>}
                  {m.input != null && <span>${m.input.toFixed(m.input < 1 ? 3 : 2)} in</span>}
                  {m.output != null && <span>${m.output.toFixed(m.output < 1 ? 3 : 2)} out / M</span>}
                  <span className="flex items-center gap-1">
                    {m.modalities?.includes('image') && <Eye className="size-3" aria-label="images in" />}
                    {m.modalities?.includes('file') && <FileText className="size-3" aria-label="files in" />}
                    {m.modalities?.includes('audio') && <Music className="size-3" aria-label="audio in" />}
                  </span>
                  <span className="ml-auto flex gap-1">
                    {hasOpenRouter && (
                      <button type="button" onClick={() => tryIt('openrouter', m.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-accent-brand hover:bg-accent-brand/10">
                        <MessageSquare className="size-3" /> Try
                      </button>
                    )}
                    <a href={`https://openrouter.ai/${m.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 hover:bg-text-primary/[0.06] hover:text-text-primary">
                      Details <ArrowUpRight className="size-3" />
                    </a>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        {!hasOpenRouter && market.length > 0 && <p className="mt-3 text-[12px] text-text-muted">Add an OpenRouter key to try any of these in one click — one key reaches hundreds of models.</p>}
        {loading && market.length > 0 && <Loader2 className="mx-auto mt-4 size-4 animate-spin text-text-muted" />}
      </section>
    </div>
  )
}
