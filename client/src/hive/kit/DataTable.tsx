import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  /** Value used for sorting; leave out for unsortable columns. */
  sortBy?: (row: T) => number | string | null
  render: (row: T) => ReactNode
  align?: 'left' | 'right'
  width?: string
  /** Hidden below this width (tables drop low-priority columns on small screens). */
  hideBelow?: 'sm' | 'md' | 'lg'
}

const HIDE = { sm: 'max-sm:hidden', md: 'max-md:hidden', lg: 'max-lg:hidden' } as const

/**
 * Sticky header, sortable columns (click or Enter on the header), numbers
 * right-aligned, the whole row opens. Null sort values always go last.
 */
export function DataTable<T>({ rows, columns, rowKey, onOpen, initialSort, label, empty, className }: { rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; onOpen?: (row: T) => void; initialSort?: { key: string; dir: 'asc' | 'desc' }; label: string; empty?: ReactNode; className?: string }) {
  const [sort, setSort] = useState(initialSort ?? null)
  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key)
    if (!col?.sortBy) return rows
    const dir = sort!.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = col.sortBy!(a)
      const y = col.sortBy!(b)
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      return (x < y ? -1 : x > y ? 1 : 0) * dir
    })
  }, [rows, columns, sort])
  const toggle = (key: string) => setSort((s) => (s?.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }))
  return (
    <div className={cn('overflow-x-auto rounded-[var(--hv-r-card)] border border-[var(--hv-border)]', className)}>
      <table className="w-full border-collapse text-[13px]" aria-label={label}>
        <thead className="sticky top-0 z-10 bg-[var(--hv-surface-1)]">
          <tr className="border-b border-[var(--hv-border)]">
            {columns.map((c) => {
              const active = sort?.key === c.key
              return (
                <th
                  key={c.key}
                  scope="col"
                  style={{ width: c.width }}
                  aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn('h-9 px-3 font-medium text-[var(--hv-text-2)]', c.align === 'right' ? 'text-right' : 'text-left', c.hideBelow && HIDE[c.hideBelow])}
                >
                  {c.sortBy ? (
                    <button type="button" onClick={() => toggle(c.key)} className={cn('inline-flex items-center gap-1 rounded hover:text-[var(--hv-text-1)]', active && 'text-[var(--hv-text-1)]')}>
                      {c.header}
                      {active ? sort!.dir === 'asc' ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden /> : null}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={rowKey(r)}
              tabIndex={onOpen ? 0 : undefined}
              onClick={onOpen ? () => onOpen(r) : undefined}
              onKeyDown={onOpen ? (e) => e.key === 'Enter' && onOpen(r) : undefined}
              className={cn('hv-cv border-b border-[var(--hv-border-subtle)] last:border-0', onOpen && 'cursor-pointer hover:bg-[var(--hv-surface-2)]')}
            >
              {columns.map((c) => (
                <td key={c.key} className={cn('h-[var(--hv-row-h)] px-3', c.align === 'right' ? 'hv-num text-right' : 'text-left', c.hideBelow && HIDE[c.hideBelow])}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!sorted.length && empty}
    </div>
  )
}
