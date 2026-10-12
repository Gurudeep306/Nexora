import type { GateQuestion } from './types'

/** Practice-mode answer logic shared by the question card and the mock review. */

/* ── Answer helpers ─────────────────────────────────────────────────────── */

export type Pick = string | string[] | undefined

/**
 * Official keys sometimes accept more than one answer ("A;C;D or C;D",
 * "2 to 2 OR 4 to 4"); a response is correct if it matches any alternative.
 */
function keyAlternatives(a: GateQuestion['answer']): GateQuestion['answer'][] {
  return typeof a === 'string' ? a.split(/\s+or\s+/i).map((x) => x.trim()).filter(Boolean) : [a]
}

/** A NAT range key — "lo:hi" or "lo to hi" — as [lo, hi], else null. */
function natRange(a: GateQuestion['answer']): [number, number] | null {
  if (typeof a !== 'string') return null
  const m = a.match(/^\s*(-?[\d.]+)\s*(?::|to)\s*(-?[\d.]+)\s*$/i)
  return m ? [Number(m[1]), Number(m[2])] : null
}

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
  return keyAlternatives(q.answer).some((key) =>
    q.type === 'MSQ' || Array.isArray(key)
      ? answerList(key).includes(label)
      : String(key).trim().toUpperCase() === label.toUpperCase(),
  )
}

/** Self-check types: the student compares with the key themselves. */
export function isSelfCheck(q: GateQuestion) {
  return !hasOptions(q) && q.type !== 'NAT'
}

export function checkIsCorrect(q: GateQuestion, pick: Pick): boolean {
  if (pick === undefined || pick === null || pick === '' || (Array.isArray(pick) && pick.length === 0)) return false
  if (q.type === 'MSQ') {
    const u = (Array.isArray(pick) ? [...pick] : [pick]).sort()
    return keyAlternatives(q.answer).some((key) => {
      const t = answerList(key).sort()
      return u.length === t.length && u.every((v, i) => v === t[i])
    })
  }
  if (q.type === 'NAT') {
    const num = Number(pick)
    if (Number.isNaN(num)) return false
    return keyAlternatives(q.answer).some((key) => {
      const range = natRange(key)
      if (range) return num >= range[0] - 0.01 && num <= range[1] + 0.01
      return Math.abs(num - Number(key)) <= 0.05
    })
  }
  if (q.type === 'TF' && q.options.length === 0) return isKeyOption(q, String(pick))
  return keyAlternatives(q.answer).some((key) => String(pick).trim().toUpperCase() === String(key).trim().toUpperCase())
}

/** The key as a person reads it: "B", "A, C", "2.5 to 2.6". */
export function formatKey(q: GateQuestion) {
  const a = q.answer
  if (a == null || a === '') return 'Not available'
  if (Array.isArray(a)) return a.join(', ')
  if (typeof a === 'string') {
    return keyAlternatives(a)
      .map((k) => {
        const r = q.type === 'NAT' ? natRange(k) : null
        return r ? (r[0] === r[1] ? String(r[0]) : `${r[0]} to ${r[1]}`) : String(k)
      })
      .join(' or ')
  }
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
