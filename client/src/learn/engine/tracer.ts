import type { ArrayState, Cell, Frame, GridState, OutputState, QueueState, Range, Role, Scalar, StackState, Structure, VarsState } from './types'

let uid = 0
const nextId = () => `c${++uid}`

/**
 * A live array the algorithm manipulates. Mutations keep cell identities, so
 * the renderer can animate a value travelling to its new index.
 */
export class TArray {
  cells: Cell[]
  roles: Record<number, Role> = {}
  pointers: Record<string, number> = {}
  ranges: Range[] = []
  capacity?: number
  id: string
  opts: { label?: string; capacity?: number; bars?: boolean; address?: { base: number; size: number } }
  constructor(
    id: string,
    values: Scalar[],
    opts: { label?: string; capacity?: number; bars?: boolean; address?: { base: number; size: number } } = {},
  ) {
    this.id = id
    this.opts = opts
    this.cells = values.map((v) => ({ id: nextId(), v }))
    this.capacity = opts.capacity
  }
  get length() {
    return this.cells.length
  }
  get(i: number) {
    return this.cells[i]?.v
  }
  set(i: number, v: Scalar) {
    if (i < this.cells.length) this.cells[i] = { ...this.cells[i], v }
    else this.cells[i] = { id: nextId(), v }
  }
  swap(i: number, j: number) {
    const t = this.cells[i]
    this.cells[i] = this.cells[j]
    this.cells[j] = t
  }
  insert(i: number, v: Scalar) {
    this.cells.splice(i, 0, { id: nextId(), v })
  }
  remove(i: number) {
    return this.cells.splice(i, 1)[0]
  }
  push(v: Scalar) {
    this.cells.push({ id: nextId(), v })
  }
  /** Copy the value *and identity* of cell j into slot i (a shift). */
  move(to: number, from: number) {
    this.cells[to] = this.cells[from]
    this.cells[from] = { id: nextId(), v: null }
  }
  role(i: number, r: Role | null) {
    if (r == null) delete this.roles[i]
    else this.roles[i] = r
    return this
  }
  clear() {
    this.roles = {}
    return this
  }
  ptr(name: string, i: number | null) {
    if (i == null) delete this.pointers[name]
    else this.pointers[name] = i
    return this
  }
  range(rs: Range[]) {
    this.ranges = rs
    return this
  }
  values() {
    return this.cells.map((c) => c.v)
  }
  snap(): ArrayState {
    return {
      kind: 'array',
      id: this.id,
      label: this.opts.label,
      cells: this.cells.map((c) => ({ ...c })),
      capacity: this.capacity,
      roles: { ...this.roles },
      pointers: { ...this.pointers },
      ranges: this.ranges.map((r) => ({ ...r })),
      bars: this.opts.bars,
      address: this.opts.address,
    }
  }
}

export class TStack {
  items: Cell[] = []
  roles: Record<number, Role> = {}
  id: string
  label?: string
  kind: 'stack' | 'queue'
  constructor(id: string, label?: string, kind: 'stack' | 'queue' = 'stack') {
    this.id = id
    this.label = label
    this.kind = kind
  }
  push(v: Scalar) {
    this.items.push({ id: nextId(), v })
  }
  pop() {
    return this.kind === 'stack' ? this.items.pop() : this.items.shift()
  }
  peek() {
    return this.kind === 'stack' ? this.items[this.items.length - 1] : this.items[0]
  }
  snap(): StackState | QueueState {
    return { kind: this.kind, id: this.id, label: this.label, items: this.items.map((c) => ({ ...c })), roles: { ...this.roles } }
  }
}

export class TGrid {
  roles: Record<string, Role> = {}
  id: string
  rows: Scalar[][]
  opts: { label?: string; rowLabels?: string[]; colLabels?: string[] }
  constructor(id: string, rows: Scalar[][], opts: { label?: string; rowLabels?: string[]; colLabels?: string[] } = {}) {
    this.id = id
    this.rows = rows
    this.opts = opts
  }
  set(r: number, c: number, v: Scalar) {
    this.rows[r][c] = v
  }
  role(r: number, c: number, role: Role | null) {
    if (role == null) delete this.roles[`${r},${c}`]
    else this.roles[`${r},${c}`] = role
  }
  snap(): GridState {
    return { kind: 'grid', id: this.id, label: this.opts.label, rows: this.rows.map((r) => [...r]), roles: { ...this.roles }, rowLabels: this.opts.rowLabels, colLabels: this.opts.colLabels }
  }
}

/**
 * Records frames. Structures are registered once; every `step()` snapshots
 * all of them, plus the variables passed in, so the player can scrub freely.
 */
export class Tracer {
  frames: Frame[] = []
  private live: { snap(): Structure }[] = []
  private vars: Record<string, Scalar> = {}
  private out: string[] = []
  private hasOut = false
  /** Hard stop so a bad input can never hang the page. */
  limit = 2500

  array(id: string, values: Scalar[], opts?: ConstructorParameters<typeof TArray>[2]) {
    const a = new TArray(id, values, opts)
    this.live.push(a)
    return a
  }
  stack(id: string, label?: string) {
    const s = new TStack(id, label, 'stack')
    this.live.push(s)
    return s
  }
  queue(id: string, label?: string) {
    const s = new TStack(id, label, 'queue')
    this.live.push(s)
    return s
  }
  grid(id: string, rows: Scalar[][], opts?: ConstructorParameters<typeof TGrid>[2]) {
    const g = new TGrid(id, rows, opts)
    this.live.push(g)
    return g
  }
  /** Removes a structure from later frames (e.g. an old buffer after a resize). */
  drop(s: { snap(): Structure }) {
    this.live = this.live.filter((x) => x !== s)
  }
  print(line: string) {
    this.out.push(line)
    this.hasOut = true
  }
  step(step: string, note: string, vars?: Record<string, Scalar>) {
    if (this.frames.length >= this.limit) throw new TraceLimit()
    const prev = this.vars
    const next = vars ? { ...vars } : prev
    const changed = vars ? Object.keys(next).filter((k) => prev[k] !== next[k]) : []
    this.vars = next
    const structures: Structure[] = this.live.map((s) => s.snap())
    if (Object.keys(next).length) {
      const v: VarsState = { kind: 'vars', id: '__vars', vars: { ...next }, changed }
      structures.push(v)
    }
    if (this.hasOut) {
      const o: OutputState = { kind: 'output', id: '__out', label: 'Output', lines: [...this.out] }
      structures.push(o)
    }
    this.frames.push({ step, note, structures })
  }
}

export class TraceLimit extends Error {
  constructor() {
    super('Trace limit reached')
  }
}

/** Run an algorithm body, turning the frame cap into a friendly final frame. */
export function trace(body: (t: Tracer) => void): Frame[] {
  const t = new Tracer()
  try {
    body(t)
  } catch (e) {
    if (!(e instanceof TraceLimit)) throw e
    t.frames.push({ step: '', note: 'The input is large, so the animation stops here. Try a smaller input to see every step.', structures: t.frames.at(-1)?.structures ?? [] })
  }
  return t.frames
}
