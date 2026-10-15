import { useEffect, useState } from 'react'
import { Avatar, Button, ErrorState, LoadingBlock, SearchInput, Select } from '@/components/ui'
import { UserBadges } from '@/components/shared/UserBadges'
import { Icon } from '@/components/icon/Icon'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { cn, formatNumber } from '@/lib/utils'
import { RolePill } from './kit'
import { ago } from './format'
import type { AdminUserRow } from './types'

interface Filters {
  q: string
  role: string
  status: string
  joined: string
  active: string
  sort: string
}
const INITIAL: Filters = { q: '', role: 'all', status: 'all', joined: 'all', active: 'all', sort: 'joined' }
const PAGE = 50

export function UsersSection({ onOpenUser, revision }: { onOpenUser: (username: string) => void; revision: number }) {
  const [filters, setFilters] = useState<Filters>(INITIAL)
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const set = (k: keyof Filters) => (v: string) => {
    setFilters((f) => ({ ...f, [k]: v }))
    setLimit(PAGE)
  }

  // Debounced search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === q.trim() ? f : { ...f, q: q.trim() }))
      setLimit(PAGE)
    }, 200)
    return () => clearTimeout(t)
  }, [q])

  const query = {
    q: filters.q || undefined,
    role: filters.role === 'all' ? undefined : filters.role,
    status: filters.status === 'all' ? undefined : filters.status,
    joined: filters.joined === 'all' ? undefined : filters.joined,
    active: filters.active === 'all' ? undefined : filters.active,
    sort: filters.sort,
    limit,
  }
  const { data, loading, error, refetch } = useApi(
    () => api.get<{ users: AdminUserRow[]; total: number }>('/api/admin/users', { query }),
    [JSON.stringify(query), revision],
  )

  const filtered = JSON.stringify({ ...filters, q }) !== JSON.stringify({ ...INITIAL, q: '' })

  return (
    <div className="space-y-4">
      <div className="card flex flex-col gap-2 p-3 2xl:flex-row 2xl:items-center">
        <SearchInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onClear={() => setQ('')}
          placeholder="Search username, name or email"
          containerClassName="2xl:flex-1"
          aria-label="Search users"
          autoFocus
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 2xl:flex 2xl:flex-none">
          <Select value={filters.role} onValueChange={set('role')} aria-label="Role" className="2xl:w-32">
            <option value="all">All roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admins</option>
            <option value="moderator">Moderators</option>
            <option value="member">Members</option>
          </Select>
          <Select value={filters.status} onValueChange={set('status')} aria-label="Status" className="2xl:w-36">
            <option value="all">Any status</option>
            <option value="active">Not banned</option>
            <option value="banned">Banned</option>
            <option value="verified">Verified</option>
            <option value="early">Early access</option>
          </Select>
          <Select value={filters.joined} onValueChange={set('joined')} aria-label="Joined" className="2xl:w-36">
            <option value="all">Joined any time</option>
            <option value="1">Joined today</option>
            <option value="7">Joined this week</option>
            <option value="30">Joined this month</option>
          </Select>
          <Select value={filters.active} onValueChange={set('active')} aria-label="Active" className="2xl:w-36">
            <option value="all">Any activity</option>
            <option value="1">Active today</option>
            <option value="7">Active this week</option>
            <option value="30">Active this month</option>
          </Select>
          <Select value={filters.sort} onValueChange={set('sort')} aria-label="Sort" className="2xl:w-36">
            <option value="joined">Newest first</option>
            <option value="seen">Last seen</option>
            <option value="name">Username A–Z</option>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-xs text-text-secondary">
        <span className="tabular-nums">{data ? `${formatNumber(data.total)} ${data.total === 1 ? 'user' : 'users'}` : ' '}</span>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setFilters(INITIAL)
              setQ('')
            }}
            className="cursor-pointer text-accent-brand hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !data && loading ? (
        <LoadingBlock rows={8} />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_110px_minmax(0,1fr)_110px_110px] gap-3 border-b border-border px-4 py-2 text-[11px] font-semibold tracking-wider text-text-muted uppercase md:grid">
            <span>User</span>
            <span>Role</span>
            <span>Status</span>
            <span>Joined</span>
            <span>Last seen</span>
          </div>
          {data?.users.length === 0 && <p className="px-4 py-10 text-center text-sm text-text-secondary">No users match these filters.</p>}
          <ul className={cn('divide-y divide-border', loading && 'opacity-60')}>
            {data?.users.map((u) => (
              <li key={u.username}>
                <button
                  type="button"
                  onClick={() => onOpenUser(u.username)}
                  className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bg-surface-2 md:grid-cols-[minmax(0,2.2fr)_110px_minmax(0,1fr)_110px_110px]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar seed={u.username} avatar={u.avatar} src={u.avatar_url} name={u.display_name || u.username} size="sm" online={u.status === 'online'} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 truncate text-sm font-medium text-text-primary">
                        <span className="truncate">{u.display_name || u.username}</span>
                        <UserBadges username={u.username} role={u.role} verified={u.verified} />
                      </span>
                      <span className="block truncate text-xs text-text-secondary">
                        @{u.username}
                        {u.email ? ` · ${u.email}` : ''}
                      </span>
                    </span>
                  </span>
                  <span>
                    <RolePill role={u.role} />
                  </span>
                  <span className="hidden min-w-0 flex-wrap gap-1 md:flex">
                    {u.ban ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-state-error/25 bg-state-error/10 px-2 py-0.5 text-[11px] font-medium text-state-error">
                        <Icon name="lock" className="size-3" />
                        {u.ban.until ? `Suspended · ${ago(u.ban.until)}` : 'Banned'}
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">Active</span>
                    )}
                    {u.earlyAccess && u.role !== 'owner' && u.role !== 'admin' && (
                      <span className="rounded-full border border-accent-brand/25 bg-accent-brand/10 px-2 py-0.5 text-[11px] font-medium text-accent-brand">Early access</span>
                    )}
                  </span>
                  <span className="hidden text-xs text-text-secondary md:block">{ago(u.created_at)}</span>
                  <span className="hidden text-xs text-text-secondary md:block">{u.status === 'online' ? <span className="text-state-success">Online</span> : ago(u.last_seen)}</span>
                </button>
              </li>
            ))}
          </ul>
          {data && data.users.length < data.total && (
            <div className="border-t border-border p-3 text-center">
              <Button variant="secondary" size="sm" loading={loading} onClick={() => setLimit((l) => Math.min(l + PAGE, 200))} disabled={limit >= 200}>
                {limit >= 200 ? 'Refine the search to see more' : 'Show more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
