import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { RefreshCw } from 'lucide-react'
import { ErrorState, LoadingBlock, Tabs } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useAgentPageContext } from '@/context/AgentContext'
import { cn } from '@/lib/utils'
import { NexusWeb, type Camera, type NexusWebHandle, type RegionRank, type WebAction, type WebFilter } from '@/components/nexus/NexusWeb'
import { NodePanel } from '@/components/nexus/NodePanel'
import { SubjectPath } from '@/components/nexus/SubjectPath'
import { TitleTrack } from '@/components/nexus/TitleTrack'
import { WebLeaderboard } from '@/components/nexus/WebLeaderboard'
import { WebControls, WebRankLine, WebSearch } from '@/components/nexus/WebOverlays'
import { assemble, computeLayout, keystones as findKeystones, longestChain, nextBestStep, routePlan, type LayoutData, type Web } from '@/components/nexus/lattice'
import { getLayout, layoutNow } from '@/components/nexus/layoutCache'
import { cachedState, cachedStructure, loadWeb, mergeWeb } from '@/components/nexus/data'
import type {
  CrossLink,
  NexusNode,
  NexusNodeResponse,
  NexusPyqsResponse,
  NexusResponse,
  NexusStatsResponse,
  NexusWebState,
  NexusWebStructure,
  RiftLevel,
  RiftPlayer,
  WebCluster,
  WebNode,
} from '@/components/nexus/types'

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
  const [tab, setTab] = useState<'map' | 'ranks'>('map')
  const { user } = useAuth()
  const username = user?.username ?? ''
  const webRef = useRef<NexusWebHandle>(null)
  const [pathData, setPathData] = useState<NexusResponse | null>(null)
  const [hintGone, setHintGone] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState<false | 'any' | 'subject'>(false)
  const [filter, setFilter] = useState<WebFilter>({ mode: 'all', domain: null })
  const [ahead, setAhead] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  /* ── data: from the device at once, then fresh in the background ── */
  const [structure, setStructure] = useState<NexusWebStructure | null>(() => cachedStructure())
  const [state, setState] = useState<NexusWebState | null>(() => cachedState(username))
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const refresh = useCallback(
    (fresh = false) => {
      setRefreshing(true)
      loadWeb(fresh)
        .then(({ structure: s, state: st }) => {
          setStructure(s)
          setState(st)
          setError(null)
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load the nexus'))
        .finally(() => setRefreshing(false))
    },
    [],
  )
  useEffect(() => {
    refresh(false)
  }, [refresh])
  // The layout: in memory already (instant), else from IndexedDB / the worker.
  const [asyncLayout, setAsyncLayout] = useState<LayoutData | null>(null)
  const layout = (structure && layoutNow(structure.version)) || (asyncLayout?.version === structure?.version ? asyncLayout : null)
  useEffect(() => {
    if (!structure || layoutNow(structure.version)) return
    let live = true
    getLayout(structure).then((l) => {
      if (live) setAsyncLayout(l)
    })
    return () => {
      live = false
    }
  }, [structure])
  const clusters = useMemo(() => (structure ? mergeWeb(structure, state) : null), [structure, state])
  const web = useMemo(() => (layout && clusters && layout.version === structure?.version ? assemble(layout, clusters) : null), [layout, clusters, structure])

  const statsApi = useApi<NexusStatsResponse>(
    () => api.get<NexusStatsResponse>('/api/stats', { query: { username: username || undefined } }),
    [username],
    { cacheKey: `stats:${username}` },
  )

  /* ── navigation: web ⇄ subject path, all in the URL ── */
  const openSubject = useCallback(
    (id: string, cam?: Camera, nodeId?: string) => {
      if (cam) lastWebCamera = cam
      const next = new URLSearchParams()
      next.set('subject', id)
      if (nodeId) next.set('node', nodeId)
      navigate({ search: `?${next}` }, { state: { fromWeb: !subject } })
    },
    [navigate, subject],
  )
  const backToWeb = useCallback(() => {
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
  useEffect(() => {
    if (!subject) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) backToWeb()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [subject, backToWeb])
  // ⌘K or "/" opens search on the web.
  useEffect(() => {
    if (subject || tab !== 'map') return
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setSearchOpen('any')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [subject, tab])

  /* ── web analysis: route, beacon, keystones ── */
  const route = useMemo(() => {
    if (!web || !routeId || !structure) return null
    const subjects = routeId.startsWith('subject:') ? [routeId.slice(8)] : structure.routes.find((r) => r.id === routeId)?.subjects
    return subjects ? routePlan(web, subjects) : null
  }, [web, routeId, structure])
  const beacon = useMemo(() => (web ? nextBestStep(web, route) : null), [web, route])
  const keystoneSet = useMemo(() => (web ? findKeystones(web) : new Set<string>()), [web])
  const domains = useMemo(() => [...new Set((structure?.clusters ?? []).map((c) => c.domain))], [structure])

  /* ── the selected concept ("subject:id") and its lazily loaded details ── */
  const byKey = useMemo(() => {
    const m = new Map<string, { c: WebCluster; n: WebNode }>()
    for (const c of clusters ?? []) for (const n of c.nodes) m.set(`${c.id}:${n.id}`, { c, n })
    return m
  }, [clusters])
  const webSel = !subject && node ? byKey.get(node) : undefined
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

  // A deep link to a concept lands the camera on it.
  const landed = useRef(false)
  useEffect(() => {
    if (!web || subject || landed.current) return
    landed.current = true
    if (node && web.concepts.has(node) && !lastWebCamera) {
      const id = node
      requestAnimationFrame(() => webRef.current?.flyToNode(id, true))
    }
  }, [web, subject, node])

  const say = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 1800)
  }
  const onAction = useCallback(
    async (action: WebAction, key: string) => {
      if (!web) return
      if (action === 'open') setDetailsOpen(true)
      else if (action === 'trace') webRef.current?.trace(longestChain(web, key))
      else if (action === 'copy') {
        const url = `${window.location.origin}/nexus?node=${encodeURIComponent(key)}`
        try {
          await navigator.clipboard.writeText(url)
          say('Link copied')
        } catch {
          say(url)
        }
      } else if (action === 'revise') {
        const [s, id] = [key.split(':')[0], key.split(':').slice(1).join(':')]
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
  const brief = useMemo(() => {
    if (!web || !state) return undefined
    const p = state.player
    const all = web.concepts.size
    const done = [...web.concepts.values()].filter((c) => c.node.s === 2).length
    const lines = [
      `Web rank: level ${p.level} (${p.name}), ${p.xp} web XP across every subject; ${p.xpInLevel}/${p.xpForNext} XP toward the next level.`,
      `The Nexus web: ${web.regions.length} subjects, ${done}/${all} concepts mastered.`,
    ]
    if (beacon) lines.push(`Suggested next step: ${web.concepts.get(beacon)?.node.n} (${web.concepts.get(beacon)?.cluster.name}).`)
    if (route) lines.push(`Active route next: ${route.next.map((k) => web.concepts.get(k)?.node.n).join(', ')}.`)
    if (subject && pathData) {
      lines.push(
        `Subject path open: ${pathData.subject?.name}${pathData.subjectRank ? ` — subject rank ${pathData.subjectRank.tier} (${pathData.subjectRank.title}), ${pathData.subjectRank.progress}%` : ''}.`,
        `Zones: ${pathData.zones.map((z) => `${z.level}. ${z.name} ${z.zoneProgress}%${z.locked ? ' (locked)' : ''}${z.current ? ' (current)' : ''}`).join('; ')}`,
      )
      const sel = node ? pathData.nodes.find((n) => n.id === node) : null
      if (sel) lines.push(`Selected node: ${sel.name} — ${sel.desc} Progress ${sel.progress}%; ${sel.completed ? 'mastered' : sel.unlocked ? 'unlocked' : 'locked'}.`)
    } else if (selectedNode) {
      lines.push(`Selected concept: ${selectedNode.name} (${webSel?.c.name}) — progress ${selectedNode.progress}%; ${selectedNode.completed ? 'mastered' : selectedNode.unlocked ? 'unlocked' : 'locked'}.`)
    }
    return lines.join('\n')
  }, [web, state, subject, pathData, node, selectedNode, webSel, beacon, route])
  useAgentPageContext({
    label: subject ? `Nexus · ${pathData?.subject?.short ?? subject}` : selectedNode ? `Nexus · ${selectedNode.name}` : 'Nexus',
    visibleText: brief,
  })

  const webMode = tab === 'map' && !subject
  const player = state?.player
  const mastered = web ? [...web.concepts.values()].filter((c) => c.node.s === 2).length : 0
  const total = web?.concepts.size ?? 0
  const rankLine = (onWeb: boolean) =>
    player ? (
      <WebRankLine
        player={player}
        username={username}
        avatarUrl={typeof user?.avatar_url === 'string' ? user.avatar_url : null}
        avatar={user?.avatar}
        displayName={typeof user?.display_name === 'string' ? user.display_name : undefined}
        mastered={mastered}
        total={total}
        streak={statsApi.data?.streak.current}
        onWeb={onWeb}
      />
    ) : null

  /* ── the web: full-bleed, card-free, opens on the first frame ── */
  if (webMode) {
    if (!web || !state) {
      return (
        <section className="nx-bleed" aria-label="The Nexus web" aria-busy="true">
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
    }
    const selZone = webSel?.c.zones.find((z) => z.level === webSel.n.z)
    const customName = routeId?.startsWith('subject:') ? (structure?.clusters.find((c) => c.id === routeId.slice(8))?.short ?? null) : null
    return (
      <section className="nx-bleed" aria-label="The Nexus web">
        <NexusWeb
          ref={webRef}
          web={web}
          selected={webSel ? node : null}
          onSelect={(k) => {
            setNode(k)
            setDetailsOpen(false)
          }}
          onOpenSubject={(id, cam) => openSubject(id, cam)}
          onAction={onAction}
          onInteract={() => setHintGone(true)}
          quiet={detailsOpen}
          initialCamera={lastWebCamera}
          ranks={ranks}
          filter={filter}
          ahead={ahead}
          route={route}
          beacon={beacon}
          keystones={keystoneSet}
        />
        {rankLine(true)}
        <nav className="nx-over nx-views" aria-label="Nexus views">
          <button type="button" className="nx-link nx-link-sm nx-kbd" onClick={() => setSearchOpen('any')} aria-label="Search (⌘K)">
            Search <kbd>⌘K</kbd>
          </button>
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
        <WebSearch
          web={web}
          open={!!searchOpen}
          subjectsOnly={searchOpen === 'subject'}
          onOpenChange={(o) => setSearchOpen(o ? 'any' : false)}
          onPick={(p) => {
            if (searchOpen === 'subject') setParam('route', `subject:${p.id}`)
            else if (p.kind === 'subject') webRef.current?.flyToSubject(p.id)
            else {
              setNode(p.id)
              webRef.current?.flyToNode(p.id)
            }
          }}
        />
        <WebControls
          routes={structure?.routes ?? []}
          route={routeId}
          onRoute={(id) => setParam('route', id)}
          onCustomRoute={() => setSearchOpen('subject')}
          customName={customName}
          filter={filter}
          onFilter={setFilter}
          domains={domains}
          ahead={ahead}
          onAhead={setAhead}
          routeNext={(route?.next ?? []).slice(0, 3).map((k) => web.concepts.get(k)?.node.n ?? '')}
        />
        <p className="nx-over nx-hint mb-0" data-gone={hintGone || undefined}>
          Drag to move · scroll to zoom · hover a concept · click a subject to open its path
        </p>
        <AnimatePresence>
          {toast && (
            <motion.p className="nx-over nx-toast mb-0" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status">
              {toast}
            </motion.p>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {detailsOpen && selectedNode && webSel && (
            <motion.aside
              key={node!}
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
                  const key = `${l.subject}:${l.id}`
                  setNode(key)
                  webRef.current?.flyToNode(key)
                }}
                onSelect={(id) => {
                  const key = `${webSel.c.id}:${id}`
                  setNode(key)
                  webRef.current?.flyToNode(key)
                }}
                onOpenPath={() => openSubject(webSel.c.id, webRef.current?.camera(), webSel.n.id)}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </section>
    )
  }

  /* ── paths and ranks: type on the page, no stacked cards ── */
  if (!state) {
    return error ? <ErrorState message={error} onRetry={() => refresh(true)} /> : <LoadingBlock rows={8} />
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
        active={subject && tab === 'map' ? 'map' : tab}
        onChange={(id) => {
          setTab(id as 'map' | 'ranks')
          if (id === 'map' && subject) backToWeb()
        }}
      />
      {tab === 'ranks' ? (
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
      ) : subject ? (
        <SubjectPath
          subject={subject}
          selectedId={node}
          onSelect={setNode}
          onJump={(l) => openSubject(l.subject, undefined, l.id)}
          onBack={backToWeb}
          onData={setPathData}
        />
      ) : null}
    </div>
  )
}
