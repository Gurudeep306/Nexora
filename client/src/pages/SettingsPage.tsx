import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Link2, SlidersHorizontal, TriangleAlert, UserRound } from 'lucide-react'
import { ErrorState, LoadingBlock, PageHeader, Tabs } from '@/components/ui'
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
  const [tab, setTab] = useState('account')

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
        subtitle="Tune your identity, platform links, editor behaviour and account safety."
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
          {tab === 'prefs' && <PreferencesForm settings={settings} onSaved={settingsApi.refetch} />}
          {tab === 'danger' && <DangerZone settings={settings} />}
        </motion.div>
      )}
    </div>
  )
}
