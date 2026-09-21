import type { ReactNode } from 'react'
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

export function ProblemFilters({ filters, tags, onSearchInput, onChange }: Props) {
  const hasActiveFilters =
    filters.platform !== 'all' ||
    filters.difficulty !== 'all' ||
    filters.status !== 'all' ||
    filters.tag !== ''

  return (
    <div className="card-neon p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground-faint"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={filters.search}
            onChange={(e) => onSearchInput(e.target.value)}
            placeholder="Search problems by title or ID…"
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

      {hasActiveFilters && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() =>
              onChange({ platform: 'all', difficulty: 'all', status: 'all', tag: '' })
            }
            className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-accent transition-colors hover:text-foreground"
          >
            <X className="size-3" aria-hidden="true" /> Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
