/* Shapes of the Problem sets API (src/routes/problem-sets.js). */

export type SetKind = 'mine' | 'series' | 'company'
export type SetTab = 'public' | 'series' | 'company' | 'mine'

export interface SetCard {
  id: string
  title: string
  description: string
  kind: SetKind
  visibility: 'public' | 'private'
  owner: string | null
  company: string | null
  sourceUrl: string | null
  /** null for built-in sets (the CSES series, community company lists). */
  likes: number | null
  liked: boolean
  count: number
  solved: number
  builtIn?: boolean
  updatedAt?: string
}

export interface SetItem {
  position: number
  section: string
  note: string
  reports?: number
  problem?: { id: number; title: string; platform: string; rating: number | null; topics: string[] }
  /** A problem we don't have (famous series only): the original, by link. */
  link?: { title: string; url: string }
  status?: 'solved' | 'examples' | 'attempted' | 'unsolved'
}

export interface SetList {
  tab: SetTab
  sets: SetCard[]
  /** Companies from community reports (tab=company). */
  reported?: { company: string; count: number }[]
}

export interface SetDetail {
  set: SetCard
  items: SetItem[]
  canEdit: boolean
}

export const setPath = (id: string) => (id.startsWith('company:') ? `/problems/sets/company/${encodeURIComponent(id.slice(8))}` : `/problems/sets/${encodeURIComponent(id)}`)

/** One of your sets, for "Add to a set" (GET /api/problem-sets-for/:problemId). */
export interface SetForProblem {
  id: string
  title: string
  visibility: 'public' | 'private'
  /** This problem is already in it. */
  has: boolean
}

/** "Asked at" reports on one problem (GET /api/problems/:id/asked). */
export interface AskedReport {
  /** Companies at least `minReports` people named. */
  companies: { company: string; reports: number; year: number | null; shown: boolean }[]
  /** Companies named by fewer people: counted, not named. */
  waiting: number
  mine: { company: string; year: number | null }[]
  minReports: number
}
