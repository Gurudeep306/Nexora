import { useState, type FormEvent } from 'react'
import { UserRound } from 'lucide-react'
import { Button, Card, CardContent, Field, Input, Textarea, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { SettingsSection } from './SettingsPrimitives'
import type { ProfileUser, UpdateProfileResponse } from './types'

export function ProfileForm({ user }: { user: ProfileUser }) {
  const { refresh } = useAuth()
  const toast = useToast()

  const [displayName, setDisplayName] = useState(user.display_name ?? '')
  const [newUsername, setNewUsername] = useState(user.username)
  const [bio, setBio] = useState(user.bio ?? '')
  const [saving, setSaving] = useState(false)
  const [usernameError, setUsernameError] = useState<string | undefined>()

  const usernameChanged = newUsername.trim() !== user.username

  const checkUsername = async (name: string): Promise<boolean> => {
    if (name === user.username) return true
    if (!/^[a-zA-Z0-9_]{2,20}$/.test(name)) {
      setUsernameError('2–20 characters: letters, numbers and underscores only.')
      return false
    }
    try {
      const res = await api.get<{ ok: boolean; available: boolean }>('/api/user/check-username', {
        query: { username: name },
      })
      if (!res.available) {
        setUsernameError('That username is taken.')
        return false
      }
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : 'Could not verify username')
      return false
    }
    setUsernameError(undefined)
    return true
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (usernameChanged && !(await checkUsername(newUsername.trim()))) return
    setSaving(true)
    try {
      const res = await api.put<UpdateProfileResponse>('/api/user/profile', {
        currentUsername: user.username,
        newUsername: usernameChanged ? newUsername.trim() : undefined,
        displayName: displayName.trim(),
        bio: bio.trim(),
      })
      if (!res?.ok) throw new Error('Update rejected by server')
      await refresh()
      toast.success(
        'Profile updated',
        res.usernameChanged ? `You are now @${newUsername.trim()}.` : undefined,
      )
    } catch (err) {
      toast.error('Could not save profile', err instanceof Error ? err.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="py-5">
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <SettingsSection
            title="Identity"
            description="How other players see you in the arena."
            icon={<UserRound />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name" hint="Shown on your profile and leaderboards.">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={40}
                  placeholder={user.username}
                  autoComplete="nickname"
                />
              </Field>
              <Field
                label="Username"
                error={usernameError}
                hint={
                  usernameChanged
                    ? 'Renaming updates friends, messages and feed history.'
                    : 'Your unique handle — changing it is permanent-ish.'
                }
              >
                <Input
                  value={newUsername}
                  onChange={(e) => {
                    setNewUsername(e.target.value)
                    setUsernameError(undefined)
                  }}
                  onBlur={() => {
                    if (usernameChanged) void checkUsername(newUsername.trim())
                  }}
                  aria-invalid={!!usernameError}
                  autoComplete="username"
                />
              </Field>
            </div>
            <Field label="Bio" hint={`${bio.length}/280 characters`}>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 280))}
                rows={3}
                placeholder="Tell the arena who you are…"
              />
            </Field>
          </SettingsSection>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={saving} disabled={saving}>
              Save profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
