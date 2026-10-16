import { clearRecentSearches } from '@/lib/recentSearches'

/** The quiet "Clear" control shown on the Recent group header. */
export function ClearRecents() {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={clearRecentSearches}
      className="cursor-pointer rounded px-1 text-[11px] text-text-muted transition-colors hover:text-text-primary active:!scale-100"
    >
      Clear
    </button>
  )
}
