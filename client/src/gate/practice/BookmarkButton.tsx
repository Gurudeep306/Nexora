import { useState } from 'react'
import { Bookmark, ChevronDown, FolderPlus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui'
import { createCollection, loadCollections, setBookmark, toggleBookmark, useQuestionProgress, type LocalCollection } from '../progress'

/**
 * Bookmark toggle (B) plus a menu to file the question into collections
 * ("Revise before exam", "Tricky NAT"…).
 */
export function BookmarkButton({ questionId }: { questionId: string }) {
  const p = useQuestionProgress(questionId)
  const on = !!p.bookmarked
  const [cols, setCols] = useState<LocalCollection[] | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const mine = p.collections ?? []

  const toggleIn = (id: string) => {
    const next = mine.includes(id) ? mine.filter((x) => x !== id) : [...mine, id]
    setBookmark(questionId, true, next)
  }
  const add = async () => {
    const n = name.trim()
    if (!n) return
    setBusy(true)
    try {
      const c = await createCollection(n.slice(0, 40))
      setCols((prev) => [...(prev ?? []), c])
      setName('')
      setBookmark(questionId, true, [...mine, c.id])
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex items-center">
      <button
        type="button"
        onClick={() => toggleBookmark(questionId)}
        aria-pressed={on}
        className={cn('rounded-l-lg p-1.5 transition-colors', on ? 'text-state-warning' : 'text-text-muted hover:bg-bg-surface-2 hover:text-text-primary')}
        title={on ? 'Remove bookmark (B)' : 'Bookmark (B)'}
        aria-label={on ? 'Remove bookmark' : 'Bookmark question'}
      >
        <Bookmark className={cn('size-4', on && 'fill-current')} />
      </button>
      <Popover
        onOpenChange={(o) => {
          if (o && !cols) void loadCollections().then(setCols)
        }}
      >
        <PopoverTrigger asChild>
          <button type="button" className="rounded-r-lg py-1.5 pr-1 text-text-muted hover:bg-bg-surface-2 hover:text-text-primary" aria-label="Add to a collection" title="Collections">
            <ChevronDown className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          <div className="px-1.5 pt-0.5 pb-1.5 text-[11px] font-semibold tracking-wide text-text-muted uppercase">Save to collection</div>
          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {cols === null ? (
              <div className="h-8 animate-pulse rounded-md bg-bg-surface-2" />
            ) : cols.length === 0 ? (
              <p className="px-1.5 py-1 text-[12px] text-text-muted">No collections yet.</p>
            ) : (
              cols.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-[13px] text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary">
                  <input type="checkbox" checked={mine.includes(c.id)} onChange={() => toggleIn(c.id)} className="size-3.5 accent-[var(--color-accent-brand)]" />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                </label>
              ))
            )}
          </div>
          <form
            className="mt-1.5 flex items-center gap-1 border-t border-border pt-2"
            onSubmit={(e) => {
              e.preventDefault()
              void add()
            }}
          >
            <FolderPlus className="ml-1 size-3.5 shrink-0 text-text-muted" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New collection"
              aria-label="New collection name"
              className="h-8 min-w-0 flex-1 bg-transparent px-1 text-[13px] text-text-primary outline-none placeholder:text-text-muted"
            />
            <button type="submit" disabled={!name.trim() || busy} className="rounded-md p-1.5 text-accent-brand hover:bg-bg-surface-2 disabled:opacity-40" aria-label="Create collection">
              <Plus className="size-4" />
            </button>
          </form>
        </PopoverContent>
      </Popover>
    </span>
  )
}
