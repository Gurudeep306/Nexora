import { cloneElement, isValidElement, useId, forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const inputBase =
  'input-base w-full'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(inputBase, className)} {...props} />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(inputBase, 'min-h-[100px] resize-y', className)} {...props} />
  ),
)
Textarea.displayName = 'Textarea'

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Wrap-only styling (width/layout). The field itself takes `className`. */
  containerClassName?: string
  /** When provided, a clear (×) button appears while there is text. */
  onClear?: () => void
}

/* A themed search field: leading icon that lights up on focus, an optional
   clear button, and the OS's own search "×" suppressed so the look is
   consistent everywhere. Drop-in for `<Input type="search">`. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, containerClassName, onClear, value, ...props }, ref) => {
    const hasValue = value != null && String(value).length > 0
    return (
      <div className={cn('group/search relative flex items-center', containerClassName)}>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 size-4 text-foreground-faint transition-colors duration-200 group-focus-within/search:text-primary-bright"
        />
        <input
          ref={ref}
          type="search"
          value={value}
          className={cn(inputBase, 'w-full pl-9', hasValue && onClear && 'pr-9', className)}
          {...props}
        />
        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-2 flex size-6 cursor-pointer items-center justify-center rounded-md text-foreground-faint transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    )
  },
)
SearchInput.displayName = 'SearchInput'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-2 block text-sm font-medium text-text-primary', className)}
      {...props}
    />
  )
}

export function Field({ label, error, hint, children }: { label?: string; error?: string; hint?: string; children: React.ReactNode }) {
  const generatedId = useId()
  const control = isValidElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>(children) ? children : null
  const id = control?.props.id ?? generatedId
  const descriptionId = `${id}-description`
  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}
      {control ? cloneElement(control, {
        id,
        'aria-describedby': [control.props['aria-describedby'], error || hint ? descriptionId : null].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : undefined,
      }) : children}
      {error ? (
        <p id={descriptionId} role="alert" className="mt-1 block text-sm text-state-error">{error}</p>
      ) : hint ? (
        <p id={descriptionId} className="mt-1 block text-sm text-text-muted">{hint}</p>
      ) : null}
    </div>
  )
}