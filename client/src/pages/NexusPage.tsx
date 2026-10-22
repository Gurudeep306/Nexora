import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  RankGlyph,
  Tabs,
  XpBar,
} from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useAgentPageContext } from '@/context/AgentContext'
import { cn, formatNumber } from '@/lib/utils'
import { NodePanel } from '@/components/nexus/NodePanel'
import { TitleTrack } from '@/components/nexus/TitleTrack'
import { WebLeaderboard } from '@/components/nexus/WebLeaderboard'
import { RadialWeb, type Camera } from '@/components/nexus/RadialWeb'
import { getLayout, layoutNow } from '@/components/nexus/layoutCache'
import { courseHref, subjectHref } from '@/components/nexus/course'
import { continueFrom, isDue, nextStep as findNextStep } from '@/components/nexus/insights'
import { NexusPalette, type PaletteCommand } from '@/components/nexus/NexusPalette'
import { ContinueChip, GoalMenu, RadialSkeleton, RankCardSkeleton, ResponsivePanel, startReview, useCelebration, useGoal, usePaletteHotkey, usePhone } from '@/components/nexus/extras'
import { Crosshair, Expand, Maximize2 } from 'lucide-react'
import type { RadialLayout } from '@/components/nexus/radial'
import type {
  CrossLink,
  NexusNode,
  NexusNodeResponse,
  NexusStatsResponse,
  NexusWebState,
  NexusWebStructure,
  RiftLevel,
  RiftPlayer,
  WebCluster,
  WebNode,
} from '@/components/nexus/types'
import { cachedState, cachedStructure, loadWeb, mergeWeb } from '@/components/nexus/data'
import { Icon } from '@/components/icon/Icon'

/*
 * The Nexus.
 *   /nexus              every subject in ONE radial Rift Tree, grown outward
 *                       from you: subjects as sectors, zones as rings.
 * A subject's own tree lives on its own page (SubjectPage: /learn/<id>,
 * /gate/subjects/<id>, /learn/dsa); clicking a subject goes there, and old
 * /nexus?subject= links redirect.
 */

/** Where the radial camera was (restored when you come back). */
let lastCamera: Camera | null = null

/**
 * The rank ladder shown under /ranks on the overview, placed by the web
 * rank: same ladder (names, badges, XP and solve gates), across subjects.
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

/** A radial node in the shape the node panel reads (details merged in when loaded). */
function asNexusNode(c: WebCluster, n: WebNode): NexusNode {
  const dsa = c.engine === 'dsa'
  const [solved, target] = dsa ? n.c.split('/').map(Number) : [0, 0]
  return {
    id: n.id,
    subject: c.id,
    kind: n.k,
    zone: n.z,
    name: n.n,
    icon: n.i ?? '',
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

/** The legend card shown while no skill is selected (the original's). */
function SelectHint({ text }: { text: string }) {
  return (
    <Card className="sticky top-4">
      <CardContent>
        <EmptyState icon="map" title="Select a skill node" description={text} className="py-8" />
        <div className="mt-2 space-y-2 border-t border-border pt-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
            <Icon name="sparkles" className="size-3" aria-hidden="true" /> Legend
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="success">mastered</Badge>
            <Badge variant="primary">unlocked</Badge>
            <Badge variant="default">
              <Icon name="lock" className="size-3" aria-hidden="true" /> locked
            </Badge>
          </div>
          <p className="text-[11px] text-foreground-faint">
            Hover a skill to trace everything it needs and everything it unlocks. Pulsing skills are open to you now; flowing links lead to them. The weekly pool reshuffles every 7 days.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function NexusPage() {
  const [params] = useSearchParams()
  const subject = params.get('subject')
  return subject ? <SubjectRedirect subject={subject} node={params.get('node')} /> : <RadialOverview />
}

/** Old links (/nexus?subject=x&node=y) open the subject's own page. */
function SubjectRedirect({ subject, node }: { subject: string; node: string | null }) {
  const [structure, setStructure] = useState<NexusWebStructure | null>(() => cachedStructure())
  useEffect(() => {
    if (structure?.clusters.some((c) => c.id === subject)) return
    loadWeb(false)
      .then(({ structure: s }) => setStructure(s))
      .catch(() => setStructure((s) => s))
  }, [structure, subject])
  const c = structure?.clusters.find((x) => x.id === subject)
  if (c) return <Navigate to={subjectHref(c, node)} replace />
  if (structure && !c) return <Navigate to="/nexus" replace />
  return <LoadingBlock rows={6} />
}

/* ── every subject in one radial tree ── */

function RadialOverview() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const selKey = params.get('node')
  const [tab, setTab] = useState<'map' | 'ranks'>('map')
  const { user } = useAuth()
  const username = user?.username ?? ''

  // From the device at once, then fresh in the background.
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
  const [loaded, setLoaded] = useState<RadialLayout | null>(null)
  const layout = (structure && layoutNow(structure.version)) || (loaded && structure && loaded.version.endsWith(structure.version) ? loaded : null)
  useEffect(() => {
    if (!structure || layoutNow(structure.version)) return
    let live = true
    getLayout(structure).then((l) => {
      if (live) setLoaded(l)
    })
    return () => {
      live = false
    }
  }, [structure])
  const clusters = useMemo(() => (structure ? mergeWeb(structure, state) : null), [structure, state])
  const statsApi = useApi<NexusStatsResponse>(
    () => api.get<NexusStatsResponse>('/api/stats', { query: { username: username || undefined } }),
    [username],
    { cacheKey: `stats:${username}` },
  )

  const byKey = useMemo(() => {
    const m = new Map<string, { c: WebCluster; n: WebNode }>()
    for (const c of clusters ?? []) for (const n of c.nodes) m.set(`${c.id}:${n.id}`, { c, n })
    return m
  }, [clusters])
  const sel = selKey ? byKey.get(selKey) : undefined
  const setSel = useCallback(
    (key: string | null) =>
      setParams(
        (p) => {
          const next = new URLSearchParams(p)
          if (key) next.set('node', key)
          else next.delete('node')
          return next
        },
        { replace: true },
      ),
    [setParams],
  )
  // A subject opens its own page (with its tree); a node lands on it there.
  const openSubject = useCallback(
    (id: string, nodeId?: string) => {
      const c = structure?.clusters.find((x) => x.id === id)
      navigate(c ? subjectHref(c, nodeId) : `/learn/${id}${nodeId ? `#${nodeId}` : ''}`)
    },
    [navigate, structure],
  )
  // Esc deselects.
  useEffect(() => {
    if (!selKey) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement)) setSel(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selKey, setSel])

  const detailApi = useApi<NexusNodeResponse>(
    () => api.get<NexusNodeResponse>(`/api/nexus/node/${sel!.c.id}/${sel!.n.id}`),
    [sel?.c.id, sel?.n.id],
    { skip: !sel, cacheKey: sel ? `nexus:node:${sel.c.id}:${sel.n.id}` : undefined },
  )
  const selectedNode = useMemo<NexusNode | null>(() => {
    if (!sel) return null
    const base = asNexusNode(sel.c, sel.n)
    const d = detailApi.data?.node
    if (!d || d.id !== sel.n.id) return base
    const fix = (l: CrossLink) => {
      const live = byKey.get(`${l.subject}:${l.id}`)
      return live ? { ...l, completed: live.n.s === 2, progress: live.n.p } : l
    }
    return {
      ...d,
      progress: base.progress,
      unlocked: base.unlocked,
      completed: base.completed,
      solved: sel.c.engine === 'dsa' ? base.solved : d.solved,
      crossRequires: (d.crossRequires ?? []).map(fix),
      crossUnlocks: (d.crossUnlocks ?? []).map(fix),
    }
  }, [sel, detailApi.data, byKey])
  const selNodes = useMemo(() => (sel ? sel.c.nodes.map((n) => asNexusNode(sel.c, n)) : []), [sel])

  // Goal path, review hints, the next step, where you left off, celebrations.
  const { goal, plan, setGoal } = useGoal(structure?.routes ?? [], clusters)
  const due = useMemo(() => {
    const out = new Set<string>()
    for (const c of clusters ?? []) for (const n of c.nodes) if (isDue(n)) out.add(`${c.id}:${n.id}`)
    return out
  }, [clusters])
  const next = useMemo(() => (clusters ? findNextStep(clusters) : null), [clusters])
  const resume = useMemo(() => (clusters ? continueFrom(clusters) : null), [clusters])
  const celebrate = useCelebration(clusters, !refreshing && !!state)
  const hueOf = useMemo(() => {
    const hue = new Map((structure?.streams ?? []).map((x) => [x.id, x.hue]))
    const of = new Map((clusters ?? []).map((c) => [c.id, hue.get(c.stream)]))
    return (id: string) => of.get(id)
  }, [structure, clusters])
  const [paletteOpen, setPaletteOpen] = useState(false)
  usePaletteHotkey(() => setPaletteOpen(true))
  const phone = usePhone()
  const run = (cmd: string) => window.dispatchEvent(new CustomEvent('nexus:command', { detail: cmd }))
  const commands: PaletteCommand[] = [
    { id: 'next', label: 'Jump to my next step', hint: 'command', icon: <Crosshair className="size-4" />, run: () => run('next') },
    { id: 'fit', label: 'Fit the view', hint: '0', icon: <Maximize2 className="size-4" />, run: () => run('fit') },
    { id: 'fullscreen', label: 'Toggle fullscreen', hint: 'F', icon: <Expand className="size-4" />, run: () => run('fullscreen') },
    ...(structure?.routes ?? []).map((r) => ({ id: `goal:${r.id}`, label: `Goal path: ${r.name}`, hint: goal === r.id ? 'active' : 'goal', icon: <Icon name="flag" className="size-4" />, run: () => setGoal(r.id) })),
    ...(goal ? [{ id: 'goal:none', label: 'Clear the goal path', hint: 'goal', icon: <Icon name="x" className="size-4" />, run: () => setGoal(null) }] : []),
    ...(structure?.streams ?? []).map((st) => ({ id: `stream:${st.id}`, label: `Zoom to ${st.name}`, hint: 'stream', icon: <span className="block size-2.5 rounded-full" style={{ background: st.hue }} />, run: () => run(`stream:${st.id}`) })),
  ]

  const allNodes = useMemo(() => (clusters ?? []).flatMap((c) => c.nodes), [clusters])
  const mastered = allNodes.filter((n) => n.s === 2).length
  const brief = useMemo(() => {
    if (!state || !clusters) return undefined
    const p = state.player
    return [
      `Web rank: level ${p.level} (${p.name}), ${p.xp} web XP across every subject; ${p.xpInLevel}/${p.xpForNext} XP toward the next level.`,
      `The radial Nexus: ${clusters.length} subjects as sectors around you, zones as rings; ${mastered}/${allNodes.length} skills mastered.`,
      selectedNode ? `Selected skill: ${selectedNode.name} (${sel?.c.name}) — ${selectedNode.progress}%; ${selectedNode.completed ? 'mastered' : selectedNode.unlocked ? 'unlocked' : 'locked'}.` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }, [state, clusters, mastered, allNodes.length, selectedNode, sel])
  useAgentPageContext({ label: selectedNode ? `Nexus · ${selectedNode.name}` : 'Nexus', visibleText: brief })

  const header = (
    <PageHeader
      icon="nexus"
      title="The Nexus"
      subtitle="Every subject's skill tree, grown outward from you — open a subject to climb its own tree."
      actions={
        <Button variant="outline" size="sm" onClick={() => refresh(true)} aria-label="Refresh nexus data">
          <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      }
    />
  )
  if (!state || !clusters) {
    return (
      <div>
        {header}
        {error ? (
          <ErrorState message={error} onRetry={() => refresh(true)} />
        ) : (
          <>
            <RankCardSkeleton />
            <div className="mb-4 h-9" />
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <RadialSkeleton />
            </div>
          </>
        )}
      </div>
    )
  }
  const player = state.player
  const selZone = sel?.c.zones.find((z) => z.level === sel.n.z)
  const week = state.week

  return (
    <div>
      {header}
      {/* The web rank, in the original player card. */}
      <Card glow className="mb-4">
        <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <RankGlyph level={player.level} size={40} />
              <div>
                <p className="font-display text-base tracking-wider text-foreground">
                  LVL {player.level} · {player.name}
                </p>
                <p className="text-[11px] tracking-wider text-foreground-faint uppercase">
                  {mastered}/{allNodes.length} skill nodes mastered · {formatNumber(player.xp)} web XP
                </p>
              </div>
            </div>
            <XpBar xp={player.xpInLevel} nextLevelXp={player.xpForNext} levelName={`Web ${player.name}`} />
            {player.xpToNext ? (
              <p className="text-xs text-foreground-dim">
                Next rank in <span className="font-mono text-cyan tabular-nums">about {player.conceptsToNext} concept{player.conceptsToNext === 1 ? '' : 's'}</span> ·{' '}
                <span className="font-mono text-primary-bright tabular-nums">{formatNumber(player.xpToNext)} XP</span>
              </p>
            ) : (
              <p className="text-xs text-foreground-dim">Top web rank reached.</p>
            )}
            {week && (
              <p className="mb-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-foreground-dim" aria-label="This week">
                <span className="text-[10px] font-semibold tracking-wider text-foreground-faint uppercase">This week</span>
                <span>
                  <span className="font-mono text-foreground tabular-nums">{week.concepts}</span> concept{week.concepts === 1 ? '' : 's'} mastered
                </span>
                <span>
                  <span className="font-mono text-foreground tabular-nums">+{formatNumber(week.xp)}</span> XP
                </span>
                {statsApi.data && (
                  <span>
                    <span className="font-mono text-foreground tabular-nums">{statsApi.data.streak.current}</span>-day streak
                  </span>
                )}
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
            <div className="text-center">
              <p className="font-display text-2xl text-cyan tabular-nums">{clusters.length}</p>
              <p className="text-[10px] tracking-wider text-foreground-faint uppercase">Subjects</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <Tabs
          variant="pills"
          items={[
            { id: 'map', label: '/web', icon: <Icon name="map" className="size-3.5" aria-hidden="true" /> },
            { id: 'ranks', label: '/ranks', icon: <Icon name="trophy" className="size-3.5" aria-hidden="true" />, badge: statsApi.data ? statsApi.data.allTitles.length : undefined },
          ]}
          active={tab}
          onChange={(id) => setTab(id as 'map' | 'ranks')}
        />
        {tab === 'map' && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {resume && <ContinueChip name={resume.name} subjectName={resume.subjectName} onClick={() => openSubject(resume.subject, resume.key.split(':').slice(1).join(':'))} />}
            <GoalMenu routes={structure?.routes ?? []} goal={goal} onGoal={setGoal} />
            <Button variant="ghost" size="sm" className="nx-press hidden sm:inline-flex" onClick={() => setPaletteOpen(true)} aria-label="Search the Nexus (⌘K)">
              <Icon name="search" className="size-3.5" aria-hidden="true" />
              <kbd className="font-mono text-[10.5px] text-text-muted">⌘K</kbd>
            </Button>
          </div>
        )}
      </div>
      {tab === 'map' && plan && (
        <p className="-mt-2 mb-3 text-[12px] text-foreground-dim" role="status">
          <span className="font-semibold text-warning">Goal path</span> · {plan.order.length} concepts ·{' '}
          {plan.order.filter((k) => byKey.get(k)?.n.s === 2).length} mastered · next:{' '}
          {plan.next.slice(0, 3).map((k, i) => (
            <span key={k}>
              {i ? ' → ' : ''}
              <button type="button" className="cursor-pointer text-text-primary hover:underline" onClick={() => setSel(k)}>
                {i + 1}. {byKey.get(k)?.n.n}
              </button>
            </span>
          ))}
        </p>
      )}
      <NexusPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        clusters={clusters}
        streams={structure?.streams ?? []}
        commands={commands}
        onSubject={(id) => openSubject(id)}
        onConcept={(k) => setSel(k)}
      />

      {tab === 'ranks' ? (
        <div className="space-y-4">
          <WebLeaderboard />
          {statsApi.loading && !statsApi.data ? (
            <LoadingBlock rows={5} />
          ) : statsApi.error && !statsApi.data ? (
            <ErrorState message={statsApi.error} onRetry={statsApi.refetch} />
          ) : (
            <TitleTrack stats={webTitles(statsApi.data, player, state.riftLevels)} />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            {layout ? (
              <RadialWeb
                clusters={clusters}
                layout={layout}
                selected={sel ? selKey : null}
                onSelect={setSel}
                onOpenSubject={(id) => openSubject(id)}
                initialCamera={lastCamera}
                onCamera={(c) => {
                  lastCamera = c
                }}
                streams={structure?.streams ?? []}
                me={{
                  player,
                  username,
                  displayName: typeof user?.display_name === 'string' ? user.display_name : undefined,
                  avatarUrl: typeof user?.avatar_url === 'string' ? user.avatar_url : null,
                  avatar: user?.avatar,
                  mastered,
                  total: allNodes.length,
                  streak: statsApi.data?.streak.current,
                }}
                route={plan}
                due={due}
                celebrate={celebrate}
                nextStep={next}
              />
            ) : (
              <RadialSkeleton />
            )}
          </div>
          <div>
            {selectedNode && sel ? (
              <ResponsivePanel open onClose={() => setSel(null)} label={`${selectedNode.name} details`}>
                <NodePanel
                  key={selKey!}
                  node={selectedNode}
                  nodes={selNodes}
                  zoneColor={selZone?.color ?? 'var(--color-primary)'}
                  zoneName={`${sel.c.short} · ${selZone?.name ?? `Zone ${selectedNode.zone}`}`}
                  detailLoading={detailApi.loading && !detailApi.data}
                  engine={sel.c.engine}
                  onClose={() => setSel(null)}
                  onJump={(l) => setSel(`${l.subject}:${l.id}`)}
                  onSelect={(id) => setSel(`${sel.c.id}:${id}`)}
                  onOpenPath={() => openSubject(sel.c.id, sel.n.id)}
                  compact
                  studyHref={courseHref(sel.c, sel.n.id)}
                  due={due.has(selKey!)}
                  onReview={due.has(selKey!) ? () => void startReview(sel.c.id, sel.n.id, navigate) : undefined}
                  shareHref={`/nexus?subject=${encodeURIComponent(sel.c.id)}&node=${encodeURIComponent(sel.n.id)}`}
                  hueOf={hueOf}
                  bare={phone}
                />
              </ResponsivePanel>
            ) : (
              <SelectHint text="Every subject is a sector, its zones are rings outward from you. Click a subject's name to open its own tree, or any skill to inspect it." />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

