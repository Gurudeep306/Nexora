import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Badge, Button, Card, CardContent, EmptyState, ErrorState, LoadingBlock, Tabs } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/icon/Icon'
import { SkillGraph } from './SkillGraph'
import { NodePanel } from './NodePanel'
import { WeeklyPool } from './WeeklyPool'
import { WebLeaderboard } from './WebLeaderboard'
import { fetchNexusPath, fetchRoadmap, nexusPathKey, ROADMAP_KEY } from './data'
import type { CrossLink, NexusResponse } from './types'

/*
 * One subject's learning path: the Rift Tree. Zone bands in order with the
 * rank rail, orbs with progress rings, branch links, the current zone lit and
 * locked zones saying what unlocks them, the focus chain, the node panel and
 * (for DSA) the weekly roadmap pool. DSA is exactly the original path; every
 * other subject is built the same way from its data file.
 */
export function SubjectPath({
  subject,
  selectedId,
  onSelect,
  onJump,
  onBack,
  onData,
}: {
  subject: string
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** A "Needs · X" chip: open that subject's path focused on the node. */
  onJump: (link: CrossLink) => void
  onBack: () => void
  /** The path's data (for the page's assistant context). */
  onData?: (data: NexusResponse | null) => void
}) {
  const fresh = useRef(false)
  const [tab, setTab] = useState<'path' | 'board'>('path')
  const { data: raw, loading, error, refetch } = useApi(
    () => {
      const f = fresh.current
      fresh.current = false
      return fetchNexusPath(subject, f)
    },
    [subject],
    { cacheKey: nexusPathKey(subject) },
  )
  // While a switch is in flight the hook still holds the previous subject.
  const nexus = raw && raw.subject?.id === subject ? raw : null
  useEffect(() => onData?.(nexus), [nexus, onData])
  const isDsa = nexus?.subject?.engine === 'dsa'
  const roadmapApi = useApi(fetchRoadmap, [], { cacheKey: ROADMAP_KEY, skip: !isDsa })
  const selectedNode = useMemo(() => nexus?.nodes.find((n) => n.id === selectedId) ?? null, [nexus, selectedId])

  // A jump lands on its node: bring it into view.
  useEffect(() => {
    if (!selectedNode) return
    const t = window.setTimeout(() => {
      document.getElementById(`nx-node-${selectedNode.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 420)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode?.id, subject])
  const scrollToZone = useCallback((level: number) => {
    document.getElementById(`zone-${level}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  if (!nexus) {
    return (
      <div className="nx-path-enter">
        <Button variant="outline" size="sm" onClick={onBack} className="mb-3" aria-label="Back to the web">
          <ArrowLeft className="size-3.5" /> Web
        </Button>
        {error && !loading ? <ErrorState message={error} onRetry={refetch} /> : <LoadingBlock rows={8} />}
      </div>
    )
  }

  const { player, zones, nodes } = nexus
  const rank = nexus.subjectRank
  const currentZone = isDsa ? player.level : (zones.find((z) => z.current)?.level ?? 1)
  const activeZone = selectedNode?.zone ?? currentZone
  const zone = zones.find((z) => z.level === activeZone)
  const zoneColor = zone?.color ?? 'var(--color-primary)'
  const roadmap = roadmapApi.data
  const roadmapLevel = roadmap?.levels.find((l) => l.level === activeZone)
  const done = nodes.filter((n) => n.completed).length

  return (
    <div className="nx-path-enter" key={subject}>
      <div className="nx-glass nx-path-head flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button variant="outline" size="sm" onClick={onBack} aria-label="Back to the web">
          <ArrowLeft className="size-3.5" /> Web
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="mb-0 font-display text-lg font-semibold text-text-primary">{nexus.subject?.name}</h2>
          <p className="mb-0 text-xs text-foreground-dim">{nexus.subject?.description}</p>
        </div>
        {rank && (
          <div className="nx-rank flex items-center gap-2.5 rounded-full border px-3 py-1.5" title={rank.next ? `Next: ${rank.next}` : 'Top tier'}>
            <span className="nx-rank-pips flex gap-0.5" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className="size-1.5 rounded-full" data-on={i <= rank.tierIndex || undefined} />
              ))}
            </span>
            <span className="text-[12px] font-semibold text-text-primary">{rank.tier}</span>
            <span className="text-[11px] text-foreground-dim">· {rank.title}</span>
            <span className="font-mono text-[10.5px] text-foreground-faint tabular-nums">
              {done}/{nodes.length} · {rank.progress}%
            </span>
          </div>
        )}
      </div>

      <Tabs
        variant="pills"
        className="mb-3"
        items={[
          { id: 'path', label: '/path', icon: <Icon name="route" className="size-3.5" aria-hidden="true" /> },
          { id: 'board', label: '/leaderboard', icon: <Icon name="trophy" className="size-3.5" aria-hidden="true" /> },
        ]}
        active={tab}
        onChange={(id) => setTab(id as 'path' | 'board')}
      />

      {tab === 'board' ? (
        <WebLeaderboard subject={subject} subjectName={nexus.subject?.name} />
      ) : (
        <>
          {/* Zone rail */}
          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1" role="navigation" aria-label="Zones">
            {zones.map((z) => (
              <button
                key={z.level}
                type="button"
                onClick={() => scrollToZone(z.level)}
                aria-label={`${isDsa ? 'Zone' : 'Chapter'} ${z.level}: ${z.name}${z.locked ? ' (locked)' : ''}`}
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

          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-4">
              <SkillGraph
                nodes={nodes}
                zones={zones}
                selectedId={selectedId}
                onSelect={(id) => onSelect(selectedId === id ? null : id)}
                onJump={onJump}
                rankEmblems={isDsa}
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
                <NodePanel
                  key={`${subject}:${selectedNode.id}`}
                  node={selectedNode}
                  nodes={nodes}
                  zoneColor={zoneColor}
                  zoneName={zone?.name ?? `Zone ${selectedNode.zone}`}
                  engine={isDsa ? 'dsa' : null}
                  onClose={() => onSelect(null)}
                  onJump={onJump}
                  onSelect={(id) => onSelect(id)}
                />
              ) : (
                <Card className="nx-glass sticky top-36">
                  <CardContent>
                    <EmptyState
                      icon="map"
                      title="Select a skill node"
                      description={
                        isDsa
                          ? 'Click any node in the rift web to inspect prerequisites, resources, and recommended problems.'
                          : 'Click any node to see its prerequisites, links to other subjects, lessons and PYQs.'
                      }
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
                        Hover a skill to trace its chain: what it needs lights teal, what it unlocks lights violet. Stars are mastered, rings fill as you
                        progress, and a dot travels along each open path. &ldquo;Needs&rdquo; chips are prerequisites in another subject; click one to open
                        that path. {isDsa ? 'The weekly pool reshuffles every 7 days.' : ''}
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
