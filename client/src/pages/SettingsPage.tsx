import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PanelBottom } from 'lucide-react'
import { Button, Card, CardContent, ErrorState, LoadingBlock, PageHeader, buttonVariants } from '@/components/ui'
import '@/components/account/settings-book.css'
import { DockEditor } from '@/components/layout/DockEditor'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/context/AuthContext'
import { ProfileForm } from '@/components/account/ProfileForm'
import { PictureCard } from '@/components/account/PictureCard'
import { PasswordForm } from '@/components/account/PasswordForm'
import { HandlesForm } from '@/components/account/HandlesForm'
import { LinkedAccounts } from '@/components/account/LinkedAccounts'
import { PreferencesForm } from '@/components/account/PreferencesForm'
import { DangerZone } from '@/components/account/DangerZone'
import { VoiceSettings } from '@/voice/VoiceSettings'
import { TeacherSettings } from '@/voice/teacher/TeacherSettings'
import type { LanguageOption, ProfileUser, SettingsResponse } from '@/components/account/types'

/** Dock arrangement — a layout preference, so it lives with Preferences. */
function DockSettings() {
  const [open, setOpen] = useState(false)
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="mb-0 text-sm font-semibold text-text-primary">Dock</p>
          <p className="mb-0 text-[12.5px] text-text-muted">
            Choose and order the icons in the Dock and the phone tab bar. You can also right-click the Dock.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <PanelBottom aria-hidden="true" />
          Customize Dock…
        </Button>
        <DockEditor open={open} onClose={() => setOpen(false)} />
      </CardContent>
    </Card>
  )
}

const PARTS = [
  { id: 'account', label: 'Account', lead: 'Your picture, your name on the site and your password.' },
  { id: 'platform', label: 'Platforms', lead: 'Judge accounts you have verified, and the handles and languages Hive and the solver use.' },
  { id: 'prefs', label: 'Preferences', lead: 'How the editor behaves, the Dock, and the theme.' },
  { id: 'danger', label: 'Danger zone', lead: 'Sign out everywhere, download or delete your data.' },
] as const

const ROMAN = ['I', 'II', 'III', 'IV']

export default function SettingsPage() {
  const { user } = useAuth()
  // Every part is on one page, like a book; ?tab=prefs (links from other
  // pages) opens at that part. The contents follow the part you are reading.
  const [params, setParams] = useSearchParams()
  const linked = params.get('tab')
  const [current, setCurrent] = useState<string>(() => (linked && PARTS.some((t) => t.id === linked) ? linked : 'account'))
  const go = (id: string) => {
    setParams(id === 'account' ? {} : { tab: id }, { replace: true })
    document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }

  const settingsApi = useApi<SettingsResponse>(() => api.get<SettingsResponse>('/api/settings'), [])
  /* Envelope exception: /api/languages returns a bare array */
  const languagesApi = useApi<LanguageOption[]>(
    () => api.get<LanguageOption[]>('/api/languages'),
    [],
  )

  // A fallback join date for accounts without one, stamped once.
  const [nowIso] = useState(() => new Date().toISOString())
  const profileUser = useMemo<ProfileUser | null>(() => {
    if (!user) return null
    const str = (v: unknown) => (typeof v === 'string' ? v : null)
    return {
      username: user.username,
      display_name: str(user.display_name),
      avatar: str(user.avatar),
      avatar_url: str(user.avatar_url),
      bio: str(user.bio),
      status: str(user.status) ?? 'offline',
      role: str(user.role) ?? 'member',
      auth_provider: str(user.auth_provider) ?? 'manual',
      email: str(user.email),
      last_seen: str(user.last_seen),
      created_at: str(user.created_at) ?? nowIso,
    }
  }, [user, nowIso])

  const settings = settingsApi.data?.settings ?? {}
  const languages = languagesApi.data ?? []
  const ready = !settingsApi.error && !settingsApi.loading && !!profileUser

  // Open at the linked part once the forms are on the page.
  const [opened, setOpened] = useState(false)
  useEffect(() => {
    if (!ready || opened) return
    if (linked && linked !== 'account') document.getElementById(`settings-${linked}`)?.scrollIntoView({ block: 'start' })
    const t = window.setTimeout(() => setOpened(true), 0)
    return () => window.clearTimeout(t)
  }, [ready, opened, linked])

  // The contents' ink tick follows the part in the middle of the screen.
  useEffect(() => {
    if (!ready) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(e.target.id.replace('settings-', ''))
      },
      { rootMargin: '-35% 0px -60% 0px' },
    )
    for (const p of PARTS) {
      const el = document.getElementById(`settings-${p.id}`)
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [ready])

  const part = (id: (typeof PARTS)[number]['id']) => {
    const i = PARTS.findIndex((p) => p.id === id)
    const p = PARTS[i]
    return (
      <header className="sb-part-head">
        <p className="ed-label">Part {ROMAN[i]}</p>
        <h2 id={`settings-${p.id}-h`} className="ed-h2 sb-part-title">
          {p.label}
        </h2>
        <p className="ed-body-sm sb-part-lead">{p.lead}</p>
      </header>
    )
  }

  return (
    <div className="sb">
      <PageHeader title="Settings" subtitle="Your account, your platforms, how the site behaves, and the switches you rarely need." />

      <div className="sb-book">
        <nav aria-label="Settings contents" className="sb-toc">
          <p className="ed-label sb-toc-label">Contents</p>
          <ol>
            {PARTS.map((p, i) => (
              <li key={p.id}>
                <button type="button" onClick={() => go(p.id)} aria-current={current === p.id ? 'true' : undefined} className="sb-toc-item">
                  <span className="sb-toc-num" aria-hidden="true">
                    {ROMAN[i]}
                  </span>
                  <span className="sb-toc-name">{p.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0">
          {settingsApi.error ? (
            <ErrorState message={settingsApi.error} onRetry={settingsApi.refetch} />
          ) : !ready || !profileUser ? (
            <LoadingBlock rows={6} />
          ) : (
            <>
              <div id="settings-account" className="sb-part">
                {part('account')}
                <div className="sb-stack">
                  <PictureCard user={profileUser} />
                  <ProfileForm user={profileUser} />
                  <PasswordForm user={profileUser} />
                </div>
              </div>
              <div id="settings-platform" className="sb-part">
                {part('platform')}
                <div className="sb-stack">
                  <LinkedAccounts />
                  <HandlesForm settings={settings} languages={languages} onSaved={settingsApi.refetch} />
                </div>
              </div>
              <div id="settings-prefs" className="sb-part">
                {part('prefs')}
                <div className="sb-stack">
                  <PreferencesForm settings={settings} onSaved={settingsApi.refetch} />
                  <DockSettings />
                  <VoiceSettings />
                  <TeacherSettings />
                  <Card>
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                      <div>
                        <p className="mb-0 text-sm font-semibold text-text-primary">Theme</p>
                        <p className="mb-0 text-[12.5px] text-text-muted">Twelve themes, each with its own paper, type, drawings and icons, plus text size and code font.</p>
                      </div>
                      <Link to="/theme" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                        Open Appearance
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <div id="settings-danger" className="sb-part">
                {part('danger')}
                <div className="sb-stack">
                  <DangerZone settings={settings} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
