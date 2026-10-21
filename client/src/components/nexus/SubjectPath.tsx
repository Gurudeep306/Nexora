import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button, ErrorState, LoadingBlock, Tabs } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
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
      <div className="nx-path-head flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button variant="outline" size="sm" onClick={onBack} aria-label="Back to the web">
          <ArrowLeft className="size-3.5" /> Web
        </Button>
        <div className="min-w-0 flex-1 basis-[14rem]">
          <h2 className="mb-0 font-display text-lg font-semibold text-text-primary">{nexus.subject?.name}</h2>
          <p className="mb-0 line-clamp-2 text-xs text-foreground-dim">{nexus.subject?.description}</p>
        </div>
        {rank && (
          <p className="nx-rank-line mb-0 basis-full sm:basis-auto" title={rank.next ? `Next: ${rank.next}` : 'Top tier'}>
            <span className="nx-rank-tier">{rank.tier}</span>
            <span className="text-foreground-dim"> · {rank.title} · </span>
            <span className="font-mono text-[10.5px] text-foreground-faint tabular-nums">
              {done}/{nodes.length} · {rank.progress}%
            </span>
          </p>
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
          <div className="nx-subjects mb-5 flex gap-6 overflow-x-auto pb-1" role="navigation" aria-label="Zones">
            {zones.map((z) => (
              <button
                key={z.level}
                type="button"
                onClick={() => scrollToZone(z.level)}
                aria-label={`${isDsa ? 'Zone' : 'Chapter'} ${z.level}: ${z.name}${z.locked ? ' (locked)' : ''}`}
                className="nx-zone-link"
                data-on={z.level === activeZone || undefined}
              >
                <span className="font-mono text-[10px] opacity-60 tabular-nums">{String(z.level).padStart(2, '0')}</span>
                {z.name}
                {z.locked ? (
                  <Icon name="lock" className="size-3 opacity-50" aria-hidden="true" />
                ) : (
                  <span className="font-mono text-[10px] opacity-60 tabular-nums">{z.zoneProgress}%</span>
                )}
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
                  <LoadingBlock rows={4} />
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
                <div className="nx-side sticky top-36 space-y-2">
                  <p className="mb-0 text-[10px] font-semibold tracking-[0.28em] text-text-muted uppercase">Select a skill</p>
                  <p className="mb-0 max-w-[30ch] text-[13px] leading-relaxed text-foreground-dim">
                    Hover a skill to trace its chain — what it needs lights teal, what it unlocks violet. Click one for its details
                    {isDsa ? ', resources and problems.' : ', lessons and PYQs.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
