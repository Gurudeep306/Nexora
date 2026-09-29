import type { Role } from '../types'

export function roleClass(r?: Role) {
  return r ? `viz-role-${r}` : ''
}

export function fmt(v: unknown) {
  if (v === true) return 'T'
  if (v === false) return 'F'
  if (typeof v === 'number' && !Number.isInteger(v)) return v.toFixed(2)
  return String(v)
}
