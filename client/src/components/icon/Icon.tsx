/*
  <Icon> — renders a semantic icon in the user's chosen icon set and style.

  PLACEHOLDER: renders Lucide only. The icon-system work replaces this file's
  implementation while keeping the exported API below unchanged:

    <Icon name="home" />                       follows <html data-icon-set/-style>
    <Icon name="home" set="tabler" style="filled" />   explicit (for previews)
    <IconBadge name="trophy" />                icon inside the themed container
                                               (data-icon-container/-shape)
*/
import type { SVGProps } from 'react'
import {
  BarChart3, Bell, BookOpen, Check, Code2, Flame, GraduationCap, Home, ListChecks,
  Network, Search, Settings, Sparkles, Trophy, User, FileQuestion,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoreIconName, IconSetId } from '@/theme/iconCatalog'

export type IconName = CoreIconName

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'ref' | 'style'> {
  name: IconName
  /** Override the user's set (previews). */
  set?: IconSetId
  /** Override the user's style (previews). */
  style?: string
  /** Pixel size; defaults to 1em-ish via className sizing (size-4 etc.). */
  size?: number
  className?: string
}

const LUCIDE: Record<CoreIconName, typeof Home> = {
  home: Home,
  problems: ListChecks,
  learn: GraduationCap,
  gate: FileQuestion,
  nexus: Network,
  analytics: BarChart3,
  trophy: Trophy,
  settings: Settings,
  search: Search,
  bell: Bell,
  code: Code2,
  book: BookOpen,
  sparkles: Sparkles,
  user: User,
  flame: Flame,
  check: Check,
}

export function Icon({ name, size, className, set: _set, style: _style, ...rest }: IconProps) {
  const Cmp = LUCIDE[name]
  return <Cmp aria-hidden="true" size={size} className={cn('shrink-0', className)} {...rest} />
}

export interface IconBadgeProps extends IconProps {
  /** Tailwind size of the container, e.g. 'size-10'. */
  boxClassName?: string
}

export function IconBadge({ boxClassName, ...icon }: IconBadgeProps) {
  return (
    <span className={cn('icon-badge inline-flex shrink-0 items-center justify-center', boxClassName ?? 'size-10')}>
      <Icon {...icon} className={cn('size-[55%]', icon.className)} />
    </span>
  )
}
