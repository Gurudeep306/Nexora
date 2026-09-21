import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui'

export function Pagination({
  total,
  limit,
  offset,
  onPageChange,
}: {
  total: number
  limit: number
  offset: number
  onPageChange: (offset: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / limit))
  const page = Math.min(pages, Math.floor(offset / limit) + 1)
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(total, offset + limit)

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3"
      aria-label="Problem list pagination"
    >
      <p className="text-xs text-foreground-dim">
        Showing <span className="font-mono text-foreground tabular-nums">{from}</span>–
        <span className="font-mono text-foreground tabular-nums">{to}</span> of{' '}
        <span className="font-mono text-primary-bright tabular-nums">{total.toLocaleString()}</span> problems
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="subtle"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange((page - 2) * limit)}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden="true" /> Prev
        </Button>
        <span className="min-w-20 text-center text-xs text-foreground-dim">
          Page <span className="font-mono text-foreground tabular-nums">{page}</span> /{' '}
          <span className="font-mono tabular-nums">{pages.toLocaleString()}</span>
        </span>
        <Button
          variant="subtle"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page * limit)}
          aria-label="Next page"
        >
          Next <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
