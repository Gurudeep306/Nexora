import type { ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

/**
 * Dialog built on Radix (focus trap, scroll lock, Esc, aria) with a spring
 * entrance. On phones it docks to the bottom like a native sheet.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <div className="fixed inset-0 z-1000 flex items-end justify-center sm:items-center sm:p-4">
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="absolute inset-0 bg-black/65 backdrop-blur-[6px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount>
                <motion.div
                  className={cn(
                    'pop-surface relative z-10 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-b-none bg-surface sm:rounded-2xl',
                    'rounded-t-2xl',
                    widths[size],
                    className,
                  )}
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.14 } }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                >
                  <span aria-hidden="true" className="hairline-top pointer-events-none absolute inset-x-0 top-0 h-px" />
                  {title ? (
                    <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
                      <div className="min-w-0">
                        <Dialog.Title className="min-w-0 font-display text-[17px] font-semibold break-words text-foreground">
                          {title}
                        </Dialog.Title>
                        {description && (
                          <Dialog.Description className="mt-1 text-[13px] text-foreground-dim">{description}</Dialog.Description>
                        )}
                      </div>
                      <Dialog.Close
                        aria-label="Close dialog"
                        className="-mr-1.5 cursor-pointer rounded-md p-1.5 text-foreground-faint transition-colors hover:bg-white/[0.06] hover:text-foreground"
                      >
                        <X className="size-4" />
                      </Dialog.Close>
                    </div>
                  ) : (
                    <Dialog.Title className="sr-only">Dialog</Dialog.Title>
                  )}
                  {!description && <Dialog.Description className="sr-only">Dialog content</Dialog.Description>}
                  <div className="overflow-y-auto px-5 py-4">{children}</div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-5">
        <div className="text-sm text-foreground-dim">{message}</div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
