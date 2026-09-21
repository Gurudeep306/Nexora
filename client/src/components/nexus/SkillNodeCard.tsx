import { motion } from 'motion/react'
import { Check, Lock } from 'lucide-react'
import { Badge, Progress } from '@/components/ui'
import { cn } from '@/lib/utils'
import { NodeIcon } from './NodeIcon'
import type { NexusNode } from './types'

export function SkillNodeCard({
  node,
  zoneColor,
  index = 0,
  onSelect,
}: {
  node: NexusNode
  zoneColor: string
  index?: number
  onSelect: (node: NexusNode) => void
}) {
  const state = node.completed ? 'completed' : node.unlocked ? (node.progress > 0 ? 'in-progress' : 'unlocked') : 'locked'

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(node)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.3), ease: [0.34, 1.56, 0.64, 1] }}
      aria-label={`${node.name} skill node — ${node.solved} of ${node.target} solved, ${state.replace('-', ' ')}`}
      className={cn(
        'card-neon group flex w-full cursor-pointer items-start gap-3 p-3 text-left',
        'hover:-translate-y-0.5 hover:border-primary hover:glow-box',
        state === 'locked' && 'opacity-55',
        state === 'completed' && 'border-success/40',
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl border bg-surface-2 transition-colors',
          state === 'completed' ? 'border-success/50 text-success' : state === 'locked' ? 'border-border text-foreground-faint' : 'text-primary-bright',
        )}
        style={state === 'unlocked' || state === 'in-progress' ? { borderColor: zoneColor } : undefined}
        aria-hidden="true"
      >
        {state === 'completed' ? <Check className="size-5" /> : state === 'locked' ? <Lock className="size-4" /> : <NodeIcon icon={node.icon} className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-foreground">{node.name}</span>
          {state === 'completed' && <Badge variant="success">done</Badge>}
          {state === 'in-progress' && <Badge variant="primary">{node.progress}%</Badge>}
          {state === 'locked' && <Badge variant="default">locked</Badge>}
        </span>
        {node.desc && <span className="mt-0.5 block truncate text-[11px] text-foreground-dim">{node.desc}</span>}
        <span className="mt-2 block">
          <Progress
            value={node.progress}
            className="h-1.5"
            barClassName={node.completed ? 'bg-success' : undefined}
          />
        </span>
        <span className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-foreground-faint tabular-nums">
          <span>
            {node.solved}/{node.target} solved
          </span>
          <span className="text-primary-bright">+{node.xpReward} XP</span>
        </span>
      </span>
    </motion.button>
  )
}
