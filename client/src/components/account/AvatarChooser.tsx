import { useRef, useState } from 'react'
import { ImageUp, Loader2, Trash2 } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { type AvatarId } from '@/lib/avatar'
import { AvatarPicker } from './AvatarPicker'

/**
 * Choosing your picture: upload a photo, or pick one of the avatar set.
 * Used by Edit profile and by "Make it yours" after sign-up. Nothing is saved
 * here: a photo is stored as soon as it is chosen (POST /api/user/avatar with
 * stage: true), but it only becomes your picture when the form around it is
 * saved (PUT /api/profiles/me { avatar, avatar_url }).
 */

export interface Picture {
  avatar: AvatarId
  /** An uploaded photo; it shows instead of the avatar while set. */
  photo: string | null
}

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the image file'))
    reader.readAsDataURL(file)
  })
}

export function AvatarChooser({
  username,
  value,
  onChange,
  onBusy,
}: {
  username: string
  value: Picture
  onChange: (next: Picture) => void
  /** Told while a photo uploads, so the form can wait before saving. */
  onBusy?: (busy: boolean) => void
}) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const pick = async (file: File | undefined) => {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) return toast.error('That file type does not work', 'Use a PNG, JPG or WebP picture.')
    if (file.size > MAX_BYTES) return toast.error('That picture is too big', 'Use one under 2 MB.')
    setUploading(true)
    onBusy?.(true)
    try {
      const r = await api.post<{ ok: boolean; avatar_url?: string }>('/api/user/avatar', { username, image: await readAsDataUrl(file), stage: true })
      if (!r?.avatar_url) throw new Error('The upload did not finish')
      onChange({ ...value, photo: r.avatar_url })
    } catch (err) {
      toast.error('Could not upload the photo', err instanceof Error ? err.message : undefined)
    } finally {
      setUploading(false)
      onBusy?.(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => input.current?.click()}>
          {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ImageUp aria-hidden="true" />}
          {uploading ? 'Uploading…' : value.photo ? 'Use another photo' : 'Upload a photo'}
        </Button>
        {value.photo && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...value, photo: null })}>
            <Trash2 aria-hidden="true" /> Remove photo
          </Button>
        )}
        <span className="text-xs text-text-muted">PNG, JPG or WebP, up to 2 MB.</span>
      </div>
      <input ref={input} type="file" accept={ACCEPTED.join(',')} hidden aria-label="Choose a photo" onChange={(e) => void pick(e.target.files?.[0])} />
      <p className="text-xs text-text-secondary" aria-live="polite">
        {value.photo ? 'Your photo shows. Pick an avatar below to use it instead.' : 'Or pick an avatar. Arrow keys move through them.'}
      </p>
      <AvatarPicker value={value.photo ? null : value.avatar} onChange={(id) => onChange({ avatar: id, photo: null })} />
    </div>
  )
}
