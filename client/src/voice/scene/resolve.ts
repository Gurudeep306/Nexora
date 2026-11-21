/*
  Scene Voice, part 2: carry out a SceneCommand on a recorded animation.
  Every answer comes from the frames the algorithm actually produced (step
  ids, notes, variables, pointers) — never from a model — so "why did i
  become 4?" can only ever say what really happened.

  Pure and type-strippable; tests/voice-scene.test.js runs it on real traces.
*/
import type { Frame, Inputs, InputField, Scalar } from '../../learn/engine/types'
import { EVENTS, type SceneCommand, type Target, type WhatIf } from './parse.ts'

/** Names people say → names lessons use. */
export const ALIASES: Record<string, string[]> = {
  low: ['lo', 'l'], lo: ['low', 'l'], high: ['hi', 'h'], hi: ['high', 'h'], middle: ['mid', 'm'], mid: ['middle', 'm'],
  left: ['l', 'lo'], right: ['r', 'hi'], current: ['cur'], cur: ['current'], previous: ['prev'], prev: ['previous'],
  answer: ['ans', 'res', 'result'], result: ['res', 'ans'], count: ['cnt', 'count'], sum: ['s', 'total'],
}

/** Every named value on a frame: the variables panel, then array pointers. */
export function valuesAt(frame: Frame | undefined): Record<string, Scalar> {
  const out: Record<string, Scalar> = {}
  if (!frame) return out
  for (const s of frame.structures) {
    if (s.kind === 'array') for (const [k, v] of Object.entries(s.pointers ?? {})) if (!(k in out)) out[k] = v
  }
  for (const s of frame.structures) if (s.kind === 'vars') Object.assign(out, s.vars)
  return out
}

/** The name this animation really uses for what the student said, if any. */
export function resolveName(said: string, frames: Frame[]): string | null {
  const known = new Set<string>()
  for (const f of frames) for (const k of Object.keys(valuesAt(f))) known.add(k)
  if (known.has(said)) return said
  for (const alt of ALIASES[said] ?? []) if (known.has(alt)) return alt
  const lower = [...known].find((k) => k.toLowerCase() === said)
  return lower ?? null
}

const same = (a: Scalar | undefined, b: Scalar | undefined) => a != null && b != null && String(a) === String(b)

function matchesEvent(frame: Frame, event: string): boolean {
  const words = EVENTS[event] ?? [event]
  const id = frame.step.toLowerCase()
  if (words.some((w) => id === w || id.startsWith(`${w}-`) || id.startsWith(`${w}_`))) return true
  return new RegExp(`\\b(${words.join('|')})\\b`, 'i').test(frame.note)
}

function holds(frame: Frame, cond: string, frames: Frame[]): boolean {
  const m = cond.match(/^(\S+) == (\S+)$/)
  if (!m) return false
  const vals = valuesAt(frame)
  const lhsName = resolveName(m[1], frames)
  if (!lhsName) return false
  const rhsName = /^-?\d+(\.\d+)?$/.test(m[2]) ? null : resolveName(m[2], frames)
  const rhs = rhsName ? vals[rhsName] : m[2]
  return same(vals[lhsName], rhs)
}

function find(frames: Frame[], at: number, test: (f: Frame) => boolean, how: 'forward' | 'backward' | 'first' | 'last'): number {
  const n = frames.length
  if (how === 'first') return frames.findIndex(test)
  if (how === 'last') {
    for (let i = n - 1; i >= 0; i--) if (test(frames[i])) return i
    return -1
  }
  if (how === 'forward') {
    for (let i = at + 1; i < n; i++) if (test(frames[i])) return i
    for (let i = 0; i <= at; i++) if (test(frames[i])) return i
    return -1
  }
  for (let i = at - 1; i >= 0; i--) if (test(frames[i])) return i
  return -1
}

function describeTarget(t: Target): string {
  if ('step' in t) return `step ${t.step}`
  if ('event' in t) return `${t.which ? `the ${t.which} ` : 'a '}${t.event}`
  return `when ${t.when.replace(' == ', ' = ')}`
}

export type SceneResult =
  | { kind: 'go'; index: number; say: string }
  | { kind: 'answer'; index?: number; say: string }
  | { kind: 'control'; say: string }
  | { kind: 'none'; say: string }

const stepLine = (frames: Frame[], i: number) => `Step ${i + 1} of ${frames.length}: ${frames[i].note}`

/** Work out what a command means for these frames, standing at `at`. */
export function resolveScene(cmd: SceneCommand, frames: Frame[], at: number): SceneResult {
  const last = frames.length - 1
  const needsFrames = cmd.verb === 'step' || cmd.verb === 'jump' || cmd.verb === 'rewind' || cmd.verb === 'why' || cmd.verb === 'value'
  if (last < 0 && needsFrames) return { kind: 'none', say: 'This animation has no steps yet.' }
  switch (cmd.verb) {
    case 'step': {
      const i = Math.max(0, Math.min(last, at + cmd.by))
      return i === at ? { kind: 'none', say: cmd.by > 0 ? 'This is the last step.' : 'This is the first step.' } : { kind: 'go', index: i, say: stepLine(frames, i) }
    }
    case 'jump':
    case 'rewind': {
      const t = cmd.to
      let i = -1
      if ('step' in t) i = t.step >= 1 && t.step <= frames.length ? t.step - 1 : -1
      else {
        const test = 'event' in t ? (f: Frame) => matchesEvent(f, t.event) : (f: Frame) => holds(f, t.when, frames)
        const how = cmd.verb === 'rewind' ? (('event' in t && t.which === 'first') ? 'first' : 'backward') : 'event' in t && t.which === 'first' ? 'first' : 'event' in t && t.which === 'last' ? 'last' : 'forward'
        i = find(frames, at, test, how)
        if (i < 0 && cmd.verb === 'rewind') i = find(frames, at, test, 'last')
        if ('when' in t && i < 0) {
          const name = t.when.split(' == ')[0]
          if (!resolveName(name, frames)) return { kind: 'none', say: `There is no ${name} in this animation.` }
        }
      }
      return i < 0 ? { kind: 'none', say: `I couldn’t find ${describeTarget(t)} in this run.` } : { kind: 'go', index: i, say: stepLine(frames, i) }
    }
    case 'why': {
      if (cmd.about === 'event') return { kind: 'answer', index: at, say: stepLine(frames, at) }
      const name = resolveName(cmd.about, frames)
      if (!name) return { kind: 'none', say: `There is no ${cmd.about} in this animation.` }
      for (let i = at; i >= 1; i--) {
        const now = valuesAt(frames[i])[name]
        const before = valuesAt(frames[i - 1])[name]
        if (now != null && !same(now, before)) {
          const from = before == null ? '' : ` from ${before}`
          return { kind: 'answer', index: i, say: `At step ${i + 1}, ${name} changed${from} to ${now}. ${frames[i].note}` }
        }
      }
      const v = valuesAt(frames[at])[name]
      return { kind: 'answer', index: at, say: v == null ? `${name} isn’t set yet at this step.` : `${name} has been ${v} since the start. ${frames[0].note}` }
    }
    case 'value': {
      const name = resolveName(cmd.of, frames)
      if (!name) return { kind: 'none', say: `There is no ${cmd.of} in this animation.` }
      const v = valuesAt(frames[at])[name]
      if (v != null) return { kind: 'answer', say: `${name} is ${v} at step ${at + 1}.` }
      // Not on screen now: say when it last had a value, if ever.
      for (let i = at - 1; i >= 0; i--) {
        const was = valuesAt(frames[i])[name]
        if (was != null) return { kind: 'answer', say: `${name} isn’t shown at step ${at + 1}; it was ${was} at step ${i + 1}.` }
      }
      return { kind: 'answer', say: `${name} isn’t set yet at step ${at + 1}.` }
    }
    case 'pause':
      return { kind: 'control', say: 'Paused' }
    case 'play':
      return { kind: 'control', say: 'Playing' }
    case 'replay':
      return { kind: 'control', say: 'From the start' }
    case 'speed':
      return { kind: 'control', say: cmd.to === 'slower' ? 'Slower' : cmd.to === 'faster' ? 'Faster' : 'Normal speed' }
    case 'predict':
      return { kind: 'control', say: cmd.on ? 'I’ll ask you before each step' : 'Predict mode off' }
    case 'whatif':
      return { kind: 'control', say: 'Running it again' }
  }
}

/**
 * New input text for a "what if": the same input fields, changed as asked.
 * Returns an explanation instead when this animation has no such input.
 */
export function whatIfInputs(fields: InputField[], current: Record<string, string>, input: WhatIf): { raw: Record<string, string>; say: string } | { error: string } {
  const arrayField = fields.find((f) => f.type === 'array')
  const nums = (s: string) => s.split(/[\s,]+/).filter(Boolean).map(Number).filter(Number.isFinite)
  if (input === 'sorted' || input === 'reversed') {
    if (!arrayField) return { error: 'This animation has no array to sort.' }
    const v = nums(current[arrayField.name] ?? arrayField.default).sort((a, b) => a - b)
    if (input === 'reversed') v.reverse()
    return { raw: { ...current, [arrayField.name]: v.join(' ') }, say: `Running it on ${input === 'sorted' ? 'the sorted' : 'the reversed'} array: ${v.join(' ')}` }
  }
  if ('array' in input) {
    if (!arrayField) return { error: 'This animation doesn’t take an array.' }
    if (arrayField.maxLen && input.array.length > arrayField.maxLen) return { error: `At most ${arrayField.maxLen} values keep it readable.` }
    return { raw: { ...current, [arrayField.name]: input.array.join(' ') }, say: `Running it on ${input.array.join(' ')}` }
  }
  const numFields = fields.filter((f) => f.type === 'number')
  if ('target' in input) {
    const f = numFields.find((x) => /target|key|search|find|x|k|value|val/i.test(`${x.name} ${x.label}`)) ?? numFields[0]
    if (!f) return { error: 'This animation has no number to change.' }
    return { raw: { ...current, [f.name]: String(input.target) }, say: `Running it with ${f.label.toLowerCase()} = ${input.target}` }
  }
  // { n }: a size field, else the array cut to n values.
  const sizeField = numFields.find((x) => /^n$|size|count|len/i.test(`${x.name} ${x.label}`))
  if (sizeField) return { raw: { ...current, [sizeField.name]: String(input.n) }, say: `Running it with ${sizeField.label.toLowerCase()} = ${input.n}` }
  if (arrayField) {
    if (input.n < 1) return { error: 'The array needs at least one value here.' }
    const v = nums(current[arrayField.name] ?? arrayField.default).slice(0, input.n)
    return { raw: { ...current, [arrayField.name]: v.join(' ') }, say: `Running it on the first ${input.n}: ${v.join(' ')}` }
  }
  return { error: 'This animation has no size to change.' }
}

export type { Inputs }
