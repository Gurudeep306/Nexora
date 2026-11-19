import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

/** One sentence on what this is for, one primary action, an optional "learn how". */
/** `level`: 2 when the empty state is the page's main content (right under the page title), else 3. */
export function Empty({ icon, title, children, action, learn, level = 3, className }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode; learn?: ReactNode; level?: 2 | 3; className?: string }) {
  const H = level === 2 ? 'h2' : 'h3'
  return (
    <div className={cn('mx-auto flex max-w-md flex-col items-center px-6 py-12 text-center', className)}>
      {icon && <div className="mb-3 grid size-10 place-items-center rounded-[var(--hv-r-card)] bg-[var(--hv-surface-1)] text-[var(--hv-text-2)] ring-1 ring-[var(--hv-border)] [&_svg]:size-5">{icon}</div>}
      <H className="m-0 font-[family-name:var(--hv-sans)] text-[14px] font-semibold text-[var(--hv-text-1)]">{title}</H>
      {children && <p className="mb-0 mt-1 text-[13px] text-[var(--hv-text-2)]">{children}</p>}
      {(action || learn) && (
        <div className="mt-4 flex items-center gap-3">
          {action}
          {learn && <span className="text-[13px] text-[var(--hv-text-2)]">{learn}</span>}
        </div>
      )}
    </div>
  )
}

/** What happened, why (if known), and a verb to fix it. Never blames the person. */
export function Problem({ title, why, action, className }: { title: string; why?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn('flex items-start gap-3 rounded-[var(--hv-r-card)] border border-[color-mix(in_oklab,var(--hv-danger)_30%,transparent)] bg-[color-mix(in_oklab,var(--hv-danger)_7%,transparent)] p-3', className)}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--hv-danger)]" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-[var(--hv-text-1)]">{title}</div>
        {why && <div className="mt-0.5 text-[12.5px] text-[var(--hv-text-2)]">{why}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
