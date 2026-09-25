import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Bookmark, BookmarkCheck, ExternalLink, ListFilter, SearchX, Sparkles } from 'lucide-react'
import { Badge, Button, DifficultyBadge } from '@/components/ui'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { cn } from '@/lib/utils'
import { parseTags, type AiFindResponse, type Problem } from './types'

interface Props {
  data: AiFindResponse
  bookmarkedIds: Set<number>
  onToggleBookmark: (problem: Problem) => void
  busyBookmarkId: number | null
  onClear: () => void
}

export function AiProblemResults({ data, bookmarkedIds, onToggleBookmark, busyBookmarkId, onClear }: Props) {
  const navigate = useNavigate()
  const results = data.results ?? []

  return (
    <div className="space-y-3">
      {/* Understanding banner */}
      <div className="card-neon relative overflow-hidden p-4">
        <div
          className="pointer-events-none absolute -top-20 -left-10 size-56 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary-bright">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{data.understanding}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-foreground-faint">
              <span>
                {data.count} {data.count === 1 ? 'match' : 'matches'}
              </span>
              {data.matchedTags?.map((t) => (
                <Badge key={t} variant="outline" className="px-1.5 py-0 text-[10px] text-primary-bright">
                  #{t}
                </Badge>
              ))}
              {data.platform && data.platform !== 'all' && (
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                  {data.platform}
                </Badge>
              )}
              {(data.minRating != null || data.maxRating != null) && (
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                  rating {data.minRating ?? '0'}–{data.maxRating ?? '∞'}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="subtle" size="sm" onClick={onClear} className="shrink-0">
            <ListFilter className="size-4" aria-hidden="true" /> Browse all problems
          </Button>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="card-neon">
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <SearchX className="size-6 text-foreground-faint" aria-hidden="true" />
            <div>
              <p className="font-display text-[15px] font-semibold text-foreground">Nothing matched that request</p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-foreground-dim">
                Try describing the topic differently, or widen the difficulty — then search again.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card-neon divide-y divide-border/60 overflow-hidden">
          {results.map(({ problem: p, reason }, i) => {
            const bookmarked = bookmarkedIds.has(p.id)
            const tags = parseTags(p.tags).slice(0, 3)
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(i, 12) * 0.03 }}
                onClick={() => navigate(`/solve/${p.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/solve/${p.id}`)
                }}
                tabIndex={0}
                role="link"
                aria-label={`Open ${p.title}`}
                className={cn(
                  'flex cursor-pointer items-start gap-3 p-3 transition-colors duration-150 hover:bg-surface-2/60 focus-visible:bg-surface-2',
                  p.solve_status === 'solved' && 'bg-success/[0.03]',
                )}
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 font-mono text-[11px] font-semibold text-primary-bright">
                  {i + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{p.title}</span>
                    <span className="shrink-0 font-mono text-[11px] text-foreground-faint">{p.problem_id}</span>
                  </div>
                  {reason && (
                    <p className="mt-0.5 flex items-start gap-1 text-[12px] text-primary-bright/90">
                      <Sparkles className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                      <span className="min-w-0">{reason}</span>
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {tags.map((t) => (
                      <Badge key={t} variant="outline" className="max-w-40 truncate px-1.5 py-0 text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                  <span className="hidden sm:block">
                    <PlatformBadge platform={p.platform} />
                  </span>
                  {p.rating > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <DifficultyBadge rating={p.rating} />
                      <span className="font-mono text-xs text-foreground-dim tabular-nums">{p.rating}</span>
                    </span>
                  ) : (
                    <Badge variant="default">n/a</Badge>
                  )}
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${p.title} on ${p.platform}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hidden cursor-pointer text-foreground-faint transition-colors hover:text-primary-bright lg:block"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleBookmark(p)
                    }}
                    disabled={busyBookmarkId === p.id}
                    aria-label={bookmarked ? `Remove bookmark for ${p.title}` : `Bookmark ${p.title}`}
                    aria-pressed={bookmarked}
                    className={cn(
                      'cursor-pointer rounded-md p-1.5 transition-all duration-200 disabled:opacity-50',
                      bookmarked ? 'text-gold hover:text-gold/80' : 'text-foreground-faint hover:text-primary-bright',
                    )}
                  >
                    {bookmarked ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
