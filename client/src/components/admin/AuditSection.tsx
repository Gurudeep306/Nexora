import { useCallback, useEffect, useState } from 'react'
import { Select } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Empty, Failed, RolePill, Skeleton } from './kit'
import { ago, when } from './format'
import type { AdminMe, AuditEntry } from './types'
import { auditLabel } from './auditLabels'

const ACTIONS = [
  ['all', 'All actions'],
  ['user.', 'Users'],
  ['user.role', 'Role changes'],
  ['user.permissions', 'Permissions'],
  ['user.ban', 'Bans'],
  ['user.suspend', 'Suspensions'],
  ['staff.', 'Staff access'],
  ['site.', 'Site settings'],
  ['ai.', 'AI models'],
  ['runner.', 'Code runners'],
  ['compilers.', 'Compilers'],
  ['announcement.', 'Announcements'],
  ['report.', 'Reports'],
  ['content.', 'Content'],
] as const

const TONE: Record<string, string> = {
  user: 'var(--nx-b1)',
  site: 'var(--color-state-warning)',
  announcement: 'var(--nx-b3)',
  report: 'var(--color-state-error)',
  content: 'var(--color-state-error)',
}

function Json({ value }: { value: unknown }) {
  if (value == null) return <span className="text-text-muted">—</span>
  return (
    <pre className="overflow-x-auto rounded-lg bg-bg-surface-2 px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-text-primary shadow-[inset_0_0_0_1px_var(--nx-hair)]">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

export function AuditSection({ me }: { me: AdminMe }) {
  const [action, setAction] = useState('all')
  const [actor, setActor] = useState('')
  const [target, setTarget] = useState('')
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [next, setNext] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<number | null>(null)

  const load = useCallback(
    async (before?: number) => {
      setLoading(true)
      setError(null)
      try {
        const r = await api.get<{ entries: AuditEntry[]; next: number | null }>('/api/admin/audit', {
          query: { action: action === 'all' ? undefined : action, actor: actor.trim() || undefined, target: target.trim() || undefined, before, limit: 50 },
        })
        setEntries((prev) => (before ? [...prev, ...r.entries] : r.entries))
        setNext(r.next)
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not load the audit log')
      } finally {
        setLoading(false)
      }
    },
    [action, actor, target],
  )

  useEffect(() => {
    const t = setTimeout(() => void load(), 200)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-3">
      <div className="nx-panel flex flex-col gap-2 p-2.5 sm:flex-row">
        <Select value={action} onValueChange={setAction} aria-label="Action" className="!h-[2.375rem] sm:w-48">
          {ACTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <label className="relative block flex-1">
          <Icon name="user" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" />
          <input className="nx-input !pl-9" value={actor} onChange={(e) => setActor(e.target.value)} placeholder="Who did it" aria-label="Actor" />
        </label>
        <label className="relative block flex-1">
          <Icon name="target" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" />
          <input className="nx-input !pl-9" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target" aria-label="Target" />
        </label>
      </div>
      {!me.isOwner && <p className="px-1 text-xs text-text-muted">You see your own actions and those of roles below yours.</p>}
      {error ? (
        <div className="nx-panel">
          <Failed message={error} onRetry={() => void load()} />
        </div>
      ) : loading && !entries.length ? (
        <Skeleton className="h-96" />
      ) : !entries.length ? (
        <div className="nx-panel">
          <Empty icon="list" title="No admin actions match">
            Try another filter.
          </Empty>
        </div>
      ) : (
        <div className="nx-panel">
          <div className="sticky top-14 z-10 hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_88px_20px] gap-3 rounded-t-2xl border-b border-[color:var(--nx-hair)] bg-bg-surface/90 px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase backdrop-blur-md md:grid">
            <span>Action</span>
            <span>Target</span>
            <span>By</span>
            <span className="text-right">When</span>
            <span />
          </div>
          <ul>
            {entries.map((e, i) => {
              const isOpen = open === e.id
              const tone = TONE[e.action.split('.')[0]] ?? 'var(--color-text-secondary)'
              return (
                <li key={e.id} className={cn(i > 0 && 'border-t border-[color:var(--nx-hair)]')}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : e.id)}
                    aria-expanded={isOpen}
                    className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-[color-mix(in_oklab,var(--color-text-primary)_3%,transparent)] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_88px_20px]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="size-1.5 shrink-0 rounded-full" style={{ background: tone }} />
                      <span className="truncate text-[13px] font-medium text-text-primary" title={e.action}>
                        {auditLabel(e.action)}
                      </span>
                    </span>
                    <span className="truncate text-text-primary max-md:col-start-1">{e.target ? (e.target_type === 'user' ? `@${e.target}` : e.target) : '—'}</span>
                    <span className="flex min-w-0 items-center gap-1.5 text-text-secondary max-md:col-start-1">
                      <span className="truncate">@{e.actor}</span>
                      {e.actor_role && <RolePill role={e.actor_role} className="hidden xl:inline-flex" />}
                    </span>
                    <span className="nx-num text-right text-xs text-text-muted max-md:col-start-2 max-md:row-start-1" title={when(e.created_at)}>
                      {ago(e.created_at)}
                    </span>
                    <Icon name="sort" className={cn('hidden size-3.5 text-text-muted transition-transform md:block', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="grid gap-3 px-4 pt-1 pb-4 text-xs sm:grid-cols-2">
                      <div>
                        <p className="mb-1.5 font-semibold text-text-muted">Before</p>
                        <Json value={e.before} />
                      </div>
                      <div>
                        <p className="mb-1.5 font-semibold text-text-muted">After</p>
                        <Json value={e.after} />
                      </div>
                      <p className="text-text-muted sm:col-span-2">
                        {when(e.created_at)} · IP {e.ip ?? '—'} · #{e.id}
                      </p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          {next && (
            <div className="border-t border-[color:var(--nx-hair)] p-3 text-center">
              <button type="button" className="nx-btn" data-size="sm" disabled={loading} onClick={() => void load(next)}>
                Load older
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
