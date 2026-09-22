import type { ReactNode } from 'react'
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowDownToLine,
  GripVertical,
  Maximize2,
  Minimize2,
  Minus,
  MoreHorizontal,
  PictureInPicture2,
} from 'lucide-react'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Tooltip } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { Dock } from './state'

const DOCK_META: Record<Dock, { label: string; icon: ReactNode }> = {
  left: { label: 'Dock left', icon: <ArrowLeftToLine /> },
  right: { label: 'Dock right', icon: <ArrowRightToLine /> },
  bottom: { label: 'Dock bottom', icon: <ArrowDownToLine /> },
  float: { label: 'Float as window', icon: <PictureInPicture2 /> },
}

/**
 * Title bar shared by every workspace pane. Drag the grip/title to move the
 * pane (drop on a highlighted edge to dock it, anywhere else to float it).
 */
export function PaneHeader({
  icon,
  title,
  children,
  dock,
  allowed,
  maximized,
  onDragStart,
  onDock,
  onMinimize,
  onToggleMaximize,
  className,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
  dock: Dock
  allowed: Dock[]
  maximized: boolean
  onDragStart: (e: React.PointerEvent) => void
  onDock: (d: Dock) => void
  onMinimize: () => void
  onToggleMaximize: () => void
  className?: string
}) {
  return (
    <div
      onPointerDown={(e) => {
        // The whole bar is a drag handle — except its buttons, tabs and inputs.
        if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [role="tab"], [role="menuitem"], [data-no-drag]')) return
        onDragStart(e)
      }}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('button, a, input, select, [role="tab"]')) return
        onToggleMaximize()
      }}
      title="Drag to move · drop on an edge to dock · double-click to maximize"
      className={cn(
        'flex h-9 shrink-0 cursor-grab touch-none items-center gap-1 border-b border-white/[0.06] bg-white/[0.015] pr-1 pl-1 select-none active:cursor-grabbing',
        className,
      )}
    >
      <div
        className="flex min-w-0 items-center gap-1.5 self-stretch rounded-md px-1.5 text-foreground-faint hover:text-foreground-dim"
        aria-label={`Move ${title} panel`}
        role="button"
        tabIndex={-1}
      >
        <GripVertical className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
        <span className="shrink-0 text-primary-bright/90 [&_svg]:size-3.5">{icon}</span>
        <span className="truncate text-[11px] font-semibold tracking-[0.1em] text-foreground-dim uppercase">{title}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1 self-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>

      <Menu>
        <Tooltip label="Move panel">
          <MenuTrigger asChild>
            <button
              aria-label={`Move ${title} panel`}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md text-foreground-faint transition-colors hover:bg-white/[0.06] hover:text-foreground data-[state=open]:bg-white/[0.06]"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </MenuTrigger>
        </Tooltip>
        <MenuContent className="w-52">
          <MenuLabel>Position</MenuLabel>
          {allowed.map((d) => (
            <MenuItem key={d} icon={DOCK_META[d].icon} onSelect={() => onDock(d)} shortcut={d === dock ? '✓' : undefined}>
              {DOCK_META[d].label}
            </MenuItem>
          ))}
          <MenuSeparator />
          <MenuItem icon={maximized ? <Minimize2 /> : <Maximize2 />} onSelect={onToggleMaximize}>
            {maximized ? 'Restore size' : 'Maximize'}
          </MenuItem>
          <MenuItem icon={<Minus />} onSelect={onMinimize}>
            Minimize
          </MenuItem>
        </MenuContent>
      </Menu>
      <Tooltip label={maximized ? 'Restore' : 'Maximize'}>
        <button
          onClick={onToggleMaximize}
          aria-label={maximized ? `Restore ${title} panel` : `Maximize ${title} panel`}
          className="flex size-7 cursor-pointer items-center justify-center rounded-md text-foreground-faint transition-colors hover:bg-white/[0.06] hover:text-foreground"
        >
          {maximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </button>
      </Tooltip>
      <Tooltip label="Minimize">
        <button
          onClick={onMinimize}
          aria-label={`Minimize ${title} panel`}
          className="flex size-7 cursor-pointer items-center justify-center rounded-md text-foreground-faint transition-colors hover:bg-white/[0.06] hover:text-foreground"
        >
          <Minus className="size-4" />
        </button>
      </Tooltip>
    </div>
  )
}
