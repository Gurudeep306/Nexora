import { useSources } from '@/lib/sources'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownWideNarrow, ChevronDown, Loader2, Sparkles, Swords, X } from 'lucide-react'
import { SearchCombobox, type ComboboxItem } from '@/components/ui'
import { useProblemSuggestions } from '@/hooks/useProblemSuggestions'
import './filters.css'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { cn } from '@/lib/utils'
import {
  DIFFICULTY_BANDS,
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
  /** Ask the AI finder with the search text (the bar doubles as the AI prompt). */
  onAsk?: (text: string) => void
  asking?: boolean
  askError?: string | null
}

/** A compact filter: a native select dressed as a pill; its label is for assistive tech. */
function PillSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <span className="pf-pill">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {children}
      </select>
      <ChevronDown className="pf-pill-chev" aria-hidden="true" />
    </span>
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

export function ProblemFilters({ filters, tags, resultCount, onSearchInput, onChange, onAsk, asking, askError }: Props) {
  const sources = useSources()
  const searchRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { problems: suggestions, loading } = useProblemSuggestions(filters.search)

  const suggestionItems = useMemo<ComboboxItem[]>(
    () =>
      suggestions.map((p) => ({
        id: `problem:${p.id}`,
        label: p.title,
        hint: p.problem_id ? `${p.problem_id}${p.rating ? ` · ${p.rating}` : ''}` : undefined,
        icon: Swords,
        trailing: <PlatformBadge platform={p.platform} />,
        onSelect: () => navigate(`/solve/${p.id}`),
      })),
    [suggestions, navigate],
  )

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
    <div className="pf-bar relative z-20">
      <div className="flex gap-2">
        <SearchCombobox
          ref={searchRef}
          value={filters.search}
          onValueChange={onSearchInput}
          items={suggestionItems}
          loading={loading}
          placeholder={onAsk ? 'Search or describe a problem' : 'Search problems'}
          emptyText="No title matches. Try Ask AI."
          aria-label="Search problems"
          containerClassName="flex-1"
          className="!h-11 !text-[15px]"
        />
        {onAsk && (
          <button
            type="button"
            className="pf-ask"
            disabled={!filters.search.trim() || asking}
            onClick={() => onAsk(filters.search)}
            title="Let the AI read your description and pick problems"
          >
            {asking ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PillSelect label="Platform" value={filters.platform} onChange={(v) => onChange({ platform: v })}>
          <option value="all">All platforms</option>
          {sources.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </PillSelect>
        <PillSelect label="Difficulty" value={filters.difficulty} onChange={(v) => onChange({ difficulty: v as DifficultyBandId })}>
          {DIFFICULTY_BANDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </PillSelect>
        <PillSelect label="Status" value={filters.status} onChange={(v) => onChange({ status: v as StatusFilter })}>
          <option value="all">Any status</option>
          <option value="solved">Solved</option>
          <option value="attempted">Attempted</option>
          <option value="unsolved">Unsolved</option>
        </PillSelect>
        <PillSelect label="Tag" value={filters.tag} onChange={(v) => onChange({ tag: v })}>
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </PillSelect>
        <PillSelect
          label="Quick set"
          value=""
          onChange={(v) => {
            const p = presets.find((x) => x.label === v)
            if (p) onChange(p.patch)
          }}
        >
          <option value="">Quick sets</option>
          {presets
            .filter((p) => p.show !== false)
            .map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
        </PillSelect>
        <span className="flex items-center gap-1">
          <PillSelect label="Sort by" value={filters.sort} onChange={(v) => onChange({ sort: v as SortKey })}>
            <option value="rating">By rating</option>
            <option value="title">By title</option>
            <option value="id">By ID</option>
          </PillSelect>
          <button
            type="button"
            className="pf-icon"
            aria-label={filters.order === 'asc' ? 'Sort ascending' : 'Sort descending'}
            title={filters.order === 'asc' ? 'Ascending' : 'Descending'}
            onClick={() => onChange({ order: filters.order === 'asc' ? 'desc' : 'asc' })}
          >
            <ArrowDownWideNarrow className={cn('size-4 transition-transform duration-200', filters.order === 'desc' && 'rotate-180')} />
          </button>
        </span>
        {typeof resultCount === 'number' && (
          <span className="ml-auto text-[12.5px] text-text-muted tabular-nums">
            {resultCount.toLocaleString()} problem{resultCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <FilterChip key={c.label} label={c.label} onRemove={c.remove} />
          ))}
          <button onClick={() => onChange({ platform: 'all', difficulty: 'all', status: 'all', tag: '' })} className="ml-1 inline-flex cursor-pointer items-center gap-1 text-[12.5px] text-text-secondary transition-colors hover:text-text-primary">
            <X className="size-3" aria-hidden="true" /> Clear
          </button>
        </div>
      )}
      {askError && <p className="mt-3 mb-0 text-[13px] text-state-error">{askError}</p>}
    </div>
  )
}
