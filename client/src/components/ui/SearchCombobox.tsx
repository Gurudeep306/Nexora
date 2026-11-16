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
import { Check, CornerDownLeft, Search, SearchX, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { popIn } from '@/lib/motion'
import { Highlight } from './Highlight'

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
  /** Keep the panel open after choosing (e.g. a recent query that refills the field). */
  keepOpen?: boolean
  /** Don't highlight the query inside this label (e.g. "Search all for …"). */
  plain?: boolean
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
  /** A small control shown at the right of a group's header (e.g. "Clear" on Recent). */
  groupActions?: Partial<Record<string, ReactNode>>
  /** A notice shown above the items (e.g. "No problems match"). */
  notice?: ReactNode
  /** Mark the typed text inside each result (default on). */
  highlight?: boolean
  closeOnSelect?: boolean
  containerClassName?: string
  className?: string
  panelClassName?: string
  inputRef?: React.Ref<HTMLInputElement>
  /** "line" (a ledger line, for pages) or "bar" (a soft pill, for the top bar). */
  variant?: 'line' | 'bar'
  'aria-label'?: string
}

/**
 * A search field whose results drop down from the bar itself — an anchored
 * combobox, not a centered modal. Uses the shared field look (input-base: a
 * single border + soft focus halo) and the opaque `pop-surface` for the panel.
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
    groupActions,
    notice,
    highlight = true,
    closeOnSelect = true,
    containerClassName,
    className,
    panelClassName,
    inputRef,
    variant = 'line',
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
    if (closeOnSelect && !item.keepOpen) {
      setOpen(false)
      innerRef.current?.blur()
    } else {
      innerRef.current?.focus()
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
      <div className={cn('ui-search relative flex items-center', variant === 'bar' && 'is-bar')}>
        <Search aria-hidden="true" className={cn('ui-search-icon pointer-events-none absolute z-10 size-[17px]', variant === 'bar' ? 'left-3.5' : 'left-0.5')} />
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
          className={cn('ui-search-input w-full', variant === 'bar' ? 'pl-10' : 'pl-8', hasValue && 'pr-9', className)}
          {...rest}
        />
        {placeholderNode && !hasValue && (
          <span className={cn('ui-search-hint pointer-events-none absolute top-1/2 right-3 z-10 -translate-y-1/2 truncate text-[14px]', variant === 'bar' ? 'left-10' : 'left-8')}>
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
            className={cn('search-field-clear absolute z-10', variant === 'bar' ? 'right-2' : 'right-0.5')}
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            {...popIn}
            className={cn(
              'ui-search-panel pop-surface absolute top-[calc(100%+8px)] left-0 z-[60] flex max-h-[min(26rem,70vh)] w-full origin-top flex-col overflow-hidden',
              panelClassName,
            )}
          >
            <div
              id="search-combobox-list"
              role="listbox"
              ref={listRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
            >
              {notice}
              {loading && items.length === 0 && (
                <div className="space-y-1 p-1" aria-label="Searching">
                  <div className="skeleton h-8 w-full" />
                  <div className="skeleton h-8 w-4/5" />
                  <div className="skeleton h-8 w-3/5" />
                </div>
              )}
              {!loading && items.length === 0 && !notice && (
                <div className="flex flex-col items-center px-4 py-7 text-center">
                  <SearchX className="size-5 text-text-muted" aria-hidden="true" />
                  <p className="mt-2 mb-0 text-[13px] text-text-secondary">{emptyText}</p>
                </div>
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
                      <div className={cn('flex items-center justify-between px-2.5 pb-1', i === 0 ? 'pt-1.5' : 'pt-3')}>
                        <span className="ui-search-group text-text-muted">{header}</span>
                        {groupActions?.[header]}
                      </div>
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
                        'flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-[calc(var(--radius-control)*0.8)] px-2.5 text-left text-[13px] active:!scale-100',
                        isActive ? 'bg-text-primary/[0.07] text-text-primary' : 'text-text-secondary',
                      )}
                    >
                      {Icon && <Icon className={cn('size-4 shrink-0', isActive ? 'text-text-primary' : 'text-text-muted')} />}
                      <span className="min-w-0 flex-1 truncate">
                        {highlight && !item.plain ? <Highlight text={item.label} query={value} /> : item.label}
                      </span>
                      {item.trailing ? (
                        item.trailing
                      ) : (
                        item.hint && <span className="max-w-[42%] min-w-0 shrink truncate text-[11.5px] text-text-muted">{item.hint}</span>
                      )}
                      <CornerDownLeft
                        className={cn('size-3.5 shrink-0 text-text-muted transition-opacity', isActive ? 'opacity-100' : 'opacity-0')}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                )
              })}
            </div>
            {footer && <div className="shrink-0 border-t border-border p-1.5">{footer}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

/** A small checked/selected glyph for reuse in combobox `trailing` slots. */
export const ComboboxCheck = Check
