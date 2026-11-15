import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { Toaster, toast as sonner } from 'sonner'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

type ToastKind = 'success' | 'error' | 'warning' | 'info'

interface ToastApi {
  toast: (kind: ToastKind, title: string, description?: string) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

/** Modern toast notifications using the new design system. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { mode, shown } = useTheme()
  // Field Journal sets toasts as an ink slip at the bottom left.
  const journal = shown.style === 'journal'
  const api = useMemo<ToastApi>(() => {
    const toast = (kind: ToastKind, title: string, description?: string) => sonner[kind](title, { description })
    return {
      toast,
      success: (t, d) => toast('success', t, d),
      error: (t, d) => toast('error', t, d),
      warning: (t, d) => toast('warning', t, d),
      info: (t, d) => toast('info', t, d),
    }
  }, [])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster
        theme={mode}
        position={journal ? 'bottom-left' : 'bottom-right'}
        gap={8}
        offset={20}
        visibleToasts={3}
        closeButton
        duration={5000}
        swipeDirections={journal ? ['left'] : ['right']}
        icons={{
          success: <CheckCircle2 className="h-4 w-4 text-state-success" />,
          error: <XCircle className="h-4 w-4 text-state-error" />,
          warning: <AlertTriangle className="h-4 w-4 text-state-warning" />,
          info: <Info className="h-4 w-4 text-state-info" />,
        }}
        toastOptions={{
          classNames: journal ? JOURNAL_TOAST : {
            // Sonner paints its own background with a more specific selector,
            // so the surface has to be forced. A toast is transient, so it
            // floats one step lower than menus and dialogs.
            toast:
              'nx-toast !gap-2.5 !rounded-[var(--radius-card)] !border !border-[var(--hairline)] !bg-bg-surface-2 !pl-3.5 !pr-9 !py-3 !font-body !text-text-primary !shadow-[inset_0_1px_0_var(--specular),var(--elev-2)]',
            title: '!text-[13px] !font-medium !leading-snug',
            description: '!text-[12px] !leading-snug !text-text-secondary',
            icon: '!mt-px !self-start',
            closeButton:
              '!left-auto !right-1.5 !top-1.5 !translate-x-0 !translate-y-0 !size-6 !rounded-md !border-0 !bg-transparent !text-text-muted hover:!bg-text-primary/8 hover:!text-text-primary',
            actionButton: '!rounded-md !bg-accent-brand !text-on-accent-brand !text-[12px] !font-medium',
            cancelButton: '!rounded-md !bg-bg-surface-3 !text-text-secondary !text-[12px]',
          },
        }}
      />
    </ToastContext.Provider>
  )
}

/* Field Journal: an ink slip — the page's ink as the paper, canvas-coloured
   words, square corners rounded at the foot like the clay button. */
const JOURNAL_TOAST = {
  toast:
    'nx-toast !gap-2.5 !rounded-[0_0_8px_8px] !border-0 !bg-text-primary !pl-3.5 !pr-9 !py-3 !font-body !text-bg-app !shadow-none',
  title: '!text-[13px] !font-medium !leading-snug',
  description: '!text-[12px] !leading-snug !text-bg-app/75',
  icon: '!mt-px !self-start [&_svg]:!text-bg-app',
  closeButton:
    '!left-auto !right-1.5 !top-1.5 !translate-x-0 !translate-y-0 !size-6 !rounded-md !border-0 !bg-transparent !text-bg-app/70 hover:!bg-bg-app/10 hover:!text-bg-app',
  actionButton: '!rounded-[0_0_6px_6px] !bg-[var(--ed-clay)] !text-[var(--ed-on-clay)] !text-[12px] !font-semibold',
  cancelButton: '!rounded-md !bg-transparent !text-bg-app/75 !text-[12px]',
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}