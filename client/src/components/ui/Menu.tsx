import type { ComponentProps, ReactNode } from 'react'
import { DropdownMenu as DM, Popover as PO } from 'radix-ui'
import { cn } from '@/lib/utils'

/* ── Dropdown menu (Radix) ── */

export const Menu = DM.Root
export const MenuTrigger = DM.Trigger
export const MenuGroup = DM.Group

export function MenuContent({
  className,
  align = 'end',
  sideOffset = 8,
  ...props
}: ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          'pop-surface z-[1100] min-w-52 origin-[var(--radix-dropdown-menu-content-transform-origin)] p-1.5 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-200 data-[state=open]:ease-out',
          className,
        )}
        {...props}
      />
    </DM.Portal>
  )
}

export function MenuItem({
  className,
  icon,
  shortcut,
  danger,
  children,
  ...props
}: ComponentProps<typeof DM.Item> & { icon?: ReactNode; shortcut?: ReactNode; danger?: boolean }) {
  return (
    <DM.Item
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-foreground/60 outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-foreground/10 data-[highlighted]:text-foreground [&_svg]:size-4 [&_svg]:shrink-0',
        danger && 'data-[highlighted]:bg-destructive/15 data-[highlighted]:text-destructive',
        className,
      )}
      {...props}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-[11px] text-foreground/50">{shortcut}</span>}
    </DM.Item>
  )
}

export function MenuLabel({ className, ...props }: ComponentProps<typeof DM.Label>) {
  return (
    <DM.Label
      className={cn('px-2.5 pt-1.5 pb-1 text-[10.5px] font-semibold tracking-[0.1em] text-foreground/60 uppercase', className)}
      {...props}
    />
  )
}

export function MenuSeparator({ className, ...props }: ComponentProps<typeof DM.Separator>) {
  return <DM.Separator className={cn('-mx-1.5 my-1.5 h-px bg-foreground/10', className)} {...props} />
}

/* ── Popover (Radix) ── */

export const Popover = PO.Root
export const PopoverTrigger = PO.Trigger
export const PopoverClose = PO.Close

export function PopoverContent({
  className,
  align = 'end',
  sideOffset = 8,
  ...props
}: ComponentProps<typeof PO.Content>) {
  return (
    <PO.Portal>
      <PO.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          'pop-surface z-[1100] origin-[var(--radix-popover-content-transform-origin)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-200 data-[state=open]:ease-out',
          className,
        )}
        {...props}
      />
    </PO.Portal>
  )
}
