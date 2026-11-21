import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui'
import './pagination.css'

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
        <span className="font-mono text-foreground tabular-nums">{total.toLocaleString()}</span> problems
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="subtle"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange((page - 2) * limit)}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden="true" /> Previous
        </Button>
        <ol className="pg-pages m-0 flex list-none items-center gap-0.5 p-0" aria-label="Pages">
          {pageList(page, pages).map((n, i) =>
            n === 0 ? (
              <li key={`gap${i}`} aria-hidden="true" className="px-1 text-xs text-text-muted">
                …
              </li>
            ) : (
              <li key={n}>
                <button
                  type="button"
                  className="pg-num"
                  aria-current={n === page ? 'page' : undefined}
                  aria-label={`Page ${n}`}
                  onClick={() => n !== page && onPageChange((n - 1) * limit)}
                >
                  {n.toLocaleString()}
                </button>
              </li>
            ),
          )}
        </ol>
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

/** Page numbers to show: first, last, and two either side of the current one (0 marks a gap). */
function pageList(page: number, pages: number): number[] {
  const want = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter((n) => n >= 1 && n <= pages))
  const sorted = [...want].sort((a, b) => a - b)
  const out: number[] = []
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) out.push(0)
    out.push(n)
  })
  return out
}
