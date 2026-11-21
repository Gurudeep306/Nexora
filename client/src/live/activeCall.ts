/*
  A Live call that is still going while the person looks at another page.
  The room page hands its session over here when it unmounts mid-call, and
  takes it back when they return; OngoingCall shows it on every page.
*/
import { useSyncExternalStore } from 'react'
import type { LiveSession } from './session'

export interface ActiveCall {
  session: LiveSession
  code: string
  title: string
}

let active: ActiveCall | null = null
const listeners = new Set<() => void>()

export const getActiveCall = () => active
export function setActiveCall(next: ActiveCall | null) {
  active = next
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const useActiveCall = () => useSyncExternalStore(subscribe, getActiveCall, getActiveCall)
