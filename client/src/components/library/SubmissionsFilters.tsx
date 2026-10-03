import { Swords } from 'lucide-react'
import { Card, CardContent, SearchCombobox, Select, type ComboboxItem } from '@/components/ui'
import { PLATFORM_OPTIONS } from '@/components/problems/types'
import { useProblemSuggestions } from '@/hooks/useProblemSuggestions'
import { DAY_RANGES, VERDICT_OPTIONS } from './types'

export interface SubmissionFilterState {
  search: string
  platform: string
  verdict: string
  language: string
  rangeDays: number
}

export function SubmissionsFilters({
  filters,
  languages,
  onChange,
}: {
  filters: SubmissionFilterState
  languages: string[]
  onChange: (patch: Partial<SubmissionFilterState>) => void
}) {
  const { problems, loading } = useProblemSuggestions(filters.search)
  const items: ComboboxItem[] = problems.map((p) => ({
    id: `problem:${p.id}`,
    label: p.title,
    hint: p.problem_id || undefined,
    icon: Swords,
    onSelect: () => onChange({ search: p.title }),
  }))

  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2 lg:grid-cols-5">
        <SearchCombobox
          value={filters.search}
          onValueChange={(v) => onChange({ search: v })}
          items={items}
          loading={loading}
          placeholder="Search problems…"
          emptyText="No problems match."
          aria-label="Search submissions by problem title"
          containerClassName="sm:col-span-2 lg:col-span-1"
        />
        <Select
          value={filters.rangeDays}
          onChange={(e) => onChange({ rangeDays: Number(e.target.value) })}
          aria-label="Date range"
        >
          {DAY_RANGES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </Select>
        <Select
          value={filters.platform}
          onChange={(e) => onChange({ platform: e.target.value })}
          aria-label="Filter by platform"
        >
          <option value="all">All platforms</option>
          {PLATFORM_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select
          value={filters.verdict}
          onChange={(e) => onChange({ verdict: e.target.value })}
          aria-label="Filter by verdict"
        >
          <option value="all">All verdicts</option>
          {VERDICT_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
        <Select
          value={filters.language}
          onChange={(e) => onChange({ language: e.target.value })}
          aria-label="Filter by language"
        >
          <option value="all">All languages</option>
          {languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
      </CardContent>
    </Card>
  )
}
