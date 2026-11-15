import { useState } from 'react'
import { cn } from '@/lib/utils'
import { assetUrl } from '@/lib/api'
import { avatarName, avatarSetUrl, isImageUrl, resolveAvatarId } from '@/lib/avatar'

const SIZES = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-14 w-14',
  '2xl': 'h-16 w-16',
  '3xl': 'h-24 w-24',
}

/**
 * User picture. Priority: uploaded photo (`src`, or an image URL passed as
 * `avatar`) → the user's chosen set avatar ("set:<id>") → the default set
 * avatar for their username (`seed`). Everyone always has a picture.
 */
export function Avatar({
  src,
  name,
  seed,
  avatar,
  size = 'md',
  className,
  ring = true,
  online,
}: {
  src?: string | null
  name?: string | null
  /** Stable identity the default avatar is picked from — pass the username. */
  seed?: string | null
  /** users.avatar value ("set:<id>"; anything else falls back to the default). */
  avatar?: string | null
  size?: keyof typeof SIZES
  className?: string
  ring?: boolean
  online?: boolean
}) {
  // If an uploaded photo fails to load (deleted file, offline CDN) fall back to the set avatar.
  const [failed, setFailed] = useState<string | null>(null)
  const photo = isImageUrl(src) ? src : isImageUrl(avatar) ? avatar : null
  const imgSrc = photo && failed !== photo ? assetUrl(photo) : null
  const id = resolveAvatarId(avatar, seed || name || '')
  // Someone who picked a set avatar keeps it; everyone else gets their initials.
  const chosen = /^set:[a-z]+$/.test(avatar ?? '')
  const label = (name || seed || '').trim()
  const initials =
    label
      .replace(/^@/, '')
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?'

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={name ?? 'avatar'}
          onError={() => setFailed(photo)}
          className={cn(
            SIZES[size],
            'rounded-full object-cover border border-border',
            ring && 'ring-2 ring-accent-brand/20',
          )}
        />
      ) : !chosen ? (
        <span
          role="img"
          aria-label={name ? `${name}` : 'avatar'}
          className={cn(
            SIZES[size],
            'flex items-center justify-center rounded-full bg-bg-surface-2 font-medium text-text-secondary select-none shadow-[inset_0_0_0_1px_var(--color-border)]',
            size === 'xs' ? 'text-[10px]' : size === 'sm' ? 'text-[12px]' : size === 'md' ? 'text-[14px]' : size === 'lg' ? 'text-[16px]' : size === '3xl' ? 'text-[30px]' : 'text-[19px]',
            ring && 'ring-2 ring-accent-brand/20',
          )}
        >
          {initials}
        </span>
      ) : (
        <img
          src={avatarSetUrl(id)}
          alt={name ? `${name}'s avatar` : `${avatarName(id)} avatar`}
          decoding="async"
          draggable={false}
          className={cn(SIZES[size], 'rounded-full bg-bg-surface-2 select-none', ring && 'ring-2 ring-accent-brand/20')}
        />
      )}
      {online != null && (
        <span
          className={cn(
            'absolute -bottom-1 -right-0 h-2.5 w-2.5 rounded-full border-2 border-bg-app/50',
            online ? 'bg-state-success' : 'bg-text-muted',
          )}
          role="img"
          aria-label={online ? 'online' : 'offline'}
        />
      )}
    </span>
  )
}
