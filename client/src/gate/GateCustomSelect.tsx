import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  icon?: React.ReactNode
  badge?: string
}

interface GateCustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  label?: string
  placeholder?: string
  icon?: React.ReactNode
  className?: string
  align?: 'left' | 'right'
}

export function GateCustomSelect({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select option',
  icon,
  className,
  align = 'left',
}: GateCustomSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'group flex items-center gap-2 rounded-xl border border-border/80 bg-bg-surface-2/70 px-3.5 py-2 text-[13px] font-semibold text-text-primary shadow-sm backdrop-blur-md transition-all duration-200 hover:border-accent-brand/50 hover:bg-bg-surface-2 focus:outline-none focus:ring-2 focus:ring-accent-brand/30 cursor-pointer',
          open && 'border-accent-brand bg-accent-brand/10 ring-2 ring-accent-brand/20 shadow-md',
        )}
      >
        {icon && <span className="text-accent-brand shrink-0">{icon}</span>}
        {label && <span className="text-text-muted text-[12px] font-medium hidden sm:inline">{label}:</span>}
        
        <span className="truncate font-semibold text-text-primary">
          {selectedOption ? (
            <span className="flex items-center gap-1.5">
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span>{selectedOption.label}</span>
            </span>
          ) : (
            <span className="text-text-muted">{placeholder}</span>
          )}
        </span>

        {selectedOption?.badge && (
          <span className="rounded-md bg-accent-brand/15 px-1.5 py-0.5 text-[10px] font-mono text-accent-brand">
            {selectedOption.badge}
          </span>
        )}

        <ChevronDown
          className={cn(
            'size-3.5 text-text-muted transition-transform duration-200 shrink-0 ml-1 group-hover:text-text-primary',
            open && 'rotate-180 text-accent-brand',
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute z-50 mt-2 min-w-[210px] max-h-72 overflow-y-auto rounded-2xl border border-border/90 bg-bg-surface/95 p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-150',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left text-[12.5px] font-medium transition-all duration-150 cursor-pointer',
                  isSelected
                    ? 'bg-accent-brand text-white font-semibold shadow-sm'
                    : 'text-text-primary hover:bg-bg-surface-2 hover:text-accent-brand',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {option.icon && <span className="shrink-0">{option.icon}</span>}
                  <span className="truncate">{option.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {option.badge && (
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10.5px] font-mono',
                        isSelected ? 'bg-white/20 text-white' : 'bg-bg-surface-2 text-text-muted',
                      )}
                    >
                      {option.badge}
                    </span>
                  )}
                  {isSelected && <Check className="size-3.5 text-white" />}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
