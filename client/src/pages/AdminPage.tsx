import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, ErrorState, LoadingBlock } from '@/components/ui'
import { Icon, IconBadge, type IconName } from '@/components/icon/Icon'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { refreshBadges } from '@/lib/badges'
import { useSite } from '@/context/SiteContext'
import { cn } from '@/lib/utils'
import { RolePill } from '@/components/admin/kit'
import { OverviewSection } from '@/components/admin/OverviewSection'
import { UsersSection } from '@/components/admin/UsersSection'
import { UserDrawer } from '@/components/admin/UserDrawer'
import { AnnouncementsPanel, SiteSettingsPanel } from '@/components/admin/SiteSection'
import { ModerationSection } from '@/components/admin/ModerationSection'
import { AuditSection } from '@/components/admin/AuditSection'
import type { AdminMe } from '@/components/admin/types'

type SectionId = 'overview' | 'users' | 'site' | 'announcements' | 'moderation' | 'audit'

const SECTIONS: { id: SectionId; label: string; icon: IconName; perm: string; blurb: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'chart', perm: 'analytics.view', blurb: 'Totals, trends and who is around' },
  { id: 'users', label: 'Users', icon: 'users', perm: 'users.view', blurb: 'Search, roles, permissions, bans' },
  { id: 'site', label: 'Site', icon: 'globe', perm: 'site.settings', blurb: 'Private mode, flags, registrations' },
  { id: 'announcements', label: 'Announcements', icon: 'bell', perm: 'announcements.post', blurb: 'Banner bar and broadcasts' },
  { id: 'moderation', label: 'Moderation', icon: 'flag', perm: 'content.moderate', blurb: 'Reports queue and removals' },
  { id: 'audit', label: 'Audit log', icon: 'list', perm: 'audit.view', blurb: 'Every admin action' },
]

export default function AdminPage() {
  const { data: me, loading, error, refetch } = useApi(() => api.get<AdminMe>('/api/admin/me'), [])
  const [params, setParams] = useSearchParams()
  const [revision, setRevision] = useState(0)
  const { previewAsMember, setPreviewAsMember, status } = useSite()
  const navigate = useNavigate()

  if (loading && !me) {
    return (
      <div className="py-8">
        <LoadingBlock rows={8} />
      </div>
    )
  }
  if (error || !me) {
    const denied = error && /admin|permission|sign in/i.test(error)
    return denied ? (
      <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
        <IconBadge name="lock" tone="neutral" box="lg" />
        <h1 className="mt-5 font-display text-xl font-semibold text-text-primary">Admins only</h1>
        <p className="mt-2 text-sm text-text-secondary">You don't have access to the admin panel.</p>
        <Link to="/hub" className="mt-6 text-sm font-medium text-accent-brand hover:underline">
          Back to home
        </Link>
      </div>
    ) : (
      <ErrorState message={error ?? 'Could not load the admin panel'} onRetry={refetch} />
    )
  }

  const can = (p: string) => me.isOwner || me.permissions.includes(p)
  const visible = SECTIONS.filter((s) => can(s.perm))
  const requested = params.get('section') as SectionId | null
  const section = visible.find((s) => s.id === requested)?.id ?? visible[0]?.id
  const openUser = params.get('user')
  const go = (id: SectionId) => {
    const next = new URLSearchParams(params)
    next.set('section', id)
    next.delete('user')
    setParams(next, { replace: true })
  }
  const setUser = (u: string | null) => {
    if (!can('users.view')) return
    const next = new URLSearchParams(params)
    if (u) next.set('user', u)
    else next.delete('user')
    setParams(next, { replace: !u })
  }
  const changed = () => {
    setRevision((r) => r + 1)
    refreshBadges()
  }

  return (
    <div className="pb-10">
      {/* ── header ── */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <IconBadge name={me.isOwner ? 'crown' : 'shield'} tone={me.isOwner ? 'gold' : 'accent'} box="lg" />
          <div className="min-w-0">
            <p className="mb-0.5 text-[11px] font-semibold tracking-[0.14em] text-accent-brand/80 uppercase">NexoraGuru</p>
            <h1 className="font-display text-[26px] leading-tight font-semibold tracking-tight text-text-primary md:text-[30px]">Admin</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              Signed in as @{me.username} <RolePill role={me.role} />
              {status?.private && (
                <span className="inline-flex items-center gap-1 rounded-full border border-state-warning/30 bg-state-warning/10 px-2 py-0.5 text-[11px] font-medium text-state-warning">
                  <Icon name="lock" className="size-3" /> Site is private
                </span>
              )}
            </p>
          </div>
        </div>
        {me.isOwner && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setPreviewAsMember(!previewAsMember)
              if (!previewAsMember) navigate('/hub')
            }}
          >
            <Icon name="eye" /> View as member
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="card px-4 py-10 text-center text-sm text-text-secondary">Your permissions don't include any admin sections yet.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* ── section nav ── */}
          <nav aria-label="Admin sections" className="lg:sticky lg:top-20 lg:self-start">
            <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
              {visible.map((s) => {
                const on = s.id === section
                return (
                  <li key={s.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => go(s.id)}
                      aria-current={on ? 'page' : undefined}
                      className={cn(
                        'group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                        on ? 'bg-accent-brand/12 text-text-primary' : 'text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary',
                      )}
                    >
                      <Icon name={s.icon} className={cn('size-4 shrink-0', on && 'text-accent-brand')} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium whitespace-nowrap">{s.label}</span>
                        <span className="hidden truncate text-[11px] text-text-muted lg:block">{s.blurb}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {me.isOwner && (
              <div className="mt-4 hidden rounded-xl border border-state-gold/25 bg-state-gold/[0.06] p-3 lg:block">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-state-gold">
                  <Icon name="crown" className="size-3.5" /> Owner powers
                </p>
                <ul className="mt-2 space-y-1 text-[11px] leading-snug text-text-secondary">
                  <li>Make admins & grant site settings</li>
                  <li>Untouchable: no one can demote or ban you</li>
                  <li>See every section, whatever the flags</li>
                  <li>Pin announcements, delete accounts</li>
                  <li>Read what admins did in the audit log</li>
                </ul>
              </div>
            )}
          </nav>

          {/* ── section ── */}
          <div className="min-w-0">
            {section === 'overview' && <OverviewSection key={revision} onOpenUser={setUser} />}
            {section === 'users' && <UsersSection onOpenUser={setUser} revision={revision} />}
            {section === 'site' && <SiteSettingsPanel />}
            {section === 'announcements' && <AnnouncementsPanel me={me} />}
            {section === 'moderation' && <ModerationSection me={me} onOpenUser={setUser} />}
            {section === 'audit' && <AuditSection me={me} />}
          </div>
        </div>
      )}

      {can('users.view') && <UserDrawer username={openUser} me={me} onClose={() => setUser(null)} onChanged={changed} />}
    </div>
  )
}

