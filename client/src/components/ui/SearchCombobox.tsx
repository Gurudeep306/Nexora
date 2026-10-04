import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, CornerDownLeft, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ComboboxItem = {
  id: string
  label: string
  hint?: string
  group?: string
  icon?: ComponentType<{ className?: string }>
  /** Rendered on the right edge instead of the hint (e.g. a badge). */
  trailing?: ReactNode
  /** Per-item action, run before the combobox-level `onSelect`. */
  onSelect?: () => void
}

export interface SearchComboboxProps {
  items: ComboboxItem[]
  value: string
  onValueChange: (value: string) => void
  onSelect?: (item: ComboboxItem) => void
  placeholder?: string
  /** Rendered inside the field instead of a native placeholder (e.g. a
   *  RotatingText hint). Only visible while the field is empty. */
  placeholderNode?: ReactNode
  loading?: boolean
  emptyText?: string
  /** Open the panel as soon as the field is focused, even before typing. */
  openOnFocus?: boolean
  /** Extra node pinned under the scrollable list (e.g. a ⌘K hint). */
  footer?: ReactNode
  closeOnSelect?: boolean
  containerClassName?: string
  className?: string
  panelClassName?: string
  inputRef?: React.Ref<HTMLInputElement>
  'aria-label'?: string
}

/**
 * A search field whose results drop down from the bar itself — an anchored
 * combobox, not a centered modal. Reuses the SearchInput look (leading icon,
 * focus halo, clear button) and the app's frosted `pop-surface` for the panel.
 * Full keyboard support: ↑/↓ to move, ⏎ to open, Esc to dismiss.
 */
export const SearchCombobox = forwardRef<HTMLInputElement, SearchComboboxProps>(function SearchCombobox(
  {
    items,
    value,
    onValueChange,
    onSelect,
    placeholder = 'Search…',
    placeholderNode,
    loading = false,
    emptyText = 'No matches.',
    openOnFocus = true,
    footer,
    closeOnSelect = true,
    containerClassName,
    className,
    panelClassName,
    inputRef,
    ...rest
  },
  forwardedRef,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(forwardedRef, () => innerRef.current as HTMLInputElement)
  const setRefs = (node: HTMLInputElement | null) => {
    innerRef.current = node
    if (typeof inputRef === 'function') inputRef(node)
    else if (inputRef) (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node
  }

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => setActive(0), [value, items.length])

  // Close on outside pointer-down.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const showPanel = open && (items.length > 0 || loading || value.trim().length > 0 || !!footer)
  const hasValue = value.length > 0

  const choose = (item: ComboboxItem) => {
    item.onSelect?.()
    onSelect?.(item)
    if (closeOnSelect) {
      setOpen(false)
      innerRef.current?.blur()
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(a + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && items[active]) {
        e.preventDefault()
        choose(items[active])
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        setOpen(false)
      } else if (hasValue) {
        onValueChange('')
      }
    }
  }

  let lastGroup = ''
  let index = -1

  return (
    <div ref={rootRef} className={cn('group/search relative', containerClassName)}>
      <div className="relative flex items-center rounded-[var(--radius-control)] transition-shadow duration-200 focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent-brand)_12%,transparent)]">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 z-10 size-4 text-foreground-faint transition-all duration-200 group-focus-within/search:scale-110 group-focus-within/search:text-primary-bright"
        />
        <input
          ref={setRefs}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="search-combobox-list"
          aria-autocomplete="list"
          aria-activedescendant={showPanel && items[active] ? `scb-${items[active].id}` : undefined}
          value={value}
          placeholder={placeholderNode ? undefined : placeholder}
          onFocus={() => openOnFocus && setOpen(true)}
          onChange={(e) => {
            onValueChange(e.target.value)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
          className={cn('input-base w-full pl-9', hasValue && 'pr-9', className)}
          {...rest}
        />
        {placeholderNode && !hasValue && (
          <span className="pointer-events-none absolute top-1/2 right-3 left-9 z-10 -translate-y-1/2 truncate text-[13px] text-foreground-faint">
            {placeholderNode}
          </span>
        )}
        {hasValue && (
          <button
            type="button"
            onClick={() => {
              onValueChange('')
              innerRef.current?.focus()
            }}
            aria-label="Clear search"
            className="absolute right-2 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full text-foreground-faint transition-all duration-150 hover:scale-105 hover:bg-foreground/10 hover:text-foreground active:scale-95"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            id="search-combobox-list"
            role="listbox"
            ref={listRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            className={cn(
              'pop-surface absolute top-[calc(100%+8px)] left-0 z-[60] max-h-[min(22rem,var(--scb-available,22rem))] w-full origin-top overflow-hidden p-1.5',
              panelClassName,
            )}
          >
            <span aria-hidden="true" className="hairline-top pointer-events-none absolute inset-x-0 top-0 h-px" />
            <div className="max-h-[min(20rem,60vh)] overflow-y-auto overscroll-contain">
              {loading && items.length === 0 && (
                <div className="space-y-1.5 p-1.5">
                  <div className="skeleton h-7 w-full" />
                  <div className="skeleton h-7 w-4/5" />
                  <div className="skeleton h-7 w-3/5" />
                </div>
              )}
              {!loading && items.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-foreground-faint">{emptyText}</p>
              )}
              {items.map((item) => {
                const header = item.group && item.group !== lastGroup ? item.group : null
                if (item.group) lastGroup = item.group
                index += 1
                const i = index
                const Icon = item.icon
                const isActive = i === active
                return (
                  <div key={item.id}>
                    {header && (
                      <p className="px-2.5 pt-2.5 pb-1 text-[10px] font-semibold tracking-[0.12em] text-foreground-faint uppercase">
                        {header}
                      </p>
                    )}
                    <button
                      id={`scb-${item.id}`}
                      data-index={i}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseMove={() => setActive(i)}
                      onClick={() => choose(item)}
                      className={cn(
                        'relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                        isActive ? 'bg-foreground/8 text-foreground' : 'text-foreground/70',
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="scb-active"
                          className="absolute inset-y-1.5 left-0 w-[2.5px] rounded-r-full bg-accent-brand"
                          transition={{ type: 'spring', stiffness: 600, damping: 40 }}
                        />
                      )}
                      {Icon && (
                        <span
                          className={cn(
                            'flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors',
                            isActive
                              ? 'border-accent-brand/40 bg-accent-brand/15 text-accent-brand'
                              : 'border-border/10 bg-bg-app/5 text-foreground-faint',
                          )}
                        >
                          <Icon className="size-3.5" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.trailing ? (
                        item.trailing
                      ) : (
                        item.hint && <span className="shrink-0 font-mono text-[11px] text-foreground-faint">{item.hint}</span>
                      )}
                      {isActive && !item.trailing && <CornerDownLeft className="size-3 shrink-0 text-accent-brand" aria-hidden="true" />}
                    </button>
                  </div>
                )
              })}
            </div>
            {footer && <div className="mt-1 border-t border-border/10 pt-1">{footer}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

/** A small checked/selected glyph for reuse in combobox `trailing` slots. */
export const ComboboxCheck = Check
