import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Filter, Search, SearchX, X } from 'lucide-react'
import { EmptyState, ErrorState, LoadingBlock, PageHeader } from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import { QuestionView } from '@/gate/QuestionView'
import { TYPE_LABEL, paperLabel, type GateList, type GateMeta, type QType } from '@/gate/types'

const PAGE_SIZE = 25
const TYPES: QType[] = ['MCQ', 'MSQ', 'NAT', 'FILL', 'MATCH', 'DESC', 'TF']

/** Multi-select pill groups keep their value in the URL as a comma list. */
function useListParam(key: string) {
  const [params, setParams] = useSearchParams()
  const value = useMemo(
    () => (params.get(key) ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    [params, key],
  )
  const toggle = useCallback(
    (v: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const cur = (next.get(key) ?? '').split(',').filter(Boolean)
          const after = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]
          if (after.length) next.set(key, after.join(','))
          else next.delete(key)
          next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [key, setParams],
  )
  return [value, toggle] as const
}

function Pills({
  label,
  options,
  selected,
  onToggle,
  counts,
}: {
  label: string
  options: { id: string; label: string }[]
  selected: string[]
  onToggle: (id: string) => void
  counts?: Record<string, number>
}) {
  if (!options.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-16 shrink-0 text-[11px] font-semibold tracking-wide text-text-muted uppercase">{label}</span>
      {options.map((o) => {
        const on = selected.includes(o.id)
        const n = counts?.[o.id]
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            aria-pressed={on}
            className={cn('gate-pill', on && 'gate-pill-on')}
          >
            {o.label}
            {n != null && <span className="gate-pill-n">{n}</span>}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Every GATE CSE / IT / DA question Nexora has transcribed, searchable and
 * filterable by paper, subject, topic, type and marks. The answer to each
 * question is hidden until asked for, so the bank doubles as practice.
 */
export default function GatePage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  // The typed value, plus the ?q= it was last synced from: when the URL
  // changes from elsewhere (a link, the back button) we adopt it during
  // render instead of in an effect.
  const [search, setSearch] = useState({ input: q, from: q })
  if (search.from !== q) setSearch({ input: q, from: q })
  const searchInput = search.input
  const setSearchInput = (v: string) => setSearch({ input: v, from: q })
  const [showFilters, setShowFilters] = useState(false)
  const page = Math.max(1, Number(params.get('page') ?? 1))

  const [exam, toggleExam] = useListParam('exam')
  const [year, toggleYear] = useListParam('year')
  const [subject, toggleSubject] = useListParam('subject')
  const [topic, toggleTopic] = useListParam('topic')
  const [type, toggleType] = useListParam('type')
  const [marks, toggleMarks] = useListParam('marks')
  const [section, toggleSection] = useListParam('section')

  useEffect(() => {
    if (searchInput === q) return
    const t = setTimeout(() => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (searchInput) next.set('q', searchInput)
          else next.delete('q')
          next.delete('page')
          return next
        },
        { replace: true },
      )
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput, q, setParams])

  const meta = useApi<GateMeta>(() => api.get<GateMeta>('/api/gate/meta'), [])

  const query = {
    q,
    exam: exam.join(','),
    year: year.join(','),
    subject: subject.join(','),
    topic: topic.join(','),
    type: type.join(','),
    marks: marks.join(','),
    section: section.join(','),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }
  const list = useApi<GateList>(
    () => api.get<GateList>('/api/gate/questions', { query }),
    [q, exam.join(), year.join(), subject.join(), topic.join(), type.join(), marks.join(), section.join(), page],
  )

  const setPage = (p: number) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (p > 1) next.set('page', String(p))
        else next.delete('page')
        return next
      },
      { replace: false },
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearAll = () => {
    setSearchInput('')
    setParams(new URLSearchParams(), { replace: true })
  }

  const exams = useMemo(() => {
    const set = new Set((meta.data?.papers ?? []).map((p) => p.exam))
    return [...set].map((e) => ({ id: e, label: `GATE ${e}` }))
  }, [meta.data])

  const years = useMemo(() => {
    const set = new Set((meta.data?.papers ?? []).map((p) => p.year))
    return [...set].sort((a, b) => b - a).map((y) => ({ id: String(y), label: String(y) }))
  }, [meta.data])

  // Subjects come from whichever exam blocks are in play.
  const subjectBlocks = useMemo(() => {
    const blocks = meta.data?.subjects
    if (!blocks) return []
    const useDA = exam.length === 1 && exam[0] === 'DA'
    const block = useDA ? blocks.DA : blocks.CSE
    return Object.entries(block).map(([id, s]) => ({ id, label: s.name, topics: s.topics }))
  }, [meta.data, exam])

  const topicOptions = useMemo(
    () =>
      subjectBlocks
        .filter((s) => subject.includes(s.id))
        .flatMap((s) => Object.entries(s.topics).map(([t, name]) => ({ id: `${s.id}/${t}`, label: name }))),
    [subjectBlocks, subject],
  )

  const activeCount =
    exam.length + year.length + subject.length + topic.length + type.length + marks.length + section.length + (q ? 1 : 0)

  const subjectName = (s: string) => subjectBlocks.find((b) => b.id === s)?.label ?? s
  const topicName = (s: string, t: string) => subjectBlocks.find((b) => b.id === s)?.topics[t]

  const total = list.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <PageHeader
        title="GATE question bank"
        subtitle={
          meta.data
            ? `${meta.data.total.toLocaleString()} questions from ${meta.data.papers.length} GATE CSE, IT and DA papers — every question transcribed from the original paper, classified by subject and topic, with worked answers.`
            : 'Past-year questions from every GATE CSE, IT and DA paper.'
        }
      />

      <div className="card mb-5 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="gate-search flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3">
            <Search className="size-4 shrink-0 text-text-muted" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder='Search questions — try "k-map", multiplexer, "page fault", 2'
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[14px] text-text-primary outline-none placeholder:text-text-muted"
              spellCheck={false}
            />
            {searchInput && (
              <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search" className="text-text-muted hover:text-text-primary">
                <X className="size-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
            className={cn('btn-secondary inline-flex items-center gap-1.5 !py-2 !text-[13px]', activeCount > 0 && '!border-accent-brand')}
          >
            <Filter className="size-4" /> Filters
            {activeCount > 0 && <span className="gate-pill-n">{activeCount}</span>}
          </button>
          {activeCount > 0 && (
            <button type="button" onClick={clearAll} className="btn-ghost !py-2 !text-[13px]">
              Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 grid gap-2.5 border-t border-border pt-3">
            <Pills label="Exam" options={exams} selected={exam} onToggle={toggleExam} />
            <Pills
              label="Subject"
              options={subjectBlocks.map((s) => ({ id: s.id, label: s.label }))}
              selected={subject}
              onToggle={toggleSubject}
              counts={list.data?.facets.subject}
            />
            {topicOptions.length > 0 && (
              <Pills label="Topic" options={topicOptions} selected={topic} onToggle={toggleTopic} />
            )}
            <Pills label="Year" options={years} selected={year} onToggle={toggleYear} counts={list.data?.facets.year} />
            <Pills
              label="Type"
              options={TYPES.map((t) => ({ id: t, label: TYPE_LABEL[t] }))}
              selected={type}
              onToggle={toggleType}
              counts={list.data?.facets.type}
            />
            <Pills
              label="Marks"
              options={[
                { id: '1', label: '1 mark' },
                { id: '2', label: '2 marks' },
                { id: '5', label: '5 marks' },
              ]}
              selected={marks}
              onToggle={toggleMarks}
            />
            <Pills
              label="Section"
              options={[
                { id: 'subject', label: 'Subject' },
                { id: 'ga', label: 'General Aptitude' },
              ]}
              selected={section}
              onToggle={toggleSection}
            />
          </div>
        )}
      </div>

      {meta.error && <ErrorState message={meta.error} />}
      {list.loading && !list.data ? (
        <LoadingBlock rows={6} />
      ) : list.error ? (
        <ErrorState message={list.error} />
      ) : total === 0 ? (
        <EmptyState
          icon={<SearchX className="size-8" />}
          title="No questions match"
          description="Try fewer filters, or a different search term."
        />
      ) : (
        <>
          <p className="mb-3 text-[13px] text-text-muted">
            {total.toLocaleString()} question{total === 1 ? '' : 's'}
            {pages > 1 && <> · page {page} of {pages}</>}
          </p>
          <div className="space-y-4">
            {list.data!.questions.map((x) => (
              <QuestionView
                key={x.id}
                q={x}
                subjectName={subjectName(x.subject)}
                topicName={topicName(x.subject, x.topic)}
              />
            ))}
          </div>

          {pages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pages">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-secondary inline-flex items-center gap-1 !py-2 !text-[13px] disabled:opacity-40">
                <ChevronLeft className="size-4" /> Previous
              </button>
              <span className="px-2 font-mono text-[12.5px] text-text-muted">
                {page} / {pages}
              </span>
              <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="btn-secondary inline-flex items-center gap-1 !py-2 !text-[13px] disabled:opacity-40">
                Next <ChevronRight className="size-4" />
              </button>
            </nav>
          )}
        </>
      )}

      {meta.data && (
        <p className="mt-8 text-center text-[12px] text-text-muted">
          Papers: {meta.data.papers.map(paperLabel).join(' · ')}
        </p>
      )}
    </div>
  )
}
