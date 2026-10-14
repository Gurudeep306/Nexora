import { api, ApiError } from '@/lib/api'
import { gateApi, type GateTest, type Outcome, type SubjectStat, type TestConfig, type TestResult } from '../api'
import { checkIsCorrect, isSelfCheck } from '../answers'
import { getProgress, recordAttempt } from '../progress'
import type { GateList, GateQuestion } from '../types'

/*
 * Custom tests: the server (gateApi.createTest / test / submitTest / tests)
 * when it has the endpoints, otherwise built, graded and kept on this device
 * from the public question bank — so the whole flow works before the backend
 * lands and offline-ish.
 */

const LOCAL_KEY = 'nexora:gate-tests:v1'
export const isLocalTest = (id: string) => id.startsWith('local-')
const isMissing = (e: unknown) => e instanceof ApiError && (e.status === 404 || e.status === 405 || e.status === 501)

function readLocal(): GateTest[] {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
function writeLocal(list: GateTest[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 60)))
  } catch {
    /* storage full */
  }
}
function saveLocal(t: GateTest) {
  writeLocal([t, ...readLocal().filter((x) => x.id !== t.id)])
}

/* ── Questions ── */

/** Fetch questions by id, in the given order. */
export async function fetchQuestions(ids: string[]): Promise<GateQuestion[]> {
  const out = new Map<string, GateQuestion>()
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const r = await api.get<GateList>('/api/gate/questions', { query: { ids: chunk.join(','), limit: 100 } })
    for (const q of r.questions) out.set(q.id, q)
  }
  return ids.map((id) => out.get(id)).filter((q): q is GateQuestion => !!q)
}

/** A rough 1–5 difficulty when no community numbers exist. */
export function estimateDifficulty(q: GateQuestion): number {
  let d = 2.5
  if ((q.marks ?? 1) >= 2) d += 1
  if (q.type === 'MSQ') d += 0.75
  else if (q.type === 'NAT') d += 0.5
  if (q.section === 'ga') d -= 0.75
  const p = getProgress()[q.id]
  if (p?.attempts) d += p.correct / p.attempts < 0.5 ? 1 : -0.5
  return Math.min(5, Math.max(1, Math.round(d)))
}

function shuffle<T>(a: T[]): T[] {
  const x = [...a]
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[x[i], x[j]] = [x[j], x[i]]
  }
  return x
}

const GRADABLE = (q: GateQuestion) => q.answer != null && q.answer !== '' && !isSelfCheck(q)

/** Pick questions for a config from the bank (device fallback). */
async function pickLocal(config: TestConfig): Promise<GateQuestion[]> {
  const progress = getProgress()
  const base: Record<string, string | number> = {
    exam: config.exam ?? '',
    subject: (config.subjects ?? []).join(','),
    topic: (config.topics ?? []).join(','),
    year: (config.years ?? []).join(','),
    paper: (config.papers ?? []).join(','),
    type: (config.types?.length ? config.types : ['MCQ', 'MSQ', 'NAT']).join(','),
    answered: 'yes',
  }

  let pool: GateQuestion[] = []
  if (config.focus === 'mistakes') {
    const ids = Object.entries(progress)
      .filter(([, p]) => p.outcome === 'wrong' || p.outcome === 'revealed' || (p.attempts > 0 && p.correct < p.attempts))
      .map(([id]) => id)
      .slice(0, 400)
    if (!ids.length) return []
    for (let i = 0; i < ids.length; i += 100) {
      const r = await api.get<GateList>('/api/gate/questions', { query: { ...base, ids: ids.slice(i, i + 100).join(','), limit: 100 } })
      pool.push(...r.questions)
    }
  } else {
    let query = base
    if (config.focus === 'weak') {
      const topics = await weakTopicKeys()
      if (topics.length) query = { ...base, topic: topics.join(',') }
    }
    const first = await api.get<GateList>('/api/gate/questions', { query: { ...query, limit: 100, sort: 'year-desc' } })
    pool = [...first.questions]
    const total = first.total
    // Sample a few more random windows so tests aren't all from recent years.
    const windows = Math.min(3, Math.floor(total / 100))
    const offsets = new Set<number>()
    for (let i = 0; i < windows; i++) offsets.add(100 + Math.floor(Math.random() * Math.max(1, total - 200)))
    const more = await Promise.all([...offsets].map((offset) => api.get<GateList>('/api/gate/questions', { query: { ...query, limit: 100, offset, sort: 'year-desc' } })))
    for (const r of more) pool.push(...r.questions)
  }

  const seen = new Set<string>()
  pool = pool.filter((q) => (seen.has(q.id) ? false : (seen.add(q.id), true))).filter(GRADABLE)
  if (config.focus === 'unseen') {
    const fresh = pool.filter((q) => !progress[q.id]?.attempts)
    if (fresh.length >= Math.min(config.count, 5)) pool = fresh
  }
  if (config.difficulty) {
    const [lo, hi] = config.difficulty
    const inRange = pool.filter((q) => {
      const d = estimateDifficulty(q)
      return d >= lo && d <= hi
    })
    if (inRange.length) pool = inRange
  }
  let picked = shuffle(pool).slice(0, config.count)
  // A full-length paper keeps GATE's 10 aptitude + 55 core split when it can.
  if (config.count >= 50 && !config.subjects?.length && !config.topics?.length) {
    const ga = shuffle(pool.filter((q) => q.section === 'ga')).slice(0, 10)
    const core = shuffle(pool.filter((q) => q.section !== 'ga')).slice(0, config.count - ga.length)
    if (ga.length + core.length >= Math.min(config.count, pool.length)) picked = [...ga, ...core]
  }
  // GA first, then by subject — reads like a paper.
  return picked.sort((a, b) => (a.section === 'ga' ? 0 : 1) - (b.section === 'ga' ? 0 : 1) || a.subject.localeCompare(b.subject))
}

/** Topics with the lowest accuracy (summary when available, else this device). */
async function weakTopicKeys(): Promise<string[]> {
  try {
    const s = await gateApi.summary()
    const w = s.summary.weakTopics.slice(0, 4).map((t) => `${t.subject}/${t.topic}`)
    if (w.length) return w
  } catch {
    /* device fallback */
  }
  const progress = getProgress()
  const ids = Object.keys(progress).filter((id) => progress[id].attempts > 0).slice(0, 300)
  if (!ids.length) return []
  const qs = await fetchQuestions(ids)
  const by = new Map<string, { a: number; c: number }>()
  for (const q of qs) {
    const k = `${q.subject}/${q.topic}`
    const p = progress[q.id]
    const cur = by.get(k) ?? { a: 0, c: 0 }
    by.set(k, { a: cur.a + p.attempts, c: cur.c + p.correct })
  }
  return [...by.entries()]
    .filter(([, v]) => v.a >= 2)
    .sort((x, y) => x[1].c / x[1].a - y[1].c / y[1].a)
    .slice(0, 4)
    .map(([k]) => k)
}

/* ── API with fallback ── */

export async function createTest(config: TestConfig): Promise<GateTest> {
  try {
    const r = await gateApi.createTest(config)
    return r.test
  } catch (e) {
    if (!isMissing(e)) throw e
  }
  const qs = await pickLocal(config)
  if (!qs.length) throw new Error(config.focus === 'mistakes' ? 'No mistakes to retry yet — practise a few questions first.' : 'No questions match these settings. Widen the filters and try again.')
  const t: GateTest = {
    id: `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    title: config.title || 'Custom test',
    config: { ...config, count: qs.length },
    questionIds: qs.map((q) => q.id),
    createdAt: Date.now(),
  }
  saveLocal(t)
  return t
}

export async function loadTest(id: string): Promise<GateTest> {
  if (isLocalTest(id)) {
    const t = readLocal().find((x) => x.id === id)
    if (!t) throw new Error('This test was made on another device or has been cleared.')
    return t
  }
  return (await gateApi.test(id)).test
}

export async function listTests(): Promise<GateTest[]> {
  let server: GateTest[] = []
  try {
    server = (await gateApi.tests()).tests ?? []
  } catch {
    /* device only */
  }
  return [...server, ...readLocal()].sort((a, b) => (b.submittedAt ?? b.createdAt) - (a.submittedAt ?? a.createdAt))
}

export function deleteLocalTest(id: string) {
  writeLocal(readLocal().filter((x) => x.id !== id))
}

/** Marks for one response under GATE rules. */
export function gradeOne(q: GateQuestion, resp: string | string[] | undefined, negative: boolean): { outcome: Outcome; marks: number } {
  const m = q.marks ?? 1
  if (resp === undefined || resp === '' || (Array.isArray(resp) && resp.length === 0)) return { outcome: 'skipped', marks: 0 }
  if (checkIsCorrect(q, resp)) return { outcome: 'correct', marks: m }
  return { outcome: 'wrong', marks: negative && q.type === 'MCQ' ? -Math.round((m / 3) * 100) / 100 : 0 }
}

export function gradeLocal(test: GateTest, questions: GateQuestion[], responses: Record<string, string | string[]>, timeSec: Record<string, number>): TestResult {
  const negative = test.config.negativeMarking !== false
  const items = questions.map((q) => {
    const g = gradeOne(q, responses[q.id], negative)
    return { questionId: q.id, outcome: g.outcome, marks: g.marks, timeMs: (timeSec[q.id] ?? 0) * 1000 }
  })
  const bySub = new Map<string, SubjectStat>()
  questions.forEach((q, i) => {
    const it = items[i]
    const s = bySub.get(q.subject) ?? { subject: q.subject, attempted: 0, correct: 0, accuracy: 0, avgTimeMs: 0, marksGained: 0, marksLost: 0 }
    if (it.outcome !== 'skipped') s.attempted++
    if (it.outcome === 'correct') s.correct++
    if (it.marks > 0) s.marksGained += it.marks
    else s.marksLost += -it.marks
    s.avgTimeMs += it.timeMs
    bySub.set(q.subject, s)
  })
  const bySubject = [...bySub.values()].map((s) => {
    const n = questions.filter((q) => q.subject === s.subject).length
    return { ...s, accuracy: s.attempted ? s.correct / s.attempted : 0, avgTimeMs: n ? s.avgTimeMs / n : 0 }
  })
  const score = Math.round(items.reduce((a, b) => a + b.marks, 0) * 100) / 100
  return {
    score,
    maxScore: questions.reduce((a, q) => a + (q.marks ?? 1), 0),
    correct: items.filter((i) => i.outcome === 'correct').length,
    wrong: items.filter((i) => i.outcome === 'wrong').length,
    skipped: items.filter((i) => i.outcome === 'skipped').length,
    timeMs: items.reduce((a, b) => a + b.timeMs, 0),
    items,
    bySubject,
    percentile: null,
  }
}

/** Submit: the server grades and records; a device test is graded here and its attempts recorded. */
export async function submitTest(
  test: GateTest,
  questions: GateQuestion[],
  responses: Record<string, string | string[]>,
  timeSec: Record<string, number>,
): Promise<GateTest> {
  keepResponses(test.id, responses)
  if (!isLocalTest(test.id)) {
    const timeMs: Record<string, number> = {}
    for (const [k, v] of Object.entries(timeSec)) timeMs[k] = v * 1000
    const r = await gateApi.submitTest(test.id, responses, timeMs)
    return { ...test, submittedAt: Date.now(), result: r.result }
  }
  const result = gradeLocal(test, questions, responses, timeSec)
  for (const it of result.items) {
    if (it.outcome === 'skipped') continue
    recordAttempt({ questionId: it.questionId, response: responses[it.questionId] ?? null, timeMs: it.timeMs, mode: 'test', testId: test.id, outcome: it.outcome })
  }
  const done = { ...test, submittedAt: Date.now(), result }
  saveLocal(done)
  return done
}

const RESP_KEY = 'nexora:gate-test-responses:v1'
function keepResponses(id: string, r: Record<string, string | string[]>) {
  try {
    const all = JSON.parse(localStorage.getItem(RESP_KEY) ?? '{}') as Record<string, unknown>
    all[id] = r
    const keys = Object.keys(all)
    for (const k of keys.slice(0, Math.max(0, keys.length - 40))) delete all[k]
    localStorage.setItem(RESP_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

/** Your responses to a submitted test, as kept on this device (for the per-question review). */
export function savedResponses(id: string): Record<string, string | string[]> {
  try {
    const all = JSON.parse(localStorage.getItem(RESP_KEY) ?? '{}') as Record<string, Record<string, string | string[]>>
    return all[id] ?? {}
  } catch {
    return {}
  }
}

/* ── Presets ── */

export interface TestPreset {
  id: string
  title: string
  blurb: string
  icon: 'trophy' | 'layers' | 'timer' | 'refresh' | 'target'
  config: TestConfig
}

export const PRESETS: TestPreset[] = [
  { id: 'full', title: 'Full mock', blurb: '65 questions · 3 hours · GATE pattern', icon: 'trophy', config: { title: 'Full mock', exam: 'CSE', count: 65, durationMin: 180, negativeMarking: true, focus: 'any' } },
  { id: 'sectional', title: 'Sectional', blurb: '20 questions from one subject · 45 min', icon: 'layers', config: { title: 'Sectional test', exam: 'CSE', count: 20, durationMin: 45, negativeMarking: true, focus: 'any' } },
  { id: 'quick', title: '30-minute quick', blurb: '15 mixed questions · 30 min', icon: 'timer', config: { title: 'Quick 30', exam: 'CSE', count: 15, durationMin: 30, negativeMarking: true, focus: 'unseen' } },
  { id: 'mistakes', title: 'Mistakes', blurb: 'Questions you got wrong before', icon: 'refresh', config: { title: 'Mistakes retry', count: 20, durationMin: 40, negativeMarking: false, focus: 'mistakes' } },
  { id: 'weak', title: 'Weak topics', blurb: 'Your lowest-accuracy topics', icon: 'target', config: { title: 'Weak topics', exam: 'CSE', count: 20, durationMin: 40, negativeMarking: true, focus: 'weak' } },
]
