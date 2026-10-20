import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { NexusWeb, type NexusWebHandle } from '@/components/nexus/NexusWeb'
import { NodePanel } from '@/components/nexus/NodePanel'
import { WeeklyPool } from '@/components/nexus/WeeklyPool'
import { TitleTrack } from '@/components/nexus/TitleTrack'
import type { CrossLink, NexusNode, NexusNodeResponse, NexusStatsResponse, WebCluster, WebNode } from '@/components/nexus/types'
import { fetchNexusWeb, fetchRoadmap, NEXUS_WEB_KEY, ROADMAP_KEY } from '@/components/nexus/data'
import { Icon } from '@/components/icon/Icon'

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
  const selected = params.get('node')
  const [tab, setTab] = useState<'map' | 'ranks'>('map')
  const [activeCluster, setActiveCluster] = useState<string | null>(selected?.split(':')[0] ?? null)
  const { user } = useAuth()
  const username = user?.username ?? ''
  const fresh = useRef(false)
  const webRef = useRef<NexusWebHandle>(null)

  const setSelected = useCallback(
    (key: string | null) => {
      setParams(
        (p) => {
          const next = new URLSearchParams(p)
          next.delete('subject')
          if (key) next.set('node', key)
          else next.delete('node')
          return next
        },
        { replace: true },
      )
      if (key) setActiveCluster(key.split(':')[0])
    },
    [setParams, setActiveCluster],
  )

  // The web and the weekly pool load in parallel and independently; both are
  // cached, so revisits are instant.
  const { data: web, loading, error, refetch } = useApi(
    () => {
      const f = fresh.current
      fresh.current = false
      return fetchNexusWeb(f)
    },
    [],
    { cacheKey: NEXUS_WEB_KEY },
  )
  const roadmapApi = useApi(fetchRoadmap, [], { cacheKey: ROADMAP_KEY })
  const statsApi = useApi<NexusStatsResponse>(
    () => api.get<NexusStatsResponse>('/api/stats', { query: { username: username || undefined } }),
    [username],
    { cacheKey: `stats:${username}` },
  )

  const clusters = web?.clusters
  const byKey = useMemo(() => {
    const m = new Map<string, { c: WebCluster; n: WebNode }>()
    for (const c of clusters ?? []) for (const n of c.nodes) m.set(`${c.id}:${n.id}`, { c, n })
    return m
  }, [clusters])
  const sel = selected ? byKey.get(selected) : undefined
  const [selSubject, selId] = selected ? [selected.split(':')[0], selected.split(':').slice(1).join(':')] : [null, null]

  // Node details load lazily, one node at a time.
  const detailApi = useApi<NexusNodeResponse>(
    () => api.get<NexusNodeResponse>(`/api/nexus/node/${selSubject}/${selId}`),
    [selSubject, selId],
    { skip: !sel, cacheKey: sel ? `nexus:node:${selected}` : undefined },
  )

  // Progress and state come from the web (current); the rest from the detail.
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
  const clusterNodes = useMemo(() => (sel ? sel.c.nodes.map((n) => asNexusNode(sel.c, n)) : []), [sel])

  // A deep link (?node=…) or a jump lands on its skill.
  const landed = useRef(false)
  useEffect(() => {
    if (!web || landed.current) return
    landed.current = true
    if (selected && byKey.has(selected)) {
      const id = selected
      requestAnimationFrame(() => webRef.current?.flyToNode(id, true))
    }
  }, [web, selected, byKey])
  const onJump = useCallback(
    (link: CrossLink) => {
      const key = `${link.subject}:${link.id}`
      setSelected(key)
      webRef.current?.flyToNode(key)
    },
    [setSelected],
  )

  const dsaCluster = clusters?.find((c) => c.engine === 'dsa') ?? null
  const active = clusters?.find((c) => c.id === (activeCluster ?? sel?.c.id)) ?? dsaCluster ?? clusters?.[0] ?? null

  // The floating assistant sees the subject in view, the player and the skill in focus.
  const nexusBrief = useMemo(() => {
    if (!web) return undefined
    const { player } = web
    const all = web.clusters.reduce((a, c) => a + c.nodes.length, 0)
    const done = web.clusters.reduce((a, c) => a + c.nodes.filter((n) => n.s === 2).length, 0)
    const lines = [
      `Player: level ${player.level} (${player.name}), ${player.xp} XP; ${player.xpInLevel}/${player.xpForNext} XP and ${player.probsInLevel}/${player.probsForNext} problems toward the next level.`,
      `The Nexus web: ${web.clusters.length} subjects, ${done}/${all} skills mastered.`,
    ]
    if (active) {
      lines.push(
        `Subject in view: ${active.name}. Zones: ${active.zones.map((z) => `${z.level}. ${z.name} ${z.zoneProgress}%${z.locked ? ' (locked)' : ''}${z.current ? ' (current)' : ''}`).join('; ')}`,
      )
      const open = active.nodes.filter((n) => n.s === 1).slice(0, 8)
      if (open.length) lines.push(`Open skills to work on: ${open.map((n) => `${n.n} (${n.c})`).join(', ')}`)
    }
    if (selectedNode) {
      lines.push(
        `Selected skill: ${selectedNode.name}${selectedNode.desc ? ` — ${selectedNode.desc}` : ''}. Progress ${selectedNode.progress}%; ${
          selectedNode.completed ? 'mastered' : selectedNode.unlocked ? 'unlocked' : `locked (requires ${selectedNode.requires.join(', ')})`
        }.${selectedNode.crossRequires?.length ? ` Needs from other subjects: ${selectedNode.crossRequires.map((c) => `${c.name} (${c.subjectShort})`).join(', ')}.` : ''}`,
      )
    }
    return lines.join('\n')
  }, [web, active, selectedNode])
  useAgentPageContext({ label: selectedNode ? `Nexus · ${selectedNode.name}` : 'Nexus', visibleText: nexusBrief })

  const subtitle = 'Climb the rift — one web of every subject: master skills, unlock zones, and grind the weekly problem pool.'

  if (loading && !web) {
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

  const roadmap = roadmapApi.data
  // Same formula as the server; shown before the roadmap response arrives.
  const weekSeed = roadmap?.weekSeed ?? Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  const { player } = web
  const allNodes = web.clusters.reduce((a, c) => a + c.nodes.length, 0)
  const allDone = web.clusters.reduce((a, c) => a + c.nodes.filter((n) => n.s === 2).length, 0)
  const zones = active?.zones ?? []
  const activeIsDsa = active?.engine === 'dsa'
  const activeZone = sel && sel.c.id === active?.id ? sel.n.z : activeIsDsa ? player.level : (zones.find((z) => z.current)?.level ?? 1)
  const zone = zones.find((z) => z.level === activeZone)
  const zoneColor = zone?.color ?? 'var(--color-primary)'
  const dsaZoneLevel = sel?.c.engine === 'dsa' ? sel.n.z : player.level
  const roadmapLevel = roadmap?.levels.find((l) => l.level === dsaZoneLevel)
  const selZone = sel?.c.zones.find((z) => z.level === sel.n.z)

  return (
    <div>
      <PageHeader
        icon="nexus"
        title="The Nexus"
        subtitle={subtitle}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fresh.current = true
              refetch()
              roadmapApi.refetch()
              statsApi.refetch()
              detailApi.refetch()
            }}
            aria-label="Refresh nexus data"
          >
            <RefreshCw className={cn('size-3.5', (loading || roadmapApi.loading || statsApi.loading) && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      {/* Player status: one Rift level and XP across the whole web */}
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
                  {allDone}/{allNodes} skill nodes mastered · {formatNumber(player.xp)} total XP
                </p>
              </div>
            </div>
            <XpBar xp={player.xpInLevel} nextLevelXp={player.xpForNext} levelName={`Rift ${player.name}`} />
            {(player.xpGated || player.probGated) && (
              <p className="text-xs text-foreground-dim">
                Next rift needs{' '}
                {player.xpGated && (
                  <span className="font-mono text-primary-bright tabular-nums">
                    {formatNumber(Math.max(0, player.xpForNext - player.xpInLevel))} more XP
                  </span>
                )}
                {player.xpGated && player.probGated && ' and '}
                {player.probGated && (
                  <span className="font-mono text-cyan tabular-nums">
                    {Math.max(0, player.probsForNext - player.probsInLevel)} more solves
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="font-display text-2xl text-primary-bright tabular-nums">{player.level}</p>
              <p className="text-[10px] tracking-wider text-foreground-faint uppercase">Rift Level</p>
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
                {statsApi.data?.title.current.title ?? '—'}
              </p>
              <p className="text-[10px] tracking-wider text-foreground-faint uppercase">Rank</p>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl text-cyan tabular-nums">{weekSeed % 1000}</p>
              <p className="text-[10px] tracking-wider text-foreground-faint uppercase">Week Seed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs
        variant="pills"
        className="mb-4"
        items={[
          { id: 'map', label: '/zones', icon: <Icon name="map" className="size-3.5" aria-hidden="true" /> },
          {
            id: 'ranks',
            label: '/ranks',
            icon: <Icon name="trophy" className="size-3.5" aria-hidden="true" />,
            badge: statsApi.data ? statsApi.data.allTitles.length : undefined,
          },
        ]}
        active={tab}
        onChange={(id) => setTab(id as 'map' | 'ranks')}
      />

      {tab === 'ranks' ? (
        statsApi.loading && !statsApi.data ? (
          <LoadingBlock rows={5} />
        ) : statsApi.error && !statsApi.data ? (
          <ErrorState message={statsApi.error} onRetry={statsApi.refetch} />
        ) : (
          <TitleTrack stats={statsApi.data} />
        )
      ) : (
        <>
          {/* Zone rail: the zones of the subject in view; click one to fly to its ring */}
          {active && (
            <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1" role="navigation" aria-label="Zones">
              {zones.map((z) => (
                <button
                  key={z.level}
                  type="button"
                  onClick={() => webRef.current?.flyToZone(active.id, z.level)}
                  aria-label={`${activeIsDsa ? 'Zone' : 'Chapter'} ${z.level}: ${z.name}${z.locked ? ' (locked)' : ''}`}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold tracking-wide whitespace-nowrap transition-all duration-200',
                    z.level === activeZone
                      ? 'border-primary bg-primary/15 text-foreground'
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
          )}

          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-4">
              <NexusWeb ref={webRef} data={web} selected={selected && byKey.has(selected) ? selected : null} onSelect={setSelected} onActiveCluster={setActiveCluster} />
              {roadmap ? (
                <WeeklyPool level={roadmapLevel} weekSeed={roadmap.weekSeed} accentColor={dsaCluster?.zones.find((z) => z.level === dsaZoneLevel)?.color ?? zoneColor} />
              ) : roadmapApi.error ? (
                <ErrorState message={roadmapApi.error} onRetry={roadmapApi.refetch} />
              ) : (
                <Card>
                  <CardContent>
                    <LoadingBlock rows={4} />
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              {selectedNode && sel ? (
                <NodePanel
                  key={selected!}
                  node={selectedNode}
                  nodes={clusterNodes}
                  zoneColor={selZone?.color ?? zoneColor}
                  zoneName={selZone?.name ?? `Zone ${selectedNode.zone}`}
                  detailLoading={detailApi.loading && !detailApi.data}
                  engine={sel.c.engine}
                  onClose={() => setSelected(null)}
                  onJump={onJump}
                  onSelect={(id) => {
                    const key = `${sel.c.id}:${id}`
                    setSelected(key)
                    webRef.current?.flyToNode(key)
                  }}
                />
              ) : (
                <Card className="sticky top-4">
                  <CardContent>
                    <EmptyState
                      icon="map"
                      title="Select a skill node"
                      description="Click a subject in the web to zoom into it, then any skill to inspect its prerequisites, links to other subjects, and practice."
                      className="py-8"
                    />
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
                        Drag to pan, scroll or pinch to zoom; click empty space to see the whole web. Hover a skill to trace its chain: what it needs lights
                        teal, what it unlocks violet. Stars are mastered, rings fill as you progress, and a dot travels along each open path. Branches between
                        subjects are cross-subject prerequisites; a &ldquo;Needs&rdquo; chip flies you there. The weekly pool reshuffles every 7 days.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
