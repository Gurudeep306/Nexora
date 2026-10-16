/*
  Reader preferences, remembered per user on this device:
    cleanFont   body in Atkinson Hyperlegible instead of the handwriting face
    cleanLines  viz drawn with straight lines instead of the sketched look
    treeHidden  the reader's lesson tree collapsed, giving the lesson the width
*/
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useAuth } from '@/context/AuthContext'

export interface NotesPrefs {
  cleanFont: boolean
  cleanLines: boolean
  treeHidden: boolean
}
const DEFAULTS: NotesPrefs = { cleanFont: false, cleanLines: false, treeHidden: false }

/*
  The handwriting face for notes. One of 'shantell' | 'kalam' | 'patrick'
  (compare them at /gate/notes/_fonts). Changing this line changes it everywhere.
*/
export const NOTES_BODY_FONT: NotesFontId = 'shantell'

export type NotesFontId = 'shantell' | 'kalam' | 'patrick'
export const NOTES_FONTS: { id: NotesFontId; label: string; note: string }[] = [
  { id: 'shantell', label: 'Shantell Sans', note: 'Marker print with a variable "informal" axis, set part-way: lively, still very even.' },
  { id: 'kalam', label: 'Kalam', note: 'A quick, slanted pen hand with three real weights.' },
  { id: 'patrick', label: 'Patrick Hand', note: 'Upright, compact school print; one weight.' },
]

/* Fonts are self-hosted (fontsource, OFL) and fetched only when a notes page needs them. */
const FONT_LOADERS: Record<NotesFontId | 'clean', () => Promise<unknown>> = {
  shantell: () => import('@fontsource-variable/shantell-sans/infm.css'),
  kalam: () => Promise.all([import('@fontsource/kalam/400.css'), import('@fontsource/kalam/700.css')]),
  patrick: () => import('@fontsource/patrick-hand/400.css'),
  clean: () => import('@fontsource-variable/atkinson-hyperlegible-next'),
}
const loaded = new Map<string, Promise<unknown>>()
export function loadNotesFont(id: NotesFontId | 'clean') {
  let p = loaded.get(id)
  if (!p) {
    p = FONT_LOADERS[id]().catch(() => loaded.delete(id))
    loaded.set(id, p)
  }
  return p
}

let key = 'nexora:notes:prefs:guest'
let prefs: NotesPrefs = read()
const listeners = new Set<() => void>()

function read(): NotesPrefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(key) || '{}') as Partial<NotesPrefs>) }
  } catch {
    return { ...DEFAULTS }
  }
}

function useUserKey() {
  const username = useAuth().user?.username ?? 'guest'
  useEffect(() => {
    const next = `nexora:notes:prefs:${username}`
    if (next === key) return
    key = next
    prefs = read()
    listeners.forEach((l) => l())
  }, [username])
}

export function useNotesPrefs(): [NotesPrefs, (p: Partial<NotesPrefs>) => void] {
  useUserKey()
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => prefs,
    () => prefs,
  )
  const set = useCallback((p: Partial<NotesPrefs>) => {
    prefs = { ...prefs, ...p }
    try {
      localStorage.setItem(key, JSON.stringify(prefs))
    } catch {
      /* storage blocked */
    }
    listeners.forEach((l) => l())
  }, [])
  return [value, set]
}
