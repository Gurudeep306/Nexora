import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, CheckCheck, Inbox, Info, XCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { hiveApi } from '../api'
import { NeedsList, useNeeds, useOverview } from '../Inbox'
import { Empty, PageHeader, Row, RowList } from '../kit'
import { useHive } from '../store'
import type { HiveAlert } from '../types'
import { timeAgo } from '../ui'

const LEVEL = {
  info: { icon: Info, color: 'var(--hv-info)' },
  warn: { icon: AlertTriangle, color: 'var(--hv-warning)' },
  error: { icon: XCircle, color: 'var(--hv-danger)' },
}

/** "Today" / "Yesterday" / "Mon 10 Nov" for a day key (Date.toDateString()). */
function dayLabel(key: string): string {
  const d = new Date(key)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Everything that needs you, then every alert (budgets, limits, overnight results). */
export default function InboxPage() {
  const navigate = useNavigate()
  const { on } = useHive()
  const { tasks } = useOverview()
  const needs = useNeeds(tasks)
  const [alerts, setAlerts] = useState<HiveAlert[] | null>(null)
  const [unread, setUnread] = useState(0)
  const load = useCallback(() => {
    hiveApi
      .alerts()
      .then((r) => {
        setAlerts(r.alerts)
        setUnread(r.unread)
      })
      .catch(() => setAlerts([]))
  }, [])
  useEffect(load, [load])
  useEffect(() => on('alert', load as never), [on, load])
  const marked = useRef(new Set<string>())
  const markRead = async () => {
    setUnread(0)
    setAlerts((l) => l?.map((a) => ({ ...a, read: 1 })) ?? l)
    await hiveApi.readAlerts().catch(() => {})
    window.dispatchEvent(new Event('hive:alerts-read'))
  }
  const markReadOne = async (id: string) => {
    if (marked.current.has(id)) return
    marked.current.add(id)
    setUnread((u) => Math.max(0, u - 1))
    setAlerts((l) => l?.map((a) => (a.id === id ? { ...a, read: 1 } : a)) ?? l)
    await hiveApi.readAlerts(id).catch(() => {})
    window.dispatchEvent(new Event('hive:alerts-changed'))
  }
  // Alerts arrive newest-first; group them under day labels.
  const groups = useMemo(() => {
    const m = new Map<string, HiveAlert[]>()
    for (const a of alerts ?? []) {
      const key = new Date(a.created_at).toDateString()
      const list = m.get(key) ?? []
      list.push(a)
      m.set(key, list)
    }
    return [...m.entries()]
  }, [alerts])

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-20 pt-8 sm:px-6">
      <PageHeader title="Inbox" sub="What needs you, and everything Hive told you about." />

      <section aria-label="Needs you" className="mt-8">
        <h2 className="mb-1.5 flex items-center gap-2 px-2.5 text-[13px] font-semibold text-[var(--hv-text-1)]">
          Needs you {needs.count > 0 && <span className="hv-num rounded-full bg-[var(--hv-surface-2)] px-1.5 text-[11px] font-normal text-[var(--hv-text-2)]">{needs.count}</span>}
        </h2>
        {needs.count ? <NeedsList needs={needs} /> : <p className="px-2.5 text-[13px] text-[var(--hv-text-3)]">Nothing is waiting on you.</p>}
      </section>

      <section aria-label="Alerts" className="mt-10">
        <div className="mb-1.5 flex items-center gap-2 px-2.5">
          <h2 className="text-[13px] font-semibold text-[var(--hv-text-1)]">Alerts</h2>
          {unread > 0 && <span className="hv-num rounded-full bg-[var(--hv-surface-2)] px-1.5 text-[11px] text-[var(--hv-text-2)]">{unread > 9 ? '9+' : unread} new</span>}
          {unread > 0 && (
            <Button size="sm" variant="ghost" className="ml-auto" onClick={markRead}>
              <CheckCheck className="size-3.5" /> Mark all read
            </Button>
          )}
        </div>
        {alerts && !alerts.length ? (
          <Empty icon={<Inbox />} title="All quiet">
            Budget warnings, plan limits and overnight results land here.
          </Empty>
        ) : (
          <div className="space-y-5">
            {groups.map(([key, list], gi) => (
              <section key={key} aria-label={dayLabel(key)} className={gi ? 'mt-5' : undefined}>
                <h3 className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--hv-text-3)]">{dayLabel(key)}</h3>
                <RowList label={`Alerts ${dayLabel(key)}`}>
                  {list.map((a) => {
                    const L = LEVEL[a.level] ?? LEVEL.info
                    return (
                      <Row
                        key={a.id}
                        active={!a.read}
                        leading={<L.icon style={{ color: L.color }} />}
                        title={<span className={a.read ? '' : 'font-medium'}>{a.title}</span>}
                        meta={a.body || undefined}
                        trailing={
                          <>
                            {!a.read && <span className="size-1.5 rounded-full bg-[var(--hv-accent)]" aria-label="Unread" />}
                            <span className="text-[var(--hv-text-3)]">{timeAgo(a.created_at)}</span>
                          </>
                        }
                        actions={
                          !a.read ? (
                            <Button size="icon-sm" variant="ghost" aria-label={`Mark read: ${a.title}`} onClick={() => void markReadOne(a.id)}>
                              <Check className="size-3.5" />
                            </Button>
                          ) : undefined
                        }
                        onOpen={() => {
                          if (!a.read) void markReadOne(a.id)
                          if (a.ref) navigate(a.ref.startsWith('/') ? a.ref : '/hive/spend/budgets')
                        }}
                      />
                    )
                  })}
                </RowList>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
