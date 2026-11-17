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
import { MoreHorizontal } from 'lucide-react'
import { Icon } from '@/components/icon/Icon'
import { prefetchHandlers } from '@/routes'
import { cn } from '@/lib/utils'
import { DUR, EASE_EMPHASIZED, tEnter } from '@/lib/motion'
import { useSite } from '@/context/SiteContext'
import { openCommandPalette } from './CommandPalette'
import { DockBadge } from './DockBadge'
import { DockEditor } from './DockEditor'
import { DOCK_BY_ID, DOCK_ITEMS, DOCK_SIZES, isDockFocusRoute, useDock, type DockItem, type DockPosition } from './dockStore'

/** How far the swell reaches. (Resting and peak sizes come from the Dock size.) */
const REACH = 160
/** How close to its edge the cursor must be to summon an auto-hidden Dock. */
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
  pointer,
  magnify,
  mono,
  active,
  base,
  peak,
  position,
  showLabel,
}: {
  item: DockItem
  /** The pointer along the Dock's axis (x for a bottom Dock, y for a side one). */
  pointer: MotionValue<number>
  magnify: boolean
  mono: boolean
  active: boolean
  base: number
  peak: number
  position: DockPosition
  /** Names always shown under the icons. */
  showLabel: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const bounce = useAnimationControls()
  const navigate = useNavigate()

  const vertical = position !== 'bottom'
  const distance = useTransform(pointer, (v) => {
    const b = ref.current?.getBoundingClientRect()
    if (!b) return Infinity
    return vertical ? v - (b.top + b.height / 2) : v - (b.left + b.width / 2)
  })
  const target = useTransform(distance, [-REACH, 0, REACH], [base, magnify && !reduce ? peak : base, base])
  const size = useSpring(target, { mass: 0.12, stiffness: 190, damping: 16 })

  // The launch bounce leaps away from the Dock's edge.
  const launch = () => {
    if (reduce) return
    const hop = [0, -16, 0, -5, 0]
    void bounce.start(
      position === 'bottom'
        ? { y: hop, transition: { duration: 0.55, ease: 'easeOut' } }
        : { x: position === 'left' ? hop.map((v) => -v) : hop, transition: { duration: 0.55, ease: 'easeOut' } },
    )
  }

  const tile = (
    <motion.div
      ref={ref}
      animate={bounce}
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center"
    >
      {/* The glyph's tile is an IconBadge sized by the spring (its glyph is a
          percentage of the box), so it swells with the magnification and
          follows the chosen icon set, container and shape. Mono Docks show
          bare glyphs over a hover plate. */}
      {mono && (
        <span
          className={cn(
            'dock-plate absolute inset-0 transition-colors duration-200 group-hover:bg-bg-surface-3',
            active && 'bg-bg-surface-3',
          )}
          aria-hidden="true"
        />
      )}
      <DockBadge
        item={item}
        mono={mono}
        active={active}
        container={mono ? 'none' : undefined}
        className="dock-tile absolute inset-0 size-full transition-[filter] duration-200 group-hover:brightness-110"
      />

      {/* The name floats out from the Dock on hover (unless names are always shown). */}
      {!showLabel && (
        <span
          className="dock-label pop-surface pointer-events-none absolute !rounded-lg px-2.5 py-1 text-[12px] font-medium whitespace-nowrap text-text-primary"
          data-side={position}
        >
          {item.label}
        </span>
      )}
    </motion.div>
  )
  const caption = showLabel ? (
    <span className="dock-caption pointer-events-none block truncate text-center" style={{ maxWidth: base + 18 }}>
      {item.label}
    </span>
  ) : null

  const dot = (
    <span
      data-side={position}
      className={cn('dock-dot absolute size-[5px] rounded-full transition-opacity duration-300', active ? 'opacity-100' : 'opacity-0')}
      style={{ background: 'var(--color-text-primary)', boxShadow: '0 0 6px var(--color-text-primary)' }}
      aria-hidden="true"
    />
  )

  // The focus ring is an outline on the tile, so it follows the icon shape.
  const common = cn(
    'group relative flex cursor-pointer outline-none hover:!scale-100 focus-visible:[&_.dock-tile]:outline-2 focus-visible:[&_.dock-tile]:outline-offset-2 focus-visible:[&_.dock-tile]:outline-accent-brand',
    showLabel ? 'flex-col items-center gap-1' : position === 'bottom' ? 'items-end' : position === 'left' ? 'items-center justify-start' : 'items-center justify-end',
  )

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
        {caption}
      </button>
    )
  }
  if (item.external) {
    return (
      <a href={item.to} aria-label={item.label} className={common} onClick={launch}>
        {tile}
        {caption}
      </a>
    )
  }
  return (
    <NavLink
      to={item.to!}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      className={common}
      {...prefetchHandlers(item.to!)}
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
      {caption}
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
  const pointer = useMotionValue(Infinity)
  const position = dock.position
  const vertical = position !== 'bottom'
  const chosen = DOCK_SIZES.find((x) => x.id === dock.size) ?? DOCK_SIZES[1]
  const showLabel = dock.labels === 'always'
  // A side Dock shrinks its icons to fit a short window.
  const [vh, setVh] = useState(() => (typeof window === 'undefined' ? 900 : window.innerHeight))
  useEffect(() => {
    if (!vertical) return
    const on = () => setVh(window.innerHeight)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [vertical])
  const [moreOpen, setMoreOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const { pathname } = useLocation()
  const reduce = useReducedMotion()

  // Sections switched off by an admin (feature flags) leave the dock.
  const { pathOn, isStaff, mayHive } = useSite()
  const enabled = (i: DockItem) => (!i.staffOnly || isStaff) && (!i.hiveOnly || mayHive) && pathOn(i.to ?? '')
  const pinnedItems = dock.pinned.map((id) => DOCK_BY_ID.get(id)).filter((i): i is DockItem => !!i && enabled(i))
  // Admins and the owner always get Hive (the AI workspace) in the Dock, even if
  // they never pinned it. Nobody else ever sees it.
  const hive = DOCK_BY_ID.get('hive')
  const items = mayHive && hive && enabled(hive) && !pinnedItems.includes(hive) ? [...pinnedItems, hive] : pinnedItems
  const rest = DOCK_ITEMS.filter((i) => !items.includes(i) && enabled(i))
  const slot = (showLabel ? 24 : 0) + (showLabel ? 10 : 7)
  const fit = vertical ? Math.floor((vh - 120) / (items.length + 1) - slot) : chosen.base
  const base = Math.max(30, Math.min(chosen.base, fit))
  const peak = Math.round(base * (chosen.peak / chosen.base))
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
      const near =
        position === 'bottom' ? e.clientY >= window.innerHeight - REVEAL_EDGE : position === 'left' ? e.clientX <= REVEAL_EDGE : e.clientX >= window.innerWidth - REVEAL_EDGE
      if (near) {
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
  }, [autoHide, position])

  // The page leaves room on the Dock's side (index.css, html[data-dock]).
  const focusRoute = isDockFocusRoute(pathname)
  useEffect(() => {
    const root = document.documentElement
    if (focusRoute) root.removeAttribute('data-dock')
    else root.setAttribute('data-dock', position)
    root.style.setProperty('--dock-room', `${base + (showLabel ? 34 : 18) + 12}px`)
    return () => root.removeAttribute('data-dock')
  }, [focusRoute, position, base, showLabel])

  // Full-focus surfaces (Problems, Solve, Learn) never show the Dock.
  if (focusRoute) return null

  // Keep the Dock up while a menu or the editor is open, even if the cursor has
  // drifted away from its edge.
  const hidden = autoHide && !revealed && !moreOpen && !editing
  // Off-screen towards its own edge when hidden.
  // Always set both axes: the Dock can change edge after it mounts (the saved
  // setting arrives from the account), and a stale offset would push it off centre.
  const off = (d: number, gone: boolean) =>
    position === 'bottom' ? { x: 0, y: d, opacity: gone ? 0 : 1 } : { x: position === 'left' ? -d : d, y: 0, opacity: gone ? 0 : 1 }

  return (
    <>
      <motion.nav
        key={position}
        aria-label="Dock"
        aria-hidden={hidden || undefined}
        data-position={position}
        data-surface={dock.surface}
        initial={reduce ? false : off(hidden ? 130 : 110, hidden)}
        animate={off(hidden ? 130 : 0, hidden)}
        transition={{ duration: DUR.slow, ease: EASE_EMPHASIZED, delay: hidden ? 0 : 0.1 }}
        onMouseMove={(e) => pointer.set(vertical ? e.clientY : e.clientX)}
        onMouseLeave={() => pointer.set(Infinity)}
        onContextMenu={(e) => {
          e.preventDefault()
          pointer.set(Infinity)
          setEditing(true)
        }}
        className={cn(
          'dock fixed z-40 hidden md:block',
          position === 'bottom' && 'bottom-3 left-1/2 -translate-x-1/2',
          position === 'left' && 'top-1/2 left-3 -translate-y-1/2',
          position === 'right' && 'top-1/2 right-3 -translate-y-1/2',
          hidden && 'pointer-events-none',
        )}
      >
        <div
          className={cn('dock-bar relative flex', vertical ? 'flex-col items-center px-[9px] py-2.5' : 'items-end px-2.5 pb-[9px]')}
          style={{ gap: showLabel ? 10 : 7, [vertical ? 'width' : 'height']: base + (showLabel ? 34 : 18) }}
        >
          {/* The glass is a sibling layer, not the container: an element with a
              backdrop filter clips the backdrop of everything inside it, which
              would leave the labels and the More menu unfrosted. */}
          <span aria-hidden="true" className="dock-glass glass-thick pointer-events-none absolute inset-0 -z-10 rounded-[24px]" />

          {items.map((item) => (
            <DockIcon
              key={item.id}
              item={item}
              pointer={pointer}
              magnify={dock.magnify}
              mono={mono}
              active={isActive(item, pathname)}
              base={base}
              peak={peak}
              position={position}
              showLabel={showLabel}
            />
          ))}

          <span
            className={cn('dock-divider bg-border-strong', vertical ? 'my-1 h-px w-9 self-center' : 'mx-1 mb-1.5 h-9 w-px self-end', showLabel && !vertical && 'mb-6')}
            aria-hidden="true"
          />

          {/* More: everything not in the Dock, plus Customize */}
          <div className={cn('relative', showLabel && !vertical && 'mb-5')}>
            <button
              type="button"
              onClick={() => {
                pointer.set(Infinity)
                setMoreOpen((o) => !o)
              }}
              aria-expanded={moreOpen}
              aria-label="More destinations"
              style={{ width: base, height: base }}
              className={cn(
                'group flex cursor-pointer items-center justify-center rounded-[28%] transition-colors hover:!scale-100',
                moreOpen || moreActive ? 'bg-bg-surface-3 text-text-primary' : 'text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary',
              )}
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </button>

            {moreOpen && (
              <>
                <div className="fixed inset-0 z-0" onClick={() => setMoreOpen(false)} aria-hidden="true" />
                <motion.div
                  initial={{ y: 4, scale: 0.985, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  transition={tEnter}
                  className={cn(
                    'dock-more pop-surface absolute z-10 w-64 p-2',
                    position === 'bottom' && 'right-0 bottom-full mb-4 origin-bottom-right',
                    position === 'left' && 'bottom-0 left-full ml-4 origin-bottom-left',
                    position === 'right' && 'right-full bottom-0 mr-4 origin-bottom-right',
                  )}
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
                      pointer.set(Infinity)
                      setEditing(true)
                    }}
                    className="mt-1.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-t border-border px-2 pt-2.5 pb-1.5 text-[12.5px] font-medium text-text-secondary transition-colors hover:!scale-100 hover:text-text-primary"
                  >
                    <Icon name="sliders" className="size-3.5" />
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
  const inner = (
    <>
      <DockBadge item={item} mono={mono} box="md" />
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
    <NavLink to={item.to!} className={cls} onClick={onPick} {...prefetchHandlers(item.to!)}>
      {inner}
    </NavLink>
  )
}
