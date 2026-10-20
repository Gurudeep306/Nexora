import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/icon/Icon'
import { nodeIcon } from './icons'
import { ALL_SUBJECTS } from './data'
import type { NexusSubjectSummary } from './types'

/*
 * The subject switcher: one scrollable pill row. "All subjects" first, then
 * DSA, the GATE CSE syllabus, and the beyond-GATE tracks, each group set
 * apart by a hairline. The active pill scrolls into view.
 */
export function SubjectSwitcher({
  subjects,
  active,
  onChange,
}: {
  subjects: NexusSubjectSummary[]
  active: string
  onChange: (id: string) => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = rowRef.current?.querySelector<HTMLElement>('[data-active]')
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [active])

  const groups: { key: string; items: NexusSubjectSummary[] }[] = [
    { key: 'core', items: subjects.filter((s) => s.group === 'core') },
    { key: 'gate', items: subjects.filter((s) => s.group === 'gate') },
    { key: 'beyond', items: subjects.filter((s) => s.group !== 'core' && s.group !== 'gate') },
  ]

  const pill = (id: string, label: string, title: string, icon: string, progress?: number) => (
    <button
      key={id}
      type="button"
      onClick={() => onChange(id)}
      aria-pressed={active === id}
      data-active={active === id || undefined}
      title={title}
      className="nx-pill flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap"
    >
      <Icon name={nodeIcon(icon)} className="size-3.5" aria-hidden="true" />
      {label}
      {progress != null && <span className="font-mono text-[10px] font-medium opacity-70 tabular-nums">{progress}%</span>}
    </button>
  )

  return (
    <div className="nx-subjects relative mb-4">
      <div
        ref={rowRef}
        className="flex items-center gap-1.5 overflow-x-auto pb-1.5 [scrollbar-width:thin]"
        role="navigation"
        aria-label="Subjects"
      >
        {pill(ALL_SUBJECTS, 'All subjects', 'Every subject and how they connect', 'grid')}
        {groups.map((g) =>
          g.items.length ? (
            <div key={g.key} className="flex shrink-0 items-center gap-1.5">
              <span className={cn('mx-1 h-5 w-px shrink-0 bg-border')} aria-hidden="true" />
              {g.key === 'beyond' && (
                <span className="text-[9.5px] font-semibold tracking-[0.14em] whitespace-nowrap text-text-muted uppercase">Beyond GATE</span>
              )}
              {g.key === 'gate' && (
                <span className="text-[9.5px] font-semibold tracking-[0.14em] whitespace-nowrap text-text-muted uppercase">GATE CSE</span>
              )}
              {g.items.map((s) => pill(s.id, s.short, s.name, s.icon, s.progress))}
            </div>
          ) : null,
        )}
      </div>
    </div>
  )
}
