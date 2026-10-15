import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { Icon, type IconName } from '@/components/icon/Icon'
import { useSite } from '@/context/SiteContext'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Announcement } from '@/lib/site'

const TONES: Record<Announcement['color'], string> = {
  brand: 'border-accent-brand/25 bg-accent-brand/10 text-text-primary [--tone:var(--color-accent-brand)]',
  info: 'border-state-info/25 bg-state-info/10 text-text-primary [--tone:var(--color-state-info)]',
  success: 'border-state-success/25 bg-state-success/10 text-text-primary [--tone:var(--color-state-success)]',
  warning: 'border-state-warning/30 bg-state-warning/12 text-text-primary [--tone:var(--color-state-warning)]',
  danger: 'border-state-error/30 bg-state-error/10 text-text-primary [--tone:var(--color-state-error)]',
}

function Bar({
  tone,
  icon,
  children,
  action,
  onDismiss,
}: {
  tone: Announcement['color']
  icon: IconName
  children: React.ReactNode
  action?: React.ReactNode
  onDismiss?: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className={cn('flex items-center gap-3 border-b px-4 py-2 text-[13px] md:px-6', TONES[tone])}>
        <Icon name={icon} className="size-4 shrink-0 text-[var(--tone)]" />
        <div className="min-w-0 flex-1 leading-snug">{children}</div>
        {action}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="-mr-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-app/10 hover:text-text-primary"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Site-wide strips above the top bar: the maintenance banner, the global
 * announcement bar (pinned ones can't be dismissed), and moderator warnings
 * for this user. Plus the floating "viewing as member" chip for the owner.
 */
export function SiteBanners() {
  const { status, dismissed, dismiss, refresh, previewAsMember, setPreviewAsMember } = useSite()
  if (!status) return null
  const banners = status.banners.filter((b) => b.pinned || !dismissed.has(`a:${b.id}`))

  return (
    <>
      <AnimatePresence initial={false}>
        {status.maintenance && (
          <Bar key="maint" tone="warning" icon="wrench">
            <strong className="font-semibold">Maintenance</strong>
            {status.maintenance.message ? <span className="text-text-secondary"> — {status.maintenance.message}</span> : null}
          </Bar>
        )}
        {status.notices.map((n) => (
          <Bar
            key={`n${n.id}`}
            tone="danger"
            icon="flag"
            action={
              <button
                type="button"
                onClick={async () => {
                  await api.post(`/api/site/notices/${n.id}/ack`).catch(() => {})
                  void refresh()
                }}
                className="shrink-0 cursor-pointer rounded-md border border-border bg-bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-primary transition-colors hover:bg-bg-surface-3"
              >
                I understand
              </button>
            }
          >
            <strong className="font-semibold">A moderator sent you a warning:</strong>{' '}
            <span className="text-text-secondary">{n.reason}</span>
          </Bar>
        ))}
        {banners.map((b) => (
          <Bar
            key={`a${b.id}`}
            tone={b.color}
            icon={b.pinned ? 'crown' : 'bell'}
            onDismiss={b.pinned ? undefined : () => dismiss(`a:${b.id}`)}
          >
            {b.title && <strong className="mr-1.5 font-semibold">{b.title}</strong>}
            <span className={b.title ? 'text-text-secondary' : undefined}>{b.body}</span>
            {b.link &&
              (b.link.startsWith('/') ? (
                <Link to={b.link} className="ml-2 font-medium text-[var(--tone)] underline-offset-2 hover:underline">
                  Open →
                </Link>
              ) : (
                <a href={b.link} target="_blank" rel="noreferrer noopener" className="ml-2 font-medium text-[var(--tone)] underline-offset-2 hover:underline">
                  Open →
                </a>
              ))}
          </Bar>
        ))}
      </AnimatePresence>
      {previewAsMember && (
        <div className="fixed bottom-20 left-1/2 z-[1200] -translate-x-1/2 md:bottom-6">
          <div className="pop-surface flex items-center gap-3 !rounded-full py-1.5 pr-1.5 pl-4 text-[13px] text-text-secondary">
            <Icon name="eye" className="size-4 text-accent-brand" />
            Viewing as a member
            <button
              type="button"
              onClick={() => setPreviewAsMember(false)}
              className="cursor-pointer rounded-full bg-accent-brand px-3 py-1 text-xs font-semibold text-on-accent-brand"
            >
              Exit
            </button>
          </div>
        </div>
      )}
    </>
  )
}
