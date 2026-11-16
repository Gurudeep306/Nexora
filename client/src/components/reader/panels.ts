import { useCallback, useEffect, useSyncExternalStore } from 'react'

/*
 * The reader's two side panels — the lesson list on the left and "On this
 * page" on the right — fold to slim strips. One setting for every reader on
 * the site (GATE notes, DSA lessons), remembered on this device. Keyboard:
 * [ folds the left panel, ] the right one.
 */

export interface ReaderPanels {
  /** The lesson list is folded to a strip. */
  left: boolean
  /** "On this page" is folded to a strip. */
  right: boolean
}

const KEY = 'nexora:reader:panels'
const DEFAULTS: ReaderPanels = { left: false, right: false }

function read(): ReaderPanels {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<ReaderPanels> | null
    if (raw && typeof raw === 'object') return { left: raw.left === true, right: raw.right === true }
    // Before this setting, the DSA reader remembered a folded rail here.
    return { ...DEFAULTS, left: localStorage.getItem('nexora:reader-rail') === 'mini' }
  } catch {
    return { ...DEFAULTS }
  }
}

let state: ReaderPanels = typeof window === 'undefined' ? DEFAULTS : read()
const listeners = new Set<() => void>()

function set(patch: Partial<ReaderPanels>) {
  state = { ...state, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* the in-memory setting still applies */
  }
  listeners.forEach((l) => l())
}

export function useReaderPanels() {
  const panels = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
    () => DEFAULTS,
  )
  const toggleLeft = useCallback(() => set({ left: !state.left }), [])
  const toggleRight = useCallback(() => set({ right: !state.right }), [])

  // [ and ] fold the panels, unless you are typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      const t = e.target as HTMLElement | null
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return
      if (e.key === '[') {
        e.preventDefault()
        set({ left: !state.left })
      } else if (e.key === ']') {
        e.preventDefault()
        set({ right: !state.right })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return { ...panels, toggleLeft, toggleRight, setPanels: set }
}

/** Reading pages (a lesson open in the reader) use the whole window. */
export function isReaderRoute(pathname: string): boolean {
  return /^\/gate\/notes\/[^/]+\/[^/_][^/]*\/?$/.test(pathname) || (/^\/learn\/dsa\/[^/]+(\/[^/]+)?\/?$/.test(pathname) && !/\/(practice|skill)(\/|$)/.test(pathname))
}
