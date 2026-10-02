import { trace } from './tracer'
import type { Algorithm } from './types'

/*
 * Reference animations for the linked-structure views — one per view, each a
 * complete, idiomatic example of the tracer API. Topic authors copy these
 * shapes (see AUTHORING.md); the lab page (/viz-lab, dev only) renders them.
 * Ids start with "ex-" and are never used in lessons.
 */

const LL_CODE = {
  pseudo: `
function reverse(head)
  prev ← null; cur ← head            // @init
  while cur ≠ null                   // @loop
    nxt ← cur.next                   // @save
    cur.next ← prev                  // @flip
    prev ← cur; cur ← nxt            // @advance
  return prev                        // @done`,
  cpp: `
ListNode* reverse(ListNode* head) {
    ListNode *prev = nullptr, *cur = head;   // @init
    while (cur) {                            // @loop
        ListNode* nxt = cur->next;           // @save
        cur->next = prev;                    // @flip
        prev = cur; cur = nxt;               // @advance
    }
    return prev;                             // @done
}`,
  python: `
def reverse(head):
    prev, cur = None, head        # @init
    while cur:                    # @loop
        nxt = cur.next            # @save
        cur.next = prev           # @flip
        prev, cur = cur, nxt      # @advance
    return prev                   # @done`,
}

export const exListReverse: Algorithm = {
  id: 'ex-ll-reverse',
  title: 'Reverse a linked list in place',
  inputs: [{ name: 'arr', label: 'Values', type: 'array', default: '1 2 3 4 5', maxLen: 8 }],
  code: LL_CODE,
  run: ({ arr }) =>
    trace((t) => {
      const L = t.list('L', arr as number[], { label: 'list', showHead: false })
      let prev: string | null = null
      let cur = L.head
      L.ptr('prev', prev).ptr('cur', cur)
      t.step('init', 'prev starts at null, cur at the head. Everything left of cur will be reversed.')
      while (cur) {
        L.clear().role(cur, 'active')
        t.step('loop', `cur is at ${L.v(cur)}.`)
        const nxt = L.next(cur)
        L.ptr('nxt', nxt)
        t.step('save', `Save cur.next (${nxt ? L.v(nxt) : 'null'}) — flipping the arrow would lose it.`)
        L.link(cur, prev).linkRole(cur, 'swap')
        t.step('flip', `Point ${L.v(cur)} back at ${prev ? L.v(prev) : 'null'}.`)
        L.role(cur, 'done')
        prev = cur
        cur = nxt
        L.ptr('prev', prev).ptr('cur', cur).ptr('nxt', undefined)
        t.step('advance', 'Move both pointers one step right.')
      }
      L.clear().setHead(prev).ptr('cur', undefined).ptr('head', prev)
      t.step('done', 'cur fell off the end; prev is the new head.')
    }),
}

export const exBstInsert: Algorithm = {
  id: 'ex-bst-insert',
  title: 'Insert into a binary search tree',
  inputs: [{ name: 'arr', label: 'Insert in order', type: 'array', default: '8 3 10 1 6 14 4 7 13', maxLen: 12 }],
  code: {
    pseudo: `
function insert(root, x)
  if root = null: return new Node(x)   // @place
  if x < root.key                      // @cmp
    root.left ← insert(root.left, x)   // @left
  else root.right ← insert(root.right, x)   // @right
  return root`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const T = t.tree('bst', { binary: true, label: 'BST' })
      for (const x of arr as number[]) {
        T.clear()
        if (!T.root) {
          const n = T.node(x)
          T.setRoot(n).role(n, 'new')
          t.step('place', `Empty tree: ${x} becomes the root.`)
          continue
        }
        let cur = T.root
        for (;;) {
          T.role(cur, 'compare')
          t.step('cmp', `${x} vs ${T.v(cur)}: go ${x < (T.v(cur) as number) ? 'left' : 'right'}.`, { x })
          const side = x < (T.v(cur) as number) ? 0 : 1
          const next = side === 0 ? T.left(cur) : T.right(cur)
          if (!next) {
            const n = T.node(x)
            T.setChild(cur, side, n).role(n, 'new').edgeRole(cur, n, 'new')
            t.step(side === 0 ? 'left' : 'right', `The ${side === 0 ? 'left' : 'right'} slot of ${T.v(cur)} is empty — ${x} goes there.`, { x })
            break
          }
          T.role(cur, 'dim').edgeRole(cur, next, 'active')
          cur = next
        }
      }
    }),
}

export const exGraphBfs: Algorithm = {
  id: 'ex-graph-bfs',
  title: 'Breadth-first search',
  inputs: [{ name: 'src', label: 'Start', type: 'string', default: 'A' }],
  code: {
    pseudo: `
function bfs(s)
  dist[s] ← 0; queue ← [s]            // @init
  while queue not empty
    u ← queue.pop_front()             // @pop
    for v in adj[u]
      if dist[v] = ∞                  // @scan
        dist[v] ← dist[u] + 1; queue.push(v)   // @push`,
  },
  run: ({ src }) =>
    trace((t) => {
      const nodes = [
        { id: 'A', x: 8, y: 50 },
        { id: 'B', x: 32, y: 12 },
        { id: 'C', x: 32, y: 88 },
        { id: 'D', x: 60, y: 30 },
        { id: 'E', x: 60, y: 75 },
        { id: 'F', x: 92, y: 50 },
      ]
      const edges = [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'D' },
        { from: 'C', to: 'E' },
        { from: 'D', to: 'E' },
        { from: 'D', to: 'F' },
        { from: 'E', to: 'F' },
      ]
      const G = t.graph('g', nodes, edges, { label: 'graph' })
      const Q = t.queue('q', 'queue')
      const s = String(src).toUpperCase()
      if (!nodes.some((n) => n.id === s)) throw new Error('Start must be one of A–F.')
      const dist: Record<string, number> = { [s]: 0 }
      G.role(s, 'found').note(s, 'd=0')
      Q.push(s)
      t.step('init', `Start at ${s}: distance 0, and it waits in the queue.`)
      while (Q.length) {
        const u = String(Q.pop()!.v)
        G.keep('done', 'found').role(u, 'active')
        t.step('pop', `Take ${u} from the front of the queue (distance ${dist[u]}).`)
        for (const { to: v } of G.adj(u)) {
          G.edgeRole(u, v, 'active')
          if (dist[v] === undefined) {
            dist[v] = dist[u] + 1
            G.role(v, 'found').note(v, `d=${dist[v]}`)
            Q.push(v)
            t.step('push', `${v} is new: distance ${dist[v]}, join the queue.`)
          } else {
            t.step('scan', `${v} already has a distance — skip it.`)
          }
          G.edgeRole(u, v, dist[v] === dist[u] + 1 ? 'done' : 'dim')
        }
        G.role(u, 'done')
      }
    }),
}

export const exHashChain: Algorithm = {
  id: 'ex-hash-chain',
  title: 'Hashing with separate chaining',
  inputs: [
    { name: 'arr', label: 'Keys', type: 'array', default: '15 11 27 8 12 22 4 19', maxLen: 12 },
    { name: 'm', label: 'Buckets', type: 'number', default: '7', min: 2, max: 11 },
  ],
  code: { pseudo: `
function insert(key)
  b ← key mod m          // @hash
  append key to table[b] // @insert` },
  run: ({ arr, m }) =>
    trace((t) => {
      const H = t.hash('h', m as number, { label: `table (m = ${m})` })
      for (const k of arr as number[]) {
        const b = ((k % (m as number)) + (m as number)) % (m as number)
        H.clear().role(b, null, 'active')
        t.step('hash', `${k} mod ${m} = ${b}.`, { key: k, b })
        const i = H.insert(b, k)
        H.role(b, i, 'new')
        t.step('insert', H.buckets[b].length > 1 ? `Bucket ${b} is taken — ${k} joins its chain (a collision).` : `Bucket ${b} was empty.`, { key: k, b })
      }
    }),
}

export const exDpLcs: Algorithm = {
  id: 'ex-dp-lcs',
  title: 'Longest common subsequence table',
  inputs: [
    { name: 'a', label: 'A', type: 'string', default: 'ABCB' },
    { name: 'b', label: 'B', type: 'string', default: 'BDCAB' },
  ],
  code: { pseudo: `
for i, j:
  if A[i] = B[j]: dp[i][j] ← dp[i−1][j−1] + 1        // @match
  else dp[i][j] ← max(dp[i−1][j], dp[i][j−1])        // @skip` },
  run: ({ a, b }) =>
    trace((t) => {
      const A = String(a).slice(0, 7)
      const B = String(b).slice(0, 8)
      const rows = Array.from({ length: A.length + 1 }, (_, i) => Array.from({ length: B.length + 1 }, (_, j) => (i === 0 || j === 0 ? 0 : null as number | null)))
      const G = t.grid('dp', rows, { label: 'dp', rowLabels: ['', ...A], colLabels: ['', ...B] })
      for (let i = 1; i <= A.length; i++)
        for (let j = 1; j <= B.length; j++) {
          G.clear().role(i, j, 'active')
          if (A[i - 1] === B[j - 1]) {
            G.set(i, j, (G.rows[i - 1][j - 1] as number) + 1)
            G.role(i - 1, j - 1, 'compare').arrow([i - 1, j - 1], [i, j], '+1', 'found')
            t.step('match', `${A[i - 1]} = ${B[j - 1]}: one more than the diagonal.`)
          } else {
            const up = G.rows[i - 1][j] as number
            const left = G.rows[i][j - 1] as number
            G.set(i, j, Math.max(up, left))
            G.role(i - 1, j, 'compare').role(i, j - 1, 'compare').arrow(up >= left ? [i - 1, j] : [i, j - 1], [i, j])
            t.step('skip', `${A[i - 1]} ≠ ${B[j - 1]}: take the better of up (${up}) and left (${left}).`)
          }
        }
    }),
}

export const exHeapPush: Algorithm = {
  id: 'ex-heap-push',
  title: 'Min-heap push (sift up), tree and array together',
  inputs: [{ name: 'arr', label: 'Push in order', type: 'array', default: '9 5 7 2 8 1', maxLen: 10 }],
  code: { pseudo: `
function push(x)
  a.append(x); i ← n − 1                 // @append
  while i > 0 and a[parent(i)] > a[i]   // @cmp
    swap a[i], a[parent(i)]; i ← parent(i)   // @swap` },
  run: ({ arr }) =>
    trace((t) => {
      const T = t.tree('heap', { binary: true, label: 'heap as a tree' })
      const A = t.array('a', [], { label: 'heap as an array' })
      const ids: string[] = []
      const link = (k: number) => {
        if (k > 0) T.setChild(ids[(k - 1) >> 1], (k - 1) % 2, ids[k])
        else T.setRoot(ids[0])
      }
      for (const x of arr as number[]) {
        T.clear()
        A.clear()
        const k0 = ids.length
        ids.push(T.node(x, `[${k0}]`))
        link(k0)
        A.push(x)
        T.role(ids[k0], 'new')
        A.role(k0, 'new')
        t.step('append', `Append ${x} at index ${k0} — the next free leaf.`)
        let i = k0
        while (i > 0) {
          const p = (i - 1) >> 1
          T.clear().role(ids[i], 'compare').role(ids[p], 'compare')
          A.clear().role(i, 'compare').role(p, 'compare')
          if ((A.get(p) as number) <= (A.get(i) as number)) {
            t.step('cmp', `Parent ${A.get(p)} ≤ ${A.get(i)}: heap order holds, stop.`)
            break
          }
          t.step('cmp', `Parent ${A.get(p)} > ${A.get(i)}: they must swap.`)
          // swap values: in the tree the nodes trade places so the motion is visible
          const vi = A.get(i) as number
          const vp = A.get(p) as number
          T.set(ids[i], vp).set(ids[p], vi)
          A.swap(i, p)
          T.clear().role(ids[p], 'swap')
          A.clear().role(p, 'swap').role(i, 'swap')
          t.step('swap', `Swap — ${vi} moves up to index ${p}.`)
          i = p
        }
      }
    }),
}

export const exRecFib: Algorithm = {
  id: 'ex-rec-fib',
  title: 'The recursion tree of fib(n), with the call stack',
  inputs: [{ name: 'n', label: 'n', type: 'number', default: '4', min: 0, max: 5 }],
  code: { pseudo: `
function fib(n)
  if n < 2: return n             // @base
  return fib(n−1) + fib(n−2)     // @call` },
  run: ({ n }) =>
    trace((t) => {
      const T = t.tree('rt', { label: 'recursion tree' })
      const S = t.stack('cs', 'call stack')
      const go = (k: number, parent: string | null): number => {
        const id = T.node(`fib(${k})`)
        if (parent) T.addChild(parent, id)
        else T.setRoot(id)
        S.push(`fib(${k})`)
        T.role(id, 'active')
        if (k < 2) {
          T.role(id, 'done').note(id, `= ${k}`)
          t.step('base', `fib(${k}) is a base case: return ${k}.`)
          S.pop()
          return k
        }
        t.step('call', `fib(${k}) calls fib(${k - 1}) first.`)
        T.role(id, 'compare')
        const r = go(k - 1, id) + go(k - 2, id)
        T.role(id, 'done').note(id, `= ${r}`)
        S.pop()
        t.step('call', `fib(${k}) = ${r}. Notice fib(${k - 2}) was computed more than once.`)
        return r
      }
      go(n as number, null)
    }),
}

export const EXAMPLES: Algorithm[] = [exListReverse, exBstInsert, exGraphBfs, exHashChain, exDpLcs, exHeapPush, exRecFib]
