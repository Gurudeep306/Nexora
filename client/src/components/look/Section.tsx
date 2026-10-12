import { useId, type ReactNode } from 'react'

/** A titled group in the Theme Centre. */
export function Section({
  title,
  hint,
  aside,
  children,
}: {
  title: string
  hint?: ReactNode
  aside?: ReactNode
  children: ReactNode
}) {
  const id = useId()
  return (
    <section aria-labelledby={id}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={id} className="mb-0 text-[15px] font-semibold tracking-[-0.01em] text-text-primary">
            {title}
          </h2>
          {hint && <p className="mt-1 mb-0 text-[12.5px] leading-relaxed text-text-muted">{hint}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}
