import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCheck, Inbox, Info, XCircle } from 'lucide-react'
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
  const markRead = async () => {
    setUnread(0)
    setAlerts((l) => l?.map((a) => ({ ...a, read: 1 })) ?? l)
    await hiveApi.readAlerts().catch(() => {})
    window.dispatchEvent(new Event('hive:alerts-read'))
  }

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
          {unread > 0 && <span className="hv-num rounded-full bg-[var(--hv-surface-2)] px-1.5 text-[11px] text-[var(--hv-text-2)]">{unread} new</span>}
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
          <RowList label="Alerts">
            {(alerts ?? []).map((a) => {
              const L = LEVEL[a.level] ?? LEVEL.info
              return (
                <Row
                  key={a.id}
                  active={!a.read}
                  leading={<L.icon style={{ color: L.color }} />}
                  title={<span className={a.read ? '' : 'font-medium'}>{a.title}</span>}
                  meta={a.body || undefined}
                  trailing={<span className="text-[var(--hv-text-3)]">{timeAgo(a.created_at)}</span>}
                  onOpen={() => a.ref && navigate(a.ref.startsWith('/') ? a.ref : '/hive/spend/budgets')}
                />
              )
            })}
          </RowList>
        )}
      </section>
    </div>
  )
}
