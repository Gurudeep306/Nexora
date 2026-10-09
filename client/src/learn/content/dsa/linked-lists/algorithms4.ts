import { trace } from '../../../engine/tracer'
import type { Algorithm } from '../../../engine/types'
import { list, rarr, rint } from '../../../algorithms/util'

/* Linked lists — animations, quarter 4: copies, rotation, reordering, arithmetic, flattening, insertion sort. */

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

/* ───────────────────────── 25. Copy a list with random pointers ───────────────────────── */

export const llCopyRandom: Algorithm = {
  id: 'll-copy-random',
  title: 'Deep-copy a list with random pointers — the weave trick',
  blurb: 'Each node has next AND a random pointer into the list. The O(1)-space classic: weave clones in behind their originals (A→A′→B→B′), so clone.random = original.random.next finds every target with no hash map.',
  legend: { new: 'clone node', compare: 'random pointer being copied', swap: 'unweaving write', done: 'finished clone list' },
  inputs: [
    { name: 'arr', label: 'Values', type: 'array', default: '7 13 11 10 1 5 3', maxLen: 8 },
    { name: 'rnd', label: 'Random targets (index per node, −1 = null)', type: 'string', default: '-1 0 6 2 0 3 1' },
  ],
  random: () => {
    const n = rint(4, 7)
    const a = rarr(n, 1, 20)
    const r = Array.from({ length: n }, () => (Math.random() < 0.25 ? -1 : rint(0, n - 1)))
    return { arr: list(a), rnd: list(r) }
  },
  code: {
    pseudo: `
function copyRandom(head)
  for each node u: clone u′; weave u → u′ → u.next        // @weave
  for each node u: u′.random ← (u.random ≠ null) ? u.random.next : null   // @random
  unweave: restore the original, thread the clones         // @unweave
  return first clone                                       // @done`,
    cpp: `
Node* copyRandom(Node* head) {
    for (Node* u = head; u; u = u->next->next) {      // @weave
        Node* c = new Node(u->val);                   // @weave
        c->next = u->next; u->next = c;               // @weave
    }
    for (Node* u = head; u; u = u->next->next)        // @random
        u->next->random = u->random ? u->random->next : nullptr;   // @random
    Node dummy(0); Node* tail = &dummy;               // @unweave
    for (Node* u = head; u; u = u->next) {            // @unweave
        Node* c = u->next;                            // @unweave
        u->next = c->next;                            // @unweave
        tail->next = c; tail = c;                     // @unweave
    }
    return dummy.next;                                // @done
}`,
    python: `
def copy_random(head):
    u = head
    while u:                                   # @weave
        c = Node(u.val)                        # @weave
        c.next = u.next; u.next = c            # @weave
        u = c.next                             # @weave
    u = head
    while u:                                   # @random
        u.next.random = u.random.next if u.random else None   # @random
        u = u.next.next                        # @random
    dummy = Node(0); tail = dummy              # @unweave
    u = head
    while u:                                   # @unweave
        c = u.next                             # @unweave
        u.next = c.next                        # @unweave
        tail.next = c; tail = c                # @unweave
        u = u.next                             # @unweave
    return dummy.next                          # @done`,
    java: `
Node copyRandom(Node head) {
    for (Node u = head; u != null; u = u.next.next) {     // @weave
        Node c = new Node(u.val);                         // @weave
        c.next = u.next; u.next = c;                      // @weave
    }
    for (Node u = head; u != null; u = u.next.next)       // @random
        u.next.random = (u.random != null) ? u.random.next : null;   // @random
    Node dummy = new Node(0), tail = dummy;               // @unweave
    for (Node u = head; u != null; u = u.next) {          // @unweave
        Node c = u.next;                                  // @unweave
        u.next = c.next;                                  // @unweave
        tail.next = c; tail = c;                          // @unweave
    }
    return dummy.next;                                    // @done
}`,
  },
  run: ({ arr, rnd }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const r = String(rnd)
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number)
      if (r.length !== a.length) throw new Error('Give one random target per value (use −1 for null).')
      for (const v of r) if (!Number.isInteger(v) || v < -1 || v >= a.length) throw new Error('Random targets must be −1 (null) or a node index.')
      const O = t.list('O', a, { label: 'original', showHead: false })
      const ids = O.ids()
      const randomOf = new Map<string, string | null>()
      ids.forEach((id, i) => randomOf.set(id, r[i] >= 0 ? ids[r[i]] : null))
      ids.forEach((id) => {
        const tgt = randomOf.get(id)
        if (tgt) O.linkRole(id, 'compare')
      })
      t.step('weave', `Each node also has a random pointer (arrows below): node i points at index ${r.join(', ')} (−1 = null). A plain copy cannot set these — the targets do not exist yet.`, { n: a.length, pass: 1 })
      // Pass 1: weave clones in
      const cloneOf = new Map<string, string>()
      for (const u of ids) {
        const c = O.add(`${O.v(u)}′`)
        cloneOf.set(u, c)
        const nxt = O.next(u)
        O.link(c, nxt).link(u, c)
        O.clear()
        ids.forEach((id) => {
          if (randomOf.get(id)) O.linkRole(id, 'dim')
        })
        O.role(c, 'new').linkRole(u, 'swap')
        t.step('weave', `Weave: clone ${O.v(c)} splices in right after ${O.v(u)}. Now the list reads A→A′→B→B′… — every original's clone is exactly one hop away.`, { n: a.length, pass: 1 })
      }
      // Pass 2: copy random pointers
      for (const u of ids) {
        const c = cloneOf.get(u)!
        const tgt = randomOf.get(u)!
        O.clear().role(u, 'compare').role(c, 'new')
        if (tgt) {
          O.linkRole(u, 'compare')
          const cTgt = cloneOf.get(tgt)!
          t.step('random', `${O.v(u)}.random = ${O.v(tgt)}, so its clone's random is one hop further: ${O.v(c)}.random ← ${O.v(cTgt)}. No hash map needed — the weave IS the lookup table.`, { n: a.length, pass: 2 })
          randomOf.set(c, cTgt)
          O.linkRole(c, 'compare')
        } else {
          randomOf.set(c, null)
          t.step('random', `${O.v(u)}.random = null, so ${O.v(c)}.random = null too.`, { n: a.length, pass: 2 })
        }
      }
      // Pass 3: unweave
      const cloneIds = ids.map((id) => cloneOf.get(id)!)
      for (let i = 0; i < ids.length; i++) {
        const u = ids[i]
        const c = cloneIds[i]
        const nxtOrig = ids[i + 1] ?? null
        O.link(u, nxtOrig).linkRole(u, 'swap')
        O.link(c, cloneIds[i + 1] ?? null)
        O.clear().role(c, 'done')
        t.step('unweave', `Unweave: ${O.v(u)}.next ← ${nxtOrig ? O.v(nxtOrig) : 'null'} (original healed), and ${O.v(c)}.next ← ${cloneIds[i + 1] ? O.v(cloneIds[i + 1]) : 'null'} (clone chain built).`, { n: a.length, pass: 3 })
      }
      O.setHead(ids[0]).clear()
      ids.forEach((id) => O.role(id, 'active'))
      cloneIds.forEach((id) => O.role(id, 'done'))
      t.step('done', `Two independent lists share the drawing: originals (blue) fully restored, clones (green) a complete deep copy with random pointers. Three passes, O(n) time, O(1) extra space — the hash-map version costs O(n) space for the original→clone map.`, { n: a.length, pass: 3 })
    }),
}

/* ───────────────────────── 26. Rotate a list right by k ───────────────────────── */

export const llRotate: Algorithm = {
  id: 'll-rotate',
  title: 'Rotate right by k — close the ring, cut at the new tail',
  blurb: 'k can exceed the length, so k %= n first. Then: link tail→head to make a ring, walk to node n−k−1, cut. Two pointer writes total.',
  legend: { swap: 'the cut', new: 'ring-closing link', active: 'new tail', found: 'new head', done: 'rotated' },
  inputs: [
    { name: 'arr', label: 'Values', type: 'array', default: '1 2 3 4 5 6 7 8 9 10 11', maxLen: 12 },
    { name: 'k', label: 'Rotate right by k', type: 'number', default: '4', min: 0, max: 50 },
  ],
  random: () => ({ arr: list(rarr(rint(4, 9), 1, 9)), k: String(rint(0, 14)) }),
  code: {
    pseudo: `
function rotateRight(head, k)
  n ← length; k ← k mod n                          // @mod
  if k = 0: return head                            // @noop
  tail.next ← head                                 // @ring
  walk n − k − 1 steps from head → newTail         // @walk
  newHead ← newTail.next; newTail.next ← null      // @cut
  return newHead                                   // @done`,
    cpp: `
ListNode* rotateRight(ListNode* head, int k) {
    int n = 1; ListNode* tail = head;              // @mod
    while (tail->next) { n++; tail = tail->next; }     // @mod
    k %= n;                                        // @mod
    if (k == 0) return head;                       // @noop
    tail->next = head;                             // @ring
    ListNode* newTail = head;                      // @walk
    for (int i = 0; i < n - k - 1; i++)            // @walk
        newTail = newTail->next;                   // @walk
    ListNode* newHead = newTail->next;             // @cut
    newTail->next = nullptr;                       // @cut
    return newHead;                                // @done
}`,
    python: `
def rotate_right(head, k):
    n, tail = 1, head                    # @mod
    while tail.next:                     # @mod
        n += 1; tail = tail.next         # @mod
    k %= n                               # @mod
    if k == 0: return head               # @noop
    tail.next = head                     # @ring
    new_tail = head                      # @walk
    for _ in range(n - k - 1):           # @walk
        new_tail = new_tail.next         # @walk
    new_head = new_tail.next             # @cut
    new_tail.next = None                 # @cut
    return new_head                      # @done`,
    java: `
ListNode rotateRight(ListNode head, int k) {
    int n = 1; ListNode tail = head;                 // @mod
    while (tail.next != null) { n++; tail = tail.next; }     // @mod
    k %= n;                                          // @mod
    if (k == 0) return head;                         // @noop
    tail.next = head;                                // @ring
    ListNode newTail = head;                         // @walk
    for (int i = 0; i < n - k - 1; i++)              // @walk
        newTail = newTail.next;                      // @walk
    ListNode newHead = newTail.next;                 // @cut
    newTail.next = null;                             // @cut
    return newHead;                                  // @done
}`,
  },
  run: ({ arr, k }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const k0 = nat(k, 'k', 0, 1000)
      const L = t.list('L', a, { label: 'list', showHead: false })
      const ids = L.ids()
      const n = ids.length
      let tail = ids[n - 1]
      const kk = k0 % n
      L.ptr('tail', tail)
      t.step('mod', `Count the length (one walk): n = ${n}, tail = ${L.v(tail)}. k = ${k0} mod ${n} = ${kk} — rotating by n is doing nothing, so only the remainder matters.`, { n, k: k0, keff: kk })
      if (kk === 0) {
        t.step('noop', `k ≡ 0 (mod ${n}): the list is already where it would land. Return head untouched — skipping this check just wastes the ring walk.`, { n, k: k0, keff: 0 })
        return
      }
      L.link(tail, ids[0]).linkRole(tail, 'new')
      t.step('ring', `Close the ring: tail.next ← head. The list is circular for exactly two lines of code.`, { n, k: k0, keff: kk })
      let newTail = ids[0]
      L.ptr('newTail', newTail).role(newTail, 'active')
      t.step('walk', `The last ${kk} nodes move to the front, so the NEW tail is node n − k = ${n - kk} (1-based), i.e. ${n - kk - 1} hops from the head.`, { n, k: k0, keff: kk })
      for (let i = 0; i < n - kk - 1; i++) {
        newTail = L.next(newTail)!
        L.ptr('newTail', newTail).clear().role(newTail, 'active')
        t.step('walk', `Hop ${i + 1} of ${n - kk - 1}: newTail = ${L.v(newTail)}.`, { n, k: k0, keff: kk })
      }
      const newHead = L.next(newTail)!
      L.role(newHead, 'found')
      t.step('cut', `newHead = newTail.next = ${L.v(newHead)}.`, { n, k: k0, keff: kk })
      L.link(newTail, null).linkRole(newTail, 'swap')
      t.step('cut', `Cut the ring: newTail.next ← null. Two writes (ring close + cut) did the whole rotation — no node moved in memory.`, { n, k: k0, keff: kk })
      L.setHead(newHead).ptr('tail', undefined).ptr('newTail', undefined).clear().relayout()
      L.ids().forEach((id) => L.role(id, 'done'))
      t.step('done', `Rotated right by ${kk}: [${L.values().join(' ')}]. Two walks (length + n−k−1 hops), O(n) time, O(1) space.`, { n, k: k0, keff: kk })
    }),
}

/* ───────────────────────── 27. Reorder list L0→Ln→L1→Ln−1→… ───────────────────────── */

export const llReorder: Algorithm = {
  id: 'll-reorder',
  title: 'Reorder L0→Ln→L1→Ln−1→… — three classics chained together',
  blurb: 'You cannot walk a list backwards, so: find the middle (fast/slow), reverse the second half, then zip the two halves alternately. Each phase animated; together they are one O(n)/O(1) pass.',
  legend: { window: 'second half', swap: 'reversal flip', compare: 'zip candidates', new: 'just zipped', done: 'final order' },
  inputs: [{ name: 'arr', label: 'Values', type: 'array', default: '1 2 3 4 5 6 7 8 9 10', maxLen: 12 }],
  random: () => ({ arr: list(rarr(rint(4, 10), 1, 9)) }),
  code: {
    pseudo: `
function reorder(head)
  slow ← middle via fast/slow                      // @middle
  second ← reverse(slow.next); slow.next ← null    // @reverse
  first ← head                                     // @zipinit
  while second ≠ null                              // @ziploop
    t1 ← first.next; t2 ← second.next              // @save
    first.next ← second                            // @zip1
    second.next ← t1                               // @zip2
    first ← t1; second ← t2                        // @advance`,
    cpp: `
void reorder(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast->next && fast->next->next) {       // @middle
        slow = slow->next; fast = fast->next->next;    // @middle
    }
    ListNode* second = reverse(slow->next);        // @reverse
    slow->next = nullptr;                          // @reverse
    ListNode* first = head;                        // @zipinit
    while (second) {                               // @ziploop
        ListNode *t1 = first->next, *t2 = second->next;   // @save
        first->next = second;                      // @zip1
        second->next = t1;                         // @zip2
        first = t1; second = t2;                   // @advance
    }
}`,
    python: `
def reorder(head):
    slow = fast = head
    while fast.next and fast.next.next:            # @middle
        slow = slow.next; fast = fast.next.next    # @middle
    second = reverse(slow.next)                    # @reverse
    slow.next = None                               # @reverse
    first = head                                   # @zipinit
    while second:                                  # @ziploop
        t1, t2 = first.next, second.next           # @save
        first.next = second                        # @zip1
        second.next = t1                           # @zip2
        first, second = t1, t2                     # @advance`,
    java: `
void reorder(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast.next != null && fast.next.next != null) {    // @middle
        slow = slow.next; fast = fast.next.next;             // @middle
    }
    ListNode second = reverse(slow.next);          // @reverse
    slow.next = null;                              // @reverse
    ListNode first = head;                         // @zipinit
    while (second != null) {                       // @ziploop
        ListNode t1 = first.next, t2 = second.next;    // @save
        first.next = second;                       // @zip1
        second.next = t1;                          // @zip2
        first = t1; second = t2;                   // @advance
    }
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      if (a.length < 3) throw new Error('Give at least three values.')
      const L = t.list('L', a, { label: 'list', showHead: false })
      let slow = L.head!
      let fast = L.head!
      while (L.next(fast) && L.next(L.next(fast))) {
        slow = L.next(slow)!
        fast = L.next(L.next(fast))!
      }
      L.clear().role(slow, 'active')
      t.step('middle', `Phase 1 — middle: fast/slow stops slow at ${L.v(slow)}. The second half (${L.v(L.next(slow))} …) will be visited in reverse order.`, { phase: 1, n: a.length })
      const secondStart = L.next(slow)!
      L.link(slow, null).linkRole(slow, 'swap')
      let prev: string | null = null
      let cur: string | null = secondStart
      let flips = 0
      while (cur) {
        const nxt = L.next(cur)
        L.clear().role(cur, 'active')
        L.link(cur, prev).linkRole(cur, 'swap')
        flips++
        t.step('reverse', `Phase 2 — reverse the second half and cut it off: flip ${L.v(cur)} (${flips} flips). After this, walking "second" visits the old tail first — exactly the Ln, Ln−1, … order we need.`, { phase: 2, n: a.length })
        prev = cur
        cur = nxt
      }
      let first: string | null = L.head
      let second: string | null = prev
      L.ptr('first', first).ptr('second', second)
      t.step('zipinit', `Phase 3 — zip: first walks the front half forwards, second walks the reversed back half. We alternate one node from each until second (the shorter-or-equal half) runs out.`, { phase: 3, n: a.length })
      let round = 0
      while (second) {
        round++
        L.clear().role(first!, 'compare').role(second, 'compare')
        t.step('ziploop', `Round ${round}: interleave ${L.v(first)} ← ${L.v(second)}.`, { phase: 3, n: a.length, round })
        const t1 = L.next(first)
        const t2 = L.next(second)
        L.ptr('t1', t1).ptr('t2', t2)
        t.step('save', `Save both successors first: t1 = ${t1 ? L.v(t1) : 'null'}, t2 = ${t2 ? L.v(t2) : 'null'} — the two writes below destroy both routes.`, { phase: 3, n: a.length, round })
        L.link(first!, second).linkRole(first!, 'swap')
        t.step('zip1', `first.next ← second: ${L.v(first)} → ${L.v(second)}.`, { phase: 3, n: a.length, round })
        L.link(second!, t1).linkRole(second!, 'swap')
        t.step('zip2', `second.next ← t1: ${L.v(second)} → ${t1 ? L.v(t1) : 'null'}. The pair is spliced.`, { phase: 3, n: a.length, round })
        first = t1
        second = t2
        L.ptr('first', first).ptr('second', second).ptr('t1', undefined).ptr('t2', undefined)
        t.step('advance', `Advance: first = ${first ? L.v(first) : 'null'}, second = ${second ? L.v(second) : 'null'}.`, { phase: 3, n: a.length, round })
      }
      L.clear().relayout()
      L.ids().forEach((id) => L.role(id, 'done'))
      t.step('ziploop', `Reordered: [${L.values().join(' ')}] = L0, Ln, L1, Ln−1, … Three techniques on one page: fast/slow middle, in-place reversal, two-pointer zip. O(n) time, O(1) space, no array.`, { phase: 3, n: a.length, round })
    }),
}

/* ───────────────────────── 28. Add two numbers as reversed-digit lists ───────────────────────── */

export const llAddNumbers: Algorithm = {
  id: 'll-add-numbers',
  title: 'Add two numbers stored as reversed-digit lists',
  blurb: 'Digits in reverse order means the head is the ones place — addition can stream from the head with a carry, exactly like school arithmetic. A trailing carry grows the answer by one node.',
  legend: { compare: 'digits being added', new: 'result digit', found: 'carry propagating', done: 'sum' },
  inputs: [
    { name: 'a', label: 'Number A (reversed digits)', type: 'array', default: '2 4 3 9 7 1 8 5', maxLen: 10 },
    { name: 'b', label: 'Number B (reversed digits)', type: 'array', default: '5 6 4', maxLen: 10 },
  ],
  random: () => ({ a: list(rarr(rint(2, 8), 0, 9)), b: list(rarr(rint(2, 8), 0, 9)) }),
  code: {
    pseudo: `
function addLists(a, b)
  dummy ← Node(0); tail ← dummy; carry ← 0            // @init
  while a ≠ null or b ≠ null or carry ≠ 0             // @loop
    s ← carry + (a ? a.value : 0) + (b ? b.value : 0) // @sum
    carry ← s div 10; append Node(s mod 10)           // @digit
    a ← a?.next; b ← b?.next                          // @advance
  return dummy.next                                   // @done`,
    cpp: `
ListNode* addLists(ListNode* a, ListNode* b) {
    ListNode dummy(0); ListNode* tail = &dummy;      // @init
    int carry = 0;                                   // @init
    while (a || b || carry) {                        // @loop
        int s = carry + (a ? a->val : 0)             // @sum
                      + (b ? b->val : 0);            // @sum
        carry = s / 10;                              // @digit
        tail->next = new ListNode(s % 10);           // @digit
        tail = tail->next;                           // @digit
        if (a) a = a->next;                          // @advance
        if (b) b = b->next;                          // @advance
    }
    return dummy.next;                               // @done
}`,
    python: `
def add_lists(a, b):
    dummy = Node(0); tail = dummy; carry = 0     # @init
    while a or b or carry:                       # @loop
        s = carry + (a.val if a else 0) + (b.val if b else 0)   # @sum
        carry, digit = divmod(s, 10)             # @digit
        tail.next = Node(digit); tail = tail.next    # @digit
        a = a.next if a else None                # @advance
        b = b.next if b else None                # @advance
    return dummy.next                            # @done`,
    java: `
ListNode addLists(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0), tail = dummy;  // @init
    int carry = 0;                                   // @init
    while (a != null || b != null || carry != 0) {   // @loop
        int s = carry + (a != null ? a.val : 0)      // @sum
                      + (b != null ? b.val : 0);     // @sum
        carry = s / 10;                              // @digit
        tail.next = new ListNode(s % 10);            // @digit
        tail = tail.next;                            // @digit
        if (a != null) a = a.next;                   // @advance
        if (b != null) b = b.next;                   // @advance
    }
    return dummy.next;                               // @done
}`,
  },
  run: ({ a, b }) =>
    trace((t) => {
      const av = vals(a, 'Number A', 0, 9)
      const bv = vals(b, 'Number B', 0, 9)
      const A = t.list('A', av, { label: 'A (ones digit first)', showHead: false })
      const B = t.list('B', bv, { label: 'B (ones digit first)', showHead: false })
      const R = t.list('R', [], { label: 'sum', showHead: false })
      const dummy = R.add(0)
      R.setHead(dummy).role(dummy, 'dim').ptr('tail', dummy)
      let pa = A.head
      let pb = B.head
      let carry = 0
      let tail = dummy
      const digits: string[] = []
      A.ptr('a', pa)
      B.ptr('b', pb)
      t.step('init', `A reads ${av.join('')} backwards = ${[...av].reverse().join('')}, B = ${[...bv].reverse().join('')}. Reversed storage is the gift: the ones digit is the head, so we add left to right exactly like school arithmetic, carrying as we go.`, { carry: 0 })
      let pos = 0
      while (pa || pb || carry) {
        const da = pa ? (A.v(pa) as number) : 0
        const db = pb ? (B.v(pb) as number) : 0
        if (pa) A.clear().role(pa, 'compare')
        if (pb) B.clear().role(pb, 'compare')
        const s = carry + da + db
        t.step('sum', `Position ${pos} (${['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands', 'hundred-thousands', 'millions', 'ten-millions', 'hundred-millions', 'billions', 'ten-billions'][pos] ?? `10^${pos}`}): ${carry} + ${da} + ${db} = ${s}.`, { carry, pos })
        carry = Math.floor(s / 10)
        const d = s % 10
        const node = R.add(d)
        digits.push(node)
        R.link(tail, node).clear().role(node, 'new').linkRole(tail, 'swap')
        tail = node
        R.ptr('tail', tail)
        if (carry) R.role(node, 'found')
        t.step('digit', `Write digit ${d}, carry ${carry} forward${carry ? ' — watch it propagate' : ''}.`, { carry, pos })
        if (pa) {
          pa = A.next(pa)
          A.ptr('a', pa)
        }
        if (pb) {
          pb = B.next(pb)
          B.ptr('b', pb)
        }
        pos++
        t.step('advance', `Advance both inputs. The loop condition "a or b or carry" is the whole trick: it absorbs unequal lengths AND a final carry with no special cases.`, { carry, pos })
      }
      R.remove(dummy)
      R.setHead(digits[0] ?? null).ptr('tail', undefined).clear()
      digits.forEach((id) => R.role(id, 'done'))
      t.step('done', `Sum (reversed digits): [${R.values().join(' ')}] = ${[...R.values()].reverse().join('')}. One pass over max(lenA, lenB) + 1 nodes. If the digits were stored FORWARD, you would need recursion or reversal first — the classic follow-up question.`, { carry: 0, pos })
    }),
}

/* ───────────────────────── 29. Flatten a multilevel doubly linked list ───────────────────────── */

export const llFlatten: Algorithm = {
  id: 'll-flatten',
  title: 'Flatten a multilevel list — the stack of "return points"',
  blurb: 'Nodes may have a child list; a child goes between the node and its next. DFS with an explicit stack of pending next-pointers flattens it in one pass — the stack is the recursion, made visible.',
  legend: { active: 'node being visited', new: 'child being spliced in', compare: 'pending next', swap: 'splice write', done: 'flattened' },
  inputs: [{ name: 'seed', label: 'Layout seed (1–5)', type: 'number', default: '1', min: 1, max: 5 }],
  random: () => ({ seed: String(rint(1, 5)) }),
  code: {
    pseudo: `
function flatten(head)
  cur ← head; stack ← []                               // @init
  while cur ≠ null                                     // @loop
    if cur.child ≠ null                                // @haschild
      if cur.next ≠ null: push cur.next                // @push
      cur.next ← cur.child; child.prev ← cur           // @splice
      cur.child ← null                                 // @clear
    if cur.next = null and stack not empty             // @exhaust
      tail ← stack.pop(); cur.next ← tail; tail.prev ← cur   // @resume
    cur ← cur.next                                     // @advance
  return head                                          // @done`,
    cpp: `
Node* flatten(Node* head) {
    Node* cur = head; stack<Node*> st;                 // @init
    while (cur) {                                      // @loop
        if (cur->child) {                              // @haschild
            if (cur->next) st.push(cur->next);         // @push
            cur->next = cur->child;                    // @splice
            cur->child->prev = cur;                    // @splice
            cur->child = nullptr;                      // @clear
        }
        if (!cur->next && !st.empty()) {               // @exhaust
            Node* tail = st.top(); st.pop();           // @resume
            cur->next = tail; tail->prev = cur;        // @resume
        }
        cur = cur->next;                               // @advance
    }
    return head;                                       // @done
}`,
    python: `
def flatten(head):
    cur, stack = head, []                        # @init
    while cur:                                   # @loop
        if cur.child:                            # @haschild
            if cur.next: stack.append(cur.next)  # @push
            cur.next = cur.child                 # @splice
            cur.child.prev = cur                 # @splice
            cur.child = None                     # @clear
        if not cur.next and stack:               # @exhaust
            tail = stack.pop()                   # @resume
            cur.next = tail; tail.prev = cur     # @resume
        cur = cur.next                           # @advance
    return head                                  # @done`,
    java: `
Node flatten(Node head) {
    Node cur = head; Deque<Node> st = new ArrayDeque<>();    // @init
    while (cur != null) {                            // @loop
        if (cur.child != null) {                     // @haschild
            if (cur.next != null) st.push(cur.next);     // @push
            cur.next = cur.child;                    // @splice
            cur.child.prev = cur;                    // @splice
            cur.child = null;                        // @clear
        }
        if (cur.next == null && !st.isEmpty()) {     // @exhaust
            Node tail = st.pop();                    // @resume
            cur.next = tail; tail.prev = cur;        // @resume
        }
        cur = cur.next;                              // @advance
    }
    return head;                                     // @done
}`,
  },
  run: ({ seed }) =>
    trace((t) => {
      const s = nat(seed, 'seed', 1, 5)
      // Fixed readable layouts: main row values with children spliced under some nodes.
      const layouts: { main: number[]; children: Record<number, number[]> }[] = [
        { main: [1, 2, 3, 4, 5, 6], children: { 2: [7, 8], 8: [11, 12], 3: [9, 10] } },
        { main: [1, 2, 3], children: { 1: [4, 5], 2: [6] } },
        { main: [5, 6, 7], children: { 6: [8, 9], 9: [10] } },
        { main: [1, 2], children: { 1: [3], 3: [4], 4: [5] } },
        { main: [4, 5, 6, 7], children: { 5: [8, 9, 10] } },
      ]
      const lay = layouts[s - 1]
      const L = t.list('L', [], { label: 'flattened list (grows as we go)', doubly: true, showHead: false })
      // Build the multilevel structure as separate lists in one drawing: main list + child lists shown detached.
      const mainIds = lay.main.map((v) => L.add(v))
      mainIds.forEach((id, i) => {
        L.link(id, mainIds[i + 1] ?? null)
        if (i > 0) L.linkPrev(id, mainIds[i - 1])
      })
      L.setHead(mainIds[0])
      const childIds = new Map<number, string[]>()
      for (const [parentVal, arr] of Object.entries(lay.children)) {
        const ids = arr.map((v) => L.add(v))
        ids.forEach((id, i) => {
          L.link(id, ids[i + 1] ?? null)
          if (i > 0) L.linkPrev(id, ids[i - 1])
        })
        childIds.set(Number(parentVal), ids)
      }
      // child links recorded separately: parent -> child head, stored in a side map since TList has one next per node
      const childOf = new Map<string, string>()
      for (const id of mainIds) {
        const ids = childIds.get(L.v(id) as number)
        if (ids) childOf.set(id, ids[0])
      }
      // nested children (e.g. 8 -> [11,12]): attach under the child node itself
      for (const n of L.nodes.values()) {
        const ids = childIds.get(n.v as number)
        if (ids && !childOf.has(n.id)) childOf.set(n.id, ids[0])
      }
      L.ids().forEach((id) => {
        if (childOf.has(id)) L.role(id, 'compare')
      })
      t.step('init', `Layout ${s}: main row ${lay.main.join(' → ')}${Object.keys(lay.children).length ? `, with child lists under ${Object.keys(lay.children).join(', ')}` : ''}. Rule: a child list goes AFTER its parent and BEFORE the parent's next. cur starts at the head; the stack holds "next pointers we must come back to".`, { depth: 0 })
      const pendingStack: string[] = []
      const S = t.stack('st', 'pending nexts')
      let cur: string | null = mainIds[0]
      const flat: string[] = []
      let guard = 0
      while (cur && guard++ < 60) {
        L.clear()
        flat.forEach((id) => L.role(id, 'done'))
        L.role(cur, 'active')
        t.step('loop', `cur = ${L.v(cur)}.${childOf.has(cur) ? ' It HAS a child — splice the child list in right here.' : ' No child; move on.'}`, { depth: pendingStack.length })
        if (childOf.has(cur)) {
          const childHead = childOf.get(cur)!
          const origNext = L.next(cur)
          t.step('haschild', `Child list starts at ${L.v(childHead)}.`, { depth: pendingStack.length })
          if (origNext) {
            pendingStack.push(origNext)
            S.push(L.v(origNext) as number)
            t.step('push', `Before overwriting cur.next, save ${L.v(origNext)} on the stack — it must follow the ENTIRE child list, not just its head.`, { depth: pendingStack.length })
          }
          L.link(cur, childHead).linkPrev(childHead, cur).linkRole(cur, 'swap')
          t.step('splice', `cur.next ← child head, child.prev ← cur. The child chain is now inline.`, { depth: pendingStack.length })
          childOf.delete(cur)
          t.step('clear', `cur.child ← null: flattened nodes must not keep child pointers (the judge checks this).`, { depth: pendingStack.length })
        }
        if (!L.next(cur) && pendingStack.length) {
          const resume = pendingStack.pop()!
          S.pop()
          L.link(cur, resume).linkPrev(resume, cur)
          L.role(resume, 'new')
          t.step('exhaust', `cur.next is null and the stack is not empty…`, { depth: pendingStack.length })
          t.step('resume', `…pop ${L.v(resume)} and continue from there: cur.next ← ${L.v(resume)}, its prev ← cur. This is the "return from recursion", done with a stack.`, { depth: pendingStack.length })
        }
        flat.push(cur)
        cur = L.next(cur)
        t.step('advance', `cur advances to ${cur ? L.v(cur) : 'null (end)'}.`, { depth: pendingStack.length })
      }
      L.setHead(mainIds[0]).clear().relayout()
      L.ids().forEach((id) => L.role(id, 'done'))
      t.step('done', `Flattened: [${L.values().join(' ')}]. Every node visited once, each splice O(1): O(n) time, O(depth) stack. The recursion version is the same walk with the call stack instead of the explicit one.`, { depth: 0 })
    }),
}

/* ───────────────────────── 30. Insertion sort on a linked list ───────────────────────── */

export const llInsertionSort: Algorithm = {
  id: 'll-insertion-sort',
  title: 'Insertion sort on a list — detach, then sorted-insert',
  blurb: 'Pull each node off the input and insert it into the sorted result at its place. O(n²) but O(1) space, and on a list the inserts are pointer writes, not element shifts — the version arrays cannot match.',
  legend: { active: 'node being inserted', compare: 'scanning for the spot', new: 'just inserted', done: 'sorted prefix', window: 'unsorted input' },
  inputs: [{ name: 'arr', label: 'Values', type: 'array', default: '4 2 7 1 3 6 5', maxLen: 10 }],
  random: () => ({ arr: list(rarr(rint(4, 8), 1, 20)) }),
  code: {
    pseudo: `
function insertionSort(head)
  dummy ← Node(0)                                  // @init
  while head ≠ null                                // @take
    cur ← head; head ← head.next                   // @detach
    p ← dummy                                      // @scan
    while p.next ≠ null and p.next.value < cur.value   // @scan
      p ← p.next                                   // @scan
    cur.next ← p.next; p.next ← cur                // @insert
  return dummy.next                                // @done`,
    cpp: `
ListNode* insertionSort(ListNode* head) {
    ListNode dummy(0);                             // @init
    while (head) {                                 // @take
        ListNode* cur = head;                      // @detach
        head = head->next;                         // @detach
        ListNode* p = &dummy;                      // @scan
        while (p->next && p->next->val < cur->val)     // @scan
            p = p->next;                           // @scan
        cur->next = p->next;                       // @insert
        p->next = cur;                             // @insert
    }
    return dummy.next;                             // @done
}`,
    python: `
def insertion_sort(head):
    dummy = Node(0)                        # @init
    while head:                            # @take
        cur = head                         # @detach
        head = head.next                   # @detach
        p = dummy                          # @scan
        while p.next and p.next.val < cur.val:     # @scan
            p = p.next                     # @scan
        cur.next = p.next                  # @insert
        p.next = cur                       # @insert
    return dummy.next                      # @done`,
    java: `
ListNode insertionSort(ListNode head) {
    ListNode dummy = new ListNode(0);              // @init
    while (head != null) {                         // @take
        ListNode cur = head;                       // @detach
        head = head.next;                          // @detach
        ListNode p = dummy;                        // @scan
        while (p.next != null && p.next.val < cur.val)   // @scan
            p = p.next;                            // @scan
        cur.next = p.next;                         // @insert
        p.next = cur;                              // @insert
    }
    return dummy.next;                             // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const I = t.list('I', a, { label: 'input', showHead: false })
      const R = t.list('R', [], { label: 'sorted result', showHead: false })
      const dummy = R.add(0)
      R.setHead(dummy).role(dummy, 'dim')
      I.ids().forEach((id) => I.role(id, 'window'))
      t.step('init', `An empty dummy-headed result. Each round: detach the input's head, scan the result for its slot, splice it in. The result is ALWAYS sorted — that is the invariant.`, { sorted: 0, cmps: 0 })
      let cur = I.head
      let cmps = 0
      let sortedN = 0
      while (cur) {
        const v = I.v(cur)
        const nxt = I.next(cur)
        I.clear().role(cur, 'active')
        t.step('take', `Take the input's head: ${v}.`, { sorted: sortedN, cmps })
        I.remove(cur)
        if (nxt) {
          I.ids().forEach((id) => I.role(id, 'window'))
        }
        t.step('detach', `Detach it (head ← head.next happens implicitly by removal here). The copy will be re-created in the result — same node conceptually.`, { sorted: sortedN, cmps })
        const copy = R.add(v as number)
        // scan
        const chain = R.ids(dummy).filter((id) => id !== dummy)
        let insertAt = chain.length
        for (let i = 0; i < chain.length; i++) {
          cmps++
          R.clear().role(copy, 'active').role(chain[i], 'compare')
          chain.slice(0, i).forEach((id) => R.role(id, 'done'))
          t.step('scan', `${v} vs ${R.v(chain[i])}: ${(v as number) < (R.v(chain[i]) as number) ? `${v} is smaller — insert BEFORE it.` : 'keep scanning right.'}`, { sorted: sortedN, cmps })
          if ((v as number) < (R.v(chain[i]) as number)) {
            insertAt = i
            break
          }
        }
        // splice into the result chain at insertAt
        const before = insertAt === 0 ? dummy : chain[insertAt - 1]
        const after = insertAt < chain.length ? chain[insertAt] : null
        R.link(copy, after)
        R.link(before, copy)
        R.clear().role(copy, 'new')
        R.linkRole(before, 'swap')
        t.step('insert', `Splice: ${insertAt === 0 ? `it is the new first real node` : `${R.v(before)}.next ← ${v}`} — ${sortedN} comparisons this round.`, { sorted: sortedN, cmps })
        sortedN++
        R.relayout()
        R.clear()
        R.ids(dummy).filter((id) => id !== dummy).forEach((id) => R.role(id, 'done'))
        cur = nxt
      }
      R.remove(dummy)
      const h = R.order.find((id) => {
        const tgts = new Set<string>()
        for (const n of R.nodes.values()) if (n.next) tgts.add(n.next)
        return !tgts.has(id)
      })
      R.setHead(h ?? null).relayout().clear()
      R.ids().forEach((id) => R.role(id, 'done'))
      t.step('done', `Sorted: [${R.values().join(' ')}] in ${cmps} comparisons ≈ n²/4 average. On an ARRAY, each insert also shifts elements (another n²/4 writes); on a list it is two pointer writes — this is the one sorting job where lists genuinely beat arrays.`, { sorted: sortedN, cmps })
    }),
}

/* ───────────────────────── 31. Array vs list: insert cost measured ───────────────────────── */

export const llInsertCost: Algorithm = {
  id: 'll-insert-cost',
  title: 'Insert in the middle: array shifts vs list relinks — counted',
  blurb: 'Inserting at position p in an array of n shifts n−p elements one slot at a time. In a list, after an O(p) walk, it is exactly TWO pointer writes. The meter counts every unit of work in both.',
  legend: { swap: 'element being shifted', new: 'inserted', active: 'walk position', done: 'finished', window: 'shifted region' },
  inputs: [
    { name: 'arr', label: 'Values', type: 'array', default: '1 2 3 4 5 6 7 8 9', maxLen: 10 },
    { name: 'p', label: 'Insert at index p', type: 'number', default: '4', min: 0, max: 9 },
    { name: 'x', label: 'Value x', type: 'number', default: '9', min: -99, max: 999 },
  ],
  random: () => ({ arr: list(rarr(rint(6, 9), 1, 9)), p: String(rint(1, 5)), x: String(rint(1, 9)) }),
  code: {
    pseudo: `
# Array insert at p: shift the tail right, then write
function arrayInsert(a, n, p, x)
  for i ← n − 1 down to p: a[i+1] ← a[i]        // @shift
  a[p] ← x                                       // @awrite
# List insert at p: walk, then two writes
function listInsert(head, p, x)
  walk p − 1 nodes → prev                        // @walk
  n ← Node(x); n.next ← prev.next                // @lwrite1
  prev.next ← n                                  // @lwrite2`,
    cpp: `
void arrayInsert(vector<int>& a, int p, int x) {
    a.push_back(0);                              // make room
    for (int i = (int)a.size() - 2; i >= p; i--) // @shift
        a[i + 1] = a[i];                         // @shift
    a[p] = x;                                    // @awrite
}
void listInsert(ListNode*& head, int p, int x) {
    ListNode dummy(0); dummy.next = head;        // @walk
    ListNode* prev = &dummy;                     // @walk
    for (int i = 0; i < p; i++) prev = prev->next;   // @walk
    ListNode* n = new ListNode(x);               // @lwrite1
    n->next = prev->next;                        // @lwrite1
    prev->next = n;                              // @lwrite2
}`,
    python: `
def array_insert(a, p, x):
    a.append(0)                        # make room
    for i in range(len(a) - 2, p - 1, -1):   # @shift
        a[i + 1] = a[i]                # @shift
    a[p] = x                           # @awrite

def list_insert(head, p, x):
    dummy = Node(0); dummy.next = head # @walk
    prev = dummy                       # @walk
    for _ in range(p):                 # @walk
        prev = prev.next               # @walk
    n = Node(x); n.next = prev.next    # @lwrite1
    prev.next = n                      # @lwrite2`,
    java: `
void arrayInsert(int[] a, int n, int p, int x) {
    for (int i = n - 1; i >= p; i--)   // @shift
        a[i + 1] = a[i];               // @shift
    a[p] = x;                          // @awrite
}
void listInsert(ListNode head, int p, int x) {
    ListNode dummy = new ListNode(0); dummy.next = head;  // @walk
    ListNode prev = dummy;                                // @walk
    for (int i = 0; i < p; i++) prev = prev.next;         // @walk
    ListNode n = new ListNode(x);                         // @lwrite1
    n.next = prev.next;                                   // @lwrite1
    prev.next = n;                                        // @lwrite2
}`,
  },
  run: ({ arr, p, x }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const p0 = nat(p, 'p', 0, a.length)
      const xv = nat(x, 'x', -99, 999)
      const A = t.array('a', [...a, null], { label: 'array (one spare slot at the end)', capacity: a.length + 1 })
      const M = t.meter('m', 'work units', [{ label: 'n', value: a.length }, { label: '2n', value: 2 * a.length }])
      let arrWork = 0
      t.step('shift', `Array insert at index ${p0}: everything from ${p0} to ${a.length - 1} must move one slot right — ${a.length - p0} shifts, back to front so nothing is overwritten.`, { arrWork: 0, listWork: 0 })
      for (let i = a.length - 1; i >= p0; i--) {
        A.move(i + 1, i)
        A.clear().role(i + 1, 'swap')
        A.range([{ from: p0, to: a.length, role: 'window' }])
        arrWork++
        M.add()
        t.step('shift', `Shift ${a.length - i} of ${a.length - p0}: a[${i + 1}] ← a[${i}] (value ${a[i]}). Each shift is one memory write — contiguous, cache-friendly, but there are n − p of them.`, { arrWork, listWork: 0 })
      }
      A.set(p0, xv)
      A.clear().role(p0, 'new')
      arrWork++
      M.add()
      t.step('awrite', `Write x into the hole: a[${p0}] = ${xv}. Array total: ${arrWork} writes.`, { arrWork, listWork: 0 })
      const L = t.list('L', a, { label: 'linked list', showHead: false })
      const dummy = L.add(0, 0)
      L.link(dummy, L.order.find((id) => id !== dummy) ?? null).setHead(dummy).role(dummy, 'dim')
      let prev = dummy
      let listWork = 0
      L.ptr('prev', prev)
      t.step('walk', `List insert at index ${p0}: walk the dummy-anchored prev to position ${p0}. Walking costs ${p0} pointer reads (cache-UNfriendly, but reads, not writes).`, { arrWork, listWork })
      for (let i = 0; i < p0; i++) {
        prev = L.next(prev)!
        listWork++
        L.ptr('prev', prev).clear().role(dummy, 'dim').role(prev, 'active')
        t.step('walk', `Hop ${i + 1} of ${p0}: prev = ${L.v(prev)}.`, { arrWork, listWork })
      }
      const n = L.add(xv)
      L.link(n, L.next(prev))
      listWork++
      L.clear().role(n, 'new').linkRole(prev, 'swap')
      t.step('lwrite1', `Write 1: new node ${xv}.next ← ${L.next(n) ? L.v(L.next(n)) : 'null'}.`, { arrWork, listWork })
      L.link(prev, n)
      listWork++
      M.add(2)
      t.step('lwrite2', `Write 2: prev.next ← new node. List total: ${listWork} work units — the walk is unavoidable at position p, but the INSERT itself is exactly 2 writes, independent of n.`, { arrWork, listWork })
      L.remove(dummy)
      const h = L.order.find((id) => {
        const tgts = new Set<string>()
        for (const nd of L.nodes.values()) if (nd.next) tgts.add(nd.next)
        return !tgts.has(id)
      })
      L.setHead(h ?? null).relayout().clear()
      L.ids().forEach((id) => L.role(id, 'done'))
      t.step('lwrite2', `Both structures now hold [${L.values().join(' ')}]. The array paid n − p + 1 WRITES; the list paid p reads + 2 writes. At the front (p = 0) the list wins massively; at the back, appending is amortized O(1) for the array and O(n) for a singly list — the trade-off is positional.`, { arrWork, listWork })
    }),
}

export const algorithms4 = [llCopyRandom, llRotate, llReorder, llAddNumbers, llFlatten, llInsertionSort, llInsertCost]
