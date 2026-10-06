import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'
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

/** The two doors most people walk through get a wider, richer tile. */
const FEATURED = new Set(['problems', 'learn'])

/** The icon tile, tinted by the destination's hue like a Dock app icon. */
function Tile({ item, icon: Icon, featured }: { item: DockItem; icon: LucideIcon; featured: boolean }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-2xl shadow-[inset_0_1px_0_oklch(100%_0_0/0.28),0_6px_14px_-6px_rgb(0_0_0/0.55)] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3',
        featured ? 'size-14' : 'size-11',
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
        className="pointer-events-none absolute inset-0 opacity-[0.08] transition-opacity duration-300 group-hover:opacity-[0.18]"
        style={{ background: `radial-gradient(120% 120% at 100% 0%, oklch(0.62 0.16 ${hue}), transparent 62%)` }}
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-40 transition-opacity duration-300 group-hover:opacity-90"
        style={{ background: `linear-gradient(90deg, transparent, oklch(0.72 0.15 ${hue}), transparent)` }}
        aria-hidden="true"
      />
    </>
  )
}

const shell =
  'card-neon group relative flex h-full cursor-pointer flex-col gap-3 overflow-hidden p-4 transition-all duration-200 hover:-translate-y-1 hover:glow-box focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand'

function TileBody({ item, featured }: { item: DockItem; featured: boolean }) {
  return (
    <>
      <HueWash hue={item.hue} />
      <div className="relative flex items-start justify-between gap-2">
        <Tile item={item} icon={item.icon} featured={featured} />
        <ArrowUpRight
          className="size-4 translate-y-1 text-text-muted opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:text-text-primary group-hover:opacity-100"
          aria-hidden="true"
        />
      </div>
      <div className="relative min-w-0">
        <p
          className={cn(
            'font-display tracking-wider text-text-primary uppercase',
            featured ? 'text-base' : 'text-[13px]',
          )}
        >
          {item.label}
        </p>
        <p className={cn('mt-1 leading-snug text-text-muted', featured ? 'text-xs' : 'line-clamp-2 text-[11.5px]')}>
          {PITCH[item.id] ?? ''}
        </p>
      </div>
    </>
  )
}

/**
 * The home launchpad: every destination in Nexora as one glowing tile, so the
 * home page is a single beautiful jump-off point to the whole product.
 */
export function LaunchGrid() {
  const items = DOCK_ITEMS.filter((i) => i.id !== 'hub')

  return (
    <section aria-label="Explore Nexora">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="mb-0 font-display text-sm tracking-[0.14em] text-text-secondary uppercase">Explore Nexora</h2>
        <span className="font-mono text-[11px] text-text-muted tabular-nums">{items.length} destinations</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {items.map((item, i) => {
          const featured = FEATURED.has(item.id)
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.03 * i, ease: [0.34, 1.56, 0.64, 1] }}
              className={cn(featured && 'col-span-2')}
            >
              {item.action === 'search' ? (
                <button type="button" onClick={openCommandPalette} aria-label={item.label} className={cn(shell, 'w-full text-left')}>
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
      </div>
    </section>
  )
}
