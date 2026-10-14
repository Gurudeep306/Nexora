/*
  Deep links into the practice experience. The practice pages read these
  query parameters; keep them in one place so every insight page agrees.

    /gate/practice?exam=CSE,IT&subject=algo&topic=algo/dp   filtered practice bank
    /gate/practice?ids=<id>                                  one question
    /gate/tests?focus=mistakes|weak|unseen&subject=&topic=&count=&durationMin=&preset=
*/
import { GATE_ROUTES } from '@/gate/api'
import { bankExams, type GateExam } from './examStore'

function qs(params: Record<string, string | number | undefined | null>) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function practiceLink(o: { exam?: GateExam; subject?: string; topic?: string; year?: number; type?: string } = {}) {
  return (
    GATE_ROUTES.practice +
    qs({
      exam: o.exam ? bankExams(o.exam).join(',') : undefined,
      subject: o.subject,
      topic: o.subject && o.topic ? `${o.subject}/${o.topic}` : o.topic,
      year: o.year,
      type: o.type,
    })
  )
}

export function questionLink(id: string) {
  return GATE_ROUTES.practice + qs({ ids: id })
}

export type TestPreset = 'sectional' | 'random' | 'full'

export function testLink(
  o: {
    focus?: 'any' | 'unseen' | 'mistakes' | 'weak'
    preset?: TestPreset
    exam?: GateExam
    subject?: string
    topic?: string
    count?: number
    durationMin?: number
  } = {},
) {
  return (
    GATE_ROUTES.tests +
    qs({
      focus: o.focus,
      preset: o.preset,
      exam: o.exam,
      subject: o.subject,
      topic: o.subject && o.topic ? `${o.subject}/${o.topic}` : o.topic,
      count: o.count,
      durationMin: o.durationMin,
    })
  )
}
