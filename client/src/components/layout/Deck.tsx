import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { MoreHorizontal, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { openCommandPalette } from './CommandPalette'
import { DockEditor } from './DockEditor'
import { DOCK_BY_ID, DOCK_ITEMS, isDockFocusRoute, tileStyle, useDock, type DockItem } from './dockStore'

/** Resting icon size, the size under the pointer, and how far the swell reaches. */
const BASE = 46
const PEAK = 72
const REACH = 160
/** How close to the bottom edge the cursor must be to summon an auto-hidden Dock. */
const REVEAL_EDGE = 96
/** Grace period before the Dock slips away after the cursor leaves the edge. */
const HIDE_DELAY = 480

function isActive(item: DockItem, pathname: string) {
  if (!item.to || item.external) return false
  const path = item.to.split('?')[0]
  return pathname === path || pathname.startsWith(`${path}/`)
}

/**
 * One Dock icon. Its size follows the pointer through a spring, driven by
 * motion values rather than React state, so the magnification runs at full
 * frame rate without re-rendering the Dock. Icons grow upward from the bar
 * and push their neighbours apart, the way the macOS Dock does; a click
 * gives the icon a short launch bounce.
 */
function DockIcon({
  item,
  mouseX,
  magnify,
  mono,
  active,
}: {
  item: DockItem
  mouseX: MotionValue<number>
  magnify: boolean
  mono: boolean
  active: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const bounce = useAnimationControls()
  const navigate = useNavigate()

  const distance = useTransform(mouseX, (x) => {
    const b = ref.current?.getBoundingClientRect()
    return b ? x - (b.left + b.width / 2) : Infinity
  })
  const target = useTransform(distance, [-REACH, 0, REACH], [BASE, magnify && !reduce ? PEAK : BASE, BASE])
  const size = useSpring(target, { mass: 0.12, stiffness: 190, damping: 16 })
  const glyph = useTransform(size, (s) => s * 0.46)
  const Icon = item.icon

  const launch = () => {
    if (!reduce) void bounce.start({ y: [0, -16, 0, -5, 0], transition: { duration: 0.55, ease: 'easeOut' } })
  }

  const tile = (
    <motion.div
      ref={ref}
      animate={bounce}
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center"
    >
      <span
        className={cn(
          'absolute inset-0 rounded-[28%] transition-[filter,background-color] duration-200',
          mono
            ? cn('bg-transparent group-hover:bg-bg-surface-3', active && 'bg-bg-surface-3')
            : 'dock-tile group-hover:brightness-110',
        )}
        style={mono ? undefined : tileStyle(item)}
        aria-hidden="true"
      />
      <motion.span style={{ width: glyph, height: glyph }} className="relative flex">
        <Icon
          className={cn(
            'size-full',
            mono ? (active ? 'text-accent-brand' : 'text-text-secondary group-hover:text-text-primary') : 'text-white drop-shadow-[0_1px_1px_rgb(0_0_0/0.25)]',
          )}
          strokeWidth={mono ? 1.9 : 2.1}
          aria-hidden="true"
        />
      </motion.span>

      {/* name, floating above like the macOS Dock label */}
      <span className="dock-label pop-surface pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 !rounded-lg px-2.5 py-1 text-[12px] font-medium whitespace-nowrap text-text-primary">
        {item.label}
      </span>
    </motion.div>
  )

  const dot = (
    <span
      className={cn(
        'absolute -bottom-[7px] left-1/2 size-[5px] -translate-x-1/2 rounded-full transition-opacity duration-300',
        active ? 'opacity-100' : 'opacity-0',
      )}
      style={{ background: 'var(--color-text-primary)', boxShadow: '0 0 6px var(--color-text-primary)' }}
      aria-hidden="true"
    />
  )

  const common = 'group relative flex cursor-pointer items-end outline-none hover:!scale-100 focus-visible:[&>div]:ring-2 focus-visible:[&>div]:ring-accent-brand focus-visible:[&>div]:rounded-[28%]'

  if (item.action === 'search') {
    return (
      <button
        type="button"
        aria-label={item.label}
        className={common}
        onClick={() => {
          launch()
          openCommandPalette()
        }}
      >
        {tile}
      </button>
    )
  }
  if (item.external) {
    return (
      <a href={item.to} aria-label={item.label} className={common} onClick={launch}>
        {tile}
      </a>
    )
  }
  return (
    <NavLink
      to={item.to!}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      className={common}
      onClick={(e) => {
        // Settings?tab=… is a query route; NavLink handles the rest.
        if (item.to!.includes('?')) {
          e.preventDefault()
          navigate(item.to!)
        }
        launch()
      }}
    >
      {tile}
      {dot}
    </NavLink>
  )
}

/**
 * The Dock — a floating, magnifying bar of the places you use, which you can
 * rearrange (Customize Dock, or right-click the Dock). Phones keep the bottom
 * tab bar, which takes its first tabs from the same arrangement.
 */
export function Deck() {
  const dock = useDock()
  const mouseX = useMotionValue(Infinity)
  const [moreOpen, setMoreOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const { pathname } = useLocation()
  const reduce = useReducedMotion()

  const items = dock.pinned.map((id) => DOCK_BY_ID.get(id)).filter((i): i is DockItem => !!i)
  const rest = DOCK_ITEMS.filter((i) => !dock.pinned.includes(i.id))
  const mono = dock.iconStyle === 'mono'
  const moreActive = rest.some((i) => isActive(i, pathname))

  const autoHide = dock.autoHide
  const [revealed, setRevealed] = useState(!autoHide)
  const hideTimer = useRef<number | null>(null)

  // Auto-hide: summon the Dock when the cursor nears the bottom edge, and slip
  // it away again shortly after the cursor leaves. Only wired while enabled.
  useEffect(() => {
    if (!autoHide) {
      setRevealed(true)
      return
    }
    const clear = () => {
      if (hideTimer.current !== null) {
        window.clearTimeout(hideTimer.current)
        hideTimer.current = null
      }
    }
    const onMove = (e: MouseEvent) => {
      if (e.clientY >= window.innerHeight - REVEAL_EDGE) {
        clear()
        setRevealed(true)
      } else if (hideTimer.current === null) {
        hideTimer.current = window.setTimeout(() => {
          hideTimer.current = null
          setRevealed(false)
        }, HIDE_DELAY)
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      clear()
    }
  }, [autoHide])

  // Full-focus surfaces (Problems, Solve, Learn) never show the Dock.
  if (isDockFocusRoute(pathname)) return null

  // Keep the Dock up while a menu or the editor is open, even if the cursor has
  // drifted away from the bottom edge.
  const hidden = autoHide && !revealed && !moreOpen && !editing

  return (
    <>
      <motion.nav
        aria-label="Dock"
        aria-hidden={hidden || undefined}
        initial={reduce ? false : { y: hidden ? 130 : 110, opacity: hidden ? 0 : 1 }}
        animate={{ y: hidden ? 130 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28, delay: hidden ? 0 : 0.1 }}
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        onContextMenu={(e) => {
          e.preventDefault()
          mouseX.set(Infinity)
          setEditing(true)
        }}
        className={cn(
          'fixed bottom-3 left-1/2 z-40 hidden -translate-x-1/2 md:block',
          hidden && 'pointer-events-none',
        )}
      >
        <div className="relative flex h-[64px] items-end gap-[7px] px-2.5 pb-[9px]">
          {/* The glass is a sibling layer, not the container: an element with a
              backdrop filter clips the backdrop of everything inside it, which
              would leave the labels and the More menu unfrosted. */}
          <span aria-hidden="true" className="glass-thick pointer-events-none absolute inset-0 -z-10 rounded-[24px]" />

          {items.map((item) => (
            <DockIcon
              key={item.id}
              item={item}
              mouseX={mouseX}
              magnify={dock.magnify}
              mono={mono}
              active={isActive(item, pathname)}
            />
          ))}

          <span className="mx-1 mb-1.5 h-9 w-px self-end bg-border-strong" aria-hidden="true" />

          {/* More: everything not in the Dock, plus Customize */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                mouseX.set(Infinity)
                setMoreOpen((o) => !o)
              }}
              aria-expanded={moreOpen}
              aria-label="More destinations"
              className={cn(
                'group flex size-[46px] cursor-pointer items-center justify-center rounded-[28%] transition-colors hover:!scale-100',
                moreOpen || moreActive ? 'bg-bg-surface-3 text-text-primary' : 'text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary',
              )}
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </button>

            {moreOpen && (
              <>
                <div className="fixed inset-0 z-0" onClick={() => setMoreOpen(false)} aria-hidden="true" />
                <motion.div
                  initial={{ y: 8, scale: 0.97 }}
                  animate={{ y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="pop-surface absolute right-0 bottom-full z-10 mb-4 w-64 origin-bottom-right !rounded-2xl p-2"
                >
                  {rest.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1">
                      {rest.map((item) => (
                        <MoreTile key={item.id} item={item} mono={mono} onPick={() => setMoreOpen(false)} />
                      ))}
                    </div>
                  ) : (
                    <p className="px-2 py-3 text-center text-[12px] text-text-muted">Everything is in your Dock.</p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false)
                      mouseX.set(Infinity)
                      setEditing(true)
                    }}
                    className="mt-1.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-t border-border px-2 pt-2.5 pb-1.5 text-[12.5px] font-medium text-text-secondary transition-colors hover:!scale-100 hover:text-text-primary"
                  >
                    <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                    Customize Dock…
                  </button>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </motion.nav>

      <DockEditor open={editing} onClose={() => setEditing(false)} />
    </>
  )
}

function MoreTile({ item, mono, onPick }: { item: DockItem; mono: boolean; onPick: () => void }) {
  const Icon = item.icon
  const inner = (
    <>
      <span
        className={cn('flex size-10 items-center justify-center rounded-[28%]', mono ? 'bg-bg-surface-3' : 'dock-tile')}
        style={mono ? undefined : tileStyle(item)}
      >
        <Icon className={cn('size-[19px]', mono ? 'text-text-primary' : 'text-white')} aria-hidden="true" />
      </span>
      <span className="w-full truncate text-center text-[11px] text-text-secondary group-hover:text-text-primary">
        {item.label}
      </span>
    </>
  )
  const cls = 'group flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition-colors hover:!scale-100 hover:bg-bg-surface-3'
  if (item.action === 'search')
    return (
      <button type="button" className={cls} onClick={() => {
          onPick()
          openCommandPalette()
        }}>
        {inner}
      </button>
    )
  if (item.external)
    return (
      <a href={item.to} className={cls} onClick={onPick}>
        {inner}
      </a>
    )
  return (
    <NavLink to={item.to!} className={cls} onClick={onPick}>
      {inner}
    </NavLink>
  )
}
