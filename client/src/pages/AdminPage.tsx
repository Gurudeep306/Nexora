import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import '@/components/site/brand.css'
import '@/components/admin/desk.css'
import { Icon, type IconName } from '@/components/icon/Icon'
import { MarkLoader } from '@/components/brand/Logo'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { refreshBadges } from '@/lib/badges'
import { useSite } from '@/context/SiteContext'
import { Failed } from '@/components/admin/kit'
import { deskSentence, toRoman } from '@/components/admin/desk'
import type { Overview } from '@/components/admin/types'
import { OverviewSection } from '@/components/admin/OverviewSection'
import { UsersSection } from '@/components/admin/UsersSection'
import { UserDrawer } from '@/components/admin/UserDrawer'
import { AnnouncementsPanel, SiteSettingsPanel } from '@/components/admin/SiteSection'
import { ModerationSection } from '@/components/admin/ModerationSection'
import { AuditSection } from '@/components/admin/AuditSection'
import { SourcesSection } from '@/components/admin/SourcesSection'
import { AiSection } from '@/components/admin/AiSection'
import { DefaultStylePanel } from '@/components/admin/DefaultStylePanel'
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
  // The header's live sentence reads the same overview the front page shows (one shared request).
  const canInsights = !!me && (me.isOwner || me.permissions.includes('analytics.view'))
  const { data: overview } = useApi(() => (canInsights ? api.get<Overview>('/api/admin/overview') : Promise.resolve(null)), [canInsights], { cacheKey: canInsights ? 'admin:overview' : undefined })

  if (loading && !me) {
    return (
      <div className="desk grid min-h-[50vh] place-items-center">
        <MarkLoader label="Opening the editor's desk" />
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

  const sentence = deskSentence({ overview: overview ?? null, openReports: me.counts.openReports })
  const numberOf = (id: SectionId) => toRoman(visible.findIndex((s) => s.id === id) + 1)

  return (
    <div className="desk pb-12">
      {/* ── the desk's masthead: one live sentence, the site's state as an ink label ── */}
      <header className="desk-head">
        <div className="min-w-0">
          <p className="ed-label desk-kicker">
            The editor&rsquo;s desk
            {status && (
              <span className="desk-state" data-state={status.private ? 'private' : 'public'}>
                {status.private ? 'Private · coming soon' : 'Public'}
              </span>
            )}
          </p>
          <h1 className="ed-title desk-title">Admin</h1>
          {sentence && <p className="ed-lead desk-lead">{sentence}</p>}
          <p className="desk-meta">
            @{me.username} · {me.role}
            {me.isOwner && ' · sees every section'}
          </p>
        </div>
        {me.isOwner && (
          <button
            type="button"
            className="ed-btn ed-btn-outline desk-preview"
            onClick={() => {
              setPreviewAsMember(!previewAsMember)
              navigate('/hub')
            }}
          >
            <Icon name="eye" /> View as member
          </button>
        )}
      </header>

      {visible.length === 0 ? (
        <Failed message="Your permissions don't include any admin sections yet." />
      ) : (
        <div className="desk-grid">
          {/* ── contents: roman numerals, serif names, an ink tick on the current one ── */}
          <nav aria-label="Admin sections" className="desk-toc">
            {/* phones and tablets: one scrollable row of underlined words */}
            <ul className="desk-toc-row">
              {visible.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => go(s.id)} aria-current={s.id === current?.id ? 'page' : undefined} className="desk-toc-tab">
                    {s.label}
                    {s.id === 'moderation' && !!me.counts.openReports && <span className="desk-count">{me.counts.openReports}</span>}
                  </button>
                </li>
              ))}
            </ul>
            {/* desktop: a table of contents */}
            <div className="desk-toc-book">
              <p className="ed-label desk-toc-label">Contents</p>
              {GROUPS.map((g) => {
                const items = g.items.filter((s) => can(s.perm))
                if (!items.length) return null
                return (
                  <div key={g.label} className="desk-toc-group">
                    <p className="desk-toc-part">{g.label}</p>
                    <ol>
                      {items.map((s) => {
                        const on = s.id === current?.id
                        return (
                          <li key={s.id}>
                            <button type="button" onClick={() => go(s.id)} aria-current={on ? 'page' : undefined} className="desk-toc-item">
                              <span className="desk-toc-num" aria-hidden="true">
                                {numberOf(s.id)}
                              </span>
                              <span className="desk-toc-name">{s.label}</span>
                              {s.id === 'moderation' && !!me.counts.openReports && (
                                <span className="desk-count" aria-label={`${me.counts.openReports} open`}>
                                  {me.counts.openReports}
                                </span>
                              )}
                            </button>
                          </li>
                        )
                      })}
                    </ol>
                  </div>
                )
              })}
              {me.isOwner && <p className="desk-toc-note">As the owner you can&rsquo;t be banned or demoted, you see every section, and only you make admins or grant site settings.</p>}
            </div>
          </nav>

          {/* ── the section ── */}
          <div className="min-w-0">
            {current && (
              <div className="desk-section-head">
                <p className="ed-label">Section {numberOf(current.id)}</p>
                <h2 className="ed-h2 desk-section-title">{current.title}</h2>
                <p className="ed-body-sm desk-section-blurb">{current.blurb}</p>
              </div>
            )}
            {current?.id === 'overview' && <OverviewSection key={revision} onOpenUser={setUser} />}
            {current?.id === 'users' && <UsersSection onOpenUser={setUser} revision={revision} />}
            {current?.id === 'site' && (
              <div className="space-y-6">
                <SiteSettingsPanel />
                <DefaultStylePanel />
              </div>
            )}
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
