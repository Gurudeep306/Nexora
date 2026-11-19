/*
 * Home ("Today"): the facts the page is built from, worked out from real data
 * only. Every sentence on the page comes from one of these.
 */
import type { StatsResponse } from '@/components/hub/types'
import type { WebCluster, WebNode } from '@/components/nexus/types'
import { progressOf } from '@/components/nexus/SubjectsHub'
import { subjectHref } from '@/components/nexus/course'
import { DSA_TOPICS } from '@/learn/content/dsa/syllabus'
import { isDone, type ItemState } from '@/learn/progress'

const DAY = 86_400_000

/** Local calendar day, YYYY-MM-DD. */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function greeting(now = new Date()): string {
  const h = now.getHours()
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/** The next skill to study in a subject: unlocked, not mastered, earliest zone first. */
export function nextNode(c: WebCluster): WebNode | null {
  const open = c.nodes.filter((n) => n.s === 1).sort((a, b) => a.z - b.z || b.p - a.p)
  return open[0] ?? null
}

/** Days since anything in the subject was studied (Infinity: never). */
export function lastStudied(c: WebCluster): number {
  let best = Infinity
  for (const n of c.nodes) if (typeof n.td === 'number' && n.td >= 0) best = Math.min(best, n.td)
  return best
}

/** Which landing figure fits a subject best (all three are real lessons). */
export type Figure = 'search' | 'schedule' | 'graph' | 'none'
export function figureFor(subject: { id: string; name: string; domain?: string }): Figure {
  const s = `${subject.id} ${subject.name} ${subject.domain ?? ''}`.toLowerCase()
  if (/operating|\bos\b|process|schedul/.test(s)) return 'schedule'
  if (/graph|network|topolog|route/.test(s)) return 'graph'
  if (/algorithm|data struct|\bdsa\b|search|sort/.test(s)) return 'search'
  // No real lesson figure for this subject: show none rather than a wrong one.
  return 'none'
}

export interface Continue {
  /** Subject name, e.g. "Data Structures & Algorithms". */
  subject: string
  /** What comes next: a chapter or a skill. */
  title: string
  to: string
  figure: Figure
  /** DSA: pages read in the chapter and its size. */
  page?: { read: number; of: number }
  /** Other subjects: mastery 0–100. */
  pct?: number
}

/**
 * The thing in progress: the DSA chapter with the most recent page read, or
 * the Nexus subject studied most recently, whichever was touched last.
 */
export function findContinue(items: Record<string, ItemState>, clusters: WebCluster[] | null, now = Date.now()): Continue | null {
  // DSA: newest page read.
  let dsa: { topic: string; at: number } | null = null
  for (const [k, v] of Object.entries(items)) {
    if (!k.startsWith('page:') || !isDone(v)) continue
    const at = Date.parse(v.doneAt ?? v.updatedAt ?? '') || 0
    const topic = k.slice(5).split('/')[0]
    if (!dsa || at > dsa.at) dsa = { topic, at }
  }
  let dsaPick: (Continue & { days: number }) | null = null
  if (dsa) {
    const t = DSA_TOPICS.find((x) => x.id === dsa.topic)
    const of = t?.pages ?? 0
    const read = Object.keys(items).filter((k) => k.startsWith(`page:${dsa!.topic}/`) && isDone(items[k])).length
    if (t && of > 0 && read < of) {
      dsaPick = { subject: 'Data Structures & Algorithms', title: t.title, to: `/learn/dsa/${t.id}`, figure: 'search', page: { read, of }, days: dsa.at ? (now - dsa.at) / DAY : Infinity }
    } else if (t) {
      // Chapter finished: the next ready chapter in course order.
      const i = DSA_TOPICS.findIndex((x) => x.id === t.id)
      const nx = DSA_TOPICS.slice(i + 1).find((x) => x.load && x.pages)
      if (nx) dsaPick = { subject: 'Data Structures & Algorithms', title: nx.title, to: `/learn/dsa/${nx.id}`, figure: 'search', page: { read: 0, of: nx.pages ?? 0 }, days: dsa.at ? (now - dsa.at) / DAY : Infinity }
    }
  }
  // Nexus: the subject studied most recently that still has a next skill.
  let nexusPick: (Continue & { days: number }) | null = null
  for (const c of clusters ?? []) {
    if (c.engine === 'dsa') continue
    const days = lastStudied(c)
    if (days === Infinity && progressOf(c) === 0) continue
    const nx = nextNode(c)
    if (!nx) continue
    if (!nexusPick || days < nexusPick.days) {
      // A skill with written notes opens them in the full reader.
      const lesson = c.gate?.notes && nx.ls?.length ? `/gate/notes/${c.gate.notes}/${nx.ls[0]}` : null
      nexusPick = { subject: c.name, title: nx.n, to: lesson ?? subjectHref(c, nx.id), figure: figureFor(c), pct: progressOf(c), days }
    }
  }
  const pick = !dsaPick ? nexusPick : !nexusPick ? dsaPick : dsaPick.days <= nexusPick.days ? dsaPick : nexusPick
  if (!pick) return null
  const { days: _days, ...rest } = pick
  void _days
  return rest
}

/**
 * Everything else in progress besides `cont`: partly read DSA chapters and
 * subjects with some mastery, most recently touched first. Lets Home show all
 * the courses someone is on, not only the latest one.
 */
export function alsoInProgress(items: Record<string, ItemState>, clusters: WebCluster[] | null, cont: Continue | null, now = Date.now()): (Continue & { days: number })[] {
  const out: (Continue & { days: number })[] = []
  for (const t of DSA_TOPICS) {
    if (!t.load || !t.pages) continue
    const keys = Object.keys(items).filter((k) => k.startsWith(`page:${t.id}/`) && isDone(items[k]))
    if (!keys.length || keys.length >= t.pages) continue
    const at = Math.max(...keys.map((k) => Date.parse(items[k].doneAt ?? items[k].updatedAt ?? '') || 0))
    out.push({ subject: 'Data Structures & Algorithms', title: t.title, to: `/learn/dsa/${t.id}`, figure: 'search', page: { read: keys.length, of: t.pages }, days: at ? (now - at) / DAY : Infinity })
  }
  for (const c of clusters ?? []) {
    if (c.engine === 'dsa' || progressOf(c) === 0) continue
    const nx = nextNode(c)
    if (!nx) continue
    const lesson = c.gate?.notes && nx.ls?.length ? `/gate/notes/${c.gate.notes}/${nx.ls[0]}` : null
    out.push({ subject: c.name, title: nx.n, to: lesson ?? subjectHref(c, nx.id), figure: figureFor(c), pct: progressOf(c), days: lastStudied(c) })
  }
  return out.filter((x) => x.to !== cont?.to && !(cont && x.subject === cont.subject && x.subject !== 'Data Structures & Algorithms')).sort((a, b) => a.days - b.days)
}

/** The first three ready DSA chapters: the "Start here" path. */
export function startHere() {
  return DSA_TOPICS.filter((t) => t.load).slice(0, 3).map((t) => ({ title: t.title, blurb: t.blurb, to: `/learn/dsa/${t.id}`, pages: t.pages ?? 0 }))
}

export interface Step {
  /** One sentence naming the step, from real data. */
  line: string
  /** The button's words. */
  cta: string
  to: string
}

/** The best next step first, then the runner-up. */
export function nextSteps(o: { cont: Continue | null; stats: StatsResponse | null; reviewDue: number; gateDaily: { solvedToday?: boolean } | null }): Step[] {
  const out: Step[] = []
  const { cont, stats, reviewDue, gateDaily } = o
  if (cont?.page) {
    const left = cont.page.of - cont.page.read
    out.push({
      line: cont.page.read === 0 ? `${cont.title} is next: ${cont.page.of} pages, every idea animated.` : left === 1 ? `You're one page from finishing ${cont.title}.` : `You're ${left} pages from finishing ${cont.title}.`,
      cta: cont.page.read === 0 ? `Start ${cont.title}` : `Continue ${cont.title}`,
      to: cont.to,
    })
  } else if (cont) {
    out.push({ line: `Next in ${cont.subject}: ${cont.title}.`, cta: 'Continue learning', to: cont.to })
  }
  const challenge = stats?.dailyChallenges?.find((c) => !c.completed)
  if (challenge) out.push({ line: `Today's challenge is ${challenge.title}.`, cta: 'Solve the challenge', to: `/solve/${challenge.problem_rowid}` })
  if (reviewDue > 0) out.push({ line: `${reviewDue} GATE ${reviewDue === 1 ? 'card is' : 'cards are'} due for review.`, cta: 'Review now', to: '/gate/review' })
  if (gateDaily && gateDaily.solvedToday === false) out.push({ line: 'The GATE question of the day is waiting.', cta: 'Answer it', to: '/gate/daily' })
  if (!out.length) {
    const first = startHere()[0]
    if (first) out.push({ line: `Begin with ${first.title}: ${first.pages} pages, every idea animated.`, cta: `Start ${first.title}`, to: first.to })
  }
  // Always offer a second way in.
  if (out.length < 2) {
    const first = startHere()[0]
    if (!cont && first && !out.some((x) => x.to === first.to)) out.push({ line: `Begin with ${first.title}.`, cta: `Start ${first.title}`, to: first.to })
    else out.push({ line: 'Pick a problem and let the judge check it.', cta: 'Solve a problem', to: '/problems' })
  }
  return out
}

/** Time until the next UTC midnight, when the daily challenge and question change. */
export function resetsIn(now = Date.now()): string {
  const next = Math.ceil(now / DAY) * DAY
  const m = Math.max(0, Math.round((next - now) / 60000))
  const h = Math.floor(m / 60)
  return h ? `${h} h ${String(m % 60).padStart(2, '0')} m` : `${m} m`
}

/** "2 d 4 h", "5 h 10 m", "12 m". */
export function until(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60000))
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  if (d) return `${d} d ${h} h`
  if (h) return `${h} h ${m % 60} m`
  return `${m} m`
}

export interface DayPoint {
  date: string
  solved: number
  xp: number
  lessons: number
}

/**
 * The last `n` days, oldest first: problems solved and XP (from the stats
 * heatmap) and pages read (from learn progress).
 */
export function lastDays(n: number, stats: StatsResponse | null, items: Record<string, ItemState>, now = new Date()): DayPoint[] {
  const heat = new Map((stats?.heatmap ?? []).map((h) => [h.date, h]))
  const pages = new Map<string, number>()
  for (const [k, v] of Object.entries(items)) {
    if (!k.startsWith('page:') || !isDone(v) || !v.doneAt) continue
    const d = ymd(new Date(v.doneAt))
    pages.set(d, (pages.get(d) ?? 0) + 1)
  }
  const out: DayPoint[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = ymd(d)
    const h = heat.get(key)
    out.push({ date: key, solved: h?.problems_solved ?? 0, xp: h?.xp_earned ?? 0, lessons: pages.get(key) ?? 0 })
  }
  return out
}

/** Monday to Sunday of the current week. */
export function thisWeek(stats: StatsResponse | null, items: Record<string, ItemState>, now = new Date()): (DayPoint & { label: string; today: boolean; future: boolean })[] {
  const dow = (now.getDay() + 6) % 7 // Monday = 0
  const days = lastDays(dow + 1, stats, items, now)
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const out = days.map((d, i) => ({ ...d, label: labels[i], today: i === dow, future: false }))
  for (let i = dow + 1; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + (i - dow))
    out.push({ date: ymd(d), solved: 0, xp: 0, lessons: 0, label: labels[i], today: false, future: true })
  }
  return out
}

/** One sentence about the week so far. */
export function weekSentence(week: { solved: number; lessons: number; future: boolean }[]): string {
  const past = week.filter((d) => !d.future)
  const solved = past.reduce((a, d) => a + d.solved, 0)
  const lessons = past.reduce((a, d) => a + d.lessons, 0)
  const active = past.filter((d) => d.solved || d.lessons).length
  if (!solved && !lessons) return 'A quiet week so far. One problem or one page today gets it going.'
  const parts = [solved && `${solved} ${solved === 1 ? 'problem' : 'problems'} solved`, lessons && `${lessons} ${lessons === 1 ? 'page' : 'pages'} read`].filter(Boolean)
  return `This week: ${parts.join(' and ')}, across ${active} ${active === 1 ? 'day' : 'days'}.`
}

/** A verdict as a word and its meaning colour. */
export function verdictWord(v: string): { word: string; tone: 'success' | 'error' | 'warning' | 'muted' } {
  const s = v.toLowerCase()
  if (s === 'ac' || s.includes('accept') || s === 'ok') return { word: 'Accepted', tone: 'success' }
  if (s.includes('wrong') || s === 'wa') return { word: 'Wrong answer', tone: 'error' }
  if (s.includes('time') || s === 'tle') return { word: 'Time limit', tone: 'warning' }
  if (s.includes('memory') || s === 'mle') return { word: 'Memory limit', tone: 'warning' }
  if (s.includes('runtime') || s === 're') return { word: 'Runtime error', tone: 'error' }
  if (s.includes('compil') || s === 'ce') return { word: 'Compile error', tone: 'error' }
  return { word: v || 'Submitted', tone: 'muted' }
}

/** "two-pointers" → "Two pointers". */
export function humanize(slug: string): string {
  const s = slug.replace(/[-_]+/g, ' ').trim()
  return s ? s[0].toUpperCase() + s.slice(1) : slug
}
