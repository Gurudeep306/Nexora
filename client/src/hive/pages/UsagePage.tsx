import { useEffect, useMemo, useState } from 'react'
import { PageHeader, StackedBars } from '../kit'
import { hiveApi } from '../api'
import { useHive } from '../store'
import { Meter, ProviderGlyph, UserDot, fmtCost, fmtTokens, keyShare, shareTone, vendorName } from '../ui'

type Stats = Awaited<ReturnType<typeof hiveApi.stats>>

export default function UsagePage() {
  const { boot } = useHive()
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => {
    let live = true
    const load = () => hiveApi.stats().then((s) => live && setStats(s)).catch(() => {})
    load()
    const t = setInterval(load, 15000)
    return () => {
      live = false
      clearInterval(t)
    }
  }, [])

  // Sorted by name, so a provider keeps its colour when others come and go.
  const providers = useMemo(() => [...new Set((stats?.byProvider ?? []).map((r) => r.provider))].sort(), [stats])
  const seriesColor = (p: string) => {
    const i = providers.indexOf(p)
    return i >= 0 && i < 6 ? `var(--hv-series-${i + 1})` : 'var(--hv-text-3)'
  }
  const data = useMemo(() => {
    const days: Record<string, Record<string, number | string>> = {}
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400e3).toISOString().slice(0, 10)
      days[d] = { day: d.slice(5) }
    }
    for (const r of stats?.byProvider ?? []) if (days[r.day]) days[r.day][r.provider] = Number(r.input) + Number(r.output)
    return Object.values(days)
  }, [stats])
  const totals = useMemo(() => {
    const t: Record<string, { tokens: number; cost: number; requests: number }> = {}
    for (const r of stats?.byProvider ?? []) {
      const x = (t[r.provider] ||= { tokens: 0, cost: 0, requests: 0 })
      x.tokens += Number(r.input) + Number(r.output)
      x.cost += Number(r.cost || 0)
      x.requests += Number(r.requests)
    }
    return t
  }, [stats])
  if (!boot) return null
  const all = Object.values(totals).reduce((a, x) => ({ tokens: a.tokens + x.tokens, cost: a.cost + x.cost, requests: a.requests + x.requests }), { tokens: 0, cost: 0, requests: 0 })

  return (
    <div className="mx-auto w-full max-w-[920px] px-4 pb-20 pt-6 sm:px-6">
      <PageHeader title="Spend" sub="Last 14 days, every provider and every person." />
      <p className="hv-num mb-6 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--hv-text-3)]">
        <span>
          <b className="font-medium text-[var(--hv-text-1)]">{fmtTokens(all.tokens)}</b> tokens
        </span>
        <span>
          <b className="font-medium text-[var(--hv-text-1)]">{fmtCost(all.cost) ?? '$0'}</b> estimated
        </span>
        <span>
          <b className="font-medium text-[var(--hv-text-1)]">{all.requests.toLocaleString()}</b> requests
        </span>
        <span>
          <b className="font-medium text-[var(--hv-text-1)]">{stats?.runningAgents ?? 0}</b> agents working now
        </span>
      </p>

      <div className="mb-10 rounded-[var(--hv-r-card)] border border-[var(--hv-border)] bg-[var(--hv-surface-1)] p-4 sm:p-5">
        <div>
          <StackedBars
            ariaLabel="Tokens per day, by provider, last 14 days"
            rows={data}
            series={providers.map((p) => ({ key: p, label: vendorName(p), color: seriesColor(p) }))}
            value={(d, k) => Number((d as Record<string, unknown>)[k] ?? 0)}
            label={(d) => String(d.day)}
            yFormat={fmtTokens}
            height={224}
            tip={(d) => (
              <>
                <div className="mb-1 font-medium">{String(d.day)}</div>
                {providers.map((p) => (
                  <div key={p} className="flex items-center gap-1.5">
                    <span className="size-2 rounded-[2px]" style={{ background: seriesColor(p) }} />
                    {vendorName(p)}: {fmtTokens(Number((d as Record<string, unknown>)[p] ?? 0))}
                  </div>
                ))}
              </>
            )}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {providers.map((p) => (
            <span key={p} className="flex items-center gap-2 text-[13px] text-text-secondary">
              <ProviderGlyph provider={p} size="xs" />
              {vendorName(p)} <span className="tabular-nums text-text-muted">{fmtTokens(totals[p].tokens)}</span>
            </span>
          ))}
          {!providers.length && <span className="text-[13px] text-text-muted">No usage yet — start a chat and it shows up here.</span>}
        </div>
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-[13px] font-medium text-text-secondary">Today by person</h2>
          <div className="space-y-3">
            {!stats?.byUser.length && <p className="text-[13px] text-text-muted">No usage today.</p>}
            {stats?.byUser.map((u) => {
              const max = Math.max(...stats.byUser.map((x) => Number(x.tokens)), 1)
              return (
                <div key={u.username} className="flex items-center gap-3">
                  <UserDot username={u.username} size={6} />
                  <span className="w-24 truncate text-[13px]">@{u.username}</span>
                  <Meter value={Number(u.tokens) / max} className="flex-1" />
                  <span className="w-14 text-right text-[12.5px] tabular-nums text-text-muted">{fmtTokens(Number(u.tokens))}</span>
                </div>
              )
            })}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-[13px] font-medium text-text-secondary">Budgets</h2>
          <div className="space-y-3">
            {boot.keys.map((k) => (
              <div key={k.id} className="flex items-center gap-3">
                <ProviderGlyph provider={k.provider} size="xs" />
                <span className="w-32 truncate text-[13px]">{k.label}</span>
                <Meter value={keyShare(k) ?? 1} color={keyShare(k) == null ? 'color-mix(in oklab, var(--color-text-muted) 35%, transparent)' : shareTone(keyShare(k))} className="flex-1" />
                <span className="w-16 text-right text-[12.5px] tabular-nums text-text-muted">{k.tokenLimit == null ? '∞' : `${fmtTokens(k.remaining)} left`}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
