/** The GATE past-year bank, as the API serves it. */

export type QType = 'MCQ' | 'MSQ' | 'NAT' | 'FILL' | 'MATCH' | 'DESC' | 'TF'

export const TYPE_LABEL: Record<QType, string> = {
  MCQ: 'Multiple choice',
  MSQ: 'Multiple select',
  NAT: 'Numerical answer',
  FILL: 'Fill in the blank',
  MATCH: 'Match the pairs',
  DESC: 'Descriptive',
  TF: 'True / false',
}

export interface GateOption {
  l: string
  t: string
}

export interface GateFigure {
  /** The figure cropped from the official paper (PNG) — always present. */
  f: string
  alt: string
  /** A checked vector redraw; preferred over the PNG when present. */
  svg?: string
  /** An unverified template redraw (scripts/generate_all_gate_svgs.py). */
  draft?: string
}

export interface GateQuestion {
  id: string
  paper: string
  exam: 'CSE' | 'IT' | 'DA'
  year: number
  set: number | null
  section: string
  number: string
  marks: number | null
  type: QType
  text: string
  options: GateOption[]
  figures: GateFigure[]
  group: string | null
  subject: string
  topic: string
  tags: string[]
  answer: string | number | string[] | null
  answerSource: 'official' | 'solved' | null
  confidence: 'high' | 'medium' | 'low' | null
  solution: string
  textSource: 'pdf' | 'web'
  sourceUrl: string | null
  needsReview: boolean
  reviewNote: string | null
}

export interface GatePaper {
  id: string
  exam: 'CSE' | 'IT' | 'DA'
  year: number
  set: number | null
  count: number
  notes: string
}

export interface GateSubject {
  name: string
  topics: Record<string, string>
}

export interface GateMeta {
  ok: true
  generated: string
  total: number
  papers: GatePaper[]
  subjects: Record<'CSE' | 'DA', Record<string, GateSubject>>
  counts: {
    bySubject: Record<string, number>
    byYear: Record<string, number>
    byType: Record<string, number>
  }
}

export interface GateList {
  ok: true
  total: number
  offset: number
  limit: number
  facets: {
    exam?: Record<string, number>
    subject: Record<string, number>
    year: Record<string, number>
    type: Record<string, number>
    marks?: Record<string, number>
    hasFigure?: { yes: number; no: number }
    paper?: Record<string, number>
    topic?: Record<string, number>
  }
  questions: GateQuestion[]
}

export interface GateDetail {
  ok: true
  question: GateQuestion
  prev: GateQuestion | null
  next: GateQuestion | null
  group: GateQuestion[]
}

/** Paper label used everywhere: "GATE CSE 2014 Set 1". */
export function paperLabel(p: { exam: string; year: number; set: number | null }) {
  return `GATE ${p.exam} ${p.year}${p.set ? ` Set ${p.set}` : ''}`
}

/** Short type badge text: "MCQ", "NAT", ... */
export const TYPE_SHORT: Record<QType, string> = {
  MCQ: 'MCQ',
  MSQ: 'MSQ',
  NAT: 'NAT',
  FILL: 'Fill',
  MATCH: 'Match',
  DESC: 'Descriptive',
  TF: 'True/False',
}

/** "GA Q3" / "Q41" */
export function qLabel(q: { section: string; number: string }) {
  return `${q.section === 'ga' ? 'GA ' : ''}Q${q.number}`
}
