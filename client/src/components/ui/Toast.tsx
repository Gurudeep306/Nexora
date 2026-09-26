import { createContext, useContext, useContext, useMemo, type ReactNode } from 'react'
import { Toaster, toast as sonner } from 'sonner'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

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
        theme="dark"
        position="bottom-right"
        gap={4}
        visibleToasts={3}
        closeButton
        duration={5000}
        swipeDirection="right-to-left"
        icons={{
          success: <CheckCircle2 className="h-4 w-4 text-success" />,
          error: <XCircle className="h-4 w-4 text-error" />,
          warning: <AlertTriangle className="h-4 w-4 text-warning" />,
          info: <Info className="h-4 w-4 text-info" />,
        }}
        toastOptions={{
          classNames: {
            toast:
              '!rounded-lg !border !border-border/20 !bg-surface-3/90 !shadow-lg !text-foreground !font-body',
            title: '!text-sm !font-medium',
            description: '!text-xs !text-foreground-muted',
            closeButton: '!bg-surface-2 !border-border/20 !text-foreground/60 hover:text-foreground',
            action: '!text-sm !font-medium text-primary hover:text-primary/80',
            actionButton: '!bg-primary/10 hover:bg-primary/20',
          },
        }}
      />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}