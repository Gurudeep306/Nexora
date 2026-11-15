import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import '@/components/site/brand.css'
import { Icon, type IconName } from '@/components/icon/Icon'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { refreshBadges } from '@/lib/badges'
import { useSite } from '@/context/SiteContext'
import { cn } from '@/lib/utils'
import { Failed, RolePill, Skeleton } from '@/components/admin/kit'
import { OverviewSection } from '@/components/admin/OverviewSection'
import { UsersSection } from '@/components/admin/UsersSection'
import { UserDrawer } from '@/components/admin/UserDrawer'
import { AnnouncementsPanel, SiteSettingsPanel } from '@/components/admin/SiteSection'
import { ModerationSection } from '@/components/admin/ModerationSection'
import { AuditSection } from '@/components/admin/AuditSection'
import { SourcesSection } from '@/components/admin/SourcesSection'
import { AiSection } from '@/components/admin/AiSection'
import '@/components/admin/ai.css'
import NotFoundPage from '@/pages/NotFoundPage'
import type { AdminMe } from '@/components/admin/types'

type SectionId = 'overview' | 'users' | 'moderation' | 'site' | 'ai' | 'sources' | 'announcements' | 'audit'

const GROUPS: { label: string; items: { id: SectionId; label: string; icon: IconName; perm: string; title: string; blurb: string }[] }[] = [
  {
    label: 'Insights',
    items: [{ id: 'overview', label: 'Overview', icon: 'chart', perm: 'analytics.view', title: 'Overview', blurb: 'How NexoraGuru is doing over the last 30 days.' }],
  },
  {
    label: 'People',
    items: [
      { id: 'users', label: 'Users', icon: 'users', perm: 'users.view', title: 'Users', blurb: 'Search accounts, change roles and permissions, ban and verify.' },
      { id: 'moderation', label: 'Moderation', icon: 'flag', perm: 'content.moderate', title: 'Moderation', blurb: 'Reports from the community — remove, restore, resolve.' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { id: 'site', label: 'Site', icon: 'globe', perm: 'site.settings', title: 'Site', blurb: 'Private mode, early access, sign-ups, feature flags and maintenance.' },
      { id: 'ai', label: 'AI models', icon: 'sparkles', perm: 'site.settings', title: 'AI models', blurb: 'Which AI the site uses: providers, keys, a model for each feature, and the daily budget.' },
      { id: 'sources', label: 'Problem sources', icon: 'database', perm: 'problems.manage', title: 'Problem sources', blurb: 'Which judges problems come from, kept in sync and tested live.' },
      { id: 'announcements', label: 'Announcements', icon: 'bell', perm: 'announcements.post', title: 'Announcements', blurb: 'The bar above every page, and notifications to everyone.' },
      { id: 'audit', label: 'Audit log', icon: 'list', perm: 'audit.view', title: 'Audit log', blurb: 'Every admin action — who, what, when, from where.' },
    ],
  },
]
const ALL = GROUPS.flatMap((g) => g.items)

export default function AdminPage() {
  const { data: me, loading, error, refetch } = useApi(() => api.get<AdminMe>('/api/admin/me'), [], { cacheKey: 'admin:me' })
  const [params, setParams] = useSearchParams()
  const [revision, setRevision] = useState(0)
  const { previewAsMember, setPreviewAsMember, status } = useSite()
  const navigate = useNavigate()

  if (loading && !me) {
    return (
      <div className="grid gap-6 pt-2 lg:grid-cols-[236px_minmax(0,1fr)]">
        <Skeleton className="hidden h-80 lg:block" />
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }
  // The API 404s for non-admins: show the ordinary not-found page.
  if (error && /not found/i.test(error)) return <NotFoundPage />
  if (error || !me) return <Failed message={error ?? 'Could not load the admin panel'} onRetry={refetch} />

  const can = (p: string) => me.isOwner || me.permissions.includes(p)
  const visible = ALL.filter((s) => can(s.perm))
  const requested = params.get('section') as SectionId | null
  const current = visible.find((s) => s.id === requested) ?? visible[0]
  const openUser = params.get('user')
  const go = (id: SectionId) => {
    const next = new URLSearchParams(params)
    next.set('section', id)
    next.delete('user')
    setParams(next, { replace: true })
    window.scrollTo({ top: 0 })
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
    <div className="pb-12">
      {/* ── header ── */}
      <header className="nx-panel relative isolate mb-6 overflow-hidden !rounded-[20px] px-5 py-5 sm:px-6">
        <div className="nx-atmos" aria-hidden="true" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span
              className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_8px_24px_-10px_var(--glow)]',
                me.isOwner ? 'bg-[linear-gradient(160deg,#ffd66b,#e09a1a)] [--glow:#e09a1a]' : 'bg-[linear-gradient(140deg,#3a63f0,#6d3df0_60%,#0e9488)] [--glow:#6d3df0]',
              )}
            >
              <Icon name={me.isOwner ? 'crown' : 'shield'} className="size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="nx-display text-[28px] leading-none font-semibold text-text-primary sm:text-[32px]">Admin</h1>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-text-secondary">
                <span>@{me.username}</span>
                <RolePill role={me.role} />
                {status && (
                  <span className="nx-chip" data-tone={status.private ? 'warning' : 'success'}>
                    <span className={cn('size-1.5 rounded-full', status.private ? 'bg-state-warning' : 'bg-state-success')} />
                    {status.private ? 'Private — coming soon' : 'Public'}
                  </span>
                )}
              </p>
            </div>
          </div>
          {me.isOwner && (
            <button
              type="button"
              className="nx-btn"
              onClick={() => {
                setPreviewAsMember(!previewAsMember)
                navigate('/hub')
              }}
            >
              <Icon name="eye" /> View as member
            </button>
          )}
        </div>
      </header>

      {visible.length === 0 ? (
        <div className="nx-panel">
          <Failed message="Your permissions don't include any admin sections yet." />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[236px_minmax(0,1fr)]">
          {/* ── sidebar ── */}
          <nav aria-label="Admin sections" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
            {/* phones / tablets: one scrollable row */}
            <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden">
              {visible.map((s) => (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => go(s.id)}
                    aria-current={s.id === current?.id ? 'page' : undefined}
                    className={cn(
                      'flex h-9 cursor-pointer items-center gap-2 rounded-full px-3.5 text-[13px] font-medium transition-colors',
                      s.id === current?.id
                        ? 'bg-[color-mix(in_oklab,var(--nx-b1)_14%,transparent)] text-text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--nx-b1)_35%,transparent)]'
                        : 'text-text-secondary shadow-[inset_0_0_0_1px_var(--nx-hair)]',
                    )}
                  >
                    <Icon name={s.icon} className="size-4" />
                    {s.label}
                    {s.id === 'moderation' && !!me.counts.openReports && <span className="nx-chip !h-4.5 !px-1.5 nx-num" data-tone="warning">{me.counts.openReports}</span>}
                  </button>
                </li>
              ))}
            </ul>
            {/* desktop: grouped rail */}
            <div className="nx-panel hidden p-2 lg:block">
              {GROUPS.map((g) => {
                const items = g.items.filter((s) => can(s.perm))
                if (!items.length) return null
                return (
                  <div key={g.label} className="py-1.5 first:pt-1">
                    <p className="px-2.5 pb-1.5 text-[10.5px] font-semibold tracking-[0.14em] text-text-muted uppercase">{g.label}</p>
                    {items.map((s) => {
                      const on = s.id === current?.id
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => go(s.id)}
                          aria-current={on ? 'page' : undefined}
                          className={cn(
                            'relative flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors',
                            on ? 'bg-[color-mix(in_oklab,var(--nx-b1)_10%,transparent)] text-text-primary' : 'text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary',
                          )}
                        >
                          {on && <span aria-hidden="true" className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-[linear-gradient(180deg,var(--nx-b1),var(--nx-b2),var(--nx-b3))]" />}
                          <Icon name={s.icon} className={cn('size-4 shrink-0', on ? 'text-[var(--nx-b1)]' : 'text-text-muted')} />
                          <span className="flex-1">{s.label}</span>
                          {s.id === 'moderation' && !!me.counts.openReports && (
                            <span className="nx-chip nx-num !h-5 !px-1.5" data-tone="warning">
                              {me.counts.openReports}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
              {me.isOwner && (
                <div className="mx-1 mt-2 mb-1 rounded-xl bg-[linear-gradient(160deg,color-mix(in_oklab,#f5c451_14%,transparent),transparent_70%)] p-3 shadow-[inset_0_0_0_1px_color-mix(in_oklab,#e09a1a_25%,transparent)]">
                  <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--nx-gold)]">
                    <Icon name="crown" className="size-3.5" /> Owner
                  </p>
                  <p className="mt-1 text-[11.5px] leading-snug text-text-secondary">Untouchable, sees every section, makes admins and grants site settings.</p>
                </div>
              )}
            </div>
          </nav>

          {/* ── section ── */}
          <div className="min-w-0">
            {current && (
              <div className="mb-4 hidden sm:block">
                <h2 className="nx-display text-[22px] leading-tight font-semibold text-text-primary">{current.title}</h2>
                <p className="mt-1 text-[13px] text-text-secondary">{current.blurb}</p>
              </div>
            )}
            {current?.id === 'overview' && <OverviewSection key={revision} onOpenUser={setUser} />}
            {current?.id === 'users' && <UsersSection onOpenUser={setUser} revision={revision} />}
            {current?.id === 'site' && <SiteSettingsPanel />}
            {current?.id === 'ai' && <AiSection />}
            {current?.id === 'sources' && <SourcesSection />}
            {current?.id === 'announcements' && <AnnouncementsPanel me={me} />}
            {current?.id === 'moderation' && <ModerationSection me={me} onOpenUser={setUser} onChanged={refetch} />}
            {current?.id === 'audit' && <AuditSection me={me} />}
          </div>
        </div>
      )}

      {can('users.view') && <UserDrawer username={openUser} me={me} onClose={() => setUser(null)} onChanged={changed} />}
    </div>
  )
}
