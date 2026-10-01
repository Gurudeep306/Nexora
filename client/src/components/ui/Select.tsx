import {
  Children,
  isValidElement,
  type ReactNode,
  type ReactElement,
} from 'react'
import { Select as RS } from 'radix-ui'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/* A premium, fully-themed dropdown built on Radix Select.
 *
 * It is a DROP-IN replacement for the old native <select> wrapper: it still
 * accepts <option>/<optgroup> children and still calls onChange with a
 * { target: { value } } shape, so existing call sites keep working while the
 * open panel now matches the app's frosted pop-surface language (animated
 * items, checkmark on the selection, rotating chevron) instead of the OS one.
 */

// Radix forbids an empty-string item value; round-trip "" through a sentinel.
const EMPTY = '\u0000nx-empty'
const toValue = (v: unknown) => (v == null || v === '' ? EMPTY : String(v))
const fromValue = (v: string) => (v === EMPTY ? '' : v)

type Item = { value: string; label: ReactNode; disabled?: boolean }
type Group = { label?: ReactNode; items: Item[] }
type OptionProps = { value?: string | number; disabled?: boolean; children?: ReactNode }
type OptgroupProps = { label?: ReactNode; children?: ReactNode }

function parseOptions(children: ReactNode): Group[] {
  const groups: Group[] = []
  let current: Group = { items: [] }
  const flush = () => {
    if (current.items.length) groups.push(current)
    current = { items: [] }
  }
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if ((child.type as unknown) === 'option') {
      const p = (child as ReactElement<OptionProps>).props
      current.items.push({ value: toValue(p.value), label: p.children, disabled: p.disabled })
    } else if ((child.type as unknown) === 'optgroup') {
      flush()
      const gp = (child as ReactElement<OptgroupProps>).props
      const g: Group = { label: gp.label, items: [] }
      Children.forEach(gp.children, (c) => {
        if (isValidElement(c) && (c.type as unknown) === 'option') {
          const p = (c as ReactElement<OptionProps>).props
          g.items.push({ value: toValue(p.value), label: p.children, disabled: p.disabled })
        }
      })
      groups.push(g)
    }
  })
  flush()
  return groups
}

export interface SelectProps {
  value?: string | number
  defaultValue?: string | number
  onChange?: (e: { target: { value: string } }) => void
  onValueChange?: (value: string) => void
  children?: ReactNode
  /** Applied to the trigger — sizing/layout classes (w-auto, flex-1…) land here. */
  className?: string
  contentClassName?: string
  placeholder?: string
  disabled?: boolean
  name?: string
  required?: boolean
  id?: string
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

export function Select({
  value,
  defaultValue,
  onChange,
  onValueChange,
  children,
  className,
  contentClassName,
  placeholder,
  disabled,
  name,
  required,
  id,
  ...aria
}: SelectProps) {
  const groups = parseOptions(children)

  const handle = (v: string) => {
    const real = fromValue(v)
    onChange?.({ target: { value: real } })
    onValueChange?.(real)
  }

  return (
    <RS.Root
      value={value !== undefined ? toValue(value) : undefined}
      defaultValue={defaultValue !== undefined ? toValue(defaultValue) : undefined}
      onValueChange={handle}
      disabled={disabled}
      name={name}
      required={required}
    >
      <RS.Trigger
        id={id}
        {...aria}
        className={cn(
          'input-base group relative flex w-full cursor-pointer items-center text-left',
          'data-[state=open]:border-accent-brand data-[state=open]:[box-shadow:var(--shadow-input-focus)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        <span className="flex-1 truncate pr-6">
          <RS.Value placeholder={placeholder} />
        </span>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 size-4 shrink-0 text-foreground-faint transition-transform duration-200 ease-out group-data-[state=open]:rotate-180 group-data-[state=open]:text-primary-bright"
        />
      </RS.Trigger>

      <RS.Portal>
        <RS.Content
          position="popper"
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            'pop-surface z-[1100] max-h-[min(22rem,var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden p-1.5',
            'origin-[var(--radix-select-content-transform-origin)]',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-200 data-[state=open]:ease-out',
            contentClassName,
          )}
        >
          <RS.ScrollUpButton className="flex cursor-default items-center justify-center py-1 text-foreground-faint">
            <ChevronUp className="size-3.5" aria-hidden="true" />
          </RS.ScrollUpButton>

          <RS.Viewport>
            {groups.map((group, gi) => {
              const items = group.items.map((item) => (
                <RS.Item
                  key={item.value + String(gi)}
                  value={item.value}
                  disabled={item.disabled}
                  className={cn(
                    'relative flex cursor-pointer items-center rounded-md py-2 pl-2.5 pr-8 text-[13px] outline-none select-none',
                    'text-foreground/70 data-[highlighted]:bg-foreground/10 data-[highlighted]:text-foreground',
                    'data-[state=checked]:font-medium data-[state=checked]:text-primary-bright',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
                  )}
                >
                  <RS.ItemText className="truncate">{item.label}</RS.ItemText>
                  <RS.ItemIndicator className="absolute right-2.5 flex items-center">
                    <Check className="size-3.5" aria-hidden="true" />
                  </RS.ItemIndicator>
                </RS.Item>
              ))
              return group.label != null ? (
                <RS.Group key={gi}>
                  <RS.Label className="px-2.5 pt-1.5 pb-1 text-[10.5px] font-semibold tracking-[0.1em] text-foreground-faint uppercase">
                    {group.label}
                  </RS.Label>
                  {items}
                </RS.Group>
              ) : (
                <div key={gi}>{items}</div>
              )
            })}
          </RS.Viewport>

          <RS.ScrollDownButton className="flex cursor-default items-center justify-center py-1 text-foreground-faint">
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </RS.ScrollDownButton>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  )
}

Select.displayName = 'Select'
