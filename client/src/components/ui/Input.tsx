import { cloneElement, isValidElement, useId, forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const fieldBase =
  'w-full rounded-lg border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-foreground-faint transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, 'h-10', className)} {...props} />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, 'min-h-20 py-2.5', className)} {...props} />
  ),
)
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(fieldBase, 'h-10 cursor-pointer appearance-none bg-surface-2 pr-8', className)} {...props}>
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-1.5 block text-xs font-semibold tracking-wider text-foreground-dim uppercase', className)}
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
        <p id={descriptionId} role="alert" className="mt-1.5 text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p id={descriptionId} className="mt-1.5 text-xs text-foreground-faint">{hint}</p>
      ) : null}
    </div>
  )
}
