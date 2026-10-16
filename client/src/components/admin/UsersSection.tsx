import { useEffect, useState } from 'react'
import { Avatar, Select } from '@/components/ui'
import { UserBadges } from '@/components/shared/UserBadges'
import { Icon } from '@/components/icon/Icon'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { cn, formatNumber } from '@/lib/utils'
import { Chip, Empty, Failed, Pager, RolePill, Skeleton } from './kit'
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
const PAGE = 25

function StatusCell({ u }: { u: AdminUserRow }) {
  return (
    <span className="flex flex-wrap gap-1">
      {u.ban ? (
        <Chip tone="danger" icon="lock">
          {u.ban.until ? `Suspended · ${ago(u.ban.until).replace('in ', '')}` : 'Banned'}
        </Chip>
      ) : u.status === 'online' ? (
        <Chip tone="success">
          <span className="size-1.5 rounded-full bg-state-success" /> Online
        </Chip>
      ) : (
        <span className="text-xs text-text-muted">Active</span>
      )}
      {u.earlyAccess && u.role !== 'owner' && u.role !== 'admin' && <Chip tone="violet">Early access</Chip>}
    </span>
  )
}

export function UsersSection({ onOpenUser, revision }: { onOpenUser: (username: string) => void; revision: number }) {
  const [filters, setFilters] = useState<Filters>(INITIAL)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const set = (k: keyof Filters) => (v: string) => {
    setFilters((f) => ({ ...f, [k]: v }))
    setPage(0)
  }

  // Debounced search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === q.trim() ? f : { ...f, q: q.trim() }))
      setPage(0)
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
    limit: PAGE,
    offset: page * PAGE,
  }
  const { data, loading, error, refetch } = useApi(
    () => api.get<{ users: AdminUserRow[]; total: number }>('/api/admin/users', { query }),
    [JSON.stringify(query), revision],
  )
  const filtered = JSON.stringify({ ...filters, q }) !== JSON.stringify({ ...INITIAL, q: '' })
  const reset = () => {
    setFilters(INITIAL)
    setQ('')
    setPage(0)
  }

  return (
    <div className="space-y-3">
      {/* ── filters ── */}
      <div className="nx-panel flex flex-col gap-2 p-2.5 xl:flex-row xl:items-center">
        <label className="relative block xl:flex-1">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" />
          <input className="nx-input !pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by username, name or email" aria-label="Search users" autoFocus />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:flex">
          <Select value={filters.role} onValueChange={set('role')} aria-label="Role" className="!h-[2.375rem] xl:w-32">
            <option value="all">All roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admins</option>
            <option value="moderator">Moderators</option>
            <option value="member">Members</option>
          </Select>
          <Select value={filters.status} onValueChange={set('status')} aria-label="Status" className="!h-[2.375rem] xl:w-36">
            <option value="all">Any status</option>
            <option value="active">Not banned</option>
            <option value="banned">Banned</option>
            <option value="verified">Verified</option>
            <option value="early">Early access</option>
          </Select>
          <Select value={filters.joined} onValueChange={set('joined')} aria-label="Joined" className="!h-[2.375rem] xl:w-36">
            <option value="all">Joined any time</option>
            <option value="1">Joined today</option>
            <option value="7">Joined this week</option>
            <option value="30">Joined this month</option>
          </Select>
          <Select value={filters.active} onValueChange={set('active')} aria-label="Active" className="!h-[2.375rem] xl:w-36">
            <option value="all">Any activity</option>
            <option value="1">Active today</option>
            <option value="7">Active this week</option>
            <option value="30">Active this month</option>
          </Select>
          <Select value={filters.sort} onValueChange={set('sort')} aria-label="Sort" className="col-span-2 !h-[2.375rem] sm:col-span-1 xl:w-36">
            <option value="joined">Newest first</option>
            <option value="seen">Last seen</option>
            <option value="name">Username A–Z</option>
          </Select>
        </div>
      </div>

      <div className="flex h-5 items-center justify-between px-1 text-xs text-text-muted">
        <span className="nx-num">{data ? `${formatNumber(data.total)} ${data.total === 1 ? 'user' : 'users'}` : ''}</span>
        {filtered && (
          <button type="button" onClick={reset} className="cursor-pointer font-medium text-[var(--nx-b1)] hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {error ? (
        <div className="nx-panel">
          <Failed message={error} onRetry={refetch} />
        </div>
      ) : (
        <div className="nx-panel">
          <table className="w-full table-fixed border-separate border-spacing-0 text-left">
            <colgroup>
              <col />
              <col className="w-[116px]" />
              <col className="hidden w-[190px] md:table-column" />
              <col className="hidden w-[104px] lg:table-column" />
              <col className="hidden w-[104px] lg:table-column" />
            </colgroup>
            <thead>
              <tr className="text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase">
                {['User', 'Role', 'Status', 'Joined', 'Last seen'].map((h, i) => (
                  <th
                    key={h}
                    className={cn(
                      'sticky top-14 z-10 border-b border-[color:var(--nx-hair)] bg-bg-surface/90 px-4 py-2.5 font-semibold backdrop-blur-md first:rounded-tl-2xl last:rounded-tr-2xl',
                      i === 2 && 'hidden md:table-cell',
                      i >= 3 && 'hidden lg:table-cell',
                      i === 1 && 'rounded-tr-2xl md:rounded-tr-none',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={cn(loading && data && 'opacity-60 transition-opacity')}>
              {!data &&
                Array.from({ length: 8 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-8 !rounded-full" />
                        <Skeleton className="h-3.5 w-40" />
                      </div>
                    </td>
                  </tr>
                ))}
              {data?.users.map((u) => (
                <tr
                  key={u.username}
                  tabIndex={0}
                  onClick={() => onOpenUser(u.username)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpenUser(u.username))}
                  className="group cursor-pointer outline-none [&>td]:border-b [&>td]:border-[color:var(--nx-hair)] last:[&>td]:border-b-0 hover:bg-[color-mix(in_oklab,var(--color-text-primary)_3%,transparent)] focus-visible:bg-[color-mix(in_oklab,var(--nx-b1)_8%,transparent)]"
                >
                  <td className="px-4 py-2.5">
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar seed={u.username} avatar={u.avatar} src={u.avatar_url} name={u.display_name || u.username} size="sm" online={u.status === 'online'} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-text-primary">
                          <span className="truncate">{u.display_name || u.username}</span>
                          <UserBadges username={u.username} role={u.role} verified={u.verified} size={14} />
                        </span>
                        <span className="block truncate text-xs text-text-muted">
                          @{u.username}
                          {u.email ? ` · ${u.email}` : ''}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <RolePill role={u.role} />
                  </td>
                  <td className="hidden px-4 py-2.5 md:table-cell">
                    <StatusCell u={u} />
                  </td>
                  <td className="nx-num hidden px-4 py-2.5 text-xs text-text-secondary lg:table-cell">{ago(u.created_at)}</td>
                  <td className="nx-num hidden px-4 py-2.5 text-xs text-text-secondary lg:table-cell">{u.status === 'online' ? 'now' : ago(u.last_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.users.length === 0 && (
            <Empty icon="search" title="No users match" action={filtered ? <button type="button" className="nx-btn" data-size="sm" onClick={reset}>Clear filters</button> : undefined}>
              Try a different name or loosen the filters.
            </Empty>
          )}
          {data && <Pager page={page} pageSize={PAGE} total={data.total} onPage={setPage} />}
        </div>
      )}
    </div>
  )
}
