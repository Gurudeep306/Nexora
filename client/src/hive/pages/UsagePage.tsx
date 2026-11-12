import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip as RTooltip, XAxis } from 'recharts'
import { hiveApi } from '../api'
import { useHive } from '../store'
import { Meter, PageTitle, ProviderGlyph, UserDot, fmtCost, fmtTokens, keyShare, shareTone, vendorName, vendorStyle } from '../ui'

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

  const providers = useMemo(() => [...new Set((stats?.byProvider ?? []).map((r) => r.provider))], [stats])
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
    <div className="mx-auto w-full max-w-[920px] px-8 pb-20 pt-10">
      <PageTitle title="Usage" sub="Last 14 days, every provider and every person." />
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Tokens', fmtTokens(all.tokens)],
          ['Est. cost', fmtCost(all.cost) ?? '—'],
          ['Requests', all.requests.toLocaleString()],
          ['Agents now', String(stats?.runningAgents ?? 0)],
        ].map(([l, v]) => (
          <div key={l} className="hive-card px-4 py-3">
            <div className="text-[12px] text-text-muted">{l}</div>
            <div className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight">{v}</div>
          </div>
        ))}
      </div>

      <div className="hive-card mb-10 p-5">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} interval={1} />
              <RTooltip
                cursor={{ fill: 'color-mix(in oklab, var(--color-text-primary) 5%, transparent)' }}
                content={({ payload, label }) =>
                  payload?.length ? (
                    <div className="pop-surface px-3 py-2 text-[12px]">
                      <div className="mb-1 font-medium">{label}</div>
                      {payload.map((p) => (
                        <div key={String(p.dataKey)} className="flex items-center gap-1.5">
                          <span className="size-2 rounded-sm" style={{ background: p.color }} />
                          {vendorName(String(p.dataKey))}: {fmtTokens(Number(p.value))}
                        </div>
                      ))}
                    </div>
                  ) : null
                }
              />
              {providers.map((p, i) => (
                <Bar key={p} dataKey={p} stackId="a" fill={vendorStyle(p).color} radius={i === providers.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {providers.map((p) => (
            <span key={p} className="flex items-center gap-2 text-[13px] text-text-secondary">
              <ProviderGlyph provider={p} size="xs" />
              {vendorName(p)} <span className="tabular-nums text-text-muted">{fmtTokens(totals[p].tokens)}</span>
            </span>
          ))}
          {!providers.length && <span className="text-[13px] text-text-muted">No usage yet.</span>}
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
