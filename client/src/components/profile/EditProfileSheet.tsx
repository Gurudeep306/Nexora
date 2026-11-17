import { useRef, useState } from 'react'
import { Check, Globe2, ImagePlus, Loader2, Lock, MapPin, Plus, X } from 'lucide-react'
import { Avatar, Button, Input, Modal, Textarea, useToast } from '@/components/ui'
import { UserBadges } from '@/components/shared/UserBadges'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { errorText, uploadImage } from '@/components/social/feed/lib'
import { RichText } from '@/components/social/feed/RichText'
import type { AccentKey, ProfileLink, PublicProfile } from '@/components/social/feed/types'
import { ACCENTS, COVERS, COVER_IDS, CoverArt, CoverCredit, coverId } from './covers'
import { AvatarChooser, type Picture } from '@/components/account/AvatarChooser'
import { formatAvatar, resolveAvatarId } from '@/lib/avatar'
import { useAuth } from '@/context/AuthContext'

type Draft = Pick<PublicProfile, 'display_name' | 'bio' | 'pronouns' | 'location' | 'website' | 'links' | 'cover' | 'accent' | 'visibility'>

/** "Edit profile" sheet with a live preview of the header. */
export default function EditProfileSheet({ open, onClose, profile, onSaved }: { open: boolean; onClose: () => void; profile: PublicProfile; onSaved: () => void }) {
  const toast = useToast()
  const [d, setD] = useState<Draft>({
    display_name: profile.display_name ?? '',
    bio: profile.bio,
    pronouns: profile.pronouns,
    location: profile.location,
    website: profile.website,
    links: profile.links.length ? profile.links : [],
    cover: profile.cover?.startsWith('/uploads/') ? profile.cover : coverId(profile.cover ?? 'plain'),
    accent: profile.accent,
    visibility: profile.visibility,
  })
  const { refresh } = useAuth()
  const startPicture: Picture = { avatar: resolveAvatarId(profile.avatar, profile.username), photo: profile.avatar_url || null }
  const [pic, setPic] = useState<Picture>(startPicture)
  const [picBusy, setPicBusy] = useState(false)
  const picChanged = pic.avatar !== startPicture.avatar || pic.photo !== startPicture.photo
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((cur) => ({ ...cur, [k]: v }))

  const save = async () => {
    setBusy(true)
    try {
      await api.put('/api/profiles/me', {
        ...d,
        links: d.links.filter((l) => l.url.trim()),
        ...(picChanged ? { avatar: formatAvatar(pic.avatar), avatar_url: pic.photo ?? '' } : {}),
      })
      // The top bar and menus show the new picture straight away.
      if (picChanged) await refresh()
      toast.success('Profile updated')
      onSaved()
      onClose()
    } catch (e) {
      toast.error('Could not save', errorText(e))
    } finally {
      setBusy(false)
    }
  }
  const upload = async (f: File | undefined) => {
    if (!f) return
    setUploading(true)
    try {
      set('cover', await uploadImage(f))
    } catch (e) {
      toast.error('Upload failed', e instanceof Error ? e.message : errorText(e))
    } finally {
      setUploading(false)
    }
  }
  const name = d.display_name || profile.username
  const accent = ACCENTS[d.accent]?.color ?? ACCENTS.brand.color

  return (
    <Modal open={open} onClose={onClose} title="Edit profile" size="xl">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Form */}
        <div className="order-2 space-y-5 lg:order-1">
          <Group title="Picture">
            <AvatarChooser username={profile.username} value={pic} onChange={setPic} onBusy={setPicBusy} />
          </Group>

          <Group title="Cover">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {COVER_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => set('cover', id)}
                  aria-pressed={d.cover === id}
                  aria-label={`${COVERS[id].label} cover`}
                  className={cn('relative h-14 cursor-pointer overflow-hidden rounded-lg border-2 transition-transform hover:scale-[1.03]', d.cover === id ? 'border-accent-brand' : 'border-transparent')}
                >
                  <CoverArt cover={id} seed={profile.username} accent={d.accent} className="!absolute inset-0" still />
                  <span className="absolute bottom-1 left-1 rounded-[3px] border border-border bg-bg-surface px-1 text-[10px] leading-4 font-semibold text-text-primary">{COVERS[id].label}</span>
                  {d.cover === id && <Check className="absolute top-1 right-1 size-4 rounded-full bg-bg-surface p-0.5 text-text-primary" />}
                </button>
              ))}
            </div>
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => void upload(e.target.files?.[0]).then(() => (e.target.value = ''))} />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <Button variant="subtle" size="sm" onClick={() => file.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} Upload your own
              </Button>
              <CoverCredit />
            </div>
          </Group>

          <Group title="Accent">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Accent colour">
              {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={d.accent === k}
                  aria-label={ACCENTS[k].label}
                  onClick={() => set('accent', k)}
                  className={cn('grid size-9 cursor-pointer place-items-center rounded-full border-2 transition-transform hover:scale-110', d.accent === k ? 'border-text-primary' : 'border-transparent')}
                  style={{ background: ACCENTS[k].color }}
                >
                  {d.accent === k && <Check className="size-4 text-on-accent-brand" />}
                </button>
              ))}
            </div>
          </Group>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name">
              <Input value={d.display_name ?? ''} maxLength={40} onChange={(e) => set('display_name', e.target.value)} placeholder={profile.username} />
            </Field>
            <Field label="Pronouns" hint="Optional">
              <Input value={d.pronouns} maxLength={24} onChange={(e) => set('pronouns', e.target.value)} placeholder="she/her, they/them…" />
            </Field>
          </div>
          <Field label="Bio" hint={`${d.bio.length}/280 · **bold**, links and #tags work`}>
            <Textarea value={d.bio} maxLength={280} rows={3} onChange={(e) => set('bio', e.target.value)} placeholder="What are you learning? What are you proud of?" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Location">
              <Input value={d.location} maxLength={60} onChange={(e) => set('location', e.target.value)} placeholder="City, campus…" />
            </Field>
            <Field label="Website">
              <Input value={d.website} maxLength={200} onChange={(e) => set('website', e.target.value)} placeholder="yoursite.dev" inputMode="url" />
            </Field>
          </div>
          <Group title="Links">
            <div className="space-y-2">
              {d.links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <Input aria-label="Link label" value={l.label} maxLength={24} placeholder="GitHub" className="w-32" onChange={(e) => set('links', d.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <Input aria-label="Link URL" value={l.url} maxLength={200} placeholder="https://…" inputMode="url" onChange={(e) => set('links', d.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                  <Button variant="ghost" size="icon" aria-label="Remove link" onClick={() => set('links', d.links.filter((_, j) => j !== i))}>
                    <X />
                  </Button>
                </div>
              ))}
              {d.links.length < 4 && (
                <Button variant="ghost" size="sm" onClick={() => set('links', [...d.links, { label: '', url: '' } as ProfileLink])}>
                  <Plus /> Add link
                </Button>
              )}
            </div>
          </Group>
          <Group title="Privacy">
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Profile visibility">
              {(
                [
                  ['public', Globe2, 'Public', 'Anyone can see your posts and stats.'],
                  ['followers', Lock, 'Followers only', 'You approve followers; others see your header only.'],
                ] as const
              ).map(([v, Ico, t, s]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={d.visibility === v}
                  onClick={() => set('visibility', v)}
                  className={cn('flex cursor-pointer gap-3 rounded-xl border p-3 text-left transition-colors', d.visibility === v ? 'border-accent-brand/50 bg-accent-brand/8' : 'border-border hover:border-border-strong')}
                >
                  <Ico className={cn('mt-0.5 size-4 shrink-0', d.visibility === v ? 'text-accent-brand' : 'text-text-muted')} />
                  <span>
                    <span className="block text-sm font-medium text-text-primary">{t}</span>
                    <span className="block text-xs text-text-secondary">{s}</span>
                  </span>
                </button>
              ))}
            </div>
          </Group>
        </div>

        {/* Live preview */}
        <div className="order-1 lg:order-2">
          <p className="mb-2 text-[11px] font-semibold tracking-wider text-text-muted uppercase">Live preview</p>
          <div className="sticky top-0 overflow-hidden rounded-2xl border border-border bg-bg-surface">
            <CoverArt cover={d.cover} seed={profile.username} accent={d.accent} className="h-24" />
            <div className="px-4 pb-4">
              <div className="-mt-8 inline-flex rounded-full p-[3px]" style={{ background: accent }}>
                <Avatar seed={profile.username} avatar={formatAvatar(pic.avatar)} src={pic.photo} name={name} size="xl" ring={false} className="rounded-full ring-2 ring-bg-surface" />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="font-display text-base font-semibold text-text-primary">{name}</span>
                <UserBadges username={profile.username} role={profile.role} verified={profile.verified} />
                {d.pronouns && <span className="text-xs text-text-muted">{d.pronouns}</span>}
              </div>
              <p className="text-xs text-text-muted">@{profile.username}</p>
              {d.bio && <RichText text={d.bio} className="mt-2 space-y-1 text-sm text-text-secondary" />}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
                {d.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" /> {d.location}
                  </span>
                )}
                {d.website && <span style={{ color: accent }}>{d.website.replace(/^https?:\/\//, '')}</span>}
                {d.visibility === 'followers' && (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="size-3" /> Followers only
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 -mx-5 mt-5 -mb-4 flex justify-end gap-2 border-t border-border bg-bg-surface/95 px-5 py-3 backdrop-blur">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => void save()} loading={busy} disabled={picBusy}>
          Save profile
        </Button>
      </div>
    </Modal>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-text-primary">{title}</legend>
      {children}
    </fieldset>
  )
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-text-primary">
        {label}
        {hint && <span className="text-xs font-normal text-text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  )
}
