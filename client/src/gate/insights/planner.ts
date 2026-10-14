/*
  Study-plan generator (pure, client-side).

  Hours available (study days × hours/day) are split into a learning phase and
  a final revision + mocks phase. Learning hours go to subjects in proportion to

      exam weightage × weakness × priority

  and, within a subject, to topics by PYQ frequency × topic weakness. Topics
  are interleaved across subjects (so a week mixes 2–3 subjects) and poured
  into study days of `hoursPerDay`, then grouped into weeks.
*/
import type { StudyPlan, SubjectStat, TopicStat } from '@/gate/api'
import { addDays, dayKey, parseDay, pct } from './format'

export interface PlanSubject {
  id: string
  name: string
  topics: { id: string; name: string }[]
}

export interface PlanInput {
  plan: StudyPlan
  subjects: PlanSubject[]
  /** Subject id → relative exam weightage (marks per paper, or question share). */
  weight: Record<string, number>
  /** "subject/topic" → PYQ count. */
  topicCount: Record<string, number>
  bySubject: SubjectStat[]
  byTopic: TopicStat[]
  today?: Date
}

export type TaskKind = 'learn' | 'revise' | 'mock'

export interface PlanTask {
  kind: TaskKind
  subject?: string
  subjectName?: string
  topic?: string
  topicName?: string
  hours: number
  /** Suggested PYQs to solve. */
  questions: number
}

export interface PlanDay {
  date: string
  tasks: PlanTask[]
}

export interface PlanWeek {
  index: number
  start: string
  end: string
  phase: TaskKind
  days: PlanDay[]
  hours: number
  subjects: string[]
}

export interface GeneratedPlan {
  days: PlanDay[]
  weeks: PlanWeek[]
  totalHours: number
  studyDays: number
  subjectHours: { id: string; name: string; hours: number; share: number }[]
  /** No exam date: a 12-week rolling plan. */
  rolling: boolean
}

const PRIORITY_FACTOR = [0, 0.6, 1, 1.5]
const QUESTIONS_PER_HOUR = 6
const DEFAULT_WEEKS = 12

function weakness(attempted: number, accuracy: number | undefined): number {
  if (!attempted || attempted < 4) return 1.15 // unknown: treat as moderately weak
  return 0.6 + (1 - pct(accuracy) / 100)
}

const round = (h: number) => Math.round(h * 4) / 4

export function generatePlan(input: PlanInput): GeneratedPlan {
  const { plan, subjects } = input
  const today = input.today ?? new Date()
  const start = parseDay(dayKey(today))
  const exam = plan.examDate ? parseDay(plan.examDate) : null
  const rolling = !exam || Number.isNaN(exam.getTime()) || exam <= start
  const end = rolling ? addDays(start, DEFAULT_WEEKS * 7) : exam!
  const hoursPerDay = Math.max(0.5, Math.min(16, plan.hoursPerDay || 0))
  const available = new Set(plan.days.length ? plan.days : [0, 1, 2, 3, 4, 5, 6])

  const studyDates: string[] = []
  for (let d = new Date(start); d < end && studyDates.length < 730; d = addDays(d, 1)) {
    if (available.has(d.getDay())) studyDates.push(dayKey(d))
  }
  const totalHours = studyDates.length * hoursPerDay

  // Revision + mocks: the last 15% of days (at least 1 week's worth, at most 4).
  const perWeek = Math.max(1, available.size)
  const reviseDays = studyDates.length < perWeek * 2 ? 0 : Math.min(perWeek * 4, Math.max(perWeek, Math.round(studyDates.length * 0.15)))
  const learnDates = studyDates.slice(0, studyDates.length - reviseDays)
  const reviseDates = studyDates.slice(studyDates.length - reviseDays)
  const learnHours = learnDates.length * hoursPerDay

  const sStat = new Map(input.bySubject.map((s) => [s.subject, s]))
  const tStat = new Map(input.byTopic.map((t) => [`${t.subject}/${t.topic}`, t]))

  // Subject scores.
  const active = subjects.filter((s) => (plan.priorities[s.id] ?? 2) > 0)
  const totalWeight = active.reduce((a, s) => a + (input.weight[s.id] ?? 0), 0) || active.length || 1
  const scored = active.map((s) => {
    const w = (input.weight[s.id] ?? totalWeight / Math.max(1, active.length)) / totalWeight
    const st = sStat.get(s.id)
    const score = Math.max(0.02, w) * weakness(st?.attempted ?? 0, st?.accuracy) * PRIORITY_FACTOR[plan.priorities[s.id] ?? 2]!
    return { s, score }
  })
  const scoreSum = scored.reduce((a, x) => a + x.score, 0) || 1

  // Topic chunks per subject, each topic ≥ 1h (when the budget allows).
  const queues = scored
    .map(({ s, score }) => {
      const hours = (learnHours * score) / scoreSum
      const tw = s.topics.map((t) => {
        const key = `${s.id}/${t.id}`
        const ts = tStat.get(key)
        return { t, w: Math.max(1, input.topicCount[key] ?? 1) * weakness(ts?.attempted ?? 0, ts?.accuracy) }
      })
      const twSum = tw.reduce((a, x) => a + x.w, 0) || 1
      const tasks: PlanTask[] = tw
        .map(({ t, w }) => ({
          kind: 'learn' as const,
          subject: s.id,
          subjectName: s.name,
          topic: t.id,
          topicName: t.name,
          hours: Math.max(hours > s.topics.length ? 1 : 0.25, round((hours * w) / twSum)),
          questions: 0,
        }))
        .sort((a, b) => b.hours - a.hours)
      return { s, score, hours, tasks }
    })
    .sort((a, b) => b.score - a.score)

  // Interleave topics across subjects, weighted: higher-score subjects come up more often.
  const order: PlanTask[] = []
  const credit = new Map(queues.map((q) => [q.s.id, 0]))
  let remaining = queues.reduce((a, q) => a + q.tasks.length, 0)
  while (remaining > 0) {
    let best: (typeof queues)[number] | undefined
    for (const q of queues) {
      if (!q.tasks.length) continue
      credit.set(q.s.id, credit.get(q.s.id)! + q.score)
      if (!best || credit.get(q.s.id)! > credit.get(best.s.id)!) best = q
    }
    if (!best) break
    credit.set(best.s.id, credit.get(best.s.id)! - scoreSum)
    order.push(best.tasks.shift()!)
    remaining--
  }

  // Pour into days; scale to fit the learning budget exactly.
  const plannedHours = order.reduce((a, t) => a + t.hours, 0) || 1
  const scale = learnHours > 0 ? learnHours / plannedHours : 0
  const days: PlanDay[] = learnDates.map((date) => ({ date, tasks: [] }))
  let di = 0
  let left = hoursPerDay
  for (const task of order) {
    let h = task.hours * scale
    while (h > 0.01 && di < days.length) {
      const take = Math.min(h, left)
      const day = days[di]!
      const last = day.tasks[day.tasks.length - 1]
      if (last && last.topic === task.topic && last.subject === task.subject) last.hours += take
      else day.tasks.push({ ...task, hours: take })
      h -= take
      left -= take
      if (left <= 0.01) {
        di++
        left = hoursPerDay
      }
    }
  }

  // Revision phase: mocks every other day, weakest topics in between.
  const weakest = [...input.byTopic]
    .filter((t) => t.attempted >= 3)
    .sort((a, b) => pct(a.accuracy) - pct(b.accuracy))
    .slice(0, 12)
  const nameOf = new Map(subjects.map((s) => [s.id, s]))
  reviseDates.forEach((date, i) => {
    const tasks: PlanTask[] = []
    if (i % 2 === 0 && hoursPerDay >= 3) {
      tasks.push({ kind: 'mock', hours: 3, questions: 65 })
      if (hoursPerDay > 3) tasks.push({ kind: 'revise', hours: hoursPerDay - 3, questions: 0 })
    } else {
      const t = weakest[i % Math.max(1, weakest.length)]
      const s = t ? nameOf.get(t.subject) : undefined
      tasks.push({
        kind: 'revise',
        subject: t?.subject,
        subjectName: s?.name,
        topic: t?.topic,
        topicName: s?.topics.find((x) => x.id === t?.topic)?.name,
        hours: hoursPerDay,
        questions: 0,
      })
    }
    days.push({ date, tasks })
  })

  for (const d of days)
    for (const t of d.tasks) {
      t.hours = round(t.hours)
      if (t.kind !== 'mock') t.questions = Math.max(2, Math.round(t.hours * QUESTIONS_PER_HOUR))
    }
  for (const d of days) d.tasks = d.tasks.filter((t) => t.hours > 0)

  // Weeks (Mon-start buckets).
  const weeks: PlanWeek[] = []
  for (const d of days) {
    const date = parseDay(d.date)
    const monday = addDays(date, -((date.getDay() + 6) % 7))
    const key = dayKey(monday)
    let w = weeks[weeks.length - 1]
    if (!w || w.start !== key) {
      w = { index: weeks.length + 1, start: key, end: dayKey(addDays(monday, 6)), phase: 'learn', days: [], hours: 0, subjects: [] }
      weeks.push(w)
    }
    w.days.push(d)
    for (const t of d.tasks) {
      w.hours += t.hours
      if (t.subjectName && !w.subjects.includes(t.subjectName)) w.subjects.push(t.subjectName)
    }
  }
  for (const w of weeks) {
    const kinds = w.days.flatMap((d) => d.tasks.map((t) => t.kind))
    w.phase = kinds.includes('mock') ? 'mock' : kinds.every((k) => k === 'revise') && kinds.length ? 'revise' : 'learn'
    w.hours = round(w.hours)
  }

  const subjectHours = queues
    .map((q) => ({ id: q.s.id, name: q.s.name, hours: round(q.hours), share: q.score / scoreSum }))
    .sort((a, b) => b.hours - a.hours)

  return { days, weeks, totalHours: round(totalHours), studyDays: studyDates.length, subjectHours, rolling }
}
