import { useRef, useState } from 'react'
import { ImageUp, Trash2 } from 'lucide-react'
import { Avatar, Button, Card, CardContent, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { SettingsSection } from './SettingsPrimitives'
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
      toast.success('Avatar updated', 'Looking sharp, commander.')
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
      toast.success('Avatar removed')
    } catch (err) {
      toast.error('Could not remove avatar', err instanceof Error ? err.message : undefined)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Card>
      <CardContent className="py-5">
        <SettingsSection
          title="Avatar"
          description="PNG, JPG or WebP up to 2 MB."
          icon={<ImageUp />}
        >
          <div className="flex flex-wrap items-center gap-4">
            <Avatar src={user.avatar_url} name={user.display_name || user.username} size="xl" />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                loading={uploading}
                onClick={() => inputRef.current?.click()}
              >
                {!uploading && <ImageUp aria-hidden="true" />} Upload image
              </Button>
              {user.avatar_url && (
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
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED.join(',')}
                className="hidden"
                aria-label="Choose avatar image"
                onChange={(e) => void onPick(e.target.files?.[0])}
              />
            </div>
          </div>
        </SettingsSection>
      </CardContent>
    </Card>
  )
}
