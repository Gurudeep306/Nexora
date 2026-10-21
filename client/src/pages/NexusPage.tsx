import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { RefreshCw } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  ErrorState,
  LoadingBlock,
  PageHeader,
  RankGlyph,
  Tabs,
  XpBar,
} from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useAgentPageContext } from '@/context/AgentContext'
import { cn, formatNumber } from '@/lib/utils'
import { NexusWeb, type Camera, type NexusWebHandle, type RegionRank } from '@/components/nexus/NexusWeb'
import { NodePanel } from '@/components/nexus/NodePanel'
import { SubjectPath } from '@/components/nexus/SubjectPath'
import { TitleTrack } from '@/components/nexus/TitleTrack'
import { WebLeaderboard } from '@/components/nexus/WebLeaderboard'
import type { CrossLink, NexusNode, NexusNodeResponse, NexusResponse, NexusStatsResponse, RiftLevel, RiftPlayer, WebCluster, WebNode } from '@/components/nexus/types'
import { fetchNexusWeb, NEXUS_WEB_KEY } from '@/components/nexus/data'
import { Icon } from '@/components/icon/Icon'

/** The web while it loads: the lattice alone, drawing itself in. */
const NO_CLUSTERS: WebCluster[] = []

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
  const [tab, setTab] = useState<'map' | 'ranks'>('map')
  const { user } = useAuth()
  const username = user?.username ?? ''
  const fresh = useRef(false)
  const webRef = useRef<NexusWebHandle>(null)
  const [pathData, setPathData] = useState<NexusResponse | null>(null)
  const [hintGone, setHintGone] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // The web: every subject and the unified web rank (the player card).
  const { data: web, loading, error, refetch } = useApi(
    () => {
      const f = fresh.current
      fresh.current = false
      return fetchNexusWeb(f)
    },
    [],
    { cacheKey: NEXUS_WEB_KEY },
  )
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
  const setNode = useCallback(
    (id: string | null) => {
      setParams(
        (p) => {
          const next = new URLSearchParams(p)
          if (id) next.set('node', id)
          else next.delete('node')
          return next
        },
        { replace: true, state: location.state },
      )
    },
    [setParams, location.state],
  )
  // Esc in a path returns to the web.
  useEffect(() => {
    if (!subject) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) backToWeb()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [subject, backToWeb])

  /* ── the web view's selected concept ("subject:id") ── */
  const byKey = useMemo(() => {
    const m = new Map<string, { c: WebCluster; n: WebNode }>()
    for (const c of web?.clusters ?? []) for (const n of c.nodes) m.set(`${c.id}:${n.id}`, { c, n })
    return m
  }, [web])
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
    for (const c of web?.clusters ?? []) if (c.rank) m[c.id] = { tier: c.rank.tier, title: c.rank.title }
    return m
  }, [web])

  // A deep link to a concept lands the camera on it.
  const landed = useRef(false)
  useEffect(() => {
    if (!web || subject || landed.current) return
    landed.current = true
    if (node && byKey.has(node) && !lastWebCamera) {
      const id = node
      requestAnimationFrame(() => webRef.current?.flyToNode(id, true))
    }
  }, [web, subject, node, byKey])

  /* ── the assistant sees what is on screen ── */
  const brief = useMemo(() => {
    if (!web) return undefined
    const p = web.player
    const all = web.clusters.reduce((a, c) => a + c.nodes.length, 0)
    const done = web.clusters.reduce((a, c) => a + c.nodes.filter((n) => n.s === 2).length, 0)
    const lines = [
      `Web rank: level ${p.level} (${p.name}), ${p.xp} web XP across every subject; ${p.xpInLevel}/${p.xpForNext} XP toward the next level.`,
      `The Nexus web: ${web.clusters.length} subjects, ${done}/${all} concepts mastered.`,
    ]
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
  }, [web, subject, pathData, node, selectedNode, webSel])
  useAgentPageContext({
    label: subject ? `Nexus · ${pathData?.subject?.short ?? subject}` : selectedNode ? `Nexus · ${selectedNode.name}` : 'Nexus',
    visibleText: brief,
  })

  const subtitle = 'One web of everything you learn — follow the paths out from you, master concepts, and climb the web rank.'
  if (loading && !web) {
    // Loading is the web drawing itself in around you — never a spinner.
    if (!subject && tab === 'map') {
      return (
        <section className="nx-bleed" aria-label="The Nexus web" aria-busy="true">
          <NexusWeb clusters={NO_CLUSTERS} selected={null} onSelect={() => {}} onOpenSubject={() => {}} />
        </section>
      )
    }
    return (
      <div>
        <PageHeader icon="nexus" title="The Nexus" subtitle={subtitle} />
        <LoadingBlock rows={8} />
      </div>
    )
  }
  if (error || !web) {
    return (
      <div>
        <PageHeader icon="nexus" title="The Nexus" subtitle={subtitle} />
        <ErrorState message={error ?? 'Failed to load the nexus'} onRetry={refetch} />
      </div>
    )
  }

  const player = web.player
  const allNodes = web.clusters.reduce((a, c) => a + c.nodes.length, 0)
  const allDone = web.clusters.reduce((a, c) => a + c.nodes.filter((n) => n.s === 2).length, 0)
  const selZone = webSel?.c.zones.find((z) => z.level === webSel.n.z)

  const refresh = () => {
    fresh.current = true
    refetch()
    statsApi.refetch()
    detailApi.refetch()
  }
  const webMode = tab === 'map' && !subject
  const springIn = { initial: { opacity: 0, y: -8, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { type: 'spring' as const, stiffness: 320, damping: 28 } }

  return (
    <div>
      {!webMode && (
      <>
      <PageHeader
        icon="nexus"
        title="The Nexus"
        subtitle={subtitle}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            aria-label="Refresh nexus data"
          >
            <RefreshCw className={cn('size-3.5', (loading || statsApi.loading) && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      {/* Player card: the unified web rank */}
      <Card glow className="nx-glass mb-4">
        <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <RankGlyph level={player.level} size={40} />
              <div>
                <p className="font-display text-base tracking-wider text-foreground">
                  Web rank · LVL {player.level} · {player.name}
                </p>
                <p className="text-[11px] tracking-wider text-foreground-faint uppercase">
                  {allDone}/{allNodes} concepts mastered across {web.clusters.length} subjects · {formatNumber(player.xp)} web XP
                </p>
              </div>
            </div>
            <XpBar xp={player.xpInLevel} nextLevelXp={player.xpForNext} levelName={`Web rank ${player.name}`} />
            {(player.xpGated || player.probGated) && (
              <p className="text-xs text-foreground-dim">
                Next rank needs{' '}
                {player.xpGated && (
                  <span className="font-mono text-primary-bright tabular-nums">{formatNumber(Math.max(0, player.xpForNext - player.xpInLevel))} more XP</span>
                )}
                {player.xpGated && player.probGated && ' and '}
                {player.probGated && (
                  <span className="font-mono text-cyan tabular-nums">{Math.max(0, player.probsForNext - player.probsInLevel)} more solves</span>
                )}
                <span className="text-foreground-faint"> · problems, PYQs and lessons all count</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="font-display text-2xl text-primary-bright tabular-nums">{player.level}</p>
              <p className="text-[10px] tracking-wider text-foreground-faint uppercase">Web Rank</p>
            </div>
            <div className="text-center">
              <p className="flex items-center justify-center gap-1 font-display text-2xl text-warning tabular-nums">
                <Icon name="flame" className="size-4 text-streak" aria-hidden="true" />
                {statsApi.data?.streak.current ?? '—'}
              </p>
              <p className="text-[10px] tracking-wider text-foreground-faint uppercase">
                Day Streak{statsApi.data ? ` · best ${statsApi.data.streak.best}` : ''}
              </p>
            </div>
            <div className="hidden text-center sm:block">
              <p className="flex items-center justify-center gap-1 font-display text-sm text-gold">
                <Icon name="trophy" className="size-4" aria-hidden="true" />
                {webTitles(statsApi.data, player, web.riftLevels)?.title.current.title ?? '—'}
              </p>
              <p className="text-[10px] tracking-wider text-foreground-faint uppercase">Title</p>
            </div>
            {web.dsaPlayer && (
              <div className="text-center">
                <p className="font-display text-2xl text-cyan tabular-nums">{web.dsaPlayer.level}</p>
                <p className="text-[10px] tracking-wider text-foreground-faint uppercase">DSA Rift</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </>
      )}

      {tab === 'ranks' || subject ? (
        <Tabs
          variant="pills"
          className="mb-4"
          items={[
            { id: 'map', label: '/web', icon: <Icon name="nexus" className="size-3.5" aria-hidden="true" /> },
            {
              id: 'ranks',
              label: '/ranks',
              icon: <Icon name="trophy" className="size-3.5" aria-hidden="true" />,
              badge: statsApi.data ? statsApi.data.allTitles.length : undefined,
            },
          ]}
          active={subject && tab === 'map' ? 'map' : tab}
          onChange={(id) => {
            setTab(id as 'map' | 'ranks')
            if (id === 'map' && subject) backToWeb()
          }}
        />
      ) : null}

      {tab === 'ranks' ? (
        <div className="space-y-4">
          <WebLeaderboard />
          {statsApi.loading && !statsApi.data ? (
            <LoadingBlock rows={5} />
          ) : statsApi.error && !statsApi.data ? (
            <ErrorState message={statsApi.error} onRetry={statsApi.refetch} />
          ) : (
            <TitleTrack stats={webTitles(statsApi.data, web.player, web.riftLevels)} />
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
      ) : (
        /* The web: full-bleed, edge to edge; everything else floats on it. */
        <section className="nx-bleed" aria-label="The Nexus web">
          <NexusWeb
            ref={webRef}
            clusters={web.clusters}
            selected={webSel ? node : null}
            onSelect={(k) => {
              setNode(k)
              setDetailsOpen(false)
            }}
            onOpenSubject={(id, cam) => openSubject(id, cam)}
            onOpenDetails={() => setDetailsOpen(true)}
            onInteract={() => setHintGone(true)}
            initialCamera={lastWebCamera}
            ranks={ranks}
          />
          {/* You, as type: no box. */}
          <motion.div className="nx-over nx-me" {...springIn}>
            <Avatar src={typeof user?.avatar_url === "string" ? user.avatar_url : null} avatar={user?.avatar} name={typeof user?.display_name === "string" ? user.display_name : username} seed={username} size="sm" ring={false} />
            <div className="min-w-0">
              <p className="nx-caps mb-0">Web rank</p>
              <p className="mb-0 truncate font-display text-[15px] leading-tight font-semibold text-white">
                {player.name} <span className="font-normal text-white/55">· LVL {player.level}</span>
              </p>
              <div className="nx-hair mt-1.5" aria-hidden="true">
                <span style={{ width: `${Math.round((Math.max(0, player.xpInLevel) / Math.max(1, player.xpForNext)) * 100)}%` }} />
              </div>
              <p className="mt-1 mb-0 font-mono text-[10.5px] text-white/55 tabular-nums">
                {formatNumber(player.xp)} XP · {allDone}/{allNodes} concepts · {statsApi.data?.streak.current ?? 0}d streak
              </p>
            </div>
          </motion.div>
          {/* Views, as plain links with an underline. */}
          <motion.nav className="nx-over nx-views" aria-label="Nexus views" {...springIn}>
            <button type="button" aria-current="page" className="nx-link" data-on="">
              /web
            </button>
            <button type="button" className="nx-link" onClick={() => setTab('ranks')}>
              /ranks
            </button>
            <button type="button" className="nx-link" onClick={refresh} aria-label="Refresh nexus data">
              <RefreshCw className={cn('size-3', (loading || statsApi.loading) && 'animate-spin')} />
            </button>
          </motion.nav>
          {/* One faint line of help, gone after the first touch. */}
          <p className="nx-over nx-hint mb-0" data-gone={hintGone || undefined}>
            Drag to move · scroll to zoom · hover a concept · click a subject to open its path
          </p>
          {/* Details: only on "Open details", in an edge-anchored sheet. */}
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
      )}
    </div>
  )
}
