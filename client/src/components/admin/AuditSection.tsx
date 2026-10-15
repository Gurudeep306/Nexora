import { useCallback, useEffect, useState } from 'react'
import { Button, ErrorState, Input, LoadingBlock, Select } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { RolePill } from './kit'
import { ago, when } from './format'
import type { AdminMe, AuditEntry } from './types'

const ACTIONS = [
  ['all', 'All actions'],
  ['user.', 'Users'],
  ['user.role', 'Role changes'],
  ['user.permissions', 'Permissions'],
  ['user.ban', 'Bans'],
  ['user.suspend', 'Suspensions'],
  ['site.', 'Site settings'],
  ['announcement.', 'Announcements'],
  ['report.', 'Reports'],
  ['content.', 'Content'],
] as const

const TONE: Record<string, string> = {
  user: 'text-accent-brand',
  site: 'text-state-warning',
  announcement: 'text-state-info',
  report: 'text-state-error',
  content: 'text-state-error',
}

function Json({ value }: { value: unknown }) {
  if (value == null) return <span className="text-text-muted">—</span>
  return <pre className="overflow-x-auto rounded-md bg-bg-surface-3 px-2 py-1.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-text-primary">{JSON.stringify(value, null, 2)}</pre>
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

  const load = useCallback(async (before?: number) => {
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
  }, [action, actor, target])

  useEffect(() => {
    const t = setTimeout(() => void load(), 200)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-4">
      <div className="card flex flex-col gap-2 p-3 sm:flex-row">
        <Select value={action} onValueChange={setAction} aria-label="Action" className="sm:w-48">
          {ACTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="Who (actor)" aria-label="Actor" />
        <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target" aria-label="Target" />
      </div>
      {!me.isOwner && <p className="px-1 text-xs text-text-muted">You see your own actions and those of roles below yours.</p>}
      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading && !entries.length ? (
        <LoadingBlock rows={8} />
      ) : !entries.length ? (
        <p className="card px-4 py-10 text-center text-sm text-text-secondary">No admin actions match.</p>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-border">
            {entries.map((e) => {
              const isOpen = open === e.id
              const hasDiff = e.before != null || e.after != null
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : e.id)}
                    aria-expanded={isOpen}
                    className="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left text-sm transition-colors hover:bg-bg-surface-2"
                  >
                    <span className={cn('font-mono text-[12px] font-semibold', TONE[e.action.split('.')[0]] ?? 'text-text-primary')}>{e.action}</span>
                    {e.target && <span className="truncate text-text-primary">{e.target_type === 'user' ? `@${e.target}` : e.target}</span>}
                    <span className="ml-auto flex items-center gap-2 text-xs text-text-secondary">
                      @{e.actor}
                      {e.actor_role && <RolePill role={e.actor_role} />}
                      <span className="w-20 text-right text-text-muted" title={when(e.created_at)}>
                        {ago(e.created_at)}
                      </span>
                      {hasDiff && <Icon name="sort" className={cn('size-3.5 transition-transform', isOpen && 'rotate-180')} />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="grid gap-3 bg-bg-surface-2/50 px-4 pt-1 pb-3 text-xs sm:grid-cols-2">
                      <div>
                        <p className="mb-1 font-semibold text-text-muted">Before</p>
                        <Json value={e.before} />
                      </div>
                      <div>
                        <p className="mb-1 font-semibold text-text-muted">After</p>
                        <Json value={e.after} />
                      </div>
                      <p className="text-text-muted sm:col-span-2">
                        {when(e.created_at)} · IP {e.ip ?? '—'}
                      </p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          {next && (
            <div className="border-t border-border p-3 text-center">
              <Button size="sm" variant="secondary" loading={loading} onClick={() => void load(next)}>
                Older
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
