/*
 * Layer 2a: replay a dry-run trace (src/dryrun/index.js documents the
 * events) into snapshots — the whole state of the program after each step:
 * the call stack, every call's variables, the objects in memory, and how
 * much output had been printed.
 */

/** A value as the tracer sends it. */
export type TV =
  | number
  | string
  | boolean
  | null
  | { t: 'list' | 'tuple' | 'set' | 'deque'; n: number; i: TV[] }
  | { t: 'dict'; n: number; k: [TV, TV][] }
  | { t: 'ref'; id: number }
  /** A value without identity (a Swift or C# struct): drawn like an object, compared by value. */
  | { t: 'rec'; c: string; f: Record<string, TV> }
  | { t: 'big' | 'num' | 'str'; s: string }
  | { t: 'more' }

export interface HeapObj {
  c: string
  f: Record<string, TV>
}

export interface TraceEvent {
  e: 'call' | 'line' | 'ret' | 'exc'
  l?: number
  k?: number
  f?: string
  d?: number
  v?: Record<string, TV>
  x?: string[]
  h?: Record<string, HeapObj>
  o?: number
  r?: TV
  m?: string
}

export interface CallFrame {
  k: number
  fn: string
  /** The arguments it was called with, for the call-stack card. */
  args: string
  vars: Map<string, TV>
  /** Variable names in the order they first appeared. */
  order: string[]
  line: number
}

export interface Snapshot {
  kind: 'call' | 'line' | 'ret' | 'exc'
  line: number
  /** Oldest call first; the last one is running. */
  stack: CallFrame[]
  heap: Map<number, HeapObj>
  out: number
  /** For a 'ret' step: the function and the value it returns. */
  ret?: { fn: string; value: TV }
  /** For an 'exc' step: the error. */
  error?: string
  /** Names in the running call that changed on this step. */
  changed: string[]
}

export function isObj(v: TV): v is Exclude<TV, number | string | boolean | null> {
  return typeof v === 'object' && v !== null
}

/** How the student's language writes "nothing", true and false. */
const WORDS: Record<string, [string, string, string]> = {
  python: ['None', 'True', 'False'],
  cpp: ['nullptr', 'true', 'false'],
  c: ['NULL', 'true', 'false'],
  go: ['nil', 'true', 'false'],
  rust: ['None', 'true', 'false'],
  csharp: ['null', 'true', 'false'],
  kotlin: ['null', 'true', 'false'],
  swift: ['nil', 'true', 'false'],
}
let words = WORDS.python
export function setLanguage(lang: string) {
  words = WORDS[lang] ?? ['null', 'true', 'false']
}

/** A short, readable form of any value (for notes and cards). */
export function show(v: TV, heap?: Map<number, HeapObj>, depth = 0): string {
  if (v === null) return words[0]
  if (typeof v === 'string') return JSON.stringify(v)
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e4) / 1e4)
  if (typeof v === 'boolean') return v ? words[1] : words[2]
  if (depth > 2) return '…'
  switch (v.t) {
    case 'list':
    case 'tuple':
    case 'deque':
    case 'set': {
      const inner = v.i.slice(0, 8).map((x) => show(x, heap, depth + 1)).join(', ') + (v.n > 8 ? ', …' : '')
      return v.t === 'tuple' ? `(${inner})` : v.t === 'set' ? `{${inner}}` : `[${inner}]`
    }
    case 'dict':
      return `{${v.k.slice(0, 5).map(([a, b]) => `${show(a, heap, depth + 1)}: ${show(b, heap, depth + 1)}`).join(', ')}${v.n > 5 ? ', …' : ''}}`
    case 'rec': {
      const entries = Object.entries(v.f)
      return `${v.c}(${entries.slice(0, 4).map(([k, x]) => `${k}=${show(x, heap, depth + 1)}`).join(', ')}${entries.length > 4 ? ', …' : ''})`
    }
    case 'ref': {
      const o = heap?.get(v.id)
      if (!o) return 'object'
      const entries = Object.entries(o.f)
      // A plain record of a few values (Edge {u, v, w}) shows them all.
      const linky = entries.some(([k, x]) => /^(next|nxt|prev|left|right|child|children|kids|parent|link|links|up|down)$/i.test(k) || (isObj(x) && (x as { t: string }).t === 'ref'))
      if (entries.length && entries.length <= 3 && !linky)
        return `${o.c}(${entries.map(([k, x]) => `${k}=${show(x, heap, depth + 1)}`).join(', ')})`
      // A node (it links to others) is named by its value.
      const val = ['val', 'value', 'v', 'data', 'key'].map((f) => o.f[f]).find((x) => x !== undefined && !isObj(x as TV))
      return val !== undefined ? `${o.c}(${show(val as TV, heap, depth + 1)})` : o.c
    }
    case 'big':
    case 'num':
    case 'str':
      return v.s
    case 'more':
      return '…'
  }
}

const same = (a: TV | undefined, b: TV | undefined) => JSON.stringify(a) === JSON.stringify(b)

/** Replay the events into one snapshot per visible step. */
export function replay(events: TraceEvent[]): Snapshot[] {
  const snaps: Snapshot[] = []
  const stack: CallFrame[] = []
  const heap = new Map<number, HeapObj>()
  let out = 0

  const snap = (kind: Snapshot['kind'], line: number, changed: string[], extra?: Partial<Snapshot>) => {
    snaps.push({
      kind,
      line,
      stack: stack.map((f) => ({ ...f, vars: new Map(f.vars), order: [...f.order] })),
      heap: new Map(heap),
      out,
      changed,
      ...extra,
    })
  }
  const mergeHeap = (h?: Record<string, HeapObj>) => {
    for (const [id, o] of Object.entries(h ?? {})) heap.set(Number(id), o)
  }
  const frameOf = (k?: number) => {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].k === k) return stack[i]
    return stack[stack.length - 1]
  }
  const apply = (f: CallFrame, v?: Record<string, TV>, x?: string[]) => {
    const changed: string[] = []
    for (const [name, val] of Object.entries(v ?? {})) {
      if (!same(f.vars.get(name), val)) changed.push(name)
      if (!f.vars.has(name)) f.order.push(name)
      f.vars.set(name, val)
    }
    for (const name of x ?? []) {
      f.vars.delete(name)
      f.order = f.order.filter((n) => n !== name)
    }
    return changed
  }

  for (const ev of events) {
    if (typeof ev.o === 'number') out = ev.o
    mergeHeap(ev.h)
    if (ev.e === 'call') {
      const f: CallFrame = { k: ev.k ?? stack.length + 1, fn: (ev.f ?? '?').replace(/\(\)$/, ''), args: '', vars: new Map(), order: [], line: ev.l ?? 0 }
      apply(f, ev.v)
      f.args = [...f.vars.entries()]
        .filter(([n]) => n !== 'self')
        .map(([n, val]) => `${n}=${show(val, heap)}`)
        .join(', ')
      stack.push(f)
      // The program's own start is not a step worth showing.
      if (stack.length > 1) snap('call', f.line, [])
    } else if (ev.e === 'line') {
      const f = frameOf(ev.k)
      if (!f) continue
      const changed = apply(f, ev.v, ev.x)
      f.line = ev.l ?? f.line
      snap('line', f.line, changed)
    } else if (ev.e === 'ret') {
      const f = frameOf(ev.k)
      if (!f) continue
      // The program ending is shown as its last line, not as a "return".
      if (stack.length > 1) snap('ret', ev.l ?? f.line, [], { ret: { fn: f.fn, value: ev.r === undefined ? null : ev.r } })
      const at = stack.lastIndexOf(f)
      if (at >= 0) stack.splice(at, 1)
    } else if (ev.e === 'exc') {
      const f = frameOf(ev.k)
      // Python reports an error again in every call it passes through; show it once.
      if (snaps.some((s) => s.kind === 'exc' && s.error === ev.m)) continue
      snap('exc', ev.l ?? f?.line ?? 0, [], { error: ev.m ?? 'Error' })
    }
  }
  return snaps
}
