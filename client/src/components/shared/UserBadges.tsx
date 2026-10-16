import { useId } from 'react'
import { Tooltip } from '@/components/ui'
import { badgesFor, useBadgeDirectory, type UserBadgeKind } from '@/lib/badges'
import { cn } from '@/lib/utils'
import '@/components/site/brand.css'

/*
 * The four marks, drawn as one family: filled glyphs with a soft vertical
 * gradient and a hairline highlight, so they read at 14px next to a name and
 * still look finished at 20px on a profile.
 *
 *   owner     gold crown      — exactly one person
 *   admin     brand shield    — blue → violet
 *   moderator teal shield
 *   verified  blue seal tick
 */
const META: Record<UserBadgeKind, { label: string; title: string; stops: [string, string]; text: string }> = {
  owner: { label: 'Owner', title: 'Owner of NexoraGuru', stops: ['#ffd66b', '#e09a1a'], text: 'var(--nx-gold)' },
  admin: { label: 'Admin', title: 'NexoraGuru admin', stops: ['#6f93ff', '#8b5cf6'], text: 'var(--nx-b1)' },
  moderator: { label: 'Moderator', title: 'Community moderator', stops: ['#34d3c0', '#0e9488'], text: 'var(--nx-b3)' },
  verified: { label: 'Verified', title: 'Verified account', stops: ['#5ea2ff', '#2f6bea'], text: 'var(--nx-b1)' },
}

function Glyph({ kind, size }: { kind: UserBadgeKind; size: number }) {
  const id = `ub${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const [a, b] = META[kind].stops
  const fill = `url(#${id})`
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="shrink-0 drop-shadow-[0_1px_1px_rgb(0_0_0/0.18)]">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      {kind === 'owner' && (
        <>
          <path d="M3 7.2 6.6 10 10 4.4 13.4 10 17 7.2l-1.4 8.1a1 1 0 0 1-1 .8H5.4a1 1 0 0 1-1-.8L3 7.2Z" fill={fill} />
          <path d="M5 13.5h10" stroke="#fff" strokeOpacity=".45" strokeWidth="1" strokeLinecap="round" />
          <circle cx="10" cy="3.6" r="1.3" fill={fill} />
          <circle cx="2.8" cy="6.6" r="1.1" fill={fill} />
          <circle cx="17.2" cy="6.6" r="1.1" fill={fill} />
        </>
      )}
      {(kind === 'admin' || kind === 'moderator') && (
        <>
          <path d="M10 1.8 16.5 4v5.1c0 4.1-2.7 7.2-6.5 8.9-3.8-1.7-6.5-4.8-6.5-8.9V4L10 1.8Z" fill={fill} />
          {kind === 'admin' ? (
            <path d="m7 9.8 2.1 2.1L13.2 7.8" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M10 6.3v5.2M7.4 8.9h5.2" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
          )}
        </>
      )}
      {kind === 'verified' && (
        <>
          <path
            d="M10 1.5l1.9 1.4 2.3-.2.8 2.2 2 1.2-.5 2.3.9 2.1-1.7 1.6-.3 2.3-2.3.4-1.4 1.9-2.1-1-2.2.9-1.4-1.9-2.3-.5-.2-2.3L1.9 11l1-2.1-.4-2.3 2-1.1.9-2.2 2.3.2L10 1.5Z"
            fill={fill}
          />
          <path d="m6.9 10.1 2.1 2.1 4.1-4.3" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}

/**
 * Owner crown, admin / moderator shields and the verified seal for a user.
 * Needs only the username (a shared, cached directory answers who is who);
 * pass `role` / `verified` when the row already has them.
 *
 *   <UserBadges username="ada" />                 glyphs with tooltips (inline with a name)
 *   <UserBadges username="ada" variant="full" />  labelled pills (profiles, drawers)
 */
export function UserBadges({
  username,
  role,
  verified,
  variant = 'compact',
  size = 15,
  className,
}: {
  username: string | null | undefined
  role?: string | null
  verified?: boolean | number | null
  variant?: 'compact' | 'full'
  size?: number
  className?: string
}) {
  const dir = useBadgeDirectory()
  const kinds = badgesFor(dir, username, role, verified)
  if (!kinds.length) return null
  return (
    <span className={cn('inline-flex shrink-0 items-center align-middle', variant === 'full' ? 'gap-1.5' : 'gap-0.5', className)}>
      {kinds.map((k) => {
        const m = META[k]
        return variant === 'full' ? (
          <span
            key={k}
            title={m.title}
            className="inline-flex h-6 items-center gap-1.5 rounded-full pr-2.5 pl-1.5 text-xs font-semibold"
            style={{
              color: m.text,
              background: `color-mix(in oklab, ${m.stops[1]} 12%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${m.stops[1]} 28%, transparent)`,
            }}
          >
            <Glyph kind={k} size={15} />
            {m.label}
          </span>
        ) : (
          <Tooltip key={k} label={m.title}>
            <span role="img" aria-label={m.title} className="inline-flex">
              <Glyph kind={k} size={size} />
            </span>
          </Tooltip>
        )
      })}
    </span>
  )
}
