import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { Icon, type IconName } from '@/components/icon/Icon'
import { useSite } from '@/context/SiteContext'
import { api } from '@/lib/api'
import type { Announcement } from '@/lib/site'
import { ReportHost } from './ReportDialog'
import './brand.css'

const TONE: Record<Announcement['color'], string> = {
  brand: 'var(--nx-b1)',
  info: 'var(--color-state-info)',
  success: 'var(--color-state-success)',
  warning: 'var(--color-state-warning)',
  danger: 'var(--color-state-error)',
}

function Bar({
  tone,
  icon,
  variant,
  children,
  action,
  onDismiss,
}: {
  tone: Announcement['color']
  icon: IconName
  variant?: 'maintenance'
  children: ReactNode
  action?: ReactNode
  onDismiss?: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="nx-bar" data-variant={variant} style={{ '--tone': TONE[tone] } as CSSProperties}>
        <div className="mx-auto flex min-h-10 max-w-[1320px] items-center gap-3 px-4 py-1.5 text-[13px] md:px-6">
          <span className="nx-bar-icon shrink-0">
            <Icon name={icon} className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1 leading-snug text-text-primary">{children}</div>
          {action}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="-mr-1.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-[color-mix(in_oklab,var(--tone)_14%,transparent)] hover:text-text-primary"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function OpenLink({ href }: { href: string }) {
  const cls =
    'ml-2 inline-flex items-center gap-0.5 font-semibold whitespace-nowrap text-[var(--tone)] underline-offset-[3px] hover:underline'
  return href.startsWith('/') ? (
    <Link to={href} className={cls}>
      Open <span aria-hidden="true">→</span>
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer noopener" className={cls}>
      Open <span aria-hidden="true">↗</span>
    </a>
  )
}

/**
 * Site-wide strips above the top bar — the maintenance banner, the global
 * announcement bar (pinned ones can't be dismissed) and moderator warnings —
 * plus the owner's "viewing as member" chip and the report dialog host.
 */
export function SiteBanners() {
  const { status, dismissed, dismiss, refresh, previewAsMember, setPreviewAsMember } = useSite()
  const banners = status ? status.banners.filter((b) => b.pinned || !dismissed.has(`a:${b.id}`)) : []

  return (
    <>
      <AnimatePresence initial={false}>
        {status?.maintenance && (
          <Bar key="maint" tone="warning" icon="wrench" variant="maintenance">
            <span className="font-semibold">Maintenance in progress</span>
            {status.maintenance.message ? <span className="text-text-secondary"> · {status.maintenance.message}</span> : null}
          </Bar>
        )}
        {status?.notices.map((n) => (
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
                className="nx-btn shrink-0"
                data-size="sm"
              >
                I understand
              </button>
            }
          >
            <span className="font-semibold">Warning from the moderators</span>
            <span className="text-text-secondary"> · {n.reason}</span>
          </Bar>
        ))}
        {banners.map((b) => (
          <Bar key={`a${b.id}`} tone={b.color} icon={b.pinned ? 'crown' : 'bell'} onDismiss={b.pinned ? undefined : () => dismiss(`a:${b.id}`)}>
            {b.title && <span className="mr-1.5 font-semibold">{b.title}</span>}
            <span className={b.title ? 'text-text-secondary' : undefined}>{b.body}</span>
            {b.link && <OpenLink href={b.link} />}
          </Bar>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {previewAsMember && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-24 left-1/2 z-[1200] -translate-x-1/2 md:bottom-6"
          >
            <div className="nx-panel flex items-center gap-3 !rounded-full py-1.5 pr-1.5 pl-3.5 text-[13px] text-text-secondary">
              <Icon name="eye" className="size-4 text-[var(--nx-b1)]" />
              <span>
                Viewing as a <span className="font-semibold text-text-primary">member</span>
              </span>
              <button type="button" onClick={() => setPreviewAsMember(false)} className="nx-cta !h-7 !rounded-full !px-3 !text-xs">
                Exit preview
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReportHost />
    </>
  )
}
