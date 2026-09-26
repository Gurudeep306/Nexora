import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { avatarDataUrl, parseAvatar } from '@/lib/avatar'

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-14 w-14 text-2xl',
  '2xl': 'h-16 w-16 text-3xl',
}

/**
 * User picture. Priority: uploaded photo (`src`) → generated avatar from the
 * user's `avatar` setting ("gen:<style>:<n>") → generated default from the
 * username (`seed`). Everyone always has a unique picture, never blank initials.
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
  /** Stable identity used to generate the picture — pass the username. */
  seed?: string | null
  /** users.avatar value (generated spec or legacy preset key). */
  avatar?: string | null
  size?: keyof typeof SIZES
  className?: string
  ring?: boolean
  online?: boolean
}) {
  // `avatar` column stores preset keys ("coder", "bolt", …); only real URLs render as uploaded images.
  // If an uploaded photo fails to load (deleted file, offline CDN) fall back to the generated one.
  const [failed, setFailed] = useState<string | null>(null)
  const imgSrc = src && /^(https?:|data:|\/)/.test(src) && failed !== src ? src : null
  const key = seed || name || '?'
  const generated = useMemo(
    () => (imgSrc ? null : avatarDataUrl(key, parseAvatar(avatar, key))),
    [imgSrc, key, avatar],
  )

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={name ?? 'avatar'}
          onError={() => setFailed(imgSrc)}
          className={cn(
            SIZES[size],
            'rounded-full object-cover border border-border',
            ring && 'ring-2 ring-accent-brand/20',
          )}
        />
      ) : (
        <img
          src={generated ?? undefined}
          alt={name ? `${name}'s avatar` : 'avatar'}
          className={cn(SIZES[size], 'rounded-full bg-bg-surface-2', ring && 'ring-2 ring-accent-brand/20')}
          draggable={false}
        />
      )}
      {online != null && (
        <span
          className={cn(
            'absolute -bottom-1 -right-0 h-2.5 w-2.5 rounded-full border-2 border-bg-app/50',
            online ? 'bg-state-success' : 'bg-text-text-primary/60',
          )}
          aria-label={online ? 'online' : 'offline'}
        />
      )}
    </span>
  )
}