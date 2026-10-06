import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DOCK_ITEMS, tileStyle, type DockItem } from '@/components/layout/dockStore'
import { openCommandPalette } from '@/components/layout/CommandPalette'

/** One-line pitch per destination, shown under its name on the home grid. */
const PITCH: Record<string, string> = {
  problems: 'Filter and solve the full problem set',
  learn: 'Interactive DSA course with live visualisations',
  contests: 'Live & upcoming Codeforces / CodeChef rounds',
  nexus: 'Your skill tree — topics, levels & mastery',
  gate: 'GATE previous-year questions, year by year',
  analytics: 'Deep dive into your solves, accuracy & trends',
  ailab: 'AI problem finder, tutor & explanation lab',
  workshop: 'Custom problems & community contests',
  achievements: 'Badges, medals & milestones you have earned',
  submissions: 'Every verdict you have ever received',
  bookmarks: 'Problems you saved for later',
  social: 'Rooms, messages & the community ladder',
  explainlab: 'Step-through explanations for any solution',
  profile: 'Your public card, stats & share link',
  look: 'Themes, accent colour & appearance',
  settings: 'Account, editor & daily-goal preferences',
  search: 'Jump anywhere — the command palette',
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'core', label: 'Arena & Learn' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'community', label: 'Community' },
  { id: 'vault', label: 'Vault & Settings' },
] as const

type CategoryId = (typeof CATEGORIES)[number]['id']

const ITEM_CATEGORY: Record<string, CategoryId> = {
  problems: 'core',
  learn: 'core',
  contests: 'core',
  nexus: 'core',
  gate: 'core',
  ailab: 'intelligence',
  explainlab: 'intelligence',
  analytics: 'intelligence',
  social: 'community',
  workshop: 'community',
  achievements: 'vault',
  submissions: 'vault',
  bookmarks: 'vault',
  profile: 'vault',
  look: 'vault',
  settings: 'vault',
  search: 'core',
}

/** The icon tile, tinted by the destination's hue like its Dock icon. */
function Tile({ item, icon: Icon }: { item: DockItem; icon: LucideIcon }) {
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-10 shadow-[inset_0_1px_0_oklch(100%_0_0/0.28)]"
      style={tileStyle(item)}
      aria-hidden="true"
    >
      <Icon className="size-4.5 text-white sm:size-5" strokeWidth={2.1} />
    </span>
  )
}

const shell =
  'card card-interactive group flex h-full w-full cursor-pointer items-center gap-2.5 p-3 text-left sm:items-start sm:gap-3 sm:p-4 !no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand'

function TileBody({ item }: { item: DockItem }) {
  return (
    <>
      <Tile item={item} icon={item.icon} />
      <div className="min-w-0 flex-1">
        <p className="mb-0 flex items-center gap-2 text-[13.5px] leading-tight font-semibold text-text-primary sm:mb-0.5 sm:text-[15px]">
          {item.label}
          {item.action === 'search' && (
            <kbd className="rounded border border-border bg-bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-normal text-text-muted">⌘K</kbd>
          )}
        </p>
        <p className="mb-0 hidden text-[12.5px] leading-snug text-text-muted sm:line-clamp-2">{PITCH[item.id] ?? ''}</p>
      </div>
      <ArrowUpRight
        className="hidden size-4 shrink-0 text-text-muted opacity-0 sm:block transition-opacity duration-200 group-hover:opacity-100"
        aria-hidden="true"
      />
    </>
  )
}

/**
 * The home launchpad: every destination in Nexora as one glowing tile,
 * with category filters and instant keyboard access.
 */
export function LaunchGrid() {
  const [selectedCat, setSelectedCat] = useState<CategoryId>('all')
  // Search lives in the top bar (and ⌘K), so it is not repeated here.
  const allItems = useMemo(() => DOCK_ITEMS.filter((i) => i.id !== 'hub' && i.action !== 'search'), [])

  const filteredItems = useMemo(() => {
    if (selectedCat === 'all') return allItems
    return allItems.filter((i) => ITEM_CATEGORY[i.id] === selectedCat)
  }, [allItems, selectedCat])

  return (
    <section aria-label="Explore Nexora" className="space-y-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="mb-0 !text-[19px] font-semibold text-text-primary">Explore Nexora</h2>
          <p className="mb-0 hidden text-[13px] text-text-muted sm:block">Every part of the platform, one click away.</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter destinations">
          {CATEGORIES.map((cat) => {
            const active = selectedCat === cat.id
            const count = cat.id === 'all' ? allItems.length : allItems.filter((i) => ITEM_CATEGORY[i.id] === cat.id).length
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCat(cat.id)}
                className={cn(
                  'cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150',
                  active
                    ? 'bg-accent-brand text-on-accent-brand'
                    : 'border border-border bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary',
                )}
              >
                {cat.label}
                <span className={cn('ml-1.5 text-[10px] tabular-nums', active ? 'opacity-80' : 'text-text-muted')}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <motion.div layout className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item, i) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, delay: i * 0.015 }}
            >
              {item.action === 'search' ? (
                <button type="button" onClick={openCommandPalette} aria-label={item.label} className={shell}>
                  <TileBody item={item} />
                </button>
              ) : item.external ? (
                <a href={item.to} aria-label={item.label} className={shell}>
                  <TileBody item={item} />
                </a>
              ) : (
                <Link to={item.to!} aria-label={item.label} className={shell}>
                  <TileBody item={item} />
                </Link>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}
