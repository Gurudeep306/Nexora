import { trace } from '../../../engine/tracer'
import type { Algorithm } from '../../../engine/types'
import { list, rarr, rint } from '../../../algorithms/util'

/* Linked lists — animations, quarter 1: memory model, singly linked ops, doubly & circular lists. */

const vals = (x: unknown, name: string, lo: number, hi: number) => {
  const a = String(x)
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
  if (a.length === 0) throw new Error(`${name} must not be empty.`)
  for (const v of a) if (!Number.isFinite(v) || !Number.isInteger(v) || v < lo || v > hi) throw new Error(`${name}: every value must be a whole number in [${lo}, ${hi}].`)
  return a
}
const nat = (x: unknown, name: string, lo: number, hi: number) => {
  const v = Number(x)
  if (!Number.isFinite(v) || !Number.isInteger(v)) throw new Error(`${name} must be a whole number.`)
  if (v < lo || v > hi) throw new Error(`${name} must be between ${lo} and ${hi}.`)
  return v
}

/* ───────────────────────── 1. Array vs linked list in memory ───────────────────────── */

export const llMemory: Algorithm = {
  id: 'll-memory',
  title: 'Arrays vs linked lists in memory',
  blurb: 'An array owns one contiguous block: index i costs one multiply-add. A linked list scatters its nodes anywhere: reaching node i means following i pointers, one cache miss at a time.',
  legend: { active: 'cell being reached', window: 'contiguous block', compare: 'pointer being followed', done: 'reached' },
  inputs: [
    { name: 'arr', label: 'Values', type: 'array', default: '4 7 2 9 5 1 8 3 6 2', maxLen: 10 },
    { name: 'k', label: 'Index to reach', type: 'number', default: '8', min: 0, max: 7 },
  ],
  random: () => {
    const a = rarr(rint(4, 7), 1, 9)
    return { arr: list(a), k: String(rint(1, a.length - 1)) }
  },
  code: {
    pseudo: `
# Array: one arithmetic step lands on any index
function arrayAt(a, k)
  addr ← base + k·size; return mem[addr]     // @addr
# List: k pointer hops, each to an unknown address
function listAt(head, k)
  cur ← head                                 // @start
  repeat k times
    cur ← mem[cur].next                      // @hop
  return cur.value                           // @reach`,
    cpp: `
int arrayAt(const vector<int>& a, int k) {
    return a[k];                    // base + k*sizeof(int)  @addr
}
int listAt(ListNode* head, int k) {
    ListNode* cur = head;           // @start
    for (int i = 0; i < k; i++)
        cur = cur->next;            // @hop
    return cur->val;                // @reach
}`,
    python: `
def array_at(a, k):
    return a[k]                 # @addr

def list_at(head, k):
    cur = head                  # @start
    for _ in range(k):
        cur = cur.next          # @hop
    return cur.val              # @reach`,
    java: `
int arrayAt(int[] a, int k) {
    return a[k];                // @addr
}
int listAt(ListNode head, int k) {
    ListNode cur = head;        // @start
    for (int i = 0; i < k; i++)
        cur = cur.next;         // @hop
    return cur.val;             // @reach
}`,
  },
  run: ({ arr, k }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const target = nat(k, 'Index', 0, a.length - 1)
      const A = t.array('a', a, { label: 'array — one contiguous block', address: { base: 1000, size: 8 }, capacity: a.length })
      A.range([{ from: 0, to: a.length - 1, role: 'window', label: 'contiguous' }])
      t.step('addr', `The array's cells sit at 1000, 1008, 1016…: address of index ${target} is 1000 + ${target}·8 = ${1000 + target * 8}, computed in one step.`, { op: 'a[k]', cost: 1 })
      A.clear().role(target, 'found')
      t.step('addr', `Memory at ${1000 + target * 8} holds ${a[target]} immediately — random access is arithmetic, not searching.`, { op: 'a[k]', cost: 1 })
      const L = t.list('L', a, { label: 'linked list — nodes scattered in memory' })
      const addrOf = new Map<string, number>()
      L.order.forEach((id, i) => addrOf.set(id, 2000 + ((i * 37) % 11) * 24 + ((i * 53) % 7) * 8))
      let cur = L.head
      let hops = 0
      L.ptr('cur', cur).role(cur!, 'active')
      t.step('start', `The list starts at head. There is no formula for "index ${target}" — only the next pointer inside each node.`, { op: 'walk', cost: 0 })
      for (let i = 0; i < target; i++) {
        L.linkRole(cur!, 'compare')
        t.step('hop', `Read node ${L.v(cur)}'s next pointer — an address we could not have predicted (here ${addrOf.get(L.next(cur)!) ?? '…'}). Follow it.`, { op: 'walk', cost: ++hops })
        cur = L.next(cur)
        L.clear().ptr('cur', cur).role(cur!, 'active')
      }
      L.clear().role(cur!, 'found')
      t.step('reach', `After ${hops} pointer hops we reach value ${L.v(cur)}. The array paid 1 step; the list paid ${hops === 0 ? 0 : hops} — this gap is the whole trade-off.`, { op: 'walk', cost: hops })
    }),
}

/* ───────────────────────── 2. Singly linked list operations ───────────────────────── */

export const llInsertDelete: Algorithm = {
  id: 'll-insert-delete',
  title: 'Push front, push back, insert after, delete — pointer surgery',
  blurb: 'Every singly linked list operation is the same move: rewrite one or two next pointers, in the right order. Watch which pointer must be saved before it is overwritten.',
  legend: { new: 'freshly allocated node', swap: 'pointer being rewritten', active: 'node being examined', removed: 'node being unlinked' },
  inputs: [{ name: 'arr', label: 'Values', type: 'array', default: '3 7 2 5 8 1 6 4', maxLen: 8 }],
  random: () => ({ arr: list(rarr(rint(2, 5), 1, 9)) }),
  code: {
    pseudo: `
function pushFront(x): n ← Node(x); n.next ← head; head ← n        // @pushfront
function pushBack(x):  walk to last; last.next ← Node(x)           // @walkback
                                                                 // @pushback
function insertAfter(p, x): n ← Node(x); n.next ← p.next           // @save
                          p.next ← n                             // @splice
function deleteAfter(p): victim ← p.next; p.next ← victim.next     // @unlink
                         free(victim)                            // @free`,
    cpp: `
void pushFront(ListNode*& head, int x) {
    ListNode* n = new ListNode(x); n->next = head; head = n;   // @pushfront
}
void pushBack(ListNode* head, int x) {
    while (head->next) head = head->next;                      // @walkback
    head->next = new ListNode(x);                              // @pushback
}
void insertAfter(ListNode* p, int x) {
    ListNode* n = new ListNode(x);
    n->next = p->next;                                         // @save
    p->next = n;                                               // @splice
}
void deleteAfter(ListNode* p) {
    ListNode* victim = p->next;
    p->next = victim->next;                                    // @unlink
    delete victim;                                             // @free
}`,
    python: `
def push_front(state, x):
    n = Node(x); n.next = state.head; state.head = n       # @pushfront

def push_back(head, x):
    while head.next: head = head.next                      # @walkback
    head.next = Node(x)                                    # @pushback

def insert_after(p, x):
    n = Node(x); n.next = p.next                           # @save
    p.next = n                                             # @splice

def delete_after(p):
    victim = p.next
    p.next = victim.next                                   # @unlink
    # garbage collector frees victim                       # @free`,
    java: `
ListNode pushFront(ListNode head, int x) {
    ListNode n = new ListNode(x); n.next = head; return n;  // @pushfront
}
void pushBack(ListNode head, int x) {
    while (head.next != null) head = head.next;             // @walkback
    head.next = new ListNode(x);                            // @pushback
}
void insertAfter(ListNode p, int x) {
    ListNode n = new ListNode(x);
    n.next = p.next;                                        // @save
    p.next = n;                                             // @splice
}
void deleteAfter(ListNode p) {
    ListNode victim = p.next;
    p.next = victim.next;                                   // @unlink
    // GC frees victim                                      // @free
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const L = t.list('L', [], { label: 'list', showHead: false })
      const n0 = L.add(a[0])
      L.setHead(n0).ptr('head', n0).role(n0, 'new')
      t.step('pushfront', `pushFront(${a[0]}) on an empty list: the new node's next is null and head points at it.`, { op: 'pushFront', cost: 'O(1)' })
      const x1 = a.length > 1 ? a[1] : 5
      const n1 = L.add(x1)
      L.link(n1, n0).setHead(n1).ptr('head', n1).clear().role(n1, 'new').linkRole(n1, 'swap')
      t.step('pushfront', `pushFront(${x1}): allocate, point the new node at the old head, then move head. Two writes, constant time.`, { op: 'pushFront', cost: 'O(1)' })
      let last = n1
      let steps = 0
      L.clear()
      while (L.next(last)) {
        last = L.next(last)!
        L.ptr('cur', last).role(last, 'active')
        steps++
        t.step('walkback', `pushBack must walk: no size, no last pointer — follow next until it is null.`, { op: 'pushBack', cost: `O(n): ${steps} so far` })
      }
      L.ptr('cur', last).role(last, 'active').linkRole(last, 'compare')
      t.step('walkback', `Node ${L.v(last)} has next = null — it is the tail.`, { op: 'pushBack', cost: `O(n): ${steps} hops` })
      const x2 = a.length > 2 ? a[2] : 9
      const n2 = L.add(x2)
      L.link(last, n2).clear().role(n2, 'new').linkRole(last, 'swap')
      t.step('pushback', `tail.next ← Node(${x2}). One write after the walk: pushBack is O(n) only because finding the tail is O(n).`, { op: 'pushBack', cost: 'O(n)' })
      L.ptr('cur', undefined)
      const mid = n1
      const x3 = 4
      const n3 = L.add(x3)
      L.clear().role(mid, 'active').role(n3, 'new').ptr('p', mid)
      t.step('save', `insertAfter(p = ${L.v(mid)}, ${x3}): first copy p.next into the new node — new.next = ${L.next(mid) ? L.v(L.next(mid)) : 'null'}. Do this first!`, { op: 'insertAfter', cost: 'O(1)' })
      L.link(mid, n3).linkRole(mid, 'swap')
      t.step('splice', `Then p.next ← new. If you wrote this line first, the rest of the list would be unreachable — the classic order bug.`, { op: 'insertAfter', cost: 'O(1)' })
      L.ptr('p', undefined).clear().role(mid, 'active').linkRole(mid, 'compare')
      const victim = L.next(mid)!
      L.role(victim, 'removed')
      t.step('unlink', `deleteAfter(p): remember victim = ${L.v(victim)}, then set p.next = victim.next so the chain skips it.`, { op: 'deleteAfter', cost: 'O(1)' })
      L.link(mid, L.next(victim))
      L.remove(victim)
      L.clear().relayout()
      t.step('free', `Victim freed. Deleting a node you already hold a pointer *before* is O(1); deleting by value or index is O(n) because the walk dominates.`, { op: 'deleteAfter', cost: 'O(1)' })
    }),
}

/* ───────────────────────── 3. Delete by value with a dummy head ───────────────────────── */

export const llDeleteValue: Algorithm = {
  id: 'll-delete-value',
  title: 'Delete every node with value x — and why a dummy head ends the special case',
  blurb: 'Deleting the head needs different code than deleting a middle node… unless a dummy node stands before the head. One loop, zero special cases.',
  legend: { removed: 'node being deleted', active: 'prev examining its next', compare: 'candidate node', swap: 'pointer being rewritten' },
  inputs: [
    { name: 'arr', label: 'Values', type: 'array', default: '2 4 2 7 2 9', maxLen: 10 },
    { name: 'x', label: 'Delete value x', type: 'number', default: '2', min: -99, max: 999 },
  ],
  random: () => {
    const x = rint(1, 6)
    return { arr: list(rarr(rint(5, 8), 1, 6).map((v, i) => (i % 3 === 0 ? x : v))), x: String(x) }
  },
  code: {
    pseudo: `
function removeAll(head, x)
  dummy ← Node(0); dummy.next ← head            // @dummy
  prev ← dummy                                  // @init
  while prev.next ≠ null                        // @loop
    if prev.next.value = x                      // @cmp
      prev.next ← prev.next.next                // @skip
    else prev ← prev.next                       // @advance
  return dummy.next                             // @done`,
    cpp: `
ListNode* removeAll(ListNode* head, int x) {
    ListNode dummy(0); dummy.next = head;        // @dummy
    ListNode* prev = &dummy;                     // @init
    while (prev->next) {                         // @loop
        if (prev->next->val == x)                // @cmp
            prev->next = prev->next->next;       // @skip
        else prev = prev->next;                  // @advance
    }
    return dummy.next;                           // @done
}`,
    python: `
def remove_all(head, x):
    dummy = Node(0); dummy.next = head           # @dummy
    prev = dummy                                 # @init
    while prev.next:                             # @loop
        if prev.next.val == x:                   # @cmp
            prev.next = prev.next.next           # @skip
        else: prev = prev.next                   # @advance
    return dummy.next                            # @done`,
    java: `
ListNode removeAll(ListNode head, int x) {
    ListNode dummy = new ListNode(0); dummy.next = head;  // @dummy
    ListNode prev = dummy;                                // @init
    while (prev.next != null) {                           // @loop
        if (prev.next.val == x)                           // @cmp
            prev.next = prev.next.next;                   // @skip
        else prev = prev.next;                            // @advance
    }
    return dummy.next;                                    // @done
}`,
  },
  run: ({ arr, x }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const target = nat(x, 'x', -99, 999)
      const L = t.list('L', a, { label: 'list', showHead: false })
      const realHead = L.head
      const dummy = L.add(0, 0)
      L.link(dummy, realHead).setHead(dummy).ptr('dummy', dummy)
      L.role(dummy, 'dim')
      t.step('dummy', `Allocate a dummy node pointing at the head. It is never returned; its only job is to give the first real node a "node before it".`, { x: target, deleted: 0 })
      let prev = dummy
      let deleted = 0
      L.ptr('prev', prev)
      t.step('init', `prev starts at the dummy. Invariant: everything up to and including prev is already cleaned.`, { x: target, deleted })
      while (L.next(prev)) {
        const cand = L.next(prev)!
        L.clear().role(dummy, 'dim').role(prev, 'active').role(cand, 'compare')
        t.step('loop', `Look at prev.next = ${L.v(cand)}.`, { x: target, deleted })
        if ((L.v(cand) as number) === target) {
          t.step('cmp', `${L.v(cand)} = ${target}: this node must go.`, { x: target, deleted })
          L.linkRole(prev, 'swap')
          L.link(prev, L.next(cand))
          L.role(cand, 'removed')
          t.step('skip', `prev.next jumps over it. prev does NOT move: the new prev.next has not been examined yet.`, { x: target, deleted: ++deleted })
          L.remove(cand)
          L.clear().role(dummy, 'dim').role(prev, 'active')
        } else {
          t.step('cmp', `${L.v(cand)} ≠ ${target}: it stays.`, { x: target, deleted })
          prev = cand
          L.ptr('prev', prev).role(prev, 'done')
          t.step('advance', `prev moves forward — ${L.v(prev)} is now part of the cleaned prefix.`, { x: target, deleted })
        }
      }
      L.clear().relayout()
      const h = L.next(dummy)
      L.remove(dummy)
      L.setHead(h).ptr('prev', undefined).ptr('dummy', undefined)
      t.step('done', `Return dummy.next — which is correct even when the real head was deleted (or every node was). ${deleted} node(s) removed.`, { x: target, deleted })
    }),
}

/* ───────────────────────── 4. Insert into a sorted list ───────────────────────── */

export const llSortedInsert: Algorithm = {
  id: 'll-sorted-insert',
  title: 'Insert into a sorted list — the first O(n) walk that stops early',
  blurb: 'Find the first node larger than x and splice before it. The dummy head makes "insert before the head" just another splice.',
  legend: { active: 'prev examining its next', compare: 'candidate', new: 'node being inserted', swap: 'pointer being rewritten', done: 'final list' },
  inputs: [
    { name: 'arr', label: 'Sorted values', type: 'array', default: '1 3 5 7 9 11 13 15 17', maxLen: 9 },
    { name: 'x', label: 'Insert x', type: 'number', default: '16', min: -99, max: 999 },
  ],
  random: () => {
    const a = [...rarr(rint(3, 6), 1, 20)].sort((p, q) => p - q)
    return { arr: list(a), x: String(rint(1, 20)) }
  },
  code: {
    pseudo: `
function sortedInsert(head, x)
  dummy ← Node(−∞); dummy.next ← head; prev ← dummy     // @init
  while prev.next ≠ null and prev.next.value < x         // @walk
    prev ← prev.next                                     // @walk
  n ← Node(x); n.next ← prev.next; prev.next ← n         // @splice
  return dummy.next                                      // @done`,
    cpp: `
ListNode* sortedInsert(ListNode* head, int x) {
    ListNode dummy(INT_MIN); dummy.next = head;          // @init
    ListNode* prev = &dummy;
    while (prev->next && prev->next->val < x)            // @walk
        prev = prev->next;                               // @walk
    ListNode* n = new ListNode(x);
    n->next = prev->next; prev->next = n;                // @splice
    return dummy.next;                                   // @done
}`,
    python: `
def sorted_insert(head, x):
    dummy = Node(float('-inf')); dummy.next = head       # @init
    prev = dummy
    while prev.next and prev.next.val < x:               # @walk
        prev = prev.next                                 # @walk
    n = Node(x); n.next = prev.next; prev.next = n       # @splice
    return dummy.next                                    # @done`,
    java: `
ListNode sortedInsert(ListNode head, int x) {
    ListNode dummy = new ListNode(Integer.MIN_VALUE);    // @init
    dummy.next = head;
    ListNode prev = dummy;
    while (prev.next != null && prev.next.val < x)       // @walk
        prev = prev.next;                                // @walk
    ListNode n = new ListNode(x);
    n.next = prev.next; prev.next = n;                   // @splice
    return dummy.next;                                   // @done
}`,
  },
  run: ({ arr, x }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999).sort((p, q) => p - q)
      const target = nat(x, 'x', -99, 999)
      const L = t.list('L', a, { label: 'sorted list', showHead: false })
      const realHead = L.head
      const dummy = L.add('−∞', 0)
      L.link(dummy, realHead).setHead(dummy).role(dummy, 'dim').ptr('prev', dummy)
      t.step('init', `Dummy (−∞) before the head, prev on it. Invariant: every node up to prev is < x, so x belongs right after prev.`, { x: target, hops: 0 })
      let prev = dummy
      let hops = 0
      while (L.next(prev) && (L.v(L.next(prev)) as number) < target) {
        const cand = L.next(prev)!
        L.clear().role(dummy, 'dim').role(cand, 'compare')
        t.step('walk', `${L.v(cand)} < ${target}: x is not here yet — prev advances. (A sorted list lets us stop early; an unsorted one never can.)`, { x: target, hops: ++hops })
        prev = cand
        L.ptr('prev', prev).role(prev, 'done')
      }
      L.clear().role(dummy, 'dim').role(prev, 'active')
      t.step('walk', `Stop: prev.next is ${L.next(prev) ? L.v(L.next(prev)) : 'null'} — not < ${target}. x goes between prev and it.`, { x: target, hops })
      const n = L.add(target)
      L.link(n, L.next(prev)).link(prev, n).clear().role(n, 'new').linkRole(prev, 'swap')
      t.step('splice', `n.next ← prev.next first, then prev.next ← n. Sorted order is preserved: prev < x ≤ prev.next.`, { x: target, hops })
      const newHead = L.next(dummy)
      L.remove(dummy)
      L.setHead(newHead).relayout().clear()
      L.ids(newHead).forEach((id) => L.role(id, 'done'))
      t.step('done', `Insert cost: ${hops} comparisons. Sorted-list insert is O(n) worst case (x largest), O(1) best (x smallest) — unlike an array, no elements shift.`, { x: target, hops })
    }),
}

/* ───────────────────────── 5. Doubly linked list insert & delete ───────────────────────── */

export const llDoublyOps: Algorithm = {
  id: 'll-doubly-ops',
  title: 'Doubly linked insert and delete — four pointers, one exact order',
  blurb: 'Insert between a and b touches a.next, n.prev, n.next, b.prev. Delete touches only the two neighbours. Watch each write happen.',
  legend: { new: 'node being inserted', swap: 'pointer being written', removed: 'node being deleted', active: 'neighbour being rewired' },
  inputs: [
    { name: 'arr', label: 'Values', type: 'array', default: '5 2 9 1 7 4 8 3', maxLen: 8 },
    { name: 'pos', label: 'Insert at index', type: 'number', default: '6', min: 0, max: 8 },
  ],
  random: () => {
    const a = rarr(rint(3, 6), 1, 9)
    return { arr: list(a), pos: String(rint(1, a.length)) }
  },
  code: {
    pseudo: `
function insertAt(pos, x)                       # between a and b
  walk prev to node a at pos−1                  // @walk
  n ← Node(x)
  n.next ← a.next (b); n.prev ← a               // @nfirst
  a.next ← n                                    // @aforward
  if b ≠ null: b.prev ← n                       // @bback
function delete(node d)
  p ← d.prev; q ← d.next                        // @neighbours
  if p: p.next ← q else head ← q                // @cutfront
  if q: q.prev ← p                              // @cutback
  free(d)                                       // @free`,
    cpp: `
void insertAt(ListNode*& head, int pos, int x) {
    ListNode* a = head;                          // @walk
    for (int i = 0; i < pos - 1; i++) a = a->next;   // @walk
    ListNode* n = new ListNode(x);
    ListNode* b = a->next;
    n->next = b; n->prev = a;                    // @nfirst
    a->next = n;                                 // @aforward
    if (b) b->prev = n;                          // @bback
}
void deleteNode(ListNode*& head, ListNode* d) {
    ListNode *p = d->prev, *q = d->next;         // @neighbours
    if (p) p->next = q; else head = q;           // @cutfront
    if (q) q->prev = p;                          // @cutback
    delete d;                                    // @free
}`,
    python: `
def insert_at(head, pos, x):
    a = head                                     # @walk
    for _ in range(pos - 1): a = a.next          # @walk
    n = Node(x); b = a.next
    n.next = b; n.prev = a                       # @nfirst
    a.next = n                                   # @aforward
    if b: b.prev = n                             # @bback

def delete_node(state, d):
    p, q = d.prev, d.next                        # @neighbours
    if p: p.next = q
    else: state.head = q                         # @cutfront
    if q: q.prev = p                             # @cutback
    # GC frees d                                 # @free`,
    java: `
void insertAt(ListNode head, int pos, int x) {
    ListNode a = head;                           // @walk
    for (int i = 0; i < pos - 1; i++) a = a.next;    // @walk
    ListNode n = new ListNode(x);
    ListNode b = a.next;
    n.next = b; n.prev = a;                      // @nfirst
    a.next = n;                                  // @aforward
    if (b != null) b.prev = n;                   // @bback
}
void deleteNode(ListNode d) {
    ListNode p = d.prev, q = d.next;             // @neighbours
    if (p != null) p.next = q;                   // @cutfront
    if (q != null) q.prev = p;                   // @cutback
    // GC frees d                                // @free
}`,
  },
  run: ({ arr, pos }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const p0 = nat(pos, 'pos', 1, a.length)
      const L = t.list('L', a, { label: 'doubly linked list', doubly: true, showHead: false })
      const ids = L.ids()
      let cur = ids[0]
      L.ptr('a', cur).role(cur, 'active')
      t.step('walk', `Insert at index ${p0}: walk a to the node at index ${p0 - 1} (value ${L.v(cur)}). The walk is the O(n) part.`, { pos: p0 })
      for (let i = 1; i < p0; i++) {
        cur = L.next(cur)!
        L.clear().ptr('a', cur).role(cur, 'active')
        t.step('walk', `a advances to ${L.v(cur)} (index ${i}).`, { pos: p0 })
      }
      const bId = L.next(cur)
      const n = L.add(0)
      L.set(n, 7)
      L.linkPrev(n, cur)
      L.clear().role(cur, 'active').role(n, 'new')
      if (bId) L.role(bId, 'compare')
      t.step('nfirst', `New node n = 7 learns both neighbours first: n.next ← ${bId ? L.v(bId) : 'null'}, n.prev ← ${L.v(cur)}. The list itself is still intact — no reader can see a broken state.`, { pos: p0 })
      L.link(cur, n).linkRole(cur, 'swap')
      t.step('aforward', `a.next ← n: from the front, n is now in the list.`, { pos: p0 })
      if (bId) {
        L.linkPrev(bId, n).role(bId, 'active')
        t.step('bback', `b.prev ← n: from the back, n is in too. All four pointers written — n is fully spliced in.`, { pos: p0 })
      } else {
        t.step('bback', `There is no b (insert at the tail): only three writes needed, and the tail grew by one.`, { pos: p0 })
      }
      L.clear()
      const del = L.next(n) ?? n
      const pv = L.prev(del)
      const qv = L.next(del)
      L.role(del, 'removed')
      if (pv) L.role(pv, 'active')
      if (qv) L.role(qv, 'active')
      t.step('neighbours', `Now delete node ${L.v(del)} in O(1) — we already hold it. Grab its neighbours: p = ${pv ? L.v(pv) : 'null'}, q = ${qv ? L.v(qv) : 'null'}.`, { pos: p0 })
      if (pv) {
        L.link(pv, qv).linkRole(pv, 'swap')
        t.step('cutfront', `p.next ← q: the forward chain skips the victim.`, { pos: p0 })
      } else {
        L.setHead(qv)
        t.step('cutfront', `The victim is the head: head ← q instead. A singly linked list cannot do this without a walk — doubly lists delete any held node in O(1).`, { pos: p0 })
      }
      if (qv) {
        L.linkPrev(qv, pv)
        t.step('cutback', `q.prev ← p: the backward chain is healed too.`, { pos: p0 })
      }
      L.remove(del)
      L.clear().relayout()
      t.step('free', `Victim freed. Delete touches exactly two neighbours regardless of list size — that is what the prev pointer buys.`, { pos: p0 })
    }),
}

/* ───────────────────────── 6. Building and walking a circular list ───────────────────────── */

export const llCircularBuild: Algorithm = {
  id: 'll-circular-build',
  title: 'Build a circular list and walk it — where "null" never comes',
  blurb: 'The tail points back at the head. A walk that waits for null loops forever: the loop must stop when it comes back to where it started.',
  legend: { new: 'node being appended', swap: 'tail pointer being rewritten', active: 'current node', done: 'visited', found: 'back to start' },
  inputs: [{ name: 'arr', label: 'Values', type: 'array', default: '4 8 3 7 1 5 9', maxLen: 9 }],
  random: () => ({ arr: list(rarr(rint(3, 7), 1, 9)) }),
  code: {
    pseudo: `
function buildCircular(values)
  head ← Node(values[0]); head.next ← head; tail ← head     // @first
  for each next value v
    n ← Node(v); n.next ← head; tail.next ← n; tail ← n     // @append
function walk(head)
  cur ← head                                                // @start
  do visit(cur)                                             // @hop
  cur ← cur.next while cur ≠ head                           // @hop,stop`,
    cpp: `
ListNode* buildCircular(const vector<int>& v) {
    ListNode* head = new ListNode(v[0]); head->next = head;  // @first
    ListNode* tail = head;
    for (size_t i = 1; i < v.size(); i++) {                  // @append
        ListNode* n = new ListNode(v[i]);                    // @append
        n->next = head; tail->next = n; tail = n;            // @append
    }
    return head;
}
void walk(ListNode* head) {
    ListNode* cur = head;                                    // @start
    do { visit(cur); cur = cur->next; }                      // @hop
    while (cur != head);                                     // @stop
}`,
    python: `
def build_circular(v):
    head = Node(v[0]); head.next = head                      # @first
    tail = head
    for x in v[1:]:                                          # @append
        n = Node(x)                                          # @append
        n.next = head; tail.next = n; tail = n               # @append
    return head

def walk(head):
    cur = head                                               # @start
    while True:
        visit(cur); cur = cur.next                           # @hop
        if cur == head: break                                # @stop`,
    java: `
ListNode buildCircular(int[] v) {
    ListNode head = new ListNode(v[0]); head.next = head;    // @first
    ListNode tail = head;
    for (int i = 1; i < v.length; i++) {                     // @append
        ListNode n = new ListNode(v[i]);                     // @append
        n.next = head; tail.next = n; tail = n;              // @append
    }
    return head;
}
void walk(ListNode head) {
    ListNode cur = head;                                     // @start
    do { visit(cur); cur = cur.next; }                       // @hop
    while (cur != head);                                     // @stop
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const L = t.list('L', [], { label: 'circular list', showHead: false })
      const h = L.add(a[0])
      L.setHead(h).link(h, h).ptr('head', h).ptr('tail', h).role(h, 'new').linkRole(h, 'swap')
      t.step('first', `One node, already circular: head.next points at itself. "tail" is a bookkeeping pointer we keep while building.`, { n: 1 })
      let tail = h
      for (let i = 1; i < a.length; i++) {
        const n = L.add(a[i])
        L.link(n, h)
        L.clear().role(n, 'new')
        t.step('append', `New node ${a[i]} points at head immediately…`, { n: i + 1 })
        L.link(tail, n).linkRole(tail, 'swap').ptr('tail', n)
        t.step('append', `…then tail.next ← n and tail ← n. The ring is never broken: at every instant, following next from head visits every node built so far.`, { n: i + 1 })
        tail = n
      }
      L.clear()
      let cur = h
      L.ptr('cur', cur).role(cur, 'active')
      t.step('start', `Walk: cur ← head. There is no null to stop at — the stop rule is "came back to head".`, { n: a.length, visited: 0 })
      let visited = 0
      for (;;) {
        L.role(cur, visited === 0 ? 'active' : 'done')
        visited++
        t.step('hop', `Visit ${L.v(cur)} (${visited} of ${a.length}).`, { n: a.length, visited })
        cur = L.next(cur)!
        L.ptr('cur', cur)
        if (cur === h) {
          L.clear().role(h, 'found').ptr('cur', cur)
          t.step('stop', `cur = head again — stop. A while (cur != null) loop here would spin forever: circular lists have no end marker.`, { n: a.length, visited })
          break
        }
        L.clear()
        L.ids(h).forEach((id) => {
          if (id === cur) L.role(id, 'active')
        })
      }
    }),
}

/* ───────────────────────── 7. Josephus problem on a circular list ───────────────────────── */

export const llJosephus: Algorithm = {
  id: 'll-josephus',
  title: 'Josephus problem — elimination on a circular list',
  blurb: 'n people in a ring, every k-th is eliminated. A circular list simulates it directly: each elimination is one O(1) unlink; the walk between them is k hops.',
  legend: { active: 'counting position', removed: 'eliminated', done: 'survivor', window: 'the k-step count' },
  inputs: [
    { name: 'n', label: 'People n', type: 'number', default: '10', min: 2, max: 12 },
    { name: 'k', label: 'Every k-th', type: 'number', default: '4', min: 1, max: 9 },
  ],
  random: () => ({ n: String(rint(4, 10)), k: String(rint(2, 5)) }),
  code: {
    pseudo: `
function josephus(n, k)
  build circular list 1..n                       // @build
  cur ← head                                     // @start
  while more than one node remains               // @loop
    move k−1 steps                               // @count
    unlink cur.next (the k-th person)            // @kill
  return the survivor                            // @survivor`,
    cpp: `
int josephus(int n, int k) {
    ListNode* head = buildCircular(n);           // @build
    ListNode* cur = head;                        // @start
    while (cur->next != cur) {                   // @loop
        for (int i = 1; i < k - 1; i++)          // @count
            cur = cur->next;                     // @count
        ListNode* victim = cur->next;            // @kill
        cur->next = victim->next;                // @kill
        delete victim;                           // @kill
    }
    return cur->val;                             // @survivor
}`,
    python: `
def josephus(n, k):
    head = build_circular(list(range(1, n + 1)))  # @build
    cur = head                                    # @start
    while cur.next != cur:                        # @loop
        for _ in range(k - 2):                    # @count
            cur = cur.next                        # @count
        victim = cur.next                         # @kill
        cur.next = victim.next                    # @kill
        # GC frees victim                         # @kill
    return cur.val                                # @survivor`,
    java: `
int josephus(int n, int k) {
    ListNode head = buildCircular(n);            // @build
    ListNode cur = head;                         // @start
    while (cur.next != cur) {                    // @loop
        for (int i = 1; i < k - 1; i++)          // @count
            cur = cur.next;                      // @count
        ListNode victim = cur.next;              // @kill
        cur.next = victim.next;                  // @kill
    }
    return cur.val;                              // @survivor
}`,
  },
  run: ({ n, k }) =>
    trace((t) => {
      const nn = nat(n, 'n', 2, 12)
      const kk = nat(k, 'k', 1, 9)
      const L = t.list('L', Array.from({ length: nn }, (_, i) => i + 1), { label: 'the ring', showHead: false })
      const ids = L.ids()
      ids.forEach((id, i) => L.link(id, ids[(i + 1) % nn]))
      let cur = ids[0]
      L.setHead(ids[0]).ptr('head', ids[0]).ptr('cur', cur)
      t.step('build', `${nn} people numbered 1…${nn} in a ring; the last points back at the first.`, { n: nn, k: kk, alive: nn })
      L.clear().role(cur, 'active')
      t.step('start', `Counting starts at person 1. The count includes the current person, so we move k−1 more steps and eliminate the next node.`, { n: nn, k: kk, alive: nn })
      let alive = nn
      while (alive > 1) {
        L.clear().role(cur, 'active')
        t.step('count', `Count 1 of ${kk}: person ${L.v(cur)}.`, { n: nn, k: kk, alive })
        for (let i = 2; i <= kk - 1; i++) {
          cur = L.next(cur)!
          L.ptr('cur', cur).clear().role(cur, 'window')
          t.step('count', `Count ${i} of ${kk}: person ${L.v(cur)}.`, { n: nn, k: kk, alive })
        }
        const victim = L.next(cur)!
        if (victim === cur) break
        L.role(victim, 'removed')
        t.step('kill', `Person ${L.v(victim)} is the ${kk}-th: unlink with cur.next = victim.next — one O(1) rewrite, no shifting like an array would need.`, { n: nn, k: kk, alive })
        L.link(cur, L.next(victim))
        L.remove(victim)
        alive--
        L.clear().role(cur, 'active')
        t.step('loop', `${alive} left. The next count starts at the person right after the eliminated one (cur.next).`, { n: nn, k: kk, alive })
      }
      L.clear().role(cur, 'done').ptr('cur', cur)
      t.step('survivor', `Survivor: person ${L.v(cur)}. The simulation did about n·k pointer hops — good enough here, but the recurrence J(n,k) = (J(n−1,k)+k) mod n answers it in O(n) with no list at all.`, { n: nn, k: kk, alive: 1, survivor: L.v(cur) as number })
    }),
}

export const algorithms1 = [llMemory, llInsertDelete, llDeleteValue, llSortedInsert, llDoublyOps, llCircularBuild, llJosephus]
