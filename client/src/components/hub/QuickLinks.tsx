import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Bookmark, Code2, Swords, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickLink {
  to: string
  label: string
  desc: string
  icon: LucideIcon
  accent: string
}

const LINKS: QuickLink[] = [
  {
    to: '/problems',
    label: 'Problem Arena',
    desc: 'Browse & filter the full problem set',
    icon: Code2,
    accent: 'text-primary-bright border-primary/40',
  },
  {
    to: '/contests',
    label: 'Contests',
    desc: 'Live & upcoming CF / CodeChef rounds',
    icon: Trophy,
    accent: 'text-gold border-gold/40',
  },
  {
    to: '/workshop',
    label: 'Workshop',
    desc: 'Custom problems & community contests',
    icon: Swords,
    accent: 'text-accent border-accent/40',
  },
  {
    to: '/bookmarks',
    label: 'Bookmarks',
    desc: 'Your saved problems for later',
    icon: Bookmark,
    accent: 'text-cyan border-cyan/40',
  },
]

export function QuickLinks() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {LINKS.map((l, i) => (
        <motion.div
          key={l.to}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 + i * 0.04, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <Link
            to={l.to}
            aria-label={l.label}
            className={cn(
              'card-neon group flex h-full cursor-pointer flex-col gap-2 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:glow-box',
            )}
          >
            <span
              className={cn(
                'flex size-9 items-center justify-center rounded-lg border bg-surface-2 transition-transform duration-200 group-hover:scale-110 [&_svg]:size-4.5',
                l.accent,
              )}
            >
              <l.icon aria-hidden="true" />
            </span>
            <span className="font-display text-xs tracking-wider text-foreground uppercase">{l.label}</span>
            <span className="text-[11px] leading-snug text-foreground-faint">{l.desc}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
