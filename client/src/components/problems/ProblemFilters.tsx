import { useEffect, useRef, type ReactNode } from 'react'
import { ArrowDownWideNarrow, Search, X } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  DIFFICULTY_BANDS,
  PLATFORM_OPTIONS,
  type DifficultyBandId,
} from './types'

export type SortKey = 'rating' | 'title' | 'id'
export type SortOrder = 'asc' | 'desc'
export type StatusFilter = 'all' | 'solved' | 'attempted' | 'unsolved'

export interface ProblemFilterState {
  search: string
  platform: string
  difficulty: DifficultyBandId
  status: StatusFilter
  tag: string
  sort: SortKey
  order: SortOrder
}

interface Props {
  filters: ProblemFilterState
  tags: string[]
  resultCount?: number
  onSearchInput: (v: string) => void
  onChange: (patch: Partial<ProblemFilterState>) => void
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block min-w-0', className)}>
      <span className="mb-1 block text-[10px] font-semibold tracking-wider text-foreground-faint uppercase">
        {label}
      </span>
      <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {children}
      </Select>
    </label>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 py-0.5 pr-1 pl-2.5 text-[11px] text-primary-bright">
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="cursor-pointer rounded-full p-0.5 transition-colors hover:bg-primary/25"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </span>
  )
}

export function ProblemFilters({ filters, tags, resultCount, onSearchInput, onChange }: Props) {
  const searchRef = useRef<HTMLInputElement>(null)

  /* "/" jumps to search from anywhere on the page */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable))
        return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const presets: { label: string; patch: Partial<ProblemFilterState>; show?: boolean }[] = [
    { label: 'Warm-up', patch: { difficulty: 'easy', status: 'unsolved', sort: 'rating', order: 'asc' } },
    { label: 'DP grind', patch: { tag: 'dp' }, show: tags.includes('dp') },
    { label: 'Graph lab', patch: { tag: 'graphs' }, show: tags.includes('graphs') },
    { label: 'Strings', patch: { tag: 'strings' }, show: tags.includes('strings') },
    { label: 'Math club', patch: { tag: 'math' }, show: tags.includes('math') },
    { label: 'Boss level', patch: { difficulty: 'elite', order: 'asc' } },
  ]

  const bandLabel = DIFFICULTY_BANDS.find((b) => b.id === filters.difficulty)?.label
  const chips: { label: string; remove: () => void }[] = []
  if (filters.platform !== 'all')
    chips.push({ label: filters.platform, remove: () => onChange({ platform: 'all' }) })
  if (filters.difficulty !== 'all' && bandLabel)
    chips.push({ label: bandLabel, remove: () => onChange({ difficulty: 'all' }) })
  if (filters.status !== 'all')
    chips.push({ label: filters.status, remove: () => onChange({ status: 'all' }) })
  if (filters.tag) chips.push({ label: `#${filters.tag}`, remove: () => onChange({ tag: '' }) })

  return (
    <div className="card-neon p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground-faint"
            aria-hidden="true"
          />
          <Input
            ref={searchRef}
            type="search"
            value={filters.search}
            onChange={(e) => onSearchInput(e.target.value)}
            placeholder="Search problems by title or ID…  ( / )"
            aria-label="Search problems"
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:items-end">
          <FilterSelect
            label="Platform"
            value={filters.platform}
            onChange={(v) => onChange({ platform: v })}
            className="lg:w-36"
          >
            <option value="all">All platforms</option>
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Difficulty"
            value={filters.difficulty}
            onChange={(v) => onChange({ difficulty: v as DifficultyBandId })}
            className="lg:w-44"
          >
            {DIFFICULTY_BANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(v) => onChange({ status: v as StatusFilter })}
            className="lg:w-32"
          >
            <option value="all">Any status</option>
            <option value="solved">Solved</option>
            <option value="attempted">Attempted</option>
            <option value="unsolved">Unsolved</option>
          </FilterSelect>

          <FilterSelect
            label="Tag"
            value={filters.tag}
            onChange={(v) => onChange({ tag: v })}
            className="lg:w-40"
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </FilterSelect>

          <div className="col-span-2 flex items-end gap-2 sm:col-span-1">
            <FilterSelect
              label="Sort"
              value={filters.sort}
              onChange={(v) => onChange({ sort: v as SortKey })}
              className="flex-1"
            >
              <option value="rating">Rating</option>
              <option value="title">Title</option>
              <option value="id">Problem ID</option>
            </FilterSelect>
            <Button
              variant="subtle"
              size="icon"
              aria-label={filters.order === 'asc' ? 'Sort ascending' : 'Sort descending'}
              title={filters.order === 'asc' ? 'Ascending' : 'Descending'}
              onClick={() => onChange({ order: filters.order === 'asc' ? 'desc' : 'asc' })}
              className="mb-0.5"
            >
              <ArrowDownWideNarrow
                className={cn('transition-transform duration-200', filters.order === 'desc' && 'rotate-180')}
              />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-semibold tracking-wider text-foreground-faint uppercase">
          Quick sets
        </span>
        {presets
          .filter((p) => p.show !== false)
          .map((p) => (
            <button
              key={p.label}
              onClick={() => onChange(p.patch)}
              className="cursor-pointer rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] text-foreground-dim transition-colors hover:border-accent/60 hover:text-accent"
            >
              {p.label}
            </button>
          ))}
        {typeof resultCount === 'number' && (
          <span className="ml-auto text-[11px] text-foreground-faint tabular-nums">
            {resultCount.toLocaleString()} problem{resultCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <FilterChip key={c.label} label={c.label} onRemove={c.remove} />
          ))}
          <button
            onClick={() => onChange({ platform: 'all', difficulty: 'all', status: 'all', tag: '' })}
            className="inline-flex cursor-pointer items-center gap-1 ml-1 text-xs font-semibold text-accent transition-colors hover:text-foreground"
          >
            <X className="size-3" aria-hidden="true" /> Clear all
          </button>
        </div>
      )}
    </div>
  )
}
