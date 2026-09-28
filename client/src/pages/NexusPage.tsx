import { useMemo, useState } from 'react'
import { Flame, Lock, Map, RefreshCw, Sparkles, Trophy } from 'lucide-react'
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
import { cn, formatNumber } from '@/lib/utils'
import { SkillGraph } from '@/components/nexus/SkillGraph'
import { NodePanel } from '@/components/nexus/NodePanel'
import { WeeklyPool } from '@/components/nexus/WeeklyPool'
import { TitleTrack } from '@/components/nexus/TitleTrack'
import type { NexusResponse, NexusStatsResponse, RoadmapResponse } from '@/components/nexus/types'

export default function NexusPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'map' | 'ranks'>('map')
  const { user } = useAuth()
  const username = user?.username ?? ''
  const { data, loading, error, refetch } = useApi(
    () =>
      Promise.all([api.get<NexusResponse>('/api/nexus'), api.get<RoadmapResponse>('/api/level-roadmap')]).then(
        ([nexus, roadmap]) => ({ nexus, roadmap }),
      ),
    [],
  )
  const statsApi = useApi<NexusStatsResponse>(
    () => api.get<NexusStatsResponse>('/api/stats', { query: { username: username || undefined } }),
    [username],
  )

  const selectedNode = useMemo(
    () => data?.nexus.nodes.find((n) => n.id === selectedId) ?? null,
    [data, selectedId],
  )

  if (loading) {
    return (
      <div>
        <PageHeader title="The Nexus" subtitle="Your competitive programming skill tree" />
        <LoadingBlock rows={8} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="The Nexus" subtitle="Your competitive programming skill tree" />
        <ErrorState message={error ?? 'Failed to load the nexus'} onRetry={refetch} />
      </div>
    )
  }

  const { nexus, roadmap } = data
  const { player, zones, nodes } = nexus
  const activeZone = selectedNode?.zone ?? player.level
  const zone = zones.find((z) => z.level === activeZone)
  const zoneColor = zone?.color ?? 'var(--color-primary)'
  const roadmapLevel = roadmap.levels.find((l) => l.level === activeZone)
  const completedNodes = nodes.filter((n) => n.completed).length

  const scrollToZone = (level: number) => {
    document.getElementById(`zone-${level}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div>
      <PageHeader
        title="The Nexus"
        subtitle="Climb the rift — master skill nodes, unlock zones, and grind the weekly problem pool."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch()
              statsApi.refetch()
            }}
            aria-label="Refresh nexus data"
          >
            <RefreshCw className={cn('size-3.5', (loading || statsApi.loading) && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      {/* Player status */}
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
                  {completedNodes}/{nodes.length} skill nodes mastered · {formatNumber(player.xp)} total XP
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
                <Flame className="size-4 text-streak" aria-hidden="true" />
                {statsApi.data?.streak.current ?? '—'}
              </p>
              <p className="text-[10px] tracking-wider text-foreground-faint uppercase">
                Day Streak{statsApi.data ? ` · best ${statsApi.data.streak.best}` : ''}
              </p>
            </div>
            <div className="hidden text-center sm:block">
              <p className="flex items-center justify-center gap-1 font-display text-sm text-gold">
                <Trophy className="size-4" aria-hidden="true" />
                {statsApi.data?.title.current.title ?? '—'}
              </p>
              <p className="text-[10px] tracking-wider text-foreground-faint uppercase">Rank</p>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl text-cyan tabular-nums">{roadmap.weekSeed % 1000}</p>
              <p className="text-[10px] tracking-wider text-foreground-faint uppercase">Week Seed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs
        variant="pills"
        className="mb-4"
        items={[
          { id: 'map', label: '/zones', icon: <Map className="size-3.5" aria-hidden="true" /> },
          {
            id: 'ranks',
            label: '/ranks',
            icon: <Trophy className="size-3.5" aria-hidden="true" />,
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
            {z.locked && <Lock className="size-3 text-foreground-faint" aria-hidden="true" />}
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
            onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
          />
          <WeeklyPool level={roadmapLevel} weekSeed={roadmap.weekSeed} accentColor={zoneColor} />
        </div>

        <div>
          {selectedNode ? (
            <NodePanel
              node={selectedNode}
              nodes={nodes}
              zoneColor={zoneColor}
              zoneName={zone?.name ?? `Zone ${selectedNode.zone}`}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <Card className="sticky top-4">
              <CardContent>
                <EmptyState
                  icon={<Map />}
                  title="Select a skill node"
                  description="Click any node in the rift map to inspect prerequisites, resources, and recommended problems."
                  className="py-8"
                />
                <div className="mt-2 space-y-2 border-t border-border pt-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
                    <Sparkles className="size-3" aria-hidden="true" /> Legend
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="success">mastered</Badge>
                    <Badge variant="primary">unlocked</Badge>
                    <Badge variant="default">
                      <Lock className="size-3" aria-hidden="true" /> locked
                    </Badge>
                  </div>
                  <p className="text-[11px] text-foreground-faint">
                    Hover a skill to trace everything it needs and everything it unlocks. Pulsing skills are open to you now; flowing links lead to them. The weekly pool reshuffles every 7 days.
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
