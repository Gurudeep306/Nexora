/*
  <Icon> — renders a semantic icon in the user's chosen icon set and style.

    <Icon name="home" />                               follows <html data-icon-set/-style>
    <Icon name="home" set="heroicons" style="solid" />  explicit (previews)
    <Icon name="trophy" label="Contest winner" />      meaningful icon (role="img")
    <IconBadge name="trophy" tone="warning" />         icon in the themed container
                                                       (data-icon-container/-shape)

  Lucide is bundled and renders instantly; other sets load lazily (one chunk
  per set). Until a set has arrived its Lucide twin is drawn in the same box,
  so there is no empty flash and no layout shift.
*/
import { useEffect, type CSSProperties, type ReactNode, type SVGProps } from 'react'
import { cn } from '@/lib/utils'
import {
  findIconSet,
  resolveIconStyle,
  type IconContainerId,
  type IconSetId,
  type IconShapeId,
} from '@/theme/iconCatalog'
import { LUCIDE_PACK, loadIconPack, packKey, useIconChoice, useIconPack } from './iconStore'
import type { IconName } from './names'
import type { Glyph } from './packs/types'
import './icon.css'

export type { IconName } from './names'
export { ICON_GROUPS, ICON_NAMES } from './names'

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'ref' | 'style' | 'children'> {
  name: IconName
  /** Override the user's set (previews). */
  set?: IconSetId
  /** Override the user's style (previews). Invalid ids fall back to the set default. */
  style?: string
  /** Pixel size (width = height). Tailwind size classes on className also work. */
  size?: number
  className?: string
  /** Accessible name. Without it the icon is decorative (aria-hidden). */
  label?: string
  /** Alias of `label`. */
  title?: string
}

/*
  Optical size per library, so a size-5 icon reads equally big in every set.
  Lucide/Remix/Heroicons/Iconoir draw edge-to-edge on a 24 grid (~20px live
  area); Tabler keeps ~3px padding and Phosphor ~2.6px (on its 256 grid).
*/
const OPTICAL_SCALE: Record<IconSetId, number> = {
  lucide: 1,
  phosphor: 1.06,
  tabler: 1.08,
  remix: 1,
  heroicons: 1,
  iconoir: 1,
}

/* While a set loads, its Lucide twin stands in at a matching weight. */
function lucideStyleFor(style: string): string {
  if (style === 'thin' || style === 'light') return 'light'
  if (style === 'bold' || style === 'fill' || style === 'filled' || style === 'solid') return 'bold'
  return 'regular'
}

export function Icon({ name, set, style, size, className, label, title, 'aria-label': ariaLabel, ...rest }: IconProps) {
  const choice = useIconChoice()
  const info = findIconSet(set ?? choice.set)
  // An explicit set without a style uses that set's default (unless it is the user's set).
  const styleId = resolveIconStyle(info, style ?? (info.id === choice.set ? choice.style : undefined))
  const key = packKey(info.id, styleId)
  const pack = useIconPack(key)

  useEffect(() => {
    if (!pack) void loadIconPack(key)
  }, [pack, key])

  const active = pack ?? LUCIDE_PACK
  const activeStyle = pack ? styleId : lucideStyleFor(styleId)
  const G: Glyph | undefined = active.styles[activeStyle]?.[name] ?? LUCIDE_PACK.styles.regular[name]
  if (!G) return null

  const scale = G.opticalScale ?? OPTICAL_SCALE[active.id]
  const a11yName = label ?? title ?? ariaLabel
  return (
    <G
      size={size ?? 24}
      className={cn('nx-icon shrink-0', className)}
      data-glyph={`${active.id}:${activeStyle}`}
      aria-hidden={a11yName ? undefined : true}
      role={a11yName ? 'img' : undefined}
      aria-label={a11yName}
      focusable="false"
      style={scale !== 1 ? { scale: String(scale) } : undefined}
      {...rest}
    />
  )
}

export type IconTone = 'accent' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'streak'
export type IconBadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface BadgeFrameOptions {
  /** Extra classes for the container, e.g. 'size-12' (overrides `box`). */
  boxClassName?: string
  /** Preset container size: xs 24 · sm 32 · md 40 (default) · lg 48 · xl 56 px. */
  box?: IconBadgeSize
  /** Colour family of the badge. */
  tone?: IconTone
  /** Any CSS colour (e.g. a Nexus zone colour) — overrides `tone`. */
  color?: string
  /** Force a container/shape (previews); normally inherited from <html> or an ancestor. */
  container?: IconContainerId
  shape?: IconShapeId
}

export interface IconFrameProps extends BadgeFrameOptions {
  children?: ReactNode
  className?: string
}

/** The badge container on its own — for content that is not an icon (a level number, an avatar). */
export function IconFrame({ boxClassName, className, box = 'md', tone = 'accent', color, container, shape, children }: IconFrameProps) {
  return (
    <span
      className={cn('icon-badge', `icon-badge--${box}`, boxClassName, className)}
      data-tone={tone}
      data-icon-container={container}
      data-icon-shape={shape}
      style={color ? ({ '--ib-c': color } as CSSProperties) : undefined}
    >
      {children}
    </span>
  )
}

export interface IconBadgeProps extends IconProps, BadgeFrameOptions {}

export function IconBadge({ boxClassName, box, tone, color, container, shape, ...icon }: IconBadgeProps) {
  return (
    <IconFrame boxClassName={boxClassName} box={box} tone={tone} color={color} container={container} shape={shape}>
      <Icon {...icon} className={cn('icon-badge__glyph', icon.className)} />
    </IconFrame>
  )
}
