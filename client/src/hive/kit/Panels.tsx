import type { ReactNode } from 'react'
import { Group, Separator, useDefaultLayout } from 'react-resizable-panels'
import { cn } from '@/lib/utils'

export { Panel } from 'react-resizable-panels'

/**
 * A horizontal group of resizable panels with the layout persisted to
 * localStorage (the same react-resizable-panels v4 convention the solve
 * workspace uses). `panelIds` must match the rendered Panel ids; changing
 * the composition should come with a new `id` so each layout is remembered.
 */
export function PanelGroup({ id, panelIds, children, className }: { id: string; panelIds: string[]; children: ReactNode; className?: string }) {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id, panelIds, storage: localStorage })
  return (
    <Group
      id={id}
      orientation="horizontal"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      resizeTargetMinimumSize={{ fine: 14, coarse: 36 }}
      className={cn('min-h-0 min-w-0 flex-1', className)}
    >
      {children}
    </Group>
  )
}

/** A 1px hairline with a wide hit area; focusable, arrow keys resize. */
export function PanelSeparator({ label }: { label: string }) {
  return (
    <Separator aria-label={label} className="group relative w-[9px] shrink-0 cursor-col-resize outline-none">
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--hive-line)] transition-colors duration-150 group-hover:bg-[var(--color-accent-brand)] group-focus-visible:bg-[var(--color-accent-brand)] group-data-[separator=active]:bg-[var(--color-accent-brand)]" />
    </Separator>
  )
}
