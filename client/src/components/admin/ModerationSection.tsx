import { useState } from 'react'
import { Button, ErrorState, LoadingBlock, Tabs, useToast } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Panel } from './kit'
import { ago } from './format'
import type { AdminMe, Report } from './types'

type Status = 'open' | 'resolved' | 'dismissed' | 'all'

export function ModerationSection({ me, onOpenUser }: { me: AdminMe; onOpenUser: (u: string) => void }) {
  const toast = useToast()
  const [status, setStatus] = useState<Status>('open')
  const [busy, setBusy] = useState<string | null>(null)
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
    } catch (e) {
      toast.error('Could not do that', e instanceof ApiError ? e.message : undefined)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <Tabs
        variant="pill"
        active={status}
        onChange={(id) => setStatus(id as Status)}
        items={[
          { id: 'open', label: 'Open', badge: data?.counts.open || undefined },
          { id: 'resolved', label: 'Resolved' },
          { id: 'dismissed', label: 'Dismissed' },
          { id: 'all', label: 'All' },
        ]}
      />
      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : loading && !data ? (
        <LoadingBlock rows={5} />
      ) : !data?.reports.length ? (
        <Panel>
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-state-success/10 text-state-success">
              <Icon name="check-circle" className="size-5" />
            </span>
            <p className="text-sm font-medium text-text-primary">{status === 'open' ? 'The queue is clear' : 'Nothing here'}</p>
            <p className="text-xs text-text-secondary">Reports on posts, comments, messages and profiles land here.</p>
          </div>
        </Panel>
      ) : (
        <ul className="space-y-3">
          {data.reports.map((r) => (
            <li key={r.id} className={cn('card p-4', loading && 'opacity-70')}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-border bg-bg-surface-2 px-2 py-0.5 font-medium text-text-primary">{typeLabel(r.content_type)}</span>
                <span className="font-mono text-text-muted">#{r.content_id}</span>
                <span className="rounded-full border border-state-warning/30 bg-state-warning/10 px-2 py-0.5 font-medium text-state-warning">{r.reason}</span>
                {r.report_count > 1 && <span className="text-text-secondary">{r.report_count} reports</span>}
                {r.removed && <span className="rounded-full border border-state-error/25 bg-state-error/10 px-2 py-0.5 font-medium text-state-error">Removed</span>}
                <span className="ml-auto text-text-muted">{ago(r.created_at)}</span>
              </div>
              {r.snapshot && <blockquote className="mt-3 rounded-lg border-l-2 border-border-strong bg-bg-surface-2 px-3 py-2 text-sm break-words text-text-primary">{r.snapshot}</blockquote>}
              {r.details && <p className="mt-2 text-sm text-text-secondary">“{r.details}”</p>}
              <p className="mt-2 text-xs text-text-secondary">
                Reported by{' '}
                <button type="button" onClick={() => onOpenUser(r.reporter)} className="cursor-pointer text-accent-brand hover:underline">
                  @{r.reporter}
                </button>
                {r.target_user && (
                  <>
                    {' · about '}
                    <button type="button" onClick={() => onOpenUser(r.target_user!)} className="cursor-pointer text-accent-brand hover:underline">
                      @{r.target_user}
                    </button>
                  </>
                )}
                {r.status !== 'open' && r.resolved_by && (
                  <span className="text-text-muted">
                    {' '}
                    · {r.status} by @{r.resolved_by}
                    {r.resolution ? ` (${r.resolution})` : ''}
                  </span>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === 'open' && (
                  <>
                    {!r.removed && (
                      <Button size="sm" variant="danger" loading={busy === `rm${r.id}`} onClick={() => act(`rm${r.id}`, () => api.post(`/api/admin/reports/${r.id}/resolve`, { action: 'remove' }), 'Content removed')}>
                        <Icon name="eye-off" /> Remove content
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" loading={busy === `ok${r.id}`} onClick={() => act(`ok${r.id}`, () => api.post(`/api/admin/reports/${r.id}/resolve`, { action: 'resolve' }), 'Marked resolved')}>
                      <Icon name="check" /> Resolve
                    </Button>
                    <Button size="sm" variant="ghost" loading={busy === `no${r.id}`} onClick={() => act(`no${r.id}`, () => api.post(`/api/admin/reports/${r.id}/resolve`, { action: 'dismiss' }), 'Dismissed')}>
                      Dismiss
                    </Button>
                  </>
                )}
                {r.removed && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busy === `rs${r.id}`}
                    onClick={() => act(`rs${r.id}`, () => api.post('/api/admin/content/restore', { content_type: r.content_type, content_id: r.content_id }), 'Content restored')}
                  >
                    <Icon name="refresh" /> Restore
                  </Button>
                )}
                {r.target_user && (
                  <Button size="sm" variant="ghost" onClick={() => onOpenUser(r.target_user!)}>
                    <Icon name="user" /> Open user
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
