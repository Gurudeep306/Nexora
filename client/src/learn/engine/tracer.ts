import type {
  Arrow,
  ArrayState,
  Cell,
  Frame,
  GraphEdge,
  GraphNode,
  GraphState,
  GridArrow,
  GridState,
  HashState,
  ListNode,
  ListState,
  MeterState,
  OutputState,
  QueueState,
  Range,
  Role,
  Scalar,
  StackState,
  Structure,
  TreeNode,
  TreeState,
  VarsState,
} from './types'

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
  arrows: Arrow[] = []
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
  /** Clears roles and arrows (pointers and ranges stay until changed). */
  clear() {
    this.roles = {}
    this.arrows = []
    return this
  }
  arrow(from: number, to: number, label?: string, role?: Role) {
    this.arrows.push({ from, to, label, role })
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
      arrows: this.arrows.map((a) => ({ ...a })),
    }
  }
}

export class TMeter {
  value = 0
  role?: Role
  id: string
  label?: string
  marks: { label: string; value: number }[]
  constructor(id: string, label?: string, marks: { label: string; value: number }[] = []) {
    this.id = id
    this.label = label
    this.marks = marks
  }
  add(k = 1) {
    this.value += k
    return this
  }
  snap(): MeterState {
    return { kind: 'meter', id: this.id, label: this.label, value: this.value, marks: this.marks.map((m) => ({ ...m })), role: this.role }
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
  get length() {
    return this.items.length
  }
  role(i: number, r: Role | null) {
    if (r == null) delete this.roles[i]
    else this.roles[i] = r
    return this
  }
  /** Sets a value in place (e.g. a stack frame's partial result). */
  set(i: number, v: Scalar) {
    if (this.items[i]) this.items[i] = { ...this.items[i], v }
    return this
  }
  clear() {
    this.roles = {}
    return this
  }
  snap(): StackState | QueueState {
    return { kind: this.kind, id: this.id, label: this.label, items: this.items.map((c) => ({ ...c })), roles: { ...this.roles } }
  }
}

export class TGrid {
  roles: Record<string, Role> = {}
  arrows: GridArrow[] = []
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
    return this
  }
  clear() {
    this.roles = {}
    this.arrows = []
    return this
  }
  /** Keep these roles, drop the rest (e.g. keep 'done' cells, clear 'active'). */
  keep(...roles: Role[]) {
    for (const k of Object.keys(this.roles)) if (!roles.includes(this.roles[k])) delete this.roles[k]
    return this
  }
  /** Draw a dependency arrow from one cell to another (cleared by clear()). */
  arrow(from: [number, number], to: [number, number], label?: string, role?: Role) {
    this.arrows.push({ from, to, label, role })
    return this
  }
  snap(): GridState {
    return {
      kind: 'grid',
      id: this.id,
      label: this.opts.label,
      rows: this.rows.map((r) => [...r]),
      roles: { ...this.roles },
      rowLabels: this.opts.rowLabels,
      colLabels: this.opts.colLabels,
      arrows: this.arrows.map((a) => ({ ...a, from: [...a.from] as [number, number], to: [...a.to] as [number, number] })),
    }
  }
}

/* ── Linked list ─────────────────────────────────────────────────────── */

/**
 * A linked list the algorithm rewires. Node ids are stable, so relinking
 * animates the arrows while the boxes stay put (or glide when `order()` /
 * `relayout()` changes where they are drawn).
 *
 *   const L = t.list('L', [3, 1, 4], { label: 'list' })
 *   let cur = L.head
 *   while (cur) { L.ptr('cur', cur).role(cur, 'active'); t.step(...); cur = L.next(cur) }
 */
export class TList {
  id: string
  label?: string
  doubly: boolean
  nodes = new Map<string, ListNode>()
  order: string[] = []
  head: string | null = null
  roles: Record<string, Role> = {}
  linkRoles: Record<string, Role> = {}
  pointers: Record<string, string | null> = {}
  showHead: boolean
  constructor(id: string, values: Scalar[] = [], opts: { label?: string; doubly?: boolean; showHead?: boolean } = {}) {
    this.id = id
    this.label = opts.label
    this.doubly = !!opts.doubly
    this.showHead = opts.showHead ?? true
    let prev: string | null = null
    for (const v of values) {
      const n = this.add(v)
      if (prev) this.link(prev, n)
      else this.head = n
      prev = n
    }
  }
  /** Create a detached node, drawn at the end (or at display slot `at`). Returns its id. */
  add(v: Scalar, at?: number) {
    const id = nextId()
    this.nodes.set(id, { id, v, next: null, ...(this.doubly ? { prev: null } : {}) })
    if (at == null || at >= this.order.length) this.order.push(id)
    else this.order.splice(Math.max(0, at), 0, id)
    return id
  }
  /** a.next = b (and b.prev = a for doubly linked lists). */
  link(a: string, b: string | null) {
    const n = this.nodes.get(a)
    if (!n) return this
    n.next = b
    if (this.doubly && b) {
      const m = this.nodes.get(b)
      if (m) m.prev = a
    }
    return this
  }
  /** Set only the prev pointer (doubly linked lists). */
  linkPrev(a: string, b: string | null) {
    const n = this.nodes.get(a)
    if (n) n.prev = b
    return this
  }
  setHead(id: string | null) {
    this.head = id
    return this
  }
  next(id: string | null) {
    return id ? (this.nodes.get(id)?.next ?? null) : null
  }
  prev(id: string | null) {
    return id ? (this.nodes.get(id)?.prev ?? null) : null
  }
  v(id: string | null) {
    return id ? this.nodes.get(id)?.v : undefined
  }
  set(id: string, v: Scalar) {
    const n = this.nodes.get(id)
    if (n) n.v = v
    return this
  }
  /** Delete a node from memory (it disappears from the drawing). */
  remove(id: string) {
    this.nodes.delete(id)
    this.order = this.order.filter((x) => x !== id)
    for (const n of this.nodes.values()) {
      if (n.next === id) n.next = null
      if (n.prev === id) n.prev = null
    }
    for (const k of Object.keys(this.pointers)) if (this.pointers[k] === id) this.pointers[k] = null
    if (this.head === id) this.head = null
    return this
  }
  /** Node ids in list order, starting at head (stops on a cycle). */
  ids(from: string | null = this.head) {
    const out: string[] = []
    const seen = new Set<string>()
    for (let c = from; c && !seen.has(c); c = this.nodes.get(c)?.next ?? null) {
      seen.add(c)
      out.push(c)
    }
    return out
  }
  values(from: string | null = this.head) {
    return this.ids(from).map((id) => this.nodes.get(id)!.v)
  }
  /** Set the drawing order explicitly. */
  setOrder(ids: string[]) {
    const rest = this.order.filter((x) => !ids.includes(x))
    this.order = [...ids.filter((x) => this.nodes.has(x)), ...rest]
    return this
  }
  /** Redraw in list order from head; unreachable nodes go to the end. */
  relayout() {
    return this.setOrder(this.ids())
  }
  ptr(name: string, id: string | null | undefined) {
    if (id === undefined) delete this.pointers[name]
    else this.pointers[name] = id
    return this
  }
  role(id: string | null, r: Role | null) {
    if (!id) return this
    if (r == null) delete this.roles[id]
    else this.roles[id] = r
    return this
  }
  /** Highlight a node's next arrow. */
  linkRole(id: string | null, r: Role | null) {
    if (!id) return this
    if (r == null) delete this.linkRoles[id]
    else this.linkRoles[id] = r
    return this
  }
  clear() {
    this.roles = {}
    this.linkRoles = {}
    return this
  }
  snap(): ListState {
    return {
      kind: 'list',
      id: this.id,
      label: this.label,
      doubly: this.doubly,
      nodes: this.order.map((id) => ({ ...this.nodes.get(id)! })),
      roles: { ...this.roles },
      linkRoles: { ...this.linkRoles },
      // `head` is drawn automatically unless the algorithm names it itself (or opts out).
      pointers: this.showHead && !('head' in this.pointers) ? { head: this.head, ...this.pointers } : { ...this.pointers },
    }
  }
}

/* ── Tree / forest ───────────────────────────────────────────────────── */

/**
 * A rooted tree (or forest) the algorithm builds and reshapes. Layout is
 * automatic; ids are stable, so rotations and sift-downs glide.
 *
 *   const T = t.tree('bst', { binary: true, label: 'BST' })
 *   const r = T.node(8); T.setRoot(r)
 *   T.setChild(r, 0, T.node(3))      // left child
 */
export class TTree {
  id: string
  label?: string
  binary: boolean
  nodes = new Map<string, TreeNode>()
  roots: string[] = []
  roles: Record<string, Role> = {}
  edgeRoles: Record<string, Role> = {}
  pointers: Record<string, string | null> = {}
  constructor(id: string, opts: { label?: string; binary?: boolean } = {}) {
    this.id = id
    this.label = opts.label
    this.binary = !!opts.binary
  }
  /** Create a node (detached until linked as a child or made a root). Returns its id. */
  node(v: Scalar, note?: string) {
    const id = nextId()
    this.nodes.set(id, { id, v, children: this.binary ? [null, null] : [], ...(note != null ? { note } : {}) })
    return id
  }
  /** The single root (binary trees, heaps). Replaces all roots. */
  setRoot(id: string | null) {
    this.roots = id ? [id] : []
    return this
  }
  get root() {
    return this.roots[0] ?? null
  }
  addRoot(id: string) {
    if (!this.roots.includes(id)) this.roots.push(id)
    return this
  }
  removeRoot(id: string) {
    this.roots = this.roots.filter((r) => r !== id)
    return this
  }
  /** parent.children[i] = child. For binary trees i = 0 is left, 1 is right. */
  setChild(parent: string, i: number, child: string | null, edgeLabel?: string) {
    const p = this.nodes.get(parent)
    if (!p) return this
    while (p.children.length <= i) p.children.push(null)
    p.children[i] = child
    if (edgeLabel != null) {
      p.edgeLabels = p.edgeLabels ?? []
      while (p.edgeLabels.length <= i) p.edgeLabels.push(null)
      p.edgeLabels[i] = edgeLabel
    }
    return this
  }
  /** Append a child (n-ary trees, tries, recursion trees). */
  addChild(parent: string, child: string, edgeLabel?: string) {
    const p = this.nodes.get(parent)
    if (!p) return this
    return this.setChild(parent, p.children.length, child, edgeLabel)
  }
  left(id: string | null) {
    return id ? (this.nodes.get(id)?.children[0] ?? null) : null
  }
  right(id: string | null) {
    return id ? (this.nodes.get(id)?.children[1] ?? null) : null
  }
  children(id: string) {
    return (this.nodes.get(id)?.children ?? []).filter((c): c is string => !!c)
  }
  parent(id: string) {
    for (const n of this.nodes.values()) if (n.children.includes(id)) return n.id
    return null
  }
  v(id: string | null) {
    return id ? this.nodes.get(id)?.v : undefined
  }
  set(id: string, v: Scalar) {
    const n = this.nodes.get(id)
    if (n) n.v = v
    return this
  }
  note(id: string, text: string | null) {
    const n = this.nodes.get(id)
    if (n) {
      if (text == null) delete n.note
      else n.note = text
    }
    return this
  }
  /** Delete a node; its links from a parent are cut (its children become detached). */
  remove(id: string) {
    this.nodes.delete(id)
    for (const n of this.nodes.values()) n.children = n.children.map((c) => (c === id ? null : c))
    this.roots = this.roots.filter((r) => r !== id)
    for (const k of Object.keys(this.pointers)) if (this.pointers[k] === id) this.pointers[k] = null
    return this
  }
  ptr(name: string, id: string | null | undefined) {
    if (id === undefined) delete this.pointers[name]
    else this.pointers[name] = id
    return this
  }
  role(id: string | null, r: Role | null) {
    if (!id) return this
    if (r == null) delete this.roles[id]
    else this.roles[id] = r
    return this
  }
  edgeRole(parent: string, child: string, r: Role | null) {
    const k = `${parent}>${child}`
    if (r == null) delete this.edgeRoles[k]
    else this.edgeRoles[k] = r
    return this
  }
  clear() {
    this.roles = {}
    this.edgeRoles = {}
    return this
  }
  /** Keep only these roles (e.g. keep 'done' while clearing 'active'). */
  keep(...roles: Role[]) {
    for (const k of Object.keys(this.roles)) if (!roles.includes(this.roles[k])) delete this.roles[k]
    this.edgeRoles = {}
    return this
  }
  /**
   * Build a binary tree from level order, LeetCode style: null marks a missing
   * child. Returns the ids in the same order (null where absent).
   */
  fromLevelOrder(values: (Scalar | null)[]) {
    const ids: (string | null)[] = values.map((v) => (v === null ? null : this.node(v)))
    if (!ids.length || !ids[0]) return ids
    this.setRoot(ids[0])
    const q: string[] = [ids[0]]
    let i = 1
    while (q.length && i < ids.length) {
      const p = q.shift()!
      for (const side of [0, 1]) {
        if (i >= ids.length) break
        const c = ids[i++]
        this.setChild(p, side, c)
        if (c) q.push(c)
      }
    }
    return ids
  }
  /** Build the complete binary tree view of a heap array (node k has children 2k+1, 2k+2). Returns ids by index. */
  fromHeap(values: Scalar[]) {
    const ids = values.map((v, k) => this.node(v, `[${k}]`))
    ids.forEach((id, k) => {
      if (2 * k + 1 < ids.length) this.setChild(id, 0, ids[2 * k + 1])
      if (2 * k + 2 < ids.length) this.setChild(id, 1, ids[2 * k + 2])
    })
    this.setRoot(ids[0] ?? null)
    return ids
  }
  snap(): TreeState {
    return {
      kind: 'tree',
      id: this.id,
      label: this.label,
      binary: this.binary,
      nodes: [...this.nodes.values()].map((n) => ({ ...n, children: [...n.children], ...(n.edgeLabels ? { edgeLabels: [...n.edgeLabels] } : {}) })),
      roots: [...this.roots],
      roles: { ...this.roles },
      edgeRoles: { ...this.edgeRoles },
      pointers: { ...this.pointers },
    }
  }
}

/* ── Graph ───────────────────────────────────────────────────────────── */

/**
 * A graph with fixed node positions (0–100 box) or an automatic circle.
 *
 *   const G = t.graph('g', [{ id: 'A', x: 10, y: 50 }, …], [{ from: 'A', to: 'B', w: 4 }], { directed: true })
 *   G.role('A', 'active').edgeRole('A', 'B', 'active').note('B', 'd=4')
 */
export class TGraph {
  id: string
  label?: string
  directed: boolean
  nodes: GraphNode[]
  edges: GraphEdge[]
  roles: Record<string, Role> = {}
  edgeRoles: Record<string, Role> = {}
  pointers: Record<string, string | null> = {}
  constructor(id: string, nodes: (GraphNode | string)[], edges: GraphEdge[], opts: { label?: string; directed?: boolean } = {}) {
    this.id = id
    this.label = opts.label
    this.directed = !!opts.directed
    this.nodes = nodes.map((n) => (typeof n === 'string' ? { id: n } : { ...n }))
    this.edges = edges.map((e) => ({ ...e }))
  }
  private key(a: string, b: string) {
    if (this.directed) return `${a}-${b}`
    return this.edges.some((e) => e.from === b && e.to === a) && !this.edges.some((e) => e.from === a && e.to === b) ? `${b}-${a}` : `${a}-${b}`
  }
  /** Neighbours of a node (respecting direction), with weights. */
  adj(id: string) {
    const out: { to: string; w?: Scalar }[] = []
    for (const e of this.edges) {
      if (e.from === id) out.push({ to: e.to, w: e.w })
      else if (!this.directed && e.to === id) out.push({ to: e.from, w: e.w })
    }
    return out
  }
  note(id: string, text: string | null) {
    const n = this.nodes.find((x) => x.id === id)
    if (n) {
      if (text == null) delete n.note
      else n.note = text
    }
    return this
  }
  addNode(n: GraphNode | string) {
    this.nodes.push(typeof n === 'string' ? { id: n } : { ...n })
    return this
  }
  addEdge(from: string, to: string, w?: Scalar) {
    this.edges.push({ from, to, ...(w !== undefined ? { w } : {}) })
    return this
  }
  removeEdge(from: string, to: string) {
    this.edges = this.edges.filter((e) => !((e.from === from && e.to === to) || (!this.directed && e.from === to && e.to === from)))
    return this
  }
  setWeight(from: string, to: string, w: Scalar) {
    for (const e of this.edges) if ((e.from === from && e.to === to) || (!this.directed && e.from === to && e.to === from)) e.w = w
    return this
  }
  ptr(name: string, id: string | null | undefined) {
    if (id === undefined) delete this.pointers[name]
    else this.pointers[name] = id
    return this
  }
  role(id: string, r: Role | null) {
    if (r == null) delete this.roles[id]
    else this.roles[id] = r
    return this
  }
  edgeRole(from: string, to: string, r: Role | null) {
    const k = this.key(from, to)
    if (r == null) delete this.edgeRoles[k]
    else this.edgeRoles[k] = r
    return this
  }
  clear() {
    this.roles = {}
    this.edgeRoles = {}
    return this
  }
  /** Keep only node/edge roles in this list. */
  keep(...roles: Role[]) {
    for (const k of Object.keys(this.roles)) if (!roles.includes(this.roles[k])) delete this.roles[k]
    for (const k of Object.keys(this.edgeRoles)) if (!roles.includes(this.edgeRoles[k])) delete this.edgeRoles[k]
    return this
  }
  snap(): GraphState {
    return {
      kind: 'graph',
      id: this.id,
      label: this.label,
      directed: this.directed,
      nodes: this.nodes.map((n) => ({ ...n })),
      edges: this.edges.map((e) => ({ ...e })),
      roles: { ...this.roles },
      edgeRoles: { ...this.edgeRoles },
      pointers: { ...this.pointers },
    }
  }
}

/* ── Hash table (separate chaining) ──────────────────────────────────── */

export class THash {
  id: string
  label?: string
  buckets: Cell[][]
  roles: Record<string, Role> = {}
  constructor(id: string, m: number, opts: { label?: string } = {}) {
    this.id = id
    this.label = opts.label
    this.buckets = Array.from({ length: m }, () => [])
  }
  get size() {
    return this.buckets.length
  }
  /** Append v to bucket b's chain; returns its position in the chain. */
  insert(b: number, v: Scalar) {
    this.buckets[b].push({ id: nextId(), v })
    return this.buckets[b].length - 1
  }
  remove(b: number, i: number) {
    return this.buckets[b].splice(i, 1)[0]
  }
  set(b: number, i: number, v: Scalar) {
    const c = this.buckets[b][i]
    if (c) this.buckets[b][i] = { ...c, v }
    return this
  }
  find(b: number, v: Scalar) {
    return this.buckets[b].findIndex((c) => c.v === v)
  }
  /** Grow/shrink to m buckets (empty) — the caller re-inserts, so the rehash is visible. */
  resize(m: number) {
    const old = this.buckets
    this.buckets = Array.from({ length: m }, () => [])
    return old
  }
  /** Role for a whole bucket (i omitted) or one entry. */
  role(b: number, i: number | null, r: Role | null) {
    const k = i == null ? `${b}` : `${b},${i}`
    if (r == null) delete this.roles[k]
    else this.roles[k] = r
    return this
  }
  clear() {
    this.roles = {}
    return this
  }
  snap(): HashState {
    return { kind: 'hash', id: this.id, label: this.label, buckets: this.buckets.map((b) => b.map((c) => ({ ...c }))), roles: { ...this.roles } }
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
  list(id: string, values: Scalar[] = [], opts?: ConstructorParameters<typeof TList>[2]) {
    const l = new TList(id, values, opts)
    this.live.push(l)
    return l
  }
  tree(id: string, opts?: ConstructorParameters<typeof TTree>[1]) {
    const tr = new TTree(id, opts)
    this.live.push(tr)
    return tr
  }
  graph(id: string, nodes: (GraphNode | string)[], edges: GraphEdge[], opts?: ConstructorParameters<typeof TGraph>[3]) {
    const g = new TGraph(id, nodes, edges, opts)
    this.live.push(g)
    return g
  }
  hash(id: string, m: number, opts?: ConstructorParameters<typeof THash>[2]) {
    const h = new THash(id, m, opts)
    this.live.push(h)
    return h
  }
  meter(id: string, label?: string, marks?: { label: string; value: number }[]) {
    const m = new TMeter(id, label, marks)
    this.live.push(m)
    return m
  }
  /** Moves a structure to the bottom of the stage (e.g. keep a meter below arrays added later). */
  last(s: { snap(): Structure }) {
    this.live = [...this.live.filter((x) => x !== s), s]
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
    const was: Record<string, Scalar> = {}
    for (const k of changed) if (k in prev) was[k] = prev[k]
    this.vars = next
    const structures: Structure[] = this.live.map((s) => s.snap())
    if (Object.keys(next).length) {
      const v: VarsState = { kind: 'vars', id: '__vars', vars: { ...next }, changed, prev: was }
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
