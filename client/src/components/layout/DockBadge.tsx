import { IconBadge, type IconBadgeSize } from '@/components/icon/Icon'
import type { IconContainerId } from '@/theme/iconCatalog'
import { cn } from '@/lib/utils'
import { dockIconName } from './dockIcons'
import { tileColor, type DockItem } from './dockStore'

/**
 * A Dock destination's icon tile: the item's semantic glyph in the user's icon
 * set, inside an <IconBadge> tinted with the item's own hue. Container and
 * shape follow data-icon-container / data-icon-shape (from <html> or an
 * ancestor), so the Dock, its More menu, the Dock editor and the launch grid
 * all match the rest of the app.
 *
 * `mono` draws a neutral glyph instead (active items take the accent).
 */
export function DockBadge({
  item,
  mono = false,
  active = false,
  box,
  container,
  className,
}: {
  item: DockItem
  mono?: boolean
  active?: boolean
  box?: IconBadgeSize
  /** Force a container (the mono Dock uses bare glyphs). */
  container?: IconContainerId
  className?: string
}) {
  return (
    <IconBadge
      name={dockIconName(item.id)}
      box={box}
      tone={mono ? (active ? 'accent' : 'neutral') : undefined}
      color={mono ? undefined : tileColor(item)}
      onColor={mono ? undefined : 'oklch(0.995 0 0)'}
      container={container}
      boxClassName={cn('dock-badge', mono && 'dock-badge--mono', className)}
    />
  )
}
