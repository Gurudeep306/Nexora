import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { ErrorState, LoadingBlock, Tabs } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useAgentPageContext } from '@/context/AgentContext'
import { cn } from '@/lib/utils'
import { NexusWeb, type Camera, type NexusWebHandle, type RegionRank, type WebAction, type WebFilter } from '@/components/nexus/NexusWeb'
import { NodePanel } from '@/components/nexus/NodePanel'
import { TitleTrack } from '@/components/nexus/TitleTrack'
import { WebLeaderboard } from '@/components/nexus/WebLeaderboard'
import { WeeklyPool } from '@/components/nexus/WeeklyPool'
import { WebControls, WebRankLine, WebSearch } from '@/components/nexus/WebOverlays'
import {
  assemble,
  computeLayout,
  conceptGraph,
  keystones as findKeystones,
  longestChain,
  nextBestStep,
  overviewData,
  routePlan,
  type LayoutData,
  type Web,
} from '@/components/nexus/lattice'
import { getTreeLayout, getWebLayout, layoutNow, treeKey, webKey } from '@/components/nexus/layoutCache'
import { cachedState, cachedStructure, fetchRoadmap, loadWeb, mergeWeb, ROADMAP_KEY } from '@/components/nexus/data'
import type {
  CrossLink,
  NexusNode,
  NexusNodeResponse,
  NexusPyqsResponse,
  NexusStatsResponse,
  NexusWebState,
  NexusWebStructure,
  RiftLevel,
  RiftPlayer,
  WebCluster,
  WebNode,
} from '@/components/nexus/types'

/*
 * The Nexus, in two levels:
 *   the web      every subject as one node in the teaser web, streams as
 *                quiet regions; YOU at the centre. Nothing else.
 *   a subject    its OWN tree, built only from its concepts (zones as
 *                regions), with every tool: lineage, the next step, routes,
 *                memory, keystones, filters and the details sheet.
 * Both open on the first frame from the device's copy, layouts computed in
 * a worker and cached per structure version.
 */

/** The tiny web shown before anything else (the lattice drawing in). */
let emptyWeb: Web | null = null
const getEmptyWeb = () => (emptyWeb ??= assemble(computeLayout([], 'empty'), []))

/** Where the web's camera was when you dived into a subject (restored on the way back). */
let lastWebCamera: Camera | null = null

/**
 * The rank ladder shown under /ranks, placed by the web rank: same ladder
 * (names, badges, XP and solve gates), where you stand across every subject.
 */
function webTitles(stats: NexusStatsResponse | null, player: RiftPlayer, levels: RiftLevel[]): NexusStatsResponse | null {
  if (!stats || stats.allTitles.length !== levels.length) return stats
  const cur = stats.allTitles[player.level - 1]
  const next = stats.allTitles[player.level] ?? null
  if (!cur) return stats
  const solved = player.probsInLevel + (levels[player.level - 1]?.minProblems ?? 0)
  return {
    ...stats,
    title: {
      current: cur,
      next,
      xpToNext: next ? Math.max(0, next.min_xp - player.xp) : 0,
      probsToNext: next ? Math.max(0, (next.min_problems ?? 0) - solved) : 0,
    },
  }
}

/** A web node in the shape the node panel reads (details merged in when loaded). */
function asNexusNode(c: WebCluster, n: WebNode): NexusNode {
  const dsa = c.engine === 'dsa'
  const [solved, target] = dsa ? n.c.split('/').map(Number) : [0, 0]
  return {
    id: n.id,
    subject: c.id,
    kind: n.k,
    zone: n.z,
    name: n.n,
    icon: '',
    desc: '',
    tags: [],
    requires: n.req,
    target: target || 0,
    x: 0,
    y: 0,
    difficulty: [0, 0],
    xpReward: n.xp,
    resources: [],
    solved: solved || 0,
    progress: n.p,
    unlocked: n.s >= 1,
    completed: n.s === 2,
  }
}

export default function NexusPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const subject = params.get('subject')
  const node = params.get('node')
  const routeId = params.get('route')
  const view = params.get('view') // inside a subject: 'board' | 'week'
  const [tab, setTab] = useState<'map' | 'ranks'>('map')
  const { user } = useAuth()
  const username = user?.username ?? ''
  const webRef = useRef<NexusWebHandle>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [filter, setFilter] = useState<WebFilter>({ mode: 'all', domain: null })
  const [ahead, setAhead] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  /* ── data: from the device at once, then fresh in the background ── */
  const [structure, setStructure] = useState<NexusWebStructure | null>(() => cachedStructure())
  const [state, setState] = useState<NexusWebState | null>(() => cachedState(username))
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const refresh = useCallback((fresh = false) => {
    setRefreshing(true)
    loadWeb(fresh)
      .then(({ structure: s, state: st }) => {
        setStructure(s)
        setState(st)
        setError(null)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load the nexus'))
      .finally(() => setRefreshing(false))
  }, [])
  useEffect(() => {
    refresh(false)
  }, [refresh])
  const clusters = useMemo(() => (structure ? mergeWeb(structure, state) : null), [structure, state])

  /* ── layouts: in memory already (instant), else IndexedDB / the worker ── */
  const layoutKey = structure ? (subject ? treeKey(structure.version, subject) : webKey(structure.version)) : null
  const [loaded, setLoaded] = useState<Record<string, LayoutData>>({})
  const layout = layoutKey ? (layoutNow(layoutKey) ?? loaded[layoutKey] ?? null) : null
  useEffect(() => {
    if (!structure || !layoutKey || layoutNow(layoutKey)) return
    let live = true
    const p = subject ? getTreeLayout(structure, subject) : getWebLayout(structure)
    p?.then((l) => {
      if (live) setLoaded((m) => ({ ...m, [layoutKey]: l }))
    })
    return () => {
      live = false
    }
  }, [structure, subject, layoutKey])
  const overviewClusters = useMemo(() => (clusters && !subject ? overviewData(clusters).clusters : null), [clusters, subject])
  const treeCluster = useMemo(() => (subject ? (clusters?.find((c) => c.id === subject) ?? null) : null), [clusters, subject])
  const web = useMemo(() => {
    if (!layout || layout.version !== layoutKey) return null
    if (subject) return treeCluster ? assemble(layout, [treeCluster]) : null
    return overviewClusters ? assemble(layout, overviewClusters) : null
  }, [layout, layoutKey, subject, treeCluster, overviewClusters])
  // Every concept of every subject (routes and search cross subjects).
  const graph = useMemo(() => (clusters ? conceptGraph(clusters) : null), [clusters])
  const searchGraph = useMemo(() => (clusters && graph ? { subjects: clusters, concepts: graph.concepts } : null), [clusters, graph])

  const statsApi = useApi<NexusStatsResponse>(
    () => api.get<NexusStatsResponse>('/api/stats', { query: { username: username || undefined } }),
    [username],
    { cacheKey: `stats:${username}` },
  )
  const isDsa = treeCluster?.engine === 'dsa'
  const roadmapApi = useApi(fetchRoadmap, [], { cacheKey: ROADMAP_KEY, skip: !(isDsa && view === 'week') })

  /* ── navigation: web ⇄ a subject's tree, all in the URL ── */
  const openSubject = useCallback(
    (id: string, cam?: Camera, nodeId?: string) => {
      if (cam) lastWebCamera = cam
      const next = new URLSearchParams()
      next.set('subject', id)
      if (nodeId) next.set('node', nodeId)
      setDetailsOpen(false)
      navigate({ search: `?${next}` }, { state: { fromWeb: !subject } })
    },
    [navigate, subject],
  )
  const backToWeb = useCallback(() => {
    setDetailsOpen(false)
    if ((location.state as { fromWeb?: boolean } | null)?.fromWeb) navigate(-1)
    else navigate({ search: '' })
  }, [location.state, navigate])
  const setParam = useCallback(
    (key: string, value: string | null) => {
      setParams(
        (p) => {
          const next = new URLSearchParams(p)
          if (value) next.set(key, value)
          else next.delete(key)
          return next
        },
        { replace: true, state: location.state },
      )
    },
    [setParams, location.state],
  )
  const setNode = useCallback((id: string | null) => setParam('node', id), [setParam])
  // Old deep links (?node=subject:id on the web) open that subject's tree.
  useEffect(() => {
    if (subject || !node || !node.includes(':')) return
    const [s, ...rest] = node.split(':')
    navigate({ search: `?subject=${encodeURIComponent(s)}&node=${encodeURIComponent(rest.join(':'))}` }, { replace: true })
  }, [subject, node, navigate])
  // Esc: close the sheet, then the selection, then back to the web.
  useEffect(() => {
    if (!subject) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (detailsOpen) setDetailsOpen(false)
      else if (node) setNode(null)
      else if (view) setParam('view', null)
      else backToWeb()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [subject, node, view, detailsOpen, backToWeb, setNode, setParam])
  // ⌘K or "/": search (invisible until asked for).
  useEffect(() => {
    if (tab !== 'map' || view) return
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    // Capture phase: before the app's command palette, which then stands aside.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [tab, view])

  /* ── inside a subject: route, beacon, keystones ── */
  const plan = useMemo(() => {
    if (!subject || !routeId || !graph || !structure) return null
    const subjects = routeId.startsWith('subject:') ? [routeId.slice(8)] : structure.routes.find((r) => r.id === routeId)?.subjects
    return subjects ? routePlan(graph, subjects, 8) : null
  }, [subject, routeId, graph, structure])
  const route = useMemo(() => {
    if (!plan || !web || !subject) return null
    const order = plan.order.filter((k) => web.concepts.has(k))
    return { order, next: order.filter((k) => web.concepts.get(k)?.node.s !== 2).slice(0, 5) }
  }, [plan, web, subject])
  const beacon = useMemo(() => (web && subject ? nextBestStep(web, route) : null), [web, subject, route])
  const keystoneSet = useMemo(() => (web && subject ? findKeystones(web, 0.08, 4) : new Set<string>()), [web, subject])

  /* ── the selected concept and its lazily loaded details ── */
  const byKey = useMemo(() => {
    const m = new Map<string, { c: WebCluster; n: WebNode }>()
    for (const c of clusters ?? []) for (const n of c.nodes) m.set(`${c.id}:${n.id}`, { c, n })
    return m
  }, [clusters])
  const selKey = subject && node ? `${subject}:${node}` : null
  const webSel = selKey ? byKey.get(selKey) : undefined
  const [selSubject, selId] = webSel ? [webSel.c.id, webSel.n.id] : [null, null]
  const detailApi = useApi<NexusNodeResponse>(
    () => api.get<NexusNodeResponse>(`/api/nexus/node/${selSubject}/${selId}`),
    [selSubject, selId],
    { skip: !webSel, cacheKey: webSel ? `nexus:node:${selSubject}:${selId}` : undefined },
  )
  const selectedNode = useMemo<NexusNode | null>(() => {
    if (!webSel) return null
    const base = asNexusNode(webSel.c, webSel.n)
    const d = detailApi.data?.node
    if (!d || d.id !== webSel.n.id) return base
    const fix = (l: CrossLink) => {
      const live = byKey.get(`${l.subject}:${l.id}`)
      return live ? { ...l, completed: live.n.s === 2, progress: live.n.p } : l
    }
    return {
      ...d,
      progress: base.progress,
      unlocked: base.unlocked,
      completed: base.completed,
      solved: webSel.c.engine === 'dsa' ? base.solved : d.solved,
      crossRequires: (d.crossRequires ?? []).map(fix),
      crossUnlocks: (d.crossUnlocks ?? []).map(fix),
    }
  }, [webSel, detailApi.data, byKey])
  const clusterNodes = useMemo(() => (webSel ? webSel.c.nodes.map((n) => asNexusNode(webSel.c, n)) : []), [webSel])
  const ranks = useMemo(() => {
    const m: Record<string, RegionRank> = {}
    for (const c of clusters ?? []) if (c.rank) m[c.id] = { tier: c.rank.tier, title: c.rank.title }
    return m
  }, [clusters])

  // A link to a concept (deep link, search, "Needs" chip) lands the camera on it.
  const landed = useRef<string | null>(null)
  useEffect(() => {
    if (!web || !subject || !selKey || landed.current === selKey) return
    landed.current = selKey
    if (web.concepts.has(selKey)) {
      const k = selKey
      requestAnimationFrame(() => webRef.current?.flyToNode(k))
    }
  }, [web, subject, selKey])

  const say = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 1800)
  }
  const onAction = useCallback(
    async (action: WebAction, key: string) => {
      if (!web) return
      const [s, id] = [key.split(':')[0], key.split(':').slice(1).join(':')]
      if (action === 'open') setDetailsOpen(true)
      else if (action === 'trace') webRef.current?.trace(longestChain(web, key))
      else if (action === 'copy') {
        const url = `${window.location.origin}/nexus?subject=${encodeURIComponent(s)}&node=${encodeURIComponent(id)}`
        try {
          await navigator.clipboard.writeText(url)
          say('Link copied')
        } catch {
          say(url)
        }
      } else if (action === 'revise') {
        try {
          const r = await api.get<NexusPyqsResponse>(`/api/nexus/pyqs/${s}/${id}`)
          const ids = r.questions.map((q) => q.id).slice(0, 60)
          if (ids.length) navigate(`/gate/practice?ids=${ids.join(',')}`)
          else say('Nothing to revise here yet')
        } catch {
          say('Could not load the questions')
        }
      }
    },
    [web, navigate],
  )

  /* ── the assistant sees what is on screen ── */
  const allNodes = useMemo(() => (clusters ?? []).flatMap((c) => c.nodes), [clusters])
  const mastered = allNodes.filter((n) => n.s === 2).length
  const brief = useMemo(() => {
    if (!state || !clusters) return undefined
    const p = state.player
    const lines = [
      `Web rank: level ${p.level} (${p.name}), ${p.xp} web XP across every subject; ${p.xpInLevel}/${p.xpForNext} XP toward the next level.`,
      `The Nexus web: ${clusters.length} subjects, ${mastered}/${allNodes.length} concepts mastered.`,
    ]
    if (treeCluster) {
      const done = treeCluster.nodes.filter((n) => n.s === 2).length
      const r = treeCluster.rank
      lines.push(`Subject tree open: ${treeCluster.name}${r ? ` — subject rank ${r.tier} (${r.title}), ${r.progress}%` : ''}; ${done}/${treeCluster.nodes.length} concepts mastered.`)
      lines.push(`Zones: ${treeCluster.zones.map((z) => `${z.level}. ${z.name} ${z.zoneProgress}%${z.locked ? ' (locked)' : ''}`).join('; ')}`)
      if (beacon && web) lines.push(`Suggested next step: ${web.concepts.get(beacon)?.node.n}.`)
      if (route && web) lines.push(`Active route next here: ${route.next.map((k) => web.concepts.get(k)?.node.n).join(', ')}.`)
      if (selectedNode) lines.push(`Selected concept: ${selectedNode.name} — progress ${selectedNode.progress}%; ${selectedNode.completed ? 'mastered' : selectedNode.unlocked ? 'unlocked' : 'locked'}.`)
    }
    return lines.join('\n')
  }, [state, clusters, mastered, allNodes.length, treeCluster, beacon, route, web, selectedNode])
  useAgentPageContext({
    label: treeCluster ? `Nexus · ${treeCluster.short}` : 'Nexus',
    visibleText: brief,
  })

  const player = state?.player
  const rankLine = (onWeb: boolean) =>
    player ? (
      <WebRankLine
        player={player}
        username={username}
        avatarUrl={typeof user?.avatar_url === 'string' ? user.avatar_url : null}
        avatar={user?.avatar}
        displayName={typeof user?.display_name === 'string' ? user.display_name : undefined}
        mastered={mastered}
        total={allNodes.length}
        streak={statsApi.data?.streak.current}
        onWeb={onWeb}
      />
    ) : null
  const search = searchGraph && (
    <WebSearch
      graph={searchGraph}
      open={searchOpen}
      onOpenChange={setSearchOpen}
      onPick={(p) => {
        if (p.kind === 'subject') {
          if (p.id !== subject) openSubject(p.id, subject ? undefined : webRef.current?.camera())
          return
        }
        const [s, ...rest] = p.id.split(':')
        const id = rest.join(':')
        if (s === subject) {
          setNode(id)
          webRef.current?.flyToNode(p.id)
        } else openSubject(s, subject ? undefined : webRef.current?.camera(), id)
      }}
    />
  )
  const toastEl = (
    <AnimatePresence>
      {toast && (
        <motion.p className="nx-over nx-toast mb-0" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status">
          {toast}
        </motion.p>
      )}
    </AnimatePresence>
  )
  const loadingWeb = (label: string) => (
    <section className="nx-bleed" aria-label={label} aria-busy="true">
      <NexusWeb web={getEmptyWeb()} selected={null} onSelect={() => {}} onOpenSubject={() => {}} loading />
      {error && (
        <p className="nx-over nx-hint mb-0" role="alert">
          {error} ·{' '}
          <button type="button" className="nx-link nx-link-sm" onClick={() => refresh(true)}>
            try again
          </button>
        </p>
      )}
    </section>
  )

  /* ── the main web: subjects only, full-bleed, card-free ── */
  if (tab === 'map' && !subject) {
    if (!web || !state) return loadingWeb('The Nexus web')
    return (
      <section className="nx-bleed" aria-label="The Nexus web">
        <NexusWeb
          ref={webRef}
          mode="overview"
          web={web}
          selected={null}
          onSelect={() => {}}
          onOpenSubject={(id, cam) => openSubject(id, cam)}
          initialCamera={lastWebCamera}
          ranks={ranks}
        />
        {rankLine(true)}
        <nav className="nx-over nx-views" aria-label="Nexus views">
          <button type="button" aria-current="page" className="nx-link" data-on="">
            /web
          </button>
          <button type="button" className="nx-link" onClick={() => setTab('ranks')}>
            /ranks
          </button>
          <button type="button" className="nx-link" onClick={() => refresh(true)} aria-label="Refresh nexus data">
            <RefreshCw className={cn('size-3', refreshing && 'animate-spin')} />
          </button>
        </nav>
        {search}
      </section>
    )
  }

  /* ── a subject's own tree, with every tool ── */
  if (tab === 'map' && subject && !view) {
    if (clusters && !treeCluster) {
      return <ErrorState message={`There is no subject “${subject}”.`} onRetry={backToWeb} />
    }
    if (!web || !state || !treeCluster) return loadingWeb('A subject tree')
    const rank = treeCluster.rank
    const done = treeCluster.nodes.filter((n) => n.s === 2).length
    const selZone = webSel?.c.zones.find((z) => z.level === webSel.n.z)
    const nextLine = (plan?.next ?? []).slice(0, 4).map((k) => {
      const g = graph?.concepts.get(k)
      return g ? (g.cluster.id === subject ? g.node.n : `${g.node.n} (${g.cluster.short})`) : ''
    })
    return (
      <section className="nx-bleed" aria-label={`${treeCluster.name}: its tree`}>
        <NexusWeb
          key={subject}
          ref={webRef}
          mode="tree"
          web={web}
          selected={webSel ? selKey : null}
          onSelect={(k) => {
            setNode(k ? k.slice(subject.length + 1) : null)
            setDetailsOpen(false)
          }}
          onOpenSubject={() => {}}
          onAction={onAction}
          quiet={detailsOpen}
          filter={filter}
          ahead={ahead}
          route={route}
          beacon={beacon}
          keystones={keystoneSet}
        />
        <header className="nx-over nx-tree-head">
          <button type="button" className="nx-link nx-link-sm nx-back" onClick={backToWeb} aria-label="Back to the web">
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Web
          </button>
          <h1 className="nx-tree-name mb-0">{treeCluster.name}</h1>
          <p className="nx-rank-line nx-tree-rank mb-0" title={rank?.next ? `Next: ${rank.next}` : undefined}>
            {rank && <span className="nx-rank-tier">{rank.tier}</span>}
            {rank && <span className="nx-me-dim"> · {rank.title} · </span>}
            <span className="nx-me-dim font-mono text-[10.5px] tabular-nums">
              {done}/{treeCluster.nodes.length} · {rank?.progress ?? 0}%
            </span>
          </p>
        </header>
        <nav className="nx-over nx-views" aria-label="Subject views">
          <button type="button" aria-current="page" className="nx-link" data-on="">
            /tree
          </button>
          <button type="button" className="nx-link" onClick={() => setParam('view', 'board')}>
            /leaderboard
          </button>
          {isDsa && (
            <button type="button" className="nx-link" onClick={() => setParam('view', 'week')}>
              /week
            </button>
          )}
        </nav>
        {search}
        <WebControls
          routes={structure?.routes ?? []}
          route={routeId}
          onRoute={(id) => setParam('route', id)}
          own={{ id: `subject:${subject}`, label: 'this subject' }}
          filter={filter}
          onFilter={setFilter}
          domains={[]}
          ahead={ahead}
          onAhead={setAhead}
          routeNext={nextLine}
        />
        {toastEl}
        <AnimatePresence>
          {detailsOpen && selectedNode && webSel && (
            <motion.aside
              key={selKey!}
              className="nx-sheet"
              aria-label={`${selectedNode.name} details`}
              initial={{ x: '100%', opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 32 }}
            >
              <NodePanel
                bare
                node={selectedNode}
                nodes={clusterNodes}
                zoneColor={selZone?.color ?? 'var(--color-primary)'}
                zoneName={`${webSel.c.short} · ${selZone?.name ?? `Zone ${selectedNode.zone}`}`}
                detailLoading={detailApi.loading && !detailApi.data}
                engine={webSel.c.engine}
                onClose={() => setDetailsOpen(false)}
                onJump={(l) => {
                  // "Needs · X": that subject's own tree, on that concept.
                  if (l.subject === subject) {
                    setNode(l.id)
                    webRef.current?.flyToNode(`${l.subject}:${l.id}`)
                  } else openSubject(l.subject, undefined, l.id)
                }}
                onSelect={(id) => {
                  setNode(id)
                  webRef.current?.flyToNode(`${subject}:${id}`)
                }}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </section>
    )
  }

  /* ── ranks, a subject's leaderboard and DSA's week: type on the page ── */
  if (!state) {
    return error ? <ErrorState message={error} onRetry={() => refresh(true)} /> : <LoadingBlock rows={8} />
  }
  if (subject && view && treeCluster) {
    const level = state.dsaPlayer?.level ?? 1
    return (
      <div className="nx-path-enter">
        <div className="nx-path-head flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="button" className="nx-link-page inline-flex items-center gap-1.5 text-[13px] font-semibold" onClick={() => setParam('view', null)}>
            <ArrowLeft className="size-3.5" aria-hidden="true" /> {treeCluster.short} tree
          </button>
          <h2 className="mb-0 font-display text-lg font-semibold text-text-primary">
            {treeCluster.name} · {view === 'week' ? 'this week' : 'leaderboard'}
          </h2>
        </div>
        {view === 'week' && isDsa ? (
          roadmapApi.data ? (
            <WeeklyPool level={roadmapApi.data.levels.find((l) => l.level === level)} weekSeed={roadmapApi.data.weekSeed} accentColor="var(--color-primary)" />
          ) : roadmapApi.error ? (
            <ErrorState message={roadmapApi.error} onRetry={roadmapApi.refetch} />
          ) : (
            <LoadingBlock rows={4} />
          )
        ) : (
          <WebLeaderboard subject={subject} subjectName={treeCluster.name} />
        )}
      </div>
    )
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        {rankLine(false)}
        <button type="button" className="nx-link-page" onClick={() => refresh(true)} aria-label="Refresh nexus data">
          <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
        </button>
      </div>
      <Tabs
        variant="pills"
        className="mb-4"
        items={[
          { id: 'map', label: '/web', icon: undefined },
          { id: 'ranks', label: '/ranks', icon: undefined, badge: statsApi.data ? statsApi.data.allTitles.length : undefined },
        ]}
        active={tab}
        onChange={(id) => {
          setTab(id as 'map' | 'ranks')
          if (id === 'map' && subject) backToWeb()
        }}
      />
      <div className="space-y-4">
        <WebLeaderboard />
        {statsApi.loading && !statsApi.data ? (
          <LoadingBlock rows={5} />
        ) : statsApi.error && !statsApi.data ? (
          <ErrorState message={statsApi.error} onRetry={statsApi.refetch} />
        ) : (
          <TitleTrack stats={webTitles(statsApi.data, state.player, state.riftLevels)} />
        )}
      </div>
    </div>
  )
}
