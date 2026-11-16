import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, ChevronRight, Lock, RefreshCw, RotateCcw } from 'lucide-react'
import { Button, Card, CardContent, ErrorState, LoadingBlock, RankGlyph, SubjectRankGlyph, Tabs } from '@/components/ui'
import { prefetchApi, useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useAgentPageContext } from '@/context/AgentContext'
import { cn, formatNumber } from '@/lib/utils'
import { SkillGraph } from '@/components/nexus/SkillGraph'
import { WeeklyPool } from '@/components/nexus/WeeklyPool'
import { TitleTrack } from '@/components/nexus/TitleTrack'
import { WebLeaderboard } from '@/components/nexus/WebLeaderboard'
import { useReviewList } from '@/components/nexus/NodeContent'
import { notesApi, useNotesSubjects } from '@/gate/notes/api'
import { loadProgress, loadTree, progressNow, quickNexus, treeNow } from '@/components/nexus/subjectTree'
import { NexusPalette } from '@/components/nexus/NexusPalette'
import { GoalMenu, useGoal, usePaletteHotkey } from '@/components/nexus/extras'
import { HistorySpark, StudyPlanView, SubjectMiniMap } from '@/components/nexus/SubjectExtras'
import { SubjectContents } from '@/components/nexus/SubjectContents'
import { DsaBook, NotesBook } from '@/components/nexus/SubjectBook'
import { fmtMinutes, nextLesson, studyPlan } from '@/components/nexus/insights'
import type { NodeInsight } from '@/components/nexus/NodeExtras'
import { useToast } from '@/components/ui'
import { subjectHref } from '@/components/nexus/course'
import { cachedState, cachedStructure, fetchNexusPath, fetchRoadmap, loadWeb, mergeWeb, nexusPathKey, ROADMAP_KEY } from '@/components/nexus/data'
import type { CrossLink, NexusNode, NexusStatsResponse, NexusWebStructure } from '@/components/nexus/types'

/*
 * A subject's one page — its course tree: /learn/<id> (/learn/dsa for DSA).
 * The hero (name, stream, rank, Continue), the tree with its zones, goal
 * steps and review rings, a chapter overview and what it needs from other
 * subjects. Opening a node "blooms" its lesson in place: the camera flies
 * into the node, the tree folds into a path rail and the lesson fills the
 * page (/learn/<id>/<node>, /learn/dsa/skill/<node>).
 */

/* The lesson (notes reader, KaTeX, Markdown) is its own chunk: the tree never waits for it. */
const loadLesson = () => import('@/components/nexus/CourseLesson')
const CourseLesson = lazy(() => loadLesson().then((m) => ({ default: m.CourseLesson })))

/** The last bloom: which node opened, from where (to zoom back out to it). */
const bloom: { subject: string | null; node: string | null; origin: string } = { subject: null, node: null, origin: '50% 30%' }

/** The subject and node from the route (/learn/dsa has no subject: it is DSA). */
function useSubjectRoute() {
  const { subject, node } = useParams()
  const { pathname } = useLocation()
  return { subject: subject ?? (pathname.startsWith('/learn/dsa') ? 'dsa' : ''), node: node ?? null }
}

type Tab = 'lessons' | 'contents' | 'tree' | 'plan' | 'ranks' | 'board'
const VIEWS: Tab[] = ['lessons', 'contents', 'tree', 'plan', 'ranks', 'board']

export default function SubjectPage() {
  const { subject, node: nodeParam } = useSubjectRoute()
  const reduce = useReducedMotion()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const username = user?.username ?? ''
  // The written lessons by default (the skill list where a subject has none);
  // ?view=tree opens the skill tree, ?view=contents the skills.
  const [tabPick, setTab] = useState<Tab>(() => (VIEWS.includes(new URLSearchParams(location.search).get('view') as Tab) ? (new URLSearchParams(location.search).get('view') as Tab) : 'lessons'))
  const [revision, setRevision] = useState(false)
  const toast = useToast()

  // The structure (streams, colours, cross links, goal routes): device first.
  const [structure, setStructure] = useState<NexusWebStructure | null>(() => cachedStructure())
  useEffect(() => {
    loadWeb(false)
      .then(({ structure: s }) => setStructure(s))
      .catch(() => {})
  }, [])
  const cluster = structure?.clusters.find((c) => c.id === subject) ?? null
  const stream = structure?.streams?.find((s) => s.id === (cluster?.stream ?? cluster?.domain))
  const hueOf = useMemo(() => {
    const hue = new Map((structure?.streams ?? []).map((x) => [x.id, x.hue]))
    const of = new Map((structure?.clusters ?? []).map((c) => [c.id, hue.get(c.stream ?? c.domain)]))
    return (id: string) => of.get(id)
  }, [structure])

  // The tree paints at once from the device (memory, the cached structure,
  // IndexedDB), the reader's numbers fill the rings from a tiny request, and
  // the full response (lesson metrics, review memory, cross links) follows.
  const [treeTick, setTreeTick] = useState(0)
  const tree = useMemo(() => (subject ? treeNow(subject) : null), [subject, treeTick]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!subject) return
    let live = true
    loadTree(subject).then((t) => live && t && setTreeTick((x) => x + 1))
    return () => {
      live = false
    }
  }, [subject])
  const progApi = useApi(() => loadProgress(subject), [subject], { cacheKey: `nexus:progress:${subject}`, skip: !subject })
  const prog = progApi.data ?? (subject ? progressNow(subject, username) : null)
  const quick = useMemo(() => (tree && tree.subject.id === subject ? quickNexus(tree, prog) : null), [tree, prog, subject])
  const { data: raw, loading, error, refetch } = useApi(() => fetchNexusPath(subject), [subject], { cacheKey: nexusPathKey(subject), skip: !subject })
  // Only this subject's own skills and links: other subjects are "Needs · X".
  const full = useMemo(() => {
    if (!raw || raw.subject?.id !== subject) return null
    const own = raw.nodes.filter((n) => !n.subject || n.subject === subject)
    const ids = new Set(own.map((n) => n.id))
    return { ...raw, nodes: own.map((n) => ({ ...n, requires: n.requires.filter((r) => ids.has(r)) })) }
  }, [raw, subject])
  const nexus = full ?? quick
  // About to open a node: its content, its GATE notes lesson and the lesson chunk.
  const prefetchLesson = useCallback(
    (id: string) => {
      void loadLesson().catch(() => {})
      prefetchApi(`nexus:content:${subject}:${id}`, () => api.get(`/api/nexus/content/${subject}/${id}`))
      const ls = full?.nodes.find((n) => n.id === id)?.metric?.lessons
      if (ls?.ids[0]) prefetchApi(`gate:notes:lesson:${ls.subject}/${ls.ids[0]}`, () => notesApi.lesson(ls.subject, ls.ids[0]))
    },
    [subject, full],
  )
  // Warm the lesson chunk once the tree is up.
  useEffect(() => {
    const idle = (cb: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(cb, { timeout: 2500 }) : setTimeout(cb, 800))
    idle(() => void loadLesson().catch(() => {}))
  }, [])
  const isDsa = (nexus?.subject?.engine ?? (subject === 'dsa' ? 'dsa' : null)) === 'dsa'
  // Insights (time, weightage, peers, your notes, history) and the exam date.
  const insightsApi = useApi<{ ok: boolean; nodes: Record<string, NodeInsight>; zones: Record<string, number>; remainingMin: number; notes: Record<string, { note: string; bookmarked: boolean }>; history: { day: string; p: number }[] }>(
    () => api.get(`/api/nexus/insights/${subject}`),
    [subject],
    { cacheKey: `nexus:insights:${subject}`, skip: !subject },
  )
  const ins = insightsApi.data
  const planApi = useApi<{ ok: boolean; plan: { examDate?: string | null } | null }>(() => api.get('/api/gate/me/plan'), [], { cacheKey: 'gate:me:plan' })
  const examDate = planApi.data?.plan?.examDate ?? null
  const notesOpen = useNotesSubjects()
  const [notesLocal, setNotesLocal] = useState<Record<string, { note: string; bookmarked: boolean }>>({})
  const roadmapApi = useApi(fetchRoadmap, [], { cacheKey: ROADMAP_KEY, skip: !isDsa })
  const statsApi = useApi<NexusStatsResponse>(() => api.get<NexusStatsResponse>('/api/stats', { query: { username: username || undefined } }), [username], {
    cacheKey: `stats:${username}`,
  })

  // The open node lives in the path (/learn/<id>/<node>).
  const selectedId = nodeParam
  const subjRef = useMemo(() => ({ id: subject, engine: isDsa ? ('dsa' as const) : null }), [subject, isDsa])
  // The bloom: the camera flies into the node it opens — the tree zooms in
  // on it and fades as the lesson unfolds — and back out to it on return.
  const treeRef = useRef<HTMLDivElement>(null)
  const [returning] = useState(() => (bloom.subject === subject && bloom.node ? bloom : null))
  const setSelectedId = useCallback(
    (id: string | null) => {
      const to = subjectHref(subjRef, id)
      const el = id ? document.getElementById(`nx-node-${id}`) : null
      const tree = treeRef.current
      if (!el || !tree) return navigate(to)
      const r = el.getBoundingClientRect()
      const t = tree.getBoundingClientRect()
      const origin = `${Math.round(r.left + r.width / 2 - t.left)}px ${Math.round(r.top + 32 - t.top)}px`
      Object.assign(bloom, { subject, node: id, origin })
      if (reduce || typeof tree.animate !== 'function') return navigate(to)
      tree.style.transformOrigin = origin
      const a = tree.animate(
        [
          { transform: 'scale(1)', opacity: 1, filter: 'blur(0px)' },
          { transform: 'scale(1.7)', opacity: 0, filter: 'blur(2px)' },
        ],
        { duration: 320, easing: 'cubic-bezier(0.55, 0, 0.3, 1)', fill: 'forwards' },
      )
      let gone = false
      const go = () => {
        if (gone) return
        gone = true
        navigate(to)
      }
      a.onfinish = go
      window.setTimeout(go, 420)
    },
    [navigate, subjRef, subject, reduce],
  )
  const selectedNode = useMemo(() => nexus?.nodes.find((n) => n.id === selectedId) ?? null, [nexus, selectedId])
  useEffect(() => {
    if (selectedId) {
      Object.assign(bloom, { subject, node: selectedId })
      return
    }
    // Back on the tree: the node you came from, in view.
    const id = returning?.node
    if (!id) return
    const t = window.setTimeout(() => document.getElementById(`nx-node-${id}`)?.scrollIntoView({ block: 'center', behavior: 'auto' }), 30)
    return () => window.clearTimeout(t)
  }, [selectedId, subject, returning])

  // Goal steps, review rings (due or marked), ⌘K.
  const webClusters = useMemo(() => (structure ? mergeWeb(structure, cachedState(username)) : null), [structure, username])
  const { goal, plan, setGoal } = useGoal(structure?.routes ?? [], webClusters)
  const own = useCallback((k: string) => (k.startsWith(`${subject}:`) ? k.slice(subject.length + 1) : null), [subject])
  const steps = useMemo(() => {
    if (!plan || !nexus) return undefined
    const st = new Map(nexus.nodes.map((n) => [n.id, n]))
    const mine = plan.order.map(own).filter((x): x is string => !!x && !st.get(x)?.completed)
    return [...mine.filter((id) => st.get(id)?.unlocked), ...mine.filter((id) => !st.get(id)?.unlocked)].slice(0, 5)
  }, [plan, nexus, own])
  const highlight = useMemo(() => (plan ? new Set([...plan.keys].map(own).filter((x): x is string => !!x)) : undefined), [plan, own])
  const review = useReviewList()
  const due = useMemo(() => {
    const out = new Set<string>()
    const day = 86400000
    for (const n of nexus?.nodes ?? []) {
      const m = (n as { memory?: { lastAt: number; interval: number } | null }).memory
      if (n.completed && m?.lastAt && (Date.now() - m.lastAt) / day >= Math.max(3, m.interval || 0)) out.add(n.id)
      if (review.has(`${subject}:${n.id}`)) out.add(n.id)
    }
    return out
  }, [nexus, review, subject])
  const [paletteOpen, setPaletteOpen] = useState(false)
  usePaletteHotkey(() => setPaletteOpen(true))

  // Continue: the open skill you are furthest into (nearest the start).
  const nextNode = useMemo(() => {
    let best: NexusNode | null = null
    for (const n of nexus?.nodes ?? []) {
      if (!n.unlocked || n.completed) continue
      if (!best || n.progress > best.progress || (n.progress === best.progress && n.zone < best.zone)) best = n
    }
    return best
  }, [nexus])

  // What this subject needs from others (from the structure's cross links).
  const needs = useMemo(() => {
    const count = new Map<string, number>()
    for (const n of cluster?.nodes ?? []) for (const x of n.cx ?? []) count.set(x.split(':')[0], (count.get(x.split(':')[0]) ?? 0) + 1)
    return [...count].sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ c: structure?.clusters.find((x) => x.id === id), n })).filter((x) => !!x.c)
  }, [cluster, structure])

  const refreshAll = useCallback(() => {
    refetch()
    progApi.refetch()
    insightsApi.refetch()
    loadWeb(true)
      .then(({ structure: s }) => setStructure(s))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch])
  const onJump = useCallback(
    (l: CrossLink) => {
      if (l.subject === subject) setSelectedId(l.id)
      else {
        const c = structure?.clusters.find((x) => x.id === l.subject)
        navigate(c ? subjectHref(c, l.id) : `/learn/${l.subject}#${l.id}`)
      }
    },
    [subject, setSelectedId, structure, navigate],
  )

  useAgentPageContext({
    label: selectedNode ? `${nexus?.subject?.short ?? subject} · ${selectedNode.name}` : (nexus?.subject?.name ?? 'Subject'),
    visibleText: nexus
      ? [
          `Subject page: ${nexus.subject?.name}. ${nexus.subjectRank ? `Rank ${nexus.subjectRank.tier} (${nexus.subjectRank.title}), ${nexus.subjectRank.progress}%.` : ''}`,
          `Zones: ${nexus.zones.map((z) => `${z.level}. ${z.name} ${z.zoneProgress}%`).join('; ')}`,
          selectedNode ? `Open node: ${selectedNode.name} — ${selectedNode.progress}% (${selectedNode.completed ? 'mastered' : selectedNode.unlocked ? 'open' : 'locked'}).` : '',
        ]
          .filter(Boolean)
          .join('\n')
      : undefined,
  })

  if (!subject) return <Navigate to="/nexus" replace />
  const legacy = !nodeParam && location.hash.length > 1 ? decodeURIComponent(location.hash.slice(1)) : null
  if (legacy && !legacy.startsWith('n-')) return <Navigate to={subjectHref(subjRef, legacy)} replace />
  if (structure && !cluster && !loading) return <Navigate to="/nexus" replace />

  const loadingView = (
    <div aria-busy="true">
      <div className="mb-6 space-y-3">
        <div className="nx-skel h-4 w-40 rounded" />
        <div className="nx-skel h-9 w-72 max-w-full rounded" />
        <div className="nx-skel h-4 w-[32rem] max-w-full rounded" />
      </div>
      <div className="nx-skel h-[520px] rounded-2xl" />
    </div>
  )
  if (!nexus) return error ? <ErrorState message={error} onRetry={refetch} /> : loadingView

  const { player, zones, nodes } = nexus
  const rank = nexus.subjectRank
  const done = nodes.filter((n) => n.completed).length
  const pct = isDsa ? Math.round((done / Math.max(1, nodes.length)) * 100) : (rank?.progress ?? 0)
  const selZone = selectedNode ? zones.find((z) => z.level === selectedNode.zone) : null
  const notesHref = cluster?.gate?.notes && notesOpen.data?.some((x) => x.id === cluster.gate!.notes) ? `/gate/notes/${cluster.gate.notes}` : null
  const notesId = notesHref ? cluster!.gate!.notes! : null
  const hasBook = isDsa || !!notesId
  const tab: Tab = tabPick === 'lessons' && !hasBook ? 'contents' : tabPick
  const roadmap = roadmapApi.data
  const currentZone = isDsa ? player.level : (zones.find((z) => z.current)?.level ?? 1)
  const minutes = Object.fromEntries(Object.entries(ins?.nodes ?? {}).map(([id, x]) => [id, x.min]))
  const weight = Object.fromEntries(Object.entries(ins?.nodes ?? {}).map(([id, x]) => [id, x.w?.marks ?? 0]))
  const names = Object.fromEntries(nodes.map((n) => [n.id, n.name]))
  const planNodes = nodes.map((n) => ({ id: n.id, requires: n.requires, completed: n.completed, progress: n.progress }))
  const todayFirst = ins ? studyPlan(planNodes, minutes, weight, new Date(), 60).days[0]?.items[0]?.id ?? null : null
  const dueIds = [...due]

  const lessonView = selectedNode ? (
    <motion.div
      key={`lesson:${selectedNode.id}`}
      initial={reduce ? false : { opacity: 0.6, scale: 0.985, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 240, damping: 30 }}
    >
      {/* Nexus › Stream › Subject › Chapter */}
      <nav aria-label="Where you are" className="mb-5 flex flex-wrap items-center gap-1 text-[12px] text-text-muted">
        <Link to="/nexus" className="hover:text-text-primary">
          Nexus
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="font-semibold" style={stream ? { color: stream.hue } : undefined}>
          {stream?.name ?? 'Stream'}
        </span>
        <ChevronRight className="size-3" aria-hidden="true" />
        <Link to={subjectHref(subjRef)} className="text-text-primary hover:underline">
          {nexus.subject?.name}
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span>{selZone?.name ?? `Zone ${selectedNode.zone}`}</span>
      </nav>
      <Suspense fallback={<div className="nx-skel h-[60vh] rounded-2xl" aria-busy="true" />}>
      <CourseLesson
        key={selectedNode.id}
        subject={subject}
        subjectName={nexus.subject?.name ?? subject}
        subjectHref={subjectHref(subjRef)}
        nodeHref={(id) => subjectHref(subjRef, id)}
        node={selectedNode}
        nodes={nodes}
        zoneName={selZone?.name ?? `Zone ${selectedNode.zone}`}
        zoneColor={selZone?.color ?? 'var(--color-primary)'}
        isDsa={isDsa}
        isGate={!!cluster?.gate}
        insight={ins?.nodes[selectedNode.id] ?? null}
        minutes={minutes}
        note={notesLocal[selectedNode.id] ?? ins?.notes[selectedNode.id] ?? null}
        onNoteSaved={(v) => setNotesLocal((m) => ({ ...m, [selectedNode.id]: v }))}
        nextId={nextLesson(nodes, selectedNode.id, steps ?? [])}
        onMastered={refreshAll}
        onJump={onJump}
        hueOf={hueOf}
        goTo={(id) => setSelectedId(id)}
      />
      </Suspense>
    </motion.div>
  ) : null

  return (
    <>
    <AnimatePresence mode="wait">
    {lessonView ?? (
    <motion.div
      key="tree"
      ref={treeRef}
      style={{ transformOrigin: returning?.origin ?? '50% 30%' }}
      initial={reduce ? false : returning ? { opacity: 0.5, scale: 1.25 } : (location.state as { fromNexus?: boolean } | null)?.fromNexus ? { scale: 0.94, opacity: 0.85 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.6 }}
      transition={{ duration: reduce ? 0.15 : 0.34, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Nexus › Stream › Subject */}
      <nav aria-label="Where you are" className="ed-ui-sm ed-muted mb-8 flex flex-wrap items-center gap-1.5">
        <Link to="/nexus" className="ed-link">
          Nexus
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span>{stream?.name ?? 'Stream'}</span>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="ed-ink" aria-current="page">
          {nexus.subject?.name}
        </span>
      </nav>

      {/* Header: kicker, serif title, lead, progress, the one clay action */}
      <header className="mb-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className="ed-label ed-muted m-0">{stream?.name ?? (isDsa ? 'The DSA course' : 'Subject')}</p>
          <h1 className="ed-title mt-3 mb-0">{nexus.subject?.name}</h1>
          {nexus.subject?.description && <p className="ed-lead mt-3 mb-0 max-w-[68ch]">{nexus.subject.description}</p>}
          <div className="mt-6">
            <span className={cn('sx-progress', pct >= 100 && 'is-done')} aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </span>
            <p className="ed-mono ed-muted mt-2 mb-0 text-[12px]">
              {done} of {nodes.length} skills mastered · {pct}%
              {ins ? ` · about ${fmtMinutes(ins.remainingMin)} left` : ''}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            {nextNode ? (
              <button type="button" className="ed-btn ed-btn-clay nx-press" onClick={() => setSelectedId(nextNode.id)}>
                Continue · {nextNode.name} <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            ) : (
              <span className="ed-ui ed-ink-2">Every skill mastered.</span>
            )}
            <button type="button" className="ed-link ed-ui cursor-pointer" onClick={() => setTab('tree')}>
              Skill tree
            </button>
            {cluster?.gate?.pyq && (
              <Link to={`/gate/practice?subject=${encodeURIComponent(cluster.gate.pyq)}`} className="ed-link ed-ui">
                Practice
              </Link>
            )}
            {isDsa && (
              <Link to="/problems" className="ed-link ed-ui">
                Practice
              </Link>
            )}
            {todayFirst && todayFirst !== nextNode?.id && (
              <button type="button" className="ed-link ed-ui cursor-pointer" onClick={() => setSelectedId(todayFirst)}>
                Today’s plan
              </button>
            )}
            <button type="button" className="ed-icon-btn" onClick={() => refetch()} aria-label="Refresh">
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} aria-hidden="true" />
            </button>
          </div>
        </div>
        {/* The subject rank: an ink seal and one line */}
        <div className="flex items-center gap-4 lg:max-w-xs lg:justify-end" aria-label="Subject rank">
          {isDsa ? <RankGlyph level={player.level} size={48} animated={false} /> : <SubjectRankGlyph tier={rank?.tierIndex ?? 0} size={48} />}
          <div className="min-w-0">
            <p className="ed-ui m-0 font-medium">
              {isDsa ? `Level ${player.level} · ${player.name}` : rank ? `${rank.tier} · ${rank.title}` : nexus.subject?.short}
            </p>
            <p className="ed-caption ed-muted mt-1 mb-0">
              {isDsa ? (
                player.xpGated || player.probGated ? (
                  <>Next rift: {player.xpGated ? `${formatNumber(Math.max(0, player.xpForNext - player.xpInLevel))} XP` : ''}{player.xpGated && player.probGated ? ' and ' : ''}{player.probGated ? `${Math.max(0, player.probsForNext - player.probsInLevel)} solves` : ''}</>
                ) : (
                  'Top rift reached.'
                )
              ) : rank?.toNext ? (
                <>
                  Next: {rank.toNext.tier} at {rank.toNext.at}% · about {rank.toNext.concepts} concept{rank.toNext.concepts === 1 ? '' : 's'}
                </>
              ) : rank?.coreDone ? (
                'Master: every core skill done.'
              ) : (
                'Top rank reached.'
              )}
            </p>
            {ins && ins.history.length > 1 && (
              <div className="mt-2">
                <HistorySpark points={ins.history} />
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <Tabs
          items={[
            ...(hasBook ? [{ id: 'lessons', label: 'Lessons' }] : []),
            { id: 'contents', label: hasBook ? 'Skills' : 'Contents' },
            { id: 'tree', label: 'Skill tree' },
            { id: 'plan', label: 'Plan' },
            ...(isDsa ? [{ id: 'ranks', label: 'Ranks' }] : []),
            { id: 'board', label: 'Leaderboard' },
          ]}
          active={tab}
          onChange={(id) => setTab(id as Tab)}
        />
        {tab === 'tree' && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={revision ? 'primary' : 'outline'} size="sm" className="nx-press" onClick={() => setRevision((v) => !v)} aria-pressed={revision}>
              <RotateCcw className="size-3.5" aria-hidden="true" /> Revision mode{dueIds.length ? ` · ${dueIds.length}` : ''}
            </Button>
            <GoalMenu routes={structure?.routes ?? []} goal={goal} onGoal={setGoal} />
          </div>
        )}
      </div>

      {tab === 'lessons' ? (
        isDsa ? (
          <DsaBook aside={structure ? <div className="ed-card-sm p-5"><SubjectMiniMap structure={structure} subject={subject} /></div> : undefined} />
        ) : (
          <NotesBook notesId={notesId!} aside={structure ? <div className="ed-card-sm p-5"><SubjectMiniMap structure={structure} subject={subject} /></div> : undefined} />
        )
      ) : tab === 'contents' ? (
        <SubjectContents
          zones={zones}
          nodes={nodes}
          minutes={minutes}
          zoneWord={isDsa ? 'Zone' : 'Chapter'}
          nextId={nextNode?.id ?? null}
          onOpen={(id) => setSelectedId(id)}
          aside={structure ? <div className="ed-card-sm p-5">{<SubjectMiniMap structure={structure} subject={subject} />}</div> : undefined}
        />
      ) : tab === 'plan' ? (
        <StudyPlanView subject={subject} nodes={planNodes} names={names} minutes={minutes} weight={weight} examDate={examDate} onPick={(id) => setSelectedId(id)} />
      ) : tab === 'ranks' ? (
        statsApi.data ? <TitleTrack stats={statsApi.data} /> : <LoadingBlock rows={5} />
      ) : tab === 'board' ? (
        <WebLeaderboard subject={subject} subjectName={nexus.subject?.name} />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-4">
            {revision && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/40 px-3.5 py-2.5 text-[13px]" role="status">
                <span className="text-text-secondary">
                  <span className="font-semibold text-warning">Revision mode</span> ·{' '}
                  {dueIds.length ? `${dueIds.length} skill${dueIds.length === 1 ? '' : 's'} due or marked for review; the rest steps back.` : 'nothing is due — come back in a few days.'}
                </span>
                {dueIds.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="nx-press"
                    onClick={async () => {
                      let added = 0
                      for (const id of dueIds) {
                        if (!nodes.find((n) => n.id === id)?.metric?.pyq) continue
                        try {
                          added += (await api.post<{ added: number }>(`/api/nexus/review/${subject}/${id}`)).added
                        } catch {
                          /* skip */
                        }
                      }
                      toast.success('Review queue ready', `${added} question${added === 1 ? '' : 's'} due today`)
                      navigate('/gate/review')
                    }}
                  >
                    Review all due
                  </Button>
                )}
              </div>
            )}
            {plan && steps && (
              <p className="mb-0 text-[12.5px] text-text-secondary" role="status">
                <span className="font-semibold text-warning">Goal path</span> ·{' '}
                {steps.length ? (
                  <>
                    next here:{' '}
                    {steps.slice(0, 3).map((id, i) => (
                      <span key={id}>
                        {i ? ' → ' : ''}
                        <button type="button" className="cursor-pointer text-text-primary hover:underline" onClick={() => setSelectedId(id)}>
                          {i + 1}. {nodes.find((n) => n.id === id)?.name}
                        </button>
                      </span>
                    ))}
                  </>
                ) : (
                  'nothing left here — the next steps are in other subjects.'
                )}
              </p>
            )}
            <SkillGraph
              nodes={nodes}
              zones={zones}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(selectedId === id ? null : id)}
              zoneWord={isDsa ? 'Zone' : 'Chapter'}
              steps={revision ? undefined : steps}
              highlight={revision ? due : highlight}
              due={due}
              onHoverNode={prefetchLesson}
            />
            {isDsa &&
              (roadmap ? (
                <WeeklyPool level={roadmap.levels.find((l) => l.level === currentZone)} weekSeed={roadmap.weekSeed} accentColor={zones.find((z) => z.level === currentZone)?.color ?? 'var(--color-primary)'} />
              ) : (
                <Card>
                  <CardContent>
                    <LoadingBlock rows={4} />
                  </CardContent>
                </Card>
              ))}
          </div>

          {/* Zones, and what it needs from other subjects */}
          <aside className="space-y-6 xl:sticky xl:top-4 xl:self-start" aria-label="Subject overview">
            <section>
              <h2 className="mb-2.5 text-[11px] font-semibold tracking-wider text-text-muted uppercase">{isDsa ? 'Zones' : 'Chapters'}</h2>
              <ol className="mb-0 space-y-1">
                {zones.map((z) => (
                  <li key={z.level}>
                    <button
                      type="button"
                      onClick={() => document.getElementById(`zone-${z.level}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                      className="group w-full cursor-pointer rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-text-primary/5"
                    >
                      <span className="flex items-center gap-2 text-[13px]">
                        <span className="w-4 font-mono text-[10.5px] text-text-muted tabular-nums">{z.level}</span>
                        <span className={cn('min-w-0 flex-1 truncate', z.locked ? 'text-text-muted' : 'text-text-primary')}>{z.name}</span>
                        {ins?.zones[z.level] ? (
                          <span
                            className="rounded px-1 font-mono text-[10px] tabular-nums"
                            title={`${ins.zones[z.level]}% of this subject's PYQ marks`}
                            style={{ background: `color-mix(in oklab, var(--color-warning) ${Math.min(60, 8 + ins.zones[z.level])}%, transparent)`, color: 'var(--color-text-primary)' }}
                          >
                            {ins.zones[z.level]}%
                          </span>
                        ) : null}
                        {z.locked ? <Lock className="size-3 text-text-muted" aria-label="locked" /> : <span className="font-mono text-[11px] text-text-muted tabular-nums">{z.zoneProgress}%</span>}
                      </span>
                      <span className="mt-1.5 ml-6 block h-1 overflow-hidden rounded-full bg-bg-surface-3">
                        <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${z.zoneProgress}%`, background: z.color }} />
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
            {structure && <SubjectMiniMap structure={structure} subject={subject} />}
            {needs.length > 0 && (
              <section>
                <h2 className="mb-2.5 text-[11px] font-semibold tracking-wider text-text-muted uppercase">Needs from other subjects</h2>
                <div className="flex flex-wrap gap-1.5">
                  {needs.map(({ c, n }) => (
                    <Link
                      key={c!.id}
                      to={subjectHref(c!)}
                      className="nx-need nx-press inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px]"
                      data-hue={hueOf(c!.id) ? '' : undefined}
                      style={hueOf(c!.id) ? ({ '--nx-chip': hueOf(c!.id) } as React.CSSProperties) : undefined}
                    >
                      {c!.name}
                      <span className="font-mono text-[10.5px] opacity-70 tabular-nums">{n}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            <p className="mb-0 text-[11.5px] leading-relaxed text-text-muted">
              Select any skill to see what it covers, its lessons and practice. Amber rings are due for review; gold numbers are your goal path; the amber % beside a chapter is its share of PYQ marks. Press ⌘K to search.
            </p>
          </aside>
        </div>
      )}


    </motion.div>
    )}
    </AnimatePresence>
      <NexusPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        clusters={webClusters ?? []}
        streams={structure?.streams ?? []}
        commands={[
          ...(structure?.routes ?? []).map((r) => ({ id: `goal:${r.id}`, label: `Goal path: ${r.name}`, hint: goal === r.id ? 'active' : 'goal', run: () => setGoal(r.id) })),
          ...(goal ? [{ id: 'goal:none', label: 'Clear the goal path', hint: 'goal', run: () => setGoal(null) }] : []),
          { id: 'nexus', label: 'Back to the Nexus', hint: 'page', run: () => navigate('/nexus') },
        ]}
        onSubject={(id) => {
          const c = structure?.clusters.find((x) => x.id === id)
          if (c) navigate(subjectHref(c))
        }}
        onConcept={(k) => {
          const [s2, ...rest] = k.split(':')
          if (s2 === subject) setSelectedId(rest.join(':'))
          else {
            const c = structure?.clusters.find((x) => x.id === s2)
            if (c) navigate(subjectHref(c, rest.join(':')))
          }
        }}
      />
    </>
  )
}
