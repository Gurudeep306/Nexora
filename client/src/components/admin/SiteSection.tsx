import { useState, type CSSProperties } from 'react'
import { Avatar, Select, useToast } from '@/components/ui'
import { Icon, type IconName } from '@/components/icon/Icon'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { FEATURE_LABELS, type FeatureFlag } from '@/lib/site'
import { useSite } from '@/context/SiteContext'
import { cn } from '@/lib/utils'
import { Chip, Confirm, Empty, Failed, Panel, Skeleton, Toggle } from './kit'
import { ago } from './format'
import type { AdminAnnouncement, AdminMe, SiteAdmin } from './types'

const FLAG_META: Record<FeatureFlag, { hint: string; icon: IconName }> = {
  gate: { hint: 'GATE practice, tests, planner and leaderboard', icon: 'gate' },
  contests: { hint: 'Contests and live classes', icon: 'contests' },
  social: { hint: 'Friends, messages, rooms and the feed', icon: 'social' },
  ai_tutor: { hint: 'The AI assistant and AI features', icon: 'sparkles' },
  practice: { hint: 'The problem set and the solver', icon: 'problems' },
}

const COLORS = [
  { id: 'brand', label: 'Brand', css: 'var(--nx-b1)' },
  { id: 'info', label: 'Info', css: 'var(--color-state-info)' },
  { id: 'success', label: 'Success', css: 'var(--color-state-success)' },
  { id: 'warning', label: 'Warning', css: 'var(--color-state-warning)' },
  { id: 'danger', label: 'Danger', css: 'var(--color-state-error)' },
] as const

function useAct() {
  const toast = useToast()
  const { refresh } = useSite()
  const [busy, setBusy] = useState<string | null>(null)
  const act = async (key: string, fn: () => Promise<unknown>, done: string, after?: () => void) => {
    setBusy(key)
    try {
      await fn()
      toast.success(done)
      after?.()
      void refresh()
    } catch (e) {
      toast.error('Could not save', e instanceof ApiError ? e.message : undefined)
    } finally {
      setBusy(null)
    }
  }
  return { busy, act }
}

/** Private mode, early access, registrations, feature flags, maintenance (site.settings). */
export function SiteSettingsPanel() {
  const { data, loading, error, refetch } = useApi(() => api.get<SiteAdmin>('/api/admin/site'), [])
  const { busy, act } = useAct()
  // Unsaved edits (null = showing the saved value).
  const [messageDraft, setMessage] = useState<string | null>(null)
  const [maintDraft, setMaint] = useState<string | null>(null)
  const [entry, setEntry] = useState('')
  const [note, setNote] = useState('')
  const [confirmPrivate, setConfirmPrivate] = useState<boolean | null>(null)

  if (loading && !data) {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }
  if (error || !data) return <Failed message={error ?? 'Could not load site settings'} onRetry={refetch} />
  const s = data.settings
  const message = messageDraft ?? s.private_mode.message
  const maint = maintDraft ?? s.maintenance.message
  const on = data.privateActive

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {/* ── private mode ── */}
      <section className="nx-panel relative isolate overflow-hidden xl:col-span-2">
        <div className="nx-atmos opacity-70" aria-hidden="true" />
        <div className="relative z-10 grid gap-5 p-5 md:grid-cols-[1fr_1.1fr] md:p-6">
          <div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'flex size-11 items-center justify-center rounded-2xl text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]',
                  on ? 'bg-[linear-gradient(140deg,#3a63f0,#6d3df0_60%,#0e9488)]' : 'bg-[linear-gradient(160deg,color-mix(in_oklab,var(--color-state-success)_85%,white),var(--color-state-success))]',
                )}
              >
                <Icon name={on ? 'lock' : 'globe'} className="size-5" />
              </span>
              <div>
                <h3 className="nx-display text-[20px] leading-tight font-semibold text-text-primary">Private mode</h3>
                <p className="mt-0.5 text-[13px] text-text-secondary">{on ? 'The public sees “coming soon”.' : 'NexoraGuru is open to everyone.'}</p>
              </div>
              <span className="ml-auto">
                <Toggle label="Private mode" checked={s.private_mode.enabled} disabled={busy === 'private'} onChange={(v) => setConfirmPrivate(v)} />
              </span>
            </div>
            <ul className="mt-5 space-y-2 text-[13px] text-text-secondary">
              {[
                ['crown', 'You, admins and early-access users still get in'],
                ['login', 'The sign-in page stays reachable'],
                ['user-plus', 'Sign-ups are invite-only while private'],
              ].map(([icon, t]) => (
                <li key={t} className="flex items-center gap-2.5">
                  <Icon name={icon as IconName} className="size-4 text-text-muted" />
                  {t}
                </li>
              ))}
            </ul>
            {!s.owner_username && <p className="mt-4 text-xs font-medium text-state-error">No owner is configured — private mode can't take effect.</p>}
            {data.ownerSource && (
              <p className="mt-4 text-[11.5px] text-text-muted">
                Owner <span className="font-medium text-text-secondary">@{s.owner_username}</span> · from{' '}
                {data.ownerSource === 'env' ? 'OWNER_USERNAME' : data.ownerSource === 'cli' ? 'the admin CLI' : 'config/site.json'}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary" htmlFor="pm-msg">
              Line on the coming-soon page
            </label>
            <textarea id="pm-msg" className="nx-input" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={280} />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="nx-num text-[11px] text-text-muted">{message.length}/280</span>
              <button
                type="button"
                className="nx-btn"
                data-size="sm"
                disabled={message === s.private_mode.message || busy === 'pm-msg'}
                onClick={() =>
                  act('pm-msg', () => api.put('/api/admin/site/private-mode', { enabled: s.private_mode.enabled, message }), 'Message saved', () => {
                    setMessage(null)
                    refetch()
                  })
                }
              >
                Save line
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── early access ── */}
      <Panel icon="user-plus" title="Early access" description="Invite by username or email — they can sign up and get in while private.">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault()
            void act('allow', () => api.post('/api/admin/site/allowlist', { entry: entry.trim(), note }), `${entry.trim()} invited`, () => {
              setEntry('')
              setNote('')
              refetch()
            })
          }}
        >
          <input className="nx-input" value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="username or email" aria-label="Username or email" />
          <input className="nx-input sm:max-w-[38%]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" />
          <button type="submit" className="nx-cta" disabled={entry.trim().length < 2 || busy === 'allow'}>
            Invite
          </button>
        </form>
        <ul className="mt-3 max-h-72 overflow-y-auto rounded-xl shadow-[inset_0_0_0_1px_var(--nx-hair)]">
          {data.earlyAccess.map((u, i) => (
            <li key={`u${u.username}`} className={cn('flex items-center gap-2.5 px-3 py-2 text-[13px]', i > 0 && 'border-t border-[color:var(--nx-hair)]')}>
              <Avatar seed={u.username} avatar={u.avatar} src={u.avatar_url} name={u.username} size="xs" />
              <span className="min-w-0 flex-1 truncate font-medium text-text-primary">@{u.username}</span>
              <Chip tone="violet">member</Chip>
              <span className="text-xs text-text-muted">by {u.granted_by}</span>
            </li>
          ))}
          {data.allowlist.map((a, i) => (
            <li key={`a${a.entry}`} className={cn('flex items-center gap-2.5 px-3 py-2 text-[13px]', (i > 0 || data.earlyAccess.length > 0) && 'border-t border-[color:var(--nx-hair)]')}>
              <span className="flex size-6 items-center justify-center rounded-full bg-bg-surface-2 text-text-muted">
                <Icon name="mail" className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-text-primary">
                {a.entry}
                {a.note && <span className="ml-2 text-xs text-text-muted">{a.note}</span>}
              </span>
              <Chip>invite · {ago(a.created_at)}</Chip>
              <button
                type="button"
                aria-label={`Remove invite for ${a.entry}`}
                onClick={() => act(`rm${a.entry}`, () => api.delete(`/api/admin/site/allowlist/${encodeURIComponent(a.entry)}`), 'Invite removed', refetch)}
                className="flex size-6 cursor-pointer items-center justify-center rounded-md text-text-muted hover:bg-bg-surface-2 hover:text-state-error"
              >
                <Icon name="x" className="size-3.5" />
              </button>
            </li>
          ))}
          {data.earlyAccess.length + data.allowlist.length === 0 && (
            <li>
              <Empty icon="user-plus" title="No invites yet">
                People you invite appear here.
              </Empty>
            </li>
          )}
        </ul>
      </Panel>

      {/* ── feature flags ── */}
      <Panel icon="sliders" title="Feature flags" description="Switch whole sections off. You still see everything — preview as a member to check.">
        <ul className="-my-1 divide-y divide-[color:var(--nx-hair)]">
          {(Object.keys(FEATURE_LABELS) as FeatureFlag[]).map((f) => (
            <li key={f} className="flex items-center gap-3 py-2.5">
              <span className={cn('flex size-8 items-center justify-center rounded-lg transition-colors', s.feature_flags[f] ? 'bg-[color-mix(in_oklab,var(--nx-b1)_11%,transparent)] text-[var(--nx-b1)]' : 'bg-bg-surface-2 text-text-muted')}>
                <Icon name={FLAG_META[f].icon} className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[13.5px] font-medium text-text-primary">
                  {FEATURE_LABELS[f]}
                  {!s.feature_flags[f] && <Chip tone="warning">off</Chip>}
                </span>
                <span className="block text-xs text-text-muted">{FLAG_META[f].hint}</span>
              </span>
              <Toggle
                label={FEATURE_LABELS[f]}
                checked={s.feature_flags[f]}
                disabled={busy === `flag:${f}`}
                onChange={(v) => act(`flag:${f}`, () => api.put('/api/admin/site/flags', { [f]: v }), `${FEATURE_LABELS[f]} ${v ? 'on' : 'off'}`, refetch)}
              />
            </li>
          ))}
        </ul>
      </Panel>

      {/* ── registrations + maintenance ── */}
      <Panel
        icon="user-plus"
        title="Sign-ups"
        description={on ? 'Invite-only while the site is private.' : s.registrations.open ? 'Anyone can create an account.' : 'Closed — only invited people can register.'}
        actions={
          <Toggle
            label="Registrations open"
            checked={s.registrations.open}
            disabled={busy === 'reg'}
            onChange={(open) => act('reg', () => api.put('/api/admin/site/registrations', { open }), open ? 'Sign-ups open' : 'Sign-ups closed', refetch)}
          />
        }
      />
      <Panel
        icon="wrench"
        title="Maintenance banner"
        description="A striped warning strip above every page."
        actions={
          <Toggle
            label="Maintenance banner"
            checked={s.maintenance.enabled}
            disabled={busy === 'maint'}
            onChange={(enabled) => act('maint', () => api.put('/api/admin/site/maintenance', { enabled, message: maint }), enabled ? 'Banner on' : 'Banner off', refetch)}
          />
        }
      >
        <div className="flex gap-2">
          <input className="nx-input" value={maint} onChange={(e) => setMaint(e.target.value)} placeholder="e.g. The judge is slow — we're on it" maxLength={280} aria-label="Maintenance message" />
          <button
            type="button"
            className="nx-btn"
            disabled={maint === s.maintenance.message || busy === 'maint-msg'}
            onClick={() =>
              act('maint-msg', () => api.put('/api/admin/site/maintenance', { enabled: s.maintenance.enabled, message: maint }), 'Saved', () => {
                setMaint(null)
                refetch()
              })
            }
          >
            Save
          </button>
        </div>
      </Panel>

      <Confirm
        open={confirmPrivate !== null}
        onClose={() => setConfirmPrivate(null)}
        title={confirmPrivate ? 'Make NexoraGuru private?' : 'Open NexoraGuru to everyone?'}
        confirmLabel={confirmPrivate ? 'Go private' : 'Go public'}
        onConfirm={() => act('private', () => api.put('/api/admin/site/private-mode', { enabled: !!confirmPrivate, message }), confirmPrivate ? 'Site is private' : 'Site is public', refetch)}
      >
        {confirmPrivate
          ? 'Everyone except you, admins and early-access users sees the coming-soon page right away. Signed-in members are shown it on their next request.'
          : 'Anyone can visit and sign up again (unless sign-ups are closed).'}
      </Confirm>
    </div>
  )
}

/** Announcement bar + broadcast notifications (announcements.post). */
export function AnnouncementsPanel({ me }: { me: AdminMe }) {
  const { data, loading, error, refetch } = useApi(() => api.get<{ announcements: AdminAnnouncement[] }>('/api/admin/announcements'), [])
  const { busy, act } = useAct()
  const [now] = useState(() => Date.now())
  const [kind, setKind] = useState<'banner' | 'broadcast'>('banner')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [color, setColor] = useState<(typeof COLORS)[number]['id']>('brand')
  const [hours, setHours] = useState('0')
  const [pinned, setPinned] = useState(false)
  const [remove, setRemove] = useState<AdminAnnouncement | null>(null)
  const tone = COLORS.find((c) => c.id === color)!.css

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
      <Panel icon="bell" title="New announcement" description="Banner: the bar above every page. Broadcast: a notification to everyone.">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void act(
              'post',
              () => api.post('/api/admin/announcements', { kind, title, body, link: link || null, color, hours: hours === '0' ? null : Number(hours), pinned }),
              kind === 'banner' ? 'Banner posted' : 'Broadcast sent',
              () => {
                setTitle('')
                setBody('')
                setLink('')
                setPinned(false)
                refetch()
              },
            )
          }}
        >
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-bg-surface-2 p-1 shadow-[inset_0_0_0_1px_var(--nx-hair)]">
            {(['banner', 'broadcast'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={cn(
                  'flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium capitalize transition-colors',
                  kind === k ? 'bg-bg-surface text-text-primary shadow-[0_1px_2px_oklch(0_0_0/0.15),inset_0_0_0_1px_var(--nx-hair)]' : 'text-text-muted hover:text-text-secondary',
                )}
              >
                <Icon name={k === 'banner' ? 'flag' : 'bell'} className="size-3.5" />
                {k}
              </button>
            ))}
          </div>
          <input className="nx-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" maxLength={120} aria-label="Title" />
          <textarea className="nx-input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" maxLength={500} aria-label="Message" required />
          <input className="nx-input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link — /contests or https://…" aria-label="Link" />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Colour">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={color === c.id}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => setColor(c.id)}
                  style={{ background: c.css }}
                  className={cn('size-6 cursor-pointer rounded-full ring-offset-2 ring-offset-bg-surface transition', color === c.id ? 'scale-110 ring-2 ring-text-primary/70' : 'opacity-75 hover:opacity-100')}
                />
              ))}
            </div>
            <Select value={hours} onValueChange={setHours} aria-label="Expires" className="!h-[2.375rem] w-36">
              <option value="0">No expiry</option>
              <option value="1">1 hour</option>
              <option value="24">1 day</option>
              <option value="168">1 week</option>
              <option value="720">30 days</option>
            </Select>
            {me.isOwner && kind === 'banner' && (
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-text-secondary">
                <Toggle size="sm" label="Pin" checked={pinned} onChange={setPinned} />
                <Icon name="crown" className="size-3.5 text-[var(--nx-gold)]" /> Pin
              </label>
            )}
          </div>

          {/* live preview */}
          {body.trim() && (
            <div className="overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_var(--nx-hair)]">
              <p className="border-b border-[color:var(--nx-hair)] px-3 py-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-text-muted uppercase">Preview</p>
              {kind === 'banner' ? (
                <div className="nx-bar" style={{ '--tone': tone } as CSSProperties}>
                  <div className="flex items-center gap-3 px-3 py-2 text-[13px]">
                    <span className="nx-bar-icon shrink-0">
                      <Icon name={pinned ? 'crown' : 'bell'} className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 text-text-primary">
                      {title && <span className="mr-1.5 font-semibold">{title}</span>}
                      <span className={title ? 'text-text-secondary' : undefined}>{body}</span>
                      {link && <span className="ml-2 font-semibold text-[var(--tone)]">Open →</span>}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 text-[13px]">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full" style={{ color: tone, background: `color-mix(in oklab, ${tone} 14%, transparent)` }}>
                    <Icon name="bell" className="size-4" />
                  </span>
                  <span className="min-w-0 text-text-secondary">
                    {title && <strong className="block font-semibold text-text-primary">{title}</strong>}
                    {body}
                  </span>
                </div>
              )}
            </div>
          )}

          <button type="submit" className="nx-cta w-full" data-size="lg" disabled={body.trim().length < 2 || busy === 'post'}>
            {kind === 'banner' ? 'Post banner' : 'Send to everyone'}
          </button>
        </form>
      </Panel>

      <Panel title="Posted" description={data ? `${data.announcements.length} announcements` : undefined} bodyClassName="p-0">
        {loading && !data ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : error ? (
          <Failed message={error} onRetry={refetch} />
        ) : !data?.announcements.length ? (
          <Empty icon="bell" title="Nothing posted yet">
            Banners and broadcasts you post appear here.
          </Empty>
        ) : (
          <ul className="divide-y divide-[color:var(--nx-hair)]">
            {data.announcements.map((a) => {
              const expired = !!a.expires_at && a.expires_at < now
              const live = !!a.active && !expired
              const c = COLORS.find((x) => x.id === a.color)?.css
              return (
                <li key={a.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: c, boxShadow: live ? `0 0 0 3px color-mix(in oklab, ${c} 20%, transparent)` : undefined }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] break-words text-text-primary">
                      {a.pinned ? <Icon name="crown" className="mr-1 inline size-3.5 align-[-2px] text-[var(--nx-gold)]" /> : null}
                      {a.title && <strong className="mr-1 font-semibold">{a.title}</strong>}
                      <span className={a.title ? 'text-text-secondary' : undefined}>{a.body}</span>
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
                      <Chip>{a.kind}</Chip>@{a.created_by} · {ago(a.created_at)}
                      {a.expires_at ? ` · ${expired ? 'expired' : `ends ${ago(a.expires_at)}`}` : ''}
                      {!a.active && <Chip tone="warning">hidden</Chip>}
                    </p>
                  </div>
                  {a.kind === 'banner' && !expired && (
                    <Toggle
                      size="sm"
                      label={live ? 'Hide' : 'Show'}
                      checked={live}
                      disabled={(!!a.pinned && !me.isOwner) || busy === `t${a.id}`}
                      onChange={(v) => act(`t${a.id}`, () => api.patch(`/api/admin/announcements/${a.id}`, { active: v }), v ? 'Shown' : 'Hidden', refetch)}
                    />
                  )}
                  <button
                    type="button"
                    aria-label="Delete"
                    disabled={!!a.pinned && !me.isOwner}
                    onClick={() => setRemove(a)}
                    className="flex size-7 cursor-pointer items-center justify-center rounded-md text-text-muted hover:bg-bg-surface-2 hover:text-state-error disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon name="delete" className="size-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
      <Confirm
        open={!!remove}
        onClose={() => setRemove(null)}
        title="Delete this announcement?"
        confirmLabel="Delete"
        danger
        onConfirm={() => remove ? act(`d${remove.id}`, () => api.delete(`/api/admin/announcements/${remove.id}`), 'Deleted', refetch) : undefined}
      >
        “{remove?.body}” disappears for everyone.
      </Confirm>
    </div>
  )
}
