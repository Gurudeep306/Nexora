import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Play,
  RotateCcw,
  SearchX,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { GateFilterStudio, type ViewMode } from '@/gate/GateFilterStudio'
import { GateFocusDeck } from '@/gate/GateFocusDeck'
import { GateSplitStudio } from '@/gate/GateSplitStudio'
import { GateBentoGrid } from '@/gate/GateBentoGrid'
import { type GateList, type GateMeta } from '@/gate/types'

const PAGE_SIZE = 25

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
  const setDirect = useCallback(
    (vals: string[]) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (vals.length) next.set(key, vals.join(','))
          else next.delete(key)
          next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [key, setParams],
  )
  return [value, toggle, setDirect] as const
}

export default function GatePage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const sort = params.get('sort') ?? 'year-desc'
  const hasFigure = params.get('hasFigure') ?? ''

  // View Mode: default to 'focus' (Focus Deck) so user never sees endless big lists!
  const [viewMode, setViewMode] = useState<ViewMode>('focus')

  const [search, setSearch] = useState({ input: q, from: q })
  if (search.from !== q) setSearch({ input: q, from: q })
  const searchInput = search.input
  const setSearchInput = (v: string) => setSearch({ input: v, from: q })

  const page = Math.max(1, Number(params.get('page') ?? 1))

  const [exam, toggleExam, setExam] = useListParam('exam')
  const [paper] = useListParam('paper')
  const [year, toggleYear, setYear] = useListParam('year')
  const [subject, toggleSubject, setSubject] = useListParam('subject')
  const [topic, toggleTopic] = useListParam('topic')
  const [type, toggleType] = useListParam('type')
  const [marks, toggleMarks] = useListParam('marks')
  const [section] = useListParam('section')

  // Debounced search sync
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
    }, 280)
    return () => clearTimeout(t)
  }, [searchInput, q, setParams])

  const meta = useApi<GateMeta>(() => api.get<GateMeta>('/api/gate/meta'), [])

  const query = {
    q,
    exam: exam.join(','),
    paper: paper.join(','),
    year: year.join(','),
    subject: subject.join(','),
    topic: topic.join(','),
    type: type.join(','),
    marks: marks.join(','),
    section: section.join(','),
    hasFigure,
    sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }

  const list = useApi<GateList>(
    () => api.get<GateList>('/api/gate/questions', { query }),
    [q, exam.join(), paper.join(), year.join(), subject.join(), topic.join(), type.join(), marks.join(), section.join(), hasFigure, sort, page],
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

  const setSortOrder = (newSort: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('sort', newSort)
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const setFigureFilter = (fig: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (fig) next.set('hasFigure', fig)
        else next.delete('hasFigure')
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const clearAll = () => {
    setSearchInput('')
    setParams(new URLSearchParams(), { replace: true })
  }

  // Combined subject dictionary
  const allSubjectMap = useMemo(() => {
    const map = new Map<string, { id: string; label: string; topics: Record<string, string> }>()
    if (!meta.data?.subjects) return map

    for (const [id, s] of Object.entries(meta.data.subjects.CSE || {})) {
      map.set(id, { id, label: s.name, topics: s.topics })
    }
    for (const [id, s] of Object.entries(meta.data.subjects.DA || {})) {
      if (map.has(id)) {
        const existing = map.get(id)!
        map.set(id, {
          id,
          label: existing.label,
          topics: { ...existing.topics, ...s.topics },
        })
      } else {
        map.set(id, { id, label: s.name, topics: s.topics })
      }
    }
    return map
  }, [meta.data])

  const subjectName = (s: string) => allSubjectMap.get(s)?.label ?? s.toUpperCase()
  const topicName = (s: string, t: string) => allSubjectMap.get(s)?.topics[t]

  const total = list.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-0 duration-200">
      {/* ── Studio Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1.5 rounded-lg bg-accent-brand/15 px-2.5 py-0.5 text-[11px] font-bold text-accent-brand uppercase tracking-wider">
              <Sparkles className="size-3" /> Question Bank & Practice Tests
            </span>
            <span className="rounded-lg bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-mono font-bold text-emerald-400">
              1991–2026 PYQs & Mock Tests
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
            GATE Question Bank
          </h1>
          <p className="text-[13.5px] text-text-muted max-w-2xl mt-1">
            Official GATE PYQs and curated practice mock tests with verified step-by-step mathematical solutions, 30-second Topper's shortcuts, interactive animated visualizers, and HD vector schematics.
          </p>
        </div>

        {/* Real CBT Exam Mode Button */}
        <Link
          to="/gate/cbt"
          className="btn-primary inline-flex items-center gap-2 !px-5 !py-2.5 !text-[13.5px] font-bold shadow-lg shadow-accent-brand/25 transition-all hover:scale-105 cursor-pointer"
        >
          <Play className="size-4" /> Launch CBT Simulator Mode
        </Link>
      </div>

      {/* ── Brand New Filter Studio Console ── */}
      <GateFilterStudio
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        sort={sort}
        setSort={setSortOrder}
        viewMode={viewMode}
        setViewMode={setViewMode}
        exam={exam}
        toggleExam={toggleExam}
        setExam={setExam}
        year={year}
        toggleYear={toggleYear}
        setYear={setYear}
        subject={subject}
        toggleSubject={toggleSubject}
        setSubject={setSubject}
        topic={topic}
        toggleTopic={toggleTopic}
        type={type}
        toggleType={toggleType}
        marks={marks}
        toggleMarks={toggleMarks}
        hasFigure={hasFigure}
        setFigureFilter={setFigureFilter}
        clearAll={clearAll}
        meta={meta.data}
        list={list.data}
        total={total}
      />

      {/* ── Main Question Workspace ── */}
      {meta.error && <ErrorState message={meta.error} />}
      {list.loading && !list.data ? (
        <LoadingBlock rows={6} />
      ) : list.error ? (
        <ErrorState message={list.error} />
      ) : total === 0 ? (
        <div className="card p-10 text-center space-y-4 rounded-3xl border border-border/80">
          <EmptyState
            icon={<SearchX className="size-9 text-text-muted" />}
            title="No questions match your current filters"
            description="Try selecting a different subject, expanding your year range, or clearing the search query."
          />
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={clearAll}
              className="btn-primary inline-flex items-center gap-2 !py-2.5 !px-5 text-[13px] font-bold shadow-md cursor-pointer"
            >
              <RotateCcw className="size-4" /> Reset All Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* View Mode 1: Focus Deck (1 Question at a Time, Zero Big Lists) */}
          {viewMode === 'focus' && (
            <GateFocusDeck
              questions={list.data!.questions}
              subjectName={subjectName}
              topicName={topicName}
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}

          {/* View Mode 2: Split Studio (IDE Question Queue + Active Canvas) */}
          {viewMode === 'split' && (
            <GateSplitStudio
              questions={list.data!.questions}
              subjectName={subjectName}
              topicName={topicName}
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}

          {/* View Mode 3: Bento Grid Cards */}
          {viewMode === 'grid' && (
            <GateBentoGrid
              questions={list.data!.questions}
              subjectName={subjectName}
              topicName={topicName}
            />
          )}

          {/* Pagination Controls */}
          {pages > 1 && (
            <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-bg-surface-2/40 px-5 py-3 backdrop-blur-md">
              <span className="text-[12.5px] text-text-muted">
                Showing{' '}
                <strong className="text-text-primary">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
                </strong>{' '}
                of <strong className="text-text-primary">{total.toLocaleString()}</strong> questions
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="flex items-center gap-1 rounded-xl border border-border/80 bg-bg-surface px-3 py-1.5 text-[12px] font-bold text-text-primary hover:border-accent-brand disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="size-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1 font-mono text-[12px] text-text-muted px-2">
                  <span className="font-bold text-accent-brand">{page}</span>
                  <span>/</span>
                  <span>{pages}</span>
                </div>

                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() => setPage(page + 1)}
                  className="flex items-center gap-1 rounded-xl border border-border/80 bg-bg-surface px-3 py-1.5 text-[12px] font-bold text-text-primary hover:border-accent-brand disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </nav>
          )}
        </div>
      )}

      {/* Database Verification Stamp */}
      {meta.data && (
        <div className="text-center pt-4">
          <p className="text-[12px] text-text-muted font-medium">
            Nexora Verified GATE Corpus · {meta.data.total.toLocaleString()} past-year questions
            across {meta.data.papers.length} official papers (1991–2026).
          </p>
        </div>
      )}
    </div>
  )
}
