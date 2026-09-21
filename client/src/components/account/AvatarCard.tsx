import { useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Check, Dices, ImageUp, Sparkles, Trash2 } from 'lucide-react'
import { Avatar, Button, Card, CardContent, useToast } from '@/components/ui'
import {
  AVATAR_STYLES,
  AVATAR_STYLE_LABELS,
  avatarDataUrl,
  formatAvatar,
  parseAvatar,
  type AvatarSpec,
} from '@/lib/avatar'
import { cn } from '@/lib/utils'
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

  const current = parseAvatar(user.avatar, user.username)
  const [draft, setDraft] = useState<AvatarSpec>(current)
  const [saving, setSaving] = useState(false)
  // A page of variants for the chosen style; "Shuffle" jumps to a fresh page.
  const [page, setPage] = useState(0)
  const variants = useMemo(
    () => Array.from({ length: 8 }, (_, i) => page * 8 + i),
    [page],
  )
  const dirty = formatAvatar(draft) !== formatAvatar(current) || !!user.avatar_url

  const saveGenerated = async () => {
    setSaving(true)
    try {
      await api.put<UpdateProfileResponse>('/api/user/profile', {
        currentUsername: user.username,
        avatar: formatAvatar(draft),
        avatarUrl: '',
      })
      await refresh()
      toast.success('Avatar updated', 'Your new look is live across Nexora.')
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
          title="Avatar studio"
          description="Every coder gets a unique generated avatar. Pick a style, shuffle until it feels like you — or upload a photo."
          icon={<Sparkles />}
        >
          <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
            {/* Preview */}
            <div className="flex flex-col items-center gap-3">
              <motion.div
                key={user.avatar_url ? 'upload' : formatAvatar(draft)}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                className="relative"
              >
                <span
                  className="absolute -inset-1.5 rounded-full bg-[conic-gradient(var(--color-primary),var(--color-accent),var(--color-cyan),var(--color-primary))] opacity-60 blur-[3px]"
                  aria-hidden="true"
                />
                <Avatar
                  seed={user.username}
                  avatar={formatAvatar(draft)}
                  src={user.avatar_url}
                  name={user.display_name || user.username}
                  size="2xl"
                  className="relative"
                />
              </motion.div>
              <p className="text-[11px] tracking-wider text-foreground-faint uppercase">
                {user.avatar_url ? 'Uploaded photo' : `${AVATAR_STYLE_LABELS[draft.style]} · #${draft.variant}`}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" loading={uploading} onClick={() => inputRef.current?.click()}>
                  {!uploading && <ImageUp aria-hidden="true" />} Upload photo
                </Button>
                {user.avatar_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={removing}
                    onClick={() => void onRemove()}
                    className="hover:text-destructive"
                  >
                    {!removing && <Trash2 aria-hidden="true" />} Remove photo
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

            {/* Generator */}
            <div className="min-w-0 space-y-4">
              <div role="radiogroup" aria-label="Avatar style" className="flex flex-wrap gap-2">
                {AVATAR_STYLES.map((style) => (
                  <button
                    key={style}
                    role="radio"
                    aria-checked={draft.style === style}
                    onClick={() => {
                      setDraft({ style, variant: draft.variant })
                    }}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                      draft.style === style
                        ? 'border-primary bg-primary/15 text-primary-bright'
                        : 'border-border bg-surface-2/50 text-foreground-dim hover:border-primary/50 hover:text-foreground',
                    )}
                  >
                    <img
                      src={avatarDataUrl(user.username, { style, variant: draft.variant })}
                      alt=""
                      className="size-5 rounded-full"
                    />
                    {AVATAR_STYLE_LABELS[style]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
                {variants.map((v) => {
                  const spec = { style: draft.style, variant: v }
                  const selected = draft.variant === v
                  return (
                    <button
                      key={v}
                      onClick={() => setDraft(spec)}
                      aria-label={`Variant ${v}`}
                      aria-pressed={selected}
                      className={cn(
                        'relative aspect-square cursor-pointer rounded-full p-0.5 transition-transform hover:scale-105',
                        selected ? 'ring-2 ring-primary-bright ring-offset-2 ring-offset-surface' : 'ring-1 ring-border',
                      )}
                    >
                      <img src={avatarDataUrl(user.username, spec)} alt="" className="size-full rounded-full" />
                      {selected && (
                        <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-primary text-on-primary">
                          <Check className="size-3" aria-hidden="true" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => {
                    const next = page + 1 + Math.floor(Math.random() * 50)
                    setPage(next)
                    setDraft({ style: draft.style, variant: next * 8 + Math.floor(Math.random() * 8) })
                  }}
                >
                  <Dices aria-hidden="true" /> Shuffle
                </Button>
                <Button size="sm" loading={saving} disabled={!dirty} onClick={() => void saveGenerated()}>
                  {!saving && <Check aria-hidden="true" />} {user.avatar_url ? 'Use generated avatar' : 'Save avatar'}
                </Button>
                <p className="text-xs text-foreground-faint">Generated from your username — nobody else gets the same one.</p>
              </div>
            </div>
          </div>
        </SettingsSection>
      </CardContent>
    </Card>
  )
}
