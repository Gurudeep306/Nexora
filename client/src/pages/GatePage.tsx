import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/icon/Icon'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { useAgentPageContext } from '@/context/AgentContext'
import { GateShell } from '@/gate/shell/GateShell'
import { GATE_ROUTES } from '@/gate/api'
import { GateFilterStudio, type GateFilters, type ViewMode } from '@/gate/GateFilterStudio'
import { GateFocusDeck } from '@/gate/GateFocusDeck'
import { GateBentoGrid } from '@/gate/GateBentoGrid'
import { todayISO, useGateBackend, useGateProgress, type QProgress } from '@/gate/progress'
import { estimateDifficulty } from '@/gate/tests/testsData'
import { SessionSummary } from '@/gate/practice/SessionSummary'
import { usePracticeSession } from '@/gate/practice/session'
import { paperLabel, qLabel, type GateList, type GateMeta } from '@/gate/types'

const PAGE_SIZE = 25
const LIST_KEYS = ['exam', 'paper', 'year', 'subject', 'topic', 'type', 'marks', 'section'] as const
const FOCUS_KEY = 'nexora:gate-focus-mode'

const splitList = (v: string | null) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean)

/** Which ids match a status filter (from your progress). */
function statusIds(progress: Record<string, QProgress>, status: string): string[] | null {
  const today = todayISO()
  const test: Record<string, (p: QProgress) => boolean> = {
    correct: (p) => p.outcome === 'correct',
    wrong: (p) => p.outcome === 'wrong' || p.outcome === 'revealed' || p.outcome === 'partial',
    bookmarked: (p) => !!p.bookmarked,
    note: (p) => !!p.hasNote,
    due: (p) => !!p.review?.due && p.review.due <= today,
  }
  const f = test[status]
  if (!f) return null
  return Object.entries(progress)
    .filter(([, p]) => f(p))
    .map(([id]) => id)
    .sort()
}

/**
 * "Unseen" can't be asked of the server (it doesn't know this device's
 * history), so walk the filtered list in pages of 100 and skip seen ones.
 */
async function fetchUnseen(query: Record<string, string | number>, seen: Set<string>, page: number): Promise<GateList> {
  const want = page * PAGE_SIZE
  const out: GateList['questions'] = []
  const seenIds = [...seen].slice(0, 500)
  // How many of the filtered questions you've seen → the unseen total.
  const overlap = seenIds.length
    ? api.get<GateList>('/api/gate/questions', { query: { ...query, ids: seenIds.join(','), limit: 1, offset: 0 } }).then((r) => r.total).catch(() => 0)
    : Promise.resolve(0)
  let offset = 0
  let first: GateList | null = null
  for (let guard = 0; guard < 40; guard++) {
    const r = await api.get<GateList>('/api/gate/questions', { query: { ...query, limit: 100, offset } })
    first ??= r
    for (const q of r.questions) if (!seen.has(q.id)) out.push(q)
    offset += 100
    if (out.length >= want || offset >= r.total) break
  }
  const base = first as GateList
  const total = Math.max(out.length, base.total - (await overlap))
  return { ...base, total, offset: (page - 1) * PAGE_SIZE, questions: out.slice((page - 1) * PAGE_SIZE, want) }
}

export default function GatePage() {
  const [params, setParams] = useSearchParams()
  const progress = useGateProgress()
  const backend = useGateBackend()
  const session = usePracticeSession()

  /* ── URL state ── */
  const legacySaved = params.get('saved') === '1'
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
    saved: legacySaved,
    status: params.get('status') ?? (legacySaved ? 'bookmarked' : ''),
    sort: params.get('sort') ?? 'year-desc',
  }
  const customIds = splitList(params.get('ids')).slice(0, 500)
  const viewMode: ViewMode = params.get('view') === 'list' ? 'list' : 'practice'
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)
  const index = Math.max(0, Number(params.get('i') ?? 0) || 0)

  const [focus, setFocusState] = useState(() => {
    try {
      return localStorage.getItem(FOCUS_KEY) === '1'
    } catch {
      return false
    }
  })
  const setFocus = useCallback((v: boolean) => {
    setFocusState(v)
    try {
      localStorage.setItem(FOCUS_KEY, v ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

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

  // F toggles focus mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.closest('input, textarea, select, [contenteditable="true"]') || t.closest('[role="dialog"]'))) return
      if ((e.key === 'f' || e.key === 'F') && viewMode === 'practice') {
        e.preventDefault()
        setFocus(!focus)
      } else if (e.key === 'Escape' && focus) setFocus(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, setFocus, viewMode])

  useAgentPageContext({
    filters:
      [f.q && `search "${f.q}"`, f.exam.length && `exam ${f.exam.join('/')}`, f.paper.length && `paper ${f.paper.join(', ')}`, f.year.length && `year ${f.year.join(', ')}`, f.subject.length && `subject ${f.subject.join(', ')}`, f.topic.length && `topic ${f.topic.join(', ')}`, f.type.length && `type ${f.type.join(', ')}`, f.marks.length && `marks ${f.marks.join(', ')}`, f.status && `status ${f.status}`]
        .filter(Boolean)
        .join('; ') || undefined,
  })

  const meta = useApi<GateMeta>(() => api.get<GateMeta>('/api/gate/meta'), [], { cacheKey: 'gate:meta' })

  /* Status filter → id list (the server filters by ids). */
  const statusCounts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const s of ['correct', 'wrong', 'note', 'due']) out[s] = statusIds(progress, s)?.length ?? 0
    out.unseen = 0
    return out
  }, [progress])
  const savedCount = useMemo(() => Object.values(progress).filter((p) => p.bookmarked).length, [progress])
  const byStatus = f.status && f.status !== 'unseen' ? statusIds(progress, f.status) : null
  // Freeze the id set while practising so answering doesn't pull questions out from under you.
  const statusKey = byStatus ? byStatus.join(',') : ''
  const [frozen, setFrozen] = useState<{ status: string; ids: string }>({ status: '', ids: '' })
  if (f.status && f.status !== 'unseen' && frozen.status !== f.status) setFrozen({ status: f.status, ids: statusKey })
  if (!f.status && frozen.status) setFrozen({ status: '', ids: '' })
  const statusIdList = f.status && f.status !== 'unseen' ? frozen.ids || statusKey : ''

  let idsParam = ''
  if (customIds.length) idsParam = customIds.join(',')
  if (f.status && f.status !== 'unseen') {
    const set = statusIdList ? statusIdList.split(',') : []
    const both = customIds.length ? set.filter((x) => customIds.includes(x)) : set
    idsParam = both.slice(0, 500).join(',') || '-'
  }

  // A single paper reads best in paper order.
  const difficultySort = f.sort.startsWith('difficulty')
  const serverSort = difficultySort ? (f.sort === 'difficulty-desc' ? 'marks-desc' : 'marks-asc') : f.paper.length === 1 && !params.get('sort') ? 'year-asc' : f.sort
  const query: Record<string, string | number> = { q: f.q, hasFigure: f.hasFigure, sort: serverSort, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }
  for (const k of LIST_KEYS) query[k] = (f[k] as string[]).join(',')
  if (idsParam) query.ids = idsParam
  const unseen = f.status === 'unseen'
  const [seenSnapshot, setSeenSnapshot] = useState<{ on: boolean; ids: Set<string> }>({ on: false, ids: new Set() })
  if (unseen && !seenSnapshot.on) setSeenSnapshot({ on: true, ids: new Set(Object.keys(progress).filter((id) => (progress[id].attempts ?? 0) > 0 || progress[id].outcome)) })
  if (!unseen && seenSnapshot.on) setSeenSnapshot({ on: false, ids: new Set() })
  const queryKey = JSON.stringify(query) + (unseen ? `:unseen:${seenSnapshot.ids.size}` : '')

  const list = useApi<GateList>(
    () => (unseen ? fetchUnseen({ ...query, limit: 100, offset: 0 }, seenSnapshot.ids, page) : api.get<GateList>('/api/gate/questions', { query })),
    [queryKey],
    { cacheKey: `gate:list:${queryKey}` },
  )

  const total = list.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const questions = useMemo(() => {
    const qs = list.data?.questions ?? []
    if (!difficultySort) return qs
    const dir = f.sort === 'difficulty-desc' ? -1 : 1
    return [...qs].sort((a, b) => (estimateDifficulty(a) - estimateDifficulty(b)) * dir)
  }, [list.data, difficultySort, f.sort])

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

  const onAttempt = useCallback(
    (e: Parameters<typeof session.add>[0]) => {
      const q = questions.find((x) => x.id === e.questionId)
      session.add(e, q ? `${paperLabel(q).replace('GATE ', '')} ${qLabel(q)}` : undefined)
    },
    [questions, session],
  )

  const subtitle = meta.data
    ? `${meta.data.total.toLocaleString()} past-year questions from ${meta.data.papers.length} papers, 1991–2026${attempted ? ` · ${solved} solved of ${attempted} attempted` : ''}`
    : 'Past-year questions, 1991–2026'

  const actions = (
    <div className="flex items-center gap-2">
      {viewMode === 'practice' && (
        <button
          type="button"
          onClick={() => setFocus(!focus)}
          aria-pressed={focus}
          className={cn('btn-secondary inline-flex items-center gap-2 !px-3 !py-2 !text-[13px]', focus && '!border-accent-brand !text-accent-brand')}
          title="Focus mode (F)"
        >
          <Icon name="crosshair" className="size-4" />
          <span className="hidden sm:inline">{focus ? 'Exit focus' : 'Focus'}</span>
        </button>
      )}
      <Link to={GATE_ROUTES.tests} aria-label="Tests" className="btn-secondary inline-flex items-center gap-2 !px-3 !py-2 !text-[13px]">
        <Icon name="timer" className="size-4" /> <span className="hidden sm:inline">Tests</span>
      </Link>
    </div>
  )

  return (
    <GateShell title="Practice" subtitle={subtitle} actions={actions}>
      <div className="space-y-5 pb-28">
        {!focus && (
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
            savedCount={savedCount}
            statusCounts={statusCounts}
          />
        )}

        {customIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent-brand/30 bg-accent-brand/8 px-3.5 py-2 text-[13px] text-text-secondary">
            <Icon name="layers" className="size-4 text-accent-brand" />
            <span>
              Practising a set of <strong className="font-semibold text-text-primary">{customIds.length}</strong> question{customIds.length === 1 ? '' : 's'}
            </span>
            <button type="button" onClick={() => patch({ ids: null })} className="ml-auto text-[12.5px] font-medium text-accent-brand hover:underline">
              Back to the whole bank
            </button>
          </div>
        )}

        {backend === 'down' && attempted > 0 && !focus && (
          <p className="px-1 text-[12px] text-text-muted">
            <Icon name="info" className="mr-1 inline size-3.5 align-[-2px]" />
            Progress is being saved on this device and will sync to your account when it can.
          </p>
        )}

        {/* ── Results summary ── */}
        {list.data && total > 0 && !focus && (
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-1 text-[13px] text-text-muted">
            <span>
              {paperTitle ? (
                <>
                  <strong className="font-semibold text-text-primary">
                    GATE {paperTitle.exam} {paperTitle.year}
                    {paperTitle.set ? ` Set ${paperTitle.set}` : ''}
                  </strong>{' '}
                  · {total} questions
                </>
              ) : (
                <>
                  <strong className="font-semibold text-text-primary">{total.toLocaleString()}</strong> question{total === 1 ? '' : 's'}
                  {unseen && ' not attempted yet'}
                </>
              )}
            </span>
            {paperTitle ? (
              <Link to={`${GATE_ROUTES.cbt}/${paperTitle.id}`} className="text-[12.5px] font-medium text-accent-brand hover:underline">
                Take this paper as a timed mock →
              </Link>
            ) : (
              f.subject.length > 0 && (
                <Link to={`${GATE_ROUTES.tests}?subject=${f.subject.join(',')}${f.topic.length ? `&topic=${f.topic.join(',')}` : ''}`} className="text-[12.5px] font-medium text-accent-brand hover:underline">
                  Make a timed test from these →
                </Link>
              )
            )}
          </div>
        )}

        {/* ── Workspace ── */}
        {meta.error && <ErrorState message={meta.error} onRetry={meta.refetch} />}
        {list.loading && !list.data ? (
          <LoadingBlock rows={6} />
        ) : list.error ? (
          <ErrorState message={list.error} onRetry={list.refetch} />
        ) : total === 0 || questions.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={f.status === 'due' ? 'calendar' : f.status === 'bookmarked' ? 'bookmark' : 'search'}
              title={
                f.status === 'bookmarked'
                  ? 'No bookmarked questions here'
                  : f.status === 'note'
                    ? 'No notes yet'
                    : f.status === 'due'
                      ? 'Nothing due for review'
                      : f.status === 'wrong'
                        ? 'No mistakes here'
                        : f.status === 'unseen'
                          ? 'You’ve attempted everything here'
                          : 'No questions match these filters'
              }
              description={
                f.status === 'bookmarked'
                  ? 'Bookmark a question (B) while practising and it will show up here.'
                  : f.status === 'note'
                    ? 'Press N on any question to jot down the key idea.'
                    : f.status
                      ? 'Try another status or widen the filters.'
                      : 'Try a different subject or year range, or clear the search.'
              }
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
            focus={focus}
            onAttempt={onAttempt}
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
      <SessionSummary events={session.events} onReset={session.reset} />
    </GateShell>
  )
}
