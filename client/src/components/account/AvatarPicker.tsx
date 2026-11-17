import { useRef, type KeyboardEvent } from 'react'
import { Check } from 'lucide-react'
import { AVATAR_SET, avatarSetUrl, type AvatarId } from '@/lib/avatar'
import { cn } from '@/lib/utils'

/**
 * Grid of the avatar set as a single radio group: Tab lands on the selected
 * avatar, arrow keys move (and select) across and between rows, Home/End jump
 * to the ends. Hover lifts the tile; the selected one gets an accent ring and a
 * check (no shadows or glows).
 */
export function AvatarPicker({
  value,
  onChange,
  className,
}: {
  value: AvatarId | null
  onChange: (id: AvatarId) => void
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const focusIndex = value ? AVATAR_SET.findIndex((a) => a.id === value) : 0

  const columns = () => {
    const top = refs.current[0]?.offsetTop
    const n = refs.current.findIndex((el) => el && el.offsetTop !== top)
    return n > 0 ? n : AVATAR_SET.length
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = AVATAR_SET.length - 1
    const step: Record<string, () => number> = {
      ArrowRight: () => (i === last ? 0 : i + 1),
      ArrowLeft: () => (i === 0 ? last : i - 1),
      ArrowDown: () => Math.min(last, i + columns()),
      ArrowUp: () => Math.max(0, i - columns()),
      Home: () => 0,
      End: () => last,
    }
    const next = step[e.key]?.()
    if (next === undefined) return
    e.preventDefault()
    refs.current[next]?.focus()
    onChange(AVATAR_SET[next].id)
  }

  return (
    <div role="radiogroup" aria-label="Choose your avatar" className={cn('grid max-w-2xl grid-cols-6 gap-2.5 sm:grid-cols-8 sm:gap-3', className)}>
      {AVATAR_SET.map((a, i) => {
        const selected = a.id === value
        return (
          <button
            key={a.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Avatar ${i + 1}`}
            tabIndex={i === Math.max(0, focusIndex) ? 0 : -1}
            onClick={() => onChange(a.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'group relative aspect-square cursor-pointer rounded-full outline-none',
              'transition-transform duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-95',
              'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-brand',
            )}
          >
            <img
              src={avatarSetUrl(a.id)}
              alt=""
              draggable={false}
              className={cn(
                'size-full rounded-full ring-offset-2 ring-offset-bg-surface transition-[box-shadow] duration-200',
                selected ? 'ring-2 ring-accent-brand' : 'ring-1 ring-border group-hover:ring-border-strong',
              )}
            />
            {selected && (
              <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-accent-brand text-on-accent-brand ring-2 ring-bg-surface">
                <Check className="size-3" strokeWidth={3} aria-hidden="true" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
