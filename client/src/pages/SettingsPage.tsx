import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Link2, PanelBottom, SlidersHorizontal, TriangleAlert, UserRound } from 'lucide-react'
import { Button, Card, CardContent, ErrorState, LoadingBlock, PageHeader, Tabs, buttonVariants } from '@/components/ui'
import { DockEditor } from '@/components/layout/DockEditor'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/context/AuthContext'
import { ProfileForm } from '@/components/account/ProfileForm'
import { AvatarCard } from '@/components/account/AvatarCard'
import { PasswordForm } from '@/components/account/PasswordForm'
import { HandlesForm } from '@/components/account/HandlesForm'
import { PreferencesForm } from '@/components/account/PreferencesForm'
import { DangerZone } from '@/components/account/DangerZone'
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

const TABS = [
  { id: 'account', label: 'Account', icon: <UserRound className="size-3.5" aria-hidden="true" /> },
  { id: 'platform', label: 'Platforms', icon: <Link2 className="size-3.5" aria-hidden="true" /> },
  {
    id: 'prefs',
    label: 'Preferences',
    icon: <SlidersHorizontal className="size-3.5" aria-hidden="true" />,
  },
  {
    id: 'danger',
    label: 'Danger zone',
    icon: <TriangleAlert className="size-3.5" aria-hidden="true" />,
  },
]

export default function SettingsPage() {
  const { user } = useAuth()
  // The tab lives in the URL (?tab=prefs), so other pages can
  // deep-link here and the tab survives a reload.
  const [params, setParams] = useSearchParams()
  const linked = params.get('tab')
  const tab = linked && TABS.some((t) => t.id === linked) ? linked : 'account'
  const setTab = (id: string) => setParams(id === 'account' ? {} : { tab: id }, { replace: true })

  const settingsApi = useApi<SettingsResponse>(() => api.get<SettingsResponse>('/api/settings'), [])
  /* Envelope exception: /api/languages returns a bare array */
  const languagesApi = useApi<LanguageOption[]>(
    () => api.get<LanguageOption[]>('/api/languages'),
    [],
  )

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
      created_at: str(user.created_at) ?? new Date().toISOString(),
    }
  }, [user])

  const settings = settingsApi.data?.settings ?? {}
  const languages = languagesApi.data ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Tune your identity, platform links, editor behaviour, the Dock and account safety."
      />

      <Tabs items={TABS} active={tab} onChange={setTab} variant="pills" />

      {settingsApi.error ? (
        <div className="card-neon">
          <ErrorState message={settingsApi.error} onRetry={settingsApi.refetch} />
        </div>
      ) : settingsApi.loading || !profileUser ? (
        <LoadingBlock rows={6} />
      ) : (
        <motion.div
          key={tab}
          className="space-y-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
        >
          {tab === 'account' && (
            <>
              <AvatarCard user={profileUser} />
              <ProfileForm user={profileUser} />
              <PasswordForm user={profileUser} />
            </>
          )}
          {tab === 'platform' && (
            <HandlesForm
              settings={settings}
              languages={languages}
              onSaved={settingsApi.refetch}
            />
          )}
          {tab === 'prefs' && (
            <>
              <PreferencesForm settings={settings} onSaved={settingsApi.refetch} />
              <DockSettings />
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="mb-0 text-sm font-semibold text-text-primary">Theme, fonts, icons and cards</p>
                    <p className="mb-0 text-[12.5px] text-text-muted">All appearance options live in the Theme Centre.</p>
                  </div>
                  <Link to="/theme" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                    Open Theme Centre
                  </Link>
                </CardContent>
              </Card>
            </>
          )}
          {tab === 'danger' && <DangerZone settings={settings} />}
        </motion.div>
      )}
    </div>
  )
}
