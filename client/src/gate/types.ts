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
  f: string
  alt: string
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
    subject: Record<string, number>
    year: Record<string, number>
    type: Record<string, number>
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
