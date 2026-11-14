/* ────────────────────────────────────────────────────────────────────────
   The Inbox: everything that needs you, in one place. Home shows the same
   list at the top; the bell in the top bar opens the full page.
   ──────────────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, KeyRound, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui'
import { hiveApi } from './api'
import { Row, RowList, StatusPill } from './kit'
import { projectColor } from './projectColor'
import { useHive } from './store'
import type { HiveKey, Task } from './types'
import { timeAgo, vendorName } from './ui'

export type OverviewTask = Task & { project_name: string; project_color: string }

const DAY = 24 * 3600 * 1000

/** Recent tasks across every project, and today's totals. Refreshes when work changes. */
export function useOverview() {
  const { on, live } = useHive()
  const [tasks, setTasks] = useState<OverviewTask[]>([])
  const [today, setToday] = useState<{ tokens: number; requests: number; cost: number } | null>(null)
  const load = useCallback(() => {
    hiveApi
      .overview()
      .then((r) => {
        setTasks(r.tasks as OverviewTask[])
        setToday(r.today)
      })
      .catch(() => {})
  }, [])
  useEffect(load, [load, live.length])
  useEffect(() => on('task', load as never), [on, load])
  return { tasks, today }
}

/** What needs a person right now. */
export function useNeeds(tasks: OverviewTask[]) {
  const { boot, approvals } = useHive()
  const now = Date.now()
  const review = tasks.filter((t) => t.status === 'review').slice(0, 8)
  const failed = tasks.filter((t) => t.status === 'failed' && now - t.updated_at < DAY).slice(0, 5)
  const limited = (boot?.keys ?? []).filter((k) => !k.disabled && k.limitUntil && k.limitUntil > now)
  return { approvals, review, failed, limited, count: approvals.length + review.length + failed.length + limited.length }
}

export function Dot({ color }: { color: string }) {
  return <span className="size-2.5 rounded-full" style={{ background: projectColor(color) }} aria-hidden />
}

function untilText(ms: number) {
  const m = Math.max(1, Math.round((ms - Date.now()) / 60000))
  return m < 60 ? `${m}m` : `${Math.round(m / 60)}h`
}

/** The rows of "Needs you": approvals (with Run/Deny), work to review, failures, limits. */
export function NeedsList({ needs }: { needs: ReturnType<typeof useNeeds> }) {
  const navigate = useNavigate()
  const { answerApproval } = useHive()
  const open = (t: OverviewTask) => navigate(`/hive/p/${t.project_id}/t/${t.id}`)
  return (
    <RowList label="Needs you">
      {needs.approvals.map((a) => (
        <Row
          key={a.id}
          leading={<ShieldAlert className="text-[var(--hv-warning)]" />}
          title={
            <>
              <b className="font-medium">{a.agent}</b> wants to run a command on {a.machine}
            </>
          }
          meta={<span className="font-mono">$ {a.command}</span>}
          onOpen={() => navigate('/hive/machines')}
          actions={
            <>
              <Button size="sm" variant="primary" onClick={() => answerApproval(a.id, true)}>
                Run
              </Button>
              <Button size="sm" variant="ghost" onClick={() => answerApproval(a.id, false)}>
                Deny
              </Button>
            </>
          }
          className="[&_.hv-row-actions]:opacity-100"
        />
      ))}
      {needs.review.map((t) => (
        <Row key={t.id} leading={<Dot color={t.project_color} />} title={t.title} meta={`${t.project_name} · finished ${timeAgo(t.updated_at)} — check it and ship`} trailing={<StatusPill size="sm" status="review" />} onOpen={() => open(t)} />
      ))}
      {needs.failed.map((t) => (
        <Row key={t.id} leading={<Dot color={t.project_color} />} title={t.title} meta={`${t.project_name} · stopped with an error · ${timeAgo(t.updated_at)}`} trailing={<StatusPill size="sm" status="failed" />} onOpen={() => open(t)} />
      ))}
      {needs.limited.map((k: HiveKey) => (
        <Row key={k.id} leading={<KeyRound />} title={`${k.label || vendorName(k.provider)} reached its limit`} meta={k.limitNote || 'Other models take over until it frees up.'} trailing={<StatusPill size="sm" status="limited" label={`free in ${untilText(k.limitUntil!)}`} />} onOpen={() => navigate('/hive/keys')} />
      ))}
    </RowList>
  )
}

/** The bell in the top bar: opens the Inbox; the badge counts what needs you plus new alerts. */
export function InboxBell() {
  const { on } = useHive()
  const navigate = useNavigate()
  const { tasks } = useOverview()
  const needs = useNeeds(tasks)
  const [unread, setUnread] = useState(0)
  const load = useCallback(() => {
    hiveApi
      .alerts()
      .then((r) => setUnread(r.unread))
      .catch(() => {})
  }, [])
  useEffect(load, [load])
  useEffect(() => on('alert', load as never), [on, load])
  useEffect(() => {
    const read = () => setUnread(0)
    window.addEventListener('hive:alerts-read', read)
    return () => window.removeEventListener('hive:alerts-read', read)
  }, [])
  const n = needs.count + unread
  const label = n ? `Inbox — ${needs.count ? `${needs.count} need${needs.count === 1 ? 's' : ''} you` : ''}${needs.count && unread ? ', ' : ''}${unread ? `${unread} new alert${unread === 1 ? '' : 's'}` : ''}` : 'Inbox'
  return (
    <button type="button" onClick={() => navigate('/hive/inbox')} title={label} aria-label={label} className="relative grid size-8 place-items-center rounded-lg text-[var(--hv-text-2)] hover:bg-[var(--hv-surface-2)] hover:text-[var(--hv-text-1)]">
      <Bell className="size-4" />
      {n > 0 && <span className="hv-num absolute right-0.5 top-0.5 grid min-w-3.5 place-items-center rounded-full bg-[var(--hv-accent)] px-1 text-[9px] font-bold leading-[14px] text-[var(--hv-accent-fg)]">{n > 9 ? '9+' : n}</span>}
    </button>
  )
}
