import type { GateQuestion } from '../types'

export type QuestionStatus = 'not-visited' | 'not-answered' | 'answered' | 'marked-for-review' | 'answered-marked'
export type CbtResponse = string | string[]

export interface CbtSection {
  id: string
  title: string
  count: number
  marks: number
}

export interface Saved {
  v: 1
  responses: Record<string, CbtResponse>
  statusMap: Record<string, QuestionStatus>
  timeRemaining: number
  timeSpent: Record<string, number>
  currentIndex: number
}

export function loadSaved(key: string): Saved | null {
  try {
    const s = JSON.parse(localStorage.getItem(key) ?? 'null')
    return s && s.v === 1 && s.timeRemaining > 0 ? (s as Saved) : null
  } catch {
    return null
  }
}
export function clearCbtSaved(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export const hasValue = (v: unknown) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)

export const formatHms = (secs: number) => {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Options as answered in the console (old True/False items have none). */
export function cbtOptions(q: GateQuestion) {
  if (q.options.length) return q.options
  if (q.type === 'TF')
    return [
      { l: 'True', t: 'True' },
      { l: 'False', t: 'False' },
    ]
  return []
}

export const STATUS_LABEL: Record<QuestionStatus, string> = {
  answered: 'Answered',
  'not-answered': 'Not answered',
  'not-visited': 'Not visited',
  'marked-for-review': 'Marked for review',
  'answered-marked': 'Answered & marked for review',
}

