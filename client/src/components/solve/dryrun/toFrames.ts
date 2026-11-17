/*
 * Layer 2b: turn replayed snapshots into learn-engine frames, so a student's
 * own run is drawn by the same views as the DSA chapters. The picture is
 * chosen from the data and from how the code uses it — never from the
 * problem — so it works for any question:
 *
 *   list of values         → array (index variables ride under it as pointers)
 *   list used as a stack   → stack;  deque / popleft / pop(0) → queue
 *   list of lists          → grid, or a graph when it is an adjacency list
 *   dict                   → map;    set → array labelled "set"
 *   objects with next      → linked list;  with left/right → binary tree
 *   numbers, text, flags   → variable cards (with the value they had before)
 *   calls                  → call stack;   printed text → output
 *
 * Roles light what happened on the step: write (a cell changed), new (an
 * item was added), swap (two cells exchanged — the values glide), compare /
 * active (cells the line just read).
 */
import type {
  ArrayState,
  CallsState,
  Cell,
  Frame,
  GraphState,
  GridState,
  ListState,
  MapState,
  OutputState,
  QueueState,
  Role,
  Scalar,
  StackState,
  Structure,
  TreeNode,
  TreeState,
  VarsState,
} from '@/learn/engine/types'
import { isObj, show, type CallFrame, type HeapObj, type Snapshot, type TV } from './replay.ts'

/** How many boxes / rows / nodes are drawn at most, so the stage stays readable. */
export const MAX_CELLS = 40
const MAX_NODES = 30

type ListTV = Extract<TV, { t: 'list' | 'tuple' | 'set' | 'deque' }>
type DictTV = Extract<TV, { t: 'dict' }>

const isList = (v: TV | undefined): v is ListTV => isObj(v as TV) && ['list', 'tuple', 'set', 'deque'].includes((v as ListTV).t)
const isDict = (v: TV | undefined): v is DictTV => isObj(v as TV) && (v as DictTV).t === 'dict'
const isRef = (v: TV | undefined): v is { t: 'ref'; id: number } => isObj(v as TV) && (v as { t: string }).t === 'ref'
/** A value record without identity (a Swift or C# struct): its class and fields, inline. */
const isRec = (v: TV | undefined): v is { t: 'rec'; c: string; f: Record<string, TV> } => isObj(v as TV) && (v as { t: string }).t === 'rec'
const isScalarTV = (v: TV) => !isObj(v) || ['big', 'num', 'str', 'at'].includes((v as { t: string }).t)

/**
 * "Infinity" as programs write it (float('inf'), 10**9, 1e18, INT_MAX…) is
 * drawn as ∞ — only when the code itself uses such a value, so a real
 * 1000000000 in someone's data stays a number.
 */
const INF_NUMS = new Set(['inf', '1000000000', '1000000000000000000', '2147483647', '9223372036854775807', '4611686018427387903'])
const INF_CODE = /float\(\s*['"]-?inf['"]\s*\)|math\.inf|\bINF\b|\binf\b|10\s*\*\*\s*(9|18)\b|\b1e(9|18)\b|maxsize|INT_MAX|LLONG_MAX|MAX_VALUE|Infinity/i
let infinityInCode = false
function inf(x: string): Scalar | undefined {
  if (!infinityInCode) return undefined
  const neg = x.startsWith('-')
  return INF_NUMS.has(neg ? x.slice(1) : x) ? (neg ? '-∞' : '∞') : undefined
}

/** A tracer value as a plain scalar for a box or card. */
function scalar(v: TV, heap: Map<number, HeapObj>): Scalar {
  if (v === null || typeof v === 'boolean') return v
  if (typeof v === 'number') return (Number.isInteger(v) && inf(String(v))) || v
  if (typeof v === 'string') return v
  if ('s' in v) return inf(v.s) ?? v.s
  return show(v, heap)
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/* ── what the source says about each name ── */
export interface CodeFacts {
  lines: string[]
  /** name → index expressions used with it: "i", "j+1", "mid". */
  index: Map<string, Set<string>>
  /** name → [row expr, col expr] pairs: dp[i][j]. */
  index2: Map<string, Set<string>>
  /**
   * C / C++ arrays declared inside a function with no value (`int a[100];`):
   * until the program writes them they hold leftover memory, so only the
   * part it has written is drawn.
   */
  unset: Set<string>
  src: string
}

export function codeFacts(src: string): CodeFacts {
  const index = new Map<string, Set<string>>()
  const index2 = new Map<string, Set<string>>()
  const EXPR = String.raw`[A-Za-z_]\w*(?:\s*[-+]\s*\d+)?`
  const one = new RegExp(String.raw`\b([A-Za-z_]\w*)\s*\[\s*(${EXPR})\s*\](?!\s*\[)`, 'g')
  const two = new RegExp(String.raw`\b([A-Za-z_]\w*)\s*\[\s*(${EXPR})\s*\]\s*\[\s*(${EXPR})\s*\]`, 'g')
  const norm = (e: string) => e.replace(/\s+/g, '')
  for (const m of src.matchAll(one)) {
    if (!index.has(m[1])) index.set(m[1], new Set())
    index.get(m[1])!.add(norm(m[2]))
  }
  for (const m of src.matchAll(two)) {
    if (!index2.has(m[1])) index2.set(m[1], new Set())
    index2.get(m[1])!.add(`${norm(m[2])},${norm(m[3])}`)
  }
  const unset = new Set<string>()
  const DECL = /^\s+(?!(?:return|delete|throw|goto|case|else|static)\b)(?:(?:const|unsigned|signed|long|short|struct)\s+)*[A-Za-z_][\w:]*(?:<[^;=]*>)?\s+\**\s*[A-Za-z_]\w*\s*(?:\[[^\]]*\])+(?:\s*,\s*\**\s*[A-Za-z_]\w*\s*(?:\[[^\]]*\])*)*\s*;\s*(?:\/\/.*)?$/
  for (const line of src.split('\n')) if (DECL.test(line)) for (const m of line.matchAll(/([A-Za-z_]\w*)\s*\[/g)) unset.add(m[1])
  return { lines: src.split('\n'), index, index2, unset, src }
}

/** What an unset array (see CodeFacts.unset) looked like when it appeared, and how far the program has written it. */
interface Unset {
  first: string[]
  used: number
  cols: number
}
function written(seen: Map<string, Unset>, key: string, now: string[], cell?: (i: number) => string[]): Unset {
  const u = seen.get(key)
  if (!u) {
    const fresh = { first: now, used: 0, cols: 0 }
    seen.set(key, fresh)
    return fresh
  }
  now.forEach((x, i) => {
    if (x === u.first[i]) return
    u.used = Math.max(u.used, i + 1)
    if (cell) {
      const before = JSON.parse(u.first[i] ?? '[]') as unknown[]
      cell(i).forEach((c, j) => c !== JSON.stringify(before[j]) && (u.cols = Math.max(u.cols, j + 1)))
    }
  })
  return u
}

const uses = (f: CodeFacts, name: string, re: string) => new RegExp(String.raw`\b${esc(name)}\s*\.\s*${re}`).test(f.src)
/** Go has no push / pop: `st = append(st, x)` and `st = st[:len(st)-1]`. */
const goPush = (f: CodeFacts, name: string) => new RegExp(String.raw`\b${esc(name)}\s*=\s*append\s*\(\s*${esc(name)}\s*,`).test(f.src)
const goPopBack = (f: CodeFacts, name: string) => new RegExp(String.raw`\b${esc(name)}\s*=\s*${esc(name)}\s*\[\s*:\s*len\s*\(\s*${esc(name)}\s*\)\s*-\s*1\s*\]`).test(f.src)
const goPopFront = (f: CodeFacts, name: string) => new RegExp(String.raw`\b${esc(name)}\s*=\s*${esc(name)}\s*\[\s*1\s*:\s*\]`).test(f.src)
const stackish = (f: CodeFacts, name: string) =>
  (uses(f, name, String.raw`(append|push|push_back|add|addLast|offerLast)\s*\(`) && uses(f, name, String.raw`(pop|pop_back|removeLast|pollLast)\s*\(\s*\)`)) ||
  (goPush(f, name) && goPopBack(f, name)) ||
  /^(stack|stk|st)$/i.test(name)
const queueMethods = String.raw`(popleft|appendleft|pop\s*\(\s*0\s*\)|poll|offer|shift|unshift|pop_front|push_front|front|peekFirst|pollFirst)`
const queueish = (f: CodeFacts, name: string, v: ListTV) =>
  // A Java ArrayDeque used only with push / pop is a stack.
  (v.t === 'deque' && !(uses(f, name, String.raw`push\s*\(`) && uses(f, name, String.raw`pop\s*\(\s*\)`) && !uses(f, name, queueMethods))) ||
  uses(f, name, queueMethods) ||
  goPopFront(f, name) ||
  /^(queue|q|dq|bfs)$/i.test(name)
const graphish = (f: CodeFacts, name: string) =>
  /^(adj|adjacency|graph|g|edges|nbrs?|neighbou?rs|children|tree)$/i.test(name) || new RegExp(String.raw`for\s*\(?.*\b(in|of|:)\s*${esc(name)}\s*\[`).test(f.src) || new RegExp(String.raw`\b${esc(name)}\s*\[[^\]]+\]\s*\.\s*forEach\s*\(`).test(f.src)

/** Evaluate "i", "j+1", "mid-1" against the integer variables in scope. */
function evalIndex(expr: string, ints: Map<string, number>): number | null {
  const m = /^([A-Za-z_]\w*)(?:([-+])(\d+))?$/.exec(expr)
  if (!m) return null
  const base = ints.get(m[1])
  if (base === undefined) return null
  return m[2] ? (m[2] === '+' ? base + Number(m[3]) : base - Number(m[3])) : base
}

/* ── identities: a value keeps its id when it moves, so swaps glide ── */
class Ids {
  private next = 1
  private last = new Map<string, { vals: string[]; ids: string[] }>()

  /** Ids for `vals` (JSON strings), following the values from the last time `key` was seen. */
  follow(key: string, vals: string[]): { ids: string[]; roles: Map<number, Role> } {
    const roles = new Map<number, Role>()
    const fresh = () => `${key}#${this.next++}`
    const was = this.last.get(key)
    let ids: string[]
    if (!was) {
      ids = vals.map(fresh)
    } else {
      const a = was.vals
      const b = vals
      if (b.length === a.length) {
        ids = [...was.ids]
        const diff = b.map((v, i) => (v !== a[i] ? i : -1)).filter((i) => i >= 0)
        if (diff.length === 2 && b[diff[0]] === a[diff[1]] && b[diff[1]] === a[diff[0]]) {
          ;[ids[diff[0]], ids[diff[1]]] = [ids[diff[1]], ids[diff[0]]]
          roles.set(diff[0], 'swap').set(diff[1], 'swap')
        } else if (diff.length > 2 && [...diff.map((i) => a[i])].sort().join('\u0000') === [...diff.map((i) => b[i])].sort().join('\u0000')) {
          // The same values, rearranged (a shift or a rotation): follow each value.
          const pool = new Map<string, string[]>()
          diff.forEach((i) => pool.set(a[i], [...(pool.get(a[i]) ?? []), was.ids[i]]))
          diff.forEach((i) => {
            ids[i] = pool.get(b[i])!.shift()!
            roles.set(i, 'swap')
          })
        } else diff.forEach((i) => roles.set(i, 'write'))
      } else if (b.length === a.length + 1) {
        const at = b.findIndex((v, i) => v !== a[i])
        const p = at < 0 ? a.length : at
        if (b.slice(0, p).join('\u0000') === a.slice(0, p).join('\u0000') && b.slice(p + 1).join('\u0000') === a.slice(p).join('\u0000')) {
          ids = [...was.ids.slice(0, p), fresh(), ...was.ids.slice(p)]
          roles.set(p, 'new')
        } else ids = vals.map((v, i) => (a[i] === v ? was.ids[i] : fresh()))
      } else if (b.length === a.length - 1) {
        const at = a.findIndex((v, i) => v !== b[i])
        const p = at < 0 ? b.length : at
        ids = a.slice(p + 1).join('\u0000') === b.slice(p).join('\u0000') ? [...was.ids.slice(0, p), ...was.ids.slice(p + 1)] : vals.map(fresh)
      } else {
        // Bigger change: keep the common start, give the rest new ids.
        ids = vals.map((v, i) => (a[i] === v ? was.ids[i] : fresh()))
        vals.forEach((v, i) => a[i] !== v && roles.set(i, i < a.length ? 'write' : 'new'))
      }
    }
    this.last.set(key, { vals, ids })
    return { ids, roles }
  }
}

const hasCompare = (line: string) => /[<>]=?|==|!=|\bis\b|\bin\b/.test(line.replace(/->|<<|>>/g, ''))

interface Ctx {
  facts: CodeFacts
  /** Unset arrays seen so far, by structure key. */
  unset: Map<string, Unset>
  ids: Ids
  heap: Map<number, HeapObj>
  line: string
  ints: Map<string, number>
  /** Pointers walked along an array (C's p++), by the array's name: pointer name → cell. */
  at: Map<string, Record<string, number>>
}

/** Pointers under an array: index variables that are in range right now. */
function pointersFor(name: string, len: number, ctx: Ctx): Record<string, number> {
  const out: Record<string, number> = {}
  for (const e of ctx.facts.index.get(name) ?? []) {
    const at = evalIndex(e, ctx.ints)
    if (at !== null && at >= 0 && at < len && Object.keys(out).length < 4) out[e] = at
  }
  // Pointers into it: each rides its own cell, named as in the code.
  for (const [p, at] of Object.entries(ctx.at.get(name) ?? {})) if (at >= 0 && at < len && Object.keys(out).length < 6) out[p] = at
  return out
}

/** Cells the line that just ran reads or writes, by evaluating its subscripts. */
function touched(name: string, line: string, ints: Map<string, number>): number[] {
  const out: number[] = []
  const re = new RegExp(String.raw`\b${esc(name)}\s*\[\s*([A-Za-z_]\w*(?:\s*[-+]\s*\d+)?)\s*\](?!\s*\[)`, 'g')
  for (const m of line.matchAll(re)) {
    const at = evalIndex(m[1].replace(/\s+/g, ''), ints)
    if (at !== null) out.push(at)
  }
  return out
}

function arrayOf(key: string, name: string, v: ListTV, ctx: Ctx, label?: string): ArrayState {
  let shown = v.i.slice(0, MAX_CELLS)
  let setNote = ''
  if (ctx.facts.unset.has(name)) {
    const u = written(ctx.unset, key, shown.map((x) => JSON.stringify(x)))
    shown = shown.slice(0, u.used)
    setNote = ` · ${u.used} of ${v.n} set`
  }
  const { ids, roles } = ctx.ids.follow(key, shown.map((x) => JSON.stringify(x)))
  const cells: Cell[] = shown.map((x, i) => ({ id: ids[i], v: scalar(x, ctx.heap) }))
  const rl: Record<number, Role> = Object.fromEntries(roles)
  const looked = hasCompare(ctx.line) ? 'compare' : 'active'
  for (const at of touched(name, ctx.line, ctx.ints)) if (at >= 0 && at < cells.length && !rl[at]) rl[at] = looked
  // `*p = …` or `… *p …`: the cell a pointer reads or writes.
  for (const [p, at] of Object.entries(ctx.at.get(name) ?? {}))
    if (at >= 0 && at < cells.length && !rl[at] && new RegExp(String.raw`\*\s*\(?\s*${esc(p)}\b(?!\s*[-+]\s*\d)`).test(ctx.line)) rl[at] = looked
  const total = v.n
  const tag = v.t === 'set' ? 'set' : v.t === 'tuple' ? 'tuple' : null
  const pointers = v.t === 'set' ? {} : pointersFor(name, cells.length, ctx)
  // A window between two bounds that both index this array (l … r, lo … hi).
  const ranges = []
  for (const [a, b] of WINDOWS) {
    const x = ctx.ints.get(a)
    const y = ctx.ints.get(b)
    const named = [...(ctx.facts.index.get(name) ?? [])]
    const usesBoth = named.some((e) => e.startsWith(a)) && named.some((e) => e.startsWith(b))
    if (x !== undefined && y !== undefined && usesBoth && x <= y && x >= 0 && y < cells.length && !(a === 'i' && b === 'j')) {
      ranges.push({ from: x, to: y, role: 'window' as Role, label: `${a} … ${b}` })
      break
    }
  }
  return {
    kind: 'array',
    id: key,
    label: `${label ?? name}${tag ? ` · ${tag}` : ''}${setNote || (total > shown.length ? ` · first ${shown.length} of ${total}` : '')}`,
    cells,
    roles: rl,
    pointers,
    ranges,
  }
}

function stackOf(key: string, name: string, v: ListTV, ctx: Ctx, queue: boolean): StackState | QueueState {
  const shown = queue ? v.i.slice(0, MAX_CELLS) : v.i.slice(Math.max(0, v.i.length - MAX_CELLS))
  const { ids, roles } = ctx.ids.follow(key, shown.map((x) => JSON.stringify(x)))
  const items = shown.map((x, i) => ({ id: ids[i], v: scalar(x, ctx.heap) }))
  const rl: Record<number, Role> = Object.fromEntries([...roles].filter(([, r]) => r !== 'swap'))
  const label = `${name}${v.n > shown.length ? ` · ${shown.length} of ${v.n}` : ''}`
  return queue ? { kind: 'queue', id: key, label, items, roles: rl } : { kind: 'stack', id: key, label, items, roles: rl }
}

function gridOf(key: string, name: string, v: ListTV, ctx: Ctx, prev?: GridState): GridState {
  let rows = v.i.slice(0, 20).map((r) => (isList(r) ? r.i.slice(0, 20).map((x) => scalar(x, ctx.heap)) : [scalar(r, ctx.heap)]))
  let setNote = ''
  if (ctx.facts.unset.has(name)) {
    const cells = (i: number) => rows[i].map((x) => JSON.stringify(x))
    const u = written(ctx.unset, key, rows.map((r) => JSON.stringify(r)), cells)
    rows = rows.slice(0, u.used).map((r) => r.slice(0, u.cols))
    setNote = ` · ${u.used} of ${v.n} rows set`
  }
  const roles: Record<string, Role> = {}
  rows.forEach((r, i) =>
    r.forEach((x, j) => {
      const before = prev?.rows[i]?.[j]
      if (prev && before !== x) roles[`${i},${j}`] = prev.rows[i] === undefined || before === undefined ? 'new' : 'write'
    }),
  )
  const re = new RegExp(String.raw`\b${esc(name)}\s*\[\s*([^\]]+?)\s*\]\s*\[\s*([^\]]+?)\s*\]`, 'g')
  for (const m of ctx.line.matchAll(re)) {
    const r = evalIndex(m[1].replace(/\s+/g, ''), ctx.ints)
    const c = evalIndex(m[2].replace(/\s+/g, ''), ctx.ints)
    if (r !== null && c !== null && !roles[`${r},${c}`]) roles[`${r},${c}`] = hasCompare(ctx.line) ? 'compare' : 'active'
  }
  const more = setNote || (v.n > rows.length ? ` · first ${rows.length} of ${v.n} rows` : '')
  return { kind: 'grid', id: key, label: `${name}${more}`, rows, roles, rowLabels: rows.map((_, i) => String(i)) }
}

/** An adjacency list (list of lists, or dict of lists) as a graph. */
/** `edges` holding pairs (u, v) or triples (u, v, w): an edge list. */
const edgeListish = (name: string, v: ListTV) =>
  /^(edges?|edge_list|edgelist|es|roads|connections|links|pairs)$/i.test(name) &&
  v.i.length > 0 &&
  v.i.every((x) => isList(x) && (x.i.length === 2 || x.i.length === 3) && x.i.every((y) => typeof y === 'number'))

function edgeListGraphOf(key: string, name: string, v: ListTV, ctx: Ctx): GraphState | null {
  const nodes = new Map<string, { id: string; label: string }>()
  const add = (x: Scalar) => {
    const id = `n${String(x)}`
    if (!nodes.has(id)) nodes.set(id, { id, label: String(x) })
    return id
  }
  const edges = (v.i as ListTV[]).slice(0, 60).map((e) => ({ from: add(scalar(e.i[0], ctx.heap)), to: add(scalar(e.i[1], ctx.heap)), ...(e.i.length === 3 ? { w: scalar(e.i[2], ctx.heap) } : {}) }))
  if (nodes.size > MAX_NODES) return null
  return { kind: 'graph', id: `${key}:edges`, label: `${name} (edge list)`, nodes: [...nodes.values()], edges, directed: false, pointers: {} }
}

function graphOf(key: string, name: string, v: ListTV | DictTV, ctx: Ctx): GraphState | null {
  const pairs: [Scalar, TV][] = isList(v) ? v.i.map((x, i) => [i, x]) : v.k.map(([a, b]) => [scalar(a, ctx.heap), b])
  if (pairs.length > MAX_NODES) return null
  const nodes = new Map<string, { id: string; label: string }>()
  const edges: { from: string; to: string; w?: Scalar }[] = []
  const add = (x: Scalar) => {
    const id = `n${String(x)}`
    if (!nodes.has(id)) nodes.set(id, { id, label: String(x) })
    return id
  }
  for (const [u, list] of pairs) {
    const from = add(u)
    if (!isList(list)) return null
    for (const item of list.i) {
      if (isList(item) && item.i.length === 2 && !isObj(item.i[0])) edges.push({ from, to: add(scalar(item.i[0], ctx.heap)), w: scalar(item.i[1], ctx.heap) })
      else if (!isObj(item)) edges.push({ from, to: add(scalar(item, ctx.heap)) })
      else return null
    }
  }
  if (nodes.size > MAX_NODES) return null
  const has = new Set(edges.map((e) => `${e.from}>${e.to}`))
  const directed = edges.some((e) => !has.has(`${e.to}>${e.from}`))
  const shown = directed ? edges : edges.filter((e) => e.from <= e.to)
  // Variables holding a node right now ride on it (u, v, node, cur…).
  const pointers: Record<string, string | null> = {}
  // With weighted edges, w is a weight, not a node.
  const weighted = edges.some((e) => e.w !== undefined)
  for (const [n, val] of ctx.ints) if (/^(u|v|node|cur|curr|nxt|next|nb|neighbou?r|start|src|s|target|dst|w)$/i.test(n) && !(weighted && /^w$/i.test(n)) && nodes.has(`n${val}`)) pointers[n] = `n${val}`
  return { kind: 'graph', id: key, label: name, nodes: [...nodes.values()], edges: shown, directed, pointers }
}

function mapOf(key: string, name: string, v: DictTV, ctx: Ctx, prev?: MapState): MapState {
  const entries = v.k.slice(0, MAX_CELLS).map(([a, b]) => ({ id: `${key}:${JSON.stringify(a)}`, k: scalar(a, ctx.heap), v: scalar(b, ctx.heap) }))
  const before = new Map((prev?.entries ?? []).map((e) => [e.id, e.v]))
  const roles: Record<string, Role> = {}
  if (prev) for (const e of entries) if (!before.has(e.id)) roles[e.id] = 'new'
    else if (before.get(e.id) !== e.v) roles[e.id] = 'write'
  return { kind: 'map', id: key, label: name, entries, roles, total: v.n }
}

/* ── objects: linked lists and trees ── */
/**
 * An object's fields, looked up without caring about case: Go and C# write
 * `Next` and `Left`, Python and Java `next` and `left`. Names are still shown
 * as the code writes them; only the structural lookups ignore case.
 */
const lowered = new WeakMap<HeapObj, Record<string, TV>>()
function lf(o: HeapObj): Record<string, TV> {
  let low = lowered.get(o)
  if (!low) {
    const m: Record<string, TV> = {}
    for (const [k, x] of Object.entries(o.f)) if (!(k.toLowerCase() in m)) m[k.toLowerCase()] = x
    low = new Proxy(m, {
      get: (t, k) => (typeof k === 'string' ? t[k.toLowerCase()] : undefined),
      has: (t, k) => typeof k === 'string' && k.toLowerCase() in t,
    })
    lowered.set(o, low)
  }
  return low
}

const LINK = ['next', 'nxt', 'link']
const VAL = ['val', 'value', 'v', 'data', 'key', 'item']
function valueOf(o: HeapObj, heap: Map<number, HeapObj>): Scalar {
  for (const f of VAL) if (f in lf(o) && !isObj(lf(o)[f])) return scalar(lf(o)[f], heap)
  const first = Object.values(o.f).find((x) => !isObj(x))
  return first === undefined ? o.c : scalar(first, heap)
}
const refId = (v: TV | undefined) => (isRef(v) ? v.id : null)

function linkedOf(vars: [string, TV][], heap: Map<number, HeapObj>, key: string): ListState | null {
  const isNode = (id: number | null) => id !== null && !!heap.get(id) && LINK.some((f) => f in lf(heap.get(id)!))
  const starts = vars.filter(([, v]) => isNode(refId(v)))
  if (!starts.length) return null
  // Lay the list out from the variable whose chain reaches the most nodes
  // (after a reversal that is `prev`, not `head`), then head-like names first.
  const reach = (id: number | null) => {
    let n = 0
    const been = new Set<number>()
    while (id !== null && isNode(id) && !been.has(id) && n < MAX_NODES) {
      been.add(id)
      n++
      const o = heap.get(id)!
      id = refId(LINK.map((f) => lf(o)[f]).find((x) => x !== undefined))
    }
    return n
  }
  const headish = (a: string) => Number(!/^(head|first|root|start|dummy|l1)$/i.test(a))
  starts.sort(([a, x], [b, y]) => reach(refId(y)) - reach(refId(x)) || headish(a) - headish(b))
  const order: number[] = []
  const seen = new Set<number>()
  // Circular only when one walk comes back to where it started (two walks
  // meeting, as after a reversal, is not a loop).
  let circular = false
  for (const [, v] of starts) {
    const first = refId(v)
    let id = first
    while (id !== null && isNode(id) && !seen.has(id) && order.length < MAX_NODES) {
      seen.add(id)
      order.push(id)
      const o = heap.get(id)!
      id = refId(LINK.map((f) => lf(o)[f]).find((x) => x !== undefined))
      if (id !== null && id === first && order.length > 1) circular = true
    }
  }
  const doubly = order.some((id) => 'prev' in lf(heap.get(id)!))
  const nodes = order.map((id) => {
    const o = heap.get(id)!
    const nx = refId(LINK.map((f) => lf(o)[f]).find((x) => x !== undefined))
    const pv = refId(o.f.prev)
    return { id: `o${id}`, v: valueOf(o, heap), next: nx !== null && seen.has(nx) ? `o${nx}` : null, ...(doubly ? { prev: pv !== null && seen.has(pv) ? `o${pv}` : null } : {}) }
  })
  const pointers: Record<string, string | null> = {}
  for (const [n, v] of starts) pointers[n] = `o${refId(v)}`
  return { kind: 'list', id: key, label: `${starts[0][0]}${doubly ? ' (doubly linked)' : ''}${circular ? ' (circular: the last node points back to the first)' : ''}`, nodes, doubly, pointers }
}

function treeOf(vars: [string, TV][], heap: Map<number, HeapObj>, key: string): TreeState | null {
  const isNode = (id: number | null) => id !== null && !!heap.get(id) && ('left' in lf(heap.get(id)!) || 'right' in lf(heap.get(id)!))
  const starts = vars.filter(([, v]) => isNode(refId(v)))
  if (!starts.length) return null
  const seen = new Set<number>()
  const childOf = new Set<number>()
  const walk = (id: number | null) => {
    if (id === null || !isNode(id) || seen.has(id) || seen.size >= MAX_NODES * 2) return
    seen.add(id)
    const o = heap.get(id)!
    for (const f of ['left', 'right']) {
      const c = refId(lf(o)[f])
      if (c !== null) {
        childOf.add(c)
        walk(c)
      }
    }
  }
  starts.forEach(([, v]) => walk(refId(v)))
  const nodes = [...seen].map((id) => {
    const o = heap.get(id)!
    const kid = (f: string) => {
      const c = refId(lf(o)[f])
      return c !== null && seen.has(c) ? `o${c}` : null
    }
    return { id: `o${id}`, v: valueOf(o, heap), children: [kid('left'), kid('right')] }
  })
  const roots = [...seen].filter((id) => !childOf.has(id)).map((id) => `o${id}`)
  const pointers: Record<string, string | null> = {}
  for (const [n, v] of starts) pointers[n] = `o${refId(v)}`
  const rootName = starts.find(([, v]) => roots.includes(`o${refId(v)}`))?.[0] ?? starts[0][0]
  return { kind: 'tree', id: key, label: rootName, nodes, roots, binary: true, pointers }
}

/* ── more structures: heaps, union-find, segment trees, matrices, N-ary trees, tries, graph objects ── */
const heapish = (f: CodeFacts, name: string) =>
  /^(heap|h|pq|minheap|maxheap|min_heap|max_heap|frontier|open|events)$/i.test(name) || new RegExp(String.raw`\b(heappush|heappop|heapify|heappushpop|heapreplace|nlargest|nsmallest)\s*\(\s*${esc(name)}\b`).test(f.src) ||
  // Go's container/heap: heap.Push(&h, x), heap.Init(&h)
  new RegExp(String.raw`\bheap\.(Push|Pop|Init|Fix|Remove)\s*\(\s*&?\s*${esc(name)}\b`).test(f.src)
const parentish = (name: string) => /^(parent|parents|par|fa|uf|dsu|leader|boss|link|root|roots)$/i.test(name)
const segish = (name: string) => /^(seg|segtree|seg_tree|segment|segment_tree|tree|st|t)$/i.test(name)

/** A list stored as a binary heap, drawn as the tree it stands for: children of i are 2i+1 and 2i+2. */
function heapTreeOf(key: string, name: string, v: ListTV, ctx: Ctx, oneBased = false): TreeState | null {
  const vals = v.i.slice(0, 31)
  const start = oneBased ? 1 : 0
  if (vals.length - start < 1) return null
  const id = (i: number) => `${key}:h${i}`
  const nodes = []
  for (let i = start; i < vals.length; i++) {
    const l = oneBased ? 2 * i : 2 * i + 1
    const r = l + 1
    nodes.push({ id: id(i), v: scalar(vals[i], ctx.heap), children: [l < vals.length ? id(l) : null, r < vals.length ? id(r) : null], note: `[${i}]` })
  }
  const roles: Record<string, Role> = {}
  for (const at of touched(name, ctx.line, ctx.ints)) if (at >= start && at < vals.length) roles[id(at)] = hasCompare(ctx.line) ? 'compare' : 'active'
  return { kind: 'tree', id: `${key}:tree`, label: oneBased ? `${name} as a tree (node i has children 2i, 2i+1)` : `${name} as a heap (top = ${show(vals[0], ctx.heap)})`, nodes, roots: [id(start)], binary: true, roles }
}

/** A union-find parent array as the forest it stands for. */
function forestOf(key: string, name: string, v: ListTV, ctx: Ctx, label = name): TreeState | null {
  const n = Math.min(v.i.length, MAX_NODES)
  const par = v.i.slice(0, n)
  if (!par.every((x) => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x < v.i.length)) return null
  const kids = new Map<number, number[]>()
  const roots: string[] = []
  par.forEach((p, i) => {
    if (p === i || (p as number) >= n) roots.push(`${key}:u${i}`)
    else kids.set(p as number, [...(kids.get(p as number) ?? []), i])
  })
  if (!roots.length) return null
  const nodes = par.map((_, i) => ({ id: `${key}:u${i}`, v: i as Scalar, children: (kids.get(i) ?? []).map((c) => `${key}:u${c}`) }))
  const roles: Record<string, Role> = {}
  for (const at of touched(name, ctx.line, ctx.ints)) if (at >= 0 && at < n) roles[`${key}:u${at}`] = 'active'
  const pointers: Record<string, string | null> = {}
  for (const [k, val] of ctx.ints) if (/^(x|y|a|b|u|v|i|j|node|rx|ry|ra|rb|px|py)$/.test(k) && val >= 0 && val < n) pointers[k] = `${key}:u${val}`
  return { kind: 'tree', id: `${key}:forest`, label: `${label} as sets (each tree is one set; its root is the leader)`, nodes, roots, roles, pointers }
}

/** A square 0/1 (or weight) matrix named like a graph, as the graph it stands for. */
function matrixGraphOf(key: string, name: string, v: ListTV): GraphState | null {
  const n = v.i.length
  if (n < 2 || n > MAX_NODES || !v.i.every((r) => isList(r) && r.i.length === n && r.i.every((x) => typeof x === 'number' || typeof x === 'boolean'))) return null
  const nodes = Array.from({ length: n }, (_, i) => ({ id: `n${i}`, label: String(i) }))
  const edges: { from: string; to: string; w?: Scalar }[] = []
  const rows = v.i as ListTV[]
  const weighted = rows.some((r) => r.i.some((x) => typeof x === 'number' && x !== 0 && x !== 1))
  rows.forEach((r, i) => r.i.forEach((x, j) => x && x !== 0 && i !== j && edges.push({ from: `n${i}`, to: `n${j}`, ...(weighted ? { w: x as Scalar } : {}) })))
  const has = new Set(edges.map((e) => `${e.from}>${e.to}`))
  const directed = edges.some((e) => !has.has(`${e.to}>${e.from}`))
  return { kind: 'graph', id: `${key}:graph`, label: `${name} as a graph`, nodes, edges: directed ? edges : edges.filter((e) => Number(e.from.slice(1)) < Number(e.to.slice(1))), directed }
}

/** Objects with a `children` list or dict (N-ary trees, tries), named after the variable that holds the root. */
function naryOf(vars: [string, TV][], heap: Map<number, HeapObj>, key: string): TreeState | null {
  const KIDS = ['children', 'child', 'kids', 'next', 'nxt', 'links', 'edges']
  const kidsOf = (o: HeapObj): { label: string | null; id: number }[] | null => {
    for (const f of KIDS) {
      const c = lf(o)[f]
      if (isDict(c) && c.k.every(([, b]) => isRef(b) || b === null)) return c.k.filter(([, b]) => isRef(b)).map(([a, b]) => ({ label: String(scalar(a, heap)), id: (b as { id: number }).id }))
      if (isList(c) && c.i.length && c.i.every((b) => isRef(b) || b === null) && (f === 'children' || f === 'child' || f === 'kids' || c.i.length > 2)) return c.i.map((b, i) => (isRef(b) ? { label: c.i.length > 2 && f !== 'children' && f !== 'kids' ? String.fromCharCode(97 + i) : null, id: b.id } : null)).filter((x): x is { label: string | null; id: number } => !!x)
    }
    return null
  }
  const isNode = (id: number | null) => id !== null && !!heap.get(id) && kidsOf(heap.get(id)!) !== null
  const starts = vars.filter(([, v]) => isNode(refId(v)))
  if (!starts.length) return null
  const seen = new Set<number>()
  const childOf = new Set<number>()
  const walk = (id: number) => {
    if (seen.has(id) || seen.size >= MAX_NODES * 2 || !heap.get(id)) return
    seen.add(id)
    for (const k of kidsOf(heap.get(id)!) ?? []) {
      childOf.add(k.id)
      walk(k.id)
    }
  }
  starts.forEach(([, v]) => walk(refId(v)!))
  const trie = [...seen].some((id) => (kidsOf(heap.get(id)!) ?? []).some((k) => k.label !== null))
  const endFlag = (o: HeapObj) => ['end', 'is_end', 'isEnd', 'is_word', 'isWord', 'word', 'terminal', 'leaf'].find((f) => lf(o)[f] === true)
  const nodes = [...seen].map((id) => {
    const o = heap.get(id)!
    const ks = (kidsOf(o) ?? []).filter((k) => seen.has(k.id))
    const val = VAL.map((f) => lf(o)[f]).find((x) => x !== undefined && !isObj(x as TV))
    return {
      id: `o${id}`,
      v: (val !== undefined ? scalar(val as TV, heap) : trie ? (endFlag(o) ? '●' : '') : o.c) as Scalar,
      children: ks.map((k) => `o${k.id}`),
      edgeLabels: ks.map((k) => k.label),
    }
  })
  const roots = [...seen].filter((id) => !childOf.has(id)).map((id) => `o${id}`)
  const pointers: Record<string, string | null> = {}
  for (const [n, v] of starts) pointers[n] = `o${refId(v)}`
  const rootName = starts.find(([, v]) => roots.includes(`o${refId(v)}`))?.[0] ?? starts[0][0]
  return { kind: 'tree', id: key, label: trie ? `${rootName} (trie; ● ends a word)` : rootName, nodes, roots, pointers }
}

/** Objects that list their neighbours (`neighbors`, `adj`, `edges`) as a graph. */
function objGraphOf(vars: [string, TV][], heap: Map<number, HeapObj>, key: string): GraphState | null {
  const NB = ['neighbors', 'neighbours', 'adj', 'adjacent', 'edges', 'out']
  const nbOf = (o: HeapObj) => {
    for (const f of NB) {
      const c = lf(o)[f]
      if (isList(c) && c.i.every((b) => isRef(b))) return c.i.map((b) => (b as { id: number }).id)
    }
    return null
  }
  const starts = vars.filter(([, v]) => isRef(v) && heap.get(v.id) && nbOf(heap.get(v.id)!))
  if (!starts.length) return null
  const seen = new Set<number>()
  const queue = starts.map(([, v]) => refId(v)!)
  while (queue.length && seen.size < MAX_NODES) {
    const id = queue.shift()!
    if (seen.has(id) || !heap.get(id)) continue
    seen.add(id)
    queue.push(...(nbOf(heap.get(id)!) ?? []))
  }
  const nodes = [...seen].map((id) => ({ id: `o${id}`, label: String(valueOf(heap.get(id)!, heap)) }))
  const edges = [...seen].flatMap((id) => (nbOf(heap.get(id)!) ?? []).filter((t) => seen.has(t)).map((t) => ({ from: `o${id}`, to: `o${t}` })))
  const has = new Set(edges.map((e) => `${e.from}>${e.to}`))
  const directed = edges.some((e) => !has.has(`${e.to}>${e.from}`))
  const pointers: Record<string, string | null> = {}
  for (const [n, v] of starts) pointers[n] = `o${refId(v)}`
  return { kind: 'graph', id: key, label: starts[0][0], nodes, edges: directed ? edges : edges.filter((e) => e.from < e.to), directed, pointers }
}

/* ── nested dicts (tries written as dicts of dicts) ── */
const END_KEYS = ['$', '#', '*', 'end', '_end', 'is_end', 'isEnd', 'END', '__end__']
const isNested = (v: DictTV) => v.k.some(([, b]) => isDict(b))

/** A dict of dicts as a tree: each key is an edge, a word's end mark (`$`, `end`…) puts ● on the node. */
function dictTreeOf(key: string, name: string, v: DictTV, heap: Map<number, HeapObj>, prev?: Set<string>): TreeState {
  const nodes: TreeNode[] = []
  const paths = new Map<string, string>()
  let ended = false
  const walk = (d: DictTV, id: string) => {
    const node: TreeNode = { id, v: '', children: [], edgeLabels: [] }
    nodes.push(node)
    paths.set(id, JSON.stringify(d))
    for (const [a, b] of d.k) {
      const k = String(scalar(a, heap))
      if (END_KEYS.includes(k) && !isDict(b)) {
        if (b !== false && b !== null && b !== 0) {
          node.v = '●'
          ended = true
        }
        continue
      }
      if (nodes.length >= MAX_NODES * 2) break
      const cid = `${id}/${k}`
      node.children.push(cid)
      node.edgeLabels!.push(k)
      if (isDict(b)) walk(b, cid)
      else nodes.push({ id: cid, v: scalar(b, heap), children: [] })
    }
  }
  walk(v, `${key}:`)
  const roles: Record<string, Role> = {}
  if (prev) for (const n of nodes) if (!prev.has(n.id)) roles[n.id] = 'new'
  return { kind: 'tree', id: key, label: ended ? `${name} (● ends a word)` : name, nodes, roots: [`${key}:`], roles, _paths: paths } as TreeState & { _paths: Map<string, string> }
}

/* ── recursion: every call so far as a tree ── */
interface CallNode {
  k: number
  fn: string
  label: string
  parent: number | null
  kids: number[]
  at: number
  retAt?: number
  ret?: string
}
function callTree(snaps: Snapshot[]): Map<number, CallNode> | null {
  const calls = new Map<number, CallNode>()
  snaps.forEach((s, idx) => {
    s.stack.forEach((f, i) => {
      if (calls.has(f.k)) return
      const args = f.args.replace(/(^|, )\w+=/g, '$1')
      const label = `${f.fn}(${args.length > 16 ? `${args.slice(0, 15)}…` : args})`
      const parent = i ? s.stack[i - 1].k : null
      calls.set(f.k, { k: f.k, fn: f.fn, label, parent, kids: [], at: idx })
      if (parent !== null) calls.get(parent)?.kids.push(f.k)
    })
    const top = s.stack[s.stack.length - 1]
    if (s.kind === 'ret' && s.ret && top && calls.has(top.k)) {
      const c = calls.get(top.k)!
      c.retAt = idx
      c.ret = show(s.ret.value, s.heap)
    }
  })
  // Only worth drawing when a function calls itself.
  const recursive = [...calls.values()].some((c) => c.fn !== 'main' && c.parent !== null && calls.get(c.parent)?.fn === c.fn)
  return recursive ? calls : null
}
function recursionTreeOf(calls: Map<number, CallNode>, idx: number, stack: CallFrame[], ret: boolean): TreeState | null {
  const live = new Set(stack.map((f) => f.k))
  let shown = [...calls.values()].filter((c) => c.fn !== 'main' && c.at <= idx)
  // Several separate calls from the main program (insert(5), insert(1)…):
  // show the one running now, or else the latest, not a row of small trees.
  const rootOf = (c: CallNode): CallNode => {
    let r = c
    while (r.parent !== null && calls.get(r.parent) && calls.get(r.parent)!.fn !== 'main') r = calls.get(r.parent)!
    return r
  }
  const tops = new Set(shown.map((c) => rootOf(c).k))
  let only = false
  if (tops.size > 1) {
    const running = stack.length > 1 ? stack[1].k : null
    const pick = running !== null && tops.has(running) ? running : Math.max(...tops)
    shown = shown.filter((c) => rootOf(c).k === pick)
    only = true
  }
  // Only a call that recurses gets a tree (not compare(…) or a helper called once).
  if (!shown.some((c) => c.parent !== null && calls.get(c.parent)?.fn === c.fn)) return null
  let partial = false
  if (shown.length > 40) {
    // Too many to read: the calls still running and their children.
    shown = shown.filter((c) => live.has(c.k) || (c.parent !== null && live.has(c.parent)))
    partial = true
  }
  const ids = new Set(shown.map((c) => c.k))
  const top = stack[stack.length - 1]?.k
  const roles: Record<string, Role> = {}
  const edgeRoles: Record<string, Role> = {}
  const nodes: TreeNode[] = shown.map((c) => {
    if (c.k === top) roles[`r${c.k}`] = ret ? 'write' : 'active'
    if (c.parent !== null && live.has(c.k) && ids.has(c.parent)) edgeRoles[`r${c.parent}>r${c.k}`] = 'active'
    return {
      id: `r${c.k}`,
      v: c.label,
      children: c.kids.filter((k) => ids.has(k)).map((k) => `r${k}`),
      ...(c.retAt !== undefined && c.retAt <= idx ? { note: `= ${c.ret}` } : {}),
    }
  })
  const roots = shown.filter((c) => c.parent === null || !ids.has(c.parent)).map((c) => `r${c.k}`)
  const label = partial ? 'Recursion tree · the calls still running' : only ? 'Recursion tree · this call from the main program' : 'Recursion tree'
  return { kind: 'tree', id: 'recursion', label, nodes, roots, roles, edgeRoles }
}

/** Two variables that bound a window over an array (l … r, lo … hi). */
const WINDOWS: [string, string][] = [['l', 'r'], ['lo', 'hi'], ['low', 'high'], ['left', 'right'], ['start', 'end'], ['begin', 'end'], ['i', 'j'], ['s', 'e']]

/** A bitmask shown in binary next to its value. */
const maskish = (name: string) => /^(mask|bits?|bitmask|flags?|state|subset|visited_mask|used)$/i.test(name)

/* ── one frame per snapshot ── */
export interface DryFrame extends Frame {
  line: number
  kind: Snapshot['kind']
  /** Characters printed by the end of this step. */
  out: number
}

export function toFrames(snaps: Snapshot[], src: string, stdout: string): DryFrame[] {
  const facts = codeFacts(src)
  infinityInCode = INF_CODE.test(src)
  const ids = new Ids()
  const lastGrid = new Map<string, GridState>()
  const lastMap = new Map<string, MapState>()
  const lastVars = new Map<number, Map<string, TV>>()
  const lastTree = new Map<string, Set<string>>()
  const lastPtr = new Map<string, string>()
  const unset = new Map<string, Unset>()
  const calls = callTree(snaps)
  const frames: DryFrame[] = []

  for (const [idx, s] of snaps.entries()) {
    const top = s.stack[s.stack.length - 1]
    if (!top) continue
    const lineText = facts.lines[s.line - 1] ?? ''
    const ints = new Map<string, number>()
    for (const [n, v] of top.vars) if (typeof v === 'number' && Number.isInteger(v)) ints.set(n, v)
    const at = new Map<string, Record<string, number>>()
    for (const [n, v] of top.vars) if (isObj(v) && v.t === 'at') at.set(v.a, { ...(at.get(v.a) ?? {}), [n]: v.i })
    const ctx: Ctx = { facts, unset, ids, heap: s.heap, line: lineText, ints, at }
    const stage: Structure[] = []
    const cards: Record<string, Scalar> = {}

    /**
     * Draw one variable. `name` drives the picture (pointers, stack or queue,
     * union-find…); `cardName` names its card — a record's field is drawn as
     * `uf.p` from the field `p`.
     */
    const drawOne = (name: string, v: TV, key: string, label: string, global: boolean, cardName = name, depth = 0): void => {
        if (isList(v)) {
          const allScalar = v.i.every(isScalarTV)
          const allLists = v.i.length > 0 && v.i.every((x) => isList(x))
          // Items small enough to sit in a box: values, pairs like (node, dist), objects.
          const smallItems = v.i.every((x) => isScalarTV(x) || isRef(x) || (isList(x) && x.i.length <= 3 && x.i.every(isScalarTV)))
          if (allLists && graphish(facts, name)) {
            // A list of (u, v) or (u, v, w) pairs is an edge list, not an adjacency list.
            const g = (edgeListish(name, v) ? edgeListGraphOf(key, label, v, ctx) : null) ?? matrixGraphOf(key, label, v) ?? graphOf(key, label, v, ctx)
            if (g) {
              if (g.id.endsWith(':graph')) {
                const grid = gridOf(key, label, v, ctx, lastGrid.get(key))
                lastGrid.set(key, grid)
                stage.push(grid)
              }
              stage.push(g)
              return
            }
          }
          if (allLists && v.i.every((x) => isList(x) && x.i.every(isScalarTV)) && !((queueish(facts, name, v) || stackish(facts, name) || heapish(facts, name)) && v.i.every((x) => isList(x) && x.i.length <= 3))) {
            const g = gridOf(key, label, v, ctx, lastGrid.get(key))
            lastGrid.set(key, g)
            stage.push(g)
          } else if (smallItems && !heapish(facts, name) && (queueish(facts, name, v) || stackish(facts, name))) {
            stage.push(stackOf(key, label, v, ctx, queueish(facts, name, v)))
          } else if (smallItems) {
            stage.push(arrayOf(key, name, v, ctx, label))
            // The same list read as the structure it encodes.
            if (heapish(facts, name)) {
              const t = heapTreeOf(key, name, v, ctx)
              if (t) stage.push(t)
            } else if ((parentish(name) || (/^(p|pa|f|fa)$/i.test(name) && /\bfind\s*\(/i.test(facts.src))) && allScalar) {
              const t = forestOf(key, name, v, ctx, label)
              if (t) stage.push(t)
            } else if (segish(name) && allScalar && v.i.length >= 3 && v.i.length <= 63) {
              const t = heapTreeOf(key, name, v, ctx, /\b(2\s*\*\s*\w+|\w+\s*\*\s*2|\w+\s*<<\s*1)\b/.test(facts.src) && !/2\s*\*\s*\w+\s*\+\s*2/.test(facts.src))
              if (t) stage.push(t)
            }
          } else if (!global) cards[cardName] = show(v, s.heap)
        } else if (isDict(v)) {
          const g = graphish(facts, name) && v.k.every(([, b]) => isList(b)) ? graphOf(key, label, v, ctx) : null
          if (g) stage.push(g)
          else if (isNested(v)) {
            const t = dictTreeOf(key, label, v, s.heap, lastTree.get(key))
            lastTree.set(key, new Set(t.nodes.map((n) => n.id)))
            stage.push(t)
          } else {
            const m = mapOf(key, label, v, ctx, lastMap.get(key))
            lastMap.set(key, m)
            stage.push(m)
          }
        } else if (typeof v === 'string' && facts.index.has(name) && v.length <= MAX_CELLS) {
          stage.push(arrayOf(key, name, { t: 'list', n: v.length, i: [...v] }, ctx, `${label} · text`))
        } else if (!global && typeof v === 'number' && Number.isInteger(v) && v >= 0 && maskish(name)) cards[cardName] = `${v} = 0b${v.toString(2)}`
        else if (!global && !isRef(v)) cards[cardName] = scalar(v, s.heap)
        else if (isRec(v)) record(cardName, v.c, v.f, key, label, global, depth)
        else if (isRef(v)) {
          const o = s.heap.get(v.id)
          const structural = o && (LINK.some((l) => l in lf(o)) || 'left' in lf(o) || 'right' in lf(o) || ['children', 'child', 'kids', 'neighbors', 'neighbours', 'adj', 'edges'].some((f) => f in lf(o)))
          if (o && !structural) record(cardName, o.c, o.f, key, label, global, depth)
        }
    }

    /**
     * A plain record (a struct, or an object with no links: a union-find, a
     * point, a counter): its lists and maps are drawn as themselves, named
     * `uf.p`, and its numbers as cards — not one line of text.
     */
    const record = (name: string, cls: string, fields: Record<string, TV>, key: string, label: string, global: boolean, depth: number) => {
      const entries = Object.entries(fields)
      const containers = entries.filter(([, x]) => isList(x) || isDict(x))
      if (!containers.length || depth > 1) {
        if (!global) cards[name] = `${cls}(${entries.slice(0, 4).map(([k, x]) => `${k}=${show(x, s.heap)}`).join(', ')})`
        return
      }
      const base = label.replace(/ \(main\)$/, '')
      for (const [k, x] of entries) drawOne(k, x, `${key}.${k}`, `${base}.${k}${global ? ' (main)' : ''}`, global, `${name}.${k}`, depth + 1)
    }

    const place = (f: CallFrame, global: boolean) => {
      for (const name of f.order) {
        const v = f.vars.get(name)
        if (v === undefined) continue
        drawOne(name, v, `${f.k}:${name}`, global ? `${name} (main)` : name, global)
      }
    }

    // The running call's variables; containers of the program's main body
    // stay on stage while a function runs (functions often use them).
    place(top, false)
    if (s.stack.length > 1) {
      const main = s.stack[0]
      const own = new Set(top.order)
      place({ ...main, order: main.order.filter((n) => !own.has(n)) }, true)
    }

    // Objects: named after the variable that holds them (head, root, node…).
    // Inside a function, the main body's objects stay visible too.
    const refVars: [string, TV][] = [...top.vars.entries()].filter(([, v]) => isRef(v))
    if (s.stack.length > 1) for (const [n, v] of s.stack[0].vars) if (isRef(v) && !top.vars.has(n)) refVars.push([n, v])
    const tree = treeOf(refVars, s.heap, `${top.k}:tree`)
    const nary = tree ? null : naryOf(refVars, s.heap, `${top.k}:nary`)
    const graphObj = tree || nary ? null : objGraphOf(refVars, s.heap, `${top.k}:graphobj`)
    const list = tree || nary || graphObj ? null : linkedOf(refVars, s.heap, `${top.k}:list`)
    for (const st of [list, tree, nary, graphObj]) if (st) stage.push(st)

    // A variable holding part of a nested dict (node = node[ch]) rides on
    // that node of the tree instead of being drawn on its own.
    const dictTrees = stage.filter((x): x is TreeState & { _paths: Map<string, string> } => x.kind === 'tree' && '_paths' in x)
    if (dictTrees.length) {
      for (const f of [top, ...(s.stack.length > 1 ? [s.stack[0]] : [])])
        for (const [n, v] of f.vars) {
          if (!isDict(v)) continue
          const js = JSON.stringify(v)
          for (const t of dictTrees) {
            if (t.id === `${f.k}:${n}`) continue
            let hits = [...t._paths].filter(([, p]) => p === js).map(([id]) => id)
            // Equal sub-dicts ("cat" and "car" both end in {"$": True}): keep
            // the one that follows on from where this variable just was.
            const was = lastPtr.get(`${t.id}>${n}`)
            if (hits.length > 1 && was) hits = hits.filter((id) => id === was || (id.startsWith(`${was}/`) && !id.slice(was.length + 1).includes('/')))
            if (hits.length !== 1) continue
            lastPtr.set(`${t.id}>${n}`, hits[0])
            t.pointers = { ...t.pointers, [n]: hits[0] }
            const own = stage.findIndex((x) => x.id === `${f.k}:${n}`)
            if (own >= 0) stage.splice(own, 1)
          }
        }
      for (const t of dictTrees) delete (t as Partial<typeof t>)._paths
    }

    // Recursion: the tree of calls so far, with the running one lit.
    const rec = calls ? recursionTreeOf(calls, idx, s.stack, s.kind === 'ret') : null
    if (rec) stage.push(rec)

    // Variable cards, with the value each changed one had before this step.
    const before = lastVars.get(top.k)
    const changed = s.changed.filter((n) => n in cards)
    const prev: Record<string, Scalar> = {}
    for (const n of changed) {
      const b = before?.get(n)
      if (b !== undefined) prev[n] = isList(b) || isDict(b) ? show(b, s.heap) : scalar(b, s.heap)
    }
    lastVars.set(top.k, new Map(top.vars))
    const side: Structure[] = []
    if (s.stack.length > 1 || s.kind === 'ret') {
      const calls: CallsState = {
        kind: 'calls',
        id: 'calls',
        frames: s.stack.map((f, i) => ({
          id: `c${f.k}`,
          name: f.fn,
          args: f.args,
          line: f.line,
          ...(s.kind === 'ret' && i === s.stack.length - 1 && s.ret ? { ret: show(s.ret.value, s.heap) } : {}),
        })),
      }
      side.push(calls)
    }
    if (Object.keys(cards).length) {
      const vars: VarsState = { kind: 'vars', id: `vars:${top.k}`, label: top.fn === 'main' ? 'Variables' : `Variables in ${top.fn}`, vars: cards, changed, prev }
      side.push(vars)
    }
    const printed = stdout.slice(0, s.out)
    if (printed) {
      const out: OutputState = { kind: 'output', id: 'output', label: 'Output', lines: printed.replace(/\n$/, '').split('\n').slice(-30) }
      side.push(out)
    }

    frames.push({ step: `L${s.line}`, line: s.line, kind: s.kind, out: s.out, note: noteFor(s, lineText, top, changed, prev, cards, stage, before), structures: [...stage, ...side] })
  }
  return frames
}

/** One plain sentence for the step. */
/**
 * What changed in a list or map, in the student's own terms: "a[1]: 4 → 2",
 * "a[0] ↔ a[1]", "st gets 5", "q loses 3", "freq[x]: 1 → 2". Null when it is
 * more than a simple change (then the note just says it changed).
 */
function whatChanged(n: string, b: TV | undefined, c: TV | undefined, heap: Map<number, HeapObj>): string | null {
  const v = (x: TV) => show(x, heap)
  if (isList(b) && isList(c)) {
    const bi = b.i.map((x) => JSON.stringify(x))
    const ci = c.i.map((x) => JSON.stringify(x))
    if (c.n === b.n + 1) {
      if (ci.slice(0, bi.length).join() === bi.join()) return `${n} gets ${v(c.i[c.i.length - 1])}`
      if (ci.slice(1).join() === bi.join()) return `${n} gets ${v(c.i[0])} at the front`
    }
    if (c.n === b.n - 1) {
      if (bi.slice(0, ci.length).join() === ci.join()) return `${n} loses ${v(b.i[b.i.length - 1])}`
      if (bi.slice(1).join() === ci.join()) return `${n} loses ${v(b.i[0])} from the front`
    }
    if (c.n !== b.n || bi.length !== ci.length) return null
    const diff = ci.map((x, i) => (x === bi[i] ? -1 : i)).filter((i) => i >= 0)
    if (diff.length === 1) return `${n}[${diff[0]}]: ${v(b.i[diff[0]])} → ${v(c.i[diff[0]])}`
    if (diff.length === 2 && ci[diff[0]] === bi[diff[1]] && ci[diff[1]] === bi[diff[0]]) return `${n}[${diff[0]}] ↔ ${n}[${diff[1]}]`
    if (diff.length === 2) return `${n}[${diff[0]}], ${n}[${diff[1]}] change`
    return null
  }
  if (isDict(b) && isDict(c)) {
    const bm = new Map(b.k.map(([k, x]) => [JSON.stringify(k), x]))
    const out: string[] = []
    for (const [k, x] of c.k) {
      const key = JSON.stringify(k)
      if (!bm.has(key)) out.push(`${n}[${v(k)}] = ${v(x)}`)
      else if (JSON.stringify(bm.get(key)) !== JSON.stringify(x)) out.push(`${n}[${v(k)}]: ${v(bm.get(key)!)} → ${v(x)}`)
    }
    if (c.n < b.n) {
      const ck = new Set(c.k.map(([k]) => JSON.stringify(k)))
      for (const [k] of b.k) if (!ck.has(JSON.stringify(k))) out.push(`${n} loses ${v(k)}`)
    }
    return out.length && out.length <= 2 ? out.join(', ') : null
  }
  return null
}

function noteFor(s: Snapshot, lineText: string, top: CallFrame, changed: string[], prev: Record<string, Scalar>, cards: Record<string, Scalar>, stage: Structure[], before?: Map<string, TV>): string {
  const code = lineText.trim().replace(/\s+/g, ' ')
  const short = code.length > 60 ? `${code.slice(0, 57)}…` : code
  if (s.kind === 'call') return `Call ${top.fn}(${top.args}).`
  if (s.kind === 'ret') return `${s.ret?.fn ?? top.fn} returns ${show(s.ret?.value ?? null, s.heap)}.`
  if (s.kind === 'exc') return `Line ${s.line} stops with an error — ${s.error}.`
  const parts: string[] = []
  for (const n of changed.slice(0, 3)) parts.push(n in prev ? `${n}: ${String(prev[n])} → ${String(cards[n])}` : `${n} = ${String(cards[n])}`)
  const moved = s.changed.filter((n) => !(n in cards)).filter((n) => stage.some((x) => x.id === `${top.k}:${n}`))
  for (const n of moved.slice(0, 2)) {
    const st = stage.find((x) => x.id === `${top.k}:${n}`)
    const r = st && 'roles' in st && st.roles ? Object.values(st.roles) : []
    const exact = whatChanged(n, before?.get(n), top.vars.get(n), s.heap)
    parts.push(exact ?? (r.includes('swap') ? `${n}: two values swap` : r.includes('new') ? `${n} grows` : `${n} changes`))
  }
  const text = `Line ${s.line}: ${short || '(end)'}${parts.length ? ` — ${parts.join(', ')}` : ''}`
  // No full stop after code that already ends in punctuation ("for …:", "x = 1;").
  return /[.:;{}]$/.test(text) ? text : `${text}.`
}
