import { useSyncExternalStore } from 'react'

/** What the user picked from search recently: a query, a page or a problem. */
export type RecentSearch =
  | { kind: 'query'; q: string }
  | { kind: 'page'; label: string; to: string; icon?: string }
  | { kind: 'problem'; label: string; to: string; hint?: string }

const KEY = 'nexora:recent-searches'
const MAX = 6
const EVENT = 'nexora:recent-searches'
const EMPTY: RecentSearch[] = []

let snapshot: RecentSearch[] | null = null

function read(): RecentSearch[] {
  if (snapshot) return snapshot
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    snapshot = Array.isArray(raw)
      ? (raw.filter((r) => r && typeof r === 'object' && typeof (r as { kind?: unknown }).kind === 'string') as RecentSearch[]).slice(0, MAX)
      : EMPTY
  } catch {
    snapshot = EMPTY
  }
  return snapshot
}

function write(list: RecentSearch[]) {
  snapshot = list
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage blocked: recents just won't persist */
  }
  window.dispatchEvent(new Event(EVENT))
}

const keyOf = (r: RecentSearch) => (r.kind === 'query' ? `q:${r.q.toLowerCase()}` : `${r.kind}:${r.to}`)

export function pushRecentSearch(entry: RecentSearch) {
  if (entry.kind === 'query' && entry.q.trim().length < 2) return
  const k = keyOf(entry)
  write([entry, ...read().filter((r) => keyOf(r) !== k)].slice(0, MAX))
}

export function clearRecentSearches() {
  write(EMPTY)
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = null
      cb()
    }
  }
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', onStorage)
  }
}

/** The recent searches, newest first (shared by the top bar and the palette). */
export function useRecentSearches(): RecentSearch[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}
