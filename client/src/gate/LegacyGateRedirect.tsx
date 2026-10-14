import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { GATE_ROUTES } from './api'

/** Practice-bank params that used to live on /gate (before /gate/practice). */
const PRACTICE_PARAMS = ['q', 'exam', 'paper', 'year', 'subject', 'topic', 'type', 'marks', 'section', 'hasFigure', 'saved', 'sort', 'view', 'page', 'i', 'ids', 'status']

/** Old /gate?paper=…&subject=… links open the practice bank with the same params. */
export function LegacyGateRedirect({ children }: { children: ReactNode }) {
  const { search, hash } = useLocation()
  const params = new URLSearchParams(search)
  if (PRACTICE_PARAMS.some((k) => params.has(k))) return <Navigate to={`${GATE_ROUTES.practice}${search}${hash}`} replace />
  return <>{children}</>
}
