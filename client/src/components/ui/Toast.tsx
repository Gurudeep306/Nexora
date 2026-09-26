import { createContext, useContext, useMemo, type ReactNode } from 'react'
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
        swipeDirections={['right']}
        icons={{
          success: <CheckCircle2 className="h-4 w-4 text-state-success" />,
          error: <XCircle className="h-4 w-4 text-state-error" />,
          warning: <AlertTriangle className="h-4 w-4 text-state-warning" />,
          info: <Info className="h-4 w-4 text-state-info" />,
        }}
        toastOptions={{
          classNames: {
            toast:
              '!rounded-lg !border !border-border/20 !bg-bg-surface-3/90 !shadow-lg !text-text-primary !font-body',
            title: '!text-sm !font-medium',
            description: '!text-xs !text-text-primary/60',
            closeButton: '!bg-bg-surface-2 !border-border/20 !text-text-primary/60 hover:text-text-primary',
            actionButton: '!bg-accent-brand/10 hover:bg-accent-brand/20',
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