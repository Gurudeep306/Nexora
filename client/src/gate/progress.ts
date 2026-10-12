import { useSyncExternalStore } from 'react'

/**
 * Per-question practice state for the GATE bank: the last check result and
 * bookmarks. It is a personal convenience, so it lives in this browser's
 * localStorage (every access guarded — storage can be blocked) and the page
 * works the same without it.
 */

export type Outcome = 'correct' | 'wrong' | 'revealed'

export interface QProgress {
  /** Result of the last "Check" (or "revealed" when the answer was shown). */
  outcome?: Outcome
  bookmarked?: boolean
  /** Epoch ms of the last change. */
  at?: number
}

const KEY = 'nexora:gate-progress:v1'
type Store = Record<string, QProgress>

let state: Store = read()
const listeners = new Set<() => void>()

function read(): Store {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return raw && typeof raw === 'object' ? (raw as Store) : {}
  } catch {
    return {}
  }
}

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage full or blocked: keep the in-memory copy */
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = read()
      l()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(l)
    window.removeEventListener('storage', onStorage)
  }
}

export function updateProgress(id: string, patch: Partial<QProgress>) {
  const prev = state[id] ?? {}
  // A correct check is never downgraded by a later "show answer".
  if (patch.outcome === 'revealed' && prev.outcome) delete patch.outcome
  state = { ...state, [id]: { ...prev, ...patch, at: Date.now() } }
  write()
}

export function toggleBookmark(id: string) {
  updateProgress(id, { bookmarked: !state[id]?.bookmarked })
}

/** The whole map (re-renders on any change). */
export function useGateProgress(): Store {
  return useSyncExternalStore(subscribe, () => state, () => state)
}

/** One question's state. */
export function useQuestionProgress(id: string): QProgress {
  return useSyncExternalStore(
    subscribe,
    () => state[id] ?? EMPTY,
    () => EMPTY,
  )
}

const EMPTY: QProgress = {}
