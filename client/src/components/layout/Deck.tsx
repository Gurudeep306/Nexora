import { useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, useMotionValue, useSpring } from 'motion/react'
import {
  Award,
  Bookmark,
  FlaskConical,
  GraduationCap,
  History,
  LayoutGrid,
  Map,
  MoreHorizontal,
  Search,
  Settings,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { openCommandPalette } from './CommandPalette'

interface DeckItem {
  to: string
  label: string
  icon: LucideIcon
}

const CORE: DeckItem[] = [
  { to: '/hub', label: 'Hub', icon: LayoutGrid },
  { to: '/problems', label: 'Problems', icon: Swords },
  { to: '/contests', label: 'Contests', icon: Trophy },
  { to: '/nexus', label: 'Nexus', icon: Map },
  { to: '/analytics', label: 'Analytics', icon: History },
  { to: '/social', label: 'Social', icon: Users },
]

const MORE: DeckItem[] = [
  { to: '/workshop', label: 'Workshop', icon: Settings },
  { to: '/ailab', label: 'AI Lab', icon: FlaskConical },
  { to: '/learn', label: 'Learn', icon: GraduationCap },
  { to: '/achievements', label: 'Achievements', icon: Award },
  { to: '/submissions', label: 'Submissions', icon: History },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/profile', label: 'Profile', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function DockIcon({ item, mouseX }: { item: DeckItem; mouseX: number | null }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const scale = useMotionValue(1)
  const spring = useSpring(scale, { stiffness: 320, damping: 24 })
  const location = useLocation()
  const active = location.pathname.startsWith(item.to)
  const Icon = item.icon

  const target = (() => {
    if (mouseX == null || !ref.current) return 1
    const rect = ref.current.getBoundingClientRect()
    const center = rect.left + rect.width / 2
    const d = Math.abs(mouseX - center)
    return 1 + 0.38 * Math.exp(-((d / 64) ** 2))
  })()
  // Re-evaluate on every mouse move by keying off mouseX in an effect-free way.
  scale.set(target)

  return (
    <motion.div style={{ scale: spring }} className="relative">
      <NavLink
        ref={ref}
        to={item.to}
        aria-label={item.label}
        className={({ isActive }) =>
          cn(
            'group relative flex size-11 items-center justify-center rounded-xl transition-colors',
            isActive
              ? 'bg-gradient-to-b from-accent-brand-hover to-accent-brand text-on-accent-brand shadow-[0_6px_20px_-6px_color-mix(in_oklch,var(--color-accent-brand)_70%,transparent)]'
              : 'text-text-primary/60 hover:bg-accent-brand/10 hover:text-text-primary',
          )
        }
      >
        <Icon className="size-5" aria-hidden="true" />
        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-md border border-border/60 bg-bg-surface-3/95 px-2 py-1 text-[11px] font-medium whitespace-nowrap text-text-primary opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {item.label}
        </span>
        {active && (
          <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent-brand-hover shadow-[0_0_8px_var(--color-accent-brand-hover)]" />
        )}
      </NavLink>
    </motion.div>
  )
}

/**
 * "The Deck" — a floating, magnifying dock that replaces the sidebar on md+.
 * Phones keep the bottom tab bar; the command palette covers everything else.
 */
export function Deck() {
  const [mouseX, setMouseX] = useState<number | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const moreActive = MORE.some((m) => location.pathname.startsWith(m.to))

  return (
    <nav
      aria-label="Primary"
      onMouseMove={(e) => setMouseX(e.clientX)}
      onMouseLeave={() => setMouseX(null)}
      className="fixed bottom-4 left-1/2 z-40 hidden -translate-x-1/2 md:block"
    >
      <div className="relative flex items-end gap-1 rounded-2xl border border-border/60 bg-bg-surface-2/80 px-2 py-2 shadow-[0_16px_48px_-16px_rgb(0_0_0/0.8),inset_0_1px_0_color-mix(in_oklch,var(--oklch-fg-0)_6%,transparent)] backdrop-blur-xl">
        {CORE.map((item) => (
          <DockIcon key={item.to} item={item} mouseX={mouseX} />
        ))}

        <span className="mx-1 h-8 w-px self-center bg-border/60" aria-hidden="true" />

        {/* Command palette trigger */}
        <motion.div style={{ scale: 1 }} className="relative">
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Open command palette"
            className="group flex size-11 items-center justify-center rounded-xl text-text-primary/60 transition-colors hover:bg-accent-brand/10 hover:text-text-primary"
          >
            <Search className="size-5" aria-hidden="true" />
          </button>
        </motion.div>

        {/* More popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            aria-label="More destinations"
            className={cn(
              'flex size-11 items-center justify-center rounded-xl transition-colors',
              moreOpen || moreActive
                ? 'bg-accent-brand/15 text-accent-brand'
                : 'text-text-primary/60 hover:bg-accent-brand/10 hover:text-text-primary',
            )}
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </button>

          {moreOpen && (
            <div className="absolute bottom-full right-0 mb-3 grid w-56 grid-cols-2 gap-1 rounded-2xl border border-border/60 bg-bg-surface-2/95 p-2 shadow-[0_16px_48px_-16px_rgb(0_0_0/0.8)] backdrop-blur-xl">
              {MORE.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
                      isActive
                        ? 'bg-accent-brand/15 text-accent-brand'
                        : 'text-text-primary/70 hover:bg-accent-brand/10 hover:text-text-primary',
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
