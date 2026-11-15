/*
 * Back navigation that always goes somewhere sensible, and says where.
 *
 * The site keeps its own trail of pages visited in this tab (sessionStorage,
 * so a reload keeps it). Back then means:
 *   1. the page you actually came from, when there is one in this tab
 *      (browser back, so scroll position and state come back too), or
 *   2. one level up the site's hierarchy (a paper → the paper list, a post →
 *      Community, a lesson → its course), when you arrived from outside.
 * The button's label names the destination ("Back to Problems"), so it never
 * claims one place and goes to another.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { navMeta } from '@/config/nav'

const KEY = 'nexora:trail'
const MAX = 60

let trail: string[] = (() => {
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) || '[]')
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string').slice(-MAX) : []
  } catch {
    return []
  }
})()
const listeners = new Set<() => void>()
function commit(next: string[]) {
  trail = next.slice(-MAX)
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trail))
  } catch {
    /* in-memory trail still works */
  }
  listeners.forEach((l) => l())
}

/** Record a navigation (called once, from the app shell). */
export function recordVisit(path: string, kind: 'PUSH' | 'POP' | 'REPLACE') {
  const last = trail[trail.length - 1]
  if (last === path) return
  if (kind === 'REPLACE') return commit([...trail.slice(0, -1), path])
  if (kind === 'POP' && trail[trail.length - 2] === path) return commit(trail.slice(0, -1))
  commit([...trail, path])
}

/** Paths that look like parents but aren't pages of their own. */
const UP: Record<string, string> = {
  '/solve': '/problems',
  '/solve/learn': '/learn/dsa',
  '/solve/custom': '/workshop',
  '/gate/subjects': '/gate',
  '/gate/notes/_fonts': '/gate/notes',
  '/learn/dsa/skill': '/learn/dsa',
  '/social/post': '/social',
  '/social/tag': '/social',
  '/profile': '/social',
  '/u': '/social',
}

/** One level up the site's hierarchy, or null at the top (Home). */
export function parentOf(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, '') || '/'
  if (p === '/hub' || p === '/') return null
  const up = p.slice(0, p.lastIndexOf('/')) || '/'
  if (UP[up]) return UP[up]
  if (up === '/') return '/hub'
  return up
}

const NAMES: Record<string, string> = {
  '/hub': 'Home',
  '/gate': 'GATE',
  '/gate/cbt': 'paper list',
  '/gate/notes': 'notes',
  '/gate/tests': 'tests',
  '/gate/practice': 'practice',
  '/learn': 'Learn',
  '/learn/dsa': 'the DSA course',
  '/social': 'Community',
  '/problems': 'Problems',
  '/workshop': 'Workshop',
  '/contests': 'Contests',
}

/** A short, human name for a page ("Problems", "the DSA course"). */
export function placeName(path: string): string {
  const p = path.split('?')[0]
  if (NAMES[p]) return NAMES[p]
  if (/^\/(profile|u)\/[^/]+$/.test(p)) return `@${decodeURIComponent(p.split('/')[2])}`
  if (p.startsWith('/solve/')) return 'the problem'
  if (/^\/learn\/dsa\/[^/]+/.test(p)) return 'the lesson'
  if (/^\/gate\/notes\/[^/]+/.test(p)) return 'the notes'
  const m = navMeta(p)
  return m.label && m.label !== 'NexoraGuru' ? m.label : 'the previous page'
}

/** Keep the trail in step with the router. Mount once, in the app shell. */
export function useTrailRecorder() {
  const { pathname } = useLocation()
  const kind = useNavigationType()
  useEffect(() => {
    recordVisit(pathname, kind)
  }, [pathname, kind])
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Where Back goes from here, its label, and the action. `target` is null at the top. */
export function useSmartBack() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const t = useSyncExternalStore(subscribe, () => trail)
  // The trail's last entry is normally this page (it's recorded after render), so the one before is where we came from.
  const prev = t[t.length - 1] === pathname ? t[t.length - 2] : t[t.length - 1]
  // Only trust history the router itself wrote (idx > 0): never leave the site.
  const canPop = !!prev && typeof window !== 'undefined' && typeof window.history.state?.idx === 'number' && window.history.state.idx > 0
  const target = canPop ? prev! : parentOf(pathname)
  const go = useCallback(() => {
    if (canPop) navigate(-1)
    else if (target) navigate(target)
  }, [canPop, navigate, target])
  return { target, label: target ? `Back to ${placeName(target)}` : 'Back', go }
}
