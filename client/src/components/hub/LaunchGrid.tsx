import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowUpRight, Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DOCK_ITEMS, tileStyle, type DockItem } from '@/components/layout/dockStore'
import { openCommandPalette } from '@/components/layout/CommandPalette'

/** One-line pitch per destination, shown under its name on the home grid. */
const PITCH: Record<string, string> = {
  problems: 'Filter & solve the full 27k problem arena',
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
  { id: 'all', label: 'All Destinations' },
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

/** The two doors most people walk through get a wider, richer tile. */
const FEATURED = new Set(['problems', 'learn'])

/** The icon tile, tinted by the destination's hue like a Dock app icon. */
function Tile({ item, icon: Icon, featured }: { item: DockItem; icon: LucideIcon; featured: boolean }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-2xl shadow-[inset_0_1px_0_oklch(100%_0_0/0.28),0_6px_14px_-6px_rgb(0_0_0/0.55)] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3',
        featured ? 'size-13' : 'size-11',
      )}
      style={tileStyle(item)}
      aria-hidden="true"
    >
      <Icon
        className={cn('text-white drop-shadow-[0_1px_1px_rgb(0_0_0/0.3)]', featured ? 'size-6' : 'size-5')}
        strokeWidth={2.1}
      />
    </span>
  )
}

/** A hue wash that is always faintly present and blooms on hover. */
function HueWash({ hue }: { hue: number }) {
  return (
    <>
      <span
        className="pointer-events-none absolute inset-0 opacity-[0.08] transition-opacity duration-300 group-hover:opacity-[0.20]"
        style={{ background: `radial-gradient(120% 120% at 100% 0%, oklch(0.62 0.16 ${hue}), transparent 62%)` }}
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-40 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, transparent, oklch(0.72 0.15 ${hue}), transparent)` }}
        aria-hidden="true"
      />
    </>
  )
}

const shell =
  'card-neon group relative flex h-full cursor-pointer flex-col gap-3 overflow-hidden p-4.5 rounded-2xl border border-border-glass bg-bg-surface transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-border-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand'

function TileBody({ item, featured }: { item: DockItem; featured: boolean }) {
  return (
    <>
      <HueWash hue={item.hue} />
      <div className="relative flex items-start justify-between gap-2">
        <Tile item={item} icon={item.icon} featured={featured} />
        <div className="flex items-center gap-1.5">
          {item.action === 'search' && (
            <span className="flex items-center gap-1 rounded border border-border/40 bg-bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-foreground-faint">
              ⌘K
            </span>
          )}
          <ArrowUpRight
            className="size-4 translate-y-1 text-text-muted opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:text-text-primary group-hover:opacity-100"
            aria-hidden="true"
          />
        </div>
      </div>
      <div className="relative min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'font-display tracking-wider text-text-primary uppercase',
              featured ? 'text-base' : 'text-[13px]',
            )}
          >
            {item.label}
          </p>
          {featured && (
            <span className="flex items-center gap-0.5 rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold text-accent-bright">
              <Sparkles className="size-2.5" /> Featured
            </span>
          )}
        </div>
        <p className={cn('mt-1 leading-snug text-text-muted', featured ? 'text-xs' : 'line-clamp-2 text-[11.5px]')}>
          {PITCH[item.id] ?? ''}
        </p>
      </div>
    </>
  )
}

/**
 * The home launchpad: every destination in Nexora as one glowing tile,
 * with category filters and instant keyboard access.
 */
export function LaunchGrid() {
  const [selectedCat, setSelectedCat] = useState<CategoryId>('all')
  const allItems = useMemo(() => DOCK_ITEMS.filter((i) => i.id !== 'hub'), [])

  const filteredItems = useMemo(() => {
    if (selectedCat === 'all') return allItems
    return allItems.filter((i) => ITEM_CATEGORY[i.id] === selectedCat)
  }, [allItems, selectedCat])

  return (
    <section aria-label="Explore Nexora" className="space-y-3.5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="mb-0 font-display text-sm tracking-[0.14em] text-text-secondary uppercase">
            Mission Launchpad
          </h2>
          <p className="mt-0.5 text-xs text-foreground-faint">
            Direct warp coordinates to every arena, lab, and database in Nexora
          </p>
        </div>

        {/* Category switcher pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((cat) => {
            const active = selectedCat === cat.id
            const count = cat.id === 'all' ? allItems.length : allItems.filter((i) => ITEM_CATEGORY[i.id] === cat.id).length
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                className={cn(
                  'cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-all duration-150',
                  active
                    ? 'bg-accent text-on-accent-brand shadow-sm font-semibold'
                    : 'bg-bg-surface-2 text-foreground-dim hover:bg-bg-surface-3 hover:text-foreground border border-border/40',
                )}
              >
                {cat.label}
                <span className={cn('ml-1.5 font-mono text-[10px] tabular-nums', active ? 'text-on-accent-brand/80' : 'text-foreground-faint')}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item, i) => {
            const featured = selectedCat === 'all' && FEATURED.has(item.id)
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                className={cn(featured && 'col-span-2')}
              >
                {item.action === 'search' ? (
                  <button
                    type="button"
                    onClick={openCommandPalette}
                    aria-label={item.label}
                    className={cn(shell, 'w-full text-left')}
                  >
                    <TileBody item={item} featured={featured} />
                  </button>
                ) : item.external ? (
                  <a href={item.to} aria-label={item.label} className={shell}>
                    <TileBody item={item} featured={featured} />
                  </a>
                ) : (
                  <Link to={item.to!} aria-label={item.label} className={shell}>
                    <TileBody item={item} featured={featured} />
                  </Link>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}
