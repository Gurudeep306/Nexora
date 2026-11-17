import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Select, useToast } from '@/components/ui'
import { UserBadges } from '@/components/shared/UserBadges'
import { Icon, type IconName } from '@/components/icon/Icon'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { refreshBadges } from '@/lib/badges'
import { cn, formatNumber } from '@/lib/utils'
import { Chip, Confirm, Drawer, Failed, RolePill, Skeleton, Toggle } from './kit'
import { ago, when } from './format'
import type { AdminMe, UserDetail } from './types'

const RANK: Record<string, number> = { member: 0, teacher: 0, moderator: 1, admin: 2, owner: 3 }
type Tab = 'overview' | 'access' | 'moderation' | 'activity'

function Section({ title, hint, children, actions }: { title: string; hint?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="py-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold text-text-primary">{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

function Row({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-text-primary">{title}</span>
        <span className="block text-xs text-text-muted">{hint}</span>
      </span>
      {children}
    </div>
  )
}

export function UserDrawer({ username, me, onClose, onChanged }: { username: string | null; me: AdminMe; onClose: () => void; onChanged: () => void }) {
  return (
    <Drawer open={!!username} onClose={onClose} title={username ? `@${username}` : 'User'}>
      {username && <UserDetailBody key={username} username={username} me={me} onChanged={onChanged} onDeleted={onClose} />}
    </Drawer>
  )
}

type Pending = { title: string; body: ReactNode; label: string; danger?: boolean; typeToConfirm?: string; run: () => Promise<unknown> }

function UserDetailBody({ username, me, onChanged, onDeleted }: { username: string; me: AdminMe; onChanged: () => void; onDeleted: () => void }) {
  const toast = useToast()
  const { data: d, loading, error, refetch } = useApi(() => api.get<UserDetail>(`/api/admin/users/${encodeURIComponent(username)}`), [username])
  const [tab, setTab] = useState<Tab>('overview')
  const [busy, setBusy] = useState<string | null>(null)
  const [banKind, setBanKind] = useState<'suspend' | 'ban'>('suspend')
  const [banHours, setBanHours] = useState('24')
  const [banReason, setBanReason] = useState('')
  const [warnReason, setWarnReason] = useState('')
  const [pending, setPending] = useState<Pending | null>(null)
  const [now] = useState(() => Date.now())

  const can = (p: string) => me.isOwner || me.permissions.includes(p)

  async function act(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key)
    try {
      await fn()
      toast.success(done)
      refetch()
      onChanged()
      return true
    } catch (e) {
      toast.error('Could not do that', e instanceof ApiError ? e.message : undefined)
      return false
    } finally {
      setBusy(null)
    }
  }

  if (loading && !d) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 !rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        </div>
        <Skeleton className="h-20" />
        <Skeleton className="h-40" />
      </div>
    )
  }
  if (error || !d) return <Failed message={error ?? 'Could not load this user'} onRetry={refetch} />

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

  const tabs: { id: Tab; label: string; icon: IconName; show: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: 'user', show: true },
    { id: 'access', label: 'Access', icon: 'key', show: can('users.manage') || can('users.verify') },
    { id: 'moderation', label: 'Moderation', icon: 'shield', show: can('users.ban') || can('content.moderate') },
    { id: 'activity', label: 'Activity', icon: 'activity', show: true },
  ]

  return (
    <div>
      {/* ── hero ── */}
      <div className="relative isolate overflow-hidden border-b border-[color:var(--nx-hair)] px-6 pt-8 pb-5">
        <div className="nx-atmos" aria-hidden="true" />
        <div className="relative z-10 flex items-start gap-4">
          <div className={cn('rounded-full p-[2px]', u.role === 'owner' ? 'bg-[linear-gradient(160deg,#ffd66b,#e09a1a)]' : 'bg-[linear-gradient(140deg,var(--nx-b1),var(--nx-b2),var(--nx-b3))]')}>
            <div className="rounded-full bg-bg-surface p-[2px]">
              <Avatar seed={u.username} avatar={u.avatar} src={u.avatar_url} name={u.display_name || u.username} size="2xl" online={!!d.online} />
            </div>
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="nx-display truncate text-[24px] leading-tight font-semibold text-text-primary">{u.display_name || u.username}</h2>
              <UserBadges username={u.username} role={u.role} verified={u.verified} size={18} />
            </div>
            <p className="mt-1 truncate text-[13px] text-text-secondary">
              @{u.username}
              {u.email ? ` · ${u.email}` : ''}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <RolePill role={u.role} />
              {activeBan ? (
                <Chip tone="danger" icon="lock">
                  {activeBan.expires_at ? `Suspended until ${when(activeBan.expires_at)}` : 'Banned'}
                </Chip>
              ) : d.online ? (
                <Chip tone="success">
                  <span className="size-1.5 rounded-full bg-state-success" /> Online now
                </Chip>
              ) : (
                <Chip>Seen {ago(u.last_seen)}</Chip>
              )}
              <Chip>via {u.auth_provider || 'password'}</Chip>
            </div>
          </div>
        </div>
        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
          <Link to={`/profile/${encodeURIComponent(u.username)}`} className="nx-btn" data-size="sm">
            <Icon name="profile" /> Profile
          </Link>
          {can('users.manage') && (
            <button
              type="button"
              className="nx-btn"
              data-size="sm"
              disabled={!canAct}
              onClick={() =>
                setPending({
                  title: `Sign @${u.username} out everywhere?`,
                  body: `Ends all ${d.sessions.length} active ${d.sessions.length === 1 ? 'session' : 'sessions'} and closes their realtime connection. They can sign in again.`,
                  label: 'Sign out everywhere',
                  run: () => act('signout', () => api.post(`${base}/signout`, {}), 'Signed out everywhere'),
                })
              }
            >
              <Icon name="logout" /> Sign out
            </button>
          )}
          {can('users.ban') && !activeBan && (
            <button type="button" className="nx-btn" data-size="sm" data-tone="danger" disabled={!canAct} onClick={() => setTab('moderation')}>
              <Icon name="lock" /> Ban or suspend
            </button>
          )}
        </div>
        {!canAct && !isSelfOwner && (
          <p className="relative z-10 mt-3 flex items-center gap-2 text-xs text-text-muted">
            <Icon name="lock" className="size-3.5" />
            {u.role === 'owner' ? 'Nobody can act on the owner.' : 'You can only act on users below your own role.'}
          </p>
        )}
      </div>

      {/* ── tabs ── */}
      <div role="tablist" className="sticky top-0 z-10 flex gap-1 border-b border-[color:var(--nx-hair)] bg-bg-surface/90 px-4 backdrop-blur-md">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'relative flex h-11 cursor-pointer items-center gap-1.5 px-2.5 text-[13px] font-medium transition-colors',
                tab === t.id ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary',
              )}
            >
              <Icon name={t.icon} className="size-3.5" />
              {t.label}
              {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[linear-gradient(90deg,var(--nx-b1),var(--nx-b2),var(--nx-b3))]" />}
            </button>
          ))}
      </div>

      <div className="divide-y divide-[color:var(--nx-hair)] px-6 pb-8">
        {tab === 'overview' && (
          <>
            <Section title="At a glance">
              <div className="grid grid-cols-4 gap-px overflow-hidden rounded-xl bg-[color:var(--nx-hair)] shadow-[inset_0_0_0_1px_var(--nx-hair)]">
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
                  <div key={label} className="bg-bg-surface px-3 py-2.5">
                    <p className="text-[10.5px] font-medium tracking-wider text-text-muted uppercase">{label}</p>
                    <p className="nx-num mt-0.5 text-[15px] font-semibold text-text-primary">{formatNumber(Number(v) || 0)}</p>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="Active days" hint={`${d.activeDays.length} of the last 30 days`}>
              <div className="flex gap-[3px]" role="img" aria-label={`Active ${d.activeDays.length} of the last 30 days`}>
                {days.map((day) => (
                  <span
                    key={day}
                    title={day}
                    className={cn('h-6 flex-1 rounded-[4px]', activeDays.has(day) ? 'bg-text-primary' : 'bg-[color-mix(in_oklab,var(--color-text-primary)_7%,transparent)]')}
                  />
                ))}
              </div>
            </Section>
            {u.bio && (
              <Section title="Bio">
                <p className="text-[13.5px] leading-relaxed text-text-secondary">{u.bio}</p>
              </Section>
            )}
            <Section title="Joined">
              <p className="text-[13.5px] text-text-secondary">{when(u.created_at)}</p>
            </Section>
          </>
        )}

        {tab === 'access' && (can('users.manage') || can('users.verify')) && (
          <>
            <Section title="Role" hint={me.isOwner ? 'Only you can make admins.' : 'You can assign roles below your own.'}>
              <Select
                value={u.role}
                disabled={!canAct || busy === 'role'}
                onValueChange={(role) =>
                  setPending({
                    title: `Make @${u.username} ${role === 'admin' ? 'an admin' : role === 'moderator' ? 'a moderator' : 'a member'}?`,
                    body:
                      role === 'admin'
                        ? 'Admins get every permission except the owner-only ones (site settings, AI models, code runners, staff access), and can manage moderators and members.'
                        : role === 'moderator'
                          ? 'Moderators can look up users, ban members and work the reports queue.'
                          : 'They lose the defaults of their current role (individual grants stay).',
                    label: 'Change role',
                    run: () => act('role', () => api.post(`${base}/role`, { role }), `Role changed to ${role}`).then(refreshBadges),
                  })
                }
                aria-label="Role"
                className="w-full sm:w-60"
              >
                {u.role === 'owner' && <option value="owner">Owner</option>}
                {[...new Set([...assignable, u.role === 'owner' ? null : u.role].filter(Boolean) as string[])].map((r) => (
                  <option key={r} value={r} disabled={!assignable.includes(r as never)}>
                    {r[0].toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </Select>
            </Section>

            {can('users.manage') && (
            <Section title="Permissions" hint="Role defaults, plus individual grants and revocations.">
              <div className="space-y-4">
                {groups.map((g) => (
                  <div key={g}>
                    <p className="mb-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-text-muted uppercase">{g}</p>
                    <div className="overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_var(--nx-hair)]">
                      {me.catalog
                        .filter((p) => p.group === g)
                        .map((p, i) => {
                          const on = u.role === 'owner' || d.permissions.includes(p.key)
                          const override = d.overrides[p.key]
                          const disabled = !canAct || !grantable(p.key) || busy === `perm:${p.key}` || u.role === 'owner'
                          return (
                            <div key={p.key} className={cn('flex items-center gap-3 px-3.5 py-2.5', i > 0 && 'border-t border-[color:var(--nx-hair)]', disabled && 'opacity-60')}>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
                                  {p.label}
                                  {override !== undefined && <Chip tone={override ? 'success' : 'danger'} className="!h-4.5 !text-[10px]">{override ? 'granted' : 'revoked'}</Chip>}
                                  {me.ownerGrantOnly.includes(p.key) && <Icon name="crown" className="size-3 text-[var(--nx-gold)]" />}
                                </span>
                                <span className="mt-0.5 block text-[11.5px] leading-snug text-text-muted">{p.description}</span>
                              </span>
                              {override !== undefined && !disabled && (
                                <button
                                  type="button"
                                  onClick={() => act(`perm:${p.key}`, () => api.put(`${base}/permissions`, { grants: { [p.key]: null } }), `${p.label} reset to the role default`)}
                                  className="cursor-pointer text-[11px] font-medium text-text-muted hover:text-text-primary"
                                >
                                  Reset
                                </button>
                              )}
                              <Toggle
                                size="sm"
                                label={p.label}
                                checked={on}
                                disabled={disabled}
                                onChange={(v) => act(`perm:${p.key}`, () => api.put(`${base}/permissions`, { grants: { [p.key]: v } }), `${p.label} ${v ? 'granted' : 'revoked'}`)}
                              />
                            </div>
                          )
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            )}

            <Section title="Account">
              <div className="divide-y divide-[color:var(--nx-hair)]">
                {can('users.verify') && (
                <Row title="Verified badge" hint="A blue seal next to their name everywhere.">
                  <Toggle
                    label="Verified badge"
                    checked={!!u.verified}
                    disabled={!(canAct || isSelfOwner) || busy === 'verify'}
                    onChange={(v) => act('verify', () => api.post(`${base}/verify`, { verified: v }), v ? 'Verified' : 'Verification removed').then(refreshBadges)}
                  />
                </Row>
                )}
                {can('users.verify') && u.role !== 'owner' && u.role !== 'admin' && (
                  <Row title="Early access" hint="May use the site while it is private.">
                    <Toggle
                      label="Early access"
                      checked={d.permissions.includes('early_access')}
                      disabled={!canAct || !grantable('early_access') || busy === 'early'}
                      onChange={(v) => act('early', () => api.post(`${base}/early-access`, { enabled: v }), v ? 'Early access granted' : 'Early access removed')}
                    />
                  </Row>
                )}
                {can('users.manage') && (
                <Row title="Profile" hint="Reset a broken or abusive avatar or bio.">
                  <span className="flex gap-1.5">
                    <button type="button" className="nx-btn" data-size="sm" disabled={!(canAct || isSelfOwner) || busy === 'avatar'} onClick={() => act('avatar', () => api.post(`${base}/reset`, { fields: ['avatar'] }), 'Avatar reset')}>
                      Avatar
                    </button>
                    <button type="button" className="nx-btn" data-size="sm" disabled={!(canAct || isSelfOwner) || busy === 'bio'} onClick={() => act('bio', () => api.post(`${base}/reset`, { fields: ['bio'] }), 'Bio cleared')}>
                      Bio
                    </button>
                  </span>
                </Row>
                )}
              </div>
            </Section>

            {me.isOwner && u.role !== 'owner' && (
              <Section title="Danger zone">
                <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 shadow-[inset_0_0_0_1px_var(--color-state-error)]">
                  <span>
                    <span className="block text-[13.5px] font-medium text-text-primary">Delete account</span>
                    <span className="block text-xs text-text-muted">Permanent. Owner only.</span>
                  </span>
                  <button
                    type="button"
                    className="nx-btn"
                    data-tone="danger"
                    data-size="sm"
                    onClick={() =>
                      setPending({
                        title: `Delete @${u.username}?`,
                        body: 'This permanently removes the account, their sessions, friends, bookmarks and AI chats. It cannot be undone.',
                        label: 'Delete account',
                        danger: true,
                        typeToConfirm: u.username,
                        run: async () => {
                          const ok = await act('delete', () => api.delete(base, { body: { confirm: u.username } }), `@${u.username} deleted`)
                          if (ok) onDeleted()
                        },
                      })
                    }
                  >
                    <Icon name="delete" /> Delete
                  </button>
                </div>
              </Section>
            )}
          </>
        )}

        {tab === 'moderation' && (
          <>
            {can('users.ban') && (
              <Section title={activeBan ? 'Current ban' : 'Ban or suspend'} hint={activeBan ? undefined : 'Signs them out everywhere. The reason is shown to them.'}>
                {activeBan ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 shadow-[inset_0_0_0_1px_var(--color-state-error)]">
                    <div className="min-w-0 text-sm">
                      <p className="font-medium text-text-primary">{activeBan.expires_at ? `Suspended until ${when(activeBan.expires_at)}` : 'Banned indefinitely'}</p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        “{activeBan.reason}” — @{activeBan.created_by}, {ago(activeBan.created_at)}
                      </p>
                    </div>
                    <button type="button" className="nx-btn" data-size="sm" disabled={!canAct || busy === 'unban'} onClick={() => act('unban', () => api.post(`${base}/unban`, {}), 'Ban lifted')}>
                      Lift ban
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="desk-seg">
                      {(['suspend', 'ban'] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={banKind === k}
                          disabled={!canAct}
                          onClick={() => setBanKind(k)}
                          className="desk-seg-btn capitalize disabled:cursor-not-allowed"
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                    {banKind === 'suspend' && (
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          ['1', '1 hour'],
                          ['24', '1 day'],
                          ['72', '3 days'],
                          ['168', '1 week'],
                          ['720', '30 days'],
                        ].map(([h, l]) => (
                          <button
                            key={h}
                            type="button"
                            disabled={!canAct}
                            onClick={() => setBanHours(h)}
                            className={cn(
                              'h-7 cursor-pointer rounded-full px-3 text-xs font-medium transition-shadow',
                              banHours === h ? 'text-text-primary shadow-[inset_0_0_0_1.5px_var(--color-text-primary)]' : 'text-text-secondary shadow-[inset_0_0_0_1px_var(--nx-hair-strong)]',
                            )}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea className="nx-input" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Reason (shown to the user)" maxLength={500} disabled={!canAct} />
                    <button
                      type="button"
                      className="nx-btn"
                      data-tone="danger-solid"
                      disabled={!canAct || banReason.trim().length < 3}
                      onClick={() =>
                        setPending({
                          title: banKind === 'ban' ? `Ban @${u.username}?` : `Suspend @${u.username}?`,
                          body: (
                            <>
                              {banKind === 'ban' ? 'They lose access until the ban is lifted.' : `They lose access for ${banHours === '1' ? 'an hour' : `${Number(banHours) >= 24 ? `${Number(banHours) / 24} day${banHours === '24' ? '' : 's'}` : `${banHours} hours`}`}.`} They'll see: “{banReason.trim()}”
                            </>
                          ),
                          label: banKind === 'ban' ? 'Ban user' : 'Suspend user',
                          danger: true,
                          run: () =>
                            act('ban', () => api.post(`${base}/ban`, { kind: banKind, reason: banReason, hours: banKind === 'suspend' ? Number(banHours) : undefined }), banKind === 'ban' ? 'User banned' : 'User suspended').then(() => setBanReason('')),
                        })
                      }
                    >
                      {banKind === 'ban' ? 'Ban user' : 'Suspend user'}
                    </button>
                  </div>
                )}
              </Section>
            )}
            {can('content.moderate') && (
              <Section title="Warn" hint="Shows as a banner they have to acknowledge.">
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void act('warn', () => api.post(`${base}/warn`, { reason: warnReason }), 'Warning sent').then(() => setWarnReason(''))
                  }}
                >
                  <input className="nx-input" value={warnReason} onChange={(e) => setWarnReason(e.target.value)} placeholder="What should they change?" maxLength={500} disabled={!canAct} />
                  <button type="submit" className="nx-btn" disabled={!canAct || warnReason.trim().length < 3 || busy === 'warn'}>
                    Send
                  </button>
                </form>
                {d.warnings.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {d.warnings.map((w) => (
                      <li key={w.id} className="flex items-center gap-2 text-xs text-text-secondary">
                        <Icon name={w.acknowledged_at ? 'check-circle' : 'clock'} className={cn('size-3.5 shrink-0', w.acknowledged_at ? 'text-state-success' : 'text-state-warning')} />
                        <span className="min-w-0 flex-1 truncate">{w.reason}</span>
                        <span className="shrink-0 text-text-muted">@{w.created_by} · {ago(w.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}
            {d.bans.length > 0 && (
              <Section title="Ban history">
                <ul className="space-y-1.5">
                  {d.bans.map((b) => (
                    <li key={b.id} className="flex items-center gap-2 text-xs">
                      <Chip tone={b.active ? 'danger' : undefined}>{b.kind}</Chip>
                      <span className="min-w-0 flex-1 truncate text-text-secondary">{b.reason}</span>
                      <span className="shrink-0 text-text-muted">{b.lifted_at ? `lifted ${ago(b.lifted_at)}` : ago(b.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}

        {tab === 'activity' && (
          <>
            <Section title="Recent submissions">
              {d.submissions.length === 0 ? (
                <p className="text-[13px] text-text-muted">No submissions yet.</p>
              ) : (
                <ul className="overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_var(--nx-hair)]">
                  {d.submissions.map((s, i) => (
                    <li key={s.id} className={cn('flex items-center gap-3 px-3.5 py-2 text-[12.5px]', i > 0 && 'border-t border-[color:var(--nx-hair)]')}>
                      <Chip tone={s.verdict === 'AC' ? 'success' : 'danger'} className="!font-mono">
                        {s.verdict}
                      </Chip>
                      <span className="min-w-0 flex-1 truncate text-text-primary">{s.title ?? `#${s.id}`}</span>
                      <span className="shrink-0 text-text-muted">{s.language}</span>
                      <span className="w-16 shrink-0 text-right text-text-muted">{ago(s.submitted_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Sessions" hint="Session ids are hashed.">
              {d.sessions.length === 0 ? (
                <p className="text-[13px] text-text-muted">Not signed in anywhere.</p>
              ) : (
                <ul className="space-y-1.5">
                  {d.sessions.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-xs text-text-secondary">
                      <Icon name="monitor" className="size-3.5 text-text-muted" />
                      <span className="font-mono">{s.id}</span>
                      <span className="ml-auto text-text-muted">expires {ago(s.expires)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            {d.history.length > 0 && (
              <Section title="Admin history">
                <ul className="space-y-1.5">
                  {d.history.map((h) => (
                    <li key={h.id} className="flex items-center gap-2 text-xs">
                      <span className="rounded-md bg-bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-text-primary shadow-[inset_0_0_0_1px_var(--nx-hair)]">{h.action}</span>
                      <span className="text-text-secondary">@{h.actor}</span>
                      <span className="ml-auto shrink-0 text-text-muted">{ago(h.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}
      </div>

      <Confirm
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending?.title ?? ''}
        confirmLabel={pending?.label}
        danger={pending?.danger}
        typeToConfirm={pending?.typeToConfirm}
        onConfirm={() => pending?.run()}
      >
        {pending?.body}
      </Confirm>
    </div>
  )
}
