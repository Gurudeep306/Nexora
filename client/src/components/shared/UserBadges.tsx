import { Icon, type IconName } from '@/components/icon/Icon'
import { Tooltip } from '@/components/ui'
import { badgesFor, useBadgeDirectory, type UserBadgeKind } from '@/lib/badges'
import { cn } from '@/lib/utils'

const META: Record<UserBadgeKind, { label: string; icon: IconName; title: string; cls: string }> = {
  owner: {
    label: 'Owner',
    icon: 'crown',
    title: 'Owner of NexoraGuru',
    cls: 'border-state-gold/30 bg-state-gold/12 text-state-gold',
  },
  admin: {
    label: 'Admin',
    icon: 'shield',
    title: 'NexoraGuru admin',
    cls: 'border-accent-brand/25 bg-accent-brand/10 text-accent-brand',
  },
  moderator: {
    label: 'Mod',
    icon: 'shield',
    title: 'Community moderator',
    cls: 'border-state-info/25 bg-state-info/10 text-state-info',
  },
  verified: {
    label: 'Verified',
    icon: 'check-circle',
    title: 'Verified account',
    cls: 'border-state-info/25 bg-state-info/10 text-state-info',
  },
}

/**
 * Owner crown, admin / moderator shields and the verified tick for a user.
 * Needs only the username (a shared, cached directory answers who is who);
 * pass `role` / `verified` when the row already has them.
 *
 *   <UserBadges username="ada" />                 compact icons with tooltips
 *   <UserBadges username="ada" variant="full" />  labelled pills
 */
export function UserBadges({
  username,
  role,
  verified,
  variant = 'compact',
  className,
}: {
  username: string | null | undefined
  role?: string | null
  verified?: boolean | number | null
  variant?: 'compact' | 'full'
  className?: string
}) {
  const dir = useBadgeDirectory()
  const kinds = badgesFor(dir, username, role, verified)
  if (!kinds.length) return null
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 align-middle', className)}>
      {kinds.map((k) => {
        const m = META[k]
        return variant === 'full' ? (
          <span key={k} title={m.title} className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', m.cls)}>
            <Icon name={m.icon} className="size-3.5" />
            {m.label}
          </span>
        ) : (
          <Tooltip key={k} label={m.title}>
            <span
              aria-label={m.title}
              role="img"
              className={cn('inline-flex size-[18px] items-center justify-center rounded-full border', m.cls)}
            >
              <Icon name={m.icon} className="size-[11px]" />
            </span>
          </Tooltip>
        )
      })}
    </span>
  )
}
