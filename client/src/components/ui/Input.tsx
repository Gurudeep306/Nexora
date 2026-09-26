import { cloneElement, isValidElement, useId, forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react'
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

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        inputBase,
        'appearance-none pr-9',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

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