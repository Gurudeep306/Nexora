import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { Button, Card, CardContent, Field, Input, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { SettingsSection } from './SettingsPrimitives'
import type { ProfileUser, UpdateProfileResponse } from './types'

export function PasswordForm({ user }: { user: ProfileUser }) {
  const { refresh } = useAuth()
  const toast = useToast()
  const hasPassword = user.auth_provider === 'manual'

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(undefined)
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('New passwords do not match.')
      return
    }
    setSaving(true)
    try {
      const res = await api.put<UpdateProfileResponse & { error?: string }>('/api/user/profile', {
        currentUsername: user.username,
        password,
        currentPassword: currentPassword || undefined,
      })
      if (!res?.ok) throw new Error('Password change rejected')
      await refresh()
      setCurrentPassword('')
      setPassword('')
      setConfirm('')
      toast.success('Password updated')
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined
      setError(message)
      toast.error('Could not change password', message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="py-5">
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <SettingsSection
            title="Password"
            description={
              hasPassword
                ? 'Confirm with your current password to set a new one.'
                : 'Your account was created via OAuth — set a password to enable direct login.'
            }
            icon={<KeyRound />}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {hasPassword && (
                <Field label="Current password">
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </Field>
              )}
              <Field label="New password" error={error} hint="Minimum 6 characters — 8+ with a number and symbol is best.">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={!!error}
                />
              </Field>
              <Field label="Confirm new password">
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
            </div>
          </SettingsSection>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={saving} disabled={saving}>
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
