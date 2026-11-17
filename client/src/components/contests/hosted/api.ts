/** Hosted contests (src/routes/hosted-contests.js): shapes and small helpers. */

export type Kind = 'problem' | 'workshop' | 'gate' | 'question'
export type Phase = 'draft' | 'upcoming' | 'live' | 'ended'
export type PersonState = 'not_started' | 'running' | 'finished' | 'missed'
export type QType = 'MCQ' | 'MSQ' | 'NAT'

export interface Settings {
  mode: 'fixed' | 'window'
  endTime: string | null
  access: 'link' | 'password'
  standings: 'live' | 'after' | 'hidden'
  review: 'after_finish' | 'after_end'
  penaltyMins: number
  negativeMarking: boolean
}

export interface ContestSummary {
  id: number
  title: string
  code: string
  creator: string
  status: 'draft' | 'published'
  phase: Phase
  startTime: string
  durationMins: number
  closesAt: string
  settings: Settings
  description?: string
  hasPassword?: boolean
  maxParticipants?: number
  people?: number
  items?: number
  hostName?: string
  /** For contests you joined: where your own time stands. */
  mine?: PersonState
}

export interface OwnQuestion {
  type: QType
  text: string
  options: string[]
  answer: string | string[] | { min: number; max: number } | null
  marks: number
  negative: number
  figures: { url: string; alt: string }[]
  solution: string
}

export interface Item {
  idx: number
  kind: Kind
  ref: string
  marks: number
  title: string
  source: string
  rating?: number | null
  type?: QType | null
  link?: string | null
  missing?: boolean
  editable?: boolean
  question?: OwnQuestion
  problems?: string[]
}

export interface Window {
  from: number | null
  to: number | null
  state: PersonState
}

export interface ContestView {
  contest: ContestSummary
  host: boolean
  locked?: boolean
  me: (Window & { paperDone: boolean }) | null
  totalMarks: number
  itemCount: number
  items: Item[]
}

export interface Lobby {
  contest: ContestSummary
  host: boolean
  joined: boolean
  needsPassword: boolean
  itemCount: number
  totalMarks: number
  kinds: { coding: number; paper: number }
}

export interface Cell {
  idx: number
  kind: Kind
  marks?: number
  solved?: boolean
  tries?: number
  minutes?: number | null
  attempted?: boolean
  correct?: boolean
  timeMs?: number
}

export interface Row {
  rank: number
  username: string
  name: string
  marks: number
  penalty: number
  solved: number
  correct: number
  wrong: number
  skipped: number
  cells: Cell[]
  startedAt: number | null
  finishedAt: number | null
  timeUsedMs: number
  state: PersonState
}

export interface Standings {
  visible: boolean
  rows: Row[]
  items: { idx: number; kind: Kind; marks: number }[]
  paperMarksHidden: boolean
}

export interface PerItem {
  idx: number
  kind: Kind
  marks: number
  people: number
  tried: number
  right: number
  averageMarks: number
  averageTimeMs: number | null
  discrimination: number | null
  picks: Record<string, number>
}

export interface Analysis {
  contest: ContestSummary
  items: { idx: number; kind: Kind; title: string; source: string; type: QType | null; marks: number; answer?: OwnQuestion['answer'] }[]
  rows: Row[]
  totalMarks: number
  perItem: PerItem[]
  overTime: { binMs: number; bins: { from: number; right: number; wrong: number }[] }
  finishTimesMs: number[]
}

export const CODING: ReadonlySet<Kind> = new Set(['problem', 'workshop'])

export const KIND_LABEL: Record<Kind, string> = {
  problem: 'Coding',
  workshop: 'Coding',
  gate: 'GATE past paper',
  question: 'Your question',
}

export const TYPE_LABEL: Record<QType, string> = { MCQ: 'One answer', MSQ: 'One or more answers', NAT: 'A number' }

export const PHASE_LABEL: Record<Phase, string> = { draft: 'Draft', upcoming: 'Upcoming', live: 'Live now', ended: 'Ended' }

/** Where to solve a coding item inside a contest. */
export function solveLink(it: Pick<Item, 'kind' | 'ref'>, contestId: number): string {
  return it.kind === 'problem' ? `/solve/${it.ref}?contest=${contestId}` : `/solve/custom/${it.ref}?contest=${contestId}`
}

export const contestUrl = (code: string) => `/contests/c/${code}`

export function when(iso: string | number): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function duration(mins: number): string {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h >= 48 && !m && h % 24 === 0) return `${h / 24} days`
  return m ? `${h} h ${m} min` : `${h} h`
}

export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

export function minutes(ms: number | null | undefined): string {
  if (ms == null) return '—'
  const m = Math.round(ms / 60000)
  if (m < 1) return `${Math.max(1, Math.round(ms / 1000))} s`
  return duration(m)
}

/** The timing in words: "Sat 6 Dec, 10:00 · 2 h" or "Open Sat 6 Dec 10:00 to Sun 7 Dec 10:00 · 1 h each". */
export function timingLine(c: Pick<ContestSummary, 'startTime' | 'durationMins' | 'settings' | 'closesAt'>): string {
  if (c.settings.mode === 'window') return `Open ${when(c.startTime)} to ${when(c.closesAt)} · ${duration(c.durationMins)} each`
  return `${when(c.startTime)} · ${duration(c.durationMins)}`
}

/** "1 mark", "2 marks", "0.5 marks". */
export const marksOf = (n: number) => `${Math.round(n * 100) / 100} mark${n === 1 ? '' : 's'}`
