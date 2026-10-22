import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, ChevronRight, RefreshCw } from 'lucide-react'
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
import { SkillGraph } from '@/components/nexus/SkillGraph'
import { NodePanel } from '@/components/nexus/NodePanel'
import { WeeklyPool } from '@/components/nexus/WeeklyPool'
import { TitleTrack } from '@/components/nexus/TitleTrack'
import { WebLeaderboard } from '@/components/nexus/WebLeaderboard'
import { RadialWeb, type Camera } from '@/components/nexus/RadialWeb'
import { getLayout, layoutNow } from '@/components/nexus/layoutCache'
import { courseHref } from '@/components/nexus/course'
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
import { cachedState, cachedStructure, fetchNexusPath, fetchRoadmap, loadWeb, mergeWeb, nexusPathKey, ROADMAP_KEY } from '@/components/nexus/data'
import { Icon } from '@/components/icon/Icon'

/*
 * The Nexus.
 *   /nexus              every subject in ONE radial Rift Tree, grown outward
 *                       from you: subjects as sectors, zones as rings.
 *   /nexus?subject=id   that subject's own Rift Tree, exactly as the
 *                       original DSA Nexus (DSA is the original, unchanged).
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
  return subject ? <SubjectTree key={subject} subject={subject} /> : <RadialOverview />
}

/* ── one subject's own tree: the original Nexus ── */

function SubjectTree({ subject }: { subject: string }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const selectedId = params.get('node')
  const isDsaUrl = subject === 'dsa'
  const [tab, setTab] = useState<'map' | 'ranks' | 'board'>('map')
  const { user } = useAuth()
  const username = user?.username ?? ''
  const { data: raw, loading, error, refetch } = useApi(() => fetchNexusPath(subject), [subject], { cacheKey: nexusPathKey(subject) })
  // Only this subject's own skills and links: other subjects stay as "Needs · X" chips.
  const nexus = useMemo(() => {
    if (!raw || raw.subject?.id !== subject) return null
    const own = raw.nodes.filter((n) => !n.subject || n.subject === subject)
    const ids = new Set(own.map((n) => n.id))
    return { ...raw, nodes: own.map((n) => ({ ...n, requires: n.requires.filter((r) => ids.has(r)) })) }
  }, [raw, subject])
  const isDsa = (nexus?.subject?.engine ?? (isDsaUrl ? 'dsa' : null)) === 'dsa'
  const roadmapApi = useApi(fetchRoadmap, [], { cacheKey: ROADMAP_KEY, skip: !isDsa })
  const structureStreams = cachedStructure()?.streams
  const statsApi = useApi<NexusStatsResponse>(
    () => api.get<NexusStatsResponse>('/api/stats', { query: { username: username || undefined } }),
    [username],
    { cacheKey: `stats:${username}` },
  )

  const setSelectedId = useCallback(
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
  const back = useCallback(() => {
    if ((location.state as { fromWeb?: boolean } | null)?.fromWeb) navigate(-1)
    else navigate({ search: '' })
  }, [location.state, navigate])
  // Esc: close the selection, then back to the radial overview.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (document.querySelector('[role="dialog"]')) return
      if (selectedId) setSelectedId(null)
      else back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, setSelectedId, back])
  // "Needs · X": that subject's own tree, focused on the skill.
  const onJump = useCallback(
    (l: CrossLink) => {
      if (l.subject === subject) setSelectedId(l.id)
      else navigate({ search: `?subject=${encodeURIComponent(l.subject)}&node=${encodeURIComponent(l.id)}` }, { state: location.state })
    },
    [subject, setSelectedId, navigate, location.state],
  )

  const selectedNode = useMemo(() => nexus?.nodes.find((n) => n.id === selectedId) ?? null, [nexus, selectedId])
  // The goal path inside this tree, review hints, ⌘K.
  const webClusters = useMemo(() => {
    const st = cachedStructure()
    return st ? mergeWeb(st, cachedState(username)) : null
  }, [username])
  const { goal, plan, setGoal } = useGoal(cachedStructure()?.routes ?? [], webClusters)
  const own = (k: string) => (k.startsWith(`${subject}:`) ? k.slice(subject.length + 1) : null)
  // This subject's next steps along the goal path: open ones first, then the rest.
  const steps = useMemo(() => {
    if (!plan || !raw) return undefined
    const state = new Map(raw.nodes.map((n) => [n.id, n]))
    const mine = plan.order.map(own).filter((x): x is string => !!x && !state.get(x)?.completed)
    return [...mine.filter((id) => state.get(id)?.unlocked), ...mine.filter((id) => !state.get(id)?.unlocked)].slice(0, 5)
  }, [plan, raw])
  const highlight = useMemo(() => (plan ? new Set([...plan.keys].map(own).filter((x): x is string => !!x)) : undefined), [plan])
  const due = useMemo(() => {
    const out = new Set<string>()
    const day = 86400000
    for (const n of nexus?.nodes ?? []) {
      const m = (n as { memory?: { lastAt: number; interval: number } | null }).memory
      if (n.completed && m?.lastAt && (Date.now() - m.lastAt) / day >= Math.max(3, m.interval || 0)) out.add(n.id)
    }
    return out
  }, [nexus])
  const hueOf = useMemo(() => {
    const st = cachedStructure()
    const hue = new Map((st?.streams ?? []).map((x) => [x.id, x.hue]))
    const of = new Map((st?.clusters ?? []).map((c) => [c.id, hue.get(c.stream ?? c.domain)]))
    return (id: string) => of.get(id)
  }, [])
  const [paletteOpen, setPaletteOpen] = useState(false)
  usePaletteHotkey(() => setPaletteOpen(true))
  const phone = usePhone()
  // A jump lands on its node: bring it into view.
  useEffect(() => {
    if (!selectedNode) return
    const t = window.setTimeout(() => document.getElementById(`nx-node-${selectedNode.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode?.id])

  // The floating assistant sees the player's zone and the node in focus.
  const nexusBrief = useMemo(() => {
    if (!nexus) return undefined
    const { player, zones, nodes } = nexus
    const zoneNow = zones.find((z) => z.level === (selectedNode?.zone ?? player.level))
    const next = nodes.filter((n) => n.unlocked && !n.completed).slice(0, 8)
    return [
      `Subject: ${nexus.subject?.name ?? subject}.`,
      isDsa
        ? `Player: level ${player.level} (${player.name}), ${player.xp} XP; ${player.xpInLevel}/${player.xpForNext} XP and ${player.probsInLevel}/${player.probsForNext} problems toward the next level.`
        : nexus.subjectRank
          ? `Subject rank: ${nexus.subjectRank.tier} (${nexus.subjectRank.title}), ${nexus.subjectRank.progress}%.`
          : '',
      `Zones: ${zones.map((z) => `${z.level}. ${z.name} ${z.zoneProgress}%${z.locked ? ' (locked)' : ''}${z.current ? ' (current)' : ''}`).join('; ')}`,
      zoneNow ? `Zone in view: ${zoneNow.name} — ${zoneNow.nodesCompleted}/${zoneNow.nodeCount} nodes done.` : '',
      selectedNode
        ? `Selected node: ${selectedNode.name} — ${selectedNode.desc} Progress ${selectedNode.progress}%; ${selectedNode.completed ? 'completed' : selectedNode.unlocked ? 'unlocked' : `locked (requires ${selectedNode.requires.join(', ')})`}.`
        : '',
      next.length ? `Open nodes to work on: ${next.map((n) => n.name).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }, [nexus, selectedNode, isDsa, subject])
  useAgentPageContext({ label: selectedNode ? `Nexus · ${selectedNode.name}` : `Nexus · ${nexus?.subject?.short ?? subject}`, visibleText: nexusBrief })

  const title = 'The Nexus'
  const subtitle = isDsa
    ? 'Climb the rift — master skill nodes, unlock zones, and grind the weekly problem pool.'
    : `${nexus?.subject?.name ?? 'A subject'} — master each chapter's skills to unlock the next.`
  const header = (
    <PageHeader
      icon="nexus"
      title={title}
      subtitle={subtitle}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={back} aria-label="Back to every subject">
            <ArrowLeft className="size-3.5" /> All subjects
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch()
              roadmapApi.refetch()
              statsApi.refetch()
            }}
            aria-label="Refresh nexus data"
          >
            <RefreshCw className={cn('size-3.5', (loading || roadmapApi.loading || statsApi.loading) && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      }
    />
  )

  if (loading && !nexus) {
    return (
      <div>
        {header}
        <LoadingBlock rows={8} />
      </div>
    )
  }
  if (error || !nexus) {
    return (
      <div>
        {header}
        <ErrorState message={error ?? 'Failed to load the nexus'} onRetry={refetch} />
      </div>
    )
  }

  const roadmap = roadmapApi.data
  // Same formula as the server; shown before the roadmap response arrives.
  const weekSeed = roadmap?.weekSeed ?? Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  const { player, zones, nodes } = nexus
  const rank = nexus.subjectRank
  const currentZone = isDsa ? player.level : (zones.find((z) => z.current)?.level ?? 1)
  const activeZone = selectedNode?.zone ?? currentZone
  const zone = zones.find((z) => z.level === activeZone)
  const zoneColor = zone?.color ?? 'var(--color-primary)'
  const roadmapLevel = roadmap?.levels.find((l) => l.level === activeZone)
  const completedNodes = nodes.filter((n) => n.completed).length
  const xpEarned = nodes.reduce((s, n) => s + (n.completed ? n.xpReward : Math.round((n.xpReward * n.progress) / 100)), 0)

  const scrollToZone = (level: number) => {
    document.getElementById(`zone-${level}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const stream = structureStreams?.find((x) => x.id === cachedStructure()?.clusters.find((c) => c.id === subject)?.stream)
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: 'easeOut' }}>
      {/* Stream › Subject › Zone */}
      <nav aria-label="Where you are" className="mb-2 flex flex-wrap items-center gap-1 text-[12px] text-text-muted">
        <button type="button" className="cursor-pointer font-semibold hover:underline" style={stream ? { color: stream.hue } : undefined} onClick={back}>
          {stream?.name ?? 'Nexus'}
        </button>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-text-primary">{nexus.subject?.name}</span>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span>{zone?.name ?? `Zone ${activeZone}`}</span>
      </nav>
      {header}

      {/* Player status */}
      <Card glow className="mb-4">
        <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          {isDsa ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <RankGlyph level={player.level} size={40} />
                <div>
                  <p className="font-display text-base tracking-wider text-foreground">
                    LVL {player.level} · {player.name}
                  </p>
                  <p className="text-[11px] tracking-wider text-foreground-faint uppercase">
                    {completedNodes}/{nodes.length} skill nodes mastered · {formatNumber(player.xp)} total XP
                  </p>
                </div>
              </div>
              <XpBar xp={player.xpInLevel} nextLevelXp={player.xpForNext} levelName={`Rift ${player.name}`} />
              {(player.xpGated || player.probGated) && (
                <p className="text-xs text-foreground-dim">
                  Next rift needs{' '}
                  {player.xpGated && (
                    <span className="font-mono text-primary-bright tabular-nums">{formatNumber(Math.max(0, player.xpForNext - player.xpInLevel))} more XP</span>
                  )}
                  {player.xpGated && player.probGated && ' and '}
                  {player.probGated && <span className="font-mono text-cyan tabular-nums">{Math.max(0, player.probsForNext - player.probsInLevel)} more solves</span>}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <RankGlyph level={(rank?.tierIndex ?? 0) + 1} size={40} />
                <div>
                  <p className="font-display text-base tracking-wider text-foreground">
                    {rank ? `${rank.tier.toUpperCase()} · ${rank.title}` : nexus.subject?.name}
                  </p>
                  <p className="text-[11px] tracking-wider text-foreground-faint uppercase">
                    {completedNodes}/{nodes.length} skill nodes mastered · {formatNumber(xpEarned)} XP in {nexus.subject?.short}
                  </p>
                </div>
              </div>
              <XpBar xp={rank?.progress ?? 0} nextLevelXp={100} levelName={`${nexus.subject?.short ?? ''} rank`} />
              {rank?.toNext ? (
                <p className="text-xs text-foreground-dim">
                  Next: <span className="font-mono text-primary-bright">{rank.toNext.tier}</span> at {rank.toNext.at}% —{' '}
                  <span className="font-mono text-cyan tabular-nums">
                    about {rank.toNext.concepts} concept{rank.toNext.concepts === 1 ? '' : 's'}
                  </span>
                  {rank.coreLeft ? <span className="text-foreground-faint"> · or master the {rank.coreLeft} core skill{rank.coreLeft === 1 ? '' : 's'} left</span> : null}
                </p>
              ) : rank ? (
                <p className="text-xs text-foreground-dim">{rank.coreDone ? 'Every core skill mastered — the optional ones are yours to explore.' : 'Top rank reached.'}</p>
              ) : null}
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="font-display text-2xl text-primary-bright tabular-nums">{isDsa ? player.level : `${rank?.progress ?? 0}%`}</p>
              <p className="text-[10px] tracking-wider text-foreground-faint uppercase">{isDsa ? 'Rift Level' : 'Subject'}</p>
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
                {isDsa ? (statsApi.data?.title.current.title ?? '—') : (nexus.webPlayer?.name ?? '—')}
              </p>
              <p className="text-[10px] tracking-wider text-foreground-faint uppercase">{isDsa ? 'Rank' : 'Web Rank'}</p>
            </div>
            {isDsa && (
              <div className="text-center">
                <p className="font-display text-2xl text-cyan tabular-nums">{weekSeed % 1000}</p>
                <p className="text-[10px] tracking-wider text-foreground-faint uppercase">Week Seed</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs
        variant="pills"
        className="mb-4"
        items={[
          { id: 'map', label: '/zones', icon: <Icon name="map" className="size-3.5" aria-hidden="true" /> },
          ...(isDsa
            ? [
                {
                  id: 'ranks',
                  label: '/ranks',
                  icon: <Icon name="trophy" className="size-3.5" aria-hidden="true" />,
                  badge: statsApi.data ? statsApi.data.allTitles.length : undefined,
                },
              ]
            : []),
          { id: 'board', label: '/leaderboard', icon: <Icon name="users" className="size-3.5" aria-hidden="true" /> },
        ]}
        active={tab}
        onChange={(id) => setTab(id as 'map' | 'ranks' | 'board')}
      />

      {tab === 'ranks' ? (
        statsApi.loading && !statsApi.data ? (
          <LoadingBlock rows={5} />
        ) : statsApi.error && !statsApi.data ? (
          <ErrorState message={statsApi.error} onRetry={statsApi.refetch} />
        ) : (
          <TitleTrack stats={statsApi.data} />
        )
      ) : tab === 'board' ? (
        <WebLeaderboard subject={subject} subjectName={nexus.subject?.name} />
      ) : (
        <>
          <NexusPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            clusters={webClusters ?? []}
            streams={cachedStructure()?.streams ?? []}
            commands={[
              ...(cachedStructure()?.routes ?? []).map((r) => ({ id: `goal:${r.id}`, label: `Goal path: ${r.name}`, hint: goal === r.id ? 'active' : 'goal', run: () => setGoal(r.id) })),
              ...(goal ? [{ id: 'goal:none', label: 'Clear the goal path', hint: 'goal', run: () => setGoal(null) }] : []),
              { id: 'back', label: 'Back to every subject', hint: 'Esc', run: back },
            ]}
            onSubject={(id) => navigate({ search: `?subject=${encodeURIComponent(id)}` }, { state: location.state })}
            onConcept={(k) => {
              const [s2, ...rest] = k.split(':')
              if (s2 === subject) setSelectedId(rest.join(':'))
              else navigate({ search: `?subject=${encodeURIComponent(s2)}&node=${encodeURIComponent(rest.join(':'))}` }, { state: location.state })
            }}
          />
          {(plan || (cachedStructure()?.routes ?? []).length > 0) && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="mb-0 text-[12px] text-foreground-dim" role="status">
                {plan && steps ? (
                  steps.length ? (
                    <>
                      <span className="font-semibold text-warning">Goal path</span> · next here:{' '}
                      {steps.slice(0, 3).map((id, i) => (
                        <span key={id}>
                          {i ? ' → ' : ''}
                          <button type="button" className="cursor-pointer text-text-primary hover:underline" onClick={() => setSelectedId(id)}>
                            {i + 1}. {nexus.nodes.find((n) => n.id === id)?.name}
                          </button>
                        </span>
                      ))}
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-warning">Goal path</span> · nothing left here — the next steps are in other subjects.
                    </>
                  )
                ) : (
                  <span className="text-foreground-faint">Press ⌘K to search, or pick a goal path.</span>
                )}
              </p>
              <GoalMenu routes={cachedStructure()?.routes ?? []} goal={goal} onGoal={setGoal} />
            </div>
          )}
          {/* Zone rail */}
          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1" role="navigation" aria-label="Zones">
            {zones.map((z) => (
              <button
                key={z.level}
                type="button"
                onClick={() => scrollToZone(z.level)}
                aria-label={`Zone ${z.level}: ${z.name}${z.locked ? ' (locked)' : ''}`}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold tracking-wide whitespace-nowrap transition-all duration-200',
                  z.level === activeZone
                    ? 'border-primary bg-primary/15 text-foreground glow-box'
                    : 'border-border bg-surface text-foreground-dim hover:border-primary/60 hover:text-foreground',
                )}
              >
                {z.locked && <Icon name="lock" className="size-3 text-foreground-faint" aria-hidden="true" />}
                <span className="size-1.5 rounded-full" style={{ backgroundColor: z.color }} aria-hidden="true" />
                {z.name}
                <span className="font-mono text-[10px] text-foreground-faint tabular-nums">{z.zoneProgress}%</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-4">
              <SkillGraph
                nodes={nodes}
                zones={zones}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId(selectedId === id ? null : id)}
                zoneWord={isDsa ? 'Zone' : 'Chapter'}
                steps={steps}
                highlight={highlight}
                due={due}
              />
              {isDsa &&
                (roadmap ? (
                  <WeeklyPool level={roadmapLevel} weekSeed={roadmap.weekSeed} accentColor={zoneColor} />
                ) : roadmapApi.error ? (
                  <ErrorState message={roadmapApi.error} onRetry={roadmapApi.refetch} />
                ) : (
                  <Card>
                    <CardContent>
                      <LoadingBlock rows={4} />
                    </CardContent>
                  </Card>
                ))}
            </div>

            <div>
              {selectedNode ? (
                <ResponsivePanel open onClose={() => setSelectedId(null)} label={`${selectedNode.name} details`}>
                  <NodePanel
                    key={selectedNode.id}
                    node={selectedNode}
                    nodes={nodes}
                    zoneColor={zoneColor}
                    zoneName={zone?.name ?? `Zone ${selectedNode.zone}`}
                    engine={isDsa ? 'dsa' : null}
                    onClose={() => setSelectedId(null)}
                    onJump={onJump}
                    onSelect={(id) => setSelectedId(id)}
                    studyHref={courseHref({ id: subject, engine: isDsa ? 'dsa' : null }, selectedNode.id)}
                    due={due.has(selectedNode.id)}
                    onReview={due.has(selectedNode.id) ? () => void startReview(subject, selectedNode.id, navigate) : undefined}
                    shareHref={`/nexus?subject=${encodeURIComponent(subject)}&node=${encodeURIComponent(selectedNode.id)}`}
                    hueOf={hueOf}
                    bare={phone}
                  />
                </ResponsivePanel>
              ) : (
                <SelectHint
                  text={
                    isDsa
                      ? 'Click any node in the rift map to inspect prerequisites, resources, and recommended problems.'
                      : 'Click any node in the tree to inspect prerequisites, lessons and GATE PYQs.'
                  }
                />
              )}
            </div>
          </div>
        </>
      )}
    </motion.div>
  )
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
  const openSubject = useCallback(
    (id: string, nodeId?: string) => {
      const q = new URLSearchParams({ subject: id })
      if (nodeId) q.set('node', nodeId)
      navigate({ search: `?${q}` }, { state: { fromWeb: true } })
    },
    [navigate],
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

