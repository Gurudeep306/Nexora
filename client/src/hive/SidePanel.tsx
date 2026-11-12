import { useEffect, useMemo, useState } from 'react'
import { BarChart3, KeyRound, Users } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip as RTooltip, XAxis } from 'recharts'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { KeysPanel } from './KeysPanel'
import { StaffChat } from './BoardView'
import { useHive } from './store'
import type { ProviderId } from './types'
import { PROVIDER_STYLE, UserDot, fmtCost, fmtTokens, timeAgo } from './ui'

export type SideTab = 'keys' | 'usage' | 'team'

export function SidePanel({ tab, onTab }: { tab: SideTab; onTab: (t: SideTab) => void }) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border/70 bg-bg-surface/40">
      <div className="flex gap-1 border-b border-border/70 p-1.5">
        {(
          [
            ['keys', 'Key vault', KeyRound],
            ['usage', 'Usage', BarChart3],
            ['team', 'Team', Users],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            className={cn('flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-medium', tab === id ? 'bg-text-primary/8 text-text-primary' : 'text-text-muted hover:text-text-secondary')}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>
      <div className="hive-scroll min-h-0 flex-1 overflow-y-auto">
        {tab === 'keys' && <KeysPanel />}
        {tab === 'usage' && <UsagePanel />}
        {tab === 'team' && <TeamPanel />}
      </div>
    </aside>
  )
}

function UsagePanel() {
  const { boot } = useHive()
  const [stats, setStats] = useState<Awaited<ReturnType<typeof hiveApi.stats>> | null>(null)
  useEffect(() => {
    let live = true
    const load = () => hiveApi.stats().then((s) => live && setStats(s)).catch(() => {})
    load()
    const t = setInterval(load, 15000)
    return () => {
      live = false
      clearInterval(t)
    }
  }, [boot?.keys])

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

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          ['Agents live', stats?.runningAgents ?? 0],
          ['Tasks', stats?.tasks.total ?? 0],
          ['PRs opened', stats?.tasks.prs ?? 0],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-border bg-bg-surface/60 px-3 py-2">
            <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{l}</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums text-text-primary">{v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-bg-surface/60 p-3">
        <div className="mb-2 text-xs font-semibold text-text-primary">Tokens per day · last 14 days</div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} interval={2} />
              <RTooltip
                cursor={{ fill: 'color-mix(in oklab, var(--color-text-primary) 5%, transparent)' }}
                content={({ payload, label }) =>
                  payload?.length ? (
                    <div className="pop-surface px-2.5 py-1.5 text-[11px]">
                      <div className="mb-1 font-medium">{label}</div>
                      {payload.map((p) => (
                        <div key={String(p.dataKey)} className="flex items-center gap-1.5">
                          <span className="size-2 rounded-sm" style={{ background: p.color }} />
                          {PROVIDER_STYLE[p.dataKey as ProviderId]?.name}: {fmtTokens(Number(p.value))}
                        </div>
                      ))}
                    </div>
                  ) : null
                }
              />
              {(Object.keys(PROVIDER_STYLE) as ProviderId[]).map((p, i, arr) => (
                <Bar key={p} dataKey={p} stackId="a" fill={PROVIDER_STYLE[p].hue} radius={i === arr.length - 1 ? [3, 3, 0, 0] : 0} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {(Object.keys(totals) as ProviderId[]).map((p) => (
            <div key={p} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <span className="size-2 rounded-sm" style={{ background: PROVIDER_STYLE[p]?.hue }} />
              {PROVIDER_STYLE[p]?.name} <span className="ml-auto tabular-nums text-text-muted">{fmtTokens(totals[p].tokens)}{fmtCost(totals[p].cost) ? ` · ${fmtCost(totals[p].cost)}` : ''}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-bg-surface/60 p-3">
        <div className="mb-2 text-xs font-semibold text-text-primary">Today by person</div>
        {!stats?.byUser.length && <p className="text-xs text-text-muted">No usage today yet.</p>}
        <div className="flex flex-col gap-2">
          {stats?.byUser.map((u) => {
            const max = Math.max(...stats.byUser.map((x) => Number(x.tokens)), 1)
            return (
              <div key={u.username} className="flex items-center gap-2">
                <UserDot username={u.username} size={5} />
                <span className="w-24 truncate text-xs text-text-secondary">@{u.username}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-text-primary/8">
                  <div className="h-full rounded-full bg-accent-brand" style={{ width: `${(Number(u.tokens) / max) * 100}%` }} />
                </div>
                <span className="w-12 text-right text-[11px] tabular-nums text-text-muted">{fmtTokens(Number(u.tokens))}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TeamPanel() {
  const { boot, online, select } = useHive()
  if (!boot) return null
  const onlineSet = new Set(online.map((o) => o.username))
  const projectName = (id: string | null | undefined) => boot.projects.find((p) => p.id === id)?.name
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="rounded-xl border border-border bg-bg-surface/60 p-3">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-text-primary">
          Staff <span className="font-normal text-text-muted">{online.length} online</span>
        </div>
        <div className="flex flex-col gap-1">
          {[...boot.members].sort((a, b) => Number(onlineSet.has(b.username)) - Number(onlineSet.has(a.username))).map((m) => {
            const o = online.find((x) => x.username === m.username)
            return (
              <button
                key={m.username}
                type="button"
                disabled={!o?.view?.projectId}
                onClick={() => o?.view?.projectId && select(o.view.projectId, o.view.taskId)}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-left enabled:hover:bg-text-primary/5"
              >
                <span className="relative">
                  <UserDot username={m.username} size={6} />
                  <span className={cn('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-bg-surface', o ? 'bg-state-success' : 'bg-text-muted/50')} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-text-primary">
                    {m.display_name || m.username} <span className="text-text-muted">· {m.role}</span>
                  </span>
                  <span className="block truncate text-[10px] text-text-muted">
                    {o ? (o.view?.projectId ? `In ${projectName(o.view.projectId) ?? 'a project'}${o.view.taskId ? ' · watching a task' : ''}` : `Online · ${timeAgo(o.since)}`) : 'Offline'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <StaffChat className="min-h-80" />
    </div>
  )
}
