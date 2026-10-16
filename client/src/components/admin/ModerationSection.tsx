import { useState } from 'react'
import { useToast } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { UserBadges } from '@/components/shared/UserBadges'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Chip, Confirm, Empty, Failed, Skeleton } from './kit'
import { ago } from './format'
import type { AdminMe, Report } from './types'

type Status = 'open' | 'resolved' | 'dismissed' | 'all'

const REASON_TONE: Record<string, string> = { harassment: 'danger', hate: 'danger', spam: 'warning', cheating: 'violet', inappropriate: 'danger' }

export function ModerationSection({ me, onOpenUser, onChanged }: { me: AdminMe; onOpenUser: (u: string) => void; onChanged?: () => void }) {
  const toast = useToast()
  const [status, setStatus] = useState<Status>('open')
  const [busy, setBusy] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Report | null>(null)
  const { data, loading, error, refetch } = useApi(
    () => api.get<{ reports: Report[]; counts: Record<string, number> }>('/api/admin/reports', { query: { status } }),
    [status],
  )
  const typeLabel = (t: string) => me.contentTypes.find((c) => c.key === t)?.label ?? t

  async function act(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key)
    try {
      await fn()
      toast.success(done)
      refetch()
      onChanged?.()
    } catch (e) {
      toast.error('Could not do that', e instanceof ApiError ? e.message : undefined)
    } finally {
      setBusy(null)
    }
  }

  const tabs: { id: Status; label: string; count?: number }[] = [
    { id: 'open', label: 'Open', count: data?.counts.open },
    { id: 'resolved', label: 'Resolved', count: data?.counts.resolved },
    { id: 'dismissed', label: 'Dismissed', count: data?.counts.dismissed },
    { id: 'all', label: 'All' },
  ]

  return (
    <div className="space-y-3">
      <div role="tablist" className="inline-flex gap-1 rounded-xl bg-bg-surface-2 p-1 shadow-[inset_0_0_0_1px_var(--nx-hair)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={status === t.id}
            onClick={() => setStatus(t.id)}
            className={cn(
              'flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors',
              status === t.id ? 'bg-bg-surface text-text-primary shadow-[0_1px_2px_oklch(0_0_0/0.15),inset_0_0_0_1px_var(--nx-hair)]' : 'text-text-muted hover:text-text-secondary',
            )}
          >
            {t.label}
            {!!t.count && <span className="nx-num text-[11px] text-text-muted">{t.count}</span>}
          </button>
        ))}
      </div>

      {error ? (
        <div className="nx-panel">
          <Failed message={error} onRetry={refetch} />
        </div>
      ) : loading && !data ? (
        <div className="space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : !data?.reports.length ? (
        <div className="nx-panel">
          <Empty icon="check-circle" title={status === 'open' ? 'The queue is clear' : 'Nothing here'}>
            Reports on posts, comments, messages and profiles land here.
          </Empty>
        </div>
      ) : (
        <ul className={cn('space-y-3', loading && 'opacity-70')}>
          {data.reports.map((r) => (
            <li key={r.id} className="nx-panel overflow-hidden">
              <div className="flex flex-wrap items-center gap-1.5 border-b border-[color:var(--nx-hair)] px-4 py-2.5 sm:px-5">
                <Chip>{typeLabel(r.content_type)}</Chip>
                <Chip tone={REASON_TONE[r.reason] ?? 'warning'} className="capitalize">
                  {r.reason}
                </Chip>
                {r.report_count > 1 && <Chip tone="danger">{r.report_count} reports</Chip>}
                {r.removed && (
                  <Chip tone="danger" icon="eye-off">
                    removed
                  </Chip>
                )}
                {r.status !== 'open' && <Chip tone={r.status === 'resolved' ? 'success' : undefined}>{r.status}</Chip>}
                <span className="nx-num ml-auto font-mono text-[11px] text-text-muted">#{r.content_id}</span>
                <span className="text-xs text-text-muted">{ago(r.created_at)}</span>
              </div>
              <div className="px-4 py-3.5 sm:px-5">
                {r.snapshot ? (
                  <blockquote className="rounded-xl bg-bg-surface-2 px-3.5 py-2.5 text-[13.5px] leading-relaxed break-words text-text-primary shadow-[inset_0_0_0_1px_var(--nx-hair)]">
                    {r.target_user && <span className="mr-1.5 font-semibold">@{r.target_user}</span>}
                    {r.snapshot}
                  </blockquote>
                ) : (
                  <p className="text-[13px] text-text-muted italic">No snapshot for this content type.</p>
                )}
                {r.details && <p className="mt-2.5 text-[13px] text-text-secondary">“{r.details}”</p>}
                <p className="mt-2.5 flex flex-wrap items-center gap-1 text-xs text-text-muted">
                  Reported by
                  <button type="button" onClick={() => onOpenUser(r.reporter)} className="inline-flex cursor-pointer items-center gap-1 font-medium text-text-secondary hover:text-text-primary">
                    @{r.reporter}
                    <UserBadges username={r.reporter} size={12} />
                  </button>
                  {r.status !== 'open' && r.resolved_by && (
                    <span>
                      · {r.status} by @{r.resolved_by}
                      {r.resolution ? ` — ${r.resolution}` : ''}
                    </span>
                  )}
                </p>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {r.status === 'open' && !r.removed && (
                    <button type="button" className="nx-btn" data-tone="danger" data-size="sm" onClick={() => setRemoving(r)}>
                      <Icon name="eye-off" /> Remove
                    </button>
                  )}
                  {r.status === 'open' && (
                    <>
                      <button
                        type="button"
                        className="nx-btn"
                        data-size="sm"
                        disabled={busy === `ok${r.id}`}
                        onClick={() => act(`ok${r.id}`, () => api.post(`/api/admin/reports/${r.id}/resolve`, { action: 'resolve' }), 'Marked resolved')}
                      >
                        <Icon name="check" /> Resolve
                      </button>
                      <button
                        type="button"
                        className="nx-btn !bg-transparent !shadow-none"
                        data-size="sm"
                        disabled={busy === `no${r.id}`}
                        onClick={() => act(`no${r.id}`, () => api.post(`/api/admin/reports/${r.id}/resolve`, { action: 'dismiss' }), 'Dismissed')}
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                  {r.removed && (
                    <button
                      type="button"
                      className="nx-btn"
                      data-size="sm"
                      disabled={busy === `rs${r.id}`}
                      onClick={() => act(`rs${r.id}`, () => api.post('/api/admin/content/restore', { content_type: r.content_type, content_id: r.content_id }), 'Content restored')}
                    >
                      <Icon name="refresh" /> Restore
                    </button>
                  )}
                  {r.target_user && (
                    <button type="button" className="nx-btn ml-auto" data-size="sm" onClick={() => onOpenUser(r.target_user!)}>
                      <Icon name="user" /> @{r.target_user}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Confirm
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove this ${removing ? typeLabel(removing.content_type).toLowerCase() : 'content'}?`}
        confirmLabel="Remove"
        danger
        onConfirm={() => removing ? act(`rm${removing.id}`, () => api.post(`/api/admin/reports/${removing.id}/resolve`, { action: 'remove' }), 'Content removed') : undefined}
      >
        It's hidden for everyone and every open report about it is resolved. You can restore it later.
      </Confirm>
    </div>
  )
}
