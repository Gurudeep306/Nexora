import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, ChevronDown, GitBranch, Lock, Route } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn, formatNumber } from '@/lib/utils'
import { SkillNodeCard } from './SkillNodeCard'
import { ProblemRow } from './ProblemRow'
import type { NexusNode, NexusZone, RoadmapLevel } from './types'

function TopicBlock({ topic, defaultOpen }: { topic: RoadmapLevel['topics'][number]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const solved = topic.problems.filter((p) => p.solve_status === 'solved').length
  const total = topic.problems.length
  const pct = total ? Math.round((solved / total) * 100) : 0

  return (
    <div className="rounded-lg border border-border bg-surface/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-foreground">{topic.name}</span>
          <span className="block truncate text-[10px] text-foreground-dim">{topic.desc}</span>
        </span>
        <span className="hidden shrink-0 font-mono text-[10px] text-foreground-faint tabular-nums sm:block">
          {formatNumber(topic.solvedInPool)}/{formatNumber(topic.totalPool)} in pool
        </span>
        <span
          className={cn(
            'shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums',
            pct === 100 && total > 0 ? 'border-success/40 bg-success/10 text-success' : 'border-border bg-surface-2 text-foreground-dim',
          )}
        >
          {solved}/{total}
        </span>
        <ChevronDown
          className={cn('size-3.5 shrink-0 text-foreground-faint transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="border-t border-border px-1.5 py-1.5">
          {topic.problems.length === 0 ? (
            <p className="px-2 py-3 text-center font-mono text-[11px] text-foreground-faint">
              // no problems available — sync more from the Problems page
            </p>
          ) : (
            topic.problems.map((p) => <ProblemRow key={p.id} problem={p} />)
          )}
        </div>
      )}
    </div>
  )
}

export function ZoneCard({
  zone,
  nodes,
  roadmapLevel,
  defaultOpen,
  onSelectNode,
}: {
  zone: NexusZone
  nodes: NexusNode[]
  roadmapLevel?: RoadmapLevel
  defaultOpen: boolean
  onSelectNode: (node: NexusNode) => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  const zoneNodes = nodes.filter((n) => n.zone === zone.level)
  const state = zone.completed ? 'completed' : zone.current ? 'current' : zone.locked ? 'locked' : 'unlocked'

  return (
    <section
      className={cn(
        'card-neon overflow-hidden',
        state === 'current' && 'border-border-glow glow-box',
        state === 'locked' && 'opacity-70',
      )}
      aria-label={`Zone ${zone.level}: ${zone.name}`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-surface-2/60"
      >
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl border bg-surface-2',
            state === 'completed' ? 'border-success/50 text-success' : state === 'locked' ? 'border-border text-foreground-faint' : 'border-primary/50',
          )}
          style={state !== 'locked' && state !== 'completed' ? { borderColor: zone.color, color: zone.color } : undefined}
          aria-hidden="true"
        >
          {zone.completed ? (
            <Check className="size-5" />
          ) : state === 'locked' ? (
            <Lock className="size-4" />
          ) : (
            <span className="font-display text-sm tabular-nums">{zone.level}</span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm tracking-wide text-foreground">
              Zone {zone.level}: <span style={{ color: state === 'locked' ? undefined : zone.color }}>{zone.name}</span>
            </span>
            {zone.current && <Badge variant="accent">current</Badge>}
            {zone.completed && <Badge variant="success">cleared</Badge>}
          </span>
          <span className="mt-0.5 block truncate font-mono text-[11px] text-foreground-dim tabular-nums">
            rating {zone.minR}–{zone.maxR} · {zone.nodesCompleted}/{zone.nodeCount} skills ·{' '}
            {formatNumber(roadmapLevel?.solvedCount ?? 0)}/{formatNumber(roadmapLevel?.totalProblems ?? 0)} problems
          </span>
          <span className="mt-2 flex items-center gap-2">
            <span
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={zone.zoneProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Zone ${zone.level} progress`}
            >
              <span
                className="block h-full rounded-full transition-[width] duration-500"
                style={{ width: `${zone.zoneProgress}%`, background: zone.color }}
              />
            </span>
            <span className="font-mono text-[10px] text-foreground-faint tabular-nums">{zone.zoneProgress}%</span>
          </span>
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-foreground-faint transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {/* Body */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4 border-t border-border px-4 py-4"
        >
          {state === 'locked' && (
            <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-[11px] text-warning">
              <Lock className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              Requires {formatNumber(zone.xpRequired)} XP &amp; {formatNumber(zone.probsRequired)} problems solved to
              progress — browse the problems below to prepare.
            </p>
          )}

          {zoneNodes.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
                <GitBranch className="size-3.5" aria-hidden="true" /> Skill nodes
              </p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {zoneNodes.map((n, i) => (
                  <SkillNodeCard key={n.id} node={n} zoneColor={zone.color} index={i} onSelect={onSelectNode} />
                ))}
              </div>
            </div>
          )}

          {roadmapLevel && roadmapLevel.topics.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
                <Route className="size-3.5" aria-hidden="true" /> Weekly practice
              </p>
              <div className="space-y-2">
                {roadmapLevel.topics.map((topic, i) => (
                  <TopicBlock key={topic.name} topic={topic} defaultOpen={zone.current && i === 0} />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </section>
  )
}
