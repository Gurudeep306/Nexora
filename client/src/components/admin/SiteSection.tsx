import { useState } from 'react'
import { Avatar, Button, ErrorState, Input, LoadingBlock, Select, Textarea, useToast } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { FEATURE_LABELS, type FeatureFlag } from '@/lib/site'
import { useSite } from '@/context/SiteContext'
import { cn } from '@/lib/utils'
import { Panel, Toggle } from './kit'
import { ago } from './format'
import type { AdminAnnouncement, AdminMe, SiteAdmin } from './types'

const FLAG_HINTS: Record<FeatureFlag, string> = {
  gate: 'GATE practice, tests, planner and leaderboard',
  contests: 'Contests and live classes',
  social: 'Friends, messages, rooms and the feed',
  ai_tutor: 'The AI assistant panel and AI features',
  practice: 'The problem set and solver',
}

const COLORS = [
  { id: 'brand', label: 'Brand', cls: 'bg-accent-brand' },
  { id: 'info', label: 'Info', cls: 'bg-state-info' },
  { id: 'success', label: 'Success', cls: 'bg-state-success' },
  { id: 'warning', label: 'Warning', cls: 'bg-state-warning' },
  { id: 'danger', label: 'Danger', cls: 'bg-state-error' },
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

/** Private mode, registrations, feature flags, maintenance (site.settings). */
export function SiteSettingsPanel() {
  const { data, loading, error, refetch } = useApi(() => api.get<SiteAdmin>('/api/admin/site'), [])
  const { busy, act } = useAct()
  // Unsaved edits (null = showing the saved value).
  const [messageDraft, setMessage] = useState<string | null>(null)
  const [maintDraft, setMaint] = useState<string | null>(null)
  const [entry, setEntry] = useState('')
  const [note, setNote] = useState('')

  if (loading && !data) return <LoadingBlock rows={6} />
  if (error || !data) return <ErrorState message={error ?? 'Could not load site settings'} onRetry={refetch} />
  const s = data.settings
  const message = messageDraft ?? s.private_mode.message
  const maint = maintDraft ?? s.maintenance.message

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel
        title={
          <span className="flex items-center gap-2">
            <Icon name="lock" className="size-4 text-accent-brand" /> Private mode
          </span>
        }
        description="Only you, admins and early-access users can get in. Everyone else sees “coming soon”."
        actions={
          <Toggle
            label="Private mode"
            checked={s.private_mode.enabled}
            disabled={busy === 'private'}
            onChange={(enabled) => act('private', () => api.put('/api/admin/site/private-mode', { enabled, message }), enabled ? 'Site is private' : 'Site is public', refetch)}
          />
        }
      >
        <div
          className={cn(
            'mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs',
            data.privateActive ? 'border-state-warning/30 bg-state-warning/10 text-text-primary' : 'border-state-success/25 bg-state-success/10 text-text-primary',
          )}
        >
          <span className={cn('size-2 rounded-full', data.privateActive ? 'bg-state-warning' : 'bg-state-success')} />
          {data.privateActive ? 'Private — the public sees the coming-soon page' : 'Public — anyone can visit and sign up'}
          {!s.owner_username && <span className="ml-auto text-state-error">No owner configured</span>}
        </div>
        <label className="mb-1.5 block text-xs font-medium text-text-secondary" htmlFor="pm-msg">
          Message on the coming-soon page
        </label>
        <Textarea id="pm-msg" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={280} className="min-h-[72px]" />
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            disabled={message === s.private_mode.message}
            loading={busy === 'pm-msg'}
            onClick={() => act('pm-msg', () => api.put('/api/admin/site/private-mode', { enabled: s.private_mode.enabled, message }), 'Message saved', () => { setMessage(null); refetch() })}
          >
            Save message
          </Button>
        </div>
      </Panel>

      <Panel title="Early access" description="Invite by username or email — they can sign up and get in while the site is private.">
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
          <Input value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="username or email" aria-label="Username or email" />
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" />
          <Button type="submit" size="md" disabled={entry.trim().length < 2} loading={busy === 'allow'}>
            Invite
          </Button>
        </form>
        <ul className="mt-3 max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {data.earlyAccess.map((u) => (
            <li key={`u${u.username}`} className="flex items-center gap-2.5 px-3 py-2 text-sm">
              <Avatar seed={u.username} avatar={u.avatar} src={u.avatar_url} name={u.username} size="xs" />
              <span className="min-w-0 flex-1 truncate text-text-primary">@{u.username}</span>
              <span className="text-xs text-text-muted">granted by {u.granted_by}</span>
            </li>
          ))}
          {data.allowlist.map((a) => (
            <li key={`a${a.entry}`} className="flex items-center gap-2.5 px-3 py-2 text-sm">
              <Icon name="mail" className="size-4 text-text-muted" />
              <span className="min-w-0 flex-1 truncate text-text-primary">
                {a.entry}
                {a.note && <span className="ml-2 text-xs text-text-muted">{a.note}</span>}
              </span>
              <span className="text-xs text-text-muted">invite · {ago(a.created_at)}</span>
              <button
                type="button"
                aria-label={`Remove invite for ${a.entry}`}
                onClick={() => act(`rm${a.entry}`, () => api.delete(`/api/admin/site/allowlist/${encodeURIComponent(a.entry)}`), 'Invite removed', refetch)}
                className="cursor-pointer rounded p-1 text-text-muted hover:bg-bg-surface-3 hover:text-state-error"
              >
                <Icon name="x" className="size-3.5" />
              </button>
            </li>
          ))}
          {data.earlyAccess.length + data.allowlist.length === 0 && <li className="px-3 py-6 text-center text-xs text-text-muted">No early-access users or invites yet.</li>}
        </ul>
      </Panel>

      <Panel title="Feature flags" description="Switch whole sections off. You still see everything (preview as a member to check).">
        <ul className="space-y-1">
          {(Object.keys(FEATURE_LABELS) as FeatureFlag[]).map((f) => (
            <li key={f} className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5">
              <span>
                <span className="block text-sm text-text-primary">{FEATURE_LABELS[f]}</span>
                <span className="block text-xs text-text-muted">{FLAG_HINTS[f]}</span>
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

      <div className="space-y-5">
        <Panel
          title="Registrations"
          description={data.privateActive ? 'Closed while the site is private (invites still work).' : 'Let new people create accounts.'}
          actions={
            <Toggle
              label="Registrations open"
              checked={s.registrations.open}
              disabled={busy === 'reg'}
              onChange={(open) => act('reg', () => api.put('/api/admin/site/registrations', { open }), open ? 'Sign-ups open' : 'Sign-ups closed', refetch)}
            />
          }
        >
          <p className="text-xs text-text-secondary">{s.registrations.open ? 'Sign-ups are open.' : 'Sign-ups are closed — only invited people can register.'}</p>
        </Panel>
        <Panel
          title="Maintenance banner"
          description="A warning strip at the top of every page."
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
            <Input value={maint} onChange={(e) => setMaint(e.target.value)} placeholder="e.g. Judge is slow — we're on it" maxLength={280} aria-label="Maintenance message" />
            <Button
              size="md"
              variant="secondary"
              disabled={maint === s.maintenance.message}
              loading={busy === 'maint-msg'}
              onClick={() => act('maint-msg', () => api.put('/api/admin/site/maintenance', { enabled: s.maintenance.enabled, message: maint }), 'Saved', () => { setMaint(null); refetch() })}
            >
              Save
            </Button>
          </div>
        </Panel>
      </div>
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

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
      <Panel title="New announcement" description="Banner = the bar on top of every page. Broadcast = an in-app notification to everyone.">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void act(
              'post',
              () =>
                api.post('/api/admin/announcements', {
                  kind,
                  title,
                  body,
                  link: link || null,
                  color,
                  hours: hours === '0' ? null : Number(hours),
                  pinned,
                }),
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
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-bg-surface-2 p-1">
            {(['banner', 'broadcast'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={cn(
                  'cursor-pointer rounded-md py-1.5 text-sm font-medium capitalize transition-colors',
                  kind === k ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {k}
              </button>
            ))}
          </div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" maxLength={120} aria-label="Title" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" maxLength={500} className="min-h-[80px]" aria-label="Message" required />
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link — /contests or https://…" aria-label="Link" />
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
                  className={cn('size-6 cursor-pointer rounded-full ring-offset-2 ring-offset-bg-surface transition', c.cls, color === c.id ? 'ring-2 ring-text-primary' : 'opacity-70 hover:opacity-100')}
                />
              ))}
            </div>
            <Select value={hours} onValueChange={setHours} aria-label="Expires" className="w-36">
              <option value="0">No expiry</option>
              <option value="1">1 hour</option>
              <option value="24">1 day</option>
              <option value="168">1 week</option>
              <option value="720">30 days</option>
            </Select>
            {me.isOwner && kind === 'banner' && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
                <Toggle size="sm" label="Pin" checked={pinned} onChange={setPinned} />
                Pin <Icon name="crown" className="size-3.5 text-state-gold" />
              </label>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={body.trim().length < 2} loading={busy === 'post'}>
            {kind === 'banner' ? 'Post banner' : 'Send to everyone'}
          </Button>
        </form>
      </Panel>

      <Panel title="Posted" bodyClassName="p-0">
        {loading && !data ? (
          <div className="p-4">
            <LoadingBlock rows={4} />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : !data?.announcements.length ? (
          <p className="px-4 py-10 text-center text-sm text-text-secondary">Nothing posted yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.announcements.map((a) => {
              const expired = !!a.expires_at && a.expires_at < now
              const live = !!a.active && !expired
              return (
                <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', COLORS.find((c) => c.id === a.color)?.cls)} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm text-text-primary">
                      {a.pinned ? <Icon name="crown" className="size-3.5 text-state-gold" /> : null}
                      {a.title && <strong className="font-semibold">{a.title}</strong>}
                      <span className="min-w-0 break-words">{a.body}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {a.kind} · @{a.created_by} · {ago(a.created_at)}
                      {a.expires_at ? ` · ${expired ? 'expired' : `expires ${ago(a.expires_at)}`}` : ''}
                      {!a.active ? ' · hidden' : ''}
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
                    onClick={() => act(`d${a.id}`, () => api.delete(`/api/admin/announcements/${a.id}`), 'Deleted', refetch)}
                    className="cursor-pointer rounded p-1 text-text-muted hover:bg-bg-surface-3 hover:text-state-error disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon name="delete" className="size-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}
