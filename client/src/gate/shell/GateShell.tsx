/*
  GateShell — the frame around every GATE page (sub-navigation, page header slot).
  PLACEHOLDER: the dashboard agent replaces it; keep the props.
*/
import type { ReactNode } from 'react'

export interface GateShellProps {
  /** Page title shown in the header. */
  title: string
  /** One-line description under the title. */
  subtitle?: string
  /** Right side of the header (buttons). */
  actions?: ReactNode
  children: ReactNode
}

export function GateShell({ title, subtitle, actions, children }: GateShellProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </div>
  )
}
