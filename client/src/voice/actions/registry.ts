/*
  The Action Graph's store. Pages add actions while they are mounted (through
  useVoiceAction) and remove them when they unmount; the shell adds the
  site-wide ones. Later registrations of the same id win, so a page can
  override a global action while it is open.
*/
import type { VoiceAction } from './types'

type Listener = () => void

const stack = new Map<string, VoiceAction[]>()
const listeners = new Set<Listener>()
let snapshot: VoiceAction[] = []

function rebuild() {
  snapshot = [...stack.values()].map((list) => list[list.length - 1]).filter(Boolean)
  for (const l of listeners) l()
}

/** Add an action; returns a function that removes exactly this registration. */
export function registerAction(action: VoiceAction): () => void {
  const list = stack.get(action.id) ?? []
  list.push(action)
  stack.set(action.id, list)
  rebuild()
  return () => {
    const cur = stack.get(action.id)
    if (!cur) return
    const i = cur.lastIndexOf(action)
    if (i >= 0) cur.splice(i, 1)
    if (cur.length === 0) stack.delete(action.id)
    rebuild()
  }
}

/** Every action currently on offer (the latest registration per id). */
export function listActions(): VoiceAction[] {
  return snapshot.filter((a) => !a.when || a.when())
}

export function getAction(id: string): VoiceAction | undefined {
  return listActions().find((a) => a.id === id)
}

export function subscribeActions(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** The raw snapshot (stable between changes), for useSyncExternalStore. */
export function actionsSnapshot(): VoiceAction[] {
  return snapshot
}
