import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Check, ImageUp, Sparkles, Trash2 } from 'lucide-react'
import { Avatar, Button, Card, CardContent, useToast } from '@/components/ui'
import { formatAvatar, resolveAvatarId, type AvatarId } from '@/lib/avatar'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { SettingsSection } from './SettingsPrimitives'
import { AvatarPicker } from './AvatarPicker'
import type { AvatarUploadResponse, ProfileUser, UpdateProfileResponse } from './types'

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the image file'))
    reader.readAsDataURL(file)
  })
}

export function AvatarCard({ user }: { user: ProfileUser }) {
  const { refresh } = useAuth()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [saving, setSaving] = useState(false)

  const current = resolveAvatarId(user.avatar, user.username)
  const [draft, setDraft] = useState<AvatarId>(current)
  const hasPhoto = !!user.avatar_url
  // With a photo up, the preview shows the photo until a set avatar is picked.
  const [picked, setPicked] = useState(false)
  const showPhoto = hasPhoto && !picked
  const dirty = draft !== current || (hasPhoto && picked)

  const onPick = async (file: File | undefined) => {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Unsupported image', 'Use a PNG, JPG or WebP file.')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image too large', 'Avatars are limited to 2 MB.')
      return
    }
    setUploading(true)
    try {
      const image = await readFileAsDataUrl(file)
      const res = await api.post<AvatarUploadResponse>('/api/user/avatar', {
        username: user.username,
        image,
      })
      if (!res?.ok || !res.avatar_url) throw new Error('Upload rejected by server')
      await refresh()
      setPicked(false)
      toast.success('Photo uploaded', 'It now shows everywhere on NexoraGuru.')
    } catch (err) {
      toast.error('Avatar upload failed', err instanceof Error ? err.message : undefined)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onRemove = async () => {
    setRemoving(true)
    try {
      await api.put<UpdateProfileResponse>('/api/user/profile', {
        currentUsername: user.username,
        avatarUrl: '',
      })
      await refresh()
      toast.success('Photo removed', 'Your avatar is back.')
    } catch (err) {
      toast.error('Could not remove photo', err instanceof Error ? err.message : undefined)
    } finally {
      setRemoving(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.put<UpdateProfileResponse>('/api/user/profile', {
        currentUsername: user.username,
        avatar: formatAvatar(draft),
        avatarUrl: '',
      })
      await refresh()
      setPicked(false)
      toast.success('Avatar updated', 'Your new avatar shows everywhere on NexoraGuru.')
    } catch (err) {
      toast.error('Could not save avatar', err instanceof Error ? err.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="py-5">
        <SettingsSection
          title="Avatar"
          description="Pick the character that feels like you, or upload a photo."
          icon={<Sparkles />}
        >
          <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
            {/* Preview */}
            <div className="flex flex-col items-center gap-3 lg:w-40">
              <motion.div
                key={showPhoto ? 'photo' : draft}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                className="relative"
              >
                <span
                  className="absolute -inset-2 rounded-full bg-[conic-gradient(var(--color-primary),var(--color-accent),var(--color-cyan),var(--color-primary))] opacity-40 blur-md"
                  aria-hidden="true"
                />
                <Avatar
                  seed={user.username}
                  avatar={formatAvatar(draft)}
                  src={showPhoto ? user.avatar_url : null}
                  name={user.display_name || user.username}
                  size="3xl"
                  className="relative"
                />
              </motion.div>
              <p className="text-sm font-semibold text-foreground" aria-live="polite">
                {showPhoto ? 'Your photo' : 'Your avatar'}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" loading={uploading} onClick={() => inputRef.current?.click()}>
                  {!uploading && <ImageUp aria-hidden="true" />} {hasPhoto ? 'New photo' : 'Upload photo'}
                </Button>
                {hasPhoto && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={removing}
                    onClick={() => void onRemove()}
                    className="hover:text-destructive"
                  >
                    {!removing && <Trash2 aria-hidden="true" />} Remove
                  </Button>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED.join(',')}
                className="hidden"
                aria-label="Choose avatar image"
                onChange={(e) => void onPick(e.target.files?.[0])}
              />
            </div>

            {/* Picker */}
            <div className="min-w-0 space-y-4">
              <AvatarPicker
                value={showPhoto ? null : draft}
                onChange={(id) => {
                  setDraft(id)
                  setPicked(true)
                }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" loading={saving} disabled={!dirty} onClick={() => void save()}>
                  {!saving && <Check aria-hidden="true" />} {hasPhoto ? 'Use this avatar' : 'Save avatar'}
                </Button>
                <p className="text-xs text-foreground-faint">
                  {hasPhoto ? 'Picking a character replaces your photo.' : 'Arrow keys move through the grid.'}
                </p>
              </div>
            </div>
          </div>
        </SettingsSection>
      </CardContent>
    </Card>
  )
}
