import type { ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'
import { EASE_EMPHASIZED, tExit, tStandard } from '@/lib/motion'

/**
 * Dialog built on Radix (focus trap, scroll lock, Esc, aria) with a short,
 * calm entrance. On phones it docks to the bottom like a native sheet.
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
                  className="absolute inset-0 bg-bg-app/60 backdrop-blur-[2px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: tExit }}
                  transition={tStandard}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount>
                <motion.div
                  className={cn(
                    'pop-surface relative z-10 flex max-h-[88vh] w-full flex-col overflow-hidden !rounded-b-none !rounded-t-[var(--radius-sheet)] sm:!rounded-[var(--radius-sheet)]',
                    widths[size],
                    className,
                  )}
                  initial={{ opacity: 0, y: 12, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.99, transition: tExit }}
                  transition={{ duration: 0.22, ease: EASE_EMPHASIZED }}
                >
                  {title ? (
                    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                      <div className="min-w-0">
                        <Dialog.Title className="mb-0 min-w-0 font-display text-[16px] leading-snug font-semibold tracking-[-0.01em] break-words text-text-primary">
                          {title}
                        </Dialog.Title>
                        {description && (
                          <Dialog.Description className="mt-1 mb-0 text-[13px] leading-relaxed text-text-secondary">{description}</Dialog.Description>
                        )}
                      </div>
                      <Dialog.Close
                        aria-label="Close dialog"
                        className="-mr-1.5 cursor-pointer rounded-md p-1.5 text-text-muted transition-colors hover:bg-text-primary/6 hover:text-text-primary"
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
        <div className="text-sm text-text-secondary">{message}</div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? 'destructive' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}