import { useState, type InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui'

/**
 * A box for API keys and tokens that browsers and password managers leave
 * alone. A plain password field gets a saved site password filled in, which
 * then reaches the provider as a "key" and fails. Read-only until focused is
 * the one trick every browser respects; the data-* flags cover 1Password,
 * LastPass and Bitwarden.
 */
export function SecretInput({ onFocus, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'autoComplete'>) {
  const [armed, setArmed] = useState(false)
  return (
    <Input
      {...props}
      type="password"
      autoComplete="new-password"
      spellCheck={false}
      readOnly={!armed || props.readOnly}
      onFocus={(e) => {
        setArmed(true)
        onFocus?.(e)
      }}
      data-1p-ignore=""
      data-lpignore="true"
      data-bwignore=""
      data-form-type="other"
    />
  )
}
