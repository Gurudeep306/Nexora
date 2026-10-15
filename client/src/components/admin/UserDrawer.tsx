import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Button, ErrorState, Input, LoadingBlock, Modal, Select, Textarea, useToast } from '@/components/ui'
import { UserBadges } from '@/components/shared/UserBadges'
import { Icon } from '@/components/icon/Icon'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { refreshBadges } from '@/lib/badges'
import { cn, formatNumber } from '@/lib/utils'
import { Drawer, RolePill, Toggle } from './kit'
import { ago, when } from './format'
import type { AdminMe, UserDetail } from './types'

const RANK: Record<string, number> = { member: 0, teacher: 0, moderator: 1, admin: 2, owner: 3 }

function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="border-t border-border py-4 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  )
}

export function UserDrawer({
  username,
  me,
  onClose,
  onChanged,
}: {
  username: string | null
  me: AdminMe
  onClose: () => void
  onChanged: () => void
}) {
  return (
    <Drawer open={!!username} onClose={onClose} title={username ? `@${username}` : ''}>
      {username && <UserDetailBody key={username} username={username} me={me} onChanged={onChanged} onDeleted={onClose} />}
    </Drawer>
  )
}

function UserDetailBody({ username, me, onChanged, onDeleted }: { username: string; me: AdminMe; onChanged: () => void; onDeleted: () => void }) {
  const toast = useToast()
  const { data: d, loading, error, refetch } = useApi(() => api.get<UserDetail>(`/api/admin/users/${encodeURIComponent(username)}`), [username])
  const [busy, setBusy] = useState<string | null>(null)
  const [banKind, setBanKind] = useState<'suspend' | 'ban'>('suspend')
  const [banHours, setBanHours] = useState('24')
  const [banReason, setBanReason] = useState('')
  const [warnReason, setWarnReason] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [now] = useState(() => Date.now())

  const can = (p: string) => me.isOwner || me.permissions.includes(p)

  async function act(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key)
    try {
      await fn()
      toast.success(done)
      refetch()
      onChanged()
    } catch (e) {
      toast.error('Could not do that', e instanceof ApiError ? e.message : undefined)
    } finally {
      setBusy(null)
    }
  }

  if (loading && !d) return <LoadingBlock rows={8} />
  if (error || !d) return <ErrorState message={error ?? 'Could not load this user'} onRetry={refetch} />

  const u = d.user
  const base = `/api/admin/users/${encodeURIComponent(u.username)}`
  const isSelfOwner = me.isOwner && u.role === 'owner'
  const canAct = d.canAct
  const activeBan = d.bans.find((b) => b.active)
  const assignable = me.roles.filter((r) => me.isOwner || RANK[r] < RANK[me.role])
  const grantable = (perm: string) => me.isOwner || (!me.ownerGrantOnly.includes(perm) && me.permissions.includes(perm))
  const groups = [...new Set(me.catalog.map((p) => p.group))]
  const activeDays = new Set(d.activeDays)
  const days = Array.from({ length: 30 }, (_, i) => new Date(now - (29 - i) * 86400000).toISOString().slice(0, 10))

  return (
    <div>
      {/* ── header ── */}
      <div className="flex items-start gap-4">
        <Avatar seed={u.username} avatar={u.avatar} src={u.avatar_url} name={u.display_name || u.username} size="xl" online={!!d.online} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-display text-lg font-semibold text-text-primary">{u.display_name || u.username}</h2>
            <UserBadges username={u.username} role={u.role} verified={u.verified} variant="full" />
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">
            @{u.username}
            {u.email ? ` · ${u.email}` : ''} · via {u.auth_provider || 'password'}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Joined {when(u.created_at)} · {d.online ? <span className="text-state-success">online now</span> : `last seen ${ago(u.last_seen)}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <RolePill role={u.role} />
            {activeBan && (
              <span className="inline-flex items-center gap-1 rounded-full border border-state-error/25 bg-state-error/10 px-2 py-0.5 text-[11px] font-medium text-state-error">
                <Icon name="lock" className="size-3" />
                {activeBan.expires_at ? `Suspended until ${when(activeBan.expires_at)}` : 'Banned'}
              </span>
            )}
            <Link to={`/profile/${encodeURIComponent(u.username)}`} className="text-xs text-accent-brand hover:underline">
              View profile →
            </Link>
          </div>
        </div>
      </div>
      {u.bio && <p className="mt-3 rounded-lg bg-bg-surface-2 px-3 py-2 text-sm text-text-secondary">{u.bio}</p>}
      {!canAct && !isSelfOwner && (
        <p className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-bg-surface-2 px-3 py-2 text-xs text-text-secondary">
          <Icon name="lock" className="size-3.5" />
          {u.role === 'owner' ? 'Nobody can act on the owner.' : 'You can only act on users below your own role.'}
        </p>
      )}

      {/* ── stats ── */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {(
          [
            ['Solved', d.stats.solved],
            ['XP', d.stats.xp],
            ['Submits', d.stats.submissions],
            ['GATE', d.stats.gate_attempts],
            ['AI tokens', d.stats.ai_tokens],
            ['Friends', d.stats.friends],
            ['Reports', d.stats.reports_against],
            ['Sessions', d.sessions.length],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className="rounded-lg border border-border bg-bg-surface-2 px-2.5 py-2">
            <p className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">{label}</p>
            <p className="mt-0.5 text-sm font-semibold text-text-primary tabular-nums">{formatNumber(Number(v) || 0)}</p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-[11px] text-text-muted">Active days · last 30</p>
        <div className="flex gap-[3px]" role="img" aria-label={`Active ${d.activeDays.length} of the last 30 days`}>
          {days.map((day) => (
            <span key={day} title={day} className={cn('h-4 flex-1 rounded-[3px]', activeDays.has(day) ? 'bg-accent-brand' : 'bg-bg-surface-3')} />
          ))}
        </div>
      </div>

      <div className="mt-5">
        {/* ── role ── */}
        {can('users.manage') && (
          <Section title="Role">
            <div className="flex items-center gap-2">
              <Select
                value={u.role === 'owner' ? 'owner' : u.role}
                disabled={!canAct || busy === 'role'}
                onValueChange={(role) => act('role', () => api.post(`${base}/role`, { role }), `Role changed to ${role}`).then(refreshBadges)}
                aria-label="Role"
                className="w-48"
              >
                {u.role === 'owner' && <option value="owner">Owner</option>}
                {[...new Set([...assignable, u.role === 'owner' ? null : u.role].filter(Boolean) as string[])].map((r) => (
                  <option key={r} value={r} disabled={!assignable.includes(r as never)}>
                    {r[0].toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-text-muted">{me.isOwner ? 'Only you can make admins.' : 'You can assign roles below your own.'}</p>
            </div>
          </Section>
        )}

        {/* ── permissions ── */}
        {can('users.manage') && (
          <Section title="Permissions" actions={<span className="text-[11px] text-text-muted">Role defaults · overrides marked</span>}>
            <div className="space-y-3">
              {groups.map((g) => (
                <div key={g}>
                  <p className="mb-1 text-xs font-medium text-text-secondary">{g}</p>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {me.catalog
                      .filter((p) => p.group === g)
                      .map((p) => {
                        const on = u.role === 'owner' || d.permissions.includes(p.key)
                        const override = d.overrides[p.key]
                        const disabled = !canAct || !grantable(p.key) || busy === `perm:${p.key}` || u.role === 'owner'
                        return (
                          <label
                            key={p.key}
                            title={p.description}
                            className={cn(
                              'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px] transition-colors',
                              on ? 'border-accent-brand/25 bg-accent-brand/[0.06]' : 'border-border',
                              disabled ? 'opacity-60' : 'cursor-pointer hover:border-border-strong',
                            )}
                          >
                            <input
                              type="checkbox"
                              className="size-3.5 accent-[var(--color-accent-brand)]"
                              checked={on}
                              disabled={disabled}
                              onChange={(e) =>
                                act(`perm:${p.key}`, () => api.put(`${base}/permissions`, { grants: { [p.key]: e.target.checked } }), `${p.label} ${e.target.checked ? 'granted' : 'revoked'}`)
                              }
                            />
                            <span className="min-w-0 flex-1 truncate text-text-primary">{p.label}</span>
                            {override !== undefined && !disabled && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  void act(`perm:${p.key}`, () => api.put(`${base}/permissions`, { grants: { [p.key]: null } }), `${p.label} reset to the role default`)
                                }}
                                className={cn('cursor-pointer rounded px-1 text-[10px] font-semibold uppercase', override ? 'text-state-success' : 'text-state-error')}
                                aria-label={`Reset ${p.label} to the role default`}
                                title="Override — click to reset to the role default"
                              >
                                {override ? '+ granted' : '− revoked'}
                              </button>
                            )}
                          </label>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── quick toggles & resets ── */}
        {can('users.manage') && (
          <Section title="Account">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm text-text-primary">Verified badge</span>
                  <span className="block text-xs text-text-muted">A blue tick next to their name everywhere.</span>
                </span>
                <Toggle
                  label="Verified badge"
                  checked={!!u.verified}
                  disabled={!(canAct || isSelfOwner) || busy === 'verify'}
                  onChange={(v) => act('verify', () => api.post(`${base}/verify`, { verified: v }), v ? 'Verified' : 'Verification removed').then(refreshBadges)}
                />
              </div>
              {u.role !== 'owner' && u.role !== 'admin' && (
                <div className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block text-sm text-text-primary">Early access</span>
                    <span className="block text-xs text-text-muted">May use the site while it is private.</span>
                  </span>
                  <Toggle
                    label="Early access"
                    checked={d.permissions.includes('early_access')}
                    disabled={!canAct || !grantable('early_access') || busy === 'early'}
                    onChange={(v) => act('early', () => api.post(`${base}/early-access`, { enabled: v }), v ? 'Early access granted' : 'Early access removed')}
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="secondary" disabled={!(canAct || isSelfOwner)} loading={busy === 'avatar'} onClick={() => act('avatar', () => api.post(`${base}/reset`, { fields: ['avatar'] }), 'Avatar reset')}>
                  <Icon name="image" /> Reset avatar
                </Button>
                <Button size="sm" variant="secondary" disabled={!(canAct || isSelfOwner)} loading={busy === 'bio'} onClick={() => act('bio', () => api.post(`${base}/reset`, { fields: ['bio'] }), 'Bio cleared')}>
                  <Icon name="type" /> Clear bio
                </Button>
                <Button size="sm" variant="secondary" disabled={!canAct} loading={busy === 'signout'} onClick={() => act('signout', () => api.post(`${base}/signout`, {}), 'Signed out everywhere')}>
                  <Icon name="logout" /> Force sign-out
                </Button>
              </div>
            </div>
          </Section>
        )}

        {/* ── ban / suspend ── */}
        {can('users.ban') && (
          <Section title={activeBan ? 'Ban' : 'Ban or suspend'}>
            {activeBan ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-state-error/25 bg-state-error/[0.06] px-3 py-2.5">
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-text-primary">{activeBan.expires_at ? `Suspended until ${when(activeBan.expires_at)}` : 'Banned'}</p>
                  <p className="text-xs text-text-secondary">
                    “{activeBan.reason}” — by @{activeBan.created_by}, {ago(activeBan.created_at)}
                  </p>
                </div>
                <Button size="sm" variant="secondary" disabled={!canAct} loading={busy === 'unban'} onClick={() => act('unban', () => api.post(`${base}/unban`, {}), 'Ban lifted')}>
                  Lift
                </Button>
              </div>
            ) : (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  void act(
                    'ban',
                    () => api.post(`${base}/ban`, { kind: banKind, reason: banReason, hours: banKind === 'suspend' ? Number(banHours) : undefined }),
                    banKind === 'ban' ? 'User banned' : 'User suspended',
                  ).then(() => setBanReason(''))
                }}
              >
                <div className="flex gap-2">
                  <Select value={banKind} onValueChange={(v) => setBanKind(v as 'ban' | 'suspend')} aria-label="Kind" className="w-36" disabled={!canAct}>
                    <option value="suspend">Suspend</option>
                    <option value="ban">Ban</option>
                  </Select>
                  {banKind === 'suspend' && (
                    <Select value={banHours} onValueChange={setBanHours} aria-label="Duration" className="w-36" disabled={!canAct}>
                      <option value="1">1 hour</option>
                      <option value="24">1 day</option>
                      <option value="72">3 days</option>
                      <option value="168">1 week</option>
                      <option value="720">30 days</option>
                    </Select>
                  )}
                </div>
                <Textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Reason (shown to the user)"
                  className="min-h-[64px]"
                  maxLength={500}
                  disabled={!canAct}
                />
                <Button type="submit" size="sm" variant="danger" disabled={!canAct || banReason.trim().length < 3} loading={busy === 'ban'}>
                  {banKind === 'ban' ? 'Ban user' : 'Suspend user'}
                </Button>
              </form>
            )}
          </Section>
        )}

        {/* ── warn ── */}
        {can('content.moderate') && (
          <Section title="Warn">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void act('warn', () => api.post(`${base}/warn`, { reason: warnReason }), 'Warning sent').then(() => setWarnReason(''))
              }}
            >
              <Input value={warnReason} onChange={(e) => setWarnReason(e.target.value)} placeholder="What should they change?" maxLength={500} disabled={!canAct} />
              <Button type="submit" size="md" variant="secondary" disabled={!canAct || warnReason.trim().length < 3} loading={busy === 'warn'}>
                Send
              </Button>
            </form>
            {d.warnings.length > 0 && (
              <ul className="mt-2 space-y-1">
                {d.warnings.map((w) => (
                  <li key={w.id} className="flex items-center gap-2 text-xs text-text-secondary">
                    <Icon name={w.acknowledged_at ? 'check' : 'clock'} className="size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{w.reason}</span>
                    <span className="shrink-0 text-text-muted">{ago(w.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {/* ── activity ── */}
        <Section title="Recent submissions">
          {d.submissions.length === 0 ? (
            <p className="text-xs text-text-muted">No submissions yet.</p>
          ) : (
            <ul className="space-y-1">
              {d.submissions.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-xs">
                  <span className={cn('w-10 shrink-0 font-mono font-semibold', s.verdict === 'AC' ? 'text-state-success' : 'text-state-error')}>{s.verdict}</span>
                  <span className="min-w-0 flex-1 truncate text-text-primary">{s.title ?? `#${s.id}`}</span>
                  <span className="shrink-0 text-text-muted">{s.language}</span>
                  <span className="w-20 shrink-0 text-right text-text-muted">{ago(s.submitted_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Sessions">
          {d.sessions.length === 0 ? (
            <p className="text-xs text-text-muted">Not signed in anywhere.</p>
          ) : (
            <ul className="space-y-1">
              {d.sessions.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-xs text-text-secondary">
                  <Icon name="monitor" className="size-3.5" />
                  <span className="font-mono">{s.id}</span>
                  <span className="ml-auto text-text-muted">expires {ago(s.expires)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {(d.bans.length > 0 || d.history.length > 0) && (
          <Section title="History">
            <ul className="space-y-1.5">
              {d.history.map((h) => (
                <li key={`a${h.id}`} className="flex items-center gap-2 text-xs">
                  <span className="rounded bg-bg-surface-3 px-1.5 py-0.5 font-mono text-[11px] text-text-primary">{h.action}</span>
                  <span className="text-text-secondary">by @{h.actor}</span>
                  <span className="ml-auto shrink-0 text-text-muted">{ago(h.created_at)}</span>
                </li>
              ))}
              {d.history.length === 0 &&
                d.bans.map((b) => (
                  <li key={`b${b.id}`} className="flex items-center gap-2 text-xs">
                    <span className="rounded bg-bg-surface-3 px-1.5 py-0.5 font-mono text-[11px] text-text-primary">user.{b.kind}</span>
                    <span className="min-w-0 truncate text-text-secondary">{b.reason}</span>
                    <span className="ml-auto shrink-0 text-text-muted">{ago(b.created_at)}</span>
                  </li>
                ))}
            </ul>
          </Section>
        )}

        {/* ── danger ── */}
        {me.isOwner && u.role !== 'owner' && (
          <Section title="Danger zone">
            <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
              <Icon name="delete" /> Delete account
            </Button>
          </Section>
        )}
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setConfirmName('')
        }}
        title="Delete this account?"
        description="This permanently removes the user, their sessions, friends, bookmarks and AI chats. It can't be undone."
        size="sm"
      >
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy('delete')
            try {
              await api.delete(base, { body: { confirm: confirmName } })
              toast.success(`@${u.username} deleted`)
              onChanged()
              onDeleted()
            } catch (err) {
              toast.error('Could not delete', err instanceof ApiError ? err.message : undefined)
            } finally {
              setBusy(null)
            }
          }}
        >
          <p className="text-sm text-text-secondary">
            Type <span className="font-mono font-semibold text-text-primary">{u.username}</span> to confirm.
          </p>
          <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoFocus aria-label="Username to confirm" />
          <Button type="submit" variant="danger" className="w-full" disabled={confirmName !== u.username} loading={busy === 'delete'}>
            Delete @{u.username}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
