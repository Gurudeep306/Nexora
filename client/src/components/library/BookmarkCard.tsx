import { motion } from 'motion/react'
import { ExternalLink, Play, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, DifficultyBadge } from '@/components/ui'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { parseTags } from '@/components/problems/types'
import { timeAgo } from '@/lib/utils'
import type { BookmarkedProblem } from './types'

const STATUS_META: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  solved: { label: 'Solved', variant: 'success' },
  attempted: { label: 'Attempted', variant: 'warning' },
  unsolved: { label: 'Unsolved', variant: 'default' },
}

export function BookmarkCard({
  problem,
  busy,
  onRemove,
  index,
}: {
  problem: BookmarkedProblem
  busy: boolean
  onRemove: (problem: BookmarkedProblem) => void
  index: number
}) {
  const p = problem
  const status = STATUS_META[p.solve_status ?? 'unsolved'] ?? STATUS_META.unsolved
  const tags = parseTags(p.tags).slice(0, 3)

  return (
    <motion.article
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.3), ease: [0.34, 1.56, 0.64, 1] }}
      className="card-neon flex flex-col gap-3 p-4 transition-colors duration-200 hover:border-primary/60"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <PlatformBadge platform={p.platform} />
          {p.rating > 0 ? (
            <DifficultyBadge rating={p.rating} />
          ) : (
            <Badge variant="default">unrated</Badge>
          )}
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        {p.xp_earned != null && p.xp_earned > 0 && (
          <span className="shrink-0 font-mono text-xs text-gold tabular-nums">+{p.xp_earned} XP</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link
          to={`/solve/${p.id}`}
          className="cursor-pointer text-sm leading-snug font-semibold text-foreground transition-colors hover:text-primary-bright"
        >
          {p.title}
        </Link>
        {tags.length > 0 && (
          <p className="mt-1.5 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] tracking-wide text-foreground-faint uppercase"
              >
                {t}
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <span className="font-mono text-[11px] text-foreground-faint tabular-nums">
          saved {p.bookmarked_at ? timeAgo(p.bookmarked_at) : '—'}
        </span>
        <div className="flex items-center gap-1.5">
          {p.url && (
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Open ${p.title} on original platform`}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border text-foreground-dim transition-colors hover:border-primary hover:text-primary-bright"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
          <Link to={`/solve/${p.id}`} aria-label={`Solve ${p.title}`}>
            <Button variant="outline" size="icon-sm">
              <Play aria-hidden="true" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            onClick={() => onRemove(problem)}
            aria-label={`Remove ${p.title} from bookmarks`}
            className="hover:text-destructive"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
    </motion.article>
  )
}
