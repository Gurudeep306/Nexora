import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Bookmark, BookmarkCheck, CheckCircle2, ExternalLink, XCircle } from 'lucide-react'
import { Badge, Table, TBody, TD, TH, THead, TR, Tooltip } from '@/components/ui'
import { DifficultyBadge } from '@/components/ui'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { cn } from '@/lib/utils'
import { parseTags, type Problem } from './types'

interface Props {
  problems: Problem[]
  bookmarkedIds: Set<number>
  onToggleBookmark: (problem: Problem) => void
  busyBookmarkId: number | null
}

function StatusCell({ problem }: { problem: Problem }) {
  if (problem.solve_status === 'solved') {
    return (
      <Tooltip label={`Solved${problem.xp_earned ? ` · +${problem.xp_earned} XP` : ''}`}>
        <CheckCircle2 className="size-4.5 text-success" aria-label="Solved" />
      </Tooltip>
    )
  }
  if (problem.solve_status === 'attempted') {
    return (
      <Tooltip label={`Attempted${problem.attempts ? ` · ${problem.attempts} tries` : ''}`}>
        <XCircle className="size-4.5 text-warning" aria-label="Attempted" />
      </Tooltip>
    )
  }
  return <span className="block size-4.5" aria-label="Unsolved" />
}

export function ProblemTable({ problems, bookmarkedIds, onToggleBookmark, busyBookmarkId }: Props) {
  const navigate = useNavigate()

  return (
    <div className="card-neon overflow-hidden">
      <Table aria-label="Problems">
        <THead>
          <TR className="hover:bg-transparent">
            <TH className="w-10" />
            <TH className="w-10">
              <span className="sr-only">Solve status</span>
            </TH>
            <TH>Problem</TH>
            <TH className="hidden md:table-cell">Platform</TH>
            <TH className="w-28">Difficulty</TH>
            <TH className="hidden w-24 lg:table-cell">Link</TH>
          </TR>
        </THead>
        <TBody>
          {problems.map((p, i) => {
            const bookmarked = bookmarkedIds.has(p.id)
            const tags = parseTags(p.tags).slice(0, 3)
            return (
              <motion.tr
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, delay: Math.min(i, 12) * 0.02 }}
                onClick={() => navigate(`/solve/${p.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/solve/${p.id}`)
                }}
                tabIndex={0}
                role="link"
                aria-label={`Open ${p.title}`}
                className={cn(
                  'cursor-pointer border-b border-border/60 transition-colors duration-150 last:border-0 hover:bg-surface-2/60 focus-visible:bg-surface-2',
                  p.solve_status === 'solved' && 'bg-success/[0.03]',
                )}
              >
                <TD onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onToggleBookmark(p)}
                    disabled={busyBookmarkId === p.id}
                    aria-label={bookmarked ? `Remove bookmark for ${p.title}` : `Bookmark ${p.title}`}
                    aria-pressed={bookmarked}
                    className={cn(
                      'cursor-pointer rounded-md p-1.5 transition-all duration-200 disabled:opacity-50',
                      bookmarked
                        ? 'text-gold hover:text-gold/80'
                        : 'text-foreground-faint hover:text-primary-bright',
                    )}
                  >
                    {bookmarked ? (
                      <BookmarkCheck className="size-4" />
                    ) : (
                      <Bookmark className="size-4" />
                    )}
                  </button>
                </TD>
                <TD>
                  <StatusCell problem={p} />
                </TD>
                <TD>
                  <span className="flex items-center gap-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">{p.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-foreground-faint">
                        <span className="font-mono">{p.problem_id}</span>
                        {tags.map((t, ti) => (
                          <Badge
                            key={t}
                            variant="outline"
                            className={cn('max-w-40 truncate px-1.5 py-0 text-[10px]', ti > 0 && 'hidden sm:inline-flex')}
                          >
                            {t}
                          </Badge>
                        ))}
                      </span>
                    </span>
                  </span>
                </TD>
                <TD className="hidden md:table-cell">
                  <PlatformBadge platform={p.platform} />
                </TD>
                <TD>
                  <span className="flex items-center gap-2">
                    {p.rating > 0 ? (
                      <DifficultyBadge rating={p.rating} />
                    ) : (
                      <Badge variant="default">n/a</Badge>
                    )}
                    {p.rating > 0 && (
                      <span className="font-mono text-xs text-foreground-dim tabular-nums">{p.rating}</span>
                    )}
                  </span>
                </TD>
                <TD className="hidden lg:table-cell">
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${p.title} on ${p.platform}`}
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-pointer text-foreground-faint transition-colors hover:text-primary-bright"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </TD>
              </motion.tr>
            )
          })}
        </TBody>
      </Table>
    </div>
  )
}
