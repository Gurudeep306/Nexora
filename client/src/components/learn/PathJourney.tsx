import { useCallback, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  Check,
  CircleDashed,
  Clock,
  Cpu,
  Database,
  Globe,
  Lock,
  Play,
  Rocket,
  Shield,
  Terminal,
  Waypoints,
  Wrench,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, Progress, Tooltip, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import type { ForgePath, ForgeTopicStatus } from './types'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS: { id: ForgeTopicStatus; label: string; icon: typeof Check }[] = [
  { id: 'not-started', label: 'Not started', icon: CircleDashed },
  { id: 'in-progress', label: 'In progress', icon: Play },
  { id: 'completed', label: 'Completed', icon: Check },
]

function difficultyVariant(d: string): 'cyan' | 'warning' | 'accent' {
  if (d === 'beginner') return 'cyan'
  if (d === 'advanced') return 'accent'
  return 'warning'
}

export function PathJourney({
  path,
  onBack,
  onChanged,
}: {
  path: ForgePath
  onBack: () => void
  onChanged: () => void
}) {
  const toast = useToast()
  const [overrides, setOverrides] = useState<Record<string, ForgeTopicStatus>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const statusOf = useCallback(
    (topicId: string, base: ForgeTopicStatus): ForgeTopicStatus => overrides[topicId] ?? base,
    [overrides],
  )

  /** A stage unlocks once the previous stage has at least one completed topic. */
  const unlockedStages = useMemo(() => {
    return path.milestones.map((_, i) => {
      if (i === 0) return true
      const prev = path.milestones[i - 1]
      return prev.topics.some((t) => statusOf(t.id, t.status) === 'completed')
    })
  }, [path, statusOf])

  async function setStatus(topicId: string, status: ForgeTopicStatus) {
    setSaving(topicId)
    setOverrides((o) => ({ ...o, [topicId]: status }))
    try {
      await api.post(`/api/forge/topic/${encodeURIComponent(topicId)}/status`, { status, pathId: path.id })
      if (status === 'completed') toast.success('Stage topic completed', 'Forge progress saved.')
      onChanged()
    } catch (err) {
      setOverrides((o) => {
        const copy = { ...o }
        delete copy[topicId]
        return copy
      })
      toast.error('Failed to save progress', (err as Error).message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} aria-label="Back to all paths">
          <ArrowLeft /> Paths
        </Button>
        <h2 className="font-display text-lg tracking-wide glow-text" style={{ color: path.color }}>
          {path.title}
        </h2>
        <Badge variant="outline" className="ml-auto font-mono tabular-nums">
          {path.completedTopics}/{path.totalTopics} topics
        </Badge>
      </div>
      <Progress value={path.progress} max={100} barClassName="from-primary via-cyan to-primary-bright" />

      {/* Vertical journey map */}
      <div className="relative pl-8 md:pl-12">
        {/* base track */}
        <div className="absolute top-2 bottom-2 left-[11px] w-0.5 rounded-full bg-muted md:left-[19px]" aria-hidden="true" />
        {/* neon progress fill */}
        <motion.div
          className="absolute top-2 left-[11px] w-0.5 rounded-full md:left-[19px]"
          aria-hidden="true"
          initial={{ height: 0 }}
          animate={{ height: `calc(${Math.max(path.progress, 2)}% - 8px)` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ background: `linear-gradient(to bottom, ${path.color}, var(--color-primary-bright))`, boxShadow: `0 0 10px ${path.color}` }}
        />

        <ol className="space-y-6">
          {path.milestones.map((ms, i) => {
            const unlocked = unlockedStages[i]
            const doneCount = ms.topics.filter((t) => statusOf(t.id, t.status) === 'completed').length
            const stageComplete = doneCount === ms.topics.length
            return (
              <motion.li
                key={ms.id ?? ms.title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i, 6) * 0.05 }}
                className="relative"
              >
                {/* stage node */}
                <span
                  className={cn(
                    'absolute top-1 -left-8 flex size-6 items-center justify-center rounded-full border-2 bg-background md:-left-12 md:size-10',
                    !unlocked && 'border-border text-foreground-faint',
                  )}
                  style={unlocked ? { borderColor: stageComplete ? path.color : 'var(--color-border-glow)', color: stageComplete ? path.color : 'var(--color-primary-bright)', boxShadow: stageComplete ? `0 0 14px ${path.color}` : undefined } : undefined}
                  aria-hidden="true"
                >
                  {!unlocked ? <Lock className="size-3 md:size-4" /> : stageComplete ? <Check className="size-3 md:size-4" /> : <span className="font-display text-[10px] md:text-xs">{i + 1}</span>}
                </span>

                <Card className={cn(!unlocked && 'opacity-55')}>
                  <CardContent className="space-y-3 p-4 md:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-sm tracking-wider text-foreground uppercase">
                        Stage {i + 1} · {ms.title}
                      </h3>
                      {!unlocked && (
                        <Badge variant="default"><Lock /> Locked</Badge>
                      )}
                      <span className="ml-auto font-mono text-[11px] text-foreground-faint tabular-nums">
                        {doneCount}/{ms.topics.length}
                      </span>
                    </div>
                    {!unlocked && (
                      <p className="text-xs text-foreground-dim">
                        Complete at least one topic in <span className="text-primary-bright">{path.milestones[i - 1].title}</span> to unlock this stage.
                      </p>
                    )}
                    <ul className="space-y-2">
                      {ms.topics.map((t) => {
                        const st = statusOf(t.id, t.status)
                        return (
                          <li
                            key={t.id}
                            className={cn(
                              'rounded-lg border bg-background p-3 transition-colors duration-200',
                              st === 'completed' ? 'border-success/40' : st === 'in-progress' ? 'border-primary/50' : 'border-border',
                            )}
                          >
                            <div className="flex flex-wrap items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground">{t.title}</p>
                                <p className="mt-1 text-xs leading-relaxed text-foreground-dim">{t.desc}</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  <Badge variant={difficultyVariant(t.difficulty)}>{t.difficulty}</Badge>
                                  <Badge variant="default"><Clock /> {t.time}</Badge>
                                </div>
                              </div>
                              {/* status segmented control */}
                              <div
                                role="group"
                                aria-label={`Status for ${t.title}`}
                                className={cn('flex shrink-0 overflow-hidden rounded-lg border border-border', !unlocked && 'pointer-events-none')}
                              >
                                {STATUS_OPTIONS.map((opt) => {
                                  const Icon = opt.icon
                                  const active = st === opt.id
                                  return (
                                    <Tooltip key={opt.id} label={opt.label} side="top">
                                      <button
                                        onClick={() => void setStatus(t.id, opt.id)}
                                        disabled={!unlocked || saving === t.id}
                                        aria-pressed={active}
                                        aria-label={`${opt.label}: ${t.title}`}
                                        className={cn(
                                          'flex size-8 cursor-pointer items-center justify-center transition-colors duration-200 disabled:cursor-not-allowed',
                                          active
                                            ? opt.id === 'completed'
                                              ? 'bg-success/15 text-success'
                                              : opt.id === 'in-progress'
                                                ? 'bg-primary/15 text-primary-bright'
                                                : 'bg-surface-2 text-foreground-dim'
                                            : 'text-foreground-faint hover:bg-surface-2 hover:text-foreground',
                                        )}
                                      >
                                        <Icon className="size-3.5" />
                                      </button>
                                    </Tooltip>
                                  )
                                })}
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </CardContent>
                </Card>
              </motion.li>
            )
          })}
        </ol>
      </div>
    </motion.div>
  )
}

export const PATH_ICONS: Record<string, typeof Globe> = {
  globe: Globe,
  terminal: Terminal,
  rocket: Rocket,
  graph: Waypoints,
  cpu: Cpu,
  dataset: Database,
  shield: Shield,
  wrench: Wrench,
}
