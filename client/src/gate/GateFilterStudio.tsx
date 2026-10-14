import { useMemo, useState } from 'react'
import { ArrowUpDown, Bookmark, ChevronDown, FileText, Image as ImageIcon, LayoutList, Layers, Search, SlidersHorizontal, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GateCustomSelect, type SelectOption } from './GateCustomSelect'
import { TYPE_LABEL, paperLabel, type GateList, type GateMeta, type QType } from './types'

export type ViewMode = 'practice' | 'list'

/** Filter state, as kept in the URL (lists are comma-joined there). */
export interface GateFilters {
  q: string
  exam: string[]
  paper: string[]
  year: string[]
  subject: string[]
  topic: string[]
  type: string[]
  marks: string[]
  section: string[]
  hasFigure: string
  saved: boolean
  /** Your status on the question: unseen / correct / wrong / bookmarked / note / due. */
  status: string
  sort: string
}

const STATUS_FILTERS: Array<{ id: string; label: string; hint: string }> = [
  { id: '', label: 'All', hint: 'Every question' },
  { id: 'unseen', label: 'Unseen', hint: 'Not attempted yet' },
  { id: 'wrong', label: 'Wrong', hint: 'Last attempt was wrong or the answer was revealed' },
  { id: 'correct', label: 'Solved', hint: 'Answered correctly' },
  { id: 'bookmarked', label: 'Bookmarked', hint: 'Saved with B' },
  { id: 'note', label: 'Notes', hint: 'Questions you wrote a note on' },
  { id: 'due', label: 'Due', hint: 'Due for spaced-repetition review' },
]

const SORT_OPTIONS: SelectOption[] = [
  { value: 'year-desc', label: 'Newest first' },
  { value: 'year-asc', label: 'Oldest first' },
  { value: 'marks-desc', label: '2-mark first' },
  { value: 'marks-asc', label: '1-mark first' },
  { value: 'subject-asc', label: 'Subject A–Z' },
  { value: 'difficulty-desc', label: 'Hardest first' },
  { value: 'difficulty-asc', label: 'Easiest first' },
]

const EXAMS = [
  { id: '', label: 'All' },
  { id: 'CSE', label: 'CSE' },
  { id: 'IT', label: 'IT' },
  { id: 'DA', label: 'DA' },
]

const ERAS: Array<[string, number, number]> = [
  ['2024–26', 2024, 2026],
  ['2018–23', 2018, 2023],
  ['2010–17', 2010, 2017],
  ['1991–2009', 1991, 2009],
]

const TYPES: QType[] = ['MCQ', 'MSQ', 'NAT', 'MATCH', 'FILL', 'TF', 'DESC']

function Pill({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={title}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] transition-colors',
        on ? 'border-accent-brand bg-accent-brand/10 font-semibold text-accent-brand' : 'border-border bg-bg-surface text-text-secondary hover:border-border-hover hover:text-text-primary',
      )}
    >
      {children}
    </button>
  )
}

export function GateFilterStudio({
  f,
  searchInput,
  setSearchInput,
  setList,
  toggle,
  setParam,
  patch,
  viewMode,
  setViewMode,
  clearAll,
  meta,
  list,
  savedCount,
  statusCounts,
}: {
  f: GateFilters
  searchInput: string
  setSearchInput: (v: string) => void
  setList: (key: keyof GateFilters, vals: string[]) => void
  toggle: (key: keyof GateFilters, v: string) => void
  setParam: (key: string, v: string | null) => void
  patch: (p: Record<string, string | null>) => void
  viewMode: ViewMode
  setViewMode: (m: ViewMode) => void
  clearAll: () => void
  meta?: GateMeta | null
  list?: GateList | null
  savedCount: number
  /** Count per status filter (from your progress). */
  statusCounts?: Record<string, number>
}) {
  const [more, setMore] = useState(false)
  const facets = list?.facets

  /* Paper navigation: grouped by year, newest first, narrowed by exam. */
  const paperOptions = useMemo<SelectOption[]>(() => {
    const papers = (meta?.papers ?? []).filter((p) => !f.exam.length || f.exam.includes(p.exam))
    const sorted = [...papers].sort((a, b) => b.year - a.year || a.exam.localeCompare(b.exam) || (a.set ?? 0) - (b.set ?? 0))
    return [
      { value: '', label: 'All papers' },
      ...sorted.map((p) => ({ value: p.id, label: paperLabel(p).replace('GATE ', ''), group: String(p.year), badge: String(p.count) })),
    ]
  }, [meta, f.exam])

  /* Subjects: core CS, then DA-only, then retired syllabus. */
  const subjectOptions = useMemo<SelectOption[]>(() => {
    const cse = meta?.subjects?.CSE ?? {}
    const da = meta?.subjects?.DA ?? {}
    const out: SelectOption[] = [{ value: '', label: 'All subjects' }]
    const count = (id: string) => {
      const n = facets?.subject?.[id]
      return n != null ? String(n) : undefined
    }
    for (const [id, s] of Object.entries(cse)) {
      if (id === 'legacy' || id === 'pdsa') continue
      out.push({ value: id, label: s.name, group: id === 'ga' ? 'Aptitude' : 'Computer science', badge: count(id) })
    }
    for (const [id, s] of Object.entries(da)) {
      if (cse[id] && id !== 'pdsa') continue
      out.push({ value: id, label: s.name, group: 'Data science & AI', badge: count(id) })
    }
    if (cse.legacy) out.push({ value: 'legacy', label: cse.legacy.name, group: 'Other', badge: count('legacy') })
    // Sort groups so "Aptitude" comes first.
    const order = ['', 'Aptitude', 'Computer science', 'Data science & AI', 'Other']
    return out.sort((a, b) => order.indexOf(a.group ?? '') - order.indexOf(b.group ?? ''))
  }, [meta, facets])

  const topicOptions = useMemo(() => {
    if (f.subject.length !== 1 || !meta) return []
    const s = f.subject[0]
    const topics = { ...(meta.subjects.CSE?.[s]?.topics ?? {}), ...(meta.subjects.DA?.[s]?.topics ?? {}) }
    return Object.entries(topics).map(([k, label]) => ({ key: `${s}/${k}`, label, n: facets?.topic?.[`${s}/${k}`] ?? 0 }))
  }, [f.subject, meta, facets])

  const years = useMemo(() => [...new Set((meta?.papers ?? []).map((p) => p.year))].sort((a, b) => b - a), [meta])

  const selectEra = (a: number, b: number) => {
    const ys = years.filter((y) => y >= a && y <= b).map(String)
    const same = ys.length === f.year.length && ys.every((y) => f.year.includes(y))
    setList('year', same ? [] : ys)
  }

  const moreCount = f.year.length + f.topic.length + f.type.length + f.marks.length + f.section.length + (f.hasFigure ? 1 : 0)

  /* Active filter chips. */
  const chips: Array<{ key: string; label: string; clear: () => void }> = []
  const subjName = (id: string) => subjectOptions.find((o) => o.value === id)?.label ?? id.toUpperCase()
  if (f.status) chips.push({ key: 'status', label: STATUS_FILTERS.find((x) => x.id === f.status)?.label ?? f.status, clear: () => patch({ status: null, saved: null }) })
  f.exam.forEach((e) => chips.push({ key: `e${e}`, label: `GATE ${e}`, clear: () => toggle('exam', e) }))
  f.paper.forEach((p) => chips.push({ key: `p${p}`, label: paperOptions.find((o) => o.value === p)?.label ?? p, clear: () => toggle('paper', p) }))
  f.subject.forEach((s) => chips.push({ key: `s${s}`, label: subjName(s), clear: () => toggle('subject', s) }))
  f.topic.forEach((t) => chips.push({ key: `t${t}`, label: topicOptions.find((o) => o.key === t)?.label ?? t.split('/').pop()!, clear: () => toggle('topic', t) }))
  if (f.year.length > 3) chips.push({ key: 'years', label: `${Math.min(...f.year.map(Number))}–${Math.max(...f.year.map(Number))} (${f.year.length} years)`, clear: () => setList('year', []) })
  else f.year.forEach((y) => chips.push({ key: `y${y}`, label: y, clear: () => toggle('year', y) }))
  f.type.forEach((t) => chips.push({ key: `ty${t}`, label: t, clear: () => toggle('type', t) }))
  f.marks.forEach((m) => chips.push({ key: `m${m}`, label: `${m} mark`, clear: () => toggle('marks', m) }))
  f.section.forEach((s) => chips.push({ key: `sec${s}`, label: s === 'ga' ? 'Aptitude section' : 'Core section', clear: () => toggle('section', s) }))
  if (f.hasFigure) chips.push({ key: 'fig', label: f.hasFigure === 'yes' ? 'With figures' : 'Without figures', clear: () => setParam('hasFigure', null) })
  if (f.q) chips.push({ key: 'q', label: `“${f.q}”`, clear: () => setSearchInput('') })

  return (
    <section className="card space-y-3 !p-3 sm:!p-4" aria-label="Find questions">
      {/* Row 1: search + view */}
      <div className="flex items-center gap-2">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border-input bg-bg-field px-3 focus-within:border-accent-brand focus-within:ring-2 focus-within:ring-accent-brand/20">
          <Search className="size-4 shrink-0 text-text-muted" />
          <span className="sr-only">Search questions</span>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={`Search ${meta ? meta.total.toLocaleString() : ''} questions — e.g. "deadlock", paging, B+ tree`}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-text-primary outline-none placeholder:text-text-muted [&::-webkit-search-cancel-button]:hidden"
            spellCheck={false}
          />
          {searchInput && (
            <button type="button" onClick={() => setSearchInput('')} className="text-text-muted hover:text-text-primary" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </label>
        <div className="flex h-10 shrink-0 items-center rounded-xl border border-border bg-bg-surface p-0.5" role="tablist" aria-label="View">
          {(
            [
              ['practice', 'Practice', Square],
              ['list', 'List', LayoutList],
            ] as const
          ).map(([id, label, I]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={viewMode === id}
              onClick={() => setViewMode(id)}
              className={cn(
                'inline-flex h-full items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] transition-colors sm:px-3',
                viewMode === id ? 'bg-bg-surface-3 font-semibold text-text-primary' : 'text-text-muted hover:text-text-primary',
              )}
              title={label}
            >
              <I className="size-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: primary navigation — exam, paper, subject, sort */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-9 items-center rounded-xl border border-border bg-bg-surface p-0.5" role="radiogroup" aria-label="Exam">
          {EXAMS.map((e) => {
            const on = e.id ? f.exam.length === 1 && f.exam[0] === e.id : f.exam.length === 0
            return (
              <button
                key={e.id || 'all'}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => patch({ exam: e.id || null, paper: null })}
                className={cn('h-full rounded-[10px] px-2.5 text-[12.5px] transition-colors', on ? 'bg-bg-surface-3 font-semibold text-text-primary' : 'text-text-muted hover:text-text-primary')}
              >
                {e.label}
              </button>
            )
          })}
        </div>
        <GateCustomSelect
          className="min-w-0 flex-1 basis-40 sm:max-w-56"
          value={f.paper.length === 1 ? f.paper[0] : ''}
          onChange={(v) => setList('paper', v ? [v] : [])}
          options={paperOptions}
          icon={<FileText className="size-3.5" />}
          placeholder="All papers"
          searchable
        />
        <GateCustomSelect
          className="min-w-0 flex-1 basis-40 sm:max-w-60"
          value={f.subject.length === 1 ? f.subject[0] : ''}
          onChange={(v) => patch({ subject: v || null, topic: null })}
          options={subjectOptions}
          icon={<Layers className="size-3.5" />}
          placeholder="All subjects"
          searchable
        />
        <GateCustomSelect className="min-w-0 basis-36 sm:w-40" value={f.sort} onChange={(v) => setParam('sort', v === 'year-desc' ? null : v)} options={SORT_OPTIONS} icon={<ArrowUpDown className="size-3.5" />} align="right" />
        <button
          type="button"
          onClick={() => setMore((m) => !m)}
          aria-expanded={more}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px] transition-colors',
            more || moreCount ? 'border-accent-brand/60 text-accent-brand' : 'border-border text-text-secondary hover:text-text-primary',
          )}
        >
          <SlidersHorizontal className="size-3.5" />
          More
          {moreCount > 0 && <span className="rounded-full bg-accent-brand px-1.5 font-mono text-[10.5px] text-on-accent-brand">{moreCount}</span>}
          <ChevronDown className={cn('size-3.5 transition-transform', more && 'rotate-180')} />
        </button>
      </div>

      {/* Row 3: your status */}
      <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5" role="radiogroup" aria-label="Your status">
        {STATUS_FILTERS.map((st) => {
          const on = (f.status || '') === st.id
          const n = st.id === 'bookmarked' ? savedCount : statusCounts?.[st.id]
          return (
            <button
              key={st.id || 'all'}
              type="button"
              role="radio"
              aria-checked={on}
              title={st.hint}
              onClick={() => patch({ status: st.id || null, saved: null })}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition-colors',
                on ? 'border-accent-brand bg-accent-brand/10 font-semibold text-accent-brand' : 'border-border bg-bg-surface text-text-secondary hover:border-border-hover hover:text-text-primary',
              )}
            >
              {st.id === 'bookmarked' && <Bookmark className={cn('size-3.5', on && 'fill-current')} />}
              {st.label}
              {n != null && n > 0 && <span className="font-mono text-[11px] opacity-70 tabular-nums">{n}</span>}
            </button>
          )
        })}
      </div>

      {/* More filters */}
      {more && (
        <div className="grid gap-4 border-t border-border pt-3 md:grid-cols-2">
          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-text-muted uppercase">Year</legend>
            <div className="flex flex-wrap gap-1.5">
              {ERAS.map(([label, a, b]) => {
                const ys = years.filter((y) => y >= a && y <= b).map(String)
                const on = ys.length > 0 && ys.length === f.year.length && ys.every((y) => f.year.includes(y))
                return (
                  <Pill key={label} on={on} onClick={() => selectEra(a, b)}>
                    {label}
                  </Pill>
                )
              })}
            </div>
            <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
              {years.map((y) => {
                const on = f.year.includes(String(y))
                return (
                  <button
                    key={y}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle('year', String(y))}
                    className={cn('h-7 rounded-md px-1.5 font-mono text-[12px] transition-colors', on ? 'bg-accent-brand text-on-accent-brand' : 'text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary')}
                  >
                    {y}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="space-y-3">
            <fieldset>
              <legend className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-text-muted uppercase">Type</legend>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                  <Pill key={t} on={f.type.includes(t)} onClick={() => toggle('type', t)} title={TYPE_LABEL[t]}>
                    {t}
                    {facets?.type?.[t] != null && <span className="font-mono text-[11px] opacity-70">{facets.type[t]}</span>}
                  </Pill>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap gap-4">
              <fieldset>
                <legend className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-text-muted uppercase">Marks</legend>
                <div className="flex gap-1.5">
                  {['1', '2'].map((m) => (
                    <Pill key={m} on={f.marks.includes(m)} onClick={() => toggle('marks', m)}>
                      {m} mark
                    </Pill>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-text-muted uppercase">Section</legend>
                <div className="flex gap-1.5">
                  <Pill on={f.section.includes('ga')} onClick={() => toggle('section', 'ga')}>
                    Aptitude
                  </Pill>
                  <Pill on={f.section.includes('core')} onClick={() => toggle('section', 'core')}>
                    Core
                  </Pill>
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-text-muted uppercase">Figures</legend>
                <Pill on={f.hasFigure === 'yes'} onClick={() => setParam('hasFigure', f.hasFigure === 'yes' ? null : 'yes')}>
                  <ImageIcon className="size-3.5" /> With figures
                </Pill>
              </fieldset>
            </div>
          </div>

          {topicOptions.length > 0 && (
            <fieldset className="md:col-span-2">
              <legend className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-text-muted uppercase">Topic</legend>
              <div className="flex flex-wrap gap-1.5">
                {topicOptions.map((t) => (
                  <Pill key={t.key} on={f.topic.includes(t.key)} onClick={() => toggle('topic', t.key)}>
                    {t.label}
                    {t.n > 0 && <span className="font-mono text-[11px] opacity-70">{t.n}</span>}
                  </Pill>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}

      {/* Active filters */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.clear}
              className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-border bg-bg-surface-2 pr-2 pl-2.5 text-[12px] text-text-secondary hover:border-border-hover hover:text-text-primary"
              aria-label={`Remove filter ${c.label}`}
            >
              <span className="truncate">{c.label}</span>
              <X className="size-3 shrink-0" />
            </button>
          ))}
          <button type="button" onClick={clearAll} className="ml-1 text-[12px] font-medium text-text-muted underline-offset-2 hover:text-text-primary hover:underline">
            Clear all
          </button>
        </div>
      )}
    </section>
  )
}
