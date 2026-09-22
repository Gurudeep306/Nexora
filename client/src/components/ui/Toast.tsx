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

/** Stacked, swipe-to-dismiss toasts (sonner) behind the same useToast() API. */
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
        gap={10}
        visibleToasts={4}
        closeButton
        icons={{
          success: <CheckCircle2 className="size-4 text-success" />,
          error: <XCircle className="size-4 text-destructive" />,
          warning: <AlertTriangle className="size-4 text-warning" />,
          info: <Info className="size-4 text-info" />,
        }}
        toastOptions={{
          classNames: {
            toast:
              '!rounded-xl !border !border-white/[0.08] !bg-[#15151c]/95 !backdrop-blur-xl !shadow-[0_16px_48px_-12px_rgb(0_0_0/0.8)] !text-foreground !font-[inherit]',
            title: '!text-[13px] !font-semibold',
            description: '!text-xs !text-foreground-dim',
            closeButton: '!bg-surface-2 !border-white/10 !text-foreground-dim',
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
