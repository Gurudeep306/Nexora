import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Timer } from 'lucide-react'
import { IconBadge } from '@/components/icon/Icon'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { useAgentPageContext } from '@/context/AgentContext'
import { GateFilterStudio, type GateFilters, type ViewMode } from '@/gate/GateFilterStudio'
import { GateFocusDeck } from '@/gate/GateFocusDeck'
import { GateBentoGrid } from '@/gate/GateBentoGrid'
import { useGateProgress } from '@/gate/progress'
import { type GateList, type GateMeta } from '@/gate/types'

const PAGE_SIZE = 25
const LIST_KEYS = ['exam', 'paper', 'year', 'subject', 'topic', 'type', 'marks', 'section'] as const

const splitList = (v: string | null) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean)

export default function GatePage() {
  const [params, setParams] = useSearchParams()
  const progress = useGateProgress()

  /* ── URL state ── */
  const f: GateFilters = {
    q: params.get('q') ?? '',
    exam: splitList(params.get('exam')),
    paper: splitList(params.get('paper')),
    year: splitList(params.get('year')),
    subject: splitList(params.get('subject')),
    topic: splitList(params.get('topic')),
    type: splitList(params.get('type')),
    marks: splitList(params.get('marks')),
    section: splitList(params.get('section')),
    hasFigure: params.get('hasFigure') ?? '',
    saved: params.get('saved') === '1',
    sort: params.get('sort') ?? 'year-desc',
  }
  const viewMode: ViewMode = params.get('view') === 'list' ? 'list' : 'practice'
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)
  const index = Math.max(0, Number(params.get('i') ?? 0) || 0)

  /** Apply several URL changes at once; any filter change resets paging. */
  const patch = useCallback(
    (p: Record<string, string | null>, opts: { keepPage?: boolean; push?: boolean } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(p)) {
            if (v === null || v === '') next.delete(k)
            else next.set(k, v)
          }
          if (!opts.keepPage) {
            next.delete('page')
            next.delete('i')
          }
          return next
        },
        { replace: !opts.push },
      )
    },
    [setParams],
  )
  const setList = (key: keyof GateFilters, vals: string[]) => patch({ [key]: vals.length ? vals.join(',') : null })
  const toggle = (key: keyof GateFilters, v: string) => {
    const cur = f[key] as string[]
    setList(key, cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v])
  }
  const setParam = (key: string, v: string | null) => patch({ [key]: v })

  /* Debounced search box ↔ ?q= */
  const [search, setSearch] = useState({ input: f.q, from: f.q })
  if (search.from !== f.q) setSearch({ input: f.q, from: f.q })
  const searchInput = search.input
  const setSearchInput = (v: string) => setSearch({ input: v, from: f.q })
  useEffect(() => {
    if (searchInput === f.q) return
    const t = setTimeout(() => patch({ q: searchInput || null }), 280)
    return () => clearTimeout(t)
  }, [searchInput, f.q, patch])

  useAgentPageContext({
    filters:
      [f.q && `search "${f.q}"`, f.exam.length && `exam ${f.exam.join('/')}`, f.paper.length && `paper ${f.paper.join(', ')}`, f.year.length && `year ${f.year.join(', ')}`, f.subject.length && `subject ${f.subject.join(', ')}`, f.topic.length && `topic ${f.topic.join(', ')}`, f.type.length && `type ${f.type.join(', ')}`, f.marks.length && `marks ${f.marks.join(', ')}`]
        .filter(Boolean)
        .join('; ') || undefined,
  })

  const meta = useApi<GateMeta>(() => api.get<GateMeta>('/api/gate/meta'), [], { cacheKey: 'gate:meta' })

  const savedIds = useMemo(
    () =>
      Object.entries(progress)
        .filter(([, p]) => p.bookmarked)
        .map(([id]) => id)
        .sort(),
    [progress],
  )
  const idsParam = f.saved ? savedIds.join(',') || '-' : ''

  // A single paper reads best in paper order.
  const sort = f.paper.length === 1 && !params.get('sort') ? 'year-asc' : f.sort
  const query: Record<string, string | number> = { q: f.q, hasFigure: f.hasFigure, sort, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }
  for (const k of LIST_KEYS) query[k] = (f[k] as string[]).join(',')
  if (idsParam) query.ids = idsParam
  const queryKey = JSON.stringify(query)

  const list = useApi<GateList>(() => api.get<GateList>('/api/gate/questions', { query }), [queryKey], { cacheKey: `gate:list:${queryKey}` })

  const total = list.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const questions = list.data?.questions ?? []

  const setPage = (p: number, at?: 'first' | 'last') => {
    patch({ page: p > 1 ? String(p) : null, i: at === 'last' ? String(PAGE_SIZE - 1) : null }, { keepPage: true, push: true })
    if (viewMode === 'list') window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const setIndex = (i: number) => patch({ i: i > 0 ? String(i) : null }, { keepPage: true })
  const setViewMode = (m: ViewMode) => patch({ view: m === 'list' ? 'list' : null }, { keepPage: true })
  const clearAll = () => {
    setSearchInput('')
    setParams(viewMode === 'list' ? new URLSearchParams({ view: 'list' }) : new URLSearchParams(), { replace: true })
  }

  /* Subject / topic display names (CSE names win; DA fills the gaps). */
  const allSubjectMap = useMemo(() => {
    const map = new Map<string, { label: string; topics: Record<string, string> }>()
    for (const stream of ['CSE', 'DA'] as const) {
      for (const [id, s] of Object.entries(meta.data?.subjects?.[stream] ?? {})) {
        const prev = map.get(id)
        map.set(id, { label: prev?.label ?? s.name, topics: { ...s.topics, ...(prev?.topics ?? {}) } })
      }
    }
    return map
  }, [meta.data])
  const subjectName = useCallback((s: string) => allSubjectMap.get(s)?.label ?? s.toUpperCase(), [allSubjectMap])
  const topicName = useCallback((s: string, t: string) => allSubjectMap.get(s)?.topics[t], [allSubjectMap])

  const attempted = Object.values(progress).filter((p) => p.outcome === 'correct' || p.outcome === 'wrong').length
  const solved = Object.values(progress).filter((p) => p.outcome === 'correct').length
  const paperTitle = f.paper.length === 1 ? meta.data?.papers.find((p) => p.id === f.paper[0]) : undefined

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-28">
      {/* ── Header ── */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconBadge name="gate" box="lg" boxClassName="hidden sm:inline-flex" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary sm:text-[28px]">GATE question bank</h1>
            <p className="mt-0.5 text-[13.5px] text-text-muted">
              {meta.data ? `${meta.data.total.toLocaleString()} past-year questions from ${meta.data.papers.length} papers, 1991–2026` : 'Past-year questions, 1991–2026'}
              {attempted > 0 && (
                <>
                  {' '}
                  · <span className="text-text-secondary">{solved} solved</span> of {attempted} attempted
                </>
              )}
            </p>
          </div>
        </div>
        <Link to="/gate/cbt" className="btn-secondary inline-flex items-center gap-2 !px-4 !py-2 !text-[13.5px]">
          <Timer className="size-4" /> Mock test
        </Link>
      </header>

      <GateFilterStudio
        f={f}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        setList={setList}
        toggle={toggle}
        setParam={setParam}
        patch={(p) => patch(p)}
        viewMode={viewMode}
        setViewMode={setViewMode}
        clearAll={clearAll}
        meta={meta.data}
        list={list.data}
        savedCount={savedIds.length}
      />

      {/* ── Results summary ── */}
      {list.data && total > 0 && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1 text-[13px] text-text-muted">
          <span>
            {paperTitle ? (
              <>
                <strong className="font-semibold text-text-primary">GATE {paperTitle.exam} {paperTitle.year}{paperTitle.set ? ` Set ${paperTitle.set}` : ''}</strong> · {total} questions
              </>
            ) : (
              <>
                <strong className="font-semibold text-text-primary">{total.toLocaleString()}</strong> question{total === 1 ? '' : 's'}
              </>
            )}
          </span>
          {paperTitle && (
            <Link to={`/gate/cbt/${paperTitle.id}`} className="text-[12.5px] font-medium text-accent-brand hover:underline">
              Take this paper as a timed mock →
            </Link>
          )}
        </div>
      )}

      {/* ── Workspace ── */}
      {meta.error && <ErrorState message={meta.error} onRetry={meta.refetch} />}
      {list.loading && !list.data ? (
        <LoadingBlock rows={6} />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.refetch} />
      ) : total === 0 ? (
        <div className="card">
          <EmptyState
            icon="search"
            title={f.saved ? 'No bookmarked questions here' : 'No questions match these filters'}
            description={f.saved ? 'Bookmark a question (B) while practising and it will show up here.' : 'Try a different subject or year range, or clear the search.'}
            action={
              <button type="button" onClick={clearAll} className="btn-secondary !px-4 !py-2 !text-[13px]">
                Clear filters
              </button>
            }
          />
        </div>
      ) : viewMode === 'practice' ? (
        <GateFocusDeck
          questions={questions}
          subjectName={subjectName}
          topicName={topicName}
          index={index}
          onIndex={setIndex}
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          loading={list.loading}
        />
      ) : (
        <div className="space-y-4">
          <GateBentoGrid
            questions={questions}
            subjectName={subjectName}
            topicName={topicName}
            offset={(page - 1) * PAGE_SIZE}
            loading={list.loading}
            onOpen={(i) => patch({ view: null, i: i > 0 ? String(i) : null }, { keepPage: true, push: true })}
          />
          {pages > 1 && (
            <nav className="flex items-center justify-between gap-3" aria-label="Pages">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-secondary inline-flex items-center gap-1 !px-3 !py-1.5 !text-[13px] disabled:opacity-40">
                <ChevronLeft className="size-4" /> Previous
              </button>
              <span className="font-mono text-[12.5px] text-text-muted">
                Page {page} of {pages}
              </span>
              <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="btn-secondary inline-flex items-center gap-1 !px-3 !py-1.5 !text-[13px] disabled:opacity-40">
                Next <ChevronRight className="size-4" />
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  )
}
