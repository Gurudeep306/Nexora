import type { GateQuestion } from './types'

/** Practice-mode answer logic shared by the question card and the mock review. */

/* ── Answer helpers ─────────────────────────────────────────────────────── */

export type Pick = string | string[] | undefined

function answerList(a: GateQuestion['answer']): string[] {
  if (Array.isArray(a)) return a.map(String)
  if (typeof a === 'string') return a.split(/[,;\s]+/).filter(Boolean)
  return a == null ? [] : [String(a)]
}

/** True when the question is answered by picking options. */
export function hasOptions(q: GateQuestion) {
  return q.options.length > 0 || q.type === 'TF'
}

export function tfOptions(q: GateQuestion) {
  return q.type === 'TF' && q.options.length === 0
    ? [
        { l: 'True', t: 'True' },
        { l: 'False', t: 'False' },
      ]
    : q.options
}

export function isKeyOption(q: GateQuestion, label: string) {
  if (q.answer == null) return false
  if (q.type === 'TF' && q.options.length === 0) return String(q.answer).trim().toLowerCase().startsWith(label.toLowerCase())
  if (q.type === 'MSQ' || Array.isArray(q.answer)) return answerList(q.answer).includes(label)
  return String(q.answer).trim().toUpperCase() === label.toUpperCase()
}

/** Self-check types: the student compares with the key themselves. */
export function isSelfCheck(q: GateQuestion) {
  return !hasOptions(q) && q.type !== 'NAT'
}

export function checkIsCorrect(q: GateQuestion, pick: Pick): boolean {
  if (pick === undefined || pick === null || pick === '' || (Array.isArray(pick) && pick.length === 0)) return false
  if (q.type === 'MSQ') {
    const u = (Array.isArray(pick) ? [...pick] : [pick]).sort()
    const t = answerList(q.answer).sort()
    return u.length === t.length && u.every((v, i) => v === t[i])
  }
  if (q.type === 'NAT') {
    const num = Number(pick)
    if (Number.isNaN(num)) return false
    if (typeof q.answer === 'number') return Math.abs(num - q.answer) <= 0.05
    if (typeof q.answer === 'string' && q.answer.includes(':')) {
      const [lo, hi] = q.answer.split(':').map(Number)
      return num >= lo - 0.01 && num <= hi + 0.01
    }
    return Math.abs(num - Number(q.answer)) <= 0.05
  }
  if (q.type === 'TF' && q.options.length === 0) return isKeyOption(q, String(pick))
  return String(pick).trim().toUpperCase() === String(q.answer).trim().toUpperCase()
}

/** The key as a person reads it: "B", "A, C", "2.5 to 2.6". */
export function formatKey(q: GateQuestion) {
  const a = q.answer
  if (a == null || a === '') return 'Not available'
  if (Array.isArray(a)) return a.join(', ')
  if (q.type === 'NAT' && typeof a === 'string' && a.includes(':')) return a.replace(':', ' to ')
  return String(a)
}

/** One line of plain text from a question's Markdown (queues and lists). */
export function snippet(text: string, max = 140) {
  const s = text
    .replace(/```[\s\S]*?```/g, ' [code] ')
    .replace(/\|/g, ' ')
    .replace(/\$\$?([^$]*)\$\$?/g, '$1')
    .replace(/\\(text|mathrm|mathit|mathbf)\{([^}]*)\}/g, '$2')
    .replace(/<[^>]+>/g, '')
    .replace(/_{2,}/g, '___')
    .replace(/(^|\s)_(\S)/g, '$1$2')
    .replace(/[*`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}
