import { createElement, useId, useMemo } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  Binary,
  BookOpen,
  Braces,
  Check,
  GitBranch,
  Layers,
  Lock,
  Network,
  Radar,
  Sigma,
  Sparkles,
  Swords,
  TreePine,
  Triangle,
  Workflow,
  Zap,
} from 'lucide-react'
import { Tooltip } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { NexusNode, NexusZone } from './types'

export const ROW_H = 112

function nodeIcon(node: NexusNode) {
  const key = `${node.id} ${node.name} ${node.tags.join(' ')}`.toLowerCase()
  if (key.includes('flow') || key.includes('matching')) return Workflow
  if (key.includes('graph') || key.includes('spath') || key.includes('dsu')) return Network
  if (key.includes('tree') || key.includes('segtree')) return TreePine
  if (key.includes('dp') || key.includes('dynamic')) return Layers
  if (key.includes('math') || key.includes('ntheory') || key.includes('combo') || key.includes('fft'))
    return Sigma
  if (key.includes('string') || key.includes('stralgo')) return Braces
  if (key.includes('sort')) return Triangle
  if (key.includes('greedy')) return Zap
  if (key.includes('bsearch') || key.includes('binary')) return Binary
  if (key.includes('geometry')) return Radar
  if (key.includes('game')) return Swords
  if (key.includes('fundamental') || key.includes('basics')) return BookOpen
  if (key.includes('brute')) return Sparkles
  if (key.includes('data structure') || key.includes('_ds')) return GitBranch
  if (key.includes('ascension') || key.includes('overflow')) return Sparkles
  return Sparkles
}

function NodeHex({
  node,
  zoneColor,
  selected,
  onSelect,
  index,
}: {
  node: NexusNode
  zoneColor: string
  selected: boolean
  onSelect: (id: string) => void
  index: number
}) {
  const reduce = useReducedMotion()
  const left = `calc(${node.x}% )`
  const top = node.y * ROW_H + ROW_H / 2 - 10

  const stateStyle = node.completed
    ? {
        backgroundColor: `color-mix(in srgb, ${zoneColor} 22%, var(--color-surface))`,
        borderColor: zoneColor,
        boxShadow: `0 0 14px color-mix(in srgb, ${zoneColor} 55%, transparent), 0 0 34px color-mix(in srgb, ${zoneColor} 25%, transparent)`,
        color: zoneColor,
      }
    : node.unlocked
      ? {
          borderColor: `color-mix(in srgb, ${zoneColor} 55%, var(--color-border))`,
          color: 'var(--color-primary-bright)',
        }
      : { opacity: 0.45 }

  return (
    <motion.div
      className="absolute -translate-x-1/2"
      style={{ left, top }}
      initial={reduce ? false : { opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, delay: reduce ? 0 : Math.min(index * 0.03, 0.6), ease: [0.34, 1.56, 0.64, 1] }}
    >
      <Tooltip
        label={
          node.unlocked ? (
            `${node.name} — ${node.solved}/${node.target} solved`
          ) : (
            `${node.name} — locked`
          )
        }
      >
        <button
          type="button"
          aria-label={`${node.name}, ${node.completed ? 'completed' : node.unlocked ? `${node.progress}% progress` : 'locked'}`}
          aria-pressed={selected}
          onClick={() => onSelect(node.id)}
          className={cn(
            'group relative flex size-12 cursor-pointer items-center justify-center rounded-xl border-2 bg-surface transition-all duration-200',
            'hover:scale-110 focus-visible:outline-2 focus-visible:outline-primary-bright',
            selected && 'ring-2 ring-accent ring-offset-2 ring-offset-background',
          )}
          style={stateStyle}
        >
          {createElement(nodeIcon(node), { className: 'size-5', 'aria-hidden': true })}
          {!node.unlocked && (
            <Lock className="absolute -right-1.5 -bottom-1.5 size-3.5 text-foreground-faint" aria-hidden="true" />
          )}
          {node.completed && (
            <span
              className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full text-background"
              style={{ backgroundColor: zoneColor }}
              aria-hidden="true"
            >
              <Check className="size-2.5" strokeWidth={4} />
            </span>
          )}
        </button>
      </Tooltip>
      {/* progress bar + label */}
      <div className="mt-1.5 w-20 -translate-x-4 text-center">
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${node.progress}%`,
              backgroundColor: node.completed ? zoneColor : 'var(--color-primary-bright)',
            }}
          />
        </div>
        <p
          className={cn(
            'mt-1 truncate text-[10px] font-semibold tracking-wide',
            node.unlocked ? 'text-foreground-dim' : 'text-foreground-faint',
          )}
        >
          {node.name}
        </p>
      </div>
    </motion.div>
  )
}

export function SkillGraph({
  nodes,
  zones,
  selectedId,
  onSelect,
}: {
  nodes: NexusNode[]
  zones: NexusZone[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const gradId = useId()
  const height = zones.length * ROW_H
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const zoneColor = useMemo(() => new Map(zones.map((z) => [z.level, z.color])), [zones])

  const edges = useMemo(() => {
    const out: { from: NexusNode; to: NexusNode; done: boolean; open: boolean }[] = []
    for (const n of nodes) {
      for (const rid of n.requires) {
        const from = byId.get(rid)
        if (!from) continue
        out.push({ from, to: n, done: n.completed && from.completed, open: n.unlocked })
      }
    }
    return out
  }, [nodes, byId])

  const yOf = (n: NexusNode) => n.y * ROW_H + ROW_H / 2 - 10

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-background/60">
      <div className="relative min-w-[720px]" style={{ height }}>
        {/* zone bands */}
        {zones.map((z) => (
          <div
            key={z.level}
            id={`zone-${z.level}`}
            className={cn(
              'absolute inset-x-0 flex items-start justify-between border-b border-border/40 px-3 pt-1.5',
              z.current && 'bg-primary/5',
            )}
            style={{ top: (z.level - 1) * ROW_H, height: ROW_H }}
          >
            <div className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: z.color, boxShadow: z.current ? `0 0 8px ${z.color}` : undefined }}
                aria-hidden="true"
              />
              <span className="font-display text-[11px] tracking-wider text-foreground-dim uppercase">
                {z.level} · {z.name}
              </span>
              {z.current && (
                <span className="rounded border border-primary/50 bg-primary/15 px-1.5 text-[9px] font-bold tracking-wider text-primary-bright uppercase">
                  current
                </span>
              )}
            </div>
            {z.locked ? (
              <span className="flex items-center gap-1 rounded border border-border bg-surface-2 px-2 py-0.5 text-[10px] text-foreground-faint">
                <Lock className="size-3" aria-hidden="true" />
                LVL {z.level} · {z.xpRequired.toLocaleString()} XP · {z.probsRequired} solves
              </span>
            ) : (
              <span className="font-mono text-[10px] text-foreground-faint tabular-nums">
                {z.nodesCompleted}/{z.nodeCount} nodes · {z.zoneProgress}%
              </span>
            )}
          </div>
        ))}

        {/* connections */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-cyan)" />
              <stop offset="100%" stopColor="var(--color-primary)" />
            </linearGradient>
          </defs>
          {edges.map((e) => {
            const color = e.done
              ? (zoneColor.get(e.to.zone) ?? 'var(--color-primary)')
              : e.open
                ? `url(#${gradId})`
                : 'var(--color-border)'
            return (
              <line
                key={`${e.from.id}-${e.to.id}`}
                x1={`${e.from.x}%`}
                y1={yOf(e.from) + 24}
                x2={`${e.to.x}%`}
                y2={yOf(e.to)}
                stroke={color}
                strokeWidth={e.done || e.open ? 2 : 1.5}
                strokeDasharray={e.open && !e.done ? '6 5' : undefined}
                opacity={e.open || e.done ? 0.85 : 0.35}
                style={
                  e.done
                    ? { filter: `drop-shadow(0 0 4px ${zoneColor.get(e.to.zone) ?? 'transparent'})` }
                    : undefined
                }
              >
                {e.open && !e.done && (
                  <animate
                    attributeName="stroke-dashoffset"
                    from="22"
                    to="0"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                )}
              </line>
            )
          })}
        </svg>

        {/* nodes */}
        {nodes.map((n, i) => (
          <NodeHex
            key={n.id}
            node={n}
            index={i}
            zoneColor={zoneColor.get(n.zone) ?? 'var(--color-primary)'}
            selected={selectedId === n.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}
