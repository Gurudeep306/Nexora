import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastKind = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  title: string
  description?: string
}

interface ToastApi {
  toast: (kind: ToastKind, title: string, description?: string) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

let nextId = 0

const KIND_META: Record<ToastKind, { icon: ReactNode; classes: string }> = {
  success: { icon: <CheckCircle2 className="size-4 text-success" />, classes: 'border-success/40' },
  error: { icon: <XCircle className="size-4 text-destructive" />, classes: 'border-destructive/40' },
  warning: { icon: <AlertTriangle className="size-4 text-warning" />, classes: 'border-warning/40' },
  info: { icon: <Info className="size-4 text-info" />, classes: 'border-info/40' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback(
    (kind: ToastKind, title: string, description?: string) => {
      const id = nextId++
      setToasts((t) => [...t.slice(-3), { id, kind, title, description }])
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  const api: ToastApi = {
    toast,
    success: (t, d) => toast('success', t, d),
    error: (t, d) => toast('error', t, d),
    warning: (t, d) => toast('warning', t, d),
    info: (t, d) => toast('info', t, d),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div aria-live="polite" className="pointer-events-none fixed top-4 right-4 z-[1100] flex w-80 flex-col gap-2">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
                className={cn(
                  'card-neon pointer-events-auto flex items-start gap-3 border px-4 py-3 glow-box',
                  KIND_META[t.kind].classes,
                )}
              >
                <span className="mt-0.5">{KIND_META[t.kind].icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-xs text-foreground-dim break-words">{t.description}</p>}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="cursor-pointer rounded p-0.5 text-foreground-faint transition-colors hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
