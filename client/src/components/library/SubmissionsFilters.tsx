import { Search } from 'lucide-react'
import { Card, CardContent, Input, Select } from '@/components/ui'
import { PLATFORM_OPTIONS } from '@/components/problems/types'
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
  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground-faint"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search problems…"
            aria-label="Search submissions by problem title"
            className="pl-9"
          />
        </div>
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
