/*
  Scene Voice, part 1: what did the student ask the animation to do?
  "ruko", "swap pe ruko", "go to when low equals high", "what if sorted",
  "i chaar kyun ho gaya"… → one SceneCommand, or null for anything that is not
  about driving the animation (a question goes to the tutor instead).

  No AI: rules over the same normalised words as the command matcher.
  Pure and type-strippable; tests/voice-scene.test.js checks it against
  docs/voice/tests/scene.json (≥ 95%).
*/
import { normalize } from '../actions/match.ts'

export type Which = 'first' | 'next' | 'last'
export type Target = { step: number } | { event: string; which?: Which } | { when: string }
export type WhatIf = 'sorted' | 'reversed' | { n: number } | { array: number[] } | { target: number }

export type SceneCommand =
  | { verb: 'pause' }
  | { verb: 'play' }
  | { verb: 'replay' }
  | { verb: 'step'; by: number }
  | { verb: 'jump'; to: Target }
  | { verb: 'rewind'; to: Target }
  | { verb: 'whatif'; input: WhatIf }
  | { verb: 'why'; about: string }
  | { verb: 'speed'; to: 'slower' | 'faster' | 'normal' }
  | { verb: 'predict'; on: boolean }
  | { verb: 'value'; of: string }

/** Spoken events → the step ids lessons use for them (t.step('swap', …)). */
export const EVENTS: Record<string, string[]> = {
  swap: ['swap', 'swaps', 'swapped', 'exchange', 'flip'],
  compare: ['compare', 'compares', 'comparison', 'cmp', 'check', 'test', 'look'],
  push: ['push', 'pushed', 'add', 'insert', 'enqueue'],
  pop: ['pop', 'popped', 'remove', 'dequeue', 'take'],
  found: ['found', 'hit', 'match', 'mila'],
  merge: ['merge', 'merged', 'combine'],
  split: ['split', 'divide'],
  done: ['done', 'end', 'finish', 'finished', 'khatam'],
}
const EVENT_OF = new Map(Object.entries(EVENTS).flatMap(([k, words]) => words.map((w) => [w, k] as const)))

const NUM_WORDS: Record<string, number> = {
  zero: 0, shunya: 0, one: 1, ek: 1, two: 2, three: 3, teen: 3, four: 4, char: 4, chaar: 4, five: 5, paanch: 5, panch: 5,
  six: 6, chhe: 6, che: 6, seven: 7, saat: 7, eight: 8, aath: 8, nine: 9, nau: 9, ten: 10, das: 10, eleven: 11, twelve: 12,
}
function num(w: string | undefined): number | null {
  if (w == null) return null
  if (/^-?\d+$/.test(w)) return Number(w)
  return w in NUM_WORDS ? NUM_WORDS[w] : null
}

/** Words that are never a variable name in "why did X change". */
const NOT_VARS = new Set([
  'why', 'did', 'does', 'is', 'it', 'was', 'become', 'became', 'go', 'went', 'ho', 'gaya', 'gayi', 'hua', 'hui', 'yeh', 'ye', 'kyun', 'kyu',
  'this', 'that', 'here', 'left', 'right', 'up', 'down', 'change', 'changed', 'get', 'got', 'value', 'step', 'show', 'open', 'next', 'back',
  'play', 'pause', 'again', 'what', 'happen', 'happened', 'so', 'a', 'of', 'in', 'on', 'at', 'it', 'its', 'mein', 'ka', 'ki', 'ke', 'se',
])

const COND_WORDS = new Set(['when', 'jab', 'where', 'jahan'])
const EQ_WORDS = new Set(['equals', 'equal', 'is', 'becomes', 'barabar', 'eq'])

/** "low equals high", "i 4 ho jaye", "mid is 7" → "low == high". */
function condition(words: string[], from: number): string | null {
  const rest = words.slice(from).filter((w) => !['to', 'the', 'pe', 'par', 'tab', 'ho', 'jaye', 'jaaye', 'go', 'pause', 'stop', 'baar'].includes(w))
  const lhs = rest[0]
  if (!lhs || !/^[a-z_][a-z0-9_]*$/.test(lhs)) return null
  let k = 1
  while (k < rest.length && EQ_WORDS.has(rest[k])) k++
  const rhsWord = rest[k]
  if (rhsWord == null) return null
  const n = num(rhsWord)
  const rhs = n != null ? String(n) : /^[a-z_][a-z0-9_]*$/.test(rhsWord) ? rhsWord : null
  return rhs == null ? null : `${lhs} == ${rhs}`
}

function whichOf(words: string[]): Which | undefined {
  if (words.some((w) => w === 'first' || w === 'pehli' || w === 'pehla' || w === 'pehle')) return 'first'
  if (words.some((w) => w === 'last' || w === 'previous' || w === 'pichli' || w === 'aakhri')) return 'last'
  if (words.some((w) => w === 'next' || w === 'agli')) return 'next'
  return undefined
}

function eventIn(words: string[]): string | null {
  for (const w of words) if (EVENT_OF.has(w)) return EVENT_OF.get(w)!
  return null
}

export function parseScene(utterance: string): SceneCommand | null {
  const raw = utterance.toLowerCase().normalize('NFC')
  const words = normalize(utterance).split(' ').filter(Boolean)
  // "what if", "agar … toh", "try with …", "… karke dikhao", "search for 9 instead"
  const digits = (raw.match(/-?\d+/g) ?? []).map(Number)
  const has = (...ws: string[]) => ws.some((w) => words.includes(w))
  if (!words.length) return null

  /* why */
  if (has('why', 'kyun', 'kyu', 'kaise')) {
    const ev = eventIn(words)
    if (ev || has('left', 'right')) return { verb: 'why', about: 'event' }
    const v = words.find((w) => /^[a-z_][a-z0-9_]{0,5}$/.test(w) && !NOT_VARS.has(w) && num(w) == null)
    return { verb: 'why', about: v ?? 'event' }
  }

  /* what if */
  const whatIf = raw.includes('what if') || has('agar', 'instead') || raw.startsWith('try with') || raw.includes('karke dikhao') || raw.includes('kar ke dikhao')
  if (whatIf) {
    if (/reverse|ulta|descending|ulti/.test(raw)) return { verb: 'whatif', input: 'reversed' }
    if (/sorted|sort|ascending/.test(raw)) return { verb: 'whatif', input: 'sorted' }
    const ni = words.indexOf('n')
    if (ni >= 0) {
      const v = num(words[ni + 1]) ?? num(words[ni + 2]) ?? num(words[ni - 1])
      if (v != null) return { verb: 'whatif', input: { n: v } }
    }
    if (has('search', 'find', 'target', 'dhundo', 'key')) {
      const t = digits[0] ?? words.map(num).find((n) => n != null)
      if (t != null) return { verb: 'whatif', input: { target: t } }
    }
    if (digits.length >= 2) return { verb: 'whatif', input: { array: digits } }
    if (digits.length === 1) return { verb: 'whatif', input: { target: digits[0] } }
  }

  /* speed */
  if (has('speed') || has('slow', 'slower', 'dheere', 'dheema', 'faster', 'fast', 'tez', 'jaldi')) {
    if (has('normal', 'regular')) return { verb: 'speed', to: 'normal' }
    if (has('slow', 'slower', 'dheere', 'dheema')) return { verb: 'speed', to: 'slower' }
    if (has('faster', 'fast', 'tez', 'jaldi')) return { verb: 'speed', to: 'faster' }
  }

  /* predict mode */
  if (has('predict') || raw.includes('ask me before')) {
    return { verb: 'predict', on: !has('off', 'close', 'stop', 'band', 'disable', 'nahi') }
  }

  /* conditions: "when low equals high", "jab i 4 ho jaye" */
  const ci = words.findIndex((w) => COND_WORDS.has(w))
  if (ci >= 0) {
    const ev = eventIn(words)
    const rewinding = has('rewind') || has('back')
    if (ev) return { verb: rewinding ? 'rewind' : 'jump', to: whichOf(words) ? { event: ev, which: whichOf(words) } : { event: ev } }
    const c = condition(words, ci + 1)
    if (c) return { verb: rewinding ? 'rewind' : 'jump', to: { when: c } }
  }
  if (has('rewind')) {
    const ti = words.indexOf('rewind')
    const ev = eventIn(words)
    if (ev) return { verb: 'rewind', to: { event: ev, which: whichOf(words) ?? 'last' } }
    const c = condition(words, ti + 1)
    if (c) return { verb: 'rewind', to: { when: c } }
  }

  /* "go to step 12", "step 5 pe jao" */
  const si = words.indexOf('step')
  if (si >= 0 && (has('go', 'jump', 'open', 'show') || raw.includes('pe ') || raw.includes('par '))) {
    const n = num(words[si + 1])
    if (n != null && !has('back') && !has('next')) return { verb: 'jump', to: { step: n } }
  }

  /* events: "swap pe ruko", "pause at the next swap", "replay the last swap" */
  const ev = eventIn(words)
  if (ev && (has('pause', 'stop', 'go', 'jump', 'show', 'at', 'skip', 'tak') || raw.includes(' pe ') || raw.includes(' par '))) {
    const which = whichOf(words)
    return { verb: 'jump', to: which ? { event: ev, which } : { event: ev } }
  }
  if (ev && has('replay', 'again')) return { verb: 'rewind', to: { event: ev, which: whichOf(words) ?? 'last' } }

  /* stepping: "next step", "ek step peeche", "go back three steps" */
  if (words.some((w) => w === 'step' || w === 'steps')) {
    const back = has('back', 'previous')
    let n = 1
    const idx = words.findIndex((w) => w === 'step' || w === 'steps')
    const before = words[idx - 1]
    // "do step peeche" — Hindi "do" is two right before "step".
    const count = before === 'do' ? 2 : num(before) ?? (has('back') ? num(words[words.indexOf('back') + 1]) : null)
    if (count != null && count > 0) n = count
    if (back) return { verb: 'step', by: -n }
    if (has('next', 'forward', 'aage') || count != null) return { verb: 'step', by: n }
  }
  if (words.length === 1 && words[0] === 'next') return { verb: 'step', by: 1 }

  /* "mid kya hai", "what is low", "value of i": read it from the current step */
  const asks = raw.match(/^(?:what(?:'s| is)(?: the value of)?|value of)\s+([a-z_][a-z0-9_]{0,3})\??$/) ?? raw.match(/^([a-z_][a-z0-9_]{0,3}) (?:kya|kitna|kitni) (?:hai|he)\??$/)
  if (asks && !NOT_VARS.has(asks[1]) && !['time', 'this', 'that', 'the'].includes(asks[1])) return { verb: 'value', of: asks[1] }

  /* replay, pause, play */
  if (/from the (beginning|start)|shuru se|start again|start over/.test(raw) || has('restart', 'replay') || (has('again') && has('play'))) return { verb: 'replay' }
  if (words.length <= 3 && has('pause', 'stop', 'hold')) return { verb: 'pause' }
  if (words.length <= 3 && has('play', 'resume', 'continue', 'start')) return { verb: 'play' }
  return null
}
