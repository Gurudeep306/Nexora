/*
  Accessible building blocks for the Theme Centre: a roving-tabindex radio
  group (arrow keys move and select, Home/End jump, one tab stop), a
  segmented control built on it, the mode control and the accent row.
*/
import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { Lock, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type Appearance } from '@/context/ThemeContext'
import { ACCENTS } from '@/theme/palettes'
import { cn } from '@/lib/utils'

interface RadioGroupProps<T extends { id: string }> {
  label: string
  items: readonly T[]
  value: string
  onChange: (id: string) => void
  renderItem: (item: T, checked: boolean) => ReactNode
  /** Called while an item is hovered or keyboard-focused (null when left). */
  onPreview?: (id: string | null) => void
  className?: string
  itemClassName?: string | ((item: T, checked: boolean) => string)
  itemLabel?: (item: T) => string
  /** Group orientation for assistive tech. */
  orientation?: 'horizontal' | 'vertical'
}

export function RadioGroup<T extends { id: string }>({
  label,
  items,
  value,
  onChange,
  renderItem,
  onPreview,
  className,
  itemClassName,
  itemLabel,
  orientation,
}: RadioGroupProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const selected = Math.max(0, items.findIndex((i) => i.id === value))

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const last = items.length - 1
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? index === last ? 0 : index + 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? index === 0 ? last : index - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : -1
    if (next < 0) return
    e.preventDefault()
    refs.current[next]?.focus()
    onChange(items[next].id)
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-orientation={orientation}
      className={className}
      onMouseLeave={onPreview ? () => onPreview(null) : undefined}
    >
      {items.map((item, i) => {
        const checked = item.id === value
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={itemLabel?.(item)}
            tabIndex={i === selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            onMouseEnter={onPreview ? () => onPreview(item.id) : undefined}
            onFocus={onPreview ? () => onPreview(item.id) : undefined}
            onBlur={onPreview ? () => onPreview(null) : undefined}
            className={cn(
              'tc-focus cursor-pointer text-left hover:!scale-100 active:!scale-100',
              typeof itemClassName === 'function' ? itemClassName(item, checked) : itemClassName,
            )}
          >
            {renderItem(item, checked)}
          </button>
        )
      })}
    </div>
  )
}

/** A compact segmented control (radio semantics). */
export function Segmented<T extends { id: string; label: string; icon?: ReactNode }>({
  label,
  items,
  value,
  onChange,
  className,
  size = 'md',
}: {
  label: string
  items: readonly T[]
  value: string
  onChange: (id: string) => void
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <RadioGroup
      label={label}
      items={items}
      value={value}
      onChange={onChange}
      orientation="horizontal"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-[calc(var(--radius-control)+2px)] border border-border bg-bg-surface-2 p-[3px]',
        className,
      )}
      itemClassName={(_, checked) =>
        cn(
          'flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-control)] font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-200',
          size === 'sm' ? 'h-7 px-2.5 text-[12px] [&_svg]:size-3.5' : 'h-8 px-3 text-[13px] [&_svg]:size-4',
          checked
            ? 'bg-bg-surface text-text-primary shadow-[0_1px_2px_oklch(0_0_0/0.12),inset_0_0_0_1px_var(--color-border)]'
            : 'text-text-secondary hover:text-text-primary',
        )
      }
      renderItem={(item) => (
        <>
          {item.icon}
          {item.label}
        </>
      )}
    />
  )
}

const MODES: { id: Appearance; label: string; icon: ReactNode }[] = [
  { id: 'light', label: 'Light', icon: <Sun aria-hidden="true" /> },
  { id: 'dark', label: 'Dark', icon: <Moon aria-hidden="true" /> },
  { id: 'system', label: 'System', icon: <Monitor aria-hidden="true" /> },
]

/** Light / Dark / System — and a note when the current theme has one mode only. */
export function ModeControl({ size = 'md', showNote = true }: { size?: 'sm' | 'md'; showNote?: boolean }) {
  const { appearance, setAppearance, modeLocked, palette, mode } = useTheme()
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Segmented label="Appearance" items={MODES} value={appearance} onChange={(id) => setAppearance(id as Appearance)} size={size} />
      {showNote && modeLocked && (
        <p className="flex items-center gap-1.5 text-[11.5px] text-text-muted" role="status">
          <Lock className="size-3" aria-hidden="true" />
          {palette.name} is {mode}-only — your preference applies to other themes.
        </p>
      )}
    </div>
  )
}

/** Accent: the theme's own colour, or one of the overrides. */
export function AccentRow({ onPreview }: { onPreview?: (id: string | null) => void }) {
  const { look, setLook, mode, palette } = useTheme()
  const own = palette[mode] ?? palette.dark ?? palette.light
  const items = [
    { id: 'theme', label: `${palette.name} default`, color: own ? `oklch(${own.accent})` : 'var(--color-accent-brand)' },
    ...ACCENTS.map((a) => ({ id: a.id, label: a.label, color: `oklch(${a[mode].accent})` })),
  ]
  return (
    <RadioGroup
      label="Accent colour"
      items={items}
      value={look.accent}
      onChange={(id) => setLook({ accent: id })}
      onPreview={onPreview}
      orientation="horizontal"
      className="flex flex-wrap items-center gap-2"
      itemLabel={(i) => i.label}
      itemClassName={(item, checked) =>
        cn(
          'group relative flex size-8 items-center justify-center rounded-full transition-transform duration-200',
          checked ? 'ring-2 ring-text-primary ring-offset-2 ring-offset-bg-app' : 'hover:-translate-y-0.5',
          item.id === 'theme' && 'mr-1',
        )
      }
      renderItem={(item) => (
        <span
          className="size-full rounded-full shadow-[inset_0_0_0_1px_oklch(0_0_0/0.15),inset_0_1px_0_oklch(1_0_0/0.25)]"
          style={{
            background:
              item.id === 'theme'
                ? `conic-gradient(from 200deg, ${item.color}, color-mix(in oklab, ${item.color} 40%, var(--color-bg-surface)), ${item.color})`
                : item.color,
          }}
          title={item.label}
        />
      )}
    />
  )
}
