import { cn } from '@/lib/utils'

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-20 text-2xl',
}

export function Avatar({
  src,
  name,
  size = 'md',
  className,
  ring = true,
  online,
}: {
  src?: string | null
  name?: string | null
  size?: keyof typeof SIZES
  className?: string
  ring?: boolean
  online?: boolean
}) {
  const initials = (name ?? '?')
    .split(/[\s_-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  // `avatar` column stores preset keys ("coder", "bolt", …); only real URLs render as images.
  const imgSrc = src && /^(https?:|data:|\/)/.test(src) ? src : null

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={name ?? 'avatar'}
          className={cn(
            SIZES[size],
            'rounded-full object-cover',
            ring && 'ring-2 ring-border-glow',
          )}
        />
      ) : (
        <span
          className={cn(
            SIZES[size],
            'flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-on-primary',
            ring && 'ring-2 ring-border-glow',
          )}
          aria-label={name ?? 'avatar'}
        >
          {initials}
        </span>
      )}
      {online != null && (
        <span
          className={cn(
            'absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-background',
            online ? 'bg-success' : 'bg-foreground-faint',
          )}
          aria-label={online ? 'online' : 'offline'}
        />
      )}
    </span>
  )
}
