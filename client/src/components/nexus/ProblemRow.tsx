import { useNavigate } from 'react-router-dom'
import { Check, CircleDashed, Clock3 } from 'lucide-react'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { cn, formatNumber } from '@/lib/utils'
import { ratingTextClass } from './icons'
import type { RoadmapProblem } from './types'

export function ProblemRow({ problem, compact = false }: { problem: RoadmapProblem; compact?: boolean }) {
  const navigate = useNavigate()
  const solved = problem.solve_status === 'solved'
  const attempted = problem.solve_status === 'attempted'

  return (
    <button
      type="button"
      onClick={() => navigate(`/solve/${problem.id}`)}
      aria-label={`Solve ${problem.title}${problem.rating ? `, rating ${problem.rating}` : ''}`}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left transition-all duration-200',
        'hover:border-border-glow hover:bg-surface-2',
        solved && 'bg-success/5',
      )}
    >
      <span className="shrink-0" aria-hidden="true">
        {solved ? (
          <Check className="size-3.5 text-success" />
        ) : attempted ? (
          <Clock3 className="size-3.5 text-warning" />
        ) : (
          <CircleDashed className="size-3.5 text-foreground-faint" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-xs font-semibold',
            solved ? 'text-foreground-dim line-through decoration-success/50' : 'text-foreground',
          )}
        >
          {problem.title}
        </span>
        {!compact && problem.problem_id && (
          <span className="block truncate font-mono text-[10px] text-foreground-faint">{problem.problem_id}</span>
        )}
      </span>
      {attempted && problem.attempts > 0 && (
        <span className="shrink-0 font-mono text-[10px] text-foreground-faint tabular-nums">
          {problem.attempts} {problem.attempts === 1 ? 'try' : 'tries'}
        </span>
      )}
      <span className={cn('shrink-0 font-mono text-xs font-bold tabular-nums', ratingTextClass(problem.rating))}>
        {problem.rating ? formatNumber(problem.rating) : '?'}
      </span>
      <span className="hidden shrink-0 sm:block">
        <PlatformBadge platform={problem.platform} className="text-[9px]" />
      </span>
    </button>
  )
}
