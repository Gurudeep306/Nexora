/*
  Mirror Run, part 2: lay the student's run beside the lesson's run on the
  same input and find the first place they differ. Each shared variable is
  compared by the values it takes, in order (lo: 0 → 3 → 4), so writing two
  assignments on two lines instead of one doesn't count as a difference.

  Then one question about that step, built from the two runs' real values —
  no model. Pure and type-strippable (tests/voice-mirror.test.js).
*/
import type { Frame, Scalar } from '../../learn/engine/types'
import { valuesAt } from '../scene/resolve.ts'
import type { RunResult } from './pseudo.ts'

/** Names that mean the same thing in a student's words and in a lesson. */
const SAME: string[][] = [
  ['lo', 'low', 'l', 'left', 'start', 'beg', 'begin'],
  ['hi', 'high', 'h', 'r', 'right', 'end'],
  ['mid', 'm', 'middle'],
  ['i', 'idx', 'index'],
  ['answer', 'ans', 'res', 'result'],
  ['count', 'cnt', 'c'],
  ['sum', 's', 'total'],
  ['best', 'max', 'mx', 'maximum'],
]

/** The lesson's name for a student's variable, if the lesson has one. */
export function lessonName(student: string, lesson: Set<string>): string | null {
  if (lesson.has(student)) return student
  const g = SAME.find((group) => group.includes(student))
  return g?.find((n) => lesson.has(n)) ?? null
}

interface Point {
  v: number | boolean | null
  /** Student: index into changes. Lesson: frame index. */
  at: number
}

const isName = (k: string) => /^[A-Za-z_]\w*$/.test(k)
const comparable = (v: Scalar | undefined): v is number | boolean | null => v === null || typeof v === 'number' || typeof v === 'boolean'

export function lessonHistory(frames: Frame[]) {
  const hist: Record<string, Point[]> = {}
  let prev: Record<string, Scalar> = {}
  frames.forEach((f, at) => {
    const vals = valuesAt(f)
    for (const [k, v] of Object.entries(vals)) {
      if (!isName(k) || !comparable(v)) continue
      if (prev[k] !== v) (hist[k] ??= []).push({ v, at })
    }
    prev = vals
  })
  return hist
}

export function studentHistory(run: RunResult) {
  const hist: Record<string, Point[]> = {}
  const last: Record<string, unknown> = {}
  run.changes.forEach((c, at) => {
    for (const [k, v] of Object.entries(c.set)) {
      if (last[k] === v && k in last) continue
      last[k] = v
      ;(hist[k] ??= []).push({ v, at })
    }
  })
  return hist
}

export type Verdict =
  | { kind: 'error'; line: number; message: string; question: string }
  | { kind: 'differ'; name: string; lessonName: string; line: number; mine: Point['v'] | 'stopped'; lesson: Point['v'] | 'finished'; lessonFrame: number; question: string; before: Record<string, Point['v']> }
  | { kind: 'result'; mine: unknown; lesson: unknown; question: string }
  | { kind: 'same'; say: string }
  | { kind: 'nothing'; say: string }

const fmt = (v: unknown) => (v === null || v === undefined ? 'nothing' : Array.isArray(v) ? `[${v.join(', ')}]` : String(v))

/** What the student's other variables held just before change `at`. */
function context(run: RunResult, at: number, skip: string): Record<string, Point['v']> {
  const out: Record<string, Point['v']> = {}
  for (let i = 0; i < at; i++) for (const [k, v] of Object.entries(run.changes[i].set)) if (k !== skip) out[k] = v
  return out
}

/** Compare the two runs; the earliest difference in the student's run wins. */
export function compareRuns(run: RunResult, frames: Frame[]): Verdict {
  // A mistake that stops the run is reported unless the steps already went
  // another way before it (that is the real cause, as with an endless loop).
  const failed = (): Verdict => {
    const e = run.error!
    const where = e.line ? `Line ${e.line}: ` : ''
    const question = e.endless
      ? `Which value should change on every pass of the loop${e.line ? ` at line ${e.line}` : ''}, so that it ends?`
      : e.line
        ? `What did you mean on line ${e.line}? Fix it and run again.`
        : 'Write a few steps and run again.'
    return { kind: 'error', line: e.line, message: where + e.message, question }
  }
  if (run.error && !run.changes.length) return failed()
  if (!run.changes.length && run.returned === undefined) return { kind: 'nothing', say: 'Your pseudocode ran but changed nothing. Give the variables values, like “lo ← 0”.' }
  const L = lessonHistory(frames)
  const S = studentHistory(run)
  const lessonNames = new Set(Object.keys(L))
  let best: { at: number; lframe: number; v: Verdict } | null = null

  for (const [sname, sh] of Object.entries(S)) {
    const lname = lessonName(sname, lessonNames)
    if (!lname || lname === 'answer') continue
    const lh = L[lname]
    const n = Math.max(sh.length, lh.length)
    for (let k = 0; k < n; k++) {
      const s = sh[k]
      const l = lh[k]
      if (s && l && s.v === l.v) continue
      // A run cut short by a mistake hasn't "stopped early": report the mistake.
      if (!s && run.error) break
      // First difference for this variable.
      const at = s ? s.at : run.changes.length
      const lframe = l ? l.at : frames.length
      const line = s ? run.changes[s.at].line : run.loopExit?.line ?? run.changes[run.changes.length - 1]?.line ?? 0
      const before = context(run, at, sname)
      const ctx = Object.entries(before).filter(([k2]) => lessonName(k2, lessonNames)).slice(0, 3).map(([k2, v]) => `${k2} = ${fmt(v)}`).join(', ')
      let question: string
      const endless = !!run.error?.endless
      if (s && l) question = `On line ${line} your ${sname} becomes ${fmt(s.v)}, but at this point in the lesson ${lname} becomes ${fmt(l.v)}.${ctx ? ` Just before, ${ctx}.` : ''} What should ${sname} be here, and why?${endless ? ' (Your run also never finishes; this may be why.)' : ''}`
      else if (s && !l) question = `Your ${sname} keeps changing (to ${fmt(s.v)} on line ${line}) after the lesson’s ${lname} has stopped at ${fmt(lh[lh.length - 1]?.v)}. What should make your loop stop?`
      else if (run.loopExit) {
        const vals = Object.entries(run.loopExit.values).filter(([k2]) => k2 in S && lessonName(k2, lessonNames) && k2 !== sname).slice(0, 3).map(([k2, v2]) => `${k2} = ${fmt(v2)}`).join(', ')
        question = `Your loop on line ${run.loopExit.line} stops${vals ? ` when ${vals}` : ''}, so ${sname} never becomes ${fmt(l!.v)} as it does in the lesson. Should the loop run once more there?`
      } else question = `Your run stops changing ${sname} at ${fmt(sh[sh.length - 1]?.v)}, but the lesson’s ${lname} goes on to ${fmt(l!.v)}. Why does yours stop early?`
      const v: Verdict = { kind: 'differ', name: sname, lessonName: lname, line, mine: s ? s.v : 'stopped', lesson: l ? l.v : 'finished', lessonFrame: Math.min(lframe, frames.length - 1), question, before }
      if (!best || at < best.at || (at === best.at && lframe < best.lframe)) best = { at, lframe, v }
      break
    }
  }
  if (best) return best.v
  if (run.error) return failed()

  const shared = Object.keys(S).filter((k) => lessonName(k, lessonNames))
  if (!shared.length) {
    const names = [...lessonNames].filter((k) => k.length <= 6).slice(0, 5).join(', ')
    return { kind: 'nothing', say: `I can’t line your run up with the lesson: none of your names match its variables (${names}). Use the same names, like ${names.split(', ')[0]}.` }
  }
  // Same steps: does it give the same answer?
  const last = frames.length ? valuesAt(frames[frames.length - 1]) : {}
  const lessonAnswer = ['answer', 'ans', 'result', 'res'].map((k) => last[k]).find((v) => v !== undefined)
  if (lessonAnswer !== undefined && run.returned !== undefined && run.returned !== lessonAnswer) {
    return { kind: 'result', mine: run.returned, lesson: lessonAnswer, question: `Every step matches, but you return ${fmt(run.returned)} and the lesson’s answer is ${fmt(lessonAnswer)}. What should the last line give back?` }
  }
  if (lessonAnswer !== undefined && run.returned === undefined && !run.printed.length) {
    return { kind: 'result', mine: undefined, lesson: lessonAnswer, question: `Every step matches, but your pseudocode never returns the answer (${fmt(lessonAnswer)}). Where should it return?` }
  }
  return { kind: 'same', say: `Your approach matches the lesson step for step on this input (${shared.join(', ')}). Try it on another input — say “what if” with a new one.` }
}
